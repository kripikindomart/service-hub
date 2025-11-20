# RBAC Architecture Documentation

## Overview

This document explains the Role-Based Access Control (RBAC) system implemented in the Multi-Tenant Service Hub Platform. The system uses a **Hybrid RBAC approach** that combines Role-Based and Permission-Based access control for maximum flexibility.

## Table of Contents

1. [Core Concepts](#core-concepts)
2. [Architecture Overview](#architecture-overview)
3. [Database Schema](#database-schema)
4. [Role Types & Levels](#role-types--levels)
5. [Permission System](#permission-system)
6. **Hybrid RBAC Model** (👑 **IMPORTANT**)
7. [Implementation Details](#implementation-details)
8. [Use Cases & Examples](#use-cases--examples)
9. [Best Practices](#best-practices)
10. [API Reference](#api-reference)

---

## Core Concepts

### 🎯 What is RBAC?
RBAC (Role-Based Access Control) is an approach to restricting system access to authorized users based on their roles within an organization.

### 🏗️ Our Implementation
We use a **Hybrid RBAC System** that combines:
- **Role Hierarchy**: Structured levels (SUPER_ADMIN → ADMIN → MANAGER → USER → GUEST)
- **Granular Permissions**: Fine-grained resource and action controls
- **Multi-Tenant Support**: Tenant-isolated permissions

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        HYBRID RBAC SYSTEM                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                │
│  User (Authentication)                                           │
│  ↓                                                             │
│  UserAssignment (Many-to-Many)                                  │
│  ↓                                                             │
│  Role (Level + Type + Permissions)                              │
│  ├── level: SUPER_ADMIN | ADMIN | MANAGER | USER | GUEST        │
│  ├── type: SYSTEM | TENANT | CUSTOM                            │
│  ├── permissions: [PERMISSION_1, PERMISSION_2, ...]         │
│  └── inherits: Default permissions by level                    │
│  ↓                                                             │
│  Effective Permissions = Level Permissions + Role Permissions        │
│  ↓                                                             │
│  Resource Access (API Endpoints)                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Role Model
```sql
CREATE TABLE roles (
  id              UUID PRIMARY KEY,
  name            VARCHAR NOT NULL,
  displayName     VARCHAR NOT NULL,
  description     TEXT,
  type            ENUM('SYSTEM', 'TENANT', 'CUSTOM') DEFAULT 'TENANT',
  level           ENUM('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'USER', 'GUEST') DEFAULT 'USER',
  tenantId        UUID NULL,                    -- Multi-tenant
  isSystemRole    BOOLEAN DEFAULT FALSE,
  isDefaultRole   BOOLEAN DEFAULT FALSE,
  isActive        BOOLEAN DEFAULT TRUE,
  deletedAt       TIMESTAMP NULL,                -- Soft delete
  createdBy       UUID NULL,
  updatedBy       UUID NULL,
  createdAt       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE(name, tenantId, deletedAt)
);
```

### Permission Model
```sql
CREATE TABLE permissions (
  id                 UUID PRIMARY KEY,
  name               VARCHAR(255) UNIQUE NOT NULL,
  resource           VARCHAR(255) NOT NULL,     -- users, roles, tenants, menus
  action             VARCHAR(50) NOT NULL,      -- create, read, update, delete
  scope              ENUM('OWN', 'TENANT', 'ALL') DEFAULT 'TENANT',
  description        TEXT,
  category           VARCHAR(100),
  isSystemPermission BOOLEAN DEFAULT FALSE,
  createdAt         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt         TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE(resource, action, scope)
);
```

### Role-Permission Mapping
```sql
CREATE TABLE role_permissions (
  id           UUID PRIMARY KEY,
  roleId       UUID NOT NULL,
  permissionId UUID NOT NULL,
  grantedAt    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  grantedBy    UUID NULL,
  FOREIGN KEY (roleId) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permissionId) REFERENCES permissions(id) ON DELETE CASCADE,
  UNIQUE(roleId, permissionId)
);
```

### User-Role Assignment
```sql
CREATE TABLE user_assignments (
  id                UUID PRIMARY KEY,
  userId            UUID NOT NULL,
  tenantId          UUID NOT NULL,
  roleId            UUID NOT NULL,
  status            ENUM('PENDING', 'ACTIVE', 'SUSPENDED', 'EXPIRED') DEFAULT 'PENDING',
  isPrimary         BOOLEAN DEFAULT FALSE,
  priority          INTEGER DEFAULT 0,
  assignedBy        UUID NULL,
  assignedAt        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expiresAt         TIMESTAMP NULL,
  lastAccessedAt    TIMESTAMP NULL,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (roleId) REFERENCES roles(id) ON DELETE CASCADE
);
```

---

## Role Types & Levels

### 🏷️ Role Types
| Type | Description | Use Case |
|------|-------------|---------|
| **SYSTEM** | Global system roles | Core platform functionality |
| **TENANT** | Tenant-specific roles | Business tenant management |
| **CUSTOM** | User-created roles | Specialized business functions |

### 📊 Role Levels (Hierarchy)
| Level | Priority | Default Access | Typical Users |
|-------|----------|---------------|--------------|
| **SUPER_ADMIN** | 5 | Global system | Platform administrators |
| **ADMIN** | 4 | Tenant management | Tenant administrators |
| **MANAGER** | 3 | Team management | Department managers |
| **USER** | 2 | Standard operations | Regular employees |
| **GUEST** | 1 | Read-only access | External partners |

### 🎨 Visual Hierarchy
```
SUPER_ADMIN 🔴
    ↓
    ADMIN 🟠
    ↓
    MANAGER 🟡
    ↓
    USER 🔵
    ↓
    GUEST ⚪
```

---

## Permission System

### 🔐 Permission Structure
```typescript
interface Permission {
  resource: string    // users, roles, tenants, menus, billing
  action: string      // create, read, update, delete, manage, export
  scope: PermissionScope  // OWN, TENANT, ALL
  description?: string
  category?: string
}

// Examples:
"users:read:TENANT"    // Read all users in tenant
"users:update:OWN"     // Update own profile only
"system:delete:ALL"    // Delete any system resource
```

### 🌍 Permission Scopes
| Scope | Description | Example |
|-------|-------------|---------|
| **OWN** | Personal access only | `profile:update:OWN` |
| **TENANT** | Within tenant only | `users:read:TENANT` |
| **ALL** | Global system access | `system:delete:ALL` |

### 📝 Permission Categories
- **USERS**: User management (create, read, update, delete)
- **ROLES**: Role management (create, read, update, delete)
- **TENANTS**: Tenant management (create, read, update, delete)
- **MENUS**: Menu/Navigation management
- **BILLING**: Billing and subscription management
- **SYSTEM**: System administration (logs, settings, etc.)

---

## 🎯 HYBRID RBAC MODEL (IMPORTANT!)

### **How It Works**

#### **Step 1: User Authentication**
```typescript
// User logs in with JWT token
const user = await authenticateUser(email, password)
```

#### **Step 2: Role Assignment**
```typescript
// User gets assigned to multiple roles
const userRoles = await getUserRoles(userId, tenantId)

// UserAssignment table entries
UserAssignment: {
  userId: "user-123",
  tenantId: "tenant-456",
  roleId: "admin-role",
  status: "ACTIVE"
}
```

#### **Step 3: Permission Calculation**
```typescript
// Get all permissions from user's roles
const getAllUserPermissions = async (userId: string, tenantId: string) => {
  const userRoles = await getUserRoles(userId, tenantId)
  const allPermissions = []

  for (const roleAssignment of userRoles) {
    const role = await getRole(roleAssignment.roleId)
    const rolePermissions = await getRolePermissions(role.id)
    allPermissions.push(...rolePermissions)
  }

  return allPermissions
}
```

#### **Step 4: Permission Check**
```typescript
// Check if user has specific permission
const hasPermission = (userPermissions: string[], requiredPermission: string): boolean => {
  return userPermissions.includes(requiredPermission)
}

// API endpoint protection
app.delete('/api/users/:id', requirePermission('users:delete:TENANT'), async (req, res) => {
  // Only users with permission can access
})
```

### **🔄 Level + Permission Synergy**

#### **Level Provides Foundation**
```typescript
// Each level has default permissions
const DEFAULT_PERMISSIONS = {
  SUPER_ADMIN: [
    'system:*:ALL',
    'users:*:ALL',
    'roles:*:ALL',
    'tenants:*:ALL',
    'billing:*:ALL'
  ],
  ADMIN: [
    'users:read:TENANT',
    'users:create:TENANT',
    'users:update:TENANT',
    'roles:read:TENANT',
    'roles:create:TENANT',
    'tenants:read:TENANT'
  ],
  MANAGER: [
    'users:read:TENANT',
    'profile:update:OWN',
    'team:read:TENANT'
  ],
  USER: [
    'profile:read:OWN',
    'profile:update:OWN',
    'dashboard:read:TENANT'
  ],
  GUEST: [
    'profile:read:OWN'
  ]
}
```

#### **Permissions Provide Customization**
```typescript
// Override level defaults with custom permissions
Role: {
  level: 'MANAGER',
  permissions: [
    'billing:read:TENANT',     // + Custom permission
    'billing:update:TENANT'   // + Custom permission
  ]
}

// Result: Manager + Billing Access
const effectivePermissions = [
  ...MANAGER_DEFAULTS,           // Default manager permissions
  'billing:read:TENANT',          // Custom override
  'billing:update:TENANT'          // Custom override
]
```

---

## Implementation Details

### 🛡️ Permission Checking Middleware

```typescript
// middleware/authorization.middleware.ts
export const requirePermission = (permission: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id
    const tenantId = req.tenant?.id

    const userPermissions = await getUserPermissions(userId, tenantId)
    const hasRequiredPermission = userPermissions.includes(permission)

    if (!hasRequiredPermission) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      })
    }

    next()
  }
}
```

### 🔍 Permission Utilities

```typescript
// lib/rbac-utils.ts
export const hasPermission = (userPermissions: string[], resource: string, action: string, scope: string = 'TENANT', resourceId?: string): boolean => {
  const permissionString = `${resource}:${action}:${scope}`
  const resourceString = resourceId ? `${permissionString}:${resourceId}` : permissionString

  return userPermissions.includes(resourceString) ||
         userPermissions.includes(`${resource}:${action}:ALL`)
}

export const getPermissionLevel = (permission: string): string => {
  // Extract permission level from string
  return permission.split(':')[1]
}
```

### 🎯 Role Management

```typescript
// controllers/role.controller.ts
static async createRole(req: AuthenticatedRequest, res: Response) {
  const { name, displayName, type, level, permissions, tenantId } = req.body

  // Validate role type and level
  const validTypes = ['SYSTEM', 'TENANT', 'CUSTOM']
  const validLevels = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'USER', 'GUEST']

  if (!validTypes.includes(type)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid role type'
    })
  }

  // Create role with permissions
  const role = await prisma.role.create({
    data: {
      name,
      displayName,
      type,
      level,
      tenantId,
      isActive: true,
      createdBy: req.user.id
    }
  })

  // Assign permissions to role if provided
  if (permissions && permissions.length > 0) {
    await assignPermissionsToRole(role.id, permissions)
  }
}
```

---

## Use Cases & Examples

### 🎯 Use Case 1: Standard Manager
```typescript
// Assign role with level only - gets default permissions
const managerAssignment = await createUserAssignment({
  userId: "user-123",
  tenantId: "tenant-456",
  roleId: "manager-role",
  // No custom permissions needed
})

// Result: Manager with default MANAGER permissions
// - users:read:TENANT
// - profile:update:OWN
// - team:read:TENANT
```

### 🎯 Use Case 2: Manager with Billing Access
```typescript
// Create role with custom permissions
const managerPlusRole = await createRole({
  name: "manager_plus",
  displayName: "Manager with Billing Access",
  level: "MANAGER",
  tenantId: "tenant-456",
  permissions: [
    "billing:read:TENANT",
    "billing:update:TENANT"
  ]
})

// Assign enhanced role
const enhancedAssignment = await createUserAssignment({
  userId: "user-123",
  tenantId: "tenant-456",
  roleId: "manager-plus-role"
})

// Result: Manager + Billing Access
// Default MANAGER permissions + Custom Billing permissions
// - users:read:TENANT
// - profile:update:OWN
// - team:read:TENANT
// - billing:read:TENANT ⭐
// - billing:update:TENANT ⭐
```

### 🎯 Use Case 3: Admin with Limited System Access
```typescript
// Create admin role without system permissions
const limitedAdminRole = await createRole({
  name: "limited_admin",
  displayName: "Tenant Administrator",
  level: "ADMIN",
  tenantId: "tenant-456",
  permissions: [
    "users:read:TENANT",
    "roles:read:TENANT",
    "tenants:read:TENANT"
    // NO system permissions
  ]
})

// Result: Admin without system control
// Default ADMIN permissions + Custom Tenant permissions
// - users:read:TENANT
// - roles:read:TENANT
// - tenants:read:TENANT
// ❌ system:*:ALL (not included)
```

### 🎯 Use Case 4: User with Multiple Roles
```typescript
// User with multiple roles
const userRoles = await getUserRoles("user-123", "tenant-456")

// User has: [basic-user, project-manager, read-only-admin]

// Effective permissions = ALL role permissions
const effectivePermissions = [
  // From basic-user (USER level)
  'profile:read:OWN', 'profile:update:OWN', 'dashboard:read:TENANT',

  // From project-manager (MANAGER level)
  'team:read:TENANT', 'project:create:TENANT', 'project:update:TENANT',

  // From read-only-admin (ADMIN level with custom limits)
  'users:read:TENANT', 'roles:read:TENANT', 'reports:read:TENANT'
]
```

### 🎯 Use Case 5: Super Admin with Restrictions
```typescript
// Super Admin role with NO billing access
const restrictedSuperAdmin = await createRole({
  name: "restricted_super_admin",
  displayName: "Super Admin (No Billing)",
  level: "SUPER_ADMIN",
  type: "SYSTEM",
  permissions: [
    "system:*:ALL",
    "users:*:ALL",
    "roles:*:ALL",
    "tenants:*:ALL"
    // Explicitly NO billing permissions
  ]
})

// Result: Super Admin with system control but no billing access
// Default SUPER_ADMIN permissions + Custom Restrictions
// - system:*:ALL ⭐
// - users:*:ALL ⭐
// - roles:*:ALL ⭐
// - tenants:*:ALL ⭐
// ❌ billing:*:ALL (explicitly excluded)
```

---

## Best Practices

### ✅ Do's

1. **Use Levels for Foundation**
   - Start with appropriate level for basic access
   - Let level provide default permissions
   - Don't assign every permission manually

2. **Use Permissions for Customization**
   - Add specific permissions for special access
   - Override level defaults when needed
   - Keep permissions focused and minimal

3. **Follow Principle of Least Privilege**
   - Assign lowest level needed for job function
   - Add specific permissions only when required
   - Review permissions regularly

4. **Use Role Hierarchy Wisely**
   - Parent roles should not be less privileged than children
   - Keep role hierarchy simple and logical
   - Avoid circular dependencies

5. **Document Custom Roles**
   - Document why custom permissions are needed
   - Keep role names descriptive
   - Track role assignments

### ❌ Don'ts

1. **Don't Over-Permission**
   - Don't assign SUPER_ADMIN to regular users
   - Avoid giving ALL permissions unless necessary
   - Keep permissions minimal and focused

2. **Don't Skip Level Checks**
   - Always check role level in addition to permissions
   - Don't rely only on permissions for hierarchy
   - Maintain level-based security boundaries

3. **Don't Mix Concerns**
   - Keep business logic separate from access control
   - Don't use permissions for business rules
   - Maintain clear separation of duties

4. **Don't Ignore Tenant Scope**
   - Always consider tenant context in permissions
   - Use appropriate scopes (OWN/TENANT/ALL)
   - Prevent cross-tenant data leakage

5. **Don't Forget Inheritance**
   - Remember that users get all permissions from all assigned roles
   - Consider conflicts between role permissions
   - Test effective permissions, not just individual roles

---

## API Reference

### Role Management

#### Create Role
```typescript
POST /api/v1/admin/roles
{
  "name": "content_manager",
  "displayName": "Content Manager",
  "description": "Manages content and publications",
  "type": "TENANT",
  "level": "MANAGER",
  "tenantId": "tenant-123",
  "permissions": [
    "content:create:TENANT",
    "content:update:TENANT",
    "content:delete:TENANT"
  ]
}
```

#### Assign Role to User
```typescript
POST /api/v1/admin/user-assignments
{
  "userId": "user-123",
  "tenantId": "tenant-123",
  "roleId": "role-456",
  "status": "ACTIVE"
}
```

#### Check User Permissions
```typescript
GET /api/v1/admin/users/permissions/:userId?tenantId=tenant-123

Response:
{
  "success": true,
  "data": [
    "profile:read:OWN",
    "profile:update:OWN",
    "dashboard:read:TENANT",
    "content:read:TENANT",
    "content:create:TENANT"
  ]
}
```

### Permission Checking

#### Middleware Usage
```typescript
// Require specific permission
router.get('/api/users', requirePermission('users:read:TENANT'), userController.getUsers)

// Require multiple permissions
router.delete('/api/users/:id', [
  requirePermission('users:delete:TENANT'),
  requirePermission('users:read:OWN', { resourceId: 'param.id' })
], userController.deleteUser)
```

#### Manual Permission Check
```typescript
// Check permission in controller
const hasDeletePermission = await hasPermission(
  userId,
  'users:delete:TENANT',
  tenantId
)

if (!hasDeletePermission) {
  return res.status(403).json({
    success: false,
    message: 'Insufficient permissions'
  })
}
```

---

## 🔧 Development Guidelines

### Adding New Permissions

1. **Define Permission Structure**
   ```typescript
   const newPermission = {
     resource: 'invoices',
     action: 'approve',
     scope: 'TENANT',
     description: 'Approve invoice payments'
   }
   ```

2. **Add to Database**
   ```sql
   INSERT INTO permissions (name, resource, action, scope, description)
   VALUES ('invoices:approve:TENANT', 'invoices', 'approve', 'TENANT', 'Approve invoice payments');
   ```

3. **Update Permission Utils**
   ```typescript
   // Add to default permissions if needed
   ADMIN_PERMISSIONS.push('invoices:approve:TENANT')
   ```

### Creating Custom Roles

1. **Determine Required Level**
   - What base permissions does this role need?
   - What's the minimum required level?

2. **Start with Level**
   ```typescript
   const role = await createRole({
     level: 'MANAGER', // Start with manager level
     // ... other properties
   })
   ```

3. **Add Custom Permissions**
   ```typescript
   await assignPermissionsToRole(role.id, [
     'reports:create:TENANT',
     'reports:read:TENANT'
   ])
   ```

4. **Test Role Assignment**
   ```typescript
   const effectivePermissions = await getEffectivePermissions(userId, tenantId)
   // Verify role has expected permissions
   ```

---

## 📚 Migration & Updates

### Adding New Level
1. Update schema.prisma:
   ```prisma
   enum RoleLevel {
     SUPER_ADMIN
     ADMIN
     MANAGER
     USER
     GUEST
     SUPERVISOR  // New level
   }
   ```

2. Update TypeScript types:
   ```typescript
   type RoleLevel = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'USER' | 'GUEST' | 'SUPERVISOR'
   ```

3. Update UI components:
   ```typescript
   <Select>
     <SelectItem value="SUPERVISOR">Supervisor</SelectItem>
   </Select>
   ```

4. Update default permissions:
   ```typescript
   const SUPERVISOR_PERMISSIONS = [
     'team:read:TENANT',
     'team:update:TENANT'
   ]
   ```

### Modifying Existing Roles
1. **Create Migration Script**
2. **Backup Current Roles**
3. **Update Role Properties**
4. **Test User Impact**

---

## 🤝 Support & Troubleshooting

### Common Issues

1. **Permission Not Working**
   - Check if user has active role assignment
   - Verify permission string format (`resource:action:scope`)
   - Confirm tenant context is correct

2. **Level Not Working**
   - Verify role is assigned to user
   - Check role isActive (not deleted)
   - Confirm level hierarchy logic

3. **Multi-Tenant Issues**
   - Verify tenantId in user assignments
   - Check permission scope (OWN/TENANT/ALL)
   - Confirm user belongs to correct tenant

### Debug Tools

1. **Permission Debugging**
   ```typescript
   console.log('User Permissions:', userPermissions)
   console.log('Required Permission:', requiredPermission)
   console.log('Has Permission:', hasPermission(userPermissions, requiredPermission))
   ```

2. **Role Hierarchy Debugging**
   ```typescript
   console.log('User Roles:', userRoles)
   console.log('Role Levels:', userRoles.map(r => r.level))
   console.log('Role Permissions:', allPermissions)
   ```

---

## 📈 Evolution Roadmap

### Current State: Hybrid RBAC ✅
- ✅ Role levels for hierarchy
- ✅ Granular permissions for customization
- ✅ Multi-tenant support
- ✅ Role-permission mapping
- ✅ User role assignments

### Future Enhancements
- 🔄 Permission caching for performance
- 🔄 Role templates for quick setup
- 🔄 Permission groups for easier management
- 🔄 Audit logging for permission changes
- 🔄 Time-based permissions (temporary access)

---

**This documentation will be updated as the RBAC system evolves. For the most current information, always check the latest codebase implementation.**

---

*Last Updated: November 2024*
*Status: Actively Used in Production*