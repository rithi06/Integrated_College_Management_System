import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../../components/common/Sidebar';

const NAV = [
  {
    label: 'Main',
    links: [
      { to: '/admin',             end: true, icon: '📊', label: 'Overview' },
      { to: '/admin/departments', icon: '🏫', label: 'Departments' },
    ],
  },
  {
    label: 'People',
    links: [
      { to: '/admin/students', icon: '🎓', label: 'Students' },
      { to: '/admin/faculty',  icon: '👨‍🏫', label: 'Faculty' },
    ],
  },
  {
    label: 'Academic',
    links: [
      { to: '/admin/subjects',    icon: '📚', label: 'Subjects' },
      { to: '/admin/attendance',  icon: '✅', label: 'Attendance' },
    ],
  },
];

export default function AdminLayout() {
  return (
    <div className="app-shell">
      <Sidebar navItems={NAV} role="admin" />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
