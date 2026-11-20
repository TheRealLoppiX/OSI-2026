import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Text, TextInput } from "../../components/AppText";
import { authService } from "../../src/services/auth";
import { useTheme, useThemedStyles, type ThemeColors } from "../../src/context/ThemeContext";
import { appAlert } from "../../src/services/appAlert";
import { friendlyError } from "../../src/utils/friendlyError";

export default function CadastrarDocente() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCadastroDocente = async () => {
    if (!nome.trim() || !email.trim() || !usuario.trim() || !senha.trim()) {
      appAlert.alert("Atenção", "Por favor, preencha todos os campos.");
      return;
    }
    if (senha.length < 6) {
      appAlert.alert("Atenção", "A senha do docente deve ter no mínimo 6 caracteres.");
      return;
    }

    try {
      setLoading(true);
      await authService.registrarDocente({
        nome: nome.trim(),
        email: email.toLowerCase().trim(),
        usuario: usuario.trim(),
        senha,
      });
      appAlert.alert("Sucesso!", `O docente ${nome} foi cadastrado como administrador.`);
      router.back();
    } catch (error: any) {
      appAlert.alert("Erro no Cadastro", friendlyError(error, "Não foi possível cadastrar o docente."));
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = [styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }];

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: colors.bg }]}
      keyboardShouldPersistTaps="handled"
    >
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Voltar">
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>

      <Text style={[styles.title, { color: colors.primary }]}>Novo Docente</Text>
      <Text style={[styles.subtitle, { color: colors.textLight }]}>
        Cadastre um novo professor organizador com privilégios de administrador na OSI 2026.
      </Text>

      <View style={styles.form}>
        <Text style={[styles.label, { color: colors.text }]}>Nome Completo</Text>
        <TextInput style={inputStyle} placeholder="Ex: Prof. Carlos Silva" placeholderTextColor={colors.textLight} value={nome} onChangeText={setNome} />

        <Text style={[styles.label, { color: colors.text }]}>E-mail Institucional</Text>
        <TextInput style={inputStyle} placeholder="carlos.silva@ifsertaope.edu.br" placeholderTextColor={colors.textLight} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />

        <Text style={[styles.label, { color: colors.text }]}>Nome de Usuário (Login)</Text>
        <TextInput style={inputStyle} placeholder="Ex: carlos_admin" placeholderTextColor={colors.textLight} autoCapitalize="none" autoCorrect={false} value={usuario} onChangeText={setUsuario} />

        <Text style={[styles.label, { color: colors.text }]}>Senha de Acesso</Text>
        <TextInput style={inputStyle} placeholder="Mínimo de 6 caracteres" placeholderTextColor={colors.textLight} secureTextEntry value={senha} onChangeText={setSenha} />

        <TouchableOpacity accessibilityRole="button"
          style={[styles.button, loading && { opacity: 0.7 }]}
          onPress={handleCadastroDocente}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <View style={styles.btnContent}>
              <Ionicons name="person-add-outline" size={20} color={colors.onPrimary} />
              <Text style={styles.buttonText}>Confirmar Cadastro</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const createStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flexGrow: 1, padding: 30 },
  backBtn: { marginTop: 40, marginBottom: 20, width: 40 },
  title: { fontSize: 32, fontWeight: "900" },
  subtitle: { fontSize: 14, marginBottom: 30, lineHeight: 20 },
  form: { width: "100%" },
  label: { fontSize: 14, fontWeight: "bold", marginBottom: 5, marginTop: 10 },
  input: { padding: 15, borderRadius: 12, borderWidth: 1, marginBottom: 15, fontSize: 15 },
  button: { backgroundColor: c.success, padding: 18, borderRadius: 15, alignItems: "center", marginTop: 20, elevation: 2 },
  btnContent: { flexDirection: "row", alignItems: "center", gap: 8 },
  buttonText: { color: c.onPrimary, fontWeight: "bold", fontSize: 16 },
});
