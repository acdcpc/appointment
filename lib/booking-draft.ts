/**
 * Booking draft persistence — friction fix for parents who leave the booking
 * flow (browser/hardware back, a tab switch, an incoming call, or the OS
 * killing a backgrounded app) and return. Selections are kept so nothing has
 * to be re-entered. Cleared only after a successful booking.
 *
 * Web: localStorage. Native: AsyncStorage (already an Expo dependency) with a
 * synchronous in-memory cache so existing call sites stay synchronous; the
 * native read is kicked off at module load, which covers the app-kill case.
 */
export type BookingDraft = {
  service?: string;
  date?: string;
  time?: string;
  reason?: string;
  compactPreview?: boolean;
};

export const BOOKING_DRAFT_KEY = "rb.booking.v1";
const isNativeRuntime = typeof navigator !== "undefined" && navigator.product === "ReactNative";
let memoryDraft: BookingDraft | null = null;
let nativeStore: { getItem: (key: string) => Promise<string | null>; setItem: (key: string, value: string) => Promise<void>; removeItem: (key: string) => Promise<void> } | null = null;

async function getNativeStore() {
  if (!isNativeRuntime) return null;
  if (nativeStore) return nativeStore;
  try {
    const mod = await import("@react-native-async-storage/async-storage");
    nativeStore = (mod.default ?? mod) as unknown as typeof nativeStore;
  } catch {
    nativeStore = null;
  }
  return nativeStore;
}

async function hydrateFromNative() {
  const store = await getNativeStore();
  if (!store) return;
  try {
    const raw = await store.getItem(BOOKING_DRAFT_KEY);
    if (raw) memoryDraft = JSON.parse(raw) as BookingDraft;
  } catch { /* ignore storage errors */ }
}

async function persistToNative(draft: BookingDraft | null) {
  const store = await getNativeStore();
  if (!store) return;
  try {
    if (draft) await store.setItem(BOOKING_DRAFT_KEY, JSON.stringify(draft));
    else await store.removeItem(BOOKING_DRAFT_KEY);
  } catch { /* ignore storage errors */ }
}

// Restore any surviving native draft as soon as the module loads (covers the
// OS-killed-while-backgrounded case before the parent reopens Booking).
if (isNativeRuntime) void hydrateFromNative();

export function loadBookingDraft(): BookingDraft | null {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const raw = window.localStorage.getItem(BOOKING_DRAFT_KEY);
      return raw ? (JSON.parse(raw) as BookingDraft) : null;
    }
  } catch { /* ignore storage errors */ }
  return memoryDraft;
}

export function saveBookingDraft(draft: BookingDraft) {
  memoryDraft = draft;
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(BOOKING_DRAFT_KEY, JSON.stringify(draft));
    }
  } catch { /* ignore storage errors */ }
  if (isNativeRuntime) void persistToNative(draft);
}

export function clearBookingDraft() {
  memoryDraft = null;
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.removeItem(BOOKING_DRAFT_KEY);
    }
  } catch { /* ignore storage errors */ }
  if (isNativeRuntime) void persistToNative(null);
}
