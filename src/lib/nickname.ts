export function uniqueNickname(desired: string, existing: string[]): string {
  const base = desired.trim() || "학생";
  if (!existing.includes(base)) return base;
  let n = 2;
  while (existing.includes(`${base}_${n}`)) n += 1;
  return `${base}_${n}`;
}
