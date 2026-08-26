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
- Activity monthly grouping (SectionList per month with salary/income/expenses/balance summary) + month-over-month balance trend bar chart.

## Implemented (2026-08-26)
- Categories: preset sets per type (expense: Food/Transport/Housing/Leisure/Health/Shopping/Other; income: Freelance/Bonus/Gift/Investment/Other) + user-created custom categories (POST/DELETE /api/categories, stored in users.custom_categories). Category picker chips in TransactionSheet ('+ New' chip adds custom inline; long-press custom chip deletes). Transactions store `category` (defaults "Other"); rows show "{category} · type" with category icon.
- Per-month collapsible "Category breakdown" in Activity (per-category income/expense totals).
- Styled PDF export of a month summary via each month's share button (`src/utils/monthPdf.ts`): expo-print + expo-sharing on native (share sheet with PDF); browser print dialog on web. PDF includes stats strip, category breakdown table, and transaction table in the Glass/Luxe style.
- Verified: 23/23 backend pytest + all frontend category/PDF flows via testing agent (iteration_2.json, no bugs).
- Activity single-month view: shows one month at a time with left/right arrow navigation (defaults to latest month); filter chips apply within the shown month. Trend chart on top still shows all months.
- Per-month reset button next to the month name (two-tap confirm "Erase?") → DELETE /api/transactions/month/{year}/{month}.
- Settings → Data → "Reset All Data" (confirm sheet) → DELETE /api/transactions erases every entry, keeps salary/settings/categories.
- Home "Spending by Category" donut (react-native-svg): this month's expenses by category with legend (%, amount); falls back to All Time; hidden when no expenses.
- Verified: 30/30 backend pytest + all frontend flows via testing agent (iteration_3.json, no bugs).

## Backlog
- P1: Bottom-sheet ScrollView for very small screens (test-noted robustness).
- P2: Recurring transactions.
- P2: Tap a trend-chart bar to jump to that month in the single-month Activity view.
- P2: Track historical salary changes per month (historical months currently use current global salary).

## Next Tasks
- Await user feedback on single-month Activity, resets, and donut.
