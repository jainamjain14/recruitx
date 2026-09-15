import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import { Building2, Globe, MapPin, CheckCircle2 } from 'lucide-react';

export const RecruiterCompany: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.company || '');
  const [website, setWebsite] = useState((user as any)?.website || '');
  const [location, setLocation] = useState((user as any)?.location || '');
  const [description, setDescription] = useState((user as any)?.description || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user) {
      if (user.company) setName(user.company);
      if ((user as any).website) setWebsite((user as any).website);
      if ((user as any).location) setLocation((user as any).location);
      if ((user as any).description) setDescription((user as any).description);
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put('/auth/profile', {
        company: name,
        website,
        location,
        description,
      });
      if (res.data?.data?.user) {
        updateUser(res.data.data.user);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to update company profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="border-b border-neutral-200 pb-4">
        <h1 className="text-xl font-bold text-neutral-900">Company Profile</h1>
        <p className="text-xs text-neutral-500">Manage company branding and public information shown to students.</p>
      </div>

      <Card className="p-5 space-y-4">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-neutral-700 block mb-1">Company / Studio Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Yash Raj Films, Dharma Productions, Google, Amazon..."
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-700 block mb-1">Website URL</label>
            <Input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://company.example.com"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-700 block mb-1">Headquarters Location</label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Andheri West, Mumbai / Whitefield, Bangalore"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-700 block mb-1">Company Overview</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Provide an overview of your organization, mission, and culture..."
              className="w-full text-xs rounded-md border border-neutral-200 p-3 focus:outline-none focus:ring-1 focus:ring-neutral-900"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Company Details'}
            </Button>
            {saved && (
              <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Company profile updated
              </span>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
};
