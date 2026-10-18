import crypto from 'crypto';
import { User, IUserDocument } from '../models/User.js';
import { generateToken } from '../utils/generateToken.js';
import { UserRole } from '../types/index.js';
import { EmailService } from './emailService.js';

export interface RegisterResult {
  user: Partial<IUserDocument>;
  token: string;
  requiresVerification?: boolean;
}

export class AuthService {
  /**
   * Register a new user (Student or Recruiter only)
   */
  static async registerUser(data: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
  }): Promise<RegisterResult> {
    const { name, email, password, role } = data;
    const normalizedEmail = email.toLowerCase().trim();

    // Admin role cannot register publicly
    if (role === 'admin') {
      throw new Error('Admin role cannot register publicly.');
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      if (!existingUser.emailVerified) {
        // Pending unverified registration: refresh code and send email again
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        existingUser.verificationCode = verificationCode;
        existingUser.verificationExpires = new Date(Date.now() + 15 * 60 * 1000);
        existingUser.setPassword(password);
        existingUser.name = name;
        existingUser.role = role;
        await existingUser.save();

        await EmailService.sendVerificationEmail({
          toEmail: normalizedEmail,
          userName: name,
          code: verificationCode,
        });

        return {
          user: {
            _id: existingUser._id.toString(),
            name: existingUser.name,
            email: existingUser.email,
            role: existingUser.role,
            emailVerified: false,
          } as any,
          token: '',
          requiresVerification: true,
        };
      }
      throw new Error('An account with this email address already exists.');
    }

    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationExpires = new Date(Date.now() + 15 * 60 * 1000);

    // Create user in unverified state
    const user = await User.create({
      name,
      email: normalizedEmail,
      password,
      role,
      emailVerified: false,
      verificationCode,
      verificationExpires,
      provider: 'local',
    });

    // Dispatch verification email
    await EmailService.sendVerificationEmail({
      toEmail: normalizedEmail,
      userName: name,
      code: verificationCode,
    });

    const userObj = {
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      emailVerified: false,
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

    return {
      user: userObj as any,
      token: '',
      requiresVerification: true,
    };
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

    // Enforce email verification (accounts created with manual sign-up must be verified)
    if (user.emailVerified === false) {
      const err: any = new Error('Your email address has not been verified yet. Please enter the verification code sent to your email.');
      err.requiresVerification = true;
      err.email = user.email;
      err.role = user.role;
      throw err;
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
   * Verify email with 6-digit OTP code
   */
  static async verifyEmail(email: string, code: string): Promise<{ user: Partial<IUserDocument>; token: string }> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      throw new Error('No account found with this email address.');
    }

    if (user.emailVerified) {
      const token = generateToken(user._id.toString(), user.role, false);
      return {
        user: {
          _id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          emailVerified: true,
          company: user.company,
          onboardingCompleted: user.onboardingCompleted ?? false,
        } as any,
        token,
      };
    }

    if (!user.verificationCode || user.verificationCode.trim() !== code.trim()) {
      throw new Error('Invalid verification code. Please check your email and try again.');
    }

    if (user.verificationExpires && new Date(user.verificationExpires) < new Date()) {
      throw new Error('Verification code has expired. Please request a new code.');
    }

    user.emailVerified = true;
    user.verificationCode = undefined;
    user.verificationExpires = undefined;
    await user.save();

    const token = generateToken(user._id.toString(), user.role, false);
    return {
      user: {
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: true,
        company: user.company,
        onboardingCompleted: user.onboardingCompleted ?? false,
      } as any,
      token,
    };
  }

  /**
   * Resend 6-digit verification code
   */
  static async resendVerificationCode(email: string): Promise<{ message: string; demoCode?: string }> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      throw new Error('No account found with this email address.');
    }

    if (user.emailVerified) {
      return { message: 'Email address is already verified.' };
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.verificationCode = verificationCode;
    user.verificationExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    await EmailService.sendVerificationEmail({
      toEmail: normalizedEmail,
      userName: user.name,
      code: verificationCode,
    });

    return {
      message: 'A fresh verification code has been dispatched to your email.',
    };
  }

  /**
   * Social OAuth Login (Google & GitHub)
   */
  static async socialLogin(data: {
    email: string;
    name: string;
    provider: 'google' | 'github';
    providerId?: string;
    role?: UserRole;
    avatar?: string;
  }): Promise<{ user: Partial<IUserDocument>; token: string }> {
    const { email, name, provider, providerId, role = 'student', avatar } = data;
    const normalizedEmail = email.toLowerCase().trim();

    let user = await User.findOne({ email: normalizedEmail });

    if (user) {
      // User exists - guarantee email is verified since identity came from verified OAuth provider
      user.emailVerified = true;
      if (!user.provider || user.provider === 'local') {
        user.provider = provider;
      }
      if (providerId && !user.providerId) {
        user.providerId = providerId;
      }
      if (avatar && !user.avatar) {
        user.avatar = avatar;
      }
      await user.save();
    } else {
      // Create fresh user account with OAuth verified status
      user = await User.create({
        name: name || normalizedEmail.split('@')[0],
        email: normalizedEmail,
        role: role || 'student',
        emailVerified: true,
        provider,
        providerId,
        avatar,
        onboardingCompleted: false,
      });
    }

    const token = generateToken(user._id.toString(), user.role, true);

    const userObj = {
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      emailVerified: true,
      provider: user.provider,
      avatar: user.avatar,
      company: user.company,
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

