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
    const onChange = () => setProfileState(read());
    window.addEventListener("storage", onChange);
    window.addEventListener("aq_active_profile_changed", onChange);
    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener("aq_active_profile_changed", onChange);
    };
  }, []);

  const setProfile = useCallback((p: ActiveProfile) => {
    setActiveProfileDirect(p);
    setProfileState(p);
  }, []);

  const clear = useCallback(() => setProfile(null), [setProfile]);

  return { profile, setProfile, clear };
};

export const setActiveProfileDirect = (p: ActiveProfile) => {
  if (p) sessionStorage.setItem(KEY, JSON.stringify(p));
  else sessionStorage.removeItem(KEY);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("aq_active_profile_changed"));
  }
};

export const getActiveProfileDirect = read;
