import { User, Tenant, UserAssignment, Role } from '@/types'

// Export types from rbac-utils for convenience
export type { User, Role, UserAssignment } from '@/types'

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
  grantedAt: string
  grantedBy?: string
  permission?: Permission
  role?: Role
}

// Check if user has system admin access
export function hasSystemAccess(user?: User | null, currentTenant?: Tenant | null): boolean {
  if (!user) return false

  // Check if tenant type is CORE
  if (currentTenant?.type === 'CORE') {
    return true
  }

  // Check if user has SYSTEM role with ADMIN level
  const hasSystemRole = user.userAssignments?.some(assignment =>
    assignment.role?.type === 'SYSTEM' &&
    (assignment.role?.level === 'SUPER_ADMIN' || assignment.role?.level === 'ADMIN')
  )

  return hasSystemRole || false
}

// Check if user can access a specific resource
export function canAccessResource(
  user: User | null,
  resource: string,
  action: string,
  currentTenant?: Tenant | null
): boolean {
  if (!user) return false

  // System admin has full access
  if (hasSystemAccess(user, currentTenant)) {
    return true
  }

  // Check user permissions
  const userPermissions = getUserEffectivePermissions(user, currentTenant?.id)

  // Check for exact permission match
  const exactPermission = `${resource}:${action}`
  if (userPermissions.includes(exactPermission)) {
    return true
  }

  // Check for wildcard permissions
  const wildcardPermissions = userPermissions.filter(p =>
    p.includes('*') && matchesWildcard(p, exactPermission)
  )

  if (wildcardPermissions.length > 0) {
    return true
  }

  // Check for global permissions
  if (userPermissions.includes(`${exactPermission}:ALL`)) {
    return true
  }

  // Check for tenant-scoped permissions
  if (currentTenant && userPermissions.includes(`${exactPermission}:TENANT:${currentTenant.id}`)) {
    return true
  }

  return false
}

// Get user effective permissions
export function getUserEffectivePermissions(user?: User | null, tenantId?: string): string[] {
  if (!user) return []

  const permissions = new Set<string>()

  user.userAssignments?.forEach(assignment => {
    if (assignment.status !== 'ACTIVE') return
    if (tenantId && assignment.tenantId !== tenantId) return

    assignment.role?.permissions?.forEach(rolePermission => {
      const permission = rolePermission.permission
      if (!permission) return

      const permissionString = `${permission.resource}:${permission.action}`

      // Add scoped permission
      if (permission.scope && assignment.tenantId) {
        permissions.add(`${permissionString}:${permission.scope}:${assignment.tenantId}`)
      } else {
        permissions.add(permissionString)
      }

      // Add global permission if applicable
      if (permission.scope === 'ALL' || !permission.scope) {
        permissions.add(`${permissionString}:ALL`)
      }
    })
  })

  return Array.from(permissions)
}

// Match permission against wildcard pattern
function matchesWildcard(pattern: string, permission: string): boolean {
  const patternParts = pattern.split(':')
  const permissionParts = permission.split(':')

  if (patternParts.length !== permissionParts.length) {
    return false
  }

  return patternParts.every((part, index) =>
    part === '*' || part === permissionParts[index]
  )
}

// Get role hierarchy level
export function getRoleLevel(role: Role): number {
  const hierarchy = {
    'GUEST': 1,
    'USER': 2,
    'MANAGER': 3,
    'ADMIN': 4,
    'SUPER_ADMIN': 5
  }

  return hierarchy[role.level] || 0
}

// Check if role can manage another role
export function canManageRole(managerRole: Role, targetRole: Role): boolean {
  // System roles can manage all roles in same tenant
  if (managerRole.type === 'SYSTEM') {
    return true
  }

  // Can only manage roles in same tenant
  if (managerRole.tenantId !== targetRole.tenantId) {
    return false
  }

  // Check hierarchy
  const managerLevel = getRoleLevel(managerRole)
  const targetLevel = getRoleLevel(targetRole)

  return managerLevel > targetLevel
}

// Get available roles for assignment
export function getAvailableRolesForAssignment(
  user?: User | null,
  currentTenant?: Tenant | null,
  allRoles: Role[] = []
): Role[] {
  if (!user || !currentTenant) return []

  // System admin can see all roles
  if (hasSystemAccess(user, currentTenant)) {
    return allRoles
  }

  // Filter roles by tenant and type
  return allRoles.filter(role => {
    // System roles only for system admin
    if (role.type === 'SYSTEM') return false

    // Only active roles
    if (!role.isActive) return false

    // Tenant-specific roles for current tenant or global roles
    return !role.tenantId || role.tenantId === currentTenant.id
  })
}

// Check if user can be assigned to role
export function canAssignUserToRole(
  assigningUser: User | null,
  targetUser: User,
  role: Role,
  currentTenant?: Tenant | null
): boolean {
  if (!assigningUser || !currentTenant) return false

  // System admin can assign any role
  if (hasSystemAccess(assigningUser, currentTenant)) {
    return true
  }

  // Cannot assign system roles
  if (role.type === 'SYSTEM') {
    return false
  }

  // Cannot assign role to user with higher role level
  const assignerRole = getAssignerRole(assigningUser, currentTenant.id)
  if (!assignerRole) return false

  if (!canManageRole(assignerRole, role)) {
    return false
  }

  // Check if target user already has higher role in this tenant
  const targetUserRole = getAssignerRole(targetUser, currentTenant.id)
  if (targetUserRole && getRoleLevel(targetUserRole) >= getRoleLevel(assignerRole)) {
    return false
  }

  return true
}

// Get user's primary role in tenant
function getAssignerRole(user: User, tenantId: string): Role | undefined {
  return user.userAssignments
    ?.find(assignment =>
      assignment.tenantId === tenantId &&
      assignment.status === 'ACTIVE'
    )
    ?.role
}

// Format role level for display
export function formatRoleLevel(level: string): string {
  const formatted = {
    'GUEST': 'Guest',
    'USER': 'User',
    'MANAGER': 'Manager',
    'ADMIN': 'Administrator',
    'SUPER_ADMIN': 'Super Administrator'
  }

  return formatted[level as keyof typeof formatted] || level
}

// Format role type for display
export function formatRoleType(type: string): string {
  const formatted = {
    'SYSTEM': 'System',
    'TENANT': 'Tenant',
    'CUSTOM': 'Custom'
  }

  return formatted[type as keyof typeof formatted] || type
}

// Format permission scope for display
export function formatPermissionScope(scope: string): string {
  const formatted = {
    'OWN': 'Own',
    'TENANT': 'Tenant',
    'ALL': 'All'
  }

  return formatted[scope as keyof typeof formatted] || scope
}

// Format assignment status for display
export function formatAssignmentStatus(status: string): string {
  const formatted = {
    'PENDING': 'Pending',
    'ACTIVE': 'Active',
    'INACTIVE': 'Inactive',
    'SUSPENDED': 'Suspended',
    'EXPIRED': 'Expired',
    'ARCHIVED': 'Archived'
  }

  return formatted[status as keyof typeof formatted] || status
}