import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { Activity, Announcement, Attendance, LeaveRequest, User } from '../models.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

async function logActivity(user, action, detail = '', metadata = {}) {
  await Activity.create({ userId: user._id, actorName: user.name, action, detail, metadata });
}
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid date in YYYY-MM-DD format.');

router.patch('/profile', async (req, res, next) => {
  try {
    const parsed = z.object({ name: z.string().trim().min(2).max(80), email: z.string().trim().email().max(254) }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message || 'Enter a valid name and email.' });
    const email = parsed.data.email.toLowerCase();
    if (await User.exists({ email, _id: { $ne: req.user._id } })) return res.status(409).json({ message: 'That email address is already in use.' });
    const updated = await User.findByIdAndUpdate(req.user._id, { name: parsed.data.name, email }, { new: true, runValidators: true }).select('name email role createdAt');
    await logActivity(updated, 'Profile updated', 'Updated profile details');
    res.json({ user: { id: updated._id, name: updated.name, email: updated.email, role: updated.role, createdAt: updated.createdAt } });
  } catch (error) { if (error?.code === 11000) return res.status(409).json({ message: 'That email address is already in use.' }); next(error); }
});

router.post('/password/change', async (req, res, next) => {
  try {
    const parsed = z.object({ currentPassword: z.string().min(1).max(72), newPassword: z.string().min(10, 'New password must be at least 10 characters.').max(72) }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message || 'Check the password fields.' });
    const user = await User.findById(req.user._id).select('+passwordHash');
    if (!user || !(await bcrypt.compare(parsed.data.currentPassword, user.passwordHash))) return res.status(400).json({ message: 'Current password is incorrect.' });
    user.passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
    await user.save();
    await logActivity(user, 'Password changed', 'Changed account password');
    res.json({ message: 'Password updated successfully. Your current session remains active.' });
  } catch (error) { next(error); }
});

router.get('/attendance', async (req, res, next) => {
  try {
    const records = await Attendance.find({ userId: req.user._id }).sort({ date: -1 }).limit(60).lean();
    const today = new Date().toISOString().slice(0, 10);
    res.json({ today, current: records.find(record => record.date === today) || null, records });
  } catch (error) { next(error); }
});

router.post('/attendance/clock-in', async (req, res, next) => {
  try {
    const parsed = z.object({ date: dateSchema, note: z.string().trim().max(300).optional().default('') }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Provide a valid attendance date.' });
    const existing = await Attendance.findOne({ userId: req.user._id, date: parsed.data.date });
    if (existing) {
      if (!existing.clockOutAt) return res.status(409).json({ message: 'You are already clocked in for this day.' });
      return res.status(409).json({ message: 'An attendance record already exists for this day.' });
    }
    const record = await Attendance.create({ userId: req.user._id, date: parsed.data.date, clockInAt: new Date(), note: parsed.data.note });
    await logActivity(req.user, 'Clocked in', `Started work for ${record.date}`, { attendanceId: record._id, date: record.date });
    res.status(201).json({ record, message: 'Clocked in successfully.' });
  } catch (error) { if (error?.code === 11000) return res.status(409).json({ message: 'An attendance record already exists for this day.' }); next(error); }
});

router.post('/attendance/clock-out', async (req, res, next) => {
  try {
    const parsed = z.object({ date: dateSchema }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Provide a valid attendance date.' });
    const record = await Attendance.findOne({ userId: req.user._id, date: parsed.data.date });
    if (!record) return res.status(404).json({ message: 'You need to clock in before clocking out.' });
    if (record.clockOutAt) return res.status(409).json({ message: 'You have already clocked out for this day.' });
    record.clockOutAt = new Date();
    record.totalMinutes = Math.max(0, Math.round((record.clockOutAt - record.clockInAt) / 60000));
    await record.save();
    await logActivity(req.user, 'Clocked out', `Finished work for ${record.date}`, { attendanceId: record._id, date: record.date, totalMinutes: record.totalMinutes });
    res.json({ record, message: 'Clocked out successfully.' });
  } catch (error) { next(error); }
});

router.get('/leave', async (req, res, next) => {
  try {
    const filter = req.user.role === 'admin' && req.query.scope === 'all' ? {} : { userId: req.user._id };
    const requests = await LeaveRequest.find(filter).populate('userId', 'name email').sort({ createdAt: -1 }).limit(300).lean();
    res.json({ requests: requests.map(item => ({ ...item, user: item.userId ? { id: item.userId._id, name: item.userId.name, email: item.userId.email } : null, userId: item.userId?._id })) });
  } catch (error) { next(error); }
});

router.post('/leave', async (req, res, next) => {
  try {
    const parsed = z.object({ startDate: dateSchema, endDate: dateSchema, leaveType: z.enum(['Annual', 'Sick', 'Personal', 'Unpaid', 'Other']), reason: z.string().trim().min(3).max(1000) }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message || 'Check your leave request.' });
    if (parsed.data.endDate < parsed.data.startDate) return res.status(400).json({ message: 'End date must be on or after the start date.' });
    const request = await LeaveRequest.create({ ...parsed.data, userId: req.user._id });
    await logActivity(req.user, 'Leave requested', `${request.leaveType} leave: ${request.startDate} to ${request.endDate}`, { leaveRequestId: request._id });
    res.status(201).json({ request, message: 'Leave request submitted.' });
  } catch (error) { next(error); }
});

router.patch('/leave/:id/status', requireAdmin, async (req, res, next) => {
  try {
    const parsed = z.object({ status: z.enum(['approved', 'rejected']), reviewNote: z.string().trim().max(500).optional().default('') }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Choose approved or rejected.' });
    const request = await LeaveRequest.findByIdAndUpdate(req.params.id, { status: parsed.data.status, reviewNote: parsed.data.reviewNote, reviewedBy: req.user._id, reviewedAt: new Date() }, { new: true, runValidators: true }).populate('userId', 'name email');
    if (!request) return res.status(404).json({ message: 'Leave request not found.' });
    await logActivity(req.user, `Leave ${parsed.data.status}`, `Reviewed ${request.userId?.name || 'member'}'s leave request`, { leaveRequestId: request._id });
    res.json({ request, message: `Leave request ${parsed.data.status}.` });
  } catch (error) { next(error); }
});

router.get('/announcements', async (_req, res, next) => {
  try { const announcements = await Announcement.find({ active: true }).populate('createdBy', 'name').sort({ createdAt: -1 }).limit(100).lean(); res.json({ announcements }); }
  catch (error) { next(error); }
});

router.post('/announcements', requireAdmin, async (req, res, next) => {
  try {
    const parsed = z.object({ title: z.string().trim().min(3).max(120), body: z.string().trim().min(3).max(3000), priority: z.enum(['normal', 'important']).default('normal') }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message || 'Check announcement details.' });
    const announcement = await Announcement.create({ ...parsed.data, createdBy: req.user._id });
    await logActivity(req.user, 'Announcement published', announcement.title, { announcementId: announcement._id });
    res.status(201).json({ announcement, message: 'Announcement published.' });
  } catch (error) { next(error); }
});

router.get('/activity', async (req, res, next) => {
  try {
    const filter = req.user.role === 'admin' && req.query.scope === 'all' ? {} : { userId: req.user._id };
    const activities = await Activity.find(filter).sort({ createdAt: -1 }).limit(100).lean();
    res.json({ activities });
  } catch (error) { next(error); }
});

export default router;
