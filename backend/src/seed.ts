import type Database from 'better-sqlite3';
import { db as defaultDb } from './db.js';
import { recomputeMatches } from './matching.js';
import type { CandidateInput, IngestPayload, JobInput } from './types.js';

export function normalizeToken(token: string): string {
  return token.trim().toLowerCase().replace(/[\s_]+/g, '-');
}

export function parseTokens(input: string[] | string): string[] {
  if (Array.isArray(input)) {
    return input.map(normalizeToken).filter(Boolean);
  }
  return input
    .split(',')
    .map(normalizeToken)
    .filter(Boolean);
}

export const SEED_CANDIDATES: CandidateInput[] = [
  {
    name: 'Sherlock H.',
    skills: 'deduction,pattern-recognition,forensics',
    experience_years: 8,
    availability: 'immediate',
    traits: 'analytical,blunt',
    quirk: 'Solves problems by eliminating the impossible; occasionally insufferable in standups.',
  },
  {
    name: 'Hermione G.',
    skills: 'research,time-management,public-speaking',
    experience_years: 4,
    availability: '2_weeks',
    traits: 'detail-oriented,overachiever',
    quirk: 'Reads the entire documentation before writing a single line of code.',
  },
  {
    name: 'Tony S.',
    skills: 'systems-design,rapid-prototyping,leadership',
    experience_years: 12,
    availability: 'not_looking',
    traits: 'confident,innovative',
    quirk: 'Ships an MVP overnight, refuses to write tests.',
  },
  {
    name: 'Leslie K.',
    skills: 'project-management,stakeholder-management,public-speaking',
    experience_years: 6,
    availability: 'immediate',
    traits: 'tenacious,organized',
    quirk: 'Has a binder for everything, including the binder.',
  },
  {
    name: 'Ron S.',
    skills: 'woodworking,minimalism,negotiation',
    experience_years: 15,
    availability: 'not_looking',
    traits: 'stubborn,principled',
    quirk: 'Refuses to use more than one monitor.',
  },
  {
    name: 'Rick S.',
    skills: 'systems-design,rapid-prototyping,chemistry',
    experience_years: 20,
    availability: 'immediate',
    traits: 'genius,reckless',
    quirk: 'Solution works, mechanism deeply concerning.',
  },
  {
    name: 'Elle W.',
    skills: 'persuasion,research,public-speaking',
    experience_years: 3,
    availability: 'immediate',
    traits: 'optimistic,sharp',
    quirk: 'Underestimated in every standup, correct in every retro.',
  },
  {
    name: 'MacGyver',
    skills: 'rapid-prototyping,resourcefulness,chemistry,systems-design',
    experience_years: 10,
    availability: '2_weeks',
    traits: 'calm,improviser',
    quirk: 'Fixes production outages with duct tape and a paperclip metaphor.',
  },
  {
    name: 'Sheldon C.',
    skills: 'theoretical-analysis,pattern-recognition,research',
    experience_years: 9,
    availability: 'immediate',
    traits: 'rigid,brilliant',
    quirk: 'Correct 95% of the time, insufferable 100% of the time.',
  },
  {
    name: 'Katniss E.',
    skills: 'precision,strategy,crisis-management',
    experience_years: 5,
    availability: 'immediate',
    traits: 'resilient,decisive',
    quirk: 'Excellent under pressure, terrible with public speaking.',
  },
  {
    name: 'Michael S.',
    skills: 'sales,public-speaking,team-building',
    experience_years: 11,
    availability: 'not_looking',
    traits: 'enthusiastic,chaotic',
    quirk: "World's best boss, according to a mug he bought himself.",
  },
  {
    name: 'Olivia P.',
    skills: 'crisis-management,negotiation,strategy,leadership',
    experience_years: 13,
    availability: '2_weeks',
    traits: 'decisive,intense',
    quirk: 'Handles it. Whatever it is.',
  },
  {
    name: 'Ted L.',
    skills: 'team-building,optimism,mentorship,public-speaking',
    experience_years: 7,
    availability: 'immediate',
    traits: 'empathetic,persistent',
    quirk: 'Turns every technical setback into a folksy metaphor.',
  },
  {
    name: 'Miranda P.',
    skills: 'leadership,negotiation,stakeholder-management,precision',
    experience_years: 18,
    availability: 'not_looking',
    traits: 'demanding,decisive',
    quirk: 'Reviews every PR personally. Says nothing. Everyone panics.',
  },
  {
    name: 'Dwight S.',
    skills: 'sales,negotiation,security,loyalty',
    experience_years: 9,
    availability: 'immediate',
    traits: 'intense,loyal',
    quirk: 'Assistant to the regional backend engineer.',
  },
];

export const SEED_JOBS: JobInput[] = [
  {
    title: 'Backend Detective',
    required_skills: 'deduction,pattern-recognition,forensics',
    min_experience: 3,
    culture: 'analytical,autonomous',
    tagline: 'We have a bug. We have no leads. We have you.',
  },
  {
    title: 'Rapid Prototyping Engineer',
    required_skills: 'rapid-prototyping,systems-design',
    min_experience: 2,
    culture: 'innovative,fast-paced',
    tagline: 'Ship first, document never (kidding — please document).',
  },
  {
    title: 'Developer Relations Lead',
    required_skills: 'public-speaking,research',
    min_experience: 2,
    culture: 'energetic,curious',
    tagline: 'Explain complex things to confused humans, cheerfully.',
  },
  {
    title: 'Engineering Manager, Chaos Team',
    required_skills: 'team-building,stakeholder-management,leadership',
    min_experience: 5,
    culture: 'empathetic,organized',
    tagline: 'Herd cats. The cats are senior engineers.',
  },
  {
    title: 'Incident Commander',
    required_skills: 'crisis-management,strategy,negotiation',
    min_experience: 4,
    culture: 'decisive,calm-under-pressure',
    tagline: "3am page. You're the one who picks up.",
  },
  {
    title: 'Sales Engineer',
    required_skills: 'sales,public-speaking,negotiation',
    min_experience: 3,
    culture: 'enthusiastic,persistent',
    tagline: 'Sell the vision, then go build it.',
  },
];

/**
 * Ingests candidates and jobs with idempotent upsert by name/title,
 * then recomputes the matches table inside one single transaction.
 */
export function ingestData(db: Database.Database, payload: IngestPayload): { candidatesIngested: number; jobsIngested: number } {
  let candidatesIngested = 0;
  let jobsIngested = 0;

  const runIngest = db.transaction(() => {
    // Upsert candidates
    if (payload.candidates && payload.candidates.length > 0) {
      const upsertCandidateStmt = db.prepare<[string, number, string, string | null], { id: number }>(`
        INSERT INTO candidates (name, experience_years, availability, quirk)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(name) DO UPDATE SET
          experience_years = excluded.experience_years,
          availability = excluded.availability,
          quirk = excluded.quirk
        RETURNING id;
      `);

      const clearSkillsStmt = db.prepare('DELETE FROM candidate_skills WHERE candidate_id = ?;');
      const clearTraitsStmt = db.prepare('DELETE FROM candidate_traits WHERE candidate_id = ?;');

      const insertSkillStmt = db.prepare('INSERT INTO skills (name) VALUES (?) ON CONFLICT(name) DO NOTHING;');
      const linkSkillStmt = db.prepare(`
        INSERT INTO candidate_skills (candidate_id, skill_id)
        VALUES (?, (SELECT id FROM skills WHERE name = ?))
        ON CONFLICT DO NOTHING;
      `);

      const insertTraitStmt = db.prepare('INSERT INTO traits (name) VALUES (?) ON CONFLICT(name) DO NOTHING;');
      const linkTraitStmt = db.prepare(`
        INSERT INTO candidate_traits (candidate_id, trait_id)
        VALUES (?, (SELECT id FROM traits WHERE name = ?))
        ON CONFLICT DO NOTHING;
      `);

      for (const candidate of payload.candidates) {
        const row = upsertCandidateStmt.get(
          candidate.name,
          candidate.experience_years,
          candidate.availability,
          candidate.quirk ?? null,
        );

        if (!row) {
          continue;
        }

        const candidateId = row.id;
        clearSkillsStmt.run(candidateId);
        clearTraitsStmt.run(candidateId);

        const skills = parseTokens(candidate.skills);
        for (const skill of skills) {
          insertSkillStmt.run(skill);
          linkSkillStmt.run(candidateId, skill);
        }

        const traits = parseTokens(candidate.traits);
        for (const trait of traits) {
          insertTraitStmt.run(trait);
          linkTraitStmt.run(candidateId, trait);
        }

        candidatesIngested++;
      }
    }

    // Upsert jobs
    if (payload.jobs && payload.jobs.length > 0) {
      const upsertJobStmt = db.prepare<[string, number, string | null], { id: number }>(`
        INSERT INTO jobs (title, min_experience, tagline)
        VALUES (?, ?, ?)
        ON CONFLICT(title) DO UPDATE SET
          min_experience = excluded.min_experience,
          tagline = excluded.tagline
        RETURNING id;
      `);

      const clearJobSkillsStmt = db.prepare('DELETE FROM job_skills WHERE job_id = ?;');
      const clearJobCultureStmt = db.prepare('DELETE FROM job_culture WHERE job_id = ?;');

      const insertSkillStmt = db.prepare('INSERT INTO skills (name) VALUES (?) ON CONFLICT(name) DO NOTHING;');
      const linkJobSkillStmt = db.prepare(`
        INSERT INTO job_skills (job_id, skill_id)
        VALUES (?, (SELECT id FROM skills WHERE name = ?))
        ON CONFLICT DO NOTHING;
      `);

      const insertTraitStmt = db.prepare('INSERT INTO traits (name) VALUES (?) ON CONFLICT(name) DO NOTHING;');
      const linkJobCultureStmt = db.prepare(`
        INSERT INTO job_culture (job_id, trait_id)
        VALUES (?, (SELECT id FROM traits WHERE name = ?))
        ON CONFLICT DO NOTHING;
      `);

      for (const job of payload.jobs) {
        const row = upsertJobStmt.get(job.title, job.min_experience, job.tagline ?? null);

        if (!row) {
          continue;
        }

        const jobId = row.id;
        clearJobSkillsStmt.run(jobId);
        clearJobCultureStmt.run(jobId);

        const skills = parseTokens(job.required_skills);
        for (const skill of skills) {
          insertSkillStmt.run(skill);
          linkJobSkillStmt.run(jobId, skill);
        }

        const culture = parseTokens(job.culture);
        for (const trait of culture) {
          insertTraitStmt.run(trait);
          linkJobCultureStmt.run(jobId, trait);
        }

        jobsIngested++;
      }
    }

    // Recompute matches inside the exact same transaction
    recomputeMatches(db);
  });

  runIngest();

  return { candidatesIngested, jobsIngested };
}

export function seed(db: Database.Database = defaultDb): void {
  const result = ingestData(db, {
    candidates: SEED_CANDIDATES,
    jobs: SEED_JOBS,
  });
  console.log(`Successfully seeded database with ${result.candidatesIngested} candidates and ${result.jobsIngested} jobs.`);
}

if (process.argv[1] && process.argv[1].endsWith('seed.ts')) {
  seed();
}
