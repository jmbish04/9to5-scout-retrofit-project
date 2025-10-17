import { textFromHTML } from './normalize';

export interface ExtractedBenefit {
  name: string;
  details?: string;
}

export interface ExtractBenefitsOptions {
  enableLLM?: boolean;
  llmClient?: {
    complete: (prompt: string) => Promise<string>;
  };
  llmModel?: string;
}

export interface ExtractBenefitsResult {
  snapshotText: string;
  parsed: Record<string, any>;
}

const SECTION_HEADINGS = [
  'benefits',
  'perks',
  'what we offer',
  'why you will love working here',
  'compensation & benefits',
  'total rewards',
  'why you\'ll love working here',
];

function normalizeText(input: string): string {
  if (!input) {
    return '';
  }

  return input
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n');
}

function extractSections(text: string): string {
  const lines = text.split('\n');
  const result: string[] = [];
  let capturing = false;
  let buffer: string[] = [];

  for (const line of lines) {
    const normalized = line.toLowerCase();
    const headingMatch = SECTION_HEADINGS.some((heading) => normalized.includes(heading));

    if (headingMatch) {
      if (buffer.length > 0) {
        result.push(buffer.join('\n'));
        buffer = [];
      }
      capturing = true;
    }

    if (capturing) {
      buffer.push(line);
    }
  }

  if (buffer.length > 0) {
    result.push(buffer.join('\n'));
  }

  return result.length > 0 ? result.join('\n') : text;
}

function detectBoolean(text: string, keywords: string[]): boolean {
  const haystack = text.toLowerCase();
  return keywords.some((keyword) => haystack.includes(keyword));
}

function parsePercentage(text: string, pattern: RegExp): number | null {
  const match = pattern.exec(text);
  if (!match) {
    return null;
  }
  const candidate = match[2] ?? match[1];
  if (!candidate) {
    return null;
  }
  const value = parseFloat(candidate);
  return Number.isFinite(value) ? value : null;
}

function parseCurrencyRange(text: string): { min: number | null; max: number | null; currency: string } | null {
  const rangePattern = /(\$|usd|eur|gbp|cad)?\s*([\d,.]+)\s*(?:-|to|through)\s*(\$|usd|eur|gbp|cad)?\s*([\d,.]+)/i;
  const singlePattern = /(\$|usd|eur|gbp|cad)\s*([\d,.]+)/i;

  const rangeMatch = text.match(rangePattern);
  if (rangeMatch) {
    const [, leftSymbol, leftValueRaw, rightSymbol, rightValueRaw] = rangeMatch;
    const currency = (leftSymbol || rightSymbol || 'USD').toUpperCase().replace(/[^A-Z]/g, '');
    const min = leftValueRaw ? parseFloat(leftValueRaw.replace(/,/g, '')) : NaN;
    const max = rightValueRaw ? parseFloat(rightValueRaw.replace(/,/g, '')) : NaN;
    return {
      min: Number.isFinite(min) ? min : null,
      max: Number.isFinite(max) ? max : null,
      currency,
    };
  }

  const singleMatch = text.match(singlePattern);
  if (singleMatch) {
    const [, symbol, valueRaw] = singleMatch;
    const currency = (symbol || 'USD').toUpperCase().replace(/[^A-Z]/g, '');
    const value = valueRaw ? parseFloat(valueRaw.replace(/,/g, '')) : NaN;
    return {
      min: Number.isFinite(value) ? value : null,
      max: Number.isFinite(value) ? value : null,
      currency,
    };
  }

  return null;
}

function extractNumbers(text: string, pattern: RegExp): number | null {
  const match = text.match(pattern);
  if (!match) {
    return null;
  }
  const raw = match[1] || match[0];
  const value = parseFloat(raw.replace(/,/g, ''));
  return Number.isFinite(value) ? value : null;
}

function extractPerks(text: string): ExtractedBenefit[] {
  const lines = text.split('\n');
  const perks: ExtractedBenefit[] = [];

  for (const line of lines) {
    const normalized = line.toLowerCase();
    if (normalized.startsWith('•') || normalized.startsWith('-') || normalized.startsWith('*')) {
      const clean = line.replace(/^[-•*]\s*/, '').trim();
      if (clean.length > 0) {
        perks.push({ name: clean.toLowerCase(), details: clean });
      }
    }
  }

  return perks.slice(0, 20);
}

function initializeParsed(): Record<string, any> {
  return {
    compensation: {
      base_range: { min: null, max: null, currency: 'USD', period: 'year' },
      bonus: { target_percent: null, notes: '' },
      equity: { present: false, type: null, notes: '' },
    },
    retirement: {
      plan: null,
      match_percent: null,
      vesting: null,
    },
    healthcare: {
      medical: { carrier: null, ppo: false, epo: false, present: false, notes: '' },
      dental: { present: false, notes: '' },
      vision: { present: false, notes: '' },
    },
    time_off: {
      pto_days: null,
      sick_days: null,
      holidays: null,
      parental_leave_weeks: null,
      sabbatical: null,
    },
    work_model: {
      type: null,
      office_days_per_week: null,
      work_from_anywhere_weeks: null,
    },
    perks: [] as ExtractedBenefit[],
    location: { hq: null, offices: [] as string[] },
    notes: '',
  };
}

function enrichParsed(parsed: Record<string, any>, text: string): void {
  const lower = text.toLowerCase();

  const baseRange = parseCurrencyRange(text);
  if (baseRange) {
    parsed.compensation.base_range = {
      min: baseRange.min,
      max: baseRange.max,
      currency: baseRange.currency || 'USD',
      period: 'year',
    };
  }

  const bonusPercent = parsePercentage(text, /(bonus|annual bonus)[^\d]{0,20}(\d{1,2}(?:\.\d+)?)\s?%/i);
  if (bonusPercent) {
    parsed.compensation.bonus.target_percent = bonusPercent;
  }

  if (detectBoolean(lower, ['equity', 'stock', 'rsu', 'stock option'])) {
    parsed.compensation.equity.present = true;
    parsed.compensation.equity.type = lower.includes('rsu') ? 'RSU' : 'Options';
  }

  if (lower.includes('401k') || lower.includes('401(k)')) {
    parsed.retirement.plan = '401k';
    const matchPercent = parsePercentage(text, /(401k|401\(k\)).{0,40}?(\d{1,2}(?:\.\d+)?)\s?%/i);
    if (matchPercent) {
      parsed.retirement.match_percent = matchPercent;
    }
  }

  const medicalPresence = detectBoolean(lower, ['health insurance', 'medical', 'ppo', 'hmo']);
  if (medicalPresence) {
    parsed.healthcare.medical.present = true;
  }
  parsed.healthcare.medical.ppo = lower.includes('ppo');
  parsed.healthcare.medical.epo = lower.includes('epo');

  if (detectBoolean(lower, ['dental'])) {
    parsed.healthcare.dental.present = true;
  }

  if (detectBoolean(lower, ['vision'])) {
    parsed.healthcare.vision.present = true;
  }

  const ptoDays = extractNumbers(text, /(\d{1,2})\s*(?:days? of )?(?:pto|paid time off|vacation)/i);
  if (ptoDays) {
    parsed.time_off.pto_days = ptoDays;
  }

  const sickDays = extractNumbers(text, /(\d{1,2})\s*(?:sick|illness)\s*days?/i);
  if (sickDays) {
    parsed.time_off.sick_days = sickDays;
  }

  const holidays = extractNumbers(text, /(\d{1,2})\s*(?:paid )?holidays?/i);
  if (holidays) {
    parsed.time_off.holidays = holidays;
  }

  const parental = extractNumbers(text, /(\d{1,2})\s*(?:weeks?|wks?)\s*(?:paid )?(?:parental|maternity|paternity) leave/i);
  if (parental) {
    parsed.time_off.parental_leave_weeks = parental;
  }

  const sabbatical = extractNumbers(text, /(\d{1,2})\s*(?:week|month)s?\s*(?:paid )?sabbatical/i);
  if (sabbatical) {
    parsed.time_off.sabbatical = sabbatical;
  }

  if (detectBoolean(lower, ['remote', 'hybrid', 'onsite', 'on-site'])) {
    if (lower.includes('remote')) {
      parsed.work_model.type = 'remote';
    } else if (lower.includes('hybrid')) {
      parsed.work_model.type = 'hybrid';
    } else {
      parsed.work_model.type = 'onsite';
    }
  }

  const officeDays = extractNumbers(text, /(\d)\s*(?:days?)\s*(?:in the office|onsite)/i);
  if (officeDays) {
    parsed.work_model.office_days_per_week = officeDays;
  }

  const wfaWeeks = extractNumbers(text, /(\d{1,2})\s*(?:weeks?)\s*(?:work from anywhere|wfa)/i);
  if (wfaWeeks) {
    parsed.work_model.work_from_anywhere_weeks = wfaWeeks;
  }

  const perks = extractPerks(text);
  if (perks.length > 0) {
    parsed.perks = perks;
  }
}

async function maybeUseLLM(text: string, options: ExtractBenefitsOptions): Promise<Record<string, any> | null> {
  if (!options.enableLLM || !options.llmClient) {
    return null;
  }

  const prompt = `You are an expert at extracting company benefits.\n\nText:\n${text}\n\nReturn a JSON object matching the schema with keys: compensation, retirement, healthcare, time_off, work_model, perks (array of {name, details}), location, notes.`;

  try {
    const result = await options.llmClient.complete(prompt);
    const parsed = JSON.parse(result);
    return parsed;
  } catch (error) {
    console.warn('LLM extraction failed, falling back to heuristics:', error);
    return null;
  }
}

export async function extractBenefits(rawInput: string, options: ExtractBenefitsOptions = {}): Promise<ExtractBenefitsResult> {
  const normalizedText = normalizeText(textFromHTML(rawInput) || rawInput || '');
  const focusedText = extractSections(normalizedText);

  let parsed = initializeParsed();
  enrichParsed(parsed, focusedText);

  if (options.enableLLM) {
    const llmParsed = await maybeUseLLM(focusedText, options);
    if (llmParsed && typeof llmParsed === 'object') {
      parsed = { ...parsed, ...llmParsed };
    }
  }

  return {
    snapshotText: focusedText,
    parsed,
  };
}
