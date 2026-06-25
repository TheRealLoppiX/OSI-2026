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
import { authService } from "../src/services/auth";
import { usePageReady } from "../src/context/NavigationLoadingContext";
import { Colors } from "../src/styles/colors";

export default function Login() {
  usePageReady();
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!user || !password) {
      Alert.alert("Atenção", "Preencha todos os campos.");
      return;
    }

    try {
      setLoading(true);

      // Usando o authService correto
      const loggedUser = await authService.logarAluno(user, password);

      // Apontando para o '/(tabs)/home' após o login com sucesso
      router.replace(loggedUser.role === "admin" ? "/admin" : "/(tabs)/home");
    } catch (error: any) {
      Alert.alert(
        "Erro no Login",
        error.message || "Usuário ou senha inválidos.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>OSI 2026</Text>

      <TextInput
        style={styles.input}
        placeholder="Usuário"
        value={user}
        onChangeText={setUser}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <TextInput
        style={styles.input}
        placeholder="Senha"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity
        style={styles.button}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Entrar</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.signupBtn}
        onPress={() => router.push("/cadastro")}
      >
        <Text style={styles.signupText}>
          Ainda não tem conta?{" "}
          <Text style={{ color: Colors.primary, fontWeight: "bold" }}>
            Cadastre-se
          </Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 30,
    backgroundColor: Colors.background,
  },
  logo: {
    fontSize: 48,
    fontWeight: "900",
    color: Colors.primary,
    textAlign: "center",
    marginBottom: 50,
  },
  input: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  button: {
    backgroundColor: Colors.primary,
    padding: 18,
    borderRadius: 15,
    alignItems: "center",
    marginTop: 10,
    elevation: 3,
  },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  signupBtn: { marginTop: 25, alignItems: "center" },
  signupText: { color: Colors.textLight, fontSize: 14 },
});
