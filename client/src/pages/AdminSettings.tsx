import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import { Settings, Shield, Server, Lock, CheckCircle2, AlertCircle } from 'lucide-react';

export const AdminSettings: React.FC = () => {
  const { user } = useAuth();
  const [season, setSeason] = useState(localStorage.getItem('recruitx_season') || '2025 - 2026');
  const [minCgpa, setMinCgpa] = useState(localStorage.getItem('recruitx_min_cgpa') || '6.0');
  const [configSaved, setConfigSaved] = useState(false);

  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [savingPass, setSavingPass] = useState(false);
  const [passMsg, setPassMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('recruitx_season', season);
    localStorage.setItem('recruitx_min_cgpa', minCgpa);
    setConfigSaved(true);
    setTimeout(() => setConfigSaved(false), 3000);
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
      setPassMsg({ type: 'success', text: 'Admin security password updated successfully!' });
      setCurrentPass('');
      setNewPass('');
      setTimeout(() => setPassMsg(null), 4000);
    } catch (err: any) {
      setPassMsg({ type: 'error', text: err.response?.data?.message || 'Failed to change admin password' });
    } finally {
      setSavingPass(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="border-b border-neutral-200 pb-4">
        <h1 className="text-xl font-bold text-neutral-900">System Configuration & Security</h1>
        <p className="text-xs text-neutral-500">Configure global platform drive parameters and admin credentials.</p>
      </div>

      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-neutral-100 pb-2">
          <Settings className="w-4 h-4 text-neutral-500" />
          <h2 className="text-sm font-semibold text-neutral-900">Drive Thresholds</h2>
        </div>
        <form onSubmit={handleSaveConfig} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-neutral-700 block mb-1">Active Academic Season</label>
            <Input value={season} onChange={(e) => setSeason(e.target.value)} required />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-700 block mb-1">Default Minimum CGPA Threshold</label>
            <Input value={minCgpa} onChange={(e) => setMinCgpa(e.target.value)} required />
          </div>
          <div className="flex items-center gap-3 pt-1">
            <Button type="submit" size="sm">Save Configuration</Button>
            {configSaved && (
              <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Configuration saved
              </span>
            )}
          </div>
        </form>
      </Card>

      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-neutral-100 pb-2">
          <Lock className="w-4 h-4 text-neutral-500" />
          <h2 className="text-sm font-semibold text-neutral-900">Admin Security Credentials</h2>
        </div>
        <form onSubmit={handleUpdatePassword} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-neutral-700 block mb-1">Current Admin Password</label>
            <Input type="password" value={currentPass} onChange={(e) => setCurrentPass(e.target.value)} required />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-700 block mb-1">New Admin Password</label>
            <Input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} required />
          </div>

          <div className="flex items-center gap-3 pt-1">
            <Button type="submit" size="sm" variant="secondary" disabled={savingPass}>
              {savingPass ? 'Updating...' : 'Update Admin Password'}
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
