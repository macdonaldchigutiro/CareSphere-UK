"""
Tests for the Intelligent Matching Engine
"""
import pytest
from django.test import TestCase
from unittest.mock import Mock, patch
from decimal import Decimal

from users.models import User
from service_users.models import ServiceUserProfile
from care_providers.models import CareProvider
from matching.engine import MatchingEngine
from matching.strategies.quality_first import QualityFirstStrategy


class TestMatchingEngine(TestCase):
    """Test cases for matching engine"""
    
    def setUp(self):
        """Set up test data"""
        # Create test users
        self.service_user = User.objects.create(
            email='test@example.com',
            first_name='John',
            last_name='Doe',
            user_type='service_user'
        )
        
        # Create service user profile
        self.service_profile = ServiceUserProfile.objects.create(
            user=self.service_user,
            preferred_care_type='domiciliary',
            medical_needs=['dementia', 'mobility'],
            mobility_level='wheelchair',
            latitude=Decimal('51.5074'),
            longitude=Decimal('-0.1278'),
            weekly_budget=Decimal('500.00')
        )
        
        # Create test providers
        self.provider1 = CareProvider.objects.create(
            user=User.objects.create(
                email='provider1@example.com',
                first_name='Provider',
                last_name='One',
                user_type='care_provider'
            ),
            company_name='Excellent Care Ltd',
            business_type='agency',
            address_line1='123 Care St',
            city='London',
            postcode='SW1A 1AA',
            latitude=Decimal('51.5074'),
            longitude=Decimal('-0.1278'),
            care_types=['domiciliary', 'live_in'],
            specializations=['dementia', 'mobility'],
            hourly_rate_min=Decimal('25.00'),
            hourly_rate_max=Decimal('35.00'),
            is_accepting_clients=True,
            max_capacity=50,
            current_clients=25
        )
        
        self.provider2 = CareProvider.objects.create(
            user=User.objects.create(
                email='provider2@example.com',
                first_name='Provider',
                last_name='Two',
                user_type='care_provider'
            ),
            company_name='Good Care Home',
            business_type='residential_home',
            address_line1='456 Care Ave',
            city='London',
            postcode='EC1A 1BB',
            latitude=Decimal('51.5155'),
            longitude=Decimal('-0.0922'),
            care_types=['residential'],
            specializations=['alzheimers'],
            hourly_rate_min=Decimal('30.00'),
            hourly_rate_max=Decimal('40.00'),
            is_accepting_clients=True,
            max_capacity=100,
            current_clients=90
        )
    
    def test_quality_first_strategy(self):
        """Test quality-first matching strategy"""
        strategy = QualityFirstStrategy()
        
        # Mock trust verification data
        with patch.object(strategy, '_calculate_cqc_score') as mock_cqc:
            mock_cqc.return_value = 0.9
            
            results = strategy.match(
                self.service_profile,
                [self.provider1, self.provider2]
            )
            
            # Should return results
            assert len(results) == 2
            
            # Results should be sorted by confidence score
            assert results[0]['confidence_score'] >= results[1]['confidence_score']
            
            # Should include provider IDs
            assert 'provider_id' in results[0]
            assert 'match_reasons' in results[0]
            assert 'breakdown' in results[0]
    
    def test_matching_engine_basic(self):
        """Test basic matching engine functionality"""
        engine = MatchingEngine()
        
        # Mock the cache
        with patch('matching.engine.cache.get') as mock_cache_get:
            mock_cache_get.return_value = None
            
            # Mock provider filtering
            with patch.object(engine, '_get_eligible_providers') as mock_get_providers:
                mock_get_providers.return_value = [self.provider1, self.provider2]
                
                results = engine.match_service_user(
                    self.service_user,
                    primary_strategy='quality',
                    max_results=5
                )
                
                # Should return match results
                assert len(results) <= 5
                
                for result in results:
                    assert isinstance(result, MatchResult)
                    assert hasattr(result, 'confidence_score')
                    assert hasattr(result, 'match_reasons')
                    assert hasattr(result, 'provider_name')
    
    def test_distance_calculation(self):
        """Test distance calculation"""
        engine = MatchingEngine()
        
        # Test Haversine formula
        distance = engine._calculate_distance(
            Decimal('51.5074'), Decimal('-0.1278'),  # London
            Decimal('51.5074'), Decimal('-0.1278')   # Same point
        )
        
        assert distance == 0.0  # Same point should be 0 distance
        
        # Test actual distance calculation
        distance = engine._calculate_distance(
            Decimal('51.5074'), Decimal('-0.1278'),  # London
            Decimal('53.4808'), Decimal('-2.2426')   # Manchester
        )
        
        # Distance should be positive
        assert distance > 0
        # Distance between London and Manchester ~ 262km
        assert 250 < distance < 270
    
    def test_emergency_matching(self):
        """Test emergency matching functionality"""
        engine = MatchingEngine()
        
        with patch.object(engine.strategies['emergency'], 'match') as mock_emergency:
            mock_emergency.return_value = [
                {
                    'provider_id': str(self.provider1.id),
                    'confidence_score': 95,
                    'match_reasons': ['Emergency care available', 'Immediate response'],
                    'breakdown': {'emergency': 100, 'availability': 90}
                }
            ]
            
            results = engine.emergency_match(
                latitude=51.5074,
                longitude=-0.1278,
                care_type='domiciliary',
                max_distance_km=10
            )
            
            # Should return emergency matches
            assert len(results) == 1
            assert results[0]['confidence_score'] >= 90
    
    def test_strategy_blending(self):
        """Test blending results from multiple strategies"""
        engine = MatchingEngine()
        
        # Create mock results from two strategies
        results1 = [
            {
                'provider_id': '1',
                'confidence_score': 90,
                'match_reasons': ['Quality match'],
                'breakdown': {'quality': 90}
            },
            {
                'provider_id': '2',
                'confidence_score': 80,
                'match_reasons': ['Quality match'],
                'breakdown': {'quality': 80}
            }
        ]
        
        results2 = [
            {
                'provider_id': '2',
                'confidence_score': 95,
                'match_reasons': ['Budget match'],
                'breakdown': {'budget': 95}
            },
            {
                'provider_id': '1',
                'confidence_score': 85,
                'match_reasons': ['Budget match'],
                'breakdown': {'budget': 85}
            }
        ]
        
        blended = engine._blend_results(results1, results2, weight=0.3)
        
        # Should have both providers
        provider_ids = [r['provider_id'] for r in blended]
        assert '1' in provider_ids
        assert '2' in provider_ids
        
        # Provider 2 should be first after blending (better in budget strategy)
        assert blended[0]['provider_id'] == '2'
        
        # Scores should be blended
        assert 80 < blended[0]['confidence_score'] < 100
    
    def test_cache_usage(self):
        """Test that matching results are cached"""
        engine = MatchingEngine()
        
        # Mock cache get and set
        with patch('matching.engine.cache.get') as mock_cache_get, \
             patch('matching.engine.cache.set') as mock_cache_set:
            
            # First call - cache miss
            mock_cache_get.return_value = None
            
            with patch.object(engine, '_get_eligible_providers') as mock_get_providers:
                mock_get_providers.return_value = [self.provider1]
                
                engine.match_service_user(self.service_user)
                
                # Should set cache
                assert mock_cache_set.called
            
            # Second call - cache hit
            mock_cache_get.return_value = ['cached_result']
            
            results = engine.match_service_user(self.service_user)
            
            # Should return cached results
            assert results == ['cached_result']