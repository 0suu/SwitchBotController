const modeFromEnv = typeof import.meta !== "undefined" && import.meta.env?.VITE_APP_MODE;

export const isMockMode = modeFromEnv === "mock";
