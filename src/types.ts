export type UserRole = 'buyer' | 'farmer' | 'admin';

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  phone: string;
  role: UserRole;
  location: string;
  latitude?: number;
  longitude?: number;
  farmName?: string;
  avatar?: string;
  verified?: boolean;
  status?: 'active' | 'pending' | 'suspended';
  bio?: string;
  isOnline?: boolean;
  lastActive?: string;
}

export type VegetableCategory =
  | 'All'
  | 'Vegetables'
  | 'Leafy Greens'
  | 'Tomatoes & Peppers'
  | 'Root Vegetables'
  | 'Squash & Gourds'
  | 'Herbs & Microgreens'
  | 'Legumes & Pods'
  | 'Organic Certified';

export type FarmingMethod =
  | 'Certified Organic'
  | 'Naturally Grown (Pesticide Free)'
  | 'Hydroponic / Clean Aquaponic'
  | 'GAP Certified (Good Agricultural Practices)'
  | 'Traditional Low-Spray';

export type HarvestStatus =
  | 'Harvested Today'
  | 'Fresh Picked on Order'
  | 'Harvesting Tomorrow AM'
  | 'Curing / Farm Stored';

export interface ProduceItem {
  id: string;
  farmerId: string;
  farmerName: string;
  farmName: string;
  name: string;
  category?: string;
  variety?: string;
  farmgateAskingPrice?: number;
  pricePerUnit: number;
  unit: string;
  stockQuantity: number;
  minOrderQuantity?: number;
  bulkDiscount?: {
    minQty: number;
    discountPercent: number;
  };
  harvestStatus: HarvestStatus;
  harvestDate: string;
  farmingMethod?: FarmingMethod | string;
  imageUrl: string;
  isOrganic: boolean;
  description: string;
  sourcingRegion?: string;
  location: string;
  latitude?: number;
  longitude?: number;
  distanceKm: number;
  rating?: number;
  reviewsCount?: number;
  sellerStatus?: 'submitted' | 'bought_and_stocked' | 'sold_out' | 'archived';
  // Backward compatibility alias
  brokerStatus?: 'pending_review' | 'approved_active' | 'sold_out' | 'archived';
  sellerStoreName?: string;
  boughtQuantity?: number;
  boughtAt?: string;
}

export interface FarmerProfile {
  id: string;
  name: string;
  farmName: string;
  location: string;
  latitude?: number;
  longitude?: number;
  distanceKm: number;
  rating?: number;
  totalReviews?: number;
  bio: string;
  avatar: string;
  coverImage: string;
  phone: string;
  verified: boolean;
  farmingMethods?: string[];
  joinedYear: number;
  totalHarvestsSold: number;
}

export interface CartItem {
  produce: ProduceItem;
  quantity: number;
}

export interface OrderItem {
  produceId: string;
  produceName: string;
  pricePerUnit?: number;
  unitPrice?: number;
  unit: string;
  quantity: number;
  farmerId?: string;
  farmerName?: string;
  farmName?: string;
  imageUrl?: string;
}

export type OrderStatus =
  | 'pending' // Order placed — pickup route NOT started (nothing highlighted yet)
  | 'confirmed' // Owner started the pickup route ('I'll Pick This Up') — farmer fresh-picks now
  | 'harvesting_packing' // LEGACY only (pre-fresh-pick rows). Never assigned to new orders.
  | 'ready_for_pickup_delivery'
  | 'picked_up'
  | 'in_transit'
  | 'completed'
  | 'cancelled';

export interface Order {
  id: string;
  buyerId?: string;
  buyerName: string;
  buyerPhone: string;
  farmerId: string;
  farmName: string;
  farmerPhone?: string;
  sellerStoreName?: string;
  brokerHubName?: string; // backward compat alias
  farmgateCostTotal?: number;
  sellerMargin?: number;
  items: OrderItem[];
  deliveryType: 'farm_pickup' | 'direct_delivery';
  deliveryAddress?: string;
  pickupSlot?: string;
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  paymentMethod: string;
  status: OrderStatus;
  transportJobId?: string;
  notes?: string;
  cancelReason?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  createdAt?: string;
  transporterId?: string;
  transporterName?: string;
  transporterPhone?: string;
  vehicleType?: string;
  rating?: number;
  reviewComment?: string;
  ratedAt?: string;
}

export interface TransportJob {
  id: string;
  orderId: string;
  pickupFarm: string;
  pickupLocation: string;
  dropoffLocation: string;
  buyerName: string;
  buyerPhone: string;
  itemsSummary: string;
  weightKgEst: number;
  earningsPeso: number;
  status: 'available' | 'accepted' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
  assignedTransporterId?: string;
  assignedTransporterName?: string;
  assignedTransporterPhone?: string;
  cancelReason?: string;
  cancelledAt?: string;
  createdAt?: string;
}

export interface DirectMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  recipientId: string;
  recipientName: string;
  recipientRole: UserRole;
  text: string;
  timestamp: string;
  produceName?: string;
  orderId?: string;
  isRead?: boolean;
  // Legacy backward-compatibility fields
  farmerId?: string;
  farmerName?: string;
  buyerId?: string;
  buyerName?: string;
}

export type DAPriceCategory =
  | 'Highland Vegetables'
  | 'Lowland Vegetables'
  | 'Spices & Aromatics'
  | 'Fruits'
  | 'Root Crops'
  | 'Staples & Rice';

export interface DAPriceItem {
  id: string;
  commodity: string;
  localName?: string;
  variety?: string;
  category: DAPriceCategory;
  unit: string;
  prevailingRetailPrice: number;
  prevailingFarmgatePrice: number;
  priceRangeMin: number;
  priceRangeMax: number;
  trend: 'up' | 'down' | 'stable';
  changeAmount: number;
  changePercent: number;
  marketCenter: string;
  updatedDate: string;
  source: string;
  suggestedDirectFarmPrice: number;
  notes?: string;
}

export interface DABulletinMeta {
  bulletinDate: string;
  lastSynced: string;
  marketCenter: string;
  dataSource: string;
  agency: string;
  totalCommodities: number;
  inflationNote?: string;
}
