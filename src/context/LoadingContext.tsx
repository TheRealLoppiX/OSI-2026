import React, { createContext, useContext, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  Text,
  View,
} from "react-native";

interface LoadingContextData {
  showLoading: (texto?: string) => void;
  hideLoading: () => void;
}

const LoadingContext = createContext<LoadingContextData>(
  {} as LoadingContextData,
);
const { width, height } = Dimensions.get("window");

export const LoadingProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [visible, setVisible] = useState(false);
  const [texto, setTexto] = useState("Carregando...");

  const showLoading = (novoTexto = "Carregando...") => {
    setTexto(novoTexto);
    setVisible(true);
  };

  const hideLoading = () => {
    setVisible(false);
  };

  return (
    <LoadingContext.Provider value={{ showLoading, hideLoading }}>
      {children}

      {/* Tela de loading absoluta super simples e leve */}
      {visible && (
        <View style={styles.overlay}>
          <View style={styles.caixa}>
            <ActivityIndicator size="large" color="#0066CC" />
            <Text style={styles.texto}>{texto}</Text>
          </View>
        </View>
      )}
    </LoadingContext.Provider>
  );
};

export const useLoading = () => useContext(LoadingContext);

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: width,
    height: height,
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  caixa: {
    padding: 20,
    borderRadius: 10,
    backgroundColor: "#fff",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  texto: {
    marginTop: 15,
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
});
