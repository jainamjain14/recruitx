import { Response } from 'express';
import { ApiResponse } from '../types/index.js';

export const sendSuccess = <T>(
  res: Response,
  message: string,
  data?: T,
  statusCode = 200
): Response => {
  const response: ApiResponse<T> = {
    success: true,
    message,
    data: data !== undefined ? data : null,
    errors: null,
  };
  return res.status(statusCode).json(response);
};

export const sendError = (
  res: Response,
  message: string,
  errors: any = null,
  statusCode = 400
): Response => {
  const response: ApiResponse = {
    success: false,
    message,
    data: null,
    errors: errors !== undefined ? errors : null,
  };
  return res.status(statusCode).json(response);
};
