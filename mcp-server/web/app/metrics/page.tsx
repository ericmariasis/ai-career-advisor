'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

// Single source of truth for the dashboard URL
const DASHBOARD_URL = 'http://localhost:3001/d/cetm6vg7cvwu8d/favorites-per-minute?orgId=1&from=now-6h&to=now&kiosk';

export default function MetricsPage() {
  const [showDashboard, setShowDashboard] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [isLoading, setIsLoading] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setIsLoading(true);
          // Auto-load dashboard after countdown
          setTimeout(() => {
            setShowDashboard(true);
            setIsLoading(false);
          }, 1000);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleLoadDashboard = () => {
    setIsLoading(true);
    setTimeout(() => {
      setShowDashboard(true);
      setIsLoading(false);
    }, 500);
  };

  const handleIframeLoad = () => {
    setIframeLoaded(true);
  };

  const handleRefresh = () => {
    setIframeLoaded(false);
    const iframe = document.getElementById('dashboard-iframe') as HTMLIFrameElement;
    if (iframe) iframe.src = iframe.src;
  };

  if (showDashboard) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Fixed Header with Navigation */}
        <div className="sticky top-0 z-50 bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-6 py-3">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Job Search
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">Performance Dashboard</h1>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                className="inline-flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
              
              <a
                href={DASHBOARD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Open in New Tab
              </a>
            </div>
          </div>
        </div>

        {/* Dashboard iframe */}
        <div className="relative">
          <iframe
            id="dashboard-iframe"
            src={DASHBOARD_URL}
            className="w-full border-0"
            style={{ height: 'calc(100vh - 73px)' }}
            title="Performance Dashboard"
            loading="lazy"
            onLoad={handleIframeLoad}
          />
          
          {/* Loading overlay - only show when iframe hasn't loaded yet */}
          {!iframeLoaded && (
            <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 mt-2">Loading dashboard...</p>
                <p className="text-gray-500 text-sm mt-1">This may take a few moments</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      {/* Header with Back Button */}
      <div className="absolute top-6 left-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg backdrop-blur-sm border border-white/20 transition-all duration-200 hover:scale-105"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Job Search
        </Link>
      </div>

      {/* Main Content */}
      <div className="h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          {/* Icon */}
          <div className="mx-auto w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-white mb-2">Performance Dashboard</h1>
          <p className="text-gray-300 mb-8">Real-time analytics and metrics</p>

          {/* Loading/Countdown */}
          {countdown > 0 && !isLoading ? (
            <div className="space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto"></div>
              <p className="text-white">Loading in {countdown} seconds...</p>
            </div>
          ) : isLoading ? (
            <div className="space-y-4">
              <div className="animate-pulse rounded-full h-12 w-12 bg-blue-400/50 mx-auto"></div>
              <p className="text-white">Preparing dashboard...</p>
            </div>
          ) : null}

          {/* Manual Actions */}
          <div className="mt-8 space-y-3">
            <button
              onClick={handleLoadDashboard}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              {countdown > 0 ? 'Load Dashboard Now' : 'Load Dashboard'}
            </button>
            
            <div className="text-gray-400 text-sm">
              <a
                href={DASHBOARD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline mr-2"
              >
                open in new tab
              </a>
              or{' '}
              <Link href="/" className="text-blue-400 hover:underline">
                return to job search
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}