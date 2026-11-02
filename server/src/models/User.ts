import bcrypt from 'bcryptjs';
import { db, Collections } from '../config/firebase.js';
import { UserRole } from '../types/index.js';
import { dateFromFirestore, cleanDataForFirestore } from './firestoreHelper.js';

export interface ConnectedEmailAccount {
  provider: 'gmail' | 'outlook' | 'smtp';
  email: string;
  name?: string;
  accessTokenEncrypted: string;
  refreshTokenEncrypted?: string;
  tokenExpiresAt?: Date;
  scopes: string[];
  connectedAt: Date;
  lastUsedAt?: Date;
  status: 'active' | 'expired' | 'revoked' | 'error';
  lastError?: string;
}

export interface IUserDocument {
  _id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  emailVerified: boolean;
  isSuspended?: boolean;
  verificationCode?: string;
  verificationExpires?: Date;
  provider?: string;
  providerId?: string;
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
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  resetPasswordOtpHash?: string;
  resetPasswordOtpExpires?: Date;
  resetPasswordOtpAttempts?: number;
  resetPasswordOtpLastSent?: Date;
  resetPasswordSessionToken?: string;
  resetPasswordSessionExpires?: Date;
  // Contact Email Management (Part 2)
  contactEmail?: string;
  contactEmailVerified?: boolean;
  contactEmailVerificationCode?: string;
  contactEmailVerificationExpires?: Date;
  // Connected Email OAuth Accounts for Sending (Part 3)
  connectedEmailAccounts?: ConnectedEmailAccount[];
  authorizedSendingEmail?: string;
  authorizedSendingProvider?: 'gmail' | 'outlook' | 'smtp';
  isEmailSendingAuthorized?: boolean;
  // Autonomous Job Applications & Inbox Sync Preferences
  autoApplyEnabled?: boolean;
  autoApplyDailyLimit?: number;
  autoApplyMinScore?: number;
  autoApplyTargetRoles?: string[];
  autoApplyRemoteOnly?: boolean;
  lastAutoApplyRunAt?: Date;
  inboxSyncLastRunAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  matchPassword(enteredPassword: string): Promise<boolean>;
  setPassword(newPassword: string): void;
  save(): Promise<IUserDocument>;
  deleteOne(): Promise<void>;
}

export class UserDoc implements IUserDocument {
  declare _id: string;
  declare name: string;
  declare email: string;
  declare password?: string;
  declare role: UserRole;
  declare emailVerified: boolean;
  declare isSuspended?: boolean;
  declare verificationCode?: string;
  declare verificationExpires?: Date;
  declare provider?: string;
  declare providerId?: string;
  declare avatar?: string;
  declare company?: string;
  declare website?: string;
  declare location?: string;
  declare description?: string;
  declare phone?: string;
  declare title?: string;
  declare profession?: string;
  declare github?: string;
  declare linkedin?: string;
  declare portfolio?: string;
  declare experienceLevel?: string;
  declare companySize?: string;
  declare industry?: string;
  declare onboardingCompleted?: boolean;
  declare resetPasswordToken?: string;
  declare resetPasswordExpires?: Date;
  declare resetPasswordOtpHash?: string;
  declare resetPasswordOtpExpires?: Date;
  declare resetPasswordOtpAttempts?: number;
  declare resetPasswordOtpLastSent?: Date;
  declare resetPasswordSessionToken?: string;
  declare resetPasswordSessionExpires?: Date;
  declare contactEmail?: string;
  declare contactEmailVerified?: boolean;
  declare contactEmailVerificationCode?: string;
  declare contactEmailVerificationExpires?: Date;
  declare connectedEmailAccounts?: ConnectedEmailAccount[];
  declare authorizedSendingEmail?: string;
  declare authorizedSendingProvider?: 'gmail' | 'outlook' | 'smtp';
  declare isEmailSendingAuthorized?: boolean;
  declare autoApplyEnabled?: boolean;
  declare autoApplyDailyLimit?: number;
  declare autoApplyMinScore?: number;
  declare autoApplyTargetRoles?: string[];
  declare autoApplyRemoteOnly?: boolean;
  declare lastAutoApplyRunAt?: Date;
  declare inboxSyncLastRunAt?: Date;
  declare createdAt: Date;
  declare updatedAt: Date;

  private _isPasswordModified: boolean = false;

  constructor(data: any, id: string) {
    this._id = id;
    this.name = data.name || '';
    this.email = (data.email || '').toLowerCase().trim();
    this.password = data.password;
    this.role = data.role || 'student';
    this.emailVerified = data.emailVerified ?? false;
    this.isSuspended = data.isSuspended ?? false;
    this.verificationCode = data.verificationCode;
    this.verificationExpires = data.verificationExpires ? dateFromFirestore(data.verificationExpires) : undefined;
    this.provider = data.provider || 'local';
    this.providerId = data.providerId;
    this.avatar = data.avatar;
    this.company = data.company;
    this.website = data.website;
    this.location = data.location;
    this.description = data.description;
    this.phone = data.phone;
    this.title = data.title;
    this.profession = data.profession;
    this.github = data.github;
    this.linkedin = data.linkedin;
    this.portfolio = data.portfolio;
    this.experienceLevel = data.experienceLevel;
    this.companySize = data.companySize;
    this.industry = data.industry;
    this.onboardingCompleted = data.onboardingCompleted ?? false;
    this.resetPasswordToken = data.resetPasswordToken;
    this.resetPasswordExpires = data.resetPasswordExpires ? dateFromFirestore(data.resetPasswordExpires) : undefined;
    this.resetPasswordOtpHash = data.resetPasswordOtpHash;
    this.resetPasswordOtpExpires = data.resetPasswordOtpExpires ? dateFromFirestore(data.resetPasswordOtpExpires) : undefined;
    this.resetPasswordOtpAttempts = data.resetPasswordOtpAttempts || 0;
    this.resetPasswordOtpLastSent = data.resetPasswordOtpLastSent ? dateFromFirestore(data.resetPasswordOtpLastSent) : undefined;
    this.resetPasswordSessionToken = data.resetPasswordSessionToken;
    this.resetPasswordSessionExpires = data.resetPasswordSessionExpires ? dateFromFirestore(data.resetPasswordSessionExpires) : undefined;

    // Contact Email
    this.contactEmail = data.contactEmail ? (data.contactEmail as string).toLowerCase().trim() : undefined;
    this.contactEmailVerified = data.contactEmailVerified ?? false;
    this.contactEmailVerificationCode = data.contactEmailVerificationCode;
    this.contactEmailVerificationExpires = data.contactEmailVerificationExpires ? dateFromFirestore(data.contactEmailVerificationExpires) : undefined;

    // Connected Email OAuth Accounts
    this.connectedEmailAccounts = Array.isArray(data.connectedEmailAccounts)
      ? data.connectedEmailAccounts.map((acc: any) => ({
          ...acc,
          connectedAt: dateFromFirestore(acc.connectedAt),
          tokenExpiresAt: acc.tokenExpiresAt ? dateFromFirestore(acc.tokenExpiresAt) : undefined,
          lastUsedAt: acc.lastUsedAt ? dateFromFirestore(acc.lastUsedAt) : undefined,
        }))
      : [];
    this.authorizedSendingEmail = data.authorizedSendingEmail;
    this.authorizedSendingProvider = data.authorizedSendingProvider;
    this.isEmailSendingAuthorized = data.isEmailSendingAuthorized ?? false;
    this.autoApplyEnabled = data.autoApplyEnabled ?? false;
    this.autoApplyDailyLimit = data.autoApplyDailyLimit ?? 5;
    this.autoApplyMinScore = data.autoApplyMinScore ?? 70;
    this.autoApplyTargetRoles = Array.isArray(data.autoApplyTargetRoles) ? data.autoApplyTargetRoles : [];
    this.autoApplyRemoteOnly = data.autoApplyRemoteOnly ?? false;
    this.lastAutoApplyRunAt = data.lastAutoApplyRunAt ? dateFromFirestore(data.lastAutoApplyRunAt) : undefined;
    this.inboxSyncLastRunAt = data.inboxSyncLastRunAt ? dateFromFirestore(data.inboxSyncLastRunAt) : undefined;

    this.createdAt = dateFromFirestore(data.createdAt);
    this.updatedAt = dateFromFirestore(data.updatedAt);
  }

  setPassword(newPassword: string) {
    this.password = newPassword;
    this._isPasswordModified = true;
  }

  async matchPassword(enteredPassword: string): Promise<boolean> {
    if (!this.password) return false;
    return await bcrypt.compare(enteredPassword, this.password);
  }

  async save(): Promise<IUserDocument> {
    if (this.password && !this.password.startsWith('$2a$') && !this.password.startsWith('$2b$')) {
      const salt = await bcrypt.genSalt(12);
      this.password = await bcrypt.hash(this.password, salt);
    }

    this.updatedAt = new Date();

    const dataToSave = cleanDataForFirestore({
      name: this.name,
      email: this.email,
      password: this.password,
      role: this.role,
      emailVerified: this.emailVerified,
      isSuspended: this.isSuspended ?? false,
      verificationCode: this.verificationCode || null,
      verificationExpires: this.verificationExpires || null,
      provider: this.provider || 'local',
      providerId: this.providerId || null,
      avatar: this.avatar || null,
      company: this.company || null,
      website: this.website || null,
      location: this.location || null,
      description: this.description || null,
      phone: this.phone || null,
      title: this.title || null,
      profession: this.profession || null,
      github: this.github || null,
      linkedin: this.linkedin || null,
      portfolio: this.portfolio || null,
      experienceLevel: this.experienceLevel || null,
      companySize: this.companySize || null,
      industry: this.industry || null,
      onboardingCompleted: this.onboardingCompleted ?? false,
      resetPasswordToken: this.resetPasswordToken || null,
      resetPasswordExpires: this.resetPasswordExpires || null,
      resetPasswordOtpHash: this.resetPasswordOtpHash || null,
      resetPasswordOtpExpires: this.resetPasswordOtpExpires || null,
      resetPasswordOtpAttempts: this.resetPasswordOtpAttempts || 0,
      resetPasswordOtpLastSent: this.resetPasswordOtpLastSent || null,
      resetPasswordSessionToken: this.resetPasswordSessionToken || null,
      resetPasswordSessionExpires: this.resetPasswordSessionExpires || null,
      // Contact Email
      contactEmail: this.contactEmail || null,
      contactEmailVerified: this.contactEmailVerified ?? false,
      contactEmailVerificationCode: this.contactEmailVerificationCode || null,
      contactEmailVerificationExpires: this.contactEmailVerificationExpires || null,
      // Connected Email OAuth Accounts
      connectedEmailAccounts: this.connectedEmailAccounts || [],
      authorizedSendingEmail: this.authorizedSendingEmail || null,
      authorizedSendingProvider: this.authorizedSendingProvider || null,
      isEmailSendingAuthorized: this.isEmailSendingAuthorized ?? false,
      autoApplyEnabled: this.autoApplyEnabled ?? false,
      autoApplyDailyLimit: this.autoApplyDailyLimit ?? 5,
      autoApplyMinScore: this.autoApplyMinScore ?? 70,
      autoApplyTargetRoles: this.autoApplyTargetRoles || [],
      autoApplyRemoteOnly: this.autoApplyRemoteOnly ?? false,
      lastAutoApplyRunAt: this.lastAutoApplyRunAt || null,
      inboxSyncLastRunAt: this.inboxSyncLastRunAt || null,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    });

    await db.collection(Collections.USERS).doc(this._id).set(dataToSave, { merge: true });
    return this;
  }

  async deleteOne(): Promise<void> {
    await db.collection(Collections.USERS).doc(this._id).delete();
  }
}

class UserQueryBuilder<T> implements PromiseLike<T> {
  private promise: Promise<T>;

  constructor(promise: Promise<T>) {
    this.promise = promise;
  }

  select(_fields: string): UserQueryBuilder<T> {
    return this;
  }

  sort(_sortOptions: any): UserQueryBuilder<T> {
    return this;
  }

  limit(_num: number): UserQueryBuilder<T> {
    return this;
  }

  populate(_field: string): UserQueryBuilder<T> {
    return this;
  }

  then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.promise.then(onfulfilled, onrejected);
  }

  catch<TResult = never>(
    onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null
  ): Promise<T | TResult> {
    return this.promise.catch(onrejected);
  }
}

export class User {
  static async create(data: {
    name: string;
    email: string;
    password?: string;
    role?: UserRole;
    emailVerified?: boolean;
    isSuspended?: boolean;
    verificationCode?: string;
    verificationExpires?: Date;
    provider?: string;
    providerId?: string;
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
    resetPasswordToken?: string;
    resetPasswordExpires?: Date;
    contactEmail?: string;
    contactEmailVerified?: boolean;
    contactEmailVerificationCode?: string;
    contactEmailVerificationExpires?: Date;
    connectedEmailAccounts?: ConnectedEmailAccount[];
    authorizedSendingEmail?: string;
    authorizedSendingProvider?: 'gmail' | 'outlook' | 'smtp';
    isEmailSendingAuthorized?: boolean;
  }): Promise<IUserDocument> {
    const email = data.email.toLowerCase().trim();
    let hashedPassword = data.password;
    if (hashedPassword && !hashedPassword.startsWith('$2a$') && !hashedPassword.startsWith('$2b$')) {
      const salt = await bcrypt.genSalt(12);
      hashedPassword = await bcrypt.hash(hashedPassword, salt);
    }

    const now = new Date();
    const docData = cleanDataForFirestore({
      name: data.name.trim(),
      email,
      password: hashedPassword,
      role: data.role || 'student',
      emailVerified: data.emailVerified ?? false,
      isSuspended: data.isSuspended ?? false,
      verificationCode: data.verificationCode || null,
      verificationExpires: data.verificationExpires || null,
      provider: data.provider || 'local',
      providerId: data.providerId || null,
      avatar: data.avatar || null,
      company: data.company || null,
      website: data.website || null,
      location: data.location || null,
      description: data.description || null,
      phone: data.phone || null,
      title: data.title || null,
      profession: data.profession || null,
      github: data.github || null,
      linkedin: data.linkedin || null,
      portfolio: data.portfolio || null,
      experienceLevel: data.experienceLevel || null,
      companySize: data.companySize || null,
      industry: data.industry || null,
      onboardingCompleted: data.onboardingCompleted ?? false,
      resetPasswordToken: data.resetPasswordToken || null,
      resetPasswordExpires: data.resetPasswordExpires || null,
      contactEmail: data.contactEmail || null,
      contactEmailVerified: data.contactEmailVerified ?? false,
      contactEmailVerificationCode: data.contactEmailVerificationCode || null,
      contactEmailVerificationExpires: data.contactEmailVerificationExpires || null,
      connectedEmailAccounts: data.connectedEmailAccounts || [],
      authorizedSendingEmail: data.authorizedSendingEmail || null,
      authorizedSendingProvider: data.authorizedSendingProvider || null,
      isEmailSendingAuthorized: data.isEmailSendingAuthorized ?? false,
      createdAt: now,
      updatedAt: now,
    });

    const docRef = await db.collection(Collections.USERS).add(docData);
    return new UserDoc({ ...docData, password: hashedPassword }, docRef.id);
  }

  static findById(id: string): UserQueryBuilder<IUserDocument | null> {
    const promise = (async () => {
      if (!id) return null;
      const snap = await db.collection(Collections.USERS).doc(id).get();
      if (!snap.exists) return null;
      return new UserDoc(snap.data(), snap.id);
    })();
    return new UserQueryBuilder(promise);
  }

  static findOne(query: {
    email?: string;
    resetPasswordToken?: string;
    resetPasswordExpires?: any;
    [key: string]: any;
  }): UserQueryBuilder<IUserDocument | null> {
    const promise = (async () => {
      let q: any = db.collection(Collections.USERS);

      if (query.email) {
        q = q.where('email', '==', query.email.toLowerCase().trim());
      } else if (query.resetPasswordToken) {
        q = q.where('resetPasswordToken', '==', query.resetPasswordToken);
      } else {
        for (const [key, val] of Object.entries(query)) {
          if (val !== undefined && key !== 'resetPasswordExpires') {
            q = q.where(key, '==', val);
          }
        }
      }

      const snap = await q.limit(1).get();
      if (snap.empty) return null;

      const docSnap = snap.docs[0];
      const data = docSnap.data();

      // Check date expiration if query had $gt
      if (query.resetPasswordExpires) {
        const expDate = dateFromFirestore(data.resetPasswordExpires);
        if (query.resetPasswordExpires.$gt && expDate <= new Date()) {
          return null;
        }
      }

      return new UserDoc(data, docSnap.id);
    })();

    return new UserQueryBuilder(promise);
  }

  static find(query: any = {}): UserQueryBuilder<IUserDocument[]> {
    const promise = (async () => {
      let q: any = db.collection(Collections.USERS);

      if (query.role) {
        if (typeof query.role === 'object' && Array.isArray(query.role.$in)) {
          q = q.where('role', 'in', query.role.$in);
        } else {
          q = q.where('role', '==', query.role);
        }
      }

      const snap = await q.get();
      let list: IUserDocument[] = snap.docs.map((docSnap: any) => new UserDoc(docSnap.data(), docSnap.id));

      // Sort by createdAt desc by default
      list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return list;
    })();

    return new UserQueryBuilder(promise);
  }

  static async countDocuments(query: any = {}): Promise<number> {
    let q: any = db.collection(Collections.USERS);
    if (query.role) {
      q = q.where('role', '==', query.role);
    }
    const snap = await q.get();
    return snap.size;
  }

  static async deleteById(id: string): Promise<boolean> {
    if (!id) return false;
    await db.collection(Collections.USERS).doc(id).delete();
    return true;
  }
}
