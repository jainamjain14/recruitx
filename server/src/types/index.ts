import { Request } from 'express';

export type UserRole = 'student' | 'recruiter' | 'admin';

export interface IUser {
  _id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  emailVerified: boolean;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthenticatedRequest extends Request {
  user?: IUser;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: any;
}
