import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { useFetch } from '../../hooks/useFetch';
import StatCard from '../../components/common/StatCard';
import { useAuth } from '../../context/AuthContext';

export default function FacultyOverview() {
  const { user } = useAuth();
  const { data, loading, error } = useFetch('/faculty/dashboard');

  if (loading) return <div className="page-loader"><div className="spinner" /><p>Loading…</p></div>;
  if (error)   return <div className="page-body"><div className="alert alert-danger">{error}</div></div>;

  const { subjects = [], totalStudents = 0, marksAvgPerSub = [], todayAttendance = [] } = data;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">My overview</h1>
          <p className="page-subtitle">Welcome back, {user?.name}</p>
        </div>
      </div>

      <div className="page-body">
        <div className="stat-grid" style={{ marginBottom: 20 }}>
          <StatCard label="My subjects"   value={subjects.length}   icon="📚" iconBg="var(--primary-lt)" iconColor="var(--primary)" />
          <StatCard label="My students"   value={totalStudents}     icon="🎓" iconBg="#d1fae5" iconColor="var(--teal)" />
          <StatCard label="Avg marks"
            value={marksAvgPerSub.length
              ? (marksAvgPerSub.reduce((s, r) => s + parseFloat(r.avg_marks || 0), 0) / marksAvgPerSub.length).toFixed(1)
              : '—'
            }
            icon="📊" iconBg="var(--warning-lt)" iconColor="var(--warning)" />
        </div>

        {/* Charts */}
        <div className="chart-grid" style={{ marginBottom: 20 }}>
          <div className="card">
            <h3 style={{ marginBottom: 14, fontSize: 13 }}>Avg marks per subject</h3>
            {marksAvgPerSub.length ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={marksAvgPerSub} margin={{ top: 0, right: 8, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" />
                  <XAxis dataKey="subject_name" tick={{ fontSize: 10 }} interval={0} angle={-10} textAnchor="end" height={40} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={v => [`${v}`, 'Avg marks']} />
                  <Bar dataKey="avg_marks" fill="#0d9488" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No marks recorded yet</p>}
          </div>

          <div className="card">
            <h3 style={{ marginBottom: 14, fontSize: 13 }}>Today's attendance</h3>
            {todayAttendance.length ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={todayAttendance} margin={{ top: 0, right: 8, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" />
                  <XAxis dataKey="subject" tick={{ fontSize: 10 }} interval={0} angle={-10} textAnchor="end" height={40} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="present" fill="#10b981" radius={[4,4,0,0]} name="Present" />
                  <Bar dataKey="absent"  fill="#ef4444" radius={[4,4,0,0]} name="Absent" />
                </BarChart>
              </ResponsiveContainer>
            ) : <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No attendance marked today</p>}
          </div>
        </div>

        {/* Subjects table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px 0', fontWeight: 600, fontSize: 13 }}>My subjects</div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Subject</th><th>Code</th><th>Department</th><th>Semester</th><th>Credits</th></tr>
              </thead>
              <tbody>
                {subjects.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 500 }}>{s.name}</td>
                    <td><span className="badge badge-gray">{s.code}</span></td>
                    <td>{s.department}</td>
                    <td>Semester {s.semester}</td>
                    <td>{s.credits}</td>
                  </tr>
                ))}
                {!subjects.length && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>No subjects assigned</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
