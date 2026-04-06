# ICMS — Integrated College Management System

A full-stack college management system built with the **PERN stack** (PostgreSQL · Express · React · Node.js).

## Features

### Admin dashboard
- Live stats: total students, faculty, subjects, departments, overall CGPA
- Charts: avg marks per subject, avg CGPA per department, today's attendance (pie + dept bar)
- **Students** — full CRUD (add, edit, delete) with search
- **Faculty** — full CRUD including **edit faculty details** (name, email, phone, designation, qualification, experience, joining date) plus subject (re)assignment with checkboxes
- **Subjects** — full CRUD with faculty assignment per subject
- **Departments** — overview cards with student/faculty counts
- **Attendance** — date-picker view of all attendance records

### Faculty dashboard
- Stats: my subjects, my students, avg marks
- Charts: avg marks per subject, today's attendance per subject
- **Marks** — select subject + exam type → bulk enter/update marks for every enrolled student with live grade preview
- **Attendance** — select subject + date → mark each student present/absent with "mark all" shortcuts

### Student dashboard
- Stats: CGPA, overall attendance %, subjects, semester
- **Charts**: SGPA history line chart, attendance by subject bar chart (colour-coded by threshold)
- **Marks** — full marks table (Internal 1, Internal 2, End-sem, Total, Grade) + radar chart + grade summary
- **Attendance** — subject cards with progress bars + "classes needed to reach 75%" warning + filterable log
- **Profile** — view/edit phone and address; change password

---

## Project structure

```
icms/
├── server/
│   ├── db/
│   │   ├── pool.js          # pg connection pool
│   │   └── schema.sql       # all tables, views, seed data
│   ├── middleware/
│   │   └── auth.js          # verifyToken, requireRole
│   ├── routes/
│   │   ├── auth.js          # login, /me, change-password
│   │   ├── admin.js         # full CRUD + analytics
│   │   ├── faculty.js       # marks & attendance write
│   │   └── student.js       # read-only + profile edit
│   ├── index.js             # Express entry point
│   ├── package.json
│   └── .env.example
│
└── client/
    ├── src/
    │   ├── api/axios.js          # Axios instance with JWT interceptor
    │   ├── context/AuthContext.jsx
    │   ├── hooks/useFetch.js     # data-fetch hook
    │   ├── utils/helpers.js      # grade, CGPA colour, date utils
    │   ├── components/
    │   │   └── common/           # Sidebar, Modal, ConfirmModal, StatCard
    │   ├── pages/
    │   │   ├── LoginPage.jsx
    │   │   ├── admin/            # Layout, Overview, Students, Faculty, Subjects, Attendance, Departments
    │   │   ├── faculty/          # Layout, Overview, Marks, Attendance
    │   │   └── student/          # Layout, Overview, Marks, Attendance, Profile
    │   ├── App.jsx               # Routes + ProtectedRoute
    │   ├── main.jsx
    │   └── index.css
    ├── index.html
    ├── package.json
    └── vite.config.js
```

---

## Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 14+

### 1. Create the database

```bash
psql -U postgres
CREATE DATABASE icms_db;
\q
psql -U postgres -d icms_db -f server/db/schema.sql
```

### 2. Configure the server

```bash
cd server
cp .env.example .env
# Edit .env — set DB_PASSWORD and JWT_SECRET
npm install
npm run dev       # starts on http://localhost:5000
```

### 3. Start the client

```bash
cd client
npm install
npm run dev       # starts on http://localhost:5173
```

Vite proxies `/api` to `localhost:5000` automatically.

---

## Demo accounts

| Role    | Email              | Password    |
|---------|--------------------|-------------|
| Admin   | admin@icms.edu     | admin123    |
| Faculty | meena@icms.edu     | faculty123  |
| Student | priya@icms.edu     | student123  |

> All demo accounts use the same bcrypt hash. Change passwords after first login.

---

## API reference

### Auth
| Method | Path                      | Description               |
|--------|---------------------------|---------------------------|
| POST   | /api/auth/login           | Login → JWT token         |
| GET    | /api/auth/me              | Get current user          |
| POST   | /api/auth/change-password | Change own password       |

### Admin (requires role: admin)
| Method | Path                        | Description                        |
|--------|-----------------------------|------------------------------------|
| GET    | /api/admin/dashboard        | All stats + chart data             |
| GET    | /api/admin/students         | List all students                  |
| POST   | /api/admin/students         | Create student                     |
| PUT    | /api/admin/students/:id     | Edit student                       |
| DELETE | /api/admin/students/:id     | Delete student                     |
| GET    | /api/admin/faculty          | List all faculty                   |
| GET    | /api/admin/faculty/:id      | Faculty detail with subjects       |
| POST   | /api/admin/faculty          | Create faculty                     |
| PUT    | /api/admin/faculty/:id      | **Edit faculty + reassign subjects** |
| DELETE | /api/admin/faculty/:id      | Delete faculty                     |
| GET    | /api/admin/subjects         | List subjects with stats           |
| POST   | /api/admin/subjects         | Create subject                     |
| PUT    | /api/admin/subjects/:id     | Edit subject + assign faculty      |
| DELETE | /api/admin/subjects/:id     | Delete subject                     |
| GET    | /api/admin/departments      | Departments with counts            |
| GET    | /api/admin/attendance       | Attendance log (date filter)       |

### Faculty (requires role: faculty or admin)
| Method | Path                                         | Description              |
|--------|----------------------------------------------|--------------------------|
| GET    | /api/faculty/dashboard                       | Stats + charts           |
| GET    | /api/faculty/subjects/:id/students           | Enrolled students        |
| GET    | /api/faculty/subjects/:id/marks              | Marks (exam_type filter) |
| POST   | /api/faculty/marks                           | Bulk upsert marks        |
| GET    | /api/faculty/subjects/:id/attendance         | Attendance for date      |
| POST   | /api/faculty/attendance                      | Bulk upsert attendance   |
| GET    | /api/faculty/attendance/history/:subjectId   | 30-day history           |

### Student (requires role: student or admin)
| Method | Path                   | Description                      |
|--------|------------------------|----------------------------------|
| GET    | /api/student/dashboard | All data in one call             |
| GET    | /api/student/marks     | Marks pivoted by exam type       |
| GET    | /api/student/attendance| Full attendance log              |
| GET    | /api/student/profile   | Full profile with CGPA           |
| PUT    | /api/student/profile   | Update phone + address           |

---

## Key design decisions

**JWT in localStorage** — simple for a college intranet; switch to `httpOnly` cookies for production.

**Upsert pattern** — both marks and attendance use `ON CONFLICT DO UPDATE`, so faculty can re-submit the same form to correct records without duplication.

**Views for derived data** — `student_cgpa`, `subject_avg_marks`, `dept_avg_cgpa` are PostgreSQL views so CGPA/averages are always computed fresh from source marks.

**Role middleware** — `requireRole('admin')` or `requireRole('faculty','admin')` on each route group keeps logic server-side; the React `ProtectedRoute` is UI-only and cannot be trusted for security.

**Cascading deletes** — all foreign keys use `ON DELETE CASCADE` so deleting a user cleans up their student/faculty record, marks, and attendance automatically.
