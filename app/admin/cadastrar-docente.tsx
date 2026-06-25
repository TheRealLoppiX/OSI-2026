import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
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
import { authService } from "../../src/services/auth";
import { Colors } from "../../src/styles/colors";

export default function CadastrarDocente() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCadastroDocente = async () => {
    // Validação básica de barreira antes de enviar ao banco
    if (!nome.trim() || !email.trim() || !usuario.trim() || !senha.trim()) {
      Alert.alert("Atenção", "Por favor, preencha todos os campos.");
      return;
    }

    if (senha.length < 6) {
      Alert.alert(
        "Atenção",
        "A senha do docente deve ter no mínimo 6 caracteres.",
      );
      return;
    }

    try {
      setLoading(true);

      // Dispara para a função que criamos no auth.ts
      await authService.registrarDocente({
        nome: nome.trim(),
        email: email.toLowerCase().trim(),
        usuario: usuario.trim(),
        senha: senha,
      });

      Alert.alert(
        "Sucesso!",
        `O docente ${nome} foi cadastrado como administrador.`,
      );

      // Retorna para o Dashboard administrativo atualizando os dados
      router.back();
    } catch (error: any) {
      Alert.alert("Erro no Cadastro", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      {/* Botão de Voltar */}
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color={Colors.text} />
      </TouchableOpacity>

      <Text style={styles.title}>Novo Docente</Text>
      <Text style={styles.subtitle}>
        Cadastre um novo professor organizador com privilégios de administrador
        na OSI 2026.
      </Text>

      <View style={styles.form}>
        <Text style={styles.label}>Nome Completo</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Prof. Carlos Silva"
          value={nome}
          onChangeText={setNome}
        />

        <Text style={styles.label}>E-mail Institucional</Text>
        <TextInput
          style={styles.input}
          placeholder="carlos.silva@ifsertaope.edu.br"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <Text style={styles.label}>Nome de Usuário (Login)</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: carlos_admin"
          autoCapitalize="none"
          autoCorrect={false}
          value={usuario}
          onChangeText={setUsuario}
        />

        <Text style={styles.label}>Senha de Acesso</Text>
        <TextInput
          style={styles.input}
          placeholder="Mínimo de 6 caracteres"
          secureTextEntry
          value={senha}
          onChangeText={setSenha}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleCadastroDocente}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View style={styles.btnContent}>
              <Ionicons name="person-add-outline" size={20} color="#fff" />
              <Text style={styles.buttonText}>Confirmar Cadastro</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: Colors.background, padding: 30 },
  backBtn: { marginTop: 40, marginBottom: 20, width: 40 },
  title: { fontSize: 32, fontWeight: "900", color: Colors.primary },
  subtitle: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 30,
    lineHeight: 20,
  },
  form: { width: "100%" },
  label: {
    fontSize: 14,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 5,
    marginTop: 10,
  },
  input: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 15,
    fontSize: 15,
  },
  button: {
    backgroundColor: "#10B981", // Mantendo o tom verde esmeralda que definimos no menu do Dashboard
    padding: 18,
    borderRadius: 15,
    alignItems: "center",
    marginTop: 20,
    elevation: 2,
  },
  buttonDisabled: {
    backgroundColor: "#A7F3D0",
  },
  btnContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});
