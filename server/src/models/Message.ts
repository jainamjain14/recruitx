import { db, Collections } from '../config/firebase.js';
import { dateFromFirestore, cleanDataForFirestore } from './firestoreHelper.js';

export interface IMessageDocument {
  _id: string;
  sender: any;
  recipient: any;
  content: string;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
  save(): Promise<IMessageDocument>;
}

export class MessageDoc implements IMessageDocument {
  _id: string;
  sender: any;
  recipient: any;
  content: string;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: any, id: string) {
    this._id = id;
    this.sender = data.sender;
    this.recipient = data.recipient;
    this.content = data.content || '';
    this.read = data.read ?? false;
    this.createdAt = dateFromFirestore(data.createdAt);
    this.updatedAt = dateFromFirestore(data.updatedAt);
  }

  async save(): Promise<IMessageDocument> {
    this.updatedAt = new Date();

    const senderId = typeof this.sender === 'object' && this.sender?._id ? this.sender._id : this.sender;
    const recipientId = typeof this.recipient === 'object' && this.recipient?._id ? this.recipient._id : this.recipient;

    const dataToSave = cleanDataForFirestore({
      sender: senderId,
      recipient: recipientId,
      content: this.content,
      read: this.read,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    });

    await db.collection(Collections.MESSAGES).doc(this._id).set(dataToSave, { merge: true });
    return this;
  }
}

export class Message {
  static async create(data: {
    sender: any;
    recipient: any;
    content: string;
    read?: boolean;
  }): Promise<IMessageDocument> {
    const senderId = typeof data.sender === 'object' && data.sender?._id ? data.sender._id.toString() : data.sender.toString();
    const recipientId = typeof data.recipient === 'object' && data.recipient?._id ? data.recipient._id.toString() : data.recipient.toString();
    const now = new Date();

    const docData = cleanDataForFirestore({
      sender: senderId,
      recipient: recipientId,
      content: data.content.trim(),
      read: data.read ?? false,
      createdAt: now,
      updatedAt: now,
    });

    const docRef = await db.collection(Collections.MESSAGES).add(docData);
    return new MessageDoc(docData, docRef.id);
  }

  static async findById(id: string): Promise<IMessageDocument | null> {
    if (!id) return null;
    const snap = await db.collection(Collections.MESSAGES).doc(id).get();
    if (!snap.exists) return null;
    return new MessageDoc(snap.data(), snap.id);
  }
}
