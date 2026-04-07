export function buildShareSafeDiagnostics(input: unknown): unknown {
  return redactNode(input, []);
}

function redactNode(value: unknown, path: string[]): unknown {
  if (Array.isArray(value)) {
    if (path[path.length - 1] === "allowlist") {
      return [`<redacted:${value.length}-hosts>`];
    }
    return value.map((item) => redactNode(item, path));
  }
  if (value && typeof value === "object") {
    const next: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      next[key] = redactNode(nested, [...path, key]);
    }
    return next;
  }
  if (typeof value !== "string") {
    return value;
  }

  const key = path[path.length - 1] ?? "";
  if (key.toLowerCase().includes("url")) {
    return "<redacted-url>";
  }
  if (key.toLowerCase().includes("host") || key.toLowerCase().includes("domain")) {
    return "<redacted-host>";
  }

  if (/^https?:\/\//i.test(value)) {
    return "<redacted-url>";
  }
  if (/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(value)) {
    return "<redacted-host>";
  }
  return value;
}
