import { db, Collections } from '../config/firebase.js';
import { dateFromFirestore, cleanDataForFirestore, resolvePopulate, PopulateOption } from './firestoreHelper.js';

export type PrimaryApplicationStatus =
  | 'saved_in_recruitx'
  | 'external_application_required'
  | 'awaiting_employer_verification'
  | 'email_sent'
  | 'email_delivered'
  | 'employer_receipt_confirmed'
  | 'employer_status_updated'
  | 'submission_failed'
  | 'unable_to_verify';

export type EmployerHiringStage =
  | 'applied'
  | 'under_review'
  | 'shortlisted'
  | 'interview_scheduled'
  | 'offered'
  | 'rejected';

export type ApplicationStatus = PrimaryApplicationStatus | EmployerHiringStage;

export type EvidenceClassification =
  | 'internal_recruitx'
  | 'candidate_provided'
  | 'external_system_response'
  | 'independently_authenticated';

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
  | 'candidate_email_oauth'
  | 'external_portal';

export interface EmployerReceipt {
  receiptSource:
    | 'recruiter_in_app_review'
    | 'employer_confirmation_email'
    | 'external_ats_reference'
    | 'authorized_integration_sync'
    | 'employer_webhook'
    | 'candidate_self_reported';
  externalReferenceNumber?: string;
  employerSenderEmail?: string;
  employerConfirmationSnippet?: string;
  acknowledgedBy?: string;
  receiptHash?: string;
  confirmedAt: Date;
  verifiedNotes?: string;
  isIndependentlyAuthenticated?: boolean;
  rawEmailHeaders?: string;
  evidenceClassification?: EvidenceClassification;
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
  primaryStatus?: PrimaryApplicationStatus;
  hiringStage?: EmployerHiringStage;
  evidenceClassification?: EvidenceClassification;
  isIndependentlyAuthenticated?: boolean;
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
  // Genuine Candidate Email Transmission Fields (Parts 1, 4, 8)
  senderEmail?: string;
  recipientEmail?: string;
  emailProvider?: 'gmail' | 'outlook' | 'gateway';
  emailMessageId?: string;
  emailSentAt?: Date;
  emailDeliveryStatus?: 'sent' | 'delivered' | 'bounced' | 'failed';
  resumeAttached?: boolean;
  resumeFileName?: string;
  resumeFileSize?: number;
  coverLetterIncluded?: boolean;
  portalSubmissionConfirmedAt?: Date;
  autoApplied?: boolean;
  atsPlatform?: string;
  assistedAutofillManifest?: any;
  createdAt: Date;
  updatedAt: Date;
  save(): Promise<IApplicationDocument>;
}

export class ApplicationDoc implements IApplicationDocument {
  declare _id: string;
  declare job?: any;
  declare student: any;
  declare recruiter?: any;
  declare companyName?: string;
  declare jobTitle?: string;
  declare status: ApplicationStatus;
  declare primaryStatus?: PrimaryApplicationStatus;
  declare hiringStage?: EmployerHiringStage;
  declare evidenceClassification?: EvidenceClassification;
  declare isIndependentlyAuthenticated?: boolean;
  declare submissionStatus: ApplicationSubmissionStatus;
  declare submissionType: ApplicationSubmissionType;
  declare applicationDestination: string;
  declare destinationUrl?: string;
  declare confirmationDetails?: SubmissionConfirmation;
  declare verificationLifecycleStage: VerificationLifecycleStage;
  declare employerReceipt?: EmployerReceipt;
  declare externalAtsName?: string;
  declare externalStatus?: string;
  declare submissionError?: string;
  declare resumeTransmitted: boolean;
  declare candidateContactTransmitted: boolean;
  declare coverLetter?: string;
  declare resumeUrl?: string;
  declare rating?: number;
  declare internalNotes?: string;
  declare appliedAt: Date;
  declare statusHistory: {
    status: ApplicationStatus;
    changedAt: Date;
    note?: string;
  }[];
  // Email Transmission & Audit
  declare senderEmail?: string;
  declare recipientEmail?: string;
  declare emailProvider?: 'gmail' | 'outlook' | 'gateway';
  declare emailMessageId?: string;
  declare emailSentAt?: Date;
  declare emailDeliveryStatus?: 'sent' | 'delivered' | 'bounced' | 'failed';
  declare resumeAttached?: boolean;
  declare resumeFileName?: string;
  declare resumeFileSize?: number;
  declare coverLetterIncluded?: boolean;
  declare portalSubmissionConfirmedAt?: Date;
  declare autoApplied?: boolean;
  declare atsPlatform?: string;
  declare assistedAutofillManifest?: any;
  declare createdAt: Date;
  declare updatedAt: Date;

  constructor(data: any, id?: string) {
    this._id = id || data._id || data.id || '';
    this.job = data.job;
    this.student = data.student;
    this.recruiter = data.recruiter;
    this.companyName = data.companyName;
    this.jobTitle = data.jobTitle;
    this.hiringStage = data.hiringStage || (['under_review', 'shortlisted', 'interview_scheduled', 'offered', 'rejected'].includes(data.status) ? data.status : undefined);

    const VALID_PRIMARY_STATUSES: PrimaryApplicationStatus[] = [
      'saved_in_recruitx',
      'external_application_required',
      'awaiting_employer_verification',
      'email_sent',
      'email_delivered',
      'employer_receipt_confirmed',
      'employer_status_updated',
      'submission_failed',
      'unable_to_verify',
    ];

    if (data.primaryStatus && VALID_PRIMARY_STATUSES.includes(data.primaryStatus)) {
      this.status = data.primaryStatus;
    } else if (data.status && VALID_PRIMARY_STATUSES.includes(data.status)) {
      this.status = data.status;
    } else if (this.hiringStage) {
      this.status = 'employer_status_updated';
    } else if (data.submissionStatus === 'requires_manual_application') {
      this.status = 'external_application_required';
    } else if (data.emailDeliveryStatus === 'delivered' || data.status === 'email_delivered') {
      this.status = 'email_delivered';
    } else if (data.emailSentAt || data.emailMessageId || data.status === 'email_sent') {
      this.status = 'email_sent';
    } else if (data.submissionStatus === 'external_awaiting_verification' || (data.submissionStatus as string) === 'dispatched' || data.portalSubmissionConfirmedAt) {
      this.status = 'awaiting_employer_verification';
    } else if (data.submissionStatus === 'submission_failed') {
      this.status = 'submission_failed';
    } else if (data.submissionStatus === 'unable_to_verify') {
      this.status = 'unable_to_verify';
    } else if (data.employerReceipt?.isIndependentlyAuthenticated || data.isIndependentlyAuthenticated || data.evidenceClassification === 'independently_authenticated') {
      this.status = 'employer_receipt_confirmed';
    } else if (data.recruiter) {
      this.status = 'awaiting_employer_verification';
    } else if (data.submissionType === 'external_portal' || !data.recruiter) {
      this.status = 'external_application_required';
    } else {
      this.status = 'awaiting_employer_verification';
    }

    this.primaryStatus = (this.status as PrimaryApplicationStatus);
    this.isIndependentlyAuthenticated = Boolean(data.isIndependentlyAuthenticated || data.employerReceipt?.isIndependentlyAuthenticated || data.evidenceClassification === 'independently_authenticated');

    if (data.evidenceClassification) {
      this.evidenceClassification = data.evidenceClassification;
    } else if (this.isIndependentlyAuthenticated) {
      this.evidenceClassification = 'independently_authenticated';
    } else if (data.emailMessageId || (data.confirmationDetails?.messageId && data.submissionType === 'direct_hr_dispatch')) {
      this.evidenceClassification = 'external_system_response';
    } else if (data.employerReceipt?.receiptSource === 'candidate_self_reported' || data.submissionStatus === 'external_awaiting_verification' || (data.submissionStatus as string) === 'dispatched' || data.portalSubmissionConfirmedAt) {
      this.evidenceClassification = 'candidate_provided';
    } else {
      this.evidenceClassification = 'internal_recruitx';
    }

    this.submissionStatus = data.submissionStatus || (
      this.status === 'external_application_required' ? 'requires_manual_application' :
      this.status === 'awaiting_employer_verification' ? 'external_awaiting_verification' :
      this.status === 'email_sent' ? 'submitted' :
      this.status === 'email_delivered' ? 'submitted' :
      this.status === 'employer_receipt_confirmed' ? 'submitted' :
      this.status === 'employer_status_updated' ? 'submitted' :
      this.status === 'submission_failed' ? 'submission_failed' : 'pending'
    );
    this.submissionType = data.submissionType || (data.recruiter ? 'platform_recruiter' : (data.emailSentAt ? 'candidate_email_oauth' : 'external_portal'));
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

    // Email Transmission Details
    this.senderEmail = data.senderEmail;
    this.recipientEmail = data.recipientEmail;
    this.emailProvider = data.emailProvider;
    this.emailMessageId = data.emailMessageId;
    this.emailSentAt = data.emailSentAt ? dateFromFirestore(data.emailSentAt) : undefined;
    this.emailDeliveryStatus = data.emailDeliveryStatus;
    this.resumeAttached = data.resumeAttached !== undefined ? Boolean(data.resumeAttached) : undefined;
    this.resumeFileName = data.resumeFileName;
    this.resumeFileSize = data.resumeFileSize;
    this.coverLetterIncluded = data.coverLetterIncluded !== undefined ? Boolean(data.coverLetterIncluded) : undefined;
    this.portalSubmissionConfirmedAt = data.portalSubmissionConfirmedAt ? dateFromFirestore(data.portalSubmissionConfirmedAt) : undefined;
    this.autoApplied = data.autoApplied !== undefined ? Boolean(data.autoApplied) : false;
    this.atsPlatform = data.atsPlatform || undefined;
    this.assistedAutofillManifest = data.assistedAutofillManifest || undefined;

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
      primaryStatus: this.primaryStatus || this.status,
      hiringStage: this.hiringStage || null,
      evidenceClassification: this.evidenceClassification || 'internal_recruitx',
      isIndependentlyAuthenticated: this.isIndependentlyAuthenticated ?? false,
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
      // Email Transmission fields
      senderEmail: this.senderEmail || null,
      recipientEmail: this.recipientEmail || null,
      emailProvider: this.emailProvider || null,
      emailMessageId: this.emailMessageId || null,
      emailSentAt: this.emailSentAt || null,
      emailDeliveryStatus: this.emailDeliveryStatus || null,
      resumeAttached: this.resumeAttached ?? null,
      resumeFileName: this.resumeFileName || null,
      resumeFileSize: this.resumeFileSize || null,
      coverLetterIncluded: this.coverLetterIncluded ?? null,
      portalSubmissionConfirmedAt: this.portalSubmissionConfirmedAt || null,
      autoApplied: this.autoApplied ?? false,
      atsPlatform: this.atsPlatform || null,
      assistedAutofillManifest: this.assistedAutofillManifest || null,
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

  limit(num: number): ApplicationQueryBuilder<T> {
    const originalPromise = this.promise;
    this.promise = async () => {
      const res = await originalPromise();
      if (Array.isArray(res)) return res.slice(0, num) as any;
      return res;
    };
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
  constructor(data?: any, id?: string) {
    if (data) {
      return new ApplicationDoc(data, id) as any;
    }
  }

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
    evidenceClassification?: EvidenceClassification;
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
    portalSubmissionConfirmedAt?: Date | string;
    isIndependentlyAuthenticated?: boolean;
    senderEmail?: string;
    recipientEmail?: string;
    emailProvider?: 'gmail' | 'outlook' | 'gateway';
    emailMessageId?: string;
    emailSentAt?: Date;
    emailDeliveryStatus?: 'sent' | 'delivered' | 'bounced' | 'failed';
    resumeAttached?: boolean;
    resumeFileName?: string;
    resumeFileSize?: number;
    coverLetterIncluded?: boolean;
    primaryStatus?: PrimaryApplicationStatus;
    autoApplied?: boolean;
    atsPlatform?: string;
    assistedAutofillManifest?: any;
  }): Promise<IApplicationDocument> {
    const jobId = data.job ? (typeof data.job === 'object' && data.job._id ? data.job._id.toString() : data.job.toString()) : null;
    const studentId = typeof data.student === 'object' && data.student._id ? data.student._id.toString() : data.student.toString();
    const recruiterId = data.recruiter ? (typeof data.recruiter === 'object' && data.recruiter._id ? data.recruiter._id.toString() : data.recruiter.toString()) : null;

    const now = new Date();

    let computedStatus: ApplicationStatus = data.status || 'applied';
    if (!data.status || data.status === 'applied') {
      if (data.emailDeliveryStatus === 'delivered') {
        computedStatus = 'email_delivered';
      } else if (data.emailSentAt || data.emailMessageId) {
        computedStatus = 'email_sent';
      } else if (data.submissionStatus === 'requires_manual_application' || (!recruiterId && data.submissionType !== 'direct_hr_dispatch' && data.submissionType !== 'candidate_email_oauth')) {
        computedStatus = 'external_application_required';
      } else if (data.submissionStatus === 'external_awaiting_verification' || (data.submissionStatus as string) === 'dispatched' || data.portalSubmissionConfirmedAt) {
        computedStatus = 'awaiting_employer_verification';
      } else if (data.submissionStatus === 'submission_failed') {
        computedStatus = 'submission_failed';
      } else if (data.submissionStatus === 'unable_to_verify') {
        computedStatus = 'unable_to_verify';
      } else if (data.employerReceipt?.isIndependentlyAuthenticated || data.isIndependentlyAuthenticated || data.evidenceClassification === 'independently_authenticated') {
        computedStatus = 'employer_receipt_confirmed';
      } else if (recruiterId) {
        computedStatus = 'awaiting_employer_verification';
      } else {
        computedStatus = 'external_application_required';
      }
    }

    const status = computedStatus;
    const evidenceClassification: EvidenceClassification = data.evidenceClassification || (
      data.employerReceipt?.isIndependentlyAuthenticated || data.isIndependentlyAuthenticated ? 'independently_authenticated' :
      data.emailMessageId ? 'external_system_response' :
      data.confirmationDetails?.messageId && data.submissionType === 'direct_hr_dispatch' ? 'external_system_response' :
      data.submissionStatus === 'external_awaiting_verification' || (data.submissionStatus as string) === 'dispatched' || data.portalSubmissionConfirmedAt ? 'candidate_provided' :
      'internal_recruitx'
    );
    const statusHistory = data.statusHistory || [{ status, changedAt: now, note: 'Application record created' }];

    const docData = cleanDataForFirestore({
      job: jobId,
      student: studentId,
      recruiter: recruiterId,
      companyName: data.companyName || '',
      jobTitle: data.jobTitle || '',
      status,
      primaryStatus: status,
      hiringStage: (['under_review', 'shortlisted', 'interview_scheduled', 'offered', 'rejected'].includes(status) ? status : null),
      evidenceClassification,
      isIndependentlyAuthenticated: Boolean(data.isIndependentlyAuthenticated || data.employerReceipt?.isIndependentlyAuthenticated),
      submissionStatus: data.submissionStatus || (
        status === 'external_application_required' ? 'requires_manual_application' :
        status === 'awaiting_employer_verification' ? 'external_awaiting_verification' :
        status === 'email_sent' || status === 'email_delivered' ? 'submitted' :
        status === 'employer_receipt_confirmed' ? 'submitted' :
        status === 'employer_status_updated' ? 'submitted' :
        status === 'submission_failed' ? 'submission_failed' : 'pending'
      ),
      submissionType: data.submissionType || (recruiterId ? 'platform_recruiter' : (data.emailSentAt ? 'candidate_email_oauth' : 'external_portal')),
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
      // Email Transmission Details
      senderEmail: data.senderEmail || null,
      recipientEmail: data.recipientEmail || null,
      emailProvider: data.emailProvider || null,
      emailMessageId: data.emailMessageId || null,
      emailSentAt: data.emailSentAt || null,
      emailDeliveryStatus: data.emailDeliveryStatus || null,
      resumeAttached: data.resumeAttached ?? null,
      resumeFileName: data.resumeFileName || null,
      resumeFileSize: data.resumeFileSize || null,
      coverLetterIncluded: data.coverLetterIncluded ?? null,
      portalSubmissionConfirmedAt: data.portalSubmissionConfirmedAt || null,
      autoApplied: data.autoApplied ?? false,
      atsPlatform: data.atsPlatform || null,
      assistedAutofillManifest: data.assistedAutofillManifest || null,
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

      const docSnap = snap.docs[0];
      return new ApplicationDoc(docSnap.data(), docSnap.id);
    });
  }

  static find(query: any = {}): ApplicationQueryBuilder<IApplicationDocument[]> {
    return new ApplicationQueryBuilder(async () => {
      let q: any = db.collection(Collections.APPLICATIONS);

      if (query.student) {
        const studentId = typeof query.student === 'object' && query.student._id ? query.student._id.toString() : query.student.toString();
        q = q.where('student', '==', studentId);
      }
      if (query.recruiter) {
        const recruiterId = typeof query.recruiter === 'object' && query.recruiter._id ? query.recruiter._id.toString() : query.recruiter.toString();
        q = q.where('recruiter', '==', recruiterId);
      }
      if (query.job) {
        const jobId = typeof query.job === 'object' && query.job._id ? query.job._id.toString() : query.job.toString();
        q = q.where('job', '==', jobId);
      }
      if (query.status) {
        q = q.where('status', '==', query.status);
      }

      const snap = await q.get();
      const list: IApplicationDocument[] = snap.docs.map((docSnap: any) => new ApplicationDoc(docSnap.data(), docSnap.id));

      list.sort((a, b) => b.appliedAt.getTime() - a.appliedAt.getTime());
      return list;
    });
  }

  static async countDocuments(query: any = {}): Promise<number> {
    let q: any = db.collection(Collections.APPLICATIONS);
    if (query.student) {
      const studentId = typeof query.student === 'object' && query.student._id ? query.student._id.toString() : query.student.toString();
      q = q.where('student', '==', studentId);
    }
    if (query.recruiter) {
      const recruiterId = typeof query.recruiter === 'object' && query.recruiter._id ? query.recruiter._id.toString() : query.recruiter.toString();
      q = q.where('recruiter', '==', recruiterId);
    }
    const snap = await q.get();
    return snap.size;
  }

  static async deleteById(id: string): Promise<boolean> {
    if (!id) return false;
    await db.collection(Collections.APPLICATIONS).doc(id).delete();
    return true;
  }
}
