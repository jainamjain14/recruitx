import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { api } from '../services/api';
import { Send, Bell } from 'lucide-react';

export const AdminNotifications: React.FC = () => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetRole, setTargetRole] = useState('all');
  const [sending, setSending] = useState(false);

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      await api.post('/notifications/broadcast', { title, message, targetRole });
      alert('Notification broadcasted to users successfully!');
      setTitle('');
      setMessage('');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Broadcast failed');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="border-b border-neutral-200 pb-4">
        <h1 className="text-xl font-bold text-neutral-900">Broadcast Notifications</h1>
        <p className="text-xs text-neutral-500">Send real-time notifications to students, recruiters, or all users.</p>
      </div>

      <form onSubmit={handleBroadcast}>
        <Card className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-neutral-700 block mb-1">Target Audience</label>
            <select value={targetRole} onChange={(e) => setTargetRole(e.target.value)} className="w-full text-xs rounded-md border border-neutral-200 p-2.5 bg-white">
              <option value="all">All Users (Students & Recruiters)</option>
              <option value="student">Students Only</option>
              <option value="recruiter">Recruiters Only</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-700 block mb-1">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Placement Drive Announcement" required />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-700 block mb-1">Message Content</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="w-full text-xs rounded-md border border-neutral-200 p-3 focus:outline-none focus:ring-1 focus:ring-neutral-900"
              placeholder="Write announcement message..."
              required
            />
          </div>
          <Button type="submit" disabled={sending} className="flex items-center gap-2">
            <Send className="w-4 h-4" />
            {sending ? 'Sending...' : 'Broadcast Notification'}
          </Button>
        </Card>
      </form>
    </div>
  );
};
