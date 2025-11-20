import { Request, Response, NextFunction } from 'express'
import { AuthenticatedRequest } from '../middleware/auth.middleware'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Tenant Isolation Middleware
 * Ensures all API requests are properly isolated by tenant
 */
export const tenantIsolation = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // Skip tenant isolation for:
    // 1. Auth endpoints (login, register, refresh)
    // 2. Health checks
    // 3. Public endpoints
    // 4. Super admin with explicit override
    const isAuthEndpoint = req.path.includes('/auth/') ||
                          req.path.includes('/health')

    const isPublicEndpoint = req.path.includes('/menus/public/') ||
                           req.path.includes('/public/')

    if (isAuthEndpoint || isPublicEndpoint) {
      return next()
    }

    // Get tenant ID from header
    const tenantId = req.headers['x-tenant-id'] as string
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      })
    }

    // Get user's current tenant assignment
    const userAssignment = await prisma.userAssignment.findFirst({
      where: {
        userId: userId,
        status: 'ACTIVE'
      },
      include: {
        tenant: true,
        role: true
      }
    })

    if (!userAssignment) {
      return res.status(403).json({
        success: false,
        message: 'No active tenant assignment found'
      })
    }

    // Check if user has super admin privileges
    const isSuperAdmin = userAssignment.role.level === 'SUPER_ADMIN' && userAssignment.tenant.type === 'CORE'

    // For super admin, allow access to any tenant but track the requested tenant
    if (isSuperAdmin && tenantId) {
      // Verify the requested tenant exists
      const requestedTenant = await prisma.tenant.findUnique({
        where: { id: tenantId }
      })

      if (!requestedTenant) {
        return res.status(404).json({
          success: false,
          message: 'Requested tenant not found'
        })
      }

      // Set tenant context for super admin
      req.tenantContext = {
        id: tenantId,
        isSuperAdmin: true,
        originalTenantId: userAssignment.tenantId
      }

      console.log(`Super Admin ${userId} accessing tenant ${tenantId}`)
      return next()
    }

    // For regular users, enforce strict tenant isolation
    if (!tenantId) {
      // No tenant ID provided, use user's assigned tenant
      req.tenantContext = {
        id: userAssignment.tenantId,
        isSuperAdmin: false
      }
      return next()
    }

    // Verify user is assigned to the requested tenant
    if (userAssignment.tenantId !== tenantId) {
      console.warn(`User ${userId} attempted to access tenant ${tenantId} but is assigned to ${userAssignment.tenantId}`)

      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not assigned to this tenant'
      })
    }

    // Set tenant context
    req.tenantContext = {
      id: tenantId,
      isSuperAdmin: false
    }

    console.log(`User ${userId} accessing tenant ${tenantId}`)
    next()
  } catch (error) {
    console.error('Tenant isolation middleware error:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error during tenant isolation'
    })
  }
}

/**
 * Enhanced Prisma query builder with tenant filtering
 */
export class TenantQueryBuilder {
  constructor(private tenantId: string, private isSuperAdmin: boolean = false) {}

  /**
   * Add tenant filter to Prisma query
   */
  withTenantFilter(query: any, tenantField: string = 'tenantId'): any {
    if (!this.tenantId) return query

    // Super admin can bypass tenant filtering if explicitly requested
    if (this.isSuperAdmin) {
      return query
    }

    return {
      ...query,
      where: {
        ...query.where,
        [tenantField]: this.tenantId
      }
    }
  }

  /**
   * Filter array results by tenant
   */
  filterResults<T extends Record<string, any>>(results: T[], tenantField: string = 'tenantId'): T[] {
    if (!this.tenantId) return results
    if (this.isSuperAdmin) return results

    return results.filter(item => item[tenantField] === this.tenantId)
  }
}

/**
 * Helper function to get tenant query builder from request
 */
export function getTenantQueryBuilder(req: AuthenticatedRequest): TenantQueryBuilder {
  const tenantId = req.tenantContext?.id || ''
  const isSuperAdmin = req.tenantContext?.isSuperAdmin || false

  return new TenantQueryBuilder(tenantId, isSuperAdmin)
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      tenantContext?: {
        id: string
        isSuperAdmin: boolean
        originalTenantId?: string
      }
    }
  }
}