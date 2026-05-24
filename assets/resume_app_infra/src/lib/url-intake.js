import { slugify } from "./strings.js";
import { chromium } from "playwright";

const GENERIC_SITE_NAMES = new Set([
  "greenhouse",
  "greenhouse.io",
  "lever",
  "jobs.lever.co",
  "linkedin",
  "indeed",
  "workday",
  "ashby",
  "jobvite",
  "smartrecruiters",
  "bamboohr"
]);

export async function fetchJobPosting(url) {
  const parsedUrl = new URL(url);
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("Job URL must start with http:// or https://.");
  }

  const firstFetch = await fetchJobHtml(parsedUrl.href);
  let posting = parsePostingHtml(parsedUrl, firstFetch.html, firstFetch.warning);
  if (posting.extraction_warning && firstFetch.source === "direct") {
    try {
      const renderedHtml = await fetchRenderedHtml(parsedUrl.href);
      const renderedPosting = parsePostingHtml(
        parsedUrl,
        renderedHtml,
        "Direct URL text looked incomplete; recovered with browser rendering."
      );
      if (!renderedPosting.extraction_warning || renderedPosting.job_description.length > posting.job_description.length) {
        posting = renderedPosting;
      }
    } catch {
      // Keep the direct-fetch result and its warning.
    }
  }
  return posting;
}

function parsePostingHtml(parsedUrl, html, fetchWarning = "") {
  const jsonLd = extractJsonLdJobPosting(html);
  const title = cleanText(jsonLd?.title || extractTagText(html, "title") || "");
  const h1 = cleanText(extractTagText(html, "h1") || "");
  const siteName = cleanText(extractMeta(html, "og:site_name") || extractMeta(html, "application-name") || "");
  const ogTitle = cleanText(extractMeta(html, "og:title") || "");

  const company = cleanText(
    jsonLd?.hiringOrganization?.name ||
    inferCompany({ siteName, title, ogTitle, h1, parsedUrl })
  );
  const role = cleanText(
    jsonLd?.title ||
    inferRole({ title, ogTitle, h1, company })
  );

  const visibleText = htmlToReadableText(html);
  const structuredDescription = jsonLd?.description ? htmlToReadableText(jsonLd.description) : "";
  const metaDescription = extractMeta(html, "description");
  const readableText = chooseReadableText({ visibleText, structuredDescription, metaDescription });
  const jobDescription = [
    `Source URL: ${parsedUrl.href}`,
    company ? `Inferred company: ${company}` : "",
    role ? `Inferred role: ${role}` : "",
    "",
    readableText
  ].filter((line) => line !== "").join("\n");

  return {
    url: parsedUrl.href,
    company,
    role,
    slug: slugify(company || role || parsedUrl.hostname.replace(/^www\./, "")),
    title,
    site_name: siteName,
    fetch_warning: fetchWarning,
    extraction_warning: extractionWarning(readableText),
    job_description: jobDescription
  };
}

async function fetchJobHtml(url) {
  try {
    const response = await fetch(url, {
      headers: {
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.7",
        "accept-language": "en-US,en;q=0.9",
        "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
      }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return { html: await response.text(), warning: "", source: "direct" };
  } catch (fetchError) {
    try {
      return {
        html: await fetchRenderedHtml(url),
        warning: `Direct URL fetch failed (${fetchError.message}); recovered with browser rendering.`,
        source: "browser"
      };
    } catch (browserError) {
      throw new Error(`Could not fetch job URL. Direct fetch failed (${fetchError.message}); browser fallback failed (${browserError.message}).`);
    }
  }
}

async function fetchRenderedHtml(url) {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
    return await page.content();
  } finally {
    await browser.close();
  }
}

function extractJsonLdJobPosting(html) {
  const scripts = html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const match of scripts) {
    try {
      const parsed = JSON.parse(decodeHtml(match[1].trim()));
      const candidates = Array.isArray(parsed) ? parsed : [parsed, ...(parsed["@graph"] ?? [])];
      const job = candidates.find((item) => {
        const type = item?.["@type"];
        return type === "JobPosting" || (Array.isArray(type) && type.includes("JobPosting"));
      });
      if (job) return job;
    } catch {
      // Ignore malformed JSON-LD and fall back to visible page extraction.
    }
  }
  return null;
}

function extractTagText(html, tag) {
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  return html.match(re)?.[1] ?? "";
}

function extractMeta(html, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta\\b[^>]*(?:property|name)=["']${escaped}["'][^>]*content=["']([^"']*)["'][^>]*>`, "i"),
    new RegExp(`<meta\\b[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${escaped}["'][^>]*>`, "i")
  ];
  for (const pattern of patterns) {
    const value = html.match(pattern)?.[1];
    if (value) return decodeHtml(value);
  }
  return "";
}

function inferCompany({ siteName, title, ogTitle, h1, parsedUrl }) {
  if (siteName && !GENERIC_SITE_NAMES.has(siteName.toLowerCase())) return siteName;
  const text = ogTitle || title || h1;
  const atMatch = text.match(/\bat\s+([^|,\-–—]+)/i);
  if (atMatch) return atMatch[1].trim();
  const pipeParts = text.split("|").map((part) => part.trim()).filter(Boolean);
  const lastPart = pipeParts.at(-1);
  if (lastPart && !GENERIC_SITE_NAMES.has(lastPart.toLowerCase())) return lastPart;
  const hostParts = parsedUrl.hostname.replace(/^www\./, "").split(".");
  return hostParts.length > 2 ? hostParts.at(-3) : hostParts[0];
}

function inferRole({ title, ogTitle, h1, company }) {
  const text = h1 || ogTitle || title;
  if (!text) return "";
  let role = text;
  if (company) {
    role = role.replace(new RegExp(`\\bat\\s+${escapeRegex(company)}\\b`, "i"), "");
    role = role.replace(new RegExp(`\\|\\s*${escapeRegex(company)}\\s*$`, "i"), "");
    role = role.replace(new RegExp(`${escapeRegex(company)}\\s*[-|:]\\s*`, "i"), "");
  }
  role = role.replace(/\s*[-|]\s*(careers|jobs|greenhouse|lever|ashby).*$/i, "");
  return role.trim();
}

function htmlToReadableText(html) {
  const withoutNoise = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<head[\s\S]*?<\/head>/gi, " ")
    .replace(/<(br|p|div|li|ul|ol|section|article|h[1-6])\b[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ");

  const lines = decodeHtml(withoutNoise)
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => cleanText(line))
    .filter(Boolean)
    .filter((line) => !/^(accept|reject|cookie preferences|privacy policy|terms of use)$/i.test(line));

  return [...new Set(lines)].join("\n");
}

function chooseReadableText({ visibleText, structuredDescription, metaDescription }) {
  const candidates = [structuredDescription, visibleText, metaDescription]
    .map((value) => cleanReadableBlock(value))
    .filter(Boolean);
  candidates.sort((a, b) => b.length - a.length);
  return candidates[0] || "";
}

function cleanReadableBlock(text) {
  const lines = String(text ?? "")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => cleanText(line))
    .filter(Boolean);
  return [...new Set(lines)].join("\n");
}

function extractionWarning(text) {
  const lower = text.toLowerCase();
  const warnings = [];
  if (lower.includes("sign in") && lower.includes("password")) {
    warnings.push("The fetched page may be login-gated. Paste the job description manually if the extracted text is incomplete.");
  }
  if (text.length < 600) {
    warnings.push("The extracted page text is short. Check job-description.txt before analyzing.");
  }
  return warnings.join(" ");
}

function cleanText(value) {
  return decodeHtml(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtml(value) {
  return String(value ?? "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)));
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
