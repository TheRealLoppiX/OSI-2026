import { AnimatePresence, MotiView } from "moti";
import { StyleSheet, Text, View } from "react-native";
import { Colors } from "../src/styles/colors";

interface Props {
  visible: boolean;
}

export function NavigationLoading({ visible }: Props) {
  return (
    <AnimatePresence>
      {visible && (
        <MotiView
          key="nav-loading"
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ type: "timing", duration: 180 }}
          style={styles.overlay}
        >
          {/* Anéis expansivos com delay escalonado */}
          {[0, 1, 2].map((i) => (
            <MotiView
              key={i}
              from={{ scale: 0.5, opacity: 0.55 }}
              animate={{ scale: 2.8, opacity: 0 }}
              transition={{
                type: "timing",
                duration: 1600,
                delay: i * 480,
                loop: true,
                repeatReverse: false,
              }}
              style={styles.ring}
            />
          ))}

          {/* Logo central */}
          <MotiView
            from={{ scale: 0.75, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", damping: 18, stiffness: 160, delay: 60 }}
            style={styles.logoBox}
          >
            <Text style={styles.logoText}>OSI</Text>
          </MotiView>

          {/* Subtítulo */}
          <MotiView
            from={{ translateY: 8, opacity: 0 }}
            animate={{ translateY: 0, opacity: 1 }}
            transition={{ type: "timing", duration: 280, delay: 160 }}
            style={styles.subtitleBox}
          >
            <Text style={styles.yearText}>2026</Text>
            <View style={styles.tagRow}>
              <View style={styles.dot} />
              <Text style={styles.tagText}>Salgueiro · PE</Text>
              <View style={styles.dot} />
            </View>
          </MotiView>

          {/* Barra de progresso animada na base */}
          <MotiView
            from={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ type: "timing", duration: 550 }}
            style={styles.progressBar}
          />
        </MotiView>
      )}
    </AnimatePresence>
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
  progressBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: Colors.primary,
    transformOrigin: "left",
  },
});
