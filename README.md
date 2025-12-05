# Alfred

## Introduction
Alfred is a sleek control center for cron automation. It blends a folder-aware script library, inline editor, and AI review with one-click runs, live telemetry, and audit-ready history—keeping every job organized, explainable, and safe for both new operators and power users.

## Features
- Simple, elegant UI inspired by apple.com
- Secure authentication with email/password accounts
- Lightweight RBAC with viewer/operator/admin tiers and an approval workflow
- Admin-only Team page to list users, approve/reject new accounts, and delete users
- Wizard workflow for creating cron scripts (default option)
- Integrated script editor for manual editing
- AI validation to ensure cron scripts are correct
- Script list with options to create, edit, execute, re-schedule, clone, and delete scripts
- Logging and audit trail for every execution

## Usage
1. Launch Alfred in your browser.
2. Sign in with your email/password to access your workspace.
3. Use the wizard to quickly create a cron script by answering simple questions.
4. Switch to the script editor for advanced customization.
5. Manage scripts from the dashboard: execute immediately, reschedule, clone, or delete.
6. Review logs to debug or audit past executions.

## Getting Started

### Prerequisites
- Node.js 18+
- pnpm (preferred) or npm

### Quick setup
From the repo root, run `./setup.sh`. The script will:
1. Verify you have the required Node.js version and package manager.
2. Copy `frontend/.env.example` to `frontend/.env` if it does not exist.
3. Install frontend dependencies and produce a production build.

After the script completes:
1. Open `frontend/.env` and set `VITE_API_URL` to your backend endpoint.
2. Start the dev server with `pnpm run dev` (or `npm run dev`) inside `frontend/`.
3. Run tests with `pnpm test` (or `npm test`).

### RBAC & approval workflow
Alfred now ships a minimal RBAC layer to satisfy security requirements:
1. User records carry a `role` enum (`viewer`, `operator`, `admin`) plus a `status` field (`pending`, `approved`, `rejected`).
2. Sessions persist both role and approval status; pending/rejected accounts are blocked from signing in until an admin approves them.
3. An Express `requireRole(allowedRoles)` helper is available for backend endpoints and already gates the admin Team page.
4. The React `AuthContext` exposes `role`, `status`, and helper guards, while the new Team page lets admins review, approve/reject, or delete users.

This foundation keeps roles easy to reason about now while allowing richer policies later.

### Backend authentication stack
Local storage has been fully replaced by a centralized backend so users can sign in from any device:
1. **Express API + PostgreSQL** – the `/auth` module persists accounts in `users`, `sessions`, and `audit_events` tables. Passwords are hashed with bcrypt and every change updates Postgres as the source of truth.
2. **Shared session model** – successful logins receive an httpOnly cookie that stores the session id; the backend enforces `userId`, `role`, and `status` on every request and expires pending/rejected users immediately.
3. **Admin workflows** – the Team page now calls real endpoints (`GET /auth/users`, `PATCH /auth/users/:id/status`, `DELETE /auth/users/:id`) so approvals/deletions propagate instantly to every device.
4. **Audit readiness** – with centralized storage we can extend audit logging for sign-ins, approvals, and role toggles without revisiting the architecture.

#### Running the backend locally
1. Create `backend/.env` (see `backend/.env.example`) with `DATABASE_URL`, `ADMIN_*`, and session settings.
2. Run migrations (e.g., `pnpm exec psql < backend/migrations/0002_init_auth.sql`) and seed the admin account via `pnpm seed:admin`.
3. Start the API with `pnpm dev` inside `backend/`. The frontend expects this service at `VITE_API_URL` (default `http://localhost:4000`).
4. Point `frontend/.env` → `VITE_API_URL=http://localhost:4000` and restart `pnpm run dev` to consume the live API.

### Frontend deployment prep
1. Install Node.js 18+ and pnpm (or npm).
2. Copy `frontend/.env.example` to `frontend/.env` and update the values (e.g., `VITE_API_URL`).
3. From `frontend/`, run `pnpm install` then `pnpm run build`. The optimized assets will be emitted to `frontend/dist/`, ready for Netlify or other static hosts.

## Contributing
Please open an issue describing the bug or feature request before submitting a pull request. Follow the repository's coding standards, include tests when possible, and ensure your changes pass existing checks.

## License
This project is released under the [MIT License](./LICENSE).
