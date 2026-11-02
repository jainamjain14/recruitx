import { User, IUserDocument } from '../models/User.js';
import { Application, IApplicationDocument, PrimaryApplicationStatus } from '../models/Application.js';
import { ApplicationEvent } from '../models/ApplicationEvent.js';
import { Resume } from '../models/Resume.js';
import { Job } from '../models/Job.js';
import { Notification } from '../models/Notification.js';
import { UniversalJobMatchingService } from './universalJobMatchingService.js';
import { LinkedInService, getVerifiedCompanyHrEmail } from './linkedinService.js';
import { AtsConnectorService } from './atsConnectorService.js';
import { CandidateApplicationEmailService } from './candidateApplicationEmailService.js';
import { EmailService } from './emailService.js';
import { emitToUser } from '../socket.js';

export interface AutoApplyExecutionOptions {
  studentId: string;
  consentGranted: boolean;
  dailyLimit?: number;
  minMatchScore?: number;
  targetRoles?: string[];
  remoteOnly?: boolean;
}

export interface AutoApplyExecutionResult {
  success: boolean;
  totalEvaluated: number;
  appliedCount: number;
  directAtsSubmittedCount: number;
  emailDispatchedCount: number;
  platformRecruiterCount: number;
  assistedPortalCount: number;
  applications: any[];
  message: string;
}

export class AutomatedApplicationService {
  /**
   * Universal Autonomous Job Application Pipeline Engine
   */
  static async runAutonomousPipeline(options: AutoApplyExecutionOptions): Promise<AutoApplyExecutionResult> {
    const { studentId, consentGranted, dailyLimit = 5, minMatchScore = 70, targetRoles = [], remoteOnly = false } = options;

    if (!consentGranted) {
      return {
        success: false,
        totalEvaluated: 0,
        appliedCount: 0,
        directAtsSubmittedCount: 0,
        emailDispatchedCount: 0,
        platformRecruiterCount: 0,
        assistedPortalCount: 0,
        applications: [],
        message: 'Student consent is required before autonomous applications can be executed.',
      };
    }

    const student = await User.findById(studentId);
    if (!student) throw new Error('Student account not found.');

    // 1. Quota Check: calculate applications submitted in the last 24 hours
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const existingApps = await Application.find({ student: studentId });
    const todayApps = existingApps.filter((a) => a.appliedAt && new Date(a.appliedAt) >= startOfToday);

    const allowedToApply = Math.max(0, dailyLimit - todayApps.length);
    if (allowedToApply <= 0) {
      return {
        success: true,
        totalEvaluated: existingApps.length,
        appliedCount: 0,
        directAtsSubmittedCount: 0,
        emailDispatchedCount: 0,
        platformRecruiterCount: 0,
        assistedPortalCount: 0,
        applications: [],
        message: `Daily application limit reached (${dailyLimit} applications per day). Next quota reset at midnight.`,
      };
    }

    // 2. Resolve Candidate Resume
    const resume = await Resume.findOne({ student: studentId });
    if (!resume) {
      return {
        success: false,
        totalEvaluated: 0,
        appliedCount: 0,
        directAtsSubmittedCount: 0,
        emailDispatchedCount: 0,
        platformRecruiterCount: 0,
        assistedPortalCount: 0,
        applications: [],
        message: 'No resume found. Please upload or create a resume before running autonomous applications.',
      };
    }

    // 3. Match Jobs across all professions dynamically
    const platformJobs = await Job.find({ status: 'active' });
    const liveJobs = await LinkedInService.fetchLiveJobs(student.profession || resume.fieldOfInterest || 'Professional');
    const allCandidateJobs = [...platformJobs, ...liveJobs];

    const candidateData = {
      studentId: studentId,
      headline: resume.headline || student.title,
      fieldOfInterest: resume.fieldOfInterest || student.profession,
      summary: resume.summary || student.description,
      skills: resume.skills || [],
      experience: resume.experience || [],
      education: resume.education || [],
    };

    const { matchedJobs } = await UniversalJobMatchingService.matchJobsForCandidate(candidateData, allCandidateJobs);

    const alreadyAppliedMap = new Set<string>();
    existingApps.forEach((a) => {
      const c = (a.companyName || '').toLowerCase().trim();
      const t = (a.jobTitle || '').toLowerCase().trim();
      alreadyAppliedMap.add(`${c}::${t}`);
    });

    // Filter jobs
    const eligibleMatches = matchedJobs.filter((m: any) => {
      const comp = (m.company || '').toLowerCase().trim();
      const tit = (m.title || '').toLowerCase().trim();
      const key = `${comp}::${tit}`;
      if (alreadyAppliedMap.has(key)) return false;
      const score = m.matchPercentage || m.compatibilityScore || 0;
      if (score < minMatchScore) return false;
      if (remoteOnly && !(m.workMode || '').toLowerCase().includes('remote') && !(m.location || '').toLowerCase().includes('remote')) {
        return false;
      }
      if (targetRoles.length > 0) {
        const matchesTarget = targetRoles.some((r) => tit.includes(r.toLowerCase()));
        if (!matchesTarget) return false;
      }
      return true;
    });

    const jobsToApply = eligibleMatches.slice(0, allowedToApply);

    if (jobsToApply.length === 0) {
      return {
        success: true,
        totalEvaluated: matchedJobs.length,
        appliedCount: 0,
        directAtsSubmittedCount: 0,
        emailDispatchedCount: 0,
        platformRecruiterCount: 0,
        assistedPortalCount: 0,
        applications: [],
        message: `Evaluated ${allCandidateJobs.length} openings. No new unapplied jobs matched your criteria (Min Match: ${minMatchScore}%).`,
      };
    }

    const processedApplications: any[] = [];
    let directAtsCount = 0;
    let emailDispatchedCount = 0;
    let platformRecruiterCount = 0;
    let assistedPortalCount = 0;

    const recruiters = await User.find({ role: 'recruiter' });

    for (const job of jobsToApply) {
      // Step A: Log JOB_DISCOVERED
      const candidateDisplayName = student.name || 'Applicant';
      const tailoredCoverLetter = `Dear Hiring Team at ${job.company},\n\nI am writing to express my strong enthusiasm and application for the ${job.title} position. Based on my background in ${resume.fieldOfInterest || student.profession || 'this discipline'} and core skills in ${(resume.skills || []).slice(0, 5).join(', ')}, I am confident in delivering immediate impact to your organization.\n\nKey Match Highlights: ${job.matchReason}\n\nPlease review my attached resume for complete details on my experience and technical background.\n\nSincerely,\n${candidateDisplayName}`;

      // Check if job belongs to a platform recruiter
      const matchedRecruiter = (job.recruiterId
        ? recruiters.find((r) => r._id.toString() === job.recruiterId.toString())
        : null) || recruiters.find(
        (r) => r.company && r.company.toLowerCase().trim() === job.company.toLowerCase().trim()
      );

      let finalStatus: PrimaryApplicationStatus = 'external_application_required';
      let submissionStatus: any = 'requires_manual_application';
      let submissionType: any = 'external_portal';
      let atsPlatformName = AtsConnectorService.detectAtsPlatform(job.jobUrl);
      let confirmationDetails: any = null;
      let employerReceipt: any = null;
      let isIndependentlyAuthenticated = false;
      let evidenceClassification: any = 'internal_recruitx';
      let senderEmail: string | undefined;
      let recipientEmail: string | undefined;
      let emailProvider: any = undefined;
      let emailMessageId: string | undefined;
      let emailSentAt: Date | undefined;
      let viewSentEmailUrl: string | undefined;
      let assistedManifest: any = null;
      let submissionError: string | undefined = undefined;

      // ROUTE 1: Official ATS API (Greenhouse or Lever)
      if (atsPlatformName === 'greenhouse' || atsPlatformName === 'lever') {
        const atsResult = await AtsConnectorService.submitApplication({
          user: student,
          jobUrl: job.jobUrl || '',
          companyName: job.company,
          jobTitle: job.title,
          coverLetter: tailoredCoverLetter,
          resumeData: resume,
        });

        if (atsResult.status === 'submitted') {
          directAtsCount++;
          finalStatus = 'awaiting_employer_verification';
          submissionStatus = 'submitted';
          submissionType = 'external_portal';
          isIndependentlyAuthenticated = true;
          evidenceClassification = 'independently_authenticated';
          confirmationDetails = {
            confirmationId: atsResult.externalApplicationId,
            recipient: `${job.company} (${atsPlatformName.toUpperCase()} ATS)`,
            timestamp: new Date(),
            dispatchMethod: `Official ${atsPlatformName.toUpperCase()} REST API Integration`,
            messageId: atsResult.externalApplicationId,
            verifiedAt: new Date(),
          };
          employerReceipt = {
            receiptSource: 'authorized_integration_sync',
            externalReferenceNumber: atsResult.externalApplicationId,
            confirmedAt: new Date(),
            verifiedNotes: `Direct candidate application registered via ${atsPlatformName.toUpperCase()} REST API.`,
            isIndependentlyAuthenticated: true,
          };
        } else {
          // Assisted portal interaction required
          assistedPortalCount++;
          finalStatus = 'external_application_required';
          submissionStatus = 'requires_manual_application';
          assistedManifest = atsResult.autofillManifest;
          submissionError = atsResult.message;
        }
      }
      // ROUTE 2: Platform Recruiter Queue
      else if (matchedRecruiter) {
        platformRecruiterCount++;
        finalStatus = 'awaiting_employer_verification';
        submissionStatus = 'submitted';
        submissionType = 'platform_recruiter';
        evidenceClassification = 'internal_recruitx';

        const recNotif = await Notification.create({
          recipient: matchedRecruiter._id,
          title: `Autonomous Candidate Match: ${job.title}`,
          message: `${student.name} was auto-matched and applied with a ${job.compatibilityScore}% match score.`,
          type: 'application_update',
          priority: 'high',
          format: 'toast',
        });

        emitToUser(matchedRecruiter._id.toString(), 'notification:new', { notification: recNotif });

        confirmationDetails = {
          confirmationId: `RCX-ATS-${matchedRecruiter._id}-${Date.now().toString(36).toUpperCase()}`,
          recipient: `${matchedRecruiter.name} (${matchedRecruiter.email})`,
          timestamp: new Date(),
          dispatchMethod: `RecruitX Verified Recruiter Portal [Notification #${recNotif._id}]`,
          messageId: recNotif._id,
          verifiedAt: new Date(),
        };
      }
      // ROUTE 3: Verified Company Recruitment Email
      else {
        const destination = await CandidateApplicationEmailService.resolveApplicationDestination({
          companyName: job.company,
          targetHrEmail: job.hrEmail || getVerifiedCompanyHrEmail(job.company),
          jobUrl: job.jobUrl,
        });

        if (destination.method === 'email' && destination.destinationEmail) {
          const emailDispatch = await CandidateApplicationEmailService.dispatchApplication({
            user: student,
            resumeData: resume,
            companyName: job.company,
            jobTitle: job.title,
            targetHrEmail: destination.destinationEmail,
            jobUrl: job.jobUrl,
            coverLetter: tailoredCoverLetter,
          });

          if (emailDispatch.status === 'sent') {
            emailDispatchedCount++;
            finalStatus = 'email_sent';
            submissionStatus = 'submitted';
            submissionType = 'direct_hr_dispatch';
            evidenceClassification = 'external_system_response';
            senderEmail = emailDispatch.senderEmail;
            recipientEmail = emailDispatch.recipientEmail;
            emailProvider = emailDispatch.provider;
            emailMessageId = emailDispatch.messageId;
            emailSentAt = emailDispatch.sentAt || new Date();
            viewSentEmailUrl = emailDispatch.viewSentEmailUrl;
            confirmationDetails = {
              confirmationId: emailDispatch.messageId || `EMAIL-${Date.now()}`,
              recipient: recipientEmail,
              timestamp: emailSentAt,
              dispatchMethod: `Connected ${emailDispatch.provider?.toUpperCase()} API Transmission`,
              messageId: emailDispatch.messageId,
              verifiedAt: new Date(),
            };
          } else {
            assistedPortalCount++;
            finalStatus = 'external_application_required';
            submissionStatus = 'requires_manual_application';
            submissionError = 'To email this employer directly from your address, connect your Gmail or Outlook in Settings, or apply via their official career portal.';
          }
        } else {
          // ROUTE 4: Assisted Enterprise Portal Manifest
          assistedPortalCount++;
          finalStatus = 'external_application_required';
          submissionStatus = 'requires_manual_application';
          const manifestResult = AtsConnectorService.detectAtsPlatform(job.jobUrl);
          const manifestData = await AtsConnectorService.submitApplication({
            user: student,
            jobUrl: job.jobUrl || '',
            companyName: job.company,
            jobTitle: job.title,
            coverLetter: tailoredCoverLetter,
            resumeData: resume,
          });
          assistedManifest = manifestData.autofillManifest;
          submissionError = manifestData.message;
        }
      }

      // Create persistent Application in Firestore
      const newApp = await Application.create({
        job: job._id || job.id || undefined,
        student: studentId,
        recruiter: matchedRecruiter ? matchedRecruiter._id : null,
        companyName: job.company,
        jobTitle: job.title,
        coverLetter: tailoredCoverLetter,
        resumeUrl: resume.resumeUrl || '',
        status: finalStatus,
        primaryStatus: finalStatus,
        submissionStatus,
        submissionType,
        applicationDestination: job.company + ' Recruitment',
        destinationUrl: job.jobUrl || '/student/jobs',
        confirmationDetails,
        employerReceipt,
        isIndependentlyAuthenticated,
        evidenceClassification,
        senderEmail,
        recipientEmail,
        emailProvider,
        emailMessageId,
        emailSentAt,
        viewSentEmailUrl,
        autoApplied: true,
        atsPlatform: atsPlatformName,
        assistedAutofillManifest: assistedManifest,
        submissionError,
        resumeTransmitted: submissionStatus === 'submitted',
        candidateContactTransmitted: true,
        statusHistory: [{
          status: finalStatus,
          changedAt: new Date(),
          note: `Autonomous Engine: Dispatched via ${submissionType.replace(/_/g, ' ')} (${finalStatus.replace(/_/g, ' ')}).`,
        }],
      });

      // Log lifecycle telemetry events
      await ApplicationEvent.logEvent({
        applicationId: newApp._id,
        studentId,
        companyName: job.company,
        jobTitle: job.title,
        eventType: 'JOB_DISCOVERED',
        actor: 'AUTONOMOUS_ENGINE',
        title: 'Job Discovered & Evaluated',
        description: `Compatible opening discovered with a ${job.compatibilityScore}% profile match.`,
        metadata: { matchScore: job.compatibilityScore, matchReason: job.matchReason },
      });

      await ApplicationEvent.logEvent({
        applicationId: newApp._id,
        studentId,
        companyName: job.company,
        jobTitle: job.title,
        eventType: 'APPLICATION_PREPARED',
        actor: 'AUTONOMOUS_ENGINE',
        title: 'Tailored Application Prepared',
        description: `Custom cover letter and verified resume prepared for ${job.title} at ${job.company}.`,
      });

      if (submissionStatus === 'submitted') {
        const isEmail = finalStatus === 'email_sent';
        await ApplicationEvent.logEvent({
          applicationId: newApp._id,
          studentId,
          companyName: job.company,
          jobTitle: job.title,
          eventType: isEmail ? 'EMAIL_DISPATCHED' : 'APPLICATION_SUBMITTED',
          actor: isEmail ? (emailProvider === 'gmail' ? 'GMAIL_INBOX_MONITOR' : 'OUTLOOK_INBOX_MONITOR') : 'AUTONOMOUS_ENGINE',
          title: isEmail ? 'Application Email Dispatched' : 'Application Successfully Submitted',
          description: isEmail
            ? `Transmitted directly to ${recipientEmail} from ${senderEmail} with resume attached.`
            : `Delivered with verifiable confirmation (Ref #${confirmationDetails?.confirmationId || 'RCX'}).`,
          metadata: confirmationDetails || {},
        });
      } else {
        await ApplicationEvent.logEvent({
          applicationId: newApp._id,
          studentId,
          companyName: job.company,
          jobTitle: job.title,
          eventType: 'ACTION_REQUIRED',
          actor: 'AUTONOMOUS_ENGINE',
          title: 'Action Required: Portal Security Verification',
          description: submissionError || 'Employer portal requires candidate single-sign-on or CAPTCHA verification.',
          metadata: { portalUrl: job.jobUrl },
        });
      }

      processedApplications.push(newApp);
    }

    student.lastAutoApplyRunAt = new Date();
    await student.save();

    return {
      success: true,
      totalEvaluated: allCandidateJobs.length,
      appliedCount: processedApplications.length,
      directAtsSubmittedCount: directAtsCount,
      emailDispatchedCount,
      platformRecruiterCount,
      assistedPortalCount,
      applications: processedApplications,
      message: `Autonomous pipeline complete. ${processedApplications.length} applications processed: ${directAtsCount} via direct ATS, ${emailDispatchedCount} via email, ${platformRecruiterCount} to recruiters, ${assistedPortalCount} assisted manifests.`,
    };
  }
}
