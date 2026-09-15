import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { User } from '../models/User.js';
import { Job } from '../models/Job.js';
import { Application } from '../models/Application.js';
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
    const user = await User.findById(req.params.id);
    if (!user) {
      sendError(res, 'User not found', null, 404);
      return;
    }

    user.emailVerified = !user.emailVerified;
    await user.save();
    sendSuccess(res, `User ${user.emailVerified ? 'activated' : 'deactivated'} successfully`, { user });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to toggle user status', null, 500);
  }
};
