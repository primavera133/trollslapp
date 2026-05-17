import { Platform } from "react-native";
import { Stack, Slot } from "expo-router";

export default function ArterLayout() {
  if (Platform.OS === "web") return <Slot />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
