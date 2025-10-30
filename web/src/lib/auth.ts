import { User } from '@/types'

export const setAuthData = (accessToken: string, refreshToken: string, user: User) => {
  localStorage.setItem('accessToken', accessToken)
  localStorage.setItem('refreshToken', refreshToken)
  localStorage.setItem('user', JSON.stringify(user))
}

export const clearAuthData = () => {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('user')
}

export const getAuthUser = (): User | null => {
  const userStr = localStorage.getItem('user')
  return userStr ? JSON.parse(userStr) : null
}

export const getAccessToken = (): string | null => {
  return localStorage.getItem('accessToken')
}

export const isAuthenticated = (): boolean => {
  return !!getAccessToken()
}