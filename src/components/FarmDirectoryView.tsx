import React from 'react';
import { Sprout, MapPin, ShieldCheck, MessageSquare, ArrowRight, Award, CheckCircle2, Scale, Truck, Building2 } from 'lucide-react';
import { ProduceItem, UserProfile } from '../types';

interface FarmDirectoryViewProps {
  produceList: ProduceItem[];
  currentUser?: UserProfile | null;
  onSelectProduce?: (produce: ProduceItem) => void;
  onOpenSellerChat: () => void;
  onOpenDAPrices?: () => void;
}

interface SourcingHub {
  id: string;
  name: string;
  location: string;
  elevation: string;
  primaryCrops: string[];
  description: string;
  qualityAssurance: string;
  distanceKm: number;
}

const REGIONAL_SOURCING_HUBS: SourcingHub[] = [
  {
    id: 'hub-valencia',
    name: 'Valencia Highland Sourcing Hub',
    location: 'Valencia, Negros Oriental',
    elevation: '600m - 1,100m ASL',
    primaryCrops: ['Native Tomatoes', 'Cabbage', 'Baguio Beans', 'Bell Peppers', 'Carrots'],
    description: 'Procured from high-altitude volcanic soils near Mt. Talinis. Naturally cool climate produces dense, sweet, and pesticide-free highland vegetables.',
    qualityAssurance: 'Grade-A Inspected • Procured at DA Fair Farmgate Rates',
    distanceKm: 9.2,
  },
  {
    id: 'hub-sibulan',
    name: 'Sibulan Valley Agricultural Depot',
    location: 'Sibulan, Negros Oriental',
    elevation: '50m - 250m ASL',
    primaryCrops: ['Eggplant (Talong)', 'Ampalaya (Bitter Gourd)', 'Sitaw', 'Okra', 'Kangkong'],
    description: 'Fertile alluvial plain sourcing center. Daily morning harvests collected from local partner growers and transported directly to Dumaguete distribution center.',
    qualityAssurance: 'Harvested on Order • Zero Supermarket Storage Delay',
    distanceKm: 5.8,
  },
  {
    id: 'hub-dauin',
    name: 'Dauin Organic & Herb Terminal',
    location: 'Dauin, Negros Oriental',
    elevation: '100m - 400m ASL',
    primaryCrops: ['Wild Birdseye Chili (Labuyo)', 'Native Garlic', 'Hawaiian Ginger', 'Lemongrass', 'Squash'],
    description: 'Specialized organic farming hub producing aromatic roots, spices, and nutrient-dense heirloom vegetables with natural compost fertilization.',
    qualityAssurance: '100% Naturally Grown • Strict Quality Testing',
    distanceKm: 13.4,
  },
  {
    id: 'hub-dumaguete',
    name: 'Dumaguete Central Supermarket & Fulfillment Depot',
    location: 'Dumaguete City Proper (Rizal Blvd Logistics Depot)',
    elevation: 'Coastal Port Level',
    primaryCrops: ['All Regional Vegetables & Daily Fresh Crates'],
    description: 'The central VeggieConnect Supermarket store hub. Here all crops bought from partner farmers are weighed, quality-certified, packed, and dispatched for customer doorstep delivery.',
    qualityAssurance: 'Central Weigh-in & Certified DA Bantay Presyo Calibration',
    distanceKm: 0.5,
  },
];

export const FarmDirectoryView: React.FC<FarmDirectoryViewProps> = ({
  produceList,
  currentUser,
  onOpenSellerChat,
  onOpenDAPrices,
}) => {
  return (
    <div className="flex flex-col space-y-4 p-3.5 pb-8 w-full bg-white text-neutral-900">
      {/* Header */}
      <div>
        <h2 className="text-lg font-extrabold text-emerald-950 font-display">
          Regional Sourcing & Supermarket Hubs
        </h2>
        <p className="text-xs text-neutral-600 mt-0.5">
          VeggieConnect procures fresh vegetables directly from accredited growers across Negros Oriental.
        </p>
      </div>

      {/* Seller Value Proposition Card */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white rounded-3xl p-4 shadow-sm space-y-2.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center text-white">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-black text-sm text-white font-display">VeggieConnect Seller</h3>
            <p className="text-[10px] text-emerald-200">Guaranteed Quality • Direct Sourcing & Resale</p>
          </div>
        </div>
        <p className="text-xs text-emerald-100/95 leading-relaxed">
          We act as the direct seller for fresh local produce. We buy harvests directly from local growers at fair DA farm-gate prices and resell Grade-A produce to buyers with quality and fresh delivery guarantees.
        </p>
        <div className="pt-2 border-t border-emerald-700/60 flex items-center justify-between">
          <button
            onClick={onOpenSellerChat}
            className="px-3 py-1.5 rounded-xl bg-white text-emerald-950 text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer hover:bg-emerald-50 active:scale-95 transition-all"
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-700" />
            <span>Chat Store Seller</span>
          </button>
          {onOpenDAPrices && (
            <button
              onClick={onOpenDAPrices}
              className="text-[11px] text-emerald-200 hover:text-white flex items-center gap-1 font-bold cursor-pointer underline"
            >
              <Scale className="w-3.5 h-3.5" />
              <span>DA Price Watch</span>
            </button>
          )}
        </div>
      </div>

      {/* Sourcing Hubs List */}
      <div className="space-y-3.5">
        {REGIONAL_SOURCING_HUBS.map((hub) => (
          <div
            key={hub.id}
            id={`hub-card-${hub.id}`}
            className="bg-white border border-neutral-200/90 rounded-3xl overflow-hidden hover:border-emerald-500 transition-all shadow-xs"
          >
            {/* Hub Header */}
            <div className="p-4 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 font-bold flex-shrink-0">
                    <Sprout className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-neutral-900 font-display">
                      {hub.name}
                    </h3>
                    <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-bold mt-0.5">
                      <MapPin className="w-3 h-3 text-emerald-600" />
                      <span>{hub.location}</span>
                      <span>•</span>
                      <span className="text-neutral-500 font-medium">{hub.elevation}</span>
                    </div>
                  </div>
                </div>

                <span className="text-[10px] font-mono font-bold bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded-full border border-neutral-200">
                  {hub.distanceKm} km from center
                </span>
              </div>

              <p className="text-xs text-neutral-600 leading-relaxed font-medium">
                {hub.description}
              </p>

              {/* Primary Commodities */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-1">
                  Primary Sourced Commodities:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {hub.primaryCrops.map((crop) => (
                    <span
                      key={crop}
                      className="text-[10px] font-bold bg-emerald-50 text-emerald-900 border border-emerald-200 px-2 py-0.5 rounded-lg"
                    >
                      {crop}
                    </span>
                  ))}
                </div>
              </div>

              {/* Quality Standard */}
              <div className="pt-2 border-t border-neutral-100 flex items-center gap-1.5 text-[11px] text-emerald-800 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span>{hub.qualityAssurance}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
