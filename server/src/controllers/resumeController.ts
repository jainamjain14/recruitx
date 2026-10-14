import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { Resume } from '../models/Resume.js';
import { Job } from '../models/Job.js';
import { AIService, ParsedResumeData } from '../services/aiService.js';
import { StorageService } from '../services/storageService.js';
import { extractTextFromPdfBuffer } from '../utils/pdfExtractor.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

export const getResume = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const studentId = req.query.studentId || req.user?._id;
    let resume = await Resume.findOne({ student: studentId });

    if (!resume && req.user && req.user._id.toString() === studentId?.toString()) {
      resume = await Resume.create({
        student: req.user._id,
        headline: '',
        summary: '',
        fieldOfInterest: '',
        skills: [],
        education: [],
        experience: [],
        projects: [],
      });
    }

    sendSuccess(res, 'Resume fetched', { resume });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to fetch resume', null, 500);
  }
};

export const updateResume = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'student') {
      sendError(res, 'Only students can edit their resume', null, 403);
      return;
    }

    let resume = await Resume.findOne({ student: req.user._id });
    if (!resume) {
      resume = new Resume({ student: req.user._id, ...req.body });
    } else {
      Object.assign(resume, req.body);
    }

    await resume.save();
    sendSuccess(res, 'Resume updated successfully', { resume });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to update resume', null, 500);
  }
};

export const aiParseResume = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'student') {
      sendError(res, 'Only students can use AI resume parsing', null, 403);
      return;
    }

    const { fileBase64, mimeType, fileName, resumeText } = req.body;
    let extractedText = resumeText || '';
    let storedResumeUrl: string | undefined;

    if (fileBase64) {
      const validation = StorageService.validateUpload(
        fileBase64,
        mimeType || 'application/pdf',
        fileName || 'resume.pdf'
      );

      if (!validation.valid) {
        sendError(res, validation.error || 'Invalid file payload', null, 400);
        return;
      }

      if (validation.buffer) {
        const saved = await StorageService.saveFile(
          req.user._id.toString(),
          validation.buffer,
          validation.fileName || 'resume.pdf',
          'resumes'
        );
        storedResumeUrl = saved.fileUrl;

        if (!extractedText && validation.mimeType === 'application/pdf') {
          extractedText = extractTextFromPdfBuffer(validation.buffer);
        }
      }
    }

    // Call AIService (Uses Gemini Vision API if GEMINI_API_KEY is in .env, or smart multi-domain parser)
    const parsedData: ParsedResumeData = await AIService.parse(
      fileBase64,
      mimeType || 'application/pdf',
      extractedText,
      fileName
    );

    // Save or update Student Resume profile in DB
    let resume = await Resume.findOne({ student: req.user._id });
    if (!resume) {
      resume = new Resume({
        student: req.user._id,
        resumeUrl: storedResumeUrl,
        fileName: fileName || 'Uploaded Resume',
        ...parsedData,
      });
    } else {
      if (parsedData.headline) resume.headline = parsedData.headline;
      if (parsedData.summary) resume.summary = parsedData.summary;
      if (parsedData.fieldOfInterest) resume.fieldOfInterest = parsedData.fieldOfInterest;
      if (parsedData.skills && parsedData.skills.length > 0) {
        resume.skills = parsedData.skills;
      }
      if (storedResumeUrl) resume.resumeUrl = storedResumeUrl;
      if (fileName) resume.fileName = fileName;
    }

    await resume.save();

    sendSuccess(res, `AI Resume Extraction Complete for ${fileName || 'uploaded document'}! Profile updated.`, {
      resume,
      parsedData,
    });
  } catch (error: any) {
    sendError(res, error.message || 'AI resume extraction failed', null, 500);
  }
};

export const getSkillGap = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const studentId = req.user?._id;
    let resume = await Resume.findOne({ student: studentId });

    if (!resume) {
      resume = await Resume.create({
        student: studentId,
        headline: '',
        summary: '',
        fieldOfInterest: '',
        skills: [],
      });
    }

    // Fetch active jobs from DB to compare real recruiter requirements
    const realJobs = await Job.find({ status: 'active' }).populate('postedBy', 'company name');

    // Run AI Skill Gap Engine
    const analysis = await AIService.analyzeSkillGap(resume, realJobs);

    sendSuccess(res, 'Skill gap analysis generated', { analysis });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to analyze skill gap', null, 500);
  }
};

export const getCareerRoadmap = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const studentId = req.user?._id;
    let resume = await Resume.findOne({ student: studentId });

    if (!resume) {
      resume = await Resume.create({
        student: studentId,
        headline: '',
        summary: '',
        fieldOfInterest: '',
        skills: [],
      });
    }

    const roadmap = await AIService.generateCareerRoadmap(resume);
    sendSuccess(res, 'Career roadmap generated', { roadmap });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to generate career roadmap', null, 500);
  }
};

