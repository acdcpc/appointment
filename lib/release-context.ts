export function safeReleaseNotes(value: unknown) {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
  return normalized ? normalized.slice(0, 500) : "No deployment notes were configured for this build.";
}

export function safeAppVersion(value: unknown) {
  const normalized = String(value ?? "").trim();
  return normalized && normalized.length <= 60 ? normalized : "Version unavailable";
}
