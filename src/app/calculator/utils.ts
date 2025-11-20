/**
 * Utility functions for the Real Estate Calculator
 * Contains all calculation logic, constants, and helper functions
 */

// Constants from original calculator
export const MAPS = {
  lesiMid: {
    very_stable: 90,
    stable: 72,
    mixed: 58,
    unstable: 43,
    high_risk: 28,
  },
  bdiMid: {
    hot: 90,
    strong: 74,
    balanced: 60,
    soft: 45,
    very_soft: 30,
  },
  lesiCert: {
    very_stable: 0.01,
    stable: 0.02,
    mixed: 0.04,
    unstable: 0.06,
    high_risk: 0.08,
  },
  bdiAdj: {
    hot: -0.015,
    strong: -0.008,
    balanced: 0.0,
    soft: 0.008,
    very_soft: 0.015,
  },
  rciCost: {
    low: 1.0,
    medium: 1.05,
    high: 1.15,
  },
  rciTime: {
    low: 0.95,
    medium: 1.0,
    high: 1.25,
  },
  rfiCostBps: {
    low: 0.0,
    medium: 0.0035,
    high: 0.008,
  },
  rfiDays: {
    low: 0,
    medium: 4,
    high: 10,
  },
};

export const BANDS = {
  conservative: {
    rvi: 0.88,
    repairs: 1.12,
    carry: 1.12,
    cash: +0.015,
    svc: +0.008,
    svcClamp: [0.03, 0.08],
    prox: 0.95,
  },
  likely: {
    rvi: 1.0,
    repairs: 1.0,
    carry: 1.0,
    cash: +0.0,
    svc: +0.0,
    svcClamp: [0.02, 0.05],
    prox: 0.97,
  },
  stretch: {
    rvi: 1.08,
    repairs: 0.92,
    carry: 0.92,
    cash: -0.01,
    svc: -0.006,
    svcClamp: [0.015, 0.04],
    prox: 0.98,
  },
};

export const COSTS = {
  roof: { ok: 0, aging: 3.5, end: 7.5, leak: 10.5 },
  hvac: { ok: 0, old: 5500, fail: 8500 },
  elec: { modern: 0, old: 3500, fuse: 500 },
  plumb: { pex_copper: 0, galv_mix: 4500, cast_fail: 12000 },
  found: { sound: 0, settle: 6500, struct: 22000 },
  bsmnt: { dry: 0, damp: 2500, flood: 9000, mold: 14000 },
  windows: { ok: 0, mix: 250 * 6, replace: 650 * 12 },
  ext: { ok: 0, paint: 5500, major: 16500 },
  kitchen: { serviceable: 0, dated: 8500, gut: 18500 },
  bathUnit: { one: 6000, each: 5000 },
  flooring: { ok: 0, patch: 3.5, full: 6.5 },
  hazards: { none: 0, asbestos: 7500, meth: 18500 },
};

export const FRICTION_DOLLAR_PENALTIES = {
  hoa: { no: 0, yes: 0 },
  occ: { owner: 0, tenant: 1500, vacant: 500, squat: 7000 },
  title: { clean: 0, liens: 2000, probate: 2000, foreclosure: 3000 },
  access: { easy: -500, limited: 1000, blocked: 10000 },
};

export const FRICTION = {
  hoa: { no: 0, yes: 0.003 },
  occ: { owner: 0, tenant: 0.004, vacant: 0.002, squat: 0.018 },
  title: { clean: 0, liens: 0.006, probate: 0.012, foreclosure: 0.01 },
  access: { easy: 0, limited: 0.004, blocked: 0.012 },
};

export const TIMELINE_URGENCY = {
  normal: { cash_disc: 0.0, svc_rate: 0.0, carry_mult: 1.0, days_mult: 1.0 },
  fast: { cash_disc: -0.018, svc_rate: -0.008, carry_mult: 0.85, days_mult: 0.7 },
  rush: { cash_disc: -0.035, svc_rate: -0.015, carry_mult: 0.6, days_mult: 0.5 },
};

// Helper functions
export function num(v: any, d: number = 0): number {
  if (v === undefined || v === null) return d;
  const str = String(v).replace(/[^0-9.\-]/g, '');
  if ((str.match(/\./g) || []).length > 1) {
    return d;
  }
  const f = parseFloat(str);
  return Number.isFinite(f) ? f : d;
}

export function clamp(x: number, a: number, b: number): number {
  return Math.min(Math.max(x, a), b);
}

export function norm(x: number, lo: number, hi: number): number {
  return clamp((x - lo) / (hi - lo), 0, 1);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function money(n: number): string {
  const v = Number.isFinite(n) ? n : 0;
  try {
    return v.toLocaleString(undefined, {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    });
  } catch (e) {
    return '$' + Math.round(v).toLocaleString();
  }
}

export function money2(n: number): string {
  const v = Number.isFinite(n) ? n : 0;
  try {
    return v.toLocaleString(undefined, {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
    });
  } catch (e) {
    return '$' + (Math.round(v * 100) / 100).toLocaleString();
  }
}

export function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function parseZipFromAddress(addr: string): string {
  if (!addr) return '';
  const m = String(addr).match(/\b\d{5}(?:-\d{4})?\b/);
  return m ? m[0] : '';
}

export function parseStateFromAddress(addr: string): string {
  if (!addr) return '';
  const m = addr.match(/,\s*([A-Z]{2})\s+\d{5}/i) || addr.match(/\s([A-Z]{2})\s*\d{5}/i);
  return m ? m[1].toUpperCase() : '';
}

export function zipBuckets(zip: string) {
  const pure = (zip || '').trim();
  const z5 = pure.split('-')[0] || pure;
  const h = hash(z5);
  const fd = parseInt((z5[0] || '5'), 10);
  
  const lesi = (h % 100 >= 80) ? 'very_stable' :
               (h % 100 >= 65) ? 'stable' :
               (h % 100 >= 50) ? 'mixed' :
               (h % 100 >= 35) ? 'unstable' : 'high_risk';
  
  const series: number[] = [];
  let base = 50 + (h % 40) - 10;
  let trend = ((h >> 3) % 7) - 3;
  for (let i = 0; i < 6; i++) {
    series.push(clamp(base + i * trend + ((h >> i) % 6 - 3), 20, 95));
  }
  
  const last = series[series.length - 1];
  const bdi = (last >= 80) ? 'hot' :
              (last >= 65) ? 'strong' :
              (last >= 50) ? 'balanced' :
              (last >= 35) ? 'soft' : 'very_soft';
  
  const rci = (fd <= 2) ? 'low' : (fd <= 6) ? 'medium' : 'high';
  const rfi = (fd === 0 || fd === 1) ? 'high' : (fd <= 4) ? 'medium' : 'low';
  const baseDays = (bdi === 'hot') ? 30 :
                   (bdi === 'strong') ? 40 :
                   (bdi === 'balanced') ? 55 :
                   (bdi === 'soft') ? 70 : 85;
  
  return { lesi, bdi, series, rci, rfi, baseDays };
}

export function addressHeuristics(addr: string) {
  const a = (addr || '').toLowerCase();
  const noise = /\b(hwy|highway|freeway|exp(ress)?way|i-\d+|us-\d+|state\s+route|ave\s+of\s+the\s+americas)\b/.test(a) ? 0.006 : 0;
  const rail = /\b(rail|train|tracks)\b/.test(a) ? 0.004 : 0;
  const ind = /\b(industrial|plant|warehouse|refinery)\b/.test(a) ? 0.005 : 0;
  return { noise, rail, ind };
}

export function normalizeRisk(score01: number | null | undefined): number {
  if (score01 === null || score01 === undefined || isNaN(score01)) return 50;
  return Math.round(clamp(score01, 0, 1) * 100);
}

export function signalsAdjustments(sig: any) {
  if (!sig) {
    return {
      cash: 0,
      svc: 0,
      carry: 1,
      crimeScore: 50,
      schoolScore: 50,
      vibeScore: 50,
      notes: ['No external signals applied.'],
    };
  }

  const getRisk = (val: any) => (val == null || isNaN(val)) ? 0.5 : clamp(Number(val), 0, 1);

  const crimeRaw = getRisk(sig.crimeIndex);
  const schoolRaw = getRisk(sig.schoolIndex);
  const floodRaw = getRisk(sig.floodRisk);
  const wildfireRaw = getRisk(sig.wildfireRisk);
  const reviewDeltaRisk = getRisk(sig.reviewDelta);

  const crimeScore = normalizeRisk(clamp(0.50 * crimeRaw + 0.30 * floodRaw + 0.20 * wildfireRaw, 0, 1));
  const schoolScore = normalizeRisk(schoolRaw);
  const vibeScore = normalizeRisk(reviewDeltaRisk);

  const notes: string[] = [];
  let cashAdj = 0;
  let svcAdj = 0;
  let carryMult = 1;

  if (crimeScore !== null) {
    const crimeNorm = crimeScore / 100;
    cashAdj += (0.016 * crimeNorm);
    svcAdj += (0.005 * crimeNorm);
    carryMult += (0.12 * crimeNorm);
    notes.push(`Crime/Safety ${crimeScore}`);

    if (crimeScore >= 65) {
      let penalty = 2000;
      if (crimeScore > 75) penalty += 1000;
      if (crimeScore > 85) penalty += 1000;
      if (crimeScore > 95) penalty += 1000;
      cashAdj += penalty / 100000;
      notes.push(`Crime Penalty +$${penalty}`);
    } else if (crimeScore < 20) {
      cashAdj -= (500 / 100000);
      notes.push(`Crime Bonus +$500`);
    }
  }

  if (schoolScore !== null) {
    const schoolNorm = schoolScore / 100;
    cashAdj += (0.01 * schoolNorm);
    svcAdj += (0.003 * schoolNorm);
    notes.push(`School/Socio ${schoolScore}`);
  }

  if (vibeScore !== null) {
    const vibeNorm = vibeScore / 100;
    svcAdj += (0.007 * vibeNorm);
    carryMult += (0.06 * vibeNorm);
    notes.push(`Local Vibe ${vibeScore}`);
  }

  const fullNote = notes.length ? `Hyperlocal: ${notes.join(' • ')}` : 'No external signals applied.';

  let cashCrime = 0, cashSchool = 0, cashVibe = 0;

  if (crimeScore !== null) {
    const crimeNorm = crimeScore / 100;
    const adjCash = 0.016 * crimeNorm;
    cashCrime += adjCash;
    if (crimeScore >= 65) {
      let penalty = 2000;
      if (crimeScore > 75) penalty += 1000;
      if (crimeScore > 85) penalty += 1000;
      if (crimeScore > 95) penalty += 1000;
      const penBps = penalty / 100000;
      cashCrime += penBps;
    } else if (crimeScore < 20) {
      const bonus = 500 / 100000;
      cashCrime -= bonus;
    }
  }

  if (schoolScore !== null) {
    const schoolNorm = schoolScore / 100;
    const adjCash = 0.010 * schoolNorm;
    cashSchool += adjCash;
  }

  return {
    cash: cashAdj,
    svc: svcAdj,
    carry: carryMult,
    notes: [fullNote],
    crimeScore,
    schoolScore,
    vibeScore,
    detail: {
      cashCrime,
      cashSchool,
      cashVibe: 0, // vibe mostly affects service & carry
    },
  };
}

