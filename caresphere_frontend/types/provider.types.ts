// src/types/provider.types.ts
export interface Provider {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  type: 'individual' | 'facility' | 'agency';
  specialty: string[];
  experience: number; // years
  rating: number; // 0-5
  reviewCount: number;
  hourlyRate: number;
  location: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  availability: AvailabilitySlot[];
  verification: {
    backgroundCheck: boolean;
    licenseVerified: boolean;
    certifications: string[];
    cqcRating?: 'outstanding' | 'good' | 'requires-improvement' | 'inadequate';
  };
  trustScore: number; // 0-100
  languages: string[];
  hasVehicle: boolean;
  isAvailable: boolean;
  bio: string;
}

export interface AvailabilitySlot {
  id: string;
  date: string; // ISO format
  startTime: string;
  endTime: string;
  isBooked: boolean;
}

export interface Review {
  id: string;
  providerId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
  response?: string;
}

export interface ProviderDetails extends Provider {
  education: Education[];
  workHistory: WorkExperience[];
  services: Service[];
  insurance: InsuranceInfo;
  emergencyContact?: EmergencyContact;
}

export interface Education {
  institution: string;
  degree: string;
  field: string;
  year: number;
}

export interface WorkExperience {
  position: string;
  facility: string;
  startDate: string;
  endDate?: string;
  description: string;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number; // minutes
}

export interface InsuranceInfo {
  provider: string;
  policyNumber: string;
  expiration: string;
  coverage: string[];
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
}