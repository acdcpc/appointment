export type AppEnvironment = "live" | "staging" | "local";

export function resolveAppEnvironment(value: unknown): AppEnvironment {
  const normalized = String(value ?? "staging").trim().toLowerCase();
  if (normalized === "production" || normalized === "live") return "live";
  if (normalized === "staging") return "staging";
  return "local";
}

export function environmentLabel(value: unknown) {
  const environment = resolveAppEnvironment(value);
  return environment === "live" ? "Live environment" : environment === "staging" ? "Staging" : "Local";
}
