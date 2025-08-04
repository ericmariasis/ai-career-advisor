'use client';
import { useSparkline } from '../hooks/useSparkline';

export function Sparkline() {
  // console.log('🎯 SPARKLINE COMPONENT RENDERING!'); // Debug log disabled
  
  const { series, connected } = useSparkline();
  
  console.log('📈 Sparkline render:', { 
    dataPoints: series.length, 
    connected,
    totalActivity: series.reduce((sum, point) => sum + point[1], 0)
  });

  return (
    <div className="flex items-center ml-3 opacity-70">
      <div className="flex items-center gap-2">
        {/* Connection indicator */}
        <div 
          className={`w-2 h-2 rounded-full ${
            connected ? 'bg-green-400' : 'bg-gray-400'
          }`}
          title={connected ? 'Live trend data' : 'Connecting...'}
        />
        
        {/* Simple sparkline visualization */}
        <div className="w-[140px] h-[30px] bg-gray-100 rounded p-1 flex items-end">
          {series.length > 0 ? (
            <div className="flex items-end h-full w-full gap-px">
              {series.slice(-20).map(([timestamp, value]) => {
                const height = Math.max(2, (value / 5) * 100); // Scale to percentage
                return (
                  <div
                    key={timestamp}
                    className="bg-blue-500 flex-1 rounded-sm"
                    style={{ height: `${Math.min(height, 100)}%` }}
                    title={`${new Date(timestamp).toLocaleTimeString()}: ${value} saves`}
                  />
                );
              })}
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
              Loading...
            </div>
          )}
        </div>
        
        {/* Label with data info */}
        <span className="text-xs text-gray-500">
          60min trend ({series.length} pts)
        </span>
      </div>
    </div>
  );
}