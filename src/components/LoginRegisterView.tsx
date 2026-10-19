import React, { useState } from 'react';
import { Sprout, ShoppingBag, Lock, Phone, Mail, MapPin, User, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { UserRole, UserProfile } from '../types';
import { resolveCoordinates } from '../utils/geoDistance';

interface LoginRegisterViewProps {
  onLoginSuccess: (user: UserProfile) => void;
}

const REGISTERED_USERS_KEY = 'veggieconnect_registered_users_v9';

function normalizePhone(p?: string): string {
  if (!p) return '';
  return p.replace(/[\s\-\+\(\)]/g, '').replace(/^63/, '0');
}

export const LoginRegisterView: React.FC<LoginRegisterViewProps> = ({
  onLoginSuccess,
}) => {
  // Load registered users from localStorage
  const getRegisteredUsers = (): UserProfile[] => {
    try {
      const saved = localStorage.getItem(REGISTERED_USERS_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Error loading registered users', e);
    }
    return [];
  };

  const [activeTab, setActiveTab] = useState<'intro' | 'login' | 'register'>('intro');
  const [selectedRole, setSelectedRole] = useState<UserRole>('farmer');

  // Login Form State
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Register Form State
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regLocation, setRegLocation] = useState('Dumaguete City, Negros Oriental');
  const [regFarmName, setRegFarmName] = useState('');
  const [regError, setRegError] = useState<string | null>(null);

  const saveRegisteredUser = (user: UserProfile) => {
    const users = getRegisteredUsers();
    const updated = [...users.filter((u) => u.id !== user.id), user];
    localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(updated));
  };

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const identifier = loginIdentifier.trim().toLowerCase();
    if (!identifier) {
      setLoginError('Please enter your mobile phone number or email.');
      return;
    }

    if (!loginPassword) {
      setLoginError('Please enter your password.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Try backend authentication
      const resp = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: identifier,
          email: identifier,
          password: loginPassword,
        }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        setLoginError(data.error || 'Invalid credentials.');
        setIsSubmitting(false);
        return;
      }

      if (data.user) {
        saveRegisteredUser(data.user);
        onLoginSuccess(data.user);
        return;
      }
    } catch (err) {
      console.log('Backend login unreachable:', err);
      setLoginError('Cannot reach the server. Please make sure the app server is running and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);

    const trimmedName = regName.trim();
    const rawPhone = regPhone.trim();
    const rawEmail = rawEmailSafe(regEmail.trim());
    const normName = trimmedName.toLowerCase();
    const normPhone = normalizePhone(rawPhone);
    const normEmail = rawEmail.toLowerCase();

    if (!trimmedName) {
      setRegError('Please enter your full name.');
      return;
    }
    if (!rawPhone) {
      setRegError('Please enter your active Mobile No.');
      return;
    }
    if (!regPassword.trim()) {
      setRegError('Please choose a password.');
      return;
    }
    if (selectedRole === 'farmer' && !regFarmName.trim()) {
      setRegError('Please enter your Farm name.');
      return;
    }

    // Local Duplicate Validations across all existing users
    const existingUsers = getRegisteredUsers();
    
    // Check duplicate name
    const dupName = existingUsers.find((u) => u.name && u.name.trim().toLowerCase() === normName);
    if (dupName) {
      setRegError(`An account with the name "${trimmedName}" is already registered. Please use a unique full name.`);
      return;
    }

    // Check duplicate phone
    if (normPhone) {
      const dupPhone = existingUsers.find((u) => u.phone && normalizePhone(u.phone) === normPhone);
      if (dupPhone) {
        setRegError(`An account with the mobile number "${rawPhone}" is already registered.`);
        return;
      }
    }

    // Check duplicate email
    if (normEmail) {
      const dupEmail = existingUsers.find((u) => u.email && u.email.trim().toLowerCase() === normEmail);
      if (dupEmail) {
        setRegError(`An account with the email "${rawEmail}" is already registered.`);
        return;
      }
    }

    setIsSubmitting(true);

    const resolvedCoords = resolveCoordinates(regLocation);

    const newUser: UserProfile = {
      id: `user-${Date.now()}`,
      name: trimmedName,
      email: rawEmail || `${trimmedName.toLowerCase().replace(/\s+/g, '')}@dgte-agri.ph`,
      phone: rawPhone,
      role: selectedRole,
      location: regLocation.trim(),
      latitude: resolvedCoords.lat,
      longitude: resolvedCoords.lng,
      farmName: selectedRole === 'farmer' ? regFarmName.trim() : undefined,
      avatar: '',
      verified: true,
      status: 'active',
    };

    try {
      const resp = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newUser,
          password: regPassword,
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        setRegError(data.error || 'Failed to register account.');
        setIsSubmitting(false);
        return;
      }

      if (data.user) {
        saveRegisteredUser(data.user);
      } else {
        saveRegisteredUser(newUser);
      }
    } catch (err) {
      console.log('Backend signup notice:', err);
      saveRegisteredUser(newUser);
    } finally {
      setIsSubmitting(false);
    }

    saveRegisteredUser(newUser);
    onLoginSuccess(newUser);
  };

  function rawEmailSafe(str: string) {
    return str || '';
  }

  // 1. INTRODUCTION / GET STARTED APP SPLASH SCREEN (PURE GREEN APP BACKGROUND)
  if (activeTab === 'intro') {
    return (
      <div className="relative min-h-[580px] sm:min-h-[720px] flex-1 flex flex-col justify-between p-6 overflow-hidden text-white select-none bg-gradient-to-b from-emerald-700 via-emerald-800 to-emerald-950">
        {/* Decorative Ambient Green Lighting Effects */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-emerald-500/30 blur-3xl" />
          <div className="absolute top-1/3 -left-16 w-64 h-64 rounded-full bg-teal-400/20 blur-3xl" />
          <div className="absolute -bottom-20 right-0 w-80 h-80 rounded-full bg-emerald-600/20 blur-3xl" />
        </div>

        {/* Top App Header Pill */}
        <div className="relative z-10 pt-2 flex items-center justify-between">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-[11px] font-bold tracking-wide text-emerald-200 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Direct Agricultural Network</span>
          </div>

          <span className="text-[10px] font-extrabold text-emerald-100 bg-emerald-950/70 backdrop-blur-md px-2.5 py-1 rounded-full border border-emerald-400/20">
            Negros Oriental
          </span>
        </div>

        {/* Center Hero Showcase */}
        <div className="relative z-10 py-6 my-auto space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white shadow-2xl shadow-emerald-950/80 border border-white/30">
            <Sprout className="w-9 h-9 stroke-[2.3]" />
          </div>

          <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tight text-white font-display drop-shadow-md leading-tight">
              Veggie<span className="text-emerald-300">Connect</span>
            </h1>
            <p className="text-xs font-bold text-emerald-300 uppercase tracking-widest">
              Direct Vegetable Market App
            </p>
          </div>

          <p className="text-sm text-emerald-50 leading-relaxed font-medium max-w-xs drop-shadow-sm">
            Your platform to buy or sell fresh vegetables in bulk across Negros Oriental. From easy ordering and managed deliveries to price checks with DA Bantay Presyo, we make wholesale trading simple for everyone.
          </p>
        </div>

        {/* Bottom Call to Actions */}
        <div className="relative z-10 space-y-2.5 pt-4">
          <button
            id="btn-intro-get-started"
            onClick={() => {
              setActiveTab('register');
              setLoginError(null);
              setRegError(null);
            }}
            className="w-full py-3.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-white font-black text-sm rounded-2xl shadow-xl shadow-emerald-950/70 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
          >
            <span>Get Started</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>

          <button
            id="btn-intro-login"
            onClick={() => {
              setActiveTab('login');
              setLoginError(null);
              setRegError(null);
            }}
            className="w-full py-3 px-4 bg-white/15 hover:bg-white/25 text-white font-bold text-xs rounded-2xl backdrop-blur-md border border-white/25 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
          >
            <span>I already have an account · Log In</span>
          </button>
        </div>

      </div>
    );
  }

  return (
    <div className="min-h-full flex flex-col justify-center px-4 py-8 max-w-md mx-auto w-full text-neutral-900 bg-[#f4f9f4]">
      {/* Brand Header */}
      <div className="text-center mb-6">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-700/20 text-white mb-3">
          <Sprout className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-emerald-950 font-display">
          Veggie<span className="text-emerald-600">Connect</span>
        </h1>
        <p className="text-xs text-emerald-800/80 font-medium mt-1">
          Direct Farmer & Buyer Network (Negros Oriental)
        </p>
      </div>

      {/* Login vs Register Tab Selector */}
      <div className="bg-emerald-100/60 p-1 rounded-2xl border border-emerald-200/80 flex mb-5">
        <button
          id="tab-login"
          onClick={() => {
            setActiveTab('login');
            setLoginError(null);
            setRegError(null);
          }}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'login'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-emerald-900/70 hover:text-emerald-950'
          }`}
        >
          Log In
        </button>
        <button
          id="tab-register"
          onClick={() => {
            setActiveTab('register');
            setLoginError(null);
            setRegError(null);
          }}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'register'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-emerald-900/70 hover:text-emerald-950'
          }`}
        >
          Register (New User)
        </button>
      </div>

      {/* LOGIN FORM */}
      {activeTab === 'login' && (
        <form onSubmit={handleLogin} className="space-y-4 bg-white border border-emerald-100/90 rounded-3xl p-5 shadow-sm">
          <div className="border-b border-emerald-100 pb-3">
            <h2 className="text-base font-bold text-emerald-950">Log in to your account</h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Enter your registered phone, email, or admin credentials
            </p>
          </div>

          {loginError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <span>{loginError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-emerald-950 mb-1">
              Mobile Number or Email
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-emerald-600 absolute left-3 top-3" />
              <input
                id="input-login-id"
                type="text"
                value={loginIdentifier}
                onChange={(e) => setLoginIdentifier(e.target.value)}
                placeholder="0917 123 4567 or email"
                className="w-full bg-emerald-50/40 border border-emerald-200 rounded-xl py-2.5 pl-9 pr-3 text-xs text-neutral-900 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-emerald-950 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-emerald-600 absolute left-3 top-3" />
              <input
                id="input-login-password"
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full bg-emerald-50/40 border border-emerald-200 rounded-xl py-2.5 pl-9 pr-3 text-xs text-neutral-900 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all"
              />
            </div>
          </div>

          <button
            id="btn-submit-login"
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-700/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] mt-2 cursor-pointer"
          >
            <span>{isSubmitting ? 'Logging in...' : 'Log In to VeggieConnect'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="text-center pt-2">
            <p className="text-xs text-neutral-500">
              Need a new member account?{' '}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('register');
                  setLoginError(null);
                }}
                className="text-emerald-700 hover:underline font-bold cursor-pointer"
              >
                Register here
              </button>
            </p>
          </div>
        </form>
      )}

      {/* REGISTER FORM */}
      {activeTab === 'register' && (
        <form onSubmit={handleRegister} className="space-y-4 bg-white border border-emerald-100/90 rounded-3xl p-5 shadow-sm">
          <div className="border-b border-emerald-100 pb-3">
            <h2 className="text-base font-bold text-emerald-950">Create New Account</h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Select whether you are a Farmer or a Buyer
            </p>
          </div>

          {regError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <span>{regError}</span>
            </div>
          )}

          {/* Role Selection: Farmer vs Buyer */}
          <div>
            <label className="block text-xs font-semibold text-emerald-950 mb-1.5">
              Select Your Role
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                id="role-select-farmer"
                onClick={() => setSelectedRole('farmer')}
                className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                  selectedRole === 'farmer'
                    ? 'bg-emerald-50 border-emerald-600 text-emerald-900 shadow-xs ring-2 ring-emerald-600'
                    : 'bg-neutral-50 border-neutral-200 text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <div className="text-2xl mb-1">👨‍🌾</div>
                <div className="text-xs font-bold leading-tight">Farmer</div>
                <div className="text-[10px] text-neutral-500 mt-0.5">Grower / Mag-uuma</div>
              </button>

              <button
                type="button"
                id="role-select-buyer"
                onClick={() => setSelectedRole('buyer')}
                className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                  selectedRole === 'buyer'
                    ? 'bg-sky-50 border-sky-600 text-sky-900 shadow-xs ring-2 ring-sky-600'
                    : 'bg-neutral-50 border-neutral-200 text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <div className="text-2xl mb-1">🛒</div>
                <div className="text-xs font-bold leading-tight">Buyer</div>
                <div className="text-[10px] text-neutral-500 mt-0.5">Customer / Mamalitay</div>
              </button>
            </div>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-emerald-950 mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-emerald-600 absolute left-3 top-3" />
              <input
                id="input-reg-name"
                type="text"
                placeholder="e.g. Juan dela Cruz"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                className="w-full bg-emerald-50/40 border border-emerald-200 rounded-xl py-2.5 pl-9 pr-3 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-emerald-600 focus:bg-white"
                required
              />
            </div>
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-xs font-semibold text-emerald-950 mb-1">
              Mobile No. <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-emerald-600 absolute left-3 top-3" />
              <input
                id="input-reg-phone"
                type="text"
                placeholder="+63 917 123 4567"
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)}
                className="w-full bg-emerald-50/40 border border-emerald-200 rounded-xl py-2.5 pl-9 pr-3 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-emerald-600 focus:bg-white"
                required
              />
            </div>
          </div>

          {/* Email Address */}
          <div>
            <label className="block text-xs font-semibold text-emerald-950 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-emerald-600 absolute left-3 top-3" />
              <input
                id="input-reg-email"
                type="email"
                placeholder="juan@gmail.com"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                className="w-full bg-emerald-50/40 border border-emerald-200 rounded-xl py-2.5 pl-9 pr-3 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-emerald-600 focus:bg-white"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-emerald-950 mb-1">
              Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-emerald-600 absolute left-3 top-3" />
              <input
                id="input-reg-password"
                type="password"
                placeholder="Create password"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                className="w-full bg-emerald-50/40 border border-emerald-200 rounded-xl py-2.5 pl-9 pr-3 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-emerald-600 focus:bg-white"
                required
              />
            </div>
          </div>

          {/* Location in Negros Oriental */}
          <div>
            <label className="block text-xs font-semibold text-emerald-950 mb-1">
              Location / Municipality
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-emerald-600 absolute left-3 top-3" />
              <input
                id="input-reg-location"
                type="text"
                placeholder="Valencia / Dumaguete City / Sibulan / Dauin"
                value={regLocation}
                onChange={(e) => setRegLocation(e.target.value)}
                className="w-full bg-emerald-50/40 border border-emerald-200 rounded-xl py-2.5 pl-9 pr-3 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-emerald-600 focus:bg-white"
                required
              />
            </div>
          </div>

          {/* Role-specific fields */}
          {selectedRole === 'farmer' && (
            <div>
              <label className="block text-xs font-semibold text-emerald-800 mb-1">
                Farm Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Sprout className="w-4 h-4 text-emerald-600 absolute left-3 top-3" />
                <input
                  id="input-reg-farm"
                  type="text"
                  placeholder="e.g. Valencia Highland Organic Farm"
                  value={regFarmName}
                  onChange={(e) => setRegFarmName(e.target.value)}
                  className="w-full bg-emerald-50/40 border border-emerald-300 rounded-xl py-2.5 pl-9 pr-3 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-emerald-600 focus:bg-white"
                  required
                />
              </div>
            </div>
          )}

          <button
            id="btn-submit-register"
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-700/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] mt-2 cursor-pointer"
          >
            <span>{isSubmitting ? 'Registering...' : 'Create Account & Enter'}</span>
            <CheckCircle2 className="w-4 h-4" />
          </button>

          <div className="text-center pt-2">
            <p className="text-xs text-neutral-500">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('login');
                  setRegError(null);
                }}
                className="text-emerald-700 hover:underline font-bold cursor-pointer"
              >
                Log in here
              </button>
            </p>
          </div>
        </form>
      )}
    </div>
  );
};


