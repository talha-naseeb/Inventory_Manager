# ADR-001: Electron Main Process as the Security Boundary

**Status:** Accepted for Phase 1
**Date:** 2026-08-18
**Deciders:** InventoriMan owner and implementation team

## Context

The renderer currently exposes a generic IPC invocation function and arbitrary SQLite query channels. It also supplies `store_id`, `staff_id`, and role-sensitive inputs. A renderer compromise can therefore forge identity, cross store boundaries, or execute database statements outside the visible UI.

InventoriMan is an offline-first desktop POS. It needs local PIN authentication, role-based access, and store isolation without introducing a network dependency for normal operation.

## Decision

Electron's main process will own the authenticated session for each renderer web contents instance. After PIN authentication, the main process derives the staff ID, current role, and active store from SQLite. Renderer values can never override those fields.

Preload will expose fixed domain methods only. Arbitrary SQL channels and generic `invoke` access will be removed. Each IPC handler will use:

1. Trusted-renderer origin verification.
2. Main-process session lookup and current staff-status revalidation.
3. A named permission from the centralized role matrix.
4. An exact payload schema with type, length, range, array-count, and total-size limits.
5. Fixed SQL statements whose tables and columns are controlled by the main process.

Fresh installations will create a pending owner record with no usable PIN. A one-time enrollment operation sets the first owner PIN, after which enrollment is permanently closed. Failed PIN attempts are throttled per renderer and temporarily locked.

Production windows will enforce a restrictive Content Security Policy and reject unexpected navigation, new windows, and untrusted IPC senders.

## Options Considered

### Keep renderer authentication and add UI permission checks

| Dimension | Assessment |
|---|---|
| Complexity | Low |
| Security | Unacceptable |
| Offline support | Good |
| Maintenance | Poor; authorization remains duplicated |

UI checks improve usability but cannot be a security boundary because renderer state is user-controlled.

### Main-process sessions with fixed domain IPC methods

| Dimension | Assessment |
|---|---|
| Complexity | Medium |
| Security | Strong for the Electron threat model |
| Offline support | Full |
| Maintenance | Central permission and validation policy |

### External authentication service for every operation

| Dimension | Assessment |
|---|---|
| Complexity | High |
| Security | Strong when online |
| Offline support | Poor |
| Operational cost | High |

This conflicts with the offline-first requirement and remains appropriate only for cloud account activation and synchronization.

## Consequences

- Forged renderer staff and store identifiers no longer affect authorization or data scope.
- A compromised renderer is restricted to explicitly exposed operations allowed for its current session.
- Renderer data services must migrate from SQL strings to domain methods.
- Main-process handlers carry more validation code, but that policy is testable without launching Electron.
- Changing a staff member's role or status takes effect on their next operation because sessions are revalidated.

## Action Items

1. [x] Add the session, role matrix, validation, throttling, and enrollment primitives.
2. [x] Register all IPC through the trusted router.
3. [x] Replace renderer SQL access with fixed domain APIs.
4. [x] Remove generic preload invocation and raw database channels.
5. [x] Add CSP and navigation/window restrictions.
6. [ ] Complete automated and owner role-matrix acceptance tests.
