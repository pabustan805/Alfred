# TODO ROADMAP

## Phase 1: UI Foundation (✅ Completed)
- [x] Build UI inspired by apple.com aesthetics (responsive layout, Apple-like typography, gradients, and micro-interactions).
- [x] Implement navigation and dashboard layout (sidebar, top bar, health cards, tables, quick actions).
- [x] Create wizard workflow for cron creation (step-by-step guidance, validation, advanced cron editing).

All deliverables include unit coverage (CronWizard vitest specs) and Playwright e2e coverage of the cron creation flow.

## Phase 1.5: Authentication Access Layer (✅ Completed)
- [x] Add email/password registration and sign-in with secure session persistence.
- [x] Simplify access to email/password only (removed Gmail quick-login shortcuts on Dec 1, 2025).
- [x] Gate the dashboard behind authentication with new unit and e2e coverage.

## Phase 2: Script Management Core (✅ Updated Dec 4, 2025)
- [x] Integrate the advanced script editor with multi-language syntax highlighting + Monaco-powered UX.
- [x] Add CRUD operations for scripts (create, edit, delete, clone) with import/clone flows and optimistic UI state.
- [x] Build dedicated schedules workspace with modal cron creation workflow (✅ Nov 30, 2025).
- [x] Enable drag-and-drop script movement between folders for faster organization (✅ Dec 1, 2025).
- [x] Add fullscreen controls for both script folders and editor panes to improve focus (✅ Dec 1, 2025).
- [x] Introduce sortable folder pane (title/created date/tag) with toolbar toggle (✅ Dec 2, 2025).
- [x] Expand script workspace language support to Ruby, Perl, and Groovy with editor + test coverage (✅ Dec 2, 2025).
- [x] Add lightweight RBAC: role + status fields, session enforcement, `requireRole` middleware, and AuthContext helpers (✅ Dec 4, 2025)
- [x] Ship admin Team page with roster filters, approve/reject/delete actions, and vitest coverage (✅ Dec 4, 2025)

## Phase 3: AI Integration (✅ Dec 2, 2025)
- [x] Add AI validation for cron scripts, including a scripts-page AI Review button powered by the in-app reviewer service with logging.
- [x] Provide error handling, actionable suggestions, and insights modal + e2e/unit coverage for the AI review results.

## Phase 4: Logging & Audit Trail
- Implement logging for every script execution.
- Build an audit trail view for debugging and compliance reviews.
- Integrate RBAC denial events into the audit log once middleware is in place.

## Phase 5: Testing & Debugging
- Write unit tests for frontend and backend components.
- Create integration tests covering end-to-end workflows.
- Conduct user acceptance testing to validate UX.

## Phase 6: Deployment & Maintenance
- Prepare deployment checklist including environment setup and CI/CD pipeline.
- Keep documentation up to date with new capabilities.
- Plan ongoing maintenance and feature enhancement cycles.
