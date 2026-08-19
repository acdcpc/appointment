import type { Request, Response } from "express";

import * as db from "./db";
import { notifyOwner } from "./_core/notification";
import { sdk } from "./_core/sdk";

export async function handleReferralDeliveryMonitor(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
    const monitor = await db.getReferralDeliveryMonitorByTaskUid(user.taskUid);
    if (!monitor) return res.json({ ok: true, skipped: "orphan" });
    const result = await db.findAndMarkOverdueReferralDeliveryFailures();
    let delivered = 0;
    for (const event of result.alerted) {
      const accepted = await notifyOwner({ title: "Unresolved referral delivery", content: `Referral email for child record ${event.childId} remains ${event.deliveryStatus} more than ${result.thresholdHours} hours after the recorded attempt. Review the protected clinician audit log before taking further action.` });
      if (accepted) delivered += 1;
      else await db.releaseReferralDeliveryFailureAlert(event.id);
    }
    return res.json({ ok: true, thresholdHours: result.thresholdHours, candidates: result.alerted.length, delivered });
  } catch (error) {
    return res.status(500).json({ error: "referral-delivery-monitor-failed", detail: String(error), timestamp: new Date().toISOString() });
  }
}
