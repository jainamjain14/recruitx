import bcrypt from 'bcryptjs';
import { db, Collections } from '../config/firebase.js';
import { UserRole } from '../types/index.js';
import { dateFromFirestore, cleanDataForFirestore } from './firestoreHelper.js';

export interface IUserDocument {
  _id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  emailVerified: boolean;
  company?: string;
  website?: string;
  location?: string;
  description?: string;
  phone?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
  matchPassword(enteredPassword: string): Promise<boolean>;
  save(): Promise<IUserDocument>;
}

export class UserDoc implements IUserDocument {
  _id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  emailVerified: boolean;
  company?: string;
  website?: string;
  location?: string;
  description?: string;
  phone?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  createdAt: Date;
  updatedAt: Date;

  private _isPasswordModified: boolean = false;

  constructor(data: any, id: string) {
    this._id = id;
    this.name = data.name || '';
    this.email = (data.email || '').toLowerCase().trim();
    this.password = data.password;
    this.role = data.role || 'student';
    this.emailVerified = data.emailVerified ?? true;
    this.company = data.company;
    this.website = data.website;
    this.location = data.location;
    this.description = data.description;
    this.phone = data.phone;
    this.resetPasswordToken = data.resetPasswordToken;
    this.resetPasswordExpires = data.resetPasswordExpires ? dateFromFirestore(data.resetPasswordExpires) : undefined;
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
      company: this.company || null,
      website: this.website || null,
      location: this.location || null,
      description: this.description || null,
      phone: this.phone || null,
      resetPasswordToken: this.resetPasswordToken,
      resetPasswordExpires: this.resetPasswordExpires,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    });

    await db.collection(Collections.USERS).doc(this._id).set(dataToSave, { merge: true });
    return this;
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
    company?: string;
    website?: string;
    location?: string;
    description?: string;
    phone?: string;
    resetPasswordToken?: string;
    resetPasswordExpires?: Date;
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
      emailVerified: data.emailVerified ?? true,
      company: data.company || null,
      website: data.website || null,
      location: data.location || null,
      description: data.description || null,
      phone: data.phone || null,
      resetPasswordToken: data.resetPasswordToken || null,
      resetPasswordExpires: data.resetPasswordExpires || null,
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
        q = q.where('role', '==', query.role);
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
}
