import React, { useState, useMemo } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { attBadge, attLabel } from '../../utils/helpers';

export default function StudentAttendance() {
  const { data: dashboardData, loading: ovLoading, error: ovError } = useFetch('/student/dashboard');
  const { data: logData, loading: logLoading, error: logError } = useFetch('/student/attendance');

  const [filterSub, setFilterSub] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const attendance = dashboardData?.attendance || [];
  const log = logData || [];

  const subjects = useMemo(
    () => [...new Set(log.map(r => r.subject))],
    [log]
  );

  const filtered = useMemo(
    () =>
      log.filter(r =>
        (!filterSub || r.subject === filterSub) &&
        (!filterStatus || r.status === filterStatus)
      ),
    [log, filterSub, filterStatus]
  );

  if (ovLoading || logLoading) {
    return <div className="page-loader"><div className="spinner" /></div>;
  }

  if (ovError || logError) {
    return <div className="alert alert-danger">{ovError || logError}</div>;
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">My Attendance</h1>
          <p className="page-subtitle">Track your attendance details</p>
        </div>
      </div>

      <div className="page-body">

        {/* 🔥 Summary Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))',
          gap: 12,
          marginBottom: 20
        }}>
          {attendance.map((r, i) => (
            <div key={i} className="card card-sm">
              <div style={{ fontWeight: 600 }}>{r.subject}</div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: 6
              }}>
                <span style={{ fontSize: 20, fontWeight: 700 }}>
                  {r.percentage}%
                </span>
                <span className={`badge ${attBadge(r.percentage)}`}>
                  {attLabel(r.percentage)}
                </span>
              </div>

              <div className="progress-wrap" style={{ marginTop: 8 }}>
                <div
                  className="progress-bar"
                  style={{ width: `${r.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* 🔥 Filters */}
        <div className="card" style={{
          padding: '12px 16px',
          marginBottom: 10,
          display: 'flex',
          gap: 10
        }}>
          <select
            className="form-control"
            value={filterSub}
            onChange={e => setFilterSub(e.target.value)}
          >
            <option value="">All Subjects</option>
            {subjects.map(s => <option key={s}>{s}</option>)}
          </select>

          <select
            className="form-control"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="">All</option>
            <option value="present">Present</option>
            <option value="absent">Absent</option>
          </select>
        </div>

        {/* 🔥 Table */}
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Subject</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={i}>
                    <td>{new Date(r.date).toLocaleDateString()}</td>
                    <td>{r.subject}</td>
                    <td>
                      <span className={`badge ${
                        r.status === 'present'
                          ? 'badge-success'
                          : 'badge-danger'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}

                {!filtered.length && (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', padding: 20 }}>
                      No records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </>
  );
}