import React, { useState, useRef, useMemo } from 'react';
import { X, Sprout, Sparkles, Upload, Camera, CheckCircle2, AlertCircle, TrendingUp, Info } from 'lucide-react';
import { ProduceItem } from '../types';
import { findMatchingDAPrice } from '../data/daPricesData';
import { DAPriceWatchModal } from './DAPriceWatchModal';

interface AddProduceModalProps {
  onClose: () => void;
  onAddProduce?: (produce: Omit<ProduceItem, 'id' | 'rating' | 'reviewsCount'>) => void;
  onEditProduce?: (produce: ProduceItem) => void;
  initialProduce?: ProduceItem | null;
  farmerId: string;
  farmerName: string;
  farmName: string;
  farmerLocation?: string;
  farmerLatitude?: number;
  farmerLongitude?: number;
  distanceKm: number;
}

export const AddProduceModal: React.FC<AddProduceModalProps> = ({
  onClose,
  onAddProduce,
  onEditProduce,
  initialProduce,
  farmerId,
  farmerName,
  farmName,
  farmerLocation,
  farmerLatitude,
  farmerLongitude,
  distanceKm,
}) => {
  const isEditMode = Boolean(initialProduce);

  const [name, setName] = useState(initialProduce?.name || '');
  const [pricePerUnit, setPricePerUnit] = useState(
    initialProduce ? initialProduce.pricePerUnit.toFixed(2) : '45.00'
  );
  const [stockQuantity, setStockQuantity] = useState(
    initialProduce ? initialProduce.stockQuantity.toString() : '50'
  );
  // Fresh-pick only: every lot is picked fresh once the supermarket confirms the order.
  // No pre-harvested options, no schedule notes.
  const FRESH_PICK_STATUS = 'Fresh Picked on Order' as const;
  const FRESH_PICK_NOTE = 'Picked fresh on order confirmation' as const;
  const [imageUrl, setImageUrl] = useState(
    initialProduce?.imageUrl ||
      'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80'
  );
  const [description, setDescription] = useState(initialProduce?.description || '');
  const [minOrderQuantity, setMinOrderQuantity] = useState(
    initialProduce?.minOrderQuantity ? initialProduce.minOrderQuantity.toString() : '1'
  );

  // Photo tab and file upload states
  const [photoSourceTab, setPhotoSourceTab] = useState<'device' | 'url'>('device');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadFileName, setUploadFileName] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Intelligent Price Guide helper
  const matchedDAPrice = useMemo(() => {
    return findMatchingDAPrice(name);
  }, [name]);
  const [showDABulletinModal, setShowDABulletinModal] = useState(false);

  const handleSmartPriceSuggest = () => {
    if (matchedDAPrice) {
      setPricePerUnit(matchedDAPrice.suggestedDirectFarmPrice.toFixed(2));
    } else {
      setPricePerUnit('45.00');
    }
  };

  // Process selected file from device
  const processFile = (file: File) => {
    setUploadError(null);
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (JPEG, PNG, WEBP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Image size is too large (max 10MB).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === 'string') {
        setImageUrl(result);
        setUploadFileName(file.name);
      }
    };
    reader.onerror = () => {
      setUploadError('Failed to read file from device.');
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (isEditMode && initialProduce && onEditProduce) {
      onEditProduce({
        ...initialProduce,
        name: name.trim(),
        category: initialProduce.category || 'Vegetables',
        pricePerUnit: parseFloat(pricePerUnit) || 0,
        unit: 'kg',
        stockQuantity: parseInt(stockQuantity, 10) || 0,
        harvestStatus: FRESH_PICK_STATUS,
        harvestDate: FRESH_PICK_NOTE,
        imageUrl,
        isOrganic: false,
        description: description.trim(),
        minOrderQuantity: parseInt(minOrderQuantity, 10) || 1,
      });
    } else if (onAddProduce) {
      onAddProduce({
        farmerId,
        farmerName,
        farmName,
        name: name.trim(),
        category: 'Vegetables',
        pricePerUnit: parseFloat(pricePerUnit) || 0,
        unit: 'kg',
        stockQuantity: parseInt(stockQuantity, 10) || 0,
        harvestStatus: FRESH_PICK_STATUS,
        harvestDate: FRESH_PICK_NOTE,
        imageUrl,
        isOrganic: false,
        description: description.trim(),
        location: farmerLocation || 'Dumaguete City, Negros Oriental',
        latitude: farmerLatitude,
        longitude: farmerLongitude,
        distanceKm: distanceKm || 1.5,
        minOrderQuantity: parseInt(minOrderQuantity, 10) || 1,
      });
    }

    onClose();
  };

  return (
    <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end sm:justify-center p-0 animate-in fade-in duration-200">
      <div
        id="add-produce-modal"
        className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-h-[92%] overflow-y-auto shadow-2xl flex flex-col text-neutral-900 border-t sm:border border-neutral-200"
      >
        {/* Header - Clean White */}
        <div className="p-4 border-b border-neutral-200 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold bg-emerald-100 text-emerald-800">
              <Sprout className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-neutral-900 font-display">
                {isEditMode ? 'Edit Vegetable Listing' : 'List Vegetable for Sale'}
              </h3>
              <p className="text-[10px] text-emerald-700 font-medium">Add your fresh harvest for supermarket store purchase</p>
            </div>
          </div>
          <button
            id="btn-close-add-modal"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-100 text-neutral-600 flex items-center justify-center hover:bg-neutral-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Photo Section with Device Upload Option */}
          <div className="space-y-2 bg-neutral-50 p-3 rounded-2xl border border-neutral-200">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-emerald-600" />
                Produce Photo
              </label>

              <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-neutral-200 text-[10px]">
                <button
                  type="button"
                  id="tab-photo-device"
                  onClick={() => setPhotoSourceTab('device')}
                  className={`px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                    photoSourceTab === 'device'
                      ? 'bg-emerald-600 text-white'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  From Device
                </button>
                <button
                  type="button"
                  id="tab-photo-url"
                  onClick={() => setPhotoSourceTab('url')}
                  className={`px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                    photoSourceTab === 'url'
                      ? 'bg-emerald-600 text-white'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  URL Link
                </button>
              </div>
            </div>

            {/* Hidden File Input for Device Photo */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileInputChange}
            />

            {/* TAB 1: Upload from Device */}
            {photoSourceTab === 'device' && (
              <div className="space-y-2">
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                    isDragging
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-neutral-300 hover:border-emerald-500 bg-white'
                  }`}
                >
                  <div className="flex flex-col items-center justify-center space-y-1.5">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <Upload className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-bold text-neutral-900">
                      Click to choose photo or drag & drop here
                    </p>
                    <p className="text-[10px] text-neutral-500">
                      Snap with phone camera or select image from gallery (JPG, PNG, WEBP)
                    </p>
                  </div>
                </div>

                {uploadFileName && (
                  <div className="flex items-center justify-between text-xs bg-white px-3 py-1.5 rounded-xl border border-neutral-200 text-neutral-700">
                    <span className="flex items-center gap-1.5 truncate text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                      <span className="truncate">Loaded: {uploadFileName}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-[10px] text-emerald-700 hover:underline font-bold ml-2 flex-shrink-0 cursor-pointer"
                    >
                      Change
                    </button>
                  </div>
                )}

                {uploadError && (
                  <div className="text-[11px] text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>{uploadError}</span>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Web Image URL */}
            {photoSourceTab === 'url' && (
              <div className="space-y-1">
                <p className="text-[10px] text-neutral-500">Paste an online image link:</p>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => {
                    setImageUrl(e.target.value);
                    setUploadFileName(null);
                  }}
                  placeholder="https://..."
                  className="w-full bg-white border border-neutral-300 rounded-xl px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:border-emerald-600"
                />
              </div>
            )}

            {/* Image Preview Banner */}
            {imageUrl && (
              <div className="pt-2 border-t border-neutral-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <img
                    src={imageUrl}
                    alt="Active Produce Preview"
                    className="w-12 h-12 rounded-xl object-cover border border-neutral-300 bg-white flex-shrink-0"
                  />
                  <div>
                    <span className="text-[11px] font-bold text-neutral-900 block">Current Photo Preview</span>
                    <span className="text-[10px] text-emerald-700 font-semibold">Ready to display in marketplace</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-[11px] font-bold text-neutral-800 transition-colors cursor-pointer"
                >
                  Upload New
                </button>
              </div>
            )}
          </div>

          {/* Produce Name */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-800">
              Produce Name *
            </label>
            <input
              id="input-produce-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Fresh Native Tomatoes, Ampalaya, Sitaw..."
              className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:bg-white focus:border-emerald-600"
            />
          </div>

          {/* Price (per kg only) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-neutral-800">Your Farm-gate Asking Price (₱ per kg) *</label>
              <button
                type="button"
                onClick={handleSmartPriceSuggest}
                className="text-[10px] text-emerald-700 hover:underline flex items-center gap-0.5 font-bold cursor-pointer"
                title="Calculate fair regional price in Negros Oriental"
              >
                <Sparkles className="w-2.5 h-2.5" /> DA Farmgate Rate
              </button>
            </div>
            <div className="relative">
              <span className="text-xs font-extrabold text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2">
                ₱
              </span>
              <input
                id="input-produce-price"
                type="number"
                step="1.00"
                min="1.00"
                required
                value={pricePerUnit}
                onChange={(e) => setPricePerUnit(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-300 rounded-xl pl-7 pr-14 py-2 text-xs text-neutral-900 focus:outline-none focus:bg-white focus:border-emerald-600 font-bold"
              />
              <span className="text-xs text-neutral-500 font-medium absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                / kg
              </span>
            </div>
          </div>

          {/* DA Price Recommendation Card - Negros Oriental */}
          {matchedDAPrice ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 space-y-2 text-xs animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-neutral-900">
                  <Sprout className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                  <span>DA Price Guide: {matchedDAPrice.commodity}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDABulletinModal(true)}
                  className="text-[10px] text-emerald-800 hover:underline flex items-center gap-0.5 font-bold cursor-pointer"
                >
                  <TrendingUp className="w-3 h-3" /> Full DA Sheet
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-white rounded-xl p-2 border border-neutral-200 text-center shadow-xs">
                <div>
                  <span className="text-[10px] text-emerald-800 font-bold block">Suggested Direct</span>
                  <span className="text-sm font-black text-emerald-700">₱{matchedDAPrice.suggestedDirectFarmPrice.toFixed(2)}/kg</span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-500 block">Wet Market Retail</span>
                  <span className="text-sm font-bold text-neutral-900">₱{matchedDAPrice.prevailingRetailPrice.toFixed(2)}/kg</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-0.5">
                <span className="text-[10px] text-neutral-600">
                  Negros Oriental market rate
                </span>
                <button
                  type="button"
                  onClick={() => setPricePerUnit(matchedDAPrice.suggestedDirectFarmPrice.toFixed(2))}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs active:scale-95 transition-all cursor-pointer"
                >
                  <span>Use Price (₱{matchedDAPrice.suggestedDirectFarmPrice})</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-2.5 flex items-center justify-between text-xs text-neutral-600">
              <span className="flex items-center gap-1 text-[11px]">
                <Info className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                <span>Want to see today's official DA prices for all vegetables?</span>
              </span>
              <button
                type="button"
                onClick={() => setShowDABulletinModal(true)}
                className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Check Price Watch</span>
              </button>
            </div>
          )}

          {/* Stock Quantity & Fresh-Pick Badge */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-800">
                Available Stock (kg) *
              </label>
              <input
                id="input-produce-stock"
                type="number"
                min="0"
                required
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-2.5 py-2 text-xs text-neutral-900 focus:outline-none focus:bg-white focus:border-emerald-600 font-bold"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-800">Harvest Terms</label>
              <div className="w-full bg-emerald-50 border border-emerald-300 rounded-xl px-2 py-2 text-xs font-bold text-emerald-800 flex items-center">
                🌱 Fresh picked on Order
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-800">Description</label>
            <textarea
              id="textarea-produce-description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe taste, freshness, optimal culinary use..."
              className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:bg-white focus:border-emerald-600"
            />
          </div>

          {/* Submit */}
          <button
            id="btn-submit-add-produce"
            type="submit"
            className="w-full py-3 font-bold text-sm rounded-xl transition-all shadow-md active:scale-95 cursor-pointer bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            {isEditMode ? 'Save Crop Changes' : 'Submit Harvest to Seller (Admin)'}
          </button>
        </form>
      </div>

      {/* Embedded DA Price Watch Modal */}
      {showDABulletinModal && (
        <DAPriceWatchModal
          onClose={() => setShowDABulletinModal(false)}
          initialSearch={name}
        />
      )}
    </div>
  );
};
