import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Animated, Text, View } from "react-native";

type ToastContext = { show: (message: string) => void };

const Ctx = createContext<ToastContext>({ show: () => {} });

// Call `useToast().show("Saved")` from anywhere under the provider to flash a
// brief confirmation pill. Auto-dismisses after ~1.8s.
export function useToast() {
  return useContext(Ctx);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const [opacity] = useState(() => new Animated.Value(0));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (msg: string) => {
      if (timer.current) clearTimeout(timer.current);
      setMessage(msg);
      opacity.setValue(0);
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();
      timer.current = setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }).start(({ finished }) => finished && setMessage(null));
      }, 1800);
    },
    [opacity],
  );

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      {message ? (
        <Animated.View
          pointerEvents="none"
          className="absolute inset-x-0 bottom-24 items-center px-6"
          style={{
            opacity,
            transform: [
              {
                translateY: opacity.interpolate({
                  inputRange: [0, 1],
                  outputRange: [8, 0],
                }),
              },
            ],
          }}
        >
          <View className="rounded-full bg-zinc-900 px-4 py-2 shadow-lg dark:bg-zinc-100">
            <Text className="text-sm font-medium text-white dark:text-zinc-900">
              {message}
            </Text>
          </View>
        </Animated.View>
      ) : null}
    </Ctx.Provider>
  );
}
