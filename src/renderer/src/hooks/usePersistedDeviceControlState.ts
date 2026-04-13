import { useEffect, useRef, useState } from "react";
import { getDeviceControlDraftStorageKey } from "../components/device-controls/utils";

const DEFAULT_DEBOUNCE_MS = 250;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const resolveInitialValue = <T,>(storedValue: unknown, defaultValue: T): T => {
  if (storedValue === undefined) {
    return defaultValue;
  }

  if (isPlainObject(defaultValue)) {
    if (!isPlainObject(storedValue)) {
      return defaultValue;
    }
    return { ...defaultValue, ...storedValue } as T;
  }

  return storedValue as T;
};

const isEqualValue = (left: unknown, right: unknown) =>
  JSON.stringify(left) === JSON.stringify(right);

const persistDeviceControlState = async <T,>(storageKey: string, value: T) => {
  try {
    const result = await window.electronStore.set(storageKey, value);
    if (result && !result.success) {
      console.error(
        `Failed to persist device control draft for ${storageKey}:`,
        result.error || "Unknown error"
      );
    }
  } catch (error) {
    console.error(`Failed to persist device control draft for ${storageKey}:`, error);
  }
};

export const usePersistedDeviceControlState = <T,>(
  deviceId: string,
  namespace: string,
  defaultValue: T,
  options?: { debounceMs?: number }
) => {
  const debounceMs = options?.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  const storageKey = getDeviceControlDraftStorageKey(deviceId, namespace);
  const defaultValueRef = useRef(defaultValue);
  const latestStateRef = useRef(defaultValue);
  const lastPersistedRef = useRef<unknown>(defaultValue);
  const hydratedRef = useRef(false);
  const [state, setState] = useState<T>(defaultValue);

  defaultValueRef.current = defaultValue;
  latestStateRef.current = state;

  useEffect(() => {
    let cancelled = false;
    hydratedRef.current = false;
    setState(defaultValueRef.current);

    const loadPersistedState = async () => {
      try {
        const storedValue = await window.electronStore.get(storageKey);
        if (cancelled) return;
        const nextValue = resolveInitialValue(storedValue, defaultValueRef.current);
        latestStateRef.current = nextValue;
        lastPersistedRef.current = nextValue;
        hydratedRef.current = true;
        setState(nextValue);
      } catch (error) {
        console.error(`Failed to load device control draft for ${storageKey}:`, error);
        if (cancelled) return;
        const fallbackValue = defaultValueRef.current;
        latestStateRef.current = fallbackValue;
        lastPersistedRef.current = fallbackValue;
        hydratedRef.current = true;
        setState(fallbackValue);
      }
    };

    void loadPersistedState();

    return () => {
      cancelled = true;
    };
  }, [storageKey]);

  useEffect(() => {
    if (!hydratedRef.current) return undefined;
    if (isEqualValue(latestStateRef.current, lastPersistedRef.current)) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      const valueToPersist = latestStateRef.current;
      lastPersistedRef.current = valueToPersist;
      void persistDeviceControlState(storageKey, valueToPersist);
    }, debounceMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [debounceMs, state, storageKey]);

  useEffect(() => {
    const keyAtMount = storageKey;
    return () => {
      if (!hydratedRef.current) return;
      if (isEqualValue(latestStateRef.current, lastPersistedRef.current)) return;
      const valueToPersist = latestStateRef.current;
      lastPersistedRef.current = valueToPersist;
      void persistDeviceControlState(keyAtMount, valueToPersist);
    };
  }, [storageKey]);

  return [state, setState] as const;
};
