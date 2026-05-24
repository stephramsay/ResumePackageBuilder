# Cluely Interview Prep Templates

Use these files to make each interview answer router reusable but still tailored to the role.

## Folder Pattern

Create or update one folder per real interview under `/Users/stephanie/Dev/Interview Guide/[Company - Role]/`. Do not put generated Cluely packages in `/Users/stephanie/Documents/New project 4`.

Reusable skill examples may live here:

```text
/Users/stephanie/Dev/cluely-interview-prep-skill/examples/[company-slug]/
  [company]_interview_answer_router.txt
  cluely_mode_prompt_for_answer_router.txt
  source_notes.txt
  test_questions.txt
```

## Recommended Workflow

1. Start from `interview_answer_router_template.txt`.
2. Pull in the reusable stories from `master_story_bank.txt`.
3. Add role-specific source notes:
   - job description
   - company notes
   - interview prep doc
   - recruiter screen notes
   - likely interviewer themes
4. Create routes for the interview:
   - keep the router at 35 routes max for Cluely latency
   - keep generic PM routes when useful
   - tailor company-specific routes heavily
   - add story options so stories do not repeat
5. Paste `cluely_mode_prompt_template.txt` into Cluely before uploading the router file.
6. Test with 10-20 likely questions.
7. Add missed phrasings under `CLUE WORDS / PHRASES`.

## What Changes Where

- New question wording: update `CLUE WORDS / PHRASES`.
- Same question, better answer: update `EXAMPLE ANSWER`.
- Same route, different proof point: update `STORY OPTIONS`.
- New experience: add it to `STORY BANK`, then reference it in routes.
- New topic: add a new `ROUTE`.
- Cluely behavior issue: update the mode prompt.

## Quality Bar

- Answers should be 100 words max by default.
- Routers should have no more than 35 routes. Merge overlapping routes and move extra detail to cues/source facts.
- Visible answers should use 2-5 bullets with High-level answer, Proof/details, and Role bridge/Plan/Question/Close as applicable.
- Every route should have an `ANSWER TYPE` so Cluely preserves the right structure instead of forcing STAR everywhere.
- Use STAR only for behavioral story routes or proof-story follow-ups.
- Longer answers are rare exceptions for core narrative or fundamental-story routes only; mark them as a script length exception and keep them at or below 130 words.
- Keep the voice warm, direct, senior, and conversational.
- Do not invent facts, metrics, employers, titles, tools, credentials, or outcomes.
- Prefer routing and memory-jogging over long generated answers; keep expansion material in cues/source facts for follow-up probes, but do not display cues unless Stephanie asks to debug routing.
