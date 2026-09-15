import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { api } from '../services/api';
import { GraduationCap, CheckCircle, XCircle } from 'lucide-react';

export const AdminStudents: React.FC = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const res = await api.get('/admin/users?role=student');
      if (res.data?.data?.users) setStudents(res.data.data.users);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (id: string) => {
    try {
      const res = await api.patch(`/admin/users/${id}/toggle-status`);
      setStudents(students.map((s) => (s._id === id ? { ...s, emailVerified: res.data.data.user.emailVerified } : s)));
    } catch (err) {
      alert('Failed to update status');
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-neutral-200 pb-4">
        <h1 className="text-xl font-bold text-neutral-900">Student Directory</h1>
        <p className="text-xs text-neutral-500">Manage all registered student accounts and access rights.</p>
      </div>

      {loading ? (
        <p className="text-xs text-neutral-400">Loading students...</p>
      ) : students.length === 0 ? (
        <Card className="p-8 text-center"><p className="text-xs text-neutral-500">No students registered yet.</p></Card>
      ) : (
        <div className="space-y-3">
          {students.map((s) => (
            <Card key={s._id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-neutral-100 border border-neutral-200"><GraduationCap className="w-4 h-4 text-neutral-700" /></div>
                <div>
                  <h3 className="text-xs font-semibold text-neutral-900">{s.name}</h3>
                  <p className="text-xs text-neutral-500">{s.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${s.emailVerified ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                  {s.emailVerified ? 'Active' : 'Suspended'}
                </span>
                <Button size="sm" variant="secondary" onClick={() => toggleStatus(s._id)}>
                  {s.emailVerified ? 'Suspend' : 'Activate'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
