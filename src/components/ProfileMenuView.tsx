import React, { useState, useRef, useEffect } from 'react';
import {
  User,
  MapPin,
  Phone,
  Mail,
  Store,
  Truck,
  CheckCircle2,
  Camera,
  Upload,
  Save,
  LogOut,
  ShieldCheck,
  Sprout,
  ArrowRight,
  Sparkles,
  ShoppingBag,
  ClipboardList,
  MessageSquare,
  Map,
  Trash2,
} from 'lucide-react';
import { UserProfile, UserRole } from '../types';
import { resolveCoordinates } from '../utils/geoDistance';

interface ProfileMenuViewProps {
  currentUser: UserProfile;
  onSaveProfile: (updated: UserProfile) => void;
  onLogout: () => void;
  onNavigateTab?: (tab: string) => void;
  currentLocation?: string;
  onLocationClick?: () => void;
}

export const ProfileMenuView: React.FC<ProfileMenuViewProps> = ({
  currentUser,
  onSaveProfile,
  onLogout,
  onNavigateTab,
  currentLocation,
  onLocationClick,
}) => {
  const [name, setName] = useState(currentUser.name || '');
  const [email, setEmail] = useState(currentUser.email || '');
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [location, setLocation] = useState(currentUser.location || 'Dumaguete City, Negros Oriental');
  const [farmName, setFarmName] = useState(currentUser.farmName || '');
  const [avatar, setAvatar] = useState(currentUser.avatar || '');
  const [bio, setBio] = useState(currentUser.bio || '');

  const [isSaving, setIsSaving] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Synchronize local form state whenever currentUser changes (e.g. pinned on map)
  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || '');
      setEmail(currentUser.email || '');
      setPhone(currentUser.phone || '');
      setLocation(currentUser.location || 'Dumaguete City, Negros Oriental');
      setFarmName(currentUser.farmName || '');
      setAvatar(currentUser.avatar || '');
      setBio(currentUser.bio || '');
    }
  }, [currentUser]);

  // Also sync if currentLocation prop changes from parent
  useEffect(() => {
    if (currentLocation && currentLocation !== location) {
      setLocation(currentLocation);
    }
  }, [currentLocation]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (JPEG, PNG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatar(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatar(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter your full name.');
      return;
    }

    setIsSaving(true);

    const coords = resolveCoordinates(location.trim(), currentUser.latitude, currentUser.longitude);

    const updatedUser: UserProfile = {
      ...currentUser,
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      location: location.trim(),
      latitude: coords.lat,
      longitude: coords.lng,
      farmName: currentUser.role === 'farmer' ? farmName.trim() : currentUser.farmName,
      avatar: avatar.trim(),
      bio: bio.trim(),
    };

    onSaveProfile(updatedUser);

    setTimeout(() => {
      setIsSaving(false);
      setSavedFeedback(true);
      setTimeout(() => setSavedFeedback(false), 3000);
    }, 300);
  };

  const roleTitle =
    currentUser.role === 'farmer'
      ? 'Local Agricultural Grower'
      : 'Direct Produce Buyer';

  return (
    <div className="flex flex-col space-y-4 p-3.5 pb-8 w-full bg-white text-neutral-900">
      {/* View Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-emerald-950 font-display">
            {currentUser.role === 'farmer' ? 'Farm Profile & Account' : 'Account & Profile'}
          </h2>
          <p className="text-xs text-emerald-800/80 font-medium">
            {currentUser.role === 'farmer'
              ? 'Edit farm profile details, farm photo, story, and location'
              : 'Manage your personal information, contact numbers and credentials'}
          </p>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200">
          {currentUser.role}
        </span>
      </div>

      {/* Identity Summary Card */}
      <div className="bg-white border border-emerald-200/90 rounded-3xl p-4.5 shadow-xs relative overflow-hidden">
        <div className="flex items-start gap-3.5">
          {/* Avatar Preview with Camera Overlay */}
          <div className="relative flex-shrink-0">
            {avatar ? (
              <img
                src={avatar}
                alt={currentUser.name}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-500/80 shadow-xs bg-emerald-50"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xl shadow-xs">
                {name.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white flex items-center justify-center shadow-md cursor-pointer transition-transform active:scale-90"
              title={currentUser.role === 'farmer' ? "Upload new farm photo" : "Upload new photo"}
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Core Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-base font-bold text-emerald-950 truncate">
                {name || currentUser.name}
              </h3>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                Verified
              </span>
            </div>

            <p className="text-xs text-emerald-800/90 font-medium mt-0.5">
              {roleTitle}
            </p>

            <div className="flex items-center gap-1 text-[11px] text-neutral-600 mt-1 truncate">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <span className="truncate">{location}</span>
            </div>

            {currentUser.role === 'farmer' && farmName && (
              <div className="flex items-center gap-1 text-[11px] text-emerald-800 font-bold mt-1">
                <Sprout className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span className="truncate">{farmName}</span>
              </div>
            )}

            {/* Quick Farm Photo action buttons */}
            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold flex items-center gap-1 shadow-xs cursor-pointer active:scale-95 transition-all"
              >
                <Camera className="w-3 h-3" />
                <span>{avatar ? (currentUser.role === 'farmer' ? 'Change Farm Photo' : 'Change Photo') : (currentUser.role === 'farmer' ? 'Add Farm Photo' : 'Add Photo')}</span>
              </button>
              {avatar && (
                <button
                  type="button"
                  onClick={() => setAvatar('')}
                  className="px-2 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all"
                  title="Remove current photo"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Remove</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Quick Role Shortcuts */}
        <div className="mt-3.5 pt-3 border-t border-emerald-100/90 grid grid-cols-2 gap-2">
          {currentUser.role === 'farmer' ? (
            <button
              onClick={() => onNavigateTab && onNavigateTab('farmer-portal')}
              className="flex items-center justify-between p-2 rounded-xl bg-emerald-50/70 hover:bg-emerald-100/70 text-emerald-950 text-xs font-bold transition-colors cursor-pointer border border-emerald-200/60"
            >
              <span className="flex items-center gap-1.5">
                <Sprout className="w-4 h-4 text-emerald-600" />
                My Crop Listings
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-emerald-600" />
            </button>
          ) : (
            <button
              onClick={() => onNavigateTab && onNavigateTab('market')}
              className="flex items-center justify-between p-2 rounded-xl bg-emerald-50/70 hover:bg-emerald-100/70 text-emerald-950 text-xs font-bold transition-colors cursor-pointer border border-emerald-200/60"
            >
              <span className="flex items-center gap-1.5">
                <Store className="w-4 h-4 text-emerald-600" />
                Direct Market
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-emerald-600" />
            </button>
          )}

          <button
            onClick={() => onNavigateTab && onNavigateTab('orders')}
            className="flex items-center justify-between p-2 rounded-xl bg-emerald-50/70 hover:bg-emerald-100/70 text-emerald-950 text-xs font-bold transition-colors cursor-pointer border border-emerald-200/60"
          >
            <span className="flex items-center gap-1.5">
              <ClipboardList className="w-4 h-4 text-emerald-600" />
              Order History
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-emerald-600" />
          </button>
        </div>
      </div>

      {/* Edit Information Form */}
      <form onSubmit={handleSubmit} className="bg-white border border-emerald-200/90 rounded-3xl p-4.5 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between border-b border-emerald-100 pb-2.5">
          <div className="flex items-center gap-1.5">
            <User className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-emerald-950">
              Edit Account Information
            </h3>
          </div>
          <span className="text-[11px] text-neutral-500 font-medium">All updates save instantly</span>
        </div>

        {/* Full Name */}
        <div>
          <label className="block text-xs font-bold text-emerald-950 mb-1">
            Full Name <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-emerald-600/70 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="input-profile-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Maria Clara Santos"
              required
              className="w-full min-h-[44px] bg-emerald-50/40 border border-emerald-200/90 rounded-xl pl-9.5 pr-3 py-2 text-xs text-emerald-950 font-medium focus:outline-none focus:border-emerald-600 focus:bg-white transition-colors"
            />
          </div>
        </div>

        {/* Contact Phone & Email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-emerald-950 mb-1">
              Mobile No. <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-emerald-600/70 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="input-profile-phone"
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0917 123 4567"
                required
                className="w-full min-h-[44px] bg-emerald-50/40 border border-emerald-200/90 rounded-xl pl-9.5 pr-3 py-2 text-xs text-emerald-950 font-medium focus:outline-none focus:border-emerald-600 focus:bg-white transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-emerald-950 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-emerald-600/70 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="input-profile-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@gmail.com"
                className="w-full min-h-[44px] bg-emerald-50/40 border border-emerald-200/90 rounded-xl pl-9.5 pr-3 py-2 text-xs text-emerald-950 font-medium focus:outline-none focus:border-emerald-600 focus:bg-white transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Location / Municipality */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-emerald-950 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span>Municipality / Location (Negros Oriental)</span>
            </label>
            {onLocationClick && (
              <button
                type="button"
                id="btn-profile-pin-map"
                onClick={onLocationClick}
                className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-100/90 hover:bg-emerald-200 border border-emerald-300 px-2.5 py-1 rounded-xl flex items-center gap-1 transition-all cursor-pointer active:scale-95 shadow-2xs"
              >
                <Map className="w-3.5 h-3.5 text-emerald-700" />
                <span>📍 Pin on Map</span>
              </button>
            )}
          </div>
          <div className="relative">
            <MapPin className="w-4 h-4 text-emerald-600/70 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="input-profile-location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Jasonville Subdv, Barangay Junob, Dumaguete City..."
              className="w-full min-h-[44px] bg-emerald-50/40 border border-emerald-200/90 rounded-xl pl-9.5 pr-3 py-2 text-xs text-emerald-950 font-medium focus:outline-none focus:border-emerald-600 focus:bg-white transition-colors"
            />
          </div>
          {currentUser.latitude && currentUser.longitude && (
            <div className="flex items-center justify-between text-[10px] text-emerald-900 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              <span className="font-semibold">GPS Pinned Coordinates:</span>
              <span className="font-mono font-bold">
                {currentUser.latitude.toFixed(4)}° N, {currentUser.longitude.toFixed(4)}° E
              </span>
            </div>
          )}
        </div>

        {/* Farmer Specific Fields */}
        {currentUser.role === 'farmer' && (
          <div className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-200/80 space-y-3">
            <div className="flex items-center justify-between border-b border-emerald-200/60 pb-2">
              <div className="flex items-center gap-1.5">
                <Sprout className="w-4 h-4 text-emerald-700" />
                <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                  Edit Farm Profile & Information
                </span>
              </div>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-md">
                Grower Listing
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-emerald-950 mb-1">
                Farm Name
              </label>
              <input
                id="input-profile-farm-name"
                type="text"
                value={farmName}
                onChange={(e) => setFarmName(e.target.value)}
                placeholder="e.g. Valencia Mountain Organic Gardens"
                className="w-full min-h-[44px] bg-white border border-emerald-200 rounded-xl px-3 py-2 text-xs text-emerald-950 font-medium focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-emerald-950 mb-1">
                Farm Story / Bio
              </label>
              <textarea
                id="input-profile-bio"
                rows={2}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell buyers about your crop varieties, harvesting schedules, and soil care..."
                className="w-full bg-white border border-emerald-200 rounded-xl p-3 text-xs text-emerald-950 font-medium focus:outline-none focus:border-emerald-600 resize-none"
              />
            </div>
          </div>
        )}

        {/* Profile Photo Upload / URL */}
        <div>
          <label className="block text-xs font-bold text-emerald-950 mb-1">
            Photo / Avatar
          </label>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-3.5 text-center transition-colors ${
              isDragging
                ? 'border-emerald-600 bg-emerald-50'
                : 'border-emerald-200/90 bg-emerald-50/30'
            }`}
          >
            <div className="flex items-center justify-center gap-3">
              {avatar ? (
                <img
                  src={avatar}
                  alt="Profile"
                  className="w-12 h-12 rounded-xl object-cover border border-emerald-300 shadow-xs"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <User className="w-6 h-6" />
                </div>
              )}
              <div className="text-left">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer shadow-xs"
                >
                  Choose Image File
                </button>
                {avatar && (
                  <button
                    type="button"
                    onClick={() => setAvatar('')}
                    className="ml-2 text-[11px] text-red-600 hover:underline font-semibold cursor-pointer"
                  >
                    Remove
                  </button>
                )}
                <p className="text-[10px] text-neutral-500 mt-1">
                  Supports JPEG, PNG or WebP under 5MB
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-1">
          <button
            id="btn-save-profile-changes"
            type="submit"
            disabled={isSaving}
            className="w-full min-h-[48px] rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            {isSaving ? (
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving Changes...
              </span>
            ) : savedFeedback ? (
              <span className="flex items-center gap-1.5 text-white">
                <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                Information Saved Successfully!
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Save className="w-4 h-4" />
                Save Profile Changes
              </span>
            )}
          </button>
        </div>
      </form>

      {/* Account Settings & Sign Out Card */}
      <div className="bg-white border border-emerald-200/90 rounded-3xl p-4 shadow-xs space-y-3">
        <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
          Account Actions
        </h4>

        {onLocationClick && (
          <button
            onClick={onLocationClick}
            className="w-full flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/50 hover:bg-emerald-100/60 border border-emerald-100 text-xs font-semibold text-emerald-950 cursor-pointer transition-colors"
          >
            <span className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span>Change Delivery Zone / Territory</span>
            </span>
            <span className="text-[11px] text-emerald-700 font-bold truncate max-w-[180px]">
              {location ? location.split('(')[0].trim() : 'Dumaguete'}
            </span>
          </button>
        )}

        {/* Logout Button */}
        <button
          id="btn-profile-logout"
          onClick={() => setShowLogoutConfirm(true)}
          className="w-full min-h-[46px] rounded-2xl bg-red-50 hover:bg-red-100/80 border border-red-200 text-red-700 hover:text-red-800 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99]"
        >
          <LogOut className="w-4 h-4" />
          <span>Log Out of Account</span>
        </button>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="absolute inset-0 z-50 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-xs rounded-3xl p-5 shadow-2xl border border-red-100 text-center space-y-3 animate-in zoom-in-95">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
              <LogOut className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-neutral-900">Sign Out?</h4>
              <p className="text-xs text-neutral-600 mt-1">
                Are you sure you want to log out of <span className="font-bold text-neutral-950">{currentUser.name}</span>?
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs cursor-pointer transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  onLogout();
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs cursor-pointer shadow-sm transition-all"
              >
                Yes, Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
