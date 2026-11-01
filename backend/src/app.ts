import express, { type Request, type Response, type NextFunction } from 'express';
import type Database from 'better-sqlite3';
import { db as defaultDb } from './db.js';
import { getMatchesForJob, getMatchesForCandidate } from './matching.js';
import { ingestData } from './seed.js';
import type { CandidateRow, IngestPayload, JobRow } from './types.js';

export function createApp(database: Database.Database = defaultDb): express.Express {
  const app = express();
  app.use(express.json());

  // GET /jobs - Convenience listing
  app.get('/jobs', (_req: Request, res: Response) => {
    const jobs = database.prepare<[], JobRow>('SELECT id, title, min_experience, tagline FROM jobs ORDER BY id ASC;').all();
    res.json(jobs);
  });

  // GET /candidates - Convenience listing
  app.get('/candidates', (_req: Request, res: Response) => {
    const candidates = database
      .prepare<[], CandidateRow>('SELECT id, name, experience_years, availability, quirk FROM candidates ORDER BY id ASC;')
      .all();
    res.json(candidates);
  });

  // GET /jobs/:id/matches?limit=
  app.get('/jobs/:id/matches', (req: Request, res: Response) => {
    const rawParam = req.params['id'];
    const rawId = Array.isArray(rawParam) ? rawParam[0] : rawParam;

    if (!rawId || !/^\d+$/.test(rawId)) {
      res.status(400).json({ error: 'Invalid job id. Must be a positive integer.' });
      return;
    }

    const jobId = parseInt(rawId, 10);
    const job = database.prepare<[number], { id: number }>('SELECT id FROM jobs WHERE id = ?;').get(jobId);
    if (!job) {
      res.status(404).json({ error: `Job with id ${jobId} not found.` });
      return;
    }

    let limit: number | undefined;
    if (req.query['limit'] !== undefined) {
      const rawLimit = String(req.query['limit']);
      if (!/^\d+$/.test(rawLimit) || parseInt(rawLimit, 10) <= 0) {
        res.status(400).json({ error: 'Invalid limit parameter. Must be a positive integer.' });
        return;
      }
      limit = parseInt(rawLimit, 10);
    }

    const matches = getMatchesForJob(database, jobId, limit);
    res.json(matches);
  });

  // GET /candidates/:id/matches?limit=
  app.get('/candidates/:id/matches', (req: Request, res: Response) => {
    const rawParam = req.params['id'];
    const rawId = Array.isArray(rawParam) ? rawParam[0] : rawParam;

    if (!rawId || !/^\d+$/.test(rawId)) {
      res.status(400).json({ error: 'Invalid candidate id. Must be a positive integer.' });
      return;
    }

    const candidateId = parseInt(rawId, 10);
    const candidate = database.prepare<[number], { id: number }>('SELECT id FROM candidates WHERE id = ?;').get(candidateId);
    if (!candidate) {
      res.status(404).json({ error: `Candidate with id ${candidateId} not found.` });
      return;
    }

    let limit: number | undefined;
    if (req.query['limit'] !== undefined) {
      const rawLimit = String(req.query['limit']);
      if (!/^\d+$/.test(rawLimit) || parseInt(rawLimit, 10) <= 0) {
        res.status(400).json({ error: 'Invalid limit parameter. Must be a positive integer.' });
        return;
      }
      limit = parseInt(rawLimit, 10);
    }

    const matches = getMatchesForCandidate(database, candidateId, limit);
    res.json(matches);
  });

  // POST /ingest
  app.post('/ingest', (req: Request, res: Response) => {
    const payload = req.body as IngestPayload;
    if (!payload || typeof payload !== 'object') {
      res.status(400).json({ error: 'Invalid payload. Body must be an object with candidates and/or jobs arrays.' });
      return;
    }

    const result = ingestData(database, payload);
    res.status(200).json({
      message: 'Ingestion and match recomputation completed successfully',
      candidatesIngested: result.candidatesIngested,
      jobsIngested: result.jobsIngested,
    });
  });

  // Centralized Error Handler
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled Server Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  });

  return app;
}

export const app = createApp();
