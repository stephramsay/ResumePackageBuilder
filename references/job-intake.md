# Job Intake

Preferred input is a public job URL. The CLI infers company, role, package folder, and WordPress route:

```bash
bash scripts/resume-package run-url "[Job URL]"
```

The CLI caches by normalized job URL across `~/Dev/resume_packages/`. It removes tracking parameters such as `utm_*`, so the same Indeed or ZipRecruiter job is recognized even when the pasted link differs slightly.

All generated files, validation artifacts, status files, and temporary files belong under `~/Dev/resume_packages/[package-folder]/`. Normal intake output should report only the inferred company/role, package path, warnings, and next action; do not dump the full fetched job description unless explicitly debugging.

Duplicate behavior:

- Interactive terminal: asks whether to create a new package anyway.
- Non-interactive Codex run: stops before creating or publishing and reports the existing package.
- Reuse existing package:

```bash
bash scripts/resume-package run-url "[Job URL]" --reuse-existing
```

- Create another package anyway:

```bash
RESUME_PACKAGE_ENABLE_PUBLISH=1 bash scripts/resume-package run-url "[Job URL]" --force-new
```

If a job board blocks extraction or returns a short/login page, the command stops before creating a package. Recovery path:

1. Recover the full job description from a browser-readable source.
2. Create a correctly named package with `init`, providing the company and role.
3. Replace `job-description.txt` with the recovered full job description.
4. Update `input.yml` only if company, role, hiring team, location, or motivation are missing or wrong.
5. Continue manually:

```bash
bash scripts/resume-package init [correct-package-slug] --company "[Company]" --role "[Role]"
bash scripts/resume-package analyze ~/Dev/resume_packages/[package-folder]
bash scripts/resume-package generate ~/Dev/resume_packages/[package-folder]
bash scripts/resume-package validate ~/Dev/resume_packages/[package-folder]
RESUME_PACKAGE_ENABLE_PUBLISH=1 bash scripts/resume-package publish ~/Dev/resume_packages/[package-folder] --execute
bash scripts/resume-package status ~/Dev/resume_packages/[package-folder]
```

Do not ask the user for a route name unless there is a real collision or they explicitly request a specific public URL.
