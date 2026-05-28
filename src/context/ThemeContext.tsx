import React, { createContext, useContext, useState } from "react";

const ThemeContext = createContext({
  isDark: false,
  toggleTheme: () => {},
  colors: {
    bg: "#F5F5F5",
    text: "#333",
    card: "#FFF",
    primary: "#005F27",
  },
});

export const ThemeProvider = ({ children }: any) => {
  const [isDark, setIsDark] = useState(false);

  const colors = {
    bg: isDark ? "#121212" : "#F5F5F5",
    text: isDark ? "#FFF" : "#333",
    card: isDark ? "#1E1E1E" : "#FFF",
    primary: "#005F27",
  };

  const toggleTheme = () => setIsDark(!isDark);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
