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
- UI simplification (user request): removed Home "Financial Summary" section; removed Activity filter chips (All/Expenses/Extra Income — everything now shown together); stronger visual hierarchy: accent-colored uppercase eyebrows (WELCOME BACK / INSIGHTS / YOUR MONEY), larger serif titles, muted subtitles, uppercase stat labels with red/green colored values.
- "Reset All Data" in Settings now also resets monthly salary to 0 (DELETE /api/transactions + PUT /api/finance/salary {salary:0}).
- Activity month view now groups entries by category in two balanced masonry columns: each GroupCard shows category icon + name, expense/income totals, and its entries as a list (tap to edit, trash to delete). Replaced the flat list and the collapsible breakdown (group cards now serve that purpose; PDF export still includes the breakdown table).

## Implemented (2026-08-26, iteration 6)
- Quick-add templates: GET/POST/DELETE /api/templates (max 20). "QUICK ADD" chips in TransactionSheet (tap = instant entry, long-press = delete template) + "Save as quick-add template" checkbox on new entries.
- Savings goal: PUT/DELETE /api/users/goal. Home goal card with progress bar (% of target, clamped 0-100); progress = sum of monthly leftovers (salaryFor + income − expenses). GoalSheet for set/edit/remove; dashed "Set a savings goal" button when none.
- Historical salary: PUT /api/finance/salary upserts salary_history [{month:"YYYY-MM", salary}]; salaryFor(year,month0) in AppContext picks the entry in effect for each month (fallback: earliest entry, else user.salary). Activity months + Year view use it.
- Year overview: /year route (button on Activity header) — year arrows, income/expenses/saved totals strip, 12-month grid of saved-per-month, styled year PDF share (expo-print).
- Verified: 54/54 backend pytest + all frontend flows via testing agent (iteration_4.json report, no bugs). Fixed minor: GET /templates no longer returns user_id.

## Implemented (2026-08-26, iteration 7)
- Deletable categories: long-press ANY chip in the entry sheet removes it — customs via DELETE /api/categories/{id}, presets via POST /api/categories/hide (users.hidden_categories; "Other" protected).
- Language setting: EN (default) / FR / ES in Settings (PUT /api/user/settings {language}); full UI i18n via /app/frontend/src/i18n/index.ts + t() in AppContext; month names localized. PDFs remain English.
- Savings tab (4th tab): multiple goals (collection `goals`; GET/POST/PUT/DELETE /api/goals, POST /api/goals/{id}/contribute). Contributions log an expense (description = goal name, category = "Savings", auto-created). Goal cards with progress, Add money sheet, edit/delete. Old single-goal (/users/goal + Home goal card) REMOVED.
- CSV export: Settings > Data > Export CSV — client-built CSV (transactions + salary history + goals); web blob download, native share via expo-file-system + expo-sharing.
- Polish: SVG donut no longer warns (rotate via style), BALANCE TREND header translated.
- Verified: 74/74 backend pytest + all frontend flows via testing agent (iteration 7, no bugs).

## Backlog
- P1: Bottom-sheet ScrollView for very small screens (test-noted robustness).
- P2: Recurring transactions.
- P2: Tap a trend-chart bar to jump to that month in the single-month Activity view.
- P2: Budget limits per category.

## Next Tasks
- Await user feedback on single-month Activity, resets, and donut.
