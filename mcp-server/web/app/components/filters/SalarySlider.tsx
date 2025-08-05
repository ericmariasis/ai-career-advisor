'use client';

import React from 'react';
import Slider from 'rc-slider';

type Props = {
  min: number;          // lower bound allowed by backend
  max: number;          // upper bound
  value: [number, number]; // currently selected range
  onChange: (range: [number, number]) => void;
  histogram?: { bucket: number; count: number }[]; // optional bars
};

export const SalarySlider: React.FC<Props> = ({ 
  min, 
  max, 
  value, 
  onChange, 
  histogram 
}) => {
  // Normalize histogram counts for visualization
  const maxCount = Math.max(...(histogram?.map(h => h.count) ?? []), 1);

  return (
    <div className="py-4">
      <h4 className="font-semibold mb-3 text-gray-900">Salary Range</h4>
      
      {/* Histogram bars (if available) */}
      {histogram && histogram.length > 0 && (
        <div className="flex gap-[1px] h-6 mb-3 items-end">
          {histogram.map(({ bucket, count }, index) => (
            <div
              key={bucket || index}
              style={{ height: `${Math.max((count / maxCount) * 100, 2)}%` }}
              className="flex-1 bg-indigo-200 dark:bg-indigo-600 rounded-sm opacity-70"
              title={`$${bucket?.toLocaleString()}: ${count} jobs`}
            />
          ))}
        </div>
      )}
      
      {/* Range Slider */}
      <div className="px-2">
        <Slider
          range
          allowCross={false}
          min={min}
          max={max}
          step={5000}
          value={value}
          onChange={(v) => onChange(v as [number, number])}
          styles={{
            track: {
              backgroundColor: '#4f46e5',
            },
            rail: {
              backgroundColor: '#e5e7eb',
            },
            handle: {
              borderColor: '#4f46e5',
              backgroundColor: '#ffffff',
            },
          }}
        />
      </div>
      
      {/* Manual Input Fields */}
      <div className="mt-4 flex items-center gap-3">
        <div className="flex-1">
          <label className="block text-xs text-gray-600 mb-1">Min Salary</label>
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-700 text-sm font-medium">$</span>
            <input
              type="number"
              value={value[0]}
              onChange={(e) => {
                const newMin = Math.max(min, Math.min(Number(e.target.value) || min, value[1] - 5000));
                onChange([newMin, value[1]]);
              }}
              className="w-full pl-6 pr-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
              placeholder="50000"
              min={min}
              max={value[1] - 5000}
              step={5000}
            />
          </div>
        </div>
        
        <div className="flex-1">
          <label className="block text-xs text-gray-600 mb-1">Max Salary</label>
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-700 text-sm font-medium">$</span>
            <input
              type="number"
              value={value[1]}
              onChange={(e) => {
                const newMax = Math.min(max, Math.max(Number(e.target.value) || max, value[0] + 5000));
                onChange([value[0], newMax]);
              }}
              className="w-full pl-6 pr-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
              placeholder="150000"
              min={value[0] + 5000}
              max={max}
              step={5000}
            />
          </div>
        </div>
      </div>
      
      {/* Range Display */}
      <div className="text-xs mt-3 flex justify-between text-gray-600">
        <span>${min.toLocaleString()}</span>
        <span>${max.toLocaleString()}</span>
      </div>
    </div>
  );
};

export default SalarySlider;