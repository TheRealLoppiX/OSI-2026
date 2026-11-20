import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { AccessibilityInfo } from "react-native";

const PREFS_KEY = "@osi_acessibilidade";

export const ESCALAS_FONTE = [
  { valor: 0.85, nome: "Pequena" },
  { valor: 1, nome: "Padrão" },
  { valor: 1.15, nome: "Média" },
  { valor: 1.3, nome: "Grande" },
  { valor: 1.5, nome: "Muito grande" },
] as const;

export type AccessibilityPrefs = {
  /** Multiplicador aplicado sobre o tamanho de todos os textos do app */
  fontScale: number;
  boldText: boolean;
  /** Fonte Atkinson Hyperlegible, feita para leitores com baixa visão */
  legibleFont: boolean;
  /** "sistema" segue a configuração de acessibilidade do aparelho */
  reduceMotion: "sistema" | "sim" | "nao";
  /** Mostra botões de ouvir (texto em voz) em questões e respostas da OSIA */
  readAloud: boolean;
};

const PADRAO: AccessibilityPrefs = {
  fontScale: 1,
  boldText: false,
  legibleFont: false,
  reduceMotion: "sistema",
  readAloud: false,
};

type AccessibilityContextType = AccessibilityPrefs & {
  /** reduceMotion já resolvido contra o sistema */
  motionReduced: boolean;
  update: (patch: Partial<AccessibilityPrefs>) => void;
  reset: () => void;
};

const AccessibilityContext = createContext<AccessibilityContextType>({
  ...PADRAO,
  motionReduced: false,
  update: () => {},
  reset: () => {},
});

export const AccessibilityProvider = ({ children }: { children: React.ReactNode }) => {
  const [prefs, setPrefs] = useState<AccessibilityPrefs>(PADRAO);
  const [sistemaReduz, setSistemaReduz] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(PREFS_KEY)
      .then((val) => {
        if (val) setPrefs({ ...PADRAO, ...JSON.parse(val) });
      })
      .catch(() => {});
    AccessibilityInfo.isReduceMotionEnabled().then(setSistemaReduz).catch(() => {});
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setSistemaReduz);
    return () => sub.remove();
  }, []);

  const value = useMemo<AccessibilityContextType>(() => {
    const salvar = (next: AccessibilityPrefs) => {
      setPrefs(next);
      AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next)).catch(() => {});
    };
    return {
      ...prefs,
      motionReduced: prefs.reduceMotion === "sistema" ? sistemaReduz : prefs.reduceMotion === "sim",
      update: (patch) => salvar({ ...prefs, ...patch }),
      reset: () => salvar(PADRAO),
    };
  }, [prefs, sistemaReduz]);

  return <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>;
};

export const useAccessibility = () => useContext(AccessibilityContext);
