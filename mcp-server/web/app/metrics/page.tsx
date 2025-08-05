import { Metadata } from 'next';

// Single source of truth for the dashboard URL
const DASHBOARD_URL = 'http://localhost:3001/d/cetm6vg7cvwu8d/favorites-per-minute?orgId=1&from=now-6h&to=now&kiosk';

export const metadata: Metadata = {
  title: 'Performance Dashboard',
  other: {
    'http-equiv': 'refresh',
    content: `0; url=${DASHBOARD_URL}`
  }
};

export default function MetricsPage() {
  return (
    <>
      <meta 
        httpEquiv="refresh" 
        content={`0; url=${DASHBOARD_URL}`} 
      />
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="text-white mt-4">Redirecting to dashboard...</p>
          <p className="text-gray-400 text-sm mt-2">
            If you are not redirected automatically, 
            <a 
              href={DASHBOARD_URL}
              className="text-blue-400 hover:underline ml-1"
            >
              click here
            </a>
          </p>
        </div>
      </div>
    </>
  );
}