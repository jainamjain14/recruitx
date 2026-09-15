import { db, Collections } from '../config/firebase.js';
import { dateFromFirestore, cleanDataForFirestore } from './firestoreHelper.js';

export interface INotificationDocument {
  _id: string;
  recipient: any;
  title: string;
  message: string;
  type: 'application_update' | 'interview_invite' | 'job_alert' | 'system';
  link?: string;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
  save(): Promise<INotificationDocument>;
}

export class NotificationDoc implements INotificationDocument {
  _id: string;
  recipient: any;
  title: string;
  message: string;
  type: 'application_update' | 'interview_invite' | 'job_alert' | 'system';
  link?: string;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: any, id: string) {
    this._id = id;
    this.recipient = data.recipient;
    this.title = data.title || '';
    this.message = data.message || '';
    this.type = data.type || 'system';
    this.link = data.link;
    this.read = data.read ?? false;
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
      link: this.link,
      read: this.read,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    });

    await db.collection(Collections.NOTIFICATIONS).doc(this._id).set(dataToSave, { merge: true });
    return this;
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
    type?: 'application_update' | 'interview_invite' | 'job_alert' | 'system';
    link?: string;
    read?: boolean;
  }): Promise<INotificationDocument> {
    const recipientId = typeof data.recipient === 'object' && data.recipient?._id ? data.recipient._id.toString() : data.recipient.toString();
    const now = new Date();

    const docData = cleanDataForFirestore({
      recipient: recipientId,
      title: data.title,
      message: data.message,
      type: data.type || 'system',
      link: data.link || '',
      read: data.read ?? false,
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
        link: d.link || '',
        read: d.read ?? false,
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

      const snap = await q.get();
      return snap.docs.map((d: any) => new NotificationDoc(d.data(), d.id));
    });
  }
}
