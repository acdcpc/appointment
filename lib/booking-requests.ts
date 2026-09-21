/**
 * Booking details — who the visit is for.
 *
 * A parent used to book a slot with no child identification at all: name, age
 * and sex existed only in the profile tab, so the clinic could not tell who the
 * appointment was for. These are the values collected on the booking screen,
 * stored per request, shown to clinic staff, and reused as the parent's profile
 * details (editable at any time).
 */
import { getSupabase, getSupabaseSession } from "./supabase";

export type BookingDetails = {
  childName: string;
  /** Age is captured as two numbers so it is unambiguous. */
  childAgeYears: string;
  childAgeMonths: string;
  childSex: "male" | "female" | "";
  weightKg?: string | number;
  heightCm?: string | number;
  guardianPhone: string;
  guardianEmail?: string;
  note?: string;
};

export type BookingRequest = {
  id: number;
  childName: string;
  childAge: string;
  childSex: "male" | "female";
  weightKg?: number;
  heightCm?: number;
  guardianPhone: string;
  guardianEmail?: string;
  service: string;
  preferredDate: string;
  preferredTime: string;
  note?: string;
  status: "new" | "contacted" | "scheduled" | "closed";
  createdAt: string;
};

export const emptyBookingDetails: BookingDetails = {
  childName: "",
  childAgeYears: "",
  childAgeMonths: "",
  childSex: "",
  weightKg: "",
  heightCm: "",
  guardianPhone: "",
  guardianEmail: "",
  note: "",
};

const numeric = (value: string | number | undefined) => {
  if (value === undefined || value === "") return undefined;
  const parsed = typeof value === "number" ? value : Number(String(value).trim());
  return Number.isFinite(parsed) ? parsed : undefined;
};

const wholeNumber = (value: string): number | null => {
  const text = value.trim();
  if (!text) return null;
  if (!/^\d{1,3}$/.test(text)) return null;
  return Number(text);
};

/** "4 years 2 months" — singular forms handled, empty parts dropped. */
export function composeAge(years: number, months: number): string {
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} ${years === 1 ? "year" : "years"}`);
  if (months > 0) parts.push(`${months} ${months === 1 ? "month" : "months"}`);
  return parts.join(" ");
}

/** Reads a stored age back into the two inputs, e.g. "4 years 2 months". */
export function parseAgeParts(age: string): { years: string; months: string } {
  const years = /(\d{1,2})\s*year/i.exec(age);
  const months = /(\d{1,2})\s*month/i.exec(age);
  return { years: years ? years[1] : "", months: months ? months[1] : "" };
}

export function validateBookingDetails(details: BookingDetails): { ok: true } | { ok: false; message: string } {
  if (details.childName.trim().length < 2) return { ok: false, message: "Enter the child's name." };
  const years = wholeNumber(details.childAgeYears);
  const months = wholeNumber(details.childAgeMonths);
  if (details.childAgeYears.trim() && years === null) return { ok: false, message: "Age in years must be a whole number." };
  if (details.childAgeMonths.trim() && months === null) return { ok: false, message: "Age in months must be a whole number." };
  const yearCount = years ?? 0;
  const monthCount = months ?? 0;
  if (yearCount === 0 && monthCount === 0) return { ok: false, message: "Enter the child's age in years and months (a baby under one year: months only)." };
  if (yearCount > 25) return { ok: false, message: "Age in years looks too high. Enter the child's age, not the birth year." };
  if (monthCount > 11) return { ok: false, message: "Months must be between 0 and 11 — add the rest to years." };
  if (details.childSex !== "male" && details.childSex !== "female") return { ok: false, message: "Choose the child's sex." };
  const phoneDigits = details.guardianPhone.replace(/\D/g, "");
  if (phoneDigits.length < 7) return { ok: false, message: "Enter a contact number the clinic can reach you on." };
  const email = details.guardianEmail?.trim() ?? "";
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { ok: false, message: "That email address does not look right. Leave it blank if you prefer not to add one." };
  const weight = numeric(details.weightKg);
  const height = numeric(details.heightCm);
  if (details.weightKg !== undefined && details.weightKg !== "" && weight === undefined) return { ok: false, message: "Weight must be a number in kilograms." };
  if (details.heightCm !== undefined && details.heightCm !== "" && height === undefined) return { ok: false, message: "Height must be a number in centimetres." };
  if (weight !== undefined && (weight <= 0 || weight > 150)) return { ok: false, message: "Weight must be between 0 and 150 kg." };
  if (height !== undefined && (height <= 0 || height > 230)) return { ok: false, message: "Height must be between 0 and 230 cm." };
  return { ok: true };
}

const mapRow = (row: Record<string, unknown>): BookingRequest => ({
  id: Number(row.id),
  childName: String(row.child_name ?? ""),
  childAge: String(row.child_age ?? ""),
  childSex: String(row.child_sex ?? "male") === "female" ? "female" : "male",
  weightKg: row.weight_kg === null || row.weight_kg === undefined ? undefined : Number(row.weight_kg),
  heightCm: row.height_cm === null || row.height_cm === undefined ? undefined : Number(row.height_cm),
  guardianPhone: String(row.guardian_phone ?? ""),
  guardianEmail: row.guardian_email ? String(row.guardian_email) : undefined,
  service: String(row.service ?? ""),
  preferredDate: String(row.preferred_date ?? ""),
  preferredTime: String(row.preferred_time ?? ""),
  note: row.note ? String(row.note) : undefined,
  status: (String(row.status ?? "new") as BookingRequest["status"]) ?? "new",
  createdAt: String(row.created_at ?? ""),
});

export async function saveBookingRequest(input: {
  details: BookingDetails;
  service: string;
  date: string;
  time: string;
}): Promise<{ ok: boolean; message: string }> {
  const validation = validateBookingDetails(input.details);
  if (!validation.ok) return { ok: false, message: validation.message };
  try {
    const session = await getSupabaseSession();
    const client = getSupabase();
    if (!session || !client) {
      return { ok: true, message: "Saved on this device. Sign in with the clinic's email to send the details to the clinic." };
    }
    const { error } = await client.from("booking_requests").insert({
      child_name: input.details.childName.trim(),
      child_age: composeAge(Number(input.details.childAgeYears || 0), Number(input.details.childAgeMonths || 0)),
      child_sex: input.details.childSex,
      weight_kg: numeric(input.details.weightKg) ?? null,
      height_cm: numeric(input.details.heightCm) ?? null,
      guardian_phone: input.details.guardianPhone.trim(),
      guardian_email: input.details.guardianEmail?.trim() || null,
      service: input.service,
      preferred_date: input.date,
      preferred_time: input.time,
      note: input.details.note?.trim() || null,
    });
    if (error) return { ok: true, message: "Saved on this device, but the clinic record could not be updated. Check the connection." };
    return { ok: true, message: "Sent to the clinic with your child's details." };
  } catch {
    return { ok: true, message: "Saved on this device. The clinic record could not be updated." };
  }
}

export async function loadMyBookingRequests(): Promise<BookingRequest[]> {
  try {
    const session = await getSupabaseSession();
    const client = getSupabase();
    if (!session || !client) return [];
    const { data, error } = await client.from("booking_requests").select("*").order("created_at", { ascending: false }).limit(20);
    if (error || !data) return [];
    return data.map(mapRow);
  } catch {
    return [];
  }
}

export async function updateMyBookingRequest(id: number, details: BookingDetails): Promise<{ ok: boolean; message: string }> {
  const validation = validateBookingDetails(details);
  if (!validation.ok) return { ok: false, message: validation.message };
  try {
    const session = await getSupabaseSession();
    const client = getSupabase();
    if (!session || !client) return { ok: false, message: "Sign in to change details the clinic can see." };
    const { error } = await client.from("booking_requests").update({
      child_name: details.childName.trim(),
      child_age: composeAge(Number(details.childAgeYears || 0), Number(details.childAgeMonths || 0)),
      child_sex: details.childSex,
      weight_kg: numeric(details.weightKg) ?? null,
      height_cm: numeric(details.heightCm) ?? null,
      guardian_phone: details.guardianPhone.trim(),
      guardian_email: details.guardianEmail?.trim() || null,
    }).eq("id", id);
    if (error) return { ok: false, message: error.message };
    return { ok: true, message: "Details updated. The clinic sees the change." };
  } catch {
    return { ok: false, message: "Details could not be updated. Check the connection and try again." };
  }
}

/** Clinic staff: every request, newest first. */
export async function loadAllBookingRequests(): Promise<BookingRequest[]> {
  try {
    const client = getSupabase();
    if (!client) return [];
    const { data, error } = await client.from("booking_requests").select("*").order("created_at", { ascending: false }).limit(100);
    if (error || !data) return [];
    return data.map(mapRow);
  } catch {
    return [];
  }
}

export async function setBookingRequestStatus(id: number, status: BookingRequest["status"]): Promise<{ ok: boolean; message: string }> {
  try {
    const client = getSupabase();
    if (!client) return { ok: false, message: "Storage is unavailable on this build." };
    const { error } = await client.from("booking_requests").update({ status }).eq("id", id);
    if (error) return { ok: false, message: error.message };
    return { ok: true, message: `Marked as ${status}.` };
  } catch {
    return { ok: false, message: "Status could not be updated." };
  }
}
