import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  emailVerified: { type: Boolean, default: true },
  emailVerificationCodeHash: { type: String, select: false },
  emailVerificationExpiresAt: { type: Date, select: false },
  emailVerificationAttempts: { type: Number, default: 0, select: false },
  emailVerificationLastSentAt: { type: Date, select: false }
}, { timestamps: true });

export const User = mongoose.model('User', userSchema);


const activitySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  actorName: { type: String, required: true, maxlength: 80 },
  action: { type: String, required: true, maxlength: 80 },
  detail: { type: String, default: '', maxlength: 300 },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });
activitySchema.index({ createdAt: -1 });

const attendanceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  clockInAt: { type: Date, required: true },
  clockOutAt: { type: Date, default: null },
  totalMinutes: { type: Number, default: null, min: 0 },
  note: { type: String, default: '', maxlength: 300 }
}, { timestamps: true });
attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

const leaveSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  startDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  endDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  leaveType: { type: String, enum: ['Annual', 'Sick', 'Personal', 'Unpaid', 'Other'], default: 'Annual' },
  reason: { type: String, required: true, trim: true, minlength: 3, maxlength: 1000 },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewedAt: { type: Date, default: null },
  reviewNote: { type: String, default: '', maxlength: 500 }
}, { timestamps: true });

const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, minlength: 3, maxlength: 120 },
  body: { type: String, required: true, trim: true, minlength: 3, maxlength: 3000 },
  priority: { type: String, enum: ['normal', 'important'], default: 'normal' },
  active: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

export const Activity = mongoose.models.Activity || mongoose.model('Activity', activitySchema);
export const Attendance = mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);
export const LeaveRequest = mongoose.models.LeaveRequest || mongoose.model('LeaveRequest', leaveSchema);
export const Announcement = mongoose.models.Announcement || mongoose.model('Announcement', announcementSchema);
