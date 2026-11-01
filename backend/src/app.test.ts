import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import type express from 'express';
import { createApp } from './app.js';
import { initDatabase } from './db.js';
import { seed } from './seed.js';
import type Database from 'better-sqlite3';

describe('Recruiter-Bot API Integration Tests', () => {
  let testDb: Database.Database;
  let app: express.Express;

  beforeAll(() => {
    testDb = initDatabase(':memory:');
    seed(testDb);
    app = createApp(testDb);
  });

  describe('GET /jobs/:id/matches', () => {
    it('top match for Backend Detective is Sherlock H.', async () => {
      // Find job id for 'Backend Detective'
      const jobRow = testDb.prepare<[string], { id: number }>('SELECT id FROM jobs WHERE title = ?;').get('Backend Detective');
      expect(jobRow).toBeDefined();

      const res = await request(app).get(`/jobs/${jobRow?.id}/matches`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);

      const topMatch = res.body[0];
      expect(topMatch.rank).toBe(1);
      expect(topMatch.name).toBe('Sherlock H.');
      expect(topMatch.score).toBe(95.0);
      expect(topMatch.breakdown.skill).toBe(1); // 3/3 skills
      expect(topMatch.breakdown.exp).toBe(1); // 8y vs 3y (8 <= 3*3, so not overqualified)
      expect(topMatch.breakdown.avail).toBe(1.0); // immediate
    });

    it('for Incident Commander, top match is Olivia P. over Katniss E.', async () => {
      // Find job id for 'Incident Commander'
      const jobRow = testDb.prepare<[string], { id: number }>('SELECT id FROM jobs WHERE title = ?;').get('Incident Commander');
      expect(jobRow).toBeDefined();

      const res = await request(app).get(`/jobs/${jobRow?.id}/matches`);
      expect(res.status).toBe(200);

      const topMatch = res.body[0];
      const secondMatch = res.body[1];

      // Olivia P. takes #1 (score 87.3) and Katniss E. takes #2 (score 76.7)
      // Reason: Skill overlap carries 55% weight in the scoring algorithm.
      // Olivia possesses 3/3 required skills (100% skill match = 55.0 pts). Even with mild overqualification
      // (13 yrs > 3 * 4 = 12, so exp = 0.85 = 21.25 pts) and 2_weeks availability (0.6 = 6.0 pts), she totals 87.3.
      // Katniss has immediate availability (1.0 = 10 pts) and standard exp (5y vs 4y = 25 pts), but only matches
      // 2/3 required skills (lacks negotiation), capping her skill score at 36.67 pts and total score at 76.7.
      expect(topMatch.name).toBe('Olivia P.');
      expect(topMatch.score).toBe(87.3);
      expect(secondMatch.name).toBe('Katniss E.');
      expect(secondMatch.score).toBe(76.7);
    });

    it('respects the limit query parameter', async () => {
      const jobRow = testDb.prepare<[string], { id: number }>('SELECT id FROM jobs WHERE title = ?;').get('Backend Detective');
      const res = await request(app).get(`/jobs/${jobRow?.id}/matches?limit=1`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].rank).toBe(1);
    });
  });

  describe('Error handling (400 and 404 cases)', () => {
    it('returns 400 for bad job id (non-numeric)', async () => {
      const res = await request(app).get('/jobs/abc/matches');
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/invalid job id/i);
    });

    it('returns 404 for unknown job id', async () => {
      const res = await request(app).get('/jobs/99999/matches');
      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/not found/i);
    });

    it('returns 400 for bad limit parameter on jobs endpoint', async () => {
      const res = await request(app).get('/jobs/1/matches?limit=-5');
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/invalid limit/i);
    });

    it('returns 400 for bad candidate id (non-numeric)', async () => {
      const res = await request(app).get('/candidates/invalid-id/matches');
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/invalid candidate id/i);
    });

    it('returns 404 for unknown candidate id', async () => {
      const res = await request(app).get('/candidates/99999/matches');
      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/not found/i);
    });

    it('returns 400 for bad limit parameter on candidates endpoint', async () => {
      const res = await request(app).get('/candidates/1/matches?limit=xyz');
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/invalid limit/i);
    });
  });

  describe('Reverse endpoint consistency', () => {
    it('GET /candidates/:id/matches produces scores and breakdown consistent with GET /jobs/:id/matches', async () => {
      const sherlock = testDb.prepare<[string], { id: number }>('SELECT id FROM candidates WHERE name = ?;').get('Sherlock H.');
      const backendJob = testDb.prepare<[string], { id: number }>('SELECT id FROM jobs WHERE title = ?;').get('Backend Detective');

      expect(sherlock).toBeDefined();
      expect(backendJob).toBeDefined();

      // Forward query: job -> candidate
      const jobMatchesRes = await request(app).get(`/jobs/${backendJob?.id}/matches`);
      const sherlockInJob = jobMatchesRes.body.find((m: { id: number }) => m.id === sherlock?.id);

      // Reverse query: candidate -> job
      const candidateMatchesRes = await request(app).get(`/candidates/${sherlock?.id}/matches`);
      const jobInSherlock = candidateMatchesRes.body.find((m: { id: number }) => m.id === backendJob?.id);

      expect(sherlockInJob).toBeDefined();
      expect(jobInSherlock).toBeDefined();
      expect(sherlockInJob.score).toBe(jobInSherlock.score);
      expect(sherlockInJob.breakdown).toEqual(jobInSherlock.breakdown);
      expect(sherlockInJob.reason).toBe(jobInSherlock.reason);
    });
  });

  describe('POST /ingest', () => {
    it('upserts new candidates/jobs and recomputes matches within one transaction', async () => {
      const res = await request(app)
        .post('/ingest')
        .send({
          candidates: [
            {
              name: 'John Watson',
              skills: 'forensics,medicine,investigation',
              experience_years: 7,
              availability: 'immediate',
              traits: 'loyal,calm',
              quirk: 'Documents everything in a journal.',
            },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.candidatesIngested).toBe(1);

      // Watson should now have a match with Backend Detective (shares 'forensics')
      const backendJob = testDb.prepare<[string], { id: number }>('SELECT id FROM jobs WHERE title = ?;').get('Backend Detective');
      const jobMatches = await request(app).get(`/jobs/${backendJob?.id}/matches`);
      const watsonMatch = jobMatches.body.find((m: { name: string }) => m.name === 'John Watson');
      expect(watsonMatch).toBeDefined();
    });
  });
});
