import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

const THEME_KEY = "@osi_theme";

export type ThemeColors = {
  bg: string;
  text: string;
  textLight: string;
  card: string;
  border: string;
  inputBg: string;
  primary: string;
};

type ThemeContextType = {
  isDark: boolean;
  toggleTheme: () => void;
  colors: ThemeColors;
};

const light: ThemeColors = {
  bg: "#F9FAFB",
  text: "#111827",
  textLight: "#6B7280",
  card: "#FFFFFF",
  border: "#E2E8F0",
  inputBg: "#FFFFFF",
  primary: "#059669",
};

const dark: ThemeColors = {
  bg: "#0F172A",
  text: "#F1F5F9",
  textLight: "#94A3B8",
  card: "#1E293B",
  border: "#334155",
  inputBg: "#1E293B",
  primary: "#059669",
};

const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  toggleTheme: () => {},
  colors: light,
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((val) => {
      if (val === "dark") setIsDark(true);
    });
  }, []);

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      AsyncStorage.setItem(THEME_KEY, next ? "dark" : "light");
      return next;
    });
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, colors: isDark ? dark : light }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
