import React from 'react';

export default function StatCard({ label, value, sub, icon, iconBg, iconColor }) {
  return (
    <div className="stat-card">
      {icon && (
        <div className="stat-icon" style={{ background: iconBg || 'var(--primary-lt)', color: iconColor || 'var(--primary)' }}>
          {icon}
        </div>
      )}
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}
