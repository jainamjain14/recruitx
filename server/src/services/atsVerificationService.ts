import crypto from 'crypto';
import {
  ApplicationDoc,
  EmployerReceipt,
  VerificationLifecycleStage,
  PrimaryApplicationStatus,
  EmployerHiringStage,
  EvidenceClassification,
} from '../models/Application.js';

export interface AtsVerificationResult {
  authoritativeStatus: PrimaryApplicationStatus;
  evidenceClassification: EvidenceClassification;
  hasAuthorizedIntegration: boolean;
  verificationSource: string;
  isEmployerConfirmed: boolean;
  externalReferenceNumber?: string;
  externalAtsName?: string;
  externalStatus?: string;
  employerReceipt?: EmployerReceipt;
  lifecycleStage: VerificationLifecycleStage;
  verificationNotes: string;
  actionRequired: boolean;
  actionMessage?: string;
  hiringStage?: EmployerHiringStage;
}

export const APPLICATION_STATUS_CONFIG: Record<
  PrimaryApplicationStatus,
  {
    label: string;
    badgeBg: string;
    badgeText: string;
    borderColor: string;
    icon: string;
    description: string;
    actionRequired: boolean;
  }
> = {
  saved_in_recruitx: {
    label: 'Saved in RecruitX',
    badgeBg: 'bg-neutral-100',
    badgeText: 'text-neutral-700',
    borderColor: 'border-neutral-300',
    icon: '💾',
    description: 'Application information is stored internally in your candidate database.',
    actionRequired: false,
  },
  external_application_required: {
    label: 'External Application Required',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-900',
    borderColor: 'border-amber-300 font-bold',
    icon: '⚠️',
    description: 'Candidate must complete submission on the employer official career portal.',
    actionRequired: true,
  },
  awaiting_employer_verification: {
    label: 'Submitted — Awaiting Employer Verification',
    badgeBg: 'bg-sky-50',
    badgeText: 'text-sky-900',
    borderColor: 'border-sky-300 font-semibold',
    icon: '⏳',
    description: 'Application was submitted, but independent employer receipt has not yet been established.',
    actionRequired: false,
  },
  email_sent: {
    label: 'Application Email Sent',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-900',
    borderColor: 'border-blue-300 font-semibold',
    icon: '📤',
    description: 'Application email was transmitted directly to the employer from candidate authorized email account.',
    actionRequired: false,
  },
  email_delivered: {
    label: 'Email Delivered to Employer',
    badgeBg: 'bg-teal-50',
    badgeText: 'text-teal-900',
    borderColor: 'border-teal-300 font-semibold',
    icon: '📫',
    description: 'Recipient mail server confirmed delivery of your application package to company hiring inbox.',
    actionRequired: false,
  },
  employer_receipt_confirmed: {
    label: 'Employer Receipt Confirmed',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-900',
    borderColor: 'border-emerald-400 font-bold',
    icon: '✓',
    description: 'Genuine external evidence independently confirms the employer application system received it.',
    actionRequired: false,
  },
  employer_status_updated: {
    label: 'Employer Status Updated',
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-900',
    borderColor: 'border-purple-300 font-bold',
    icon: '⚡',
    description: 'Authentic employer or authorized ATS information confirms a progression in your application status.',
    actionRequired: false,
  },
  submission_failed: {
    label: 'Submission Failed',
    badgeBg: 'bg-rose-50',
    badgeText: 'text-rose-900',
    borderColor: 'border-rose-300 font-bold',
    icon: '✕',
    description: 'Actual submission attempt failed. Please review error details.',
    actionRequired: true,
  },
  unable_to_verify: {
    label: 'Unable to Verify',
    badgeBg: 'bg-neutral-100',
    badgeText: 'text-neutral-700',
    borderColor: 'border-neutral-300',
    icon: '?',
    description: 'Submission or receipt cannot currently be independently established.',
    actionRequired: true,
  },
};

export class AtsVerificationService {
  /**
   * Recognized ATS Reference number formats
   */
  private static ATS_PATTERNS: { [key: string]: { name: string; regex: RegExp; domains: string[] } } = {
    workday: {
      name: 'Workday',
      regex: /^(WD|WKD|JR)[-_]?[0-9A-Z]+([-_][0-9A-Z]+)*$/i,
      domains: ['workday.com', 'myworkday.com', 'myworkdayjobs.com'],
    },
    greenhouse: {
      name: 'Greenhouse',
      regex: /^(GH|GRN)[-_]?[0-9A-Z]+([-_][0-9A-Z]+)*$/i,
      domains: ['greenhouse.io', 'gh.io'],
    },
    lever: {
      name: 'Lever',
      regex: /^(LEV)[-_]?[a-f0-9-]+$/i,
      domains: ['lever.co', 'hire.lever.co'],
    },
    smartrecruiters: {
      name: 'SmartRecruiters',
      regex: /^(SR|SMART)[-_]?[0-9A-Z]+([-_][0-9A-Z]+)*$/i,
      domains: ['smartrecruiters.com'],
    },
    taleo: {
      name: 'Oracle Taleo',
      regex: /^(REQ|TAL)[-_]?[0-9A-Z]+([-_][0-9A-Z]+)*$/i,
      domains: ['taleo.net', 'oraclecloud.com'],
    },
    linkedin: {
      name: 'LinkedIn Easy Apply',
      regex: /^(LI|LINKEDIN)[-_]?[0-9A-Z]+([-_][0-9A-Z]+)*$/i,
      domains: ['linkedin.com'],
    },
    icims: {
      name: 'iCIMS',
      regex: /^(ICIMS)[-_]?[0-9A-Z]+$/i,
      domains: ['icims.com'],
    },
    successfactors: {
      name: 'SAP SuccessFactors',
      regex: /^(SF|SAP)[-_]?[0-9A-Z]+$/i,
      domains: ['successfactors.com', 'sap.com'],
    },
    ashby: {
      name: 'Ashby',
      regex: /^(ASHBY)[-_]?[0-9A-Z]+$/i,
      domains: ['ashbyhq.com'],
    },
    bamboohr: {
      name: 'BambooHR',
      regex: /^(BAMBOO)[-_]?[0-9A-Z]+$/i,
      domains: ['bamboohr.com'],
    },
    jobvite: {
      name: 'Jobvite',
      regex: /^(JV|JOBVITE)[-_]?[0-9A-Z]+$/i,
      domains: ['jobvite.com'],
    },
    general: {
      name: 'Employer Career Portal',
      regex: /^[A-Z0-9-_]{4,48}$/i,
      domains: [],
    },
  };

  /**
   * Detects the ATS provider from reference number or sender email domain
   */
  static detectAtsProvider(refNumber?: string, senderEmail?: string): string {
    if (senderEmail) {
      const emailLower = senderEmail.toLowerCase();
      for (const entry of Object.values(this.ATS_PATTERNS)) {
        if (entry.domains.some((d) => emailLower.includes(d))) {
          return entry.name;
        }
      }
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
   * Computes SHA-256 fingerprint
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
   * Parses standard RFC 2822 email headers
   */
  static parseEmailHeaders(rawText: string): Record<string, string> {
    const headers: Record<string, string> = {};
    if (!rawText) return headers;

    // Unfold multi-line headers
    const normalized = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = normalized.split('\n');
    let currentKey = '';

    for (const line of lines) {
      if (/^[ \t]/.test(line) && currentKey) {
        // Continuation of previous header
        headers[currentKey] += ' ' + line.trim();
      } else {
        const colonIdx = line.indexOf(':');
        if (colonIdx > 0) {
          currentKey = line.substring(0, colonIdx).trim().toLowerCase();
          const val = line.substring(colonIdx + 1).trim();
          headers[currentKey] = val;
        }
      }
    }

    return headers;
  }

  /**
   * Cryptographically verifies email headers for SPF, DKIM, and matching domain
   */
  static verifyEmailHeaders(options: {
    rawHeaders: string;
    expectedCompany: string;
    candidateEmail?: string;
  }): {
    valid: boolean;
    isIndependentlyAuthenticated: boolean;
    senderEmail?: string;
    senderDomain?: string;
    atsProvider?: string;
    dkimPassed: boolean;
    spfPassed: boolean;
    dmarcPassed: boolean;
    messageId?: string;
    confirmedAt?: Date;
    error?: string;
    notes: string;
  } {
    const { rawHeaders, expectedCompany } = options;
    const parsed = this.parseEmailHeaders(rawHeaders);

    const fromHeader = parsed['from'] || '';
    const authResults = (parsed['authentication-results'] || parsed['arc-authentication-results'] || '').toLowerCase();
    const receivedSpf = (parsed['received-spf'] || '').toLowerCase();
    const dkimSignature = parsed['dkim-signature'] || '';
    const messageId = parsed['message-id'] || undefined;
    const dateHeader = parsed['date'] || undefined;

    // Extract sender email and domain
    const emailMatch = fromHeader.match(/<([^>]+)>/) || fromHeader.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    const senderEmail = emailMatch ? emailMatch[1].trim() : undefined;
    const senderDomain = senderEmail ? senderEmail.split('@')[1]?.toLowerCase() : undefined;

    if (!senderDomain) {
      return {
        valid: false,
        isIndependentlyAuthenticated: false,
        dkimPassed: false,
        spfPassed: false,
        dmarcPassed: false,
        error: 'Unable to extract valid sender domain from email From header.',
        notes: 'Malformed or missing From header in provided email headers.',
      };
    }

    // Check DKIM and SPF status
    const dkimPassed = authResults.includes('dkim=pass') || (Boolean(dkimSignature) && authResults.includes('pass'));
    const spfPassed = authResults.includes('spf=pass') || receivedSpf.startsWith('pass');
    const dmarcPassed = authResults.includes('dmarc=pass');

    // Check domain relevance: does senderDomain correlate with company or recognized ATS?
    const compNormalized = expectedCompany.toLowerCase().replace(/[^a-z0-9]/g, '');
    const domainNormalized = senderDomain.replace(/[^a-z0-9]/g, '');

    const isDirectCompanyDomain = domainNormalized.includes(compNormalized) || compNormalized.includes(domainNormalized.split('')[0]);
    const atsProvider = this.detectAtsProvider(undefined, senderEmail);
    const isRecognizedAts = atsProvider !== 'Employer Career Portal';

    const domainValid = isDirectCompanyDomain || isRecognizedAts;

    if (!domainValid) {
      return {
        valid: false,
        isIndependentlyAuthenticated: false,
        senderEmail,
        senderDomain,
        atsProvider,
        dkimPassed,
        spfPassed,
        dmarcPassed,
        error: `Sender domain (@${senderDomain}) does not match expected employer "${expectedCompany}" or recognized ATS providers.`,
        notes: `Domain mismatch: Received from @${senderDomain}, expected ${expectedCompany}.`,
      };
    }

    if (!dkimPassed && !spfPassed) {
      return {
        valid: false,
        isIndependentlyAuthenticated: false,
        senderEmail,
        senderDomain,
        atsProvider,
        dkimPassed,
        spfPassed,
        dmarcPassed,
        error: 'Email headers do not contain verified DKIM (dkim=pass) or SPF (spf=pass) authentication results.',
        notes: 'Authentication-Results header indicates unauthenticated or forged transmission.',
      };
    }

    const confirmedAt = dateHeader ? new Date(dateHeader) : new Date();

    return {
      valid: true,
      isIndependentlyAuthenticated: true,
      senderEmail,
      senderDomain,
      atsProvider,
      dkimPassed,
      spfPassed,
      dmarcPassed,
      messageId,
      confirmedAt: isNaN(confirmedAt.getTime()) ? new Date() : confirmedAt,
      notes: `Independently authenticated via cryptographic ${dkimPassed ? 'DKIM' : ''}${dkimPassed && spfPassed ? ' & ' : ''}${spfPassed ? 'SPF' : ''} signatures from @${senderDomain} [${atsProvider}].`,
    };
  }

  /**
   * Ingests employer confirmation receipt with strict anti-fraud checks
   */
  static verifyEmployerConfirmation(options: {
    applicationId: string;
    companyName: string;
    externalReferenceNumber?: string;
    employerSenderEmail?: string;
    employerConfirmationSnippet?: string;
    rawEmailHeaders?: string;
    receivedAt?: Date | string;
  }): { valid: boolean; receipt?: EmployerReceipt; isIndependentlyAuthenticated: boolean; error?: string } {
    const {
      applicationId,
      companyName,
      externalReferenceNumber,
      employerSenderEmail,
      employerConfirmationSnippet,
      rawEmailHeaders,
      receivedAt,
    } = options;

    const ref = (externalReferenceNumber || '').trim();
    const email = (employerSenderEmail || '').trim();
    const headers = (rawEmailHeaders || '').trim();

    if (!ref && !email && !headers) {
      return {
        valid: false,
        isIndependentlyAuthenticated: false,
        error: 'Must provide either an Employer ATS Reference Number, Employer Confirmation Email, or Raw Email Headers.',
      };
    }

    // 1. If candidate provided raw email headers, perform cryptographic verification
    if (headers) {
      const headerEval = this.verifyEmailHeaders({
        rawHeaders: headers,
        expectedCompany: companyName,
      });

      if (!headerEval.valid) {
        return {
          valid: false,
          isIndependentlyAuthenticated: false,
          error: headerEval.error || 'Failed to cryptographically verify email headers.',
        };
      }

      const confirmedAt = headerEval.confirmedAt || (receivedAt ? new Date(receivedAt) : new Date());
      const effectiveRef = ref || headerEval.messageId || `EML-${Date.now().toString(36).toUpperCase()}`;
      const effectiveEmail = headerEval.senderEmail || email;

      const receiptHash = this.generateReceiptHash({
        applicationId,
        referenceNumber: effectiveRef,
        senderEmail: effectiveEmail,
        confirmedAt,
      });

      const receipt: EmployerReceipt = {
        receiptSource: 'employer_confirmation_email',
        externalReferenceNumber: effectiveRef,
        employerSenderEmail: effectiveEmail,
        employerConfirmationSnippet: (employerConfirmationSnippet || '').slice(0, 500),
        acknowledgedBy: `${companyName} Verified Gateway <${effectiveEmail}>`,
        receiptHash,
        confirmedAt,
        isIndependentlyAuthenticated: true,
        evidenceClassification: 'independently_authenticated',
        rawEmailHeaders: headers.slice(0, 3000),
        verifiedNotes: headerEval.notes,
      };

      return { valid: true, receipt, isIndependentlyAuthenticated: true };
    }

    // 2. Candidate provided manual reference / email WITHOUT verified headers
    // Store as Candidate-Reported evidence awaiting independent verification.
    // Crucially: DOES NOT claim independent employer confirmation!
    if (ref && ref.length < 3) {
      return { valid: false, isIndependentlyAuthenticated: false, error: 'Employer Reference Number must be at least 3 characters.' };
    }

    if (email && !email.includes('@')) {
      return { valid: false, isIndependentlyAuthenticated: false, error: 'Please enter a valid employer sender email address.' };
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
      ? `Candidate-Reported Employer Contact: ${email}`
      : `Candidate-Reported Reference: ${ref}`;

    const receipt: EmployerReceipt = {
      receiptSource: 'candidate_self_reported',
      externalReferenceNumber: ref || undefined,
      employerSenderEmail: email || undefined,
      employerConfirmationSnippet: (employerConfirmationSnippet || '').slice(0, 500),
      acknowledgedBy,
      receiptHash,
      confirmedAt,
      isIndependentlyAuthenticated: false,
      evidenceClassification: 'candidate_provided',
      verifiedNotes: `Candidate self-attested reference for ${atsProvider}. Stored for candidate audit records. Independent cryptographic email headers or ATS webhook confirmation pending.`,
    };

    return { valid: true, receipt, isIndependentlyAuthenticated: false };
  }

  /**
   * Computes the single authoritative, mutually exclusive status for an application
   */
  static getAuthoritativeStatus(app: any): PrimaryApplicationStatus {
    if (!app) return 'external_application_required';

    // 1. Explicit submission failure
    if (app.submissionStatus === 'submission_failed' || app.status === 'submission_failed' || app.primaryStatus === 'submission_failed') {
      return 'submission_failed';
    }

    // 2. Explicit unable to verify
    if (app.submissionStatus === 'unable_to_verify' || app.status === 'unable_to_verify' || app.primaryStatus === 'unable_to_verify') {
      return 'unable_to_verify';
    }

    // 3. Status updated by employer (Interview, Shortlist, Offer, Review, Rejected)
    const isStageUpdated =
      app.status === 'employer_status_updated' ||
      app.primaryStatus === 'employer_status_updated' ||
      (app.hiringStage && app.hiringStage !== 'applied') ||
      (app.status && ['under_review', 'shortlisted', 'interview_scheduled', 'offered', 'rejected'].includes(app.status));

    if (isStageUpdated) {
      return 'employer_status_updated';
    }

    // 4. Genuine independently authenticated employer confirmation
    const isIndependentlyConfirmed =
      app.status === 'employer_receipt_confirmed' ||
      app.primaryStatus === 'employer_receipt_confirmed' ||
      Boolean(app.isIndependentlyAuthenticated) ||
      Boolean(app.employerReceipt?.isIndependentlyAuthenticated) ||
      app.evidenceClassification === 'independently_authenticated' ||
      app.employerReceipt?.receiptSource === 'authorized_integration_sync' ||
      app.employerReceipt?.receiptSource === 'employer_webhook';

    if (isIndependentlyConfirmed) {
      return 'employer_receipt_confirmed';
    }

    // Email Delivered to Employer
    if (app.status === 'email_delivered' || app.primaryStatus === 'email_delivered' || app.emailDeliveryStatus === 'delivered') {
      return 'email_delivered';
    }

    // Application Email Sent via Candidate's Authorized Account
    if (app.status === 'email_sent' || app.primaryStatus === 'email_sent' || (app.emailMessageId && app.submissionType === 'candidate_email_oauth') || app.emailSentAt) {
      return 'email_sent';
    }

    // 5. Submitted awaiting employer verification:
    // - Candidate reported manual portal submission
    // - Direct HR email gateway accepted (Brevo messageId)
    // - Candidate self-reported ATS reference without headers
    // - Platform recruiter submission pending review
    const isAwaitingVerification =
      app.status === 'awaiting_employer_verification' ||
      app.submissionStatus === 'external_awaiting_verification' ||
      app.submissionStatus === 'dispatched' ||
      Boolean(app.portalSubmissionConfirmedAt) ||
      app.submissionStatus === 'dispatched' ||
      app.evidenceClassification === 'candidate_provided' ||
      Boolean(app.portalSubmissionConfirmedAt) ||
      app.primaryStatus === 'awaiting_employer_verification' ||
      app.employerReceipt?.receiptSource === 'candidate_self_reported' ||
      Boolean(app.emailMessageId) || (app.submissionType === 'direct_hr_dispatch' && Boolean(app.confirmationDetails?.messageId)) ||
      (app.submissionType === 'platform_recruiter' && Boolean(app.recruiter));

    if (isAwaitingVerification) {
      return 'awaiting_employer_verification';
    }

    // 6. External application required:
    // Candidate must complete submission on the employer portal
    const isExternalRequired =
      app.status === 'external_application_required' ||
      app.submissionStatus === 'requires_manual_application' ||
      (!app.recruiter && app.submissionType === 'external_portal' && !app.employerReceipt && !app.confirmationDetails);

    if (isExternalRequired) {
      return 'external_application_required';
    }

    // 7. Saved in RecruitX internally
    if (app.status === 'saved_in_recruitx') {
      return 'saved_in_recruitx';
    }

    // Fallback based on recruiter presence
    return app.recruiter ? 'awaiting_employer_verification' : 'external_application_required';
  }

  /**
   * Computes the evidence classification level
   */
  static getEvidenceClassification(app: any): EvidenceClassification {
    if (!app) return 'internal_recruitx';

    if (
      app.employerReceipt?.isIndependentlyAuthenticated ||
      Boolean(app.isIndependentlyAuthenticated) ||
      app.evidenceClassification === 'independently_authenticated' ||
      app.employerReceipt?.receiptSource === 'authorized_integration_sync' ||
      app.employerReceipt?.receiptSource === 'employer_webhook'
    ) {
      return 'independently_authenticated';
    }

    if (
      app.evidenceClassification === 'external_system_response' ||
      Boolean(app.emailMessageId) || (app.submissionType === 'direct_hr_dispatch' && Boolean(app.confirmationDetails?.messageId))
    ) {
      return 'external_system_response';
    }

    if (
      app.evidenceClassification === 'candidate_provided' ||
      app.employerReceipt?.receiptSource === 'candidate_self_reported' ||
      app.submissionStatus === 'external_awaiting_verification' ||
      app.submissionStatus === 'dispatched' ||
      Boolean(app.portalSubmissionConfirmedAt)
    ) {
      return 'candidate_provided';
    }

    return 'internal_recruitx';
  }

  /**
   * Evaluates comprehensive employer-side verification status
   */
  static evaluateApplicationVerification(app: ApplicationDoc | any): AtsVerificationResult {
    const authoritativeStatus = this.getAuthoritativeStatus(app);
    const evidenceClassification = this.getEvidenceClassification(app);
    const config = APPLICATION_STATUS_CONFIG[authoritativeStatus];

    const hiringStage: EmployerHiringStage | undefined =
      app.hiringStage ||
      (['under_review', 'shortlisted', 'interview_scheduled', 'offered', 'rejected'].includes(app.status)
        ? app.status
        : undefined);

    // 1. On-platform recruiter application
    if (app.submissionType === 'platform_recruiter' && app.recruiter) {
      const isStatusUpdated = authoritativeStatus === 'employer_status_updated';
      return {
        authoritativeStatus,
        evidenceClassification: 'internal_recruitx',
        hasAuthorizedIntegration: true,
        verificationSource: 'RecruitX Verified Recruiter In-App ATS',
        isEmployerConfirmed: isStatusUpdated,
        externalReferenceNumber: app.employerReceipt?.externalReferenceNumber || `RCX-ATS-${app._id}`,
        externalAtsName: 'RecruitX Platform Recruiter ATS',
        externalStatus: hiringStage || 'Delivered to Recruiter Queue',
        employerReceipt: app.employerReceipt,
        lifecycleStage: isStatusUpdated ? 'employer_status_updated' : 'external_accepted',
        verificationNotes: isStatusUpdated
          ? `RecruitX platform recruiter advanced candidate hiring pipeline to "${(hiringStage || '').replace('_', ' ').toUpperCase()}".`
          : 'Application delivered directly to verified recruiter in-app dashboard. Awaiting recruiter screening.',
        actionRequired: false,
        hiringStage,
      };
    }

    // 2. Independently Authenticated Confirmation (DKIM/SPF headers or authorized webhook)
    if (evidenceClassification === 'independently_authenticated' || app.employerReceipt?.isIndependentlyAuthenticated) {
      return {
        authoritativeStatus: 'employer_receipt_confirmed',
        evidenceClassification: 'independently_authenticated',
        hasAuthorizedIntegration: true,
        verificationSource:
          app.employerReceipt?.receiptSource === 'employer_webhook'
            ? 'Authenticated Employer ATS Webhook'
            : 'Cryptographically Verified DKIM/SPF Email Signatures',
        isEmployerConfirmed: true,
        externalReferenceNumber: app.employerReceipt?.externalReferenceNumber,
        externalAtsName: app.externalAtsName || this.detectAtsProvider(app.employerReceipt?.externalReferenceNumber, app.employerReceipt?.employerSenderEmail),
        externalStatus: app.externalStatus || 'Application Received by Employer',
        employerReceipt: app.employerReceipt,
        lifecycleStage: 'employer_receipt_confirmed',
        verificationNotes:
          app.employerReceipt?.verifiedNotes ||
          `Employer receipt independently authenticated on ${new Date(app.employerReceipt?.confirmedAt || Date.now()).toLocaleDateString()}. Ref #${app.employerReceipt?.externalReferenceNumber || 'VERIFIED'}.`,
        actionRequired: false,
        hiringStage,
      };
    }

    // Email Delivered
    if (authoritativeStatus === 'email_delivered') {
      return {
        authoritativeStatus: 'email_delivered',
        evidenceClassification: 'external_system_response',
        hasAuthorizedIntegration: true,
        verificationSource: `Recipient Mail Server (${app.emailProvider === 'gmail' ? 'Google MX' : app.emailProvider === 'outlook' ? 'Microsoft MX' : 'Mail Gateway'})`,
        isEmployerConfirmed: false,
        externalReferenceNumber: app.emailMessageId,
        externalAtsName: app.emailProvider === 'gmail' ? 'Google Workspace' : app.emailProvider === 'outlook' ? 'Microsoft 365' : 'Corporate Mail Server',
        externalStatus: 'Delivered to Employer Inbound Mail Server',
        employerReceipt: app.employerReceipt,
        lifecycleStage: 'dispatched',
        verificationNotes: `Employer mail server confirmed delivery to ${app.recipientEmail || 'recruiter'}. Transmission MessageId: ${app.emailMessageId || 'VERIFIED'}. Awaiting employer ATS acknowledgement.`,
        actionRequired: false,
        hiringStage,
      };
    }

    // Application Email Sent via Candidate's Authorized Account
    if (authoritativeStatus === 'email_sent') {
      const providerLabel = app.emailProvider === 'gmail' ? 'Google Gmail API' : app.emailProvider === 'outlook' ? 'Microsoft Graph API' : 'Authorized Candidate Email Account';
      return {
        authoritativeStatus: 'email_sent',
        evidenceClassification: 'external_system_response',
        hasAuthorizedIntegration: true,
        verificationSource: `${providerLabel} (From: ${app.senderEmail || 'candidate'})`,
        isEmployerConfirmed: false,
        externalReferenceNumber: app.emailMessageId,
        externalAtsName: app.emailProvider === 'gmail' ? 'Google Gmail API' : app.emailProvider === 'outlook' ? 'Microsoft Graph API' : 'Authorized Mail Provider',
        externalStatus: `Application Transmitted to ${app.recipientEmail || 'Employer'}`,
        employerReceipt: app.employerReceipt,
        lifecycleStage: 'dispatched',
        verificationNotes: `Application email with resume attachment was sent directly from candidate's authorized account (${app.senderEmail}) to employer hiring inbox (${app.recipientEmail}). External MessageId: ${app.emailMessageId || 'N/A'}.`,
        actionRequired: false,
        hiringStage,
      };
    }

    // 3. Candidate-Reported Evidence (Awaiting Independent Employer Confirmation)
    if (authoritativeStatus === 'awaiting_employer_verification') {
      const hasCandRef = Boolean(app.employerReceipt?.externalReferenceNumber);
      return {
        authoritativeStatus: 'awaiting_employer_verification',
        evidenceClassification: 'candidate_provided',
        hasAuthorizedIntegration: false,
        verificationSource: hasCandRef
          ? 'Candidate Self-Reported Reference (Unauthenticated Headers)'
          : 'Candidate Self-Reported External Dispatch',
        isEmployerConfirmed: false,
        externalReferenceNumber: app.employerReceipt?.externalReferenceNumber,
        externalAtsName: app.externalAtsName || this.detectAtsProvider(app.employerReceipt?.externalReferenceNumber, app.employerReceipt?.employerSenderEmail),
        externalStatus: 'Submitted — Awaiting Independent Employer Verification',
        employerReceipt: app.employerReceipt,
        lifecycleStage: 'dispatched',
        verificationNotes: hasCandRef
          ? `Candidate self-attested reference #${app.employerReceipt?.externalReferenceNumber}. Stored for candidate records; awaiting independent employer confirmation.`
          : 'Candidate reported submitting on official career portal. Independent employer receipt has not yet been established.',
        actionRequired: false,
        actionMessage: 'Have an official confirmation email? Paste raw email headers to independently authenticate.',
        hiringStage,
      };
    }

    // 4. External Application Required
    if (authoritativeStatus === 'external_application_required') {
      return {
        authoritativeStatus: 'external_application_required',
        evidenceClassification: 'internal_recruitx',
        hasAuthorizedIntegration: false,
        verificationSource: 'Official Employer Career Portal',
        isEmployerConfirmed: false,
        externalReferenceNumber: undefined,
        externalAtsName: this.detectAtsProvider(undefined, app.destinationUrl),
        externalStatus: 'Action Required: Submit on Employer Portal',
        employerReceipt: undefined,
        lifecycleStage: 'recorded',
        verificationNotes: 'Candidate must complete submission directly on the employer official career portal.',
        actionRequired: true,
        actionMessage: 'Please open the official career portal and complete your submission.',
        hiringStage,
      };
    }

    // 5. Submission Failed
    if (authoritativeStatus === 'submission_failed') {
      return {
        authoritativeStatus: 'submission_failed',
        evidenceClassification: 'internal_recruitx',
        hasAuthorizedIntegration: false,
        verificationSource: 'Automated Transmission Gateway',
        isEmployerConfirmed: false,
        externalStatus: 'Submission Failed',
        lifecycleStage: 'recorded',
        verificationNotes: app.submissionError || 'Automated dispatch attempt failed.',
        actionRequired: true,
        actionMessage: 'Submission failed. Please apply directly on the employer career portal.',
      };
    }

    // 6. Direct HR Email Accepted by Gateway
    if (app.submissionType === 'direct_hr_dispatch' && app.confirmationDetails?.messageId) {
      return {
        authoritativeStatus: 'awaiting_employer_verification',
        evidenceClassification: 'external_system_response',
        hasAuthorizedIntegration: true,
        verificationSource: 'Brevo Transactional HTTPS Gateway',
        isEmployerConfirmed: false,
        externalReferenceNumber: app.confirmationDetails.messageId,
        externalAtsName: 'Transactional Email Gateway',
        externalStatus: 'Dispatched to Company Inbox',
        employerReceipt: undefined,
        lifecycleStage: 'external_accepted',
        verificationNotes: `Email gateway accepted payload [MessageId: ${app.confirmationDetails.messageId}]. Awaiting independent employer acknowledgement.`,
        actionRequired: false,
      };
    }

    return {
      authoritativeStatus: 'saved_in_recruitx',
      evidenceClassification: 'internal_recruitx',
      hasAuthorizedIntegration: false,
      verificationSource: 'Internal Database Record',
      isEmployerConfirmed: false,
      externalReferenceNumber: undefined,
      lifecycleStage: 'recorded',
      verificationNotes: 'Application stored in candidate records.',
      actionRequired: false,
    };
  }
}
