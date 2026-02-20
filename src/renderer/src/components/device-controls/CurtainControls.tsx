import React, { useState } from "react";
import { Box, Button, Slider, Typography } from "@mui/material";
import { useTranslation } from "../../useTranslation";
import { DeviceControlProps } from "./DeviceControls.types";
import { clamp, SectionLabel } from "./utils";

export const CurtainControls: React.FC<DeviceControlProps> = ({
  sendCommand,
  controlsDisabled,
  dense,
}) => {
  const { t } = useTranslation();
  const [position, setPosition] = useState(50);
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
  const sliderLabel = (value: number) => `${value}`;

  return (
    <>
      <SectionLabel label="Curtain / Blind" dense={dense} />
      <Box sx={buttonGridSx}>
        <Button
          size="small"
          variant="contained"
          onClick={() => sendCommand("turnOn")}
          disabled={controlsDisabled}
          fullWidth
        >
          Open
        </Button>
        <Button
          size="small"
          variant="outlined"
          onClick={() => sendCommand("pause")}
          disabled={controlsDisabled}
          fullWidth
        >
          Pause
        </Button>
        <Button
          size="small"
          variant="contained"
          color="secondary"
          onClick={() => sendCommand("turnOff")}
          disabled={controlsDisabled}
          fullWidth
        >
          Close
        </Button>
      </Box>
      <Box sx={sliderContainerSx}>
        <Slider
          size="small"
          value={position}
          min={0}
          max={100}
          step={1}
          onChange={(_, value) => setPosition(value as number)}
          onChangeCommitted={(_, value) =>
            sendCommand("setPosition", `0,ff,${clamp(value as number, 0, 100)}`)
          }
          valueLabelDisplay="auto"
          valueLabelFormat={sliderLabel}
          aria-label="Curtain position"
          disabled={controlsDisabled}
        />
        <Typography variant="caption" color="text.secondary">
          Adjust position (0-100). Applies on release.
        </Typography>
      </Box>
    </>
  );
};
