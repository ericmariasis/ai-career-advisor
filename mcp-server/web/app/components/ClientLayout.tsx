'use client';

import { useEffect } from 'react';

interface ClientLayoutProps {
  children: React.ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl+K or Cmd+K
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        e.stopPropagation();
        
        // Try multiple selectors to find the search input
        const searchInput = document.getElementById('job-search-input') || 
                           document.querySelector('input[placeholder*="Search"]') ||
                           document.querySelector('.aa-Input') ||
                           document.querySelector('input[type="search"]');
        
        if (searchInput) {
          (searchInput as HTMLInputElement).focus();
        }
      }
    };

    // Use capture phase to intercept before browser handles it
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, []);

  return <>{children}</>;
}