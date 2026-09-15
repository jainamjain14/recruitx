import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Logo } from '../components/Logo';
import {
  LayoutDashboard,
  FileText,
  Briefcase,
  Map,
  Zap,
  ClipboardList,
  Video,
  Settings,
  Bell,
  LogOut,
  User as UserIcon,
  Menu,
  X,
  Users,
  Building2,
  BarChart3,
  Star,
  Plus,
  MessageSquare,
  GraduationCap,
} from 'lucide-react';

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path: string;
  badge?: number;
}

const studentNav: NavItem[] = [
  { label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" />, path: '/student' },
  { label: 'My Resume', icon: <FileText className="w-4 h-4" />, path: '/student/resume' },
  { label: 'Skill Gap', icon: <Zap className="w-4 h-4" />, path: '/student/skill-gap' },
  { label: 'Roadmap', icon: <Map className="w-4 h-4" />, path: '/student/roadmap' },
  { label: 'Job Matches', icon: <Briefcase className="w-4 h-4" />, path: '/student/jobs' },
  { label: 'Applications', icon: <ClipboardList className="w-4 h-4" />, path: '/student/applications', badge: 3 },
  { label: 'Mock Interview', icon: <Video className="w-4 h-4" />, path: '/student/mock-interview' },
  { label: 'Notifications', icon: <Bell className="w-4 h-4" />, path: '/student/notifications', badge: 5 },
  { label: 'Settings', icon: <Settings className="w-4 h-4" />, path: '/student/settings' },
];

const recruiterNav: NavItem[] = [
  { label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" />, path: '/recruiter' },
  { label: 'Post a Job', icon: <Plus className="w-4 h-4" />, path: '/recruiter/post-job' },
  { label: 'Job Postings', icon: <Briefcase className="w-4 h-4" />, path: '/recruiter/jobs' },
  { label: 'Applications', icon: <ClipboardList className="w-4 h-4" />, path: '/recruiter/applications', badge: 12 },
  { label: 'Candidates', icon: <Users className="w-4 h-4" />, path: '/recruiter/candidates' },
  { label: 'Interviews', icon: <Video className="w-4 h-4" />, path: '/recruiter/interviews' },
  { label: 'Messages', icon: <MessageSquare className="w-4 h-4" />, path: '/recruiter/messages', badge: 2 },
  { label: 'Notifications', icon: <Bell className="w-4 h-4" />, path: '/recruiter/notifications' },
  { label: 'Company Profile', icon: <Building2 className="w-4 h-4" />, path: '/recruiter/company' },
  { label: 'Settings', icon: <Settings className="w-4 h-4" />, path: '/recruiter/settings' },
];

const adminNav: NavItem[] = [
  { label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" />, path: '/admin' },
  { label: 'Students', icon: <GraduationCap className="w-4 h-4" />, path: '/admin/students' },
  { label: 'Recruiters', icon: <Building2 className="w-4 h-4" />, path: '/admin/recruiters' },
  { label: 'Job Postings', icon: <Briefcase className="w-4 h-4" />, path: '/admin/jobs' },
  { label: 'Applications', icon: <ClipboardList className="w-4 h-4" />, path: '/admin/applications' },
  { label: 'Placements', icon: <Star className="w-4 h-4" />, path: '/admin/placements' },
  { label: 'Reports', icon: <BarChart3 className="w-4 h-4" />, path: '/admin/reports' },
  { label: 'Notifications', icon: <Bell className="w-4 h-4" />, path: '/admin/notifications', badge: 3 },
  { label: 'Settings', icon: <Settings className="w-4 h-4" />, path: '/admin/settings' },
];

export const DashboardLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems =
    user?.role === 'admin' ? adminNav :
    user?.role === 'recruiter' ? recruiterNav :
    studentNav;

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const isActive = (path: string) => location.pathname === path;

  const renderSidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-neutral-200/80">
        <Logo size="md" />
      </div>

      {/* User info */}
      <div className="px-4 py-4 border-b border-neutral-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center shrink-0">
            <UserIcon className="w-3.5 h-3.5 text-neutral-500" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-neutral-900 truncate">{user?.name}</p>
            <p className="text-[10px] text-neutral-400 truncate">{user?.email}</p>
          </div>
        </div>
        <span className="mt-2 inline-block text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-neutral-100 text-neutral-500 tracking-wider border border-neutral-200">
          {user?.role}
        </span>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-all duration-150 group ${
                active
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
              }`}
            >
              <span className={active ? 'text-white' : 'text-neutral-400 group-hover:text-neutral-600'}>
                {item.icon}
              </span>
              <span className="flex-1">{item.label}</span>
              {item.badge !== undefined && (
                <span className={`text-[10px] font-bold min-w-[18px] h-4 flex items-center justify-center rounded-full px-1 ${
                  active ? 'bg-white/20 text-white' : 'bg-neutral-200 text-neutral-600'
                }`}>
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-neutral-100">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition-all duration-150"
        >
          <LogOut className="w-4 h-4" />
          <span>Log out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FAFBFD] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-52 bg-white border-r border-neutral-200/80 fixed top-0 left-0 h-full z-20 shadow-subtle">
        {renderSidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-30 flex">
          <div className="fixed inset-0 bg-black/30" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-52 bg-white border-r border-neutral-200/80 flex flex-col h-full z-40">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 text-white/50 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
            {renderSidebarContent}
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 lg:ml-52 flex flex-col min-h-screen">
        {/* Mobile Top Bar */}
        <header className="lg:hidden bg-white border-b border-neutral-200/80 sticky top-0 z-10 px-4 h-14 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)} className="text-neutral-600">
            <Menu className="w-5 h-5" />
          </button>
          <Logo size="sm" />
          <div className="w-5" />
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
