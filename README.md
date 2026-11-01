# Recruiterflow Engineering Challenge

A comprehensive monorepo containing full-stack applications and automated QA suites built with strict TypeScript, hand-written SQL, and production-grade architecture.

---

## 📁 Monorepo Structure

```text
recruiterflow/
├── frontend/    # Expense Splitter (React 19, TypeScript, Redux Toolkit, Vitest)
├── backend/     # Recruiter-Bot Matching Engine & SQL Detective (Node.js, Express, better-sqlite3)
└── qa/          # Automated Test Suite (Playwright, Chromium, SauceDemo UI & ReqRes API)
```

---

## 🚀 Quick Start

### 1. Frontend — Expense Splitter
Modern, accessible expense sharing application built without component/validation libraries, styled with a clean shadcn-inspired design system.
```bash
cd frontend
npm install
npm run typecheck    # Strict TypeScript checks
npm run lint         # ESLint verification
npm test             # 50 unit & integration tests (Vitest + RTL)
npm run build        # Production bundle build
npm run dev          # Run locally at http://localhost:5173
```
* **Key Features**: Exact-paise integer arithmetic (no floating-point rounding errors), Largest-Remainder method for split distribution, zero external UI libraries, Redux persistence via `store.subscribe`.

---

### 2. Backend — Recruiter-Bot & SQL Detective
High-performance backend service with pure hand-written raw SQL (no ORMs) using `better-sqlite3`.
```bash
cd backend
npm install
npm test             # API integration tests (Vitest + Supertest)
npm run seed         # Idempotent DB seeding (15 candidates, 6 jobs, automated match generation)
npm run detective    # Executes all 5 SQL Detective Challenge queries
npm run dev          # Run REST server at http://localhost:3000
```
* **Key Features**: 
  - Dynamic score breakdown: skills (jaccard overlap), experience tiering, culture alignment, and availability bonuses.
  - Hand-written SQL schema (`schema.sql`) with foreign keys, compound indexes, and prepared statements.
  - SQL Detective solutions (`sql_detective.sql`) solving recruitment analytics and conversion metrics.

---

### 3. QA — Playwright Test Automation
End-to-end automation suite for SauceDemo UI and ReqRes API built with Playwright and Page Object Models.
```bash
cd qa
npm install
npx playwright install chromium
cp .env.example .env    # Configure your REQRES_API_KEY
npx playwright test     # Runs 8 tests (5 UI + 3 API)
```
* **Key Features**:
  - **SauceDemo UI**: Valid login, locked-out error assertion, cart add/remove badge verification, sidebar logout navigation.
  - **ReqRes API**: Request fixture validation, 429 rate-limit backoff retry, strict payload shape validation, and comprehensive error reporting.

---

## 📊 Test Verification Summary

| Module | Test Framework | Test Coverage / Scope | Result |
| :--- | :--- | :--- | :--- |
| **Frontend** | Vitest + React Testing Library | Pure logic (money, split, balance, storage) + Page integration | **50 / 50 Passed** |
| **Backend** | Vitest + Supertest | REST endpoints, match scoring logic, raw SQLite execution | **11 / 11 Passed** |
| **QA** | Playwright (Chromium) | 5 SauceDemo UI tests + 3 ReqRes API tests | **8 / 8 Passed** |

---

## 🛡️ Code Quality Standards
- **Zero any / strict typing**: No `any`, no `@ts-ignore`, no non-null assertions (`!`).
- **Raw SQL**: Hand-crafted DDL and DML with parameterized queries preventing SQL injection.
- **Git Hygiene**: Strict `.gitignore` protecting secrets, databases, and build artifacts. Each workspace includes dedicated documentation in its subfolder.
