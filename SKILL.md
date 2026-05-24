---
name: resume-package
description: Create, validate, preview, and publish Stephanie Ramsay role-specific resume packages from a job URL or pasted job description using the local resume_app_infra generator. Use for tailored landing pages, WordPress publishing, employer-ready resume DOCX/PDF files, cover letters, executive packet PDFs, package QA, or resume-package status reports.
---

# Resume Package

## Core Rule

Codex is the operator. The repo generator is the deterministic engine. Do not hand-author final HTML, DOCX, or PDF assets; change source data or generator code, then regenerate.

This packaged skill is self-contained. Resolve paths relative to this `SKILL.md`.

## Output Root and Token Discipline

Generated package assets must live under:

```text
~/Dev/resume_packages/[package-folder]/
```

Use that folder as the package root for `run-url`, `init`, `analyze`, `generate`, `validate`, `publish`, `status`, previews, run summaries, validation artifacts, ATS parse reports, source maps, approved content, screenshots, and temporary files. Do not write generated package outputs to the repo root, Downloads, Desktop, the current working directory, or scattered temp folders. If temporary files are required, place them under the package `tmp/` folder and clean them when safe:

```bash
bash scripts/resume-package tidy ~/Dev/resume_packages/[package-folder]
```

Normal command output must stay compact. Do not print full job descriptions, source YAML files, generated HTML, `approved-content.json`, `source-map.json`, validation artifacts, publishing payloads, or logs unless Stephanie explicitly requests verbose/debug output. Use `--json`, `--verbose`, or direct file inspection only for troubleshooting.

## Resume Skills Source

The resume skills section is populated from:

```text
assets/resume_app_infra/source_data/skill-bank.yml
```

Keep this file updated with Stephanie's current PM, healthcare, AI, technical, experience, leadership, execution, and GTM skill language. During package analysis, the generator scores the bank against the job description, inferred role context, required/preferred skills, company priorities, and role keywords; then it writes the most relevant grouped skill bullets to `approved-content.json` under `resume.skills`. Do not hand-edit generated resume skill text in DOCX/PDF/HTML outputs.

Keep this bank canonical and deduplicated. Consolidate near-identical skill phrases into reusable skills, and deprioritize basic tools such as Jira, Confluence, SQL, YAML, Agile, and Scrum unless the target job explicitly requires them. The analyzer must prefilter and score relevant skills instead of sending or copying the full skill bank into every generated output.

Restaurant/front-of-house experience is a narrow source fact, not a general experience-positioning shortcut. Do not mention Stephanie's `10 years of frontline restaurant experience`, restaurants, host/waitress work, or front-of-house restaurant background unless the target JD explicitly concerns restaurants, restaurant technology, or a true hospitality-industry role such as hotels, lodging, reservations, or hospitality software. Healthcare, patient experience, guest services, or service-excellence JDs that merely use the word `hospitality` are not enough. For those roles, use transferable language such as service recovery, customer/patient experience, workflow research, empathy, access, communication, and operational design without referencing restaurant tenure.

## Role Bullet Source

Bullets under each resume role are selected from the baseline role facts plus this role-specific bank:

```text
assets/resume_app_infra/source_data/role-bullet-bank.yml
```

Keep this file updated with richer baseline bullets for Kannact, Starlight, and University of California, San Francisco. During package analysis, the generator merges these bullets into the source claim pool, infers matching tags, scores them against the job description, and selects the strongest bullets per role. The selected bullets may be lightly tailored by modifying source data or generator logic, then regenerating; do not hand-edit final DOCX/PDF/HTML outputs.

Treat `resume-facts.yml` as the canonical factual source. Treat `role-bullet-bank.yml` as phrasing support and role-specific expansion, not a duplicate fact source. Deduplicate or down-rank near-identical claims before generation, and do not include duplicate or near-duplicate bullets across roles or source files.

Every selected resume bullet must be uniquely distinct. Scan role bullets across all roles before final generation, and do not include bullets with the same or materially similar information, proof point, metric, or outcome. Shared metrics may appear in only one role and one bullet. The `96% participant satisfaction` and `NPS of 82` outcome belongs only under Kannact, and it may appear in only one Kannact bullet.

Every selected bullet must also serve a clear task/function purpose. Avoid stacking bullets that all say some version of `map workflows`, `surface needs`, `translate requirements`, `coordinate rollout`, or `execute cross-functionally`. For each role, the selected bullets should cover distinct lanes such as discovery/VOC, roadmap, AI capacity, intake/access, billing, implementation playbooks, partner rollout, executive governance, risk escalation, platform rebuild, data interoperability, or reporting. Validation must fail when selected bullets within a role repeat the same purpose family or have high wording overlap.

Preserve the one-line company/program description under each employer name and above the title line:

```text
Employer • Dates
Company/program description
Title
Bullets
```

These descriptions explain company context, business model, care model, population, or scale. Keep them concise, source-backed, and one line when possible. Do not remove them to save tokens, and do not invent new company facts.

Default to including Starlight's `70%` intake conversion proof point in the Starlight bucket unless it is clearly irrelevant to the target JD or would crowd out materially stronger, role-critical Starlight evidence. Use the strongest role-fit language for the JD: `referral-to-enrollment conversion` for clinical access, enrollment, or intake roles; `activation` for onboarding, activation, adoption, or growth roles; and `referral-to-conversion` only when broader funnel language fits best. Keep the metric attached to Starlight and do not move it to Kannact or UCSF.

Impact metric cards on landing pages must use numeric-only large/bold values. Do not put words such as `doubled` in the large metric slot; render that as `2X`. Do not duplicate the same metric in both the large value and smaller card description. For range changes, put the calculated lift in the large metric slot and the before/after change in smaller text, for example `76% to 84%` should render as `11%` with supporting text that notes the app satisfaction change from `76% to 84%`.

The deterministic generator is bundled at:

```text
assets/resume_app_infra/
```

If dependencies are missing, run once:

```bash
bash scripts/setup-engine
```

## Normal Invocation

User-facing usage is just a job URL:

```text
$resume-package https://example.com/job
/resume-package https://example.com/job
resume package https://example.com/job
```

Do not ask the user for company, role, or route name when a public URL is provided. Infer them. The local folder and WordPress route are internal implementation details until the final status report.

## One-Command Workflow

For a normal URL request, run the full lifecycle and publish live after validation:

```bash
RESUME_PACKAGE_ENABLE_PUBLISH=1 bash scripts/resume-package run-url "[Job URL]"
```

This command creates `~/Dev/resume_packages/[inferred-package-name]/`, analyzes the role, generates all assets, validates them, publishes `index.html` to WordPress, verifies the public URL, writes `run-summary.json`, and prints the final completion block.

Before creating anything, the command checks existing package folders for the same normalized job URL, ignoring tracking parameters like `utm_*`. If the job already exists, it stops and reports the existing package in non-interactive Codex runs. Ask the user whether to reuse it or create a new package. Use `--reuse-existing` to print the existing status, or `--force-new` only if the user explicitly wants a fresh package.

Use dry local generation only when the user explicitly asks not to publish:

```bash
bash scripts/resume-package run-url "[Job URL]" --no-publish
```

If URL intake is blocked or incomplete, the command stops before creating a package so blocked pages do not create bogus output folders. Recover the full description manually if possible, then continue with the manual workflow in `references/job-intake.md`.

## Final Response

After every successful run, relay the clean completion block from:

```bash
bash scripts/resume-package status ~/Dev/resume_packages/[package-folder]
```

The final response must include the live WordPress URL, package folder, validation result, publish verification, ATS keyword coverage, and generated file paths. If publishing failed or was skipped, say that directly.

## References

- For validation rules and ATS QA: `references/validation.md`
- For WordPress/SFTP behavior: `references/publishing.md`
- For blocked job boards or manual intake recovery: `references/job-intake.md`

## Principal-Level Resume Quality Rules

- Write the resume for senior hiring leaders, not only ATS bots or HR screeners.
- The top third must quickly signal operating level, scope, measurable impact, and product leadership.
- Avoid generic AI-sounding summaries, `Responsible for...` bullets, and repetitive verb-noun-metric patterns.
- Use metrics naturally and selectively, with the strongest numbers above the fold.
- Give the current Starlight role the most strategic weight and space; keep older roles shorter unless unusually relevant.
- Prioritize senior product, healthcare, AI, leadership, operating model, execution, and GTM skills over basic tools unless the JD requires them.
- Bullets should signal judgment, ownership, operating complexity, cross-functional influence, business impact, product strategy, and systems thinking.
- Preserve one-line company/program descriptions under each employer when present.

## Cover Letter Voice and Strategy Rules

- Make the cover letter sound natural, warm, grounded, and slightly off the cuff, not stiff, corporate, over-polished, or AI-written.
- Open with the real reason the role matters, tied to the company and work. Avoid generic phrases such as `I am excited to apply`, `my background aligns perfectly`, and `results-driven leader`.
- Show Stephanie's strengths without repeating the resume: product leadership, healthcare workflow design, patient experience, AI-enabled operations, user research, systems thinking, GTM/partner execution, and cross-functional delivery.
- Connect the role to Stephanie's actual passions: modernizing healthcare, improving patient and care team experiences, practical AI workflows, and making complex systems feel more human.
- Do not open with location, citizenship, or work authorization unless the JD explicitly requires it or it is a likely gating concern. Use `contact.yml` for location in headers/contact blocks only, and never invent citizenship or authorization.
- If the target role is meaningfully different, include one short confident bridge explaining why the move is intentional, why now, and how Stephanie's product, healthcare, AI, workflow, operations, GTM, partner, or mission-driven experience transfers.
- For Senior PM, Lead PM, Staff PM, Principal PM, IC product, product operations, implementation, solutions, strategy, or execution-heavy roles, add a concise hands-on positioning bridge only when useful.
- Frame hands-on positioning as intentional focus, not title regression. Do not use `step down`, sound apologetic, imply Stephanie is leaving product, or over-explain.

## Critical Constraints

- Live WordPress publish is part of normal `$resume-package [URL]` delivery unless the user explicitly says not to publish.
- Validation must pass before calling a package complete.
- Final assets must not invent employers, roles, dates, tools, credentials, metrics, or unsupported claims.
- Do not mention Stephanie's `10 years of frontline restaurant experience`, restaurant tenure, host/waitress work, or front-of-house restaurant background unless the target JD explicitly concerns restaurants, restaurant technology, or a true hospitality-industry role. Healthcare/patient-experience uses of `hospitality` or `guest services` do not qualify on their own.
- Do not repeat the same or similar bullet information across roles. Each selected role bullet must carry a distinct claim, metric, or proof point.
- Keep `96% participant satisfaction` and `NPS of 82` only under Kannact, and only in one bullet.
- Landing-page metric cards must show only numeric values in the large/bold slot, avoid repeated metrics inside the same card, and convert before/after ranges to percentage lift when used as the headline value.
- Resume and cover letter must be single-column selectable text with no tables, drawings, text boxes, cards, icons, sidebars, or Enneagram/personality content.
- Resume must include exact `Read more about me:` label, with only the URL hyperlinked. Do not include `stephanieramsay.com` or Stephanie's portfolio URL in the ATS resume header; the `Read more about me:` line is the only allowed website reference in the ATS resume.
- Keep `Chief Experience Officer` exact. Keep Kannact title exact as `VP of Product & Patient Experience`. Keep Starlight and Kannact separate. Keep Starlight location as `Remote`, Kannact location as `Remote`, and University of California, San Francisco location as `San Francisco, CA`. Render UCSF as `University of California, San Francisco`.
