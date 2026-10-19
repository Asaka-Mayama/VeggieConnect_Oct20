import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  Store,
  Truck,
  ShieldCheck,
  CheckCircle2,
  MapPin,
  Calendar,
  User,
  Phone,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { CartItem, Order, OrderItem, UserProfile } from '../types';

interface CartDrawerProps {
  cart: CartItem[];
  currentUser?: UserProfile | null;
  onUpdateQuantity: (produceId: string, quantity: number) => void;
  onRemoveItem: (produceId: string) => void;
  onClearCart: () => void;
  onOrderPlaced: (order: Order) => void;
  onClose: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  cart,
  currentUser,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onOrderPlaced,
  onClose,
}) => {
  const [deliveryType, setDeliveryType] = useState<'farm_pickup' | 'direct_delivery'>('farm_pickup');
  const [buyerName, setBuyerName] = useState(currentUser?.name || '');
  const [buyerPhone, setBuyerPhone] = useState(currentUser?.phone || '');
  const [deliveryAddress, setDeliveryAddress] = useState(
    currentUser?.location || 'Dumaguete City Proper, Negros Oriental'
  );
  const [pickupSlot, setPickupSlot] = useState('Tomorrow 08:00 AM - 10:00 AM (Valencia Farm Stand)');
  const [paymentMethod, setPaymentMethod] = useState<
    'Cash on Delivery / Pickup' | 'GCash / Maya Mobile Transfer' | 'Direct Bank Transfer / Pera Padala'
  >('GCash / Maya Mobile Transfer');
  const [orderNotes, setOrderNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state if currentUser changes
  useEffect(() => {
    if (currentUser) {
      if (currentUser.name && !buyerName) setBuyerName(currentUser.name);
      if (currentUser.phone && !buyerPhone) setBuyerPhone(currentUser.phone);
      if (currentUser.location && !deliveryAddress) setDeliveryAddress(currentUser.location);
    }
  }, [currentUser]);

  // Group items by Farm
  const itemsByFarm = cart.reduce((acc, item) => {
    const farm = item.produce.farmName;
    if (!acc[farm]) acc[farm] = [];
    acc[farm].push(item);
    return acc;
  }, {} as Record<string, CartItem[]>);

  // Subtotal calculation
  const subtotal = cart.reduce((sum, item) => {
    const unitPrice =
      item.produce.bulkDiscount && item.quantity >= item.produce.bulkDiscount.minQty
        ? item.produce.pricePerUnit * (1 - item.produce.bulkDiscount.discountPercent / 100)
        : item.produce.pricePerUnit;
    return sum + unitPrice * item.quantity;
  }, 0);

  const deliveryFee = deliveryType === 'direct_delivery' ? 45.0 : 0;
  const totalAmount = subtotal + deliveryFee;

  // Estimated direct retail savings (~35% supermarket/middleman markup)
  const estimatedSavings = (subtotal * 0.35).toFixed(2);

  const handleCheckout = () => {
    if (cart.length === 0) return;
    setErrorMessage(null);

    const trimmedName = buyerName.trim();
    const trimmedPhone = buyerPhone.trim();

    if (!trimmedName) {
      setErrorMessage('Please enter your Name so the farmer knows who is ordering.');
      return;
    }

    if (!trimmedPhone) {
      setErrorMessage('Please enter your Mobile / GCash Phone number for delivery updates.');
      return;
    }

    if (deliveryType === 'direct_delivery' && !deliveryAddress.trim()) {
      setErrorMessage('Please enter your delivery street address in Dumaguete/Negros.');
      return;
    }

    setIsSubmitting(true);

    const firstItem = cart[0].produce;

    const orderItems: OrderItem[] = cart.map((item) => ({
      produceId: item.produce.id,
      produceName: item.produce.name,
      imageUrl: item.produce.imageUrl,
      unitPrice: item.produce.pricePerUnit,
      unit: item.produce.unit,
      quantity: item.quantity,
      farmName: item.produce.farmName,
      farmerId: item.produce.farmerId,
    }));

    const newOrder: Order = {
      id: `VC-DGT-${Math.floor(100 + Math.random() * 900)}`,
      buyerId: currentUser?.id || 'user-buyer-1',
      buyerName: trimmedName,
      buyerPhone: trimmedPhone,
      sellerStoreName: 'VeggieConnect Supermarket',
      brokerHubName: 'VeggieConnect Supermarket',
      deliveryType,
      deliveryAddress: deliveryType === 'direct_delivery' ? deliveryAddress.trim() : undefined,
      pickupSlot: deliveryType === 'farm_pickup' ? pickupSlot : undefined,
      items: orderItems,
      subtotal,
      deliveryFee,
      totalAmount,
      status: 'pending',
      createdAt: 'Just now',
      farmerId: firstItem.farmerId,
      farmName: firstItem.farmName || 'VeggieConnect Supermarket',
      paymentMethod,
      notes: orderNotes.trim() || undefined,
      transporterName: undefined,
      vehicleType: deliveryType === 'direct_delivery' ? 'Owner Utility Cargo Hauler' : undefined,
    };

    setTimeout(() => {
      setIsSubmitting(false);
      onOrderPlaced(newOrder);
      onClearCart();
    }, 450);
  };

  return (
    <div className="flex flex-col min-h-full bg-emerald-50/40 p-3.5 relative">
      {/* Title Header */}
      <div className="flex items-center justify-between border-b border-emerald-200/80 pb-3 mb-3.5 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-800">
            <ShoppingBag className="w-4 h-4 text-emerald-700" />
          </div>
          <h2 className="text-base font-extrabold text-emerald-950 font-display">
            Direct Farm Basket ({cart.reduce((s, i) => s + i.quantity, 0)} items)
          </h2>
        </div>
        {cart.length > 0 && (
          <button
            id="btn-clear-cart"
            onClick={onClearCart}
            className="min-h-[36px] px-2.5 py-1 text-xs text-neutral-500 hover:text-red-600 transition-colors flex items-center gap-1 font-semibold cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear All
          </button>
        )}
      </div>

      {cart.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3 my-auto bg-white border border-emerald-100 rounded-3xl shadow-xs">
          <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-3xl">
            🧺
          </div>
          <h3 className="text-base font-bold text-emerald-950 font-display">Your Basket is Empty</h3>
          <p className="text-xs text-neutral-600 max-w-xs leading-relaxed">
            Browse today's morning harvests and order freshly picked produce directly from local growers in Negros!
          </p>
          <button
            id="btn-explore-harvests-empty"
            onClick={onClose}
            className="min-h-[44px] px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs cursor-pointer"
          >
            Explore Today's Fresh Harvests
          </button>
        </div>
      ) : (
        <div className="flex flex-col space-y-3.5 pb-4 flex-1">
          {/* Items grouped by farm */}
          {(Object.entries(itemsByFarm) as [string, CartItem[]][]).map(([farmName, items]) => (
            <div
              key={farmName}
              className="bg-white border border-emerald-200/85 rounded-2xl p-3.5 space-y-3 shadow-xs"
            >
              <div className="flex items-center justify-between text-xs border-b border-emerald-100 pb-2">
                <div className="flex items-center gap-1.5 font-extrabold text-emerald-900">
                  <Store className="w-4 h-4 text-emerald-700" />
                  <span>{farmName}</span>
                </div>
                <span className="text-[10px] bg-emerald-100 text-emerald-900 border border-emerald-300 px-2.5 py-0.5 rounded-full font-bold">
                  Direct Harvest
                </span>
              </div>

              <div className="space-y-2.5">
                {items.map(({ produce, quantity }) => {
                  const bulkActive = Boolean(produce.bulkDiscount && quantity >= produce.bulkDiscount.minQty);
                  const itemUnitPrice = bulkActive
                    ? produce.pricePerUnit * (1 - produce.bulkDiscount!.discountPercent / 100)
                    : produce.pricePerUnit;
                  const lineTotal = (itemUnitPrice * quantity).toFixed(2);

                  return (
                    <div
                      key={produce.id}
                      className="flex items-center justify-between gap-3 text-xs bg-emerald-50/50 p-2 rounded-xl border border-emerald-200/70"
                    >
                      <img
                        src={produce.imageUrl}
                        alt={produce.name}
                        className="w-12 h-12 rounded-xl object-cover bg-emerald-100 flex-shrink-0"
                      />

                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-emerald-950 truncate text-xs">{produce.name}</h4>
                        <div className="text-[11px] text-neutral-500 font-medium mt-0.5">
                          ₱{itemUnitPrice.toFixed(2)} / kg
                          {bulkActive && (
                            <span className="ml-1.5 text-emerald-700 text-[10px] font-bold">
                              ({produce.bulkDiscount!.discountPercent}% Wholesale)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Quantity Stepper */}
                      <div className="flex items-center gap-1 bg-white border border-emerald-200 rounded-xl p-0.5 shadow-2xs">
                        <button
                          onClick={() => {
                            if (quantity <= 1) {
                              onRemoveItem(produce.id);
                            } else {
                              onUpdateQuantity(produce.id, quantity - 1);
                            }
                          }}
                          className="w-7 h-7 rounded-lg flex items-center justify-center bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>
                        <span className="w-6 text-center font-extrabold text-emerald-950 text-xs">{quantity}</span>
                        <button
                          onClick={() => onUpdateQuantity(produce.id, quantity + 1)}
                          disabled={quantity >= produce.stockQuantity}
                          className="w-7 h-7 rounded-lg flex items-center justify-center bg-emerald-50 hover:bg-emerald-100 disabled:opacity-30 text-emerald-900 font-bold cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>
                      </div>

                      <div className="w-16 text-right font-black text-emerald-900 text-xs">
                        ₱{lineTotal}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Fulfillment Method Selection */}
          <div className="bg-white border border-emerald-200/85 rounded-2xl p-3.5 space-y-2.5 shadow-xs">
            <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
              1. Fulfillment Option
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <button
                id="btn-fulfillment-pickup"
                type="button"
                onClick={() => setDeliveryType('farm_pickup')}
                className={`min-h-[70px] p-3 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                  deliveryType === 'farm_pickup'
                    ? 'bg-emerald-50 border-emerald-600 text-emerald-950 font-bold ring-1 ring-emerald-600 shadow-xs'
                    : 'bg-emerald-50/30 border-emerald-200 text-neutral-600 hover:bg-emerald-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <Store className="w-4 h-4 text-emerald-700" />
                  <span className="text-[10px] bg-emerald-600 text-white font-bold px-1.5 py-0.2 rounded-full">
                    FREE
                  </span>
                </div>
                <div className="text-xs font-bold text-emerald-950">Store Depot Pickup</div>
                <div className="text-[10px] text-neutral-500">Pick up at VeggieConnect Depot</div>
              </button>

              <button
                id="btn-fulfillment-delivery"
                type="button"
                onClick={() => setDeliveryType('direct_delivery')}
                className={`min-h-[70px] p-3 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                  deliveryType === 'direct_delivery'
                    ? 'bg-emerald-50 border-emerald-600 text-emerald-950 font-bold ring-1 ring-emerald-600 shadow-xs'
                    : 'bg-emerald-50/30 border-emerald-200 text-neutral-600 hover:bg-emerald-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <Truck className="w-4 h-4 text-emerald-700" />
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded-full">₱45.00</span>
                </div>
                <div className="text-xs font-bold text-emerald-950">Home Delivery</div>
                <div className="text-[10px] text-neutral-500">Direct crate to your doorstep</div>
              </button>
            </div>

            {deliveryType === 'farm_pickup' ? (
              <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-200 text-xs space-y-1.5">
                <div className="flex items-center gap-1 text-emerald-900 font-bold">
                  <Calendar className="w-3.5 h-3.5 text-emerald-700" /> Pickup Time Window
                </div>
                <select
                  value={pickupSlot}
                  onChange={(e) => setPickupSlot(e.target.value)}
                  className="w-full min-h-[42px] bg-white border border-emerald-200 rounded-xl p-2 text-xs text-emerald-950 focus:outline-none focus:border-emerald-600 font-medium"
                >
                  <option value="Tomorrow 08:00 AM - 10:00 AM (Valencia Farm Stand)">Tomorrow 08:00 AM - 10:00 AM (Valencia Farm Stand)</option>
                  <option value="Tomorrow 01:00 PM - 04:00 PM (Dumaguete Sibulan Highway Gate)">Tomorrow 01:00 PM - 04:00 PM (Dumaguete Sibulan Highway Gate)</option>
                  <option value="Today 04:30 PM - 06:30 PM (Evening Harvest Stand)">Today 04:30 PM - 06:30 PM (Evening Harvest Stand)</option>
                </select>
              </div>
            ) : (
              <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-200 text-xs space-y-1.5">
                <div className="flex items-center gap-1 text-emerald-900 font-bold">
                  <MapPin className="w-3.5 h-3.5 text-emerald-700" /> Delivery Street Address in Dumaguete/Negros
                </div>
                <input
                  type="text"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="w-full min-h-[42px] bg-white border border-emerald-200 rounded-xl p-2 text-xs text-emerald-950 focus:outline-none focus:border-emerald-600"
                  placeholder="House #, Street, Barangay, Dumaguete City"
                />
              </div>
            )}
          </div>

          {/* Buyer Details */}
          <div className="bg-white border border-emerald-200/85 rounded-2xl p-3.5 space-y-3 shadow-xs">
            <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
              2. Buyer Contact Information
            </h4>
            <div className="grid grid-cols-1 gap-2.5">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-emerald-900 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-emerald-700" /> Full Name / Business Name
                </label>
                <input
                  type="text"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="Enter your name (e.g. Maria Santos)"
                  className="w-full min-h-[44px] bg-emerald-50/30 border border-emerald-200 rounded-xl px-3 py-2 text-xs text-emerald-950 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-emerald-900 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-emerald-700" /> Mobile / GCash Number
                </label>
                <input
                  type="tel"
                  value={buyerPhone}
                  onChange={(e) => setBuyerPhone(e.target.value)}
                  placeholder="0917 123 4567"
                  className="w-full min-h-[44px] bg-emerald-50/30 border border-emerald-200 rounded-xl px-3 py-2 text-xs text-emerald-950 focus:outline-none focus:border-emerald-600 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-emerald-900 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-neutral-400" /> Optional Harvest Note for Farmer
                </label>
                <input
                  type="text"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="e.g. Please select ripe tomatoes, pack in banana leaf"
                  className="w-full min-h-[44px] bg-emerald-50/30 border border-emerald-200 rounded-xl px-3 py-2 text-xs text-emerald-950 focus:outline-none focus:border-emerald-600"
                />
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="bg-white border border-emerald-200/85 rounded-2xl p-3.5 space-y-2 shadow-xs">
            <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
              3. Payment Method
            </h4>
            <div className="space-y-1.5">
              {[
                { id: 'GCash / Maya Mobile Transfer', label: 'GCash / Maya Mobile (Direct ₱0 Fee)' },
                { id: 'Cash on Delivery / Pickup', label: 'Cash on Delivery / Kaliwaan upon handover' },
                { id: 'Direct Bank Transfer / Pera Padala', label: 'Bank Transfer / Palawan Express' },
              ].map((m) => (
                <label
                  key={m.id}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                    paymentMethod === m.id
                      ? 'bg-emerald-50 border-emerald-600 text-emerald-950 font-bold'
                      : 'bg-emerald-50/30 border-emerald-200 text-neutral-700 hover:bg-emerald-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment_choice"
                    checked={paymentMethod === m.id}
                    onChange={() => setPaymentMethod(m.id as any)}
                    className="accent-emerald-600 w-4 h-4 cursor-pointer"
                  />
                  <span className="font-semibold text-[11px]">{m.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Direct Impact & Savings Card */}
          <div className="bg-gradient-to-r from-emerald-100 to-teal-100/70 border border-emerald-300/80 rounded-2xl p-3 text-xs space-y-1.5 text-emerald-950 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-900 flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-emerald-700" /> Direct Farm Transparency
              </span>
              <span className="text-[10px] font-mono bg-emerald-200 text-emerald-950 px-2 py-0.5 rounded-full font-bold">
                Saved ~₱{estimatedSavings}
              </span>
            </div>
            <p className="text-[11px] text-emerald-950/85 leading-relaxed font-medium">
              100% of farm-gate value (₱{subtotal.toFixed(2)}) goes straight to the local Negros grower at fair rates.
            </p>
          </div>

          {/* Price Breakdown */}
          <div className="bg-white border border-emerald-200/85 rounded-2xl p-3.5 space-y-1.5 text-xs shadow-xs">
            <div className="flex justify-between text-neutral-600">
              <span>Produce Subtotal</span>
              <span className="text-emerald-950 font-bold">₱{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-neutral-600">
              <span>Delivery Fee</span>
              <span className="text-emerald-950 font-bold">
                {deliveryFee === 0 ? 'FREE (Pickup)' : `₱${deliveryFee.toFixed(2)}`}
              </span>
            </div>
            <div className="flex justify-between text-neutral-600">
              <span>Platform Fee (VeggieConnect)</span>
              <span className="text-emerald-700 font-bold">₱0.00 (Zero Commission)</span>
            </div>
            <div className="border-t border-emerald-100 pt-2 flex justify-between text-sm font-black text-emerald-950">
              <span>Total Direct Payment</span>
              <span className="text-emerald-700 font-black">₱{totalAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Error Message if any */}
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-3 text-xs text-red-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Sticky Bottom Order Bar: ALWAYS VISIBLE in mobile app view */}
          <div className="sticky bottom-0 -mx-3.5 -mb-3.5 mt-2 bg-white/95 backdrop-blur-md border-t border-emerald-200/90 p-4 z-30 shadow-[0_-8px_24px_rgba(0,0,0,0.06)]">
            <div className="flex items-center justify-between gap-3 mb-2.5">
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-500 block tracking-wider">
                  Total Direct Payment
                </span>
                <div className="text-xl font-black text-emerald-950">
                  ₱{totalAmount.toFixed(2)}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-neutral-500 block">Fulfillment</span>
                <span className="text-xs font-bold text-emerald-800">
                  {deliveryType === 'direct_delivery' ? '₱45.00 Haul' : 'Free Farm Pickup'}
                </span>
              </div>
            </div>

            <button
              id="btn-confirm-direct-order"
              onClick={handleCheckout}
              disabled={isSubmitting || cart.length === 0}
              className="w-full min-h-[48px] py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Connecting directly with Farmer...
                </span>
              ) : (
                <>
                  <span>Confirm Direct Order • ₱{totalAmount.toFixed(2)}</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
