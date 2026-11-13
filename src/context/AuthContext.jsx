import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, TOKEN_KEY } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let current = true;
    const token = window.sessionStorage.getItem(TOKEN_KEY);
    if (!token) {
      setLoading(false);
      return () => { current = false; };
    }
    api.me()
      .then((account) => { if (current) setUser(account); })
      .catch(() => { window.sessionStorage.removeItem(TOKEN_KEY); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, []);

  useEffect(() => {
    const expireSession = () => {
      setUser(null);
      window.sessionStorage.removeItem(TOKEN_KEY);
    };
    window.addEventListener("studybuddy:unauthorized", expireSession);
    return () => window.removeEventListener("studybuddy:unauthorized", expireSession);
  }, []);

  const login = async (email, password) => {
    const result = await api.login(email, password);
    window.sessionStorage.setItem(TOKEN_KEY, result.access_token);
    try {
      const account = await api.me();
      setUser(account);
      return account;
    } catch (error) {
      window.sessionStorage.removeItem(TOKEN_KEY);
      throw error;
    }
  };

  const register = async (email, password) => {
    await api.register(email, password);
    return login(email, password);
  };

  const logout = () => {
    window.sessionStorage.removeItem(TOKEN_KEY);
    setUser(null);
  };

  const value = useMemo(() => ({ user, loading, login, register, logout }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
