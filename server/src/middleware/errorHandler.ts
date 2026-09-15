import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { sendError } from '../utils/apiResponse.js';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  logger.error(`Error handling request [${req.method} ${req.url}]:`, err);

  let statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  let message = err.message || 'Internal Server Error';
  let errors = err.errors || null;

  // Handle Firebase Firestore Error codes
  if (err.code === 6 || err.code === 'ALREADY_EXISTS' || err.code === 11000) {
    statusCode = 409;
    message = 'Resource already exists in database.';
  } else if (err.code === 5 || err.code === 'NOT_FOUND') {
    statusCode = 404;
    message = 'Requested document not found.';
  } else if (err.code === 7 || err.code === 'PERMISSION_DENIED') {
    statusCode = 403;
    message = 'Permission denied for this database operation.';
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token signature';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token has expired';
  }

  sendError(res, message, errors, statusCode);
};
