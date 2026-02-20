import React, { useState } from "react";
import { Box, Button, Slider, Typography } from "@mui/material";
import { useTranslation } from "../../useTranslation";
import { DeviceControlProps } from "./DeviceControls.types";
import { clamp, SectionLabel } from "./utils";
import {
  COMMAND_TURN_OFF,
  COMMAND_TURN_ON,
} from "../../constants/commandConstants";

export const FanControls: React.FC<DeviceControlProps> = ({
  sendCommand,
  controlsDisabled,
  dense,
}) => {
  const { t } = useTranslation();
  const [fanSpeed, setFanSpeed] = useState(50);

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

  return (
    <>
      <SectionLabel label="Fan" dense={dense} />
      <Box sx={buttonGridSx}>
        <Button
          size="small"
          variant="contained"
          onClick={() => sendCommand(COMMAND_TURN_ON)}
          disabled={controlsDisabled}
          fullWidth
        >
          {t("On")}
        </Button>
        <Button
          size="small"
          variant="contained"
          color="secondary"
          onClick={() => sendCommand(COMMAND_TURN_OFF)}
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
          { label: "Nightlight Dim", value: "2" },
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
        <Typography variant="caption" color="text.secondary">
          Wind speed (1-100)
        </Typography>
        <Slider
          size="small"
          value={fanSpeed}
          min={1}
          max={100}
          step={1}
          onChange={(_, value) => setFanSpeed(value as number)}
          onChangeCommitted={(_, value) =>
            sendCommand("setWindSpeed", clamp(value as number, 1, 100))
          }
          valueLabelDisplay="auto"
          aria-label="Fan speed"
          disabled={controlsDisabled}
        />
      </Box>
    </>
  );
};
