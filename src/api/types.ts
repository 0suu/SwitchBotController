// src/api/types.ts

// Based on common understanding of SwitchBot API, will be refined if spec becomes available

export interface SwitchBotBaseDevice {
  deviceId: string;
  deviceName: string;
  deviceType: string; // e.g., "Bot", "Curtain", "Plug"
  enableCloudService: boolean;
  hubDeviceId: string;
}

export interface Bot extends SwitchBotBaseDevice {
  // Bot specific properties
}

export interface Curtain extends SwitchBotBaseDevice {
  // Curtain specific properties
  curtainDevicesIds?: string[]; // For grouped curtains
  isOpened?: boolean;
  slidePosition?: number;
}

export interface Plug extends SwitchBotBaseDevice {
  // Plug specific properties
  power?: "on" | "off";
}

// ... other device types can be added here

export interface InfraredRemote {
  deviceId: string;
  deviceName: string;
  remoteType: string; // e.g., "TV", "Light", "Air Conditioner"
  hubDeviceId: string;
  deviceType?: string; // convenience so UI can treat uniformly
  enableCloudService?: boolean;
  isInfraredRemote?: true;
}

export type AnyDevice = Bot | Curtain | Plug | InfraredRemote; // Add other types as they are defined

export interface DeviceListResponseBody {
  deviceList: AnyDevice[];
  infraredRemoteList: InfraredRemote[]; // Virtual IR remotes
}

export interface DeviceStatusResponseBody<T = any> {
  deviceId: string;
  deviceType: string;
  hubDeviceId: string;
  // Device-specific status properties will go here
  [key: string]: any; // Allow for additional properties
}

export interface SceneSummary {
  sceneId: string;
  sceneName: string;
}

export type SceneListResponseBody = SceneSummary[];

// Scene execution returns an empty body on success
export type SceneExecuteResponseBody = Record<string, never>;

// Add other API response/request types as needed
