import { AnyDevice, DeviceListResponseBody, DeviceStatusResponseBody, SceneListResponseBody } from "./types";
import { deviceDefinitions } from "../renderer/src/deviceDefinitions";

const HUB_ID = "mock-hub-all-types";

const formatDeviceType = (defKey: string, matcher?: string) => {
  const base = matcher || defKey;
  return base
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const sampleStatusValue = (key: string, index: number) => {
  const defaults: Record<string, any> = {
    temperature: 24.5,
    humidity: 48,
    battery: 88,
    slidePosition: 50,
    moving: false,
    direction: "up",
    lockState: "locked",
    doorState: "closed",
    power: "on",
    mode: "auto",
    fanSpeed: 60,
    oscillation: true,
    workingStatus: "docked",
    onlineStatus: "online",
    taskType: "cleaning",
    colorTemperature: 4000,
    brightness: 80,
    status: "normal",
    CO2: 600,
    lightLevel: 30,
    moveDetected: false,
    targetTemperature: 22,
    childLock: false,
    nebulizationEfficiency: 70,
    lackWater: false,
  };
  if (defaults[key] !== undefined) return defaults[key];
  return index % 2 === 0 ? "ok" : 1;
};

const buildMockDeviceAndStatus = () => {
  const entries = deviceDefinitions
    .filter((def) => !def.hide)
    .map((def, index) => {
      const deviceType = formatDeviceType(def.key, def.matchers?.[0]);
      const device: AnyDevice = {
        deviceId: `mock-${def.key}`,
        deviceName: `モック ${deviceType}`,
        deviceType,
        enableCloudService: true,
        hubDeviceId: HUB_ID,
      };
      const status: DeviceStatusResponseBody = {
        deviceId: device.deviceId,
        deviceType,
        hubDeviceId: HUB_ID,
      };
      def.statusFields?.forEach((field, fieldIndex) => {
        status[field.key] = sampleStatusValue(field.key, fieldIndex);
      });
      return { device, status };
    });

  return entries;
};

const mockDeviceEntries = buildMockDeviceAndStatus();

const mockDevices: AnyDevice[] = mockDeviceEntries.map((entry) => entry.device);

const mockInfraredRemotes: AnyDevice[] = [
  {
    deviceId: "ir-tv",
    deviceName: "テレビ（モック）",
    remoteType: "TV",
    deviceType: "TV",
    hubDeviceId: HUB_ID,
    enableCloudService: true,
    isInfraredRemote: true,
  },
  {
    deviceId: "ir-ac",
    deviceName: "エアコン（モック）",
    remoteType: "Air Conditioner",
    deviceType: "Air Conditioner",
    hubDeviceId: HUB_ID,
    enableCloudService: true,
    isInfraredRemote: true,
  },
];

const mockStatuses: Record<string, DeviceStatusResponseBody> = mockDeviceEntries.reduce((acc, entry) => {
  acc[entry.device.deviceId] = entry.status;
  return acc;
}, {} as Record<string, DeviceStatusResponseBody>);

const scenes: SceneListResponseBody = [
  { sceneId: "scene-relax", sceneName: "リラックス" },
  { sceneId: "scene-good-morning", sceneName: "おはよう" },
  { sceneId: "scene-quick-off", sceneName: "全部オフ" },
];

const successResponse = <T>(body: T) => ({
  statusCode: 100,
  message: "mock success",
  body,
});

export const mockSwitchBotBridge = {
  async getDevices(): Promise<{ success: boolean; data: { statusCode: number; message: string; body: DeviceListResponseBody } }> {
    const body: DeviceListResponseBody = {
      deviceList: mockDevices,
      infraredRemoteList: mockInfraredRemotes,
    };
    return { success: true, data: successResponse(body) };
  },
  async getDeviceStatus(deviceId: string): Promise<{ success: boolean; data: { statusCode: number; message: string; body: DeviceStatusResponseBody } }> {
    const status = mockStatuses[deviceId];
    if (!status) {
      return { success: false, error: "Device not found" };
    }
    return { success: true, data: successResponse({ ...status }) };
  },
  async sendCommand(deviceId: string, command: string, parameter?: any) {
    const status = mockStatuses[deviceId];
    if (status) {
      if (command === "turnOn") {
        status.power = "on";
        status.moving = false;
      } else if (command === "turnOff") {
        status.power = "off";
        status.moving = false;
      } else if (command === "setPosition") {
        const parsed = typeof parameter === "string" ? Number(String(parameter).split(",").pop()) : Number(parameter);
        if (!Number.isNaN(parsed)) {
          status.slidePosition = Math.max(0, Math.min(100, Math.round(parsed)));
        }
        status.moving = false;
      } else if (command === "press") {
        status.lastAction = "pressed";
      }
    }
    return { success: true, data: successResponse({}) };
  },
  async getScenes(): Promise<{ success: boolean; data: { statusCode: number; message: string; body: SceneListResponseBody } }> {
    return { success: true, data: successResponse(scenes) };
  },
  async executeScene(sceneId: string) {
    if (!scenes.find((scene) => scene.sceneId === sceneId)) {
      return { success: false, error: "Scene not found" };
    }
    return { success: true, data: successResponse({}) };
  },
};
