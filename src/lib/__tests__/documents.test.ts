import { beforeAll, describe, expect, it, vi } from 'vitest';
import { computeSHA256 } from '../hash';
import { shouldReindex } from '../vectorize';

vi.mock('cloudflare:email', () => ({
  EmailMessage: class {
    async send(): Promise<void> {
      return Promise.resolve();
    }
  },
}));

vi.mock('html-entities', () => ({
  decode: (value: string) => value,
}));

let buildResumeSectionInsert: typeof import('../documents').buildResumeSectionInsert;
let scoreKeywords: typeof import('../documents').scoreKeywords;
let scoreActionVerbs: typeof import('../documents').scoreActionVerbs;
let scoreImpact: typeof import('../documents').scoreImpact;
let scoreBrevity: typeof import('../documents').scoreBrevity;
let scoreStructure: typeof import('../documents').scoreStructure;
let scoreSeniority: typeof import('../documents').scoreSeniority;
let buildRecommendation: typeof import('../documents').buildRecommendation;

beforeAll(async () => {
  const mod = await import('../documents');
  buildResumeSectionInsert = mod.buildResumeSectionInsert;
  scoreKeywords = mod.scoreKeywords;
  scoreActionVerbs = mod.scoreActionVerbs;
  scoreImpact = mod.scoreImpact;
  scoreBrevity = mod.scoreBrevity;
  scoreStructure = mod.scoreStructure;
  scoreSeniority = mod.scoreSeniority;
  buildRecommendation = mod.buildRecommendation;
});

describe('hashing utilities', () => {
  it('computes SHA-256 hashes deterministically', async () => {
    const hash = await computeSHA256('hello world');
    expect(hash).toBe('b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9');
  });
});

describe('resume section persistence', () => {
  it('builds an insert payload with all section fields', () => {
    const payload = buildResumeSectionInsert(1, {
      summary: 'Summary',
      experience: 'Experience',
      skills: 'Skills',
    });

    expect(payload).not.toBeNull();
    expect(payload?.binds).toHaveLength(9);
    expect(payload?.binds?.[0]).toBe(1);
    expect(payload?.binds?.[1]).toBe('Summary');
    expect(payload?.binds?.[3]).toBe('Skills');
  });
});

describe('embedding idempotency', () => {
  it('detects identical hashes', () => {
    const should = shouldReindex('abc', 'abc');
    expect(should).toBe(false);
  });

  it('detects changed hashes', () => {
    const should = shouldReindex('abc', 'def');
    expect(should).toBe(true);
  });
});

describe('ATS scoring helpers', () => {
  const resume = `# Summary\nLed team to deliver 30% growth.\n## Experience\nManaged product roadmap.`;
  const job = `# Job\nSeeking a leader with product experience.`;

  it('scores keyword overlap within range', () => {
    const score = scoreKeywords(resume, job);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('scores action verbs within range', () => {
    const score = scoreActionVerbs(resume);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('scores impact metrics within range', () => {
    const score = scoreImpact(resume);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('scores brevity within range', () => {
    const score = scoreBrevity(resume);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('scores structure within range', () => {
    const score = scoreStructure(resume);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('scores seniority alignment within range', () => {
    const score = scoreSeniority(resume, job);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('builds recommendations with valid ranges', () => {
    const recommendation = buildRecommendation(3, 'experience', 'Add metrics');
    expect(recommendation.range.start.line).toBe(3);
    expect(recommendation.range.end.line).toBe(3);
    expect(recommendation.paths.advanced).toBe('Add metrics');
  });
});
