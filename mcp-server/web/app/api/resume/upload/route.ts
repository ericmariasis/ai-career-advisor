// app/api/resume/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';
/* 👇 1) preload an *empty* worker so the static require resolves           */
import 'pdfjs-dist/legacy/build/pdf.worker.js';

/* 👇 2) then import the main library and tell it not to spin a worker     */
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.js';

/* 🔑 stop pdf‑js from looking for pdf.worker.js */
(pdfjs.GlobalWorkerOptions as { disableWorker?: boolean }).disableWorker = true;

export const runtime = 'nodejs';

async function pdfToText(buf: Buffer) {
    const data = new Uint8Array(buf);           // pdf‑js wants Uint8Array
  
    const doc = await pdfjs.getDocument({ data }).promise;   // worker already off
    let out = '';
  
    for (let p = 1; p <= doc.numPages; p++) {
      const page    = await doc.getPage(p);
      const content = await page.getTextContent();
              out += content.items
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .filter((item: any) => item.str)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((item: any) => item.str as string)
          .join(' ') + '\n';
    }
    await doc.destroy();
    return out.trim();
  }

  export async function POST(req: NextRequest) {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });
  
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (>5 MB)' }, { status: 413 });
    }
  
    const buf  = Buffer.from(await file.arrayBuffer());
    let   text = '';
  
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      text = await pdfToText(buf);               // ←  here
    } else if (
      file.type ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.name.toLowerCase().endsWith('.docx')
    ) {
      const { value } = await mammoth.extractRawText({ buffer: buf });
      text = value;
    } else {
      return NextResponse.json({ error: 'Unsupported type' }, { status: 415 });
    }
  
    text = text.replace(/\s+/g, ' ').trim();
    return NextResponse.json({ text });
  }
  
