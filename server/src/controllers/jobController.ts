import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { Job } from '../models/Job.js';
import { Resume } from '../models/Resume.js';
import { User } from '../models/User.js';
import { LinkedInService } from '../services/linkedinService.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

export const createJob = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'recruiter') {
      sendError(res, 'Only recruiters can post jobs', null, 403);
      return;
    }

    const { title, company, location, jobType, workMode, salary, description, requirements, skillsRequired, experienceLevel } = req.body;

    const job = await Job.create({
      recruiter: req.user._id,
      title,
      company: company || req.user.name,
      location,
      jobType,
      workMode,
      salary,
      description,
      requirements: Array.isArray(requirements) ? requirements : (requirements ? requirements.split(',').map((s: string) => s.trim()) : []),
      skillsRequired: Array.isArray(skillsRequired) ? skillsRequired : (skillsRequired ? skillsRequired.split(',').map((s: string) => s.trim()) : []),
      experienceLevel,
      status: 'active',
    });

    sendSuccess(res, 'Job posted successfully', { job }, 201);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to create job', null, 500);
  }
};

export const getJobs = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { search, location, jobType, workMode, status } = req.query;
    const filter: any = {};

    if (req.user?.role === 'recruiter') {
      filter.recruiter = req.user._id;
    } else if (req.user?.role === 'student') {
      filter.status = 'active';
    }

    if (status && req.user?.role !== 'student') {
      filter.status = status;
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    if (location) filter.location = { $regex: location, $options: 'i' };
    if (jobType) filter.jobType = jobType;
    if (workMode) filter.workMode = workMode;

    const jobs = await Job.find(filter).sort({ createdAt: -1 }).populate('recruiter', 'name email');
    sendSuccess(res, 'Jobs retrieved successfully', { jobs, count: jobs.length });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to fetch jobs', null, 500);
  }
};

export const getJobById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const job = await Job.findById(req.params.id).populate('recruiter', 'name email');
    if (!job) {
      sendError(res, 'Job not found', null, 404);
      return;
    }
    sendSuccess(res, 'Job details retrieved', { job });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to fetch job', null, 500);
  }
};

// 100% Real-Time Live LinkedIn Vacant Jobs sorted by Proximity Location & Skill Gap Breakdown
export const getCompanyJobMatches = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const studentId = req.user?._id;
    const resume = await Resume.findOne({ student: studentId });

    const { userLat, userLng } = req.query;
    const lat = userLat ? Number(userLat) : 19.1351;
    const lng = userLng ? Number(userLng) : 72.8290;

    const targetDomain = resume?.fieldOfInterest || resume?.headline || 'Marketing & Growth Management';
    const userSkills = (resume?.skills || []).map((s) => s.toLowerCase());

    // 1. Fetch Live LinkedIn Jobs sorted by distance from candidate location
    const liveLinkedInJobs = await LinkedInService.fetchLiveJobs(targetDomain, lat, lng);

    // 2. Compute Per-Company Skill Gap Breakdown for each LinkedIn Job
    const formattedCompanies = liveLinkedInJobs.map((j) => {
      const matchedSkills = j.requiredSkills.filter((reqSkill) =>
        userSkills.some((u) => u.includes(reqSkill.toLowerCase()) || reqSkill.toLowerCase().includes(u))
      );
      const missingSkills = j.requiredSkills.filter((reqSkill) =>
        !userSkills.some((u) => u.includes(reqSkill.toLowerCase()) || reqSkill.toLowerCase().includes(u))
      );
      const matchPercentage = j.requiredSkills.length > 0
        ? Math.round((matchedSkills.length / j.requiredSkills.length) * 100)
        : 80;

      return {
        ...j,
        matchedSkills,
        missingSkills,
        matchPercentage,
      };
    });

    sendSuccess(res, 'Live LinkedIn vacant jobs fetched with proximity location sorting', {
      targetDomain,
      totalVacantJobs: formattedCompanies.length,
      userLocation: { lat, lng },
      companies: formattedCompanies,
    });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to fetch live LinkedIn job matches', null, 500);
  }
};

export const updateJob = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      sendError(res, 'Job not found', null, 404);
      return;
    }

    const recruiterId = (job.recruiter?._id || job.recruiter)?.toString();
    if (req.user?.role !== 'admin' && recruiterId !== req.user?._id.toString()) {
      sendError(res, 'Not authorized to edit this job', null, 403);
      return;
    }

    Object.assign(job, req.body);
    await job.save();
    sendSuccess(res, 'Job updated successfully', { job });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to update job', null, 500);
  }
};

export const deleteJob = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      sendError(res, 'Job not found', null, 404);
      return;
    }

    const recruiterId = (job.recruiter?._id || job.recruiter)?.toString();
    if (req.user?.role !== 'admin' && recruiterId !== req.user?._id.toString()) {
      sendError(res, 'Not authorized to delete this job', null, 403);
      return;
    }

    await job.deleteOne();
    sendSuccess(res, 'Job deleted successfully');
  } catch (error: any) {
    sendError(res, error.message || 'Failed to delete job', null, 500);
  }
};

export const getCandidates = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || (req.user.role !== 'recruiter' && req.user.role !== 'admin')) {
      sendError(res, 'Access denied', null, 403);
      return;
    }

    const students = await User.find({ role: 'student' });
    const resumes = await Resume.find();
    const resumeMap = new Map<string, any>();
    resumes.forEach((r) => {
      const sId = typeof r.student === 'object' && r.student?._id ? r.student._id.toString() : r.student?.toString();
      if (sId) resumeMap.set(sId, r);
    });

    const candidates = students.map((s) => {
      const r = resumeMap.get(s._id.toString());
      return {
        _id: s._id,
        name: s.name,
        email: s.email,
        phone: s.phone || '',
        headline: r?.headline || 'Placement Candidate',
        fieldOfInterest: r?.fieldOfInterest || 'General',
        skills: r?.skills && r.skills.length > 0 ? r.skills : ['Communication', 'Creative Direction'],
        summary: r?.summary || '',
        education: r?.education || [],
        createdAt: s.createdAt,
      };
    });

    sendSuccess(res, 'Candidates retrieved successfully', { candidates, count: candidates.length });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to fetch candidates', null, 500);
  }
};

