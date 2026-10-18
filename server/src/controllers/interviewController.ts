import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { Interview } from '../models/Interview.js';
import { Application } from '../models/Application.js';
import { Job } from '../models/Job.js';
import { Notification } from '../models/Notification.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { AIService } from '../services/aiService.js';
import { emitToUser } from '../socket.js';

export const scheduleInterview = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Authentication required to schedule interviews', null, 401);
      return;
    }

    const isStudent = req.user.role === 'student';
    const isRecruiterOrAdmin = req.user.role === 'recruiter' || req.user.role === 'admin';

    if (!isStudent && !isRecruiterOrAdmin) {
      sendError(res, 'Authentication required to schedule interviews', null, 403);
      return;
    }

    const { jobId, applicationId, studentId, recruiterId, title, scheduledAt, meetingLink, notes } = req.body;

    let targetStudentId = studentId;
    let targetRecruiterId = recruiterId;

    if (isStudent) {
      targetStudentId = req.user._id;

      // Resolve recruiter from application or job if not directly passed
      if (!targetRecruiterId && applicationId) {
        const appDoc = await Application.findById(applicationId);
        targetRecruiterId = typeof appDoc?.recruiter === 'object' && appDoc?.recruiter?._id
          ? appDoc.recruiter._id.toString()
          : appDoc?.recruiter?.toString();

        if (!targetRecruiterId && appDoc?.job) {
          const jobDoc = await Job.findById(typeof appDoc.job === 'object' && appDoc.job?._id ? appDoc.job._id : appDoc.job);
          targetRecruiterId = typeof jobDoc?.recruiter === 'object' && jobDoc?.recruiter?._id
            ? jobDoc.recruiter._id.toString()
            : jobDoc?.recruiter?.toString();
        }
      } else if (!targetRecruiterId && jobId) {
        const jobDoc = await Job.findById(jobId);
        targetRecruiterId = typeof jobDoc?.recruiter === 'object' && jobDoc?.recruiter?._id
          ? jobDoc.recruiter._id.toString()
          : jobDoc?.recruiter?.toString();
      }

      if (!targetRecruiterId) {
        sendError(res, 'Target Recruiter ID is required to schedule an interview', null, 400);
        return;
      }
    } else {
      // Recruiter scheduling
      targetRecruiterId = req.user._id;
      if (!targetStudentId && applicationId) {
        const appDoc = await Application.findById(applicationId);
        targetStudentId = typeof appDoc?.student === 'object' && appDoc?.student?._id
          ? appDoc.student._id.toString()
          : appDoc?.student?.toString();
      }

      if (!targetStudentId) {
        sendError(res, 'Candidate Student ID is required to schedule an interview', null, 400);
        return;
      }
    }

    const code = Math.random().toString(36).substring(2, 8);
    const finalMeetingLink = meetingLink || `/meeting/recruitx-${code}`;

    const interview = await Interview.create({
      job: jobId || undefined,
      application: applicationId || undefined,
      student: targetStudentId,
      recruiter: targetRecruiterId,
      title: title || (isStudent ? `Meeting with ${req.user.name || 'Candidate'}` : 'Candidate Interview'),
      scheduledAt: new Date(scheduledAt || Date.now() + 86400000),
      durationMinutes: 0,
      meetingLink: finalMeetingLink,
      notes,
      status: 'scheduled',
    });

    if (isStudent) {
      // Notify recruiter with high-priority interview proposal
      const notif = await Notification.create({
        recipient: targetRecruiterId,
        title: 'Meeting Scheduled by Candidate!',
        message: `${req.user.name || 'A candidate'} scheduled a video meeting for "${title || 'Interview'}" on ${new Date(scheduledAt || Date.now() + 86400000).toLocaleString()}`,
        type: 'interview_invite',
        format: 'modal',
        priority: 'urgent',
        actionText: 'Join as Host / View Interviews',
        actionUrl: '/recruiter/interviews',
        link: '/recruiter/interviews',
        metadata: {
          meetingLink: finalMeetingLink,
          scheduledAt,
          interviewId: interview._id,
        },
      });
      emitToUser(targetRecruiterId, 'notification:new', { notification: notif });
    } else {
      // Notify student with high-priority interview invite
      const notif = await Notification.create({
        recipient: targetStudentId,
        title: 'Interview Scheduled!',
        message: `You have an interview for "${title || 'your application'}" on ${new Date(scheduledAt || Date.now() + 86400000).toLocaleString()}`,
        type: 'interview_invite',
        format: 'modal',
        priority: 'urgent',
        actionText: 'Join Meeting / View Application',
        actionUrl: '/student/applications',
        link: '/student/applications',
        metadata: {
          meetingLink: finalMeetingLink,
          scheduledAt,
          interviewId: interview._id,
        },
      });
      emitToUser(targetStudentId, 'notification:new', { notification: notif });
    }

    sendSuccess(res, 'Interview scheduled successfully', { interview }, 201);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to schedule interview', null, 500);
  }
};

export const getInterviews = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const filter: any = {};
    if (req.user?.role === 'student') {
      filter.student = req.user._id;
    } else if (req.user?.role === 'recruiter') {
      filter.recruiter = req.user._id;
    }

    const interviews = await Interview.find(filter)
      .sort({ scheduledAt: 1 })
      .populate('job', 'title company')
      .populate('student', 'name email')
      .populate('recruiter', 'name email');

    sendSuccess(res, 'Interviews retrieved', { interviews });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to fetch interviews', null, 500);
  }
};

export const evaluateMockAnswer = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { question, domain, keyPoints, answer } = req.body;
    if (!question) {
      sendError(res, 'Question is required for evaluation', null, 400);
      return;
    }

    const evaluation = await AIService.evaluateMockInterviewAnswer(
      question,
      domain || 'General',
      Array.isArray(keyPoints) ? keyPoints : [],
      answer || ''
    );

    sendSuccess(res, 'Mock interview answer evaluated', evaluation);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to evaluate mock answer', null, 500);
  }
};

export const generateQuestions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { roleOrDomain, experienceLevel, count } = req.body;
    if (!roleOrDomain) {
      sendError(res, 'Role or domain is required to generate interview questions', null, 400);
      return;
    }

    const questions = await AIService.generateInterviewQuestions(
      roleOrDomain,
      experienceLevel || 'Mid-Level',
      count ? Number(count) : 4
    );

    sendSuccess(res, 'Interview questions generated', { questions });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to generate questions', null, 500);
  }
};

