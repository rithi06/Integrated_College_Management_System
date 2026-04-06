import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { useFetch } from '../../hooks/useFetch';
import StatCard from '../../components/common/StatCard';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#7c3aed'];

export default function AdminOverview() {
  const { data, loading, error } = useFetch('/admin/dashboard');

  if (loading) return (
    <div className="page-loader"><div className="spinner" /><p>Loading dashboard…</p></div>
  );
  if (error) return (
    <div className="page-body"><div className="alert alert-danger">{error}</div></div>
  );

  const { totals, subjectAvgMarks, deptAvgCgpa, todayAttendance, deptAttendance } = data;

  const pieData = [
    { name: 'Present', value: parseInt(todayAttendance?.present || 0) },
    { name: 'Absent',  value: parseInt(todayAttendance?.absent  || 0) },
  ];

  const deptAttData = (deptAttendance || []).map(d => ({
    name:    d.code,
    Present: parseInt(d.present || 0),
    Absent:  parseInt(d.absent  || 0),
  }));

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">College-wide overview for today</p>
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {new Date().toLocaleDateString('en-IN', { dateStyle: 'full' })}
        </span>
      </div>

      <div className="page-body">
        {/* Stats */}
        <div className="stat-grid" style={{ marginBottom: 20 }}>
          <StatCard label="Total Students"    value={totals.students}    icon="🎓" iconBg="#eef2ff" iconColor="var(--primary)" />
          <StatCard label="Total Faculty"     value={totals.faculty}     icon="👨‍🏫" iconBg="#d1fae5" iconColor="var(--teal)" />
          <StatCard label="Total Subjects"    value={totals.subjects}    icon="📚" iconBg="#fef3c7" iconColor="var(--amber)" />
          <StatCard label="Departments"       value={totals.departments} icon="🏫" iconBg="#dbeafe" iconColor="var(--info)" />
          <StatCard label="Overall Avg CGPA"  value={totals.overallCgpa || '—'} icon="⭐" iconBg="#ede9fe" iconColor="var(--purple)" />
          <StatCard
            label="Today Present"
            value={todayAttendance?.present || 0}
            sub={`of ${todayAttendance?.total || 0} students`}
            icon="✅" iconBg="#d1fae5" iconColor="var(--teal)"
          />
        </div>

        {/* Charts row 1 */}
        <div className="chart-grid" style={{ marginBottom: 20 }}>
          {/* Avg marks by subject */}
          <div className="card">
            <h3 style={{ marginBottom: 14, fontSize: 13 }}>Avg marks by subject</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={subjectAvgMarks} margin={{ top: 0, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" />
                <XAxis dataKey="subject_name" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={40} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Tooltip formatter={v => [`${v}`, 'Avg marks']} />
                <Bar dataKey="avg_marks" fill="#4f46e5" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Avg CGPA by department */}
          <div className="card">
            <h3 style={{ marginBottom: 14, fontSize: 13 }}>Avg CGPA by department</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={deptAvgCgpa} margin={{ top: 0, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" />
                <XAxis dataKey="department_name" tick={{ fontSize: 10 }} interval={0} angle={-10} textAnchor="end" height={40} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 10 }} />
                <Tooltip formatter={v => [`${v}`, 'Avg CGPA']} />
                <Bar dataKey="avg_cgpa" radius={[4,4,0,0]}>
                  {deptAvgCgpa.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Charts row 2 */}
        <div className="chart-grid">
          {/* Today's attendance pie */}
          <div className="card">
            <h3 style={{ marginBottom: 14, fontSize: 13 }}>Today's attendance</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90}
                  paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name}: ${(percent*100).toFixed(0)}%`}
                  labelLine={false} fontSize={11}
                >
                  <Cell fill="#10b981" />
                  <Cell fill="#ef4444" />
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Dept-wise attendance today */}
          <div className="card">
            <h3 style={{ marginBottom: 14, fontSize: 13 }}>Dept-wise attendance today</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={deptAttData} margin={{ top: 0, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Present" fill="#10b981" radius={[4,4,0,0]} stackId="a" />
                <Bar dataKey="Absent"  fill="#ef4444" radius={[4,4,0,0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </>
  );
}
