import { useEffect, useState } from 'react';

export function useLiveFavorites(initial = 0) {
  const [count, setCount] = useState(initial);
  const [connected, setConnected] = useState(false);

  // Fetch initial count on mount
  useEffect(() => {
    async function fetchInitialCount() {
      try {

        const res = await fetch('/api/favorites-stats/total');

        
        if (res.ok) {
          const data = await res.json();
          const total = data.total || 0;
          setCount(total);
        } else {
          console.error('Failed to fetch favorites total:', res.status, res.statusText);
        }
      } catch (err) {
        console.error('Error fetching initial favorites count:', err);
      }
    }
    
    fetchInitialCount();
  }, []);

  useEffect(() => {
    
    
    const eventSource = new EventSource('/api/events/favorites');
    
    eventSource.onopen = () => {
      console.log('📡 Connected to favorites stream');
      setConnected(true);
    };

    eventSource.onmessage = (event) => {
      console.log('📡 Raw SSE message:', event.data);
      try {
        const data = JSON.parse(event.data);
        console.log('📡 Parsed SSE data:', data);
        
        if (data.type === 'connected') {
          console.log('📡 SSE connection confirmed');
          return;
        }
        
        if (data.type === 'heartbeat') {
          console.log('📡 Heartbeat received');
          return;
        }
        
        if (typeof data.delta === 'number') {
          setCount((prevCount) => {
            const newCount = Math.max(0, prevCount + data.delta);
            console.log(`📡 Count update: ${prevCount} + ${data.delta} = ${newCount}`);
            return newCount;
          });
        }
      } catch (err) {
        console.error('Error parsing SSE message:', err, 'Raw data:', event.data);
      }
    };

    eventSource.onerror = (error) => {
      console.error('📡 SSE connection error:', error);
      console.error('📡 SSE readyState:', eventSource.readyState);
      setConnected(false);
    };

    // Cleanup on unmount
    return () => {
      console.log('📡 Closing SSE connection');
      eventSource.close();
      setConnected(false);
    };
  }, []);

  console.log('🔥 useLiveFavorites render:', { count, connected });
  return { count, connected };
}