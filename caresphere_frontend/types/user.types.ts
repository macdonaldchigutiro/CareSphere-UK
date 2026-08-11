export type UserType = 
  | 'service_user' 
  | 'family_member' 
  | 'care_provider' 
  | 'caregiver' 
  | 'admin' 
  | 'system'

type CareType = 
  | 'elderly' 
  | 'disability' 
  | 'post-surgery' 
  | 'chronic' 
  | 'palliative' 
  | 'respite'

export type AccessibilityMode = 
  | 'standard' 
  | 'high_contrast' 
  | 'large_text' 
  | 'screen_reader'

export type ContactMethod = 
  | 'email' 
  | 'phone' 
  | 'sms' 
  | 'app'

export type NotificationFrequency = 
  | 'immediate' 
  | 'daily_digest' 
  | 'weekly_summary'

export interface User {
  id: string
  email: string
  phone_number?: string
  first_name: string
  last_name: string
  date_of_birth?: string
  user_type: UserType
  is_active: boolean
  is_staff: boolean
  is_verified: boolean
  date_joined: string
  last_login?: string
  gdpr_consent_given: boolean
  gdpr_consent_date?: string
  marketing_consent: boolean
  preferred_language: string
  accessibility_mode: AccessibilityMode
}

export interface UserProfile {
  user_id: string
  profile_picture?: string
  bio?: string
  address_line1?: string
  address_line2?: string
  city?: string
  postcode?: string
  county?: string
  country: string
  latitude?: number
  longitude?: number
  emergency_contact_name?: string
  emergency_contact_phone?: string
  emergency_contact_relationship?: string
  preferred_contact_method: ContactMethod
  notification_frequency: NotificationFrequency
}

export interface ServiceUserProfile extends UserProfile {
  preferred_care_type?: CareType
  medical_needs: string[]
  mobility_level: MobilityLevel
  dementia_needs?: boolean
  alzheimers_needs?: boolean
  language_preferences: string[]
  cultural_needs: string[]
  gender_preference?: GenderPreference
  weekly_budget?: number
  funding_type?: FundingType
}

export interface FamilyMember {
  id: string
  user: User
  care_circle_id: string
  relationship: FamilyRelationship
  role: FamilyRole
  is_active: boolean
  is_verified: boolean
  permissions: FamilyPermissions
  joined_at: string
  last_active: string
}

export type FamilyRelationship = 
  | 'spouse' 
  | 'child' 
  | 'parent' 
  | 'sibling' 
  | 'grandchild' 
  | 'friend' 
  | 'neighbor' 
  | 'professional' 
  | 'other'

export type FamilyRole = 
  | 'primary' 
  | 'decision_maker' 
  | 'contributor' 
  | 'viewer' 
  | 'admin'

export interface FamilyPermissions {
  can_invite_members: boolean
  can_manage_bookings: boolean
  can_view_financiers: boolean
  can_make_decisions: boolean
  can_edit_profiles: boolean
}

export type MobilityLevel = 
  | 'independent' 
  | 'walking_aid' 
  | 'wheelchair' 
  | 'bed_bound'

export type GenderPreference = 
  | 'male' 
  | 'female' 
  | 'no_preference'

export type FundingType = 
  | 'private' 
  | 'local_authority' 
  | 'insurance' 
  | 'nhs' 
  | 'mixed'

// API Response Types
export interface AuthResponse {
  user: User
  access: string
  refresh: string
  message?: string
}

export interface ApiResponse<T = any> {
  data: T
  message?: string
  status: number
}

export interface PaginatedResponse<T = any> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

// Provider Types
export interface Provider {
  id: string
  name: string
  email: string
  phone: string
  specialty: string[]
  rating: number
  hourlyRate: number
  location: string
}

// Matching Types
export interface MatchResult {
  provider: Provider
  score: number
  matchReasons: string[]
  price: number
}

export interface MatchingFilters {
  location: string
  minRating: number
  maxPrice: number
  specialties: string[]
}