import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage';
import { ResetPasswordPage } from '../pages/ResetPasswordPage';
import { TermsPage } from '../pages/TermsPage';
import { PrivacyPage } from '../pages/PrivacyPage';

// Student Pages
import { StudentDashboard } from '../pages/StudentDashboard';
import { StudentResume } from '../pages/StudentResume';
import { StudentRoadmap } from '../pages/StudentRoadmap';
import { StudentJobs } from '../pages/StudentJobs';
import { StudentApplications } from '../pages/StudentApplications';
import { StudentMessages } from '../pages/StudentMessages';
import { StudentNotifications } from '../pages/StudentNotifications';
import { StudentSettings } from '../pages/StudentSettings';

// Recruiter Pages
import { RecruiterDashboard } from '../pages/RecruiterDashboard';
import { RecruiterPostJob } from '../pages/RecruiterPostJob';
import { RecruiterJobs } from '../pages/RecruiterJobs';
import { RecruiterApplications } from '../pages/RecruiterApplications';
import { RecruiterCandidates } from '../pages/RecruiterCandidates';
import { RecruiterInterviews } from '../pages/RecruiterInterviews';
import { RecruiterMessages } from '../pages/RecruiterMessages';
import { RecruiterCompany } from '../pages/RecruiterCompany';
import { RecruiterNotifications } from '../pages/RecruiterNotifications';
import { RecruiterSettings } from '../pages/RecruiterSettings';

// Admin Pages
import { AdminDashboard } from '../pages/AdminDashboard';
import { AdminStudents } from '../pages/AdminStudents';
import { AdminRecruiters } from '../pages/AdminRecruiters';
import { AdminJobs } from '../pages/AdminJobs';
import { AdminApplications } from '../pages/AdminApplications';
import { AdminPlacements } from '../pages/AdminPlacements';
import { AdminReports } from '../pages/AdminReports';
import { AdminNotifications } from '../pages/AdminNotifications';
import { AdminSettings } from '../pages/AdminSettings';

import { NotFoundPage } from '../pages/NotFoundPage';
import { PublicRoute } from './PublicRoute';
import { ProtectedRoute } from './ProtectedRoute';
import { RoleRoute } from './RoleRoute';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Root Route: Redirects via PublicRoute logic */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Public Unauthenticated Routes */}
      <Route element={<PublicRoute />}>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>
      </Route>

      {/* Accessible Public Policy Pages */}
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />

      {/* Protected Multi-Role Routes wrapped in DashboardLayout */}
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          {/* Student Routes */}
          <Route element={<RoleRoute allowedRoles={['student']} />}>
            <Route path="/student" element={<StudentDashboard />} />
            <Route path="/student/resume" element={<StudentResume />} />
            <Route path="/student/skill-gap" element={<Navigate to="/student/roadmap" replace />} />
            <Route path="/student/roadmap" element={<StudentRoadmap />} />
            <Route path="/student/jobs" element={<StudentJobs />} />
            <Route path="/student/applications" element={<StudentApplications />} />
            <Route path="/student/messages" element={<StudentMessages />} />
            <Route path="/student/mock-interview" element={<Navigate to="/student/messages" replace />} />
            <Route path="/student/coding-assessment" element={<Navigate to="/student/roadmap" replace />} />
            <Route path="/student/notifications" element={<StudentNotifications />} />
            <Route path="/student/settings" element={<StudentSettings />} />
          </Route>

          {/* Recruiter Routes */}
          <Route element={<RoleRoute allowedRoles={['recruiter']} />}>
            <Route path="/recruiter" element={<RecruiterDashboard />} />
            <Route path="/recruiter/post-job" element={<RecruiterPostJob />} />
            <Route path="/recruiter/jobs" element={<RecruiterJobs />} />
            <Route path="/recruiter/applications" element={<RecruiterApplications />} />
            <Route path="/recruiter/candidates" element={<RecruiterCandidates />} />
            <Route path="/recruiter/interviews" element={<RecruiterInterviews />} />
            <Route path="/recruiter/messages" element={<RecruiterMessages />} />
            <Route path="/recruiter/company" element={<RecruiterCompany />} />
            <Route path="/recruiter/notifications" element={<RecruiterNotifications />} />
            <Route path="/recruiter/settings" element={<RecruiterSettings />} />
          </Route>

          {/* Admin Routes */}
          <Route element={<RoleRoute allowedRoles={['admin']} />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/students" element={<AdminStudents />} />
            <Route path="/admin/recruiters" element={<AdminRecruiters />} />
            <Route path="/admin/jobs" element={<AdminJobs />} />
            <Route path="/admin/applications" element={<AdminApplications />} />
            <Route path="/admin/placements" element={<AdminPlacements />} />
            <Route path="/admin/reports" element={<AdminReports />} />
            <Route path="/admin/notifications" element={<AdminNotifications />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
          </Route>
        </Route>
      </Route>

      {/* 404 Catch-All */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};
