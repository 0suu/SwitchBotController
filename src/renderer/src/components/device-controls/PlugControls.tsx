import React from "react";
import { Box, Button } from "@mui/material";
import { useTranslation } from "../../useTranslation";
import { DeviceControlProps } from "./DeviceControls.types";
import { SectionLabel } from "./utils";
import {
  COMMAND_TURN_OFF,
  COMMAND_TURN_ON,
} from "../../constants/commandConstants";

export const PlugControls: React.FC<DeviceControlProps> = ({
  sendCommand,
  controlsDisabled,
  dense,
}) => {
  const { t } = useTranslation();
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
      <SectionLabel label="Plug" dense={dense} />
      <Box sx={buttonGridSx}>
        <Button
          size="small"
          variant="contained"
          color="primary"
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
    </>
  );
};
