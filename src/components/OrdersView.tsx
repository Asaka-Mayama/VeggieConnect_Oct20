import React, { useState, useEffect, useMemo } from 'react';
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  Truck,
  Store,
  MessageSquare,
  ChevronRight,
  FileText,
  Phone,
  X,
  ShieldCheck,
  MapPin,
  XCircle,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { Order, OrderStatus, UserRole, UserProfile } from '../types';
import { FarmRouteMap } from './FarmRouteMap';
import {
  getAdminProfileForLocationFallback,
  resolveLiveTransactionAdminLocation,
  resolveFarmHouseCoordinates,
  useAdminLocationSyncTick,
} from '../utils/farmRoute';
import { calculateDistanceKm } from '../utils/geoDistance';

interface OrdersViewProps {
  orders: Order[];
  userRole: UserRole;
  currentUser?: UserProfile | null;
  registeredUsers?: UserProfile[];
  initialFilter?: 'all' | 'active' | 'completed' | 'cancelled';
  onUpdateOrderStatus?: (
    orderId: string,
    newStatus: OrderStatus,
    cancelReason?: string,
    cancelledBy?: string
  ) => void;
  onChatWithParty?: (order: Order) => void;
}

export const OrdersView: React.FC<OrdersViewProps> = ({
  orders,
  userRole,
  currentUser,
  registeredUsers = [],
  initialFilter,
  onUpdateOrderStatus,
  onChatWithParty,
}) => {
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'cancelled'>(
    initialFilter || 'all'
  );
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState<Order | null>(null);
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
  const [cancelReasonInput, setCancelReasonInput] = useState<string>('');
  // Distance / ETA reported by each live route map (supermarket hub ➔ farmer's house)
  const [routeStatsByOrder, setRouteStatsByOrder] = useState<Record<string, { km: number; durationText: string }>>({});

  useEffect(() => {
    if (initialFilter) {
      setFilter(initialFilter);
    }
  }, [initialFilter]);

  const roleFilteredOrders = orders.filter((order) => {
    if (userRole === 'admin') return true;

    if (userRole === 'farmer') {
      if (!currentUser) return false;
      return (
        order.farmerId === currentUser.id ||
        (order.farmName &&
          currentUser.farmName &&
          order.farmName.trim().toLowerCase() === currentUser.farmName.trim().toLowerCase())
      );
    }

    // Buyer role
    if (!currentUser) return true; // Show placed orders in guest session
    return (
      order.buyerId === currentUser.id ||
      (order.buyerPhone && currentUser.phone && order.buyerPhone === currentUser.phone) ||
      (order.buyerName &&
        currentUser.name &&
        order.buyerName.trim().toLowerCase() === currentUser.name.trim().toLowerCase())
    );
  });

  const filteredOrders = roleFilteredOrders.filter((order) => {
    if (filter === 'active') {
      return order.status !== 'completed' && order.status !== 'cancelled';
    }
    if (filter === 'completed') {
      return order.status === 'completed';
    }
    if (filter === 'cancelled') {
      return order.status === 'cancelled';
    }
    return true;
  });

  // Origin of the live route map — the admin/supermarket location saved from
  // Admin > Profile (with the registered admin account as a safe fallback).
  const adminLocationSyncTick = useAdminLocationSyncTick();
  const adminProfile = useMemo(
    () => getAdminProfileForLocationFallback(null, registeredUsers),
    [registeredUsers, adminLocationSyncTick]
  );
  const supermarket = resolveLiveTransactionAdminLocation(registeredUsers, adminProfile);
  const supermarketHub = { lat: supermarket.latitude, lng: supermarket.longitude };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full">Order Placed — Awaiting Pickup Route</span>;
      case 'confirmed':
        // Only reachable after the owner presses "I'll Pick This Up".
        return <span className="bg-blue-100 text-blue-900 border border-blue-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full">Confirmed — Transport on the Way</span>;
      case 'harvesting_packing':
        return <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full">Legacy Harvest Step (migrated)</span>;
      case 'ready_for_pickup_delivery':
        return <span className="bg-teal-100 text-teal-900 border border-teal-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full">Ready for Dispatch</span>;
      case 'picked_up':
        return (
          <span className="bg-amber-100 text-amber-900 border border-amber-400 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <Truck className="w-3 h-3 text-amber-700 animate-pulse" />
            <span>Loaded onto Admin Logistics Fleet</span>
          </span>
        );
      case 'in_transit':
        return (
          <span className="bg-emerald-100 text-emerald-900 border border-emerald-400 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <Truck className="w-3 h-3 text-emerald-700 animate-pulse" />
            <span>Out for Delivery (Admin Hauler)</span>
          </span>
        );
      case 'completed':
        return <span className="bg-neutral-100 text-neutral-800 border border-neutral-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full">Delivered & Paid ✓</span>;
      case 'cancelled':
        return (
          <span className="bg-red-100 text-red-900 border border-red-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <XCircle className="w-3 h-3 text-red-600" />
            <span>Cancelled & Restocked</span>
          </span>
        );
    }
  };

  const getStepNumber = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return 1;
      case 'confirmed': return 2;
      // Fresh-pick model: no harvesting step. 'harvesting_packing' is a legacy
      // status (old rows) and renders as placed-but-not-confirmed.
      case 'ready_for_pickup_delivery': return 3;
      case 'picked_up': return 3;
      case 'in_transit': return 3;
      case 'completed': return 4;
      default: return 1;
    }
  };

  return (
    <div className="flex flex-col space-y-4 p-3.5 pb-8 w-full">
      {/* Header & Filter Pills */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-extrabold text-emerald-950 font-display">
            {userRole === 'buyer' ? 'My VeggieConnect Orders' : 'Store Procurements'}
          </h2>
          <p className="text-xs text-neutral-500 font-medium">
            {userRole === 'buyer'
              ? 'Quality-inspected, packed & delivered directly by VeggieConnect Logistics'
              : 'Vegetables purchased & fulfilled by VeggieConnect Store'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-emerald-200/80 pb-2.5 overflow-x-auto no-scrollbar">
        {(['all', 'active', 'completed', 'cancelled'] as const).map((tab) => (
          <button
            key={tab}
            id={`tab-orders-${tab}`}
            onClick={() => setFilter(tab)}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition-colors cursor-pointer shrink-0 ${
              filter === tab
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-neutral-600 hover:text-emerald-950 bg-white border border-emerald-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {filteredOrders.length === 0 ? (
        <div className="bg-white border border-emerald-200/80 rounded-2xl p-8 text-center space-y-3 shadow-xs">
          <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-800 flex items-center justify-center mx-auto text-2xl">
            📦
          </div>
          <h3 className="text-sm font-extrabold text-emerald-950">No Orders in this View</h3>
          <p className="text-xs text-neutral-500 max-w-xs mx-auto leading-relaxed">
            {userRole === 'buyer'
              ? 'Place an order in the market to connect directly with your local farmers.'
              : 'No orders match this filter right now.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const step = getStepNumber(order.status);

            // LIVE ROUTE (farmer): supermarket hub ➔ the supplying farm's house while the order is active.
            // Resolve strictly from THIS order (item farmer first, then order farmer/account) so two
            // active orders can never inherit the viewer's coordinates or each other's route.
            const isLiveTransaction = order.status !== 'completed' && order.status !== 'cancelled';
            const supplyItem = order.items[0];
            const orderFarmer =
              (currentUser?.role === 'farmer' && (
                (order.farmerId && currentUser.id === order.farmerId) ||
                (order.farmName && currentUser.farmName && order.farmName.trim().toLowerCase() === currentUser.farmName.trim().toLowerCase()) ||
                userRole === 'farmer'
              ))
                ? currentUser
                : registeredUsers.find(
                    (u) =>
                      u.role === 'farmer' &&
                      ((order.farmerId && u.id === order.farmerId) ||
                        (order.farmName &&
                          u.farmName &&
                          order.farmName.trim().toLowerCase() === u.farmName.trim().toLowerCase()))
                  );

            // Textual farm address: must represent the farm, never the supermarket delivery address
            const farmLocation =
              orderFarmer?.location ||
              (userRole === 'farmer' && currentUser?.location ? currentUser.location : '') ||
              (order.pickupSlot && !order.pickupSlot.includes('Supermarket') ? order.pickupSlot : '');

            const farmHouse =
              isLiveTransaction && (orderFarmer || supplyItem || userRole === 'farmer')
                ? resolveFarmHouseCoordinates({
                    latitude: orderFarmer?.latitude || (userRole === 'farmer' ? currentUser?.latitude : undefined),
                    longitude: orderFarmer?.longitude || (userRole === 'farmer' ? currentUser?.longitude : undefined),
                    farmerId: order.farmerId || orderFarmer?.id,
                    farmName: order.farmName || orderFarmer?.farmName || (userRole === 'farmer' ? currentUser?.farmName : undefined),
                    farmerName: supplyItem?.farmerName || orderFarmer?.name || (userRole === 'farmer' ? currentUser?.name : undefined),
                    locationText: farmLocation,
                    registeredUsers,
                    itemFarmerId: supplyItem?.farmerId,
                    itemFarmerName: supplyItem?.farmerName,
                    itemFarmName: supplyItem?.farmName,
                  })
                : null;
            const routeStats = routeStatsByOrder[order.id];
            const straightLineKm = farmHouse
              ? Math.round(
                  calculateDistanceKm(
                    supermarketHub.lat,
                    supermarketHub.lng,
                    farmHouse.coords.lat,
                    farmHouse.coords.lng
                  ) * 10
                ) / 10
              : 0;

            return (
              <div
                key={order.id}
                id={`order-card-${order.id}`}
                className="bg-white border border-emerald-200/85 rounded-2xl p-4 space-y-3 shadow-xs"
              >
                {/* Top Row: Order ID, Date & Status */}
                <div className="flex items-center justify-between text-xs border-b border-emerald-100 pb-2.5">
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-emerald-950">
                      <span>{order.id}</span>
                      <span className="text-[10px] text-neutral-500 font-normal">({order.createdAt})</span>
                    </div>
                    <div className="text-[11px] text-emerald-700 font-bold flex items-center gap-1 mt-0.5">
                      <Store className="w-3.5 h-3.5 text-emerald-600" />
                      {userRole === 'farmer'
                        ? 'Customer: VeggieConnect Supermarket (Seller Procurement)'
                        : userRole === 'buyer'
                        ? 'Sold by: VeggieConnect Supermarket (Seller)'
                        : `Produce: VeggieConnect Store • Buyer: ${order.buyerName}`}
                    </div>
                  </div>
                  <div>{getStatusBadge(order.status)}</div>
                </div>

                {order.status === 'cancelled' ? (
                  <div className="bg-red-50/80 border border-red-200/90 rounded-xl p-3 text-xs space-y-1.5">
                    <div className="flex items-center justify-between font-bold">
                      <span className="flex items-center gap-1.5 text-red-800">
                        <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                        <span>Order Cancelled {order.cancelledAt ? `(${order.cancelledAt})` : ''}</span>
                      </span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-md flex items-center gap-1 border border-emerald-300">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                        <span>+{order.items.reduce((s, it) => s + (it.quantity || 0), 0)} kg Restocked to Stock</span>
                      </span>
                    </div>
                    {order.cancelReason && (
                      <p className="text-[11px] text-red-900 leading-snug">
                        <strong>Reason:</strong> {order.cancelReason}
                      </p>
                    )}
                    {order.cancelledBy && (
                      <p className="text-[10px] text-neutral-500">
                        Cancelled by: {order.cancelledBy}
                      </p>
                    )}
                  </div>
                ) : (
                  /* Progress Step Bar — live farmer ↔ supermarket tracker.
                     Confirmed lights up ONLY after the owner starts the pickup
                     route ('I'll Pick This Up'), never right after Buy Produce. */
                  <div className="space-y-1.5 py-1">
                    <div className="flex justify-between text-[10px] text-neutral-500 font-medium">
                      <span className={step >= 1 ? 'text-emerald-700 font-bold' : ''}>Order Placed</span>
                      <span className={step >= 2 ? 'text-emerald-700 font-bold' : ''}>Confirmed</span>
                      <span className={step >= 3 ? 'text-emerald-700 font-bold' : ''}>
                        {order.deliveryType === 'farm_pickup' ? 'Ready at Gate' : 'On the Way'}
                      </span>
                      <span className={step >= 4 ? 'text-emerald-700 font-bold' : ''}>Delivered</span>
                    </div>
                    <div className="h-2 w-full bg-emerald-100 rounded-full overflow-hidden flex">
                      <div
                        className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, (step / 4) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Order Items Preview */}
                <div className="space-y-2 bg-emerald-50/50 p-3 rounded-xl border border-emerald-200/70 text-xs">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-neutral-700">
                      <div className="flex items-center gap-2 truncate">
                        <img
                          src={item.imageUrl}
                          alt={item.produceName}
                          className="w-8 h-8 rounded-lg object-cover bg-emerald-100"
                        />
                        <span className="truncate text-xs font-bold text-emerald-950">
                          {item.produceName}
                        </span>
                        <span className="text-neutral-500 text-[11px]">
                          × {item.quantity} kg
                        </span>
                      </div>
                      <span className="font-bold text-emerald-950 flex-shrink-0">
                        ₱{((item.unitPrice || item.pricePerUnit || 0) * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}

                  {/* Fulfillment Details */}
                  <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between text-[11px] text-neutral-600">
                    <span className="flex items-center gap-1">
                      {order.deliveryType === 'farm_pickup' ? (
                        <>
                          <Store className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Pickup: {order.pickupSlot || 'At Farm Gate'}</span>
                        </>
                      ) : (
                        <>
                          <Truck className="w-3.5 h-3.5 text-emerald-700" />
                          <span className="truncate max-w-[200px]">Delivery: {order.deliveryAddress}</span>
                        </>
                      )}
                    </span>
                    <span className="font-black text-emerald-950 text-xs">
                      Total: ₱{order.totalAmount.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* LIVE ROUTE MAP: Farmer's House (Left) ➔ Supermarket Hub (Right) */}
                {farmHouse && (
                  <div className="border border-red-200 bg-red-50/40 rounded-2xl overflow-hidden">
                    <div className="flex items-center justify-between gap-2 px-2.5 py-2 bg-gradient-to-r from-red-700 to-red-600 text-white">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="text-[11px] font-black uppercase tracking-wide truncate">
                          Live Procurement Route: {farmHouse.label} ➔ {supermarket.storeName}
                        </span>
                      </div>
                      <span className="text-[9px] bg-white/20 font-extrabold px-1.5 py-0.5 rounded flex-shrink-0">
                        RED ROUTE
                      </span>
                    </div>

                    <FarmRouteMap
                      routeKey={order.id}
                      origin={farmHouse.coords}
                      destination={supermarketHub}
                      originLabel={farmHouse.label}
                      destinationLabel={supermarket.storeName}
                      originEmoji="🌱"
                      destinationEmoji="🏪"
                      heightClassName="h-60"
                      onRouteCalculated={(km, durationText) => {
                        setRouteStatsByOrder((prev) =>
                          prev[order.id] &&
                          prev[order.id].km === km &&
                          prev[order.id].durationText === durationText
                            ? prev
                            : { ...prev, [order.id]: { km, durationText } }
                        );
                      }}
                    />
                  </div>
                )}

                {/* Bottom Actions */}
                <div className="space-y-2 pt-1">
                  {/* Informational Status Banner for Direct Delivery Farmer */}
                  {userRole === 'farmer' && order.deliveryType === 'direct_delivery' && (
                    <div className="w-full">
                      {order.status === 'pending' && (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl">
                          <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin flex-shrink-0" />
                          <span>Order placed — waiting for the supermarket to start the pickup route</span>
                        </div>
                      )}
                      {order.status === 'confirmed' && (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900 bg-blue-50 border border-blue-200 px-3 py-2 rounded-xl">
                          <Truck className="w-3.5 h-3.5 text-blue-600 animate-pulse flex-shrink-0" />
                          <span>Confirmed — transport is on the way to your farm. Please fresh-pick the order.</span>
                        </div>
                      )}
                      {(order.status === 'picked_up' || order.status === 'ready_for_pickup_delivery' || order.status === 'in_transit') && (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl">
                          <Truck className="w-3.5 h-3.5 text-emerald-600 animate-pulse flex-shrink-0" />
                          <span>Admin will mark delivered</span>
                        </div>
                      )}
                      {order.status === 'completed' && (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800 bg-neutral-100 border border-neutral-300 px-3 py-2 rounded-xl">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                          <span>Delivered ✓</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Aligned Action Buttons Grid/Flex Row */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Digital Receipt Button */}
                    <button
                      id={`btn-receipt-${order.id}`}
                      onClick={() => setSelectedReceiptOrder(order)}
                      className="flex-1 min-w-[90px] h-10 px-2 sm:px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-bold flex items-center justify-center gap-1.5 border border-emerald-200 cursor-pointer transition-all active:scale-95 shadow-xs"
                    >
                      <FileText className="w-3.5 h-3.5 text-emerald-700 flex-shrink-0" />
                      <span className="truncate">Receipt</span>
                    </button>

                    {/* Chat with Farmer / Customer */}
                    {onChatWithParty && (() => {
                      if (userRole === 'farmer') {
                        const isCustomerMe = Boolean(
                          currentUser &&
                            (order.buyerId === currentUser.id ||
                              (order.buyerName && currentUser.name && order.buyerName.toLowerCase() === currentUser.name.toLowerCase()))
                        );
                        if (isCustomerMe) return null;
                        return (
                          <button
                            id={`btn-chat-order-${order.id}`}
                            onClick={() => onChatWithParty(order)}
                            className="flex-1 min-w-[110px] h-10 px-2 sm:px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
                            title="Message Buyer"
                          >
                            <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate">Chat Buyer</span>
                          </button>
                        );
                      } else {
                        const isFarmerMe = Boolean(
                          currentUser &&
                            (order.farmerId === currentUser.id ||
                              (order.farmName && currentUser.farmName && order.farmName.toLowerCase() === currentUser.farmName.toLowerCase()))
                        );
                        if (isFarmerMe) return null;
                        return (
                          <button
                            id={`btn-chat-order-${order.id}`}
                            onClick={() => onChatWithParty(order)}
                            className="flex-1 min-w-[105px] h-10 px-2 sm:px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
                            title="Message Seller (Admin)"
                          >
                            <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate">Chat Seller</span>
                          </button>
                        );
                      }
                    })()}

                    {/* Chat with Transporter removed — the admin acts as the transporter */}

                    {/* Farmer mode direct actions.
                        Farm-pickup orders (buyer collects at the gate): farmer
                        approves, then hands over — no harvesting step (lots are
                        fresh-picked on order confirmation).
                        Supermarket procurement (direct_delivery): the OWNER
                        drives the whole tracker. The farmer has no buttons here —
                        'Confirmed' lights up only when the owner starts the
                        pickup route ('I'll Pick This Up'), then the owner
                        advances picked_up → in_transit → delivered. */}
                    {userRole === 'farmer' && onUpdateOrderStatus && order.deliveryType !== 'direct_delivery' && (
                      <>
                        {order.status === 'pending' && (
                          <button
                            id={`btn-farmer-approve-${order.id}`}
                            onClick={() => onUpdateOrderStatus(order.id, 'confirmed')}
                            className="flex-1 min-w-[110px] h-10 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate">Approve</span>
                          </button>
                        )}
                        {order.status === 'ready_for_pickup_delivery' && (
                          <button
                            onClick={() => onUpdateOrderStatus(order.id, 'completed')}
                            className="flex-1 min-w-[110px] h-10 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate">Handed Over ✓</span>
                          </button>
                        )}
                      </>
                    )}

                    {/* Buyer can confirm receipt if ready for farm_pickup */}
                    {userRole === 'buyer' && order.deliveryType === 'farm_pickup' && order.status === 'ready_for_pickup_delivery' && onUpdateOrderStatus && (
                      <button
                        onClick={() => onUpdateOrderStatus(order.id, 'completed')}
                        className="flex-1 min-w-[130px] h-10 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">Confirm Received</span>
                      </button>
                    )}

                    {/* Cancellation Action: Available only for Buyer and Admin accounts (Farmer account removed) */}
                    {userRole !== 'farmer' && (order.status === 'pending' || order.status === 'confirmed') && onUpdateOrderStatus && (
                      <button
                        id={`btn-cancel-order-${order.id}`}
                        onClick={() => {
                          setOrderToCancel(order);
                          setCancelReasonInput('');
                        }}
                        className="flex-1 min-w-[105px] h-10 px-2 sm:px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 hover:text-red-800 text-xs font-bold flex items-center justify-center gap-1.5 border border-red-200 cursor-pointer transition-all active:scale-95 shadow-2xs"
                        title="Cancel order and restock items to inventory"
                      >
                        <XCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                        <span className="truncate">Cancel Order</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Farm-Gate Digital Receipt Modal */}
      {selectedReceiptOrder && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border border-emerald-200 rounded-3xl w-full max-w-sm max-h-[92%] overflow-y-auto p-5 space-y-4 text-emerald-950 shadow-2xl relative">
            <button
              onClick={() => setSelectedReceiptOrder(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-emerald-100 text-emerald-900 flex items-center justify-center hover:bg-emerald-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Receipt Header */}
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-1">
                <Store className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-emerald-950 font-display">
                Farm-Gate Direct Receipt
              </h3>
              <p className="text-[11px] text-neutral-500 font-medium">Order ID: {selectedReceiptOrder.id}</p>
            </div>

            {/* Farm & Buyer details */}
            <div className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-200/80 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-neutral-500 font-medium">Producer Farm:</span>
                <span className="font-bold text-emerald-900">{selectedReceiptOrder.farmName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500 font-medium">Buyer:</span>
                <span className="font-bold text-emerald-950">{selectedReceiptOrder.buyerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500 font-medium">Method:</span>
                <span className="font-bold text-emerald-950 capitalize">
                  {selectedReceiptOrder.deliveryType.replace('_', ' ')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500 font-medium">Payment:</span>
                <span className="font-bold text-emerald-950">{selectedReceiptOrder.paymentMethod}</span>
              </div>
            </div>

            {/* Items List */}
            <div className="space-y-1.5 text-xs">
              <div className="font-bold text-emerald-900 pb-1 border-b border-emerald-100">
                Harvest Items
              </div>
              {selectedReceiptOrder.items.map((item, i) => (
                <div key={i} className="flex justify-between text-neutral-700">
                  <span>
                    {item.produceName} ({item.quantity} {item.unit})
                  </span>
                  <span className="font-bold text-emerald-950">
                    ₱{((item.unitPrice || item.pricePerUnit || 0) * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
              <div className="border-t border-emerald-100 pt-2 flex justify-between font-extrabold text-sm text-emerald-950">
                <span>Total Paid Directly:</span>
                <span className="text-emerald-700">₱{selectedReceiptOrder.totalAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* Zero Middleman Stamp */}
            <div className="bg-emerald-100/70 border border-emerald-300 rounded-2xl p-3 text-center text-xs text-emerald-950">
              <ShieldCheck className="w-5 h-5 mx-auto mb-1 text-emerald-700" />
              <div className="font-bold">100% Direct Agricultural Exchange</div>
              <div className="text-[10px] text-emerald-800 font-medium">Direct fair farm-gate pricing</div>
            </div>

            <button
              onClick={() => setSelectedReceiptOrder(null)}
              className="w-full min-h-[44px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Close Receipt
            </button>
          </div>
        </div>
      )}

      {/* Order Cancellation & Restock Confirmation Modal */}
      {orderToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border border-red-200 rounded-3xl w-full max-w-sm max-h-[92%] overflow-y-auto p-5 space-y-4 text-neutral-900 shadow-2xl relative">
            <button
              onClick={() => {
                setOrderToCancel(null);
                setCancelReasonInput('');
              }}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-neutral-100 text-neutral-600 flex items-center justify-center hover:bg-neutral-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5 text-red-700">
              <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div className="min-w-0">
                <h3 className="font-extrabold text-sm text-neutral-900 truncate">Cancel Order & Restock</h3>
                <p className="text-[11px] text-neutral-500 font-mono">Order ID: {orderToCancel.id}</p>
              </div>
            </div>

            {/* Inventory Restock Breakdown Box */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 space-y-2 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-emerald-950">
                <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                <span>Automatic Inventory Restock</span>
              </div>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                Cancelling this order immediately returns all reserved kilograms back to the supermarket live inventory:
              </p>
              <div className="space-y-1 pt-1 border-t border-emerald-200/80">
                {orderToCancel.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[11px] text-emerald-950">
                    <span className="font-medium truncate mr-2">• {item.produceName}</span>
                    <span className="font-bold text-emerald-700 shrink-0">+{item.quantity} kg</span>
                  </div>
                ))}
              </div>
              <div className="pt-1.5 text-right text-[11px] font-black text-emerald-950 border-t border-emerald-200/60">
                Total Restocked: +{orderToCancel.items.reduce((s, it) => s + (it.quantity || 0), 0)} kg
              </div>
            </div>

            {/* Direct Cancellation Reason Input (No multiple choice / radio buttons) */}
            <div className="space-y-1.5 text-xs">
              <label className="font-bold text-neutral-800 block">
                Reason for Cancellation:
              </label>
              <textarea
                rows={3}
                placeholder="Type your cancellation reason here (e.g., buyer requested change, incorrect address, etc.)..."
                value={cancelReasonInput}
                onChange={(e) => setCancelReasonInput(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-red-500 bg-neutral-50 focus:bg-white resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2 border-t border-neutral-200">
              <button
                onClick={() => {
                  const finalReason = cancelReasonInput.trim() || 'Cancelled upon request';
                  const cancellerName =
                    currentUser?.name || (userRole === 'admin' ? 'Admin' : 'Buyer');
                  if (onUpdateOrderStatus) {
                    onUpdateOrderStatus(orderToCancel.id, 'cancelled', finalReason, cancellerName);
                  }
                  setOrderToCancel(null);
                  setCancelReasonInput('');
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-95 transition-all"
              >
                <XCircle className="w-4 h-4" />
                <span>Confirm Cancellation & Restock Stock</span>
              </button>

              <button
                onClick={() => {
                  setOrderToCancel(null);
                  setCancelReasonInput('');
                }}
                className="w-full py-2 px-4 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs text-center cursor-pointer transition-colors"
              >
                Keep Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
