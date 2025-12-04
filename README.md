# Alfred

## Introduction
Alfred is a sleek control center for cron automation. It blends a folder-aware script library, inline editor, and AI review with one-click runs, live telemetry, and audit-ready history—keeping every job organized, explainable, and safe for both new operators and power users.

## Features
- Simple, elegant UI inspired by apple.com
- Secure authentication with email/password accounts
- Role-based access control (RBAC) with viewer/operator/admin flows
- Wizard workflow for creating cron scripts (default option)
- Integrated script editor for manual editing
- AI validation to ensure cron scripts are correct
- Script list with options to create, edit, execute, re-schedule, clone, and delete scripts
- Logging and audit trail for every execution

## Role-Based Access Control

Alfred uses a lightweight RBAC layer to keep sensitive cron automation actions limited to the right people:

1. **Roles**
   - *Viewer*: read-only access to dashboards, logs, and AI reviews.
   - *Operator*: everything a Viewer can do plus create/edit scripts, trigger runs, and manage schedules inside assigned folders.
   - *Admin*: full workspace control, including user management, folder ownership, and audit exports.
2. **User profile changes**
   - Authentication responses include `role` and optional `folderScope` metadata so the frontend can gate UI controls.
   - Sessions persist the same metadata for hydration after refresh.
3. **Backend enforcement**
   - Express middleware (`requireRole('operator')`, `requireRole('admin')`) guards sensitive routes.
   - Folder-scoped checks ensure operators only touch their assigned directories, while admins bypass scope checks.
4. **Frontend enforcement**
   - `AuthGate` derives convenience helpers (e.g., `canRunScripts`, `canManageUsers`) to toggle buttons, menu items, and routes.
   - Attempts to perform forbidden actions surface an inline "permission denied" toast sourced from backend errors.

This approach keeps the implementation simple (one extra column on the `users` table and a helper middleware) while providing clear separation of duties for cron management.

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

### Frontend deployment prep
1. Install Node.js 18+ and pnpm (or npm).
2. Copy `frontend/.env.example` to `frontend/.env` and update the values (e.g., `VITE_API_URL`).
3. From `frontend/`, run `pnpm install` then `pnpm run build`. The optimized assets will be emitted to `frontend/dist/`, ready for Netlify or other static hosts.

## Contributing
Please open an issue describing the bug or feature request before submitting a pull request. Follow the repository's coding standards, include tests when possible, and ensure your changes pass existing checks.

## License
This project is released under the [MIT License](./LICENSE).
