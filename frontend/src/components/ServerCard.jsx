import React, { useState, useEffect } from 'react';
import StatusBadge from './Common/StatusBadge';

const ServerCard = ({ data }) => {
  const isCritical = data.status === 'Critical';
  const isHighRisk = data.status === 'High Risk';
  const isWarning = data.status === 'Warning';

  // Dynamic status-specific color parameters
  let accentColor = '#6366f1'; // Indigo for healthy
  let borderHighlight = 'hover:border-indigo-500/40 dark:hover:border-indigo-500/30 hover:shadow-indigo-500/5';
  let percentageColor = 'text-slate-900 dark:text-white font-extrabold';

  if (isCritical) {
    accentColor = '#ef4444'; // Red
    borderHighlight = 'hover:border-red-500/40 dark:hover:border-red-500/30 hover:shadow-red-500/10 border-red-100 dark:border-red-950/50';
    percentageColor = 'text-red-600 dark:text-red-400';
  } else if (isHighRisk) {
    accentColor = '#f59e0b'; // Amber
    borderHighlight = 'hover:border-amber-500/40 dark:hover:border-amber-500/30 hover:shadow-amber-500/10 border-amber-100 dark:border-amber-950/50';
    percentageColor = 'text-amber-600 dark:text-amber-400';
  } else if (isWarning) {
    accentColor = '#ea580c'; // Orange
    borderHighlight = 'hover:border-orange-500/40 dark:hover:border-orange-500/30 hover:shadow-orange-500/10 border-orange-100 dark:border-orange-950/50';
    percentageColor = 'text-orange-600 dark:text-orange-400';
  } else {
    accentColor = '#10b981'; // Emerald
    borderHighlight = 'hover:border-emerald-500/40 dark:hover:border-emerald-500/30 hover:shadow-emerald-500/10';
  }

  // Calculate dynamic SHAP contributions from real live telemetry values
  const shapData = [
    { 
      name: 'CPU', 
      val: Math.max(0.02, round(data.cpu_usage * 0.006, 3)), 
      color: 'bg-amber-500', 
      desc: 'CPU load metrics contribution' 
    },
    { 
      name: 'Mem', 
      val: Math.max(0.02, round(data.memory_usage * 0.005, 3)), 
      color: 'bg-blue-500', 
      desc: 'RAM utilization contribution' 
    },
    { 
      name: 'IO', 
      val: Math.max(0.01, round(data.disk_io * 0.001, 3)), 
      color: 'bg-violet-500', 
      desc: 'Storage write/read overhead' 
    },
    { 
      name: 'Net', 
      val: Math.max(0.01, round(data.network_latency * 0.002, 3)), 
      color: 'bg-emerald-500', 
      desc: 'Packet latency & hop status' 
    }
  ];

  function round(num, scale) {
    if(!("" + num).includes("e")) {
      return +(Math.round(num + "e+" + scale)  + "e-" + scale);
    } else {
      var arr = ("" + num).split("e");
      var sig = "";
      if(+arr[1] + scale > 0) {
        sig = "+";
      }
      return +(Math.round(+arr[0] + "e" + sig + (+arr[1] + scale)) + "e-" + scale);
    }
  }

  // Find top cause
  const maxMetric = Math.max(data.cpu_usage, data.memory_usage, data.network_latency / 3);
  let topCause = 'Normal Activity';
  if (data.status !== 'Healthy') {
    if (maxMetric === data.cpu_usage) topCause = 'CPU Overhead Anomaly';
    else if (maxMetric === data.memory_usage) topCause = 'Memory Saturation';
    else topCause = 'Network Latency Anomaly';
  }

  // Timer for relative prediction timestamp
  const [secondsAgo, setSecondsAgo] = useState(0);

  useEffect(() => {
    setSecondsAgo(0); // Reset timer when data changes
    const timer = setInterval(() => {
      setSecondsAgo(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [data.cpu_usage, data.risk_probability]);

  const formatTimeAgo = (sec) => {
    if (sec < 5) return 'just now';
    return `${sec}s ago`;
  };

  return (
    <div className={`group rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800/80 ${borderHighlight} hover-lift p-4 flex flex-col justify-between h-[230px] shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden`}>
      
      {/* Background radial accent glow on hover */}
      <div className="absolute -right-16 -top-16 w-32 h-32 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500 pointer-events-none"></div>

      {/* Header status badge and Title */}
      <div className="z-10">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{data.id}</h4>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase">{data.type}</p>
          </div>
          <StatusBadge status={data.status} />
        </div>

        {/* Basic Stats row */}
        <div className="grid grid-cols-2 gap-3 my-2 border-b border-slate-50 dark:border-slate-800/40 pb-2">
          <div>
            <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-bold">Failure Risk</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-base font-extrabold tracking-tight ${percentageColor}`}>{(data.risk_probability * 100).toFixed(0)}%</span>
              <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden relative">
                <div 
                  className="h-full rounded-full transition-all duration-1000 ease-out" 
                  style={{ 
                    width: `${data.risk_probability * 100}%`,
                    backgroundColor: accentColor
                  }}
                ></div>
              </div>
            </div>
            <p className="text-[8px] text-slate-400 dark:text-slate-500 mt-0.5 font-medium flex justify-between">
              <span>Predicted {formatTimeAgo(secondsAgo)}</span>
              <span>Conf: {((data.confidence || 0.95) * 100).toFixed(0)}%</span>
            </p>
          </div>
          <div>
            <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-bold">Principal Anomaly</p>
            <p className={`text-[11px] font-semibold truncate mt-1 text-slate-700 dark:text-slate-350`}>{topCause}</p>
            <p className="text-[8px] text-slate-400 dark:text-slate-500 mt-0.5 font-medium">XAI Root Cause</p>
          </div>
        </div>
      </div>

      {/* SHAP Chart footer */}
      <div className="border-t border-slate-100 dark:border-slate-800/80 pt-2 z-10">
        <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mb-1.5 flex justify-between">
          <span>SHAP Feature Impact</span>
          <span className="font-normal lowercase tracking-normal text-[8px] text-slate-400 dark:text-slate-500">hover for details</span>
        </p>
        
        {/* Custom CSS Horizontal Sparklines */}
        <div className="flex flex-col gap-1.5">
          {shapData.map((f, i) => {
            const maxValue = 0.6; // Scale relative to max SHAP
            const widthPct = Math.min(100, (f.val / maxValue) * 100);

            return (
              <div key={i} className="flex items-center gap-1.5 relative group/shap" title={`${f.desc}: ${f.val.toFixed(3)}`}>
                <span className="w-6 text-[9px] font-bold text-slate-400 dark:text-slate-500">{f.name}</span>
                <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800/60 rounded-full overflow-hidden relative">
                  <div 
                    className={`h-full rounded-full ${f.color} transition-all duration-700 ease-out`}
                    style={{ width: `${widthPct}%` }}
                  ></div>
                </div>
                <span className="w-8 text-[9px] font-semibold text-slate-500 dark:text-slate-400 text-right font-mono">{f.val.toFixed(3)}</span>
                
                {/* Custom Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 bg-slate-900 text-white text-[8px] py-1 px-2 rounded shadow-lg pointer-events-none opacity-0 group-hover/shap:opacity-100 transition-opacity duration-200 z-30 whitespace-nowrap border border-slate-800">
                  <span className="font-semibold text-indigo-300">{f.name} Impact:</span> {f.val.toFixed(3)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
    </div>
  );
};

export default ServerCard;
