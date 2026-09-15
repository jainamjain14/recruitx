import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { api } from '../services/api';
import { Briefcase, Trash2 } from 'lucide-react';

export const AdminJobs: React.FC = () => {
  const [jobs, setJobs] = useState<any[]>([]);

  useEffect(() => {
    api.get('/jobs').then((res) => {
      if (res.data?.data?.jobs) setJobs(res.data.data.jobs);
    }).catch(console.error);
  }, []);

  const deleteJob = async (id: string) => {
    if (!confirm('Remove this job posting?')) return;
    try {
      await api.delete(`/jobs/${id}`);
      setJobs(jobs.filter((j) => j._id !== id));
    } catch (err) {
      alert('Failed to delete job');
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-neutral-200 pb-4">
        <h1 className="text-xl font-bold text-neutral-900">Platform Job Postings</h1>
        <p className="text-xs text-neutral-500">System-wide job oversight and management.</p>
      </div>

      <div className="space-y-3">
        {jobs.map((job) => (
          <Card key={job._id} className="p-4 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold text-neutral-900">{job.title}</h3>
              <p className="text-xs text-neutral-500">{job.company} • {job.salary}</p>
            </div>
            <button onClick={() => deleteJob(job._id)} className="p-2 text-neutral-400 hover:text-red-600 rounded border border-neutral-200">
              <Trash2 className="w-4 h-4" />
            </button>
          </Card>
        ))}
      </div>
    </div>
  );
};
