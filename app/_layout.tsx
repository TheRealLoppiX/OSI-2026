import {
  Slot,
  useRootNavigationState,
  useRouter,
  useSegments,
} from "expo-router";
import * as NavigationBar from "expo-navigation-bar";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, Platform, StyleSheet, View } from "react-native";
import { NavigationLoading } from "../components/NavigationLoading";
import { LoadingProvider } from "../src/context/LoadingContext";
import {
  NavigationLoadingProvider,
  useNavigationLoading,
} from "../src/context/NavigationLoadingContext";
import { authService } from "../src/services/auth";
import { Colors } from "../src/styles/colors";

let jaRedirecionouGlobal = false;

export default function RootLayout() {
  return (
    <LoadingProvider>
      <NavigationLoadingProvider>
        <RootLayoutInner />
      </NavigationLoadingProvider>
    </LoadingProvider>
  );
}

function RootLayoutInner() {
  const segment = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();
  const [usuarioLogado, setUsuarioLogado] = useState<any>(undefined);
  const { isLoading, startNavigation } = useNavigationLoading();
  const isFirstMount = useRef(true);

  useEffect(() => {
    jaRedirecionouGlobal = false;
    authService
      .getUser()
      .then((user) => setUsuarioLogado(user ?? null))
      .catch(() => setUsuarioLogado(null));
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
    if (!rotaRaiz) return;

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

  return (
    <>
      <Slot />
      {usuarioLogado === undefined && (
        <View style={styles.authOverlay}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      )}
      <NavigationLoading visible={isLoading} />
    </>
  );
}

const styles = StyleSheet.create({
  authOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
});
