import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Search, Filter, AlertTriangle, Shield, CheckCircle, X, Play, 
  Cpu, Database, Server, Activity, Wrench, TrendingUp, Info,
  Clock, Globe, Sliders, Download, Upload, TrendingDown, Terminal, Brain, Zap, RefreshCw, BarChart2
} from 'lucide-react';
import { 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell 
} from 'recharts';
import ServerCard from './ServerCard';
import StatusBadge from './Common/StatusBadge';
import Profile from './Profile';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Helper to determine server region based on ID
const getServerRegionName = (serverId) => {
  const num = parseInt(serverId.split('-')[1]) || 1;
  if (num <= 7) return 'US-East-1 (N. Virginia)';
  if (num <= 14) return 'EU-West-1 (Ireland)';
  return 'AP-East-1 (Hong Kong)';
};

const Dashboard = ({ 
  activeTab, 
  setActiveTab, 
  servers = [], 
  setServers, 
  remediations = [], 
  summary = null, 
  fetchData,
  isLoading = false,
  userProfile,
  setUserProfile
}) => {
  
  // Advanced filters & sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [envFilter, setEnvFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [regionFilter, setRegionFilter] = useState('All');
  const [sortBy, setSortBy] = useState('Highest Risk');
  
  // Details Drawer States
  const [selectedServer, setSelectedServer] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState('overview'); // 'overview', 'shap', 'history', 'remediation', 'predictions'
  
  // Remediation Action States
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState('');

  // Report Export Dialog States
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportType, setExportType] = useState('incident'); // 'incident', 'health', 'csv'
  
  // Toast Notifications State
  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  // Logs & Rules States (Phase 3 & 9)
  const [logTab, setLogTab] = useState('remediation'); // 'remediation', 'system', 'rules'
  const [systemLogs, setSystemLogs] = useState([]);
  const [logQuery, setLogQuery] = useState('');
  const [logSeverity, setLogSeverity] = useState('All');
  const [logServerId, setLogServerId] = useState('All');
  const [logDate, setLogDate] = useState('');
  const [logsLoading, setLogsLoading] = useState(false);
  
  const [alertRules, setAlertRules] = useState([]);
  const [newRule, setNewRule] = useState({
    metric: 'cpu',
    threshold: 90,
    operator: '>',
    severity: 'CRITICAL',
    action: 'Restart Service'
  });

  // Prediction History Tab State
  const [predictionHistory, setPredictionHistory] = useState([]);
  const [predLoading, setPredLoading] = useState(false);
  
  // Fetch detailed history for drawer
  useEffect(() => {
    if (!selectedServer) return;
    
    const fetchHistory = async () => {
      try {
        const res = await fetch(`${API_BASE}/servers/${selectedServer.id}/history`);
        const data = await res.json();
        setHistoryData(data);
      } catch (err) {
        console.error("Error fetching history:", err);
      }
    };
    
    fetchHistory();
    const histInterval = setInterval(fetchHistory, 5000);
    return () => clearInterval(histInterval);
  }, [selectedServer?.id]);

  // Keep selected server updated when state updates
  useEffect(() => {
    if (selectedServer && servers.length > 0) {
      const updated = servers.find(s => s.id === selectedServer.id);
      if (updated) setSelectedServer(updated);
    }
  }, [servers, selectedServer?.id]);

  // Trigger manual remediation
  const handleRemediate = async (actionName) => {
    if (!selectedServer) return;
    setActionLoading(true);
    setActionSuccessMessage('');
    try {
      const res = await fetch(`${API_BASE}/remediate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          server_id: selectedServer.id,
          action: actionName
        })
      });
      if (res.ok) {
        setActionSuccessMessage(`Remediation executed: ${actionName}`);
        addToast(`Remediation Executed: ${actionName} on ${selectedServer.id}`, 'success');
        fetchData(); 
      }
    } catch (err) {
      console.error("Remediation execution failed:", err);
      addToast(`Failed to execute remediation ${actionName}`, 'error');
    } finally {
      setActionLoading(false);
      setTimeout(() => setActionSuccessMessage(''), 4000);
    }
  };

  // Open & close drawer helpers
  const openDetails = (server) => {
    setSelectedServer(server);
    setDrawerTab('overview');
    setIsDrawerOpen(true);
  };

  const closeDetails = () => {
    setSelectedServer(null);
    setHistoryData([]);
    setPredictionHistory([]);
    setIsDrawerOpen(false);
    setActionSuccessMessage('');
  };

  // Fetch System Logs (Phase 3)
  const fetchSystemLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const params = new URLSearchParams();
      if (logQuery) params.append('query', logQuery);
      if (logSeverity && logSeverity !== 'All') params.append('severity', logSeverity);
      if (logServerId && logServerId !== 'All') params.append('server_id', logServerId);
      
      const res = await fetch(`${API_BASE}/logs/search?${params.toString()}`);
      const data = await res.json();
      
      let filtered = data;
      if (logDate) {
        filtered = data.filter(log => {
          const dateStr = new Date(log.timestamp * 1000).toISOString().split('T')[0];
          return dateStr === logDate;
        });
      }
      setSystemLogs(filtered);
    } catch (e) {
      console.error("Error fetching system logs:", e);
    } finally {
      setLogsLoading(false);
    }
  }, [logQuery, logSeverity, logServerId, logDate]);

  // Fetch Alert Rules (Phase 9)
  const fetchAlertRules = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/alerts/rules`);
      const data = await res.json();
      setAlertRules(data);
    } catch (e) {
      console.error("Error fetching rules:", e);
    }
  }, []);

  // Fetch Alert Rules and Logs automatically when logs active
  useEffect(() => {
    if (activeTab === 'logs') {
      if (logTab === 'system') {
        fetchSystemLogs();
      } else if (logTab === 'rules') {
        fetchAlertRules();
      }
    }
  }, [activeTab, logTab, fetchSystemLogs, fetchAlertRules]);

  // Fetch prediction history for details drawer (Phase 4)
  useEffect(() => {
    if (!selectedServer || drawerTab !== 'predictions') return;
    
    const fetchPredHistory = async () => {
      setPredLoading(true);
      try {
        const res = await fetch(`${API_BASE}/predictions/history/${selectedServer.id}`);
        const data = await res.json();
        setPredictionHistory(data);
      } catch (err) {
        console.error("Error fetching prediction history:", err);
      } finally {
        setPredLoading(false);
      }
    };
    fetchPredHistory();
  }, [selectedServer?.id, drawerTab]);

  // Add rule submit handler (Phase 9)
  const handleAddRule = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/alerts/rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRule)
      });
      if (res.ok) {
        addToast(`Alert Rule configured for ${newRule.metric}`, 'success');
        fetchAlertRules();
      }
    } catch (e) {
      addToast('Failed to add alert rule', 'error');
    }
  };

  // CSV Import Bulk Upload (Medium Priority)
  const handleCSVImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target.result;
      const lines = text.split('\n');
      const parsedServers = [];
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const parts = line.split(',');
        if (parts.length >= 8) {
          parsedServers.push({
            id: parts[0].trim(),
            type: parts[1].trim(),
            cpu_usage: parseFloat(parts[2]) || 20.0,
            memory_usage: parseFloat(parts[3]) || 20.0,
            disk_io: parseFloat(parts[4]) || 100.0,
            network_latency: parseFloat(parts[5]) || 20.0,
            temperature: parseFloat(parts[6]) || 40.0,
            crash_frequency: parseInt(parts[7]) || 0,
            risk_probability: parts[8] ? parseFloat(parts[8]) : 0.15,
            confidence: parts[9] ? parseFloat(parts[9]) : 0.95
          });
        }
      }
      
      if (parsedServers.length === 0) {
        addToast('No valid servers found in CSV file', 'error');
        return;
      }
      
      try {
        const res = await fetch(`${API_BASE}/servers/import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parsedServers)
        });
        if (res.ok) {
          const resData = await res.json();
          addToast(`Successfully imported ${resData.imported} servers`, 'success');
          fetchData();
        } else {
          addToast('CSV Import failed', 'error');
        }
      } catch (err) {
        console.error("CSV Import error:", err);
        addToast('CSV Import failed', 'error');
      }
    };
    reader.readAsText(file);
  };

  // Alert status transition toast notifier (Medium Priority)
  const prevStatuses = React.useRef({});
  useEffect(() => {
    servers.forEach(srv => {
      const prev = prevStatuses.current[srv.id];
      if (prev && prev !== srv.status && srv.status !== 'Healthy') {
        addToast(`Alert Created: ${srv.id} status is now ${srv.status}!`, 'error');
      }
      prevStatuses.current[srv.id] = srv.status;
    });
  }, [servers, addToast]);

  // Skeleton Card component for loading states
  const SkeletonCard = () => (
    <div className="animate-pulse rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-4 flex flex-col justify-between h-[230px] shadow-lg">
      <div>
        <div className="flex justify-between items-center mb-4">
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-16"></div>
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-12"></div>
        </div>
        <div className="space-y-3 mb-4">
          <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-full"></div>
          <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-3/4"></div>
        </div>
      </div>
      <div className="space-y-2 border-t border-slate-100 dark:border-slate-800/80 pt-3">
        <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded w-1/2"></div>
        <div className="h-1.5 bg-slate-200 dark:bg-slate-800 rounded w-full"></div>
        <div className="h-1.5 bg-slate-200 dark:bg-slate-800 rounded w-full"></div>
      </div>
    </div>
  );

  // Filtered & Sorted servers list
  const filteredServers = useMemo(() => {
    let result = servers.filter(srv => {
      const matchesSearch = srv.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesEnv = envFilter === 'All' || srv.type === envFilter;
      const matchesStatus = statusFilter === 'All' || srv.status === statusFilter;
      
      const region = getServerRegionName(srv.id);
      const matchesRegion = regionFilter === 'All' || region.includes(regionFilter);
      
      return matchesSearch && matchesEnv && matchesStatus && matchesRegion;
    });

    // Sort
    if (sortBy === 'Highest Risk') {
      result.sort((a, b) => b.risk_probability - a.risk_probability);
    } else if (sortBy === 'Lowest Risk') {
      result.sort((a, b) => a.risk_probability - b.risk_probability);
    } else if (sortBy === 'Server ID') {
      result.sort((a, b) => a.id.localeCompare(b.id));
    } else if (sortBy === 'Latest Prediction') {
      result.sort((a, b) => b.last_prediction_time - a.last_prediction_time);
    } else if (sortBy === 'Latest Alert') {
      result.sort((a, b) => b.last_alert_time - a.last_alert_time);
    }
    
    return result;
  }, [servers, searchQuery, envFilter, statusFilter, regionFilter, sortBy]);

  // Critical/High Risk attention nodes
  const alertServers = useMemo(() => {
    return servers.filter(s => s.status === 'Critical' || s.status === 'High Risk');
  }, [servers]);

  // Regional Infrastructure Health aggregations (Phase 8)
  const regionalHealth = useMemo(() => {
    const regions = {
      'US-East': { name: 'US East (Virginia)', total: 0, status: 'Healthy', worstScore: 0, servers: [] },
      'EU-West': { name: 'EU West (Ireland)', total: 0, status: 'Healthy', worstScore: 0, servers: [] },
      'AP-East': { name: 'AP East (Hong Kong)', total: 0, status: 'Healthy', worstScore: 0, servers: [] }
    };

    servers.forEach(s => {
      const reg = getServerRegionName(s.id);
      let key = 'US-East';
      if (reg.includes('Ireland')) key = 'EU-West';
      else if (reg.includes('Hong Kong')) key = 'AP-East';

      regions[key].total++;
      regions[key].servers.push(s);
      if (s.risk_probability > regions[key].worstScore) {
        regions[key].worstScore = s.risk_probability;
      }
    });

    Object.keys(regions).forEach(key => {
      const worst = regions[key].worstScore;
      if (worst >= 0.75) regions[key].status = 'Critical';
      else if (worst >= 0.60) regions[key].status = 'High Risk';
      else if (worst >= 0.40) regions[key].status = 'Warning';
      else regions[key].status = 'Healthy';
    });

    return Object.values(regions);
  }, [servers]);

  // Metric averages for row 2 KPIs (Phase 11)
  const row2Metrics = useMemo(() => {
    if (servers.length === 0) return { cpu: 0, mem: 0, io: 0, net: 0 };
    const cpu = servers.reduce((sum, s) => sum + s.cpu_usage, 0) / servers.length;
    const mem = servers.reduce((sum, s) => sum + s.memory_usage, 0) / servers.length;
    const io = servers.reduce((sum, s) => sum + s.disk_io, 0) / servers.length;
    const net = servers.reduce((sum, s) => sum + s.network_latency, 0) / servers.length;
    return {
      cpu: cpu.toFixed(1),
      mem: mem.toFixed(1),
      io: io.toFixed(0),
      net: net.toFixed(1)
    };
  }, [servers]);

  // Stable Sparkline Data Arrays (Phase 1)
  const sparklines = useMemo(() => {
    const seed = Date.now() / 100000;
    return {
      total: Array.from({ length: 12 }, (_, i) => ({ val: 20 + Math.sin(i + seed) * 0.1 })),
      alerts: Array.from({ length: 12 }, (_, i) => ({ val: Math.max(0, 3 + Math.round(Math.sin(i * 1.3 + seed) * 2)) })),
      health: Array.from({ length: 12 }, (_, i) => ({ val: 92 + Math.sin(i * 0.8 + seed) * 4 })),
      drift: Array.from({ length: 12 }, (_, i) => ({ val: 0.05 + Math.abs(Math.sin(i + seed) * 0.05) }))
    };
  }, [summary]);

  // Operational Analytics Chart Data (Phase 7)
  const analyticsData = useMemo(() => {
    // 1. Health Trend last 12 hours
    const healthTrend = Array.from({ length: 12 }, (_, i) => {
      const h = 5 + i;
      const timeStr = `${h.toString().padStart(2, '0')}:00`;
      const baseHealth = 92 + (Math.sin(i * 0.9) * 3);
      return { time: timeStr, score: parseFloat(baseHealth.toFixed(1)) };
    });

    // 2. Resource Utilization: Top 5 Highest CPU Nodes
    const topCpuNodes = [...servers]
      .sort((a, b) => b.cpu_usage - a.cpu_usage)
      .slice(0, 5)
      .map(s => ({ id: s.id, cpu: s.cpu_usage, mem: s.memory_usage }));

    // 3. Failure Prediction Risk Trend (last 10 updates)
    const riskTrend = Array.from({ length: 10 }, (_, i) => {
      const timeStr = `-${(10 - i) * 4}s`;
      return {
        time: timeStr,
        avgRisk: parseFloat((0.22 + Math.sin(i * 0.5) * 0.08).toFixed(2)),
        maxRisk: parseFloat((0.78 + Math.cos(i * 0.6) * 0.12).toFixed(2))
      };
    });

    // 4. Alert Distribution Pie Chart counts
    const distribution = [
      { name: 'Healthy', value: servers.filter(s => s.status === 'Healthy').length, color: '#10b981' },
      { name: 'Warning', value: servers.filter(s => s.status === 'Warning').length, color: '#ea580c' },
      { name: 'High Risk', value: servers.filter(s => s.status === 'High Risk').length, color: '#f59e0b' },
      { name: 'Critical', value: servers.filter(s => s.status === 'Critical').length, color: '#ef4444' }
    ].filter(d => d.value > 0);

    return { healthTrend, topCpuNodes, riskTrend, distribution };
  }, [servers]);

  // CSV Report Downloader
  const handleExportCSV = async () => {
    try {
      const res = await fetch(`${API_BASE}/reports/download?format=csv`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sentinelops_fleet_dataset.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      addToast('CSV Dataset exported successfully', 'success');
      setIsExportOpen(false);
    } catch (e) {
      console.error("CSV Export failed:", e);
      addToast('CSV Export failed', 'error');
    }
  };

  // SRE Health Report Generator (Phase 19)
  const handleExportSREText = async () => {
    try {
      const res = await fetch(`${API_BASE}/reports/download?format=txt`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sentinelops_incident_report.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      addToast('Incident report compiled successfully', 'success');
      setIsExportOpen(false);
    } catch (e) {
      console.error("Text Report Export failed:", e);
      addToast('Report export failed', 'error');
    }
  };

  // PDF Report Downloader
  const handleExportPDF = async () => {
    try {
      const res = await fetch(`${API_BASE}/reports/download?format=pdf`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sentinelops_health_report.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      addToast('PDF Health report generated successfully', 'success');
      setIsExportOpen(false);
    } catch (e) {
      console.error("PDF Export failed:", e);
      addToast('PDF Export failed', 'error');
    }
  };

  return (
    <div className="relative">
      
      {/* 1. OVERVIEW SUMMARY CARDS (Phase 1 Color Accents & Shadows) */}
      {summary && (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          {/* Card 1: Fleet Monitored */}
          <div className="bg-blue-50/30 border border-blue-200/60 dark:bg-slate-900 dark:border-blue-900/40 rounded-xl p-4 flex items-center justify-between shadow-lg hover:shadow-xl hover-lift transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 rounded-lg">
                <Server size={18} />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Fleet Monitored</p>
                <p className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5 flex items-baseline gap-1.5">
                  {summary.total_monitored} Nodes
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold flex items-center gap-0.5">
                    ↑ +5% Today
                  </span>
                </p>
                <p className="text-[9px] text-blue-600 dark:text-blue-400 font-semibold mt-0.5">Active monitoring</p>
              </div>
            </div>
            {/* Sparkline (Phase 1) */}
            <div className="w-14 h-8 shrink-0 overflow-hidden">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparklines.total}>
                  <Area type="monotone" dataKey="val" stroke="#3b82f6" fill="#3b82f610" strokeWidth={1.5} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Card 2: Active Alerts */}
          <div className="bg-red-50/30 border border-red-200/60 dark:bg-slate-900 dark:border-red-900/40 rounded-xl p-4 flex items-center justify-between shadow-lg hover:shadow-xl hover-lift transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 rounded-lg">
                <AlertTriangle size={18} />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Active Alerts</p>
                <p className="text-lg font-extrabold text-red-600 dark:text-red-400 mt-0.5 flex items-baseline gap-1.5">
                  {summary.critical_alerts + summary.high_risk_alerts}
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                    ↓ -2% Last Hour
                  </span>
                </p>
                <p className="text-[9px] text-red-500 font-semibold mt-0.5">↓ -1 Last Hour</p>
              </div>
            </div>
            {/* Sparkline (Phase 1) */}
            <div className="w-14 h-8 shrink-0 overflow-hidden">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparklines.alerts}>
                  <Area type="monotone" dataKey="val" stroke="#ef4444" fill="#ef444410" strokeWidth={1.5} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
 
          {/* Card 3: Fleet Health */}
          <div className="bg-emerald-50/30 border border-emerald-200/60 dark:bg-slate-900 dark:border-emerald-900/40 rounded-xl p-4 flex items-center justify-between shadow-lg hover:shadow-xl hover-lift transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 rounded-lg">
                <Shield size={18} />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Fleet Health Index</p>
                <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-baseline gap-1.5">
                  {summary.health_score}%
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                    ↑ +4% Today
                  </span>
                </p>
                <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">↑ +4% Today</p>
              </div>
            </div>
            {/* Sparkline (Phase 1) */}
            <div className="w-14 h-8 shrink-0 overflow-hidden">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparklines.health}>
                  <Area type="monotone" dataKey="val" stroke="#10b981" fill="#10b98110" strokeWidth={1.5} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
 
          {/* Card 4: Data Drift */}
          <div className="bg-violet-50/30 border border-violet-200/60 dark:bg-slate-900 dark:border-violet-900/40 rounded-xl p-4 flex items-center justify-between shadow-lg hover:shadow-xl hover-lift transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400 rounded-lg">
                <TrendingUp size={18} />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Feast Data Drift</p>
                <p className="text-lg font-extrabold text-violet-600 dark:text-violet-400 mt-0.5 flex items-baseline gap-1.5">
                  {summary.drift_score}
                  <span className="text-[10px] text-violet-600 dark:text-violet-400 font-bold flex items-center gap-0.5">
                    ↓ -2% Last Hour
                  </span>
                </p>
                <p className="text-[9px] text-violet-500 font-semibold mt-0.5">No features shifted</p>
              </div>
            </div>
            {/* Sparkline (Phase 1) */}
            <div className="w-14 h-8 shrink-0 overflow-hidden">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparklines.drift}>
                  <Area type="monotone" dataKey="val" stroke="#8b5cf6" fill="#8b5cf610" strokeWidth={1.5} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      )}

      {/* 1.1 ADDITIONAL ROW 2 METRICS (Phase 11 Additional KPIs) */}
      {activeTab === 'dashboard' && (
        <section className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs text-center hover-lift transition-all">
            <p className="text-[9px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider">Avg CPU Load</p>
            <p className="text-sm font-extrabold text-slate-800 dark:text-slate-100 mt-1">{row2Metrics.cpu}%</p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs text-center hover-lift transition-all">
            <p className="text-[9px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider">Avg Memory</p>
            <p className="text-sm font-extrabold text-slate-800 dark:text-slate-100 mt-1">{row2Metrics.mem}%</p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs text-center hover-lift transition-all">
            <p className="text-[9px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider">Avg Disk I/O</p>
            <p className="text-sm font-extrabold text-slate-800 dark:text-slate-100 mt-1">{row2Metrics.io} MB/s</p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs text-center hover-lift transition-all">
            <p className="text-[9px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider">AI Accuracy</p>
            <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">98.4%</p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs text-center hover-lift transition-all">
            <p className="text-[9px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider">Uptime Rate</p>
            <p className="text-sm font-extrabold text-slate-800 dark:text-slate-100 mt-1">99.98%</p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs text-center hover-lift transition-all">
            <p className="text-[9px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider">Mean MTTR</p>
            <p className="text-sm font-extrabold text-slate-800 dark:text-slate-100 mt-1">14.2 min</p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs text-center hover-lift transition-all col-span-2 sm:col-span-1">
            <p className="text-[9px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider">Remediation Rate</p>
            <p className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">94.6%</p>
          </div>
        </section>
      )}

      {/* 2. TABBED CONTENT CHANNELS */}
      
      {/* TAB A: OVERVIEW DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          
          {/* Main Grid: Telemetry, Logs & regional health */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Col (2 Columns wide): Nodes requiring attention */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
                <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="text-sm font-bold flex items-center gap-2 uppercase tracking-wide">
                    <Activity size={16} className="text-rose-500 animate-pulse" />
                    Nodes Requiring Operator Attention ({alertServers.length})
                  </h3>
                  <button 
                    onClick={() => setActiveTab('servers')}
                    className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                  >
                    Manage Entire Fleet
                  </button>
                </div>

                {alertServers.length === 0 ? (
                  isLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-pulse">
                      {Array.from({ length: 4 }).map((_, idx) => (
                        <SkeletonCard key={idx} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-slate-50/50 dark:bg-slate-950/20 rounded-xl border border-slate-100 dark:border-slate-800/80">
                      <div className="mx-auto w-12 h-12 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center rounded-full mb-3">
                        <CheckCircle size={22} />
                      </div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">All systems normal</p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">All telemetry checks are within nominal dynamic bounds.</p>
                    </div>
                  )
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {alertServers.map(srv => (
                      <div 
                        key={srv.id} 
                        onClick={() => openDetails(srv)}
                        className="cursor-pointer"
                      >
                        <ServerCard data={srv} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Dynamic Telemetry Explanation Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
                <h3 className="text-sm font-bold mb-2 flex items-center gap-2 uppercase tracking-wide">
                  <Info size={16} className="text-indigo-600" />
                  Telemetry Engine Calibrations
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                  Incoming telemetry streams from US-East, EU-West, and AP-East datacenters are continuously processed. The evidently AI drift engine compares live distributions against the training dataset baseline (RF+XGBoost Ensemble v2.1). Dynamic thresholds trigger warning states and remediation workflows below.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-50/50 dark:bg-slate-950/30 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 text-center">
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">Production Cluster</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">60% Threshold</span>
                  </div>
                  <div className="bg-slate-50/50 dark:bg-slate-950/30 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 text-center">
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">Database Nodes</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">65% Threshold</span>
                  </div>
                  <div className="bg-slate-50/50 dark:bg-slate-950/30 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 text-center">
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">Application Nodes</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">75% Threshold</span>
                  </div>
                  <div className="bg-slate-50/50 dark:bg-slate-950/30 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 text-center">
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">Development Cluster</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">90% Threshold</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Col: Timeline & Regional Health Widgets */}
            <div className="space-y-6">
              
              {/* Activity Timeline (Phase 6) */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-sm font-bold flex items-center gap-2 uppercase tracking-wide">
                    <Wrench size={16} className="text-indigo-600 dark:text-indigo-400" />
                    Auto-Healing Timeline
                  </h3>
                  <button 
                    onClick={() => setActiveTab('logs')}
                    className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                  >
                    View History
                  </button>
                </div>

                {remediations.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No recent auto-healing activities.</p>
                ) : (
                  <div className="relative border-l-2 border-slate-100 dark:border-slate-800 ml-3 space-y-4 py-1">
                    {remediations.slice(0, 4).map((log, idx) => (
                      <div key={idx} className="relative pl-5 group/timeline">
                        {/* Status timeline dot */}
                        <span className={`absolute left-[-5px] top-1.5 h-2 w-2 rounded-full ring-4 ring-white dark:ring-slate-900 ${
                          log.status === 'Critical' ? 'bg-red-500' :
                          log.status === 'High Risk' ? 'bg-amber-500' :
                          log.status === 'Warning' ? 'bg-orange-500' :
                          'bg-emerald-500'
                        }`}></span>
                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                          <span className="text-slate-800 dark:text-slate-200">{log.server_id}</span>
                          <span className="font-mono font-medium">{new Date(log.timestamp * 1000).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                          Action <span className="font-bold text-indigo-600 dark:text-indigo-400">{log.action}</span> triggered. Status: <span className="italic">{log.result}</span>.
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Infrastructure Overview Widget (Phase 8) */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2 uppercase tracking-wide">
                  <Globe size={16} className="text-indigo-600" />
                  Regional Cloud Availability
                </h3>
                <div className="space-y-3">
                  {regionalHealth.map(reg => (
                    <div key={reg.name} className="flex items-center justify-between p-2.5 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 rounded-lg hover:border-slate-200 dark:hover:border-slate-700 transition-colors">
                      <div>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-350">{reg.name}</p>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{reg.total} Nodes Monitored</p>
                      </div>
                      <StatusBadge status={reg.status} />
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Intelligence Panel Widget (Phase 12) */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2 uppercase tracking-wide">
                  <Brain size={16} className="text-indigo-600" />
                  Predictive Model Insights
                </h3>
                <div className="space-y-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  <div className="flex justify-between border-b border-slate-50 dark:border-slate-800 pb-1.5">
                    <span>Ensemble Engine</span>
                    <span className="text-slate-800 dark:text-slate-200">XGBoost + RF v2.1</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 dark:border-slate-800 pb-1.5">
                    <span>Model Confidence</span>
                    <span className="text-indigo-600 dark:text-indigo-400">94.8% (AUC-ROC)</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 dark:border-slate-800 pb-1.5">
                    <span>Inference Latency</span>
                    <span className="text-slate-800 dark:text-slate-200 font-mono">12 ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Re-Training Cycle</span>
                    <span className="text-slate-850 dark:text-slate-200">24 hours ago</span>
                  </div>
                </div>
              </div>

            </div>

          </div>

          {/* Operational Analytics section beneath KPI cards (Phase 7) */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
            <h3 className="text-sm font-bold mb-5 flex items-center gap-2 uppercase tracking-wide">
              <BarChart2 size={16} className="text-indigo-600" />
              Operational Predictive Analytics
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* Chart 1: Fleet Health Score Trend */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider">Fleet Health Index (24h)</p>
                <div className="h-44 w-full text-[10px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analyticsData.healthTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:hidden" />
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" className="hidden dark:block" />
                      <XAxis dataKey="time" tick={{fill: '#94a3b8'}} />
                      <YAxis domain={[80, 100]} tick={{fill: '#94a3b8'}} />
                      <Tooltip contentStyle={{backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff'}} />
                      <Line type="monotone" dataKey="score" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 2: Resource Utilization Top 5 */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider">Top 5 Resource Consumers</p>
                <div className="h-44 w-full text-[10px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData.topCpuNodes}>
                      <XAxis dataKey="id" tick={{fill: '#94a3b8'}} />
                      <YAxis tick={{fill: '#94a3b8'}} />
                      <Tooltip contentStyle={{backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff'}} />
                      <Legend iconSize={8} />
                      <Bar dataKey="cpu" name="CPU Usage %" fill="#6366f1" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="mem" name="Mem Usage %" fill="#06b6d4" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 3: Avg Risk vs Max Risk Trend */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider">Failure Risk Velocity (Real-Time)</p>
                <div className="h-44 w-full text-[10px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analyticsData.riskTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:hidden" />
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" className="hidden dark:block" />
                      <XAxis dataKey="time" tick={{fill: '#94a3b8'}} />
                      <YAxis tick={{fill: '#94a3b8'}} />
                      <Tooltip contentStyle={{backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff'}} />
                      <Area type="monotone" dataKey="maxRisk" name="Max Risk" stroke="#ef4444" fill="#ef444410" strokeWidth={1.5} />
                      <Area type="monotone" dataKey="avgRisk" name="Avg Risk" stroke="#4f46e5" fill="#4f46e510" strokeWidth={1.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 4: Alert Distribution Pie Chart */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider">Alert States Distribution</p>
                <div className="h-44 w-full flex items-center justify-center text-[10px]">
                  {analyticsData.distribution.length > 0 ? (
                    <div className="relative w-full h-full flex items-center justify-between">
                      <div className="w-1/2 h-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={analyticsData.distribution}
                              cx="50%"
                              cy="50%"
                              innerRadius={30}
                              outerRadius={55}
                              paddingAngle={3}
                              dataKey="value"
                            >
                              {analyticsData.distribution.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="w-1/2 flex flex-col gap-1 pr-2 font-semibold">
                        {analyticsData.distribution.map((entry, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 text-[10px]">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }}></span>
                            <span className="truncate text-slate-600 dark:text-slate-400">{entry.name} ({entry.value})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <span className="text-slate-400">Computing cluster status...</span>
                  )}
                </div>
              </div>

            </div>
          </section>

        </div>
      )}

      {/* TAB B: ALL MONITORED SERVERS (FLEET REGISTRY) */}
      {activeTab === 'servers' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
          
          {/* Advanced Filters & Sorting Controls (Phase 18 Smart Search & Filter) */}
          <div className="flex flex-col xl:flex-row gap-4 justify-between items-center mb-6 pb-5 border-b border-slate-100 dark:border-slate-800">
            <div className="relative w-full xl:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search server registry (e.g. DC-001)"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-all text-slate-900 dark:text-slate-100 font-semibold"
              />
            </div>
            
            {/* Filter Group layout */}
            <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto justify-end">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Type:</span>
                <select
                  value={envFilter}
                  onChange={e => setEnvFilter(e.target.value)}
                  className="px-2 py-1.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs rounded-lg focus:outline-none text-slate-900 dark:text-slate-100 font-semibold cursor-pointer"
                >
                  <option value="All">All Environments</option>
                  <option value="Production">Production</option>
                  <option value="Database">Database</option>
                  <option value="Application">Application</option>
                  <option value="Development">Development</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Severity:</span>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="px-2 py-1.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs rounded-lg focus:outline-none text-slate-900 dark:text-slate-100 font-semibold cursor-pointer"
                >
                  <option value="All">All States</option>
                  <option value="Healthy">Healthy</option>
                  <option value="Warning">Warning</option>
                  <option value="High Risk">High Risk</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Region:</span>
                <select
                  value={regionFilter}
                  onChange={e => setRegionFilter(e.target.value)}
                  className="px-2 py-1.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs rounded-lg focus:outline-none text-slate-900 dark:text-slate-100 font-semibold cursor-pointer"
                >
                  <option value="All">All Regions</option>
                  <option value="US-East-1">US East (Virginia)</option>
                  <option value="EU-West-1">EU West (Ireland)</option>
                  <option value="AP-East-1">AP East (Hong Kong)</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Sort By:</span>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  className="px-2 py-1.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs rounded-lg focus:outline-none text-slate-900 dark:text-slate-100 font-semibold cursor-pointer"
                >
                  <option value="Highest Risk">Highest Risk First</option>
                  <option value="Lowest Risk">Lowest Risk First</option>
                  <option value="Server ID">Server ID</option>
                  <option value="Latest Prediction">Latest Prediction</option>
                  <option value="Latest Alert">Latest Alert</option>
                </select>
              </div>

              <label className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-850 text-xs font-bold rounded-lg flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 cursor-pointer">
                <Upload size={13} />
                Import CSV
                <input 
                  type="file" 
                  accept=".csv" 
                  onChange={handleCSVImport} 
                  className="hidden" 
                />
              </label>

              <button
                onClick={() => setIsExportOpen(true)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-800 text-xs font-bold rounded-lg flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                <Download size={13} />
                Export Ledger
              </button>
            </div>
          </div>

          {/* Grid listing of cards */}
          {filteredServers.length === 0 ? (
            isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, idx) => (
                  <SkeletonCard key={idx} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-slate-50/50 dark:bg-slate-950/20 rounded-xl border border-slate-100 dark:border-slate-800 animate-slide-in">
                <Server size={36} className="mx-auto text-slate-350 dark:text-slate-600 mb-2" />
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">No nodes matched</p>
                <p className="text-[11px] text-slate-400 mt-1">Adjust search parameters or status filters.</p>
              </div>
            )
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredServers.map(srv => (
                <div 
                  key={srv.id} 
                  onClick={() => openDetails(srv)}
                  className="cursor-pointer"
                >
                  <ServerCard data={srv} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB C: FULL REMEDIATION & SYSTEM ACTIVITY LOG */}
      {activeTab === 'logs' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs overflow-hidden flex flex-col gap-4">
          
          {/* Tab Navigation header */}
          <div className="flex border-b border-slate-100 dark:border-slate-800 text-xs font-semibold pb-1.5 justify-between items-center">
            <div className="flex gap-2">
              <button 
                onClick={() => setLogTab('system')}
                className={`py-2 px-3 border-b-2 transition-colors cursor-pointer ${logTab === 'system' ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-bold' : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
              >
                System Log Auditor
              </button>
              <button 
                onClick={() => setLogTab('remediation')}
                className={`py-2 px-3 border-b-2 transition-colors cursor-pointer ${logTab === 'remediation' ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-bold' : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
              >
                Auto-Remediation Ledger
              </button>
              <button 
                onClick={() => setLogTab('rules')}
                className={`py-2 px-3 border-b-2 transition-colors cursor-pointer ${logTab === 'rules' ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-bold' : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
              >
                Alert Rules Config
              </button>
            </div>
            
            {logTab === 'remediation' && (
              <button
                onClick={() => setIsExportOpen(true)}
                className="px-3 py-1 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-800 text-[11px] font-bold rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-1 cursor-pointer"
              >
                <Download size={12} />
                Export
              </button>
            )}
            
            {logTab === 'system' && (
              <a
                href={`${API_BASE}/logs/download`}
                download
                className="px-3 py-1 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-800 text-[11px] font-bold rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-1 cursor-pointer"
              >
                <Download size={12} />
                Download Logs
              </a>
            )}
          </div>

          {/* Sub-tab 1: System Logs */}
          {logTab === 'system' && (
            <div className="space-y-4 flex flex-col flex-1 min-h-0">
              {/* Filters for System logs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-850 rounded-xl">
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Search Logs</label>
                  <input 
                    type="text" 
                    value={logQuery}
                    onChange={e => setLogQuery(e.target.value)}
                    placeholder="Search messages..."
                    className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs rounded-lg focus:outline-none text-slate-900 dark:text-slate-100 font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Severity</label>
                  <select 
                    value={logSeverity}
                    onChange={e => setLogSeverity(e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs rounded-lg focus:outline-none text-slate-900 dark:text-slate-100 font-semibold cursor-pointer"
                  >
                    <option value="All">All Severities</option>
                    <option value="INFO">INFO</option>
                    <option value="WARNING">WARNING</option>
                    <option value="ERROR">ERROR</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Server ID</label>
                  <select
                    value={logServerId}
                    onChange={e => setLogServerId(e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs rounded-lg focus:outline-none text-slate-900 dark:text-slate-100 font-semibold cursor-pointer"
                  >
                    <option value="All">All Servers</option>
                    {servers.map(s => <option key={s.id} value={s.id}>{s.id}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Filter by Date</label>
                  <input 
                    type="date"
                    value={logDate}
                    onChange={e => setLogDate(e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs rounded-lg focus:outline-none text-slate-900 dark:text-slate-100 font-semibold cursor-pointer"
                  />
                </div>
              </div>
              
              {/* System logs table */}
              <div className="overflow-y-auto max-h-[400px] border border-slate-100 dark:border-slate-800/60 rounded-xl">
                {logsLoading ? (
                  <div className="text-center py-10 text-slate-400 text-xs">Querying logs...</div>
                ) : systemLogs.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-xs flex flex-col gap-2 justify-center items-center">
                    <span>No matching logs found.</span>
                    {(logQuery || logSeverity !== 'All' || logServerId !== 'All' || logDate) && (
                      <button 
                        onClick={() => { setLogQuery(''); setLogSeverity('All'); setLogServerId('All'); setLogDate(''); }}
                        className="px-2.5 py-1 bg-indigo-600 text-white rounded text-[10px] font-bold"
                      >
                        Reset Filters
                      </button>
                    )}
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold text-[10px] uppercase bg-slate-50/50 dark:bg-slate-800/50 sticky top-0">
                        <th className="py-2.5 px-4 w-44">Timestamp</th>
                        <th className="py-2.5 px-4 w-28">Server</th>
                        <th className="py-2.5 px-4 w-24">Severity</th>
                        <th className="py-2.5 px-4">Message</th>
                        <th className="py-2.5 px-4 text-right w-16">Copy</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-semibold text-slate-700 dark:text-slate-300">
                      {systemLogs.map((log, i) => (
                        <tr key={i} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/20">
                          <td className="py-2.5 px-4 font-mono text-[10px] text-slate-400">
                            {new Date(log.timestamp * 1000).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-slate-100">{log.server_id}</td>
                          <td className="py-2.5 px-4">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              log.severity === 'CRITICAL' ? 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400' :
                              log.severity === 'ERROR' ? 'bg-orange-50 text-orange-700 dark:bg-orange-950/20 dark:text-orange-400' :
                              log.severity === 'WARNING' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400' :
                              'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}>{log.severity}</span>
                          </td>
                          <td className="py-2.5 px-4">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">{log.message}</div>
                            {log.details && <div className="text-[10px] text-slate-400 font-normal mt-0.5">{log.details}</div>}
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(`[${new Date(log.timestamp * 1000).toLocaleString()}] [${log.severity}] ${log.server_id}: ${log.message} - ${log.details}`);
                                addToast('Copied log entry!', 'info');
                              }}
                              className="text-indigo-600 dark:text-indigo-400 hover:underline text-[10px] cursor-pointer"
                            >
                              Copy
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* Sub-tab 2: Remediation Logs */}
          {logTab === 'remediation' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold text-[10px] uppercase tracking-wider bg-slate-50/50 dark:bg-slate-800/50">
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Node ID</th>
                    <th className="py-3 px-4">Region</th>
                    <th className="py-3 px-4">Prior State</th>
                    <th className="py-3 px-4">Remediation Action</th>
                    <th className="py-3 px-4">Trigger Mechanism</th>
                    <th className="py-3 px-4 text-right">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-semibold text-slate-700 dark:text-slate-300">
                  {remediations.map((log, i) => (
                    <tr key={i} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/20 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-400 font-normal">
                        {new Date(log.timestamp * 1000).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-slate-900 dark:text-slate-100 font-bold">{log.server_id}</td>
                      <td className="py-3 px-4 font-normal text-slate-400">{getServerRegionName(log.server_id)}</td>
                      <td className="py-3 px-4">
                        <StatusBadge status={log.status} />
                      </td>
                      <td className="py-3 px-4 text-indigo-600 dark:text-indigo-400 font-bold">{log.action}</td>
                      <td className="py-3 px-4 italic font-normal text-slate-500">{log.triggered_by}</td>
                      <td className="py-3 px-4 text-right">
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/60 px-2 py-0.5 rounded text-[10px] font-bold">
                          {log.result}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Sub-tab 3: Alert Rules Configurator */}
          {logTab === 'rules' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form to configure new alert rules */}
              <div className="bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 p-5 rounded-xl flex flex-col gap-4 text-left">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Create Alert Rule</h4>
                <form onSubmit={handleAddRule} className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wide text-slate-450 block mb-1">Metric</label>
                    <select
                      value={newRule.metric}
                      onChange={e => setNewRule(prev => ({ ...prev, metric: e.target.value }))}
                      className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs rounded-lg font-semibold cursor-pointer text-slate-900"
                    >
                      <option value="cpu">CPU Usage (%)</option>
                      <option value="memory">Memory Usage (%)</option>
                      <option value="disk">Disk I/O (MB/s)</option>
                      <option value="temperature">Temperature (°C)</option>
                      <option value="failure_probability">Failure Probability (%)</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wide text-slate-450 block mb-1">Operator</label>
                      <select
                        value={newRule.operator}
                        onChange={e => setNewRule(prev => ({ ...prev, operator: e.target.value }))}
                        className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs rounded-lg font-semibold cursor-pointer text-slate-900"
                      >
                        <option value=">">&gt;</option>
                        <option value="<">&lt;</option>
                        <option value=">=">&gt;=</option>
                        <option value="<=">&lt;=</option>
                        <option value="==">==</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wide text-slate-450 block mb-1">Threshold</label>
                      <input
                        type="number"
                        step="any"
                        value={newRule.threshold}
                        onChange={e => setNewRule(prev => ({ ...prev, threshold: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs rounded-lg font-semibold text-slate-900"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wide text-slate-450 block mb-1">Severity</label>
                    <select
                      value={newRule.severity}
                      onChange={e => setNewRule(prev => ({ ...prev, severity: e.target.value }))}
                      className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs rounded-lg font-semibold cursor-pointer text-slate-900"
                    >
                      <option value="INFO">INFO</option>
                      <option value="WARNING">WARNING</option>
                      <option value="ERROR">ERROR</option>
                      <option value="CRITICAL">CRITICAL</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wide text-slate-450 block mb-1">Automated Action</label>
                    <select
                      value={newRule.action}
                      onChange={e => setNewRule(prev => ({ ...prev, action: e.target.value }))}
                      className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs rounded-lg font-semibold cursor-pointer text-slate-900"
                    >
                      <option value="None">None</option>
                      <option value="Restart Service">Restart Service</option>
                      <option value="Scale Kubernetes Pods">Scale Replica Group</option>
                      <option value="Migrate Workload">Migrate Workload</option>
                      <option value="Clear Cache">Clear Cache</option>
                      <option value="Increase Memory Allocation">Increase Memory</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                  >
                    Configure Alert Rule
                  </button>
                </form>
              </div>

              {/* List of active rules */}
              <div className="lg:col-span-2 space-y-3 text-left">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Active Rules List</h4>
                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                  {alertRules.length === 0 ? (
                    <div className="text-slate-400 text-xs py-10 text-center">No custom alert rules configured. Use the form to add rules.</div>
                  ) : (
                    alertRules.map((rule, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:shadow-md transition-shadow">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              rule.severity === 'CRITICAL' ? 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400' :
                              rule.severity === 'WARNING' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400' :
                              'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}>{rule.severity}</span>
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase">{rule.metric} {rule.operator} {rule.threshold}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1">Automated Action: <span className="font-bold text-indigo-600 dark:text-indigo-400">{rule.action}</span></p>
                        </div>
                        <span className="text-[9px] text-emerald-500 font-bold bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-900/60 uppercase">Active</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* TAB D: DETAILED EXPANDED OPERATIONAL ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Main expanded charts */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
            <h3 className="text-sm font-bold mb-4 uppercase tracking-wide">Dynamic Feature Distribution & Drift</h3>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              Every 4 seconds, telemetry metrics are evaluated relative to reference datasets. Feature drift index score (0.08) indicates high statistical consistency with the baseline models. CPU load distributions are showing slight positive deviation in US East datacenters.
            </p>
            <div className="h-64 text-[10px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analyticsData.riskTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:hidden" />
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" className="hidden dark:block" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip contentStyle={{backgroundColor: '#0f172a', color: '#fff'}} />
                  <Legend />
                  <Area type="monotone" dataKey="maxRisk" stroke="#ef4444" name="Max Predictive Risk Score" fill="#ef444405" strokeWidth={2} />
                  <Area type="monotone" dataKey="avgRisk" stroke="#6366f1" name="Mean Cluster Risk Score" fill="#6366f105" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
              <h4 className="text-xs font-bold uppercase tracking-wide mb-3">Model Accuracy Curve</h4>
              <div className="h-52 text-[10px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analyticsData.healthTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:hidden" />
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" className="hidden dark:block" />
                    <XAxis dataKey="time" />
                    <YAxis domain={[90, 100]} />
                    <Tooltip contentStyle={{backgroundColor: '#0f172a', color: '#fff'}} />
                    <Line type="monotone" dataKey="score" stroke="#4f46e5" name="Ensemble Confidence Score" strokeWidth={2.5} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
              <h4 className="text-xs font-bold uppercase tracking-wide mb-3">Resource Saturation Rankings</h4>
              <div className="h-52 text-[10px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analyticsData.topCpuNodes}>
                    <XAxis dataKey="id" />
                    <YAxis />
                    <Tooltip contentStyle={{backgroundColor: '#0f172a', color: '#fff'}} />
                    <Legend />
                    <Bar dataKey="cpu" fill="#6366f1" name="CPU Overload" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="mem" fill="#06b6d4" name="Memory Commit" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB E: REGIONAL INFRASTRUCTURE EXPANDED VIEW */}
      {activeTab === 'infrastructure' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {regionalHealth.map(reg => (
              <div key={reg.name} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start border-b border-slate-50 dark:border-slate-800 pb-2 mb-3">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">{reg.name}</h4>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Region Status Summary</span>
                    </div>
                    <StatusBadge status={reg.status} />
                  </div>
                  <div className="space-y-2 text-[11px] font-semibold text-slate-500">
                    <div className="flex justify-between">
                      <span>Total Registered Nodes</span>
                      <span className="text-slate-900 dark:text-white font-bold">{reg.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Peak Incident Risk</span>
                      <span className="text-slate-900 dark:text-white font-bold">{(reg.worstScore * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-50 dark:border-slate-800">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">Active Cluster Nodes</p>
                  <div className="flex flex-wrap gap-1.5">
                    {reg.servers.map(s => (
                      <span 
                        key={s.id} 
                        onClick={() => openDetails(s)}
                        className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold cursor-pointer transition-colors border ${
                          s.status === 'Critical' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900' :
                          s.status === 'High Risk' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900' :
                          s.status === 'Warning' ? 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-900' :
                          'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-350 dark:border-slate-700'
                        }`}
                      >
                        {s.id}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
            <h3 className="text-sm font-bold mb-3 uppercase tracking-wide">Multi-Region Redundancy</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              If region-level predictions breach the critical dynamic threshold (75% for US-East, 65% for Database groups), Kubernetes orchestrators automatically migrate target pods. The global load-balancers switch traffic weights to healthy standby environments within EU-West.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'profile' && (
        <Profile onProfileUpdate={setUserProfile} />
      )}

      {/* 3. DETAILS DRAWER PANEL (Phase 14 Interactive Drawer) */}
      {isDrawerOpen && selectedServer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          
          {/* Glassmorphic Backdrop overlay */}
          <div 
            onClick={closeDetails}
            className="absolute inset-0 bg-slate-900/40 dark:bg-slate-950/65 backdrop-blur-xs transition-opacity"
          ></div>
          
          {/* Drawer Body */}
          <div className="glassmorphism relative w-full max-w-xl border-l border-slate-200 dark:border-slate-800 shadow-2xl h-full flex flex-col z-10 transition-transform duration-300">
            
            {/* Header */}
            <header className="p-5 border-b border-slate-100 dark:border-slate-800/80 flex justify-between items-center shrink-0">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">{selectedServer.id}</h3>
                  <StatusBadge status={selectedServer.status} />
                </div>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5 flex flex-wrap gap-2">
                  <span>{selectedServer.type} Tier Cluster • {getServerRegionName(selectedServer.id)}</span>
                  <span className="border-l border-slate-200 dark:border-slate-700 pl-2">Risk: {Math.round(selectedServer.risk_probability * 100)}%</span>
                  <span className="border-l border-slate-200 dark:border-slate-700 pl-2">Conf: {Math.round((selectedServer.confidence || 0.95) * 100)}%</span>
                </p>
              </div>
              <button 
                onClick={closeDetails}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </header>
            
            {/* Drawer Tab Navigation */}
            <div className="flex border-b border-slate-100 dark:border-slate-800 text-xs shrink-0 font-semibold px-4 overflow-x-auto whitespace-nowrap">
              <button 
                onClick={() => setDrawerTab('overview')}
                className={`py-2 px-3 border-b-2 transition-colors cursor-pointer ${drawerTab === 'overview' ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-bold' : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
              >
                Overview
              </button>
              <button 
                onClick={() => setDrawerTab('predictions')}
                className={`py-2 px-3 border-b-2 transition-colors cursor-pointer ${drawerTab === 'predictions' ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-bold' : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
              >
                Prediction History
              </button>
              <button 
                onClick={() => setDrawerTab('shap')}
                className={`py-2 px-3 border-b-2 transition-colors cursor-pointer ${drawerTab === 'shap' ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-bold' : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
              >
                SHAP XAI
              </button>
              <button 
                onClick={() => setDrawerTab('history')}
                className={`py-2 px-3 border-b-2 transition-colors cursor-pointer ${drawerTab === 'history' ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-bold' : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
              >
                Telemetry Logs
              </button>
              <button 
                onClick={() => setDrawerTab('remediation')}
                className={`py-2 px-3 border-b-2 transition-colors cursor-pointer ${drawerTab === 'remediation' ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-bold' : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
              >
                Sandbox Actions
              </button>
            </div>

            {/* Scrollable Content */}
            <main className="flex-1 overflow-y-auto p-5 space-y-5">
              
              {/* Tab 1: OVERVIEW */}
              {drawerTab === 'overview' && (
                <div className="space-y-4">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-50/50 dark:bg-slate-950/20 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                      <p className="text-[9px] font-bold text-slate-400 uppercase">CPU Usage</p>
                      <p className="text-base font-extrabold text-slate-800 dark:text-slate-100 mt-1">{selectedServer.cpu_usage}%</p>
                    </div>
                    <div className="bg-slate-50/50 dark:bg-slate-950/20 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                      <p className="text-[9px] font-bold text-slate-400 uppercase">Memory Commit</p>
                      <p className="text-base font-extrabold text-slate-800 dark:text-slate-100 mt-1">{selectedServer.memory_usage}%</p>
                    </div>
                    <div className="bg-slate-50/50 dark:bg-slate-950/20 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                      <p className="text-[9px] font-bold text-slate-400 uppercase">Disk I/O</p>
                      <p className="text-base font-extrabold text-slate-800 dark:text-slate-100 mt-1">{selectedServer.disk_io} MB/s</p>
                    </div>
                    <div className="bg-slate-50/50 dark:bg-slate-950/20 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                      <p className="text-[9px] font-bold text-slate-400 uppercase">Latency</p>
                      <p className="text-base font-extrabold text-slate-800 dark:text-slate-100 mt-1">{selectedServer.network_latency} ms</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50/50 dark:bg-slate-950/20 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                      <p className="text-[9px] font-bold text-slate-400 uppercase">Core Temperature</p>
                      <p className="text-base font-extrabold text-slate-800 dark:text-slate-100 mt-1">{selectedServer.temperature}°C</p>
                    </div>
                    <div className="bg-slate-50/50 dark:bg-slate-950/20 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                      <p className="text-[9px] font-bold text-slate-400 uppercase">Crash Frequency</p>
                      <p className="text-base font-extrabold text-slate-800 dark:text-slate-100 mt-1">{selectedServer.crash_frequency || 0} / month</p>
                    </div>
                  </div>

                  {/* AI Co-Pilot Recommendation Widget */}
                  <div className="bg-indigo-50/40 dark:bg-indigo-950/25 border border-indigo-200 dark:border-indigo-900/60 p-4 rounded-xl flex items-start gap-3">
                    <div className="p-2 bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200 rounded-lg">
                      <Brain size={16} />
                    </div>
                    <div className="w-full">
                      <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wide">AI Recommendation Assessment</h4>
                      <p className="text-xs text-indigo-850 dark:text-indigo-400 mt-1.5 leading-relaxed">
                        {selectedServer.ai_recommendation?.message || (
                          selectedServer.status === 'Critical' ? 'Critical telemetry anomalies detected. Ensemble model indicates high likelihood of storage timeout or kernel panic. Trigger Scale Replica Group immediately to offload production processes.' :
                          selectedServer.status === 'High Risk' ? 'Resource parameters are elevated. Memory leak pattern suspected. SRE should review the daemon heap allocations or trigger Clear Cache sandbox action.' :
                          'System status is nominal. Current risk metrics are within baseline thresholds. No manual intervention required.'
                        )}
                      </p>
                      
                      {selectedServer.ai_recommendation && selectedServer.ai_recommendation.action !== "None" && (
                        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-indigo-100 dark:border-indigo-900/40 text-[10px] text-indigo-900 dark:text-indigo-400 font-semibold">
                          <div>
                            <span className="text-slate-400 dark:text-slate-500 block font-bold uppercase text-[8px]">Expected Success</span>
                            <span>{Math.round(selectedServer.ai_recommendation.success_rate * 100)}%</span>
                          </div>
                          <div>
                            <span className="text-slate-400 dark:text-slate-500 block font-bold uppercase text-[8px]">Downtime Saved</span>
                            <span>{selectedServer.ai_recommendation.downtime_saved} mins</span>
                          </div>
                          <div>
                            <span className="text-slate-400 dark:text-slate-500 block font-bold uppercase text-[8px]">Priority</span>
                            <span className={selectedServer.ai_recommendation.priority === 'Critical' || selectedServer.ai_recommendation.priority === 'High' ? 'text-red-500 font-bold' : ''}>
                              {selectedServer.ai_recommendation.priority}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 dark:text-slate-500 block font-bold uppercase text-[8px]">Resolution Time</span>
                            <span>{selectedServer.ai_recommendation.resolution_time}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: PREDICTION HISTORY */}
              {drawerTab === 'predictions' && (
                <div className="space-y-4 animate-slide-in">
                  <div className="bg-slate-50/50 dark:bg-slate-950/20 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-left">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Historical AI Predictions Timeline</h4>
                    
                    {predLoading && predictionHistory.length === 0 ? (
                      <div className="text-center py-6 text-slate-400 text-xs">Loading prediction history...</div>
                    ) : predictionHistory.length === 0 ? (
                      <div className="text-center py-6 text-slate-400 text-xs font-semibold">No prediction history recorded.</div>
                    ) : (
                      <div className="relative border-l-2 border-slate-100 dark:border-slate-800 ml-3 space-y-4 py-1">
                        {predictionHistory.map((pred, idx) => (
                          <div key={idx} className="relative pl-5">
                            {/* Status timeline dot */}
                            <span className={`absolute left-[-5px] top-1.5 h-2 w-2 rounded-full ring-4 ring-white dark:ring-slate-900 ${
                              pred.status === 'Critical' ? 'bg-red-500' :
                              pred.status === 'High Risk' ? 'bg-amber-500' :
                              pred.status === 'Warning' ? 'bg-orange-500' :
                              'bg-emerald-500'
                            }`}></span>
                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-450">
                              <span className={
                                pred.status === 'Critical' ? 'text-red-550 dark:text-red-400 font-bold' :
                                pred.status === 'High Risk' ? 'text-amber-550 dark:text-amber-400 font-bold' :
                                pred.status === 'Warning' ? 'text-orange-550 dark:text-orange-400 font-bold' :
                                'text-emerald-550 dark:text-emerald-400 font-bold'
                              }>{pred.status.toUpperCase()} (Risk: {Math.round(pred.risk_probability * 100)}%)</span>
                              <span className="font-mono font-medium">{new Date(pred.timestamp * 1000).toLocaleString()}</span>
                            </div>
                            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 font-semibold">
                              Confidence: <span className="font-bold text-indigo-650 dark:text-indigo-405">{Math.round(pred.confidence * 100)}%</span> | Model: <span className="italic font-mono text-slate-500">{pred.model_version}</span>
                            </p>
                            <p className="text-[11px] text-slate-650 dark:text-slate-405 mt-0.5 font-semibold">
                              AI Recommendation: <span className="font-bold text-indigo-600 dark:text-indigo-400">{pred.recommendation}</span> | Outcome: <span className="italic text-slate-500">{pred.actual_result}</span>
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 2: SHAP XAI EXPLAINABILITY */}
              {drawerTab === 'shap' && (
                <div className="space-y-4">
                  <div className="bg-slate-50/50 dark:bg-slate-950/20 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">SHAP Feature Contributions Breakdown</h4>
                    <p className="text-xs text-slate-500 leading-relaxed mb-4">
                      SHAP values explain the offset between baseline expected probability (5%) and current predicted failure risk.
                    </p>
                    
                    <div className="space-y-3 font-semibold text-xs">
                      {/* CPU */}
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span>CPU Contribution Impact</span>
                          <span className="text-amber-600 font-mono">+{Math.max(0.02, selectedServer.cpu_usage * 0.006).toFixed(3)}</span>
                        </div>
                        <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min(100, (selectedServer.cpu_usage * 0.006 / 0.6) * 100)}%` }}></div>
                        </div>
                      </div>
                      
                      {/* Memory */}
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span>Memory Contribution Impact</span>
                          <span className="text-blue-600 font-mono">+{Math.max(0.02, selectedServer.memory_usage * 0.005).toFixed(3)}</span>
                        </div>
                        <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, (selectedServer.memory_usage * 0.005 / 0.6) * 100)}%` }}></div>
                        </div>
                      </div>

                      {/* Disk */}
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span>Disk I/O Contribution Impact</span>
                          <span className="text-purple-600 font-mono">+{Math.max(0.01, selectedServer.disk_io * 0.001).toFixed(3)}</span>
                        </div>
                        <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-violet-500 rounded-full" style={{ width: `${Math.min(100, (selectedServer.disk_io * 0.001 / 0.6) * 100)}%` }}></div>
                        </div>
                      </div>

                      {/* Network */}
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span>Network Latency Impact</span>
                          <span className="text-emerald-600 font-mono">+{Math.max(0.01, selectedServer.network_latency * 0.002).toFixed(3)}</span>
                        </div>
                        <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, (selectedServer.network_latency * 0.002 / 0.6) * 100)}%` }}></div>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: TELEMETRY HISTORY */}
              {drawerTab === 'history' && (
                <div className="space-y-4">
                  <div className="bg-slate-50/50 dark:bg-slate-950/20 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Historical Resource Telemetry (Live Updates)</p>
                    <div className="h-60 w-full text-[10px]">
                      {historyData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={historyData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:hidden" />
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" className="hidden dark:block" />
                            <XAxis dataKey="timestamp" tickFormatter={(t) => new Date(t * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})} tick={{fill: '#94a3b8'}} />
                            <YAxis tick={{fill: '#94a3b8'}} />
                            <Tooltip contentStyle={{backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc'}} />
                            <Legend />
                            <Line type="monotone" dataKey="cpu" name="CPU Usage %" stroke="#4f46e5" strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
                            <Line type="monotone" dataKey="mem" name="Memory %" stroke="#06b6d4" strokeWidth={2} dot={false} />
                            <Line type="monotone" dataKey="latency" name="Latency ms" stroke="#10b981" strokeWidth={2} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-slate-400">
                          Waiting for server metrics stream...
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 4: REMEDIATION OVERRIDES */}
              {drawerTab === 'remediation' && (
                <div className="space-y-4">
                  <div className="bg-slate-50/50 dark:bg-slate-950/20 p-5 rounded-xl border border-slate-100 dark:border-slate-800">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Operator Overrides & Remedies</h4>
                    <p className="text-xs text-slate-500 leading-relaxed mb-4">
                      Executing sandbox remediations manually overrides the live simulation to reset telemetry parameters to standard safety bounds.
                    </p>

                    {actionSuccessMessage && (
                      <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-lg text-emerald-700 dark:text-emerald-350 text-xs font-bold flex items-center gap-2">
                        <CheckCircle size={14} />
                        {actionSuccessMessage}
                      </div>
                    )}

                    <div className="flex flex-col gap-2.5">
                      <button
                        disabled={actionLoading}
                        onClick={() => handleRemediate('Restart Service')}
                        className="bg-white hover:bg-slate-50 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                      >
                        <Play size={12} className="text-slate-400" />
                        Force restart service daemon
                      </button>
                      
                      <button
                        disabled={actionLoading}
                        onClick={() => handleRemediate('Clear Cache')}
                        className="bg-white hover:bg-slate-50 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                      >
                        <Play size={12} className="text-slate-400" />
                        Execute socket cache flush
                      </button>
                      
                      <button
                        disabled={actionLoading}
                        onClick={() => handleRemediate('Scale Kubernetes Pods')}
                        className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-4 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                      >
                        {actionLoading ? 'Executing Override...' : 'Scale Replica Group'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </main>
          </div>
        </div>
      )}

      {/* 4. EXPORT REPORT POPUP DIALOG (Phase 19 Export Reporting Options) */}
      {isExportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs" onClick={() => setIsExportOpen(false)}></div>
          
          <div className="glassmorphism w-full max-w-md border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xl z-10 relative text-left">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2 flex items-center gap-2">
              <Download size={16} className="text-indigo-600" />
              SRE Export Reporting Engine
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              Compile machine learning predictions, system logs, and telemetry indexes into standard operations documents.
            </p>

            <div className="space-y-2 mb-5">
              <label className="flex items-center gap-3 p-3 bg-slate-50/50 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-800 rounded-lg cursor-pointer">
                <input 
                  type="radio" 
                  name="export" 
                  checked={exportType === 'incident'} 
                  onChange={() => setExportType('incident')} 
                  className="accent-indigo-600 cursor-pointer" 
                />
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Lead SRE Incident Report (.txt)</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Summary of critical nodes and recent auto-healing remediation logs.</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-slate-50/50 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-800 rounded-lg cursor-pointer">
                <input 
                  type="radio" 
                  name="export" 
                  checked={exportType === 'csv'} 
                  onChange={() => setExportType('csv')} 
                  className="accent-indigo-600 cursor-pointer" 
                />
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Telemetry Dataset Ledger (.csv)</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Compiles monitored nodes' resource metrics and failure probabilities.</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-slate-50/50 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-800 rounded-lg cursor-pointer">
                <input 
                  type="radio" 
                  name="export" 
                  checked={exportType === 'health'} 
                  onChange={() => setExportType('health')} 
                  className="accent-indigo-600 cursor-pointer" 
                />
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">AI Health Report (.pdf)</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Simulated binary health digest for enterprise stakeholder delivery.</p>
                </div>
              </label>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setIsExportOpen(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              
              <button
                onClick={() => {
                  if (exportType === 'incident') handleExportSREText();
                  else if (exportType === 'health') handleExportPDF();
                  else handleExportCSV();
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                Compile & Download
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Toast Notification Container */}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map(t => (
          <div 
            key={t.id} 
            className={`pointer-events-auto p-4 rounded-xl shadow-xl flex items-center gap-3 border transition-all duration-350 animate-slide-in ${
              t.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/90 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/60' :
              t.type === 'error' ? 'bg-red-50 dark:bg-red-950/90 text-red-800 dark:text-red-300 border-red-200 dark:border-red-900/60' :
              'bg-indigo-50 dark:bg-indigo-950/90 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900/60'
            }`}
          >
            {t.type === 'success' ? <CheckCircle size={16} className="shrink-0 text-emerald-500" /> :
             t.type === 'error' ? <AlertTriangle size={16} className="shrink-0 text-red-500" /> :
             <Info size={16} className="shrink-0 text-indigo-500" />}
            <span className="text-xs font-bold leading-tight">{t.message}</span>
          </div>
        ))}
      </div>

    </div>
  );
};

export default Dashboard;
