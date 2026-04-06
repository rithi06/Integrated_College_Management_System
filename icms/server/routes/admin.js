const express  = require('express');
const bcrypt   = require('bcryptjs');
const { query, getClient } = require('../db/pool');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(verifyToken, requireRole('admin'));

// ── Dashboard analytics ────────────────────────────────────

// GET /api/admin/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const [students, faculty, subjects, depts, avgCgpa, subjectAvg, todayAtt] = await Promise.all([
      query('SELECT COUNT(*) FROM students'),
      query('SELECT COUNT(*) FROM faculty'),
      query('SELECT COUNT(*) FROM subjects'),
      query('SELECT COUNT(*) FROM departments'),
      query('SELECT ROUND(AVG(cgpa)::numeric,2) AS overall_cgpa FROM student_cgpa'),
      query('SELECT subject_name, avg_marks FROM subject_avg_marks ORDER BY avg_marks DESC LIMIT 6'),
      query(`
        SELECT
          COUNT(*) FILTER (WHERE status='present') AS present,
          COUNT(*) FILTER (WHERE status='absent')  AS absent,
          COUNT(*) AS total
        FROM attendance WHERE date = CURRENT_DATE
      `),
    ]);

    const deptCgpa = await query('SELECT department_name, avg_cgpa FROM dept_avg_cgpa ORDER BY avg_cgpa DESC');
    const deptAtt  = await query(`
      SELECT d.name AS department, d.code,
        COUNT(*) FILTER (WHERE a.status='present') AS present,
        COUNT(*) FILTER (WHERE a.status='absent')  AS absent,
        COUNT(*) AS total
      FROM departments d
      LEFT JOIN students s ON s.department_id = d.id
      LEFT JOIN attendance a ON a.student_id = s.user_id AND a.date = CURRENT_DATE
      GROUP BY d.id, d.name, d.code ORDER BY d.name
    `);

    res.json({
      totals: {
        students:    parseInt(students.rows[0].count),
        faculty:     parseInt(faculty.rows[0].count),
        subjects:    parseInt(subjects.rows[0].count),
        departments: parseInt(depts.rows[0].count),
        overallCgpa: parseFloat(avgCgpa.rows[0].overall_cgpa || 0),
      },
      subjectAvgMarks: subjectAvg.rows,
      deptAvgCgpa:     deptCgpa.rows,
      todayAttendance: todayAtt.rows[0],
      deptAttendance:  deptAtt.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Students ───────────────────────────────────────────────

// GET /api/admin/students
router.get('/students', async (req, res) => {
  try {
    const result = await query(`
      SELECT u.id, u.name, u.email, u.phone, u.created_at,
             s.roll_number, s.semester, s.batch_year, s.address, s.dob,
             d.name AS department, d.id AS department_id
      FROM users u
      JOIN students s ON s.user_id = u.id
      JOIN departments d ON d.id = s.department_id
      ORDER BY s.roll_number
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/admin/students/:id
router.get('/students/:id', async (req, res) => {
  try {
    const result = await query(`
      SELECT u.id, u.name, u.email, u.phone,
             s.roll_number, s.semester, s.batch_year, s.address, s.dob,
             d.name AS department, d.id AS department_id,
             COALESCE(sc.cgpa, 0) AS cgpa
      FROM users u
      JOIN students s ON s.user_id = u.id
      JOIN departments d ON d.id = s.department_id
      LEFT JOIN student_cgpa sc ON sc.student_id = u.id
      WHERE u.id = $1
    `, [req.params.id]);

    if (!result.rows[0]) return res.status(404).json({ message: 'Student not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/admin/students
router.post('/students', async (req, res) => {
  const { name, email, phone, password = 'student123', roll_number,
          department_id, semester, batch_year, address, dob } = req.body;

  if (!name || !email || !roll_number || !department_id) {
    return res.status(400).json({ message: 'Name, email, roll number and department are required' });
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');
    const hash = await bcrypt.hash(password, 10);

    const userRes = await client.query(
      `INSERT INTO users (name, email, password_hash, role, phone)
       VALUES ($1,$2,$3,'student',$4) RETURNING id`,
      [name, email.toLowerCase(), hash, phone]
    );

    await client.query(
      `INSERT INTO students (user_id, roll_number, department_id, semester, batch_year, address, dob)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [userRes.rows[0].id, roll_number, department_id, semester, batch_year, address, dob || null]
    );

    await client.query('COMMIT');
    res.status(201).json({ message: 'Student created', id: userRes.rows[0].id });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') return res.status(409).json({ message: 'Email or roll number already exists' });
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
});

// PUT /api/admin/students/:id
router.put('/students/:id', async (req, res) => {
  const { name, email, phone, roll_number,
          department_id, semester, batch_year, address, dob } = req.body;

  const client = await getClient();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE users SET name=$1, email=$2, phone=$3, updated_at=NOW() WHERE id=$4`,
      [name, email.toLowerCase(), phone, req.params.id]
    );
    await client.query(
      `UPDATE students SET roll_number=$1, department_id=$2, semester=$3,
       batch_year=$4, address=$5, dob=$6 WHERE user_id=$7`,
      [roll_number, department_id, semester, batch_year, address, dob || null, req.params.id]
    );
    await client.query('COMMIT');
    res.json({ message: 'Student updated' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
});

// DELETE /api/admin/students/:id
router.delete('/students/:id', async (req, res) => {
  try {
    await query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ message: 'Student deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Faculty ────────────────────────────────────────────────

// GET /api/admin/faculty
router.get('/faculty', async (req, res) => {
  try {
    const result = await query(`
      SELECT u.id, u.name, u.email, u.phone, u.created_at,
             f.designation, f.qualification, f.experience_yrs, f.joining_date,
             d.name AS department, d.id AS department_id, d.code AS dept_code,
             COUNT(DISTINCT fs.subject_id) AS subject_count
      FROM users u
      JOIN faculty f     ON f.user_id = u.id
      JOIN departments d ON d.id = f.department_id
      LEFT JOIN faculty_subjects fs ON fs.faculty_id = u.id
      GROUP BY u.id, u.name, u.email, u.phone, u.created_at,
               f.designation, f.qualification, f.experience_yrs, f.joining_date,
               d.name, d.id, d.code
      ORDER BY u.name
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/admin/faculty/:id
router.get('/faculty/:id', async (req, res) => {
  try {
    const [facRes, subRes] = await Promise.all([
      query(`
        SELECT u.id, u.name, u.email, u.phone,
               f.designation, f.qualification, f.experience_yrs, f.joining_date,
               d.name AS department, d.id AS department_id, d.code AS dept_code
        FROM users u
        JOIN faculty f ON f.user_id = u.id
        JOIN departments d ON d.id = f.department_id
        WHERE u.id = $1
      `, [req.params.id]),
      query(`
        SELECT s.id, s.name, s.code, s.semester
        FROM subjects s
        JOIN faculty_subjects fs ON fs.subject_id = s.id
        WHERE fs.faculty_id = $1
      `, [req.params.id]),
    ]);

    if (!facRes.rows[0]) return res.status(404).json({ message: 'Faculty not found' });
    res.json({ ...facRes.rows[0], subjects: subRes.rows });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/admin/faculty
router.post('/faculty', async (req, res) => {
  const { name, email, phone, password = 'faculty123',
          department_id, designation, qualification, experience_yrs, joining_date } = req.body;

  if (!name || !email || !department_id) {
    return res.status(400).json({ message: 'Name, email and department are required' });
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');
    const hash = await bcrypt.hash(password, 10);

    const userRes = await client.query(
      `INSERT INTO users (name, email, password_hash, role, phone)
       VALUES ($1,$2,$3,'faculty',$4) RETURNING id`,
      [name, email.toLowerCase(), hash, phone]
    );

    await client.query(
      `INSERT INTO faculty (user_id, department_id, designation, qualification, experience_yrs, joining_date)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [userRes.rows[0].id, department_id, designation, qualification, experience_yrs || 0, joining_date || null]
    );

    await client.query('COMMIT');
    res.status(201).json({ message: 'Faculty created', id: userRes.rows[0].id });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') return res.status(409).json({ message: 'Email already exists' });
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
});

// PUT /api/admin/faculty/:id  ← EDIT FACULTY (includes subject reassignment)
router.put('/faculty/:id', async (req, res) => {
  const { name, email, phone, department_id,
          designation, qualification, experience_yrs, joining_date,
          subject_ids } = req.body; // subject_ids: array of subject IDs to assign

  const client = await getClient();
  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE users SET name=$1, email=$2, phone=$3, updated_at=NOW() WHERE id=$4`,
      [name, email.toLowerCase(), phone, req.params.id]
    );

    await client.query(
      `UPDATE faculty SET department_id=$1, designation=$2, qualification=$3,
       experience_yrs=$4, joining_date=$5 WHERE user_id=$6`,
      [department_id, designation, qualification, experience_yrs || 0, joining_date || null, req.params.id]
    );

    // Reassign subjects if provided
    if (Array.isArray(subject_ids)) {
      await client.query('DELETE FROM faculty_subjects WHERE faculty_id = $1', [req.params.id]);
      for (const sid of subject_ids) {
        await client.query(
          'INSERT INTO faculty_subjects (faculty_id, subject_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
          [req.params.id, sid]
        );
      }
    }

    await client.query('COMMIT');
    res.json({ message: 'Faculty updated successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
});

// DELETE /api/admin/faculty/:id
router.delete('/faculty/:id', async (req, res) => {
  try {
    await query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ message: 'Faculty deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Subjects ───────────────────────────────────────────────

// GET /api/admin/subjects
router.get('/subjects', async (req, res) => {
  try {
    const result = await query(`
      SELECT s.id, s.name, s.code, s.semester, s.credits,
             d.name AS department, d.id AS department_id,
             u.name AS faculty_name, fs.faculty_id,
             COALESCE(sam.avg_marks, 0) AS avg_marks,
             COALESCE(sam.student_count, 0) AS enrolled_count
      FROM subjects s
      JOIN departments d ON d.id = s.department_id
      LEFT JOIN faculty_subjects fs ON fs.subject_id = s.id
      LEFT JOIN users u ON u.id = fs.faculty_id
      LEFT JOIN subject_avg_marks sam ON sam.subject_id = s.id
      ORDER BY d.name, s.semester, s.name
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/admin/subjects
router.post('/subjects', async (req, res) => {
  const { name, code, department_id, semester, credits, faculty_id } = req.body;
  if (!name || !code || !department_id) {
    return res.status(400).json({ message: 'Name, code and department are required' });
  }
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const subRes = await client.query(
      `INSERT INTO subjects (name, code, department_id, semester, credits)
       VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [name, code, department_id, semester || 1, credits || 4]
    );
    if (faculty_id) {
      await client.query(
        'INSERT INTO faculty_subjects (faculty_id, subject_id) VALUES ($1,$2)',
        [faculty_id, subRes.rows[0].id]
      );
    }
    await client.query('COMMIT');
    res.status(201).json({ message: 'Subject created', id: subRes.rows[0].id });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') return res.status(409).json({ message: 'Subject code already exists' });
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
});

// PUT /api/admin/subjects/:id
router.put('/subjects/:id', async (req, res) => {
  const { name, code, department_id, semester, credits, faculty_id } = req.body;
  const client = await getClient();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE subjects SET name=$1, code=$2, department_id=$3, semester=$4, credits=$5 WHERE id=$6`,
      [name, code, department_id, semester, credits, req.params.id]
    );
    if (faculty_id !== undefined) {
      await client.query('DELETE FROM faculty_subjects WHERE subject_id = $1', [req.params.id]);
      if (faculty_id) {
        await client.query(
          'INSERT INTO faculty_subjects (faculty_id, subject_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
          [faculty_id, req.params.id]
        );
      }
    }
    await client.query('COMMIT');
    res.json({ message: 'Subject updated' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
});

// DELETE /api/admin/subjects/:id
router.delete('/subjects/:id', async (req, res) => {
  try {
    await query('DELETE FROM subjects WHERE id = $1', [req.params.id]);
    res.json({ message: 'Subject deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Departments (read + write) ─────────────────────────────

// GET /api/admin/departments
router.get('/departments', async (req, res) => {
  try {
    const result = await query(`
      SELECT d.id, d.name, d.code,
        COUNT(DISTINCT s.user_id) AS student_count,
        COUNT(DISTINCT f.user_id) AS faculty_count
      FROM departments d
      LEFT JOIN students s ON s.department_id = d.id
      LEFT JOIN faculty f  ON f.department_id = d.id
      GROUP BY d.id, d.name, d.code ORDER BY d.name
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Attendance overview ────────────────────────────────────

// GET /api/admin/attendance?date=YYYY-MM-DD
router.get('/attendance', async (req, res) => {
  const date = req.query.date || new Date().toISOString().split('T')[0];
  try {
    const result = await query(`
      SELECT u.name AS student_name, s.roll_number, sub.name AS subject,
             d.name AS department, a.status, a.date
      FROM attendance a
      JOIN students s ON s.user_id = a.student_id
      JOIN users u    ON u.id = s.user_id
      JOIN subjects sub ON sub.id = a.subject_id
      JOIN departments d ON d.id = s.department_id
      WHERE a.date = $1
      ORDER BY d.name, sub.name, u.name
    `, [date]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
