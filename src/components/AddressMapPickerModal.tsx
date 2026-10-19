// Source: Google Maps Platform Code Assist
import React, { useState, useCallback, useEffect } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
} from '@vis.gl/react-google-maps';
import {
  X,
  MapPin,
  Search,
  Navigation,
  Compass,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import {
  Coordinates,
  DUMAGUETE_DEFAULT_COORDS,
  POPULAR_LANDMARKS,
  resolveAddressFromCoords,
} from '../utils/geoDistance';

const GOOGLE_MAPS_API_KEY =
  (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY ||
  'AIzaSyCvp4aWzRvgEYkREXOkUqQL1ZL9nFLnC7M';

interface AddressMapPickerModalProps {
  onClose: () => void;
  onConfirmLocation: (address: string, lat: number, lng: number) => void;
  initialAddress?: string;
  initialLat?: number;
  initialLng?: number;
  title?: string;
  subtitle?: string;
}

// Inner Controller that handles Map instance operations without moving the pin on pan/scroll
const MapController: React.FC<{
  pinnedCoords: Coordinates;
  targetPanCoords: Coordinates | null;
  targetZoom: number | null;
  onPinMoved: (newCoords: Coordinates) => void;
}> = ({ pinnedCoords, targetPanCoords, targetZoom, onPinMoved }) => {
  const map = useMap();

  // Pan map camera only when explicitly requested (e.g. search, preset click, GPS)
  useEffect(() => {
    if (map && targetPanCoords) {
      map.panTo(targetPanCoords);
      if (targetZoom) {
        map.setZoom(targetZoom);
      }
    }
  }, [map, targetPanCoords, targetZoom]);

  return (
    <AdvancedMarker
      position={pinnedCoords}
      draggable={true}
      onDragEnd={(e) => {
        if (e.latLng) {
          const newC = { lat: e.latLng.lat(), lng: e.latLng.lng() };
          onPinMoved(newC);
        }
      }}
      title="Pinned Location (Drag to adjust)"
    >
      <div className="relative flex flex-col items-center group cursor-grab active:cursor-grabbing transform -translate-y-3 select-none">
        <div className="w-11 h-11 rounded-2xl bg-emerald-600 border-2 border-white shadow-2xl flex items-center justify-center text-white text-xl font-black transition-transform group-hover:scale-110">
          🌱
        </div>
        <div className="w-4 h-2 bg-black/40 rounded-full blur-xs mt-0.5" />
      </div>
    </AdvancedMarker>
  );
};

export const AddressMapPickerModal: React.FC<AddressMapPickerModalProps> = ({
  onClose,
  onConfirmLocation,
  initialAddress = 'Dumaguete City Proper, Negros Oriental',
  initialLat,
  initialLng,
  title = 'Pin Location on Map',
  subtitle = 'Tap the map or drag the green pin to select your exact location',
}) => {
  // Pinned location: stays strictly anchored at this exact geographic point
  const [pinnedCoords, setPinnedCoords] = useState<Coordinates>({
    lat: initialLat && !isNaN(initialLat) ? initialLat : DUMAGUETE_DEFAULT_COORDS.lat,
    lng: initialLng && !isNaN(initialLng) ? initialLng : DUMAGUETE_DEFAULT_COORDS.lng,
  });

  // State to trigger camera moves only on explicit events
  const [cameraTarget, setCameraTarget] = useState<{
    coords: Coordinates;
    zoom?: number;
    key: number;
  } | null>(null);

  const [mapTypeId, setMapTypeId] = useState<'roadmap' | 'hybrid' | 'terrain'>('roadmap');
  const [addressText, setAddressText] = useState(initialAddress);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLocating, setIsLocating] = useState(false);

  // Address lookup helper: immediately resolves accurate barangay/street/subdivision name
  const updateAddressFromCoords = useCallback(async (newCoords: Coordinates) => {
    // 1. Instant accurate spatial resolution for Dumaguete and Negros Oriental
    const localizedAddress = resolveAddressFromCoords(newCoords.lat, newCoords.lng);
    setAddressText(localizedAddress);

    // 2. Query Google Maps Geocoder for additional street / subdivision details
    try {
      if (typeof window !== 'undefined' && (window as any).google?.maps?.Geocoder) {
        const geocoder = new (window as any).google.maps.Geocoder();
        geocoder.geocode(
          { location: { lat: newCoords.lat, lng: newCoords.lng } },
          (results: any, status: string) => {
            if (status === 'OK' && results && results.length > 0) {
              let specificPlace = '';
              let sublocality = '';
              let locality = '';
              let province = '';

              // Check first formatted address for specific place name
              const formatted0 = (results[0]?.formatted_address || '').replace(/^[A-Z0-9\+]+\s*,\s*/i, '');
              const parts = formatted0.split(',').map((p: string) => p.trim()).filter(Boolean);
              if (parts.length > 0) {
                const firstPart = parts[0];
                const genericNames = [
                  'dumaguete',
                  'dumaguete city',
                  'valencia',
                  'sibulan',
                  'bacong',
                  'dauin',
                  'negros oriental',
                  'philippines',
                  'unnamed road',
                ];
                if (!genericNames.includes(firstPart.toLowerCase())) {
                  specificPlace = firstPart;
                }
              }

              // Also scan address components
              for (const r of results) {
                for (const comp of r.address_components || []) {
                  const types = comp.types || [];
                  if (
                    !specificPlace &&
                    (types.includes('route') ||
                      types.includes('premise') ||
                      types.includes('subpremise') ||
                      types.includes('neighborhood') ||
                      types.includes('subdivision') ||
                      types.includes('point_of_interest') ||
                      types.includes('establishment'))
                  ) {
                    if (comp.long_name && !comp.long_name.toLowerCase().includes('unnamed')) {
                      specificPlace = comp.long_name;
                    }
                  }
                  if (
                    !sublocality &&
                    (types.includes('sublocality') ||
                      types.includes('sublocality_level_1') ||
                      types.includes('sublocality_level_2') ||
                      types.includes('neighborhood') ||
                      types.includes('administrative_area_level_5'))
                  ) {
                    sublocality = comp.long_name;
                  }
                  if (
                    !locality &&
                    (types.includes('locality') || types.includes('administrative_area_level_3'))
                  ) {
                    locality = comp.long_name;
                  }
                  if (
                    !province &&
                    (types.includes('administrative_area_level_2') ||
                      types.includes('administrative_area_level_1'))
                  ) {
                    province = comp.long_name;
                  }
                }
              }

              // Combine place name with localized address
              if (specificPlace) {
                if (!localizedAddress.toLowerCase().includes(specificPlace.toLowerCase())) {
                  setAddressText(`${specificPlace}, ${localizedAddress}`);
                  return;
                }
              }

              if (sublocality) {
                const cleanSub =
                  sublocality.toLowerCase().startsWith('barangay') ||
                  sublocality.toLowerCase().startsWith('brgy')
                    ? sublocality
                    : `Barangay ${sublocality}`;
                if (!localizedAddress.toLowerCase().includes(sublocality.toLowerCase())) {
                  setAddressText(
                    `${cleanSub}, ${locality || 'Dumaguete City'}, ${
                      province || 'Negros Oriental'
                    }`
                  );
                  return;
                }
              }

              setAddressText(localizedAddress);
            }
          }
        );
      }
    } catch (e) {
      // Fallback already cleanly set to localizedAddress
    }
  }, []);

  // Quick Landmark Preset Selection
  const handleSelectPreset = (landmark: (typeof POPULAR_LANDMARKS)[0]) => {
    const newCoords = { lat: landmark.lat, lng: landmark.lng };
    setPinnedCoords(newCoords);
    setCameraTarget({ coords: newCoords, zoom: 16, key: Date.now() });
    setAddressText(`${landmark.name}, ${landmark.barangay}, ${landmark.city}, Negros Oriental`);
  };

  // GPS Geolocation
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const newCoords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setPinnedCoords(newCoords);
        setCameraTarget({ coords: newCoords, zoom: 17, key: Date.now() });
        updateAddressFromCoords(newCoords);
      },
      () => {
        setIsLocating(false);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // Search Address or Landmark
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const q = searchQuery.toLowerCase().trim();

    // 1. Check local catalog
    const match = POPULAR_LANDMARKS.find(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.barangay.toLowerCase().includes(q) ||
        l.city.toLowerCase().includes(q)
    );

    if (match) {
      handleSelectPreset(match);
      setSearchQuery('');
      return;
    }

    // 2. Google Maps Geocoding if available
    try {
      if (typeof window !== 'undefined' && (window as any).google?.maps?.Geocoder) {
        const geocoder = new (window as any).google.maps.Geocoder();
        geocoder.geocode(
          { address: `${searchQuery}, Negros Oriental, Philippines` },
          (results: any, status: string) => {
            if (status === 'OK' && results && results[0]) {
              const loc = results[0].geometry.location;
              const newCoords = { lat: loc.lat(), lng: loc.lng() };
              setPinnedCoords(newCoords);
              setCameraTarget({ coords: newCoords, zoom: 16, key: Date.now() });
              updateAddressFromCoords(newCoords);
              setSearchQuery('');
            }
          }
        );
        return;
      }
    } catch (err) {}

    // 3. Custom text address fallback
    setAddressText(searchQuery.trim());
  };

  const handleSave = () => {
    const finalAddress = addressText.trim() || 'Dumaguete City, Negros Oriental';
    onConfirmLocation(finalAddress, pinnedCoords.lat, pinnedCoords.lng);
    onClose();
  };

  const toggleMapType = () => {
    setMapTypeId((prev) => (prev === 'roadmap' ? 'hybrid' : prev === 'hybrid' ? 'terrain' : 'roadmap'));
  };

  return (
    <div
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      className="absolute inset-0 z-50 bg-white flex flex-col overflow-hidden text-neutral-900 animate-in fade-in duration-200"
    >
      <div className="flex-1 flex flex-col overflow-hidden w-full h-full relative">
        {/* Header */}
        <div className="p-3.5 border-b border-neutral-200 bg-white flex items-center justify-between shadow-xs z-10 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <MapPin className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm text-neutral-900 font-display">
                {title}
              </h2>
              <p className="text-[10px] text-neutral-500 truncate max-w-[240px]">
                {subtitle}
              </p>
            </div>
          </div>
          <button
            id="btn-close-map-picker"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-100 text-neutral-600 hover:bg-neutral-200 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Location Bar */}
        <div className="p-3 bg-neutral-50 border-b border-neutral-200 space-y-2 flex-shrink-0 z-10">
          <form onSubmit={handleSearchSubmit} className="flex gap-1.5">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Jasonville Subdv, Northern Junob, Valencia..."
                className="w-full bg-white border border-neutral-300 rounded-xl pl-8 pr-3 py-1.5 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-emerald-600"
              />
            </div>
            <button
              type="button"
              onClick={handleGetCurrentLocation}
              disabled={isLocating}
              className="px-2.5 py-1.5 rounded-xl bg-white border border-neutral-300 hover:border-emerald-500 text-emerald-800 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-xs active:scale-95"
              title="Use Current GPS"
            >
              <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin text-emerald-600' : ''}`} />
              <span className="hidden sm:inline">GPS</span>
            </button>
          </form>

          {/* Quick Area Chips */}
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
            {POPULAR_LANDMARKS.slice(0, 6).map((lm) => (
              <button
                key={lm.name}
                type="button"
                onClick={() => handleSelectPreset(lm)}
                className="px-2.5 py-1 rounded-lg bg-white border border-neutral-200 hover:border-emerald-500 text-[10px] font-semibold text-neutral-700 hover:text-emerald-800 whitespace-nowrap flex-shrink-0 transition-colors cursor-pointer shadow-2xs active:scale-95"
              >
                📍 {lm.name}
              </button>
            ))}
          </div>
        </div>

        {/* Google Maps View Area */}
        <div className="flex-1 relative bg-neutral-100 min-h-[200px] overflow-hidden">
          <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
            <Map
              mapId="DEMO_MAP_ID"
              defaultCenter={pinnedCoords}
              defaultZoom={17}
              mapTypeId={mapTypeId}
              gestureHandling="greedy"
              disableDefaultUI={false}
              zoomControl={true}
              mapTypeControl={false}
              streetViewControl={false}
              fullscreenControl={false}
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              onClick={(e) => {
                if (e.detail.latLng) {
                  const newC = {
                    lat: e.detail.latLng.lat,
                    lng: e.detail.latLng.lng,
                  };
                  setPinnedCoords(newC);
                  updateAddressFromCoords(newC);
                }
              }}
              className="w-full h-full"
            >
              <MapController
                pinnedCoords={pinnedCoords}
                targetPanCoords={cameraTarget?.coords || null}
                targetZoom={cameraTarget?.zoom || null}
                onPinMoved={(newCoords) => {
                  setPinnedCoords(newCoords);
                  updateAddressFromCoords(newCoords);
                }}
              />
            </Map>
          </APIProvider>

          {/* Floating Controls Overlay: Layer Switcher */}
          <div className="absolute right-3.5 top-3.5 z-20 flex flex-col gap-1.5 shadow-lg rounded-2xl overflow-hidden bg-white/95 backdrop-blur-md border border-neutral-300 p-1">
            <button
              id="btn-toggle-map-layer"
              type="button"
              onClick={toggleMapType}
              className="w-9 h-9 rounded-xl bg-white hover:bg-emerald-50 text-neutral-800 hover:text-emerald-800 flex items-center justify-center transition-all active:scale-90 cursor-pointer shadow-2xs"
              title="Toggle Satellite / Street View"
            >
              <Layers className="w-4 h-4 text-emerald-700" />
            </button>
          </div>

          {/* Map Layer & Status Tag */}
          <div className="absolute top-3.5 left-3.5 z-20 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-xl border border-neutral-200 text-[10px] font-bold text-neutral-800 shadow-sm pointer-events-none flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-emerald-600" />
            <span>Google Maps • {mapTypeId.toUpperCase()}</span>
          </div>
        </div>

        {/* Bottom Pinned Address Card & Confirmation */}
        <div className="p-3.5 bg-white border-t border-neutral-200 space-y-2.5 shadow-lg flex-shrink-0 z-10">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-neutral-700 flex items-center justify-between">
              <span className="flex items-center gap-1 text-emerald-800">
                <MapPin className="w-3.5 h-3.5" /> Selected Location Address:
              </span>
              <span className="text-[9px] font-mono text-neutral-500">
                {pinnedCoords.lat.toFixed(4)}° N, {pinnedCoords.lng.toFixed(4)}° E
              </span>
            </label>
            <input
              type="text"
              value={addressText}
              onChange={(e) => setAddressText(e.target.value)}
              placeholder="e.g. Jasonville Subdv, Barangay Junob, Dumaguete City, Negros Oriental"
              className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-xs font-semibold text-neutral-900 focus:bg-white focus:outline-none focus:border-emerald-600"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 py-2.5 rounded-xl border border-neutral-300 hover:bg-neutral-100 text-neutral-700 text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="btn-confirm-pinned-location"
              type="button"
              onClick={handleSave}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirm Location</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
