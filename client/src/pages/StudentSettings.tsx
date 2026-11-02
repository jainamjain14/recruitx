import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import {
  User,
  Lock,
  CheckCircle2,
  AlertCircle,
  Zap,
  ShieldCheck,
} from 'lucide-react';

export const StudentSettings: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email] = useState(user?.email || '');
  const [phone, setPhone] = useState((user as any)?.phone || '');
  const [profession, setProfession] = useState((user as any)?.profession || '');
  const [title, setTitle] = useState((user as any)?.title || '');
  const [location, setLocation] = useState((user as any)?.location || '');
  const [experienceLevel, setExperienceLevel] = useState((user as any)?.experienceLevel || 'Fresher / Entry-Level');
  const [github, setGithub] = useState((user as any)?.github || '');
  const [linkedin, setLinkedin] = useState((user as any)?.linkedin || '');
  const [portfolio, setPortfolio] = useState((user as any)?.portfolio || '');
  const [description, setDescription] = useState((user as any)?.description || '');

  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');

  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [savingPass, setSavingPass] = useState(false);
  const [passMsg, setPassMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      const res = await api.put('/auth/profile', {
        name,
        phone,
        profession,
        title,
        location,
        experienceLevel,
        github,
        linkedin,
        portfolio,
        description,
      });
      if (res.data?.data?.user) {
        updateUser(res.data.data.user);
      }
      setProfileMsg({ type: 'success', text: 'Profile updated successfully!' });
      setTimeout(() => setProfileMsg(null), 4000);
    } catch (err: any) {
      setProfileMsg({ type: 'error', text: err.response?.data?.message || 'Failed to update profile' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPass || !newPass) {
      setPassMsg({ type: 'error', text: 'Please fill in both current and new password' });
      return;
    }
    setSavingPass(true);
    setPassMsg(null);
    try {
      await api.put('/auth/password', { currentPassword: currentPass, newPassword: newPass });
      setPassMsg({ type: 'success', text: 'Password changed successfully!' });
      setCurrentPass('');
      setNewPass('');
      setTimeout(() => setPassMsg(null), 4000);
    } catch (err: any) {
      setPassMsg({ type: 'error', text: err.response?.data?.message || 'Failed to change password' });
    } finally {
      setSavingPass(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="border-b border-neutral-200 pb-4">
        <h1 className="text-xl font-bold text-neutral-900">Candidate Profile &amp; Settings</h1>
        <p className="text-xs text-neutral-500">Manage your recruitment profile, password credentials, and automated application preferences.</p>
      </div>

      {/* CARD 1: CANDIDATE INFO & LINKS */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-neutral-100 pb-2">
          <User className="w-4 h-4 text-neutral-500" />
          <h2 className="text-sm font-semibold text-neutral-900">Candidate Information &amp; Links</h2>
        </div>
        <form onSubmit={handleUpdateProfile} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-medium text-neutral-700 block mb-1">Full Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label className="font-medium text-neutral-700 block mb-1">Login Account Email</label>
              <Input value={email} disabled className="bg-neutral-50 text-neutral-500" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-medium text-neutral-700 block mb-1">Primary Discipline / Profession</label>
              <select
                value={profession}
                onChange={(e) => setProfession(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-neutral-300 bg-white"
              >
                <option value="">Select your discipline...</option>
                <option value="Software Engineering">Software Engineering &amp; Web Development</option>
                <option value="Artificial Intelligence &amp; Data Science">AI, Machine Learning &amp; Data Science</option>
                <option value="UI/UX &amp; Product Design">UI/UX &amp; Product Design</option>
                <option value="Product Marketing &amp; Growth Management">Product Marketing &amp; Growth Management</option>
                <option value="Finance &amp; Accounting">Finance &amp; Corporate Accounting</option>
                <option value="Video Editing &amp; Post-Production">Video Editing &amp; Post-Production</option>
                <option value="Film &amp; Movie Direction">Film &amp; Cinema Direction</option>
                <option value="Cloud Infrastructure &amp; DevOps">Cloud Infrastructure &amp; DevOps</option>
              </select>
            </div>
            <div>
              <label className="font-medium text-neutral-700 block mb-1">Target Role / Title</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Senior Frontend Engineer" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-medium text-neutral-700 block mb-1">Contact Phone</label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 9876543210" />
            </div>
            <div>
              <label className="font-medium text-neutral-700 block mb-1">Current / Desired Location</label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Mumbai, Maharashtra" />
            </div>
            <div>
              <label className="font-medium text-neutral-700 block mb-1">Experience Level</label>
              <select
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-neutral-300 bg-white"
              >
                <option value="Fresher / Entry-Level">Fresher / Entry-Level</option>
                <option value="Junior (1-2 years)">Junior (1-2 years)</option>
                <option value="Mid-Level (3-5 years)">Mid-Level (3-5 years)</option>
                <option value="Senior (5+ years)">Senior (5+ years)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-medium text-neutral-700 block mb-1">LinkedIn Profile</label>
              <Input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/..." />
            </div>
            <div>
              <label className="font-medium text-neutral-700 block mb-1">GitHub Profile</label>
              <Input value={github} onChange={(e) => setGithub(e.target.value)} placeholder="https://github.com/..." />
            </div>
            <div>
              <label className="font-medium text-neutral-700 block mb-1">Portfolio / Personal Site</label>
              <Input value={portfolio} onChange={(e) => setPortfolio(e.target.value)} placeholder="https://..." />
            </div>
          </div>

          <div>
            <label className="font-medium text-neutral-700 block mb-1">Professional Bio &amp; Summary</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of your background, core competencies, and career goals..."
              className="w-full text-xs p-2.5 rounded-lg border border-neutral-300 focus:outline-none focus:ring-1 focus:ring-neutral-900 resize-none"
            />
          </div>

          <div className="flex items-center gap-3 pt-1">
            <Button type="submit" size="sm" disabled={savingProfile}>
              {savingProfile ? 'Updating Profile...' : 'Save Profile Changes'}
            </Button>
            {profileMsg && (
              <span className={`text-xs font-semibold flex items-center gap-1 ${profileMsg.type === 'success' ? 'text-emerald-700' : 'text-red-600'}`}>
                {profileMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {profileMsg.text}
              </span>
            )}
          </div>
        </form>
      </Card>

      {/* CARD 2: CHANGE PASSWORD */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-neutral-100 pb-2">
          <Lock className="w-4 h-4 text-neutral-500" />
          <h2 className="text-sm font-semibold text-neutral-900">Change Password</h2>
        </div>
        <form onSubmit={handleUpdatePassword} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-neutral-700 block mb-1">Current Password</label>
            <Input type="password" value={currentPass} onChange={(e) => setCurrentPass(e.target.value)} required />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-700 block mb-1">New Password (min 6 chars)</label>
            <Input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} required />
          </div>

          <div className="flex items-center gap-3 pt-1">
            <Button type="submit" size="sm" variant="secondary" disabled={savingPass}>
              {savingPass ? 'Updating...' : 'Update Password'}
            </Button>
            {passMsg && (
              <span className={`text-xs font-semibold flex items-center gap-1 ${passMsg.type === 'success' ? 'text-emerald-700' : 'text-red-600'}`}>
                {passMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {passMsg.text}
              </span>
            )}
          </div>
        </form>
      </Card>

      {/* CARD 3: AUTOMATED JOB APPLICATIONS */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-neutral-100 pb-2">
          <Zap className="w-4 h-4 text-amber-500" />
          <h2 className="text-sm font-semibold text-neutral-900">Automated Job Applications (Auto-Apply)</h2>
        </div>

        <div className="space-y-3 text-xs">
          <div className="p-3.5 rounded-lg bg-neutral-50 border border-neutral-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-neutral-900">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Universal Job Application Standards</span>
            </div>
            <p className="text-[11.5px] text-neutral-600 leading-relaxed">
              RecruitX applies genuine submission protocols across all professions, job titles, and employers. If an authorized sending account is connected, applications are sent directly from your address to the employer's recruitment inbox with your resume attached. When an employer requires direct portal submission, RecruitX establishes your application tracker and provides direct links to the official portal.
            </p>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border border-neutral-200 bg-white">
            <div>
              <p className="font-semibold text-neutral-900">Auto-Apply Engine Quick Action</p>
              <p className="text-[11px] text-neutral-500">Configure parameters or trigger an automated application scan across all professions and locations.</p>
            </div>
            <Button
              size="sm"
              onClick={() => (window.location.href = '/student/jobs')}
              className="text-xs shrink-0"
            >
              Open Auto-Apply in Job Matches →
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
