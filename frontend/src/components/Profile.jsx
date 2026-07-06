import React, { useState, useEffect } from 'react';
import { 
  User, Mail, Lock, MapPin, Sliders, Bell, Shield, 
  Activity, CheckCircle, AlertTriangle, Eye, EyeOff, Save, KeyRound
} from 'lucide-react';

const API_BASE = 'http://localhost:8000/api';

const Profile = ({ onProfileUpdate }) => {
  const [activeSubTab, setActiveSubTab] = useState('general'); // 'general', 'address', 'security', 'preferences', 'audit'
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' }); // type: 'success' | 'error'
  
  // Profile state
  const [profileData, setProfileData] = useState({
    username: '',
    email: '',
    full_name: '',
    phone: '',
    role: '',
    department: '',
    timezone: '',
    avatar_color: '#6366F1',
    address: {
      street: '',
      city: '',
      state: '',
      zip_code: '',
      country: ''
    },
    mfa_enabled: false,
    notifications: {
      email_alerts: true,
      slack_integration: false,
      sms_critical: true
    }
  });

  // Password state
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Audit state
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // Timezones list
  const timezones = [
    { value: 'America/New_York', label: 'Eastern Time (ET) - New York' },
    { value: 'America/Chicago', label: 'Central Time (CT) - Chicago' },
    { value: 'America/Denver', label: 'Mountain Time (MT) - Denver' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT) - Los Angeles' },
    { value: 'Europe/London', label: 'Greenwich Mean Time (GMT) - London' },
    { value: 'Europe/Paris', label: 'Central European Time (CET) - Paris' },
    { value: 'Asia/Kolkata', label: 'India Standard Time (IST) - Mumbai' },
    { value: 'Asia/Singapore', label: 'Singapore Standard Time (SGT) - Singapore' },
    { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST) - Tokyo' }
  ];

  // Predefined nice avatar colors
  const avatarColors = [
    { value: '#6366F1', name: 'Indigo' },
    { value: '#10B981', name: 'Emerald' },
    { value: '#8B5CF6', name: 'Violet' },
    { value: '#EC4899', name: 'Rose' },
    { value: '#F59E0B', name: 'Amber' },
    { value: '#3B82F6', name: 'Blue' },
    { value: '#64748B', name: 'Slate' }
  ];

  // Fetch profile on mount
  useEffect(() => {
    fetchProfile();
  }, []);

  // Fetch audit logs when audit tab becomes active
  useEffect(() => {
    if (activeSubTab === 'audit') {
      fetchAuditLogs();
    }
  }, [activeSubTab]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/profile`);
      if (res.ok) {
        const data = await res.json();
        setProfileData(data);
      } else {
        showFeedback('Failed to load profile settings.', 'error');
      }
    } catch (err) {
      console.error(err);
      showFeedback('Connection to API failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    setAuditLoading(true);
    try {
      const res = await fetch(`${API_BASE}/profile/audit`);
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAuditLoading(false);
    }
  };

  const showFeedback = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => {
      setMessage({ text: '', type: '' });
    }, 5000);
  };

  // Get initials for profile badge
  const getInitials = () => {
    if (!profileData.full_name) return 'OP';
    const parts = profileData.full_name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  };

  // Handle simple input changes
  const handleInputChange = (field, value) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle nested address changes
  const handleAddressChange = (field, value) => {
    setProfileData(prev => ({
      ...prev,
      address: {
        ...prev.address,
        [field]: value
      }
    }));
  };

  // Handle nested notification changes
  const handleNotificationChange = (field, value) => {
    setProfileData(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [field]: value
      }
    }));
  };

  // Save profile changes
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData)
      });
      
      const result = await res.json();
      if (res.ok) {
        setProfileData(result.profile);
        showFeedback('Profile settings saved successfully.', 'success');
        if (onProfileUpdate) {
          onProfileUpdate(result.profile);
        }
      } else {
        showFeedback(result.detail || 'Failed to update profile.', 'error');
      }
    } catch (err) {
      console.error(err);
      showFeedback('Server connection error.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Handle password change
  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      showFeedback('New passwords do not match.', 'error');
      return;
    }
    if (passwordForm.new_password.length < 6) {
      showFeedback('New password must be at least 6 characters.', 'error');
      return;
    }
    
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/profile/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_password: passwordForm.current_password,
          new_password: passwordForm.new_password
        })
      });
      
      const result = await res.json();
      if (res.ok) {
        showFeedback('Password changed successfully.', 'success');
        setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
      } else {
        showFeedback(result.detail || 'Password update failed.', 'error');
      }
    } catch (err) {
      console.error(err);
      showFeedback('Server connection error.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Calculate password strength
  const getPasswordStrength = () => {
    const pwd = passwordForm.new_password;
    if (!pwd) return { label: 'Empty', score: 0, color: 'bg-slate-200 dark:bg-slate-800' };
    
    let score = 0;
    if (pwd.length >= 6) score += 1;
    if (pwd.length >= 10) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 1) return { label: 'Weak', score, color: 'bg-rose-500' };
    if (score <= 3) return { label: 'Medium', score, color: 'bg-amber-500' };
    return { label: 'Strong', score, color: 'bg-emerald-500' };
  };

  const pwdStrength = getPasswordStrength();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <p className="text-xs text-slate-400 mt-4 font-semibold">Loading console profile configurations...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-slide-in text-left">
      
      {/* Toast Alert Indicator */}
      {message.text && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 shadow-lg transition-all duration-300 ${
          message.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/60' 
            : 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/60'
        }`}>
          {message.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          <span className="text-xs font-bold">{message.text}</span>
        </div>
      )}

      {/* Main Grid Container */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Card: Account Card Overview */}
        <div className="glassmorphism border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col items-center text-center shadow-xs">
          {/* Avatar Initials with Dynamic Custom Color */}
          <div 
            className="w-24 h-24 rounded-full text-white font-extrabold text-3xl flex items-center justify-center shadow-md border-4 border-white dark:border-slate-900 select-none transition-all duration-350"
            style={{ backgroundColor: profileData.avatar_color }}
          >
            {getInitials()}
          </div>
          
          <h2 className="text-base font-bold text-slate-900 dark:text-white mt-4">{profileData.full_name || 'Ops Operator'}</h2>
          <p className="text-xs text-indigo-650 dark:text-indigo-400 font-semibold mt-1">{profileData.role || 'SRE Engineer'}</p>
          <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5 tracking-wider">{profileData.department || 'Operations'}</p>
          
          <div className="w-full border-t border-slate-150 dark:border-slate-800 my-5"></div>
          
          {/* Contact Quick Details */}
          <div className="w-full space-y-3.5 text-xs text-left">
            <div className="flex items-center gap-3">
              <User size={14} className="text-slate-400" />
              <div>
                <p className="text-[9px] text-slate-400 font-bold uppercase leading-none">Console Username</p>
                <p className="font-semibold text-slate-700 dark:text-slate-350 mt-1">@{profileData.username}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Mail size={14} className="text-slate-400" />
              <div>
                <p className="text-[9px] text-slate-400 font-bold uppercase leading-none">Primary Email</p>
                <p className="font-semibold text-slate-700 dark:text-slate-350 mt-1 break-all">{profileData.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <MapPin size={14} className="text-slate-400" />
              <div>
                <p className="text-[9px] text-slate-400 font-bold uppercase leading-none">Datacenter Base Location</p>
                <p className="font-semibold text-slate-700 dark:text-slate-350 mt-1">
                  {profileData.address.city && profileData.address.country 
                    ? `${profileData.address.city}, ${profileData.address.country}` 
                    : 'Not Specified'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="w-full border-t border-slate-150 dark:border-slate-800 my-5"></div>
          
          {/* Settings Sub-tab Navigation */}
          <div className="w-full flex flex-col gap-1">
            <button
              onClick={() => setActiveSubTab('general')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                activeSubTab === 'general'
                  ? 'bg-indigo-50 text-indigo-650 dark:bg-indigo-950/30 dark:text-indigo-400 border-l-2 border-indigo-650'
                  : 'text-slate-600 dark:text-slate-450 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <User size={15} />
              General Profile Info
            </button>
            
            <button
              onClick={() => setActiveSubTab('address')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                activeSubTab === 'address'
                  ? 'bg-indigo-50 text-indigo-650 dark:bg-indigo-950/30 dark:text-indigo-400 border-l-2 border-indigo-650'
                  : 'text-slate-600 dark:text-slate-455 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <MapPin size={15} />
              Office Address Details
            </button>

            <button
              onClick={() => setActiveSubTab('security')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                activeSubTab === 'security'
                  ? 'bg-indigo-50 text-indigo-650 dark:bg-indigo-950/30 dark:text-indigo-400 border-l-2 border-indigo-650'
                  : 'text-slate-600 dark:text-slate-455 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Lock size={15} />
              Security & Credentials
            </button>

            <button
              onClick={() => setActiveSubTab('preferences')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                activeSubTab === 'preferences'
                  ? 'bg-indigo-50 text-indigo-650 dark:bg-indigo-950/30 dark:text-indigo-400 border-l-2 border-indigo-650'
                  : 'text-slate-600 dark:text-slate-455 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Sliders size={15} />
              System Preferences
            </button>

            <button
              onClick={() => setActiveSubTab('audit')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                activeSubTab === 'audit'
                  ? 'bg-indigo-50 text-indigo-650 dark:bg-indigo-950/30 dark:text-indigo-400 border-l-2 border-indigo-650'
                  : 'text-slate-600 dark:text-slate-455 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Activity size={15} />
              Security Audit History
            </button>
          </div>
        </div>

        {/* Right Card: Content Form */}
        <div className="md:col-span-2 glassmorphism border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs relative">
          
          {/* TAB 1: GENERAL INFO */}
          {activeSubTab === 'general' && (
            <form onSubmit={handleSaveProfile} className="space-y-5">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-850 dark:text-white mb-1">General Profile Info</h3>
                <p className="text-[11px] text-slate-400">Manage basic user identities, system titles, and custom theme avatar identifiers.</p>
              </div>

              <div className="border-t border-slate-150 dark:border-slate-800 pt-3"></div>

              {/* Avatar Color Picker */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Avatar Identity Color</label>
                <div className="flex flex-wrap gap-2.5">
                  {avatarColors.map(color => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => handleInputChange('avatar_color', color.value)}
                      title={color.name}
                      className={`h-7 w-7 rounded-full border-2 transition-all cursor-pointer hover:scale-110 flex items-center justify-center ${
                        profileData.avatar_color === color.value 
                          ? 'border-indigo-605 scale-105 shadow-sm' 
                          : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color.value }}
                    >
                      {profileData.avatar_color === color.value && (
                        <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1 text-left">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Username Handle</label>
                  <input
                    type="text"
                    required
                    value={profileData.username}
                    onChange={(e) => handleInputChange('username', e.target.value)}
                    className="w-full bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-hidden focus:border-indigo-505 transition-colors"
                  />
                </div>

                <div className="space-y-1 text-left">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Full Name</label>
                  <input
                    type="text"
                    required
                    value={profileData.full_name}
                    onChange={(e) => handleInputChange('full_name', e.target.value)}
                    className="w-full bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-hidden focus:border-indigo-505 transition-colors"
                  />
                </div>

                <div className="space-y-1 text-left">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Primary Email Address</label>
                  <input
                    type="email"
                    required
                    value={profileData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-hidden focus:border-indigo-505 transition-colors"
                  />
                </div>

                <div className="space-y-1 text-left">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Phone Number</label>
                  <input
                    type="text"
                    value={profileData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="+1 (000) 000-0000"
                    className="w-full bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-hidden focus:border-indigo-505 transition-colors"
                  />
                </div>

                <div className="space-y-1 text-left">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">System Operator Role</label>
                  <input
                    type="text"
                    required
                    value={profileData.role}
                    onChange={(e) => handleInputChange('role', e.target.value)}
                    className="w-full bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-hidden focus:border-indigo-505 transition-colors"
                  />
                </div>

                <div className="space-y-1 text-left">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Division / Department</label>
                  <input
                    type="text"
                    required
                    value={profileData.department}
                    onChange={(e) => handleInputChange('department', e.target.value)}
                    className="w-full bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-hidden focus:border-indigo-505 transition-colors"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold py-2 px-5 rounded-xl text-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <Save size={13} />
                  {saving ? 'Saving...' : 'Save Profile Details'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: ADDRESS DETAILS */}
          {activeSubTab === 'address' && (
            <form onSubmit={handleSaveProfile} className="space-y-5">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-850 dark:text-white mb-1">Office Address Details</h3>
                <p className="text-[11px] text-slate-400">Configure headquarters or operations facility address parameters.</p>
              </div>

              <div className="border-t border-slate-150 dark:border-slate-800 pt-3"></div>

              <div className="space-y-4">
                <div className="space-y-1 text-left">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Street Address</label>
                  <input
                    type="text"
                    value={profileData.address.street}
                    onChange={(e) => handleAddressChange('street', e.target.value)}
                    placeholder="123 Datacenter Blvd Suite 400"
                    className="w-full bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-hidden focus:border-indigo-505 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1 text-left">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">City</label>
                    <input
                      type="text"
                      value={profileData.address.city}
                      onChange={(e) => handleAddressChange('city', e.target.value)}
                      placeholder="Ashburn"
                      className="w-full bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-hidden focus:border-indigo-505 transition-colors"
                    />
                  </div>

                  <div className="space-y-1 text-left">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">State / Province</label>
                    <input
                      type="text"
                      value={profileData.address.state}
                      onChange={(e) => handleAddressChange('state', e.target.value)}
                      placeholder="VA"
                      className="w-full bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-hidden focus:border-indigo-505 transition-colors"
                    />
                  </div>

                  <div className="space-y-1 text-left">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Zip / Postal Code</label>
                    <input
                      type="text"
                      value={profileData.address.zip_code}
                      onChange={(e) => handleAddressChange('zip_code', e.target.value)}
                      placeholder="20147"
                      className="w-full bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-hidden focus:border-indigo-505 transition-colors"
                    />
                  </div>

                  <div className="space-y-1 text-left">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Country</label>
                    <input
                      type="text"
                      value={profileData.address.country}
                      onChange={(e) => handleAddressChange('country', e.target.value)}
                      placeholder="United States"
                      className="w-full bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-hidden focus:border-indigo-505 transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold py-2 px-5 rounded-xl text-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <Save size={13} />
                  {saving ? 'Saving...' : 'Save Office Address'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: SECURITY & PASSWORD */}
          {activeSubTab === 'security' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-850 dark:text-white mb-1">Security & Credentials</h3>
                <p className="text-[11px] text-slate-400">Manage security authentication keychains, consoles passwords, and multi-factor layers.</p>
              </div>

              <div className="border-t border-slate-150 dark:border-slate-800 pt-3"></div>

              {/* MFA Toggle Widget */}
              <div className="p-4 bg-slate-50/40 dark:bg-slate-950/10 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between">
                <div className="flex items-start gap-3 text-left">
                  <div className="p-2 bg-indigo-50 text-indigo-750 dark:bg-indigo-950/55 dark:text-indigo-400 rounded-lg">
                    <Shield size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-850 dark:text-slate-205">Two-Factor Authentication (MFA)</h4>
                    <p className="text-[10px] text-slate-450 leading-relaxed mt-0.5">Protect SRE accounts by requiring an extra security verification key code on login.</p>
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={() => {
                    const nextVal = !profileData.mfa_enabled;
                    handleInputChange('mfa_enabled', nextVal);
                    // Proactively save this toggle
                    fetch(`${API_BASE}/profile`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ ...profileData, mfa_enabled: nextVal })
                    }).then(res => {
                      if(res.ok) {
                        showFeedback(`MFA successfully ${nextVal ? 'enabled' : 'disabled'}.`, 'success');
                        if(onProfileUpdate) onProfileUpdate({ ...profileData, mfa_enabled: nextVal });
                      }
                    });
                  }}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-hidden ${
                    profileData.mfa_enabled ? 'bg-emerald-500' : 'bg-slate-250 dark:bg-slate-700'
                  }`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    profileData.mfa_enabled ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Password Form */}
              <form onSubmit={handleSavePassword} className="space-y-4">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5 text-left">
                  <KeyRound size={12} />
                  Update Security Password
                </h4>

                <div className="space-y-3.5">
                  <div className="space-y-1 text-left relative">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Current Password</label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        required
                        value={passwordForm.current_password}
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, current_password: e.target.value }))}
                        className="w-full bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-850 rounded-xl pl-3 pr-10 py-2 text-xs font-semibold focus:outline-hidden focus:border-indigo-505 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-2.5 text-slate-450 hover:text-slate-650 cursor-pointer flex items-center"
                      >
                        {showCurrentPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1 text-left relative">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">New Password</label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        value={passwordForm.new_password}
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, new_password: e.target.value }))}
                        className="w-full bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-850 rounded-xl pl-3 pr-10 py-2 text-xs font-semibold focus:outline-hidden focus:border-indigo-505 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-2.5 text-slate-450 hover:text-slate-655 cursor-pointer flex items-center"
                      >
                        {showNewPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>

                    {/* Password Strength Indicator */}
                    {passwordForm.new_password && (
                      <div className="mt-2 space-y-1 animate-slide-in">
                        <div className="flex justify-between items-center text-[9px] font-bold">
                          <span className="text-slate-400">Strength Assessment:</span>
                          <span className={
                            pwdStrength.label === 'Strong' ? 'text-emerald-500' :
                            pwdStrength.label === 'Medium' ? 'text-amber-500' :
                            'text-rose-500'
                          }>{pwdStrength.label}</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-150 dark:bg-slate-800 rounded-full overflow-hidden flex gap-1">
                          <div className={`h-full rounded-full transition-all duration-300 ${pwdStrength.color}`} style={{ width: `${Math.min(100, (pwdStrength.score / 5) * 100)}%` }}></div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1 text-left relative">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Confirm New Password</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={passwordForm.confirm_password}
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, confirm_password: e.target.value }))}
                        className="w-full bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-855 rounded-xl pl-3 pr-10 py-2 text-xs font-semibold focus:outline-hidden focus:border-indigo-505 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-2.5 text-slate-450 hover:text-slate-655 cursor-pointer flex items-center"
                      >
                        {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold py-2 px-5 rounded-xl text-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                  >
                    <Save size={13} />
                    {saving ? 'Updating...' : 'Change Credentials'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 4: PREFERENCES */}
          {activeSubTab === 'preferences' && (
            <form onSubmit={handleSaveProfile} className="space-y-5">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-855 dark:text-white mb-1">System Preferences</h3>
                <p className="text-[11px] text-slate-400">Configure client console parameters, notification gateways, and local timezone logs.</p>
              </div>

              <div className="border-t border-slate-150 dark:border-slate-800 pt-3"></div>

              <div className="space-y-4">
                <div className="space-y-1 text-left">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Operational Timezone</label>
                  <select
                    value={profileData.timezone}
                    onChange={(e) => handleInputChange('timezone', e.target.value)}
                    className="w-full bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-hidden focus:border-indigo-505 transition-colors cursor-pointer text-slate-700 dark:text-slate-350"
                  >
                    {timezones.map(tz => (
                      <option key={tz.value} value={tz.value} className="bg-white dark:bg-slate-900">
                        {tz.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Notifications Panel */}
                <div className="space-y-3 pt-2 text-left">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                    <Bell size={12} />
                    Critical Notification Channels
                  </label>

                  <div className="space-y-2">
                    <label className="flex items-center gap-3 p-3 bg-slate-50/40 dark:bg-slate-950/10 border border-slate-200 dark:border-slate-850 rounded-xl cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/10 transition-colors">
                      <input 
                        type="checkbox"
                        checked={profileData.notifications.email_alerts}
                        onChange={(e) => handleNotificationChange('email_alerts', e.target.checked)}
                        className="h-4 w-4 rounded-sm border-slate-350 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-250">Send Email Incident Alerts</p>
                        <p className="text-[9px] text-slate-400 mt-0.5">Receive failure prediction summaries in the registered inbox.</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 bg-slate-50/40 dark:bg-slate-950/10 border border-slate-200 dark:border-slate-850 rounded-xl cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/10 transition-colors">
                      <input 
                        type="checkbox"
                        checked={profileData.notifications.slack_integration}
                        onChange={(e) => handleNotificationChange('slack_integration', e.target.checked)}
                        className="h-4 w-4 rounded-sm border-slate-350 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-255">Slack Channel Integration</p>
                        <p className="text-[9px] text-slate-400 mt-0.5">Broadcast auto-healing incident reports directly to #sre-alerts room.</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 bg-slate-50/40 dark:bg-slate-950/10 border border-slate-200 dark:border-slate-850 rounded-xl cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/10 transition-colors">
                      <input 
                        type="checkbox"
                        checked={profileData.notifications.sms_critical}
                        onChange={(e) => handleNotificationChange('sms_critical', e.target.checked)}
                        className="h-4 w-4 rounded-sm border-slate-355 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-255">SMS Dispatch on Critical Drift</p>
                        <p className="text-[9px] text-slate-400 mt-0.5">Dispatch high-priority cellular messages when server crash threshold exceeds 80%.</p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold py-2 px-5 rounded-xl text-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <Save size={13} />
                  {saving ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 5: AUDIT LOGS */}
          {activeSubTab === 'audit' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-850 dark:text-white mb-1">Security Audit History</h3>
                <p className="text-[11px] text-slate-400">Localized timeline ledger logging recent security, login sessions, and credential updates.</p>
              </div>

              <div className="border-t border-slate-150 dark:border-slate-800 pt-3"></div>

              <div className="overflow-x-auto select-text">
                {auditLoading ? (
                  <div className="text-center py-8 text-slate-455 text-xs font-semibold">Loading security audit trails...</div>
                ) : auditLogs.length === 0 ? (
                  <div className="text-center py-8 text-slate-455 text-xs font-semibold">No profile audit logs registered in session state.</div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-250 dark:border-slate-800 text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                        <th className="py-2.5 pb-3">Timestamp</th>
                        <th className="py-2.5 pb-3">Operator</th>
                        <th className="py-2.5 pb-3">Action</th>
                        <th className="py-2.5 pb-3">Details / Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 dark:divide-slate-800 font-semibold text-slate-655 dark:text-slate-350">
                      {auditLogs.map((log, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/20 dark:hover:bg-slate-900/10">
                          <td className="py-3 font-mono text-[10px] text-slate-450 whitespace-nowrap text-left">
                            {new Date(log.timestamp * 1000).toLocaleString()}
                          </td>
                          <td className="py-3 text-left">@{log.user}</td>
                          <td className="py-3 text-left">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              log.action.includes('Password') || log.action.includes('Reset')
                                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400'
                                : 'bg-indigo-50 text-indigo-750 dark:bg-indigo-950/20 dark:text-indigo-400'
                            }`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="py-3 max-w-[200px] truncate text-[10px] text-slate-550 dark:text-slate-400 text-left" title={log.new_value}>
                            {log.new_value}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Profile;
