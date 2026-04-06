-- ============================================================
-- ICMS – Integrated College Management System
-- PostgreSQL Schema
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Drop order (reverse FK dependency) ────────────────────
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS marks CASCADE;
DROP TABLE IF EXISTS enrollments CASCADE;
DROP TABLE IF EXISTS faculty_subjects CASCADE;
DROP TABLE IF EXISTS subjects CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS faculty CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ── users ──────────────────────────────────────────────────
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL,
  email       VARCHAR(100) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role        VARCHAR(10)  NOT NULL CHECK (role IN ('admin','faculty','student')),
  phone       VARCHAR(15),
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW()
);

-- ── departments ────────────────────────────────────────────
CREATE TABLE departments (
  id    SERIAL PRIMARY KEY,
  name  VARCHAR(80) NOT NULL UNIQUE,
  code  VARCHAR(10) NOT NULL UNIQUE
);

-- ── students ───────────────────────────────────────────────
CREATE TABLE students (
  user_id       UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  roll_number   VARCHAR(20) UNIQUE NOT NULL,
  department_id INT REFERENCES departments(id),
  semester      INT CHECK (semester BETWEEN 1 AND 8),
  batch_year    INT,
  address       TEXT,
  dob           DATE
);

-- ── faculty ────────────────────────────────────────────────
CREATE TABLE faculty (
  user_id        UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  department_id  INT REFERENCES departments(id),
  designation    VARCHAR(100),
  qualification  VARCHAR(100),
  experience_yrs INT DEFAULT 0,
  joining_date   DATE
);

-- ── subjects ───────────────────────────────────────────────
CREATE TABLE subjects (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  code          VARCHAR(20)  NOT NULL UNIQUE,
  department_id INT REFERENCES departments(id),
  semester      INT CHECK (semester BETWEEN 1 AND 8),
  credits       INT DEFAULT 4
);

-- ── faculty–subject mapping ────────────────────────────────
CREATE TABLE faculty_subjects (
  faculty_id  UUID REFERENCES faculty(user_id) ON DELETE CASCADE,
  subject_id  INT  REFERENCES subjects(id)    ON DELETE CASCADE,
  academic_year VARCHAR(10) DEFAULT '2025-26',
  PRIMARY KEY (faculty_id, subject_id)
);

-- ── enrollments ────────────────────────────────────────────
CREATE TABLE enrollments (
  student_id UUID REFERENCES students(user_id) ON DELETE CASCADE,
  subject_id INT  REFERENCES subjects(id)      ON DELETE CASCADE,
  PRIMARY KEY (student_id, subject_id)
);

-- ── marks ──────────────────────────────────────────────────
CREATE TABLE marks (
  id               SERIAL PRIMARY KEY,
  student_id       UUID REFERENCES students(user_id) ON DELETE CASCADE,
  subject_id       INT  REFERENCES subjects(id)      ON DELETE CASCADE,
  exam_type        VARCHAR(20) NOT NULL CHECK (exam_type IN ('internal1','internal2','endsem')),
  marks_obtained   NUMERIC(5,2) NOT NULL,
  max_marks        NUMERIC(5,2) DEFAULT 100,
  recorded_by      UUID REFERENCES faculty(user_id),
  recorded_at      TIMESTAMP DEFAULT NOW(),
  UNIQUE (student_id, subject_id, exam_type)
);

-- ── attendance ─────────────────────────────────────────────
CREATE TABLE attendance (
  id          SERIAL PRIMARY KEY,
  student_id  UUID REFERENCES students(user_id) ON DELETE CASCADE,
  subject_id  INT  REFERENCES subjects(id)      ON DELETE CASCADE,
  date        DATE NOT NULL,
  status      VARCHAR(10) NOT NULL CHECK (status IN ('present','absent')),
  marked_by   UUID REFERENCES faculty(user_id),
  UNIQUE (student_id, subject_id, date)
);

-- ── Useful views ───────────────────────────────────────────
CREATE OR REPLACE VIEW student_cgpa AS
SELECT
  s.user_id AS student_id,
  ROUND(
    SUM(m.marks_obtained * sub.credits) /
    NULLIF(SUM(sub.credits),0) / 10, 2
  ) AS cgpa
FROM students s
JOIN marks m       ON m.student_id = s.user_id
JOIN subjects sub  ON sub.id = m.subject_id
WHERE m.exam_type = 'endsem'
GROUP BY s.user_id;

CREATE OR REPLACE VIEW subject_avg_marks AS
SELECT
  sub.id AS subject_id,
  sub.name AS subject_name,
  sub.code,
  AVG(m.marks_obtained)::NUMERIC(5,2) AS avg_marks,
  COUNT(DISTINCT m.student_id) AS student_count
FROM subjects sub
JOIN marks m ON m.subject_id = sub.id
GROUP BY sub.id, sub.name, sub.code;

CREATE OR REPLACE VIEW dept_avg_cgpa AS
SELECT
  d.id AS department_id,
  d.name AS department_name,
  ROUND(AVG(sc.cgpa)::NUMERIC, 2) AS avg_cgpa
FROM departments d
JOIN students s     ON s.department_id = d.id
JOIN student_cgpa sc ON sc.student_id = s.user_id
GROUP BY d.id, d.name;

-- ── Seed data ──────────────────────────────────────────────
INSERT INTO departments (name, code) VALUES
  ('Computer Science & Engineering', 'CSE'),
  ('Electronics & Communication',    'ECE'),
  ('Mechanical Engineering',         'MECH'),
  ('Civil Engineering',              'CIVIL');

-- Admin user  (password: admin123)
INSERT INTO users (id, name, email, password_hash, role, phone) VALUES
  ('00000000-0000-0000-0000-000000000001',
   'Dr. Ramesh Kumar',
   'admin@icms.edu',
   '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- admin123
   'admin',
   '9876543210');

-- Faculty users (password: faculty123)
INSERT INTO users (id, name, email, password_hash, role, phone) VALUES
  ('00000000-0000-0000-0000-000000000002',
   'Prof. Meena Iyer',
   'meena@icms.edu',
   '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
   'faculty', '9876543211'),
  ('00000000-0000-0000-0000-000000000003',
   'Dr. Kumar Swamy',
   'kumar@icms.edu',
   '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
   'faculty', '9876543212'),
  ('00000000-0000-0000-0000-000000000004',
   'Prof. Lakshmi R',
   'lakshmi@icms.edu',
   '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
   'faculty', '9876543213');

INSERT INTO faculty (user_id, department_id, designation, qualification, experience_yrs, joining_date) VALUES
  ('00000000-0000-0000-0000-000000000002', 1, 'Associate Professor', 'M.Tech, PhD', 12, '2012-07-01'),
  ('00000000-0000-0000-0000-000000000003', 2, 'Assistant Professor', 'M.E',          7, '2017-08-01'),
  ('00000000-0000-0000-0000-000000000004', 3, 'Professor',           'M.Tech, PhD', 18, '2006-06-01');

-- Student users (password: student123)
INSERT INTO users (id, name, email, password_hash, role, phone) VALUES
  ('00000000-0000-0000-0000-000000000010',
   'Priya Sundaram', 'priya@icms.edu',
   '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
   'student', '9123456789'),
  ('00000000-0000-0000-0000-000000000011',
   'Arjun Patel', 'arjun@icms.edu',
   '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
   'student', '9123456790'),
  ('00000000-0000-0000-0000-000000000012',
   'Keerthana M', 'keerthana@icms.edu',
   '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
   'student', '9123456791'),
  ('00000000-0000-0000-0000-000000000013',
   'Rahul Nair', 'rahul@icms.edu',
   '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
   'student', '9123456792');

INSERT INTO students (user_id, roll_number, department_id, semester, batch_year) VALUES
  ('00000000-0000-0000-0000-000000000010', 'CS21001', 1, 5, 2021),
  ('00000000-0000-0000-0000-000000000011', 'EC23001', 2, 3, 2023),
  ('00000000-0000-0000-0000-000000000012', 'ME21002', 3, 7, 2021),
  ('00000000-0000-0000-0000-000000000013', 'CE25001', 4, 1, 2025);

-- Subjects
INSERT INTO subjects (name, code, department_id, semester, credits) VALUES
  ('Data Structures',           'CS301', 1, 3, 4),
  ('Database Management',       'CS501', 1, 5, 4),
  ('Operating Systems',         'CS502', 1, 5, 4),
  ('Computer Networks',         'CS503', 1, 5, 3),
  ('Mathematics III',           'MA301', 1, 3, 4),
  ('Signals & Systems',         'EC301', 2, 3, 4),
  ('Digital Electronics',       'EC302', 2, 3, 4),
  ('Thermodynamics',            'ME401', 3, 4, 4),
  ('Fluid Mechanics',           'ME402', 3, 4, 4),
  ('Structural Analysis',       'CE101', 4, 1, 4);

-- Faculty–subject assignments
INSERT INTO faculty_subjects (faculty_id, subject_id) VALUES
  ('00000000-0000-0000-0000-000000000002', 2),
  ('00000000-0000-0000-0000-000000000002', 3),
  ('00000000-0000-0000-0000-000000000002', 4),
  ('00000000-0000-0000-0000-000000000003', 6),
  ('00000000-0000-0000-0000-000000000003', 7),
  ('00000000-0000-0000-0000-000000000004', 8),
  ('00000000-0000-0000-0000-000000000004', 9);

-- Enrollments
INSERT INTO enrollments (student_id, subject_id) VALUES
  ('00000000-0000-0000-0000-000000000010', 2),
  ('00000000-0000-0000-0000-000000000010', 3),
  ('00000000-0000-0000-0000-000000000010', 4),
  ('00000000-0000-0000-0000-000000000011', 6),
  ('00000000-0000-0000-0000-000000000011', 7),
  ('00000000-0000-0000-0000-000000000012', 8),
  ('00000000-0000-0000-0000-000000000012', 9),
  ('00000000-0000-0000-0000-000000000013', 10);

-- Sample marks
INSERT INTO marks (student_id, subject_id, exam_type, marks_obtained, recorded_by) VALUES
  ('00000000-0000-0000-0000-000000000010', 2, 'internal1', 88, '00000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000010', 2, 'internal2', 91, '00000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000010', 2, 'endsem',    85, '00000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000010', 3, 'internal1', 72, '00000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000010', 3, 'internal2', 78, '00000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000010', 3, 'endsem',    74, '00000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000010', 4, 'internal1', 65, '00000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000010', 4, 'internal2', 70, '00000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000010', 4, 'endsem',    68, '00000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000011', 6, 'internal1', 75, '00000000-0000-0000-0000-000000000003'),
  ('00000000-0000-0000-0000-000000000011', 6, 'endsem',    80, '00000000-0000-0000-0000-000000000003'),
  ('00000000-0000-0000-0000-000000000012', 8, 'internal1', 60, '00000000-0000-0000-0000-000000000004'),
  ('00000000-0000-0000-0000-000000000012', 8, 'endsem',    65, '00000000-0000-0000-0000-000000000004');

-- Sample attendance
INSERT INTO attendance (student_id, subject_id, date, status, marked_by) VALUES
  ('00000000-0000-0000-0000-000000000010', 2, CURRENT_DATE - 1, 'present', '00000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000010', 2, CURRENT_DATE - 2, 'present', '00000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000010', 2, CURRENT_DATE - 3, 'absent',  '00000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000010', 3, CURRENT_DATE - 1, 'present', '00000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000010', 3, CURRENT_DATE - 2, 'absent',  '00000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000011', 6, CURRENT_DATE - 1, 'present', '00000000-0000-0000-0000-000000000003'),
  ('00000000-0000-0000-0000-000000000011', 6, CURRENT_DATE - 2, 'absent',  '00000000-0000-0000-0000-000000000003');
