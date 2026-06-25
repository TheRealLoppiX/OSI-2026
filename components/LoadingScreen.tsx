import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
  View
} from "react-native";

interface LoadingProps {
  visible: boolean;
  texto?: string;
  progressoAtual?: number; // Opcional: Se quiser mandar a porcentagem exata (0 a 100)
}

const { width, height } = Dimensions.get("window");

export default function LoadingScreen({
  visible,
  texto = "Sincronizando dados...",
  progressoAtual,
}: LoadingProps) {
  const [render, setRender] = useState(visible);
  const [textoExibido, setTextoExibido] = useState(texto);

  // Instâncias de animação
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const textOpacityAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // 1. Efeito de Respiração (Pulse) constante na logo
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.5,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  // 2. Transição suave de fade in/out toda vez que o "texto" mudar de fora
  useEffect(() => {
    if (texto !== textoExibido) {
      Animated.timing(textOpacityAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(() => {
        setTextoExibido(texto);
        Animated.timing(textOpacityAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }).start();
      });
    }
  }, [texto]);

  // 3. Controle mestre de visibilidade e progresso da barra
  useEffect(() => {
    if (visible) {
      setRender(true);

      // Fade In do fundo
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();

      if (progressoAtual !== undefined) {
        // Modo Real: Barra acompanha exatamente o número passado pela tela (ex: 25, 50, 75)
        Animated.timing(progressAnim, {
          toValue: progressoAtual,
          duration: 400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: false,
        }).start();
      } else {
        // Modo Simulado: Corre rápido e vai freando até 85%
        progressAnim.setValue(0);
        Animated.timing(progressAnim, {
          toValue: 85,
          duration: 2500, // Um pouco mais lento para dar tempo de ler os textos
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }).start();
      }
    } else {
      // Quando finalizado (visible = false), a barra dá um tiro pra 100% e some
      Animated.timing(progressAnim, {
        toValue: 100,
        duration: 300,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: false,
      }).start(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }).start(() => setRender(false));
      });
    }
  }, [visible, progressoAtual]);

  if (!render) return null;

  // Interpolação blindada para evitar que passe de 100%
  const widthInterpolated = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
    extrapolate: "clamp",
  });

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.card}>
        <Animated.Text style={[styles.logo, { opacity: pulseAnim }]}>
          OSI 2026
        </Animated.Text>

        <View style={styles.barraContainer}>
          <View style={styles.barraFundo} />
          <Animated.View
            style={[styles.barraPreenchimento, { width: widthInterpolated }]}
          />
        </View>

        <View style={styles.textoContainer}>
          <Animated.Text style={[styles.texto, { opacity: textOpacityAnim }]}>
            {textoExibido}
          </Animated.Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    top: 0,
    width: width,
    height: height,
    // Fundo glassmorphism escuro
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  card: {
    width: width * 0.75,
    backgroundColor: "#ffffff",
    paddingVertical: 35,
    paddingHorizontal: 25,
    borderRadius: 24,
    alignItems: "center",
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.2,
    shadowRadius: 25,
    elevation: 15,
  },
  logo: {
    fontSize: 24,
    fontWeight: "900",
    color: "#059669",
    letterSpacing: 1.5,
    marginBottom: 25,
  },
  barraContainer: {
    width: "100%",
    height: 6,
    position: "relative",
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: 10,
  },
  barraFundo: {
    width: "100%",
    height: "100%",
    backgroundColor: "#E2E8F0",
    position: "absolute",
  },
  barraPreenchimento: {
    height: "100%",
    backgroundColor: "#059669",
    borderRadius: 10,
  },
  textoContainer: {
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "center",
    width: "100%",
  },
  texto: {
    fontSize: 14,
    color: "#475569",
    fontWeight: "600",
  },
});
