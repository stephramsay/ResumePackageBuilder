---
name: interview-story-bank
description: Build, maintain, and update Stephanie Ramsay's reusable interview story bank. Use when scanning career, resume, interview-prep, Cluely, cover-letter, role-package, DOCX, PDF, Markdown, text, spreadsheet, or downloaded job-prep files for interview stories; comparing new documents against an existing story bank; deciding whether a finding is a duplicate, new story, meaningful variation, new angle, or source-only evidence; generating master story-bank exports, question-to-story routers, candidate reports, discovery reports, and structured YAML updates.
---

# Interview Story Bank

## Operating Model

Use this skill to keep Stephanie's reusable interview stories clean, evidence-backed, and easy to reuse across roles. The default story bank repo is `/Users/stephanie/Documents/New project 4`; if the user gives another repo, use that path instead.

Default to review-first. Scan and classify new material, write a candidate report, and only update canonical story data after explicit approval unless the user asks for auto-add.

Never invent employers, titles, dates, metrics, tools, credentials, outcomes, or story details. If a claim is promising but weakly sourced, mark it `needs_review`.

## Quick Commands

Use the bundled script for deterministic setup, extraction, inventory, validation, and exports:

```bash
ruby ~/.codex/skills/interview-story-bank/scripts/story_bank.rb init --repo "/Users/stephanie/Documents/New project 4"
ruby ~/.codex/skills/interview-story-bank/scripts/story_bank.rb scan --repo "/Users/stephanie/Documents/New project 4" --input "/path/to/new/file-or-folder"
ruby ~/.codex/skills/interview-story-bank/scripts/story_bank.rb export --repo "/Users/stephanie/Documents/New project 4"
ruby ~/.codex/skills/interview-story-bank/scripts/story_bank.rb validate --repo "/Users/stephanie/Documents/New project 4"
```

Run `extract --input FILE` when you need raw text from DOCX, PDF, RTF, TXT, Markdown, JSON, YAML, HTML, CSV, or XLSX before semantic review.

## Workflow

1. Load the current bank: `story-bank/data/stories.yml`, `sources.yml`, `themes.yml`, and `question-routes.yml`.
2. Register the new source with path, SHA-256, size, modified time, extraction method, and relevance notes.
3. Extract text with `story_bank.rb extract` or `scan`; keep raw media as metadata only unless the user asks for transcription.
4. Compare candidates against existing stories using `references/classification-rules.md`.
5. Write a report in `story-bank/inbox/candidates/` with:
   - stories added or proposed
   - meaningful variations created or proposed
   - duplicates not added
   - new angles attached to existing stories
   - source-only evidence
   - uncertain items needing Stephanie review
   - plain-English reasoning for each decision
6. If approved, update `stories.yml`, `sources.yml`, and `question-routes.yml`, then run `export` and `validate`.

## Classification Contract

Use these exact labels:

- `new_story`: materially new situation, action, result, or lesson.
- `meaningful_variation`: same broad project but different angle, stakeholder, conflict, audience, metric, or lesson.
- `new_angle`: no new story, but useful new framing, question route, or role lens for an existing story.
- `duplicate`: same story and same usable angle; do not add.
- `source_only`: useful evidence or context, but not an interview story.
- `needs_review`: potentially useful but missing confidence, source detail, or Stephanie confirmation.

When in doubt, prefer `needs_review` over adding clutter.

## References

- Read `references/story-schema.md` before editing canonical data.
- Read `references/classification-rules.md` before comparing a new document to the bank.
- Read `references/report-format.md` before writing candidate or discovery reports.
