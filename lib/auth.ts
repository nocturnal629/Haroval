'use client'

import { useState, useEffect } from 'react'

export interface User {
  id: string
  username: string
}

export interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null
  })

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include' // Include cookies
      })

      if (response.ok) {
        const data = await response.json()
        setAuthState({
          user: data.user,
          loading: false,
          error: null
        })
      } else {
        setAuthState({
          user: null,
          loading: false,
          error: null
        })
      }
    } catch (error) {
      setAuthState({
        user: null,
        loading: false,
        error: 'Failed to check authentication status'
      })
    }
  }

  const login = async (username: string, password: string) => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }))

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies
        body: JSON.stringify({ username, password })
      })

      const data = await response.json()

      if (response.ok) {
        setAuthState({
          user: data.user,
          loading: false,
          error: null
        })
        return { success: true, user: data.user }
      } else {
        setAuthState(prev => ({
          ...prev,
          loading: false,
          error: data.error || 'Login failed'
        }))
        return { success: false, error: data.error || 'Login failed' }
      }
    } catch (error) {
      const errorMessage = 'Network error during login'
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }))
      return { success: false, error: errorMessage }
    }
  }

  const register = async (username: string, password: string, confirmPassword: string) => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }))

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies
        body: JSON.stringify({ username, password, confirmPassword })
      })

      const data = await response.json()

      if (response.ok) {
        setAuthState({
          user: data.user,
          loading: false,
          error: null
        })
        return { success: true, user: data.user }
      } else {
        setAuthState(prev => ({
          ...prev,
          loading: false,
          error: data.error || 'Registration failed'
        }))
        return { success: false, error: data.error || 'Registration failed' }
      }
    } catch (error) {
      const errorMessage = 'Network error during registration'
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }))
      return { success: false, error: errorMessage }
    }
  }

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include' // Include cookies
      })

      setAuthState({
        user: null,
        loading: false,
        error: null
      })
    } catch (error) {
      console.error('Logout error:', error)
      // Still clear local state even if logout request fails
      setAuthState({
        user: null,
        loading: false,
        error: null
      })
    }
  }

  const refreshToken = async () => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include' // Include cookies
      })

      if (response.ok) {
        return true
      } else {
        // Refresh failed, user needs to login again
        setAuthState({
          user: null,
          loading: false,
          error: null
        })
        return false
      }
    } catch (error) {
      console.error('Token refresh error:', error)
      setAuthState({
        user: null,
        loading: false,
        error: null
      })
      return false
    }
  }

  const loginWithGoogle = async () => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }))
      
      // Get Google OAuth URL
      const response = await fetch('/api/auth/google', {
        method: 'GET',
        credentials: 'include'
      })

      const data = await response.json()

      if (response.ok && data.authUrl) {
        // Redirect to Google OAuth
        window.location.href = data.authUrl
        return { success: true }
      } else {
        setAuthState(prev => ({
          ...prev,
          loading: false,
          error: data.error || 'Failed to initiate Google login'
        }))
        return { success: false, error: data.error || 'Failed to initiate Google login' }
      }
    } catch (error) {
      const errorMessage = 'Network error during Google login'
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }))
      return { success: false, error: errorMessage }
    }
  }

  return {
    ...authState,
    login,
    register,
    logout,
    refreshToken,
    checkAuthStatus,
    loginWithGoogle
  }
}
