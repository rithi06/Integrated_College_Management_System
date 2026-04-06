const express  = require('express');
const { query, getClient } = require('../db/pool');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(verifyToken, requireRole('faculty', 'admin'));

// GET /api/faculty/dashboard
router.get('/dashboard', async (req, res) => {
  const facultyId = req.user.id;
  try {
    const [subjects, students, marksAvg, todayAtt] = await Promise.all([
      // My subjects
      query(`
        SELECT s.id, s.name, s.code, s.semester, s.credits, d.name AS department
        FROM subjects s
        JOIN faculty_subjects fs ON fs.subject_id = s.id
        JOIN departments d ON d.id = s.department_id
        WHERE fs.faculty_id = $1 ORDER BY s.semester, s.name
      `, [facultyId]),

      // Total students across my subjects
      query(`
        SELECT COUNT(DISTINCT e.student_id) AS total
        FROM enrollments e
        JOIN faculty_subjects fs ON fs.subject_id = e.subject_id
        WHERE fs.faculty_id = $1
      `, [facultyId]),

      // Avg marks per subject I teach
      query(`
        SELECT sub.name AS subject_name, sub.id AS subject_id,
               ROUND(AVG(m.marks_obtained)::numeric,1) AS avg_marks,
               COUNT(DISTINCT m.student_id) AS student_count
        FROM marks m
        JOIN subjects sub ON sub.id = m.subject_id
        JOIN faculty_subjects fs ON fs.subject_id = m.subject_id
        WHERE fs.faculty_id = $1
        GROUP BY sub.id, sub.name ORDER BY sub.name
      `, [facultyId]),

      // Today's attendance for my subjects
      query(`
        SELECT sub.name AS subject, sub.id AS subject_id,
               COUNT(*) FILTER (WHERE a.status='present') AS present,
               COUNT(*) FILTER (WHERE a.status='absent')  AS absent
        FROM subjects sub
        JOIN faculty_subjects fs ON fs.subject_id = sub.id
        LEFT JOIN attendance a ON a.subject_id = sub.id AND a.date = CURRENT_DATE
        WHERE fs.faculty_id = $1
        GROUP BY sub.id, sub.name ORDER BY sub.name
      `, [facultyId]),
    ]);

    res.json({
      subjects:       subjects.rows,
      totalStudents:  parseInt(students.rows[0]?.total || 0),
      marksAvgPerSub: marksAvg.rows,
      todayAttendance: todayAtt.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/faculty/subjects/:subjectId/students  — students enrolled in a subject
router.get('/subjects/:subjectId/students', async (req, res) => {
  const { subjectId } = req.params;
  const facultyId = req.user.id;
  try {
    // Verify faculty owns this subject
    const owns = await query(
      'SELECT 1 FROM faculty_subjects WHERE faculty_id=$1 AND subject_id=$2',
      [facultyId, subjectId]
    );
    if (!owns.rows.length && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized for this subject' });
    }

    const result = await query(`
      SELECT u.id, u.name, u.email, s.roll_number, s.semester
      FROM enrollments e
      JOIN students s ON s.user_id = e.student_id
      JOIN users u    ON u.id = s.user_id
      WHERE e.subject_id = $1
      ORDER BY s.roll_number
    `, [subjectId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/faculty/subjects/:subjectId/marks
router.get('/subjects/:subjectId/marks', async (req, res) => {
  const { subjectId } = req.params;
  const { exam_type } = req.query;
  try {
    const filter = exam_type ? 'AND m.exam_type = $2' : '';
    const params = exam_type ? [subjectId, exam_type] : [subjectId];

    const result = await query(`
      SELECT u.id AS student_id, u.name, s.roll_number,
             m.id AS mark_id, m.exam_type, m.marks_obtained, m.max_marks, m.recorded_at
      FROM enrollments e
      JOIN students s ON s.user_id = e.student_id
      JOIN users u    ON u.id = s.user_id
      LEFT JOIN marks m ON m.student_id = e.student_id AND m.subject_id = e.subject_id ${filter}
      WHERE e.subject_id = $1
      ORDER BY s.roll_number
    `, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/faculty/marks  — upsert marks for multiple students
router.post('/marks', async (req, res) => {
  const { subject_id, exam_type, records } = req.body;
  // records: [{ student_id, marks_obtained }]

  if (!subject_id || !exam_type || !Array.isArray(records)) {
    return res.status(400).json({ message: 'subject_id, exam_type and records array required' });
  }

  const facultyId = req.user.id;
  const client = await getClient();
  try {
    // Verify faculty owns subject
    if (req.user.role !== 'admin') {
      const owns = await client.query(
        'SELECT 1 FROM faculty_subjects WHERE faculty_id=$1 AND subject_id=$2',
        [facultyId, subject_id]
      );
      if (!owns.rows.length) {
        return res.status(403).json({ message: 'Not authorized for this subject' });
      }
    }

    await client.query('BEGIN');
    for (const rec of records) {
      await client.query(`
        INSERT INTO marks (student_id, subject_id, exam_type, marks_obtained, recorded_by)
        VALUES ($1,$2,$3,$4,$5)
        ON CONFLICT (student_id, subject_id, exam_type)
        DO UPDATE SET marks_obtained = EXCLUDED.marks_obtained,
                      recorded_by    = EXCLUDED.recorded_by,
                      recorded_at    = NOW()
      `, [rec.student_id, subject_id, exam_type, rec.marks_obtained, facultyId]);
    }
    await client.query('COMMIT');
    res.json({ message: `Marks saved for ${records.length} students` });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
});

// GET /api/faculty/subjects/:subjectId/attendance?date=YYYY-MM-DD
router.get('/subjects/:subjectId/attendance', async (req, res) => {
  const { subjectId } = req.params;
  const date = req.query.date || new Date().toISOString().split('T')[0];
  try {
    const result = await query(`
      SELECT u.id AS student_id, u.name, s.roll_number,
             COALESCE(a.status, 'not_marked') AS status
      FROM enrollments e
      JOIN students s ON s.user_id = e.student_id
      JOIN users u    ON u.id = s.user_id
      LEFT JOIN attendance a ON a.student_id = e.student_id
                             AND a.subject_id = e.subject_id
                             AND a.date = $2
      WHERE e.subject_id = $1
      ORDER BY s.roll_number
    `, [subjectId, date]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/faculty/attendance  — upsert attendance for a class
router.post('/attendance', async (req, res) => {
  const { subject_id, date, records } = req.body;
  // records: [{ student_id, status }]

  if (!subject_id || !date || !Array.isArray(records)) {
    return res.status(400).json({ message: 'subject_id, date and records array required' });
  }

  const facultyId = req.user.id;
  const client = await getClient();
  try {
    await client.query('BEGIN');
    for (const rec of records) {
      await client.query(`
        INSERT INTO attendance (student_id, subject_id, date, status, marked_by)
        VALUES ($1,$2,$3,$4,$5)
        ON CONFLICT (student_id, subject_id, date)
        DO UPDATE SET status = EXCLUDED.status, marked_by = EXCLUDED.marked_by
      `, [rec.student_id, subject_id, date, rec.status, facultyId]);
    }
    await client.query('COMMIT');
    res.json({ message: `Attendance saved for ${records.length} students` });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
});

// GET /api/faculty/attendance/history/:subjectId
router.get('/attendance/history/:subjectId', async (req, res) => {
  const { subjectId } = req.params;
  try {
    const result = await query(`
      SELECT a.date,
        COUNT(*) FILTER (WHERE a.status='present') AS present,
        COUNT(*) FILTER (WHERE a.status='absent')  AS absent
      FROM attendance a WHERE a.subject_id = $1
      GROUP BY a.date ORDER BY a.date DESC LIMIT 30
    `, [subjectId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
