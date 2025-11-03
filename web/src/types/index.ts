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
  deletedAt?: string
  archivedAt?: string
  userTenants?: UserTenant[]
  actions?: any
}

export interface UserTenant {
  id: string
  userId: string
  tenantId: string
  roleId: string
  status: 'ACTIVE' | 'INACTIVE'
  joinedAt: string
  isPrimary?: boolean
  tenant?: Tenant
  role?: Role
}

export interface Tenant {
  id: string
  name: string
  slug: string
  domain?: string
  type: 'CORE' | 'BUSINESS' | 'TRIAL'
  tier: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE' | 'CUSTOM'
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING'
  maxUsers: number
  maxServices: number
  storageLimitMb: number
  databaseName: string
  databaseHost?: string
  databasePort?: number
  primaryColor: string
  logoUrl?: string
  faviconUrl?: string
  customDomain?: string
  settings?: any
  featureFlags?: any
  integrations?: any
  createdAt: string
  updatedAt: string
  userCount?: number
  serviceCount?: number
  storageUsed?: number
  lastActivity?: string
  archivedAt?: string
  deletedAt?: string
}

export interface Role {
  id: string
  name: string
  description?: string
  isSystemRole: boolean
  level?: string
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
  isSystemPermission?: boolean
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