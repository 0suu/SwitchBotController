import React, { useMemo } from "react";
import { Box, Button, Chip, Stack } from "@mui/material";
import { useTranslation } from "../../useTranslation";
import { DeviceControlProps } from "./DeviceControls.types";
import { SectionLabel } from "./utils";
import {
  COMMAND_PRESS,
  COMMAND_TURN_OFF,
  COMMAND_TURN_ON,
} from "../../constants/commandConstants";

export const BotControls: React.FC<DeviceControlProps> = ({
  device,
  status,
  sendCommand,
  controlsDisabled,
  dense,
}) => {
  const { t } = useTranslation();

  const botModeRaw = status?.deviceMode || (device as any)?.deviceMode;
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

  const gridColumns = dense ? 2 : 3;
  const maxControlWidth = dense ? 360 : 520;
  const buttonGridSx = {
    display: "grid",
    gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))`,
    gap: dense ? 0.5 : 1,
    width: "100%",
    maxWidth: maxControlWidth,
  };

  return (
    <>
      <SectionLabel label="Bot" dense={dense} />
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
            onClick={() => sendCommand(COMMAND_PRESS)}
            disabled={controlsDisabled}
            fullWidth
          >
            Press
          </Button>
        </Box>
      ) : (
        <Box sx={buttonGridSx}>
          {botShowsOnOff && (
            <Button
              size="small"
              variant="contained"
              onClick={() => sendCommand(COMMAND_TURN_ON)}
              disabled={controlsDisabled}
              fullWidth
            >
              Turn On
            </Button>
          )}
          {botShowsOnOff && (
            <Button
              size="small"
              variant="contained"
              color="secondary"
              onClick={() => sendCommand(COMMAND_TURN_OFF)}
              disabled={controlsDisabled}
              fullWidth
            >
              Turn Off
            </Button>
          )}
          {botShowsPress && (
            <Button
              size="small"
              variant="contained"
              onClick={() => sendCommand(COMMAND_PRESS)}
              disabled={controlsDisabled}
              fullWidth
            >
              Press
            </Button>
          )}
        </Box>
      )}
    </>
  );
};
