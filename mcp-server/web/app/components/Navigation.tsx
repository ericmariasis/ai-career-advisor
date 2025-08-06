'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">🎯 Career Code Advisor</h1>
            </Link>
            
            <div className="hidden md:flex items-center space-x-6">
              <Link 
                href="/" 
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  pathname === '/' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                🔍 Job Search
              </Link>
              
              <Link 
                href="/saved" 
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  pathname === '/saved' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                ⭐ Saved Jobs
              </Link>
              
              <Link 
                href="/metrics" 
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  pathname === '/metrics' 
                    ? 'bg-emerald-100 text-emerald-700' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                📊 Dashboard
              </Link>
            </div>
          </div>
          
          <div className="flex items-center">
            <span className="text-xs text-gray-500 hidden sm:block">
              Live Demo • Powered by Redis & AI
            </span>
          </div>
        </div>
      </div>
    </nav>
  );
}