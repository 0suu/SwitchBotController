import React from "react";
import { Box, Button } from "@mui/material";
import { useTranslation } from "../../useTranslation";
import { DeviceControlProps } from "./DeviceControls.types";
import { SectionLabel } from "./utils";
import { useDeviceType } from "../../hooks/useDeviceType";

export const LockControls: React.FC<DeviceControlProps> = ({
  device,
  sendCommand,
  controlsDisabled,
  dense,
}) => {
  const { t } = useTranslation();
  const { supportsLockDeadbolt } = useDeviceType(device);

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
      <SectionLabel label="Lock" dense={dense} />
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
  );
};
