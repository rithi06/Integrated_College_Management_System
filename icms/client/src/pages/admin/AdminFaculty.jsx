import React, { useState, useMemo, useEffect } from 'react';
import { useFetch } from '../../hooks/useFetch';
import Modal from '../../components/common/Modal';
import ConfirmModal from '../../components/common/ConfirmModal';
import api from '../../api/axios';
import { fmtDate } from '../../utils/helpers';

const EMPTY = {
  name: '', email: '', phone: '', password: 'faculty123',
  department_id: '', designation: '', qualification: '',
  experience_yrs: '', joining_date: '', subject_ids: [],
};

export default function AdminFaculty() {
const { data, loading, error, refetch } = useFetch('/admin/faculty');
const faculty = data || [];
const { data: deptsData } = useFetch('/admin/departments');
const depts = deptsData || [];

const { data: allSubjectsData } = useFetch('/admin/subjects');
const allSubjects = allSubjectsData || [];

  const [search,   setSearch]  = useState('');
  const [modal,    setModal]   = useState(null);
  const [form,     setForm]    = useState(EMPTY);
  const [delId,    setDelId]   = useState(null);
  const [saving,   setSaving]  = useState(false);
  const [formErr,  setFormErr] = useState('');
  const [viewFac,  setViewFac] = useState(null); // view detail modal

  // subjects filtered by selected department
  const deptSubjects = useMemo(() =>
    allSubjects.filter(s => !form.department_id || String(s.department_id) === String(form.department_id)),
  [allSubjects, form.department_id]);

  const filtered = useMemo(() =>
    faculty.filter(f =>
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.email.toLowerCase().includes(search.toLowerCase()) ||
      f.department.toLowerCase().includes(search.toLowerCase())
    ), [faculty, search]);

  const openAdd  = () => { setForm(EMPTY); setFormErr(''); setModal('add'); };
  const openEdit = async (f) => {
    setFormErr('');
    // Fetch full details with current subjects
    try {
      const res = await api.get(`/admin/faculty/${f.id}`);
      const d = res.data;
      setForm({
        id: d.id, name: d.name, email: d.email, phone: d.phone || '',
        department_id: d.department_id, designation: d.designation || '',
        qualification: d.qualification || '', experience_yrs: d.experience_yrs || '',
        joining_date: d.joining_date ? d.joining_date.split('T')[0] : '',
        subject_ids: d.subjects.map(s => s.id),
      });
      setModal('edit');
    } catch { setFormErr('Could not load faculty details'); }
  };

  const openView = async (f) => {
    try {
      const res = await api.get(`/admin/faculty/${f.id}`);
      setViewFac(res.data);
    } catch { /* ignore */ }
  };

  const handleSave = async () => {
    setSaving(true); setFormErr('');
    try {
      if (modal === 'add') {
        await api.post('/admin/faculty', form);
      } else {
        await api.put(`/admin/faculty/${form.id}`, form);
      }
      setModal(null);
      refetch();
    } catch (err) {
      setFormErr(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await api.delete(`/admin/faculty/${delId}`);
      setDelId(null); refetch();
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleSubject = (id) => {
    setForm(f => ({
      ...f,
      subject_ids: f.subject_ids.includes(id)
        ? f.subject_ids.filter(x => x !== id)
        : [...f.subject_ids, id],
    }));
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Faculty</h1>
          <p className="page-subtitle">{faculty.length} faculty members</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add faculty</button>
      </div>

      <div className="page-body">
        {error && <div className="alert alert-danger">{error}</div>}

        <div className="action-bar">
          <input
            className="search-input"
            placeholder="Search by name, email, department…"
            value={search} onChange={e => setSearch(e.target.value)}
          />
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{filtered.length} results</span>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div className="page-loader"><div className="spinner" /></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Faculty</th><th>Department</th><th>Designation</th>
                    <th>Experience</th><th>Subjects</th><th>Joining date</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(f => (
                    <tr key={f.id}>
                      <td>
                        <div style={{ fontWeight: 500 }}>{f.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{f.email}</div>
                        {f.phone && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{f.phone}</div>}
                      </td>
                      <td><span className="badge badge-info">{f.dept_code}</span></td>
                      <td>{f.designation || '—'}</td>
                      <td>{f.experience_yrs ? `${f.experience_yrs} yrs` : '—'}</td>
                      <td>
                        <span className="badge badge-purple">{f.subject_count} subjects</span>
                      </td>
                      <td style={{ fontSize: 12 }}>{fmtDate(f.joining_date)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 5 }}>
                          <button className="btn btn-outline btn-sm" onClick={() => openView(f)}>View</button>
                          <button className="btn btn-outline btn-sm" onClick={() => openEdit(f)}>Edit</button>
                          <button className="btn btn-danger btn-sm"  onClick={() => setDelId(f.id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!filtered.length && (
                    <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>
                      No faculty found
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Faculty Modal */}
      {modal && (
        <Modal
          title={modal === 'add' ? 'Add new faculty' : 'Edit faculty details'}
          onClose={() => setModal(null)}
          size="lg"
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setModal(null)} disabled={saving}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </>
          }
        >
          {formErr && <div className="alert alert-danger">{formErr}</div>}

          {/* Personal details */}
          <p className="section-title">Personal details</p>
          <div className="form-grid-2" style={{ marginBottom: 14 }}>
            <div className="form-group">
              <label>Full name *</label>
              <input className="form-control" value={form.name} onChange={e => set('name', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Email *</label>
              <input className="form-control" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input className="form-control" value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
            {modal === 'add' && (
              <div className="form-group">
                <label>Initial password</label>
                <input className="form-control" value={form.password} onChange={e => set('password', e.target.value)} />
              </div>
            )}
          </div>

          {/* Academic details */}
          <p className="section-title">Academic details</p>
          <div className="form-grid-2" style={{ marginBottom: 14 }}>
            <div className="form-group">
              <label>Department *</label>
              <select className="form-control" value={form.department_id} onChange={e => { set('department_id', e.target.value); set('subject_ids', []); }}>
                <option value="">Select department</option>
                {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Designation</label>
              <input className="form-control" placeholder="e.g. Associate Professor" value={form.designation} onChange={e => set('designation', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Qualification</label>
              <input className="form-control" placeholder="e.g. M.Tech, PhD" value={form.qualification} onChange={e => set('qualification', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Experience (years)</label>
              <input className="form-control" type="number" min="0" value={form.experience_yrs} onChange={e => set('experience_yrs', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Joining date</label>
              <input className="form-control" type="date" value={form.joining_date} onChange={e => set('joining_date', e.target.value)} />
            </div>
          </div>

          {/* Subject assignment */}
          <p className="section-title">Assign subjects</p>
          {deptSubjects.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
              {form.department_id ? 'No subjects for this department' : 'Select a department first'}
            </p>
          ) : (
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))',
              gap: 8, marginBottom: 10,
            }}>
              {deptSubjects.map(s => {
                const checked = form.subject_ids.includes(s.id);
                return (
                  <label key={s.id} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 10px', borderRadius: 'var(--radius-sm)',
                    border: `1px solid ${checked ? 'var(--primary)' : 'var(--border)'}`,
                    background: checked ? 'var(--primary-lt)' : 'var(--bg)',
                    cursor: 'pointer', fontSize: 12,
                  }}>
                    <input type="checkbox" checked={checked} onChange={() => toggleSubject(s.id)}
                      style={{ accentColor: 'var(--primary)' }} />
                    <div>
                      <div style={{ fontWeight: 500 }}>{s.name}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>Sem {s.semester} · {s.code}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
          {form.subject_ids.length > 0 && (
            <p style={{ fontSize: 12, color: 'var(--primary)' }}>
              {form.subject_ids.length} subject{form.subject_ids.length > 1 ? 's' : ''} selected
            </p>
          )}
        </Modal>
      )}

      {/* View Faculty Modal */}
      {viewFac && (
        <Modal title="Faculty details" onClose={() => setViewFac(null)} size="md"
          footer={<button className="btn btn-outline" onClick={() => setViewFac(null)}>Close</button>}
        >
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 20 }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: 'var(--info-lt)', color: 'var(--info)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 700, flexShrink: 0,
            }}>
              {viewFac.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{viewFac.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{viewFac.designation} · {viewFac.department}</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 20px', marginBottom: 16 }}>
            {[
              ['Email', viewFac.email],
              ['Phone', viewFac.phone || '—'],
              ['Qualification', viewFac.qualification || '—'],
              ['Experience', viewFac.experience_yrs ? `${viewFac.experience_yrs} years` : '—'],
              ['Joining date', fmtDate(viewFac.joining_date)],
              ['Department', viewFac.department],
            ].map(([l, v]) => (
              <div key={l}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{l}</div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{v}</div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
            ASSIGNED SUBJECTS ({viewFac.subjects?.length || 0})
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {(viewFac.subjects || []).map(s => (
              <span key={s.id} className="badge badge-purple" style={{ padding: '4px 10px' }}>
                {s.name} · Sem {s.semester}
              </span>
            ))}
            {!viewFac.subjects?.length && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>No subjects assigned</span>}
          </div>
        </Modal>
      )}

      {/* Delete confirmation */}
      {delId && (
        <ConfirmModal
          title="Delete faculty"
          message="This will permanently delete the faculty member and unassign all their subjects. Recorded marks and attendance will remain."
          onConfirm={handleDelete}
          onClose={() => setDelId(null)}
          loading={saving}
        />
      )}
    </>
  );
}
