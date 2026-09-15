import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { api } from '../services/api';
import { ChevronRight, Users, Building2, Briefcase, Award, ShieldCheck, ArrowRight } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalStudents: 0,
    totalRecruiters: 0,
    totalJobs: 0,
    totalApplications: 0,
    placedStudents: 0,
    placementRate: 0,
  });
  const [students, setStudents] = useState<any[]>([]);
  const [recruiters, setRecruiters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      const [statsRes, studentsRes, recruitersRes] = await Promise.allSettled([
        api.get('/admin/stats'),
        api.get('/admin/users?role=student'),
        api.get('/admin/users?role=recruiter'),
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value.data?.data?.stats) {
        setStats(statsRes.value.data.data.stats);
      }

      if (studentsRes.status === 'fulfilled' && studentsRes.value.data?.data?.users) {
        setStudents(studentsRes.value.data.data.users);
      }

      if (recruitersRes.status === 'fulfilled' && recruitersRes.value.data?.data?.users) {
        setRecruiters(recruitersRes.value.data.data.users);
      }
    } catch (err) {
      console.error('Failed to load admin dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    { label: 'Manage Recruiters & Approvals', path: '/admin/recruiters' },
    { label: 'Review All Campus Applications', path: '/admin/applications' },
    { label: 'Student Directory & Access', path: '/admin/students' },
    { label: 'Platform Job Postings Monitor', path: '/admin/jobs' },
    { label: 'Placement Reports & Exports', path: '/admin/reports' },
    { label: 'System Configuration', path: '/admin/settings' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-neutral-900">Admin Control Center</h1>
        <p className="text-sm text-neutral-500 mt-0.5">Global oversight of students, recruiters, jobs, and placements.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-2xl font-bold text-neutral-900">{stats.totalStudents}</p>
          <p className="text-xs text-neutral-500 mt-1">Registered Students</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-neutral-900">{stats.totalRecruiters}</p>
          <p className="text-xs text-neutral-500 mt-1">Active Recruiters</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-neutral-900">{stats.totalJobs}</p>
          <p className="text-xs text-neutral-500 mt-1">Platform Job Openings</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-neutral-900">{stats.placedStudents}</p>
          <p className="text-xs text-neutral-500 mt-1">Offers Extended ({stats.placementRate}% Rate)</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Students */}
          <Card className="p-0 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
              <h2 className="text-sm font-semibold text-neutral-900">Recent Registered Students</h2>
              <button
                onClick={() => navigate('/admin/students')}
                className="text-xs text-neutral-500 hover:text-neutral-800 flex items-center gap-1"
              >
                View all ({students.length}) <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            {students.length === 0 ? (
              <div className="p-6 text-center text-xs text-neutral-500">No students registered yet.</div>
            ) : (
              <div className="divide-y divide-neutral-50">
                {students.slice(0, 4).map((s) => (
                  <div key={s._id} className="flex items-center justify-between px-5 py-3.5">
                    <div>
                      <p className="text-xs font-semibold text-neutral-900">{s.name}</p>
                      <p className="text-[11px] text-neutral-400 mt-0.5">{s.email}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${s.emailVerified ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                      {s.emailVerified ? 'Active' : 'Suspended'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Recruiters */}
          <Card className="p-0 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
              <h2 className="text-sm font-semibold text-neutral-900">Registered Recruiters & Companies</h2>
              <button
                onClick={() => navigate('/admin/recruiters')}
                className="text-xs text-neutral-500 hover:text-neutral-800 flex items-center gap-1"
              >
                View all ({recruiters.length}) <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            {recruiters.length === 0 ? (
              <div className="p-6 text-center text-xs text-neutral-500">No recruiters registered yet.</div>
            ) : (
              <div className="divide-y divide-neutral-50">
                {recruiters.slice(0, 4).map((r) => (
                  <div key={r._id} className="flex items-center justify-between px-5 py-3.5">
                    <div>
                      <p className="text-xs font-semibold text-neutral-900">{r.name}</p>
                      <p className="text-[11px] text-neutral-400 mt-0.5">{r.company || 'Direct Recruiter'} • {r.email}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${r.emailVerified ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                      {r.emailVerified ? 'Verified' : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Quick Actions */}
        <div className="space-y-4">
          <Card>
            <h2 className="text-sm font-semibold text-neutral-900 mb-3">Administrative Actions</h2>
            <div className="space-y-2">
              {quickActions.map((action, i) => (
                <button
                  key={i}
                  onClick={() => navigate(action.path)}
                  className="w-full text-left text-xs text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50 px-3 py-2.5 rounded-md border border-neutral-200 transition-colors flex items-center justify-between"
                >
                  <span>{action.label}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-neutral-400" />
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-4 bg-neutral-900 text-white space-y-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold">Cloud Database Active</span>
            </div>
            <p className="text-[11px] text-neutral-400">
              Firebase Cloud Firestore database synchronized across student and recruiter collections.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};
