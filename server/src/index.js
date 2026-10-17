import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.js';
import dashboardRoutes from './routes/dashboard.js';
import adminRoutes from './routes/admin.js';
import workspaceRoutes from './routes/workspace.js';

const app = express();
app.set('trust proxy', 1);
const port = Number(process.env.PORT || 5002);
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5175';

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET must be set to a random secret of at least 32 characters.');
  process.exit(1);
}
if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI is required.');
  process.exit(1);
}

app.disable('x-powered-by');
app.set('trust proxy', process.env.NODE_ENV === 'production' ? 1 : false);
app.use(helmet());
app.use(cors({ origin: clientOrigin, credentials: true, methods: ['GET', 'POST', 'PATCH', 'DELETE'], allowedHeaders: ['Content-Type'] }));
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());
app.use((req, res, next) => {
  // Reject browser state-changing requests from origins other than the configured frontend.
  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) {
    const origin = req.get('origin');
    if (origin && origin !== clientOrigin) return res.status(403).json({ message: 'Request origin not allowed.' });
  }
  next();
});
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 100, standardHeaders: 'draft-7', legacyHeaders: false }), authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/workspace', workspaceRoutes);
app.use((req, res) => res.status(404).json({ message: 'Route not found.' }));
app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: 'Something went wrong. Please try again.' });
});

try {
  await mongoose.connect(process.env.MONGODB_URI);
  app.listen(port, () => console.log(`API server listening on http://localhost:${port}`));
} catch (error) {
  console.error('Could not connect to MongoDB:', error.message);
  process.exit(1);
}
