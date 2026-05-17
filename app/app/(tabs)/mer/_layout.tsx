import { Slot, Stack } from "expo-router";
import { Platform } from "react-native";

export default function MerLayout() {
  if (Platform.OS === "web") return <Slot />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="privacy" />
      <Stack.Screen name="terms" />
      <Stack.Screen name="contact" />
      <Stack.Screen name="rapporter" />
      <Stack.Screen name="listor" />
      <Stack.Screen name="larver" />
      <Stack.Screen name="foreningen" />
    </Stack>
  );
}
