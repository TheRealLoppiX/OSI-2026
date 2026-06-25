import { MotiView } from "moti";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { Colors } from "../src/styles/colors";

interface Props {
  visible: boolean;
}

export function NavigationLoading({ visible }: Props) {
  const [internalVisible, setInternalVisible] = useState(false);
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fakeProgressRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (visible) {
      overlayOpacity.setValue(0);
      progressAnim.setValue(0);
      setInternalVisible(true);

      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();

      fakeProgressRef.current = Animated.timing(progressAnim, {
        toValue: 0.85,
        duration: 3000,
        easing: Easing.out(Easing.exp),
        useNativeDriver: false,
      });
      fakeProgressRef.current.start();
    } else {
      if (!internalVisible) return;

      if (fakeProgressRef.current) fakeProgressRef.current.stop();

      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }).start(() => {
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }).start(() => {
          setInternalVisible(false);
          progressAnim.setValue(0);
        });
      });
    }
  }, [visible]);

  if (!internalVisible) return null;

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
      {/* Anéis expansivos escalonados */}
      {[0, 1, 2].map((i) => (
        <MotiView
          key={i}
          from={{ scale: 0.5, opacity: 0.5 }}
          animate={{ scale: 2.8, opacity: 0 }}
          transition={{
            type: "timing",
            duration: 1700,
            delay: i * 500,
            loop: true,
            repeatReverse: false,
          }}
          style={styles.ring}
        />
      ))}

      {/* Logo central */}
      <MotiView
        from={{ scale: 0.78, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", damping: 18, stiffness: 160, delay: 60 }}
        style={styles.logoBox}
      >
        <Text style={styles.logoText}>OSI</Text>
      </MotiView>

      {/* Subtítulo */}
      <MotiView
        from={{ translateY: 10, opacity: 0 }}
        animate={{ translateY: 0, opacity: 1 }}
        transition={{ type: "timing", duration: 280, delay: 180 }}
        style={styles.subtitleBox}
      >
        <Text style={styles.yearText}>2026</Text>
        <View style={styles.tagRow}>
          <View style={styles.dot} />
          <Text style={styles.tagText}>Salgueiro · PE</Text>
          <View style={styles.dot} />
        </View>
      </MotiView>

      {/* Barra de progresso real na base */}
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0A1628",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  ring: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  logoBox: {
    width: 100,
    height: 100,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.primary,
    shadowOpacity: 0.6,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 },
    elevation: 20,
  },
  logoText: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "900",
    letterSpacing: 2,
  },
  subtitleBox: {
    marginTop: 24,
    alignItems: "center",
    gap: 8,
  },
  yearText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 4,
  },
  tagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
  tagText: {
    color: "#94A3B8",
    fontSize: 12,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  progressTrack: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.primary,
  },
});
