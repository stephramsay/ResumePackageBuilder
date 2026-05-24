# Publishing

Normal `$resume-package [URL]` runs publish live to WordPress after validation:

```bash
RESUME_PACKAGE_ENABLE_PUBLISH=1 bash scripts/resume-package run-url "[Job URL]"
```

Direct publishing for an existing package:

```bash
RESUME_PACKAGE_ENABLE_PUBLISH=1 bash scripts/resume-package publish ~/Dev/resume_packages/[package-folder] --execute
```

Publishing must read the generated `index.html` from the package folder and write `publishing-status.json` back to that same package folder. SFTP batch files and other temporary publishing artifacts belong under `~/Dev/resume_packages/[package-folder]/tmp/` and should be removed after use.

Target:

```text
Site: stephanieramsay.com
Host: ssh.wp.com
Username: stephanieramsay.wordpress.com
Remote file: /htdocs/[package-folder]/index.html
Public URL: https://stephanieramsay.com/[package-folder]/
```

Publishing validates the package first, uploads `index.html`, verifies the public URL, and writes `publishing-status.json`.

Dry-run publishing is only for explicit preflight requests:

```bash
bash scripts/resume-package publish ~/Dev/resume_packages/[package-folder]
```

Normal publish output should be compact. Use `--json` or `--verbose` only when the full publishing payload, SFTP stdout/stderr, or verification details are needed for troubleshooting.

Never write passwords, private keys, temporary tokens, or SSH material into repo files, generated files, logs, prompts, or summaries.
