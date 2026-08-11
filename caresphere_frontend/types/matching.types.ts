// src/types/matching.types.ts

import { Provider } from './provider.types';
import { FamilyMember } from './user.types';

// Matching Criteria Types
export interface MatchingCriteria {
  location: {
    address: string;
    radius: number; // in miles
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  budget: {
    min: number;
    max: number;
    per: 'hour' | 'day' | 'week' | 'month';
  };
  schedule: {
    startDate: string; // ISO string
    endDate?: string; // ISO string
    preferredDays: ('monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday')[];
    preferredTimes: ('morning' | 'afternoon' | 'evening' | 'night')[];
    flexibility: 'strict' | 'flexible' | 'very-flexible';
  };
  careNeeds: {
    level: 'basic' | 'intermediate' | 'advanced' | 'specialized';
    skillsRequired: string[];
    medicalConditions: string[];
    specialRequirements?: string[];
    assistanceWith: {
      mobility: boolean;
      bathing: boolean;
      dressing: boolean;
      medication: boolean;
      meals: boolean;
      housekeeping: boolean;
      transportation: boolean;
    };
  };
  providerPreferences: {
    gender?: 'male' | 'female' | 'any';
    language?: string[];
    certification?: string[];
    minExperience?: number; // in years
    minRating?: number; // 0-5
    hasVehicle?: boolean;
    nonSmoker?: boolean;
  };
}

// Match Result Types
export interface MatchResult {
  provider: Provider;
  score: {
    overall: number; // 0-100
    breakdown: {
      availability: number;
      location: number;
      skills: number;
      budget: number;
      preferences: number;
    };
  };
  compatibility: {
    strengths: string[];
    considerations: string[];
    warningFlags?: string[];
  };
  pricing: {
    hourlyRate: number;
    estimatedWeekly: number;
    estimatedMonthly: number;
    surcharges?: {
      weekend?: number;
      holiday?: number;
      emergency?: number;
    };
    discounts?: {
      longTerm?: number;
      familyReferral?: number;
      veterans?: number;
    };
  };
  availability: {
    nextAvailable: string; // ISO date
    slots: AvailabilitySlot[];
    bookingLeadTime: number; // in hours
  };
}

// Availability Types
export interface AvailabilitySlot {
  id: string;
  date: string; // ISO date
  startTime: string; // ISO time
  endTime: string; // ISO time
  duration: number; // in minutes
  isBooked: boolean;
  isRecurring: boolean;
}

// Matching Process Types
export interface MatchingState {
  criteria: MatchingCriteria | null;
  results: MatchResult[];
  selectedResult: MatchResult | null;
  isLoading: boolean;
  error: string | null;
  step: 'criteria' | 'searching' | 'results' | 'review' | 'booking';
  filters: {
    minScore: number;
    maxRate: number;
    availability: 'any' | 'this-week' | 'next-week' | 'this-month';
    certification: string[];
  };
}

// Confidence Scoring Types
export interface ConfidenceScore {
  overall: number; // 0-100
  factors: {
    name: string;
    score: number;
    weight: number;
    explanation: string;
  }[];
  level: 'low' | 'medium' | 'high' | 'excellent';
  recommendations: string[];
}

// Family Collaboration Types
export interface FamilyVote {
  memberId: string;
  memberName: string;
  vote: 'approve' | 'reject' | 'abstain';
  comments?: string;
  timestamp: string;
}

export interface FamilyDecision {
  providerId: string;
  votes: FamilyVote[];
  outcome: 'approved' | 'rejected' | 'pending';
  requiredApprovals: number;
  receivedApprovals: number;
  deadline: string; // ISO date
}

// AI Matching Recommendations
export interface AIRecommendation {
  reason: string;
  priority: 'high' | 'medium' | 'low';
  evidence: string[];
  suggestedAction: string;
}

// Emergency Matching Types
export interface EmergencyCriteria {
  urgency: 'low' | 'medium' | 'high' | 'critical';
  immediateNeed: boolean;
  maxResponseTime: number; // in hours
  temporaryPlacement: boolean;
  notes: string;
}

