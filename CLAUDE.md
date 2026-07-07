# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

LifeTrack — a Bengali-language PWA (Next.js 16 App Router) for tracking reminders, money lent (debts), and money borrowed (loans). UI copy is Bengali; user-facing strings, error messages, and confirm/toast text should stay Bengali.

## Commands

```bash
npm run dev          # dev server (Turbopack)
npm run build        # production build
npm start            # serve production build
npm run lint         # next lint (extends next/core-web-vitals)
npm run type-check   # tsc --noEmit
```

No test suite exists. Path alias: `@/*` → repo root (e.g. `@/lib/storage`, `@/components/Modal`).

Firebase env vars (`NEXT_PUBLIC_FIREBASE_*`) required in `.env.local` — see [README.md](README.md) / [FIREBASE_SETUP.md](FIREBASE_SETUP.md). Without them Firebase init fails at runtime.

## Data architecture — three layers

Pages never touch Firestore directly. Data flows through a deliberate stack:

1. [lib/firebase.ts](lib/firebase.ts) — initializes app, exports `db` (Firestore) and `auth`.
2. [lib/firebase-db.ts](lib/firebase-db.ts) — Firestore CRUD + `onSnapshot` subscriptions. All data lives under `users/{uid}/{debts|loans|reminders}`. **Every write goes through `filterUndefined()`** because Firestore rejects `undefined` values — preserve this when adding write paths.
3. [lib/storage.ts](lib/storage.ts) — the API pages actually import. Functions are user-agnostic (`getDebts()`, `addDebtPayment(...)`) and resolve `userId` internally via `getCurrentUserId()`, then delegate to firebase-db. **localStorage is fully deprecated** — this layer is Firebase-only and actively *clears* legacy localStorage keys on login. Do not reintroduce localStorage fallbacks; errors are thrown, not swallowed into local cache.

Payments and amount-increases are stored as **nested arrays on the Debt/Loan document** (not subcollections). Adding a payment auto-sets `returned = (totalPaid >= amount)`. Note an inconsistency to be aware of when editing: debt payment/increase helpers update only the changed field, while some loan helpers (`deleteLoanPayment`, `addLoanIncrease`, `deleteLoanIncrease`) read-modify-write the **entire** loan object via `updateLoan(id, loans[index])`.

Types for all entities: [lib/types.ts](lib/types.ts).

## Auth & layout gating

- [lib/firebase-auth.tsx](lib/firebase-auth.tsx) — `AuthProvider` + `useAuth()` context (email/password). Maps Firebase error codes to Bengali messages and rethrows a scrubbed `Error` (never leaks raw Firebase errors to UI).
- [app/layout.tsx](app/layout.tsx) wraps everything in `AuthProvider` and mounts `PWARegistration`, `ToastContainer`, `ConfirmToastContainer`, and `ConditionalLayout`.
- [components/ConditionalLayout.tsx](components/ConditionalLayout.tsx) shows the bottom `Navigation` only when authenticated and not on `/login`/`/register`, and implements swipe-between-pages gesture nav. The `navItems` order here must match [components/Navigation.tsx](components/Navigation.tsx).

## Imperative UI singletons

Toasts and confirm dialogs are **not** React state passed via props — they use module-level singleton managers with a subscribe/notify pattern, rendered once in the layout:

- `toast.success/error/warning/info(msg)` → [lib/toast.ts](lib/toast.ts) `toastManager`, rendered by [components/Toast.tsx](components/Toast.tsx).
- `confirm.delete/update/edit/custom(...)` → [lib/confirm.ts](lib/confirm.ts) `confirmManager`, rendered by [components/ConfirmToast.tsx](components/ConfirmToast.tsx).

Call these from anywhere; no context/provider needed.

## PWA & notifications

- Manifest is served **dynamically** from [app/api/manifest/route.ts](app/api/manifest/route.ts); `/manifest.json` is rewritten to it in [next.config.js](next.config.js). Edit the route, not a static file. There must be **no** `public/manifest.json` — a static file under `public/` wins over the `afterFiles` rewrite and silently shadows the route (this bit us once). The manifest carries `id`, `display_override`, split `any`/`maskable` icons, `shortcuts`, and `screenshots` (`public/screenshot-{mobile,desktop}.png`) — these fields are what PWABuilder scores and what the Play Store install UI shows, so keep them populated.
- Service worker: [public/sw.js](public/sw.js) (registered by [components/PWARegistration.tsx](components/PWARegistration.tsx)), served with no-cache headers via next.config.
- [lib/notifications.ts](lib/notifications.ts) schedules reminders by `postMessage(SCHEDULE_NOTIFICATION|CANCEL_NOTIFICATION)` to the SW **plus** an in-page `setTimeout` fallback. Notifications only fire while a browser tab is open — this is a known limitation, not a bug.

## Android app (TWA)

- The Android app is a **Trusted Web Activity** wrapping the live PWA — packaged with [PWABuilder](https://www.pwabuilder.com) (Bubblewrap under the hood), package id `com.lifetrack.app`. No native source lives in this repo; rebuild by re-running PWABuilder against the deployed URL.
- **Digital Asset Links** verify the TWA against the domain (no Chrome address bar). Served at `/.well-known/assetlinks.json` from [app/api/assetlinks/route.ts](app/api/assetlinks/route.ts), rewritten in next.config — Next.js does **not** serve dotfile folders under `public/`, so this must be a route, not a static file. The `sha256_cert_fingerprints` there must match the PWABuilder signing key exactly.
- The `.aab` upload key / keystore + passwords are **not** in the repo (kept in the maintainer's password manager). Losing them means no more Play Store updates for `com.lifetrack.app` — Google offers no recovery.

## Config notes

- Next.js 16 features are on: `cacheComponents: true` and Turbopack (`next.config.js`). `removeConsole` strips `console.*` in production builds.
- Three ESLint config files coexist (`.eslintrc.json`, `eslint.config.js`, `eslint.config.mjs`); `next lint` resolves them — confirm which is active before adding rules.
