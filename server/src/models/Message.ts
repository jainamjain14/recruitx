import { db, Collections } from '../config/firebase.js';
import { dateFromFirestore, cleanDataForFirestore } from './firestoreHelper.js';

export interface IMeetingInfo {
  title: string;
  scheduledAt: string;
  durationMinutes: number;
  meetingLink: string;
  platform?: string;
  status: 'proposed' | 'accepted' | 'declined';
}

export interface IMessageDocument {
  _id: string;
  sender: any;
  recipient: any;
  participants: string[];
  content: string;
  meetingInfo?: IMeetingInfo;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
  save(): Promise<IMessageDocument>;
}

export class MessageDoc implements IMessageDocument {
  _id: string;
  sender: any;
  recipient: any;
  participants: string[];
  content: string;
  meetingInfo?: IMeetingInfo;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: any, id: string) {
    this._id = id;
    this.sender = data.sender;
    this.recipient = data.recipient;
    const senderId = typeof data.sender === 'object' && data.sender?._id ? data.sender._id.toString() : (data.sender || '').toString();
    const recipientId = typeof data.recipient === 'object' && data.recipient?._id ? data.recipient._id.toString() : (data.recipient || '').toString();
    this.participants = Array.isArray(data.participants) ? data.participants : [senderId, recipientId].sort();
    this.content = data.content || '';
    this.meetingInfo = data.meetingInfo;
    this.read = data.read ?? false;
    this.createdAt = dateFromFirestore(data.createdAt);
    this.updatedAt = dateFromFirestore(data.updatedAt);
  }

  async save(): Promise<IMessageDocument> {
    this.updatedAt = new Date();

    const senderId = typeof this.sender === 'object' && this.sender?._id ? this.sender._id.toString() : (this.sender || '').toString();
    const recipientId = typeof this.recipient === 'object' && this.recipient?._id ? this.recipient._id.toString() : (this.recipient || '').toString();
    const participants = [senderId, recipientId].sort();

    const dataToSave = cleanDataForFirestore({
      sender: senderId,
      recipient: recipientId,
      participants,
      content: this.content,
      meetingInfo: this.meetingInfo || null,
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
    meetingInfo?: IMeetingInfo;
    read?: boolean;
  }): Promise<IMessageDocument> {
    const senderId = typeof data.sender === 'object' && data.sender?._id ? data.sender._id.toString() : data.sender.toString();
    const recipientId = typeof data.recipient === 'object' && data.recipient?._id ? data.recipient._id.toString() : data.recipient.toString();
    const participants = [senderId, recipientId].sort();
    const now = new Date();

    const docData = cleanDataForFirestore({
      sender: senderId,
      recipient: recipientId,
      participants,
      content: data.content.trim(),
      meetingInfo: data.meetingInfo || null,
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

  static async findConversation(userId1: string, userId2: string): Promise<IMessageDocument[]> {
    const u1 = userId1.toString();
    const u2 = userId2.toString();
    const participantsKey = [u1, u2].sort();

    try {
      const snap = await db.collection(Collections.MESSAGES)
        .where('participants', '==', participantsKey)
        .get();

      if (!snap.empty) {
        const msgs = snap.docs.map(doc => new MessageDoc(doc.data(), doc.id));
        msgs.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        return msgs;
      }
    } catch {
      // Fallback below if participants query fails
    }

    // Fallback: query sender/recipient permutations
    const [snap1, snap2] = await Promise.all([
      db.collection(Collections.MESSAGES).where('sender', '==', u1).where('recipient', '==', u2).get(),
      db.collection(Collections.MESSAGES).where('sender', '==', u2).where('recipient', '==', u1).get(),
    ]);

    const seen = new Set<string>();
    const msgs: IMessageDocument[] = [];

    for (const doc of [...snap1.docs, ...snap2.docs]) {
      if (!seen.has(doc.id)) {
        seen.add(doc.id);
        msgs.push(new MessageDoc(doc.data(), doc.id));
      }
    }

    msgs.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    return msgs;
  }

  static async getConversationsForUser(userId: string): Promise<{
    otherUserId: string;
    lastMessage: IMessageDocument;
    unreadCount: number;
  }[]> {
    const uid = userId.toString();
    let docs: any[] = [];

    try {
      const snap = await db.collection(Collections.MESSAGES)
        .where('participants', 'array-contains', uid)
        .get();
      docs = snap.docs;
    } catch {
      // Fallback
      const [s1, s2] = await Promise.all([
        db.collection(Collections.MESSAGES).where('sender', '==', uid).get(),
        db.collection(Collections.MESSAGES).where('recipient', '==', uid).get(),
      ]);
      const seen = new Set<string>();
      for (const d of [...s1.docs, ...s2.docs]) {
        if (!seen.has(d.id)) {
          seen.add(d.id);
          docs.push(d);
        }
      }
    }

    const messages = docs.map(d => new MessageDoc(d.data(), d.id));
    const convMap = new Map<string, { otherUserId: string; lastMessage: IMessageDocument; unreadCount: number }>();

    for (const msg of messages) {
      const otherId = msg.sender.toString() === uid ? msg.recipient.toString() : msg.sender.toString();
      if (!otherId || otherId === uid) continue;

      const isUnreadForUser = msg.recipient.toString() === uid && !msg.read;
      const current = convMap.get(otherId);

      if (!current) {
        convMap.set(otherId, {
          otherUserId: otherId,
          lastMessage: msg,
          unreadCount: isUnreadForUser ? 1 : 0,
        });
      } else {
        if (isUnreadForUser) {
          current.unreadCount += 1;
        }
        if (msg.createdAt.getTime() > current.lastMessage.createdAt.getTime()) {
          current.lastMessage = msg;
        }
      }
    }

    const convList = Array.from(convMap.values());
    convList.sort((a, b) => b.lastMessage.createdAt.getTime() - a.lastMessage.createdAt.getTime());
    return convList;
  }

  static async markConversationAsRead(currentUserId: string, otherUserId: string): Promise<number> {
    const me = currentUserId.toString();
    const other = otherUserId.toString();

    const snap = await db.collection(Collections.MESSAGES)
      .where('sender', '==', other)
      .where('recipient', '==', me)
      .where('read', '==', false)
      .get();

    if (snap.empty) return 0;

    const batch = db.batch();
    snap.docs.forEach((d: any) => {
      batch.update(db.collection(Collections.MESSAGES).doc(d.id), { read: true, updatedAt: new Date() });
    });

    await batch.commit();
    return snap.size;
  }
}
