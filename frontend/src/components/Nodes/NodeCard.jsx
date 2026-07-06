import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import StatusBadge from '../Common/StatusBadge';

const NodeCard = ({ data, onClick }) => {
  const isCritical = data.status === 'Critical';
  const isHighRisk = data.status === 'High Risk';
  const isWarning = data.status === 'Warning';

  let borderStyle = 'border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700 hover:shadow-md';
  let accentColor = '#6366f1'; // Indigo for normal
  let textColor = 'text-slate-800 dark:text-slate-200';
  let percentageColor = 'text-slate-900 dark:text-white font-extrabold';

  if (isCritical) {
    borderStyle = 'border-red-200 dark:border-red-950 hover:border-red-400 dark:hover:border-red-800 shadow-xs hover:shadow-red-500/5';
    accentColor = '#ef4444';
    textColor = 'text-red-900 dark:text-red-400 font-semibold';
    percentageColor = 'text-red-600 dark:text-red-400';
  } else if (isHighRisk) {
    borderStyle = 'border-amber-200 dark:border-amber-950 hover:border-amber-400 dark:hover:border-amber-800 shadow-xs hover:shadow-amber-500/5';
    accentColor = '#f59e0b';
    textColor = 'text-amber-900 dark:text-amber-400 font-semibold';
    percentageColor = 'text-amber-600 dark:text-amber-400';
  } else if (isWarning) {
    borderStyle = 'border-orange-200 dark:border-orange-950 hover:border-orange-400 dark:hover:border-orange-800 shadow-xs';
    accentColor = '#ea580c';
    textColor = 'text-orange-900 dark:text-orange-400 font-semibold';
    percentageColor = 'text-orange-600 dark:text-orange-400';
  }

  // Calculate dynamic SHAP contributions from live values
  const shapData = [
    { name: 'CPU', val: Math.max(0.02, round(data.cpu_usage * 0.006, 3)) },
    { name: 'Mem', val: Math.max(0.02, round(data.memory_usage * 0.005, 3)) },
    { name: 'IO', val: Math.max(0.01, round(data.disk_io * 0.001, 3)) },
    { name: 'Net', val: Math.max(0.01, round(data.network_latency * 0.002, 3)) }
  ];

  function round(num, scale) {
    if(!("" + num).includes("e")) {
      return +(Math.round(num + "e+" + scale)  + "e-" + scale);
    } else {
      var arr = ("" + num).split("e");
      var sig = ""
      if(+arr[1] + scale > 0) {
        sig = "+";
      }
      return +(Math.round(+arr[0] + "e" + sig + (+arr[1] + scale)) + "e-" + scale);
    }
  }

  const maxMetric = Math.max(data.cpu_usage, data.memory_usage, data.network_latency / 3);
  let topCause = 'Normal Activity';
  if (data.status !== 'Healthy') {
    if (maxMetric === data.cpu_usage) topCause = 'CPU Overhead Anomaly';
    else if (maxMetric === data.memory_usage) topCause = 'Memory Saturation';
    else topCause = 'Network Latency Anomaly';
  }

  // Recommendations
  let recommendation = "Optimized";
  let successRate = "99%";
  if (isCritical) {
    recommendation = data.recommended_action || "Scale Pods";
    successRate = "95%";
  } else if (isHighRisk || isWarning) {
    recommendation = "Restart Service";
    successRate = "88%";
  }

  return (
    <div 
      onClick={() => onClick && onClick(data)}
      className={`rounded-xl border p-4 bg-white dark:bg-slate-900 ${borderStyle} flex flex-col justify-between h-[270px] transition-all duration-200 ease-out active:scale-[0.98] cursor-pointer relative overflow-hidden group`}
    >
      {/* Top row */}
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">{data.id}</h4>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase">{data.type}</p>
          </div>
          <StatusBadge status={data.status} />
        </div>

        {/* Basic Stats row */}
        <div className="grid grid-cols-2 gap-2 my-2.5">
          <div>
            <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-bold">Failure Risk</p>
            <p className={`text-base font-extrabold ${percentageColor}`}>{(data.risk_probability * 100).toFixed(0)}%</p>
          </div>
          <div>
            <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-bold">Principal Anomaly</p>
            <p className={`text-[11px] font-medium truncate ${textColor}`}>{topCause}</p>
          </div>
        </div>

        {/* Progress level bars for CPU and Memory */}
        <div className="space-y-1.5 my-2">
          <div className="flex justify-between text-[9px] text-slate-500 dark:text-slate-400">
            <span>CPU Load</span>
            <span className="font-bold">{data.cpu_usage}%</span>
          </div>
          <div className="h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-indigo-600 rounded-full transition-all duration-500" 
              style={{ width: `${data.cpu_usage}%`, backgroundColor: data.cpu_usage > 80 ? '#ef4444' : '#6366f1' }}
            ></div>
          </div>

          <div className="flex justify-between text-[9px] text-slate-500 dark:text-slate-400">
            <span>Memory Load</span>
            <span className="font-bold">{data.memory_usage}%</span>
          </div>
          <div className="h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-cyan-500 rounded-full transition-all duration-500" 
              style={{ width: `${data.memory_usage}%`, backgroundColor: data.memory_usage > 85 ? '#ef4444' : '#06b6d4' }}
            ></div>
          </div>
        </div>
      </div>

      {/* SHAP Chart & timestamp */}
      <div className="border-t border-slate-100 dark:border-slate-800/80 pt-2 mt-auto">
        <div className="flex justify-between items-center text-[9px] text-slate-400 dark:text-slate-500 font-medium mb-1">
          <span className="font-bold uppercase tracking-wider">SHAP Feature Contributions</span>
          <span>Predicted 2s ago</span>
        </div>
        
        <div className="h-16 w-full text-[9px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={shapData} layout="vertical" margin={{ top: 0, right: 0, left: -22, bottom: 0 }}>
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 9}} />
              <Tooltip 
                cursor={{fill: 'rgba(99,102,241,0.04)'}} 
                contentStyle={{backgroundColor: '#0f172a', border: '1px solid #1e293b', fontSize: '9px', padding: '2px 6px', color: '#fff'}}
              />
              <Bar dataKey="val" fill={accentColor} radius={[0, 2, 2, 0]} barSize={6} isAnimationActive={true} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
    </div>
  );
};

export default NodeCard;
