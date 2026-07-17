/** True when building/running the GitHub Pages static export. */
export function isStaticMode(): boolean {
  return process.env.NEXT_PUBLIC_STATIC === "1";
}
