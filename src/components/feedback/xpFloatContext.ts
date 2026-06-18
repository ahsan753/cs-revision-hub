import { createContext } from "react";

export interface XpFloatContextValue {
  triggerXpFloat: (amount: number, anchorEl?: HTMLElement | null) => void;
}

export const XpFloatContext = createContext<XpFloatContextValue | null>(null);
