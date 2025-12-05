# SOFTWARE SPECIFICATION

## System Overview
Alfred simplifies cron management through a modern web interface with AI validation, empowering both casual and power users to build, edit, validate, schedule, and monitor scripts.

## Functional Requirements
- UI inspired by apple.com with emphasis on clean, elegant design.
- Authentication supporting email/password accounts.
- Lightweight RBAC across `viewer`, `operator`, and `admin` roles with approval gating.
- Admin-only Team experience to review user roster, approve/reject new accounts, and delete users.
- Wizard workflow for guided cron creation.
- Integrated script editor for manual editing and advanced customization.
- AI validation of cron scripts to prevent syntax errors and suggest corrections.
- Script list with full CRUD operations alongside execute, reschedule, and clone actions.
- Comprehensive logging and audit trail for every script execution.

## Non-Functional Requirements
- **Performance**: Fast script execution, validation, and UI responsiveness.
- **Usability**: Intuitive workflows suitable for non-technical users while still supporting advanced operations.
- **Scalability**: Capable of handling multiple users, large script libraries, and high-frequency schedules.
- **Security**: Role-based access control, encrypted storage of scripts, and protected audit logs.

## RBAC & Admin Approvals
To satisfy the security requirement, Alfred now ships a lightweight role-based access control and approval model compatible with the future Node.js backend and the current mock authentication layer:

1. **User schema** – each account carries a `role` enum (`viewer`, `operator`, `admin`) and a `status` enum (`pending`, `approved`, `rejected`). New registrations default to `operator` + `pending` until reviewed.
2. **Session payloads** – session storage persists the active user’s role and status. Pending/rejected accounts cannot sign in; attempting to do so returns descriptive errors.
3. **Backend middleware** – the Express helper `requireRole(allowedRoles)` guards sensitive endpoints (e.g., the `/team` route) and can be extended to log denials for the audit trail.
4. **Frontend gating** – `AuthContext` exposes role/status helpers. A dedicated Team page (admin-only) lists all users, highlights pending approvals, and supports approve/reject/delete actions with optimistic UI updates.

This foundation keeps roles easy to reason about now while allowing richer policies later.

## User Management & Approvals
- **Roster insights**: Hero metrics surface totals for members, pending approvals, and active admins.
- **Filterable roster**: Admins can switch between All/Pending/Approved/Rejected chips to focus workflows.
- **Actions**: Each user card exposes Approve, Reject, and Delete (with safeguards preventing self-deletion).
- **Status enforcement**: `authService` utilities ensure only approved accounts can maintain sessions, and deleting/rejecting a user clears any active session tokens.

## Backend Persistence Strategy
- **Preferred database**: PostgreSQL will be the single source of truth for users, sessions, approvals, and future audit logs. Initial migrations will provision `users`, `sessions`, and `audit_events`.
- **API surface**: Express routes under `/auth` will own registration, login, logout, roster listing, status changes, and deletion. Each route will authenticate requests, enforce `requireRole`, and persist mutations to Postgres.
- **Session issuance**: Successful logins return a JWT or httpOnly cookie carrying `userId`, `role`, and `status`. When an admin toggles a user’s status, the backend invalidates existing sessions to prevent stale access.
- **Frontend integration**: The React app will replace local `authService` calls with REST requests. `AuthContext` will fetch `/auth/me` on load, and the Team page will call `/auth/users` + `/auth/users/:id` to keep the roster consistent across devices.
- **Scalability**: PostgreSQL enables future extensions (audit logging, reporting, multi-tenant workspaces) without rethinking the persistence model. Hosted options (RDS, Supabase, Neon, etc.) can be adopted later.


## Architecture Overview
- **Frontend**: React-based UI featuring the wizard, editor, dashboard, and logs views.
- **Backend**: Node.js/Express API handling script management, scheduling, orchestration, and authentication endpoints for credential and OAuth handshakes.
- **Database**: PostgreSQL storing scripts, schedules, execution metadata, and audit logs.
- **AI Module**: Python microservice or external API providing cron validation and suggestions.
- **Scheduler**: Cron-like service running on the backend, integrated with a job queue for reliable execution.
- **Identity provider**: First-party credential storage using secure email/password authentication.

### Diagram Description
```
[User Browser] → [Frontend (React)] → [Backend API (Node.js/Express)] → [Database (PostgreSQL)]
                                              ↓
                                        [AI Validation Service]
                                              ↓
                                        [Scheduler/Job Queue]
```

## User Workflows
0. **Signing in**: User enters email/password. Successful authentication unlocks the dashboard, while failures return inline error feedback.
1. **Creating a script via wizard**: User answers guided questions, selects frequency, commands, and scheduling options. Wizard generates a cron expression and script metadata, sends to backend for storage and validation.
2. **Editing a script via editor**: From script list, user opens editor for direct modifications. Edits trigger AI validation before saving changes.
3. **Executing a script immediately**: User triggers manual execution from dashboard; backend queues job, runs script, and records logs.
4. **Scheduling or rescheduling scripts**: User adjusts timing via wizard/editor. Backend updates cron schedule and future executions.
5. **Cloning and deleting scripts**: Dashboard actions duplicate configurations or remove entries, with confirmations and audit logging.
6. **Reviewing logs for debugging and audit**: Logs page provides searchable execution history, status, runtime, and output for investigation or compliance.
