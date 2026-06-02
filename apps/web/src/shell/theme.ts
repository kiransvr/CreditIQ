import { createTheme } from "@mui/material/styles";

export const creditIqTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#1F4E79" },
    secondary: { main: "#2E7D32" },
    background: { default: "#F4F6FA", paper: "#FFFFFF" },
    success: { main: "#2E7D32" },
    warning: { main: "#ED6C02" },
    error: { main: "#C62828" },
    info: { main: "#1565C0" }
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily:
      "Inter, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { textTransform: "none", fontWeight: 600 }
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: { boxShadow: "0 1px 0 rgba(0,0,0,0.06)" }
      }
    },
    MuiButton: {
      defaultProps: { disableElevation: true }
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: "none" }
      }
    }
  }
});
