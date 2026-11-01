export type Availability = 'immediate' | '2_weeks' | 'not_looking';

export interface CandidateInput {
  name: string;
  skills: string[] | string;
  experience_years: number;
  availability: Availability;
  traits: string[] | string;
  quirk?: string;
}

export interface JobInput {
  title: string;
  required_skills: string[] | string;
  min_experience: number;
  culture: string[] | string;
  tagline?: string;
}

export interface IngestPayload {
  candidates?: CandidateInput[];
  jobs?: JobInput[];
}

export interface CandidateRow {
  id: number;
  name: string;
  experience_years: number;
  availability: Availability;
  quirk: string | null;
}

export interface JobRow {
  id: number;
  title: string;
  min_experience: number;
  tagline: string | null;
}

export interface MatchBreakdown {
  skill: number;
  exp: number;
  culture: number;
  avail: number;
}

export interface MatchResult {
  rank: number;
  id: number;
  name?: string;
  title?: string;
  score: number;
  breakdown: MatchBreakdown;
  reason: string;
}

