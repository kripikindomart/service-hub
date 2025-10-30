# Security Architecture - Multi-Tenant Service Management Platform

## Security Overview

Platform ini mengimplementasikan **Zero-Trust Security Model** dengan multi-layer defense, end-to-end encryption, dan comprehensive audit logging. Security diintegrasikan ke setiap lapisan arsitektur untuk memastikan isolasi data yang kuat antar tenant dan proteksi comprehensive terhadap ancaman modern.

## Security Principles

### 1. **Zero Trust Architecture**
- Never trust, always verify
- Explicit verification untuk setiap request
- Least privilege access enforcement
- Micro-segmentation antar services

### 2. **Defense in Depth**
- Multiple security layers
- Redundant security controls
- Compromise containment
- Rapid detection & response

### 3. **Security by Design**
- Security-first development approach
- Automated security testing
- Secure coding practices
- Regular security audits

## Security Layers Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        EXTERNAL LAYER                           │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    WAF & DDoS Protection                   ││
│  │  • Cloudflare WAF                                          ││
│  │  • Rate Limiting                                           ││
│  │  • Bot Protection                                          ││
│  │  • DDoS Mitigation                                         ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│                      NETWORK LAYER                             │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                Network Security                             ││
│  │  • HTTPS/WSS Encryption                                    ││
│  │  • TLS 1.3 Only                                            ││
│  │  • HSTS Headers                                            ││
│  │  • IP Whitelisting/Blacklisting                            ││
│  │  • VPC Segmentation                                        ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│                   APPLICATION LAYER                            │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                Application Security                         ││
│  │  • API Gateway Authentication                              ││
│  │  • JWT Token Validation                                    ││
│  │  • CORS Configuration                                       ││
│  │  • Request Validation                                       ││
│  │  • SQL Injection Prevention                                ││
│  │  • XSS Protection                                           ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│                      AUTHENTICATION                             │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                Authentication System                        ││
│  │  • Multi-Factor Authentication                             ││
│  │  • OAuth 2.0 / OpenID Connect                             ││
│  │  • SAML Integration                                        ││
│  │  • Session Management                                      ││
│  │  • Password Policies                                        ││
│  │  • Account Lockout Policies                                 ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│                    AUTHORIZATION                               │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │               Authorization System                          ││
│  │  • Role-Based Access Control (RBAC)                        ││
│  │  • Attribute-Based Access Control (ABAC)                   ││
│  │  • Fine-Grained Permissions                                ││
│  │  • Tenant Data Isolation                                    ││
│  │  • Service Access Control                                   ││
│  │  • API Scope Validation                                     ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│                        DATA LAYER                              │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                   Data Security                             ││
│  │  • Encryption at Rest (AES-256)                            ││
│  │  • Encryption in Transit (TLS 1.3)                         ││
│  │  • Database Row-Level Security                             ││
│  │  • Tenant Data Encryption                                   ││
│  │  • Sensitive Data Masking                                   ││
│  │  • Data Backup Encryption                                   ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│                  INFRASTRUCTURE LAYER                          │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │               Infrastructure Security                        ││
│  │  • Container Security                                        ││
│  │  • Secrets Management                                       ││
│  │  • Infrastructure as Code (IaC) Security                   ││
│  │  • Vulnerability Scanning                                   ││
│  │  • Intrusion Detection                                      ││
│  │  • Log Monitoring & SIEM                                   ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## Authentication & Authorization

### 1. JWT Token Architecture

#### Token Structure
```typescript
interface JWTPayload {
  // Standard claims
  iss: string;        // Issuer
  sub: string;        // User ID
  aud: string;        // Audience (tenant ID)
  exp: number;        // Expiration time
  iat: number;        // Issued at time
  jti: string;        // Token ID

  // Custom claims
  userId: string;     // User identifier
  email: string;      // User email
  tenantId: string;   // Current tenant ID
  homeTenantId: string; // Home tenant ID
  roles: string[];    // User roles in current tenant
  permissions: string[]; // User permissions
  sessionId: string;  // Session identifier
  tokenVersion: number; // For token invalidation
  deviceId: string;   // Device fingerprint
}

interface RefreshTokenPayload {
  userId: string;
  sessionId: string;
  tokenVersion: number;
  deviceId: string;
  // No tenant-specific info in refresh tokens
}
```

#### Token Management Implementation
```typescript
// src/services/auth/token.service.ts
@Injectable()
export class TokenService {
  constructor(
    private jwtService: JwtService,
    private redis: Redis,
    private configService: ConfigService
  ) {}

  async generateAccessToken(user: User, tenant: Tenant, session: Session): Promise<string> {
    const payload: JWTPayload = {
      iss: this.configService.get('JWT_ISSUER'),
      sub: user.id,
      aud: tenant.id,
      exp: Math.floor(Date.now() / 1000) + (15 * 60), // 15 minutes
      iat: Math.floor(Date.now() / 1000),
      jti: uuidv4(),

      userId: user.id,
      email: user.email,
      tenantId: tenant.id,
      homeTenantId: user.homeTenantId,
      roles: tenant.roles,
      permissions: tenant.permissions,
      sessionId: session.id,
      tokenVersion: user.tokenVersion,
      deviceId: session.deviceId
    };

    const token = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_ACCESS_SECRET'),
      algorithm: 'RS256'
    });

    // Cache token metadata for quick revocation
    await this.cacheTokenMetadata(payload.jti, {
      userId: user.id,
      tenantId: tenant.id,
      sessionId: session.id,
      expiresAt: new Date(payload.exp * 1000)
    });

    return token;
  }

  async generateRefreshToken(user: User, session: Session): Promise<string> {
    const payload: RefreshTokenPayload = {
      userId: user.id,
      sessionId: session.id,
      tokenVersion: user.tokenVersion,
      deviceId: session.deviceId
    };

    const token = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
      algorithm: 'RS256'
    });

    return token;
  }

  async validateToken(token: string): Promise<JWTPayload> {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get('JWT_ACCESS_SECRET'),
        algorithms: ['RS256']
      }) as JWTPayload;

      // Check if token is revoked
      const isRevoked = await this.isTokenRevoked(payload.jti);
      if (isRevoked) {
        throw new UnauthorizedException('Token has been revoked');
      }

      // Validate user token version
      const user = await this.userService.findById(payload.userId);
      if (user.tokenVersion !== payload.tokenVersion) {
        throw new UnauthorizedException('Token version mismatch');
      }

      return payload;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  async revokeToken(jti: string): Promise<void> {
    await this.redis.setex(
      `revoked_token:${jti}`,
      7 * 24 * 60 * 60, // 7 days
      '1'
    );
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    // Increment user token version to invalidate all tokens
    await this.userService.incrementTokenVersion(userId);

    // Get all active sessions for user
    const sessions = await this.sessionService.getActiveSessions(userId);

    // Revoke all tokens for these sessions
    const revokePromises = sessions.map(session =>
      this.revokeSessionTokens(session.id)
    );

    await Promise.all(revokePromises);
  }

  private async isTokenRevoked(jti: string): Promise<boolean> {
    const result = await this.redis.get(`revoked_token:${jti}`);
    return result === '1';
  }

  private async cacheTokenMetadata(jti: string, metadata: TokenMetadata): Promise<void> {
    const ttl = Math.floor((metadata.expiresAt.getTime() - Date.now()) / 1000);
    await this.redis.setex(`token:${jti}`, ttl, JSON.stringify(metadata));
  }
}
```

### 2. Multi-Factor Authentication

#### 2FA Implementation
```typescript
// src/services/auth/2fa.service.ts
@Injectable()
export class TwoFactorAuthService {
  constructor(
    private userService: UserService,
    private emailService: EmailService,
    private smsService: SMSService,
    private redis: Redis
  ) {}

  async enable2FA(userId: string, method: TwoFactorMethod): Promise<TwoFactorSetup> {
    const user = await this.userService.findById(userId);

    switch (method) {
      case 'TOTP':
        return await this.setupTOTP(user);
      case 'EMAIL':
        return await this.setupEmail2FA(user);
      case 'SMS':
        return await this.setupSMS2FA(user);
      default:
        throw new BadRequestException('Unsupported 2FA method');
    }
  }

  private async setupTOTP(user: User): Promise<TwoFactorSetup> {
    const secret = speakeasy.generateSecret({
      name: `${this.configService.get('APP_NAME')} (${user.email})`,
      issuer: this.configService.get('APP_NAME')
    });

    // Store encrypted secret
    await this.userService.update2FASettings(user.id, {
      method: 'TOTP',
      secret: this.encrypt(secret.base32),
      enabled: false // Require verification first
    });

    // Generate QR code
    const qrCodeUrl = await this.generateQRCode(secret.otpauth_url!);

    return {
      method: 'TOTP',
      secret: secret.base32,
      qrCode: qrCodeUrl,
      backupCodes: await this.generateBackupCodes(user.id)
    };
  }

  async verify2FASetup(userId: string, token: string, method: TwoFactorMethod): Promise<boolean> {
    const user = await this.userService.findById(userId);
    const settings = user.twoFactorSettings;

    if (!settings || settings.method !== method || !settings.secret) {
      throw new BadRequestException('2FA not set up for this method');
    }

    let isValid = false;

    switch (method) {
      case 'TOTP':
        isValid = this.verifyTOTPToken(this.decrypt(settings.secret), token);
        break;
      case 'EMAIL':
        isValid = await this.verifyEmailToken(userId, token);
        break;
      case 'SMS':
        isValid = await this.verifySMSToken(userId, token);
        break;
    }

    if (isValid) {
      // Enable 2FA after successful verification
      await this.userService.update2FASettings(userId, {
        ...settings,
        enabled: true
      });

      return true;
    }

    return false;
  }

  async verify2FALogin(userId: string, token: string): Promise<boolean> {
    const user = await this.userService.findById(userId);
    const settings = user.twoFactorSettings;

    if (!settings?.enabled) {
      return true; // 2FA not required
    }

    switch (settings.method) {
      case 'TOTP':
        return this.verifyTOTPToken(this.decrypt(settings.secret), token);
      case 'EMAIL':
        return await this.verifyEmailToken(userId, token);
      case 'SMS':
        return await this.verifySMSToken(userId, token);
      default:
        return false;
    }
  }

  async send2FACode(userId: string): Promise<void> {
    const user = await this.userService.findById(userId);
    const settings = user.twoFactorSettings;

    if (!settings?.enabled) {
      throw new BadRequestException('2FA not enabled');
    }

    const code = this.generate6DigitCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Cache the code
    await this.redis.setex(
      `2fa_code:${userId}`,
      5 * 60, // 5 minutes
      JSON.stringify({ code, expiresAt })
    );

    switch (settings.method) {
      case 'EMAIL':
        await this.emailService.send2FACode(user.email, code);
        break;
      case 'SMS':
        await this.smsService.send2FACode(user.phone!, code);
        break;
    }
  }

  private verifyTOTPToken(secret: string, token: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2 // Allow 2 steps before/after for clock drift
    });
  }

  private async verifyEmailToken(userId: string, token: string): Promise<boolean> {
    const cached = await this.redis.get(`2fa_code:${userId}`);
    if (!cached) return false;

    const { code, expiresAt } = JSON.parse(cached);

    if (new Date() > new Date(expiresAt)) {
      await this.redis.del(`2fa_code:${userId}`);
      return false;
    }

    return code === token;
  }

  private generateBackupCodes(userId: string): Promise<string[]> {
    const codes = Array.from({ length: 10 }, () => this.generate8DigitCode());

    // Hash and store backup codes
    const hashedCodes = codes.map(code => bcrypt.hash(code, 12));
    this.userService.storeBackupCodes(userId, hashedCodes);

    return Promise.resolve(codes);
  }

  private generate6DigitCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private generate8DigitCode(): string {
    return Math.floor(10000000 + Math.random() * 90000000).toString();
  }
}
```

## Authorization & Access Control

### 1. Role-Based Access Control (RBAC)

#### Permission System
```typescript
// src/services/authorization/permission.service.ts
export interface Permission {
  resource: string;     // e.g., "user", "tenant", "service"
  action: string;       // e.g., "create", "read", "update", "delete"
  scope?: string;       // e.g., "own", "tenant", "all"
  conditions?: Record<string, any>; // Additional conditions
}

export interface Role {
  id: string;
  name: string;
  permissions: Permission[];
  tenantId?: string;    // null for system roles
  isSystemRole: boolean;
  hierarchy: number;    // Role hierarchy level
}

@Injectable()
export class PermissionService {
  constructor(
    private userService: UserService,
    private roleService: RoleService
  ) {}

  async getUserPermissions(userId: string, tenantId: string): Promise<string[]> {
    // Get user's roles in the tenant
    const userRoles = await this.getUserRoles(userId, tenantId);

    // Collect all permissions from roles
    const permissions = new Set<string>();

    for (const role of userRoles) {
      const rolePermissions = await this.getRolePermissions(role.id);
      rolePermissions.forEach(permission => {
        permissions.add(this.formatPermission(permission));
      });
    }

    // Add user-specific permissions
    const userSpecificPermissions = await this.getUserSpecificPermissions(userId, tenantId);
    userSpecificPermissions.forEach(permission => {
      permissions.add(this.formatPermission(permission));
    });

    return Array.from(permissions);
  }

  async hasPermission(
    userId: string,
    tenantId: string,
    requiredPermission: string,
    context?: Record<string, any>
  ): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId, tenantId);

    // Check for exact permission match
    if (userPermissions.includes(requiredPermission)) {
      return true;
    }

    // Check for wildcard permissions
    const [resource, action, scope] = requiredPermission.split(':');

    // Check resource wildcard (e.g., "user:*")
    const resourceWildcard = `${resource}:*`;
    if (userPermissions.includes(resourceWildcard)) {
      return true;
    }

    // Check global wildcard
    if (userPermissions.includes('*')) {
      return true;
    }

    // Check conditional permissions
    return this.checkConditionalPermissions(
      userPermissions,
      requiredPermission,
      context
    );
  }

  async checkResourceAccess(
    userId: string,
    tenantId: string,
    resourceType: string,
    resourceId: string,
    action: string
  ): Promise<boolean> {
    const permission = `${resourceType}:${action}`;
    const hasBasicPermission = await this.hasPermission(userId, tenantId, permission);

    if (!hasBasicPermission) {
      return false;
    }

    // Check ownership conditions
    return this.checkOwnershipConditions(userId, resourceType, resourceId, action);
  }

  private formatPermission(permission: Permission): string {
    let formatted = `${permission.resource}:${permission.action}`;
    if (permission.scope) {
      formatted += `:${permission.scope}`;
    }
    return formatted;
  }

  private checkConditionalPermissions(
    permissions: string[],
    requiredPermission: string,
    context?: Record<string, any>
  ): boolean {
    // Implementation for checking conditional permissions
    // e.g., "user:update:own" only for own resources
    const [resource, action, scope] = requiredPermission.split(':');

    if (scope === 'own' && context?.resourceOwnerId) {
      return context.resourceOwnerId === context.currentUserId;
    }

    return false;
  }

  private async checkOwnershipConditions(
    userId: string,
    resourceType: string,
    resourceId: string,
    action: string
  ): Promise<boolean> {
    // Implementation for checking resource ownership
    switch (resourceType) {
      case 'user':
        return resourceId === userId;
      case 'task':
        const task = await this.taskService.findById(resourceId);
        return task?.assignedTo === userId || task?.createdBy === userId;
      default:
        return true; // No ownership check for other resources
    }
  }
}
```

### 2. Authorization Middleware

#### API Authorization Middleware
```typescript
// src/common/middleware/auth.middleware.ts
@Injectable()
export class AuthorizationMiddleware implements NestMiddleware {
  constructor(
    private permissionService: PermissionService,
    private reflector: Reflector
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Get required permissions from metadata
    const requiredPermissions = this.reflector.get<string[]>(
      'permissions',
      req.route!.handler
    ) || [];

    if (requiredPermissions.length === 0) {
      return next(); // No permissions required
    }

    // Get user info from request (set by auth middleware)
    const userId = req.user?.userId;
    const tenantId = req.user?.tenantId;

    if (!userId || !tenantId) {
      throw new UnauthorizedException('Authentication required');
    }

    // Check permissions
    const hasPermission = await Promise.all(
      requiredPermissions.map(permission =>
        this.permissionService.hasPermission(userId, tenantId, permission, {
          resourceOwnerId: req.params.id,
          currentUserId: userId
        })
      )
    );

    if (!hasPermission.every(Boolean)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    next();
  }
}

// Permission decorator
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata('permissions', permissions);

// Usage in controllers
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  @Get()
  @RequirePermissions('user:read')
  async getUsers() {
    // Implementation
  }

  @Post()
  @RequirePermissions('user:create')
  async createUser() {
    // Implementation
  }

  @Put(':id')
  @RequirePermissions('user:update:own', 'user:update:tenant')
  async updateUser(@Param('id') id: string) {
    // Implementation
  }
}
```

## Data Security

### 1. Encryption Strategy

#### Encryption Service
```typescript
// src/services/encryption/encryption.service.ts
@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32;
  private readonly ivLength = 16;
  private readonly tagLength = 16;

  constructor(
    @Inject('ENCRYPTION_KEY') private readonly masterKey: Buffer
  ) {}

  async encrypt(text: string): Promise<string> {
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipher(this.algorithm, this.masterKey);
    cipher.setAAD(Buffer.from('additional-data'));

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
  }

  async decrypt(encryptedText: string): Promise<string> {
    const [ivHex, tagHex, encrypted] = encryptedText.split(':');

    if (!ivHex || !tagHex || !encrypted) {
      throw new Error('Invalid encrypted text format');
    }

    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');

    const decipher = crypto.createDecipher(this.algorithm, this.masterKey);
    decipher.setAAD(Buffer.from('additional-data'));
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  async encryptSensitiveData(data: Record<string, any>): Promise<EncryptedData> {
    const jsonData = JSON.stringify(data);
    const encrypted = await this.encrypt(jsonData);

    return {
      data: encrypted,
      algorithm: this.algorithm,
      encryptedAt: new Date(),
      version: '1.0'
    };
  }

  async decryptSensitiveData(encryptedData: EncryptedData): Promise<Record<string, any>> {
    const decrypted = await this.decrypt(encryptedData.data);
    return JSON.parse(decrypted);
  }

  // Field-level encryption for database
  encryptField(value: string): string {
    if (!value) return value;
    return this.encrypt(value);
  }

  decryptField(encryptedValue: string): string {
    if (!encryptedValue) return encryptedValue;
    return this.decrypt(encryptedValue);
  }
}

// Prisma encryption middleware
export class PrismaEncryptionMiddleware {
  constructor(private encryptionService: EncryptionService) {}

  encrypt(params: Prisma.MiddlewareParams) {
    if (params.model && this.shouldEncrypt(params.model, params.action)) {
      if (params.args?.data) {
        params.args.data = this.encryptDataFields(params.args.data);
      }
    }

    return params;
  }

  decrypt(result: any, params: Prisma.MiddlewareParams) {
    if (params.model && this.shouldDecrypt(params.model, params.action)) {
      result = this.decryptDataFields(result);
    }

    return result;
  }

  private shouldEncrypt(model: string, action: string): boolean {
    const encryptableModels = ['User', 'Tenant'];
    const encryptableActions = ['create', 'update'];

    return encryptableModels.includes(model) && encryptableActions.includes(action);
  }

  private shouldDecrypt(model: string, action: string): boolean {
    const decryptableModels = ['User', 'Tenant'];
    const decryptableActions = ['findMany', 'findFirst', 'findUnique'];

    return decryptableModels.includes(model) && decryptableActions.includes(action);
  }

  private encryptDataFields(data: any): any {
    const sensitiveFields = ['password', 'ssn', 'creditCard', 'apiKey'];

    if (Array.isArray(data)) {
      return data.map(item => this.encryptDataFields(item));
    }

    if (typeof data === 'object' && data !== null) {
      const encrypted = { ...data };

      for (const field of sensitiveFields) {
        if (encrypted[field]) {
          encrypted[field] = this.encryptionService.encryptField(encrypted[field]);
        }
      }

      return encrypted;
    }

    return data;
  }

  private decryptDataFields(data: any): any {
    const sensitiveFields = ['password', 'ssn', 'creditCard', 'apiKey'];

    if (Array.isArray(data)) {
      return data.map(item => this.decryptDataFields(item));
    }

    if (typeof data === 'object' && data !== null) {
      const decrypted = { ...data };

      for (const field of sensitiveFields) {
        if (decrypted[field]) {
          decrypted[field] = this.encryptionService.decryptField(decrypted[field]);
        }
      }

      return decrypted;
    }

    return data;
  }
}
```

### 2. Database Security

#### Row-Level Security
```sql
-- Enable row-level security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tenants ENABLE ROW LEVEL SECURITY;

-- Create policy for user access
CREATE POLICY user_isolation_policy ON users
  FOR ALL
  TO application_user
  USING (id = current_setting('app.current_user_id')::uuid);

-- Create policy for tenant access
CREATE POLICY tenant_isolation_policy ON tenants
  FOR ALL
  TO application_user
  USING (
    id = current_setting('app.current_tenant_id')::uuid OR
    type = 'CORE'
  );

-- Create policy for user-tenant relationships
CREATE POLICY user_tenant_access_policy ON user_tenants
  FOR ALL
  TO application_user
  USING (
    user_id = current_setting('app.current_user_id')::uuid OR
    tenant_id = current_setting('app.current_tenant_id')::uuid
  );

-- Function to set session context
CREATE OR REPLACE FUNCTION set_tenant_context(tenant_id UUID)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', tenant_id::text, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to set user context
CREATE OR REPLACE FUNCTION set_user_context(user_id UUID)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_user_id', user_id::text, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Database Encryption
```typescript
// src/services/database/database-encryption.service.ts
@Injectable()
export class DatabaseEncryptionService {
  constructor(
    private encryptionService: EncryptionService,
    @Inject('TENANT_DATABASE') private tenantDb: PrismaClient
  ) {}

  // Automatic encryption for sensitive columns
  async createEncryptedRecord(model: string, data: any): Promise<any> {
    const sensitiveFields = this.getSensitiveFields(model);
    const encryptedData = { ...data };

    for (const field of sensitiveFields) {
      if (encryptedData[field]) {
        encryptedData[field] = await this.encryptionService.encrypt(encryptedData[field]);
      }
    }

    return (this.tenantDb as any)[model].create({
      data: encryptedData
    });
  }

  async findAndDecryptRecords(model: string, where: any): Promise<any[]> {
    const records = await (this.tenantDb as any)[model].findMany({
      where
    });

    const sensitiveFields = this.getSensitiveFields(model);

    return records.map(record => this.decryptRecord(record, sensitiveFields));
  }

  private getSensitiveFields(model: string): string[] {
    const fieldMappings = {
      User: ['email', 'phone', 'ssn', 'address'],
      Tenant: ['settings', 'billing'],
      Service: ['apiCredentials', 'webhookSecret']
    };

    return fieldMappings[model] || [];
  }

  private async decryptRecord(record: any, sensitiveFields: string[]): Promise<any> {
    const decrypted = { ...record };

    for (const field of sensitiveFields) {
      if (decrypted[field]) {
        try {
          decrypted[field] = await this.encryptionService.decrypt(decrypted[field]);
        } catch (error) {
          // If decryption fails, keep the original value
          console.warn(`Failed to decrypt field ${field}:`, error);
        }
      }
    }

    return decrypted;
  }
}
```

## Security Monitoring & Auditing

### 1. Audit Logging System

#### Audit Service
```typescript
// src/services/audit/audit.service.ts
export interface AuditLog {
  id: string;
  userId?: string;
  tenantId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  metadata?: Record<string, any>;
}

@Injectable()
export class AuditService {
  constructor(
    @Inject('AUDIT_DB') private auditDb: PrismaClient,
    private eventService: EventService
  ) {}

  async logAuditEvent(event: AuditEvent): Promise<void> {
    const auditLog: AuditLog = {
      id: uuidv4(),
      userId: event.userId,
      tenantId: event.tenantId,
      action: event.action,
      resource: event.resource,
      resourceId: event.resourceId,
      oldValues: event.oldValues,
      newValues: event.newValues,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      timestamp: new Date(),
      severity: event.severity || 'MEDIUM',
      metadata: event.metadata
    };

    // Store in audit database
    await this.auditDb.auditLog.create({
      data: auditLog
    });

    // Publish audit event for real-time monitoring
    await this.eventService.publish({
      type: 'audit.logged',
      data: auditLog,
      source: 'audit-service'
    });

    // Check for security alerts
    await this.checkSecurityAlerts(auditLog);
  }

  async searchAuditLogs(filters: AuditLogFilters): Promise<AuditLog[]> {
    const where: any = {};

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.tenantId) {
      where.tenantId = filters.tenantId;
    }

    if (filters.action) {
      where.action = filters.action;
    }

    if (filters.resource) {
      where.resource = filters.resource;
    }

    if (filters.dateFrom || filters.dateTo) {
      where.timestamp = {};
      if (filters.dateFrom) {
        where.timestamp.gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        where.timestamp.lte = filters.dateTo;
      }
    }

    if (filters.severity) {
      where.severity = filters.severity;
    }

    return this.auditDb.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: filters.limit || 100,
      skip: filters.offset || 0
    });
  }

  private async checkSecurityAlerts(auditLog: AuditLog): Promise<void> {
    // Check for suspicious patterns
    const alerts = [];

    // Multiple failed logins
    if (auditLog.action === 'login.failed') {
      const recentFailures = await this.getRecentFailedLogins(
        auditLog.userId!,
        auditLog.ipAddress
      );

      if (recentFailures >= 5) {
        alerts.push({
          type: 'BRUTE_FORCE_ATTACK',
          severity: 'HIGH',
          message: 'Multiple failed login attempts detected',
          userId: auditLog.userId,
          ipAddress: auditLog.ipAddress
        });
      }
    }

    // Privilege escalation
    if (auditLog.action === 'role.assigned' && auditLog.newValues?.role === 'ADMIN') {
      alerts.push({
        type: 'PRIVILEGE_ESCALATION',
        severity: 'HIGH',
        message: 'Admin role assigned to user',
        userId: auditLog.resourceId,
        assignedBy: auditLog.userId
      });
    }

    // Data export
    if (auditLog.action === 'data.exported') {
      alerts.push({
        type: 'DATA_EXPORT',
        severity: 'MEDIUM',
        message: 'Large data export detected',
        userId: auditLog.userId,
        resource: auditLog.resource
      });
    }

    // Send alerts
    for (const alert of alerts) {
      await this.sendSecurityAlert(alert);
    }
  }

  private async getRecentFailedLogins(userId: string, ipAddress: string): Promise<number> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    return this.auditDb.auditLog.count({
      where: {
        userId,
        ipAddress,
        action: 'login.failed',
        timestamp: { gte: fiveMinutesAgo }
      }
    });
  }

  private async sendSecurityAlert(alert: SecurityAlert): Promise<void> {
    // Store alert in database
    await this.auditDb.securityAlert.create({
      data: {
        ...alert,
        id: uuidv4(),
        timestamp: new Date(),
        status: 'OPEN'
      }
    });

    // Send notification
    await this.eventService.publish({
      type: 'security.alert',
      data: alert,
      source: 'audit-service'
    });
  }
}
```

### 2. Real-time Security Monitoring

#### Security Monitoring Service
```typescript
// src/services/monitoring/security-monitoring.service.ts
@Injectable()
export class SecurityMonitoringService {
  private readonly suspiciousPatterns = new Map<string, SuspiciousPattern>();
  private readonly rateLimiters = new Map<string, RateLimiter>();

  constructor(
    private auditService: AuditService,
    private alertService: AlertService,
    private redis: Redis
  ) {
    this.initializeSuspiciousPatterns();
    this.setupEventHandlers();
  }

  async analyzeSecurityEvent(event: AuditLog): Promise<void> {
    // Analyze for various security threats
    await Promise.all([
      this.detectBruteForceAttack(event),
      this.detectUnusualAccessPatterns(event),
      this.detectPrivilegeAbuse(event),
      this.detectDataExfiltration(event),
      this.detectMaliciousRequests(event)
    ]);
  }

  private async detectBruteForceAttack(event: AuditLog): Promise<void> {
    if (event.action !== 'login.failed') return;

    const key = `brute_force:${event.ipAddress}`;
    const attempts = await this.redis.incr(key);

    if (attempts === 1) {
      await this.redis.expire(key, 300); // 5 minutes
    }

    if (attempts >= 10) {
      await this.triggerSecurityAlert({
        type: 'BRUTE_FORCE_ATTACK',
        severity: 'CRITICAL',
        source: 'security-monitoring',
        data: {
          ipAddress: event.ipAddress,
          attempts,
          timeWindow: '5 minutes'
        }
      });

      // Block IP address temporarily
      await this.blockIPAddress(event.ipAddress, 3600); // 1 hour
    }
  }

  private async detectUnusualAccessPatterns(event: AuditLog): Promise<void> {
    if (!event.userId) return;

    const key = `access_pattern:${event.userId}`;
    const recentAccess = await this.redis.lrange(key, 0, -1);

    // Get current hour
    const currentHour = new Date().getHours();
    const accessTimes = recentAccess.map(time => parseInt(time));

    // Check for unusual access time
    if (accessTimes.length > 0) {
      const avgHour = accessTimes.reduce((a, b) => a + b, 0) / accessTimes.length;
      const hourDiff = Math.abs(currentHour - avgHour);

      if (hourDiff > 8 && accessTimes.length >= 5) { // Unusual time
        await this.triggerSecurityAlert({
          type: 'UNUSUAL_ACCESS_TIME',
          severity: 'MEDIUM',
          source: 'security-monitoring',
          data: {
            userId: event.userId,
            currentHour,
            usualHour: Math.round(avgHour),
            accessHistory: accessTimes.length
          }
        });
      }
    }

    // Update access pattern
    await this.redis.lpush(key, currentHour.toString());
    await this.redis.ltrim(key, 0, 99); // Keep last 100 accesses
    await this.redis.expire(key, 30 * 24 * 60 * 60); // 30 days
  }

  private async detectPrivilegeAbuse(event: AuditLog): Promise<void> {
    const adminActions = [
      'user.role.changed',
      'tenant.settings.updated',
      'service.registered',
      'system.config.updated'
    ];

    if (!adminActions.includes(event.action)) return;

    const key = `admin_actions:${event.userId}`;
    const recentActions = await this.redis.incr(key);

    if (recentActions === 1) {
      await this.redis.expire(key, 3600); // 1 hour
    }

    if (recentActions >= 20) {
      await this.triggerSecurityAlert({
        type: 'EXCESSIVE_ADMIN_ACTIONS',
        severity: 'HIGH',
        source: 'security-monitoring',
        data: {
          userId: event.userId,
          actionCount: recentActions,
          timeWindow: '1 hour'
        }
      });
    }
  }

  private async detectDataExfiltration(event: AuditLog): Promise<void> {
    const dataActions = ['data.exported', 'data.downloaded', 'reports.generated'];

    if (!dataActions.includes(event.action)) return;

    const key = `data_export:${event.userId}`;
    const exportCount = await this.redis.incr(key);

    if (exportCount === 1) {
      await this.redis.expire(key, 86400); // 24 hours
    }

    if (exportCount >= 50) {
      await this.triggerSecurityAlert({
        type: 'POTENTIAL_DATA_EXFILTRATION',
        severity: 'HIGH',
        source: 'security-monitoring',
        data: {
          userId: event.userId,
          exportCount,
          timeWindow: '24 hours'
        }
      });
    }
  }

  private async blockIPAddress(ipAddress: string, duration: number): Promise<void> {
    await this.redis.setex(`blocked_ip:${ipAddress}`, duration, '1');

    await this.auditService.logAuditEvent({
      action: 'ip.blocked',
      resource: 'ip_address',
      resourceId: ipAddress,
      metadata: { duration, reason: 'Brute force attack' },
      severity: 'HIGH'
    });
  }

  private async triggerSecurityAlert(alert: SecurityAlertEvent): Promise<void> {
    // Store alert
    await this.alertService.createAlert(alert);

    // Send notifications
    await this.sendAlertNotifications(alert);

    // Log audit event
    await this.auditService.logAuditEvent({
      action: 'security.alert.triggered',
      resource: 'security_monitoring',
      metadata: alert,
      severity: alert.severity
    });
  }

  private initializeSuspiciousPatterns(): void {
    // Define patterns for suspicious activities
    this.suspiciousPatterns.set('RAPID_API_CALLS', {
      threshold: 100,
      timeWindow: 60000, // 1 minute
      severity: 'HIGH'
    });

    this.suspiciousPatterns.set('MULTIPLE_TENANT_ACCESS', {
      threshold: 5,
      timeWindow: 300000, // 5 minutes
      severity: 'MEDIUM'
    });

    this.suspiciousPatterns.set('FAILED_AUTHENTICATION', {
      threshold: 10,
      timeWindow: 300000, // 5 minutes
      severity: 'CRITICAL'
    });
  }

  private setupEventHandlers(): void {
    // Listen for audit events
    this.eventService.subscribe('audit.logged', (event) => {
      this.analyzeSecurityEvent(event.data);
    });
  }
}
```

## Infrastructure Security

### 1. Container Security

#### Docker Security Configuration
```dockerfile
# Dockerfile security best practices
FROM node:18-alpine AS base

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Set security-related labels
LABEL maintainer="security@company.com"
LABEL version="1.0"
LABEL security.scan="enabled"

# Install security updates
RUN apk update && apk upgrade && \
    apk add --no-cache dumb-init

# Set secure file permissions
COPY --chown=nextjs:nodejs . .
USER nextjs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Use minimal base image for production
FROM node:18-alpine AS production
RUN apk add --no-cache curl
USER nextjs

EXPOSE 3000
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
```

#### Security Scanning Pipeline
```yaml
# .github/workflows/security-scan.yml
name: Security Scan

on: [push, pull_request]

jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'

      - name: Upload Trivy scan results
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'

      - name: Run npm audit
        run: npm audit --audit-level=high

      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high
```

### 2. Network Security

#### Firewall Configuration
```typescript
// src/common/middleware/firewall.middleware.ts
@Injectable()
export class FirewallMiddleware implements NestMiddleware {
  private readonly rateLimiter = new Map<string, RateLimitInfo>();
  private readonly blockedIPs = new Set<string>();

  constructor(
    private configService: ConfigService,
    private redis: Redis
  ) {
    this.loadBlockedIPs();
    this.startCleanupInterval();
  }

  async use(req: Request, res: Response, next: NextFunction) {
    const clientIP = this.getClientIP(req);

    // Check if IP is blocked
    if (this.isIPBlocked(clientIP)) {
      res.status(403).json({
        error: 'Access Denied',
        message: 'Your IP address has been blocked'
      });
      return;
    }

    // Rate limiting
    if (await this.isRateLimited(clientIP)) {
      res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded'
      });
      return;
    }

    // Request validation
    if (!this.validateRequest(req)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid request format'
      });
      return;
    }

    // Security headers
    this.setSecurityHeaders(res);

    next();
  }

  private async isRateLimited(ip: string): Promise<boolean> {
    const key = `rate_limit:${ip}`;
    const requests = await this.redis.incr(key);

    if (requests === 1) {
      await this.redis.expire(key, 60); // 1 minute window
    }

    const limit = this.configService.get('RATE_LIMIT_PER_MINUTE', 100);
    return requests > limit;
  }

  private validateRequest(req: Request): boolean {
    // Check request size
    const contentLength = parseInt(req.headers['content-length'] || '0');
    const maxRequestSize = 10 * 1024 * 1024; // 10MB

    if (contentLength > maxRequestSize) {
      return false;
    }

    // Check user agent
    const userAgent = req.headers['user-agent'] || '';
    if (this.isSuspiciousUserAgent(userAgent)) {
      return false;
    }

    // Check for common attack patterns
    const url = req.url;
    if (this.containsAttackPatterns(url)) {
      return false;
    }

    return true;
  }

  private setSecurityHeaders(res: Response): void {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Content-Security-Policy', "default-src 'self'");
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  }

  private containsAttackPatterns(url: string): boolean {
    const attackPatterns = [
      /\.\./,           // Directory traversal
      /<script/i,       // XSS
      /union.*select/i, // SQL injection
      /javascript:/i,   // JavaScript protocol
      /data:.*base64/i  // Data URI
    ];

    return attackPatterns.some(pattern => pattern.test(url));
  }

  private async loadBlockedIPs(): Promise<void> {
    const blockedIPs = await this.redis.smembers('blocked_ips');
    blockedIPs.forEach(ip => this.blockedIPs.add(ip));
  }

  private isIPBlocked(ip: string): boolean {
    return this.blockedIPs.has(ip);
  }

  private startCleanupInterval(): void {
    setInterval(() => {
      this.loadBlockedIPs();
    }, 60000); // Refresh every minute
  }

  private getClientIP(req: Request): string {
    return (
      req.headers['x-forwarded-for'] as string ||
      req.headers['x-real-ip'] as string ||
      req.connection.remoteAddress ||
      'unknown'
    ).split(',')[0].trim();
  }
}
```

## Compliance & Governance

### 1. GDPR Compliance

#### Data Protection Implementation
```typescript
// src/services/gdpr/gdpr.service.ts
@Injectable()
export class GDPRService {
  constructor(
    private userService: UserService,
    private auditService: AuditService,
    private encryptionService: EncryptionService
  ) {}

  async exportUserData(userId: string, tenantId: string): Promise<UserDataExport> {
    // Collect all user data
    const [user, userTenants, activities, preferences] = await Promise.all([
      this.userService.findById(userId),
      this.userService.getUserTenants(userId),
      this.auditService.getUserActivities(userId),
      this.userService.getUserPreferences(userId)
    ]);

    const exportData: UserDataExport = {
      personalData: {
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      tenantAccess: userTenants.map(ut => ({
        tenantId: ut.tenantId,
        tenantName: ut.tenant.name,
        role: ut.role.name,
        joinedAt: ut.createdAt
      })),
      activities: activities.map(activity => ({
        action: activity.action,
        resource: activity.resource,
        timestamp: activity.timestamp,
        ipAddress: activity.ipAddress
      })),
      preferences: preferences,
      exportDate: new Date(),
      exportFormat: 'JSON'
    };

    // Log export activity
    await this.auditService.logAuditEvent({
      userId,
      tenantId,
      action: 'data.exported',
      resource: 'user_data',
      resourceId: userId,
      metadata: { format: 'JSON' },
      severity: 'MEDIUM'
    });

    return exportData;
  }

  async deleteUserData(userId: string, tenantId: string, reason: string): Promise<void> {
    // Verify deletion request
    await this.verifyDeletionRequest(userId, reason);

    // Anonymize user data instead of hard delete for audit purposes
    await this.anonymizeUserData(userId);

    // Delete sensitive data
    await this.deleteSensitiveUserData(userId);

    // Revoke all access tokens
    await this.revokeAllTokens(userId);

    // Log deletion activity
    await this.auditService.logAuditEvent({
      userId,
      tenantId,
      action: 'data.deleted',
      resource: 'user_data',
      resourceId: userId,
      metadata: { reason },
      severity: 'HIGH'
    });
  }

  private async anonymizeUserData(userId: string): Promise<void> {
    const anonymizedData = {
      email: `deleted-${userId}@deleted.com`,
      name: 'Deleted User',
      phone: null,
      address: null,
      status: 'DELETED',
      deletedAt: new Date()
    };

    await this.userService.update(userId, anonymizedData);
  }

  private async deleteSensitiveUserData(userId: string): Promise<void> {
    // Delete user preferences
    await this.userService.deleteUserPreferences(userId);

    // Delete user sessions
    await this.userService.deleteAllSessions(userId);

    // Delete user audit logs (if configured)
    const retainAuditLogs = this.configService.get('RETAIN_AUDIT_LOGS', true);
    if (!retainAuditLogs) {
      await this.auditService.deleteUserLogs(userId);
    }
  }

  async processDataSubjectRequest(request: DataSubjectRequest): Promise<void> {
    // Validate request
    await this.validateDataSubjectRequest(request);

    switch (request.type) {
      case 'EXPORT':
        const exportData = await this.exportUserData(request.userId, request.tenantId);
        await this.sendExportData(request.contactEmail, exportData);
        break;

      case 'DELETE':
        await this.deleteUserData(request.userId, request.tenantId, request.reason);
        await this.sendDeletionConfirmation(request.contactEmail);
        break;

      case 'CORRECT':
        await this.correctUserData(request.userId, request.tenantId, request.corrections);
        await this.sendCorrectionConfirmation(request.contactEmail);
        break;

      case 'RESTRICT':
        await this.restrictUserData(request.userId, request.tenantId);
        await this.sendRestrictionConfirmation(request.contactEmail);
        break;
    }
  }
}
```

---

**Document Version**: 1.0
**Last Updated**: 30 Oktober 2025
**Next Document**: [06-Deployment-Architecture.md](./06-deployment-architecture.md)