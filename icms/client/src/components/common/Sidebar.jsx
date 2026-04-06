import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const AVATAR_COLORS = {
  admin:   { bg: '#eef2ff', color: 'var(--primary)' },
  faculty: { bg: '#d1fae5', color: 'var(--teal)' },
  student: { bg: '#fef3c7', color: 'var(--amber)' },
};

export default function Sidebar({ navItems, role }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const av = AVATAR_COLORS[role] || AVATAR_COLORS.student;
  const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'U';

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-icon">IC</div>
        <div className="app-name">ICMS</div>
        <div className="app-sub">College Management</div>
      </div>

      {/* Nav */}
      <div className="sidebar-section" style={{ flex: 1 }}>
        {navItems.map(group => (
          <div key={group.label} style={{ marginBottom: 20 }}>
            <div className="sidebar-section-label">{group.label}</div>
            {group.links.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              >
                <span className="nav-icon">{link.icon}</span>
                {link.label}
              </NavLink>
            ))}
          </div>
        ))}
      </div>

      {/* User footer */}
      <div className="sidebar-footer">
        <div className="user-chip">
          <div className="user-avatar" style={{ background: av.bg, color: av.color }}>
            {initials}
          </div>
          <div className="user-info">
            <div className="user-name">{user?.name}</div>
            <div className="user-role" style={{ textTransform: 'capitalize' }}>{user?.role}</div>
          </div>
        </div>
        <button
          className="btn btn-outline btn-sm"
          style={{ width: '100%', justifyContent: 'center' }}
          onClick={handleLogout}
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
