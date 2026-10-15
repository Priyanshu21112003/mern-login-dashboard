import jwt from 'jsonwebtoken';
import { User } from '../models.js';

export async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.session;
    if (!token) return res.status(401).json({ message: 'Please log in to continue.' });
    const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    const user = await User.findById(payload.sub).select('name email role createdAt');
    if (!user) return res.status(401).json({ message: 'Session is no longer valid. Please log in again.' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: 'Session expired or invalid. Please log in again.' });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Administrator access required.' });
  next();
}
