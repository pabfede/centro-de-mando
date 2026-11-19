# Plan: Scaffold and build Phase 1 of "Centro de Mando"

## Context

"Centro de Mando" is a personal life-management app (React Native + Expo + Supabase) that went through 7 rounds of a rigorous risk/scope review (documented in `PROJECT.md`) before getting a final **BUILD** verdict. That review deliberately narrowed the first real build to three modules only — Notes, a read-only Google Calendar view, and a manual Kanban board — with every other module (habits, library, finance, the D&D toolkit, any AI features) explicitly parked until a 14-day real-usage checkpoint proves this core is actually worth extending.

The project directory (`C:\Users\pablo\projects\personalApp`) currently contains only `PROJECT.md` — confirmed via exploration: no `package.json`, no git repo, no Expo/Supabase config, nothing else. This is a from-zero scaffold.

## Scope discipline (non-negotiable, inherited from PROJECT.md)

Build **only**: Notes, read-only Google Calendar display, manual-entry Kanban board. No AI, no Microsoft/Outlook/Jira integration, no finance/library/habits/RPG modules, no two-way calendar sync, no desktop-specific build work. Do not scaffold folders, routes, or placeholder screens for anything beyond these three modules — PROJECT.md instructs Claude Code to refuse that work until a dated witness-verdict entry exists in its "Historial de decisiones" section.

## 1. Project scaffolding

**Routing: Expo Router** (not manually-wired React Navigation) — it's Expo's current default, needs far less boilerplate for a 3-screen app, and unifies the URI-scheme/linking config with the router config at exactly the point (Google OAuth redirect) that carries the most external risk.

```
npx create-expo-app@latest . --template blank-typescript
npx expo install expo-router expo-secure-store expo-auth-session expo-web-browser expo-crypto
npm install @supabase/supabase-js @tanstack/react-query
git init
```

**Superseded (2026-11-19):** `expo-auth-session`, `expo-web-browser`, and `expo-crypto` were later uninstalled — see section 3 below for why the Calendar OAuth approach changed to `@react-native-google-signin/google-signin`, which needs none of them.

Folder structure:
```
personalApp/
  app/
    _layout.tsx              # root layout: auth gate, React Query provider, floating Notes button
    (auth)/
      login.tsx
    (tabs)/
      _layout.tsx             # bottom tab navigator — 2 tabs only
      calendario.tsx
      kanban.tsx
    notas/
      _layout.tsx             # modal stack presentation
      index.tsx
      [id].tsx
  src/
    lib/
      supabase.ts             # supabase client, SecureStore-backed session storage adapter
    features/
      notes/       { api.ts, types.ts, components/ }
      kanban/      { api.ts, types.ts, components/ }
      calendar/    { googleAuth.ts, api.ts, types.ts, reauthState.ts, components/ }
    components/                # FloatingNotesButton, shared UI primitives
  supabase/
    migrations/                # SQL migration files
  PLAN.md
  .env.example
  .gitignore
  app.config.ts
  tsconfig.json
```

`.gitignore`: `node_modules/`, `.expo/`, `dist/`, `.env`, `ios/`, `android/`, `*.log`.

`.env.example`:
```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=
```
These are all safe as `EXPO_PUBLIC_*` — the Supabase anon key is meant to be public (RLS is the real gate), and native/installed Google OAuth client IDs have no secret by design (the whole point of the PKCE requirement below).

## 2. Supabase setup

Two tables only — `notes` and `kanban_cards`. **Calendar gets no table**: Phase 1 calendar is read-only, live display with no offline requirement in the spec, so events are fetched fresh from Google's API on screen focus/pull-to-refresh and rendered directly. The only calendar-related state (OAuth tokens, re-auth flag) is device-local (see Section 3).

**GDPR fix (Roast Board, round 8, 2026-11-18):** calendar events — including attendee names/emails, which are third-party personal data the app has no independent lawful basis to retain — are fetched from the Google Calendar API at render time only and are never written to Supabase or any other persistent store (device or backend). This is a hard requirement, not an optimization: persisting attendee data would start a GDPR controller obligation (lawful basis, retention policy, breach notification) for people who never interacted with this app.

**No-logging corollary (Roast Board, round 9, 2026-11-18):** "never persisted" covers the database, not the rest of the stack — it does not hold if a crash-reporting/analytics SDK (Sentry, Expo crash logs, console output shipped anywhere) or a Supabase Edge Function log ever captures the raw Calendar API response body. If any such tool is added later, attendee data must be explicitly excluded/redacted from what it captures. This note exists so that guarantee isn't silently broken by someone adding telemetry in month 3 without realizing it reopens the GDPR gap. (Separately, this fix closes the retention/breach risk only — it does not restore the "purely personal activity" exemption if the app screen is ever shown to a second person; that remains a behavioral risk to be mindful of, not something architecture can fix.)

```sql
create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  title text not null default '',
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.kanban_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  title text not null,
  description text,
  status text not null default 'pending' check (status in ('pending','in_progress','done')),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notes enable row level security;
alter table public.kanban_cards enable row level security;

create policy "own notes only" on public.notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own kanban cards only" on public.kanban_cards
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

Kanban is a **single flat table with a `status` column**, not a `boards`/`columns`/`cards` relational model — there's exactly one board for one user in Phase 1, and a 3-table model is speculative generality for a feature that doesn't exist yet. Migrating later, against a small dataset, is cheap if it's ever actually needed.

Schema managed via Supabase CLI (`supabase migration new ...`, SQL files committed under `supabase/migrations/`) rather than hand-edited through the dashboard, so schema history lives in git.

**Auth via Supabase (email/password only, no MFA in Phase 1):**
1. Dashboard: enable Email provider.
2. Supabase client configured with a custom storage adapter backed by `expo-secure-store` (not AsyncStorage) for session persistence.

**MFA cut from Phase 1 (Roast Board, round 9, 2026-11-18):** TOTP/2FA adds no real security for a single-device, local-only, single-user app — there's no threat model where it reduces risk (whoever has the unlocked device already has access; whoever doesn't, can't get far regardless), and it was costing an estimated 5-10 of the 20-40 scaffolding hours for zero marginal protection. PROJECT.md's blanket "2FA/MFA obligatorio" requirement is deferred, not deleted: it re-applies the moment a second device or second user is ever added, since that's exactly the point where the threat model changes. Until then, email/password + RLS + device-level lock screen is the right-sized control.

## 3. Google Calendar OAuth (highest external risk — build last) — IMPLEMENTED, architecture rewritten mid-build

**Superseded (2026-11-19):** the original plan below (native Android/iOS OAuth client + `expo-auth-session` browser-redirect PKCE flow, custom scheme redirect) is **dead** — Google deprecated custom URI scheme redirects for Android OAuth clients (app-impersonation risk), which made `/o/oauth2/v2/auth` 404 on *any* request from that client type, reproduced independently in a browser with the exact same client_id/params. This was discovered only after building and testing against the real EAS dev client, not from documentation review beforehand — a reminder that "native OAuth via expo-auth-session" guidance from pretraining is stale and must be verified against current Google docs, exactly as AGENTS.md's Expo warning says to do for Expo APIs.

**What's actually implemented:** `@react-native-google-signin/google-signin` (Expo's current recommended path for this case), which uses Android's native Google Sign-In SDK instead of a browser redirect. Google Cloud Console needs **two** OAuth clients, not one: the original **Android**-type client (package name + SHA-1, no redirect URI field — used implicitly by Play Services) plus an additional **Web**-type client whose ID is passed as `webClientId` to `GoogleSignin.configure()` (no redirect URI needed there either; it's only used as an audience identifier).

Concrete flow, as built in `src/features/calendar/googleAuth.ts`:
1. `GoogleSignin.configure({ webClientId, offlineAccess: false })` at module load.
2. `connect()`: `hasPlayServices()` → if a cached local session exists, `signOut()` first (otherwise `signIn()` can resolve instantly from cache without ever showing Google's screens — looks like "nothing happens" and never re-grants anything) → `signIn()` (basic profile/email only) → `addScopes({ scopes: ['...calendar.readonly'] })` (sensitive scopes are **not** granted by `signIn()` alone, even if passed to `configure()` — they need this explicit call, which is what actually shows Google's permission screen for Calendar) → then **immediately invalidate the just-cached token**: `getTokens()` once, `clearCachedAccessToken(thatToken)`, because `addScopes()` grants the scope server-side but a subsequent `getTokens()` can still hand back the access token that was cached *before* the grant, which the Calendar API then rejects with 401. Without this step the reconnect flow silently loops: scope granted, token still stale, API still 401s.
3. `fetchCalendarEvents()` (combines token fetch + the actual API call in one place, deliberately — see below): `getTokens()` → `GET .../calendar/v3/calendars/primary/events`. No refresh-token management needed; the SDK handles silent renewal via Play Services internally.
4. **Both failure points must flip status to `needs_reauth` — a bug found during the manual revocation test (below):** a 401 from the *API call itself* (token looked valid locally, Google rejected it server-side, e.g. after revocation) is just as real a failure as `getTokens()` throwing outright. The first version of this code only caught the latter, so the Calendar screen silently rendered "Sin eventos esta semana" instead of the reauth banner after revocation — exactly the "stale data shown as live" failure mode this test exists to catch. Fixed by having `fetchCalendarEvents()` catch both.
5. **Manual revocation test (required, not optional) — now passes:** revoke access at `myaccount.google.com/permissions` → reopen the Calendar tab → no crash, reauth banner appears (not a silently-empty list) → **Reconectar** forces local sign-out, shows the real Google account picker, the scope consent screen, invalidates the stale token → events load again.

**Still true from the original plan, unaffected by the rewrite:** OAuth consent screen published to "In production" (not "Testing") with `calendar.readonly` as the only requested scope; unverified-app warning is expected and accepted, correct for a single-user app under the 100-user verification threshold.

## 4. Notes module

Data model: the `notes` table above — title + content only, no folders/tags (not trivial enough to justify yet).

Screens (`app/notas/`):
- `index.tsx` — list sorted by `updated_at desc`, tap to open, swipe/long-press to delete.
- `[id].tsx` — edit title + content, autosave on blur or explicit Save, Delete button.
- New note via a synthetic `id === 'new'` route or a `new.tsx` alias.
- Presented as a modal stack (`presentation: 'modal'` in `_layout.tsx`) so it opens from the floating button over either tab.

`src/features/notes/api.ts`: thin wrapper (`listNotes`, `getNote`, `createNote`, `updateNote`, `deleteNote`) over `supabase.from('notes')`, consumed via TanStack Query hooks — same pattern Kanban reuses.

## 5. Kanban module

Data model: `kanban_cards` above.

**Data fetching: `@tanstack/react-query`** across all three modules (Notes, Kanban, and Calendar's fetch/error state) — one small dependency instead of hand-rolling loading/error/refetch-on-focus logic three separate times.

**Card movement: tap a card → "Mover a..." menu with the three statuses**, not drag-and-drop — ship the simplest thing that satisfies "manual entry only"; only add drag-and-drop later if it's actually missed during the 14-day checkpoint.

Screen (`app/(tabs)/kanban.tsx`): three sections (pending/in_progress/done), tappable cards to edit or move status, a "+ Nueva tarea" action defaulting to `pending`.

## 6. Navigation structure

**Two bottom tabs only — Calendario and Kanban.** Notes is a floating action button (not a tab), rendered in the root `_layout.tsx` above the tab navigator so it's reachable from both tabs. No trace of the long-term 5-tab IA (Inicio/Colecciones/Vida/Finanzas) — a disabled placeholder tab is still a scaffolded stub for a parked Phase 2-6 module, which is explicitly out of scope. Expo Router makes adding a tab later a one-file change, so there's no cost to deferring this.

Auth screens live outside `(tabs)` entirely, gated by a check in the root layout.

## 7. Build order

0. **Dev client sanity spike (Roast Board, round 9, 2026-11-18 — do this before anything else):** on the bare `create-expo-app` scaffold, before writing any feature code, run `npx expo run:ios` / `npx expo run:android` (or an EAS development build) once, confirm it boots and the custom URL scheme resolves. *Why first, not last:* steps 1-6 below are normally built and verified entirely inside Expo Go, which no longer supports the OAuth redirect proxy (`auth.expo.io` is deprecated) — so step 7's "switch to a custom dev client" would otherwise be the *first* time the project's native build tooling is exercised at all, five modules in. That mixes two unknowns (does the dev client build even work? does OAuth work?) at the moment you can least afford ambiguity. This spike costs 30-60 minutes and decouples them.
1. **Scaffold** — Expo Router app, git init, `.gitignore`, `.env.example`, core deps. *Verify:* `npx expo start` loads a blank screen in Expo Go.
2. **Supabase project + schema** — create project, enable email auth, apply `notes`/`kanban_cards` migrations + RLS via Supabase CLI.
3. **Auth flow** — login (email/password only, no MFA — see Section 2), SecureStore session persistence. *Verify:* sign up, log out/in; confirm an anon-key-only query against `notes` is blocked by RLS.
4. **Notes module** (simplest CRUD — validates the whole Supabase + RLS + React Query pattern Kanban reuses). *Verify:* create/edit/delete persists across app restarts, scoped to the user.
5. **Kanban module** (same pattern, 3-column view). *Verify:* create/move/delete persists across restarts.
6. **Navigation shell** (2 tabs + floating Notes button) — can be done in parallel with 4/5 once there's something real to point at.
7. **Google Calendar OAuth** — still built after the core modules work, since it's the only piece with external-service risk, but the custom-dev-client/build-tooling risk was already de-risked in step 0: Google Cloud Console setup (consent screen → "In production" immediately, native client IDs), implement auth/token/refresh/`invalid_grant` handling.
8. **Manual QA pass across all three modules**, then start the externally-witnessed 14-day usage checkpoint already defined in PROJECT.md — this plan does not build that checkpoint, it's the exit gate for Phase 1.

This order proves the Supabase/RLS/auth plumbing on the boring, internal module (Notes) before Kanban reuses it, isolates the native-build-tooling risk as a cheap step 0 instead of discovering it at step 7, and still defers the Google OAuth logic itself (token lifecycle, consent screen) until everything else already works.

## 8. Verification

- **Scaffold:** blank app loads in Expo Go; custom dev client build boots and resolves its URL scheme (step 0 spike).
- **Auth:** sign-up creates a row in `auth.users`; log out/in works; an anon-key-only query against `notes`/`kanban_cards` returns empty (RLS proof). No MFA in Phase 1 (see Section 2).
- **Notes:** create → force-quit/reopen → confirm persisted server-side; edit updates `updated_at`; delete removes it.
- **Kanban:** create cards in each column, move one, force-quit/reopen, confirm persistence; delete a card.
- **Navigation:** floating Notes button reachable from both tabs.
- **Calendar (the one that needs a real test, not an assumption):**
  1. Happy path — real events display; confirm the consent screen only ever requested the read-only scope.
  2. Silent access-token refresh works transparently.
  3. **Revocation test (explicitly required):** revoke access at `myaccount.google.com/permissions`, reopen Calendar tab, confirm no crash, reauth banner appears, "Reconectar" restores access, no stale data shown as live.
  4. Confirm the Google Cloud Console consent screen is "In production," not "Testing," before relying on this for the 14-day checkpoint (Testing-mode tokens expire every 7 days and would silently break sync mid-checkpoint).
- **Scope guard:** at the end of Phase 1, confirm no folders/code exist for any module beyond Notes/Calendar/Kanban — PROJECT.md's "Regla de bloqueo mecánico de Fase 2" already instructs Claude Code to refuse that work until a dated witness-verdict entry exists in its "Historial de decisiones."

### Critical files
- `C:\Users\pablo\projects\personalApp\PROJECT.md` — source spec, do not contradict.
- `C:\Users\pablo\projects\personalApp\PLAN.md` — this file.
- `C:\Users\pablo\projects\personalApp\app\_layout.tsx` — auth gate + floating Notes button.
- `C:\Users\pablo\projects\personalApp\src\lib\supabase.ts` — Supabase client + SecureStore session adapter.
- `C:\Users\pablo\projects\personalApp\supabase\migrations\` — `notes`/`kanban_cards` schema + RLS.
- `C:\Users\pablo\projects\personalApp\src\features\calendar\googleAuth.ts` — PKCE OAuth + `invalid_grant` handling.
