'use client';

interface ChipsProps {
  title: string;
  values: string[];
  selected: string | null;
  onPick: (val: string | null) => void;
}

export default function FilterChips({ title, values, selected, onPick }: ChipsProps) {
  return (
    <section className="mb-4">
      <h4 className="mb-2 text-xs font-semibold uppercase text-gray-500 tracking-wide">{title}</h4>
      <div className="flex flex-wrap gap-2">
        {values.map(value => (
          <button
            key={value}
            onClick={() => onPick(selected === value ? null : value)}
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
              selected === value
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
            }`}
          >
            {value}
          </button>
        ))}
      </div>
    </section>
  );
}