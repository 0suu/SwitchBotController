export type ParameterSpec =
  | {
      type: "none";
    }
  | {
      type: "range";
      min: number;
      max: number;
      step?: number;
      unit?: string;
      defaultValue?: number;
      mapValue?: (value: number) => any;
      displayFormatter?: (value: number) => string;
    }
  | {
      type: "enum";
      options: Array<{ label: string; value: any }>;
      defaultValue?: any;
    }
  | {
      type: "text";
      defaultValue?: string;
      placeholder?: string;
      helperText?: string;
      parseAsJson?: boolean;
      multiline?: boolean;
    };

export interface DeviceCommandDefinition {
  label: string;
  command: string;
  description?: string;
  commandType?: "command" | "customize";
  parameter?: ParameterSpec;
}

export interface DeviceStatusField {
  key: string;
  label?: string;
  unit?: string;
  formatter?: (value: any, fullStatus?: Record<string, any>) => string;
}

export interface DeviceDefinition {
  key: string;
  matchers: string[];
  commands?: DeviceCommandDefinition[];
  statusFields?: DeviceStatusField[];
  hide?: boolean;
}

export const normalizeDeviceType = (deviceType?: string) => (deviceType || "").trim().toLowerCase();

const tempHumidityFields: DeviceStatusField[] = [
  {
    key: "temperature",
    label: "Temp",
    unit: "°C",
    formatter: (value) => (value === undefined || value === null ? "—" : `${Number(value).toFixed(1)}°C`),
  },
  {
    key: "humidity",
    label: "Humidity",
    unit: "%",
    formatter: (value) => (value === undefined || value === null ? "—" : `${value}%`),
  },
];

const definitions: DeviceDefinition[] = [
  {
    key: "bot",
    matchers: ["bot"],
    commands: [
      { label: "Turn On", command: "turnOn" },
      { label: "Turn Off", command: "turnOff" },
      { label: "Press", command: "press" },
    ],
  },
  {
    key: "curtain",
    matchers: ["curtain 3", "curtain"],
    commands: [
      { label: "Open", command: "turnOn" },
      { label: "Pause", command: "pause" },
      { label: "Close", command: "turnOff" },
      {
        label: "Set Position",
        command: "setPosition",
        parameter: {
          type: "range",
          min: 0,
          max: 100,
          step: 1,
          defaultValue: 50,
          mapValue: (value) => `0,ff,${Math.round(value)}`,
          displayFormatter: (value) => `${Math.round(value)}%`,
        },
      },
    ],
    statusFields: [
      { key: "slidePosition", label: "Pos", formatter: (v) => (v === undefined ? "—" : `${v}%`) },
      { key: "moving", label: "Moving" },
      { key: "battery", label: "Battery", formatter: (v) => (v === undefined ? "—" : `${v}%`) },
    ],
  },
  {
    key: "blindTilt",
    matchers: ["blind tilt"],
    commands: [
      {
        label: "Set Position",
        command: "setPosition",
        parameter: {
          type: "text",
          defaultValue: "up;100",
          placeholder: "direction;position (e.g. up;60)",
          helperText: "direction: up/down, position 0-100 (multiple of 2)",
        },
      },
      { label: "Fully Open", command: "fullyOpen" },
      { label: "Close Up", command: "closeUp" },
      { label: "Close Down", command: "closeDown" },
    ],
    statusFields: [
      { key: "slidePosition", label: "Pos", formatter: (v) => (v === undefined ? "—" : `${v}%`) },
      { key: "direction", label: "Dir" },
      { key: "moving", label: "Moving" },
      { key: "battery", label: "Battery", formatter: (v) => (v === undefined ? "—" : `${v}%`) },
    ],
  },
  {
    key: "rollerShade",
    matchers: ["roller shade"],
    commands: [
      {
        label: "Set Position",
        command: "setPosition",
        parameter: { type: "range", min: 0, max: 100, defaultValue: 0, displayFormatter: (v) => `${Math.round(v)}%` },
      },
    ],
    statusFields: [
      { key: "slidePosition", label: "Pos", formatter: (v) => (v === undefined ? "—" : `${v}%`) },
      { key: "moving", label: "Moving" },
      { key: "battery", label: "Battery", formatter: (v) => (v === undefined ? "—" : `${v}%`) },
    ],
  },
  {
    key: "lock",
    matchers: ["lock ultra", "lock pro", "lock"],
    commands: [
      { label: "Lock", command: "lock" },
      { label: "Unlock", command: "unlock" },
      { label: "Deadbolt", command: "deadbolt" },
    ],
    statusFields: [
      { key: "lockState", label: "Lock" },
      { key: "doorState", label: "Door" },
      { key: "battery", label: "Battery", formatter: (v) => (v === undefined ? "—" : `${v}%`) },
    ],
  },
  {
    key: "lockLite",
    matchers: ["lock lite"],
    commands: [
      { label: "Lock", command: "lock" },
      { label: "Unlock", command: "unlock" },
    ],
  },
  {
    key: "plug",
    matchers: ["plug mini (us)", "plug mini (jp)", "plug mini (eu)", "plug mini", "plug"],
    commands: [
      { label: "Turn On", command: "turnOn" },
      { label: "Turn Off", command: "turnOff" },
    ],
    statusFields: [
      {
        key: "power",
        label: "Power",
        formatter: (value, fullStatus) => {
          const numericPower = typeof value === "number" ? value : Number(value);
          if (!Number.isNaN(numericPower)) {
            return `${numericPower.toFixed(1)} W`;
          }
          const voltage = typeof fullStatus?.voltage === "number" ? fullStatus?.voltage : Number(fullStatus?.voltage);
          const currentMilliAmp =
            typeof fullStatus?.electricCurrent === "number"
              ? fullStatus?.electricCurrent
              : Number(fullStatus?.electricCurrent);
          if (!Number.isNaN(voltage) && !Number.isNaN(currentMilliAmp)) {
            const watts = (voltage * currentMilliAmp) / 1000;
            if (!Number.isNaN(watts)) {
              return `${watts.toFixed(1)} W`;
            }
          }
          if (typeof value === "string") return value;
          return undefined;
        },
      },
    ],
  },
  {
    key: "relaySwitchSingle",
    matchers: ["relay switch 1pm", "relay switch 1"],
    commands: [
      { label: "Turn On", command: "turnOn" },
      { label: "Turn Off", command: "turnOff" },
      { label: "Toggle", command: "toggle" },
      {
        label: "Set Mode",
        command: "setMode",
        parameter: {
          type: "enum",
          options: [
            { label: "Toggle", value: 0 },
            { label: "Edge", value: 1 },
            { label: "Detached", value: 2 },
            { label: "Momentary", value: 3 },
          ],
          defaultValue: 0,
        },
      },
    ],
    statusFields: [{ key: "power", label: "Power" }, { key: "mode", label: "Mode" }],
  },
  {
    key: "relaySwitchDual",
    matchers: ["relay switch 2pm"],
    commands: [
      { label: "Turn On (ch1)", command: "turnOn", parameter: { type: "text", defaultValue: "1" } },
      { label: "Turn On (ch2)", command: "turnOn", parameter: { type: "text", defaultValue: "2" } },
      { label: "Turn Off (ch1)", command: "turnOff", parameter: { type: "text", defaultValue: "1" } },
      { label: "Turn Off (ch2)", command: "turnOff", parameter: { type: "text", defaultValue: "2" } },
      { label: "Toggle (ch1)", command: "toggle", parameter: { type: "text", defaultValue: "1" } },
      { label: "Toggle (ch2)", command: "toggle", parameter: { type: "text", defaultValue: "2" } },
      {
        label: "Set Mode",
        command: "setMode",
        parameter: {
          type: "text",
          defaultValue: "1;0",
          placeholder: "channel;mode (e.g. 1;0)",
          helperText: "Mode: 0 toggle, 1 edge, 2 detached, 3 momentary",
        },
      },
      {
        label: "Set Position",
        command: "setPosition",
        parameter: { type: "range", min: 0, max: 100, defaultValue: 0, displayFormatter: (v) => `${Math.round(v)}%` },
      },
    ],
    statusFields: [{ key: "power", label: "Power" }],
  },
  {
    key: "garageDoor",
    matchers: ["garage door opener"],
    commands: [
      { label: "Turn On", command: "turnOn" },
      { label: "Turn Off", command: "turnOff" },
    ],
  },
  {
    key: "humidifier",
    matchers: ["humidifier"],
    commands: [
      { label: "Turn On", command: "turnOn" },
      { label: "Turn Off", command: "turnOff" },
      {
        label: "Set Mode",
        command: "setMode",
        parameter: {
          type: "text",
          defaultValue: "auto",
          placeholder: "auto / 101 / 102 / 103 / 0-100",
          helperText: "Auto or atomization 34/67/100% (101-103) or 0-100",
        },
      },
    ],
    statusFields: [
      { key: "power", label: "Power" },
      { key: "humidity", label: "Humidity", formatter: (v) => (v === undefined ? "—" : `${v}%`) },
      { key: "temperature", label: "Temp", formatter: (v) => (v === undefined ? "—" : `${Number(v).toFixed(1)}°C`) },
      { key: "nebulizationEfficiency", label: "Output", formatter: (v) => (v === undefined ? "—" : `${v}%`) },
      { key: "lackWater", label: "Water", formatter: (v) => (v ? "Empty" : "OK") },
    ],
  },
  {
    key: "evaporativeHumidifier",
    matchers: ["humidifier2", "evaporative humidifier"],
    commands: [
      { label: "Turn On", command: "turnOn" },
      { label: "Turn Off", command: "turnOff" },
      {
        label: "Set Mode",
        command: "setMode",
        parameter: {
          type: "text",
          defaultValue: '{"mode":1,"targetHumidify":60}',
          parseAsJson: true,
          multiline: false,
          helperText: "mode 1-8, targetHumidify 0-100",
        },
      },
      {
        label: "Child Lock",
        command: "setChildLock",
        parameter: {
          type: "enum",
          options: [
            { label: "Enable", value: true },
            { label: "Disable", value: false },
          ],
          defaultValue: true,
        },
      },
    ],
    statusFields: [
      { key: "power", label: "Power" },
      { key: "humidity", label: "Humidity", formatter: (v) => (v === undefined ? "—" : `${v}%`) },
      { key: "mode", label: "Mode" },
      { key: "drying", label: "Drying" },
      { key: "childLock", label: "ChildLock" },
    ],
  },
  {
    key: "airPurifier",
    matchers: ["air purifier voc", "air purifier table voc", "air purifier pm2.5", "air purifier table pm2.5"],
    commands: [
      { label: "Turn On", command: "turnOn" },
      { label: "Turn Off", command: "turnOff" },
      {
        label: "Set Mode",
        command: "setMode",
        parameter: {
          type: "text",
          defaultValue: '{"mode":1,"fanGear":1}',
          parseAsJson: true,
          helperText: "mode 1 normal, 2 auto, 3 sleep, 4 pet; fanGear 1-3 when mode=1",
        },
      },
      {
        label: "Child Lock",
        command: "setChildLock",
        parameter: {
          type: "enum",
          options: [
            { label: "Enable", value: 1 },
            { label: "Disable", value: 0 },
          ],
          defaultValue: 1,
        },
      },
    ],
    statusFields: [
      { key: "power", label: "Power" },
      { key: "mode", label: "Mode" },
      { key: "childLock", label: "ChildLock" },
    ],
  },
  {
    key: "smartRadiator",
    matchers: ["smart radiato thermostat", "smart radiator thermostat"],
    commands: [
      { label: "Turn On", command: "turnOn" },
      { label: "Turn Off", command: "turnOff" },
      {
        label: "Set Mode",
        command: "setMode",
        parameter: {
          type: "range",
          min: 0,
          max: 5,
          defaultValue: 1,
          displayFormatter: (v) => `${Math.round(v)}`,
        },
      },
      {
        label: "Set Manual Temperature",
        command: "setManualModeTemperature",
        parameter: { type: "range", min: 4, max: 35, defaultValue: 21, displayFormatter: (v) => `${v}°C` },
      },
    ],
  },
  {
    key: "fan",
    matchers: ["battery circulator fan", "circulator fan", "smart fan", "fan"],
    commands: [
      { label: "Turn On", command: "turnOn" },
      { label: "Turn Off", command: "turnOff" },
      {
        label: "Nightlight",
        command: "setNightLightMode",
        parameter: {
          type: "enum",
          options: [
            { label: "Off", value: "off" },
            { label: "Bright", value: "1" },
            { label: "Dim", value: "2" },
          ],
          defaultValue: "off",
        },
      },
      {
        label: "Wind Mode",
        command: "setWindMode",
        parameter: {
          type: "enum",
          options: [
            { label: "Direct", value: "direct" },
            { label: "Natural", value: "natural" },
            { label: "Sleep", value: "sleep" },
            { label: "Baby", value: "baby" },
          ],
          defaultValue: "direct",
        },
      },
      {
        label: "Wind Speed",
        command: "setWindSpeed",
        parameter: { type: "range", min: 1, max: 100, defaultValue: 50, displayFormatter: (v) => `${Math.round(v)}` },
      },
    ],
    statusFields: [
      { key: "power", label: "Power" },
      { key: "mode", label: "Mode" },
      { key: "fanSpeed", label: "Speed" },
      { key: "battery", label: "Battery", formatter: (v) => (v === undefined ? "—" : `${v}%`) },
      { key: "oscillation", label: "Osc" },
    ],
  },
  {
    key: "vacuumBasic",
    matchers: ["robot vacuum cleaner s1", "robot vacuum cleaner s1 plus", "k10+", "k10+ pro"],
    commands: [
      { label: "Start", command: "start" },
      { label: "Stop", command: "stop" },
      { label: "Dock", command: "dock" },
      {
        label: "Suction (PowLevel)",
        command: "PowLevel",
        parameter: { type: "range", min: 0, max: 3, defaultValue: 1, displayFormatter: (v) => `${Math.round(v)}` },
      },
    ],
    statusFields: [
      { key: "workingStatus", label: "Status" },
      { key: "onlineStatus", label: "Online" },
      { key: "battery", label: "Battery", formatter: (v) => (v === undefined ? "—" : `${v}%`) },
    ],
  },
  {
    key: "vacuumAdvancedK20",
    matchers: ["k20+ pro", "multitasking household robot"],
    commands: [
      {
        label: "Start Clean",
        command: "startClean",
        parameter: {
          type: "text",
          defaultValue: '{"action":"sweep","param":{"fanLevel":1,"times":1}}',
          parseAsJson: true,
          helperText: "action sweep/mop, fanLevel 1-4, times 1+",
        },
      },
      { label: "Pause", command: "pause" },
      { label: "Dock", command: "dock" },
      { label: "Set Volume", command: "setVolume", parameter: { type: "range", min: 0, max: 100, defaultValue: 50 } },
      {
        label: "Change Params",
        command: "changeParam",
        parameter: {
          type: "text",
          defaultValue: '{"fanLevel":1,"waterLevel":1,"times":1}',
          parseAsJson: true,
          helperText: "fanLevel 1-4, waterLevel 1-2, times 1+",
        },
      },
    ],
    statusFields: [
      { key: "workingStatus", label: "Status" },
      { key: "taskType", label: "Task" },
      { key: "onlineStatus", label: "Online" },
      { key: "battery", label: "Battery", formatter: (v) => (v === undefined ? "—" : `${v}%`) },
    ],
  },
  {
    key: "vacuumAdvancedK10Combo",
    matchers: ["k10+ pro combo", "robot vacuum cleaner k10+ pro combo"],
    commands: [
      {
        label: "Start Clean",
        command: "startClean",
        parameter: {
          type: "text",
          defaultValue: '{"action":"sweep","param":{"fanLevel":1,"times":1}}',
          parseAsJson: true,
          helperText: "action sweep/mop, fanLevel 1-4, times 1+",
        },
      },
      { label: "Pause", command: "pause" },
      { label: "Dock", command: "dock" },
      { label: "Set Volume", command: "setVolume", parameter: { type: "range", min: 0, max: 100, defaultValue: 50 } },
      {
        label: "Change Params",
        command: "changeParam",
        parameter: {
          type: "text",
          defaultValue: '{"fanLevel":1,"times":1}',
          parseAsJson: true,
          helperText: "fanLevel 1-4, times 1+",
        },
      },
    ],
    statusFields: [
      { key: "workingStatus", label: "Status" },
      { key: "taskType", label: "Task" },
      { key: "onlineStatus", label: "Online" },
      { key: "battery", label: "Battery", formatter: (v) => (v === undefined ? "—" : `${v}%`) },
    ],
  },
  {
    key: "vacuumS10S20",
    matchers: ["floor cleaning robot s10", "floor cleaning robot s20", "s20"],
    commands: [
      {
        label: "Start Clean",
        command: "startClean",
        parameter: {
          type: "text",
          defaultValue: '{"action":"sweep","param":{"fanLevel":1,"waterLevel":1,"times":1}}',
          parseAsJson: true,
          helperText: "action sweep/sweep_mop, fanLevel 1-4, waterLevel 1-2",
        },
      },
      { label: "Add Water", command: "addWaterForHumi" },
      { label: "Pause", command: "pause" },
      { label: "Dock", command: "dock" },
      { label: "Set Volume", command: "setVolume", parameter: { type: "range", min: 0, max: 100, defaultValue: 50 } },
      {
        label: "Self Clean",
        command: "selfClean",
        parameter: {
          type: "enum",
          options: [
            { label: "Wash Mop", value: 1 },
            { label: "Dry", value: 2 },
            { label: "Terminate", value: 3 },
          ],
          defaultValue: 1,
        },
      },
      {
        label: "Change Params",
        command: "changeParam",
        parameter: {
          type: "text",
          defaultValue: '{"fanLevel":1,"waterLevel":1,"times":1}',
          parseAsJson: true,
          helperText: "fanLevel 1-4, waterLevel 1-2, times 1+",
        },
      },
    ],
    statusFields: [
      { key: "workingStatus", label: "Status" },
      { key: "onlineStatus", label: "Online" },
      { key: "battery", label: "Battery", formatter: (v) => (v === undefined ? "—" : `${v}%`) },
    ],
  },
  {
    key: "vacuumK11",
    matchers: ["k11+"],
    commands: [
      {
        label: "Start Clean",
        command: "startClean",
        parameter: {
          type: "text",
          defaultValue: '{"action":"sweep","param":{"fanLevel":1,"times":1}}',
          parseAsJson: true,
          helperText: "action sweep/mop, fanLevel 1-4, times 1+",
        },
      },
      { label: "Pause", command: "pause" },
      { label: "Dock", command: "dock" },
      { label: "Set Volume", command: "setVolume", parameter: { type: "range", min: 0, max: 100, defaultValue: 50 } },
      {
        label: "Change Params",
        command: "changeParam",
        parameter: {
          type: "text",
          defaultValue: '{"fanLevel":1,"waterLevel":1,"times":1}',
          parseAsJson: true,
          helperText: "fanLevel 1-4, waterLevel 1-2, times 1+",
        },
      },
    ],
    statusFields: [
      { key: "workingStatus", label: "Status" },
      { key: "onlineStatus", label: "Online" },
      { key: "battery", label: "Battery", formatter: (v) => (v === undefined ? "—" : `${v}%`) },
      { key: "taskType", label: "Task" },
    ],
  },
  {
    key: "ceilingLight",
    matchers: ["ceiling light pro", "ceiling light"],
    commands: [
      { label: "Turn On", command: "turnOn" },
      { label: "Turn Off", command: "turnOff" },
      { label: "Toggle", command: "toggle" },
      { label: "Brightness", command: "setBrightness", parameter: { type: "range", min: 1, max: 100, defaultValue: 80 } },
      {
        label: "Color Temperature",
        command: "setColorTemperature",
        parameter: { type: "range", min: 2700, max: 6500, step: 100, defaultValue: 4000, displayFormatter: (v) => `${Math.round(v)}K` },
      },
    ],
    statusFields: [
      { key: "power", label: "Power" },
      { key: "brightness", label: "Brightness", formatter: (v) => (v === undefined ? "—" : `${v}%`) },
      { key: "colorTemperature", label: "ColorTemp", formatter: (v) => (v === undefined ? "—" : `${v}K`) },
      { key: "onlineStatus", label: "Online" },
    ],
  },
  {
    key: "rgbLights",
    matchers: [
      "rgbicww strip light",
      "rgbicww floor lamp",
      "rgbic neon wire rope light",
      "floor lamp",
      "rgbicww floor light",
      "rgbicww strip",
      "rgbic rope",
    ],
    commands: [
      { label: "Turn On", command: "turnOn" },
      { label: "Turn Off", command: "turnOff" },
      { label: "Toggle", command: "toggle" },
      {
        label: "Brightness",
        command: "setBrightness",
        parameter: { type: "range", min: 0, max: 100, defaultValue: 80, displayFormatter: (v) => `${Math.round(v)}%` },
      },
      {
        label: "Color Temperature",
        command: "setColorTemperature",
        parameter: {
          type: "range",
          min: 2700,
          max: 6500,
          step: 100,
          defaultValue: 4000,
          displayFormatter: (v) => `${Math.round(v)}K`,
        },
      },
      {
        label: "Color",
        command: "setColor",
        parameter: {
          type: "text",
          defaultValue: "255:255:255",
          placeholder: "R:G:B (0-255)",
        },
      },
    ],
    statusFields: [
      { key: "power", label: "Power" },
      { key: "brightness", label: "Brightness", formatter: (v) => (v === undefined ? "—" : `${v}%`) },
      { key: "colorTemperature", label: "ColorTemp", formatter: (v) => (v === undefined ? "—" : `${v}K`) },
    ],
  },
  {
    key: "stripLight",
    matchers: ["strip light"],
    commands: [
      { label: "Turn On", command: "turnOn" },
      { label: "Turn Off", command: "turnOff" },
      { label: "Toggle", command: "toggle" },
      {
        label: "Brightness",
        command: "setBrightness",
        parameter: { type: "range", min: 1, max: 100, defaultValue: 80, displayFormatter: (v) => `${Math.round(v)}%` },
      },
      {
        label: "Color",
        command: "setColor",
        parameter: {
          type: "text",
          defaultValue: "255:255:255",
          placeholder: "R:G:B",
        },
      },
    ],
    statusFields: [
      { key: "power", label: "Power" },
      { key: "brightness", label: "Brightness", formatter: (v) => (v === undefined ? "—" : `${v}%`) },
    ],
  },
  {
    key: "colorBulb",
    matchers: ["color bulb"],
    commands: [
      { label: "Turn On", command: "turnOn" },
      { label: "Turn Off", command: "turnOff" },
      { label: "Toggle", command: "toggle" },
      { label: "Brightness", command: "setBrightness", parameter: { type: "range", min: 1, max: 100, defaultValue: 80 } },
      {
        label: "Color",
        command: "setColor",
        parameter: { type: "text", defaultValue: "255:255:255", placeholder: "R:G:B" },
      },
      {
        label: "Color Temperature",
        command: "setColorTemperature",
        parameter: { type: "range", min: 2700, max: 6500, step: 100, defaultValue: 4000 },
      },
    ],
    statusFields: [
      { key: "power", label: "Power" },
      { key: "brightness", label: "Brightness", formatter: (v) => (v === undefined ? "—" : `${v}%`) },
      { key: "colorTemperature", label: "ColorTemp", formatter: (v) => (v === undefined ? "—" : `${v}K`) },
    ],
  },
  {
    key: "waterLeak",
    matchers: ["water leak detector", "water detector"],
    statusFields: [
      {
        key: "status",
        label: "Leak",
        formatter: (value) => {
          if (value === undefined || value === null) return "—";
          return Number(value) === 1 ? "Leak detected" : "Dry";
        },
      },
      { key: "battery", label: "Battery", formatter: (value) => (value === undefined ? "—" : `${value}%`) },
    ],
  },
  {
    key: "meter",
    matchers: ["meter plus", "meter pro co2", "meter pro", "outdoor meter", "meter"],
    statusFields: [
      ...tempHumidityFields,
      {
        key: "CO2",
        label: "CO2",
        formatter: (value) => (value === undefined || value === null ? undefined : `${value} ppm`),
      },
    ],
  },
  {
    key: "hub2",
    matchers: ["hub 2"],
    statusFields: [
      ...tempHumidityFields,
      { key: "lightLevel", label: "Light", formatter: (value) => (value === undefined ? "—" : `${value}`) },
    ],
  },
  {
    key: "hub3",
    matchers: ["hub 3"],
    statusFields: [
      ...tempHumidityFields,
      { key: "lightLevel", label: "Light", formatter: (value) => (value === undefined ? "—" : `${value}`) },
      { key: "moveDetected", label: "Motion", formatter: (value) => (value ? "Detected" : "Idle") },
    ],
  },
  {
    key: "smartRadiatorStatus",
    matchers: ["smart radiato thermostat", "smart radiator thermostat"],
    statusFields: [
      { key: "temperature", label: "Temp", formatter: (v) => (v === undefined ? "—" : `${v}°C`) },
      { key: "targetTemperature", label: "Target", formatter: (v) => (v === undefined ? "—" : `${v}°C`) },
      { key: "mode", label: "Mode" },
      { key: "battery", label: "Battery", formatter: (v) => (v === undefined ? "—" : `${v}%`) },
    ],
  },
  {
    key: "smartPlugStatus",
    matchers: ["plug mini", "plug"],
    statusFields: [{ key: "power", label: "Power" }],
  },
  {
    key: "videoDoorbell",
    matchers: ["video doorbell"],
    commands: [
      { label: "Enable Motion Detection", command: "enableMotionDetection" },
      { label: "Disable Motion Detection", command: "disableMotionDetection" },
    ],
    statusFields: [{ key: "onlineStatus", label: "Online" }],
  },
  {
    key: "keypad",
    matchers: ["keypad touch", "keypad vision", "keypad"],
    commands: [
      {
        label: "Create Key",
        command: "createKey",
        parameter: {
          type: "text",
          defaultValue: '{"name":"Guest","type":"permanent","password":"123456","startTime":1700000000,"endTime":1700003600}',
          parseAsJson: true,
          helperText: "type permanent/timeLimit/disposable/urgent; timestamps in seconds",
          multiline: true,
        },
      },
      {
        label: "Delete Key",
        command: "deleteKey",
        parameter: {
          type: "text",
          defaultValue: '{"id":1}',
          parseAsJson: true,
        },
      },
    ],
  },
  {
    key: "stripLight3",
    matchers: ["strip light 3", "led strip light 3"],
    commands: [
      { label: "Turn On", command: "turnOn" },
      { label: "Turn Off", command: "turnOff" },
      { label: "Toggle", command: "toggle" },
      {
        label: "Brightness",
        command: "setBrightness",
        parameter: { type: "range", min: 0, max: 100, defaultValue: 80, displayFormatter: (v) => `${Math.round(v)}%` },
      },
      {
        label: "Color",
        command: "setColor",
        parameter: { type: "text", defaultValue: "255:255:255", placeholder: "R:G:B" },
      },
      {
        label: "Color Temperature",
        command: "setColorTemperature",
        parameter: { type: "range", min: 2700, max: 6500, defaultValue: 4000, step: 100 },
      },
    ],
    statusFields: [
      { key: "power", label: "Power" },
      { key: "brightness", label: "Brightness", formatter: (v) => (v === undefined ? "—" : `${v}%`) },
      { key: "colorTemperature", label: "ColorTemp", formatter: (v) => (v === undefined ? "—" : `${v}K`) },
    ],
  },
  {
    key: "motionSensor",
    matchers: ["motion sensor", "contact sensor"],
    hide: true,
  },
  {
    key: "remoteButton",
    matchers: ["remote"],
    hide: true,
  },
  {
    key: "camera",
    matchers: ["indoor cam", "pan/tilt cam", "pan/tilt cam 2k", "pan tilt cam"],
    hide: true,
  },
  {
    key: "hub",
    matchers: ["hub mini", "hub plus", "hub"],
    hide: true,
  },
];

export const deviceDefinitions = definitions;

export const findDeviceDefinition = (deviceType?: string) => {
  const normalized = normalizeDeviceType(deviceType);
  let best: { def: DeviceDefinition; score: number } | null = null;
  definitions.forEach((definition) => {
    definition.matchers.forEach((token) => {
      if (normalized.includes(token)) {
        const score = token.length;
        if (!best || score > best.score) {
          best = { def: definition, score };
        }
      }
    });
  });
  return best?.def;
};

export const hasDeviceCommands = (deviceType?: string) => {
  const def = findDeviceDefinition(deviceType);
  return (def?.commands?.length || 0) > 0;
};

export const getStatusFieldsForDevice = (deviceType?: string) => findDeviceDefinition(deviceType)?.statusFields || [];

export const shouldHideDevice = (deviceType?: string) => {
  const def = findDeviceDefinition(deviceType);
  if (def?.hide) return true;
  if (!def) return false;
  const hasCommands = (def.commands?.length || 0) > 0;
  const hasStatus = (def.statusFields?.length || 0) > 0;
  return !hasCommands && !hasStatus;
};
