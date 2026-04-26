import React, { useSyncExternalStore, useState } from "react";
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
import BoltIcon from "@mui/icons-material/Bolt";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import { useTheme } from "@mui/material/styles";

import { AppDispatch } from "../store/store";
import { selectAllDevices, selectDeviceStatusMap } from "../store/slices/deviceSlice";
import {
  selectPinnedEnvironmentDeviceIds,
  setPinnedEnvironmentDeviceIds,
} from "../store/slices/settingsSlice";
import { findDeviceDefinition, getStatusFieldsForDevice } from "../deviceDefinitions";
import { useTranslation } from "../useTranslation";

/**
 * Device definition keys eligible for pinning to the top status bar.
 * Plug is filtered to Plug Mini below because legacy Plug does not report power.
 */
const STATUS_BAR_DEVICE_KEYS = new Set(["meter", "hub2", "hub3", "plug"]);
const isPlugMiniDeviceType = (deviceType?: string) => (deviceType ?? "").toLowerCase().includes("plug mini");

const getSnapshot = () => window.innerWidth;
const getServerSnapshot = () => 1024;

const subscribeToResize = (onStoreChange: () => void) => {
  window.addEventListener("resize", onStoreChange);
  return () => window.removeEventListener("resize", onStoreChange);
};

export const EnvironmentStatusBar: React.FC = () => {
  const dispatch: AppDispatch = useDispatch();
  const { t } = useTranslation();
  const devices = useSelector(selectAllDevices);
  const statusMap = useSelector(selectDeviceStatusMap);
  const pinnedIds = useSelector(selectPinnedEnvironmentDeviceIds);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const theme = useTheme();
  const width = useSyncExternalStore(subscribeToResize, getSnapshot, getServerSnapshot);
  const sm = theme.breakpoints.values.sm;
  const md = theme.breakpoints.values.md;
  const lg = theme.breakpoints.values.lg;
  const maxVisible = width >= lg ? 4 : width >= md ? 3 : width >= sm ? 2 : 1;

  const candidateDevices = devices.filter((device) => {
    const def = findDeviceDefinition(device.deviceType);
    if (!def || !STATUS_BAR_DEVICE_KEYS.has(def.key)) return false;
    if (def.key === "plug") return isPlugMiniDeviceType(device.deviceType);
    return true;
  });

  // Nothing to show if no pin-eligible devices exist
  if (candidateDevices.length === 0) return null;

  const pinnedDevices = pinnedIds
    .map((id) => candidateDevices.find((d) => d.deviceId === id))
    .filter((d): d is (typeof candidateDevices)[number] => Boolean(d));

  const getFormattedValue = (
    deviceId: string,
    fieldKey: string,
    options: { allowDerived?: boolean } = {}
  ): string | undefined => {
    const device = devices.find((d) => d.deviceId === deviceId);
    if (!device) return undefined;
    const statusFields = getStatusFieldsForDevice(device.deviceType);
    const field = statusFields.find((f) => f.key === fieldKey);
    if (!field) return undefined;
    const status = statusMap[deviceId];
    const raw = status ? (status as any)[field.key] : undefined;
    if (raw === undefined || raw === null) {
      if (options.allowDerived && field.formatter) {
        const derived = field.formatter(raw, status);
        return derived === undefined || derived === null ? undefined : String(derived);
      }
      return undefined;
    }
    return field.formatter ? String(field.formatter(raw, status)) : String(raw);
  };

  const getDeviceKey = (deviceType?: string) => findDeviceDefinition(deviceType)?.key;

  const getDeviceSummary = (deviceId: string, deviceType: string | undefined): string => {
    const key = getDeviceKey(deviceType);
    if (key === "plug") {
      return getFormattedValue(deviceId, "power", { allowDerived: true }) ?? "—";
    }
    const temp = getFormattedValue(deviceId, "temperature");
    const hum = getFormattedValue(deviceId, "humidity");
    const co2 = getFormattedValue(deviceId, "CO2");
    return [temp ?? "—", hum ?? "—", ...(co2 ? [co2] : [])].join(" / ");
  };

  const handleOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleToggle = (deviceId: string) => {
    const next = pinnedIds.includes(deviceId)
      ? pinnedIds.filter((id) => id !== deviceId)
      : [...pinnedIds, deviceId];
    dispatch(setPinnedEnvironmentDeviceIds(next));
  };

  const handleClear = () => {
    dispatch(setPinnedEnvironmentDeviceIds([]));
    handleClose();
  };

  const renderDeviceReadings = (deviceId: string, deviceType: string | undefined) => {
    const key = getDeviceKey(deviceType);
    if (key === "plug") {
      const power = getFormattedValue(deviceId, "power", { allowDerived: true });
      if (!power) return null;
      return (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.3 }}>
          <BoltIcon sx={{ fontSize: 18, color: "warning.main" }} />
          <Typography variant="body2" fontWeight="bold" noWrap>
            {power}
          </Typography>
        </Box>
      );
    }
    const temp = getFormattedValue(deviceId, "temperature");
    const hum = getFormattedValue(deviceId, "humidity");
    const co2 = getFormattedValue(deviceId, "CO2");
    if (!temp && !hum && !co2) return null;
    return (
      <>
        {temp && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.3 }}>
            <ThermostatIcon sx={{ fontSize: 18, color: "warning.main" }} />
            <Typography variant="body2" fontWeight="bold" noWrap>
              {temp}
            </Typography>
          </Box>
        )}
        {hum && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.3, ml: 1 }}>
            <WaterDropIcon sx={{ fontSize: 18, color: "info.main" }} />
            <Typography variant="body2" fontWeight="bold" noWrap>
              {hum}
            </Typography>
          </Box>
        )}
        {co2 && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.3, ml: 1 }}>
            <Co2Icon sx={{ fontSize: 20, color: "success.main" }} />
            <Typography variant="body2" fontWeight="bold" noWrap>
              {co2}
            </Typography>
          </Box>
        )}
      </>
    );
  };

  const pinnedDeviceReadings = pinnedDevices.reduce<
    Array<{ device: (typeof pinnedDevices)[number]; readings: React.ReactNode }>
  >((items, device) => {
    const readings = renderDeviceReadings(device.deviceId, device.deviceType);
    if (readings !== null) {
      items.push({ device, readings });
    }
    return items;
  }, []);
  const visibleDeviceReadings = pinnedDeviceReadings.slice(0, maxVisible);
  const visibleDevices = pinnedDevices.slice(0, maxVisible);
  const hiddenReadableCount = Math.max(0, pinnedDeviceReadings.length - visibleDeviceReadings.length);

  const ariaDevices =
    visibleDeviceReadings.length > 0
      ? visibleDeviceReadings.map(({ device }) => device)
      : visibleDevices;

  const ariaLabel =
    ariaDevices.length > 0
      ? [
          ...ariaDevices.map((device) => {
            const deviceName = device.deviceName || t("Unnamed Device");
            return `${deviceName}: ${getDeviceSummary(device.deviceId, device.deviceType)}`;
          }),
          ...(hiddenReadableCount > 0 ? [`+${hiddenReadableCount}`] : []),
        ].join(", ")
      : t("Select sensor");

  return (
    <>
      <ButtonBase
        onClick={handleOpen}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          px: 1.5,
          py: 0.5,
          borderRadius: 2,
          maxWidth: "100%",
          overflow: "hidden",
          "&:hover": { bgcolor: "action.hover" },
        }}
      >
        {visibleDeviceReadings.length > 0 ? (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              flexWrap: "nowrap",
              overflow: "hidden",
            }}
          >
            {visibleDeviceReadings.map(({ device, readings }, idx) => (
              <React.Fragment key={device.deviceId}>
                {idx > 0 && (
                  <Divider
                    orientation="vertical"
                    flexItem
                    sx={{ mx: 0.25, my: 0.5, borderColor: "divider" }}
                  />
                )}
                <Box sx={{ display: "flex", alignItems: "center", gap: 0 }}>
                  {readings}
                </Box>
              </React.Fragment>
            ))}
            {hiddenReadableCount > 0 && (
              <Typography variant="caption" color="text.secondary" noWrap>
                +{hiddenReadableCount}
              </Typography>
            )}
          </Box>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary" noWrap>
              {pinnedDevices.length > 0 ? "—" : t("Select sensor")}
            </Typography>
            {hiddenReadableCount > 0 && (
              <Typography variant="caption" color="text.secondary" noWrap>
                +{hiddenReadableCount}
              </Typography>
            )}
          </>
        )}
        <ArrowDropDownIcon sx={{ fontSize: 18, color: "text.secondary" }} />
      </ButtonBase>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{ paper: { sx: { minWidth: 240 } } }}
      >
        {candidateDevices.map((device) => {
          const isSelected = pinnedIds.includes(device.deviceId);
          const preview = getDeviceSummary(device.deviceId, device.deviceType);
          return (
            <MenuItem key={device.deviceId} onClick={() => handleToggle(device.deviceId)}>
              <ListItemIcon>
                {isSelected ? <CheckIcon fontSize="small" /> : null}
              </ListItemIcon>
              <ListItemText>{device.deviceName || t("Unnamed Device")}</ListItemText>
              <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                {preview}
              </Typography>
            </MenuItem>
          );
        })}
        {pinnedIds.length > 0 && (
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
