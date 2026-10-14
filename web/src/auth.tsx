import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { api, ApiError, getToken, setToken, type User } from "./api";

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string) => Promise<User>;
  logout: () => void;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(!!getToken());
  const authVersion = useRef(0);

  useEffect(() => {
    const version = ++authVersion.current;
    if (!getToken()) {
      setLoading(false);
      return;
    }
    api.me()
      .then((r) => {
        if (authVersion.current === version) setUser(r.user);
      })
      .catch((error: unknown) => {
        if (
          authVersion.current === version &&
          error instanceof ApiError &&
          error.status === 401
        ) {
          setToken(null);
          setUser(null);
        }
      })
      .finally(() => {
        if (authVersion.current === version) setLoading(false);
      });
    return () => {
      if (authVersion.current === version) authVersion.current += 1;
    };
  }, []);

  useEffect(() => {
    const onLogout = () => {
      authVersion.current += 1;
      setUser(null);
      setLoading(false);
    };
    window.addEventListener("revbid:logout", onLogout);
    return () => window.removeEventListener("revbid:logout", onLogout);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const version = ++authVersion.current;
    try {
      const r = await api.login(email, password);
      if (authVersion.current === version) {
        setToken(r.token);
        setUser(r.user);
      }
      return r.user;
    } finally {
      if (authVersion.current === version) setLoading(false);
    }
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const version = ++authVersion.current;
    try {
      const r = await api.register(name, email, password);
      if (authVersion.current === version) {
        setToken(r.token);
        setUser(r.user);
      }
      return r.user;
    } finally {
      if (authVersion.current === version) setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    authVersion.current += 1;
    setToken(null);
    setUser(null);
  }, []);

  return <Ctx.Provider value={{ user, loading, login, register, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used inside AuthProvider");
  return c;
}