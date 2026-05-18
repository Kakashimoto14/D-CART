import { useContext, useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { AuthContext } from "../context/AuthContext";

const resolveSocketUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  return apiUrl.endsWith("/api") ? apiUrl.slice(0, -4) : apiUrl;
};

export function useOrderRealtime(onOrderChanged) {
  const { token, isAuthenticated } = useContext(AuthContext);
  const [isConnected, setIsConnected] = useState(false);
  const socketUrl = useMemo(resolveSocketUrl, []);

  useEffect(() => {
    if (!isAuthenticated || !token || typeof onOrderChanged !== "function") {
      setIsConnected(false);
      return undefined;
    }

    const socket = io(socketUrl, {
      transports: ["websocket"],
      auth: { token }
    });

    socket.on("connect", () => {
      setIsConnected(true);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    socket.on("orders:changed", onOrderChanged);

    return () => {
      socket.off("orders:changed", onOrderChanged);
      socket.disconnect();
    };
  }, [isAuthenticated, onOrderChanged, socketUrl, token]);

  return { isConnected };
}
