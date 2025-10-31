import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../database/database.service';
import { logger } from '../utils/logger';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    tenantId?: string;
    role?: string;
  };
  tenant?: {
    id: string;
    name: string;
    slug: string;
  };
}

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Access token required',
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        currentTenantId: true,
        tokenVersion: true,
      },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    if (user.status !== 'ACTIVE') {
      res.status(401).json({
        success: false,
        message: 'User account is not active',
      });
      return;
    }

    // Check token version
    if (user.tokenVersion !== decoded.tokenVersion) {
      res.status(401).json({
        success: false,
        message: 'Token has been revoked',
      });
      return;
    }

    // Get current tenant if set
    let currentTenant = null;
    if (user.currentTenantId) {
      currentTenant = await prisma.tenant.findUnique({
        where: { id: user.currentTenantId },
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
        },
      });

      // If tenant not found or not active, just continue without tenant context
      // Don't block the request - let individual endpoints handle tenant requirements
      if (!currentTenant || currentTenant.status !== 'ACTIVE') {
        currentTenant = null;
      }
    }

    // Attach user and tenant to request
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      ...(user.currentTenantId && { tenantId: user.currentTenantId }),
    };

    if (currentTenant) {
      req.tenant = currentTenant;
    }

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        message: 'Invalid token',
      });
      return;
    }

    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        message: 'Token expired',
      });
      return;
    }

    logger.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const requireTenant = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.tenant) {
    res.status(400).json({
      success: false,
      message: 'Tenant context required',
    });
    return;
  }
  next();
};