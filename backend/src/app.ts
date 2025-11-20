import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import { errorHandler } from './middleware/error.middleware';
import { authMiddleware } from './middleware/auth.middleware';

// Import routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import tenantRoutes from './routes/tenant.routes';
import adminRoutes from './routes/admin.routes';
import roleRoutes from './routes/role.routes';
import menuRoutes, { publicMenuRoutes } from './routes/menu.routes';

const app = express();
const PORT = process.env.PORT || 3000;

// Test route paling awal - sebelum middleware apapun
app.get('/test-awal', (req, res) => {
  res.json({
    success: true,
    message: 'Test route paling awal berhasil',
    timestamp: new Date().toISOString()
  });
});

// Middleware
app.use(helmet()); // Security headers
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
  credentials: true,
}));
app.use(morgan('combined')); // Logging
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Debug route - langsung di app.ts
app.get('/debug/test', (req, res) => {
  res.json({
    success: true,
    message: 'Debug route working',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', authMiddleware, userRoutes);
app.use('/api/v1/tenants', authMiddleware, tenantRoutes);
app.use('/api/v1/admin', authMiddleware, adminRoutes);
app.use('/api/v1/roles', authMiddleware, roleRoutes);

// Public menu routes (no authentication required) - must be before private routes
app.use('/api/v1/menus/public', publicMenuRoutes);

// Private menu routes (authentication required)
app.use('/api/v1/menus', authMiddleware, menuRoutes);



// Test route before 404 handler
app.get('/test-sebelum-404', (req, res) => {
  res.json({
    success: true,
    message: 'Test route sebelum 404 handler berhasil',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.originalUrl,
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

export default app;