import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { Application } from '../models/Application.js';
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

    const application = await Application.create({
      job: jobId,
      student: req.user._id,
      recruiter: job.recruiter,
      companyName: job.company,
      jobTitle: job.title,
      coverLetter: coverLetter || '',
      resumeUrl: resumeUrl || '',
      status: 'applied',
      statusHistory: [{ status: 'applied', note: 'Application submitted' }],
    });

    // Increment application count on job
    job.applicationsCount = (job.applicationsCount || 0) + 1;
    await job.save();

    // Create notification for recruiter
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

    const { companyName, jobTitle, coverLetter, hrEmail } = req.body;
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
      sendError(res, `You have already applied for ${jobTitle} at ${companyName}`, null, 400);
      return;
    }

    // Resolve recruiter ONLY if a recruiter is registered for this specific company
    const recruiters = await User.find({ role: 'recruiter' });
    const matchedRecruiter = recruiters.find(
      (r) => r.company && companyName && r.company.toLowerCase().trim() === companyName.toLowerCase().trim()
    );

    const recruiterId = matchedRecruiter?._id || null;

    const application = await Application.create({
      student: req.user._id,
      companyName,
      jobTitle,
      recruiter: recruiterId,
      coverLetter: coverLetter || `Direct application for ${jobTitle} at ${companyName}`,
      resumeUrl: resume?.headline ? `Uploaded Resume Profile (${resume.fieldOfInterest || 'Student Profile'})` : 'Uploaded Resume',
      status: 'applied',
      statusHistory: [{ status: 'applied', note: 'Native application submitted with uploaded resume' }],
    });

    // 1. Create real-time notification for student
    const studentNotif = await Notification.create({
      recipient: req.user._id,
      title: 'Application Submitted!',
      message: `Your application and uploaded resume for "${jobTitle}" at ${companyName} have been sent successfully.`,
      type: 'application_update',
      format: 'toast',
      actionText: 'View Applications',
      actionUrl: '/student/applications',
      link: '/student/applications',
    });
    emitToUser(req.user._id, 'notification:new', { notification: studentNotif });

    // 2. Dispatch Automated Application Package to Target Company HR Inbox
    await EmailService.sendApplicationToHR({
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

    sendSuccess(res, `Application for ${jobTitle} at ${companyName} submitted successfully! Candidate profile dispatched to HR.`, { application }, 201);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to submit application', null, 500);
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

        return {
          ...app,
          recruiter: recruiterData,
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
      application.statusHistory.push({
        status,
        changedAt: new Date(),
        note: note || `Status updated to ${status.replace('_', ' ')}`,
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
