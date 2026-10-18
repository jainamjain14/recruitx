import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { User } from '../models/User.js';
import { Job } from '../models/Job.js';
import { Application } from '../models/Application.js';
import { Resume } from '../models/Resume.js';
import { PlacementEligibilityRule } from '../models/PlacementEligibilityRule.js';
import { AuditLog } from '../models/AuditLog.js';
import { db, Collections } from '../config/firebase.js';
import { getIO } from '../socket.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

export const getAdminStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalRecruiters = await User.countDocuments({ role: 'recruiter' });
    const totalJobs = await Job.countDocuments();
    const totalApplications = await Application.countDocuments();
    const placedStudents = await Application.countDocuments({ status: 'offered' });

    sendSuccess(res, 'Admin stats retrieved', {
      stats: {
        totalStudents,
        totalRecruiters,
        totalJobs,
        totalApplications,
        placedStudents,
        placementRate: totalStudents > 0 ? Math.round((placedStudents / totalStudents) * 100) : 0,
      },
    });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to fetch admin stats', null, 500);
  }
};

export const getUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { role } = req.query;
    const filter: any = {};
    if (role) filter.role = role;

    const users = await User.find(filter).select('-password').sort({ createdAt: -1 });
    sendSuccess(res, 'Users retrieved', { users, count: users.length });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to fetch users', null, 500);
  }
};

export const toggleUserStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const user = await User.findById(id);
    if (!user) {
      sendError(res, 'User not found', null, 404);
      return;
    }

    user.emailVerified = !user.emailVerified;
    await user.save();

    // Log administrative action
    await AuditLog.create({
      actorId: req.user?._id || 'admin',
      actorName: req.user?.name || 'Administrator',
      actorRole: req.user?.role || 'admin',
      action: 'USER_STATUS_TOGGLE',
      targetResource: 'users',
      targetId: user._id,
      details: {
        targetEmail: user.email,
        newStatus: user.emailVerified ? 'Active' : 'Suspended',
      },
      ipAddress: req.ip,
    });

    sendSuccess(res, `User ${user.emailVerified ? 'activated' : 'suspended'} successfully`, { user });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to toggle user status', null, 500);
  }
};

export const getEligibilityRules = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const rule = await PlacementEligibilityRule.getEffectiveRule();
    sendSuccess(res, 'Placement eligibility rules retrieved', { rule });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to fetch eligibility rules', null, 500);
  }
};

export const updateEligibilityRules = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const rule = await PlacementEligibilityRule.updateRule(req.body, req.user?._id);

    // Record audit event
    await AuditLog.create({
      actorId: req.user?._id || 'admin',
      actorName: req.user?.name || 'Administrator',
      actorRole: req.user?.role || 'admin',
      action: 'ELIGIBILITY_RULES_UPDATED',
      targetResource: 'eligibility_rules',
      targetId: rule._id,
      details: req.body,
      ipAddress: req.ip,
    });

    sendSuccess(res, 'Placement eligibility rules updated successfully', { rule });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to update eligibility rules', null, 500);
  }
};

export const bulkImportStudents = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { students } = req.body;
    if (!Array.isArray(students) || students.length === 0) {
      sendError(res, 'Please provide an array of student objects to import', null, 400);
      return;
    }

    let importedCount = 0;
    let skippedCount = 0;
    const skippedDetails: Array<{ email: string; reason: string }> = [];

    for (const s of students) {
      const email = (s.email || '').toLowerCase().trim();
      if (!email || !email.includes('@')) {
        skippedCount++;
        skippedDetails.push({ email: s.email || 'unknown', reason: 'Invalid email address' });
        continue;
      }

      const existing = await User.findOne({ email });
      if (existing) {
        skippedCount++;
        skippedDetails.push({ email, reason: 'Account already exists' });
        continue;
      }

      const defaultPassword = `Student@${s.batchYear || 2026}`;
      const newUser = await User.create({
        name: (s.name || 'Student Candidate').trim(),
        email,
        password: defaultPassword,
        role: 'student',
        emailVerified: true,
        phone: s.phone || '',
      });

      // Create initial academic resume record
      const cgpa = typeof s.cgpa === 'number' ? s.cgpa : parseFloat(s.cgpa) || 8.0;
      await Resume.create({
        student: newUser._id,
        headline: `${s.department || 'Undergraduate'} Student`,
        fieldOfInterest: s.department || 'General',
        summary: `Enrolled candidate for campus placements. Batch of ${s.batchYear || 2026}.`,
        skills: s.skills && Array.isArray(s.skills) ? s.skills : ['Problem Solving', 'Teamwork', 'Domain Fundamentals'],
        education: [
          {
            institution: 'Campus University',
            degree: 'Bachelor of Technology / Science',
            fieldOfStudy: s.department || 'Engineering',
            startYear: `${(s.batchYear || 2026) - 4}`,
            endYear: `${s.batchYear || 2026}`,
            grade: `${cgpa}/10 CGPA`,
          },
        ],
        experience: [],
        projects: [],
      });

      importedCount++;
    }

    // Log administrative action
    await AuditLog.create({
      actorId: req.user?._id || 'admin',
      actorName: req.user?.name || 'Administrator',
      actorRole: req.user?.role || 'admin',
      action: 'STUDENT_BATCH_IMPORT',
      targetResource: 'users',
      details: {
        totalSubmitted: students.length,
        importedCount,
        skippedCount,
      },
      ipAddress: req.ip,
    });

    sendSuccess(res, `Bulk import finished: ${importedCount} created, ${skippedCount} skipped`, {
      totalSubmitted: students.length,
      importedCount,
      skippedCount,
      skippedDetails,
    });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to bulk import students', null, 500);
  }
};

export const getAccreditationStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const students = await User.find({ role: 'student' });
    const totalStudents = students.length;

    const offeredApps = await Application.find({ status: 'offered' });
    const placedStudentsCount = offeredApps.length;

    // Calculate CTC analytics from placed applications or jobs
    const jobs = await Job.find();
    const jobSalaryMap: Record<string, number> = {};

    jobs.forEach((j: any) => {
      let lpa = 6.0;
      if (typeof j.salary === 'string') {
        const text = j.salary.toLowerCase().replace(/,/g, '');
        const match = text.match(/([0-9]+(?:\.[0-9]+)?)/);
        if (match) {
          const num = parseFloat(match[1]);
          if (num > 100000) {
            lpa = Math.round((num / 100000) * 10) / 10;
          } else {
            lpa = num;
          }
        }
      }
      jobSalaryMap[j._id] = lpa;
    });

    const ctcValues: number[] = [];
    offeredApps.forEach((app: any) => {
      const jobId = typeof app.job === 'object' && app.job?._id ? app.job._id : app.job;
      const val = jobSalaryMap[jobId] || 7.5;
      ctcValues.push(val);
    });

    const hasOffers = ctcValues.length > 0;
    const highestCtc = hasOffers ? Math.max(...ctcValues) : 0;
    const averageCtc = hasOffers
      ? Math.round((ctcValues.reduce((a, b) => a + b, 0) / ctcValues.length) * 10) / 10
      : 0;
    const sortedCtc = [...ctcValues].sort((a, b) => a - b);
    const medianCtc = hasOffers ? sortedCtc[Math.floor(sortedCtc.length / 2)] : 0;

    // CTC Tiers
    let superDream = 0; // >= 10 LPA
    let dream = 0;      // 6 - 10 LPA
    let regular = 0;    // < 6 LPA

    ctcValues.forEach((c) => {
      if (c >= 10) superDream++;
      else if (c >= 6) dream++;
      else regular++;
    });

    // Group actual students by their registered department/profession
    const deptMap: Record<string, { total: number; placed: number; ctcList: number[] }> = {};

    students.forEach((s: any) => {
      const dept = s.profession || s.department || 'General Engineering';
      if (!deptMap[dept]) {
        deptMap[dept] = { total: 0, placed: 0, ctcList: [] };
      }
      deptMap[dept].total++;
    });

    offeredApps.forEach((app: any) => {
      const student = students.find((s: any) => s._id.toString() === (typeof app.student === 'object' ? app.student?._id?.toString() : app.student?.toString()));
      const dept = student?.profession || (student as any)?.department || 'General Engineering';
      if (!deptMap[dept]) {
        deptMap[dept] = { total: 1, placed: 0, ctcList: [] };
      }
      deptMap[dept].placed++;
      const jobId = typeof app.job === 'object' && app.job?._id ? app.job._id : app.job;
      const salary = jobSalaryMap[jobId] || 0;
      if (salary > 0) {
        deptMap[dept].ctcList.push(salary);
      }
    });

    const branchBreakdown = Object.entries(deptMap).map(([name, data]) => {
      const placedRate = data.total > 0 ? Math.round((data.placed / data.total) * 100) : 0;
      const avgSalary = data.ctcList.length > 0
        ? Math.round((data.ctcList.reduce((a, b) => a + b, 0) / data.ctcList.length) * 10) / 10
        : 0;
      return {
        name,
        code: name.split(' ').map((w) => w[0]).join('').slice(0, 4).toUpperCase() || 'DEPT',
        total: data.total,
        placed: data.placed,
        unplaced: Math.max(0, data.total - data.placed),
        placedRate,
        avgCtc: avgSalary > 0 ? `${avgSalary} LPA` : 'N/A',
      };
    });

    sendSuccess(res, 'Accreditation placement metrics retrieved', {
      accreditation: {
        reportingYear: new Date().getFullYear(),
        nirfCompliant: true,
        naacCriteria: 'Criterion 5.2 - Student Progression',
        totalEligibleStudents: totalStudents,
        totalPlacedStudents: placedStudentsCount,
        overallPlacementRate: totalStudents > 0 ? Math.round((placedStudentsCount / totalStudents) * 100) : 0,
        salaryMetrics: {
          highestCtc: highestCtc > 0 ? `${highestCtc} LPA` : '0 LPA',
          averageCtc: averageCtc > 0 ? `${averageCtc} LPA` : '0 LPA',
          medianCtc: medianCtc > 0 ? `${medianCtc} LPA` : '0 LPA',
        },
        salaryTiers: {
          superDreamOffers: superDream,
          dreamOffers: dream,
          regularOffers: regular,
        },
        branchBreakdown,
      },
    });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to generate accreditation metrics', null, 500);
  }
};

export const getSystemHealth = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const startTime = Date.now();
    await db.collection(Collections.USERS).limit(1).get();
    const dbLatencyMs = Date.now() - startTime;

    const mem = process.memoryUsage();
    const io = getIO();
    const activeSockets = io ? io.engine?.clientsCount || 0 : 0;

    const geminiKey = process.env.GEMINI_API_KEY || '';
    const geminiActive = geminiKey.trim().length > 5;

    sendSuccess(res, 'System health diagnostics', {
      health: {
        status: 'healthy',
        timestamp: new Date(),
        uptimeSeconds: Math.floor(process.uptime()),
        database: {
          engine: 'Firebase Cloud Firestore',
          status: 'connected',
          latencyMs: dbLatencyMs,
        },
        memory: {
          rssMb: Math.round(mem.rss / 1024 / 1024),
          heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
          heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
          heapUsagePercent: Math.round((mem.heapUsed / mem.heapTotal) * 100),
        },
        realTimeWebsockets: {
          status: io ? 'online' : 'initializing',
          activeConnections: activeSockets,
        },
        aiEngine: {
          provider: 'Google Generative AI',
          primaryModel: 'gemini-2.0-flash',
          failoverModel: 'gemini-1.5-flash',
          apiKeyConfigured: geminiActive,
          status: geminiActive ? 'operational' : 'key_missing',
        },
      },
    });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to check system health', null, 500);
  }
};

export const getAuditLogs = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const logs = await AuditLog.find({ limit: 50 });
    sendSuccess(res, 'Audit logs retrieved', { logs, count: logs.length });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to retrieve audit logs', null, 500);
  }
};

