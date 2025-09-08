import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { safeStorageGet, safeStorageSet } from "@/lib/storage-utils";

type SharedCollegeContextValue = {
  value: string;
  setValue: (next: string) => void;
  initialize: (initial: string) => void;
};

const SharedCollegeContext = createContext<SharedCollegeContextValue | null>(null);

function getStorageKey(userId?: string | number | null) {
  const uid = userId ?? safeStorageGet("userId") ?? "anon";
  return `shared_college_university_${uid}`;
}

export function SharedCollegeUniversityProvider({ children }: { children: React.ReactNode }) {
  const [value, setValue] = useState<string>("");
  const isInitializedRef = useRef(false);

  useEffect(() => {
    try {
      const key = getStorageKey(null);
      safeStorageSet(key, value || "");
    } catch {}
  }, [value]);

  const api = useMemo<SharedCollegeContextValue>(() => ({
    value,
    setValue: (next: string) => setValue(next || ""),
    initialize: (initial: string) => {
      if (!isInitializedRef.current) {
        try {
          const key = getStorageKey(null);
          const stored = safeStorageGet(key);
          if (stored && typeof stored === "string") {
            setValue(stored);
          } else if (initial) {
            setValue(initial);
          }
        } catch {
          if (initial) setValue(initial);
        }
        isInitializedRef.current = true;
      }
    },
  }), [value]);

  return (
    <SharedCollegeContext.Provider value={api}>{children}</SharedCollegeContext.Provider>
  );
}

export function useSharedCollegeUniversity(): SharedCollegeContextValue {
  const ctx = useContext(SharedCollegeContext);
  if (!ctx) throw new Error("useSharedCollegeUniversity must be used within SharedCollegeUniversityProvider");
  return ctx;
}


