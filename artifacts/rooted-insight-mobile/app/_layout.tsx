import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setBaseUrl } from "@workspace/api-client-react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";

setBaseUrl(`https://${process.env.EXPO_PUBLIC_DOMAIN}`);

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="lab-result/[id]"
        options={{
          headerShown: true,
          headerTitle: "Lab Result",
          headerBackTitle: "Back",
          headerStyle: { backgroundColor: "#1A3A2A" },
          headerTintColor: "#C9A84C",
          headerTitleStyle: { color: "#F7F3EA", fontWeight: "600" as const },
        }}
      />
      <Stack.Screen
        name="add-lab-result"
        options={{
          headerShown: true,
          headerTitle: "Add Lab Result",
          headerBackTitle: "Cancel",
          headerStyle: { backgroundColor: "#1A3A2A" },
          headerTintColor: "#C9A84C",
          headerTitleStyle: { color: "#F7F3EA", fontWeight: "600" as const },
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="add-medication"
        options={{
          headerShown: true,
          headerTitle: "Add Medication",
          headerBackTitle: "Cancel",
          headerStyle: { backgroundColor: "#1A3A2A" },
          headerTintColor: "#C9A84C",
          headerTitleStyle: { color: "#F7F3EA", fontWeight: "600" as const },
          presentation: "modal",
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView>
            <KeyboardProvider>
              <RootLayoutNav />
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
