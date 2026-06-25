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
import { authService } from "../src/services/auth";
import { Colors } from "../src/styles/colors";

export default function Cadastro() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [usuario, setUsuario] = useState("");
  const [instituicao, setInstituicao] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCadastro = async () => {
    try {
      setLoading(true);
      await authService.registrarAluno({ nome, usuario, instituicao, senha });

      Alert.alert("Sucesso!", "Conta criada com sucesso!");
      router.replace("/(tabs)/home");
    } catch (error: any) {
      Alert.alert("Erro no Cadastro", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color={Colors.text} />
      </TouchableOpacity>

      <Text style={styles.title}>Criar Conta</Text>

      <View style={styles.form}>
        <Text style={styles.label}>Nome Completo</Text>
        <TextInput
          style={styles.input}
          placeholder="Seu nome"
          value={nome}
          onChangeText={setNome}
        />

        <Text style={styles.label}>Usuário (Login)</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: joao_osi"
          autoCapitalize="none"
          autoCorrect={false}
          value={usuario}
          onChangeText={setUsuario}
        />

        <Text style={styles.label}>Instituição / Escola</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: IF Sertão-PE"
          value={instituicao}
          onChangeText={setInstituicao}
        />

        <Text style={styles.label}>Senha</Text>
        <TextInput
          style={styles.input}
          placeholder="Sua senha secreta"
          secureTextEntry
          value={senha}
          onChangeText={setSenha}
        />

        <TouchableOpacity
          style={styles.button}
          onPress={handleCadastro}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Finalizar Cadastro</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: Colors.background, padding: 30 },
  backBtn: { marginTop: 40, marginBottom: 20 },
  title: { fontSize: 32, fontWeight: "900", color: Colors.primary },
  subtitle: { fontSize: 14, color: Colors.textLight, marginBottom: 30 },
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
  },
  button: {
    backgroundColor: Colors.primary,
    padding: 18,
    borderRadius: 15,
    alignItems: "center",
    marginTop: 20,
  },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});
