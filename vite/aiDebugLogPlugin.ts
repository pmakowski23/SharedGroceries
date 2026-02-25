import { appendFile } from "node:fs/promises";
import { IncomingMessage, ServerResponse } from "node:http";
import { Temporal } from "@js-temporal/polyfill";
import path from "path";
import { type PluginOption, type ViteDevServer } from "vite";

type AiDebugPayload = {
  action: string;
  input?: string;
  output?: string;
  error?: string;
  durationMs?: number;
};

const AI_DEBUG_ENDPOINT = "/__ai-debug-log";

function readRequestBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Array<Buffer> = [];
    req.on("data", (chunk) =>
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)),
    );
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    req.on("error", reject);
  });
}

function escapeMarkdown(value: string): string {
  return value.replaceAll("```", "\\`\\`\\`");
}

function createDailyLogFilename(): string {
  const isoDate = Temporal.Now.plainDateISO().toString();
  return `ai-debug-${isoDate}.md`;
}

function formatDebugEntry(payload: AiDebugPayload): string {
  const lines = [
    "## AI Interaction",
    `- Time: ${Temporal.Now.instant().toString()}`,
    `- Action: ${payload.action}`,
    `- DurationMs: ${payload.durationMs ?? "n/a"}`,
    `- Status: ${payload.error ? "error" : "success"}`,
    "",
    "### Input",
    "```text",
    escapeMarkdown(payload.input ?? ""),
    "```",
    "",
    "### Output",
    "```text",
    escapeMarkdown(payload.output ?? ""),
    "```",
  ];

  if (payload.error) {
    lines.push(
      "",
      "### Error",
      "```text",
      escapeMarkdown(payload.error),
      "```",
    );
  }

  lines.push("", "---", "");
  return lines.join("\n");
}

export function aiDebugLogPlugin(): PluginOption {
  return {
    name: "ai-debug-log-middleware",
    configureServer(server: ViteDevServer) {
      server.middlewares.use(
        (
          req: IncomingMessage,
          res: ServerResponse<IncomingMessage>,
          next: () => void,
        ) => {
          if (req.method !== "POST" || req.url !== AI_DEBUG_ENDPOINT) {
            next();
            return;
          }

          void (async () => {
            try {
              const rawBody = await readRequestBody(req);
              const payload = JSON.parse(rawBody) as AiDebugPayload;
              const filePath = path.resolve(
                process.cwd(),
                createDailyLogFilename(),
              );
              await appendFile(filePath, formatDebugEntry(payload), "utf-8");
              res.statusCode = 204;
              res.end();
            } catch (error) {
              res.statusCode = 400;
              res.end(
                `Invalid AI debug payload: ${error instanceof Error ? error.message : "unknown error"}`,
              );
            }
          })();
        },
      );
    },
  };
}
