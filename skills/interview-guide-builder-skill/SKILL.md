---
name: interview-guide-builder
description: Build Stephanie Ramsay role-specific interview guides from a job description or job URL by researching the company, matching the approved story bank and resume facts, writing a natural interview guide, and generating a structured Cluely Router Source handoff. Use when the user asks for interview prep, a job-description-based interview guide, top likely questions, company/role research, story matching, or Cluely-ready interview material.
---

# Interview Guide Builder

## Purpose

Use this skill to turn a new job description into a reusable interview prep package. The Markdown guide is the single editable source of truth; DOCX and Cluely artifacts are generated from it.

Default output pattern:

`/Users/stephanie/Dev/Interview Guide/[Company] - [Role]/`

## Canonical Inputs

Use only approved sources for Stephanie's experience:

- Story bank: `/Users/stephanie/Documents/New project 4/story-bank/data/stories.yml`
- Story exports: `/Users/stephanie/Documents/New project 4/story-bank/exports/`
- Resume source data: `/Users/stephanie/.codex/skills/resume-package/assets/resume_app_infra/source_data/`
- Existing resume packages when role-specific positioning is useful: `/Users/stephanie/Dev/resume_packages/`
- MyHealthTeam prep package as the format and voice model: `/Users/stephanie/Documents/New project 4/interview-prep/myhealthteam-swoop/`
- Reusable PM framework bank: `assets/framework-bank.md`
- Source flashcard decks for framework provenance: `/Users/stephanie/Documents/Personal/Flashcards/`

If a role reveals a missing story, create a review-first story-bank candidate report. Do not mutate canonical stories unless Stephanie explicitly approves.

## Required Workflow

1. Create or reuse the role folder.
2. Save the input as `job-description.md`.
3. Browse for current company and role research before writing strategy.
4. Write `company-research.md` with dated sources and strategic implications.
5. Load the story bank and approved resume metric sources.
6. Load `assets/framework-bank.md` and select 5-8 role-relevant frameworks to use as thinking scaffolds.
7. Write `story-fit-map.md` mapping role needs to stories, backups, gaps, metrics, and selected framework cues.
8. Write `interview-guide.md` in Stephanie's voice with the top likely role questions, the standard interview coverage routes, and a `Frameworks To Keep Returning To` section.
9. Include the structured `## Cluely Router Source` section in `interview-guide.md`.
10. Generate a polished DOCX guide from `interview-guide.md` and visually verify it before delivery.
11. Run the Cluely skill against the guide source to generate derived Cluely artifacts.

Use `references/guide-workflow.md` for the full step-by-step workflow.

## Output Contract

Every role folder should contain:

- `job-description.md`
- `company-research.md`
- `story-fit-map.md`
- `interview-guide.md`
- A polished DOCX version of `interview-guide.md`
- Generated Cluely artifacts:
  - `cluely-answer-router.txt`
  - `cluely-mode-prompt.txt`
  - `cluely-retrieval-simulation.md`
  - `cluely-retrieval-results.json`
  - `cluely-route-debug.json`

The Cluely files are generated artifacts. Do not hand-edit them; update `interview-guide.md` instead and regenerate.

## Cluely Handoff

`interview-guide.md` must include this exact section heading:

`## Cluely Router Source`

Inside that section, use:

- `### ROUTING PRECEDENCE`
- `### ROUTE INDEX`
- One or more route blocks beginning with `### ROUTE ...`

Each route block must include:

- `ROUTE:`
- `SECTION:`
- `QUESTION:`
- `ANSWER TYPE:`
- `TRIGGERS:`
- `PRIMARY STORY:`
- `BACKUP STORIES:`
- `SCRIPT:`
- `CUES:`
- `SOURCE FACTS:`

Use `references/cluely-router-source-format.md` for the exact field rules and `assets/interview-guide-template.md` for the guide skeleton.

Use the route `ANSWER TYPE` to control the visible answer shape:

- `POSITIONING`: tell me about yourself, why company, why role, why leaving, next role, company overview. Direct natural bullets, no STAR.
- `FRAMEWORK_WITH_PROOF`: how-do-you-think questions such as prioritization, metrics, AI strategy, requirements, launch readiness, privacy, trust/safety, or product strategy. Framework first, then one proof-story hook; STAR only if the interviewer probes the story.
- `BEHAVIORAL_STORY`: tell-me-about-a-time, example, conflict, mistake, failure, stakeholder pushback, experiment, roadmap ownership, ambiguity, or leadership influence. STAR or natural STAR.
- `PRODUCT_DIAGNOSIS`: product critique, first logged-in experience, funnel diagnosis, or what would you improve. Observation, product judgment, recommendation, metric/guardrail.
- `PLAN`: first 30/60/90, first five experiments, or what would you do first. Phased/prioritized bullets, no STAR.
- `QUESTIONS_OR_CLOSE`: questions for interviewer and closing. Short direct bullets, no STAR.

Every answer router must include standard interview coverage, even when the role-specific package is deeply focused. Add dedicated or clearly covered routes for: tell me about yourself, why company, why role/fit, first 30/60/90 or getting started, prioritization/roadmap, stakeholder pushback, requirements/launch readiness, metrics, cross-functional alignment or conflict, failure/mistake/learning, ambiguity, leadership style or leadership influence, questions for them, and closing/final thoughts.

Generate Cluely artifacts with:

```bash
node /Users/stephanie/.codex/skills/cluely-interview-prep/scripts/cluely-prep.mjs \
  --source-guide "/absolute/path/to/interview-guide.md" \
  --output-dir "/absolute/path/to/role-folder"
```

## Quality Gates

- Always browse for current company research and include source links in `company-research.md`.
- Preserve Stephanie's memorized core narratives unless the role needs a targeted bridge.
- Use selected frameworks as thinking scaffolds, not generic filler answers. Stories remain the proof layer.
- Use story IDs exactly as they appear in `stories.yml`.
- Use framework IDs exactly as they appear in `assets/framework-bank.md` when adding framework cues.
- No invented metrics. Check against `approved-metrics.yml` and the story bank.
- Retired metrics must not appear: `$4,044`, `30% to 40%`, `77% to 95%`, or unqualified `95% satisfaction`.
- Scripts should sound speakable, warm, senior, specific, and natural. Default to 100 words max for the first answer, with expansion detail kept in cues/source facts for follow-up probes.
- Every route must include the correct `ANSWER TYPE`; do not force STAR across every route.
- Standard interview coverage must be present in every `## Cluely Router Source` section; do not ship a skinny role-only router that omits common behavioral, fit, first-90, questions-for-them, or close routes.
- For stakeholder-pushback questions about a requested feature not aligned with product strategy, map to `STORY_03_HEALTH_SUMMARY_REPORT` using the provider-portal request / Health Summary Report angle. Do not default to the broad platform rebuild, platform-transition weakness, coworker conflict, engineering pushback, or technical-debt story.
- Cluely validation must pass with every story ID found in the current story bank.

## Helper Script

Use the workspace helper to create role folders and catch missing router structure:

```bash
node /Users/stephanie/.codex/skills/interview-guide-builder/scripts/guide-workspace.mjs init \
  --company "Company" \
  --role "Role Title"

node /Users/stephanie/.codex/skills/interview-guide-builder/scripts/guide-workspace.mjs validate-router \
  --guide "/absolute/path/to/interview-guide.md"
```
