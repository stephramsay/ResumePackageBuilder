# Story Bank Schema

Use these fields in `story-bank/data/stories.yml`.

## Required Story Fields

- `id`: stable uppercase ID, for example `STORY_01_STARLIGHT_0_TO_1`.
- `title`: human-readable title.
- `short_label`: short label used in routers.
- `status`: `canonical`, `needs_review`, `candidate`, or `deprecated`.
- `themes`: broad reusable themes from `themes.yml`.
- `angles`: specific framing tags.
- `question_types`: interview question categories this can answer.
- `role_fit`: role/domain fit tags.
- `summary`: concise reusable story summary.
- `situation`: what was happening.
- `task`: Stephanie's responsibility or problem to solve.
- `actions`: list of concrete actions.
- `result`: outcome and learning.
- `metrics`: list of grounded metrics only.
- `companies`: list of relevant organizations.
- `roles`: list of Stephanie roles involved.
- `time_period`: approximate grounded period or `unknown`.
- `source_refs`: source IDs from `sources.yml`.
- `evidence_notes`: grounding notes and caveats.
- `sensitivity_notes`: privacy, compliance, or overclaim risks.
- `variation_of`: story ID if this is a meaningful variation; otherwise blank.

## Required Source Fields

- `id`: stable source ID, for example `SRC_MASTER_STORY_BANK_TEMPLATE`.
- `path`: absolute local path.
- `kind`: `markdown`, `text`, `docx`, `pdf`, `json`, `yaml`, `html`, `csv`, `xlsx`, `media`, or `other`.
- `sha256`: file hash when available.
- `size_bytes`: file size when available.
- `modified_at`: ISO-like local timestamp when available.
- `status`: `scanned`, `seed`, `candidate`, `metadata_only`, `missing`, or `ignored`.
- `notes`: concise relevance notes.

## ID Rules

Keep existing IDs stable. For new canonical stories, use the next available number and a clear slug:

`STORY_19_WISDOM_PARTICIPANT_SCALE`

For variations, keep a new story ID and set `variation_of` to the parent:

`STORY_20_KANNACT_AUTOMATED_MESSAGING_HUMAN`

Do not recycle IDs.
