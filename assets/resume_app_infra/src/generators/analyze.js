import path from "node:path";
import { readYaml, readText, writeJson, writeText } from "../lib/files.js";
import { getClaimsByIds, getMetricsByIds, loadSourceLibrary } from "../config/source-library.js";
import { claimPurposeFamilyIds } from "../lib/resume-bullet-distinctness.js";
import { sanitizeFinalText, todayDisplayDate, uniqueValues } from "../lib/strings.js";

const KEYWORD_TAGS = [
  ["ai", ["healthcare_ai", "medical_record_summarization", "documentation"]],
  ["ai systems", ["healthcare_ai", "product_requirements", "data_sharing", "dashboards"]],
  ["ai infrastructure", ["healthcare_ai", "product_requirements", "data_sharing", "dashboards"]],
  ["ml systems", ["healthcare_ai", "product_requirements", "data_sharing", "dashboards"]],
  ["ml infrastructure", ["healthcare_ai", "product_requirements", "data_sharing", "dashboards"]],
  ["model evaluation", ["healthcare_ai", "product_requirements", "dashboards", "data_sharing"]],
  ["benchmark", ["product_requirements", "dashboards", "data_sharing"]],
  ["post-training", ["healthcare_ai", "workflow_automation", "voc", "dashboards"]],
  ["post training", ["healthcare_ai", "workflow_automation", "voc", "dashboards"]],
  ["feedback loop", ["voc", "dashboards", "product_requirements", "participant_experience"]],
  ["structured data", ["data_sharing", "fhir", "interoperability", "product_requirements"]],
  ["relational data", ["data_sharing", "fhir", "interoperability", "product_requirements"]],
  ["tabular", ["data_sharing", "fhir", "interoperability", "product_requirements"]],
  ["warehouse", ["data_sharing", "interoperability", "dashboards"]],
  ["lakehouse", ["data_sharing", "interoperability", "dashboards"]],
  ["learning efficiency", ["healthcare_ai", "data_sharing", "dashboards"]],
  ["data efficiency", ["healthcare_ai", "data_sharing", "dashboards"]],
  ["model performance", ["healthcare_ai", "dashboards", "product_requirements"]],
  ["automation", ["healthcare_ai", "workflow_automation", "operations"]],
  ["product operations", ["strategy_to_execution", "roadmap", "product_requirements", "operations"]],
  ["platform operations", ["strategy_to_execution", "operations", "workflow_automation", "dashboards", "implementation"]],
  ["platform ops", ["strategy_to_execution", "operations", "workflow_automation", "dashboards", "implementation"]],
  ["operational tooling", ["operations", "workflow_automation", "dashboards", "implementation"]],
  ["workflow infrastructure", ["operations", "workflow_automation", "product_requirements", "implementation"]],
  ["workflow failures", ["operations", "dashboards", "quality", "risk"]],
  ["operational bottlenecks", ["operations", "dashboards", "operational_efficiency", "problem_solving"]],
  ["support workflows", ["operations", "patient_access", "participant_experience", "workflow_automation"]],
  ["onboarding", ["implementation", "adoption", "partner_enablement", "operations"]],
  ["new market launches", ["implementation", "launch", "operations", "strategy_to_execution"]],
  ["product innovation", ["strategy_to_execution", "roadmap", "voc", "launch"]],
  ["new product innovation", ["strategy_to_execution", "roadmap", "voc", "launch"]],
  ["npi", ["strategy_to_execution", "roadmap", "voc", "launch"]],
  ["gate process", ["strategy_to_execution", "operations", "launch"]],
  ["business case", ["strategy_to_execution", "commercial", "dashboards"]],
  ["financial modeling", ["strategy_to_execution", "commercial", "dashboards"]],
  ["roi", ["strategy_to_execution", "commercial", "dashboards"]],
  ["customer voice", ["voc", "product_requirements", "participant_experience"]],
  ["operating system", ["strategy_to_execution", "roadmap", "operations"]],
  ["operating cadence", ["strategy_to_execution", "operations"]],
  ["planning cycle", ["roadmap", "strategy_to_execution"]],
  ["product review", ["product_requirements", "strategy_to_execution"]],
  ["execution tracking", ["strategy_to_execution", "operations"]],
  ["prd", ["product_requirements", "strategy_to_execution"]],
  ["pm onboarding", ["partner_enablement", "implementation", "adoption"]],
  ["pm enablement", ["partner_enablement", "implementation", "adoption"]],
  ["clinical", ["clinical_workflows", "clinical_needs", "clinical_quality"]],
  ["clinician", ["clinical_workflows", "clinicians", "provider_workflows"]],
  ["provider", ["clinical_workflows", "provider_workflows", "health_systems"]],
  ["ambulatory", ["ambulatory", "clinical_workflows"]],
  ["post-discharge", ["post_discharge", "virtual_care"]],
  ["health system", ["health_systems", "enterprise_adoption"]],
  ["enterprise", ["enterprise_adoption", "partner_enablement", "health_systems"]],
  ["implementation", ["implementation", "launch", "adoption"]],
  ["roadmap", ["roadmap", "product_requirements", "strategy_to_execution"]],
  ["strategy", ["strategy_to_execution", "roadmap"]],
  ["pharmacy", ["clinical_workflows", "provider_workflows", "health_systems", "data_sharing"]],
  ["pharmacist", ["clinical_workflows", "provider_workflows", "health_systems"]],
  ["medication", ["clinical_workflows", "provider_workflows", "data_sharing"]],
  ["informatics", ["data_sharing", "product_requirements", "health_systems"]],
  ["clinical decision support", ["clinical_workflows", "product_requirements", "data_sharing"]],
  ["drug", ["clinical_workflows", "data_sharing", "compliance"]],
  ["medical device", ["clinical_workflows", "data_sharing", "compliance"]],
  ["glucose monitoring", ["clinical_workflows", "clinical_quality", "provider_workflows"]],
  ["diabetes", ["clinical_workflows", "clinical_quality", "participant_experience"]],
  ["hcp", ["provider_workflows", "partner_enablement", "voc"]],
  ["health care professional", ["provider_workflows", "partner_enablement", "voc"]],
  ["healthcare professional", ["provider_workflows", "partner_enablement", "voc"]],
  ["peer-to-peer", ["partner_enablement", "strategy_to_execution", "compliance", "dashboards"]],
  ["peer to peer", ["partner_enablement", "strategy_to_execution", "compliance", "dashboards"]],
  ["speaker bureau", ["partner_enablement", "implementation", "compliance"]],
  ["speaker's bureau", ["partner_enablement", "implementation", "compliance"]],
  ["speaker training", ["partner_enablement", "implementation", "compliance"]],
  ["product theater", ["partner_enablement", "implementation", "compliance"]],
  ["tradeshow", ["partner_enablement", "implementation", "commercial"]],
  ["trade show", ["partner_enablement", "implementation", "commercial"]],
  ["field training", ["partner_enablement", "implementation", "commercial"]],
  ["pharma", ["clinical_workflows", "compliance", "clinical_research", "research_operations"]],
  ["pharmaceutical", ["clinical_workflows", "compliance", "clinical_research", "research_operations"]],
  ["therapeutic", ["clinical_workflows", "clinical_research", "clinical_quality"]],
  ["omnichannel", ["omnichannel", "patient_communication", "engagement"]],
  ["salesforce marketing cloud", ["omnichannel", "patient_communication", "engagement"]],
  ["user stories", ["product_requirements", "strategy_to_execution"]],
  ["use cases", ["product_requirements", "strategy_to_execution"]],
  ["claim", ["billing", "operations", "product_requirements", "strategy_to_execution"]],
  ["claims", ["billing", "operations", "product_requirements", "strategy_to_execution"]],
  ["adjudication", ["billing", "operations", "product_requirements"]],
  ["pend", ["operations", "problem_solving", "risk"]],
  ["rework", ["operations", "problem_solving", "quality"]],
  ["processor", ["operations", "dashboards", "operational_efficiency"]],
  ["health plan", ["billing", "operations", "partner_enablement"]],
  ["insurtech", ["partner_enablement", "product_requirements", "workflow_automation", "compliance"]],
  ["health insurance", ["eligibility", "billing", "partner_enablement", "product_requirements", "compliance"]],
  ["health benefits", ["eligibility", "partner_enablement", "participant_experience", "product_requirements"]],
  ["benefits administration", ["eligibility", "partner_enablement", "workflow_automation", "product_requirements"]],
  ["benefits platform", ["partner_enablement", "saas", "product_requirements", "participant_experience"]],
  ["small business", ["voc", "partner_enablement", "participant_experience", "commercial"]],
  ["plan document", ["healthcare_ai", "documentation", "workflow_automation", "product_requirements"]],
  ["plan documents", ["healthcare_ai", "documentation", "workflow_automation", "product_requirements"]],
  ["insurance recommendation", ["participant_experience", "patient_tools", "product_requirements", "voc"]],
  ["insurance recommendations", ["participant_experience", "patient_tools", "product_requirements", "voc"]],
  ["integrated partnership", ["partner_enablement", "implementation", "enterprise_adoption", "product_requirements"]],
  ["integrated partnerships", ["partner_enablement", "implementation", "enterprise_adoption", "product_requirements"]],
  ["embedded", ["partner_enablement", "implementation", "saas", "product_requirements"]],
  ["b2b platform", ["partner_enablement", "implementation", "enterprise_adoption", "product_requirements"]],
  ["b2b platforms", ["partner_enablement", "implementation", "enterprise_adoption", "product_requirements"]],
  ["revenue cycle", ["billing", "operations", "product_requirements", "strategy_to_execution"]],
  ["rcm", ["billing", "operations", "product_requirements", "strategy_to_execution"]],
  ["pre-visit", ["patient_access", "eligibility", "billing", "operations"]],
  ["eligibility", ["patient_access", "eligibility", "billing", "operations"]],
  ["benefits", ["patient_access", "eligibility", "billing", "operations"]],
  ["insurance verification", ["patient_access", "eligibility", "billing", "operations"]],
  ["cost estimation", ["billing", "patient_access", "operations"]],
  ["payer portal", ["billing", "operations", "workflow_automation"]],
  ["payment", ["billing", "patient_access", "operations"]],
  ["brand partner", ["partner_enablement", "voc", "implementation", "enterprise_adoption"]],
  ["brand partners", ["partner_enablement", "voc", "implementation", "enterprise_adoption"]],
  ["partner network", ["partner_enablement", "implementation", "enterprise_adoption"]],
  ["direct sales", ["partner_enablement", "commercial", "adoption"]],
  ["affiliate", ["partner_enablement", "commercial", "adoption"]],
  ["marketplace", ["partner_enablement", "participant_experience", "engagement", "adoption"]],
  ["e-commerce", ["partner_enablement", "participant_experience", "patient_tools", "adoption"]],
  ["ecommerce", ["partner_enablement", "participant_experience", "patient_tools", "adoption"]],
  ["subscription", ["partner_enablement", "engagement", "retention", "adoption"]],
  ["customer", ["voc", "partner_enablement", "health_systems"]],
  ["voice", ["voc"]],
  ["voc", ["voc"]],
  ["market", ["voc", "product_requirements"]],
  ["gtm", ["partner_enablement"]],
  ["sales", ["partner_enablement"]],
  ["billing", ["billing", "operations"]],
  ["rpm", ["rpm", "virtual_care"]],
  ["fhir", ["fhir", "ehr", "interoperability"]],
  ["ehr", ["ehr", "fhir", "data_sharing"]],
  ["data", ["data_sharing", "dashboards", "fhir"]],
  ["dashboard", ["dashboards"]],
  ["patient", ["participant_experience", "patient_access", "patient_tools"]],
  ["patient-facing", ["participant_experience", "patient_tools", "patient_facing"]],
  ["member-facing", ["participant_experience", "patient_tools"]],
  ["engagement", ["engagement", "omnichannel"]],
  ["lifecycle", ["lifecycle", "engagement", "activation"]],
  ["re-engagement", ["lifecycle", "engagement", "retention"]],
  ["retention", ["retention", "engagement"]],
  ["action item", ["patient_tools", "dashboards"]],
  ["service discovery", ["patient_access", "patient_tools"]],
  ["screening", ["screening", "clinical_quality", "participant_experience"]],
  ["test results", ["patient_tools", "dashboards"]],
  ["messaging", ["omnichannel", "patient_communication", "engagement"]],
  ["notification", ["notifications", "omnichannel", "patient_communication"]],
  ["appointment", ["appointment_scheduling", "scheduling", "reminders"]],
  ["well-being", ["participant_experience", "engagement", "patient_tools"]],
  ["wellbeing", ["participant_experience", "engagement", "patient_tools"]],
  ["habit", ["participant_experience", "engagement", "activation"]],
  ["journaling", ["participant_experience", "engagement", "patient_tools"]],
  ["wearable", ["patient_tools", "participant_experience", "engagement"]],
  ["user experience", ["participant_experience", "voc", "patient_tools"]],
  ["ux", ["participant_experience", "voc", "patient_tools"]],
  ["prototype", ["product_requirements", "voc", "strategy_to_execution"]],
  ["activation", ["activation"]],
  ["research", ["clinical_research", "research_operations"]],
  ["regulated", ["compliance", "compliant_product"]],
  ["compliance", ["compliance", "compliant_product"]]
];

const ROLE_ARCHETYPES = [
  {
    label: "Proptech AI Client Engagement",
    patterns: ["ai engagement manager", "housing", "property management", "property team", "renters", "tour apartments", "sign leases", "maintenance requests", "portfolio performance", "business transformation", "time-to-value", "time to value", "client kpis", "customer kpis", "product rollout", "repeatable strategies", "change management", "high-value and complex customers"],
    priorities: ["AI implementation tied to client business goals", "workflow transformation across property operations", "fast time-to-value and adoption", "measurable ROI and portfolio performance", "repeatable rollout playbooks", "product feedback loops from strategic accounts"],
    skills: ["client-facing AI implementation", "workflow transformation", "change management", "customer adoption strategy", "ROI and KPI measurement", "executive stakeholder advising", "product rollout playbooks", "cross-functional product feedback"]
  },
  {
    label: "Product Operations and PM Enablement",
    patterns: ["product operations", "product organization", "operating system", "operating cadences", "planning cycles", "product reviews", "execution check-ins", "execution tracking", "pm tool stack", "product manager onboarding", "product all hands", "product summits", "planning artifacts", "prd", "product culture"],
    priorities: ["scalable product operating system", "lightweight planning and execution cadences", "visibility without unnecessary process", "PM tooling and enablement", "AI-assisted product workflows"],
    skills: ["product operations", "roadmap and planning operations", "PM enablement", "operating cadence design", "execution tracking", "AI workflow adoption", "executive communication"]
  },
  {
    label: "Platform Operations and Workflow Infrastructure",
    patterns: ["platform ops", "platform operations", "operational tooling", "workflow infrastructure", "workflow automations", "internal operational tools", "workflow failures", "operational bottlenecks", "support workflows", "onboarding", "post-sale workflows", "care delivery", "new market launches", "launch readiness", "knowledge systems", "operational consistency", "workflow experiments"],
    priorities: ["workflow infrastructure reliability", "operational tooling across onboarding, support, and care delivery", "automation that reduces manual work", "launch readiness for new markets and services"],
    skills: ["platform operations", "workflow infrastructure design", "operational tooling strategy", "workflow automation", "operational analytics", "launch readiness", "cross-functional execution"]
  },
  {
    label: "AI Systems and Structured Data Product",
    patterns: ["ai systems", "ml systems", "ai infrastructure", "ml infrastructure", "ai research", "research and development", "data scientists", "new concepts", "prototype", "prototyping", "model evaluation", "benchmarking", "benchmark", "post-training", "post training", "feedback loops", "feedback loop", "structured data", "relational data", "tabular", "learning efficiency", "data efficiency", "model performance", "training", "inference", "deployment", "warehouse", "lakehouse", "research-driven", "research driven"],
    priorities: ["AI research-to-product translation", "prototype workflows that teams can evaluate and adopt", "model evaluation and behavior clarity", "feedback loops and post-training systems", "data, compute, performance, and cost trade-off decisions", "research-to-production platform capability"],
    skills: ["AI systems product strategy", "AI prototyping and evaluation", "model evaluation strategy", "feedback loop design", "performance and cost trade-off analysis", "research-to-product translation"]
  },
  {
    label: "Healthcare Product Innovation and NPI",
    patterns: ["npi", "new product innovation", "new product innovations", "product innovation", "innovation roadmap", "strategy council", "gate process", "gate 1", "gate 4", "business case", "business cases", "financial modeling", "cost-benefit", "projected roi", "market opportunity", "market research", "competitive benchmarking", "customer voice", "concept to launch", "custom pharmacy", "formulations", "supplements", "consumer packaged goods", "cpg", "direct-to-consumer", "b2c tech"],
    priorities: ["new product innovation lifecycle discipline", "business case and market opportunity assessment", "customer voice and concept validation", "clinical, operational, and financial launch readiness", "partner and care delivery expansion"],
    skills: ["0-to-1 product innovation", "NPI lifecycle management", "business case development", "market research and competitive analysis", "customer voice research", "cross-functional launch execution", "operational readiness"]
  },
  {
    label: "Healthcare AI Client Implementation TPM",
    patterns: ["technical program manager", "technical delivery", "customer enablement", "client integrations", "solution pilots", "system integrations", "implementation phases", "technical roadmap", "program-level metrics", "program governance", "operating reviews", "client lifecycle", "patient access hub", "patient access hubs", "pharma hubs", "hub operations", "strategic business reviews", "design, build, qa, uat", "uat", "go-live", "go live", "hypercare", "smart on fhir", "apis", "csvs", "crm", "emr", "emrs"],
    priorities: ["client-facing healthcare AI implementation", "system integration readiness", "patient access and hub workflow reliability", "program governance and risk management", "UAT, launch, and hypercare execution", "measurable customer ROI"],
    skills: ["technical program management", "client-facing implementation leadership", "healthcare AI solution delivery", "patient access hub workflow fluency", "system integration requirements", "API, CSV, and FHIR integration planning", "CRM and EMR integration requirements", "UAT, go-live, and hypercare leadership", "program governance and operating reviews", "risk and dependency management"]
  },
  {
    label: "Medical Device HCP Marketing Product",
    patterns: ["hcp", "health care professional", "healthcare professional", "peer-to-peer", "peer to peer", "speaker bureau", "speaker's bureau", "speaker training", "product theater", "tradeshow", "trade show", "field training", "sales tools", "sales leadership", "hcp marketing", "glucose monitoring", "diabetes care"],
    priorities: ["HCP education and peer-to-peer program execution", "compliant speaker-program operations", "market-insight-led provider engagement", "sales and field enablement", "program dashboards and leadership communication"],
    skills: ["healthcare product marketing", "HCP and provider engagement strategy", "regulated medical product execution", "training and onboarding program design", "sales and field enablement", "program measurement and dashboarding", "cross-functional marketing, medical, clinical, and sales alignment"]
  },
  {
    label: "Life Sciences Enterprise SaaS Product",
    patterns: ["veeva", "veeva labs", "life sciences", "industry cloud", "therapies", "pharma", "pharmaceutical", "biopharma", "pharmaceutical domain", "pharmaceutical markets", "therapeutic area", "drug development", "digital platforms", "omnichannel initiatives", "salesforce marketing cloud", "sitecore", "google analytics", "public benefit corporation", "pbc", "customer success", "employee success", "product management alliances", "work anywhere"],
    priorities: ["life sciences workflow innovation", "pharma digital platform execution", "omnichannel initiative delivery", "customer and internal application discovery", "high-quality agile delivery", "scalable enterprise SaaS standards"],
    skills: ["life sciences SaaS product management", "pharma digital product context", "customer and internal user discovery", "User Story and Use Case Development", "Project Planning and Delivery Tooling", "CRM Integration Requirements", "executive stakeholder alignment", "engineering and QA partnership", "data-informed prioritization"]
  },
  {
    label: "Healthcare Commerce and Partner Platform Product",
    patterns: ["brand partner", "brand partners", "partner network", "direct sales", "affiliate", "mlm", "marketplace", "e-commerce", "ecommerce", "subscription", "pharmaceutical-grade", "pharmaceutical grade", "customers and brand partners"],
    priorities: ["customer and partner journey clarity", "healthcare commerce platform execution", "partner workflow reliability", "regulated product trust", "data-informed launch and iteration"],
    skills: ["healthcare platform product management", "customer and partner discovery", "partner workflow design", "roadmap and backlog prioritization", "product analytics and success metrics", "engineering, design, data, and operations partnership", "regulated healthcare execution"]
  },
  {
    label: "Insurtech Benefits Platform Product",
    patterns: ["simplyinsured", "insurtech", "health insurance", "health benefits", "benefits administration", "benefits platform", "small business owners", "small businesses", "insurance regulations", "insurance plan", "plan documents", "insurance recommendations", "integrated partnerships", "embedded", "b2b platforms", "netsuite", "toast", "square"],
    priorities: ["embedded benefits platform strategy", "health insurance complexity translated into trusted workflows", "AI-enabled plan-document and support automation", "partner integration roadmap and launch execution", "small business owner and employee experience clarity"],
    skills: ["insurtech product strategy", "benefits workflow discovery", "embedded partner integration strategy", "AI-enabled document workflow automation", "API and integration requirements", "executive and partner stakeholder management"]
  },
  {
    label: "Fintech Product Management",
    patterns: ["plaid", "financial accounts", "financial institutions", "financial ecosystem", "banks", "fintech", "developer platform", "developer api", "financial freedom", "open finance"],
    priorities: ["high-trust financial connectivity execution", "customer and developer clarity", "fast product discovery and delivery", "data-informed roadmap decisions"],
    skills: ["fintech infrastructure context", "enterprise SaaS product management", "roadmap ownership", "clear product requirements", "engineering and design partnership", "technical curiosity"]
  },
  {
    label: "Enterprise AI ERP Product",
    patterns: ["erp", "accounting", "finance operations", "financial operations", "zero-day close", "zero day close", "multi-entity", "consolidation", "audit", "accrual", "p&l", "board decks", "source-of-truth", "source of truth"],
    priorities: ["workflow-driven enterprise SaaS", "automation balanced with determinism and control", "data-heavy product clarity"],
    skills: ["enterprise SaaS product management", "workflow-driven product development", "data-heavy systems", "AI automation tradeoffs", "customer workflow discovery"]
  },
  {
    label: "Claims and Payment Infrastructure Product",
    patterns: ["claim automation", "claims automation", "claim processing", "claims processing", "claims reconciliation", "claims ingestion", "claims validation", "claims adjudication", "adjudication lifecycle", "adjudication logic", "switch transactions", "ncpdp", "835 era", "pbm", "pbms", "pharmacy network", "payment processing", "payment systems", "payment calculation", "disbursement", "financial reconciliation", "pend management", "rework reduction", "claims operations", "claims administration", "claims technology", "claims quality", "processor productivity", "multi-lob claims", "health plan claims"],
    priorities: ["claims reconciliation and adjudication reliability", "payment processing accuracy", "exception handling and financial transparency", "portfolio roadmap alignment across product, finance, operations, partners, and technology"],
    skills: ["claims operations workflow discovery", "billing and payment workflow automation", "product roadmap and requirements definition", "operational and financial analytics", "cross-functional change management"]
  },
  {
    label: "Healthcare Revenue Cycle Automation Product",
    patterns: ["revenue cycle", "rcm", "pre-visit", "eligibility", "benefits interpretation", "cost estimation", "patient financial", "payer portal", "point-of-service payment", "payment journey", "insurance verification"],
    priorities: ["pre-visit workflow automation", "eligibility and benefits accuracy", "patient financial experience clarity", "automation reliability across healthcare operations"],
    skills: ["revenue cycle workflow discovery", "pre-visit automation", "eligibility and insurance verification workflows", "AI-enabled workflow automation", "operational analytics"]
  },
  {
    label: "Consumer AI Well-Being Product",
    patterns: ["well-being", "wellbeing", "wearable", "companion", "habit", "journaling", "journal", "product design", "user experience", "ux", "prototype", "beta users", "emotionally"],
    priorities: ["emotionally resonant user experience", "rapid prototyping and user validation", "data-informed product decisions"],
    skills: ["AI product strategy", "UX ownership", "prototyping", "product discovery", "data-informed decision making"]
  },
  {
    label: "Patient Engagement Product",
    patterns: ["patient engagement", "patient-facing", "member-facing", "logged-in consumer", "patient dashboard", "action items", "service discovery", "screening completion", "test results", "messaging", "notifications", "appointment scheduling", "lifecycle", "re-engagement", "activation", "retention", "next best action", "b2b2c", "survivorship", "caregivers"],
    priorities: ["patient activation and durable engagement", "personalized next-best-action guidance", "cross-channel lifecycle orchestration", "regulated B2B2C patient experience"],
    skills: ["patient engagement strategy", "lifecycle engagement", "product analytics", "cross-channel journey design", "patient-facing UX", "experimentation"]
  },
  {
    label: "Healthcare AI Product",
    patterns: ["ai", "artificial intelligence", "llm", "scribe", "summarization", "automation", "documentation"],
    priorities: ["AI-enabled clinical workflow adoption", "safe translation of ambiguous clinical needs into product requirements"],
    skills: ["healthcare AI", "clinical workflow translation", "product requirements", "launch execution"]
  },
  {
    label: "Pharmacy Informatics and Healthcare Data Product",
    patterns: ["pharmacy informatics", "pharmacy", "pharmacist", "medication", "drug", "medical device", "clinical decision support", "healthcare data", "informatics", "pbm", "pharmacy benefit manager", "product lifecycle management", "release plan", "business case"],
    priorities: ["trusted medication and clinical data workflows", "clinical decision support utility", "health system and informatics stakeholder trust", "roadmap and lifecycle discipline", "EHR-integrated product clarity"],
    skills: ["healthcare data product management", "clinical workflow translation", "product requirements", "roadmap and prioritization ownership", "EHR and integration requirements", "regulated healthcare execution"]
  },
  {
    label: "Health System Product",
    patterns: ["health system", "enterprise", "provider", "clinician", "ehr", "implementation", "deployment"],
    priorities: ["health system stakeholder trust", "enterprise-ready implementation", "provider workflow fit"],
    skills: ["health system implementation", "provider workflows", "cross-functional stakeholder management"]
  },
  {
    label: "Clinical Operations Product",
    patterns: ["clinical", "patient", "care team", "workflow", "operations", "scale", "launch"],
    priorities: ["care-team operating leverage", "measurable care delivery outcomes", "workflow reliability"],
    skills: ["clinical operations", "workflow automation", "care-team enablement"]
  },
  {
    label: "Strategy and Operations",
    patterns: ["strategy", "gtm", "market", "commercial", "partnership", "pricing", "chief of staff"],
    priorities: ["executive-ready synthesis", "commercial and partner translation", "strategy-to-execution discipline"],
    skills: ["market analysis", "operating model design", "executive communication"]
  },
  {
    label: "Interoperability and Data Product",
    patterns: ["fhir", "ehr", "integration", "api", "data", "analytics", "dashboard"],
    priorities: ["data and integration clarity", "partner-ready technical requirements", "analytics-backed product decisions"],
    skills: ["API and integration requirements", "dashboard requirements", "data interpretation"]
  }
];

const ROLE_KEYWORDS = [
  "housing",
  "property management",
  "portfolio performance",
  "client KPIs",
  "time-to-value",
  "business transformation",
  "change management",
  "product rollout",
  "customer adoption",
  "AI systems",
  "AI infrastructure",
  "ML systems",
  "ML infrastructure",
  "model evaluation",
  "benchmarking",
  "model behavior",
  "model performance",
  "post-training",
  "feedback loops",
  "structured data",
  "relational data",
  "tabular data",
  "warehouses",
  "lakehouses",
  "learning efficiency",
  "data efficiency",
  "compute tradeoffs",
  "training",
  "inference",
  "deployment",
  "research-to-production",
  "revenue cycle",
  "RCM",
  "insurtech",
  "health insurance",
  "health benefits",
  "benefits administration",
  "benefits platform",
  "small business owners",
  "insurance regulations",
  "plan documents",
  "insurance recommendations",
  "embedded benefits",
  "embedded partnerships",
  "integrated partnerships",
  "B2B platforms",
  "pre-visit automation",
  "eligibility",
  "insurance verification",
  "benefits interpretation",
  "cost estimation",
  "patient financial experience",
  "payer portal",
  "payment journey",
  "claim automation",
  "claims operations",
  "claims adjudication",
  "claims administration",
  "claims technology",
  "claim processing",
  "pend management",
  "rework reduction",
  "claims quality",
  "processor productivity",
  "multi-LOB claims operations",
  "healthcare AI",
  "HCP marketing",
  "health care professional",
  "peer-to-peer",
  "speaker bureau",
  "speaker training",
  "product theater",
  "tradeshow",
  "medical device",
  "glucose monitoring",
  "diabetes care",
  "sales tools",
  "field training",
  "program dashboard",
  "pharmacy informatics",
  "medication workflows",
  "clinical decision support",
  "healthcare data",
  "drug and medical device data",
  "pharmacists",
  "informaticists",
  "PBMs",
  "pharmacy benefit managers",
  "clinical workflows",
  "health systems",
  "clinicians",
  "providers",
  "EHR",
  "FHIR",
  "interoperability",
  "product requirements",
  "user stories",
  "use cases",
  "roadmap",
  "NPI",
  "product innovation",
  "innovation roadmap",
  "gate process",
  "product lifecycle management",
  "release plans",
  "business cases",
  "financial modeling",
  "projected ROI",
  "market research",
  "market opportunity assessment",
  "competitive benchmarking",
  "customer voice",
  "CPG",
  "B2C tech",
  "partner integrations",
  "supplements",
  "custom pharmacy formulations",
  "life sciences SaaS",
  "pharma digital product",
  "pharmaceutical domain",
  "pharmaceutical markets",
  "Brand Partners",
  "partner network",
  "e-commerce",
  "subscription systems",
  "marketplace platforms",
  "direct sales",
  "affiliate model",
  "customer journey",
  "therapeutic area",
  "digital platforms",
  "omnichannel initiatives",
  "Salesforce Marketing Cloud",
  "Sitecore CMS",
  "Google Analytics",
  "MS Project",
  "Smartsheets",
  "industry cloud",
  "internal applications",
  "customer applications",
  "business process design",
  "product specifications",
  "engineering and QA partnership",
  "executive stakeholder alignment",
  "Voice of Customer",
  "stakeholder management",
  "implementation",
  "launch",
  "adoption",
  "post-launch optimization",
  "enterprise",
  "documentation automation",
  "medical record summarization",
  "workflow automation",
  "data interpretation",
  "dashboards",
  "regulated healthcare",
  "HIPAA",
  "GTM",
  "commercial strategy",
  "partner enablement",
  "care-team operations",
  "patient access",
  "patient engagement",
  "patient-facing experience",
  "logged-in consumer experience",
  "B2B2C healthcare",
  "lifecycle engagement",
  "re-engagement",
  "service activation",
  "screening completion",
  "appointment scheduling",
  "messaging",
  "notifications",
  "next best action",
  "wearable",
  "well-being",
  "habit building",
  "journaling",
  "product design",
  "user experience",
  "prototyping",
  "beta users",
  "data pipelines",
  "speech recognition",
  "behavioral science",
  "HCI",
  "product strategy",
  "product operations",
  "platform operations",
  "platform ops",
  "operational tooling",
  "workflow infrastructure",
  "workflow automations",
  "internal operational tools",
  "workflow failures",
  "operational bottlenecks",
  "support workflows",
  "onboarding workflows",
  "new market launches",
  "launch readiness",
  "operating cadences",
  "planning cycles",
  "execution tracking",
  "PM enablement",
  "PM tool stack",
  "PRD",
  "AI workflows",
  "Product All Hands",
  "Product Summits",
  "product discovery",
  "emotionally resonant product"
];

export async function analyzePackage(packageDir, options = {}) {
  const sourceLibrary = await loadSourceLibrary(options.rootDir ?? process.cwd());
  const input = await readYaml(path.join(packageDir, "input.yml"));
  const jobDescription = await readText(path.join(packageDir, "job-description.txt"));
  const rawContext = [
    input.company,
    input.role_title,
    input.department,
    input.hiring_team,
    input.company_motivation,
    input.notes,
    jobDescription
  ].join(" ").toLowerCase();
  const context = stripEmploymentBenefitPerks(rawContext);
  const roleContext = inferRoleContext(context, input.role_title);

  const scoredClaims = [];
  for (const role of sourceLibrary.roles) {
    for (const claim of role.claims ?? []) {
      const tags = [...(role.emphasis_tags ?? []), ...(claim.tags ?? [])];
      let score = 0;
      for (const [keyword, matchedTags] of KEYWORD_TAGS) {
        if (context.includes(keyword)) {
          score += tags.some((tag) => matchedTags.includes(tag)) ? 5 : 0;
        }
      }
      for (const tag of tags) {
        if (context.includes(tag.replaceAll("_", " "))) score += 2;
      }
      score += seniorClaimScore(claim.text, role.id);
      score += role.id === "role.starlight" ? 5 : 0;
      score += role.id === "role.kannact" ? 2 : 0;
      score += role.id === "role.ucsf" ? 1 : 0;
      scoredClaims.push({ claim, role, score });
    }
  }

  scoredClaims.sort((a, b) => b.score - a.score);
  const starlightConversionClaimId = selectStarlightConversionClaimId(context);

  const requiredClaimIds = requiredClaimIdsForContext(roleContext, starlightConversionClaimId);
  const selectedClaimIds = ensureRoleClaimPresent({
    selectedClaimIds: selectDistinctClaimIds({
      scoredClaims,
      maxClaims: 16,
      preferredClaimIds: ["kannact.roadmap_satisfaction.001"],
      requiredClaimIds
    }),
    scoredClaims,
    roleId: "role.ucsf",
    preferredClaimIds: requiredClaimIds.filter((id) => id.startsWith("ucsf.")),
    maxClaims: 16,
    requiredClaimIds
  });

  const selectedClaims = getClaimsByIds(sourceLibrary, selectedClaimIds);
  const selectedMetricIds = uniqueValues([
    ...selectedClaims.flatMap((claim) => claim.metric_ids ?? []),
    ...DEFAULT_SUMMARY_METRIC_IDS,
    ...inferContextMetricIds(roleContext)
  ]);
  const selectedMetrics = getMetricsByIds(sourceLibrary, selectedMetricIds);

  const company = sanitizeFinalText(input.company);
  const roleTitle = sanitizeFinalText(input.role_title);
  const slug = sanitizeFinalText(input.slug);
  const targetRole = sanitizeFinalText(input.target_role_label || `${roleTitle}, ${company}`);
  const roleAnalysis = buildRoleAnalysis({
    context,
    input,
    jobDescription,
    selectedClaims,
    selectedMetrics,
    roleContext
  });
  const packetHeadline = makePacketHeadline(roleContext, roleAnalysis);
  const coverLetter = makeCoverLetter({
    company,
    roleTitle,
    targetRole,
    input,
    roleContext,
    selectedClaims,
    roleAnalysis
  });
  const resumeSkills = makeSkills({
    ctx: roleContext,
    analysis: roleAnalysis,
    sourceLibrary,
    context
  });

  const approvedContent = {
    metadata: {
      company,
      role_title: roleTitle,
      slug,
      generated_on: todayDisplayDate(),
      target_role_label: targetRole,
      company_logo_url: sanitizeFinalText(input.company_logo_url || ""),
      public_url: `https://stephanieramsay.com/${slug}/`
    },
    positioning: {
      eyebrow: `${company} | ${roleTitle}`,
      hero_subtitle: packetHeadline,
      resume_headline: makeResumeHeadline(roleContext, roleAnalysis),
      side_panel_summary: makeSidePanelSummary(roleContext, roleAnalysis),
      side_panel_signals: makeSignals(roleContext, roleAnalysis),
      role_fit_thesis: makeThesis(company, roleTitle, roleContext, roleAnalysis),
      concern_to_address: inferConcern(roleContext, roleAnalysis)
    },
    role_analysis: roleAnalysis,
    selected_claim_ids: selectedClaimIds,
    selected_metric_ids: selectedMetricIds,
    metrics_snapshot: selectedMetrics.filter((metric) => !KANNACT_EXPERIENCE_METRIC_IDS.has(metric.id)).slice(0, 4).map((metric) => ({
      id: metric.id,
      label: metric.label,
      text: metric.description
      })),
      resume: {
      summary: makeResumeSummary(roleContext),
      roles: sourceLibrary.roles.map((role) => ({
        role_id: role.id,
        employer: role.employer,
        location: role.location,
        dates: role.dates,
        title: role.title,
        descriptor: role.descriptor,
        subroles: role.subroles ?? [],
        claims: orderResumeClaimIds(
          (role.claims ?? []).filter((claim) => selectedClaimIds.includes(claim.id)),
          selectedClaimIds
        )
      })),
      skills: resumeSkills,
      education_ids: sourceLibrary.education.map((item) => item.id)
    },
    cover_letter: coverLetter,
    operating_work: makeOperatingWork(roleContext, roleAnalysis),
    leadership_style: {
      intro: "Included as a concise lens on working style: high-energy possibility-seeking paired with a collaborative, stabilizing secondary style. This is not a substitute for experience, but it adds useful texture to how I lead, learn, and move teams through ambiguity.",
      primary: {
        label: "Primary Style",
        title: "Type 7, The Enthusiast",
        bullets: ["Long-term goal setting", "Mindfulness habits", "Emotional depth", "Emotional intimacy", "Depth over variety"]
      },
      secondary: {
        label: "Secondary Style",
        title: "Type 9, The Peacemaker",
        bullets: ["Initiative", "Active engagement", "Task prioritization", "Assertive communication", "Emotional awareness"]
      },
      note: "How this shows up at work: I bring energy, synthesis, optimism, and strategic range, while also caring deeply about alignment, trust, and moving people through change without losing the human thread."
    }
  };

  const sourceMap = {
    package: path.basename(packageDir),
    company,
    role_title: roleTitle,
    slug,
    source_files: [
      "source_materials/StephanieRamsayCV2026April - BASELINE RESUME.pdf",
      "source_materials/Interview_Prep_GetWell_RhythmX_v2.docx",
      "source_materials/Interview_Prep_GetWell_RhythmX_v2.txt",
      "source_data/resume-facts.yml",
      "source_data/approved-metrics.yml",
      "source_data/skill-bank.yml",
      "source_data/role-bullet-bank.yml"
    ],
    selected_claims: selectedClaims.map((claim) => ({
      id: claim.id,
      employer: claim.employer,
      text: claim.text,
      metric_ids: claim.metric_ids ?? []
    })),
    selected_metrics: selectedMetrics.map((metric) => ({
      id: metric.id,
      label: metric.label,
      description: metric.description
    })),
    selected_resume_skills: resumeSkills
  };

  await writeJson(path.join(packageDir, "approved-content.json"), approvedContent);
  await writeJson(path.join(packageDir, "source-map.json"), sourceMap);
  await writeText(path.join(packageDir, "strategic-alignment.md"), renderStrategicAlignment(approvedContent, sourceMap));

  return { approvedContent, sourceMap };
}

const KANNACT_EXPERIENCE_METRIC_IDS = new Set([
  "metric.participant_satisfaction_96",
  "metric.nps_82"
]);

const DEFAULT_SUMMARY_METRIC_IDS = Object.freeze([
  "metric.participant_satisfaction_96",
  "metric.nps_82",
  "metric.net_churn_under_2"
]);

function selectStarlightConversionClaimId(context) {
  const accessSignals = /\b(pre visit|previsit|pre-visit|patient access|referral intake|benefits interpretation|benefits administration|health benefits|health insurance|insurance verification|insurance recommendation|insurance recommendations|plan document|plan documents|revenue cycle|rcm)\b/.test(context)
    || (/\beligibility\b/.test(context) && /\b(patient access|referral intake|insurance verification|insurance coverage|payer|billing)\b/.test(context));
  if (accessSignals) return "starlight.intake_conversion.001";
  const activationSignals = /\b(activation|activate|onboarding|adoption|growth|retention|conversion funnel|funnel)\b/.test(context);
  return activationSignals ? "starlight.intake_activation.001" : "starlight.intake_conversion.001";
}

function requiredClaimIdsForContext(ctx, starlightConversionClaimId) {
  if (ctx.hasHousingEngagement) {
    return [
      "starlight.enterprise_adoption.001",
      "starlight.ai_strategy.001",
      "starlight.ambiguity_execution.001",
      "starlight.bottleneck_resolution.001",
      "starlight.ai_documentation.001",
      starlightConversionClaimId,
      "kannact.configurable_saas.001",
      "kannact.omnichannel_engagement.001",
      "kannact.roadmap_satisfaction.001",
      "kannact.bank.013",
      "kannact.bank.016",
      "ucsf.compliant_releases.001"
    ];
  }
  if (ctx.hasInsurtechBenefits) {
    return [
      "starlight.ai_documentation.001",
      "starlight.access_support_workflows.001",
      "starlight.voc_requirements.001",
      "starlight.enterprise_adoption.001",
      "starlight.virtual_clinic_build.001",
      starlightConversionClaimId,
      "starlight.ambiguity_execution.001",
      "kannact.configurable_saas.001",
      "kannact.platform_rebuild.001",
      "kannact.roadmap_satisfaction.001",
      "kannact.bank.004",
      "kannact.bank.013",
      "kannact.bank.016",
      "ucsf.compliant_releases.001"
    ];
  }
  if (ctx.hasHcpMarketing) {
    return [
      "starlight.voc_requirements.001",
      "starlight.enterprise_adoption.001",
      "starlight.ambiguity_execution.001",
      "starlight.bottleneck_resolution.001",
      "starlight.ai_documentation.001",
      starlightConversionClaimId,
      "starlight.bank.011",
      "kannact.omnichannel_engagement.001",
      "kannact.roadmap_satisfaction.001",
      "kannact.bank.013",
      "kannact.bank.016",
      "kannact.bank.017",
      "ucsf.compliant_releases.001"
    ];
  }
  if (ctx.hasPharmacyInformatics) {
    return [
      "starlight.voc_requirements.001",
      "starlight.enterprise_adoption.001",
      "starlight.ai_documentation.001",
      "starlight.ambiguity_execution.001",
      "starlight.bottleneck_resolution.001",
      starlightConversionClaimId,
      "kannact.roadmap_satisfaction.001",
      "kannact.fhir_data_layer.001",
      "kannact.platform_rebuild.001",
      "kannact.configurable_saas.001",
      "kannact.bank.006",
      "ucsf.compliant_releases.001"
    ];
  }
  if (ctx.hasRevenueCycle) {
    return [
      "starlight.access_support_workflows.001",
      "starlight.billing_workflows.001",
      "starlight.ai_documentation.001",
      "starlight.voc_requirements.001",
      starlightConversionClaimId,
      "starlight.ambiguity_execution.001",
      "starlight.bottleneck_resolution.001",
      "starlight.enterprise_adoption.001",
      "kannact.platform_rebuild.001",
      "kannact.configurable_saas.001",
      "kannact.bank.008",
      "kannact.bank.016",
      "ucsf.compliant_releases.001"
    ];
  }
  if (ctx.hasClaimsOps) {
    return [
      "starlight.access_support_workflows.001",
      "starlight.billing_workflows.001",
      "starlight.ai_documentation.001",
      "starlight.voc_requirements.001",
      starlightConversionClaimId,
      "starlight.ambiguity_execution.001",
      "starlight.enterprise_adoption.001",
      "kannact.platform_rebuild.001",
      "kannact.configurable_saas.001",
      "kannact.bank.008",
      "kannact.bank.011",
      "kannact.bank.017",
      "ucsf.compliant_releases.001"
    ];
  }
  if (ctx.hasAiSystems) {
    return [
      "starlight.ai_documentation.001",
      "starlight.voc_requirements.001",
      "starlight.ambiguity_execution.001",
      "starlight.bottleneck_resolution.001",
      "starlight.bank.009",
      "starlight.enterprise_adoption.001",
      starlightConversionClaimId,
      "kannact.platform_rebuild.001",
      "kannact.fhir_data_layer.001",
      "kannact.configurable_saas.001",
      "kannact.bank.015",
      "kannact.bank.016",
      "ucsf.compliant_releases.001"
    ];
  }
  if (ctx.hasPatientEngagement) {
    return [
      "starlight.ai_documentation.001",
      "starlight.voc_requirements.001",
      starlightConversionClaimId,
      "starlight.enterprise_adoption.001",
      "starlight.access_support_workflows.001",
      "kannact.omnichannel_engagement.001",
      "kannact.scheduling_efficiency.001",
      "kannact.roadmap_satisfaction.001",
      "kannact.bank.009",
      "kannact.platform_rebuild.001",
      "kannact.fhir_data_layer.001",
      "ucsf.participant_redesign.001",
      "ucsf.conversion_activation.001"
    ];
  }
  if (ctx.hasHealthCommerce) {
    return [
      "starlight.voc_requirements.001",
      "starlight.enterprise_adoption.001",
      "starlight.ambiguity_execution.001",
      "starlight.bottleneck_resolution.001",
      "starlight.ai_documentation.001",
      starlightConversionClaimId,
      "starlight.bank.003",
      "starlight.bank.010",
      "kannact.roadmap_satisfaction.001",
      "kannact.omnichannel_engagement.001",
      "kannact.bank.016",
      "kannact.bank.017",
      "kannact.bank.002",
      "ucsf.compliant_releases.001"
    ];
  }
  if (ctx.hasProductOpsFunction) {
    return [
      "starlight.ambiguity_execution.001",
      "starlight.voc_requirements.001",
      "starlight.ai_documentation.001",
      "starlight.bottleneck_resolution.001",
      starlightConversionClaimId,
      "kannact.roadmap_satisfaction.001",
      "kannact.bank.016",
      "kannact.bank.017",
      "ucsf.compliant_releases.001"
    ];
  }
  if (ctx.hasFinanceErp) {
    return [
      "starlight.ai_documentation.001",
      "starlight.voc_requirements.001",
      starlightConversionClaimId,
      "kannact.bank.001",
      "kannact.bank.024",
      "kannact.bank.025",
      "kannact.bank.026",
      "ucsf.compliant_releases.001"
    ];
  }
  return [
    "starlight.ai_documentation.001",
    "starlight.voc_requirements.001",
    starlightConversionClaimId,
    "ucsf.compliant_releases.001",
    "kannact.platform_rebuild.001"
  ];
}

function selectDistinctClaimIds({ scoredClaims, maxClaims, preferredClaimIds = [], requiredClaimIds = [] }) {
  const itemById = new Map(scoredClaims.map((item) => [item.claim.id, item]));
  const candidateIds = uniqueValues([
    ...preferredClaimIds.filter((id) => itemById.has(id)),
    ...requiredClaimIds.filter((id) => itemById.has(id)),
    ...scoredClaims.map((item) => item.claim.id)
  ]);

  const selected = [];
  const selectedRoleCounts = new Map();
  const selectedMetricIds = new Set();
  const selectedOutcomeFamilies = new Set();
  const selectedSignatures = [];

  for (const id of candidateIds) {
    const item = itemById.get(id);
    if (!item) continue;
    if (!withinRoleBulletLimit(item, selectedRoleCounts)) continue;
    if (!isDistinctClaim(item, { selectedMetricIds, selectedOutcomeFamilies, selectedSignatures })) continue;
    selected.push(id);
    selectedRoleCounts.set(item.role.id, (selectedRoleCounts.get(item.role.id) ?? 0) + 1);
    rememberClaim(item, { selectedMetricIds, selectedOutcomeFamilies, selectedSignatures });
    if (selected.length >= maxClaims) break;
  }

  for (const id of requiredClaimIds) {
    if (selected.includes(id) || selected.length >= maxClaims) continue;
    const item = itemById.get(id);
    if (!item) continue;
    if (!withinRoleBulletLimit(item, selectedRoleCounts)) continue;
    if (!isDistinctClaim(item, { selectedMetricIds, selectedOutcomeFamilies, selectedSignatures })) continue;
    selected.push(id);
    selectedRoleCounts.set(item.role.id, (selectedRoleCounts.get(item.role.id) ?? 0) + 1);
    rememberClaim(item, { selectedMetricIds, selectedOutcomeFamilies, selectedSignatures });
  }

  return ensureCurrentRoleWeight({ selected, scoredClaims, itemById, maxClaims, requiredClaimIds });
}

function orderResumeClaimIds(claims, selectedClaimIds) {
  const selectedOrder = new Map(selectedClaimIds.map((id, index) => [id, index]));
  return [...claims]
    .sort((a, b) => {
      const aHasOutcome = (a.metric_ids ?? []).length > 0 ? 0 : 1;
      const bHasOutcome = (b.metric_ids ?? []).length > 0 ? 0 : 1;
      if (aHasOutcome !== bHasOutcome) return aHasOutcome - bHasOutcome;
      return (selectedOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (selectedOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER);
    })
    .map((claim) => claim.id);
}

function ensureRoleClaimPresent({ selectedClaimIds, scoredClaims, roleId, preferredClaimIds = [], maxClaims, requiredClaimIds = [] }) {
  const itemById = new Map(scoredClaims.map((item) => [item.claim.id, item]));
  const roleSelected = selectedClaimIds.filter((id) => itemById.get(id)?.role.id === roleId);
  const preferredAvailable = preferredClaimIds.find((id) => itemById.get(id)?.role.id === roleId);
  if (roleSelected.length === 1 && preferredAvailable && roleSelected[0] !== preferredAvailable) {
    return selectedClaimIds.map((id) => id === roleSelected[0] ? preferredAvailable : id);
  }
  if (roleSelected.length > 0) return selectedClaimIds;

  const candidateIds = uniqueValues([
    ...preferredClaimIds,
    ...scoredClaims
      .filter((item) => item.role.id === roleId)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.claim.id)
  ]).filter((id) => itemById.has(id));

  if (preferredAvailable) {
    if (selectedClaimIds.length < maxClaims) return [...selectedClaimIds, preferredAvailable];
    const replaceIndex = weakestReplaceableOlderClaimIndex(selectedClaimIds, itemById, new Set(requiredClaimIds));
    if (replaceIndex >= 0) {
      const next = [...selectedClaimIds];
      next[replaceIndex] = preferredAvailable;
      return next;
    }
  }

  for (const id of candidateIds) {
    const candidate = itemById.get(id);
    if (!candidate) continue;
    const state = selectedDistinctState(selectedClaimIds, itemById);
    if (!isDistinctClaim(candidate, state)) continue;
    if (selectedClaimIds.length < maxClaims) return [...selectedClaimIds, id];

    const replaceIndex = weakestReplaceableOlderClaimIndex(selectedClaimIds, itemById, new Set(requiredClaimIds));
    if (replaceIndex < 0) break;
    const next = [...selectedClaimIds];
    next[replaceIndex] = id;
    return next;
  }

  const fallbackId = candidateIds[0];
  if (!fallbackId) return selectedClaimIds;
  if (selectedClaimIds.length < maxClaims) return [...selectedClaimIds, fallbackId];
  return selectedClaimIds;
}

function ensureCurrentRoleWeight({ selected, scoredClaims, itemById, maxClaims, requiredClaimIds }) {
  const required = new Set(requiredClaimIds);
  const roleCounts = roleClaimCounts(selected, itemById);
  const currentCount = roleCounts.get("role.starlight") ?? 0;
  const olderMax = Math.max(roleCounts.get("role.kannact") ?? 0, roleCounts.get("role.ucsf") ?? 0);
  if (currentCount >= 5 && currentCount > olderMax) return selected;
  if (currentCount >= 7) return trimOlderRolesForCurrentWeight(selected, itemById, required);

  const currentCandidates = scoredClaims
    .filter((item) => item.role.id === "role.starlight" && !selected.includes(item.claim.id))
    .sort((a, b) => b.score - a.score);
  let nextSelected = [...selected];

  for (const candidate of currentCandidates) {
    const current = roleClaimCounts(nextSelected, itemById).get("role.starlight") ?? 0;
    if (current >= 7) break;
    const state = selectedDistinctState(nextSelected, itemById);
    if (!isDistinctClaim(candidate, state)) continue;
    if (nextSelected.length < maxClaims) {
      nextSelected.push(candidate.claim.id);
    } else {
      const replaceIndex = weakestReplaceableOlderClaimIndex(nextSelected, itemById, required);
      if (replaceIndex < 0) break;
      nextSelected[replaceIndex] = candidate.claim.id;
    }
    const counts = roleClaimCounts(nextSelected, itemById);
    const starlightCount = counts.get("role.starlight") ?? 0;
    const maxOlderCount = Math.max(counts.get("role.kannact") ?? 0, counts.get("role.ucsf") ?? 0);
    if (starlightCount >= 5 && starlightCount > maxOlderCount) break;
  }

  return trimOlderRolesForCurrentWeight(nextSelected, itemById, required);
}

function roleClaimCounts(claimIds, itemById) {
  const counts = new Map();
  for (const id of claimIds) {
    const item = itemById.get(id);
    if (!item) continue;
    counts.set(item.role.id, (counts.get(item.role.id) ?? 0) + 1);
  }
  return counts;
}

function selectedDistinctState(claimIds, itemById) {
  const state = {
    selectedMetricIds: new Set(),
    selectedOutcomeFamilies: new Set(),
    selectedSignatures: []
  };
  for (const id of claimIds) {
    const item = itemById.get(id);
    if (item) rememberClaim(item, state);
  }
  return state;
}

function weakestReplaceableOlderClaimIndex(claimIds, itemById, required) {
  let index = -1;
  let score = Infinity;
  for (let i = 0; i < claimIds.length; i += 1) {
    const id = claimIds[i];
    const item = itemById.get(id);
    if (!item || item.role.id === "role.starlight" || required.has(id)) continue;
    const preferencePenalty = item.role.id === "role.ucsf" ? 0 : 3;
    const candidateScore = item.score + preferencePenalty;
    if (candidateScore < score) {
      score = candidateScore;
      index = i;
    }
  }
  return index;
}

function trimOlderRolesForCurrentWeight(claimIds, itemById, required) {
  const nextSelected = [...claimIds];
  while (true) {
    const counts = roleClaimCounts(nextSelected, itemById);
    const current = counts.get("role.starlight") ?? 0;
    const olderMax = Math.max(counts.get("role.kannact") ?? 0, counts.get("role.ucsf") ?? 0);
    if (current === 0 || current > olderMax) return nextSelected;
    const replaceIndex = weakestReplaceableOlderClaimIndex(nextSelected, itemById, required);
    if (replaceIndex < 0) return nextSelected;
    nextSelected.splice(replaceIndex, 1);
  }
}

function seniorClaimScore(text, roleId) {
  const normalized = normalizeSearchText(text);
  let score = 0;
  if (/\b(own|owns|led|lead|partner|translate|translated|strategy|roadmap|enterprise|executive|cross functional|stakeholder|scale|adoption|implementation|operationalize|requirements|systems|model|workflow|business|impact)\b/.test(normalized)) score += 4;
  if (/\b(\d+%|\d+\+|nps|pmpy|year one|health system|partners|enterprise|multi tenant|platform|capacity|conversion|reduction|increase)\b/.test(normalized)) score += 3;
  if (/\b(responsible for|assisted|helped with|worked on|participated in|tasked with)\b/.test(normalized)) score -= 8;
  if (roleId === "role.starlight" && /\b(strategy|enterprise|health system|executive|scale|adoption|implementation|requirements|workflow|billing|ai|capacity|conversion)\b/.test(normalized)) score += 3;
  return score;
}

function withinRoleBulletLimit(item, selectedRoleCounts) {
  const maxForRole = item.role.id === "role.ucsf" ? 2 : 7;
  return (selectedRoleCounts.get(item.role.id) ?? 0) < maxForRole;
}

function isDistinctClaim(item, selected) {
  const metricIds = item.claim.metric_ids ?? [];
  const isKannactExperienceOutcome = metricIds.some((id) => KANNACT_EXPERIENCE_METRIC_IDS.has(id));
  if (isKannactExperienceOutcome && item.role.id !== "role.kannact") return false;
  if (metricIds.some((id) => selected.selectedMetricIds.has(id))) return false;

  const families = claimPurposeFamilyIds(item.claim.text);
  if (families.some((family) => selected.selectedOutcomeFamilies.has(family))) return false;

  const signature = claimSignature(item.claim.text);
  if (selected.selectedSignatures.some((existing) => signaturesAreSimilar(existing, signature))) return false;
  return true;
}

function rememberClaim(item, selected) {
  for (const metricId of item.claim.metric_ids ?? []) selected.selectedMetricIds.add(metricId);
  for (const family of claimPurposeFamilyIds(item.claim.text)) selected.selectedOutcomeFamilies.add(family);
  selected.selectedSignatures.push(claimSignature(item.claim.text));
}

function claimSignature(text) {
  return normalizeSearchText(text)
    .split(/\s+/)
    .filter((token) => token.length > 4 && !SKILL_STOP_WORDS.has(token))
    .filter((token) => !/^\d+$/.test(token));
}

function signaturesAreSimilar(a, b) {
  if (a.length === 0 || b.length === 0) return false;
  const aSet = new Set(a);
  const bSet = new Set(b);
  const shared = [...aSet].filter((token) => bSet.has(token)).length;
  const smaller = Math.min(aSet.size, bSet.size);
  return smaller >= 5 && shared / smaller >= 0.62;
}

function inferRoleContext(context, roleTitle = "") {
  const titleContext = normalizeSearchText(roleTitle);
  const hasAi = /\b(ai|artificial intelligence|automation|algorithm)\b/.test(context);
  const claimsOpsSignal = /\b(claim automation|claims automation|claim processing|claims processing|claims reconciliation|claims ingestion|claims validation|claims adjudication|adjudication lifecycle|adjudication logic|switch transactions|ncpdp|835 era|pbm|pbms|pharmacy network|payment processing|payment systems|payment calculation|disbursement|financial reconciliation|pend management|rework reduction|claims operations|claims administration|claims technology|claims quality|processor productivity|health plan claims|multi lob claims|multi-lob claims)\b/.test(context);
  const pharmacyClaimsSignal = claimsOpsSignal && /\b(pharmacy|pharmacies|pbm|pbms|prescription|medication|ncpdp|switch transactions)\b/.test(context);
  const hasInsurancePlanBenefitsContext = /\binsurance plans?\b/.test(context)
    && /\b(benefits administration|health benefits|health insurance|coverage|plan documents?|insurance recommendations?|employee|employer|small business)\b/.test(context);
  const hasInsurtechBenefits = !pharmacyClaimsSignal && (/\b(insurtech|health benefits|benefits administration|benefits platform|small business owners?|insurance regulations?|plan documents?|insurance recommendations?|netsuite|toast|square)\b/.test(context)
    || hasInsurancePlanBenefitsContext
    || (/\bbenefits\b/.test(context) && /\b(employee|employer|small business|plan|insurance|coverage)\b/.test(context)));
  const hasHousingEngagement = /\bhousing\b/.test(context)
    && /\b(property management|property team|renters?|leases?|maintenance requests?|portfolio performance|ai engagement manager|tour apartments?)\b/.test(context);
  const hasClinical = !hasHousingEngagement && (hasInsurtechBenefits || /\b(clinical|clinician|provider|ambulatory|acute|patient|healthcare|pharma|pharmaceutical|therapeutic)\b/.test(context));
  const hasStrategy = /\b(strategy|roadmap|market|competitive|gtm|commercial|pricing)\b/.test(context);
  const hasOps = /\b(operations|implementation|scale|workflow|process|launch)\b/.test(context);
  const hasExecutive = /\b(chief of staff|ceo|founder|executive|leadership)\b/.test(context);
  const hasHealthSystems = /\b(health system|health systems|healthcare system|healthcare systems|hospital|hospitals|provider organization|provider organizations|enterprise healthcare|healthcare deployment|clinical implementation)\b/.test(context);
  const hasCaregiver = /\b(caregiver|family caregiver|caregiver experience|home care|home health|medicaid)\b/.test(context);
  const hasData = /\b(data|analytics|dashboard|measurement|metrics|insight)\b/.test(context);
  const hasIntegration = /\b(ehr|fhir|api|integration|interoperability)\b/.test(context);
  const hasCommercial = /\b(gtm|commercial|sales|market|pricing|partnership|partner)\b/.test(context);
  const hasHealthcarePartnerWorkflow = /\b(payer|payers|health plan|health plans|health system|health systems|insurance partner|insurance partners|enterprise healthcare|healthcare partner|healthcare partners|strategic healthcare partner|strategic healthcare partners|partner ecosystem|care coordination|clinical workflow|clinical workflows|telehealth|healthcare operations)\b/.test(context);
  const hasDedicatedHealthCommerce = /\b(brand partner|brand partners|partner network|direct sales|affiliate|mlm|marketplace|pharmaceutical-grade|pharmaceutical grade|customers and brand partners)\b/.test(context);
  const hasCommerceOnlySignal = /\b(e-commerce|ecommerce|subscription)\b/.test(context);
  const hasHealthCommerce = hasDedicatedHealthCommerce || (hasCommerceOnlySignal && !hasHealthcarePartnerWorkflow);
  const hasExplicitAiMlPlatform =
    /\b(ai\/ml platform|ai\s*&\s*ml platform|machine learning infrastructure|ml infrastructure|ai developer platform|developer platform that powers intelligent features|model lifecycle|model evaluation|model observability|safe deployment|deploy and monitor ai|production use across all product teams)\b/.test(context)
    || (/\b(ai|ml|machine learning)\b/.test(titleContext) && /\b(platform|infrastructure)\b/.test(titleContext));
  const hasExplicitProductInnovation = /\b(npi|new product innovation|new product innovations|product innovation|innovation roadmap|strategy council|gate process|gate 1|gate 4|business case|business cases|financial model|financial modeling|cost benefit|cost-benefit|projected roi|concept to launch|custom pharmacy|custom pharmacy formulation|formulation|formulations|supplement|supplements|consumer packaged goods|cpg)\b/.test(context);
  const hasDtcInnovationSignal = /\b(direct to consumer|direct-to-consumer|dtc|b2c tech)\b/.test(context);
  const hasProductInnovation = !hasExplicitAiMlPlatform && !hasInsurtechBenefits && !hasHealthCommerce && !hasHealthSystems && (hasExplicitProductInnovation || (hasDtcInnovationSignal && !hasHealthcarePartnerWorkflow));
  const hasHcpMarketing = !hasInsurtechBenefits && !hasProductInnovation && /\b(hcp|health care professional|healthcare professional|peer-to-peer|peer to peer|speaker(?:'s|s)? bureau|speaker training|product theater|tradeshow|trade show|field training|sales tools|sales leadership|hcp marketing|glucose monitoring|diabetes care)\b/.test(context);
  const hasPharmacyInformatics = !claimsOpsSignal && !hasInsurtechBenefits && !hasProductInnovation && !hasHcpMarketing && /\b(pharmacy|pharmacist|pharmacists|pharmacy informatics|medication|medication-use|drug|medical device|clinical decision support|informatics|pbm|pharmacy benefit manager|pharmacy benefit managers)\b/.test(context);
  const hasRevenueCycle = hasRevenueCycleContext(context) && !claimsOpsSignal;
  const hasClaimsOps = claimsOpsSignal;
  const hasStrongConsumerWellbeing = /\b(wearable|companion|journaling|journal|behavioral science|personal well-being|personal wellbeing|target audience)\b/.test(context);
  const hasConsumerWellbeing = !hasRevenueCycle && (hasStrongConsumerWellbeing || (/\b(well-being|wellbeing|habit)\b/.test(context) && /\b(consumer|user experience|product design|prototype|prototyping|beta users|mobile)\b/.test(context)));
  const hasPatientEngagement = !hasPharmacyInformatics && !hasClaimsOps && !hasRevenueCycle && /\b(patient engagement|patient-facing|member-facing|client experience|client outcomes|therapist experience|prescriber onboarding|core experience|marketplace engagement|consumer product|b2c|logged-in consumer|patient dashboard|action items|service discovery|screening completion|test results|messaging|notifications|appointment scheduling|lifecycle|re-engagement|reengagement|retention|next best action|b2b2c|survivorship|caregiver)\b/.test(context);
  const hasUxProductDesign = /\b(user experience|ux|product design|prototype|prototyping|hci|discovery|validate|validation|beta users|emotionally|resonates)\b/.test(context);
  const hasPlatformOperations = /\b(platform ops|platform operations|operational tooling|workflow infrastructure|workflow automations?|internal operational tools?|workflow failures?|operational bottlenecks?|support workflows?|onboarding workflows?|post sale workflows?|post-sale workflows?|new market launch|new market launches|launch readiness|knowledge systems|operational consistency|workflow experiments?)\b/.test(context)
    || /\b(platform ops|platform operations)\b/.test(titleContext);
  const hasProductOpsFunction = hasPlatformOperations || /\b(product operations|product org|product organization|operating system|operating cadence|operating cadences|planning cycle|planning cycles|product review|product reviews|execution check in|execution check ins|execution tracking|planning artifacts|pm tool stack|product manager onboarding|product all hands|product summit|product summits|prd|prds|product culture)\b/.test(context);
  const hasVeeva = /\b(veeva|veeva labs)\b/.test(context);
  const hasLifeSciencesSaaS = !hasInsurtechBenefits && !hasHealthCommerce && /\b(veeva|veeva labs|life sciences|industry cloud|therapies|pharma|pharmaceutical|biopharma|clinical trials|therapeutic area|drug development|salesforce marketing cloud|sitecore|pharmaceutical markets|pharmaceutical domain|public benefit corporation|pbc)\b/.test(context);
  const hasMarketingCloudWeb = /\b(salesforce marketing cloud|sitecore|cms|web analytics)\b/.test(context);
  const hasFintechInfrastructure = !hasExplicitAiMlPlatform && !hasInsurtechBenefits && !hasLifeSciencesSaaS && (
    /\b(plaid|fintech|financial account|financial accounts|financial institution|financial institutions|financial ecosystem|financial freedom|bank connectivity|open banking|open finance|venmo|sofi)\b/.test(context)
    || (/\b(developer platform|developer api)\b/.test(context) && /\b(financial|bank|banking|fintech|payment|payments)\b/.test(context))
  );
  const hasFinanceErp = /\b(erp|accounting|finance operations|financial operations|audit|auditable|accrual|p&l|multi-entity|consolidation|zero-day close|zero day close|source-of-truth|source of truth|board decks)\b/.test(context);
  const hasModelEvaluation = /\b(model evaluation|evaluation system|evaluation systems|benchmark|benchmarking|model behavior|model performance|observability|performance tooling)\b/.test(context);
  const hasStructuredDataSystems = /\b(structured data|relational data|tabular|warehouse|warehouses|lakehouse|lakehouses|data platform|data platforms|large-scale data|distributed infrastructure)\b/.test(context);
  const hasMlLifecycle = /\b(training|post-training|post training|feedback loop|feedback loops|inference|deployment|learning loop|learning loops|continuous learning)\b/.test(context);
  const hasDedicatedAiResearchProduct = /\b(ai|artificial intelligence)\b/.test(titleContext)
    && /\b(research and development|ai research|ai infrastructure|prototype|prototyping|new concepts|data scientists|engineers and data scientists)\b/.test(context);
  const hasAiSystems = hasExplicitAiMlPlatform
    || hasDedicatedAiResearchProduct
    || (!hasClinical && /\b(ai systems|ai infrastructure|ml systems|ml infrastructure|llm systems|model systems|model evaluation|post-training|post training|structured data|relational data|learning efficiency|data efficiency|training|inference)\b/.test(context));
  const hasResearchDriven = /\b(research-driven|research driven|research experiments|applied research|research product|researchers|research scientist|production infrastructure)\b/.test(context);
  const hasIcProductRole = /\b(senior product manager|staff product manager|principal product manager|lead product manager|product manager|ic product|individual contributor)\b/.test(titleContext);
  const hasProductOpsRole = /\b(product operations|platform operations|platform ops|product strategy|implementation|solutions|solution|delivery|strategy operations|strategy and operations|program manager)\b/.test(titleContext);
  const hasPatientAccessHub = /\b(patient access hub|patient access hubs|pharma hub|pharma hubs|hub operations|benefits verification|benefit verification|prior authorization|prior authorizations|provider engagement|time to therapy|time-to-therapy|task success rate|patient activation)\b/.test(context);
  const hasClientImplementation = /\b(client integrations?|solution pilots?|customer enablement|design, build, qa, uat|uat|go-live|go live|hypercare|implementation phases?|system integrations?|client lifecycle|strategic business reviews?)\b/.test(context);
  const hasTechnicalProgramDelivery = /\b(technical program manager|technical delivery|program governance|program-level metrics|cross-functional dependencies|technical roadmap|multiple concurrent programs?|workstreams?|risk mitigation|risk and dependency)\b/.test(context) || (hasProductOpsRole && hasClientImplementation);
  const hasExecutiveTarget = /\b(chief|vp|vice president|head of|director|executive)\b/.test(titleContext) && !hasIcProductRole;
  const hasHandsOnExecution = /\b(hands on|hands-on|requirements|user stories|use cases|workflow|implementation|launch support|rollout|execution|cross functional|stakeholder alignment|user research|service design|ambiguity|operate|operational|build|ship)\b/.test(context);
  const hasHybridInOffice = /\b(hybrid|in office|in-office|onsite|on site|office|collaborate in person|team proximity)\b/.test(context);
  const hasLocationOrAuthorizationConcern = /\b(work authorization|authorized to work|citizenship|visa|sponsorship|hybrid|onsite|on site|in office|in-office|local candidate)\b/.test(context);
  return { hasAi, hasClinical, hasStrategy, hasOps, hasExecutive, hasHealthSystems, hasCaregiver, hasData, hasIntegration, hasCommercial, hasHousingEngagement, hasInsurtechBenefits, hasProductInnovation, hasHcpMarketing, hasPharmacyInformatics, hasRevenueCycle, hasClaimsOps, hasConsumerWellbeing, hasPatientEngagement, hasUxProductDesign, hasPlatformOperations, hasProductOpsFunction, hasPatientAccessHub, hasClientImplementation, hasTechnicalProgramDelivery, hasVeeva, hasHealthCommerce, hasLifeSciencesSaaS, hasMarketingCloudWeb, hasFintechInfrastructure, hasFinanceErp, hasModelEvaluation, hasStructuredDataSystems, hasMlLifecycle, hasAiSystems, hasResearchDriven, hasIcProductRole, hasProductOpsRole, hasExecutiveTarget, hasHandsOnExecution, hasHybridInOffice, hasLocationOrAuthorizationConcern };
}

function stripEmploymentBenefitPerks(context) {
  return String(context ?? "").replace(
    /\b(?:our\s+)?benefits\b[\s\S]*?\b(?:medical|dental|vision|401\s*\(?k\)?|pto|life insurance|pet insurance|health savings|flexible spending)[\s\S]*?(?=\bour company\b|\bcompany values\b|\bsound like\b|\bequal opportunity\b|$)/gi,
    " "
  );
}

function hasRevenueCycleContext(context) {
  if (/\b(revenue cycle|rcm|pre visit|previsit|pre-visit|benefits interpretation|cost estimation|patient financial|payer portal|point of service payment|point-of-service payment|payment journey|insurance verification)\b/.test(context)) {
    return true;
  }
  return /\beligibility\b/.test(context)
    && /\b(patient access|referral intake|insurance verification|insurance coverage|payer|billing)\b/.test(context);
}

function inferCoverLetterStrategy(ctx) {
  const needsHandsOnBridge = !ctx.hasExecutiveTarget && (
    ctx.hasIcProductRole
    || ctx.hasProductOpsRole
    || ctx.hasHandsOnExecution
    || ctx.hasHybridInOffice
  );
  const needsTransitionBridge = !ctx.hasExecutiveTarget && (
    needsHandsOnBridge
    || ctx.hasAiSystems
    || ctx.hasRevenueCycle
    || ctx.hasFinanceErp
    || ctx.hasConsumerWellbeing
    || ctx.hasCommercial
    || (ctx.hasStrategy && !ctx.hasClinical)
  );
  return {
    needs_transition_bridge: needsTransitionBridge,
    needs_hands_on_bridge: needsHandsOnBridge,
    location_or_authorization_concern: ctx.hasLocationOrAuthorizationConcern
  };
}

function inferContextMetricIds(ctx) {
  const metricIds = [];
  if (ctx.hasAi && !ctx.hasAiSystems) metricIds.push("metric.documentation_time_reduction_50", "metric.care_capacity_increase_20");
  if (ctx.hasConsumerWellbeing) metricIds.push("metric.app_satisfaction_76_to_84");
  return metricIds;
}

function buildRoleAnalysis({ context, input, jobDescription, selectedClaims, selectedMetrics, roleContext }) {
  const archetypeScores = ROLE_ARCHETYPES
    .map((archetype) => ({
      label: archetype.label,
      score: archetype.patterns.reduce((score, pattern) => score + (contextMatchesPattern(context, pattern) ? 1 : 0), 0),
      priorities: archetype.priorities,
      skills: archetype.skills
    }))
    .sort((a, b) => b.score - a.score);
  const primary = archetypeScores.find((item) => item.score > 0
    && !(roleContext.hasHousingEngagement && ["Healthcare AI Product", "Clinical Operations Product", "Health System Product", "Patient Engagement Product"].includes(item.label)))
    ?? archetypeScores[0];
  const secondary = archetypeScores
    .filter((item) => item.label !== primary.label && item.score > 0)
    .filter((item) => item.label !== "Insurtech Benefits Platform Product" || roleContext.hasInsurtechBenefits)
    .filter((item) => item.label !== "Healthcare Commerce and Partner Platform Product" || roleContext.hasHealthCommerce)
    .filter((item) => item.label !== "Fintech Product Management" || roleContext.hasFintechInfrastructure)
    .filter((item) => !(roleContext.hasHealthCommerce && item.label === "Life Sciences Enterprise SaaS Product"))
    .filter((item) => !(roleContext.hasHousingEngagement && ["Healthcare AI Product", "Clinical Operations Product", "Health System Product", "Patient Engagement Product"].includes(item.label)))
    .filter((item) => !(roleContext.hasFinanceErp && ["Healthcare AI Product", "Clinical Operations Product", "Health System Product"].includes(item.label)))
    .filter((item) => !((roleContext.hasProductOpsFunction || roleContext.hasFintechInfrastructure) && !roleContext.hasClinical && ["Healthcare AI Product", "Clinical Operations Product", "Health System Product"].includes(item.label)))
    .filter((item) => !(roleContext.hasAiSystems && !roleContext.hasClinical && ["Healthcare AI Product", "Clinical Operations Product", "Health System Product"].includes(item.label)))
    .slice(0, 2);
  const companyPriorities = uniqueValues([
    ...primary.priorities,
    ...secondary.flatMap((item) => item.priorities),
    ...inferCompanyPriorities(roleContext)
  ]).slice(0, 6);
  const requiredSkills = uniqueValues([
    ...primary.skills,
    ...secondary.flatMap((item) => item.skills),
    ...inferRequiredSkills(roleContext)
  ]).filter((skill) => skillAllowedForContext(skill, roleContext)).slice(0, 10);
  const keywords = extractRoleKeywords(context, roleContext);
  const topClaims = selectedClaims.slice(0, 8).map((claim) => ({
    id: claim.id,
    text: claim.text,
    metric_ids: claim.metric_ids ?? []
  }));
  const atsProofPoints = uniqueById([
    ...topClaims.filter((claim) => claim.metric_ids.length > 0),
    ...topClaims
  ]).slice(0, 5);
  const metricProof = selectedMetrics.slice(0, 5).map((metric) => ({
    id: metric.id,
    text: metric.description
  }));

  return {
    job_archetype: primary.label,
    secondary_archetypes: secondary.map((item) => item.label),
    company_priorities: companyPriorities,
    required_skills: requiredSkills,
    preferred_skills: inferPreferredSkills(roleContext),
    role_keywords: keywords,
    packet_proof_points: topClaims.slice(0, 5),
    ats_proof_points: atsProofPoints,
    metrics_to_use: metricProof,
    concern_or_gap: inferConcern(roleContext, { job_archetype: primary.label }),
    recommended_sections: inferRecommendedSections(roleContext),
    recommended_filenames: {
      website_pdf: "Stephanie_Ramsay_[Company]_[Role]_Website_PDF.pdf",
      ats_resume: "Stephanie_Ramsay_[Company]_[Role]_Resume.docx",
      cover_letter: "Stephanie_Ramsay_[Company]_[Role]_Cover_Letter.docx"
    },
    cover_letter_strategy: inferCoverLetterStrategy(roleContext),
    source_quality: {
      job_description_chars: jobDescription.length,
      extraction_warning: input.notes || ""
    }
  };
}

function makePacketHeadline(ctx, analysis) {
  if (ctx.hasHousingEngagement) {
    return "AI engagement and product operations leader translating client workflow pain, adoption barriers, KPI goals, and technical ambiguity into implementation plans, rollout playbooks, measurable ROI, and durable customer trust.";
  }
  if (ctx.hasAiSystems) {
    return "Technical product leader translating AI systems ambiguity, structured data constraints, feedback loops, and performance trade-offs into practical requirements, trustworthy workflows, and production-ready platform execution.";
  }
  if (ctx.hasPlatformOperations) {
    return "Healthcare platform operations leader translating messy onboarding, support, care delivery, launch, tooling, and automation needs into reliable workflows, adopted systems, and measurable operating leverage.";
  }
  if (ctx.hasInsurtechBenefits) {
    return "Insurtech product leader translating health insurance complexity, AI-enabled document workflows, partner integrations, customer trust, and small business benefits needs into clear roadmaps, launches, and scalable platform experiences.";
  }
  if (ctx.hasRevenueCycle) {
    return "Healthcare product leader translating pre-visit workflow complexity, AI-enabled automation, eligibility, billing logic, integration constraints, and patient experience needs into reliable products that reduce manual work and improve financial journeys.";
  }
  if (ctx.hasClaimsOps) {
    return "Healthcare product leader translating claims, payment, reconciliation, operational analytics, and workflow complexity into clear requirements, reliable processes, and cross-functional execution that improves accuracy and trust.";
  }
  if (ctx.hasProductInnovation) {
    return "Healthcare product innovation leader translating patient, clinician, market, partner, and operational insight into 0-to-1 concepts, business-case clarity, launch readiness, and measurable care delivery expansion.";
  }
  if (ctx.hasHealthCommerce) {
    return "Healthcare platform product leader translating customer, partner, clinical, data, and operational needs into trusted commerce workflows, measurable launches, and scalable product systems.";
  }
  if (ctx.hasTechnicalProgramDelivery) {
    return "Healthcare AI delivery leader translating client needs, patient access workflows, integration constraints, product requirements, risk signals, and UAT readiness into launchable programs teams can trust.";
  }
  if (ctx.hasAi && ctx.hasHealthSystems) {
    return "Healthcare AI product leader connecting hospital workflow insight, patient journey data, VOC, and technical ambiguity into roadmaps, requirements, launches, and adoption.";
  }
  if (ctx.hasIcProductRole && (ctx.hasClinical || ctx.hasHealthSystems)) {
    return "Healthcare product leader translating client needs, clinical workflows, patient journey data, roadmap tradeoffs, and cross-functional execution into scalable platform capabilities and measurable care-team outcomes.";
  }
  if (ctx.hasProductOpsFunction) {
    return "Product operations leader translating ambiguous product priorities, planning systems, AI-assisted workflows, and cross-functional execution into lightweight operating cadences, clearer decisions, and adopted team practices.";
  }
  if (ctx.hasHcpMarketing) {
    return "Healthcare product and GTM leader translating provider insights, regulated program operations, content planning, field enablement, and measurement into compliant HCP education launches that teams can trust.";
  }
  if (ctx.hasPharmacyInformatics) {
    return "Healthcare data product leader translating clinical workflow complexity, EHR/FHIR constraints, product requirements, and regulated health-system feedback into roadmap decisions and launch-ready products.";
  }
  if (ctx.hasLifeSciencesSaaS) {
    return "Life sciences SaaS product leader translating customer and internal workflows, executive priorities, data signals, and technical ambiguity into clear requirements, intuitive applications, and high-quality launches.";
  }
  if (ctx.hasFintechInfrastructure) {
    return "Senior product leader translating customer needs, data, market signals, AI-assisted discovery, and technical ambiguity into clear requirements, intuitive product experiences, and high-quality launches.";
  }
  if (ctx.hasFinanceErp) {
    return "Enterprise SaaS product leader translating complex workflows, data-heavy systems, AI automation, compliance constraints, and customer discovery into clear roadmaps, intuitive features, and measurable adoption.";
  }
  if (ctx.hasPatientEngagement) {
    return "Healthcare product leader translating patient journeys, lifecycle engagement, cross-channel activation, AI-enabled workflows, and regulated B2B2C care models into experiences that move people to the next best step.";
  }
  if (ctx.hasConsumerWellbeing) {
    return "Product leader translating AI, behavior change, user research, data insight, and emotionally resonant experience design into practical product strategy from demo to market.";
  }
  if (ctx.hasCaregiver) {
    return "Healthcare product and operations leader translating family, patient, payer, and care-team workflows into practical product systems, adoption plans, and measurable care delivery outcomes.";
  }
  if (ctx.hasAi && ctx.hasClinical) {
    return "Healthcare AI product and operations leader translating clinical needs, VOC, regulated workflows, and technical ambiguity into roadmaps, requirements, launches, and measurable care-team impact.";
  }
  if (ctx.hasExecutive || ctx.hasOps) {
    return "Healthcare operator and CEO-side strategic partner turning ambiguous priorities, clinical workflows, and cross-functional decisions into operating plans, launches, and measurable execution.";
  }
  return `${analysis.job_archetype} leader translating patient, clinician, partner, and operational needs into practical product systems, adoption plans, and measurable outcomes.`;
}

function makeResumeHeadline(ctx, analysis) {
  if (ctx.hasHousingEngagement) return "AI Engagement Leader | Client Strategy, Workflow Transformation, Adoption & ROI";
  if (ctx.hasAiSystems) return "Technical Product Leader | AI Systems, Structured Data, Evaluation & Platform Execution";
  if (ctx.hasPlatformOperations) return "Healthcare Platform Operations Leader | Workflow Infrastructure, Automation, Launch & Scale";
  if (ctx.hasInsurtechBenefits) return "Lead Product Manager | Insurtech, AI Workflows, Partner Integrations & 0-to-1 Scale";
  if (ctx.hasRevenueCycle) return "Healthcare Product Leader | RCM Workflows, Pre-Visit Automation, AI & Patient Experience";
  if (ctx.hasClaimsOps) return "Healthcare Product Leader | Claims Workflows, Payment Accuracy, Analytics & Roadmaps";
  if (ctx.hasProductInnovation) return "Healthcare Product Innovation Leader | 0-to-1 Strategy, Market Insight, Roadmaps & Launch";
  if (ctx.hasHealthCommerce) return "Senior Product Manager | Healthcare Platforms, Partner Workflows, Customer Experience & Launch";
  if (ctx.hasTechnicalProgramDelivery) return "Healthcare AI Delivery Leader | Patient Access, Integrations, UAT & Launch";
  if (ctx.hasAi && ctx.hasHealthSystems) return "Healthcare AI Product Leader | Hospital Workflows, Patient Journey Data, VOC & Launch";
  if (ctx.hasIcProductRole && (ctx.hasClinical || ctx.hasHealthSystems)) return "Healthcare Product Leader | Clinical Workflows, Roadmaps, VOC & Launch";
  if (ctx.hasProductOpsFunction) return "Product Operations Leader | Operating Cadences, PM Enablement, AI Workflows & Execution";
  if (ctx.hasHcpMarketing) return "Healthcare Product Leader | HCP Education, GTM Enablement, Compliance & Program Execution";
  if (ctx.hasPharmacyInformatics) return "Healthcare Product Leader | Clinical Workflows, Health System Data, Roadmaps & AI";
  if (ctx.hasLifeSciencesSaaS) return "Senior Product Manager | Life Sciences SaaS, Customer Discovery, Requirements & Launch Execution";
  if (ctx.hasFintechInfrastructure) return "Senior Product Manager | Roadmap, Customer Discovery, AI Workflows & Launch Execution";
  if (ctx.hasFinanceErp) return "Enterprise SaaS Product Leader | AI Workflows, Data-Heavy Systems, Integrations & Adoption";
  if (ctx.hasPatientEngagement) return "Healthcare Product Leader | Patient Engagement, Lifecycle Activation, AI Workflows & UX";
  if (ctx.hasConsumerWellbeing) return "AI Product Leader | Well-Being, UX Strategy, Behavior Change, Prototyping & Data-Informed Growth";
  if (ctx.hasAi && ctx.hasClinical) return "Healthcare AI Operator | Clinical Workflows, VOC, Product Strategy & Launch Execution";
  if (ctx.hasCaregiver) return "Healthcare Product & Operations Leader | Care Delivery, Family Workflows, Patient Access & Scale";
  if (ctx.hasStrategy) return "Healthcare Strategy & Operations Leader | Product Systems, Market Insight & Cross-Functional Execution";
  return `${analysis.job_archetype} Leader | Clinical Workflows, Implementation & Measurable Care Impact`;
}

function makeSidePanelSummary(ctx, analysis) {
  if (ctx.hasHousingEngagement) {
    return "Product and AI operations leader with experience turning complex, human-heavy workflows into clear implementation plans, adoption strategies, executive-ready KPI narratives, product feedback loops, and scalable operating systems.";
  }
  if (ctx.hasAiSystems) {
    return "Product leader with experience across AI-enabled workflow adoption, data-heavy SaaS platforms, structured data foundations, product quality signals, performance measurement, customer feedback loops, and cross-functional execution from ambiguous problem definition to launch.";
  }
  if (ctx.hasPlatformOperations) {
    return "Healthcare product and operations leader with experience across onboarding, patient access, care delivery workflows, AI-enabled automation, operational tooling, partner rollout, dashboards, launch readiness, and cross-functional execution.";
  }
  if (ctx.hasInsurtechBenefits) {
    return "Product leader with experience across healthcare access workflows, eligibility and insurance verification, AI-enabled documentation, enterprise partner rollout, data-informed roadmaps, customer feedback loops, secure SaaS platforms, and 0-to-1 healthcare launch execution.";
  }
  if (ctx.hasRevenueCycle) {
    return "Healthcare product leader with experience across patient access, eligibility, insurance verification, billing-adjacent workflows, AI-enabled automation, EHR/FHIR foundations, partner implementation, operational controls, and patient-facing product experience.";
  }
  if (ctx.hasClaimsOps) {
    return "Healthcare product leader with experience across billing-adjacent workflow design, eligibility and insurance verification, operational controls, data-informed roadmaps, AI-enabled documentation, partner implementation, and cross-functional product execution.";
  }
  if (ctx.hasProductInnovation) {
    return "Healthcare product leader with experience across 0-to-1 virtual care models, customer and partner discovery, roadmap ownership, market-informed prioritization, operational readiness, executive communication, regulated launches, and adoption measurement.";
  }
  if (ctx.hasHealthCommerce) {
    return "Healthcare product leader with experience across customer and partner discovery, platform workflows, regulated launches, product analytics, AI-enabled operations, patient-facing experience, and cross-functional execution.";
  }
  if (ctx.hasProductOpsFunction) {
    return "Product leader with experience building operating clarity across roadmap priorities, requirements, workflow design, customer discovery, AI-enabled automation, partner rollout, and cross-functional execution.";
  }
  if (ctx.hasHcpMarketing) {
    return "Healthcare product leader with experience across provider workflow discovery, partner enablement, regulated program execution, launch planning, product demos, executive communication, reporting, and adoption measurement.";
  }
  if (ctx.hasPharmacyInformatics) {
    return "Healthcare product leader with direct roadmap, requirements, launch, and optimization experience across regulated care platforms, health-system partner workflows, EHR-adjacent data sharing, AI documentation, and care-team operations.";
  }
  if (ctx.hasLifeSciencesSaaS) {
    return "Product leader with life sciences, digital health, enterprise SaaS, customer discovery, executive alignment, requirements, engineering partnership, QA-ready launch, workflow, and adoption proof.";
  }
  if (ctx.hasFintechInfrastructure) {
    return "Product leader with roadmap ownership, customer discovery, AI-enabled workflow, metrics, integration, launch, and cross-functional execution experience in regulated, high-trust SaaS systems.";
  }
  if (ctx.hasFinanceErp) {
    return "Product leader with enterprise SaaS, workflow automation, data model, integration, reporting, access control, customer discovery, and cross-functional execution experience in regulated, high-trust systems.";
  }
  if (ctx.hasPatientEngagement) {
    return "Healthcare product and experience leader with patient-facing platform, lifecycle engagement, omnichannel communication, activation, scheduling, dashboard, and AI-enabled workflow proof across regulated B2B2C care models.";
  }
  if (ctx.hasConsumerWellbeing) {
    return "Product and experience leader with deep behavior-change, engagement, UX, AI-enabled workflow, data, and zero-to-one platform experience, bringing healthcare-grade empathy to consumer well-being product development.";
  }
  if (ctx.hasAi) {
    return `Healthcare product and operations leader with clinical workflow fluency, VOC discipline, implementation depth, and a record of translating ${analysis.company_priorities[0] ?? "ambiguous care delivery needs"} into usable AI-enabled product systems.`;
  }
  return "Healthcare operator with product depth, clinical workflow fluency, and a record of translating ambiguous strategy into practical execution across partners, teams, and care delivery systems.";
}

function makeSignals(ctx, analysis) {
  const base = [
    analysis.required_skills[0] ? `${titleCase(analysis.required_skills[0])} with practical launch execution` : "Clinical VOC and health system stakeholder discovery",
    analysis.company_priorities[0] ? `Proof against ${analysis.company_priorities[0]}` : "Product requirements from complex provider workflows",
    "Cross-functional execution across clinical, product, engineering, compliance, and operations",
    "Partner-ready implementation, dashboards, workflows, and launch support",
    "UCSF clinical research and digital health experience"
  ];
  if (ctx.hasHousingEngagement) {
    return [
      "Client-facing AI rollout proof across discovery, workflow mapping, product requirements, launch planning, adoption, and measurable outcomes",
      "Executive stakeholder communication that connects workflow change, KPI movement, operational value, and product priorities",
      "AI-enabled documentation and summarization translated into practical capacity gains without adding manual burden",
      "Repeatable operating playbooks built through intake, escalation, implementation, dashboards, and partner rollout work",
      "Cross-functional execution with product, engineering, operations, customer, compliance, analytics, and executive stakeholders"
    ];
  }
  if (ctx.hasAiSystems) {
    return [
      "AI workflow proof translated into adopted product behavior, human review expectations, measurable capacity gains, and operational trust",
      "Structured data and platform proof across FHIR-based data foundations, data model simplification, reporting, secure access, and partner-specific deployment needs",
      "Feedback-loop discipline through user interviews, surveys, usage signals, operational data, and roadmap prioritization",
      "Ambiguous technical requirements translated across product, engineering, operations, compliance, customer, and executive stakeholders",
      "Hands-on product execution from research or workflow insight through requirements, rollout planning, adoption measurement, and production improvement"
    ];
  }
  if (ctx.hasPlatformOperations) {
    return [
      "Workflow infrastructure proof across intake, eligibility, support, billing-adjacent handoffs, care-team documentation, escalation, and follow-up",
      "Operational tooling and automation translated into lower manual burden, clearer visibility, and measurable care-team capacity gains",
      "Ground-truth workflow research with clinicians, operations leaders, customers, and enterprise partners turned into requirements and rollout plans",
      "Launch and scale ownership across virtual clinic buildout, partner onboarding, implementation strategy, dashboards, and operational readiness",
      "Cross-functional execution with product, engineering, clinical operations, compliance, analytics, customer, and executive stakeholders"
    ];
  }
  if (ctx.hasClaimsOps) {
    return [
      "Workflow automation and operating-model proof across eligibility, insurance verification, billing, documentation, controls, and handoffs",
      "Roadmap, requirements, OKR, backlog, launch, and adoption ownership in regulated healthcare environments",
      "AI-enabled documentation and summarization translated into practical operational capacity gains",
      "Operational analytics, dashboards, quality signals, and feedback loops used to guide product priorities",
      "Cross-functional execution across product, engineering, data, operations, compliance, clinical, executive, and partner stakeholders"
    ];
  }
  if (ctx.hasInsurtechBenefits) {
    return [
      "Health insurance and benefits complexity translated into clear product workflows across intake, eligibility, verification, billing, and support",
      "AI documentation and summarization proof with measurable reduction in review time and higher care-team capacity",
      "Embedded partner and enterprise rollout experience across requirements, integration, launch readiness, adoption, and operational scale",
      "Customer and partner VOC turned into roadmap priorities, product requirements, success metrics, and executive-ready narratives",
      "0-to-1 healthcare platform ownership with regulated execution, cross-functional leadership, and trust-centered user experience"
    ];
  }
  if (ctx.hasProductInnovation) {
    return [
      "0-to-1 healthcare product ownership across concept definition, requirements, launch readiness, and scale",
      "Customer, clinician, partner, and market insight translated into roadmap priorities and measurable success criteria",
      "Business-case adjacent product work through product demos, partner narratives, performance dashboards, and executive communication",
      "Operational readiness across clinical, product, engineering, compliance, operations, customer, and commercial stakeholders",
      "Regulated care delivery expansion with adoption, activation, capacity, satisfaction, and retention proof"
    ];
  }
  if (ctx.hasHcpMarketing) {
    return [
      "Provider and health-system VOC translated into clear requirements, rollout plans, product education, and measurable success criteria",
      "Regulated healthcare execution across product, clinical, compliance, operations, partner, and executive stakeholders",
      "GTM and provider enablement proof through product-led demos, partner onboarding, communication workflows, and launch support",
      "Program measurement experience across dashboards, reporting, OKRs, feedback loops, and leadership communication",
      "Hands-on execution from ambiguous business priorities through content planning, launch readiness, adoption, and post-launch improvement"
    ];
  }
  if (ctx.hasPharmacyInformatics) {
    return [
      "Product strategy, roadmap ownership, prioritization, and requirements across regulated healthcare software and data-adjacent workflow products",
      "Clinical and health-system workflow discovery with clinicians, operational leaders, enterprise partners, and care teams",
      "EHR/FHIR-adjacent data sharing, documentation workflows, dashboards, reporting, and workflow automation",
      "Launch, adoption, partner onboarding, and post-launch optimization across complex healthcare programs",
      "Cross-functional delivery with product, engineering, clinical, compliance, operations, customer, and commercial stakeholders"
    ];
  }
  if (ctx.hasRevenueCycle) {
    return [
      "Pre-visit workflow proof across patient access, referral intake, eligibility, insurance verification, billing, follow-up, and support",
      "AI-enabled documentation and summarization translated into measurable capacity gains and lower administrative burden",
      "Roadmap, requirements, launch, adoption, and operational control ownership in regulated healthcare environments",
      "EHR/FHIR, API, reporting, configuration, and partner implementation experience across healthcare platforms",
      "Cross-functional execution with product, engineering, clinical operations, compliance, GTM, customer, executive, and partner stakeholders"
    ];
  }
  if (ctx.hasHealthCommerce) {
    return [
      "Customer and partner VOC translated into roadmap priorities, product requirements, rollout plans, and measurable success criteria",
      "Healthcare platform proof across patient-facing experience, partner workflows, secure access, reporting, and scalable operations",
      "AI-enabled workflow implementation with practical adoption, human judgment, and measurable capacity gains",
      "Regulated product execution across product, engineering, design, data, operations, compliance, customer, and executive stakeholders",
      "Hands-on product ownership from ambiguity through backlog tradeoffs, launch readiness, iteration, and scale"
    ];
  }
  if (ctx.hasConsumerWellbeing) {
    return [
      "End-to-end product strategy across discovery, roadmap, launch, adoption, and post-launch optimization",
      "Behavior-change, patient engagement, habit formation, and emotionally resonant experience design",
      "Rapid prototyping, user interviews, feedback loops, and data-informed iteration",
      "AI-enabled documentation, summarization, automation, and workflow design translated into human-centered product experiences",
      "Consumer-grade mobile, omnichannel engagement, activation, and retention outcomes"
    ];
  }
  if (ctx.hasAi && ctx.hasHealthSystems) {
    return [
      "Hospital and health-system workflow discovery translated into product requirements, roadmap priorities, and launch plans",
      "Patient journey data, VOC, NPS-adjacent feedback loops, and success metrics used to guide product decisions",
      "AI-enabled documentation and summarization translated into practical care-team capacity gains",
      "Enterprise healthcare partner onboarding, implementation strategy, dashboards, and adoption measurement",
      "Cross-functional execution with product, design, engineering, clinical, compliance, customer, commercial, and executive stakeholders"
    ];
  }
  if (ctx.hasPatientEngagement) {
    return [
      "Patient-facing product ownership across intake, onboarding, dashboards, communication, scheduling, and engagement",
      "Lifecycle activation and re-engagement proof across B2B2C healthcare programs with measurable patient outcomes",
      "Omnichannel engagement, SMS, email, secure messaging, reminders, and service activation experience",
      "AI-enabled documentation, summarization, and workflow design translated into usable healthcare experiences",
      "Cross-functional execution with product, design, engineering, clinical, marketing, compliance, and customer stakeholders"
    ];
  }
  if (ctx.hasProductOpsFunction) {
    return [
      "Roadmap, requirements, execution tracking, and release-readiness ownership across complex product work",
      "Product operating habits built through OKRs, feedback loops, workflow standards, and adoption measurement",
      "AI-enabled workflow proof with practical implementation, human judgment, and measurable capacity gains",
      "Enterprise partner onboarding, implementation strategy, dashboards, and decision visibility",
      "Cross-functional execution with product, engineering, design, operations, compliance, customer, and executive stakeholders"
    ];
  }
  if (ctx.hasLifeSciencesSaaS) {
    return [
      "Senior product ownership across discovery, roadmap tradeoffs, requirements, launch readiness, and adoption measurement",
      "Life sciences and healthcare workflow fluency across patients, clinicians, partners, operational teams, and executives",
      "Internal and customer-facing application proof across configurable SaaS workflows, dashboards, secure access, and integrations",
      "AI-enabled workflow implementation with practical adoption, human judgment, and measurable capacity gains",
      "Cross-functional execution with product, engineering, QA, design, operations, compliance, customer, GTM, and executive stakeholders"
    ];
  }
  if (ctx.hasFintechInfrastructure) {
    return [
      "Product area ownership through problem definition, clear requirements, roadmap tradeoffs, and execution",
      "Customer discovery, VOC, data-informed prioritization, market signals, and adoption measurement",
      "AI-enabled product workflow proof across research, analysis, documentation, and practical automation",
      "Engineering, design, GTM, partner, and executive alignment in fast-moving ambiguous environments",
      "High-trust SaaS experience across integrations, dashboards, secure access, reporting, and scalable workflows"
    ];
  }
  if (ctx.hasFinanceErp) {
    return [
      "Enterprise SaaS platform, multi-tenant systems, reporting, secure access, and scalable workflow proof",
      "Customer discovery, VOC, roadmap ownership, product requirements, release readiness, and adoption measurement",
      "AI-enabled automation, documentation, summarization, and human-in-the-loop workflow judgment",
      "Data model simplification, integrations, dashboards, access control, and secure operational systems",
      "Cross-functional execution with engineering, design, operations, compliance, customer, and executive stakeholders"
    ];
  }
  if (ctx.hasAi) base[2] = "AI-enabled documentation, summarization, and care-team capacity gains";
  if (ctx.hasStrategy) base[3] = "Strategic roadmap, market translation, and partner enablement";
  return base;
}

function makeThesis(company, roleTitle, ctx, analysis) {
  if (ctx.hasHousingEngagement) {
    return `Stephanie's strongest fit for ${possessive(company)} ${roleTitle} role is her ability to translate complex operating workflows into AI-enabled implementation plans, executive-ready KPI narratives, adoption playbooks, product feedback, and measurable customer value.`;
  }
  if (ctx.hasAiSystems) {
    return `Stephanie's strongest fit for ${possessive(company)} ${roleTitle} role is her ability to translate ambiguous AI, data, workflow, and platform problems into clear product direction, quality signals, technical requirements, rollout plans, and measurable real-world outcomes.`;
  }
  if (ctx.hasPlatformOperations) {
    return `Stephanie's strongest fit for ${possessive(company)} ${roleTitle} role is her ability to turn messy healthcare workflows into operational tooling, automation-ready requirements, launch playbooks, visibility systems, and cross-functional execution that scale without adding unnecessary complexity.`;
  }
  if (ctx.hasInsurtechBenefits) {
    return `Stephanie's strongest fit for ${possessive(company)} ${roleTitle} role is her ability to turn complex healthcare, benefits, partner, AI, and user-experience problems into clear product strategy, integration-ready requirements, launch plans, and trusted workflows people can actually use.`;
  }
  if (ctx.hasRevenueCycle) {
    return `Stephanie's strongest fit for ${possessive(company)} ${roleTitle} role is her ability to turn messy healthcare workflows into clear product strategy, automation-ready requirements, reliable operating logic, and patient-centered experiences that teams can trust in production.`;
  }
  if (ctx.hasClaimsOps) {
    return `Stephanie's strongest fit for ${possessive(company)} ${roleTitle} role is her ability to move complex healthcare operations from ambiguous workflow pain to clear product roadmaps, requirements, operating controls, analytics, adoption plans, and accountable cross-functional execution.`;
  }
  if (ctx.hasHealthCommerce) {
    return `Stephanie's strongest fit for ${possessive(company)} ${roleTitle} role is her ability to connect customer and partner insight, regulated healthcare judgment, product requirements, data-informed prioritization, and hands-on launch execution into platform experiences people can trust.`;
  }
  if (ctx.hasTechnicalProgramDelivery) {
    return `Stephanie's strongest fit for ${possessive(company)} ${roleTitle} role is her ability to move healthcare AI and workflow programs from ambiguous customer need to clear requirements, integration plans, launch readiness, UAT, adoption, and measurable operating outcomes.`;
  }
  if (ctx.hasAi && ctx.hasHealthSystems) {
    return `Stephanie's strongest fit for ${possessive(company)} ${roleTitle} role is her ability to translate hospital workflow, patient journey data, customer feedback, and AI-enabled operations into clear roadmap decisions, product requirements, launch plans, and measurable adoption.`;
  }
  if (ctx.hasProductOpsFunction) {
    return `Stephanie's strongest fit for ${possessive(company)} ${roleTitle} role is her ability to build practical product operating systems: clarifying priorities, translating ambiguity into execution rhythms, improving visibility, and turning AI or automation ideas into adopted workflow capabilities.`;
  }
  if (ctx.hasProductInnovation) {
    return `Stephanie's strongest fit for ${possessive(company)} ${roleTitle} role is her ability to turn healthcare market, partner, clinical, and patient insight into 0-to-1 product direction, business-case-ready narratives, launch plans, and measurable care delivery outcomes.`;
  }
  if (ctx.hasHcpMarketing) {
    return `Stephanie's strongest fit for ${possessive(company)} ${roleTitle} role is her ability to turn healthcare stakeholder insight into clear product strategy, compliant program operations, provider enablement, launch execution, dashboards, and measurable adoption.`;
  }
  if (ctx.hasPharmacyInformatics) {
    return `Stephanie's strongest fit for ${possessive(company)} ${roleTitle} role is her ability to pair established product management ownership with clinical workflow fluency: owning roadmaps, translating health-system and clinician needs into requirements, partnering with engineering, and shipping regulated workflow products that teams can trust.`;
  }
  if (ctx.hasLifeSciencesSaaS) {
    return `Stephanie's strongest fit for ${possessive(company)} ${roleTitle} role is her ability to turn ambiguous healthcare and life sciences workflow needs into clear product requirements, roadmap decisions, user-centered applications, executive alignment, and high-quality launches.`;
  }
  if (ctx.hasFintechInfrastructure) {
    return `Stephanie's strongest fit for ${possessive(company)} ${roleTitle} role is her ability to own ambiguous product areas end to end: defining problems, turning customer needs into clear requirements, using data and feedback to shape roadmap decisions, and shipping high-quality experiences with engineering, design, and GTM partners.`;
  }
  if (ctx.hasFinanceErp) {
    return `Stephanie's strongest fit for ${possessive(company)} ${roleTitle} role is her ability to turn complex, regulated, workflow-driven SaaS problems into clear product direction, data-informed roadmap decisions, intuitive automation, and adoption-ready launches.`;
  }
  if (ctx.hasConsumerWellbeing) {
    return `Stephanie's strongest fit for ${possessive(company)} ${roleTitle} role is her ability to turn AI, behavior change, user empathy, product design, and data-informed discovery into emotionally resonant product experiences that move from early concept to shipped, scalable systems.`;
  }
  if (ctx.hasPatientEngagement) {
    return `Stephanie's strongest fit for ${possessive(company)} ${roleTitle} role is her ability to connect patient-facing product craft, lifecycle engagement, clinical workflow reality, AI-enabled operations, and cross-functional execution into experiences that help patients take the next best step.`;
  }
  const domain = ctx.hasAi ? "healthcare AI and clinical workflow" : "healthcare product and operations";
  const priority = analysis.company_priorities[0] ?? "practical product execution";
  return `Stephanie's strongest fit for ${possessive(company)} ${roleTitle} role is her ability to move from ${domain} ambiguity to ${priority}, clear requirements, launch plans, partner adoption, and measurable care delivery outcomes.`;
}

function inferConcern(ctx, analysis = {}) {
  if (ctx.hasHousingEngagement) {
    return "Address direct real estate asset-management depth by emphasizing transferable client strategy, workflow transformation, AI rollout, executive stakeholder advising, change management, ROI measurement, and property-operations curiosity without overstating domain ownership.";
  }
  if (ctx.hasAiSystems) {
    return "Address direct ML infrastructure depth by emphasizing transferable AI workflow implementation, structured data foundations, product quality signals, performance measurement, research-to-product translation, and cross-functional technical execution without overstating model-training ownership.";
  }
  if (ctx.hasPlatformOperations) {
    return "Address the title shift from product leadership into strategy and platform operations by emphasizing intentional hands-on operating work: workflow research, operational tooling, automation, implementation, launch readiness, analytics visibility, and cross-functional healthcare execution.";
  }
  if (ctx.hasInsurtechBenefits) {
    return "Address direct insurance-carrier or benefits-broker depth by emphasizing transferable health insurance workflow adjacency, eligibility and verification experience, AI-enabled document automation, embedded partner rollout, customer trust, executive communication, and regulated healthcare product execution.";
  }
  if (ctx.hasRevenueCycle) {
    return "Address direct RCM vendor depth by emphasizing transferable patient access, eligibility, insurance verification, billing workflow, AI-enabled administrative automation, operational analytics, integration, roadmap ownership, and fast healthcare execution experience.";
  }
  if (ctx.hasClaimsOps) {
    return "Address direct pharmacy claims adjudication depth by emphasizing transferable healthcare operations, eligibility and billing workflow design, AI-enabled administrative automation, operational analytics, roadmap ownership, change management, and disciplined partnership with finance, operations, and engineering teams.";
  }
  if (ctx.hasHealthCommerce) {
    return "Address direct commerce, subscription, or affiliate-platform depth by emphasizing transferable healthcare platform ownership, customer and partner discovery, partner workflow design, product analytics, regulated execution, and fast cross-functional launch discipline.";
  }
  if (ctx.hasTechnicalProgramDelivery) {
    return "Address direct pharma hub implementation depth by emphasizing transferable patient access, eligibility and insurance verification workflows, health-system client enablement, AI-enabled workflow delivery, technical requirements, integration planning, UAT, launch readiness, and cross-functional risk management.";
  }
  if (ctx.hasProductOpsFunction) {
    if (ctx.hasClinical || ctx.hasHealthSystems) {
      return "Emphasize hands-on healthcare product ownership across hospital or health-system workflows, customer feedback loops, roadmap tradeoffs, product methodology adoption, cross-functional execution, and AI-enabled workflow adoption.";
    }
    return "Address the non-fintech domain shift by emphasizing transferable enterprise SaaS product operations, technical curiosity, high-trust workflow systems, cross-functional execution, partner-facing implementation, and AI-enabled workflow adoption.";
  }
  if (ctx.hasProductInnovation) {
    return "Address direct CPG or supplement launch depth by emphasizing transferable 0-to-1 healthcare product ownership, market and customer research, product-demo and commercial narrative work, clinical and operational launch readiness, partner integrations, and data-informed executive communication.";
  }
  if (ctx.hasHcpMarketing) {
    return "Address direct speaker-bureau and tradeshow ownership by emphasizing transferable HCP/provider engagement, product marketing adjacency, regulated healthcare execution, training and onboarding program design, dashboards, sales enablement, and cross-functional launch discipline.";
  }
  if (ctx.hasPharmacyInformatics) {
    return "Emphasize the match between established product management ownership and adjacent healthcare domain experience in health-system workflows, clinical documentation, healthcare data, EHR/FHIR interoperability, regulated execution, and clinical operations.";
  }
  if (ctx.hasLifeSciencesSaaS) {
    if (ctx.hasVeeva) {
      return "Address Veeva-specific product domain depth by emphasizing transferable life sciences adjacency, regulated healthcare SaaS product work, executive stakeholder alignment, technical requirements, customer discovery, engineering partnership, and high-quality launch execution.";
    }
    return "Address direct pharma platform domain depth by emphasizing transferable life sciences adjacency, regulated healthcare product work, omnichannel engagement, stakeholder alignment, user stories and requirements, analytics-backed iteration, and high-quality launch execution.";
  }
  if (ctx.hasFintechInfrastructure) {
    return "Address fintech as a nice-to-have by emphasizing transferable high-trust SaaS product ownership, customer discovery, technical curiosity, data-informed roadmap decisions, engineering and design partnership, and AI-enabled product workflows.";
  }
  if (ctx.hasFinanceErp) {
    return "Address direct ERP/accounting domain depth by emphasizing transferable enterprise SaaS product work across complex workflows, reporting, data models, integrations, secure access control, compliance, automation tradeoffs, customer discovery, and fast cross-functional execution.";
  }
  if (ctx.hasConsumerWellbeing) {
    return "Address the consumer wearable category shift by emphasizing Stephanie's hands-on product strategy, UX ownership, behavior-change work, prototyping mindset, mobile experience leadership, engagement outcomes, and applied AI product judgment.";
  }
  if (ctx.hasPatientEngagement) {
    return "Address the senior IC scope by emphasizing hands-on patient-facing product ownership, lifecycle engagement metrics, cross-channel orchestration, experimentation mindset, and AI-enabled healthcare workflow judgment.";
  }
  if (ctx.hasAi) {
    return `Address depth in technical or algorithm-specific work by emphasizing ${analysis.job_archetype === "Health System Product" ? "health-system deployment, clinician trust," : "clinical translation,"} AI-enabled workflow implementation, requirements quality, and cross-functional execution.`;
  }
  if (ctx.hasStrategy) {
    return "Address any perceived title mismatch by making the CEO-side strategy, operating model, roadmap, and execution scope explicit.";
  }
  return "Address breadth by connecting Chief Experience Officer title to actual cross-functional product, operations, partner, and clinical workflow ownership.";
}

function makeResumeSummary(ctx) {
  const anchor = ctx.hasClaimsOps
    ? "I am a product leader and AI operator with 7+ years in digital health, building 0-to-1 and 1-to-N care management platforms, mobile apps, and virtual clinic workflows with outcomes including 70% referral-to-enrollment conversion and net churn under 2%."
    : "I am a product leader and AI operator with 7+ years in digital health, building 0-to-1 and 1-to-N care management platforms, mobile apps, and virtual clinic workflows with outcomes including reduced documentation and chart review time by 50%, increased care capacity by 20%, and net churn under 2%.";
  const scope = "I have built a virtual clinic from scratch, led AI strategy, and owned patient, clinician, and enterprise health system partner experiences through launch and scale.";
  return sanitizeFinalText(`${anchor} ${scope} ${makeResumeSummaryLens(ctx)}`);
}

function makeResumeSummaryLens(ctx) {
  if (ctx.hasHousingEngagement) {
    return "I bring client-facing implementation, workflow research, AI-enabled operations, adoption planning, KPI interpretation, executive synthesis, and product feedback loops that help teams trust and use new systems.";
  }
  if (ctx.hasAiSystems) {
    return "My AI systems work translates ambiguous workflows, structured data, evaluation signals, feedback loops, and human-in-the-loop needs into trusted operational systems.";
  }
  if (ctx.hasPlatformOperations) {
    return "My platform operations work turns messy healthcare workflows into operational tooling, automation-ready requirements, launch playbooks, dashboards, and systems care teams can trust.";
  }
  if (ctx.hasInsurtechBenefits) {
    return "My insurtech-adjacent work translates eligibility, insurance verification, billing, AI documentation, partner rollout, and customer workflow complexity into trusted product systems.";
  }
  if (ctx.hasRevenueCycle) {
    return "My patient access work spans intake, eligibility, billing logic, clinical support workflows, regulated launches, and systems patients and care teams can trust.";
  }
  if (ctx.hasClaimsOps) {
    return "My workflow-heavy product work turns billing-adjacent operational complexity into clear requirements, controlled processes, performance metrics, and systems that reduce manual burden.";
  }
  if (ctx.hasHealthCommerce) {
    return "My platform work turns customer, partner, clinical, and operational complexity into clear requirements, launch plans, success metrics, and product workflows that scale without losing trust.";
  }
  if (ctx.hasAi && ctx.hasHealthSystems) {
    return "My healthcare product work spans hospital and health-system workflows, patient journey data, AI-enabled operations, VOC, product analytics, roadmap decisions, and launch/adoption discipline.";
  }
  if (ctx.hasProductOpsFunction) {
    return "My product operations work turns ambiguity into roadmap discipline, PM-ready artifacts, execution tracking, rollout standards, and lightweight operating systems.";
  }
  if (ctx.hasHcpMarketing) {
    return "My healthcare product work translates provider needs, market insight, compliance constraints, partner enablement, program measurement, and launch planning into adoption-ready workflows and product education.";
  }
  if (ctx.hasPharmacyInformatics) {
    return "My healthcare product work spans roadmap ownership, VOC discovery, clinical workflow translation, EHR/FHIR-adjacent data foundations, requirements, launch planning, adoption, and regulated execution with health-system partners.";
  }
  if (ctx.hasLifeSciencesSaaS) {
    return "My enterprise SaaS work translates regulated workflows, partner needs, clinical complexity, data constraints, and launch requirements into products teams can trust.";
  }
  if (ctx.hasFintechInfrastructure) {
    return "My infrastructure product work spans workflow design, integrations, access controls, data-heavy operations, adoption measurement, and customer pain translated into decisions.";
  }
  if (ctx.hasFinanceErp) {
    return "My operational systems work spans workflow design, data models, access controls, automation, adoption measurement, and customer pain translated into decisions.";
  }
  if (ctx.hasPatientEngagement) {
    return "My patient, client, and provider experience work spans activation, retention, service design, experimentation, product analytics, omnichannel communication, and AI-enabled care operations.";
  }
  if (ctx.hasConsumerWellbeing) {
    return "My consumer product work brings mobile leadership, behavior-change thinking, UX, product analytics, engagement loops, and practical AI workflows that make care easier to sustain.";
  }
  const ai = ctx.hasAi ? " AI-enabled workflows," : "";
  const strategy = ctx.hasStrategy ? " market and workflow research," : "";
  return `I bring VOC discovery, clinician and customer interviews,${strategy}${ai} EHR/FHIR foundations, data interpretation, executive synthesis, regulated execution, and systems people can trust.`;
}

const SKILL_GROUPS = [
  {
    label: "Product operations",
    patterns: ["product operations", "platform operations", "platform ops", "operational tooling", "internal tooling", "product operating", "product planning", "project planning", "roadmap operations", "product review", "pm enablement", "product manager", "prd standards", "user story", "use case", "execution tracking", "tool stack", "operating cadence"]
  },
  {
    label: "Product management",
    patterns: ["product", "roadmap", "backlog", "prioritization", "requirements", "discovery", "launch", "lifecycle", "experimentation", "prototype", "0 to 1", "zero to one", "saas", "platform", "prd"]
  },
  {
    label: "GTM adoption and partner enablement",
    patterns: ["go to market", "gtm", "adoption", "onboarding", "partner", "client", "market", "marketing", "commercial", "pilot", "value proposition", "business development", "relationship"]
  },
  {
    label: "Enterprise SaaS and workflow systems",
    patterns: ["enterprise saas", "saas", "multi tenant", "workflow", "omnichannel", "cms", "web experience", "operational systems", "business logic", "reporting", "auditable", "access control", "authentication", "configuration", "system integration", "api"]
  },
  {
    label: "Healthcare product and operations",
    patterns: ["healthcare", "clinical", "care", "provider", "patient", "ambulatory", "post discharge", "rpm", "ccm", "ehr", "fhir", "compliance", "regulated medical", "medical product", "medical device", "population health", "value based"]
  },
  {
    label: "AI and technical systems",
    patterns: ["ai", "artificial intelligence", "agentic", "llm", "automation", "data", "analytics", "api", "integration", "sql", "yaml", "configuration", "multi tenant", "workflow driven", "technical", "decision logic"]
  },
  {
    label: "Experience research and service design",
    patterns: ["experience", "journey", "research", "interview", "user", "customer", "clinician", "member", "patient engagement", "service design", "empathy", "voice of customer", "ux"]
  },
  {
    label: "Cross-functional leadership",
    patterns: ["alignment", "stakeholder", "executive", "cross functional", "communication", "influence", "partner", "team", "mentorship", "translation", "facilitation"]
  },
  {
    label: "Execution analytics and operating discipline",
    patterns: ["execution", "implementation", "rollout", "risk", "dependency", "performance", "measurement", "process", "quality", "systems thinking", "acceptance testing", "operational", "operations", "cadence", "planning", "enablement", "okr", "agile", "scrum"]
  }
];

const SKILL_STOP_WORDS = new Set([
  "a",
  "and",
  "across",
  "from",
  "in",
  "into",
  "of",
  "the",
  "to",
  "with"
]);

function makeSkills({ ctx, analysis, sourceLibrary, context }) {
  const bank = sourceLibrary.skillBank ?? [];
  if (bank.length === 0) return makeDefaultSkills(ctx);

  const selected = selectResumeSkills({
    bank,
    ctx,
    analysis,
    context
  });
  const filtered = selected.filter((skill) => skillAllowedForContext(skill, ctx));
  const grouped = groupResumeSkills(filtered);
  if (grouped.length === 0) return makeDefaultSkills(ctx);
  return grouped;
}

function skillAllowedForContext(skill, ctx) {
  if (ctx.hasHousingEngagement) {
    const normalized = normalizeSearchText(skill);
    return !/\b(fhir|ehr|clinical|clinician|patient|provider|healthcare|health system|rpm|ccm|ambulatory|population health|value based|payer|medical record|pre visit|pre-visit|revenue cycle|rcm|hipaa)\b/.test(normalized);
  }
  if (!ctx.hasFinanceErp && !ctx.hasAiSystems && !((ctx.hasProductOpsFunction || ctx.hasFintechInfrastructure) && !ctx.hasClinical && !ctx.hasHealthSystems)) return true;
  const normalized = normalizeSearchText(skill);
  if (ctx.hasAiSystems && /\b(cms|web experience|twilio|omnichannel|call center|contact center|medical record|clinical|clinician|patient|provider|healthcare|health system|rpm|ccm|ambulatory|population health|value based|payer|revenue cycle|rcm)\b/.test(normalized)) return false;
  return !/\b(fhir|ehr|clinical|clinician|patient|provider|healthcare|health system|rpm|ccm|ambulatory|population health|value based|payer|medical record|revenue cycle|rcm)\b/.test(normalized);
}

function makeDefaultSkills(ctx) {
  if (ctx.hasHousingEngagement) {
    return [
      "SaaS product management, AI product strategy, product requirements, roadmap execution, prioritization, launch planning",
      "Client-facing implementation, customer adoption, onboarding, change management, executive stakeholder engagement",
      "Workflow transformation, workflow mapping, operational analytics, KPI and ROI measurement, dashboarding",
      "AI-enabled workflows, automation strategy, human-in-the-loop system design, product feedback loops",
      "Commercial product strategy, GTM partner enablement, customer experience, value narrative development",
      "Cross-functional execution with product, engineering, operations, customer, analytics, GTM, and executive stakeholders"
    ];
  }
  if (ctx.hasAiSystems) {
    return [
      "Technical product management, AI systems product strategy, platform product management, roadmap development, product requirements, prioritization",
      "Model evaluation strategy, benchmarking, performance measurement, feedback loop design, quality signals, human-in-the-loop workflows",
      "Structured data requirements, data platform integration, data model design, API integrations, reporting, dashboards, secure access",
      "Research-to-product translation, ambiguous problem definition, prototyping, launch planning, adoption measurement, production iteration",
      "Performance and cost trade-off analysis, data-informed decision making, operational analytics, systems thinking",
      "Cross-functional collaboration with product, engineering, data, operations, compliance, customer, GTM, and executive stakeholders"
    ];
  }
  if (ctx.hasPlatformOperations) {
    return [
      "Platform operations, workflow infrastructure design, operational tooling strategy, workflow automation, internal tooling and automation",
      "Healthcare operations, patient access workflows, onboarding workflow design, support workflow design, care delivery operations design",
      "Product management, product requirements, roadmap execution, launch planning, pilot execution, adoption measurement",
      "AI-enabled workflows, documentation automation, human-in-the-loop system design, operational analytics, performance measurement",
      "Cross-functional leadership with product, engineering, analytics, clinical operations, compliance, customer, and executive stakeholders",
      "Operational readiness, process improvement, risk and dependency management, workflow reliability, systems thinking"
    ];
  }
  if (ctx.hasProductOpsFunction) {
    return [
      "Product operations, roadmap operations, product planning, execution tracking, operating cadence design, PM enablement",
      "Product management, product strategy, product requirements, PRD standards, prioritization, launch planning, adoption measurement",
      "Enterprise SaaS workflows, workflow automation, configuration-driven systems, dashboards, reporting, system integration",
      "AI-enabled workflows, documentation automation, human-in-the-loop system design, data-informed decision making",
      "Cross-functional leadership with product, engineering, design, operations, compliance, customer, and executive stakeholders",
      "Operational readiness, process improvement, risk and dependency management, performance measurement, systems thinking"
    ];
  }
  if (ctx.hasProductInnovation) {
    return [
      "Product innovation, 0-to-1 product management, healthcare product strategy, product lifecycle management, roadmap development",
      "Market research, competitive analysis, Voice of Customer, concept validation, customer and partner journey mapping",
      "Business case framing, product demos, executive presentations, product analytics, dashboarding, KPI and OKR development",
      "Clinical and operational workflow mapping, care model design, operational readiness, launch planning, regulated execution",
      "Partner enablement, GTM support, healthcare market strategy, product adoption strategy, implementation planning",
      "Cross-functional collaboration with founders, clinical, operations, engineering, marketing, compliance, partner, and executive stakeholders"
    ];
  }
  if (ctx.hasHcpMarketing) {
    return [
      "Healthcare product marketing, HCP education, provider engagement, product strategy, roadmap development, requirements, launch planning",
      "Sales and field enablement, training and onboarding program design, product demos, executive presentations, partner enablement",
      "Regulated healthcare execution, compliance-aware operations, medical and clinical stakeholder alignment, program governance",
      "Market research, Voice of Customer, provider workflow discovery, competitive analysis, content planning, adoption measurement",
      "Program dashboards, performance measurement, operational analytics, reporting, OKRs, feedback loops",
      "Cross-functional collaboration with marketing, medical, clinical, sales, product, engineering, compliance, and executive stakeholders"
    ];
  }
  if (ctx.hasFintechInfrastructure || ctx.hasFinanceErp) {
    return [
      "Product management, SaaS product strategy, roadmap development, product requirements, launch planning, prioritization",
      "Customer workflow discovery, Voice of Customer, stakeholder research, executive-ready synthesis, adoption measurement",
      "Enterprise SaaS workflows, workflow automation, reporting, dashboards, access control, configuration-driven systems",
      "AI-enabled workflows, documentation automation, data interpretation, product analytics, performance measurement",
      "API integrations, data model design, system integration, data privacy and security, regulated execution",
      "Cross-functional collaboration with engineering, design, operations, compliance, customer success, and executive stakeholders",
      "GTM support, product positioning, partner enablement, implementation planning, rollout planning, measurable success criteria"
    ];
  }
  if (ctx.hasLifeSciencesSaaS) {
    return [
      "Product management, SaaS product strategy, roadmap development, product requirements, launch planning, prioritization",
      "Customer and internal user discovery, Voice of Customer, stakeholder research, executive-ready synthesis, adoption measurement",
      "Life sciences and healthcare workflows, enterprise SaaS, configurable systems, dashboards, access control, workflow automation",
      "AI-enabled workflows, documentation automation, data interpretation, product analytics, performance measurement",
      "API integrations, data model design, system integration, data privacy and security, regulated execution",
      "Cross-functional collaboration with engineering, QA, design, operations, compliance, customer success, and executive stakeholders",
      "GTM support, product positioning, partner enablement, implementation planning, rollout planning, measurable success criteria"
    ];
  }
  const skills = [
    "Product management, healthcare product strategy, roadmap development, product requirements, launch planning, prioritization",
    "Voice of Customer, clinician interviews, stakeholder research, market research, unmet clinical needs, executive-ready synthesis",
    "Clinical workflows, provider workflows, ambulatory care operations, patient access, referral intake, escalation workflows, care-team experience",
    "AI-enabled healthcare workflows, medical record summarization, documentation automation, workflow automation, data interpretation, product analytics, dashboards, performance measurement",
    "EHR integrations, FHIR, API requirements, RPM workflows, healthcare billing logic, HIPAA-aware product development, regulated healthcare execution",
    "Cross-functional collaboration with engineering, clinical, design, regulatory, commercial, customer success, and executive stakeholders",
    "GTM support, product positioning, partner enablement, implementation planning, rollout planning, measurable success criteria, executive communication"
  ];
  if (!ctx.hasAi) {
    skills[3] = "Workflow automation, data interpretation, product analytics, dashboards, performance measurement, operational analytics, care-team tooling, and platform enablement";
  }
  return skills;
}

function selectResumeSkills({ bank, ctx, analysis, context }) {
  const corpus = normalizeSearchText([
    context,
    analysis.job_archetype,
    ...(analysis.secondary_archetypes ?? []),
    ...(analysis.company_priorities ?? []),
    ...(analysis.required_skills ?? []),
    ...(analysis.preferred_skills ?? []),
    ...(analysis.role_keywords ?? [])
  ].join(" "));
  const scored = bank
    .map((skill, index) => ({
      skill,
      score: scoreResumeSkill(skill, { corpus, ctx, analysis }),
      index
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index);

  const selected = [];
  const selectedKeys = new Set();
  for (const item of scored) {
    const key = normalizeSearchText(item.skill);
    if (!key || selectedKeys.has(key)) continue;
    selected.push(item.skill);
    selectedKeys.add(key);
    if (selected.length >= 40) break;
  }

  return ensureCoreProductSkills(selected, bank, ctx).slice(0, 40);
}

function scoreResumeSkill(skill, { corpus, ctx, analysis }) {
  const normalized = normalizeSearchText(skill);
  const tokens = normalized.split(/\s+/).filter((token) => token.length > 2 && !SKILL_STOP_WORDS.has(token));
  let score = 0;

  if (corpus.includes(normalized)) score += 24;
  for (const token of tokens) {
    if (corpus.includes(token)) score += 2;
  }

  if (/\bproduct\b/.test(corpus) && /\b(product|roadmap|backlog|prioritization|requirements|discovery|launch|prototyping|saas|platform)\b/.test(normalized)) score += 5;
  if (/\b(product strategy|product roadmapping|platform product|technical product|operating model|cross functional|executive|stakeholder|gtm|adoption|leadership|systems thinking|workflow driven)\b/.test(normalized)) score += 5;
  if (ctx.hasHousingEngagement && /\b(client|customer|implementation|adoption|onboarding|workflow|change management|stakeholder|executive|kpi|okr|analytics|roi|commercial|gtm|partner|product launch|product rollout|ai|automation|systems thinking|feedback loop)\b/.test(normalized)) score += 15;
  if ((ctx.hasFinanceErp || ctx.hasFintechInfrastructure || ctx.hasLifeSciencesSaaS) && /\b(enterprise|saas|multi tenant|workflow|business logic|requirements|reporting|dashboard|access control|authentication|integration|api|data model|automation|operational systems|product analytics|customer|user acceptance|qa|life sciences|healthcare|clinical|patient|partner|executive)\b/.test(normalized)) score += 11;
  if (ctx.hasInsurtechBenefits && /\b(insurtech|benefits|healthcare|health insurance|eligibility|insurance|small business|partner|embedded|integration|api|saas|workflow|requirements|roadmap|launch|product analytics|customer|user experience|regulated|compliance|ai|automation|document|executive|stakeholder|gtm|adoption)\b/.test(normalized)) score += 15;
  if (ctx.hasPlatformOperations && /\b(platform operations|workflow infrastructure|operational tooling|internal tooling|workflow automation|workflow reliability|operational bottleneck|operational analytics|onboarding workflow|support workflow|care delivery|patient access|implementation|launch readiness|pilot|new market|process|systems thinking|cross functional|executive|stakeholder|automation|ai|dashboard|measurement)\b/.test(normalized)) score += 15;
  if (ctx.hasHealthCommerce && /\b(healthcare commerce|healthcare product|platform|workflow|requirements|roadmap|backlog|prioritization|product analytics|customer|partner|journey|adoption|onboarding|go to market|gtm|marketplace|commerce|subscription|regulated|compliance|launch|cross functional|executive|stakeholder|experience)\b/.test(normalized)) score += 13;
  if (!ctx.hasInsurtechBenefits && /\b(insurtech|health insurance|small business benefits|benefits workflow|benefits and eligibility)\b/.test(normalized)) score -= 30;
  if (!ctx.hasHealthCommerce && /\b(healthcare commerce|marketplace|subscription systems)\b/.test(normalized)) score -= 20;
  if (ctx.hasProductOpsFunction && /\b(product operations|roadmap|planning|cadence|operating model|execution|tracking|pm enablement|enablement|prd|requirements|documentation|process|operational readiness|okr|kpi|systems thinking|program management|cross functional|executive|stakeholder|ai workflow|workflow adoption|facilitation)\b/.test(normalized)) score += 13;
  if (ctx.hasProductInnovation && /\b(product|innovation|0 to 1|lifecycle|roadmap|market|competitive|voice of customer|customer|partner|journey|business|executive|presentation|analytics|dashboard|kpi|okr|operational readiness|launch|gtm|adoption|healthcare market|care model|workflow|cross functional|stakeholder|strategy)\b/.test(normalized)) score += 14;
  if (ctx.hasAiSystems && /\b(ai systems|ai infrastructure|ml systems|model evaluation|benchmarking|model observability|performance measurement|feedback loop|quality signal|structured data|data platform|data model|data efficiency|learning systems|research to product|requirements|platform product|technical product|human in the loop|cost trade|systems thinking|product analytics|integration|api)\b/.test(normalized)) score += 15;
  if (ctx.hasFinanceErp && /\b(healthcare market|clinical quality|patient acquisition|population health|value based|payer aligned|clinical stakeholder|provider workflow|health system)\b/.test(normalized)) score -= 8;
  if (!ctx.hasClinical && !ctx.hasHealthSystems && /\b(healthcare market|healthcare business|patient acquisition|clinical quality|population health|value based|payer aligned)\b/.test(normalized)) score -= 6;
  if (ctx.hasAi && /\b(ai|agentic|llm|automation|medical record|documentation|human in the loop|generative)\b/.test(normalized)) score += 9;
  if (ctx.hasClinical && /\b(clinical|care|patient|provider|healthcare|ambulatory|population health|rpm|ccm|post discharge)\b/.test(normalized)) score += 7;
  if (ctx.hasHealthSystems && /\b(health system|enterprise healthcare|provider|implementation|partner)\b/.test(normalized)) score += 7;
  if (ctx.hasIntegration && /\b(fhir|ehr|api|integration|interoperability|system integration|data model)\b/.test(normalized)) score += 9;
  if (ctx.hasData && /\b(data|analytics|kpi|okr|measurement|sql|visualization|instrumentation)\b/.test(normalized)) score += 7;
  if (ctx.hasStrategy && /\b(strategy|roadmap|market|competitive|prioritization|operating model|portfolio)\b/.test(normalized)) score += 6;
  if (ctx.hasOps && /\b(operations|workflow|implementation|rollout|execution|process|quality|scaling|operational)\b/.test(normalized)) score += 6;
  if (ctx.hasCommercial && /\b(go to market|gtm|partner|enablement|adoption|onboarding|market|customer|client|value proposition)\b/.test(normalized)) score += 6;
  if (ctx.hasHcpMarketing && /\b(hcp|provider|education|product marketing|go to market|gtm|sales|field|enablement|market|program|dashboard|measurement|compliance|regulated|medical product|medical device|training|onboarding|communication|presentation)\b/.test(normalized)) score += 12;
  if (ctx.hasCaregiver && /\b(patient|member|caregiver|at home|virtual care|journey|experience)\b/.test(normalized)) score += 5;
  if (ctx.hasPatientEngagement && /\b(patient engagement|patient activation|activation|retention|lifecycle|journey|omnichannel|cross channel|notification|messaging|dashboard|consumer|member|patient experience|personalization|next best action|product analytics|experimentation|ux|service design|mobile|communication)\b/.test(normalized)) score += 12;
  if (ctx.hasConsumerWellbeing && /\b(well being|wellbeing|behavior|habit|experience|journey|mobile|personalization|patient engagement|activation|retention|user|customer|empathy|service design|ux|voice of customer)\b/.test(normalized)) score += 10;
  if (ctx.hasUxProductDesign && /\b(prototyping|user research|user interviews|user testing|design thinking|ux|ui|product discovery|journey|service design|story mapping|experience)\b/.test(normalized)) score += 9;

  const required = normalizeSearchText((analysis.required_skills ?? []).join(" "));
  const preferred = normalizeSearchText((analysis.preferred_skills ?? []).join(" "));
  if (required && tokens.some((token) => required.includes(token))) score += 4;
  if (preferred && tokens.some((token) => preferred.includes(token))) score += 3;
  if (isBasicToolSkill(normalized) && !tokens.some((token) => corpus.includes(token))) score -= 12;

  return score;
}

function isBasicToolSkill(normalized) {
  return /\b(jira|confluence|sql|yaml|agile|scrum)\b/.test(normalized);
}

function ensureCoreProductSkills(selected, bank, ctx) {
  const core = [
    (ctx.hasFinanceErp || ctx.hasFintechInfrastructure || ctx.hasProductOpsFunction || ctx.hasLifeSciencesSaaS || ctx.hasAiSystems || ctx.hasInsurtechBenefits || ctx.hasHousingEngagement) ? "SaaS Product Management" : "Healthcare Product Management",
    "0-to-1 Product Management",
    "Platform Product Management",
    "Technical Product Management",
    "Product Strategy & Roadmap",
    "Product Requirements Definition",
    "Product Roadmapping & Execution",
    "Product Discovery & Delivery",
    "Feature Prioritization",
    "Prototyping",
    "Cross-Functional Leadership",
    "Executive Stakeholder Engagement"
  ];
  if (ctx.hasHousingEngagement) core.push("Client-Facing Implementation Leadership", "Customer Adoption & Onboarding", "Product Adoption Strategy", "Product Launch Execution", "Commercial Product Strategy", "Go-to-Market Strategy and Partner Enablement", "Product Analytics", "KPI & OKR Development", "Voice of Customer", "Workflow Mapping & Optimization", "AI-Enabled Workflows", "Agentic Workflow Development", "Customer Experience");
  if (ctx.hasFinanceErp) core.push("Workflow-Driven Platform and System Design", "Multi-Tenant SaaS", "Data Model Design", "API Integrations", "Configuration-Driven Systems", "Data Privacy & Security Standards", "User Acceptance Testing");
  if (ctx.hasFintechInfrastructure) core.push("Workflow-Driven Platform and System Design", "Multi-Tenant SaaS", "Data Model Design", "API Integrations", "Configuration-Driven Systems", "Data Privacy & Security Standards", "User Acceptance Testing");
  if (ctx.hasInsurtechBenefits) core.push("Healthcare Product Management", "Insurtech Product Strategy", "Benefits Workflow Discovery", "Embedded Partner Integration Strategy", "API-Based Partner Integrations", "AI-Enabled Document Workflow Automation", "Benefits and Eligibility Workflow Strategy", "Small Business Benefits Experience", "UX Simplification for Regulated Products", "Customer and Partner Journey Mapping", "Executive Stakeholder Engagement", "Product Analytics", "A/B Testing & Experimentation", "Healthcare Compliance", "Data Privacy & Security Standards", "Product Launch Execution");
  if (ctx.hasTechnicalProgramDelivery) core.push("Technical Program Management", "Client-Facing Implementation Leadership", "Program Governance & Operating Reviews", "Risk & Dependency Management", "UAT, Go-Live & Hypercare Leadership", "Customer Adoption & Onboarding", "Enterprise Healthcare Implementations", "Health System Client Enablement");
  if (ctx.hasPatientAccessHub) core.push("Patient Access Workflows", "Patient Access Hub Workflows", "Eligibility and Insurance Verification Workflows", "Provider Enablement");
  if (ctx.hasClientImplementation) core.push("System Integration", "API-Based Partner Integrations", "CRM Integration Requirements", "EHR Integration Requirements", "Data Platform Integration Requirements", "Pilot Program Execution");
  if (ctx.hasLifeSciencesSaaS) core.push("Healthcare Product Management", "Enterprise SaaS Product Management", "Workflow-Driven Platform and System Design", "User Story and Use Case Development", "Project Planning and Delivery Tooling", "CRM Integration Requirements", "Data Platform Integration Requirements", "API Integrations", "Configuration-Driven Systems", "User Acceptance Testing");
  if (ctx.hasMarketingCloudWeb) core.push("Salesforce Marketing Cloud Workflow Support", "Omnichannel Campaign and Platform Workflows", "CMS and Web Experience Requirements", "Web and Product Analytics");
  if (ctx.hasHealthCommerce) core.push("Healthcare Commerce Product Strategy", "Customer and Partner Journey Mapping", "Partner Network Workflow Design", "Healthcare Product Management", "Product Analytics", "Product Adoption Strategy", "Product Launch Execution", "Product Requirements Definition", "Backlog Prioritization", "Voice of Customer", "Customer Experience", "Data Privacy & Security Standards", "Healthcare Compliance", "HIPAA-Aligned Product Execution");
  if (ctx.hasPharmacyInformatics) core.push("Healthcare Data Product Management", "Product Lifecycle Management", "Healthcare Data Interoperability", "FHIR & Healthcare Interoperability", "EHR Integration Requirements", "Clinical & Operational Workflow Mapping", "Provider Workflow Optimization", "Structured Data Product Requirements", "Data Platform Integration Requirements", "Product Launch Execution", "Product Adoption Strategy", "User Story and Use Case Development");
  if (ctx.hasAiSystems) core.push("AI Systems Product Strategy", "AI Infrastructure Product Management", "ML Systems Requirements Translation", "Model Evaluation and Benchmarking Strategy", "Model Observability and Performance Measurement", "Feedback Loop and Quality Signal Design", "Structured Data Product Requirements", "Data Platform Integration Requirements", "Research-to-Product Translation", "Performance and Cost Trade-off Analysis", "Data Efficiency and Learning Systems", "Workflow-Driven Platform and System Design", "Data Model Design", "API Integrations", "Human-in-the-Loop System Design", "Product Analytics", "KPI & OKR Development");
  if (ctx.hasPlatformOperations) core.push("Platform Operations", "Operational Tooling Strategy", "Workflow Infrastructure Design", "Internal Tooling and Automation", "Workflow Automation", "Workflow Reliability", "Operational Bottleneck Analysis", "Onboarding Workflow Design", "Support Workflow Design", "Care Delivery Operations Design", "New Market Launch Readiness", "Operational Analytics");
  if (ctx.hasProductOpsFunction) core.push("Product Operations", "Program Management", "KPI & OKR Development", "Operational Readiness", "Process Improvement", "Risk & Dependency Management", "Systems Thinking", "Executive Communication", "Workshop Facilitation");
  if (ctx.hasProductInnovation) core.push("Market Research & Competitive Analysis", "Product Lifecycle Management", "Product Launch Execution", "Product Analytics", "KPI & OKR Development", "Voice of Customer", "Customer and Partner Journey Mapping", "Healthcare Market Strategy & Growth", "Healthcare Commerce Product Strategy", "Commercial Stakeholder Alignment", "Care Model Design", "Operational Readiness", "Data-Informed Decision Making", "Influencing Without Authority", "Product Demos & Executive Presentations", "Go-to-Market Strategy and Partner Enablement", "Product Adoption Strategy");
  if (ctx.hasAi) core.push("Artificial Intelligence Product Strategy", "AI Product Strategy", "AI-Enabled Products", "AI-Enabled Workflows", "Agentic Workflow Development");
  if (ctx.hasRevenueCycle) core.push("Revenue Cycle Management (RCM) Workflows", "Revenue Cycle Workflows", "Patient Access Workflows", "Eligibility and Insurance Verification Workflows", "Healthcare Billing Workflow Automation", "Patient Financial Experience", "Pre-Visit Workflow Automation", "Workflow Automation", "Operational Readiness");
  if (ctx.hasHcpMarketing) core.push("Healthcare Product Marketing", "HCP & Provider Engagement Strategy", "HCP Education Program Operations", "Regulated Medical Product Execution", "Sales and Field Enablement", "Training and Onboarding Program Design", "Program Dashboarding & Measurement", "Data Analysis & Visualization", "Clinical Stakeholder Alignment", "Product Demos & Executive Presentations", "Go-to-Market Strategy and Partner Enablement", "Healthcare Compliance");
  if (ctx.hasConsumerWellbeing) core.push("Behavior Change Design", "Patient Engagement Strategy", "Mobile Product Experience", "UX Strategy", "Product Discovery", "Prototyping", "Data-Informed Decision Making");
  if (ctx.hasPatientEngagement) core.push("Patient Engagement Strategy", "Lifecycle Engagement Strategy", "Patient Activation", "Patient Engagement & Retention", "Cross-Channel Journey Orchestration", "Logged-In Consumer Product Experience", "Patient Dashboard Experience", "Clinical Workflow Design", "EHR Integration Requirements", "HIPAA-Aligned Product Execution", "Notification and Messaging Systems", "Product Analytics", "A/B Testing & Experimentation", "Personalization Strategy", "Next-Best-Action Experience Design");
  if (ctx.hasIntegration) {
    if (ctx.hasPatientEngagement) core.push("API Integrations", "Data Model Design");
    else core.push("FHIR & Healthcare Interoperability", "API Integrations");
  }
  if (ctx.hasData) core.push("Product Analytics", "KPI & OKR Development");
  if (ctx.hasOps) core.push("Implementation Leadership", "Workflow Mapping & Optimization");
  if (ctx.hasCommercial) core.push("Commercial Product Strategy", "Go-to-Market Strategy and Partner Enablement", "Product Adoption Strategy");

  const bankByKey = new Map(bank.map((skill) => [normalizeSearchText(skill), skill]));
  const out = [];
  const add = (skill) => {
    if (out.some((item) => normalizeSearchText(item) === normalizeSearchText(skill))) return;
    out.push(skill);
  };
  for (const skill of core) {
    const bankSkill = bankByKey.get(normalizeSearchText(skill));
    if (!bankSkill) continue;
    add(bankSkill);
  }
  for (const skill of selected) add(skill);
  return out;
}

function groupResumeSkills(skills) {
  const buckets = SKILL_GROUPS.map((group) => ({ ...group, skills: [] }));
  const fallbackBucket = buckets.find((group) => group.label === "Product management") ?? buckets[0];
  for (const skill of skills) {
    const normalized = normalizeSearchText(skill);
    const bucket = prioritySkillBucket(normalized, buckets)
      ?? buckets.find((group) => group.patterns.some((pattern) => normalized.includes(normalizeSearchText(pattern))))
      ?? fallbackBucket;
    if (bucket.skills.length < 7) bucket.skills.push(skill);
  }

  const meaningfulBuckets = buckets.filter((bucket) => {
    if (bucket.skills.length === 0) return false;
    return !(bucket.label === "Healthcare product and operations" && bucket.skills.length === 1 && bucket.skills[0] === "Clinical Operations");
  });

  return meaningfulBuckets
    .slice(0, 7)
    .map((bucket) => {
      const labelKey = normalizeSearchText(bucket.label);
      const skills = bucket.skills.filter((skill) => normalizeSearchText(skill) !== labelKey);
      return `${bucket.label}${skills.length ? `, ${skills.join(", ")}` : ""}`;
    });
}

function prioritySkillBucket(normalized, buckets) {
  if (/\b(insurtech|benefits|eligibility|embedded partner|partner integration|small business benefits|regulated products)\b/.test(normalized)) {
    return buckets.find((group) => /\b(partner|gtm|adoption)\b/.test(normalizeSearchText(group.label)))
      ?? buckets.find((group) => group.label === "Healthcare product and operations");
  }
  if (/\b(artificial intelligence|ai systems|ai infrastructure|ml systems|model evaluation|model observability|benchmarking|feedback loop|quality signal|structured data|data platform|data efficiency|learning systems|research to product|performance and cost)\b/.test(normalized)) {
    return buckets.find((group) => group.label === "AI and technical systems");
  }
  if (/\b(salesforce marketing cloud|omnichannel|cms|web experience)\b/.test(normalized)) {
    return buckets.find((group) => group.label === "Enterprise SaaS and workflow systems");
  }
  if (/\b(hcp|provider engagement|product marketing|sales and field|field enablement|gtm|go to market|training and onboarding|program dashboard|measurement|product demos|executive presentations)\b/.test(normalized)) {
    return buckets.find((group) => group.label === "GTM adoption and partner enablement");
  }
  if (/\b(brand partner|partner network|partner journey|commerce|commercial|subscription|marketplace|affiliate|customer adoption|partner management)\b/.test(normalized)) {
    return buckets.find((group) => group.label === "GTM adoption and partner enablement");
  }
  if (/\b(hipaa|healthcare compliance|regulated healthcare)\b/.test(normalized)) {
    return buckets.find((group) => group.label === "Healthcare product and operations");
  }
  if (/\b(web analytics|web and product analytics|product analytics)\b/.test(normalized)) {
    return buckets.find((group) => group.label === "AI and technical systems");
  }
  return null;
}

function inferCompanyPriorities(ctx) {
  const priorities = [];
  if (ctx.hasHousingEngagement) priorities.push("AI implementation tied to client business goals", "workflow transformation across property operations", "fast time-to-value and adoption", "measurable ROI and portfolio performance", "repeatable rollout playbooks", "product feedback loops from strategic accounts");
  if (ctx.hasAiSystems) priorities.push("model evaluation and behavior clarity", "feedback loops and post-training systems", "structured data learning", "data, compute, performance, and cost trade-off decisions", "research-to-production platform capability");
  if (ctx.hasInsurtechBenefits) priorities.push("embedded benefits platform strategy", "health insurance complexity translated into trusted workflows", "AI-enabled plan-document and support automation", "partner integration roadmap and launch execution", "small business owner and employee experience clarity");
  if (ctx.hasRevenueCycle) priorities.push("pre-visit workflow automation", "eligibility and benefits accuracy", "patient financial experience clarity", "automation reliability across healthcare operations", "cash-flow and administrative efficiency");
  if (ctx.hasClaimsOps) priorities.push("claim automation roadmap clarity", "pend and rework reduction", "claims quality and processor productivity", "automation adoption across operations");
  if (ctx.hasTechnicalProgramDelivery) priorities.push("client-facing healthcare AI implementation", "system integration readiness", "program governance and risk management", "UAT, launch, and hypercare execution");
  if (ctx.hasPatientAccessHub) priorities.push("patient access and hub workflow reliability", "benefits and eligibility workflow clarity", "provider engagement readiness");
  if (ctx.hasProductOpsFunction) priorities.push("product operating clarity at scale", "lightweight process and execution visibility", "PM enablement and stronger product culture", "AI-assisted workflow adoption");
  if (ctx.hasProductInnovation) priorities.push("new product innovation lifecycle discipline", "business case and market opportunity assessment", "customer voice and concept validation", "clinical, operational, and financial launch readiness", "partner and care delivery expansion");
  if (ctx.hasHcpMarketing) priorities.push("HCP education and peer-to-peer program execution", "compliant speaker-program operations", "market-insight-led provider engagement", "sales and field enablement", "program dashboards and leadership communication");
  if (ctx.hasPharmacyInformatics) priorities.push("trusted medication and clinical data workflows", "clinical decision support utility", "health system and informatics stakeholder trust", "roadmap and lifecycle discipline", "EHR-integrated product clarity");
  if (ctx.hasHealthCommerce) priorities.push("customer and partner journey clarity", "healthcare commerce platform execution", "partner workflow reliability", "regulated product trust", "data-informed launch and iteration");
  if (ctx.hasLifeSciencesSaaS) priorities.push("life sciences application innovation", "pharma digital platform execution", "omnichannel initiative delivery", "internal and customer workflow discovery", "high-quality agile feature delivery", "scalable enterprise SaaS standards");
  if (ctx.hasFintechInfrastructure) priorities.push("customer and developer trust", "financial connectivity reliability", "clear product requirements", "data-informed roadmap decisions", "fast high-quality launches");
  if (ctx.hasFinanceErp) priorities.push("workflow-driven enterprise SaaS", "automation balanced with determinism and control", "data-heavy product clarity", "customer trust and auditable execution");
  if (ctx.hasConsumerWellbeing) priorities.push("emotionally resonant well-being experience", "rapid user validation from demo to market", "habit-building engagement and retention");
  if (ctx.hasPatientEngagement) priorities.push("patient activation and durable engagement", "personalized next-best-action guidance", "cross-channel lifecycle orchestration", "screening and appointment completion");
  if (ctx.hasUxProductDesign) priorities.push("end-to-end UX and product design ownership");
  if (ctx.hasHealthSystems) priorities.push("health-system deployment and stakeholder trust");
  if (ctx.hasCaregiver) priorities.push("family and caregiver workflow clarity");
  if (ctx.hasIntegration) priorities.push(ctx.hasPatientEngagement ? "API and notification-system clarity" : "EHR/FHIR integration clarity");
  if (ctx.hasData) priorities.push("analytics-backed workflow and adoption decisions");
  if (ctx.hasCommercial) priorities.push("partner and commercial enablement");
  if (ctx.hasOps) priorities.push((ctx.hasFinanceErp || ctx.hasProductOpsFunction || ctx.hasFintechInfrastructure || ctx.hasLifeSciencesSaaS || ctx.hasAiSystems || ctx.hasHousingEngagement) ? "operational scale without losing reliability" : "operational scale without losing clinical quality");
  if (ctx.hasClinical && !ctx.hasFinanceErp) priorities.push("clinician and patient workflow fit");
  return priorities;
}

function inferRequiredSkills(ctx) {
  const skills = ["product requirements", "cross-functional execution"];
  if (ctx.hasHousingEngagement) skills.push("client-facing AI implementation", "executive stakeholder advising", "workflow transformation", "change management", "adoption strategy", "ROI and KPI measurement", "product rollout playbooks", "customer feedback loops");
  if (ctx.hasAiSystems) skills.push("AI systems product strategy", "model evaluation strategy", "structured data requirements", "feedback loop design", "data platform integration", "performance and cost trade-off analysis", "research-to-product translation", "technical product management");
  if (ctx.hasInsurtechBenefits) skills.push("insurtech product strategy", "benefits workflow discovery", "embedded partner integration strategy", "AI-enabled plan-document automation", "API and integration requirements", "executive and partner stakeholder management", "UX simplification for regulated products", "data-informed experimentation");
  if (ctx.hasRevenueCycle) skills.push("revenue cycle workflow discovery", "patient access and eligibility workflows", "billing workflow automation", "AI-enabled administrative workflows", "operational analytics", "EHR and integration requirements");
  if (ctx.hasClaimsOps) skills.push("claims operations workflow discovery", "product roadmap and OKR definition", "workflow automation", "operational analytics", "change management");
  if (ctx.hasTechnicalProgramDelivery) skills.push("technical program management", "client-facing implementation leadership", "program governance", "risk and dependency management", "UAT and launch readiness", "go-live and hypercare leadership");
  if (ctx.hasPatientAccessHub) skills.push("patient access hub workflows", "benefits verification workflows", "eligibility and insurance verification workflows", "provider engagement workflows", "patient activation metrics");
  if (ctx.hasClientImplementation) skills.push("system integration requirements", "API, CSV, and FHIR integration planning", "CRM and EMR integration requirements", "strategic business reviews", "customer readiness planning");
  if (!ctx.hasFinanceErp && !ctx.hasProductOpsFunction && !ctx.hasFintechInfrastructure && (ctx.hasClinical || ctx.hasHealthSystems || ctx.hasCaregiver)) skills.push("regulated healthcare execution");
  if (ctx.hasProductOpsFunction) skills.push("product operations", "roadmap and planning systems", "operating cadence design", "PM enablement", "execution tracking", "lightweight process design", "AI workflow adoption");
  if (ctx.hasProductInnovation) skills.push("0-to-1 product innovation", "NPI lifecycle management", "market research and competitive analysis", "customer voice research", "business case development", "launch readiness", "cross-functional stakeholder management", "operational readiness");
  if (ctx.hasHcpMarketing) skills.push("healthcare product marketing", "HCP and provider engagement strategy", "regulated medical product execution", "training and onboarding program design", "sales and field enablement", "program measurement and dashboarding", "cross-functional marketing, medical, clinical, and sales alignment");
  if (ctx.hasPharmacyInformatics) skills.push("healthcare data product management", "clinical workflow translation", "roadmap and prioritization ownership", "product lifecycle management", "business case and release planning", "EHR and integration requirements", "regulated healthcare execution");
  if (ctx.hasHealthCommerce) skills.push("healthcare platform product management", "customer and partner discovery", "partner workflow design", "roadmap and backlog prioritization", "product analytics and success metrics", "engineering, design, data, and operations partnership", "regulated healthcare execution");
  if (ctx.hasLifeSciencesSaaS) skills.push("enterprise SaaS product management", "life sciences product context", "pharma digital platform management", "cross-domain workflow design", "User Story and Use Case Development", "Project Planning and Delivery Tooling", "clear agile design specifications", "strategic prioritization", "engineering and QA partnership", "customer and internal user discovery");
  if (ctx.hasFintechInfrastructure) skills.push("enterprise SaaS product management", "customer and developer empathy", "roadmap ownership", "clear requirements", "engineering and design partnership", "AI-assisted product work");
  if (ctx.hasFinanceErp) skills.push("enterprise SaaS product management", "workflow-driven systems", "data-heavy products", "AI automation tradeoffs", "customer workflow discovery", "QA and UAT support");
  if (ctx.hasConsumerWellbeing) skills.push("AI product strategy", "well-being product experience", "behavior change design", "prototyping", "user research");
  if (ctx.hasPatientEngagement) skills.push("patient engagement strategy", "lifecycle and re-engagement programs", "cross-channel journey orchestration", "patient-facing UX", "product analytics and experimentation", "service activation");
  if (ctx.hasUxProductDesign) skills.push("UX ownership", "product discovery", "rapid validation");
  if (ctx.hasAi) skills.push((ctx.hasFinanceErp || ctx.hasAiSystems || ctx.hasHousingEngagement) ? "AI-enabled workflow automation" : "AI-enabled healthcare workflows", "documentation automation");
  if (ctx.hasHealthSystems) skills.push("health system stakeholder discovery", "enterprise implementation");
  if (ctx.hasIntegration) skills.push(ctx.hasPatientEngagement ? "API, eventing, and notification-system requirements" : "FHIR and EHR integration requirements");
  if (ctx.hasData) skills.push("dashboard and performance measurement");
  if (ctx.hasCommercial) skills.push("partner enablement", "commercial translation");
  if (ctx.hasCaregiver) skills.push("patient and caregiver experience design");
  return skills;
}

function inferPreferredSkills(ctx) {
  const skills = ["executive-ready synthesis", "VOC discipline", "launch planning"];
  if (ctx.hasHousingEngagement) skills.push("property operations curiosity", "strategic account management", "startup execution pace", "portfolio performance framing", "customer ROI measurement");
  if (ctx.hasAiSystems) skills.push("ML systems curiosity", "research-driven ambiguity", "quality signal design", "structured data systems", "production performance measurement", "cost and efficiency trade-offs");
  if (ctx.hasInsurtechBenefits) skills.push("payer and benefits workflow fluency", "small business benefits empathy", "embedded B2B platform adjacency", "Fortune 500 partner communication", "AI-assisted support workflow implementation");
  if (ctx.hasRevenueCycle) skills.push("RCM adjacency", "payer and insurance workflow fluency", "AI-assisted decision support", "frontline operations feedback loops", "GTM and customer impact partnership");
  if (ctx.hasClaimsOps) skills.push("health plan operations adjacency", "AI-assisted decision support", "vendor roadmap partnership", "frontline operations feedback loops");
  if (ctx.hasTechnicalProgramDelivery) skills.push("client implementation governance", "solution pilot delivery", "cross-functional dependency management", "customer ROI measurement", "startup execution pace");
  if (ctx.hasPatientAccessHub) skills.push("Patient Access Hub adjacency", "benefits verification workflow fluency", "provider engagement workflow fluency", "payer and provider integration curiosity");
  if (ctx.hasHealthCommerce) skills.push("commerce and subscription model curiosity", "marketplace or partner-platform adjacency", "customer journey analytics", "healthcare compliance awareness", "startup execution pace");
  if (ctx.hasPlatformOperations) skills.push("ground-truth workflow research", "support and onboarding workflow fluency", "operational tooling judgment", "automation readiness", "startup execution pace");
  if (ctx.hasProductOpsFunction) skills.push("PM tool stack ownership", "product culture building", "PRD standards", "planning artifact design", "portfolio visibility");
  if (ctx.hasProductInnovation) skills.push("CPG and supplement category curiosity", "DTC and B2C health-tech adjacency", "pricing and ROI analysis adjacency", "partner integration strategy", "founder and clinical leadership communication");
  if (ctx.hasHcpMarketing) skills.push("HCP education program adjacency", "speaker-program operations adjacency", "medical device market curiosity", "field enablement and sales partnership", "compliance-aware program execution", "conference and product-theater coordination adjacency");
  if (ctx.hasPharmacyInformatics) skills.push("pharmacy informatics curiosity", "medication-use workflow adjacency", "clinical SME collaboration", "healthcare data interoperability", "product launch and adoption", "post-launch optimization");
  if (ctx.hasLifeSciencesSaaS) skills.push("CRM and healthcare data integration awareness", "project planning rigor", "user interface design", "life sciences industry curiosity");
  if (ctx.hasMarketingCloudWeb) skills.push("Salesforce Marketing Cloud Workflow Support", "CMS and Web Experience Requirements", "Web and Product Analytics");
  if (ctx.hasFintechInfrastructure) skills.push("fintech infrastructure curiosity", "developer platform empathy", "founder mindset", "high-growth startup execution");
  if (ctx.hasFinanceErp) skills.push("ERP or operational systems adjacency", "integration-heavy product experience", "startup execution pace", "positioning and enablement");
  if (ctx.hasConsumerWellbeing) skills.push("behavioral health and habit-building experience", "mobile experience leadership");
  if (ctx.hasPatientEngagement) skills.push("B2B2C healthcare engagement", "dashboard and next-best-action design", "notification and messaging systems", "screening or appointment completion programs");
  if (ctx.hasUxProductDesign) skills.push("prototyping tools", "user-centered design");
  if (ctx.hasAi) skills.push((ctx.hasFinanceErp || ctx.hasAiSystems || ctx.hasHousingEngagement) ? "AI workflow implementation" : "clinical AI workflow implementation");
  if (ctx.hasStrategy) skills.push("market and operating model analysis");
  if (ctx.hasOps) skills.push("operating cadence and scale planning");
  return uniqueValues(skills).slice(0, 8);
}

function inferRecommendedSections(ctx) {
  const sections = ["Cover Letter", "Executive Resume", "Operating Work", "Core Competencies"];
  if (ctx.hasHousingEngagement) sections.unshift("AI Engagement and Client Strategy Bridge", "Workflow Transformation and Adoption Proof");
  if (ctx.hasAiSystems) sections.unshift("AI Systems Product Bridge", "Structured Data and Feedback Loop Proof");
  if (ctx.hasPlatformOperations) sections.unshift("Platform Operations Proof", "Workflow Infrastructure and Launch Readiness");
  if (ctx.hasInsurtechBenefits) sections.unshift("Insurtech Benefits Platform Bridge", "Embedded Partner and AI Workflow Proof");
  if (ctx.hasRevenueCycle) sections.unshift("Pre-Visit Automation Bridge", "Revenue Cycle Workflow Proof");
  if (ctx.hasClaimsOps) sections.unshift("Claims Automation Bridge", "Operational Workflow Proof");
  if (ctx.hasHealthCommerce) sections.unshift("Healthcare Commerce Platform Bridge", "Customer and Partner Workflow Proof");
  if (ctx.hasProductInnovation) sections.unshift("NPI and Product Innovation Proof", "Market Research and Launch Readiness");
  if (ctx.hasLifeSciencesSaaS) sections.unshift("Life Sciences SaaS Product Proof", "Application Incubation Signals");
  if (ctx.hasPharmacyInformatics) sections.unshift("Healthcare Data and Workflow Product Proof", "Roadmap and Requirements Ownership");
  if (ctx.hasFinanceErp) sections.unshift("Enterprise SaaS Workflow Proof");
  if (ctx.hasPatientEngagement) sections.unshift("Patient Engagement and Lifecycle Proof");
  if (ctx.hasAi) sections.unshift("AI-Enabled Workflow Proof");
  if (ctx.hasHealthSystems) sections.push("Health System Implementation Signals");
  if (ctx.hasStrategy) sections.push("Strategy and Operating Model Signals");
  if (ctx.hasHcpMarketing) sections.unshift("HCP Education and GTM Enablement Proof");
  return uniqueValues(sections).slice(0, 7);
}

function extractRoleKeywords(context, roleContext = {}) {
  const normalized = normalizeSearchText(context);
  const hasRevenueCycle = /\b(revenue cycle|rcm|pre visit|previsit|pre-visit|eligibility|benefits interpretation|cost estimation|patient financial|payer portal|payment journey|insurance verification)\b/.test(normalized);
  const consumerOnly = new Set(["well-being", "habit building", "journaling", "wearable", "emotionally resonant product"]);
  const housingExcluded = new Set(["providers", "clinicians", "clinical workflows", "health systems", "healthcare AI", "regulated healthcare", "HIPAA", "patient access", "patient engagement", "patient-facing experience", "B2B2C healthcare", "medical record summarization"]);
  return ROLE_KEYWORDS
    .filter((keyword) => normalized.includes(normalizeSearchText(keyword)))
    .filter((keyword) => !(hasRevenueCycle && consumerOnly.has(keyword)))
    .filter((keyword) => !(roleContext.hasHousingEngagement && housingExcluded.has(keyword)))
    .slice(0, 12);
}

function makeCompanyMotivation(company, roleTitle, roleAnalysis) {
  const priorities = roleAnalysis.company_priorities.slice(0, 2).join(" and ");
  const archetype = roleAnalysis.job_archetype.toLowerCase();
  if (roleAnalysis.job_archetype === "Proptech AI Client Engagement") {
    return `${possessive(company)} ${roleTitle} role stands out because it treats AI adoption as real operating work: client goals, property-team workflows, rollout discipline, measurable ROI, and feedback loops that make the platform stronger.`;
  }
  if (roleAnalysis.job_archetype === "AI Systems and Structured Data Product") {
    return `${possessive(company)} ${roleTitle} role stands out because it treats evaluation, feedback loops, structured data, and real-world performance as the core product surface for AI systems.`;
  }
  if (roleAnalysis.job_archetype === "Healthcare Product Innovation and NPI") {
    return `${possessive(company)} ${roleTitle} role stands out because it connects new product innovation, market insight, clinical safety, operating readiness, and launch discipline inside a care model built for women in midlife.`;
  }
  if (roleAnalysis.job_archetype === "Platform Operations and Workflow Infrastructure") {
    return `${possessive(company)} ${roleTitle} role stands out because it treats onboarding, support, care delivery, automation, and launch readiness as the operating infrastructure that lets healthcare scale without losing the human point of the work.`;
  }
  if (roleAnalysis.job_archetype === "Insurtech Benefits Platform Product") {
    return `${possessive(company)} ${roleTitle} role stands out because it treats health insurance complexity as a product, AI, partner, and trust problem for small businesses and employees.`;
  }
  if (priorities) {
    return `${possessive(company)} ${roleTitle} role stands out because it sits at the intersection of ${archetype}, ${priorities}, and the kind of real-world adoption work I have repeatedly owned in healthcare.`;
  }
  return `${possessive(company)} ${roleTitle} role stands out because it connects the work I care about most: clinical need, product judgment, operating discipline, and real-world adoption.`;
}

function normalizeSearchText(text) {
  return String(text ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function contextMatchesPattern(context, pattern) {
  const normalizedContext = normalizeSearchText(context);
  const normalizedPattern = normalizeSearchText(pattern);
  if (!normalizedPattern) return false;
  return new RegExp(`\\b${escapeRegExp(normalizedPattern).replaceAll(" ", "\\s+")}\\b`).test(normalizedContext);
}

function escapeRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function uniqueById(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (!item?.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function titleCase(text) {
  return String(text ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function possessive(text) {
  const clean = sanitizeFinalText(text);
  return /s$/i.test(clean) ? `${clean}'` : `${clean}'s`;
}

function makeCoverLetter({ company, roleTitle, targetRole, input, roleContext, selectedClaims, roleAnalysis }) {
  const team = sanitizeFinalText(input.hiring_team || `${company} Team`);
  const department = sanitizeFinalText(input.department || "");
  const companyLocation = sanitizeFinalText(input.company_location || "");
  const starlightClaim = selectedClaims.find((claim) => claim.id.startsWith("starlight.ai_documentation")) ?? selectedClaims.find((claim) => claim.id.startsWith("starlight."));
  const kannactCoverClaims = selectedClaims.filter((claim) => claim.id.startsWith("kannact.") && !claimHasMetrics(claim, KANNACT_EXPERIENCE_METRIC_IDS));
  const kannactClaim = roleContext.hasIntegration || roleContext.hasData
    ? kannactCoverClaims.find((claim) => claim.id.includes("fhir") || claim.id.includes("data"))
      ?? kannactCoverClaims.find((claim) => claim.id.startsWith("kannact.platform_rebuild"))
      ?? kannactCoverClaims[0]
    : kannactCoverClaims.find((claim) => claim.id.startsWith("kannact.platform_rebuild"))
      ?? kannactCoverClaims.find((claim) => claim.id.includes("fhir") || claim.id.includes("data"))
    ?? kannactCoverClaims[0];
  const ucsfClaim = selectedClaims.find((claim) => claim.id.startsWith("ucsf.compliant")) ?? selectedClaims.find((claim) => claim.id.startsWith("ucsf."));
  let priority = roleAnalysis.company_priorities[0] ?? "real-world adoption";
  if (roleContext.hasIcProductRole && roleContext.hasClinical && roleAnalysis.company_priorities.includes("care-team operating leverage")) {
    priority = "care-team operating leverage";
  }
  const strategy = roleAnalysis.cover_letter_strategy ?? inferCoverLetterStrategy(roleContext);
  const opener = makeCoverOpening({ company, roleTitle, roleContext, roleAnalysis });
  const roleBridge = makeCoverRoleBridge({ company, input, roleContext, roleAnalysis });
  const positioningBridge = makeHandsOnPositioningBridge({ strategy, roleContext });
  const transitionBridge = positioningBridge || makeTransitionBridge({ company, roleTitle, strategy, roleContext });

  const paragraphs = [
    opener,
    roleBridge,
    transitionBridge,
    makeStarlightCoverProof({ company, priority, starlightClaim, roleContext }),
    makeKannactUcsfCoverProof({ kannactClaim, ucsfClaim, roleContext }),
    `What I would bring to ${company} is the mix I care most about: product judgment, operational empathy, technical translation, and a real respect for the people who have to use the system every day.`
  ].filter(Boolean).map(sanitizeFinalText);

  return {
    target_title: targetRole,
    date: todayDisplayDate(),
    company,
    department,
    company_location: companyLocation,
    greeting: `Dear ${team},`,
    paragraphs,
    closing: "Warmly,\nStephanie Ramsay"
  };
}

function claimHasMetrics(claim, metricIds) {
  return (claim?.metric_ids ?? []).some((metricId) => metricIds.has(metricId));
}

function makeStarlightCoverProof({ company, priority, starlightClaim, roleContext }) {
  if (roleContext.hasHousingEngagement) {
    return `At Starlight, the closest parallel has been turning AI and workflow ambiguity into adopted operating practice: mapping partner and operator needs, defining requirements and success measures, supporting launch, and making the change useful enough for teams to trust. That connects closely to what ${company} needs around ${priority}.`;
  }
  if (roleContext.hasAiSystems) {
    return `At Starlight, the most relevant thread has been turning AI documentation and summarization from an idea into an adopted workflow: defining what success should look like, keeping human judgment in the loop, reducing review time, increasing care-team capacity, and making the change reliable enough for real operations. That connects closely to what ${company} needs around ${priority}.`;
  }
  if (roleContext.hasPlatformOperations) {
    return `At Starlight, the closest parallel has been designing operating workflows from first principles: referral intake, eligibility, documentation, escalation, follow-up, partner onboarding, and support all had to become clear enough for teams to trust and repeat. I have also worked on AI documentation and summarization in a practical way, focused less on novelty and more on reducing review time, protecting quality, and increasing capacity. That connects closely to what ${company} needs around ${priority}.`;
  }
  if (roleContext.hasRevenueCycle) {
    return `At Starlight, the closest parallel has been turning pre-visit and administrative pain into product workflow: referral intake, eligibility, insurance verification, billing, documentation, escalation, and follow-up all had to become clear enough for teams to trust and repeat. I have also worked on AI documentation and summarization in a practical way, focused less on novelty and more on reducing review time, protecting quality, and increasing capacity. That connects closely to what ${company} needs around ${priority}.`;
  }
  if (roleContext.hasInsurtechBenefits) {
    return `At Starlight, the closest parallel has been turning healthcare complexity into workflows people could trust: referral intake, eligibility, insurance verification, billing, documentation, escalation, and follow-up all had to become clear enough for teams and partners to repeat. I have also worked on AI documentation and summarization in a practical way, focused less on novelty and more on reducing review time, protecting quality, and increasing capacity. That connects closely to what ${company} needs around ${priority}.`;
  }
  if (roleContext.hasClaimsOps) {
    return `At Starlight, the closest parallel has been turning operational pain into product workflow: eligibility, insurance verification, billing, documentation, escalation, and follow-up all had to become clear enough for teams to trust and repeat. I have also worked on AI documentation and summarization in a practical way, focused less on novelty and more on reducing review time, protecting quality, and increasing capacity. That connects closely to what ${company} needs around ${priority}.`;
  }
  if (roleContext.hasHealthCommerce) {
    return `At Starlight, the closest parallel has been translating partner, clinician, and operational needs into product requirements, rollout plans, and workflows that could scale without losing trust. I have also turned AI documentation pain into a practical workflow change that reduced review time and increased capacity. That connects closely to what ${company} needs around ${priority}.`;
  }
  if (roleContext.hasProductOpsFunction) {
    return `At Starlight, the most relevant thread has been building order around ambiguous product and operating work: mapping partner workflows, translating constraints into requirements and rollout plans, and turning AI documentation pain into a practical workflow change that reduced review time and increased capacity. That connects closely to what ${company} needs around ${priority}.`;
  }
  if (roleContext.hasProductInnovation) {
    return `At Starlight, the closest parallel has been building a virtual clinic from 0 to 1: mapping partner and clinician needs, translating ambiguity into product requirements, shaping rollout plans, and keeping the work tied to adoption and capacity outcomes. That connects closely to what ${company} needs around ${priority}.`;
  }
  if (roleContext.hasHcpMarketing) {
    return `At Starlight, the closest parallel has been turning clinician, health-system, and partner feedback into product requirements, rollout plans, product education, and adoption measures that different teams could actually use. That connects closely to what ${company} needs around ${priority}.`;
  }
  if (roleContext.hasPharmacyInformatics) {
    return `At Starlight, the closest parallel has been mapping health-system and clinician workflows, translating VOC into requirements and rollout plans, and turning AI documentation and chart-review pain into a workflow teams could actually adopt. That connects closely to what ${company} needs around ${priority}.`;
  }
  if (roleContext.hasLifeSciencesSaaS) {
    return `At Starlight, the closest parallel has been owning ambiguous application work end to end: mapping partner and clinician workflows, translating constraints into requirements and rollout plans, and turning AI documentation pain into a practical product workflow that reduced review time and increased capacity. That connects closely to what ${company} needs around ${priority}.`;
  }
  if (roleContext.hasFintechInfrastructure) {
    return `At Starlight, the most relevant thread has been owning ambiguous product work end to end: mapping customer workflows, translating constraints into requirements and rollout plans, and turning AI documentation pain into a practical product workflow that reduced review time and increased capacity. That connects closely to what ${company} needs around ${priority}.`;
  }
  if (starlightClaim?.id?.startsWith("starlight.ai_documentation")) {
    if (roleContext.hasPatientEngagement) {
      return `At Starlight, one of the clearest examples has been turning AI documentation and chart-review pain into a practical workflow change: less time buried in records, more care-team capacity, and more room for the patient follow-up that keeps people moving through care. That connects closely to what ${company} needs around ${priority}.`;
    }
    return `At Starlight, one of the clearest examples has been turning AI documentation and chart-review pain into a practical workflow change: less time buried in records, more care-team capacity, and a product experience that supports how clinicians actually work. That connects closely to what ${company} needs around ${priority}.`;
  }
  return `At Starlight, I have worked between health system partners, clinicians, product, engineering, compliance, and operations to turn ambiguous workflow needs into product and operating decisions teams can actually use. That connects closely to what ${company} needs around ${priority}.`;
}

function makeKannactUcsfCoverProof({ kannactClaim, ucsfClaim, roleContext }) {
  if (roleContext.hasHousingEngagement) {
    return "At Kannact, I led platform and roadmap work across participant experience, partner needs, omnichannel engagement, reporting, customer feedback loops, and product-led commercial narratives, which is close to the client-facing transformation work this role needs. Earlier at UCSF, I built the habit of translating complex stakeholder needs into clear, compliant releases with many teams depending on the same source of truth.";
  }
  if (roleContext.hasAiSystems) {
    return "At Kannact, I led platform work across structured data foundations, FHIR-based interoperability, reporting, feedback loops, secure access, data model simplification, and care-team workflows. Earlier at UCSF, I built the habit of translating research and operational requirements into compliant releases with clinicians, researchers, engineers, and operations teams all needing the system to be clear and trustworthy.";
  }
  if (roleContext.hasPlatformOperations) {
    return "At Kannact, I led platform and roadmap work across care-team workflows, automated tasking, reporting, secure access, partner needs, customer feedback loops, and OKRs, so I know how much product discipline matters when healthcare operations have to scale without adding manual burden. Earlier at UCSF, that same rigor showed up in compliant healthcare releases where research, clinical, engineering, and operations stakeholders all needed clarity.";
  }
  if (roleContext.hasRevenueCycle) {
    return "At Kannact, I led platform and roadmap work across care-team workflows, automated tasking, FHIR-based data foundations, reporting, partner needs, and feedback loops, so I know how much product discipline matters when healthcare operations have to scale without adding manual burden. Earlier at UCSF, that same rigor showed up in compliant healthcare releases where research, clinical, engineering, and operations stakeholders all needed clarity.";
  }
  if (roleContext.hasInsurtechBenefits) {
    return "At Kannact, I led roadmap and platform work inside an employer-sponsored benefits model, across participant experience, care-team workflows, secure access, reporting, partner needs, customer feedback loops, and product-led commercial narratives. Earlier at UCSF, I learned the same discipline in a regulated research setting, translating clinical, research, engineering, and operations needs into compliant releases.";
  }
  if (roleContext.hasClaimsOps) {
    return "At Kannact, I led platform and roadmap work across care-team workflows, automated tasking, reporting, partner needs, feedback loops, and OKRs, so I know how much product discipline matters when operational work has to scale without adding more manual burden. Earlier at UCSF, that same rigor showed up in compliant healthcare releases where research, clinical, engineering, and operations stakeholders all needed clarity.";
  }
  if (roleContext.hasHealthCommerce) {
    return "At Kannact, I led roadmap and platform work across participant experience, partner needs, omnichannel engagement, secure access, reporting, and customer feedback loops, which is close to the trust-based healthcare platform work this role needs. Earlier at UCSF, I learned the same discipline in a regulated research setting, translating clinical, research, engineering, and operations needs into compliant releases.";
  }
  if (roleContext.hasProductOpsFunction) {
    return "At Kannact, I led roadmap and platform work across product, engineering, operations, data, reporting, and partner needs, including objective-setting habits and feedback loops that helped the team focus and execute. Earlier at UCSF, I learned how much rigor matters when product work has to coordinate researchers, clinicians, engineers, and operations across many releases.";
  }
  if (roleContext.hasProductInnovation) {
    return "At Kannact, I led roadmap, product-demo, feedback-loop, reporting, engagement, and platform work across product, operations, partner, and commercial needs, so I know how much coordination matters when a new healthcare offering has to be clinically credible, operationally real, and measurable. Earlier at UCSF, I learned the same discipline in a regulated research setting, translating clinical, research, engineering, and operations needs into compliant releases.";
  }
  if (roleContext.hasHcpMarketing) {
    return "At Kannact, I led roadmap, platform, engagement, product-demo, feedback-loop, and reporting work across product, operations, partner, and commercial needs, so I know how much coordination matters when healthcare programs have to be clear, credible, and measurable. Earlier at UCSF, I learned the same discipline in a regulated research setting, translating clinical, research, engineering, and operations needs into compliant releases.";
  }
  if (roleContext.hasPharmacyInformatics) {
    return "At Kannact, I led roadmap and platform work across care-team workflows, FHIR-based data sharing, EHR integration requirements, reporting, automated tasking, secure access, and partner needs. Earlier at UCSF, I built the habit of translating clinical, research, engineering, and operational requirements into compliant releases where clarity and trust mattered.";
  }
  if (roleContext.hasPatientEngagement) {
    return "At Kannact, I led patient engagement and platform work across omnichannel communication, scheduling, reminders, mobile experience, care-team workflows, and partner needs, so I know how much the details matter when a product has to work for patients, care teams, and customers at the same time. Earlier at UCSF, that same patient-facing work was tied to breast cancer prevention, enrollment, activation, and participant trust.";
  }
  if (roleContext.hasFintechInfrastructure) {
    return "At Kannact, I led roadmap and platform work across product, engineering, operations, data, reporting, and partner needs, including customer feedback loops that shaped priorities and improved execution. Earlier at UCSF, I learned how much clarity matters when product work has to coordinate researchers, clinicians, engineers, and operations across many releases.";
  }
  const kannactText = kannactClaim?.id?.startsWith("kannact.platform_rebuild")
    ? "At Kannact, I led a ground-up care platform rebuild across RPM, engagement, documentation, data, and partner workflows, so I know how much the details matter when a product has to work for care teams and participants at the same time."
    : `At Kannact, ${lowerLead(firstPersonClaim(kannactClaim?.text) ?? "I rebuilt care-team and participant workflows across product, operations, engagement, and partner needs.")}`;
  const ucsfText = ucsfClaim
    ? "Earlier at UCSF, I learned the same lesson in a research setting: good product work in healthcare has to respect the science, the workflow, and the person trying to move through the system."
    : "Earlier at UCSF, I learned the same lesson in a research setting: good product work in healthcare has to respect the science, the workflow, and the person trying to move through the system.";
  return `${kannactText} ${ucsfText}`;
}

function makeCoverOpening({ company, roleTitle, roleContext, roleAnalysis }) {
  if (roleContext.hasHousingEngagement) {
    return `What drew me to ${possessive(company)} ${roleTitle} role is that it is about making AI useful inside essential, everyday operations. Renters, property teams, and operators all feel it when a workflow breaks down, and this role sits right where product value has to become adoption, trust, and measurable operating impact.`;
  }
  if (roleContext.hasAiSystems) {
    return `What drew me to ${possessive(company)} ${roleTitle} role is that it treats AI performance as a systems problem, not just a model problem. Evaluation, feedback loops, structured data, and cost-performance trade-offs are where product judgment really matters, because that is where technical improvement has to become something reliable and valuable in the real world.`;
  }
  if (roleContext.hasPlatformOperations) {
    return `What drew me to ${possessive(company)} ${roleTitle} role is that Abby Care is trying to make family care possible at scale, and this role sits where that promise becomes operationally real: onboarding, support, care delivery, new markets, and the workflows that decide whether teams can move quickly without creating unnecessary complexity.`;
  }
  if (roleContext.hasClaimsOps) {
    return `What drew me to ${possessive(company)} ${roleTitle} role is that claims and payment infrastructure is trust work as much as technical work. The product has to understand where data enters, where rules adjudicate, where reconciliation breaks, and how finance, operations, pharmacy partners, and engineering teams can work from the same source of truth.`;
  }
  if (roleContext.hasRevenueCycle) {
    if (roleAnalysis.source_quality?.extraction_warning?.includes("out-of-pocket cost estimate")) {
      return `What drew me to ${company} is how concrete the problem is. Pre-visit automation is not just an AI problem; it is a trust problem for patients and an operational problem for the teams trying to help them.`;
    }
    return `What drew me to ${possessive(company)} ${roleTitle} role is that pre-visit automation is not just an AI problem; it is a workflow, trust, and patient experience problem. The product has to understand where eligibility breaks down, where billing creates confusion, where teams still need judgment, and how to make automation reliable enough for real healthcare operations.`;
  }
  if (roleContext.hasInsurtechBenefits) {
    return `What drew me to ${possessive(company)} ${roleTitle} role is the mission to make health insurance feel less intimidating for small businesses. That is exactly the kind of product problem I care about: complex rules, high-stakes decisions, partner systems, AI opportunity, and users who need the experience to feel clear instead of punishing.`;
  }
  if (roleContext.hasHealthCommerce) {
    return `What drew me to ${possessive(company)} ${roleTitle} role is the mix of healthcare access, customer trust, partner experience, and hands-on product execution. A platform like this has to make the journey feel clear for customers while giving partners and internal teams reliable workflows they can actually use.`;
  }
  if (roleContext.hasTechnicalProgramDelivery) {
    return `What drew me to ${possessive(company)} ${roleTitle} role is the chance to help make healthcare AI work in the real world: clear client requirements, reliable integrations, patient access workflows, launch readiness, and enough governance that teams can move quickly without losing trust.`;
  }
  if (roleContext.hasAi && roleContext.hasHealthSystems) {
    return `What drew me to ${possessive(company)} ${roleTitle} role is the chance to work on product that sits right inside the hospital reality: patient journeys, clinical workflows, data that needs to become actionable, and AI that has to make teams more effective without losing trust.`;
  }
  if (roleContext.hasIcProductRole && (roleContext.hasClinical || roleContext.hasHealthSystems)) {
    return `What drew me to ${possessive(company)} ${roleTitle} role is the chance to turn customer and market needs into healthcare platform capabilities that make work clearer for customers, care teams, and patients. That is the kind of product work I tend to care about most.`;
  }
  if (roleContext.hasProductOpsFunction) {
    return `What drew me to ${possessive(company)} ${roleTitle} role is the chance to build the product operating backbone early: the planning rhythms, decision visibility, PM workflows, and AI-enabled habits that help a product organization move with more clarity without getting heavy.`;
  }
  if (roleContext.hasProductInnovation) {
    return `What drew me to ${possessive(company)} ${roleTitle} role is the chance to build new healthcare offerings from the messy early middle: market signal, clinical judgment, patient need, operational readiness, and the business case all have to come together before launch.`;
  }
  if (roleContext.hasHcpMarketing) {
    return `What drew me to ${possessive(company)} ${roleTitle} role is the mix of healthcare product marketing, HCP education, field enablement, and compliant program execution. In diabetes care, the work has to be clinically credible, operationally tight, and useful for the sales, medical, marketing, and provider audiences who all need the story to hold up.`;
  }
  if (roleContext.hasPharmacyInformatics) {
    return `What drew me to ${possessive(company)} ${roleTitle} role is the chance to work on the kind of healthcare product that has to earn trust from several directions at once: pharmacists, clinicians, informaticists, engineering partners, and the organizations depending on precise drug and medical device knowledge.`;
  }
  if (roleContext.hasLifeSciencesSaaS) {
    if (!roleContext.hasVeeva) {
      return `What drew me to ${possessive(company)} ${roleTitle} role is the mix of pharma domain fluency, omnichannel execution, and practical digital platform work. The product has to serve regulated healthcare realities while still giving business, marketing, clinical, and technical stakeholders a clear way to plan, ship, measure, and improve.`;
    }
    return `What drew me to ${possessive(company)} ${roleTitle} role is Veeva Labs' mandate to build the applications Veeva and its customers need when the market does not already offer something good enough. That is exactly the kind of product work I like: close to real workflows, high standards, executive priorities, and users who need the system to make complicated work feel clearer.`;
  }
  if (roleContext.hasFintechInfrastructure) {
    return `What drew me to ${possessive(company)} ${roleTitle} role is the chance to support product work behind financial tools that people and developers rely on every day, where clarity, trust, and execution quality really matter.`;
  }
  if (roleContext.hasConsumerWellbeing) {
    return `What drew me to ${possessive(company)} ${roleTitle} role is that it sits close to a kind of product work I care about deeply: building technology around real human moments, not just screens or features.`;
  }
  if (roleContext.hasPatientEngagement) {
    return `What drew me to ${possessive(company)} ${roleTitle} role is the chance to make ongoing primary care feel clearer, more personal, and easier to return to over time. The post-booking lifecycle is exactly where trust is either built or lost: preparation, visit quality, follow-up, messages, labs, prescriptions, and the next appointment.`;
  }
  if (roleContext.hasIntegration || roleContext.hasData) {
    return `What drew me to ${possessive(company)} ${roleTitle} role is the chance to make complex clinical, data, and partner systems easier for people to trust and use. That is the kind of product work I tend to care about most.`;
  }
  if (roleContext.hasAi) {
    return `What drew me to ${possessive(company)} ${roleTitle} role is that it is about turning new technology into practical workflows people can actually trust. In healthcare especially, that is the difference between an impressive idea and something that makes care easier.`;
  }
  if (roleContext.hasHealthSystems) {
    return `What drew me to ${possessive(company)} ${roleTitle} role is that it sits close to the day-to-day reality of clinical teams, patients, and operators. That is where I have done some of my best product work.`;
  }
  const priorities = humanList(roleAnalysis.company_priorities.slice(0, 2));
  return `What drew me to ${possessive(company)} ${roleTitle} role is the practical nature of the work: ${priorities || "clearer workflows, better adoption, and measurable care delivery outcomes"}.`;
}

function makeCoverRoleBridge({ input, roleContext }) {
  const theme = sanitizeFinalText(input.company_motivation || "");
  if (roleContext.hasHousingEngagement) {
    return "The domain shift from healthcare into housing is intentional. My strongest work has been translating complex, high-touch service workflows into clearer product requirements, implementation plans, adoption measures, and operating habits, and I am drawn to applying that same discipline to property operations where speed, trust, and user experience matter every day.";
  }
  if (roleContext.hasAiSystems) {
    return "My background is not a traditional ML research path, but the operating pattern is very familiar: understand the system deeply, find the signals that separate progress from noise, translate ambiguity into requirements, and help engineering, data, operations, customers, and executives agree on what should move into production.";
  }
  if (roleContext.hasPlatformOperations) {
    return "The bridge from product leadership into platform operations is very intentional. My strongest work has been in the messy middle between product, clinical operations, engineering, compliance, partners, and the people using the system every day: finding where work breaks down, turning that into requirements and operating rhythms, and helping teams launch something they can actually sustain.";
  }
  if (roleContext.hasRevenueCycle) {
    if (String(input.notes ?? "").includes("out-of-pocket cost estimate")) {
      return "That feels very close to the work I have been doing recently. A lot of the frustration has been around trying to get to the right out-of-pocket cost estimate when service types, benefit details, and billing-code mapping do not line up cleanly. It is confusing for patients, difficult for teams, and exactly the kind of problem that needs careful product thinking. I know this problem is real, and I would love to contribute to the solution.";
    }
    return "While my background is not a traditional revenue cycle vendor path, the operating pattern is familiar: understand the workflow deeply, identify the repeatable decision logic, use data and frontline feedback to separate signal from noise, and build product systems people can adopt in high-volume healthcare environments.";
  }
  if (roleContext.hasClaimsOps) {
    return "While my background is not a traditional payer claims-administration path, the operating pattern is familiar: understand the workflow deeply, find the repeatable decision logic, use data to separate signal from noise, and build product systems people can adopt in high-volume healthcare environments.";
  }
  if (roleContext.hasInsurtechBenefits) {
    return "My background is not a traditional insurance-carrier path, but the operating pattern is very familiar: understand the workflow deeply, identify the decision logic, use data and customer feedback to separate signal from noise, and build product systems that make complicated healthcare work feel usable.";
  }
  if (roleContext.hasTechnicalProgramDelivery) {
    return "The bridge to technical program management is intentional: my strongest work has been owning the messy middle between customers, clinicians, operations, product, engineering, compliance, and launch. I like turning that ambiguity into requirements, integration plans, readiness checks, metrics, and working rhythms teams can actually use.";
  }
  if (roleContext.hasProductInnovation) {
    if (roleContext.hasClinical || roleContext.hasHealthSystems) {
      return "My path has been product ownership inside complex healthcare workflows: understanding the market and user need, translating clinical and operational constraints into requirements, and launching in a way that teams can actually support.";
    }
    return "My background is not a traditional CPG path, but the operating pattern is familiar: understand the market and user need, test the concept, build the case for what should exist, coordinate across clinical and operational constraints, and launch in a way that teams can actually support.";
  }
  if (roleContext.hasPharmacyInformatics) {
    return "My path is not a clinician moving into product management. It is product ownership inside complex healthcare workflows: listening to clinical and operational experts, translating what they need into requirements and roadmap decisions, and staying close enough to engineering and implementation for the product to work in the real world.";
  }
  if (roleContext.hasHcpMarketing) {
    return "My background is not a traditional speaker-bureau marketing path, but the operating pattern is familiar: understand the audience, translate clinical and market context into clear product work, coordinate across compliance-sensitive stakeholders, launch cleanly, and measure what is actually changing.";
  }
  if (theme && !looksLikeKeywordFragment(theme)) {
    return `What especially caught my attention is that ${sentenceWithTerminalPunctuation(theme)} My work has usually lived in that same space: listening for where patients and care teams get stuck, then turning messy operational needs into clearer products, workflows, and decisions.`;
  }
  if (roleContext.hasConsumerWellbeing) {
    return "A lot of my work has been in healthcare, but the core theme has always been the same: understanding where people get stuck, designing better systems around those moments, and helping teams execute with more clarity.";
  }
  if (roleContext.hasPatientEngagement) {
    return "My work has usually lived where patient experience, clinical reality, and product execution meet: understanding where people drop off, designing clearer journeys, and helping teams ship workflows that improve activation, engagement, and continuity of care.";
  }
  if (roleContext.hasProductOpsFunction) {
    return "A lot of my work has been in healthcare, but the core theme has been broader than the domain: finding where teams and users get stuck, designing better operating systems around those moments, and helping cross-functional groups execute with less friction.";
  }
  if (roleContext.hasFintechInfrastructure) {
    return "A lot of my work has been in healthcare, but the core theme has been broader than the domain: finding where users and partners get stuck, turning those needs into product direction, and helping cross-functional teams ship experiences people can trust.";
  }
  if (roleContext.hasIntegration || roleContext.hasData) {
    return "I have spent the last several years working between technical systems and the humans who have to depend on them: clinicians, partners, operators, engineers, compliance teams, and the members or patients on the other side of the workflow.";
  }
  return "The work I keep coming back to is translating complicated healthcare realities into something more usable: clearer requirements, better workflows, stronger launches, and products that make sense in the real world.";
}

function makeTransitionBridge({ company, roleTitle, strategy, roleContext }) {
  if (!strategy.needs_transition_bridge) return "";
  if (roleContext.hasAiSystems) {
    return "The move into AI systems product work is intentional because it keeps me close to the product problems I care about most: ambiguous systems, high-trust data, feedback loops, human judgment, measurable outcomes, and the discipline to make new technical capability useful instead of merely impressive.";
  }
  if (roleContext.hasRevenueCycle) {
    return "The move into revenue cycle automation is intentional because it keeps the work close to product problems I have repeatedly owned: workflow modernization, automation that still needs human judgment, operational metrics, stakeholder alignment, and careful rollout into healthcare teams that cannot afford brittle tools.";
  }
  if (roleContext.hasClaimsOps) {
    return "The move into claims automation is intentional because it keeps the work close to the product problems I have repeatedly owned: workflow modernization, automation that still needs human judgment, operational metrics, stakeholder alignment, and careful rollout into healthcare teams that cannot afford brittle tools.";
  }
  if (roleContext.hasInsurtechBenefits) {
    return "The move into insurtech is intentional because it keeps me close to product problems I have repeatedly owned: healthcare complexity, benefits-adjacent workflows, AI-enabled operations, partner rollout, user trust, and the discipline to make difficult systems feel simple without pretending they are.";
  }
  if (roleContext.hasProductInnovation) {
    return "The move into product innovation is intentional because it keeps me close to the parts of product leadership I like most: ambiguous early ideas, user and market evidence, clinical and operational reality, clear decisions, and the discipline to get from concept to launch without losing the human point of the work.";
  }
  if (roleContext.hasHcpMarketing) {
    return "The move into HCP peer-to-peer marketing makes sense to me because it keeps the work close to product, evidence, education, field execution, and the practical adoption moments where healthcare products either become trusted or get ignored.";
  }
  if (roleContext.hasFinanceErp) {
    return `This role feels like a thoughtful move because the domain is different, but the product problem is familiar: complex workflows, high-trust data, automation that needs judgment, and users who need the system to feel clear instead of brittle.`;
  }
  if (roleContext.hasConsumerWellbeing) {
    return `This role feels like a natural next step because it brings together the things I have spent the last several years building: user-centered product strategy, operational rigor, AI-enabled workflows, and a deep focus on real-world experience.`;
  }
  if (roleContext.hasFintechInfrastructure) {
    return "This role feels like a natural next step because it keeps the work close to product ownership: customer discovery, clear requirements, data-informed roadmap decisions, AI-assisted product work, and the discipline to ship quickly without losing trust.";
  }
  if (roleContext.hasProductOpsRole || roleContext.hasStrategy) {
    return `The move makes sense to me because I am not trying to leave product behind. The part that feels right is the part of product leadership that turns ambiguity into operating clarity and helps teams move from idea to execution.`;
  }
  return `${possessive(company)} ${roleTitle} role feels like a natural fit because it stays close to product, users, workflows, and execution while still asking for the broader operating judgment I have built across healthcare teams.`;
}

function makeHandsOnPositioningBridge({ strategy, roleContext }) {
  if (!strategy.needs_hands_on_bridge) return "";
  const proximity = roleContext.hasHybridInOffice
    ? " I also value being close enough to teams and users to hear how people talk about the work and see where workflows break down in real time."
    : "";
  return `Even with a chief-level title, my work has stayed deeply hands-on. I am still writing requirements, mapping workflows, supporting launches, and staying close to the people using the product every day; I see that as an intentional version of leadership, close to the product, the workflow, and the team building the solution.${proximity}`;
}

function looksLikeKeywordFragment(text) {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) return false;
  const firstWord = trimmed.split(/\s+/)[0]?.toLowerCase();
  const imperativeVerbs = new Set([
    "scale",
    "drive",
    "build",
    "deliver",
    "enable",
    "improve",
    "optimize",
    "support",
    "transform"
  ]);
  const commaCount = (trimmed.match(/,/g) ?? []).length;
  return imperativeVerbs.has(firstWord) || commaCount >= 3;
}

function humanList(items) {
  const clean = items.map((item) => sanitizeFinalText(item)).filter(Boolean);
  if (clean.length === 0) return "";
  if (clean.length === 1) return clean[0];
  return `${clean.slice(0, -1).join(", ")} and ${clean.at(-1)}`;
}

function firstPersonClaim(text) {
  if (!text) return null;
  const replacements = [
    ["Owns ", "I own "],
    ["Own ", "I own "],
    ["Partners ", "I partner "],
    ["Partner ", "I partner "],
    ["Partnered ", "I partnered "],
    ["Introduces ", "I introduce "],
    ["Introduced ", "I introduced "],
    ["Designs ", "I design "],
    ["Designed ", "I designed "],
    ["Builds ", "I build "],
    ["Built ", "I built "],
    ["Creates ", "I create "],
    ["Created ", "I created "],
    ["Leads ", "I lead "],
    ["Led ", "I led "],
    ["Identifies ", "I identify "],
    ["Identified ", "I identified "],
    ["Defines ", "I define "],
    ["Defined ", "I defined "],
    ["Rebuilds ", "I rebuild "],
    ["Rebuilt ", "I rebuilt "],
    ["Transforms ", "I transform "],
    ["Transformed ", "I transformed "],
    ["Launches ", "I launch "],
    ["Launched ", "I launched "],
    ["Improves ", "I improve "],
    ["Improved ", "I improved "],
    ["Ships ", "I ship "],
    ["Shipped ", "I shipped "],
    ["Translates ", "I translate "],
    ["Translated ", "I translated "]
  ];
  for (const [from, to] of replacements) {
    if (text.startsWith(from)) return `${to}${text.slice(from.length)}`;
  }
  return text;
}

function lowerLead(text) {
  if (!text) return text;
  if (text.startsWith("I ")) return text;
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function sentenceWithTerminalPunctuation(text) {
  const clean = sanitizeFinalText(text);
  if (!clean) return clean;
  return /[.!?]$/.test(clean) ? clean : `${clean}.`;
}

function makeOperatingWork(ctx, analysis) {
  if (ctx.hasAiSystems) {
    return [
      {
        title: "AI Workflow Evaluation Signals",
        variant: "mist",
        text: "Translated AI documentation and summarization opportunities into practical workflow changes with human review expectations, measurable capacity gains, and adoption signals."
      },
      {
        title: "Structured Data Foundations",
        variant: "blush",
        text: "Led platform work across FHIR-based data sharing, data model simplification, reporting, secure access, and partner-specific deployment needs in regulated SaaS systems."
      },
      {
        title: "Feedback Loops to Roadmap",
        variant: "",
        text: "Built customer feedback loops through user interviews, surveys, usage signals, and operational data to guide roadmap priorities and product iteration."
      },
      {
        title: "Research to Production Translation",
        variant: "",
        text: "Worked across product, engineering, operations, compliance, customers, and executives to move ambiguous requirements into technical specifications, rollout plans, launch readiness, and scale."
      }
    ];
  }
  if (ctx.hasRevenueCycle) {
    return [
      {
        title: "Pre-Visit Workflow Design",
        variant: "mist",
        text: "Designed patient access, referral intake, eligibility, insurance verification, billing, escalation, follow-up, and support workflows that turned fragmented operational steps into repeatable healthcare processes."
      },
      {
        title: "AI-Enabled Administrative Scale",
        variant: "blush",
        text: "Translated AI documentation and medical record summarization into practical workflows that reduced documentation and chart review time by 50% and increased care capacity by 20%."
      },
      {
        title: "Billing Logic and Operational Controls",
        variant: "",
        text: "Built automated billing and operational workflows across E/M, RPM, and CCM services, defining code logic, aggregation rules, and process controls to support compliant, repeatable growth."
      },
      {
        title: "Enterprise Product Delivery",
        variant: "",
        text: "Worked across product, engineering, clinical operations, compliance, customer success, GTM, and executive stakeholders to move ambiguous partner needs into requirements, implementation plans, launch readiness, and scale."
      }
    ];
  }
  if (ctx.hasInsurtechBenefits) {
    return [
      {
        title: "Benefits Workflow Clarity",
        variant: "mist",
        text: "Designed healthcare access workflows across referral intake, eligibility, insurance verification, billing, escalation, follow-up, and support, turning fragmented operational steps into repeatable processes."
      },
      {
        title: "AI Document and Support Automation",
        variant: "blush",
        text: "Translated AI documentation and medical record summarization into practical workflows that reduced documentation and chart review time by 50% and increased care capacity by 20%."
      },
      {
        title: "Embedded Partner Rollout",
        variant: "",
        text: "Owned enterprise partner onboarding, implementation strategy, product requirements, workflows, risk visibility, launch readiness, and adoption planning across complex healthcare programs."
      },
      {
        title: "Roadmap and Customer Feedback Loops",
        variant: "",
        text: "Built product demos, dashboards, feedback loops, partner narratives, and roadmap priorities so teams could understand product value, customer needs, adoption, outcomes, and investment readiness."
      }
    ];
  }
  if (ctx.hasProductInnovation) {
    return [
      {
        title: "Insight to Product Concept",
        variant: "mist",
        text: "Translated patient, clinician, partner, and operational feedback into product requirements, roadmap priorities, launch plans, and measurable success criteria for new healthcare offerings."
      },
      {
        title: "Business-Case and Executive Clarity",
        variant: "blush",
        text: "Built product demos, dashboards, feedback loops, and partner narratives that helped executives and commercial stakeholders understand product value, adoption, outcomes, and investment readiness."
      },
      {
        title: "Clinical and Operational Readiness",
        variant: "",
        text: "Worked across product, clinical operations, engineering, compliance, customer success, and executives to move ambiguous concepts into workflows teams could launch, support, and scale."
      },
      {
        title: "0-to-1 Care Delivery Expansion",
        variant: "",
        text: "Built virtual clinic and care delivery workflows from scratch across intake, eligibility, documentation, follow-up, partner onboarding, and care-team operations."
      }
    ];
  }
  if (ctx.hasPharmacyInformatics) {
    return [
      {
        title: "Clinical VOC to Product Requirements",
        variant: "mist",
        text: "Mapped health-system, clinician, and operational workflows into product requirements, rollout plans, and measurable success criteria for regulated healthcare products."
      },
      {
        title: "Healthcare Data and Interoperability",
        variant: "blush",
        text: "Led platform work across FHIR-based data sharing, EHR integration requirements, reporting, automated tasking, documentation, and secure access."
      },
      {
        title: "AI-Enabled Care-Team Scale",
        variant: "",
        text: "Translated AI documentation and medical record summarization into practical workflows that reduced documentation and chart review time by 50% and increased care capacity by 20%."
      },
      {
        title: "Roadmap, Launch, and Adoption",
        variant: "",
        text: "Owned product roadmap decisions, partner onboarding, launch readiness, adoption planning, and post-launch iteration across complex healthcare programs."
      }
    ];
  }
  if (ctx.hasConsumerWellbeing) {
    return [
      {
        title: "User Discovery to Product Strategy",
        variant: "mist",
        text: "Built structured customer feedback loops through weekly user interviews and surveys, using qualitative insight and usage signals to shape roadmap priorities, experience improvements, and rapid product iteration."
      },
      {
        title: "Behavior Change and Engagement",
        variant: "blush",
        text: "Designed behavior-change journeys that connected mobile, messaging, care-team touchpoints, reminders, and feedback loops into a more continuous participant experience."
      },
      {
        title: "AI-Enabled Product Experience",
        variant: "",
        text: "Translated emerging AI capabilities into practical user workflows for documentation, summarization, care-team support, and lower-friction follow-up."
      },
      {
        title: "Mobile Experience and Scale",
        variant: "",
        text: "Led mobile experience strategy across iOS and Android, rebuilding core workflows, infrastructure, and design-system patterns for a cleaner, more usable participant journey."
      }
    ];
  }
  if (ctx.hasHealthCommerce) {
    return [
      {
        title: "Customer and Partner Workflow Discovery",
        variant: "mist",
        text: "Translated customer, partner, clinician, and operational feedback into product requirements, rollout plans, workflows, and measurable success criteria for regulated healthcare platforms."
      },
      {
        title: "Healthcare Platform Launch Execution",
        variant: "blush",
        text: "Owned launch-ready workflows across intake, eligibility, documentation, communication, reporting, and partner implementation while keeping compliance and operational reliability visible."
      },
      {
        title: "AI Workflow Adoption",
        variant: "",
        text: "Translated AI documentation and summarization opportunities into adopted workflows that reduced documentation and chart review time by 50% and increased care capacity by 20%."
      },
      {
        title: "Roadmap and Success Metrics",
        variant: "",
        text: "Built feedback loops, OKRs, dashboards, and roadmap priorities so teams could track adoption, performance, decisions, dependencies, and operational value."
      }
    ];
  }
  if (ctx.hasProductOpsFunction || ctx.hasLifeSciencesSaaS || ctx.hasFintechInfrastructure) {
    return [
      {
        title: "Product Operating Rhythm",
        variant: "mist",
        text: "Introduced team objective-setting, customer feedback loops, roadmap priorities, and clear requirements practices to improve focus, alignment, and execution across product, engineering, operations, and executive stakeholders."
      },
      {
        title: "AI Workflow Adoption",
        variant: "blush",
        text: "Translated AI documentation and summarization opportunities into adopted workflows that reduced documentation and chart review time by 50% and increased care capacity by 20%."
      },
      {
        title: "Execution Visibility",
        variant: "",
        text: "Built dashboards, partner-specific workflows, rollout plans, and measurable success criteria so teams could track adoption, performance, decisions, dependencies, and operational value."
      },
      {
        title: "Enterprise Product Delivery",
        variant: "",
        text: "Worked across product, engineering, clinical operations, compliance, customer success, and executives to move ambiguous partner needs into technical requirements, implementation plans, launch readiness, and scale."
      }
    ];
  }
  return [
    {
      title: "Clinical VOC to Product Requirements",
      variant: "mist",
      text: `Partnered with clinicians, executives, operations leaders, and customers to surface unmet workflow needs and translate them into requirements, rollout plans, and measurable success criteria for ${analysis.company_priorities[0] ?? "care delivery execution"}.`
    },
    {
      title: ctx.hasAi ? "AI-Enabled Care Workflows" : "Workflow Automation and Care-Team Scale",
      variant: "blush",
      text: ctx.hasAi
        ? "Introduced AI-powered documentation and medical record summarization that reduced documentation and chart review time by 50% and increased care capacity by 20%."
        : "Built workflow systems across intake, eligibility, billing, RPM, scheduling, reminders, documentation, and care-team operations."
    },
    {
      title: "Cross-Functional Product Delivery",
      variant: "",
      text: "Worked across clinical, product, engineering, compliance, customer success, and executive stakeholders to move from ambiguous needs to product launches, adoption, and scale."
    },
    {
      title: ctx.hasStrategy ? "Commercial and Partner Enablement" : "Partner Implementation and Adoption",
      variant: "",
      text: "Built partner-specific workflows, dashboards, deployment approaches, and product narratives that helped enterprise partners understand outcomes, adoption, and operational value."
    }
  ];
}

function renderStrategicAlignment(content, sourceMap) {
  const analysis = content.role_analysis;
  const selectedClaims = sourceMap.selected_claims.slice(0, 8).map((claim) => `- ${claim.id}: ${claim.text}`).join("\n");
  const metrics = sourceMap.selected_metrics.map((metric) => `- ${metric.id}: ${metric.description}`).join("\n");
  const proofPoints = (analysis.packet_proof_points ?? []).map((claim) => `- ${claim.id}: ${claim.text}`).join("\n");
  const atsProofPoints = (analysis.ats_proof_points ?? []).map((claim) => `- ${claim.id}: ${claim.text}`).join("\n");
  const selectedSkills = (sourceMap.selected_resume_skills ?? []).map((skill) => `- ${skill}`).join("\n");
  return `# Strategic Alignment: ${content.metadata.company} ${content.metadata.role_title}

## Role Analysis

- Job archetype: ${analysis.job_archetype}
- Secondary archetypes: ${(analysis.secondary_archetypes ?? []).join(", ") || "None"}
- Source quality: ${analysis.source_quality.job_description_chars} job-description characters${analysis.source_quality.extraction_warning ? `; warning: ${analysis.source_quality.extraction_warning}` : ""}

## Company Priorities

${analysis.company_priorities.map((item) => `- ${item}`).join("\n")}

## Required and Preferred Skills

Required:
${analysis.required_skills.map((item) => `- ${item}`).join("\n")}

Preferred:
${analysis.preferred_skills.map((item) => `- ${item}`).join("\n")}

## Keywords To Include Naturally

${analysis.role_keywords.map((item) => `- ${item}`).join("\n") || "- No role-specific keywords detected."}

## Resume Skills Selected From Skill Bank

${selectedSkills || "- No resume skills selected."}

## Recommended Positioning

${content.positioning.role_fit_thesis}

## Headline

${content.positioning.resume_headline}

## Top Matching Signals

${content.positioning.side_panel_signals.map((signal) => `- ${signal}`).join("\n")}

## Top Executive Packet Proof Points

${proofPoints || "- No packet proof points selected."}

## Top ATS Resume Proof Points

${atsProofPoints || "- No ATS proof points selected."}

## Selected Source Claims

${selectedClaims}

## Approved Metrics In Use

${metrics || "- No metrics selected."}

## Concern To Address

${content.positioning.concern_to_address}

## Recommended Sections To Prioritize

${analysis.recommended_sections.map((item) => `- ${item}`).join("\n")}

## Recommended Asset Filenames

- Website PDF: ${analysis.recommended_filenames.website_pdf}
- ATS resume: ${analysis.recommended_filenames.ats_resume}
- Cover letter: ${analysis.recommended_filenames.cover_letter}

## Recommended Public Route

\`${content.metadata.slug}\`

## Review Notes

Edit \`approved-content.json\` before generation if the positioning, selected claims, cover letter, or landing-page copy should change. The generator will render deterministic files from that approved content.
`;
}
