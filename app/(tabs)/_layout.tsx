import { Tabs, usePathname, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Platform, Pressable, Text, View, useWindowDimensions } from "react-native";
import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useLargeTextLayout } from "@/lib/large-text-accessibility";
import { AuthorityNavigationBadge } from "@/components/authority-navigation-badge";
import { EnvironmentNavigationBadge } from "@/components/environment-navigation-badge";
import { LanguageNavigationToggle } from "@/components/language-navigation-toggle";
import { useLanguagePreference } from "@/lib/language-preference";

function DesktopTopNav({ colors, language, setLanguage }: { colors: ReturnType<typeof useColors>; language: string; setLanguage: (l: "en" | "ne") => void }) {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const segment = pathname.replace("/(tabs)", "");
  const items: Array<{ path: string; label: string }> = [
    { path: "/", label: language === "ne" ? "गृहपृष्ठ" : "Home" },
    { path: "/find", label: language === "ne" ? "समय लिनुहोस्" : "Book visit" },
    { path: "/appointments", label: language === "ne" ? "भेटहरू" : "Visits" },
    { path: "/records", label: language === "ne" ? "अभिलेख" : "Records" },
    { path: "/profile", label: language === "ne" ? "प्रोफाइल" : "Profile" },
  ];
  return (
    <View style={{ backgroundColor: colors.background, borderBottomWidth: 0.5, borderBottomColor: colors.border }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 16, minHeight: 56, paddingHorizontal: 24, width: "100%", maxWidth: 1200, alignSelf: "center" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginRight: 8 }}>
          <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: colors.textInverse, fontWeight: "900", fontSize: 14 }}>R</Text>
          </View>
          <Text style={{ color: colors.foreground, fontWeight: "900", fontSize: 14 }} numberOfLines={1}>
            Rainbow Child Development Clinic
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
          {items.map((item) => {
            const active = segment === item.path;
            return (
              <Pressable
                key={item.path}
                onPress={() => router.push(item.path)}
                accessibilityRole="link"
                aria-current={active ? "page" : undefined}
                style={{ minHeight: 44, paddingHorizontal: 12, justifyContent: "center", borderBottomWidth: 2, borderBottomColor: active ? colors.primary : "transparent" }}
              >
                <Text style={{ color: active ? colors.primary : colors.muted, fontWeight: active ? "900" : "700", fontSize: 14 }}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={{ marginLeft: "auto", flexDirection: "row", alignItems: "center" }}>
          <Pressable
            onPress={() => setLanguage(language === "en" ? "ne" : "en")}
            accessibilityRole="button"
            accessibilityLabel="Switch language"
            style={{ minHeight: 44, paddingHorizontal: 12, justifyContent: "center", borderWidth: 1, borderRadius: 12, borderColor: colors.border }}
          >
            <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 13 }}>{language === "en" ? "नेपाली" : "EN"}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { minimumActionHeight } = useLargeTextLayout();
  const { language } = useLanguagePreference();
  const { setLanguage } = useLanguagePreference();
  const { width } = useWindowDimensions();
  const desktopNav = Platform.OS === "web" && width >= 1024;
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = Math.max(56, minimumActionHeight + 12) + bottomPadding;
  return (
    <>
    {desktopNav ? <DesktopTopNav colors={colors} language={language} setLanguage={setLanguage} /> : null}
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.muted, tabBarButton: HapticTab, tabBarStyle: desktopNav ? { display: "none" } : { paddingTop: 8, paddingBottom: bottomPadding, height: tabBarHeight, backgroundColor: colors.background, borderTopColor: colors.border, borderTopWidth: 0.5 } }}>
      <Tabs.Screen name="index" options={{ title: language === "ne" ? "गृहपृष्ठ" : "Home", tabBarIcon: ({ color }) => <IconSymbol size={24} name="house.fill" color={color} /> }} />
      <Tabs.Screen name="find" options={{ title: language === "ne" ? "समय लिनुहोस्" : "Book visit", tabBarIcon: ({ color }) => <IconSymbol size={24} name="magnifyingglass" color={color} /> }} />
      <Tabs.Screen name="appointments" options={{ title: language === "ne" ? "भेटहरू" : "Visits", tabBarIcon: ({ color }) => <IconSymbol size={24} name="calendar" color={color} /> }} />
      <Tabs.Screen name="records" options={{ title: language === "ne" ? "अभिलेख" : "Records", tabBarIcon: ({ color }) => <IconSymbol size={24} name="doc.text" color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: language === "ne" ? "प्रोफाइल" : "Profile", tabBarIcon: ({ color }) => <IconSymbol size={24} name="person.fill" color={color} /> }} />
    </Tabs><LanguageNavigationToggle /><EnvironmentNavigationBadge /><AuthorityNavigationBadge />
    </>
  );
}
