import { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { authService } from "../services/authService";

const AuthContext = createContext(null);

const TOKEN_KEY = "cms_token";
const USER_KEY = "cms_user";
const PROFILE_KEY = "cms_profile";
const THEME_KEY = "cms_theme";

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  });
  const [profile, setProfile] = useState(() => {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  });
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem(THEME_KEY);
    if (!saved) return false;
    return saved === "dark";
  });
  const [authFx, setAuthFx] = useState("idle");
  const authFxTimerRef = useRef(null);

  const persistAuth = (payload) => {
    localStorage.setItem(TOKEN_KEY, payload.token);
    localStorage.setItem(USER_KEY, JSON.stringify(payload.user));
    localStorage.setItem(PROFILE_KEY, JSON.stringify(payload.profile || null));
  };

  const clearAuth = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(PROFILE_KEY);
  };

  const clearAuthFxTimer = useCallback(() => {
    if (authFxTimerRef.current) {
      window.clearTimeout(authFxTimerRef.current);
      authFxTimerRef.current = null;
    }
  }, []);

  const scheduleAuthFxReset = useCallback((delayMs = 0) => {
    clearAuthFxTimer();
    authFxTimerRef.current = window.setTimeout(() => {
      setAuthFx("idle");
      authFxTimerRef.current = null;
    }, delayMs);
  }, [clearAuthFxTimer]);

  const logout = useCallback(async (showToast = false) => {
    clearAuthFxTimer();
    setAuthFx("logging-out");
    await new Promise((resolve) => window.setTimeout(resolve, 340));

    clearAuth();
    setToken(null);
    setUser(null);
    setProfile(null);

    if (showToast) {
      toast.success("Logged out successfully.");
    }
    scheduleAuthFxReset(180);
  }, [clearAuthFxTimer, scheduleAuthFxReset]);

  const login = useCallback(async (credentials) => {
    clearAuthFxTimer();
    setAuthFx("logging-in");
    try {
      const data = await authService.login(credentials);
      persistAuth(data);
      setToken(data.token);
      setUser(data.user);
      setProfile(data.profile);
      toast.success(`Welcome, ${data.user.name}`);
      setAuthFx("welcome");
      scheduleAuthFxReset(1300);
      return data;
    } catch (error) {
      setAuthFx("idle");
      throw error;
    }
  }, [clearAuthFxTimer, scheduleAuthFxReset]);

  const refreshUser = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const data = await authService.getMe();
      setUser(data.user);
      setProfile(data.profile);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      localStorage.setItem(PROFILE_KEY, JSON.stringify(data.profile || null));
    } catch {
      void logout();
    } finally {
      setLoading(false);
    }
  }, [token, logout]);

  const toggleDarkMode = () => {
    setDarkMode((prev) => !prev);
  };

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  useEffect(() => () => clearAuthFxTimer(), [clearAuthFxTimer]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem(THEME_KEY, "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem(THEME_KEY, "light");
    }
  }, [darkMode]);

  const value = useMemo(
    () => ({
      token,
      user,
      profile,
      loading,
      darkMode,
      authFx,
      login,
      logout,
      refreshUser,
      toggleDarkMode,
    }),
    [token, user, profile, loading, darkMode, authFx, login, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
