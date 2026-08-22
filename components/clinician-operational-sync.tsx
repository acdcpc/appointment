import { useEffect, useRef } from "react";

import { useAuth } from "@/hooks/use-auth";
import { type EarlierSlotRequest, usePediatricCare } from "@/lib/pediatric-care";
import { trpc } from "@/lib/trpc";

function buildOperationalEvents(requests: EarlierSlotRequest[]) {
  return requests.flatMap((request) => {
    const events: { eventId: string; requestId: string; eventType: "requested" | "offer-created" | "parent-response" | "converted" | "assignment-changed" | "response-acknowledged"; actor: "clinician" | "guardian"; occurredAt: Date; status: EarlierSlotRequest["status"] }[] = [{ eventId: `${request.id}-requested`, requestId: request.id, eventType: "requested", actor: "guardian", occurredAt: new Date(request.requestedAt), status: request.status }];
    if (request.offer?.offeredAt) events.push({ eventId: `${request.id}-offer-created`, requestId: request.id, eventType: "offer-created", actor: "clinician", occurredAt: new Date(request.offer.offeredAt), status: request.status });
    if (request.offer?.respondedAt) events.push({ eventId: `${request.id}-parent-response`, requestId: request.id, eventType: "parent-response", actor: "guardian", occurredAt: new Date(request.offer.respondedAt), status: request.status });
    if (request.offer?.convertedAt) events.push({ eventId: `${request.id}-converted`, requestId: request.id, eventType: "converted", actor: "clinician", occurredAt: new Date(request.offer.convertedAt), status: request.status });
    if (request.assignedAt) events.push({ eventId: `${request.id}-assignment`, requestId: request.id, eventType: "assignment-changed", actor: "clinician", occurredAt: new Date(request.assignedAt), status: request.status });
    if (request.offer?.clinicianAcknowledgedAt) events.push({ eventId: `${request.id}-response-acknowledged`, requestId: request.id, eventType: "response-acknowledged", actor: "clinician", occurredAt: new Date(request.offer.clinicianAcknowledgedAt), status: request.status });
    return events.filter((event) => Number.isFinite(event.occurredAt.getTime()));
  });
}

export function ClinicianOperationalSync() {
  const { isAuthenticated } = useAuth();
  const { earlierSlotRequests, staffMembers, replaceEarlierSlotRequests, applyStaffCapacitySnapshots } = usePediatricCare();
  const state = trpc.clinician.getDurableWaitlistState.useQuery(undefined, { enabled: isAuthenticated, retry: false });
  const save = trpc.clinician.saveDurableWaitlistState.useMutation();
  const hydrated = useRef(false);

  useEffect(() => {
    if (!state.data || hydrated.current) return;
    const persisted = state.data.requests.map((item) => ({ id: item.requestId, appointmentId: item.appointmentId, childId: item.childId, requestedAt: item.requestedAt, status: item.status, note: item.note ?? undefined, offer: item.offerDate && item.offerTime && item.offeredAt && item.offerExpiresAt ? { date: item.offerDate, time: item.offerTime, offeredAt: item.offeredAt, expiresAt: item.offerExpiresAt, parentResponse: item.parentResponse ?? undefined, respondedAt: item.respondedAt ?? undefined, clinicianAcknowledgedAt: item.clinicianAcknowledgedAt ?? undefined, convertedAt: item.convertedAt ?? undefined, convertedBy: item.convertedBy ?? undefined } : undefined, assignedStaffId: item.assignedStaffId ?? undefined, assignedAt: item.assignedAt ?? undefined } satisfies EarlierSlotRequest));
    replaceEarlierSlotRequests(persisted);
    const latest = new Map<string, { effectiveAt: string; triageCapacity: number }>();
    state.data.capacitySnapshots.forEach((snapshot) => { const previous = latest.get(snapshot.staffId); if (!previous || Date.parse(snapshot.effectiveAt) > Date.parse(previous.effectiveAt)) latest.set(snapshot.staffId, { effectiveAt: snapshot.effectiveAt, triageCapacity: snapshot.triageCapacity }); });
    applyStaffCapacitySnapshots([...latest.entries()].map(([staffId, snapshot]) => ({ staffId, triageCapacity: snapshot.triageCapacity })));
    hydrated.current = true;
  }, [applyStaffCapacitySnapshots, replaceEarlierSlotRequests, state.data]);

  useEffect(() => {
    if (!hydrated.current || save.isPending) return;
    const requests = earlierSlotRequests.map((item) => ({ requestId: item.id, appointmentId: item.appointmentId, childId: item.childId, requestedAt: new Date(item.requestedAt), status: item.status, note: item.note, offerDate: item.offer?.date, offerTime: item.offer?.time, offeredAt: item.offer?.offeredAt ? new Date(item.offer.offeredAt) : undefined, offerExpiresAt: item.offer?.expiresAt ? new Date(item.offer.expiresAt) : undefined, parentResponse: item.offer?.parentResponse, respondedAt: item.offer?.respondedAt ? new Date(item.offer.respondedAt) : undefined, clinicianAcknowledgedAt: item.offer?.clinicianAcknowledgedAt ? new Date(item.offer.clinicianAcknowledgedAt) : undefined, convertedAt: item.offer?.convertedAt ? new Date(item.offer.convertedAt) : undefined, convertedBy: item.offer?.convertedBy, assignedStaffId: item.assignedStaffId, assignedAt: item.assignedAt ? new Date(item.assignedAt) : undefined }));
    const now = new Date(); const snapshots = staffMembers.filter((staff) => staff.triageCapacity).map((staff) => ({ snapshotId: `capacity-${staff.id}-${staff.triageCapacityUpdatedAt ?? "baseline"}`, staffId: staff.id, staffName: staff.name, triageCapacity: staff.triageCapacity ?? 10, effectiveAt: new Date(staff.triageCapacityUpdatedAt ?? now) }));
    save.mutate({ requests, events: buildOperationalEvents(earlierSlotRequests), snapshots });
  }, [earlierSlotRequests, save, staffMembers]);
  return null;
}
