import {
  AtkinsonHyperlegible_400Regular,
  AtkinsonHyperlegible_400Regular_Italic,
  AtkinsonHyperlegible_700Bold,
  AtkinsonHyperlegible_700Bold_Italic,
  useFonts,
} from "@expo-google-fonts/atkinson-hyperlegible";
import {
  Stack,
  useRootNavigationState,
  useRouter,
  useSegments,
} from "expo-router";
import * as NavigationBar from "expo-navigation-bar";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, AppState, Platform, StyleSheet, View } from "react-native";
import { ReducedMotionConfig, ReduceMotion } from "react-native-reanimated";
import { NavigationLoading } from "../components/NavigationLoading";
import { AccessibilityProvider, useAccessibility } from "../src/context/AccessibilityContext";
import { AuthProvider, useAuth } from "../src/context/AuthContext";
import { LoadingProvider } from "../src/context/LoadingContext";
import {
  NavigationLoadingProvider,
  useNavigationLoading,
} from "../src/context/NavigationLoadingContext";
import { ThemeProvider, useTheme } from "../src/context/ThemeContext";
import { AppAlertProvider } from "../src/services/appAlert";

let jaRedirecionouGlobal = false;

// Rotas que exigem login. Qualquer pasta/arquivo novo fora de index/cadastro
// precisa entrar aqui, senão o guard deixa acessar deslogado.
const ROTAS_RESTRITAS = new Set([
  "(tabs)",
  "admin",
  "tutor",
  "ajuda",
  "webview",
  "simulado",
  "historico",
]);

// Acessível logado ou não: quem tem baixa visão precisa ajustar fonte e
// contraste antes de conseguir fazer login
const ROTAS_NEUTRAS = new Set(["configuracoes"]);

export default function RootLayout() {
  // Não bloqueia o render: até a fonte carregar o texto usa a do sistema
  useFonts({
    AtkinsonHyperlegible_400Regular,
    AtkinsonHyperlegible_400Regular_Italic,
    AtkinsonHyperlegible_700Bold,
    AtkinsonHyperlegible_700Bold_Italic,
  });

  return (
    <ThemeProvider>
      <AccessibilityProvider>
        <LoadingProvider>
          <NavigationLoadingProvider>
            <AuthProvider>
              <RootLayoutInner />
            </AuthProvider>
          </NavigationLoadingProvider>
        </LoadingProvider>
      </AccessibilityProvider>
    </ThemeProvider>
  );
}

function RootLayoutInner() {
  const segment = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();
  const { usuario: usuarioLogado } = useAuth();
  const { isLoading, startNavigation } = useNavigationLoading();

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

  // Guard de autenticação
  useEffect(() => {
    if (!navigationState?.key) return;
    if (usuarioLogado === undefined) return;

    const rotaRaiz = segment[0] as string | undefined;

    if (rotaRaiz && ROTAS_NEUTRAS.has(rotaRaiz)) return;
    const estaNaAreaRestrita = !!rotaRaiz && ROTAS_RESTRITAS.has(rotaRaiz);

    if (estaNaAreaRestrita) {
      // Usuário chegou numa rota restrita (navegação normal ou redirecionamento
      // já concluído) — libera a checagem para disparar de novo se ele cair
      // numa rota pública outra vez estando logado (ex.: deep link).
      jaRedirecionouGlobal = false;
    }

    if (usuarioLogado && !estaNaAreaRestrita && !jaRedirecionouGlobal) {
      jaRedirecionouGlobal = true;
      startNavigation();
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

  const { colors, isDark } = useTheme();
  const { motionReduced } = useAccessibility();

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <ReducedMotionConfig mode={motionReduced ? ReduceMotion.Always : ReduceMotion.System} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: motionReduced ? "none" : "slide_from_right",
        }}
      >
        {/* Login/cadastro e as raízes de área entram sem animação lateral: não
            são "um passo adiante", são troca de contexto */}
        <Stack.Screen name="index" options={{ animation: motionReduced ? "none" : "fade" }} />
        <Stack.Screen name="(tabs)" options={{ animation: motionReduced ? "none" : "fade" }} />
        <Stack.Screen name="admin/index" options={{ animation: motionReduced ? "none" : "fade" }} />
        {/* Simulado é tela cheia e não deve ser fechado por gesto sem querer */}
        <Stack.Screen name="simulado" options={{ gestureEnabled: false }} />
      </Stack>
      {usuarioLogado === undefined && (
        <View style={[styles.authOverlay, { backgroundColor: colors.bg }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
      <NavigationLoading visible={isLoading} />
      <AppAlertProvider />
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
