import React, { useState, useMemo } from 'react';
import {
  X,
  Clock,
  ShieldCheck,
  Plus,
  Minus,
  Check,
  Store,
  Truck,
  MessageSquare,
  Sprout,
  Info
} from 'lucide-react';
import { ProduceItem, FarmerProfile, UserProfile } from '../types';
import { getBuyerOriginLabel, isStockedToday } from './ProduceCard';

interface ProduceDetailModalProps {
  produce: ProduceItem;
  farmer?: FarmerProfile;
  currentUser?: UserProfile | null;
  registeredUsers?: UserProfile[];
  onClose: () => void;
  onAddToCart: (produce: ProduceItem, quantity: number) => void;
  onDirectChat: (produce: ProduceItem) => void;
  onViewFarm: (farmerId: string) => void;
  isInCart?: boolean;
  isBuyer?: boolean;
  onEditProduce?: (produce: ProduceItem) => void;
}

export const ProduceDetailModal: React.FC<ProduceDetailModalProps> = ({
  produce,
  farmer,
  currentUser,
  registeredUsers = [],
  onClose,
  onAddToCart,
  onDirectChat,
  onViewFarm,
  isInCart = false,
  isBuyer = true,
  onEditProduce,
}) => {
  const [quantity, setQuantity] = useState(1);
  const [addedAnimation, setAddedAnimation] = useState(false);

  // Check if this produce belongs to current user
  const isOwnProduce = Boolean(
    currentUser &&
      (produce.farmerId === currentUser.id ||
        (currentUser.name && produce.farmerName && currentUser.name.toLowerCase() === produce.farmerName.toLowerCase()) ||
        (currentUser.farmName && produce.farmName && currentUser.farmName.toLowerCase() === produce.farmName.toLowerCase()))
  );

  // Check if farmer is registered
  const isFarmerRegistered =
    registeredUsers.length > 0 &&
    registeredUsers.some(
      (u) =>
        u.id === produce.farmerId ||
        (u.name && produce.farmerName && u.name.toLowerCase() === produce.farmerName.toLowerCase()) ||
        (u.farmName && produce.farmName && u.farmName.toLowerCase() === produce.farmName.toLowerCase())
    );

  const rawPrice = typeof produce.pricePerUnit === 'number' ? produce.pricePerUnit : parseFloat(produce.pricePerUnit as any) || 0;

  // Bulk discount calculation
  const bulkDiscountActive =
    produce.bulkDiscount && quantity >= produce.bulkDiscount.minQty;
  const effectivePrice = bulkDiscountActive
    ? rawPrice * (1 - produce.bulkDiscount!.discountPercent / 100)
    : rawPrice;

  const totalPrice = (effectivePrice * quantity).toFixed(2);

  // Buyer anonymity: origin is province level only ("Negros Oriental") —
  // never farmer or farm names.
  const buyerOriginLabel = getBuyerOriginLabel();
  // "Harvested Today" shows only when the admin put the item on display today.
  const buyerShowHarvestedToday = isBuyer ? isStockedToday(produce) : true;

  const handleAdd = () => {
    onAddToCart(produce, quantity);
    setAddedAnimation(true);
    setTimeout(() => {
      setAddedAnimation(false);
      onClose();
    }, 500);
  };

  return (
    <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end sm:justify-center p-0 animate-in fade-in duration-200">
      <div
        id="produce-detail-modal"
        className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-h-[92%] overflow-y-auto shadow-2xl flex flex-col text-neutral-900 border-t sm:border border-emerald-100"
      >
        {/* Top Image Hero Banner */}
        <div className="relative h-64 w-full bg-emerald-950 flex-shrink-0">
          <img
            src={produce.imageUrl}
            alt={produce.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />

          {/* Close Button */}
          <div className="absolute top-3.5 right-3.5">
            <button
              id="btn-close-produce-modal"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/70 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Harvest tag bottom-left */}
          <div className="absolute bottom-3.5 left-4 flex flex-wrap items-center gap-2">
            {buyerShowHarvestedToday && (
              <span className="bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-xs">
                Harvested Today
              </span>
            )}
            <span className="bg-black/60 backdrop-blur-xs text-white text-xs px-2.5 py-1 rounded-full flex items-center gap-1 font-semibold">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              Fresh harvest in {isBuyer ? buyerOriginLabel : produce.harvestDate || 'Today'}
            </span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex-1 space-y-4">
          {/* Header Title & Price */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold text-emerald-950 font-display">
                {produce.name}
              </h2>
              {!isBuyer && produce.variety && (
                <p className="text-xs text-emerald-700 font-bold mt-0.5">
                  Variety: {produce.variety}
                </p>
              )}
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-2xl font-black text-emerald-950">
                ₱{rawPrice.toFixed(2)}
              </div>
              <div className="text-xs text-neutral-500 font-medium">per kg</div>
            </div>
          </div>

          {/* Store & Sourcing Guarantee Card */}
          <div className="bg-emerald-50/80 border border-emerald-200/90 rounded-2xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-base shadow-xs flex-shrink-0">
                <Store className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <span className="font-extrabold text-sm text-emerald-950">
                    {isBuyer ? 'VeggieConnect Supermarket' : produce.farmName}
                  </span>
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                </div>
                {!isBuyer && (
                  <div className="flex items-center gap-2 text-xs text-emerald-800 font-medium">
                    <span>{`Farmer: ${produce.farmerName}`}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isOwnProduce ? (
                <span
                  id="tag-own-produce"
                  className="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold"
                  title="This produce is listed by you"
                >
                  Your Listing
                </span>
              ) : (
                <button
                  id="btn-direct-chat-seller"
                  onClick={() => onDirectChat(produce)}
                  className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all"
                  title="Chat with Seller (Admin)"
                >
                  <MessageSquare className="w-4 h-4 text-emerald-700" />
                  <span>Chat Seller</span>
                </button>
              )}
            </div>
          </div>

          {/* Produce Story / Description */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900 mb-1">
              Harvest & Quality Details
            </h4>
            <p className="text-sm text-neutral-600 leading-relaxed font-medium">
              {isBuyer
                ? `Fresh harvest in ${buyerOriginLabel}. Inspected and stocked in VeggieConnect Supermarket for retail buyers.`
                : produce.description}
            </p>
          </div>

          {/* Key Attributes Badges */}
          <div className="bg-emerald-50/70 p-3 rounded-2xl border border-emerald-200/70 flex items-center gap-2.5 text-xs">
            <Truck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <div>
              <div className="text-[10px] text-emerald-800 uppercase font-bold">Farm-Fresh Quality</div>
              <div className="font-bold text-emerald-950">Quality-inspected & packed by VeggieConnect Store</div>
            </div>
          </div>

          {/* Bulk Discount Notice */}
          {produce.bulkDiscount && (
            <div className="bg-emerald-100/70 border border-emerald-300 rounded-2xl p-3 text-xs text-emerald-950 flex items-center justify-between">
              <div>
                <span className="font-bold">Wholesale Volume Discount: </span>
                Buy {produce.bulkDiscount.minQty}+ kg & save {produce.bulkDiscount.discountPercent}%!
              </div>
              {bulkDiscountActive && (
                <span className="bg-emerald-700 text-white px-2 py-0.5 rounded-full font-bold text-[10px]">
                  ACTIVE
                </span>
              )}
            </div>
          )}

          {/* Supermarket Store Quality Guarantee */}
          <div className="bg-emerald-50/40 border border-emerald-200/60 rounded-2xl p-3.5 text-xs text-neutral-600">
            <div className="flex items-center gap-1.5 font-bold text-emerald-900 mb-0.5">
              <Store className="w-4 h-4 text-emerald-700" /> VeggieConnect Fresh Quality Guarantee
            </div>
            <p className="text-[11px] leading-relaxed">
              Every vegetable is procured directly from local accredited farmers, quality-certified, and stocked in the VeggieConnect Supermarket for rapid doorstep delivery by our seller team.
            </p>
          </div>
        </div>

        {/* Bottom Sticky Action Bar */}
        {isBuyer ? (
          <div className="p-4 bg-white border-t border-emerald-100 flex items-center justify-between gap-3 sticky bottom-0 shadow-lg">
            {/* Quantity Stepper */}
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-2xl p-1">
              <button
                id="btn-decrease-qty"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                className="w-10 h-10 rounded-xl bg-white hover:bg-emerald-100 disabled:opacity-40 text-emerald-950 font-bold flex items-center justify-center transition-colors cursor-pointer shadow-xs active:scale-95"
              >
                <Minus className="w-4 h-4 stroke-[2.5]" />
              </button>
              <span className="w-8 text-center font-extrabold text-sm text-emerald-950">
                {quantity}
              </span>
              <button
                id="btn-increase-qty"
                onClick={() => setQuantity(Math.min(produce.stockQuantity, quantity + 1))}
                disabled={quantity >= produce.stockQuantity}
                className="w-10 h-10 rounded-xl bg-white hover:bg-emerald-100 disabled:opacity-40 text-emerald-950 font-bold flex items-center justify-center transition-colors cursor-pointer shadow-xs active:scale-95"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            {/* Add to Cart Button */}
            <button
              id="btn-add-to-market-cart"
              onClick={handleAdd}
              disabled={produce.stockQuantity === 0}
              className={`flex-1 min-h-[48px] py-3 px-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 shadow-xs cursor-pointer ${
                addedAnimation
                  ? 'bg-emerald-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {addedAnimation ? (
                <>
                  <Check className="w-4 h-4 stroke-[3]" /> Added to Basket!
                </>
              ) : (
                <>
                  <span>Add {quantity} kg</span>
                  <span>•</span>
                  <span>₱{totalPrice}</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="p-4 bg-white border-t border-emerald-100 flex items-center justify-between gap-3 sticky bottom-0 shadow-lg">
            <div className="text-xs text-neutral-600 flex items-center gap-2 font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>Direct Market cart is reserved for Buyer accounts.</span>
            </div>
            {onEditProduce ? (
              <button
                id="btn-modal-edit-crop"
                onClick={() => {
                  onClose();
                  onEditProduce(produce);
                }}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                Edit Crop Listing
              </button>
            ) : (
              <button
                onClick={onClose}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-950 font-bold text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
