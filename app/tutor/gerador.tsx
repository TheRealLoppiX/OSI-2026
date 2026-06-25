import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { aiService } from "../../src/services/aiService";
import { authService } from "../../src/services/auth";
import { Colors } from "../../src/styles/colors";

const UMA_HORA_MS = 60 * 60 * 1000;

export default function GeradorSimulado() {
  const [tema, setTema] = useState("");
  const [nQts, setNQts] = useState(5);
  const [loading, setLoading] = useState(false);
  const [cooldownMin, setCooldownMin] = useState(0);

  useEffect(() => {
    verificarCooldown();
  }, []);

  const verificarCooldown = async () => {
    const user = await authService.getUser();
    if (!user?.id) return;
    const key = `@OSI_ai_gen_${user.id}`;
    const lastStr = await AsyncStorage.getItem(key);
    if (lastStr) {
      const elapsed = Date.now() - Number(lastStr);
      if (elapsed < UMA_HORA_MS) {
        setCooldownMin(Math.ceil((UMA_HORA_MS - elapsed) / 60000));
      } else {
        setCooldownMin(0);
      }
    }
  };

  const gerarSimuladoIA = async () => {
    if (!tema.trim()) return Alert.alert("Ops", "Qual o tema?");

    const user = await authService.getUser();
    const key = `@OSI_ai_gen_${user?.id || "guest"}`;
    const lastStr = await AsyncStorage.getItem(key);

    if (lastStr) {
      const elapsed = Date.now() - Number(lastStr);
      if (elapsed < UMA_HORA_MS) {
        const restante = Math.ceil((UMA_HORA_MS - elapsed) / 60000);
        return Alert.alert(
          "Aguarde um pouco",
          `Para não sobrecarregar a OSIA, cada usuário pode gerar 1 simulado por hora.\n\nPróximo disponível em ${restante} min.`
        );
      }
    }

    setLoading(true);
    try {
      const questoesGeradas = await aiService.gerarQuestoesIA(tema, nQts);

      await AsyncStorage.setItem(key, String(Date.now()));
      setCooldownMin(60);

      router.push({
        pathname: "/simulado",
        params: {
          dadosIA: JSON.stringify(questoesGeradas),
          titulo: `Treino IA: ${tema}`,
        },
      } as any);
    } catch (error) {
      Alert.alert(
        "Erro",
        "O limite de requisições gratuitas foi atingido. Tente em 1 minuto."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Simulado IA</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.aiBanner}>
          <MaterialCommunityIcons name="auto-fix" size={50} color="#fff" />
          <Text style={styles.bannerTitle}>OSIA</Text>
          <Text style={styles.bannerSub}>
            Especifique para OSIA como você quer o Simulado
          </Text>
        </View>

        {cooldownMin > 0 && (
          <View style={styles.cooldownBanner}>
            <Ionicons name="time-outline" size={20} color="#F59E0B" />
            <Text style={styles.cooldownText}>
              Próximo simulado disponível em <Text style={{ fontWeight: "bold" }}>{cooldownMin} min</Text>
            </Text>
          </View>
        )}

        <Text style={styles.label}>Tema do Simulado</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Redes, Python, Hardware..."
          value={tema}
          onChangeText={setTema}
          placeholderTextColor="#94A3B8"
        />

        <Text style={styles.label}>Quantidade de Questões ({nQts})</Text>
        <View style={styles.qtsSelector}>
          {[3, 5, 10, 15].map((num) => (
            <TouchableOpacity
              key={num}
              style={[
                styles.qtsBtn,
                nQts === num && { backgroundColor: Colors.primary },
              ]}
              onPress={() => setNQts(num)}
            >
              <Text
                style={[styles.qtsBtnText, nQts === num && { color: "#fff" }]}
              >
                {num}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.mainBtn, (loading || cooldownMin > 0) && { opacity: 0.6 }]}
          onPress={gerarSimuladoIA}
          disabled={loading || cooldownMin > 0}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : cooldownMin > 0 ? (
            <>
              <Ionicons name="time" size={20} color="#fff" />
              <Text style={styles.mainBtnText}>Disponível em {cooldownMin} min</Text>
            </>
          ) : (
            <>
              <Text style={styles.mainBtnText}>Gerar Simulado</Text>
              <Ionicons name="sparkles" size={20} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    paddingTop: 60,
    padding: 25,
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  title: { fontSize: 20, fontWeight: "bold", color: Colors.text },
  content: { padding: 25 },
  aiBanner: {
    backgroundColor: "#4F46E5",
    padding: 30,
    borderRadius: 30,
    alignItems: "center",
    marginBottom: 24,
  },
  bannerTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 10,
  },
  bannerSub: { color: "rgba(255,255,255,0.8)", textAlign: "center" },
  cooldownBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FEF3C7",
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  cooldownText: { color: "#92400E", fontSize: 14 },
  label: {
    fontWeight: "bold",
    marginBottom: 10,
    fontSize: 16,
    color: Colors.text,
    marginTop: 10,
  },
  input: {
    backgroundColor: "#F1F5F9",
    padding: 18,
    borderRadius: 15,
    fontSize: 16,
    marginBottom: 20,
    color: "#000",
  },
  qtsSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  qtsBtn: {
    backgroundColor: "#F1F5F9",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    flex: 1,
    marginHorizontal: 4,
    alignItems: "center",
  },
  qtsBtnText: { fontWeight: "bold", color: Colors.textLight },
  mainBtn: {
    backgroundColor: Colors.primary,
    padding: 20,
    borderRadius: 18,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
  },
  mainBtnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});
