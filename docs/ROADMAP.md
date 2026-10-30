# Roadmap

Next increments in order of value. Effort is a rough engineering estimate; review time for guides is separate.

| # | Increment | Why | Effort |
|---|---|---|---|
| 1 | **Switch the deployment to live research** and run the first-run checklist (SDK server-tool events, `web_fetch` beta header, JSON drift) | Turns the demo into the real product with one env var | hours |
| 2 | **Upstash cache and rate limit** | Guides survive cold starts; per-IP limits hold across instances | hours |
| 3 | **Browser probe of the create-app form** (Playwright or Browserbase) that reports the fields a provider asks for | Converts "documented" form details into "tested" evidence, the thinnest level today | days |
| 4 | **Batch-generate 20 more guides**, review the diff, promote | The path to the 100-guide library; measures real cost and failure modes | days, mostly review |
| 5 | **Freshness job**: weekly link check plus `?force=1` regeneration for guides older than N days, diffed against the curated file | Policies drift (X changed pricing twice in 2026) | hours |
| 6 | **Compare view**: two providers side by side on the two clocks and blockers | Teams choosing which integration to ship first | days |
| 7 | **Composio-aware recommendations**: when a managed OAuth app exists, generate the exact Composio connection snippet next to the guide | Shortcuts first, made actionable | days |
| 8 | **Manual-attempt tooling**: a template that turns VERIFICATION.md section 4 entries into `tested` evidence and probe-type sources automatically | Lowers the cost of adding human evidence | hours |
| 9 | **Dark mode** matching composio.dev's dark tokens | Already extracted; UI only | hours |
| 10 | **Evaluation set**: 10 apps with known answers, run on every pipeline change, scored on difficulty, clocks and evidence levels | Regression safety for prompt changes | days |

Non-goals for now: accounts, analytics, user-submitted edits, a public write API.
