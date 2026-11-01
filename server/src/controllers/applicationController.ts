import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { Application, ApplicationSubmissionStatus } from '../models/Application.js';
import { AtsVerificationService, APPLICATION_STATUS_CONFIG } from '../services/atsVerificationService.js';
import { Job } from '../models/Job.js';
import { Resume } from '../models/Resume.js';
import { PlacementEligibilityRule } from '../models/PlacementEligibilityRule.js';
import { Notification } from '../models/Notification.js';
import { EmailService } from '../services/emailService.js';
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
    } else if (hrEmail) {
      // 2. Verified HR Email Dispatch via Brevo HTTPS API
      const emailResult = await EmailService.sendApplicationToHR({
        candidateName: req.user.name,
        candidateEmail: req.user.email,
        jobTitle,
        companyName,
        headline: resume?.headline,
        summary: resume?.summary,
        skills: resume?.skills,
        fieldOfInterest: resume?.fieldOfInterest,
        targetHrEmail: hrEmail,
      });

      if (emailResult.success && emailResult.messageId) {
        submissionStatus = 'submitted';
        submissionType = 'direct_hr_dispatch';
        applicationDestination = `Verified Company HR Inbox (${hrEmail})`;
        confirmationDetails = {
          confirmationId: emailResult.messageId,
          recipient: hrEmail,
          timestamp: new Date(),
          dispatchMethod: 'Brevo Transactional HTTPS Gateway',
          messageId: emailResult.messageId,
          verifiedAt: new Date(),
        };
        resumeTransmitted = true;
        candidateContactTransmitted = true;
        statusNote = `Application package dispatched to verified hiring inbox (${hrEmail}) with confirmed HTTPS delivery [MessageId: ${emailResult.messageId}]`;
      } else {
        submissionStatus = 'requires_manual_application';
        submissionType = 'external_portal';
        applicationDestination = `Company Official Portal (${companyName})`;
        statusNote = `Direct automated dispatch unavailable: ${emailResult.error || 'Please apply directly via official career portal.'}`;
      }
    } else {
      // 3. External Employer / LinkedIn Portal Opportunity
      // Automated third-party form-filling on external proprietary career portals cannot be faked!
      submissionStatus = 'requires_manual_application';
      submissionType = 'external_portal';
      applicationDestination = 'Employer Official Career Portal';
      statusNote = 'Third-party employer requires direct submission through their official career portal. Direct application link provided.';
      resumeTransmitted = false;
      candidateContactTransmitted = false;
    }

    const initialStatus = submissionStatus === 'requires_manual_application'
      ? 'external_application_required'
      : 'awaiting_employer_verification';

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
      submissionError: (submissionStatus as any) === 'submission_failed' ? 'Automated dispatch to company inbox failed.' : (submissionStatus === 'requires_manual_application' ? 'External employer requires direct submission on their portal.' : undefined),
      resumeTransmitted,
      candidateContactTransmitted,
      statusHistory: [{ status: initialStatus, note: statusNote }],
    });

    // Create notification for student
    const notifTitle = submissionStatus === 'submitted'
      ? 'Application Submitted!'
      : (submissionStatus === 'requires_manual_application'
          ? 'Application Tracker Initialized'
          : 'Submission Failed');

    const notifMsg = submissionStatus === 'submitted'
      ? `Your application for "${jobTitle}" at ${companyName} was submitted successfully with verified delivery confirmation.`
      : (submissionStatus === 'requires_manual_application'
          ? `This role requires submission on ${companyName}'s official portal. We have generated your application tracker and prepared your link.`
          : `Automated dispatch failed for ${companyName}. Please apply manually via their career portal.`);

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

    const responseMsg = submissionStatus === 'submitted'
      ? `Application for ${jobTitle} at ${companyName} submitted successfully with verified delivery confirmation!`
      : (submissionStatus === 'requires_manual_application'
          ? `Application tracker established. This employer requires direct submission on their official career portal.`
          : `Could not dispatch application automatically. Please use the official application link.`);

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
