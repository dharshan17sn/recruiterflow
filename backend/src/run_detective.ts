import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function runDetective(): void {
  const dbPath = path.join(__dirname, '..', 'detective.db');
  // Remove existing file if present for a clean run
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }

  const db = new Database(dbPath);
  db.pragma('foreign_keys = OFF'); // Schema AS-IS from PDF

  const sqlFile = path.join(__dirname, '..', 'sql_detective.sql');
  const fullSql = fs.readFileSync(sqlFile, 'utf8');

  // Separate schema + seed from the queries
  const parts = fullSql.split('-- Q');
  const setupSql = parts[0] ?? '';
  db.exec(setupSql);

  console.log('===============================================================');
  console.log('RecruiterFlow SQL Detective Challenge - Results');
  console.log('===============================================================\n');

  // Query 1
  console.log('-- Q1: Open job postings with recruiter name');
  const q1Sql = `
    SELECT
      jp.id AS job_posting_id,
      jp.title,
      jp.department,
      r.name AS recruiter_name
    FROM job_postings jp
    JOIN recruiters r ON jp.recruiter_id = r.id
    WHERE jp.status = 'open'
    ORDER BY jp.id ASC;
  `;
  console.table(db.prepare(q1Sql).all());

  // Query 2
  console.log('\n-- Q2: Applicants reaching Final interview stage per job posting');
  const q2Sql = `
    SELECT
      jp.id AS job_posting_id,
      jp.title,
      COUNT(DISTINCT LOWER(TRIM(a.email))) AS final_applicants_count
    FROM job_postings jp
    LEFT JOIN interviews i ON jp.id = i.job_posting_id AND i.stage = 'Final'
    LEFT JOIN applicants a ON i.applicant_id = a.id
    GROUP BY jp.id, jp.title
    ORDER BY jp.id ASC;
  `;
  console.table(db.prepare(q2Sql).all());

  // Query 3
  console.log('\n-- Q3: People who effectively applied to >1 posting (deduped by email)');
  const q3Sql = `
    SELECT
      MAX(a.full_name) AS full_name,
      LOWER(TRIM(a.email)) AS email,
      COUNT(DISTINCT i.job_posting_id) AS posting_count
    FROM applicants a
    JOIN interviews i ON a.id = i.applicant_id
    GROUP BY LOWER(TRIM(a.email))
    HAVING COUNT(DISTINCT i.job_posting_id) > 1
    ORDER BY full_name ASC;
  `;
  console.table(db.prepare(q3Sql).all());

  // Query 4
  console.log('\n-- Q4: Final-stage conversion rate per recruiter (>= 3 finals)');
  const q4Sql = `
    SELECT
      r.name AS recruiter_name,
      COUNT(CASE WHEN i.outcome = 'passed' THEN 1 END) AS passed_final_interviews,
      COUNT(*) AS total_final_interviews,
      ROUND(100.0 * COUNT(CASE WHEN i.outcome = 'passed' THEN 1 END) / COUNT(*), 2) AS conversion_rate_percent
    FROM recruiters r
    JOIN job_postings jp ON r.id = jp.recruiter_id
    JOIN interviews i ON jp.id = i.job_posting_id
    WHERE i.stage = 'Final'
    GROUP BY r.id, r.name
    HAVING COUNT(*) >= 3
    ORDER BY conversion_rate_percent DESC;
  `;
  console.table(db.prepare(q4Sql).all());

  // Query 5
  console.log('\n-- Q5 (Bonus): Top recruiter with most Final-passed placements per department');
  const q5Sql = `
    WITH placements_by_recruiter AS (
      SELECT
        jp.department,
        r.id AS recruiter_id,
        r.name AS recruiter_name,
        COUNT(*) AS successful_placements,
        RANK() OVER (
          PARTITION BY jp.department
          ORDER BY COUNT(*) DESC
        ) AS rank_in_dept
      FROM recruiters r
      JOIN job_postings jp ON r.id = jp.recruiter_id
      JOIN interviews i ON jp.id = i.job_posting_id
      WHERE i.stage = 'Final' AND i.outcome = 'passed'
      GROUP BY jp.department, r.id, r.name
    )
    SELECT
      department,
      recruiter_name,
      successful_placements
    FROM placements_by_recruiter
    WHERE rank_in_dept = 1
    ORDER BY department ASC;
  `;
  console.table(db.prepare(q5Sql).all());

  db.close();
}

if (process.argv[1] && process.argv[1].endsWith('run_detective.ts')) {
  runDetective();
}
