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
  Building2,
  CheckCheck,
  Search,
  Loader2,
  Sparkles,
  ShieldCheck,
  User,
  ArrowRight,
  Calendar,
  Video,
  Clock,
  ExternalLink,
  X,
} from 'lucide-react';

interface StudentContact extends ChatContact {
  lastMessageText?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  jobTitle?: string;
}

const formatMessageTime = (dateStr: string) => {
  try {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

export const StudentMessages: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const urlRecipientId = searchParams.get('recipientId');
  const urlRecipientName = searchParams.get('name');
  const urlCompany = searchParams.get('company');
  const urlJobTitle = searchParams.get('jobTitle');

  const [contacts, setContacts] = useState<StudentContact[]>([]);
  const [selectedContact, setSelectedContact] = useState<StudentContact | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Meeting Schedule Modal State
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState('Online Video Interview');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('11:00');
  const [meetingPlatform, setMeetingPlatform] = useState<'google_meet' | 'jitsi' | 'custom'>('google_meet');
  const [customMeetingUrl, setCustomMeetingUrl] = useState('');
  const [proposingMeeting, setProposingMeeting] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Autofocus message input when contact changes
  useEffect(() => {
    if (selectedContact) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [selectedContact?._id]);

  // Load conversation threads + active recruiters from directory, applications, and campus jobs
  const loadConversations = useCallback(async () => {
    try {
      setLoadingContacts(true);
      const [convRes, recruitersRes, appsRes, jobsRes] = await Promise.allSettled([
        messageService.getConversations(),
        messageService.getRecruiterContacts(),
        api.get('/applications'),
        api.get('/jobs'),
      ]);

      const conversations = convRes.status === 'fulfilled' ? convRes.value : [];
      const platformRecruiters = recruitersRes.status === 'fulfilled' ? recruitersRes.value : [];
      const applications = appsRes.status === 'fulfilled' ? (appsRes.value.data?.data?.applications || []) : [];
      const jobs = jobsRes.status === 'fulfilled' ? (jobsRes.value.data?.data?.jobs || []) : [];

      const contactMap = new Map<string, StudentContact>();

      // 1. Existing active conversation threads
      for (const conv of conversations) {
        if (conv.contact && conv.contact._id) {
          contactMap.set(conv.contact._id, {
            ...conv.contact,
            lastMessageText: conv.lastMessage?.content || '',
            lastMessageTime: conv.lastMessage?.createdAt ? formatMessageTime(conv.lastMessage.createdAt) : undefined,
            unreadCount: conv.unreadCount || 0,
          });
        }
      }

      // 2. Add verified recruiters and campus placement coordinators
      for (const rec of platformRecruiters) {
        if (rec._id && rec._id !== user?._id && !contactMap.has(rec._id)) {
          contactMap.set(rec._id, {
            _id: rec._id,
            name: rec.name,
            email: rec.email || '',
            company: rec.company || (rec.role === 'admin' ? 'Campus Placement Cell' : 'Corporate Partner'),
            role: rec.role || 'recruiter',
            lastMessageText: rec.role === 'admin' ? 'Placement Officer • Campus Coordination' : 'Talent Acquisition Team',
            unreadCount: 0,
          });
        }
      }

      // 3. Add recruiters from candidate's applied jobs
      for (const app of applications) {
        const rId = typeof app.recruiter === 'object' && app.recruiter?._id ? app.recruiter._id : app.recruiter;
        const rName = typeof app.recruiter === 'object' && app.recruiter?.name
          ? app.recruiter.name
          : (app.companyName ? `${app.companyName} Hiring Team` : 'Hiring Manager');
        const rCompany = app.companyName || app.job?.company || 'Corporate Partner';

        if (rId && rId !== user?._id) {
          if (!contactMap.has(rId)) {
            contactMap.set(rId, {
              _id: rId,
              name: rName,
              email: (app.recruiter as any)?.email || '',
              company: rCompany,
              role: 'recruiter',
              jobTitle: app.jobTitle || app.job?.title,
              lastMessageText: `Applied for ${app.jobTitle || app.job?.title || 'Open Role'}`,
              unreadCount: 0,
            });
          } else {
            // Update company or job title if more specific
            const existing = contactMap.get(rId)!;
            if (!existing.company || existing.company === 'Corporate Partner') {
              existing.company = rCompany;
            }
          }
        }
      }

      // 4. Add recruiters from active campus vacancies
      for (const job of jobs) {
        const rId = typeof job.recruiter === 'object' && job.recruiter?._id ? job.recruiter._id : job.recruiter;
        const rName = typeof job.recruiter === 'object' && job.recruiter?.name ? job.recruiter.name : `${job.company || 'Campus Partner'} Hiring Lead`;
        const rCompany = job.company || 'Campus Partner';

        if (rId && rId !== user?._id && !contactMap.has(rId)) {
          contactMap.set(rId, {
            _id: rId,
            name: rName,
            email: (job.recruiter as any)?.email || '',
            company: rCompany,
            role: 'recruiter',
            lastMessageText: `Hiring: ${job.title}`,
            unreadCount: 0,
          });
        }
      }

      // 5. If URL has recipientId (e.g. from Applications -> Message Hiring Manager)
      if (urlRecipientId) {
        if (!contactMap.has(urlRecipientId)) {
          contactMap.set(urlRecipientId, {
            _id: urlRecipientId,
            name: urlRecipientName || (urlCompany ? `${urlCompany} Hiring Manager` : 'Hiring Manager'),
            email: '',
            company: urlCompany || 'Hiring Team',
            role: 'recruiter',
            jobTitle: urlJobTitle || undefined,
            lastMessageText: urlJobTitle ? `Applied for ${urlJobTitle}` : 'Direct recruiter channel',
            unreadCount: 0,
          });
        }
      }

      const contactList = Array.from(contactMap.values());
      // Sort contacts: active message threads first, then corporate recruiters, then placement cell
      contactList.sort((a, b) => {
        if (a.lastMessageText && !b.lastMessageText) return -1;
        if (!a.lastMessageText && b.lastMessageText) return 1;
        if (a.role === 'recruiter' && b.role !== 'recruiter') return -1;
        if (a.role !== 'recruiter' && b.role === 'recruiter') return 1;
        return 0;
      });
      setContacts(contactList);

      // Select active contact
      setSelectedContact((current) => {
        if (urlRecipientId && contactMap.has(urlRecipientId)) {
          return contactMap.get(urlRecipientId)!;
        }
        if (urlCompany) {
          const compMatch = contactList.find(
            (c) => c.company && c.company.toLowerCase() === urlCompany.toLowerCase()
          );
          if (compMatch) return compMatch;
        }
        if (current && contactMap.has(current._id)) {
          return contactMap.get(current._id)!;
        }
        // Always prioritize corporate recruiters over admin
        const firstRecruiter = contactList.find(c => c.role === 'recruiter') || contactList[0];
        return firstRecruiter || null;
      });
    } catch (err) {
      console.error('Failed to load student conversations:', err);
    } finally {
      setLoadingContacts(false);
    }
  }, [urlRecipientId, urlRecipientName, urlCompany, urlJobTitle]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

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

      // Keep focus on input for fast rapid chat
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } catch (err) {
      console.error('Failed to send message:', err);
      // Restore input text so user does not lose their typed message
      setInput(textToSend);
    } finally {
      setSending(false);
    }
  };

  const handleProposeMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContact || proposingMeeting) return;

    setProposingMeeting(true);
    try {
      const scheduledDateTime = meetingDate ? `${meetingDate} at ${meetingTime}` : `Tomorrow at ${meetingTime}`;
      const roomId = `recruitx-${Math.random().toString(36).substring(2, 9)}`;
      const meetingLink =
        meetingPlatform === 'google_meet'
          ? `https://meet.google.com/${roomId}`
          : meetingPlatform === 'jitsi'
          ? `https://meet.jit.si/${roomId}`
          : customMeetingUrl || `https://meet.google.com/${roomId}`;

      const meetingInfo = {
        title: meetingTitle || 'Online Technical Interview',
        scheduledAt: scheduledDateTime,
        durationMinutes: 45,
        meetingLink,
        platform: meetingPlatform === 'google_meet' ? 'Google Meet' : meetingPlatform === 'jitsi' ? 'Jitsi Meet' : 'Online Conference',
        status: 'proposed' as const,
      };

      const messageContent = `📅 Interview Meeting Proposed: ${meetingInfo.title} on ${scheduledDateTime}\nJoin Link: ${meetingLink}`;
      const sentMessage = await messageService.sendMessage(selectedContact._id, messageContent, meetingInfo);

      setMessages((prev) => [...prev, sentMessage]);
      setShowMeetingModal(false);
      setMeetingDate('');
      setCustomMeetingUrl('');
    } catch (err) {
      console.error('Failed to propose meeting:', err);
    } finally {
      setProposingMeeting(false);
    }
  };

  const filteredContacts = contacts.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.company && c.company.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.jobTitle && c.jobTitle.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-4 max-w-6xl">
      <div className="border-b border-neutral-200 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            Recruiter Messages
          </h1>
          <p className="text-xs text-neutral-500">
            Real-time direct messaging with company hiring managers, talent scouts, and campus placement officers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Real-time Chat Active
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Contacts Sidebar */}
        <Card className="p-0 overflow-hidden md:col-span-1 h-[640px] flex flex-col border border-neutral-200 shadow-xs">
          <div className="p-3.5 border-b border-neutral-200 bg-neutral-50 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-900">Hiring Teams & Recruiters</span>
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
                placeholder="Search recruiter or company..."
                className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-neutral-200 bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900"
              />
            </div>
          </div>

          <div className="divide-y divide-neutral-100 overflow-y-auto flex-1">
            {loadingContacts ? (
              <div className="p-10 text-center text-xs text-neutral-400 space-y-2">
                <Loader2 className="w-5 h-5 animate-spin mx-auto text-neutral-400" />
                <p>Loading recruiters...</p>
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="p-8 text-center space-y-2 text-xs text-neutral-400">
                <Building2 className="w-8 h-8 text-neutral-300 mx-auto" />
                <p className="font-semibold text-neutral-600">No recruiters found</p>
                <p className="text-[11px] text-neutral-400">
                  {searchQuery ? 'Try matching another company or name' : 'Your applications and partner recruiters will appear here.'}
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
                      isSelected ? 'bg-blue-50/50 border-l-blue-600' : 'border-l-transparent hover:bg-neutral-50'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs uppercase ${
                        isSelected ? 'bg-blue-600 text-white' : 'bg-neutral-900 text-white'
                      }`}>
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
                      <p className="text-[11px] text-neutral-700 truncate mt-0.5 font-medium flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-neutral-400 shrink-0" />
                        {c.company || 'Hiring Partner'}
                      </p>
                      <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                        {c.lastMessageText || (c.jobTitle ? `Role: ${c.jobTitle}` : 'Tap to open chat')}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </Card>

        {/* Active Chat Area */}
        <Card className="p-0 flex flex-col md:col-span-2 h-[640px] border border-neutral-200 shadow-xs overflow-hidden">
          {selectedContact ? (
            <>
              {/* Chat Header */}
              <div className="p-3.5 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm uppercase shrink-0">
                    {selectedContact.name.slice(0, 2)}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                      {selectedContact.name}
                      {selectedContact.role === 'admin' ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                          Placement Cell
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          Recruiter
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] text-neutral-500 flex items-center gap-1 mt-0.5">
                      <Building2 className="w-3 h-3 text-neutral-400" />
                      <span>{selectedContact.company || 'Corporate Recruiting Team'}</span>
                      {selectedContact.jobTitle && (
                        <>
                          <span className="text-neutral-300">•</span>
                          <span className="text-neutral-600 font-medium">{selectedContact.jobTitle}</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Verified Channel
                </div>
              </div>

              {/* Message Scroll Window */}
              <div className="flex-1 p-4 space-y-3 overflow-y-auto bg-neutral-50/40">
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full text-xs text-neutral-400">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Loading conversation...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-8 px-4 space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                      <MessageSquare className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-neutral-800">
                        Start conversation with {selectedContact.name}
                      </h4>
                      <p className="text-xs text-neutral-500 max-w-sm mt-1">
                        {selectedContact.company
                          ? `You are connected directly with the recruitment team at ${selectedContact.company}.`
                          : 'You are connected directly with this hiring team.'} Feel free to introduce yourself or inquire about the hiring process.
                      </p>
                    </div>

                    {/* Quick Icebreaker Buttons */}
                    <div className="w-full max-w-md space-y-2 pt-2">
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                        Quick Conversation Starters
                      </p>
                      <div className="flex flex-col gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            const msg = `Hi ${selectedContact.name}, I recently applied for a role at ${selectedContact.company || 'your company'} and wanted to check in regarding the status of my application. Thank you!`;
                            setInput(msg);
                            setTimeout(() => inputRef.current?.focus(), 50);
                          }}
                          className="text-left text-xs p-2.5 rounded-lg bg-white hover:bg-blue-50 hover:border-blue-200 border border-neutral-200 text-neutral-700 transition-colors flex items-center justify-between group shadow-2xs"
                        >
                          <span>👋 Inquire about application status</span>
                          <ArrowRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-blue-600 transition-colors" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const msg = `Hello! Could you please share more information regarding the upcoming interview rounds and timeline for ${selectedContact.company || 'this role'}?`;
                            setInput(msg);
                            setTimeout(() => inputRef.current?.focus(), 50);
                          }}
                          className="text-left text-xs p-2.5 rounded-lg bg-white hover:bg-blue-50 hover:border-blue-200 border border-neutral-200 text-neutral-700 transition-colors flex items-center justify-between group shadow-2xs"
                        >
                          <span>📅 Ask about interview rounds & scheduling</span>
                          <ArrowRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-blue-600 transition-colors" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const msg = `Hi ${selectedContact.name}, I am very interested in opportunities at ${selectedContact.company || 'your team'} and would welcome the chance to discuss how my skill set matches your team's needs.`;
                            setInput(msg);
                            setTimeout(() => inputRef.current?.focus(), 50);
                          }}
                          className="text-left text-xs p-2.5 rounded-lg bg-white hover:bg-blue-50 hover:border-blue-200 border border-neutral-200 text-neutral-700 transition-colors flex items-center justify-between group shadow-2xs"
                        >
                          <span>✨ Introduce profile & career interest</span>
                          <ArrowRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-blue-600 transition-colors" />
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
                              <p className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-amber-400" />
                                <span>Duration: {m.meetingInfo.durationMinutes} mins</span>
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

              {/* Message Composer (Input Box) - ALWAYS VISIBLE */}
              <div className="p-3 border-t border-neutral-200 bg-white space-y-2">
                <div className="flex items-center justify-between pb-1">
                  <span className="text-[11px] font-medium text-neutral-500">Quick Actions:</span>
                  <button
                    type="button"
                    onClick={() => setShowMeetingModal(true)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-200 transition-colors"
                  >
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    <span>Propose Interview Meeting</span>
                  </button>
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex-1 relative">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={`Write a message to ${selectedContact.name}...`}
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
                  <span>Direct message with verified recruiter</span>
                  <span>Press <kbd className="px-1.5 py-0.5 rounded bg-neutral-100 border text-neutral-600 font-mono text-[9px]">Enter ↵</kbd> to send</span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-400">
                <Building2 className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-800">Select a Recruiter to Start Chatting</h3>
                <p className="text-xs text-neutral-500 max-w-sm mt-1">
                  Choose a company recruiter from the left directory to view conversations and send direct messages in real time.
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

      {/* Propose Interview Meeting Dialog */}
      {showMeetingModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-neutral-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-neutral-900">
                  Propose Interview Meeting
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowMeetingModal(false)}
                className="text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleProposeMeeting} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-neutral-700 block mb-1">
                  Interview Round / Topic
                </label>
                <input
                  type="text"
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  placeholder="e.g. Technical Round 1 / Portfolio Review"
                  required
                  className="w-full p-2.5 rounded-lg border border-neutral-300 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">
                    Proposed Date
                  </label>
                  <input
                    type="date"
                    value={meetingDate}
                    onChange={(e) => setMeetingDate(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-lg border border-neutral-300 text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">
                    Proposed Time
                  </label>
                  <input
                    type="time"
                    value={meetingTime}
                    onChange={(e) => setMeetingTime(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-lg border border-neutral-300 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-neutral-700 block mb-1">
                  Meeting Platform &amp; Link
                </label>
                <select
                  value={meetingPlatform}
                  onChange={(e) => setMeetingPlatform(e.target.value as any)}
                  className="w-full p-2.5 rounded-lg border border-neutral-300 text-xs bg-white mb-2"
                >
                  <option value="google_meet">Google Meet (Auto-generated room)</option>
                  <option value="jitsi">Jitsi Meet (No login required / Open)</option>
                  <option value="custom">Custom Meeting Link (Zoom, Teams, etc.)</option>
                </select>
                {meetingPlatform === 'custom' && (
                  <input
                    type="url"
                    value={customMeetingUrl}
                    onChange={(e) => setCustomMeetingUrl(e.target.value)}
                    placeholder="https://zoom.us/j/... or teams link"
                    required
                    className="w-full p-2.5 rounded-lg border border-neutral-300 text-xs"
                  />
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-neutral-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowMeetingModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={proposingMeeting}
                  className="flex items-center gap-1.5"
                >
                  {proposingMeeting ? (
                    'Sending Proposal...'
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Meeting Invite in Chat</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
