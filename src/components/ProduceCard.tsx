import React from 'react';
import { Plus, Check, Flame, Sprout } from 'lucide-react';
import { ProduceItem } from '../types';

/**
 * Buyer-facing origin — province level only ("Negros Oriental").
 * Farmers are anonymous: no farmer names, farm names, or "(Farmer)" text.
 */
export const getBuyerOriginLabel = (): string => 'Negros Oriental';

/** "Harvested Today" shows only when the admin displayed/stocked the item today. */
export const isStockedToday = (produce: ProduceItem): boolean => {
  const ref = (produce as any).boughtAt || (produce as any).createdAt;
  if (ref) {
    const d = new Date(ref);
    if (!isNaN(d.getTime())) {
      const now = new Date();
      return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
      );
    }
  }
  return (produce.harvestStatus || '') === 'Harvested Today';
};

interface ProduceCardProps {
  produce: ProduceItem;
  onSelect: (produce: ProduceItem) => void;
  onAddToCart: (produce: ProduceItem, e: React.MouseEvent) => void;
  isInCart?: boolean;
  isBuyer?: boolean;
}

export const ProduceCard: React.FC<ProduceCardProps> = ({
  produce,
  onSelect,
  onAddToCart,
  isInCart = false,
  isBuyer = true,
}) => {
  if (!produce) return null;

  const price = typeof produce.pricePerUnit === 'number' ? produce.pricePerUnit : parseFloat(produce.pricePerUnit) || 0;
  const stock = typeof produce.stockQuantity === 'number' ? produce.stockQuantity : parseInt(produce.stockQuantity as any, 10) || 0;
  const name = produce.name || 'Fresh Produce';
  const imageUrl = produce.imageUrl || 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80';
  // Buyer view: farmer identities are hidden. "Harvested Today" appears only
  // when the admin put the item on display today — otherwise no badge at all.
  const showHarvestedToday = isBuyer ? isStockedToday(produce) : (produce.harvestStatus || '') === 'Harvested Today';
  const originLabel = getBuyerOriginLabel();

  return (
    <div
      id={`produce-card-${produce.id}`}
      onClick={() => onSelect(produce)}
      className="group bg-white rounded-2xl border border-emerald-200/80 overflow-hidden hover:border-emerald-500 hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col shadow-xs"
    >
      {/* Image Container */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-emerald-50">
        <img
          src={imageUrl}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80';
          }}
        />

        {/* Gradient Overlay for badges */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

        {/* Harvest Status Badge — buyers see "Harvested Today" only when the
            admin displayed the item today; no badge otherwise. Never shows
            "Fresh Picked on Order" or farmer-side statuses. */}
        {showHarvestedToday && (
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-md flex items-center gap-1 shadow-xs bg-emerald-600 text-white">
              <Flame className="w-3 h-3 text-amber-300 fill-amber-300" />
              Harvested Today
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 flex-1 flex flex-col justify-between">
        <div>
          {/* Sourcing — buyers see the store + province-level origin only.
              Farmer and farm names are never shown to buyers. */}
          <div className="flex items-center justify-between gap-1 text-[11px] text-emerald-800 mb-0.5">
            <span className="truncate font-bold">
              {isBuyer ? `VeggieConnect Store • ${originLabel}` : produce.farmName || 'Local Farm'}
            </span>
          </div>

          {/* Produce Name — variety hidden from buyers */}
          <h3 className="font-bold text-sm text-emerald-950 line-clamp-1 group-hover:text-emerald-700 transition-colors">
            {name}
          </h3>

          {/* Origin line for buyers — province only, farmers anonymous */}
          {isBuyer && (
            <div className="flex items-center gap-1 text-[10px] text-neutral-500 mt-1.5">
              <Sprout className="w-3 h-3 text-emerald-600" />
              <span className="truncate">Fresh harvest in {originLabel}</span>
            </div>
          )}
        </div>

        {/* Pricing & Add to Cart */}
        <div className="mt-2.5 pt-2 border-t border-emerald-100 flex items-center justify-between">
          <div>
            <div className="flex items-baseline gap-0.5">
              <span className="text-base font-black text-emerald-950">
                ₱{price.toFixed(2)}
              </span>
              <span className="text-[11px] text-neutral-500 font-medium">
                /kg
              </span>
            </div>
            <span className="text-[10px] text-emerald-700 font-semibold block">
              {stock > 0 ? `${stock} kg left` : 'Sold out'}
            </span>
          </div>

          {isBuyer && (
            <button
              id={`btn-add-cart-${produce.id}`}
              onClick={(e) => onAddToCart(produce, e)}
              disabled={stock === 0}
              className={`min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center transition-all duration-150 active:scale-90 cursor-pointer shadow-xs ${
                isInCart
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'bg-emerald-50 hover:bg-emerald-600 text-emerald-800 hover:text-white border border-emerald-200 hover:border-emerald-600'
              }`}
              title="Add to Direct Market Cart"
            >
              {isInCart ? <Check className="w-4 h-4 stroke-[3]" /> : <Plus className="w-4 h-4 stroke-[2.5]" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
