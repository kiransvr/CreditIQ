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
import HistoryIcon from "@mui/icons-material/History";
import LanguageIcon from "@mui/icons-material/Language";
import AccountCircle from "@mui/icons-material/AccountCircle";

export type ShellRole =
  | "loan_officer"
  | "credit_manager"
  | "risk_analyst"
  | "auditor"
  | "admin";

export type ShellLanguage = "en" | "en-IN" | "es" | "ar" | "am-ET";

const ROLE_LABELS_I18N: Record<ShellLanguage, Record<ShellRole, string>> = {
  en: {
    loan_officer: "Loan Officer",
    credit_manager: "Credit Manager",
    risk_analyst: "Risk Analyst",
    auditor: "Auditor",
    admin: "Administrator"
  },
  "en-IN": {
    loan_officer: "Loan Officer",
    credit_manager: "Credit Manager",
    risk_analyst: "Risk Analyst",
    auditor: "Auditor",
    admin: "Administrator"
  },
  es: {
    loan_officer: "Loan Officer",
    credit_manager: "Credit Manager",
    risk_analyst: "Risk Analyst",
    auditor: "Auditor",
    admin: "Administrator"
  },
  ar: {
    loan_officer: "Loan Officer",
    credit_manager: "Credit Manager",
    risk_analyst: "Risk Analyst",
    auditor: "Auditor",
    admin: "Administrator"
  },
  "am-ET": {
    loan_officer: "የብድር ባለሙያ",
    credit_manager: "የክሬዲት አስተዳዳሪ",
    risk_analyst: "የአደጋ ተንታኝ",
    auditor: "ኦዲተር",
    admin: "አስተዳዳሪ"
  }
};

export type ShellSection = "main" | "audit";

const SHELL_I18N: Record<ShellLanguage, {
  appName: string;
  role: string;
  language: string;
  account: string;
  dashboard: string;
  uploads: string;
  reports: string;
  auditLog: string;
  settings: string;
  signedInAs: string;
  profile: string;
  signOut: string;
}> = {
  en: {
    appName: "CreditIQ",
    role: "Role",
    language: "Language",
    account: "Account",
    dashboard: "Dashboard",
    uploads: "Uploads",
    reports: "Reports",
    auditLog: "Audit Log",
    settings: "Settings",
    signedInAs: "Signed in as demo-user",
    profile: "Profile",
    signOut: "Sign out"
  },
  "en-IN": {
    appName: "CreditIQ",
    role: "Role",
    language: "Language",
    account: "Account",
    dashboard: "Dashboard",
    uploads: "Uploads",
    reports: "Reports",
    auditLog: "Audit Log",
    settings: "Settings",
    signedInAs: "Signed in as demo-user",
    profile: "Profile",
    signOut: "Sign out"
  },
  es: {
    appName: "CreditIQ",
    role: "Rol",
    language: "Idioma",
    account: "Cuenta",
    dashboard: "Panel",
    uploads: "Cargas",
    reports: "Informes",
    auditLog: "Registro de auditoria",
    settings: "Configuracion",
    signedInAs: "Sesion iniciada como demo-user",
    profile: "Perfil",
    signOut: "Cerrar sesion"
  },
  ar: {
    appName: "CreditIQ",
    role: "الدور",
    language: "اللغة",
    account: "الحساب",
    dashboard: "لوحة التحكم",
    uploads: "التحميلات",
    reports: "التقارير",
    auditLog: "سجل التدقيق",
    settings: "الإعدادات",
    signedInAs: "تسجيل الدخول كـ demo-user",
    profile: "الملف الشخصي",
    signOut: "تسجيل الخروج"
  },
  "am-ET": {
    appName: "ክሬዲትIQ",
    role: "ሚና",
    language: "ቋንቋ",
    account: "መለያ",
    dashboard: "ዳሽቦርድ",
    uploads: "ጭነቶች",
    reports: "ሪፖርቶች",
    auditLog: "የኦዲት ማስታወሻ",
    settings: "ቅንብሮች",
    signedInAs: "እንደ demo-user ገብተዋል",
    profile: "መገለጫ",
    signOut: "ውጣ"
  }
};

interface AppShellProps {
  environment: "Development" | "UAT" | "Production";
  role: ShellRole;
  onRoleChange: (role: ShellRole) => void;
  language: ShellLanguage;
  onLanguageChange: (language: ShellLanguage) => void;
  section: ShellSection;
  onSectionChange: (section: ShellSection) => void;
  children: ReactNode;
}

const DRAWER_WIDTH = 240;

export function AppShell({
  environment,
  role,
  onRoleChange,
  language,
  onLanguageChange,
  section,
  onSectionChange,
  children
}: AppShellProps) {
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const t = SHELL_I18N[language] ?? SHELL_I18N.en;
  const roleLabels = ROLE_LABELS_I18N[language] ?? ROLE_LABELS_I18N.en;

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
            {t.appName}
          </Typography>
          <Chip
            size="small"
            color={envColor as "info" | "warning" | "error"}
            label={`Env: ${environment}`}
            variant="outlined"
          />

          <Box sx={{ flexGrow: 1 }} />

          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="shell-role-label">{t.role}</InputLabel>
            <Select
              labelId="shell-role-label"
              label={t.role}
              value={role}
              onChange={(event) => onRoleChange(event.target.value as ShellRole)}
              inputProps={{ "aria-label": "Active role" }}
            >
              {(Object.keys(roleLabels) as ShellRole[]).map((key) => (
                <MenuItem key={key} value={key}>
                  {roleLabels[key]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Tooltip title={t.language}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <Select
                value={language}
                onChange={(event) => onLanguageChange(event.target.value as ShellLanguage)}
                startAdornment={<LanguageIcon fontSize="small" sx={{ mr: 1 }} />}
                inputProps={{ "aria-label": "Language" }}
              >
                <MenuItem value="en">English</MenuItem>
                <MenuItem value="en-IN">English (India)</MenuItem>
                <MenuItem value="es">Español</MenuItem>
                <MenuItem value="ar">العربية</MenuItem>
                <MenuItem value="am-ET">አማርኛ (ኢትዮጵያ)</MenuItem>
              </Select>
            </FormControl>
          </Tooltip>

          <Tooltip title={t.account}>
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
            <MenuItem disabled>{t.signedInAs}</MenuItem>
            <Divider />
            <MenuItem onClick={() => setUserMenuAnchor(null)}>{t.profile}</MenuItem>
            <MenuItem onClick={() => setUserMenuAnchor(null)}>{t.signOut}</MenuItem>
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
              <ListItemText primary={t.dashboard} />
            </ListItemButton>
            <ListItemButton
              selected={section === "main"}
              onClick={() => onSectionChange("main")}
            >
              <ListItemIcon>
                <UploadIcon />
              </ListItemIcon>
              <ListItemText primary={t.uploads} />
            </ListItemButton>
            <ListItemButton
              selected={section === "audit"}
              onClick={() => onSectionChange("audit")}
            >
              <ListItemIcon>
                <HistoryIcon />
              </ListItemIcon>
              <ListItemText primary={t.auditLog} />
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
