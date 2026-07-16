import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../src/services/supabase";
import { useTheme } from "../../src/context/ThemeContext";
import { appAlert } from "../../src/services/appAlert";
import { friendlyError } from "../../src/utils/friendlyError";

export default function EnviarNotificacao() {
  const { colors } = useTheme();
  const [titulo, setTitulo] = useState("Comunicado OSI");
  const [mensagem, setMensagem] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!mensagem.trim()) return appAlert.alert("Erro", "Escreva uma mensagem.");

    // Notificação vai para todos os alunos de uma vez — confirma antes de disparar.
    appAlert.alert(
      "Enviar para todos os alunos?",
      `"${titulo.trim()}"\n\n${mensagem.trim()}`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Enviar", onPress: enviarNotificacao },
      ]
    );
  };

  const enviarNotificacao = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.from("notificacoes").insert([
        { titulo: titulo.trim(), mensagem: mensagem.trim(), lida: false },
      ]);

      if (error) {
        appAlert.alert("Erro ao enviar", friendlyError(error, "Não foi possível enviar a notificação."));
      } else {
        appAlert.alert("Sucesso", "Alerta enviado para todos os alunos!");
        router.back();
      }
    } catch (e: any) {
      appAlert.alert("Erro de Conexão", friendlyError(e, "Verifique sua internet e tente novamente."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Voltar">
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Disparar Alerta</Text>
      </View>

      <View style={styles.form}>
        <Text style={[styles.label, { color: colors.text }]}>Título do Aviso</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
          value={titulo}
          onChangeText={setTitulo}
          placeholder="Ex: Mudança de Horário"
          placeholderTextColor={colors.textLight}
        />

        <Text style={[styles.label, { color: colors.text }]}>Mensagem para os Alunos</Text>
        <TextInput
          style={[styles.input, styles.textArea, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
          multiline
          numberOfLines={6}
          value={mensagem}
          onChangeText={setMensagem}
          placeholder="Digite aqui o aviso importante..."
          placeholderTextColor={colors.textLight}
        />

        <TouchableOpacity
          style={[styles.btn, { backgroundColor: colors.primary }, loading && { opacity: 0.7 }]}
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
  container: { flex: 1 },
  header: {
    paddingTop: 60,
    padding: 25,
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    borderBottomWidth: 1,
  },
  title: { fontSize: 20, fontWeight: "bold" },
  form: { padding: 25 },
  label: { fontSize: 14, fontWeight: "bold", marginBottom: 8, marginTop: 15 },
  input: { padding: 15, borderRadius: 12, borderWidth: 1 },
  textArea: { height: 150, textAlignVertical: "top" },
  btn: { padding: 18, borderRadius: 15, alignItems: "center", marginTop: 30 },
  btnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});
