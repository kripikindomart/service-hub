'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { initializeAuth } = useAuthStore()

  useEffect(() => {
    // Initialize auth on app start
    initializeAuth()
  }, [initializeAuth])

  return <>{children}</>
}