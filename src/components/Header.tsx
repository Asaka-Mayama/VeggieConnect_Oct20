import React from 'react';
import { Sprout, MapPin, LogOut, Truck, ShoppingBag, User } from 'lucide-react';
import { UserRole, UserProfile } from '../types';

interface HeaderProps {
  userRole: UserRole;
  currentUser: UserProfile | null;
  onLogout: () => void;
  onOpenEditProfile?: () => void;
  activeLocation: string;
  onLocationClick?: () => void;
  onNotificationClick?: () => void;
  onOpenPriceWatch?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  userRole,
  currentUser,
  onLogout,
  onOpenEditProfile,
  activeLocation,
  onLocationClick,
  onNotificationClick,
  onOpenPriceWatch,
}) => {
  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-emerald-100 px-3.5 py-2.5 transition-colors shadow-xs">
      <div className="flex items-center justify-between gap-2">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-md shadow-emerald-700/20 text-white flex-shrink-0">
            <Sprout className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-bold tracking-tight text-emerald-950 font-display">
                Veggie<span className="text-emerald-600">Connect</span>
              </h1>
              <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                Dumaguete
              </span>
            </div>
            <p className="text-[11px] text-emerald-700/80 font-medium truncate">
              Direct Farm Produce Network
            </p>
          </div>
        </div>

        {/* User Role Context Tag */}
        <div className="flex items-center gap-1.5">
          {currentUser && (
            <div className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-900 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="truncate max-w-[110px]">{currentUser.name.split(' ')[0]}</span>
            </div>
          )}
        </div>
      </div>

      {/* Sub-bar: Proximity Location + Role Context Tag */}
      <div className="mt-2 flex items-center justify-between text-xs text-emerald-800/90 border-t border-emerald-100 pt-1.5">
        <button
          id="btn-location-select"
          onClick={onLocationClick}
          className="flex items-center gap-1 hover:text-emerald-950 transition-colors group min-w-0 cursor-pointer py-0.5"
        >
          <MapPin className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 group-hover:animate-bounce" />
          <span className="text-[11px] text-emerald-900 font-semibold truncate max-w-[210px]">
            {activeLocation}
          </span>
          <span className="text-[10px] text-emerald-700 font-mono hidden sm:inline">(Negros Oriental)</span>
        </button>

        <div className="flex items-center gap-1.5 text-[11px] flex-shrink-0">
          {onOpenPriceWatch && (
            <button
              id="btn-header-da-prices"
              onClick={onOpenPriceWatch}
              className="text-emerald-800 hover:text-emerald-950 bg-emerald-100/90 hover:bg-emerald-200/90 border border-emerald-300/80 px-2 py-0.5 rounded-full flex items-center gap-1 font-bold text-[10px] transition-colors cursor-pointer active:scale-95"
              title="Official DA Bantay Presyo daily price watch"
            >
              <Sprout className="w-3 h-3 text-emerald-600" />
              <span>DA Prices</span>
            </button>
          )}

          {userRole === 'admin' ? (
            <span className="text-emerald-900 bg-emerald-200/80 border border-emerald-300 px-2.5 py-0.5 rounded-full flex items-center gap-1.5 font-bold text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-700 animate-pulse" />
              Admin Mode
            </span>
          ) : userRole === 'farmer' ? (
            <span className="text-emerald-800 bg-emerald-100 border border-emerald-200/80 px-2 py-0.5 rounded-full flex items-center gap-1 font-bold text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              Farmer Portal
            </span>
          ) : (
            <span className="text-emerald-800 bg-emerald-100/90 border border-emerald-200/80 px-2 py-0.5 rounded-full flex items-center gap-1 font-bold text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              Direct Market
            </span>
          )}
        </div>
      </div>
    </header>
  );
};
