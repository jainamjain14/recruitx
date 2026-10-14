import { db, Collections } from '../config/firebase.js';
import { dateFromFirestore, cleanDataForFirestore } from './firestoreHelper.js';
import { NotificationType, NotificationFormat, NotificationPriority } from './Notification.js';

export type TargetAudience = 'all' | 'student' | 'recruiter';
export type CampaignStatus = 'active' | 'scheduled' | 'expired' | 'draft';

export interface IAnnouncementDocument {
  _id: string;
  title: string;
  message: string;
  type: NotificationType;
  format: NotificationFormat;
  targetAudience: TargetAudience;
  targetSegment?: string; // e.g. "Computer Science / IT", "Unplaced"
  priority: NotificationPriority;
  actionText?: string;
  actionUrl?: string;
  imageUrl?: string;
  status: CampaignStatus;
  scheduledAt: Date;
  expiresAt?: Date | null;
  impressions: number;
  clicks: number;
  metadata?: any;
  createdBy: any;
  createdAt: Date;
  updatedAt: Date;
  save(): Promise<IAnnouncementDocument>;
  deleteOne(): Promise<void>;
}

export class AnnouncementDoc implements IAnnouncementDocument {
  _id: string;
  title: string;
  message: string;
  type: NotificationType;
  format: NotificationFormat;
  targetAudience: TargetAudience;
  targetSegment?: string;
  priority: NotificationPriority;
  actionText?: string;
  actionUrl?: string;
  imageUrl?: string;
  status: CampaignStatus;
  scheduledAt: Date;
  expiresAt?: Date | null;
  impressions: number;
  clicks: number;
  metadata?: any;
  createdBy: any;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: any, id: string) {
    this._id = id;
    this.title = data.title || '';
    this.message = data.message || '';
    this.type = data.type || 'system';
    this.format = data.format || 'banner';
    this.targetAudience = data.targetAudience || 'all';
    this.targetSegment = data.targetSegment;
    this.priority = data.priority || 'normal';
    this.actionText = data.actionText;
    this.actionUrl = data.actionUrl;
    this.imageUrl = data.imageUrl;
    this.status = data.status || 'active';
    this.scheduledAt = data.scheduledAt ? dateFromFirestore(data.scheduledAt) : new Date();
    this.expiresAt = data.expiresAt ? dateFromFirestore(data.expiresAt) : null;
    this.impressions = data.impressions || 0;
    this.clicks = data.clicks || 0;
    this.metadata = data.metadata;
    this.createdBy = data.createdBy;
    this.createdAt = dateFromFirestore(data.createdAt);
    this.updatedAt = dateFromFirestore(data.updatedAt);
  }

  async save(): Promise<IAnnouncementDocument> {
    this.updatedAt = new Date();

    const dataToSave = cleanDataForFirestore({
      title: this.title,
      message: this.message,
      type: this.type,
      format: this.format,
      targetAudience: this.targetAudience,
      targetSegment: this.targetSegment,
      priority: this.priority,
      actionText: this.actionText,
      actionUrl: this.actionUrl,
      imageUrl: this.imageUrl,
      status: this.status,
      scheduledAt: this.scheduledAt,
      expiresAt: this.expiresAt,
      impressions: this.impressions,
      clicks: this.clicks,
      metadata: this.metadata,
      createdBy: this.createdBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    });

    await db.collection(Collections.ANNOUNCEMENTS).doc(this._id).set(dataToSave, { merge: true });
    return this;
  }

  async deleteOne(): Promise<void> {
    await db.collection(Collections.ANNOUNCEMENTS).doc(this._id).delete();
  }
}

export class Announcement {
  static async create(data: {
    title: string;
    message: string;
    type?: NotificationType;
    format?: NotificationFormat;
    targetAudience?: TargetAudience;
    targetSegment?: string;
    priority?: NotificationPriority;
    actionText?: string;
    actionUrl?: string;
    imageUrl?: string;
    scheduledAt?: Date;
    expiresAt?: Date | null;
    status?: CampaignStatus;
    metadata?: any;
    createdBy?: any;
  }): Promise<IAnnouncementDocument> {
    const now = new Date();

    const docData = cleanDataForFirestore({
      title: data.title,
      message: data.message,
      type: data.type || 'system',
      format: data.format || 'banner',
      targetAudience: data.targetAudience || 'all',
      targetSegment: data.targetSegment || '',
      priority: data.priority || 'normal',
      actionText: data.actionText || '',
      actionUrl: data.actionUrl || '',
      imageUrl: data.imageUrl || '',
      status: data.status || 'active',
      scheduledAt: data.scheduledAt || now,
      expiresAt: data.expiresAt || null,
      impressions: 0,
      clicks: 0,
      metadata: data.metadata || null,
      createdBy: data.createdBy || 'admin',
      createdAt: now,
      updatedAt: now,
    });

    const docRef = await db.collection(Collections.ANNOUNCEMENTS).add(docData);
    return new AnnouncementDoc(docData, docRef.id);
  }

  static async findById(id: string): Promise<IAnnouncementDocument | null> {
    if (!id) return null;
    const snap = await db.collection(Collections.ANNOUNCEMENTS).doc(id).get();
    if (!snap.exists) return null;
    return new AnnouncementDoc(snap.data(), snap.id);
  }

  static async find(filter: any = {}): Promise<IAnnouncementDocument[]> {
    let q: any = db.collection(Collections.ANNOUNCEMENTS);

    if (filter.status) {
      q = q.where('status', '==', filter.status);
    }

    const snap = await q.get();
    let docs = snap.docs.map((d: any) => new AnnouncementDoc(d.data(), d.id));

    if (filter.targetAudience && filter.targetAudience !== 'all') {
      docs = docs.filter(
        (a: any) => a.targetAudience === 'all' || a.targetAudience === filter.targetAudience
      );
    }

    // Sort newest first
    docs.sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime());
    return docs;
  }

  static async incrementImpressions(id: string): Promise<void> {
    if (!id) return;
    const ref = db.collection(Collections.ANNOUNCEMENTS).doc(id);
    const snap = await ref.get();
    if (snap.exists) {
      const cur = snap.data()?.impressions || 0;
      await ref.update({ impressions: cur + 1, updatedAt: new Date() });
    }
  }

  static async incrementClicks(id: string): Promise<void> {
    if (!id) return;
    const ref = db.collection(Collections.ANNOUNCEMENTS).doc(id);
    const snap = await ref.get();
    if (snap.exists) {
      const cur = snap.data()?.clicks || 0;
      await ref.update({ clicks: cur + 1, updatedAt: new Date() });
    }
  }

  static async deleteOne(id: string): Promise<void> {
    if (!id) return;
    await db.collection(Collections.ANNOUNCEMENTS).doc(id).delete();
  }
}
