import { Platform } from 'react-native'
import { Stack, Slot } from 'expo-router'

export default function InventeringLayout() {
  if (Platform.OS === 'web') return <Slot />

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
    </Stack>
  )
}
