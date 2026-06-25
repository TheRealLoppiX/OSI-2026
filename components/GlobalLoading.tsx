import { usePathname } from "expo-router";
import { useEffect, useRef, useState } from "react";
import LoadingScreen from "./LoadingScreen";

export default function GlobalLoading() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    setLoading(true);

    const timer = setTimeout(() => {
      setLoading(false);
    }, 400);

    return () => clearTimeout(timer);
  }, [pathname]);

  return <LoadingScreen visible={loading} />;
}
