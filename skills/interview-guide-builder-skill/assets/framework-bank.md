# Core PM Framework Bank

Use this as the reusable "when in doubt" layer for Stephanie's role-specific interview guides.

Frameworks are not generic answers. They are thinking scaffolds that help shape a role-tailored answer, choose the right story, and give Cluely a short cue when the interviewer asks a product judgment question.

## How To Use

- Select 5-8 frameworks per role based on the job description, company research, and likely interview themes.
- Put selected frameworks in `story-fit-map.md` and the `Frameworks To Keep Returning To` section of `interview-guide.md`.
- Add framework IDs to route `CUES:` when they help Stephanie remember the answer structure.
- Keep stories primary. Use frameworks to organize the thinking, not to replace Stephanie's proof.
- Do not invent metrics from frameworks. Metrics still come from the story bank and approved metric sources.

## Frameworks

### FW_HEALTHCARE_SYSTEM_MAP
Name: Workflow, People, Constraint, Stakes, Solution Type
Use when: healthcare strategy, ambiguous systems, "what would you build?", product strategy
Core cue: Do not start with features. Start with the system.
Stephanie phrasing: "Before I jump to a feature, I want to understand the workflow, who is involved, where the constraint is, what is at stake, and whether the fix is actually product, process, policy, training, data, automation, or workflow redesign."
Cluely cue: Workflow -> people -> constraint -> stakes -> solution type.
Source deck: Product Strategy & Sr PM Principles (General PM)

### FW_HIGHEST_LEVERAGE_CONSTRAINT
Name: Find the bottleneck
Use when: prioritization, roadmap, strategy, first 90 days, growth, activation, retention
Core cue: The best work removes the constraint blocking the most important outcome.
Stephanie phrasing: "I usually start by asking what outcome is blocked, what bottleneck is causing it, and what becomes possible if we remove that bottleneck."
Cluely cue: What outcome is blocked? What bottleneck removes it?
Source deck: Product Strategy & Sr PM Principles (General PM)

### FW_CONSTRAINT_UNLOCK_TRADEOFF
Name: Constraint -> Unlock -> Tradeoff
Use when: prioritization, roadmap tradeoffs, senior PM judgment, sequencing
Core cue: Prioritization is not just "how big is this?" It is "what does this unlock?"
Stephanie phrasing: "I start with the biggest constraint, then ask what solving it unlocks, and then weigh the tradeoffs: impact, urgency, effort, risk, confidence, dependencies, reversibility, and learning value."
Cluely cue: Constraint -> unlock -> tradeoff.
Source deck: Prioritization, Validation & Experimentation (General PM)

### FW_PRODUCT_VS_PROCESS
Name: Product vs. process vs. training vs. manual learning
Use when: one-off requests, internal tools, workflow fixes, early discovery, "should we build this?"
Core cue: Not every real problem deserves product investment yet.
Stephanie phrasing: "Before I turn something into product work, I want to know whether it is repeated, predictable, scalable, and important enough to build, or whether we need process, training, policy, or manual learning first."
Cluely cue: Build only if repeated, predictable, scalable, and worth product investment.
Source deck: Prioritization, Validation & Experimentation (General PM)

### FW_WORKFLOW_FIRST_DISCOVERY
Name: Workflow-first discovery
Use when: discovery, requirements, operational complexity, healthcare workflows
Core cue: Understand how work actually happens before defining the product.
Stephanie phrasing: "I start with how the work happens today: the user, trigger, steps, systems, handoffs, decisions, exceptions, and the desired outcome."
Cluely cue: User -> trigger -> steps -> systems -> handoffs -> decisions -> exceptions -> outcome.
Source deck: Discovery, Framing problems, Requirements, AC (General PM)

### FW_AMBIGUITY_KNOW_ASSUME_LEARN
Name: Known, assumed, and still-to-learn
Use when: ambiguity, incomplete data, early strategy, messy stakeholder input
Core cue: Separate symptoms, facts, assumptions, and learning needs.
Stephanie phrasing: "When a problem is ambiguous, I try to separate what we are seeing, what we know, what we are assuming, and what evidence would help us make a better decision."
Cluely cue: What do we know? What are we assuming? What do we need to learn?
Source deck: Discovery, Framing problems, Requirements, AC (General PM)

### FW_REQUIREMENTS_LAUNCHABLE
Name: Launchable requirements
Use when: PRDs, requirements, acceptance criteria, QA, handoff to engineering
Core cue: A strong requirement explains what must be true for the workflow to work in real life.
Stephanie phrasing: "For requirements, I want the team to understand the problem, expected behavior, edge cases, data needs, privacy or safety considerations, success metrics, and acceptance criteria."
Cluely cue: Problem -> behavior -> edge cases -> data -> privacy/safety -> metrics -> AC.
Source deck: Discovery, Framing problems, Requirements, AC (General PM)

### FW_RISK_ADJUSTED_EXPERIMENTS
Name: Risk-adjusted experimentation
Use when: experiments, A/B tests, pilots, product validation, healthcare risk
Core cue: Move fast where risk is low; slow down where errors affect safety, trust, compliance, billing, or access.
Stephanie phrasing: "I like experimentation, but in healthcare I adjust the speed and rigor based on the risk. Low-risk workflow or messaging tests can move quickly; anything touching safety, trust, compliance, billing, or access needs stronger guardrails."
Cluely cue: Hypothesis -> intervention -> metric -> guardrail -> decision rule; adjust for risk.
Source deck: Prioritization, Validation & Experimentation (General PM); Tradeoffs (General PM)

### FW_HEALTHCARE_VALIDATION
Name: Validate beyond the prototype
Use when: validation, pilots, launch readiness, clinician/patient adoption
Core cue: In healthcare, validation includes workflow fit, safety, operations, training, and measurement.
Stephanie phrasing: "I do not want to validate only whether someone likes the prototype. I want to know whether the workflow holds up, whether users can adopt it, whether it creates risk or extra burden, and whether we can measure the outcome after launch."
Cluely cue: Prototype + workflow fit + safety + ops burden + training + measurement.
Source deck: Prioritization, Validation & Experimentation (General PM)

### FW_LAYERED_HEALTHCARE_METRICS
Name: Layered healthcare metrics
Use when: success metrics, feature measurement, business impact, product outcomes
Core cue: One metric is rarely enough in healthcare.
Stephanie phrasing: "I like layered metrics because a feature can drive adoption but still fail if it creates risk, confusion, or extra work. I look at user behavior, workflow efficiency, quality, patient impact, business impact, and operational signals."
Cluely cue: Behavior + workflow + quality + patient impact + business + operational signals.
Source deck: Metrics, Data, and Technical product judgment (General PM)

### FW_QUAL_PLUS_QUANT
Name: Data tells where; qualitative tells why
Use when: data, discovery, incomplete signals, metrics, validation
Core cue: Use quantitative evidence to locate the problem and qualitative evidence to understand it.
Stephanie phrasing: "Data usually tells me where something is breaking. Interviews, transcripts, support notes, and workflow observation tell me why."
Cluely cue: Data = where. Qual = why.
Source deck: Metrics, Data, and Technical product judgment (General PM)

### FW_PATIENT_ENGAGEMENT_VALUE_NOT_ACTIVITY
Name: Engagement is value, not activity
Use when: patient engagement, retention, notifications, UGC, community, behavior change
Core cue: Engagement is meaningful sustained participation that helps the patient.
Stephanie phrasing: "I do not think of engagement as clicks, reminders, logins, or message volume. I care whether the action is useful, credible, timely, manageable, and actually helps the patient."
Cluely cue: Useful, credible, timely, manageable, supportive.
Source deck: Patient and clinician experience, Launch and operations (General PM)

### FW_ENGAGEMENT_VS_BURDEN
Name: Engagement vs. burden
Use when: notifications, reminders, onboarding, forms, patient-facing workflows
Core cue: More touchpoints are not always better.
Stephanie phrasing: "In healthcare, every reminder, form, tracker, and message creates cognitive load. I want engagement to create value, not just more activity."
Cluely cue: Value over volume; reduce cognitive load.
Source deck: Patient and clinician experience, Launch and operations (General PM); Tradeoffs (General PM)

### FW_LAUNCH_REAL_WORLD_READINESS
Name: Launch means the workflow holds up
Use when: QA, launch, rollout, training, operational readiness, post-launch monitoring
Core cue: QA is not just whether the feature works; it is whether the workflow works in real life.
Stephanie phrasing: "Before launch, I want to know whether the feature works technically, whether users understand it, whether the operational workflow holds up, whether the team is trained, and whether we can monitor the right signals after release."
Cluely cue: Technical QA + user clarity + ops readiness + training + monitoring.
Source deck: Patient and clinician experience, Launch and operations (General PM)

### FW_AI_ROLE_IN_WORKFLOW
Name: AI role in workflow
Use when: AI strategy, AI product design, generative AI, automation, recommendations
Core cue: Define what AI should do before choosing the model or feature.
Stephanie phrasing: "I start by defining AI's role in the workflow. Should it draft, summarize, route, recommend, flag for review, assist a human, or act on its own?"
Cluely cue: Draft, summarize, route, recommend, flag, assist, or act.
Source deck: AI product frameworks (General PM)

### FW_AI_COST_OF_BEING_WRONG
Name: Cost of being wrong
Use when: AI evaluation, human-in-the-loop design, safety, quality, automation vs. judgment
Core cue: The risk of the AI task determines how much autonomy and review it gets.
Stephanie phrasing: "With AI, I always ask what happens if it is wrong. If the cost of being wrong is low, AI can move faster. If the cost is clinical risk, trust, safety, privacy, or access, I want stronger evaluation and human review."
Cluely cue: What happens if AI is wrong?
Source deck: AI product frameworks (General PM)

### FW_HUMAN_IN_THE_LOOP_AI
Name: Human-in-the-loop AI
Use when: healthcare AI, clinician trust, patient safety, workflow automation
Core cue: Automate low-risk repetitive work; keep humans where judgment, empathy, exceptions, or trust matter.
Stephanie phrasing: "I am comfortable using AI to reduce burden, but I want humans involved where there is clinical judgment, emotional nuance, exceptions, or trust at stake."
Cluely cue: Automate repetition; keep humans for judgment, empathy, exceptions, trust.
Source deck: AI product frameworks (General PM); Tradeoffs (General PM)

### FW_BUILD_VS_BUY_DIFFERENTIATION
Name: Build what differentiates
Use when: build vs. buy, integrations, vendor decisions, technical product judgment
Core cue: Build what creates product advantage; buy or integrate what is necessary but not core magic.
Stephanie phrasing: "I usually ask whether the capability differentiates the product, whether we need control, how complex it is to maintain, what compliance or integration burden it creates, and what speed we gain by buying."
Cluely cue: Differentiation + control + complexity + compliance + speed.
Source deck: Metrics, Data, and Technical product judgment (General PM)

### FW_TRADEOFF_BANK
Name: Senior PM tradeoff bank
Use when: tradeoff questions, product judgment, roadmap tension, stakeholder disagreement
Core cue: Name both sides, what matters, what risk changes the decision, and how to de-risk it.
Stephanie phrasing: "When I explain a tradeoff, I try to name what each side gives us, what each side costs, what risk would change my decision, and what I would do to de-risk the path we choose."
Cluely cue: Benefit, cost, risk, de-risking move.
Source deck: Tradeoffs (General PM)

### FW_CROSS_FUNCTIONAL_ALIGNMENT
Name: Align on problem, decision, constraints, and next step
Use when: cross-functional work, influence, conflict, design/engineering/clinical/ops collaboration
Core cue: Teams move faster when they share the problem, the decision, the constraints, and what happens next.
Stephanie phrasing: "I try to get teams aligned on the problem we are solving, the decision we need to make, the constraints we are working within, and the next step each team can act on."
Cluely cue: Problem -> decision -> constraints -> next step.
Source deck: My Intro and positioning, and Cross-functional leadership (General PM)
