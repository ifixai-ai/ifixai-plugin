# Changelog

Versions match `plugin/.claude-plugin/plugin.json` and the git tag of the same
name.

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
