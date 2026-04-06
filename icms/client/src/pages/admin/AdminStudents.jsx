import React, { useState, useMemo } from 'react';
import { useFetch } from '../../hooks/useFetch';
import Modal from '../../components/common/Modal';
import ConfirmModal from '../../components/common/ConfirmModal';
import api from '../../api/axios';
import { fmtDate, cgpaColor } from '../../utils/helpers';

const EMPTY = {
  name: '', email: '', phone: '', password: 'student123',
  roll_number: '', department_id: '', semester: '', batch_year: '', address: '', dob: '',
};

export default function AdminStudents() {
const { data, loading, error, refetch } = useFetch('/admin/students');
const students = data || [];
  const { data: depts = [] } = useFetch('/admin/departments');

  const [search, setSearch]     = useState('');
  const [modal,  setModal]      = useState(null); // null | 'add' | 'edit'
  const [form,   setForm]       = useState(EMPTY);
  const [delId,  setDelId]      = useState(null);
  const [saving, setSaving]     = useState(false);
  const [formErr,setFormErr]    = useState('');

  const filtered = useMemo(() =>
    students.filter(s =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.roll_number.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase())
    ), [students, search]);

  const openAdd  = () => { setForm(EMPTY); setFormErr(''); setModal('add'); };
  const openEdit = (s) => {
    setForm({
      id: s.id, name: s.name, email: s.email, phone: s.phone || '',
      roll_number: s.roll_number, department_id: s.department_id,
      semester: s.semester, batch_year: s.batch_year || '',
      address: s.address || '', dob: s.dob ? s.dob.split('T')[0] : '',
    });
    setFormErr('');
    setModal('edit');
  };

  const handleSave = async () => {
    setSaving(true); setFormErr('');
    try {
      if (modal === 'add') {
        await api.post('/admin/students', form);
      } else {
        await api.put(`/admin/students/${form.id}`, form);
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
      await api.delete(`/admin/students/${delId}`);
      setDelId(null); refetch();
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Students</h1>
          <p className="page-subtitle">{students.length} enrolled students</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add student</button>
      </div>

      <div className="page-body">
        {error && <div className="alert alert-danger">{error}</div>}

        <div className="action-bar">
          <input
            className="search-input"
            placeholder="Search by name, roll, email…"
            value={search} onChange={e => setSearch(e.target.value)}
          />
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {filtered.length} results
          </span>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div className="page-loader"><div className="spinner" /></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Student</th><th>Roll No.</th><th>Department</th>
                    <th>Sem</th><th>Batch</th><th>CGPA</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(s => {
                    const cc = cgpaColor(s.cgpa);
                    return (
                      <tr key={s.id}>
                        <td>
                          <div style={{ fontWeight: 500 }}>{s.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.email}</div>
                        </td>
                        <td><span className="badge badge-gray">{s.roll_number}</span></td>
                        <td>{s.department}</td>
                        <td>{s.semester}</td>
                        <td>{s.batch_year}</td>
                        <td>
                          <span className="cgpa-pill" style={{ background: cc.bg, color: cc.color }}>
                            {s.cgpa || '–'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-outline btn-sm" onClick={() => openEdit(s)}>Edit</button>
                            <button className="btn btn-danger btn-sm"  onClick={() => setDelId(s.id)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!filtered.length && (
                    <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>
                      No students found
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Modal */}
      {modal && (
        <Modal
          title={modal === 'add' ? 'Add new student' : 'Edit student'}
          onClose={() => setModal(null)}
          size="lg"
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setModal(null)} disabled={saving}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </>
          }
        >
          {formErr && <div className="alert alert-danger">{formErr}</div>}
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
            <div className="form-group">
              <label>Roll number *</label>
              <input className="form-control" value={form.roll_number} onChange={e => set('roll_number', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Department *</label>
              <select className="form-control" value={form.department_id} onChange={e => set('department_id', e.target.value)}>
                <option value="">Select department</option>
                {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Semester</label>
              <select className="form-control" value={form.semester} onChange={e => set('semester', e.target.value)}>
                <option value="">Select</option>
                {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Batch year</label>
              <input className="form-control" type="number" placeholder="2021" value={form.batch_year} onChange={e => set('batch_year', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Date of birth</label>
              <input className="form-control" type="date" value={form.dob} onChange={e => set('dob', e.target.value)} />
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label>Address</label>
            <textarea className="form-control" rows={2} value={form.address} onChange={e => set('address', e.target.value)} />
          </div>
          {modal === 'add' && (
            <div className="form-group">
              <label>Initial password</label>
              <input className="form-control" value={form.password} onChange={e => set('password', e.target.value)} />
            </div>
          )}
        </Modal>
      )}

      {/* Delete confirmation */}
      {delId && (
        <ConfirmModal
          title="Delete student"
          message="This will permanently delete the student, their marks and attendance records. This cannot be undone."
          onConfirm={handleDelete}
          onClose={() => setDelId(null)}
          loading={saving}
        />
      )}
    </>
  );
}
