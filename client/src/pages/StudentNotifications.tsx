import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { api } from '../services/api';
import { Bell, Check, Info } from 'lucide-react';

export const StudentNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      if (res.data?.data?.notifications) {
        setNotifications(res.data.data.notifications);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const markRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(notifications.map((n) => (n._id === id ? { ...n, read: true } : n)));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-neutral-200 pb-4">
        <h1 className="text-xl font-bold text-neutral-900">Notifications</h1>
        <p className="text-xs text-neutral-500">Real-time alerts for application status changes and interviews.</p>
      </div>

      {loading ? (
        <p className="text-xs text-neutral-400">Loading notifications...</p>
      ) : notifications.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-xs text-neutral-500">No notifications found.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <Card key={n._id} className={`p-4 flex items-start justify-between ${n.read ? 'bg-white' : 'bg-neutral-50 border-neutral-300'}`}>
              <div className="flex gap-3">
                <div className="p-2 rounded-md bg-neutral-100 border border-neutral-200 shrink-0">
                  <Bell className="w-4 h-4 text-neutral-700" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-neutral-900">{n.title}</h3>
                  <p className="text-xs text-neutral-600 mt-0.5">{n.message}</p>
                  <span className="text-[10px] text-neutral-400 mt-1 block">{new Date(n.createdAt).toLocaleString()}</span>
                </div>
              </div>

              {!n.read && (
                <button onClick={() => markRead(n._id)} className="text-xs text-neutral-500 hover:text-neutral-900 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Mark read
                </button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
