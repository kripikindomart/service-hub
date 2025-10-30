export interface User {
  id: string
  email: string
  name: string
  phone?: string
  timezone: string
  language: string
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING'
  emailVerified: boolean
  createdAt: string
  updatedAt: string
  lastLoginAt?: string
  userTenants?: UserTenant[]
}

export interface UserTenant {
  id: string
  userId: string
  tenantId: string
  roleId: string
  status: 'ACTIVE' | 'INACTIVE'
  joinedAt: string
  tenant?: Tenant
  role?: Role
}

export interface Tenant {
  id: string
  name: string
  slug: string
  type: 'CORE' | 'BUSINESS' | 'PERSONAL'
  tier: 'STARTER' | 'PRO' | 'ENTERPRISE'
  status: 'ACTIVE' | 'INACTIVE'
  createdAt: string
  updatedAt: string
}

export interface Role {
  id: string
  name: string
  description?: string
  isSystemRole: boolean
  permissions?: RolePermission[]
}

export interface Permission {
  id: string
  name: string
  resource: string
  action: string
  scope: 'OWN' | 'TENANT' | 'ALL'
  description?: string
  category?: string
}

export interface RolePermission {
  id: string
  roleId: string
  permissionId: string
  permission?: Permission
}

export interface AuthResponse {
  user: User
  accessToken: string
  refreshToken: string
  expiresIn: number
  tokenType: string
}

export interface LoginRequest {
  email: string
  password: string
  tenantSlug?: string
}

export interface RegisterRequest {
  email: string
  password: string
  name: string
  timezone?: string
  language?: string
}

export interface ApiResponse<T> {
  success: boolean
  message: string
  data?: T
  error?: string
}

export interface PaginatedResponse<T> {
  success: boolean
  message: string
  data: {
    items: T[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
      hasNext: boolean
      hasPrev: boolean
    }
  }
}