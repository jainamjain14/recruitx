import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import { Settings, Shield, Lock, CheckCircle2, AlertCircle, Award, Sliders, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react';

const AVAILABLE_DEPARTMENTS = [
  'Computer Science',
  'Information Technology',
  'Cinematography',
  'Film & OTT Production',
  'Product Design & UI/UX',
  'Marketing & Growth',
];

export const AdminSettings: React.FC = () => {
  const { user } = useAuth();

  // Placement Drive Eligibility Rules State
  const [eligibilityRule, setEligibilityRule] = useState<{
    minCgpa: number;
    allowedDepartments: string[];
    maxBacklogs: number;
    graduationBatchYear: number;
    oneJobPolicy: boolean;
    dreamOfferMultiplier: number;
    isActive: boolean;
  }>({
    minCgpa: 6.0,
    allowedDepartments: [],
    maxBacklogs: 0,
    graduationBatchYear: 2026,
    oneJobPolicy: false,
    dreamOfferMultiplier: 1.5,
    isActive: true,
  });

  const [loadingRules, setLoadingRules] = useState(true);
  const [savingRules, setSavingRules] = useState(false);
  const [rulesSuccess, setRulesSuccess] = useState(false);

  // Admin Password State
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [savingPass, setSavingPass] = useState(false);
  const [passMsg, setPassMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchEligibilityRules();
  }, []);

  const fetchEligibilityRules = async () => {
    try {
      const res = await api.get('/admin/eligibility-rules');
      if (res.data?.data?.rule) {
        setEligibilityRule({
          minCgpa: res.data.data.rule.minCgpa ?? 6.0,
          allowedDepartments: res.data.data.rule.allowedDepartments ?? [],
          maxBacklogs: res.data.data.rule.maxBacklogs ?? 0,
          graduationBatchYear: res.data.data.rule.graduationBatchYear ?? 2026,
          oneJobPolicy: res.data.data.rule.oneJobPolicy ?? false,
          dreamOfferMultiplier: res.data.data.rule.dreamOfferMultiplier ?? 1.5,
          isActive: res.data.data.rule.isActive ?? true,
        });
      }
    } catch (err) {
      console.error('Failed to load eligibility rules:', err);
    } finally {
      setLoadingRules(false);
    }
  };

  const handleSaveEligibilityRules = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingRules(true);
    setRulesSuccess(false);
    try {
      await api.put('/admin/eligibility-rules', eligibilityRule);
      setRulesSuccess(true);
      setTimeout(() => setRulesSuccess(false), 4000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save eligibility policies');
    } finally {
      setSavingRules(false);
    }
  };

  const toggleDepartment = (dept: string) => {
    const list = [...eligibilityRule.allowedDepartments];
    const idx = list.indexOf(dept);
    if (idx >= 0) list.splice(idx, 1);
    else list.push(dept);
    setEligibilityRule({ ...eligibilityRule, allowedDepartments: list });
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
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="border-b border-neutral-200 pb-4">
        <h1 className="text-xl font-bold text-neutral-900">Institutional Governance & System Settings</h1>
        <p className="text-xs text-neutral-500 mt-0.5">
          Configure automated campus placement drive eligibility criteria, policies, and administrator credentials.
        </p>
      </div>

      {/* Placement Drive Eligibility Rule Engine */}
      <Card className="p-6 space-y-5 border-neutral-200">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-neutral-900" />
            <div>
              <h2 className="text-sm font-bold text-neutral-900">Campus Placement Eligibility Engine</h2>
              <p className="text-[11px] text-neutral-500">Automated gatekeeping enforced during student job applications</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setEligibilityRule({ ...eligibilityRule, isActive: !eligibilityRule.isActive })}
            className={`text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1.5 transition-colors ${
              eligibilityRule.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-100 text-neutral-600'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${eligibilityRule.isActive ? 'bg-emerald-600 animate-pulse' : 'bg-neutral-400'}`}></span>
            {eligibilityRule.isActive ? 'Policy Active' : 'Policy Suspended'}
          </button>
        </div>

        {loadingRules ? (
          <div className="p-4 text-center text-xs text-neutral-400">Loading placement drive rules...</div>
        ) : (
          <form onSubmit={handleSaveEligibilityRules} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-neutral-700 block mb-1">Minimum CGPA / 10</label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={eligibilityRule.minCgpa}
                  onChange={(e) => setEligibilityRule({ ...eligibilityRule, minCgpa: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-700 block mb-1">Max Active Backlogs Allowed</label>
                <Input
                  type="number"
                  min="0"
                  max="10"
                  value={eligibilityRule.maxBacklogs}
                  onChange={(e) => setEligibilityRule({ ...eligibilityRule, maxBacklogs: parseInt(e.target.value, 10) || 0 })}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-700 block mb-1">Eligible Graduation Batch</label>
                <Input
                  type="number"
                  min="2020"
                  max="2035"
                  value={eligibilityRule.graduationBatchYear}
                  onChange={(e) => setEligibilityRule({ ...eligibilityRule, graduationBatchYear: parseInt(e.target.value, 10) || 2026 })}
                  required
                />
              </div>
            </div>

            {/* Allowed Departments Multi-Tag Selector */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-neutral-700">Eligible Academic Departments:</label>
                <span className="text-[10px] text-neutral-400">
                  {eligibilityRule.allowedDepartments.length === 0 ? 'All departments eligible' : `${eligibilityRule.allowedDepartments.length} departments selected`}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_DEPARTMENTS.map((dept) => {
                  const selected = eligibilityRule.allowedDepartments.includes(dept);
                  return (
                    <button
                      key={dept}
                      type="button"
                      onClick={() => toggleDepartment(dept)}
                      className={`text-xs px-2.5 py-1.5 rounded-md border font-medium transition-all ${
                        selected
                          ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                          : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
                      }`}
                    >
                      {selected ? `✓ ${dept}` : dept}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* One Student One Job Policy */}
            <div className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-neutral-900">"One Student One Job" Policy Enforcement</h4>
                  <p className="text-[11px] text-neutral-500">
                    Prevents candidates who already hold an accepted job offer from applying to lower-tier companies.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEligibilityRule({ ...eligibilityRule, oneJobPolicy: !eligibilityRule.oneJobPolicy })}
                  className={`text-xs font-bold px-3 py-1 rounded-md border transition-colors ${
                    eligibilityRule.oneJobPolicy
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-neutral-600 border-neutral-300'
                  }`}
                >
                  {eligibilityRule.oneJobPolicy ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              {eligibilityRule.oneJobPolicy && (
                <div className="pt-2 border-t border-neutral-200 flex items-center gap-3">
                  <span className="text-xs text-neutral-600">Dream Offer CTC Multiplier:</span>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.1"
                      min="1.0"
                      max="5.0"
                      value={eligibilityRule.dreamOfferMultiplier}
                      onChange={(e) => setEligibilityRule({ ...eligibilityRule, dreamOfferMultiplier: parseFloat(e.target.value) || 1.5 })}
                      className="w-20"
                    />
                    <span className="text-xs text-neutral-500">× higher than initial offer</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-neutral-400">
                Rule changes are recorded in the platform security audit trail.
              </span>
              <div className="flex items-center gap-3">
                {rulesSuccess && (
                  <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Eligibility criteria saved!
                  </span>
                )}
                <Button type="submit" size="sm" disabled={savingRules} className="flex items-center gap-1.5 bg-neutral-900 text-white">
                  {savingRules ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                    </>
                  ) : (
                    'Save Drive Policies'
                  )}
                </Button>
              </div>
            </div>
          </form>
        )}
      </Card>

      {/* Admin Security Credentials Card */}
      <Card className="p-6 space-y-4 border-neutral-200">
        <div className="flex items-center gap-2 border-b border-neutral-100 pb-3">
          <Lock className="w-4 h-4 text-neutral-700" />
          <h2 className="text-sm font-bold text-neutral-900">Admin Security Credentials</h2>
        </div>
        <form onSubmit={handleUpdatePassword} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-neutral-700 block mb-1">Current Password</label>
            <Input type="password" value={currentPass} onChange={(e) => setCurrentPass(e.target.value)} required />
          </div>
          <div>
            <label className="text-xs font-semibold text-neutral-700 block mb-1">New Secure Password</label>
            <Input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} required />
          </div>

          <div className="flex items-center gap-3 pt-1">
            <Button type="submit" size="sm" variant="secondary" disabled={savingPass}>
              {savingPass ? 'Updating...' : 'Update Password'}
            </Button>
            {passMsg && (
              <span
                className={`text-xs font-semibold flex items-center gap-1 ${
                  passMsg.type === 'success' ? 'text-emerald-700' : 'text-red-700'
                }`}
              >
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

