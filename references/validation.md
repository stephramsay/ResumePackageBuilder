# Validation

Use the CLI validator instead of visual inspection alone:

```bash
bash scripts/resume-package validate ~/Dev/resume_packages/[package-folder]
```

The validator writes:

```text
verification-summary.md
ats-parse-report.json
```

Required pass areas:

- Package directory and generated outputs are inside `~/Dev/resume_packages/[package-folder]/`.
- Landing page has Cover Letter, Resume, Operating Work, Leadership Style, PDF-only inline header, PDF-only bottom links, print button, the default GA4 Google tag, and explicit `page_title`, `page_location`, and `page_path` fields.
- Website PDF uses the long-page print layout, keeps links clickable, and excludes `Live Packet` unless explicitly requested.
- Resume and cover letter use Work Sans, `#004747`, and `#800040`.
- Resume and cover letter are single-column selectable text with no tables, drawings, text boxes, cards, icons, sidebars, or Enneagram/personality content.
- Resume has the exact `Read more about me:` label and exactly one role-specific hyperlink target. The ATS resume header excludes `stephanieramsay.com`; the `Read more about me:` line is the only allowed website reference in the ATS resume.
- Internal ATS parse report confirms DOCX section order, resume PDF page count, and job-keyword coverage.
- Final assets exclude em dashes.
- Final assets mention Stephanie's restaurant/front-of-house background only when the target JD explicitly concerns restaurants, restaurant technology, or true hospitality-industry work. Healthcare/patient-experience uses of `hospitality` or `guest services` do not qualify on their own.
- Claims and metrics are backed by `source_data/` and represented in `source-map.json`.
- Each work experience entry keeps a concise source-backed company/program description between the employer/date line and the title line.
- Senior-level QA confirms the current role avoids `Responsible for...`, the summary is specific, the top third has proof, current-role weight is strongest, older roles are shorter unless relevant, skills are not mostly basic tools, and bullet patterns are varied.
- Bullet QA confirms selected bullets within each role serve distinct task/function purposes and do not repeat the same discovery, requirements, rollout, implementation, governance, risk, platform, data, or reporting lane with different wording.
- Cover letter QA confirms the opening is specific and human, does not lead with location or authorization, includes a clear why-this-role rationale, avoids generic application phrases, uses conditional transition or hands-on positioning when needed, avoids `step down` and apologetic framing, and excludes unsupported location, citizenship, authorization, or company-size claims.
- Normal command output stays compact; use `--json`, `--verbose`, or direct file inspection only when full artifacts or debug payloads are explicitly needed.

If validation fails, fix the generator, source data, or `approved-content.json`; regenerate before publishing.
