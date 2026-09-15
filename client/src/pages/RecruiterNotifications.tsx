import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { api } from '../services/api';
import { Bell } from 'lucide-react';

export const RecruiterNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    api.get('/notifications').then((res) => {
      if (res.data?.data?.notifications) setNotifications(res.data.data.notifications);
    }).catch(console.error);
  }, []);

  return (
    <div className="space-y-6">
      <div className="border-b border-neutral-200 pb-4">
        <h1 className="text-xl font-bold text-neutral-900">Notifications</h1>
        <p className="text-xs text-neutral-500">Real-time alerts for incoming job applications.</p>
      </div>

      {notifications.length === 0 ? (
        <Card className="p-8 text-center"><p className="text-xs text-neutral-500">No new notifications.</p></Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <Card key={n._id} className="p-4 flex items-start gap-3">
              <div className="p-2 rounded bg-neutral-100 border border-neutral-200"><Bell className="w-4 h-4 text-neutral-700" /></div>
              <div>
                <h3 className="text-xs font-semibold text-neutral-900">{n.title}</h3>
                <p className="text-xs text-neutral-600">{n.message}</p>
                <span className="text-[10px] text-neutral-400 mt-1 block">{new Date(n.createdAt).toLocaleString()}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
