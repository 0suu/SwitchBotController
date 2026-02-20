import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import { AnyDevice, DeviceStatusResponseBody } from "../../../api/types";
import { AppDispatch, RootState } from "../store/store";
import {
  clearDeviceCommandError,
  selectCommandErrorForDevice,
  selectIsCommandSendingForDevice,
  sendDeviceCommand,
} from "../store/slices/deviceSlice";
import { selectIsTokenValidated } from "../store/slices/settingsSlice";
import { useTranslation } from "../useTranslation";
import { useDeviceType } from "../hooks/useDeviceType";
import {
  COMMAND_PRESS,
  COMMAND_TURN_OFF,
  COMMAND_TURN_ON,
  COMMAND_TYPE_COMMAND,
  DEFAULT_PARAMETER,
  type CommandType,
} from "../constants/commandConstants";
import { getConfirmCommandStorageKey } from "./device-controls/utils";
import { BotControls } from "./device-controls/BotControls";
import { PlugControls } from "./device-controls/PlugControls";
import { CurtainControls } from "./device-controls/CurtainControls";
import { LightControls } from "./device-controls/LightControls";
import { HumidifierControls } from "./device-controls/HumidifierControls";
import { FanControls } from "./device-controls/FanControls";
import { VacuumControls } from "./device-controls/VacuumControls";
import { LockControls } from "./device-controls/LockControls";
import { InfraredRemoteControls } from "./device-controls/InfraredRemoteControls";
import { DynamicControls } from "./device-controls/DynamicControls";
import { CustomCommandControls } from "./device-controls/CustomCommandControls";
import { SendCommand } from "./device-controls/DeviceControls.types";

export { getConfirmCommandStorageKey };

interface DeviceControlsProps {
  device: AnyDevice;
  status?: Partial<DeviceStatusResponseBody> | null;
  dense?: boolean;
  showCustomCommands?: boolean;
  showNightLightInstruction?: boolean;
  showChildLockControls?: boolean;
  confirmOnOffPressActions?: boolean;
}

export const DeviceControls: React.FC<DeviceControlsProps> = ({
  device,
  status,
  dense = false,
  showCustomCommands = true,
  showNightLightInstruction = true,
  showChildLockControls = false,
  confirmOnOffPressActions,
}) => {
  const dispatch: AppDispatch = useDispatch();
  const isSending = useSelector((state: RootState) =>
    selectIsCommandSendingForDevice(state, device.deviceId)
  );
  const deviceError = useSelector((state: RootState) =>
    selectCommandErrorForDevice(state, device.deviceId)
  );
  const isTokenValid = useSelector(selectIsTokenValidated);
  const { t } = useTranslation();

  const {
    definition,
    isInfraredRemote,
    isBot,
    isPlug,
    isCurtain,
    isLock,
    isLight,
    isHumidifier,
    isFan,
    isVacuum,
    hasPredefinedControls,
  } = useDeviceType(device);

  const [resolvedConfirmOnOffPress, setResolvedConfirmOnOffPress] = useState(
    typeof confirmOnOffPressActions === "boolean"
      ? confirmOnOffPressActions
      : false
  );
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingCommand, setPendingCommand] = useState<{
    command: string;
    parameter: any;
    commandType: CommandType;
  } | null>(null);

  useEffect(() => {
    let isActive = true;
    if (typeof confirmOnOffPressActions === "boolean") {
      setResolvedConfirmOnOffPress(confirmOnOffPressActions);
      return () => {
        isActive = false;
      };
    }
    const loadConfirmationSetting = async () => {
      try {
        const stored = await window.electronStore.get(
          getConfirmCommandStorageKey(device.deviceId)
        );
        if (!isActive) return;
        setResolvedConfirmOnOffPress(
          typeof stored === "boolean" ? stored : false
        );
      } catch (error) {
        console.error("Failed to load confirmation setting:", error);
        if (isActive) {
          setResolvedConfirmOnOffPress(false);
        }
      }
    };
    loadConfirmationSetting();
    return () => {
      isActive = false;
    };
  }, [confirmOnOffPressActions, device.deviceId]);

  const confirmMessageForCommand = (command: string) => {
    switch (command) {
      case COMMAND_TURN_ON:
        return t("Confirm turn on");
      case COMMAND_TURN_OFF:
        return t("Confirm turn off");
      case COMMAND_PRESS:
        return t("Confirm press");
      default:
        return t("Confirm command");
    }
  };

  const shouldConfirmCommand = (command: string) =>
    resolvedConfirmOnOffPress &&
    !isInfraredRemote &&
    (isBot || isPlug) &&
    (command === COMMAND_TURN_ON ||
      command === COMMAND_TURN_OFF ||
      command === COMMAND_PRESS);

  const executeCommand = (
    command: string,
    parameter: any,
    commandType: CommandType
  ) => {
    dispatch(clearDeviceCommandError(device.deviceId));
    dispatch(
      sendDeviceCommand({
        deviceId: device.deviceId,
        command,
        parameter,
        commandType,
      })
    );
  };

  const sendCommand: SendCommand = (
    command,
    parameter = DEFAULT_PARAMETER,
    commandType = COMMAND_TYPE_COMMAND
  ) => {
    if (shouldConfirmCommand(command)) {
      setPendingCommand({ command, parameter, commandType });
      setConfirmDialogOpen(true);
      return;
    }
    executeCommand(command, parameter, commandType);
  };

  const handleConfirmCancel = () => {
    setConfirmDialogOpen(false);
  };

  const handleConfirmProceed = () => {
    if (!pendingCommand) {
      setConfirmDialogOpen(false);
      return;
    }
    executeCommand(
      pendingCommand.command,
      pendingCommand.parameter,
      pendingCommand.commandType
    );
    setConfirmDialogOpen(false);
  };

  const handleConfirmDialogExited = () => {
    setPendingCommand(null);
  };

  const controlsDisabled = isSending || !isTokenValid;

  const controlProps = {
    device,
    status,
    dense,
    sendCommand,
    controlsDisabled,
    showNightLightInstruction,
    showChildLockControls,
    showCustomCommands,
  };

  if (isInfraredRemote) {
    return (
      <Box sx={{ p: dense ? 0.5 : 0, borderRadius: 1 }}>
        {isSending && <LinearProgress sx={{ mb: 1 }} />}
        {deviceError && (
          <Alert severity="error" sx={{ mb: 1 }}>
            {deviceError}
          </Alert>
        )}
        <Stack spacing={dense ? 0.6 : 1.2}>
          <InfraredRemoteControls {...controlProps} />
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ p: dense ? 0.5 : 0, borderRadius: 1 }}>
      <Dialog
        open={confirmDialogOpen}
        onClose={handleConfirmCancel}
        TransitionProps={{ onExited: handleConfirmDialogExited }}
      >
        <DialogTitle>{t("Confirm action")}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {pendingCommand
              ? confirmMessageForCommand(pendingCommand.command)
              : t("Confirm command")}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleConfirmCancel}>{t("Cancel")}</Button>
          <Button onClick={handleConfirmProceed} variant="contained" autoFocus>
            {t("Confirm")}
          </Button>
        </DialogActions>
      </Dialog>
      {isSending && <LinearProgress sx={{ mb: 1 }} />}
      {deviceError && (
        <Alert severity="error" sx={{ mb: 1 }}>
          {deviceError}
        </Alert>
      )}

      <Stack spacing={dense ? 0.6 : 1.2}>
        {isBot && <BotControls {...controlProps} />}
        {isPlug && <PlugControls {...controlProps} />}
        {isCurtain && <CurtainControls {...controlProps} />}
        {isLight && <LightControls {...controlProps} />}
        {isHumidifier && <HumidifierControls {...controlProps} />}
        {isFan && <FanControls {...controlProps} />}
        {isVacuum && <VacuumControls {...controlProps} />}
        {isLock && <LockControls {...controlProps} />}

        {!hasPredefinedControls && <DynamicControls {...controlProps} />}

        {!hasPredefinedControls && !(definition?.commands?.length) && showCustomCommands && (
          <Typography variant="body2" color="text.secondary">
            {t("No quick controls available for this device type.")}
          </Typography>
        )}

        {showCustomCommands && <CustomCommandControls {...controlProps} />}
      </Stack>
    </Box>
  );
};
