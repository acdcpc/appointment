import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Platform } from "react-native";
import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useLargeTextLayout } from "@/lib/large-text-accessibility";
import { AuthorityNavigationBadge } from "@/components/authority-navigation-badge";
import { EnvironmentNavigationBadge } from "@/components/environment-navigation-badge";
import { LanguageNavigationToggle } from "@/components/language-navigation-toggle";
import { useLanguagePreference } from "@/lib/language-preference";

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { minimumActionHeight } = useLargeTextLayout();
  const { language } = useLanguagePreference();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = Math.max(56, minimumActionHeight + 12) + bottomPadding;
  return (
    <>
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.muted, tabBarButton: HapticTab, tabBarStyle: { paddingTop: 8, paddingBottom: bottomPadding, height: tabBarHeight, backgroundColor: colors.background, borderTopColor: colors.border, borderTopWidth: 0.5 } }}>
      <Tabs.Screen name="index" options={{ title: language === "ne" ? "गृहपृष्ठ" : "Home", tabBarIcon: ({ color }) => <IconSymbol size={24} name="house.fill" color={color} /> }} />
      <Tabs.Screen name="find" options={{ title: language === "ne" ? "समय लिनुहोस्" : "Book visit", tabBarIcon: ({ color }) => <IconSymbol size={24} name="magnifyingglass" color={color} /> }} />
      <Tabs.Screen name="appointments" options={{ title: language === "ne" ? "भेटहरू" : "Visits", tabBarIcon: ({ color }) => <IconSymbol size={24} name="calendar" color={color} /> }} />
      <Tabs.Screen name="records" options={{ title: language === "ne" ? "अभिलेख" : "Records", tabBarIcon: ({ color }) => <IconSymbol size={24} name="doc.text" color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: language === "ne" ? "प्रोफाइल" : "Profile", tabBarIcon: ({ color }) => <IconSymbol size={24} name="person.fill" color={color} /> }} />
    </Tabs><LanguageNavigationToggle /><EnvironmentNavigationBadge /><AuthorityNavigationBadge />
    </>
  );
}
