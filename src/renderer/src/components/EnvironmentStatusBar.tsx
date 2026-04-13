import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Typography from "@mui/material/Typography";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemText from "@mui/material/ListItemText";
import ListItemIcon from "@mui/material/ListItemIcon";
import Divider from "@mui/material/Divider";
import ThermostatIcon from "@mui/icons-material/Thermostat";
import WaterDropIcon from "@mui/icons-material/WaterDrop";
import Co2Icon from "@mui/icons-material/Co2";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";

import { AppDispatch } from "../store/store";
import { selectAllDevices, selectDeviceStatusMap } from "../store/slices/deviceSlice";
import {
  selectPinnedEnvironmentDeviceId,
  setPinnedEnvironmentDeviceId,
} from "../store/slices/settingsSlice";
import { findDeviceDefinition, getStatusFieldsForDevice } from "../deviceDefinitions";
import { useTranslation } from "../useTranslation";

/** Device definition keys that provide temperature/humidity readings. */
const ENVIRONMENT_DEVICE_KEYS = new Set(["meter", "hub2", "hub3"]);

export const EnvironmentStatusBar: React.FC = () => {
  const dispatch: AppDispatch = useDispatch();
  const { t } = useTranslation();
  const devices = useSelector(selectAllDevices);
  const statusMap = useSelector(selectDeviceStatusMap);
  const pinnedId = useSelector(selectPinnedEnvironmentDeviceId);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const envDevices = devices.filter((device) => {
    const def = findDeviceDefinition(device.deviceType);
    return def && ENVIRONMENT_DEVICE_KEYS.has(def.key);
  });

  // Nothing to show if no environment-capable devices exist
  if (envDevices.length === 0) return null;

  const pinnedDevice = pinnedId ? envDevices.find((d) => d.deviceId === pinnedId) : undefined;

  const getFormattedValue = (deviceId: string, fieldKey: string): string | undefined => {
    const device = devices.find((d) => d.deviceId === deviceId);
    if (!device) return undefined;
    const statusFields = getStatusFieldsForDevice(device.deviceType);
    const field = statusFields.find((f: any) => f.key === fieldKey);
    if (!field) return undefined;
    const status = statusMap[deviceId];
    const raw = status ? (status as any)[field.key] : undefined;
    if (raw === undefined || raw === null) return undefined;
    return field.formatter ? String(field.formatter(raw, status)) : String(raw);
  };

  const temp = pinnedDevice ? getFormattedValue(pinnedDevice.deviceId, "temperature") : undefined;
  const hum = pinnedDevice ? getFormattedValue(pinnedDevice.deviceId, "humidity") : undefined;
  const co2 = pinnedDevice ? getFormattedValue(pinnedDevice.deviceId, "CO2") : undefined;

  const handleOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleSelect = (deviceId: string) => {
    dispatch(setPinnedEnvironmentDeviceId(deviceId));
    handleClose();
  };

  const handleClear = () => {
    dispatch(setPinnedEnvironmentDeviceId(null));
    handleClose();
  };

  return (
    <>
      <ButtonBase
        onClick={handleOpen}
        aria-label={t("Select sensor")}
        aria-haspopup="listbox"
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          px: 1.5,
          py: 0.5,
          borderRadius: 2,
          "&:hover": { bgcolor: "action.hover" },
        }}
      >
        {pinnedDevice && (temp || hum || co2) ? (
          <>
            {temp && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.3 }}>
                <ThermostatIcon sx={{ fontSize: 18, color: "warning.main" }} />
                <Typography variant="body2" fontWeight="bold">
                  {temp}
                </Typography>
              </Box>
            )}
            {hum && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.3, ml: 1 }}>
                <WaterDropIcon sx={{ fontSize: 18, color: "info.main" }} />
                <Typography variant="body2" fontWeight="bold">
                  {hum}
                </Typography>
              </Box>
            )}
            {co2 && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.3, ml: 1 }}>
                <Co2Icon sx={{ fontSize: 20, color: "success.main" }} />
                <Typography variant="body2" fontWeight="bold">
                  {co2}
                </Typography>
              </Box>
            )}
          </>
        ) : (
          <Typography variant="body2" color="text.secondary">
            {pinnedDevice ? "—" : t("Select sensor")}
          </Typography>
        )}
        <ArrowDropDownIcon sx={{ fontSize: 18, color: "text.secondary" }} />
      </ButtonBase>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{ paper: { sx: { minWidth: 220 } } }}
      >
        {envDevices.map((device) => {
          const isSelected = device.deviceId === pinnedId;
          const dTemp = getFormattedValue(device.deviceId, "temperature");
          const dHum = getFormattedValue(device.deviceId, "humidity");
          const dCo2 = getFormattedValue(device.deviceId, "CO2");
          const preview = [dTemp ?? "—", dHum ?? "—", ...(dCo2 ? [dCo2] : [])].join(" / ");
          return (
            <MenuItem
              key={device.deviceId}
              selected={isSelected}
              onClick={() => handleSelect(device.deviceId)}
            >
              {isSelected && (
                <ListItemIcon>
                  <CheckIcon fontSize="small" />
                </ListItemIcon>
              )}
              <ListItemText inset={!isSelected}>
                {device.deviceName || t("Unnamed Device")}
              </ListItemText>
              <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                {preview}
              </Typography>
            </MenuItem>
          );
        })}
        {pinnedId && (
          <>
            <Divider />
            <MenuItem onClick={handleClear}>
              <ListItemIcon>
                <CloseIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>{t("Clear selection")}</ListItemText>
            </MenuItem>
          </>
        )}
      </Menu>
    </>
  );
};
