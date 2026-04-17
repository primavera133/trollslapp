import { Tabs } from 'expo-router'
import { Text } from 'react-native'

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#023e8a',
        tabBarInactiveTintColor: '#888',
        tabBarStyle: { borderTopColor: '#eee' },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Hem',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size - 2, color, lineHeight: size }}>&#8962;</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="fenologi"
        options={{
          title: 'Fenologi',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size - 2, color, lineHeight: size }}>&#9636;</Text>
          ),
        }}
      />
    </Tabs>
  )
}
