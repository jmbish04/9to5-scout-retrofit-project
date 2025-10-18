interface StatsEnv {
  DB: any;
}

interface SnapshotRow {
  parsed: string | null;
  extracted_at: number;
  source: string;
}

interface ComputedStats {
  highlights: any;
  total_comp_heuristics: any;
  coverage: any;
}

interface RollupOptions {
  months?: number;
  dryRun?: boolean;
  companyId?: string;
}

function parseSnapshot(row: SnapshotRow): any | null {
  if (!row.parsed) {
    return null;
  }
  try {
    return JSON.parse(row.parsed);
  } catch (error) {
    console.warn('Failed to parse snapshot JSON', error);
    return null;
  }
}

function avg(values: number[]): number | null {
  const filtered = values.filter((value) => Number.isFinite(value));
  if (!filtered.length) {
    return null;
  }
  const total = filtered.reduce((acc, value) => acc + value, 0);
  return total / filtered.length;
}

function computeHighlights(parsedSnapshots: any[]): any {
  const highlights: { standout: any[]; anomalies: any[]; notes: string[] } = {
    standout: [],
    anomalies: [],
    notes: [],
  };

  const latest = parsedSnapshots[0];
  if (!latest) {
    return highlights;
  }

  const match = latest.retirement?.match_percent;
  if (Number.isFinite(match) && match >= 6) {
    highlights.standout.push({ type: 'retirement', message: '401k match >= 6%', value: match });
  }

  const parental = latest.time_off?.parental_leave_weeks;
  if (Number.isFinite(parental) && parental >= 16) {
    highlights.standout.push({ type: 'family', message: 'Parental leave 16+ weeks', value: parental });
  }

  const wfa = latest.work_model?.work_from_anywhere_weeks;
  if (Number.isFinite(wfa) && wfa >= 4) {
    highlights.standout.push({ type: 'flexibility', message: 'Work-from-anywhere 4+ weeks', value: wfa });
  }

  const pto = latest.time_off?.pto_days;
  if (Number.isFinite(pto) && pto >= 25) {
    highlights.standout.push({ type: 'time_off', message: '25+ PTO days', value: pto });
  }

  if (latest.compensation?.bonus?.target_percent && latest.compensation.bonus.target_percent >= 40) {
    highlights.anomalies.push({ type: 'bonus', message: 'Bonus target unusually high', value: latest.compensation.bonus.target_percent });
  }

  return highlights;
}

function computeCoverage(parsedSnapshots: any[]): any {
  const categories = {
    compensation: 0,
    retirement: 0,
    healthcare: 0,
    time_off: 0,
    work_model: 0,
    perks: 0,
  };

  parsedSnapshots.forEach((snapshot) => {
    if (!snapshot) return;
    if (snapshot.compensation) categories.compensation += 1;
    if (snapshot.retirement) categories.retirement += 1;
    if (snapshot.healthcare) categories.healthcare += 1;
    if (snapshot.time_off) categories.time_off += 1;
    if (snapshot.work_model) categories.work_model += 1;
    if (snapshot.perks && snapshot.perks.length) categories.perks += 1;
  });

  const total = parsedSnapshots.length || 1;
  return {
    compensation: { present: categories.compensation > 0, confidence: categories.compensation / total },
    retirement: { present: categories.retirement > 0, confidence: categories.retirement / total },
    healthcare: { present: categories.healthcare > 0, confidence: categories.healthcare / total },
    time_off: { present: categories.time_off > 0, confidence: categories.time_off / total },
    work_model: { present: categories.work_model > 0, confidence: categories.work_model / total },
    perks: { present: categories.perks > 0, confidence: categories.perks / total },
  };
}

function computeTotals(parsedSnapshots: any[]): any {
  const latest = parsedSnapshots[0];
  if (!latest) {
    return {
      estimated_base: null,
      assumptions: {
        default_base: 120000,
        work_days_per_year: 260,
      },
      components: {},
      total_estimated_value: 0,
    };
  }

  const baseRange = latest.compensation?.base_range;
  const baseCandidates: number[] = [];
  if (Number.isFinite(baseRange?.min)) baseCandidates.push(baseRange.min);
  if (Number.isFinite(baseRange?.max)) baseCandidates.push(baseRange.max);
  const averageBase = avg(baseCandidates) || 120000;
  const dailyRate = averageBase / 260;

  const ptoDays = Number.isFinite(latest.time_off?.pto_days) ? latest.time_off.pto_days : 0;
  const parentalWeeks = Number.isFinite(latest.time_off?.parental_leave_weeks) ? latest.time_off.parental_leave_weeks : 0;
  const matchPercent = Number.isFinite(latest.retirement?.match_percent) ? latest.retirement.match_percent : 0;
  const bonusPercent = Number.isFinite(latest.compensation?.bonus?.target_percent) ? latest.compensation.bonus.target_percent : 0;
  const wfaWeeks = Number.isFinite(latest.work_model?.work_from_anywhere_weeks) ? latest.work_model.work_from_anywhere_weeks : 0;

  const components: Record<string, number> = {};
  components.pto = ptoDays * dailyRate;
  components.parental_leave = parentalWeeks * 5 * dailyRate;
  components.retirement_match = averageBase * Math.min(matchPercent / 100, 0.06);
  components.bonus = averageBase * (bonusPercent / 100);
  components.healthcare = latest.healthcare?.medical?.present ? 9000 : 6000;
  components.equity = latest.compensation?.equity?.present ? averageBase * 0.1 : 0;
  components.flexibility = wfaWeeks * 5 * dailyRate;

  const total_estimated_value = Object.values(components).reduce((acc, value) => acc + value, 0);

  return {
    estimated_base: averageBase,
    assumptions: {
      default_base: 120000,
      work_days_per_year: 260,
      healthcare_range: { low: 6000, high: 15000 },
    },
    components,
    total_estimated_value,
  };
}

function computeStats(parsedSnapshots: any[]): ComputedStats {
  const sorted = [...parsedSnapshots].sort((a, b) => (b?._extractedAt || 0) - (a?._extractedAt || 0));
  const highlights = computeHighlights(sorted);
  const coverage = computeCoverage(sorted);
  const total_comp_heuristics = computeTotals(sorted);
  return { highlights, coverage, total_comp_heuristics };
}

export async function benefitsStatsRollup(env: StatsEnv, options: RollupOptions = {}): Promise<{ processed: number }> {
  const months = options.months ?? 6;
  const cutoff = Date.now() - months * 30 * 24 * 60 * 60 * 1000;
  const params: any[] = [];
  let companyQuery = 'SELECT id FROM companies';
  if (options.companyId) {
    companyQuery += ' WHERE id = ?';
    params.push(options.companyId);
  }

  const companiesResult = await env.DB.prepare(companyQuery).bind(...params).all();
  const companies = (companiesResult.results || []) as { id: string }[];
  let processed = 0;

  for (const row of companies) {
    const snapshotsResult = await env.DB.prepare(
      `SELECT parsed, extracted_at, source
       FROM company_benefits_snapshots
       WHERE company_id = ? AND extracted_at >= ?
       ORDER BY extracted_at DESC`
    )
      .bind(row.id, cutoff)
      .all();

    const snapshotsRaw = (snapshotsResult.results || []) as SnapshotRow[];
    if (!snapshotsRaw.length) {
      continue;
    }

    const parsedSnapshots = snapshotsRaw
      .map((snapshot) => {
        const parsed = parseSnapshot(snapshot as SnapshotRow);
        if (parsed) {
          parsed._extractedAt = (snapshot as SnapshotRow).extracted_at;
        }
        return parsed;
      })
      .filter(Boolean);

    if (!parsedSnapshots.length) {
      continue;
    }

    const stats = computeStats(parsedSnapshots as any[]);
    processed += 1;

    if (options.dryRun) {
      console.log('[DRY_RUN] Would store benefits stats for company', row.id, stats);
      continue;
    }

    await env.DB.prepare(
      `INSERT INTO benefits_stats (company_id, computed_at, highlights, total_comp_heuristics, coverage)
       VALUES (?, ?, ?, ?, ?)`
    )
      .bind(
        row.id,
        Date.now(),
        JSON.stringify(stats.highlights),
        JSON.stringify(stats.total_comp_heuristics),
        JSON.stringify(stats.coverage),
      )
      .run();
  }

  return { processed };
}

export async function getLatestStatsForCompany(env: StatsEnv, companyId: string): Promise<any | null> {
  const result = await env.DB.prepare(
    `SELECT highlights, total_comp_heuristics, coverage, computed_at
     FROM benefits_stats
     WHERE company_id = ?
     ORDER BY computed_at DESC
     LIMIT 1`
  ).bind(companyId).first();

  if (!result) {
    return null;
  }

  return {
    computed_at: result.computed_at,
    highlights: result.highlights ? JSON.parse(result.highlights) : null,
    total_comp_heuristics: result.total_comp_heuristics ? JSON.parse(result.total_comp_heuristics) : null,
    coverage: result.coverage ? JSON.parse(result.coverage) : null,
  };
}

export async function getTopHighlights(env: StatsEnv, limit = 10): Promise<any[]> {
  const result = await env.DB.prepare(
    `SELECT company_id, highlights, computed_at
     FROM benefits_stats
     ORDER BY computed_at DESC
     LIMIT ?`
  ).bind(limit).all();

  return (result.results || []).map((row: any) => ({
    company_id: row.company_id,
    computed_at: row.computed_at,
    highlights: row.highlights ? JSON.parse(row.highlights) : null,
  }));
}

export async function getValuations(env: StatsEnv, limit = 25): Promise<any[]> {
  const result = await env.DB.prepare(
    `SELECT company_id, total_comp_heuristics, computed_at
     FROM benefits_stats
     ORDER BY computed_at DESC
     LIMIT ?`
  ).bind(limit).all();

  return (result.results || []).map((row: any) => ({
    company_id: row.company_id,
    computed_at: row.computed_at,
    total_comp_heuristics: row.total_comp_heuristics ? JSON.parse(row.total_comp_heuristics) : null,
  }));
}
