import { db, Collections } from '../config/firebase.js';
import { dateFromFirestore, cleanDataForFirestore } from './firestoreHelper.js';

export type NotificationType =
  | 'application_update'
  | 'interview_invite'
  | 'job_alert'
  | 'job_recommendation'
  | 'placement_drive'
  | 'system'
  | 'maintenance'
  | 'message';

export type NotificationFormat = 'inbox' | 'banner' | 'modal' | 'toast' | 'slideout';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface INotificationDocument {
  _id: string;
  recipient: any;
  title: string;
  message: string;
  type: NotificationType;
  format?: NotificationFormat;
  priority?: NotificationPriority;
  link?: string;
  actionText?: string;
  actionUrl?: string;
  imageUrl?: string;
  announcementId?: string;
  expiresAt?: Date;
  read: boolean;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
  save(): Promise<INotificationDocument>;
  deleteOne(): Promise<void>;
}

export class NotificationDoc implements INotificationDocument {
  _id: string;
  recipient: any;
  title: string;
  message: string;
  type: NotificationType;
  format?: NotificationFormat;
  priority?: NotificationPriority;
  link?: string;
  actionText?: string;
  actionUrl?: string;
  imageUrl?: string;
  announcementId?: string;
  expiresAt?: Date;
  read: boolean;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: any, id: string) {
    this._id = id;
    this.recipient = data.recipient;
    this.title = data.title || '';
    this.message = data.message || '';
    this.type = data.type || 'system';
    this.format = data.format || 'inbox';
    this.priority = data.priority || 'normal';
    this.link = data.link;
    this.actionText = data.actionText;
    this.actionUrl = data.actionUrl || data.link;
    this.imageUrl = data.imageUrl;
    this.announcementId = data.announcementId;
    this.expiresAt = data.expiresAt ? dateFromFirestore(data.expiresAt) : undefined;
    this.read = data.read ?? false;
    this.metadata = data.metadata;
    this.createdAt = dateFromFirestore(data.createdAt);
    this.updatedAt = dateFromFirestore(data.updatedAt);
  }

  async save(): Promise<INotificationDocument> {
    this.updatedAt = new Date();

    const recipientId = typeof this.recipient === 'object' && this.recipient?._id ? this.recipient._id : this.recipient;

    const dataToSave = cleanDataForFirestore({
      recipient: recipientId,
      title: this.title,
      message: this.message,
      type: this.type,
      format: this.format || 'inbox',
      priority: this.priority || 'normal',
      link: this.link,
      actionText: this.actionText,
      actionUrl: this.actionUrl,
      imageUrl: this.imageUrl,
      announcementId: this.announcementId,
      expiresAt: this.expiresAt,
      read: this.read,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    });

    await db.collection(Collections.NOTIFICATIONS).doc(this._id).set(dataToSave, { merge: true });
    return this;
  }

  async deleteOne(): Promise<void> {
    await db.collection(Collections.NOTIFICATIONS).doc(this._id).delete();
  }
}

class NotificationQueryBuilder<T> implements PromiseLike<T> {
  private promise: () => Promise<T>;
  private sortOption: any = null;

  constructor(promise: () => Promise<T>) {
    this.promise = promise;
  }

  sort(sortOption: any): NotificationQueryBuilder<T> {
    this.sortOption = sortOption;
    return this;
  }

  private async execute(): Promise<T> {
    let result = await this.promise();

    if (Array.isArray(result) && this.sortOption?.createdAt) {
      result.sort((a: any, b: any) =>
        this.sortOption.createdAt === -1
          ? b.createdAt.getTime() - a.createdAt.getTime()
          : a.createdAt.getTime() - b.createdAt.getTime()
      );
    }

    return result;
  }

  then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  catch<TResult = never>(
    onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null
  ): Promise<T | TResult> {
    return this.execute().catch(onrejected);
  }
}

export class Notification {
  static async create(data: {
    recipient: any;
    title: string;
    message: string;
    type?: NotificationType;
    format?: NotificationFormat;
    priority?: NotificationPriority;
    link?: string;
    actionText?: string;
    actionUrl?: string;
    imageUrl?: string;
    announcementId?: string;
    expiresAt?: Date;
    read?: boolean;
    metadata?: any;
  }): Promise<INotificationDocument> {
    const recipientId = typeof data.recipient === 'object' && data.recipient?._id ? data.recipient._id.toString() : data.recipient.toString();
    const now = new Date();

    const docData = cleanDataForFirestore({
      recipient: recipientId,
      title: data.title,
      message: data.message,
      type: data.type || 'system',
      format: data.format || 'inbox',
      priority: data.priority || 'normal',
      link: data.link || '',
      actionText: data.actionText || '',
      actionUrl: data.actionUrl || data.link || '',
      imageUrl: data.imageUrl || '',
      announcementId: data.announcementId || '',
      expiresAt: data.expiresAt || null,
      read: data.read ?? false,
      metadata: data.metadata || null,
      createdAt: now,
      updatedAt: now,
    });

    const docRef = await db.collection(Collections.NOTIFICATIONS).add(docData);
    return new NotificationDoc(docData, docRef.id);
  }

  static async insertMany(docs: any[]): Promise<INotificationDocument[]> {
    const batch = db.batch();
    const created: INotificationDocument[] = [];
    const now = new Date();

    for (const d of docs) {
      const recipientId = typeof d.recipient === 'object' && d.recipient?._id ? d.recipient._id.toString() : d.recipient.toString();
      const docData = cleanDataForFirestore({
        recipient: recipientId,
        title: d.title,
        message: d.message,
        type: d.type || 'system',
        format: d.format || 'inbox',
        priority: d.priority || 'normal',
        link: d.link || '',
        actionText: d.actionText || '',
        actionUrl: d.actionUrl || d.link || '',
        imageUrl: d.imageUrl || '',
        announcementId: d.announcementId || '',
        expiresAt: d.expiresAt || null,
        read: d.read ?? false,
        metadata: d.metadata || null,
        createdAt: now,
        updatedAt: now,
      });

      const docRef = db.collection(Collections.NOTIFICATIONS).doc();
      batch.set(docRef, docData);
      created.push(new NotificationDoc(docData, docRef.id));
    }

    await batch.commit();
    return created;
  }

  static findById(id: string): Promise<INotificationDocument | null> {
    return (async () => {
      if (!id) return null;
      const snap = await db.collection(Collections.NOTIFICATIONS).doc(id).get();
      if (!snap.exists) return null;
      return new NotificationDoc(snap.data(), snap.id);
    })();
  }

  static find(filter: any = {}): NotificationQueryBuilder<INotificationDocument[]> {
    return new NotificationQueryBuilder(async () => {
      let q: any = db.collection(Collections.NOTIFICATIONS);

      if (filter.recipient) {
        const recipientId = typeof filter.recipient === 'object' && filter.recipient?._id ? filter.recipient._id.toString() : filter.recipient.toString();
        q = q.where('recipient', '==', recipientId);
      }

      if (filter.read !== undefined) {
        q = q.where('read', '==', filter.read);
      }

      const snap = await q.get();
      return snap.docs.map((d: any) => new NotificationDoc(d.data(), d.id));
    });
  }

  static async markAllAsRead(recipientId: string): Promise<number> {
    const snap = await db
      .collection(Collections.NOTIFICATIONS)
      .where('recipient', '==', recipientId.toString())
      .where('read', '==', false)
      .get();

    if (snap.empty) return 0;

    const batch = db.batch();
    snap.docs.forEach((doc: any) => {
      batch.update(doc.ref, { read: true, updatedAt: new Date() });
    });
    await batch.commit();
    return snap.size;
  }

  static async clearAllForUser(recipientId: string): Promise<number> {
    const snap = await db
      .collection(Collections.NOTIFICATIONS)
      .where('recipient', '==', recipientId.toString())
      .get();

    if (snap.empty) return 0;

    const batch = db.batch();
    snap.docs.forEach((doc: any) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    return snap.size;
  }
}

