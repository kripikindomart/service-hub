# Backend Architecture - Multi-Tenant Service Management Platform

## Backend Overview

Backend menggunakan **Microservices Architecture** dengan Express.js dan TypeScript, dirancang untuk high scalability, maintainability, dan security. Setiap service memiliki responsibility yang jelas dengan clean API boundaries.

## Technology Stack

### Core Technologies
- **Runtime**: Node.js 18+ LTS
- **Framework**: Express.js 4.x dengan TypeScript 5.x
- **Database**: MySQL 8.0+ dengan Prisma ORM
- **Cache**: Redis 7.0+
- **Message Queue**: Redis Bull Queue / RabbitMQ
- **Authentication**: JWT dengan refresh tokens
- **API Documentation**: OpenAPI 3.0 dengan Swagger

### Development Tools
- **Package Manager**: pnpm
- **Code Quality**: ESLint + Prettier + Husky
- **Testing**: Jest + Supertest + TypeScript
- **Build**: esbuild untuk fast builds
- **Container**: Docker dengan multi-stage builds

## Project Structure

```
backend/
├── src/
│   ├── common/                 # Shared utilities & types
│   │   ├── config/            # Configuration management
│   │   ├── database/          # Database connections & migrations
│   │   ├── middleware/        # Shared middleware
│   │   ├── utils/             # Utility functions
│   │   ├── types/             # TypeScript type definitions
│   │   └── errors/            # Error handling
│   ├── services/              # Microservices
│   │   ├── auth/              # Authentication service
│   │   ├── tenant/            # Tenant management
│   │   ├── service-registry/  # Service registry
│   │   ├── form-builder/      # Dynamic form builder
│   │   ├── menu/              # Dynamic menu system
│   │   ├── user/              # User management
│   │   └── notification/      # Notification service
│   ├── gateway/               # API Gateway
│   │   ├── routes/            # Route definitions
│   │   ├── middleware/        # Gateway-specific middleware
│   │   └── proxy/             # Service proxy
│   ├── jobs/                  # Background jobs
│   │   ├── processors/        # Job processors
│   │   └── schedulers/        # Job schedulers
│   └── events/                # Event system
│       ├── handlers/          # Event handlers
│       └── emitters/          # Event emitters
├── tests/                     # Test files
│   ├── unit/                  # Unit tests
│   ├── integration/           # Integration tests
│   └── e2e/                   # End-to-end tests
├── docs/                      # API documentation
├── docker/                    # Docker configurations
├── scripts/                   # Build & deployment scripts
└── prisma/                    # Database schemas & migrations
```

## Microservices Architecture

### 1. Authentication Service (`/services/auth`)

**Responsibilities:**
- User authentication & authorization
- JWT token generation & validation
- Password management & 2FA
- Session management
- OAuth integration

**API Endpoints:**
```typescript
// Authentication
POST   /auth/login
POST   /auth/logout
POST   /auth/refresh
POST   /auth/register
POST   /auth/verify-email
POST   /auth/forgot-password
POST   /auth/reset-password

// 2FA
POST   /auth/2fa/setup
POST   /auth/2fa/verify
POST   /auth/2fa/disable

// OAuth
GET    /auth/oauth/google
GET    /auth/oauth/github
POST   /auth/oauth/callback

// Token Management
POST   /auth/token/validate
POST   /auth/token/revoke
```

**Core Implementation:**
```typescript
// services/auth/src/auth.service.ts
@Injectable()
export class AuthService {
  async login(credentials: LoginDto): Promise<AuthResponse> {
    // 1. Validate credentials
    const user = await this.validateUser(credentials);

    // 2. Check tenant access
    const tenantAccess = await this.getUserTenants(user.id);

    // 3. Generate tokens
    const tokens = await this.generateTokens(user, tenantAccess);

    // 4. Log activity
    await this.logAuthActivity(user.id, 'LOGIN', credentials.ip);

    return { user, tenants, tokens };
  }

  async generateTokens(user: User, tenants: TenantAccess[]): Promise<TokenPair> {
    const payload = {
      userId: user.id,
      email: user.email,
      homeTenantId: user.homeTenantId,
      currentTenantId: tenants[0]?.id,
      permissions: await this.getUserPermissions(user.id, tenants[0]?.id),
      roles: tenants[0]?.roles || []
    };

    return {
      accessToken: this.jwtService.sign(payload, { expiresIn: '15m' }),
      refreshToken: this.jwtService.sign(
        { userId: user.id, tokenVersion: user.tokenVersion },
        { expiresIn: '7d' }
      )
    };
  }
}
```

### 2. Tenant Management Service (`/services/tenant`)

**Responsibilities:**
- Tenant CRUD operations
- Tenant provisioning
- Database management per tenant
- Subscription management
- Tenant configuration

**API Endpoints:**
```typescript
// Tenant Management
GET    /tenants
POST   /tenants
GET    /tenants/:id
PUT    /tenants/:id
DELETE /tenants/:id

// Tenant Configuration
PUT    /tenants/:id/config
GET    /tenants/:id/features
PUT    /tenants/:id/features

// Tenant Users
GET    /tenants/:id/users
POST   /tenants/:id/users
PUT    /tenants/:id/users/:userId
DELETE /tenants/:id/users/:userId

// Tenant Services
GET    /tenants/:id/services
POST   /tenants/:id/services
PUT    /tenants/:id/services/:serviceId
DELETE /tenants/:id/services/:serviceId
```

**Core Implementation:**
```typescript
// services/tenant/src/tenant.service.ts
@Injectable()
export class TenantService {
  async createTenant(createTenantDto: CreateTenantDto): Promise<Tenant> {
    // 1. Validate tenant data
    await this.validateTenantData(createTenantDto);

    // 2. Create tenant record
    const tenant = await this.prisma.tenant.create({
      data: {
        ...createTenantDto,
        databaseName: `tenant_${uuidv4().replace(/-/g, '_')}`,
        status: 'PENDING'
      }
    });

    // 3. Provision tenant database
    await this.provisionTenantDatabase(tenant);

    // 4. Initialize tenant schema
    await this.initializeTenantSchema(tenant);

    // 5. Update tenant status
    return await this.prisma.tenant.update({
      where: { id: tenant.id },
      data: { status: 'ACTIVE' }
    });
  }

  private async provisionTenantDatabase(tenant: Tenant): Promise<void> {
    const dbConfig = {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_ROOT_USER,
      password: process.env.DB_ROOT_PASSWORD
    };

    const connection = await mysql.createConnection(dbConfig);

    // Create tenant database
    await connection.execute(`CREATE DATABASE ${tenant.databaseName}`);

    // Create tenant user with limited privileges
    const tenantUser = `tenant_${tenant.id.slice(0, 8)}`;
    const tenantPassword = generateSecurePassword();

    await connection.execute(`
      CREATE USER '${tenantUser}'@'%' IDENTIFIED BY '${tenantPassword}'
    `);

    await connection.execute(`
      GRANT ALL PRIVILEGES ON ${tenant.databaseName}.*
      TO '${tenantUser}'@'%'
    `);

    await connection.end();

    // Store credentials securely
    await this.storeTenantCredentials(tenant.id, {
      user: tenantUser,
      password: tenantPassword
    });
  }
}
```

### 3. Service Registry (`/services/service-registry`)

**Responsibilities:**
- Service registration & discovery
- Service health monitoring
- API endpoint management
- Service metadata management
- Dynamic form & menu schema management

**API Endpoints:**
```typescript
// Service Management
GET    /services
POST   /services/register
GET    /services/:id
PUT    /services/:id
DELETE /services/:id

// Service Endpoints
GET    /services/:id/endpoints
POST   /services/:id/endpoints
PUT    /services/:id/endpoints/:endpointId
DELETE /services/:id/endpoints/:endpointId

// Service Health
GET    /services/:id/health
POST   /services/:id/health-check

// Service Discovery
GET    /services/discovery
GET    /services/:tenant/available
```

**Core Implementation:**
```typescript
// services/service-registry/src/service-registry.service.ts
@Injectable()
export class ServiceRegistryService {
  async registerService(registerDto: RegisterServiceDto): Promise<Service> {
    // 1. Validate service schema
    await this.validateServiceSchema(registerDto);

    // 2. Check for duplicates
    await this.checkDuplicateService(registerDto.name, registerDto.version);

    // 3. Register service
    const service = await this.prisma.service.create({
      data: {
        ...registerDto,
        status: 'PENDING',
        registeredBy: registerDto.registeredBy,
        registeredTenantId: registerDto.tenantId
      },
      include: {
        endpoints: true,
        registeredByUser: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    // 4. Validate service endpoints
    if (registerDto.type === 'EXTERNAL') {
      await this.validateExternalService(service);
    }

    // 5. Generate forms and menus
    await this.generateServiceArtifacts(service);

    // 6. Update service status
    return await this.prisma.service.update({
      where: { id: service.id },
      data: { status: 'ACTIVE' }
    });
  }

  async generateServiceArtifacts(service: Service): Promise<void> {
    // Generate dynamic forms from endpoints
    const forms = await this.generateFormsFromEndpoints(service.endpoints);

    // Generate menu structure
    const menus = await this.generateMenuFromService(service);

    // Update service with generated artifacts
    await this.prisma.service.update({
      where: { id: service.id },
      data: {
        formSchema: forms,
        menuSchema: menus
      }
    });
  }

  private async validateExternalService(service: Service): Promise<void> {
    try {
      // Test service connectivity
      const response = await fetch(service.healthCheckUrl || service.baseUrl, {
        method: 'GET',
        timeout: 5000,
        headers: this.buildAuthHeaders(service)
      });

      if (!response.ok) {
        throw new Error(`Service health check failed: ${response.status}`);
      }

      // Update service health status
      await this.prisma.service.update({
        where: { id: service.id },
        data: {
          lastHealthCheck: new Date(),
          healthStatus: 'HEALTHY'
        }
      });

    } catch (error) {
      await this.prisma.service.update({
        where: { id: service.id },
        data: {
          lastHealthCheck: new Date(),
          healthStatus: 'UNHEALTHY',
          healthError: error.message
        }
      });

      throw new Error(`Service validation failed: ${error.message}`);
    }
  }
}
```

### 4. Form Builder Service (`/services/form-builder`)

**Responsibilities:**
- Dynamic form generation from JSON schemas
- Form validation
- Form submission handling
- Field type management
- Form template management

**API Endpoints:**
```typescript
// Form Management
GET    /forms
POST   /forms
GET    /forms/:id
PUT    /forms/:id
DELETE /forms/:id

// Form Rendering
GET    /forms/:id/schema
GET    /forms/:id/preview

// Form Submission
POST   /forms/:id/submit
GET    /forms/:id/submissions
GET    /forms/:id/submissions/:submissionId

// Form Templates
GET    /form-templates
POST   /form-templates
GET    /form-templates/:id
```

**Core Implementation:**
```typescript
// services/form-builder/src/form-builder.service.ts
@Injectable()
export class FormBuilderService {
  async generateFormFromSchema(serviceId: string, endpointId: string): Promise<FormSchema> {
    // 1. Get service endpoint schema
    const endpoint = await this.prisma.serviceEndpoint.findUnique({
      where: { id: endpointId },
      include: { service: true }
    });

    if (!endpoint || endpoint.serviceId !== serviceId) {
      throw new NotFoundException('Endpoint not found');
    }

    // 2. Parse request schema
    const requestSchema = endpoint.requestSchema as JSONSchema7;

    // 3. Generate form fields
    const formFields = this.generateFormFields(requestSchema);

    // 4. Add validation rules
    const validationRules = this.generateValidationRules(requestSchema);

    // 5. Create form configuration
    const formSchema: FormSchema = {
      id: uuidv4(),
      name: `${endpoint.service.name}_${endpoint.name}_form`,
      title: endpoint.displayName,
      description: endpoint.description,
      fields: formFields,
      validation: validationRules,
      submitConfig: {
        method: endpoint.method,
        url: this.buildSubmitUrl(endpoint),
        headers: this.buildSubmitHeaders(endpoint)
      }
    };

    return formSchema;
  }

  private generateFormFields(schema: JSONSchema7): FormField[] {
    const fields: FormField[] = [];

    if (schema.type === 'object' && schema.properties) {
      for (const [key, property] of Object.entries(schema.properties)) {
        const field = this.createFormField(key, property as JSONSchema7, schema.required?.includes(key));
        fields.push(field);
      }
    }

    return fields;
  }

  private createFormField(name: string, schema: JSONSchema7, required: boolean): FormField {
    const baseField: FormField = {
      name,
      label: this.generateLabel(name),
      type: this.mapJsonTypeToFormType(schema.type),
      required,
      description: schema.description,
      placeholder: this.generatePlaceholder(name, schema)
    };

    // Add type-specific configurations
    switch (schema.type) {
      case 'string':
        if (schema.enum) {
          return {
            ...baseField,
            type: 'select',
            options: schema.enum.map(value => ({
              value,
              label: this.generateLabel(value.toString())
            }))
          };
        }
        if (schema.format === 'email') {
          return { ...baseField, type: 'email', validation: { email: true } };
        }
        if (schema.format === 'password') {
          return { ...baseField, type: 'password' };
        }
        break;

      case 'number':
      case 'integer':
        return {
          ...baseField,
          type: 'number',
          validation: {
            min: schema.minimum,
            max: schema.maximum,
            step: schema.type === 'integer' ? 1 : 0.01
          }
        };

      case 'array':
        return {
          ...baseField,
          type: 'array',
          itemType: this.mapJsonTypeToFormType(schema.items?.type),
          validation: {
            minItems: schema.minItems,
            maxItems: schema.maxItems
          }
        };

      case 'boolean':
        return { ...baseField, type: 'checkbox' };
    }

    return baseField;
  }
}
```

### 5. Menu Service (`/services/menu`)

**Responsibilities:**
- Dynamic menu generation based on permissions
- Menu hierarchy management
- Menu customization per tenant
- Menu caching & optimization

**API Endpoints:**
```typescript
// Menu Management
GET    /menus
POST   /menus
GET    /menus/:id
PUT    /menus/:id
DELETE /menus/:id

// User Menus
GET    /menus/user
GET    /menus/user/:userId

// Tenant Menus
GET    /menus/tenant/:tenantId
PUT    /menus/tenant/:tenantId/custom

// Menu Permissions
GET    /menus/:id/permissions
POST   /menus/:id/permissions
```

**Core Implementation:**
```typescript
// services/menu/src/menu.service.ts
@Injectable()
export class MenuService {
  async generateUserMenus(userId: string, tenantId: string): Promise<MenuStructure> {
    // 1. Get user permissions and roles
    const userPermissions = await this.getUserPermissions(userId, tenantId);
    const userRoles = await this.getUserRoles(userId, tenantId);

    // 2. Get tenant services
    const tenantServices = await this.getTenantServices(tenantId);

    // 3. Generate base menu structure
    const baseMenus = await this.generateBaseMenus(userPermissions);

    // 4. Generate service menus
    const serviceMenus = await this.generateServiceMenus(tenantServices, userPermissions);

    // 5. Merge and sort menus
    const mergedMenus = this.mergeMenus(baseMenus, serviceMenus);
    const sortedMenus = this.sortMenus(mergedMenus);

    // 6. Cache menu structure
    await this.cacheUserMenu(userId, tenantId, sortedMenus);

    return {
      menus: sortedMenus,
      permissions: userPermissions,
      roles: userRoles,
      cachedAt: new Date()
    };
  }

  private async generateServiceServices(services: TenantService[], permissions: string[]): Promise<MenuItem[]> {
    const menus: MenuItem[] = [];

    for (const service of services) {
      // Check if user has access to service
      if (!this.hasServiceAccess(service, permissions)) {
        continue;
      }

      // Get service menu schema
      const serviceMenu = service.service.menuSchema as MenuSchema;

      // Filter menu items based on permissions
      const filteredItems = this.filterMenuItems(serviceMenu.items, permissions);

      if (filteredItems.length > 0) {
        menus.push({
          id: `service_${service.service.id}`,
          name: service.service.displayName,
          path: `/services/${service.service.slug}`,
          icon: service.service.icon || 'app',
          category: 'SERVICES',
          sortOrder: service.sortOrder || 100,
          children: filteredItems,
          permissions: this.getServicePermissions(service)
        });
      }
    }

    return menus;
  }

  private filterMenuItems(items: MenuItem[], permissions: string[]): MenuItem[] {
    return items
      .filter(item => this.hasMenuItemAccess(item, permissions))
      .map(item => ({
        ...item,
        children: item.children ? this.filterMenuItems(item.children, permissions) : []
      }))
      .filter(item => !item.children || item.children.length > 0);
  }

  private hasMenuItemAccess(item: MenuItem, permissions: string[]): boolean {
    if (!item.permissions || item.permissions.length === 0) {
      return true; // Public menu item
    }

    return item.permissions.some(permission =>
      permissions.includes(permission) ||
      this.hasWildcardPermission(permission, permissions)
    );
  }

  private hasWildcardPermission(required: string, permissions: string[]): boolean {
    return permissions.some(permission => {
      if (permission === '*') return true;
      if (permission.endsWith(':*')) {
        const prefix = permission.slice(0, -2);
        return required.startsWith(prefix);
      }
      return false;
    });
  }
}
```

## API Gateway Architecture

### Gateway Structure
```typescript
// gateway/src/app.ts
export class GatewayApplication {
  private app: Express;
  private redis: Redis;
  private serviceDiscovery: ServiceDiscovery;

  constructor() {
    this.app = express();
    this.redis = new Redis(process.env.REDIS_URL);
    this.serviceDiscovery = new ServiceDiscovery();
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeProxy();
  }

  private initializeMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    this.app.use(cors(this.corsConfig));
    this.app.use(rateLimit(this.rateLimitConfig));

    // Request parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging
    this.app.use(this.requestLogger);

    // Authentication middleware
    this.app.use(this.authenticateRequest);

    // Tenant context middleware
    this.app.use(this.setTenantContext);
  }

  private initializeProxy(): void {
    // Proxy to microservices
    this.app.use('/api/v1/auth', this.createProxy('auth-service', 3001));
    this.app.use('/api/v1/tenants', this.createProxy('tenant-service', 3002));
    this.app.use('/api/v1/services', this.createProxy('service-registry', 3003));
    this.app.use('/api/v1/forms', this.createProxy('form-builder', 3004));
    this.app.use('/api/v1/menus', this.createProxy('menu-service', 3005));
  }

  private createProxy(serviceName: string, port: number): RequestHandler {
    const proxy = createProxyMiddleware({
      target: `http://${serviceName}:${port}`,
      changeOrigin: true,
      pathRewrite: (path, req) => {
        // Add tenant context to headers
        req.headers['x-tenant-id'] = req.tenantId;
        req.headers['x-user-id'] = req.userId;
        return path;
      },
      onError: (err, req, res) => {
        console.error(`Proxy error for ${serviceName}:`, err);
        res.status(503).json({
          error: 'Service Unavailable',
          message: `${serviceName} is currently unavailable`
        });
      }
    });

    return proxy;
  }
}
```

## Shared Infrastructure

### Database Connection Management
```typescript
// src/common/database/database.service.ts
@Injectable()
export class DatabaseService {
  private corePrisma: PrismaClient;
  private tenantConnections: Map<string, PrismaClient> = new Map();

  constructor() {
    this.corePrisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.CORE_DATABASE_URL
        }
      },
      log: ['query', 'info', 'warn', 'error']
    });
  }

  getCoreDb(): PrismaClient {
    return this.corePrisma;
  }

  async getTenantDb(tenantId: string): Promise<PrismaClient> {
    // Check if connection already exists
    if (this.tenantConnections.has(tenantId)) {
      return this.tenantConnections.get(tenantId)!;
    }

    // Get tenant database configuration
    const tenant = await this.corePrisma.tenant.findUnique({
      where: { id: tenantId },
      select: { databaseName: true, databaseHost: true, databasePort: true }
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Create new tenant connection
    const tenantPrisma = new PrismaClient({
      datasources: {
        db: {
          url: `mysql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${tenant.databaseHost}:${tenant.databasePort}/${tenant.databaseName}`
        }
      }
    });

    // Cache connection
    this.tenantConnections.set(tenantId, tenantPrisma);

    return tenantPrisma;
  }

  async closeTenantConnection(tenantId: string): Promise<void> {
    const connection = this.tenantConnections.get(tenantId);
    if (connection) {
      await connection.$disconnect();
      this.tenantConnections.delete(tenantId);
    }
  }

  async closeAllConnections(): Promise<void> {
    await this.corePrisma.$disconnect();

    for (const connection of this.tenantConnections.values()) {
      await connection.$disconnect();
    }

    this.tenantConnections.clear();
  }
}
```

### Event System
```typescript
// src/common/events/event.service.ts
@Injectable()
export class EventService {
  private redis: Redis;
  private handlers: Map<string, EventHandler[]> = new Map();

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);
    this.initializeSubscribers();
  }

  async publish(event: DomainEvent): Promise<void> {
    const eventData = {
      id: uuidv4(),
      type: event.type,
      data: event.data,
      metadata: {
        timestamp: new Date().toISOString(),
        version: '1.0',
        source: event.source || 'unknown'
      }
    };

    // Publish to Redis
    await this.redis.publish('events', JSON.stringify(eventData));

    // Log event
    console.log(`Event published: ${event.type}`, eventData);
  }

  async subscribe(eventType: string, handler: EventHandler): Promise<void> {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }

    this.handlers.get(eventType)!.push(handler);
  }

  private async handleEvent(eventData: EventData): Promise<void> {
    const handlers = this.handlers.get(eventData.type) || [];

    for (const handler of handlers) {
      try {
        await handler.handle(eventData);
      } catch (error) {
        console.error(`Error handling event ${eventData.type}:`, error);
      }
    }
  }

  private initializeSubscribers(): void {
    this.redis.subscribe('events', (message) => {
      const eventData = JSON.parse(message) as EventData;
      this.handleEvent(eventData);
    });
  }
}

// Example event types
export interface UserCreatedEvent extends DomainEvent {
  type: 'user.created';
  data: {
    userId: string;
    email: string;
    tenantId: string;
    role: string;
  };
}

export interface TenantCreatedEvent extends DomainEvent {
  type: 'tenant.created';
  data: {
    tenantId: string;
    name: string;
    plan: string;
    createdBy: string;
  };
}

export interface ServiceRegisteredEvent extends DomainEvent {
  type: 'service.registered';
  data: {
    serviceId: string;
    name: string;
    type: string;
    tenantId: string;
  };
}
```

## Testing Strategy

### Unit Testing
```typescript
// tests/unit/services/auth/auth.service.test.ts
describe('AuthService', () => {
  let service: AuthService;
  let prisma: jest.Mocked<PrismaClient>;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrisma
        },
        {
          provide: JwtService,
          useValue: mockJwtService
        }
      ]
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get(PrismaService);
    jwtService = module.get(JwtService);
  });

  describe('login', () => {
    it('should return tokens for valid credentials', async () => {
      // Arrange
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123'
      };

      const mockUser = {
        id: 'user1',
        email: 'test@example.com',
        passwordHash: await bcrypt.hash('password123', 10),
        status: 'ACTIVE'
      };

      prisma.user.findUnique.mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValue('mock-token');

      // Act
      const result = await service.login(loginDto);

      // Assert
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: loginDto.email }
      });
    });

    it('should throw error for invalid credentials', async () => {
      // Arrange
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      prisma.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException
      );
    });
  });
});
```

### Integration Testing
```typescript
// tests/integration/auth.integration.test.ts
describe('Auth Integration', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AuthModule]
    }).compile();

    app = module.createNestApplication();
    prisma = module.get(PrismaClient);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  describe('POST /auth/login', () => {
    it('should authenticate user and return tokens', async () => {
      // Create test user
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          passwordHash: await bcrypt.hash('password123', 10),
          name: 'Test User'
        }
      });

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user.email).toBe('test@example.com');

      // Cleanup
      await prisma.user.delete({ where: { id: user.id } });
    });
  });
});
```

## Monitoring & Observability

### Health Checks
```typescript
// src/common/health/health.controller.ts
@Controller('health')
export class HealthController {
  constructor(
    private databaseService: DatabaseService,
    private redis: Redis
  ) {}

  @Get()
  async getHealth(): Promise<HealthResponse> {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkMemory(),
      this.checkDiskSpace()
    ]);

    const status = checks.every(check => check.status === 'fulfilled')
      ? 'healthy'
      : 'unhealthy';

    return {
      status,
      timestamp: new Date().toISOString(),
      checks: {
        database: checks[0].status === 'fulfilled' ? checks[0].value : checks[0].reason,
        redis: checks[1].status === 'fulfilled' ? checks[1].value : checks[1].reason,
        memory: checks[2].status === 'fulfilled' ? checks[2].value : checks[2].reason,
        disk: checks[3].status === 'fulfilled' ? checks[3].value : checks[3].reason
      }
    };
  }

  private async checkDatabase(): Promise<HealthCheck> {
    try {
      await this.databaseService.getCoreDb().$queryRaw`SELECT 1`;
      return { status: 'healthy', responseTime: Date.now() };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }

  private async checkRedis(): Promise<HealthCheck> {
    try {
      const start = Date.now();
      await this.redis.ping();
      return { status: 'healthy', responseTime: Date.now() - start };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }
}
```

---

**Document Version**: 1.0
**Last Updated**: 30 Oktober 2025
**Next Document**: [04-Frontend-Architecture.md](./04-frontend-architecture.md)