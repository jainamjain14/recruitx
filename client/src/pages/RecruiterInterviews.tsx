import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { Video, Calendar, Clock } from 'lucide-react';

export const RecruiterInterviews: React.FC = () => {
  const [interviews, setInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchInterviews();
  }, []);

  const fetchInterviews = async () => {
    try {
      const res = await api.get('/interviews');
      if (res.data?.data?.interviews) setInterviews(res.data.data.interviews);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Extracts the room code from a meeting link.
   * Supports:
   *   /meeting/abc123          → abc123
   *   https://meet.jit.si/recruitx-abc123 → abc123
   */
  const getRoomPath = (meetingLink: string): string => {
    if (!meetingLink) return '';
    // Internal route
    const internalMatch = meetingLink.match(/\/meeting\/([^/?#]+)/);
    if (internalMatch) return `/meeting/${internalMatch[1]}`;
    // Legacy external Jitsi link — extract code after last dash
    const externalMatch = meetingLink.match(/recruitx-([^/?#]+)/);
    if (externalMatch) return `/meeting/${externalMatch[1]}`;
    // Fallback: open externally
    return meetingLink;
  };

  const handleJoin = (meetingLink: string) => {
    const path = getRoomPath(meetingLink);
    if (path.startsWith('/meeting/')) {
      navigate(path);
    } else {
      window.open(path, '_blank', 'noreferrer');
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-neutral-200 pb-4">
        <h1 className="text-xl font-bold text-neutral-900">Scheduled Interviews</h1>
        <p className="text-xs text-neutral-500">Track and conduct upcoming candidate video interviews.</p>
      </div>

      {loading ? (
        <p className="text-xs text-neutral-400">Loading interviews...</p>
      ) : interviews.length === 0 ? (
        <Card className="p-8 text-center space-y-3">
          <p className="text-xs text-neutral-500">No upcoming interviews scheduled.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {interviews.map((item) => (
            <Card key={item._id} className="p-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-neutral-900">{item.title}</h3>
                <p className="text-xs text-neutral-500">Candidate: {item.student?.name} ({item.student?.email})</p>
                <div className="flex items-center gap-4 text-[10px] text-neutral-400 mt-1">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(item.scheduledAt).toLocaleString()}</span>
                </div>
              </div>

              <Button
                size="sm"
                className="flex items-center gap-1.5"
                onClick={() => handleJoin(item.meetingLink)}
              >
                <Video className="w-3.5 h-3.5" /> Join as Host
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
