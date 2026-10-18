import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { api } from '../services/api';
import { messageService, ChatContact, ChatMessage } from '../services/messageService';
import { useAuth } from '../hooks/useAuth';
import {
  Send,
  MessageSquare,
  User,
  CheckCheck,
  Search,
  Loader2,
  ArrowRight,
  Video,
  Calendar,
  X,
  ExternalLink,
} from 'lucide-react';

interface RecruiterContact extends ChatContact {
  headline?: string;
  fieldOfInterest?: string;
  lastMessageText?: string;
  lastMessageTime?: string;
  unreadCount?: number;
}

const formatMessageTime = (dateStr: string) => {
  try {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

export const RecruiterMessages: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const urlRecipientId = searchParams.get('recipientId');
  const urlRecipientName = searchParams.get('name');

  const [contacts, setContacts] = useState<RecruiterContact[]>([]);
  const [selectedContact, setSelectedContact] = useState<RecruiterContact | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Meeting Proposal Modal State
  const [meetingModalOpen, setMeetingModalOpen] = useState(false);
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [meetingPlatform, setMeetingPlatform] = useState<'google_meet' | 'jitsi'>('google_meet');
  const [proposingMeeting, setProposingMeeting] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Autofocus input when contact changes
  useEffect(() => {
    if (selectedContact) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [selectedContact?._id]);

  // Load candidates and existing conversation threads
  const loadContactsAndConversations = useCallback(async () => {
    try {
      setLoadingContacts(true);
      const [convRes, candidatesRes] = await Promise.allSettled([
        messageService.getConversations(),
        api.get('/jobs/candidates'),
      ]);

      const existingConversations = convRes.status === 'fulfilled' ? convRes.value : [];
      const candidates = candidatesRes.status === 'fulfilled' ? (candidatesRes.value.data?.data?.candidates || []) : [];

      const contactMap = new Map<string, RecruiterContact>();

      // 1. Add candidates who already have conversations
      for (const conv of existingConversations) {
        if (conv.contact && conv.contact._id) {
          contactMap.set(conv.contact._id, {
            ...conv.contact,
            lastMessageText: conv.lastMessage?.content || '',
            lastMessageTime: conv.lastMessage?.createdAt ? formatMessageTime(conv.lastMessage.createdAt) : undefined,
            unreadCount: conv.unreadCount || 0,
          });
        }
      }

      // 2. Add remaining registered candidates
      for (const cand of candidates) {
        if (cand._id && cand._id !== user?._id && !contactMap.has(cand._id)) {
          contactMap.set(cand._id, {
            _id: cand._id,
            name: cand.name,
            email: cand.email,
            role: 'student',
            headline: cand.headline,
            fieldOfInterest: cand.fieldOfInterest,
            unreadCount: 0,
          });
        } else {
          // Merge headline / fieldOfInterest info
          const existing = contactMap.get(cand._id)!;
          existing.headline = cand.headline || existing.headline;
          existing.fieldOfInterest = cand.fieldOfInterest || existing.fieldOfInterest;
        }
      }

      // 3. If URL has recipientId (e.g. from ATS Kanban -> Send Direct Message)
      if (urlRecipientId && !contactMap.has(urlRecipientId)) {
        contactMap.set(urlRecipientId, {
          _id: urlRecipientId,
          name: urlRecipientName || 'Candidate',
          role: 'student',
          unreadCount: 0,
        });
      }

      const contactList = Array.from(contactMap.values());
      setContacts(contactList);

      setSelectedContact((current) => {
        if (urlRecipientId && contactMap.has(urlRecipientId)) {
          return contactMap.get(urlRecipientId)!;
        }
        if (current && contactMap.has(current._id)) {
          return contactMap.get(current._id)!;
        }
        return contactList[0] || null;
      });
    } catch (err) {
      console.error('Failed to load messaging contacts:', err);
    } finally {
      setLoadingContacts(false);
    }
  }, [urlRecipientId, urlRecipientName]);

  useEffect(() => {
    loadContactsAndConversations();
  }, [loadContactsAndConversations]);

  // Fetch conversation messages when selectedContact changes
  const loadActiveConversation = useCallback(async (contactId: string) => {
    try {
      setLoadingMessages(true);
      const res = await messageService.getConversation(contactId);
      setMessages(res.messages || []);

      // Clear unread count locally for this contact
      setContacts((prev) =>
        prev.map((c) => (c._id === contactId ? { ...c, unreadCount: 0 } : c))
      );
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (selectedContact?._id) {
      loadActiveConversation(selectedContact._id);
    }
  }, [selectedContact?._id, loadActiveConversation]);

  // Listen for real-time incoming messages
  useEffect(() => {
    const handleIncomingMessage = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { message } = customEvent.detail || {};

      if (!message) return;

      const senderId = typeof message.sender === 'object' ? message.sender._id : message.sender;

      // If message is from currently open contact
      if (selectedContact && senderId === selectedContact._id) {
        setMessages((prev) => [...prev, message]);
        messageService.markConversationRead(selectedContact._id);
      }

      // Update sidebar contact list preview
      setContacts((prev) =>
        prev.map((c) => {
          if (c._id === senderId) {
            return {
              ...c,
              lastMessageText: message.content,
              lastMessageTime: formatMessageTime(message.createdAt || new Date().toISOString()),
              unreadCount: selectedContact?._id === senderId ? 0 : (c.unreadCount || 0) + 1,
            };
          }
          return c;
        })
      );
    };

    window.addEventListener('recruitx:message', handleIncomingMessage);
    return () => {
      window.removeEventListener('recruitx:message', handleIncomingMessage);
    };
  }, [selectedContact]);

  // Send message
  const handleSend = async () => {
    if (!input.trim() || !selectedContact || sending) return;

    const textToSend = input.trim();
    setInput('');
    setSending(true);

    try {
      const sentMessage = await messageService.sendMessage(selectedContact._id, textToSend);

      // Append to message window
      setMessages((prev) => [...prev, sentMessage]);

      // Update contact list preview
      setContacts((prev) =>
        prev.map((c) =>
          c._id === selectedContact._id
            ? {
                ...c,
                lastMessageText: textToSend,
                lastMessageTime: formatMessageTime(new Date().toISOString()),
              }
            : c
        )
      );

      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } catch (err) {
      console.error('Failed to send message:', err);
      setInput(textToSend);
    } finally {
      setSending(false);
    }
  };

  const filteredContacts = contacts.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.headline && c.headline.toLowerCase().includes(q)) ||
      (c.fieldOfInterest && c.fieldOfInterest.toLowerCase().includes(q))
    );
  });

  const handleProposeMeeting = async () => {
    if (!selectedContact || !meetingDate || !meetingTime) return;
    setProposingMeeting(true);
    try {
      const dt = new Date(`${meetingDate}T${meetingTime}`);
      const meetingId = Math.random().toString(36).substring(2, 9);
      const meetingLink = `/meeting/recruitx-${meetingId.toLowerCase()}`;
      const meetingNote = `Interview scheduled for ${dt.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })} at ${dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

      // 1. Create official interview record on the server so it appears in Scheduled Interviews
      try {
        await api.post('/interviews', {
          studentId: selectedContact._id,
          title: 'Candidate Interview',
          scheduledAt: dt.toISOString(),
          meetingLink,
        });
      } catch (errSched) {
        console.warn('Recruiter interview creation note:', errSched);
      }

      // 2. Send the interactive chat card message
      const meetingInfo = {
        title: 'Interview Meeting',
        scheduledAt: dt.toISOString(),
        meetingLink,
        platform: 'RecruitX Video',
        status: 'proposed' as const,
      };

      const sentMessage = await messageService.sendMessage(
        selectedContact._id,
        `📅 Interview Meeting Scheduled\n\nDate: ${meetingNote}\nMeeting Link: ${meetingLink}`,
        meetingInfo
      );
      setMessages((prev) => [...prev, sentMessage]);
      setContacts((prev) =>
        prev.map((c) =>
          c._id === selectedContact._id
            ? { ...c, lastMessageText: 'Interview Meeting Scheduled', lastMessageTime: formatMessageTime(new Date().toISOString()) }
            : c
        )
      );
      setMeetingModalOpen(false);
      setMeetingDate('');
      setMeetingTime('');
      alert('🎉 Interview invitation scheduled and dispatched to candidate!');
    } catch (err) {
      console.error('Failed to propose meeting:', err);
      alert('Failed to schedule meeting. Please try again.');
    } finally {
      setProposingMeeting(false);
    }
  };

  return (
    <div className="space-y-4 max-w-6xl">
      <div className="border-b border-neutral-200 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-neutral-900" />
            Candidate Communications
          </h1>
          <p className="text-xs text-neutral-500">
            Direct messaging with applicants and candidates.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-neutral-100 text-neutral-700 border border-neutral-200">
            Messaging
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Contacts Sidebar */}
        <Card className="p-0 overflow-hidden md:col-span-1 h-[640px] flex flex-col border border-neutral-200 shadow-xs">
          <div className="p-3.5 border-b border-neutral-200 bg-neutral-50 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-900">Candidates & Applicants</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-200 text-neutral-700">
                {contacts.length}
              </span>
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search candidate name or skill..."
                className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-neutral-200 bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900"
              />
            </div>
          </div>

          <div className="divide-y divide-neutral-100 overflow-y-auto flex-1">
            {loadingContacts ? (
              <div className="p-10 text-center text-xs text-neutral-400 space-y-2">
                <Loader2 className="w-5 h-5 animate-spin mx-auto text-neutral-400" />
                <p>Loading candidate roster...</p>
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="p-8 text-center space-y-2 text-xs text-neutral-400">
                <User className="w-8 h-8 text-neutral-300 mx-auto" />
                <p className="font-semibold text-neutral-600">No candidates found</p>
                <p className="text-[11px] text-neutral-400">
                  {searchQuery ? 'Try adjusting your search terms.' : 'Applicants and candidates will appear here.'}
                </p>
              </div>
            ) : (
              filteredContacts.map((c) => {
                const isSelected = selectedContact?._id === c._id;
                return (
                  <button
                    key={c._id}
                    onClick={() => setSelectedContact(c)}
                    className={`w-full text-left p-3.5 transition-colors flex items-start gap-3 border-l-4 ${
                      isSelected ? 'bg-neutral-100 border-l-neutral-900' : 'border-l-transparent hover:bg-neutral-50'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <div className="w-9 h-9 rounded-full bg-neutral-900 text-white flex items-center justify-center font-bold text-xs uppercase">
                        {c.name.slice(0, 2)}
                      </div>
                      {(c.unreadCount || 0) > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center border-2 border-white">
                          {c.unreadCount}
                        </span>
                      )}
                    </div>

                    <div className="overflow-hidden flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-xs font-bold text-neutral-900 truncate">{c.name}</h4>
                        {c.lastMessageTime && (
                          <span className="text-[10px] text-neutral-400 shrink-0">
                            {c.lastMessageTime}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-neutral-600 truncate mt-0.5 font-medium">
                        {c.headline || c.fieldOfInterest || c.email}
                      </p>
                      <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                        {c.lastMessageText || 'Tap to view chat thread'}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </Card>

        {/* Active Chat Box */}
        <Card className="p-0 flex flex-col md:col-span-2 h-[640px] border border-neutral-200 shadow-xs overflow-hidden">
          {selectedContact ? (
            <>
              {/* Chat Header */}
              <div className="p-3.5 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-neutral-900 text-white flex items-center justify-center font-bold text-sm uppercase shrink-0">
                    {selectedContact.name.slice(0, 2)}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                      {selectedContact.name}
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-neutral-200 text-neutral-700">
                        Candidate
                      </span>
                    </h3>
                    <p className="text-[11px] text-neutral-500 mt-0.5">
                      {selectedContact.headline || selectedContact.fieldOfInterest || selectedContact.email}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMeetingModalOpen(true)}
                  className="text-[11px] gap-1.5 h-7 px-3 shrink-0"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Propose Interview Meeting
                </Button>
              </div>

              {/* Message Scroll Window */}
              <div className="flex-1 p-4 space-y-3 overflow-y-auto bg-neutral-50/40">
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full text-xs text-neutral-400">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Loading chat history...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-8 px-4 space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-600">
                      <MessageSquare className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-neutral-800">
                        Start conversation with {selectedContact.name}
                      </h4>
                      <p className="text-xs text-neutral-500 max-w-sm mt-1">
                        Connect with {selectedContact.name} regarding job application status, interview schedules, or assessment details.
                      </p>
                    </div>

                    {/* Quick Recruiter Templates */}
                    <div className="w-full max-w-md space-y-2 pt-2">
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                        Quick Recruiter Prompts
                      </p>
                      <div className="flex flex-col gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            const msg = `Hi ${selectedContact.name}, we reviewed your profile and would like to invite you for an interview round. Could you please share your availability this week?`;
                            setInput(msg);
                            setTimeout(() => inputRef.current?.focus(), 50);
                          }}
                          className="text-left text-xs p-2.5 rounded-lg bg-white hover:bg-neutral-100 hover:border-neutral-300 border border-neutral-200 text-neutral-700 transition-colors flex items-center justify-between group shadow-2xs"
                        >
                          <span>📅 Request candidate availability for interview</span>
                          <ArrowRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-900 transition-colors" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const msg = `Hello ${selectedContact.name}, congratulations! We are pleased to inform you that you have successfully advanced to the next stage of our selection process.`;
                            setInput(msg);
                            setTimeout(() => inputRef.current?.focus(), 50);
                          }}
                          className="text-left text-xs p-2.5 rounded-lg bg-white hover:bg-neutral-100 hover:border-neutral-300 border border-neutral-200 text-neutral-700 transition-colors flex items-center justify-between group shadow-2xs"
                        >
                          <span>🎉 Inform candidate of advancement to next stage</span>
                          <ArrowRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-900 transition-colors" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  messages.map((m) => {
                    const senderId = typeof m.sender === 'object' ? m.sender._id : m.sender;
                    const isMe = senderId === user?._id;

                    return (
                      <div
                        key={m._id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        {m.meetingInfo ? (
                          <div className={`max-w-sm p-4 rounded-2xl border shadow-sm space-y-2.5 text-xs ${
                            isMe
                              ? 'bg-neutral-900 text-white border-neutral-800'
                              : 'bg-white text-neutral-900 border-neutral-200'
                          }`}>
                            <div className="flex items-center gap-2">
                              <div className={`p-1.5 rounded-lg ${isMe ? 'bg-neutral-800 text-white' : 'bg-neutral-100 text-neutral-800'}`}>
                                <Video className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="font-bold">{m.meetingInfo.title}</p>
                                <p className={`text-[10px] ${isMe ? 'text-neutral-400' : 'text-neutral-500'}`}>{m.meetingInfo.platform || 'Online Video Meeting'}</p>
                              </div>
                            </div>
                            <div className="space-y-1 text-[11px] pt-1 border-t border-neutral-700/50">
                              <p className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                                <span>{m.meetingInfo.scheduledAt}</span>
                              </p>
                            </div>
                            <a
                              href={m.meetingInfo.meetingLink}
                              target="_blank"
                              rel="noreferrer"
                              className={`mt-2 w-full py-1.5 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-colors ${
                                isMe
                                  ? 'bg-white text-neutral-900 hover:bg-neutral-100'
                                  : 'bg-neutral-900 text-white hover:bg-neutral-800'
                              }`}
                            >
                              <span>Join Online Meeting</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        ) : (
                          <div
                            className={`max-w-md px-4 py-2.5 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                              isMe
                                ? 'bg-neutral-900 text-white rounded-br-xs shadow-xs'
                                : 'bg-white text-neutral-800 border border-neutral-200 shadow-xs rounded-bl-xs'
                            }`}
                          >
                            {m.content}
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-[9px] text-neutral-400 mt-1 px-1">
                          <span>{isMe ? 'You' : selectedContact.name}</span>
                          <span>•</span>
                          <span>{formatMessageTime(m.createdAt)}</span>
                          {isMe && (
                            <CheckCheck
                              className={`w-3 h-3 ${m.read ? 'text-blue-500' : 'text-neutral-400'}`}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Composer */}
              <div className="p-3 border-t border-neutral-200 bg-white space-y-2">
                <div className="flex items-end gap-2">
                  <div className="flex-1 relative">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={`Write message to ${selectedContact.name}...`}
                      rows={2}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      disabled={sending}
                      className="w-full text-xs p-2.5 rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent resize-none leading-relaxed"
                    />
                  </div>
                  <Button
                    onClick={handleSend}
                    disabled={!input.trim() || sending}
                    className="h-10 px-4 rounded-xl flex items-center gap-1.5 shrink-0"
                  >
                    {sending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span className="hidden sm:inline text-xs font-semibold">Send</span>
                      </>
                    )}
                  </Button>
                </div>
                <div className="flex items-center justify-between text-[10px] text-neutral-400 px-1">
                  <span>Candidate communication channel</span>
                  <span>Press <kbd className="px-1.5 py-0.5 rounded bg-neutral-100 border text-neutral-600 font-mono text-[9px]">Enter ↵</kbd> to send</span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-400">
                <User className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-800">Select a Candidate</h3>
                <p className="text-xs text-neutral-500 max-w-sm mt-1">
                  Select a candidate from the left directory to view their conversation and send messages.
                </p>
              </div>
              {contacts.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedContact(contacts[0])}
                  className="text-xs"
                >
                  Open Chat with {contacts[0].name}
                </Button>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* ============================================================== */}
      {/* INTERVIEW MEETING PROPOSAL MODAL */}
      {/* ============================================================== */}
      {meetingModalOpen && selectedContact && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-5 border border-neutral-200">
            <div className="flex items-start justify-between border-b border-neutral-100 pb-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Video className="w-4 h-4 text-neutral-800" />
                  <h3 className="text-base font-bold text-neutral-900">Propose Interview Meeting</h3>
                </div>
                <p className="text-xs text-neutral-500">
                  Schedule an online interview with <strong>{selectedContact.name}</strong>. A meeting link will be shared in chat.
                </p>
              </div>
              <button
                onClick={() => setMeetingModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-700 block">Date</label>
                  <input
                    type="date"
                    value={meetingDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setMeetingDate(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-700 block">Time</label>
                  <input
                    type="time"
                    value={meetingTime}
                    onChange={(e) => setMeetingTime(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-700 block">Platform</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['google_meet', 'jitsi'] as const).map((platform) => (
                    <button
                      key={platform}
                      type="button"
                      onClick={() => setMeetingPlatform(platform)}
                      className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center gap-2 transition-all ${
                        meetingPlatform === platform
                          ? 'bg-neutral-900 text-white border-neutral-900'
                          : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                      }`}
                    >
                      <Video className="w-3.5 h-3.5 shrink-0" />
                      {platform === 'google_meet' ? 'Google Meet' : 'Jitsi Meet'}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-neutral-400 flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" />
                  A {meetingPlatform === 'google_meet' ? 'Google Meet' : 'Jitsi Meet'} link will be auto-generated and shared in the chat.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
              <Button variant="outline" size="sm" onClick={() => setMeetingModalOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleProposeMeeting}
                disabled={proposingMeeting || !meetingDate || !meetingTime}
                className="text-xs gap-1.5"
              >
                {proposingMeeting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Calendar className="w-3.5 h-3.5" />
                )}
                {proposingMeeting ? 'Sending...' : 'Send Meeting Invitation'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
