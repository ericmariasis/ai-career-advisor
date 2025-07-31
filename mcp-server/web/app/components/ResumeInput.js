'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ResumeInput;
const react_1 = require("react");
function ResumeInput({ value, onChange, onTextReady }) {
    const fileInput = (0, react_1.useRef)(null);
    const [busy, setBusy] = (0, react_1.useState)(false);
    async function handleFile(file) {
        /* ↓ allow only PDF / DOCX */
        const ok = file.type === 'application/pdf' ||
            file.type ===
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            file.name.toLowerCase().endsWith('.docx');
        if (!ok) {
            alert('Only PDF or DOCX files are supported');
            return;
        }
        const body = new FormData();
        body.append('file', file);
        try {
            setBusy(true);
            const res = await fetch('/api/resume/upload', { method: 'POST', body });
            if (!res.ok)
                throw new Error(`HTTP ${res.status}`);
            const { text } = await res.json();
            onTextReady(text); // ⬅ overwrite the textarea
        }
        catch (err) {
            console.error(err);
            alert('Upload failed – check size (< 5 MB) & type.');
        }
        finally {
            setBusy(false);
        }
    }
    return (<div className="space-y-2">
      {/* the always‑editable plain textarea */}
      <textarea value={value} onChange={onChange} rows={6} placeholder="Paste your résumé text here…" className="w-full rounded border p-3 text-sm bg-transparent"/>

      {/* hidden native file‑picker */}
      <input ref={fileInput} type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" onChange={e => {
            var _a;
            const f = (_a = e.target.files) === null || _a === void 0 ? void 0 : _a[0];
            if (f)
                handleFile(f);
        }}/>

      {/* visible button */}
      <button type="button" onClick={() => { var _a; return (_a = fileInput.current) === null || _a === void 0 ? void 0 : _a.click(); }} className="rounded bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 flex items-center gap-2">
               {/* inline SVG so there’s no extra deps */}
        {busy && (<svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <circle cx="12" cy="12" r="10" className="opacity-25"/>
            <path d="M12 2a10 10 0 000 20" className="opacity-75"/>
          </svg>)}
        {busy ? 'Uploading…' : 'Upload PDF / DOCX'}
      </button>
    </div>);
}
