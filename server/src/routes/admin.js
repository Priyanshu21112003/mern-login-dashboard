import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { User } from '../models.js';

const router = Router();
router.use(requireAuth, requireAdmin);
router.get('/users', async (_req, res, next) => {
  try {
    const users = await User.find().select('name email role createdAt').sort({ createdAt: -1 }).limit(500).lean();
    res.json({ users: users.map(user => ({ id: user._id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt })) });
  } catch (error) { next(error); }
});
router.patch('/users/:id/role', async (req, res, next) => {
  try {
    const { role } = req.body ?? {};
    if (!['user', 'admin'].includes(role)) return res.status(400).json({ message: 'Role must be user or admin.' });
    if (String(req.user._id) === req.params.id && role !== 'admin') return res.status(400).json({ message: 'You cannot remove your own admin role.' });
    const updated = await User.findByIdAndUpdate(req.params.id, { role }, { new: true, runValidators: true }).select('name email role createdAt');
    if (!updated) return res.status(404).json({ message: 'User not found.' });
    res.json({ user: { id: updated._id, name: updated.name, email: updated.email, role: updated.role, createdAt: updated.createdAt } });
  } catch (error) { next(error); }
});
export default router;
