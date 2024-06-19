import React from "react";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardActions from "@mui/material/CardActions";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import { useTheme } from "@mui/material/styles";

// Icons
import ThermostatIcon from "@mui/icons-material/Thermostat";
import WaterDropIcon from "@mui/icons-material/WaterDrop";
import LightbulbIcon from "@mui/icons-material/Lightbulb";
import PowerSettingsNewIcon from "@mui/icons-material/PowerSettingsNew";
import SensorsIcon from "@mui/icons-material/Sensors";
import RouterIcon from "@mui/icons-material/Router";
import TvIcon from "@mui/icons-material/Tv";
import AcUnitIcon from "@mui/icons-material/AcUnit";
import DeviceUnknownIcon from "@mui/icons-material/DeviceUnknown";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

import { AnyDevice } from "../../../api/types";
import { DeviceControls } from "./DeviceControls";
import { findDeviceDefinition, getStatusFieldsForDevice } from "../deviceDefinitions";
import { useTranslation } from "../useTranslation";

interface DeviceCardProps {
    device: AnyDevice;
    status?: Record<string, any>;
    onSelect: (deviceId: string) => void;
}

const getDeviceIcon = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes("meter") || lowerType.includes("hub")) return <SensorsIcon />;
    if (lowerType.includes("light") || lowerType.includes("bulb")) return <LightbulbIcon />;
    if (lowerType.includes("plug")) return <PowerSettingsNewIcon />;
    if (lowerType.includes("tv")) return <TvIcon />;
    if (lowerType.includes("air")) return <AcUnitIcon />;
    if (lowerType.includes("hub")) return <RouterIcon />;
    return <DeviceUnknownIcon />;
};

export const DeviceCard: React.FC<DeviceCardProps> = ({ device, status, onSelect }) => {
    const { t } = useTranslation();
    const theme = useTheme();
    const def = findDeviceDefinition(device.deviceType);
    const statusFields = getStatusFieldsForDevice(device.deviceType);

    const hasTemperature = statusFields.some((field: any) => field.key === "temperature");
    const hasHumidity = statusFields.some((field: any) => field.key === "humidity");
    const highlightTempHumidity =
        hasTemperature &&
        hasHumidity &&
        !!def &&
        ["meter", "hub2", "hub3"].includes(def.key);

    const renderStatusValue = (fieldKey: string) => {
        const field = statusFields.find((f: any) => f.key === fieldKey);
        if (!field) return undefined;
        const raw = status ? status[field.key] : undefined;
        const formatted = field.formatter ? field.formatter(raw, status) : raw;
        return formatted === undefined ? undefined : String(formatted);
    };

    const temperatureText = highlightTempHumidity ? renderStatusValue("temperature") : undefined;
    const humidityText = highlightTempHumidity ? renderStatusValue("humidity") : undefined;

    const secondaryStatusFields = highlightTempHumidity
        ? statusFields.filter((f: any) => f.key !== "temperature" && f.key !== "humidity")
        : statusFields;

    return (
        <Card
            elevation={0}
            sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                border: "1px solid",
                borderColor: "divider",
                transition: "all 0.2s ease-in-out",
                "&:hover": {
                    borderColor: "primary.main",
                    transform: "translateY(-4px)",
                    boxShadow: theme.shadows[4],
                },
            }}
        >
            <CardContent sx={{ flexGrow: 1, p: 2.5 }}>
                <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 2 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, overflow: "hidden" }}>
                        <Box
                            sx={{
                                p: 1,
                                borderRadius: "50%",
                                bgcolor: "primary.light",
                                color: "primary.contrastText",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            {getDeviceIcon(device.deviceType)}
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                            <Typography variant="subtitle1" component="div" fontWeight="bold" noWrap>
                                {device.deviceName || t("Unnamed Device")}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block" noWrap>
                                {device.deviceType}
                            </Typography>
                        </Box>
                    </Box>
                </Box>

                {highlightTempHumidity && (temperatureText || humidityText) ? (
                    <Stack direction="row" spacing={2} sx={{ mb: 2, mt: 1 }}>
                        {temperatureText && (
                            <Box>
                                <Stack direction="row" alignItems="center" spacing={0.5} color="text.secondary">
                                    <ThermostatIcon fontSize="small" />
                                    <Typography variant="caption">{t("Temp")}</Typography>
                                </Stack>
                                <Typography variant="h5" fontWeight="bold">
                                    {temperatureText}
                                </Typography>
                            </Box>
                        )}
                        {humidityText && (
                            <Box>
                                <Stack direction="row" alignItems="center" spacing={0.5} color="text.secondary">
                                    <WaterDropIcon fontSize="small" />
                                    <Typography variant="caption">{t("Humidity")}</Typography>
                                </Stack>
                                <Typography variant="h5" fontWeight="bold">
                                    {humidityText}
                                </Typography>
                            </Box>
                        )}
                    </Stack>
                ) : null}

                {secondaryStatusFields.length > 0 && (
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
                        {secondaryStatusFields.map((field: any) => {
                            const raw = status ? status[field.key] : undefined;
                            const formatted = field.formatter ? field.formatter(raw, status) : raw;
                            if (formatted === undefined) return null;
                            return (
                                <Chip
                                    key={field.key}
                                    label={`${field.label || field.key}: ${formatted}`}
                                    size="small"
                                    variant="outlined"
                                />
                            );
                        })}
                    </Box>
                )}

                <Box sx={{ mt: "auto" }}>
                    <DeviceControls device={device} status={status} dense showCustomCommands={false} />
                </Box>
            </CardContent>

            <CardActions sx={{ p: 2, pt: 0 }}>
                <Button
                    fullWidth
                    variant="outlined"
                    endIcon={<ArrowForwardIcon />}
                    onClick={() => onSelect(device.deviceId)}
                    sx={{ borderRadius: 2 }}
                >
                    {t("Details")}
                </Button>
            </CardActions>
        </Card>
    );
};
