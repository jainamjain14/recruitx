import { db, Collections } from '../config/firebase.js';
import { dateFromFirestore, cleanDataForFirestore, resolvePopulate, PopulateOption } from './firestoreHelper.js';

export type ApplicationStatus = 'applied' | 'under_review' | 'shortlisted' | 'interview_scheduled' | 'offered' | 'rejected';

export type ApplicationSubmissionStatus =
  | 'pending'
  | 'submitting'
  | 'submitted'
  | 'submission_failed'
  | 'requires_manual_application'
  | 'external_awaiting_verification'
  | 'unable_to_verify';

export type VerificationLifecycleStage =
  | 'recorded'
  | 'dispatched'
  | 'external_accepted'
  | 'employer_receipt_confirmed'
  | 'employer_status_updated';

export type ApplicationSubmissionType =
  | 'platform_recruiter'
  | 'direct_hr_dispatch'
  | 'external_portal';

export interface EmployerReceipt {
  receiptSource: 'recruiter_in_app_review' | 'employer_confirmation_email' | 'external_ats_reference' | 'authorized_integration_sync';
  externalReferenceNumber?: string;
  employerSenderEmail?: string;
  employerConfirmationSnippet?: string;
  acknowledgedBy?: string;
  receiptHash?: string;
  confirmedAt: Date;
  verifiedNotes?: string;
}

export interface SubmissionConfirmation {
  confirmationId?: string;
  recipient?: string;
  timestamp?: Date;
  dispatchMethod?: string;
  messageId?: string;
  verifiedAt?: Date;
}

export interface IApplicationDocument {
  _id: string;
  job?: any;
  student: any;
  recruiter?: any;
  companyName?: string;
  jobTitle?: string;
  status: ApplicationStatus;
  submissionStatus: ApplicationSubmissionStatus;
  submissionType: ApplicationSubmissionType;
  applicationDestination: string;
  destinationUrl?: string;
  confirmationDetails?: SubmissionConfirmation;
  verificationLifecycleStage: VerificationLifecycleStage;
  employerReceipt?: EmployerReceipt;
  externalAtsName?: string;
  externalStatus?: string;
  submissionError?: string;
  resumeTransmitted: boolean;
  candidateContactTransmitted: boolean;
  coverLetter?: string;
  resumeUrl?: string;
  rating?: number;
  internalNotes?: string;
  appliedAt: Date;
  statusHistory: {
    status: ApplicationStatus;
    changedAt: Date;
    note?: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
  save(): Promise<IApplicationDocument>;
}

export class ApplicationDoc implements IApplicationDocument {
  _id: string;
  job?: any;
  student: any;
  recruiter?: any;
  companyName?: string;
  jobTitle?: string;
  status: ApplicationStatus;
  submissionStatus: ApplicationSubmissionStatus;
  submissionType: ApplicationSubmissionType;
  applicationDestination: string;
  destinationUrl?: string;
  confirmationDetails?: SubmissionConfirmation;
  verificationLifecycleStage: VerificationLifecycleStage;
  employerReceipt?: EmployerReceipt;
  externalAtsName?: string;
  externalStatus?: string;
  submissionError?: string;
  resumeTransmitted: boolean;
  candidateContactTransmitted: boolean;
  coverLetter?: string;
  resumeUrl?: string;
  rating?: number;
  internalNotes?: string;
  appliedAt: Date;
  statusHistory: {
    status: ApplicationStatus;
    changedAt: Date;
    note?: string;
  }[];
  createdAt: Date;
  updatedAt: Date;

  constructor(data: any, id: string) {
    this._id = id;
    this.job = data.job;
    this.student = data.student;
    this.recruiter = data.recruiter;
    this.companyName = data.companyName;
    this.jobTitle = data.jobTitle;
    this.status = data.status || 'applied';
    this.submissionStatus = data.submissionStatus || (data.status === 'applied' ? 'submitted' : 'pending');
    this.submissionType = data.submissionType || (data.recruiter ? 'platform_recruiter' : 'external_portal');
    this.applicationDestination = data.applicationDestination || (data.recruiter ? 'RecruitX Verified Recruiter Portal' : 'Platform Application System');
    this.destinationUrl = data.destinationUrl || '';
    this.confirmationDetails = data.confirmationDetails || undefined;
    this.verificationLifecycleStage = data.verificationLifecycleStage || (
      data.employerReceipt ? 'employer_receipt_confirmed' :
      (data.submissionStatus === 'submitted' ? (data.recruiter ? 'external_accepted' : 'employer_receipt_confirmed') :
      (data.submissionStatus === 'external_awaiting_verification' ? 'dispatched' : 'recorded'))
    );
    this.employerReceipt = data.employerReceipt ? {
      ...data.employerReceipt,
      confirmedAt: dateFromFirestore(data.employerReceipt.confirmedAt),
    } : undefined;
    this.externalAtsName = data.externalAtsName || undefined;
    this.externalStatus = data.externalStatus || undefined;
    this.submissionError = data.submissionError || '';
    this.resumeTransmitted = data.resumeTransmitted !== undefined ? Boolean(data.resumeTransmitted) : true;
    this.candidateContactTransmitted = data.candidateContactTransmitted !== undefined ? Boolean(data.candidateContactTransmitted) : true;
    this.coverLetter = data.coverLetter || '';
    this.resumeUrl = data.resumeUrl || '';
    this.rating = data.rating;
    this.internalNotes = data.internalNotes || '';
    this.appliedAt = dateFromFirestore(data.appliedAt);
    this.statusHistory = Array.isArray(data.statusHistory)
      ? data.statusHistory.map((h: any) => ({
          status: h.status,
          changedAt: dateFromFirestore(h.changedAt),
          note: h.note,
        }))
      : [];
    this.createdAt = dateFromFirestore(data.createdAt);
    this.updatedAt = dateFromFirestore(data.updatedAt);
  }

  async save(): Promise<IApplicationDocument> {
    this.updatedAt = new Date();

    const jobId = typeof this.job === 'object' && this.job?._id ? this.job._id : this.job;
    const studentId = typeof this.student === 'object' && this.student?._id ? this.student._id : this.student;
    const recruiterId = typeof this.recruiter === 'object' && this.recruiter?._id ? this.recruiter._id : this.recruiter;

    const dataToSave = cleanDataForFirestore({
      job: jobId || null,
      student: studentId,
      recruiter: recruiterId || null,
      companyName: this.companyName,
      jobTitle: this.jobTitle,
      status: this.status,
      submissionStatus: this.submissionStatus,
      submissionType: this.submissionType,
      applicationDestination: this.applicationDestination,
      destinationUrl: this.destinationUrl || null,
      confirmationDetails: this.confirmationDetails || null,
      verificationLifecycleStage: this.verificationLifecycleStage,
      employerReceipt: this.employerReceipt || null,
      externalAtsName: this.externalAtsName || null,
      externalStatus: this.externalStatus || null,
      submissionError: this.submissionError || null,
      resumeTransmitted: this.resumeTransmitted,
      candidateContactTransmitted: this.candidateContactTransmitted,
      coverLetter: this.coverLetter,
      resumeUrl: this.resumeUrl,
      rating: this.rating !== undefined ? this.rating : null,
      internalNotes: this.internalNotes || '',
      appliedAt: this.appliedAt,
      statusHistory: this.statusHistory,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    });

    await db.collection(Collections.APPLICATIONS).doc(this._id).set(dataToSave, { merge: true });
    return this;
  }
}

class ApplicationQueryBuilder<T> implements PromiseLike<T> {
  private promise: () => Promise<T>;
  private populates: PopulateOption[] = [];
  private sortOption: any = null;

  constructor(promise: () => Promise<T>) {
    this.promise = promise;
  }

  populate(path: string, select?: string): ApplicationQueryBuilder<T> {
    this.populates.push({ path, select });
    return this;
  }

  sort(sortOption: any): ApplicationQueryBuilder<T> {
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

export class Application {
  static async create(data: {
    job?: any;
    student: any;
    recruiter?: any;
    companyName?: string;
    jobTitle?: string;
    coverLetter?: string;
    resumeUrl?: string;
    rating?: number;
    internalNotes?: string;
    status?: ApplicationStatus;
    submissionStatus?: ApplicationSubmissionStatus;
    submissionType?: ApplicationSubmissionType;
    applicationDestination?: string;
    destinationUrl?: string;
    confirmationDetails?: SubmissionConfirmation;
    verificationLifecycleStage?: VerificationLifecycleStage;
    employerReceipt?: EmployerReceipt;
    externalAtsName?: string;
    externalStatus?: string;
    submissionError?: string;
    resumeTransmitted?: boolean;
    candidateContactTransmitted?: boolean;
    statusHistory?: any[];
  }): Promise<IApplicationDocument> {
    const jobId = data.job ? (typeof data.job === 'object' && data.job._id ? data.job._id.toString() : data.job.toString()) : null;
    const studentId = typeof data.student === 'object' && data.student._id ? data.student._id.toString() : data.student.toString();
    const recruiterId = data.recruiter ? (typeof data.recruiter === 'object' && data.recruiter._id ? data.recruiter._id.toString() : data.recruiter.toString()) : null;

    const now = new Date();
    const status = data.status || 'applied';
    const statusHistory = data.statusHistory || [{ status, changedAt: now, note: 'Application submitted' }];

    const docData = cleanDataForFirestore({
      job: jobId,
      student: studentId,
      recruiter: recruiterId,
      companyName: data.companyName || '',
      jobTitle: data.jobTitle || '',
      status,
      submissionStatus: data.submissionStatus || (status === 'applied' ? 'submitted' : 'pending'),
      submissionType: data.submissionType || (recruiterId ? 'platform_recruiter' : 'external_portal'),
      applicationDestination: data.applicationDestination || (recruiterId ? 'RecruitX Verified Recruiter Portal' : 'Platform Application System'),
      destinationUrl: data.destinationUrl || null,
      confirmationDetails: data.confirmationDetails || null,
      verificationLifecycleStage: data.verificationLifecycleStage || (
        data.employerReceipt ? 'employer_receipt_confirmed' :
        (data.submissionStatus === 'submitted' ? (recruiterId ? 'external_accepted' : 'employer_receipt_confirmed') :
        (data.submissionStatus === 'external_awaiting_verification' ? 'dispatched' : 'recorded'))
      ),
      employerReceipt: data.employerReceipt || null,
      externalAtsName: data.externalAtsName || null,
      externalStatus: data.externalStatus || null,
      submissionError: data.submissionError || null,
      resumeTransmitted: data.resumeTransmitted !== undefined ? Boolean(data.resumeTransmitted) : true,
      candidateContactTransmitted: data.candidateContactTransmitted !== undefined ? Boolean(data.candidateContactTransmitted) : true,
      coverLetter: data.coverLetter || '',
      resumeUrl: data.resumeUrl || '',
      rating: data.rating !== undefined ? data.rating : null,
      internalNotes: data.internalNotes || '',
      appliedAt: now,
      statusHistory,
      createdAt: now,
      updatedAt: now,
    });

    const docRef = await db.collection(Collections.APPLICATIONS).add(docData);
    return new ApplicationDoc(docData, docRef.id);
  }

  static findById(id: string): ApplicationQueryBuilder<IApplicationDocument | null> {
    return new ApplicationQueryBuilder(async () => {
      if (!id) return null;
      const snap = await db.collection(Collections.APPLICATIONS).doc(id).get();
      if (!snap.exists) return null;
      return new ApplicationDoc(snap.data(), snap.id);
    });
  }

  static findOne(query: any): ApplicationQueryBuilder<IApplicationDocument | null> {
    return new ApplicationQueryBuilder(async () => {
      let q: any = db.collection(Collections.APPLICATIONS);

      if (query.job) {
        const jobId = typeof query.job === 'object' && query.job._id ? query.job._id.toString() : query.job.toString();
        q = q.where('job', '==', jobId);
      }
      if (query.student) {
        const studentId = typeof query.student === 'object' && query.student._id ? query.student._id.toString() : query.student.toString();
        q = q.where('student', '==', studentId);
      }
      if (query.companyName) {
        q = q.where('companyName', '==', query.companyName);
      }
      if (query.jobTitle) {
        q = q.where('jobTitle', '==', query.jobTitle);
      }

      const snap = await q.limit(1).get();
      if (snap.empty) return null;
      return new ApplicationDoc(snap.docs[0].data(), snap.docs[0].id);
    });
  }

  static find(filter: any = {}): ApplicationQueryBuilder<IApplicationDocument[]> {
    return new ApplicationQueryBuilder(async () => {
      let q: any = db.collection(Collections.APPLICATIONS);

      if (filter.student) {
        const studentId = typeof filter.student === 'object' && filter.student._id ? filter.student._id.toString() : filter.student.toString();
        q = q.where('student', '==', studentId);
      }
      if (filter.recruiter) {
        const recruiterId = typeof filter.recruiter === 'object' && filter.recruiter._id ? filter.recruiter._id.toString() : filter.recruiter.toString();
        q = q.where('recruiter', '==', recruiterId);
      }
      if (filter.status) {
        q = q.where('status', '==', filter.status);
      }

      const snap = await q.get();
      return snap.docs.map((d: any) => new ApplicationDoc(d.data(), d.id));
    });
  }

  static async countDocuments(filter: any = {}): Promise<number> {
    let q: any = db.collection(Collections.APPLICATIONS);
    if (filter.status) {
      q = q.where('status', '==', filter.status);
    }
    const snap = await q.get();
    return snap.size;
  }
}
