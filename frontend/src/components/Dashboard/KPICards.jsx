import React, { useState, useEffect } from 'react';
import { Server, AlertTriangle, Shield, TrendingUp, Cpu } from 'lucide-react';

const AnimatedNumber = ({ value }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = displayValue;
    const end = parseFloat(value) || 0;
    if (start === end) return;

    const duration = 600; // ms
    const range = end - start;
    let startTime = null;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const fraction = Math.min(progress / duration, 1);
      
      // Ease out quad formula
      const easeFraction = fraction * (2 - fraction);
      
      const current = start + range * easeFraction;
      setDisplayValue(fraction === 1 ? end : current);
      if (fraction < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value]);

  const isInt = value % 1 === 0;
  return <span>{isInt ? Math.round(displayValue) : displayValue.toFixed(2)}</span>;
};

const KPICards = ({ summary, latency = 42 }) => {
  const [secAgo, setSecAgo] = useState(0);

  useEffect(() => {
    setSecAgo(0);
    const interval = setInterval(() => {
      setSecAgo(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [summary]); // reset timer when summary updates

  const total = summary?.total_monitored || 20;
  const critical = summary?.critical_alerts || 0;
  const highRisk = summary?.high_risk_alerts || 0;
  const activeAlerts = critical + highRisk;
  const health = summary?.health_score || 100;
  const drift = summary?.drift_score || 0.08;

  return (
    <div className="space-y-4 mb-6">
      
      {/* Live status bar with pulsing green dot */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-xs shadow-xs transition-colors">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-semibold text-slate-700 dark:text-slate-300">Live Status: Connected</span>
        </div>
        <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400">
          <span>Latency: <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{latency}ms</span></span>
          <span>Updated {secAgo}s ago</span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Fleet Monitored */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center gap-4 shadow-xs hover:shadow-md transition-all duration-200 group">
          <div className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/20 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            <Server size={20} />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Fleet Monitored</p>
            <p className="text-xl font-black text-slate-800 dark:text-white mt-0.5">
              <AnimatedNumber value={total} /> Nodes
            </p>
            <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-0.5">
              ↑ 0 New Today
            </span>
          </div>
        </div>

        {/* Active Alerts */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center gap-4 shadow-xs hover:shadow-md transition-all duration-200 group">
          <div className={`p-3 rounded-lg transition-colors ${
            activeAlerts > 0 
              ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 group-hover:bg-rose-100' 
              : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400'
          }`}>
            <AlertTriangle size={20} />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Active Alerts</p>
            <p className={`text-xl font-black mt-0.5 ${activeAlerts > 0 ? 'text-rose-600' : 'text-slate-800 dark:text-white'}`}>
              <AnimatedNumber value={activeAlerts} /> Alert{activeAlerts === 1 ? '' : 's'}
            </p>
            <span className="text-[10px] text-slate-400 font-semibold">
              {critical} Critical / {highRisk} High
            </span>
          </div>
        </div>

        {/* Fleet Health Score */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center gap-4 shadow-xs hover:shadow-md transition-all duration-200 group">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-lg group-hover:bg-emerald-100 dark:group-hover:bg-emerald-950/40 transition-colors">
            <Shield size={20} />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Fleet Health Score</p>
            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
              <AnimatedNumber value={health} />%
            </p>
            <span className="text-[10px] text-emerald-500 font-semibold">
              {health >= 90 ? 'Optimal Performance' : 'Attention Required'}
            </span>
          </div>
        </div>

        {/* Data Drift Index */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center gap-4 shadow-xs hover:shadow-md transition-all duration-200 group">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-lg group-hover:bg-indigo-100 dark:group-hover:bg-indigo-950/40 transition-colors">
            <TrendingUp size={20} />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Data Drift Index</p>
            <p className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
              <AnimatedNumber value={drift} />
            </p>
            <span className="text-[10px] text-emerald-500 font-semibold">
              Model Recalibrated
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default KPICards;
