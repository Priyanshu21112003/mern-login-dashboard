import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { Activity, User } from '../models.js';

const router = Router();
router.use(requireAuth, requireAdmin);
router.get('/users', async (_req, res, next) => {
  try {
    const users = await User.find().select('name email role createdAt').sort({ createdAt: -1 }).limit(500).lean();
    res.json({ users: users.map(user => ({ id: user._id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt })) });
  } catch (error) { next(error); }
});

router.post('/users', async (req, res, next) => {
  try {
    const parsed = z.object({
      name: z.string().trim().min(2).max(80),
      email: z.string().trim().email().max(254),
      password: z.string().min(10, 'Temporary password must be at least 10 characters.').max(72)
    }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message || 'Check the administrator details.' });
    const email = parsed.data.email.toLowerCase();
    if (await User.exists({ email })) return res.status(409).json({ message: 'An account with this email already exists.' });
    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const created = await User.create({ name: parsed.data.name, email, passwordHash, role: 'admin' });
    await Activity.create({ userId: req.user._id, actorName: req.user.name, action: 'Administrator created', detail: `Created administrator account for ${created.email}`, metadata: { targetUserId: created._id } });
    res.status(201).json({ user: { id: created._id, name: created.name, email: created.email, role: created.role, createdAt: created.createdAt }, message: 'Administrator account created successfully.' });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ message: 'An account with this email already exists.' });
    next(error);
  }
});

router.patch('/users/:id/role', async (req, res, next) => {
  try {
    const { role } = req.body ?? {};
    if (!['user', 'admin'].includes(role)) return res.status(400).json({ message: 'Role must be user or admin.' });
    if (String(req.user._id) === req.params.id && role !== 'admin') return res.status(400).json({ message: 'You cannot remove your own admin role.' });
    const updated = await User.findByIdAndUpdate(req.params.id, { role }, { new: true, runValidators: true }).select('name email role createdAt');
    if (!updated) return res.status(404).json({ message: 'User not found.' });
    await Activity.create({ userId: req.user._id, actorName: req.user.name, action: 'User role changed', detail: `Changed ${updated.email} role to ${updated.role}`, metadata: { targetUserId: updated._id } });
    res.json({ user: { id: updated._id, name: updated.name, email: updated.email, role: updated.role, createdAt: updated.createdAt } });
  } catch (error) { next(error); }
});
export default router;
