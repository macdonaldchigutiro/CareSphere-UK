import { StateCreator } from 'zustand';
import { MatchResult } from '../../types/user.types';

export interface MatchingFilters {
  strategy: 'quality' | 'budget' | 'distance' | 'culture' | 'emergency'
  max_distance: number
  max_budget?: number
  care_type?: string
  specializations: string[]
  languages: string[]
  cultural_needs: string[]
  gender_preference?: string
  min_rating?: number
  emergency_only: boolean
}

export interface MatchingState {
  matches: MatchResult[]
  filters: MatchingFilters
  savedMatches: string[]
  isLoading: boolean
  error: string | null
  selectedProvider: string | null
}

export interface MatchingActions {
  setMatches: (matches: MatchResult[]) => void
  setFilters: (filters: Partial<MatchingFilters>) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setSelectedProvider: (providerId: string | null) => void
  saveMatch: (providerId: string) => void
  unsaveMatch: (providerId: string) => void
  clearMatches: () => void
  clearFilters: () => void
  clearError: () => void
}

export type MatchingSlice = MatchingState & MatchingActions

export const createMatchingSlice: StateCreator<
  MatchingSlice,
  [['zustand/persist', unknown]],
  [],
  MatchingSlice
> = (set) => ({
  // Initial state
  matches: [],
  filters: {
    strategy: 'quality',
    max_distance: 25,
    max_budget: undefined,
    care_type: undefined,
    specializations: [],
    languages: [],
    cultural_needs: [],
    gender_preference: undefined,
    min_rating: undefined,
    emergency_only: false,
  },
  savedMatches: [],
  isLoading: false,
  error: null,
  selectedProvider: null,
  
  // Actions
  setMatches: (matches) => set(() => ({ matches })),
  
  setFilters: (filters) => set((state) => ({ 
    filters: { ...state.filters, ...filters } 
  })),
  
  setLoading: (loading) => set(() => ({ isLoading: loading })),
  
  setError: (error) => set(() => ({ error })),
  
  setSelectedProvider: (providerId) => set(() => ({ selectedProvider: providerId })),
  
  saveMatch: (providerId) => set((state) => ({
    savedMatches: [...state.savedMatches, providerId]
  })),
  
  unsaveMatch: (providerId) => set((state) => ({
    savedMatches: state.savedMatches.filter(id => id !== providerId)
  })),
  
  clearMatches: () => set(() => ({ matches: [] })),
  
  clearFilters: () => set(() => ({ 
    filters: {
      strategy: 'quality',
      max_distance: 25,
      max_budget: undefined,
      care_type: undefined,
      specializations: [],
      languages: [],
      cultural_needs: [],
      gender_preference: undefined,
      min_rating: undefined,
      emergency_only: false,
    }
  })),
  
  clearError: () => set(() => ({ error: null })),
})
