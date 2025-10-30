# 🚀 Multi-Tenant Platform

Complete multi-tenant platform backend with role-based access control, built with Express.js, TypeScript, and Prisma ORM.

## 📚 **Documentation**

👉 **Lihat folder [`docs/`](./docs/) untuk dokumentasi lengkap**

### 📖 **Panduan Membaca:**

1. **[`docs/README.md`](./docs/README.md)** - 📋 Panduan membaca semua dokumentasi
2. **[`docs/1-README.md`](./docs/1-README.md)** - 📖 Overview & quick start
3. **[`docs/2-API_DOCUMENTATION.md`](./docs/2-API_DOCUMENTATION.md)** - 🔌 API reference lengkap
4. **[`docs/3-PROJECT_STATUS.md`](./docs/3-PROJECT_STATUS.md)** - 📋 Status & handover guide

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MySQL 8.0+
- npm or yarn

### Installation

```bash
# Clone repository
git clone <repository-url>
cd coders

# Masuk ke backend folder
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env dengan database credentials

# Setup database
npx prisma generate
npx prisma db push
npm run db:seed

# Start development server
npm run dev
```

Server akan berjalan di `http://localhost:3000`

## 🔑 Default Admin Access

- **Email**: `superadmin@system.com`
- **Password**: `SuperAdmin123!`
- **Tenant**: System Core

## 🏗️ Tech Stack

- **Backend**: Express.js + TypeScript
- **Database**: MySQL 8.0 + Prisma ORM
- **Authentication**: JWT dengan refresh tokens
- **Security**: Helmet, CORS, bcrypt

## ✅ Features

- **Multi-Tenant Architecture** - Complete data isolation
- **Role-Based Access Control** - SUPER_ADMIN, ADMIN, USER
- **Advanced Admin Panel** - User management, permissions
- **Advanced CRUD** - Filtering, pagination, sorting
- **Security** - Password hashing, validation, rate limiting
- **Production Ready** - Database seeder, error handling

---

## 📂 Project Structure

```
coders/
├── docs/                           # 📚 All documentation
├── backend/                        # 🔧 Backend application
│   ├── src/                        # Source code
│   ├── prisma/                     # Database schema
│   └── package.json                # Dependencies
└── README.md                       # This file
```

---

## 🧪 Quick API Test

```bash
# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@system.com","password":"SuperAdmin123!"}'

# Health check
curl http://localhost:3000/health
```

---

## 📞 Need Help?

👉 **Lihat [`docs/`](./docs/) untuk dokumentasi lengkap**

- **Overview**: [`docs/1-README.md`](./docs/1-README.md)
- **API Reference**: [`docs/2-API_DOCUMENTATION.md`](./docs/2-API_DOCUMENTATION.md)
- **Project Status**: [`docs/3-PROJECT_STATUS.md`](./docs/3-PROJECT_STATUS.md)

**Happy Coding!** 🚀