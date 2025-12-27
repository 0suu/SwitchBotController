import { isMockMode } from "../../../appMode";
import { createMockElectronStore } from "./mockElectronStore";
import { mockSwitchBotBridge } from "../../../api/mockSwitchBotBridge";

const exposeElectronStore = () => {
  if (typeof window === "undefined") return;
  if (!window.electronStore) {
    window.electronStore = createMockElectronStore();
  }
};

const exposeSwitchBotBridge = () => {
  if (typeof window === "undefined") return;
  if (!window.switchBotBridge) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    window.switchBotBridge = mockSwitchBotBridge as any;
  }
};

export const initializeMockMode = () => {
  if (!isMockMode) return;
  exposeElectronStore();
  exposeSwitchBotBridge();
  console.info("[MockMode] VITE_APP_MODE=mock - using local mock data. No network requests will be sent.");
};
