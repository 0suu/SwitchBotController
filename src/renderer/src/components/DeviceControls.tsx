import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  LinearProgress,
  MenuItem,
  Slider,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { AnyDevice, DeviceStatusResponseBody } from "../../../api/types";
import { AppDispatch, RootState } from "../store/store";
import {
  clearDeviceCommandError,
  selectCommandErrorForDevice,
  selectIsCommandSendingForDevice,
  sendDeviceCommand
} from "../store/slices/deviceSlice";
import { selectIsTokenValidated } from "../store/slices/settingsSlice";
import {
  executeScene,
  fetchScenes,
  selectNightLightSceneForDevice,
  selectSceneExecutionError,
  selectSceneIsExecuting,
  selectScenes,
  selectScenesError,
  selectScenesLoading,
  setNightLightSceneForDevice
} from "../store/slices/sceneSlice";
import { DeviceCommandDefinition, ParameterSpec, findDeviceDefinition } from "../deviceDefinitions";
import { useTranslation } from "../useTranslation";

interface DeviceControlsProps {
  device: AnyDevice;
  status?: Partial<DeviceStatusResponseBody> | null;
  dense?: boolean;
  showCustomCommands?: boolean;
  showNightLightInstruction?: boolean;
  showChildLockControls?: boolean;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const hexToRgbParameter = (hexValue: string): string | null => {
  const hex = hexValue.replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;
  const bigint = parseInt(hex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `${r}:${g}:${b}`;
};

export const DeviceControls: React.FC<DeviceControlsProps> = ({
  device,
  status,
  dense = false,
  showCustomCommands = true,
  showNightLightInstruction = true,
  showChildLockControls = false,
}) => {
  const dispatch: AppDispatch = useDispatch();
  const isSending = useSelector((state: RootState) => selectIsCommandSendingForDevice(state, device.deviceId));
  const deviceError = useSelector((state: RootState) => selectCommandErrorForDevice(state, device.deviceId));
  const isTokenValid = useSelector(selectIsTokenValidated);
  const { t } = useTranslation();

  const [position, setPosition] = useState(50);
  const [brightness, setBrightness] = useState(80);
  const [colorTemp, setColorTemp] = useState(4000);
  const [fanSpeed, setFanSpeed] = useState(50);
  const [color, setColor] = useState("#ffffff");
  const [customCommand, setCustomCommand] = useState("");
  const [customParameter, setCustomParameter] = useState("default");
  const [customCommandType, setCustomCommandType] = useState<"command" | "customize">("command");
  const [targetHumidify, setTargetHumidify] = useState(60);
  const [humidifierLevel, setHumidifierLevel] = useState(50);
  const [vacuumPowerLevel, setVacuumPowerLevel] = useState(1);
  const [acTemperature, setAcTemperature] = useState(26);
  const [acMode, setAcMode] = useState("2"); // 2: cool (per docs)
  const [acFanSpeed, setAcFanSpeed] = useState("3"); // 3: medium
  const [acPower, setAcPower] = useState<"on" | "off">("on");
  const [tvChannel, setTvChannel] = useState("");
  const scenes = useSelector(selectScenes);
  const scenesLoading = useSelector(selectScenesLoading);
  const scenesError = useSelector(selectScenesError);
  const assignedNightLightSceneId = useSelector((state: RootState) =>
    selectNightLightSceneForDevice(state, device.deviceId)
  );
  const nightLightExecuting = useSelector((state: RootState) =>
    assignedNightLightSceneId ? selectSceneIsExecuting(state, assignedNightLightSceneId) : false
  );
  const nightLightExecutionError = useSelector((state: RootState) =>
    assignedNightLightSceneId ? selectSceneExecutionError(state, assignedNightLightSceneId) : null
  );
  const [nightLightSceneSelection, setNightLightSceneSelection] = useState<string>(assignedNightLightSceneId || "");
  const [requestedScenes, setRequestedScenes] = useState(false);

  const definition = useMemo(() => findDeviceDefinition(device.deviceType), [device.deviceType]);
  const isHiddenByDefinition = definition?.hide;
  const rawType = (device.deviceType || (device as any).remoteType || "").toLowerCase();
  const isInfraredRemote = !!(device as any).isInfraredRemote;

  const normalizedType = useMemo(() => rawType, [rawType]);

  const isBot = !isInfraredRemote && normalizedType === "bot";
  const isPlug = !isInfraredRemote && normalizedType.includes("plug");
  const isCurtain = !isInfraredRemote && (normalizedType.includes("curtain") || normalizedType.includes("blind tilt"));
  const isLock = !isInfraredRemote && normalizedType.includes("lock");
  const isCeilingLight = !isInfraredRemote && definition?.key === "ceilingLight";
  const isFloorLamp = !isInfraredRemote && normalizedType.includes("floor lamp");
  const isStripLight3 = !isInfraredRemote && normalizedType.includes("strip light 3");
  const isStripLight = !isInfraredRemote && normalizedType.includes("strip light");
  const isColorBulb = !isInfraredRemote && (normalizedType.includes("color bulb") || normalizedType === "bulb" || normalizedType.includes("bulb"));
  const isLight = !isInfraredRemote && (isCeilingLight || isFloorLamp || isStripLight || isStripLight3 || isColorBulb || normalizedType.includes("light"));
  const isHumidifier = !isInfraredRemote && normalizedType.includes("humidifier");
  const isEvaporativeHumidifier = isHumidifier && (normalizedType.includes("evaporative") || normalizedType.includes("humidifier2"));
  const isFan = !isInfraredRemote && normalizedType.includes("fan");
  const isVacuum = !isInfraredRemote && (normalizedType.includes("vacuum") || normalizedType.includes("cleaner"));
  const isPlugMini = !isInfraredRemote && normalizedType.includes("plug mini");
  const isLockLite = !isInfraredRemote && normalizedType.includes("lock lite");
  const isLockPro = !isInfraredRemote && normalizedType.includes("lock pro");
  const isLockUltra = !isInfraredRemote && normalizedType.includes("lock ultra");

  const supportsPlugToggle = false; // per requirement: only on/off for plug family
  const supportsLightToggle = isLight;
  const supportsLightBrightness = isColorBulb || isStripLight || isStripLight3 || isFloorLamp || isCeilingLight;
  const supportsLightColorTemperature = isColorBulb || isStripLight3 || isFloorLamp || isCeilingLight;
  const supportsLightColor = isColorBulb || isStripLight || isStripLight3 || isFloorLamp;
  const supportsLockDeadbolt = (isLock && !isLockLite) || isLockPro || isLockUltra;
  const controlsDisabled = isSending || !isTokenValid;
  const nightLightScene = useMemo(
    () => scenes.find((scene) => scene.sceneId === assignedNightLightSceneId) || null,
    [assignedNightLightSceneId, scenes]
  );
  const hasScenes = scenes.length > 0;
  const nightLightSelectionChanged = nightLightSceneSelection !== (assignedNightLightSceneId || "");
  const nightLightButtonDisabled = controlsDisabled || !isTokenValid || !nightLightScene || nightLightExecuting;
  const nightLightSaveDisabled =
    !isTokenValid ||
    scenesLoading ||
    (!hasScenes && !assignedNightLightSceneId && nightLightSceneSelection === "") ||
    !nightLightSelectionChanged;
  const nightLightInfoText =
    nightLightScene
      ? `${t("Assigned scene")}: ${nightLightScene.sceneName || t("Unnamed Scene")}`
      : showNightLightInstruction
        ? t("Assign a scene to enable the night light button.")
        : null;
  const nightLightInfoColor = nightLightScene ? "text.secondary" : "warning.main";
  const remoteTypeLabel = (device as any).remoteType || device.deviceType;
  const remoteTypeLower = (remoteTypeLabel || "").toLowerCase();
  const remoteSupportsDefaultCommands = remoteTypeLower !== "others";
  const isRemoteAC = isInfraredRemote && remoteTypeLower.includes("air conditioner");
  const isRemoteTV = isInfraredRemote && (remoteTypeLower.includes("tv") || remoteTypeLower.includes("iptv") || remoteTypeLower.includes("streamer") || remoteTypeLower.includes("set top"));
  const isRemoteSpeaker = isInfraredRemote && (remoteTypeLower.includes("speaker") || remoteTypeLower.includes("dvd"));
  const isRemoteFan = isInfraredRemote && remoteTypeLower.includes("fan");
  const isRemoteLight = isInfraredRemote && remoteTypeLower.includes("light");

  const hasPredefinedControls = isInfraredRemote || isBot || isPlug || isCurtain || isLock || isLight || isHumidifier || isFan || isVacuum;
  const botModeRaw = isBot ? status?.deviceMode || (device as any)?.deviceMode : "";
  const botModeNormalized = typeof botModeRaw === "string" ? botModeRaw.toLowerCase() : "";
  const botModeType: "switch" | "press" | "customize" | "unknown" = botModeNormalized.includes("switch")
    ? "switch"
    : botModeNormalized.includes("press")
      ? "press"
      : botModeNormalized.includes("custom")
        ? "customize"
        : "unknown";
  const botModeLabelMap: Record<typeof botModeType, string> = {
    switch: t("Switch Mode"),
    press: t("Press Mode"),
    customize: t("Custom Mode"),
    unknown: t("Mode Unknown"),
  };
  const botShowsOnOff = botModeType === "switch" || botModeType === "unknown";
  const botShowsPress = botModeType === "press" || botModeType === "customize" || botModeType === "unknown";

  const sendCommand = (command: string, parameter: any = "default", commandType: "command" | "customize" = "command") => {
    dispatch(clearDeviceCommandError(device.deviceId));
    dispatch(sendDeviceCommand({ deviceId: device.deviceId, command, parameter, commandType }));
  };

  type EvaporativeModeKey = "level1" | "level2" | "level3" | "level4" | "humidity" | "sleep" | "auto" | "dry";
  type StandardHumidifierModeKey = "auto" | "low" | "medium" | "high";
  const sendHumidifierMode = (mode: EvaporativeModeKey | StandardHumidifierModeKey) => {
    if (isEvaporativeHumidifier) {
      const safeTarget = clamp(targetHumidify, 0, 100);
      const modeMap: Record<EvaporativeModeKey, number> = {
        level4: 1, // highest
        level3: 2,
        level2: 3,
        level1: 4, // lowest
        humidity: 5,
        sleep: 6,
        auto: 7,
        dry: 8
      };
      if (mode in modeMap) {
        sendCommand("setMode", { mode: modeMap[mode as EvaporativeModeKey], targetHumidify: safeTarget });
      }
      return;
    }

    const modeMap = { auto: "auto", low: "101", medium: "102", high: "103" };
    sendCommand("setMode", modeMap[mode]);
  };

  const handleExecuteNightLightScene = () => {
    if (nightLightScene) {
      dispatch(executeScene(nightLightScene.sceneId));
    }
  };

  const handleSaveNightLightScene = () => {
    dispatch(setNightLightSceneForDevice({
      deviceId: device.deviceId,
      sceneId: nightLightSceneSelection || null
    }));
  };

  const handleRefreshScenes = () => {
    setRequestedScenes(true);
    dispatch(fetchScenes());
  };

  const sliderLabel = (value: number) => `${value}`;

  const sectionLabelSx = { fontWeight: 700, color: "text.secondary", mt: dense ? 0.25 : 1 };
  const renderSectionLabel = (label: React.ReactNode) => {
    if (dense) return null;
    return (
      <Typography variant="subtitle2" sx={sectionLabelSx}>
        {label}
      </Typography>
    );
  };
  const gridColumns = dense ? 2 : 3;
  const maxControlWidth = dense ? 360 : 520;
  const buttonGridSx = {
    display: "grid",
    gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))`,
    gap: dense ? 0.5 : 1,
    width: "100%",
    maxWidth: maxControlWidth
  };
  const sliderContainerSx = { width: "100%", maxWidth: maxControlWidth };
  const compactInputWidth = dense ? 220 : 260;

  const evaporativeModeButtons: Array<{ label: string; mode: EvaporativeModeKey }> = [
    { label: t("Auto"), mode: "auto" },
    { label: "Humidity", mode: "humidity" },
    { label: "Sleep", mode: "sleep" },
    { label: "Dry", mode: "dry" },
    { label: "Level 4", mode: "level4" },
    { label: "Level 3", mode: "level3" },
    { label: "Level 2", mode: "level2" },
    { label: "Level 1", mode: "level1" }
  ];

  const standardHumidifierModes: Array<{ label: string; mode: StandardHumidifierModeKey }> = [
    { label: t("Auto"), mode: "auto" },
    { label: t("Low"), mode: "low" },
    { label: t("Medium"), mode: "medium" },
    { label: t("High"), mode: "high" }
  ];

  const humidifierModeGridColumns = gridColumns;
  const humidifierModeGridMaxWidth = Math.min(maxControlWidth, dense ? 340 : 480);

  const [dynamicParams, setDynamicParams] = useState<Record<string, any>>({});

  useEffect(() => {
    const defaults: Record<string, any> = {};
    (definition?.commands || []).forEach((cmd) => {
      const param = cmd.parameter;
      if (!param) return;
      if (param.type === "range" && param.defaultValue !== undefined) defaults[cmd.command] = param.defaultValue;
      if (param.type === "enum" && param.defaultValue !== undefined) defaults[cmd.command] = param.defaultValue;
      if (param.type === "text" && param.defaultValue !== undefined) defaults[cmd.command] = param.defaultValue;
    });
    setDynamicParams(defaults);
  }, [definition, device.deviceId]);

  useEffect(() => {
    setNightLightSceneSelection(assignedNightLightSceneId || "");
  }, [assignedNightLightSceneId]);

  useEffect(() => {
    if (!isCeilingLight || !isTokenValid) return;
    if (hasScenes || scenesLoading || requestedScenes) return;
    setRequestedScenes(true);
    dispatch(fetchScenes());
  }, [dispatch, hasScenes, isCeilingLight, isTokenValid, requestedScenes, scenesLoading]);

  const resolveParameterValue = (cmd: DeviceCommandDefinition) => {
    const spec = cmd.parameter;
    if (!spec || spec.type === "none") return "default";
    const raw = dynamicParams[cmd.command];
    if (spec.type === "range") {
      const numVal = Number(raw);
      const mapped = spec.mapValue ? spec.mapValue(numVal) : numVal;
      return mapped;
    }
    if (spec.type === "enum") return raw ?? spec.defaultValue ?? "default";
    if (spec.type === "text") {
      if (spec.parseAsJson) {
        try {
          return JSON.parse(raw || spec.defaultValue || "{}");
        } catch (e) {
          return raw || spec.defaultValue || "default";
        }
      }
      return raw ?? spec.defaultValue ?? "default";
    }
    return raw ?? "default";
  };

  const specNeedsMargin = (spec?: ParameterSpec) => !!spec && spec.type !== "none";

  const renderParameterControl = (cmd: DeviceCommandDefinition) => {
    const spec = cmd.parameter;
    if (!spec || spec.type === "none") return null;
    const value = dynamicParams[cmd.command] ?? spec.defaultValue ?? "";
    if (spec.type === "range") {
      return (
        <Stack spacing={0.5} sx={{ width: "100%", maxWidth: maxControlWidth }}>
          <Typography variant="caption" color="text.secondary">{cmd.label} value</Typography>
          <Slider
            size="small"
            min={spec.min}
            max={spec.max}
            step={spec.step || 1}
            value={Number(value)}
            onChange={(_, v) => setDynamicParams((prev) => ({ ...prev, [cmd.command]: v as number }))}
            valueLabelDisplay="auto"
            aria-label={cmd.label}
            disabled={controlsDisabled}
          />
        </Stack>
      );
    }
    if (spec.type === "enum") {
      const toTypedValue = (val: any) =>
        spec.options.length > 0 && typeof spec.options[0].value === "number" ? Number(val) : val;
      return (
        <TextField
          select
          size="small"
          label={cmd.label}
          value={value}
          onChange={(e) => setDynamicParams((prev) => ({ ...prev, [cmd.command]: toTypedValue(e.target.value) }))}
          fullWidth
          sx={{ maxWidth: maxControlWidth }}
        >
          {spec.options.map((opt) => (
            <MenuItem key={String(opt.value)} value={opt.value}>{opt.label}</MenuItem>
          ))}
        </TextField>
      );
    }
    if (spec.type === "text") {
      return (
        <TextField
          label={cmd.label}
          size="small"
          value={value}
          onChange={(e) => setDynamicParams((prev) => ({ ...prev, [cmd.command]: e.target.value }))}
          placeholder={spec.placeholder}
          helperText={spec.helperText}
          fullWidth
          multiline={spec.multiline}
          sx={{ maxWidth: maxControlWidth }}
        />
      );
    }
    return null;
  };

  const renderDynamicCommands = () => {
    const cmds = definition?.commands || [];
    if (cmds.length === 0 || isHiddenByDefinition) return null;
    return (
      <Stack spacing={dense ? 0.6 : 1.2}>
        {renderSectionLabel("Controls")}
        <Stack spacing={dense ? 0.5 : 1}>
          {cmds.map((cmd) => (
            <Box key={cmd.command} sx={{ borderBottom: "1px dashed rgba(255,255,255,0.12)", pb: dense ? 0.5 : 1, mb: dense ? 0.5 : 1 }}>
              {renderParameterControl(cmd)}
              <Button
                size="small"
                variant="contained"
                sx={{ mt: specNeedsMargin(cmd.parameter) ? 0.5 : 0 }}
                disabled={controlsDisabled}
                onClick={() => sendCommand(cmd.command, resolveParameterValue(cmd), cmd.commandType || "command")}
              >
                {cmd.label}
              </Button>
            </Box>
          ))}
        </Stack>
      </Stack>
    );
  };

  if (isInfraredRemote) {
    return (
      <Box sx={{ p: dense ? 0.5 : 0, borderRadius: 1 }}>
        {isSending && <LinearProgress sx={{ mb: 1 }} />}
        {deviceError && <Alert severity="error" sx={{ mb: 1 }}>{deviceError}</Alert>}
        <Stack spacing={dense ? 0.6 : 1.2}>
          {renderSectionLabel(
            <>
              {t("Virtual Remote")} - {remoteTypeLabel || t("Infrared device")}
            </>
          )}

          {remoteSupportsDefaultCommands && (
            <Box sx={buttonGridSx}>
              <Button
                size="small"
                variant="contained"
                onClick={() => sendCommand("turnOn")}
                disabled={controlsDisabled}
                fullWidth
              >
                {t("On")}
              </Button>
              <Button
                size="small"
                variant="contained"
                color="secondary"
                onClick={() => sendCommand("turnOff")}
                disabled={controlsDisabled}
                fullWidth
              >
                {t("Off")}
              </Button>
            </Box>
          )}

          {isRemoteAC && (
            <>
              <Box sx={sliderContainerSx}>
                <Typography variant="caption" color="text.secondary">Temperature (°C)</Typography>
                <Slider
                  size="small"
                  value={acTemperature}
                  min={16}
                  max={32}
                  step={1}
                  onChange={(_, v) => setAcTemperature(v as number)}
                  valueLabelDisplay="auto"
                  aria-label="AC temperature"
                  disabled={controlsDisabled}
                />
              </Box>
              <Box sx={{ ...buttonGridSx, alignItems: "center" }}>
                <TextField
                  select
                  size="small"
                  label="Mode"
                  value={acMode}
                  onChange={(e) => setAcMode(e.target.value)}
                  fullWidth
                >
                  <MenuItem value="1">Auto</MenuItem>
                  <MenuItem value="2">Cool</MenuItem>
                  <MenuItem value="3">Dry</MenuItem>
                  <MenuItem value="4">Fan</MenuItem>
                  <MenuItem value="5">Heat</MenuItem>
                </TextField>
                <TextField
                  select
                  size="small"
                  label="Fan speed"
                  value={acFanSpeed}
                  onChange={(e) => setAcFanSpeed(e.target.value)}
                  fullWidth
                >
                  <MenuItem value="1">Auto</MenuItem>
                  <MenuItem value="2">Low</MenuItem>
                  <MenuItem value="3">Medium</MenuItem>
                  <MenuItem value="4">High</MenuItem>
                </TextField>
                <TextField
                  select
                  size="small"
                  label="Power"
                  value={acPower}
                  onChange={(e) => setAcPower(e.target.value as "on" | "off")}
                  fullWidth
                >
                  <MenuItem value="on">On</MenuItem>
                  <MenuItem value="off">{t("Off")}</MenuItem>
                </TextField>
              </Box>
              <Button
                size="small"
                variant="outlined"
                onClick={() => sendCommand("setAll", `${acTemperature},${acMode},${acFanSpeed},${acPower}`)}
                disabled={controlsDisabled}
                fullWidth
                sx={{ alignSelf: "flex-start", maxWidth: maxControlWidth }}
              >
                {t("Send setAll")}
              </Button>
            </>
          )}

          {isRemoteTV && (
            <>
              <Box sx={buttonGridSx}>
                <Button size="small" variant="outlined" onClick={() => sendCommand("volumeAdd")} disabled={controlsDisabled} fullWidth>Volume +</Button>
                <Button size="small" variant="outlined" onClick={() => sendCommand("volumeSub")} disabled={controlsDisabled} fullWidth>Volume -</Button>
                <Button size="small" variant="outlined" onClick={() => sendCommand("channelAdd")} disabled={controlsDisabled} fullWidth>Channel +</Button>
                <Button size="small" variant="outlined" onClick={() => sendCommand("channelSub")} disabled={controlsDisabled} fullWidth>Channel -</Button>
              </Box>
              <Stack spacing={0.5} sx={{ width: "100%", maxWidth: maxControlWidth }}>
                <TextField
                  label="Channel number"
                  size="small"
                  value={tvChannel}
                  onChange={(e) => setTvChannel(e.target.value)}
                  placeholder="e.g. 15"
                />
                <Button
                  size="small"
                  variant="outlined"
                  disabled={controlsDisabled || !tvChannel}
                  onClick={() => sendCommand("SetChannel", tvChannel)}
                  sx={{ alignSelf: "flex-start" }}
                >
                  Set channel
                </Button>
              </Stack>
            </>
          )}

          {isRemoteSpeaker && (
            <Box sx={buttonGridSx}>
              <Button size="small" variant="outlined" onClick={() => sendCommand("setMute")} disabled={controlsDisabled} fullWidth>Mute</Button>
              <Button size="small" variant="outlined" onClick={() => sendCommand("Play")} disabled={controlsDisabled} fullWidth>Play</Button>
              <Button size="small" variant="outlined" onClick={() => sendCommand("Pause")} disabled={controlsDisabled} fullWidth>Pause</Button>
              <Button size="small" variant="outlined" onClick={() => sendCommand("Stop")} disabled={controlsDisabled} fullWidth>Stop</Button>
              <Button size="small" variant="outlined" onClick={() => sendCommand("Next")} disabled={controlsDisabled} fullWidth>Next</Button>
              <Button size="small" variant="outlined" onClick={() => sendCommand("Previous")} disabled={controlsDisabled} fullWidth>Previous</Button>
              <Button size="small" variant="outlined" onClick={() => sendCommand("FastForward")} disabled={controlsDisabled} fullWidth>Fast Forward</Button>
              <Button size="small" variant="outlined" onClick={() => sendCommand("Rewind")} disabled={controlsDisabled} fullWidth>Rewind</Button>
              <Button size="small" variant="outlined" onClick={() => sendCommand("volumeAdd")} disabled={controlsDisabled} fullWidth>Volume +</Button>
              <Button size="small" variant="outlined" onClick={() => sendCommand("volumeSub")} disabled={controlsDisabled} fullWidth>Volume -</Button>
            </Box>
          )}

          {isRemoteFan && (
            <Box sx={buttonGridSx}>
              <Button size="small" variant="outlined" onClick={() => sendCommand("swing")} disabled={controlsDisabled} fullWidth>Swing</Button>
              <Button size="small" variant="outlined" onClick={() => sendCommand("timer")} disabled={controlsDisabled} fullWidth>Timer</Button>
              <Button size="small" variant="outlined" onClick={() => sendCommand("lowSpeed")} disabled={controlsDisabled} fullWidth>Low</Button>
              <Button size="small" variant="outlined" onClick={() => sendCommand("middleSpeed")} disabled={controlsDisabled} fullWidth>Medium</Button>
              <Button size="small" variant="outlined" onClick={() => sendCommand("highSpeed")} disabled={controlsDisabled} fullWidth>High</Button>
            </Box>
          )}

          {isRemoteLight && (
            <Box sx={buttonGridSx}>
              <Button size="small" variant="outlined" onClick={() => sendCommand("brightnessUp")} disabled={controlsDisabled} fullWidth>Brightness +</Button>
              <Button size="small" variant="outlined" onClick={() => sendCommand("brightnessDown")} disabled={controlsDisabled} fullWidth>Brightness -</Button>
            </Box>
          )}

          {showCustomCommands && (
            <>
              <Divider>
                <Chip label="Custom command" size="small" />
              </Divider>
              <Stack spacing={1} sx={{ width: "100%", maxWidth: maxControlWidth }}>
                <TextField
                  label="Command name"
                  size="small"
                  value={customCommand}
                  onChange={(e) => setCustomCommand(e.target.value)}
                  placeholder="e.g. customButtonName"
                  fullWidth
                />
                <TextField
                  label="Parameter"
                  size="small"
                  value={customParameter}
                  onChange={(e) => setCustomParameter(e.target.value)}
                  placeholder="default or command-specific"
                  fullWidth
                />
                <TextField
                  select
                  label="Command type"
                  size="small"
                  value={customCommandType}
                  onChange={(e) => setCustomCommandType(e.target.value as "command" | "customize")}
                >
                  <MenuItem value="command">command</MenuItem>
                  <MenuItem value="customize">customize (for user-defined buttons)</MenuItem>
                </TextField>
                <Button
                  variant="outlined"
                  size="small"
                  disabled={!customCommand || controlsDisabled}
                  onClick={() => sendCommand(customCommand, customParameter || "default", customCommandType)}
                >
                  Send custom command
                </Button>
                <Typography variant="caption" color="text.secondary">
                  For customized infrared buttons, set command type to customize.
                </Typography>
              </Stack>
            </>
          )}
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ p: dense ? 0.5 : 0, borderRadius: 1 }}>
      {isSending && <LinearProgress sx={{ mb: 1 }} />}
      {deviceError && <Alert severity="error" sx={{ mb: 1 }}>{deviceError}</Alert>}

      <Stack spacing={dense ? 0.6 : 1.2}>
        {isBot && (
          <>
            {renderSectionLabel("Bot")}
            {botModeType !== "unknown" && (
              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: dense ? 0.5 : 1 }}>
                <Chip label={`${t("Mode")}: ${botModeLabelMap[botModeType]}`} size="small" variant="outlined" />
              </Stack>
            )}
            {(botModeType === "press" || botModeType === "customize") ? (
              <Box sx={{ width: "100%", maxWidth: maxControlWidth }}>
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => sendCommand("press")}
                  disabled={controlsDisabled}
                  fullWidth
                >
                  Press
                </Button>
              </Box>
            ) : (
              <Box sx={buttonGridSx}>
                {botShowsOnOff && (
                  <Button size="small" variant="contained" onClick={() => sendCommand("turnOn")} disabled={controlsDisabled} fullWidth>
                    Turn On
                  </Button>
                )}
                {botShowsOnOff && (
                  <Button size="small" variant="contained" color="secondary" onClick={() => sendCommand("turnOff")} disabled={controlsDisabled} fullWidth>
                    Turn Off
                  </Button>
                )}
                {botShowsPress && (
                  <Button size="small" variant="contained" onClick={() => sendCommand("press")} disabled={controlsDisabled} fullWidth>
                    Press
                  </Button>
                )}
              </Box>
            )}
          </>
        )}

        {isPlug && (
          <>
            {renderSectionLabel("Plug")}
            <Box sx={buttonGridSx}>
              <Button
                size="small"
                variant="contained"
                color="primary"
                onClick={() => sendCommand("turnOn")}
                disabled={controlsDisabled}
                fullWidth
              >
                {t("On")}
              </Button>
              <Button
                size="small"
                variant="contained"
                color="secondary"
                onClick={() => sendCommand("turnOff")}
                disabled={controlsDisabled}
                fullWidth
              >
                {t("Off")}
              </Button>
            </Box>
          </>
        )}

        {(isCurtain) && (
          <>
            {renderSectionLabel("Curtain / Blind")}
            <Box sx={buttonGridSx}>
              <Button size="small" variant="contained" onClick={() => sendCommand("turnOn")} disabled={controlsDisabled} fullWidth>Open</Button>
              <Button size="small" variant="outlined" onClick={() => sendCommand("pause")} disabled={controlsDisabled} fullWidth>Pause</Button>
              <Button size="small" variant="contained" color="secondary" onClick={() => sendCommand("turnOff")} disabled={controlsDisabled} fullWidth>Close</Button>
            </Box>
            <Box sx={sliderContainerSx}>
              <Slider
                size="small"
                value={position}
                min={0}
                max={100}
                step={1}
                onChange={(_, value) => setPosition(value as number)}
                onChangeCommitted={(_, value) => sendCommand("setPosition", `0,ff,${clamp(value as number, 0, 100)}`)}
                valueLabelDisplay="auto"
                valueLabelFormat={sliderLabel}
                aria-label="Curtain position"
                disabled={controlsDisabled}
              />
              <Typography variant="caption" color="text.secondary">Adjust position (0-100). Applies on release.</Typography>
            </Box>
          </>
        )}

        {isLight && (
          <>
            {renderSectionLabel("Lighting")}
            <Box sx={buttonGridSx}>
              <Button
                size="small"
                variant="contained"
                onClick={() => sendCommand("turnOn")}
                disabled={controlsDisabled}
                fullWidth
              >
                {t("On")}
              </Button>
              <Button
                size="small"
                variant="contained"
                color="secondary"
                onClick={() => sendCommand("turnOff")}
                disabled={controlsDisabled}
                fullWidth
              >
                {t("Off")}
              </Button>
              {supportsLightToggle && (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => sendCommand("toggle")}
                  disabled={controlsDisabled}
                  fullWidth
                >
                  Toggle
                </Button>
              )}
              {isCeilingLight && (
                <Button
                  size="small"
                  variant="contained"
                  onClick={handleExecuteNightLightScene}
                  disabled={nightLightButtonDisabled}
                  fullWidth
                >
                  {nightLightExecuting ? t("Executing...") : t("Night Light")}
                </Button>
              )}
            </Box>
            {isCeilingLight && (
              <Stack spacing={0.25} sx={{ width: "100%", maxWidth: maxControlWidth }}>
                {nightLightInfoText && (
                  <Typography variant="caption" color={nightLightInfoColor}>
                    {nightLightInfoText}
                  </Typography>
                )}
                {assignedNightLightSceneId && !nightLightScene && (
                  <Typography variant="caption" color="error">
                    {t("The assigned scene is not available. Refresh scenes or reassign.")}
                  </Typography>
                )}
                {nightLightExecutionError && (
                  <Typography variant="caption" color="error">
                    {nightLightExecutionError}
                  </Typography>
                )}
              </Stack>
            )}
            {supportsLightBrightness && (
              <Box sx={sliderContainerSx}>
                <Typography variant="caption" color="text.secondary">Brightness</Typography>
                <Slider
                  size="small"
                  value={brightness}
                  min={1}
                  max={100}
                  onChange={(_, value) => setBrightness(value as number)}
                  onChangeCommitted={(_, value) => sendCommand("setBrightness", Math.round(value as number))}
                  valueLabelDisplay="auto"
                  aria-label="Brightness"
                  disabled={controlsDisabled}
                />
              </Box>
            )}
            {supportsLightColorTemperature && (
              <Box sx={sliderContainerSx}>
                <Typography variant="caption" color="text.secondary">Color temperature (2700-6500K)</Typography>
                <Slider
                  size="small"
                  value={colorTemp}
                  min={2700}
                  max={6500}
                  step={100}
                  onChange={(_, value) => setColorTemp(value as number)}
                  onChangeCommitted={(_, value) => sendCommand("setColorTemperature", Math.round(value as number))}
                  valueLabelDisplay="auto"
                  aria-label="Color temperature"
                  disabled={controlsDisabled}
                />
              </Box>
            )}
            {supportsLightColor && (
              <Stack direction="row" spacing={1} alignItems="center" sx={{ width: "100%", maxWidth: maxControlWidth }}>
                <TextField
                  label="Color (#RRGGBB)"
                  size="small"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  sx={{ minWidth: 180, maxWidth: compactInputWidth }}
                />
                <Button
                  size="small"
                  variant="outlined"
                  disabled={controlsDisabled}
                  onClick={() => {
                    const rgb = hexToRgbParameter(color);
                    if (rgb) sendCommand("setColor", rgb);
                  }}
                >
                  {t("Apply")}
                </Button>
              </Stack>
            )}
            {isCeilingLight && !dense && (
              <Stack spacing={0.75} sx={{ width: "100%", maxWidth: maxControlWidth }}>
                {renderSectionLabel(t("Night light button settings"))}
                <TextField
                  select
                  size="small"
                  label={t("Assign scene")}
                  value={nightLightSceneSelection}
                  onChange={(e) => setNightLightSceneSelection(e.target.value)}
                  disabled={!isTokenValid || scenesLoading || (!hasScenes && !assignedNightLightSceneId)}
                  helperText={hasScenes ? t("Select a scene to run when pressing the night light button.") : t("No scenes found. Create a manual scene in the SwitchBot app.")}
                >
                  <MenuItem value="">{t("No scene assigned")}</MenuItem>
                  {scenes.map((scene) => (
                    <MenuItem key={scene.sceneId} value={scene.sceneId}>
                      {scene.sceneName || t("Unnamed Scene")}
                    </MenuItem>
                  ))}
                </TextField>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={handleSaveNightLightScene}
                    disabled={nightLightSaveDisabled}
                  >
                    {t("Save assignment")}
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleRefreshScenes}
                    disabled={scenesLoading || !isTokenValid}
                  >
                    {scenesLoading ? t("Loading scenes...") : t("Reload scenes")}
                  </Button>
                </Stack>
                {scenesError && (
                  <Typography variant="caption" color="error">
                    {scenesError}
                  </Typography>
                )}
              </Stack>
            )}
          </>
        )}

        {isHumidifier && (
          <>
            {renderSectionLabel("Humidifier")}
            <Box sx={buttonGridSx}>
              <Button
                size="small"
                variant="contained"
                color="primary"
                onClick={() => sendCommand("turnOn")}
                disabled={controlsDisabled}
                fullWidth
              >
                {t("On")}
              </Button>
              <Button
                size="small"
                variant="contained"
                color="secondary"
                onClick={() => sendCommand("turnOff")}
                disabled={controlsDisabled}
                fullWidth
              >
                {t("Off")}
              </Button>
            </Box>
            {isEvaporativeHumidifier ? (
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${humidifierModeGridColumns}, minmax(0, 1fr))`,
                  gap: dense ? 0.5 : 1,
                  width: "100%",
                  maxWidth: humidifierModeGridMaxWidth
                }}
              >
                {evaporativeModeButtons.map(({ label, mode }) => (
                  <Button
                    key={mode}
                    size="small"
                    variant="outlined"
                    onClick={() => sendHumidifierMode(mode)}
                    disabled={controlsDisabled}
                    fullWidth
                  >
                    {label}
                  </Button>
                ))}
              </Box>
            ) : (
              <>
                <Box sx={buttonGridSx}>
                  {standardHumidifierModes.map(({ label, mode }) => (
                    <Button
                      key={mode}
                      size="small"
                      variant="outlined"
                      onClick={() => sendHumidifierMode(mode)}
                      disabled={controlsDisabled}
                      fullWidth
                    >
                      {label}
                    </Button>
                  ))}
                </Box>
                <Box sx={{ ...sliderContainerSx, maxWidth: Math.min(humidifierModeGridMaxWidth, 320) }}>
                  <Typography variant="caption" color="text.secondary">Atomization efficiency (0-100)</Typography>
                  <Slider
                    size="small"
                    value={humidifierLevel}
                    min={0}
                    max={100}
                    step={1}
                    onChange={(_, value) => setHumidifierLevel(value as number)}
                    onChangeCommitted={(_, value) =>
                      sendCommand("setMode", clamp(value as number, 0, 100))
                    }
                    valueLabelDisplay="auto"
                    aria-label="Atomization efficiency"
                    disabled={controlsDisabled}
                  />
                </Box>
              </>
            )}
            {isEvaporativeHumidifier && showChildLockControls && (
              <Box sx={buttonGridSx}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => sendCommand("setChildLock", true)}
                  disabled={controlsDisabled}
                  fullWidth
                >
                  Child Lock On
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => sendCommand("setChildLock", false)}
                  disabled={controlsDisabled}
                  fullWidth
                >
                  Child Lock Off
                </Button>
              </Box>
            )}
            {isEvaporativeHumidifier && (
              <Stack spacing={0.5} sx={{ maxWidth: Math.min(humidifierModeGridMaxWidth, 320) }}>
                <Typography variant="caption" color="text.secondary">Target humidity (%)</Typography>
                <Slider
                  size="small"
                  value={targetHumidify}
                  min={0}
                  max={100}
                  step={1}
                  onChange={(_, value) => setTargetHumidify(value as number)}
                  valueLabelDisplay="auto"
                  aria-label="Target humidity"
                  disabled={controlsDisabled}
                />
              </Stack>
            )}
          </>
        )}

        {isFan && (
          <>
            {renderSectionLabel("Fan")}
            <Box sx={buttonGridSx}>
              <Button
                size="small"
                variant="contained"
                onClick={() => sendCommand("turnOn")}
                disabled={controlsDisabled}
                fullWidth
              >
                {t("On")}
              </Button>
              <Button
                size="small"
                variant="contained"
                color="secondary"
                onClick={() => sendCommand("turnOff")}
                disabled={controlsDisabled}
                fullWidth
              >
                {t("Off")}
              </Button>
            </Box>
            <Box sx={buttonGridSx}>
              {["direct", "natural", "sleep", "baby"].map((mode) => (
                <Button
                  key={mode}
                  size="small"
                  variant="outlined"
                  onClick={() => sendCommand("setWindMode", mode)}
                  disabled={controlsDisabled}
                  fullWidth
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </Button>
              ))}
            </Box>
            <Box sx={buttonGridSx}>
              {[
                { label: "Nightlight Off", value: "off" },
                { label: "Nightlight Bright", value: "1" },
                { label: "Nightlight Dim", value: "2" }
              ].map(({ label, value }) => (
                <Button
                  key={value}
                  size="small"
                  variant="outlined"
                  onClick={() => sendCommand("setNightLightMode", value)}
                  disabled={controlsDisabled}
                  fullWidth
                >
                  {label}
                </Button>
              ))}
            </Box>
            <Box sx={sliderContainerSx}>
              <Typography variant="caption" color="text.secondary">Wind speed (1-100)</Typography>
              <Slider
                size="small"
                value={fanSpeed}
                min={1}
                max={100}
                step={1}
                onChange={(_, value) => setFanSpeed(value as number)}
                onChangeCommitted={(_, value) => sendCommand("setWindSpeed", clamp(value as number, 1, 100))}
                valueLabelDisplay="auto"
                aria-label="Fan speed"
                disabled={controlsDisabled}
              />
            </Box>
          </>
        )}

        {isVacuum && (
          <>
            {renderSectionLabel("Vacuum")}
            <Box sx={buttonGridSx}>
              <Button
                size="small"
                variant="contained"
                onClick={() => sendCommand("start")}
                disabled={controlsDisabled}
                fullWidth
              >
                {t("Start")}
              </Button>
              <Button
                size="small"
                variant="contained"
                color="secondary"
                onClick={() => sendCommand("dock")}
                disabled={controlsDisabled}
                fullWidth
              >
                {t("Dock")}
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="secondary"
                onClick={() => sendCommand("stop")}
                disabled={controlsDisabled}
                fullWidth
              >
                {t("Stop")}
              </Button>
            </Box>
            <Box sx={sliderContainerSx}>
              <Typography variant="caption" color="text.secondary">Suction power (PowLevel 0-3)</Typography>
              <Slider
                size="small"
                value={vacuumPowerLevel}
                min={0}
                max={3}
                step={1}
                onChange={(_, value) => setVacuumPowerLevel(value as number)}
                onChangeCommitted={(_, value) => sendCommand("PowLevel", clamp(value as number, 0, 3))}
                valueLabelDisplay="auto"
                aria-label="Vacuum suction level"
                disabled={controlsDisabled}
              />
            </Box>
          </>
        )}

        {isLock && (
          <>
            {renderSectionLabel("Lock")}
            <Box sx={buttonGridSx}>
              <Button
                size="small"
                variant="contained"
                onClick={() => sendCommand("lock")}
                disabled={controlsDisabled}
                fullWidth
              >
                {t("Lock")}
              </Button>
              <Button
                size="small"
                variant="contained"
                color="secondary"
                onClick={() => sendCommand("unlock")}
                disabled={controlsDisabled}
                fullWidth
              >
                {t("Unlock")}
              </Button>
              {supportsLockDeadbolt && (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => sendCommand("deadbolt")}
                  disabled={controlsDisabled}
                  fullWidth
                >
                  Deadbolt
                </Button>
              )}
            </Box>
          </>
        )}

        {!hasPredefinedControls && renderDynamicCommands()}
        {!hasPredefinedControls && !(definition?.commands?.length) && showCustomCommands && (
          <Typography variant="body2" color="text.secondary">
            {t("No quick controls available for this device type.")}
          </Typography>
        )}

        {showCustomCommands && (
          <>
            <Divider>
              <Chip label={t("Custom command")} size="small" />
            </Divider>
            <Stack spacing={1} sx={{ width: "100%", maxWidth: maxControlWidth }}>
              <TextField
                label={t("Command name")}
                size="small"
                value={customCommand}
                onChange={(e) => setCustomCommand(e.target.value)}
                placeholder="e.g. toggle, refresh"
                fullWidth
              />
              <TextField
                label={t("Parameter")}
                size="small"
                value={customParameter}
                onChange={(e) => setCustomParameter(e.target.value)}
                placeholder="default, 0,ff,50, etc."
                fullWidth
              />
              <Button
                variant="outlined"
                size="small"
                disabled={!customCommand || controlsDisabled}
                onClick={() => sendCommand(customCommand, customParameter || "default")}
              >
                {t("Send custom command")}
              </Button>
              <Typography variant="caption" color="text.secondary">
                {t(
                  "Sends directly to SwitchBot API. Keep parameters consistent with your device specification."
                )}
              </Typography>
            </Stack>
          </>
        )}
      </Stack>
    </Box>
  );
};
