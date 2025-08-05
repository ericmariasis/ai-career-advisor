'use client';

import React, { createContext, useContext, useState } from 'react';

type ResumeCtx = {
  skills: string[];
  setSkills: (s: string[]) => void;
};

const Ctx = createContext<ResumeCtx | undefined>(undefined);

export const ResumeProvider = ({ children }: { children: React.ReactNode }) => {
  const [skills, setSkills] = useState<string[]>([]);
  return <Ctx.Provider value={{ skills, setSkills }}>{children}</Ctx.Provider>;
};

export const useResume = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useResume must be in <ResumeProvider>');
  return ctx;
};