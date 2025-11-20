'use client';

import { useState, useEffect } from 'react';
import { money } from '../utils';

const STORE_KEY_DEALS = 'zipin_deal_memory_v110';

interface Deal {
  key: string;
  addr: string;
  zip: string;
  cashNet: number;
  novNet: number;
  band: string;
  lesi?: string;
  bdi?: string;
  createdAt: number;
  data: any;
}

interface DealSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onLoadDeal: (deal: Deal) => void;
}

export default function DealSidebar({ isOpen, onToggle, onLoadDeal }: DealSidebarProps) {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const loadDeals = (): Deal[] => {
      try {
        return JSON.parse(localStorage.getItem(STORE_KEY_DEALS) || '[]');
      } catch (e) {
        return [];
      }
    };
    setDeals(loadDeals());
  }, []);

  const clearDeals = () => {
    try {
      localStorage.setItem(STORE_KEY_DEALS, JSON.stringify([]));
      setDeals([]);
    } catch (e) {
      // Ignore
    }
  };

  // Refresh deals when sidebar opens
  useEffect(() => {
    if (isOpen && isClient) {
      try {
        const loaded = JSON.parse(localStorage.getItem(STORE_KEY_DEALS) || '[]');
        setDeals(loaded);
      } catch (e) {
        // Ignore
      }
    }
  }, [isOpen, isClient]);

  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        className="deal-sidebar-toggle"
      >
        Deals ▸
      </button>
      <aside
        id="deal_sidebar"
        className={`deal-sidebar ${isOpen ? 'open' : ''}`}
        aria-label="Recent deals"
      >
        <div className="deal-sidebar-header">
          <h3>Deal Memory</h3>
          <p>Recent runs (browser-only). Click to reload.</p>
        </div>
        <div className="deal-sidebar-body">
          <ul id="deal_sidebar_list">
            {deals.length === 0 ? (
              <li className="deal-empty">Run a scenario to save it here.</li>
            ) : (
              deals.map((deal) => {
                const label = deal.addr || (deal.zip ? `ZIP ${deal.zip}` : 'Unnamed deal');
                const bandLabel = deal.band
                  ? deal.band[0].toUpperCase() + deal.band.slice(1)
                  : 'Likely';
                const better =
                  (deal.novNet || 0) > (deal.cashNet || 0) ? 'Upside' : 'Certainty';

                return (
                  <li key={deal.key} className="deal-item">
                    <button
                      type="button"
                      className="deal-item-btn"
                      onClick={() => {
                        onLoadDeal(deal);
                        onToggle();
                      }}
                    >
                      <div className="deal-item-title">{label}</div>
                      <div className="deal-item-sub">
                        {money(deal.cashNet || 0)} cash • {money(deal.novNet || 0)} partner
                      </div>
                      <div className="deal-item-meta">
                        {bandLabel} • {better}
                        {deal.zip ? ` • ${deal.zip}` : ''}
                      </div>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
        <div className="deal-sidebar-footer">
          <span>Local • Private</span>
          <button type="button" onClick={clearDeals}>
            Clear all
          </button>
        </div>
      </aside>
    </>
  );
}

