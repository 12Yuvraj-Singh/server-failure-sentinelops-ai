import React from 'react';

const StatusBadge = ({ status }) => {
  let badgeStyle = '';
  let dotStyle = '';

  switch (status) {
    case 'Critical':
      badgeStyle = 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/60';
      dotStyle = 'bg-red-500';
      break;
    case 'High Risk':
      badgeStyle = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/60';
      dotStyle = 'bg-amber-500';
      break;
    case 'Warning':
      badgeStyle = 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-900/60';
      dotStyle = 'bg-orange-500';
      break;
    case 'Healthy':
    default:
      badgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/60';
      dotStyle = 'bg-emerald-500';
      break;
  }

  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] px-2.5 py-0.5 rounded-full font-bold border transition-colors duration-200 ${badgeStyle}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotStyle}`}></span>
      {status}
    </span>
  );
};

export default StatusBadge;
