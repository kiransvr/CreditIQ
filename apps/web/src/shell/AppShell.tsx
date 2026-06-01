import { useState, type ReactNode } from "react";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Tooltip from "@mui/material/Tooltip";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import InputLabel from "@mui/material/InputLabel";
import Divider from "@mui/material/Divider";

import DashboardIcon from "@mui/icons-material/SpaceDashboard";
import UploadIcon from "@mui/icons-material/CloudUpload";
import AssessmentIcon from "@mui/icons-material/Assessment";
import HistoryIcon from "@mui/icons-material/History";
import SettingsIcon from "@mui/icons-material/Settings";
import LanguageIcon from "@mui/icons-material/Language";
import AccountCircle from "@mui/icons-material/AccountCircle";

export type ShellRole =
  | "loan_officer"
  | "credit_manager"
  | "risk_analyst"
  | "auditor"
  | "admin";

const ROLE_LABELS: Record<ShellRole, string> = {
  loan_officer: "Loan Officer",
  credit_manager: "Credit Manager",
  risk_analyst: "Risk Analyst",
  auditor: "Auditor",
  admin: "Administrator"
};

export type ShellSection = "main" | "audit";

interface AppShellProps {
  environment: "Development" | "UAT" | "Production";
  role: ShellRole;
  onRoleChange: (role: ShellRole) => void;
  section: ShellSection;
  onSectionChange: (section: ShellSection) => void;
  children: ReactNode;
}

const DRAWER_WIDTH = 240;

export function AppShell({
  environment,
  role,
  onRoleChange,
  section,
  onSectionChange,
  children
}: AppShellProps) {
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [language, setLanguage] = useState<"en" | "en-IN" | "es" | "ar">("en");

  const envColor =
    environment === "Production"
      ? "error"
      : environment === "UAT"
        ? "warning"
        : "info";

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar
        position="fixed"
        color="default"
        sx={{ zIndex: (t) => t.zIndex.drawer + 1, bgcolor: "background.paper" }}
      >
        <Toolbar sx={{ gap: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: "primary.main" }}>
            CreditIQ
          </Typography>
          <Chip
            size="small"
            color={envColor as "info" | "warning" | "error"}
            label={`Env: ${environment}`}
            variant="outlined"
          />

          <Box sx={{ flexGrow: 1 }} />

          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="shell-role-label">Role</InputLabel>
            <Select
              labelId="shell-role-label"
              label="Role"
              value={role}
              onChange={(event) => onRoleChange(event.target.value as ShellRole)}
              inputProps={{ "aria-label": "Active role" }}
            >
              {(Object.keys(ROLE_LABELS) as ShellRole[]).map((key) => (
                <MenuItem key={key} value={key}>
                  {ROLE_LABELS[key]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Tooltip title="Language">
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <Select
                value={language}
                onChange={(event) =>
                  setLanguage(event.target.value as "en" | "en-IN" | "es" | "ar")
                }
                startAdornment={<LanguageIcon fontSize="small" sx={{ mr: 1 }} />}
                inputProps={{ "aria-label": "Language" }}
              >
                <MenuItem value="en">English</MenuItem>
                <MenuItem value="en-IN">English (India)</MenuItem>
                <MenuItem value="es">Español</MenuItem>
                <MenuItem value="ar">العربية</MenuItem>
              </Select>
            </FormControl>
          </Tooltip>

          <Tooltip title="Account">
            <IconButton
              aria-label="Account menu"
              onClick={(event) => setUserMenuAnchor(event.currentTarget)}
              size="large"
            >
              <AccountCircle />
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={userMenuAnchor}
            open={Boolean(userMenuAnchor)}
            onClose={() => setUserMenuAnchor(null)}
          >
            <MenuItem disabled>Signed in as demo-user</MenuItem>
            <Divider />
            <MenuItem onClick={() => setUserMenuAnchor(null)}>Profile</MenuItem>
            <MenuItem onClick={() => setUserMenuAnchor(null)}>Sign out</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: DRAWER_WIDTH,
            boxSizing: "border-box",
            bgcolor: "background.paper"
          }
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: "auto" }}>
          <List>
            <ListItemButton
              selected={section === "main"}
              onClick={() => onSectionChange("main")}
            >
              <ListItemIcon>
                <DashboardIcon />
              </ListItemIcon>
              <ListItemText primary="Dashboard" />
            </ListItemButton>
            <ListItemButton
              selected={section === "main"}
              onClick={() => onSectionChange("main")}
            >
              <ListItemIcon>
                <UploadIcon />
              </ListItemIcon>
              <ListItemText primary="Uploads" />
            </ListItemButton>
            <ListItemButton disabled>
              <ListItemIcon>
                <AssessmentIcon />
              </ListItemIcon>
              <ListItemText primary="Reports" />
            </ListItemButton>
            <ListItemButton
              selected={section === "audit"}
              onClick={() => onSectionChange("audit")}
            >
              <ListItemIcon>
                <HistoryIcon />
              </ListItemIcon>
              <ListItemText primary="Audit Log" />
            </ListItemButton>
            <Divider sx={{ my: 1 }} />
            <ListItemButton disabled>
              <ListItemIcon>
                <SettingsIcon />
              </ListItemIcon>
              <ListItemText primary="Settings" />
            </ListItemButton>
          </List>
        </Box>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}
