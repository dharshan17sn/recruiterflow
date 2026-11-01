PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS candidates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  experience_years INTEGER NOT NULL,
  availability TEXT NOT NULL CHECK (availability IN ('immediate', '2_weeks', 'not_looking')),
  quirk TEXT
);

CREATE TABLE IF NOT EXISTS jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT UNIQUE NOT NULL,
  min_experience INTEGER NOT NULL,
  tagline TEXT
);

CREATE TABLE IF NOT EXISTS skills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS candidate_skills (
  candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  PRIMARY KEY (candidate_id, skill_id)
);

CREATE TABLE IF NOT EXISTS job_skills (
  job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  PRIMARY KEY (job_id, skill_id)
);

CREATE TABLE IF NOT EXISTS traits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS candidate_traits (
  candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  trait_id INTEGER NOT NULL REFERENCES traits(id) ON DELETE CASCADE,
  PRIMARY KEY (candidate_id, trait_id)
);

CREATE TABLE IF NOT EXISTS job_culture (
  job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  trait_id INTEGER NOT NULL REFERENCES traits(id) ON DELETE CASCADE,
  PRIMARY KEY (job_id, trait_id)
);

CREATE TABLE IF NOT EXISTS matches (
  job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  score REAL NOT NULL,
  skill_score REAL NOT NULL,
  exp_score REAL NOT NULL,
  culture_score REAL NOT NULL,
  avail_score REAL NOT NULL,
  reason TEXT NOT NULL,
  PRIMARY KEY (job_id, candidate_id)
);

-- Indexes on join and foreign key columns for query performance
CREATE INDEX IF NOT EXISTS idx_candidate_skills_candidate ON candidate_skills(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_skills_skill ON candidate_skills(skill_id);
CREATE INDEX IF NOT EXISTS idx_job_skills_job ON job_skills(job_id);
CREATE INDEX IF NOT EXISTS idx_job_skills_skill ON job_skills(skill_id);
CREATE INDEX IF NOT EXISTS idx_candidate_traits_candidate ON candidate_traits(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_traits_trait ON candidate_traits(trait_id);
CREATE INDEX IF NOT EXISTS idx_job_culture_job ON job_culture(job_id);
CREATE INDEX IF NOT EXISTS idx_job_culture_trait ON job_culture(trait_id);
CREATE INDEX IF NOT EXISTS idx_matches_job ON matches(job_id);
CREATE INDEX IF NOT EXISTS idx_matches_candidate ON matches(candidate_id);
