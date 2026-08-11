import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'

interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  date_joined: string
}

interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
}

interface LoginCredentials {
  email: string
  password: string
}

interface RegisterData extends LoginCredentials {
  first_name: string
  last_name: string
}

export function useAuth() {
  const router = useRouter()
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  })

  // Initialize auth state
  useEffect(() => {
    const token = localStorage.getItem('access_token')
    const userStr = localStorage.getItem('user')
    
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr)
        setAuthState({
          user,
          isLoading: false,
          isAuthenticated: true,
        })
      } catch {
        localStorage.removeItem('access_token')
        localStorage.removeItem('user')
        localStorage.removeItem('refresh_token')
      }
    } else {
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      })
    }
  }, [])

  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }))
      
      const response = await api.post('/auth/login/', credentials)
      const { access, refresh, user } = response.data
      
      localStorage.setItem('access_token', access)
      localStorage.setItem('refresh_token', refresh)
      localStorage.setItem('user', JSON.stringify(user))
      
      setAuthState({
        user,
        isLoading: false,
        isAuthenticated: true,
      })
      
      return { success: true, user }
    } catch (error: any) {
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      })
      
      return {
        success: false,
        error: error.response?.data || 'Login failed',
      }
    }
  }, [])

  const register = useCallback(async (data: RegisterData) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }))
      
      const response = await api.post('/auth/register/', data)
      const { access, refresh, user } = response.data
      
      localStorage.setItem('access_token', access)
      localStorage.setItem('refresh_token', refresh)
      localStorage.setItem('user', JSON.stringify(user))
      
      setAuthState({
        user,
        isLoading: false,
        isAuthenticated: true,
      })
      
      return { success: true, user }
    } catch (error: any) {
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      })
      
      return {
        success: false,
        error: error.response?.data || 'Registration failed',
      }
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    
    setAuthState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
    })
    
    router.push('/')
  }, [router])

  const refreshToken = useCallback(async () => {
    try {
      const refresh = localStorage.getItem('refresh_token')
      if (!refresh) {
        logout()
        return false
      }
      
      const response = await api.post('/auth/token/refresh/', {
        refresh,
      })
      
      localStorage.setItem('access_token', response.data.access)
      return true
    } catch {
      logout()
      return false
    }
  }, [logout])

  // Add token refresh interceptor
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config
        
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true
          
          const refreshed = await refreshToken()
          if (refreshed) {
            originalRequest.headers.Authorization = `Bearer ${localStorage.getItem('access_token')}`
            return api(originalRequest)
          }
        }
        
        return Promise.reject(error)
      }
    )
    
    return () => {
      api.interceptors.response.eject(interceptor)
    }
  }, [refreshToken])

  return {
    ...authState,
    login,
    register,
    logout,
    refreshToken,
  }
}