import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  MenuItem,
  Slider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { DeviceControlProps } from "./DeviceControls.types";
import { SectionLabel } from "./utils";
import { useDeviceType } from "../../hooks/useDeviceType";
import { DeviceCommandDefinition, ParameterSpec } from "../../deviceDefinitions";
import {
  COMMAND_TYPE_COMMAND,
  DEFAULT_PARAMETER,
} from "../../constants/commandConstants";

export const DynamicControls: React.FC<DeviceControlProps> = ({
  device,
  sendCommand,
  controlsDisabled,
  dense,
}) => {
  const { definition, isHiddenByDefinition } = useDeviceType(device);
  const [dynamicParams, setDynamicParams] = useState<Record<string, any>>({});
  const maxControlWidth = dense ? 360 : 520;

  useEffect(() => {
    const defaults: Record<string, any> = {};
    (definition?.commands || []).forEach((cmd) => {
      const param = cmd.parameter;
      if (!param) return;
      if (param.type === "range" && param.defaultValue !== undefined)
        defaults[cmd.command] = param.defaultValue;
      if (param.type === "enum" && param.defaultValue !== undefined)
        defaults[cmd.command] = param.defaultValue;
      if (param.type === "text" && param.defaultValue !== undefined)
        defaults[cmd.command] = param.defaultValue;
    });
    setDynamicParams(defaults);
  }, [definition, device.deviceId]);

  const resolveParameterValue = (cmd: DeviceCommandDefinition) => {
    const spec = cmd.parameter;
    if (!spec || spec.type === "none") return DEFAULT_PARAMETER;
    const raw = dynamicParams[cmd.command];
    if (spec.type === "range") {
      const numVal = Number(raw);
      const mapped = spec.mapValue ? spec.mapValue(numVal) : numVal;
      return mapped;
    }
    if (spec.type === "enum") return raw ?? spec.defaultValue ?? DEFAULT_PARAMETER;
    if (spec.type === "text") {
      if (spec.parseAsJson) {
        try {
          return JSON.parse(raw || spec.defaultValue || "{}");
        } catch (e) {
          return raw || spec.defaultValue || DEFAULT_PARAMETER;
        }
      }
      return raw ?? spec.defaultValue ?? DEFAULT_PARAMETER;
    }
    return raw ?? DEFAULT_PARAMETER;
  };

  const specNeedsMargin = (spec?: ParameterSpec) => !!spec && spec.type !== "none";

  const renderParameterControl = (cmd: DeviceCommandDefinition) => {
    const spec = cmd.parameter;
    if (!spec || spec.type === "none") return null;
    const value = dynamicParams[cmd.command] ?? spec.defaultValue ?? "";
    if (spec.type === "range") {
      return (
        <Stack spacing={0.5} sx={{ width: "100%", maxWidth: maxControlWidth }}>
          <Typography variant="caption" color="text.secondary">
            {cmd.label} value
          </Typography>
          <Slider
            size="small"
            min={spec.min}
            max={spec.max}
            step={spec.step || 1}
            value={Number(value)}
            onChange={(_, v) =>
              setDynamicParams((prev) => ({
                ...prev,
                [cmd.command]: v as number,
              }))
            }
            valueLabelDisplay="auto"
            aria-label={cmd.label}
            disabled={controlsDisabled}
          />
        </Stack>
      );
    }
    if (spec.type === "enum") {
      const toTypedValue = (val: any) =>
        spec.options.length > 0 && typeof spec.options[0].value === "number"
          ? Number(val)
          : val;
      return (
        <TextField
          select
          size="small"
          label={cmd.label}
          value={value}
          onChange={(e) =>
            setDynamicParams((prev) => ({
              ...prev,
              [cmd.command]: toTypedValue(e.target.value),
            }))
          }
          fullWidth
          sx={{ maxWidth: maxControlWidth }}
        >
          {spec.options.map((opt) => (
            <MenuItem key={String(opt.value)} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </TextField>
      );
    }
    if (spec.type === "text") {
      return (
        <TextField
          label={cmd.label}
          size="small"
          value={value}
          onChange={(e) =>
            setDynamicParams((prev) => ({ ...prev, [cmd.command]: e.target.value }))
          }
          placeholder={spec.placeholder}
          helperText={spec.helperText}
          fullWidth
          multiline={spec.multiline}
          sx={{ maxWidth: maxControlWidth }}
        />
      );
    }
    return null;
  };

  const cmds = definition?.commands || [];
  if (cmds.length === 0 || isHiddenByDefinition) return null;

  return (
    <Stack spacing={dense ? 0.6 : 1.2}>
      <SectionLabel label="Controls" dense={dense} />
      <Stack spacing={dense ? 0.5 : 1}>
        {cmds.map((cmd) => (
          <Box
            key={cmd.command}
            sx={{
              borderBottom: "1px dashed rgba(255,255,255,0.12)",
              pb: dense ? 0.5 : 1,
              mb: dense ? 0.5 : 1,
            }}
          >
            {renderParameterControl(cmd)}
            <Button
              size="small"
              variant="contained"
              sx={{ mt: specNeedsMargin(cmd.parameter) ? 0.5 : 0 }}
              disabled={controlsDisabled}
              onClick={() =>
                sendCommand(
                  cmd.command,
                  resolveParameterValue(cmd),
                  cmd.commandType || COMMAND_TYPE_COMMAND
                )
              }
            >
              {cmd.label}
            </Button>
          </Box>
        ))}
      </Stack>
    </Stack>
  );
};
