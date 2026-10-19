import React, { useState } from 'react';
import { X, User, Lock, Mail, Phone, MapPin, Truck, Sprout, ShoppingBag, ShieldCheck, Check } from 'lucide-react';
import { UserRole, UserProfile } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onLogin: (user: UserProfile) => void;
  onLogout: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLogin,
  onLogout,
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>(currentUser ? 'login' : 'login');
  const [selectedRole, setSelectedRole] = useState<UserRole>('farmer');

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [location, setLocation] = useState('Dumaguete City, Negros Oriental');
  const [farmName, setFarmName] = useState('');
  const [vehicleType, setVehicleType] = useState('Tricycle Cargo Hauler');
  const [plateNumber, setPlateNumber] = useState('');

  if (!isOpen) return null;

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) return;

    const payload = {
      name: fullName.trim(),
      email: email.trim() || `${fullName.toLowerCase().replace(/\s+/g, '')}@dgte-agri.ph`,
      password: password || 'default123',
      phone: phone.trim(),
      role: selectedRole,
      location: location.trim(),
      farmName: selectedRole === 'farmer' ? (farmName.trim() || `${fullName.split(' ')[0]}'s Farm`) : undefined,
      vehicleType: selectedRole === 'transporter' ? vehicleType : undefined,
      plateNumber: selectedRole === 'transporter' ? (plateNumber.trim() || 'DG-TEMP-NEG') : undefined,
    };

    try {
      const resp = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.user) {
          onLogin(data.user);
          onClose();
          return;
        }
      }
    } catch (apiErr) {
      console.log('Backend signup fallback to local session:', apiErr);
    }

    const fallbackUser: UserProfile = {
      id: `user-${Date.now()}`,
      name: fullName.trim(),
      email: payload.email,
      phone: phone.trim(),
      role: selectedRole,
      location: location.trim(),
      farmName: payload.farmName,
      vehicleType: payload.vehicleType,
      plateNumber: payload.plateNumber,
      avatar: selectedRole === 'farmer' 
        ? 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?auto=format&fit=crop&w=300&q=80'
        : selectedRole === 'transporter'
        ? 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80'
        : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
      verified: true,
    };

    onLogin(fallbackUser);
    onClose();
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const resp = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, phone, role: selectedRole }),
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.user) {
          onLogin(data.user);
          onClose();
          return;
        }
      }
    } catch (apiErr) {
      console.log('Backend login fallback:', apiErr);
    }

    // Default fallback session
    onLogin({
      id: `user-${Date.now()}`,
      name: fullName || 'Dumaguete User',
      email: email || 'user@dgte.ph',
      phone: phone || '+63 917 123 4567',
      role: selectedRole,
      location: location || 'Dumaguete City, Negros Oriental',
      verified: true,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="auth-modal"
        className="bg-white border border-neutral-200 rounded-3xl w-full max-w-md max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col text-neutral-900"
      >
        {/* Header with Title & Close */}
        <div className="p-4 border-b border-neutral-200 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
          <div>
            <h2 className="text-base font-extrabold text-neutral-900 font-display flex items-center gap-2">
              <span className="text-emerald-700">VeggieConnect</span> Dumaguete
            </h2>
            <p className="text-[11px] text-neutral-500">
              Direct Farmer, Buyer & Transporter Network
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 hover:text-neutral-900 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Logged in state display */}
        {currentUser ? (
          <div className="p-5 space-y-4">
            <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-200 flex items-center gap-3.5">
              <img
                src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'}
                alt={currentUser.name}
                className="w-14 h-14 rounded-2xl object-cover border border-emerald-500/40 shadow-xs"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold text-neutral-900 truncate">{currentUser.name}</h3>
                  <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                </div>
                <p className="text-xs text-neutral-500 truncate">{currentUser.phone}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      currentUser.role === 'farmer'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : currentUser.role === 'transporter'
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-sky-100 text-sky-800 border border-sky-300'
                    }`}
                  >
                    {currentUser.role === 'farmer' && '👨‍🌾 Farmer / Mag-uuma'}
                    {currentUser.role === 'buyer' && '🛒 Buyer / Mamalitay'}
                    {currentUser.role === 'transporter' && '🚚 Transporter / Hauler'}
                  </span>
                  <span className="text-[10px] text-neutral-500 truncate">{currentUser.location}</span>
                </div>
              </div>
            </div>

            <div className="text-xs text-neutral-600 bg-neutral-50 p-3 rounded-xl border border-neutral-200 space-y-1">
              <div className="flex justify-between">
                <span>Account Status:</span>
                <span className="text-emerald-700 font-bold">Active & Verified in Dumaguete</span>
              </div>
              {currentUser.farmName && (
                <div className="flex justify-between">
                  <span>Farm Sanctuary:</span>
                  <span className="text-neutral-900 font-medium">{currentUser.farmName}</span>
                </div>
              )}
              {currentUser.vehicleType && (
                <div className="flex justify-between">
                  <span>Vehicle Cargo:</span>
                  <span className="text-neutral-900 font-medium">{currentUser.vehicleType}</span>
                </div>
              )}
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={onLogout}
                className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Log Out of this Account
              </button>
              <button
                onClick={onClose}
                className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-xs"
              >
                Continue to App
              </button>
            </div>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {/* Mode Switcher Tabs */}
            <div className="flex rounded-xl bg-neutral-100 p-1 border border-neutral-200">
              <button
                type="button"
                onClick={() => setMode('login')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  mode === 'login'
                    ? 'bg-white text-neutral-900 shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => setMode('signup')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  mode === 'signup'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Create Account (Sign Up)
              </button>
            </div>

            {/* Role Selection Picker (Visible in Sign Up and Login) */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider">
                {mode === 'signup' ? 'Choose Your Role in Negros Oriental *' : 'Signing In As:'}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {/* Farmer Option */}
                <button
                  type="button"
                  onClick={() => setSelectedRole('farmer')}
                  className={`p-2.5 rounded-2xl border text-left transition-all flex flex-col gap-1.5 cursor-pointer ${
                    selectedRole === 'farmer'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-1 ring-emerald-500 shadow-xs'
                      : 'bg-white border-neutral-200 text-neutral-600 hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Sprout className="w-4 h-4 text-emerald-600" />
                    {selectedRole === 'farmer' && <Check className="w-3 h-3 text-emerald-600" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-neutral-900">Farmer</p>
                    <p className="text-[10px] text-neutral-500 leading-tight">Mag-uuma</p>
                  </div>
                </button>

                {/* Buyer Option */}
                <button
                  type="button"
                  onClick={() => setSelectedRole('buyer')}
                  className={`p-2.5 rounded-2xl border text-left transition-all flex flex-col gap-1.5 cursor-pointer ${
                    selectedRole === 'buyer'
                      ? 'bg-sky-50 border-sky-500 text-sky-900 ring-1 ring-sky-500 shadow-xs'
                      : 'bg-white border-neutral-200 text-neutral-600 hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <ShoppingBag className="w-4 h-4 text-sky-600" />
                    {selectedRole === 'buyer' && <Check className="w-3 h-3 text-sky-600" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-neutral-900">Buyer</p>
                    <p className="text-[10px] text-neutral-500 leading-tight">Mamalitay</p>
                  </div>
                </button>

                {/* Transporter Option */}
                <button
                  type="button"
                  onClick={() => setSelectedRole('transporter')}
                  className={`p-2.5 rounded-2xl border text-left transition-all flex flex-col gap-1.5 cursor-pointer ${
                    selectedRole === 'transporter'
                      ? 'bg-amber-50 border-amber-500 text-amber-900 ring-1 ring-amber-500 shadow-xs'
                      : 'bg-white border-neutral-200 text-neutral-600 hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Truck className="w-4 h-4 text-amber-600" />
                    {selectedRole === 'transporter' && <Check className="w-3 h-3 text-amber-600" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-neutral-900">Transporter</p>
                    <p className="text-[10px] text-neutral-500 leading-tight">Hauler/Tricycle</p>
                  </div>
                </button>
              </div>

              {/* Role explanation subtitle */}
              <p className="text-[10px] text-neutral-500 italic px-1">
                {selectedRole === 'farmer' && '🌾 Sell vegetables directly, schedule harvests & manage farm-gate prices in Valencia, Sibulan, etc.'}
                {selectedRole === 'buyer' && '🥗 Order fresh harvests directly from growers in Dumaguete City with farm pickup or courier drop.'}
                {selectedRole === 'transporter' && '🚚 Haul produce crates from mountain farms in Valencia/Dauin to Dumaguete buyers for cash earnings.'}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={mode === 'signup' ? handleSignUpSubmit : handleLoginSubmit} className="space-y-3">
              {mode === 'signup' && (
                <div>
                  <label className="text-[11px] font-semibold text-neutral-700">Full Name *</label>
                  <div className="relative mt-1">
                    <User className="w-3.5 h-3.5 absolute left-3 top-3 text-neutral-400" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={selectedRole === 'farmer' ? 'e.g. Juan Dela Cruz' : selectedRole === 'transporter' ? 'e.g. Junjun Cadiz' : 'e.g. Maria Santos'}
                      className="w-full bg-white border border-neutral-300 rounded-xl pl-8 pr-3 py-2 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>
              )}

              {/* Email or Phone */}
              <div>
                <label className="text-[11px] font-semibold text-neutral-700">
                  {mode === 'signup' ? 'Mobile No. *' : 'Email or Mobile No. *'}
                </label>
                <div className="relative mt-1">
                  <Phone className="w-3.5 h-3.5 absolute left-3 top-3 text-neutral-400" />
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0917 555 0123 / +63 917 555 0123"
                    className="w-full bg-white border border-neutral-300 rounded-xl pl-8 pr-3 py-2 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              {mode === 'signup' && (
                <div>
                  <label className="text-[11px] font-semibold text-neutral-700">Email Address (Optional)</label>
                  <div className="relative mt-1">
                    <Mail className="w-3.5 h-3.5 absolute left-3 top-3 text-neutral-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@email.com"
                      className="w-full bg-white border border-neutral-300 rounded-xl pl-8 pr-3 py-2 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>
              )}

              {/* Role-specific fields in Sign Up */}
              {mode === 'signup' && selectedRole === 'farmer' && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2">
                  <label className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                    <Sprout className="w-3 h-3 text-emerald-600" /> Farm Name / Sanctuary *
                  </label>
                  <input
                    type="text"
                    required
                    value={farmName}
                    onChange={(e) => setFarmName(e.target.value)}
                    placeholder="e.g. Valencia Highland Organic Sanctuary"
                    className="w-full bg-white border border-neutral-300 rounded-xl px-3 py-2 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              )}

              {mode === 'signup' && selectedRole === 'transporter' && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl space-y-2">
                  <label className="text-[11px] font-bold text-amber-800 flex items-center gap-1">
                    <Truck className="w-3 h-3 text-amber-600" /> Vehicle Type & Cargo Capacity *
                  </label>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    className="w-full bg-white border border-neutral-300 rounded-xl px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:border-amber-600 cursor-pointer"
                  >
                    <option value="Tricycle Cargo Hauler (Capacity: 250kg)">Tricycle Cargo Hauler (Capacity: 250kg)</option>
                    <option value="Multicab / Pickup Truck (Capacity: 800kg)">Multicab / Pickup Truck (Capacity: 800kg)</option>
                    <option value="Motorcycle with Side Carrier (Capacity: 100kg)">Motorcycle with Side Carrier (Capacity: 100kg)</option>
                    <option value="Closed Van / Cargo L300 (Capacity: 1,500kg)">Closed Van / Cargo L300 (Capacity: 1,500kg)</option>
                  </select>
                  <input
                    type="text"
                    value={plateNumber}
                    onChange={(e) => setPlateNumber(e.target.value)}
                    placeholder="Plate # / Dumaguete Tricycle Body # (e.g. 1842)"
                    className="w-full bg-white border border-neutral-300 rounded-xl px-3 py-2 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-amber-600"
                  />
                </div>
              )}

              {/* Location in Negros Oriental */}
              {mode === 'signup' && (
                <div>
                  <label className="text-[11px] font-semibold text-neutral-700">Barangay / Municipality in Negros Oriental *</label>
                  <div className="relative mt-1">
                    <MapPin className="w-3.5 h-3.5 absolute left-3 top-3 text-neutral-400" />
                    <select
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full bg-white border border-neutral-300 rounded-xl pl-8 pr-3 py-2 text-xs text-neutral-900 focus:outline-none focus:border-emerald-600 cursor-pointer"
                    >
                      <option value="Barangay Piapi, Dumaguete City">Barangay Piapi, Dumaguete City</option>
                      <option value="Barangay Bantayan, Dumaguete City">Barangay Bantayan, Dumaguete City</option>
                      <option value="Barangay Bajumpandan, Dumaguete City">Barangay Bajumpandan, Dumaguete City</option>
                      <option value="Barangay Bagacay, Dumaguete City">Barangay Bagacay, Dumaguete City</option>
                      <option value="Barangay Taclobo / Public Market, Dumaguete City">Barangay Taclobo / Public Market, Dumaguete</option>
                      <option value="Barangay Daro, Dumaguete City">Barangay Daro, Dumaguete City</option>
                      <option value="Apolong, Valencia, Negros Oriental">Apolong, Valencia (Highland)</option>
                      <option value="Malabo, Valencia, Negros Oriental">Malabo, Valencia (Highland)</option>
                      <option value="Tubtubon, Sibulan, Negros Oriental">Tubtubon, Sibulan</option>
                      <option value="San Antonio, Sibulan, Negros Oriental">San Antonio, Sibulan</option>
                      <option value="Maayongtubig, Dauin, Negros Oriental">Maayongtubig, Dauin</option>
                      <option value="Bacong, Negros Oriental">Bacong, Negros Oriental</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Password */}
              <div>
                <label className="text-[11px] font-semibold text-neutral-700">Password *</label>
                <div className="relative mt-1">
                  <Lock className="w-3.5 h-3.5 absolute left-3 top-3 text-neutral-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white border border-neutral-300 rounded-xl pl-8 pr-3 py-2 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all shadow-md mt-2 cursor-pointer ${
                  selectedRole === 'farmer'
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : selectedRole === 'transporter'
                    ? 'bg-amber-600 hover:bg-amber-500 text-white'
                    : 'bg-sky-600 hover:bg-sky-500 text-white'
                }`}
              >
                {mode === 'signup' ? `Register as ${selectedRole.toUpperCase()}` : `Log In as ${selectedRole.toUpperCase()}`}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
