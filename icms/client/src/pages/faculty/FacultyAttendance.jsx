import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useFetch } from '../../hooks/useFetch';
import { today } from '../../utils/helpers';

export default function FacultyAttendance() {
  const { data: dash } = useFetch('/faculty/dashboard');
  const subjects = dash?.subjects || [];

  const [subjectId, setSubjectId] = useState('');
  const [date,      setDate]      = useState(today());
  const [students,  setStudents]  = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [msg,       setMsg]       = useState(null);

  useEffect(() => {
    if (!subjectId) return;
    setLoading(true);
    api.get(`/faculty/subjects/${subjectId}/attendance?date=${date}`)
      .then(res => setStudents(res.data.map(r => ({
        ...r,
        status: r.status === 'not_marked' ? 'present' : r.status,
      }))))
      .catch(() => setMsg({ type: 'danger', text: 'Failed to load students' }))
      .finally(() => setLoading(false));
  }, [subjectId, date]);

  const toggle = (idx, status) => {
    setStudents(prev => prev.map((s, i) => i === idx ? { ...s, status } : s));
  };

  const markAll = (status) => {
    setStudents(prev => prev.map(s => ({ ...s, status })));
  };

  const handleSave = async () => {
    setSaving(true); setMsg(null);
    try {
      const records = students.map(s => ({ student_id: s.student_id, status: s.status }));
      await api.post('/faculty/attendance', {
        subject_id: parseInt(subjectId), date, records,
      });
      setMsg({ type: 'success', text: `Attendance saved for ${records.length} students` });
    } catch (err) {
      setMsg({ type: 'danger', text: err.response?.data?.message || 'Save failed' });
    } finally { setSaving(false); }
  };

  const presentCount = students.filter(s => s.status === 'present').length;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Attendance</h1>
          <p className="page-subtitle">Mark attendance for your classes</p>
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
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Date</label>
              <input className="form-control" type="date" value={date}
                onChange={e => { setDate(e.target.value); setMsg(null); }} />
            </div>
          </div>
        </div>

        {msg && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}

        {subjectId && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Header bar */}
            <div style={{
              padding: '12px 16px', display: 'flex',
              justifyContent: 'space-between', alignItems: 'center',
              borderBottom: '1px solid var(--border)', flexWrap: 'wrap', gap: 8,
            }}>
              <div>
                <span style={{ fontWeight: 600, fontSize: 13 }}>
                  {subjects.find(s => String(s.id) === String(subjectId))?.name}
                </span>
                {students.length > 0 && (
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 10 }}>
                    {presentCount} / {students.length} present
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-outline btn-sm" onClick={() => markAll('present')}>Mark all present</button>
                <button className="btn btn-outline btn-sm" onClick={() => markAll('absent')}>Mark all absent</button>
                <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving || loading}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>

            {/* Student list */}
            {loading ? <div className="page-loader"><div className="spinner" /></div> : (
              <div style={{ padding: '12px 16px' }}>
                {students.map((s, i) => (
                  <div key={s.student_id} className="att-row">
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{s.name}</div>
                      <div className="roll">{s.roll_number}</div>
                    </div>
                    <div className="att-toggle">
                      <button
                        className={`att-btn ${s.status === 'present' ? 'present' : 'inactive'}`}
                        onClick={() => toggle(i, 'present')}
                      >Present</button>
                      <button
                        className={`att-btn ${s.status === 'absent' ? 'absent' : 'inactive'}`}
                        onClick={() => toggle(i, 'absent')}
                      >Absent</button>
                    </div>
                  </div>
                ))}
                {!students.length && (
                  <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>
                    No students enrolled
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {!subjectId && (
          <div className="card" style={{ textAlign: 'center', padding: 48 }}>
            <p style={{ color: 'var(--text-muted)' }}>Select a subject and date to mark attendance</p>
          </div>
        )}
      </div>
    </>
  );
}
