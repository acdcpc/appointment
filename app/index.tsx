import { useEffect, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { useColors } from "@/hooks/use-colors";
import { getGuardianSession } from "@/lib/supabase-auth";

/**
 * Entry gate. Signed-in guardians go straight to the app; everyone else sees
 * onboarding first. Runs once per app open — screens inside (tabs) keep their
 * own flows afterwards.
 */
export default function Index() {
  const colors = useColors();
  const router = useRouter();
  const [routing, setRouting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let destination: "/onboarding" | "/(tabs)" = "/onboarding";
      try {
        const session = await getGuardianSession();
        if (session) destination = "/(tabs)";
      } catch {
        // fall through to onboarding on any session error
      }
      if (cancelled) return;
      setRouting(true);
      router.replace(destination);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Image source={require("../assets/images/icon.png")} style={styles.logoImage} />
      <Text style={[styles.title, { color: colors.foreground }]}>Rainbow Child Development Clinic</Text>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  logoImage: {
    width: 68,
    height: 68,
    borderRadius: 17,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
  },
});
