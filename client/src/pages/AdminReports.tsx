import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { api } from '../services/api';
import {
  Download,
  FileText,
  BarChart3,
  CheckCircle2,
  RefreshCw,
  Award,
  TrendingUp,
  FileSpreadsheet,
  Building,
  GraduationCap,
  DollarSign,
} from 'lucide-react';

export const AdminReports: React.FC = () => {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [accreditationData, setAccreditationData] = useState<any>(null);
  const [loadingAccreditation, setLoadingAccreditation] = useState(true);

  useEffect(() => {
    fetchAccreditationStats();
  }, []);

  const fetchAccreditationStats = async () => {
    try {
      const res = await api.get('/admin/accreditation-stats');
      if (res.data?.data?.accreditation) {
        setAccreditationData(res.data.data.accreditation);
      }
    } catch (err) {
      console.error('Failed to load accreditation stats:', err);
    } finally {
      setLoadingAccreditation(false);
    }
  };

  const downloadAccreditationCSV = () => {
    if (!accreditationData) return;
    setDownloading('accreditation');

    try {
      const lines = [
        '=========================================================================',
        'INSTITUTIONAL PLACEMENT ACCREDITATION REPORT (NIRF / NAAC / AICTE AUDIT)',
        `Generated: ${new Date().toLocaleString()}`,
        `Academic Reporting Year: ${accreditationData.reportingYear}`,
        `Compliance Standard: ${accreditationData.naacCriteria}`,
        '=========================================================================',
        '',
        '1. EXECUTIVE HIGHLIGHTS',
        `Total Eligible Enrolled Students,${accreditationData.totalEligibleStudents}`,
        `Total Verified Placed Candidates,${accreditationData.totalPlacedStudents}`,
        `Overall Placement Percentage,${accreditationData.overallPlacementRate}%`,
        `Highest Package (CTC),${accreditationData.totalPlacedStudents > 0 ? accreditationData.salaryMetrics.highestCtc : 'N/A'}`,
        `Average Package (CTC),${accreditationData.totalPlacedStudents > 0 ? accreditationData.salaryMetrics.averageCtc : 'N/A'}`,
        `Median Package (CTC),${accreditationData.totalPlacedStudents > 0 ? accreditationData.salaryMetrics.medianCtc : 'N/A'}`,
        '',
        '2. CTC TIER DISTRIBUTION',
        `Super Dream Offers (>= 10 LPA),${accreditationData.salaryTiers.superDreamOffers}`,
        `Dream Offers (6 to 10 LPA),${accreditationData.salaryTiers.dreamOffers}`,
        `Regular Offers (< 6 LPA),${accreditationData.salaryTiers.regularOffers}`,
        '',
        '3. BRANCH-WISE ACCREDITATION BREAKDOWN',
        'Academic Department,Code,Total Batch,Placed,Unplaced,Placement Rate %,Average CTC (LPA)',
        ...accreditationData.branchBreakdown.map(
          (b: any) =>
            `"${b.name}",${b.code},${b.total},${b.placed},${b.unplaced},${b.placedRate}%,${b.avgCtc} LPA`
        ),
      ];

      const csvContent = lines.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `RecruitX_NIRF_Accreditation_Report_${new Date().getFullYear()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setSuccessMsg('NIRF / NAAC Placement Accreditation CSV exported successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
      alert('Failed to export accreditation report');
    } finally {
      setDownloading(null);
    }
  };

  const downloadCSVReport = async () => {
    setDownloading('csv');
    try {
      const res = await api.get('/applications');
      const apps = res.data?.data?.applications || [];

      const headers = ['Application ID', 'Candidate Name', 'Candidate Email', 'Job Title', 'Company', 'Status', 'Applied At'];
      const rows = apps.map((a: any) => [
        `"${a._id}"`,
        `"${a.student?.name || 'Applicant'}"`,
        `"${a.student?.email || ''}"`,
        `"${a.jobTitle || a.job?.title || 'Open Position'}"`,
        `"${a.companyName || a.job?.company || 'Company'}"`,
        `"${a.status}"`,
        `"${new Date(a.appliedAt).toLocaleString()}"`,
      ]);

      const csvContent = [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `RecruitX_Placement_Master_List_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setSuccessMsg('CSV Master List exported successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Failed to export CSV:', err);
      alert('Failed to generate report');
    } finally {
      setDownloading(null);
    }
  };

  const downloadSummaryReport = async () => {
    setDownloading('summary');
    try {
      const [statsRes, jobsRes] = await Promise.allSettled([
        api.get('/admin/stats'),
        api.get('/jobs'),
      ]);

      const stats = statsRes.status === 'fulfilled' ? statsRes.value.data?.data?.stats : {};
      const jobs = jobsRes.status === 'fulfilled' ? jobsRes.value.data?.data?.jobs : [];

      const summaryText = `=====================================================
RECRUITX PLATFORM - ANNUAL PLACEMENT DRIVE SUMMARY
Generated At: ${new Date().toLocaleString()}
Database: Firebase Cloud Firestore
=====================================================

1. EXECUTIVE METRICS
-----------------------------------------------------
- Total Registered Students   : ${stats.totalStudents || 0}
- Total Verified Recruiters   : ${stats.totalRecruiters || 0}
- Active Platform Job Postings: ${stats.totalJobs || jobs.length || 0}
- Total Submitted Applications: ${stats.totalApplications || 0}
- Total Candidates Placed     : ${stats.placedStudents || 0}
- Verified Placement Rate     : ${stats.placementRate || 0}%

2. ACTIVE RECRUITMENT OPENINGS
-----------------------------------------------------
${jobs.map((j: any, i: number) => `${i + 1}. ${j.title} | ${j.company} | ${j.location} | ${j.salary}`).join('\n') || 'No active jobs posted'}

=====================================================
Official Audit Document - Verified by RecruitX Admin Engine
=====================================================
`;

      const blob = new Blob([summaryText], { type: 'text/plain;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `RecruitX_Annual_Placement_Summary_${new Date().toISOString().slice(0, 10)}.txt`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setSuccessMsg('Annual Placement Summary Report exported successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Failed to export summary:', err);
      alert('Failed to generate report');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">Placement Reports & Accreditation Auditing</h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            NIRF, NAAC, and AICTE compliant placement analytics with one-click exportable institutional datasets.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-md flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* NIRF / NAAC Accreditation Report Card */}
      {accreditationData && (
        <Card className="p-6 space-y-5 border-neutral-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-neutral-900 text-white">
                <Award className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-neutral-900">
                  Institutional Placement Audit Suite ({accreditationData.reportingYear})
                </h2>
                <p className="text-[11px] text-neutral-500">
                  Compliant with NIRF Metric 5.2.1 and NAAC Criterion 5.2 (Student Progression)
                </p>
              </div>
            </div>

            <Button
              size="sm"
              onClick={downloadAccreditationCSV}
              disabled={downloading !== null}
              className="flex items-center gap-1.5 bg-neutral-900 text-white shrink-0"
            >
              {downloading === 'accreditation' ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              )}
              <span>Export NIRF / NAAC CSV</span>
            </Button>
          </div>

          {/* Salary Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Highest Package</span>
              <p className="text-lg font-black text-neutral-900">
                {accreditationData.totalPlacedStudents > 0 ? accreditationData.salaryMetrics.highestCtc : '—'}
              </p>
            </div>
            <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Average Package</span>
              <p className="text-lg font-black text-neutral-900">
                {accreditationData.totalPlacedStudents > 0 ? accreditationData.salaryMetrics.averageCtc : '—'}
              </p>
            </div>
            <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Median Package</span>
              <p className="text-lg font-black text-neutral-900">
                {accreditationData.totalPlacedStudents > 0 ? accreditationData.salaryMetrics.medianCtc : '—'}
              </p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Placement %</span>
              <p className="text-lg font-black text-emerald-800">{accreditationData.overallPlacementRate}%</p>
            </div>
          </div>

          {/* Branch Breakdown Table */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
              Department-Wise Placement Distribution
            </h3>
            <div className="border border-neutral-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-semibold text-[11px]">
                    <th className="p-3">Department / Track</th>
                    <th className="p-3 text-center">Batch Size</th>
                    <th className="p-3 text-center">Placed</th>
                    <th className="p-3 text-center">Placement %</th>
                    <th className="p-3 text-right">Avg CTC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {accreditationData.branchBreakdown.map((b: any) => (
                    <tr key={b.code} className="hover:bg-neutral-50/50">
                      <td className="p-3 font-semibold text-neutral-900">
                        {b.name} <span className="text-neutral-400 font-normal">({b.code})</span>
                      </td>
                      <td className="p-3 text-center text-neutral-600 font-mono">{b.total}</td>
                      <td className="p-3 text-center text-emerald-700 font-bold font-mono">{b.placed}</td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-neutral-100 font-semibold text-[11px] text-neutral-800">
                          {b.placedRate}%
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono font-semibold text-neutral-800">{b.avgCtc} LPA</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}

      {/* Standard Master List & Document Exports */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-neutral-700 uppercase tracking-wider">Additional Export Formats</h3>

        <Card className="p-4 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-xs font-semibold text-neutral-900">Student Placement Master List</h3>
            <p className="text-[10px] text-neutral-500">
              CSV • Full roster of candidate applications, vacancy titles, recruiters, and hiring decisions
            </p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={downloadCSVReport}
            disabled={downloading !== null}
            className="flex items-center gap-1.5 shrink-0"
          >
            {downloading === 'csv' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            <span>{downloading === 'csv' ? 'Exporting...' : 'Export CSV'}</span>
          </Button>
        </Card>

        <Card className="p-4 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-xs font-semibold text-neutral-900">Annual Placement Drive Executive Summary</h3>
            <p className="text-[10px] text-neutral-500">
              Plaintext / Doc • High-level executive document detailing drive conversion and company listings
            </p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={downloadSummaryReport}
            disabled={downloading !== null}
            className="flex items-center gap-1.5 shrink-0"
          >
            {downloading === 'summary' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
            <span>{downloading === 'summary' ? 'Exporting...' : 'Export Text Doc'}</span>
          </Button>
        </Card>
      </div>
    </div>
  );
};

