import React, { createContext, useContext, useRef, useState } from "react";

interface NavLoadingContextData {
  isLoading: boolean;
  startNavigation: () => void;
  pageReady: () => void;
}

const NavigationLoadingContext = createContext<NavLoadingContextData>({
  isLoading: false,
  startNavigation: () => {},
  pageReady: () => {},
});

const SAFETY_TIMEOUT_MS = 6000;

export function NavigationLoadingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const safetyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startNavigation = () => {
    if (safetyTimer.current) clearTimeout(safetyTimer.current);
    setIsLoading(true);
    safetyTimer.current = setTimeout(() => setIsLoading(false), SAFETY_TIMEOUT_MS);
  };

  const pageReady = () => {
    if (safetyTimer.current) clearTimeout(safetyTimer.current);
    setIsLoading(false);
  };

  return (
    <NavigationLoadingContext.Provider value={{ isLoading, startNavigation, pageReady }}>
      {children}
    </NavigationLoadingContext.Provider>
  );
}

export const useNavigationLoading = () => useContext(NavigationLoadingContext);

export function usePageReady() {
  const { pageReady } = useNavigationLoading();
  React.useEffect(() => {
    pageReady();
  }, []);
}
