import { createContext, type ReactNode, useContext, useMemo, useState } from "react";

export type ChildProfile = {
  id: string;
  name: string;
  dateOfBirth: string;
  allergies: string;
  parentName: string;
};

export type AppointmentStatus = "confirmed" | "needs-intake" | "completed";

export type PediatricAppointment = {
  id: string;
  childId: string;
  service: string;
  date: string;
  time: string;
  reason: string;
  status: AppointmentStatus;
};

export type PrescriptionRecord = {
  id: string;
  childId: string;
  appointmentId: string;
  issuedOn: string;
  medication: string;
  instructions: string;
  status: "active" | "completed";
};

export type MedicalHistoryEntry = {
  id: string;
  childId: string;
  category: "Allergy" | "Development" | "Visit" | "Immunization";
  title: string;
  occurredOn: string;
  note: string;
};

type BookingInput = Pick<PediatricAppointment, "childId" | "service" | "date" | "time" | "reason">;

type PediatricCareContextValue = {
  children: ChildProfile[];
  activeChild: ChildProfile;
  appointments: PediatricAppointment[];
  prescriptions: PrescriptionRecord[];
  history: MedicalHistoryEntry[];
  bookAppointment: (input: BookingInput) => { ok: true; appointment: PediatricAppointment } | { ok: false; message: string };
  rescheduleAppointment: (appointmentId: string, date: string, time: string) => { ok: true } | { ok: false; message: string };
};

const children: ChildProfile[] = [
  { id: "child-1", name: "Aarav Smith", dateOfBirth: "14 May 2021", allergies: "No known drug allergies reported", parentName: "Jordan Smith" },
];

const initialAppointments: PediatricAppointment[] = [
  { id: "apt-1", childId: "child-1", service: "Pediatric consultation", date: "Tue, Aug 20", time: "3:30 PM", reason: "Well-child follow-up", status: "confirmed" },
  { id: "apt-2", childId: "child-1", service: "Child development review", date: "Fri, Aug 30", time: "10:00 AM", reason: "Developmental milestone discussion", status: "needs-intake" },
];

const prescriptions: PrescriptionRecord[] = [
  { id: "rx-1", childId: "child-1", appointmentId: "apt-1", issuedOn: "12 Aug 2026", medication: "Clinician-issued prescription", instructions: "Review the complete directions supplied by Dr. Ojha before giving any medicine.", status: "active" },
];

const history: MedicalHistoryEntry[] = [
  { id: "history-1", childId: "child-1", category: "Allergy", title: "Allergy record", occurredOn: "12 Aug 2026", note: "No known drug allergies reported by parent." },
  { id: "history-2", childId: "child-1", category: "Development", title: "Development review requested", occurredOn: "05 Aug 2026", note: "Parent requested a review of developmental milestones at the next visit." },
  { id: "history-3", childId: "child-1", category: "Visit", title: "Pediatric follow-up", occurredOn: "20 Jul 2026", note: "Visit summary available in the clinical record." },
];

const PediatricCareContext = createContext<PediatricCareContextValue | null>(null);

export function PediatricCareProvider({ children: content }: { children: ReactNode }) {
  const [appointments, setAppointments] = useState<PediatricAppointment[]>(initialAppointments);

  const value = useMemo<PediatricCareContextValue>(() => ({
    children,
    activeChild: children[0],
    appointments,
    prescriptions,
    history,
    bookAppointment: (input) => {
      const unavailable = appointments.some((appointment) => appointment.date === input.date && appointment.time === input.time && appointment.status !== "completed");
      if (unavailable) return { ok: false, message: "That time has just been reserved. Please choose another available slot." };
      const appointment: PediatricAppointment = { id: `apt-${Date.now()}`, ...input, status: "needs-intake" };
      setAppointments((current) => [appointment, ...current]);
      return { ok: true, appointment };
    },
    rescheduleAppointment: (appointmentId, date, time) => {
      const unavailable = appointments.some((appointment) => appointment.id !== appointmentId && appointment.date === date && appointment.time === time && appointment.status !== "completed");
      if (unavailable) return { ok: false, message: "That time is no longer available. Please choose another slot." };
      setAppointments((current) => current.map((appointment) => appointment.id === appointmentId ? { ...appointment, date, time, status: "confirmed" } : appointment));
      return { ok: true };
    },
  }), [appointments]);

  return <PediatricCareContext.Provider value={value}>{content}</PediatricCareContext.Provider>;
}

export function usePediatricCare() {
  const context = useContext(PediatricCareContext);
  if (!context) throw new Error("usePediatricCare must be used within PediatricCareProvider");
  return context;
}
