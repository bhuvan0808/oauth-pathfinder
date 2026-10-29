/**
 * Models wrap JSON in prose or fences no matter how firmly you ask. This finds the first
 * balanced top-level object/array and parses it. Throws with a useful message otherwise.
 */
export function extractJson<T = unknown>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidates = [fenced?.[1], text].filter(Boolean) as string[];
  for (const c of candidates) {
    const start = c.search(/[\[{]/);
    if (start < 0) continue;
    const open = c[start];
    const close = open === "{" ? "}" : "]";
    let depth = 0;
    let inStr = false;
    let esc = false;
    for (let i = start; i < c.length; i++) {
      const ch = c[i];
      if (inStr) {
        if (esc) esc = false;
        else if (ch === "\\") esc = true;
        else if (ch === '"') inStr = false;
        continue;
      }
      if (ch === '"') inStr = true;
      else if (ch === open) depth++;
      else if (ch === close) {
        depth--;
        if (depth === 0) {
          const slice = c.slice(start, i + 1);
          try {
            return JSON.parse(slice) as T;
          } catch (e) {
            // try the next candidate
            break;
          }
        }
      }
    }
  }
  throw new Error(`No parseable JSON found in model output (first 200 chars): ${text.slice(0, 200)}`);
}
