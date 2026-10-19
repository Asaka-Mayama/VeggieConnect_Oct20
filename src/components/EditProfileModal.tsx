import React, { useState, useRef } from 'react';
import {
  X,
  Camera,
  Upload,
  User,
  MapPin,
  Phone,
  Store,
  Truck,
  Check,
  Trash2,
  FileText,
  Map,
} from 'lucide-react';
import { UserProfile } from '../types';
import { AddressMapPickerModal } from './AddressMapPickerModal';
import { resolveCoordinates } from '../utils/geoDistance';

interface EditProfileModalProps {
  currentUser: UserProfile;
  onClose: () => void;
  onSaveProfile: (updated: UserProfile) => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  currentUser,
  onClose,
  onSaveProfile,
}) => {
  const [name, setName] = useState(currentUser.name || '');
  const [location, setLocation] = useState(currentUser.location || '');
  const [latitude, setLatitude] = useState<number | undefined>(currentUser.latitude);
  const [longitude, setLongitude] = useState<number | undefined>(currentUser.longitude);
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [farmName, setFarmName] = useState(currentUser.farmName || '');
  const [avatar, setAvatar] = useState(currentUser.avatar || '');
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (JPEG, PNG, WebP).');
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
      alert('Please upload an image file.');
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
    if (!name.trim()) return;

    setIsSubmitting(true);

    const resolvedCoords = resolveCoordinates(location.trim(), latitude, longitude);

    const updatedUser: UserProfile = {
      ...currentUser,
      name: name.trim(),
      location: location.trim(),
      latitude: resolvedCoords.lat,
      longitude: resolvedCoords.lng,
      phone: phone.trim(),
      farmName: currentUser.role === 'farmer' ? farmName.trim() : currentUser.farmName,
      avatar: avatar.trim(),
    };

    setSavedSuccess(true);
    setTimeout(() => {
      onSaveProfile(updatedUser);
      onClose();
    }, 400);
  };

  const roleLabel =
    currentUser.role === 'farmer'
      ? 'Farmer Account'
      : 'Direct Buyer Account';

  return (
    <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end sm:justify-center p-0 animate-in fade-in duration-200">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-h-[92%] overflow-y-auto shadow-2xl flex flex-col text-neutral-900 border-t sm:border border-neutral-200">
        {/* Modal Header */}
        <div className="p-4 border-b border-neutral-200 flex items-center justify-between bg-white sticky top-0 z-10">
          <div>
            <h2 className="text-base font-extrabold text-neutral-900 font-display">
              Edit Account Profile
            </h2>
            <p className="text-xs text-emerald-700 font-semibold">{roleLabel}</p>
          </div>
          <button
            id="btn-close-edit-profile"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 hover:text-neutral-900 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto space-y-4 flex-1">
          {/* Profile Picture Section */}
          <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-200 space-y-3">
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">
              Profile Picture
            </label>

            <div className="flex items-center gap-4">
              {/* Picture Avatar Preview */}
              <div className="relative flex-shrink-0">
                {avatar ? (
                  <img
                    src={avatar}
                    alt="Profile preview"
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-emerald-500 shadow-md bg-white"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-white border-2 border-dashed border-neutral-300 flex flex-col items-center justify-center text-neutral-400 shadow-xs">
                    <User className="w-8 h-8 text-neutral-400" />
                    <span className="text-[10px] text-neutral-400 mt-1 font-medium">No photo</span>
                  </div>
                )}
                {avatar && (
                  <button
                    type="button"
                    onClick={() => setAvatar('')}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow transition-colors cursor-pointer"
                    title="Remove profile picture"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Upload Controls */}
              <div className="flex-1 space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  id="profile-picture-input"
                />

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition-all ${
                    isDragging
                      ? 'border-emerald-600 bg-emerald-50'
                      : 'border-neutral-300 hover:border-emerald-500 bg-white hover:bg-neutral-50'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-800">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload photo from device</span>
                  </div>
                  <p className="text-[10px] text-neutral-500 mt-0.5">
                    Click to browse camera, gallery or drag file
                  </p>
                </div>

                {avatar && (
                  <p className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 text-emerald-600" /> Custom photo selected
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-600" />
                <span>Account Name *</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Mang Pedro Balderas"
                className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:bg-white focus:border-emerald-600 transition-colors"
              />
            </div>

            {/* Address with Google Maps Realtime Pinning */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-neutral-700 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Location / Address *</span>
                </label>
                <button
                  type="button"
                  id="btn-open-map-picker-profile"
                  onClick={() => setShowMapPicker(true)}
                  className="text-emerald-700 hover:text-emerald-900 text-xs font-bold flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg cursor-pointer hover:bg-emerald-100 transition-colors"
                >
                  <Map className="w-3.5 h-3.5" />
                  <span>📍 Pin on Google Map</span>
                </button>
              </div>

              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Sitio Nasunogan, Valencia, Negros Oriental"
                className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:bg-white focus:border-emerald-600 transition-colors"
              />

              {latitude !== undefined && longitude !== undefined && (
                <div className="flex items-center justify-between text-[10px] text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  <span className="font-semibold">GPS Coordinates Pinned:</span>
                  <span className="font-mono font-bold">
                    {latitude.toFixed(4)}° N, {longitude.toFixed(4)}° E
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span>Mobile Phone *</span>
              </label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 0917-888-2341"
                className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:bg-white focus:border-emerald-600 transition-colors"
              />
            </div>

            {/* Farmer Specific Fields */}
            {currentUser.role === 'farmer' && (
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1 flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Farm / Brand Name</span>
                </label>
                <input
                  type="text"
                  value={farmName}
                  onChange={(e) => setFarmName(e.target.value)}
                  placeholder="e.g. Green Valley Highland Farm"
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:bg-white focus:border-emerald-600 transition-colors"
                />
              </div>
            )}

          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-neutral-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-neutral-600 hover:text-neutral-900 text-xs font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || savedSuccess}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all active:scale-95 shadow-md cursor-pointer ${
                savedSuccess
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
              }`}
            >
              {savedSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[3]" /> Saved!
                </>
              ) : (
                'Save Profile Changes'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Interactive Google Map Location Picker */}
      {showMapPicker && (
        <AddressMapPickerModal
          onClose={() => setShowMapPicker(false)}
          initialAddress={location}
          initialLat={latitude}
          initialLng={longitude}
          onConfirmLocation={(newAddress, lat, lng) => {
            setLocation(newAddress);
            setLatitude(lat);
            setLongitude(lng);
            setShowMapPicker(false);
          }}
        />
      )}
    </div>
  );
};
