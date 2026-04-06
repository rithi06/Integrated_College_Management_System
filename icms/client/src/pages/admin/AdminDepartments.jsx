import React from 'react';
import { useFetch } from '../../hooks/useFetch';

export default function AdminDepartments() {
  const { data: depts = [], loading, error } = useFetch('/admin/departments');

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Departments</h1>
          <p className="page-subtitle">Overview of all departments</p>
        </div>
      </div>

      <div className="page-body">
        {error && <div className="alert alert-danger">{error}</div>}
        {loading ? <div className="page-loader"><div className="spinner" /></div> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 14 }}>
            {depts.map(d => (
              <div key={d.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{d.name}</div>
                    <span className="badge badge-info" style={{ marginTop: 4 }}>{d.code}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 700 }}>{d.student_count}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Students</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 700 }}>{d.faculty_count}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Faculty</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
