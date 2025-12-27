import { AnyDevice, DeviceListResponseBody, DeviceStatusResponseBody, SceneListResponseBody } from "./types";

const mockDevices: AnyDevice[] = [
  { deviceId: "bot-entrance", deviceName: "玄関ボット", deviceType: "Bot", enableCloudService: true, hubDeviceId: "hub-1" },
  { deviceId: "meter-living", deviceName: "リビング温湿度計", deviceType: "Meter", enableCloudService: true, hubDeviceId: "hub-1" },
  {
    deviceId: "curtain-bedroom",
    deviceName: "寝室カーテン",
    deviceType: "Curtain 3",
    enableCloudService: true,
    hubDeviceId: "hub-2",
  },
  { deviceId: "plug-desk", deviceName: "デスクライト", deviceType: "Plug Mini (US)", enableCloudService: true, hubDeviceId: "hub-2" },
];

const mockInfraredRemotes: AnyDevice[] = [
  {
    deviceId: "ir-tv",
    deviceName: "テレビ",
    remoteType: "TV",
    deviceType: "TV",
    hubDeviceId: "hub-2",
    enableCloudService: true,
    isInfraredRemote: true,
  },
  {
    deviceId: "ir-ac",
    deviceName: "エアコン",
    remoteType: "Air Conditioner",
    deviceType: "Air Conditioner",
    hubDeviceId: "hub-2",
    enableCloudService: true,
    isInfraredRemote: true,
  },
];

const mockStatuses: Record<string, DeviceStatusResponseBody> = {
  "bot-entrance": {
    deviceId: "bot-entrance",
    deviceType: "Bot",
    hubDeviceId: "hub-1",
    battery: 88,
    calibration: true,
  },
  "meter-living": {
    deviceId: "meter-living",
    deviceType: "Meter",
    hubDeviceId: "hub-1",
    temperature: 24.6,
    humidity: 48,
    battery: 90,
  },
  "curtain-bedroom": {
    deviceId: "curtain-bedroom",
    deviceType: "Curtain 3",
    hubDeviceId: "hub-2",
    slidePosition: 65,
    moving: false,
    battery: 86,
  },
  "plug-desk": {
    deviceId: "plug-desk",
    deviceType: "Plug Mini (US)",
    hubDeviceId: "hub-2",
    voltage: 100,
    electricCurrent: 720,
    power: "on",
  },
};

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
