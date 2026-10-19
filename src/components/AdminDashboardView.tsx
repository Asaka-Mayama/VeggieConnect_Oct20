import React, { useState, useMemo } from 'react';
import {
  Users,
  Shield,
  Search,
  CheckCircle2,
  XCircle,
  Edit3,
  Trash2,
  Package,
  Sprout,
  Truck,
  ShoppingBag,
  Phone,
  Mail,
  MapPin,
  X,
  Save,
  AlertCircle,
  Plus,
  RefreshCw,
  Clock,
  Check,
  ExternalLink,
  LogOut,
  FileText,
  Eye,
  Database,
  Copy,
  Download,
  Server,
} from 'lucide-react';
import { UserProfile, UserRole, ProduceItem } from '../types';
import { generateVeggieConnect2Sql } from '../data/xamppSqlData';

interface AdminDashboardViewProps {
  currentUser: UserProfile | null;
  registeredUsers: UserProfile[];
  produceList: ProduceItem[];
  onUpdateUser: (user: UserProfile) => void;
  onDeleteUser: (userId: string) => void;
  onUpdateProduce?: (produce: ProduceItem) => void;
  onDeleteProduce?: (produceId: string) => void;
  onLogout?: () => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  currentUser,
  registeredUsers,
  produceList,
  onUpdateUser,
  onDeleteUser,
  onUpdateProduce,
  onDeleteProduce,
  onLogout,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'pending' | 'farmer' | 'buyer' | 'transporter'>('all');
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [inspectingFarmer, setInspectingFarmer] = useState<UserProfile | null>(null);
  const [isBrowsingAllProduce, setIsBrowsingAllProduce] = useState(false);
  const [allProduceSearchQuery, setAllProduceSearchQuery] = useState('');
  const [editingProduceItem, setEditingProduceItem] = useState<ProduceItem | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [produceToDelete, setProduceToDelete] = useState<ProduceItem | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Filter out admin themselves from general profiles list or keep visible with admin tag
  const filteredUsers = useMemo(() => {
    return registeredUsers.filter((u) => {
      // Exclude admin from regular user listing to focus on member profiles
      if (u.role === 'admin' || u.email === 'admin@gmail.com') return false;

      if (roleFilter === 'pending') {
        if (u.status !== 'pending') return false;
      } else if (roleFilter !== 'all' && u.role !== roleFilter) {
        return false;
      }

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchName = u.name.toLowerCase().includes(q);
      const matchPhone = u.phone.toLowerCase().includes(q);
      const matchEmail = (u.email || '').toLowerCase().includes(q);
      const matchLoc = (u.location || '').toLowerCase().includes(q);
      const matchFarm = (u.farmName || '').toLowerCase().includes(q);
      return matchName || matchPhone || matchEmail || matchLoc || matchFarm;
    });
  }, [registeredUsers, roleFilter, searchQuery]);

  // Summary Metrics
  const stats = useMemo(() => {
    const nonAdminUsers = registeredUsers.filter((u) => u.role !== 'admin' && u.email !== 'admin@gmail.com');
    const farmers = nonAdminUsers.filter((u) => u.role === 'farmer');
    const buyers = nonAdminUsers.filter((u) => u.role === 'buyer');
    const transporters = nonAdminUsers.filter((u) => u.role === 'transporter');
    const pendingTransporters = nonAdminUsers.filter((u) => u.role === 'transporter' && u.status === 'pending');
    const verified = nonAdminUsers.filter((u) => u.verified);

    return {
      total: nonAdminUsers.length,
      farmers: farmers.length,
      buyers: buyers.length,
      transporters: transporters.length,
      pending: pendingTransporters.length,
      verified: verified.length,
      activeCrops: produceList.length,
    };
  }, [registeredUsers, produceList]);

  // Farmer's listed produce
  const farmerSellingItems = useMemo(() => {
    if (!inspectingFarmer) return [];
    return produceList.filter(
      (p) =>
        p.farmerId === inspectingFarmer.id ||
        (inspectingFarmer.name && p.farmerName && p.farmerName.toLowerCase() === inspectingFarmer.name.toLowerCase()) ||
        (inspectingFarmer.farmName && p.farmName && p.farmName.toLowerCase() === inspectingFarmer.farmName.toLowerCase())
    );
  }, [inspectingFarmer, produceList]);

  // Handle Approve Transporter
  const handleApproveTransporter = (user: UserProfile) => {
    const updated: UserProfile = {
      ...user,
      status: 'active',
      verified: true,
    };
    onUpdateUser(updated);
    showToast(`Approved ${user.name}! They can now log in to the Transporter Portal.`);
  };

  // Handle Quick Toggle Verified
  const handleToggleVerified = (user: UserProfile) => {
    const updated: UserProfile = {
      ...user,
      verified: !user.verified,
    };
    onUpdateUser(updated);
    showToast(`${user.name} is now ${updated.verified ? 'Verified ✓' : 'Unverified'}`);
  };

  // Handle Quick Toggle Status (Active / Suspended)
  const handleToggleStatus = (user: UserProfile) => {
    const nextStatus = user.status === 'suspended' ? 'active' : 'suspended';
    const updated: UserProfile = {
      ...user,
      status: nextStatus,
    };
    onUpdateUser(updated);
    showToast(`Account status updated to ${nextStatus.toUpperCase()}`);
  };

  // Save Edit User Modal
  const handleSaveUserEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    onUpdateUser(editingUser);
    showToast(`Saved changes for ${editingUser.name}`);
    setEditingUser(null);
  };

  // Save Edit Produce Modal
  const handleSaveProduceEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduceItem || !onUpdateProduce) return;
    onUpdateProduce(editingProduceItem);
    showToast(`Listing for ${editingProduceItem.name} updated!`);
    setEditingProduceItem(null);
  };

  return (
    <div className="flex flex-col bg-white text-neutral-900 pb-12 w-full">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-50 bg-emerald-700 text-white font-bold px-4 py-2 rounded-full text-xs shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-200" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Admin Mobile App Bar */}
      <div className="bg-white border-b border-emerald-100 px-4 py-3 sticky top-0 z-20 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-700/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-bold text-emerald-950 font-display">
                  Admin Dashboard
                </h1>
                <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase">
                  Superuser
                </span>
              </div>
              <p className="text-[11px] text-emerald-700/80 font-medium">
                Profiles & Vegetable Selling Oversight
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onLogout && (
              <button
                id="btn-admin-header-logout"
                type="button"
                onClick={onLogout}
                title="Log Out of Admin Account"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-600" />
                <span>Log Out</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="p-3.5 space-y-4">
        {/* Pending Transporters Alert Banner (if any) */}
        {stats.pending > 0 && (
          <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl shadow-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-amber-950">
                  {stats.pending} Transporter Application{stats.pending > 1 ? 's' : ''} Pending Approval
                </p>
                <p className="text-[11px] text-amber-800 truncate">
                  Transporters cannot log in until approved by Admin.
                </p>
              </div>
            </div>
            <button
              onClick={() => setRoleFilter('pending')}
              className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold whitespace-nowrap cursor-pointer shadow-xs transition-all flex-shrink-0"
            >
              Review ({stats.pending})
            </button>
          </div>
        )}

        {/* Metric Overview Cards (Mobile Grid) */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white p-3 rounded-2xl border border-emerald-100/90 shadow-xs flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-emerald-800/70">Total Members</p>
              <p className="text-lg font-black text-emerald-950 leading-tight">{stats.total}</p>
            </div>
          </div>

          <div className="bg-white p-3 rounded-2xl border border-emerald-100/90 shadow-xs flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <Sprout className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-emerald-800/70">Farmers</p>
              <p className="text-lg font-black text-emerald-950 leading-tight">{stats.farmers}</p>
            </div>
          </div>

          <div className="bg-white p-3 rounded-2xl border border-emerald-100/90 shadow-xs flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center font-bold">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-sky-800/70">Buyers</p>
              <p className="text-lg font-black text-emerald-950 leading-tight">{stats.buyers}</p>
            </div>
          </div>

          <div className="bg-white p-3 rounded-2xl border border-emerald-100/90 shadow-xs flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-amber-800/70">Haulers</p>
              <p className="text-lg font-black text-emerald-950 leading-tight">
                {stats.transporters} {stats.pending > 0 && <span className="text-xs text-amber-600 font-bold">({stats.pending} pend)</span>}
              </p>
            </div>
          </div>
        </div>

        {/* Active Marketplace Crops Overview */}
        <div className="bg-white p-3 rounded-2xl border border-emerald-100/90 shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold flex-shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase font-bold text-emerald-800/70 truncate">Marketplace Harvest Listings</p>
              <p className="text-sm font-black text-emerald-950 leading-tight truncate">
                {stats.activeCrops} {stats.activeCrops === 1 ? 'crop listed' : 'crops listed'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsBrowsingAllProduce(true)}
            className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer border border-emerald-200/80 shadow-2xs flex-shrink-0"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Manage Crops</span>
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="space-y-2 bg-white p-3 rounded-2xl border border-emerald-100/90 shadow-xs">
          <div className="relative">
            <Search className="w-4 h-4 text-emerald-600 absolute left-3 top-2.5 pointer-events-none" />
            <input
              id="input-admin-search"
              type="text"
              placeholder="Search by name, phone, email, farm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-emerald-50/50 border border-emerald-200/80 rounded-xl py-2 pl-9 pr-8 text-xs text-emerald-950 placeholder-emerald-700/50 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-xs text-neutral-400 hover:text-neutral-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Role Filter Chips */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pt-1">
            {(
              [
                { id: 'all', label: `All (${stats.total})` },
                ...(stats.pending > 0 ? [{ id: 'pending' as const, label: `⏳ Pending (${stats.pending})` }] : []),
                { id: 'farmer', label: `👨‍🌾 Farmers (${stats.farmers})` },
                { id: 'buyer', label: `🛒 Buyers (${stats.buyers})` },
                { id: 'transporter', label: `🚚 Haulers (${stats.transporters})` },
              ] as const
            ).map((chip) => (
              <button
                key={chip.id}
                onClick={() => setRoleFilter(chip.id)}
                className={`text-xs px-3 py-1 rounded-full font-bold whitespace-nowrap transition-all cursor-pointer ${
                  roleFilter === chip.id
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/60'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* Profiles Section Header */}
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-900">
            Registered Profiles ({filteredUsers.length})
          </h2>
          <span className="text-[11px] text-emerald-700 font-medium">
            Tap Edit to modify profile
          </span>
        </div>

        {/* User Profiles List */}
        {filteredUsers.length === 0 ? (
          <div className="bg-white rounded-2xl border border-emerald-100 p-8 text-center text-neutral-600 space-y-2 shadow-xs">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl">
              🔍
            </div>
            <p className="text-xs font-bold text-emerald-950">No Member Profiles Match Your Filter</p>
            <p className="text-[11px] text-neutral-500 max-w-xs mx-auto">
              Try adjusting your search terms or registering a new farmer, buyer, or transporter.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredUsers.map((user) => {
              // Check how many items this user is selling
              const sellingItems = produceList.filter(
                (p) =>
                  p.farmerId === user.id ||
                  (user.name && p.farmerName && p.farmerName.toLowerCase() === user.name.toLowerCase()) ||
                  (user.farmName && p.farmName && p.farmName.toLowerCase() === user.farmName.toLowerCase())
              );
              const isSuspended = user.status === 'suspended';
              const isPending = user.status === 'pending';

              return (
                <div
                  key={user.id}
                  id={`user-card-${user.id}`}
                  className={`bg-white rounded-2xl border p-3.5 shadow-xs transition-all ${
                    isPending
                      ? 'border-amber-300 bg-amber-50/30'
                      : isSuspended
                      ? 'border-red-200 bg-red-50/20'
                      : 'border-emerald-100/90 hover:border-emerald-300'
                  }`}
                >
                  {/* Card Header: Avatar, Name, Role Badge, Verified Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative flex-shrink-0">
                        {user.avatar ? (
                          <img
                            src={user.avatar}
                            alt={user.name}
                            className="w-10 h-10 rounded-full object-cover border border-emerald-200"
                          />
                        ) : (
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white shadow-xs ${
                              user.role === 'farmer'
                                ? 'bg-emerald-600'
                                : user.role === 'transporter'
                                ? 'bg-amber-600'
                                : 'bg-sky-600'
                            }`}
                          >
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        {user.verified && (
                          <span
                            className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-600 text-white text-[9px] rounded-full flex items-center justify-center border-2 border-white"
                            title="Verified Community Member"
                          >
                            ✓
                          </span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="text-sm font-bold text-emerald-950 truncate">
                            {user.name}
                          </h3>
                          {isPending && (
                            <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[9px] font-extrabold px-1.5 py-0.2 rounded uppercase flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5 text-amber-700" />
                              Pending Approval
                            </span>
                          )}
                          {isSuspended && (
                            <span className="bg-red-100 text-red-700 text-[9px] font-bold px-1.5 py-0.2 rounded uppercase">
                              Suspended
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-neutral-500 truncate flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                          <span>{user.location || 'Negros Oriental'}</span>
                        </p>
                      </div>
                    </div>

                    {/* Role Pill */}
                    <span
                      className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full flex-shrink-0 ${
                        user.role === 'farmer'
                          ? 'bg-emerald-100 text-emerald-800'
                          : user.role === 'transporter'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-sky-100 text-sky-800'
                      }`}
                    >
                      {user.role}
                    </span>
                  </div>

                  {/* Profile Metadata (Phone, Email, Farm/Vehicle) */}
                  <div className="mt-3 pt-2.5 border-t border-neutral-100 grid grid-cols-1 gap-1 text-[11px] text-neutral-600">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                      <span className="font-semibold text-neutral-800">{user.phone}</span>
                      {user.email && (
                        <>
                          <span className="text-neutral-300">•</span>
                          <Mail className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                          <span className="truncate text-neutral-600">{user.email}</span>
                        </>
                      )}
                    </div>

                    {user.farmName && (
                      <div className="flex items-center gap-1.5 text-emerald-800 font-medium">
                        <Sprout className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                        <span className="truncate">Farm: {user.farmName}</span>
                      </div>
                    )}

                    {user.vehicleType && (
                      <div className="flex items-center gap-1.5 text-amber-800 font-medium">
                        <Truck className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                        <span className="truncate">
                          {user.vehicleType} {user.plateNumber ? `(${user.plateNumber})` : ''}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Admin Powers & Action Buttons */}
                  <div className="mt-3 pt-2.5 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-1.5">
                    {/* Left: What they are selling inspector or Quick Approve button */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {isPending && user.role === 'transporter' ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            id={`btn-open-approval-form-${user.id}`}
                            onClick={() => setEditingUser({ ...user })}
                            className="flex items-center gap-1 px-3 py-1 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
                            title="Open Transporter Approval Form"
                          >
                            <FileText className="w-3.5 h-3.5 text-amber-700" />
                            <span>Approval Form</span>
                          </button>
                          <button
                            id={`btn-approve-transporter-${user.id}`}
                            onClick={() => handleApproveTransporter(user)}
                            className="flex items-center gap-1 px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
                            title="Instantly Approve Transporter"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                            <span>Quick Approve</span>
                          </button>
                        </div>
                      ) : user.role === 'farmer' || sellingItems.length > 0 ? (
                        <button
                          id={`btn-check-selling-${user.id}`}
                          onClick={() => setInspectingFarmer(user)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold transition-all cursor-pointer"
                        >
                          <Package className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Check Selling ({sellingItems.length})</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-neutral-400 italic">
                          {user.role === 'transporter' ? 'Verified Hauler' : 'Standard Member'}
                        </span>
                      )}
                    </div>

                    {/* Right: Actions (Edit, Verify Toggle, Status Toggle, Delete) */}
                    <div className="flex items-center gap-1">
                      {/* Edit User Button */}
                      <button
                        id={`btn-edit-user-${user.id}`}
                        onClick={() => setEditingUser({ ...user })}
                        className="p-1.5 rounded-lg bg-neutral-100 hover:bg-emerald-50 text-neutral-700 hover:text-emerald-700 transition-colors cursor-pointer"
                        title="Edit User Profile"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      {/* Verify/Unverify Toggle */}
                      <button
                        onClick={() => handleToggleVerified(user)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          user.verified
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-neutral-100 text-neutral-400 hover:text-emerald-600'
                        }`}
                        title={user.verified ? 'Click to unverify' : 'Click to verify member'}
                      >
                        <Shield className="w-4 h-4" />
                      </button>

                      {/* Delete User */}
                      <button
                        onClick={() => setUserToDelete(user)}
                        className="p-1.5 rounded-lg bg-neutral-100 hover:bg-red-50 text-neutral-400 hover:text-red-600 transition-colors cursor-pointer"
                        title="Delete User Profile"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Admin Session & Quick Sign Out Card */}
        {onLogout && (
          <div className="mt-6 p-4 rounded-2xl bg-white border border-rose-100 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-neutral-900">
                  {currentUser?.name || 'Administrator'} ({currentUser?.email || 'admin@gmail.com'})
                </p>
                <p className="text-[11px] text-neutral-500">
                  Logged in as System Superuser
                </p>
              </div>
            </div>
            <button
              id="btn-admin-bottom-logout"
              type="button"
              onClick={onLogout}
              className="w-full sm:w-auto px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out Admin Session</span>
            </button>
          </div>
        )}
      </div>

      {/* MODAL 1: CHECK WHAT THEY ARE SELLING */}
      {inspectingFarmer && (
        <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-emerald-100 animate-in slide-in-from-bottom-5">
            {/* Modal Header */}
            <div className="p-4 border-b border-emerald-100 flex items-center justify-between bg-emerald-50/50">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <Package className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-emerald-950 truncate">
                    Produce by {inspectingFarmer.name}
                  </h3>
                  <p className="text-[11px] text-emerald-700 font-medium truncate">
                    {inspectingFarmer.farmName || inspectingFarmer.location} • {farmerSellingItems.length} active listings
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectingFarmer(null)}
                className="p-1.5 rounded-full hover:bg-emerald-100 text-neutral-500 hover:text-emerald-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Listed Produce */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-emerald-50">
              {farmerSellingItems.length === 0 ? (
                <div className="py-8 text-center text-neutral-500 space-y-2">
                  <p className="text-xs font-bold text-emerald-950">No crops currently listed by this farmer.</p>
                  <p className="text-[11px]">When they add produce via their Farmer portal, items will appear here.</p>
                </div>
              ) : (
                farmerSellingItems.map((prod) => (
                  <div key={prod.id} className="pt-3 first:pt-0 flex items-start gap-3">
                    {prod.imageUrl ? (
                      <img
                        src={prod.imageUrl}
                        alt={prod.name}
                        className="w-16 h-16 rounded-xl object-cover border border-emerald-100 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-lg flex-shrink-0">
                        🥬
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-xs font-bold text-emerald-950 truncate">
                          {prod.name}
                        </h4>
                        <span className="text-xs font-black text-emerald-700">
                          ₱{prod.pricePerUnit}/{prod.unit}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-neutral-600">
                        <span className="bg-emerald-50 text-emerald-800 text-[10px] font-bold px-1.5 py-0.2 rounded">
                          {prod.category}
                        </span>
                        <span>Stock: {prod.stockQuantity} {prod.unit}s</span>
                      </div>

                      <p className="text-[10px] text-neutral-500 mt-1 truncate">
                        Status: <span className="font-medium text-emerald-800">{prod.harvestStatus}</span> • Method: {prod.farmingMethod}
                      </p>

                      {/* Admin Listing Actions */}
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => setEditingProduceItem({ ...prod })}
                          className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 hover:underline"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit Details</span>
                        </button>
                        <span className="text-neutral-300">•</span>
                        <button
                          onClick={() => setProduceToDelete(prod)}
                          className="text-[11px] font-bold text-red-600 hover:text-red-800 flex items-center gap-1 hover:underline cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete Listing</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-emerald-100 bg-neutral-50 text-right">
              <button
                onClick={() => setInspectingFarmer(null)}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ALL MARKETPLACE CROPS INSPECTOR */}
      {isBrowsingAllProduce && (
        <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-emerald-100 animate-in slide-in-from-bottom-5">
            {/* Modal Header */}
            <div className="p-4 border-b border-emerald-100 flex items-center justify-between bg-emerald-50/50">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs flex-shrink-0">
                  <Package className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-emerald-950 truncate">
                    All Marketplace Crops
                  </h3>
                  <p className="text-[11px] text-emerald-700 font-medium truncate">
                    {produceList.length} total active harvest {produceList.length === 1 ? 'listing' : 'listings'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsBrowsingAllProduce(false);
                  setAllProduceSearchQuery('');
                }}
                className="p-1.5 rounded-full hover:bg-emerald-100 text-neutral-500 hover:text-emerald-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Search Bar */}
            <div className="p-3 border-b border-emerald-100 bg-white">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-emerald-600 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filter crops by name, category, farmer or farm..."
                  value={allProduceSearchQuery}
                  onChange={(e) => setAllProduceSearchQuery(e.target.value)}
                  className="w-full bg-emerald-50/50 border border-emerald-200/80 rounded-xl py-1.5 pl-8 pr-3 text-xs text-emerald-950 placeholder-emerald-700/50 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Modal Body: Listed Produce */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-emerald-50">
              {produceList.filter((prod) => {
                if (!allProduceSearchQuery.trim()) return true;
                const q = allProduceSearchQuery.toLowerCase();
                return (
                  prod.name.toLowerCase().includes(q) ||
                  (prod.category && prod.category.toLowerCase().includes(q)) ||
                  (prod.farmerName && prod.farmerName.toLowerCase().includes(q)) ||
                  (prod.farmName && prod.farmName.toLowerCase().includes(q))
                );
              }).length === 0 ? (
                <div className="py-8 text-center text-neutral-500 space-y-2">
                  <p className="text-xs font-bold text-emerald-950">No crops match your search or none currently listed.</p>
                  <p className="text-[11px]">When registered farmers add produce, listings will show here.</p>
                </div>
              ) : (
                produceList
                  .filter((prod) => {
                    if (!allProduceSearchQuery.trim()) return true;
                    const q = allProduceSearchQuery.toLowerCase();
                    return (
                      prod.name.toLowerCase().includes(q) ||
                      (prod.category && prod.category.toLowerCase().includes(q)) ||
                      (prod.farmerName && prod.farmerName.toLowerCase().includes(q)) ||
                      (prod.farmName && prod.farmName.toLowerCase().includes(q))
                    );
                  })
                  .map((prod) => {
                    const seller = registeredUsers.find(
                      (u) =>
                        u.id === prod.farmerId ||
                        (prod.farmName && u.farmName && u.farmName.toLowerCase() === prod.farmName.toLowerCase()) ||
                        (prod.farmerName && u.name.toLowerCase() === prod.farmerName.toLowerCase())
                    );

                    return (
                      <div key={prod.id} className="pt-3 first:pt-0 flex items-start gap-3">
                        {prod.imageUrl ? (
                          <img
                            src={prod.imageUrl}
                            alt={prod.name}
                            className="w-14 h-14 rounded-xl object-cover border border-emerald-100 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-base flex-shrink-0">
                            🥬
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <h4 className="text-xs font-bold text-emerald-950 truncate">
                              {prod.name}
                            </h4>
                            <span className="text-xs font-black text-emerald-700 flex-shrink-0">
                              ₱{prod.pricePerUnit}/{prod.unit}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-neutral-600">
                            <span className="bg-emerald-50 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                              {prod.category}
                            </span>
                            <span>Stock: {prod.stockQuantity} {prod.unit}s</span>
                          </div>

                          <p className="text-[10px] text-neutral-500 mt-1 truncate">
                            Farm: <span className="font-bold text-emerald-900">{prod.farmName || prod.farmerName || 'Local Farm'}</span>
                            {seller ? (
                              <span className="ml-1.5 text-emerald-600 font-medium">({seller.name})</span>
                            ) : (
                              <span className="ml-1.5 text-amber-600 font-medium">(Unregistered)</span>
                            )}
                          </p>

                          {/* Admin Listing Actions */}
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              onClick={() => {
                                setEditingProduceItem({ ...prod });
                              }}
                              className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 hover:underline cursor-pointer"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                            <span className="text-neutral-300">•</span>
                            <button
                              onClick={() => {
                                setProduceToDelete(prod);
                              }}
                              className="text-[11px] font-bold text-red-600 hover:text-red-800 flex items-center gap-1 hover:underline cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-emerald-100 bg-neutral-50 text-right">
              <button
                onClick={() => {
                  setIsBrowsingAllProduce(false);
                  setAllProduceSearchQuery('');
                }}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT USER PROFILE */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-emerald-100 animate-in slide-in-from-bottom-5">
            {/* Modal Header */}
            <div className="p-4 border-b border-emerald-100 flex items-center justify-between bg-emerald-50/50">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-xl text-white flex items-center justify-center ${
                  editingUser.role === 'transporter' && editingUser.status === 'pending'
                    ? 'bg-amber-600 shadow-xs'
                    : 'bg-emerald-600'
                }`}>
                  {editingUser.role === 'transporter' && editingUser.status === 'pending' ? (
                    <FileText className="w-4 h-4" />
                  ) : (
                    <Edit3 className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold text-emerald-950">
                      {editingUser.role === 'transporter' && editingUser.status === 'pending'
                        ? 'Transporter Approval Form'
                        : `Edit Profile: ${editingUser.name}`}
                    </h3>
                    {editingUser.role === 'transporter' && editingUser.status === 'pending' && (
                      <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[9px] font-extrabold px-1.5 py-0.2 rounded uppercase">
                        Pending Approval
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-emerald-700 font-medium">
                    {editingUser.role === 'transporter' && editingUser.status === 'pending'
                      ? 'Review hauler vehicle, phone, location & approve account'
                      : `ID: ${editingUser.id}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1.5 rounded-full hover:bg-emerald-100 text-neutral-500 hover:text-emerald-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Edit Form */}
            <form onSubmit={handleSaveUserEdit} className="flex-1 overflow-y-auto p-4 space-y-3.5">
              {editingUser.role === 'transporter' && editingUser.status === 'pending' && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5 shadow-2xs">
                  <Clock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-[11px] leading-relaxed">
                    <p className="font-bold text-amber-950">Application Pending Review</p>
                    <p className="text-amber-800">
                      Review this transporter&apos;s registered vehicle type, plate number, and municipality below. Approving will activate their login and grant Transporter Portal access.
                    </p>
                  </div>
                </div>
              )}
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-emerald-950 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full bg-emerald-50/40 border border-emerald-200 rounded-xl p-2.5 text-xs text-neutral-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                  required
                />
              </div>

              {/* Role Selector */}
              <div>
                <label className="block text-xs font-semibold text-emerald-950 mb-1">
                  Account Role
                </label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as UserRole })}
                  className="w-full bg-emerald-50/40 border border-emerald-200 rounded-xl p-2.5 text-xs text-neutral-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                >
                  <option value="farmer">Farmer (Mag-uuma)</option>
                  <option value="buyer">Buyer (Mamalitay)</option>
                  <option value="transporter">Transporter (Hauler)</option>
                </select>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-semibold text-emerald-950 mb-1">
                  Mobile No.
                </label>
                <input
                  type="text"
                  value={editingUser.phone}
                  onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                  className="w-full bg-emerald-50/40 border border-emerald-200 rounded-xl p-2.5 text-xs text-neutral-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-emerald-950 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={editingUser.email || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="w-full bg-emerald-50/40 border border-emerald-200 rounded-xl p-2.5 text-xs text-neutral-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs font-semibold text-emerald-950 mb-1">
                  Municipality / Location
                </label>
                <input
                  type="text"
                  value={editingUser.location}
                  onChange={(e) => setEditingUser({ ...editingUser, location: e.target.value })}
                  className="w-full bg-emerald-50/40 border border-emerald-200 rounded-xl p-2.5 text-xs text-neutral-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                  required
                />
              </div>

              {/* Farmer Farm Name */}
              {editingUser.role === 'farmer' && (
                <div>
                  <label className="block text-xs font-semibold text-emerald-950 mb-1">
                    Farm Name
                  </label>
                  <input
                    type="text"
                    value={editingUser.farmName || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, farmName: e.target.value })}
                    className="w-full bg-emerald-50/40 border border-emerald-200 rounded-xl p-2.5 text-xs text-neutral-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                  />
                </div>
              )}

              {/* Transporter Vehicle Details */}
              {editingUser.role === 'transporter' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-emerald-950 mb-1">
                      Vehicle Type
                    </label>
                    <input
                      type="text"
                      value={editingUser.vehicleType || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, vehicleType: e.target.value })}
                      className="w-full bg-emerald-50/40 border border-emerald-200 rounded-xl p-2.5 text-xs text-neutral-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-emerald-950 mb-1">
                      Plate / Body No.
                    </label>
                    <input
                      type="text"
                      value={editingUser.plateNumber || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, plateNumber: e.target.value })}
                      className="w-full bg-emerald-50/40 border border-emerald-200 rounded-xl p-2.5 text-xs text-neutral-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                    />
                  </div>
                </div>
              )}

              {/* Status & Verification Toggles */}
              <div className="pt-2 border-t border-emerald-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-emerald-950">Verified Member</p>
                  <p className="text-[10px] text-neutral-500">Enable green trust badge</p>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(editingUser.verified)}
                  onChange={(e) => setEditingUser({ ...editingUser, verified: e.target.checked })}
                  className="w-5 h-5 accent-emerald-600 cursor-pointer"
                />
              </div>

              <div className="pt-2 border-t border-emerald-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-emerald-950">Account Status</p>
                  <p className="text-[10px] text-neutral-500">Allow login & orders</p>
                </div>
                <select
                  value={editingUser.status || 'active'}
                  onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value as 'active' | 'suspended' | 'pending' })}
                  className="bg-emerald-50/40 border border-emerald-200 rounded-xl px-2.5 py-1 text-xs text-neutral-900 font-bold"
                >
                  <option value="pending">⏳ Pending Approval</option>
                  <option value="active">✓ Active (Approved)</option>
                  <option value="suspended">✕ Suspended</option>
                </select>
              </div>

              {/* Special Action: Approve Button if currently pending */}
              {editingUser.role === 'transporter' && editingUser.status === 'pending' && (
                <div className="pt-3 border-t border-emerald-100">
                  <button
                    id="btn-modal-approve-transporter"
                    type="button"
                    onClick={() => {
                      const approved: UserProfile = {
                        ...editingUser,
                        status: 'active',
                        verified: true,
                      };
                      onUpdateUser(approved);
                      showToast(`Approved ${approved.name}! They can now log in to the Transporter Portal.`);
                      setEditingUser(null);
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-98"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-100" />
                    <span>Approve & Activate Transporter</span>
                  </button>
                </div>
              )}

              {/* Form Buttons */}
              <div className="pt-4 border-t border-emerald-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: EDIT PRODUCE ITEM DETAILS */}
      {editingProduceItem && (
        <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-emerald-100 animate-in slide-in-from-bottom-5">
            <div className="p-4 border-b border-emerald-100 flex items-center justify-between bg-emerald-50/50">
              <h3 className="text-sm font-bold text-emerald-950">
                Edit Produce: {editingProduceItem.name}
              </h3>
              <button
                onClick={() => setEditingProduceItem(null)}
                className="p-1.5 rounded-full hover:bg-emerald-100 text-neutral-500 hover:text-emerald-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduceEdit} className="p-4 space-y-3 overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-emerald-950 mb-1">Crop Name</label>
                <input
                  type="text"
                  value={editingProduceItem.name}
                  onChange={(e) => setEditingProduceItem({ ...editingProduceItem, name: e.target.value })}
                  className="w-full bg-emerald-50/40 border border-emerald-200 rounded-xl p-2.5 text-xs text-neutral-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-emerald-950 mb-1">Price (₱)</label>
                  <input
                    type="number"
                    value={editingProduceItem.pricePerUnit}
                    onChange={(e) => setEditingProduceItem({ ...editingProduceItem, pricePerUnit: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-emerald-50/40 border border-emerald-200 rounded-xl p-2.5 text-xs text-neutral-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-emerald-950 mb-1">Stock Qty</label>
                  <input
                    type="number"
                    value={editingProduceItem.stockQuantity}
                    onChange={(e) => setEditingProduceItem({ ...editingProduceItem, stockQuantity: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-emerald-50/40 border border-emerald-200 rounded-xl p-2.5 text-xs text-neutral-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-emerald-950 mb-1">Harvest Status</label>
                <input
                  type="text"
                  value={editingProduceItem.harvestStatus}
                  onChange={(e) => setEditingProduceItem({ ...editingProduceItem, harvestStatus: e.target.value as any })}
                  className="w-full bg-emerald-50/40 border border-emerald-200 rounded-xl p-2.5 text-xs text-neutral-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                  required
                />
              </div>

              <div className="pt-3 border-t border-emerald-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingProduceItem(null)}
                  className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  <span>Update Listing</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE USER MODAL */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-xs rounded-3xl p-5 shadow-2xl border border-red-100 text-center space-y-3 animate-in zoom-in-95">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-neutral-900">Delete Profile?</h4>
              <p className="text-xs text-neutral-600 mt-1">
                Are you sure you want to remove <span className="font-bold text-neutral-950">{userToDelete.name}</span>?
              </p>
              {userToDelete.role === 'farmer' && (
                <div className="mt-2 p-2 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 text-left font-medium">
                  🌾 <strong>Cascading cleanup:</strong> All crop listings, marketplace items, and farm records belonging to this farmer will also be automatically removed from the platform.
                </div>
              )}
              <p className="text-[11px] text-neutral-500 mt-1.5">This action cannot be undone.</p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs cursor-pointer transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteUser(userToDelete.id);
                  setUserToDelete(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs cursor-pointer shadow-sm transition-all"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE PRODUCE MODAL */}
      {produceToDelete && (
        <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-xs rounded-3xl p-5 shadow-2xl border border-red-100 text-center space-y-3 animate-in zoom-in-95">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-neutral-900">Delete Crop Listing?</h4>
              <p className="text-xs text-neutral-600 mt-1">
                Are you sure you want to delete listing <span className="font-bold text-neutral-950">{produceToDelete.name}</span>?
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setProduceToDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs cursor-pointer transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteProduce) {
                    onDeleteProduce(produceToDelete.id);
                    showToast(`Deleted listing ${produceToDelete.name}`);
                  }
                  setProduceToDelete(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs cursor-pointer shadow-sm transition-all"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
