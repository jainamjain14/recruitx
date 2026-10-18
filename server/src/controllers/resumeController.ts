import fs from 'fs';
import path from 'path';
import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { Resume } from '../models/Resume.js';
import { User } from '../models/User.js';
import { Job } from '../models/Job.js';
import { AIService, ParsedResumeData } from '../services/aiService.js';
import { StorageService } from '../services/storageService.js';
import { extractTextFromPdfBuffer } from '../utils/pdfExtractor.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { ResumeFileStorage } from '../services/resumeFileStorage.js';

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

    // Synchronize user profile profession and title if modified
    let updatedUser: any = undefined;
    if (req.body.fieldOfInterest || req.body.headline) {
      const userDoc = await User.findById(req.user._id.toString());
      if (userDoc) {
        if (req.body.fieldOfInterest) userDoc.profession = req.body.fieldOfInterest;
        if (req.body.headline) userDoc.title = req.body.headline;
        await userDoc.save();
        updatedUser = {
          _id: userDoc._id,
          name: userDoc.name,
          email: userDoc.email,
          role: userDoc.role,
          profession: userDoc.profession,
          title: userDoc.title,
          industry: userDoc.industry,
          experienceLevel: userDoc.experienceLevel,
          emailVerified: userDoc.emailVerified,
        };
      }
    }

    sendSuccess(res, 'Resume updated successfully', { resume, user: updatedUser });
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
    const isBase64Savable = fileBase64 && fileBase64.length < 900 * 1024; // Keep under 900KB for Firestore doc safety
    const nextVersion = ((resume?.resumeVersion as number) || 0) + 1;

    if (!resume) {
      resume = new Resume({
        student: req.user._id,
        resumeUrl: storedResumeUrl,
        fileName: fileName || 'Uploaded Resume',
        fileData: isBase64Savable ? fileBase64 : undefined,
        fileMimeType: mimeType || 'application/pdf',
        resumeVersion: nextVersion,
        ...parsedData,
      });
    } else {
      if (parsedData.headline) resume.headline = parsedData.headline;
      if (parsedData.summary) resume.summary = parsedData.summary;
      if (parsedData.fieldOfInterest) resume.fieldOfInterest = parsedData.fieldOfInterest;
      if (parsedData.skills && parsedData.skills.length > 0) {
        resume.skills = parsedData.skills;
      }
      if (Array.isArray(parsedData.education) && parsedData.education.length > 0) {
        resume.education = parsedData.education;
      }
      if (Array.isArray(parsedData.experience) && parsedData.experience.length > 0) {
        resume.experience = parsedData.experience;
      }
      if (Array.isArray(parsedData.projects) && parsedData.projects.length > 0) {
        resume.projects = parsedData.projects;
      }
      if (storedResumeUrl) resume.resumeUrl = storedResumeUrl;
      if (fileName) resume.fileName = fileName;
      if (isBase64Savable) {
        resume.fileData = fileBase64;
        resume.fileMimeType = mimeType || 'application/pdf';
      }
      resume.resumeVersion = nextVersion;
    }

    await resume.save();

    // CRUCIAL: Synchronize the authenticated User document with newly extracted profession & headline
    let userDoc = await User.findById(req.user._id.toString());
    if (userDoc) {
      if (parsedData.fieldOfInterest) {
        userDoc.profession = parsedData.fieldOfInterest;
        userDoc.industry = parsedData.fieldOfInterest;
      }
      if (parsedData.headline) {
        userDoc.title = parsedData.headline;
      }
      await userDoc.save();
    }

    // Persist full original document in cloud Firestore storage
    if (fileBase64) {
      await ResumeFileStorage.saveResumeFile(
        req.user._id.toString(),
        fileBase64,
        mimeType || 'application/pdf',
        fileName || 'Uploaded Resume.pdf'
      );
    }

    sendSuccess(res, `AI Resume Extraction Complete for ${fileName || 'uploaded document'}! Profile updated.`, {
      resume,
      parsedData,
      user: userDoc ? {
        _id: userDoc._id,
        name: userDoc.name,
        email: userDoc.email,
        role: userDoc.role,
        profession: userDoc.profession,
        title: userDoc.title,
        industry: userDoc.industry,
        experienceLevel: userDoc.experienceLevel,
        emailVerified: userDoc.emailVerified,
      } : undefined,
    });
  } catch (error: any) {
    sendError(res, error.message || 'AI resume extraction failed', null, 500);
  }
};

/**
 * Public/Protected endpoint to stream or download candidate resume file
 * Serves raw PDF if stored in Firestore/disk, or generates a verified printable HTML profile.
 */
export const serveResumeFile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const studentId = Array.isArray(req.params.studentId) ? req.params.studentId[0] : req.params.studentId;
    if (!studentId) {
      res.status(400).send('Student ID is required');
      return;
    }

    const resume = await Resume.findOne({ student: studentId });
    const candidateUser = await User.findById(studentId);

    if (!resume && !candidateUser) {
      res.status(404).send('Candidate resume profile not found');
      return;
    }

    const fileName = resume?.fileName || 'Candidate_Resume.pdf';
    const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');

    // 1. Cloud Firestore Chunked Storage (permanent, resilient across container restarts)
    const cloudFile = await ResumeFileStorage.getResumeFile(studentId);
    if (cloudFile) {
      res.setHeader('Content-Type', cloudFile.mimeType || 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${cloudFile.fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}"`);
      res.setHeader('Content-Length', cloudFile.buffer.length);
      res.send(cloudFile.buffer);
      return;
    }

    // 2. Direct base64 file data stored on resume document
    if (resume?.fileData) {
      const cleanBase64 = resume.fileData.includes(',')
        ? resume.fileData.split(',')[1]
        : resume.fileData;
      const buffer = Buffer.from(cleanBase64, 'base64');

      res.setHeader('Content-Type', resume.fileMimeType || 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${safeFileName}"`);
      res.setHeader('Content-Length', buffer.length);
      res.send(buffer);
      return;
    }

    // 3. If stored on disk in uploads/
    if (resume?.resumeUrl && resume.resumeUrl.startsWith('/uploads')) {
      const diskPath = path.resolve(process.cwd(), resume.resumeUrl.replace(/^\//, ''));
      if (fs.existsSync(diskPath)) {
        res.setHeader('Content-Disposition', `inline; filename="${safeFileName}"`);
        res.sendFile(diskPath);
        return;
      }
    }

    // 3. Resilient Fallback: If disk file was wiped across Render restart or missing,
    // render a clean, high-fidelity printable candidate resume view!
    const candidateName = candidateUser?.name || 'Verified Candidate';
    const candidateEmail = candidateUser?.email || '';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Resume - ${candidateName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #111827; max-width: 800px; margin: 40px auto; padding: 20px; }
    h1 { margin-bottom: 4px; font-size: 28px; font-weight: 800; color: #0f172a; }
    .subtitle { color: #475569; font-size: 14px; margin-bottom: 24px; font-weight: 500; }
    .section-title { font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #0284c7; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-top: 24px; margin-bottom: 12px; }
    .skill-badge { display: inline-block; background: #f1f5f9; color: #0f172a; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; margin: 0 4px 6px 0; border: 1px solid #e2e8f0; }
    .entry { margin-bottom: 14px; }
    .entry-header { display: flex; justify-content: space-between; font-weight: 700; font-size: 14px; }
    .entry-sub { color: #64748b; font-size: 13px; margin-bottom: 4px; }
    .desc { font-size: 13px; color: #334155; }
    .verified-banner { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px 14px; font-size: 12px; color: #166534; font-weight: 600; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; }
    @media print { body { margin: 0; padding: 0; } .verified-banner { display: none; } }
  </style>
</head>
<body>
  <div class="verified-banner">
    <span>✓ RecruitX Verified Candidate Profile</span>
    <button onclick="window.print()" style="background:#166534; color:white; border:none; border-radius:4px; padding:6px 12px; font-size:12px; cursor:pointer; font-weight:bold;">Print / Save as PDF</button>
  </div>
  <h1>${candidateName}</h1>
  <div class="subtitle">${resume?.headline || 'Candidate Profile'} • ${candidateEmail} ${candidateUser?.phone ? '• ' + candidateUser.phone : ''}</div>
  
  ${resume?.summary ? `<div class="section-title">Professional Summary</div><p class="desc">${resume.summary}</p>` : ''}
  
  ${resume?.skills && resume.skills.length > 0 ? `
    <div class="section-title">Core Skills & Competencies</div>
    <div>${resume.skills.map((s: string) => `<span class="skill-badge">${s}</span>`).join('')}</div>
  ` : ''}

  ${resume?.experience && resume.experience.length > 0 ? `
    <div class="section-title">Experience</div>
    ${resume.experience.map((e: any) => `
      <div class="entry">
        <div class="entry-header"><span>${e.title}</span><span>${e.startDate || ''} - ${e.endDate || 'Present'}</span></div>
        <div class="entry-sub">${e.company}${e.location ? ' • ' + e.location : ''}</div>
        <p class="desc">${e.description || ''}</p>
      </div>
    `).join('')}
  ` : ''}

  ${resume?.education && resume.education.length > 0 ? `
    <div class="section-title">Education</div>
    ${resume.education.map((edu: any) => `
      <div class="entry">
        <div class="entry-header"><span>${edu.institution}</span><span>${edu.startYear || ''} - ${edu.endYear || ''}</span></div>
        <div class="entry-sub">${edu.degree} in ${edu.fieldOfStudy}${edu.grade ? ' • Grade: ' + edu.grade : ''}</div>
      </div>
    `).join('')}
  ` : ''}

  ${resume?.projects && resume.projects.length > 0 ? `
    <div class="section-title">Projects</div>
    ${resume.projects.map((p: any) => `
      <div class="entry">
        <div class="entry-header"><span>${p.title}</span></div>
        <p class="desc">${p.description || ''}</p>
        ${p.technologies?.length ? `<div style="margin-top:4px;">${p.technologies.map((t: string) => `<span class="skill-badge" style="font-size:11px;">${t}</span>`).join('')}</div>` : ''}
      </div>
    `).join('')}
  ` : ''}
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error: any) {
    res.status(500).send(error.message || 'Failed to serve candidate resume');
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

    const targetCompany = (req.query.company as string) || '';
    const roadmap = await AIService.generateCareerRoadmap(resume, targetCompany, req.user);
    sendSuccess(res, 'Career roadmap generated', { roadmap });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to generate career roadmap', null, 500);
  }
};

