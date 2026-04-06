const express  = require('express');
const { query } = require('../db/pool');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(verifyToken, requireRole('student', 'admin'));

// Helper: resolve student ID (students use own ID, admin can pass ?studentId=)
const getStudentId = (req) =>
  req.user.role === 'admin' ? (req.query.studentId || req.user.id) : req.user.id;

// GET /api/student/dashboard
router.get('/dashboard', async (req, res) => {
  const studentId = getStudentId(req);
  try {
    const [profile, marks, att, cgpaHistory] = await Promise.all([
      // Profile
      query(`
        SELECT u.name, u.email, u.phone, s.roll_number, s.semester, s.batch_year,
               d.name AS department, d.code AS dept_code,
               COALESCE(sc.cgpa, 0) AS cgpa
        FROM users u
        JOIN students s ON s.user_id = u.id
        JOIN departments d ON d.id = s.department_id
        LEFT JOIN student_cgpa sc ON sc.student_id = u.id
        WHERE u.id = $1
      `, [studentId]),

      // All marks
      query(`
        SELECT sub.name AS subject, sub.code, m.exam_type, m.marks_obtained, m.max_marks
        FROM marks m
        JOIN subjects sub ON sub.id = m.subject_id
        WHERE m.student_id = $1
        ORDER BY sub.name, m.exam_type
      `, [studentId]),

      // Attendance per subject
      query(`
        SELECT sub.name AS subject, sub.code,
          COUNT(*) FILTER (WHERE a.status='present') AS present,
          COUNT(*) FILTER (WHERE a.status='absent')  AS absent,
          COUNT(*) AS total,
          ROUND(
            COUNT(*) FILTER (WHERE a.status='present') * 100.0 / NULLIF(COUNT(*),0)
          ,1) AS percentage
        FROM enrollments e
        JOIN subjects sub ON sub.id = e.subject_id
        LEFT JOIN attendance a ON a.student_id = e.student_id AND a.subject_id = e.subject_id
        WHERE e.student_id = $1
        GROUP BY sub.id, sub.name, sub.code ORDER BY sub.name
      `, [studentId]),

      // CGPA per semester (simulated from endsem marks)
      query(`
        SELECT sub.semester,
          ROUND(SUM(m.marks_obtained * sub.credits) / NULLIF(SUM(sub.credits),0) / 10, 2) AS sgpa
        FROM marks m
        JOIN subjects sub ON sub.id = m.subject_id
        WHERE m.student_id = $1 AND m.exam_type = 'endsem'
        GROUP BY sub.semester ORDER BY sub.semester
      `, [studentId]),
    ]);

    res.json({
      profile:     profile.rows[0] || {},
      marks:       marks.rows,
      attendance:  att.rows,
      cgpaHistory: cgpaHistory.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/student/marks
router.get('/marks', async (req, res) => {
  const studentId = getStudentId(req);
  try {
    const result = await query(`
      SELECT sub.id AS subject_id, sub.name AS subject, sub.code, sub.semester, sub.credits,
             MAX(CASE WHEN m.exam_type='internal1' THEN m.marks_obtained END) AS internal1,
             MAX(CASE WHEN m.exam_type='internal2' THEN m.marks_obtained END) AS internal2,
             MAX(CASE WHEN m.exam_type='endsem'    THEN m.marks_obtained END) AS endsem,
             ROUND(
               (COALESCE(MAX(CASE WHEN m.exam_type='internal1' THEN m.marks_obtained END),0) +
                COALESCE(MAX(CASE WHEN m.exam_type='internal2' THEN m.marks_obtained END),0) +
                COALESCE(MAX(CASE WHEN m.exam_type='endsem'    THEN m.marks_obtained END),0))
             ,1) AS total
      FROM enrollments e
      JOIN subjects sub ON sub.id = e.subject_id
      LEFT JOIN marks m ON m.student_id = e.student_id AND m.subject_id = e.subject_id
      WHERE e.student_id = $1
      GROUP BY sub.id, sub.name, sub.code, sub.semester, sub.credits
      ORDER BY sub.semester, sub.name
    `, [studentId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/student/attendance
router.get('/attendance', async (req, res) => {
  const studentId = getStudentId(req);
  try {
    const result = await query(`
      SELECT sub.name AS subject, sub.code, a.date, a.status
      FROM attendance a
      JOIN subjects sub ON sub.id = a.subject_id
      WHERE a.student_id = $1
      ORDER BY a.date DESC, sub.name
    `, [studentId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/student/profile
router.get('/profile', async (req, res) => {
  const studentId = getStudentId(req);
  try {
    const result = await query(`
      SELECT u.id, u.name, u.email, u.phone, u.created_at,
             s.roll_number, s.semester, s.batch_year, s.address, s.dob,
             d.name AS department, d.code AS dept_code,
             COALESCE(sc.cgpa, 0) AS cgpa
      FROM users u
      JOIN students s ON s.user_id = u.id
      JOIN departments d ON d.id = s.department_id
      LEFT JOIN student_cgpa sc ON sc.student_id = u.id
      WHERE u.id = $1
    `, [studentId]);
    res.json(result.rows[0] || {});
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/student/profile  — students can update phone and address only
router.put('/profile', async (req, res) => {
  if (req.user.role !== 'student') {
    return res.status(403).json({ message: 'Students only' });
  }
  const { phone, address } = req.body;
  const client = await getClient();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE users    SET phone=$1, updated_at=NOW() WHERE id=$2', [phone,   req.user.id]);
    await client.query('UPDATE students SET address=$1 WHERE user_id=$2',            [address, req.user.id]);
    await client.query('COMMIT');
    res.json({ message: 'Profile updated' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
});

module.exports = router;
