import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { api } from '../services/api';
import { Users, Search, GraduationCap, Mail, Sparkles, Phone, Briefcase } from 'lucide-react';

interface Candidate {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  headline: string;
  fieldOfInterest: string;
  skills: string[];
  summary?: string;
  createdAt: string;
}

export const RecruiterCandidates: React.FC = () => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    try {
      const res = await api.get('/jobs/candidates');
      if (res.data?.data?.candidates) {
        setCandidates(res.data.data.candidates);
      }
    } catch (err) {
      console.error('Failed to load candidate talent pool:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = candidates.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.fieldOfInterest.toLowerCase().includes(search.toLowerCase()) ||
    c.headline.toLowerCase().includes(search.toLowerCase()) ||
    c.skills.some((s) => s.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-200 pb-4 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-neutral-900">Student Talent Pool</h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-neutral-900 text-white">
              Live Directory
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Discover active candidate profiles, resumes, and verified skills across creative and technical tracks.
          </p>
        </div>
        <div className="w-full sm:w-72">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, role, or skill..."
          />
        </div>
      </div>

      {loading ? (
        <p className="text-xs text-neutral-400">Loading student talent pool...</p>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center space-y-2">
          <Users className="w-8 h-8 text-neutral-400 mx-auto" />
          <p className="text-xs text-neutral-500">
            {search ? 'No candidates match your search filter.' : 'No student profiles registered yet.'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((c) => (
            <Card key={c._id} className="p-5 space-y-3.5 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900">{c.name}</h3>
                    <p className="text-xs font-semibold text-neutral-600 mt-0.5">{c.headline}</p>
                    <p className="text-[11px] text-neutral-400">{c.email} {c.phone ? `• ${c.phone}` : ''}</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-neutral-100 border border-neutral-200 text-neutral-800 uppercase tracking-wider">
                    {c.fieldOfInterest || 'Student'}
                  </span>
                </div>

                {c.summary && (
                  <p className="text-xs text-neutral-500 line-clamp-2 italic">
                    "{c.summary}"
                  </p>
                )}

                <div>
                  <p className="text-[11px] font-medium text-neutral-500 mb-1">Key Skills:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {c.skills.map((s) => (
                      <span
                        key={s}
                        className="text-[10px] font-medium px-2 py-0.5 rounded bg-neutral-100 border border-neutral-200 text-neutral-700"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
                <span className="text-[10px] text-neutral-400">
                  Joined {new Date(c.createdAt).toLocaleDateString()}
                </span>
                <a href={`mailto:${c.email}?subject=Recruitment Opportunity via RecruitX&body=Hi ${c.name}, we reviewed your profile on RecruitX...`}>
                  <Button size="sm" variant="secondary" className="flex items-center gap-1.5 text-xs">
                    <Mail className="w-3.5 h-3.5" /> Reach Out
                  </Button>
                </a>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
