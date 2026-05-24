# Cluely Router Source Format

The parser reads only the section beginning with:

`## Cluely Router Source`

It stops at the next `##` heading or the end of the file.

## Required Structure

Use this order:

```markdown
## Cluely Router Source

### ROUTING PRECEDENCE
- Exact role/company questions outrank generic behavioral matches.
- Choose route by interviewer intent first, then preserve the route's ANSWER TYPE.
- If a route has a primary story and backup stories, use the primary unless the interviewer asks for a different angle.
- If the question asks for unsupported facts, use NONE.
- Framework cues can help structure product judgment answers, but exact company/role routes still outrank generic framework matches.
- Stakeholder pushback on a feature request, sales request, one-off client request, requested provider portal, or request not aligned with product strategy should route to `STORY_03_HEALTH_SUMMARY_REPORT` using the provider-portal request / Health Summary Report angle.

### ROUTE INDEX
- ROUTE 01 - TELL_ME_ABOUT_YOURSELF: overview, background, career story

### ROUTE 01 - TELL_ME_ABOUT_YOURSELF
ROUTE: ROUTE 01 - TELL_ME_ABOUT_YOURSELF
SECTION: Core Narrative
QUESTION: Tell me about yourself.
ANSWER TYPE: POSITIONING
TRIGGERS:
- tell me about yourself
- walk me through your background
PRIMARY STORY: STORY_01_STARLIGHT_0_TO_1
BACKUP STORIES:
- STORY_11_KANNACT_PLATFORM_REBUILD
SCRIPT:
I currently lead product and patient experience across Starlight and Kannact...
CUES:
- Product plus operations
- Healthcare workflow builder
- Framework: FW_WORKFLOW_FIRST_DISCOVERY, workflow-first thinking
SOURCE FACTS:
- STORY_01_STARLIGHT_0_TO_1: Starlight 0-to-1 virtual clinic
- approved metric: 70% referral-to-enrollment conversion only when discussing enrollment
- FW_WORKFLOW_FIRST_DISCOVERY: workflow-first discovery framework from `assets/framework-bank.md`
```

## Field Rules

- `ROUTE:` should be stable and human-readable.
- `SECTION:` should identify the guide area, such as Core Narrative, Behavioral, Product Judgment, Company Fit, Metrics, or Close.
- `QUESTION:` should be the default likely interviewer question.
- `ANSWER TYPE:` should be one of `POSITIONING`, `FRAMEWORK_WITH_PROOF`, `BEHAVIORAL_STORY`, `PRODUCT_DIAGNOSIS`, `PLAN`, or `QUESTIONS_OR_CLOSE`.
- `TRIGGERS:` should include common phrasings and domain keywords separated by bullets, semicolons, or new lines.
- `PRIMARY STORY:` should use one story ID from `stories.yml`, unless the route is intentionally framework-only.
- `BACKUP STORIES:` can include multiple story IDs or framework labels.
- `SCRIPT:` should be the exact speakable answer Cluely can surface.
- `CUES:` should be short memory prompts, not full sentences. Add selected framework IDs here when they help Stephanie remember the answer structure.
- `SOURCE FACTS:` should name story IDs, approved metrics, source constraints, and any framework IDs used as thinking scaffolds.

## Answer Type Rules

Choose one answer type for every route:

- `POSITIONING`: tell me about yourself, why company, why role, why leaving, next role, company overview. Direct natural bullets, no STAR.
- `FRAMEWORK_WITH_PROOF`: how-do-you-think questions such as prioritization, metrics, AI strategy, requirements, launch readiness, privacy, trust/safety, or product strategy. Framework first, then one proof-story hook; STAR only if the interviewer probes the story.
- `BEHAVIORAL_STORY`: tell-me-about-a-time, example, conflict, mistake, failure, stakeholder pushback, experiment, roadmap ownership, ambiguity, or leadership influence. STAR or natural STAR.
- `PRODUCT_DIAGNOSIS`: product critique, first logged-in experience, funnel diagnosis, or what would you improve. Observation, product judgment, recommendation, metric/guardrail.
- `PLAN`: first 30/60/90, first five experiments, or what would you do first. Phased/prioritized bullets, no STAR.
- `QUESTIONS_OR_CLOSE`: questions for interviewer and closing. Short direct bullets, no STAR.

Do not force STAR across every answer. STAR belongs in `BEHAVIORAL_STORY` routes and optional proof-story follow-ups for `FRAMEWORK_WITH_PROOF`.

## Required Behavioral Disambiguation

Create a dedicated `STAKEHOLDER_PUSHBACK` route when the role may include product strategy, sales pressure, client requests, stakeholder management, or roadmap tradeoffs.

Use:

- Primary story: `STORY_03_HEALTH_SUMMARY_REPORT`
- Triggers: stakeholder request, push back, not aligned with product strategy, sales request, provider portal, one-off client request, strategic pushback, say no
- Angle: Sales wanted a provider portal; Stephanie understood the real provider-value need, protected the roadmap from a one-off portal, and steered toward the Health Summary Report because it was simpler, more accessible, reusable across more workflows, and still closed the provider communication gap.

Do not route this question to broad platform rebuild, platform-transition weakness, coworker conflict, engineering pushback, or technical-debt stories unless the interviewer explicitly asks for those different angles.

## Standard Interview Coverage

Every answer router must include the common interview-route family, even when the role has a narrow technical or domain focus. The router validator treats missing coverage as a failure. Use dedicated routes or route blocks whose question/triggers clearly cover:

- Tell me about yourself / background.
- Why this company.
- Why this role / role fit.
- First 30/60/90 or getting started.
- Prioritization / roadmap.
- Stakeholder pushback.
- Requirements / launch readiness.
- Metrics / measuring success.
- Cross-functional alignment or conflict.
- Failure / mistake / learning.
- Ambiguity / incomplete information.
- Leadership style or leadership influence.
- Questions for them.
- Closing / final thoughts.

## Framework Rules

Frameworks come from:

`/Users/stephanie/Dev/interview-guide-builder-skill/assets/framework-bank.md`

Use framework IDs like `FW_HIGHEST_LEVERAGE_CONSTRAINT` or `FW_AI_COST_OF_BEING_WRONG` only as cues. They should not create new claims, metrics, credentials, or stories.

Good use:

- `CUES: Framework: FW_CONSTRAINT_UNLOCK_TRADEOFF, bottleneck -> unlock -> tradeoff`
- `SOURCE FACTS: FW_CONSTRAINT_UNLOCK_TRADEOFF: prioritization framework from framework bank`

Avoid:

- Returning a generic framework answer when the interviewer asked a specific company/role question.
- Letting frameworks replace Stephanie's story proof.
- Adding a new required route field such as `FRAMEWORK:`. Use `ANSWER TYPE:` for structure and keep framework IDs in `CUES:` / `SOURCE FACTS:`.

Default script maximum: 100 words. Short tactical routes can be shorter if they are intentionally cue-like. Use the route's answer type to decide the first-answer shape. Keep expansion material in `CUES:` and `SOURCE FACTS:` so Cluely can go deeper only if the interviewer probes.

Only core narrative or fundamental-story routes may exceed 100 words. Mark those routes with `SCRIPT LENGTH EXCEPTION: CORE_NARRATIVE` or `SCRIPT LENGTH EXCEPTION: FUNDAMENTAL_STORY` in `CUES:` or `SOURCE FACTS:`, and keep even those exceptions at or below 130 words.

## Metric Rules

Use approved metric language from:

`/Users/stephanie/.codex/skills/resume-package/assets/resume_app_infra/source_data/approved-metrics.yml`

Retired or conflicting numbers must not appear:

- `$4,044`
- `30% to 40%`
- `77% to 95%`
- standalone `95% satisfaction`

Use the corrected metrics:

- Starlight intake/enrollment: 41% drop-off baseline, 70% final referral-to-enrollment conversion.
- Kannact broad platform rebuild: 96% patient satisfaction and NPS of 82.
- Omnichannel coach-message campaign: doubled activation rates and reduced churn to under 2%.
- Scheduling and reminders: 300% scheduling efficiency improvement and 50% fewer no-shows.
- Personalized reminder cadence: among patients missing more than 25% of appointments, cut no-shows by nearly one-third.
- HEDIS tracked measures: up to $7,000 total annual cost savings per patient.
- Discovery cadence: 1-2 user interviews per week ongoing.
- Mobile app rebuild: full rebuild in 3 months; app satisfaction increased from 76% to 84%; tech support cases reduced by over 80%.
- Infrastructure migration: 5x cost reduction.
