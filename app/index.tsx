import { router } from "expo-router";
import React, { useEffect, useState } from "react";
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
import { supabase } from "../src/services/supabase";
import { Colors } from "../src/styles/colors";

export default function Login() {
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        authService.getUser().then((storedUser) => {
          if (storedUser) {
            router.replace(storedUser.role === "admin" ? "/admin" : "/(tabs)");
          }
        });
      }
    });
    authService.getUser().then((session) => {
      if (session) {
        router.replace(session.role === "admin" ? "/admin" : "/(tabs)");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async () => {
    if (!user || !password) return Alert.alert("Aviso", "Preencha tudo!");
    setLoading(true);

    // Login Admin Rápido
    if (user === "admin" && password === "osi2026") {
      await authService.saveUser({ usuario: "Professor", role: "admin" });
      router.replace("/admin");
      return;
    }

    const { data, error } = await supabase
      .from("usuarios")
      .select("*")
      .eq("usuario", user.toLowerCase().trim())
      .eq("senha", password)
      .single();

    setLoading(false);

    if (data) {
      await authService.saveUser({ ...data, role: "user" });
      router.replace("/(tabs)");
    } else {
      Alert.alert("Erro", "Usuário ou senha incorretos.");
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
        onPress={() => router.push("./cadastro")}
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
