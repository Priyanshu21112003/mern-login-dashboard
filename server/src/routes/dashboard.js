import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { User } from '../models.js';

const router = Router();
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const totalUsers = req.user.role === 'admin' ? await User.countDocuments() : null;
    res.json({
      message: `Welcome back, ${req.user.name}.`,
      stats: [
        { label: 'Account status', value: 'Active', detail: 'Your account is ready to use' },
        { label: 'Account type', value: req.user.role === 'admin' ? 'Administrator' : 'Member', detail: 'Based on your account permissions' },
        { label: 'Registered', value: new Date(req.user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), detail: 'Your account creation date' }
      ],
      ...(req.user.role === 'admin' ? { totalUsers } : {})
    });
  } catch (error) { next(error); }
});
export default router;
