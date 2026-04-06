import React, { useState } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { today } from '../../utils/helpers';

export default function AdminAttendance() {
  const [date, setDate] = useState(today());

  // ✅ FIX: ONLY pass URL (date already inside URL)
  const { data, loading, error } = useFetch(`/admin/attendance?date=${date}`);

  const records = data || [];

  const present = records.filter(r => r.status === 'present').length;
  const absent  = records.filter(r => r.status === 'absent').length;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Attendance records</h1>

        <input
          type="date"
          className="form-control"
          value={date}
          onChange={e => setDate(e.target.value)}
        />
      </div>

      <div className="page-body">
        {error && <div className="alert alert-danger">{error}</div>}

        <p>Total: {records.length} | Present: {present} | Absent: {absent}</p>

        {loading ? (
          <div className="page-loader"><div className="spinner" /></div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Student</th><th>Subject</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r, i) => (
                <tr key={i}>
                  <td>{r.student_name}</td>
                  <td>{r.subject}</td>
                  <td>{r.status}</td>
                </tr>
              ))}
              {!records.length && (
                <tr><td colSpan={3}>No data</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}