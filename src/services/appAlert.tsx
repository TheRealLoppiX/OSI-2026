import React, { useEffect, useState } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "../context/ThemeContext";

type AppAlertButtonStyle = "default" | "cancel" | "destructive";

export type AppAlertButton = {
  text: string;
  onPress?: () => void;
  style?: AppAlertButtonStyle;
};

type AlertState = {
  title: string;
  message?: string;
  buttons: AppAlertButton[];
};

type Listener = (state: AlertState | null) => void;
let listener: Listener | null = null;

// Substituto temático do Alert.alert nativo (que ignora o tema claro/escuro do
// app). Mesma assinatura de Alert.alert para minimizar a migração nas telas.
export const appAlert = {
  alert(title: string, message?: string, buttons?: AppAlertButton[]) {
    listener?.({
      title,
      message,
      buttons: buttons && buttons.length > 0 ? buttons : [{ text: "OK" }],
    });
  },
};

export function AppAlertProvider() {
  const [state, setState] = useState<AlertState | null>(null);
  const { colors } = useTheme();

  useEffect(() => {
    listener = setState;
    return () => {
      listener = null;
    };
  }, []);

  if (!state) return null;

  const handlePress = (btn: AppAlertButton) => {
    setState(null);
    btn.onPress?.();
  };

  return (
    <Modal transparent visible animationType="fade" onRequestClose={() => setState(null)}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>{state.title}</Text>
          {!!state.message && (
            <Text style={[styles.message, { color: colors.textLight }]}>{state.message}</Text>
          )}
          <View style={styles.buttonsRow}>
            {state.buttons.map((btn, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => handlePress(btn)}
                style={styles.button}
                accessibilityRole="button"
                accessibilityLabel={btn.text}
              >
                <Text
                  style={[
                    styles.buttonText,
                    btn.style === "destructive"
                      ? { color: "#EF4444", fontWeight: "bold" }
                      : btn.style === "cancel"
                        ? { color: colors.textLight }
                        : { color: colors.primary, fontWeight: "bold" },
                  ]}
                >
                  {btn.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    elevation: 10,
  },
  title: { fontSize: 17, fontWeight: "bold", marginBottom: 8 },
  message: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
  buttonsRow: { flexDirection: "row", justifyContent: "flex-end", gap: 20 },
  button: { paddingVertical: 6, paddingHorizontal: 4 },
  buttonText: { fontSize: 15 },
});
