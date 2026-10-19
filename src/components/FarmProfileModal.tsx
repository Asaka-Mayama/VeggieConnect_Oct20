import React from 'react';
import { X, MapPin, ShieldCheck, Phone, MessageSquare, Sprout, Check } from 'lucide-react';
import { FarmerProfile, ProduceItem, UserProfile } from '../types';
import { ProduceCard } from './ProduceCard';

interface FarmProfileModalProps {
  farmer: FarmerProfile | null;
  produceList: ProduceItem[];
  currentUser?: UserProfile | null;
  registeredUsers?: UserProfile[];
  onClose: () => void;
  onSelectProduce: (produce: ProduceItem) => void;
  onAddToCart: (produce: ProduceItem, e: React.MouseEvent) => void;
  onDirectChat: (farmer: FarmerProfile) => void;
  cartItemIds: Set<string>;
  isBuyer?: boolean;
}

export const FarmProfileModal: React.FC<FarmProfileModalProps> = ({
  farmer,
  produceList,
  currentUser,
  registeredUsers = [],
  onClose,
  onSelectProduce,
  onAddToCart,
  onDirectChat,
  cartItemIds,
  isBuyer = true,
}) => {
  if (!farmer) return null;

  const isMe = Boolean(
    currentUser &&
      (farmer.id === currentUser.id ||
        (farmer.name && currentUser.name && farmer.name.toLowerCase() === currentUser.name.toLowerCase()) ||
        (farmer.phone && currentUser.phone && farmer.phone.replace(/\s+/g, '') === currentUser.phone.replace(/\s+/g, '')) ||
        (farmer.farmName && currentUser.farmName && farmer.farmName.toLowerCase() === currentUser.farmName.toLowerCase()))
  );

  const isRegistered =
    registeredUsers.length > 0 &&
    registeredUsers.some(
      (u) =>
        u.id === farmer.id ||
        (u.name && farmer.name && u.name.toLowerCase() === farmer.name.toLowerCase()) ||
        (u.farmName && farmer.farmName && u.farmName.toLowerCase() === farmer.farmName.toLowerCase()) ||
        (u.phone && farmer.phone && u.phone.replace(/\s+/g, '') === farmer.phone.replace(/\s+/g, ''))
    );

  const farmProduce = produceList.filter((p) => p.farmerId === farmer.id);

  return (
    <div className="absolute inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="farm-profile-modal"
        className="bg-white border border-neutral-200 rounded-t-3xl sm:rounded-3xl w-full max-h-[92%] overflow-y-auto shadow-2xl flex flex-col text-neutral-900"
      >
        {/* Cover image & close */}
        <div className="relative h-36 w-full bg-emerald-100">
          <img
            src={farmer.coverImage}
            alt={farmer.farmName}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/30" />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 text-neutral-800 flex items-center justify-center hover:bg-white shadow-md cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Profile info */}
        <div className="p-4 space-y-4">
          <div className="flex items-end justify-between -mt-10 mb-2">
            {farmer.avatar ? (
              <img
                src={farmer.avatar}
                alt={farmer.name}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-lg bg-emerald-50"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-emerald-600 border-2 border-white shadow-lg flex items-center justify-center font-bold text-lg text-white">
                {farmer.name.charAt(0).toUpperCase()}
              </div>
            )}
            {isMe ? (
              <span
                id="tag-own-farm-profile"
                className="px-3 py-1.5 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-bold"
                title="This is your own registered farm"
              >
                Your Farm Profile
              </span>
            ) : isRegistered ? (
              <button
                id="btn-farm-direct-message"
                onClick={() => onDirectChat(farmer)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95 transition-all"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Direct Message
              </button>
            ) : (
              <span
                className="px-3 py-1.5 bg-neutral-100 text-neutral-500 border border-neutral-200 rounded-xl text-xs font-medium"
                title="Grower is not registered for direct messaging"
              >
                Unregistered
              </span>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-neutral-900 font-display">{farmer.farmName}</h2>
              {farmer.verified && <ShieldCheck className="w-4 h-4 text-emerald-600" />}
            </div>
            <p className="text-xs text-emerald-700 font-medium">Grower: {farmer.name}</p>
            <div className="flex items-center gap-2 text-xs text-neutral-600 mt-1">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                {farmer.location} {isBuyer ? `(${farmer.distanceKm} km away)` : ''}
              </span>
            </div>
          </div>

          {/* Bio */}
          <div className="bg-neutral-50 p-3 rounded-2xl border border-neutral-200 text-xs text-neutral-700 leading-relaxed">
            <h4 className="font-bold text-neutral-900 mb-1">About the Farm</h4>
            <p>{farmer.bio}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(farmer.farmingMethods || ['Naturally Grown']).map((m) => (
                <span
                  key={m}
                  className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md font-medium"
                >
                  {m}
                </span>
              ))}
            </div>
          </div>

          {/* Active Harvests */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">
              Available Harvests from this Farm ({farmProduce.length})
            </h3>
            {farmProduce.length === 0 ? (
              <p className="text-xs text-neutral-500 italic">No produce listed right now.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                {farmProduce.map((item) => (
                  <ProduceCard
                    key={item.id}
                    produce={item}
                    onSelect={onSelectProduce}
                    onAddToCart={onAddToCart}
                    isInCart={cartItemIds.has(item.id)}
                    isBuyer={isBuyer}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
