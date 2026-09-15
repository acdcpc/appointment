import { beforeEach, describe, expect, it, vi } from "vitest";

/** Minimal localStorage stand-in so the web branch is exercised in node. */
function installWebStorage() {
  const store = new Map<string, string>();
  (globalThis as unknown as { window: unknown }).window = {
    localStorage: {
      getItem: (k: string) => (store.has(k) ? (store.get(k) as string) : null),
      setItem: (k: string, v: string) => { store.set(k, v); },
      removeItem: (k: string) => { store.delete(k); },
    },
  };
  return store;
}

describe("booking draft persistence", () => {
  beforeEach(() => {
    installWebStorage();
  });

  it("keeps a parent's selections when they leave and come back", async () => {
    const draft = await import("../lib/booking-draft");
    draft.saveBookingDraft({ service: "Developmental assessment", date: "2026-09-16", time: "09:30", reason: "sleep concerns" });
    const restored = draft.loadBookingDraft();
    expect(restored?.service).toBe("Developmental assessment");
    expect(restored?.date).toBe("2026-09-16");
    expect(restored?.time).toBe("09:30");
    expect(restored?.reason).toBe("sleep concerns");
  });

  it("clears the draft once the booking is confirmed, so the next visit starts fresh", async () => {
    const draft = await import("../lib/booking-draft");
    draft.saveBookingDraft({ service: "Vision screen", date: "2026-09-17", time: "10:00" });
    draft.clearBookingDraft();
    expect(draft.loadBookingDraft()).toBeNull();
  });

  it("still serves the synchronous API on a native runtime (AsyncStorage is async)", async () => {
    vi.resetModules();
    Object.defineProperty(globalThis, "navigator", { value: { product: "ReactNative" }, configurable: true });
    delete (globalThis as unknown as { window?: unknown }).window;
    const draft = await import("../lib/booking-draft");
    expect(() => draft.saveBookingDraft({ service: "Nutrition review" })).not.toThrow();
    expect(draft.loadBookingDraft()?.service).toBe("Nutrition review");
    expect(() => draft.clearBookingDraft()).not.toThrow();
  });

  it("survives a malformed stored value instead of crashing the booking flow", async () => {
    const store = installWebStorage();
    const { BOOKING_DRAFT_KEY } = await import("../lib/booking-draft");
    store.set(BOOKING_DRAFT_KEY, "{not valid json");
    const draft = await import("../lib/booking-draft");
    expect(draft.loadBookingDraft()).toBeNull();
  });
});
