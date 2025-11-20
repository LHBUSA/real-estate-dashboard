'use client';

import { useState, useEffect } from 'react';
import { num, money, money2, clamp, BANDS } from '../utils';

interface CompRow {
  addr: string;
  price: number;
  sf: number;
  psf: number;
  mi: number;
  date: string;
  note: string;
}

interface CompsStats {
  avgPrice: number;
  medPrice: number;
  avgPsf: number;
  weightedPsf: number;
  subjectSuggested: number;
  band: [number, number];
  suggestedOffer: number;
}

interface CompsModuleProps {
  subjectSqft: number;
  band: 'conservative' | 'likely' | 'stretch';
  onApplyToAsIs: (value: number) => void;
  onUpdateComps: (stats: CompsStats | null) => void;
  lastRunNovNet?: number;
}

export default function CompsModule({
  subjectSqft,
  band,
  onApplyToAsIs,
  onUpdateComps,
  lastRunNovNet,
}: CompsModuleProps) {
  const [rows, setRows] = useState<CompRow[]>([]);

  useEffect(() => {
    // Initialize with 3 empty rows
    if (rows.length === 0) {
      setRows([
        { addr: '', price: 0, sf: 0, psf: 0, mi: 0, date: '', note: '' },
        { addr: '', price: 0, sf: 0, psf: 0, mi: 0, date: '', note: '' },
        { addr: '', price: 0, sf: 0, psf: 0, mi: 0, date: '', note: '' },
      ]);
    }
  }, []);

  const addRow = () => {
    setRows([...rows, { addr: '', price: 0, sf: 0, psf: 0, mi: 0, date: '', note: '' }]);
  };

  const deleteRow = (index: number) => {
    setRows(rows.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, field: keyof CompRow, value: string | number) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], [field]: value };
    if (field === 'price' || field === 'sf') {
      const price = field === 'price' ? num(value) : newRows[index].price;
      const sf = field === 'sf' ? num(value) : newRows[index].sf;
      newRows[index].psf = price > 0 && sf > 0 ? price / sf : 0;
    }
    setRows(newRows);
  };

  const clearRows = () => {
    setRows([
      { addr: '', price: 0, sf: 0, psf: 0, mi: 0, date: '', note: '' },
      { addr: '', price: 0, sf: 0, psf: 0, mi: 0, date: '', note: '' },
      { addr: '', price: 0, sf: 0, psf: 0, mi: 0, date: '', note: '' },
    ]);
    onUpdateComps(null);
  };

  const median = (arr: number[]): number => {
    const s = [...arr].sort((a, b) => a - b);
    const n = s.length;
    if (!n) return 0;
    return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
  };

  const weightOf = (comp: CompRow, subjectSf: number): number => {
    const sizePenalty = Math.min(
      0.4,
      Math.abs(comp.sf - (subjectSf || comp.sf)) / Math.max(600, subjectSf || comp.sf || 1)
    );
    let days = 90;
    if (comp.date) {
      const d = new Date(comp.date);
      const now = new Date();
      days = Math.max(1, (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    }
    const recencyPenalty = clamp((days - 30) / 365, 0, 0.35);
    const distPenalty = Math.min(0.25, Math.max(0, comp.mi) / 5);
    const raw = 1 - (sizePenalty + recencyPenalty + distPenalty);
    return clamp(raw, 0.05, 1);
  };

  const compute = () => {
    const validComps = rows.filter((r) => r.price > 0 && r.sf > 0);
    if (!validComps.length) {
      onUpdateComps(null);
      return null;
    }

    const prices = validComps.map((c) => c.price);
    const psfs = validComps.map((c) => c.psf).filter((x) => x > 0);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const medPrice = median(prices);
    const avgPsf = psfs.length ? psfs.reduce((a, b) => a + b, 0) / psfs.length : 0;

    let wSum = 0,
      wPsfSum = 0;
    validComps.forEach((c) => {
      if (c.psf > 0) {
        const w = weightOf(c, subjectSqft || c.sf);
        wSum += w;
        wPsfSum += w * c.psf;
      }
    });
    const weightedPsf = wSum > 0 ? wPsfSum / wSum : avgPsf || 0;
    const subjectSuggested =
      subjectSqft > 0 && weightedPsf > 0
        ? weightedPsf * subjectSqft
        : medPrice || avgPrice;

    const low = subjectSuggested * 0.94;
    const high = subjectSuggested * 1.06;

    // Base: approx 10% discount from value
    const bandSvcAdj = (BANDS[band]?.svc) || 0;
    let totalDisc = 0.10 + Math.max(0, bandSvcAdj) * 0.6;

    if (band === 'conservative') totalDisc += 0.02;
    if (band === 'stretch') totalDisc -= 0.015;

    totalDisc = clamp(totalDisc, 0.08, 0.18);

    let coreOffer = subjectSuggested * (1 - totalDisc);
    if (avgPrice > 0) {
      coreOffer = Math.min(coreOffer, avgPrice * 0.93);
    }

    let suggestedOffer = coreOffer;

    // Tie to current Partnership net if available
    if (lastRunNovNet) {
      const blended = coreOffer * 0.3 + lastRunNovNet * 0.7;
      suggestedOffer = blended;
      const minAllowed = subjectSuggested * 0.8;
      const maxAllowed = subjectSuggested * 0.95;
      suggestedOffer = clamp(suggestedOffer, minAllowed, maxAllowed);
    }

    const stats: CompsStats = {
      avgPrice,
      medPrice,
      avgPsf: avgPsf || 0,
      weightedPsf,
      subjectSuggested,
      band: [low, high],
      suggestedOffer,
    };

    onUpdateComps(stats);
    return stats;
  };

  const applyToAsIs = () => {
    if (!stats) {
      alert('Add at least one valid comp and Compute first.');
      return;
    }
    onApplyToAsIs(Math.round(stats.subjectSuggested));
  };

  const [stats, setStats] = useState<CompsStats | null>(null);

  // Auto-compute when rows change
  useEffect(() => {
    const timer = setTimeout(() => {
      const validComps = rows.filter((r) => r.price > 0 && r.sf > 0);
      if (!validComps.length) {
        setStats(null);
        onUpdateComps(null);
        return;
      }

      const prices = validComps.map((c) => c.price);
      const psfs = validComps.map((c) => c.psf).filter((x) => x > 0);
      const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
      const medPrice = median(prices);
      const avgPsf = psfs.length ? psfs.reduce((a, b) => a + b, 0) / psfs.length : 0;

      let wSum = 0,
        wPsfSum = 0;
      validComps.forEach((c) => {
        if (c.psf > 0) {
          const w = weightOf(c, subjectSqft || c.sf);
          wSum += w;
          wPsfSum += w * c.psf;
        }
      });
      const weightedPsf = wSum > 0 ? wPsfSum / wSum : avgPsf || 0;
      const subjectSuggested =
        subjectSqft > 0 && weightedPsf > 0
          ? weightedPsf * subjectSqft
          : medPrice || avgPrice;

      const low = subjectSuggested * 0.94;
      const high = subjectSuggested * 1.06;

      // Base: approx 10% discount from value
      const bandSvcAdj = (BANDS[band]?.svc) || 0;
      let totalDisc = 0.10 + Math.max(0, bandSvcAdj) * 0.6;

      if (band === 'conservative') totalDisc += 0.02;
      if (band === 'stretch') totalDisc -= 0.015;

      totalDisc = clamp(totalDisc, 0.08, 0.18);

      let coreOffer = subjectSuggested * (1 - totalDisc);
      if (avgPrice > 0) {
        coreOffer = Math.min(coreOffer, avgPrice * 0.93);
      }

      let suggestedOffer = coreOffer;

      // Tie to current Partnership net if available
      if (lastRunNovNet) {
        const blended = coreOffer * 0.3 + lastRunNovNet * 0.7;
        suggestedOffer = blended;
        const minAllowed = subjectSuggested * 0.8;
        const maxAllowed = subjectSuggested * 0.95;
        suggestedOffer = clamp(suggestedOffer, minAllowed, maxAllowed);
      }

      const computedStats: CompsStats = {
        avgPrice,
        medPrice,
        avgPsf: avgPsf || 0,
        weightedPsf,
        subjectSuggested,
        band: [low, high],
        suggestedOffer,
      };

      setStats(computedStats);
      onUpdateComps(computedStats);
    }, 500);
    return () => clearTimeout(timer);
  }, [rows, subjectSqft, band, lastRunNovNet, onUpdateComps]);

  return (
    <div className="pvi-card mt-3" id="comps_mod">
      <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
        <span aria-hidden="true">📊</span>
        <span>Comparable Sales — Comp Calculator</span>
      </h3>
      <p className="text-slate-600 mb-2 text-sm">
        Enter 3–5 nearby sold comps. We'll compute average/median sold price, average $/sf, and a
        subject-adjusted value. The suggested net offer tracks the Partnership net at the top so
        everything lines up on one number.
      </p>
      <div className="flex gap-2 mb-2 flex-wrap">
        <button type="button" onClick={addRow} className="pvi-btn-secondary">
          Add Row
        </button>
        <button type="button" onClick={clearRows} className="pvi-btn-secondary">
          Clear
        </button>
        <button type="button" onClick={compute} className="pvi-btn-secondary">
          Compute Comps
        </button>
        <button type="button" onClick={applyToAsIs} className="pvi-btn-primary">
          Apply to As-Is
        </button>
      </div>
      <div className="overflow-x-auto">
        <table id="comps_table" className="w-full text-sm">
          <thead>
            <tr>
              <th className="px-2 py-1 text-left">Address</th>
              <th className="px-2 py-1 text-right">Sold Price</th>
              <th className="px-2 py-1 text-right">Sq Ft</th>
              <th className="px-2 py-1 text-right">$/Sf</th>
              <th className="px-2 py-1 text-right">Distance (mi)</th>
              <th className="px-2 py-1 text-left">Sold Date</th>
              <th className="px-2 py-1 text-left">Notes</th>
              <th className="px-2 py-1"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index}>
                <td>
                  <input
                    type="text"
                    placeholder="123 Main St"
                    value={row.addr}
                    onChange={(e) => updateRow(index, 'addr', e.target.value)}
                    className="w-full px-2 py-1 border rounded"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="$210,000"
                    value={row.price > 0 ? row.price.toLocaleString() : ''}
                    onChange={(e) => updateRow(index, 'price', num(e.target.value))}
                    className="w-full px-2 py-1 border rounded text-right"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="1,200"
                    value={row.sf > 0 ? row.sf.toLocaleString() : ''}
                    onChange={(e) => updateRow(index, 'sf', num(e.target.value))}
                    className="w-full px-2 py-1 border rounded text-right"
                  />
                </td>
                <td className="text-right text-slate-500">
                  {row.psf > 0 ? money2(row.psf) : '—'}
                </td>
                <td>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.3"
                    value={row.mi > 0 ? row.mi.toString() : ''}
                    onChange={(e) => updateRow(index, 'mi', num(e.target.value))}
                    className="w-full px-2 py-1 border rounded text-right"
                  />
                </td>
                <td>
                  <input
                    type="date"
                    value={row.date}
                    onChange={(e) => updateRow(index, 'date', e.target.value)}
                    className="w-full px-2 py-1 border rounded"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    placeholder="notes"
                    value={row.note}
                    onChange={(e) => updateRow(index, 'note', e.target.value)}
                    className="w-full px-2 py-1 border rounded"
                  />
                </td>
                <td>
                  <button
                    type="button"
                    onClick={() => deleteRow(index)}
                    className="px-2 py-1 text-red-600 hover:bg-red-50 rounded"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid grid-cols-2 gap-3 mt-3">
        <div className="pvi-card">
          <strong>Raw Stats</strong>
          <ul className="mt-2 space-y-1 text-sm">
            <li>
              Average Sold Price: <span>{stats ? money(stats.avgPrice) : '—'}</span>
            </li>
            <li>
              Median Sold Price: <span>{stats ? money(stats.medPrice) : '—'}</span>
            </li>
            <li>
              Average $/Sf: <span>{stats ? money2(stats.avgPsf) : '—'}</span>
            </li>
          </ul>
        </div>
        <div className="pvi-card">
          <strong>Subject-Adjusted Value</strong>
          <p className="text-xs text-slate-500 mt-1">
            Weighted by size similarity, recency, and distance.
            {!stats && <span> Add comps to see value.</span>}
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            <li>
              Weighted $/Sf: <span>{stats ? money2(stats.weightedPsf) : '—'}</span>
            </li>
            <li>
              Suggested As-Is: <span>{stats ? money(stats.subjectSuggested) : '—'}</span>
            </li>
            <li>
              Confidence Band (±6%):{' '}
              <span>
                {stats ? `${money(stats.band[0])} – ${money(stats.band[1])}` : '—'}
              </span>
            </li>
            <li className="mt-2">
              <span className="font-bold">
                Suggested Net Offer (Engine):{' '}
                <strong>{stats ? money(stats.suggestedOffer) : '—'}</strong>
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

