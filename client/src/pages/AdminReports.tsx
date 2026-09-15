import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { api } from '../services/api';
import { Download, FileText, BarChart3, CheckCircle2, RefreshCw } from 'lucide-react';

export const AdminReports: React.FC = () => {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

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
    <div className="space-y-6 max-w-2xl">
      <div className="border-b border-neutral-200 pb-4">
        <h1 className="text-xl font-bold text-neutral-900">Placement Reports & Analytics Export</h1>
        <p className="text-xs text-neutral-500">Generate, compile, and download live platform placement reports.</p>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-md flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="space-y-3">
        <Card className="p-4 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold text-neutral-900">Annual Placement Summary Report</h3>
            <p className="text-[10px] text-neutral-500">Text / Document • Includes live metrics, drive conversion, and verified openings</p>
          </div>
          <Button
            size="sm"
            onClick={downloadSummaryReport}
            disabled={downloading !== null}
            className="flex items-center gap-1.5"
          >
            {downloading === 'summary' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            {downloading === 'summary' ? 'Exporting...' : 'Export Summary'}
          </Button>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold text-neutral-900">Student Placement Master List</h3>
            <p className="text-[10px] text-neutral-500">CSV • All student applicants, roles, target companies, and hiring status</p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={downloadCSVReport}
            disabled={downloading !== null}
            className="flex items-center gap-1.5"
          >
            {downloading === 'csv' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            {downloading === 'csv' ? 'Exporting...' : 'Export CSV'}
          </Button>
        </Card>
      </div>
    </div>
  );
};
