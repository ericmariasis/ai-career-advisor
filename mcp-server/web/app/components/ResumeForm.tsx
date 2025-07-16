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
  const [feedback, setFeedback] = useState<string | null>(null);

  const submit = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    setFeedback(null);
    try {
      const { data } = await axios.post<ResumeResp>('/api/resume', {
        resumeText: text,
      });
      onResult(data);
      
      // ★ NEW: fetch LLM feedback
      const { data: fb } = await axios.post<{ feedback: string }>(
        '/api/resume/feedback',
        { resumeText: text }
      );
      setFeedback(fb.feedback);
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Upload failed');
    } finally {
      setLoading(false);
    }
};

      // ★ NEW: handler to re-run only the feedback call
      const regenerateFeedback = async () => {
        if (!text.trim()) return;
        setLoading(true);
        setError(null);
        try {
          const { data: fb } = await axios.post<{ feedback: string }>(
            '/api/resume/feedback',
            { resumeText: text }
          );
          setFeedback(fb.feedback);
        } catch (err: any) {
          setError(err?.response?.data?.error ?? 'Regeneration failed');
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
        className="bg-emerald-600 text-white px-4 py-1.5 rounded disabled:opacity-50 flex items-center justify-center"
      >
        {loading && (
          <svg
            className="animate-spin h-4 w-4 mr-2 text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V12z" />
          </svg>
        )}
        {loading ? 'Analyzing…' : 'Match & Advise'}
      </button>

          {error && <p className="text-red-600 text-sm">{error}</p>}

              {/* ★ NEW: show the GPT feedback and regenerate button */}
    {feedback && (
      <div className="mt-4 rounded border border-gray-700 bg-zinc-800 p-4">
        <h3 className="mb-2 text-lg font-semibold text-white">Career Advice</h3>
        <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-200">
          {feedback}
        </div>

        <button
          onClick={regenerateFeedback}
          disabled={loading}
          className="mt-4 flex items-center text-sm text-indigo-400 hover:underline disabled:opacity-50"
        >
          {loading && (
            <svg
              className="animate-spin h-4 w-4 mr-2 text-indigo-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V12z" />
            </svg>
          )}
          {loading ? 'Regenerating…' : 'Regenerate Advice'}
        </button>
      </div>
    )}
    </div>
  );
}
