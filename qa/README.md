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
  - `GET /api/users/2` (200 with non-empty email).
  - `POST /api/users` (201 with matching name).
  - **Bonus**: `GET /api/users/23` (404 for missing user).
  - Headers (`x-api-key`, `User-Agent: reqres-qa-tests/1.0`, `X-Reqres-Env: prod`), trimmed key validation, 429 retry helper, and descriptive failure messages.
- **Note on ReqRes 403**: Unregistered keys return 403 from ReqRes; tests strictly assert expected contracts and log response diagnostics.
