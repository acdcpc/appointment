import type { Request, Response } from "express";

import * as db from "./db";
import { notifyOwner } from "./_core/notification";
import { sdk } from "./_core/sdk";

const formatBytes = (bytes: number) => bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

export async function handleMonthlyArchiveSummary(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
    const summary = await db.getMonthlyArchiveSummaryForTask(user.taskUid);
    if (summary.skipped) return res.json({ ok: true, skipped: summary.skipped, period: "period" in summary ? summary.period : null });
    const accepted = await notifyOwner({ title: `Monthly archive summary · ${summary.period}`, content: `${summary.archiveRuns} archive runs archived ${summary.archivedRecords} record(s) last month. Current active audit records: ${summary.activeRecords}. Estimated audit-text storage: ${formatBytes(summary.storageBytes)}. Review the protected retention settings for details.` });
    if (!accepted) return res.status(503).json({ error: "notification-unavailable", period: summary.period });
    await db.markMonthlyArchiveSummarySent(summary.policy.id, summary.period);
    return res.json({ ok: true, period: summary.period, archiveRuns: summary.archiveRuns, archivedRecords: summary.archivedRecords, activeRecords: summary.activeRecords, storageBytes: summary.storageBytes });
  } catch (error) {
    return res.status(500).json({ error: "monthly-archive-summary-failed", detail: String(error), timestamp: new Date().toISOString() });
  }
}
