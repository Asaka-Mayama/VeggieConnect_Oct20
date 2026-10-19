import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Shield,
  Users,
  Sprout,
  Truck,
  ShoppingBag,
  Package,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  LogOut,
  RefreshCw,
  Edit3,
  Trash2,
  Check,
  AlertCircle,
  Eye,
  Phone,
  Mail,
  MapPin,
  FileText,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Scale,
  BarChart2,
  Minus,
  Info,
  Sliders,
  Layers,
  Sparkles,
  ArrowRight,
  Maximize2,
  Minimize2,
  Lock,
  Wifi,
  Battery,
  Signal,
  Save,
  X,
  ChevronRight,
  Printer,
  Calendar,
  Receipt,
  Database,
  Copy,
  Download,
  Code2,
  Server,
  MessageSquare,
  Send,
  Store,
  Boxes,
  PackageCheck,
  User,
  Navigation,
} from 'lucide-react';
import { UserProfile, ProduceItem, Order, TransportJob, DirectMessage } from '../types';
import { appSync } from '../utils/appSync';
import { DA_DAILY_PRICES, DA_BULLETIN_METADATA, findMatchingDAPrice } from '../data/daPricesData';
import { generateVeggieConnect2Sql } from '../data/xamppSqlData';
import { APIProvider, Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import { resolveAddressFromCoords, calculateDistanceKm } from '../utils/geoDistance';
import { FarmRouteMap } from './FarmRouteMap';
import {
  SUPERMARKET_STORAGE_KEY,
  ADMIN_HUB_STORAGE_KEY,
  SupermarketLocation,
  getAdminProfileForLocationFallback,
  resolveLiveTransactionAdminLocation,
  resolveFarmHouseCoordinates,
  useAdminLocationSyncTick,
} from '../utils/farmRoute';

const GOOGLE_MAPS_API_KEY =
  (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY ||
  'AIzaSyCvp4aWzRvgEYkREXOkUqQL1ZL9nFLnC7M';

// Active module tab in the Admin Mobile App bottom navigation.
// Note: the SQL DB module has no menu item anymore — it is deep-linked at /sql.
type AdminModuleTab =
  | 'overview'
  | 'prices'
  | 'users'
  | 'produce'
  | 'stocks'
  | 'transactions'
  | 'database'
  | 'profile';

// Supermarket hub state/helpers are shared with the live route map via utils/farmRoute
// (the admin pins the hub location from the Profile tab).

// Pans the Google Map camera only when a new target is explicitly requested (GPS button)
const ProfileMapCamera: React.FC<{
  target: { lat: number; lng: number; key: number } | null;
}> = ({ target }) => {
  const map = useMap();

  useEffect(() => {
    if (map && target) {
      map.panTo({ lat: target.lat, lng: target.lng });
      map.setZoom(16);
    }
  }, [map, target]);

  return null;
};

interface AdminAppProps {
  currentUser: UserProfile | null;
  registeredUsers: UserProfile[];
  produceList: ProduceItem[];
  orders: Order[];
  transportJobs: TransportJob[];
  messages?: DirectMessage[];
  onSendMessage?: (text: string, partner: any) => void;
  onUpdateUser: (user: UserProfile) => void;
  onDeleteUser: (userId: string) => void;
  onUpdateProduce: (produce: ProduceItem) => void;
  onDeleteProduce: (produceId: string) => void;
  onBuyFarmerProduct?: (farmerProduce: ProduceItem, boughtQuantity: number, resalePrice?: number) => void;
  onPutInSupermarketStock?: (productData: any) => void;
  onUpdateOrderStatus?: (
    orderId: string,
    status: any,
    cancelReason?: string,
    cancelledBy?: string
  ) => void;
  onUpdateTransportJobStatus?: (jobId: string, status: TransportJob['status']) => void;
  onAcceptTransportJob?: (jobId: string) => void;
  onAdminLogin: (adminUser: UserProfile) => void;
  onAdminLogout: () => void;
  onSwitchToMarketApp: () => void;
  onOpenMarketAppNewTab: () => void;
  adminPath?: 'admin' | 'sql';
}

export const AdminApp: React.FC<AdminAppProps> = ({
  currentUser,
  registeredUsers,
  produceList,
  orders,
  transportJobs,
  messages,
  onSendMessage,
  onUpdateUser,
  onDeleteUser,
  onUpdateProduce,
  onDeleteProduce,
  onBuyFarmerProduct,
  onPutInSupermarketStock,
  onUpdateOrderStatus,
  onUpdateTransportJobStatus,
  onAcceptTransportJob,
  onAdminLogin,
  onAdminLogout,
  onSwitchToMarketApp,
  onOpenMarketAppNewTab,
  adminPath = 'admin',
}) => {
  // Mobile hardware clock
  const [currentTime, setCurrentTime] = useState<string>('09:41');
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

  // Check if currently authenticated as admin
  const isAdminAuthenticated = currentUser && currentUser.role === 'admin';

  // Admin login form state (Empty by default as requested: user will type credentials)
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  const [adminTab, setAdminTab] = useState<AdminModuleTab>(
    adminPath === 'sql' ? 'database' : 'overview'
  );

  // Cancellation Modal for Admin
  const [adminOrderToCancel, setAdminOrderToCancel] = useState<Order | null>(null);
  const [adminCancelReasonInput, setAdminCancelReasonInput] = useState<string>('');

  // Deep-link: typing localhost:3000/sql opens the SQL Database module directly
  useEffect(() => {
    if (adminPath === 'sql') setAdminTab('database');
  }, [adminPath]);

  // Keep the browser URL in sync: /sql <-> SQL DB tab, /admin <-> every other tab
  useEffect(() => {
    try {
      const current = window.location.pathname;
      if (current !== '/sql' && current !== '/admin') return;
      const desired = adminTab === 'database' ? '/sql' : '/admin';
      if (current !== desired) {
        window.history.replaceState({}, '', desired);
        window.dispatchEvent(new Event('popstate'));
      }
    } catch {
      /* history API unavailable */
    }
  }, [adminTab]);

  const [transactionSubTab, setTransactionSubTab] = useState<'live_logistics' | 'all_orders'>('live_logistics');

  // Stocks Module State (Products Owned/Bought & Supermarket Shelf)
  const [stocksSubTab, setStocksSubTab] = useState<'owned_bought' | 'supermarket_shelf'>('owned_bought');
  const [stocksSearch, setStocksSearch] = useState('');
  const [stocksFilter, setStocksFilter] = useState<'all' | 'ready_to_stock' | 'already_stocked'>('all');

  // "Put in Supermarket Store Stock" Modal State
  const [puttingInStockItem, setPuttingInStockItem] = useState<{
    id: string;
    produceId?: string;
    orderId?: string;
    name: string;
    category?: string;
    unit: string;
    quantityBought: number;
    costPricePerUnit: number;
    farmerName: string;
    farmName: string;
    farmerId?: string;
    imageUrl?: string;
    variety?: string;
    isOrganic?: boolean;
    farmingMethod?: string;
    supermarketStockQty?: number;
    supermarketPrice?: number;
    isInSupermarketStock?: boolean;
    isPurchased?: boolean;
    isDelivered?: boolean;
    supermarketItem?: ProduceItem;
    originalProduceItem?: ProduceItem;
  } | null>(null);

  const [stockModalQty, setStockModalQty] = useState<number>(10);
  const [stockModalPrice, setStockModalPrice] = useState<number>(50);
  const [stockModalCategory, setStockModalCategory] = useState<string>('Vegetables');
  const [stockModalNote, setStockModalNote] = useState<string>('');

  // SQL Copy & Download State
  const [copiedSql, setCopiedSql] = useState(false);
  const handleCopySql = () => {
    const sql = generateVeggieConnect2Sql(registeredUsers, produceList, orders, transportJobs);
    navigator.clipboard.writeText(sql).then(() => {
      setCopiedSql(true);
      showToast('Copied veggie_connect2.sql to clipboard!');
      setTimeout(() => setCopiedSql(false), 2500);
    }).catch(() => {
      showToast('Copied SQL to clipboard');
    });
  };

  const handleDownloadSql = () => {
    const sql = generateVeggieConnect2Sql(registeredUsers, produceList, orders, transportJobs);
    const blob = new Blob([sql], { type: 'application/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'veggie_connect2.sql';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Downloaded veggie_connect2.sql!');
  };

  // Search and filter states
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'farmer' | 'buyer' | 'suspended'>('all');
  const [produceSearch, setProduceSearch] = useState('');
  const [transactionSearch, setTransactionSearch] = useState('');
  const [transactionStatusFilter, setTransactionStatusFilter] = useState<'all' | 'completed' | 'delivered' | 'in_transit' | 'pending' | 'cancelled'>('all');
  const [haulFilter, setHaulFilter] = useState<'active' | 'in_transit' | 'delivered' | 'cancelled' | 'all'>('active');

  // DA Bantay Presyo search (category buttons removed)
  const [daPriceSearch, setDaPriceSearch] = useState('');

  // Chat Farmer State
  const [chattingProduce, setChattingProduce] = useState<ProduceItem | null>(null);
  const [farmerChatText, setFarmerChatText] = useState('');
  const [localAdminMessages, setLocalAdminMessages] = useState<DirectMessage[]>(messages || []);

  useEffect(() => {
    if (messages) {
      setLocalAdminMessages(messages);
    }
  }, [messages]);

  const chattingFarmer = useMemo(() => {
    if (!chattingProduce) return null;
    return (
      registeredUsers.find(
        (u) =>
          u.role === 'farmer' &&
          (u.id === chattingProduce.farmerId ||
            (u.farmName && chattingProduce.farmName && u.farmName.trim().toLowerCase() === chattingProduce.farmName.trim().toLowerCase()) ||
            (u.name && chattingProduce.farmerName && u.name.trim().toLowerCase() === chattingProduce.farmerName.trim().toLowerCase()))
      ) || null
    );
  }, [chattingProduce, registeredUsers]);

  const farmerConversation = useMemo(() => {
    if (!chattingProduce) return [];
    const fId = chattingProduce.farmerId;
    const fName = chattingProduce.farmerName?.trim().toLowerCase();
    const farmName = chattingProduce.farmName?.trim().toLowerCase();

    return localAdminMessages.filter((m) => {
      const matchRecipient = m.recipientId === fId || (fName && m.recipientName?.trim().toLowerCase() === fName);
      const matchSender = m.senderId === fId || (fName && m.senderName?.trim().toLowerCase() === fName);
      const matchProduce = m.farmerId === fId || (farmName && m.farmerName?.trim().toLowerCase() === farmName);
      return matchRecipient || matchSender || matchProduce;
    });
  }, [chattingProduce, localAdminMessages]);

  const handleOpenFarmerChat = (produce: ProduceItem) => {
    setChattingProduce(produce);
    setFarmerChatText('');
  };

  const handleSendFarmerMessage = (presetText?: string) => {
    const textToSend = (presetText || farmerChatText).trim();
    if (!textToSend || !chattingProduce) return;

    const farmerId = chattingProduce.farmerId || chattingFarmer?.id || 'farmer-contact';
    const farmerName = chattingProduce.farmerName || chattingFarmer?.name || 'Local Farmer';

    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const timestamp = `${hours}:${minutes}`;

    const newMsg: DirectMessage = {
      id: `msg-${Date.now()}`,
      senderId: currentUser?.id || 'admin-main',
      senderName: currentUser?.name || 'DA Regional Administrator',
      senderRole: 'admin',
      recipientId: farmerId,
      recipientName: farmerName,
      recipientRole: 'farmer',
      text: textToSend,
      timestamp,
      isRead: false,
      produceName: chattingProduce.name,
      farmerId,
      farmerName,
      buyerId: currentUser?.id || 'admin-main',
      buyerName: currentUser?.name || 'DA Regional Administrator',
    };

    setLocalAdminMessages((prev) => [...prev, newMsg]);
    setFarmerChatText('');

    if (onSendMessage) {
      onSendMessage(textToSend, {
        id: farmerId,
        name: farmerName,
        role: 'farmer',
        farmName: chattingProduce.farmName,
        produceContext: chattingProduce.name,
      });
    } else {
      fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMsg),
      }).catch((e) => console.log('Message sync notice:', e));
    }

    appSync.publish('MESSAGES_UPDATED', newMsg, 'admin');
    showToast(`Message sent to ${farmerName}!`);
  };

  // Modal / Editing states
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editingProduceItem, setEditingProduceItem] = useState<ProduceItem | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [produceToDelete, setProduceToDelete] = useState<ProduceItem | null>(null);
  const [buyingProduceItem, setBuyingProduceItem] = useState<ProduceItem | null>(null);
  const [buyQty, setBuyQty] = useState<number>(0);
  const [produceSubTab, setProduceSubTab] = useState<'supermarket' | 'farmer_offers'>('farmer_offers');

  // Selected Transaction Receipt Modal
  const [selectedReceiptData, setSelectedReceiptData] = useState<{
    order?: Order;
    job?: TransportJob;
    farmer?: UserProfile;
    buyer?: UserProfile;
  } | null>(null);

  // Toast message
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // ---------------------------------------------------------------------------
  // PROFILE TAB: admin account card + supermarket location pinned on Google Maps
  // ---------------------------------------------------------------------------
  // Origin of the live "Route to Farmer's House" map. Prefer the saved
  // supermarket pin; seed the admin's own address/GPS only while no custom pin exists.
  const adminLocationSyncTick = useAdminLocationSyncTick();
  const adminProfile = useMemo(
    () => getAdminProfileForLocationFallback(currentUser, registeredUsers),
    [currentUser, registeredUsers, adminLocationSyncTick]
  );
  const [supermarket, setSupermarket] = useState<SupermarketLocation>(() =>
    resolveLiveTransactionAdminLocation(registeredUsers, adminProfile)
  );

  // True once the user taps/drags the pin or edits the fields — blocks the
  // re-read below from snapping the pin back to the saved location mid-edit.
  const [supermarketDirty, setSupermarketDirty] = useState(false);

  // Re-read the authoritative saved location whenever the admin profile or
  // registered-admin fallback data changes — but NEVER while the user is
  // mid-edit (that is what snapped the pin back to its original position).
  useEffect(() => {
    if (supermarketDirty) return;
    setSupermarket(resolveLiveTransactionAdminLocation(registeredUsers, adminProfile));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminProfile, registeredUsers, adminLocationSyncTick]);

  const [isLocating, setIsLocating] = useState(false);
  const [profileMapType, setProfileMapType] = useState<'roadmap' | 'hybrid'>('roadmap');
  const [profileCameraTarget, setProfileCameraTarget] = useState<{
    lat: number;
    lng: number;
    key: number;
  } | null>(null);

  // Origin of the live "Route to Farmer's House" map (re-read after every save)
  const supermarketHub = useMemo(
    () => ({ lat: supermarket.latitude, lng: supermarket.longitude }),
    [supermarket.latitude, supermarket.longitude]
  );
  // Distance / ETA reported by each live haul's red route map
  const [haulRouteStats, setHaulRouteStats] = useState<Record<string, { km: number; durationText: string }>>({});

  // Move the supermarket pin (map tap, marker drag or GPS) and resolve its address
  const handlePinSupermarket = (lat: number, lng: number) => {
    if (isNaN(lat) || isNaN(lng)) return;
    setSupermarketDirty(true);
    setSupermarket((prev) => ({
      ...prev,
      latitude: lat,
      longitude: lng,
      address: resolveAddressFromCoords(lat, lng),
    }));
  };

  const handleUseGpsForSupermarket = () => {
    if (!navigator.geolocation) {
      showToast('GPS is not supported here. Tap the map to pin your location instead.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const { latitude, longitude } = pos.coords;
        setProfileCameraTarget({ lat: latitude, lng: longitude, key: Date.now() });
        handlePinSupermarket(latitude, longitude);
        showToast('Pinned your current GPS position to the supermarket.');
      },
      () => {
        setIsLocating(false);
        showToast('Could not read GPS. Tap the map to pin your location instead.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleSaveSupermarket = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // `savedAt` marks this pin as the newest save so a stale backend copy
      // (or an older tab) can never overwrite it during the sync race.
      const savedRecord = { ...supermarket, savedAt: Date.now() };
      localStorage.setItem(SUPERMARKET_STORAGE_KEY, JSON.stringify(savedRecord));
      // Keep a dedicated, farmer-session-independent admin hub record. This is
      // the authoritative fallback for farmer live-transaction maps.
      localStorage.setItem(ADMIN_HUB_STORAGE_KEY, JSON.stringify(savedRecord));
      // Publish the pin to the backend so EVERY device (e.g. a farmer's phone)
      // resolves the same admin location on its live-transaction map —
      // localStorage alone is per-browser and never reached other users.
      fetch('/api/supermarket', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(savedRecord),
      }).catch((err) => console.log('Supermarket location sync notice:', err));
      // Notify both admin and farmer live-route views; cross-tab storage events
      // are normalized to this same event by App.tsx.
      window.dispatchEvent(
        new CustomEvent('veggieconnect:admin-location-updated', {
          detail: { latitude: supermarket.latitude, longitude: supermarket.longitude },
        })
      );
      // Keep the signed-in admin account aligned with the saved logistics origin.
      if (currentUser?.id === 'admin-main' || currentUser?.role === 'admin') {
        onUpdateUser({
          ...currentUser,
          location: supermarket.address || currentUser.location,
          latitude: supermarket.latitude,
          longitude: supermarket.longitude,
        });
      }
      // Only mark the form clean once everything persisted — if the write had
      // failed, clearing the flag would let the re-read effect snap the pin
      // back while the toast still claims the location was saved.
      setSupermarketDirty(false);
      showToast('Supermarket location saved to your profile!');
    } catch (err) {
      console.error('Failed to save supermarket location', err);
      showToast('Could not save your location. Please try again.');
    }
  };

  // Handle Admin Login submission (the password is checked by the server, never in the browser)
  const handleAdminLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const email = adminEmail.trim().toLowerCase();
    const password = adminPassword.trim();

    if (!email || !password) {
      setLoginError('Please enter your administrator email and password.');
      return;
    }

    try {
      const resp = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await resp.json().catch(() => ({}));
      if (resp.ok && data.user && data.user.role === 'admin') {
        onAdminLogin(data.user as UserProfile);
        showToast('Welcome to VeggieConnect Admin Mobile App!');
      } else {
        setLoginError('Invalid administrator credentials. Please check your email and password.');
      }
    } catch {
      setLoginError('Cannot reach the server. Please make sure the app server is running.');
    }
  };

  // Helper to determine whether a transport haul is cancelled (via job status or linked order status)
  const isJobOrOrderCancelled = useCallback(
    (job: TransportJob): boolean => {
      if (job.status === 'cancelled') return true;
      const normJobOrderId = String(job.orderId || '').replace('#', '').trim().toLowerCase();
      const normJobId = String(job.id || '').replace('#', '').trim().toLowerCase();

      const linkedOrder = orders.find((o) => {
        const normOrderId = String(o.id || '').replace('#', '').trim().toLowerCase();
        const normOrderJobId = String(o.transportJobId || '').replace('#', '').trim().toLowerCase();

        return (
          (normOrderId && normJobOrderId && normOrderId === normJobOrderId) ||
          (normOrderId && normJobId && normOrderId === normJobId) ||
          (normOrderJobId && normJobId && normOrderJobId === normJobId) ||
          (o.farmName &&
            job.pickupFarm &&
            o.farmName.trim().toLowerCase() === job.pickupFarm.trim().toLowerCase() &&
            o.buyerName &&
            job.buyerName &&
            o.buyerName.trim().toLowerCase() === job.buyerName.trim().toLowerCase() &&
            job.status !== 'delivered')
        );
      });
      return linkedOrder?.status === 'cancelled';
    },
    [orders]
  );

  // Active uncancelled live hauls
  const activeLiveHauls = useMemo(() => {
    return transportJobs.filter((j) => j.status !== 'delivered' && j.status !== 'cancelled' && !isJobOrOrderCancelled(j));
  }, [transportJobs, isJobOrOrderCancelled]);

  const cancelledHauls = useMemo(() => {
    return transportJobs.filter((j) => isJobOrOrderCancelled(j));
  }, [transportJobs, isJobOrOrderCancelled]);

  const deliveredHauls = useMemo(() => {
    return transportJobs.filter((j) => !isJobOrOrderCancelled(j) && j.status === 'delivered');
  }, [transportJobs, isJobOrOrderCancelled]);

  const inTransitHauls = useMemo(() => {
    return transportJobs.filter(
      (j) => !isJobOrOrderCancelled(j) && (j.status === 'picked_up' || j.status === 'in_transit')
    );
  }, [transportJobs, isJobOrOrderCancelled]);

  // Displayed hauls list based on selected haulFilter
  const displayedHauls = useMemo(() => {
    return transportJobs.filter((job) => {
      const isCancelled = isJobOrOrderCancelled(job);
      if (haulFilter === 'active') {
        return !isCancelled && job.status !== 'delivered' && job.status !== 'cancelled';
      }
      if (haulFilter === 'in_transit') {
        return !isCancelled && (job.status === 'picked_up' || job.status === 'in_transit');
      }
      if (haulFilter === 'delivered') {
        return !isCancelled && job.status === 'delivered';
      }
      if (haulFilter === 'cancelled') {
        return isCancelled;
      }
      // 'all'
      return !isCancelled;
    });
  }, [transportJobs, haulFilter, isJobOrOrderCancelled]);

  // Metrics computation
  const stats = useMemo(() => {
    const nonAdminUsers = registeredUsers.filter((u) => u.role !== 'admin' && u.email !== 'admin@gmail.com');
    const farmers = nonAdminUsers.filter((u) => u.role === 'farmer');
    const buyers = nonAdminUsers.filter((u) => u.role === 'buyer');
    const verifiedUsers = nonAdminUsers.filter((u) => u.verified);
    const suspendedUsers = nonAdminUsers.filter((u) => u.status === 'suspended');

    const validOrders = orders.filter((o) => o.status !== 'cancelled');
    const totalOrderValue = validOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const completedOrders = orders.filter((o) => o.status === 'completed');
    const activeTransportJobs = transportJobs.filter(
      (j) => j.status !== 'delivered' && !isJobOrOrderCancelled(j)
    );

    return {
      totalUsers: nonAdminUsers.length,
      farmers: farmers.length,
      buyers: buyers.length,
      verifiedUsers: verifiedUsers.length,
      suspendedUsers: suspendedUsers.length,
      totalCrops: produceList.length,
      totalOrders: orders.length,
      completedOrders: completedOrders.length,
      totalOrderValue,
      activeTransportJobs: activeTransportJobs.length,
    };
  }, [registeredUsers, produceList, orders, transportJobs, isJobOrOrderCancelled]);

  // Filtered DA Daily Prices (Category buttons removed)
  const filteredDaPrices = useMemo(() => {
    return DA_DAILY_PRICES.filter((item) => {
      if (!daPriceSearch.trim()) return true;
      const q = daPriceSearch.toLowerCase();
      return (
        item.commodity.toLowerCase().includes(q) ||
        (item.localName || '').toLowerCase().includes(q) ||
        (item.variety || '').toLowerCase().includes(q) ||
        (item.category || '').toLowerCase().includes(q)
      );
    });
  }, [daPriceSearch]);

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return registeredUsers.filter((u) => {
      if (u.role === 'admin' || u.email === 'admin@gmail.com') return false;

      if (roleFilter === 'suspended') {
        if (u.status !== 'suspended') return false;
      } else if (roleFilter !== 'all' && u.role !== roleFilter) {
        return false;
      }

      if (!userSearch.trim()) return true;
      const q = userSearch.toLowerCase();
      return (
        u.name.toLowerCase().includes(q) ||
        u.phone.toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.location || '').toLowerCase().includes(q) ||
        (u.farmName || '').toLowerCase().includes(q)
      );
    });
  }, [registeredUsers, roleFilter, userSearch]);

  // Filtered Produce List
  const filteredProduce = useMemo(() => {
    return produceList.filter((p) => {
      if (!produceSearch.trim()) return true;
      const q = produceSearch.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.farmerName.toLowerCase().includes(q) ||
        p.farmName.toLowerCase().includes(q) ||
        (p.location || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q)
      );
    });
  }, [produceList, produceSearch]);

  // Farmer harvest offers available on the Buy Desk.
  // Supermarket-owned retail stock is excluded, and lots whose stock was fully procured
  // (0 remaining with a bought quantity) are removed from the farmer offers list entirely.
  const farmerOffersList = useMemo(() => {
    return filteredProduce.filter(
      (p) =>
        (!p.sellerStoreName || p.sellerStoreName !== 'VeggieConnect Supermarket') &&
        !(p.stockQuantity === 0 && (p.boughtQuantity || 0) > 0)
    );
  }, [filteredProduce]);

  // Helper for matching crop names resiliently (handles parentheticals like Kamatis, whitespace, etc.)
  const normalizeCropName = (str?: string) =>
    (str || '').toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9]/g, '').trim();

  const isMatchingCrop = (a?: string, b?: string) => {
    if (!a || !b) return false;
    const na = normalizeCropName(a);
    const nb = normalizeCropName(b);
    if (!na || !nb) return false;
    if (na === nb) return true;
    if (na.includes(nb) || nb.includes(na)) return true;
    const wordsA = (a || '').toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    const wordsB = (b || '').toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    for (const wa of wordsA) {
      for (const wb of wordsB) {
        if (wa === wb || (wa.length >= 4 && wb.length >= 4 && (wa.includes(wb) || wb.includes(wa)))) return true;
      }
    }
    return false;
  };

  // List of all products owned or bought by admin/supermarket from farmers
  const ownedBoughtProducts = useMemo(() => {
    const list: Array<{
      id: string;
      orderId?: string;
      orderRefs?: string[];
      produceId?: string;
      name: string;
      category?: string;
      unit: string;
      quantityBought: number;
      costPricePerUnit: number;
      totalCost: number;
      farmerId?: string;
      farmerName: string;
      farmName: string;
      location?: string;
      imageUrl?: string;
      variety?: string;
      isOrganic?: boolean;
      farmingMethod?: string;
      dateBought: string;
      deliveryStatus: string;
      isDelivered: boolean;
      isPurchased: boolean;
      isInSupermarketStock: boolean;
      supermarketStockQty: number;
      supermarketPrice: number;
      supermarketItem?: ProduceItem;
      originalProduceItem?: ProduceItem;
    }> = [];

    const seenKeys = new Set<string>();

    // 1. Collect from orders where buyer is admin/supermarket or payment was farmgate cash payout
    orders.forEach((order) => {
      const isAdminProcurement =
        order.id.startsWith('TX-ADM-') ||
        order.buyerId === 'admin-main' ||
        (order.buyerName && (order.buyerName.toLowerCase().includes('admin') || order.buyerName.toLowerCase().includes('supermarket'))) ||
        (order.deliveryAddress && (order.deliveryAddress.toLowerCase().includes('central produce hub') || order.deliveryAddress.toLowerCase().includes('supermarket'))) ||
        (order.paymentMethod && order.paymentMethod.toLowerCase().includes('farmgate'));

      if (isAdminProcurement && order.items && order.items.length > 0) {
        const matchingJob = transportJobs.find((j) => j.orderId === order.id || j.id === order.id);
        const isDelivered = order.status === 'completed' || matchingJob?.status === 'delivered';
        const deliveryStatus = isDelivered
          ? 'Delivered to Supermarket Hub'
          : matchingJob?.status === 'in_transit' || order.status === 'in_transit'
          ? 'In Transit (Owner Haul)'
          : matchingJob?.status === 'picked_up' || order.status === 'picked_up'
          ? 'Picked Up from Farm'
          : 'Awaiting Farmgate Pickup';

        order.items.forEach((item, idx) => {
          const itemKey = `order-${order.id}-${item.produceId || item.produceName}-${idx}`;
          if (!seenKeys.has(itemKey)) {
            seenKeys.add(itemKey);

            // Check if this crop exists in live supermarket stock (matching by name or id)
            const smMatch = produceList.find(
              (p) =>
                (p.sellerStoreName === 'VeggieConnect Supermarket' ||
                 p.sellerStatus === 'bought_and_stocked' ||
                 p.farmName === 'VeggieConnect Supermarket' ||
                 p.id.startsWith('sm-')) &&
                (isMatchingCrop(p.name, item.produceName) ||
                 (item.produceId && (p.id === item.produceId || p.id === `sm-${item.produceId}`)) ||
                 (p.sourcingRegion && isMatchingCrop(p.sourcingRegion, item.produceName)))
            );

            // Find original farmer produce listing if present
            const origMatch = produceList.find(
              (p) =>
                p.id === item.produceId ||
                (!p.sellerStoreName && isMatchingCrop(p.name, item.produceName))
            );

            const cost = item.pricePerUnit ?? item.unitPrice ?? origMatch?.farmgateAskingPrice ?? origMatch?.pricePerUnit ?? 40;
            const qty = item.quantity || 1;

            list.push({
              id: itemKey,
              orderId: order.id,
              produceId: item.produceId,
              name: item.produceName,
              category: origMatch?.category || 'Vegetables',
              unit: item.unit || 'kg',
              quantityBought: qty,
              costPricePerUnit: cost,
              totalCost: cost * qty,
              farmerId: item.farmerId || order.farmerId || origMatch?.farmerId,
              farmerName: item.farmerName || origMatch?.farmerName || 'Registered Farmer',
              farmName: item.farmName || order.farmName || origMatch?.farmName || 'Local Farm',
              location: origMatch?.location || order.pickupSlot || 'Negros Oriental',
              imageUrl: item.imageUrl || origMatch?.imageUrl || '',
              variety: origMatch?.variety || 'Farmgate Premium',
              isOrganic: origMatch?.isOrganic,
              farmingMethod: origMatch?.farmingMethod,
              dateBought: order.createdAt || new Date().toISOString(),
              deliveryStatus,
              isDelivered,
              // A procurement counts as purchased once you've started the pickup
              // route (order 'confirmed' or later) — a just-placed order ('pending',
              // route not started) must never become shelvable stock.
              isPurchased: order.status !== 'pending' && order.status !== 'cancelled',
              isInSupermarketStock: Boolean(smMatch && smMatch.stockQuantity > 0),
              supermarketStockQty: smMatch ? smMatch.stockQuantity : 0,
              supermarketPrice: smMatch ? smMatch.pricePerUnit : Math.round(cost * 1.35),
              supermarketItem: smMatch,
              originalProduceItem: origMatch,
            });
          }
        });
      }
    });

    // 2. Also collect any farmer produce items where boughtQuantity > 0
    // (Buy Desk fallback when the procurement order hasn't synced yet).
    // Delivery state is derived from the linked procurement order/haul job —
    // nothing is treated as "in hand" until it is bought AND its haul is delivered.
    produceList.forEach((p) => {
      if ((p.boughtQuantity || 0) > 0 && (!p.sellerStoreName || p.sellerStoreName !== 'VeggieConnect Supermarket')) {
        const prodKey = `prod-bought-${p.id}`;
        const alreadyInList = list.some((it) => it.produceId === p.id || isMatchingCrop(it.name, p.name));
        if (!alreadyInList && !seenKeys.has(prodKey)) {
          seenKeys.add(prodKey);

           // Find the linked procurement order / haul job for this lot
           const linkedOrder = orders.find(
             (o) =>
               (o.items || []).some((it) => it.produceId === p.id) ||
               (o.farmerId && p.farmerId && o.farmerId === p.farmerId && isMatchingCrop(o.items?.[0]?.produceName || '', p.name))
           );
           const linkedJob = linkedOrder
             ? transportJobs.find((j) => j.orderId === linkedOrder.id || j.id === linkedOrder.id)
             : transportJobs.find((j) => j.itemsSummary && j.itemsSummary.toLowerCase().includes(p.name.toLowerCase().split(' ')[0]));
           const linkedDelivered =
             linkedOrder?.status === 'completed' || linkedJob?.status === 'delivered';
           // No linked haul found (legacy direct buy) → the lot was bought at farmgate and is in hand.
           const fallbackDelivered = !linkedOrder && !linkedJob;

          const smMatch = produceList.find(
            (sm) =>
              (sm.sellerStoreName === 'VeggieConnect Supermarket' ||
               sm.sellerStatus === 'bought_and_stocked' ||
               sm.farmName === 'VeggieConnect Supermarket' ||
               sm.id.startsWith('sm-')) &&
              (isMatchingCrop(sm.name, p.name) ||
               sm.id === p.id ||
               sm.id === `sm-${p.id}`)
          );

          const cost = p.farmgateAskingPrice || p.pricePerUnit;
          const qty = p.boughtQuantity || 1;

          list.push({
            id: prodKey,
            produceId: p.id,
            name: p.name,
            category: p.category || 'Vegetables',
            unit: p.unit || 'kg',
            quantityBought: qty,
            costPricePerUnit: cost,
            totalCost: cost * qty,
            farmerId: p.farmerId,
            farmerName: p.farmerName,
            farmName: p.farmName,
            location: p.location,
            imageUrl: p.imageUrl,
            variety: p.variety,
            isOrganic: p.isOrganic,
            farmingMethod: p.farmingMethod,
            dateBought: p.boughtAt || new Date().toISOString(),
            deliveryStatus: linkedDelivered || fallbackDelivered ? 'Delivered to Supermarket Hub' : 'Awaiting Farmgate Pickup',
            isDelivered: linkedDelivered || fallbackDelivered,
            // Bought-quantity lots on farmer produce exist only because a purchase happened.
            isPurchased: true,
            isInSupermarketStock: Boolean(smMatch && smMatch.stockQuantity > 0),
            supermarketStockQty: smMatch ? smMatch.stockQuantity : 0,
            supermarketPrice: smMatch ? smMatch.pricePerUnit : Math.round(cost * 1.35),
            supermarketItem: smMatch,
            originalProduceItem: p,
          });
        }
      }
    });

    // 3. Also include items currently marked as Supermarket stock
    produceList.forEach((p) => {
      if (
        p.sellerStoreName === 'VeggieConnect Supermarket' ||
        p.sellerStatus === 'bought_and_stocked' ||
        p.farmName === 'VeggieConnect Supermarket' ||
        p.farmerName === 'VeggieConnect Central Produce Hub' ||
        p.id.startsWith('sm-')
      ) {
        const smKey = `sm-stocked-${p.id}`;
        const alreadyInList = list.some(
          (it) =>
            isMatchingCrop(it.name, p.name) ||
            (it.produceId && (it.produceId === p.id || p.id === `sm-${it.produceId}` || p.id.startsWith(`sm-${it.produceId}`))) ||
            (it.id && (it.id === p.id || `sm-${it.id}` === p.id))
        );
        if (!alreadyInList && !seenKeys.has(smKey)) {
          seenKeys.add(smKey);
          const cost = p.farmgateAskingPrice || Math.round(p.pricePerUnit * 0.75);
          list.push({
            id: smKey,
            produceId: p.id,
            name: p.name,
            category: p.category || 'Vegetables',
            unit: p.unit || 'kg',
            quantityBought: p.boughtQuantity || p.stockQuantity,
            costPricePerUnit: cost,
            totalCost: cost * (p.boughtQuantity || p.stockQuantity),
            farmerId: p.farmerId,
            farmerName: p.sourcingRegion ? p.sourcingRegion.split('(')[0].trim() : 'Local Farmer Partner',
            farmName: p.sourcingRegion && p.sourcingRegion.includes('(') ? p.sourcingRegion.split('(')[1].replace(')', '').trim() : 'Negros Oriental Farm',
            location: p.location,
            imageUrl: p.imageUrl,
            variety: p.variety,
            isOrganic: p.isOrganic,
            farmingMethod: p.farmingMethod,
            dateBought: p.boughtAt || new Date().toISOString(),
            deliveryStatus: 'In Supermarket Store Hub',
            isDelivered: true,
            // Already sitting on the live shelf — physically received by definition.
            isPurchased: true,
            isInSupermarketStock: p.stockQuantity > 0,
            supermarketStockQty: p.stockQuantity,
            supermarketPrice: p.pricePerUnit,
            supermarketItem: p,
            originalProduceItem: p,
          });
        }
      }
    });

    // Merge duplicate listings: if the product AND the owner are the same, keep one listing
    // only (e.g. two purchase orders for the same crop from the same farmer = one card).
    const mergedList: typeof list = [];
    for (const item of list) {
      const existing = mergedList.find((m) => {
        // Same crop if the produce listing IDs match OR the names describe the same
        // crop — a farmer often re-lists the same crop between procurements, giving
        // the two lots different produceIds, and those must still become ONE card.
        const sameProduct =
          Boolean(m.produceId && item.produceId && m.produceId === item.produceId) ||
          isMatchingCrop(m.name, item.name);
        if (!sameProduct) return false;
        if (m.farmerId && item.farmerId) return m.farmerId === item.farmerId;
        return (
          normalizeCropName(m.farmerName) === normalizeCropName(item.farmerName) &&
          normalizeCropName(m.farmName) === normalizeCropName(item.farmName)
        );
      });

      if (!existing) {
        mergedList.push(item);
        continue;
      }

      // Same product + same owner: combine quantity, payout, and refs into one listing
      const totalQty = existing.quantityBought + item.quantityBought;
      existing.totalCost += item.totalCost;
      existing.quantityBought = totalQty;
      if (totalQty > 0) {
        existing.costPricePerUnit = Math.round((existing.totalCost / totalQty) * 100) / 100;
      }

      // Keep the most recent purchase date
      if (new Date(item.dateBought).getTime() > new Date(existing.dateBought).getTime()) {
        existing.dateBought = item.dateBought;
      }

      // Track all merged order refs (secondary refs render as "+N more" on the card)
      if (!existing.orderId && item.orderId) {
        existing.orderId = item.orderId;
      } else if (item.orderId && item.orderId !== existing.orderId) {
        const extras = new Set(existing.orderRefs ?? []);
        extras.add(item.orderId);
        (item.orderRefs ?? []).forEach((r) => extras.add(r));
        existing.orderRefs = [...extras];
      }

      // If any linked order is still pending delivery, keep the pending badge visible
      if (existing.isDelivered && !item.isDelivered) {
        existing.isDelivered = false;
        existing.deliveryStatus = item.deliveryStatus;
      }

      // Adopt stocked status if either merged entry is on the live shelf
      if (item.isInSupermarketStock && !existing.isInSupermarketStock) {
        existing.isInSupermarketStock = true;
        existing.supermarketStockQty = item.supermarketStockQty;
        existing.supermarketPrice = item.supermarketPrice;
        existing.supermarketItem = item.supermarketItem;
      }

      // If any merged entry is still an unpaid/pending procurement, the lot stays unshelvable
      if (existing.isPurchased && !item.isPurchased) {
        existing.isPurchased = false;
      }
    }

    return mergedList;
  }, [orders, produceList, transportJobs]);

  // Canonical per-lot "Ready to Put in Stock" pool quantity, keyed by lot id.
  // Units already consumed (still on the live shelf + sold to buyers) are attributed
  // to lots oldest-first (FIFO), so the per-card pools here always SUM to the
  // crop-level pool shown on the Live Supermarket Stock card.
  const lotReadyPoolById = useMemo(() => {
    const result: Record<string, number> = {};

    // Buyer retail orders that consumed supermarket stock (exclude admin procurements)
    const buyerOrderItems = orders
      .filter(
        (o) =>
          o.buyerId !== 'admin-main' &&
          !o.id.startsWith('TX-ADM-') &&
          o.status !== 'cancelled'
      )
      .flatMap((o) => o.items || []);

    // Live shelf records for the supermarket
    const shelfRecords = produceList.filter(
      (p) =>
        p.sellerStoreName === 'VeggieConnect Supermarket' ||
        p.sellerStatus === 'bought_and_stocked' ||
        p.farmName === 'VeggieConnect Supermarket' ||
        p.farmerName === 'VeggieConnect Central Produce Hub' ||
        p.id.startsWith('sm-')
    );

    // Group procured lots by crop (skip sm-stocked mirror entries when real lots exist).
    // NOTE: plain objects used here — `Map` is shadowed by the Google Maps component import.
    const lotsByCrop: Record<string, { name: string; lots: typeof ownedBoughtProducts }> = {};
    ownedBoughtProducts.forEach((lot) => {
      if (!lot.isPurchased) return;
      const key = `$${normalizeCropName(lot.name)}`; // `$` prefix avoids Object.prototype name collisions
      if (key === '$') return;
      const entry = lotsByCrop[key] || { name: lot.name, lots: [] as typeof ownedBoughtProducts };
      entry.lots.push(lot);
      lotsByCrop[key] = entry;
    });

    Object.values(lotsByCrop).forEach(({ name, lots }) => {
      const hasRealLots = lots.some(
        (it) => it.id.startsWith('order-') || it.id.startsWith('prod-bought-') || Boolean(it.orderId)
      );
      const activeLots = hasRealLots
        ? lots.filter((it) => !it.id.startsWith('sm-stocked-'))
        : lots;

      // Same crop matching used by getProductStockPool so both tabs always agree
      // (by name, or by any produce id that can represent this crop)
      const cropIds = new Set<string>();
      activeLots.forEach((it) => {
        if (it.produceId) {
          cropIds.add(it.produceId);
          cropIds.add(`sm-${it.produceId}`);
        }
        cropIds.add(it.id);
      });
      const sold = buyerOrderItems
        .filter(
          (it) => isMatchingCrop(it.produceName, name) || (it.produceId && cropIds.has(it.produceId))
        )
        .reduce((sum, it) => sum + (it.quantity || 0), 0);
      const shelved = shelfRecords
        .filter((sp) => isMatchingCrop(sp.name, name) || cropIds.has(sp.id))
        .reduce((sum, sp) => sum + (sp.stockQuantity || 0), 0);

      // Everything bought for this crop that is either still shelved or already sold
      let consumedLeft = sold + shelved;
      [...activeLots]
        .sort((a, b) => new Date(a.dateBought).getTime() - new Date(b.dateBought).getTime())
        .forEach((lot) => {
          const consumedByLot = Math.min(lot.quantityBought, Math.max(0, consumedLeft));
          consumedLeft -= consumedByLot;
          result[lot.id] = Math.max(0, lot.quantityBought - consumedByLot);
        });
    });

    return result;
  }, [ownedBoughtProducts, produceList, orders, isMatchingCrop]);

  // Supermarket Store Stock Products (Active live items in store for buyers)
  const supermarketStoreProducts = useMemo(() => {
    return produceList.filter(
      (p) =>
        p.sellerStoreName === 'VeggieConnect Supermarket' ||
        p.sellerStatus === 'bought_and_stocked' ||
        p.farmName === 'VeggieConnect Supermarket' ||
        p.farmerName === 'VeggieConnect Central Produce Hub' ||
        p.id.startsWith('sm-')
    );
  }, [produceList]);

  // Helper to query the "Ready to Put in Stock" pool for any given supermarket produce item
  const getProductStockPool = useCallback(
    (p: ProduceItem) => {
      // 1. Find matching owned/bought items (purchased from farmer & delivered/procured to hub)
      const matchingBoughtItems = ownedBoughtProducts.filter((item) => {
        if (!item.isPurchased) return false;
        const idMatch =
          (item.produceId &&
            (item.produceId === p.id ||
              `sm-${item.produceId}` === p.id ||
              p.id.startsWith(`sm-${item.produceId}`))) ||
          (item.id && (item.id === p.id || `sm-${item.id}` === p.id));
        if (idMatch) return true;
        return isMatchingCrop(item.name, p.name);
      });

      // Avoid double-counting: if genuine procurement lots exist (from orders or farmer bought lots),
      // ignore fallback sm-stocked entries which only mirror this live item itself
      const hasRealLots = matchingBoughtItems.some(
        (it) => it.id.startsWith('order-') || it.id.startsWith('prod-bought-') || Boolean(it.orderId)
      );
      const activeMatchingLots = hasRealLots
        ? matchingBoughtItems.filter((it) => !it.id.startsWith('sm-stocked-'))
        : matchingBoughtItems;

      // 2. Sum of total bought units from all matching procurement lots
      const totalBoughtDelivered = activeMatchingLots.reduce(
        (sum, item) => sum + (item.quantityBought || 0),
        0
      );

      // If genuine procurement lots exist, the total pool quantity is strictly the quantity from those lots.
      // Only fall back to p.boughtQuantity if no procurement lots were ever found.
      const totalPoolQty = hasRealLots
        ? totalBoughtDelivered
        : (p.boughtQuantity || p.stockQuantity || 0);

      // 3. Retail units sold to buyers from this crop
      const unitsSoldToBuyers = orders
        .filter(
          (o) =>
            o.buyerId !== 'admin-main' &&
            !o.id.startsWith('TX-ADM-') &&
            o.status !== 'cancelled'
        )
        .reduce((sum, o) => {
          const matchedItems = (o.items || []).filter(
            (it) => it.produceId === p.id || (p.name && isMatchingCrop(it.produceName, p.name))
          );
          return sum + matchedItems.reduce((s, it) => s + (it.quantity || 0), 0);
        }, 0);

      // 4. Effective total owned remaining in admin possession
      const effectiveTotalOwned = Math.max(0, totalPoolQty - unitsSoldToBuyers);

      // 5. Current stock placed on the live supermarket shelf — summed across ALL
      // live records for this crop (duplicated shelf records would otherwise make
      // the Live pool disagree with the "Ready to Put in Stock" cards)
      const currentLiveStock = produceList
        .filter(
          (sp) =>
            (sp.sellerStoreName === 'VeggieConnect Supermarket' ||
              sp.sellerStatus === 'bought_and_stocked' ||
              sp.farmName === 'VeggieConnect Supermarket' ||
              sp.farmerName === 'VeggieConnect Central Produce Hub' ||
              sp.id.startsWith('sm-')) &&
            (sp.id === p.id || isMatchingCrop(sp.name, p.name))
        )
        .reduce((sum, sp) => sum + (sp.stockQuantity || 0), 0);

      // 6. Available remaining units in the "Ready to Put in Stock" pool
      const availableInPool = Math.max(0, effectiveTotalOwned - currentLiveStock);

      return {
        totalPoolQty,
        unitsSoldToBuyers,
        effectiveTotalOwned,
        currentLiveStock,
        availableInPool,
        matchingBoughtItems: activeMatchingLots,
      };
    },
    [ownedBoughtProducts, produceList, orders, isMatchingCrop]
  );

  // Filtered Owned/Bought Products for Stocks Tab
  const filteredOwnedBought = useMemo(() => {
    return ownedBoughtProducts.filter((item) => {
      // Status Filter — a lot has ready stock if bought AND delivered AND remaining pool > 0.
      const readyToStockQty = lotReadyPoolById[item.id] ?? Math.max(0, item.quantityBought - (item.supermarketStockQty || 0));
      const hasReadyStock = item.isPurchased && item.isDelivered && readyToStockQty > 0;
      const isAlreadyStocked = (item.supermarketStockQty || 0) > 0;

      if (stocksFilter === 'ready_to_stock' && !hasReadyStock) return false;
      if (stocksFilter === 'already_stocked' && !isAlreadyStocked) return false;

      if (!stocksSearch.trim()) return true;
      const q = stocksSearch.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.farmerName.toLowerCase().includes(q) ||
        item.farmName.toLowerCase().includes(q) ||
        (item.orderId || '').toLowerCase().includes(q) ||
        (item.orderRefs || []).some((r) => r.toLowerCase().includes(q)) ||
        (item.category || '').toLowerCase().includes(q)
      );
    });
  }, [ownedBoughtProducts, lotReadyPoolById, stocksSearch, stocksFilter]);

  // Filtered Supermarket Store Products
  const filteredSupermarketStore = useMemo(() => {
    return supermarketStoreProducts.filter((p) => {
      if (!stocksSearch.trim()) return true;
      const q = stocksSearch.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.farmerName.toLowerCase().includes(q) ||
        (p.sourcingRegion || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q)
      );
    });
  }, [supermarketStoreProducts, stocksSearch]);

  const unstockedBoughtCount = useMemo(() => {
    return ownedBoughtProducts.filter(
      (it) =>
        it.isPurchased &&
        it.isDelivered &&
        (lotReadyPoolById[it.id] ?? Math.max(0, it.quantityBought - (it.supermarketStockQty || 0))) > 0
    ).length;
  }, [ownedBoughtProducts, lotReadyPoolById]);

  const alreadyStockedBoughtCount = useMemo(() => {
    return ownedBoughtProducts.filter((it) => (it.supermarketStockQty || 0) > 0).length;
  }, [ownedBoughtProducts]);

  // Combined Transactions (Orders enriched with matching Transport Jobs - deliveries are handled by the admin)
  const transactionsList = useMemo(() => {
    return orders.map((order) => {
      // Find matching transport job for this order
      const normOrderId = String(order.id || '').replace('#', '').trim().toLowerCase();
      const normJobId = String(order.transportJobId || '').replace('#', '').trim().toLowerCase();
      const matchingJob = transportJobs.find((j) => {
        const jOrderId = String(j.orderId || '').replace('#', '').trim().toLowerCase();
        const jId = String(j.id || '').replace('#', '').trim().toLowerCase();
        return (
          (jOrderId && jOrderId === normOrderId) ||
          (jId && jId === normOrderId) ||
          (normJobId && jId === normJobId) ||
          (order.farmName && j.pickupFarm && order.farmName.trim().toLowerCase() === j.pickupFarm.trim().toLowerCase() &&
           order.buyerName && j.buyerName && order.buyerName.trim().toLowerCase() === j.buyerName.trim().toLowerCase() &&
           j.status !== 'delivered' && j.status !== 'cancelled')
        );
      });

      // Find farmer profile
      const matchedFarmer = registeredUsers.find(
        (u) =>
          u.role === 'farmer' &&
          (u.id === order.farmerId || (order.farmName && u.farmName === order.farmName))
      );

      // Find buyer profile
      const matchedBuyer = registeredUsers.find(
        (u) => u.role === 'buyer' && (u.id === order.buyerId || u.name === order.buyerName)
      );

      const orderTime = order.createdAt || new Date().toISOString();

      return {
        order,
        job: matchingJob,
        transporterName: matchingJob?.assignedTransporterName || order.transporterName || 'Owner Logistics (You)',
        transporterPhone: matchingJob?.assignedTransporterPhone || order.transporterPhone || 'Awaiting dispatch',
        vehicleType: order.vehicleType || 'Owner Utility Cargo Hauler',
        farmer: matchedFarmer,
        buyer: matchedBuyer,
        status: order.status,
        dateFormatted: new Date(orderTime).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }),
        deliveryTimeFormatted:
          order.status === 'completed'
            ? 'Delivered & Confirmed ✓'
            : matchingJob?.status === 'in_transit' || order.status === 'in_transit'
            ? 'In Transit (ETA ~15 mins)'
            : matchingJob?.status === 'picked_up' || order.status === 'picked_up'
            ? 'Picked Up from Farm'
            : 'Order Dispatched / In Progress',
      };
    });
  }, [orders, transportJobs, registeredUsers]);

  // Filtered Transactions
  const filteredTransactions = useMemo(() => {
    return transactionsList.filter((item) => {
      // Status filter
      if (transactionStatusFilter === 'completed') {
        if (item.order.status !== 'completed' && item.job?.status !== 'delivered') return false;
      } else if (transactionStatusFilter === 'delivered') {
        if (item.order.status !== 'completed' && item.job?.status !== 'delivered') return false;
      } else if (transactionStatusFilter === 'in_transit') {
        if (
          item.order.status === 'cancelled' ||
          item.order.status === 'completed' ||
          (item.order.status !== 'in_transit' &&
            item.order.status !== 'picked_up' &&
            item.job?.status !== 'in_transit' &&
            item.job?.status !== 'picked_up')
        ) {
          return false;
        }
      } else if (transactionStatusFilter === 'pending') {
        if (item.order.status === 'cancelled' || item.order.status === 'completed' || item.job?.status === 'delivered') return false;
      } else if (transactionStatusFilter === 'cancelled') {
        if (item.order.status !== 'cancelled' && item.job?.status !== 'cancelled') return false;
      }

      // Search query
      if (!transactionSearch.trim()) return true;
      const q = transactionSearch.toLowerCase();
      return (
        item.order.id.toLowerCase().includes(q) ||
        item.order.buyerName.toLowerCase().includes(q) ||
        item.order.farmName.toLowerCase().includes(q) ||
        item.transporterName.toLowerCase().includes(q) ||
        item.vehicleType.toLowerCase().includes(q) ||
        (item.order.deliveryAddress || '').toLowerCase().includes(q)
      );
    });
  }, [transactionsList, transactionSearch, transactionStatusFilter]);

  // User Actions
  const handleToggleVerified = (user: UserProfile) => {
    const updated: UserProfile = {
      ...user,
      verified: !user.verified,
    };
    onUpdateUser(updated);
    appSync.publish('USERS_UPDATED', updated, 'admin');
    showToast(`${user.name}: ${updated.verified ? 'Verified ✓' : 'Unverified'}`);
  };

  const handleToggleStatus = (user: UserProfile) => {
    const nextStatus = user.status === 'suspended' ? 'active' : 'suspended';
    const updated: UserProfile = {
      ...user,
      status: nextStatus,
    };
    onUpdateUser(updated);
    appSync.publish('USERS_UPDATED', updated, 'admin');
    showToast(`Account set to ${nextStatus.toUpperCase()}`);
  };

  const handleSaveUserEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    onUpdateUser(editingUser);
    appSync.publish('USERS_UPDATED', editingUser, 'admin');
    showToast(`Updated profile for ${editingUser.name}`);
    setEditingUser(null);
  };

  const handleSaveProduceEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduceItem) return;

    const isSupermarketItem =
      editingProduceItem.sellerStoreName === 'VeggieConnect Supermarket' ||
      editingProduceItem.id.startsWith('sm-') ||
      editingProduceItem.sellerStatus === 'bought_and_stocked' ||
      editingProduceItem.farmName === 'VeggieConnect Supermarket' ||
      editingProduceItem.farmerName === 'VeggieConnect Central Produce Hub';

    const origItem = produceList.find((p) => p.id === editingProduceItem.id);
    const origLiveStock = origItem ? origItem.stockQuantity : 0;
    const poolInfo = getProductStockPool(origItem || editingProduceItem);

    if (isSupermarketItem) {
      const maxAllowed = Math.min(
        poolInfo.effectiveTotalOwned || origLiveStock,
        origLiveStock + poolInfo.availableInPool
      );

      if (editingProduceItem.stockQuantity > maxAllowed) {
        showToast(
          `⚠️ Cannot set stock to ${editingProduceItem.stockQuantity} ${editingProduceItem.unit}s: Exceeds owned inventory! You only have ${maxAllowed} ${editingProduceItem.unit}s total (${poolInfo.availableInPool} ${editingProduceItem.unit}s remaining in pool).`
        );
        return;
      }
    }

    const totalOwned = isSupermarketItem
      ? Math.max(editingProduceItem.boughtQuantity || 0, poolInfo.totalPoolQty)
      : editingProduceItem.boughtQuantity;

    const finalizedItem: ProduceItem = {
      ...editingProduceItem,
      boughtQuantity: totalOwned,
      sellerStatus: editingProduceItem.stockQuantity > 0 ? (isSupermarketItem ? 'bought_and_stocked' : editingProduceItem.sellerStatus) : (isSupermarketItem ? 'bought_and_stocked' : 'sold_out'),
    };

    onUpdateProduce(finalizedItem);
    appSync.publish('PRODUCE_UPDATED', finalizedItem, 'admin');

    fetch(`/api/products/${finalizedItem.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(finalizedItem),
    }).catch((e) => console.log('Produce edit sync notice:', e));

    showToast(`Saved ${finalizedItem.name}`);
    setEditingProduceItem(null);
  };

  // Stocks Management Actions (Put in Supermarket Stock, Adjust Quantity, Edit Price)
  const handleOpenPutInStockModal = (item: any) => {
    const remainingToStock =
      lotReadyPoolById[item.id] ?? Math.max(0, item.quantityBought - (item.supermarketStockQty || 0));
    if (remainingToStock <= 0) {
      showToast(`⚠️ All ${item.quantityBought} ${item.unit}s of ${item.name} are already on the store shelf!`);
      return;
    }
    const defaultQty = remainingToStock;
    const askingPrice = item.costPricePerUnit || 40;

    // Check if DA SRP is available for this crop
    const daMatch = DA_DAILY_PRICES.find(
      (da) =>
        da.commodity.toLowerCase().includes(item.name.toLowerCase().split(' ')[0]) ||
        item.name.toLowerCase().includes(da.commodity.toLowerCase().split(' ')[0])
    );
    const suggestedPrice = daMatch?.prevailingRetailPrice || Math.round(askingPrice * 1.35);

    setPuttingInStockItem(item);
    setStockModalQty(defaultQty);
    setStockModalPrice(item.supermarketPrice || suggestedPrice);
    setStockModalCategory(item.category || 'Vegetables');
    setStockModalNote(
      item.supermarketItem?.description ||
      `Freshly procured ${item.name} from Negros Oriental local farms. Inspected and stocked in VeggieConnect Supermarket for retail buyers.`
    );
  };

  const handleConfirmPutInSupermarketStock = () => {
    if (!puttingInStockItem) return;

    const remainingInLot =
      lotReadyPoolById[puttingInStockItem.id] ??
      Math.max(0, puttingInStockItem.quantityBought - (puttingInStockItem.supermarketStockQty || 0));
    if (remainingInLot <= 0) {
      showToast('⚠️ No remaining stock available in this lot to put in supermarket!');
      setPuttingInStockItem(null);
      return;
    }
    const qtyToAdd = Math.min(Math.max(1, stockModalQty), remainingInLot);
    const price = Math.max(1, stockModalPrice);
    const cropName = puttingInStockItem.name;
    const cropUnit = puttingInStockItem.unit || 'kg';
    const prodId = puttingInStockItem.produceId || puttingInStockItem.id;

    // Check if this crop already exists in supermarket stock
    const existingSm = produceList.find(
      (p) =>
        (p.sellerStoreName === 'VeggieConnect Supermarket' || p.sellerStatus === 'bought_and_stocked' || p.id.startsWith('sm-')) &&
        (isMatchingCrop(p.name, cropName) || (prodId && (p.id === prodId || p.id === `sm-${prodId}` || p.id.startsWith(`sm-${prodId}`))))
    );

    const prevLiveStock = existingSm ? existingSm.stockQuantity : 0;
    const newLiveStock = prevLiveStock + qtyToAdd;
    const totalOwnedQuantity = Math.max(existingSm?.boughtQuantity || 0, puttingInStockItem.quantityBought);

    const resultingItem: ProduceItem = existingSm
      ? {
          ...existingSm,
          name: cropName,
          stockQuantity: newLiveStock,
          pricePerUnit: price,
          category: stockModalCategory || existingSm.category || 'Vegetables',
          variety: puttingInStockItem.variety || existingSm.variety || 'Farmgate Premium',
          imageUrl: puttingInStockItem.imageUrl || existingSm.imageUrl || '',
          description: stockModalNote || existingSm.description,
          farmgateAskingPrice: puttingInStockItem.costPricePerUnit || existingSm.farmgateAskingPrice,
          sellerStoreName: 'VeggieConnect Supermarket',
          sellerStatus: 'bought_and_stocked',
          brokerStatus: 'approved_active',
          farmName: 'VeggieConnect Supermarket',
          farmerName: 'VeggieConnect Central Produce Hub',
          farmerId: 'admin-main',
          location: 'Dumaguete City Proper (Central Produce Hub)',
          distanceKm: 1.0,
          boughtQuantity: totalOwnedQuantity,
          boughtAt: new Date().toISOString(),
          sourcingRegion: puttingInStockItem.farmerName
            ? `${puttingInStockItem.farmerName} (${puttingInStockItem.farmName || 'Local Farm'})`
            : existingSm.sourcingRegion || 'Local Farmer Partner',
        }
      : {
          id: `sm-${prodId || Date.now().toString().slice(-6)}`,
          farmerId: 'admin-main',
          farmerName: 'VeggieConnect Central Produce Hub',
          farmName: 'VeggieConnect Supermarket',
          name: cropName,
          category: stockModalCategory || 'Vegetables',
          variety: puttingInStockItem.variety || 'Farmgate Premium',
          pricePerUnit: price,
          unit: cropUnit,
          stockQuantity: newLiveStock,
          minOrderQuantity: 1,
          harvestStatus: 'Harvested Today',
          harvestDate: 'Delivered & Stocked Today',
          farmingMethod: puttingInStockItem.farmingMethod || 'Naturally Grown',
          imageUrl: puttingInStockItem.imageUrl || '',
          isOrganic: puttingInStockItem.isOrganic !== undefined ? puttingInStockItem.isOrganic : true,
          description:
            stockModalNote ||
            `Fresh harvest in Negros Oriental. Quality-inspected and stocked in VeggieConnect Supermarket for retail buyers.`,
          location: 'Dumaguete City Proper (Central Produce Hub)',
          distanceKm: 1.0,
          rating: 5.0,
          reviewsCount: 1,
          sellerStatus: 'bought_and_stocked',
          brokerStatus: 'approved_active',
          sellerStoreName: 'VeggieConnect Supermarket',
          farmgateAskingPrice: puttingInStockItem.costPricePerUnit,
          boughtQuantity: totalOwnedQuantity,
          boughtAt: new Date().toISOString(),
          sourcingRegion: puttingInStockItem.farmerName
            ? `${puttingInStockItem.farmerName} (${puttingInStockItem.farmName || 'Local Farm'})`
            : 'Local Farmer Partner',
        };

    if (onPutInSupermarketStock) {
      onPutInSupermarketStock({
        name: cropName,
        produceId: puttingInStockItem.produceId,
        orderId: puttingInStockItem.orderId,
        stockQuantity: newLiveStock,
        boughtQuantity: totalOwnedQuantity,
        pricePerUnit: price,
        category: stockModalCategory,
        unit: cropUnit,
        variety: puttingInStockItem.variety,
        farmerId: puttingInStockItem.farmerId,
        farmerName: puttingInStockItem.farmerName,
        farmName: puttingInStockItem.farmName,
        farmgateAskingPrice: puttingInStockItem.costPricePerUnit,
        imageUrl: puttingInStockItem.imageUrl,
        description: stockModalNote,
      });
    } else {
      onUpdateProduce(resultingItem);
      appSync.publish('PRODUCE_UPDATED', resultingItem, 'admin');

      if (existingSm) {
        fetch(`/api/products/${existingSm.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(resultingItem),
        }).catch((e) => console.log('Supermarket stock notice:', e));
      } else {
        fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(resultingItem),
        }).catch((e) => console.log('Supermarket new prod notice:', e));
      }
    }

    try {
      const key = 'veggieconnect_v9_clean_bought_stocks';
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      const rec = {
        name: cropName,
        orderId: puttingInStockItem.orderId,
        produceId: puttingInStockItem.produceId,
        stockedQuantity: newLiveStock,
        resalePrice: price,
        costPrice: puttingInStockItem.costPricePerUnit,
        stockedAt: new Date().toISOString(),
      };
      localStorage.setItem(
        key,
        JSON.stringify([
          rec,
          ...existing.filter(
            (e: any) => e.name !== cropName && e.orderId !== puttingInStockItem.orderId
          ),
        ])
      );
    } catch (e) {}

    // 1. Close modal
    setPuttingInStockItem(null);

    // 2. Automatically navigate to Live Supermarket Stock sub-tab and reset search so it shows immediately
    setStocksSubTab('supermarket_shelf');
    setStocksSearch('');

    showToast(
      `✓ Added ${qtyToAdd} ${cropUnit}s to Live Supermarket Stock! (Shelf: ${newLiveStock} ${cropUnit}s @ ₱${price}/${cropUnit})`
    );
  };

  const handleQuickStockAdjust = (produce: ProduceItem, delta: number) => {
    const poolInfo = getProductStockPool(produce);

    if (delta > 0) {
      if (poolInfo.availableInPool <= 0) {
        showToast(
          `⚠️ Insufficient inventory: 0 ${produce.unit}s remaining in "Ready to Put in Stock" pool! Procure more from farmers to add live stock.`
        );
        return;
      }

      const allowedDelta = Math.min(delta, poolInfo.availableInPool);
      const newQty = produce.stockQuantity + allowedDelta;
      const totalOwned = Math.max(produce.boughtQuantity || 0, poolInfo.totalPoolQty);

      const updated: ProduceItem = {
        ...produce,
        stockQuantity: newQty,
        boughtQuantity: totalOwned,
        sellerStatus: newQty > 0 ? 'bought_and_stocked' : produce.sellerStatus,
      };

      onUpdateProduce(updated);
      appSync.publish('PRODUCE_UPDATED', updated, 'admin');

      fetch(`/api/products/${produce.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stockQuantity: newQty, boughtQuantity: totalOwned }),
      }).catch((e) => console.log('Supermarket stock notice:', e));

      const poolRemainingAfter = poolInfo.availableInPool - allowedDelta;
      showToast(
        `✓ Pulled ${allowedDelta} ${produce.unit}s from pool into Live Stock. (${poolRemainingAfter} ${produce.unit}s remaining in pool)`
      );
    } else if (delta < 0) {
      if (produce.stockQuantity <= 0) {
        showToast(`⚠️ ${produce.name} live stock is already at 0 ${produce.unit}s.`);
        return;
      }

      const returnQty = Math.min(produce.stockQuantity, Math.abs(delta));
      const newQty = produce.stockQuantity - returnQty;
      const totalOwned = Math.max(produce.boughtQuantity || 0, poolInfo.totalPoolQty);

      const updated: ProduceItem = {
        ...produce,
        stockQuantity: newQty,
        boughtQuantity: totalOwned,
        sellerStatus: newQty === 0 ? 'bought_and_stocked' : produce.sellerStatus,
      };

      onUpdateProduce(updated);
      appSync.publish('PRODUCE_UPDATED', updated, 'admin');

      fetch(`/api/products/${produce.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stockQuantity: newQty, boughtQuantity: totalOwned }),
      }).catch((e) => console.log('Supermarket stock notice:', e));

      const poolAfter = poolInfo.availableInPool + returnQty;
      showToast(
        `✓ Returned ${returnQty} ${produce.unit}s back into "Ready to Put in Stock" pool. (${poolAfter} ${produce.unit}s now in pool)`
      );
    }
  };

  const handleRemoveFromSupermarketStock = (produce: ProduceItem) => {
    const returnedQty = produce.stockQuantity;
    onDeleteProduce(produce.id);
    appSync.publish('PRODUCE_UPDATED', { type: 'DELETED', id: produce.id }, 'admin');
    if (returnedQty > 0) {
      showToast(
        `Removed "${produce.name}" from store shelf. ${returnedQty} ${produce.unit}s returned to Ready to Put in Stock pool.`
      );
    } else {
      showToast(`Removed "${produce.name}" from Supermarket Store shelf.`);
    }
  };

  // Owner Live Transport Actions
  const handleAdvanceTransportJob = (job: TransportJob, nextStatus: TransportJob['status']) => {
    if (onUpdateTransportJobStatus) {
      onUpdateTransportJobStatus(job.id, nextStatus);
    } else {
      // Direct backend & local storage fallback
      fetch(`/api/transport-jobs/${job.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: nextStatus,
          assignedTransporterId: currentUser?.id || 'admin-main',
          assignedTransporterName: 'Owner Logistics (You)',
        }),
      }).catch((e) => console.log('Job update notice:', e));
    }

    if (nextStatus === 'delivered') {
      if (onUpdateOrderStatus && job.orderId) {
        onUpdateOrderStatus(job.orderId, 'completed');
      }
      showToast(`Haul #${job.id} Delivered! Crops received in Supermarket Store.`);
    } else if (nextStatus === 'picked_up') {
      if (onUpdateOrderStatus && job.orderId) {
        onUpdateOrderStatus(job.orderId, 'picked_up');
      }
      showToast(`Crates loaded at ${job.pickupFarm}! Starting haul trip.`);
    } else if (nextStatus === 'in_transit') {
      if (onUpdateOrderStatus && job.orderId) {
        onUpdateOrderStatus(job.orderId, 'in_transit');
      }
      showToast(`Haul #${job.id} is now In Transit to destination!`);
    } else if (nextStatus === 'accepted') {
      if (onUpdateOrderStatus && job.orderId) {
        onUpdateOrderStatus(job.orderId, 'confirmed');
      }
      showToast(`Owner route active: Dispatched to ${job.pickupFarm} for pickup.`);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900 flex flex-col items-center justify-center p-0 sm:p-4 selection:bg-emerald-600 selection:text-white">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-emerald-700 text-white font-bold px-4 py-2 rounded-full text-xs shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-200" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Pure Mobile App Shell */}
      <div className="w-full max-w-[430px] min-h-screen sm:min-h-[860px] sm:max-h-[920px] bg-white sm:rounded-[44px] sm:border-[10px] sm:border-neutral-800/10 sm:shadow-[0_20px_50px_rgba(0,0,0,0.12)] relative flex flex-col overflow-hidden">
        {/* Hardware Status Bar */}
        <div className="w-full bg-white/95 backdrop-blur-md z-30 pt-2.5 px-6 pb-1.5 flex items-center justify-between text-xs font-bold text-neutral-900 select-none border-b border-neutral-200/80">
          <span>{currentTime}</span>

          {/* Dynamic Island Pill */}
          <div className="h-5 bg-neutral-900 text-white rounded-full flex items-center justify-center gap-1.5 px-3 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-[9px] text-emerald-300 font-mono tracking-wider uppercase font-bold">
              ADMIN PORTAL
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-neutral-800">
            <Signal className="w-3.5 h-3.5" />
            <Wifi className="w-3.5 h-3.5" />
            <Battery className="w-4 h-4 text-emerald-600" />
          </div>
        </div>

        {/* Scrollable Mobile App Body */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden relative bg-white text-neutral-900 flex flex-col">
          {!isAdminAuthenticated ? (
            /* ADMIN LOGIN SCREEN */
            <div className="flex-1 p-4 flex flex-col justify-center space-y-4">
              <div className="text-center space-y-2 pt-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-700 to-teal-600 text-white flex items-center justify-center mx-auto shadow-md">
                  <Shield className="w-8 h-8" />
                </div>
                <div>
                  <h1 className="text-xl font-black text-emerald-950 tracking-tight font-display">
                    Veggie<span className="text-emerald-600">Connect</span>
                  </h1>
                  <p className="text-xs text-emerald-800 font-bold uppercase tracking-wider">
                    Admin
                  </p>
                </div>
              </div>

              {loginError && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <form onSubmit={handleAdminLoginSubmit} className="space-y-3.5 bg-white border border-emerald-100/90 rounded-3xl p-5 shadow-xs">
                <div className="border-b border-emerald-100 pb-2">
                  <h2 className="text-sm font-bold text-emerald-950">Administrator Security Login</h2>
                  <p className="text-[11px] text-neutral-500">Authorized personnel only</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                    Admin Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-neutral-900 focus:outline-none focus:border-emerald-600 focus:bg-white font-mono"
                      placeholder="Enter admin email"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                    Security Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-neutral-900 focus:outline-none focus:border-emerald-600 focus:bg-white font-mono"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                >
                  <Shield className="w-4 h-4" />
                  <span>Access Admin Console</span>
                </button>
              </form>
            </div>
          ) : (
            /* AUTHENTICATED ADMIN MOBILE APP VIEW */
            <div className="flex flex-col space-y-3.5 p-3.5 pb-20 w-full bg-white text-neutral-900">
              {/* Mobile Header Card */}
              <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white rounded-3xl p-4 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center text-white shadow-xs">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h2 className="text-sm font-black text-white font-display">DA Admin Portal</h2>
                        <span className="text-[9px] bg-emerald-500 text-white font-extrabold px-1.5 py-0.2 rounded-md">
                          LIVE
                        </span>
                      </div>
                      <p className="text-[10px] text-emerald-200">Negros Oriental Command Hub</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setAdminTab('database')}
                      className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-all cursor-pointer"
                      title="SQL Database (opens at /sql)"
                    >
                      <Database className="w-4 h-4" />
                    </button>

                    <button
                      onClick={onAdminLogout}
                      className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-all cursor-pointer flex items-center gap-1"
                      title="Sign Out & Return to Main App"
                    >
                      <LogOut className="w-4 h-4" />
                      <span className="text-[10px] font-bold">Logout</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* TAB 1: OVERVIEW & KPIS */}
              {adminTab === 'overview' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3 text-center space-y-0.5">
                      <span className="text-[10px] text-emerald-800 uppercase font-bold">Registered Farmers</span>
                      <p className="text-xl font-extrabold text-emerald-950 font-display">{stats.farmers}</p>
                      <span className="text-[9px] text-emerald-600 font-medium">Vegetable growers</span>
                    </div>

                    <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-3 text-center space-y-0.5">
                      <span className="text-[10px] text-amber-800 uppercase font-bold">Registered Buyers</span>
                      <p className="text-xl font-extrabold text-amber-950 font-display">{stats.buyers}</p>
                      <span className="text-[9px] text-amber-600 font-medium">Community consumers</span>
                    </div>

                    <div className="bg-sky-50/70 border border-sky-200 rounded-2xl p-3 text-center space-y-0.5">
                      <span className="text-[10px] text-sky-800 uppercase font-bold">Listed Vegetables</span>
                      <p className="text-xl font-extrabold text-sky-950 font-display">{stats.totalCrops}</p>
                      <span className="text-[9px] text-sky-600 font-medium">From local farms</span>
                    </div>

                    <div className="bg-purple-50/70 border border-purple-200 rounded-2xl p-3 text-center space-y-0.5">
                      <span className="text-[10px] text-purple-800 uppercase font-bold">Total Sales (Orders)</span>
                      <p className="text-xl font-extrabold text-purple-950 font-display">₱{stats.totalOrderValue.toLocaleString()}</p>
                      <span className="text-[9px] text-purple-600 font-medium">{stats.totalOrders} total orders placed</span>
                    </div>
                  </div>

                  {/* Supermarket Inventory & Stocking Card */}
                  <div
                    onClick={() => setAdminTab('stocks')}
                    className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white rounded-3xl p-3.5 space-y-2 shadow-xs cursor-pointer hover:opacity-95 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white">
                          <Boxes className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-bold text-xs text-white">Store Inventory & Stocking</h4>
                          <p className="text-[10px] text-emerald-200">
                            {ownedBoughtProducts.length} Items Bought from Farmers • {supermarketStoreProducts.length} On Store Shelves
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-emerald-200" />
                    </div>
                    {unstockedBoughtCount > 0 ? (
                      <div className="bg-amber-400 text-amber-950 font-bold text-[10px] px-2.5 py-1 rounded-xl flex items-center justify-between">
                        <span>⚠️ {unstockedBoughtCount} item{unstockedBoughtCount > 1 ? 's' : ''} bought from farmers ready to put on store shelf!</span>
                        <span className="underline font-black">Put on Shelf →</span>
                      </div>
                    ) : (
                      <div className="bg-emerald-950/40 text-emerald-200 text-[10px] px-2.5 py-1 rounded-xl flex items-center justify-between">
                        <span>All bought vegetables are stocked on store shelves</span>
                        <span className="underline font-bold">Open Inventory →</span>
                      </div>
                    )}
                  </div>

                  {/* Daily DA Bantay Presyo (SRP) Summary */}
                  <div className="bg-white border border-neutral-200 rounded-3xl p-4 space-y-2.5 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                          DA Market Price Guide (Official Suggested SRP)
                        </h3>
                        <p className="text-[10px] text-neutral-500">Government price benchmark for Dumaguete markets</p>
                      </div>
                      <button
                        onClick={() => setAdminTab('prices')}
                        className="text-[10px] text-emerald-700 font-bold bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200 cursor-pointer flex items-center gap-1"
                      >
                        <span>View All ({DA_DAILY_PRICES.length})</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="space-y-1.5 max-h-56 overflow-y-auto scrollbar-none divide-y divide-neutral-100">
                      {DA_DAILY_PRICES.slice(0, 6).map((da) => (
                        <div key={da.commodity} className="pt-1.5 first:pt-0 flex items-center justify-between text-xs">
                          <div>
                            <p className="font-bold text-neutral-900">{da.commodity}</p>
                            <p className="text-[10px] text-neutral-500">{da.category}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-extrabold text-emerald-700">₱{da.prevailingRetailPrice}/kg</p>
                            <p className="text-[10px] text-neutral-400">₱{da.priceRangeMin}-{da.priceRangeMax}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: DA BANTAY PRESYO (Full Master Price Watch for Admin) */}
              {adminTab === 'prices' && (
                <div className="space-y-3">
                  {/* Bantay Presyo Banner Card */}
                  <div className="bg-emerald-900 text-white rounded-3xl p-4 space-y-2 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-emerald-700/80 flex items-center justify-center text-emerald-200">
                          <Scale className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-black text-sm text-white">DA Bantay Presyo</h3>
                          <p className="text-[10px] text-emerald-200 font-medium">
                            {DA_BULLETIN_METADATA.marketCenter}
                          </p>
                        </div>
                      </div>
                      <span className="text-[9px] font-mono font-bold bg-emerald-800 text-emerald-200 px-2 py-0.5 rounded-full border border-emerald-700">
                        {DA_BULLETIN_METADATA.bulletinDate}
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-100/90 leading-relaxed bg-emerald-950/40 p-2 rounded-xl border border-emerald-800/60">
                      {DA_BULLETIN_METADATA.inflationNote}
                    </p>
                  </div>

                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={daPriceSearch}
                      onChange={(e) => setDaPriceSearch(e.target.value)}
                      placeholder="Search commodity (e.g. Tomato, Cabbage, Ampalaya)..."
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl pl-9 pr-3.5 py-2 text-xs text-neutral-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                    />
                  </div>

                  {/* Commodity Price Cards */}
                  <div className="space-y-2.5">
                    {filteredDaPrices.length === 0 ? (
                      <div className="bg-white border border-neutral-200 rounded-3xl p-6 text-center text-xs text-neutral-500">
                        No DA price records found matching "{daPriceSearch}".
                      </div>
                    ) : (
                      filteredDaPrices.map((item) => {
                        // Check if registered farmers are selling this item in VeggieConnect
                        // (fully procured lots are no longer active farm listings)
                        const matchingFarmerItems = produceList.filter(
                          (p) =>
                            (p.name.toLowerCase().includes(item.commodity.toLowerCase().split(' ')[0]) ||
                              item.commodity.toLowerCase().includes(p.name.toLowerCase().split(' ')[0])) &&
                            !(p.stockQuantity === 0 && (p.boughtQuantity || 0) > 0)
                        );

                        return (
                          <div
                            key={item.id}
                            className="bg-white border border-neutral-200/90 rounded-3xl p-3.5 space-y-2.5 shadow-xs"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <h4 className="font-bold text-xs text-neutral-900">{item.commodity}</h4>
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-neutral-100 text-neutral-700">
                                    {item.category}
                                  </span>
                                </div>
                                <p className="text-[10px] text-neutral-500 mt-0.5">
                                  {item.localName} • Variety: {item.variety}
                                </p>
                              </div>

                              <div className="text-right flex-shrink-0">
                                <div className="flex items-center justify-end gap-1">
                                  <span className="text-sm font-black text-emerald-700 font-mono">
                                    ₱{item.prevailingRetailPrice}
                                  </span>
                                  <span className="text-[10px] text-neutral-500">/{item.unit}</span>
                                </div>
                                <span
                                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full inline-flex items-center gap-0.5 ${
                                    item.trend === 'up'
                                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                      : item.trend === 'down'
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-neutral-100 text-neutral-700'
                                  }`}
                                >
                                  {item.trend === 'up' ? (
                                    <>
                                      <TrendingUp className="w-2.5 h-2.5" /> +₱{item.changeAmount} ({item.changePercent}%)
                                    </>
                                  ) : item.trend === 'down' ? (
                                    <>
                                      <TrendingDown className="w-2.5 h-2.5" /> -₱{Math.abs(item.changeAmount || 0)}
                                    </>
                                  ) : (
                                    <>
                                      <Minus className="w-2.5 h-2.5" /> Stable
                                    </>
                                  )}
                                </span>
                              </div>
                            </div>

                            {/* Price Grid Breakdown */}
                            <div className="grid grid-cols-3 gap-1.5 bg-neutral-50 p-2 rounded-2xl text-center border border-neutral-150">
                              <div>
                                <span className="text-[9px] text-emerald-800 uppercase font-semibold">DA Suggested</span>
                                <p className="text-xs font-bold text-emerald-700 font-mono">₱{item.suggestedDirectFarmPrice}</p>
                              </div>
                              <div className="border-x border-neutral-200 px-1">
                                <span className="text-[9px] text-neutral-500 uppercase font-semibold">Wet Market</span>
                                <p className="text-xs font-bold text-neutral-900 font-mono">₱{item.prevailingRetailPrice}</p>
                              </div>
                              <div>
                                <span className="text-[9px] text-neutral-500 uppercase font-semibold">Price Range</span>
                                <p className="text-xs font-bold text-neutral-800 font-mono">
                                  ₱{item.priceRangeMin}-{item.priceRangeMax}
                                </p>
                              </div>
                            </div>

                            {/* Live Farmer Market Comparison in VeggieConnect */}
                            <div className="bg-emerald-50/70 border border-emerald-200/70 rounded-2xl p-2.5 space-y-1 text-[11px]">
                              <div className="flex items-center justify-between font-bold text-emerald-950">
                                <span>🌾 VeggieConnect Farm Listings:</span>
                                <span>{matchingFarmerItems.length} active grower{matchingFarmerItems.length === 1 ? '' : 's'}</span>
                              </div>
                              {matchingFarmerItems.length > 0 ? (
                                <div className="space-y-1 pt-0.5">
                                  {matchingFarmerItems.slice(0, 2).map((m) => (
                                    <div key={m.id} className="flex items-center justify-between text-[10px] text-emerald-900">
                                      <span className="truncate">🌱 {m.farmName} ({m.farmerName})</span>
                                      <span className="font-bold font-mono text-emerald-800">₱{m.pricePerUnit}/{m.unit}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-[10px] text-emerald-800">
                                  Suggested Direct Farm Price: <strong className="font-mono">₱{item.suggestedDirectFarmPrice}/kg</strong>
                                </p>
                              )}
                            </div>


                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: USERS & KYC VERIFICATION */}
              {adminTab === 'users' && (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Search users and farms..."
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl pl-9 pr-3.5 py-2 text-xs text-neutral-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    <button
                      onClick={() => setRoleFilter('all')}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer ${
                        roleFilter === 'all' ? 'bg-emerald-700 text-white' : 'bg-neutral-100 text-neutral-600'
                      }`}
                    >
                      All ({stats.totalUsers})
                    </button>
                    <button
                      onClick={() => setRoleFilter('farmer')}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer ${
                        roleFilter === 'farmer' ? 'bg-emerald-700 text-white' : 'bg-neutral-100 text-neutral-600'
                      }`}
                    >
                      Farmers ({stats.farmers})
                    </button>
                    <button
                      onClick={() => setRoleFilter('buyer')}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer ${
                        roleFilter === 'buyer' ? 'bg-emerald-700 text-white' : 'bg-neutral-100 text-neutral-600'
                      }`}
                    >
                      Buyers ({stats.buyers})
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {filteredUsers.length === 0 ? (
                      <div className="bg-white border border-neutral-200 rounded-3xl p-6 text-center text-xs text-neutral-500">
                        No user profiles found.
                      </div>
                    ) : (
                      filteredUsers.map((u) => {
                        const isFarmer = u.role === 'farmer';

                        return (
                          <div
                            key={u.id}
                            className="bg-white border border-neutral-200 rounded-3xl p-3.5 space-y-2.5 shadow-xs"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                {u.avatar ? (
                                  <img src={u.avatar} alt={u.name} className="w-10 h-10 rounded-2xl object-cover border border-neutral-200 flex-shrink-0" />
                                ) : (
                                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-900 border border-emerald-200 flex items-center justify-center font-bold text-sm flex-shrink-0">
                                    {u.name.charAt(0)}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1">
                                    <h4 className="font-bold text-xs text-neutral-900 truncate">{u.name}</h4>
                                    {u.verified && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />}
                                  </div>
                                  <p className="text-[11px] text-neutral-500 font-mono truncate">{u.phone}</p>
                                  {isFarmer && u.farmName && (
                                    <p className="text-[11px] text-emerald-700 font-bold truncate">🌱 {u.farmName}</p>
                                  )}
                                </div>
                              </div>

                              <div className="text-right flex-shrink-0">
                                <span
                                  className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                    isFarmer
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-sky-100 text-sky-800'
                                  }`}
                                >
                                  {u.role}
                                </span>
                              </div>
                            </div>

                            <div className="text-[10px] text-neutral-500 flex items-center gap-1 truncate">
                              <MapPin className="w-3 h-3 text-neutral-400 flex-shrink-0" />
                              <span className="truncate">{u.location}</span>
                            </div>

                            {/* Action Bar */}
                            <div className="pt-2 border-t border-neutral-100 flex items-center justify-between gap-1.5 flex-wrap">
                              <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleToggleVerified(u)}
                                    className={`px-2 py-1 rounded-lg text-[10px] font-bold border cursor-pointer ${
                                      u.verified
                                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                        : 'bg-neutral-100 text-neutral-600 border-neutral-200'
                                    }`}
                                  >
                                    {u.verified ? 'Verified ✓' : 'Verify'}
                                  </button>
                                  <button
                                    onClick={() => handleToggleStatus(u)}
                                    className={`px-2 py-1 rounded-lg text-[10px] font-bold border cursor-pointer ${
                                      u.status === 'suspended'
                                        ? 'bg-rose-100 text-rose-800 border-rose-300'
                                        : 'bg-neutral-100 text-neutral-600 border-neutral-200'
                                    }`}
                                  >
                                    {u.status === 'suspended' ? 'Suspended' : 'Active'}
                                  </button>
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => setEditingUser(u)}
                                  className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                                  title="Edit User"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  <span>Edit</span>
                                </button>
                                <button
                                  onClick={() => setUserToDelete(u)}
                                  className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 cursor-pointer"
                                  title="Delete User"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: PRODUCE & CROPS (BUY DESK & SUPERMARKET STOCK) */}
              {adminTab === 'produce' && (
                <div className="space-y-3">
                  {/* Sub-tab Switcher: Farmer Harvest Offers (Buy Desk) vs Supermarket Inventory */}
                  <div className="bg-emerald-100/70 p-1 rounded-2xl flex gap-1 border border-emerald-200">
                    <button
                      onClick={() => setProduceSubTab('farmer_offers')}
                      className="flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer bg-emerald-700 text-white shadow-xs"
                    >
                      Farmer Offers (Buy Desk)
                    </button>
                    <button
                      onClick={() => setAdminTab('stocks')}
                      className="flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-emerald-950/70 hover:text-emerald-950 hover:bg-emerald-200/50 flex items-center justify-center gap-1"
                    >
                      <Boxes className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Stocks Tab ({supermarketStoreProducts.length}) →</span>
                    </button>
                  </div>

                  <div className="relative">
                    <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={produceSearch}
                      onChange={(e) => setProduceSearch(e.target.value)}
                      placeholder="Search produce name, farmer, or region..."
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl pl-9 pr-3.5 py-2 text-xs text-neutral-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                    />
                  </div>

                  {produceSubTab === 'farmer_offers' ? (
                    /* SUB-TAB 1: FARMER HARVEST SUBMISSIONS (BUY DESK) */
                    <div className="space-y-2.5">


                      {farmerOffersList.length === 0 ? (
                        <div className="bg-white border border-neutral-200 rounded-3xl p-6 text-center text-xs text-neutral-500">
                          No farmer harvest offers found.
                        </div>
                      ) : (
                        farmerOffersList.map((p) => {
                            const isFullyProcured = p.stockQuantity === 0;
                            const isPartiallyProcured = (p.boughtQuantity || 0) > 0 && p.stockQuantity > 0;
                            const askingPrice = p.farmgateAskingPrice || p.pricePerUnit;

                            return (
                              <div key={p.id} className="bg-white border border-neutral-200 rounded-3xl p-3.5 space-y-2.5 shadow-xs">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <h4 className="font-bold text-xs text-neutral-900 truncate">{p.name}</h4>
                                      {isFullyProcured ? (
                                        <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-md">
                                          ✓ 100% Bought by Admin ({p.boughtQuantity || 0}kg in Store)
                                        </span>
                                      ) : isPartiallyProcured ? (
                                        <span className="text-[9px] font-bold bg-blue-100 text-blue-900 px-1.5 py-0.2 rounded-md">
                                          Partially Bought ({p.boughtQuantity}kg bought)
                                        </span>
                                      ) : (
                                        <span className="text-[9px] font-bold bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded-md">
                                          Available to Buy
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-emerald-700 font-bold mt-0.5">🌱 Farmer: {p.farmerName} ({p.farmName})</p>
                                    <p className="text-[10px] text-neutral-500">{p.location} • Picked: {p.harvestDate}</p>
                                  </div>

                                  <div className="text-right flex-shrink-0">
                                    <span className="text-xs font-bold text-neutral-500 block text-[10px]">Farmer Asking:</span>
                                    <span className="text-sm font-black text-amber-700">₱{askingPrice.toFixed(2)}/{p.unit}</span>
                                  </div>
                                </div>

                                <div className="bg-neutral-50 p-2.5 rounded-xl text-[11px] flex justify-between items-center text-neutral-700">
                                  <span>{isFullyProcured ? 'Quantity Purchased by Admin:' : 'Remaining Farmer Stock:'}</span>
                                  <span className={`font-bold px-2 py-0.5 rounded border ${isFullyProcured ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'text-neutral-900 bg-white border-neutral-200'}`}>
                                    {isFullyProcured ? `0 ${p.unit}s (All ${p.boughtQuantity || 0} kg bought)` : `${p.stockQuantity} ${p.unit}s available`}
                                  </span>
                                </div>

                                {/* Buy & Chat Actions */}
                                <div className="pt-2 border-t border-neutral-100 flex items-center justify-between gap-2">
                                  <button
                                    onClick={() => setProduceToDelete(p)}
                                    className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl cursor-pointer"
                                    title="Decline / Remove Offer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    onClick={() => handleOpenFarmerChat(p)}
                                    className="py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold rounded-xl cursor-pointer flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-2xs"
                                    title={`Chat with farmer ${p.farmerName}`}
                                  >
                                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Chat Farmer</span>
                                  </button>

                                  {isFullyProcured ? (
                                    <button
                                      disabled
                                      className="flex-1 py-2 px-3 bg-neutral-200 text-neutral-500 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-not-allowed"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>Fully Purchased</span>
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        setBuyingProduceItem(p);
                                        setBuyQty(p.stockQuantity);
                                      }}
                                      className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                                    >
                                      <ShoppingBag className="w-3.5 h-3.5" />
                                      <span>Buy Product</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })
                      )}
                    </div>
                  ) : (
                    /* SUB-TAB 2: SUPERMARKET STORE STOCK (ACTIVE IN MARKET FOR BUYERS) */
                    <div className="space-y-2.5">
                      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-xs text-emerald-950 flex items-start gap-2">
                        <Store className="w-4 h-4 text-emerald-700 flex-shrink-0 mt-0.5" />
                        <p className="leading-relaxed text-[11px]">
                          <strong>Supermarket Store Stock:</strong> Crops owned and stocked by <strong>VeggieConnect Supermarket</strong>. Sourced directly from local farmers and available for retail purchase by buyers.
                        </p>
                      </div>

                      {filteredProduce.filter((p) => p.sellerStoreName === 'VeggieConnect Supermarket' || p.sellerStatus === 'bought_and_stocked').length === 0 ? (
                        <div className="bg-white border border-neutral-200 rounded-3xl p-8 text-center space-y-2.5 shadow-xs">
                          <Store className="w-10 h-10 text-emerald-600/50 mx-auto" />
                          <h4 className="font-bold text-xs text-neutral-900">No Produce Stocked in Supermarket Yet</h4>
                          <p className="text-[11px] text-neutral-500 max-w-xs mx-auto">
                            Switch to <strong>Farmer Offers (Buy Desk)</strong> to procure harvest lots from registered farmers. Purchased crops will automatically appear here!
                          </p>
                          <button
                            onClick={() => setProduceSubTab('farmer_offers')}
                            className="mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer transition-all shadow-xs"
                          >
                            Go to Farmer Offers (Buy Desk)
                          </button>
                        </div>
                      ) : (
                        filteredProduce
                          .filter((p) => p.sellerStoreName === 'VeggieConnect Supermarket' || p.sellerStatus === 'bought_and_stocked')
                          .map((p) => (
                            <div key={p.id} className="bg-white border border-neutral-200 rounded-3xl p-3.5 space-y-2 shadow-xs">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <h4 className="font-bold text-xs text-neutral-900">{p.name}</h4>
                                  <p className="text-[11px] text-emerald-700 font-bold">🏬 VeggieConnect Supermarket</p>
                                  <p className="text-[10px] text-neutral-500">
                                    {p.sourcingRegion ? `Sourced from: ${p.sourcingRegion}` : `Origin: ${p.location}`}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <span className="text-sm font-black text-emerald-700">₱{p.pricePerUnit}</span>
                                  <span className="text-[10px] text-neutral-500">/{p.unit}</span>
                                </div>
                              </div>

                              <div className="bg-neutral-50 p-2 rounded-xl text-[11px] flex justify-between text-neutral-700">
                                <span>Available Supermarket Stock:</span>
                                <span className="font-bold text-neutral-900 bg-white px-2 py-0.5 rounded border border-neutral-200">
                                  {p.stockQuantity} {p.unit}s in store
                                </span>
                              </div>

                              <div className="pt-2 border-t border-neutral-100 flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleOpenFarmerChat(p)}
                                  className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-300 cursor-pointer flex items-center gap-1 shadow-2xs"
                                  title={`Chat with grower ${p.farmerName}`}
                                >
                                  <MessageSquare className="w-3 h-3 text-emerald-600" />
                                  <span>Chat Farmer</span>
                                </button>
                                <button
                                  onClick={() => setEditingProduceItem(p)}
                                  className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 cursor-pointer flex items-center gap-1"
                                >
                                  <Edit3 className="w-3 h-3" />
                                  <span>Edit Price/Stock</span>
                                </button>
                                <button
                                  onClick={() => setProduceToDelete(p)}
                                  className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB: STOCKS (PRODUCTS I OWNED/BOUGHT & LIVE SUPERMARKET STORE STOCK) */}
              {adminTab === 'stocks' && (
                <div className="space-y-3">
                  {/* Stocks Top Banner */}
                  <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white rounded-3xl p-4 space-y-2 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-emerald-700/80 flex items-center justify-center text-emerald-200">
                          <Boxes className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-black text-sm text-white">Supermarket Store Stocks</h3>
                          <p className="text-[10px] text-emerald-200 font-medium">
                            Owned Inventory & Retail Shelves
                          </p>
                        </div>
                      </div>
                      <span className="text-[9px] font-mono font-bold bg-emerald-800 text-emerald-200 px-2 py-0.5 rounded-full border border-emerald-700">
                        {supermarketStoreProducts.length} Active in Store
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-100/90 leading-relaxed bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-800/60">
                      Manage all products you bought or owned from farmers, and manually put them into your <strong>Supermarket Store Stock</strong> with custom retail pricing and shelf quantities.
                    </p>
                  </div>

                  {/* Top Sub-Tab Switcher: Products I Owned/Bought vs Live Supermarket Store Stock */}
                  <div className="bg-emerald-100/70 p-1 rounded-2xl flex gap-1 border border-emerald-200">
                    <button
                      id="stocks-subtab-owned"
                      onClick={() => setStocksSubTab('owned_bought')}
                      className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        stocksSubTab === 'owned_bought'
                          ? 'bg-emerald-700 text-white shadow-xs'
                          : 'text-emerald-950/70 hover:text-emerald-950'
                      }`}
                    >
                      <PackageCheck className="w-3.5 h-3.5" />
                      <span>Products I Bought / Owned ({ownedBoughtProducts.length})</span>
                    </button>
                    <button
                      id="stocks-subtab-shelf"
                      onClick={() => setStocksSubTab('supermarket_shelf')}
                      className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        stocksSubTab === 'supermarket_shelf'
                          ? 'bg-emerald-700 text-white shadow-xs'
                          : 'text-emerald-950/70 hover:text-emerald-950'
                      }`}
                    >
                      <Store className="w-3.5 h-3.5" />
                      <span>Live Supermarket Stock ({supermarketStoreProducts.length})</span>
                    </button>
                  </div>

                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={stocksSearch}
                      onChange={(e) => setStocksSearch(e.target.value)}
                      placeholder={
                        stocksSubTab === 'owned_bought'
                          ? "Search bought products, farmer name, farm, or order ID..."
                          : "Search live supermarket stock name, category, or sourcing region..."
                      }
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl pl-9 pr-3.5 py-2 text-xs text-neutral-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                    />
                  </div>

                  {/* SUBTAB 1: PRODUCTS I OWNED / BOUGHT FROM FARMERS */}
                  {stocksSubTab === 'owned_bought' ? (
                    <div className="space-y-3">
                      {/* Filter Chips */}
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-[11px]">
                        <button
                          onClick={() => setStocksFilter('all')}
                          className={`px-3 py-1 rounded-full font-bold transition-all cursor-pointer whitespace-nowrap ${
                            stocksFilter === 'all'
                              ? 'bg-emerald-700 text-white'
                              : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                          }`}
                        >
                          All Bought ({ownedBoughtProducts.length})
                        </button>
                        <button
                          onClick={() => setStocksFilter('ready_to_stock')}
                          className={`px-3 py-1 rounded-full font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                            stocksFilter === 'ready_to_stock'
                              ? 'bg-amber-600 text-white'
                              : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
                          }`}
                        >
                          <span>Ready to Put in Stock</span>
                          {unstockedBoughtCount > 0 && (
                            <span className="bg-amber-500 text-white rounded-full px-1.5 py-0.2 text-[9px] font-black">
                              {unstockedBoughtCount}
                            </span>
                          )}
                        </button>
                        <button
                          onClick={() => setStocksFilter('already_stocked')}
                          className={`px-3 py-1 rounded-full font-bold transition-all cursor-pointer whitespace-nowrap ${
                            stocksFilter === 'already_stocked'
                              ? 'bg-emerald-700 text-white'
                              : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                          }`}
                        >
                          Already on Store Shelf ({alreadyStockedBoughtCount})
                        </button>
                      </div>

                      {/* Listing Cards */}
                      {filteredOwnedBought.length === 0 ? (
                        <div className="bg-white border border-neutral-200 rounded-3xl p-8 text-center space-y-3 shadow-xs">
                          <PackageCheck className="w-10 h-10 text-emerald-600/50 mx-auto" />
                          <h4 className="font-bold text-xs text-neutral-900">
                            {stocksFilter === 'ready_to_stock'
                              ? 'No bought & delivered lots waiting to be shelved!'
                              : 'No Bought Products Found'}
                          </h4>
                          <p className="text-[11px] text-neutral-500 max-w-xs mx-auto leading-relaxed">
                            {stocksFilter === 'ready_to_stock'
                              ? 'You can switch to "Live Supermarket Stock" to adjust prices or stock quantities.'
                              : 'Procure harvest lots submitted by registered farmers via the Buy Desk, or confirm a delivered haul. They will appear here for you to manually stock into your Supermarket.'}
                          </p>
                          <button
                            onClick={() => setAdminTab('produce')}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer transition-all shadow-xs"
                          >
                            Browse Farmer Offers in Buy Desk →
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {filteredOwnedBought.map((item) => {
                            const isStocked = (item.supermarketStockQty || 0) > 0;
                            const readyQty =
                              lotReadyPoolById[item.id] ??
                              Math.max(0, item.quantityBought - (item.supermarketStockQty || 0));
                            const isDeliveredAndPurchased = item.isPurchased && item.isDelivered;
                            const canShelve = isDeliveredAndPurchased && readyQty > 0;
                            const isFullyStocked = isDeliveredAndPurchased && isStocked && readyQty === 0;
                            const isPartiallyStocked = isDeliveredAndPurchased && isStocked && readyQty > 0;

                            return (
                              <div
                                key={item.id}
                                className="bg-white border border-neutral-200 rounded-3xl p-3.5 space-y-3 shadow-xs hover:border-emerald-300 transition-all"
                              >
                                {/* Top Badge Row */}
                                <div className="flex items-center justify-between gap-1.5 flex-wrap">
                                  <span
                                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                                      item.isDelivered
                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                        : 'bg-amber-100 text-amber-900 border border-amber-200'
                                    }`}
                                  >
                                    {item.isDelivered ? (
                                      <>
                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                        <span>{item.deliveryStatus}</span>
                                      </>
                                    ) : (
                                      <>
                                        <Clock className="w-3 h-3 text-amber-600" />
                                        <span>{item.deliveryStatus}</span>
                                      </>
                                    )}
                                  </span>

                                  {isFullyStocked ? (
                                    <span className="bg-emerald-50 text-emerald-800 border border-emerald-300 font-extrabold px-2.5 py-0.5 rounded-full text-[10px] flex items-center gap-1 shadow-2xs">
                                      <Store className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>
                                        100% on Store Shelf: {item.supermarketStockQty} {item.unit}s @ ₱{item.supermarketPrice}/{item.unit} ✓
                                      </span>
                                    </span>
                                  ) : isPartiallyStocked ? (
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold px-2.5 py-0.5 rounded-full text-[10px] flex items-center gap-1 shadow-2xs">
                                        <Store className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>On Shelf: {item.supermarketStockQty} {item.unit}s</span>
                                      </span>
                                      <span className="bg-amber-50 text-amber-900 border border-amber-200 font-extrabold px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3 text-amber-600" />
                                        <span>Ready in Pool: {readyQty} {item.unit}s</span>
                                      </span>
                                    </div>
                                  ) : isDeliveredAndPurchased && readyQty > 0 ? (
                                    <span className="bg-amber-50 text-amber-900 border border-amber-200 font-bold px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1">
                                      <AlertCircle className="w-3 h-3 text-amber-600" />
                                      <span>Ready to Put in Stock ({readyQty} {item.unit}s)</span>
                                    </span>
                                  ) : (
                                    <span className="bg-neutral-100 text-neutral-500 border border-neutral-200 font-bold px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-neutral-400" />
                                      <span>{item.isPurchased ? 'Awaiting Delivery' : 'Not Purchased Yet'}</span>
                                    </span>
                                  )}
                                </div>

                                {/* Crop & Farmer Info */}
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <h4 className="font-bold text-sm text-neutral-900 truncate">{item.name}</h4>
                                    <p className="text-[11px] text-emerald-700 font-bold mt-0.5">
                                      🌱 Farmer: {item.farmerName} ({item.farmName})
                                    </p>
                                    <p className="text-[10px] text-neutral-500">
                                      {item.location || 'Negros Oriental'} • {item.category || 'Vegetables'}
                                    </p>
                                  </div>

                                  <div className="text-right flex-shrink-0">
                                    <span className="text-[10px] text-neutral-500 block uppercase font-bold">Total Owned:</span>
                                    <span className="text-sm font-extrabold text-neutral-900">
                                      {item.quantityBought} {item.unit}s
                                    </span>
                                    <span className="text-[10px] text-neutral-500 block mt-0.5">
                                      Pool: <strong className="text-amber-800">{readyQty} {item.unit}s</strong> | Shelf: <strong className="text-emerald-700">{item.supermarketStockQty || 0} {item.unit}s</strong>
                                    </span>
                                  </div>
                                </div>

                                {/* Financial Summary Pill */}
                                <div className="grid grid-cols-2 gap-2 bg-neutral-50 p-2.5 rounded-2xl text-[11px] border border-neutral-150">
                                  <div>
                                    <span className="text-[9px] text-neutral-500 uppercase font-semibold block">Bought from Farmer at:</span>
                                    <span className="font-extrabold text-amber-800 font-mono">
                                      ₱{item.costPricePerUnit.toFixed(2)}/{item.unit}
                                    </span>
                                  </div>
                                  <div className="text-right border-l border-neutral-200 pl-2">
                                    <span className="text-[9px] text-neutral-500 uppercase font-semibold block">Total Paid to Farmer:</span>
                                    <span className="font-extrabold text-neutral-900 font-mono">
                                      ₱{item.totalCost.toFixed(2)}
                                    </span>
                                  </div>
                                </div>

                                {/* Order & Date Metadata */}
                                <div className="flex items-center justify-between text-[10px] text-neutral-400 border-t border-neutral-100 pt-2">
                                  <span>
                                    Ref: {item.orderId || 'Buy Desk Procurement'}
                                    {item.orderRefs && item.orderRefs.length > 0
                                      ? ` (+${item.orderRefs.length} more)`
                                      : ''}
                                  </span>
                                  <span>{new Date(item.dateBought).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                </div>

                                {/* Primary Action: Put on Store Shelf Button */}
                                <div className="pt-1">
                                  {canShelve ? (
                                    <div className="space-y-1.5">
                                      <button
                                        id={`btn-stock-${item.id}`}
                                        onClick={() => handleOpenPutInStockModal(item)}
                                        title="Put units from this bought lot on the store shelf"
                                        className="w-full py-2.5 px-3 text-white text-xs font-black rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all active:scale-95 bg-emerald-600 hover:bg-emerald-700 cursor-pointer"
                                      >
                                        <Store className="w-4 h-4" />
                                        <span>
                                          {isStocked
                                            ? `Put More on Shelf (${readyQty} ${item.unit}s remaining in inventory)`
                                            : `Put on Store Shelf (${readyQty} ${item.unit}s)`}
                                        </span>
                                      </button>
                                    </div>
                                  ) : isFullyStocked ? (
                                    <button
                                      id={`btn-view-shelf-${item.id}`}
                                      onClick={() => {
                                        setStocksSubTab('supermarket_shelf');
                                        setStocksSearch('');
                                      }}
                                      className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
                                    >
                                      <Store className="w-3.5 h-3.5" />
                                      <span>View in Live Supermarket Stock (100% Stocked) →</span>
                                    </button>
                                  ) : (
                                    <div className="space-y-1.5">
                                      <button
                                        id={`btn-stock-${item.id}`}
                                        disabled
                                        title={
                                          !item.isPurchased
                                            ? 'Shelving unlocks after this lot is purchased from the farmer'
                                            : 'Shelving unlocks once the haul is delivered to the hub'
                                        }
                                        className="w-full py-2.5 px-3 text-white/70 text-xs font-black rounded-xl shadow-xs flex items-center justify-center gap-2 bg-neutral-300 cursor-not-allowed"
                                      >
                                        <Store className="w-4 h-4" />
                                        <span>Put in Supermarket Store Stock</span>
                                      </button>
                                      <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-2.5 py-1.5 leading-relaxed">
                                        {!item.isPurchased ? (
                                          <>🛒 Not purchased yet — shelving unlocks once you buy this lot from the farmer.</>
                                        ) : (
                                          <>
                                            ⏳ Haul status: <strong>{item.deliveryStatus}</strong>. Shelving unlocks
                                            once you click “✅ Confirm Delivery &amp; Stock Received in Supermarket”.
                                          </>
                                        )}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* SUBTAB 2: LIVE SUPERMARKET STORE STOCK (ON STORE SHELVES FOR BUYERS) */
                    <div className="space-y-2.5">
                      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-xs text-emerald-950 flex items-start gap-2">
                        <Store className="w-4 h-4 text-emerald-700 flex-shrink-0 mt-0.5" />
                        <p className="leading-relaxed text-[11px]">
                          <strong>Live Supermarket Shelves:</strong> These crops are actively displayed to registered buyers in the VeggieConnect Market app. Orders are fulfilled directly from your Central Supermarket Hub. Adding live stock strictly pulls units from your "Ready to Put in Stock" pool.
                        </p>
                      </div>

                      {filteredSupermarketStore.length === 0 ? (
                        <div className="bg-white border border-neutral-200 rounded-3xl p-8 text-center space-y-2.5 shadow-xs">
                          <Store className="w-10 h-10 text-emerald-600/50 mx-auto" />
                          <h4 className="font-bold text-xs text-neutral-900">No Produce Stocked on Supermarket Shelves Yet</h4>
                          <p className="text-[11px] text-neutral-500 max-w-xs mx-auto">
                            Switch to <strong>"Products I Bought / Owned"</strong> to place your procured crops onto the supermarket store shelves!
                          </p>
                          <button
                            onClick={() => setStocksSubTab('owned_bought')}
                            className="mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer transition-all shadow-xs"
                          >
                            Put Procured Crops on Store Shelf →
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {filteredSupermarketStore.map((p) => {
                            const isOutOfStock = p.stockQuantity === 0;
                            const poolInfo = getProductStockPool(p);

                            return (
                              <div
                                key={p.id}
                                className="bg-white border border-neutral-200 rounded-3xl p-3.5 space-y-2.5 shadow-xs"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <h4 className="font-bold text-xs text-neutral-900">{p.name}</h4>
                                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-neutral-100 text-neutral-700">
                                        {p.category}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-emerald-700 font-bold mt-0.5">
                                      🏬 VeggieConnect Supermarket
                                    </p>
                                    <p className="text-[10px] text-neutral-500">
                                      {p.sourcingRegion ? `Sourced from: ${p.sourcingRegion}` : `Origin: ${p.location}`}
                                    </p>
                                  </div>
                                  <div className="text-right flex-shrink-0">
                                    <span className="text-sm font-black text-emerald-700 font-mono">
                                      ₱{p.pricePerUnit.toFixed(2)}
                                    </span>
                                    <span className="text-[10px] text-neutral-500">/{p.unit}</span>
                                  </div>
                                </div>

                                {/* Stock Quantity & Pool Inventory Bar */}
                                <div className="bg-neutral-50 p-2.5 rounded-2xl space-y-2 text-[11px] border border-neutral-150">
                                  <div className="flex items-center justify-between gap-1 flex-wrap">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-neutral-600 font-medium">Store Shelf Inventory:</span>
                                      {isOutOfStock ? (
                                        <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 text-[10px]">
                                          Out of Stock (0 {p.unit}s)
                                        </span>
                                      ) : (
                                        <span className="font-bold text-neutral-900 bg-white px-2 py-0.5 rounded border border-neutral-200">
                                          {p.stockQuantity} {p.unit}s available
                                        </span>
                                      )}
                                    </div>

                                    {/* Quick +/- Stock Buttons (Strictly -1 and +1) */}
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        onClick={() => handleQuickStockAdjust(p, -1)}
                                        disabled={p.stockQuantity <= 0}
                                        className={`px-2 h-6.5 rounded-lg text-xs font-bold flex items-center justify-center transition-all ${
                                          p.stockQuantity <= 0
                                            ? 'opacity-30 cursor-not-allowed bg-neutral-150 text-neutral-400'
                                            : 'bg-neutral-200 hover:bg-neutral-300 text-neutral-700 cursor-pointer active:scale-90 shadow-2xs'
                                        }`}
                                        title={
                                          p.stockQuantity <= 0
                                            ? 'Live shelf stock is 0'
                                            : `Return 1 unit back into Ready to Put in Stock pool`
                                        }
                                      >
                                        -1
                                      </button>
                                      <button
                                        onClick={() => handleQuickStockAdjust(p, 1)}
                                        disabled={poolInfo.availableInPool <= 0}
                                        className={`px-2 h-6.5 rounded-lg text-xs font-bold flex items-center justify-center transition-all ${
                                          poolInfo.availableInPool <= 0
                                            ? 'opacity-30 cursor-not-allowed bg-neutral-150 text-neutral-400'
                                            : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-90 shadow-2xs'
                                        }`}
                                        title={
                                          poolInfo.availableInPool <= 0
                                            ? `Cannot add stock: 0 units remaining in Ready to Put in Stock pool`
                                            : `Pull 1 unit from Ready to Put in Stock pool (${poolInfo.availableInPool} available)`
                                        }
                                      >
                                        +1
                                      </button>
                                    </div>
                                  </div>

                                  {/* Ready to Put in Stock Pool Row */}
                                  <div className="flex items-center justify-between pt-1 border-t border-neutral-200/70 text-[10px]">
                                    <div className="flex items-center gap-1">
                                      <PackageCheck className="w-3 h-3 text-emerald-600" />
                                      <span className="text-neutral-500 font-semibold">Ready to Put in Stock Pool:</span>
                                    </div>
                                    {poolInfo.availableInPool > 0 ? (
                                      <span className="font-extrabold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                                        <AlertCircle className="w-2.5 h-2.5 text-amber-600" />
                                        <span>{poolInfo.availableInPool} {p.unit}s remaining in pool</span>
                                      </span>
                                    ) : (
                                      <span className="font-bold text-neutral-500 bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded-full">
                                        0 {p.unit}s in pool (Pool Depleted)
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Actions Row */}
                                <div className="pt-2 border-t border-neutral-100 flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handleOpenFarmerChat(p)}
                                    className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-300 cursor-pointer flex items-center gap-1 shadow-2xs"
                                    title={`Chat with grower ${p.farmerName}`}
                                  >
                                    <MessageSquare className="w-3 h-3 text-emerald-600" />
                                    <span>Chat Farmer</span>
                                  </button>
                                  <button
                                    onClick={() => setEditingProduceItem(p)}
                                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 cursor-pointer flex items-center gap-1"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                    <span>Edit Price/Stock</span>
                                  </button>
                                  <button
                                    onClick={() => handleRemoveFromSupermarketStock(p)}
                                    className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl cursor-pointer"
                                    title="Remove from Supermarket Shelf"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: TRANSACTIONS & LIVE TRANSPORT LOGISTICS */}
              {adminTab === 'transactions' && (
                <div className="space-y-3">
                  {/* Top Sub-Tab Switcher: Live Transport vs All Orders */}
                  <div className="bg-emerald-100/70 p-1 rounded-2xl border border-emerald-200 flex">
                    <button
                      id="subtab-live-transport"
                      onClick={() => setTransactionSubTab('live_logistics')}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        transactionSubTab === 'live_logistics'
                          ? 'bg-emerald-700 text-white shadow-xs'
                          : 'text-emerald-950 hover:bg-emerald-200/50'
                      }`}
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>Live Transport & Hauls</span>
                      {activeLiveHauls.length > 0 && (
                        <span className="ml-1 bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full">
                          {activeLiveHauls.length}
                        </span>
                      )}
                    </button>
                    <button
                      id="subtab-all-orders"
                      onClick={() => setTransactionSubTab('all_orders')}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        transactionSubTab === 'all_orders'
                          ? 'bg-emerald-700 text-white shadow-xs'
                          : 'text-emerald-950 hover:bg-emerald-200/50'
                      }`}
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>All Orders Ledger</span>
                      <span className="ml-1 text-[10px] opacity-80">({transactionsList.length})</span>
                    </button>
                  </div>

                  {/* SUB-VIEW 1: LIVE TRANSPORT FLEET (OWNER DRIVER LOGISTICS) */}
                  {transactionSubTab === 'live_logistics' ? (
                    <div className="space-y-3">


                      {/* Quick Metric Pills / Interactive Status Filter */}
                      <div className="grid grid-cols-4 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setHaulFilter('active')}
                          className={`rounded-2xl p-2 text-center transition-all cursor-pointer border ${
                            haulFilter === 'active'
                              ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                              : 'bg-white border-neutral-200 hover:bg-neutral-50'
                          }`}
                        >
                          <span className={`text-[9px] font-bold block uppercase ${haulFilter === 'active' ? 'text-amber-100' : 'text-neutral-500'}`}>Active</span>
                          <span className={`text-sm font-black ${haulFilter === 'active' ? 'text-white' : 'text-amber-700'}`}>
                            {activeLiveHauls.length}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setHaulFilter('in_transit')}
                          className={`rounded-2xl p-2 text-center transition-all cursor-pointer border ${
                            haulFilter === 'in_transit'
                              ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs'
                              : 'bg-white border-neutral-200 hover:bg-neutral-50'
                          }`}
                        >
                          <span className={`text-[9px] font-bold block uppercase ${haulFilter === 'in_transit' ? 'text-emerald-200' : 'text-neutral-500'}`}>In Transit</span>
                          <span className={`text-sm font-black ${haulFilter === 'in_transit' ? 'text-white' : 'text-emerald-700'}`}>
                            {inTransitHauls.length}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setHaulFilter('delivered')}
                          className={`rounded-2xl p-2 text-center transition-all cursor-pointer border ${
                            haulFilter === 'delivered'
                              ? 'bg-neutral-800 text-white border-neutral-900 shadow-xs'
                              : 'bg-white border-neutral-200 hover:bg-neutral-50'
                          }`}
                        >
                          <span className={`text-[9px] font-bold block uppercase ${haulFilter === 'delivered' ? 'text-neutral-300' : 'text-neutral-500'}`}>Delivered</span>
                          <span className={`text-sm font-black ${haulFilter === 'delivered' ? 'text-white' : 'text-neutral-800'}`}>
                            {deliveredHauls.length}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setHaulFilter('cancelled')}
                          className={`rounded-2xl p-2 text-center transition-all cursor-pointer border ${
                            haulFilter === 'cancelled'
                              ? 'bg-red-700 text-white border-red-800 shadow-xs'
                              : 'bg-white border-neutral-200 hover:bg-neutral-50'
                          }`}
                        >
                          <span className={`text-[9px] font-bold block uppercase ${haulFilter === 'cancelled' ? 'text-red-200' : 'text-neutral-500'}`}>Cancelled</span>
                          <span className={`text-sm font-black ${haulFilter === 'cancelled' ? 'text-white' : 'text-red-600'}`}>
                            {cancelledHauls.length}
                          </span>
                        </button>
                      </div>

                      {/* Filter Status Subheader */}
                      <div className="flex items-center justify-between px-1 text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-neutral-700">
                          <span className="capitalize">{haulFilter.replace('_', ' ')} Hauls</span>
                          <span className="text-[10px] bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full font-mono">
                            {displayedHauls.length} total
                          </span>
                        </div>
                        {haulFilter !== 'active' && (
                          <button
                            type="button"
                            onClick={() => setHaulFilter('active')}
                            className="text-[11px] font-bold text-amber-700 hover:underline cursor-pointer flex items-center gap-1"
                          >
                            <span>← Show Active Hauls</span>
                          </button>
                        )}
                      </div>

                      {/* Transport Jobs List */}
                      <div className="space-y-3 pt-1">
                        {displayedHauls.length === 0 ? (
                          <div className="bg-white border border-neutral-200 rounded-3xl p-6 text-center text-xs text-neutral-500 space-y-2">
                            <Truck className="w-8 h-8 text-neutral-300 mx-auto stroke-[1.5]" />
                            <p className="font-bold text-neutral-800 text-sm">
                              {haulFilter === 'active'
                                ? 'No active transport hauls'
                                : haulFilter === 'cancelled'
                                ? 'No cancelled hauls recorded'
                                : `No ${haulFilter} hauls recorded`}
                            </p>
                            <p className="text-[11px] text-neutral-400">
                              {haulFilter === 'active'
                                ? 'All active transport trips have either completed or been cancelled.'
                                : 'Haul records will appear here as they change status.'}
                            </p>

                          </div>
                        ) : (
                          displayedHauls.map((job) => {
                            const isCancelled = isJobOrOrderCancelled(job);
                            const isDelivered = !isCancelled && job.status === 'delivered';
                            const isInTransit = !isCancelled && job.status === 'in_transit';
                            const isPickedUp = !isCancelled && job.status === 'picked_up';
                            const isAccepted = !isCancelled && job.status === 'accepted';
                            const isAvailable = !isCancelled && job.status === 'available';

                            const matchingTx = transactionsList.find(
                              (t) => t.order.id === job.orderId || t.job?.id === job.id
                            );
                            const linkedOrder = matchingTx?.order || orders.find((o) => o.id === job.orderId || o.transportJobId === job.id);

                            // LIVE ROUTE: supermarket hub ➔ THIS haul's supplying farm (active hauls only).
                            const supplyItem = linkedOrder?.items?.[0];
                            const linkedFarmer =
                              matchingTx?.farmer ||
                              registeredUsers.find(
                                (u) =>
                                  u.role === 'farmer' &&
                                  ((linkedOrder?.farmerId && u.id === linkedOrder.farmerId) ||
                                    (linkedOrder?.farmName &&
                                      u.farmName &&
                                      linkedOrder.farmName.trim().toLowerCase() ===
                                        u.farmName.trim().toLowerCase()))
                              );
                            const farmHouse = resolveFarmHouseCoordinates({
                              ...(linkedFarmer &&
                              linkedFarmer.id === (supplyItem?.farmerId || linkedOrder?.farmerId)
                                ? {
                                    latitude: linkedFarmer.latitude,
                                    longitude: linkedFarmer.longitude,
                                  }
                                : {}),
                              farmerId: linkedOrder?.farmerId,
                              farmName: linkedOrder?.farmName || job.pickupFarm,
                              farmerName: supplyItem?.farmerName || linkedFarmer?.name,
                              locationText: job.pickupLocation || supplyItem?.farmName,
                              registeredUsers,
                              produceList,
                              itemFarmerId: supplyItem?.farmerId,
                              itemFarmerName: supplyItem?.farmerName,
                              itemFarmName: supplyItem?.farmName,
                            });
                            const routeStats = haulRouteStats[job.id];

                            return (
                              <div
                                key={job.id}
                                className={`bg-white border rounded-3xl p-4 space-y-3 shadow-xs transition-all ${
                                  isCancelled
                                    ? 'border-red-200 bg-red-50/25'
                                    : !isDelivered
                                    ? 'border-amber-300 ring-1 ring-amber-200'
                                    : 'border-neutral-200'
                                }`}
                              >
                                {/* Header: Route ID, Status Pill, Cargo Weight */}
                                <div className="flex items-start justify-between gap-2 border-b border-neutral-100 pb-2.5">
                                  <div>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-xs font-black text-neutral-900 font-mono">
                                        HAUL #{job.id}
                                      </span>
                                      {isCancelled ? (
                                        <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase bg-red-100 text-red-800 border border-red-300 flex items-center gap-1">
                                          <XCircle className="w-3 h-3 text-red-600" />
                                          <span>ORDER CANCELLED & RESTOCKED</span>
                                        </span>
                                      ) : isDelivered ? (
                                        <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase bg-emerald-100 text-emerald-800">
                                          DELIVERED ✓
                                        </span>
                                      ) : isInTransit ? (
                                        <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase bg-amber-500 text-white animate-pulse">
                                          ON THE ROAD 🚚
                                        </span>
                                      ) : isPickedUp ? (
                                        <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase bg-amber-100 text-amber-900 animate-pulse">
                                          CRATES LOADED 📦
                                        </span>
                                      ) : isAccepted ? (
                                        <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase bg-sky-100 text-sky-800">
                                          ROUTE DISPATCHED 🛵
                                        </span>
                                      ) : (
                                        <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase bg-amber-100 text-amber-800 animate-pulse">
                                          AWAITING PICKUP ⏳
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-neutral-500 mt-0.5 font-mono">
                                      Linked Order: #{job.orderId}
                                    </p>
                                  </div>

                                  <div className="text-right">
                                    <span className="text-xs font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                      {job.weightKgEst} kg Cargo
                                    </span>
                                  </div>
                                </div>

                                {/* Visual Transport Progress Bar or Cancelled Banner */}
                                {isCancelled ? (
                                  <div className="bg-red-100/70 border border-red-200 rounded-2xl p-2.5 flex items-center justify-between text-xs text-red-800">
                                    <div className="flex items-center gap-1.5 font-bold">
                                      <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                                      <span>Haul Cancelled — Order voided by user</span>
                                    </div>
                                    <span className="text-[10px] font-bold bg-white text-red-700 px-2 py-0.5 rounded-lg border border-red-200">
                                      Crops Restocked
                                    </span>
                                  </div>
                                ) : (
                                  <div className="space-y-1 bg-neutral-50 p-2.5 rounded-2xl border border-neutral-100">
                                    <div className="flex items-center justify-between text-[10px] font-bold">
                                      <span className={isAvailable ? 'text-amber-700' : 'text-neutral-400'}>1. Listed</span>
                                      <span className={isAccepted ? 'text-sky-700' : 'text-neutral-400'}>2. Heading to Farm</span>
                                      <span className={isPickedUp ? 'text-amber-700' : 'text-neutral-400'}>3. Crates Loaded</span>
                                      <span className={isInTransit ? 'text-amber-700' : 'text-neutral-400'}>4. In Transit</span>
                                      <span className={isDelivered ? 'text-emerald-700 font-extrabold' : 'text-neutral-400'}>5. Delivered</span>
                                    </div>
                                    <div className="w-full bg-neutral-200 h-2 rounded-full overflow-hidden flex">
                                      <div
                                        className={`h-full transition-all duration-300 ${
                                          isDelivered
                                            ? 'w-full bg-emerald-600'
                                            : isInTransit
                                            ? 'w-4/5 bg-amber-500 animate-pulse'
                                            : isPickedUp
                                            ? 'w-3/5 bg-amber-500'
                                            : isAccepted
                                            ? 'w-2/5 bg-sky-500'
                                            : 'w-1/5 bg-amber-400'
                                        }`}
                                      />
                                    </div>
                                  </div>
                                )}

                                {/* Cargo Payload Summary */}
                                <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-2.5 text-xs text-emerald-950 font-medium space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-emerald-800 uppercase">Crop Cargo:</span>
                                    <span className="font-mono text-[10px] text-emerald-700">Driver: Owner (You)</span>
                                  </div>
                                  <p className="font-extrabold text-neutral-900 text-xs">
                                    🌱 {job.itemsSummary}
                                  </p>
                                </div>

                                {/* Route Points */}
                                <div className="text-[11px] text-neutral-700 space-y-1.5 bg-neutral-50 p-2.5 rounded-2xl">
                                  <div className="flex items-start gap-1.5">
                                    <span className="text-emerald-700 font-bold flex-shrink-0">🌱 Origin (Farm):</span>
                                    <div className="min-w-0">
                                      <strong className="text-neutral-900">{job.pickupFarm}</strong>
                                      <p className="text-[10px] text-neutral-500 truncate">{job.pickupLocation}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-start gap-1.5">
                                    <span className="text-sky-700 font-bold flex-shrink-0">🏢 Destination:</span>
                                    <div className="min-w-0">
                                      <strong className="text-neutral-900">{job.buyerName}</strong>
                                      <p className="text-[10px] text-neutral-500 truncate">{job.dropoffLocation}</p>
                                    </div>
                                  </div>
                                </div>

                                {/* LIVE ROUTE MAP: Supermarket Hub ➔ Farmer's House (Active Uncancelled Hauls Only) */}
                                {!isDelivered && !isCancelled && (
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
                                      routeKey={job.id}
                                      origin={farmHouse.coords}
                                      destination={supermarketHub}
                                      originLabel={farmHouse.label}
                                      destinationLabel={supermarket.storeName}
                                      originEmoji="🌱"
                                      destinationEmoji="🏪"
                                      heightClassName="h-60"
                                      onRouteCalculated={(km, durationText) => {
                                        setHaulRouteStats((prev) =>
                                          prev[job.id] &&
                                          prev[job.id].km === km &&
                                          prev[job.id].durationText === durationText
                                            ? prev
                                            : { ...prev, [job.id]: { km, durationText } }
                                        );
                                      }}
                                    />
                                  </div>
                                )}

                                {/* Owner Interactive Step Execution Controls or Cancelled Summary */}
                                {isCancelled ? (
                                  <div className="bg-red-50 border border-red-200 rounded-2xl p-3 text-xs text-red-900 space-y-1.5">
                                    <div className="flex items-center justify-between font-bold">
                                      <span className="flex items-center gap-1">
                                        <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                                        <span>Cancellation Notice</span>
                                      </span>
                                      {(linkedOrder?.cancelledAt || job.cancelledAt) && (
                                        <span className="text-[10px] text-red-600 font-mono">
                                          {linkedOrder?.cancelledAt || job.cancelledAt}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-red-700 leading-relaxed">
                                      This haul was voided because order #{job.orderId} was cancelled. All reserved crop lots were safely restored to live inventory.
                                    </p>
                                    {(linkedOrder?.cancelReason || job.cancelReason) && (
                                      <div className="text-[11px] text-red-800 pt-1 border-t border-red-200/60 font-medium">
                                        <strong>Reason:</strong> {linkedOrder?.cancelReason || job.cancelReason}
                                      </div>
                                    )}
                                    {linkedOrder?.cancelledBy && (
                                      <div className="text-[10px] text-red-600 font-medium">
                                        Cancelled by: {linkedOrder.cancelledBy}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="space-y-2 pt-1">
                                    {isAvailable && (
                                      <button
                                        onClick={() => handleAdvanceTransportJob(job, 'accepted')}
                                        className="w-full py-2.5 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition-all"
                                      >
                                        <Truck className="w-4 h-4" />
                                        <span>🚜 I'll Pick This Up (Start Route to Farm)</span>
                                      </button>
                                    )}

                                    {isAccepted && (
                                      <button
                                        onClick={() => handleAdvanceTransportJob(job, 'picked_up')}
                                        className="w-full py-2.5 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition-all"
                                      >
                                        <Package className="w-4 h-4" />
                                        <span>📦 Mark Crates Loaded at Farm Gate</span>
                                      </button>
                                    )}

                                    {isPickedUp && (
                                      <button
                                        onClick={() => handleAdvanceTransportJob(job, 'in_transit')}
                                        className="w-full py-2.5 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition-all animate-pulse"
                                      >
                                        <Truck className="w-4 h-4" />
                                        <span>🚚 Start In-Transit GPS Haul (Driving to Store)</span>
                                      </button>
                                    )}

                                    {isInTransit && (
                                      <button
                                        onClick={() => handleAdvanceTransportJob(job, 'delivered')}
                                        className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-md cursor-pointer active:scale-95 transition-all"
                                      >
                                        <CheckCircle2 className="w-4 h-4" />
                                        <span>✅ Confirm Delivery & Stock Received in Supermarket</span>
                                      </button>
                                    )}

                                    {isDelivered && (
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                          <span>Haul Completed & Stocked in Supermarket</span>
                                        </span>
                                        {matchingTx && (
                                          <button
                                            onClick={() =>
                                              setSelectedReceiptData({
                                                order: matchingTx.order,
                                                job: matchingTx.job,
                                                farmer: matchingTx.farmer,
                                                buyer: matchingTx.buyer,
                                              })
                                            }
                                            className="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-[10px] font-bold rounded-lg cursor-pointer"
                                          >
                                            Receipt
                                          </button>
                                        )}
                                      </div>
                                    )}

                                    {/* Direct Cancel Order Button on Active Hauls */}
                                    {linkedOrder && linkedOrder.status !== 'cancelled' && linkedOrder.status !== 'completed' && onUpdateOrderStatus && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setAdminOrderToCancel(linkedOrder);
                                          setAdminCancelReasonInput('');
                                        }}
                                        className="w-full py-2 px-3 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer active:scale-95 transition-all mt-1"
                                        title="Cancel this order"
                                      >
                                        <XCircle className="w-3.5 h-3.5 text-red-600" />
                                        <span>Cancel Order</span>
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  ) : (
                    /* SUB-VIEW 2: ALL ORDERS & TRANSACTIONS AUDIT LEDGER */
                    <div className="space-y-3">
                      {/* Search Bar */}
                      <div className="relative">
                        <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={transactionSearch}
                          onChange={(e) => setTransactionSearch(e.target.value)}
                          placeholder="Search transaction ID, buyer, farmer, crop..."
                          className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl pl-9 pr-3.5 py-2 text-xs text-neutral-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                        />
                      </div>

                      {/* Status Filter Chips */}
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                        <button
                          onClick={() => setTransactionStatusFilter('all')}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer ${
                            transactionStatusFilter === 'all' ? 'bg-emerald-700 text-white font-bold' : 'bg-neutral-100 text-neutral-600'
                          }`}
                        >
                          All Orders ({transactionsList.length})
                        </button>
                        <button
                          onClick={() => setTransactionStatusFilter('completed')}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer ${
                            transactionStatusFilter === 'completed' ? 'bg-emerald-700 text-white font-bold' : 'bg-neutral-100 text-neutral-600'
                          }`}
                        >
                          Completed ({transactionsList.filter((t) => t.order.status === 'completed').length})
                        </button>
                        <button
                          onClick={() => setTransactionStatusFilter('delivered')}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer ${
                            transactionStatusFilter === 'delivered' ? 'bg-emerald-700 text-white font-bold' : 'bg-neutral-100 text-neutral-600'
                          }`}
                        >
                          Delivered ({transactionsList.filter((t) => t.order.status === 'completed' || t.job?.status === 'delivered').length})
                        </button>
                        <button
                          onClick={() => setTransactionStatusFilter('in_transit')}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer ${
                            transactionStatusFilter === 'in_transit' ? 'bg-amber-600 text-white font-bold' : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          In Transit / Active
                        </button>
                        <button
                          onClick={() => setTransactionStatusFilter('cancelled')}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer ${
                            transactionStatusFilter === 'cancelled' ? 'bg-red-700 text-white font-bold' : 'bg-red-50 text-red-700 border border-red-200'
                          }`}
                        >
                          Cancelled ({transactionsList.filter((t) => t.order.status === 'cancelled').length})
                        </button>
                      </div>

                      {/* Transactions List */}
                      <div className="space-y-3">
                        {filteredTransactions.length === 0 ? (
                          <div className="bg-white border border-neutral-200 rounded-3xl p-6 text-center text-xs text-neutral-500">
                            No transactions found matching your filter.
                          </div>
                        ) : (
                          filteredTransactions.map((tx) => {
                            const isDelivered = tx.order.status === 'completed' || tx.job?.status === 'delivered';
                            const isInTransit = tx.order.status === 'in_transit' || tx.job?.status === 'in_transit';
                            const isPickedUp = tx.order.status === 'picked_up' || tx.job?.status === 'picked_up';
                            const isAccepted = tx.job?.status === 'accepted';

                            return (
                              <div
                                key={tx.order.id}
                                className="bg-white border border-neutral-200/90 rounded-3xl p-4 space-y-3 shadow-xs"
                              >
                                {/* Header: Transaction ID, Timestamp, Status */}
                                <div className="flex items-start justify-between gap-2 border-b border-neutral-100 pb-2.5">
                                  <div>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-xs font-black text-neutral-900 font-mono">
                                        TX #{tx.order.id}
                                      </span>
                                      {isDelivered ? (
                                        <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase bg-emerald-100 text-emerald-800">
                                          DELIVERED ✓
                                        </span>
                                      ) : isInTransit ? (
                                        <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase bg-amber-500 text-white animate-pulse">
                                          IN TRANSIT 🚚
                                        </span>
                                      ) : isPickedUp ? (
                                        <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase bg-amber-100 text-amber-900 animate-pulse">
                                          CRATES LOADED 📦
                                        </span>
                                      ) : isAccepted ? (
                                        <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase bg-sky-100 text-sky-800">
                                          DISPATCHED 🛵
                                        </span>
                                      ) : (
                                        <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase bg-amber-100 text-amber-800">
                                          AWAITING PICKUP ⏳
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1 text-[10px] text-neutral-500 mt-0.5">
                                      <Clock className="w-3 h-3 text-neutral-400" />
                                      <span>{tx.dateFormatted}</span>
                                    </div>
                                  </div>

                                  <div className="text-right">
                                    <span className="text-sm font-black text-emerald-700">
                                      ₱{tx.order.totalAmount.toFixed(2)}
                                    </span>
                                    <p className="text-[10px] text-neutral-500 font-medium">
                                      {tx.order.items.length} crop item{tx.order.items.length > 1 ? 's' : ''}
                                    </p>
                                  </div>
                                </div>

                                {/* Logistics Hauler & Vehicle Info */}
                                <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-2.5 space-y-1">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950">
                                      <Truck className="w-3.5 h-3.5 text-amber-700" />
                                      <span>Owner Logistics Fleet (You)</span>
                                    </div>
                                    <span className="text-[9px] font-bold bg-amber-200/70 text-amber-900 px-1.5 py-0.2 rounded font-mono">
                                      VC-OWNER-01
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-amber-900 font-medium flex items-center justify-between">
                                    <span>Store Owner / Utility Hauler</span>
                                    <span className="font-mono text-[10px] text-amber-800">Negros Route</span>
                                  </div>
                                  <div className="text-[10px] text-emerald-800 font-semibold pt-0.5 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    <span>
                                      {isDelivered
                                        ? 'Delivery Status: Delivered & Stock Received in Supermarket ✓'
                                        : isInTransit
                                        ? 'Delivery Status: On the road to destination'
                                        : isPickedUp
                                        ? 'Delivery Status: Crates loaded at farm by owner'
                                        : isAccepted
                                        ? 'Delivery Status: Owner dispatched to farm'
                                        : 'Delivery Status: Trip active - ready for owner pickup'}
                                    </span>
                                  </div>
                                </div>

                                {/* Route: Origin Farm to Destination Buyer */}
                                <div className="text-[11px] text-neutral-700 space-y-1.5 bg-neutral-50 p-2.5 rounded-2xl">
                                  <div className="flex items-start gap-1.5">
                                    <span className="text-emerald-700 font-bold flex-shrink-0">🌱 Pickup:</span>
                                    <div className="min-w-0">
                                      <strong className="text-neutral-900">{tx.order.farmName}</strong>
                                      <p className="text-[10px] text-neutral-500 truncate">{tx.order.pickupSlot || 'Farm Gate, Negros Oriental'}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-start gap-1.5">
                                    <span className="text-sky-700 font-bold flex-shrink-0">🏠 Dropoff:</span>
                                    <div className="min-w-0">
                                      <strong className="text-neutral-900">{tx.order.buyerName}</strong>
                                      <p className="text-[10px] text-neutral-500 truncate">{tx.order.deliveryAddress || 'Dumaguete Delivery Address'}</p>
                                    </div>
                                  </div>
                                </div>

                                {/* Action: Open Digital Receipt & Mark Completed */}
                                <div className="flex items-center justify-between pt-1 gap-2 flex-wrap">
                                  <div className="text-[10px] text-neutral-500">
                                    Payment: <span className="font-bold text-neutral-800">{tx.order.paymentMethod || 'Cash on Delivery (COD)'}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 ml-auto">
                                    {tx.order.status === 'cancelled' ? (
                                      <span className="text-[10px] bg-red-100 text-red-800 border border-red-300 font-bold px-2.5 py-1 rounded-xl flex items-center gap-1">
                                        <XCircle className="w-3 h-3 text-red-600" />
                                        <span>Cancelled & Restocked</span>
                                      </span>
                                    ) : (
                                      !isDelivered && onUpdateOrderStatus && (
                                        <>
                                          <button
                                            onClick={() => {
                                              setAdminOrderToCancel(tx.order);
                                              setAdminCancelReasonInput('');
                                            }}
                                            className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs cursor-pointer active:scale-95 transition-all"
                                            title="Cancel order and immediately restock inventory"
                                          >
                                            <XCircle className="w-3.5 h-3.5 text-red-600" />
                                            <span>Cancel Order</span>
                                          </button>
                                          <button
                                            onClick={() => {
                                              onUpdateOrderStatus(tx.order.id, 'completed');
                                              showToast(`Order #${tx.order.id} marked as Completed & Delivered ✓`);
                                            }}
                                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs cursor-pointer active:scale-95 transition-all"
                                            title="Mark order as completed"
                                          >
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            <span>Mark Delivered</span>
                                          </button>
                                        </>
                                      )
                                    )}
                                    <button
                                      onClick={() =>
                                        setSelectedReceiptData({
                                          order: tx.order,
                                          job: tx.job,
                                          farmer: tx.farmer,
                                          buyer: tx.buyer,
                                        })
                                      }
                                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition-all"
                                    >
                                      <Receipt className="w-3.5 h-3.5" />
                                      <span>View Receipt & Overview</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 6: XAMPP MYSQL DATABASE (veggie_connect2) */}
              {adminTab === 'database' && (
                <div className="space-y-3">
                  {/* Database Header Card */}
                  <div className="bg-gradient-to-r from-emerald-900 to-teal-900 text-white rounded-3xl p-4 space-y-2.5 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-emerald-700/80 flex items-center justify-center text-white shadow-xs">
                          <Database className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-sm text-white">XAMPP MySQL Database</h3>
                          <p className="text-[10px] text-emerald-200 font-mono font-bold">veggie_connect2</p>
                        </div>
                      </div>
                      <span className="text-[9px] font-mono font-bold bg-emerald-800 text-emerald-200 px-2 py-0.5 rounded-full border border-emerald-700">
                        MySQL / MariaDB
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-100/90 leading-relaxed bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-800/60">
                      Standardized relational schema for XAMPP (Apache + MySQL/phpMyAdmin). Direct seller supermarket architecture with buy-and-stock inventory, segregated farmer/buyer privacy, and DA Bantay Presyo reference data.
                    </p>
                  </div>

                  {/* Connection Details Pill */}
                  <div className="bg-white border border-neutral-200 rounded-2xl p-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-neutral-500 font-medium">Database Name:</span>
                      <span className="font-mono font-bold text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        veggie_connect2
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-neutral-500 font-medium">Host / Port:</span>
                      <span className="font-mono font-semibold text-neutral-800">localhost:3306 (127.0.0.1)</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-neutral-500 font-medium">Default User:</span>
                      <span className="font-mono font-semibold text-neutral-800">root (password: blank)</span>
                    </div>
                  </div>

                  {/* 1-Click Action Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleCopySql}
                      className={`min-h-[44px] py-2.5 px-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95 ${
                        copiedSql
                          ? 'bg-emerald-700 text-white'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                    >
                      {copiedSql ? (
                        <>
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>Copied SQL!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copy SQL Script</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleDownloadSql}
                      className="min-h-[44px] py-2.5 px-3 rounded-2xl bg-white hover:bg-neutral-50 text-neutral-800 font-bold text-xs border border-neutral-300 flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
                    >
                      <Download className="w-4 h-4 text-emerald-700" />
                      <span>Download .sql</span>
                    </button>
                  </div>

                  {/* Step-by-Step XAMPP phpMyAdmin Guide */}
                  <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3.5 space-y-2 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-950">
                      <Server className="w-4 h-4 text-emerald-700" />
                      <span>How to Import in XAMPP phpMyAdmin</span>
                    </div>
                    <ol className="list-decimal list-inside space-y-1 text-[11px] text-emerald-900 font-medium leading-relaxed">
                      <li>Open XAMPP Control Panel and click <strong>Start</strong> next to <strong>Apache</strong> and <strong>MySQL</strong>.</li>
                      <li>Open your web browser and go to <strong className="font-mono text-emerald-800">http://localhost/phpmyadmin</strong>.</li>
                      <li>Click the <strong>Import</strong> tab at top, select <strong className="font-mono">veggie_connect2.sql</strong> (or paste the copied SQL into the <strong>SQL</strong> tab), and click <strong>Go</strong>.</li>
                    </ol>
                  </div>

                  {/* Interactive SQL Preview Box */}
                  <div className="bg-neutral-900 text-neutral-100 rounded-2xl p-3.5 space-y-2 border border-neutral-800">
                    <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                      <div className="flex items-center gap-1.5 text-xs text-neutral-300 font-mono">
                        <Code2 className="w-4 h-4 text-emerald-400" />
                        <span>veggie_connect2.sql Preview</span>
                      </div>
                      <span className="text-[10px] text-neutral-400 font-mono">UTF-8 / InnoDB</span>
                    </div>
                    <pre className="text-[10px] font-mono leading-relaxed overflow-x-auto max-h-56 p-2 bg-neutral-950 rounded-xl text-emerald-300 select-all scrollbar-none">
                      {generateVeggieConnect2Sql(registeredUsers, produceList, orders, transportJobs)}
                    </pre>
                  </div>
                </div>
              )}

              {/* TAB 7: ADMIN PROFILE — account card + supermarket location pinned on Google Maps */}
              {adminTab === 'profile' && (
                <div className="space-y-3">
                  {/* Admin Identity Card */}
                  <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white rounded-3xl p-4 space-y-3 shadow-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center text-white shadow-xs flex-shrink-0">
                        <User className="w-6 h-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-extrabold text-sm text-white truncate">
                          {currentUser?.name || 'DA Regional Administrator'}
                        </h3>
                        <p className="text-[10px] text-emerald-200 truncate">
                          {currentUser?.email || 'admin@gmail.com'}
                        </p>
                      </div>
                      <span className="text-[9px] font-black bg-emerald-500 text-white px-2 py-0.5 rounded-full flex-shrink-0">
                        ADMIN
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-xl p-2">
                        <p className="text-emerald-300 font-bold uppercase tracking-wider">Phone</p>
                        <p className="font-mono font-bold text-white">{currentUser?.phone || '0900 000 0000'}</p>
                      </div>
                      <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-xl p-2">
                        <p className="text-emerald-300 font-bold uppercase tracking-wider">Account</p>
                        <p className="font-bold text-white">
                          {currentUser?.verified ? 'Verified' : 'Unverified'} • {currentUser?.status || 'active'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Supermarket Location Form with Google Map Pin */}
                  <form onSubmit={handleSaveSupermarket} className="bg-white border border-neutral-200 rounded-3xl p-3.5 space-y-3 shadow-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                        <Store className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-sm text-neutral-900">Supermarket Location</h3>
                        <p className="text-[10px] text-neutral-500">Set your store address and pinpoint it on the map</p>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-neutral-700 flex items-center gap-1">
                        <Store className="w-3.5 h-3.5 text-emerald-700" /> Supermarket Name
                      </label>
                      <input
                        type="text"
                        value={supermarket.storeName}
                        onChange={(e) => { setSupermarketDirty(true); setSupermarket((prev) => ({ ...prev, storeName: e.target.value })); }}
                        placeholder="e.g. VeggieConnect Central Supermarket Hub"
                        className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2.5 text-xs font-semibold text-neutral-900 focus:bg-white focus:outline-none focus:border-emerald-600"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-neutral-700 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-emerald-700" /> Store Address
                        </span>
                        <span className="text-[9px] font-mono text-neutral-500">
                          {supermarket.latitude.toFixed(4)}° N, {supermarket.longitude.toFixed(4)}° E
                        </span>
                      </label>
                      <input
                        type="text"
                        value={supermarket.address}
                        onChange={(e) => { setSupermarketDirty(true); setSupermarket((prev) => ({ ...prev, address: e.target.value })); }}
                        placeholder="Barangay, City, Negros Oriental"
                        className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2.5 text-xs font-semibold text-neutral-900 focus:bg-white focus:outline-none focus:border-emerald-600"
                      />
                    </div>

                    {/* Google Map: tap to drop the pin, drag the marker to fine-tune */}
                    <div className="relative w-full h-60 rounded-2xl overflow-hidden border border-neutral-300 bg-neutral-100">
                      <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
                        <Map
                          mapId="DEMO_MAP_ID"
                          defaultCenter={{ lat: supermarket.latitude, lng: supermarket.longitude }}
                          defaultZoom={16}
                          mapTypeId={profileMapType}
                          gestureHandling="greedy"
                          disableDefaultUI={false}
                          zoomControl={true}
                          mapTypeControl={false}
                          streetViewControl={false}
                          fullscreenControl={false}
                          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                          onClick={(e) => {
                            if (e.detail.latLng) {
                              handlePinSupermarket(e.detail.latLng.lat, e.detail.latLng.lng);
                            }
                          }}
                          className="w-full h-full"
                        >
                          <ProfileMapCamera target={profileCameraTarget} />
                          <AdvancedMarker
                            position={{ lat: supermarket.latitude, lng: supermarket.longitude }}
                            draggable={true}
                            onDragEnd={(e) => {
                              if (e.latLng) handlePinSupermarket(e.latLng.lat(), e.latLng.lng());
                            }}
                            title="Supermarket pin (drag to adjust)"
                          >
                            <div className="relative flex flex-col items-center group cursor-grab active:cursor-grabbing transform -translate-y-3 select-none">
                              <div className="w-10 h-10 rounded-2xl bg-emerald-600 border-2 border-white shadow-2xl flex items-center justify-center text-white text-lg transition-transform group-hover:scale-110">
                                🏪
                              </div>
                              <div className="w-4 h-2 bg-black/40 rounded-full blur-xs mt-0.5" />
                            </div>
                          </AdvancedMarker>
                        </Map>
                      </APIProvider>

                      {/* Floating map controls */}
                      <div className="absolute right-3 top-3 z-20 flex flex-col gap-1.5">
                        <button
                          type="button"
                          onClick={() => setProfileMapType((t) => (t === 'roadmap' ? 'hybrid' : 'roadmap'))}
                          className="w-9 h-9 rounded-xl bg-white/95 hover:bg-emerald-50 text-neutral-800 flex items-center justify-center transition-all active:scale-90 cursor-pointer shadow-2xs border border-neutral-200"
                          title="Toggle satellite / street map"
                        >
                          <Layers className="w-4 h-4 text-emerald-700" />
                        </button>
                        <button
                          type="button"
                          onClick={handleUseGpsForSupermarket}
                          className="w-9 h-9 rounded-xl bg-white/95 hover:bg-emerald-50 text-neutral-800 flex items-center justify-center transition-all active:scale-90 cursor-pointer shadow-2xs border border-neutral-200"
                          title="Pin my current GPS location"
                        >
                          <Navigation className={`w-4 h-4 text-emerald-700 ${isLocating ? 'animate-spin' : ''}`} />
                        </button>
                      </div>

                      <div className="absolute top-3 left-3 z-20 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-xl border border-neutral-200 text-[10px] font-bold text-neutral-800 shadow-sm pointer-events-none">
                        Tap map to pin • Drag 🏪 to adjust
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full min-h-[44px] py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-emerald-600/20 active:scale-95"
                    >
                      <Save className="w-4 h-4" />
                      <span>Save Supermarket Location</span>
                    </button>
                  </form>

                  {/* SQL Database module — moved out of the bottom navigation, deep-linked at /sql */}
                  <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-neutral-900 text-emerald-400 flex items-center justify-center flex-shrink-0">
                        <Database className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-neutral-900">SQL Database Module</p>
                        <p className="text-[10px] text-neutral-500 font-mono truncate">localhost:3000/sql</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAdminTab('database')}
                      className="px-3 py-2 rounded-xl bg-neutral-900 hover:bg-black text-white text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer active:scale-95 flex-shrink-0"
                    >
                      <span>Open</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile Navigation Bottom Bar for Admin App (Overview, Bantay Presyo, Users, Crops, Transactions, Profile — SQL DB lives at /sql) */}
        {isAdminAuthenticated && (
          <nav className="flex-shrink-0 z-40 bg-white/95 backdrop-blur-xl border-t border-neutral-200/80 px-1 py-2 shadow-lg">
            <div className="flex items-center justify-around">
              <button
                onClick={() => setAdminTab('overview')}
                className={`flex flex-col items-center justify-center min-h-[48px] min-w-[48px] py-1 px-1 rounded-2xl transition-all cursor-pointer active:scale-95 ${
                  adminTab === 'overview'
                    ? 'bg-emerald-100 text-emerald-900 font-bold shadow-xs'
                    : 'text-neutral-500 hover:text-emerald-800 font-medium'
                }`}
              >
                <TrendingUp className="w-4 h-4 mb-0.5" />
                <span className="text-[8px]">Overview</span>
              </button>

              <button
                onClick={() => setAdminTab('prices')}
                className={`flex flex-col items-center justify-center min-h-[48px] min-w-[48px] py-1 px-1 rounded-2xl transition-all cursor-pointer active:scale-95 ${
                  adminTab === 'prices'
                    ? 'bg-emerald-100 text-emerald-900 font-bold shadow-xs'
                    : 'text-neutral-500 hover:text-emerald-800 font-medium'
                }`}
              >
                <Scale className="w-4 h-4 mb-0.5" />
                <span className="text-[8px]">DA Prices</span>
              </button>

              <button
                onClick={() => setAdminTab('users')}
                className={`flex flex-col items-center justify-center min-h-[48px] min-w-[48px] py-1 px-1 rounded-2xl transition-all cursor-pointer active:scale-95 relative ${
                  adminTab === 'users'
                    ? 'bg-emerald-100 text-emerald-900 font-bold shadow-xs'
                    : 'text-neutral-500 hover:text-emerald-800 font-medium'
                }`}
              >
                <Users className="w-4 h-4 mb-0.5" />
                <span className="text-[8px]">Users</span>
              </button>

              <button
                id="admin-nav-produce"
                onClick={() => setAdminTab('produce')}
                className={`flex flex-col items-center justify-center min-h-[48px] min-w-[42px] py-1 px-1 rounded-2xl transition-all cursor-pointer active:scale-95 ${
                  adminTab === 'produce'
                    ? 'bg-emerald-100 text-emerald-900 font-bold shadow-xs'
                    : 'text-neutral-500 hover:text-emerald-800 font-medium'
                }`}
              >
                <Sprout className="w-4 h-4 mb-0.5" />
                <span className="text-[8px]">Crops</span>
              </button>

              <button
                id="admin-nav-stocks"
                onClick={() => setAdminTab('stocks')}
                className={`flex flex-col items-center justify-center min-h-[48px] min-w-[42px] py-1 px-1 rounded-2xl transition-all cursor-pointer active:scale-95 relative ${
                  adminTab === 'stocks'
                    ? 'bg-emerald-100 text-emerald-900 font-bold shadow-xs'
                    : 'text-neutral-500 hover:text-emerald-800 font-medium'
                }`}
              >
                {unstockedBoughtCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 bg-amber-600 text-white text-[8px] font-black rounded-full w-3.5 h-3.5 flex items-center justify-center shadow-2xs">
                    {unstockedBoughtCount}
                  </span>
                )}
                <Boxes className="w-4 h-4 mb-0.5" />
                <span className="text-[8px]">Stocks</span>
              </button>

              <button
                id="admin-nav-orders"
                onClick={() => setAdminTab('transactions')}
                className={`flex flex-col items-center justify-center min-h-[48px] min-w-[42px] py-1 px-1 rounded-2xl transition-all cursor-pointer active:scale-95 ${
                  adminTab === 'transactions'
                    ? 'bg-emerald-100 text-emerald-900 font-bold shadow-xs'
                    : 'text-neutral-500 hover:text-emerald-800 font-medium'
                }`}
              >
                <FileText className="w-4 h-4 mb-0.5" />
                <span className="text-[8px]">Orders</span>
              </button>

              <button
                id="admin-nav-profile"
                onClick={() => setAdminTab('profile')}
                className={`flex flex-col items-center justify-center min-h-[48px] min-w-[48px] py-1 px-1 rounded-2xl transition-all cursor-pointer active:scale-95 ${
                  adminTab === 'profile'
                    ? 'bg-emerald-100 text-emerald-900 font-bold shadow-xs'
                    : 'text-neutral-500 hover:text-emerald-800 font-medium'
                }`}
              >
                <User className="w-4 h-4 mb-0.5" />
                <span className="text-[8px]">Profile</span>
              </button>
            </div>
          </nav>
        )}
      </div>

      {/* ADMIN ORDER CANCELLATION MODAL */}
      {adminOrderToCancel && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full max-h-[92%] overflow-y-auto p-5 space-y-4 shadow-2xl border border-red-200 text-neutral-900 relative">
            <button
              onClick={() => {
                setAdminOrderToCancel(null);
                setAdminCancelReasonInput('');
              }}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-neutral-100 text-neutral-600 flex items-center justify-center hover:bg-neutral-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5 text-red-700">
              <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div className="min-w-0">
                <h3 className="font-extrabold text-sm text-neutral-900">Admin Cancel Order</h3>
                <p className="text-[11px] text-neutral-500 font-mono">Order ID: {adminOrderToCancel.id}</p>
              </div>
            </div>

            {/* Restock Breakdown */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 space-y-2 text-xs">
              <div className="space-y-1">
                {adminOrderToCancel.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[11px] text-emerald-950">
                    <span className="font-medium truncate mr-2">• {item.produceName}</span>
                    <span className="font-bold text-emerald-700 shrink-0">+{item.quantity} kg</span>
                  </div>
                ))}
              </div>
              <div className="pt-1.5 text-right text-[11px] font-black text-emerald-950 border-t border-emerald-200/60">
                Total Restock: +{adminOrderToCancel.items.reduce((s, it) => s + (it.quantity || 0), 0)} kg
              </div>
            </div>

            {/* Direct Input Reason (No multiple choice) */}
            <div className="space-y-1.5 text-xs">
              <label className="font-bold text-neutral-800 block">
                Reason for Cancellation:
              </label>
              <textarea
                rows={3}
                placeholder="Type the cancellation reason here (e.g., customer request, address adjustment, logistics delay)..."
                value={adminCancelReasonInput}
                onChange={(e) => setAdminCancelReasonInput(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-red-500 bg-neutral-50 focus:bg-white resize-none"
              />
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-2 border-t border-neutral-200">
              <button
                onClick={() => {
                  const finalReason = adminCancelReasonInput.trim() || 'Cancelled by Store Administrator';
                  if (onUpdateOrderStatus) {
                    onUpdateOrderStatus(adminOrderToCancel.id, 'cancelled', finalReason, 'Admin Broker Desk');
                  }
                  showToast(`Order #${adminOrderToCancel.id} cancelled. Stock restored.`);
                  setAdminOrderToCancel(null);
                  setAdminCancelReasonInput('');
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-95 transition-all"
              >
                <XCircle className="w-4 h-4" />
                <span>Confirm Cancelation of Order</span>
              </button>

              <button
                onClick={() => {
                  setAdminOrderToCancel(null);
                  setAdminCancelReasonInput('');
                }}
                className="w-full py-2 px-4 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs text-center cursor-pointer transition-colors"
              >
                Keep Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OFFICIAL TRANSACTION RECEIPT & OVERVIEW MODAL */}
      {selectedReceiptData && selectedReceiptData.order && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-3xl max-w-sm w-full max-h-[92%] overflow-y-auto shadow-2xl border border-emerald-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Receipt Header */}
            <div className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white p-4 rounded-t-3xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center text-white">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-xs">Official Transaction Receipt</h3>
                  <p className="text-[10px] text-emerald-200">VeggieConnect • Negros Oriental</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedReceiptData(null)}
                className="p-1 rounded-full hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Receipt Slip Body */}
            <div className="p-4 space-y-3.5 text-xs text-neutral-800">
              {/* Receipt Number & Date */}
              <div className="flex items-center justify-between border-b border-dashed border-neutral-300 pb-2">
                <div>
                  <span className="text-[10px] text-neutral-400 font-mono">RECEIPT NO.</span>
                  <p className="font-bold font-mono text-xs text-neutral-900">
                    REC-2026-{selectedReceiptData.order.id}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-neutral-400 font-mono">TIMESTAMP</span>
                  <p className="font-bold text-[11px] text-neutral-900">
                    {new Date(selectedReceiptData.order.createdAt || Date.now()).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                    })}
                  </p>
                </div>
              </div>

              {/* Delivery Driver & Time Overview OR Direct Procurement Overview */}
              {selectedReceiptData.order.deliveryType === 'farm_pickup' || selectedReceiptData.order.id.startsWith('TX-ADM-') || selectedReceiptData.order.paymentMethod?.includes('Farmgate') ? (
                <div className="bg-emerald-50/90 border border-emerald-200 rounded-2xl p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1">
                      <Store className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Procured By (Supermarket Buy Desk)</span>
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-emerald-200 text-emerald-950 px-1.5 py-0.2 rounded">
                      SETTLED
                    </span>
                  </div>
                  <div className="text-xs font-extrabold text-neutral-900">
                    {selectedReceiptData.order.buyerName || 'VeggieConnect Supermarket (Admin Desk)'}
                  </div>
                  <div className="text-[11px] text-neutral-600 flex items-center justify-between">
                    <span>Handover: <strong className="text-neutral-800">Direct Farmgate Payout</strong></span>
                    <span className="font-mono text-[10px]">{selectedReceiptData.order.buyerPhone || '0900 000 0000'}</span>
                  </div>
                  <div className="text-[11px] text-emerald-800 font-bold pt-1 border-t border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Payment Status: Direct Farmgate Cash Payout Settled ✓</span>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5 text-amber-700" />
                      <span>Delivered By (Owner Logistics)</span>
                    </span>
                  </div>
                  <div className="text-xs font-extrabold text-neutral-900">
                    {selectedReceiptData.job?.assignedTransporterName || selectedReceiptData.order.transporterName || 'Owner Logistics (You)'}
                  </div>
                  <div className="text-[11px] text-neutral-600 flex items-center justify-between">
                    <span>Vehicle: <strong className="text-neutral-800">{selectedReceiptData.order.vehicleType || 'Owner Utility Cargo Hauler'}</strong></span>
                    <span className="font-mono text-[10px]">{selectedReceiptData.job?.assignedTransporterPhone || selectedReceiptData.order.transporterPhone || '0900 000 0000'}</span>
                  </div>
                  <div className="text-[11px] text-emerald-800 font-bold pt-1 border-t border-amber-200 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-emerald-600" />
                    <span>
                      Delivery Time:{' '}
                      {selectedReceiptData.order.status === 'completed'
                        ? 'Delivered & Completed ✓'
                        : 'In Transit / Dispatched'}
                    </span>
                  </div>
                </div>
              )}

              {/* Origin & Recipient */}
              <div className="space-y-2 bg-neutral-50 p-3 rounded-2xl border border-neutral-200 text-[11px]">
                <div>
                  <span className="text-[10px] text-emerald-800 font-bold">SOURCE FARM (SELLER):</span>
                  <p className="font-bold text-neutral-900">{selectedReceiptData.order.farmName}</p>
                  <p className="text-neutral-500 text-[10px]">{selectedReceiptData.order.pickupSlot || 'Valencia Highlands'}</p>
                </div>
                <div className="pt-1.5 border-t border-neutral-200">
                  <span className="text-[10px] text-sky-800 font-bold">BUYER (RECIPIENT):</span>
                  <p className="font-bold text-neutral-900">{selectedReceiptData.order.buyerName}</p>
                  <p className="text-neutral-500 text-[10px]">{selectedReceiptData.order.deliveryAddress}</p>
                </div>
              </div>

              {/* Itemized Produce List */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                  Cargo Breakdown
                </span>
                <div className="border border-neutral-200 rounded-2xl overflow-hidden divide-y divide-neutral-100">
                  {selectedReceiptData.order.items.map((item, idx) => {
                    const price = item.pricePerUnit ?? item.unitPrice ?? 0;
                    return (
                      <div key={idx} className="p-2.5 flex items-center justify-between text-[11px] bg-white">
                        <div>
                          <p className="font-bold text-neutral-900">{item.produceName}</p>
                          <p className="text-[10px] text-neutral-500">
                            {item.quantity} {item.unit}s @ ₱{price}/{item.unit}
                          </p>
                        </div>
                        <span className="font-bold text-neutral-900">
                          ₱{(item.quantity * price).toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Financial Calculation */}
              <div className="space-y-1 pt-1 text-xs border-t border-dashed border-neutral-300">
                <div className="flex justify-between text-neutral-600">
                  <span>Produce Subtotal</span>
                  <span>
                    ₱
                    {selectedReceiptData.order.items
                      .reduce((sum, it) => sum + it.quantity * (it.pricePerUnit ?? it.unitPrice ?? 0), 0)
                      .toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>Delivery Fee</span>
                  <span>₱{(selectedReceiptData.order.deliveryFee || 50).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-black text-emerald-950 pt-1 border-t border-neutral-200">
                  <span>Total Amount Paid</span>
                  <span className="text-emerald-700">₱{selectedReceiptData.order.totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[10px] text-neutral-500 pt-0.5">
                  <span>Payment Method:</span>
                  <span className="font-bold text-neutral-700">
                    {selectedReceiptData.order.paymentMethod || 'Cash on Delivery (COD)'}
                  </span>
                </div>
              </div>

              {/* Official Seal / Verification Stamp */}
              <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-0.5">
                <div className="flex items-center justify-center gap-1 text-emerald-800 font-extrabold text-[11px]">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>DA VERIFIED TRANSACTION</span>
                </div>
                <p className="text-[9px] text-emerald-700">Official proof of direct farm-to-door delivery</p>
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-1">
                {selectedReceiptData.order.status !== 'completed' && onUpdateOrderStatus && (
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedReceiptData.order) {
                        onUpdateOrderStatus(selectedReceiptData.order.id, 'completed');
                        setSelectedReceiptData({
                          ...selectedReceiptData,
                          order: { ...selectedReceiptData.order, status: 'completed' },
                        });
                        showToast(`Order #${selectedReceiptData.order.id} marked as Completed ✓`);
                      }
                    }}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                    <span>Mark Order as Completed ✓</span>
                  </button>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      window.print();
                    }}
                    className="flex-1 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Receipt</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedReceiptData(null)}
                    className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-900 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-3 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-2">
              <div>
                <h3 className="font-bold text-sm text-neutral-900">Edit Profile: {editingUser.name}</h3>
                <span className="text-[10px] text-emerald-700 font-bold uppercase">{editingUser.role} Account</span>
              </div>
              <button onClick={() => setEditingUser(null)} className="p-1 rounded-full hover:bg-neutral-100 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveUserEdit} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase text-neutral-500">Full Name</label>
                <input
                  type="text"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full border rounded-xl p-2 text-xs text-neutral-900 bg-neutral-50 focus:bg-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-neutral-500">Phone</label>
                <input
                  type="text"
                  value={editingUser.phone}
                  onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                  className="w-full border rounded-xl p-2 text-xs text-neutral-900 bg-neutral-50 focus:bg-white font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-neutral-500">Location / Barangay</label>
                <input
                  type="text"
                  value={editingUser.location}
                  onChange={(e) => setEditingUser({ ...editingUser, location: e.target.value })}
                  className="w-full border rounded-xl p-2 text-xs text-neutral-900 bg-neutral-50 focus:bg-white"
                />
              </div>

              {/* Status and Verification Toggles */}
              <div className="pt-2 border-t flex items-center justify-between text-xs">
                <span className="font-bold text-neutral-700">Verified Member</span>
                <input
                  type="checkbox"
                  checked={Boolean(editingUser.verified)}
                  onChange={(e) => setEditingUser({ ...editingUser, verified: e.target.checked })}
                  className="w-4 h-4 accent-emerald-600 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-neutral-700">Account Status</span>
                <select
                  value={editingUser.status || 'active'}
                  onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value as any })}
                  className="bg-neutral-50 border border-neutral-300 rounded-lg p-1 text-xs font-bold"
                >
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-sm cursor-pointer"
              >
                Save Profile & Vehicle Updates
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Buy Produce from Farmer Modal (shelving happens later via Put in Stock) */}
      {buyingProduceItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-3.5 shadow-2xl border border-emerald-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-emerald-100 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-800">
                  <ShoppingBag className="w-4 h-4 text-emerald-700" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-neutral-900">Buy Produce</h3>
                  <p className="text-[10px] text-emerald-700">Procure from farmer — shelve it after purchase / delivery</p>
                </div>
              </div>
              <button
                onClick={() => setBuyingProduceItem(null)}
                className="p-1 rounded-full hover:bg-neutral-100 text-neutral-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-emerald-50/70 p-3 rounded-2xl border border-emerald-200 text-xs space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="font-bold text-emerald-950 text-sm">{buyingProduceItem.name}</span>
                <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">
                  Farmer: {buyingProduceItem.farmerName}
                </span>
              </div>
              <p className="text-[11px] text-neutral-600">Origin: {buyingProduceItem.location}</p>
              <div className="pt-1 flex justify-between text-[11px] border-t border-emerald-200/70 text-emerald-900">
                <span>Farmer Asking Price:</span>
                <strong className="text-amber-800 font-black">
                  ₱{(buyingProduceItem.farmgateAskingPrice || buyingProduceItem.pricePerUnit).toFixed(2)}/kg
                </strong>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-neutral-800 block mb-1">
                  Quantity to Buy (kg)
                </label>
                <input
                  type="number"
                  min="1"
                  max={buyingProduceItem.stockQuantity}
                  value={buyQty}
                  onChange={(e) => setBuyQty(Math.max(1, Math.min(buyingProduceItem.stockQuantity, parseInt(e.target.value, 10) || 1)))}
                  className={`w-full border rounded-xl p-2.5 text-xs text-neutral-900 font-bold focus:outline-none ${
                    buyQty > buyingProduceItem.stockQuantity
                      ? 'border-red-500 focus:border-red-500 bg-red-50'
                      : 'border-neutral-300 focus:border-emerald-600'
                  }`}
                />
                <span className="text-[10px] text-neutral-500 mt-0.5 block">
                  Farmer submitted {buyingProduceItem.stockQuantity} kg available
                </span>
                {buyQty > buyingProduceItem.stockQuantity && (
                  <p className="text-[11px] text-red-600 font-bold mt-1">
                    ⚠️ Exceeds available stock! You can only buy up to {buyingProduceItem.stockQuantity} kg.
                  </p>
                )}
              </div>

              {/* Total Farmer Payout Summary */}
              <div className="bg-neutral-100 p-3 rounded-2xl flex items-center justify-between text-xs">
                <div>
                  <span className="text-neutral-500 text-[10px] block uppercase font-bold">Total Farmer Payout</span>
                  <span className="font-extrabold text-neutral-900">
                    ₱{((buyingProduceItem.farmgateAskingPrice || buyingProduceItem.pricePerUnit) * buyQty).toFixed(2)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-neutral-500 text-[10px] block uppercase font-bold">Added to Owned / Bought</span>
                  <span className="font-extrabold text-emerald-700">+{buyQty} kg</span>
                </div>
              </div>
              <p className="text-[10px] text-neutral-500 leading-relaxed">
                The product goes to Owned / Bought after purchase. Set the resale price when you put it in
                Supermarket Stock.
              </p>

              <button
                type="button"
                onClick={() => {
                  // Guard: never buy more than the farmer has available
                  const available = buyingProduceItem.stockQuantity || 0;
                  const qty = Math.max(1, buyQty || available || 1);
                  if (qty > available) {
                    showToast(`⚠️ Cannot buy ${qty} kg — only ${available} kg available from ${buyingProduceItem.farmerName}.`);
                    return;
                  }
                  const askingPrice = buyingProduceItem.farmgateAskingPrice || buyingProduceItem.pricePerUnit;

                  if (onBuyFarmerProduct) {
                    onBuyFarmerProduct(buyingProduceItem, qty);
                  } else {
                    // Fail-safe direct order & produce creation
                    const totalPayout = askingPrice * qty;
                    const txId = `TX-ADM-${Date.now().toString().slice(-4)}`;
                    const fallbackOrder: Order = {
                      id: txId,
                      buyerId: currentUser?.id || 'admin-main',
                      buyerName: currentUser?.name ? `${currentUser.name} (Admin Desk)` : 'VeggieConnect Supermarket (Admin Desk)',
                      buyerPhone: currentUser?.phone || '0900 000 0000',
                      farmerId: buyingProduceItem.farmerId,
                      farmName: buyingProduceItem.farmName,
                      farmerPhone: '0917 123 4567',
                      sellerStoreName: 'VeggieConnect Supermarket',
                      brokerHubName: 'VeggieConnect Supermarket',
                      farmgateCostTotal: totalPayout,
                      sellerMargin: 0,
                      items: [
                        {
                          produceId: buyingProduceItem.id,
                          produceName: buyingProduceItem.name,
                          unit: buyingProduceItem.unit || 'kg',
                          quantity: qty,
                          unitPrice: askingPrice,
                          pricePerUnit: askingPrice,
                          farmerId: buyingProduceItem.farmerId,
                          farmerName: buyingProduceItem.farmerName,
                          farmName: buyingProduceItem.farmName,
                          imageUrl: buyingProduceItem.imageUrl,
                        },
                      ],
                      deliveryType: 'direct_delivery',
                      deliveryAddress: 'VeggieConnect Central Produce Hub, Dumaguete City Proper',
                      pickupSlot: `Farmgate Haul from ${buyingProduceItem.farmName} (${buyingProduceItem.location || 'Negros Oriental'})`,
                      subtotal: totalPayout,
                      deliveryFee: Math.max(60, Math.round(qty * 2.5)),
                      totalAmount: totalPayout + Math.max(60, Math.round(qty * 2.5)),
                      paymentMethod: 'Direct Farmgate Cash Payout',
                      status: 'pending', // Order placed — 'Confirmed' lights up only after the owner starts the pickup route.
                      notes: `Admin procurement: ${qty} ${buyingProduceItem.unit || 'kg'} of ${buyingProduceItem.name}. Haul job posted — awaiting owner pickup route.`,
                      createdAt: new Date().toISOString(),
                    };

                    const fallbackJob: TransportJob = {
                      id: `TJ-${Date.now().toString().slice(-4)}`,
                      orderId: txId,
                      pickupFarm: buyingProduceItem.farmName,
                      pickupLocation: buyingProduceItem.location || `${buyingProduceItem.farmName}, Negros Oriental`,
                      dropoffLocation: 'VeggieConnect Central Produce Hub, Dumaguete City Proper',
                      buyerName: 'VeggieConnect Supermarket',
                      buyerPhone: currentUser?.phone || '0900 000 0000',
                      itemsSummary: `${qty} ${buyingProduceItem.unit || 'kg'} ${buyingProduceItem.name} (Farm-to-Store Haul)`,
                      weightKgEst: qty,
                      earningsPeso: Math.max(60, Math.round(qty * 2.5)),
                      status: 'available',
                      createdAt: 'Just now',
                    };

                    try {
                      const savedOrders = JSON.parse(localStorage.getItem('veggieconnect_v9_clean_orders') || '[]');
                      localStorage.setItem('veggieconnect_v9_clean_orders', JSON.stringify([fallbackOrder, ...savedOrders]));
                      const savedJobs = JSON.parse(localStorage.getItem('veggieconnect_v9_clean_jobs') || '[]');
                      localStorage.setItem('veggieconnect_v9_clean_jobs', JSON.stringify([fallbackJob, ...savedJobs]));
                    } catch (e) {}

                    fetch('/api/orders', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(fallbackOrder),
                    }).catch((e) => console.log('Order sync notice:', e));

                    fetch('/api/transport-jobs', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(fallbackJob),
                    }).catch((e) => console.log('Job sync notice:', e));
                  }

                  showToast(`Bought ${qty}kg of ${buyingProduceItem.name}! Added to Bought Products & delivery job posted.`);
                  setBuyingProduceItem(null);
                  setAdminTab('stocks');
                  setStocksSubTab('owned_bought');
                }}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl text-xs shadow-md cursor-pointer flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm Purchase (Add to Owned Stock)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Produce Modal */}
      {editingProduceItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-3 shadow-xl">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-sm text-neutral-900">Edit Crop: {editingProduceItem.name}</h3>
              <button onClick={() => setEditingProduceItem(null)} className="p-1 rounded-full hover:bg-neutral-100 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* DA Price Recommendation (matched to this crop) */}
            {(() => {
              const daMatch = findMatchingDAPrice(editingProduceItem.name);
              if (!daMatch) return null;
              const TrendIcon =
                daMatch.trend === 'up' ? TrendingUp : daMatch.trend === 'down' ? TrendingDown : Minus;
              const trendColor =
                daMatch.trend === 'up'
                  ? 'text-emerald-700'
                  : daMatch.trend === 'down'
                  ? 'text-rose-600'
                  : 'text-neutral-500';
              const diff = editingProduceItem.pricePerUnit - daMatch.suggestedDirectFarmPrice;
              return (
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-black uppercase text-emerald-800 flex items-center gap-1">
                      <Sprout className="w-3.5 h-3.5 text-emerald-600" />
                      DA Price Recommendation
                    </span>
                    <span className={`text-[10px] font-bold flex items-center gap-0.5 ${trendColor}`}>
                      <TrendIcon className="w-3 h-3" />
                      {daMatch.trend === 'up' ? 'Rising' : daMatch.trend === 'down' ? 'Falling' : 'Stable'}
                      {daMatch.changePercent !== 0 ? ` ${Math.abs(daMatch.changePercent)}%` : ''}
                    </span>
                  </div>
                  <p className="text-[10px] text-emerald-900/70 font-semibold -mt-1">
                    {daMatch.commodity} • {daMatch.updatedDate} • {daMatch.source}
                  </p>
                  <div className="grid grid-cols-2 gap-1.5 text-center">
                    <div className="bg-white rounded-xl py-1.5 border border-emerald-200">
                      <span className="text-[9px] uppercase font-bold text-neutral-500 block">DA Suggested</span>
                      <span className="text-xs font-black text-emerald-700">₱{daMatch.suggestedDirectFarmPrice}</span>
                    </div>
                    <div className="bg-white rounded-xl py-1.5 border border-emerald-200">
                      <span className="text-[9px] uppercase font-bold text-neutral-500 block">Wet Market</span>
                      <span className="text-xs font-black text-neutral-800">₱{daMatch.prevailingRetailPrice}</span>
                    </div>
                  </div>
                  {Math.abs(diff) > 1 ? (
                    <div className="flex items-center justify-between gap-2 text-[10px]">
                      <span className="text-neutral-600">
                        Your price is{' '}
                        <strong className={diff > 0 ? 'text-emerald-700' : 'text-rose-600'}>
                          {diff > 0 ? '+' : '-'}₱{Math.abs(diff).toFixed(2)}
                        </strong>{' '}
                        vs DA suggested
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setEditingProduceItem({
                            ...editingProduceItem,
                            pricePerUnit: daMatch.suggestedDirectFarmPrice,
                          })
                        }
                        className="px-2 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center gap-1 shadow-xs active:scale-95 transition-all cursor-pointer flex-shrink-0"
                        title="Align shelf price with DA AMAS suggested price"
                      >
                        Use DA ₱{daMatch.suggestedDirectFarmPrice}
                      </button>
                    </div>
                  ) : (
                    <p className="text-[10px] text-emerald-700 font-bold text-center">
                      ✓ Your price matches the DA suggested rate
                    </p>
                  )}
                </div>
              );
            })()}

            {(() => {
              const isSm =
                editingProduceItem.sellerStoreName === 'VeggieConnect Supermarket' ||
                editingProduceItem.id.startsWith('sm-') ||
                editingProduceItem.sellerStatus === 'bought_and_stocked' ||
                editingProduceItem.farmName === 'VeggieConnect Supermarket' ||
                editingProduceItem.farmerName === 'VeggieConnect Central Produce Hub';
              const origItem = produceList.find((p) => p.id === editingProduceItem.id);
              const origLiveStock = origItem ? origItem.stockQuantity : 0;
              const pool = getProductStockPool(origItem || editingProduceItem);
              const maxAllowed = origLiveStock + pool.availableInPool;
              const isOverPool = isSm && editingProduceItem.stockQuantity > maxAllowed;

              return (
                <div className="space-y-3">
                  {isSm && (
                    <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-2.5 space-y-1 text-[11px]">
                      <div className="flex justify-between text-neutral-600">
                        <span>Current Live Shelf Stock:</span>
                        <span className="font-bold text-neutral-900">{origLiveStock} {editingProduceItem.unit}s</span>
                      </div>
                      <div className="flex justify-between text-neutral-600">
                        <span>Available in Owned Pool:</span>
                        <span className="font-bold text-amber-800">{pool.availableInPool} {editingProduceItem.unit}s</span>
                      </div>
                      <div className="flex justify-between border-t border-amber-200/80 pt-1 text-emerald-950 font-bold">
                        <span>Max Allowable Live Stock:</span>
                        <span className="font-extrabold text-emerald-800">{maxAllowed} {editingProduceItem.unit}s</span>
                      </div>
                      {isOverPool ? (
                        <p className="text-[10px] text-rose-600 font-bold pt-1">
                          ⚠️ Stock exceeds available pool! Cannot add phantom inventory. Maximum allowable is {maxAllowed} {editingProduceItem.unit}s.
                        </p>
                      ) : pool.availableInPool <= 0 ? (
                        <p className="text-[10px] text-amber-800 font-medium pt-1">
                          ℹ️ Ready-to-Stock pool is depleted (0 available). You cannot add more live stock unless you buy more from farmers. Decreasing live stock will return units to the pool.
                        </p>
                      ) : null}
                    </div>
                  )}

                  <form onSubmit={handleSaveProduceEdit} className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1 gap-2">
                        <label className="text-[10px] font-bold uppercase text-neutral-500">Price per Unit (₱)</label>
                        {(() => {
                          // Farmer's price for this crop (what the admin paid / asked at the farm gate)
                          const farmerBasePrice =
                            origItem?.farmgateAskingPrice ||
                            editingProduceItem.farmgateAskingPrice ||
                            editingProduceItem.pricePerUnit;
                          // 10% markup = the admin's profit margin when sold through a buyer's account
                          const suggestedShelfPrice = Math.round(farmerBasePrice * 1.1 * 100) / 100;
                          return (
                            <button
                              type="button"
                              onClick={() =>
                                setEditingProduceItem({ ...editingProduceItem, pricePerUnit: suggestedShelfPrice })
                              }
                              className="text-[10px] text-emerald-700 hover:underline flex items-center gap-0.5 font-bold cursor-pointer flex-shrink-0"
                              title={`Auto-set listing price with a 10% markup over the farmer's price (₱${farmerBasePrice.toFixed(2)}/kg) — your profit margin`}
                            >
                              <Sparkles className="w-2.5 h-2.5" />
                              <span>Use Price (₱{suggestedShelfPrice.toFixed(2)})</span>
                            </button>
                          );
                        })()}
                      </div>
                      <input
                        type="number"
                        min="1"
                        value={editingProduceItem.pricePerUnit}
                        onChange={(e) => setEditingProduceItem({ ...editingProduceItem, pricePerUnit: Number(e.target.value) })}
                        className="w-full border rounded-xl p-2 text-xs"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] font-bold uppercase text-neutral-500">
                          Available Stock ({editingProduceItem.unit}s)
                        </label>
                        {isSm && (
                          <span className="text-[10px] font-bold text-emerald-700">
                            Max: {maxAllowed} {editingProduceItem.unit}s
                          </span>
                        )}
                      </div>
                      <input
                        type="number"
                        min="0"
                        max={isSm ? maxAllowed : undefined}
                        value={editingProduceItem.stockQuantity}
                        onChange={(e) => {
                          const val = Math.max(0, Number(e.target.value));
                          if (isSm && val > maxAllowed) {
                            showToast(`⚠️ Cannot exceed owned inventory! Max allowable is ${maxAllowed} ${editingProduceItem.unit}s.`);
                            setEditingProduceItem({ ...editingProduceItem, stockQuantity: maxAllowed });
                          } else {
                            setEditingProduceItem({ ...editingProduceItem, stockQuantity: val });
                          }
                        }}
                        className={`w-full border rounded-xl p-2 text-xs font-mono font-bold ${
                          isOverPool ? 'border-rose-400 bg-rose-50/50' : 'border-neutral-200'
                        }`}
                      />
                      {isSm && pool.availableInPool <= 0 && (
                        <p className="text-[10px] text-neutral-500 mt-1">
                          To add more stock, procure from farmers in the Buy Desk.
                        </p>
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={isOverPool}
                      className={`w-full py-2 text-white font-bold rounded-xl text-xs transition-all ${
                        isOverPool
                          ? 'bg-neutral-300 text-neutral-500 cursor-not-allowed'
                          : 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer'
                      }`}
                    >
                      Save Crop Updates
                    </button>
                  </form>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Delete User Confirmation */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-xs w-full space-y-3 shadow-xl text-center">
            <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
            <h3 className="font-bold text-sm text-neutral-900">Delete {userToDelete.name}?</h3>
            <p className="text-xs text-neutral-500">This will remove this user account permanently.</p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setUserToDelete(null)}
                className="flex-1 py-2 bg-neutral-100 rounded-xl text-xs font-bold text-neutral-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteUser(userToDelete.id);
                  setUserToDelete(null);
                  showToast('User removed');
                }}
                className="flex-1 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Produce Confirmation */}
      {produceToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-xs w-full space-y-3 shadow-xl text-center">
            <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
            <h3 className="font-bold text-sm text-neutral-900">Remove {produceToDelete.name}?</h3>
            <p className="text-xs text-neutral-500">This harvest listing will be removed from the market.</p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setProduceToDelete(null)}
                className="flex-1 py-2 bg-neutral-100 rounded-xl text-xs font-bold text-neutral-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteProduce(produceToDelete.id);
                  setProduceToDelete(null);
                  showToast('Listing removed');
                }}
                className="flex-1 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHAT FARMER MODAL (ADMIN TO FARMER DIRECT CHAT) */}
      {chattingProduce && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full max-h-[92%] flex flex-col shadow-2xl border border-emerald-200 animate-in zoom-in-95 duration-150 overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-2xl bg-white/15 flex items-center justify-center text-white flex-shrink-0">
                  <Sprout className="w-5 h-5 text-emerald-200" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-xs truncate">
                      {chattingProduce.farmerName}
                    </h3>
                    <span className="text-[9px] bg-emerald-500 text-white font-bold px-1.5 py-0.2 rounded">
                      Farmer
                    </span>
                  </div>
                  <p className="text-[10px] text-emerald-200 truncate">
                    {chattingProduce.farmName} • {chattingProduce.location}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setChattingProduce(null)}
                className="p-1.5 rounded-full hover:bg-white/20 text-white cursor-pointer transition-colors"
                title="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Crop Reference Header */}
            <div className="bg-emerald-50 border-b border-emerald-100 p-2.5 flex items-center justify-between text-xs">
              <div className="min-w-0">
                <span className="text-[10px] text-emerald-800 uppercase font-bold block">Listing Reference:</span>
                <span className="font-extrabold text-neutral-900 truncate block">
                  🌱 {chattingProduce.name} ({chattingProduce.stockQuantity} {chattingProduce.unit}s)
                </span>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="text-[10px] text-neutral-500 block">Asking:</span>
                <span className="font-black text-amber-700">₱{(chattingProduce.farmgateAskingPrice || chattingProduce.pricePerUnit).toFixed(2)}/kg</span>
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 p-3 overflow-y-auto space-y-2 bg-neutral-50 min-h-[190px] max-h-[270px]">
              {farmerConversation.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4 text-xs text-neutral-500 space-y-1">
                  <MessageSquare className="w-8 h-8 text-neutral-300 stroke-[1.5]" />
                  <p className="font-semibold text-neutral-700">Direct Chat with {chattingProduce.farmerName}</p>
                  <p className="text-[11px] text-neutral-400">
                    Coordinate harvest lots, schedule pickup inspections, or negotiate pricing.
                  </p>
                </div>
              ) : (
                farmerConversation.map((m) => {
                  const isAdminMsg = m.senderRole === 'admin' || m.senderId === (currentUser?.id || 'admin-main');
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isAdminMsg ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs ${
                          isAdminMsg
                            ? 'bg-emerald-700 text-white rounded-br-xs'
                            : 'bg-white text-neutral-900 border border-neutral-200 rounded-bl-xs shadow-2xs'
                        }`}
                      >
                        <p className="break-words leading-relaxed">{m.text}</p>
                      </div>
                      <span className="text-[9px] text-neutral-400 mt-0.5 px-1 font-mono">
                        {m.timestamp}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick Presets */}
            <div className="p-2 border-t border-neutral-100 bg-white flex gap-1.5 overflow-x-auto scrollbar-none">
              <button
                type="button"
                onClick={() => handleSendFarmerMessage('🌾 Hi! We would like to purchase this harvest lot for the Supermarket store.')}
                className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[10px] font-semibold whitespace-nowrap border border-emerald-200 cursor-pointer transition-colors"
              >
                🛒 Buy Harvest Lot
              </button>
              <button
                type="button"
                onClick={() => handleSendFarmerMessage('🚚 Is this produce packed and ready for morning pickup inspection?')}
                className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[10px] font-semibold whitespace-nowrap border border-emerald-200 cursor-pointer transition-colors"
              >
                🚚 Ready for Pickup?
              </button>
              <button
                type="button"
                onClick={() => handleSendFarmerMessage('📦 Can you supply an additional lot of this crop this week?')}
                className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[10px] font-semibold whitespace-nowrap border border-emerald-200 cursor-pointer transition-colors"
              >
                📦 Extra Supply
              </button>
            </div>

            {/* Message Input Footer */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendFarmerMessage();
              }}
              className="p-2.5 bg-white border-t border-neutral-200 flex items-center gap-2"
            >
              <input
                type="text"
                value={farmerChatText}
                onChange={(e) => setFarmerChatText(e.target.value)}
                placeholder={`Message ${chattingProduce.farmerName}...`}
                className="flex-1 bg-neutral-100 border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
              />
              <button
                type="submit"
                disabled={!farmerChatText.trim()}
                className="p-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl cursor-pointer transition-all active:scale-95 shadow-xs flex-shrink-0"
                title="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* "PUT IN SUPERMARKET STORE STOCK" MODAL */}
      {puttingInStockItem && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-3xl max-w-sm w-full max-h-[92%] overflow-y-auto shadow-2xl border border-emerald-200 p-4 space-y-3.5 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-neutral-100 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <Store className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-xs text-neutral-900">Put on Store Shelf</h3>
                  <p className="text-[10px] text-neutral-500">Make this vegetable available for buyers to purchase</p>
                </div>
              </div>
              <button
                onClick={() => setPuttingInStockItem(null)}
                className="p-1 text-neutral-400 hover:text-neutral-600 rounded-full cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Procured Crop Overview Pill */}
            <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-3 space-y-1.5 text-xs text-emerald-950">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-sm text-neutral-900">{puttingInStockItem.name}</h4>
                  <p className="text-[11px] text-emerald-700 font-bold mt-0.5">
                    🌱 Farmer: {puttingInStockItem.farmerName} ({puttingInStockItem.farmName})
                  </p>
                </div>
                <span className="text-[10px] font-bold bg-emerald-200 text-emerald-950 px-2 py-0.5 rounded-full">
                  Bought from Farmer
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-emerald-200/60">
                <span>Cost Paid to Farmer:</span>
                <span className="font-bold font-mono text-amber-800">
                  ₱{puttingInStockItem.costPricePerUnit.toFixed(2)}/{puttingInStockItem.unit || 'kg'}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span>Total Quantity Bought:</span>
                <span className="font-bold text-neutral-900">
                  {puttingInStockItem.quantityBought} {puttingInStockItem.unit || 'kg'}s
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span>Currently on Live Shelf:</span>
                <span className="font-bold text-emerald-800">
                  {puttingInStockItem.supermarketStockQty || 0} {puttingInStockItem.unit || 'kg'}s
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] font-bold text-amber-900 bg-amber-100/60 p-1.5 rounded-lg">
                <span>Available to Put in Stock:</span>
                <span>
                  {lotReadyPoolById[puttingInStockItem.id] ?? Math.max(0, puttingInStockItem.quantityBought - (puttingInStockItem.supermarketStockQty || 0))} {puttingInStockItem.unit || 'kg'}s
                </span>
              </div>
            </div>

            {/* Form Inputs */}
            {(() => {
              const maxPoolAvailable = lotReadyPoolById[puttingInStockItem.id] ?? Math.max(0, puttingInStockItem.quantityBought - (puttingInStockItem.supermarketStockQty || 0));
              const isPoolDepleted = maxPoolAvailable <= 0;

              return (
                <div className="space-y-3 text-xs">
                  {/* Input 1: Stock Quantity */}
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                      Quantity to Add from Pool to Store Shelf ({puttingInStockItem.unit || 'kg'})
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        max={maxPoolAvailable}
                        disabled={isPoolDepleted}
                        value={stockModalQty}
                        onChange={(e) => {
                          const entered = parseInt(e.target.value) || 0;
                          if (entered > maxPoolAvailable) {
                            showToast(`⚠️ Only ${maxPoolAvailable} ${puttingInStockItem.unit}s remaining in this bought lot pool!`);
                            setStockModalQty(maxPoolAvailable);
                          } else {
                            setStockModalQty(Math.max(1, entered));
                          }
                        }}
                        className={`w-full border rounded-xl px-3 py-2 text-xs text-neutral-900 font-mono font-bold focus:outline-none focus:border-emerald-600 ${
                          isPoolDepleted ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed' : 'bg-neutral-50 focus:bg-white'
                        }`}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 text-xs font-bold">
                        {puttingInStockItem.unit || 'kg'}
                      </span>
                    </div>
                    <span className="text-[10px] text-neutral-500 mt-0.5 block">
                      {isPoolDepleted
                        ? '⚠️ Pool depleted for this lot (0 units remaining).'
                        : `Maximum available to put in stock: ${maxPoolAvailable} ${puttingInStockItem.unit}s`}
                    </span>
                  </div>

              {/* Input 2: Resale Retail Price */}
              <div>
                <div className="flex items-center justify-between mb-1 gap-2">
                  <label className="text-[11px] font-bold text-neutral-700">
                    Store Selling Price to Buyers (₱/{puttingInStockItem.unit || 'kg'})
                  </label>
                  {(() => {
                    // 10% markup over the farmer's price = the admin's profit margin on buyer sales
                    const suggestedShelfPrice = Math.round(puttingInStockItem.costPricePerUnit * 1.1 * 100) / 100;
                    return (
                      <button
                        type="button"
                        onClick={() => setStockModalPrice(suggestedShelfPrice)}
                        className="text-[10px] text-emerald-700 hover:underline flex items-center gap-0.5 font-bold cursor-pointer flex-shrink-0"
                        title={`Auto-set shelf price with a 10% markup over the farmer's price (₱${puttingInStockItem.costPricePerUnit.toFixed(2)}/kg) — your profit margin`}
                      >
                        <Sparkles className="w-2.5 h-2.5" />
                        <span>Use Price (₱{suggestedShelfPrice.toFixed(2)})</span>
                      </button>
                    );
                  })()}
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    value={stockModalPrice}
                    onChange={(e) => setStockModalPrice(Math.max(1, parseFloat(e.target.value) || 1))}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-6 pr-3 py-2 text-xs text-neutral-900 font-mono font-bold focus:outline-none focus:border-emerald-600 focus:bg-white"
                  />
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 text-xs font-bold">
                    ₱
                  </span>
                </div>

                {/* Profit Margin Preview */}
                <div className="mt-1 flex items-center justify-between text-[10px]">
                  <span className="text-emerald-700 font-bold">
                    Your Profit: +₱{(stockModalPrice - puttingInStockItem.costPricePerUnit).toFixed(2)}/
                    {puttingInStockItem.unit || 'kg'} (
                    {(((stockModalPrice - puttingInStockItem.costPricePerUnit) / puttingInStockItem.costPricePerUnit) * 100).toFixed(1)}
                    % margin)
                  </span>
                  <span className="text-neutral-400 font-mono">
                    Total Estimated Sales: ₱{(stockModalPrice * stockModalQty).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Input 3: Category */}
              <div>
                <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                  Store Category
                </label>
                <select
                  value={stockModalCategory}
                  onChange={(e) => setStockModalCategory(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:border-emerald-600 focus:bg-white cursor-pointer"
                >
                  <option value="Vegetables">Vegetables</option>
                  <option value="Root Crops">Root Crops</option>
                  <option value="Fruits">Fruits</option>
                  <option value="Leafy Greens">Leafy Greens</option>
                  <option value="Herbs & Spices">Herbs & Spices</option>
                  <option value="Legumes & Beans">Legumes & Beans</option>
                </select>
              </div>

              {/* Input 4: Store Shelf Description / Sourcing */}
              <div>
                <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                  Supermarket Shelf Note / Sourcing Description
                </label>
                <textarea
                  rows={2}
                  value={stockModalNote}
                  onChange={(e) => setStockModalNote(e.target.value)}
                  placeholder="Fresh produce sourced directly from registered farmer..."
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-2.5 text-xs text-neutral-900 focus:outline-none focus:border-emerald-600 focus:bg-white resize-none"
                />
              </div>
            </div>
          );
        })()}

            {/* Confirmation Buttons */}
            {(() => {
              const maxPoolAvailable = lotReadyPoolById[puttingInStockItem.id] ?? Math.max(0, puttingInStockItem.quantityBought - (puttingInStockItem.supermarketStockQty || 0));
              const isPoolDepleted = maxPoolAvailable <= 0;

              return (
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setPuttingInStockItem(null)}
                    className="flex-1 py-2.5 px-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold rounded-xl cursor-pointer transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    id="btn-confirm-put-stock"
                    disabled={isPoolDepleted || stockModalQty <= 0 || stockModalQty > maxPoolAvailable}
                    onClick={handleConfirmPutInSupermarketStock}
                    className={`flex-1 py-2.5 px-3 text-white text-xs font-black rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all ${
                      isPoolDepleted || stockModalQty <= 0 || stockModalQty > maxPoolAvailable
                        ? 'bg-neutral-300 text-neutral-500 cursor-not-allowed shadow-none'
                        : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20 cursor-pointer active:scale-95'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    <span>{isPoolDepleted ? 'Pool Depleted' : 'Put in Supermarket Stock'}</span>
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
