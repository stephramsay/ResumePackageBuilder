# Interview Guide Builder Workflow

## 1. Intake

Accept a job URL, pasted job description, DOCX, PDF, Markdown, or plain text file.

Create the role folder under:

`/Users/stephanie/Dev/Interview Guide/[Company] - [Role]/`

Use a readable company/role folder name so Stephanie can scan the directory without opening files. Example: `Acme Health - Senior Product Manager`.

Save the original content or clean extraction in `job-description.md`. If the input is a binary document, preserve the absolute source path in the file header.

## 2. Current Research

Browse before writing. Look for:

- Company product, customers, funding, leadership, market, and business model.
- Recent launches, strategic shifts, layoffs, acquisitions, pivots, partnerships, or regulatory/news context.
- Role-specific signals: team priorities, domain language, customer/user type, workflow surface, metrics, and risks.
- Interview-relevant hypotheses: what they may be trying to fix, scale, automate, monetize, or de-risk.

Write `company-research.md` with concise source links, dates, and practical interview implications.

## 3. Experience Matching

Load the story bank, approved resume sources, and `assets/framework-bank.md`. Build `story-fit-map.md` with:

- Role requirement.
- Best story ID.
- Backup story IDs.
- Angle to emphasize.
- Approved metrics to use.
- Selected framework ID(s) to use as thinking scaffolds.
- Risk or gap.
- Suggested bridge language.

Prefer the strongest approved story over creating a new narrative. If the guide needs a story that does not exist, write a review-first candidate report for the interview-story-bank skill.

Add a dedicated stakeholder-pushback route when the interview is likely to include roadmap, strategy, sales, client, or stakeholder-management questions. Map "push back on a stakeholder request not aligned with product strategy" to `STORY_03_HEALTH_SUMMARY_REPORT` with the provider-portal request angle, not to broad platform rebuild, platform-transition weakness, coworker conflict, engineering pushback, or technical debt.

Select 5-8 role-relevant frameworks from `assets/framework-bank.md`. Frameworks should help Stephanie answer when the interviewer asks product judgment, ambiguity, prioritization, discovery, AI, metrics, launch, or tradeoff questions. They are not proof. They are the structure underneath the answer.

Use this selection rule:

1. Start with the role's likely product judgment demands.
2. Choose frameworks that Stephanie should keep returning to when unsure.
3. Prefer distinct frameworks over near-duplicates.
4. Tie each selected framework to one or more likely questions.
5. Put framework IDs in route `CUES:` only when they help retrieval.

## 4. Guide Draft

Write `interview-guide.md` in this order:

1. Role strategy snapshot.
2. Stephanie positioning thesis.
3. Company-specific talking points.
4. Story map.
5. Frameworks To Keep Returning To.
6. Top 20 likely questions and answers.
7. Standard interview coverage routes plus role-specific backup routes for follow-ups, gaps, AI, metrics, close, and questions for them.
8. `## Cluely Router Source`.

Keep answers close to Stephanie's memorized core language unless the role requires a precise bridge.

For Cluely routes, write the `SCRIPT:` as the first answer, not the whole story. Default to 100 words max with a clear structure: direct answer, one proof point or principle, and a concise bridge back to the role. Put expansion material in `CUES:` and `SOURCE FACTS:` so follow-up probes can go deeper without making the first answer too long.

Every route must include `ANSWER TYPE:` so Cluely preserves the right answer shape:

- `POSITIONING`: direct fit/background/why bullets, no STAR.
- `FRAMEWORK_WITH_PROOF`: framework first, then one proof-story hook; expand story in STAR only if probed.
- `BEHAVIORAL_STORY`: STAR or natural STAR for tell-me-about-a-time/example/conflict/failure/experiment questions.
- `PRODUCT_DIAGNOSIS`: observation, judgment, recommendation, metric/guardrail.
- `PLAN`: phased/prioritized bullets, no STAR.
- `QUESTIONS_OR_CLOSE`: short direct bullets, no STAR.

Every router source must include standard interview coverage. Do not stop at only the role-specific technical or product questions. Include dedicated or clearly covered routes for: tell me about yourself, why company, why role/fit, first 30/60/90 or getting started, prioritization/roadmap, stakeholder pushback, requirements/launch readiness, metrics, cross-functional alignment or conflict, failure/mistake/learning, ambiguity, leadership style or leadership influence, questions for them, and closing/final thoughts.

Framework usage rules:

- Do not paste framework-bank text wholesale into answers.
- Do not let frameworks replace Stephanie's real stories.
- Use frameworks to make answers sound structured, senior, and calm.
- If the interviewer asks a purely framework-based question, answer with the framework and then tie it back to a relevant story or role situation.
- In Cluely routes, framework references belong in `CUES:` and `SOURCE FACTS:`. Use `ANSWER TYPE:` to control answer structure.

## 5. Cluely Handoff

The guide owns the route source. The Cluely skill parses only the `## Cluely Router Source` section and generates all Cluely text artifacts.

Run:

```bash
node /Users/stephanie/.codex/skills/cluely-interview-prep/scripts/cluely-prep.mjs \
  --source-guide "/absolute/path/to/interview-guide.md" \
  --output-dir "/absolute/path/to/role-folder"
```

Review `cluely-retrieval-simulation.md` and `cluely-route-debug.json`. Fix source Markdown, then regenerate.

## 6. DOCX Guide

Generate a polished DOCX from `interview-guide.md` using the documents workflow when requested or when delivering the final role package. Render the DOCX and visually inspect pages before delivery.
