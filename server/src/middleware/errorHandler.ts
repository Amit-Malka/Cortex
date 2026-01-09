import { Request, Response, NextFunction } from 'express';
import AppError from '../utils/AppError';

const sendErrorDev = (err: AppError, res: Response) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack
  });
};

const sendErrorProd = (err: AppError, res: Response) => {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    });
  } else {
    console.error('ERROR 💥', err);
    
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong'
    });
  }
};

const errorHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  let error = Object.create(err);
  
  if (!(error instanceof AppError)) {
    error = new AppError(err.message || 'Internal Server Error', 500);
    error.isOperational = false;
  } else {
    error.statusCode = error.statusCode || 500;
    error.status = error.status || 'error';
  }

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(error, res);
  } else {
    sendErrorProd(error, res);
  }
};

export default errorHandler;
