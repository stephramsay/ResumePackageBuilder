---
name: cluely-interview-prep
description: Create compact Cluely individual-mode interview prep documents, mode prompts, and retrieval-simulation reports from Stephanie Ramsay resume package outputs or approved interview source material. Use when preparing Cluely context files, prompt modes, exact-script interview cue cards, mock interview practice docs, or hallucination-resistant interview prep notes.
metadata:
  short-description: Build Cluely-ready interview prep docs
---

# Cluely Interview Prep

Use this skill to create a compact Cluely upload document or answer-router file and companion mode prompt for interview practice, mock interviews, or explicitly permitted notes. Treat Cluely as a retrieval/cueing assistant, not a guaranteed word-for-word teleprompter.

## Core Workflow

### Canonical Output Location

Always keep Cluely artifacts in Stephanie's Dev workspace, not `/Users/stephanie/Documents/New project 4`.

- Before creating files, scan for an existing package under `/Users/stephanie/Dev/Interview Guide/[Company - Role]/` or `/Users/stephanie/Dev/resume_packages/[package]/interview-prep/`.
- Update the existing Dev package when one exists. Do not create a duplicate Cluely pack in Project 4.
- If source material is in Downloads, Documents, or Project 4, use it as input only; generated Cluely artifacts still belong in the matching Dev folder.
- The generator enforces this: non-Dev `--output-dir` values are ignored, and source-guide output is resolved to the matching `/Users/stephanie/Dev/Interview Guide/...` folder when possible.
- Only create a new Dev folder when no matching Dev package exists.

### Interview Guide Source

When an `interview-guide.md` exists from the interview-guide-builder skill, use it as the single editable source of truth. The script parses only the `## Cluely Router Source` section, scans for the matching Dev interview-guide package, and writes generated Cluely artifacts there:

```bash
node /Users/stephanie/.codex/skills/cluely-interview-prep/scripts/cluely-prep.mjs \
  --source-guide /absolute/path/to/interview-guide.md
```

This writes:

- `cluely-answer-router.txt`
- `cluely-mode-prompt.txt`
- `cluely-retrieval-simulation.md`
- `cluely-retrieval-results.json`
- `cluely-route-debug.json`

Do not create or hand-edit a separate `cluely-route-spec.yml`; update the Markdown guide and regenerate.

### Resume Package Source

For older workflows, use an existing resume package as the factual source because it already has role-specific claims, metrics, and positioning:

```bash
node /Users/stephanie/.codex/skills/cluely-interview-prep/scripts/cluely-prep.mjs --package-dir ~/Dev/resume_packages/[package-folder]
```

If there is a long-form interview prep script with `STEPHANIE ANCHOR` blocks, pass it as optional source material:

```bash
node /Users/stephanie/.codex/skills/cluely-interview-prep/scripts/cluely-prep.mjs --package-dir ~/Dev/resume_packages/[package-folder] --source-script /absolute/path/to/interview-script.md
```

The script writes:

- `interview-prep/cluely-interview-prep.md`
- `interview-prep/cluely-mode-prompt.txt`
- `interview-prep/cluely-retrieval-simulation.md`
- `interview-prep/cluely-retrieval-results.json`
- `interview-prep/cluely-route-debug.json`

## Reusable Interview Router Workflow

For a new role-specific Cluely answer router, use the templates in `templates/`:

- `templates/master_story_bank.txt`: reusable Stephanie story bank.
- `templates/interview_answer_router_template.txt`: role-specific router skeleton.
- `templates/cluely_mode_prompt_template.txt`: paste-ready Cluely mode prompt.
- `templates/new_question_update_guide.txt`: how to handle new or missed questions.
- `templates/role_tailoring_checklist.txt`: final QA before uploading to Cluely.

For real interview prep, create or update one folder per interview under `/Users/stephanie/Dev/Interview Guide/[Company - Role]/`. The `examples/[company-slug]/` folder is only for reusable sample packages inside the skill itself. Keep reusable stories stable, but tailor the route clue phrases, source layer, story options, and example answers to the specific company, role, interview stage, and likely interviewer themes.

## Output Rules

- Optimize for Cluely individual mode: short sections, stable IDs, trigger phrases, exact scripts, fast cues, and source facts.
- Keep answer routers low-latency. A role-specific answer router must have **no more than 35 routes**. If the source has more than 35 likely question families, consolidate overlapping routes and move lower-probability material into `CUES`, `SOURCE FACTS`, or follow-up depth instead of adding another route.
- Every visible answer should be easy to skim live: use 2-5 bullets with a high-level answer, proof/details, and a role/company bridge when useful. Use labels such as `High-level answer`, `Proof/details`, `STAR`, `Role bridge`, `Plan`, `Question`, or `Close`.
- Do not force one answer structure across every route. Each route must use an `ANSWER TYPE` and the visible answer structure must match the interviewer's intent:
  - `POSITIONING`: use for "tell me about yourself," why company, why role, why leaving, next role, company overview, and other direct positioning questions. Use `High-level answer`, `Proof/details`, and `Role bridge` bullets; do not use STAR.
  - `FRAMEWORK_WITH_PROOF`: use for "how do you think about..." questions such as prioritization, metrics, AI strategy, requirements, launch readiness, privacy, trust/safety, or product strategy. Use a high-level framework bullet, then one proof/details bullet. If the interviewer probes, expand the proof story in STAR.
  - `BEHAVIORAL_STORY`: use for "tell me about a time," "give me an example," conflict, mistake, failure, stakeholder pushback, experiment you ran, roadmap ownership, ambiguity story, or leadership influence. Use STAR or a natural STAR variant with bullets for situation/task, action, result, and role bridge when useful.
  - `PRODUCT_DIAGNOSIS`: use for product critique, first-impression feedback, first logged-in experience, funnel diagnosis, or "what would you improve." Use observation, product judgment, recommendation, metric/guardrail; use a story only as proof if useful.
  - `PLAN`: use for first 30/60/90, first five experiments, or "what would you do first." Use phased or prioritized bullets plus proof/details if helpful; do not use STAR.
  - `QUESTIONS_OR_CLOSE`: use for questions for interviewer and final close. Use short direct bullets; do not use STAR.
- STAR should appear only when the route is story-first or when a framework answer includes an optional proof story. Do not use STAR for pure positioning, product strategy frameworks, plans, questions, or closing answers.
- Keep exact scripts short enough to speak naturally. Default to 100 words max for the first answer.
- Use a clear first-answer structure: direct answer, one proof point or principle, and a concise bridge back to the role.
- Treat 100+ word scripts as exceptions, not the default. Only core narrative or fundamental-story routes may exceed 100 words, and they must be marked with `SCRIPT LENGTH EXCEPTION: CORE_NARRATIVE` or `SCRIPT LENGTH EXCEPTION: FUNDAMENTAL_STORY` in `CUES:` or `SOURCE FACTS:`. Even exceptions should stay at or below 130 words.
- Keep expansion material in `CUES:` and `SOURCE FACTS:` so Cluely can answer first in under 100 words and then go deeper only if the interviewer probes.
- Keep source facts grounded in `approved-content.json`, `source-map.json`, explicit source script anchors, or the `## Cluely Router Source` section of `interview-guide.md`.
- For `--source-guide` workflows, every answer router must include standard interview coverage: tell me about yourself, why company, why role/fit, first 30/60/90 or getting started, prioritization/roadmap, stakeholder pushback, requirements/launch readiness, metrics, cross-functional alignment or conflict, failure/mistake/learning, ambiguity, leadership style or leadership influence, questions for them, and closing/final thoughts.
- For `--source-guide` workflows, the mode prompt must be role-specific and follow the richer MyHealthTeam-style pattern: required output format, routing behavior, anti-repeat rules, voice rules, story-reuse rules, source `ROUTING PRECEDENCE`, direct-answer precedence derived from route questions/triggers, and the route index. Do not leave source-guide mode prompts as short generic instructions.
- For `--source-guide` workflows, treat 35 routes as a hard validation cap. When a guide exceeds 35 routes, revise the `## Cluely Router Source` route list before regenerating; do not ship an oversized router.
- Preserve the fixed mapping for stakeholder-pushback questions: when the interviewer asks about pushing back on a stakeholder request, sales request, one-off client request, requested provider portal, or feature request not aligned with product strategy, route to `STORY_03_HEALTH_SUMMARY_REPORT` with the provider-portal request / Health Summary Report angle if that route exists in the source.
- Never invent employers, roles, titles, dates, credentials, tools, metrics, or outcomes.
- Include a clear usage boundary: practice, mock interviews, or explicitly permitted notes only.
- The mode prompt must tell Cluely to use route IDs, section labels, cues, source facts, match mode, and repeat-risk notes only privately. The visible answer should be just the speakable script bullets unless Stephanie explicitly asks to debug routing.
- The mode prompt must tell Cluely to use exact `SCRIPT` only on a strong match, keep the first answer to 100 words by default, expand from `CUES`/`SOURCE FACTS` only for follow-up depth, preserve the route `ANSWER TYPE`, and return `No prepared answer found` for unsupported questions.

## Verification

Always review `cluely-retrieval-simulation.md` after generation. A good result passes the route simulation and has no validation errors. Warnings about metric-like tokens should be checked against the source map, story bank, or approved metrics before using the doc.

For product-strategy behavioral prep, spot-test: `Tell me about a time when you had to push back on a stakeholder request that wasn't aligned with product strategy.` It should not return the broad platform rebuild, platform-transition weakness, coworker conflict, engineering pushback, or technical-debt story when a `STAKEHOLDER_PUSHBACK` route is available.

If the simulation fails, improve route questions, trigger phrases, story IDs, source facts, or script length in the source guide or source package, then regenerate the Cluely artifacts.
