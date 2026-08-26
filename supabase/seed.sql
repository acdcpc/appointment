-- Seed: initial clinic settings and governance defaults.
-- Run after 0001_init.sql (supabase db reset or manual in SQL editor).

insert into public.clinic_public_settings (
  "clinicName", address, "mapUrl", "clinicEmail", "whatsappNumber",
  "whatsappResponseNotice", "guardianReverificationDays", "isProvisional", "updatedBy"
) values (
  'Rainbow Child Development Clinic',
  'Gokul Awas Rd, Karyabinayak 44700',
  'https://www.google.com.au/search?q=Rainbow+Child+Development+Clinic',
  'rainbowclinic25@gmail.com',
  '9779765002862',
  'Messages are reviewed during clinic hours; please allow a response on the next working day.',
  180,
  false,
  'Initial clinic setup'
) on conflict do nothing;

insert into public.super_admin_governance_settings (
  "exportRetentionDays", "accessReviewIntervalDays", "updatedBy"
) values (30, 90, 'Initial governance setup')
on conflict do nothing;

-- Private storage bucket for patient documents (visit notes, prescriptions,
-- lab results). Access is managed by the app server + RLS; never public.
insert into storage.buckets (id, name, public)
values ('patient-documents', 'patient-documents', false)
on conflict (id) do nothing;

create policy "patient_documents_auth_read" on storage.objects
  for select using (bucket_id = 'patient-documents' and auth.role() = 'authenticated');

create policy "patient_documents_auth_write" on storage.objects
  for insert with check (bucket_id = 'patient-documents' and auth.role() = 'authenticated');
