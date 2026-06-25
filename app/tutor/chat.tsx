import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { aiService } from "../../src/services/aiService";
import { Colors } from "../../src/styles/colors";

interface Message {
  id: string;
  text: string;
  from: "user" | "ai";
}

export default function TutorChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Olá! Sou Ciel. Qual assunto conversaremos hoje?",
      from: "ai",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text: input,
      from: "user",
    };
    setMessages((prev) => [...prev, userMsg]);
    const userPrompt = input;
    setInput("");
    setLoading(true);

    try {
      const response = await aiService.askGemini(userPrompt, 800);

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: response,
        from: "ai",
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Conversar com o Sal</Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20 }}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        renderItem={({ item }) => (
          <View
            style={[
              styles.bubble,
              item.from === "user" ? styles.userBubble : styles.aiBubble,
            ]}
          >
            <Text
              style={[
                styles.msgText,
                item.from === "user"
                  ? { color: "#fff" }
                  : { color: Colors.text },
              ]}
            >
              {item.text}
            </Text>
          </View>
        )}
      />

      <View style={styles.inputArea}>
        <TextInput
          style={styles.input}
          placeholder="Sua dúvida..."
          value={input}
          onChangeText={setInput}
          editable={!loading}
        />
        <TouchableOpacity
          style={[styles.sendBtn, loading && { opacity: 0.5 }]}
          onPress={sendMessage}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Ionicons name="send" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    paddingTop: 60,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  title: { fontSize: 18, fontWeight: "bold", color: Colors.text },
  bubble: { padding: 15, borderRadius: 20, marginBottom: 10, maxWidth: "85%" },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 2,
  },
  aiBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#fff",
    borderBottomLeftRadius: 2,
    elevation: 1,
  },
  msgText: { fontSize: 15, lineHeight: 22 },
  inputArea: {
    flexDirection: "row",
    padding: 15,
    backgroundColor: "#fff",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  input: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    borderRadius: 25,
    paddingHorizontal: 20,
    height: 50,
    color: "#000",
  },
  sendBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
});
