import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { api } from '../services/api';
import { Award, TrendingUp, Users, DollarSign, Building2, CheckCircle2 } from 'lucide-react';

export const AdminPlacements: React.FC = () => {
  const [stats, setStats] = useState({
    totalStudents: 0,
    placedStudents: 0,
    placementRate: 0,
    totalApplications: 0,
  });
  const [placedApplications, setPlacedApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [accreditation, setAccreditation] = useState<any>(null);

  useEffect(() => {
    fetchPlacementData();
  }, []);

  const fetchPlacementData = async () => {
    try {
      const [statsRes, appsRes, accRes] = await Promise.allSettled([
        api.get('/admin/stats'),
        api.get('/applications'),
        api.get('/admin/accreditation-stats'),
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value.data?.data?.stats) {
        setStats(statsRes.value.data.data.stats);
      }

      if (appsRes.status === 'fulfilled' && appsRes.value.data?.data?.applications) {
        const placed = appsRes.value.data.data.applications.filter((a: any) => a.status === 'offered');
        setPlacedApplications(placed);
      }

      if (accRes.status === 'fulfilled' && accRes.value.data?.data?.accreditation) {
        setAccreditation(accRes.value.data.data.accreditation);
      }
    } catch (err) {
      console.error('Failed to load placement metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-neutral-200 pb-4">
        <h1 className="text-xl font-bold text-neutral-900">Placement Statistics & Drive Metrics</h1>
        <p className="text-xs text-neutral-500">Live verified metrics calculated from student applications and recruiter job offers.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Total Placed / Offered</p>
          <p className="text-2xl font-bold text-neutral-900">{stats.placedStudents}</p>
        </Card>
        <Card className="p-4 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Placement Rate</p>
          <p className="text-2xl font-bold text-emerald-700">{stats.placementRate}%</p>
        </Card>
        <Card className="p-4 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Total Applications</p>
          <p className="text-2xl font-bold text-neutral-900">{stats.totalApplications}</p>
        </Card>
        <Card className="p-4 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Eligible Candidates</p>
          <p className="text-2xl font-bold text-neutral-900">{stats.totalStudents}</p>
        </Card>
      </div>

      {/* Salary & CTC Metrics — live metrics calculated from actual student placement offers */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-neutral-900 text-white space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Highest CTC Offered</span>
          <p className="text-2xl font-black">
            {stats.placedStudents > 0 && accreditation?.salaryMetrics?.highestCtc ? accreditation.salaryMetrics.highestCtc : '—'}
          </p>
          <p className="text-[10px] text-neutral-400">
            {stats.placedStudents > 0 ? 'Super Dream Tier Placement' : 'Calculated once offers are recorded'}
          </p>
        </Card>
        <Card className="p-4 bg-neutral-900 text-white space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Average Drive Package</span>
          <p className="text-2xl font-black">
            {stats.placedStudents > 0 && accreditation?.salaryMetrics?.averageCtc ? accreditation.salaryMetrics.averageCtc : '—'}
          </p>
          <p className="text-[10px] text-neutral-400">
            {stats.placedStudents > 0 ? 'Across all verified academic departments' : 'Calculated across placed students'}
          </p>
        </Card>
        <Card className="p-4 bg-neutral-900 text-white space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Median Batch Package</span>
          <p className="text-2xl font-black">
            {stats.placedStudents > 0 && accreditation?.salaryMetrics?.medianCtc ? accreditation.salaryMetrics.medianCtc : '—'}
          </p>
          <p className="text-[10px] text-neutral-400">
            {stats.placedStudents > 0 ? 'Statistical center point of verified hires' : 'Midpoint of confirmed packages'}
          </p>
        </Card>
      </div>

      {/* Verified Placement Offers List */}
      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-neutral-100 bg-neutral-50 font-semibold text-xs text-neutral-900 flex items-center gap-2">
          <Award className="w-4 h-4 text-emerald-600" />
          <span>Verified Student Placement Offers ({placedApplications.length})</span>
        </div>
        {placedApplications.length === 0 ? (
          <div className="p-8 text-center text-xs text-neutral-500">
            No placement offers recorded yet. When a recruiter changes a candidate's application status to "Offered", it will appear here.
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {placedApplications.map((app) => (
              <div key={app._id} className="p-4 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-neutral-900">{app.student?.name || 'Candidate'}</h4>
                  <p className="text-[11px] text-neutral-500">{app.jobTitle || app.job?.title} at {app.companyName || app.job?.company}</p>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider">
                  ✓ Placement Offered
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
