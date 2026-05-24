import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { readJson } from "../lib/files.js";
import { packagePaths } from "../lib/package.js";

export async function generatePdfs(packageDir) {
  const content = await readJson(path.join(packageDir, "approved-content.json"));
  const paths = packagePaths(packageDir, content);
  const browser = await chromium.launch({ headless: true });
  try {
    await printHtml(browser, paths.indexHtml, paths.websitePdf);
    await printHtml(browser, paths.atsHtml, paths.atsPdf);
    await printHtml(browser, paths.coverHtml, paths.coverPdf);
  } finally {
    await browser.close();
  }
  return paths;
}

async function printHtml(browser, htmlPath, pdfPath) {
  const page = await browser.newPage();
  try {
    await page.goto(pathToFileURL(path.resolve(htmlPath)).href, { waitUntil: "networkidle" });
    await page.emulateMedia({ media: "print" });
    await page.pdf({
      path: pdfPath,
      printBackground: true,
      preferCSSPageSize: true,
      tagged: true
    });
  } finally {
    await page.close();
  }
}
