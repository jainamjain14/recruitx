import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { api } from '../services/api';
import { decodeHtmlEntities } from '../components/CompanyLocationMap';
import { useNavigate } from 'react-router-dom';
import {
  LayoutGrid,
  List,
  Search,
  Filter,
  Star,
  MessageSquare,
  Calendar,
  Clock,
  Video,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
  ChevronRight,
  GraduationCap,
  Sparkles,
  Phone,
  Mail,
  User,
  Building2,
  ArrowRight,
  Save,
  Check,
} from 'lucide-react';

export type ApplicationStage =
  | 'applied'
  | 'under_review'
  | 'shortlisted'
  | 'interview_scheduled'
  | 'offered'
  | 'rejected';

interface KanbanColumn {
  id: ApplicationStage;
  title: string;
  color: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
}

const KANBAN_COLUMNS: KanbanColumn[] = [
  {
    id: 'applied',
    title: 'Applied',
    color: 'bg-neutral-500',
    badgeBg: 'bg-neutral-100',
    badgeText: 'text-neutral-700',
    borderColor: 'border-neutral-200',
  },
  {
    id: 'under_review',
    title: 'Under Review',
    color: 'bg-amber-500',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-800',
    borderColor: 'border-amber-200',
  },
  {
    id: 'shortlisted',
    title: 'Shortlisted',
    color: 'bg-blue-500',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-800',
    borderColor: 'border-blue-200',
  },
  {
    id: 'interview_scheduled',
    title: 'Interview Scheduled',
    color: 'bg-purple-500',
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-800',
    borderColor: 'border-purple-200',
  },
  {
    id: 'offered',
    title: 'Offer Extended',
    color: 'bg-emerald-500',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-800',
    borderColor: 'border-emerald-200',
  },
  {
    id: 'rejected',
    title: 'Archived / Rejected',
    color: 'bg-rose-500',
    badgeBg: 'bg-rose-50',
    badgeText: 'text-rose-800',
    borderColor: 'border-rose-200',
  },
];

export const RecruiterApplications: React.FC = () => {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');

  // Filter & Search
  const [search, setSearch] = useState('');
  const [selectedJobFilter, setSelectedJobFilter] = useState('ALL');

  // Drag and drop state
  const [draggedAppId, setDraggedAppId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<ApplicationStage | null>(null);

  // Split-Screen Candidate Detail Drawer
  const [activeCandidate, setActiveCandidate] = useState<any | null>(null);
  const [editingNotes, setEditingNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSavedSuccess, setNotesSavedSuccess] = useState(false);

  // Schedule Interview Modal
  const [interviewModalOpen, setInterviewModalOpen] = useState(false);
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewDuration, setInterviewDuration] = useState('45');
  const [interviewMeetingLink, setInterviewMeetingLink] = useState('https://meet.google.com/recruitx-live');
  const [interviewNotes, setInterviewNotes] = useState('');
  const [schedulingInterview, setSchedulingInterview] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const res = await api.get('/applications');
      if (res.data?.data?.applications) {
        setApplications(res.data.data.applications);
      }
    } catch (err) {
      console.error('Failed to fetch applications:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: ApplicationStage, note?: string) => {
    try {
      await api.patch(`/applications/${id}/status`, { status, note });
      setApplications((prev) =>
        prev.map((a) => {
          if (a._id === id) {
            const updatedHistory = [
              ...(a.statusHistory || []),
              { status, changedAt: new Date().toISOString(), note: note || `Moved to ${status.replace('_', ' ')}` },
            ];
            return { ...a, status, statusHistory: updatedHistory };
          }
          return a;
        })
      );
      if (activeCandidate && activeCandidate._id === id) {
        setActiveCandidate((prev: any) => ({
          ...prev,
          status,
          statusHistory: [
            ...(prev.statusHistory || []),
            { status, changedAt: new Date().toISOString(), note: note || `Moved to ${status.replace('_', ' ')}` },
          ],
        }));
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update application status');
    }
  };

  const updateRating = async (id: string, rating: number) => {
    try {
      await api.patch(`/applications/${id}/status`, { rating });
      setApplications((prev) =>
        prev.map((a) => (a._id === id ? { ...a, rating } : a))
      );
      if (activeCandidate && activeCandidate._id === id) {
        setActiveCandidate((prev: any) => ({ ...prev, rating }));
      }
    } catch (err) {
      console.error('Failed to save rating:', err);
    }
  };

  const handleSaveNotes = async () => {
    if (!activeCandidate) return;
    setSavingNotes(true);
    setNotesSavedSuccess(false);
    try {
      await api.patch(`/applications/${activeCandidate._id}/status`, { internalNotes: editingNotes });
      setApplications((prev) =>
        prev.map((a) => (a._id === activeCandidate._id ? { ...a, internalNotes: editingNotes } : a))
      );
      setActiveCandidate((prev: any) => ({ ...prev, internalNotes: editingNotes }));
      setNotesSavedSuccess(true);
      setTimeout(() => setNotesSavedSuccess(false), 3000);
    } catch (err) {
      alert('Failed to save recruiter notes');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleOpenDrawer = (app: any) => {
    setActiveCandidate(app);
    setEditingNotes(app.internalNotes || '');
    setNotesSavedSuccess(false);
  };

  const handleOpenScheduleModal = () => {
    if (!activeCandidate) return;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 0, 0, 0);
    const tzOffset = tomorrow.getTimezoneOffset() * 60000;
    const localISOTime = new Date(tomorrow.getTime() - tzOffset).toISOString().slice(0, 16);
    setInterviewDate(localISOTime);
    setInterviewMeetingLink(`https://meet.google.com/recruitx-${Math.random().toString(36).substring(2, 7)}`);
    setInterviewNotes(`Interview with ${activeCandidate.student?.name || 'candidate'} for ${activeCandidate.jobTitle || activeCandidate.job?.title}`);
    setInterviewModalOpen(true);
  };

  const handleConfirmScheduleInterview = async () => {
    if (!activeCandidate) return;
    setSchedulingInterview(true);
    try {
      const studentId = typeof activeCandidate.student === 'object' && activeCandidate.student?._id
        ? activeCandidate.student._id
        : activeCandidate.student;
      const jobId = typeof activeCandidate.job === 'object' && activeCandidate.job?._id
        ? activeCandidate.job._id
        : activeCandidate.job;

      await api.post('/interviews', {
        jobId: jobId || undefined,
        applicationId: activeCandidate._id,
        studentId,
        title: `Interview: ${activeCandidate.jobTitle || activeCandidate.job?.title || 'Technical Role'}`,
        scheduledAt: new Date(interviewDate).toISOString(),
        durationMinutes: parseInt(interviewDuration, 10) || 45,
        meetingLink: interviewMeetingLink,
        notes: interviewNotes,
      });

      await updateStatus(activeCandidate._id, 'interview_scheduled', `Interview scheduled for ${new Date(interviewDate).toLocaleString()}`);
      setInterviewModalOpen(false);
      alert('🎉 Interview invitation scheduled and dispatched to candidate!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to schedule interview');
    } finally {
      setSchedulingInterview(false);
    }
  };

  // Drag-and-drop event handlers
  const handleDragStart = (e: React.DragEvent, appId: string) => {
    e.dataTransfer.setData('text/plain', appId);
    setDraggedAppId(appId);
  };

  const handleDragOver = (e: React.DragEvent, columnId: ApplicationStage) => {
    e.preventDefault();
    if (dragOverColumn !== columnId) {
      setDragOverColumn(columnId);
    }
  };

  const handleDrop = async (e: React.DragEvent, columnId: ApplicationStage) => {
    e.preventDefault();
    const appId = e.dataTransfer.getData('text/plain') || draggedAppId;
    setDragOverColumn(null);
    setDraggedAppId(null);
    if (appId) {
      const app = applications.find((a) => a._id === appId);
      if (app && app.status !== columnId) {
        await updateStatus(appId, columnId);
      }
    }
  };

  // Compute unique jobs for the dropdown filter
  const availableJobs = Array.from(
    new Set(applications.map((a) => decodeHtmlEntities(a.jobTitle || a.job?.title || 'General Application')).filter(Boolean))
  );

  // Filter applications
  const filteredApps = applications.filter((app) => {
    const jobTitle = decodeHtmlEntities(app.jobTitle || app.job?.title || '').toLowerCase();
    const candidateName = (app.student?.name || '').toLowerCase();
    const candidateEmail = (app.student?.email || '').toLowerCase();
    const skills = ((app.candidateProfile?.skills || []) as string[]).join(' ').toLowerCase();

    const matchesSearch =
      candidateName.includes(search.toLowerCase()) ||
      candidateEmail.includes(search.toLowerCase()) ||
      jobTitle.includes(search.toLowerCase()) ||
      skills.includes(search.toLowerCase());

    const matchesJob =
      selectedJobFilter === 'ALL' ||
      decodeHtmlEntities(app.jobTitle || app.job?.title || '') === selectedJobFilter;

    return matchesSearch && matchesJob;
  });

  return (
    <div className="space-y-6">
      {/* Header & Controls Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-neutral-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-neutral-900">ATS Candidate Pipeline</h1>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-neutral-900 text-white">
              {filteredApps.length} Candidates
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">
            Real-time drag-and-drop candidate management, embedded resume viewer, and interview orchestration.
          </p>
        </div>

        {/* View Toggle & Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Bar */}
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search candidate or skill..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-xs pl-8 pr-3 py-1.5 rounded-lg border border-neutral-200 bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 w-full"
            />
          </div>

          {/* Job Filter Dropdown */}
          <div className="flex items-center gap-1 bg-white border border-neutral-200 rounded-lg px-2.5 py-1 text-xs">
            <Filter className="w-3 h-3 text-neutral-400" />
            <select
              value={selectedJobFilter}
              onChange={(e) => setSelectedJobFilter(e.target.value)}
              className="bg-transparent text-xs text-neutral-700 font-medium focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Vacancies ({availableJobs.length})</option>
              {availableJobs.map((j, i) => (
                <option key={i} value={j}>
                  {j}
                </option>
              ))}
            </select>
          </div>

          {/* View Switcher Toggle */}
          <div className="flex items-center bg-neutral-100 p-0.5 rounded-lg border border-neutral-200 text-xs">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                viewMode === 'kanban' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <LayoutGrid className="w-3 h-3" />
              Kanban Board
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                viewMode === 'table' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <List className="w-3 h-3" />
              Table View
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="py-16 text-center text-xs text-neutral-400">
          <Sparkles className="w-5 h-5 animate-spin mx-auto text-neutral-700 mb-2" />
          Loading candidate applications...
        </div>
      ) : applications.length === 0 ? (
        <Card className="p-12 text-center space-y-3">
          <User className="w-8 h-8 text-neutral-300 mx-auto" />
          <h3 className="text-sm font-bold text-neutral-800">No Candidate Applications Yet</h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            Once students submit applications to your active job listings, they will appear here in your interactive ATS pipeline.
          </p>
        </Card>
      ) : viewMode === 'kanban' ? (
        /* KANBAN BOARD VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 overflow-x-auto pb-4">
          {KANBAN_COLUMNS.map((col) => {
            const colApps = filteredApps.filter((a) => (a.status || 'applied') === col.id);
            const isHovered = dragOverColumn === col.id;

            return (
              <div
                key={col.id}
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDragLeave={() => setDragOverColumn(null)}
                onDrop={(e) => handleDrop(e, col.id)}
                className={`flex flex-col bg-neutral-50/80 rounded-xl border transition-all min-h-[550px] ${
                  isHovered
                    ? 'border-neutral-900 ring-2 ring-neutral-900/20 bg-neutral-100/90'
                    : 'border-neutral-200'
                }`}
              >
                {/* Column Header */}
                <div className="p-3 border-b border-neutral-200/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${col.color}`}></span>
                    <h3 className="text-xs font-bold text-neutral-800 tracking-tight">{col.title}</h3>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${col.badgeBg} ${col.badgeText}`}>
                    {colApps.length}
                  </span>
                </div>

                {/* Column Cards Container */}
                <div className="p-2 space-y-2.5 flex-1 overflow-y-auto max-h-[calc(100vh-280px)]">
                  {colApps.map((app) => {
                    const studentName = app.student?.name || 'Applicant';
                    const studentEmail = app.student?.email || '';
                    const jobTitle = decodeHtmlEntities(app.jobTitle || app.job?.title || 'Open Position');
                    const company = decodeHtmlEntities(app.companyName || app.job?.company || 'Company');
                    const headline = app.candidateProfile?.headline || 'Placement Candidate';
                    const skills = app.candidateProfile?.skills || [];
                    const rating = app.rating || 0;

                    return (
                      <div
                        key={app._id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, app._id)}
                        onClick={() => handleOpenDrawer(app)}
                        className="p-3 bg-white rounded-lg border border-neutral-200 hover:border-neutral-300 hover:shadow-sm transition-all cursor-grab active:cursor-grabbing space-y-2.5 select-none"
                      >
                        {/* Card Header: Avatar, Name, and Stars */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-neutral-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                              {studentName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-neutral-900 leading-tight hover:text-neutral-600 transition-colors">
                                {studentName}
                              </h4>
                              <p className="text-[10.5px] text-neutral-500 truncate max-w-[120px]">{headline}</p>
                            </div>
                          </div>

                          {/* Quick Star Rating */}
                          <div className="flex items-center gap-0.5">
                            <Star
                              className={`w-3 h-3 ${
                                rating > 0 ? 'fill-amber-400 text-amber-400' : 'text-neutral-300'
                              }`}
                            />
                            <span className="text-[10px] font-bold text-neutral-600">
                              {rating > 0 ? rating : '-'}
                            </span>
                          </div>
                        </div>

                        {/* Job Badge */}
                        <div className="bg-neutral-50 p-1.5 rounded border border-neutral-100 space-y-0.5">
                          <span className="text-[10.5px] font-semibold text-neutral-800 line-clamp-1">
                            {jobTitle}
                          </span>
                          <span className="text-[9.5px] text-neutral-400 block">🏢 {company}</span>
                        </div>

                        {/* Skills Pill Preview */}
                        {skills.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {skills.slice(0, 2).map((s: string, sIdx: number) => (
                              <span
                                key={sIdx}
                                className="text-[9.5px] px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600 font-medium"
                              >
                                {s}
                              </span>
                            ))}
                            {skills.length > 2 && (
                              <span className="text-[9.5px] text-neutral-400 font-medium self-center">
                                +{skills.length - 2}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Card Footer: Date & Quick Actions */}
                        <div className="flex items-center justify-between pt-1.5 border-t border-neutral-100 text-[10px] text-neutral-400">
                          <span>{new Date(app.appliedAt).toLocaleDateString()}</span>
                          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              title="Chat with candidate"
                              onClick={() =>
                                navigate(
                                  `/recruiter/messages?recipientId=${
                                    typeof app.student === 'object' ? app.student._id : app.student
                                  }&name=${encodeURIComponent(studentName)}`
                                )
                              }
                              className="p-1 hover:text-neutral-900 hover:bg-neutral-100 rounded transition-colors"
                            >
                              <MessageSquare className="w-3 h-3" />
                            </button>
                            <button
                              title="View resume & qualifications"
                              onClick={() => handleOpenDrawer(app)}
                              className="p-1 hover:text-neutral-900 hover:bg-neutral-100 rounded transition-colors"
                            >
                              <FileText className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {colApps.length === 0 && (
                    <div className="py-8 text-center border-2 border-dashed border-neutral-200/70 rounded-lg">
                      <p className="text-[11px] text-neutral-400">Drop candidate here</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE LIST VIEW */
        <Card className="overflow-hidden border-neutral-200">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 text-neutral-600 font-semibold border-b border-neutral-200 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Candidate</th>
                  <th className="py-3 px-4">Role & Employer</th>
                  <th className="py-3 px-4">Rating</th>
                  <th className="py-3 px-4">Skills</th>
                  <th className="py-3 px-4">Date Applied</th>
                  <th className="py-3 px-4">Stage</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredApps.map((app) => {
                  const studentName = app.student?.name || 'Applicant';
                  const studentEmail = app.student?.email || '';
                  const jobTitle = decodeHtmlEntities(app.jobTitle || app.job?.title || 'Open Position');
                  const company = decodeHtmlEntities(app.companyName || app.job?.company || 'Company');
                  const skills = app.candidateProfile?.skills || [];
                  const rating = app.rating || 0;

                  return (
                    <tr
                      key={app._id}
                      onClick={() => handleOpenDrawer(app)}
                      className="hover:bg-neutral-50/60 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-neutral-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                            {studentName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-neutral-900 block">{studentName}</span>
                            <span className="text-[11px] text-neutral-400">{studentEmail}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-semibold text-neutral-800 block">{jobTitle}</span>
                        <span className="text-[11px] text-neutral-400">{company}</span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((starVal) => (
                            <Star
                              key={starVal}
                              className={`w-3 h-3 ${
                                rating >= starVal ? 'fill-amber-400 text-amber-400' : 'text-neutral-200'
                              }`}
                            />
                          ))}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {skills.slice(0, 2).map((s: string, idx: number) => (
                            <span
                              key={idx}
                              className="text-[10px] px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 font-medium"
                            >
                              {s}
                            </span>
                          ))}
                          {skills.length > 2 && (
                            <span className="text-[10px] text-neutral-400 font-medium self-center">
                              +{skills.length - 2}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-neutral-500">
                        {new Date(app.appliedAt).toLocaleDateString()}
                      </td>

                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={app.status || 'applied'}
                          onChange={(e) => updateStatus(app._id, e.target.value as ApplicationStage)}
                          className="text-xs font-semibold px-2 py-1 rounded bg-neutral-100 border border-neutral-200 text-neutral-800 focus:outline-none"
                        >
                          {KANBAN_COLUMNS.map((col) => (
                            <option key={col.id} value={col.id}>
                              {col.title}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <Button size="sm" variant="secondary" onClick={() => handleOpenDrawer(app)}>
                            Review
                          </Button>
                          <Button
                            size="sm"
                            onClick={() =>
                              navigate(
                                `/recruiter/messages?recipientId=${
                                  typeof app.student === 'object' ? app.student._id : app.student
                                }&name=${encodeURIComponent(studentName)}`
                              )
                            }
                            className="flex items-center gap-1"
                          >
                            <MessageSquare className="w-3 h-3" /> Chat
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* SPLIT-SCREEN CANDIDATE DEEP-DIVE DRAWER */}
      {activeCandidate && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
          <div className="w-full max-w-4xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="p-4 sm:p-6 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-neutral-900 text-white font-bold text-sm flex items-center justify-center shrink-0">
                  {(activeCandidate.student?.name || 'A').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-base font-bold text-neutral-900">
                    {activeCandidate.student?.name || 'Candidate Profile'}
                  </h2>
                  <p className="text-xs text-neutral-500 flex items-center gap-2">
                    <span>{activeCandidate.student?.email}</span>
                    {activeCandidate.student?.phone && (
                      <>
                        <span>•</span>
                        <span>{activeCandidate.student?.phone}</span>
                      </>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveCandidate(null)}
                  className="p-2 text-neutral-400 hover:text-neutral-900 rounded-lg hover:bg-neutral-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Drawer Body: Two-Column Split Layout */}
            <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-neutral-200">
              {/* LEFT PANE: Resume Viewer & Qualifications */}
              <div className="p-6 space-y-6 overflow-y-auto">
                <div>
                  <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                    Resume Document & Portfolio
                  </h3>
                  {activeCandidate.resumeUrl || activeCandidate.candidateProfile?.resumeUrl ? (
                    <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50 space-y-3">
                      <div className="flex items-center gap-3">
                        <FileText className="w-8 h-8 text-neutral-700 shrink-0" />
                        <div>
                          <h4 className="text-xs font-bold text-neutral-900">
                            {activeCandidate.candidateProfile?.fileName || 'Attached Candidate Resume.pdf'}
                          </h4>
                          <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Verified Document Attached
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={activeCandidate.candidateProfile?.resumeUrl || activeCandidate.resumeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> View / Download Resume
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border border-dashed border-neutral-200 text-center text-xs text-neutral-400">
                      Profile application without standalone PDF link. Viewing structured credentials below.
                    </div>
                  )}
                </div>

                {/* Candidate Overview */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Candidate Summary</h3>
                  <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-neutral-800">
                        {activeCandidate.candidateProfile?.headline || 'Placement Candidate'}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white text-neutral-700 border border-neutral-200">
                        {activeCandidate.candidateProfile?.fieldOfInterest || 'General'}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-600 leading-relaxed">
                      {activeCandidate.candidateProfile?.summary ||
                        activeCandidate.coverLetter ||
                        'Candidate has completed profile registration and submitted verified skill credentials.'}
                    </p>
                  </div>
                </div>

                {/* Verified Skills */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Verified Skill Badges</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {(activeCandidate.candidateProfile?.skills || ['Communication', 'Problem Solving']).map(
                      (skill: string, idx: number) => (
                        <span
                          key={idx}
                          className="text-xs font-medium px-2.5 py-1 rounded-md bg-neutral-100 text-neutral-800 border border-neutral-200"
                        >
                          {skill}
                        </span>
                      )
                    )}
                  </div>
                </div>

                {/* Education History */}
                {activeCandidate.candidateProfile?.education && activeCandidate.candidateProfile.education.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Education</h3>
                    <div className="space-y-2">
                      {activeCandidate.candidateProfile.education.map((edu: any, idx: number) => (
                        <div key={idx} className="p-3 rounded-lg border border-neutral-200 bg-white flex items-start gap-3">
                          <GraduationCap className="w-4 h-4 text-neutral-600 shrink-0 mt-0.5" />
                          <div>
                            <h5 className="text-xs font-bold text-neutral-900">{edu.degree || 'Degree'}</h5>
                            <p className="text-[11px] text-neutral-500">{edu.institution || 'University'}</p>
                            {edu.year && <p className="text-[10px] text-neutral-400">Class of {edu.year}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT PANE: Recruiter Scoring, Notes, & Pipeline Action */}
              <div className="p-6 space-y-6 overflow-y-auto bg-neutral-50/40">
                {/* Stage Progression Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider block">
                    Current Hiring Stage
                  </label>
                  <select
                    value={activeCandidate.status || 'applied'}
                    onChange={(e) => updateStatus(activeCandidate._id, e.target.value as ApplicationStage)}
                    className="w-full text-xs font-bold p-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                  >
                    {KANBAN_COLUMNS.map((col) => (
                      <option key={col.id} value={col.id}>
                        {col.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Interactive Star Rating */}
                <div className="space-y-2 bg-white p-4 rounded-xl border border-neutral-200">
                  <span className="text-xs font-bold text-neutral-700 uppercase tracking-wider block">
                    Recruiter Scorecard Rating
                  </span>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((starVal) => (
                      <button
                        key={starVal}
                        onClick={() => updateRating(activeCandidate._id, starVal)}
                        className="p-1 hover:scale-110 transition-transform"
                      >
                        <Star
                          className={`w-6 h-6 ${
                            (activeCandidate.rating || 0) >= starVal
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-neutral-300 hover:text-amber-200'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="text-xs font-bold text-neutral-700 ml-2">
                      {activeCandidate.rating ? `${activeCandidate.rating} / 5 Stars` : 'Click stars to rate'}
                    </span>
                  </div>
                </div>

                {/* Recruiter Internal Notes */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
                      Internal Team Notes
                    </label>
                    {notesSavedSuccess && (
                      <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                        <Check className="w-3 h-3" /> Saved!
                      </span>
                    )}
                  </div>
                  <textarea
                    rows={4}
                    placeholder="Add private recruiter evaluation notes, interview impressions, or salary expectations..."
                    value={editingNotes}
                    onChange={(e) => setEditingNotes(e.target.value)}
                    className="w-full text-xs p-3 rounded-lg border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleSaveNotes}
                    disabled={savingNotes}
                    className="flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {savingNotes ? 'Saving...' : 'Save Private Notes'}
                  </Button>
                </div>

                {/* Quick Communication Actions */}
                <div className="space-y-2.5 pt-2">
                  <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider block">
                    Candidate Actions
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      onClick={handleOpenScheduleModal}
                      className="flex items-center justify-center gap-2 bg-purple-700 hover:bg-purple-800 text-white"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      Schedule Interview
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        navigate(
                          `/recruiter/messages?recipientId=${
                            typeof activeCandidate.student === 'object'
                              ? activeCandidate.student._id
                              : activeCandidate.student
                          }&name=${encodeURIComponent(activeCandidate.student?.name || 'Candidate')}`
                        )
                      }
                      className="flex items-center justify-center gap-2"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Direct Message
                    </Button>
                  </div>
                </div>

                {/* Application Status History Timeline */}
                <div className="space-y-3 pt-3 border-t border-neutral-200">
                  <h4 className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
                    Application History & Timeline
                  </h4>
                  <div className="space-y-3">
                    {(activeCandidate.statusHistory || []).map((h: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs">
                        <div className="w-2 h-2 rounded-full bg-neutral-400 mt-1.5 shrink-0" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-neutral-900 uppercase text-[10px]">
                              {h.status?.replace('_', ' ')}
                            </span>
                            <span className="text-[10px] text-neutral-400">
                              {h.changedAt ? new Date(h.changedAt).toLocaleString() : ''}
                            </span>
                          </div>
                          {h.note && <p className="text-[11px] text-neutral-600 mt-0.5">{h.note}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SCHEDULE INTERVIEW MODAL */}
      {interviewModalOpen && activeCandidate && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-600" />
                <h3 className="text-sm font-bold text-neutral-900">Schedule Candidate Interview</h3>
              </div>
              <button onClick={() => setInterviewModalOpen(false)} className="text-neutral-400 hover:text-neutral-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-500">
              Scheduling for <strong>{activeCandidate.student?.name}</strong> for{' '}
              <strong>{activeCandidate.jobTitle || activeCandidate.job?.title}</strong>.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-neutral-700 block mb-1">Date & Time</label>
                <input
                  type="datetime-local"
                  value={interviewDate}
                  onChange={(e) => setInterviewDate(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:ring-1 focus:ring-purple-600"
                />
              </div>

              <div>
                <label className="font-bold text-neutral-700 block mb-1">Duration (Minutes)</label>
                <select
                  value={interviewDuration}
                  onChange={(e) => setInterviewDuration(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:ring-1 focus:ring-purple-600"
                >
                  <option value="30">30 Minutes (Quick Screen)</option>
                  <option value="45">45 Minutes (Technical Standard)</option>
                  <option value="60">60 Minutes (Deep Dive / Architecture)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-neutral-700 block mb-1">Video Meeting Link</label>
                <input
                  type="url"
                  placeholder="https://meet.google.com/..."
                  value={interviewMeetingLink}
                  onChange={(e) => setInterviewMeetingLink(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:ring-1 focus:ring-purple-600"
                />
              </div>

              <div>
                <label className="font-bold text-neutral-700 block mb-1">Agenda / Candidate Instructions</label>
                <textarea
                  rows={2}
                  value={interviewNotes}
                  onChange={(e) => setInterviewNotes(e.target.value)}
                  className="w-full p-2 rounded-lg border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:ring-1 focus:ring-purple-600"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
              <Button variant="secondary" size="sm" onClick={() => setInterviewModalOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmScheduleInterview}
                disabled={schedulingInterview || !interviewDate}
                className="bg-purple-700 hover:bg-purple-800 text-white flex items-center gap-1.5"
              >
                {schedulingInterview ? 'Scheduling...' : 'Confirm & Send Invite'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
