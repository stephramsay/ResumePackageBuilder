# ResumePackageBuilder

Private workspace for the resume package builder system: Codex skills, deterministic generation engine, source data banks, story-bank tooling, interview-prep helpers, and validation/publishing docs.

## What Is Tracked

- `SKILL.md`, `scripts/`, `references/`, and `agents/`: the top-level `resume-package` skill.
- `assets/resume_app_infra/`: the deterministic resume package engine, schemas, generator code, validators, preview server, publishing code, and canonical source data.
- `assets/resume_app_infra/source_data/`: approved facts, metrics, skill bank, role bullet bank, positioning rules, education, and contact data used by the builder.
- `skills/interview-story-bank-skill/`: story-bank extraction and classification workflow.
- `skills/interview-guide-builder-skill/`: interview guide and Cluely router source builder.
- `skills/cluely-interview-prep-skill/`: Cluely prompt/router templates, master story bank, and prep generator.

## What Stays Local

Actual resume artifacts and generated packages are intentionally ignored:

- DOCX/PDF/HTML/PNG resume outputs.
- `role_packages/`, `output/`, `documents/`, `generated/`, render QA, and PDF QA folders.
- Baseline/source resumes under `assets/resume_app_infra/source_materials/`.
- Sample generated resume packets under `assets/resume_app_infra/structure_example/`.
- Role-specific generated interview-prep examples under skill `examples/` folders.
- `node_modules/`, logs, temporary files, archives, and credentials.

## Local Setup

Install the bundled engine dependencies once:

```bash
bash scripts/setup-engine
```

Run the builder through the skill wrapper:

```bash
bash scripts/resume-package --help
```

Generated packages should live outside this repo under `~/Dev/resume_packages/[package-folder]/`.
