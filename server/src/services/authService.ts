import crypto from 'crypto';
import { User, IUserDocument } from '../models/User.js';
import { generateToken } from '../utils/generateToken.js';
import { UserRole } from '../types/index.js';

export class AuthService {
  /**
   * Register a new user (Student or Recruiter only)
   */
  static async registerUser(data: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
  }): Promise<{ user: Partial<IUserDocument>; token: string }> {
    const { name, email, password, role } = data;

    // Admin role cannot register publicly
    if (role === 'admin') {
      throw new Error('Admin role cannot register publicly.');
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new Error('An account with this email address already exists.');
    }

    // Create user
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role,
      emailVerified: true,
    });

    const token = generateToken(user._id.toString(), user.role, false);

    const userObj = {
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
      company: user.company,
      website: user.website,
      location: user.location,
      description: user.description,
      phone: user.phone,
      title: user.title,
      profession: user.profession,
      github: user.github,
      linkedin: user.linkedin,
      portfolio: user.portfolio,
      experienceLevel: user.experienceLevel,
      companySize: user.companySize,
      industry: user.industry,
      onboardingCompleted: user.onboardingCompleted ?? false,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return { user: userObj as any, token };
  }

  /**
   * Login user
   */
  static async loginUser(data: {
    email: string;
    password: string;
    role?: UserRole;
    rememberMe?: boolean;
  }): Promise<{ user: Partial<IUserDocument>; token: string }> {
    const { email, password, role, rememberMe } = data;

    // Find user and explicitly select password
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      throw new Error('Invalid email or password.');
    }

    // Verify password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      throw new Error('Invalid email or password.');
    }

    // Verify role if specified
    if (role && user.role !== role) {
      throw new Error(`This account is not registered as a '${role}'. Selected role does not match.`);
    }

    const token = generateToken(user._id.toString(), user.role, rememberMe);

    const userObj = {
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
      company: user.company,
      website: user.website,
      location: user.location,
      description: user.description,
      phone: user.phone,
      title: user.title,
      profession: user.profession,
      github: user.github,
      linkedin: user.linkedin,
      portfolio: user.portfolio,
      experienceLevel: user.experienceLevel,
      companySize: user.companySize,
      industry: user.industry,
      onboardingCompleted: user.onboardingCompleted ?? false,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return { user: userObj as any, token };
  }

  /**
   * Request password reset token
   */
  static async forgotPassword(email: string): Promise<{ resetToken: string }> {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // For security, don't reveal whether email exists, but return token for testing/demo
      throw new Error('If an account with that email exists, password reset instructions have been generated.');
    }

    // Generate unhashed reset token
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Hash token and set to resetPasswordToken field
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Set expire (1 hour)
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);

    await user.save();

    return { resetToken };
  }

  /**
   * Reset password with token
   */
  static async resetPassword(token: string, newPassword: string): Promise<void> {
    // Hash token to compare with DB
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      throw new Error('Password reset token is invalid or has expired.');
    }

    // Set new password
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();
  }
}
