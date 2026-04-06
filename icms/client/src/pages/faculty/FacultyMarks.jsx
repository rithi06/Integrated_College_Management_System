import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useFetch } from '../../hooks/useFetch';
import { getGrade, getGradeBadge } from '../../utils/helpers';

export default function FacultyMarks() {
  const { data: dash } = useFetch('/faculty/dashboard');
  const subjects = dash?.subjects || [];

  const [subjectId, setSubjectId]   = useState('');
  const [examType,  setExamType]    = useState('internal1');
  const [students,  setStudents]    = useState([]);  // [{ student_id, name, roll_number, marks_obtained }]
  const [loading,   setLoading]     = useState(false);
  const [saving,    setSaving]      = useState(false);
  const [msg,       setMsg]         = useState(null); // { type, text }

  // Load students + existing marks when subject/exam changes
  useEffect(() => {
    if (!subjectId) return;
    setLoading(true);
    api.get(`/faculty/subjects/${subjectId}/marks?exam_type=${examType}`)
      .then(res => {
        setStudents(res.data.map(r => ({
          student_id:     r.student_id,
          name:           r.name,
          roll_number:    r.roll_number,
          marks_obtained: r.marks_obtained !== null ? String(r.marks_obtained) : '',
        })));
      })
      .catch(() => setMsg({ type: 'danger', text: 'Failed to load students' }))
      .finally(() => setLoading(false));
  }, [subjectId, examType]);

  const setMark = (idx, val) => {
    setStudents(prev => prev.map((s, i) => i === idx ? { ...s, marks_obtained: val } : s));
  };

  const handleSave = async () => {
    setSaving(true); setMsg(null);
    const records = students
      .filter(s => s.marks_obtained !== '')
      .map(s => ({ student_id: s.student_id, marks_obtained: parseFloat(s.marks_obtained) }));

    if (!records.length) {
      setMsg({ type: 'danger', text: 'Enter at least one mark' });
      setSaving(false); return;
    }
    try {
      await api.post('/faculty/marks', { subject_id: parseInt(subjectId), exam_type: examType, records });
      setMsg({ type: 'success', text: `Marks saved for ${records.length} students` });
    } catch (err) {
      setMsg({ type: 'danger', text: err.response?.data?.message || 'Save failed' });
    } finally { setSaving(false); }
  };

  const examLabels = { internal1: 'Internal 1', internal2: 'Internal 2', endsem: 'End Semester' };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Marks</h1>
          <p className="page-subtitle">Add or update marks for your subjects</p>
        </div>
      </div>

      <div className="page-body">
        {/* Controls */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="form-grid-2">
            <div className="form-group">
              <label>Subject</label>
              <select className="form-control" value={subjectId}
                onChange={e => { setSubjectId(e.target.value); setMsg(null); }}>
                <option value="">Select subject</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name} (Sem {s.semester})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Exam type</label>
              <select className="form-control" value={examType}
                onChange={e => { setExamType(e.target.value); setMsg(null); }}>
                {Object.entries(examLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
        </div>

        {msg && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}

        {/* Marks table */}
        {subjectId && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{
              padding: '14px 16px', display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', borderBottom: '1px solid var(--border)',
            }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>
                {subjects.find(s => String(s.id) === String(subjectId))?.name} — {examLabels[examType]}
              </span>
              <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving || loading}>
                {saving ? 'Saving…' : 'Save marks'}
              </button>
            </div>

            {loading ? <div className="page-loader"><div className="spinner" /></div> : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>#</th><th>Roll no.</th><th>Student name</th><th>Marks (out of 100)</th><th>Grade</th></tr>
                  </thead>
                  <tbody>
                    {students.map((s, i) => {
                      const marks = parseFloat(s.marks_obtained);
                      const grade = !isNaN(marks) ? getGrade(marks) : '—';
                      const gbadge = !isNaN(marks) ? getGradeBadge(marks) : 'badge-gray';
                      return (
                        <tr key={s.student_id}>
                          <td style={{ color: 'var(--text-muted)', width: 40 }}>{i + 1}</td>
                          <td><span className="badge badge-gray">{s.roll_number}</span></td>
                          <td style={{ fontWeight: 500 }}>{s.name}</td>
                          <td>
                            <input
                              className="form-control"
                              type="number" min="0" max="100" step="0.5"
                              placeholder="—"
                              value={s.marks_obtained}
                              onChange={e => setMark(i, e.target.value)}
                              style={{ width: 100 }}
                            />
                          </td>
                          <td><span className={`badge ${gbadge}`}>{grade}</span></td>
                        </tr>
                      );
                    })}
                    {!students.length && !loading && (
                      <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>
                        No students enrolled in this subject
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {!subjectId && (
          <div className="card" style={{ textAlign: 'center', padding: 48 }}>
            <p style={{ color: 'var(--text-muted)' }}>Select a subject to view and enter marks</p>
          </div>
        )}
      </div>
    </>
  );
}
