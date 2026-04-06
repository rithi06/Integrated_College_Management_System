import React, { useState, useMemo } from 'react';
import { useFetch } from '../../hooks/useFetch';
import Modal from '../../components/common/Modal';
import ConfirmModal from '../../components/common/ConfirmModal';
import api from '../../api/axios';

const EMPTY = { name: '', code: '', department_id: '', semester: '', credits: 4, faculty_id: '' };

export default function AdminSubjects() {

const { data, loading, error, refetch } = useFetch('/admin/subjects');
const subjects = data || [];
const { data: deptsData } = useFetch('/admin/departments');
const depts = deptsData || [];
const { data: facultyData } = useFetch('/admin/faculty');
const faculty = facultyData || [];

  const [search, setSearch]   = useState('');
  const [modal,  setModal]    = useState(null);
  const [form,   setForm]     = useState(EMPTY);
  const [delId,  setDelId]    = useState(null);
  const [saving, setSaving]   = useState(false);
  const [formErr,setFormErr]  = useState('');

  const filtered = useMemo(() =>
    subjects.filter(s =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase()) ||
      s.department.toLowerCase().includes(search.toLowerCase())
    ), [subjects, search]);

  const deptFaculty = useMemo(() =>
    faculty.filter(f => !form.department_id || String(f.department_id) === String(form.department_id)),
  [faculty, form.department_id]);

  const openAdd  = () => { setForm(EMPTY); setFormErr(''); setModal('add'); };
  const openEdit = (s) => {
    setForm({
      id: s.id, name: s.name, code: s.code,
      department_id: s.department_id, semester: s.semester,
      credits: s.credits, faculty_id: s.faculty_id || '',
    });
    setFormErr(''); setModal('edit');
  };

  const handleSave = async () => {
    setSaving(true); setFormErr('');
    try {
      if (modal === 'add') await api.post('/admin/subjects', form);
      else                  await api.put(`/admin/subjects/${form.id}`, form);
      setModal(null); refetch();
    } catch (err) {
      setFormErr(err.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setSaving(true);
    try { await api.delete(`/admin/subjects/${delId}`); setDelId(null); refetch(); }
    catch { /* ignore */ }
    finally { setSaving(false); }
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Subjects</h1>
          <p className="page-subtitle">{subjects.length} subjects across all departments</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add subject</button>
      </div>

      <div className="page-body">
        {error && <div className="alert alert-danger">{error}</div>}

        <div className="action-bar">
          <input className="search-input" placeholder="Search subjects…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? <div className="page-loader"><div className="spinner" /></div> : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Subject</th><th>Code</th><th>Department</th>
                    <th>Sem</th><th>Credits</th><th>Faculty</th><th>Avg marks</th><th>Enrolled</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(s => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 500 }}>{s.name}</td>
                      <td><span className="badge badge-gray">{s.code}</span></td>
                      <td>{s.department}</td>
                      <td>{s.semester}</td>
                      <td>{s.credits}</td>
                      <td style={{ fontSize: 12 }}>{s.faculty_name || <span style={{ color: 'var(--text-hint)' }}>Unassigned</span>}</td>
                      <td>
                        {s.avg_marks > 0
                          ? <span className={`badge ${parseFloat(s.avg_marks) >= 70 ? 'badge-success' : parseFloat(s.avg_marks) >= 50 ? 'badge-warning' : 'badge-danger'}`}>
                              {s.avg_marks}
                            </span>
                          : <span style={{ color: 'var(--text-hint)', fontSize: 12 }}>—</span>
                        }
                      </td>
                      <td>{s.enrolled_count}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 5 }}>
                          <button className="btn btn-outline btn-sm" onClick={() => openEdit(s)}>Edit</button>
                          <button className="btn btn-danger  btn-sm" onClick={() => setDelId(s.id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!filtered.length && <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No subjects found</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {modal && (
        <Modal title={modal === 'add' ? 'Add subject' : 'Edit subject'} onClose={() => setModal(null)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setModal(null)} disabled={saving}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </>
          }
        >
          {formErr && <div className="alert alert-danger">{formErr}</div>}
          <div className="form-grid-2" style={{ marginBottom: 14 }}>
            <div className="form-group">
              <label>Subject name *</label>
              <input className="form-control" value={form.name} onChange={e => set('name', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Subject code *</label>
              <input className="form-control" placeholder="e.g. CS501" value={form.code} onChange={e => set('code', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Department *</label>
              <select className="form-control" value={form.department_id} onChange={e => { set('department_id', e.target.value); set('faculty_id', ''); }}>
                <option value="">Select</option>
                {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Semester</label>
              <select className="form-control" value={form.semester} onChange={e => set('semester', e.target.value)}>
                <option value="">Select</option>
                {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Credits</label>
              <input className="form-control" type="number" min="1" max="6" value={form.credits} onChange={e => set('credits', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Assign faculty</label>
              <select className="form-control" value={form.faculty_id} onChange={e => set('faculty_id', e.target.value)}>
                <option value="">Unassigned</option>
                {deptFaculty.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
          </div>
        </Modal>
      )}

      {delId && (
        <ConfirmModal title="Delete subject"
          message="This will delete the subject and all associated marks and attendance. This cannot be undone."
          onConfirm={handleDelete} onClose={() => setDelId(null)} loading={saving} />
      )}
    </>
  );
}
