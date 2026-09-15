import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest } from '../types/index.js';
import { User } from '../models/User.js';
import { sendError } from '../utils/apiResponse.js';

interface JwtPayload {
  id: string;
  role: string;
  iat: number;
  exp: number;
}

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  let token: string | undefined;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    sendError(res, 'Not authorized, access token missing', null, 401);
    return;
  }

  try {
    const secret = process.env.JWT_SECRET || 'recruitx_secure_jwt_secret_key_2026_super_secret_987654321';
    const decoded = jwt.verify(token, secret) as JwtPayload;

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      sendError(res, 'User no longer exists or session invalid', null, 401);
      return;
    }

    req.user = user;
    next();
  } catch (error: any) {
    sendError(res, 'Not authorized, invalid or expired token', null, 401);
    return;
  }
};
