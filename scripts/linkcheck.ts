/**
 * HEAD/GET every source URL in the curated guides and report dead links.
 * Run before submission:  npx tsx scripts/linkcheck.ts
 * (Some sites block bots; a 403 is noted, not failed.)
 */
import fs from "node:fs";
import path from "node:path";

const dir = path.join(process.cwd(), "data", "guides");
const urls = new Map<string, string[]>();
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json"))) {
  const g = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  for (const s of g.sources || []) {
    if (s.type === "probe") continue;
    urls.set(s.url, [...(urls.get(s.url) || []), f]);
  }
}

const HEADERS = {
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 oauth-pathfinder-linkcheck",
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "accept-language": "en-US,en;q=0.9"
};

async function check(url: string): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);
  try {
    let res = await fetch(url, { method: "HEAD", redirect: "follow", signal: ctrl.signal, headers: HEADERS });
    // Some hosts answer HEAD with 4xx but GET with 200 (Google support, Microsoft Tech Community); always confirm with GET.
    if (res.status >= 400) res = await fetch(url, { method: "GET", redirect: "follow", signal: ctrl.signal, headers: HEADERS });
    return String(res.status);
  } catch (e) {
    return `ERR ${(e as Error).message}`;
  } finally {
    clearTimeout(t);
  }
}

(async () => {
  let bad = 0;
  for (const [url, files] of urls) {
    const status = await check(url);
    const ok = /^2|^3/.test(status);
    if (!ok && status !== "403") bad++;
    console.log(`${ok ? "ok  " : status === "403" ? "403?" : "BAD "} ${status.padEnd(6)} ${url}  (${files.join(", ")})`);
  }
  console.log(`\n${urls.size} URLs checked, ${bad} failing.`);
  process.exit(bad ? 1 : 0);
})();
