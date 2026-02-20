import React, { useState } from "react";
import {
  Button,
  Chip,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useTranslation } from "../../useTranslation";
import { DeviceControlProps } from "./DeviceControls.types";
import { useDeviceType } from "../../hooks/useDeviceType";
import {
  COMMAND_TYPE_COMMAND,
  COMMAND_TYPE_CUSTOMIZE,
  DEFAULT_PARAMETER,
  type CommandType,
} from "../../constants/commandConstants";

export const CustomCommandControls: React.FC<DeviceControlProps> = ({
  device,
  sendCommand,
  controlsDisabled,
  dense,
}) => {
  const { t } = useTranslation();
  const { isInfraredRemote } = useDeviceType(device);
  const [customCommand, setCustomCommand] = useState("");
  const [customParameter, setCustomParameter] = useState(DEFAULT_PARAMETER);
  const [customCommandType, setCustomCommandType] = useState<CommandType>(
    COMMAND_TYPE_COMMAND
  );

  const maxControlWidth = dense ? 360 : 520;

  return (
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
          placeholder={
            isInfraredRemote ? "e.g. customButtonName" : "e.g. toggle, refresh"
          }
          fullWidth
        />
        <TextField
          label={t("Parameter")}
          size="small"
          value={customParameter}
          onChange={(e) => setCustomParameter(e.target.value)}
          placeholder={
            isInfraredRemote
              ? "default or command-specific"
              : "default, 0,ff,50, etc."
          }
          fullWidth
        />
        {isInfraredRemote && (
          <TextField
            select
            label={t("Command type")}
            size="small"
            value={customCommandType}
            onChange={(e) =>
              setCustomCommandType(e.target.value as CommandType)
            }
          >
            <MenuItem value={COMMAND_TYPE_COMMAND}>command</MenuItem>
            <MenuItem value={COMMAND_TYPE_CUSTOMIZE}>
              customize (for user-defined buttons)
            </MenuItem>
          </TextField>
        )}
        <Button
          variant="outlined"
          size="small"
          disabled={!customCommand || controlsDisabled}
          onClick={() =>
            sendCommand(
              customCommand,
              customParameter || DEFAULT_PARAMETER,
              isInfraredRemote ? customCommandType : undefined
            )
          }
        >
          {t("Send custom command")}
        </Button>
        <Typography variant="caption" color="text.secondary">
          {isInfraredRemote
            ? t("For customized infrared buttons, set command type to customize.")
            : t(
                "Sends directly to SwitchBot API. Keep parameters consistent with your device specification."
              )}
        </Typography>
      </Stack>
    </>
  );
};
