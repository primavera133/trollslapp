import { Tabs, usePathname, router } from 'expo-router'
import { View, Text, TouchableOpacity, useWindowDimensions, StyleSheet, Platform } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'

const SIDEBAR_BREAKPOINT = 768

const TAB_CONFIG: { name: string; path: string; title: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { name: 'index', path: '/', title: 'Hem', icon: 'home-outline' },
  { name: 'fenologi', path: '/fenologi', title: 'Fenologi', icon: 'bar-chart-outline' },
  { name: 'arter', path: '/arter', title: 'Arter', icon: 'bug-outline' },
  { name: 'observatorer', path: '/observatorer', title: 'Observatörer', icon: 'people-outline' },
]

function Sidebar() {
  const pathname = usePathname()

  return (
    <View style={styles.sidebar}>
      <Text style={styles.sidebarTitle}>Trollslapp</Text>
      {TAB_CONFIG.map(tab => {
        const active = tab.path === '/'
          ? pathname === '/' || pathname === ''
          : pathname.startsWith(tab.path)
        return (
          <TouchableOpacity
            key={tab.name}
            style={[styles.sidebarItem, active && styles.sidebarItemActive]}
            onPress={() => router.navigate(tab.path)}
          >
            <Ionicons
              name={tab.icon}
              size={20}
              color={active ? '#023e8a' : '#666'}
            />
            <Text style={[styles.sidebarLabel, active && styles.sidebarLabelActive]}>
              {tab.title}
            </Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

export default function TabLayout() {
  const { width } = useWindowDimensions()
  const useSidebar = Platform.OS === 'web' && width >= SIDEBAR_BREAKPOINT

  const tabs = (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#023e8a',
        tabBarInactiveTintColor: '#888',
        tabBarStyle: useSidebar
          ? { display: 'none' }
          : { borderTopColor: '#eee', height: 60, paddingBottom: 8 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      {TAB_CONFIG.map(tab => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name={tab.icon} size={size} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  )

  if (!useSidebar) return tabs

  return (
    <View style={styles.row}>
      <Sidebar />
      <View style={styles.content}>
        {tabs}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flex: 1,
    flexDirection: 'row',
  },
  content: {
    flex: 1,
  },
  sidebar: {
    width: 200,
    backgroundColor: '#fff',
    borderRightWidth: 1,
    borderColor: '#e0e0e0',
    paddingTop: 24,
    paddingHorizontal: 8,
  },
  sidebarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#023e8a',
    paddingHorizontal: 12,
    paddingBottom: 20,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 2,
  },
  sidebarItemActive: {
    backgroundColor: '#eef4ff',
  },
  sidebarLabel: {
    fontSize: 14,
    color: '#666',
  },
  sidebarLabelActive: {
    color: '#023e8a',
    fontWeight: '600',
  },
})
