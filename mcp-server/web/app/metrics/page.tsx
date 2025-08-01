'use client';

import { useEffect, useState } from 'react';

export default function MetricsPage() {
  // Prevent SSR mismatch by rendering iframe only on the client
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">📊 Performance Dashboard</h1>
          <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
            </div>
            <p className="text-gray-600 mt-4">Loading metrics dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4">
            <h1 className="text-2xl font-bold text-gray-900">📊 Performance Dashboard</h1>
            <p className="text-gray-600 mt-1">Real-time metrics and system performance</p>
          </div>
        </div>
      </div>
      
      <div className="p-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <iframe
              src="http://localhost:3001/"
              width="100%"
              height="900"
              style={{ border: 'none' }}
              title="Performance Metrics Dashboard"
            />
          </div>
          
          <div className="mt-4 text-center text-sm text-gray-500">
            <p>Dashboard refreshes every 30 seconds • <a href="/grafana/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View Full Dashboard</a></p>
          </div>
        </div>
      </div>
    </div>
  );
}