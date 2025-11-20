'use client';

import { useState } from 'react';
import { Calculator, Home, Wrench, Paintbrush, AlertTriangle } from 'lucide-react';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState('exterior');
  const [arv, setArv] = useState('');
  const [repairs, setRepairs] = useState('');

  // Calculate values
  const arvNum = parseFloat(arv) || 0;
  const repairsNum = parseFloat(repairs) || 0;
  const maxOffer = arvNum * 0.7 - repairsNum;
  const projectedProfit = arvNum - maxOffer - repairsNum;
  const profitMargin = arvNum > 0 ? (projectedProfit / arvNum) * 100 : 0;
  
  // Deal Safety Score (0-100) based on profit margin
  const dealSafetyScore = Math.max(0, Math.min(100, profitMargin * 2));

  const tabs = [
    { id: 'exterior', label: 'Exterior', icon: Home },
    { id: 'systems', label: 'Systems', icon: Wrench },
    { id: 'interior', label: 'Interior', icon: Paintbrush },
    { id: 'friction', label: 'Friction', icon: AlertTriangle },
  ];

  const conditionItems = {
    exterior: [
      { label: 'Roof', placeholder: 'Enter condition...' },
      { label: 'Siding', placeholder: 'Enter condition...' },
      { label: 'Foundation', placeholder: 'Enter condition...' },
      { label: 'Windows', placeholder: 'Enter condition...' },
      { label: 'Gutters', placeholder: 'Enter condition...' },
    ],
    systems: [
      { label: 'HVAC', placeholder: 'Enter condition...' },
      { label: 'Electrical', placeholder: 'Enter condition...' },
      { label: 'Plumbing', placeholder: 'Enter condition...' },
      { label: 'Water Heater', placeholder: 'Enter condition...' },
      { label: 'Appliances', placeholder: 'Enter condition...' },
    ],
    interior: [
      { label: 'Flooring', placeholder: 'Enter condition...' },
      { label: 'Walls', placeholder: 'Enter condition...' },
      { label: 'Kitchen', placeholder: 'Enter condition...' },
      { label: 'Bathrooms', placeholder: 'Enter condition...' },
      { label: 'Paint', placeholder: 'Enter condition...' },
    ],
    friction: [
      { label: 'Tenant Issues', placeholder: 'Enter details...' },
      { label: 'Title Issues', placeholder: 'Enter details...' },
      { label: 'Liens', placeholder: 'Enter details...' },
      { label: 'Code Violations', placeholder: 'Enter details...' },
      { label: 'Other Concerns', placeholder: 'Enter details...' },
    ],
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Top Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-slate-900">Analyst View</h1>
            <span className="rounded-full bg-emerald-100 px-4 py-1.5 text-sm font-semibold text-emerald-700">
              Mission Control
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Left Column - Condition Matrix */}
          <div className="lg:col-span-2">
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200">
                <div className="flex space-x-1 p-2">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                          activeTab === tab.id
                            ? 'bg-slate-900 text-white'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-6">
                <h2 className="mb-4 text-xl font-semibold text-slate-900">
                  {tabs.find((t) => t.id === activeTab)?.label} Condition Matrix
                </h2>
                <div className="overflow-hidden rounded-lg border border-slate-200">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">
                          Item
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">
                          Condition
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {conditionItems[activeTab as keyof typeof conditionItems].map(
                        (item, index) => (
                          <tr
                            key={index}
                            className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
                          >
                            <td className="px-4 py-3 text-sm font-medium text-slate-900">
                              {item.label}
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                placeholder={item.placeholder}
                                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                              />
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Comp Calculator */}
          <div className="lg:col-span-1">
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center gap-2">
                <Calculator className="h-5 w-5 text-emerald-600" />
                <h2 className="text-xl font-semibold text-slate-900">Comp Calculator</h2>
              </div>

              {/* Inputs */}
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    ARV (After Repair Value)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                      $
                    </span>
                    <input
                      type="number"
                      value={arv}
                      onChange={(e) => setArv(e.target.value)}
                      placeholder="0.00"
                      className="w-full rounded-md border border-slate-300 bg-white pl-8 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Estimated Repairs
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                      $
                    </span>
                    <input
                      type="number"
                      value={repairs}
                      onChange={(e) => setRepairs(e.target.value)}
                      placeholder="0.00"
                      className="w-full rounded-md border border-slate-300 bg-white pl-8 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>
              </div>

              {/* Outputs */}
              <div className="mt-6 space-y-4 border-t border-slate-200 pt-6">
                <div className="rounded-md bg-slate-50 p-4">
                  <div className="mb-1 text-xs font-medium text-slate-600">
                    Max Allowable Offer
                  </div>
                  <div className="text-2xl font-bold text-slate-900">
                    ${maxOffer.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="rounded-md bg-emerald-50 p-4">
                  <div className="mb-1 text-xs font-medium text-emerald-700">
                    Projected Profit
                  </div>
                  <div className="text-2xl font-bold text-emerald-700">
                    ${projectedProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>

                {/* Deal Safety Score */}
                <div className="mt-6">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">
                      Deal Safety Score
                    </span>
                    <span className="text-sm font-semibold text-slate-900">
                      {dealSafetyScore.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                      style={{ width: `${dealSafetyScore}%` }}
                    />
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    Based on profit margin: {profitMargin.toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
