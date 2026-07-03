import {
  Slot,
  useRootNavigationState,
  useRouter,
  useSegments,
} from "expo-router";
import * as NavigationBar from "expo-navigation-bar";
import { useEffect, useRef } from "react";
import { ActivityIndicator, AppState, Platform, StyleSheet, View } from "react-native";
import { NavigationLoading } from "../components/NavigationLoading";
import { AuthProvider, useAuth } from "../src/context/AuthContext";
import { LoadingProvider } from "../src/context/LoadingContext";
import {
  NavigationLoadingProvider,
  useNavigationLoading,
} from "../src/context/NavigationLoadingContext";
import { ThemeProvider, useTheme } from "../src/context/ThemeContext";

let jaRedirecionouGlobal = false;

export default function RootLayout() {
  return (
    <ThemeProvider>
      <LoadingProvider>
        <NavigationLoadingProvider>
          <AuthProvider>
            <RootLayoutInner />
          </AuthProvider>
        </NavigationLoadingProvider>
      </LoadingProvider>
    </ThemeProvider>
  );
}

function RootLayoutInner() {
  const segment = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();
  const { usuario: usuarioLogado } = useAuth();
  const { isLoading, startNavigation } = useNavigationLoading();
  const isFirstMount = useRef(true);

  useEffect(() => {
    jaRedirecionouGlobal = false;
  }, []);

  // Esconde a barra de navegação do Android e re-oculta ao voltar do background
  useEffect(() => {
    if (Platform.OS !== "android") return;

    const hideNav = async () => {
      await NavigationBar.setPositionAsync("absolute");
      await NavigationBar.setVisibilityAsync("hidden");
      await NavigationBar.setBehaviorAsync("overlay-swipe");
    };

    hideNav();

    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") hideNav();
    });

    return () => sub.remove();
  }, []);

  // Dispara o loading a cada troca de rota (exceto na montagem inicial)
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    startNavigation();
  }, [JSON.stringify(segment)]);

  // Guard de autenticação
  useEffect(() => {
    if (!navigationState?.key) return;
    if (usuarioLogado === undefined) return;

    const rotaRaiz = segment[0] as string | undefined;

    const estaNaAreaRestrita =
      rotaRaiz === "(tabs)" ||
      rotaRaiz === "admin" ||
      rotaRaiz === "tutor";

    if (usuarioLogado && !estaNaAreaRestrita && !jaRedirecionouGlobal) {
      jaRedirecionouGlobal = true;
      const destino =
        usuarioLogado.role === "admin"
          ? "/admin"
          : usuarioLogado.role === "aluno"
            ? "/(tabs)/home"
            : "/";
      router.replace(destino);
      return;
    }

    if (!usuarioLogado && estaNaAreaRestrita) {
      router.replace("/");
    }
  }, [segment, navigationState?.key, usuarioLogado]);

  const { colors } = useTheme();

  return (
    <>
      <Slot />
      {usuarioLogado === undefined && (
        <View style={[styles.authOverlay, { backgroundColor: colors.bg }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
      <NavigationLoading visible={isLoading} />
    </>
  );
}

const styles = StyleSheet.create({
  authOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
});
