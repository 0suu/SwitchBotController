import React, { useState } from "react";
import { Box, Button, Slider, Stack, Typography } from "@mui/material";
import { useTranslation } from "../../useTranslation";
import { DeviceControlProps } from "./DeviceControls.types";
import { clamp, SectionLabel } from "./utils";
import { useDeviceType } from "../../hooks/useDeviceType";

export const HumidifierControls: React.FC<DeviceControlProps> = ({
  device,
  sendCommand,
  controlsDisabled,
  dense,
  showChildLockControls,
}) => {
  const { t } = useTranslation();
  const { isEvaporativeHumidifier } = useDeviceType(device);

  const [targetHumidify, setTargetHumidify] = useState(60);
  const [humidifierLevel, setHumidifierLevel] = useState(50);

  type EvaporativeModeKey =
    | "level1"
    | "level2"
    | "level3"
    | "level4"
    | "humidity"
    | "sleep"
    | "auto"
    | "dry";
  type StandardHumidifierModeKey = "auto" | "low" | "medium" | "high";

  const sendHumidifierMode = (
    mode: EvaporativeModeKey | StandardHumidifierModeKey
  ) => {
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
        dry: 8,
      };
      if (mode in modeMap) {
        sendCommand("setMode", {
          mode: modeMap[mode as EvaporativeModeKey],
          targetHumidify: safeTarget,
        });
      }
      return;
    }

    const modeMap = { auto: "auto", low: "101", medium: "102", high: "103" };
    sendCommand("setMode", modeMap[mode as StandardHumidifierModeKey]);
  };

  const gridColumns = dense ? 2 : 3;
  const maxControlWidth = dense ? 360 : 520;
  const buttonGridSx = {
    display: "grid",
    gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))`,
    gap: dense ? 0.5 : 1,
    width: "100%",
    maxWidth: maxControlWidth,
  };
  const sliderContainerSx = { width: "100%", maxWidth: maxControlWidth };

  const evaporativeModeButtons: Array<{
    label: string;
    mode: EvaporativeModeKey;
  }> = [
    { label: t("Auto"), mode: "auto" },
    { label: "Humidity", mode: "humidity" },
    { label: "Sleep", mode: "sleep" },
    { label: "Dry", mode: "dry" },
    { label: "Level 4", mode: "level4" },
    { label: "Level 3", mode: "level3" },
    { label: "Level 2", mode: "level2" },
    { label: "Level 1", mode: "level1" },
  ];

  const standardHumidifierModes: Array<{
    label: string;
    mode: StandardHumidifierModeKey;
  }> = [
    { label: t("Auto"), mode: "auto" },
    { label: t("Low"), mode: "low" },
    { label: t("Medium"), mode: "medium" },
    { label: t("High"), mode: "high" },
  ];

  const humidifierModeGridColumns = gridColumns;
  const humidifierModeGridMaxWidth = Math.min(
    maxControlWidth,
    dense ? 340 : 480
  );

  return (
    <>
      <SectionLabel label="Humidifier" dense={dense} />
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
            maxWidth: humidifierModeGridMaxWidth,
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
          <Box
            sx={{
              ...sliderContainerSx,
              maxWidth: Math.min(humidifierModeGridMaxWidth, 320),
            }}
          >
            <Typography variant="caption" color="text.secondary">
              Atomization efficiency (0-100)
            </Typography>
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
        <Stack
          spacing={0.5}
          sx={{ maxWidth: Math.min(humidifierModeGridMaxWidth, 320) }}
        >
          <Typography variant="caption" color="text.secondary">
            Target humidity (%)
          </Typography>
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
  );
};
