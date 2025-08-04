import { useEffect, useState } from 'react';

export function useSparkline() {
  const [series, setSeries] = useState<[number, number][]>([]);
  const [connected, setConnected] = useState(false);

  async function fetchTrend() {
    try {
      console.log('📈 Fetching sparkline trend data...');
      
      // Generate mock data for now (60 minutes of activity)
      const mockData: [number, number][] = [];
      const now = Date.now();
      
      for (let i = 59; i >= 0; i--) {
        const timestamp = now - i * 60_000; // 60 minutes ago
        const activity = Math.floor(Math.random() * 5); // Random activity 0-4
        mockData.push([timestamp, activity]);
      }
      
      console.log('📈 Mock sparkline data generated:', mockData.length, 'points');
      setSeries(mockData);
      
      // Also try to fetch real data as fallback
      try {
        const res = await fetch('/api/favorites-trend/trend');
        if (res.ok) {
          const data: [number, number][] = await res.json();
          console.log('📈 Real sparkline data received:', data.length, 'points');
          setSeries(data);
        }
      } catch {
        console.log('📈 Using mock data - API not available yet');
      }
    } catch (error) {
      console.error('Error fetching sparkline trend:', error);
    }
  }

  useEffect(() => {
    console.log('📈 Initializing sparkline hook...');
    
    // Fetch initial data
    fetchTrend();
    
    // Set up SSE connection for real-time updates
    const eventSource = new EventSource('/api/events/favorites');
    
    eventSource.onopen = () => {
      console.log('📈 Sparkline SSE connected');
      setConnected(true);
    };
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📈 Sparkline SSE message:', data);
        
        // Refresh sparkline on any favorites activity or periodic tick
        if (data.type === 'tick' || typeof data.delta === 'number') {
          console.log('📈 Refreshing sparkline due to activity');
          fetchTrend();
        }
      } catch (err) {
        console.error('Error parsing sparkline SSE message:', err);
      }
    };
    
    eventSource.onerror = (error) => {
      console.error('📈 Sparkline SSE error:', error);
      setConnected(false);
    };
    
    // Cleanup
    return () => {
      console.log('📈 Closing sparkline SSE connection');
      eventSource.close();
      setConnected(false);
    };
  }, []);

  console.log('📈 useSparkline render:', { seriesLength: series.length, connected });
  return { series, connected };
}