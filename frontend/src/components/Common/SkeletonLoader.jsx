import React from 'react';

export const CardSkeleton = () => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 animate-pulse flex flex-col justify-between h-[230px]">
      <div>
        <div className="flex justify-between items-start mb-4">
          <div className="space-y-2 w-1/2">
            <div className="h-4 bg-slate-200 dark:bg-slate-850 rounded w-3/4"></div>
            <div className="h-3 bg-slate-200 dark:bg-slate-850 rounded w-1/2"></div>
          </div>
          <div className="h-5 bg-slate-200 dark:bg-slate-850 rounded w-16"></div>
        </div>
        <div className="grid grid-cols-2 gap-4 my-3">
          <div className="space-y-1.5">
            <div className="h-2.5 bg-slate-200 dark:bg-slate-850 rounded w-1/2"></div>
            <div className="h-5 bg-slate-200 dark:bg-slate-850 rounded w-3/4"></div>
          </div>
          <div className="space-y-1.5">
            <div className="h-2.5 bg-slate-200 dark:bg-slate-850 rounded w-1/2"></div>
            <div className="h-4 bg-slate-200 dark:bg-slate-850 rounded w-3/4"></div>
          </div>
        </div>
      </div>
      <div className="border-t border-slate-100 dark:border-slate-800/80 pt-3 mt-auto space-y-2">
        <div className="h-2 bg-slate-200 dark:bg-slate-850 rounded w-1/3"></div>
        <div className="h-10 bg-slate-200 dark:bg-slate-850 rounded"></div>
      </div>
    </div>
  );
};

export const TextSkeleton = ({ lines = 3 }) => {
  return (
    <div className="animate-pulse space-y-2.5">
      {Array.from({ length: lines }).map((_, idx) => (
        <div 
          key={idx} 
          className="h-3 bg-slate-200 dark:bg-slate-850 rounded"
          style={{ width: idx === lines - 1 ? '60%' : '100%' }}
        ></div>
      ))}
    </div>
  );
};

export const GraphSkeleton = () => {
  return (
    <div className="bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl p-6 animate-pulse h-64 flex flex-col justify-between">
      <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/4 mb-4"></div>
      <div className="flex-1 flex items-end gap-3 px-2">
        {Array.from({ length: 12 }).map((_, idx) => (
          <div 
            key={idx} 
            className="bg-slate-200 dark:bg-slate-800 rounded-t w-full"
            style={{ height: `${Math.max(10, Math.sin(idx) * 60 + 30)}%` }}
          ></div>
        ))}
      </div>
      <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded w-full mt-4"></div>
    </div>
  );
};
