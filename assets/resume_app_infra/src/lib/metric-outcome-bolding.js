export function metricOutcomeSpans(text, metricIds = [], sourceLibrary) {
  const claimText = String(text ?? "");
  const spans = [];
  for (const metricId of metricIds ?? []) {
    const metric = sourceLibrary.metricById.get(metricId);
    if (!metric) continue;
    const span = findMetricSpan(claimText, metric);
    if (span) spans.push({ ...span, metric_id: metricId });
  }
  return mergeSpans(spans);
}

export function splitMetricOutcomeSegments(text, metricIds = [], sourceLibrary) {
  const claimText = String(text ?? "");
  const spans = metricOutcomeSpans(claimText, metricIds, sourceLibrary);
  if (spans.length === 0) return [{ text: claimText, bold: false }];

  const segments = [];
  let cursor = 0;
  for (const span of spans) {
    if (span.start > cursor) segments.push({ text: claimText.slice(cursor, span.start), bold: false });
    segments.push({ text: claimText.slice(span.start, span.end), bold: true, metric_id: span.metric_id });
    cursor = span.end;
  }
  if (cursor < claimText.length) segments.push({ text: claimText.slice(cursor), bold: false });
  return segments.filter((segment) => segment.text.length > 0);
}

export function findMetricOutcomeBoldIssues(content, sourceLibrary) {
  const issues = [];
  for (const role of content.resume?.roles ?? []) {
    for (const claimId of role.claims ?? []) {
      const claim = sourceLibrary.claimById.get(claimId);
      if (!claim || (claim.metric_ids ?? []).length === 0) continue;
      const spans = metricOutcomeSpans(claim.text, claim.metric_ids, sourceLibrary);
      const matchedMetricIds = new Set(spans.map((span) => span.metric_id));
      for (const metricId of claim.metric_ids ?? []) {
        if (!matchedMetricIds.has(metricId)) {
          issues.push({
            role_id: role.role_id,
            employer: role.employer,
            claim_id: claim.id,
            metric_id: metricId,
            reason: "No matching metric/outcome phrase found to bold",
            text: claim.text
          });
        }
      }
      if (spans.length > 0 && spans.some((span) => span.start === 0 && span.end === String(claim.text).length)) {
        issues.push({
          role_id: role.role_id,
          employer: role.employer,
          claim_id: claim.id,
          metric_id: spans.find((span) => span.start === 0 && span.end === String(claim.text).length)?.metric_id,
          reason: "Metric/outcome bold span covers the entire bullet",
          text: claim.text
        });
      }
    }
  }
  return issues;
}

export function formatMetricOutcomeBoldIssues(issues, limit = 5) {
  const shown = issues.slice(0, limit).map((issue) => (
    `${issue.employer}: ${issue.reason} (${issue.claim_id}, ${issue.metric_id}) [${String(issue.text).slice(0, 120)}]`
  ));
  const more = issues.length > limit ? `; +${issues.length - limit} more` : "";
  return `${shown.join("; ")}${more}`;
}

function findMetricSpan(text, metric) {
  const candidates = metricCandidates(metric);
  for (const candidate of candidates) {
    const match = findCaseInsensitive(text, candidate);
    if (match) return match;
  }
  return null;
}

function metricCandidates(metric) {
  return [
    ...(metric.allowed_phrases ?? []),
    metric.label,
    metric.description
  ]
    .map((candidate) => String(candidate ?? "").trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
}

function findCaseInsensitive(text, phrase) {
  const lowerText = String(text ?? "").toLowerCase();
  const lowerPhrase = String(phrase ?? "").toLowerCase();
  if (!lowerPhrase) return null;
  const start = lowerText.indexOf(lowerPhrase);
  if (start < 0) return null;
  return { start, end: start + String(phrase).length };
}

function mergeSpans(spans) {
  const sorted = [...spans]
    .filter((span) => Number.isInteger(span.start) && Number.isInteger(span.end) && span.end > span.start)
    .sort((a, b) => a.start - b.start || b.end - a.end);
  const out = [];
  for (const span of sorted) {
    const previous = out[out.length - 1];
    if (!previous || span.start >= previous.end) {
      out.push(span);
      continue;
    }
    if ((span.end - span.start) > (previous.end - previous.start)) {
      out[out.length - 1] = span;
    }
  }
  return out.sort((a, b) => a.start - b.start);
}
