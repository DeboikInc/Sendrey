// contexts/CallContext.jsx
import React, { createContext, useContext } from "react";
import { useCallHook } from "../hooks/useCallHook";
import { useSocketContext } from "./SocketContext";

export const CallContext = createContext(null);

export function CallProvider({ chatId, currentUserId, currentUserType, children }) {
  const { socket } = useSocketContext();
  const value = useCallHook({ socket, chatId, currentUserId, currentUserType });
  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}

export function useCallContext() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCallContext must be used within a CallProvider");
  return ctx;
}