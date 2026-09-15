import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { api } from '../services/api';
import { Check, X, Calendar, User } from 'lucide-react';

export const RecruiterApplications: React.FC = () => {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const res = await api.get('/applications');
      if (res.data?.data?.applications) setApplications(res.data.data.applications);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/applications/${id}/status`, { status });
      setApplications(applications.map((a) => (a._id === id ? { ...a, status } : a)));
    } catch (err) {
      alert('Failed to update status');
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-neutral-200 pb-4">
        <h1 className="text-xl font-bold text-neutral-900">Candidate Applications</h1>
        <p className="text-xs text-neutral-500">Review, shortlist, or reject student applicants in real-time.</p>
      </div>

      {loading ? (
        <p className="text-xs text-neutral-400">Loading applications...</p>
      ) : applications.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-xs text-neutral-500">No applications received yet.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {applications.map((app) => (
            <Card key={app._id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-neutral-500" />
                  <h3 className="text-sm font-semibold text-neutral-900">{app.student?.name || 'Applicant'}</h3>
                  <span className="text-xs text-neutral-400">({app.student?.email})</span>
                </div>
                <p className="text-xs text-neutral-600 font-medium">Applied for: {app.job?.title || 'Job'}</p>
                <p className="text-[10px] text-neutral-400">Date: {new Date(app.appliedAt).toLocaleDateString()}</p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-1 rounded bg-neutral-100 border border-neutral-200 text-neutral-700 uppercase">
                  {app.status.replace('_', ' ')}
                </span>
                <Button size="sm" variant="secondary" onClick={() => updateStatus(app._id, 'shortlisted')}>
                  Shortlist
                </Button>
                <Button size="sm" onClick={() => updateStatus(app._id, 'interview_scheduled')}>
                  Interview
                </Button>
                <button onClick={() => updateStatus(app._id, 'rejected')} className="p-2 text-neutral-400 hover:text-red-600 rounded-md border border-neutral-200">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
