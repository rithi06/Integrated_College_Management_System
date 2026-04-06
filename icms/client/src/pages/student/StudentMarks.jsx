import React from 'react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { useFetch } from '../../hooks/useFetch';
import { getGrade, getGradeBadge } from '../../utils/helpers';

export default function StudentMarks() {
  const { data, loading, error } = useFetch('/student/marks');

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;
  if (error) return <div className="alert alert-danger">{error}</div>;

  const marks = data || [];

  const radarData = marks.map(m => ({
    subject: m.code,
    score: m.endsem ? Math.round((m.endsem / 100) * 10) : 0,
  }));

  const totalObtained = marks.reduce((s, m) =>
    s + (parseFloat(m.internal1 || 0) + parseFloat(m.internal2 || 0) + parseFloat(m.endsem || 0)), 0);

  const totalMax = marks.length * 300;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">My marks</h1>
      </div>

      <div className="page-body">
        {marks.length > 0 && (
          <p>Overall: {totalObtained.toFixed(0)} / {totalMax}</p>
        )}

        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Subject</th><th>Code</th><th>End-sem</th><th>Total</th><th>Grade</th>
              </tr>
            </thead>
            <tbody>
              {marks.map((m, i) => {
                const total = (parseFloat(m.internal1 || 0) + parseFloat(m.internal2 || 0) + parseFloat(m.endsem || 0));
                const grade = getGrade(m.endsem);

                return (
                  <tr key={i}>
                    <td>{m.subject}</td>
                    <td>{m.code}</td>
                    <td>{m.endsem ?? '-'}</td>
                    <td>{total.toFixed(1)}</td>
                    <td>
                      <span className={`badge ${getGradeBadge(m.endsem)}`}>{grade}</span>
                    </td>
                  </tr>
                );
              })}
              {!marks.length && (
                <tr><td colSpan={5}>No marks available</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}