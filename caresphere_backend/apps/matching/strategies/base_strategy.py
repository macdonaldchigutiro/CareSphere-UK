from abc import ABC, abstractmethod

class BaseMatchingStrategy(ABC):
    @abstractmethod
    def match(self, profile, providers):
        pass
    
    def _calculate_distance_score(self, lat1, lon1, lat2, lon2, max_distance=50):
        if not all([lat1, lon1, lat2, lon2]):
            return 0.5
        return 0.8
    
    def _calculate_price_score(self, provider_price, user_budget):
        if not provider_price or not user_budget:
            return 0.5
        return 0.7 if provider_price <= user_budget else 0.3

