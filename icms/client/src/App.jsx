import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import LoginPage from './pages/LoginPage';

import AdminLayout  from './pages/admin/AdminLayout';
import AdminOverview   from './pages/admin/AdminOverview';
import AdminStudents   from './pages/admin/AdminStudents';
import AdminFaculty    from './pages/admin/AdminFaculty';
import AdminSubjects   from './pages/admin/AdminSubjects';
import AdminAttendance from './pages/admin/AdminAttendance';
import AdminDepartments from './pages/admin/AdminDepartments';

import FacultyLayout   from './pages/faculty/FacultyLayout';
import FacultyOverview from './pages/faculty/FacultyOverview';
import FacultyMarks    from './pages/faculty/FacultyMarks';
import FacultyAttendance from './pages/faculty/FacultyAttendance';

import StudentLayout   from './pages/student/StudentLayout';
import StudentOverview from './pages/student/StudentOverview';
import StudentMarks    from './pages/student/StudentMarks';
import StudentAttendance from './pages/student/StudentAttendance';
import StudentProfile  from './pages/student/StudentProfile';

// Guard: redirect to login if not authenticated, or to correct dashboard by role
const ProtectedRoute = ({ children, allowedRole }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="page-loader">
        <div className="spinner" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Allow admin everywhere OR exact role match
  if (allowedRole && user.role !== allowedRole && user.role !== 'admin') {
    return <Navigate to={`/${user.role}`} replace />;
  }

  return children;
};
// Root redirect by role
const RootRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={`/${user.role}`} replace />;
};

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<RootRedirect />} />

        {/* ── Admin ── */}
        <Route path="/admin" element={<ProtectedRoute allowedRole="admin"><AdminLayout /></ProtectedRoute>}>
          <Route index element={<AdminOverview />} />
          <Route path="students"    element={<AdminStudents />} />
          <Route path="faculty"     element={<AdminFaculty />} />
          <Route path="subjects"    element={<AdminSubjects />} />
          <Route path="attendance"  element={<AdminAttendance />} />
          <Route path="departments" element={<AdminDepartments />} />
        </Route>

        {/* ── Faculty ── */}
        <Route path="/faculty" element={<ProtectedRoute allowedRole="faculty"><FacultyLayout /></ProtectedRoute>}>
          <Route index element={<FacultyOverview />} />
          <Route path="marks"      element={<FacultyMarks />} />
          <Route path="attendance" element={<FacultyAttendance />} />
        </Route>

        {/* ── Student ── */}
        <Route path="/student" element={<ProtectedRoute allowedRole="student"><StudentLayout /></ProtectedRoute>}>
          <Route index element={<StudentOverview />} />
          <Route path="marks"      element={<StudentMarks />} />
          <Route path="attendance" element={<StudentAttendance />} />
          <Route path="profile"    element={<StudentProfile />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
