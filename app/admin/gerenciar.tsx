import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../src/services/supabase";
import { Colors } from "../../src/styles/colors";

export default function GerenciarSimulados() {
  const [simulados, setSimulados] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados para Criar Simulado
  const [modalVisible, setModalVisible] = useState(false);
  const [novoTitulo, setNovoTitulo] = useState("");
  const [novaMateria, setNovaMateria] = useState("");
  const [novaUrl, setNovaUrl] = useState("");

  const fetchSimulados = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("simulados")
      .select("*")
      .order("created_at", { ascending: false });
    setSimulados(data || []);
    setLoading(false);
  };

  const handleCriarSimulado = async () => {
    if (!novoTitulo || !novaMateria)
      return Alert.alert("Erro", "Título e Matéria são obrigatórios.");

    const { error } = await supabase.from("simulados").insert([
      {
        titulo: novoTitulo,
        materia: novaMateria,
        url_google_forms: novaUrl || null,
      },
    ]);

    if (!error) {
      setModalVisible(false);
      setNovoTitulo("");
      setNovaMateria("");
      setNovaUrl("");
      fetchSimulados();
      Alert.alert("Sucesso", "Simulado criado!");
    } else {
      Alert.alert("Erro", error.message);
    }
  };

  useEffect(() => {
    fetchSimulados();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Simulados e Pastas</Text>
        <TouchableOpacity onPress={fetchSimulados}>
          <Ionicons name="refresh" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* MODAL PARA NOVO SIMULADO */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Novo Simulado</Text>
            <TextInput
              style={styles.input}
              placeholder="Título do Simulado"
              value={novoTitulo}
              onChangeText={setNovoTitulo}
            />
            <TextInput
              style={styles.input}
              placeholder="Matéria (Ex: Redes, Hardware)"
              value={novaMateria}
              onChangeText={setNovaMateria}
            />
            <TextInput
              style={styles.input}
              placeholder="URL Google Forms (Opcional)"
              value={novaUrl}
              onChangeText={setNovaUrl}
            />

            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: "#ccc" }]}
                onPress={() => setModalVisible(false)}
              >
                <Text>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: Colors.primary }]}
                onPress={handleCriarSimulado}
              >
                <Text style={{ color: "#fff" }}>Criar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {loading ? (
        <ActivityIndicator
          size="large"
          color={Colors.primary}
          style={{ marginTop: 50 }}
        />
      ) : (
        <FlatList
          data={simulados}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: 20 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{item.titulo}</Text>
                <Text style={styles.cardMateria}>
                  {item.materia} {item.url_google_forms && "🔗"}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: "/admin/cadastrar-questao",
                    params: { simuladoId: item.id },
                  } as any)
                }
              >
                <Ionicons name="add-circle" size={34} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingTop: 60,
    padding: 25,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  title: { fontSize: 20, fontWeight: "bold", color: Colors.text },
  card: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 20,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: "bold", color: Colors.text },
  cardMateria: { fontSize: 12, color: Colors.textLight },
  fab: {
    position: "absolute",
    right: 25,
    bottom: 25,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: { backgroundColor: "#fff", padding: 25, borderRadius: 20 },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
  },
  btn: { flex: 1, padding: 15, borderRadius: 10, alignItems: "center" },
});
