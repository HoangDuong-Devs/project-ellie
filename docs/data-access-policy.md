# Data Access Policy

## Goal
Keep business logic and data contract consistent for UI, assistant, CLI, and automation.

## Rule
- Preferred path for UI reads/writes: **API client -> `/api/...` routes**.
- `useStorageState` is transitional compatibility and should be limited to legacy screens while migrating.

## Current Status
- API-first: `finance`, `calendar`, `work`, `goals`, `focus` routes and clients are in place.
- Transitional: `useStorageState` remains for backward compatibility, but app pages should consume data via API clients.

## New Code Requirement
- New feature screens must not read/write storage directly.
- Add/extend API route + client first, then call from UI.

## Migration Guidance
1. Create/extend API route and schema.
2. Create/extend client in `src/services/*-api-client.ts`.
3. Switch page logic to API client.
4. Update `API.md`.
5. Run `npm run api:check-doc-sync`.
