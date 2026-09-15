import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { api } from '../services/api';
import { Building2 } from 'lucide-react';

export const AdminRecruiters: React.FC = () => {
  const [recruiters, setRecruiters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecruiters();
  }, []);

  const fetchRecruiters = async () => {
    try {
      const res = await api.get('/admin/users?role=recruiter');
      if (res.data?.data?.users) setRecruiters(res.data.data.users);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (id: string) => {
    try {
      const res = await api.patch(`/admin/users/${id}/toggle-status`);
      setRecruiters(recruiters.map((r) => (r._id === id ? { ...r, emailVerified: res.data.data.user.emailVerified } : r)));
    } catch (err) {
      alert('Failed to update status');
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-neutral-200 pb-4">
        <h1 className="text-xl font-bold text-neutral-900">Recruiter Directory</h1>
        <p className="text-xs text-neutral-500">Approve and verify company recruiter accounts.</p>
      </div>

      {loading ? (
        <p className="text-xs text-neutral-400">Loading recruiters...</p>
      ) : recruiters.length === 0 ? (
        <Card className="p-8 text-center"><p className="text-xs text-neutral-500">No recruiters registered yet.</p></Card>
      ) : (
        <div className="space-y-3">
          {recruiters.map((r) => (
            <Card key={r._id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-neutral-100 border border-neutral-200"><Building2 className="w-4 h-4 text-neutral-700" /></div>
                <div>
                  <h3 className="text-xs font-semibold text-neutral-900">{r.name}</h3>
                  <p className="text-xs text-neutral-500">{r.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${r.emailVerified ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                  {r.emailVerified ? 'Verified' : 'Pending'}
                </span>
                <Button size="sm" variant="secondary" onClick={() => toggleStatus(r._id)}>
                  {r.emailVerified ? 'Deactivate' : 'Verify'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
