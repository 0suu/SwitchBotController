import { AnyDevice, DeviceStatusResponseBody } from "../../../../api/types";

export type SendCommand = (
  command: string,
  parameter?: any,
  commandType?: "command" | "customize"
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
