/** Map a 0-1 fit score to a tailwind text-/bg-color pair */
export function fitColor(score: number): [string, string] {
  if (score >= 0.85) return ['text-emerald-600', 'bg-emerald-50'];   // 🟢 excellent
  if (score >= 0.65) return ['text-lime-600', 'bg-lime-50'];         // 🟡 good  
  if (score >= 0.45) return ['text-amber-600', 'bg-amber-50'];       // 🟠 meh
  return ['text-red-600', 'bg-red-50'];                             // 🔴 poor
}