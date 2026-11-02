import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { api } from '../services/api';
import { Users, Search, GraduationCap, Mail, Sparkles, Phone, Briefcase, ExternalLink, Copy, Check, X } from 'lucide-react';

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
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [copied, setCopied] = useState(false);

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

  const handleOpenReachOut = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setCopied(false);
  };

  const handleOpenGmail = (candidate: Candidate) => {
    const subject = encodeURIComponent('Recruitment Opportunity via RecruitX');
    const body = encodeURIComponent(
      `Hi ${candidate.name},\n\nWe reviewed your verified profile on RecruitX and were impressed by your background. We would love to connect regarding career opportunities at our organization.\n\nBest regards,\nRecruiting Team`
    );
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(candidate.email)}&su=${subject}&body=${body}`;
    window.open(gmailUrl, '_blank', 'noopener,noreferrer');
  };

  const handleOpenMailto = (candidate: Candidate) => {
    const subject = encodeURIComponent('Recruitment Opportunity via RecruitX');
    const body = encodeURIComponent(
      `Hi ${candidate.name},\n\nWe reviewed your verified profile on RecruitX and were impressed by your background. We would love to connect regarding career opportunities at our organization.\n\nBest regards,\nRecruiting Team`
    );
    window.location.href = `mailto:${encodeURIComponent(candidate.email)}?subject=${subject}&body=${body}`;
  };

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
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
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleOpenReachOut(c)}
                  className="flex items-center gap-1.5 text-xs text-neutral-800 hover:text-neutral-900 border-neutral-300"
                >
                  <Mail className="w-3.5 h-3.5 text-neutral-600" /> Reach Out
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Direct Reach Out Dialog */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-5 border border-neutral-200">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-neutral-900">Reach Out to Candidate</h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Connect with <span className="font-semibold text-neutral-800">{selectedCandidate.name}</span> directly
                </p>
              </div>
              <button
                onClick={() => setSelectedCandidate(null)}
                className="text-neutral-400 hover:text-neutral-600 p-1 rounded-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">Target Candidate:</span>
                <span className="font-semibold text-neutral-900">{selectedCandidate.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">Verified Email:</span>
                <span className="font-mono text-neutral-800">{selectedCandidate.email}</span>
              </div>
              {selectedCandidate.headline && (
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Specialization:</span>
                  <span className="font-medium text-neutral-700">{selectedCandidate.headline}</span>
                </div>
              )}
            </div>

            <div className="space-y-2.5">
              <Button
                variant="primary"
                className="w-full flex items-center justify-center gap-2 text-xs py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-medium"
                onClick={() => handleOpenGmail(selectedCandidate)}
              >
                <ExternalLink className="w-4 h-4" />
                <span>Compose in Gmail Web</span>
              </Button>

              <Button
                variant="secondary"
                className="w-full flex items-center justify-center gap-2 text-xs py-2.5 border-neutral-300"
                onClick={() => handleOpenMailto(selectedCandidate)}
              >
                <Mail className="w-4 h-4" />
                <span>Open Default Mail App (mailto)</span>
              </Button>

              <Button
                variant="outline"
                className="w-full flex items-center justify-center gap-2 text-xs py-2 border-dashed border-neutral-300 text-neutral-700 hover:bg-neutral-50"
                onClick={() => handleCopyEmail(selectedCandidate.email)}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-700 font-semibold">Email Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-neutral-500" />
                    <span>Copy Candidate Email Address</span>
                  </>
                )}
              </Button>
            </div>

            <div className="text-center pt-1">
              <button
                onClick={() => setSelectedCandidate(null)}
                className="text-xs text-neutral-400 hover:text-neutral-600"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
