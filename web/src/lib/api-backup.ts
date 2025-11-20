import axios from 'axios'
import { ApiResponse, PaginatedResponse, AuthResponse, LoginRequest, RegisterRequest, User, Permission, Tenant } from '@/types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'

// Token management utilities
const getTokenExpiration = (token: string): number | null => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp ? payload.exp * 1000 : null // Convert to milliseconds
  } catch (error) {
    console.error('Error parsing token:', error)
    return null
  }
}

const isTokenExpired = (token: string): boolean => {
  const expiration = getTokenExpiration(token)
  if (!expiration) return false
  return Date.now() >= expiration
}

const isTokenExpiringSoon = (token: string, bufferMinutes: number = 5): boolean => {
  const expiration = getTokenExpiration(token)
  if (!expiration) return false
  const bufferMs = bufferMinutes * 60 * 1000
  return Date.now() >= (expiration - bufferMs)
}

// Enhanced logout function
const performLogout = (reason: string = 'Session expired') => {
  console.log(`Logging out: ${reason}`)

  // Clear all auth-related storage
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('user')
  localStorage.removeItem('currentTenant')

  // Clear any session storage
  sessionStorage.clear()

  // Redirect to login with a message
  const currentUrl = window.location.pathname
  if (currentUrl !== '/login') {
    const params = new URLSearchParams()
    params.append('reason', reason)
    params.append('redirect', currentUrl)
    window.location.href = `/login?${params.toString()}`
  }
}

// Token refresh monitoring
let refreshInProgress = false
let refreshPromise: Promise<string> | null = null

const refreshTokenIfNeeded = async (): Promise<string | null> => {
  const token = localStorage.getItem('accessToken')
  const refreshToken = localStorage.getItem('refreshToken')

  if (!token || !refreshToken) {
    return null
  }

  // If token is not expiring soon, return current token
  if (!isTokenExpiringSoon(token)) {
    return token
  }

  // If refresh is already in progress, wait for it
  if (refreshInProgress && refreshPromise) {
    try {
      return await refreshPromise
    } catch (error) {
      return null
    }
  }

  // Start refresh process
  refreshInProgress = true
  refreshPromise = new Promise<string>(async (resolve, reject) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh`, {
        refreshToken,
      })

      const { accessToken } = response.data.data
      localStorage.setItem('accessToken', accessToken)

      resolve(accessToken)
    } catch (error) {
      console.error('Token refresh failed:', error)
      reject(error)
    } finally {
      refreshInProgress = false
      refreshPromise = null
    }
  })

  try {
    return await refreshPromise
  } catch (error) {
    performLogout('Session expired - please login again')
    return null
  }
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token and check expiration
api.interceptors.request.use(async (config) => {
  // Skip token check for auth endpoints
  const isAuthEndpoint = config.url?.includes('/api/v1/auth/login') ||
                        config.url?.includes('/api/v1/auth/register') ||
                        config.url?.includes('/api/v1/auth/refresh')

  if (!isAuthEndpoint) {
    const token = await refreshTokenIfNeeded()

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    } else {
      // No valid token available, cancel the request
      return Promise.reject({
        config,
        message: 'No valid authentication token available',
        isAuthenticationError: true
      })
    }
  }

  // Add request timestamp for monitoring
  ;(config as any).metadata = { ...(config as any).metadata, startTime: Date.now() }

  return config
})

// Response interceptor to handle token refresh and errors
api.interceptors.response.use(
  (response) => {
    // Log successful requests for debugging
    const duration = Date.now() - (response.config as any).metadata?.startTime
    if (duration > 5000) { // Log slow requests
      console.log(`Slow API request: ${response.config.method?.toUpperCase()} ${response.config.url} took ${duration}ms`)
    }
    return response
  },
  async (error) => {
    const originalRequest = error.config

    // Handle authentication errors
    if (error.isAuthenticationError || error.response?.status === 401) {
      if (!originalRequest._retry) {
        originalRequest._retry = true

        try {
          const newToken = await refreshTokenIfNeeded()
          if (newToken) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`
            return api(originalRequest)
          }
        } catch (refreshError) {
          performLogout('Authentication failed - please login again')
          return Promise.reject(refreshError)
        }
      } else {
        // Already retried once, logout
        performLogout('Session expired - please login again')
      }
    }

    // Handle network errors
    if (!error.response && error.code === 'NETWORK_ERROR') {
      console.error('Network error - please check your connection')
    }

    // Handle server errors
    if (error.response?.status >= 500) {
      console.error('Server error - please try again later')
    }

    return Promise.reject(error)
  }
)

// Set up periodic token check
let tokenCheckInterval: NodeJS.Timeout | null = null

const startTokenMonitoring = () => {
  if (tokenCheckInterval) {
    clearInterval(tokenCheckInterval)
  }

  tokenCheckInterval = setInterval(async () => {
    const token = localStorage.getItem('accessToken')
    const refreshToken = localStorage.getItem('refreshToken')

    if (token && refreshToken) {
      if (isTokenExpired(token)) {
        performLogout('Session expired - please login again')
      } else if (isTokenExpiringSoon(token, 2)) { // 2-minute warning
        console.warn('Session expiring soon - will refresh automatically')
        await refreshTokenIfNeeded()
      }
    }
  }, 30000) // Check every 30 seconds
}

// Start monitoring if we're in a browser environment
if (typeof window !== 'undefined') {
  startTokenMonitoring()

  // Handle page visibility changes
  document.addEventListener('visibilitychange', async () => {
    if (!document.hidden) {
      // Page became visible, check token status
      const token = localStorage.getItem('accessToken')
      if (token && isTokenExpired(token)) {
        performLogout('Session expired while you were away')
      } else if (token && isTokenExpiringSoon(token, 1)) { // 1-minute buffer when returning
        await refreshTokenIfNeeded()
      }
    }
  })

  // Handle browser tab/window close
  window.addEventListener('beforeunload', () => {
    if (tokenCheckInterval) {
      clearInterval(tokenCheckInterval)
    }
  })
}

export const authApi = {
  login: async (data: LoginRequest): Promise<ApiResponse<any>> => {
    console.log('authApi.login called with:', data)
    console.log('API base URL:', process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000')
    const response = await api.post('/api/v1/auth/login', data)
    console.log('API response:', response.data)
    return response.data
  },

  register: async (data: RegisterRequest): Promise<ApiResponse<AuthResponse>> => {
    const response = await api.post('/api/v1/auth/register', data)
    return response.data
  },

  logout: async (refreshToken: string): Promise<ApiResponse<void>> => {
    const response = await api.post('/api/v1/auth/logout', { refreshToken })
    return response.data
  },

  refreshToken: async (refreshToken: string): Promise<ApiResponse<{ accessToken: string }>> => {
    const response = await api.post('/api/v1/auth/refresh', { refreshToken })
    return response.data
  },
}

export const userApi = {
  getProfile: async (): Promise<ApiResponse<User>> => {
    const response = await api.get('/api/v1/users/profile')
    return response.data
  },

  updateProfile: async (data: Partial<User>): Promise<ApiResponse<User>> => {
    const response = await api.put('/api/v1/users/profile', data)
    return response.data
  },

  changePassword: async (data: { currentPassword: string; newPassword: string }): Promise<ApiResponse<void>> => {
    const response = await api.put('/api/v1/users/password', data)
    return response.data
  },

  getUsers: async (params?: {
    page?: number
    limit?: number
    search?: string
    status?: string
    emailVerified?: boolean
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  }): Promise<PaginatedResponse<User>> => {
    const response = await api.get('/api/v1/admin/users', { params })
    return response.data
  },

  activateUser: async (userId: string): Promise<ApiResponse<User>> => {
    const response = await api.post(`/api/v1/admin/users/${userId}/activate`)
    return response.data
  },

  deactivateUser: async (userId: string): Promise<ApiResponse<User>> => {
    const response = await api.post(`/api/v1/admin/users/${userId}/deactivate`)
    return response.data
  },

  getUserById: async (userId: string): Promise<ApiResponse<User>> => {
    const response = await api.get(`/api/v1/admin/users/${userId}`)
    return response.data
  },
}

export const tenantApi = {
  getTenants: async (params?: {
    page?: number
    limit?: number
    search?: string
    type?: string
    status?: string
  }): Promise<PaginatedResponse<Tenant>> => {
    const response = await api.get('/api/v1/tenants', { params })
    return response.data
  },

  getTenantById: async (tenantId: string): Promise<ApiResponse<Tenant>> => {
    const response = await api.get(`/api/v1/tenants/${tenantId}`)
    return response.data
  },

  createTenant: async (data: {
    name: string
    slug: string
    type: 'CORE' | 'BUSINESS' | 'TRIAL'
    domain?: string
    tier?: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE' | 'CUSTOM'
    status?: 'ACTIVE' | 'INACTIVE' | 'PENDING'
    primaryColor?: string
    logoUrl?: string
  }): Promise<ApiResponse<Tenant>> => {
    const response = await api.post('/api/v1/tenants', data)
    return response.data
  },

  updateTenant: async (tenantId: string, data: Partial<Tenant>): Promise<ApiResponse<Tenant>> => {
    const response = await api.put(`/api/v1/tenants/${tenantId}`, data)
    return response.data
  },

  deleteTenant: async (tenantId: string): Promise<ApiResponse<void>> => {
    const response = await api.delete(`/api/v1/tenants/${tenantId}`)
    return response.data
  },

  getTenantUsers: async (tenantId: string, params?: {
    page?: number
    limit?: number
    search?: string
    status?: string
    role?: string
  }): Promise<PaginatedResponse<User>> => {
    const response = await api.get(`/api/v1/tenants/${tenantId}/users`, { params })
    return response.data
  },

  inviteUser: async (tenantId: string, data: {
    email: string
    roleId: string
    message?: string
  }): Promise<ApiResponse<void>> => {
    const response = await api.post(`/api/v1/tenants/${tenantId}/invite`, data)
    return response.data
  },

  getTenantRoles: async (tenantId: string): Promise<ApiResponse<any[]>> => {
    const response = await api.get(`/api/v1/tenants/${tenantId}/roles`)
    return response.data
  },
  getDashboardStats: async (): Promise<ApiResponse<any>> => {
    const response = await api.get('/api/v1/tenants/dashboard/stats')
    return response.data
  },

  duplicateTenant: async (tenantId: string, data?: {
    name?: string
    slug?: string
  }): Promise<ApiResponse<{
    originalTenant: {
      id: string
      name: string
      slug: string
    }
    duplicateTenant: {
      id: string
      name: string
      slug: string
      type: string
      tier: string
      status: string
    }
  }>> => {
    const response = await api.post(`/api/v1/tenants/${tenantId}/duplicate`, data)
    return response.data
  },

  archiveTenant: async (tenantId: string): Promise<ApiResponse<Tenant>> => {
    const response = await api.post(`/api/v1/tenants/${tenantId}/archive`)
    return response.data
  },

  unarchiveTenant: async (tenantId: string): Promise<ApiResponse<Tenant>> => {
    const response = await api.post(`/api/v1/tenants/${tenantId}/unarchive`)
    return response.data
  },

  getArchivedTenants: async (params?: {
    page?: number
    limit?: number
    search?: string
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  }): Promise<PaginatedResponse<Tenant>> => {
    const response = await api.get('/api/v1/tenants/archived', { params })
    return response.data
  },

  getDeletedTenants: async (params?: {
    page?: number
    limit?: number
    search?: string
    dateFrom?: string
    dateTo?: string
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  }): Promise<PaginatedResponse<Tenant>> => {
    const response = await api.get('/api/v1/tenants/trash', { params })
    return response.data
  },

  permanentDeleteTenant: async (tenantId: string): Promise<ApiResponse<void>> => {
    const response = await api.delete(`/api/v1/tenants/${tenantId}/permanent`)
    return response.data
  },

  restoreTenant: async (tenantId: string): Promise<ApiResponse<Tenant>> => {
    const response = await api.post(`/api/v1/tenants/${tenantId}/restore`)
    return response.data
  },

  bulkRestoreTenants: async (tenantIds: string[]): Promise<ApiResponse<void>> => {
    const response = await api.post('/api/v1/tenants/bulk-restore', { tenantIds })
    return response.data
  },

  bulkPermanentDeleteTenants: async (tenantIds: string[]): Promise<ApiResponse<void>> => {
    const response = await api.post('/api/v1/tenants/bulk-permanent-delete', { tenantIds })
    return response.data
  },
}
export const permissionApi = {
  getPermissions: async (params?: {
    page?: number
    limit?: number
    search?: string
    resource?: string
    action?: string
    scope?: string
  }): Promise<PaginatedResponse<Permission>> => {
    const response = await api.get('/api/v1/admin/permissions', { params })
    return response.data
  },

  createPermission: async (data: {
    name: string
    resource: string
    action: string
    scope?: string
    description?: string
    category?: string
  }): Promise<ApiResponse<Permission>> => {
    const response = await api.post('/api/v1/admin/permissions', data)
    return response.data
  },

  updatePermission: async (permissionId: string, data: Partial<Permission>): Promise<ApiResponse<Permission>> => {
    const response = await api.put(`/api/v1/admin/permissions/${permissionId}`, data)
    return response.data
  },

  deletePermission: async (permissionId: string): Promise<ApiResponse<void>> => {
    const response = await api.delete(`/api/v1/admin/permissions/${permissionId}`)
    return response.data
  },
}

export const menuApi = {
  getMenus: async (params?: {
    parentId?: string | null
    isActive?: boolean
    category?: string
    search?: string
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
    page?: number
    limit?: number
  }): Promise<any> => {
    const response = await api.get('/api/v1/admin/menus', { params })
    return response.data
  },

  getMenuById: async (id: string): Promise<any> => {
    const response = await api.get(`/api/v1/admin/menus/${id}`)
    return response.data
  },

  createMenu: async (data: {
    name: string
    label: string
    icon?: string
    path?: string
    component?: string
    parentId?: string | null
    category?: string
    isActive?: boolean
    isPublic?: boolean
    order?: number
    description?: string
  }): Promise<any> => {
    const response = await api.post('/api/v1/admin/menus', data)
    return response.data
  },

  updateMenu: async (id: string, data: any): Promise<any> => {
    const response = await api.put(`/api/v1/admin/menus/${id}`, data)
    return response.data
  },

  deleteMenu: async (id: string, force?: boolean): Promise<any> => {
    const response = await api.delete(`/api/v1/admin/menus/${id}`, {
      params: { force: force ? 'true' : 'false' }
    })
    return response.data
  },

  getMenuTree: async (tenantId?: string): Promise<any> => {
    const response = await api.get('/api/v1/admin/menus/tree', {
      params: tenantId ? { tenantId } : undefined
    })
    return response.data
  },

  getUserMenus: async (userId: string, params?: {
    tenantId?: string
    parentId?: string | null
  }): Promise<any> => {
    const response = await api.get(`/api/v1/admin/menus/user/${userId}`, { params })
    return response.data
  },

  reorderMenus: async (menuOrders: {
    id: string
    order: number
    parentId?: string | null
  }[]): Promise<any> => {
    const response = await api.post('/api/v1/admin/menus/reorder', { menuOrders })
    return response.data
  },

  duplicateMenu: async (id: string, data?: {
    name?: string
    label?: string
    tenantId?: string
  }): Promise<any> => {
    const response = await api.post(`/api/v1/admin/menus/${id}/duplicate`, data)
    return response.data
  },

  getMenuCategories: async (): Promise<any> => {
    const response = await api.get('/api/v1/admin/menus/categories')
    return response.data
  },
}

export const adminApi = {
  getUsers: async (params?: {
    page?: number
    limit?: number
    search?: string
    status?: string
    emailVerified?: boolean
    tenantId?: string
    roleId?: string
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  }): Promise<PaginatedResponse<User>> => {
    const response = await api.get('/api/v1/admin/users', { params })
    return response.data
  },

  getUserById: async (userId: string): Promise<ApiResponse<User>> => {
    const response = await api.get(`/api/v1/admin/users/${userId}`)
    return response.data
  },

  activateUser: async (userId: string): Promise<ApiResponse<User>> => {
    const response = await api.post(`/api/v1/admin/users/${userId}/activate`)
    return response.data
  },

  deactivateUser: async (userId: string): Promise<ApiResponse<User>> => {
    const response = await api.post(`/api/v1/admin/users/${userId}/deactivate`)
    return response.data
  },

  updateUser: async (userId: string, data: Partial<User>): Promise<ApiResponse<User>> => {
    const response = await api.put(`/api/v1/admin/users/${userId}`, data)
    return response.data
  },

  deleteUser: async (userId: string, reason?: string): Promise<ApiResponse<void>> => {
    const response = await api.delete(`/api/v1/admin/users/${userId}`, { data: { reason } })
    return response.data
  },
  restoreUser: async (userId: string): Promise<ApiResponse<void>> => {
    const response = await api.post(`/api/v1/admin/users/${userId}/restore`)
    return response.data
  },
  archiveUser: async (userId: string): Promise<ApiResponse<void>> => {
    const response = await api.post(`/api/v1/admin/users/${userId}/archive`)
    return response.data
  },
  unarchiveUser: async (userId: string): Promise<ApiResponse<void>> => {
    const response = await api.post(`/api/v1/admin/users/${userId}/unarchive`)
    return response.data
  },
  permanentDeleteUser: async (userId: string): Promise<ApiResponse<void>> => {
    const response = await api.delete(`/api/v1/admin/users/${userId}/permanent`)
    return response.data
  },
  getDeletedUsers: async (params?: {
    page?: number
    limit?: number
    search?: string
    dateFrom?: string
    dateTo?: string
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  }): Promise<ApiResponse<any[]>> => {
    const response = await api.get('/api/v1/admin/users/deleted', { params })
    return response.data
  },
  getArchivedUsers: async (params?: {
    page?: number
    limit?: number
    search?: string
    dateFrom?: string
    dateTo?: string
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  }): Promise<ApiResponse<any[]>> => {
    const response = await api.get('/api/v1/admin/users/archived', { params })
    return response.data
  },

  bulkActionUsers: async (action: string, userIds: string[]): Promise<ApiResponse<any>> => {
    const response = await api.post('/api/v1/admin/users/bulk-action', { action, userIds })
    return response.data
  },

  exportUsers: async (params?: {
    search?: string
    status?: string
    emailVerified?: boolean
    dateFrom?: string
    dateTo?: string
    format?: 'json' | 'csv'
  }): Promise<any> => {
    const response = await api.get('/api/v1/admin/users/export', { params })
    return response.data
  },

  createUser: async (data: {
    name: string
    email: string
    phone?: string
    timezone?: string
    language?: string
    status?: string
    tenantId: string
    roleId: string
    sendEmailInvite?: boolean
  }): Promise<ApiResponse<User>> => {
    const response = await api.post('/api/v1/admin/users', data)
    return response.data
  },
}

export default api