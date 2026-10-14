import { db, Collections } from '../config/firebase.js';
import { dateFromFirestore, cleanDataForFirestore } from './firestoreHelper.js';

export interface IAuditLog {
  _id: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  targetResource: string;
  targetId?: string;
  details?: any;
  ipAddress?: string;
  timestamp: Date;
}

export class AuditLogDoc implements IAuditLog {
  _id: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  targetResource: string;
  targetId?: string;
  details?: any;
  ipAddress?: string;
  timestamp: Date;

  constructor(data: any, id: string) {
    this._id = id;
    this.actorId = data.actorId || 'system';
    this.actorName = data.actorName || 'System';
    this.actorRole = data.actorRole || 'admin';
    this.action = data.action || 'GENERAL_ACTION';
    this.targetResource = data.targetResource || 'system';
    this.targetId = data.targetId;
    this.details = data.details || {};
    this.ipAddress = data.ipAddress;
    this.timestamp = data.timestamp ? dateFromFirestore(data.timestamp) : new Date();
  }
}

export const AuditLog = {
  async create(data: {
    actorId: string;
    actorName: string;
    actorRole: string;
    action: string;
    targetResource: string;
    targetId?: string;
    details?: any;
    ipAddress?: string;
  }): Promise<AuditLogDoc> {
    const docRef = db.collection(Collections.AUDIT_LOGS).doc();
    const timestamp = new Date();
    const logData = cleanDataForFirestore({
      ...data,
      timestamp,
    });
    await docRef.set(logData);
    return new AuditLogDoc(logData, docRef.id);
  },

  async find(options: { limit?: number; action?: string } = {}): Promise<AuditLogDoc[]> {
    const limit = options.limit || 50;
    let query: any = db.collection(Collections.AUDIT_LOGS);

    if (options.action) {
      query = query.where('action', '==', options.action);
    }

    const snapshot = await query.orderBy('timestamp', 'desc').limit(limit).get();
    return snapshot.docs.map((doc: any) => new AuditLogDoc(doc.data(), doc.id));
  },
};
