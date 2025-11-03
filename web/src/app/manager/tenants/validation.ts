import { z } from 'zod'

export const tenantFormSchema = z.object({
  name: z.string().min(1, 'Tenant name is required').max(100, 'Tenant name must be less than 100 characters'),
  slug: z.string()
    .min(1, 'Slug is required')
    .max(50, 'Slug must be less than 50 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must only contain lowercase letters, numbers, and hyphens')
    .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/, 'Slug must start and end with alphanumeric characters'),
  domain: z.string().optional(),
  type: z.enum(['CORE', 'BUSINESS', 'TRIAL'], {
    errorMap: () => ({ message: 'Please select a valid tenant type' })
  }),
  tier: z.enum(['STARTER', 'PROFESSIONAL', 'ENTERPRISE', 'CUSTOM'], {
    errorMap: () => ({ message: 'Please select a valid tier' })
  }),
  status: z.enum(['ACTIVE', 'INACTIVE', 'PENDING'], {
    errorMap: () => ({ message: 'Please select a valid status' })
  }),
  maxUsers: z.number().min(1, 'Max users must be at least 1').max(10000, 'Max users cannot exceed 10000'),
  maxServices: z.number().min(1, 'Max services must be at least 1').max(1000, 'Max services cannot exceed 1000'),
  storageLimitMb: z.number().min(100, 'Storage limit must be at least 100MB').max(1024000, 'Storage limit cannot exceed 1TB'),
  databaseName: z.string()
    .min(1, 'Database name is required')
    .max(64, 'Database name must be less than 64 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Database name must only contain letters, numbers, and underscores'),
  databaseHost: z.string().optional(),
  databasePort: z.number().min(1, 'Database port must be at least 1').max(65535, 'Database port cannot exceed 65535'),
  primaryColor: z.string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Please enter a valid hex color code'),
  logoUrl: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  faviconUrl: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  customDomain: z.string().optional(),
  settings: z.string().optional(),
  featureFlags: z.string().optional(),
  integrations: z.string().optional(),
})

export const duplicateTenantSchema = z.object({
  name: z.string().min(1, 'Tenant name is required').max(100, 'Tenant name must be less than 100 characters'),
  slug: z.string()
    .min(1, 'Slug is required')
    .max(50, 'Slug must be less than 50 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must only contain lowercase letters, numbers, and hyphens')
    .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/, 'Slug must start and end with alphanumeric characters'),
})

export type TenantFormData = z.infer<typeof tenantFormSchema>
export type DuplicateTenantData = z.infer<typeof duplicateTenantSchema>

export function validateTenantForm(data: unknown): { success: true; data: TenantFormData } | { success: false; errors: Record<string, string[]> } {
  const result = tenantFormSchema.safeParse(data)

  if (!result.success) {
    const errors: Record<string, string[]> = {}
    result.error.issues.forEach((issue) => {
      const field = issue.path.join('.')
      if (!errors[field]) {
        errors[field] = []
      }
      errors[field].push(issue.message)
    })
    return { success: false, errors }
  }

  return { success: true, data: result.data }
}

export function validateDuplicateTenantForm(data: unknown): { success: true; data: DuplicateTenantData } | { success: false; errors: Record<string, string[]> } {
  const result = duplicateTenantSchema.safeParse(data)

  if (!result.success) {
    const errors: Record<string, string[]> = {}
    result.error.issues.forEach((issue) => {
      const field = issue.path.join('.')
      if (!errors[field]) {
        errors[field] = []
      }
      errors[field].push(issue.message)
    })
    return { success: false, errors }
  }

  return { success: true, data: result.data }
}

export function parseJsonField(value: string | undefined, fieldName: string): { success: true; data: any } | { success: false; error: string } {
  if (!value || value.trim() === '') {
    return { success: true, data: undefined }
  }

  try {
    const parsed = JSON.parse(value)
    return { success: true, data: parsed }
  } catch (error) {
    return { success: false, error: `${fieldName} must be valid JSON` }
  }
}