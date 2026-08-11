import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Provider, User, Booking } from '../types';

// Define the store interface
interface AppState {
  // Authentication
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  
  // Matching
  providers: Provider[];
  selectedProvider: Provider | null;
  matchingFilters: any;
  
  // Booking
  bookings: Booking[];
  activeBooking: Booking | null;
  
  // UI State
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setProviders: (providers: Provider[]) => void;
  setSelectedProvider: (provider: Provider | null) => void;
  addBooking: (booking: Booking) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  logout: () => void;
}

// Create the store with persistence
export const useStore = create<AppState>()(
  persist(
    (set) => ({
      // Initial state
      user: null,
      token: null,
      isAuthenticated: false,
      providers: [],
      selectedProvider: null,
      matchingFilters: {},
      bookings: [],
      activeBooking: null,
      isLoading: false,
      error: null,
      
      // Actions
      setUser: (user) => set((state) => ({ 
        user, 
        isAuthenticated: !!user 
      })),
      setToken: (token) => set({ token }),
      setProviders: (providers) => set({ providers }),
      setSelectedProvider: (provider) => set({ selectedProvider: provider }),
      addBooking: (booking) => set((state) => ({ 
        bookings: [...state.bookings, booking] 
      })),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),
      logout: () => set({
        user: null,
        token: null,
        isAuthenticated: false,
        providers: [],
        selectedProvider: null,
        bookings: [],
        activeBooking: null,
      }),
    }),
    {
      name: 'care-sphere-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Create slice-specific stores
export const createMatchingSlice = (set: any, get: any) => ({
  providers: [],
  selectedProvider: null,
  matchingFilters: {},
  confidenceScore: 0,
  
  setMatchingFilters: (filters: any) => set({ matchingFilters: filters }),
  updateConfidenceScore: (score: number) => set({ confidenceScore: score }),
  resetMatching: () => set({ 
    providers: [], 
    selectedProvider: null,
    confidenceScore: 0 
  }),
});

export const useMatchingStore = create(
  persist(
    (set, get) => ({
      ...createMatchingSlice(set, get),
    }),
    {
      name: 'matching-storage',
    }
  )
);