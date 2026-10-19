import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
} from '@vis.gl/react-google-maps';
import {
  Truck,
  MapPin,
  Package,
  CheckCircle2,
  Clock,
  Navigation,
  Phone,
  ShieldCheck,
  ArrowRight,
  Wallet,
  Check,
  AlertCircle,
  LogOut,
  MessageSquare,
  Sprout,
  ShoppingBag,
  User,
  Camera,
  Edit2,
  Layers,
  Compass,
  Maximize2,
  Minimize2,
  CornerUpRight,
  Zap,
  RotateCcw,
} from 'lucide-react';
import { TransportJob, UserProfile } from '../types';
import {
  Coordinates,
  DUMAGUETE_DEFAULT_COORDS,
  resolveCoordinates,
  calculateDistanceKm,
} from '../utils/geoDistance';

const GOOGLE_MAPS_API_KEY =
  (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY ||
  'AIzaSyCvp4aWzRvgEYkREXOkUqQL1ZL9nFLnC7M';

declare const google: any;

interface TransporterPortalViewProps {
  transporter: UserProfile;
  jobs: TransportJob[];
  registeredUsers?: UserProfile[];
  onAcceptJob: (jobId: string) => void;
  onUpdateJobStatus: (jobId: string, status: TransportJob['status']) => void;
  onOpenEditProfile?: () => void;
  onChatWithFarmer?: (job: TransportJob) => void;
  onChatWithBuyer?: (job: TransportJob) => void;
  onLogout?: () => void;
}

// Generate intermediate road-aligned waypoints for a smooth realistic route polyline
function generateRoadAlignedWaypoints(
  start: Coordinates,
  pickup: Coordinates,
  destination: Coordinates
): Coordinates[] {
  const points: Coordinates[] = [];

  // Leg 1: Transporter to Pickup
  points.push(start);
  const mid1 = {
    lat: (start.lat + pickup.lat) / 2 + (start.lng > pickup.lng ? 0.001 : -0.001),
    lng: (start.lng + pickup.lng) / 2 + (start.lat > pickup.lat ? -0.001 : 0.001),
  };
  points.push(mid1);
  points.push(pickup);

  // Leg 2: Pickup to Dropoff Destination
  const mid2 = {
    lat: (pickup.lat + destination.lat) / 2 + (pickup.lng > destination.lng ? -0.0012 : 0.0012),
    lng: (pickup.lng + destination.lng) / 2 + (pickup.lat > destination.lat ? 0.0012 : -0.0012),
  };
  points.push(mid2);
  points.push(destination);

  return points;
}

// Route Polyline and Map Bounds Controller
const MapRouteAndBoundsController: React.FC<{
  transporterCoords: Coordinates;
  pickupCoords: Coordinates;
  dropoffCoords: Coordinates;
  cameraTarget: { coords: Coordinates; zoom?: number; key: number } | null;
  onRouteCalculated?: (distanceKm: number, durationText: string) => void;
}> = ({
  transporterCoords,
  pickupCoords,
  dropoffCoords,
  cameraTarget,
  onRouteCalculated,
}) => {
  const map = useMap();

  // Handle explicit pan/zoom camera commands
  useEffect(() => {
    if (map && cameraTarget) {
      map.panTo(cameraTarget.coords);
      if (cameraTarget.zoom) {
        map.setZoom(cameraTarget.zoom);
      }
    }
  }, [map, cameraTarget]);

  // Handle Red Polyline Routing
  useEffect(() => {
    if (!map) return;

    let isMounted = true;
    let mainPolyline: google.maps.Polyline | null = null;
    let glowPolyline: google.maps.Polyline | null = null;

    const renderLines = (path: Coordinates[]) => {
      if (!isMounted || !map) return;

      // Remove any prior polylines if re-rendering
      if (mainPolyline) mainPolyline.setMap(null);
      if (glowPolyline) glowPolyline.setMap(null);

      // 1. Red Route Outer Glow (soft red halo)
      glowPolyline = new google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: '#fecaca', // Tailwind red-200 halo
        strokeOpacity: 0.7,
        strokeWeight: 8,
        map,
        zIndex: 5,
      });

      // 2. Red Route Main Line (Vibrant Crimson Red with directional arrows)
      mainPolyline = new google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: '#dc2626', // Vibrant Red
        strokeOpacity: 0.95,
        strokeWeight: 4.5,
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
            repeat: '120px',
          },
        ],
        map,
        zIndex: 10,
      });
    };

    // Calculate Route via DirectionsService if available
    if (typeof google !== 'undefined' && google.maps?.DirectionsService) {
      try {
        const directionsService = new google.maps.DirectionsService();
        directionsService.route(
          {
            origin: transporterCoords,
            waypoints: [{ location: pickupCoords, stopover: true }],
            destination: dropoffCoords,
            travelMode: google.maps.TravelMode.DRIVING,
            optimizeWaypoints: false,
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
              const km = Math.round((totalMeters / 1000) * 10) / 10;
              const mins = Math.max(3, Math.round(totalSeconds / 60));
              onRouteCalculated?.(km, `${mins} mins`);
              return;
            }

            // Fallback if Directions Service is unavailable
            useFallbackPolyline();
          }
        );
      } catch (e) {
        useFallbackPolyline();
      }
    } else {
      useFallbackPolyline();
    }

    function useFallbackPolyline() {
      const fallbackPoints = generateRoadAlignedWaypoints(
        transporterCoords,
        pickupCoords,
        dropoffCoords
      );
      renderLines(fallbackPoints);

      const d1 = calculateDistanceKm(transporterCoords.lat, transporterCoords.lng, pickupCoords.lat, pickupCoords.lng);
      const d2 = calculateDistanceKm(pickupCoords.lat, pickupCoords.lng, dropoffCoords.lat, dropoffCoords.lng);
      const totalKm = Math.round((d1 + d2) * 10) / 10;
      const estMins = Math.max(4, Math.round(totalKm * 2.8));
      onRouteCalculated?.(totalKm, `${estMins} mins`);
    }

    return () => {
      isMounted = false;
      if (mainPolyline) mainPolyline.setMap(null);
      if (glowPolyline) glowPolyline.setMap(null);
    };
  }, [map, transporterCoords, pickupCoords, dropoffCoords]);

  // Initial bounds fit to include Transporter, Farmer Pickup, and Buyer Dropoff
  useEffect(() => {
    if (!map) return;
    try {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(transporterCoords);
      bounds.extend(pickupCoords);
      bounds.extend(dropoffCoords);
      map.fitBounds(bounds, { top: 40, bottom: 40, left: 40, right: 40 });
    } catch (e) {
      map.panTo(pickupCoords);
    }
  }, [map, transporterCoords, pickupCoords, dropoffCoords]);

  return null;
};

export const TransporterPortalView: React.FC<TransporterPortalViewProps> = ({
  transporter,
  jobs,
  registeredUsers = [],
  onAcceptJob,
  onUpdateJobStatus,
  onOpenEditProfile,
  onChatWithFarmer,
  onChatWithBuyer,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<'active' | 'available' | 'history'>('active');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [mapTypeId, setMapTypeId] = useState<'roadmap' | 'hybrid'>('roadmap');
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [cameraTarget, setCameraTarget] = useState<{ coords: Coordinates; zoom?: number; key: number } | null>(null);
  const [routeStats, setRouteStats] = useState<{ distanceKm: number; durationText: string } | null>(null);

  const myActiveJobs = jobs.filter(
    (j) => j.assignedTransporterId === transporter.id && j.status !== 'delivered' && j.status !== 'cancelled'
  );

  const availableJobs = jobs.filter((j) => j.status === 'available');

  const completedJobs = jobs.filter(
    (j) => j.assignedTransporterId === transporter.id && j.status === 'delivered'
  );

  const totalEarnings = completedJobs.reduce((sum, j) => sum + j.earningsPeso, 0);

  // Synchronize selectedJobId strictly for active jobs in "My Hauls"
  useEffect(() => {
    if (myActiveJobs.length > 0) {
      const exists = myActiveJobs.some((j) => j.id === selectedJobId);
      if (!exists) {
        setSelectedJobId(myActiveJobs[0].id);
      }
    } else {
      setSelectedJobId(null);
    }
  }, [myActiveJobs, selectedJobId]);

  const activeSelectedJob = useMemo(() => {
    if (myActiveJobs.length === 0) {
      return null;
    }
    if (!selectedJobId) {
      return myActiveJobs[0];
    }
    return myActiveJobs.find((j) => j.id === selectedJobId) || myActiveJobs[0];
  }, [myActiveJobs, selectedJobId]);

  // Compute resolved coordinates for Transporter, Farmer (Pickup), and Buyer (Dropoff)
  const routePoints = useMemo(() => {
    // 1. Transporter Current Location
    const transporterResolved = resolveCoordinates(
      transporter.location || 'Dumaguete Public Market & Transport Terminal',
      transporter.latitude,
      transporter.longitude
    );

    if (!activeSelectedJob) {
      return {
        transporter: transporterResolved,
        pickup: { lat: transporterResolved.lat + 0.015, lng: transporterResolved.lng - 0.02 },
        dropoff: { lat: transporterResolved.lat - 0.01, lng: transporterResolved.lng + 0.015 },
        center: transporterResolved,
        leg1Km: 0,
        leg2Km: 0,
        totalKm: 0,
      };
    }

    // 2. Lookup Farmer coordinates
    const farmerUser = registeredUsers.find(
      (u) =>
        (u.farmName && activeSelectedJob.pickupFarm && u.farmName.trim().toLowerCase() === activeSelectedJob.pickupFarm.trim().toLowerCase()) ||
        (u.name && activeSelectedJob.pickupFarm && u.name.trim().toLowerCase() === activeSelectedJob.pickupFarm.trim().toLowerCase()) ||
        (u.farmName && activeSelectedJob.pickupLocation && activeSelectedJob.pickupLocation.toLowerCase().includes(u.farmName.toLowerCase()))
    );

    let pickupCoords = resolveCoordinates(
      activeSelectedJob.pickupLocation || farmerUser?.location || activeSelectedJob.pickupFarm,
      farmerUser?.latitude,
      farmerUser?.longitude
    );

    // 3. Lookup Buyer coordinates
    const buyerUser = registeredUsers.find(
      (u) =>
        u.name &&
        activeSelectedJob.buyerName &&
        u.name.trim().toLowerCase() === activeSelectedJob.buyerName.trim().toLowerCase()
    );

    let dropoffCoords = resolveCoordinates(
      activeSelectedJob.dropoffLocation || buyerUser?.location,
      buyerUser?.latitude,
      buyerUser?.longitude
    );

    // Guard against identical overlapping coordinates (ensure distinct marker positions)
    if (
      Math.abs(pickupCoords.lat - dropoffCoords.lat) < 0.0008 &&
      Math.abs(pickupCoords.lng - dropoffCoords.lng) < 0.0008
    ) {
      // Offset farmer pickup towards Valencia highlands
      pickupCoords = { lat: pickupCoords.lat - 0.012, lng: pickupCoords.lng - 0.025 };
    }

    if (
      Math.abs(transporterResolved.lat - pickupCoords.lat) < 0.0008 &&
      Math.abs(transporterResolved.lng - pickupCoords.lng) < 0.0008
    ) {
      transporterResolved.lat += 0.008;
      transporterResolved.lng += 0.006;
    }

    const centerCoords = {
      lat: (transporterResolved.lat + pickupCoords.lat + dropoffCoords.lat) / 3,
      lng: (transporterResolved.lng + pickupCoords.lng + dropoffCoords.lng) / 3,
    };

    const leg1 = calculateDistanceKm(
      transporterResolved.lat,
      transporterResolved.lng,
      pickupCoords.lat,
      pickupCoords.lng
    );
    const leg2 = calculateDistanceKm(
      pickupCoords.lat,
      pickupCoords.lng,
      dropoffCoords.lat,
      dropoffCoords.lng
    );

    return {
      transporter: transporterResolved,
      pickup: pickupCoords,
      dropoff: dropoffCoords,
      center: centerCoords,
      leg1Km: leg1,
      leg2Km: leg2,
      totalKm: Math.round((leg1 + leg2) * 10) / 10,
    };
  }, [activeSelectedJob, registeredUsers, transporter]);

  const handleSelectJobForMap = (job: TransportJob) => {
    setSelectedJobId(job.id);
    setCameraTarget({ coords: routePoints.center, zoom: 13, key: Date.now() });
  };

  const handleFitAllRouteBounds = useCallback(() => {
    setCameraTarget({ coords: routePoints.center, zoom: 13, key: Date.now() });
  }, [routePoints.center]);

  return (
    <div className="flex flex-col space-y-4 p-3.5 pb-8 w-full bg-white text-neutral-900">
      {/* Transporter Profile & Vehicle Card */}
      <div className="bg-gradient-to-br from-amber-50 via-white to-orange-50 border border-amber-200 rounded-3xl p-4 shadow-sm relative overflow-hidden">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {transporter.avatar ? (
              <img
                src={transporter.avatar}
                alt={transporter.name}
                className="w-14 h-14 rounded-2xl object-cover border-2 border-amber-500 shadow-xs flex-shrink-0"
              />
            ) : (
              <div
                onClick={onOpenEditProfile}
                className="w-14 h-14 rounded-2xl bg-white border-2 border-dashed border-amber-400 flex flex-col items-center justify-center text-amber-700 shadow-xs cursor-pointer hover:border-amber-600 transition-colors flex-shrink-0 group"
                title="Click to add profile picture"
              >
                <Camera className="w-5 h-5 text-amber-600 group-hover:scale-110 transition-transform" />
                <span className="text-[9px] font-bold text-amber-800 mt-0.5">Add Photo</span>
              </div>
            )}
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-base font-extrabold text-neutral-900 font-display">{transporter.name}</h2>
                <ShieldCheck className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-xs text-amber-800 font-bold">
                {transporter.vehicleType || 'Tricycle Cargo Hauler'}
              </p>
              <div className="flex items-center gap-2 text-[10px] text-neutral-500 mt-0.5">
                <span className="flex items-center gap-0.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-600" />
                  {transporter.location}
                </span>
                <span>•</span>
                <span>Plate: {transporter.plateNumber || 'DG-7821-NEG'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {onOpenEditProfile && (
              <button
                id="btn-transporter-edit-profile"
                onClick={onOpenEditProfile}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white hover:bg-neutral-50 text-neutral-700 hover:text-amber-800 border border-neutral-200 text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer"
                title="Edit Hauler Profile & Photo"
              >
                <Edit2 className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden xs:inline">Edit Profile</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Earnings Dashboard */}
        <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-amber-200/60">
          <div className="bg-white p-2.5 rounded-xl border border-amber-200/80 text-center shadow-xs">
            <span className="text-[10px] text-neutral-500 uppercase font-semibold">Today's Pay</span>
            <p className="text-base font-extrabold text-amber-700 font-display">₱{totalEarnings.toFixed(2)}</p>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-amber-200/80 text-center shadow-xs">
            <span className="text-[10px] text-neutral-500 uppercase font-semibold">Trips Done</span>
            <p className="text-base font-extrabold text-neutral-900 font-display">{completedJobs.length}</p>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-amber-200/80 text-center shadow-xs">
            <span className="text-[10px] text-neutral-500 uppercase font-semibold">Active Hauls</span>
            <p className="text-base font-extrabold text-emerald-700 font-display">{myActiveJobs.length}</p>
          </div>
        </div>
      </div>

      {/* LIVE DISPATCH & ROUTE MAP: Displayed ONLY when there is an active transaction in My Hauls */}
      {myActiveJobs.length > 0 && activeSelectedJob ? (
        <div className="bg-white border border-neutral-200/90 rounded-3xl overflow-hidden shadow-xs space-y-0">
          <div className="p-3.5 bg-gradient-to-r from-red-800 via-amber-800 to-emerald-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white shadow-xs">
                <Zap className="w-4 h-4 text-amber-300" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-black uppercase tracking-wider text-white">
                    Live Active Haul Route Navigation
                  </h3>
                  <span className="text-[9px] bg-red-600 text-white font-extrabold px-1.5 py-0.2 rounded-md shadow-2xs">
                    RED ROUTE ACTIVE
                  </span>
                </div>
                <p className="text-[10px] text-amber-100 font-medium truncate max-w-[220px] xs:max-w-xs">
                  Haul #{activeSelectedJob.id}: {activeSelectedJob.pickupFarm} ➔ {activeSelectedJob.buyerName}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setMapTypeId((prev) => (prev === 'roadmap' ? 'hybrid' : 'roadmap'))}
                className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                title="Toggle Satellite / Street View"
              >
                <Layers className="w-3 h-3" />
                <span>{mapTypeId === 'roadmap' ? 'Satellite' : 'Roadmap'}</span>
              </button>
              <button
                onClick={() => setIsMapExpanded((prev) => !prev)}
                className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                title={isMapExpanded ? 'Collapse Map' : 'Expand Map'}
              >
                {isMapExpanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
              </button>
            </div>
          </div>

          {/* Google Map Container */}
          <div className={`relative w-full transition-all duration-300 ${isMapExpanded ? 'h-[440px]' : 'h-72'}`}>
            <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
              <Map
                mapId="DEMO_MAP_ID"
                defaultCenter={routePoints.center}
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
                {/* Route Polyline (Red Shortcut Line) & Camera Controller */}
                <MapRouteAndBoundsController
                  transporterCoords={routePoints.transporter}
                  pickupCoords={routePoints.pickup}
                  dropoffCoords={routePoints.dropoff}
                  cameraTarget={cameraTarget}
                  onRouteCalculated={(km, duration) => setRouteStats({ distanceKm: km, durationText: duration })}
                />

                {/* 1. TRANSPORTER MARKER (You / Current Vehicle Location) */}
                <AdvancedMarker
                  position={routePoints.transporter}
                  title={`You (Hauler): ${transporter.name}`}
                  zIndex={35}
                >
                  <div className="flex flex-col items-center select-none group cursor-pointer">
                    <div className="bg-amber-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-lg border border-white whitespace-nowrap mb-0.5 flex items-center gap-1">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-200 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                      </span>
                      <span>🚚 You (Hauler)</span>
                    </div>
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-600 to-yellow-500 border-2 border-white shadow-2xl flex items-center justify-center text-white text-lg font-black transform group-hover:scale-110 transition-transform">
                      <Truck className="w-5 h-5 text-white stroke-[2.5]" />
                    </div>
                    <div className="w-4 h-2 bg-black/50 rounded-full blur-xs mt-0.5" />
                  </div>
                </AdvancedMarker>

                {/* 2. FARMER MARKER (Marker A - Farm Pickup Point) */}
                <AdvancedMarker
                  position={routePoints.pickup}
                  title={`Farm Pickup (A): ${activeSelectedJob.pickupFarm}`}
                  zIndex={25}
                >
                  <div className="flex flex-col items-center select-none group cursor-pointer">
                    <div className="bg-emerald-700 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md border border-white whitespace-nowrap mb-0.5 flex items-center gap-1">
                      <span>🌱 A: {activeSelectedJob.pickupFarm}</span>
                    </div>
                    <div className="w-9 h-9 rounded-2xl bg-emerald-600 border-2 border-white shadow-xl flex items-center justify-center text-white text-base font-black transform group-hover:scale-110 transition-transform">
                      A
                    </div>
                    <div className="w-3 h-1.5 bg-black/40 rounded-full blur-xs mt-0.5" />
                  </div>
                </AdvancedMarker>

                {/* 3. BUYER MARKER (Marker B - Customer Dropoff Point) */}
                <AdvancedMarker
                  position={routePoints.dropoff}
                  title={`Customer Dropoff (B): ${activeSelectedJob.buyerName}`}
                  zIndex={25}
                >
                  <div className="flex flex-col items-center select-none group cursor-pointer">
                    <div className="bg-sky-700 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md border border-white whitespace-nowrap mb-0.5 flex items-center gap-1">
                      <span>🏠 B: {activeSelectedJob.buyerName}</span>
                    </div>
                    <div className="w-9 h-9 rounded-2xl bg-sky-600 border-2 border-white shadow-xl flex items-center justify-center text-white text-base font-black transform group-hover:scale-110 transition-transform">
                      B
                    </div>
                    <div className="w-3 h-1.5 bg-black/40 rounded-full blur-xs mt-0.5" />
                  </div>
                </AdvancedMarker>
              </Map>
            </APIProvider>

            {/* Quick Focus Controls Bar (Floating Top-Right) */}
            <div className="absolute top-2.5 right-2.5 z-20 flex flex-col gap-1 bg-white/95 backdrop-blur-md p-1 rounded-2xl border border-neutral-200 shadow-md">
              <button
                type="button"
                onClick={handleFitAllRouteBounds}
                className="p-1.5 rounded-xl hover:bg-neutral-100 text-neutral-800 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                title="Show Full Route Overview (All 3 Points)"
              >
                <RotateCcw className="w-3.5 h-3.5 text-neutral-600" />
                <span className="hidden xs:inline">Fit Route</span>
              </button>
              <button
                type="button"
                onClick={() => setCameraTarget({ coords: routePoints.transporter, zoom: 16, key: Date.now() })}
                className="p-1.5 rounded-xl hover:bg-amber-50 text-amber-800 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                title="Center on My Location"
              >
                <Truck className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden xs:inline">My Spot</span>
              </button>
            </div>

            {/* Map Route Floating Details & Shortcut Information */}
            <div className="absolute bottom-2.5 left-2.5 right-2.5 bg-white/95 backdrop-blur-md p-3 rounded-2xl border border-red-200 shadow-lg text-xs space-y-2">
              <div className="flex items-center justify-between gap-2 border-b border-neutral-200/80 pb-2">
                <div className="flex items-center gap-1.5">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-red-600 animate-pulse" />
                  <span className="text-[11px] font-black text-red-900 uppercase tracking-wide">
                    Red Shortcut Route Active
                  </span>
                </div>
                <div className="text-[11px] font-extrabold text-neutral-900 bg-red-50 text-red-700 px-2 py-0.5 rounded-lg border border-red-200">
                  ⚡ {routeStats?.distanceKm || routePoints.totalKm} km • Est. {routeStats?.durationText || '12 mins'}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 text-[11px] font-bold text-neutral-900 truncate">
                    <span className="text-amber-700">🚚 You</span>
                    <span>➔</span>
                    <span className="text-emerald-700">🌱 {activeSelectedJob.pickupFarm.split(' ')[0]}</span>
                    <span>➔</span>
                    <span className="text-sky-700">🏠 {activeSelectedJob.buyerName.split(' ')[0]}</span>
                  </div>
                  <div className="text-[10px] text-neutral-500 truncate mt-0.5">
                    Leg 1 to Farm: ~{routePoints.leg1Km} km • Leg 2 to Doorstep: ~{routePoints.leg2Km} km
                  </div>
                </div>

                {/* Fast Camera Jump Buttons */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setCameraTarget({ coords: routePoints.transporter, zoom: 16, key: Date.now() })}
                    className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 text-[10px] font-bold border border-amber-200 cursor-pointer"
                    title="Focus on Transporter"
                  >
                    🚚 You
                  </button>
                  <button
                    type="button"
                    onClick={() => setCameraTarget({ coords: routePoints.pickup, zoom: 16, key: Date.now() })}
                    className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200 cursor-pointer"
                    title="Focus on Farm"
                  >
                    🌱 Farm
                  </button>
                  <button
                    type="button"
                    onClick={() => setCameraTarget({ coords: routePoints.dropoff, zoom: 16, key: Date.now() })}
                    className="px-2 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 text-[10px] font-bold border border-sky-200 cursor-pointer"
                    title="Focus on Customer"
                  >
                    🏠 Buyer
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Navigation Sub-tabs */}
      <div className="flex rounded-2xl bg-neutral-100 p-1 border border-neutral-200">
        <button
          id="btn-tab-my-hauls"
          onClick={() => setActiveTab('active')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'active'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
          <span>My Hauls ({myActiveJobs.length})</span>
        </button>
        <button
          id="btn-tab-available-jobs"
          onClick={() => setActiveTab('available')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'available'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>Available Jobs ({availableJobs.length})</span>
        </button>
        <button
          id="btn-tab-haul-history"
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'history'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>History</span>
        </button>
      </div>

      {/* Active Jobs Tab */}
      {activeTab === 'active' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700">
              Active Deliveries in Transit ({myActiveJobs.length})
            </h3>
            <span className="text-[10px] text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300 font-semibold">
              Dumaguete City Network
            </span>
          </div>

          {myActiveJobs.length === 0 ? (
            <div className="bg-white border border-neutral-200 rounded-3xl p-6 text-center space-y-2 shadow-xs">
              <Truck className="w-8 h-8 text-neutral-400 mx-auto" />
              <h4 className="text-sm font-bold text-neutral-900">No active deliveries</h4>
              <p className="text-xs text-neutral-500">
                You have no farm-to-door trips currently assigned. Check available jobs to pick up fresh crates!
              </p>
              <button
                onClick={() => setActiveTab('available')}
                className="mt-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                Browse Available Jobs ({availableJobs.length})
              </button>
            </div>
          ) : (
            myActiveJobs.map((job) => {
              const isSelectedOnMap = selectedJobId === job.id;
              return (
                <div
                  key={job.id}
                  className={`bg-white border rounded-3xl p-4 space-y-3 shadow-xs transition-all ${
                    isSelectedOnMap ? 'border-amber-400 ring-2 ring-amber-400/20' : 'border-neutral-200'
                  }`}
                >
                  {/* Header with order code & fee */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-neutral-900">Job #{job.id}</span>
                        <span className="text-[10px] text-neutral-400">Ref: {job.orderId}</span>
                      </div>
                      <p className="text-[11px] text-amber-700 font-bold mt-0.5">
                        Transporter Payout: ₱{job.earningsPeso.toFixed(2)} (Direct Cash/GCash)
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        job.status === 'accepted'
                          ? 'bg-sky-50 text-sky-800 border-sky-300'
                          : job.status === 'picked_up'
                          ? 'bg-amber-50 text-amber-800 border-amber-300'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      }`}
                    >
                      {job.status === 'accepted' && 'En Route to Farm'}
                      {job.status === 'picked_up' && 'Crates Loaded'}
                      {job.status === 'in_transit' && 'On the Road'}
                    </span>
                  </div>

                  {/* Route: Pickup & Dropoff */}
                  <div className="bg-neutral-50 p-3 rounded-2xl border border-neutral-200 space-y-2.5 text-xs">
                    {/* Pickup Point */}
                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5">
                        A
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-semibold text-neutral-500 uppercase">Farm Pickup Point</p>
                        <p className="text-xs font-bold text-neutral-900 truncate">{job.pickupFarm}</p>
                        <p className="text-[11px] text-neutral-600 truncate">{job.pickupLocation}</p>
                      </div>
                    </div>

                    {/* Route divider */}
                    <div className="border-l-2 border-dashed border-neutral-300 ml-2.5 h-3" />

                    {/* Dropoff Point */}
                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-sky-100 text-sky-800 flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5">
                        B
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-semibold text-neutral-500 uppercase">Buyer Dropoff</p>
                        <p className="text-xs font-bold text-neutral-900 truncate">{job.buyerName}</p>
                        <p className="text-[11px] text-neutral-600">{job.dropoffLocation}</p>
                      </div>
                    </div>
                  </div>

                  {/* Cargo Details */}
                  <div className="text-[11px] text-neutral-600 flex items-center justify-between px-1">
                    <span>Cargo: <strong className="text-neutral-800">{job.itemsSummary}</strong></span>
                    <span className="font-semibold text-neutral-700">~{job.weightKgEst} kg</span>
                  </div>

                  {/* Action row: Map focus, Chat Farmer & Customer */}
                  <div className="pt-2 border-t border-neutral-100 flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleSelectJobForMap(job)}
                      className="px-2.5 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-900 text-xs font-bold flex items-center gap-1 border border-red-200 transition-colors cursor-pointer"
                    >
                      <Zap className="w-3.5 h-3.5 text-red-600" />
                      <span>{isSelectedOnMap ? 'Viewing Red Route' : 'Show Red Route'}</span>
                    </button>

                    {onChatWithFarmer && (() => {
                      const isFarmerMe =
                        job.pickupFarm && transporter.name && job.pickupFarm.toLowerCase() === transporter.name.toLowerCase();
                      const isFarmerRegistered =
                        registeredUsers.length > 0 &&
                        registeredUsers.some(
                          (u) =>
                            (u.name && job.pickupFarm && u.name.toLowerCase() === job.pickupFarm.toLowerCase()) ||
                            (u.farmName && job.pickupFarm && u.farmName.toLowerCase() === job.pickupFarm.toLowerCase())
                        );
                      if (isFarmerMe || !isFarmerRegistered) return null;
                      return (
                        <button
                          id={`btn-transporter-chat-farmer-${job.id}`}
                          onClick={() => onChatWithFarmer(job)}
                          className="flex-1 py-1.5 px-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-emerald-800 text-xs font-semibold flex items-center justify-center gap-1.5 border border-neutral-200 transition-colors cursor-pointer"
                        >
                          <Sprout className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="truncate">Chat Farmer</span>
                        </button>
                      );
                    })()}

                    {onChatWithBuyer && (() => {
                      const isBuyerMe =
                        job.buyerName && transporter.name && job.buyerName.toLowerCase() === transporter.name.toLowerCase();
                      const isBuyerRegistered =
                        registeredUsers.length > 0 &&
                        registeredUsers.some(
                          (u) => u.name && job.buyerName && u.name.toLowerCase() === job.buyerName.toLowerCase()
                        );
                      if (isBuyerMe || !isBuyerRegistered) return null;
                      return (
                        <button
                          id={`btn-transporter-chat-buyer-${job.id}`}
                          onClick={() => onChatWithBuyer(job)}
                          className="flex-1 py-1.5 px-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-sky-800 text-xs font-semibold flex items-center justify-center gap-1.5 border border-neutral-200 transition-colors cursor-pointer"
                        >
                          <ShoppingBag className="w-3.5 h-3.5 text-sky-600" />
                          <span className="truncate">Chat Customer</span>
                        </button>
                      );
                    })()}
                  </div>

                  {/* Live Status Progression Buttons (Updates Job AND Order Status in Real-Time) */}
                  <div className="pt-2 border-t border-neutral-100 space-y-2">
                    <p className="text-[10px] text-neutral-500 font-semibold uppercase">
                      Update Trip Progress (Syncs to Buyer & Farmer):
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        id={`btn-crates-loaded-${job.id}`}
                        onClick={() => onUpdateJobStatus(job.id, 'picked_up')}
                        disabled={job.status === 'picked_up' || job.status === 'in_transit'}
                        className={`p-2 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                          job.status === 'picked_up'
                            ? 'bg-amber-100 text-amber-900 border-amber-400 shadow-2xs font-extrabold ring-1 ring-amber-400'
                            : job.status === 'in_transit'
                            ? 'bg-neutral-100 text-neutral-400 border-neutral-200 cursor-not-allowed'
                            : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                        }`}
                      >
                        1. Crates Loaded
                      </button>

                      <button
                        id={`btn-on-the-road-${job.id}`}
                        onClick={() => onUpdateJobStatus(job.id, 'in_transit')}
                        disabled={job.status === 'in_transit'}
                        className={`p-2 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                          job.status === 'in_transit'
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-400 shadow-2xs font-extrabold ring-1 ring-emerald-400'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300'
                        }`}
                      >
                        2. On the Road
                      </button>

                      <button
                        id={`btn-delivered-${job.id}`}
                        onClick={() => onUpdateJobStatus(job.id, 'delivered')}
                        className="p-2 rounded-xl text-[10px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-600 transition-all shadow-xs cursor-pointer active:scale-95"
                      >
                        3. Delivered & Paid ✓
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Available Jobs Tab */}
      {activeTab === 'available' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700">
              Negros Oriental Farm-to-Market Dispatches ({availableJobs.length})
            </h3>
            <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">Live Haul Board</span>
          </div>

          {availableJobs.length === 0 ? (
            <div className="bg-white border border-neutral-200 rounded-3xl p-6 text-center space-y-2 shadow-xs">
              <Check className="w-8 h-8 text-emerald-600 mx-auto" />
              <h4 className="text-sm font-bold text-neutral-900">All orders are dispatched!</h4>
              <p className="text-xs text-neutral-500">
                New farm-gate delivery orders will show up here as soon as buyers check out in Dumaguete City.
              </p>
            </div>
          ) : (
            availableJobs.map((job) => (
              <div
                key={job.id}
                className="bg-white border border-neutral-200 rounded-3xl p-4 space-y-3 shadow-xs"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-bold text-neutral-900">Job #{job.id}</span>
                    <p className="text-[11px] text-emerald-700 font-bold mt-0.5">
                      Earn: ₱{job.earningsPeso.toFixed(2)} (Delivery Fee)
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full">
                      Ready for Pickup
                    </span>
                  </div>
                </div>

                <div className="bg-neutral-50 p-3 rounded-2xl border border-neutral-200 space-y-2 text-xs">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-[10px] text-neutral-500 uppercase font-semibold">Farm:</p>
                      <p className="font-bold text-neutral-900">{job.pickupFarm}</p>
                      <p className="text-[11px] text-neutral-600">{job.pickupLocation}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 pt-1 border-t border-neutral-200">
                    <Navigation className="w-3.5 h-3.5 text-sky-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-[10px] text-neutral-500 uppercase font-semibold">Deliver To:</p>
                      <p className="font-bold text-neutral-900">{job.buyerName}</p>
                      <p className="text-[11px] text-neutral-600">{job.dropoffLocation}</p>
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-neutral-600 flex items-center justify-between px-1">
                  <span>Produce: <strong className="text-neutral-800">{job.itemsSummary}</strong></span>
                  <span className="text-neutral-500">Est. Weight: ~{job.weightKgEst} kg</span>
                </div>

                <button
                  id={`btn-accept-haul-${job.id}`}
                  onClick={() => {
                    onAcceptJob(job.id);
                    setSelectedJobId(job.id);
                    setActiveTab('active');
                  }}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
                >
                  <Truck className="w-3.5 h-3.5" />
                  Accept this Haul & Launch Live Route (Earn ₱{job.earningsPeso.toFixed(2)})
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700">
            Completed Trips ({completedJobs.length})
          </h3>

          <div className="bg-white border border-neutral-200 rounded-2xl p-3.5 space-y-2 shadow-xs">
            <div className="flex justify-between items-center text-xs">
              <span className="text-neutral-500">Total Transport Income:</span>
              <span className="text-amber-700 font-bold text-sm">₱{totalEarnings.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-neutral-500">Coverage Area:</span>
              <span className="text-neutral-800 font-medium">Valencia, Sibulan, Dauin &rarr; Dumaguete</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-neutral-500">Payment Status:</span>
              <span className="text-emerald-700 font-semibold">100% Remitted Direct via Cash/GCash</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
