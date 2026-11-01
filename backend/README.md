# RecruiterFlow Recruiter-Bot Backend

A Node + TypeScript + Express + better-sqlite3 matching engine that ingests candidates and job openings, computes weighted fit scores using raw hand-written SQL aggregates, and exposes ranked matching endpoints.

## Installation & Running

```bash
# Install dependencies
npm install

# Seed initial database and compute matches
npm run seed

# Start the server (http://localhost:3000)
npm run start

# Run Vitest integration test suite
npm run test

# Run SQL Detective Challenge (Q1-Q5)
npm run detective
```

## cURL Examples

```bash
# 1. Matches for a job
curl http://localhost:3000/jobs/1/matches?limit=3

# 2. Matches for a candidate
curl http://localhost:3000/candidates/1/matches?limit=3

# 3. Ingest new candidates / jobs
curl -X POST http://localhost:3000/ingest \
  -H "Content-Type: application/json" \
  -d '{"candidates":[{"name":"John Watson","skills":["forensics","medicine"],"experience_years":7,"availability":"immediate","traits":["loyal"]}],"jobs":[]}'
```

## Algorithm Design & Trade-Offs

**Score Formula**: `100 * (0.55 * skill + 0.25 * exp + 0.10 * culture + 0.10 * avail)`

**Zero-Skill Exclusion**: Pairs with 0 overlapping required skills are excluded directly via an inner join. Core technical competency is non-negotiable; even a candidate with 20 years of experience cannot perform a specialized role without prerequisite skills.

**Availability Penalization vs. Exclusion**: Passive candidates (`not_looking` at 0.2, `2_weeks` at 0.6) are down-ranked rather than filtered out. Top-tier passive talent remains discoverable by recruiters willing to make compelling outreach for hard-to-fill openings.

**Mild Overqualification Adjustment**: Candidates exceeding 3× the job's minimum experience receive a slight discount (`0.85`), but never 0. This reflects standard retention and compensation considerations without penalizing deep expertise unduly.

## AI Usage

AI assistants were used to assist with project scaffolding, drafting test fixtures, and verifying query edge cases. I reviewed and verified all implementations, and I can explain every line of SQL and TypeScript in this project.
