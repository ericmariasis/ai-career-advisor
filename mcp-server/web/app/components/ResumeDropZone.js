'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ResumeDropZone;
const react_1 = require("react");
function ResumeDropZone({ onTextReady, fallbackProps }) {
    var _a, _b;
    const [isDragging, setIsDragging] = (0, react_1.useState)(false);
    const fileInputRef = (0, react_1.useRef)(null);
    /* single helper so we can call it from drop **and** file picker */
    const handleFile = (file) => {
        const okType = file.type === 'application/pdf' ||
            file.type ===
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            file.name.toLowerCase().endsWith('.docx');
        // ---------- plain‑text fallback ----------
        if (file.type === 'text/plain') {
            const reader = new FileReader();
            reader.onload = ev => { var _a; return onTextReady((_a = ev.target) === null || _a === void 0 ? void 0 : _a.result); };
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
                    if (!resp.ok)
                        throw new Error(`HTTP ${resp.status}`);
                    const { text } = await resp.json();
                    onTextReady(text);
                }
                catch (err) {
                    console.error('resume upload failed', err);
                    alert('Upload failed – make sure the file is < 5 MB and a PDF or DOCX.');
                }
            })();
            return;
        }
    };
    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };
    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };
    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file)
            handleFile(file); // 🔗 reuse
    };
    return (<div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} className={`
            relative rounded border-2 border-dashed
            ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-500/40'}
          `}>
                   {/* transparent overlay only when there’s no text */}
                   {(!((_a = fallbackProps === null || fallbackProps === void 0 ? void 0 : fallbackProps.value) === null || _a === void 0 ? void 0 : _a.trim())) && (<div className="absolute inset-0 cursor-pointer z-20
               pointer-events-none sm:pointer-events-auto" aria-label="Upload résumé" onClick={() => { var _a; return (_a = fileInputRef.current) === null || _a === void 0 ? void 0 : _a.click(); }} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}/>)}
      {isDragging && (<div className="absolute inset-0 flex items-center justify-center bg-blue-50 border-2 border-dashed border-blue-500 rounded z-10">
          <p className="text-blue-600 font-medium">Drop your resume file here</p>
        </div>)}
            {/* 🚩 **always‑visible hint** (hidden only while typing) */}
      {(!isDragging && !((_b = fallbackProps === null || fallbackProps === void 0 ? void 0 : fallbackProps.value) === null || _b === void 0 ? void 0 : _b.trim())) && (<div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="text-gray-400 text-sm select-none">
            <span className="hidden sm:inline">Drag &amp; drop a PDF / DOCX,</span>{' '}
            or just paste text below
          </div>
        </div>)}

    <textarea {...fallbackProps} className={`bg-transparent ${fallbackProps === null || fallbackProps === void 0 ? void 0 : fallbackProps.className}`}/>
      <input type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" ref={fileInputRef} onChange={e => {
            var _a;
            const f = (_a = e.target.files) === null || _a === void 0 ? void 0 : _a[0];
            if (f)
                handleFile(f);
        }}/>
    </div>);
}
