import React, { createContext, startTransition, useCallback, useEffect, useState } from "react";
import { authApi } from "../api/authApi";

export const AuthContext = createContext(null);

const TOKEN_KEY = "dcart_token";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem(TOKEN_KEY));
  const [isReady, setIsReady] = useState(false);

  const logout = useCallback(() => {
    authApi.logout().catch(() => {});
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const response = token ? await authApi.getMe() : await authApi.refresh();

        if (!token && response?.token) {
          localStorage.setItem(TOKEN_KEY, response.token);
          setToken(response.token);
        }

        startTransition(() => {
          setUser(response.user);
        });
      } catch (error) {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
      } finally {
        setIsReady(true);
      }
    };

    restoreSession();
  }, [token]);

  // Auto-logout when the Axios interceptor detects a 401
  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener("dcart:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("dcart:unauthorized", handleUnauthorized);
  }, [logout]);

  const login = ({ token: nextToken, user: nextUser }) => {
    localStorage.setItem(TOKEN_KEY, nextToken);
    setToken(nextToken);
    setUser(nextUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isReady,
        isAuthenticated: Boolean(user && token),
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
