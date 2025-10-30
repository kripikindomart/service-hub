# Multi-Tenant Platform Backend

A comprehensive multi-tenant platform backend with role-based access control, built with Express.js, TypeScript, and Prisma ORM.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MySQL 8.0+
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd coders/backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
```bash
cp .env.example .env
# Edit .env with your database credentials
```

4. **Setup database**
```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma db push

# Seed initial data (creates super admin)
npm run db:seed
```

5. **Start development server**
```bash
npm run dev
```

Server will start on `http://localhost:3000`

## 🔑 Default Admin Access

- **Email**: `superadmin@system.com`
- **Password**: `SuperAdmin123!`
- **Tenant**: System Core

## 📚 Documentation

- [**API Documentation**](./API_DOCUMENTATION.md) - Complete API endpoints and payloads
- [**Project Status & Handover**](./PROJECT_STATUS.md) - Development status and technical details

## 🛠️ Tech Stack

- **Backend**: Express.js + TypeScript
- **Database**: MySQL 8.0 + Prisma ORM
- **Authentication**: JWT with refresh tokens
- **Security**: Helmet, CORS, bcrypt
- **Validation**: Express-validator
- **Development**: Nodemon, ts-node

## 🏗️ Architecture

### Multi-Tenant System
- **Core Tenant**: System management with super admin access
- **Business Tenants**: Regular business tenants with data isolation
- **Cross-Tenant Access**: Super admin can access all tenants

### Role-Based Access Control (RBAC)
- **SUPER_ADMIN**: Full system access
- **ADMIN**: Tenant-level management
- **USER**: Basic access to own resources

### Permission System
- **Scopes**: OWN (own data), TENANT (tenant data), ALL (system-wide)
- **Categories**: User Management, Tenant Management, Role Management, System Management
- **Granular Control**: Resource-action based permissions

## 🚀 API Overview

### Authentication
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/logout` - User logout
- `POST /api/v1/auth/refresh` - Token refresh

### Admin Management
- `GET /api/v1/admin/users` - List users with advanced filtering
- `GET /api/v1/admin/users/:id` - Get user details
- `POST /api/v1/admin/users/:id/activate` - Activate user
- `POST /api/v1/admin/users/:id/deactivate` - Deactivate user
- `GET /api/v1/admin/permissions` - List permissions
- `POST /api/v1/admin/permissions` - Create permission

### User Management
- `GET /api/v1/users/profile` - Get user profile
- `PUT /api/v1/users/profile` - Update profile
- `POST /api/v1/users/change-password` - Change password

### System
- `GET /health` - Health check

## 🔧 Features

### ✅ Implemented
- **Authentication**: JWT with refresh tokens
- **Authorization**: Role-based access control
- **Multi-tenancy**: Complete data isolation
- **Admin Panel**: User and permission management
- **Advanced Filtering**: Dynamic filtering, sorting, pagination
- **Security**: Password hashing, request validation
- **Database Seeding**: Production-ready initial data

### 🚧 Future Enhancements
- Bulk action system
- Email verification
- Password reset
- Audit logging
- Real-time notifications

## 📊 Database Schema

### Core Tables
- **Users**: Multi-tenant user management
- **Tenants**: Tenant configuration and isolation
- **Roles**: Role definitions and permissions
- **Permissions**: Granular permission system
- **UserTenants**: User-tenant relationships
- **Sessions**: User session management

## 🛡️ Security Features

- **Password Security**: bcrypt hashing with salt rounds
- **JWT Security**: HMAC-SHA256 signing
- **Request Validation**: Input sanitization and validation
- **Rate Limiting**: Login attempt limiting
- **CORS Configuration**: Secure cross-origin resource sharing
- **Security Headers**: Helmet middleware for security headers

## 🧪 Testing

### API Testing Examples

**Login:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@system.com","password":"SuperAdmin123!"}'
```

**Get Users:**
```bash
curl -X GET "http://localhost:3000/api/v1/admin/users?page=1&limit=10" \
  -H "Authorization: Bearer <access_token>"
```

**Activate User:**
```bash
curl -X POST http://localhost:3000/api/v1/admin/users/<user-id>/activate \
  -H "Authorization: Bearer <access_token>"
```

## 📝 Environment Variables

```env
# Database
DATABASE_URL="mysql://username:password@localhost:3306/platform_core"

# JWT
JWT_SECRET="your-super-secret-jwt-key"
JWT_REFRESH_SECRET="your-refresh-secret"

# Server
NODE_ENV="development"
PORT=3000
CORS_ORIGIN="http://localhost:3001"
```

## 🚀 Deployment

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

### Docker (Optional)
```bash
docker build -t multi-tenant-platform .
docker run -p 3000:3000 multi-tenant-platform
```

## 📝 Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run db:seed` - Seed database with initial data
- `npm run db:reset` - Reset database and reseed
- `npx prisma studio` - Open Prisma Studio
- `npx prisma generate` - Generate Prisma client

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 📞 Support

For support and questions, please refer to the documentation in `API_DOCUMENTATION.md` and `PROJECT_STATUS.md`.

---

**Note**: This is a production-ready backend system with comprehensive multi-tenant architecture, role-based access control, and advanced admin management features.