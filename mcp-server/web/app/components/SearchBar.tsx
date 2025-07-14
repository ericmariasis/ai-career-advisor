'use client';
import { useState } from 'react';

export default function SearchBar({ onSearch }: { onSearch: (q: string)=>void }) {
  const [term, setTerm] = useState('');
  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        onSearch(term.trim());
      }}
      className="flex gap-2"
    >
      <input
        value={term}
        onChange={e => setTerm(e.target.value)}
        placeholder="Search job titles, skills…"
        className="flex-1 rounded border px-3 py-2"
      />
      <button
        type="submit"
        className="bg-indigo-600 text-white px-4 py-2 rounded"
      >
        Search
      </button>
    </form>
  );
}
