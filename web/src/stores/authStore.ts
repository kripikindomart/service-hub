import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User, Tenant } from '@/types'
import { getAuthUser, getAccessToken } from '@/lib/auth'

interface AuthState {
  user: User | null
  currentTenant: Tenant | null
  isLoading: boolean
  setUser: (user: User) => void
  setCurrentTenant: (tenant: Tenant) => void
  setLoading: (loading: boolean) => void
  logout: () => void
  initializeAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      currentTenant: null,
      isLoading: false,

      setUser: (user: User) => set({ user }),

      setCurrentTenant: (tenant: Tenant) => set({ currentTenant: tenant }),

      setLoading: (isLoading: boolean) => set({ isLoading }),

      logout: () => {
        set({ user: null, currentTenant: null })
        // Clear localStorage
        if (typeof window !== 'undefined') {
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')
          localStorage.removeItem('user')
          localStorage.removeItem('currentTenant')
        }
      },

      initializeAuth: () => {
        const accessToken = getAccessToken()
        const authUser = getAuthUser()

        if (accessToken && authUser) {
          set({
            user: authUser,
            isLoading: false
          })
        } else {
          set({ user: null, isLoading: false })
        }
      }
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({
        user: state.user,
        currentTenant: state.currentTenant
      })
    }
  )
)