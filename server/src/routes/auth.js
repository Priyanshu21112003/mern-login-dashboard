import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createHash, randomInt } from 'node:crypto';
import { z } from 'zod';
import { Activity, User } from '../models.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const signupSchema = z.object({ name: z.string().trim().min(2).max(80), email: z.string().trim().email().max(254), password: z.string().min(10, 'Password must be at least 10 characters.').max(72) });
const loginSchema = z.object({ email: z.string().trim().email().max(254), password: z.string().min(1).max(72) });
const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_CODE_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60 * 1000;
const hashCode = code => createHash('sha256').update(String(code)).digest('hex');

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000
});
function issueSession(user, res) {
  const token = jwt.sign({ sub: user._id.toString() }, process.env.JWT_SECRET, { algorithm: 'HS256', expiresIn: '7d', issuer: 'mern-login-dashboard', audience: 'dashboard-client' });
  res.cookie('session', token, cookieOptions());
}
function safeUser(user) { return { id: user._id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt }; }

async function sendVerificationEmail(user, code) {
  const from = process.env.EMAIL_FROM;
  const key = process.env.RESEND_API_KEY;
  if (!from || !key) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`\n[DEV EMAIL VERIFICATION] ${user.email} code: ${code} (expires in 10 minutes)\n`);
      return;
    }
    throw new Error('Email delivery is not configured. Set RESEND_API_KEY and EMAIL_FROM.');
  }
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [user.email], subject: 'Your Orbit verification code', text: `Your Orbit verification code is ${code}. It expires in 10 minutes. If you did not request this, you can ignore this email.` })
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Resend returned ${response.status}: ${detail}`);
    }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(`Email could not be delivered (${error.message}). Use this local development code instead: ${code}`);
      return;
    }
    throw new Error('Unable to send the verification email. Verify your Resend domain and EMAIL_FROM settings.');
  }
}
async function issueVerificationCode(user) {
  const now = new Date();
  const code = String(randomInt(0, 1000000)).padStart(6, '0');
  user.emailVerificationCodeHash = hashCode(code);
  user.emailVerificationExpiresAt = new Date(now.getTime() + CODE_TTL_MS);
  user.emailVerificationAttempts = 0;
  user.emailVerificationLastSentAt = now;
  await user.save();
  await sendVerificationEmail(user, code);
}

router.post('/signup', async (req, res, next) => {
  try {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message || 'Please check your details.' });
    const { name, email, password } = parsed.data;
    const normalizedEmail = email.toLowerCase();
    let user = await User.findOne({ email: normalizedEmail }).select('+emailVerificationCodeHash +emailVerificationExpiresAt +emailVerificationAttempts +emailVerificationLastSentAt');
    if (user?.emailVerified) return res.status(409).json({ message: 'An account with this email already exists. Please sign in.' });
    if (!user) {
      const passwordHash = await bcrypt.hash(password, 12);
      user = await User.create({ name, email: normalizedEmail, passwordHash, role: 'user', emailVerified: false });
      await Activity.create({ userId: user._id, actorName: user.name, action: 'Account created', detail: 'Created a new account; email verification pending' });
    } else {
      // Permit a retry for an existing unverified account, while using the latest supplied password only if it matches.
      const existing = await User.findById(user._id).select('+passwordHash');
      if (!await bcrypt.compare(password, existing.passwordHash)) return res.status(409).json({ message: 'An unverified account already exists for this email. Use the original password, then resend the code.' });
    }
    try { await issueVerificationCode(user); }
    catch (error) { console.error('Verification email error:', error.message); return res.status(503).json({ message: error.message, email: normalizedEmail }); }
    return res.status(201).json({ message: 'Verification code requested. Check your email or the backend terminal in development.', email: normalizedEmail });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ message: 'An account with this email already exists.' });
    next(error);
  }
});

router.post('/verify-email', async (req, res, next) => {
  try {
    const parsed = z.object({ email: z.string().trim().email().max(254), code: z.string().trim().regex(/^\d{6}$/, 'Enter the six-digit verification code.') }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message || 'Enter a valid email and code.' });
    const user = await User.findOne({ email: parsed.data.email.toLowerCase() }).select('+emailVerificationCodeHash +emailVerificationExpiresAt +emailVerificationAttempts');
    if (!user) return res.status(400).json({ message: 'No account was found for this email. Please sign up again.' });
    if (user.emailVerified) { issueSession(user, res); return res.json({ message: 'Email is already verified.', user: safeUser(user) }); }
    if (!user.emailVerificationCodeHash || !user.emailVerificationExpiresAt || user.emailVerificationExpiresAt.getTime() < Date.now()) return res.status(400).json({ message: 'Your code is missing or expired. Request a new code.' });
    if (user.emailVerificationAttempts >= MAX_CODE_ATTEMPTS) return res.status(429).json({ message: 'Too many incorrect attempts. Request a new code.' });
    if (hashCode(parsed.data.code) !== user.emailVerificationCodeHash) {
      user.emailVerificationAttempts += 1; await user.save();
      return res.status(400).json({ message: 'That verification code is incorrect. Please try again.' });
    }
    user.emailVerified = true; user.emailVerificationCodeHash = undefined; user.emailVerificationExpiresAt = undefined; user.emailVerificationAttempts = 0;
    await user.save(); issueSession(user, res);
    await Activity.create({ userId: user._id, actorName: user.name, action: 'Email verified', detail: 'Verified email address' });
    return res.json({ message: 'Email verified successfully.', user: safeUser(user) });
  } catch (error) { next(error); }
});

router.post('/resend-verification', async (req, res, next) => {
  try {
    const parsed = z.object({ email: z.string().trim().email().max(254) }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Enter a valid email address.' });
    const user = await User.findOne({ email: parsed.data.email.toLowerCase() }).select('+emailVerificationCodeHash +emailVerificationExpiresAt +emailVerificationAttempts +emailVerificationLastSentAt');
    if (!user || user.emailVerified) return res.json({ message: 'If an unverified account exists, a new code has been requested.' });
    if (user.emailVerificationLastSentAt && Date.now() - user.emailVerificationLastSentAt.getTime() < RESEND_COOLDOWN_MS) return res.status(429).json({ message: 'Please wait one minute before requesting another code.' });
    await issueVerificationCode(user);
    return res.json({ message: 'A new verification code has been requested. Check your email or the backend terminal in development.' });
  } catch (error) { next(error); }
});

router.post('/login', async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Enter a valid email and password.' });
    const user = await User.findOne({ email: parsed.data.email.toLowerCase() }).select('+passwordHash');
    const valid = user && await bcrypt.compare(parsed.data.password, user.passwordHash);
    if (!valid) return res.status(401).json({ message: 'Email or password is incorrect.' });
    if (!user.emailVerified) return res.status(403).json({ message: 'Please verify your email before signing in.', needsVerification: true, email: user.email });
    issueSession(user, res);
    await Activity.create({ userId: user._id, actorName: user.name, action: 'Signed in', detail: 'Signed in to the workspace' });
    return res.json({ user: safeUser(user) });
  } catch (error) { next(error); }
});

router.post('/logout', (req, res) => { res.clearCookie('session', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' }); res.json({ message: 'Logged out successfully.' }); });
router.get('/me', requireAuth, (req, res) => {
  if (!req.user.emailVerified) return res.status(403).json({ message: 'Please verify your email before signing in.', needsVerification: true, email: req.user.email });
  return res.json({ user: safeUser(req.user) });
});
export default router;
