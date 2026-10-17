import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import { User, Lock, CheckCircle2, AlertCircle } from 'lucide-react';

export const RecruiterSettings: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState((user as any)?.phone || '');
  const [company, setCompany] = useState((user as any)?.company || '');
  const [title, setTitle] = useState((user as any)?.title || '');
  const [industry, setIndustry] = useState((user as any)?.industry || '');
  const [companySize, setCompanySize] = useState((user as any)?.companySize || '50-200 Employees');
  const [website, setWebsite] = useState((user as any)?.website || '');
  const [location, setLocation] = useState((user as any)?.location || '');
  const [description, setDescription] = useState((user as any)?.description || '');

  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');

  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [savingPass, setSavingPass] = useState(false);
  const [passMsg, setPassMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      const res = await api.put('/auth/profile', {
        name,
        phone,
        company,
        title,
        industry,
        companySize,
        website,
        location,
        description,
      });
      if (res.data?.data?.user) {
        updateUser(res.data.data.user);
      }
      setProfileMsg({ type: 'success', text: 'Recruiter profile updated successfully!' });
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
      setPassMsg({ type: 'error', text: 'Both current and new passwords are required' });
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
        <h1 className="text-xl font-bold text-neutral-900">Recruiter &amp; Company Settings</h1>
        <p className="text-xs text-neutral-500">Manage hiring organization details, contact information, and security credentials.</p>
      </div>

      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-neutral-100 pb-2">
          <User className="w-4 h-4 text-neutral-500" />
          <h2 className="text-sm font-semibold text-neutral-900">Recruiter &amp; Corporate Identity</h2>
        </div>
        <form onSubmit={handleSaveProfile} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-medium text-neutral-700 block mb-1">Recruiter Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label className="font-medium text-neutral-700 block mb-1">Work Email</label>
              <Input value={user?.email || ''} disabled className="bg-neutral-50 text-neutral-500" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-medium text-neutral-700 block mb-1">Company / Organization Name</label>
              <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g. Acme Tech Innovations" />
            </div>
            <div>
              <label className="font-medium text-neutral-700 block mb-1">Hiring Title / Position</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Lead Technical Recruiter" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-medium text-neutral-700 block mb-1">Industry Sector</label>
              <Input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="e.g. FinTech / SaaS" />
            </div>
            <div>
              <label className="font-medium text-neutral-700 block mb-1">Company Size</label>
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
            <div>
              <label className="font-medium text-neutral-700 block mb-1">Headquarters / Location</label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Bengaluru / Mumbai" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-medium text-neutral-700 block mb-1">Company Website</label>
              <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://company.com" />
            </div>
            <div>
              <label className="font-medium text-neutral-700 block mb-1">Recruiter Phone</label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 9876543210" />
            </div>
          </div>

          <div>
            <label className="font-medium text-neutral-700 block mb-1">Company Mission &amp; Hiring Overview</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell candidates about your company culture, technology stack, and hiring vision..."
              className="w-full text-xs p-2.5 rounded-lg border border-neutral-300 focus:outline-none focus:ring-1 focus:ring-neutral-900 resize-none"
            />
          </div>

          <div className="flex items-center gap-3 pt-1">
            <Button type="submit" size="sm" disabled={savingProfile}>
              {savingProfile ? 'Saving Changes...' : 'Save Recruiter Profile'}
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
    </div>
  );
};
