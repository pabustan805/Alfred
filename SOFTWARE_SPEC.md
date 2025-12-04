# SOFTWARE SPECIFICATION

## System Overview
Alfred simplifies cron management through a modern web interface with AI validation, empowering both casual and power users to build, edit, validate, schedule, and monitor scripts.

## Functional Requirements
- UI inspired by apple.com with emphasis on clean, elegant design.
- Authentication supporting email/password accounts.
- Role-based access control across viewer, operator, and admin personas.
- Wizard workflow for guided cron creation.
- Integrated script editor for manual editing and advanced customization.
- AI validation of cron scripts to prevent syntax errors and suggest corrections.
- Script list with full CRUD operations alongside execute, reschedule, and clone actions.
- Comprehensive logging and audit trail for every script execution.

## Non-Functional Requirements
- **Performance**: Fast script execution, validation, and UI responsiveness.
- **Usability**: Intuitive workflows suitable for non-technical users while still supporting advanced operations.
- **Scalability**: Capable of handling multiple users, large script libraries, and high-frequency schedules.
- **Security**: RBAC, encrypted storage of scripts, and protected audit logs.

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

## Security & RBAC Design
- **Roles**
  - *Viewer*: read-only access to dashboards, logs, script metadata, and AI review output.
  - *Operator*: inherits Viewer access plus create/edit scripts, trigger runs, and manage schedules within assigned folders.
  - *Admin*: inherits Operator access plus manage users, assign folder ownership, and export audit trails.
- **Data model**
  - `users` table gains `role` (`viewer|operator|admin`) and optional `folder_scope` (array of folder IDs or `null` for global admins).
  - Session tokens embed the same information for stateless enforcement.
- **Backend enforcement**
  - Express middleware helper `requireRole(minRole)` compares the session user role against the route's minimum requirement.
  - Folder-aware endpoints call `assertFolderScope(folderId)` to confirm operators are scoped correctly; admins bypass scope checks.
- **Frontend enforcement**
  - `AuthContext` exposes capability helpers (e.g., `canRunScripts`, `canManageUsers`). UI elements render or disable accordingly.
  - RBAC-aware routes redirect unauthorized users to a friendly "insufficient permissions" view.
- **Auditability**
  - All blocked attempts are logged with user ID, role, route, and timestamp to maintain a paper trail for compliance reviews.
