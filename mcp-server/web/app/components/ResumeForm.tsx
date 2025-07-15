'use client';
import { useState } from 'react';
import axios from 'axios';
import type { Job } from './JobCard';

type ResumeResp = { skills: string[]; hits: Job[] };

export default function ResumeForm({
  onResult,
}: {
  onResult: (r: ResumeResp) => void;
}) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const submit = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.post<ResumeResp>('/api/resume', {
        resumeText: text,
      });
      onResult(data);
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        rows={6}
        placeholder="Paste your résumé text here…"
        className="w-full border rounded p-3 text-sm"
      />
      <button
        onClick={submit}
        disabled={loading}
        className="bg-emerald-600 text-white px-4 py-1.5 rounded disabled:opacity-50"
      >
        {loading ? 'Finding…' : 'Find matching jobs'}
      </button>

      {error && <p className="text-red-600 text-sm">{error}</p>}
    </div>
  );
}
