// contexts/CameraContext.jsx
import React, { createContext, useContext } from "react";
import { useCameraHook } from "../hooks/useCameraHook";

const CameraContext = createContext(null);

export function CameraProvider({ children }) {
  const value = useCameraHook();
  return <CameraContext.Provider value={value}>{children}</CameraContext.Provider>;
}

export function useCameraContext() {
  const ctx = useContext(CameraContext);
  if (!ctx) throw new Error("useCameraContext must be used within a CameraProvider");
  return ctx;
}