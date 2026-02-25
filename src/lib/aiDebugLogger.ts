type AiDebugLogEntry = {
  action: string;
  input?: unknown;
  output?: unknown;
  error?: unknown;
  durationMs?: number;
};

const AI_DEBUG_ENDPOINT = "/__ai-debug-log";

function truncate(value: string, max = 8000): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

function sanitize(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return truncate(value.trim());
  return truncate(JSON.stringify(value));
}

export async function logAiDebug(entry: AiDebugLogEntry): Promise<void> {
  if (!import.meta.env.DEV) return;

  const payload: AiDebugLogEntry = {
    action: entry.action,
    input: sanitize(entry.input),
    output: sanitize(entry.output),
    error: sanitize(entry.error),
    durationMs: entry.durationMs,
  };

  try {
    await fetch(AI_DEBUG_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    // Intentionally swallow logging errors so debug instrumentation never affects UX.
  }
}
