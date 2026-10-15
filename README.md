# Orbit — Custom MERN Login Dashboard

A responsive, modern dark dashboard starter with public signup, login, a protected member dashboard, and an admin panel. Built with React + Vite, Express, MongoDB/Mongoose, bcrypt password hashing, and JWT sessions stored in HttpOnly cookies.

## Included

- Public signup and login screens
- Responsive dark-themed workspace dashboard
- Protected backend endpoints and frontend routes
- Admin-only member list and role management
- Public signups always receive the `user` role; clients cannot assign themselves admin
- One-time CLI command to grant the admin role to an existing account
- Password hashing with bcrypt (12 rounds)
- HttpOnly, SameSite=Lax session cookie; Secure cookie in production
- Helmet security headers, JSON size limit, CORS allowlist, origin check, and auth rate limiting
- Input validation and generic login error messages

## Requirements

- Node.js 20 or newer recommended
- npm
- MongoDB local instance or a MongoDB Atlas cluster

## 1. Configure MongoDB and secrets

From the project root:

```bash
cp server/.env.example server/.env
```

Edit `server/.env`:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/mern_login_dashboard
JWT_SECRET=replace-with-a-long-random-secret-at-least-32-characters
CLIENT_ORIGIN=http://localhost:5173
```

Create a strong secret rather than keeping the example value. For example, run `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` and paste the output as `JWT_SECRET`.

For MongoDB Atlas, use the connection string supplied by Atlas for `MONGODB_URI`. Keep `.env` files private and never commit them.

## 2. Install dependencies

```bash
npm install
npm run install:all
```

## 3. Start the app

Ensure MongoDB is running, then from the project root:

```bash
npm run dev
```

Open **http://localhost:5173**. The API runs at **http://localhost:5001**. The frontend uses `http://localhost:5001/api` by default.

To check the API, open `http://localhost:5001/api/health`.

## 4. Create your administrator account

1. Open the app and sign up normally at `/signup` using the email you want to use as your admin account.
2. In a separate terminal, from the project root, run:

   ```bash
   npm run make-admin --prefix server -- admin@example.com
   ```

   Replace `admin@example.com` with the exact email you signed up with.
3. Sign out and sign back in (or refresh the app) so the current user profile reflects the new role.
4. Open `/admin` to manage users and switch other accounts between member and administrator roles.

Admin privileges are assigned only by the server-side CLI or by an already-authorized admin. The public signup endpoint intentionally ignores any supplied `role` field.

## Useful commands

```bash
npm run dev                  # Run frontend and API in development
npm run build                # Build the React frontend
npm run start --prefix server # Start API server
```

## API routes

| Method | Route | Access | Purpose |
|---|---|---|---|
| GET | `/api/health` | Public | Health check |
| POST | `/api/auth/signup` | Public, rate-limited | Create member account |
| POST | `/api/auth/login` | Public, rate-limited | Start session |
| POST | `/api/auth/logout` | Public | Clear session cookie |
| GET | `/api/auth/me` | Authenticated | Current user |
| GET | `/api/dashboard` | Authenticated | Dashboard summary |
| GET | `/api/admin/users` | Admin | List accounts |
| PATCH | `/api/admin/users/:id/role` | Admin | Change a member's role |

## Production deployment checklist

- Deploy the API and frontend over HTTPS.
- Set `NODE_ENV=production`, `CLIENT_ORIGIN` to the exact deployed frontend origin, `MONGODB_URI` to your production database, and a unique strong `JWT_SECRET` in your hosting provider's secret manager.
- Set `VITE_API_URL` at frontend build time to the deployed API URL plus `/api`, for example `https://api.example.com/api`. Create `client/.env` or configure this in your frontend hosting environment before building.
- Keep frontend and API on the same site when possible. If they must be on different sites, cookie `SameSite` and CSRF protections need to be deliberately reconfigured; do not simply loosen cookie settings without adding appropriate CSRF protection.
- Use MongoDB Atlas network access restrictions, least-privilege database credentials, backups, and monitoring.
- Add email verification, password reset via expiring one-time tokens, MFA, account lockout/abuse controls, audit logs, and automated tests before using this for sensitive or business-critical data.
- The current “Help center” link is a placeholder (`support@example.com`); replace it with your support URL/email.
- The search box, notification icon, and workspace switcher are UI placeholders, not connected features.

## Security notes

The server is authoritative: every protected API checks the session cookie, and admin APIs check the user's current database role. Passwords are never stored in plaintext. JWTs are kept in an HttpOnly cookie rather than browser local storage. This is a solid starter, not a complete production identity platform; review and test your deployment and threat model before collecting real user data.
