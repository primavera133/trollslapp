import { Platform } from "react-native";
import { Stack, Slot } from "expo-router";

export default function MerLayout() {
  if (Platform.OS === "web") return <Slot />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="privacy" />
      <Stack.Screen name="terms" />
      <Stack.Screen name="contact" />
      <Stack.Screen name="rapporter" />
    </Stack>
  );
}
