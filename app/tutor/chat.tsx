import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { useAnimatedKeyboard, useAnimatedStyle } from "react-native-reanimated";
import { aiService } from "../../src/services/aiService";
import { useTheme } from "../../src/context/ThemeContext";
import { appAlert } from "../../src/services/appAlert";
import { friendlyError } from "../../src/utils/friendlyError";

interface Message {
  id: string;
  text: string;
  from: "user" | "ai";
}

export default function TutorChat() {
  const { colors } = useTheme();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Olá! Sou OSIA, assistente de estudos da OSI. Qual tema de TI vamos explorar hoje?",
      from: "ai",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Segue a altura real do teclado nativo (funciona com edge-to-edge no Android,
  // onde o KeyboardAvoidingView/windowSoftInputMode clássico não empurra a tela).
  const keyboard = useAnimatedKeyboard();
  const keyboardStyle = useAnimatedStyle(() => ({
    paddingBottom: keyboard.height.value,
  }));

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMsg: Message = { id: Date.now().toString(), text: input, from: "user" };
    setMessages((prev) => [...prev, userMsg]);
    const userPrompt = input;
    setInput("");
    setLoading(true);

    try {
      const response = await aiService.askGemini(userPrompt, 800);
      const aiMsg: Message = { id: (Date.now() + 1).toString(), text: response, from: "ai" };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (error) {
      appAlert.alert("Erro", friendlyError(error, "OSIA não conseguiu responder agora. Tente novamente."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Conversar com OSIA</Text>
      </View>

      <Animated.View style={[styles.keyboardArea, keyboardStyle]}>
        <FlatList
          ref={flatListRef}
          style={styles.messagesList}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20 }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
          renderItem={({ item }) => (
            <View
              style={[
                styles.bubble,
                item.from === "user"
                  ? { alignSelf: "flex-end", backgroundColor: colors.primary, borderBottomRightRadius: 2 }
                  : { alignSelf: "flex-start", backgroundColor: colors.card, borderBottomLeftRadius: 2, elevation: 1 },
              ]}
            >
              <Text style={[styles.msgText, { color: item.from === "user" ? "#fff" : colors.text }]}>
                {item.text}
              </Text>
            </View>
          )}
        />

        <View style={[styles.inputArea, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.bg, color: colors.text }]}
            placeholder="Sua dúvida..."
            placeholderTextColor={colors.textLight}
            value={input}
            onChangeText={setInput}
            editable={!loading}
          />
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: colors.primary }, loading && { opacity: 0.5 }]}
            onPress={sendMessage}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Enviar mensagem"
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 60,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    borderBottomWidth: 1,
  },
  title: { fontSize: 18, fontWeight: "bold" },
  keyboardArea: { flex: 1 },
  messagesList: { flex: 1 },
  bubble: { padding: 15, borderRadius: 20, marginBottom: 10, maxWidth: "85%" },
  msgText: { fontSize: 15, lineHeight: 22 },
  inputArea: {
    flexDirection: "row",
    padding: 15,
    alignItems: "center",
    borderTopWidth: 1,
  },
  input: { flex: 1, borderRadius: 25, paddingHorizontal: 20, height: 50 },
  sendBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
});
