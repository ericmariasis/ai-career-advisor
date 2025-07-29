'use client'
import { useRef, ChangeEvent } from 'react'

interface Props {
  value: string
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void
  onTextReady: (txt: string) => void        // filled when a file is parsed
}

export default function ResumeInput({ value, onChange, onTextReady }: Props) {
  const fileInput = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    /* ↓ allow only PDF / DOCX */
    const ok =
      file.type === 'application/pdf' ||
      file.type ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.name.toLowerCase().endsWith('.docx')

    if (!ok) { alert('Only PDF or DOCX files are supported'); return }

    const body = new FormData()
    body.append('file', file)

    try {
      const res = await fetch('/api/resume/upload', { method: 'POST', body })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const { text } = await res.json()
      onTextReady(text)                         // ⬅ overwrite the textarea
    } catch (err) {
      console.error(err)
      alert('Upload failed – check size (< 5 MB) & type.')
    }
  }

  return (
    <div className="space-y-2">
      {/* the always‑editable plain textarea */}
      <textarea
        value={value}
        onChange={onChange}
        rows={6}
        placeholder="Paste your résumé text here…"
        className="w-full rounded border p-3 text-sm bg-transparent"
      />

      {/* hidden native file‑picker */}
      <input
        ref={fileInput}
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0]
          if (f) handleFile(f)
        }}
      />

      {/* visible button */}
      <button
        type="button"
        onClick={() => fileInput.current?.click()}
        className="rounded bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
      >
        Upload PDF / DOCX
      </button>
    </div>
  )
}
