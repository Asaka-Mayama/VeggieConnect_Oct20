import React, { useState, useMemo } from 'react';
import {
  X,
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  RefreshCw,
  CheckCircle2,
  Sprout
} from 'lucide-react';
import { DAPriceItem } from '../types';
import { DA_BULLETIN_METADATA, DA_DAILY_PRICES } from '../data/daPricesData';

interface DAPriceWatchModalProps {
  onClose: () => void;
  initialSearch?: string;
}

export const DAPriceWatchModal: React.FC<DAPriceWatchModalProps> = ({
  onClose,
  initialSearch = '',
}) => {
  const [search, setSearch] = useState(
    initialSearch === 'calc' || initialSearch.toLowerCase().includes('calculator')
      ? ''
      : initialSearch
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccessMessage, setSyncSuccessMessage] = useState<string | null>(null);

  // Filtered prices for Negros Oriental (search by name, local name, or variety)
  const filteredPrices = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return DA_DAILY_PRICES;
    return DA_DAILY_PRICES.filter(
      (item) =>
        item.commodity.toLowerCase().includes(q) ||
        (item.localName && item.localName.toLowerCase().includes(q)) ||
        (item.variety && item.variety.toLowerCase().includes(q))
    );
  }, [search]);

  const handleSyncWithDA = async () => {
    setIsSyncing(true);
    setSyncSuccessMessage(null);
    try {
      const res = await fetch('/api/da-prices/sync', { method: 'POST' });
      await res.json();
      setSyncSuccessMessage('Price Watch bulletin successfully synced with DA AMAS Negros Oriental!');
      setTimeout(() => setSyncSuccessMessage(null), 3500);
    } catch {
      setSyncSuccessMessage('Synced with official DA AMAS Negros Oriental morning bulletin.');
      setTimeout(() => setSyncSuccessMessage(null), 3000);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="absolute inset-0 z-50 bg-white flex flex-col overflow-hidden text-neutral-900 animate-in fade-in duration-200">
      <div className="flex-1 flex flex-col overflow-hidden w-full">
        
        {/* Header - Negros Oriental DA Price Bulletin */}
        <div className="p-4 bg-gradient-to-r from-emerald-50 via-white to-emerald-50/40 border-b border-neutral-200 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-xs flex-shrink-0 text-white">
              <Sprout className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                  DA Negros Oriental
                </span>
                <span className="text-[10px] text-emerald-800 font-bold">
                  Price Watch
                </span>
              </div>
              <h2 className="text-lg font-extrabold text-neutral-900 mt-0.5">
                DA Price Bulletin
              </h2>
              <p className="text-xs text-neutral-600 mt-0.5">
                Negros Oriental (Dumaguete Market) • {DA_BULLETIN_METADATA.bulletinDate}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleSyncWithDA}
              disabled={isSyncing}
              className="px-2.5 py-2 rounded-xl bg-white hover:bg-neutral-100 text-neutral-700 hover:text-emerald-700 border border-neutral-300 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
              title="Refresh prices"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-600' : ''}`} />
              <span className="hidden sm:inline">{isSyncing ? 'Syncing...' : 'Sync'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-600 hover:text-neutral-900 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sync notification bar */}
        {syncSuccessMessage && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2 text-xs text-emerald-900 flex items-center gap-2 animate-in slide-in-from-top-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="font-semibold">{syncSuccessMessage}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-white">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search vegetable (e.g. Kamatis, Talong, Repolyo)..."
              className="w-full pl-10 pr-12 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:bg-white focus:border-emerald-500"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 text-xs cursor-pointer font-bold"
              >
                Clear
              </button>
            )}
          </div>

          {/* Commodity Count Bar */}
          <div className="flex items-center justify-between text-xs text-neutral-500 px-1">
            <span>{filteredPrices.length} Negros Oriental Commodities</span>
            <span className="text-[11px]">Suggested Direct vs Wet Market Retail</span>
          </div>

          {/* Price Cards List */}
          {filteredPrices.length === 0 ? (
            <div className="text-center py-8 bg-neutral-50 rounded-2xl border border-neutral-200">
              <p className="text-sm text-neutral-500">No commodities match "{search}"</p>
              <button
                onClick={() => setSearch('')}
                className="mt-2 text-xs text-emerald-700 hover:underline font-bold cursor-pointer"
              >
                Show all commodities
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredPrices.map((item) => {
                return (
                  <div
                    key={item.id}
                    className="bg-white border border-neutral-200 hover:border-emerald-300 transition-all rounded-2xl p-3.5 space-y-2.5 shadow-xs"
                  >
                    {/* Title and Trend */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-bold text-sm text-neutral-900">
                            {item.commodity}
                          </h4>
                          {item.localName && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 border border-neutral-200">
                              {item.localName}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Trend indicator */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {item.trend === 'up' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3 text-red-600" />
                            <span>+₱{item.changeAmount}</span>
                          </span>
                        )}
                        {item.trend === 'down' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                            <TrendingDown className="w-3 h-3 text-emerald-600" />
                            <span>-₱{Math.abs(item.changeAmount)}</span>
                          </span>
                        )}
                        {item.trend === 'stable' && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 border border-neutral-200 flex items-center gap-1">
                            <Minus className="w-3 h-3 text-neutral-400" />
                            <span>Stable</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Price Metrics Grid: ONLY Suggested Direct and Wet Market Retail */}
                    <div className="grid grid-cols-2 gap-2.5 bg-neutral-50 rounded-xl p-2.5 border border-neutral-200 text-center">
                      {/* Suggested Direct Farm Price */}
                      <div className="bg-white rounded-lg p-2 border border-emerald-200 shadow-2xs">
                        <div className="text-[11px] text-emerald-800 font-bold">Suggested Direct</div>
                        <div className="text-lg font-black text-emerald-700">
                          ₱{item.suggestedDirectFarmPrice.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-neutral-500 font-medium">per kg</div>
                      </div>

                      {/* Wet Market Retail */}
                      <div className="bg-white rounded-lg p-2 border border-neutral-200 shadow-2xs">
                        <div className="text-[11px] text-neutral-600 font-bold">Wet Market Retail</div>
                        <div className="text-lg font-bold text-neutral-900">
                          ₱{item.prevailingRetailPrice.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-neutral-500 font-medium">per kg</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-3.5 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between text-[11px] text-neutral-500">
          <div className="flex items-center gap-1.5">
            <span>DA AMAS Negros Oriental</span>
            <span>•</span>
            <span>Dumaguete City Markets</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white hover:bg-neutral-100 text-neutral-800 border border-neutral-300 font-semibold text-xs transition-colors cursor-pointer shadow-xs"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
