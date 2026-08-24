export function maintenanceCountdownLabel(estimatedCompletionAt: string | null | undefined, now = Date.now()) {
  if (!estimatedCompletionAt) return null;
  const target = Date.parse(estimatedCompletionAt);
  if (!Number.isFinite(target)) return null;
  const remainingMinutes = Math.ceil((target - now) / 60_000);
  if (remainingMinutes <= 0) return "Estimated completion time has passed; maintenance remains active until the super-admin changes it.";
  const hours = Math.floor(remainingMinutes / 60);
  const minutes = remainingMinutes % 60;
  return hours ? `Estimated time remaining: ${hours}h ${minutes}m.` : `Estimated time remaining: ${minutes}m.`;
}

export function normalizeMaintenanceCountdownEndpoint(value: string) {
  const parsed = Date.parse(value.trim());
  if (!Number.isFinite(parsed) || parsed <= Date.now()) return null;
  return new Date(parsed).toISOString();
}
