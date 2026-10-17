import { db, Collections } from '../config/firebase.js';
import { dateFromFirestore, cleanDataForFirestore } from './firestoreHelper.js';

export interface IAssessmentResultDocument {
  _id: string;
  student: string;
  type: 'quiz' | 'coding_challenge';
  category: string;
  title: string;
  score: number;
  totalQuestions?: number;
  correctQuestions?: number;
  passed: boolean;
  code?: string;
  feedback?: string;
  skillsAssessed: string[];
  completedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  save(): Promise<IAssessmentResultDocument>;
  deleteOne(): Promise<void>;
}

export class AssessmentResultDoc implements IAssessmentResultDocument {
  _id: string;
  student: string;
  type: 'quiz' | 'coding_challenge';
  category: string;
  title: string;
  score: number;
  totalQuestions?: number;
  correctQuestions?: number;
  passed: boolean;
  code?: string;
  feedback?: string;
  skillsAssessed: string[];
  completedAt: Date;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: any, id: string) {
    this._id = id;
    this.student = typeof data.student === 'object' && data.student?._id ? data.student._id.toString() : (data.student?.toString() || '');
    this.type = data.type === 'coding_challenge' ? 'coding_challenge' : 'quiz';
    this.category = data.category || 'General';
    this.title = data.title || 'Technical Assessment';
    this.score = typeof data.score === 'number' ? data.score : 0;
    this.totalQuestions = data.totalQuestions;
    this.correctQuestions = data.correctQuestions;
    this.passed = data.passed ?? (this.score >= 60);
    this.code = data.code || '';
    this.feedback = data.feedback || '';
    this.skillsAssessed = Array.isArray(data.skillsAssessed) ? data.skillsAssessed : [];
    this.completedAt = dateFromFirestore(data.completedAt) || new Date();
    this.createdAt = dateFromFirestore(data.createdAt) || new Date();
    this.updatedAt = dateFromFirestore(data.updatedAt) || new Date();
  }

  async save(): Promise<IAssessmentResultDocument> {
    this.updatedAt = new Date();
    const dataToSave = cleanDataForFirestore({
      student: this.student,
      type: this.type,
      category: this.category,
      title: this.title,
      score: this.score,
      totalQuestions: this.totalQuestions,
      correctQuestions: this.correctQuestions,
      passed: this.passed,
      code: this.code,
      feedback: this.feedback,
      skillsAssessed: this.skillsAssessed,
      completedAt: this.completedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    });

    await db.collection(Collections.ASSESSMENT_RESULTS).doc(this._id).set(dataToSave, { merge: true });
    return this;
  }

  async deleteOne(): Promise<void> {
    await db.collection(Collections.ASSESSMENT_RESULTS).doc(this._id).delete();
  }

  static async create(data: Partial<IAssessmentResultDocument>): Promise<IAssessmentResultDocument> {
    const now = new Date();
    const studentId = data.student?.toString() || '';

    const docData = cleanDataForFirestore({
      student: studentId,
      type: data.type || 'quiz',
      category: data.category || 'General',
      title: data.title || 'Technical Assessment',
      score: data.score || 0,
      totalQuestions: data.totalQuestions || 0,
      correctQuestions: data.correctQuestions || 0,
      passed: data.passed ?? ((data.score || 0) >= 60),
      code: data.code || '',
      feedback: data.feedback || '',
      skillsAssessed: data.skillsAssessed || [],
      completedAt: data.completedAt || now,
      createdAt: now,
      updatedAt: now,
    });

    const docRef = db.collection(Collections.ASSESSMENT_RESULTS).doc();
    await docRef.set(docData);
    return new AssessmentResultDoc(docData, docRef.id);
  }

  static async find(filter: { student?: any } = {}): Promise<IAssessmentResultDocument[]> {
    let q: any = db.collection(Collections.ASSESSMENT_RESULTS);

    if (filter.student) {
      const studentId = typeof filter.student === 'object' && filter.student?._id ? filter.student._id.toString() : filter.student.toString();
      q = q.where('student', '==', studentId);
    }

    const snap = await q.get();
    const results = snap.docs.map((doc: any) => new AssessmentResultDoc(doc.data(), doc.id));
    return results.sort((a: AssessmentResultDoc, b: AssessmentResultDoc) => b.completedAt.getTime() - a.completedAt.getTime());
  }

  static async findOne(filter: { student?: any; category?: string; type?: string }): Promise<IAssessmentResultDocument | null> {
    let q: any = db.collection(Collections.ASSESSMENT_RESULTS);

    if (filter.student) {
      const studentId = typeof filter.student === 'object' && filter.student?._id ? filter.student._id.toString() : filter.student.toString();
      q = q.where('student', '==', studentId);
    }
    if (filter.category) {
      q = q.where('category', '==', filter.category);
    }
    if (filter.type) {
      q = q.where('type', '==', filter.type);
    }

    const snap = await q.limit(1).get();
    if (snap.empty) return null;
    return new AssessmentResultDoc(snap.docs[0].data(), snap.docs[0].id);
  }
}

export const AssessmentResult = AssessmentResultDoc;
