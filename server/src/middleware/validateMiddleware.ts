import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { sendError } from '../utils/apiResponse.js';

export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: (err as any).path || (err as any).param,
      message: err.msg,
    }));
    sendError(res, 'Validation failed. Please check input fields.', formattedErrors, 400);
    return;
  }
  next();
};

export const validateRegister = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('role')
    .notEmpty()
    .withMessage('Role is required')
    .isIn(['student', 'recruiter'])
    .withMessage('Role must be either student or recruiter (Admin registration is disabled)'),
  handleValidationErrors,
];

export const validateLogin = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  body('role')
    .optional()
    .isIn(['student', 'recruiter', 'admin'])
    .withMessage('Role must be student, recruiter, or admin'),
  body('rememberMe').optional().isBoolean().withMessage('Remember me must be a boolean'),
  handleValidationErrors,
];

export const validateForgotPassword = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail(),
  handleValidationErrors,
];

export const validateResetPassword = [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  handleValidationErrors,
];

export const validateCreateJob = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Job title is required')
    .isLength({ min: 3, max: 150 })
    .withMessage('Job title must be between 3 and 150 characters'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Job description is required')
    .isLength({ min: 20 })
    .withMessage('Job description must be at least 20 characters long'),
  handleValidationErrors,
];

export const validateSendMessage = [
  body('recipientId').trim().notEmpty().withMessage('Recipient ID is required'),
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Message content cannot be empty')
    .isLength({ max: 2000 })
    .withMessage('Message cannot exceed 2000 characters'),
  handleValidationErrors,
];

