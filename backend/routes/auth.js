const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../supabase');
const { email, text } = require('../utils/validation');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

router.post('/register', async (req, res, next) => {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const mail = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = req.body.password;
    if (!text(name, 80) || !email(mail) || typeof password !== 'string' || password.length < 8 || password.length > 72) {
      return res.status(400).json({ error: 'Enter a name, valid email, and password of 8–72 characters.' });
    }
    const password_hash = await bcrypt.hash(password, 12);
    const { data, error } = await supabase.from('profiles').insert({ name, email: mail, password_hash, role: 'customer' }).select('id,name,email,role').single();
    if (error?.code === '23505') return res.status(409).json({ error: 'An account with this email already exists.' });
    if (error) throw error;
    return res.status(201).json({ message: 'Account created. You can now log in.', user: data });
  } catch (err) { next(err); }
});

router.post('/login', async (req, res, next) => {
  try {
    const mail = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = req.body.password;
    if (!email(mail) || typeof password !== 'string') return res.status(400).json({ error: 'Enter a valid email and password.' });
    const { data: user, error } = await supabase.from('profiles').select('id,name,email,password_hash,role').eq('email', mail).maybeSingle();
    if (error) throw error;
    if (!user || !(await bcrypt.compare(password, user.password_hash))) return res.status(401).json({ error: 'Email or password is incorrect.' });
    const token = jwt.sign({ sub: user.id, name: user.name, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '2h' });
    return res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) { next(err); }
});

router.get('/me', requireAuth, (req, res) => res.json({ user: { id: req.user.sub, name: req.user.name, email: req.user.email, role: req.user.role } }));
module.exports = router;
