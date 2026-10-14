import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { Resume } from '../models/Resume.js';
import { Job } from '../models/Job.js';
import { CourseCompletion } from '../models/CourseCompletion.js';
import { CourseraService, COURSERA_CATALOG } from '../services/courseraService.js';
import { AIService } from '../services/aiService.js';

export const getRecommendedCourses = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const studentId = req.user?._id;
    const pricingFilter = (req.query.pricing as 'all' | 'free' | 'paid') || 'all';

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

    const targetRole = resume.fieldOfInterest || resume.headline || 'Software Engineering';
    const userSkills: string[] = Array.isArray(resume.skills) ? resume.skills : [];
    const lowerUserSkills = userSkills.map((s) => s.toLowerCase());

    // Fetch active jobs from DB to identify missing recruiter skills
    const realJobs = await Job.find({ status: 'active' });
    const missingSkillsSet = new Set<string>();

    // 1. Missing skills from active jobs
    realJobs.forEach((job) => {
      const reqs: string[] = Array.isArray(job.requirements) ? job.requirements : [];
      reqs.forEach((r) => {
        if (!lowerUserSkills.some((u) => u.includes(r.toLowerCase()) || r.toLowerCase().includes(u))) {
          missingSkillsSet.add(r);
        }
      });
    });

    // 2. Missing skills from industry standard baseline
    const reqSet = AIService.getIndustryRequirementSet(targetRole);
    [...reqSet.required, ...reqSet.optional].forEach((reqSkill) => {
      if (!lowerUserSkills.some((u) => u.includes(reqSkill.toLowerCase()) || reqSkill.toLowerCase().includes(u))) {
        missingSkillsSet.add(reqSkill);
      }
    });

    const missingSkills = Array.from(missingSkillsSet);

    // Fetch recommended Coursera courses
    const recommended = CourseraService.getRecommendedCourses(targetRole, missingSkills, pricingFilter);

    // Fetch student's existing completed courses from Firestore
    const completions = await CourseCompletion.find({ student: studentId });
    const completedCourseMap = new Map<string, any>();
    completions.forEach((c) => {
      completedCourseMap.set(c.courseId, {
        completedAt: c.completedAt,
        verificationMethod: c.verificationMethod,
        certificateUrl: c.certificateUrl,
        certificateId: c.certificateId,
        skillsAcquired: c.skillsAcquired,
      });
    });

    const enrichedCourses = recommended.map((course) => {
      const completionInfo = completedCourseMap.get(course.id);
      return {
        ...course,
        isCompleted: Boolean(completionInfo),
        completionDetails: completionInfo || null,
        // Mark which of the student's missing skills this course will fulfill
        matchedMissingSkills: course.skillsCovered.filter((cs) =>
          missingSkills.some((ms) => ms.toLowerCase().includes(cs.toLowerCase()) || cs.toLowerCase().includes(ms.toLowerCase()))
        ),
      };
    });

    sendSuccess(res, 'Coursera recommendations retrieved', {
      courses: enrichedCourses,
      targetRole,
      missingSkillsCount: missingSkills.length,
      completedCoursesCount: completions.length,
      pricingFilter,
    });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to retrieve Coursera recommendations', null, 500);
  }
};

export const verifyCourseCompletion = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const studentId = req.user?._id;
    const { courseId, certificateUrlOrCode } = req.body;

    if (!courseId) {
      sendError(res, 'Course ID is required', null, 400);
      return;
    }

    if (!certificateUrlOrCode || typeof certificateUrlOrCode !== 'string' || certificateUrlOrCode.trim().length < 6) {
      sendError(
        res,
        'Please enter a valid Coursera verification URL (e.g. https://www.coursera.org/verify/XYZ...) or Certificate ID.',
        null,
        400
      );
      return;
    }

    // Authenticate certificate link with Coursera format & verification endpoint
    const verification = await CourseraService.verifyCertificateLink(certificateUrlOrCode);
    if (!verification.valid) {
      sendError(res, verification.message, null, 400);
      return;
    }

    // Lookup course in catalog
    const course = COURSERA_CATALOG.find((c) => c.id === courseId);
    const courseTitle = course ? course.title : courseId.replace(/-/g, ' ');
    const provider = course ? course.provider : 'Coursera Verified Partner';
    const skillsToAward: string[] = course && course.skillsCovered.length > 0 ? course.skillsCovered : ['Verified Technical Competency'];

    // 1. Persist completion record in Firestore
    let existingCompletion = await CourseCompletion.findOne({ student: studentId, courseId });
    if (existingCompletion) {
      existingCompletion.certificateUrl = verification.normalizedUrl;
      existingCompletion.certificateId = verification.certificateId;
      existingCompletion.verificationMethod = 'coursera_certificate';
      existingCompletion.pricingType = 'paid';
      existingCompletion.completedAt = new Date();
      await existingCompletion.save();
    } else {
      existingCompletion = await CourseCompletion.create({
        student: studentId,
        courseId,
        courseTitle,
        provider,
        pricingType: 'paid',
        certificateUrl: verification.normalizedUrl,
        certificateId: verification.certificateId,
        skillsAcquired: skillsToAward,
        verificationMethod: 'coursera_certificate',
        completedAt: new Date(),
      });
    }

    // 2. AUTOMATIC SYNC: Add acquired skills to student's Resume profile
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

    const currentSkills = Array.isArray(resume.skills) ? [...resume.skills] : [];
    const addedSkills: string[] = [];

    skillsToAward.forEach((skill) => {
      const alreadyHas = currentSkills.some((s) => s.toLowerCase() === skill.toLowerCase());
      if (!alreadyHas) {
        currentSkills.push(skill);
        addedSkills.push(skill);
      }
    });

    if (addedSkills.length > 0) {
      resume.skills = currentSkills;
      await resume.save();
    }

    sendSuccess(res, 'Coursera certificate verified! Course marked completed and skills synced to your profile.', {
      completion: existingCompletion,
      addedSkills,
      totalSkills: resume.skills,
      certificateUrl: verification.normalizedUrl,
    });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to verify Coursera course completion', null, 500);
  }
};

export const markAuditCompleted = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const studentId = req.user?._id;
    const { courseId } = req.body;

    if (!courseId) {
      sendError(res, 'Course ID is required', null, 400);
      return;
    }

    const course = COURSERA_CATALOG.find((c) => c.id === courseId);
    const courseTitle = course ? course.title : courseId.replace(/-/g, ' ');
    const provider = course ? course.provider : 'Coursera Verified Partner';
    const skillsToAward: string[] = course && course.skillsCovered.length > 0 ? course.skillsCovered : ['Self-Paced Competency'];

    let completion = await CourseCompletion.findOne({ student: studentId, courseId });
    if (!completion) {
      completion = await CourseCompletion.create({
        student: studentId,
        courseId,
        courseTitle,
        provider,
        pricingType: 'free',
        skillsAcquired: skillsToAward,
        verificationMethod: 'free_audit',
        completedAt: new Date(),
      });
    } else {
      completion.completedAt = new Date();
      completion.verificationMethod = 'free_audit';
      await completion.save();
    }

    // Auto sync skills to Resume profile
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

    const currentSkills = Array.isArray(resume.skills) ? [...resume.skills] : [];
    const addedSkills: string[] = [];

    skillsToAward.forEach((skill) => {
      const alreadyHas = currentSkills.some((s) => s.toLowerCase() === skill.toLowerCase());
      if (!alreadyHas) {
        currentSkills.push(skill);
        addedSkills.push(skill);
      }
    });

    if (addedSkills.length > 0) {
      resume.skills = currentSkills;
      await resume.save();
    }

    sendSuccess(res, 'Course marked completed! Skills have been added to your profile.', {
      completion,
      addedSkills,
      totalSkills: resume.skills,
    });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to mark audit course completed', null, 500);
  }
};

export const unmarkCourseCompletion = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const studentId = req.user?._id;
    const { courseId } = req.body;

    if (!courseId) {
      sendError(res, 'Course ID is required', null, 400);
      return;
    }

    await CourseCompletion.deleteMany({ student: studentId, courseId });
    sendSuccess(res, 'Course completion removed successfully');
  } catch (error: any) {
    sendError(res, error.message || 'Failed to remove course completion', null, 500);
  }
};
