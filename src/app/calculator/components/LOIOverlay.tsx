'use client';

import { money } from '../utils';

interface LOIOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  dealData: any;
}

export default function LOIOverlay({ isOpen, onClose, dealData }: LOIOverlayProps) {
  if (!isOpen || !dealData) return null;

  const buildLOIHtml = () => {
    const today = new Date();
    const dateStr = today.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const addr = dealData.addr || `Property in ZIP ${dealData.zip || ''}`;
    const asis = dealData.asis || 0;
    const cash = dealData.cashNet || 0;
    const nov = dealData.novNet || 0;
    const hasNov = nov && nov > 0 && nov !== cash;
    const band = dealData.band || 'likely';
    const bandLabel = band[0].toUpperCase() + band.slice(1);
    const daysCash = dealData.daysCash || 30;
    const daysNov = dealData.daysNov || 60;

    return {
      dateStr,
      addr,
      asis,
      cash,
      nov,
      hasNov,
      bandLabel,
      daysCash,
      daysNov,
    };
  };

  const loi = buildLOIHtml();

  const copyLOIText = () => {
    const content = document.getElementById('loi_content');
    if (!content) return;

    const tmp = document.createElement('div');
    tmp.innerHTML = content.innerHTML;
    const text = tmp.innerText.trim();

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {
        alert('LOI text copied. Paste into email or Doc.');
      });
    } else {
      alert('LOI text copied. Paste into email or Doc.');
    }
  };

  const printLOI = () => {
    const content = document.getElementById('loi_content');
    if (!content) return;

    const html = `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Letter of Intent - Local Home Buyers USA</title>
        <style>
          body{font-family:system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Ubuntu,"Helvetica Neue",sans-serif;margin:24px;color:#0f172a;}
          .loi-print-container{max-width:700px;margin:0 auto;}
          .loi-print-container h1{font-size:1.4rem;margin-bottom:8px;}
          .loi-small{font-size:.8rem;color:#6b7280;}
          table{width:100%;border-collapse:collapse;margin:6px 0 10px;font-size:.9rem;}
          th,td{border-bottom:1px solid #e5e7eb;padding:4px 6px;text-align:left;}
          th{font-weight:700;}
        </style>
      </head>
      <body>
        <div class="loi-print-container">
          ${content.innerHTML}
        </div>
      </body>
      </html>
    `;

    const w = window.open('', '_blank', 'noopener');
    if (!w) {
      alert('Pop-up blocked. Please allow pop-ups to print.');
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <div
      id="loi_overlay"
      className={`loi-overlay ${isOpen ? 'open' : ''}`}
      aria-hidden={!isOpen}
      onClick={(e) => {
        if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('loi-backdrop')) {
          onClose();
        }
      }}
    >
      <div className="loi-backdrop"></div>
      <div className="loi-modal" role="dialog" aria-modal="true" aria-labelledby="loi_title">
        <div className="loi-header">
          <div className="loi-header-left">
            <div id="loi_title" className="loi-title">
              Letter of Intent (Internal Draft)
            </div>
            <div className="loi-subtitle">
              Non-binding summary of key terms — for presentation and PDF export.
            </div>
          </div>
          <button
            type="button"
            className="loi-close"
            onClick={onClose}
            aria-label="Close LOI overlay"
          >
            ×
          </button>
        </div>
        <div className="loi-body" id="loi_content">
          <div className="loi-letter">
            <div className="loi-letter-header-top">
              <div>
                <div className="loi-brand">Local Home Buyers USA</div>
                <div className="loi-brand-sub">Powered by the research of PropTechUSA.ai</div>
                <div className="loi-small" style={{ marginTop: '4px' }}>
                  Toll-Free: 1-800-858-0588<br />
                  Email: sales@localhomebuyersusa.com<br />
                  Web: LocalHomeBuyersUSA.com
                </div>
              </div>
              <div className="loi-letter-meta">
                <div>{loi.dateStr}</div>
                {dealData.zip && <div>Market Focus: {dealData.zip}</div>}
                <div>Scenario Band: {loi.bandLabel}</div>
              </div>
            </div>

            <div className="loi-section">
              <div className="loi-section-title">Re: Non-Binding Letter of Intent to Purchase</div>
              <p>
                Property: <strong>{loi.addr}</strong>
              </p>
              <p>
                Seller: <span className="loi-small">(To be completed on execution)</span>
              </p>
            </div>

            <div className="loi-section">
              <div className="loi-section-title">1. Offer Overview</div>
              <p>
                This non-binding Letter of Intent ('LOI') summarizes the key economic terms under
                which <strong>Local Home Buyers USA</strong> ('Buyer') is prepared to purchase the
                above-referenced property from the current owner ('Seller'), subject to formal
                purchase agreement, final inspection, and standard due diligence.
              </p>
            </div>

            <div className="loi-section">
              <div className="loi-section-title">2. Economic Terms</div>
              <table className="loi-table">
                <thead>
                  <tr>
                    <th>Option</th>
                    <th>Description</th>
                    <th className="amount">Estimated Net to Seller*</th>
                    <th>Estimated Timeline</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <strong>Option A — Guaranteed Cash</strong>
                    </td>
                    <td>As-is purchase for cash with no repairs required by Seller.</td>
                    <td className="amount">{money(loi.cash)}</td>
                    <td>Approximately {loi.daysCash} days from clear title.</td>
                  </tr>
                  {loi.hasNov && (
                    <tr>
                      <td>
                        <strong>Option B — Partnership / Novation</strong>
                      </td>
                      <td>Buyer funds & manages improvements; Seller participates in upside.</td>
                      <td className="amount">{money(loi.nov)}</td>
                      <td>Approximately {loi.daysNov} days from clear title and project start.</td>
                    </tr>
                  )}
                </tbody>
              </table>
              <p className="loi-small">
                *'Estimated Net to Seller' reflects our current underwriting of repairs, carrying
                costs, and market conditions in your area. Final numbers are subject to onsite
                verification, clean title, and mutually executed purchase documents.
              </p>
            </div>

            <div className="loi-section">
              <div className="loi-section-title">3. As-Is Valuation Basis</div>
              <p>
                Our current internal valuation ('As-Is Value') for the property is{' '}
                <strong>{money(loi.asis)}</strong>, based on a combination of comparable sales,
                local market trends, and the condition information provided to us as of the date of
                this LOI.
              </p>
              <p className="loi-small">
                This As-Is Value is not a formal appraisal and is used solely for internal
                underwriting and offer modeling.
              </p>
            </div>

            <div className="loi-section">
              <div className="loi-section-title">4. Closing & Contingencies</div>
              <ul className="loi-small" style={{ marginTop: '4px' }}>
                <li>
                  Transaction subject to clear and marketable title in Buyer's sole discretion.
                </li>
                <li>Buyer to conduct a brief onsite inspection and/or walkthrough to confirm scope.</li>
                <li>
                  No traditional repairs required by Seller; property conveyed in 'as-is' condition.
                </li>
                <li>Seller may leave unwanted personal property at closing by mutual agreement.</li>
              </ul>
            </div>

            <div className="loi-section">
              <div className="loi-section-title">5. Non-Binding Nature</div>
              <p className="loi-small">
                This LOI is intended solely as a good-faith summary of proposed business terms and
                does not constitute a binding agreement to purchase the property. A binding
                obligation will arise only upon execution of a formal purchase agreement (or
                novation/partnership agreement, if elected) signed by both Buyer and Seller.
              </p>
            </div>

            <div className="loi-section">
              <div className="loi-section-title">6. Next Steps</div>
              <ol className="loi-small" style={{ marginTop: '4px' }}>
                <li>Confirm a 10-15 minute onsite walkthrough or virtual tour.</li>
                <li>Buyer finalizes scope, title review, and timeline with Seller.</li>
                <li>Buyer issues formal purchase agreement for electronic signature.</li>
              </ol>
            </div>

            <div className="loi-section" style={{ marginTop: '10px' }}>
              <p>Sincerely,</p>
              <p>
                <strong>Justin Erickson</strong>
                <br />
                CEO, Local Home Buyers USA
                <br />
                Phone: 1-800-858-0588
                <br />
                Email: sales@localhomebuyersusa.com
              </p>
            </div>
          </div>
        </div>
        <div className="loi-footer">
          <div className="loi-footer-actions">
            <button type="button" id="loi_copy_btn" className="loi-btn" onClick={copyLOIText}>
              Copy LOI Text
            </button>
            <button
              type="button"
              id="loi_print_btn"
              className="loi-btn primary"
              onClick={printLOI}
            >
              Print / Save as PDF
            </button>
          </div>
          <div className="loi-badge">
            Local Home Buyers USA — powered by PropTechUSA.ai
          </div>
        </div>
      </div>
    </div>
  );
}

