# Multi-Tenant Service Management Architecture

## Vision Overview

Sistem ini dirancang sebagai **Core Platform** yang mengelola multiple tenant services dengan kemampuan:

- **Core Tenant**: Pusat manajemen semua layanan
- **Service Registry**: Registrasi internal & external services
- **Dynamic Form Builder**: Auto-generate forms dari service definitions
- **Dynamic Menu System**: Menu otomatis berdasarkan permissions & services
- **Robust Multi-Tenant**: Isolasi data dengan fleksibilitas cross-tenant access

---

## 1. Core Concepts

### 1.1 Tenant Types

```
┌─────────────────────────────────────────────────────────┐
│                    CORE TENANT                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Service Registry & Management                   │   │
│  │  - Register Internal Services                   │   │
│  │  - Register External Services (API Gateway)     │   │
│  │  - Form Builder Integration                    │   │
│  │  - Menu Management                            │   │
│  │  - User Management across all tenants         │   │
│  │  - Role & Permission Management               │   │
│  │  - Service Assignment (Public/Private)        │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                BUSINESS TENANTS                          │
│  ┌─────────────────┐  ┌─────────────────┐               │
│  │ Task Manager    │  │ WhatsApp Gateway│               │
│  │ Tenant          │  │ Tenant          │               │
│  │                 │  │                 │               │
│  │ • Internal API  │  │ • External API   │               │
│  │ • Own Database  │  │ • External DB    │               │
│  │ • Private Menu  │  │ • Public/Private │               │
│  │ • Own Users     │  │ • Own Users      │               │
│  └─────────────────┘  └─────────────────┘               │
└─────────────────────────────────────────────────────────┘
```

### 1.2 User Hierarchy & Access

```
SUPER_ADMIN (Core System)
├── Can access ALL tenants
├── Can register/manage services
├── Can assign services to tenants
└── Global menu management

TENANT_ADMIN (Business Tenant)
├── Can manage own tenant users
├── Can access assigned services
├── Can manage own menus (inherited from services)
└── Limited to tenant scope

USER (Business Tenant)
├── Can access assigned services
├── Limited permissions per role
└── Tenant-scoped access only
```

### 1.3 Service Types

```
INTERNAL SERVICES
├── Hosted in same application
├── Direct database access
├── Shared authentication
└── Example: Task Manager API

EXTERNAL SERVICES
├── Separate applications
├── API Gateway integration
├── Independent authentication
├── Service registry required
└── Example: WhatsApp Gateway API
```

---

## 2. Database Schema Design

### 2.1 Enhanced Tenant Model

```sql
CREATE TABLE tenants (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(255) UNIQUE NOT NULL,
  type ENUM('CORE', 'BUSINESS') NOT NULL DEFAULT 'BUSINESS',
  subscription_tier ENUM('STARTER', 'PROFESSIONAL', 'ENTERPRISE') DEFAULT 'STARTER',
  status ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') DEFAULT 'ACTIVE',
  settings JSON,
  max_users INT DEFAULT 10,
  parent_tenant_id VARCHAR(36), -- For future hierarchy
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_tenant_type (type),
  INDEX idx_tenant_status (status),
  INDEX idx_tenant_domain (domain)
);
```

### 2.2 Service Registry Model

```sql
CREATE TABLE services (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  description TEXT,
  type ENUM('INTERNAL', 'EXTERNAL') NOT NULL,
  category VARCHAR(100),
  status ENUM('ACTIVE', 'INACTIVE', 'MAINTENANCE') DEFAULT 'ACTIVE',
  visibility ENUM('PUBLIC', 'PRIVATE', 'RESTRICTED') DEFAULT 'PRIVATE',

  -- Service Configuration
  base_url VARCHAR(500),
  api_key_required BOOLEAN DEFAULT FALSE,
  auth_type ENUM('NONE', 'API_KEY', 'JWT', 'OAUTH') DEFAULT 'NONE',
  health_check_url VARCHAR(500),

  -- Form Builder Configuration
  form_schema JSON, -- Dynamic form definitions
  menu_schema JSON,  -- Auto-generated menu structure

  -- Service Metadata
  version VARCHAR(50) DEFAULT '1.0.0',
  documentation_url VARCHAR(500),
  contact_email VARCHAR(255),

  -- Registration Info
  registered_by VARCHAR(36), -- User who registered
  registered_tenant_id VARCHAR(36), -- Tenant who owns the service

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (registered_by) REFERENCES users(id),
  FOREIGN KEY (registered_tenant_id) REFERENCES tenants(id),

  INDEX idx_service_type (type),
  INDEX idx_service_status (status),
  INDEX idx_service_visibility (visibility),
  INDEX idx_service_category (category)
);
```

### 2.3 Service Endpoints Model

```sql
CREATE TABLE service_endpoints (
  id VARCHAR(36) PRIMARY KEY,
  service_id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  description TEXT,
  method ENUM('GET', 'POST', 'PUT', 'DELETE', 'PATCH') NOT NULL,
  path VARCHAR(500) NOT NULL,

  -- Form Configuration
  request_schema JSON, -- Request body schema for form generation
  response_schema JSON, -- Response schema documentation

  -- Access Control
  requires_auth BOOLEAN DEFAULT TRUE,
  required_permissions JSON, -- Array of required permissions

  -- Integration Settings
  rate_limit INT DEFAULT 100, -- Requests per minute
  timeout_ms INT DEFAULT 30000,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
  INDEX idx_endpoint_service (service_id),
  INDEX idx_endpoint_method (method),
  UNIQUE KEY unique_service_endpoint (service_id, method, path)
);
```

### 2.4 Tenant Service Assignments

```sql
CREATE TABLE tenant_service_assignments (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(36) NOT NULL,
  service_id VARCHAR(36) NOT NULL,
  status ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') DEFAULT 'ACTIVE',

  -- Assignment Configuration
  custom_settings JSON, -- Tenant-specific service config
  custom_menu_config JSON, -- Custom menu modifications

  -- Access Control
  assigned_by VARCHAR(36), -- Who assigned this service
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by) REFERENCES users(id),

  UNIQUE KEY unique_tenant_service (tenant_id, service_id),
  INDEX idx_assignment_tenant (tenant_id),
  INDEX idx_assignment_service (service_id)
);
```

### 2.5 Enhanced User Model

```sql
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,

  -- Multi-Tenant Support
  home_tenant_id VARCHAR(36) NOT NULL, -- Tenant where user was created
  current_tenant_id VARCHAR(36), -- Currently active tenant context

  -- User Status
  status ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') DEFAULT 'ACTIVE',
  email_verified BOOLEAN DEFAULT FALSE,

  -- Profile & Preferences
  profile JSON,
  preferences JSON,

  -- Security
  last_login_at TIMESTAMP NULL,
  password_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  two_factor_enabled BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (home_tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (current_tenant_id) REFERENCES tenants(id),

  INDEX idx_user_email (email),
  INDEX idx_user_home_tenant (home_tenant_id),
  INDEX idx_user_current_tenant (current_tenant_id),
  INDEX idx_user_status (status)
);
```

### 2.6 User Tenant Relationships

```sql
CREATE TABLE user_tenant_access (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  tenant_id VARCHAR(36) NOT NULL,
  role_id VARCHAR(36) NOT NULL,

  -- Access Configuration
  status ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') DEFAULT 'ACTIVE',
  granted_by VARCHAR(36), -- Who granted access
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL, -- Temporary access

  -- Tenant-Specific Settings
  tenant_preferences JSON,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id),
  FOREIGN KEY (granted_by) REFERENCES users(id),

  UNIQUE KEY unique_user_tenant (user_id, tenant_id),
  INDEX idx_user_access_user (user_id),
  INDEX idx_user_access_tenant (tenant_id),
  INDEX idx_user_access_role (role_id)
);
```

---

## 3. API Architecture

### 3.1 Core Authentication Flow

```typescript
// Login Flow
POST /api/v1/auth/login
{
  "email": "superadmin@core.com",
  "password": "password",
  "tenantSlug": "core" // Optional, defaults to home tenant
}

// Response
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "email": "superadmin@core.com",
      "name": "Super Admin",
      "homeTenantId": "core_tenant_id",
      "currentTenantId": "core_tenant_id",
      "roles": ["SUPER_ADMIN"],
      "permissions": ["*"]
    },
    "tenants": [
      {
        "id": "core_tenant_id",
        "name": "Core Platform",
        "domain": "core",
        "type": "CORE",
        "userRole": "SUPER_ADMIN"
      },
      {
        "id": "task_manager_id",
        "name": "Task Manager",
        "domain": "taskmanager",
        "type": "BUSINESS",
        "userRole": "SUPER_ADMIN"
      }
    ],
    "tokens": {
      "accessToken": "jwt_token",
      "refreshToken": "refresh_token"
    }
  }
}
```

### 3.2 Tenant Switching

```typescript
// Switch Tenant
POST /api/v1/auth/switch-tenant
{
  "tenantId": "task_manager_id"
}

// Response
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "currentTenantId": "task_manager_id",
      "currentTenant": {
        "id": "task_manager_id",
        "name": "Task Manager",
        "domain": "taskmanager"
      },
      "roles": ["SUPER_ADMIN"], // Role in new tenant
      "permissions": ["task:*"], // Permissions in new tenant
      "accessibleServices": [
        {
          "id": "task_service_id",
          "name": "Task Manager",
          "endpoints": ["tasks:*"]
        }
      ]
    }
  }
}
```

### 3.3 Service Registry APIs

```typescript
// Register External Service
POST /api/v1/core/services/register
{
  "name": "whatsapp-gateway",
  "displayName": "WhatsApp Gateway",
  "description": "WhatsApp blast message service",
  "type": "EXTERNAL",
  "baseUrl": "https://api.whatsapp-gateway.com",
  "authType": "API_KEY",
  "formSchema": {
    "fields": [
      {
        "name": "message",
        "type": "textarea",
        "label": "Message",
        "required": true,
        "validation": {
          "maxLength": 1000
        }
      },
      {
        "name": "recipients",
        "type": "array",
        "label": "Phone Numbers",
        "required": true,
        "itemType": "string",
        "validation": {
          "pattern": "^\\+?[0-9]{10,15}$"
        }
      }
    ]
  },
  "menuSchema": {
    "items": [
      {
        "name": "Blast Message",
        "path": "/whatsapp/blast",
        "icon": "send",
        "permission": "whatsapp:blast"
      },
      {
        "name": "Message History",
        "path": "/whatsapp/history",
        "icon": "history",
        "permission": "whatsapp:read"
      }
    ]
  }
}
```

### 3.4 Dynamic Menu Generation

```typescript
// Get User Menus (Dynamic based on current tenant + services)
GET /api/v1/menus/user

// Response
{
  "success": true,
  "data": {
    "menus": [
      {
        "id": "dashboard_menu",
        "name": "Dashboard",
        "path": "/dashboard",
        "icon": "dashboard",
        "category": "MAIN",
        "sortOrder": 1,
        "children": []
      },
      {
        "id": "task_manager_menu",
        "name": "Task Manager",
        "path": "/tasks",
        "icon": "task",
        "category": "SERVICES",
        "sortOrder": 10,
        "children": [
          {
            "name": "All Tasks",
            "path": "/tasks/list",
            "icon": "list"
          },
          {
            "name": "Create Task",
            "path": "/tasks/create",
            "icon": "add"
          }
        ]
      }
    ],
    "permissions": [
      "dashboard:view",
      "task:read",
      "task:create"
    ]
  }
}
```

---

## 4. Frontend Integration

### 4.1 Authentication Context Enhancement

```typescript
interface AuthContextType {
  // User Info
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Tenant Management
  currentTenant: Tenant | null;
  availableTenants: Tenant[];
  switchTenant: (tenantId: string) => Promise<void>;

  // Services
  availableServices: Service[];

  // Dynamic Menu
  menus: MenuItem[];
  permissions: string[];

  // Auth Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

interface User {
  id: string;
  email: string;
  name: string;
  homeTenantId: string;
  currentTenantId: string;
  roles: Role[];
  permissions: string[];
}

interface Tenant {
  id: string;
  name: string;
  domain: string;
  type: "CORE" | "BUSINESS";
  userRole: string;
}
```

### 4.2 Component Architecture

```
src/
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx           // Dynamic menu + tenant switcher
│   │   ├── Header.tsx            // User info + tenant dropdown
│   │   └── TenantSwitcher.tsx    // Modal for tenant selection
│   ├── services/
│   │   ├── ServiceRegistry.tsx   // Core: Manage all services
│   │   ├── ServiceCard.tsx       // Service listing cards
│   │   └── ServiceForm.tsx       // Auto-generated forms
│   ├── forms/
│   │   ├── DynamicForm.tsx       // Render forms from schema
│   │   └── FormBuilder.tsx       // Create/edit form schemas
│   └── menu/
│       ├── MenuManager.tsx       // Drag & drop menu editor
│       └── MenuPreview.tsx       // Live menu preview
├── hooks/
│   ├── useAuth.ts               // Enhanced auth with tenant switching
│   ├── useServices.ts           // Service management
│   ├── useDynamicMenu.ts        // Menu management
│   └── usePermissions.ts        // Permission checking
├── services/
│   ├── api.ts                   // API client with tenant context
│   ├── authService.ts           // Authentication
│   ├── serviceRegistry.ts       // Service registry client
│   └── menuService.ts           // Menu management client
└── stores/
    ├── authStore.ts             // Zustand auth store
    ├── tenantStore.ts           // Tenant management
    └── serviceStore.ts          // Service state
```

---

## 5. Security Model

### 5.1 Multi-Layer Security

```
┌─────────────────────────────────────────┐
│              SECURITY LAYERS             │
├─────────────────────────────────────────┤
│ 1. Network Security                    │
│    - HTTPS/WSS mandatory                │
│    - API rate limiting                  │
│    - CORS configuration                 │
│    - Request size limits                │
├─────────────────────────────────────────┤
│ 2. Authentication                      │
│    - JWT with tenant context            │
│    - Refresh token rotation             │
│    - Multi-tenant session management   │
│    - Device fingerprinting              │
├─────────────────────────────────────────┤
│ 3. Authorization                       │
│    - Role-based access control          │
│    - Resource-level permissions         │
│    - Tenant data isolation             │
│    - Service access control             │
├─────────────────────────────────────────┤
│ 4. Data Security                       │
│    - Tenant data encryption             │
│    - Row-level security                 │
│    - Audit logging                      │
│    - Data backup & recovery             │
├─────────────────────────────────────────┤
│ 5. Service Security                    │
│    - API key management                 │
│    - Service-to-service auth            │
│    - External service validation        │
│    - Webhook signature verification     │
└─────────────────────────────────────────┘
```

### 5.2 Permission System

```typescript
// Permission Format: resource:action:scope
const permissions = {
  // Core System
  "system:admin": "Full system administration",
  "tenant:create": "Create new tenants",
  "service:register": "Register new services",

  // Tenant Management
  "tenant:read": "View tenant information",
  "tenant:update": "Update tenant settings",
  "user:manage": "Manage tenant users",

  // Service Access
  "task:read": "Access task manager",
  "task:create": "Create tasks",
  "whatsapp:blast": "Send WhatsApp messages",
  "whatsapp:read": "View message history",

  // Menu Management
  "menu:read": "View menus",
  "menu:create": "Create menus",
  "menu:update": "Update menus",

  // Wildcard Support
  "task:*": "All task permissions",
  "*:read": "Read access to all resources",
  "*": "Super admin access",
};
```

---

## 6. Implementation Roadmap

### Phase 1: Core Foundation ✅

- [] Basic multi-tenant database schema
- [] Authentication system
- [] Basic menu system
- [] User management

### Phase 2: Service Registry 🚧

- [ ] Service registration API
- [ ] Internal/external service support
- [ ] Form builder integration
- [ ] Dynamic menu generation

### Phase 3: Advanced Features 📋

- [ ] Service assignment system
- [ ] Enhanced tenant switching
- [ ] Permission refinement
- [ ] Audit logging

### Phase 4: UI/UX Polish 📋

- [ ] Drag & drop menu editor
- [ ] Service management dashboard
- [ ] Tenant administration UI
- [ ] Real-time notifications

---

## 7. Technical Specifications

### 7.1 Technology Stack

```
Backend:
- Node.js + Express.js
- Prisma ORM
- MySQL Database
- JWT Authentication
- Redis for caching

Frontend:
- Next.js 16+ with App Router
- TypeScript
- Tailwind CSS + Shadcn/ui
- Zustand for state management
- React Query for API calls

Infrastructure:
- Docker containerization
- Nginx reverse proxy
- PM2 process management
- Log aggregation
```

### 7.2 Performance Considerations

```
Database Optimization:
- Indexed queries for tenant isolation
- Connection pooling
- Read replicas for scaling

API Performance:
- Response caching (Redis)
- Request rate limiting
- Lazy loading for large datasets

Frontend Optimization:
- Code splitting by tenant
- Service worker for offline support
- Dynamic imports for service modules
```

### 7.3 Monitoring & Observability

```
Logging:
- Structured JSON logs
- Tenant context in all logs
- Service call tracking
- Error aggregation

Metrics:
- API response times
- Database query performance
- Service availability
- User activity tracking

Health Checks:
- Database connectivity
- External service health
- Cache status
- Background job status
```

---

## 8. Next Steps

1. **Implement Service Registry API**

   - Create service registration endpoints
   - Build form schema validation
   - Develop menu generation logic

2. **Enhance Authentication**

   - Add tenant context to JWT tokens
   - Implement tenant switching
   - Build permission validation middleware

3. **Create Frontend Components**

   - Build tenant switcher UI
   - Develop service management interface
   - Implement dynamic form renderer

4. **Testing & Security**
   - Write comprehensive test suite
   - Security audit
   - Load testing
   - Documentation

This architecture provides a solid foundation for your multi-tenant service management platform with the flexibility to handle both internal and external services while maintaining proper isolation and security.

---

**Document Status:** REFERENCE ARCHITECTURE
**Created:** 18 Oktober 2025
