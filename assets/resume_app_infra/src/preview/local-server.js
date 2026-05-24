import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".pdf": "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
};

export async function startPreviewServer(packageDir, options = {}) {
  const port = options.port ?? 4321;
  const slug = path.basename(path.resolve(packageDir));
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://localhost:${port}`);
      let filePath;
      const root = path.resolve(packageDir);
      if (url.pathname === "/" || url.pathname === `/${slug}/`) {
        filePath = path.join(root, "index.html");
      } else if (url.pathname.startsWith(`/${slug}/`)) {
        const relativePath = decodeURIComponent(url.pathname.slice(slug.length + 2));
        filePath = path.resolve(root, relativePath);
        if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) {
          res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
          res.end("Forbidden");
          return;
        }
      } else {
        res.writeHead(302, { Location: `/${slug}/` });
        res.end();
        return;
      }

      const data = await fs.readFile(filePath);
      res.writeHead(200, { "Content-Type": MIME[path.extname(filePath)] ?? "application/octet-stream" });
      res.end(data);
    } catch {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
    }
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });

  return {
    server,
    url: `http://127.0.0.1:${port}/${slug}/`
  };
}
