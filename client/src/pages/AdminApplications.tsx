import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { api } from '../services/api';
import { ClipboardList } from 'lucide-react';

export const AdminApplications: React.FC = () => {
  const [applications, setApplications] = useState<any[]>([]);

  useEffect(() => {
    api.get('/applications').then((res) => {
      if (res.data?.data?.applications) setApplications(res.data.data.applications);
    }).catch(console.error);
  }, []);

  return (
    <div className="space-y-6">
      <div className="border-b border-neutral-200 pb-4">
        <h1 className="text-xl font-bold text-neutral-900">All Campus Applications</h1>
        <p className="text-xs text-neutral-500">Global monitor for student job applications across recruiters.</p>
      </div>

      <div className="space-y-3">
        {applications.map((app) => (
          <Card key={app._id} className="p-4 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold text-neutral-900">{app.student?.name} → {app.job?.title}</h3>
              <p className="text-xs text-neutral-500">{app.job?.company} • Status: {app.status}</p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-neutral-100 border border-neutral-200 text-neutral-700 uppercase">
              {app.status}
            </span>
          </Card>
        ))}
      </div>
    </div>
  );
};
