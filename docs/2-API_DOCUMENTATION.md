# API Documentation - Multi-Tenant Platform

## 📋 Table of Contents

1. [Authentication](#authentication)
2. [Admin Management](#admin-management)
3. [User Management](#user-management)
4. [Error Responses](#error-responses)
5. [Authentication Headers](#authentication-headers)

---

## 🔐 Authentication

### POST /api/v1/auth/login
Login user dengan email dan password.

**Request Body:**
```json
{
  "email": "superadmin@system.com",
  "password": "SuperAdmin123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "e4600790-19b4-4601-8b71-d161d6f59e90",
      "email": "superadmin@system.com",
      "name": "Super Administrator",
      "avatarUrl": null,
      "emailVerified": true
    },
    "currentTenant": {
      "id": "ba825c03-ddc5-4e21-94a5-aa92b9dc01a2",
      "name": "System Core",
      "slug": "core",
      "role": "Super Administrator",
      "isPrimary": true
    },
    "tenants": [
      {
        "id": "ba825c03-ddc5-4e21-94a5-aa92b9dc01a2",
        "name": "System Core",
        "slug": "core",
        "role": "Super Administrator",
        "isPrimary": true
      }
    ],
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

**Error Response (401):**
```json
{
  "success": false,
  "message": "Invalid credentials"
}
```

### POST /api/v1/auth/register
Register user baru.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "Password123!",
  "name": "John Doe",
  "phone": "+628123456789"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "user-id-here",
      "email": "user@example.com",
      "name": "John Doe",
      "status": "PENDING",
      "emailVerified": false
    }
  }
}
```

### POST /api/v1/auth/logout
Logout user (token blacklist).

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

### POST /api/v1/auth/refresh
Refresh access token menggunakan refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "new-access-token",
    "refreshToken": "new-refresh-token"
  }
}
```

---

## 👑 Admin Management

### GET /api/v1/admin/users
Get semua users dengan advanced filtering dan pagination.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `page` (number, default: 1) - Halaman saat ini
- `limit` (number, default: 20) - Jumlah data per halaman
- `search` (string) - Search berdasarkan email atau nama
- `status` (string) - Filter berdasarkan status (PENDING, ACTIVE, INACTIVE)
- `emailVerified` (boolean) - Filter berdasarkan verifikasi email
- `dateFrom` (string) - Filter tanggal dari (YYYY-MM-DD)
- `dateTo` (string) - Filter tanggal sampai (YYYY-MM-DD)
- `sortBy` (string) - Sort field (createdAt, updatedAt, email, name, status)
- `sortOrder` (string) - Sort order (asc, desc)

**Example Request:**
```
GET /api/v1/admin/users?page=1&limit=10&search=test&status=ACTIVE&sortBy=createdAt&sortOrder=desc
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "e4600790-19b4-4601-8b71-d161d6f59e90",
        "email": "superadmin@system.com",
        "name": "Super Administrator",
        "status": "ACTIVE",
        "emailVerified": true,
        "createdAt": "2025-10-30T13:00:55.847Z",
        "updatedAt": "2025-10-30T13:49:49.131Z",
        "lastLoginAt": "2025-10-30T13:49:49.130Z",
        "userTenants": [
          {
            "tenant": {
              "id": "ba825c03-ddc5-4e21-94a5-aa92b9dc01a2",
              "name": "System Core",
              "slug": "core"
            },
            "role": {
              "displayName": "Super Administrator",
              "level": "SUPER_ADMIN"
            },
            "status": "ACTIVE"
          }
        ]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 5,
      "totalPages": 1,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```

### GET /api/v1/admin/users/:id
Get detail user berdasarkan ID.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "e4600790-19b4-4601-8b71-d161d6f59e90",
      "email": "superadmin@system.com",
      "name": "Super Administrator",
      "status": "ACTIVE",
      "emailVerified": true,
      "phone": "+628123456789",
      "timezone": "UTC",
      "language": "en",
      "avatarUrl": null,
      "createdAt": "2025-10-30T13:00:55.847Z",
      "updatedAt": "2025-10-30T13:49:49.131Z",
      "lastLoginAt": "2025-10-30T13:49:49.130Z",
      "passwordChangedAt": null,
      "failedLoginAttempts": 0,
      "lockedUntil": null,
      "tokenVersion": 0,
      "userTenants": [
        {
          "tenant": {
            "id": "ba825c03-ddc5-4e21-94a5-aa92b9dc01a2",
            "name": "System Core",
            "slug": "core",
            "type": "CORE",
            "status": "ACTIVE"
          },
          "role": {
            "displayName": "Super Administrator",
            "level": "SUPER_ADMIN",
            "description": "System administrator with full access"
          }
        }
      ],
      "sessions": [
        {
          "id": "session-id",
          "deviceId": "web-browser",
          "userAgent": "Mozilla/5.0...",
          "ipAddress": "192.168.1.1",
          "isActive": true,
          "expiresAt": "2025-10-31T13:49:49.130Z",
          "lastAccessAt": "2025-10-30T13:49:49.130Z",
          "createdAt": "2025-10-30T13:49:49.130Z"
        }
      ]
    }
  }
}
```

### POST /api/v1/admin/users/:userId/activate
Activate user yang statusnya PENDING.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "User activated successfully",
  "data": {
    "user": {
      "id": "0638f582-d8c7-4f5a-aa00-04fe135e8473",
      "email": "test@system.com",
      "name": "Test User",
      "status": "ACTIVE",
      "emailVerified": false,
      "updatedAt": "2025-10-30T13:50:15.634Z"
    }
  }
}
```

### POST /api/v1/admin/users/:userId/deactivate
Deactivate user (tidak bisa deaktivasi diri sendiri).

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "User deactivated successfully",
  "data": {
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "name": "User Name",
      "status": "INACTIVE",
      "updatedAt": "2025-10-30T13:50:15.634Z"
    }
  }
}
```

### GET /api/v1/admin/permissions
Get semua permissions dengan advanced filtering.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `page` (number, default: 1) - Halaman saat ini
- `limit` (number, default: 50) - Jumlah data per halaman
- `search` (string) - Search berdasarkan name, description, resource, action
- `scope` (string) - Filter berdasarkan scope (OWN, TENANT, ALL)
- `category` (string) - Filter berdasarkan category
- `resource` (string) - Filter berdasarkan resource
- `action` (string) - Filter berdasarkan action
- `isSystemPermission` (boolean) - Filter permission sistem
- `sortBy` (string) - Sort field (createdAt, updatedAt, name, resource, action, category, scope)
- `sortOrder` (string) - Sort order (asc, desc)

**Example Request:**
```
GET /api/v1/admin/permissions?page=1&limit=10&scope=ALL&category=System%20Management
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "permissions": [
      {
        "id": "f148e978-4ccd-4153-ac59-b1fa34c3692d",
        "name": "audit:read",
        "resource": "audit",
        "action": "read",
        "scope": "ALL",
        "description": "Read audit logs",
        "category": "System Management",
        "isSystemPermission": true,
        "createdAt": "2025-10-30T13:00:55.927Z",
        "updatedAt": "2025-10-30T13:00:55.927Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 12,
      "totalPages": 2,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### POST /api/v1/admin/permissions
Create permission baru (Super Admin only).

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "name": "custom:action",
  "resource": "custom",
  "action": "action",
  "scope": "TENANT",
  "description": "Custom permission description",
  "category": "Custom Category"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Permission created successfully",
  "data": {
    "permission": {
      "id": "new-permission-id",
      "name": "custom:action",
      "resource": "custom",
      "action": "action",
      "scope": "TENANT",
      "description": "Custom permission description",
      "category": "Custom Category",
      "isSystemPermission": true,
      "createdAt": "2025-10-30T13:50:15.634Z",
      "updatedAt": "2025-10-30T13:50:15.634Z"
    }
  }
}
```

---

## 👤 User Management

### GET /api/v1/users/profile
Get profile user yang sedang login.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "name": "John Doe",
      "status": "ACTIVE",
      "emailVerified": true,
      "phone": "+628123456789",
      "timezone": "UTC",
      "language": "en",
      "avatarUrl": null,
      "createdAt": "2025-10-30T13:00:55.847Z",
      "updatedAt": "2025-10-30T13:49:49.131Z"
    }
  }
}
```

### PUT /api/v1/users/profile
Update profile user.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "name": "Updated Name",
  "phone": "+628123456789",
  "timezone": "Asia/Jakarta",
  "language": "id"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "name": "Updated Name",
      "status": "ACTIVE",
      "phone": "+628123456789",
      "timezone": "Asia/Jakarta",
      "language": "id"
    }
  }
}
```

### POST /api/v1/users/change-password
Ganti password user.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

---

## 🏢 Tenant Management

### GET /api/v1/tenants
Get semua tenant yang bisa diakses user.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "tenants": [
      {
        "id": "ba825c03-ddc5-4e21-94a5-aa92b9dc01a2",
        "name": "System Core",
        "slug": "core",
        "type": "CORE",
        "status": "ACTIVE",
        "role": "Super Administrator",
        "isPrimary": true
      }
    ]
  }
}
```

---

## ❌ Error Responses

### Standard Error Format
```json
{
  "success": false,
  "message": "Error description",
  "error": {
    "code": "ERROR_CODE",
    "details": "Additional error details"
  }
}
```

### Common Error Codes

#### Authentication Errors (401)
```json
{
  "success": false,
  "message": "Invalid or expired token"
}
```

#### Authorization Errors (403)
```json
{
  "success": false,
  "message": "Insufficient permissions to access this resource"
}
```

#### Validation Errors (400)
```json
{
  "success": false,
  "message": "Validation failed",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": {
      "email": "Email is required",
      "password": "Password must be at least 8 characters"
    }
  }
}
```

#### Not Found Errors (404)
```json
{
  "success": false,
  "message": "User not found"
}
```

#### Server Errors (500)
```json
{
  "success": false,
  "message": "Internal server error",
  "error": {
    "code": "INTERNAL_ERROR",
    "details": "Database connection failed"
  }
}
```

---

## 🔑 Authentication Headers

### Bearer Token
Untuk endpoint yang memerlukan authentication, sertakan header:

```
Authorization: Bearer <access_token>
```

### Contoh Penggunaan
```bash
curl -X GET "http://localhost:3000/api/v1/admin/users" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"
```

---

## 📝 Notes

### Super Admin Credentials
- **Email**: `superadmin@system.com`
- **Password**: `SuperAdmin123!`
- **Access**: Cross-tenant dengan ALL scope permissions

### Rate Limiting
- Login attempts: 5 per 15 menit
- Password reset: 3 per jam

### Token Expiration
- Access Token: 15 menit
- Refresh Token: 7 hari

### Pagination
- Default limit: 20 items per page
- Maximum limit: 100 items per page
- Response includes pagination metadata

### Security
- Password hashing dengan bcrypt
- JWT tokens dengan HS256
- Request validation dengan express-validator
- CORS configuration untuk development

---

## 🚀 Quick Start

1. **Login untuk dapatkan token:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@system.com","password":"SuperAdmin123!"}'
```

2. **Gunakan token untuk API calls:**
```bash
curl -X GET "http://localhost:3000/api/v1/admin/users" \
  -H "Authorization: Bearer <token_dari_login>"
```

3. **Filtering dan pagination:**
```bash
curl -X GET "http://localhost:3000/api/v1/admin/users?page=1&limit=10&search=test&status=ACTIVE" \
  -H "Authorization: Bearer <token>"
```