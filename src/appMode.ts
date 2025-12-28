declare const __VITE_APP_MODE__: string | undefined;

const modeFromProcessEnv =
  typeof process !== "undefined" ? process.env?.VITE_APP_MODE : undefined;

const modeFromViteDefine =
  typeof __VITE_APP_MODE__ === "string" && __VITE_APP_MODE__.trim() !== ""
    ? __VITE_APP_MODE__.trim()
    : undefined;

const appMode = modeFromProcessEnv ?? modeFromViteDefine;

export const isMockMode = appMode === "mock";
