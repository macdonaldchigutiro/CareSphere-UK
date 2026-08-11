import { StateCreator } from 'zustand'
import { User } from '../../types/user.types'

export interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

export interface AuthActions {
  setUser: (user: User | null) => void
  setTokens: (access: string, refresh: string) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  login: (user: User, access: string, refresh: string) => void
  logout: () => void
  clearError: () => void
}

export type AuthSlice = AuthState & AuthActions

export const createAuthSlice: StateCreator<
  AuthSlice,
  [['zustand/persist', unknown]],
  [],
  AuthSlice
> = (set) => ({
  // Initial state
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  
  // Actions
  setUser: (user) => set((state) => ({ 
    user, 
    isAuthenticated: !!user 
  })),
  
  setTokens: (access, refresh) => set(() => ({ 
    accessToken: access, 
    refreshToken: refresh 
  })),
  
  setLoading: (loading) => set(() => ({ isLoading: loading })),
  
  setError: (error) => set(() => ({ error })),
  
  login: (user, access, refresh) => set(() => ({
    user,
    accessToken: access,
    refreshToken: refresh,
    isAuthenticated: true,
    error: null,
    isLoading: false,
  })),
  
  logout: () => set(() => ({
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
    error: null,
    isLoading: false,
  })),
  
  clearError: () => set(() => ({ error: null })),
})