import React, { useState } from 'react';
import {
  X,
  Lightbulb,
  Sprout,
  ShoppingBag,
  Shield,
  Store,
  DollarSign,
  HelpCircle,
  CheckCircle2,
  TrendingUp,
  MapPin,
  FileText,
  Boxes,
} from 'lucide-react';

interface ProjectGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  // When true, render as an inline page card instead of a fixed overlay modal
  isPage?: boolean;
}

export const ProjectGuideModal: React.FC<ProjectGuideModalProps> = ({
  isOpen,
  onClose,
  isPage = false,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'roles' | 'transactions' | 'terms' | 'defense'>('overview');

  if (!isOpen) return null;

  return (
    <div
      className={
        isPage
          ? 'w-full'
          : 'fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150'
      }
    >
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl border border-emerald-200 overflow-hidden text-neutral-900">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white p-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-400 text-amber-950 flex items-center justify-center font-bold shadow-xs">
              <Lightbulb className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white font-display">
                Project Guide & Defense Cheat Sheet
              </h3>
              <p className="text-[11px] text-emerald-200">
                Simple explanation for 3rd-Year College presentation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-neutral-200 bg-neutral-50 px-2 pt-2 gap-1 overflow-x-auto scrollbar-none text-xs flex-shrink-0">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-2 font-bold rounded-t-xl transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-white text-emerald-800 border-t-2 border-emerald-600 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            🎯 System Overview
          </button>
          <button
            onClick={() => setActiveTab('roles')}
            className={`px-3 py-2 font-bold rounded-t-xl transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'roles'
                ? 'bg-white text-emerald-800 border-t-2 border-emerald-600 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            👥 3 Roles
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-3 py-2 font-bold rounded-t-xl transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'transactions'
                ? 'bg-white text-emerald-800 border-t-2 border-emerald-600 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            💳 2 Transactions
          </button>
          <button
            onClick={() => setActiveTab('terms')}
            className={`px-3 py-2 font-bold rounded-t-xl transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'terms'
                ? 'bg-white text-emerald-800 border-t-2 border-emerald-600 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            📊 Simple Terms
          </button>
          <button
            onClick={() => setActiveTab('defense')}
            className={`px-3 py-2 font-bold rounded-t-xl transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'defense'
                ? 'bg-white text-emerald-800 border-t-2 border-emerald-600 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            🎓 Defense Q&A
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="p-4 overflow-y-auto space-y-3.5 text-xs text-neutral-700 flex-1 leading-relaxed">
          {/* TAB 1: SYSTEM OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-3">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 space-y-1.5">
                <h4 className="font-extrabold text-emerald-950 text-sm flex items-center gap-1.5">
                  <Sprout className="w-4 h-4 text-emerald-600" />
                  What is VeggieConnect in 1 Sentence?
                </h4>
                <p className="text-neutral-700">
                  <strong>VeggieConnect</strong> is a mobile-responsive agricultural e-commerce platform that connects local vegetable farmers, buyers, and a central store hub in Negros Oriental so crops are sold fresh at fair prices.
                </p>
              </div>

              <div className="space-y-2">
                <h5 className="font-bold text-neutral-900 text-xs uppercase tracking-wider">
                  The Real-World Problem You are Solving:
                </h5>
                <div className="grid grid-cols-1 gap-2">
                  <div className="bg-rose-50 border border-rose-200 p-2.5 rounded-xl">
                    <p className="font-bold text-rose-900">1. Middlemen take most of the profit</p>
                    <p className="text-[11px] text-rose-800">
                      Farmers in upland farms (like Valencia) get paid very little, while wet markets in town charge buyers high prices.
                    </p>
                  </div>
                  <div className="bg-rose-50 border border-rose-200 p-2.5 rounded-xl">
                    <p className="font-bold text-rose-900">2. Hard to find reliable transportation</p>
                    <p className="text-[11px] text-rose-800">
                      Farmers usually don't have delivery vehicles, and buyers don't want to drive far up into the mountains to buy vegetables.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-3 space-y-1">
                <h5 className="font-bold text-emerald-950 text-xs uppercase tracking-wider">
                  How VeggieConnect Fixes This:
                </h5>
                <ul className="space-y-1 text-[11px] text-emerald-900 list-disc list-inside">
                  <li><strong>Farmers</strong> post their produce directly and set their asking prices.</li>
                  <li><strong>Buyers</strong> order online with delivery directly to their homes.</li>
                  <li><strong>Admin (Store Owner)</strong> also handles logistics — hauling produce from farms, checking official Department of Agriculture (DA) price standards so pricing stays fair.</li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 2: THE 3 USER ROLES */}
          {activeTab === 'roles' && (
            <div className="space-y-2.5">
              <p className="text-neutral-500 text-[11px]">
                Your system has 3 user roles. Here is what each role does in simple terms:
              </p>

              {/* Farmer */}
              <div className="border border-emerald-200 bg-emerald-50/40 rounded-2xl p-3 space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
                    🌾
                  </div>
                  <div>
                    <h5 className="font-bold text-emerald-950 text-xs">1. Farmer (The Producer)</h5>
                    <span className="text-[10px] text-emerald-700">Account: Pedro Penduko / Juan Dela Cruz</span>
                  </div>
                </div>
                <p className="text-[11px] text-neutral-600 pt-1">
                  • Posts harvested vegetables with photo, quantity (kg), and price per kg.<br />
                  • Receives orders from buyers or wholesale buy requests from Admin.<br />
                  • Chats directly with buyers or the Admin desk.
                </p>
              </div>

              {/* Buyer */}
              <div className="border border-sky-200 bg-sky-50/40 rounded-2xl p-3 space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold">
                    🛒
                  </div>
                  <div>
                    <h5 className="font-bold text-sky-950 text-xs">2. Buyer (The Customer)</h5>
                    <span className="text-[10px] text-sky-700">Account: Maria Santos / Restaurant Owner</span>
                  </div>
                </div>
                <p className="text-[11px] text-neutral-600 pt-1">
                  • Browses fresh vegetables listed by farmers and supermarket stock.<br />
                  • Adds items to shopping cart and chooses pickup or home delivery.<br />
                  • Tracks order status from "Placed" to "Delivered".
                </p>
              </div>

              {/* Admin */}
              <div className="border border-purple-200 bg-purple-50/40 rounded-2xl p-3 space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-700 text-white flex items-center justify-center font-bold">
                    🛡️
                  </div>
                  <div>
                    <h5 className="font-bold text-purple-950 text-xs">3. Admin (Store Owner / System Manager / Logistics)</h5>
                    <span className="text-[10px] text-purple-700">Account: admin@gmail.com (password is set in the .env file)</span>
                  </div>
                </div>
                <p className="text-[11px] text-neutral-600 pt-1">
                  • Verifies farmer and buyer accounts.<br />
                  • Handles all deliveries — hauling produce from farms to buyers and the store hub.<br />
                  • Monitors official government DA Bantay Presyo (SRP price guide).<br />
                  • <strong>Can buy wholesale from farmers</strong> at cost price, then add profit markup and stock it on the Supermarket Shelf for buyers!
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: THE 2 TRANSACTION METHODS */}
          {activeTab === 'transactions' && (
            <div className="space-y-3">
              <div className="bg-neutral-100 p-2.5 rounded-xl text-neutral-700">
                <p className="font-bold text-neutral-900 mb-0.5">Why does the system have 2 ways to buy?</p>
                <p className="text-[11px]">
                  Because some buyers want to buy straight from a farmer, while other buyers prefer buying from a central supermarket hub.
                </p>
              </div>

              {/* Transaction 1 */}
              <div className="border border-sky-200 bg-sky-50/30 rounded-2xl p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sky-950 text-xs">
                    Method 1: Direct Buyer Order (B2C)
                  </span>
                  <span className="text-[9px] bg-sky-100 text-sky-800 font-bold px-2 py-0.5 rounded-full">
                    Customer Purchase
                  </span>
                </div>
                <div className="space-y-1 text-[11px] text-neutral-600">
                  <p><strong>Who:</strong> A regular Buyer (household or restaurant).</p>
                  <p><strong>Steps:</strong> Buyer adds vegetables to Cart → Checks out → Chooses Home Delivery or Farm Pickup → The admin picks up and delivers.</p>
                  <p><strong>Result:</strong> The buyer receives and consumes the vegetables.</p>
                </div>
              </div>

              {/* Transaction 2 */}
              <div className="border border-purple-200 bg-purple-50/30 rounded-2xl p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-purple-950 text-xs">
                    Method 2: Admin Supermarket Buy (B2B2C)
                  </span>
                  <span className="text-[9px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-full">
                    Wholesale Procurement
                  </span>
                </div>
                <div className="space-y-1 text-[11px] text-neutral-600">
                  <p><strong>Who:</strong> The Admin (Supermarket Store Desk).</p>
                  <p><strong>Steps:</strong> Admin clicks "Buy from Farmer" in the crops list → Buys bulk harvest (e.g. 50kg @ ₱35/kg) → Produce goes to "Owned / Bought" → Admin clicks "Put in Stock" and sets retail price (e.g. ₱50/kg) → Vegetable appears on the Supermarket Shelf for buyers to order!</p>
                  <p><strong>Result:</strong> The farmer gets paid in bulk immediately, and the Admin earns retail markup profit.</p>
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl text-[11px] text-emerald-950 font-medium">
                💡 <strong>Under the hood:</strong> Both methods save to the same <code>orders</code> database table and create transport jobs for the Admin logistics desk, keeping your codebase clean and unified!
              </div>
            </div>
          )}

          {/* TAB 4: SIMPLE TERMS DECODED */}
          {activeTab === 'terms' && (
            <div className="space-y-2.5">
              <p className="text-neutral-500 text-[11px]">
                Don't worry about business or farming jargon. Here are all the terms translated into plain student English:
              </p>

              <div className="space-y-2">
                <div className="bg-white border border-neutral-200 p-2.5 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-neutral-900 text-xs">Total Sales (formerly "Total GMV")</span>
                    <span className="text-[9px] font-mono text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded font-bold">₱ Total Orders</span>
                  </div>
                  <p className="text-[11px] text-neutral-600 mt-1">
                    GMV stands for <em>Gross Merchandise Value</em>. It simply means the total amount of money from all orders placed on your platform.
                  </p>
                </div>

                <div className="bg-white border border-neutral-200 p-2.5 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-neutral-900 text-xs">Farmer Cost (Farmgate Price)</span>
                    <span className="text-[9px] font-mono text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded font-bold">₱ Cost Price</span>
                  </div>
                  <p className="text-[11px] text-neutral-600 mt-1">
                    "Farmgate" means the price right at the farm gate. It is the original wholesale price the farmer asks for per kilo before any transportation or retail markup.
                  </p>
                </div>

                <div className="bg-white border border-neutral-200 p-2.5 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-neutral-900 text-xs">Store Selling Price (Resale Price)</span>
                    <span className="text-[9px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-bold">₱ Retail Price</span>
                  </div>
                  <p className="text-[11px] text-neutral-600 mt-1">
                    The price displayed to buyers on the Supermarket Shelf.
                  </p>
                </div>

                <div className="bg-white border border-neutral-200 p-2.5 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-neutral-900 text-xs">Profit Margin</span>
                    <span className="text-[9px] font-mono text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded font-bold">Selling Price - Cost</span>
                  </div>
                  <p className="text-[11px] text-neutral-600 mt-1">
                    Example: If Admin bought Ampalaya from farmer for ₱40/kg and sells it in store for ₱55/kg, the profit margin is <strong>+₱15 per kg</strong>.
                  </p>
                </div>

                <div className="bg-white border border-neutral-200 p-2.5 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-neutral-900 text-xs">DA Bantay Presyo (Price Guide)</span>
                    <span className="text-[9px] font-mono text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded font-bold">Official SRP</span>
                  </div>
                  <p className="text-[11px] text-neutral-600 mt-1">
                    The Philippine Department of Agriculture (DA) releases Suggested Retail Prices (SRP) for Dumaguete wet markets so buyers don't get overcharged and farmers don't get underpaid.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: COLLEGE DEFENSE QUESTIONS & ANSWERS */}
          {activeTab === 'defense' && (
            <div className="space-y-2.5">
              <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl text-amber-950">
                <p className="font-bold text-xs">🎓 Panel Questions & How to Answer Them:</p>
                <p className="text-[11px]">
                  Memorize or read these simple answers if your professor asks these common questions during your defense:
                </p>
              </div>

              <div className="space-y-2">
                <div className="bg-white border border-neutral-200 p-3 rounded-2xl space-y-1">
                  <p className="font-bold text-neutral-900 text-xs text-emerald-900">
                    Q1: "Why do you have an Admin buying from farmers if buyers can already buy directly?"
                  </p>
                  <p className="text-[11px] text-neutral-600 bg-neutral-50 p-2 rounded-xl">
                    <strong>Your Answer:</strong> "Some small farmers harvest 100 kilos of tomatoes at once. Waiting for 100 individual buyers might take too long and cause the vegetables to spoil. The Admin supermarket buys the whole harvest wholesale immediately, while still allowing direct retail buyers who want to purchase small amounts directly."
                  </p>
                </div>

                <div className="bg-white border border-neutral-200 p-3 rounded-2xl space-y-1">
                  <p className="font-bold text-neutral-900 text-xs text-emerald-900">
                    Q2: "What database does your project use?"
                  </p>
                  <p className="text-[11px] text-neutral-600 bg-neutral-50 p-2 rounded-xl">
                    <strong>Your Answer:</strong> "The system is built on a full-stack Node.js + Express backend that supports direct local <strong>XAMPP MySQL</strong> (database: <code>veggie_connect2</code>), and also includes a complete SQL export script that can be imported directly into phpMyAdmin."
                  </p>
                </div>

                <div className="bg-white border border-neutral-200 p-3 rounded-2xl space-y-1">
                  <p className="font-bold text-neutral-900 text-xs text-emerald-900">
                    Q3: "How does the logistics / delivery tracking work?"
                  </p>
                  <p className="text-[11px] text-neutral-600 bg-neutral-50 p-2 rounded-xl">
                    <strong>Your Answer:</strong> "When a delivery order is created, the system dispatches a transport job with coordinates. The Admin logistics desk uses Google Maps to render the farm-to-store or farm-to-buyer route, calculating the distance in kilometers and estimated travel time."
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-neutral-50 border-t border-neutral-200 p-3 flex items-center justify-between flex-shrink-0">
          <span className="text-[11px] text-neutral-500 font-medium">
            3rd-Year College Project · VeggieConnect
          </span>
          <button
            onClick={onClose}
            className="py-1.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all active:scale-95"
          >
            Got it, thanks!
          </button>
        </div>
      </div>
    </div>
  );
};
