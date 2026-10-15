import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { User } from '../models.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const signupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  password: z.string().min(10, 'Password must be at least 10 characters.').max(72)
});
const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(72)
});

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000
});

function issueSession(user, res) {
  const token = jwt.sign({ sub: user._id.toString() }, process.env.JWT_SECRET, {
    algorithm: 'HS256', expiresIn: '7d', issuer: 'mern-login-dashboard', audience: 'dashboard-client'
  });
  res.cookie('session', token, cookieOptions());
}
function safeUser(user) {
  return { id: user._id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt };
}

router.post('/signup', async (req, res, next) => {
  try {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message || 'Please check your details.' });
    const { name, email, password } = parsed.data;
    const normalizedEmail = email.toLowerCase();
    if (await User.exists({ email: normalizedEmail })) return res.status(409).json({ message: 'An account with this email already exists.' });
    const passwordHash = await bcrypt.hash(password, 12);
    // Public signup always creates a regular user. Never accept a role from request data.
    const user = await User.create({ name, email: normalizedEmail, passwordHash, role: 'user' });
    issueSession(user, res);
    return res.status(201).json({ user: safeUser(user) });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ message: 'An account with this email already exists.' });
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Enter a valid email and password.' });
    const user = await User.findOne({ email: parsed.data.email.toLowerCase() }).select('+passwordHash');
    const valid = user && await bcrypt.compare(parsed.data.password, user.passwordHash);
    if (!valid) return res.status(401).json({ message: 'Email or password is incorrect.' });
    issueSession(user, res);
    return res.json({ user: safeUser(user) });
  } catch (error) { next(error); }
});

router.post('/logout', (req, res) => {
  res.clearCookie('session', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  });
  res.json({ message: 'Logged out successfully.' });
});

router.get('/me', requireAuth, (req, res) => res.json({ user: safeUser(req.user) }));
export default router;
