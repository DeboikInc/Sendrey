// contexts/SocketContext.jsx
import React, { createContext, useContext } from "react";
import { useSocket } from "../hooks/useSocket";

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const value = useSocket();
  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocketContext() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error("useSocketContext must be used within a SocketProvider");
  return ctx;
}