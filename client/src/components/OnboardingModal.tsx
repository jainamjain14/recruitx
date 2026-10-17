import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Sparkles, Building2, Briefcase, GraduationCap, ArrowRight, CheckCircle2 } from 'lucide-react';

interface OnboardingModalProps {
  onCompleted?: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ onCompleted }) => {
  const { user, updateUser } = useAuth();

  // If user already completed onboarding or missing user, don't show
  if (!user || user.role === 'admin' || user.onboardingCompleted) {
    return null;
  }

  const isStudent = user.role === 'student';

  // Student specific state
  const [profession, setProfession] = useState(user.profession || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [location, setLocation] = useState(user.location || '');
  const [experienceLevel, setExperienceLevel] = useState(user.experienceLevel || 'Entry-Level / Fresher');
  const [github, setGithub] = useState(user.github || '');
  const [linkedin, setLinkedin] = useState(user.linkedin || '');

  // Recruiter specific state
  const [company, setCompany] = useState(user.company || '');
  const [title, setTitle] = useState(user.title || '');
  const [industry, setIndustry] = useState(user.industry || '');
  const [website, setWebsite] = useState(user.website || '');
  const [companySize, setCompanySize] = useState(user.companySize || '50-200 Employees');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload: any = {
        phone,
        location,
        onboardingCompleted: true,
      };

      if (isStudent) {
        payload.profession = profession;
        payload.experienceLevel = experienceLevel;
        payload.github = github;
        payload.linkedin = linkedin;
      } else {
        payload.company = company;
        payload.title = title;
        payload.industry = industry;
        payload.website = website;
        payload.companySize = companySize;
      }

      const res = await api.put('/auth/profile', payload);
      if (res.data?.data?.user) {
        updateUser(res.data.data.user);
      }
      if (onCompleted) {
        onCompleted();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to complete setup. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-6 border border-neutral-200 animate-in fade-in zoom-in-95 duration-200">
        <div className="space-y-1.5 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-neutral-900 text-white mb-2 shadow-sm">
            {isStudent ? <GraduationCap className="w-6 h-6" /> : <Building2 className="w-6 h-6" />}
          </div>
          <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
            {isStudent ? 'Set Up Your Candidate Profile' : 'Complete Your Recruiter Workspace'}
          </h2>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            {isStudent
              ? 'Tell us your target profession and location so we can match you with the right verified job openings.'
              : 'Provide your company and hiring details to start posting jobs and connecting with qualified candidates.'}
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {isStudent ? (
            <>
              <div>
                <label className="font-semibold text-neutral-700 block mb-1">
                  Primary Profession / Field of Interest <span className="text-rose-500">*</span>
                </label>
                <select
                  value={profession}
                  onChange={(e) => setProfession(e.target.value)}
                  required
                  className="w-full text-xs p-2.5 rounded-lg border border-neutral-300 bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900"
                >
                  <option value="">Select your discipline...</option>
                  <option value="Software Engineering">Software Engineering & Web Development</option>
                  <option value="Artificial Intelligence & Data Science">AI, Machine Learning & Data Science</option>
                  <option value="UI/UX & Product Design">UI/UX & Product Design</option>
                  <option value="Product Marketing & Growth Management">Product Marketing & Growth Management</option>
                  <option value="Finance & Accounting">Finance & Corporate Accounting</option>
                  <option value="Video Editing & Post-Production">Video Editing & Post-Production</option>
                  <option value="Film & Movie Direction">Film & Cinema Direction</option>
                  <option value="Cloud Infrastructure & DevOps">Cloud Infrastructure & DevOps</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">Experience Level</label>
                  <select
                    value={experienceLevel}
                    onChange={(e) => setExperienceLevel(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-neutral-300 bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900"
                  >
                    <option value="Fresher / Entry-Level">Fresher / Entry-Level</option>
                    <option value="Junior (1-2 years)">Junior (1-2 years)</option>
                    <option value="Mid-Level (3-5 years)">Mid-Level (3-5 years)</option>
                    <option value="Senior (5+ years)">Senior (5+ years)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">Preferred Location</label>
                  <Input
                    placeholder="e.g. Mumbai, Bengaluru, Remote"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">Phone Number</label>
                  <Input
                    placeholder="+91 9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">LinkedIn Profile</label>
                  <Input
                    placeholder="https://linkedin.com/in/..."
                    value={linkedin}
                    onChange={(e) => setLinkedin(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-neutral-700 block mb-1">GitHub or Portfolio URL</label>
                <Input
                  placeholder="https://github.com/... or portfolio site"
                  value={github}
                  onChange={(e) => setGithub(e.target.value)}
                />
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">
                    Company Name <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    placeholder="e.g. Acme Corp"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">
                    Your Job Title <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    placeholder="e.g. Head of Talent"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">Industry</label>
                  <Input
                    placeholder="e.g. SaaS / FinTech / Media"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                  />
                </div>
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">Company Size</label>
                  <select
                    value={companySize}
                    onChange={(e) => setCompanySize(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-neutral-300 bg-white"
                  >
                    <option value="1-10 Employees">1-10 Employees (Seed)</option>
                    <option value="10-50 Employees">10-50 Employees (Early Stage)</option>
                    <option value="50-200 Employees">50-200 Employees (Growth)</option>
                    <option value="200-1000 Employees">200-1000 Employees (Scale-Up)</option>
                    <option value="1000+ Employees">1000+ Employees (Enterprise)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">Work Location / HQ</label>
                  <Input
                    placeholder="e.g. Bengaluru / Hybrid"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">Company Website</label>
                  <Input
                    placeholder="https://example.com"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-neutral-700 block mb-1">Direct Contact Phone</label>
                <Input
                  placeholder="+91 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="pt-2">
            <Button
              type="submit"
              disabled={saving}
              className="w-full h-10 rounded-xl flex items-center justify-center gap-2 text-xs font-bold"
            >
              {saving ? (
                'Saving Profile Details...'
              ) : (
                <>
                  <span>Save &amp; Enter Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
