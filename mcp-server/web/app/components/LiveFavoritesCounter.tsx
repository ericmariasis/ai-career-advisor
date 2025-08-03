'use client';
import { HeartIcon } from '@heroicons/react/24/solid';
import { useLiveFavorites } from '../hooks/useLiveFavorites';

interface Props {
  initialCount?: number;
}

export function LiveFavoritesCounter({ initialCount = 0 }: Props) {
  const { count, connected } = useLiveFavorites(initialCount);

  console.log('🔥 LiveFavoritesCounter render:', { count, connected, initialCount });

  return (
    <div className="relative flex items-center">
      <HeartIcon className={`h-6 w-6 transition-colors ${
        connected ? 'text-red-500' : 'text-gray-400'
      }`} />
      
      {/* Show count if greater than 0 */}
      {count > 0 && (
        <span className={`absolute -top-2 -right-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold text-white rounded-full transition-all ${
          connected ? 'bg-red-500' : 'bg-gray-400'
        }`}>
          {count}
        </span>
      )}
      
      {/* Debug count - always visible for testing */}
      <span className="absolute -top-6 -left-8 text-xs text-gray-800 bg-yellow-200 px-2 py-1 rounded border z-10">
        Count: {count}
      </span>
      
      {/* Connection indicator - make it bigger for visibility */}
      <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full transition-colors border border-white ${
        connected ? 'bg-green-400' : 'bg-red-400'
      }`} 
      title={connected ? 'Live updates connected' : 'Connecting...'} />
    </div>
  );
}