#!/usr/bin/env ruby
# frozen_string_literal: true

require "csv"
require "date"
require "digest"
require "fileutils"
require "json"
require "open3"
require "optparse"
require "shellwords"
require "tmpdir"
require "time"
require "yaml"

DEFAULT_REPO = "/Users/stephanie/Documents/New project 4"
DEFAULT_DATE = Date.today.to_s

SUPPORTED_TEXT_EXTS = %w[
  .md .markdown .txt .text .json .yml .yaml .html .htm .docx .pdf .rtf .csv .tsv .xlsx
].freeze

MEDIA_EXTS = %w[.m4a .mp3 .wav .mov .mp4].freeze

EXCLUDED_DIRS = %w[
  .git node_modules .cache .next dist build coverage vendor Library Applications Pictures Movies Music
].freeze

STORY_KEYWORDS = /
  story|interview|tell\ me\ about|tell\ me\ a\ time|STAR|behavioral|
  Starlight|Kannact|UCSF|WISDOM|Easy\ Enroll|patient|clinician|workflow|
  activation|engagement|conversion|AI|GenAI|FHIR|HEDIS|billing|cost|consent|
  launch|requirements|roadmap|cross-functional|conflict|failure|mistake|metric
/ix

REQUIRED_STORY_FIELDS = %w[
  id title short_label status themes angles question_types role_fit summary situation task actions
  result metrics companies roles time_period source_refs evidence_notes sensitivity_notes variation_of
].freeze

def bank_path(repo, *parts)
  File.join(repo, "story-bank", *parts)
end

def ensure_bank_dirs(repo)
  %w[
    data inbox/candidates exports reports tmp/extracted
  ].each { |dir| FileUtils.mkdir_p(bank_path(repo, dir)) }
end

def kind_for(path)
  ext = File.extname(path).downcase
  return "markdown" if [".md", ".markdown"].include?(ext)
  return "text" if [".txt", ".text", ".rtf"].include?(ext)
  return "docx" if ext == ".docx"
  return "pdf" if ext == ".pdf"
  return "json" if ext == ".json"
  return "yaml" if [".yml", ".yaml"].include?(ext)
  return "html" if [".html", ".htm"].include?(ext)
  return "csv" if [".csv", ".tsv"].include?(ext)
  return "xlsx" if ext == ".xlsx"
  return "media" if MEDIA_EXTS.include?(ext)

  "other"
end

def file_metadata(path, id:, status:, notes:)
  exists = File.file?(path)
  stat = exists ? File.stat(path) : nil
  {
    "id" => id,
    "path" => path,
    "kind" => kind_for(path),
    "sha256" => exists ? Digest::SHA256.file(path).hexdigest : "",
    "size_bytes" => exists ? stat.size : 0,
    "modified_at" => exists ? stat.mtime.iso8601 : "",
    "status" => exists ? status : "missing",
    "notes" => notes
  }
end

def run_command(command)
  stdout, stderr, status = Open3.capture3(*command)
  return stdout if status.success?

  warn "Command failed: #{command.shelljoin}\n#{stderr}"
  ""
end

def strip_html(text)
  text.gsub(/<script.*?<\/script>/mi, " ")
      .gsub(/<style.*?<\/style>/mi, " ")
      .gsub(/<[^>]+>/, " ")
      .gsub(/&nbsp;/, " ")
      .gsub(/&amp;/, "&")
      .gsub(/\s+/, " ")
end

def extract_text(path)
  raise "Input does not exist: #{path}" unless File.file?(path)

  ext = File.extname(path).downcase
  case ext
  when ".md", ".markdown", ".txt", ".text", ".json", ".yml", ".yaml"
    File.read(path, invalid: :replace, undef: :replace)
  when ".html", ".htm"
    textutil = run_command(["textutil", "-convert", "txt", "-stdout", path])
    textutil.empty? ? strip_html(File.read(path, invalid: :replace, undef: :replace)) : textutil
  when ".docx", ".rtf"
    run_command(["textutil", "-convert", "txt", "-stdout", path])
  when ".pdf"
    if system("command -v pdftotext >/dev/null 2>&1")
      run_command(["pdftotext", "-layout", path, "-"])
    else
      ""
    end
  when ".csv", ".tsv"
    separator = ext == ".tsv" ? "\t" : ","
    rows = []
    CSV.foreach(path, col_sep: separator, liberal_parsing: true).with_index do |row, index|
      rows << row.compact.join(" | ")
      break if index >= 500
    end
    rows.join("\n")
  when ".xlsx"
    extract_xlsx(path)
  else
    ""
  end
end

def extract_xlsx(path)
  return "" unless system("command -v soffice >/dev/null 2>&1")

  Dir.mktmpdir("story-bank-xlsx") do |dir|
    run_command(["soffice", "--headless", "--convert-to", "csv", "--outdir", dir, path])
    csv_file = Dir[File.join(dir, "*.csv")].first
    return "" unless csv_file && File.file?(csv_file)

    rows = []
    CSV.foreach(csv_file, liberal_parsing: true).with_index do |row, index|
      rows << row.compact.join(" | ")
      break if index >= 500
    end
    rows.join("\n")
  end
end

def all_supported_files(inputs, include_media: true)
  inputs.flat_map do |input|
    next [] unless File.exist?(input)

    if File.file?(input)
      [input]
    else
      Dir.glob(File.join(input, "**", "*"), File::FNM_DOTMATCH).select do |path|
        next false unless File.file?(path)
        next false if path.split(File::SEPARATOR).any? { |part| EXCLUDED_DIRS.include?(part) }

        ext = File.extname(path).downcase
        SUPPORTED_TEXT_EXTS.include?(ext) || (include_media && MEDIA_EXTS.include?(ext))
      end
    end
  end.compact.uniq.sort
end

def story_signal_excerpts(text, limit: 20)
  excerpts = []
  text.each_line.with_index(1) do |line, number|
    clean = ascii_clean(line.strip.gsub(/\s+/, " "))
    next if clean.length < 20
    next unless clean.match?(STORY_KEYWORDS)

    excerpts << { "line" => number, "text" => clean[0, 320] }
    break if excerpts.length >= limit
  end
  excerpts
end

def ascii_clean(text)
  replacements = {
    "\u2018" => "'",
    "\u2019" => "'",
    "\u201c" => '"',
    "\u201d" => '"',
    "\u2013" => "-",
    "\u2014" => "-",
    "\u2026" => "...",
    "\u2022" => "-"
  }
  text.each_char.map { |char| replacements.fetch(char, char) }.join
      .encode("US-ASCII", invalid: :replace, undef: :replace, replace: "")
end

def write_yaml(path, data)
  FileUtils.mkdir_p(File.dirname(path))
  File.write(path, YAML.dump(data))
end

def read_yaml(path)
  YAML.load_file(path)
end

def seed_sources(repo)
  [
    file_metadata(
      "/Users/stephanie/Dev/cluely-interview-prep-skill/templates/master_story_bank.txt",
      id: "SRC_MASTER_STORY_BANK_TEMPLATE",
      status: "seed",
      notes: "Existing reusable master story bank with 18 stable story IDs."
    ),
    file_metadata(
      File.join(repo, "interview-prep/myhealthteam-swoop/myhealthteam-swoop-stephanie-tailored-interview-strategy.md"),
      id: "SRC_MYHEALTHTEAM_TAILORED_STRATEGY",
      status: "scanned",
      notes: "Role-specific strategy with recommended story bank, WISDOM scale, automated messaging, and AI workshop candidates."
    ),
    file_metadata(
      File.join(repo, "interview-prep/myhealthteam-swoop/myhealthteam-cluely-answer-router.txt"),
      id: "SRC_MYHEALTHTEAM_ANSWER_ROUTER",
      status: "scanned",
      notes: "Role-specific answer router with question routes, story reuse rules, and placeholder warnings."
    ),
    file_metadata(
      File.join(repo, "interview-prep/cluely-interview-prep.md"),
      id: "SRC_CLUELY_INTERVIEW_PREP",
      status: "scanned",
      notes: "Generated Cluely prep with source anchors, metric references, and behavioral answer framing."
    ),
    file_metadata(
      "/Users/stephanie/Documents/Personal/All Possible Resume Items - Jan 2026.md",
      id: "SRC_ALL_POSSIBLE_RESUME_ITEMS_2026_01",
      status: "scanned",
      notes: "Broad resume fact bank and metrics source for Starlight, Kannact, and UCSF/WISDOM."
    ),
    file_metadata(
      "/Users/stephanie/Documents/Personal/Flashcards/Comprehensive PM Interview.docx",
      id: "SRC_COMPREHENSIVE_PM_INTERVIEW_FLASHCARDS",
      status: "scanned",
      notes: "Interview flashcards with answer scripts and reusable behavioral story framing."
    ),
    file_metadata(
      "/Users/stephanie/Documents/Personal/Flashcards/General PM Interview Prep.docx",
      id: "SRC_GENERAL_PM_INTERVIEW_PREP_FLASHCARDS",
      status: "scanned",
      notes: "General PM interview prep with question-to-story references and frameworks."
    ),
    file_metadata(
      "/Users/stephanie/Documents/Codex/2026-04-22-i-m-applying-for-this-role/GetWell_RhythmX_Interview_Context_Guide.md",
      id: "SRC_GETWELL_RHYTHMX_INTERVIEW_GUIDE",
      status: "scanned",
      notes: "GetWell/RhythmX interview context guide with ambulatory, AI, market, and execution framing."
    ),
    file_metadata(
      "/Users/stephanie/Documents/Easy Enroll/Story Notes - Easy Enroll.docx",
      id: "SRC_EASY_ENROLL_STORY_NOTES",
      status: "scanned",
      notes: "Older Easy Enroll workflow notes; likely source-only or possible variation on enrollment, eligibility, opt-out, and dependent workflows."
    )
  ]
end

def story(id, title, short_label, use_for, summary, extra = {})
  {
    "id" => id,
    "title" => title,
    "short_label" => short_label,
    "status" => extra.fetch("status", "canonical"),
    "themes" => extra.fetch("themes", []),
    "angles" => extra.fetch("angles", use_for),
    "question_types" => extra.fetch("question_types", use_for),
    "role_fit" => extra.fetch("role_fit", []),
    "summary" => summary,
    "situation" => extra.fetch("situation", ""),
    "task" => extra.fetch("task", ""),
    "actions" => extra.fetch("actions", []),
    "result" => extra.fetch("result", ""),
    "metrics" => extra.fetch("metrics", []),
    "companies" => extra.fetch("companies", []),
    "roles" => extra.fetch("roles", []),
    "time_period" => extra.fetch("time_period", "unknown"),
    "source_refs" => extra.fetch("source_refs", ["SRC_MASTER_STORY_BANK_TEMPLATE"]),
    "evidence_notes" => extra.fetch("evidence_notes", "Seeded from the existing master story bank; enrich from source files before using as a long STAR story."),
    "sensitivity_notes" => extra.fetch("sensitivity_notes", ""),
    "variation_of" => extra.fetch("variation_of", "")
  }
end

def seed_stories
  [
    story(
      "STORY_01_STARLIGHT_0_TO_1",
      "Starlight 0-to-1 Virtual Clinic",
      "Starlight 0-to-1 virtual clinic",
      ["product operations", "strategy to execution", "scaling", "early-stage healthcare"],
      "Helped turn the CEO's vision from a health benefit into a virtual clinic with intake, eligibility, insurance verification, visit workflows, escalation, billing logic, documentation, training, and feedback loops.",
      "themes" => ["0-to-1", "clinical-workflow", "strategy-execution"],
      "companies" => ["Starlight Healthcare", "Kannact"],
      "roles" => ["Chief Experience Officer", "VP of Patient Experience"],
      "source_refs" => ["SRC_MASTER_STORY_BANK_TEMPLATE", "SRC_CLUELY_INTERVIEW_PREP", "SRC_ALL_POSSIBLE_RESUME_ITEMS_2026_01"]
    ),
    story(
      "STORY_02_ENROLLMENT_JOURNEY",
      "Starlight Enrollment Journey Mapping",
      "Starlight enrollment journey mapping",
      ["ambiguity", "prioritization", "validation", "patient trust", "workflow redesign"],
      "Patients were referred and interested but not completing onboarding; mapped the journey with patient quotes, message threads, and funnel metrics; tested guided intake personally; helped create a new role that reached 70% activation within a year.",
      "themes" => ["activation", "patient-trust", "research", "workflow-redesign"],
      "metrics" => ["70% activation/referral-to-enrollment within about a year"],
      "companies" => ["Starlight Healthcare"],
      "roles" => ["VP of Patient Experience", "Chief Experience Officer"],
      "source_refs" => ["SRC_MASTER_STORY_BANK_TEMPLATE", "SRC_MYHEALTHTEAM_TAILORED_STRATEGY", "SRC_GETWELL_RHYTHMX_INTERVIEW_GUIDE", "SRC_ALL_POSSIBLE_RESUME_ITEMS_2026_01"]
    ),
    story(
      "STORY_03_HEALTH_SUMMARY_REPORT",
      "Health Summary Report",
      "Health Summary Report",
      ["clinical teams", "operational teams", "validation", "requirements", "data", "AI summaries", "launch"],
      "Built a report for primary care teams summarizing engagement, device data, goals, risks, gaps, and AI-generated summary context; partnered with design, clinical ops, and engineering; led QA and training.",
      "themes" => ["provider-facing-value", "data", "AI", "clinical-workflow"],
      "companies" => ["Kannact", "Starlight Healthcare"],
      "source_refs" => ["SRC_MASTER_STORY_BANK_TEMPLATE", "SRC_MYHEALTHTEAM_TAILORED_STRATEGY", "SRC_GENERAL_PM_INTERVIEW_PREP_FLASHCARDS"]
    ),
    story(
      "STORY_04_HEDIS_CARE_GAPS",
      "HEDIS Care Gap Workflow",
      "HEDIS care gap workflow",
      ["cross-functional alignment", "clinical/data/design/engineering work", "QA", "outcomes"],
      "Built HEDIS care gap workflow across clinical, data, design, engineering, QA, and operations; kept everyone grounded in making the information actionable during patient conversations; exceeded national HEDIS benchmarks by at least 10%.",
      "themes" => ["clinical-workflow", "cross-functional", "data", "outcomes"],
      "metrics" => ["Exceeded national HEDIS benchmarks by at least 10%"],
      "companies" => ["Kannact"],
      "source_refs" => ["SRC_MASTER_STORY_BANK_TEMPLATE", "SRC_MYHEALTHTEAM_TAILORED_STRATEGY"]
    ),
    story(
      "STORY_05_AI_CHART_SUMMARIES",
      "AI Chart Summaries",
      "AI chart summaries",
      ["AI in healthcare", "clinician trust", "AI adoption", "AI failure", "data transformation"],
      "Tested LLM-generated summaries to reduce 30-45 minute chart review; first output was not reliable enough; transformed FHIR JSON into cleaner human-readable input; brought clinicians into evaluation.",
      "themes" => ["AI", "clinician-trust", "failure-learning", "data"],
      "metrics" => ["30-45 minute chart review problem", "Documentation/chart review time reduced by 50%", "Care capacity increased by about 20%"],
      "companies" => ["Starlight Healthcare", "Kannact"],
      "source_refs" => ["SRC_MASTER_STORY_BANK_TEMPLATE", "SRC_MYHEALTHTEAM_TAILORED_STRATEGY", "SRC_GETWELL_RHYTHMX_INTERVIEW_GUIDE"]
    ),
    story(
      "STORY_06_AI_TRANSCRIPT_QA",
      "AI Transcript Quality Review",
      "AI transcript quality review",
      ["AI transcript analysis", "quality review", "feedback loops", "care-team training"],
      "Manual QA covered about 5% of patient calls; led AI transcript analysis to identify patterns at scale and feed insights into care-team training and workflow design.",
      "themes" => ["AI", "quality", "training", "feedback-loops"],
      "metrics" => ["Manual QA previously covered about 5% of patient calls"],
      "companies" => ["Starlight Healthcare", "Kannact"],
      "source_refs" => ["SRC_MASTER_STORY_BANK_TEMPLATE", "SRC_GENERAL_PM_INTERVIEW_PREP_FLASHCARDS"]
    ),
    story(
      "STORY_07_COST_UNCERTAINTY_BILLING",
      "Cost Uncertainty And Billing",
      "Cost uncertainty and billing",
      ["cross-functional problem solving", "ambiguity", "patient friction", "billing", "operational fixes"],
      "Patients hesitated because insurance coverage and out-of-pocket costs were unclear; brought care coordinators, billing, and data together; improved scripting and handoff in the short term while building a historical claims dataset for better prediction.",
      "themes" => ["billing", "patient-trust", "cross-functional", "ambiguity"],
      "companies" => ["Starlight Healthcare"],
      "source_refs" => ["SRC_MASTER_STORY_BANK_TEMPLATE", "SRC_GENERAL_PM_INTERVIEW_PREP_FLASHCARDS"]
    ),
    story(
      "STORY_08_POST_DISCHARGE_RESEARCH",
      "Post-Discharge Ethnographic Research",
      "Post-discharge ethnographic research",
      ["conflict", "influence", "discovery", "ambiguity", "caregiver insight", "patient journey"],
      "Went onsite to observe referral and discharge workflows; found referral model was too narrow and caregiver messaging was not landing; adjusted workflow and messaging; later used direct discharge feeds to convert about 50% of patients through outreach.",
      "themes" => ["research", "post-discharge", "influence", "patient-journey"],
      "metrics" => ["Direct discharge feeds later converted about 50% of patients through outreach"],
      "companies" => ["Starlight Healthcare"],
      "source_refs" => ["SRC_MASTER_STORY_BANK_TEMPLATE", "SRC_GETWELL_RHYTHMX_INTERVIEW_GUIDE"]
    ),
    story(
      "STORY_09_CONSENT_REQUIREMENT_CHANGE",
      "Consent Requirement Change",
      "Consent requirement change",
      ["changing requirements", "compliance", "legal review", "mid-sprint scope change"],
      "During intake-flow development, legal/compliance flagged consent needed explicit first and last name capture; updated requirements and acceptance criteria, documented the reason, and kept the release moving.",
      "themes" => ["compliance", "requirements", "scope-change"],
      "companies" => ["Starlight Healthcare"],
      "source_refs" => ["SRC_MASTER_STORY_BANK_TEMPLATE", "SRC_CLUELY_INTERVIEW_PREP"]
    ),
    story(
      "STORY_10_ENGINEERING_PUSHBACK",
      "Engineering Pushback In Grooming",
      "Engineering pushback in grooming",
      ["conflict", "technical collaboration", "requirements clarity", "bringing engineering in early"],
      "Engineers pushed back on requirements during grooming; slowed down, grounded conversation in problem/context/constraints, and learned to bring engineering in earlier so they could catch risks before build.",
      "themes" => ["engineering-collaboration", "conflict", "requirements"],
      "source_refs" => ["SRC_MASTER_STORY_BANK_TEMPLATE", "SRC_CLUELY_INTERVIEW_PREP"]
    ),
    story(
      "STORY_11_KANNACT_PLATFORM_REBUILD",
      "Kannact Care Platform Rebuild",
      "Kannact care platform rebuild",
      ["workflow improvement", "patient experience", "care-team operations", "platform differentiation"],
      "Discovery with clinicians, patient calls, and patient interviews showed patient experience issues came from operational friction; rebuilt care management platform around communication, scheduling, reminders, reporting, and engagement; increased engagement by 67%, nearly doubled activation, and reached 96% patient satisfaction.",
      "themes" => ["platform-rebuild", "patient-experience", "care-team-operations", "engagement"],
      "metrics" => ["Engagement increased by 67%", "Activation nearly doubled", "96% patient satisfaction", "NPS 82"],
      "companies" => ["Kannact"],
      "roles" => ["Senior Product Manager", "Director of Product", "VP of Product"],
      "source_refs" => ["SRC_MASTER_STORY_BANK_TEMPLATE", "SRC_MYHEALTHTEAM_TAILORED_STRATEGY", "SRC_ALL_POSSIBLE_RESUME_ITEMS_2026_01", "SRC_GETWELL_RHYTHMX_INTERVIEW_GUIDE"]
    ),
    story(
      "STORY_12_EHR_INTEGRATION_BUILD_BUY",
      "EHR Integration / Build vs Buy",
      "EHR integration / build vs buy",
      ["technical product judgment", "integrations", "interoperability", "build vs buy"],
      "Considered direct EHR integrations but decided system-by-system would not scale; built a FHIR layer and used HIE networks to move the right information at the right time without locking into one vendor or EHR system.",
      "themes" => ["technical-judgment", "interoperability", "build-vs-buy"],
      "companies" => ["Kannact", "Starlight Healthcare"],
      "source_refs" => ["SRC_MASTER_STORY_BANK_TEMPLATE", "SRC_GETWELL_RHYTHMX_INTERVIEW_GUIDE"]
    ),
    story(
      "STORY_13_AI_PERSONAL_WORKFLOW",
      "AI For Personal Product Workflow",
      "AI for personal product workflow",
      ["AI in personal work", "productivity", "documentation", "market research", "requirements"],
      "Uses AI for drafting, care-team scripting, requirements, launch planning, SQL/YAML help, transcriptions, SOPs, product docs, and weekly market research automation; reviews outputs because AI is not the source of truth.",
      "themes" => ["AI", "product-craft", "personal-automation"],
      "source_refs" => ["SRC_MASTER_STORY_BANK_TEMPLATE", "SRC_GENERAL_PM_INTERVIEW_PREP_FLASHCARDS"]
    ),
    story(
      "STORY_14_CARE_GAPS_LAUNCH",
      "Care Gaps Launch Readiness",
      "Care gaps launch readiness",
      ["QA", "launch", "training", "post-launch workflow fit"],
      "Launched care gap feature by making sure care teams knew when to bring up care gaps, how to talk about them with patients, and how the information fit into the existing workflow.",
      "themes" => ["launch-readiness", "training", "clinical-workflow"],
      "companies" => ["Kannact"],
      "source_refs" => ["SRC_MASTER_STORY_BANK_TEMPLATE"]
    ),
    story(
      "STORY_15_WHITE_LABEL_QA",
      "White-Label QA",
      "White-label QA",
      ["QA", "launch risk", "patient-facing experience", "edge cases"],
      "For a white-labeled experience, tested brands, automated emails, scheduling links, and patient paths to ensure patients did not get the wrong experience.",
      "themes" => ["QA", "launch-risk", "patient-facing"],
      "source_refs" => ["SRC_MASTER_STORY_BANK_TEMPLATE"]
    ),
    story(
      "STORY_16_CLINICIAN_GEMINI_WORKSHOPS",
      "Clinician AI Workshops",
      "Clinician AI workshops",
      ["AI adoption", "culture change", "clinician enablement", "safe AI use"],
      "Ran workshops with clinicians to teach safe Gemini use, make AI feel less intimidating, and show practical ways AI could make their work more efficient.",
      "themes" => ["AI", "enablement", "clinician-adoption"],
      "source_refs" => ["SRC_MASTER_STORY_BANK_TEMPLATE", "SRC_MYHEALTHTEAM_TAILORED_STRATEGY"]
    ),
    story(
      "STORY_17_WEAKNESS_PLATFORM_TRANSITION",
      "Platform Transition Tradeoff",
      "Platform transition tradeoff",
      ["weakness", "tradeoffs", "prioritization", "shipping before perfect"],
      "During internal platform rebuild, clinicians used old and new systems during transition; learned that sometimes it is better to tolerate temporary mess if it lets the team ship more valuable functionality sooner.",
      "themes" => ["tradeoffs", "weakness", "prioritization", "platform-rebuild"],
      "companies" => ["Kannact"],
      "source_refs" => ["SRC_MASTER_STORY_BANK_TEMPLATE", "SRC_CLUELY_INTERVIEW_PREP"]
    ),
    story(
      "STORY_18_CODEX_RESUME_AUTOMATION",
      "Codex Resume Automation",
      "Codex resume automation",
      ["learning mindset", "AI fluency", "agentic workflows", "experimentation", "personal automation", "staying current"],
      "Recently became more intentional about learning AI; completed an agentic course; went deep in Codex and built an automation that reviews resume, background, and role criteria, then creates a tailored resume, cover letter, and role-specific website landing page with more color and personality while keeping human review and judgment in the loop.",
      "themes" => ["AI", "learning", "agentic-workflows", "personal-automation"],
      "source_refs" => ["SRC_MASTER_STORY_BANK_TEMPLATE"]
    )
  ]
end

def seed_themes
  {
    "schema_version" => 1,
    "themes" => [
      { "id" => "0-to-1", "label" => "0-to-1 product and operating model" },
      { "id" => "activation", "label" => "Activation, onboarding, and conversion" },
      { "id" => "AI", "label" => "AI workflow, adoption, and validation" },
      { "id" => "ambiguity", "label" => "Ambiguity and problem framing" },
      { "id" => "billing", "label" => "Billing, cost transparency, and reimbursement friction" },
      { "id" => "build-vs-buy", "label" => "Build vs buy and vendor/product judgment" },
      { "id" => "care-team-operations", "label" => "Care-team operations and workflow design" },
      { "id" => "clinical-workflow", "label" => "Clinical workflow and launch readiness" },
      { "id" => "clinician-trust", "label" => "Clinician trust and adoption" },
      { "id" => "compliance", "label" => "Compliance-aware product work" },
      { "id" => "conflict", "label" => "Conflict, pushback, and alignment" },
      { "id" => "cross-functional", "label" => "Cross-functional execution" },
      { "id" => "data", "label" => "Data, metrics, and insight synthesis" },
      { "id" => "engagement", "label" => "Engagement, retention, and reactivation" },
      { "id" => "failure-learning", "label" => "Mistakes, failures, and learning" },
      { "id" => "interoperability", "label" => "FHIR, EHR, HIE, and integrations" },
      { "id" => "launch-readiness", "label" => "QA, training, SOPs, and release readiness" },
      { "id" => "patient-experience", "label" => "Patient experience and service design" },
      { "id" => "patient-journey", "label" => "Patient journey and between-visit care" },
      { "id" => "patient-trust", "label" => "Patient trust, burden, and cognitive load" },
      { "id" => "platform-rebuild", "label" => "Platform rebuilds and modernization" },
      { "id" => "post-discharge", "label" => "Post-discharge and transitional care" },
      { "id" => "product-craft", "label" => "Product craft and personal operating system" },
      { "id" => "provider-facing-value", "label" => "Provider-facing value and commercial proof" },
      { "id" => "QA", "label" => "QA, edge cases, and launch risk" },
      { "id" => "requirements", "label" => "Requirements, acceptance criteria, and SDLC" },
      { "id" => "research", "label" => "Discovery, interviews, and ethnographic research" },
      { "id" => "strategy-execution", "label" => "Strategy-to-execution translation" },
      { "id" => "technical-judgment", "label" => "Technical product judgment" },
      { "id" => "tradeoffs", "label" => "Tradeoffs and prioritization" },
      { "id" => "training", "label" => "Training and enablement" }
    ],
    "angle_examples" => [
      "patient trust", "workflow redesign", "AI guardrails", "clinician adoption",
      "cost uncertainty", "engineering pushback", "launch risk", "personalization",
      "consumer digital health scale", "community activation"
    ],
    "question_type_examples" => [
      "tell me about yourself", "why this role", "ambiguity", "prioritization",
      "conflict", "failure", "AI in healthcare", "requirements", "metrics",
      "cross-functional", "launch", "build vs buy", "patient engagement",
      "scale", "consumer product", "weakness"
    ]
  }
end

def seed_routes
  {
    "schema_version" => 1,
    "routes" => [
      {
        "id" => "ROUTE_TELL_ME_ABOUT_YOURSELF",
        "generic_question" => "Tell me about yourself.",
        "clue_phrases" => ["walk me through your background", "career story", "tell me about yourself"],
        "primary_story" => "STORY_01_STARLIGHT_0_TO_1",
        "backup_stories" => ["STORY_11_KANNACT_PLATFORM_REBUILD", "STORY_13_AI_PERSONAL_WORKFLOW"],
        "angle" => "Strategy-to-execution healthcare product leader who stays hands-on."
      },
      {
        "id" => "ROUTE_AMBIGUITY_PRIORITIZATION",
        "generic_question" => "Tell me about a time you handled ambiguity or prioritized a messy problem.",
        "clue_phrases" => ["ambiguous", "prioritize", "messy", "unclear problem", "biggest constraint"],
        "primary_story" => "STORY_02_ENROLLMENT_JOURNEY",
        "backup_stories" => ["STORY_07_COST_UNCERTAINTY_BILLING", "STORY_08_POST_DISCHARGE_RESEARCH"],
        "angle" => "Find the real constraint before jumping to features."
      },
      {
        "id" => "ROUTE_AI_HEALTHCARE",
        "generic_question" => "How have you used AI in healthcare product work?",
        "clue_phrases" => ["AI", "GenAI", "LLM", "automation", "summaries", "transcripts"],
        "primary_story" => "STORY_05_AI_CHART_SUMMARIES",
        "backup_stories" => ["STORY_06_AI_TRANSCRIPT_QA", "STORY_16_CLINICIAN_GEMINI_WORKSHOPS", "STORY_13_AI_PERSONAL_WORKFLOW"],
        "angle" => "AI must reduce workflow burden without creating new trust or review burden."
      },
      {
        "id" => "ROUTE_CROSS_FUNCTIONAL_REQUIREMENTS",
        "generic_question" => "How do you work cross-functionally or gather requirements?",
        "clue_phrases" => ["requirements", "cross-functional", "engineering", "clinical", "operations", "design", "QA"],
        "primary_story" => "STORY_03_HEALTH_SUMMARY_REPORT",
        "backup_stories" => ["STORY_04_HEDIS_CARE_GAPS", "STORY_10_ENGINEERING_PUSHBACK", "STORY_09_CONSENT_REQUIREMENT_CHANGE"],
        "angle" => "Requirements need to be buildable, testable, trainable, and connected to workflow reality."
      },
      {
        "id" => "ROUTE_PATIENT_ENGAGEMENT",
        "generic_question" => "What is your strongest patient engagement story?",
        "clue_phrases" => ["patient engagement", "activation", "retention", "conversion", "onboarding"],
        "primary_story" => "STORY_11_KANNACT_PLATFORM_REBUILD",
        "backup_stories" => ["STORY_02_ENROLLMENT_JOURNEY", "STORY_08_POST_DISCHARGE_RESEARCH"],
        "angle" => "Engagement improves when the product respects patient burden, trust, and timing."
      },
      {
        "id" => "ROUTE_BUILD_VS_BUY_INTEGRATIONS",
        "generic_question" => "How do you think about build vs buy or integrations?",
        "clue_phrases" => ["build vs buy", "EHR", "FHIR", "integration", "vendor", "interoperability"],
        "primary_story" => "STORY_12_EHR_INTEGRATION_BUILD_BUY",
        "backup_stories" => ["STORY_03_HEALTH_SUMMARY_REPORT", "STORY_05_AI_CHART_SUMMARIES"],
        "angle" => "Pick scalable integration patterns that move the right information at the right time."
      },
      {
        "id" => "ROUTE_FAILURE_WEAKNESS",
        "generic_question" => "Tell me about a failure, mistake, or weakness.",
        "clue_phrases" => ["failure", "mistake", "weakness", "learned", "tradeoff", "wish you did differently"],
        "primary_story" => "STORY_05_AI_CHART_SUMMARIES",
        "backup_stories" => ["STORY_17_WEAKNESS_PLATFORM_TRANSITION", "STORY_10_ENGINEERING_PUSHBACK"],
        "angle" => "The lesson is better validation, sequencing, and earlier stakeholder involvement."
      }
    ],
    "notes" => "Generic router seeded from existing master story bank. Add role-specific routes in interview-prep folders."
  }
end

def init_bank(repo, date:, force: false)
  ensure_bank_dirs(repo)
  files = {
    bank_path(repo, "data/stories.yml") => { "schema_version" => 1, "stories" => seed_stories },
    bank_path(repo, "data/sources.yml") => { "schema_version" => 1, "sources" => seed_sources(repo) },
    bank_path(repo, "data/themes.yml") => seed_themes,
    bank_path(repo, "data/question-routes.yml") => seed_routes
  }

  files.each do |path, data|
    if File.exist?(path) && !force
      warn "Skipping existing file: #{path}"
      next
    end
    write_yaml(path, data)
  end

  write_initial_candidate_report(repo, date, force: force)
  write_discovery_report(repo, date, force: force)
  export_bank(repo)
  validate_bank(repo)
end

def write_initial_candidate_report(repo, date, force: false)
  path = bank_path(repo, "inbox/candidates/initial-discovery-#{date}.md")
  return if File.exist?(path) && !force

  content = <<~MD
    # Initial Story Candidate Review - #{date}

    ## Summary

    - Input: existing interview-prep folder, resume fact bank, PM interview prep docs, GetWell guide, Easy Enroll notes.
    - Canonical stories seeded: 18 from the existing master story bank.
    - New canonical stories added beyond seed: 0.
    - Recommended review-first candidates: 5.
    - Duplicates skipped: existing Starlight, Kannact, AI, HEDIS, billing, requirements, and post-discharge stories already map to canonical seed IDs.

    ## Added Or Proposed Stories

    ### CANDIDATE_WISDOM_PARTICIPANT_SCALE

    - Classification: `new_story`
    - Existing story relationship: not covered by the 18-story seed bank.
    - Why it is unique: it is Stephanie's strongest larger-scale consumer digital health story, with 40,000+ participants, 42% enrollment conversion lift, and 93% faster activation.
    - Best themes: activation, consumer digital health scale, patient onboarding, UCSF.
    - Best question types: scale, consumer product, activation, MAU growth, digital health beyond clinic operations.
    - Evidence: `SRC_MYHEALTHTEAM_TAILORED_STRATEGY`, `SRC_MYHEALTHTEAM_ANSWER_ROUTER`, `SRC_ALL_POSSIBLE_RESUME_ITEMS_2026_01`.
    - Recommended action: add as `STORY_19_WISDOM_PARTICIPANT_SCALE` after Stephanie confirms the STAR details behind what changed.

    ### CANDIDATE_KANNACT_AUTOMATED_MESSAGING_HUMAN

    - Classification: `meaningful_variation`
    - Existing story relationship: variation of `STORY_11_KANNACT_PLATFORM_REBUILD`.
    - Why it is unique: same platform era, but narrower and reusable for automation-without-losing-human-trust questions.
    - Best themes: engagement, reactivation, automation, patient trust.
    - Best question types: engagement loops, retention, reactivation, product taste, personalization.
    - Evidence: `SRC_MYHEALTHTEAM_TAILORED_STRATEGY`, `SRC_ALL_POSSIBLE_RESUME_ITEMS_2026_01`.
    - Recommended action: add as a variation only if Stephanie wants a separate answer from the broader Kannact rebuild story.

    ### CANDIDATE_PRODUCT_DATA_CHAT_AI_WORKSHOP

    - Classification: `new_story` or `meaningful_variation`
    - Existing story relationship: adjacent to `STORY_13_AI_PERSONAL_WORKFLOW` and `STORY_16_CLINICIAN_GEMINI_WORKSHOPS`.
    - Why it is unique: focuses on team-level AI/data enablement and PM operating leverage rather than personal AI use or clinician adoption.
    - Best themes: AI, data-driven culture, PM craft, small-team leverage.
    - Best question types: AI curiosity, team enablement, data culture, experimentation.
    - Evidence: `SRC_MYHEALTHTEAM_TAILORED_STRATEGY`.
    - Recommended action: keep `needs_review` until the workshop details, participants, outcome, and current status are confirmed.

    ### CANDIDATE_EASY_ENROLL_DEPENDENT_OPT_OUT_WORKFLOW

    - Classification: `source_only` or `meaningful_variation`
    - Existing story relationship: adjacent to `STORY_02_ENROLLMENT_JOURNEY`, `STORY_07_COST_UNCERTAINTY_BILLING`, and `STORY_09_CONSENT_REQUIREMENT_CHANGE`.
    - Why it may be unique: it captures older eligibility, opt-out, dependent invitation, Mailchimp/Gladstone, and HIPAA workflow tradeoffs.
    - Best themes: eligibility, enrollment operations, compliance, patient communication.
    - Best question types: requirements, edge cases, operational workflow, HIPAA-aware design.
    - Evidence: `SRC_EASY_ENROLL_STORY_NOTES`.
    - Recommended action: keep source-only unless Stephanie wants a separate old-Kannact enrollment operations story.

    ### CANDIDATE_WISDOM_QA_MODERATION_PLACEHOLDER

    - Classification: `needs_review`
    - Existing story relationship: adjacent to WISDOM scale, but explicitly marked as a placeholder in the MyHealthTeam router.
    - Why it is not canonical yet: source says it should not be over-weighted until Stephanie confirms details.
    - Best themes: community, moderation, participant privacy, webinars.
    - Best question types: community/UGC only after confirmation.
    - Evidence: `SRC_MYHEALTHTEAM_ANSWER_ROUTER`.
    - Recommended action: do not add to canonical stories without Stephanie confirmation.

    ## New Angles

    - Attach "community activation and first contribution" as a role-specific angle to `STORY_02_ENROLLMENT_JOURNEY` and `STORY_11_KANNACT_PLATFORM_REBUILD`.
    - Attach "AI reduces uncertainty, not just effort" to `STORY_05_AI_CHART_SUMMARIES`.
    - Attach "workflow-first requirements are launchable requirements" to `STORY_03_HEALTH_SUMMARY_REPORT`, `STORY_04_HEDIS_CARE_GAPS`, and `STORY_09_CONSENT_REQUIREMENT_CHANGE`.

    ## Duplicates Not Added

    - Starlight 0-to-1, enrollment journey, AI chart summaries, Health Summary Report, HEDIS care gaps, engineering pushback, and cost uncertainty appear in multiple prep files but are already represented by stable canonical IDs.

    ## Needs Stephanie Review

    - Whether WISDOM participant scale should become canonical now.
    - Whether automated messaging deserves its own story or remains an angle of the Kannact rebuild.
    - Whether Product Data Chat / AI Workshop had a concrete enough outcome to become canonical.

    ## Next Actions

    - Review the five candidates above.
    - Approve any canonical additions.
    - Run `ruby ~/.codex/skills/interview-story-bank/scripts/story_bank.rb export --repo "#{repo}"` after approved edits.
  MD

  File.write(path, content)
end

def write_discovery_report(repo, date, force: false)
  path = bank_path(repo, "reports/discovery-pass-#{date}.md")
  return if File.exist?(path) && !force

  content = <<~MD
    # Discovery Pass - #{date}

    ## Summary

    Created the initial structured story-bank repository in review-first mode.

    - Canonical stories seeded: 18.
    - Source records seeded: #{seed_sources(repo).length}.
    - Text/document source types covered by scripts: Markdown, TXT, JSON, YAML, HTML, DOCX, PDF, RTF, CSV, XLSX.
    - Raw audio/video policy: metadata only unless Stephanie explicitly requests transcription.
    - Candidate review file: `story-bank/inbox/candidates/initial-discovery-#{date}.md`.

    ## Most Important Findings

    - The existing master story bank is a strong seed, but it missed at least one likely reusable canonical story: WISDOM participant scale.
    - The MyHealthTeam prep has several role-specific bridges that should become angles, not duplicate stories.
    - Easy Enroll notes are useful evidence for old enrollment/eligibility workflow complexity, but should stay source-only unless Stephanie wants a separate legacy enrollment operations story.
    - Placeholder stories should remain `needs_review`; the bank should not promote them silently.

    ## Recommended Next Additions

    1. Add WISDOM participant scale as a canonical story after Stephanie confirms narrative details.
    2. Decide whether automated messaging that stayed human is a standalone variation or a route under Kannact rebuild.
    3. Add question routes for scale, consumer product, community activation, and MAU growth after WISDOM is approved.

    ## Repeatable Process

    For any new downloaded document:

    ```bash
    ruby ~/.codex/skills/interview-story-bank/scripts/story_bank.rb scan --repo "#{repo}" --input "/path/to/new-document"
    ```

    Then use the candidate report to decide whether to approve YAML updates.
  MD

  File.write(path, content)
end

def export_bank(repo)
  stories = read_yaml(bank_path(repo, "data/stories.yml")).fetch("stories")
  routes = read_yaml(bank_path(repo, "data/question-routes.yml")).fetch("routes")

  master = ["# Master Interview Story Bank", ""]
  master << "Generated from `story-bank/data/stories.yml`."
  master << ""
  stories.each do |story|
    master << "## #{story["id"]}: #{story["short_label"]}"
    master << ""
    master << "- Status: #{story["status"]}"
    master << "- Themes: #{Array(story["themes"]).join(", ")}"
    master << "- Use for: #{Array(story["question_types"]).join(", ")}"
    master << "- Companies: #{Array(story["companies"]).join(", ")}" unless Array(story["companies"]).empty?
    master << "- Metrics: #{Array(story["metrics"]).join("; ")}" unless Array(story["metrics"]).empty?
    master << "- Source refs: #{Array(story["source_refs"]).join(", ")}"
    master << ""
    master << story["summary"].to_s
    master << ""
  end
  File.write(bank_path(repo, "exports/master-story-bank.md"), master.join("\n"))

  router = ["# Generic Question-To-Story Router", ""]
  router << "Generated from `story-bank/data/question-routes.yml`."
  router << ""
  routes.each do |route|
    router << "## #{route["id"]}"
    router << ""
    router << "- Generic question: #{route["generic_question"]}"
    router << "- Clue phrases: #{Array(route["clue_phrases"]).join(", ")}"
    router << "- Primary story: #{route["primary_story"]}"
    router << "- Backup stories: #{Array(route["backup_stories"]).join(", ")}"
    router << "- Angle: #{route["angle"]}"
    router << ""
  end
  File.write(bank_path(repo, "exports/question-to-story-router.md"), router.join("\n"))
end

def validate_bank(repo)
  errors = []
  stories_path = bank_path(repo, "data/stories.yml")
  sources_path = bank_path(repo, "data/sources.yml")
  routes_path = bank_path(repo, "data/question-routes.yml")
  themes_path = bank_path(repo, "data/themes.yml")

  [stories_path, sources_path, routes_path, themes_path].each do |path|
    errors << "Missing required data file: #{path}" unless File.file?(path)
  end
  raise errors.join("\n") unless errors.empty?

  stories_data = read_yaml(stories_path)
  sources_data = read_yaml(sources_path)
  routes_data = read_yaml(routes_path)

  stories = stories_data["stories"] || []
  sources = sources_data["sources"] || []
  source_ids = sources.map { |source| source["id"] }
  story_ids = stories.map { |story| story["id"] }

  stories.each do |story|
    missing = REQUIRED_STORY_FIELDS.reject { |field| story.key?(field) }
    errors << "#{story["id"] || "UNKNOWN"} missing fields: #{missing.join(", ")}" unless missing.empty?
    Array(story["source_refs"]).each do |source_id|
      errors << "#{story["id"]} references missing source #{source_id}" unless source_ids.include?(source_id)
    end
  end

  routes_data.fetch("routes", []).each do |route|
    ([route["primary_story"]] + Array(route["backup_stories"])).compact.each do |story_id|
      errors << "#{route["id"]} references missing story #{story_id}" unless story_ids.include?(story_id)
    end
  end

  if story_ids.length != story_ids.uniq.length
    duplicates = story_ids.group_by(&:itself).select { |_id, ids| ids.length > 1 }.keys
    errors << "Duplicate story IDs: #{duplicates.join(", ")}"
  end

  raise errors.join("\n") unless errors.empty?

  puts "OK: #{stories.length} stories, #{sources.length} sources, #{routes_data.fetch("routes", []).length} routes validated."
end

def scan_inputs(repo, inputs, date:, out_path: nil)
  raise "Provide at least one --input path" if inputs.empty?

  ensure_bank_dirs(repo)
  files = all_supported_files(inputs)
  timestamp = "#{date.delete("-")}-#{Time.now.strftime("%H%M%S")}"
  out_path ||= bank_path(repo, "inbox/candidates/scan-#{date}-#{timestamp}.md")

  lines = ["# Story Bank Scan Report - #{date}", ""]
  lines << "## Summary"
  lines << ""
  lines << "- Input: #{inputs.join(", ")}"
  lines << "- Files discovered: #{files.length}"
  lines << "- Review mode: review-first"
  lines << "- Canonical updates made: 0"
  lines << ""

  lines << "## Source Inventory"
  lines << ""
  files.each_with_index do |file, index|
    ext = File.extname(file).downcase
    media = MEDIA_EXTS.include?(ext)
    sha = File.file?(file) ? Digest::SHA256.file(file).hexdigest : ""
    lines << "#{index + 1}. `#{file}`"
    lines << "   - Kind: #{kind_for(file)}"
    lines << "   - SHA-256: #{sha}"
    lines << "   - Policy: #{media ? "metadata only" : "extractable text"}"
  end
  lines << ""

  lines << "## Potential Story Signals"
  lines << ""
  files.each do |file|
    next if MEDIA_EXTS.include?(File.extname(file).downcase)

    text = extract_text(file)
    excerpts = story_signal_excerpts(text)
    next if excerpts.empty?

    lines << "### #{file}"
    lines << ""
    excerpts.each do |excerpt|
      lines << "- Line #{excerpt["line"]}: #{excerpt["text"]}"
    end
    lines << ""
  rescue StandardError => e
    lines << "### #{file}"
    lines << ""
    lines << "- Extraction error: #{e.message}"
    lines << ""
  end

  lines << "## Classification Workspace"
  lines << ""
  lines << "Use Codex semantic review plus `references/classification-rules.md` to fill this section."
  lines << ""
  lines << "### Added Or Proposed Stories"
  lines << ""
  lines << "### Variations"
  lines << ""
  lines << "### New Angles"
  lines << ""
  lines << "### Duplicates Not Added"
  lines << ""
  lines << "### Source-Only Evidence"
  lines << ""
  lines << "### Needs Stephanie Review"
  lines << ""
  lines << "## Next Actions"
  lines << ""
  lines << "- Approve any proposed canonical additions before editing `story-bank/data/stories.yml`."
  lines << "- Run `export` and `validate` after approved edits."

  File.write(out_path, lines.join("\n"))
  puts out_path
end

def usage
  warn <<~USAGE
    Usage:
      story_bank.rb init --repo PATH [--date YYYY-MM-DD] [--force]
      story_bank.rb scan --repo PATH --input FILE_OR_DIR [--input FILE_OR_DIR] [--date YYYY-MM-DD] [--out PATH]
      story_bank.rb extract --input FILE [--out PATH]
      story_bank.rb export --repo PATH
      story_bank.rb validate --repo PATH
  USAGE
  exit 1
end

command = ARGV.shift || usage
options = {
  repo: DEFAULT_REPO,
  inputs: [],
  date: DEFAULT_DATE,
  force: false,
  out: nil
}

parser = OptionParser.new do |opts|
  opts.on("--repo PATH") { |value| options[:repo] = value }
  opts.on("--input PATH") { |value| options[:inputs] << value }
  opts.on("--date DATE") { |value| options[:date] = value }
  opts.on("--force") { options[:force] = true }
  opts.on("--out PATH") { |value| options[:out] = value }
  opts.on("-h", "--help") { usage }
end
parser.parse!(ARGV)

begin
  case command
  when "init"
    init_bank(options[:repo], date: options[:date], force: options[:force])
  when "scan"
    scan_inputs(options[:repo], options[:inputs], date: options[:date], out_path: options[:out])
  when "extract"
    raise "Provide exactly one --input file" unless options[:inputs].length == 1

    text = extract_text(options[:inputs].first)
    if options[:out]
      FileUtils.mkdir_p(File.dirname(options[:out]))
      File.write(options[:out], text)
      puts options[:out]
    else
      puts text
    end
  when "export"
    export_bank(options[:repo])
    puts "OK: exports generated."
  when "validate"
    validate_bank(options[:repo])
  else
    usage
  end
rescue StandardError => e
  warn "ERROR: #{e.message}"
  exit 1
end
