import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell,
} from 'recharts';
import { useFetch } from '../../hooks/useFetch';
import { useAuth } from '../../context/AuthContext';

export default function StudentOverview() {
  const { user } = useAuth();
  const { data, loading, error } = useFetch('/student/dashboard');

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;
  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!data) return null;

  const profile = data.profile || {};
  const attendance = data.attendance || [];
  const cgpaHistory = data.cgpaHistory || [];

  const cgpaData = cgpaHistory.map(r => ({
    sem: `Sem ${r.semester}`,
    SGPA: parseFloat(r.sgpa || 0),
  }));

  const attData = attendance.map(r => ({
    name: r.code,
    pct: parseFloat(r.percentage || 0),
  }));

  const overallAtt = attendance.length
    ? Math.round(attendance.reduce((s, r) => s + parseFloat(r.percentage || 0), 0) / attendance.length)
    : 0;

  return (
    <>
      <div className="page-header">
        <h1>Welcome, {user?.name}</h1>
      </div>

      <div className="page-body">

        {/* Stats */}
        <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
          <div className="card">CGPA: {profile.cgpa || '-'}</div>
          <div className="card">Attendance: {overallAtt}%</div>
          <div className="card">Semester: {profile.semester || '-'}</div>
        </div>

        {/* Charts */}
        <div style={{ display: 'flex', gap: 20 }}>

          {/* CGPA Chart */}
          <div className="card" style={{ width: '50%' }}>
            <h3>SGPA History</h3>
            {cgpaData.length ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={cgpaData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="sem" />
                  <YAxis domain={[0, 10]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="SGPA" stroke="#4f46e5" />
                </LineChart>
              </ResponsiveContainer>
            ) : <p>No data</p>}
          </div>

          {/* Attendance Chart */}
          <div className="card" style={{ width: '50%' }}>
            <h3>Attendance</h3>
            {attData.length ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={attData}>
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="pct">
                    {attData.map((d, i) => (
                      <Cell key={i} fill={d.pct >= 75 ? 'green' : d.pct >= 60 ? 'orange' : 'red'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <p>No data</p>}
          </div>

        </div>
      </div>
    </>
  );
}