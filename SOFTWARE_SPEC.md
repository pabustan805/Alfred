# SOFTWARE SPECIFICATION

## System Overview
Alfred simplifies cron management through a modern web interface with AI validation, empowering both casual and power users to build, edit, validate, schedule, and monitor scripts.

## Functional Requirements
- UI inspired by apple.com with emphasis on clean, elegant design.
- Authentication supporting email/password accounts plus one-click Gmail login.
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

## Architecture Overview
- **Frontend**: React-based UI featuring the wizard, editor, dashboard, and logs views.
- **Backend**: Node.js/Express API handling script management, scheduling, orchestration, and authentication endpoints for credential and OAuth handshakes.
- **Database**: PostgreSQL storing scripts, schedules, execution metadata, and audit logs.
- **AI Module**: Python microservice or external API providing cron validation and suggestions.
- **Scheduler**: Cron-like service running on the backend, integrated with a job queue for reliable execution.
- **Identity provider**: Integrates with Google OAuth for Gmail-based sign-in alongside first-party credential storage.

### Diagram Description
```
[User Browser] → [Frontend (React)] → [Backend API (Node.js/Express)] → [Database (PostgreSQL)]
                                              ↓
                                        [AI Validation Service]
                                              ↓
                                        [Scheduler/Job Queue]
```

## User Workflows
0. **Signing in**: User enters email/password or selects an approved Gmail identity. Successful authentication unlocks the dashboard, while failures return inline error feedback.
1. **Creating a script via wizard**: User answers guided questions, selects frequency, commands, and scheduling options. Wizard generates a cron expression and script metadata, sends to backend for storage and validation.
2. **Editing a script via editor**: From script list, user opens editor for direct modifications. Edits trigger AI validation before saving changes.
3. **Executing a script immediately**: User triggers manual execution from dashboard; backend queues job, runs script, and records logs.
4. **Scheduling or rescheduling scripts**: User adjusts timing via wizard/editor. Backend updates cron schedule and future executions.
5. **Cloning and deleting scripts**: Dashboard actions duplicate configurations or remove entries, with confirmations and audit logging.
6. **Reviewing logs for debugging and audit**: Logs page provides searchable execution history, status, runtime, and output for investigation or compliance.
