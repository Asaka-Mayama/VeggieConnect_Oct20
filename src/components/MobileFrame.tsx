import React, { useState, useEffect } from 'react';
import { Wifi, Battery, Signal, ShoppingBag, Store, Sprout, ClipboardList, MessageSquare, Truck, User } from 'lucide-react';
import { UserRole } from '../types';

interface MobileFrameProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole: UserRole;
  cartCount: number;
  ordersCount: number;
  unreadMessagesCount: number;
  isLoggedIn?: boolean;
}

export const MobileFrame: React.FC<MobileFrameProps> = ({
  children,
  activeTab,
  setActiveTab,
  userRole,
  cartCount,
  ordersCount,
  unreadMessagesCount,
  isLoggedIn = true,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('09:41');
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      setCurrentTime(`${hours}:${minutes}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  const isAdmin = userRole === 'admin';

  // Define tab navigation order for swipe gesture transitions
  const getTabsForRole = () => {
    if (userRole === 'farmer') {
      return ['farmer-portal', 'orders', 'messages', 'profile'];
    }
    return ['market', 'cart', 'orders', 'messages', 'profile'];
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isAdmin || !isLoggedIn) return;
    setTouchStartX(e.touches[0].clientX);
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (isAdmin || !isLoggedIn || touchStartX === null || touchStartY === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;

    // Reset touch coordinates
    setTouchStartX(null);
    setTouchStartY(null);

    // Require significant horizontal motion and minimal vertical motion (swipe)
    if (Math.abs(deltaX) > 65 && Math.abs(deltaX) > Math.abs(deltaY) * 1.6) {
      const tabs = getTabsForRole();
      const currentIndex = tabs.indexOf(activeTab);
      if (currentIndex === -1) return;

      if (deltaX < 0 && currentIndex < tabs.length - 1) {
        // Swiped Left -> Move to Next Tab
        setActiveTab(tabs[currentIndex + 1]);
      } else if (deltaX > 0 && currentIndex > 0) {
        // Swiped Right -> Move to Previous Tab
        setActiveTab(tabs[currentIndex - 1]);
      }
    }
  };

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900 flex flex-col items-center justify-center p-0 sm:p-4 selection:bg-emerald-600 selection:text-white">
      {/* Mobile App Shell (Pure Mobile App Form Factor) */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="w-full max-w-[430px] min-h-screen sm:min-h-[860px] sm:max-h-[920px] bg-white sm:rounded-[44px] sm:border-[10px] sm:border-neutral-800/10 sm:shadow-[0_20px_50px_rgba(0,0,0,0.12)] relative flex flex-col overflow-hidden"
      >
        {/* Smartphone Hardware Status Bar */}
        <div className="w-full bg-white/95 backdrop-blur-md z-30 pt-2.5 px-6 pb-1.5 flex items-center justify-between text-xs font-bold text-neutral-900 select-none border-b border-neutral-200/80">
          <span>{currentTime}</span>

          {/* Dynamic Island Pill */}
          <div className="h-5 bg-neutral-900 text-white rounded-full flex items-center justify-center gap-1.5 px-3 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-[9px] text-emerald-300 font-mono tracking-wider uppercase font-bold">
              {isLoggedIn
                ? isAdmin
                  ? 'ADMIN PORTAL'
                  : userRole === 'farmer'
                  ? 'FARMER'
                  : 'BUYER'
                : 'VEGGIECONNECT'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-neutral-800">
            <Signal className="w-3.5 h-3.5" />
            <Wifi className="w-3.5 h-3.5" />
            <Battery className="w-4 h-4 text-emerald-600" />
          </div>
        </div>

        {/* Scrollable App Body */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden relative bg-white text-neutral-900 flex flex-col">
          {children}
        </div>

        {/* Mobile Navigation Bottom Bar:
            CRITICAL: Admin has NO Market, Farms, Cart, Orders, Direct Chat tabs per user specification */}
        {isLoggedIn && !isAdmin && (
          <nav className="flex-shrink-0 z-40 bg-white/95 backdrop-blur-xl border-t border-neutral-200/80 px-2 py-2 shadow-lg">
            <div className="flex items-center justify-around">
              {/* Market Tab: ONLY shown for buyers */}
              {userRole === 'buyer' && (
                <button
                  id="nav-tab-market"
                  onClick={() => setActiveTab('market')}
                  className={`flex flex-col items-center justify-center min-h-[50px] min-w-[56px] py-1 px-2.5 rounded-2xl transition-all relative cursor-pointer active:scale-95 ${
                    activeTab === 'market'
                      ? 'bg-emerald-100 text-emerald-900 font-bold shadow-xs'
                      : 'text-neutral-500 hover:text-emerald-800 font-medium'
                  }`}
                >
                  <Store className="w-5 h-5 mb-0.5" />
                  <span className="text-[10px] tracking-tight">Market</span>
                </button>
              )}

              {userRole === 'buyer' && (
                <button
                  id="nav-tab-cart"
                  onClick={() => setActiveTab('cart')}
                  className={`flex flex-col items-center justify-center min-h-[50px] min-w-[56px] py-1 px-2.5 rounded-2xl transition-all relative cursor-pointer active:scale-95 ${
                    activeTab === 'cart'
                      ? 'bg-emerald-100 text-emerald-900 font-bold shadow-xs'
                      : 'text-neutral-500 hover:text-emerald-800 font-medium'
                  }`}
                >
                  <div className="relative">
                    <ShoppingBag className="w-5 h-5 mb-0.5" />
                    {cartCount > 0 && (
                      <span className="absolute -top-1.5 -right-2 bg-emerald-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center shadow-xs">
                        {cartCount}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] tracking-tight">Cart</span>
                </button>
              )}

              {userRole === 'farmer' && (
                <button
                  id="nav-tab-farmer-portal"
                  onClick={() => setActiveTab('farmer-portal')}
                  className={`flex flex-col items-center justify-center min-h-[50px] min-w-[56px] py-1 px-2.5 rounded-2xl transition-all relative cursor-pointer active:scale-95 ${
                    activeTab === 'farmer-portal'
                      ? 'bg-emerald-100 text-emerald-900 font-bold shadow-xs'
                      : 'text-neutral-500 hover:text-emerald-800 font-medium'
                  }`}
                >
                  <div className="relative">
                    <div className="w-5 h-5 mb-0.5 rounded-full bg-emerald-200 text-emerald-900 flex items-center justify-center font-bold text-xs">
                      🌾
                    </div>
                  </div>
                  <span className="text-[10px] tracking-tight">My Crops</span>
                </button>
              )}

              <button
                id="nav-tab-orders"
                onClick={() => setActiveTab('orders')}
                className={`flex flex-col items-center justify-center min-h-[50px] min-w-[56px] py-1 px-2.5 rounded-2xl transition-all relative cursor-pointer active:scale-95 ${
                  activeTab === 'orders'
                    ? 'bg-emerald-100 text-emerald-900 font-bold shadow-xs'
                    : 'text-neutral-500 hover:text-emerald-800 font-medium'
                }`}
              >
                <div className="relative">
                  <ClipboardList className="w-5 h-5 mb-0.5" />
                  {ordersCount > 0 && (
                    <span className="absolute -top-1 -right-1.5 bg-emerald-600 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center shadow-xs">
                      {ordersCount}
                    </span>
                  )}
                </div>
                <span className="text-[10px] tracking-tight">Orders</span>
              </button>

              <button
                id="nav-tab-messages"
                onClick={() => setActiveTab('messages')}
                className={`flex flex-col items-center justify-center min-h-[50px] min-w-[50px] py-1 px-1.5 rounded-2xl transition-all relative cursor-pointer active:scale-95 ${
                  activeTab === 'messages'
                    ? 'bg-emerald-100 text-emerald-900 font-bold shadow-xs'
                    : 'text-neutral-500 hover:text-emerald-800 font-medium'
                }`}
              >
                <div className="relative">
                  <MessageSquare className="w-5 h-5 mb-0.5" />
                  {unreadMessagesCount > 0 && (
                    <span className="absolute -top-1 -right-1.5 bg-emerald-600 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center shadow-xs">
                      {unreadMessagesCount}
                    </span>
                  )}
                </div>
                <span className="text-[10px] tracking-tight">Direct Chat</span>
              </button>

              <button
                id="nav-tab-profile"
                onClick={() => setActiveTab('profile')}
                className={`flex flex-col items-center justify-center min-h-[50px] min-w-[50px] py-1 px-1.5 rounded-2xl transition-all relative cursor-pointer active:scale-95 ${
                  activeTab === 'profile'
                    ? 'bg-emerald-100 text-emerald-900 font-bold shadow-xs'
                    : 'text-neutral-500 hover:text-emerald-800 font-medium'
                }`}
              >
                <div className="relative">
                  <User className="w-5 h-5 mb-0.5" />
                </div>
                <span className="text-[10px] tracking-tight">Profile</span>
              </button>
            </div>
          </nav>
        )}
      </div>
    </div>
  );
};

