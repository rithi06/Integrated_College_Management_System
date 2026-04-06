import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../../components/common/Sidebar';

const NAV = [
  {
    label: 'Main',
    links: [
      { to: '/student',             end: true, icon: '📊', label: 'Dashboard' },
      { to: '/student/profile',     icon: '👤', label: 'My profile' },
    ],
  },
  {
    label: 'Academic',
    links: [
      { to: '/student/marks',       icon: '📝', label: 'Marks' },
      { to: '/student/attendance',  icon: '✅', label: 'Attendance' },
    ],
  },
];

export default function StudentLayout() {
  return (
    <div className="app-shell">
      <Sidebar navItems={NAV} role="student" />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
