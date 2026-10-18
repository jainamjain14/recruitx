export type UserRole = 'student' | 'recruiter' | 'admin';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  emailVerified: boolean;
  provider?: string;
  avatar?: string;
  company?: string;
  website?: string;
  location?: string;
  description?: string;
  phone?: string;
  title?: string;
  profession?: string;
  github?: string;
  linkedin?: string;
  portfolio?: string;
  experienceLevel?: string;
  companySize?: string;
  industry?: string;
  onboardingCompleted?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  requiresVerification?: boolean;
  demoCode?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: any;
}
