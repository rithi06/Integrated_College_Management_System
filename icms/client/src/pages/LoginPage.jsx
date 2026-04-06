import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm]     = useState({ email: '', password: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  // Already logged in
  if (user) { navigate(`/${user.role}`); return null; }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const u = await login(form.email.trim(), form.password);
      navigate(`/${u.role}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = (email, password) => setForm({ email, password });

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg)', padding: '20px',
    }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: 52, height: 52, borderRadius: 12, background: 'var(--primary)',
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: 700, margin: '0 auto 14px',
          }}>IC</div>
          <h1 style={{ fontSize: '1.4rem', marginBottom: 4 }}>Welcome to ICMS</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            Integrated College Management System
          </p>
        </div>

        {/* Card */}
        <div className="card">
          {error && <div className="alert alert-danger">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label>Email address</label>
              <input
                className="form-control"
                type="email" required autoFocus
                placeholder="you@icms.edu"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label>Password</label>
              <input
                className="form-control"
                type="password" required
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
              disabled={loading}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        {/* Quick-login hints */}
        <div className="card" style={{ marginTop: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 10 }}>
            DEMO ACCOUNTS
          </p>
          {[
            { role: 'Admin',   email: 'admin@icms.edu',    pass: 'admin123',   color: 'var(--primary)' },
            { role: 'Faculty', email: 'meena@icms.edu',    pass: 'faculty123', color: 'var(--teal)' },
            { role: 'Student', email: 'priya@icms.edu',    pass: 'student123', color: 'var(--amber)' },
          ].map(d => (
            <div key={d.role}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 10px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)',
                marginBottom: 6,
              }}
            >
              <div>
                <span style={{
                  fontSize: 11, fontWeight: 700, background: d.color + '22',
                  color: d.color, padding: '1px 7px', borderRadius: 10, marginRight: 8,
                }}>{d.role}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d.email}</span>
              </div>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => quickLogin(d.email, d.pass)}
              >Use</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
