import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../src/services/supabase";
import { Colors } from "../../src/styles/colors";

export default function EnviarNotificacao() {
  const [titulo, setTitulo] = useState("Comunicado OSI");
  const [mensagem, setMensagem] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!mensagem.trim()) return Alert.alert("Erro", "Escreva uma mensagem.");

    setLoading(true);
    try {
      // Inserção no banco
      const { error } = await supabase.from("notificacoes").insert([
        {
          titulo: titulo.trim(),
          mensagem: mensagem.trim(),
          lida: false,
        },
      ]);

      if (error) {
        // Se o banco retornar erro, ele cai aqui
        console.error("Erro Supabase:", error);
        Alert.alert("Erro ao enviar", error.message);
      } else {
        Alert.alert("Sucesso", "Alerta enviado para todos os alunos!");
        router.back();
      }
    } catch (e: any) {
      Alert.alert("Erro de Conexão", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Disparar Alerta</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Título do Aviso</Text>
        <TextInput
          style={styles.input}
          value={titulo}
          onChangeText={setTitulo}
          placeholder="Ex: Mudança de Horário"
          placeholderTextColor="#94A3B8"
        />

        <Text style={styles.label}>Mensagem para os Alunos</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          multiline
          numberOfLines={6}
          value={mensagem}
          onChangeText={setMensagem}
          placeholder="Digite aqui o aviso importante..."
          placeholderTextColor="#94A3B8"
        />

        <TouchableOpacity
          style={[styles.btn, loading && { opacity: 0.7 }]}
          onPress={handleSend}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Enviar Agora 🚀</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingTop: 60,
    padding: 25,
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  title: { fontSize: 20, fontWeight: "bold", color: Colors.text },
  form: { padding: 25 },
  label: {
    fontSize: 14,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 8,
    marginTop: 15,
  },
  input: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    color: "#000",
  },
  textArea: { height: 150, textAlignVertical: "top" },
  btn: {
    backgroundColor: Colors.primary,
    padding: 18,
    borderRadius: 15,
    alignItems: "center",
    marginTop: 30,
  },
  btnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});
