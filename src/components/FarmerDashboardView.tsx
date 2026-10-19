import React, { useState } from 'react';
import { Sprout, Plus, Package, TrendingUp, Edit3, Trash2, ShieldCheck, CheckCircle2, Clock, AlertCircle, LogOut, MessageSquare, Truck, User, Camera, Edit2, BarChart2, ArrowRight } from 'lucide-react';
import { ProduceItem, FarmerProfile, Order, UserProfile } from '../types';
import { DAPriceWatchWidget } from './DAPriceWatchWidget';
import { DAPriceWatchModal } from './DAPriceWatchModal';
import { findMatchingDAPrice } from '../data/daPricesData';

interface FarmerDashboardViewProps {
  farmer: FarmerProfile;
  produceList: ProduceItem[];
  orders: Order[];
  currentUser?: UserProfile | null;
  registeredUsers?: UserProfile[];
  onOpenAddProduce: () => void;
  onOpenEditProduce: (produce: ProduceItem) => void;
  onOpenEditProfile?: () => void;
  onNavigateToCompletedOrders?: () => void;
  onUpdateProduceStock: (id: string, newStock: number) => void;
  onUpdateProducePrice?: (id: string, newPrice: number) => void;
  onDeleteProduce: (id: string) => void;
  onUpdateOrderStatus?: (
    orderId: string,
    status: Order['status'],
    cancelReason?: string,
    cancelledBy?: string
  ) => void;
  onChatWithCustomer?: (order: Order) => void;
  onLogout?: () => void;
}

export const FarmerDashboardView: React.FC<FarmerDashboardViewProps> = ({
  farmer,
  produceList,
  orders,
  currentUser,
  registeredUsers = [],
  onOpenAddProduce,
  onOpenEditProduce,
  onOpenEditProfile,
  onNavigateToCompletedOrders,
  onUpdateProduceStock,
  onUpdateProducePrice,
  onDeleteProduce,
  onUpdateOrderStatus,
  onChatWithCustomer,
  onLogout,
}) => {
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [stockInput, setStockInput] = useState<string>('');
  const [isPriceWatchModalOpen, setIsPriceWatchModalOpen] = useState(false);
  const [priceWatchSearch, setPriceWatchSearch] = useState('');

  // Farmer specific produce (exclude supermarket store inventory and fully procured lots).
  // When the Buy Desk procures the entire lot (0 stock remaining with a bought quantity),
  // the item is removed from the farmer's active crop listings.
  const myProduce = produceList.filter(
    (item) =>
      item.farmerId === farmer.id &&
      (!item.sellerStoreName || item.sellerStoreName !== 'VeggieConnect Supermarket') &&
      !(item.stockQuantity === 0 && (item.boughtQuantity || 0) > 0)
  );

  // Farmer specific orders
  const isRealFarmer = Boolean(farmer && farmer.id && farmer.id !== 'farmer-none');
  const myOrders = isRealFarmer
    ? orders.filter((o) => {
        if (o.farmerId && o.farmerId === farmer.id) return true;
        if (
          farmer.farmName &&
          farmer.farmName !== 'Local Farm' &&
          o.farmName &&
          o.farmName.trim().toLowerCase() === farmer.farmName.trim().toLowerCase()
        ) {
          return true;
        }
        return false;
      })
    : [];
  const pendingOrdersCount = myOrders.filter(
    (o) =>
      o.status === 'pending' ||
      o.status === 'confirmed' ||
      o.status === 'ready_for_pickup_delivery' ||
      o.status === 'picked_up' ||
      o.status === 'in_transit'
  ).length;

  const totalDirectSales = myOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const completedOrders = myOrders.filter((o) => o.status === 'completed');
  const totalCompletedSales = completedOrders.reduce((sum, o) => sum + o.totalAmount, 0);

  return (
    <div className="flex flex-col space-y-4 p-3.5 pb-8 w-full bg-white text-neutral-900">
      {/* Farmer Profile Hero Header - Clean White Card */}
      <div className="bg-white border border-neutral-200/90 rounded-3xl p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {farmer.avatar ? (
              <img
                src={farmer.avatar}
                alt={farmer.name}
                className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-500/60 shadow-xs flex-shrink-0"
              />
            ) : (
              <div
                className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-xs flex-shrink-0"
              >
                <Sprout className="w-7 h-7 text-emerald-600" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-base font-extrabold text-neutral-900 font-display">
                  {farmer.farmName}
                </h2>
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-xs text-emerald-700 font-bold">
                Farmer: {farmer.name}
              </p>
              <div className="flex items-center gap-2 text-[11px] text-neutral-500 mt-0.5">
                <span>{farmer.location}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick action to list harvest */}
        <div className="mt-3 pt-3 border-t border-neutral-100 flex items-center justify-between">
          <span className="text-xs text-neutral-600 font-medium">
            Ready to list your morning pick?
          </span>
          <button
            id="btn-farmer-list-harvest"
            onClick={onOpenAddProduce}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>List Harvest</span>
          </button>
        </div>
      </div>

      {/* Metrics Row - Clean White Cards (Currency in Peso only) */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-white border border-neutral-200 rounded-2xl p-3 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-neutral-600 text-xs font-semibold">
            <span>Crop Sales Payouts</span>
            <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-700 font-extrabold text-xs flex items-center justify-center border border-emerald-200">
              ₱
            </span>
          </div>
          <div className="mt-2">
            <div className="text-xl font-extrabold text-neutral-900">
              ₱{totalDirectSales.toFixed(2)}
            </div>
            <div className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1 mt-0.5">
              <TrendingUp className="w-3 h-3 text-emerald-600" /> Farm-gate revenue from Seller
            </div>
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-2xl p-3 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-neutral-600 text-xs font-semibold">
            <span>Listed Vegetables</span>
            <Sprout className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-extrabold text-emerald-700">
              {myProduce.length} vegetable{myProduce.length === 1 ? '' : 's'}
            </div>
            <div className="text-[10px] text-neutral-500 mt-0.5">
              Available for Store Purchase
            </div>
          </div>
        </div>
      </div>

      {/* Total Sales Banner at bottom of Crop Sales Payouts & Listed Vegetables - Click redirects to Completed Orders */}
      <button
        type="button"
        id="btn-farmer-total-sales"
        onClick={() => {
          if (onNavigateToCompletedOrders) {
            onNavigateToCompletedOrders();
          }
        }}
        className="w-full bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 hover:from-emerald-700 hover:to-teal-800 text-white p-3.5 rounded-2xl shadow-sm border border-emerald-700/60 flex items-center justify-between gap-3 text-left transition-all active:scale-[0.99] cursor-pointer group"
        title="Click to view Completed Orders"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-white flex-shrink-0 group-hover:bg-white/25 transition-colors">
            <CheckCircle2 className="w-5 h-5 text-emerald-300" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-emerald-200 uppercase tracking-wider">
                Total Sales
              </span>
              <span className="text-[9px] bg-emerald-500/80 text-white font-extrabold px-1.5 py-0.2 rounded-md">
                {completedOrders.length} Completed
              </span>
            </div>
            <div className="text-xl font-black text-white font-mono mt-0.5">
              ₱{totalCompletedSales.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-emerald-200/90 mt-0.5">
              Tap to view completed payouts & orders in Orders tab
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-white/15 px-3 py-1.5 rounded-xl text-xs font-bold text-white group-hover:bg-white/25 transition-colors flex-shrink-0">
          <span>Completed Orders</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </button>

      {/* Official DA Price Watch & AnoMura Market Intelligence Widget */}
      <DAPriceWatchWidget
        myProduce={myProduce}
        onOpenFullBulletin={(searchCrop) => {
          setPriceWatchSearch(searchCrop || '');
          setIsPriceWatchModalOpen(true);
        }}
      />

      {/* Produce Inventory Management Section - Clean White Card */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">
              My Active Crop Listings ({myProduce.length})
            </h3>
            <p className="text-[11px] text-neutral-500">
              Update inventory stock and announce harvest readiness in real time
            </p>
          </div>
          <button
            onClick={onOpenAddProduce}
            className="text-xs text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Add
          </button>
        </div>

        {myProduce.length === 0 ? (
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 text-center space-y-2 shadow-xs">
            <p className="text-xs text-neutral-500">No active produce listed yet.</p>
            <button
              onClick={onOpenAddProduce}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              List Your First Crop
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {myProduce.map((produce) => (
              <div
                key={produce.id}
                id={`farmer-produce-item-${produce.id}`}
                className="bg-white border border-neutral-200 rounded-2xl p-3 space-y-2.5 shadow-xs"
              >
                <div className="flex items-start justify-between gap-2.5">
                  <img
                    src={produce.imageUrl}
                    alt={produce.name}
                    className="w-14 h-14 rounded-xl object-cover bg-neutral-100 flex-shrink-0 border border-neutral-200"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="font-bold text-sm text-neutral-900 truncate">
                        {produce.name}
                      </h4>
                      {produce.stockQuantity === 0 ? (
                        <span className="text-[9px] font-bold bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded">
                          Sold Out / Procured
                        </span>
                      ) : (produce.boughtQuantity || 0) > 0 ? (
                        <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                          ✓ {produce.boughtQuantity}kg Procured
                        </span>
                      ) : null}
                    </div>
                    <div className="text-xs text-emerald-700 font-extrabold mt-0.5">
                      ₱{produce.pricePerUnit.toFixed(2)} / kg
                    </div>
                    <div className="text-[11px] text-neutral-500 mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-neutral-400" />
                      <span>Fresh picked on Order</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      id={`btn-edit-produce-${produce.id}`}
                      onClick={() => onOpenEditProduce(produce)}
                      className="text-neutral-600 hover:text-emerald-700 p-1.5 rounded-lg hover:bg-neutral-100 transition-colors flex items-center gap-1 cursor-pointer"
                      title="Edit crop details or photo"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-[11px] font-semibold text-neutral-700">Edit</span>
                    </button>
                    <button
                      id={`btn-delete-produce-${produce.id}`}
                      onClick={() => onDeleteProduce(produce.id)}
                      className="text-neutral-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer"
                      title="Remove listing"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* DA Price Watch Benchmark Info & Matcher */}
                {(() => {
                  const daMatch = findMatchingDAPrice(produce.name);
                  if (!daMatch) return null;
                  const isDifference =
                    onUpdateProducePrice &&
                    Math.abs(produce.pricePerUnit - daMatch.suggestedDirectFarmPrice) > 1;
                  return (
                    <div className="bg-neutral-50 rounded-xl px-2.5 py-1.5 border border-neutral-200 flex items-center justify-between gap-2 text-[11px]">
                      <div className="flex items-center gap-1.5 text-neutral-600 truncate">
                        <span className="text-emerald-700 font-bold flex-shrink-0">DA Presyo:</span>
                        <span className="truncate">
                          Wet Market: <strong className="text-neutral-900">₱{daMatch.prevailingRetailPrice}</strong> • DA Suggested: <strong className="text-emerald-700 font-bold">₱{daMatch.suggestedDirectFarmPrice}</strong>
                        </span>
                      </div>
                      {isDifference && (
                        <button
                          onClick={() => onUpdateProducePrice!(produce.id, daMatch.suggestedDirectFarmPrice)}
                          className="px-2 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] flex items-center gap-1 shadow-xs active:scale-95 transition-all flex-shrink-0 cursor-pointer"
                          title="Align price with DA AMAS suggested direct farm rate"
                        >
                          <span>Match DA ₱{daMatch.suggestedDirectFarmPrice}</span>
                        </button>
                      )}
                    </div>
                  );
                })()}

                {/* Stock Controls & Status Selector */}
                <div className="bg-neutral-50 p-2.5 rounded-xl border border-neutral-200 flex items-center justify-between gap-2 text-xs">
                  {/* Stock quick updater */}
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-500 text-[11px]">Stock:</span>
                    {editingStockId === produce.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={stockInput}
                          onChange={(e) => setStockInput(e.target.value)}
                          className="w-14 bg-white border border-emerald-500 rounded px-1.5 py-0.5 text-xs text-neutral-900"
                          autoFocus
                        />
                        <button
                          onClick={() => {
                            const val = parseInt(stockInput, 10);
                            if (!isNaN(val) && val >= 0) {
                              onUpdateProduceStock(produce.id, val);
                            }
                            setEditingStockId(null);
                          }}
                          className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[10px] font-bold cursor-pointer"
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingStockId(produce.id);
                          setStockInput(produce.stockQuantity.toString());
                        }}
                        className="font-bold text-neutral-900 hover:text-emerald-700 flex items-center gap-1 underline decoration-dotted cursor-pointer"
                      >
                        {produce.stockQuantity} {produce.unit}
                        <Edit3 className="w-3 h-3 text-neutral-400" />
                      </button>
                    )}
                  </div>

                  {/* Fresh-Pick Terms Badge (fixed — no status selector) */}
                  <span
                    title="This crop is picked fresh once the supermarket confirms the order"
                    className="bg-emerald-50 border border-emerald-300 text-emerald-800 text-[11px] font-bold rounded-lg px-2 py-1 flex-shrink-0"
                  >
                    🌱 Fresh picked on Order
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>



      {/* Official DA AMAS Price Watch Modal */}
      {isPriceWatchModalOpen && (
        <DAPriceWatchModal
          onClose={() => setIsPriceWatchModalOpen(false)}
          initialSearch={priceWatchSearch}
        />
      )}
    </div>
  );
};
