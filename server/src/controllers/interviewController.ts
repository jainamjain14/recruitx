import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { Interview } from '../models/Interview.js';
import { Notification } from '../models/Notification.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { AIService } from '../services/aiService.js';
import { emitToUser } from '../socket.js';

export const scheduleInterview = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (req.user?.role !== 'recruiter' && req.user?.role !== 'admin') {
      sendError(res, 'Only recruiters can schedule interviews', null, 403);
      return;
    }

    const { jobId, applicationId, studentId, title, scheduledAt, durationMinutes, meetingLink, notes } = req.body;

    const interview = await Interview.create({
      job: jobId,
      application: applicationId,
      student: studentId,
      recruiter: req.user._id,
      title,
      scheduledAt: new Date(scheduledAt),
      durationMinutes: durationMinutes || 45,
      meetingLink: meetingLink || 'https://meet.google.com/recruitx-demo',
      notes,
      status: 'scheduled',
    });

    // Notify student with high-priority interview invite
    const notif = await Notification.create({
      recipient: studentId,
      title: 'Interview Scheduled!',
      message: `You have an interview for "${title}" on ${new Date(scheduledAt).toLocaleString()}`,
      type: 'interview_invite',
      format: 'modal',
      priority: 'urgent',
      actionText: 'Join Meeting / View Application',
      actionUrl: '/student/applications',
      link: '/student/applications',
      metadata: {
        meetingLink: meetingLink || 'https://meet.google.com/recruitx-demo',
        scheduledAt,
      },
    });

    emitToUser(studentId, 'notification:new', { notification: notif });

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

