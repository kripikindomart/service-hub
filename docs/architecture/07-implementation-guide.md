# Implementation Guide - Multi-Tenant Service Management Platform

## Implementation Overview

Guide ini menyediakan langkah-langkah detail untuk implementasi platform multi-tenant dari awal hingga production-ready. Implementation dibagi menjadi beberapa fase dengan timeline yang jelas dan deliverables yang terukur.

## Implementation Roadmap

### Phase 1: Foundation Setup (Weeks 1-2)

#### Week 1: Project Setup & Core Infrastructure

**Day 1-2: Development Environment Setup**
```bash
# 1. Create project structure
mkdir multi-tenant-platform
cd multi-tenant-platform

# 2. Initialize backend project
mkdir backend
cd backend
npm init -y
npm install express typescript @types/node @types/express
npm install -D nodemon ts-node eslint prettier

# 3. Setup TypeScript configuration
npx tsc --init

# 4. Create basic folder structure
mkdir -p src/{common,services,gateway,middleware,types,utils}
mkdir -p src/services/{auth,tenant,service-registry,form-builder,menu}
mkdir -p tests/{unit,integration}

# 5. Initialize frontend project
cd ../
npx create-next-app@latest frontend --typescript --tailwind --eslint --app
cd frontend

# 6. Install frontend dependencies
npm install zustand @tanstack/react-query react-hook-form @hookform/resolvers zod
npm install lucide-react @radix-ui/react-* class-variance-authority clsx
npm install -D @types/node
```

**Day 3-4: Database Setup & Core Models**
```bash
# 1. Setup Prisma
cd backend
npm install prisma @prisma/client
npx prisma init

# 2. Create database schema
cat > prisma/schema.prisma << 'EOF'
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

// Core models
model User {
  id                String   @id @default(uuid())
  email             String   @unique
  passwordHash      String
  name              String
  status            UserStatus @default(ACTIVE)
  emailVerified     Boolean  @default(false)
  twoFactorEnabled  Boolean  @default(false)
  lastLoginAt       DateTime?
  tokenVersion      Int      @default(0)
  homeTenantId      String
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  // Relations
  homeTenant        Tenant   @relation("HomeTenant", fields: [homeTenantId], references: [id])
  userTenants       UserTenant[]
  createdTenants    Tenant[] @relation("TenantCreator")
  createdServices   Service[] @relation("ServiceCreator")
  assignedServices  TenantService[]
  sessions          Session[]

  @@map("users")
}

model Tenant {
  id                String        @id @default(uuid())
  name              String
  slug              String        @unique
  domain            String?       @unique
  type              TenantType    @default(BUSINESS)
  tier              SubscriptionTier @default(STARTER)
  status            TenantStatus  @default(PENDING)
  maxUsers          Int           @default(10)
  maxServices       Int           @default(5)
  databaseName      String        @unique
  primaryColor      String        @default("#3B82F6")
  logoUrl           String?
  customDomain      String?
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt
  createdBy         String?

  // Relations
  users             User[]        @relation("HomeTenant")
  creator           User?         @relation("TenantCreator", fields: [createdBy], references: [id])
  userTenants       UserTenant[]
  services          Service[]
  tenantServices    TenantService[]

  @@map("tenants")
}

// Enums
enum UserStatus {
  ACTIVE
  INACTIVE
  SUSPENDED
}

enum TenantType {
  CORE
  BUSINESS
  TRIAL
}

enum TenantStatus {
  ACTIVE
  INACTIVE
  SUSPENDED
  PENDING
}

enum SubscriptionTier {
  STARTER
  PROFESSIONAL
  ENTERPRISE
  CUSTOM
}

// Add more models as needed...
EOF

# 3. Generate Prisma client
npx prisma generate

# 4. Create database migration
npx prisma migrate dev --name init
```

**Day 5: Basic Express Server Setup**
```typescript
// backend/src/app.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Basic routes
app.get('/api/v1', (req, res) => {
  res.json({ message: 'Multi-Tenant Platform API' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
```

#### Week 2: Authentication System

**Day 1-3: Authentication Service**
```typescript
// backend/src/services/auth/auth.service.ts
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient, User, UserStatus } from '@prisma/client';

export interface LoginCredentials {
  email: string;
  password: string;
  tenantSlug?: string;
}

export interface AuthResponse {
  user: any;
  tenants: any[];
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

export class AuthService {
  constructor(private prisma: PrismaClient) {}

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    // 1. Find user
    const user = await this.prisma.user.findUnique({
      where: { email: credentials.email },
      include: {
        homeTenant: true,
        userTenants: {
          include: {
            tenant: true,
            role: true
          }
        }
      }
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // 2. Check password
    const isValidPassword = await bcrypt.compare(credentials.password, user.passwordHash);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // 3. Check user status
    if (user.status !== UserStatus.ACTIVE) {
      throw new Error('Account is not active');
    }

    // 4. Get tenant access
    const tenants = user.userTenants.map(ut => ({
      id: ut.tenant.id,
      name: ut.tenant.name,
      slug: ut.tenant.slug,
      type: ut.tenant.type,
      userRole: ut.role.name,
      permissions: [] // TODO: Implement permissions
    }));

    // 5. Generate tokens
    const tokens = this.generateTokens(user, tenants[0]);

    // 6. Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        homeTenantId: user.homeTenantId
      },
      tenants,
      tokens
    };
  }

  private generateTokens(user: User, tenant: any): { accessToken: string; refreshToken: string } {
    const payload = {
      userId: user.id,
      email: user.email,
      tenantId: tenant.id,
      homeTenantId: user.homeTenantId,
      tokenVersion: user.tokenVersion
    };

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '15m' });
    const refreshToken = jwt.sign(
      { userId: user.id, tokenVersion: user.tokenVersion },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: '7d' }
    );

    return { accessToken, refreshToken };
  }

  async validateToken(token: string): Promise<any> {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;

      // Verify user still exists and token version matches
      const user = await this.prisma.user.findUnique({
        where: { id: payload.userId }
      });

      if (!user || user.tokenVersion !== payload.tokenVersion) {
        throw new Error('Invalid token');
      }

      return payload;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }
}
```

**Day 4-5: Authentication Routes & Middleware**
```typescript
// backend/src/services/auth/auth.routes.ts
import express from 'express';
import { AuthService } from './auth.service';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = express.Router();
const authService = new AuthService();

// Public routes
router.post('/login', async (req, res, next) => {
  try {
    const result = await authService.login(req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Protected routes
router.use(authMiddleware);

router.post('/logout', async (req, res) => {
  // TODO: Implement token revocation
  res.json({ message: 'Logged out successfully' });
});

router.get('/me', async (req, res) => {
  res.json({ user: req.user });
});

export default router;
```

### Phase 2: Core Features (Weeks 3-4)

#### Week 3: Tenant Management & Database Isolation

**Day 1-3: Tenant Service**
```typescript
// backend/src/services/tenant/tenant.service.ts
import { PrismaClient } from '@prisma/client';
import { createTenantDatabase, initializeTenantSchema } from '../database/tenant-db';

export interface CreateTenantDto {
  name: string;
  slug: string;
  domain?: string;
  type: 'BUSINESS' | 'TRIAL';
  tier: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
  createdBy: string;
}

export class TenantService {
  constructor(private prisma: PrismaClient) {}

  async createTenant(data: CreateTenantDto) {
    // 1. Generate unique database name
    const databaseName = `tenant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 2. Create tenant record
    const tenant = await this.prisma.tenant.create({
      data: {
        ...data,
        databaseName,
        status: 'PENDING'
      }
    });

    try {
      // 3. Create tenant database
      await createTenantDatabase(databaseName);

      // 4. Initialize tenant schema
      await initializeTenantSchema(databaseName);

      // 5. Update tenant status
      const updatedTenant = await this.prisma.tenant.update({
        where: { id: tenant.id },
        data: { status: 'ACTIVE' }
      });

      return updatedTenant;
    } catch (error) {
      // Rollback tenant creation if database setup fails
      await this.prisma.tenant.delete({ where: { id: tenant.id } });
      throw error;
    }
  }

  async getTenantById(id: string) {
    return this.prisma.tenant.findUnique({
      where: { id },
      include: {
        users: {
          include: {
            user: true,
            role: true
          }
        },
        services: true
      }
    });
  }

  async addUserToTenant(tenantId: string, userId: string, roleId: string) {
    return this.prisma.userTenant.create({
      data: {
        userId,
        tenantId,
        roleId,
        assignedBy: userId // TODO: Get from authenticated user
      }
    });
  }
}
```

**Day 4-5: Database Management Utilities**
```typescript
// backend/src/services/database/tenant-db.ts
import mysql from 'mysql2/promise';
import { PrismaClient } from '@prisma/client';

export async function createTenantDatabase(databaseName: string): Promise<void> {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_ROOT_USER,
    password: process.env.DB_ROOT_PASSWORD
  });

  try {
    // Create database
    await connection.execute(`CREATE DATABASE ${databaseName}`);

    // Create tenant user
    const tenantUser = `tenant_${databaseName}`;
    const tenantPassword = generateSecurePassword();

    await connection.execute(`
      CREATE USER '${tenantUser}'@'%' IDENTIFIED BY '${tenantPassword}'
    `);

    await connection.execute(`
      GRANT ALL PRIVILEGES ON ${databaseName}.*
      TO '${tenantUser}'@'%'
    `);

    // Store credentials securely
    await storeTenantCredentials(databaseName, tenantUser, tenantPassword);

  } finally {
    await connection.end();
  }
}

export async function initializeTenantSchema(databaseName: string): Promise<void> {
  const tenantPrisma = new PrismaClient({
    datasources: {
      db: {
        url: `mysql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}/${databaseName}`
      }
    }
  });

  try {
    // Create tenant-specific tables
    await tenantPrisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS tenant_users (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        employee_id VARCHAR(50),
        department VARCHAR(100),
        position VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_department (department)
      )
    `;

    // Add more tenant-specific tables as needed

  } finally {
    await tenantPrisma.$disconnect();
  }
}

function generateSecurePassword(): string {
  const length = 32;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

async function storeTenantCredentials(
  databaseName: string,
  username: string,
  password: string
): Promise<void> {
  // TODO: Store in secure vault (AWS Secrets Manager, etc.)
  console.log(`Storing credentials for ${databaseName}`);
}
```

#### Week 4: Service Registry

**Day 1-3: Service Registration**
```typescript
// backend/src/services/service-registry/service-registry.service.ts
import { PrismaClient } from '@prisma/client';

export interface RegisterServiceDto {
  name: string;
  displayName: string;
  description?: string;
  type: 'INTERNAL' | 'EXTERNAL';
  baseUrl?: string;
  authType: 'NONE' | 'API_KEY' | 'JWT';
  formSchema?: any;
  menuSchema?: any;
  registeredBy: string;
  tenantId: string;
}

export class ServiceRegistryService {
  constructor(private prisma: PrismaClient) {}

  async registerService(data: RegisterServiceDto) {
    // 1. Validate service data
    await this.validateServiceData(data);

    // 2. Check for duplicates
    const existing = await this.prisma.service.findFirst({
      where: { name: data.name }
    });

    if (existing) {
      throw new Error(`Service ${data.name} already exists`);
    }

    // 3. Register service
    const service = await this.prisma.service.create({
      data: {
        ...data,
        status: 'PENDING'
      }
    });

    // 4. Validate external service if applicable
    if (data.type === 'EXTERNAL' && data.baseUrl) {
      await this.validateExternalService(service);
    }

    // 5. Generate endpoints from schema
    if (data.formSchema) {
      await this.generateEndpoints(service.id, data.formSchema);
    }

    // 6. Activate service
    return this.prisma.service.update({
      where: { id: service.id },
      data: { status: 'ACTIVE' }
    });
  }

  async getAvailableServices(tenantId: string) {
    return this.prisma.service.findMany({
      where: {
        OR: [
          { visibility: 'PUBLIC' },
          { tenantId },
          {
            tenantServices: {
              some: { tenantId, status: 'ACTIVE' }
            }
          }
        ],
        status: 'ACTIVE'
      },
      include: {
        endpoints: true
      }
    });
  }

  async assignServiceToTenant(tenantId: string, serviceId: string, settings?: any) {
    return this.prisma.tenantService.create({
      data: {
        tenantId,
        serviceId,
        customSettings: settings,
        assignedBy: tenantId // TODO: Get from authenticated user
      }
    });
  }

  private async validateServiceData(data: RegisterServiceDto): Promise<void> {
    if (!data.name || !data.displayName) {
      throw new Error('Service name and display name are required');
    }

    if (data.type === 'EXTERNAL' && !data.baseUrl) {
      throw new Error('Base URL is required for external services');
    }
  }

  private async validateExternalService(service: any): Promise<void> {
    try {
      const response = await fetch(service.baseUrl, {
        method: 'GET',
        timeout: 5000
      });

      if (!response.ok) {
        throw new Error(`Service health check failed: ${response.status}`);
      }
    } catch (error) {
      throw new Error(`Failed to connect to external service: ${error.message}`);
    }
  }

  private async generateEndpoints(serviceId: string, formSchema: any): Promise<void> {
    // TODO: Generate service endpoints from form schema
    console.log(`Generating endpoints for service ${serviceId}`);
  }
}
```

**Day 4-5: Service Registry API**
```typescript
// backend/src/services/service-registry/service-registry.routes.ts
import express from 'express';
import { ServiceRegistryService } from './service-registry.service';
import { authMiddleware, requirePermission } from '../../middleware/auth.middleware';

const router = express.Router();
const serviceRegistry = new ServiceRegistryService();

// Public routes (for service discovery)
router.get('/services', async (req, res, next) => {
  try {
    const tenantId = req.user?.tenantId;
    const services = await serviceRegistry.getAvailableServices(tenantId);
    res.json(services);
  } catch (error) {
    next(error);
  }
});

// Protected routes
router.use(authMiddleware);

// Register new service (requires admin permission)
router.post('/services', requirePermission('service:register'), async (req, res, next) => {
  try {
    const service = await serviceRegistry.registerService({
      ...req.body,
      registeredBy: req.user.userId,
      tenantId: req.user.tenantId
    });
    res.status(201).json(service);
  } catch (error) {
    next(error);
  }
});

// Assign service to tenant
router.post('/services/:serviceId/assign', requirePermission('service:assign'), async (req, res, next) => {
  try {
    const assignment = await serviceRegistry.assignServiceToTenant(
      req.user.tenantId,
      req.params.serviceId,
      req.body.settings
    );
    res.status(201).json(assignment);
  } catch (error) {
    next(error);
  }
});

export default router;
```

### Phase 3: Frontend Development (Weeks 5-6)

#### Week 5: Authentication & Tenant Management

**Day 1-3: Authentication Setup**
```typescript
// frontend/src/stores/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  name: string;
  homeTenantId: string;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
  type: string;
  userRole: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  currentTenant: Tenant | null;
  availableTenants: Tenant[];
  accessToken: string | null;
  isLoading: boolean;

  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  switchTenant: (tenantId: string) => Promise<void>;
  refreshToken: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      currentTenant: null,
      availableTenants: [],
      accessToken: null,
      isLoading: false,

      // Login action
      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true });

        try {
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials)
          });

          if (!response.ok) {
            throw new Error('Login failed');
          }

          const data = await response.json();
          const { user, tenants, tokens } = data;

          const primaryTenant = tenants.find((t: Tenant) => t.type === 'CORE') || tenants[0];

          set({
            user,
            isAuthenticated: true,
            currentTenant: primaryTenant,
            availableTenants: tenants,
            accessToken: tokens.accessToken,
            isLoading: false
          });

          // Store refresh token securely
          if (typeof window !== 'undefined') {
            localStorage.setItem('refreshToken', tokens.refreshToken);
          }

        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      // Logout action
      logout: async () => {
        try {
          await fetch('/api/auth/logout', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${get().accessToken}`
            }
          });
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          // Clear state
          set({
            user: null,
            isAuthenticated: false,
            currentTenant: null,
            availableTenants: [],
            accessToken: null,
            isLoading: false
          });

          // Clear refresh token
          if (typeof window !== 'undefined') {
            localStorage.removeItem('refreshToken');
          }
        }
      },

      // Switch tenant action
      switchTenant: async (tenantId: string) => {
        const { availableTenants } = get();
        const newTenant = availableTenants.find(t => t.id === tenantId);

        if (!newTenant) {
          throw new Error('Tenant not found');
        }

        set({
          currentTenant: newTenant
        });

        // TODO: Call API to switch tenant context
      },

      // Refresh token action
      refreshToken: async () => {
        const refreshToken = typeof window !== 'undefined'
          ? localStorage.getItem('refreshToken')
          : null;

        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        try {
          const response = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken })
          });

          if (!response.ok) {
            throw new Error('Token refresh failed');
          }

          const { accessToken } = await response.json();
          set({ accessToken });

        } catch (error) {
          // Refresh failed, logout user
          get().logout();
          throw error;
        }
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        currentTenant: state.currentTenant,
        availableTenants: state.availableTenants,
        accessToken: state.accessToken
      })
    }
  )
);
```

**Day 4-5: Login & Dashboard Components**
```typescript
// frontend/src/components/auth/LoginForm.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';

interface LoginCredentials {
  email: string;
  password: string;
  tenantSlug?: string;
}

export function LoginForm() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const [credentials, setCredentials] = useState<LoginCredentials>({
    email: '',
    password: '',
    tenantSlug: ''
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await login(credentials);
      router.push('/dashboard');
    } catch (error) {
      setError('Invalid credentials');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            type="email"
            id="email"
            value={credentials.email}
            onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            type="password"
            id="password"
            value={credentials.password}
            onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label htmlFor="tenantSlug" className="block text-sm font-medium text-gray-700">
            Tenant (Optional)
          </label>
          <input
            type="text"
            id="tenantSlug"
            value={credentials.tenantSlug}
            onChange={(e) => setCredentials({ ...credentials, tenantSlug: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="your-tenant"
          />
        </div>

        {error && (
          <div className="text-red-600 text-sm">{error}</div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {isLoading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
```

#### Week 6: Dashboard & Navigation

**Day 1-3: Dashboard Layout**
```typescript
// frontend/src/app/(dashboard)/layout.tsx
'use client';

import { Inter } from 'next/font/google';
import { useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { useAuthStore } from '@/stores/authStore';
import { useTenantStore } from '@/stores/tenantStore';

const inter = Inter({ subsets: ['latin'] });

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated } = useAuthStore();
  const { loadTenant } = useTenantStore();

  useEffect(() => {
    if (isAuthenticated && user?.homeTenantId) {
      loadTenant(user.homeTenantId);
    }
  }, [isAuthenticated, user, loadTenant]);

  if (!isAuthenticated) {
    return null; // Will be redirected by middleware
  }

  return (
    <div className={`min-h-screen bg-gray-50 ${inter.className}`}>
      {/* Header */}
      <Header />

      <div className="flex">
        {/* Sidebar */}
        <Sidebar />

        {/* Main content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

**Day 4-5: Sidebar Navigation**
```typescript
// frontend/src/components/layout/Sidebar.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import {
  HomeIcon,
  UsersIcon,
  CogIcon,
  BuildingOfficeIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

interface MenuItem {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
  current: boolean;
}

export function Sidebar() {
  const pathname = usePathname();
  const { currentTenant, user } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigation: MenuItem[] = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: HomeIcon,
      current: pathname === '/dashboard'
    },
    {
      name: 'Services',
      href: '/dashboard/services',
      icon: CogIcon,
      current: pathname.startsWith('/dashboard/services')
    },
    {
      name: 'Users',
      href: '/dashboard/users',
      icon: UsersIcon,
      current: pathname.startsWith('/dashboard/users')
    },
    {
      name: 'Analytics',
      href: '/dashboard/analytics',
      icon: ChartBarIcon,
      current: pathname.startsWith('/dashboard/analytics')
    },
    {
      name: 'Settings',
      href: '/dashboard/settings',
      icon: CogIcon,
      current: pathname.startsWith('/dashboard/settings')
    }
  ];

  // Filter menu items based on user role
  const filteredNavigation = navigation.filter(item => {
    if (item.name === 'Users' && user?.role !== 'ADMIN') {
      return false;
    }
    return true;
  });

  return (
    <div className="hidden md:flex md:w-64 md:flex-col">
      {/* Sidebar component */}
      <div className="flex flex-col flex-grow pt-5 bg-white border-r border-gray-200 overflow-y-auto">
        {/* Tenant info */}
        <div className="flex items-center flex-shrink-0 px-4">
          <BuildingOfficeIcon className="h-8 w-8 text-blue-600" />
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-900">{currentTenant?.name}</p>
            <p className="text-xs text-gray-500">{user?.role}</p>
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-8 flex-1 flex flex-col">
          <nav className="flex-1 px-2 pb-4 space-y-1">
            {filteredNavigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  group flex items-center px-2 py-2 text-sm font-medium rounded-md
                  ${item.current
                    ? 'bg-blue-100 text-blue-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
              >
                <item.icon
                  className={`
                    mr-3 h-5 w-5 flex-shrink-0
                    ${item.current
                      ? 'text-blue-500'
                      : 'text-gray-400 group-hover:text-gray-500'
                    }
                  `}
                />
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}
```

### Phase 4: Advanced Features (Weeks 7-8)

#### Week 7: Dynamic Forms & UI Components

**Day 1-3: Dynamic Form Component**
```typescript
// frontend/src/components/forms/DynamicForm.tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

interface FormField {
  name: string;
  type: 'text' | 'email' | 'number' | 'select' | 'textarea';
  label: string;
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  validation?: z.ZodSchema;
}

interface FormSchema {
  id: string;
  name: string;
  fields: FormField[];
  submitEndpoint: string;
  submitMethod: 'POST' | 'PUT';
}

interface DynamicFormProps {
  schema: FormSchema;
  onSubmit?: (data: any) => void;
}

export function DynamicForm({ schema, onSubmit }: DynamicFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Build zod schema from form fields
  const buildZodSchema = () => {
    const schemaFields: Record<string, z.ZodSchema> = {};

    schema.fields.forEach((field) => {
      let fieldSchema: z.ZodSchema = z.string();

      if (field.type === 'email') {
        fieldSchema = z.string().email();
      } else if (field.type === 'number') {
        fieldSchema = z.number();
      }

      if (field.validation) {
        fieldSchema = field.validation;
      }

      if (field.required) {
        schemaFields[field.name] = fieldSchema;
      } else {
        schemaFields[field.name] = fieldSchema.optional();
      }
    });

    return z.object(schemaFields);
  };

  const formSchema = buildZodSchema();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema)
  });

  const handleSubmit = async (data: any) => {
    setIsSubmitting(true);
    setSubmitError('');

    try {
      const response = await fetch(schema.submitEndpoint, {
        method: schema.submitMethod,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error('Submission failed');
      }

      const result = await response.json();
      onSubmit?.(result);
      form.reset();

    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (field: FormField) => {
    const { errors } = form.formState;
    const fieldError = errors[field.name];

    switch (field.type) {
      case 'select':
        return (
          <select
            {...form.register(field.name)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">{field.placeholder}</option>
            {field.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'textarea':
        return (
          <textarea
            {...form.register(field.name)}
            rows={3}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder={field.placeholder}
          />
        );

      default:
        return (
          <input
            type={field.type}
            {...form.register(field.name)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder={field.placeholder}
          />
        );
    }
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">{schema.name}</h3>

      {schema.fields.map((field) => (
        <div key={field.name}>
          <label htmlFor={field.name} className="block text-sm font-medium text-gray-700">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>

          {renderField(field)}

          {fieldError && (
            <p className="mt-1 text-sm text-red-600">
              {fieldError.message}
            </p>
          )}
        </div>
      ))}

      {submitError && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{submitError}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
      >
        {isSubmitting ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  );
}
```

**Day 4-5: Service Cards & Dashboard**
```typescript
// frontend/src/components/services/ServiceCard.tsx
'use client';

import Link from 'next/link';
import { Service } from '@/types/service';

interface ServiceCardProps {
  service: Service;
  onAccess?: (service: Service) => void;
}

export function ServiceCard({ service, onAccess }: ServiceCardProps) {
  const handleAccessClick = () => {
    onAccess?.(service);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-medium text-gray-900">{service.displayName}</h3>
          <p className="mt-1 text-sm text-gray-500">{service.description}</p>

          <div className="mt-4 flex items-center space-x-4">
            <span className={`
              inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
              ${service.type === 'INTERNAL'
                ? 'bg-green-100 text-green-800'
                : 'bg-blue-100 text-blue-800'
              }
            `}>
              {service.type}
            </span>

            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              {service.category}
            </span>
          </div>
        </div>

        <div className="ml-4 flex-shrink-0">
          {service.icon && (
            <div className="h-8 w-8 rounded-md bg-blue-100 flex items-center justify-center">
              <span className="text-blue-600 font-semibold">
                {service.icon}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6">
        <button
          onClick={handleAccessClick}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Access Service
        </button>
      </div>
    </div>
  );
}
```

### Phase 5: Testing & Quality Assurance (Weeks 9-10)

#### Week 9: Unit & Integration Testing

**Day 1-3: Backend Unit Tests**
```typescript
// backend/tests/unit/services/auth.service.test.ts
import { AuthService } from '../../../src/services/auth/auth.service';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

jest.mock('@prisma/client');
jest.mock('bcryptjs');

describe('AuthService', () => {
  let authService: AuthService;
  let mockPrisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    mockPrisma = new PrismaClient() as jest.Mocked<PrismaClient>;
    authService = new AuthService(mockPrisma);
  });

  describe('login', () => {
    it('should return tokens for valid credentials', async () => {
      // Arrange
      const credentials = {
        email: 'test@example.com',
        password: 'password123'
      };

      const mockUser = {
        id: 'user1',
        email: 'test@example.com',
        passwordHash: 'hashedPassword',
        status: 'ACTIVE',
        tokenVersion: 0,
        homeTenantId: 'tenant1',
        homeTenant: {
          id: 'tenant1',
          name: 'Test Tenant'
        },
        userTenants: [{
          tenant: {
            id: 'tenant1',
            name: 'Test Tenant',
            slug: 'test'
          },
          role: {
            name: 'USER'
          }
        }]
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Act
      const result = await authService.login(credentials);

      // Assert
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tenants');
      expect(result).toHaveProperty('tokens');
      expect(result.user.email).toBe('test@example.com');
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
    });

    it('should throw error for invalid credentials', async () => {
      // Arrange
      const credentials = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(authService.login(credentials)).rejects.toThrow('Invalid credentials');
    });

    it('should throw error for inactive user', async () => {
      // Arrange
      const credentials = {
        email: 'test@example.com',
        password: 'password123'
      };

      const mockUser = {
        id: 'user1',
        email: 'test@example.com',
        passwordHash: 'hashedPassword',
        status: 'INACTIVE'
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Act & Assert
      await expect(authService.login(credentials)).rejects.toThrow('Account is not active');
    });
  });
});
```

**Day 4-5: Frontend Component Tests**
```typescript
// frontend/tests/components/LoginForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginForm } from '@/components/auth/LoginForm';
import { useAuthStore } from '@/stores/authStore';

// Mock the auth store
jest.mock('@/stores/authStore');
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn()
  })
}));

const mockLogin = jest.fn();
const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;

describe('LoginForm', () => {
  beforeEach(() => {
    mockUseAuthStore.mockReturnValue({
      login: mockLogin,
      isLoading: false
    } as any);
  });

  it('renders login form fields', () => {
    render(<LoginForm />);

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Tenant (Optional)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('calls login with form data when submitted', async () => {
    render(<LoginForm />);

    // Fill form
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'test@example.com' }
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password123' }
    });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        tenantSlug: ''
      });
    });
  });

  it('displays error message on login failure', async () => {
    mockLogin.mockRejectedValue(new Error('Invalid credentials'));

    render(<LoginForm />);

    // Fill and submit form
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'test@example.com' }
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'wrongpassword' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });

  it('disables submit button while loading', () => {
    mockUseAuthStore.mockReturnValue({
      login: mockLogin,
      isLoading: true
    } as any);

    render(<LoginForm />);

    const submitButton = screen.getByRole('button', { name: 'Signing in...' });
    expect(submitButton).toBeDisabled();
  });
});
```

#### Week 10: E2E Testing & Performance

**Day 1-3: Playwright E2E Tests**
```typescript
// frontend/tests/e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should login with valid credentials', async ({ page }) => {
    // Fill login form
    await page.fill('[data-testid="email-input"]', 'admin@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');

    // Submit form
    await page.click('[data-testid="login-button"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('should show error for invalid credentials', async ({ page }) => {
    // Fill login form with invalid credentials
    await page.fill('[data-testid="email-input"]', 'invalid@example.com');
    await page.fill('[data-testid="password-input"]', 'wrongpassword');

    // Submit form
    await page.click('[data-testid="login-button"]');

    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid credentials');
    await expect(page).toHaveURL('/login');
  });

  test('should allow tenant switching', async ({ page }) => {
    // Login first
    await page.fill('[data-testid="email-input"]', 'user@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');

    // Wait for dashboard
    await expect(page).toHaveURL('/dashboard');

    // Open tenant switcher
    await page.click('[data-testid="tenant-switcher"]');

    // Select different tenant
    await page.click('[data-testid="tenant-item"]:has-text("Second Tenant")');

    // Verify tenant switched
    await expect(page.locator('[data-testid="current-tenant"]')).toContainText('Second Tenant');
  });
});

test.describe('Service Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'admin@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should display available services', async ({ page }) => {
    // Navigate to services page
    await page.click('[data-testid="services-nav"]');
    await expect(page).toHaveURL('/dashboard/services');

    // Should display service cards
    await expect(page.locator('[data-testid="service-card"]')).toHaveCount.greaterThan(0);
  });

  test('should access service details', async ({ page }) => {
    // Navigate to services page
    await page.click('[data-testid="services-nav"]');

    // Click on first service
    await page.click('[data-testid="service-card"]:first-child [data-testid="access-button"]');

    // Should open service interface
    await expect(page.locator('[data-testid="service-interface"]')).toBeVisible();
  });
});
```

**Day 4-5: Performance Testing & Optimization**
```typescript
// backend/tests/performance/load.test.ts
import { load } from 'cheerio';
import axios from 'axios';

describe('Load Testing', () => {
  const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

  test('should handle concurrent login requests', async () => {
    const concurrentRequests = 50;
    const requests = [];

    for (let i = 0; i < concurrentRequests; i++) {
      requests.push(
        axios.post(`${BASE_URL}/api/auth/login`, {
          email: `user${i}@example.com`,
          password: 'password123'
        }).catch(error => ({ error: true, status: error.response?.status }))
      );
    }

    const results = await Promise.all(requests);
    const successfulRequests = results.filter(result => !result.error).length;

    // Should handle at least 80% of concurrent requests
    expect(successfulRequests).toBeGreaterThan(concurrentRequests * 0.8);
  });

  test('should respond within acceptable time limits', async () => {
    const startTime = Date.now();

    await axios.get(`${BASE_URL}/api/v1/services`);

    const responseTime = Date.now() - startTime;

    // Should respond within 200ms
    expect(responseTime).toBeLessThan(200);
  });

  test('should maintain performance under load', async () => {
    const duration = 30000; // 30 seconds
    const startTime = Date.now();
    let requestCount = 0;
    let errors = 0;

    while (Date.now() - startTime < duration) {
      try {
        await axios.get(`${BASE_URL}/api/v1/services`);
        requestCount++;
      } catch (error) {
        errors++;
      }

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    const errorRate = errors / (requestCount + errors);

    // Error rate should be less than 5%
    expect(errorRate).toBeLessThan(0.05);
    expect(requestCount).toBeGreaterThan(100);
  });
});
```

## Deployment & Production

### Production Deployment Checklist

#### Pre-Deployment Checklist
- [ ] All tests passing (unit, integration, E2E)
- [ ] Security audit completed
- [ ] Performance benchmarks met
- [ ] Database migrations tested
- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] Monitoring and alerting configured
- [ ] Backup procedures tested
- [ ] Documentation updated

#### Deployment Script
```bash
#!/bin/bash
# scripts/deploy-production.sh

set -e

echo "🚀 Starting production deployment..."

# Variables
ENVIRONMENT="production"
NAMESPACE="platform-core"
CHART_PATH="./helm/platform"
VALUES_PATH="./helm/values-prod.yaml"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
    exit 1
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

# Pre-deployment checks
run_pre_deployment_checks() {
    log "Running pre-deployment checks..."

    # Check if all required files exist
    if [[ ! -f "$CHART_PATH/Chart.yaml" ]]; then
        error "Helm chart not found"
    fi

    if [[ ! -f "$VALUES_PATH" ]]; then
        error "Values file not found"
    fi

    # Check if kubectl is configured
    if ! kubectl cluster-info &> /dev/null; then
        error "Cannot connect to Kubernetes cluster"
    fi

    # Check if helm is installed
    if ! command -v helm &> /dev/null; then
        error "helm is not installed"
    fi

    log "Pre-deployment checks passed"
}

# Backup current deployment
backup_current_deployment() {
    log "Creating backup of current deployment..."

    BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"

    # Backup current Helm values
    helm get values platform -n $NAMESPACE > "$BACKUP_DIR/current-values.yaml"

    # Backup current resources
    kubectl get all -n $NAMESPACE -o yaml > "$BACKUP_DIR/current-resources.yaml"

    log "Backup created at $BACKUP_DIR"
}

# Run database migrations
run_database_migrations() {
    log "Running database migrations..."

    # Run Prisma migrations
    cd backend
    npx prisma migrate deploy
    cd ..

    log "Database migrations completed"
}

# Deploy application
deploy_application() {
    log "Deploying application to production..."

    # Add Helm repositories
    helm repo add bitnami https://charts.bitnami.com/bitnami
    helm repo update

    # Deploy with Helm
    helm upgrade --install platform $CHART_PATH \
        --namespace $NAMESPACE \
        --values $VALUES_PATH \
        --timeout 15m \
        --wait \
        --atomic

    if [[ $? -eq 0 ]]; then
        log "Deployment completed successfully"
    else
        error "Deployment failed"
    fi
}

# Post-deployment verification
run_post_deployment_verification() {
    log "Running post-deployment verification..."

    # Wait for pods to be ready
    kubectl wait --for=condition=ready pod -l app=api-gateway -n $NAMESPACE --timeout=600s
    kubectl wait --for=condition=ready pod -l app=frontend -n $NAMESPACE --timeout=600s

    # Get application URL
    INGRESS_URL=$(kubectl get ingress -n $NAMESPACE -o jsonpath='{.items[0].spec.rules[0].host}')

    # Health check
    for i in {1..10}; do
        if curl -f -s "https://$INGRESS_URL/health" > /dev/null; then
            log "Health check passed"
            break
        else
            warn "Health check failed, retrying... ($i/10)"
            sleep 10
        fi

        if [[ $i -eq 10 ]]; then
            error "Health check failed after 10 attempts"
        fi
    done

    log "Post-deployment verification completed"
}

# Run smoke tests
run_smoke_tests() {
    log "Running smoke tests..."

    cd frontend
    npm run test:smoke -- --env=production
    cd ..

    if [[ $? -eq 0 ]]; then
        log "Smoke tests passed"
    else
        error "Smoke tests failed"
    fi
}

# Rollback function
rollback_deployment() {
    warn "Rolling back deployment..."

    # Rollback to previous release
    helm rollback platform -n $NAMESPACE

    # Restore from backup
    LATEST_BACKUP=$(ls -t backups/ | head -n 1)
    if [[ -n "$LATEST_BACKUP" ]]; then
        warn "Restoring from backup: $LATEST_BACKUP"
        # Implement restoration logic if needed
    fi

    log "Rollback completed"
}

# Main deployment flow
main() {
    log "Starting production deployment..."

    # Trap for cleanup on exit
    trap 'error "Deployment interrupted"' INT TERM

    # Run deployment steps
    run_pre_deployment_checks
    backup_current_deployment
    run_database_migrations

    if deploy_application; then
        run_post_deployment_verification
        run_smoke_tests
        log "🎉 Production deployment completed successfully!"
    else
        rollback_deployment
        error "Production deployment failed, rollback completed"
    fi
}

# Execute main function
main "$@"
```

## Monitoring & Maintenance

### Production Monitoring Setup

#### Prometheus Alerts
```yaml
# k8s/monitoring/prometheus-alerts.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-alerts
  namespace: platform-monitoring
data:
  alerts.yml: |
    groups:
    - name: platform-alerts
      rules:
      # High error rate alert
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: High error rate detected
          description: "Error rate is {{ $value }} errors per second"

      # High memory usage alert
      - alert: HighMemoryUsage
        expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: High memory usage
          description: "Memory usage is above 90%"

      # Database connection alert
      - alert: DatabaseConnectionHigh
        expr: mysql_global_status_threads_connected / mysql_global_variables_max_connections > 0.8
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: High database connections
          description: "Database connection usage is above 80%"

      # Service down alert
      - alert: ServiceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: Service is down
          description: "{{ $labels.instance }} service is down"
```

#### Grafana Dashboard
```json
{
  "dashboard": {
    "title": "Multi-Tenant Platform Overview",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{ method }} {{ status }}"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "singlestat",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m])",
            "legendFormat": "Error Rate"
          }
        ]
      },
      {
        "title": "Active Users",
        "type": "singlestat",
        "targets": [
          {
            "expr": "active_users_total",
            "legendFormat": "Active Users"
          }
        ]
      },
      {
        "title": "Database Connections",
        "type": "graph",
        "targets": [
          {
            "expr": "mysql_global_status_threads_connected",
            "legendFormat": "Active Connections"
          }
        ]
      },
      {
        "title": "Memory Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "process_resident_memory_bytes",
            "legendFormat": "{{ instance }}"
          }
        ]
      }
    ]
  }
}
```

---

**Document Version**: 1.0
**Last Updated**: 30 Oktober 2025
**Implementation Status**: Ready for Development

---

## Next Steps

1. **Start Phase 1 Implementation** - Foundation setup and core infrastructure
2. **Setup Development Environment** - Follow the Week 1 guide exactly
3. **Create GitHub Repository** - Initialize with the project structure
4. **Setup CI/CD Pipeline** - Configure GitHub Actions workflows
5. **Begin Backend Development** - Start with authentication service
6. **Frontend Development** - Parallel development after backend foundation
7. **Regular Testing** - Implement tests from the beginning
8. **Documentation Updates** - Keep documentation synchronized with code

## Support

For implementation questions and support:
- Create issues in the project repository
- Review the detailed documentation in `/docs/architecture/`
- Follow the implementation guide step by step
- Join the development team Slack channel

---

**Good luck with your implementation! 🚀**