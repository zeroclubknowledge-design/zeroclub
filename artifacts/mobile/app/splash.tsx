import React, { useEffect } from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { router } from "expo-router";
import { markSplashComplete } from "./_layout";

const LOGO = require("../assets/images/icon.png");

export default function SplashScreen() {
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.55);
  const titleOpacity = useSharedValue(0);
  const titleY = useSharedValue(12);
  const sloganOpacity = useSharedValue(0);
  const sloganY = useSharedValue(10);

  useEffect(() => {
    logoOpacity.value = withTiming(1, { duration: 650, easing: Easing.out(Easing.cubic) });
    logoScale.value = withTiming(1, { duration: 750, easing: Easing.out(Easing.back(1.1)) });
    titleOpacity.value = withDelay(380, withTiming(1, { duration: 500 }));
    titleY.value = withDelay(380, withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) }));
    sloganOpacity.value = withDelay(820, withTiming(1, { duration: 600 }));
    sloganY.value = withDelay(820, withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) }));

    const timer = setTimeout(() => {
      markSplashComplete();
      router.replace("/login");
    }, 2700);

    return () => clearTimeout(timer);
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleY.value }],
  }));

  const sloganStyle = useAnimatedStyle(() => ({
    opacity: sloganOpacity.value,
    transform: [{ translateY: sloganY.value }],
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.logoWrap, logoStyle]}>
        <Image source={LOGO} style={styles.logo} />
      </Animated.View>
      <Animated.Text style={[styles.title, titleStyle]}>Zero Club</Animated.Text>
      <Animated.Text style={[styles.slogan, sloganStyle]}>
        Build. Ship. Level Up.
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0D0D0D",
    alignItems: "center",
    justifyContent: "center",
    gap: 0,
  },
  logoWrap: {
    marginBottom: 20,
  },
  logo: {
    width: 96,
    height: 96,
    borderRadius: 22,
  },
  title: {
    fontSize: 38,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
    fontFamily: "Inter_700Bold",
    marginBottom: 8,
  },
  slogan: {
    fontSize: 15,
    color: "#888",
    fontWeight: "500",
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.2,
  },
});
