'use client';
import { useState, useRef, ChangeEvent } from 'react';

interface ResumeDropZoneProps {
  onTextReady: (txt: string) => void;
  fallbackProps?: {
    value: string;
    onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
    rows: number;
    placeholder: string;
    className: string;
  };
}

export default function ResumeDropZone({ onTextReady, fallbackProps }: ResumeDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

  /* single helper so we can call it from drop **and** file picker */
  const handleFile = (file: File) => {
    const okType =
      file.type === 'application/pdf' ||
      file.type ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.name.toLowerCase().endsWith('.docx');

        // ---------- plain‑text fallback ----------
        if (file.type === 'text/plain') {
            const reader = new FileReader();
            reader.onload = ev => onTextReady(ev.target?.result as string);
            reader.readAsText(file);
            return;
          }
      
          // ---------- PDF / DOCX  →  server upload ----------
          if (okType) {
            (async () => {
              const body = new FormData();
              body.append('file', file);
      
              try {
                const resp = await fetch('/api/resume/upload', { method: 'POST', body });
                if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                const { text } = await resp.json();
                onTextReady(text);
              } catch (err) {
                console.error('resume upload failed', err);
                alert('Upload failed – make sure the file is < 5 MB and a PDF or DOCX.');
              }
            })();
            return;
          }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);      // 🔗 reuse
    };

  return (
    <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            relative rounded border-2 border-dashed
            ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-500/40'}
          `}
        >
                   {/* transparent overlay only when there’s no text */}
                   {(!fallbackProps?.value?.trim()) && (
  <div
    className="absolute inset-0 cursor-pointer z-20
               pointer-events-none sm:pointer-events-auto"
    aria-label="Upload résumé"
    onClick={() => fileInputRef.current?.click()}
    onDragOver={handleDragOver}
    onDragLeave={handleDragLeave}
    onDrop={handleDrop}
  />
)}
      {isDragging && (
        <div className="absolute inset-0 flex items-center justify-center bg-blue-50 border-2 border-dashed border-blue-500 rounded z-10">
          <p className="text-blue-600 font-medium">Drop your resume file here</p>
        </div>
      )}
            {/* 🚩 **always‑visible hint** (hidden only while typing) */}
      {(!isDragging && !fallbackProps?.value?.trim()) && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="text-gray-400 text-sm select-none">
            <span className="hidden sm:inline">Drag &amp; drop a PDF / DOCX,</span>{' '}
            or just paste text below
          </div>
        </div>
      )}

<textarea {...fallbackProps} className={`bg-transparent ${fallbackProps?.className}`} />
      <input
  type="file"
  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  className="hidden"
  ref={fileInputRef}
          onChange={e => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
/>
    </div>
  );
}
