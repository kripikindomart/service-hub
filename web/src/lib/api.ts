import axios from 'axios'
import { ApiResponse, PaginatedResponse, AuthResponse, LoginRequest, RegisterRequest, User, Permission, Tenant } from '@/types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const refreshToken = localStorage.getItem('refreshToken')
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh`, {
            refreshToken,
          })

          const { accessToken } = response.data.data
          localStorage.setItem('accessToken', accessToken)

          originalRequest.headers.Authorization = `Bearer ${accessToken}`
          return api(originalRequest)
        }
      } catch (refreshError) {
        // Refresh token failed, logout user
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('user')
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  }
)

export const authApi = {
  login: async (data: LoginRequest): Promise<ApiResponse<any>> => {
    const response = await api.post('/api/v1/auth/login', data)
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
    const response = await api.put(`/api/v1/admin/users/${userId}/activate`)
    return response.data
  },

  deactivateUser: async (userId: string): Promise<ApiResponse<User>> => {
    const response = await api.put(`/api/v1/admin/users/${userId}/deactivate`)
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
    type: 'CORE' | 'BUSINESS' | 'PERSONAL'
    tier?: 'STARTER' | 'PRO' | 'ENTERPRISE'
  }): Promise<ApiResponse<Tenant>> => {
    const response = await api.post('/api/v1/tenants', data)
    return response.data
  },

  updateTenant: async (tenantId: string, data: Partial<Tenant>): Promise<ApiResponse<Tenant>> => {
    const response = await api.put(`/api/v1/tenants/${tenantId}`, data)
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
    const response = await api.put(`/api/v1/admin/users/${userId}/activate`)
    return response.data
  },

  deactivateUser: async (userId: string): Promise<ApiResponse<User>> => {
    const response = await api.put(`/api/v1/admin/users/${userId}/deactivate`)
    return response.data
  },

  updateUser: async (userId: string, data: Partial<User>): Promise<ApiResponse<User>> => {
    const response = await api.put(`/api/v1/admin/users/${userId}`, data)
    return response.data
  },

  deleteUser: async (userId: string): Promise<ApiResponse<void>> => {
    const response = await api.delete(`/api/v1/admin/users/${userId}`)
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