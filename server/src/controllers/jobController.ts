import { UniversalJobMatchingService } from '../services/universalJobMatchingService.js';
import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { Job } from '../models/Job.js';
import { Resume } from '../models/Resume.js';
import { User } from '../models/User.js';
import { Application } from '../models/Application.js';
import { Notification } from '../models/Notification.js';
import { PlacementEligibilityRule } from '../models/PlacementEligibilityRule.js';
import { emitToUser } from '../socket.js';
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
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const job = await Job.findById(id).populate('recruiter', 'name email');
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
    const [resume, studentUser, recruiterJobs] = await Promise.all([
      Resume.findOne({ student: studentId }),
      studentId ? User.findById(studentId.toString()) : Promise.resolve(null),
      Job.find({ status: 'active' }).populate('recruiter', 'name email company'),
    ]);

    const { userLat, userLng } = req.query;
    const lat = userLat !== undefined && userLat !== '' && !isNaN(Number(userLat)) ? Number(userLat) : undefined;
    const lng = userLng !== undefined && userLng !== '' && !isNaN(Number(userLng)) ? Number(userLng) : undefined;

    const candidateData = {
      studentId: studentId?.toString(),
      headline: resume?.headline || studentUser?.title || '',
      fieldOfInterest: resume?.fieldOfInterest || studentUser?.profession || '',
      summary: resume?.summary || '',
      skills: resume?.skills || [],
      experience: resume?.experience || [],
      education: resume?.education || [],
    };

    // 1. Analyze candidate profile dynamically
    const candidateIdentity = await UniversalJobMatchingService.analyzeCandidateProfile(candidateData);
    const searchKeyword = candidateIdentity.primaryProfession || candidateIdentity.functionalDiscipline || 'Specialist';

    // 2. Fetch live opportunities using the candidate's actual profession
    const liveLinkedInJobs = await LinkedInService.fetchLiveJobs(searchKeyword, lat, lng);

    // 3. Format recruiter jobs on the platform
    const formattedPlatformJobs = recruiterJobs.map((j) => ({
      _id: j._id,
      id: j._id,
      company: j.company,
      logo: `https://logo.clearbit.com/${j.company.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
      title: j.title,
      description: j.description || '',
      location: j.location,
      workMode: j.workMode,
      salary: j.salary,
      posted: 'Posted by Platform Verified Recruiter',
      jobUrl: `/student/jobs`,
      requiredSkills: Array.isArray(j.skillsRequired) && j.skillsRequired.length > 0 ? j.skillsRequired : (j.requirements || []),
      skillsRequired: Array.isArray(j.skillsRequired) ? j.skillsRequired : [],
      requirements: Array.isArray(j.requirements) ? j.requirements : [],
      lat: 19.0760,
      lng: 72.8777,
      isPlatformJob: true,
      recruiterId: (j.recruiter as any)?._id || j.recruiter,
      hrEmail: (j.recruiter as any)?.email || '',
    }));

    const allCandidateJobs = [...formattedPlatformJobs, ...liveLinkedInJobs];

    // 4. Match and rank opportunities using the Universal Job Matching Engine
    const { matchedJobs, candidateIdentity: analyzedIdentity } = await UniversalJobMatchingService.matchJobsForCandidate(
      candidateData,
      allCandidateJobs,
      lat,
      lng
    );

    sendSuccess(res, 'Universal jobs matching candidate profession retrieved', {
      targetDomain: analyzedIdentity.primaryProfession || analyzedIdentity.functionalDiscipline,
      functionalDiscipline: analyzedIdentity.functionalDiscipline,
      primaryProfession: analyzedIdentity.primaryProfession,
      totalVacantJobs: matchedJobs.length,
      userLocation: (lat !== undefined && lng !== undefined) ? { lat, lng } : null,
      companies: matchedJobs,
    });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to fetch universal job matches', null, 500);
  }
};

export const updateJob = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const job = await Job.findById(id);
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
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const job = await Job.findById(id);
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

/**
 * Automatic Job Application Engine (With User Permission)
 * Evaluates active postings and automated company matches against candidate's skills.
 * Submits applications for matching jobs above the chosen threshold with user consent.
 */
export const autoApplyJobs = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'student') {
      sendError(res, 'Only students can trigger automated job applications', null, 403);
      return;
    }

    const { consentGranted, minMatchScore = 70, maxApplications = 5 } = req.body;
    if (!consentGranted) {
      sendError(
        res,
        'Explicit user permission is legally required before RecruitX can submit applications on your behalf.',
        null,
        400
      );
      return;
    }

    const studentId = req.user._id;
    const resume = await Resume.findOne({ student: studentId });
    if (!resume || !resume.skills || resume.skills.length === 0) {
      sendError(
        res,
        'Please build your profile and add technical skills to your resume before running automated job matching.',
        null,
        400
      );
      return;
    }

    // Check campus drive eligibility if active
    const rule = await PlacementEligibilityRule.getEffectiveRule();
    if (rule.isActive && rule.oneJobPolicy) {
      const activeOffer = await Application.findOne({ student: studentId, status: 'offered' });
      if (activeOffer) {
        sendError(
          res,
          `Campus Drive Policy: "One Student One Job" is active. You already hold a confirmed offer with ${activeOffer.companyName}.`,
          null,
          400
        );
        return;
      }
    }

    // Find all jobs candidate has already applied to
    const existingApps = await Application.find({ student: studentId });
    const appliedJobIds = new Set(existingApps.map((a) => (a.job ? a.job.toString() : '')));
    const appliedCompanyNames = new Set(existingApps.map((a) => (a.companyName || '').toLowerCase()));

    // 1. Analyze candidate profile dynamically
    const candidateData = {
      studentId: studentId?.toString(),
      headline: resume?.headline || req.user.title || '',
      fieldOfInterest: resume?.fieldOfInterest || req.user.profession || '',
      summary: resume?.summary || '',
      skills: resume?.skills || [],
      experience: resume?.experience || [],
      education: resume?.education || [],
    };
    const candidateIdentity = await UniversalJobMatchingService.analyzeCandidateProfile(candidateData);

    // 2. Evaluate Platform Database Jobs
    const activeDbJobs = await Job.find({ status: 'active' });
    const matchedToApply: {
      jobId?: string;
      title: string;
      company: string;
      recruiter?: any;
      matchScore: number;
      matchedSkills: string[];
      matchReason: string;
    }[] = [];

    for (const j of activeDbJobs) {
      if (appliedJobIds.has(j._id.toString())) continue;
      const jobProfile = await UniversalJobMatchingService.analyzeJobOpportunity({
        id: j._id.toString(),
        title: j.title,
        company: j.company,
        description: j.description,
        requirements: j.requirements || [],
        skillsRequired: j.skillsRequired || [],
      });

      const comp = await UniversalJobMatchingService.evaluateCompatibility(candidateIdentity, jobProfile);
      if (comp.isCompatible && comp.compatibilityScore >= minMatchScore) {
        matchedToApply.push({
          jobId: j._id.toString(),
          title: j.title,
          company: j.company,
          recruiter: j.recruiter,
          matchScore: comp.compatibilityScore,
          matchedSkills: comp.matchedSkills,
          matchReason: comp.matchReason,
        });
      }
    }

    // 3. Also check verified company partner matches if DB has few active listings
    if (matchedToApply.length < maxApplications) {
      const searchKeyword = candidateIdentity.primaryProfession || candidateIdentity.functionalDiscipline;
      const companyMatches = await LinkedInService.fetchLiveJobs(searchKeyword);

      for (const cm of companyMatches) {
        if (appliedCompanyNames.has((cm.company || '').toLowerCase())) continue;
        const jobProfile = await UniversalJobMatchingService.analyzeJobOpportunity({
          title: cm.title,
          company: cm.company,
          requirements: cm.requiredSkills || [],
        });

        const comp = await UniversalJobMatchingService.evaluateCompatibility(candidateIdentity, jobProfile);
        if (comp.isCompatible && comp.compatibilityScore >= minMatchScore) {
          matchedToApply.push({
            title: cm.title,
            company: cm.company,
            matchScore: comp.compatibilityScore,
            matchedSkills: comp.matchedSkills,
            matchReason: comp.matchReason,
          });
        }
      }
    }

    const toProcess = matchedToApply.slice(0, maxApplications);
    if (toProcess.length === 0) {
      sendSuccess(res, 'Auto-apply scan complete. No new unapplied jobs met your minimum match threshold.', {
        appliedCount: 0,
        applications: [],
      });
      return;
    }

    const createdApplications: any[] = [];
    const recruiters = await User.find({ role: 'recruiter' });

    for (const item of toProcess) {
      let recId = item.recruiter || null;
      if (!recId && item.company) {
        const matched = recruiters.find(
          (r) => r.company && r.company.toLowerCase().trim() === item.company.toLowerCase().trim()
        );
        if (matched) recId = matched._id;
      }

      const app = await Application.create({
        job: item.jobId || undefined,
        student: studentId,
        recruiter: recId,
        companyName: item.company,
        jobTitle: item.title,
        coverLetter: `Automated application submitted via RecruitX Universal Career Engine. ${item.matchReason} (Compatibility Match: ${item.matchScore}%).`,
        resumeUrl: resume.resumeUrl || '',
        status: 'applied',
        statusHistory: [{ status: 'applied', note: `Automated compatibility matching (${item.matchScore}%)` }],
      });

      createdApplications.push(app);

      // Create in-app notification for the student
      await Notification.create({
        recipient: studentId,
        title: `Auto-Applied: ${item.title}`,
        message: `Your profile was automatically submitted to ${item.company} with a ${item.matchScore}% compatibility score.`,
        type: 'application_update',
        priority: 'high',
        format: 'toast',
      });

      // Notify recruiter if present
      if (recId && recId.toString() !== studentId.toString()) {
        await Notification.create({
          recipient: recId,
          title: `New Candidate Application: ${item.title}`,
          message: `${req.user.name} was auto-matched and applied with a ${item.matchScore}% compatibility score.`,
          type: 'application_update',
          priority: 'normal',
          format: 'toast',
        });
        emitToUser(recId.toString(), 'notification:new', {
          title: `New Candidate Application: ${item.title}`,
          message: `${req.user.name} applied with a ${item.matchScore}% match.`,
        });
      }
    }

    emitToUser(studentId.toString(), 'notification:new', {
      title: 'Automated Job Applications Dispatched!',
      message: `Successfully submitted ${createdApplications.length} matching applications.`,
    });

    sendSuccess(res, `Successfully auto-applied to ${createdApplications.length} matching jobs!`, {
      appliedCount: createdApplications.length,
      applications: createdApplications,
    });
  } catch (error: any) {
    sendError(res, error.message || 'Auto-apply execution failed', null, 500);
  }
};
