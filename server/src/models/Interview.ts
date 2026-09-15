import { db, Collections } from '../config/firebase.js';
import { dateFromFirestore, cleanDataForFirestore, resolvePopulate, PopulateOption } from './firestoreHelper.js';

export interface IInterviewDocument {
  _id: string;
  job: any;
  application: any;
  student: any;
  recruiter: any;
  title: string;
  scheduledAt: Date;
  durationMinutes: number;
  meetingLink: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  save(): Promise<IInterviewDocument>;
}

export class InterviewDoc implements IInterviewDocument {
  _id: string;
  job: any;
  application: any;
  student: any;
  recruiter: any;
  title: string;
  scheduledAt: Date;
  durationMinutes: number;
  meetingLink: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: any, id: string) {
    this._id = id;
    this.job = data.job;
    this.application = data.application;
    this.student = data.student;
    this.recruiter = data.recruiter;
    this.title = data.title || '';
    this.scheduledAt = dateFromFirestore(data.scheduledAt);
    this.durationMinutes = data.durationMinutes || 45;
    this.meetingLink = data.meetingLink || 'https://meet.google.com/recruitx-demo';
    this.status = data.status || 'scheduled';
    this.notes = data.notes;
    this.createdAt = dateFromFirestore(data.createdAt);
    this.updatedAt = dateFromFirestore(data.updatedAt);
  }

  async save(): Promise<IInterviewDocument> {
    this.updatedAt = new Date();

    const jobId = typeof this.job === 'object' && this.job?._id ? this.job._id : this.job;
    const appId = typeof this.application === 'object' && this.application?._id ? this.application._id : this.application;
    const studentId = typeof this.student === 'object' && this.student?._id ? this.student._id : this.student;
    const recruiterId = typeof this.recruiter === 'object' && this.recruiter?._id ? this.recruiter._id : this.recruiter;

    const dataToSave = cleanDataForFirestore({
      job: jobId,
      application: appId,
      student: studentId,
      recruiter: recruiterId,
      title: this.title,
      scheduledAt: this.scheduledAt,
      durationMinutes: this.durationMinutes,
      meetingLink: this.meetingLink,
      status: this.status,
      notes: this.notes,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    });

    await db.collection(Collections.INTERVIEWS).doc(this._id).set(dataToSave, { merge: true });
    return this;
  }
}

class InterviewQueryBuilder<T> implements PromiseLike<T> {
  private promise: () => Promise<T>;
  private populates: PopulateOption[] = [];
  private sortOption: any = null;

  constructor(promise: () => Promise<T>) {
    this.promise = promise;
  }

  populate(path: string, select?: string): InterviewQueryBuilder<T> {
    this.populates.push({ path, select });
    return this;
  }

  sort(sortOption: any): InterviewQueryBuilder<T> {
    this.sortOption = sortOption;
    return this;
  }

  private async execute(): Promise<T> {
    let result = await this.promise();

    if (Array.isArray(result)) {
      if (this.sortOption?.scheduledAt) {
        result.sort((a: any, b: any) =>
          this.sortOption.scheduledAt === -1
            ? b.scheduledAt.getTime() - a.scheduledAt.getTime()
            : a.scheduledAt.getTime() - b.scheduledAt.getTime()
        );
      }
      for (const item of result) {
        await resolvePopulate(item, this.populates);
      }
    } else if (result) {
      await resolvePopulate(result, this.populates);
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

export class Interview {
  static async create(data: {
    job: any;
    application: any;
    student: any;
    recruiter: any;
    title: string;
    scheduledAt: Date;
    durationMinutes?: number;
    meetingLink?: string;
    notes?: string;
    status?: string;
  }): Promise<IInterviewDocument> {
    const jobId = typeof data.job === 'object' && data.job._id ? data.job._id.toString() : data.job.toString();
    const appId = typeof data.application === 'object' && data.application._id ? data.application._id.toString() : data.application.toString();
    const studentId = typeof data.student === 'object' && data.student._id ? data.student._id.toString() : data.student.toString();
    const recruiterId = typeof data.recruiter === 'object' && data.recruiter._id ? data.recruiter._id.toString() : data.recruiter.toString();

    const now = new Date();
    const docData = cleanDataForFirestore({
      job: jobId,
      application: appId,
      student: studentId,
      recruiter: recruiterId,
      title: data.title,
      scheduledAt: data.scheduledAt,
      durationMinutes: data.durationMinutes || 45,
      meetingLink: data.meetingLink || 'https://meet.google.com/recruitx-demo',
      notes: data.notes || '',
      status: data.status || 'scheduled',
      createdAt: now,
      updatedAt: now,
    });

    const docRef = await db.collection(Collections.INTERVIEWS).add(docData);
    return new InterviewDoc(docData, docRef.id);
  }

  static find(filter: any = {}): InterviewQueryBuilder<IInterviewDocument[]> {
    return new InterviewQueryBuilder(async () => {
      let q: any = db.collection(Collections.INTERVIEWS);

      if (filter.student) {
        const studentId = typeof filter.student === 'object' && filter.student._id ? filter.student._id.toString() : filter.student.toString();
        q = q.where('student', '==', studentId);
      }
      if (filter.recruiter) {
        const recruiterId = typeof filter.recruiter === 'object' && filter.recruiter._id ? filter.recruiter._id.toString() : filter.recruiter.toString();
        q = q.where('recruiter', '==', recruiterId);
      }

      const snap = await q.get();
      return snap.docs.map((d: any) => new InterviewDoc(d.data(), d.id));
    });
  }

  static findById(id: string): InterviewQueryBuilder<IInterviewDocument | null> {
    return new InterviewQueryBuilder(async () => {
      if (!id) return null;
      const snap = await db.collection(Collections.INTERVIEWS).doc(id).get();
      if (!snap.exists) return null;
      return new InterviewDoc(snap.data(), snap.id);
    });
  }
}
