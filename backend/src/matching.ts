import type Database from 'better-sqlite3';
import type { CandidateRow, JobRow, MatchResult } from './types.ts';

interface SharedSkillAggregate {
  job_id: number;
  candidate_id: number;
  shared_skill_count: number;
  shared_skill_names: string;
}

interface SharedCultureAggregate {
  job_id: number;
  candidate_id: number;
  shared_culture_count: number;
  shared_culture_names: string;
}

interface TotalCountRow {
  job_id: number;
  total_count: number;
}

interface MatchDbRow {
  id: number;
  name?: string;
  title?: string;
  score: number;
  skill_score: number;
  exp_score: number;
  culture_score: number;
  avail_score: number;
  reason: string;
}

/**
 * Recomputes all job-candidate matches using SQL aggregates for overlap counts,
 * combining scores in TypeScript and persisting results in the matches table inside a transaction.
 */
export function recomputeMatches(db: Database.Database): void {
  const runRecompute = db.transaction(() => {
    // Clear old matches
    db.prepare('DELETE FROM matches;').run();

    // 1. Fetch total required skills per job
    const jobSkillsStmt = db.prepare<[], TotalCountRow>(`
      SELECT job_id, COUNT(*) AS total_count
      FROM job_skills
      GROUP BY job_id;
    `);
    const jobSkillsMap = new Map<number, number>();
    for (const row of jobSkillsStmt.all()) {
      jobSkillsMap.set(row.job_id, row.total_count);
    }

    // 2. Fetch total culture keywords per job
    const jobCultureStmt = db.prepare<[], TotalCountRow>(`
      SELECT job_id, COUNT(*) AS total_count
      FROM job_culture
      GROUP BY job_id;
    `);
    const jobCultureMap = new Map<number, number>();
    for (const row of jobCultureStmt.all()) {
      jobCultureMap.set(row.job_id, row.total_count);
    }

    // 3. Fetch candidates and jobs
    const candidatesStmt = db.prepare<[], CandidateRow>(`
      SELECT id, name, experience_years, availability, quirk
      FROM candidates;
    `);
    const candidates = new Map<number, CandidateRow>();
    for (const c of candidatesStmt.all()) {
      candidates.set(c.id, c);
    }

    const jobsStmt = db.prepare<[], JobRow>(`
      SELECT id, title, min_experience, tagline
      FROM jobs;
    `);
    const jobs = new Map<number, JobRow>();
    for (const j of jobsStmt.all()) {
      jobs.set(j.id, j);
    }

    // 4. SQL aggregate for shared skills (inner join excludes pairs with 0 shared skills)
    const sharedSkillsStmt = db.prepare<[], SharedSkillAggregate>(`
      SELECT
        js.job_id,
        cs.candidate_id,
        COUNT(cs.skill_id) AS shared_skill_count,
        GROUP_CONCAT(s.name, ', ') AS shared_skill_names
      FROM job_skills js
      JOIN candidate_skills cs ON js.skill_id = cs.skill_id
      JOIN skills s ON s.id = js.skill_id
      GROUP BY js.job_id, cs.candidate_id;
    `);
    const sharedSkillsList = sharedSkillsStmt.all();

    // 5. SQL aggregate for shared culture/traits
    const sharedCultureStmt = db.prepare<[], SharedCultureAggregate>(`
      SELECT
        jc.job_id,
        ct.candidate_id,
        COUNT(ct.trait_id) AS shared_culture_count,
        GROUP_CONCAT(t.name, ', ') AS shared_culture_names
      FROM job_culture jc
      JOIN candidate_traits ct ON jc.trait_id = ct.trait_id
      JOIN traits t ON t.id = jc.trait_id
      GROUP BY jc.job_id, ct.candidate_id;
    `);
    const sharedCultureMap = new Map<string, SharedCultureAggregate>();
    for (const row of sharedCultureStmt.all()) {
      sharedCultureMap.set(`${row.job_id}:${row.candidate_id}`, row);
    }

    // 6. Compute scores and persist matches
    const insertMatchStmt = db.prepare(`
      INSERT INTO matches (
        job_id, candidate_id, score, skill_score, exp_score, culture_score, avail_score, reason
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    `);

    for (const pair of sharedSkillsList) {
      const candidate = candidates.get(pair.candidate_id);
      const job = jobs.get(pair.job_id);

      if (!candidate || !job) {
        continue;
      }

      // Skill score: shared / total required
      const totalJobSkills = jobSkillsMap.get(pair.job_id) ?? 1;
      const skillScore = pair.shared_skill_count / totalJobSkills;

      // Experience score: 1 if yrs >= min; else yrs/min. Overqualification > 3*min: 0.85
      let expScore: number;
      if (candidate.experience_years < job.min_experience) {
        expScore = job.min_experience > 0 ? candidate.experience_years / job.min_experience : 1.0;
      } else if (candidate.experience_years > 3 * job.min_experience) {
        expScore = 0.85;
      } else {
        expScore = 1.0;
      }

      // Culture score: shared / job culture keywords count
      const totalCulture = jobCultureMap.get(pair.job_id) ?? 0;
      const culturePair = sharedCultureMap.get(`${pair.job_id}:${pair.candidate_id}`);
      const sharedCultureCount = culturePair?.shared_culture_count ?? 0;
      const cultureScore = totalCulture > 0 ? sharedCultureCount / totalCulture : 0.0;

      // Availability score & text
      let availScore: number;
      let availText: string;
      if (candidate.availability === 'immediate') {
        availScore = 1.0;
        availText = 'available immediately';
      } else if (candidate.availability === '2_weeks') {
        availScore = 0.6;
        availText = 'available in 2 weeks';
      } else {
        availScore = 0.2;
        availText = 'not looking';
      }

      // Weighted score: 100 * (0.55*skill + 0.25*exp + 0.10*culture + 0.10*avail) rounded to 1 decimal
      const rawScore = 100 * (0.55 * skillScore + 0.25 * expScore + 0.10 * cultureScore + 0.10 * availScore);
      const finalScore = Math.round(rawScore * 10) / 10;

      // Construct short human reason string
      const reason = `${pair.shared_skill_count}/${totalJobSkills} skills (${pair.shared_skill_names}); ${candidate.experience_years}y vs ${job.min_experience}y min; culture ${sharedCultureCount}/${totalCulture}; ${availText}`;

      insertMatchStmt.run(
        pair.job_id,
        pair.candidate_id,
        finalScore,
        Math.round(skillScore * 1000) / 1000,
        Math.round(expScore * 1000) / 1000,
        Math.round(cultureScore * 1000) / 1000,
        availScore,
        reason,
      );
    }
  });

  runRecompute();
}

/**
 * Returns ranked candidate matches for a specific job.
 * Tie-break: higher skill, then exp closer to min, then name asc.
 */
export function getMatchesForJob(db: Database.Database, jobId: number, limit?: number): MatchResult[] {
  let sql = `
    SELECT
      m.candidate_id AS id,
      c.name,
      m.score,
      m.skill_score,
      m.exp_score,
      m.culture_score,
      m.avail_score,
      m.reason
    FROM matches m
    JOIN candidates c ON m.candidate_id = c.id
    JOIN jobs j ON m.job_id = j.id
    WHERE m.job_id = ?
    ORDER BY
      m.score DESC,
      m.skill_score DESC,
      ABS(c.experience_years - j.min_experience) ASC,
      c.name ASC
  `;

  if (limit !== undefined && limit > 0) {
    sql += ` LIMIT ${limit}`;
  }

  const stmt = db.prepare<[number], MatchDbRow>(sql);
  const rows = stmt.all(jobId);

  return rows.map((row, index) => ({
    rank: index + 1,
    id: row.id,
    name: row.name,
    score: row.score,
    breakdown: {
      skill: row.skill_score,
      exp: row.exp_score,
      culture: row.culture_score,
      avail: row.avail_score,
    },
    reason: row.reason,
  }));
}

/**
 * Returns ranked job matches for a specific candidate.
 * Tie-break: higher skill, then exp closer to min, then job title asc.
 */
export function getMatchesForCandidate(db: Database.Database, candidateId: number, limit?: number): MatchResult[] {
  let sql = `
    SELECT
      m.job_id AS id,
      j.title,
      m.score,
      m.skill_score,
      m.exp_score,
      m.culture_score,
      m.avail_score,
      m.reason
    FROM matches m
    JOIN jobs j ON m.job_id = j.id
    JOIN candidates c ON m.candidate_id = c.id
    WHERE m.candidate_id = ?
    ORDER BY
      m.score DESC,
      m.skill_score DESC,
      ABS(c.experience_years - j.min_experience) ASC,
      j.title ASC
  `;

  if (limit !== undefined && limit > 0) {
    sql += ` LIMIT ${limit}`;
  }

  const stmt = db.prepare<[number], MatchDbRow>(sql);
  const rows = stmt.all(candidateId);

  return rows.map((row, index) => ({
    rank: index + 1,
    id: row.id,
    title: row.title,
    score: row.score,
    breakdown: {
      skill: row.skill_score,
      exp: row.exp_score,
      culture: row.culture_score,
      avail: row.avail_score,
    },
    reason: row.reason,
  }));
}

