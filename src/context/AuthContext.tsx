import React, { createContext, useContext, useEffect, useState } from "react";
import { authService } from "../services/auth";

interface AuthContextType {
  usuario: any;
  setUsuario: (usuario: any) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<any>(undefined);

  useEffect(() => {
    authService
      .getUser()
      .then((user) => setUsuario(user ?? null))
      .catch(() => setUsuario(null));
  }, []);

  return (
    <AuthContext.Provider value={{ usuario, setUsuario }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  }
  return context;
}
