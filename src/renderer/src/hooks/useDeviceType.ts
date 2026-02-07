import { useMemo } from "react";
import { AnyDevice } from "../../../api/types";
import { findDeviceDefinition } from "../deviceDefinitions";

export const useDeviceType = (device: AnyDevice) => {
  const definition = useMemo(() => findDeviceDefinition(device.deviceType), [device.deviceType]);
  const isHiddenByDefinition = definition?.hide;
  const rawType = (device.deviceType || (device as any).remoteType || "").toLowerCase();
  const isInfraredRemote = !!(device as any).isInfraredRemote;

  const normalizedType = useMemo(() => rawType, [rawType]);
  const normalizedTypeCompact = useMemo(
    () => normalizedType.replace(/[^a-z0-9]/g, ""),
    [normalizedType]
  );

  const isBot = !isInfraredRemote && normalizedType === "bot";
  const isPlug = !isInfraredRemote && normalizedType.includes("plug");
  const isCurtain = !isInfraredRemote && (normalizedType.includes("curtain") || normalizedType.includes("blind tilt"));
  const isLock = !isInfraredRemote && normalizedType.includes("lock");
  const isCeilingLight = !isInfraredRemote && (definition?.key === "ceilingLight" || normalizedTypeCompact.includes("ceilinglight"));
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

  const remoteTypeLabel = (device as any).remoteType || device.deviceType;
  const remoteTypeLower = (remoteTypeLabel || "").toLowerCase();
  const remoteSupportsDefaultCommands = remoteTypeLower !== "others";
  const isRemoteAC = isInfraredRemote && remoteTypeLower.includes("air conditioner");
  const isRemoteTV = isInfraredRemote && (remoteTypeLower.includes("tv") || remoteTypeLower.includes("iptv") || remoteTypeLower.includes("streamer") || remoteTypeLower.includes("set top"));
  const isRemoteSpeaker = isInfraredRemote && (remoteTypeLower.includes("speaker") || remoteTypeLower.includes("dvd"));
  const isRemoteFan = isInfraredRemote && remoteTypeLower.includes("fan");
  const isRemoteLight = isInfraredRemote && remoteTypeLower.includes("light");

  const hasPredefinedControls = isInfraredRemote || isBot || isPlug || isCurtain || isLock || isLight || isHumidifier || isFan || isVacuum;

  return {
    definition,
    isHiddenByDefinition,
    isInfraredRemote,
    isBot,
    isPlug,
    isCurtain,
    isLock,
    isCeilingLight,
    isLight,
    isHumidifier,
    isEvaporativeHumidifier,
    isFan,
    isVacuum,
    isPlugMini,
    supportsPlugToggle,
    supportsLightToggle,
    supportsLightBrightness,
    supportsLightColorTemperature,
    supportsLightColor,
    supportsLockDeadbolt,
    remoteTypeLabel,
    remoteSupportsDefaultCommands,
    isRemoteAC,
    isRemoteTV,
    isRemoteSpeaker,
    isRemoteFan,
    isRemoteLight,
    hasPredefinedControls,
  };
};
