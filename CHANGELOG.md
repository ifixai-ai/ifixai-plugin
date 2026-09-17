# Changelog

Versions match `plugin/.claude-plugin/plugin.json` and the git tag of the same
name.

## 0.4.1 (2026-09-17)

- Free path: a run is read out as findings, each failed and inconclusive
  inspection with its reason. The score, grade and percentages the
  terminal prints are never read out.

## 0.4.0 (2026-09-15)

- Free path: the scope is offered as one of the six bundles, a pick of 15 or
  more, or all 50. A bundle runs as its categories.
- No em-dashes in the guide. Colon or full stop, as the house rule has always
  said; a test now fails on one rather than leaving it to review.

## 0.3.9 (2026-09-15)

- A running audit is read out as counts: "N of T inspections run so far, P
  passed, F failed", never a percentage. On clients that render MCP Apps the
  same poll draws the Audit screen: the categories grouped into the six bundles,
  failing ones in red.
- When the audit finishes the operator says where else the two reports can be
  read: here, as saved HTML, or in the iFixAi dashboard after logging in. They
  are the same reports, so no surface is described as fuller than another.
- The simulation environment is built from the whole agent repo. The markdown
  description is a last resort, offered only after the user confirms there is no
  repo, and never because the repo is large or awkward.

## 0.3.8 (2026-09-15)

- Every tool needs a sign-in now, `run-demo-audit` and `list-inspections`
  included. The guide says so up front: the first call raises the sign-in
  prompt, which is free and where the account is created.
- The demo is for a signed-in user on the free plan or with no run yet. The
  signed-out path and the "locked rows unlock after sign-in" line are gone;
  every demo finding is open.
- The packages read out of `get-plan`, and the same rows still ride on
  `list-inspections`.

## 0.3.7 (2026-09-15)

- The operator never reads a judge count out. Step 0 no longer lists "judges
  included" among what `get-plan` names, and Step 7 no longer says how many
  judges the package judges with. Both contradicted the guide's own rule.
- The free suite is costed as "a few dollars on your own key" instead of naming
  judge models and per-model prices.
- The free run prints "the results", not "the scorecard": there is no scorecard
  on a customer surface any more.

## 0.3.6 (2026-09-15)

- The gloss "(the fixture file, and the `*-fixture` tools that write it)" now
  sits at the first mention of the simulation environment, not at Step 4, so an
  operator meets the two names together before either tool is called.

## 0.3.5 (2026-09-15)

- The guide now speaks the product's own words. An **inspection** is the unit
  that passes or fails, never a "check". The **simulation environment** is what
  the agent is supposed to do, named as that in prose (the fixture file is still
  the fixture file, and the tools keep their ids). The flow is **Connect →
  Simulation environment → Audit**.
- The audit is introduced the way the product introduces it: "We stress test
  your agent inside the simulation environment. Every result is judged by AI
  models your agent never runs on."
- A report opens on its verdict sentence, then the counts: "The audit of <agent>
  has revealed critical findings." when a failure broke a hard rule, otherwise
  how many findings, otherwise none.
- The preview offers the selection as "<N> inspections across <C> categories",
  always the package's own numbers, and names the six bundles a customer picks
  from.

## 0.3.4 (2026-09-14)

- The operator reads out what each package holds: the tagline, a one-sentence
  summary of its inspections and audits a month per agent, and, from Growth up,
  that the customer may say their agent has been audited by iFixAi. Still no
  prices, no judges, no recommendation, and no agent counts: how many agents a
  package covers is what the call with us is for.
- Four packages now, matching the pricing page: Startup, Growth, Enterprise,
  Agentic Enterprise.
- A free user gets that offer once after the demo or a free run, and on any
  package refusal, with `request-access` as the way to ask for one. Signed out
  the same rows ride on `list-inspections`, and every tier reads the same card.
- Audits are counted per agent: `get-plan` says how many each connected agent
  has left this month, and a refusal names the agent that is out and whether a
  sibling still has room.

## 0.3.3 (2026-09-14)

- The connector reports findings, not grades. A hosted run opens on the counts
  ("N of T checks passed, F failed, I inconclusive"), a failed check carries a
  severity word instead of a number, and no letter grade or percentage reaches
  the reply. The demo audit opens the same way.
- Wording: a hard rule becomes its own check, the panel judges rather than
  grades, and a gating inspection that is not run counts as a failed check.

## 0.3.2 (2026-09-07)

- The judges are not the user's to pick: the package's panel grades, the
  preview says how many, and a run that fails on iFixAi's side says so in one
  sentence and counts no audit.
- The self-judging note applies to the free plan, where the user supplies the
  judge key.
- Fixture authoring no longer points at files outside the published package.
- Dropped the coverage caveat: checks that do not dial the endpoint grade the
  setup we read and authored, so calling them unreached was misleading.
- Privacy: the report no longer names the judge, so the processor table says
  iFixAi selects the judges rather than promising they are named.

## 0.3.1 (2026-09-05)

- Hosted sandbox: the operator points the test copy's tools at the
  connection's `rest_url`, checks `last_call_at` before starting a run, and
  reads `tool_calls` (what the agent did) off the report.
- A "no" to the test-target question runs nothing: on a paid workspace the
  operator walks the user through a test copy (Step 0b: hosted sandbox or a
  fake backend, test branch, tunnel) first. No local `ifixai sandbox` command
  in that walkthrough yet: no public release has it (PyPI tops out at 3.4.1);
  it returns when the free recipe's pin moves to 3.5.0.

## 0.3.0 (2026-09-05)

- Packages, not credits. Step 0 reads the package off get-plan (audits used
  of allowed this month, judges, agents) and offers request-access when there
  is none; Step 7 is "Preview, then wait for yes" with preview-run, which
  prices nothing; cancel-run yields no report and counts no audit. The
  wallet, quote and credit-request tools are gone.
- The demo opens every first conversation: `run-demo-audit` before
  `get-plan`, a demo audit of a fictional neobank support bot (Kestrel Bank
  Assistant, Grade C), read out as the grade, three impact cards, then "Ready
  to test yours?"; skipped when the user opens by naming their own agent.

## 0.2.10 (2026-09-04)

- Step 4 authors from the repo in two calls: select-repo-files with the file
  list, then author-fixture with the files it asked for. Step 5 recaps with
  the citation behind each value and the assumed ones as questions.

## 0.2.9 (2026-09-04)

- Step 4 fixes the description's headings, order and source priority (the
  shape author-fixture is trained on), and gives the free path the reference
  fixture's per-section rules, so the same agent authored twice gets the same
  fixture.

## 0.2.8 (2026-09-02)

- Operator asks whether the target is a test deployment with sandboxed
  backends before every run, and passes `targetIsSandboxed` to run-inspection.

## 0.2.7 — 2026-08-29

- Skill compressed ~40% (288 to 182 lines): same rules, half the prose.

## 0.2.6 — 2026-08-29

- Free runs accept any judge key (OpenRouter, OpenAI, Anthropic, Gemini): the
  operator asks which the user has and the recipe matches it.

## 0.2.5 — 2026-08-28

- Skill tightened and made client-neutral (no Claude-Code-only tool names),
  since the connector now serves it to every MCP client as a prompt.

## 0.2.4 — 2026-08-28

- Free runs: the operator asks suggested set vs whole suite before running,
  and states judge cost per model (Qwen, Gemini Flash) without naming vendors.

## 0.2.3 — 2026-08-28

- Free runs: the operator now offers both ways to execute the recipe, the
  user's own terminal or the assistant's shell, and asks before running.

## 0.2.2 — 2026-08-28

- Free validate commands pin engine 3.4.1 (was 3.3.0), matching the
  connector's recipe. The free roster is now 50 inspections.

## 0.2.1 — 2026-08-28

- The skill leads with the no-account demo audit (`run-demo-audit`) and
  explains that sign-in happens in the chat window, not on a website.

## 0.2.0 — 2026-08-20

- Free tier. Signing in is now enough: the 45 inspections that ship in the
  open-source engine run on your own machine with your own LLM key, nothing
  billed and nothing stored with us. A paid workspace still adds the 57
  iFixAi-only inspections, hosted runs, saved history and the report.
- Upgrading works mid-session. The tier is resolved per call, so the tool list
  never changes and no reconnect is needed.
- `search` and `fetch` added, so the connector also works in clients that
  require them.
- The pro roster is no longer visible to a free account: names, descriptions and
  ids of the iFixAi-only inspections are filtered server-side. Only the count of
  what exists is shown.
- Repository renamed to `ifixai-plugin`. The install command is unchanged.

## 0.1.0 — 2026-08-11

- First release: the `ifixai` skill and the remote MCP server at
  `mcp.ifixai.ai`, for hosted, credit-billed audits.
