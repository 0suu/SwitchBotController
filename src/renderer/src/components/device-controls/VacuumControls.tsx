import React, { useState } from "react";
import { Box, Button, Slider, Typography } from "@mui/material";
import { useTranslation } from "../../useTranslation";
import { DeviceControlProps } from "./DeviceControls.types";
import { clamp, SectionLabel } from "./utils";

export const VacuumControls: React.FC<DeviceControlProps> = ({
  sendCommand,
  controlsDisabled,
  dense,
}) => {
  const { t } = useTranslation();
  const [vacuumPowerLevel, setVacuumPowerLevel] = useState(1);

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
      <SectionLabel label="Vacuum" dense={dense} />
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
        <Typography variant="caption" color="text.secondary">
          Suction power (PowLevel 0-3)
        </Typography>
        <Slider
          size="small"
          value={vacuumPowerLevel}
          min={0}
          max={3}
          step={1}
          onChange={(_, value) => setVacuumPowerLevel(value as number)}
          onChangeCommitted={(_, value) =>
            sendCommand("PowLevel", clamp(value as number, 0, 3))
          }
          valueLabelDisplay="auto"
          aria-label="Vacuum suction level"
          disabled={controlsDisabled}
        />
      </Box>
    </>
  );
};
