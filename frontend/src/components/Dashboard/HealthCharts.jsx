import React from 'react';
import { 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';
import { Activity, Shield, PieChart as PieIcon, Cpu } from 'lucide-react';

const COLORS = {
  Critical: '#ef4444',  // Red
  'High Risk': '#f59e0b', // Amber
  Warning: '#ea580c',     // Orange
  Healthy: '#10b981'     // Emerald
};

const HealthCharts = ({ servers = [] }) => {
  
  // 1. Calculate Failure Risk Distribution dynamically from live server data
  const counts = { Critical: 0, 'High Risk': 0, Warning: 0, Healthy: 0 };
  servers.forEach(s => {
    if (counts[s.status] !== undefined) {
      counts[s.status]++;
    } else {
      counts.Healthy++;
    }
  });

  const pieData = Object.keys(counts).map(key => ({
    name: key,
    value: counts[key]
  })).filter(d => d.value > 0);

  // 2. Generate simulated historical timeline data for Alerts Trend & Fleet Health
  // We can base these on live values to make them reactive!
  const avgCpu = servers.reduce((acc, s) => acc + s.cpu_usage, 0) / (servers.length || 1);
  const avgMem = servers.reduce((acc, s) => acc + s.memory_usage, 0) / (servers.length || 1);
  const activeAlerts = counts.Critical + counts['High Risk'];

  const historicalData = Array.from({ length: 8 }).map((_, i) => {
    const hour = new Date(Date.now() - (7 - i) * 3600 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const noise = Math.sin(i) * 5;
    return {
      time: hour,
      health: Math.min(100, Math.round(100 - activeAlerts * 4 + noise)),
      alerts: Math.max(0, Math.round(activeAlerts + noise / 2)),
      cpu: Math.max(10, Math.min(99, Math.round(avgCpu + noise))),
      mem: Math.max(10, Math.min(99, Math.round(avgMem - noise / 2))),
    };
  });

  return (
    <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      
      {/* Chart A: Fleet Health & Alerts Trend */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
        <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Shield size={14} className="text-emerald-500" />
          Fleet Health & Alerts Trend (24 Hours)
        </h4>
        <div className="h-56 w-full text-[10px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={historicalData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:hidden" />
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" className="hidden dark:block" />
              <XAxis dataKey="time" tick={{fill: '#94a3b8'}} />
              <YAxis yAxisId="left" domain={[60, 100]} tick={{fill: '#94a3b8'}} />
              <YAxis yAxisId="right" orientation="right" tick={{fill: '#94a3b8'}} />
              <Tooltip contentStyle={{backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff'}} />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="health" name="Health %" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line yAxisId="right" type="monotone" dataKey="alerts" name="Active Alerts" stroke="#ef4444" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart B: Failure Risk Distribution (Pie Chart) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col justify-between">
        <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
          <PieIcon size={14} className="text-indigo-500" />
          Failure Risk Distribution
        </h4>
        
        <div className="flex-1 flex flex-col sm:flex-row items-center justify-around gap-4 min-h-[224px]">
          {/* Pie Graph */}
          <div className="h-44 w-44 relative shrink-0">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[entry.name] || COLORS.Healthy} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff', fontSize: '10px'}} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                No active nodes
              </div>
            )}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black text-slate-800 dark:text-white">{servers.length}</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Nodes</span>
            </div>
          </div>

          {/* Custom Legend */}
          <div className="space-y-2 text-xs w-full sm:w-auto">
            {Object.keys(counts).map(key => {
              const val = counts[key];
              const pct = servers.length > 0 ? Math.round((val / servers.length) * 100) : 0;
              return (
                <div key={key} className="flex items-center justify-between gap-6 border-b border-slate-50 dark:border-slate-800 pb-1.5 w-full">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[key] }}></span>
                    <span className="font-medium text-slate-700 dark:text-slate-350">{key}</span>
                  </div>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{val} <span className="font-normal text-slate-400">({pct}%)</span></span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Chart C: Resource Utilization Average AreaChart */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs lg:col-span-2">
        <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Cpu size={14} className="text-indigo-500" />
          Aggregate Telemetry Utilization Trend
        </h4>
        <div className="h-56 w-full text-[10px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={historicalData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
              <defs>
                <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0}/>
                </linearGradient>
                <linearGradient id="colorMem" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:hidden" />
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" className="hidden dark:block" />
              <XAxis dataKey="time" tick={{fill: '#94a3b8'}} />
              <YAxis tick={{fill: '#94a3b8'}} domain={[0, 100]} />
              <Tooltip contentStyle={{backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff'}} />
              <Legend />
              <Area type="monotone" dataKey="cpu" name="CPU Average %" stroke="#4f46e5" strokeWidth={2} fillOpacity={1} fill="url(#colorCpu)" />
              <Area type="monotone" dataKey="mem" name="Memory Average %" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#colorMem)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

    </section>
  );
};

export default HealthCharts;
