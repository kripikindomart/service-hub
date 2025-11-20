export interface User {
  id: string
  email: string
  name: string
  phone?: string
  timezone: string
  language: string
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING'
  emailVerified: boolean
  emailVerifiedAt?: string
  createdAt: string
  updatedAt: string
  lastLoginAt?: string
  deletedAt?: string
  passwordResetToken?: string
  passwordResetExpires?: string
  emailVerificationToken?: string
  userTenants?: UserTenant[]
  userAssignments?: UserAssignment[]
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
  status: 'SETUP' | 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED'
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
  trialUntil?: string
  suspendedUntil?: string
  deactivatedAt?: string
  createdAt: string
  updatedAt: string
  userCount?: number
  serviceCount?: number
  storageUsed?: number
  lastActivity?: string
  deletedAt?: string
}

export interface Role {
  id: string
  name: string
  displayName: string
  description?: string
  type: 'SYSTEM' | 'TENANT' | 'CUSTOM'
  level: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'USER' | 'GUEST'
  tenantId?: string
  isSystemRole: boolean
  isActive: boolean
  priority: number
  color: string
  icon?: string
  deletedAt?: string
  createdAt: string
  updatedAt: string
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
  isSystemPermission: boolean
  createdAt: string
  updatedAt: string
}

export interface RolePermission {
  id: string
  roleId: string
  permissionId: string
  permission?: Permission
}

export interface UserAssignment {
  id: string
  userId: string
  tenantId: string
  roleId: string
  status: 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'ARCHIVED'
  isPrimary: boolean
  assignedAt: string
  expiresAt?: string
  user?: User
  role?: Role
  tenant?: Tenant
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

export interface MenuItem {
  id: string
  name: string
  label: string
  icon?: string
  path?: string
  component?: string
  url?: string
  target?: string
  parentId?: string | null
  tenantId?: string | null
  category?: string
  location?: 'HEADER' | 'SIDEBAR' | 'FOOTER' | 'CUSTOM'
  isActive: boolean
  isPublic: boolean
  order: number
  description?: string
  cssClass?: string
  cssStyle?: string
  attributes?: any
  metadata?: any
  createdAt: string
  updatedAt: string
  parent?: MenuItem | null
  children: MenuItem[]
  permissions: MenuItemPermission[]
}

export interface MenuItemPermission {
  id: string
  name: string
  resource: string
  action: string
  scope: string
}