# Backend - Multi-Tenant Platform

Express.js + TypeScript backend with multi-tenant architecture and role-based access control.

## 📚 Documentation

👉 **See parent [`../docs/`](../docs/) for complete documentation**

### Quick Links:
- **Main Docs**: [`../docs/README.md`](../docs/README.md)
- **API Reference**: [`../docs/2-API_DOCUMENTATION.md`](../docs/2-API_DOCUMENTATION.md)
- **Project Status**: [`../docs/3-PROJECT_STATUS.md`](../docs/3-PROJECT_STATUS.md)

## Features

- **Multi-Tenant Architecture**: Isolated tenant management with configurable access controls
- **Authentication & Authorization**: JWT-based authentication with role-based permissions
- **User Management**: Comprehensive user profiles with tenant associations
- **Tenant Management**: Complete tenant lifecycle management
- **Role-Based Access Control (RBAC)**: Flexible permission system
- **API Security**: Rate limiting, CORS, security headers
- **Database**: MySQL with Prisma ORM for type-safe database access
- **Logging**: Structured logging with Winston
- **Validation**: Request validation with Zod schemas

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MySQL 8.0+
- **ORM**: Prisma
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Zod
- **Logging**: Winston
- **Security**: Helmet, CORS, bcrypt

## Quick Start

### Prerequisites

- Node.js 18+ LTS
- MySQL 8.0+
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp .env.example .env
   # Update .env with your database credentials
   ```

4. **Database setup**
   ```bash
   # Generate Prisma client
   npm run db:generate

   # Run database migrations
   npm run db:migrate
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:3000`

## API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123",
  "name": "John Doe",
  "timezone": "UTC",
  "language": "en"
}
```

#### Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123",
  "tenantSlug": "optional-tenant-slug"
}
```

#### Refresh Token
```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "your-refresh-token"
}
```

#### Logout
```http
POST /api/v1/auth/logout
Content-Type: application/json
Authorization: Bearer <access-token>

{
  "refreshToken": "your-refresh-token"
}
```

### User Endpoints (Authentication Required)

#### Get Profile
```http
GET /api/v1/users/profile
Authorization: Bearer <access-token>
```

#### Update Profile
```http
PUT /api/v1/users/profile
Content-Type: application/json
Authorization: Bearer <access-token>

{
  "name": "Updated Name",
  "phone": "+1234567890",
  "timezone": "America/New_York"
}
```

#### Change Password
```http
PUT /api/v1/users/password
Content-Type: application/json
Authorization: Bearer <access-token>

{
  "currentPassword": "CurrentPass123",
  "newPassword": "NewPass123"
}
```

#### Get User Tenants
```http
GET /api/v1/users/tenants
Authorization: Bearer <access-token>
```

#### Switch Tenant
```http
POST /api/v1/users/switch-tenant
Content-Type: application/json
Authorization: Bearer <access-token>

{
  "tenantId": "tenant-uuid"
}
```

### Tenant Endpoints (Authentication Required)

#### Get User Tenants
```http
GET /api/v1/tenants
Authorization: Bearer <access-token>
```

#### Get Tenant Details
```http
GET /api/v1/tenants/:id
Authorization: Bearer <access-token>
```

#### Create Tenant
```http
POST /api/v1/tenants
Content-Type: application/json
Authorization: Bearer <access-token>

{
  "name": "My Company",
  "slug": "my-company",
  "type": "BUSINESS",
  "tier": "STARTER"
}
```

## Environment Variables

```env
# Database
DATABASE_URL="mysql://root:@localhost:3306/platform_core"

# JWT
JWT_SECRET="your-super-secret-jwt-key"
JWT_REFRESH_SECRET="your-super-secret-refresh-key"
JWT_EXPIRES_IN="1h"
JWT_REFRESH_EXPIRES_IN="7d"

# Server
PORT=3000
NODE_ENV="development"

# CORS
CORS_ORIGIN="http://localhost:3001"

# Redis
REDIS_URL="redis://localhost:6379"

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Encryption
ENCRYPTION_KEY="your-32-character-encryption-key"
```

## Database Schema

The application uses a multi-tenant database architecture with the following main entities:

- **Users**: Core user accounts with authentication
- **Tenants**: Isolated tenant spaces
- **Roles**: Role definitions per tenant
- **UserTenants**: Junction table for user-tenant relationships
- **Sessions**: User session management

For detailed schema information, see `prisma/schema.prisma`.

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm run start` - Start production server
- `npm run db:generate` - Generate Prisma client
- `npm run db:migrate` - Run database migrations
- `npm run db:push` - Push schema to database
- `npm run db:studio` - Open Prisma Studio

## Project Structure

```
src/
├── app.ts                 # Express app configuration
├── server.ts              # Server entry point
├── config/                # Configuration files
├── controllers/           # Route controllers
├── database/              # Database service and connection
├── middleware/            # Express middleware
├── routes/                # API routes
├── utils/                 # Utility functions
└── validators/            # Request validation schemas
```

## Security Features

- **Password Hashing**: Using bcrypt for secure password storage
- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: Prevents API abuse
- **CORS**: Configurable cross-origin resource sharing
- **Security Headers**: Helmet middleware for security headers
- **Input Validation**: Zod schemas for request validation
- **SQL Injection Prevention**: Prisma ORM prevents SQL injection

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License.