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
import { supabase } from "../src/services/supabase";
import { Colors } from "../src/styles/colors";

export default function Cadastro() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState(""); // Novo campo necessário
  const [usuario, setUsuario] = useState("");
  const [instituicao, setInstituicao] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCadastro = async () => {
    // 1. Validação de campos vazios
    if (!nome || !usuario || !senha || !instituicao || !email) {
      Alert.alert("Aviso", "Por favor, preencha todos os campos.");
      return;
    }

    setLoading(true);

    // 2. Lógica de Domínio Institucional
    const isDocente = email.toLowerCase().trim().endsWith("@ifsertaope.edu.br");
    const targetTable = isDocente ? "docentes" : "usuarios";

    try {
      // 3. Verifica se o nome de usuário já existe na tabela de destino
      const { data: userExists } = await supabase
        .from(targetTable)
        .select("usuario")
        .eq("usuario", usuario.toLowerCase().trim())
        .single();

      if (userExists) {
        Alert.alert("Erro", "Este nome de usuário já está em uso.");
        setLoading(false);
        return;
      }

      // 4. Insere o novo usuário/docente
      const insertData: any = {
        usuario: usuario.toLowerCase().trim(),
        senha,
        email: email.toLowerCase().trim(),
      };

      // Se for aluno, adicionamos os campos extras de aluno
      if (!isDocente) {
        insertData.nome = nome;
        insertData.instituicao = instituicao;
        insertData.pontuacao = 0;
      } else {
        // Se for docente, usamos o campo de nome que estiver na sua tabela de docentes
        insertData.usuario = usuario; // ou nome, dependendo da sua coluna na tabela docentes
      }

      const { error } = await supabase.from(targetTable).insert([insertData]);

      if (error) throw error;

      Alert.alert(
        "Sucesso!",
        isDocente
          ? "Cadastro docente realizado! Bem-vindo, professor."
          : "Sua conta de aluno na OSI foi criada!",
      );
      router.replace("/");
    } catch (error: any) {
      Alert.alert("Erro ao cadastrar", error.message);
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
      <Text style={styles.subtitle}>
        {email.toLowerCase().endsWith("@ifsertaope.edu.br")
          ? "Identificamos um e-mail institucional (Docente) 🎓"
          : "Junte-se à Olimpíada Salgueirense de Informática 💻"}
      </Text>

      <View style={styles.form}>
        <Text style={styles.label}>Nome Completo</Text>
        <TextInput
          style={styles.input}
          placeholder="Seu nome"
          value={nome}
          onChangeText={setNome}
        />

        <Text style={styles.label}>
          E-mail (Use o institucional se for prof.)
        </Text>
        <TextInput
          style={styles.input}
          placeholder="exemplo@email.com"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <Text style={styles.label}>Usuário (Login)</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: joao_osi"
          autoCapitalize="none"
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
