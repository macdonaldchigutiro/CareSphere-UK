"""
Intelligent Matching Engine for CareSphere UK
"""

from django.db import models
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import List, Dict, Any, Optional
from decimal import Decimal
import math
from django.core.cache import cache
from django.db import models  # ← ADD THIS IMPORT
from django.db.models import Q

from .strategies import (
    BaseMatchingStrategy,
    QualityFirstStrategy,
    BudgetFirstStrategy,
    DistanceFirstStrategy,
    EmergencyFirstStrategy,
    CultureFirstStrategy,
)
from apps.users.models import User  # ← CHANGE THIS (use custom User)
from apps.service_users.models import ServiceUserProfile
from apps.care_providers.models import CareProvider


@dataclass
class MatchResult:
    """Result of a matching operation"""

    provider_id: str
    provider_name: str
    confidence_score: float  # 0-100
    match_reasons: List[str]
    breakdown: Dict[str, float]
    distance_km: Optional[float]
    estimated_cost: Optional[Decimal]
    availability_status: str


class MatchingEngine:
    """
    Main matching engine that orchestrates different strategies
    """

    def __init__(self):
        self.strategies = {
            "quality": QualityFirstStrategy(),
            "budget": BudgetFirstStrategy(),
            "distance": DistanceFirstStrategy(),
            "emergency": EmergencyFirstStrategy(),
            "culture": CultureFirstStrategy(),
        }

    def match_service_user(
        self,
        service_user: User,
        primary_strategy: str = "quality",
        secondary_strategies: List[str] = None,
        max_results: int = 10,
        max_distance_km: float = 50.0,
    ) -> List[MatchResult]:
        """
        Match a service user with care providers

        Args:
            service_user: The service user to match
            primary_strategy: Primary matching strategy
            secondary_strategies: Additional strategies to consider
            max_results: Maximum number of results
            max_distance_km: Maximum distance in kilometers

        Returns:
            List of match results
        """
        # Get service user profile
        try:
            profile = service_user.service_profile  # ← FIX: check related_name
        except ServiceUserProfile.DoesNotExist:
            return []

        # Generate cache key
        cache_key = f"match_{service_user.id}_{primary_strategy}_{max_distance_km}"

        # Check cache
        cached_results = cache.get(cache_key)
        if cached_results:
            return cached_results

        # Get eligible providers
        providers = self._get_eligible_providers(profile, max_distance_km)

        if not providers:
            return []

        # Apply primary strategy
        primary_strategy_obj = self.strategies.get(
            primary_strategy, self.strategies["quality"]
        )
        results = primary_strategy_obj.match(profile, providers)

        # Apply secondary strategies if specified
        if secondary_strategies:
            for strategy_name in secondary_strategies:
                if (
                    strategy_name in self.strategies
                    and strategy_name != primary_strategy
                ):
                    strategy_obj = self.strategies[strategy_name]
                    strategy_results = strategy_obj.match(profile, providers)

                    # Blend results (weighted average)
                    results = self._blend_results(results, strategy_results, weight=0.3)

        # Limit results
        results = results[:max_results]

        # Calculate additional information
        enriched_results = []
        for result in results:
            provider = next(
                (p for p in providers if str(p.id) == result.provider_id), None
            )
            if provider:
                enriched_result = self._enrich_match_result(result, provider, profile)
                enriched_results.append(enriched_result)

        # Cache results for 1 hour
        cache.set(cache_key, enriched_results, 3600)

        return enriched_results

    def _get_eligible_providers(
        self, profile: ServiceUserProfile, max_distance_km: float
    ) -> List[CareProvider]:
        """
        Get eligible providers based on basic criteria
        """
        # Base query - providers accepting clients
        queryset = CareProvider.objects.filter(
            is_accepting_clients=True,
            current_clients__lt=models.F("max_capacity"),  # ← FIX: now models.F works
        ).prefetch_related("expertise", "trust_verifications")

        # Filter by care type
        if hasattr(profile, "preferred_care_type") and profile.preferred_care_type:
            queryset = queryset.filter(
                care_types__contains=[profile.preferred_care_type]
            )

        # Filter by distance if coordinates available
        if (
            hasattr(profile, "latitude")
            and profile.latitude
            and hasattr(profile, "longitude")
            and profile.longitude
            and max_distance_km > 0
        ):
            # This would use PostGIS in production
            # Simplified version for demo
            pass

        # Filter by specializations
        if hasattr(profile, "medical_needs") and profile.medical_needs:
            for need in profile.medical_needs:
                if need == "dementia":
                    queryset = queryset.filter(expertise__dementia_care=True)
                elif need == "alzheimers":
                    queryset = queryset.filter(expertise__alzheimers_care=True)

        return list(queryset[:100])  # Limit initial query

    def _enrich_match_result(
        self, result: MatchResult, provider: CareProvider, profile: ServiceUserProfile
    ) -> MatchResult:
        """
        Enrich match result with additional information
        """
        # Calculate distance
        distance = None
        if (
            hasattr(profile, "latitude")
            and profile.latitude
            and hasattr(profile, "longitude")
            and profile.longitude
            and provider.latitude
            and provider.longitude
        ):
            distance = self._calculate_distance(
                profile.latitude,
                profile.longitude,
                provider.latitude,
                provider.longitude,
            )

        # Estimate cost
        estimated_cost = None
        preferred_care_type = getattr(profile, "preferred_care_type", None)

        if preferred_care_type == "hourly" and provider.hourly_rate_min:
            # Simple estimation: 20 hours per week * 4 weeks
            estimated_cost = provider.hourly_rate_min * 20 * 4
        elif preferred_care_type == "live_in" and provider.live_in_rate_min:
            estimated_cost = provider.live_in_rate_min

        # Update result with enriched data
        result.distance_km = distance
        result.estimated_cost = estimated_cost
        result.provider_name = provider.company_name
        result.availability_status = provider.availability_status

        return result

    def _calculate_distance(
        self, lat1: Decimal, lon1: Decimal, lat2: Decimal, lon2: Decimal
    ) -> float:
        """
        Calculate distance between two points using Haversine formula
        """
        # Convert to float
        lat1, lon1, lat2, lon2 = map(float, [lat1, lon1, lat2, lon2])

        R = 6371  # Earth's radius in kilometers

        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)

        a = math.sin(dlat / 2) * math.sin(dlat / 2) + math.cos(
            math.radians(lat1)
        ) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) * math.sin(dlon / 2)

        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        distance = R * c

        return round(distance, 2)

    def _blend_results(
        self,
        results1: List[MatchResult],
        results2: List[MatchResult],
        weight: float = 0.3,
    ) -> List[MatchResult]:
        """
        Blend results from two strategies
        """
        blended = {}

        # Create dictionary for first results
        for i, result in enumerate(results1):  # ← FIX: added 'i'
            blended[result.provider_id] = {
                "result": result,
                "score": result.confidence_score,
                "rank": i,
            }

        # Blend with second results
        for i, result in enumerate(results2):  # ← FIX: added 'i'
            if result.provider_id in blended:
                # Weighted average based on rank
                rank1 = blended[result.provider_id]["rank"]
                rank2 = i

                # Calculate blended score (lower rank = better)
                score1 = 100 - (rank1 / len(results1) * 100)
                score2 = 100 - (rank2 / len(results2) * 100)

                blended_score = (score1 * (1 - weight)) + (score2 * weight)

                # Update result
                blended_result = blended[result.provider_id]["result"]
                blended_result.confidence_score = blended_score
                blended_result.match_reasons.extend(result.match_reasons)

                # Update breakdown
                for key, value in result.breakdown.items():
                    if key in blended_result.breakdown:
                        blended_result.breakdown[key] = (
                            blended_result.breakdown[key] * (1 - weight)
                            + value * weight
                        )
                    else:
                        blended_result.breakdown[key] = value

        # Convert back to list and sort
        blended_results = [item["result"] for item in blended.values()]
        blended_results.sort(key=lambda x: x.confidence_score, reverse=True)

        return blended_results

    def emergency_match(
        self,
        latitude: float,
        longitude: float,
        care_type: str,
        max_distance_km: float = 10.0,
    ) -> List[MatchResult]:
        """
        Emergency matching for immediate care needs
        """
        # Get providers with emergency care available
        providers = CareProvider.objects.filter(
            emergency_care_available=True,
            is_accepting_clients=True,
            # availability_slots__is_available=True  # Comment out if relationship doesn't exist
        ).distinct()

        # Filter by distance (simplified)
        # In production, use PostGIS distance query

        # Apply emergency strategy
        strategy = self.strategies["emergency"]

        # Create temporary profile for matching
        class TempProfile:
            def __init__(self, lat, lon, care_type):
                self.latitude = lat
                self.longitude = lon
                self.preferred_care_type = care_type
                self.medical_needs = []

        temp_profile = TempProfile(latitude, longitude, care_type)

        return strategy.match(temp_profile, providers)[:10]  # ← Limit results


# Singleton instance
matching_engine = MatchingEngine()
