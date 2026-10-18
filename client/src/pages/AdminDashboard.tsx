import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { api } from '../services/api';
import {
  ChevronRight,
  Users,
  Building2,
  Briefcase,
  Award,
  ShieldCheck,
  ArrowRight,
  Activity,
  Cpu,
  Radio,
  Sparkles,
  History,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

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
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshingHealth, setRefreshingHealth] = useState(false);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      const [statsRes, studentsRes, recruitersRes, healthRes, logsRes] = await Promise.allSettled([
        api.get('/admin/stats'),
        api.get('/admin/users?role=student'),
        api.get('/admin/users?role=recruiter'),
        api.get('/admin/health'),
        api.get('/admin/audit-logs'),
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

      if (healthRes.status === 'fulfilled' && healthRes.value.data?.data?.health) {
        setSystemHealth(healthRes.value.data.data.health);
      }

      if (logsRes.status === 'fulfilled' && logsRes.value.data?.data?.logs) {
        setAuditLogs(logsRes.value.data.data.logs);
      }
    } catch (err) {
      console.error('Failed to load admin dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshHealth = async () => {
    setRefreshingHealth(true);
    try {
      const res = await api.get('/admin/health');
      if (res.data?.data?.health) {
        setSystemHealth(res.data.data.health);
      }
    } catch (err) {
      console.error('Failed to refresh health:', err);
    } finally {
      setRefreshingHealth(false);
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

      {/* Live System Health Monitor */}
      {systemHealth && (
        <Card className="p-4 border-neutral-200 bg-neutral-50/70 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-200/80 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <h2 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">Live System Health & Infrastructure</h2>
              <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-emerald-100 text-emerald-800">
                All Systems Operational
              </span>
            </div>
            <button
              onClick={refreshHealth}
              disabled={refreshingHealth}
              className="text-xs text-neutral-600 hover:text-neutral-900 flex items-center gap-1.5 font-medium self-start sm:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshingHealth ? 'animate-spin text-neutral-900' : ''}`} />
              <span>{refreshingHealth ? 'Pinging...' : 'Refresh Diagnostics'}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {/* Database */}
            <div className="p-2.5 rounded-md bg-white border border-neutral-200 space-y-1">
              <div className="flex items-center justify-between text-[11px] text-neutral-500">
                <span className="font-semibold flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Database</span>
                <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">{systemHealth.database.latencyMs}ms</span>
              </div>
              <p className="font-bold text-neutral-800 text-xs truncate">{systemHealth.database.engine}</p>
              <p className="text-[10px] text-neutral-400 capitalize">Status: {systemHealth.database.status}</p>
            </div>

            {/* Memory */}
            <div className="p-2.5 rounded-md bg-white border border-neutral-200 space-y-1">
              <div className="flex items-center justify-between text-[11px] text-neutral-500">
                <span className="font-semibold flex items-center gap-1"><Cpu className="w-3.5 h-3.5 text-blue-600" /> Node Heap</span>
                <span className="text-[10px] font-mono text-neutral-600">{systemHealth.memory.heapUsagePercent}%</span>
              </div>
              <div className="w-full bg-neutral-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-blue-600 h-1.5 rounded-full"
                  style={{ width: `${Math.min(100, systemHealth.memory.heapUsagePercent)}%` }}
                ></div>
              </div>
              <p className="text-[10px] text-neutral-500">{systemHealth.memory.heapUsedMb} MB / {systemHealth.memory.heapTotalMb} MB</p>
            </div>

            {/* Sockets */}
            <div className="p-2.5 rounded-md bg-white border border-neutral-200 space-y-1">
              <div className="flex items-center justify-between text-[11px] text-neutral-500">
                <span className="font-semibold flex items-center gap-1"><Radio className="w-3.5 h-3.5 text-purple-600" /> WebSockets</span>
                <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">{systemHealth.realTimeWebsockets.status}</span>
              </div>
              <p className="font-bold text-neutral-800 text-xs">{systemHealth.realTimeWebsockets.activeConnections} Active Clients</p>
              <p className="text-[10px] text-neutral-400">Push notification pipeline</p>
            </div>

            {/* Gemini AI */}
            <div className="p-2.5 rounded-md bg-white border border-neutral-200 space-y-1">
              <div className="flex items-center justify-between text-[11px] text-neutral-500">
                <span className="font-semibold flex items-center gap-1"><Sparkles className="w-3.5 h-3.5 text-amber-600" /> AI Engine</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${systemHealth.aiEngine.apiKeyConfigured ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                  {systemHealth.aiEngine.apiKeyConfigured ? 'Connected' : 'Missing Key'}
                </span>
              </div>
              <p className="font-bold text-neutral-800 text-xs truncate">{systemHealth.aiEngine.primaryModel}</p>
              <p className="text-[10px] text-neutral-400 truncate">Failover: {systemHealth.aiEngine.failoverModel}</p>
            </div>
          </div>
        </Card>
      )}

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
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${s.isSuspended ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                      {s.isSuspended ? 'Suspended' : 'Active'}
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
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${r.isSuspended ? 'bg-red-50 text-red-700 border-red-200' : r.emailVerified ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                      {r.isSuspended ? 'Suspended' : r.emailVerified ? 'Verified' : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Platform Audit Trail */}
          <Card className="p-0 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 bg-neutral-50/50">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-neutral-600" />
                <h2 className="text-sm font-semibold text-neutral-900">Platform Security & Audit Trail</h2>
              </div>
              <span className="text-[10px] text-neutral-400 font-mono">Real-time log stream</span>
            </div>
            {auditLogs.length === 0 ? (
              <div className="p-6 text-center text-xs text-neutral-500">
                No administrative actions logged yet. Operations such as user suspension, bulk imports, and policy adjustments will stream here.
              </div>
            ) : (
              <div className="divide-y divide-neutral-100 max-h-64 overflow-y-auto">
                {auditLogs.slice(0, 6).map((log: any) => (
                  <div key={log._id} className="p-3.5 flex items-start justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-800 border border-neutral-200">
                          {log.action}
                        </span>
                        <span className="text-neutral-500 text-[11px]">by <strong className="text-neutral-700">{log.actorName}</strong></span>
                      </div>
                      <p className="text-[11px] text-neutral-600 mt-1">
                        Resource: <span className="font-mono">{log.targetResource}</span>
                        {log.details?.targetEmail && ` (${log.details.targetEmail})`}
                        {log.details?.importedCount !== undefined && ` (Imported: ${log.details.importedCount}, Skipped: ${log.details.skippedCount})`}
                      </p>
                    </div>
                    <span className="text-[10px] text-neutral-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
              <span className="text-xs font-bold">Institutional Placement Engine</span>
            </div>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              RecruitX enterprise governance enforces drive eligibility rules, accreditation compliance (NIRF/NAAC), and student onboarding.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};
