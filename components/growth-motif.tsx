import { View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import { useColors } from "@/hooks/use-colors";

/**
 * Signature clinic motif: a gentle growth curve with developmental milestone
 * markers. Purely decorative — it communicates continuity of care and never
 * implies a percentile, diagnosis, or clinical interpretation.
 */
export function GrowthMotif({ height = 72, opacity = 0.35 }: { height?: number; opacity?: number }) {
  const colors = useColors();
  const width = 320;
  return (
    <View pointerEvents="none" style={{ opacity }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <Path
          d={`M8 ${height - 12} C ${width * 0.22} ${height - 20}, ${width * 0.34} ${height - 54}, ${width * 0.5} ${height - 50} S ${width * 0.78} ${height - 62}, ${width - 10} ${height - 70}`}
          stroke={colors.teal}
          strokeWidth={2.5}
          fill="none"
          strokeLinecap="round"
        />
        <Circle cx={width * 0.2} cy={height - 24} r={4} fill={colors.action} />
        <Circle cx={width * 0.5} cy={height - 50} r={4} fill={colors.action} />
        <Circle cx={width * 0.8} cy={height - 62} r={4} fill={colors.action} />
      </Svg>
    </View>
  );
}
