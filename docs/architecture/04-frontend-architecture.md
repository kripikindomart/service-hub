# Frontend Architecture - Multi-Tenant Service Management Platform

## Frontend Overview

Frontend menggunakan **Modern React Architecture** dengan Next.js 16+ dan App Router, dirancang untuk mendukung multi-tenant dengan branding yang dapat dikustomisasi, dynamic forms, dan responsive design.

## Technology Stack

### Core Technologies
- **Framework**: Next.js 16+ dengan App Router
- **Language**: TypeScript 5.0+
- **UI Library**: Tailwind CSS + Shadcn/ui
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **Forms**: React Hook Form + Zod validation
- **Routing**: Next.js App Router dengan dynamic routes
- **Authentication**: NextAuth.js dengan custom providers

### Development Tools
- **Package Manager**: pnpm
- **Code Quality**: ESLint + Prettier + Husky
- **Testing**: Jest + React Testing Library + Playwright
- **Build**: Next.js built-in optimization
- **Icons**: Lucide React
- **Charts**: Recharts
- **Date Handling**: date-fns

## Project Structure

```
frontend/
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── (auth)/             # Authentication routes
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   └── reset-password/
│   │   ├── (dashboard)/        # Dashboard routes
│   │   │   ├── layout.tsx      # Dashboard layout
│   │   │   ├── page.tsx        # Dashboard home
│   │   │   ├── settings/       # Settings pages
│   │   │   ├── users/          # User management
│   │   │   └── services/       # Service pages
│   │   ├── (admin)/            # Admin routes
│   │   │   ├── layout.tsx      # Admin layout
│   │   │   ├── tenants/        # Tenant management
│   │   │   ├── services/       # Service registry
│   │   │   └── system/         # System settings
│   │   ├── api/                # API routes
│   │   │   ├── auth/           # Auth API routes
│   │   │   ├── webhooks/       # Webhook handlers
│   │   │   └── proxy/          # API proxy
│   │   ├── globals.css         # Global styles
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Home page
│   │   └── loading.tsx         # Global loading
│   ├── components/             # Reusable components
│   │   ├── ui/                 # Base UI components (shadcn/ui)
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── modal.tsx
│   │   │   ├── table.tsx
│   │   │   └── ...
│   │   ├── layout/             # Layout components
│   │   │   ├── Header.tsx      # App header
│   │   │   ├── Sidebar.tsx     # Navigation sidebar
│   │   │   ├── Footer.tsx      # App footer
│   │   │   └── TenantSwitcher.tsx
│   │   ├── auth/               # Auth components
│   │   │   ├── LoginForm.tsx
│   │   │   ├── RegisterForm.tsx
│   │   │   └── PasswordResetForm.tsx
│   │   ├── forms/              # Dynamic form components
│   │   │   ├── DynamicForm.tsx
│   │   │   ├── FormField.tsx
│   │   │   └── FormValidation.tsx
│   │   ├── services/           # Service-related components
│   │   │   ├── ServiceCard.tsx
│   │   │   ├── ServiceForm.tsx
│   │   │   └── ServiceDashboard.tsx
│   │   └── common/             # Common components
│   │       ├── Loading.tsx
│   │       ├── ErrorBoundary.tsx
│   │       └── Notification.tsx
│   ├── hooks/                  # Custom React hooks
│   │   ├── useAuth.ts          # Authentication hook
│   │   ├── useTenant.ts        # Tenant management hook
│   │   ├── useServices.ts      # Service management hook
│   │   ├── usePermissions.ts   # Permission checking hook
│   │   ├── useForms.ts         # Dynamic form hook
│   │   └── useLocalStorage.ts  # Local storage hook
│   ├── stores/                 # Zustand stores
│   │   ├── authStore.ts        # Authentication state
│   │   ├── tenantStore.ts      # Tenant state
│   │   ├── serviceStore.ts     # Service state
│   │   ├── menuStore.ts        # Menu state
│   │   └── uiStore.ts          # UI state
│   ├── services/               # API services
│   │   ├── api.ts              # Base API client
│   │   ├── authService.ts      # Authentication API
│   │   ├── tenantService.ts    # Tenant API
│   │   ├── serviceRegistry.ts  # Service registry API
│   │   ├── formService.ts      # Form API
│   │   └── menuService.ts      # Menu API
│   ├── types/                  # TypeScript type definitions
│   │   ├── auth.ts             # Auth types
│   │   ├── tenant.ts           # Tenant types
│   │   ├── service.ts          # Service types
│   │   ├── form.ts             # Form types
│   │   └── api.ts              # API response types
│   ├── utils/                  # Utility functions
│   │   ├── validation.ts       # Validation utilities
│   │   ├── formatting.ts       # Formatting utilities
│   │   ├── permissions.ts      # Permission utilities
│   │   └── storage.ts          # Storage utilities
│   ├── constants/              # Application constants
│   │   ├── routes.ts           # Route constants
│   │   ├── permissions.ts      # Permission constants
│   │   └── config.ts           # Config constants
│   └── styles/                 # Style files
│       ├── globals.css         # Global styles
│       └── components.css      # Component-specific styles
├── public/                     # Static assets
│   ├── icons/                  # Icon files
│   ├── images/                 # Image files
│   └── fonts/                  # Font files
├── tests/                      # Test files
│   ├── __mocks__/              # Mock files
│   ├── components/             # Component tests
│   ├── hooks/                  # Hook tests
│   ├── utils/                  # Utility tests
│   └── e2e/                    # E2E tests
├── docs/                       # Documentation
├── .env.example                # Environment variables example
├── next.config.js              # Next.js configuration
├── tailwind.config.js          # Tailwind CSS configuration
├── tsconfig.json               # TypeScript configuration
└── package.json                # Dependencies and scripts
```

## Core Architecture Patterns

### 1. Authentication Architecture

#### Auth Store (Zustand)
```typescript
// src/stores/authStore.ts
interface AuthState {
  // User state
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Tenant state
  currentTenant: Tenant | null;
  availableTenants: Tenant[];

  // Token management
  accessToken: string | null;
  refreshToken: string | null;

  // Permissions
  permissions: string[];
  roles: string[];

  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  switchTenant: (tenantId: string) => Promise<void>;
  refreshToken: () => Promise<void>;
  updateProfile: (data: UpdateProfileData) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  // Initial state
  user: null,
  isAuthenticated: false,
  isLoading: false,
  currentTenant: null,
  availableTenants: [],
  accessToken: null,
  refreshToken: null,
  permissions: [],
  roles: [],

  // Login action
  login: async (credentials: LoginCredentials) => {
    set({ isLoading: true });

    try {
      const response = await authService.login(credentials);
      const { user, tenants, tokens } = response.data;

      // Set tokens
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);

      // Find primary tenant or first available
      const primaryTenant = tenants.find(t => t.isPrimary) || tenants[0];

      set({
        user,
        isAuthenticated: true,
        currentTenant: primaryTenant,
        availableTenants: tenants,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        permissions: primaryTenant?.permissions || [],
        roles: primaryTenant?.roles || [],
        isLoading: false
      });

      // Initialize user-specific data
      await get().initializeUserData(primaryTenant.id);

    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  // Switch tenant action
  switchTenant: async (tenantId: string) => {
    const { availableTenants } = get();
    const newTenant = availableTenants.find(t => t.id === tenantId);

    if (!newTenant) {
      throw new Error('Tenant not found');
    }

    try {
      // Call tenant switch API
      const response = await authService.switchTenant(tenantId);
      const { user, permissions, roles } = response.data;

      set({
        currentTenant: newTenant,
        user,
        permissions,
        roles
      });

      // Re-initialize user data for new tenant
      await get().initializeUserData(tenantId);

    } catch (error) {
      throw error;
    }
  },

  // Refresh token action
  refreshToken: async () => {
    const { refreshToken } = get();

    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await authService.refreshToken(refreshToken);
      const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;

      localStorage.setItem('accessToken', newAccessToken);
      if (newRefreshToken) {
        localStorage.setItem('refreshToken', newRefreshToken);
      }

      set({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken || refreshToken
      });

    } catch (error) {
      // Refresh failed, logout user
      get().logout();
      throw error;
    }
  },

  // Logout action
  logout: async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local state
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');

      set({
        user: null,
        isAuthenticated: false,
        currentTenant: null,
        availableTenants: [],
        accessToken: null,
        refreshToken: null,
        permissions: [],
        roles: []
      });
    }
  },

  // Initialize user data
  initializeUserData: async (tenantId: string) => {
    // Load user menus
    const menuStore = get().menuStore;
    await menuStore.loadUserMenus(tenantId);

    // Load user preferences
    // Load other user-specific data
  }
}));
```

#### Auth Hook
```typescript
// src/hooks/useAuth.ts
export function useAuth() {
  const authStore = useAuthStore();

  // Auto-refresh token
  useEffect(() => {
    if (!authStore.accessToken) return;

    const refreshInterval = setInterval(async () => {
      try {
        await authStore.refreshToken();
      } catch (error) {
        console.error('Token refresh failed:', error);
      }
    }, 14 * 60 * 1000); // Refresh every 14 minutes

    return () => clearInterval(refreshInterval);
  }, [authStore.accessToken]);

  // Check permissions
  const hasPermission = useCallback((permission: string) => {
    return authStore.permissions.includes('*') ||
           authStore.permissions.includes(permission) ||
           authStore.permissions.some(p => p.endsWith(':*') && permission.startsWith(p.slice(0, -2)));
  }, [authStore.permissions]);

  // Check role
  const hasRole = useCallback((role: string) => {
    return authStore.roles.includes('SUPER_ADMIN') ||
           authStore.roles.includes(role);
  }, [authStore.roles]);

  return {
    ...authStore,
    hasPermission,
    hasRole
  };
}
```

### 2. Multi-Tenant Architecture

#### Tenant Store
```typescript
// src/stores/tenantStore.ts
interface TenantState {
  tenant: Tenant | null;
  branding: TenantBranding | null;
  features: TenantFeatures | null;
  settings: TenantSettings | null;

  // Actions
  loadTenant: (tenantId: string) => Promise<void>;
  updateBranding: (branding: Partial<TenantBranding>) => Promise<void>;
  updateSettings: (settings: Partial<TenantSettings>) => Promise<void>;
  refreshTenant: () => Promise<void>;
}

export const useTenantStore = create<TenantState>((set, get) => ({
  tenant: null,
  branding: null,
  features: null,
  settings: null,

  loadTenant: async (tenantId: string) => {
    try {
      const [tenant, branding, features, settings] = await Promise.all([
        tenantService.getTenant(tenantId),
        tenantService.getTenantBranding(tenantId),
        tenantService.getTenantFeatures(tenantId),
        tenantService.getTenantSettings(tenantId)
      ]);

      set({
        tenant,
        branding,
        features,
        settings
      });

      // Apply custom CSS variables for branding
      get().applyBrandingStyles(branding);

    } catch (error) {
      console.error('Failed to load tenant:', error);
      throw error;
    }
  },

  applyBrandingStyles: (branding: TenantBranding | null) => {
    if (!branding) return;

    const root = document.documentElement;
    root.style.setProperty('--primary-color', branding.primaryColor);
    root.style.setProperty('--secondary-color', branding.secondaryColor);
    root.style.setProperty('--accent-color', branding.accentColor);

    // Update favicon
    if (branding.faviconUrl) {
      const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
      if (favicon) {
        favicon.href = branding.faviconUrl;
      }
    }
  },

  updateBranding: async (brandingUpdate: Partial<TenantBranding>) => {
    const { tenant } = get();
    if (!tenant) throw new Error('No active tenant');

    try {
      const updatedBranding = await tenantService.updateBranding(
        tenant.id,
        brandingUpdate
      );

      set(state => ({
        branding: { ...state.branding, ...updatedBranding }
      }));

      // Reapply styles
      get().applyBrandingStyles(updatedBranding);

    } catch (error) {
      console.error('Failed to update branding:', error);
      throw error;
    }
  }
}));
```

#### Tenant Switcher Component
```typescript
// src/components/layout/TenantSwitcher.tsx
interface TenantSwitcherProps {
  className?: string;
}

export function TenantSwitcher({ className }: TenantSwitcherProps) {
  const { user, currentTenant, availableTenants, switchTenant } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const handleSwitchTenant = async (tenantId: string) => {
    setIsOpen(false);
    try {
      await switchTenant(tenantId);
      toast.success(`Switched to ${availableTenants.find(t => t.id === tenantId)?.name}`);
    } catch (error) {
      toast.error('Failed to switch tenant');
    }
  };

  if (!currentTenant || availableTenants.length <= 1) {
    return null;
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn("justify-between", className)}
        >
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">{currentTenant.name}</span>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          Switch Tenant
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {availableTenants.map((tenant) => (
          <DropdownMenuItem
            key={tenant.id}
            onClick={() => handleSwitchTenant(tenant.id)}
            className={cn(
              "cursor-pointer",
              currentTenant.id === tenant.id && "bg-accent"
            )}
          >
            <div className="flex items-center gap-2 flex-1">
              <Building2 className="h-4 w-4" />
              <div className="flex flex-col">
                <span className="font-medium">{tenant.name}</span>
                <span className="text-xs text-muted-foreground">
                  {tenant.type} • {tenant.userRole}
                </span>
              </div>
            </div>

            {currentTenant.id === tenant.id && (
              <Check className="h-4 w-4 ml-auto" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### 3. Dynamic Form Architecture

#### Form Store
```typescript
// src/stores/formStore.ts
interface FormState {
  forms: Record<string, FormSchema>;
  submissions: Record<string, FormSubmission[]>;
  isLoading: boolean;

  // Actions
  loadForm: (formId: string) => Promise<void>;
  submitForm: (formId: string, data: Record<string, any>) => Promise<void>;
  getFormSubmissions: (formId: string) => Promise<FormSubmission[]>;
  validateField: (formId: string, fieldName: string, value: any) => ValidationResult;
}

export const useFormStore = create<FormState>((set, get) => ({
  forms: {},
  submissions: {},
  isLoading: false,

  loadForm: async (formId: string) => {
    set({ isLoading: true });

    try {
      const formSchema = await formService.getFormSchema(formId);

      set(state => ({
        forms: { ...state.forms, [formId]: formSchema },
        isLoading: false
      }));

    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  submitForm: async (formId: string, data: Record<string, any>) => {
    const form = get().forms[formId];
    if (!form) {
      throw new Error('Form not loaded');
    }

    // Validate form data
    const validation = get().validateForm(formId, data);
    if (!validation.isValid) {
      throw new ValidationError(validation.errors);
    }

    try {
      const submission = await formService.submitForm(formId, data);

      set(state => ({
        submissions: {
          ...state.submissions,
          [formId]: [...(state.submissions[formId] || []), submission]
        }
      }));

      return submission;

    } catch (error) {
      throw error;
    }
  },

  validateField: (formId: string, fieldName: string, value: any) => {
    const form = get().forms[formId];
    if (!form) return { isValid: true };

    const field = form.fields.find(f => f.name === fieldName);
    if (!field) return { isValid: true };

    const errors: string[] = [];

    // Required validation
    if (field.required && (!value || value === '')) {
      errors.push(`${field.label} is required`);
    }

    // Type validation
    if (value && field.type === 'email' && !isValidEmail(value)) {
      errors.push(`${field.label} must be a valid email`);
    }

    // Custom validation rules
    if (field.validation) {
      const customErrors = validateWithRules(value, field.validation);
      errors.push(...customErrors);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  validateForm: (formId: string, data: Record<string, any>) => {
    const form = get().forms[formId];
    if (!form) return { isValid: true, errors: {} };

    const errors: Record<string, string[]> = {};
    let isValid = true;

    for (const field of form.fields) {
      const fieldValidation = get().validateField(formId, field.name, data[field.name]);
      if (!fieldValidation.isValid) {
        errors[field.name] = fieldValidation.errors;
        isValid = false;
      }
    }

    return { isValid, errors };
  }
}));
```

#### Dynamic Form Component
```typescript
// src/components/forms/DynamicForm.tsx
interface DynamicFormProps {
  formId: string;
  onSubmit?: (data: Record<string, any>) => void;
  initialData?: Record<string, any>;
  className?: string;
}

export function DynamicForm({
  formId,
  onSubmit,
  initialData = {},
  className
}: DynamicFormProps) {
  const formStore = useFormStore();
  const form = formStore.forms[formId];
  const isLoading = formStore.isLoading;

  const [formData, setFormData] = useState<Record<string, any>>(initialData);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load form schema
  useEffect(() => {
    if (!form && !isLoading) {
      formStore.loadForm(formId);
    }
  }, [formId, form, isLoading, formStore]);

  // Handle field changes
  const handleFieldChange = useCallback((fieldName: string, value: any) => {
    const newFormData = { ...formData, [fieldName]: value };
    setFormData(newFormData);

    // Validate field
    const validation = formStore.validateField(formId, fieldName, value);

    setErrors(prev => {
      if (validation.isValid) {
        const { [fieldName]: removed, ...rest } = prev;
        return rest;
      } else {
        return { ...prev, [fieldName]: validation.errors };
      }
    });
  }, [formData, formId, formStore]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate entire form
      const validation = formStore.validateForm(formId, formData);
      if (!validation.isValid) {
        setErrors(validation.errors);
        return;
      }

      // Submit form
      const submission = await formStore.submitForm(formId, formData);

      // Call custom onSubmit handler
      if (onSubmit) {
        onSubmit(submission.data);
      }

      toast.success('Form submitted successfully');

    } catch (error) {
      if (error instanceof ValidationError) {
        setErrors(error.errors);
        toast.error('Please fix the validation errors');
      } else {
        toast.error('Failed to submit form');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <FormSkeleton />;
  }

  if (!form) {
    return <div>Form not found</div>;
  }

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-6", className)}>
      <div className="space-y-4">
        {form.fields.map((field) => (
          <FormField
            key={field.name}
            field={field}
            value={formData[field.name]}
            error={errors[field.name]}
            onChange={(value) => handleFieldChange(field.name, value)}
          />
        ))}
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Submitting...
          </>
        ) : (
          form.submitConfig?.buttonText || 'Submit'
        )}
      </Button>
    </form>
  );
}
```

#### Form Field Component
```typescript
// src/components/forms/FormField.tsx
interface FormFieldProps {
  field: FormFieldDefinition;
  value: any;
  error?: string[];
  onChange: (value: any) => void;
}

export function FormField({ field, value, error, onChange }: FormFieldProps) {
  const renderField = () => {
    switch (field.type) {
      case 'text':
      case 'email':
      case 'password':
        return (
          <Input
            type={field.type}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
          />
        );

      case 'textarea':
        return (
          <Textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            rows={field.rows || 3}
            required={field.required}
          />
        );

      case 'select':
        return (
          <Select value={value || ''} onValueChange={onChange}>
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={field.name}
              checked={value || false}
              onCheckedChange={onChange}
            />
            <Label htmlFor={field.name}>{field.label}</Label>
          </div>
        );

      case 'number':
        return (
          <Input
            type="number"
            value={value || ''}
            onChange={(e) => onChange(Number(e.target.value))}
            placeholder={field.placeholder}
            min={field.validation?.min}
            max={field.validation?.max}
            step={field.validation?.step}
            required={field.required}
          />
        );

      case 'date':
        return (
          <Input
            type="date"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
          />
        );

      case 'array':
        return (
          <ArrayField
            field={field}
            value={value || []}
            onChange={onChange}
          />
        );

      default:
        return (
          <Input
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
          />
        );
    }
  };

  return (
    <div className="space-y-2">
      {field.type !== 'checkbox' && (
        <Label htmlFor={field.name}>
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}

      {renderField()}

      {field.description && (
        <p className="text-sm text-muted-foreground">
          {field.description}
        </p>
      )}

      {error && error.length > 0 && (
        <div className="text-sm text-red-500">
          {error.map((err, index) => (
            <p key={index}>{err}</p>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 4. Menu & Navigation Architecture

#### Menu Store
```typescript
// src/stores/menuStore.ts
interface MenuState {
  menus: MenuItem[];
  permissions: string[];
  isLoading: boolean;

  // Actions
  loadUserMenus: (tenantId: string) => Promise<void>;
  setActiveMenu: (menuId: string) => void;
  toggleMenuCollapse: (menuId: string) => void;
  searchMenus: (query: string) => MenuItem[];
}

export const useMenuStore = create<MenuState>((set, get) => ({
  menus: [],
  permissions: [],
  isLoading: false,
  collapsedMenus: new Set(),

  loadUserMenus: async (tenantId: string) => {
    set({ isLoading: true });

    try {
      const menuData = await menuService.getUserMenus(tenantId);

      set({
        menus: menuData.menus,
        permissions: menuData.permissions,
        isLoading: false
      });

    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  setActiveMenu: (menuId: string) => {
    // Update active menu state
    set(state => ({
      menus: state.menus.map(menu => ({
        ...menu,
        isActive: menu.id === menuId,
        children: menu.children?.map(child => ({
          ...child,
          isActive: child.id === menuId
        }))
      }))
    }));
  },

  toggleMenuCollapse: (menuId: string) => {
    set(state => {
      const collapsedMenus = new Set(state.collapsedMenus);
      if (collapsedMenus.has(menuId)) {
        collapsedMenus.delete(menuId);
      } else {
        collapsedMenus.add(menuId);
      }

      return { collapsedMenus };
    });
  },

  searchMenus: (query: string) => {
    const { menus } = get();

    if (!query.trim()) return menus;

    const lowercaseQuery = query.toLowerCase();

    return menus.filter(menu =>
      menu.name.toLowerCase().includes(lowercaseQuery) ||
      menu.children?.some(child =>
        child.name.toLowerCase().includes(lowercaseQuery)
      )
    );
  }
}));
```

#### Sidebar Component
```typescript
// src/components/layout/Sidebar.tsx
interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const { menus, isLoading, setActiveMenu, toggleMenuCollapse } = useMenuStore();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  // Set active menu based on current path
  useEffect(() => {
    const activeMenu = findActiveMenu(menus, pathname);
    if (activeMenu) {
      setActiveMenu(activeMenu.id);
    }
  }, [pathname, menus, setActiveMenu]);

  if (isLoading) {
    return <SidebarSkeleton />;
  }

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-background border-r transition-all duration-300",
        isCollapsed ? "w-16" : "w-64",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        {!isCollapsed && (
          <h2 className="text-lg font-semibold">Menu</h2>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <Menu className="h-4 w-4" />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        <div className="space-y-2">
          {menus.map((menu) => (
            <MenuItem
              key={menu.id}
              menu={menu}
              isCollapsed={isCollapsed}
              onToggleCollapse={() => toggleMenuCollapse(menu.id)}
            />
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t">
        <UserMenu isCollapsed={isCollapsed} />
      </div>
    </div>
  );
}
```

### 5. Performance Optimizations

#### Component Lazy Loading
```typescript
// src/components/lazy/LazyComponents.ts
export const LazyServiceDashboard = lazy(() =>
  import('../services/ServiceDashboard').then(module => ({
    default: module.ServiceDashboard
  }))
);

export const LazyUserManagement = lazy(() =>
  import('../users/UserManagement').then(module => ({
    default: module.UserManagement
  }))
);

export const LazySettings = lazy(() =>
  import('../settings/Settings').then(module => ({
    default: module.Settings
  }))
);
```

#### Route-based Code Splitting
```typescript
// src/app/(dashboard)/services/page.tsx
import dynamic from 'next/dynamic';

const ServiceDashboard = dynamic(() =>
  import('@/components/services/ServiceDashboard'),
  {
    loading: () => <DashboardSkeleton />,
    ssr: false
  }
);

export default function ServicesPage() {
  return (
    <div className="container mx-auto py-6">
      <ServiceDashboard />
    </div>
  );
}
```

#### Image Optimization
```typescript
// src/components/common/OptimizedImage.tsx
interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false
}: OptimizedImageProps) {
  return (
    <div className={cn("relative overflow-hidden", className)}>
      <Image
        src={src}
        alt={alt}
        width={width || 400}
        height={height || 300}
        className="object-cover"
        priority={priority}
        placeholder="blur"
        blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
      />
    </div>
  );
}
```

## Testing Strategy

### Component Testing
```typescript
// tests/components/forms/DynamicForm.test.tsx
describe('DynamicForm', () => {
  const mockForm: FormSchema = {
    id: 'test-form',
    name: 'Test Form',
    fields: [
      {
        name: 'name',
        type: 'text',
        label: 'Name',
        required: true
      },
      {
        name: 'email',
        type: 'email',
        label: 'Email',
        required: true
      }
    ],
    submitConfig: {
      buttonText: 'Submit'
    }
  };

  it('renders form fields correctly', () => {
    render(<DynamicForm formId="test-form" />);

    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    const onSubmit = jest.fn();
    render(<DynamicForm formId="test-form" onSubmit={onSubmit} />);

    const submitButton = screen.getByRole('button', { name: 'Submit' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument();
      expect(screen.getByText('Email is required')).toBeInTheDocument();
    });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits form with valid data', async () => {
    const onSubmit = jest.fn();
    render(<DynamicForm formId="test-form" onSubmit={onSubmit} />);

    const nameInput = screen.getByLabelText('Name');
    const emailInput = screen.getByLabelText('Email');
    const submitButton = screen.getByRole('button', { name: 'Submit' });

    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'John Doe',
        email: 'john@example.com'
      });
    });
  });
});
```

### E2E Testing
```typescript
// tests/e2e/tenant-switching.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Tenant Switching', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'admin@example.com');
    await page.fill('[data-testid="password"]', 'password');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
  });

  test('should switch tenant successfully', async ({ page }) => {
    // Open tenant switcher
    await page.click('[data-testid="tenant-switcher"]');

    // Select different tenant
    await page.click('[data-testid="tenant-item"]:has-text("Second Tenant")');

    // Verify tenant switched
    await expect(page.locator('[data-testid="current-tenant"]')).toHaveText('Second Tenant');

    // Verify page content updated
    await expect(page.locator('h1')).toHaveText('Second Tenant Dashboard');
  });

  test('should maintain user session after tenant switch', async ({ page }) => {
    // Check user is logged in
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();

    // Switch tenant
    await page.click('[data-testid="tenant-switcher"]');
    await page.click('[data-testid="tenant-item"]:has-text("Second Tenant")');

    // Verify user still logged in
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    await expect(page.locator('[data-testid="user-email"]')).toHaveText('admin@example.com');
  });
});
```

## Deployment Configuration

### Next.js Configuration
```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client']
  },

  // Environment variables
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },

  // Image optimization
  images: {
    domains: [
      process.env.NEXT_PUBLIC_CDN_DOMAIN,
      'avatars.githubusercontent.com',
      'lh3.googleusercontent.com'
    ],
    formats: ['image/webp', 'image/avif'],
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          }
        ]
      }
    ];
  },

  // Redirects
  async redirects() {
    return [
      {
        source: '/',
        destination: '/dashboard',
        permanent: false,
        has: [
          {
            type: 'cookie',
            key: 'access_token'
          }
        ]
      }
    ];
  },

  // Webpack configuration
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false
      };
    }
    return config;
  }
};

module.exports = nextConfig;
```

---

**Document Version**: 1.0
**Last Updated**: 30 Oktober 2025
**Next Document**: [05-Security-Architecture.md](./05-security-architecture.md)