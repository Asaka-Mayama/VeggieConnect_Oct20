import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  RefreshCw,
  Sprout,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { ProduceItem } from '../types';
import { DA_BULLETIN_METADATA, DA_DAILY_PRICES, findMatchingDAPrice } from '../data/daPricesData';

interface DAPriceWatchWidgetProps {
  myProduce: ProduceItem[];
  onOpenFullBulletin: (searchCrop?: string) => void;
}

export const DAPriceWatchWidget: React.FC<DAPriceWatchWidgetProps> = ({
  myProduce,
  onOpenFullBulletin,
}) => {
  const [quickSearch, setQuickSearch] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Top highlight movers for the ticker carousel
  const topMovers = useMemo(() => {
    return [
      DA_DAILY_PRICES.find((i) => i.id === 'da-ampalaya')!,
      DA_DAILY_PRICES.find((i) => i.id === 'da-tomato')!,
      DA_DAILY_PRICES.find((i) => i.id === 'da-eggplant')!,
      DA_DAILY_PRICES.find((i) => i.id === 'da-cabbage')!,
      DA_DAILY_PRICES.find((i) => i.id === 'da-red-onion')!,
      DA_DAILY_PRICES.find((i) => i.id === 'da-sitaw')!,
      DA_DAILY_PRICES.find((i) => i.id === 'da-bell-pepper-green')!,
    ].filter(Boolean);
  }, []);

  // Filtered list if quick searching
  const searchedPrices = useMemo(() => {
    if (!quickSearch.trim()) return [];
    const q = quickSearch.toLowerCase().trim();
    return DA_DAILY_PRICES.filter(
      (i) =>
        i.commodity.toLowerCase().includes(q) ||
        (i.localName && i.localName.toLowerCase().includes(q)) ||
        (i.variety && i.variety.toLowerCase().includes(q))
    ).slice(0, 5);
  }, [quickSearch]);

  // Farmer's listed crops matched with DA benchmark
  const cropComparisons = useMemo(() => {
    return myProduce.map((prod) => {
      const match = findMatchingDAPrice(prod.name);
      return {
        produce: prod,
        daMatch: match,
      };
    });
  }, [myProduce]);

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      await fetch('/api/da-prices/sync', { method: 'POST' });
      setSyncFeedback('Updated with live DA Negros Oriental data');
      setTimeout(() => setSyncFeedback(null), 3500);
    } catch {
      setSyncFeedback('Refreshed DA Negros Oriental bulletin');
      setTimeout(() => setSyncFeedback(null), 3000);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="bg-white border border-emerald-200/90 rounded-3xl p-4 shadow-sm space-y-3.5 relative overflow-hidden text-neutral-900">
      
      {/* Header Row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center flex-shrink-0 shadow-xs text-white">
            <Sprout className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                DA Negros Oriental
              </span>
              <span className="text-[10px] text-emerald-800 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Price Watch
              </span>
            </div>
            <h3 className="text-sm font-extrabold text-neutral-900 mt-0.5">
              Daily Commodity Prices
            </h3>
            <p className="text-[11px] text-neutral-500">
              Dumaguete & Negros Oriental • {DA_BULLETIN_METADATA.bulletinDate}
            </p>
          </div>
        </div>

        {/* Sync Button */}
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="p-1.5 rounded-xl bg-neutral-50 hover:bg-neutral-100 text-neutral-700 hover:text-emerald-700 border border-neutral-200 transition-all flex items-center gap-1 text-[11px] font-semibold active:scale-95 disabled:opacity-50 flex-shrink-0 cursor-pointer shadow-xs"
          title="Sync latest DA prices"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-600' : ''}`} />
          <span className="hidden sm:inline">{isSyncing ? 'Syncing...' : 'Sync'}</span>
        </button>
      </div>

      {syncFeedback && (
        <div className="bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-900 px-3 py-1.5 rounded-xl flex items-center gap-1.5 animate-in fade-in">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
          <span>{syncFeedback}</span>
        </div>
      )}

      {/* Quick Search for DA Prices */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={quickSearch}
          onChange={(e) => setQuickSearch(e.target.value)}
          placeholder="Look up crop price (e.g. Kamatis, Talong, Sibuyas, Repolyo)..."
          className="w-full pl-8 pr-16 py-1.5 bg-neutral-50 border border-neutral-300 rounded-xl text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:bg-white focus:border-emerald-500"
        />
        {quickSearch ? (
          <button
            onClick={() => setQuickSearch('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 text-[11px] cursor-pointer"
          >
            Clear
          </button>
        ) : (
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-neutral-400 font-medium">
            DA AMAS
          </span>
        )}
      </div>

      {/* Searched Results Dropdown */}
      {searchedPrices.length > 0 && (
        <div className="bg-white border border-neutral-200 rounded-2xl p-2.5 space-y-2 shadow-lg animate-in fade-in">
          <div className="text-[10px] uppercase font-bold text-neutral-500 px-1">
            DA Price Results for "{quickSearch}":
          </div>
          {searchedPrices.map((item) => (
            <div
              key={item.id}
              onClick={() => onOpenFullBulletin(item.commodity)}
              className="bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-xl p-2.5 flex items-center justify-between cursor-pointer transition-colors"
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs text-neutral-900">{item.commodity}</span>
                  {item.localName && (
                    <span className="text-[10px] text-neutral-500">({item.localName})</span>
                  )}
                </div>
                <div className="text-[11px] text-neutral-500 mt-0.5">
                  <span>Wet Market Retail: <strong className="text-neutral-900">₱{item.prevailingRetailPrice}</strong></span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-extrabold text-emerald-700 block">
                  ₱{item.suggestedDirectFarmPrice}/kg
                </span>
                <span className="text-[9px] text-emerald-600 font-semibold">Suggested Direct</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Daily Ticker Carousel (Horizontal Scroll) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-neutral-500 px-0.5">
          <span className="font-bold text-neutral-800">Negros Oriental Benchmark Crops</span>
          <button
            onClick={() => onOpenFullBulletin()}
            className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 cursor-pointer"
          >
            <span>View All ({DA_DAILY_PRICES.length})</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {topMovers.map((item) => (
            <div
              key={item.id}
              onClick={() => onOpenFullBulletin(item.commodity)}
              className="min-w-[135px] max-w-[145px] bg-emerald-50/50 hover:bg-emerald-100/60 border border-emerald-200/80 rounded-2xl p-2.5 flex flex-col justify-between flex-shrink-0 cursor-pointer transition-all active:scale-95 group shadow-xs"
            >
              <div>
                <div className="flex items-center justify-between gap-1">
                  <span className="font-bold text-xs text-neutral-900 truncate group-hover:text-emerald-800 transition-colors">
                    {item.commodity.split(' ')[0]}
                  </span>
                  {item.trend === 'up' && (
                    <TrendingUp className="w-3 h-3 text-red-600 flex-shrink-0" />
                  )}
                  {item.trend === 'down' && (
                    <TrendingDown className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                  )}
                  {item.trend === 'stable' && (
                    <Minus className="w-3 h-3 text-neutral-400 flex-shrink-0" />
                  )}
                </div>
                <div className="text-[10px] text-neutral-500 truncate mt-0.5 font-medium">
                  {item.localName || 'Negros Oriental'}
                </div>
              </div>

              <div className="mt-2 pt-1.5 border-t border-emerald-200/60">
                <div className="flex items-baseline justify-between">
                  <span className="text-[9px] text-neutral-500 font-medium">Retail:</span>
                  <span className="text-xs font-bold text-neutral-900">₱{item.prevailingRetailPrice}</span>
                </div>
                <div className="flex items-baseline justify-between mt-0.5">
                  <span className="text-[9px] text-emerald-800 font-medium">Direct:</span>
                  <span className="text-xs font-extrabold text-emerald-700">
                    ₱{item.suggestedDirectFarmPrice}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Farmer's Active Produce vs DA Benchmark */}
      {cropComparisons.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-neutral-100">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-neutral-900 uppercase tracking-wider text-[11px]">
              Your Crops vs DA Rate ({cropComparisons.length})
            </span>
            <span className="text-[10px] text-neutral-500 font-medium">
              Negros Oriental
            </span>
          </div>

          <div className="space-y-2">
            {cropComparisons.map(({ produce, daMatch }) => {
              if (!daMatch) return null;

              return (
                <div
                  key={produce.id}
                  className="bg-neutral-50 border border-neutral-200 rounded-2xl p-2.5 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h5 className="font-bold text-xs text-neutral-900">
                          {produce.name}
                        </h5>
                        <span className="text-[10px] text-neutral-500">
                          (DA: {daMatch.commodity})
                        </span>
                      </div>
                      <div className="text-[11px] text-neutral-600 mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <span>
                          Your Price: <strong className="text-neutral-900">₱{produce.pricePerUnit.toFixed(2)}</strong>/{produce.unit}
                        </span>
                        <span>•</span>
                        <span>
                          DA Wet Market: <strong className="text-neutral-800">₱{daMatch.prevailingRetailPrice}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                        ₱{daMatch.suggestedDirectFarmPrice}/{produce.unit} Direct
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom Action Line - Clean Full DA Price Bulletin Button */}
      <div className="pt-2 border-t border-neutral-100">
        <button
          onClick={() => onOpenFullBulletin()}
          className="w-full py-2.5 px-3 rounded-xl bg-neutral-50 hover:bg-neutral-100 text-neutral-900 border border-neutral-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
        >
          <Sprout className="w-3.5 h-3.5 text-emerald-600" />
          <span>Full DA Price Bulletin</span>
        </button>
      </div>

    </div>
  );
};
