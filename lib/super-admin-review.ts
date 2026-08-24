export type AccessReviewStatus = { kind: "overdue" | "due-soon" | "scheduled" | "never-reviewed"; dueAt: Date | null; daysUntilDue: number | null };

export function getAccessReviewStatus(lastAccessReviewAt: string | null, intervalDays: number, now = new Date()): AccessReviewStatus {
  if (!lastAccessReviewAt) return { kind: "never-reviewed", dueAt: null, daysUntilDue: null };
  const reviewedAt = new Date(lastAccessReviewAt); if (!Number.isFinite(reviewedAt.getTime())) return { kind: "never-reviewed", dueAt: null, daysUntilDue: null };
  const dueAt = new Date(reviewedAt.getTime() + intervalDays * 86400000); const daysUntilDue = Math.ceil((dueAt.getTime() - now.getTime()) / 86400000);
  if (daysUntilDue < 0) return { kind: "overdue", dueAt, daysUntilDue };
  if (daysUntilDue <= 14) return { kind: "due-soon", dueAt, daysUntilDue };
  return { kind: "scheduled", dueAt, daysUntilDue };
}
