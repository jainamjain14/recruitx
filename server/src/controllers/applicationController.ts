import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { Application } from '../models/Application.js';
import { Job } from '../models/Job.js';
import { Resume } from '../models/Resume.js';
import { Notification } from '../models/Notification.js';
import { EmailService } from '../services/emailService.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

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
    await Notification.create({
      recipient: job.recruiter,
      title: 'New Job Application',
      message: `${req.user.name} applied for "${job.title}"`,
      type: 'application_update',
      link: '/recruiter/applications',
    });

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

    const application = await Application.create({
      student: req.user._id,
      companyName,
      jobTitle,
      coverLetter: coverLetter || `Direct application for ${jobTitle} at ${companyName}`,
      resumeUrl: resume?.headline ? `Uploaded Resume Profile (${resume.fieldOfInterest || 'Student Profile'})` : 'Uploaded Resume',
      status: 'applied',
      statusHistory: [{ status: 'applied', note: 'Native application submitted with uploaded resume' }],
    });

    // 1. Create real-time notification for student
    await Notification.create({
      recipient: req.user._id,
      title: 'Application Submitted!',
      message: `Your application and uploaded resume for "${jobTitle}" at ${companyName} have been sent successfully.`,
      type: 'application_update',
      link: '/student/applications',
    });

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
    } else if (req.user?.role === 'recruiter') {
      filter.recruiter = req.user._id;
    }

    const applications = await Application.find(filter)
      .sort({ createdAt: -1 })
      .populate('job')
      .populate('student', 'name email')
      .populate('recruiter', 'name email');

    sendSuccess(res, 'Applications retrieved', { applications, count: applications.length });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to fetch applications', null, 500);
  }
};

export const updateApplicationStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { status, note } = req.body;
    const application = await Application.findById(req.params.id).populate('job');
    if (!application) {
      sendError(res, 'Application not found', null, 404);
      return;
    }

    application.status = status;
    application.statusHistory.push({
      status,
      changedAt: new Date(),
      note: note || `Status updated to ${status}`,
    });

    await application.save();

    // Create real-time notification for student
    const jobTitle = application.jobTitle || (application.job as any)?.title || 'your application';
    await Notification.create({
      recipient: application.student,
      title: 'Application Status Update',
      message: `Your application status for "${jobTitle}" has been updated to "${status.replace('_', ' ').toUpperCase()}".`,
      type: 'application_update',
      link: '/student/applications',
    });

    sendSuccess(res, 'Application status updated successfully', { application });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to update application status', null, 500);
  }
};
