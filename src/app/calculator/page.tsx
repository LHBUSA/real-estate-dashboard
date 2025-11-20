'use client';

/**
 * Instant Home Offer Calculator v11.4
 * Complete implementation with all features from the original HTML calculator
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  num,
  clamp,
  norm,
  lerp,
  money,
  money2,
  hash,
  parseZipFromAddress,
  parseStateFromAddress,
  zipBuckets,
  addressHeuristics,
  normalizeRisk,
  signalsAdjustments,
  MAPS,
  BANDS,
  COSTS,
  FRICTION_DOLLAR_PENALTIES,
  FRICTION,
  TIMELINE_URGENCY,
} from './utils';
import DealSidebar from './components/DealSidebar';
import LOIOverlay from './components/LOIOverlay';
import CompsModule from './components/CompsModule';

const VERSION = '11.4';
const STORE_KEY = 'zipin_v110_internal';
const STORE_KEY_DEALS = 'zipin_deal_memory_v110';

interface FormData {
  address: string;
  zip: string;
  type: string;
  year: string;
  beds: string;
  baths: string;
  sqft: string;
  asIs: string;
  // Condition matrix
  roof: string;
  ext: string;
  found: string;
  bsmnt: string;
  hvac: string;
  elec: string;
  plumb: string;
  windows: string;
  kitchen: string;
  baths_count: string;
  flooring: string;
  hazards: string;
  // Friction
  hoa: string;
  occ: string;
  title: string;
  access: string;
  // Strategy
  timeline: string;
  // Assumptions
  split: string;
  svcBase: string;
  cashBase: string;
  carryDay: string;
}

export default function CalculatorPage() {
  const [formData, setFormData] = useState<FormData>({
    address: '',
    zip: '',
    type: 'sf',
    year: '',
    beds: '',
    baths: '',
    sqft: '',
    asIs: '',
    roof: 'ok',
    ext: 'ok',
    found: 'sound',
    bsmnt: 'dry',
    hvac: 'ok',
    elec: 'modern',
    plumb: 'pex_copper',
    windows: 'ok',
    kitchen: 'serviceable',
    baths_count: '0',
    flooring: 'ok',
    hazards: 'none',
    hoa: 'no',
    occ: 'owner',
    title: 'clean',
    access: 'easy',
    timeline: 'normal',
    split: '0.5',
    svcBase: '0.032',
    cashBase: '0.10',
    carryDay: '0.00026',
  });

  const [band, setBand] = useState<'conservative' | 'likely' | 'stretch'>('likely');
  const [results, setResults] = useState<any>(null);
  const [signals, setSignals] = useState<any>(null);
  const [showAssumptions, setShowAssumptions] = useState(false);
  const [dealSidebarOpen, setDealSidebarOpen] = useState(false);
  const [deals, setDeals] = useState<any[]>([]);
  const [showLOI, setShowLOI] = useState(false);
  const [lastRun, setLastRun] = useState<any>(null);
  const [compsStats, setCompsStats] = useState<any>(null);

  // Load saved data on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (data) {
          // Restore form data
          Object.keys(data).forEach((key) => {
            if (key in formData) {
              setFormData((prev) => ({ ...prev, [key]: data[key] }));
            }
          });
          if (data.band) setBand(data.band);
        }
      }
    } catch (e) {
      // Ignore
    }
  }, []);

  // Load deals
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORE_KEY_DEALS);
      if (saved) {
        setDeals(JSON.parse(saved));
      }
    } catch (e) {
      // Ignore
    }
  }, []);

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const applyPreset = (preset: 'turnkey' | 'dated' | 'heavy' | 'rough') => {
    const presets = {
      turnkey: {
        roof: 'ok',
        hvac: 'ok',
        elec: 'modern',
        plumb: 'pex_copper',
        found: 'sound',
        bsmnt: 'dry',
        windows: 'ok',
        ext: 'ok',
        kitchen: 'serviceable',
        baths_count: '0',
        flooring: 'ok',
        hazards: 'none',
        hoa: 'no',
        occ: 'owner',
        title: 'clean',
        access: 'easy',
      },
      dated: {
        roof: 'aging',
        hvac: 'old',
        elec: 'old',
        plumb: 'galv_mix',
        found: 'sound',
        bsmnt: 'damp',
        windows: 'mix',
        ext: 'paint',
        kitchen: 'dated',
        baths_count: '1',
        flooring: 'patch',
        hazards: 'none',
        hoa: 'no',
        occ: 'owner',
        title: 'clean',
        access: 'easy',
      },
      heavy: {
        roof: 'end',
        hvac: 'old',
        elec: 'old',
        plumb: 'cast_fail',
        found: 'settle',
        bsmnt: 'flood',
        windows: 'replace',
        ext: 'major',
        kitchen: 'gut',
        baths_count: '2',
        flooring: 'full',
        hazards: 'asbestos',
        hoa: 'no',
        occ: 'vacant',
        title: 'liens',
        access: 'limited',
      },
      rough: {
        roof: 'leak',
        hvac: 'fail',
        elec: 'fuse',
        plumb: 'cast_fail',
        found: 'struct',
        bsmnt: 'mold',
        windows: 'replace',
        ext: 'major',
        kitchen: 'gut',
        baths_count: '3',
        flooring: 'full',
        hazards: 'meth',
        hoa: 'no',
        occ: 'squat',
        title: 'foreclosure',
        access: 'blocked',
      },
    };

    const presetData = presets[preset];
    if (presetData) {
      setFormData((prev) => ({ ...prev, ...presetData }));
      setTimeout(() => {
        if (formData.zip) calculate();
      }, 100);
    }
  };

  const calculate = useCallback(() => {
    try {
      // Gather and validate inputs
      const addr = formData.address.trim();
      let zip = formData.zip.trim();
      if (!zip) {
        zip = parseZipFromAddress(addr);
        if (zip) handleInputChange('zip', zip);
      }
      if (!/^\d{5}(-\d{4})?$/.test(zip)) {
        alert('Enter a valid ZIP (5-digit or ZIP+4). Type the full address to auto-fill ZIP.');
        return;
      }

      const type = formData.type || 'sf';
      const year = clamp(Math.round(num(formData.year || '1995')), 1900, 2025);
      const beds = clamp(Math.round(num(formData.beds || '3')), 0, 20);
      const baths = num(formData.baths || '2');
      const sqft = clamp(Math.round(num(formData.sqft || '1600')), 200, 20000);

      let asIs = num(formData.asIs);
      if (!asIs || asIs <= 0) {
        alert('Please enter As-Is or compute comps to fill it.');
        return;
      }

      // Get ZIP-based market data
      const z = zipBuckets(zip);
      const lesi = z.lesi as keyof typeof MAPS.lesiMid;
      const bdi = z.bdi as keyof typeof MAPS.bdiMid;
      const rci = z.rci as 'low' | 'medium' | 'high';
      const rfi = z.rfi as 'low' | 'medium' | 'high';
      const baseDays = z.baseDays;

      // Address heuristics
      const ah = addressHeuristics(addr);
      const sigAdj = signalsAdjustments(signals);

      // Urgency
      const urgency = TIMELINE_URGENCY[formData.timeline as keyof typeof TIMELINE_URGENCY] || TIMELINE_URGENCY.normal;

      // Age and size normalization
      const age = clamp(2025 - year, 0, 120);
      const sizeN = norm(sqft, 800, 3200);
      const ageN = norm(age, 10, 90);

      // Calculate repair costs
      const bathCt = formData.baths_count === '3+' ? 3 : Number(formData.baths_count || 0);
      const winAdjCt = sqft < 1200 ? 8 : sqft < 2200 ? 12 : 16;

      const roofCost = type === 'condo' ? 0 : (COSTS.roof[formData.roof as keyof typeof COSTS.roof] || 0) * sqft * 0.01;
      const hvacCost = (COSTS.hvac[formData.hvac as keyof typeof COSTS.hvac] || 0) * (type === '2to4' ? 2 : 1);
      const elecCost = COSTS.elec[formData.elec as keyof typeof COSTS.elec] || 0;
      const plumCost = COSTS.plumb[formData.plumb as keyof typeof COSTS.plumb] || 0;
      const foundCost = COSTS.found[formData.found as keyof typeof COSTS.found] || 0;
      const bsmCost = COSTS.bsmnt[formData.bsmnt as keyof typeof COSTS.bsmnt] || 0;
      const windCost = type === 'condo' ? 0 : (formData.windows === 'mix' ? 250 * winAdjCt / 2 : formData.windows === 'replace' ? 650 * winAdjCt : 0);
      const extCost = COSTS.ext[formData.ext as keyof typeof COSTS.ext] || 0;
      const kitCost = COSTS.kitchen[formData.kitchen as keyof typeof COSTS.kitchen] || 0;
      const bathCost = bathCt === 0 ? 0 : (COSTS.bathUnit.one + Math.max(0, bathCt - 1) * COSTS.bathUnit.each);
      const floorCost = (COSTS.flooring[formData.flooring as keyof typeof COSTS.flooring] || 0) * sqft * 0.01;
      const hazCost = COSTS.hazards[formData.hazards as keyof typeof COSTS.hazards] || 0;

      // Fixed deductions
      const fixedDeductions: Record<string, number> = {};
      if (formData.hvac === 'fail') fixedDeductions.hvac = 5000;
      if (formData.roof === 'leak') fixedDeductions.roof = 3000;
      if (formData.found === 'struct') fixedDeductions.found = 15000;
      if (formData.ext === 'major') fixedDeductions.ext = 5000;
      if (formData.kitchen === 'gut') fixedDeductions.kitchen = 2000;

      let repairs = roofCost + hvacCost + elecCost + plumCost + foundCost + bsmCost + windCost + extCost + kitCost + bathCost + floorCost + hazCost;
      repairs += Object.values(fixedDeductions).reduce((a: number, b: number) => a + b, 0);

      // Friction penalties
      const fricPenaltyDollars = {
        occ: FRICTION_DOLLAR_PENALTIES.occ[formData.occ as keyof typeof FRICTION_DOLLAR_PENALTIES.occ] || 0,
        title: FRICTION_DOLLAR_PENALTIES.title[formData.title as keyof typeof FRICTION_DOLLAR_PENALTIES.title] || 0,
        access: FRICTION_DOLLAR_PENALTIES.access[formData.access as keyof typeof FRICTION_DOLLAR_PENALTIES.access] || 0,
      };
      const totalFrictionPenalty = Object.values(fricPenaltyDollars).reduce((a, b) => a + b, 0);

      // Cosmetic and heavy weights
      const cosmeticWeight = (formData.kitchen === 'serviceable' ? 0.2 : formData.kitchen === 'dated' ? 0.5 : 0.8) +
        (formData.flooring === 'ok' ? 0.1 : formData.flooring === 'patch' ? 0.4 : 0.7);
      const heavyWeight = (formData.roof === 'end' || formData.roof === 'leak' ? 0.5 : 0) +
        (formData.found === 'struct' ? 0.8 : formData.found === 'settle' ? 0.3 : 0) +
        (formData.elec === 'fuse' ? 0.4 : 0) +
        (formData.plumb === 'cast_fail' ? 0.3 : 0);

      // RVI gain
      const baseUpliftPct = lerp(0.06, 0.18, clamp(cosmeticWeight * 0.6 + heavyWeight * 0.4, 0, 1));
      let rviGain = asIs * baseUpliftPct * (type === '2to4' ? 1.12 : type === 'condo' ? 0.85 : 1.0) * lerp(0.95, 1.1, sizeN) * lerp(0.9, 1.12, 1 - ageN);
      rviGain *= BANDS[band].rvi;

      // Days calculation
      const baseDaysRaw = baseDays * MAPS.rciTime[rci] + MAPS.rfiDays[rfi];
      let daysFactor = 1 +
        (formData.found === 'struct' ? 0.35 : formData.found === 'settle' ? 0.12 : 0) +
        (formData.bsmnt === 'mold' ? 0.25 : formData.bsmnt === 'flood' ? 0.18 : formData.bsmnt === 'damp' ? 0.08 : 0) +
        (formData.hazards !== 'none' ? 0.15 : 0) +
        (type === '2to4' ? 0.12 : type === 'condo' ? -0.06 : 0) +
        lerp(-0.03, 0.09, ageN) +
        lerp(-0.06, 0.1, sizeN);

      let days = baseDaysRaw * daysFactor * sigAdj.carry * urgency.carry_mult;
      days *= BANDS[band].carry;

      // Daily rate
      const dailyRate = num(formData.carryDay, 0.00026) * (lesi === 'very_stable' ? 0.8 : lesi === 'stable' ? 0.9 : lesi === 'mixed' ? 1.0 : lesi === 'unstable' ? 1.15 : 1.25);

      // Friction
      const fric = (FRICTION.hoa[formData.hoa as keyof typeof FRICTION.hoa] || 0) +
        (FRICTION.occ[formData.occ as keyof typeof FRICTION.occ] || 0) +
        (FRICTION.title[formData.title as keyof typeof FRICTION.title] || 0) +
        (FRICTION.access[formData.access as keyof typeof FRICTION.access] || 0);

      // Heavy penalty
      let heavyPenalty = 0;
      heavyPenalty += (formData.found === 'struct' ? 0.03 : formData.found === 'settle' ? 0.01 : 0);
      heavyPenalty += (formData.bsmnt === 'mold' ? 0.02 : formData.bsmnt === 'flood' ? 0.012 : 0);
      heavyPenalty += (formData.hazards === 'meth' ? 0.025 : formData.hazards === 'asbestos' ? 0.01 : 0);

      const addrPenalty = ah.noise + ah.rail + ah.ind;

      // Cash discount
      let cashDisc = num(formData.cashBase, 0.10) + MAPS.lesiCert[lesi] + MAPS.bdiAdj[bdi] + heavyPenalty + fric + addrPenalty + sigAdj.cash;
      cashDisc += urgency.cash_disc + BANDS[band].cash;
      cashDisc = clamp(cashDisc, 0.08, 0.45);

      // Service rate
      let svcRate = num(formData.svcBase, 0.032) + fric + (type === '2to4' ? 0.01 : type === 'condo' ? -0.006 : 0) + lerp(-0.004, 0.01, sizeN) + (age > 70 ? 0.01 : age < 20 ? -0.006 : 0) + addrPenalty + sigAdj.svc;
      if (formData.found === 'struct') svcRate += 0.01;
      svcRate += urgency.svc_rate + BANDS[band].svc;
      svcRate = clamp(svcRate, BANDS[band].svcClamp[0], Math.max(BANDS[band].svcClamp[1], 0.09));

      // Apply band to repairs
      repairs *= BANDS[band].repairs;

      // Final calculations
      const arv = asIs + rviGain;
      const closingFriction = MAPS.rfiCostBps[rfi] * arv + fric * arv;
      const carry = days * dailyRate * arv;
      const allIn = asIs + repairs + closingFriction + carry;
      const profit = Math.max(0, arv - allIn);

      const split = num(formData.split, 0.5);
      const novRaw = asIs + profit * split - totalFrictionPenalty;
      const cashNet = asIs * (1 - cashDisc) - totalFrictionPenalty;

      const anchor = asIs * (1 - svcRate);
      const floor = anchor * BANDS[band].prox;
      const novNet = clamp(novRaw, floor, anchor);

      const daysCash = Math.max(7, Math.round(baseDaysRaw * urgency.days_mult));
      const daysNov = Math.max(14, Math.round(days));

      const delta = novNet - cashNet;
      const deltaPct = cashNet > 0 ? (delta / cashNet * 100) : 0;

      // Certainty marker position
      let tilt = 50;
      if (Math.abs(deltaPct) < 1) {
        tilt = 50;
      } else if (delta >= 0) {
        tilt = 55 + Math.min(35, deltaPct / 3);
      } else {
        tilt = 45 - Math.min(35, Math.abs(deltaPct) / 3);
      }
      const tiltClamped = clamp(tilt, 8, 92);

      // Recommendation
      let reco, reason, recoKey;
      if (novNet > cashNet * 1.03) {
        reco = 'Partnership (Novation)';
        reason = 'Higher net after scope & friction management.';
        recoKey = 'partnership';
      } else if (cashNet >= novNet) {
        reco = 'Guaranteed Cash Offer';
        reason = 'Urgency/condition stack favors certainty over upside.';
        recoKey = 'cash';
      } else {
        reco = 'Close Call — Review Live';
        reason = 'Comparable nets; quick scope & comps can tilt either way.';
        recoKey = 'close';
      }

      const result = {
        cashNet,
        novNet,
        delta,
        deltaPct,
        daysCash,
        daysNov,
        tiltClamped,
        reco,
        reason,
        recoKey,
        arv,
        repairs,
        rviGain,
        cashDisc,
        svcRate,
        profit,
        allIn,
        closingFriction,
        carry,
        lesi,
        bdi,
        rci,
        rfi,
        sigAdj,
        ah,
      };

      setResults(result);

      // Create full run data
      const fullRun = {
        ...formData,
        band,
        ...result,
        version: VERSION,
        addr: formData.address,
        zip: formData.zip,
        asis: num(formData.asIs),
        signals: signals || null,
        addrFlags: ah,
      };
      setLastRun(fullRun);

      // Save to localStorage
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(fullRun));
      } catch (e) {
        // Ignore
      }

      // Save to Deal Memory
      saveDealToMemoryFromRun(fullRun);
    } catch (error: any) {
      alert(error.message || 'Calculation error');
    }
  }, [formData, band, signals]);

  const saveDealToMemoryFromRun = useCallback((run: any) => {
    if (!run) return;
    try {
      const key =
        ((run.addr || '').toLowerCase().trim() || 'zip:' + (run.zip || '')).slice(0, 160) +
        '|' +
        (run.zip || '');
      const deals = JSON.parse(localStorage.getItem(STORE_KEY_DEALS) || '[]');
      const idx = deals.findIndex((d: any) => d.key === key);
      const payload = {
        key,
        addr: run.addr || '',
        zip: run.zip || '',
        cashNet: run.cashNet || 0,
        novNet: run.novNet || 0,
        band: run.band || band,
        lesi: run.lesi || '',
        bdi: run.bdi || '',
        createdAt: Date.now(),
        data: run,
      };
      if (idx >= 0) deals.splice(idx, 1);
      deals.unshift(payload);
      while (deals.length > 20) deals.pop();
      localStorage.setItem(STORE_KEY_DEALS, JSON.stringify(deals));
    } catch (e) {
      // Ignore
    }
  }, [band]);

  const loadDealFromMemory = useCallback((deal: any) => {
    if (!deal || !deal.data) return;
    const data = deal.data;
    setFormData({
      address: data.address || data.addr || '',
      zip: data.zip || '',
      type: data.type || 'sf',
      year: data.year?.toString() || '',
      beds: data.beds?.toString() || '',
      baths: data.baths?.toString() || '',
      sqft: data.sqft?.toString() || '',
      asIs: data.asIs?.toString() || data.asis?.toString() || '',
      roof: data.roof || 'ok',
      ext: data.ext || 'ok',
      found: data.found || 'sound',
      bsmnt: data.bsmnt || 'dry',
      hvac: data.hvac || 'ok',
      elec: data.elec || 'modern',
      plumb: data.plumb || 'pex_copper',
      windows: data.windows || 'ok',
      kitchen: data.kitchen || 'serviceable',
      baths_count: data.baths_count?.toString() || '0',
      flooring: data.flooring || 'ok',
      hazards: data.hazards || 'none',
      hoa: data.hoa || 'no',
      occ: data.occ || 'owner',
      title: data.title || 'clean',
      access: data.access || 'easy',
      timeline: data.timeline || 'normal',
      split: data.split?.toString() || '0.5',
      svcBase: data.svcBase?.toString() || '0.032',
      cashBase: data.cashBase?.toString() || '0.10',
      carryDay: data.carryDay?.toString() || '0.00026',
    });
    if (data.band) setBand(data.band);
    if (data.signals) setSignals(data.signals);
    setLastRun(data);
    // Trigger calculation if zip is present
    if (data.zip) {
      setTimeout(() => calculate(), 100);
    }
  }, [calculate]);

  const runHyperlocalScan = useCallback(async () => {
    const addr = formData.address.trim();
    const zip = formData.zip.trim();
    if (!addr && !zip) {
      alert('Provide address or ZIP');
      return;
    }

    // Simulate hyperlocal signals (in real app, this would call APIs)
    const h = hash(zip || addr);
    const crimeRaw = (h % 100) / 100;
    const schoolRaw = ((h >> 1) % 70) / 100;
    const floodRaw = ((h >> 2) % 25) / 100;
    const wildfireRaw = ((h >> 3) % 30) / 100;
    const reviewDelta = (h % 100 > 50 ? 0.3 : -0.2);

    const sig = {
      crimeIndex: crimeRaw,
      schoolIndex: schoolRaw,
      floodRisk: floodRaw,
      wildfireRisk: wildfireRaw,
      reviewDelta,
      _meta: { zip, addr },
    };

    setSignals(sig);
    calculate();
  }, [formData, calculate]);

  const resetForm = () => {
    setFormData({
      address: '',
      zip: '',
      type: 'sf',
      year: '',
      beds: '',
      baths: '',
      sqft: '',
      asIs: '',
      roof: 'ok',
      ext: 'ok',
      found: 'sound',
      bsmnt: 'dry',
      hvac: 'ok',
      elec: 'modern',
      plumb: 'pex_copper',
      windows: 'ok',
      kitchen: 'serviceable',
      baths_count: '0',
      flooring: 'ok',
      hazards: 'none',
      hoa: 'no',
      occ: 'owner',
      title: 'clean',
      access: 'easy',
      timeline: 'normal',
      split: '0.5',
      svcBase: '0.032',
      cashBase: '0.10',
      carryDay: '0.00026',
    });
    setResults(null);
    setSignals(null);
    setBand('likely');
    try {
      localStorage.removeItem(STORE_KEY);
    } catch (e) {
      // Ignore
    }
  };

  // Auto-calculate on ZIP change
  useEffect(() => {
    if (formData.zip && formData.asIs) {
      const timer = setTimeout(() => {
        calculate();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [formData.zip, formData.asIs, calculate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div id="pvi-root" className="max-w-[1100px] mx-auto p-4 my-4 border border-slate-200 rounded-2xl bg-gradient-to-br from-indigo-50 to-white">
        
        {/* Header Callout */}
        <div className="pvi-callout">
          <span>Internal tool • Analyst view</span>
          <span>Questions? Call <a href="tel:1-800-858-0588" className="text-yellow-400 font-bold">1-800-858-0588</a></span>
        </div>

        <h2 className="text-2xl font-bold mb-3">Instant Home Offer Calculator (v11.4 • INTERNAL)</h2>
        <p className="text-slate-600 mb-2 text-sm">
          Light theme. Live Street View. Condition Matrix recalcs on every change (or uses Comps if As-Is blank).
          <strong> Hyperlocal Risk Engine</strong> uses deterministic, data-inspired scoring from address/ZIP (no paid APIs).
        </p>

        {/* Sticky Summary Card */}
        <div className="pvi-top-card">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="font-bold text-slate-900 mb-2">Instant summary</div>
              <div className="flex gap-3 flex-wrap">
                <div className="pvi-pill">
                  <div className="pvi-pill-label">Cash net (certainty)</div>
                  <div className="pvi-pill-value">
                    {results ? money(results.cashNet) : '—'}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {results ? `${results.daysCash}± days to close` : 'Run the model to see days-to-close.'}
                  </div>
                </div>
                <div className="pvi-pill pvi-pill-alt">
                  <div className="pvi-pill-label">Partnership net (upside)</div>
                  <div className="pvi-pill-value">
                    {results ? money(results.novNet) : '—'}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {results ? `${results.daysNov}± days to close` : 'Run the model to see days-to-close.'}
                  </div>
                </div>
              </div>
            </div>
            <div>
              <div className="font-bold text-slate-900 mb-2">Certainty vs Upside</div>
              <div className="flex justify-between text-xs text-slate-600 mb-1">
                <span>More certainty</span>
                <span>More upside</span>
              </div>
              <div className="pvi-scale-bar">
                <div className="pvi-scale-marker" style={{ left: `${results?.tiltClamped || 50}%` }}></div>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                {results ? (results.tiltClamped < 50 ? 'Leaning Cash (certainty wins)' :
                  results.tiltClamped > 50 ? 'Leaning Partnership (upside wins)' :
                  'Balanced between certainty and upside') : 'Waiting for a run…'}
              </p>
            </div>
          </div>
        </div>

        {/* Scenario Band Selector */}
        <div className="pvi-card mb-3">
          <div className="flex gap-2 items-center flex-wrap">
            <label className="font-bold min-w-[140px]">Scenario:</label>
            <div className="flex gap-2">
              {(['likely', 'conservative', 'stretch'] as const).map((b) => (
                <span
                  key={b}
                  className={`chip ${band === b ? 'active' : ''}`}
                  onClick={() => {
                    setBand(b);
                    setTimeout(calculate, 100);
                  }}
                >
                  {b.charAt(0).toUpperCase() + b.slice(1)}
                </span>
              ))}
            </div>
            <div className="text-xs text-slate-500 ml-auto">
              <strong>{band.charAt(0).toUpperCase() + band.slice(1)}</strong> — RVI {BANDS[band].rvi > 1 ? `+${Math.round((BANDS[band].rvi - 1) * 100)}%` : BANDS[band].rvi < 1 ? `${Math.round((BANDS[band].rvi - 1) * 100)}%` : '0%'}, Repairs {BANDS[band].repairs > 1 ? `+${Math.round((BANDS[band].repairs - 1) * 100)}%` : BANDS[band].repairs < 1 ? `${Math.round((BANDS[band].repairs - 1) * 100)}%` : '0%'}, Carry {BANDS[band].carry > 1 ? `+${Math.round((BANDS[band].carry - 1) * 100)}%` : BANDS[band].carry < 1 ? `${Math.round((BANDS[band].carry - 1) * 100)}%` : '0%'}, Cash {BANDS[band].cash > 0 ? `+${(BANDS[band].cash * 100).toFixed(1)}%` : BANDS[band].cash < 0 ? `${(BANDS[band].cash * 100).toFixed(1)}%` : '0%'}, Service {BANDS[band].svc > 0 ? `+${(BANDS[band].svc * 100).toFixed(1)}%` : BANDS[band].svc < 0 ? `${(BANDS[band].svc * 100).toFixed(1)}%` : '0%'}.
            </div>
          </div>
        </div>

        {/* Main Form - This is getting very long, so I'll continue in the next part... */}
        <form 
          className="pvi-card"
          onSubmit={(e) => {
            e.preventDefault();
            calculate();
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left Column - Property Details */}
            <div>
              <div className="mb-4">
                <label className="block font-bold mb-2 min-w-[140px]">Address</label>
                <input
                  type="text"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 focus:outline-2 focus:outline-blue-500 focus:bg-white"
                  placeholder="123 Maple St, Minneapolis, MN 55408"
                  value={formData.address}
                  onChange={(e) => {
                    handleInputChange('address', e.target.value);
                    const zip = parseZipFromAddress(e.target.value);
                    if (zip && !formData.zip) handleInputChange('zip', zip);
                  }}
                />
              </div>

              <div className="mb-4">
                <label className="block font-bold mb-2 min-w-[140px]">ZIP</label>
                <input
                  type="text"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 focus:outline-2 focus:outline-blue-500 focus:bg-white"
                  placeholder="e.g., 55408 or 55408-1234"
                  value={formData.zip}
                  onChange={(e) => handleInputChange('zip', e.target.value)}
                />
                <div className="text-xs text-slate-500 mt-1">
                  Auto-fills from address if present. Accepts 5-digit or ZIP+4.
                </div>
              </div>

              <div className="mb-4">
                <label className="block font-bold mb-2 min-w-[140px]">Type</label>
                <select
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 focus:outline-2 focus:outline-blue-500 focus:bg-white"
                  value={formData.type}
                  onChange={(e) => handleInputChange('type', e.target.value)}
                >
                  <option value="sf">Single-Family</option>
                  <option value="th">Townhome</option>
                  <option value="condo">Condo</option>
                  <option value="2to4">2–4 Units</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                <div>
                  <label className="block font-bold mb-2 text-sm">Year Built</label>
                  <input
                    type="number"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 focus:outline-2 focus:outline-blue-500 focus:bg-white"
                    placeholder="1998"
                    value={formData.year}
                    onChange={(e) => handleInputChange('year', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block font-bold mb-2 text-sm">Beds</label>
                  <input
                    type="number"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 focus:outline-2 focus:outline-blue-500 focus:bg-white"
                    placeholder="3"
                    value={formData.beds}
                    onChange={(e) => handleInputChange('beds', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block font-bold mb-2 text-sm">Baths</label>
                  <input
                    type="number"
                    step="0.5"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 focus:outline-2 focus:outline-blue-500 focus:bg-white"
                    placeholder="2"
                    value={formData.baths}
                    onChange={(e) => handleInputChange('baths', e.target.value)}
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block font-bold mb-2 min-w-[140px]">Sq Ft</label>
                <input
                  type="number"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 focus:outline-2 focus:outline-blue-500 focus:bg-white"
                  placeholder="1600"
                  value={formData.sqft}
                  onChange={(e) => handleInputChange('sqft', e.target.value)}
                />
              </div>

              <div className="mb-4">
                <label className="block font-bold mb-2 min-w-[140px]">As-Is Value</label>
                <input
                  type="text"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 focus:outline-2 focus:outline-blue-500 focus:bg-white money-input"
                  placeholder="$300,000"
                  value={formData.asIs}
                  onChange={(e) => handleInputChange('asIs', e.target.value)}
                />
              </div>

              {/* Condition Matrix */}
              <div className="pvi-card mt-3">
                <div className="mb-2">
                  <label className="font-bold">Condition Matrix</label>
                  <div className="text-xs text-slate-500">
                    Every change recalculates offer. Presets help in Rush mode.
                  </div>
                </div>

                {/* Preset buttons */}
                <div className="flex flex-wrap gap-2 mb-3">
                  <button
                    type="button"
                    className="text-xs rounded-full border border-dashed border-slate-300 px-3 py-1.5 bg-white hover:bg-slate-900 hover:text-white hover:border-slate-900 font-bold cursor-pointer transition-colors"
                    onClick={() => applyPreset('turnkey')}
                  >
                    Turnkey / Retail Ready
                  </button>
                  <button
                    type="button"
                    className="text-xs rounded-full border border-dashed border-slate-300 px-3 py-1.5 bg-white hover:bg-slate-900 hover:text-white hover:border-slate-900 font-bold cursor-pointer transition-colors"
                    onClick={() => applyPreset('dated')}
                  >
                    Dated but Livable
                  </button>
                  <button
                    type="button"
                    className="text-xs rounded-full border border-dashed border-slate-300 px-3 py-1.5 bg-white hover:bg-slate-900 hover:text-white hover:border-slate-900 font-bold cursor-pointer transition-colors"
                    onClick={() => applyPreset('heavy')}
                  >
                    Heavy Fixer
                  </button>
                  <button
                    type="button"
                    className="text-xs rounded-full border border-dashed border-slate-300 px-3 py-1.5 bg-white hover:bg-slate-900 hover:text-white hover:border-slate-900 font-bold cursor-pointer transition-colors"
                    onClick={() => applyPreset('rough')}
                  >
                    Rough / Squatter Risk
                  </button>
                </div>

                {/* Exterior */}
                <details open className="mb-2">
                  <summary className="font-bold cursor-pointer mb-2">Exterior (Roof, Siding, Foundation)</summary>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <label className="block text-sm font-bold mb-1">Roof</label>
                      <select
                        className="w-full border border-slate-300 rounded-lg px-2 py-1 text-sm bg-slate-50"
                        value={formData.roof}
                        onChange={(e) => handleInputChange('roof', e.target.value)}
                      >
                        <option value="ok">OK (≤10 yrs)</option>
                        <option value="aging">Aging (11–20)</option>
                        <option value="end">End-of-life (20+)</option>
                        <option value="leak">Active leaks</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-1">Exterior</label>
                      <select
                        className="w-full border border-slate-300 rounded-lg px-2 py-1 text-sm bg-slate-50"
                        value={formData.ext}
                        onChange={(e) => handleInputChange('ext', e.target.value)}
                      >
                        <option value="ok">OK</option>
                        <option value="paint">Paint/siding</option>
                        <option value="major">Major repair</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-1">Foundation</label>
                      <select
                        className="w-full border border-slate-300 rounded-lg px-2 py-1 text-sm bg-slate-50"
                        value={formData.found}
                        onChange={(e) => handleInputChange('found', e.target.value)}
                      >
                        <option value="sound">Sound</option>
                        <option value="settle">Minor settling</option>
                        <option value="struct">Major structural</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-1">Basement/Water</label>
                      <select
                        className="w-full border border-slate-300 rounded-lg px-2 py-1 text-sm bg-slate-50"
                        value={formData.bsmnt}
                        onChange={(e) => handleInputChange('bsmnt', e.target.value)}
                      >
                        <option value="dry">Dry</option>
                        <option value="damp">Damp/efflorescence</option>
                        <option value="flood">Past flooding</option>
                        <option value="mold">Mold remediation</option>
                      </select>
                    </div>
                  </div>
                </details>

                {/* Systems */}
                <details className="mb-2">
                  <summary className="font-bold cursor-pointer mb-2">Systems (HVAC, Electrical, Plumbing, Windows)</summary>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <label className="block text-sm font-bold mb-1">HVAC</label>
                      <select
                        className="w-full border border-slate-300 rounded-lg px-2 py-1 text-sm bg-slate-50"
                        value={formData.hvac}
                        onChange={(e) => handleInputChange('hvac', e.target.value)}
                      >
                        <option value="ok">OK</option>
                        <option value="old">Old/undersized</option>
                        <option value="fail">Inoperable</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-1">Electrical</label>
                      <select
                        className="w-full border border-slate-300 rounded-lg px-2 py-1 text-sm bg-slate-50"
                        value={formData.elec}
                        onChange={(e) => handleInputChange('elec', e.target.value)}
                      >
                        <option value="modern">Modern breakers</option>
                        <option value="old">Old but safe</option>
                        <option value="fuse">Fuses/knob & tube</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-1">Plumbing</label>
                      <select
                        className="w-full border border-slate-300 rounded-lg px-2 py-1 text-sm bg-slate-50"
                        value={formData.plumb}
                        onChange={(e) => handleInputChange('plumb', e.target.value)}
                      >
                        <option value="pex_copper">PEX/Copper</option>
                        <option value="galv_mix">Galv mix</option>
                        <option value="cast_fail">Cast iron near end</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-1">Windows</label>
                      <select
                        className="w-full border border-slate-300 rounded-lg px-2 py-1 text-sm bg-slate-50"
                        value={formData.windows}
                        onChange={(e) => handleInputChange('windows', e.target.value)}
                      >
                        <option value="ok">OK</option>
                        <option value="mix">Mixed</option>
                        <option value="replace">Mostly replace</option>
                      </select>
                    </div>
                  </div>
                </details>

                {/* Interior */}
                <details className="mb-2">
                  <summary className="font-bold cursor-pointer mb-2">Interior (Kitchen, Baths, Flooring, Hazards)</summary>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <label className="block text-sm font-bold mb-1">Kitchen</label>
                      <select
                        className="w-full border border-slate-300 rounded-lg px-2 py-1 text-sm bg-slate-50"
                        value={formData.kitchen}
                        onChange={(e) => handleInputChange('kitchen', e.target.value)}
                      >
                        <option value="serviceable">Serviceable</option>
                        <option value="dated">Dated</option>
                        <option value="gut">Gut/replace</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-1">Baths (to redo)</label>
                      <select
                        className="w-full border border-slate-300 rounded-lg px-2 py-1 text-sm bg-slate-50"
                        value={formData.baths_count}
                        onChange={(e) => handleInputChange('baths_count', e.target.value)}
                      >
                        <option value="0">0</option>
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3+">3+</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-1">Flooring</label>
                      <select
                        className="w-full border border-slate-300 rounded-lg px-2 py-1 text-sm bg-slate-50"
                        value={formData.flooring}
                        onChange={(e) => handleInputChange('flooring', e.target.value)}
                      >
                        <option value="ok">OK</option>
                        <option value="patch">Patch/partial</option>
                        <option value="full">Full replace</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-1">Hazards</label>
                      <select
                        className="w-full border border-slate-300 rounded-lg px-2 py-1 text-sm bg-slate-50"
                        value={formData.hazards}
                        onChange={(e) => handleInputChange('hazards', e.target.value)}
                      >
                        <option value="none">None</option>
                        <option value="asbestos">Asbestos/lead</option>
                        <option value="meth">Meth/hoarder</option>
                      </select>
                    </div>
                  </div>
                </details>

                {/* Legal/Friction */}
                <details className="mb-2">
                  <summary className="font-bold cursor-pointer mb-2">Legal / Access / Friction</summary>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <label className="block text-sm font-bold mb-1">HOA</label>
                      <select
                        className="w-full border border-slate-300 rounded-lg px-2 py-1 text-sm bg-slate-50"
                        value={formData.hoa}
                        onChange={(e) => handleInputChange('hoa', e.target.value)}
                      >
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-1">Occupancy</label>
                      <select
                        className="w-full border border-slate-300 rounded-lg px-2 py-1 text-sm bg-slate-50"
                        value={formData.occ}
                        onChange={(e) => handleInputChange('occ', e.target.value)}
                      >
                        <option value="owner">Owner</option>
                        <option value="tenant">Tenant</option>
                        <option value="vacant">Vacant</option>
                        <option value="squat">Squatter</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-1">Title/Legal</label>
                      <select
                        className="w-full border border-slate-300 rounded-lg px-2 py-1 text-sm bg-slate-50"
                        value={formData.title}
                        onChange={(e) => handleInputChange('title', e.target.value)}
                      >
                        <option value="clean">Clean</option>
                        <option value="liens">Liens/judgments</option>
                        <option value="probate">Probate/estate</option>
                        <option value="foreclosure">Pre-foreclosure</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-1">Access</label>
                      <select
                        className="w-full border border-slate-300 rounded-lg px-2 py-1 text-sm bg-slate-50"
                        value={formData.access}
                        onChange={(e) => handleInputChange('access', e.target.value)}
                      >
                        <option value="easy">Lockbox/easy</option>
                        <option value="limited">Limited hours</option>
                        <option value="blocked">Blocked</option>
                      </select>
                    </div>
                  </div>
                </details>
              </div>

              <div className="mb-4">
                <label className="block font-bold mb-2 min-w-[140px]">Timeline Urgency</label>
                <select
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 focus:outline-2 focus:outline-blue-500 focus:bg-white"
                  value={formData.timeline}
                  onChange={(e) => handleInputChange('timeline', e.target.value)}
                >
                  <option value="normal">Normal</option>
                  <option value="fast">Fast (≤21d)</option>
                  <option value="rush">Rush (≤10d)</option>
                </select>
              </div>

              <div className="flex gap-2 flex-wrap mt-4">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg font-bold bg-blue-600 text-white hover:bg-blue-700 border border-blue-700"
                >
                  Compute Offer
                </button>
                <button
                  type="button"
                  onClick={runHyperlocalScan}
                  className="px-4 py-2 rounded-lg font-bold bg-white text-slate-900 border border-slate-900 hover:bg-slate-900 hover:text-white"
                >
                  Run Hyperlocal Risk Scan
                </button>
                <button
                  type="button"
                  onClick={() => setShowAssumptions(!showAssumptions)}
                  className="px-4 py-2 rounded-lg font-bold bg-white text-slate-600 border border-slate-600 hover:bg-slate-600 hover:text-white"
                >
                  Assumptions ⚙️
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!lastRun) {
                      alert('Run the calculator first to generate a Letter of Intent.');
                      return;
                    }
                    setShowLOI(true);
                  }}
                  className="px-4 py-2 rounded-lg font-bold bg-white text-slate-600 border border-slate-600 hover:bg-slate-600 hover:text-white"
                >
                  Generate Letter of Intent
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 rounded-lg font-bold bg-white text-slate-600 border border-slate-600 hover:bg-slate-600 hover:text-white"
                >
                  Reset All
                </button>
              </div>

              {/* Assumptions Panel */}
              {showAssumptions && (
                <div className="pvi-card mt-4">
                  <h3 className="text-lg font-bold mb-3">Live Assumptions</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-bold mb-1">Profit Split</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="1"
                        className="w-full border border-slate-300 rounded-lg px-2 py-1 text-sm bg-slate-50"
                        value={formData.split}
                        onChange={(e) => handleInputChange('split', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-1">Svc Base</label>
                      <input
                        type="number"
                        step="0.001"
                        className="w-full border border-slate-300 rounded-lg px-2 py-1 text-sm bg-slate-50"
                        value={formData.svcBase}
                        onChange={(e) => handleInputChange('svcBase', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-1">Cash Base Disc</label>
                      <input
                        type="number"
                        step="0.001"
                        className="w-full border border-slate-300 rounded-lg px-2 py-1 text-sm bg-slate-50"
                        value={formData.cashBase}
                        onChange={(e) => handleInputChange('cashBase', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-1">Carry/day (mix)</label>
                      <input
                        type="number"
                        step="0.00001"
                        className="w-full border border-slate-300 rounded-lg px-2 py-1 text-sm bg-slate-50"
                        value={formData.carryDay}
                        onChange={(e) => handleInputChange('carryDay', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Results */}
            <div>
              <div className="pvi-card mb-3">
                <div className="mb-2">
                  <label className="font-bold">✨ Predictive Exit Path</label>
                  <div className="text-xs text-slate-500">
                    AI recommends the optimal path.
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className={`pvi-card text-center cursor-pointer border-2 ${results?.recoKey === 'cash' ? 'border-blue-500 bg-blue-50' : 'border-slate-300'}`}>
                    <div className="font-bold">Cash Offer</div>
                    <div className="text-xs text-slate-500">Path 1: Certainty</div>
                    <div className="text-lg font-bold text-red-600 mt-1">
                      {results ? money(results.cashNet) : '—'}
                    </div>
                  </div>
                  <div className={`pvi-card text-center cursor-pointer border-2 ${results?.recoKey === 'partnership' || results?.recoKey === 'close' ? 'border-blue-500 bg-blue-50' : 'border-slate-300'}`}>
                    <div className="font-bold">Partnership</div>
                    <div className="text-xs text-slate-500">Path 2: Upside</div>
                    <div className="text-lg font-bold text-emerald-600 mt-1">
                      {results ? money(results.novNet) : '—'}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-2 text-center">
                  The calculator always models both paths. The highlighted path is the AI's recommendation.
                </p>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="pvi-card">
                  <div className="text-xl font-bold">
                    {results ? money(results.cashNet) : '—'}
                  </div>
                  <div className="text-xs text-slate-500">Cash discount</div>
                </div>
                <div className="pvi-card">
                  <div className="text-xl font-bold">
                    {results ? money(results.novNet) : '—'}
                  </div>
                  <div className="text-xs text-slate-500">Service deduction</div>
                </div>
                <div className="pvi-card">
                  <div className={`text-xl font-bold ${results?.delta >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {results ? (results.delta >= 0 ? '+' : '−') + money(Math.abs(results.delta)) : '—'}
                  </div>
                  <div className="text-xs text-slate-500">
                    {results ? (results.delta >= 0 ? `Partnership +${results.deltaPct.toFixed(1)}% vs Cash` : `Cash better by ${Math.abs(results.deltaPct).toFixed(1)}%`) : '—'}
                  </div>
                </div>
              </div>

              <div className="pvi-card">
                <strong>Your Best Path: {results ? results.reco : '—'}</strong>
                <div className="text-xs text-slate-500 mt-1">
                  {results ? results.reason : 'Run calculation to see recommendation'}
                </div>
              </div>

              {/* Offer Breakdown Table */}
              {results && (
                <div className="pvi-card mt-3">
                  <h3 className="text-lg font-bold mb-2">Offer Breakdown</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-2 py-1 text-left">Component</th>
                          <th className="px-2 py-1 text-left">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        <tr className="bg-white">
                          <td className="px-2 py-1">As-Is Value</td>
                          <td className="px-2 py-1">{money(num(formData.asIs))}</td>
                        </tr>
                        <tr className="bg-slate-50">
                          <td className="px-2 py-1">RVI Value-Add</td>
                          <td className="px-2 py-1 text-emerald-600">+{money(results.rviGain)}</td>
                        </tr>
                        <tr className="bg-white">
                          <td className="px-2 py-1">ARV</td>
                          <td className="px-2 py-1 font-bold">{money(results.arv)}</td>
                        </tr>
                        <tr className="bg-slate-50">
                          <td className="px-2 py-1">Repairs</td>
                          <td className="px-2 py-1 text-red-600">-{money(results.repairs)}</td>
                        </tr>
                        <tr className="bg-white">
                          <td className="px-2 py-1">Closing Friction</td>
                          <td className="px-2 py-1 text-red-600">-{money(results.closingFriction)}</td>
                        </tr>
                        <tr className="bg-slate-50">
                          <td className="px-2 py-1">Carry/Time</td>
                          <td className="px-2 py-1 text-red-600">-{money(results.carry)}</td>
                        </tr>
                        <tr className="bg-white">
                          <td className="px-2 py-1">Projected Profit</td>
                          <td className="px-2 py-1 font-bold text-emerald-600">+{money(results.profit)}</td>
                        </tr>
                        <tr className="bg-emerald-50">
                          <td className="px-2 py-1 font-bold">Estimated Net — Partnership</td>
                          <td className="px-2 py-1 font-bold text-emerald-700">{money(results.novNet)}</td>
                        </tr>
                        <tr className="bg-blue-50">
                          <td className="px-2 py-1 font-bold">Estimated Net — Cash</td>
                          <td className="px-2 py-1 font-bold text-blue-700">{money(results.cashNet)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </form>

        {/* Footer Callout */}
        <div className="pvi-callout mt-4 rounded-xl">
          <span>Internal use only. Subject to inspection, title, and underwriting.</span>
          <span>Call <a href="tel:1-800-858-0588" className="text-yellow-400 font-bold">1-800-858-0588</a> for a second set of eyes.</span>
        </div>

        {/* Comps Module */}
        <CompsModule
          subjectSqft={num(formData.sqft)}
          band={band}
          onApplyToAsIs={(value) => {
            setFormData((prev) => ({ ...prev, asIs: value.toLocaleString() }));
            setTimeout(() => calculate(), 100);
          }}
          onUpdateComps={setCompsStats}
          lastRunNovNet={lastRun?.novNet}
        />
      </div>

      {/* Deal Sidebar */}
      <DealSidebar
        isOpen={dealSidebarOpen}
        onToggle={() => setDealSidebarOpen(!dealSidebarOpen)}
        onLoadDeal={loadDealFromMemory}
      />

      {/* LOI Overlay */}
      <LOIOverlay
        isOpen={showLOI}
        onClose={() => setShowLOI(false)}
        dealData={lastRun}
      />
    </div>
  );
}
