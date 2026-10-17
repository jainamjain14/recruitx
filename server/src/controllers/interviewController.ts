import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { Interview } from '../models/Interview.js';
import { Application } from '../models/Application.js';
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

    let targetStudentId = studentId;
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

    const interview = await Interview.create({
      job: jobId || undefined,
      application: applicationId || undefined,
      student: targetStudentId,
      recruiter: req.user._id,
      title: title || 'Candidate Interview',
      scheduledAt: new Date(scheduledAt || Date.now() + 86400000),
      durationMinutes: durationMinutes || 45,
      meetingLink: meetingLink || `https://meet.jit.si/recruitx-interview-${targetStudentId.slice(-6)}`,
      notes,
      status: 'scheduled',
    });

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
        meetingLink: meetingLink || `https://meet.jit.si/recruitx-interview-${targetStudentId.slice(-6)}`,
        scheduledAt,
      },
    });

    emitToUser(targetStudentId, 'notification:new', { notification: notif });

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

