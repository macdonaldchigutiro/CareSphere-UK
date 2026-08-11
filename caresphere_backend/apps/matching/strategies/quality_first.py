from .base_strategy import BaseMatchingStrategy

class QualityFirstStrategy(BaseMatchingStrategy):
    def match(self, profile, providers):
        results = []
        for provider in providers:
            score = 70.0
            
            if provider.is_verified:
                score += 20
            
            capacity_ratio = provider.current_clients / provider.max_capacity if provider.max_capacity > 0 else 0
            if capacity_ratio < 0.5:
                score += 10
            elif capacity_ratio < 0.8:
                score += 5
            
            results.append({
                'provider_id': str(provider.id),
                'provider_name': provider.company_name,
                'confidence_score': min(score, 100),
                'match_reasons': [
                    'High quality provider',
                    'Verified business' if provider.is_verified else 'Established provider'
                ],
                'breakdown': {
                    'quality': min(score, 100),
                    'availability': 100 - (capacity_ratio * 100),
                    'verification': 100 if provider.is_verified else 50
                },
                'distance_km': None,
                'estimated_cost': float(provider.hourly_rate) if provider.hourly_rate else None
            })
        
        return sorted(results, key=lambda x: x['confidence_score'], reverse=True)

