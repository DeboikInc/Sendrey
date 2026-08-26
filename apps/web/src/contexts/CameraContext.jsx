import React, { createContext, useContext } from "react";
import { useCameraHook } from "../hooks/useCameraHook";
import { useMediaContext } from "./MediaContext";

const CameraContext = createContext(null);

export function CameraProvider({ children }) {
  const { requestMediaAccess } = useMediaContext();
  const value = useCameraHook(requestMediaAccess);
  return <CameraContext.Provider value={value}>{children}</CameraContext.Provider>;
}

export function useCameraContext() {
  const ctx = useContext(CameraContext);
  if (!ctx) throw new Error("useCameraContext must be used within a CameraProvider");
  return ctx;
}