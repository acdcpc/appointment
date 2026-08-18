import { createContext, type ReactNode, useContext, useMemo, useState } from "react";

export type ChildProfile = { id: string; name: string; dateOfBirth: string; allergies: string; parentName: string };
export type AppointmentStatus = "confirmed" | "needs-intake" | "completed";
export type PediatricAppointment = { id: string; childId: string; service: string; date: string; time: string; durationMinutes: number; reason: string; status: AppointmentStatus };
export type PrescriptionRecord = { id: string; childId: string; appointmentId: string; issuedOn: string; medication: string; instructions: string; status: "active" | "completed" };
export type MedicalHistoryEntry = { id: string; childId: string; category: "Allergy" | "Development" | "Visit" | "Immunization"; title: string; occurredOn: string; note: string };
export type ClinicOperatingHour = { weekday: "Mon" | "Tue" | "Wed" | "Thu" | "Fri"; label: string; start: string; end: string; isOpen: boolean };
export type ServiceConfig = { name: string; durationMinutes: number };

type BookingInput = Pick<PediatricAppointment, "childId" | "service" | "date" | "time" | "reason">;
type PrescriptionInput = Pick<PrescriptionRecord, "childId" | "appointmentId" | "medication" | "instructions">;
type Result = { ok: true } | { ok: false; message: string };

type PediatricCareContextValue = {
  children: ChildProfile[];
  activeChild: ChildProfile;
  appointments: PediatricAppointment[];
  prescriptions: PrescriptionRecord[];
  history: MedicalHistoryEntry[];
  clinicHours: ClinicOperatingHour[];
  services: ServiceConfig[];
  getAvailableSlots: (date: string, service: string, omitAppointmentId?: string) => string[];
  bookAppointment: (input: BookingInput) => Result;
  rescheduleAppointment: (appointmentId: string, date: string, time: string) => Result;
  updateClinicHour: (weekday: ClinicOperatingHour["weekday"], changes: Partial<ClinicOperatingHour>) => void;
  updateServiceDuration: (service: string, durationMinutes: number) => void;
  writePrescription: (input: PrescriptionInput) => Result;
};

const children: ChildProfile[] = [{ id: "child-1", name: "Aarav Smith", dateOfBirth: "14 May 2021", allergies: "No known drug allergies reported", parentName: "Jordan Smith" }];
const initialHours: ClinicOperatingHour[] = [
  { weekday: "Mon", label: "Monday", start: "09:00", end: "17:00", isOpen: true },
  { weekday: "Tue", label: "Tuesday", start: "09:00", end: "17:00", isOpen: true },
  { weekday: "Wed", label: "Wednesday", start: "09:00", end: "17:00", isOpen: true },
  { weekday: "Thu", label: "Thursday", start: "09:00", end: "17:00", isOpen: true },
  { weekday: "Fri", label: "Friday", start: "09:00", end: "17:00", isOpen: true },
];
const initialServices: ServiceConfig[] = [
  { name: "Pediatric consultation", durationMinutes: 30 },
  { name: "Child development review", durationMinutes: 45 },
  { name: "Growth & wellbeing", durationMinutes: 30 },
];
const initialAppointments: PediatricAppointment[] = [
  { id: "apt-1", childId: "child-1", service: "Pediatric consultation", date: "Tue, Aug 20", time: "3:30 PM", durationMinutes: 30, reason: "Well-child follow-up", status: "confirmed" },
  { id: "apt-2", childId: "child-1", service: "Child development review", date: "Fri, Aug 30", time: "10:00 AM", durationMinutes: 45, reason: "Developmental milestone discussion", status: "needs-intake" },
];
const initialPrescriptions: PrescriptionRecord[] = [{ id: "rx-1", childId: "child-1", appointmentId: "apt-1", issuedOn: "12 Aug 2026", medication: "Clinician-issued prescription", instructions: "Review the complete directions supplied by Dr. Ojha before giving any medicine.", status: "active" }];
const history: MedicalHistoryEntry[] = [
  { id: "history-1", childId: "child-1", category: "Allergy", title: "Allergy record", occurredOn: "12 Aug 2026", note: "No known drug allergies reported by parent." },
  { id: "history-2", childId: "child-1", category: "Development", title: "Development review requested", occurredOn: "05 Aug 2026", note: "Parent requested a review of developmental milestones at the next visit." },
  { id: "history-3", childId: "child-1", category: "Visit", title: "Pediatric follow-up", occurredOn: "20 Jul 2026", note: "Visit summary available in the clinical record." },
];

const timeToMinutes = (time: string) => {
  if (time.includes(":")) {
    const twelveHour = /(AM|PM)/i.test(time);
    const [clock, suffix = ""] = time.trim().split(" ");
    const [hourString, minuteString] = clock.split(":");
    let hours = Number(hourString); const minutes = Number(minuteString);
    if (twelveHour) { if (suffix.toUpperCase() === "PM" && hours !== 12) hours += 12; if (suffix.toUpperCase() === "AM" && hours === 12) hours = 0; }
    return hours * 60 + minutes;
  }
  return 0;
};
const minutesToDisplay = (minutes: number) => { const hour = Math.floor(minutes / 60); const minute = minutes % 60; const suffix = hour >= 12 ? "PM" : "AM"; const displayHour = hour % 12 || 12; return `${displayHour}:${minute.toString().padStart(2, "0")} ${suffix}`; };
const weekdayFromDate = (date: string) => date.slice(0, 3) as ClinicOperatingHour["weekday"];
const overlap = (startA: number, endA: number, startB: number, endB: number) => startA < endB && endA > startB;

const PediatricCareContext = createContext<PediatricCareContextValue | null>(null);

export function PediatricCareProvider({ children: content }: { children: ReactNode }) {
  const [appointments, setAppointments] = useState<PediatricAppointment[]>(initialAppointments);
  const [clinicHours, setClinicHours] = useState<ClinicOperatingHour[]>(initialHours);
  const [services, setServices] = useState<ServiceConfig[]>(initialServices);
  const [prescriptions, setPrescriptions] = useState<PrescriptionRecord[]>(initialPrescriptions);

  const value = useMemo<PediatricCareContextValue>(() => {
    const durationFor = (service: string) => services.find((item) => item.name === service)?.durationMinutes ?? 30;
    const getAvailableSlots = (date: string, service: string, omitAppointmentId?: string) => {
      const day = clinicHours.find((item) => item.weekday === weekdayFromDate(date));
      if (!day?.isOpen) return [];
      const duration = durationFor(service); const start = timeToMinutes(day.start); const end = timeToMinutes(day.end); const slots: string[] = [];
      for (let candidate = start; candidate + duration <= end; candidate += 30) {
        const blocked = appointments.some((appointment) => appointment.id !== omitAppointmentId && appointment.date === date && appointment.status !== "completed" && overlap(candidate, candidate + duration, timeToMinutes(appointment.time), timeToMinutes(appointment.time) + appointment.durationMinutes));
        if (!blocked) slots.push(minutesToDisplay(candidate));
      }
      return slots;
    };
    const validateSlot = (date: string, time: string, service: string, omitAppointmentId?: string): Result => getAvailableSlots(date, service, omitAppointmentId).includes(time) ? { ok: true } : { ok: false, message: "That time is outside Dr. Ojha’s active clinic hours or no longer has enough time for this visit." };
    return {
      children, activeChild: children[0], appointments, prescriptions, history, clinicHours, services, getAvailableSlots,
      bookAppointment: (input) => { const valid = validateSlot(input.date, input.time, input.service); if (!valid.ok) return valid; const appointment: PediatricAppointment = { id: `apt-${Date.now()}`, ...input, durationMinutes: durationFor(input.service), status: "needs-intake" }; setAppointments((current) => [appointment, ...current]); return { ok: true }; },
      rescheduleAppointment: (appointmentId, date, time) => { const current = appointments.find((appointment) => appointment.id === appointmentId); if (!current) return { ok: false, message: "The appointment could not be found." }; const valid = validateSlot(date, time, current.service, appointmentId); if (!valid.ok) return valid; setAppointments((items) => items.map((appointment) => appointment.id === appointmentId ? { ...appointment, date, time, status: "confirmed" } : appointment)); return { ok: true }; },
      updateClinicHour: (weekday, changes) => setClinicHours((current) => current.map((item) => item.weekday === weekday ? { ...item, ...changes } : item)),
      updateServiceDuration: (service, durationMinutes) => setServices((current) => current.map((item) => item.name === service ? { ...item, durationMinutes } : item)),
      writePrescription: (input) => { if (!input.medication.trim() || !input.instructions.trim()) return { ok: false, message: "Add the prescription name and clinician instructions before saving." }; setPrescriptions((current) => [{ id: `rx-${Date.now()}`, ...input, issuedOn: "Today", status: "active" }, ...current]); return { ok: true }; },
    };
  }, [appointments, clinicHours, prescriptions, services]);

  return <PediatricCareContext.Provider value={value}>{content}</PediatricCareContext.Provider>;
}

export function usePediatricCare() { const context = useContext(PediatricCareContext); if (!context) throw new Error("usePediatricCare must be used within PediatricCareProvider"); return context; }
