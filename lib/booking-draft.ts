/**
 * Booking draft persistence — friction fix for parents who leave the booking
 * flow (browser/hardware back, a tab switch, an incoming call) and return.
 * Selections are kept so nothing has to be re-entered. Cleared only after a
 * successful booking or when the parent starts over.
 */
export type BookingDraft = {
  service?: string;
  date?: string;
  time?: string;
  reason?: string;
  compactPreview?: boolean;
};

const KEY = "rainbow-booking-draft";
let memoryDraft: BookingDraft | null = null;

export function loadBookingDraft(): BookingDraft | null {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const raw = window.localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as BookingDraft) : null;
    }
  } catch { /* ignore storage errors */ }
  return memoryDraft;
}

export function saveBookingDraft(draft: BookingDraft) {
  memoryDraft = draft;
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(KEY, JSON.stringify(draft));
    }
  } catch { /* ignore storage errors */ }
}

export function clearBookingDraft() {
  memoryDraft = null;
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.removeItem(KEY);
    }
  } catch { /* ignore storage errors */ }
}
