import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { getProviderStatus, getModelCatalog, generateWithProvider, providers } from "./provider-router.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const port = Number(process.env.PORT || 8787);

type ChatBody = { message?: string; model?: string; providers?: string[] };

const sendJson = (res: ServerResponse, status: number, body: unknown) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
};

const readJson = async (req: IncomingMessage): Promise<ChatBody> => {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  if (!raw) return {};
  return JSON.parse(raw) as ChatBody;
};

const serveStatic = (req: IncomingMessage, res: ServerResponse) => {
  const requested = new URL(req.url || "/", "http://localhost").pathname;
  const relative = requested === "/" ? "index.html" : requested.replace(/^\/+/, "");
  const candidate = normalize(join(root, "dist", relative));
  const distRoot = normalize(join(root, "dist"));
  const safe = candidate === distRoot || candidate.startsWith(distRoot + "/");
  const filePath = safe && existsSync(candidate) && statSync(candidate).isFile() ? candidate : join(distRoot, "index.html");
  if (!existsSync(filePath)) return sendJson(res, 404, { error: "Frontend build not found. Run npm run build first." });

  const types: Record<string, string> = {
    ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png",
    ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".ico": "image/x-icon",
  };
  res.statusCode = 200;
  res.setHeader("Content-Type", types[extname(filePath)] || "application/octet-stream");
  createReadStream(filePath).pipe(res);
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url || "/", "http://localhost");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    return res.end();
  }

  if (url.pathname === "/api/health") {
    return sendJson(res, 200, {
      ok: true,
      service: "best-of-all-ai-api",
      providers: getProviderStatus(),
      timestamp: new Date().toISOString(),
    });
  }

  if (url.pathname === "/api/models" && req.method === "GET") {
    return sendJson(res, 200, { models: getModelCatalog() });
  }

  if (url.pathname === "/api/compare" && req.method === "POST") {
    try {
      const body = await readJson(req);
      const message = body.message?.trim();
      if (!message) return sendJson(res, 400, { error: "Message is required." });

      const requested = (body.providers || []).filter((name): name is keyof typeof providers => name in providers);
      const targets = requested.length ? requested : Object.entries(getProviderStatus()).filter(([, configured]) => configured).map(([name]) => name);
      const results = await Promise.allSettled(targets.map((provider) => generateWithProvider(message, provider)));
      return sendJson(res, 200, {
        results: results.map((result, index) => result.status === "fulfilled"
          ? result.value
          : { provider: targets[index], error: result.reason instanceof Error ? result.reason.message : "Provider request failed." }),
      });
    } catch (error) {
      return sendJson(res, 400, { error: error instanceof Error ? error.message : "Comparison failed." });
    }
  }

  if (url.pathname === "/api/chat" && req.method === "POST") {
    try {
      const body = await readJson(req);
      const message = body.message?.trim();
      if (!message) return sendJson(res, 400, { error: "Message is required." });

      const result = await generateWithProvider(message, body.model || "auto");
      return sendJson(res, 200, result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "AI request failed.";
      return sendJson(res, 502, { error: message });
    }
  }

  if (req.method === "GET") return serveStatic(req, res);
  return sendJson(res, 405, { error: "Method not allowed." });
});

server.listen(port, () => {
  console.log(`BEST OF ALL AI API listening on http://localhost:${port}`);
});
