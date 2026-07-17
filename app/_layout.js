import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { ThemeProvider, useTheme } from '../lib/ThemeContext'
import { SettingsProvider } from '../lib/SettingsContext'
import { setupNotificationHandler } from '../lib/notifications'

setupNotificationHandler()

function ThemedApp() {
  const { theme } = useTheme()
  return (
    <>
      <StatusBar style={theme.statusBar} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.header },
          headerShadowVisible: false,
          headerTintColor: theme.text,
          headerTitleStyle: { fontWeight: '700', fontSize: 17 },
          contentStyle: { backgroundColor: theme.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </>
  )
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <SettingsProvider>
          <ThemedApp />
        </SettingsProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  )
}
