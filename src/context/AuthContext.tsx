import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { authService } from "../services/auth";
import { registerForPushNotificationsAsync } from "../services/notificationService";

interface AuthContextType {
  usuario: any;
  setUsuario: (usuario: any) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<any>(undefined);
  const pushRegistradoParaId = useRef<string | null>(null);

  useEffect(() => {
    authService
      .getUser()
      .then((user) => setUsuario(user ?? null))
      .catch(() => setUsuario(null));
  }, []);

  useEffect(() => {
    if (!usuario?.id || pushRegistradoParaId.current === usuario.id) return;
    pushRegistradoParaId.current = usuario.id;
    registerForPushNotificationsAsync(usuario.id).catch((err) => {
      console.error("Erro ao registrar push token:", err);
    });
  }, [usuario]);

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
