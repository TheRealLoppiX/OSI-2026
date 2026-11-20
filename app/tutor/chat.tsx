import { Ionicons } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Text, TextInput } from "../../components/AppText";
import Animated, { useAnimatedKeyboard, useAnimatedStyle } from "react-native-reanimated";
import MarkdownText from "../../components/MarkdownText";
import { aiService } from "../../src/services/aiService";
import { ScreenHeader } from "../../components/ScreenHeader";
import { SpeakButton } from "../../components/SpeakButton";
import { useTheme, useThemedStyles, type ThemeColors } from "../../src/context/ThemeContext";
import { appAlert } from "../../src/services/appAlert";
import { friendlyError } from "../../src/utils/friendlyError";

interface Message {
  id: string;
  text: string;
  from: "user" | "ai";
}

export default function TutorChat() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
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
  // loading é state (não commita antes do próximo render), então dois toques
  // rápidos no botão de enviar passavam pela checagem abaixo antes do
  // primeiro setLoading(true) surtir efeito. Trava síncrona via ref.
  const enviandoRef = useRef(false);

  const gerarId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  // Segue a altura real do teclado nativo (funciona com edge-to-edge no Android,
  // onde o KeyboardAvoidingView/windowSoftInputMode clássico não empurra a tela).
  const keyboard = useAnimatedKeyboard();
  const keyboardStyle = useAnimatedStyle(() => ({
    paddingBottom: keyboard.height.value,
  }));

  const sendMessage = async () => {
    if (!input.trim() || loading || enviandoRef.current) return;
    enviandoRef.current = true;

    const userMsg: Message = { id: gerarId(), text: input, from: "user" };
    setMessages((prev) => [...prev, userMsg]);
    const userPrompt = input;
    setInput("");
    setLoading(true);

    try {
      const response = await aiService.askGemini(userPrompt, 1200);
      const aiMsg: Message = { id: gerarId(), text: response, from: "ai" };
      setMessages((prev) => [...prev, aiMsg]);
      AccessibilityInfo.announceForAccessibility("OSIA respondeu.");
    } catch (error) {
      appAlert.alert("Erro", friendlyError(error, "OSIA não conseguiu responder agora. Tente novamente."));
    } finally {
      setLoading(false);
      enviandoRef.current = false;
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Conversar com OSIA" />

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
                  : { alignSelf: "flex-start", backgroundColor: colors.card, borderBottomLeftRadius: 2, borderWidth: 1, borderColor: colors.border },
              ]}
            >
              {item.from === "ai" ? (
                <>
                  <MarkdownText>{item.text}</MarkdownText>
                  <View style={{ marginTop: 8 }}>
                    <SpeakButton texto={item.text} rotulo="resposta da OSIA" compacto />
                  </View>
                </>
              ) : (
                <Text style={[styles.msgText, { color: colors.onPrimary }]}>{item.text}</Text>
              )}
            </View>
          )}
        />

        <View style={[styles.inputArea, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.bg, color: colors.text }]}
            placeholder="Sua dúvida..."
            placeholderTextColor={colors.textMuted}
            accessibilityLabel="Digite sua dúvida para a OSIA"
            multiline
            maxLength={1000}
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
              <ActivityIndicator color={colors.onPrimary} size="small" />
            ) : (
              <Ionicons name="send" size={20} color={colors.onPrimary} />
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const createStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
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
  input: { flex: 1, borderRadius: 25, paddingHorizontal: 20, paddingVertical: 12, minHeight: 50, maxHeight: 140, borderWidth: 1, borderColor: c.border },
  sendBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
});
