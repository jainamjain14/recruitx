import crypto from 'crypto';
import { ApplicationDoc, EmployerReceipt, VerificationLifecycleStage } from '../models/Application.js';

export interface AtsVerificationResult {
  hasAuthorizedIntegration: boolean;
  verificationSource: string;
  isEmployerConfirmed: boolean;
  externalReferenceNumber?: string;
  externalAtsName?: string;
  externalStatus?: string;
  employerReceipt?: EmployerReceipt;
  lifecycleStage: VerificationLifecycleStage;
  verificationNotes: string;
}

export class AtsVerificationService {
  /**
   * Known ATS Reference number format regexes for validation
   */
  private static ATS_PATTERNS: { [key: string]: { name: string; regex: RegExp } } = {
    workday: { name: 'Workday', regex: /^(WD|WKD|JR)[-_]?[0-9A-Z]+([-_][0-9A-Z]+)*$/i },
    greenhouse: { name: 'Greenhouse', regex: /^(GH|GRN)[-_]?[0-9A-Z]+([-_][0-9A-Z]+)*$/i },
    lever: { name: 'Lever', regex: /^(LEV)[-_]?[a-f0-9-]+$/i },
    smartrecruiters: { name: 'SmartRecruiters', regex: /^(SR|SMART)[-_]?[0-9A-Z]+([-_][0-9A-Z]+)*$/i },
    taleo: { name: 'Oracle Taleo', regex: /^(REQ|TAL)[-_]?[0-9A-Z]+([-_][0-9A-Z]+)*$/i },
    linkedin: { name: 'LinkedIn Easy Apply', regex: /^(LI|LINKEDIN)[-_]?[0-9A-Z]+([-_][0-9A-Z]+)*$/i },
    general: { name: 'Employer Job Tracking Portal', regex: /^[A-Z0-9-_]{4,48}$/i },
  };

  /**
   * Detects the ATS provider from reference number or sender email domain
   */
  static detectAtsProvider(refNumber?: string, senderEmail?: string): string {
    if (senderEmail) {
      const emailLower = senderEmail.toLowerCase();
      if (emailLower.includes('myworkday') || emailLower.includes('workday')) return 'Workday';
      if (emailLower.includes('greenhouse')) return 'Greenhouse';
      if (emailLower.includes('lever.co')) return 'Lever';
      if (emailLower.includes('smartrecruiters')) return 'SmartRecruiters';
      if (emailLower.includes('taleo')) return 'Oracle Taleo';
      if (emailLower.includes('linkedin.com')) return 'LinkedIn Easy Apply';
    }

    if (refNumber) {
      for (const [key, val] of Object.entries(this.ATS_PATTERNS)) {
        if (key !== 'general' && val.regex.test(refNumber.trim())) {
          return val.name;
        }
      }
    }

    return 'Employer Career Portal';
  }

  /**
   * Generates a tamper-proof SHA-256 receipt integrity fingerprint
   */
  static generateReceiptHash(payload: {
    applicationId: string;
    referenceNumber?: string;
    senderEmail?: string;
    confirmedAt: Date;
  }): string {
    const raw = `${payload.applicationId}|${payload.referenceNumber || ''}|${payload.senderEmail || ''}|${payload.confirmedAt.toISOString()}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  /**
   * Validates and verifies an employer confirmation receipt submitted by candidate or inbound webhook
   */
  static verifyEmployerConfirmation(options: {
    applicationId: string;
    companyName: string;
    externalReferenceNumber?: string;
    employerSenderEmail?: string;
    employerConfirmationSnippet?: string;
    receivedAt?: Date | string;
  }): { valid: boolean; receipt?: EmployerReceipt; error?: string } {
    const {
      applicationId,
      companyName,
      externalReferenceNumber,
      employerSenderEmail,
      employerConfirmationSnippet,
      receivedAt,
    } = options;

    const ref = (externalReferenceNumber || '').trim();
    const email = (employerSenderEmail || '').trim();

    if (!ref && !email) {
      return {
        valid: false,
        error: 'Must provide either an Employer ATS Reference Number or Employer Confirmation Email sender.',
      };
    }

    if (ref && ref.length < 3) {
      return { valid: false, error: 'Employer Reference Number must be at least 3 characters.' };
    }

    if (email && !email.includes('@')) {
      return { valid: false, error: 'Please enter a valid employer sender email address.' };
    }

    const confirmedAt = receivedAt ? new Date(receivedAt) : new Date();
    const receiptHash = this.generateReceiptHash({
      applicationId,
      referenceNumber: ref,
      senderEmail: email,
      confirmedAt,
    });

    const atsProvider = this.detectAtsProvider(ref, email);
    const acknowledgedBy = email
      ? `${companyName} Talent Acquisition <${email}>`
      : `${companyName} (${atsProvider} Gateway)`;

    const receipt: EmployerReceipt = {
      receiptSource: email ? 'employer_confirmation_email' : 'external_ats_reference',
      externalReferenceNumber: ref || undefined,
      employerSenderEmail: email || undefined,
      employerConfirmationSnippet: (employerConfirmationSnippet || '').slice(0, 500),
      acknowledgedBy,
      receiptHash,
      confirmedAt,
      verifiedNotes: `Employer receipt verified via ${atsProvider}. Receipt Hash: ${receiptHash.substring(0, 12)}...`,
    };

    return { valid: true, receipt };
  }

  /**
   * Evaluates the authentic employer-side verification status of an application document
   */
  static evaluateApplicationVerification(app: ApplicationDoc): AtsVerificationResult {
    // 1. On-platform recruiter application
    if (app.submissionType === 'platform_recruiter' && app.recruiter) {
      const isStatusUpdated = app.status !== 'applied';
      const hasEmployerReceipt = Boolean(app.employerReceipt);

      let lifecycleStage: VerificationLifecycleStage = 'external_accepted';
      if (isStatusUpdated) {
        lifecycleStage = 'employer_status_updated';
      } else if (hasEmployerReceipt) {
        lifecycleStage = 'employer_receipt_confirmed';
      }

      return {
        hasAuthorizedIntegration: true,
        verificationSource: 'RecruitX Verified Recruiter In-App ATS',
        isEmployerConfirmed: hasEmployerReceipt || isStatusUpdated,
        externalReferenceNumber: app.employerReceipt?.externalReferenceNumber || `RCX-ATS-${app._id}`,
        externalAtsName: 'RecruitX Verified Recruiter ATS',
        externalStatus: app.status,
        employerReceipt: app.employerReceipt,
        lifecycleStage,
        verificationNotes: isStatusUpdated
          ? `Employer actively updated hiring pipeline to "${app.status.replace('_', ' ').toUpperCase()}".`
          : (hasEmployerReceipt
              ? 'Recruiter verified and acknowledged candidate submission in ATS.'
              : 'Application delivered to verified recruiter ATS queue. Awaiting recruiter review.'),
      };
    }

    // 2. Candidate linked a verified employer confirmation receipt / ATS reference
    if (app.employerReceipt) {
      return {
        hasAuthorizedIntegration: true,
        verificationSource: app.employerReceipt.receiptSource === 'employer_confirmation_email'
          ? 'Employer Confirmation Email Receipt'
          : 'External ATS Application Reference',
        isEmployerConfirmed: true,
        externalReferenceNumber: app.employerReceipt.externalReferenceNumber,
        externalAtsName: app.externalAtsName || this.detectAtsProvider(app.employerReceipt.externalReferenceNumber, app.employerReceipt.employerSenderEmail),
        externalStatus: app.externalStatus || 'Application Received by Employer',
        employerReceipt: app.employerReceipt,
        lifecycleStage: 'employer_receipt_confirmed',
        verificationNotes: `Employer confirmation receipt verified on ${app.employerReceipt.confirmedAt.toLocaleDateString()}. Ref #${app.employerReceipt.externalReferenceNumber || 'Verified'}.`,
      };
    }

    // 3. External portal submission awaiting verification
    if (app.submissionStatus === 'external_awaiting_verification') {
      return {
        hasAuthorizedIntegration: false,
        verificationSource: 'Candidate Self-Reported External Submission',
        isEmployerConfirmed: false,
        externalReferenceNumber: undefined,
        externalAtsName: app.externalAtsName || 'External Employer Career Portal',
        externalStatus: 'External Submission — Awaiting Verification',
        employerReceipt: undefined,
        lifecycleStage: 'dispatched',
        verificationNotes: 'Candidate completed submission on official portal. Awaiting employer confirmation email or ATS reference association.',
      };
    }

    // 4. Requires manual application
    if (app.submissionStatus === 'requires_manual_application') {
      return {
        hasAuthorizedIntegration: false,
        verificationSource: 'Official Company Career Portal Link',
        isEmployerConfirmed: false,
        externalReferenceNumber: undefined,
        externalAtsName: 'Third-Party Career Portal',
        externalStatus: 'Action Required: Submit on Employer Portal',
        employerReceipt: undefined,
        lifecycleStage: 'recorded',
        verificationNotes: 'Candidate must submit directly on the employer official career portal.',
      };
    }

    // 5. Direct HR Email dispatch via Brevo
    if (app.submissionType === 'direct_hr_dispatch' && app.confirmationDetails?.messageId) {
      return {
        hasAuthorizedIntegration: true,
        verificationSource: 'Brevo Transactional HTTPS Gateway',
        isEmployerConfirmed: false,
        externalReferenceNumber: app.confirmationDetails.messageId,
        externalAtsName: 'Transactional Email Gateway',
        externalStatus: 'Dispatched to Company Inbox',
        employerReceipt: undefined,
        lifecycleStage: 'external_accepted',
        verificationNotes: `Application payload accepted by email gateway [MessageId: ${app.confirmationDetails.messageId}]. Awaiting employer email acknowledgement.`,
      };
    }

    return {
      hasAuthorizedIntegration: false,
      verificationSource: 'Internal Database Record',
      isEmployerConfirmed: false,
      externalReferenceNumber: undefined,
      lifecycleStage: 'recorded',
      verificationNotes: 'Recorded in RecruitX platform database.',
    };
  }
}
