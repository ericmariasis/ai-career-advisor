"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtime = void 0;
exports.POST = POST;
// app/api/resume/upload/route.ts
const server_1 = require("next/server");
const mammoth_1 = __importDefault(require("mammoth"));
/* 👇 1) preload an *empty* worker so the static require resolves           */
require("pdfjs-dist/legacy/build/pdf.worker.js");
/* 👇 2) then import the main library and tell it not to spin a worker     */
const pdfjs = __importStar(require("pdfjs-dist/legacy/build/pdf.js"));
/* 🔑 stop pdf‑js from looking for pdf.worker.js */
pdfjs.GlobalWorkerOptions.disableWorker = true;
exports.runtime = 'nodejs';
async function pdfToText(buf) {
    const data = new Uint8Array(buf); // pdf‑js wants Uint8Array
    const doc = await pdfjs.getDocument({ data }).promise; // worker already off
    let out = '';
    for (let p = 1; p <= doc.numPages; p++) {
        const page = await doc.getPage(p);
        const content = await page.getTextContent();
        out += content.items.map((i) => { var _a; return (_a = i.str) !== null && _a !== void 0 ? _a : ''; }).join(' ') + '\n';
    }
    await doc.destroy();
    return out.trim();
}
async function POST(req) {
    const form = await req.formData();
    const file = form.get('file');
    if (!file)
        return server_1.NextResponse.json({ error: 'No file' }, { status: 400 });
    if (file.size > 5 * 1024 * 1024) {
        return server_1.NextResponse.json({ error: 'File too large (>5 MB)' }, { status: 413 });
    }
    const buf = Buffer.from(await file.arrayBuffer());
    let text = '';
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        text = await pdfToText(buf); // ←  here
    }
    else if (file.type ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.name.toLowerCase().endsWith('.docx')) {
        const { value } = await mammoth_1.default.extractRawText({ buffer: buf });
        text = value;
    }
    else {
        return server_1.NextResponse.json({ error: 'Unsupported type' }, { status: 415 });
    }
    text = text.replace(/\s+/g, ' ').trim();
    return server_1.NextResponse.json({ text });
}
