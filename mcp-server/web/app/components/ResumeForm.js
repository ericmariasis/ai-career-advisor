'use client';
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ResumeForm;
const react_1 = require("react");
const useDebouncedApi_1 = require("@/hooks/useDebouncedApi"); // ← new file you added
const ResumeInput_1 = __importDefault(require("./ResumeInput"));
const MIN_CHARS = 20;
function ResumeForm({ onResult, }) {
    const [text, setText] = (0, react_1.useState)('');
    const [error, setError] = (0, react_1.useState)(null);
    const [feedback, setFeedback] = (0, react_1.useState)(null);
    const [isPending, startTransition] = (0, react_1.useTransition)();
    // Debounced POST helper (600 ms by default)
    const sendResume = (0, useDebouncedApi_1.useDebouncedApi)('/api/resume', 600);
    const sendFeedback = (0, useDebouncedApi_1.useDebouncedApi)('/api/resume/feedback', 600);
    const handleChange = (e) => {
        const val = e.target.value;
        setText(val);
        // Nothing yet
        if (!val.trim())
            return;
        // Still too short → show warning and bail
        if (val.trim().length < MIN_CHARS) {
            if (!error) // avoid extra renders
                setError(`Type at least ${MIN_CHARS} characters to start matching jobs…`);
            return;
        }
        // Long enough now → clear any previous warning
        if (error)
            setError(null);
        startTransition(() => {
            // debounced recommendations
            sendResume({ resumeText: val })
                .then(res => res.json())
                .then(({ skills, recommendations }) => onResult({ skills, hits: recommendations }) // transform key
            )
                .catch(() => { });
            // debounced advice
            sendFeedback({ resumeText: val })
                .then(r => r.data)
                .then(({ feedback }) => {
                setFeedback(feedback);
            })
                .catch(err => console.error('sendFeedback error', err));
        });
    };
    // fire when the Match & Advise button is clicked
    const submit = () => {
        if (!text.trim())
            return;
        // Guard for button clicks (handleChange will have cleared it already)
        if (text.trim().length < MIN_CHARS)
            return;
        if (error)
            setError(null); // ensure warning gone on manual submit
        // Show “Analyzing…” via React 18 transition state
        startTransition(() => {
            // 1️⃣  debounced résumé match
            sendResume({ resumeText: text })
                .then(res => res.json())
                .then(({ skills, recommendations }) => onResult({ skills, hits: recommendations }) // transform key
            )
                .catch(() => { });
            // 2️⃣  debounced feedback
            sendFeedback({ resumeText: text })
                .then(r => r.data)
                .then(({ feedback }) => {
                console.log('[ResumeForm] feedback payload →', feedback); // ← add
                setFeedback(feedback);
            })
                .catch(() => { });
        });
    };
    const regenerateFeedback = () => {
        if (!text.trim())
            return;
        setError(null);
        startTransition(() => {
            sendFeedback({ resumeText: text })
                .then(res => res.data) // fetch → Response
                .then(({ feedback }) => setFeedback(feedback))
                .catch(err => {
                console.error(err);
                setError('Regeneration failed');
            });
        });
    };
    return (<div className="space-y-2">
    <ResumeInput_1.default value={text} onChange={handleChange} onTextReady={(extracted) => {
            setText(extracted); // overwrite
            handleChange({ target: { value: extracted } });
        }}/>

        {text.trim().length < MIN_CHARS && (<p className="text-xs text-gray-500">
    Type at least {MIN_CHARS} characters to start matching jobs…
  </p>)}

      <button onClick={submit} disabled={isPending} className="bg-emerald-600 text-white px-4 py-1.5 rounded disabled:opacity-50 flex items-center justify-center">
        {isPending && (<svg className="animate-spin h-4 w-4 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V12z"/>
          </svg>)}
        {isPending ? 'Analyzing…' : 'Match & Advise'}
      </button>

          {error && <p className="text-red-600 text-sm">{error}</p>}

              {/* ★ NEW: show the GPT feedback and regenerate button */}
    {feedback && (<div className="mt-4 rounded border border-gray-700 bg-zinc-800 p-4">
        <h3 className="mb-2 text-lg font-semibold text-white">Career Advice</h3>
        <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-200">
          {feedback}
        </div>

        <button onClick={regenerateFeedback} disabled={isPending} className="mt-4 flex items-center text-sm text-indigo-400 hover:underline disabled:opacity-50">
          {isPending && (<svg className="animate-spin h-4 w-4 mr-2 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V12z"/>
            </svg>)}
          {isPending ? 'Regenerating…' : 'Regenerate Advice'}
        </button>
      </div>)}
    </div>);
}
