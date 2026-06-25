import {
  Slot,
  useRootNavigationState,
  useRouter,
  useSegments,
} from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { NavigationLoading } from "../components/NavigationLoading";
import { LoadingProvider } from "../src/context/LoadingContext";
import { authService } from "../src/services/auth";
import { Colors } from "../src/styles/colors";

let jaRedirecionouGlobal = false;

export default function RootLayout() {
  const segment = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();
  const [usuarioLogado, setUsuarioLogado] = useState<any>(undefined);
  const [navLoading, setNavLoading] = useState(false);
  const isFirstMount = useRef(true);
  const loadingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    jaRedirecionouGlobal = false;
    authService
      .getUser()
      .then((user) => setUsuarioLogado(user ?? null))
      .catch(() => setUsuarioLogado(null));
  }, []);

  // Mostra loading em cada transição de rota (exceto na montagem inicial)
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    setNavLoading(true);
    if (loadingTimer.current) clearTimeout(loadingTimer.current);
    loadingTimer.current = setTimeout(() => setNavLoading(false), 550);
    return () => {
      if (loadingTimer.current) clearTimeout(loadingTimer.current);
    };
  }, [JSON.stringify(segment)]);

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
      return;
    }
  }, [segment, navigationState?.key, usuarioLogado]);

  return (
    <LoadingProvider>
      <Slot />
      {/* Overlay enquanto verifica autenticação no boot */}
      {usuarioLogado === undefined && (
        <View style={styles.authOverlay}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      )}
      {/* Loading de navegação entre páginas */}
      <NavigationLoading visible={navLoading} />
    </LoadingProvider>
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
