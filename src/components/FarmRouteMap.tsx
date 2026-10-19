import React, { useEffect, useMemo, useRef, useState } from 'react';
import { APIProvider, Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import { Layers, Navigation } from 'lucide-react';
import { Coordinates, calculateDistanceKm } from '../utils/geoDistance';

const GOOGLE_MAPS_API_KEY =
  (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY ||
  'AIzaSyCvp4aWzRvgEYkREXOkUqQL1ZL9nFLnC7M';

declare const google: any;

export interface FarmRouteMapProps {
  /** Where the haul starts — the supermarket hub saved in the Admin Profile tab. */
  origin: Coordinates;
  /** Where it ends — the farmer's house. */
  destination: Coordinates;
  originLabel?: string;
  destinationLabel?: string;
  originEmoji?: string;
  destinationEmoji?: string;
  /** Tailwind height class for the map container (default `h-60`, same as Admin Profile). */
  heightClassName?: string;
  onRouteCalculated?: (distanceKm: number, durationText: string) => void;
  /**
   * Stable identity for this specific route (order/haul id). Used to recreate
   * the Google Map when live route coordinates change, preventing one active
   * transaction from retaining another transaction's camera/destination state.
   */
  routeKey?: string;
}

/**
 * Builds an approximate road-aligned path used when DirectionsService is
 * unavailable (offline, quota exhausted or geocoder not loaded yet).
 */
function generateFallbackRoutePath(from: Coordinates, to: Coordinates): Coordinates[] {
  const mid = {
    lat: (from.lat + to.lat) / 2 + (from.lng > to.lng ? 0.0012 : -0.0012),
    lng: (from.lng + to.lng) / 2 + (from.lat > to.lat ? -0.0012 : 0.0012),
  };
  const quarter = {
    lat: from.lat + (mid.lat - from.lat) * 0.55 + 0.0005,
    lng: from.lng + (mid.lng - from.lng) * 0.4,
  };
  const threeQuarter = {
    lat: mid.lat + (to.lat - mid.lat) * 0.45,
    lng: mid.lng + (to.lng - mid.lng) * 0.6 + 0.0005,
  };
  return [from, quarter, mid, threeQuarter, to];
}

/**
 * Draws the red route line (glow + main polyline with direction arrows) between
 * the supermarket hub and the farmer's house, then fits the camera to both pins.
 * Mounted inside <Map>, for the admin's red-route controller.
 */
const FarmRouteController: React.FC<{
  origin: Coordinates;
  destination: Coordinates;
  onRouteCalculated?: (distanceKm: number, durationText: string) => void;
}> = ({ origin, destination, onRouteCalculated }) => {
  const map = useMap();

  // Primitive deps so a fresh object literal from the parent never restarts routing
  const originLat = origin.lat;
  const originLng = origin.lng;
  const destLat = destination.lat;
  const destLng = destination.lng;

  // Keep the latest callback without listing it as an effect dependency
  // (an inline arrow would otherwise re-request directions on every render).
  const onRouteCalculatedRef = useRef(onRouteCalculated);
  useEffect(() => {
    onRouteCalculatedRef.current = onRouteCalculated;
  });

  // Red Polyline Routing
  useEffect(() => {
    if (!map) return;

    let isMounted = true;
    let mainPolyline: google.maps.Polyline | null = null;
    let glowPolyline: google.maps.Polyline | null = null;

    const renderLines = (path: Coordinates[]) => {
      if (!isMounted || !map) return;

      if (mainPolyline) mainPolyline.setMap(null);
      if (glowPolyline) glowPolyline.setMap(null);

      // 1. Soft red halo behind the route
      glowPolyline = new google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: '#fca5a5',
        strokeOpacity: 0.75,
        strokeWeight: 9,
        map,
        zIndex: 5,
      });

      // 2. Solid red route with forward direction arrows
      mainPolyline = new google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: '#dc2626', // Vibrant Red
        strokeOpacity: 0.95,
        strokeWeight: 4,
        icons: [
          {
            icon: {
              path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
              scale: 2.5,
              strokeColor: '#ffffff',
              fillColor: '#991b1b',
              fillOpacity: 1,
              strokeWeight: 1,
            },
            offset: '35%',
            repeat: '110px',
          },
        ],
        map,
        zIndex: 10,
      });
    };

    const report = (km: number, minutes: number) => {
      if (!isMounted) return;
      onRouteCalculatedRef.current?.(Math.round(km * 10) / 10, `${Math.max(3, Math.round(minutes))} mins`);
    };

    const useFallbackPolyline = () => {
      renderLines(generateFallbackRoutePath({ lat: originLat, lng: originLng }, { lat: destLat, lng: destLng }));
      const km = calculateDistanceKm(originLat, originLng, destLat, destLng);
      report(km, km * 2.8 * 60); // ~28 km/h average farm-to-market speed
    };

    // Real road route via the Google Directions API
    if (typeof google !== 'undefined' && google.maps?.DirectionsService) {
      try {
        const directionsService = new google.maps.DirectionsService();
        directionsService.route(
          {
            origin: { lat: originLat, lng: originLng },
            destination: { lat: destLat, lng: destLng },
            travelMode: google.maps.TravelMode.DRIVING,
          },
          (result: any, status: any) => {
            if (!isMounted) return;
            if (status === google.maps.DirectionsStatus.OK && result && result.routes[0]) {
              const fullPath: Coordinates[] = result.routes[0].overview_path.map((p: any) => ({
                lat: p.lat(),
                lng: p.lng(),
              }));
              renderLines(fullPath);

              let totalMeters = 0;
              let totalSeconds = 0;
              result.routes[0].legs.forEach((leg: any) => {
                totalMeters += leg.distance?.value || 0;
                totalSeconds += leg.duration?.value || 0;
              });
              report(totalMeters / 1000, totalSeconds / 60);
              return;
            }
            useFallbackPolyline();
          }
        );
      } catch (e) {
        useFallbackPolyline();
      }
    } else {
      useFallbackPolyline();
    }

    return () => {
      isMounted = false;
      if (mainPolyline) mainPolyline.setMap(null);
      if (glowPolyline) glowPolyline.setMap(null);
    };
  }, [map, originLat, originLng, destLat, destLng]);

  // Fit the camera so both the hub and the farmer's house are visible
  useEffect(() => {
    if (!map) return;
    try {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend({ lat: originLat, lng: originLng });
      bounds.extend({ lat: destLat, lng: destLng });
      map.fitBounds(bounds, { top: 40, bottom: 40, left: 56, right: 56 });
    } catch (e) {
      map.panTo({
        lat: (originLat + destLat) / 2,
        lng: (originLng + destLng) / 2,
      });
    }
  }, [map, originLat, originLng, destLat, destLng]);

  return null;
};

/** Pans/zooms the camera when the floating GPS button is pressed (mirrors ProfileMapCamera). */
const RouteMapCamera: React.FC<{ target: Coordinates | null }> = ({ target }) => {
  const map = useMap();

  useEffect(() => {
    if (map && target) {
      map.panTo(target);
      map.setZoom(16);
    }
  }, [map, target]);

  return null;
};

/**
 * Live-transaction route map: a red line from the supermarket hub to the farmer's
 * house, rendered with the same Google Maps component used in Admin > Profile.
 */
export const FarmRouteMap: React.FC<FarmRouteMapProps> = ({
  origin,
  destination,
  originLabel = 'Supermarket Hub',
  destinationLabel = "Farmer's House",
  originEmoji = '🏪',
  destinationEmoji = '🏠',
  heightClassName = 'h-60',
  onRouteCalculated,
  routeKey,
}) => {
  const [mapTypeId, setMapTypeId] = useState<'roadmap' | 'hybrid'>('roadmap');
  const [isLocating, setIsLocating] = useState(false);
  const [cameraTarget, setCameraTarget] = useState<Coordinates | null>(null);

  // Google Maps' defaultCenter only applies on initial mount. Remount the whole
  // map whenever this route's origin/destination identity changes so two live
  // transactions (or a real-time coordinate update) never retain stale framing.
  const mapInstanceKey = useMemo(() => {
    const key = routeKey || 'route';
    return `${key}:${origin.lat.toFixed(6)},${origin.lng.toFixed(6)}:${destination.lat.toFixed(6)},${destination.lng.toFixed(6)}`;
  }, [
    routeKey,
    origin.lat,
    origin.lng,
    destination.lat,
    destination.lng,
  ]);

  // GPS button: centre the map on the device position (falls back to the farmer's house)
  const handleUseGps = () => {
    if (!navigator.geolocation) {
      setCameraTarget(destination);
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        setCameraTarget({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        setIsLocating(false);
        setCameraTarget(destination);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  return (
    <div className={`relative w-full ${heightClassName} rounded-2xl overflow-hidden border border-neutral-300 bg-neutral-100`}>
      <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
        <Map
          key={mapInstanceKey}
          mapId="DEMO_MAP_ID"
          defaultCenter={{
            lat: (origin.lat + destination.lat) / 2,
            lng: (origin.lng + destination.lng) / 2,
          }}
          defaultZoom={13}
          mapTypeId={mapTypeId}
          gestureHandling="greedy"
          disableDefaultUI={false}
          zoomControl={true}
          mapTypeControl={false}
          streetViewControl={false}
          fullscreenControl={false}
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          className="w-full h-full"
        >
          <RouteMapCamera target={cameraTarget} />
          <FarmRouteController
            origin={origin}
            destination={destination}
            onRouteCalculated={onRouteCalculated}
          />

          {/* Origin marker (Left side: e.g. Farmer 🌱) */}
          <AdvancedMarker position={{ lat: origin.lat, lng: origin.lng }} title={originLabel}>
            <div className="relative flex flex-col items-center group -translate-y-3 select-none pointer-events-none">
              <div className="w-10 h-10 rounded-2xl bg-emerald-600 border-2 border-white shadow-2xl flex items-center justify-center text-white text-lg transition-transform group-hover:scale-110">
                {originEmoji}
              </div>
              <div className="w-4 h-2 bg-black/40 rounded-full blur-xs mt-0.5" />
              <div className="absolute top-full mt-1 max-w-[120px] truncate bg-white/95 backdrop-blur-md px-2 py-0.5 rounded-xl border border-neutral-200 text-[10px] font-bold text-neutral-800 shadow-sm">
                {originLabel}
              </div>
            </div>
          </AdvancedMarker>

          {/* Destination marker (Right side: e.g. Admin Supermarket Hub 🏪) */}
          <AdvancedMarker position={{ lat: destination.lat, lng: destination.lng }} title={destinationLabel}>
            <div className="relative flex flex-col items-center group -translate-y-3 select-none pointer-events-none">
              <div className={`w-10 h-10 rounded-2xl ${destinationEmoji === '🏪' ? 'bg-blue-700' : 'bg-red-600'} border-2 border-white shadow-2xl flex items-center justify-center text-white text-lg transition-transform group-hover:scale-110`}>
                {destinationEmoji}
              </div>
              <div className="w-4 h-2 bg-black/40 rounded-full blur-xs mt-0.5" />
              <div className="absolute top-full mt-1 max-w-[130px] truncate bg-white/95 backdrop-blur-md px-2 py-0.5 rounded-xl border border-neutral-200 text-[10px] font-bold text-neutral-800 shadow-sm">
                {destinationLabel}
              </div>
            </div>
          </AdvancedMarker>
        </Map>
      </APIProvider>

      {/* Floating map controls — identical layout/style to the Admin Profile map */}
      <div className="absolute right-3 top-3 z-20 flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => setMapTypeId((t) => (t === 'roadmap' ? 'hybrid' : 'roadmap'))}
          className="w-9 h-9 rounded-xl bg-white/95 hover:bg-emerald-50 text-neutral-800 flex items-center justify-center transition-all active:scale-90 cursor-pointer shadow-2xs border border-neutral-200"
          title="Toggle satellite / street map"
        >
          <Layers className="w-4 h-4 text-emerald-700" />
        </button>
        <button
          type="button"
          onClick={handleUseGps}
          className="w-9 h-9 rounded-xl bg-white/95 hover:bg-emerald-50 text-neutral-800 flex items-center justify-center transition-all active:scale-90 cursor-pointer shadow-2xs border border-neutral-200"
          title="Pin my current GPS location"
        >
          <Navigation className={`w-4 h-4 text-emerald-700 ${isLocating ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Top-left hint pill */}
      <div className="absolute top-3 left-3 z-20 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-xl border border-neutral-200 text-[10px] font-bold text-neutral-800 shadow-sm pointer-events-none">
        {originEmoji} {originLabel} ➔ {destinationEmoji} {destinationLabel}
      </div>
    </div>
  );
};




