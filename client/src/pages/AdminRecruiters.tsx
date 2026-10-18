import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { api } from '../services/api';
import { Building2, Trash2 } from 'lucide-react';

export const AdminRecruiters: React.FC = () => {
  const [recruiters, setRecruiters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
      const updatedUser = res.data.data.user;
      setRecruiters(recruiters.map((r) => (r._id === id ? { ...r, isSuspended: updatedUser.isSuspended } : r)));
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const deleteRecruiter = async (r: any) => {
    const confirmed = window.confirm(
      `Permanently delete recruiter "${r.name}" (${r.email})?\n\nThis action cannot be undone.`
    );
    if (!confirmed) return;
    setDeletingId(r._id);
    try {
      await api.delete(`/admin/users/${r._id}`);
      setRecruiters((prev) => prev.filter((x) => x._id !== r._id));
    } catch (err: any) {
      console.error('Delete recruiter request failed:', err);
      const status = err?.response?.status;
      const backendMsg = err?.response?.data?.message || err?.message;
      alert(`Delete failed (${status || 'Network Error'}): ${backendMsg || 'Server is restarting or route unavailable. Please wait 30 seconds.'}`);
    } finally {
      setDeletingId(null);
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

              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${r.isSuspended ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                  {r.isSuspended ? 'Suspended' : 'Active'}
                </span>
                <Button size="sm" variant="secondary" onClick={() => toggleStatus(r._id)}>
                  {r.isSuspended ? 'Activate' : 'Suspend'}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => deleteRecruiter(r)}
                  disabled={deletingId === r._id}
                  className="text-red-600 border-red-200 hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  {deletingId === r._id ? 'Deleting…' : 'Delete'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
