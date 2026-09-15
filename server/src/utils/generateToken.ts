import jwt from 'jsonwebtoken';

export const generateToken = (userId: string, role: string, rememberMe = false): string => {
  const secret = process.env.JWT_SECRET || 'recruitx_secure_jwt_secret_key_2026_super_secret_987654321';
  const expiresIn = rememberMe
    ? (process.env.JWT_EXPIRES_IN_REMEMBER || '7d')
    : (process.env.JWT_EXPIRES_IN || '1d');

  return jwt.sign(
    { id: userId, role },
    secret,
    { expiresIn } as jwt.SignOptions
  );
};
