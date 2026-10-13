// Picks the API implementation from ONE env flag.
//   VITE_API_MODE=mock  -> in-memory sample data (default while the API is being built)
//   VITE_API_MODE=real  -> fetch against VITE_API_URL (empty = same origin / Vite dev proxy)
// Vite only exposes variables prefixed with VITE_, so API_URL is read as VITE_API_URL.
import { createContext, useContext } from "react";
import { createMockApi } from "./mock/index.ts";
import { createRealApi } from "./real.ts";
import type { HimpaarApi } from "./types.ts";

export type { HimpaarApi } from "./types.ts";
export { HimpaarApiError } from "./types.ts";

export const API_MODE: "mock" | "real" = import.meta.env.VITE_API_MODE === "real" ? "real" : "mock";
export const API_URL: string = import.meta.env.VITE_API_BASE ?? import.meta.env.VITE_API_URL ?? "";

/** Sandbox-only UI (outcome buttons, sandbox controls). The whole MVP is sandbox. */
export const SANDBOX_MODE = import.meta.env.VITE_SANDBOX_MODE !== "false";

export function createApi(): HimpaarApi {
  return API_MODE === "real" ? createRealApi(API_URL) : createMockApi();
}

export const ApiContext = createContext<HimpaarApi | null>(null);

export function useApi(): HimpaarApi {
  const api = useContext(ApiContext);
  if (!api) throw new Error("useApi must be used inside <ApiContext.Provider>");
  return api;
}
