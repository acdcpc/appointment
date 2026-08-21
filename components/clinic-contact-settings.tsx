import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { useColors } from "@/hooks/use-colors";
import { usePediatricCare } from "@/lib/pediatric-care";
import { trpc } from "@/lib/trpc";

const defaultResponseNotice = "Messages are reviewed during clinic hours; please allow a response on the next working day.";

export function ClinicContactSettings() {
  const colors = useColors();
  const { clinicLocation, updateClinicLocation } = usePediatricCare();
  const settings = trpc.clinician.clinicPublicSettings.useQuery();
  const saveMutation = trpc.clinician.saveClinicPublicSettings.useMutation();
  const [address, setAddress] = useState(clinicLocation.address);
  const [mapUrl, setMapUrl] = useState(clinicLocation.mapUrl);
  const [whatsappNumber, setWhatsappNumber] = useState("9779765002862");
  const [whatsappResponseNotice, setWhatsappResponseNotice] = useState(defaultResponseNotice);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!settings.data) return;
    setAddress(settings.data.address);
    setMapUrl(settings.data.mapUrl);
    setWhatsappNumber(settings.data.whatsappNumber);
    setWhatsappResponseNotice(settings.data.whatsappResponseNotice);
  }, [settings.data]);

  const save = async () => {
    if (!address.trim() || !/^https?:\/\//.test(mapUrl.trim()) || !/^\d{10,15}$/.test(whatsappNumber.trim()) || whatsappResponseNotice.trim().length < 12) {
      setMessage("Enter an address, complete https map link, WhatsApp country-code number, and a clear response notice.");
      return;
    }
    try {
      const saved = await saveMutation.mutateAsync({ address: address.trim(), mapUrl: mapUrl.trim(), whatsappNumber: whatsappNumber.trim(), whatsappResponseNotice: whatsappResponseNotice.trim() });
      updateClinicLocation({ address: saved.address, mapUrl: saved.mapUrl, isProvisional: saved.isProvisional });
      setMessage("Contact settings and the WhatsApp response notice are saved securely.");
    } catch {
      setMessage("The contact settings could not be saved. Please try again.");
    }
  };

  return <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[s.title, { color: colors.foreground }]}>Clinic contact administration</Text><Text style={[s.note, { color: colors.muted }]}>Replace the provisional address, maintain the WhatsApp number, and set a realistic non-emergency response expectation for families.</Text><TextInput value={address} onChangeText={setAddress} placeholder="Final clinic address" placeholderTextColor={colors.muted} multiline style={[s.input, { color: colors.foreground, borderColor: colors.border }]} /><TextInput value={mapUrl} onChangeText={setMapUrl} placeholder="https://maps…" placeholderTextColor={colors.muted} autoCapitalize="none" style={[s.input, { color: colors.foreground, borderColor: colors.border }]} /><TextInput value={whatsappNumber} onChangeText={setWhatsappNumber} placeholder="Country code + number" placeholderTextColor={colors.muted} keyboardType="phone-pad" style={[s.input, { color: colors.foreground, borderColor: colors.border }]} /><Text style={[s.label, { color: colors.muted }]}>WhatsApp response notice</Text><TextInput value={whatsappResponseNotice} onChangeText={setWhatsappResponseNotice} placeholder="When the clinic reviews WhatsApp messages" placeholderTextColor={colors.muted} multiline style={[s.noticeInput, { color: colors.foreground, borderColor: colors.border }]} /><Pressable onPress={save} disabled={saveMutation.isPending} style={[s.button, { backgroundColor: colors.primary, opacity: saveMutation.isPending ? 0.7 : 1 }]}><Text style={s.buttonText}>{saveMutation.isPending ? "Saving…" : "Save contact settings"}</Text></Pressable>{message ? <Text style={{ color: message.includes("saved") ? colors.success : colors.error, fontSize: 12, fontWeight: "700" }}>{message}</Text> : null}</View>;
}

const s = StyleSheet.create({ card: { borderWidth: 1, borderRadius: 16, padding: 15, gap: 9, marginTop: 18 }, title: { fontSize: 16, fontWeight: "800" }, note: { fontSize: 12, lineHeight: 18 }, label: { fontSize: 11, fontWeight: "800", textTransform: "uppercase", marginTop: 2 }, input: { borderWidth: 1, borderRadius: 10, padding: 11, minHeight: 44, fontSize: 13 }, noticeInput: { borderWidth: 1, borderRadius: 10, padding: 11, minHeight: 76, fontSize: 13, textAlignVertical: "top" }, button: { borderRadius: 11, padding: 13, alignItems: "center" }, buttonText: { color: "#FFFFFF", fontWeight: "800" } });
