import { db, Collections } from '../config/firebase.js';
import { dateFromFirestore, cleanDataForFirestore } from './firestoreHelper.js';

export interface IResumeDocument {
  _id: string;
  student: any;
  headline: string;
  summary: string;
  fieldOfInterest: string;
  skills: string[];
  education: {
    institution: string;
    degree: string;
    fieldOfStudy: string;
    startYear: string;
    endYear: string;
    grade: string;
  }[];
  experience: {
    title: string;
    company: string;
    location: string;
    startDate: string;
    endDate: string;
    description: string;
  }[];
  projects: {
    title: string;
    description: string;
    technologies: string[];
    link?: string;
  }[];
  resumeUrl?: string;
  fileName?: string;
  fileData?: string;
  fileMimeType?: string;
  resumeVersion?: number;
  createdAt: Date;
  updatedAt: Date;
  save(): Promise<IResumeDocument>;
}

export class Resume implements IResumeDocument {
  _id: string;
  student: any;
  resumeVersion?: number;
  headline: string;
  summary: string;
  fieldOfInterest: string;
  skills: string[];
  resumeUrl?: string;
  fileName?: string;
  fileData?: string;
  fileMimeType?: string;
  education: {
    institution: string;
    degree: string;
    fieldOfStudy: string;
    startYear: string;
    endYear: string;
    grade: string;
  }[];
  experience: {
    title: string;
    company: string;
    location: string;
    startDate: string;
    endDate: string;
    description: string;
  }[];
  projects: {
    title: string;
    description: string;
    technologies: string[];
    link?: string;
  }[];
  createdAt: Date;
  updatedAt: Date;

  constructor(data: any = {}, id?: string) {
    this._id = id || data._id || db.collection(Collections.RESUMES).doc().id;
    this.student = data.student;
    this.headline = data.headline || '';
    this.summary = data.summary || '';
    this.fieldOfInterest = data.fieldOfInterest || '';
    this.skills = Array.isArray(data.skills) ? data.skills : [];
    this.education = Array.isArray(data.education) ? data.education : [];
    this.experience = Array.isArray(data.experience) ? data.experience : [];
    this.projects = Array.isArray(data.projects) ? data.projects : [];
    this.resumeUrl = data.resumeUrl;
    this.fileName = data.fileName;
    this.fileData = data.fileData;
    this.fileMimeType = data.fileMimeType;
    this.resumeVersion = data.resumeVersion || 1;
    this.createdAt = dateFromFirestore(data.createdAt);
    this.updatedAt = dateFromFirestore(data.updatedAt);
  }

  async save(): Promise<IResumeDocument> {
    this.updatedAt = new Date();
    const studentId = typeof this.student === 'object' && this.student?._id ? this.student._id : this.student;

    const dataToSave = cleanDataForFirestore({
      student: studentId,
      headline: this.headline,
      summary: this.summary,
      fieldOfInterest: this.fieldOfInterest,
      skills: this.skills,
      education: this.education,
      experience: this.experience,
      projects: this.projects,
      resumeUrl: this.resumeUrl || null,
      fileName: this.fileName || null,
      fileData: this.fileData || null,
      fileMimeType: this.fileMimeType || null,
      resumeVersion: this.resumeVersion || 1,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    });

    await db.collection(Collections.RESUMES).doc(this._id).set(dataToSave, { merge: true });
    return this;
  }

  static async create(data: any): Promise<IResumeDocument> {
    const resume = new Resume(data);
    await resume.save();
    return resume;
  }

  static async findOne(query: { student?: any; [key: string]: any }): Promise<Resume | null> {
    if (!query || !query.student) {
      return null;
    }

    const studentId = typeof query.student === 'object' && query.student?._id
      ? query.student._id.toString()
      : query.student.toString();

    if (!studentId || studentId === 'undefined' || studentId === 'null') {
      return null;
    }

    const snap = await db.collection(Collections.RESUMES).where('student', '==', studentId).limit(1).get();
    if (snap.empty) return null;

    const docSnap = snap.docs[0];
    const data = docSnap.data();

    // Strict identity verification: guarantee document belongs to this student
    const docStudent = typeof data.student === 'object' && data.student?._id
      ? data.student._id.toString()
      : data.student?.toString();

    if (docStudent && docStudent !== studentId) {
      return null;
    }

    return new Resume(data, docSnap.id);
  }

  static async find(query: any = {}): Promise<Resume[]> {
    let q: any = db.collection(Collections.RESUMES);

    if (query.student) {
      const studentId = typeof query.student === 'object' && query.student?._id ? query.student._id.toString() : query.student.toString();
      q = q.where('student', '==', studentId);
    }

    const snap = await q.get();
    return snap.docs.map((docSnap: any) => new Resume(docSnap.data(), docSnap.id));
  }

  static async findById(id: string): Promise<Resume | null> {
    if (!id) return null;
    const snap = await db.collection(Collections.RESUMES).doc(id).get();
    if (!snap.exists) return null;
    return new Resume(snap.data(), snap.id);
  }
}
