import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { api } from '../services/api';
import { decodeHtmlEntities } from '../components/CompanyLocationMap';
import { ClipboardList, Calendar, Building2, FileText, CheckCircle2 } from 'lucide-react';

export const StudentApplications: React.FC = () => {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const res = await api.get('/applications');
      if (res.data?.data?.applications) {
        setApplications(res.data.data.applications);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'applied':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'shortlisted':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'interview_scheduled':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'offered':
        return 'bg-emerald-50 font-bold text-emerald-800 border-emerald-300';
      case 'rejected':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-neutral-100 text-neutral-600 border-neutral-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-neutral-200 pb-4">
        <h1 className="text-xl font-bold text-neutral-900">My Job Applications</h1>
        <p className="text-xs text-neutral-500">Track and verify all submitted job applications & attached resume status.</p>
      </div>

      {loading ? (
        <p className="text-xs text-neutral-400">Loading your applications...</p>
      ) : applications.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-xs text-neutral-500">No applications submitted yet. Browse jobs to get started.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {applications.map((app) => {
            const company = decodeHtmlEntities(app.companyName || app.job?.company || 'Employer');
            const title = decodeHtmlEntities(app.jobTitle || app.job?.title || 'Position');

            return (
              <Card key={app._id} className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-neutral-900">{title}</h3>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-neutral-100 border border-neutral-200 text-neutral-700">
                      <FileText className="w-3 h-3 text-neutral-500" />
                      {app.resumeUrl || 'Uploaded Resume Attached'}
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-neutral-700 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-neutral-500" />
                    {company}
                  </p>

                  <div className="flex items-center gap-2 text-[11px] text-neutral-400 pt-0.5">
                    <Calendar className="w-3 h-3" />
                    <span>Applied on {new Date(app.appliedAt).toLocaleDateString()} at {new Date(app.appliedAt).toLocaleTimeString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <span className={`text-xs font-semibold px-3 py-1 rounded-md border uppercase tracking-wider ${getStatusBadge(app.status)}`}>
                    ✓ {app.status.replace('_', ' ')}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
