import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { authService } from "../src/services/auth";
import { supabase } from "../src/services/supabase";
import { useAuth } from "../src/context/AuthContext";
import { usePageReady } from "../src/context/NavigationLoadingContext";
import { useTheme } from "../src/context/ThemeContext";
import { cadastroSchema } from "../src/schemas/authSchema";

type Step = "form" | "otp";

export default function Cadastro() {
  usePageReady();
  const { colors } = useTheme();
  const { setUsuario: setUsuarioLogado } = useAuth();

  const [step, setStep] = useState<Step>("form");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [usuario, setUsuario] = useState("");
  const [instituicao, setInstituicao] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSenha, setShowSenha] = useState(false);
  const [instituicoes, setInstituicoes] = useState<any[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);

  const otpRef = useRef<TextInput>(null);

  useEffect(() => {
    supabase
      .from("instituicoes")
      .select("nome, sigla")
      .order("nome")
      .then(({ data }) => setInstituicoes(data || []));
  }, []);

  const handleEnviarCodigo = async () => {
    const validacao = cadastroSchema.safeParse({ nome, email, usuario, instituicao, senha });
    if (!validacao.success) {
      return Alert.alert("Atenção", validacao.error.issues[0].message);
    }
    if (senha !== confirmarSenha) {
      return Alert.alert("Atenção", "As senhas não coincidem.");
    }

    try {
      setLoading(true);
      const senhaCriptografada = authService.hashSenha(senha);

      const { error } = await supabase.functions.invoke("enviar-otp", {
        body: {
          email: email.toLowerCase().trim(),
          nome: nome.trim(),
          usuario: usuario.trim(),
          instituicao: instituicao.trim(),
          senhaCriptografada,
        },
      });

      if (error) throw new Error(error.message);

      setStep("otp");
      setTimeout(() => otpRef.current?.focus(), 300);
    } catch (err: any) {
      Alert.alert("Erro", err.message || "Não foi possível enviar o código.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerificarOtp = async () => {
    if (otp.length !== 6) return Alert.alert("Atenção", "Digite os 6 dígitos do código.");

    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("verificar-otp", {
        body: { email: email.toLowerCase().trim(), otp },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      await authService.saveUser(data.user);
      setUsuarioLogado(data.user);
      router.replace("/(tabs)/home");
    } catch (err: any) {
      Alert.alert("Código inválido", err.message || "Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleReenviar = async () => {
    setOtp("");
    setStep("form");
  };

  const inputStyle = [
    styles.input,
    { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text },
  ];

  if (step === "otp") {
    return (
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.bg }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <TouchableOpacity style={styles.backBtn} onPress={handleReenviar}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.otpHeader}>
            <View style={[styles.otpIconBox, { backgroundColor: colors.card }]}>
              <Ionicons name="mail" size={32} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.primary }]}>Verifique seu e-mail</Text>
            <Text style={[styles.otpSubtitle, { color: colors.textLight }]}>
              Enviamos um código de 6 dígitos para{"\n"}
              <Text style={{ color: colors.primary, fontWeight: "bold" }}>{email}</Text>
            </Text>
          </View>

          <View style={styles.form}>
            <Text style={[styles.label, { color: colors.text }]}>Código de Verificação</Text>
            <TextInput
              ref={otpRef}
              style={[
                styles.otpInput,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.primary,
                  color: colors.text,
                },
              ]}
              placeholder="000000"
              placeholderTextColor={colors.textLight}
              keyboardType="number-pad"
              maxLength={6}
              value={otp}
              onChangeText={setOtp}
              textAlign="center"
            />

            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.primary }, loading && { opacity: 0.7 }]}
              onPress={handleVerificarOtp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Criar Conta</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.resendBtn} onPress={handleReenviar}>
              <Text style={[styles.resendText, { color: colors.textLight }]}>
                Não recebeu?{" "}
                <Text style={{ color: colors.primary, fontWeight: "bold" }}>Reenviar código</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <Text style={[styles.title, { color: colors.primary }]}>Criar Conta</Text>
        <Text style={[styles.subtitle, { color: colors.textLight }]}>
          Preencha seus dados para participar da OSI 2026
        </Text>

        <View style={styles.form}>
          <Text style={[styles.label, { color: colors.text }]}>Nome Completo</Text>
          <TextInput
            style={inputStyle}
            placeholder="Seu nome completo"
            placeholderTextColor={colors.textLight}
            value={nome}
            onChangeText={setNome}
          />

          <Text style={[styles.label, { color: colors.text }]}>E-mail</Text>
          <TextInput
            style={inputStyle}
            placeholder="seu@email.com"
            placeholderTextColor={colors.textLight}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={setEmail}
          />

          <Text style={[styles.label, { color: colors.text }]}>Usuário (Login)</Text>
          <TextInput
            style={inputStyle}
            placeholder="Ex: joao_osi"
            placeholderTextColor={colors.textLight}
            autoCapitalize="none"
            autoCorrect={false}
            value={usuario}
            onChangeText={setUsuario}
          />

          <Text style={[styles.label, { color: colors.text }]}>Instituição / Escola</Text>
          {instituicoes.length > 0 ? (
            <>
              <TouchableOpacity
                style={[inputStyle, styles.pickerBtn]}
                onPress={() => setPickerVisible(true)}
              >
                <Text style={{ color: instituicao ? colors.text : colors.textLight, fontSize: 15, flex: 1 }}>
                  {instituicao || "Selecione sua instituição"}
                </Text>
                <Ionicons name="chevron-down" size={18} color={colors.textLight} />
              </TouchableOpacity>

              <Modal visible={pickerVisible} transparent animationType="fade">
                <TouchableOpacity
                  style={styles.pickerOverlay}
                  activeOpacity={1}
                  onPress={() => setPickerVisible(false)}
                >
                  <View style={[styles.pickerSheet, { backgroundColor: colors.card }]}>
                    <Text style={[styles.pickerTitle, { color: colors.text }]}>Selecione a Instituição</Text>
                    <FlatList
                      data={instituicoes}
                      keyExtractor={(item) => item.nome}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={[
                            styles.pickerItem,
                            { borderBottomColor: colors.border },
                            instituicao === item.nome && { backgroundColor: colors.primary + "15" },
                          ]}
                          onPress={() => { setInstituicao(item.nome); setPickerVisible(false); }}
                        >
                          <Text style={[styles.pickerItemNome, { color: colors.text }]}>{item.nome}</Text>
                          {item.sigla ? (
                            <Text style={[styles.pickerItemSigla, { color: colors.textLight }]}>{item.sigla}</Text>
                          ) : null}
                          {instituicao === item.nome && (
                            <Ionicons name="checkmark" size={18} color={colors.primary} />
                          )}
                        </TouchableOpacity>
                      )}
                    />
                  </View>
                </TouchableOpacity>
              </Modal>
            </>
          ) : (
            <TextInput
              style={inputStyle}
              placeholder="Ex: IF Sertão-PE"
              placeholderTextColor={colors.textLight}
              value={instituicao}
              onChangeText={setInstituicao}
            />
          )}

          <Text style={[styles.label, { color: colors.text }]}>Senha</Text>
          <View style={styles.senhaRow}>
            <TextInput
              style={[...inputStyle, { flex: 1, marginBottom: 0 }]}
              placeholder="Mínimo 6 caracteres"
              placeholderTextColor={colors.textLight}
              secureTextEntry={!showSenha}
              value={senha}
              onChangeText={setSenha}
            />
            <TouchableOpacity onPress={() => setShowSenha((v) => !v)} style={styles.eyeBtn}>
              <Ionicons name={showSenha ? "eye-off" : "eye"} size={20} color={colors.textLight} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.label, { color: colors.text }]}>Confirmar Senha</Text>
          <TextInput
            style={inputStyle}
            placeholder="Repita a senha"
            placeholderTextColor={colors.textLight}
            secureTextEntry={!showSenha}
            value={confirmarSenha}
            onChangeText={setConfirmarSenha}
          />

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }, loading && { opacity: 0.7 }]}
            onPress={handleEnviarCodigo}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.buttonText}>Enviar Código de Verificação</Text>
                <Ionicons name="mail-outline" size={18} color="#fff" />
              </>
            )}
          </TouchableOpacity>

          <Text style={[styles.disclaimer, { color: colors.textLight }]}>
            Um código de 6 dígitos será enviado ao seu e-mail para confirmar o cadastro.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: 30 },
  backBtn: { marginTop: 40, marginBottom: 20 },
  title: { fontSize: 30, fontWeight: "900" },
  subtitle: { fontSize: 14, marginBottom: 30, marginTop: 6 },
  form: { width: "100%" },
  label: { fontSize: 14, fontWeight: "bold", marginBottom: 5, marginTop: 12 },
  input: {
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 4,
    fontSize: 15,
  },
  senhaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  eyeBtn: { padding: 10 },
  button: {
    padding: 18,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 24,
  },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  disclaimer: { fontSize: 12, textAlign: "center", marginTop: 16, lineHeight: 18 },
  otpHeader: { alignItems: "center", marginBottom: 36, marginTop: 20 },
  otpIconBox: {
    width: 72,
    height: 72,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  otpSubtitle: { fontSize: 14, textAlign: "center", lineHeight: 22, marginTop: 8 },
  otpInput: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: 12,
    marginBottom: 8,
    textAlign: "center",
  },
  resendBtn: { marginTop: 20, alignItems: "center" },
  resendText: { fontSize: 14 },
  pickerBtn: { flexDirection: "row", alignItems: "center" },
  pickerOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  pickerSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "60%" },
  pickerTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 14 },
  pickerItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 10,
  },
  pickerItemNome: { flex: 1, fontSize: 14 },
  pickerItemSigla: { fontSize: 12 },
});
