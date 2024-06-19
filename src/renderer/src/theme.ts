import { createTheme, responsiveFontSizes } from "@mui/material/styles";

// Define a modern color palette
// Using a deep blue/purple primary with vibrant accents
const getDesignTokens = (mode: "light" | "dark") => ({
  palette: {
    mode,
    primary: {
      main: mode === "dark" ? "#90caf9" : "#1976d2", // Light Blue / Blue
      light: mode === "dark" ? "#b6e3ff" : "#63a4ff",
      dark: mode === "dark" ? "#5d99c6" : "#004ba0",
    },
    secondary: {
      main: mode === "dark" ? "#f48fb1" : "#d81b60", // Pink
    },
    background: {
      default: mode === "dark" ? "#121212" : "#f5f5f5", // Slightly off-white for light mode
      paper: mode === "dark" ? "#1e1e1e" : "#ffffff",
    },
    text: {
      primary: mode === "dark" ? "#ffffff" : "#1a1a1a",
      secondary: mode === "dark" ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.6)",
    },
  },
  typography: {
    fontFamily: [
      "Inter",
      "-apple-system",
      "BlinkMacSystemFont",
      '"Segoe UI"',
      "Roboto",
      '"Helvetica Neue"',
      "Arial",
      "sans-serif",
      '"Apple Color Emoji"',
      '"Segoe UI Emoji"',
      '"Segoe UI Symbol"',
    ].join(","),
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { textTransform: "none" as const, fontWeight: 600 },
  },
  shape: {
    borderRadius: 12, // More rounded corners
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: "none",
          "&:hover": {
            boxShadow: "0px 2px 4px -1px rgba(0,0,0,0.2), 0px 4px 5px 0px rgba(0,0,0,0.14), 0px 1px 10px 0px rgba(0,0,0,0.12)",
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          backgroundImage: "none", // Remove default gradient in dark mode
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: "none",
          borderBottom: "1px solid",
          borderColor: mode === "dark" ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.12)",
          backgroundColor: mode === "dark" ? "#1e1e1e" : "#ffffff",
          color: mode === "dark" ? "#ffffff" : "#1a1a1a",
        },
      },
    },
  },
});

export const createAppTheme = (mode: "light" | "dark") =>
  responsiveFontSizes(createTheme(getDesignTokens(mode)));
