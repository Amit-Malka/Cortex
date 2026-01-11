import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import AppError from './utils/AppError';
import errorHandler from './middleware/errorHandler';
import { initBigIntSerializer } from './utils/bigintSerializer';
import prisma from './lib/prisma';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import driveRoutes from './routes/driveRoutes';
import fileRoutes from './routes/fileRoutes';

// Initialize BigInt serialization for JSON
initBigIntSerializer();

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check route with DB status
app.get('/health', async (_req: Request, res: Response) => {
  let dbStatus = 'disconnected';
  
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch (error) {
    console.error('Database health check failed:', error);
  }

  res.status(200).json({
    status: 'success',
    message: 'Server is running',
    database: dbStatus
  });
});

// Auth routes
app.use('/auth', authRoutes);

// User routes (protected)
app.use('/api/users', userRoutes);

// Drive routes (protected)
app.use('/api/drive', driveRoutes);

// File routes (protected)
app.use('/api/files', fileRoutes);

// API routes placeholder
app.use('/api', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    message: 'API is ready'
  });
});

// Handle undefined routes
app.all('*', (req: Request, _res: Response, next: NextFunction) => {
  next(new AppError(`Cannot find ${req.originalUrl} on this server`, 404));
});

// Global error handling middleware
app.use(errorHandler);

export default app;
