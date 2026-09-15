import { db, Collections } from '../config/firebase.js';
import { dateFromFirestore, cleanDataForFirestore, resolvePopulate, PopulateOption } from './firestoreHelper.js';

export interface IJobDocument {
  _id: string;
  recruiter: any;
  title: string;
  company: string;
  location: string;
  jobType: 'Full-Time' | 'Part-Time' | 'Internship' | 'Contract';
  workMode: 'On-site' | 'Remote' | 'Hybrid';
  salary: string;
  description: string;
  requirements: string[];
  skillsRequired: string[];
  experienceLevel: string;
  status: 'active' | 'closed' | 'draft';
  deadline?: Date;
  applicationsCount: number;
  createdAt: Date;
  updatedAt: Date;
  save(): Promise<IJobDocument>;
  deleteOne(): Promise<void>;
}

export class JobDoc implements IJobDocument {
  _id: string;
  recruiter: any;
  title: string;
  company: string;
  location: string;
  jobType: 'Full-Time' | 'Part-Time' | 'Internship' | 'Contract';
  workMode: 'On-site' | 'Remote' | 'Hybrid';
  salary: string;
  description: string;
  requirements: string[];
  skillsRequired: string[];
  experienceLevel: string;
  status: 'active' | 'closed' | 'draft';
  deadline?: Date;
  applicationsCount: number;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: any, id: string) {
    this._id = id;
    this.recruiter = data.recruiter;
    this.title = data.title || '';
    this.company = data.company || '';
    this.location = data.location || '';
    this.jobType = data.jobType || 'Full-Time';
    this.workMode = data.workMode || 'On-site';
    this.salary = data.salary || '';
    this.description = data.description || '';
    this.requirements = Array.isArray(data.requirements) ? data.requirements : [];
    this.skillsRequired = Array.isArray(data.skillsRequired) ? data.skillsRequired : [];
    this.experienceLevel = data.experienceLevel || 'Entry-Level';
    this.status = data.status || 'active';
    this.deadline = data.deadline ? dateFromFirestore(data.deadline) : undefined;
    this.applicationsCount = data.applicationsCount || 0;
    this.createdAt = dateFromFirestore(data.createdAt);
    this.updatedAt = dateFromFirestore(data.updatedAt);
  }

  async save(): Promise<IJobDocument> {
    this.updatedAt = new Date();
    const recruiterId = typeof this.recruiter === 'object' && this.recruiter?._id ? this.recruiter._id : this.recruiter;

    const dataToSave = cleanDataForFirestore({
      recruiter: recruiterId,
      title: this.title,
      company: this.company,
      location: this.location,
      jobType: this.jobType,
      workMode: this.workMode,
      salary: this.salary,
      description: this.description,
      requirements: this.requirements,
      skillsRequired: this.skillsRequired,
      experienceLevel: this.experienceLevel,
      status: this.status,
      deadline: this.deadline,
      applicationsCount: this.applicationsCount,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    });

    await db.collection(Collections.JOBS).doc(this._id).set(dataToSave, { merge: true });
    return this;
  }

  async deleteOne(): Promise<void> {
    await db.collection(Collections.JOBS).doc(this._id).delete();
  }
}

class JobQueryBuilder<T> implements PromiseLike<T> {
  private promise: () => Promise<T>;
  private populates: PopulateOption[] = [];
  private sortOption: any = null;

  constructor(promise: () => Promise<T>) {
    this.promise = promise;
  }

  populate(path: string, select?: string): JobQueryBuilder<T> {
    this.populates.push({ path, select });
    return this;
  }

  sort(sortOption: any): JobQueryBuilder<T> {
    this.sortOption = sortOption;
    return this;
  }

  private async execute(): Promise<T> {
    let result = await this.promise();

    if (Array.isArray(result)) {
      if (this.sortOption?.createdAt) {
        result.sort((a: any, b: any) =>
          this.sortOption.createdAt === -1
            ? b.createdAt.getTime() - a.createdAt.getTime()
            : a.createdAt.getTime() - b.createdAt.getTime()
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

export class Job {
  static async create(data: {
    recruiter: any;
    title: string;
    company: string;
    location: string;
    jobType?: string;
    workMode?: string;
    salary: string;
    description: string;
    requirements?: string[];
    skillsRequired?: string[];
    experienceLevel?: string;
    status?: string;
    deadline?: Date;
    applicationsCount?: number;
  }): Promise<IJobDocument> {
    const recruiterId = typeof data.recruiter === 'object' && data.recruiter?._id ? data.recruiter._id.toString() : data.recruiter.toString();
    const now = new Date();

    const docData = cleanDataForFirestore({
      recruiter: recruiterId,
      title: data.title.trim(),
      company: data.company.trim(),
      location: data.location.trim(),
      jobType: data.jobType || 'Full-Time',
      workMode: data.workMode || 'On-site',
      salary: data.salary,
      description: data.description,
      requirements: data.requirements || [],
      skillsRequired: data.skillsRequired || [],
      experienceLevel: data.experienceLevel || 'Entry-Level',
      status: data.status || 'active',
      deadline: data.deadline || null,
      applicationsCount: data.applicationsCount || 0,
      createdAt: now,
      updatedAt: now,
    });

    const docRef = await db.collection(Collections.JOBS).add(docData);
    return new JobDoc(docData, docRef.id);
  }

  static findById(id: string): JobQueryBuilder<IJobDocument | null> {
    return new JobQueryBuilder(async () => {
      if (!id) return null;
      const snap = await db.collection(Collections.JOBS).doc(id).get();
      if (!snap.exists) return null;
      return new JobDoc(snap.data(), snap.id);
    });
  }

  static find(filter: any = {}): JobQueryBuilder<IJobDocument[]> {
    return new JobQueryBuilder(async () => {
      let q: any = db.collection(Collections.JOBS);

      if (filter.recruiter) {
        q = q.where('recruiter', '==', filter.recruiter.toString());
      }
      if (filter.status && typeof filter.status === 'string') {
        q = q.where('status', '==', filter.status);
      }
      if (filter.jobType) {
        q = q.where('jobType', '==', filter.jobType);
      }
      if (filter.workMode) {
        q = q.where('workMode', '==', filter.workMode);
      }

      const snap = await q.get();
      let jobs: IJobDocument[] = snap.docs.map((d: any) => new JobDoc(d.data(), d.id));

      // Filter in-memory for regex/search queries
      if (filter.$or && Array.isArray(filter.$or)) {
        const searchRegex = filter.$or[0]?.title?.$regex || '';
        if (searchRegex) {
          const s = searchRegex.toLowerCase();
          jobs = jobs.filter(
            (j) =>
              j.title.toLowerCase().includes(s) ||
              j.company.toLowerCase().includes(s) ||
              j.description.toLowerCase().includes(s)
          );
        }
      }

      if (filter.location && typeof filter.location === 'object' && filter.location.$regex) {
        const locRegex = filter.location.$regex.toLowerCase();
        jobs = jobs.filter((j) => j.location.toLowerCase().includes(locRegex));
      }

      return jobs;
    });
  }

  static async countDocuments(filter: any = {}): Promise<number> {
    let q: any = db.collection(Collections.JOBS);
    if (filter.status) {
      q = q.where('status', '==', filter.status);
    }
    const snap = await q.get();
    return snap.size;
  }
}
