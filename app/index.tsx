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
import { useAuth } from "../src/context/AuthContext";
import { useTheme } from "../src/context/ThemeContext";
import { authService } from "../src/services/auth";
import { useNavigationLoading, usePageReady } from "../src/context/NavigationLoadingContext";
import { appAlert } from "../src/services/appAlert";
import { friendlyError } from "../src/utils/friendlyError";

export default function Login() {
  usePageReady();
  const { startNavigation } = useNavigationLoading();
  const { colors, isDark, toggleTheme } = useTheme();
  const { setUsuario } = useAuth();
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!user || !password) {
      appAlert.alert("Atenção", "Preencha todos os campos.");
      return;
    }
    try {
      setLoading(true);
      const loggedUser = await authService.logarAluno(user, password);
      setUsuario(loggedUser);
      startNavigation();
      router.replace(loggedUser.role === "admin" ? "/admin" : "/(tabs)/home");
    } catch (error: any) {
      appAlert.alert(
        "Erro no Login",
        friendlyError(error, "Usuário ou senha inválidos."),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <TouchableOpacity
        style={styles.themeBtn}
        onPress={toggleTheme}
        accessibilityRole="button"
        accessibilityLabel={isDark ? "Ativar tema claro" : "Ativar tema escuro"}
      >
        <Ionicons
          name={isDark ? "sunny-outline" : "moon-outline"}
          size={24}
          color={colors.textLight}
        />
      </TouchableOpacity>

      <Text style={[styles.logo, { color: colors.primary }]}>OSI 2026</Text>

      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.inputBg,
            borderColor: colors.border,
            color: colors.text,
          },
        ]}
        placeholder="Usuário"
        placeholderTextColor={colors.textLight}
        value={user}
        onChangeText={setUser}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.inputBg,
            borderColor: colors.border,
            color: colors.text,
          },
        ]}
        placeholder="Senha"
        placeholderTextColor={colors.textLight}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.primary }]}
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
        <Text style={[styles.signupText, { color: colors.textLight }]}>
          Ainda não tem conta?{" "}
          <Text style={{ color: colors.primary, fontWeight: "bold" }}>
            Cadastre-se
          </Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 30 },
  themeBtn: { position: "absolute", top: 60, right: 30 },
  logo: {
    fontSize: 48,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 50,
  },
  input: {
    padding: 18,
    borderRadius: 15,
    marginBottom: 15,
    borderWidth: 1,
  },
  button: {
    padding: 18,
    borderRadius: 15,
    alignItems: "center",
    marginTop: 10,
    elevation: 3,
  },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  signupBtn: { marginTop: 25, alignItems: "center" },
  signupText: { fontSize: 14 },
});
