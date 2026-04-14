import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#0c1220',
          borderTopColor: '#344866',
        },
        tabBarActiveTintColor: '#4a90e2',
        tabBarInactiveTintColor: '#a8afbf',
        headerStyle: { backgroundColor: '#0c1220' },
        headerTintColor: '#e7eef8',
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Get a Quote',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="contractor"
        options={{
          title: 'Contractor Portal',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="construct-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
