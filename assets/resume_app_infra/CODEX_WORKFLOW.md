# Codex Workflow: Resume Package

Use this workflow when Stephanie asks Codex to create, revise, validate, preview, or publish a role-specific resume package.

Codex is the operator. The local generator owns structure, formatting, filenames, PDFs, DOCX files, validation, preview, and publishing.

## Required Banner

When the resume-package skill is triggered inside Codex, the first visible assistant message must show the RESUME PACKAGE ASCII banner before any tool calls or work updates. The CLI prints an ANSI banner too, but Codex users may not see command output.

## Normal URL Run

For a standard job URL request, run the whole lifecycle and publish live:

```bash
RESUME_PACKAGE_ENABLE_PUBLISH=1 npm run resume-package -- run-url "[Job URL]"
```

This command:

1. Fetches the job posting.
2. Checks `~/Dev/resume_packages/` for an existing package with the same normalized job URL.
3. Infers company, role, local package folder, and WordPress route.
4. Writes the package under `~/Dev/resume_packages/`.
5. Generates `strategic-alignment.md`, `approved-content.json`, and `source-map.json`.
6. Generates the landing page, website PDF, ATS resume DOCX/PDF, and cover letter DOCX/PDF.
7. Validates all outputs.
8. Publishes `index.html` to WordPress.
9. Verifies the live URL.
10. Writes `verification-summary.md`, `ats-parse-report.json`, `publishing-status.json`, and `run-summary.json`.
11. Prints a clean completion report.

If the job URL has already been used, non-interactive Codex runs stop before creating or publishing anything and report the existing package. Ask the user whether to reuse the existing package or create a new one.

Reuse the existing package:

```bash
npm run resume-package -- run-url "[Job URL]" --reuse-existing
```

Create a new package anyway:

```bash
RESUME_PACKAGE_ENABLE_PUBLISH=1 npm run resume-package -- run-url "[Job URL]" --force-new
```

Use local generation without publishing only when the user explicitly requests it:

```bash
npm run resume-package -- run-url "[Job URL]" --no-publish
```

## Existing Package Status

Print the clean completion block for an existing package:

```bash
npm run resume-package -- status ~/Dev/resume_packages/[package-folder]
```

The final user-facing answer should include the live URL, validation result, publish verification, ATS keyword coverage, package folder, and generated file paths.

## Manual Recovery

Some job boards return blocked, login, or short pages. If `run-url` stops after intake, inspect:

```text
~/Dev/resume_packages/[package-folder]/job-description.txt
~/Dev/resume_packages/[package-folder]/input.yml
```

Replace `job-description.txt` with the full job description, update missing company/role metadata if needed, then run:

```bash
npm run resume-package -- analyze ~/Dev/resume_packages/[package-folder]
npm run resume-package -- generate ~/Dev/resume_packages/[package-folder]
npm run resume-package -- validate ~/Dev/resume_packages/[package-folder]
RESUME_PACKAGE_ENABLE_PUBLISH=1 npm run resume-package -- publish ~/Dev/resume_packages/[package-folder] --execute
npm run resume-package -- status ~/Dev/resume_packages/[package-folder]
```

## Confirmed Inferred Bullets

Use this only when existing source claims are not enough to match the job description. Examples: the generated resume has too few distinct bullets for a major role, one employer dominates without a strong JD reason, required JD themes are uncovered, or the selected bullets repeat the same proof point.

Workflow:

1. Review the rendered ATS resume, `approved-content.json`, `source-map.json`, `strategic-alignment.md`, `job-description.txt`, `source_data/resume-facts.yml`, `source_data/role-bullet-bank.yml`, and relevant files in `source_materials/`.
2. Draft candidate bullets as hypotheses, not facts. Each candidate must include the proposed bullet, likely role/employer, JD theme it supports, source material or reasoning that suggested it, and any metric/tool/compliance detail requiring confirmation.
3. Ask Stephanie to confirm, reject, or edit each candidate before the bullet enters source data.
4. Add only confirmed bullets to `source_data/role-bullet-bank.yml` or durable baseline claims in `source_data/resume-facts.yml`. Add new metrics to `source_data/approved-metrics.yml` only after Stephanie confirms exact values and allowed wording.
5. Rerun analyze/generate/validate. Before publishing, inspect the rendered ATS resume bullets for role balance, non-duplication, and intentional coverage.

Do not write inferred, unconfirmed claims into `approved-content.json`, final HTML, DOCX, PDF, or published WordPress output.

## Bullet Count and Balance

Each major resume experience/category section should include 4-7 bullets depending on JD relevance and confirmed experience depth. Exception: University of California, San Francisco should include only 1-2 bullets because it is earlier supporting experience, not a full-depth recent role. The goal is not mechanical equality; it is enough evidence to be credible without filler.

Rules:

1. Use 4 bullets for a concise section when the role is secondary or only four strong distinct claims are confirmed.
2. Use 5-7 bullets when the role has multiple distinct, JD-relevant claims with confirmed data, scope, tools, outcomes, stakeholder complexity, or business impact.
3. Use 1-2 bullets for University of California, San Francisco, choosing only the most JD-relevant proof points and strongest metrics. Do not trigger the inferred bullet workflow just to bring UCSF above 2 bullets.
4. Do not add filler to hit a count. Each bullet must add a new proof point, metric, decision, product surface, audience, workflow, or outcome.
5. If a JD-important non-UCSF section has fewer than 4 strong bullets, trigger the confirmed inferred bullet workflow and ask Stephanie to confirm plausible missing claims or metrics.
6. If a non-UCSF section exceeds 7 bullets, cut the least relevant, least quantified, or most duplicative bullets first. If UCSF exceeds 2 bullets, cut to the strongest 1-2 bullets.
7. Review the rendered ATS resume before validation to confirm each non-UCSF role/category falls within the 4-7 range and UCSF falls within the 1-2 range unless there is an explicit user-approved exception.

## Metric-First Resume Bullets

Before final generation or publishing, scan every selected resume bullet and ask: could this reasonably include data? Data includes outcome metrics, scale, adoption, conversion, satisfaction, retention, revenue, cost, time saved, efficiency, throughput, cycle time, error reduction, user count, partner count, release count, program size, or before/after change.

Rules:

1. Prefer confirmed quantified bullets over similar qualitative bullets when they are relevant and distinct.
2. If a bullet is strong but missing an obvious metric, ask Stephanie for the data before final generation or publishing.
3. The confirmation question should include the draft bullet, the missing data needed, and examples of acceptable answers such as percent lift, count, time saved, before/after, scale, or business outcome.
4. Do not invent or estimate numbers. Treat unconfirmed metrics as hypotheses until Stephanie confirms exact values and allowed wording.
5. Add new confirmed metrics to `source_data/approved-metrics.yml` before using them, then regenerate so metrics appear in `source-map.json`.
6. Avoid reusing the same metric across multiple bullets unless Stephanie explicitly confirms that repetition is intentional.
7. If Stephanie does not know the data, use the strongest confirmed qualitative bullet or choose a different distinct quantified bullet when available.

## Publishing

Publishing target:

```text
Remote: /htdocs/[package-folder]/index.html
Public: https://stephanieramsay.com/[package-folder]/
Host: ssh.wp.com
Username: stephanieramsay.wordpress.com
```

Publishing validates first, uploads `index.html`, verifies the public URL, and records status in `publishing-status.json`.

Dry-run publishing is only for explicit preflight requests:

```bash
npm run resume-package -- publish ~/Dev/resume_packages/[package-folder]
```

Never write passwords, private keys, tokens, or temporary credentials to repo files, generated package files, prompts, logs, or summaries.

## Validation

Validation must pass before delivery:

```bash
npm run resume-package -- validate ~/Dev/resume_packages/[package-folder]
```

Critical checks:

- Landing page has Cover Letter, Resume, Operating Work, Leadership Style, PDF-only header/footer links, and print button.
- Website PDF has long-page print layout and clickable links.
- ATS resume and cover letter use Work Sans, `#004747`, and `#800040`.
- ATS resume and cover letter have selectable single-column text with no tables, drawings, text boxes, cards, icons, sidebars, or Enneagram/personality content.
- ATS resume and cover letter headers exclude `stephanieramsay.com` and Stephanie's portfolio URL.
- ATS resume includes exact `Read more about me:` label and only the role URL is hyperlinked. The `Read more about me` URL is the only allowed `stephanieramsay.com` reference in the ATS resume.
- ATS parse report confirms text extraction, section order, page count, exact hyperlink target, and job-keyword coverage.
- Generated assets exclude `Live Packet` unless explicitly requested and exclude em dashes.
- `Chief Experience Officer` is exact; Starlight and Kannact remain separate; UCSF renders as `University of California, San Francisco`.
- Metrics and claims come from `source_data/` and appear in `source-map.json`.
- Inferred bullets, when needed, were confirmed by Stephanie before entering source data.
- Bullets include confirmed data wherever possible; any obvious missing metrics were asked about before final generation or publishing.
- Major resume experience/category sections use 4-7 intentional bullets based on relevance and confirmed experience depth, with no filler; University of California, San Francisco uses only 1-2 bullets.
