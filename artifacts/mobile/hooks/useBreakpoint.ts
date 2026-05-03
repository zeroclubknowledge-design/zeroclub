import { useWindowDimensions } from "react-native";

export const DESKTOP_BREAKPOINT = 900;
export const WIDE_BREAKPOINT = 1200;

export function useBreakpoint() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= DESKTOP_BREAKPOINT;
  const isWide = width >= WIDE_BREAKPOINT;
  return { isDesktop, isWide, width };
}
