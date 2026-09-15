import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { api } from '../services/api';
import { Send, MessageSquare, User, CheckCheck } from 'lucide-react';

interface CandidateContact {
  _id: string;
  name: string;
  email: string;
  fieldOfInterest: string;
  headline: string;
}

export const RecruiterMessages: React.FC = () => {
  const [candidates, setCandidates] = useState<CandidateContact[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateContact | null>(null);
  const [messages, setMessages] = useState<Record<string, { id: number; sender: string; text: string; time: string }[]>>({});
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    try {
      const res = await api.get('/jobs/candidates');
      const list = res.data?.data?.candidates || [];
      setCandidates(list);
      if (list.length > 0) {
        setSelectedCandidate(list[0]);
        setMessages({
          [list[0]._id]: [
            { id: 1, sender: list[0].name, text: `Hello! I am excited about the open opportunities in ${list[0].fieldOfInterest || 'your organization'}.`, time: '10:00 AM' },
          ],
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const currentChat = selectedCandidate ? (messages[selectedCandidate._id] || []) : [];

  const sendMsg = () => {
    if (!input.trim() || !selectedCandidate) return;

    const newMsg = {
      id: Date.now(),
      sender: 'You',
      text: input.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => ({
      ...prev,
      [selectedCandidate._id]: [...(prev[selectedCandidate._id] || []), newMsg],
    }));

    setInput('');
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-neutral-200 pb-4">
        <h1 className="text-xl font-bold text-neutral-900">Direct Candidate Messaging</h1>
        <p className="text-xs text-neutral-500">Reach out and converse with registered candidates and applicants.</p>
      </div>

      {loading ? (
        <p className="text-xs text-neutral-400">Loading messaging center...</p>
      ) : candidates.length === 0 ? (
        <Card className="p-8 text-center space-y-2">
          <MessageSquare className="w-8 h-8 text-neutral-400 mx-auto" />
          <p className="text-xs text-neutral-500">No candidates available to message yet.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Candidate Sidebar */}
          <Card className="p-0 overflow-hidden md:col-span-1 h-[520px] flex flex-col">
            <div className="p-3.5 border-b border-neutral-200 bg-neutral-50 font-semibold text-xs text-neutral-900">
              Active Candidates ({candidates.length})
            </div>
            <div className="divide-y divide-neutral-100 overflow-y-auto flex-1">
              {candidates.map((c) => (
                <button
                  key={c._id}
                  onClick={() => setSelectedCandidate(c)}
                  className={`w-full text-left p-3.5 transition-colors flex items-start gap-2.5 ${
                    selectedCandidate?._id === c._id ? 'bg-neutral-100' : 'hover:bg-neutral-50'
                  }`}
                >
                  <div className="p-2 rounded-full bg-neutral-200 text-neutral-700 shrink-0">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <div className="overflow-hidden">
                    <h4 className="text-xs font-bold text-neutral-900 truncate">{c.name}</h4>
                    <p className="text-[11px] text-neutral-500 truncate">{c.headline || c.fieldOfInterest || 'Student'}</p>
                    <span className="text-[10px] text-neutral-400 block mt-0.5">{c.email}</span>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          {/* Active Chat Thread */}
          <Card className="p-0 flex flex-col md:col-span-2 h-[520px]">
            {selectedCandidate ? (
              <>
                <div className="p-3.5 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-neutral-900">{selectedCandidate.name}</h3>
                    <p className="text-[11px] text-neutral-500">{selectedCandidate.fieldOfInterest} • {selectedCandidate.email}</p>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Active
                  </span>
                </div>

                <div className="flex-1 p-4 space-y-3 overflow-y-auto bg-neutral-50/30">
                  {currentChat.length === 0 ? (
                    <p className="text-xs text-neutral-400 text-center py-10">Start a conversation with {selectedCandidate.name}.</p>
                  ) : (
                    currentChat.map((m) => (
                      <div key={m.id} className={`flex flex-col ${m.sender === 'You' ? 'items-end' : 'items-start'}`}>
                        <div
                          className={`max-w-md px-3.5 py-2.5 rounded-lg text-xs leading-relaxed ${
                            m.sender === 'You'
                              ? 'bg-neutral-900 text-white'
                              : 'bg-white text-neutral-800 border border-neutral-200 shadow-sm'
                          }`}
                        >
                          {m.text}
                        </div>
                        <div className="flex items-center gap-1 text-[9px] text-neutral-400 mt-1">
                          <span>{m.sender}</span>
                          <span>•</span>
                          <span>{m.time}</span>
                          {m.sender === 'You' && <CheckCheck className="w-3 h-3 text-emerald-600" />}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-3 border-t border-neutral-200 flex gap-2 bg-white">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={`Message ${selectedCandidate.name}...`}
                    onKeyDown={(e) => e.key === 'Enter' && sendMsg()}
                  />
                  <Button onClick={sendMsg}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-neutral-400">
                Select a candidate from the left to start messaging.
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};
