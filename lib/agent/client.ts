import Anthropic from "@anthropic-ai/sdk";
import { mockComplete, mockResearch } from "./mock";

export const MOCK = process.env.MOCK_AGENT === "1";

/**
 * Thin wrapper around the Messages API with Anthropic's server-side web_search and web_fetch tools.
 * Docs: https://docs.claude.com/en/docs/agents-and-tools/tool-use/web-search-tool
 *       https://docs.claude.com/en/docs/agents-and-tools/tool-use/web-fetch-tool (beta header web-fetch-2025-09-10)
 *
 * We return the final text AND the set of URLs the tools actually visited, so later stages can
 * insist that every "documented" claim points at a URL the pipeline really saw.
 */

export const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";

let _client: Anthropic | null = null;
export function client(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set");
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

export type VisitedSource = { url: string; title?: string; via: "search" | "fetch" };

export type ResearchResult = {
  text: string;
  visited: VisitedSource[];
  usage: { input: number; output: number; searches: number; fetches: number };
};

type ResearchOpts = {
  system: string;
  user: string;
  maxSearches?: number;
  maxFetches?: number;
  maxTokens?: number;
  /** restrict fetches to these domains (no scheme) */
  allowedFetchDomains?: string[];
  onEvent?: (e: { kind: "search" | "fetch" | "text"; detail: string }) => void;
};

export async function research(opts: ResearchOpts): Promise<ResearchResult> {
  if (MOCK) return mockResearch(opts);
  const tools: any[] = [];
  if ((opts.maxSearches ?? 6) > 0) {
    tools.push({ type: "web_search_20250305", name: "web_search", max_uses: opts.maxSearches ?? 6 });
  }
  if ((opts.maxFetches ?? 4) > 0) {
    tools.push({
      type: "web_fetch_20250910",
      name: "web_fetch",
      max_uses: opts.maxFetches ?? 4,
      ...(opts.allowedFetchDomains?.length ? { allowed_domains: opts.allowedFetchDomains } : {}),
      max_content_tokens: 25_000
    });
  }

  const stream = client().messages.stream(
    {
      model: MODEL,
      max_tokens: opts.maxTokens ?? 6000,
      system: opts.system,
      messages: [{ role: "user", content: opts.user }],
      tools
    },
    { headers: { "anthropic-beta": "web-fetch-2025-09-10" } }
  );

  const visited: VisitedSource[] = [];
  let searches = 0;
  let fetches = 0;

  // Surface tool activity as it happens so the UI can show "Searching: ..." / "Reading: ..."
  stream.on("contentBlock", (block: any) => {
    if (block.type === "server_tool_use") {
      if (block.name === "web_search") {
        searches++;
        opts.onEvent?.({ kind: "search", detail: String(block.input?.query ?? "") });
      } else if (block.name === "web_fetch") {
        fetches++;
        opts.onEvent?.({ kind: "fetch", detail: String(block.input?.url ?? "") });
      }
    }
    if (block.type === "web_search_tool_result" && Array.isArray(block.content)) {
      for (const r of block.content) {
        if (r?.type === "web_search_result" && r.url) visited.push({ url: r.url, title: r.title, via: "search" });
      }
    }
    if (block.type === "web_fetch_tool_result") {
      const url = block.content?.url;
      if (url) visited.push({ url, title: block.content?.content?.title, via: "fetch" });
    }
  });

  const final = await stream.finalMessage();
  const text = final.content
    .filter((b: any) => b.type === "text")
    .map((b: any) => b.text)
    .join("\n");

  // Dedupe by URL, prefer fetched over searched
  const byUrl = new Map<string, VisitedSource>();
  for (const v of visited) {
    const prev = byUrl.get(v.url);
    if (!prev || (prev.via === "search" && v.via === "fetch")) byUrl.set(v.url, v);
  }

  return {
    text,
    visited: [...byUrl.values()],
    usage: {
      input: final.usage?.input_tokens ?? 0,
      output: final.usage?.output_tokens ?? 0,
      searches,
      fetches
    }
  };
}

/** Plain completion without tools, for synthesis/verification over already-gathered material. */
export async function complete(opts: { system: string; user: string; maxTokens?: number }): Promise<string> {
  if (MOCK) return mockComplete(opts);
  const msg = await client().messages.create({
    model: MODEL,
    max_tokens: opts.maxTokens ?? 8000,
    system: opts.system,
    messages: [{ role: "user", content: opts.user }]
  });
  return msg.content
    .filter((b: any) => b.type === "text")
    .map((b: any) => b.text)
    .join("\n");
}
