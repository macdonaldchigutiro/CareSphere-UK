// User types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'family' | 'provider' | 'admin';
  avatar?: string;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  accessibility: {
    highContrast: boolean;
    fontSize: 'small' | 'medium' | 'large';
    voiceAssistance: boolean;
  };
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
}

// Provider types
export interface Provider {
  id: string;
  name: string;
  type: 'individual' | 'facility';
  specialty: string[];
  experience: number;
  rating: number;
  reviews: Review[];
  hourlyRate: number;
  availability: AvailabilitySlot[];
  location: Location;
  verification: Verification;
  trustScore: number;
}

export interface Review {
  id: string;
  rating: number;
  comment: string;
  author: string;
  date: string;
}

export interface AvailabilitySlot {
  date: string;
  startTime: string;
  endTime: string;
  isBooked: boolean;
}

export interface Location {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface Verification {
  backgroundCheck: boolean;
  licenseVerified: boolean;
  certifications: string[];
  cqcRating?: string;
}

// Matching types
export interface MatchingCriteria {
  location: string;
  budgetRange: [number, number];
  requiredSpecialties: string[];
  availability: {
    startDate: string;
    endDate: string;
  };
  careLevel: 'basic' | 'intermediate' | 'advanced';
}

export interface MatchResult {
  provider: Provider;
  confidenceScore: number;
  matchReasons: string[];
  priceBreakdown: PriceBreakdown;
}

export interface PriceBreakdown {
  baseRate: number;
  surcharges: number;
  discounts: number;
  total: number;
}

// Booking types
export interface Booking {
  id: string;
  providerId: string;
  userId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  totalCost: number;
  paymentStatus: 'pending' | 'paid' | 'refunded';
  specialInstructions?: string;
}

// Family types
export interface FamilyMember {
  id: string;
  name: string;
  relationship: string;
  email: string;
  phone: string;
  isPrimary: boolean;
}

export interface FamilyGroup {
  id: string;
  name: string;
  members: FamilyMember[];
  careRecipient: {
    name: string;
    age: number;
    conditions: string[];
    careNeeds: string[];
  };
}