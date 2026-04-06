import React, { useState, useEffect } from 'react';
import { useFetch } from '../../hooks/useFetch';
import api from '../../api/axios';
import { fmtDate, cgpaColor, initials } from '../../utils/helpers';
import { useAuth } from '../../context/AuthContext';

export default function StudentProfile() {
  const { user, updateUser } = useAuth();
  const { data: profile, loading, error, refetch } = useFetch('/student/profile');

  const [editing, setEditing]   = useState(false);
  const [form, setForm]         = useState({ phone: '', address: '' });
  const [pwForm, setPwForm]     = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState(null);
  const [pwMsg, setPwMsg]       = useState(null);
  const [showPw, setShowPw]     = useState(false);

  useEffect(() => {
    if (profile) setForm({ phone: profile.phone || '', address: profile.address || '' });
  }, [profile]);

  const handleSaveProfile = async () => {
    setSaving(true); setMsg(null);
    try {
      await api.put('/student/profile', form);
      updateUser({ phone: form.phone });
      setMsg({ type: 'success', text: 'Profile updated successfully' });
      setEditing(false);
      refetch();
    } catch (err) {
      setMsg({ type: 'danger', text: err.response?.data?.message || 'Update failed' });
    } finally { setSaving(false); }
  };

  const handleChangePassword = async () => {
    if (pwForm.newPassword !== pwForm.confirm) {
      setPwMsg({ type: 'danger', text: 'New passwords do not match' }); return;
    }
    if (pwForm.newPassword.length < 6) {
      setPwMsg({ type: 'danger', text: 'Password must be at least 6 characters' }); return;
    }
    setSaving(true); setPwMsg(null);
    try {
      await api.post('/auth/change-password', {
        currentPassword: pwForm.currentPassword,
        newPassword:     pwForm.newPassword,
      });
      setPwMsg({ type: 'success', text: 'Password changed successfully' });
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' });
      setShowPw(false);
    } catch (err) {
      setPwMsg({ type: 'danger', text: err.response?.data?.message || 'Failed to change password' });
    } finally { setSaving(false); }
  };

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;
  if (error)   return <div className="page-body"><div className="alert alert-danger">{error}</div></div>;
  if (!profile) return null;

  const cc = cgpaColor(profile.cgpa);
  const ini = initials(profile.name);

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">My profile</h1>
      </div>

      <div className="page-body">
        {msg && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}

        {/* Profile header card */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'var(--warning-lt)', color: 'var(--amber)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24, fontWeight: 700, flexShrink: 0,
            }}>{ini}</div>

            <div style={{ flex: 1, minWidth: 200 }}>
              <h2 style={{ marginBottom: 4 }}>{profile.name}</h2>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                <span className="badge badge-info">{profile.department}</span>
                <span className="badge badge-gray">Semester {profile.semester}</span>
                <span className="badge badge-gray">{profile.roll_number}</span>
                <span className="badge badge-gray">Batch {profile.batch_year}</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{profile.email}</div>
            </div>

            <div style={{
              textAlign: 'center',
              background: cc.bg, borderRadius: 'var(--radius)',
              padding: '12px 20px',
            }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: cc.color, lineHeight: 1 }}>
                {profile.cgpa || '—'}
              </div>
              <div style={{ fontSize: 11, color: cc.color, marginTop: 4 }}>CGPA / 10</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Personal info */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3>Personal information</h3>
              {!editing
                ? <button className="btn btn-outline btn-sm" onClick={() => setEditing(true)}>Edit</button>
                : <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-outline btn-sm" onClick={() => setEditing(false)}>Cancel</button>
                    <button className="btn btn-primary btn-sm" onClick={handleSaveProfile} disabled={saving}>
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                  </div>
              }
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                ['Full name',    profile.name,          false],
                ['Email',        profile.email,         false],
                ['Roll number',  profile.roll_number,   false],
                ['Date of birth',fmtDate(profile.dob),  false],
              ].map(([label, value]) => (
                <div key={label}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{value || '—'}</div>
                </div>
              ))}

              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Phone</div>
                {editing
                  ? <input className="form-control" value={form.phone}
                      onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                  : <div style={{ fontSize: 13, fontWeight: 500 }}>{profile.phone || '—'}</div>
                }
              </div>

              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Address</div>
                {editing
                  ? <textarea className="form-control" rows={2} value={form.address}
                      onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
                  : <div style={{ fontSize: 13, fontWeight: 500 }}>{profile.address || '—'}</div>
                }
              </div>
            </div>
          </div>

          {/* Academic info */}
          <div className="card">
            <h3 style={{ marginBottom: 16 }}>Academic information</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                ['Department',  profile.department],
                ['Dept code',   profile.dept_code],
                ['Semester',    `Semester ${profile.semester}`],
                ['Batch year',  profile.batch_year],
                ['CGPA',        profile.cgpa || '—'],
                ['Joined',      fmtDate(profile.created_at)],
              ].map(([l, v]) => (
                <div key={l}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{l}</div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Change password */}
        <div className="card" style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showPw ? 16 : 0 }}>
            <h3>Change password</h3>
            <button className="btn btn-outline btn-sm" onClick={() => { setShowPw(v => !v); setPwMsg(null); }}>
              {showPw ? 'Cancel' : 'Change password'}
            </button>
          </div>

          {showPw && (
            <>
              {pwMsg && <div className={`alert alert-${pwMsg.type}`}>{pwMsg.text}</div>}
              <div className="form-grid-3">
                <div className="form-group">
                  <label>Current password</label>
                  <input className="form-control" type="password"
                    value={pwForm.currentPassword}
                    onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>New password</label>
                  <input className="form-control" type="password"
                    value={pwForm.newPassword}
                    onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Confirm new password</label>
                  <input className="form-control" type="password"
                    value={pwForm.confirm}
                    onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} />
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <button className="btn btn-primary btn-sm" onClick={handleChangePassword} disabled={saving}>
                  {saving ? 'Updating…' : 'Update password'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
