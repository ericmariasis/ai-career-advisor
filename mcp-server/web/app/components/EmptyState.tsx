'use client';

interface EmptyStateProps {
  title?: string;
  subtitle?: string;
}

export default function EmptyState({
  title = 'Nothing here yet',
  subtitle = 'Try adjusting your filters or saving some jobs!',
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      {/* Simple animated SVG illustration */}
      <div className="animate-in fade-in zoom-in-75 duration-700 ease-out">
        <svg
          width="160"
          height="160"
          viewBox="0 0 160 160"
          className="text-gray-300"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Empty folder icon */}
          <rect
            x="20"
            y="60"
            width="120"
            height="80"
            rx="8"
            stroke="currentColor"
            strokeWidth="2"
            fill="transparent"
          />
          <path
            d="M20 60 L50 60 L60 50 L80 50 L90 60 L140 60"
            stroke="currentColor"
            strokeWidth="2"
            fill="transparent"
          />
          {/* Floating dots animation */}
          <circle cx="80" cy="90" r="2" fill="currentColor" className="animate-pulse" />
          <circle cx="90" cy="100" r="2" fill="currentColor" className="animate-pulse delay-100" />
          <circle cx="70" cy="100" r="2" fill="currentColor" className="animate-pulse delay-200" />
        </svg>
      </div>
      
      <h3 className="mt-6 text-xl font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 text-sm text-gray-700 max-w-sm">{subtitle}</p>
    </div>
  );
}