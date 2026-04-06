const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const { query } = require('../db/pool');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const result = await query(
      'SELECT id, name, email, password_hash, role, phone FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Build payload with role-specific data
    let extraData = {};

    if (user.role === 'student') {
      const stuRes = await query(
        `SELECT s.roll_number, s.semester, s.batch_year, d.name AS department, d.code AS dept_code
         FROM students s
         JOIN departments d ON d.id = s.department_id
         WHERE s.user_id = $1`,
        [user.id]
      );
      extraData = stuRes.rows[0] || {};
    }

    if (user.role === 'faculty') {
      const facRes = await query(
        `SELECT f.designation, f.qualification, f.experience_yrs,
                d.name AS department, d.code AS dept_code, d.id AS department_id
         FROM faculty f
         JOIN departments d ON d.id = f.department_id
         WHERE f.user_id = $1`,
        [user.id]
      );
      extraData = facRes.rows[0] || {};
    }

    const payload = {
      id:    user.id,
      email: user.email,
      name:  user.name,
      role:  user.role,
      phone: user.phone,
      ...extraData,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    res.json({ token, user: payload });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// GET /api/auth/me  — refresh user info from DB
router.get('/me', verifyToken, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, name, email, role, phone, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ message: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/auth/change-password
router.post('/change-password', verifyToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Both passwords required' });
  }
  try {
    const result = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const valid  = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!valid) return res.status(401).json({ message: 'Current password incorrect' });

    const hash = await bcrypt.hash(newPassword, 10);
    await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, req.user.id]);
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
