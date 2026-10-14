import { db, Collections } from '../config/firebase.js';
import { dateFromFirestore, cleanDataForFirestore } from './firestoreHelper.js';

export interface ICourseCompletionDocument {
  _id: string;
  student: string;
  courseId: string;
  courseTitle: string;
  provider: string;
  pricingType: 'free' | 'paid';
  certificateUrl?: string;
  certificateId?: string;
  skillsAcquired: string[];
  completedAt: Date;
  verificationMethod: 'coursera_certificate' | 'free_audit';
  createdAt: Date;
  updatedAt: Date;
  save(): Promise<ICourseCompletionDocument>;
  deleteOne(): Promise<void>;
}

export class CourseCompletionDoc implements ICourseCompletionDocument {
  _id: string;
  student: string;
  courseId: string;
  courseTitle: string;
  provider: string;
  pricingType: 'free' | 'paid';
  certificateUrl?: string;
  certificateId?: string;
  skillsAcquired: string[];
  completedAt: Date;
  verificationMethod: 'coursera_certificate' | 'free_audit';
  createdAt: Date;
  updatedAt: Date;

  constructor(data: any, id: string) {
    this._id = id;
    this.student = typeof data.student === 'object' && data.student?._id ? data.student._id.toString() : (data.student?.toString() || '');
    this.courseId = data.courseId || '';
    this.courseTitle = data.courseTitle || '';
    this.provider = data.provider || 'Coursera Partner';
    this.pricingType = data.pricingType === 'free' ? 'free' : 'paid';
    this.certificateUrl = data.certificateUrl || '';
    this.certificateId = data.certificateId || '';
    this.skillsAcquired = Array.isArray(data.skillsAcquired) ? data.skillsAcquired : [];
    this.completedAt = dateFromFirestore(data.completedAt) || new Date();
    this.verificationMethod = data.verificationMethod || 'free_audit';
    this.createdAt = dateFromFirestore(data.createdAt) || new Date();
    this.updatedAt = dateFromFirestore(data.updatedAt) || new Date();
  }

  async save(): Promise<ICourseCompletionDocument> {
    this.updatedAt = new Date();
    const dataToSave = cleanDataForFirestore({
      student: this.student,
      courseId: this.courseId,
      courseTitle: this.courseTitle,
      provider: this.provider,
      pricingType: this.pricingType,
      certificateUrl: this.certificateUrl,
      certificateId: this.certificateId,
      skillsAcquired: this.skillsAcquired,
      completedAt: this.completedAt,
      verificationMethod: this.verificationMethod,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    });

    await db.collection(Collections.COURSE_COMPLETIONS).doc(this._id).set(dataToSave, { merge: true });
    return this;
  }

  async deleteOne(): Promise<void> {
    await db.collection(Collections.COURSE_COMPLETIONS).doc(this._id).delete();
  }

  static async create(data: Partial<ICourseCompletionDocument>): Promise<ICourseCompletionDocument> {
    const now = new Date();
    const studentId = data.student?.toString() || '';

    const docData = cleanDataForFirestore({
      student: studentId,
      courseId: data.courseId || '',
      courseTitle: data.courseTitle || '',
      provider: data.provider || 'Coursera Partner',
      pricingType: data.pricingType || 'paid',
      certificateUrl: data.certificateUrl || '',
      certificateId: data.certificateId || '',
      skillsAcquired: data.skillsAcquired || [],
      completedAt: data.completedAt || now,
      verificationMethod: data.verificationMethod || 'coursera_certificate',
      createdAt: now,
      updatedAt: now,
    });

    const docRef = db.collection(Collections.COURSE_COMPLETIONS).doc();
    await docRef.set(docData);
    return new CourseCompletionDoc(docData, docRef.id);
  }

  static async findOne(filter: { student?: any; courseId?: string }): Promise<ICourseCompletionDocument | null> {
    let q: any = db.collection(Collections.COURSE_COMPLETIONS);

    if (filter.student) {
      const studentId = typeof filter.student === 'object' && filter.student?._id ? filter.student._id.toString() : filter.student.toString();
      q = q.where('student', '==', studentId);
    }
    if (filter.courseId) {
      q = q.where('courseId', '==', filter.courseId);
    }

    const snap = await q.limit(1).get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return new CourseCompletionDoc(doc.data(), doc.id);
  }

  static async find(filter: { student?: any } = {}): Promise<ICourseCompletionDocument[]> {
    let q: any = db.collection(Collections.COURSE_COMPLETIONS);

    if (filter.student) {
      const studentId = typeof filter.student === 'object' && filter.student?._id ? filter.student._id.toString() : filter.student.toString();
      q = q.where('student', '==', studentId);
    }

    const snap = await q.get();
    return snap.docs.map((doc: any) => new CourseCompletionDoc(doc.data(), doc.id));
  }

  static async deleteMany(filter: { student?: any; courseId?: string }): Promise<number> {
    let q: any = db.collection(Collections.COURSE_COMPLETIONS);

    if (filter.student) {
      const studentId = typeof filter.student === 'object' && filter.student?._id ? filter.student._id.toString() : filter.student.toString();
      q = q.where('student', '==', studentId);
    }
    if (filter.courseId) {
      q = q.where('courseId', '==', filter.courseId);
    }

    const snap = await q.get();
    if (snap.empty) return 0;

    const batch = db.batch();
    snap.docs.forEach((doc: any) => batch.delete(doc.ref));
    await batch.commit();
    return snap.size;
  }
}

export const CourseCompletion = CourseCompletionDoc;
