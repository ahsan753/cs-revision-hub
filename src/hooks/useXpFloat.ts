import { useContext } from "react";
import { XpFloatContext } from "../components/feedback/xpFloatContext";

export function useXpFloat() {
  const context = useContext(XpFloatContext);
  if (!context) {
    return { triggerXpFloat: () => undefined };
  }
  return context;
}
