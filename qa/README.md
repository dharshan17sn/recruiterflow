# QA Test Automation Suite

Playwright + TypeScript test suite for SauceDemo UI and ReqRes API.

## Setup
1. Install dependencies:
   ```bash
   npm install
   npx playwright install chromium
   ```
2. Configure environment:
   ```bash
   cp .env.example .env
   ```
   Add a valid `REQRES_API_KEY` in `.env`.

## Execution
Run all tests:
```bash
npx playwright test
```

## Coverage
- **UI Tests (`tests/ui`)**:
  - Valid login verification (`standard_user`).
  - Error assertion for `locked_out_user`.
  - Adding product to cart updates badge.
  - **Bonus**: Removing product clears cart badge (`toHaveCount(0)`).
  - **Bonus**: Sidebar logout navigates to login page.
- **API Tests (`tests/api`)**:
  - `GET /api/users/2` returns 200 with non-empty email.
  - `POST /api/users` returns 201 with created user details.
  - **Bonus**: `GET /api/users/23` returns 404 for missing user.
  - Strict validation of `x-api-key` header from environment.
