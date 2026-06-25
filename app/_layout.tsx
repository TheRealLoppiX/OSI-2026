import {
  Slot,
  useRootNavigationState,
  useRouter,
  useSegments,
} from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { LoadingProvider } from "../src/context/LoadingContext";
import { authService } from "../src/services/auth";
import { Colors } from "../src/styles/colors";

// ✅ Fora do componente — sobrevive a remontagens
let jaRedirecionouGlobal = false;

export default function RootLayout() {
  const segment = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();
  const [usuarioLogado, setUsuarioLogado] = useState<any>(undefined);

  useEffect(() => {
    // Reseta a flag global ao montar (boot limpo)
    jaRedirecionouGlobal = false;

    authService
      .getUser()
      .then((user) => setUsuarioLogado(user ?? null))
      .catch(() => setUsuarioLogado(null));
  }, []);

  useEffect(() => {
    if (!navigationState?.key) return;
    if (usuarioLogado === undefined) return;

    const rotaRaiz = segment[0] as string | undefined;

    if (!rotaRaiz) return; // transição — ignora sempre

    const estaNaAreaRestrita =
      rotaRaiz === "(tabs)" ||
      rotaRaiz === "admin" ||
      rotaRaiz === "tutor";

    console.log(
      "[GUARD] segment:",
      JSON.stringify(segment),
      "| logado:",
      !!usuarioLogado,
      "| restrita:",
      estaNaAreaRestrita,
      "| jaRedirecionou:",
      jaRedirecionouGlobal,
    );

    if (usuarioLogado && !estaNaAreaRestrita && !jaRedirecionouGlobal) {
      jaRedirecionouGlobal = true;
      const destino =
        usuarioLogado.role === "admin"
          ? "/admin"
          : usuarioLogado.role === "aluno"
            ? "/(tabs)/home"
            : "/";
      console.log("[GUARD] 🚀 Boot redirect →", destino);
      router.replace(destino);
      return;
    }

    if (!usuarioLogado && estaNaAreaRestrita) {
      console.log("[GUARD] 🛡️ Deslogado em rota privada → /");
      router.replace("/");
      return;
    }

    console.log("[GUARD] ✅ Sem ação");
  }, [segment, navigationState?.key, usuarioLogado]);

  return (
    <LoadingProvider>
      <Slot />
      {usuarioLogado === undefined && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      )}
    </LoadingProvider>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
});
