# Product Requirements Document: Living Portfolio Application

## 1. Product Summary

The Living Portfolio application helps Stephanie Ramsay turn a comprehensive career source archive, a fact-based master resume, and a target job description into a tailored application package.

For each role, the app should analyze the job description, map the strongest alignment between the role and Stephanie's actual experience, then generate a consistent set of assets stored together in one role-specific folder:

1. A role-specific landing page hosted on `stephanieramsay.com`.
2. A PDF version of the website, also referred to as the designed executive packet PDF.
3. A standalone ATS-friendly resume.
4. A standalone tailored cover letter.

The app replaces the current manual Codex workflow captured in the repo prompts and scripts with a repeatable product experience.

## 2. Source Context

This PRD is based on the current project files in `/Users/stephanie/Dev/resume_portfolio`, especially:

- `source_materials/README.md`
- `codex-prompts/job-landing-page-input-template.md`
- `codex-prompts/job-landing-page-master-prompt.md`
- `PUBLISHING.md`
- Canonical examples in `structure_example/`
- Existing generated examples in `output/` and `documents/`
- Existing build scripts in `scripts/`

Current reusable source materials:

- Master resume source of truth:
  - `source_materials/StephanieRamsayCV2026April - BASELINE RESUME.pdf`
  - This file is the master copy for resume facts and should replace older resume source files as the canonical baseline.
- Interview prep and voice source:
  - `source_materials/Interview_Prep_GetWell_RhythmX_v2.docx`
  - `source_materials/Interview_Prep_GetWell_RhythmX_v2.txt`
  - This should evolve into an editable master interview prep list that acts as the source of truth for content, stories, examples, prep, voice, and framing.

Canonical perfect examples:

- `structure_example/Stephanie_Ramsay_Ceribell_Senior_Product_Manager_ATS_Resume copy.docx`
- `structure_example/Stephanie_Ramsay_Ceribell_Senior_Product_Manager_ATS_Resume copy.pdf`
- `structure_example/Stephanie_Ramsay_Ceribell_Senior_Product_Manager_Cover_Letter copy.docx`
- `structure_example/Stephanie_Ramsay_Ceribell_Senior_Product_Manager_Cover_Letter copy.pdf`
- `structure_example/Stephanie_Ramsay_Ceribell_Senior_Product_Manager_Executive_Packet copy.html`
- `structure_example/Stephanie_Ramsay_Ceribell_Senior_Product_Manager_Executive_Packet copy.pdf`

The Ceribell landing page example is live at:

`https://stephanieramsay.com/ceribell/`

The app should support replacing or adding newer source files over time.

## 3. Problem

Stephanie has a large body of reusable career material: work history, interview answers, leadership narratives, project examples, proof points, metrics, positioning language, and generated role-specific assets. The current process depends on manually pasting prompts, referencing files, tailoring content, generating documents, exporting PDFs, and publishing static pages.

This creates several problems:

- The source material is rich but hard to navigate quickly.
- Tailoring each application requires repeated manual setup.
- Formatting requirements are specific and easy to miss.
- Resume, cover letter, landing page, and executive packet outputs must stay coordinated.
- The WordPress publishing step is manual.
- Quality checks are scattered across prompts and scripts.

## 4. Goals

The app should:

- Maintain a comprehensive living portfolio archive.
- Maintain a fact bank resume that acts as the source of truth for dates, roles, metrics, tools, and claims.
- Maintain an editable master interview prep list that acts as the source of truth for stories, examples, positioning, content, prep, and framing.
- Accept a job description and optional role notes.
- Identify the strongest strategic fit between Stephanie's experience and the target role.
- Recommend positioning, themes, proof points, metrics, keywords, and potential concerns to address.
- Generate a role-specific landing page, website PDF / designed executive packet PDF, ATS resume, and cover letter.
- Enforce Stephanie's required formatting and content rules.
- Publish the landing page to WordPress under a role-specific URL slug.
- Store all assets for one role together in one role-specific package folder.
- Preserve factual accuracy and avoid invented metrics, employers, titles, dates, certifications, or tools.

## 5. Non-Goals

The MVP should not:

- Apply to jobs automatically.
- Scrape private job boards that require authentication.
- Invent experience, credentials, or metrics.
- Replace Stephanie's final review before using materials.
- Manage recruiter follow-up sequences beyond generating optional outreach copy.
- Become a generic resume builder for multiple users.

## 6. Primary User

Primary user:

- Stephanie Ramsay, creating tailored application materials for executive, product, operations, healthcare AI, strategy, BizOps, Chief of Staff, and related roles.

Secondary users:

- Future collaborators helping Stephanie maintain, review, or extend the portfolio system.

## 7. Core Workflow

1. Stephanie opens the app and selects "Create role package."
2. Stephanie enters or pastes:
   - Company name
   - Role title
   - Full job description
   - Desired URL slug
   - Optional notes about why she is interested
   - Optional experience, stories, metrics, or positioning to emphasize
   - Whether to publish to WordPress
3. The app analyzes the job description.
4. The app maps the role to Stephanie's source material.
5. The app proposes a strategic alignment brief.
6. Stephanie reviews or edits the proposed positioning.
7. The app generates:
   - Landing page HTML
   - Website PDF / designed executive packet PDF
   - ATS resume DOCX, HTML, and PDF as supported
   - Cover letter DOCX, HTML, and PDF as supported
8. The app stores all generated assets in one role-specific folder.
9. The app validates outputs against formatting, content, and link requirements.
10. Stephanie approves publishing.
11. The app uploads the landing page to WordPress.
12. The app stores the final package and a verification summary.

## 8. Inputs

### Required Inputs

- Company name
- Role title
- Full job description
- Desired URL slug

### Optional Inputs

- Company motivation notes
- Relevant experience to emphasize
- Stories or metrics to include
- Stories or metrics to avoid
- Tone and positioning notes
- Sections to add, remove, or prioritize
- ATS keywords or skills to emphasize
- Cover letter notes
- Existing example page or PDF to match
- Publishing preference
- Temporary SFTP password when publishing is requested

### Default Inputs

If Stephanie does not provide updated sources, the app should use:

- Master resume: `source_materials/StephanieRamsayCV2026April - BASELINE RESUME.pdf`
- Searchable resume companion: extracted text from `source_materials/StephanieRamsayCV2026April - BASELINE RESUME.pdf`
- Interview and voice source: `source_materials/Interview_Prep_GetWell_RhythmX_v2.docx`
- Searchable interview companion: `source_materials/Interview_Prep_GetWell_RhythmX_v2.txt`
- Perfect example set: `structure_example/`

## 9. Source Library Requirements

The app must support a structured source library with these content types:

- Master resume fact bank
- Comprehensive portfolio archive
- Interview questions and answers
- Leadership narratives
- Project stories
- Metrics and proof points
- Role history and date rules
- Voice and tone examples
- Existing generated assets
- Canonical perfect examples from `structure_example/`
- Formatting and design rules
- Publishing configuration

Each source item should have metadata:

- Title
- File type
- Source category
- Date added
- Canonical or supporting status
- Tags, such as healthcare AI, CEO-side operations, product strategy, UCSF, Starlight, Kannact, GTM, care model design
- Extracted text
- Related outputs where used

## 10. Job Description Analysis Requirements

For each job description, the app should identify:

- Job archetype, such as Chief of Staff, Strategy and Ops, BizOps, CEO Office, COO-style operator, GTM strategy, partnerships, product strategy, implementation, or healthcare AI operations.
- Company priorities.
- Required and preferred skills.
- Role-specific language and keywords.
- Hiring-manager concerns or gaps to address.
- Strongest experience matches.
- Proof points that belong in the executive packet.
- Proof points that belong in the ATS resume.
- Company-specific motivation that belongs in the cover letter.

The analysis must not copy large chunks of the job description. It should reuse only concise, relevant vocabulary.

## 11. Strategic Alignment Requirements

The app should produce a strategic alignment brief before generating final assets.

The brief should include:

- Recommended positioning headline.
- Role fit thesis.
- Top 5 matching experience signals.
- Top 5 proof points or metrics.
- Keywords to include naturally.
- Potential concern and how to address it.
- Recommended landing page slug.
- Recommended asset filenames.
- Recommended sections to prioritize.

The user should be able to edit this brief before asset generation.

## 12. Required Positioning Rules

The app must preserve these positioning rules:

- Use Stephanie's current/default title exactly as `Chief Experience Officer` wherever a title is shown.
- Do not append descriptors to the title.
- Describe broader scope in summaries, bullets, and narrative sections.
- Position Stephanie as a healthcare AI operator, CEO-side or founder-side strategic partner, and strategy/operations leader when relevant to the role.
- Do not position her as a product person trying to move into strategy or operations.
- Keep Starlight and Kannact separated as distinct roles unless Stephanie explicitly chooses otherwise.
- Use warm, direct, strategic, human language.
- Avoid generic corporate phrasing and inflated claims.
- Do not use em dashes in final generated assets.

## 13. Canonical Experience Rules

### Starlight

Emphasize when relevant:

- CEO-side operating partner.
- Acting COO-style work.
- Company pivot into a virtual clinic model.
- New market expansion.
- Operating model design.
- Strategic direction translated into operating plans.
- Staffing, role design, and hiring profiles.
- Cross-functional execution.
- Health system partner implementation.
- Clinical strategy, GTM, and sales support.
- AI-powered documentation and medical record summarization.
- Intake, eligibility, billing, RPM, CCM, E/M, post-discharge, and ambulatory workflows.

### Kannact

Emphasize when relevant:

- Platform rebuild.
- Care management infrastructure.
- Omnichannel engagement.
- Clinical outcomes.
- Operational efficiency.
- Partner-ready and configurable deployment.
- FHIR and interoperability foundations when relevant.

### UCSF

For any resume, landing page, or executive packet that includes UCSF experience, use:

- Employer: `University of California, San Francisco`
- Overall tenure: `Aug 2018 - Oct 2021` or `3 yrs 3 mos`
- Location: `San Francisco Bay Area`
- Role 1: `Business Analyst / Product Owner`
  - Employment type: `Full-time`
  - Dates: `Oct 2019 - Oct 2021`
  - Duration: `2 yrs 1 mo`
- Role 2: `Clinical Research Coordinator`
  - Dates: `Aug 2018 - Oct 2019`
  - Duration: `1 yr 3 mos`

Preserve this proof point when relevant:

`I led the makeover of a digital breast cancer prevention program, driving a UX/UI redesign, brand refresh, and overall improved patient experience.`

Use `The WISDOM Study` as program context or bullet context, not as the employer name.

## 14. Metric Rules

The app may use known real metrics when relevant, including:

- 50% documentation time reduction.
- 20% care capacity increase.
- 70% referral-to-conversion.
- Net churn below 2% from the omnichannel coach-led campaign.
- Doubled activation rates from the omnichannel coach-led campaign.
- 96% participant satisfaction.
- NPS 82.
- 3x scheduling efficiency increase from centralized scheduling and patient reminder infrastructure.
- Appointment no-shows cut in half from centralized scheduling and patient reminder infrastructure.
- Tech support cases reduced by over 80% from the mobile app rebuild.
- Exceeded national HEDIS benchmarks.
- Up to $7,000 total annual cost savings per patient across tracked HEDIS measures.
- UCSF 42% enrollment conversion improvement.
- UCSF 93% time-to-activation reduction.
- UCSF 30+ releases.

The app must not create new metrics unless the user adds them to the source library.

## 15. Output 1: Role-Specific Landing Page

The app must create a static HTML landing page for each role.

The canonical landing page structure and visual reference is the Ceribell example:

- Local perfect example: `structure_example/Stephanie_Ramsay_Ceribell_Senior_Product_Manager_Executive_Packet copy.html`
- Live example: `https://stephanieramsay.com/ceribell/`

Required structure:

1. Top hero or packet header.
2. Navigation pills:
   - Cover Letter
   - Resume
   - Operating Work
   - Leadership Style
3. Cover letter section immediately after the header.
4. Side positioning panel on the live page.
5. Executive resume section.
6. Selected operating work section.
7. Education section.
8. Core competencies section.
9. Leadership style and Enneagram section.
10. PDF-only bottom links section.
11. Print button visible on web and hidden in PDF.

The landing page must not include a "Live Packet" button or "Live Packet" text unless Stephanie explicitly requests it.

### Landing Page Design System

The app should preserve the current visual system from existing examples:

- Modern executive application brief.
- Soft high-end background using layered radial gradients and a light diagonal gradient.
- White or translucent page cards with subtle borders and soft shadows.
- Rounded corners around 20 to 28px on screen.
- Strong navy typography.
- Gold uppercase section kickers.
- Self-contained CSS.
- No external dependencies, external fonts, icon libraries, or image assets.

Primary CSS variables:

- `--ink: #071724`
- `--navy: #0c3046`
- `--slate: #445264`
- `--muted: #6b7685`
- `--line: #d8e1e7`
- `--mist: #e8f5f1`
- `--mint: #d7ebe5`
- `--blush: #f7e7e1`
- `--paper: #fbfaf7`
- `--white: #ffffff`
- `--gold: #b9823f`
- `--shadow: 0 24px 70px rgba(7, 23, 36, 0.12)`

System font stack:

`Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif`

## 16. Output 2: Website PDF / Designed Executive Packet PDF

The app must export the landing page to a PDF version of the website. This is also the designed executive packet PDF.

The canonical website PDF reference is:

`structure_example/Stephanie_Ramsay_Ceribell_Senior_Product_Manager_Executive_Packet copy.pdf`

Requirements:

- Preserve the landing page visual style.
- Export as one long continuous PDF page where possible.
- Use Chrome headless or an equivalent reliable print renderer.
- Use `@page { size: 8.5in 80in; margin: 0.22in; }`.
- Use `-webkit-print-color-adjust: exact; print-color-adjust: exact;`.
- Hide navigation and print actions in PDF.
- Hide the web packet header in PDF.
- Show a PDF-only inline header before the cover letter.
- Hide the web side panel in PDF.
- Show PDF-only bottom links.
- Keep links clickable.
- Do not include "Live Packet" unless explicitly requested.

Verification should confirm:

- PDF exists.
- Expected page count.
- Clickable links exist.
- Company, role, Starlight, Kannact, and Type 7 are present when expected.
- "Live Packet" is absent unless explicitly requested.
- Text order begins with Stephanie Ramsay, then cover letter, then greeting.

## 17. Output 3: ATS-Friendly Resume

The app must create a standalone ATS resume for every role package.

Canonical ATS resume examples:

- `structure_example/Stephanie_Ramsay_Ceribell_Senior_Product_Manager_ATS_Resume copy.docx`
- `structure_example/Stephanie_Ramsay_Ceribell_Senior_Product_Manager_ATS_Resume copy.pdf`

Required format:

- Simple single-column layout.
- Real selectable text.
- Standard headings:
  - Summary
  - Experience
  - Skills
  - Education
- No graphics.
- No icons.
- No sidebars.
- No text boxes.
- No cards.
- No tables.
- No decorative elements.
- No multi-column layouts.
- No Enneagram or personality content.
- No cover letter.

Required visual style:

- Font: Work Sans.
- Header/title color: `#004747`.
- Accent line color: `#800040`.
- Strong spacing and hierarchy.

### Required `Read more about me:` Line

Directly under the ATS resume Summary section and before Experience, include:

`Read more about me: https://stephanieramsay.com/[company-slug]/`

URL logic:

- If a role-specific landing page exists or is being created, use `https://stephanieramsay.com/[DESIRED URL SLUG]/`.
- If there is no role-specific landing page, use `https://stephanieramsay.com/`.

Formatting rules:

- Label must say exactly `Read more about me:`.
- Label must not be hyperlinked.
- Label must be bold.
- URL must appear immediately after the label.
- Only the URL should be hyperlinked and clickable in exported PDFs.
- URL must be underlined.
- Same font, size, and color as the Summary body text.
- The ATS resume header must not include `stephanieramsay.com` or Stephanie's portfolio URL; the `Read more about me:` line is the only allowed website reference in the ATS resume.
- Do not style this as a section title.
- Do not make the URL bold or teal.
- Do not make the label teal, underlined, or all caps.

## 18. Output 4: Standalone Cover Letter

The app must create a standalone tailored cover letter for every role package.

Canonical cover letter examples:

- `structure_example/Stephanie_Ramsay_Ceribell_Senior_Product_Manager_Cover_Letter copy.docx`
- `structure_example/Stephanie_Ramsay_Ceribell_Senior_Product_Manager_Cover_Letter copy.pdf`

Requirements:

- Tailored to the company and role.
- Written in Stephanie's voice.
- Warm, direct, strategic, human, and not overly polished.
- Usable as either PDF upload or pasted application text.
- Separate from the ATS resume.
- Same modern ATS-safe visual style as the ATS resume:
  - Work Sans.
  - Header/title color `#004747`.
  - Accent line color `#800040`.
  - Single-column text.
  - No tables, icons, cards, sidebars, or text boxes.

Content requirements:

- Open with a direct statement of fit, not generic interest.
- Bridge from `Chief Experience Officer` to actual CEO-side and COO-style operating scope.
- Connect directly to the company's job description.
- Include healthcare AI and operating work when relevant.
- Include company-specific attraction.
- Close with a concise value statement.

Avoid:

- Generic corporate phrasing.
- Overly formal openings.
- Inflated claims.
- Keyword stuffing.
- Repeating the full executive packet.

## 19. WordPress Publishing Requirements

The app must support publishing static landing pages to WordPress by SFTP.

Known publishing target:

- Site: `stephanieramsay.com`
- Host: `sftp.wp.com`
- Port: `22`
- Username: `stephanieramsay.wordpress.com`
- Remote route pattern: `/htdocs/[DESIRED URL SLUG]/index.html`
- Public URL pattern: `https://stephanieramsay.com/[DESIRED URL SLUG]/`

Security requirements:

- Do not store SFTP passwords permanently.
- Ask for the current temporary password only when publishing is requested.
- Do not write passwords to repo files, logs, or generated assets.

Publishing behavior:

- Create the remote slug directory if needed.
- If the directory already exists, continue.
- Upload `index.html`.
- Verify the live URL after upload.
- Store verification status in the package record.

Already verified published routes include:

- `https://stephanieramsay.com/ucsf-transformation-associate-director/`
- `https://stephanieramsay.com/ceribell/`
- `https://stephanieramsay.com/heidi/`

## 20. Package Storage Requirements

The app should store each role package in one folder so all assets for a role stay together.

Preferred future structure:

```text
/Users/stephanie/Dev/resume_portfolio/role_packages/[role-slug]/
  job-description.txt
  strategic-alignment.md
  source-map.json
  index.html
  Stephanie_Ramsay_[Company]_[Role]_Website_PDF.pdf
  Stephanie_Ramsay_[Company]_[Role]_ATS_Resume.docx
  Stephanie_Ramsay_[Company]_[Role]_ATS_Resume.pdf
  Stephanie_Ramsay_[Company]_[Role]_Cover_Letter.docx
  Stephanie_Ramsay_[Company]_[Role]_Cover_Letter.pdf
  verification-summary.md
```

Each role folder should include:

- Company name.
- Role title.
- Job description.
- URL slug.
- Strategic alignment brief.
- Generated landing page.
- Generated website PDF / executive packet PDF.
- Generated ATS resume.
- Generated cover letter.
- Publishing status.
- Verification summary.
- Timestamp.
- Source files used.

Existing repo folders may continue to be read for backward compatibility:

- Working files: `/Users/stephanie/Dev/resume_portfolio/output/`
- Final copied exports: `/Users/stephanie/Dev/resume_portfolio/documents/`
- Scripts or generation logic: `/Users/stephanie/Dev/resume_portfolio/scripts/`
- Source materials: `/Users/stephanie/Dev/resume_portfolio/source_materials/`
- Perfect examples: `/Users/stephanie/Dev/resume_portfolio/structure_example/`

For new app-generated packages, the role-specific folder should be treated as the canonical storage location.

## 21. Quality and Validation Requirements

Before a package is marked complete, the app must validate:

- Landing page exists.
- Landing page uses the required structure.
- Website PDF / designed executive packet PDF exists.
- Website PDF / designed executive packet PDF has clickable links.
- Website PDF / designed executive packet PDF does not include prohibited "Live Packet" text.
- ATS resume exists.
- ATS resume is standalone and single-column.
- ATS resume includes the correctly linked `Read more about me:` line.
- ATS resume excludes cover letter, Enneagram, icons, cards, tables, and sidebars.
- Cover letter exists.
- Cover letter is separate from ATS resume.
- Cover letter references the company and role.
- Generated filenames are role-specific.
- All assets are stored together in one role-specific folder.
- The landing page URL slug is correct.
- WordPress page is live if publishing was requested.
- No invented claims or metrics are introduced.

## 22. MVP Feature Set

### MVP 1: Source Library

- Upload or reference source documents.
- Extract searchable text from DOCX, PDF, HTML, Markdown, and TXT.
- Mark one resume as the fact source of truth.
- Mark one editable interview prep list as the content, prep, story, voice, and framing source of truth.
- Mark one or more additional documents as supporting portfolio, interview, or voice sources.

### MVP 2: Role Intake

- Job description input.
- Company and role fields.
- URL slug field.
- Optional notes fields.
- Deliverable checklist.

### MVP 3: Alignment Engine

- Analyze job description.
- Match role needs to source library.
- Generate strategic alignment brief.
- Allow user editing before asset generation.

### MVP 4: Asset Generation

- Generate landing page HTML.
- Generate website PDF / designed executive packet PDF.
- Generate ATS resume.
- Generate standalone cover letter.
- Save files using role-specific names in one role-specific folder.

### MVP 5: Validation

- Run content and formatting checks.
- Show pass/fail checklist.
- Flag missing links, missing sections, invented metrics risk, and formatting violations.

### MVP 6: WordPress Publishing

- Publish approved landing page to WordPress by SFTP.
- Verify live page.
- Save publishing status.

## 23. Future Features

- Side-by-side comparison of job requirements and Stephanie's proof points.
- Reusable positioning templates by role archetype.
- Version history for each generated package.
- Human approval workflow for each asset.
- Recruiter outreach generator.
- Interview prep generator based on the same alignment brief.
- Application tracker with statuses and notes.
- Visual diff between generated versions.
- Automated link checking across all live landing pages.
- Local backup and export workflow after each approved package.

## 24. Success Metrics

Product success should be measured by:

- Time to generate a complete role package.
- Percentage of packages passing validation on first run.
- Number of manual edits needed after generation.
- Consistency of required formatting across assets.
- Accuracy of role alignment.
- Stephanie's confidence using the outputs directly.
- Reduction in repeated prompt setup.

## 25. Open Product Questions

- Should the comprehensive portfolio archive live as one canonical document, a structured database, or both?
- Should the app generate DOCX files, PDFs, HTML, or all three for ATS resume and cover letter?
- Should publishing require explicit approval every time?
- Should the app create local backups or exports after each approved package?
- Should the app support multiple public portfolio templates, or only the current executive packet structure?
- How should the app detect and prevent invented claims beyond source matching and user review?
- Should generated assets be editable inside the app before export, or edited through source fields and regenerated?

## 26. Acceptance Criteria

The MVP is complete when Stephanie can:

1. Upload or select her portfolio source archive and master resume.
2. Paste a job description.
3. Review a strategic alignment brief.
4. Generate a landing page, website PDF / executive packet PDF, ATS resume, and cover letter.
5. Confirm the ATS resume uses Work Sans, `#004747` headings, `#800040` accent lines, and the exact `Read more about me:` link behavior.
6. Confirm the cover letter uses the same modern ATS-safe formatting as the resume.
7. Confirm the landing page follows the established Ceribell structure.
8. Publish the landing page to `stephanieramsay.com/[slug]/`.
9. See a validation checklist proving the package is complete.
10. Open one role-specific folder and find every asset for that role.
11. Reopen the package later and see which source materials and job description produced it.
