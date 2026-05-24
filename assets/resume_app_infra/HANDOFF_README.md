# Resume App Infra Handoff

This folder is the local handoff package for engineers building the resume / portfolio generation app.

## Start Here

Read `product-requirements-doc.md` first. It defines the app workflow, required outputs, formatting rules, PDF requirements, WordPress publishing behavior, validation checks, and storage model.

## Canonical Source Materials

Use `source_materials/` for source-of-truth content:

- `source_materials/StephanieRamsayCV2026April - BASELINE RESUME.pdf`
  - Master resume source of truth for facts, dates, metrics, role history, and claims.
- `source_materials/Interview_Prep_GetWell_RhythmX_v2.docx`
- `source_materials/Interview_Prep_GetWell_RhythmX_v2.txt`
  - Current interview prep, story, voice, content, and framing source.
  - The app should allow this to be updated over time.
- `source_materials/README.md`
  - Source usage rules.
- `source_materials/PUBLISHING.md`
  - WordPress / SFTP publishing notes.

## Perfect Examples

Use `structure_example/` as the golden reference set:

- ATS resume:
  - `structure_example/Stephanie_Ramsay_Ceribell_Senior_Product_Manager_ATS_Resume copy.docx`
  - `structure_example/Stephanie_Ramsay_Ceribell_Senior_Product_Manager_ATS_Resume copy.pdf`
- Standalone cover letter:
  - `structure_example/Stephanie_Ramsay_Ceribell_Senior_Product_Manager_Cover_Letter copy.docx`
  - `structure_example/Stephanie_Ramsay_Ceribell_Senior_Product_Manager_Cover_Letter copy.pdf`
- Landing page / website:
  - `structure_example/Stephanie_Ramsay_Ceribell_Senior_Product_Manager_Executive_Packet copy.html`
- Website PDF / executive packet PDF:
  - `structure_example/Stephanie_Ramsay_Ceribell_Senior_Product_Manager_Executive_Packet copy.pdf`

Live reference landing page:

`https://stephanieramsay.com/ceribell/`

## Required Assets Per Role

Each generated role package should include:

- Job description source.
- Strategic alignment brief.
- Landing page HTML.
- Website PDF / executive packet PDF.
- ATS resume DOCX and PDF.
- Standalone cover letter DOCX and PDF.
- Verification summary.
- ATS parse report.
- Publishing status and run summary when published through the CLI.

All assets for a role should be stored together in one role-specific folder, for example:

```text
~/Dev/resume_packages/[package-folder]/
```

The normal end-to-end command is:

```bash
RESUME_PACKAGE_ENABLE_PUBLISH=1 npm run resume-package -- run-url "[Job URL]"
```

`run-url` checks existing package folders for the same normalized job URL before creating anything. It ignores tracking parameters such as `utm_*`. Use `--reuse-existing` to print the existing package status, or `--force-new` when a fresh package is intentionally needed.

For local generation without WordPress publishing:

```bash
npm run resume-package -- run-url "[Job URL]" --no-publish
```

## PDF Requirements

The website PDF / executive packet PDF must:

- Match the Ceribell website PDF example in `structure_example/`.
- Preserve the landing page visual style.
- Export as one long continuous page where possible.
- Keep links clickable.
- Include the PDF-only inline header and bottom links.
- Exclude web-only navigation and print controls.
- Exclude any `Live Packet` button or text unless explicitly requested.

The ATS resume and cover letter PDFs must:

- Use Work Sans.
- Use `#004747` for headers/titles.
- Use `#800040` for accent lines.
- Keep simple, selectable, single-column text.
- Avoid tables, icons, cards, sidebars, decorative elements, and text boxes.

The ATS resume must include the exact `Read more about me:` line behavior described in the PRD.
