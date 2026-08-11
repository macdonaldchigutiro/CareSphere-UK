# apps/matching/strategies.py
from abc import ABC, abstractmethod
from typing import List, Dict, Any
from django.db import models
from apps.care_providers.models import CareProvider


class BaseMatchingStrategy(ABC):
    """Base class for all matching strategies"""

    @abstractmethod
    def match(self, profile, providers: List[CareProvider]) -> List[Dict[str, Any]]:
        """Match providers based on strategy"""
        pass


class QualityFirstStrategy(BaseMatchingStrategy):
    """Prioritize providers with highest quality ratings"""

    def match(self, profile, providers: List[CareProvider]) -> List[Dict[str, Any]]:
        results = []
        for provider in providers:
            score = 0
            reasons = []
            # Check CQC rating
            if (
                hasattr(provider, "trust_verifications")
                and provider.trust_verifications.exists()
            ):
                trust = provider.trust_verifications.first()
                if trust.cqc_rating == "Outstanding":
                    score += 30
                    reasons.append("Outstanding CQC rating")
                elif trust.cqc_rating == "Good":
                    score += 20
                    reasons.append("Good CQC rating")

            # Check verification status
            if provider.is_verified:
                score += 25
                reasons.append("Fully verified provider")

            # Check reviews
            if hasattr(provider, "reviews") and provider.reviews.exists():
                avg_rating = provider.reviews.aggregate(models.Avg("overall_rating"))[
                    "overall_rating__avg"
                ]
                if avg_rating and avg_rating >= 4.5:
                    score += 20
                    reasons.append(f"Excellent reviews ({avg_rating:.1f}/5)")
                elif avg_rating and avg_rating >= 4.0:
                    score += 10
                    reasons.append(f"Good reviews ({avg_rating:.1f}/5)")

            # Experience
            if provider.years_operating > 10:
                score += 15
                reasons.append(f"{provider.years_operating}+ years experience")
            elif provider.years_operating > 5:
                score += 10
                reasons.append(f"{provider.years_operating}+ years experience")

            results.append(
                {
                    "provider_id": str(provider.id),
                    "provider_name": provider.company_name,
                    "confidence_score": min(score, 100),
                    "match_reasons": reasons,
                    "breakdown": {"quality": score},
                }
            )

        # Sort by score
        results.sort(key=lambda x: x["confidence_score"], reverse=True)
        return results


class BudgetFirstStrategy(BaseMatchingStrategy):
    """Prioritize providers with lowest cost"""

    def match(self, profile, providers: List[CareProvider]) -> List[Dict[str, Any]]:
        results = []
        for provider in providers:
            score = 0
            reasons = []

            # Check hourly rate
            if provider.hourly_rate_min:
                if provider.hourly_rate_min < 20:
                    score += 40
                    reasons.append(f"Low hourly rate (£{provider.hourly_rate_min}/hr)")
                elif provider.hourly_rate_min < 25:
                    score += 30
                    reasons.append(
                        f"Competitive hourly rate (£{provider.hourly_rate_min}/hr)"
                    )
                elif provider.hourly_rate_min < 30:
                    score += 20
                    reasons.append(
                        f"Average hourly rate (£{provider.hourly_rate_min}/hr)"
                    )

            # Accepts funding
            if provider.accepts_local_authority_funding:
                score += 25
                reasons.append("Accepts local authority funding")

            if provider.accepts_nhs_funding:
                score += 20
                reasons.append("Accepts NHS funding")

            results.append(
                {
                    "provider_id": str(provider.id),
                    "provider_name": provider.company_name,
                    "confidence_score": min(score, 100),
                    "match_reasons": reasons,
                    "breakdown": {"budget": score},
                }
            )

        # Sort by score
        results.sort(key=lambda x: x["confidence_score"], reverse=True)
        return results


class DistanceFirstStrategy(BaseMatchingStrategy):
    """Prioritize providers closest to the user"""

    def match(self, profile, providers: List[CareProvider]) -> List[Dict[str, Any]]:
        results = []
        for provider in providers:
            score = 0
            reasons = []

            # Calculate distance if coordinates available
            if hasattr(profile, "latitude") and profile.latitude and provider.latitude:
                # Simple distance calculation (in production use PostGIS)
                distance = (
                    abs(float(profile.latitude) - float(provider.latitude)) * 111
                )  # rough km

                if distance < 5:
                    score += 50
                    reasons.append(f"Very close ({distance:.1f} km)")
                elif distance < 10:
                    score += 40
                    reasons.append(f"Close ({distance:.1f} km)")
                elif distance < 20:
                    score += 30
                    reasons.append(f"Within {distance:.1f} km")

            results.append(
                {
                    "provider_id": str(provider.id),
                    "provider_name": provider.company_name,
                    "confidence_score": min(score, 100),
                    "match_reasons": reasons,
                    "breakdown": {"distance": score},
                }
            )

        # Sort by score
        results.sort(key=lambda x: x["confidence_score"], reverse=True)
        return results


class EmergencyFirstStrategy(BaseMatchingStrategy):
    """Prioritize providers offering emergency care"""

    def match(self, profile, providers: List[CareProvider]) -> List[Dict[str, Any]]:
        results = []
        for provider in providers:
            score = 0
            reasons = []

            # Emergency care available
            if provider.emergency_care_available:
                score += 60
                reasons.append("Emergency care available")

            # Currently accepting clients
            if provider.is_accepting_clients:
                score += 30
                reasons.append("Currently accepting clients")

            # Availability now
            if (
                hasattr(provider, "availability_slots")
                and provider.availability_slots.filter(is_available=True).exists()
            ):
                score += 10
                reasons.append("Immediate availability")

            results.append(
                {
                    "provider_id": str(provider.id),
                    "provider_name": provider.company_name,
                    "confidence_score": min(score, 100),
                    "match_reasons": reasons,
                    "breakdown": {"emergency": score},
                }
            )

        # Sort by score
        results.sort(key=lambda x: x["confidence_score"], reverse=True)
        return results


class CultureFirstStrategy(BaseMatchingStrategy):
    """Prioritize providers matching cultural preferences"""

    def match(self, profile, providers: List[CareProvider]) -> List[Dict[str, Any]]:
        results = []
        for provider in providers:
            score = 0
            reasons = []

            # Check specializations
            if hasattr(provider, "expertise") and provider.expertise.exists():
                expertise = provider.expertise.first()

                # Language match
                if (
                    hasattr(profile, "preferred_languages")
                    and profile.preferred_languages
                ):
                    if set(profile.preferred_languages) & set(
                        expertise.languages_spoken
                    ):
                        score += 30
                        reasons.append("Staff speak your preferred languages")

                # Cultural competencies
                if hasattr(profile, "cultural_needs") and profile.cultural_needs:
                    if set(profile.cultural_needs) & set(
                        expertise.cultural_competencies
                    ):
                        score += 30
                        reasons.append("Staff understand your cultural needs")

            results.append(
                {
                    "provider_id": str(provider.id),
                    "provider_name": provider.company_name,
                    "confidence_score": min(score, 100),
                    "match_reasons": reasons,
                    "breakdown": {"culture": score},
                }
            )

        # Sort by score
        results.sort(key=lambda x: x["confidence_score"], reverse=True)
        return results
