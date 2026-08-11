import { useState, useCallback } from 'react'
import api from '@/lib/api'

interface MatchingFilters {
  strategy?: 'quality' | 'budget' | 'distance' | 'culture' | 'emergency'
  max_distance?: number
  max_budget?: number
  care_type?: string
  specializations?: string[]
  languages?: string[]
  cultural_needs?: string[]
}

interface MatchResult {
  provider_id: string
  provider_name: string
  confidence_score: number
  match_reasons: string[]
  breakdown: {
    quality: number
    specialization: number
    distance: number
    price: number
  }
  distance_km: number | null
  estimated_cost: number | null
  availability_status: string
}

export function useMatching() {
  const [matches, setMatches] = useState<MatchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const findMatches = useCallback(async (filters: MatchingFilters = {}) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await api.post('/matching/match/', filters)
      setMatches(response.data)
      return { success: true, data: response.data }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to find matches'
      setError(errorMessage)
      setMatches([])
      return { success: false, error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const getProviderDetails = useCallback(async (providerId: string) => {
    try {
      const response = await api.get(`/providers/${providerId}/`)
      return { success: true, data: response.data }
    } catch (err: any) {
      return { 
        success: false, 
        error: err.response?.data || 'Failed to fetch provider details' 
      }
    }
  }, [])

  const saveMatch = useCallback(async (providerId: string, notes?: string) => {
    try {
      await api.post('/matching/save/', {
        provider_id: providerId,
        notes,
        saved_at: new Date().toISOString(),
      })
      return { success: true }
    } catch (err: any) {
      return { 
        success: false, 
        error: err.response?.data || 'Failed to save match' 
      }
    }
  }, [])

  const getSavedMatches = useCallback(async () => {
    try {
      const response = await api.get('/matching/saved/')
      return { success: true, data: response.data }
    } catch (err: any) {
      return { 
        success: false, 
        error: err.response?.data || 'Failed to fetch saved matches' 
      }
    }
  }, [])

  const emergencyMatch = useCallback(async (latitude: number, longitude: number, careType: string) => {
    setIsLoading(true)
    
    try {
      const response = await api.post('/matching/emergency/', {
        latitude,
        longitude,
        care_type: careType,
        strategy: 'emergency',
      })
      setMatches(response.data)
      return { success: true, data: response.data }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Emergency matching failed'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const clearMatches = useCallback(() => {
    setMatches([])
    setError(null)
  }, [])

  return {
    matches,
    isLoading,
    error,
    findMatches,
    getProviderDetails,
    saveMatch,
    getSavedMatches,
    emergencyMatch,
    clearMatches,
  }
}