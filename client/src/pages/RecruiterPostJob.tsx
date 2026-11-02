import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Plus, Briefcase } from 'lucide-react';

export const RecruiterPostJob: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState(user?.company || '');
  const [location, setLocation] = useState((user as any)?.location || '');
  const [salary, setSalary] = useState('');
  const [jobType, setJobType] = useState('Full-Time');
  const [workMode, setWorkMode] = useState('On-site');
  const [skillsRequired, setSkillsRequired] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user?.company && !company) {
      setCompany(user.company);
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/jobs', {
        title,
        company,
        location,
        salary,
        jobType,
        workMode,
        skillsRequired,
        description,
      });
      navigate('/recruiter/jobs');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to post job');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="border-b border-neutral-200 pb-4">
        <h1 className="text-xl font-bold text-neutral-900">Post a New Job Opening</h1>
        <p className="text-xs text-neutral-500">Publish job requirements to recruit top student candidates.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Card className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-neutral-700 block mb-1">Job Title</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Senior Frontend Engineer" required />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-700 block mb-1">Company Name</label>
              <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g. TechCorp Inc." required />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-700 block mb-1">Location</label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Bangalore / Remote" required />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-700 block mb-1">Salary Range</label>
              <Input value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="e.g. ₹12 - ₹16 LPA" required />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-neutral-700 block mb-1">Job Type</label>
              <select value={jobType} onChange={(e) => setJobType(e.target.value)} className="w-full text-xs rounded-md border border-neutral-200 p-2.5 bg-white">
                <option value="Full-Time">Full-Time</option>
                <option value="Internship">Internship</option>
                <option value="Part-Time">Part-Time</option>
                <option value="Contract">Contract</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-700 block mb-1">Work Mode</label>
              <select value={workMode} onChange={(e) => setWorkMode(e.target.value)} className="w-full text-xs rounded-md border border-neutral-200 p-2.5 bg-white">
                <option value="On-site">On-site</option>
                <option value="Remote">Remote</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-neutral-700 block mb-1">Skills Required (comma separated)</label>
            <Input value={skillsRequired} onChange={(e) => setSkillsRequired(e.target.value)} placeholder="React, Node.js, TypeScript, Docker" required />
          </div>

          <div>
            <label className="text-xs font-medium text-neutral-700 block mb-1">Job Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              className="w-full text-xs rounded-md border border-neutral-200 p-3 focus:outline-none focus:ring-1 focus:ring-neutral-900"
              placeholder="Describe roles, responsibilities, and key expectations..."
              required
            />
          </div>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => navigate('/recruiter/jobs')}>Cancel</Button>
          <Button type="submit" disabled={submitting}>{submitting ? 'Publishing...' : 'Publish Job'}</Button>
        </div>
      </form>
    </div>
  );
};
