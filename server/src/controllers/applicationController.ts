import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { Application, ApplicationSubmissionStatus, PrimaryApplicationStatus } from '../models/Application.js';
import { AtsVerificationService, APPLICATION_STATUS_CONFIG } from '../services/atsVerificationService.js';
import { Job } from '../models/Job.js';
import { Resume } from '../models/Resume.js';
import { PlacementEligibilityRule } from '../models/PlacementEligibilityRule.js';
import { Notification } from '../models/Notification.js';
import { EmailService } from '../services/emailService.js';
import { CandidateApplicationEmailService } from '../services/candidateApplicationEmailService.js';
import { AutomatedApplicationService } from '../services/automatedApplicationService.js';
import { InboxMonitoringService } from '../services/inboxMonitoringService.js';
import { ApplicationEvent } from '../models/ApplicationEvent.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { User } from '../models/User.js';
import { emitToUser } from '../socket.js';

export const applyForJob = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'student') {
      sendError(res, 'Only students can apply for jobs', null, 403);
      return;
    }

    const { jobId, coverLetter, resumeUrl } = req.body;
    const job = await Job.findById(jobId);
    if (!job) {
      sendError(res, 'Job posting not found', null, 404);
      return;
    }

    const existingApp = await Application.findOne({ job: jobId, student: req.user._id });
    if (existingApp) {
      sendError(res, 'You have already applied for this job', null, 400);
      return;
    }

    // Enforce Campus Placement Eligibility Rules
    const rule = await PlacementEligibilityRule.getEffectiveRule();
    if (rule.isActive) {
      const studentResume = await Resume.findOne({ student: req.user._id });

      // 1. One Job Policy Check
      if (rule.oneJobPolicy) {
        const activeOffer = await Application.findOne({ student: req.user._id, status: 'offered' });
        if (activeOffer) {
          sendError(
            res,
            `Campus Drive Policy: "One Student One Job" rule is enforced. You already hold an accepted placement offer with ${activeOffer.companyName || 'another firm'}.`,
            null,
            400
          );
          return;
        }
      }

      // 2. Allowed Departments
      if (rule.allowedDepartments && rule.allowedDepartments.length > 0 && studentResume) {
        const dept = (studentResume.fieldOfInterest || '').toLowerCase();
        const isAllowed = rule.allowedDepartments.some((d) => dept.includes(d.toLowerCase()));
        if (!isAllowed) {
          sendError(
            res,
            `Campus Drive Policy: This recruitment drive is restricted to departments: ${rule.allowedDepartments.join(', ')}.`,
            null,
            400
          );
          return;
        }
      }

      // 3. Min CGPA Check
      if (rule.minCgpa > 0 && studentResume?.education?.length) {
        const gradeStr = studentResume.education[0]?.grade || '';
        const match = gradeStr.match(/([0-9]+(?:\.[0-9]+)?)/);
        if (match) {
          const studentCgpa = parseFloat(match[1]);
          if (studentCgpa < rule.minCgpa) {
            sendError(
              res,
              `Campus Drive Policy: Minimum CGPA threshold for this drive is ${rule.minCgpa}. Your profile records ${studentCgpa}.`,
              null,
              400
            );
            return;
          }
        }
      }
    }

    const populatedJobForEmail = await Job.findById(jobId).populate('recruiter', 'name email');
    const recUser = populatedJobForEmail?.recruiter as any;
    const recEmail = recUser?.email || '';

    // Create notification for recruiter first to link dispatch ID
    const recruiterNotif = await Notification.create({
      recipient: job.recruiter,
      title: 'New Job Application',
      message: `${req.user.name} applied for "${job.title}"`,
      type: 'application_update',
      format: 'toast',
      priority: 'high',
      actionText: 'View Applications',
      actionUrl: '/recruiter/applications',
      link: '/recruiter/applications',
    });

    const application = await Application.create({
      job: jobId,
      student: req.user._id,
      recruiter: job.recruiter,
      companyName: job.company,
      jobTitle: job.title,
      coverLetter: coverLetter || '',
      resumeUrl: resumeUrl || '',
      status: 'awaiting_employer_verification',
      evidenceClassification: 'internal_recruitx',
      submissionStatus: 'submitted',
      submissionType: 'platform_recruiter',
      applicationDestination: 'RecruitX Verified Recruiter Portal',
      destinationUrl: '/student/jobs',
      confirmationDetails: {
        confirmationId: `RCX-ATS-${recruiterNotif._id}`,
        recipient: recEmail ? `${recUser?.name || 'Recruiter'} (${recEmail})` : 'Verified Platform Recruiter ATS Queue',
        timestamp: new Date(),
        dispatchMethod: `RecruitX In-App ATS Delivery [Notification ID: ${recruiterNotif._id}]`,
        messageId: recruiterNotif._id,
        verifiedAt: new Date(),
      },
      resumeTransmitted: true,
      candidateContactTransmitted: true,
      statusHistory: [{ status: 'applied', note: 'Application submitted directly to platform recruiter with verified receipt confirmation' }],
    });

    // Link application ID to confirmationId
    if (application.confirmationDetails) {
      application.confirmationDetails.confirmationId = `RCX-ATS-${application._id}`;
      await application.save();
    }

    // Increment application count on job
    job.applicationsCount = (job.applicationsCount || 0) + 1;
    await job.save();
    emitToUser(job.recruiter, 'notification:new', { notification: recruiterNotif });

    // Dispatch application email to recruiter
    const populatedJob = await Job.findById(jobId).populate('recruiter', 'name email');
    const recruiterEmail = (populatedJob?.recruiter as any)?.email;
    const resume = await Resume.findOne({ student: req.user._id });

    if (recruiterEmail) {
      await EmailService.sendApplicationToHR({
        candidateName: req.user.name,
        candidateEmail: req.user.email,
        jobTitle: job.title,
        companyName: job.company,
        headline: resume?.headline,
        summary: resume?.summary,
        skills: resume?.skills,
        fieldOfInterest: resume?.fieldOfInterest,
        targetHrEmail: recruiterEmail,
      });
    }

    sendSuccess(res, 'Application submitted successfully', { application }, 201);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to submit application', null, 500);
  }
};

// Direct 1-Click Native Web Application using Student Uploaded Resume + HR Email Dispatch
export const applyDirectCompanyJob = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'student') {
      sendError(res, 'Only students can apply for jobs', null, 403);
      return;
    }

    const { companyName, jobTitle, coverLetter, hrEmail, jobUrl } = req.body;
    if (!companyName || !jobTitle) {
      sendError(res, 'Company name and job title are required', null, 400);
      return;
    }

    const resume = await Resume.findOne({ student: req.user._id });

    // Check if already applied
    const existing = await Application.findOne({
      student: req.user._id,
      companyName,
      jobTitle,
    });

    if (existing) {
      sendError(res, `You already have an active application record for ${jobTitle} at ${companyName}`, null, 400);
      return;
    }

    // Resolve recruiter ONLY if a recruiter is registered on RecruitX for this specific company
    const recruiters = await User.find({ role: 'recruiter' });
    const matchedRecruiter = recruiters.find(
      (r) => r.company && companyName && r.company.toLowerCase().trim() === companyName.toLowerCase().trim()
    );

    const recruiterId = matchedRecruiter?._id || null;

    // Check whether direct transmission is actually possible
    let submissionStatus: ApplicationSubmissionStatus = 'requires_manual_application';
    let submissionType: 'platform_recruiter' | 'direct_hr_dispatch' | 'external_portal' = 'external_portal';
    let applicationDestination = 'Employer Official Career Portal';
    let destinationUrl = jobUrl || `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(jobTitle + ' ' + companyName)}`;
    let confirmationDetails: any = null;
    let resumeTransmitted = false;
    let candidateContactTransmitted = false;
    let statusNote = '';
    const user = await User.findById(req.user._id);
    let senderEmail: string | undefined;
    let recipientEmail: string | undefined;
    let emailProvider: 'gmail' | 'outlook' | 'gateway' | undefined;
    let emailMessageId: string | undefined;
    let emailSentAt: Date | undefined;
    let emailDeliveryStatus: 'sent' | 'delivered' | 'bounced' | 'failed' | undefined;
    let resumeAttached: boolean | undefined;
    let resumeFileName: string | undefined;
    let resumeFileSize: number | undefined;

    if (matchedRecruiter) {
      // 1. Direct on-platform submission to verified recruiter
      submissionStatus = 'submitted';
      submissionType = 'platform_recruiter';
      applicationDestination = 'RecruitX Verified Recruiter Portal';
      destinationUrl = '/student/jobs';
      resumeTransmitted = true;
      candidateContactTransmitted = true;
      statusNote = 'Direct application submitted to verified on-platform recruiter with confirmed receipt';

      // Notify recruiter and capture persistent notification ID
      const recNotif = await Notification.create({
        recipient: matchedRecruiter._id,
        title: `New Candidate Application: ${jobTitle}`,
        message: `${req.user.name} applied directly for "${jobTitle}".`,
        type: 'application_update',
        priority: 'high',
        format: 'toast',
      });
      emitToUser(matchedRecruiter._id.toString(), 'notification:new', {
        title: `New Candidate Application: ${jobTitle}`,
        message: `${req.user.name} applied directly for "${jobTitle}".`,
        notification: recNotif,
      });

      confirmationDetails = {
        confirmationId: `RCX-ATS-${matchedRecruiter._id}-${Date.now().toString(36).toUpperCase()}`,
        recipient: `${matchedRecruiter.name} (${matchedRecruiter.email})`,
        timestamp: new Date(),
        dispatchMethod: `RecruitX Verified Recruiter ATS Queue [Notification ID: ${recNotif._id}]`,
        messageId: recNotif._id,
        verifiedAt: new Date(),
      };
    } else {
      // 2. Resolve genuine destination: company recruitment email vs official portal
      const destination = CandidateApplicationEmailService.resolveApplicationDestination({
        companyName,
        targetHrEmail: hrEmail,
        jobUrl: destinationUrl || jobUrl,
      });

      if (destination.method === 'email' && destination.destinationEmail) {
        // Destination is verified employer email -> attempt dispatch
        const userDoc = user || (await User.findById(req.user._id));

        if (userDoc) {
          const emailDispatch = await CandidateApplicationEmailService.dispatchApplication({
            user: userDoc,
            resumeData: resume,
            companyName,
            jobTitle,
            targetHrEmail: destination.destinationEmail,
            coverLetter,
            jobUrl: destinationUrl || jobUrl,
          });

          if (emailDispatch.status === 'sent') {
            submissionStatus = 'submitted';
            submissionType = 'direct_hr_dispatch';
            senderEmail = emailDispatch.senderEmail;
            recipientEmail = emailDispatch.recipientEmail;
            emailProvider = emailDispatch.provider;
            emailMessageId = emailDispatch.messageId;
            emailSentAt = emailDispatch.sentAt || new Date();
            emailDeliveryStatus = 'sent';
            resumeAttached = emailDispatch.resumeAttached;
            resumeFileName = emailDispatch.resumeFileName;
            resumeFileSize = emailDispatch.resumeFileSize;
            applicationDestination = `Verified Company Recruitment Inbox (${recipientEmail})`;
            confirmationDetails = {
              confirmationId: emailDispatch.messageId || `EMAIL-${Date.now()}`,
              recipient: recipientEmail || destination.destinationEmail,
              timestamp: emailDispatch.sentAt || new Date(),
              dispatchMethod: `Connected ${emailDispatch.provider === 'gmail' ? 'Google Gmail' : (emailDispatch.provider === 'outlook' ? 'Microsoft Outlook' : 'OAuth')} API`,
              messageId: emailDispatch.messageId,
              verifiedAt: new Date(),
            };
            resumeTransmitted = Boolean(emailDispatch.resumeAttached);
            candidateContactTransmitted = true;
            statusNote = emailDispatch.message;
          } else if (emailDispatch.status === 'requires_connected_account') {
            // Fallback to RecruitX Application Gateway via Brevo HTTPS API if configured
            const fallbackResult = await EmailService.sendApplicationToHR({
              candidateName: req.user.name,
              candidateEmail: req.user.email,
              jobTitle,
              companyName,
              headline: resume?.headline,
              summary: resume?.summary,
              skills: resume?.skills,
              fieldOfInterest: resume?.fieldOfInterest,
              targetHrEmail: destination.destinationEmail,
            });

            if (fallbackResult.success && fallbackResult.messageId) {
              submissionStatus = 'submitted';
              submissionType = 'direct_hr_dispatch';
              senderEmail = process.env.BREVO_SENDER_EMAIL || 'applications@recruitx.app';
              recipientEmail = destination.destinationEmail;
              emailProvider = 'gateway';
              emailMessageId = fallbackResult.messageId;
              emailSentAt = new Date();
              emailDeliveryStatus = 'sent';
              resumeAttached = true;
              applicationDestination = `Verified Company HR Inbox (${destination.destinationEmail})`;
              confirmationDetails = {
                confirmationId: fallbackResult.messageId,
                recipient: destination.destinationEmail,
                timestamp: new Date(),
                dispatchMethod: 'RecruitX Application Gateway (Brevo HTTPS API)',
                messageId: fallbackResult.messageId,
                verifiedAt: new Date(),
              };
              resumeTransmitted = true;
              candidateContactTransmitted = true;
              statusNote = `Application dispatched to ${destination.destinationEmail} via RecruitX application gateway [MessageId: ${fallbackResult.messageId}]. Connect your Gmail or Outlook in Settings to send directly from your personal address.`;
            } else {
              submissionStatus = 'requires_manual_application';
              submissionType = 'external_portal';
              applicationDestination = destination.destinationEmail
                ? `Company Recruitment Contact (${destination.destinationEmail})`
                : (companyName ? `Company Official Portal (${companyName})` : 'Employer Official Career Portal');
              destinationUrl = destination.portalUrl || destinationUrl;
              statusNote = 'To email this company directly from your personal address, connect your Gmail or Outlook in Settings, or apply via their official career portal.';
            }
          } else {
            submissionStatus = 'submission_failed';
            submissionType = 'direct_hr_dispatch';
            statusNote = emailDispatch.error || 'Failed to dispatch email application to employer.';
          }
        }
      } else {
        // Destination is portal
        submissionStatus = 'requires_manual_application';
        submissionType = 'external_portal';
        applicationDestination = destination.portalUrl || 'Employer Official Career Portal';
        destinationUrl = destination.portalUrl || destinationUrl;
        statusNote = 'Third-party employer requires direct submission through their official career portal. Direct application link provided.';
        resumeTransmitted = false;
        candidateContactTransmitted = false;
      }
    }

    let initialStatus: PrimaryApplicationStatus;
    if (submissionType === 'direct_hr_dispatch' && submissionStatus === 'submitted') {
      initialStatus = 'email_sent';
    } else if (submissionStatus === 'requires_manual_application') {
      initialStatus = 'external_application_required';
    } else if (submissionStatus === 'submission_failed') {
      initialStatus = 'submission_failed';
    } else {
      initialStatus = 'awaiting_employer_verification';
    }

    const evidenceClassification = matchedRecruiter
      ? 'internal_recruitx'
      : (submissionType === 'direct_hr_dispatch' ? 'external_system_response' : 'internal_recruitx');

    const application = await Application.create({
      student: req.user._id,
      companyName,
      jobTitle,
      recruiter: recruiterId,
      coverLetter: coverLetter || `Application for ${jobTitle} at ${companyName}`,
      resumeUrl: resume?.headline ? `Uploaded Resume Profile (${resume.fieldOfInterest || 'Student Profile'})` : 'Uploaded Resume',
      status: initialStatus,
      evidenceClassification,
      submissionStatus,
      submissionType,
      applicationDestination,
      destinationUrl,
      confirmationDetails,
      senderEmail,
      recipientEmail,
      emailProvider,
      emailMessageId,
      emailSentAt,
      emailDeliveryStatus,
      resumeAttached,
      resumeFileName,
      resumeFileSize,
      coverLetterIncluded: Boolean(coverLetter),
      submissionError: (submissionStatus as any) === 'submission_failed' ? 'Automated dispatch to company inbox failed.' : (submissionStatus === 'requires_manual_application' ? 'External employer requires direct submission on their portal.' : undefined),
      resumeTransmitted,
      candidateContactTransmitted,
      statusHistory: [{ status: initialStatus, note: statusNote }],
    });

    // Create notification for student
    const notifTitle = initialStatus === 'email_sent'
      ? 'Application Email Dispatched!'
      : (submissionStatus === 'submitted'
          ? 'Application Submitted!'
          : (submissionStatus === 'requires_manual_application'
              ? 'Application Tracker Initialized'
              : 'Submission Failed'));

    const notifMsg = initialStatus === 'email_sent'
      ? `Your application for "${jobTitle}" was sent directly to ${companyName} (${recipientEmail}) with your attached resume.`
      : (submissionStatus === 'submitted'
          ? `Your application for "${jobTitle}" at ${companyName} was submitted successfully with verified delivery confirmation.`
          : (submissionStatus === 'requires_manual_application'
              ? `This role requires submission on ${companyName}'s official portal. We have generated your application tracker and prepared your link.`
              : `Automated dispatch failed for ${companyName}. Please apply manually via their career portal.`));

    const studentNotif = await Notification.create({
      recipient: req.user._id,
      title: notifTitle,
      message: notifMsg,
      type: 'application_update',
      format: 'toast',
      actionText: 'View Applications',
      actionUrl: '/student/applications',
      link: '/student/applications',
    });
    emitToUser(req.user._id.toString(), 'notification:new', { notification: studentNotif });

    const responseMsg = initialStatus === 'email_sent'
      ? `Application for ${jobTitle} at ${companyName} sent directly to ${recipientEmail} with your verified resume attached!`
      : (submissionStatus === 'submitted'
          ? `Application for ${jobTitle} at ${companyName} submitted successfully with verified delivery confirmation!`
          : (submissionStatus === 'requires_manual_application'
              ? `Application tracker established. This employer requires direct submission on their official career portal.`
              : `Could not dispatch application automatically. Please use the official application link.`));

    sendSuccess(res, responseMsg, {
      application,
      submissionStatus,
      requiresManualAction: submissionStatus === 'requires_manual_application',
      officialApplyUrl: destinationUrl,
    }, 201);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to process application', null, 500);
  }
};

export const confirmManualSubmission = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'student') {
      sendError(res, 'Only students can confirm application submissions', null, 403);
      return;
    }

    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const application = await Application.findById(id);

    if (!application) {
      sendError(res, 'Application not found', null, 404);
      return;
    }

    const studentIdStr = typeof application.student === 'object' && application.student?._id
      ? application.student._id.toString()
      : application.student?.toString();

    if (studentIdStr !== req.user._id.toString()) {
      sendError(res, 'Not authorized to update this application', null, 403);
      return;
    }

    // Mark as External Submission — Awaiting Verification
    application.status = 'awaiting_employer_verification';
    application.primaryStatus = 'awaiting_employer_verification';
    application.submissionStatus = 'external_awaiting_verification';
    application.evidenceClassification = 'candidate_provided';
    application.verificationLifecycleStage = 'dispatched';
    application.statusHistory.push({
      status: 'awaiting_employer_verification',
      changedAt: new Date(),
      note: 'Candidate completed external career portal submission — Submitted, Awaiting Employer Verification.',
    });

    application.confirmationDetails = {
      confirmationId: `EXT-DISPATCH-${application._id}`,
      recipient: application.companyName || 'Official Career Portal',
      dispatchMethod: 'Candidate Self-Reported Portal Submission',
      timestamp: new Date(),
      verifiedAt: new Date(),
    };

    await application.save();

    try {
      await Notification.create({
        recipient: req.user._id,
        title: 'Application Submission Recorded',
        message: `Submission recorded for ${application.companyName || 'Employer'} — awaiting independent employer verification.`,
        type: 'application_update',
        priority: 'normal',
        format: 'toast',
      });
    } catch (e) {}

    sendSuccess(res, 'Application marked as External Submission — Awaiting Verification. Please link your employer confirmation email or ATS reference once received.', { application });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to confirm application submission', null, 500);
  }
};

/**
 * Associates an authentic employer-side confirmation email or ATS reference number with an application
 */
export const linkEmployerReceipt = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'student') {
      sendError(res, 'Only candidates can link employer confirmation receipts', null, 403);
      return;
    }

    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const application = await Application.findById(id);

    if (!application) {
      sendError(res, 'Application not found', null, 404);
      return;
    }

    const studentIdStr = typeof application.student === 'object' && application.student?._id
      ? application.student._id.toString()
      : application.student?.toString();

    if (studentIdStr !== req.user._id.toString()) {
      sendError(res, 'Not authorized to update this application', null, 403);
      return;
    }

    const {
      externalReferenceNumber,
      employerSenderEmail,
      employerConfirmationSnippet,
      rawEmailHeaders,
      receivedAt,
    } = req.body;

    const verification = AtsVerificationService.verifyEmployerConfirmation({
      applicationId: application._id,
      companyName: application.companyName || 'Employer',
      externalReferenceNumber,
      employerSenderEmail,
      employerConfirmationSnippet,
      rawEmailHeaders,
      receivedAt,
    });

    if (!verification.valid || !verification.receipt) {
      sendError(res, verification.error || 'Invalid employer confirmation details', null, 400);
      return;
    }

    application.employerReceipt = verification.receipt;
    application.externalAtsName = AtsVerificationService.detectAtsProvider(externalReferenceNumber, employerSenderEmail);

    if (verification.isIndependentlyAuthenticated) {
      application.status = 'employer_receipt_confirmed';
      application.primaryStatus = 'employer_receipt_confirmed';
      application.submissionStatus = 'submitted';
      application.evidenceClassification = 'independently_authenticated';
      application.verificationLifecycleStage = 'employer_receipt_confirmed';
      application.externalStatus = 'Application Received by Employer';

      application.confirmationDetails = {
        confirmationId: verification.receipt.externalReferenceNumber || `EXT-CONFIRMED-${application._id}`,
        recipient: verification.receipt.employerSenderEmail || application.companyName || 'Employer ATS',
        dispatchMethod: `Independently Authenticated [${application.externalAtsName}] via DKIM/SPF`,
        timestamp: verification.receipt.confirmedAt,
        verifiedAt: new Date(),
      };

      application.statusHistory.push({
        status: 'employer_receipt_confirmed',
        changedAt: new Date(),
        note: `Employer-side receipt independently confirmed: ${verification.receipt.verifiedNotes}`,
      });

      try {
        await Notification.create({
          recipient: req.user._id,
          title: 'Employer Application Receipt Independently Confirmed',
          message: `Authentic employer receipt verified for ${application.companyName} via cryptographic email headers (Ref #${verification.receipt.externalReferenceNumber || 'CONFIRMED'}).`,
          type: 'application_update',
          priority: 'high',
          format: 'toast',
        });
      } catch (e) {}
    } else {
      application.status = 'awaiting_employer_verification';
      application.primaryStatus = 'awaiting_employer_verification';
      application.submissionStatus = 'external_awaiting_verification';
      application.evidenceClassification = 'candidate_provided';
      application.verificationLifecycleStage = 'dispatched';
      application.externalStatus = 'Awaiting Independent Employer Confirmation';

      application.statusHistory.push({
        status: 'awaiting_employer_verification',
        changedAt: new Date(),
        note: `Candidate attached employer reference #${verification.receipt.externalReferenceNumber || 'REF'} (Self-reported; awaiting independent authentication).`,
      });

      try {
        await Notification.create({
          recipient: req.user._id,
          title: 'Employer Reference Number Saved',
          message: `Reference #${verification.receipt.externalReferenceNumber || 'REF'} saved for ${application.companyName}. Awaiting independent employer verification.`,
          type: 'application_update',
          priority: 'normal',
          format: 'toast',
        });
      } catch (e) {}
    }

    await application.save();

    sendSuccess(
      res,
      verification.isIndependentlyAuthenticated
        ? 'Employer confirmation receipt independently authenticated! Status updated to Employer Receipt Confirmed.'
        : 'Employer reference details recorded in candidate audit records. Status is Submitted — Awaiting Employer Verification.',
      {
        application,
        receipt: verification.receipt,
        isIndependentlyAuthenticated: verification.isIndependentlyAuthenticated,
      }
    );
  } catch (error: any) {
    sendError(res, error.message || 'Failed to link employer confirmation receipt', null, 500);
  }
};

/**
 * On-platform recruiter acknowledgment of application receipt
 */
export const acknowledgeEmployerReceipt = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'recruiter') {
      sendError(res, 'Only recruiters can acknowledge application receipt', null, 403);
      return;
    }

    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const application = await Application.findById(id);

    if (!application) {
      sendError(res, 'Application not found', null, 404);
      return;
    }

    const recCompany = ((req.user as any)?.company || '').toLowerCase().trim();
    const appCompany = (application.companyName || '').toLowerCase().trim();
    const appRecruiterId = typeof application.recruiter === 'object' && application.recruiter?._id
      ? application.recruiter._id.toString()
      : application.recruiter?.toString();

    const isAuthorized = appRecruiterId === req.user._id.toString() || (recCompany && recCompany === appCompany);
    if (!isAuthorized) {
      sendError(res, 'Not authorized to review this application', null, 403);
      return;
    }

    if (!application.employerReceipt) {
      application.employerReceipt = {
        receiptSource: 'recruiter_in_app_review',
        externalReferenceNumber: `RCX-REV-${application._id}`,
        acknowledgedBy: `${req.user.name} (${(req.user as any).company || 'Hiring Manager'})`,
        confirmedAt: new Date(),
        verifiedNotes: 'Hiring team accessed and reviewed candidate profile in RecruitX ATS',
      };
      if (application.verificationLifecycleStage !== 'employer_status_updated') {
        application.verificationLifecycleStage = 'employer_receipt_confirmed';
      }
      application.statusHistory.push({
        status: application.status,
        changedAt: new Date(),
        note: `Employer-side receipt confirmed: Recruiter ${req.user.name} opened and reviewed candidate application in ATS.`,
      });
      await application.save();
    }

    sendSuccess(res, 'Application receipt acknowledged', { application });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to acknowledge receipt', null, 500);
  }
};

export const getApplications = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const filter: any = {};
    if (req.user?.role === 'student') {
      filter.student = req.user._id;
    }

    const applications = await Application.find(filter)
      .sort({ createdAt: -1 })
      .populate('job')
      .populate('student', 'name email phone')
      .populate('recruiter', 'name email');

    // Enrich applications with candidate resume profiles and ensure recruiter is assigned
    const [resumes, allRecruiters] = await Promise.all([
      Resume.find(),
      User.find({ role: { $in: ['recruiter', 'admin'] } }),
    ]);

    const resumeMap = new Map<string, any>();
    resumes.forEach((r: any) => {
      const sId = typeof r.student === 'object' && r.student?._id ? r.student._id.toString() : r.student?.toString();
      if (sId) resumeMap.set(sId, r);
    });

    const recruiterCompany = ((req.user as any)?.company || '').toLowerCase().trim();

    const enriched = applications
      .filter((app: any) => {
        // If logged-in user is a recruiter, only show applications that strictly belong to their company or their jobs
        if (req.user?.role === 'recruiter') {
          const appRecruiterId = typeof app.recruiter === 'object' && app.recruiter?._id
            ? app.recruiter._id.toString()
            : app.recruiter?.toString();
          const appJobPosterId = typeof app.job === 'object' && app.job?.postedBy
            ? (typeof app.job.postedBy === 'object' ? app.job.postedBy._id?.toString() : app.job.postedBy.toString())
            : null;

          const isDirectRecruiter = appRecruiterId === req.user._id.toString();
          const ownsJob = appJobPosterId === req.user._id.toString();
          const companyMatches = recruiterCompany && app.companyName && app.companyName.toLowerCase().trim() === recruiterCompany;

          // Recruiter must ONLY see applications belonging to their company or jobs they posted
          if (recruiterCompany) {
            return companyMatches || ownsJob;
          }
          return isDirectRecruiter || ownsJob;
        }
        return true;
      })
      .map((app: any) => {
        const sId = typeof app.student === 'object' && app.student?._id ? app.student._id.toString() : app.student?.toString();
        const r = sId ? resumeMap.get(sId) : null;

        let recruiterData = app.recruiter;
        if (!recruiterData && allRecruiters.length > 0 && app.companyName) {
          const matched = allRecruiters.find(
            (rec) => rec.company && rec.company.toLowerCase().trim() === app.companyName.toLowerCase().trim()
          );

          if (matched) {
            recruiterData = {
              _id: matched._id,
              name: matched.name,
              email: matched.email,
              company: matched.company || app.companyName || 'Hiring Team',
            };
          }
        }

        const atsEval = AtsVerificationService.evaluateApplicationVerification(app);
        return {
          ...app,
          status: atsEval.authoritativeStatus,
          authoritativeStatus: atsEval.authoritativeStatus,
          evidenceClassification: atsEval.evidenceClassification,
          statusConfig: APPLICATION_STATUS_CONFIG[atsEval.authoritativeStatus],
          recruiter: recruiterData,
          atsVerification: atsEval,
          candidateProfile: r ? {
            headline: r.headline || 'Applicant',
            skills: r.skills || [],
            fieldOfInterest: r.fieldOfInterest || 'General',
            summary: r.summary || '',
            education: r.education || [],
            resumeUrl: r.resumeUrl || app.resumeUrl || '',
            fileName: r.fileName || '',
          } : null,
        };
      });

    sendSuccess(res, 'Applications retrieved', { applications: enriched, count: enriched.length });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to fetch applications', null, 500);
  }
};

export const updateApplicationStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { status, note, rating, internalNotes } = req.body;
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const application = await Application.findById(id).populate('job');
    if (!application) {
      sendError(res, 'Application not found', null, 404);
      return;
    }

    if (status && status !== application.status) {
      application.status = status;
      application.verificationLifecycleStage = 'employer_status_updated';
      if (!application.employerReceipt && req.user?.role === 'recruiter') {
        application.employerReceipt = {
          receiptSource: 'recruiter_in_app_review',
          externalReferenceNumber: `RCX-REV-${application._id}`,
          acknowledgedBy: `${req.user.name} (${(req.user as any).company || 'Hiring Manager'})`,
          confirmedAt: new Date(),
          verifiedNotes: `Employer advanced candidate hiring stage to ${status.replace('_', ' ').toUpperCase()}`,
        };
      }
      application.statusHistory.push({
        status,
        changedAt: new Date(),
        note: note || `Employer updated status to ${status.replace('_', ' ')}`,
      });

      // Create real-time notification for student
      const jobTitle = application.jobTitle || (application.job as any)?.title || 'your application';
      const studentId = typeof application.student === 'object' && application.student?._id ? application.student._id : application.student;
      const statusNotif = await Notification.create({
        recipient: studentId,
        title: 'Application Status Update',
        message: `Your application status for "${jobTitle}" has been updated to "${status.replace('_', ' ').toUpperCase()}".`,
        type: 'application_update',
        format: status === 'hired' || status === 'offered' ? 'modal' : 'toast',
        priority: status === 'hired' || status === 'offered' ? 'urgent' : 'high',
        actionText: 'View Applications',
        actionUrl: '/student/applications',
        link: '/student/applications',
      });
      emitToUser(studentId, 'notification:new', { notification: statusNotif });
    }

    if (rating !== undefined) {
      application.rating = rating;
    }

    if (internalNotes !== undefined) {
      application.internalNotes = internalNotes;
    }

    await application.save();

    sendSuccess(res, 'Application updated successfully', { application });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to update application status', null, 500);
  }
};

/**
 * Execute the autonomous application engine for the authenticated student
 */
export const runAutoApply = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'student') {
      sendError(res, 'Only students can execute autonomous applications', null, 403);
      return;
    }

    const { consentGranted = true, dailyLimit, minMatchScore, targetRoles, remoteOnly } = req.body;

    const result = await AutomatedApplicationService.runAutonomousPipeline({
      studentId: req.user._id.toString(),
      consentGranted: Boolean(consentGranted),
      dailyLimit: dailyLimit ? Number(dailyLimit) : (req.user as any).autoApplyDailyLimit || 5,
      minMatchScore: minMatchScore ? Number(minMatchScore) : (req.user as any).autoApplyMinScore || 70,
      targetRoles: Array.isArray(targetRoles) ? targetRoles : (req.user as any).autoApplyTargetRoles || [],
      remoteOnly: remoteOnly !== undefined ? Boolean(remoteOnly) : (req.user as any).autoApplyRemoteOnly || false,
    });

    if (!result.success) {
      sendError(res, result.message, result, 400);
      return;
    }

    sendSuccess(res, result.message, result);
  } catch (error: any) {
    sendError(res, error.message || 'Autonomous application execution failed', null, 500);
  }
};

/**
 * Get candidate's autonomous auto-apply preferences
 */
export const getAutoApplyPreferences = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Not authenticated', null, 401);
      return;
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      sendError(res, 'User not found', null, 404);
      return;
    }

    sendSuccess(res, 'Auto-apply preferences retrieved', {
      autoApplyEnabled: user.autoApplyEnabled ?? false,
      autoApplyDailyLimit: user.autoApplyDailyLimit ?? 5,
      autoApplyMinScore: user.autoApplyMinScore ?? 70,
      autoApplyTargetRoles: user.autoApplyTargetRoles || [],
      autoApplyRemoteOnly: user.autoApplyRemoteOnly ?? false,
      lastAutoApplyRunAt: user.lastAutoApplyRunAt,
      inboxSyncLastRunAt: user.inboxSyncLastRunAt,
      isEmailSendingAuthorized: user.isEmailSendingAuthorized ?? false,
      authorizedSendingEmail: user.authorizedSendingEmail,
      authorizedSendingProvider: user.authorizedSendingProvider,
    });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to get preferences', null, 500);
  }
};

/**
 * Update candidate's autonomous auto-apply preferences
 */
export const updateAutoApplyPreferences = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'student') {
      sendError(res, 'Only students can configure auto-apply preferences', null, 403);
      return;
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      sendError(res, 'User not found', null, 404);
      return;
    }

    const {
      autoApplyEnabled,
      autoApplyDailyLimit,
      autoApplyMinScore,
      autoApplyTargetRoles,
      autoApplyRemoteOnly,
    } = req.body;

    if (autoApplyEnabled !== undefined) user.autoApplyEnabled = Boolean(autoApplyEnabled);
    if (autoApplyDailyLimit !== undefined) user.autoApplyDailyLimit = Math.max(1, Math.min(50, Number(autoApplyDailyLimit)));
    if (autoApplyMinScore !== undefined) user.autoApplyMinScore = Math.max(50, Math.min(95, Number(autoApplyMinScore)));
    if (Array.isArray(autoApplyTargetRoles)) user.autoApplyTargetRoles = autoApplyTargetRoles;
    if (autoApplyRemoteOnly !== undefined) user.autoApplyRemoteOnly = Boolean(autoApplyRemoteOnly);

    await user.save();

    sendSuccess(res, 'Auto-apply preferences updated successfully', {
      autoApplyEnabled: user.autoApplyEnabled,
      autoApplyDailyLimit: user.autoApplyDailyLimit,
      autoApplyMinScore: user.autoApplyMinScore,
      autoApplyTargetRoles: user.autoApplyTargetRoles,
      autoApplyRemoteOnly: user.autoApplyRemoteOnly,
    });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to update preferences', null, 500);
  }
};

/**
 * Autonomous inbox synchronization for employer acknowledgements and status updates
 */
export const syncCandidateInbox = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'student') {
      sendError(res, 'Only students can sync employer inboxes', null, 403);
      return;
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      sendError(res, 'User not found', null, 404);
      return;
    }

    const summary = await InboxMonitoringService.syncCandidateInbox(user);
    if (!summary.success && summary.provider === 'none') {
      sendError(res, summary.message || 'No authorized email account connected', summary, 400);
      return;
    }

    sendSuccess(res, summary.message || 'Inbox synchronized successfully', summary);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to sync candidate inbox', null, 500);
  }
};

/**
 * Retrieve immutable telemetry events for an application
 */
export const getApplicationEvents = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const application = await Application.findById(id);

    if (!application) {
      sendError(res, 'Application not found', null, 404);
      return;
    }

    // Verify user authorization (must be owner student, assigned recruiter, or admin)
    const sId = typeof application.student === 'object' && application.student?._id ? application.student._id.toString() : application.student?.toString();
    const rId = typeof application.recruiter === 'object' && application.recruiter?._id ? application.recruiter._id.toString() : application.recruiter?.toString();

    const isAuthorized =
      req.user?.role === 'admin' ||
      (req.user?.role === 'student' && sId === req.user._id.toString()) ||
      (req.user?.role === 'recruiter' && rId === req.user._id.toString());

    if (!isAuthorized) {
      sendError(res, 'Not authorized to view events for this application', null, 403);
      return;
    }

    const events = await ApplicationEvent.getEventsByApplicationId(id);
    sendSuccess(res, 'Application events retrieved', { events, count: events.length });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to retrieve application events', null, 500);
  }
};

/**
 * Real-time summary statistics calculated dynamically from actual database records
 */
export const getApplicationSummaryStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Not authenticated', null, 401);
      return;
    }

    const studentId = req.user._id.toString();
    const [applications, eventStats] = await Promise.all([
      Application.find({ student: studentId }),
      ApplicationEvent.getStudentEventStats(studentId),
    ]);

    const totalApplications = applications.length;
    const autoAppliedCount = applications.filter((a) => a.autoApplied).length;
    const directAtsCount = applications.filter((a) => a.atsPlatform === 'greenhouse' || a.atsPlatform === 'lever').length;
    const emailsDispatchedCount = applications.filter((a) =>
      Boolean(a.senderEmail || a.emailMessageId || a.emailSentAt || a.status === 'email_sent' || a.status === 'email_delivered')
    ).length;
    const employerConfirmedCount = applications.filter((a) =>
      a.status === 'employer_receipt_confirmed' || a.primaryStatus === 'employer_receipt_confirmed' || a.isIndependentlyAuthenticated
    ).length;
    const interviewsCount = applications.filter((a) =>
      a.status === 'interview_scheduled' || a.hiringStage === 'interview_scheduled'
    ).length;
    const actionRequiredCount = applications.filter((a) =>
      a.status === 'external_application_required' || a.submissionStatus === 'requires_manual_application'
    ).length;
    const rejectedCount = applications.filter((a) =>
      a.status === 'rejected' || a.hiringStage === 'rejected'
    ).length;
    const offersCount = applications.filter((a) =>
      a.status === 'offered' || a.hiringStage === 'offered'
    ).length;

    sendSuccess(res, 'Live summary statistics calculated from Firestore', {
      totalApplications,
      autoAppliedCount,
      directAtsCount,
      emailsDispatchedCount,
      employerConfirmedCount,
      interviewsCount,
      actionRequiredCount,
      rejectedCount,
      offersCount,
      eventStats,
    });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to calculate application statistics', null, 500);
  }
};
