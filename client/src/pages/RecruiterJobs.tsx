import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { api } from '../services/api';
import { Link } from 'react-router-dom';
import { Plus, Trash2, Eye } from 'lucide-react';

export const RecruiterJobs: React.FC = () => {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const res = await api.get('/jobs');
      if (res.data?.data?.jobs) setJobs(res.data.data.jobs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this job posting?')) return;
    try {
      await api.delete(`/jobs/${id}`);
      setJobs(jobs.filter((j) => j._id !== id));
    } catch (err) {
      alert('Failed to delete job');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">Job Postings</h1>
          <p className="text-xs text-neutral-500">Manage your active recruitment openings.</p>
        </div>
        <Link to="/recruiter/post-job">
          <Button className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> Post New Job
          </Button>
        </Link>
      </div>

      {loading ? (
        <p className="text-xs text-neutral-400">Loading jobs...</p>
      ) : jobs.length === 0 ? (
        <Card className="p-8 text-center space-y-3">
          <p className="text-xs text-neutral-500">No active job postings. Create your first listing to start accepting applications.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <Card key={job._id} className="p-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-neutral-900">{job.title}</h3>
                <p className="text-xs text-neutral-500">{job.company} • {job.location} • {job.salary}</p>
                <div className="flex items-center gap-3 text-[10px] text-neutral-400 mt-1">
                  <span>{job.jobType}</span>
                  <span>•</span>
                  <span>{job.applicationsCount || 0} Applications</span>
                  <span>•</span>
                  <span>Posted {new Date(job.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={() => handleDelete(job._id)} className="p-2 text-neutral-400 hover:text-red-600 rounded-md border border-neutral-200 hover:border-red-200">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
