'use client'

import React, { useState, useEffect, createContext, useContext } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  name: string
  email: string
  role?: string
}

interface CurrentTenant {
  id: string
  name: string
  slug: string
  type: string
}

interface AuthContextType {
  user: User | null
  currentTenant: CurrentTenant | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [currentTenant, setCurrentTenant] = useState<CurrentTenant | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check for stored auth data on mount
    const storedUser = localStorage.getItem('authUser')
    const storedTenant = localStorage.getItem('currentTenant')

    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser))
      } catch (error) {
        console.error('Error parsing stored user:', error)
        localStorage.removeItem('authUser')
      }
    }

    if (storedTenant) {
      try {
        setCurrentTenant(JSON.parse(storedTenant))
      } catch (error) {
        console.error('Error parsing stored tenant:', error)
        localStorage.removeItem('currentTenant')
      }
    }

    setLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    try {
      // Mock login - replace with actual API call
      const mockUser: User = {
        id: '1',
        name: 'Admin User',
        email: email,
        role: 'ADMIN'
      }

      const mockTenant: CurrentTenant = {
        id: '1',
        name: 'System Core',
        slug: 'system-core',
        type: 'CORE'
      }

      setUser(mockUser)
      setCurrentTenant(mockTenant)
      localStorage.setItem('authUser', JSON.stringify(mockUser))
      localStorage.setItem('currentTenant', JSON.stringify(mockTenant))

      router.push(`/${mockTenant.slug}/dashboard`)
    } catch (error) {
      console.error('Login failed:', error)
      throw error
    }
  }

  const logout = async () => {
    try {
      setUser(null)
      setCurrentTenant(null)
      localStorage.removeItem('authUser')
      localStorage.removeItem('currentTenant')
      localStorage.removeItem('tenantRoleContext')
      router.push('/login')
    } catch (error) {
      console.error('Logout failed:', error)
      throw error
    }
  }

  const value: AuthContextType = {
    user,
    currentTenant,
    login,
    logout,
    loading
  }

  return React.createElement(AuthContext.Provider, { value }, children)
}