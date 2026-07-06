import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import { 
  LayoutDashboard, Server, Wrench, Shield, Sun, Moon, 
  RefreshCw, Cpu, BarChart2, Map, Bell, User, Settings,
  ChevronLeft, ChevronRight, CheckCircle, Database
} from 'lucide-react';
import './index.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Dynamic User Profile State
  const [userProfile, setUserProfile] = useState({
    username: 'admin',
    email: 'yuvir@sentinel.ops',
    full_name: 'Yuvraj Singh',
    role: 'Lead SRE Operator',
    avatar_color: '#6366F1'
  });
  
  // Real-time Telemetry Data
  const [servers, setServers] = useState([]);
  const [remediations, setRemediations] = useState([]);
  const [summary, setSummary] = useState(null);

  // Connection & API states
  const [latency, setLatency] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [lastRefreshed, setLastRefreshed] = useState(new Date().toLocaleTimeString());
  const [secondsSinceUpdate, setSecondsSinceUpdate] = useState(0);

  // Measure request roundtrip latency
  const measureLatency = async () => {
    try {
      const start = performance.now();
      await fetch(import.meta.env.VITE_HEALTH_URL || 'http://localhost:8000/health');
      const end = performance.now();
      setLatency(Math.round(end - start));
    } catch (e) {
      console.warn("Latency measure failed:", e);
    }
  };

  // REST fallback fetch
  const fetchRestFallback = async () => {
    try {
      const [srvRes, remRes, sumRes] = await Promise.all([
        fetch(`${API_BASE}/servers`).then(r => r.json()).catch(() => []),
        fetch(`${API_BASE}/remediations`).then(r => r.json()).catch(() => []),
        fetch(`${API_BASE}/metrics/summary`).then(r => r.json()).catch(() => null)
      ]);
      
      if (Array.isArray(srvRes) && srvRes.length > 0) setServers(srvRes);
      if (Array.isArray(remRes)) setRemediations(remRes);
      if (sumRes && !sumRes.detail) setSummary(sumRes);

      setLastRefreshed(new Date().toLocaleTimeString());
      setSecondsSinceUpdate(0);
      measureLatency();
    } catch (err) {
      console.error("REST fallback polling error:", err);
    }
  };

  // Connect to WebSocket with REST fallback
  useEffect(() => {
    let ws;
    let fallbackInterval;
    let reconnectTimeout;
    let isComponentMounted = true;

    const connectWS = () => {
      if (!isComponentMounted) return;
      setConnectionStatus('connecting');
      ws = new WebSocket(import.meta.env.VITE_WS_URL || 'ws://localhost:8000/api/ws');

      ws.onopen = () => {
        if (!isComponentMounted) return;
        setConnectionStatus('connected');
        measureLatency();
        if (fallbackInterval) clearInterval(fallbackInterval);
      };

      ws.onmessage = (event) => {
        if (!isComponentMounted) return;
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'welcome' || data.type === 'telemetry') {
            if (data.servers) setServers(data.servers);
            if (data.remediations) setRemediations(data.remediations);
            if (data.summary) setSummary(data.summary);
            setLastRefreshed(new Date().toLocaleTimeString());
            setSecondsSinceUpdate(0);
            measureLatency();
          }
        } catch (e) {
          console.error("WS parsing error:", e);
        }
      };

      ws.onerror = (err) => {
        if (!isComponentMounted) return;
        console.warn("WebSocket experienced an error:", err);
        setConnectionStatus('disconnected');
      };

      ws.onclose = () => {
        if (!isComponentMounted) return;
        setConnectionStatus('disconnected');
        // Initial fallback load, then periodic polling
        fetchRestFallback();
        if (fallbackInterval) clearInterval(fallbackInterval);
        fallbackInterval = setInterval(fetchRestFallback, 4000);

        // Attempt WS reconnect in 5 seconds
        if (reconnectTimeout) clearTimeout(reconnectTimeout);
        reconnectTimeout = setTimeout(connectWS, 5000);
      };
    };

    connectWS();

    // Track seconds since last update received
    const updateTimer = setInterval(() => {
      if (isComponentMounted) {
        setSecondsSinceUpdate(prev => prev + 1);
      }
    }, 1000);

    return () => {
      isComponentMounted = false;
      if (ws) {
        ws.onopen = null;
        ws.onmessage = null;
        ws.onerror = null;
        ws.onclose = null;
        ws.close();
      }
      if (fallbackInterval) clearInterval(fallbackInterval);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      clearInterval(updateTimer);
    };
  }, []);

  const triggerRefresh = () => {
    fetchRestFallback();
  };

  // Fetch dynamic user profile on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`${API_BASE}/profile`);
        if (res.ok) {
          const data = await res.json();
          setUserProfile(data);
        }
      } catch (err) {
        console.warn("Failed to load user profile:", err);
      }
    };
    fetchProfile();
  }, []);

  const getProfileInitials = (name) => {
    if (!name) return 'OP';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  };

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
        if (e.key === 'Escape') {
          document.activeElement.blur();
        }
        return;
      }
      
      const key = e.key.toLowerCase();
      if (key === 'd') {
        setActiveTab('dashboard');
      } else if (key === 's') {
        setActiveTab('servers');
      } else if (key === 'l') {
        setActiveTab('logs');
      } else if (key === 'a') {
        setActiveTab('analytics');
      } else if (key === 'i') {
        setActiveTab('infrastructure');
      } else if (key === 'p') {
        setActiveTab('profile');
      } else if (key === '/') {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder*="Search"]');
        if (searchInput) searchInput.focus();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col md:flex-row transition-colors duration-200">
      
      {/* Sidebar Navigation */}
      <aside className={`bg-[#F8F7FF] dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 transition-all duration-300 relative ${
        sidebarCollapsed ? 'w-16 md:w-20' : 'w-full md:w-64'
      }`}>
        
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="p-2.5 bg-indigo-600 rounded-lg text-white shrink-0">
              <Cpu size={18} className="animate-pulse" />
            </div>
            {!sidebarCollapsed && (
              <div className="transition-opacity duration-300">
                <h1 className="font-bold text-sm leading-none text-slate-900 dark:text-white">SentinelOps</h1>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5">PREDICTIVE MAINTENANCE</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Flow */}
        <nav className="flex-1 p-3 space-y-1.5">
          <button
            onClick={() => setActiveTab('dashboard')}
            title="Overview Dashboard"
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
              activeTab === 'dashboard'
                ? 'bg-[#EEF2FF] text-[#6366F1] dark:bg-indigo-950/40 dark:text-indigo-400 border-l-2 border-[#6366F1]'
                : 'text-[#374151] dark:text-slate-400 hover:bg-[#EEF2FF]/60 dark:hover:bg-slate-800 hover:text-[#6366F1] dark:hover:text-slate-100'
            }`}
          >
            <LayoutDashboard size={16} />
            {!sidebarCollapsed && <span>Overview Dashboard</span>}
          </button>
          
          <button
            onClick={() => setActiveTab('servers')}
            title="Server Fleet Registry"
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
              activeTab === 'servers'
                ? 'bg-[#EEF2FF] text-[#6366F1] dark:bg-indigo-950/40 dark:text-indigo-400 border-l-2 border-[#6366F1]'
                : 'text-[#374151] dark:text-slate-400 hover:bg-[#EEF2FF]/60 dark:hover:bg-slate-800 hover:text-[#6366F1] dark:hover:text-slate-100'
            }`}
          >
            <Server size={16} />
            {!sidebarCollapsed && <span>Server Fleet Registry</span>}
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            title="Remediation Activity"
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
              activeTab === 'logs'
                ? 'bg-[#EEF2FF] text-[#6366F1] dark:bg-indigo-950/40 dark:text-indigo-400 border-l-2 border-[#6366F1]'
                : 'text-[#374151] dark:text-slate-400 hover:bg-[#EEF2FF]/60 dark:hover:bg-slate-800 hover:text-[#6366F1] dark:hover:text-slate-100'
            }`}
          >
            <Wrench size={16} />
            {!sidebarCollapsed && <span>Remediation Activity</span>}
          </button>

          {/* Future Modules Mock Tabs */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-4 space-y-1">
            {!sidebarCollapsed && (
              <p className="px-3 text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Analytics & Infra</p>
            )}
            
            <button
              onClick={() => setActiveTab('analytics')}
              title="Predictive Analytics"
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                activeTab === 'analytics'
                  ? 'bg-[#EEF2FF] text-[#6366F1] dark:bg-indigo-950/40 dark:text-indigo-400 border-l-2 border-[#6366F1]'
                  : 'text-[#374151] dark:text-slate-400 hover:bg-[#EEF2FF]/60 dark:hover:bg-slate-800 hover:text-[#6366F1] dark:hover:text-slate-100'
              }`}
            >
              <BarChart2 size={16} />
              {!sidebarCollapsed && <span>Predictive Analytics</span>}
            </button>

            <button
              onClick={() => setActiveTab('infrastructure')}
              title="Regional Infrastructure"
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                activeTab === 'infrastructure'
                  ? 'bg-[#EEF2FF] text-[#6366F1] dark:bg-indigo-950/40 dark:text-[#6366F1] border-l-2 border-[#6366F1]'
                  : 'text-[#374151] dark:text-slate-400 hover:bg-[#EEF2FF]/60 dark:hover:bg-slate-800 hover:text-[#6366F1] dark:hover:text-slate-100'
              }`}
            >
              <Map size={16} />
              {!sidebarCollapsed && <span>Regional Infrastructure</span>}
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              title="User Profile Portal"
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                activeTab === 'profile'
                  ? 'bg-[#EEF2FF] text-[#6366F1] dark:bg-indigo-950/40 dark:text-indigo-400 border-l-2 border-[#6366F1]'
                  : 'text-[#374151] dark:text-slate-400 hover:bg-[#EEF2FF]/60 dark:hover:bg-slate-800 hover:text-[#6366F1] dark:hover:text-slate-100'
              }`}
            >
              <User size={16} />
              {!sidebarCollapsed && <span>User Profile Portal</span>}
            </button>
          </div>
        </nav>

        {/* Sidebar Footer Info */}
        {!sidebarCollapsed && (
          <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col gap-2 transition-opacity duration-300">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase">Environment</span>
              <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-900/60">
                Production
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase">AI Engine</span>
              <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-2 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-900/60">
                v2.1-prod
              </span>
            </div>
          </div>
        )}

        {/* Collapse Toggle Button */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute right-[-12px] top-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full p-0.5 shadow-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:scale-110 transition-all duration-200 z-30 cursor-pointer hidden md:block"
        >
          {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Header */}
        <header className="glassmorphism h-16 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between shrink-0 sticky top-0 z-40 transition-colors">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white uppercase">
              {activeTab === 'dashboard' && 'Operations Overview'}
              {activeTab === 'servers' && 'Server Fleet Registry'}
              {activeTab === 'logs' && 'Remediation Activity Ledger'}
              {activeTab === 'analytics' && 'Operational Predictive Analytics'}
              {activeTab === 'infrastructure' && 'Global Datacenter Infrastructure'}
              {activeTab === 'profile' && 'User Profile Portal Settings'}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Live Telemetry Status Widget */}
            <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100/50 dark:bg-slate-950/30 px-3 py-1.5 rounded-lg border border-slate-200/50 dark:border-slate-800/50">
              <span className={`h-2.5 w-2.5 rounded-full ${
                connectionStatus === 'connected' ? 'bg-emerald-500 animate-pulse-ring' :
                connectionStatus === 'connecting' ? 'bg-amber-500 animate-pulse' :
                'bg-rose-500'
              }`}></span>
              <span className="capitalize">{connectionStatus}</span>
              <span className="text-[10px] text-slate-400">
                (updated {secondsSinceUpdate}s ago)
              </span>
              <span className="border-l border-slate-200 dark:border-slate-800 pl-2 text-[10px] font-mono">
                {latency}ms latency
              </span>
              <button 
                onClick={triggerRefresh}
                title="Refresh Metrics"
                className="ml-1 p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors text-slate-600 dark:text-slate-400 cursor-pointer"
              >
                <RefreshCw size={11} className={connectionStatus === 'connecting' ? 'animate-spin' : ''} />
              </button>
            </div>

            {/* Platform System Health Dot Dropdown (Phase 13 widget in header) */}
            <div className="relative group">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/60 rounded-lg text-[10px] font-extrabold cursor-pointer transition-all duration-200 hover:bg-emerald-100/40">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                SYSTEM: HEALTHY
              </div>
              
              {/* Dropdown Box */}
              <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 text-left">
                <h4 className="font-bold text-[10px] tracking-wider text-slate-400 uppercase mb-2 border-b border-slate-100 dark:border-slate-800 pb-1.5 flex justify-between">
                  <span>Platform Health</span>
                  <span className="text-emerald-500">Normal</span>
                </h4>
                <div className="space-y-1.5 text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                  <div className="flex justify-between items-center">
                    <span>Inference API</span>
                    <span className="text-emerald-500 font-bold">Online</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Postgres DB</span>
                    <span className="text-emerald-500 font-bold">Active</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Redpanda Kafka</span>
                    <span className="text-emerald-500 font-bold">Active</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Feast Store</span>
                    <span className="text-emerald-500 font-bold">Synced</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Drift Detection</span>
                    <span className="text-indigo-500 font-bold">0.08 DRIFT</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notifications Dropdown (Phase 10) */}
            <div className="relative group">
              <button 
                title="Notifications"
                className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-slate-200 dark:border-slate-700 relative cursor-pointer"
              >
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                <Bell size={15} />
              </button>
              
              {/* Dropdown */}
              <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 text-left">
                <h4 className="font-bold text-xs text-slate-900 dark:text-white mb-2.5 border-b border-slate-100 dark:border-slate-800 pb-2 flex justify-between items-center">
                  <span>SRE Alerts Ledger</span>
                  <span className="bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 px-1.5 py-0.5 rounded text-[8px] font-bold">LIVE INCIDENTS</span>
                </h4>
                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  <div className="text-[10px] font-medium border-b border-slate-50 dark:border-slate-850 pb-2">
                    <p className="font-bold text-red-600 dark:text-red-400">Node DC-004: Critical Overload</p>
                    <p className="text-slate-500 mt-0.5 leading-snug">CPU usage at 94.2% exceeded dynamic threshold. Auto-healing action (Restart Service) executed successfully.</p>
                    <span className="text-[8px] text-slate-400 block mt-1 font-mono">1 min ago</span>
                  </div>
                  <div className="text-[10px] font-medium border-b border-slate-50 dark:border-slate-850 pb-2">
                    <p className="font-bold text-amber-600 dark:text-amber-400">Node DC-008: Workload Migration</p>
                    <p className="text-slate-500 mt-0.5 leading-snug">Memory footprint high (91.8%). Managed pod scaling automatically adjusted replication groups.</p>
                    <span className="text-[8px] text-slate-400 block mt-1 font-mono">3 min ago</span>
                  </div>
                  <div className="text-[10px] font-medium">
                    <p className="font-bold text-emerald-600 dark:text-emerald-400">Evidently Drift Analysis</p>
                    <p className="text-slate-500 mt-0.5 leading-snug">Feature metrics analyzed. Data drift stable. Drift Index score: 0.08.</p>
                    <span className="text-[8px] text-slate-400 block mt-1 font-mono">10 min ago</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Dark Mode Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer"
              aria-label="Toggle Theme"
            >
              {darkMode ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            {/* Profile Dropdown (Phase 10) */}
            <div 
              onClick={() => setActiveTab('profile')}
              title="Open Profile Settings"
              className="flex items-center gap-2.5 border-l border-slate-200 dark:border-slate-800 pl-4 cursor-pointer hover:opacity-85 select-none transition-opacity"
            >
              <div 
                className="h-8 w-8 rounded-full text-white font-extrabold text-xs flex items-center justify-center border border-indigo-200 shadow-sm select-none"
                style={{ backgroundColor: userProfile.avatar_color }}
              >
                {getProfileInitials(userProfile.full_name)}
              </div>
              <div className="hidden lg:flex flex-col text-left">
                <span className="text-xs font-bold leading-none">{userProfile.email}</span>
                <span className="text-[9px] text-slate-400 font-bold uppercase mt-1">{userProfile.role}</span>
              </div>
            </div>

          </div>
        </header>

        {/* Dashboard Panels */}
        <main className="flex-1 overflow-y-auto p-6">
          <Dashboard 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
            servers={servers}
            setServers={setServers}
            remediations={remediations}
            summary={summary}
            fetchData={triggerRefresh}
            isLoading={servers.length === 0 && connectionStatus === 'connecting'}
            userProfile={userProfile}
            setUserProfile={setUserProfile}
          />
        </main>
      </div>
    </div>
  );
}

export default App;
