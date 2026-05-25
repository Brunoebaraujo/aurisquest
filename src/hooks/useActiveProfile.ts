import { useCallback, useEffect, useState } from "react";

export type ActiveProfile =
  | { kind: "parent" }
  | { kind: "child"; childId: string }
  | null;

const KEY = "aq_active_profile";

const read = (): ActiveProfile => {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveProfile;
    return parsed;
  } catch {
    return null;
  }
};

export const useActiveProfile = () => {
  const [profile, setProfileState] = useState<ActiveProfile>(read);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setProfileState(read());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setProfile = useCallback((p: ActiveProfile) => {
    if (p) sessionStorage.setItem(KEY, JSON.stringify(p));
    else sessionStorage.removeItem(KEY);
    setProfileState(p);
  }, []);

  const clear = useCallback(() => setProfile(null), [setProfile]);

  return { profile, setProfile, clear };
};

export const setActiveProfileDirect = (p: ActiveProfile) => {
  if (p) sessionStorage.setItem(KEY, JSON.stringify(p));
  else sessionStorage.removeItem(KEY);
};

export const getActiveProfileDirect = read;
