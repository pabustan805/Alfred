# TODO ROADMAP

## Phase 1: UI Foundation (✅ Completed)

- [x] Build UI inspired by apple.com aesthetics with responsive layouts and
      micro-interactions.
- [x] Implement navigation and dashboard layout across sidebar, top bar, cards, and
      tables.
- [x] Create a cron wizard with guided steps, validation, and an advanced editor mode.

All deliverables include unit coverage (CronWizard vitest specs) and Playwright e2e coverage of the cron creation flow.

## Phase 1.5: Authentication Access Layer (✅ Completed)

- [x] Add email/password registration and sign-in with secure session persistence.
- [x] Remove Gmail quick-login shortcuts to standardize on email/password (Dec 1, 2025).
- [x] Gate the dashboard behind authentication with fresh unit and e2e coverage.

## Phase 2: Script Management Core (✅ Updated Dec 4, 2025)

- [x] Integrate the script editor with multi-language highlighting and Monaco UX.
- [x] Add script CRUD, import/clone flows, and optimistic updates.
- [x] Build the schedules workspace with a modal cron creation workflow (Nov 30, 2025).
- [x] Enable drag-and-drop script movement between folders (Dec 1, 2025).
- [x] Add fullscreen controls for folder and editor panes (Dec 1, 2025).
- [x] Introduce sortable folder panes with toolbar toggles (Dec 2, 2025).
- [x] Expand language support to Ruby, Perl, and Groovy with tests (Dec 2, 2025).
- [x] Add lightweight RBAC with roles, statuses, middleware, and AuthContext helpers (Dec 4,
      2025).
- [x] Ship the admin Team page with roster filters and vitest coverage (Dec 4, 2025).
- [ ] Add a Gmail-based failure notification system with subscriptions, SMTP, and UI.

## Phase 2.5: Backend Auth Migration (🚧 In Progress)

- [x] **2.5a – Infrastructure:** Launch Express `/auth` API with Postgres tables and admin
      seeding.
- [x] **2.5b – Services/tests:** Issue httpOnly sessions, add auth services/middleware, and
      cover register/login/approval flows.
- [ ] **2.5c – Frontend integration**
  - [x] Replace local `authService` storage with REST calls and hydrate from `/auth/me`.
  - [x] Wire Team, Settings, Sidebar, TopBar, and AuthGate to backend endpoints so approvals
        persist globally.
  - [ ] Refresh frontend regression tests and docs for the new API flows.
- [ ] **2.5d – Role-aware approvals** *(critical)*
  - [ ] Add role selection within the pending member approval UI.
  - [ ] Ship a backend endpoint that atomically updates role and status with logging.
  - [ ] Update vitest, Playwright, README, and SOFTWARE_SPEC to explain the workflow.
  - [ ] Estimate: 0.5 day design/API, 1 day backend, 1 day frontend, 0.5 day QA.

## Phase 3: AI Integration (✅ Dec 2, 2025)

- [x] Add AI validation for cron scripts plus an AI Review button with logging.
- [x] Provide error handling, actionable suggestions, and an insights modal with tests.

## Phase 4: Logging & Audit Trail

- Implement logging for every script execution.
- Build an audit trail view for debugging and compliance reviews.
- Integrate RBAC denial events into the audit log after middleware hardening.

## Phase 5: Testing & Debugging

- Write unit tests for frontend and backend components.
- Create integration tests covering end-to-end workflows.

## Phase 6: Deployment & Maintenance

- Prepare a deployment checklist covering environments and CI/CD pipelines.
- Keep documentation current with each new capability.
- Plan ongoing maintenance and enhancement cycles.
