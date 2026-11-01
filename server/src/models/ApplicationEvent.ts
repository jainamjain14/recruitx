import { db, Collections, Timestamp } from '../config/firebase.js';
import { dateFromFirestore, cleanDataForFirestore } from './firestoreHelper.js';

export type ApplicationEventType =
  | 'JOB_DISCOVERED'
  | 'APPLICATION_PREPARED'
  | 'SUBMISSION_ATTEMPTED'
  | 'APPLICATION_SUBMITTED'
  | 'EMAIL_DISPATCHED'
  | 'EMAIL_DELIVERED'
  | 'EMPLOYER_ACKNOWLEDGED'
  | 'ATS_REGISTERED'
  | 'INTERVIEW_SCHEDULED'
  | 'REJECTED'
  | 'OFFER_RECEIVED'
  | 'SUBMISSION_FAILED'
  | 'ACTION_REQUIRED';

export type ApplicationEventActor =
  | 'AUTONOMOUS_ENGINE'
  | 'GMAIL_INBOX_MONITOR'
  | 'OUTLOOK_INBOX_MONITOR'
  | 'GREENHOUSE_CONNECTOR'
  | 'LEVER_CONNECTOR'
  | 'WORKDAY_CONNECTOR'
  | 'PLATFORM_RECRUITER'
  | 'STUDENT'
  | 'SYSTEM';

export interface IApplicationEventDocument {
  _id: string;
  applicationId: string;
  studentId: string;
  companyName: string;
  jobTitle: string;
  eventType: ApplicationEventType;
  actor: ApplicationEventActor;
  title: string;
  description: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

const COLLECTION_NAME = 'application_events';

export class ApplicationEventDoc implements IApplicationEventDocument {
  declare _id: string;
  declare applicationId: string;
  declare studentId: string;
  declare companyName: string;
  declare jobTitle: string;
  declare eventType: ApplicationEventType;
  declare actor: ApplicationEventActor;
  declare title: string;
  declare description: string;
  declare metadata?: Record<string, any>;
  declare createdAt: Date;

  constructor(data: any, id: string) {
    this._id = id;
    this.applicationId = data.applicationId || '';
    this.studentId = data.studentId || '';
    this.companyName = data.companyName || '';
    this.jobTitle = data.jobTitle || '';
    this.eventType = data.eventType || 'JOB_DISCOVERED';
    this.actor = data.actor || 'SYSTEM';
    this.title = data.title || '';
    this.description = data.description || '';
    this.metadata = data.metadata || {};
    this.createdAt = dateFromFirestore(data.createdAt);
  }
}

export class ApplicationEvent {
  /**
   * Log an immutable telemetry event for an application lifecycle step
   */
  static async logEvent(data: {
    applicationId: string;
    studentId: string;
    companyName: string;
    jobTitle: string;
    eventType: ApplicationEventType;
    actor: ApplicationEventActor;
    title: string;
    description: string;
    metadata?: Record<string, any>;
  }): Promise<ApplicationEventDoc> {
    const now = new Date();
    const docData = cleanDataForFirestore({
      applicationId: data.applicationId,
      studentId: data.studentId,
      companyName: data.companyName,
      jobTitle: data.jobTitle,
      eventType: data.eventType,
      actor: data.actor,
      title: data.title,
      description: data.description,
      metadata: data.metadata || {},
      createdAt: now,
    });

    const docRef = await db.collection(COLLECTION_NAME).add(docData);
    return new ApplicationEventDoc(docData, docRef.id);
  }

  /**
   * Retrieve all events for a specific application in chronological order
   */
  static async getEventsByApplicationId(applicationId: string): Promise<ApplicationEventDoc[]> {
    if (!applicationId) return [];
    const snap = await db.collection(COLLECTION_NAME)
      .where('applicationId', '==', applicationId)
      .get();

    const events = snap.docs.map((d) => new ApplicationEventDoc(d.data(), d.id));
    return events.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  /**
   * Retrieve recent events for a specific student with user-level data isolation
   */
  static async getEventsByStudentId(studentId: string, limitCount: number = 50): Promise<ApplicationEventDoc[]> {
    if (!studentId) return [];
    const snap = await db.collection(COLLECTION_NAME)
      .where('studentId', '==', studentId)
      .get();

    const events = snap.docs.map((d) => new ApplicationEventDoc(d.data(), d.id));
    return events
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limitCount);
  }

  /**
   * Aggregate statistics across event types for a student
   */
  static async getStudentEventStats(studentId: string): Promise<{
    jobsDiscovered: number;
    applicationsPrepared: number;
    submissionsAttempted: number;
    applicationsSubmitted: number;
    emailsDispatched: number;
    emailsDelivered: number;
    employerAcknowledged: number;
    atsRegistered: number;
    interviewsScheduled: number;
    rejected: number;
    offersReceived: number;
    failedSubmissions: number;
    actionRequired: number;
  }> {
    if (!studentId) {
      return {
        jobsDiscovered: 0,
        applicationsPrepared: 0,
        submissionsAttempted: 0,
        applicationsSubmitted: 0,
        emailsDispatched: 0,
        emailsDelivered: 0,
        employerAcknowledged: 0,
        atsRegistered: 0,
        interviewsScheduled: 0,
        rejected: 0,
        offersReceived: 0,
        failedSubmissions: 0,
        actionRequired: 0,
      };
    }

    const snap = await db.collection(COLLECTION_NAME)
      .where('studentId', '==', studentId)
      .get();

    const stats = {
      jobsDiscovered: 0,
      applicationsPrepared: 0,
      submissionsAttempted: 0,
      applicationsSubmitted: 0,
      emailsDispatched: 0,
      emailsDelivered: 0,
      employerAcknowledged: 0,
      atsRegistered: 0,
      interviewsScheduled: 0,
      rejected: 0,
      offersReceived: 0,
      failedSubmissions: 0,
      actionRequired: 0,
    };

    snap.docs.forEach((doc) => {
      const type = doc.data().eventType as ApplicationEventType;
      switch (type) {
        case 'JOB_DISCOVERED': stats.jobsDiscovered++; break;
        case 'APPLICATION_PREPARED': stats.applicationsPrepared++; break;
        case 'SUBMISSION_ATTEMPTED': stats.submissionsAttempted++; break;
        case 'APPLICATION_SUBMITTED': stats.applicationsSubmitted++; break;
        case 'EMAIL_DISPATCHED': stats.emailsDispatched++; break;
        case 'EMAIL_DELIVERED': stats.emailsDelivered++; break;
        case 'EMPLOYER_ACKNOWLEDGED': stats.employerAcknowledged++; break;
        case 'ATS_REGISTERED': stats.atsRegistered++; break;
        case 'INTERVIEW_SCHEDULED': stats.interviewsScheduled++; break;
        case 'REJECTED': stats.rejected++; break;
        case 'OFFER_RECEIVED': stats.offersReceived++; break;
        case 'SUBMISSION_FAILED': stats.failedSubmissions++; break;
        case 'ACTION_REQUIRED': stats.actionRequired++; break;
      }
    });

    return stats;
  }
}

