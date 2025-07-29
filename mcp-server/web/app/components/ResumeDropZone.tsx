'use client';
import { useState, ChangeEvent } from 'react';

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
    
    const files = Array.from(e.dataTransfer.files);
    const file = files[0];
    
    if (file && file.type === 'text/plain') {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        onTextReady(text);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative ${isDragging ? 'border-blue-500 bg-blue-50' : ''}`}
    >
      {isDragging && (
        <div className="absolute inset-0 flex items-center justify-center bg-blue-50 border-2 border-dashed border-blue-500 rounded z-10">
          <p className="text-blue-600 font-medium">Drop your resume file here</p>
        </div>
      )}
      
      <textarea {...fallbackProps} />
    </div>
  );
}
