# Salary Manager — PRD

## Original Problem Statement
Premium, minimalist mobile app to manage monthly finances. Home dashboard (monthly salary, available balance, total expenses, total extra income, financial summary: This Month, Avg/Expense). Salary button opens a focused centered input to set/update salary and recalculates instantly. Add/edit/delete expenses and extra income (amount + description), updating balances instantly. Authentication (originally email/password; user chose Google social login only). Settings: Personal Info (edit name, display email, masked password), Interface Design (Dark/Light mode, accent color: Midnight Navy default / Champagne Gold / Deep Emerald applied app-wide), Currency switcher (EUR default / USD / GBP), Log Out, Delete Account (confirm by typing DELETE, max 3 attempts, 4th failed attempt locks deletion 10 min with countdown on Home + Settings, then final confirmation). Data persists per account; UI updates immediately.

## User Choices
- Auth: Emergent-managed Google social login only (no app passwords). Delete confirmation adapted to typing "DELETE".
- Currencies: EUR (default), USD, GBP.
- Default theme: Light. Typography: designer's choice (elegant serif for numbers/headers + clean sans body).

## Architecture
- Frontend: Expo Router (React Native, SDK 54). Screens: `app/login.tsx`, `app/(tabs)/{index,transactions,settings}.tsx`. Global state in `src/context/AppContext.tsx` (auth + finance + settings + derived stats). Theme in `src/theme/colors.ts` (buildTheme(mode, accent)). Custom Modal bottom sheets (`SheetModal`, `SalarySheet`, `TransactionSheet`).
- Backend: FastAPI (`server.py`), all routes under `/api`. MongoDB via motor. Session-based Google OAuth (Emergent). Collections: `users`, `user_sessions` (7-day expiry), `transactions`.
- Auth: session_id → backend exchanges with Emergent session-data → upsert user → issue Bearer session_token (stored in expo-secure-store on mobile / localStorage web).

## Personas
- Individual salaried professional tracking monthly cash flow with a calm, private, premium experience.

## Implemented (2026-07-02)
- Google login screen (cinematic hero) + session bootstrap/logout.
- Home dashboard: available balance hero card, salary button + focused salary sheet, expense/income stat cards, financial summary (This Month, Avg/Expense), delete-lock countdown banner.
- Activity: filter chips (All/Expenses/Extra Income), add/edit/delete entries via sheet, FAB, empty state.
- Settings: edit name (persisted), email + masked password display, dark/light toggle, 3 accent colors applied app-wide, EUR/USD/GBP currency switcher, log out, delete account (type DELETE, 3 attempts, 10-min lock + countdown, final confirmation).
- Per-account persistence of salary, transactions, theme, accent, currency. Instant recalculation.
- Verified: 12/12 backend pytest + all frontend flows via testing agent.

## Backlog
- P1: Charts/trends for monthly spending; category tagging for expenses.
- P1: Bottom-sheet ScrollView for very small screens (test-noted robustness).
- P2: Recurring transactions; export/share monthly summary (PDF/CSV).
- P2: Month selector to browse historical months.

## Next Tasks
- Await user feedback; consider spending categories + a simple monthly trend chart.
