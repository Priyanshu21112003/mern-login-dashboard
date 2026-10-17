# Orbit / MERN Login Dashboard

This project includes authentication, email verification, dashboard overview, attendance clock-in/clock-out, leave requests, announcements, activity history, profile/password management, and admin tools.

## Setup

1. Install Node.js 20+ and MongoDB Atlas (or local MongoDB).
2. Copy `server/.env.example` to `server/.env` and set `MONGODB_URI` plus a random `JWT_SECRET` of at least 32 characters.
3. Keep `PORT=5002` and `CLIENT_ORIGIN=http://localhost:5175` unless you intentionally use different ports.
4. Optional email delivery: set `RESEND_API_KEY` and `EMAIL_FROM`. For real delivery, verify a sending domain in Resend and use a sender address on that domain.
5. Install dependencies from the project root:
   `npm run install:all`
6. Start the backend in Terminal 1:
   `npm run dev --prefix server`
7. Start the frontend in Terminal 2:
   `npm run dev --prefix client -- --port 5175`
8. Open `http://localhost:5175`.

## Email verification

- Codes are six digits, expire after 10 minutes, and allow five attempts.
- In local development, if Resend rejects an email (for example, because the sender domain is not verified), the code is printed in the backend terminal so you can continue testing.
- The development fallback is disabled in production. Production requires a working Resend configuration and a verified sender domain.
- If a code expires, use **Resend verification code** and check the backend terminal during local development.

## Admin

Public signups always create standard member accounts. Use the existing `make-admin` script or an admin account's UI to grant administrator access. Do not commit `.env` files or API keys.
