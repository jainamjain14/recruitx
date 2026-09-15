import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Logo } from './Logo';
import { Bell } from 'lucide-react';

interface NavItem {
  label: string;
  to: string;
  showBadge?: boolean;
}

export const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role;

  const baseItems: NavItem[] = [
    { label: 'Dashboard', to: `/${role}` },
  ];

  const roleItems: Record<string, NavItem[]> = {
    student: [
      { label: 'My Resume', to: '/student/resume' },
      { label: 'Skill Gap', to: '/student/skill-gap' },
      { label: 'Roadmap', to: '/student/roadmap' },
      { label: 'Job Matches', to: '/student/jobs' },
      { label: 'Applications', to: '/student/applications' },
      { label: 'Mock Interview', to: '/student/mock-interview' },
      { label: 'Settings', to: '/student/settings' },
      { label: 'Notifications', to: '/student/notifications', showBadge: true },
    ],
    recruiter: [
      { label: 'Post a Job', to: '/recruiter/post-job' },
      { label: 'Job Postings', to: '/recruiter/jobs' },
      { label: 'Applications', to: '/recruiter/applications' },
      { label: 'Candidates', to: '/recruiter/candidates' },
      { label: 'Interviews', to: '/recruiter/interviews' },
      { label: 'Messages', to: '/recruiter/messages' },
      { label: 'Company Profile', to: '/recruiter/company' },
      { label: 'Settings', to: '/recruiter/settings' },
      { label: 'Notifications', to: '/recruiter/notifications', showBadge: true },
    ],
    admin: [
      { label: 'Students', to: '/admin/students' },
      { label: 'Recruiters', to: '/admin/recruiters' },
      { label: 'Job Postings', to: '/admin/jobs' },
      { label: 'Applications', to: '/admin/applications' },
      { label: 'Placements', to: '/admin/placements' },
      { label: 'Reports', to: '/admin/reports' },
      { label: 'Settings', to: '/admin/settings' },
      { label: 'Notifications', to: '/admin/notifications', showBadge: true },
    ],
  };

  const items = role ? [...baseItems, ...(roleItems[role] ?? [])] : baseItems;

  return (
    <aside className="flex flex-col w-64 h-screen bg-white border-r border-neutral-200 p-4">
      <div className="flex items-center mb-8">
        <Logo className="h-9" />
      </div>
      <nav className="flex-1 space-y-1">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-600 hover:bg-neutral-50'
              }`
            }
          >
            <span>{item.label}</span>
            {item.showBadge && (
              <span className="ml-auto relative">
                {/* Placeholder badge – NotificationContext will replace content */}
                <Bell className="w-4 h-4 text-neutral-400" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
              </span>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};
