import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../../components/common/Sidebar';

const NAV = [
  {
    label: 'Main',
    links: [
      { to: '/faculty',             end: true, icon: '📊', label: 'Overview' },
    ],
  },
  {
    label: 'Academic',
    links: [
      { to: '/faculty/marks',      icon: '📝', label: 'Marks' },
      { to: '/faculty/attendance', icon: '✅', label: 'Attendance' },
    ],
  },
];

export default function FacultyLayout() {
  return (
    <div className="app-shell">
      <Sidebar navItems={NAV} role="faculty" />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
