import { useWindowDimensions } from "react-native";

import { getLargeTextLayout } from "@/lib/large-text-layout";

export { getLargeTextLayout, LARGE_TEXT_THRESHOLD } from "@/lib/large-text-layout";

/** Respect the user's native text-size choice and let screens adapt dense layouts. */
export function useLargeTextLayout() {
  const { fontScale } = useWindowDimensions();
  return getLargeTextLayout(fontScale);
}
