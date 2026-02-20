import { AnyDevice, DeviceStatusResponseBody } from "../../../../api/types";
import type { CommandType } from "../../constants/commandConstants";

export type SendCommand = (
  command: string,
  parameter?: any,
  commandType?: CommandType
) => void;

export interface DeviceControlProps {
  device: AnyDevice;
  sendCommand: SendCommand;
  controlsDisabled: boolean;
  dense?: boolean;
  status?: Partial<DeviceStatusResponseBody> | null;
  showNightLightInstruction?: boolean;
  showChildLockControls?: boolean;
  showCustomCommands?: boolean;
}
