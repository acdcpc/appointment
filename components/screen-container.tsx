import { View, type ViewProps } from "react-native";
import { SafeAreaView, type Edge, useSafeAreaInsets } from "react-native-safe-area-context";

import { cn } from "@/lib/utils";

/** Hard floor under anything pinned to the bottom, in dp. */
export const BOTTOM_CLEARANCE_DP = 48;

export interface ScreenContainerProps extends ViewProps {
  /**
   * SafeArea edges to apply. Defaults to ["top", "left", "right"].
   * Bottom is typically handled by Tab Bar.
   */
  edges?: Edge[];
  /**
   * Max content width for comfortable reading on wide screens.
   * Content is centered; the background still spans the full width.
   */
  maxWidth?: number;
  /**
   * Tailwind className for the content area.
   */
  className?: string;
  /**
   * Additional className for the outer container (background layer).
   */
  containerClassName?: string;
  /**
   * Additional className for the SafeAreaView (content layer).
   */
  safeAreaClassName?: string;
  /**
   * Keep a hard bottom clearance of at least 48 dp on screens that are NOT behind
   * the tab bar. `useSafeAreaInsets().bottom` reports 0 on some Android devices,
   * and without this the last tappable row sits inside the gesture strip, where
   * taps are swallowed. Ignored when `edges` already includes "bottom".
   */
  bottomClearance?: boolean;
}

/**
 * A container component that properly handles SafeArea and background colors.
 *
 * The outer View extends to full screen (including status bar area) with the background color,
 * while the inner SafeAreaView ensures content is within safe bounds.
 *
 * Usage:
 * ```tsx
 * <ScreenContainer className="p-4">
 *   <Text className="text-2xl font-bold text-foreground">
 *     Welcome
 *   </Text>
 * </ScreenContainer>
 * ```
 */
export function ScreenContainer({
  children,
  edges = ["top", "left", "right"],
  className,
  containerClassName,
  safeAreaClassName,
  style,
  maxWidth = 760,
  bottomClearance = false,
  ...props
}: ScreenContainerProps) {
  const insets = useSafeAreaInsets();
  const clearance = bottomClearance && !edges.includes("bottom")
    ? Math.max(BOTTOM_CLEARANCE_DP, insets.bottom + BOTTOM_CLEARANCE_DP)
    : 0;
  return (
    <View
      className={cn(
        "flex-1",
        "bg-background",
        containerClassName
      )}
      {...props}
    >
      <SafeAreaView
        edges={edges}
        className={cn("flex-1", safeAreaClassName)}
        style={style}
      >
        <View
          className={cn("flex-1 w-full self-center", className)}
          style={clearance ? { maxWidth, paddingBottom: clearance } : { maxWidth }}
        >
          {children}
        </View>
      </SafeAreaView>
    </View>
  );
}
