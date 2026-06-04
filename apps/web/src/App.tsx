import { useEffect, useState, useMemo } from "react";
import { useState as useReactState } from "react";
import Alert from "@mui/material/Alert";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import LinearProgress from "@mui/material/LinearProgress";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AuditLog from "./pages/AuditLog";
import { AppShell, type ShellLanguage } from "./shell/AppShell";

type ScreenState = "idle" | "working" | "success" | "error";
type UserRole = "loan_officer" | "credit_manager" | "risk_analyst" | "auditor" | "admin";
type DiagnosticFilter = "all" | "errors" | "warnings";
type DiagnosticSort = "row" | "type" | "code";
type DiagnosticSortDirection = "asc" | "desc";

interface DiagnosticItem {
  type: "error" | "warning";
  row: number;
  customerId?: string;
  customerName?: string;
  field: string;
  code: string;
  message: string;
}

interface ScoreWaterfallStep {
  key: string;
  label: string;
  impact: number;
  startScore: number;
  endScore: number;
}

interface UploadSummary {
  totalRows: number;
  validRows: number;
  errorRows: number;
  warningRows: number;
}

interface UploadDetails {
  uploadId: string;
  status: string;
  summary: UploadSummary;
  diagnostics: {
    items: DiagnosticItem[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  recommendation: {
    decision: string;
    suggestedAmount: number;
    score: number;
    riskCategory: string;
    reasons: string[];
    customerScores?: Array<{
      row: number;
      customerId: string;
      customerName?: string;
      score: number;
      riskCategory: string;
      confidence: number;
      manualReviewRequired: boolean;
      decision: string;
      suggestedAmount: number;
      reasons: string[];
    }>;
    explanation: {
      baseScore: number;
      components: Array<{
        key: string;
        label: string;
        impact: number;
        detail: string;
      }>;
      policyNotes: string[];
    };
  };
  override: {
    decision: string;
    reason: string;
    overriddenBy: string;
    overriddenAt: string;
  } | null;
}

function normalizeUploadDetails(payload: UploadDetails): UploadDetails {
  const diagnostics = payload.diagnostics ?? {
    items: [],
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 1
  };

  const normalizedItems = (diagnostics.items ?? []).map((item) => {
    if (item.type === "error" || item.type === "warning") {
      return item;
    }

    // Backward-compatible fallback for payloads missing issue type.
    const warningCodes = new Set(["NEGATIVE_NET_CASHFLOW", "HIGH_REQUEST_TO_INFLOW_RATIO"]);
    const inferredType = warningCodes.has(item.code) ? "warning" : "error";
    return {
      ...item,
      type: inferredType,
      customerId: item.customerId ?? `ROW-${item.row}`,
      customerName: item.customerName ?? item.customerId ?? `ROW-${item.row}`
    } as DiagnosticItem;
  });

  return {
    ...payload,
    recommendation: {
      ...payload.recommendation,
      customerScores: payload.recommendation.customerScores ?? []
    },
    diagnostics: {
      ...diagnostics,
      items: normalizedItems,
      total: diagnostics.total ?? normalizedItems.length,
      page: diagnostics.page ?? 1,
      pageSize: diagnostics.pageSize ?? 10,
      totalPages: diagnostics.totalPages ?? 1
    }
  };
}

type RiskCategory = "low" | "medium" | "high" | "very_high";

function toRiskLabel(riskCategory: string, language: ShellLanguage): string {
  if (language === "am-ET") {
    const amLabels: Record<RiskCategory, string> = {
      low: "ዝቅተኛ",
      medium: "መካከለኛ",
      high: "ከፍተኛ",
      very_high: "በጣም ከፍተኛ"
    };

    if (riskCategory in amLabels) {
      return amLabels[riskCategory as RiskCategory];
    }

    return "ያልታወቀ";
  }

  const labels: Record<RiskCategory, string> = {
    low: "Low",
    medium: "Medium",
    high: "High",
    very_high: "Very High"
  };

  if (riskCategory in labels) {
    return labels[riskCategory as RiskCategory];
  }

  return "Unknown";
}

function toScoreBand(score: number, language: ShellLanguage): string {
  if (language === "am-ET") {
    if (score >= 750) {
      return "ጠንካራ";
    }

    if (score >= 620) {
      return "የተረጋጋ";
    }

    if (score >= 450) {
      return "የተገደበ";
    }

    return "ደካማ";
  }

  if (score >= 750) {
    return "Strong";
  }

  if (score >= 620) {
    return "Stable";
  }

  if (score >= 450) {
    return "Constrained";
  }

  return "Weak";
}

function toDecisionLabel(decision: string, language: ShellLanguage): string {
  if (language === "am-ET") {
    if (decision === "lower_loan") {
      return "የብድር መጠን አሳንስ";
    }

    if (decision === "manual_review") {
      return "በእጅ ግምገማ";
    }

    if (decision === "proceed") {
      return "ቀጥል";
    }

    if (decision === "reject") {
      return "ውድቅ";
    }
  }

  if (decision === "lower_loan") {
    return "Lower Loan";
  }

  if (decision === "manual_review") {
    return "Manual Review";
  }

  return decision.charAt(0).toUpperCase() + decision.slice(1);
}

function toDiagnosticTypeLabel(type: "error" | "warning", language: ShellLanguage): string {
  if (language === "am-ET") {
    return type === "error" ? "ስህተት" : "ማስጠንቀቂያ";
  }

  return type;
}

function toDiagnosticMessageLabel(message: string, code: string, language: ShellLanguage): string {
  if (language !== "am-ET") {
    return message;
  }

  const byCode: Record<string, string> = {
    REQUIRED: "ይህ መስክ መሙላት ያስፈልጋል።",
    RANGE: "የገቢ እሴት ከተፈቀደው ክልል ውጭ ነው።",
    FORMAT: "ቅርጸቱ ትክክል አይደለም።"
  };

  if (byCode[code]) {
    return byCode[code];
  }

  const byMessage: Record<string, string> = {
    "Monthly income is required": "ወርሃዊ ገቢ መሙላት ያስፈልጋል።",
    "Monthly income is invalid": "ወርሃዊ ገቢ ዋጋ ትክክል አይደለም።",
    "Tenure must be positive": "የብድር ጊዜ ከዜሮ በላይ መሆን አለበት።",
    "Tenure must be between 1 and 60": "የብድር ጊዜ ከ1 እስከ 60 ወር መሆን አለበት።",
    "Phone format looks unusual": "የስልክ ቁጥር ቅርጽ ያልተለመደ ይመስላል።"
  };

  return byMessage[message] ?? message;
}

function toGeneratedNarrativeLabel(text: string, language: ShellLanguage): string {
  if (language !== "am-ET") {
    return text;
  }

  let match = text.match(/^Validated (\d+) rows with (\d+) error rows and (\d+) warning rows\.$/);
  if (match) {
    return `${match[1]} ረድፎች ተረጋግጠዋል፣ ${match[2]} የስህተት ረድፎች እና ${match[3]} የማስጠንቀቂያ ረድፎች ተገኝተዋል።`;
  }

  match = text.match(/^Estimated average net monthly cashflow is ([\d.,-]+)\.$/);
  if (match) {
    return `የተገመተው አማካይ የወርሃዊ የተጣራ የገንዘብ ፍሰት ${match[1]} ነው።`;
  }

  match = text.match(/^Calculated portfolio score is (\d+) with ([a-z_]+) risk category\.$/i);
  if (match && match[2]) {
    return `የፖርትፎሊዮ ውጤት ${match[1]} ሲሆን የአደጋ ደረጃው ${toRiskLabel(match[2].toLowerCase(), language)} ነው።`;
  }

  match = text.match(/^Individual customer scores generated for (\d+) row\(s\)\.$/);
  if (match) {
    return `ለ${match[1]} ረድፎች የግለሰብ ደንበኛ ውጤቶች ተፈጥረዋል።`;
  }

  match = text.match(/^Average requested loan amount is ([\d.,-]+)\.$/);
  if (match) {
    return `አማካይ የተጠየቀ የብድር መጠን ${match[1]} ነው።`;
  }

  const exactMap: Record<string, string> = {
    "Requested loan amount could not be estimated from uploaded data.": "ከተጫነው ውሂብ የተጠየቀው የብድር መጠን ሊገመት አልቻለም።",
    "Mandatory fields are missing or invalid, so manager review is required.": "አስፈላጊ መስኮች ጎድለዋል ወይም ትክክል አይደሉም፣ ስለዚህ የአስተዳዳሪ ግምገማ ያስፈልጋል።",
    "Cashflow indicates weak repayment capacity.": "የገንዘብ ፍሰቱ ደካማ የመክፈል አቅም እንዳለ ያመለክታል።",
    "Requested amount exceeds estimated repayment capacity; lower amount is advised.": "የተጠየቀው መጠን የተገመተውን የመክፈል አቅም ይበልጣል፤ ዝቅተኛ መጠን ይመከራል።",
    "Warning signals are present; manual review is recommended before approval.": "የማስጠንቀቂያ ምልክቶች አሉ፤ ከፍቃድ በፊት በእጅ ግምገማ ይመከራል።",
    "Repayment capacity and data quality are within acceptable range for normal processing.": "የመክፈል አቅም እና የውሂብ ጥራት ለመደበኛ ሂደት ተቀባይነት ባለው ክልል ውስጥ ናቸው።",
    "Policy rule: blocking validation errors force manual_review.": "የፖሊሲ ህግ፦ የሚከለክሉ የማረጋገጫ ስህተቶች በእጅ ግምገማን ያስገድዳሉ።",
    "Policy rule: non-positive net cashflow or score < 420 leads to reject.": "የፖሊሲ ህግ፦ ዜሮ ወይም ከዚያ በታች የሆነ የተጣራ የገንዘብ ፍሰት ወይም ከ420 በታች ውጤት ወደ ውድቅ ያመራል።",
    "Policy rule: request above capacity leads to lower_loan recommendation.": "የፖሊሲ ህግ፦ ከአቅም በላይ የሆነ ጥያቄ ወደ ዝቅተኛ የብድር ምክረ ውሳኔ ያመራል።",
    "Policy rule: warning signals or score < 620 trigger manual_review.": "የፖሊሲ ህግ፦ የማስጠንቀቂያ ምልክቶች ወይም ከ620 በታች ውጤት በእጅ ግምገማን ያስነሳሉ።",
    "Policy rule: data quality and score thresholds permit proceed.": "የፖሊሲ ህግ፦ የውሂብ ጥራት እና የውጤት ገደቦች ቀጥል የሚለውን ይፈቅዳሉ።"
  };

  if (exactMap[text]) {
    return exactMap[text];
  }

  match = text.match(/^(\d+) warning signal\(s\) found for this row\.$/);
  if (match) {
    return `ለዚህ ረድፍ ${match[1]} የማስጠንቀቂያ ምልክቶች ተገኝተዋል።`;
  }

  match = text.match(/^(\d+) blocking validation error\(s\) found for this row\.$/);
  if (match) {
    return `ለዚህ ረድፍ ${match[1]} የሚከለክሉ የማረጋገጫ ስህተቶች ተገኝተዋል።`;
  }

  return text;
}

function formatImpact(impact: number): string {
  if (impact > 0) {
    return `+${impact}`;
  }

  return `${impact}`;
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

type AppI18n = {
  shellKicker: string;
  dashboardTitle: string;
  auditTitle: string;
  activeRole: string;
  uploadOps: string;
  readyMessage: string;
  fetchingDiagnostics: string;
  loadedDetails: string;
  chooseFileFirst: string;
  uploadingFile: string;
  uploadAccepted: string;
  uploadFailed: string;
  enterUploadIdFirst: string;
  validatingStoredUpload: string;
  validationComplete: string;
  validationFailed: string;
  enterUploadIdToFetch: string;
  preparingReportDownload: string;
  reportDownloadStarted: string;
  reportDownloadFailed: string;
  enterUploadIdBeforeOverride: string;
  overrideMinReason: string;
  submittingOverride: string;
  overrideSaved: string;
  overrideFailed: string;
  uploadId: string;
  uploadIdPlaceholder: string;
  validateUpload: string;
  fetchDetails: string;
  downloadReport: string;
  manualOverride: string;
  decision: string;
  reason: string;
  reasonPlaceholder: string;
  minChars: string;
  rowsProcessed: string;
  errorRows: string;
  riskBand: string;
};

type StatusMessageState =
  | { key: keyof AppI18n; suffix?: string }
  | { raw: string };

const APP_I18N: Record<ShellLanguage, AppI18n> = {
  en: {
    shellKicker: "International-ready operations console",
    dashboardTitle: "Portfolio Intake Dashboard",
    auditTitle: "Audit & Compliance",
    activeRole: "Active role",
    uploadOps: "Upload Operations",
    readyMessage: "Ready. Upload a file or fetch an existing upload.",
    fetchingDiagnostics: "Fetching diagnostics...",
    loadedDetails: "Loaded details for",
    chooseFileFirst: "Choose a CSV or XLSX file first.",
    uploadingFile: "Uploading file...",
    uploadAccepted: "Upload accepted with id",
    uploadFailed: "Upload failed.",
    enterUploadIdFirst: "Enter or upload an uploadId first.",
    validatingStoredUpload: "Validating upload from stored file...",
    validationComplete: "Validation complete for",
    validationFailed: "Validation failed.",
    enterUploadIdToFetch: "Enter an uploadId to fetch details.",
    preparingReportDownload: "Preparing report download...",
    reportDownloadStarted: "Report download started for",
    reportDownloadFailed: "Report download failed.",
    enterUploadIdBeforeOverride: "Enter an uploadId before override.",
    overrideMinReason: "Override reason must be at least 10 characters.",
    submittingOverride: "Submitting override...",
    overrideSaved: "Override saved for",
    overrideFailed: "Override failed.",
    uploadId: "Upload ID",
    uploadIdPlaceholder: "Paste uploadId",
    validateUpload: "Validate Upload",
    fetchDetails: "Fetch Details",
    downloadReport: "Download Report",
    manualOverride: "Manual Override",
    decision: "Decision",
    reason: "Reason",
    reasonPlaceholder: "Mandatory override justification",
    minChars: "Minimum 10 characters required.",
    rowsProcessed: "Rows Processed",
    errorRows: "Error Rows",
    riskBand: "Risk Band"
  },
  "en-IN": {
    ...({} as AppI18n),
    ...{
      shellKicker: "International-ready operations console",
      dashboardTitle: "Portfolio Intake Dashboard",
      auditTitle: "Audit & Compliance",
      activeRole: "Active role",
      uploadOps: "Upload Operations",
      readyMessage: "Ready. Upload a file or fetch an existing upload.",
      fetchingDiagnostics: "Fetching diagnostics...",
      loadedDetails: "Loaded details for",
      chooseFileFirst: "Choose a CSV or XLSX file first.",
      uploadingFile: "Uploading file...",
      uploadAccepted: "Upload accepted with id",
      uploadFailed: "Upload failed.",
      enterUploadIdFirst: "Enter or upload an uploadId first.",
      validatingStoredUpload: "Validating upload from stored file...",
      validationComplete: "Validation complete for",
      validationFailed: "Validation failed.",
      enterUploadIdToFetch: "Enter an uploadId to fetch details.",
      preparingReportDownload: "Preparing report download...",
      reportDownloadStarted: "Report download started for",
      reportDownloadFailed: "Report download failed.",
      enterUploadIdBeforeOverride: "Enter an uploadId before override.",
      overrideMinReason: "Override reason must be at least 10 characters.",
      submittingOverride: "Submitting override...",
      overrideSaved: "Override saved for",
      overrideFailed: "Override failed.",
      uploadId: "Upload ID",
      uploadIdPlaceholder: "Paste uploadId",
      validateUpload: "Validate Upload",
      fetchDetails: "Fetch Details",
      downloadReport: "Download Report",
      manualOverride: "Manual Override",
      decision: "Decision",
      reason: "Reason",
      reasonPlaceholder: "Mandatory override justification",
      minChars: "Minimum 10 characters required.",
      rowsProcessed: "Rows Processed",
      errorRows: "Error Rows",
      riskBand: "Risk Band"
    }
  },
  es: {
    shellKicker: "Consola operativa lista para entornos internacionales",
    dashboardTitle: "Panel de cartera",
    auditTitle: "Auditoria y cumplimiento",
    activeRole: "Rol activo",
    uploadOps: "Operaciones de carga",
    readyMessage: "Listo. Cargue un archivo o consulte una carga existente.",
    fetchingDiagnostics: "Consultando diagnosticos...",
    loadedDetails: "Detalles cargados para",
    chooseFileFirst: "Primero seleccione un archivo CSV o XLSX.",
    uploadingFile: "Cargando archivo...",
    uploadAccepted: "Carga aceptada con id",
    uploadFailed: "Error de carga.",
    enterUploadIdFirst: "Ingrese o cargue primero un uploadId.",
    validatingStoredUpload: "Validando carga desde archivo almacenado...",
    validationComplete: "Validacion completada para",
    validationFailed: "Fallo la validacion.",
    enterUploadIdToFetch: "Ingrese un uploadId para consultar detalles.",
    preparingReportDownload: "Preparando descarga del informe...",
    reportDownloadStarted: "La descarga del informe inicio para",
    reportDownloadFailed: "Fallo la descarga del informe.",
    enterUploadIdBeforeOverride: "Ingrese un uploadId antes de anular.",
    overrideMinReason: "La razon de anulacion debe tener al menos 10 caracteres.",
    submittingOverride: "Enviando anulacion...",
    overrideSaved: "Anulacion guardada para",
    overrideFailed: "Fallo la anulacion.",
    uploadId: "ID de carga",
    uploadIdPlaceholder: "Pegar ID de carga",
    validateUpload: "Validar carga",
    fetchDetails: "Obtener detalles",
    downloadReport: "Descargar informe",
    manualOverride: "Anulacion manual",
    decision: "Decision",
    reason: "Motivo",
    reasonPlaceholder: "Justificacion obligatoria de anulacion",
    minChars: "Se requieren al menos 10 caracteres.",
    rowsProcessed: "Filas procesadas",
    errorRows: "Filas con error",
    riskBand: "Banda de riesgo"
  },
  ar: {
    shellKicker: "وحدة تشغيل جاهزة للاسواق الدولية",
    dashboardTitle: "لوحة استقبال المحفظة",
    auditTitle: "التدقيق والامتثال",
    activeRole: "الدور النشط",
    uploadOps: "عمليات الرفع",
    readyMessage: "جاهز. ارفع ملفا او اجلب عملية رفع موجودة.",
    fetchingDiagnostics: "جاري جلب التشخيصات...",
    loadedDetails: "تم تحميل التفاصيل لـ",
    chooseFileFirst: "اختر ملف CSV او XLSX اولا.",
    uploadingFile: "جاري رفع الملف...",
    uploadAccepted: "تم قبول الرفع بالمعرف",
    uploadFailed: "فشل الرفع.",
    enterUploadIdFirst: "ادخل او ارفع uploadId اولا.",
    validatingStoredUpload: "جاري التحقق من الرفع من الملف المخزن...",
    validationComplete: "اكتمل التحقق لـ",
    validationFailed: "فشل التحقق.",
    enterUploadIdToFetch: "ادخل uploadId لجلب التفاصيل.",
    preparingReportDownload: "جاري تجهيز تنزيل التقرير...",
    reportDownloadStarted: "بدأ تنزيل التقرير لـ",
    reportDownloadFailed: "فشل تنزيل التقرير.",
    enterUploadIdBeforeOverride: "ادخل uploadId قبل التجاوز.",
    overrideMinReason: "يجب ان يكون سبب التجاوز 10 احرف على الاقل.",
    submittingOverride: "جاري ارسال التجاوز...",
    overrideSaved: "تم حفظ التجاوز لـ",
    overrideFailed: "فشل التجاوز.",
    uploadId: "معرف الرفع",
    uploadIdPlaceholder: "الصق معرف الرفع",
    validateUpload: "التحقق من الرفع",
    fetchDetails: "جلب التفاصيل",
    downloadReport: "تنزيل التقرير",
    manualOverride: "تجاوز يدوي",
    decision: "القرار",
    reason: "السبب",
    reasonPlaceholder: "سبب التجاوز مطلوب",
    minChars: "الحد الادنى 10 احرف.",
    rowsProcessed: "الصفوف المعالجة",
    errorRows: "صفوف الاخطاء",
    riskBand: "نطاق المخاطر"
  },
  "am-ET": {
    shellKicker: "ለአለምአቀፍ ገበያ ዝግጁ የስራ መቆጣጠሪያ",
    dashboardTitle: "የፖርትፎሊዮ መግቢያ ዳሽቦርድ",
    auditTitle: "ኦዲት እና ተገዢነት",
    activeRole: "ንቁ ሚና",
    uploadOps: "የፋይል ጭነት ስራዎች",
    readyMessage: "ዝግጁ ነው። ፋይል ይጫኑ ወይም ካለ ጭነት ይፈልጉ።",
    fetchingDiagnostics: "የምርመራ መረጃ በመጫን ላይ...",
    loadedDetails: "ዝርዝር ተጭኗል ለ",
    chooseFileFirst: "መጀመሪያ CSV ወይም XLSX ፋይል ይምረጡ።",
    uploadingFile: "ፋይል በመጫን ላይ...",
    uploadAccepted: "ጭነቱ ተቀባ በመለያ",
    uploadFailed: "ጭነት አልተሳካም።",
    enterUploadIdFirst: "መጀመሪያ uploadId ያስገቡ ወይም ይጫኑ።",
    validatingStoredUpload: "ከተቀመጠ ፋይል ጭነት በማረጋገጥ ላይ...",
    validationComplete: "ማረጋገጥ ተጠናቋል ለ",
    validationFailed: "ማረጋገጥ አልተሳካም።",
    enterUploadIdToFetch: "ዝርዝር ለማምጣት uploadId ያስገቡ።",
    preparingReportDownload: "የሪፖርት ማውረድ በማዘጋጀት ላይ...",
    reportDownloadStarted: "የሪፖርት ማውረድ ተጀምሯል ለ",
    reportDownloadFailed: "የሪፖርት ማውረድ አልተሳካም።",
    enterUploadIdBeforeOverride: "ከመሻሻያ በፊት uploadId ያስገቡ።",
    overrideMinReason: "የመሻሻያ ምክንያት ቢያንስ 10 ቁምፊ መሆን አለበት።",
    submittingOverride: "መሻሻያ በመላክ ላይ...",
    overrideSaved: "መሻሻያ ተቀምጧል ለ",
    overrideFailed: "መሻሻያ አልተሳካም።",
    uploadId: "የጭነት መለያ",
    uploadIdPlaceholder: "የጭነት መለያ አስገባ",
    validateUpload: "ጭነቱን አረጋግጥ",
    fetchDetails: "ዝርዝር አምጣ",
    downloadReport: "ሪፖርት አውርድ",
    manualOverride: "በእጅ ማሻሻያ",
    decision: "ውሳኔ",
    reason: "ምክንያት",
    reasonPlaceholder: "አስፈላጊ የማሻሻያ ምክንያት",
    minChars: "ቢያንስ 10 ቁምፊዎች ያስፈልጋሉ።",
    rowsProcessed: "የተሰሩ ረድፎች",
    errorRows: "የስህተት ረድፎች",
    riskBand: "የአደጋ ደረጃ"
  }
};

export function App() {
  const [showAuditLog, setShowAuditLog] = useReactState(false);
  const [language, setLanguage] = useState<ShellLanguage>("en");
  const [file, setFile] = useState<File | null>(null);
  const [role, setRole] = useState<UserRole>("loan_officer");
  const [uploadId, setUploadId] = useState("");
  const [overrideDecision, setOverrideDecision] = useState("manual_review");
  const [overrideReason, setOverrideReason] = useState("");
  const [diagnosticFilter, setDiagnosticFilter] = useState<DiagnosticFilter>("all");
  const [diagnosticSort, setDiagnosticSort] = useState<DiagnosticSort>("row");
  const [diagnosticSortDirection, setDiagnosticSortDirection] = useState<DiagnosticSortDirection>("asc");
  const [diagnosticQuery, setDiagnosticQuery] = useState("");
  const [diagnosticPage, setDiagnosticPage] = useState(1);
  const [diagnosticPageSize, setDiagnosticPageSize] = useState(10);
  const [hasDetailsRequested, setHasDetailsRequested] = useState(false);
  const [diagnosticFetchTick, setDiagnosticFetchTick] = useState(0);
  const [state, setState] = useState<ScreenState>("idle");
  const [statusMessage, setStatusMessage] = useState<StatusMessageState>({ key: "readyMessage" });
  const [details, setDetails] = useState<UploadDetails | null>(null);
  const i18n = APP_I18N[language] ?? APP_I18N.en;
  const message = "raw" in statusMessage
    ? statusMessage.raw
    : `${i18n[statusMessage.key]}${statusMessage.suffix ? ` ${statusMessage.suffix}` : ""}`;

  const statusClassName = useMemo(() => `status ${state}`, [state]);
  const riskClassName = useMemo(
    () => `risk-badge ${details ? details.recommendation.riskCategory : "unknown"}`,
    [details]
  );
  const scoreFillWidth = useMemo(() => `${Math.min(Math.max(details?.recommendation.score ?? 0, 0), 1000) / 10}%`, [details]);
  // Diagnostics counts for quick filter chips
  const diagnosticCounts = details?.diagnostics
    ? {
        all: details.diagnostics.total,
        errors: details.diagnostics.items.filter((d) => d.type === "error").length,
        warnings: details.diagnostics.items.filter((d) => d.type === "warning").length
      }
    : ({ all: 0, errors: 0, warnings: 0 });

  // Fetch diagnostics page when any diagnostics-related state changes
  useEffect(() => {
    if (!uploadId || !hasDetailsRequested) return;
    async function fetchDiagnosticsPage() {
      setState("working");
      setStatusMessage({ key: "fetchingDiagnostics" });
      try {
        const params = new URLSearchParams({
          page: String(diagnosticPage),
          pageSize: String(diagnosticPageSize),
          filter: diagnosticFilter,
          sort: diagnosticSort,
          direction: diagnosticSortDirection,
        });
        if (diagnosticQuery) params.append("search", diagnosticQuery);
        const response = await fetch(`${apiBaseUrl}/api/v1/uploads/${uploadId}?${params.toString()}`, {
          headers: getAuthHeaders()
        });
        if (!response.ok) {
          throw new Error(await parseError(response));
        }
        const body = (await response.json()) as UploadDetails;
        setDetails(normalizeUploadDetails(body));
        setState("success");
        setStatusMessage({ key: "loadedDetails", suffix: body.uploadId });
      } catch (error) {
        setState("error");
        setStatusMessage(error instanceof Error ? { raw: error.message } : { key: "validationFailed" });
      }
    }
    fetchDiagnosticsPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadId, hasDetailsRequested, diagnosticPage, diagnosticPageSize, diagnosticFilter, diagnosticSort, diagnosticSortDirection, diagnosticQuery, diagnosticFetchTick]);

  function onDiagnosticSortChange(nextSort: DiagnosticSort) {
    if (nextSort === diagnosticSort) {
      setDiagnosticSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setDiagnosticSort(nextSort);
    setDiagnosticSortDirection("asc");
  }
  const waterfallSteps = useMemo<ScoreWaterfallStep[]>(() => {
    if (!details) {
      return [];
    }

    let runningScore = details.recommendation.explanation.baseScore;
    return details.recommendation.explanation.components.map((component) => {
      const startScore = runningScore;
      runningScore += component.impact;
      return {
        key: component.key,
        label: component.label,
        impact: component.impact,
        startScore,
        endScore: runningScore
      };
    });
  }, [details]);

  function getAuthHeaders(): Record<string, string> {
    return {
      Authorization: "Bearer dev-token",
      "x-user-id": "web-user",
      "x-user-role": role,
      "x-institution-id": "demo-bank"
    };
  }

  async function parseError(response: Response): Promise<string> {
    try {
      const body = (await response.json()) as { message?: string };
      return body.message ?? `Request failed with status ${response.status}`;
    } catch {
      return `Request failed with status ${response.status}`;
    }
  }

  async function uploadFile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file) {
      setState("error");
      setStatusMessage({ key: "chooseFileFirst" });
      return;
    }

    setState("working");
    setStatusMessage({ key: "uploadingFile" });

    const formData = new FormData();
    formData.append("file", file);
    formData.append("institutionId", "demo-bank");
    formData.append("templateVersion", "v1");

    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/uploads`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: formData
      });

      if (!response.ok) {
        throw new Error(await parseError(response));
      }

      const body = (await response.json()) as { uploadId: string };
      setUploadId(body.uploadId);
      setHasDetailsRequested(false);
      setDiagnosticFilter("all");
      setDiagnosticSort("row");
      setDiagnosticSortDirection("asc");
      setDiagnosticQuery("");
      setDiagnosticPage(1);
      setState("success");
      setStatusMessage({ key: "uploadAccepted", suffix: body.uploadId });
      setDetails(null);
    } catch (error) {
      setState("error");
      setStatusMessage(error instanceof Error ? { raw: error.message } : { key: "uploadFailed" });
    }
  }

  async function validateUpload() {
    if (!uploadId.trim()) {
      setState("error");
      setStatusMessage({ key: "enterUploadIdFirst" });
      return;
    }

    setState("working");
    setStatusMessage({ key: "validatingStoredUpload" });

    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/uploads/${uploadId}/validate`, {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({})
      });

      if (!response.ok) {
        throw new Error(await parseError(response));
      }

      const body = (await response.json()) as UploadDetails;
      setDetails(normalizeUploadDetails(body));
      setHasDetailsRequested(true);
      setDiagnosticFilter("all");
      setDiagnosticSort("row");
      setDiagnosticSortDirection("asc");
      setDiagnosticQuery("");
      setDiagnosticPage(1);
      setState("success");
      setStatusMessage({ key: "validationComplete", suffix: body.uploadId });
    } catch (error) {
      setState("error");
      setStatusMessage(error instanceof Error ? { raw: error.message } : { key: "validationFailed" });
    }
  }

  async function fetchUploadDetails() {
    if (!uploadId.trim()) {
      setState("error");
      setStatusMessage({ key: "enterUploadIdToFetch" });
      return;
    }
    setHasDetailsRequested(true);
    setDiagnosticPage(1);
    setDiagnosticFilter("all");
    setDiagnosticSort("row");
    setDiagnosticSortDirection("asc");
    setDiagnosticQuery("");
    setDiagnosticFetchTick((current) => current + 1);
    // Diagnostics will be fetched by useEffect
  }

  async function downloadReport() {
    if (!uploadId.trim()) {
      setState("error");
      setStatusMessage({ key: "enterUploadIdToFetch" });
      return;
    }

    setState("working");
    setStatusMessage({ key: "preparingReportDownload" });

    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/uploads/${uploadId}/report`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(await parseError(response));
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `upload-${uploadId}-report.csv`;
      anchor.click();
      URL.revokeObjectURL(url);

      setState("success");
      setStatusMessage({ key: "reportDownloadStarted", suffix: uploadId });
    } catch (error) {
      setState("error");
      setStatusMessage(error instanceof Error ? { raw: error.message } : { key: "reportDownloadFailed" });
    }
  }

  async function submitOverride() {
    if (!uploadId.trim()) {
      setState("error");
      setStatusMessage({ key: "enterUploadIdBeforeOverride" });
      return;
    }

    if (overrideReason.trim().length < 10) {
      setState("error");
      setStatusMessage({ key: "overrideMinReason" });
      return;
    }

    setState("working");
    setStatusMessage({ key: "submittingOverride" });

    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/uploads/${uploadId}/override`, {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          decision: overrideDecision,
          reason: overrideReason
        })
      });

      if (!response.ok) {
        throw new Error(await parseError(response));
      }

      const body = (await response.json()) as UploadDetails;
      setDetails(normalizeUploadDetails(body));
      setHasDetailsRequested(true);
      setDiagnosticFilter("all");
      setDiagnosticSort("row");
      setDiagnosticSortDirection("asc");
      setDiagnosticQuery("");
      setDiagnosticPage(1);
      setState("success");
      setStatusMessage({ key: "overrideSaved", suffix: body.uploadId });
    } catch (error) {
      setState("error");
      setStatusMessage(error instanceof Error ? { raw: error.message } : { key: "overrideFailed" });
    }
  }

  const useShell = true;

  const ui = language === "am-ET"
    ? {
        heroEyebrow: "ለፋይናንስ ተቋማት የብድር ውሳኔ ድጋፍ",
        heroCopy: "ለቅርንጫፍ እና ለአደጋ ቡድኖች ሚና-ተኮር ጭነት፣ ማረጋገጫ፣ ውጤት ማስላት እና በእጅ ማሻሻያ ሂደት።",
        chipBank: "የባንክ እና MFI ስራዎች",
        chipCsv: "CSV እና XLSX ግብዓት",
        chipExplainable: "ተገላጭ ምክረ ውሳኔ",
        borrowerDataFile: "የተበዳሪ ዳታ ፋይል",
        uploadFile: "ፋይል ጫን",
        working: "በስራ ላይ...",
        auditorNote: "የኦዲተር እይታ: ጭነት ተደብቋል፤ ያለ ጭነት ዝርዝር ማምጣት እና ሪፖርት ማውረድ ይችላሉ።",
        validationSummary: "የማረጋገጫ ማጠቃለያ",
        upload: "ጭነት",
        status: "ሁኔታ",
        rows: "ረድፎች",
        total: "ጠቅላላ",
        valid: "ትክክል",
        errors: "ስህተቶች",
        warnings: "ማስጠንቀቂያዎች",
        recommendation: "ምክረ ውሳኔ",
        risk: "አደጋ",
        suggestedAmount: "የተጠቆመ መጠን",
        borrowerScore: "የተበዳሪ ውጤት",
        scoreBand: "የውጤት ደረጃ",
        decisionRationale: "የውሳኔ ምክንያት",
        noRationale: "ምክንያት አልተመለሰም።",
        customerScores: "የደንበኛ-ደረጃ ውጤቶች",
        noCustomerScores: "የደንበኛ-ደረጃ ውጤት ረድፎች አልተመለሱም።",
        confidence: "መተማመን",
        score: "ውጤት",
        scoreExplanation: "የውጤት ማብራሪያ",
        baseScore: "መነሻ ውጤት",
        scoreWaterfall: "የውጤት ፍሰት",
        noComponentDeltas: "በዚህ ሂደት የአካል ለውጦች የሉም።",
        finalScore: "የመጨረሻ ውጤት",
        componentImpacts: "የአካል ተፅእኖዎች",
        noScoreComponents: "የውጤት አካላት የሉም።",
        policyNotes: "የፖሊሲ ማስታወሻዎች",
        noPolicyNotes: "የፖሊሲ ማስታወሻ አልተመለሰም።",
        appName: "ክሬዲትIQ",
        chooseFile: "ፋይል ይምረጡ",
        noFileChosen: "ምንም ፋይል አልተመረጠም",
        rowDiagnostics: "የረድፍ ምርመራ",
        all: "ሁሉም",
        diagnosticFilter: "የምርመራ ማጣሪያ",
        searchDiagnostics: "ምርመራ ፈልግ",
        searchPlaceholder: "በደንበኛ፣ በመስክ፣ በኮድ ወይም በመልእክት ፈልግ",
        diagnosticSort: "የምርመራ ማደራጃ",
        rowsPerPage: "በገጽ ያሉ ረድፎች",
        showing: "የሚታዩ",
        of: "ከ",
        diagnostics: "ምርመራዎች",
        type: "አይነት",
        customerId: "የደንበኛ መለያ",
        name: "ስም",
        field: "መስክ",
        code: "ኮድ",
        message: "መልእክት",
        page: "ገጽ",
        previous: "ያለፈ",
        next: "ቀጣይ",
        noDiagnosticsMatch: "ለዚህ ማጣሪያ የሚመጡ ምርመራዎች የሉም።",
        overrideDecision: "የማሻሻያ ውሳኔ",
        overrideReason: "የማሻሻያ ምክንያት",
        overriddenBy: "በማን ተሻሽሏል",
        overriddenAt: "የተሻሻለበት ጊዜ",
        noOverride: "ማሻሻያ አልተመዘገበም።"
      }
    : {
        heroEyebrow: "Credit Decision Support for Financial Institutions",
        heroCopy: "Role-aware upload, validation, scoring, and override workflow for branch and risk teams.",
        chipBank: "Bank and MFI operations",
        chipCsv: "CSV and XLSX ingestion",
        chipExplainable: "Explainable recommendation",
        borrowerDataFile: "Borrower data file",
        uploadFile: "Upload File",
        working: "Working...",
        auditorNote: "Auditor view: upload is hidden; you can fetch existing upload and download report.",
        validationSummary: "Validation Summary",
        upload: "Upload",
        status: "Status",
        rows: "Rows",
        total: "Total",
        valid: "Valid",
        errors: "Errors",
        warnings: "Warnings",
        recommendation: "Recommendation",
        risk: "Risk",
        suggestedAmount: "Suggested amount",
        borrowerScore: "Borrower score",
        scoreBand: "Score band",
        decisionRationale: "Decision rationale",
        noRationale: "No rationale returned.",
        customerScores: "Customer-level scores",
        noCustomerScores: "No customer-level score rows returned.",
        confidence: "Confidence",
        score: "Score",
        scoreExplanation: "Score explanation",
        baseScore: "Base score",
        scoreWaterfall: "Score waterfall",
        noComponentDeltas: "No component deltas in this run.",
        finalScore: "Final score",
        componentImpacts: "Component impacts",
        noScoreComponents: "No score components available.",
        policyNotes: "Policy notes",
        noPolicyNotes: "No policy notes returned.",
        appName: "CreditIQ",
        chooseFile: "Choose file",
        noFileChosen: "No file chosen",
        rowDiagnostics: "Row diagnostics",
        all: "All",
        diagnosticFilter: "Diagnostic filter",
        searchDiagnostics: "Search diagnostics",
        searchPlaceholder: "Search by customer, field, code, or message",
        diagnosticSort: "Diagnostic sort",
        rowsPerPage: "Rows per page",
        showing: "Showing",
        of: "of",
        diagnostics: "diagnostics",
        type: "Type",
        customerId: "Customer ID",
        name: "Name",
        field: "Field",
        code: "Code",
        message: "Message",
        page: "Page",
        previous: "Previous",
        next: "Next",
        noDiagnosticsMatch: "No diagnostics match this filter.",
        overrideDecision: "Override decision",
        overrideReason: "Override reason",
        overriddenBy: "Overridden by",
        overriddenAt: "Overridden at",
        noOverride: "No override recorded."
      };

  const pageContent = (
    <>
      {!useShell ? (
        <nav style={{ marginBottom: 16 }}>
          <button onClick={() => setShowAuditLog(false)} disabled={!showAuditLog}>
            Main
          </button>
          <button onClick={() => setShowAuditLog(true)} disabled={showAuditLog}>
            Audit Log
          </button>
        </nav>
      ) : null}
      {showAuditLog ? (
        <AuditLog language={language} />
      ) : (
        <section className="card">
          <header className="hero">
            <p className="eyebrow">{ui.heroEyebrow}</p>
            <h1>{ui.appName}</h1>
            <p className="hero-copy">{ui.heroCopy}</p>
            <div className="hero-chips" aria-label="context chips">
              <span className="chip">{ui.chipBank}</span>
              <span className="chip">{ui.chipCsv}</span>
              <span className="chip">{ui.chipExplainable}</span>
            </div>
          </header>

          {!useShell ? (
            <div className="toolbar">
              <label htmlFor="role">Role</label>
              <select id="role" value={role} onChange={(event) => setRole(event.target.value as UserRole)}>
                <option value="loan_officer">loan_officer</option>
                <option value="credit_manager">credit_manager</option>
                <option value="risk_analyst">risk_analyst</option>
                <option value="auditor">auditor</option>
                <option value="admin">admin</option>
              </select>
            </div>
          ) : null}

          {role !== "auditor" ? (
            <form onSubmit={uploadFile} className="upload-form">
              <label htmlFor="borrower-file">{ui.borrowerDataFile}</label>
              <input
                id="borrower-file"
                type="file"
                accept=".csv,.xlsx"
                style={{ display: "none" }}
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
              <label htmlFor="borrower-file" className="quick-filter-chip" role="button" tabIndex={0}>
                {ui.chooseFile}
              </label>
              <p>{file?.name ?? ui.noFileChosen}</p>
              <button type="submit" disabled={state === "working"}>
                {state === "working" ? ui.working : ui.uploadFile}
              </button>
            </form>
          ) : (
            <p className="note">{ui.auditorNote}</p>
          )}

          {!useShell ? (
            <div className="actions" aria-label="upload actions">
            <label htmlFor="upload-id">Upload ID</label>
            <input
              id="upload-id"
              type="text"
              value={uploadId}
              onChange={(event) => {
                setUploadId(event.target.value);
                setHasDetailsRequested(false);
              }}
              placeholder="Paste uploadId"
            />

            <div className="action-buttons">
              <button type="button" onClick={validateUpload} disabled={state === "working"}>
                Validate Upload
              </button>
              <button type="button" onClick={fetchUploadDetails} disabled={state === "working"}>
                Fetch Details
              </button>
              <button type="button" onClick={downloadReport} disabled={state === "working" || !uploadId.trim()}>
                Download Report
              </button>
            </div>
            </div>
          ) : null}

          {!useShell && (role === "credit_manager" || role === "admin") ? (
            <section className="override-panel">
              <h2>Manual Override</h2>
              <label htmlFor="override-decision">Decision</label>
              <select
                id="override-decision"
                value={overrideDecision}
                onChange={(event) => setOverrideDecision(event.target.value)}
              >
                <option value="proceed">proceed</option>
              <option value="lower_loan">lower_loan</option>
              <option value="manual_review">manual_review</option>
              <option value="reject">reject</option>
            </select>
            <label htmlFor="override-reason">Reason</label>
            <textarea
              id="override-reason"
              value={overrideReason}
              onChange={(event) => setOverrideReason(event.target.value)}
              placeholder="Mandatory override justification"
            />
            <button type="button" onClick={submitOverride} disabled={state === "working"}>
              Submit Override
            </button>
          </section>
        ) : null}

        {details ? (
          <section className="summary">
            {useShell ? (
              <Stack spacing={2}>
                <Typography variant="h6">{ui.validationSummary}</Typography>

                <Box
                  sx={{
                    display: "grid",
                    gap: 1.5,
                    gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" }
                  }}
                >
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="caption" color="text.secondary">{ui.upload}</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 700 }}>{details.uploadId}</Typography>
                      <Typography variant="body2" color="text.secondary">{ui.status}: {details.status}</Typography>
                    </CardContent>
                  </Card>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="caption" color="text.secondary">{ui.rows}</Typography>
                      <Typography variant="body2">{ui.total}: {details.summary.totalRows}</Typography>
                      <Typography variant="body2">{ui.valid}: {details.summary.validRows}</Typography>
                      <Typography variant="body2">{ui.errors}: {details.summary.errorRows}</Typography>
                      <Typography variant="body2">{ui.warnings}: {details.summary.warningRows}</Typography>
                    </CardContent>
                  </Card>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="caption" color="text.secondary">{ui.recommendation}</Typography>
                      <Stack direction="row" spacing={1} sx={{ mt: 0.5, mb: 1 }}>
                        <Chip label={`${i18n.decision}: ${toDecisionLabel(details.recommendation.decision, language)}`} color="primary" size="small" />
                        <Chip label={`${ui.risk}: ${toRiskLabel(details.recommendation.riskCategory, language)}`} color="secondary" size="small" />
                      </Stack>
                      <Typography variant="body2">{ui.suggestedAmount}: {details.recommendation.suggestedAmount}</Typography>
                    </CardContent>
                  </Card>
                </Box>

                <Paper variant="outlined" sx={{ p: 2 }} aria-label={ui.borrowerScore}>
                  <Stack spacing={1}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                      <Typography variant="subtitle2">{ui.borrowerScore}</Typography>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {details.recommendation.score} / 1000
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(Math.max(details.recommendation.score, 0), 1000) / 10}
                    />
                    <Typography variant="body2" color="text.secondary">
                      {ui.scoreBand}: {toScoreBand(details.recommendation.score, language)}
                    </Typography>
                  </Stack>
                </Paper>

                <Accordion defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle2">{ui.decisionRationale}</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    {details.recommendation.reasons.length > 0 ? (
                      <Stack component="ul" sx={{ m: 0, pl: 2 }}>
                        {details.recommendation.reasons.map((reason) => (
                          <Typography key={reason} component="li" variant="body2">
                            {toGeneratedNarrativeLabel(reason, language)}
                          </Typography>
                        ))}
                      </Stack>
                    ) : (
                      <Typography variant="body2" color="text.secondary">{ui.noRationale}</Typography>
                    )}
                  </AccordionDetails>
                </Accordion>

                <Accordion defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle2">{ui.customerScores}</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    {(details.recommendation.customerScores ?? []).length > 0 ? (
                      <TableContainer component={Paper} variant="outlined">
                        <Table size="small" aria-label="Customer-level scores">
                          <TableHead>
                            <TableRow>
                              <TableCell>Row</TableCell>
                              <TableCell>{ui.customerId}</TableCell>
                              <TableCell align="right">{ui.score}</TableCell>
                              <TableCell>{ui.risk}</TableCell>
                              <TableCell align="right">{ui.confidence}</TableCell>
                              <TableCell>{i18n.decision}</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {(details.recommendation.customerScores ?? []).map((item) => (
                              <TableRow key={`${item.row}-${item.customerId}`}>
                                <TableCell>{item.row}</TableCell>
                                <TableCell>{item.customerName ?? item.customerId}</TableCell>
                                <TableCell align="right">{item.score}</TableCell>
                                <TableCell>{toRiskLabel(item.riskCategory, language)}</TableCell>
                                <TableCell align="right">{item.confidence}%</TableCell>
                                <TableCell>{toDecisionLabel(item.decision, language)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    ) : (
                      <Typography variant="body2" color="text.secondary">{ui.noCustomerScores}</Typography>
                    )}
                  </AccordionDetails>
                </Accordion>

                <Accordion defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle2">{ui.scoreExplanation}</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Stack spacing={1.5} aria-label={ui.scoreExplanation}>
                      <Typography variant="body2">{ui.baseScore}: {details.recommendation.explanation.baseScore}</Typography>
                      <Box aria-label={ui.scoreWaterfall}>
                        <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>{ui.scoreWaterfall}</Typography>
                        <Stack spacing={1}>
                          {waterfallSteps.length > 0 ? (
                            waterfallSteps.map((step) => (
                              <Box key={`${step.key}-${step.label}-${step.endScore}`}>
                                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                                  <Typography variant="caption">{step.label}</Typography>
                                  <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                    {formatImpact(step.impact)}
                                  </Typography>
                                </Box>
                                <LinearProgress
                                  variant="determinate"
                                  value={Math.min(Math.max(step.endScore, 0), 1000) / 10}
                                  color={step.impact >= 0 ? "success" : "warning"}
                                />
                              </Box>
                            ))
                          ) : (
                            <Typography variant="body2" color="text.secondary">{ui.noComponentDeltas}</Typography>
                          )}
                        </Stack>
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          {ui.finalScore}: {details.recommendation.score}
                        </Typography>
                      </Box>

                      <Box>
                        <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>{ui.componentImpacts}</Typography>
                        {details.recommendation.explanation.components.length > 0 ? (
                          <Stack spacing={1}>
                            {details.recommendation.explanation.components.map((component) => (
                              <Box key={`${component.key}-${component.label}`} sx={{ p: 1, border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
                                <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.5 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{component.label}</Typography>
                                  <Chip size="small" label={formatImpact(component.impact)} variant="outlined" />
                                </Stack>
                                <Typography variant="body2" color="text.secondary">{component.detail}</Typography>
                              </Box>
                            ))}
                          </Stack>
                        ) : (
                          <Typography variant="body2" color="text.secondary">{ui.noScoreComponents}</Typography>
                        )}
                      </Box>

                      <Box>
                        <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>{ui.policyNotes}</Typography>
                        {details.recommendation.explanation.policyNotes.length > 0 ? (
                          <Stack component="ul" sx={{ m: 0, pl: 2 }}>
                            {details.recommendation.explanation.policyNotes.map((note) => (
                              <Typography key={note} component="li" variant="body2">
                                {toGeneratedNarrativeLabel(note, language)}
                              </Typography>
                            ))}
                          </Stack>
                        ) : (
                          <Typography variant="body2" color="text.secondary">{ui.noPolicyNotes}</Typography>
                        )}
                      </Box>
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              </Stack>
            ) : (
              <>
                <h2>{ui.validationSummary}</h2>
                <div className="metric-grid">
                  <p>{ui.upload}: {details.uploadId}</p>
                  <p>{ui.status}: {details.status}</p>
                  <p>{ui.total} {ui.rows.toLowerCase()}: {details.summary.totalRows}</p>
                  <p>{ui.valid} {ui.rows.toLowerCase()}: {details.summary.validRows}</p>
                  <p>{ui.errors} {ui.rows.toLowerCase()}: {details.summary.errorRows}</p>
                  <p>{ui.warnings} {ui.rows.toLowerCase()}: {details.summary.warningRows}</p>
                </div>
                <div className="summary-row">
                  <span className="decision-badge">{i18n.decision}: {toDecisionLabel(details.recommendation.decision, language)}</span>
                  <span className={riskClassName}>{ui.risk}: {toRiskLabel(details.recommendation.riskCategory, language)}</span>
                </div>
                <p>{ui.suggestedAmount}: {details.recommendation.suggestedAmount}</p>

                <div className="score-block" aria-label={ui.borrowerScore}>
                  <div className="score-header">
                    <span>{ui.borrowerScore}</span>
                    <strong>{details.recommendation.score} / 1000</strong>
                  </div>
                  <div className="score-meter" role="progressbar" aria-valuemin={0} aria-valuemax={1000} aria-valuenow={details.recommendation.score}>
                    <div className="score-fill" style={{ width: scoreFillWidth }} />
                  </div>
                  <p className="score-band">{ui.scoreBand}: {toScoreBand(details.recommendation.score, language)}</p>
                </div>

                <div className="rationale">
                  <h3>{ui.decisionRationale}</h3>
                  {details.recommendation.reasons.length > 0 ? (
                    <ul>
                      {details.recommendation.reasons.map((reason) => (
                        <li key={reason}>{toGeneratedNarrativeLabel(reason, language)}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>{ui.noRationale}</p>
                  )}
                </div>

                <div className="rationale" aria-label="Customer-level scores">
                  <h3>{ui.customerScores}</h3>
                  {(details.recommendation.customerScores ?? []).length > 0 ? (
                    <ul>
                      {(details.recommendation.customerScores ?? []).map((item) => (
                        <li key={`${item.row}-${item.customerId}`}>
                          {item.customerName ?? item.customerId}: {ui.score.toLowerCase()} {item.score} / 1000, {toRiskLabel(item.riskCategory, language)} {ui.risk.toLowerCase()}, {ui.confidence.toLowerCase()} {item.confidence}%, {i18n.decision.toLowerCase()} {toDecisionLabel(item.decision, language)}.
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>{ui.noCustomerScores}</p>
                  )}
                </div>

                <div className="explanation" aria-label={ui.scoreExplanation}>
                  <h3>{ui.scoreExplanation}</h3>
                  <p>{ui.baseScore}: {details.recommendation.explanation.baseScore}</p>

                  <div className="waterfall" aria-label={ui.scoreWaterfall}>
                    <h4>{ui.scoreWaterfall}</h4>
                    <div className="waterfall-row">
                      <span>Base</span>
                      <div className="waterfall-track">
                        <div
                          className="waterfall-fill base"
                          style={{ width: `${Math.min(Math.max(details.recommendation.explanation.baseScore, 0), 1000) / 10}%` }}
                        />
                      </div>
                      <strong>{details.recommendation.explanation.baseScore}</strong>
                    </div>
                    {waterfallSteps.length > 0 ? (
                      waterfallSteps.map((step) => (
                        <div className="waterfall-row" key={`${step.key}-${step.label}-${step.endScore}`}>
                          <span>{step.label}</span>
                          <div className="waterfall-track">
                            <div
                              className={`waterfall-fill ${step.impact >= 0 ? "positive" : "negative"}`}
                              style={{ width: `${Math.min(Math.max(step.endScore, 0), 1000) / 10}%` }}
                            />
                          </div>
                          <strong>{formatImpact(step.impact)}</strong>
                        </div>
                      ))
                    ) : (
                      <p className="waterfall-empty">{ui.noComponentDeltas}</p>
                    )}
                    <p className="waterfall-final">{ui.finalScore}: {details.recommendation.score}</p>
                  </div>

                  <h4>{ui.componentImpacts}</h4>
                  {details.recommendation.explanation.components.length > 0 ? (
                    <ul className="component-list">
                      {details.recommendation.explanation.components.map((component) => (
                        <li key={`${component.key}-${component.label}`}>
                          <strong>{component.label}</strong>
                          <span className="impact-chip">{formatImpact(component.impact)}</span>
                          <p>{component.detail}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>{ui.noScoreComponents}</p>
                  )}

                  <h4>{ui.policyNotes}</h4>
                  {details.recommendation.explanation.policyNotes.length > 0 ? (
                    <ul>
                      {details.recommendation.explanation.policyNotes.map((note) => (
                        <li key={note}>{toGeneratedNarrativeLabel(note, language)}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>{ui.noPolicyNotes}</p>
                  )}
                </div>
              </>
            )}

            <div className="diagnostics" aria-label="Row diagnostics">
              {useShell ? (
                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                  <Stack spacing={1.5}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      {ui.rowDiagnostics}
                    </Typography>

                    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }} role="group" aria-label="Quick diagnostics filters">
                      <Chip
                        label={`${ui.all} (${diagnosticCounts.all})`}
                        clickable
                        color={diagnosticFilter === "all" ? "primary" : "default"}
                        variant={diagnosticFilter === "all" ? "filled" : "outlined"}
                        onClick={() => setDiagnosticFilter("all")}
                      />
                      <Chip
                        label={`${ui.errors} (${diagnosticCounts.errors})`}
                        clickable
                        color={diagnosticFilter === "errors" ? "error" : "default"}
                        variant={diagnosticFilter === "errors" ? "filled" : "outlined"}
                        onClick={() => setDiagnosticFilter("errors")}
                      />
                      <Chip
                        label={`${ui.warnings} (${diagnosticCounts.warnings})`}
                        clickable
                        color={diagnosticFilter === "warnings" ? "warning" : "default"}
                        variant={diagnosticFilter === "warnings" ? "filled" : "outlined"}
                        onClick={() => setDiagnosticFilter("warnings")}
                      />
                    </Stack>

                    <Box
                      sx={{
                        display: "grid",
                        gap: 1,
                        gridTemplateColumns: { xs: "1fr", md: "repeat(4, minmax(0, 1fr))" }
                      }}
                    >
                      <FormControl size="small">
                        <InputLabel id="shell-diagnostic-filter-label">{ui.diagnosticFilter}</InputLabel>
                        <Select
                          labelId="shell-diagnostic-filter-label"
                          label={ui.diagnosticFilter}
                          value={diagnosticFilter}
                          onChange={(event) => setDiagnosticFilter(event.target.value as DiagnosticFilter)}
                        >
                          <MenuItem value="all">{ui.all.toLowerCase()}</MenuItem>
                          <MenuItem value="errors">{ui.errors.toLowerCase()}</MenuItem>
                          <MenuItem value="warnings">{ui.warnings.toLowerCase()}</MenuItem>
                        </Select>
                      </FormControl>

                      <TextField
                        id="shell-diagnostic-query"
                        size="small"
                        label={ui.searchDiagnostics}
                        value={diagnosticQuery}
                        onChange={(event) => setDiagnosticQuery(event.target.value)}
                        placeholder={ui.searchPlaceholder}
                      />

                      <FormControl size="small">
                        <InputLabel id="shell-diagnostic-sort-label">{ui.diagnosticSort}</InputLabel>
                        <Select
                          labelId="shell-diagnostic-sort-label"
                          label={ui.diagnosticSort}
                          value={diagnosticSort}
                          onChange={(event) => {
                            setDiagnosticSort(event.target.value as DiagnosticSort);
                            setDiagnosticSortDirection("asc");
                          }}
                        >
                          <MenuItem value="row">customerId</MenuItem>
                          <MenuItem value="type">{ui.type.toLowerCase()}</MenuItem>
                          <MenuItem value="code">{ui.code.toLowerCase()}</MenuItem>
                        </Select>
                      </FormControl>

                      <FormControl size="small">
                        <InputLabel id="shell-diagnostic-page-size-label">{ui.rowsPerPage}</InputLabel>
                        <Select
                          labelId="shell-diagnostic-page-size-label"
                          label={ui.rowsPerPage}
                          value={String(diagnosticPageSize)}
                          onChange={(event) => {
                            setDiagnosticPageSize(Number.parseInt(event.target.value, 10));
                            setDiagnosticPage(1);
                          }}
                        >
                          <MenuItem value="10">10</MenuItem>
                          <MenuItem value="25">25</MenuItem>
                          <MenuItem value="50">50</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>

                    <Typography variant="body2" color="text.secondary">
                      {ui.showing} {details.diagnostics?.items?.length ?? 0} {ui.of} {details.diagnostics?.total ?? 0} {ui.diagnostics}
                    </Typography>

                    {details?.diagnostics?.items?.length > 0 ? (
                      <>
                        <TableContainer>
                          <Table size="small" aria-label={ui.rowDiagnostics}>
                            <TableHead>
                              <TableRow>
                                <TableCell>
                                  <Button size="small" onClick={() => onDiagnosticSortChange("type")}>
                                    {ui.type} {diagnosticSort === "type" ? `(${diagnosticSortDirection})` : ""}
                                  </Button>
                                </TableCell>
                                <TableCell>
                                  <Button size="small" onClick={() => onDiagnosticSortChange("row")}>
                                    {ui.customerId} {diagnosticSort === "row" ? `(${diagnosticSortDirection})` : ""}
                                  </Button>
                                </TableCell>
                                <TableCell>{ui.name}</TableCell>
                                <TableCell>{ui.field}</TableCell>
                                <TableCell>
                                  <Button size="small" onClick={() => onDiagnosticSortChange("code")}>
                                    {ui.code} {diagnosticSort === "code" ? `(${diagnosticSortDirection})` : ""}
                                  </Button>
                                </TableCell>
                                <TableCell>{ui.message}</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {details.diagnostics.items.map((entry) => (
                                <TableRow key={`${entry.type}-${entry.row}-${entry.field}-${entry.code}-${entry.message}`} hover>
                                  <TableCell>
                                    <Chip
                                      size="small"
                                      label={toDiagnosticTypeLabel(entry.type, language)}
                                      color={entry.type === "error" ? "error" : "warning"}
                                      variant="outlined"
                                    />
                                  </TableCell>
                                  <TableCell>{entry.customerId ?? `ROW-${entry.row}`}</TableCell>
                                  <TableCell>{entry.customerName ?? entry.customerId ?? `ROW-${entry.row}`}</TableCell>
                                  <TableCell>{entry.field}</TableCell>
                                  <TableCell>{entry.code}</TableCell>
                                  <TableCell>{toDiagnosticMessageLabel(entry.message, entry.code, language)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>

                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1, flexWrap: "wrap" }} aria-label="Diagnostics pagination">
                          <Typography variant="body2" color="text.secondary">
                            {ui.page} {details.diagnostics.page} {ui.of} {details.diagnostics.totalPages}
                          </Typography>
                          <Stack direction="row" spacing={1}>
                            <Button
                              type="button"
                              onClick={() => setDiagnosticPage((current) => Math.max(1, current - 1))}
                              disabled={details.diagnostics.page <= 1}
                              size="small"
                              variant="outlined"
                            >
                              {ui.previous}
                            </Button>
                            <Button
                              type="button"
                              onClick={() => setDiagnosticPage((current) => Math.min(details.diagnostics.totalPages, current + 1))}
                              disabled={details.diagnostics.page >= details.diagnostics.totalPages}
                              size="small"
                              variant="outlined"
                            >
                              {ui.next}
                            </Button>
                          </Stack>
                        </Box>
                      </>
                    ) : (
                      <Alert severity="info">{ui.noDiagnosticsMatch}</Alert>
                    )}
                  </Stack>
                </Paper>
              ) : (
                <>
                  <div className="diagnostics-header">
                    <h3>Row diagnostics</h3>
                    <div className="quick-filters" role="group" aria-label="Quick diagnostics filters">
                      <button
                        type="button"
                        className="quick-filter-chip"
                        aria-pressed={diagnosticFilter === "all"}
                        onClick={() => setDiagnosticFilter("all")}
                      >
                        All ({diagnosticCounts.all})
                      </button>
                      <button
                        type="button"
                        className="quick-filter-chip"
                        aria-pressed={diagnosticFilter === "errors"}
                        onClick={() => setDiagnosticFilter("errors")}
                      >
                        Errors ({diagnosticCounts.errors})
                      </button>
                      <button
                        type="button"
                        className="quick-filter-chip"
                        aria-pressed={diagnosticFilter === "warnings"}
                        onClick={() => setDiagnosticFilter("warnings")}
                      >
                        Warnings ({diagnosticCounts.warnings})
                      </button>
                    </div>
                    <label htmlFor="diagnostic-filter">Diagnostic filter</label>
                    <select
                      id="diagnostic-filter"
                      value={diagnosticFilter}
                      onChange={(event) => setDiagnosticFilter(event.target.value as DiagnosticFilter)}
                    >
                      <option value="all">all</option>
                      <option value="errors">errors</option>
                      <option value="warnings">warnings</option>
                    </select>
                    <label htmlFor="diagnostic-query">Search diagnostics</label>
                    <input
                      id="diagnostic-query"
                      type="text"
                      value={diagnosticQuery}
                      onChange={(event) => setDiagnosticQuery(event.target.value)}
                      placeholder="Search by customer, field, code, or message"
                    />
                    <label htmlFor="diagnostic-sort">Diagnostic sort</label>
                    <select
                      id="diagnostic-sort"
                      value={diagnosticSort}
                      onChange={(event) => {
                        setDiagnosticSort(event.target.value as DiagnosticSort);
                        setDiagnosticSortDirection("asc");
                      }}
                    >
                      <option value="row">customerId</option>
                      <option value="type">type</option>
                      <option value="code">code</option>
                    </select>
                    <label htmlFor="diagnostic-page-size">Rows per page</label>
                    <select
                      id="diagnostic-page-size"
                      value={String(diagnosticPageSize)}
                      onChange={(event) => setDiagnosticPageSize(Number.parseInt(event.target.value, 10))}
                    >
                      <option value="10">10</option>
                      <option value="25">25</option>
                      <option value="50">50</option>
                    </select>
                    <p className="diagnostics-meta">
                      Showing {details.diagnostics?.items?.length ?? 0} of {details.diagnostics?.total ?? 0} diagnostics
                    </p>
                  </div>

                  {details?.diagnostics?.items?.length > 0 ? (
                    <div className="diagnostics-table-wrap">
                      <table className="diagnostics-table">
                        <thead>
                          <tr>
                            <th scope="col" aria-sort={diagnosticSort === "type" ? (diagnosticSortDirection === "asc" ? "ascending" : "descending") : "none"}>
                              <button type="button" className="sort-toggle" onClick={() => onDiagnosticSortChange("type")}>
                                Type
                              </button>
                            </th>
                            <th scope="col" aria-sort={diagnosticSort === "row" ? (diagnosticSortDirection === "asc" ? "ascending" : "descending") : "none"}>
                              <button type="button" className="sort-toggle" onClick={() => onDiagnosticSortChange("row")}>
                                Customer ID
                              </button>
                            </th>
                            <th scope="col">Name</th>
                            <th scope="col">Field</th>
                            <th scope="col" aria-sort={diagnosticSort === "code" ? (diagnosticSortDirection === "asc" ? "ascending" : "descending") : "none"}>
                              <button type="button" className="sort-toggle" onClick={() => onDiagnosticSortChange("code")}>
                                Code
                              </button>
                            </th>
                            <th scope="col">Message</th>
                          </tr>
                        </thead>
                        <tbody>
                          {details.diagnostics.items.map((entry) => (
                            <tr key={`${entry.type}-${entry.row}-${entry.field}-${entry.code}-${entry.message}`}>
                              <td>{toDiagnosticTypeLabel(entry.type, language)}</td>
                              <td>{entry.customerId ?? `ROW-${entry.row}`}</td>
                              <td>{entry.customerName ?? entry.customerId ?? `ROW-${entry.row}`}</td>
                              <td>{entry.field}</td>
                              <td>{entry.code}</td>
                              <td>{toDiagnosticMessageLabel(entry.message, entry.code, language)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="pagination-controls" aria-label="Diagnostics pagination">
                        <p className="pagination-meta">
                          Page {details.diagnostics.page} of {details.diagnostics.totalPages}
                        </p>
                        <div className="pagination-buttons">
                          <button
                            type="button"
                            onClick={() => setDiagnosticPage((current) => Math.max(1, current - 1))}
                            disabled={details.diagnostics.page <= 1}
                          >
                            Previous
                          </button>
                          <button
                            type="button"
                            onClick={() => setDiagnosticPage((current) => Math.min(details.diagnostics.totalPages, current + 1))}
                            disabled={details.diagnostics.page >= details.diagnostics.totalPages}
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="diagnostics-empty">{ui.noDiagnosticsMatch}</p>
                  )}
                </>
              )}
            </div>

            {details.override ? (
              <>
                <p>{ui.overrideDecision}: {details.override.decision}</p>
                <p>{ui.overrideReason}: {details.override.reason}</p>
                <p>{ui.overriddenBy}: {details.override.overriddenBy}</p>
                <p>{ui.overriddenAt}: {new Date(details.override.overriddenAt).toLocaleString()}</p>
              </>
            ) : (
              <p>{ui.noOverride}</p>
            )}
          </section>
        ) : null}

        {!useShell ? <p className={statusClassName}>{message}</p> : null}
      </section>
    )}
  </>
  );

  const shellRoleLabel = language === "am-ET"
    ? ({
        loan_officer: "የብድር ባለሙያ",
        credit_manager: "የክሬዲት አስተዳዳሪ",
        risk_analyst: "የአደጋ ተንታኝ",
        auditor: "ኦዲተር",
        admin: "አስተዳዳሪ"
      } as const)[role]
    : role
      .split("_")
      .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
      .join(" ");
  const shellTotalRows = details?.summary.totalRows ?? 0;
  const shellErrorRows = details?.summary.errorRows ?? 0;
  const shellRisk = details ? toRiskLabel(details.recommendation.riskCategory, language) : "Pending";
  const shellStatusSeverity =
    state === "error" ? "error" : state === "success" ? "success" : state === "working" ? "warning" : "info";
  return (
    <AppShell
      environment="UAT"
      role={role}
      onRoleChange={(nextRole) => setRole(nextRole)}
      language={language}
      onLanguageChange={setLanguage}
      section={showAuditLog ? "audit" : "main"}
      onSectionChange={(next) => setShowAuditLog(next === "audit")}
    >
      <section className="shell-dashboard" aria-label="CreditIQ Dashboard">
        <header className="shell-header">
          <p className="shell-kicker">{i18n.shellKicker}</p>
          <h2>{showAuditLog ? i18n.auditTitle : i18n.dashboardTitle}</h2>
          <p>
            {i18n.activeRole}: <strong>{shellRoleLabel}</strong>
          </p>
        </header>

        <section className="shell-kpi-grid" aria-label="Portfolio metrics">
          <article className="shell-kpi-card">
            <p className="shell-kpi-label">{i18n.rowsProcessed}</p>
            <p className="shell-kpi-value">{shellTotalRows}</p>
          </article>
          <article className="shell-kpi-card">
            <p className="shell-kpi-label">{i18n.errorRows}</p>
            <p className="shell-kpi-value">{shellErrorRows}</p>
          </article>
          <article className="shell-kpi-card">
            <p className="shell-kpi-label">{i18n.riskBand}</p>
            <p className="shell-kpi-value">{shellRisk}</p>
          </article>
        </section>

        <section className="shell-stage">{pageContent}</section>

        {!showAuditLog ? (
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack spacing={2}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {i18n.uploadOps}
              </Typography>
              <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", sm: "2fr 1fr 1fr" } }}>
                <TextField
                  id="shell-upload-id"
                  label={i18n.uploadId}
                  value={uploadId}
                  onChange={(event) => {
                    setUploadId(event.target.value);
                    setHasDetailsRequested(false);
                  }}
                  placeholder={i18n.uploadIdPlaceholder}
                  size="small"
                />
                <Button variant="contained" onClick={validateUpload} disabled={state === "working"}>
                  {i18n.validateUpload}
                </Button>
                <Button variant="outlined" onClick={fetchUploadDetails} disabled={state === "working"}>
                  {i18n.fetchDetails}
                </Button>
              </Box>
              <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={downloadReport}
                  disabled={state === "working" || !uploadId.trim()}
                  sx={{ alignSelf: "center" }}
                >
                  {i18n.downloadReport}
                </Button>
                {(role === "credit_manager" || role === "admin") && (
                  <Box sx={{ display: "grid", gap: 1, width: { xs: "100%", md: "min(520px, 100%)" } }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      {i18n.manualOverride}
                    </Typography>
                    <FormControl size="small" fullWidth>
                      <InputLabel id="shell-override-decision-label">{i18n.decision}</InputLabel>
                      <Select
                        labelId="shell-override-decision-label"
                        id="shell-override-decision"
                        label={i18n.decision}
                        value={overrideDecision}
                        onChange={(event) => setOverrideDecision(event.target.value)}
                      >
                        <MenuItem value="proceed">proceed</MenuItem>
                        <MenuItem value="lower_loan">lower_loan</MenuItem>
                        <MenuItem value="manual_review">manual_review</MenuItem>
                        <MenuItem value="reject">reject</MenuItem>
                      </Select>
                    </FormControl>
                    <TextField
                      id="shell-override-reason"
                      label={i18n.reason}
                      value={overrideReason}
                      onChange={(event) => setOverrideReason(event.target.value)}
                      placeholder={i18n.reasonPlaceholder}
                      multiline
                      minRows={3}
                      size="small"
                      fullWidth
                    />
                    <Typography variant="caption" color={overrideReason.trim().length >= 10 ? "success.main" : "text.secondary"}>
                      {i18n.minChars}
                    </Typography>
                    <Button
                      variant="contained"
                      color="secondary"
                      onClick={submitOverride}
                      disabled={state === "working" || overrideReason.trim().length < 10}
                    >
                      Submit Override
                    </Button>
                  </Box>
                )}
              </Box>
              <Alert severity={shellStatusSeverity}>{message}</Alert>
            </Stack>
          </Paper>
        ) : null}
      </section>
    </AppShell>
  );
}
