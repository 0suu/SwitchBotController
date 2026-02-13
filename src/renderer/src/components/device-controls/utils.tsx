import React from "react";
import { Typography, SxProps, Theme } from "@mui/material";

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const hexToRgbParameter = (hexValue: string): string | null => {
  const hex = hexValue.replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;
  const bigint = parseInt(hex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `${r}:${g}:${b}`;
};

export const getConfirmCommandStorageKey = (deviceId: string) => `confirmOnOffPressActions.${deviceId}`;

interface SectionLabelProps {
  label: React.ReactNode;
  dense?: boolean;
}

export const SectionLabel: React.FC<SectionLabelProps> = ({ label, dense }) => {
  if (dense) return null;
  const sectionLabelSx: SxProps<Theme> = { fontWeight: 700, color: "text.secondary", mt: 1 };
  return (
    <Typography variant="subtitle2" sx={sectionLabelSx}>
      {label}
    </Typography>
  );
};
