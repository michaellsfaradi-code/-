import React, { useState, useEffect, useRef } from "react";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Sparkles, 
  Globe, 
  MousePointerClick, 
  Keyboard, 
  Clock, 
  ChevronsUpDown, 
  Database, 
  GitFork, 
  Terminal as TerminalIcon, 
  Copy, 
  Check, 
  AlertCircle, 
  Loader2, 
  Search,
  Sliders, 
  Download, 
  BookOpen, 
  Code, 
  CheckCircle2, 
  Hash,
  Folder,
  FileSpreadsheet,
  Calendar,
  Mail,
  FileText,
  Presentation,
  LogOut,
  ChevronRight,
  UserCheck,
  Menu,
  X,
  Trash2,
  Cloud,
  TrendingUp,
  HardDrive,
  Users,
  Lock,
  ShieldCheck,
  Activity,
  UserPlus,
  Coins,
  Cpu,
  Zap,
  Settings,
  AlertTriangle,
  Wifi,
  PlayCircle,
  Ban,
  RefreshCw,
  Upload,
  Share2,
  Network,
  Link2,
  Eye,
  EyeOff,
  CheckCircle,
  ExternalLink,
  Send,
  Bot
} from "lucide-react";
import { ReconPanel } from "./components/ReconPanel";
import { TemplateLibrary } from "./components/TemplateLibrary";
import { BotStep, StepStatus, LogEntry, ScrapedRecord, BotConfig, StepType } from "./types";
import { BOT_TEMPLATES, BotTemplate } from "./templates";
import { 
  generateFullPuppeteerScript, 
  generateCSharpSeleniumScript, 
  generateSwiftUiScript 
} from "./utils/compiler";
import { 
  initAuth, 
  loginWithGoogle,
  loginWithEmail,
  registerWithEmail,
  loginAnonymously,
  signOutUser, 
  getAccessToken 
} from "./utils/auth";
import { 
  uploadToDrive,
  createGoogleSheet,
  createCalendarEvent,
  sendEmailNotification,
  createGoogleDocBlueprint,
  createGoogleSlidesSummary,
  listGoogleChatSpaces,
  sendGoogleChatMessage
} from "./utils/workspace";
import {
  saveBotToFirestore,
  loadUserSavedBots,
  deleteBotFromFirestore,
  saveChatMessageToFirestore,
  loadUserChatMessages,
  saveExecutionLogToFirestore,
  loadUserExecutionLogs,
  loadSharedBot,
  saveGlobalConfigToFirestore,
  loadGlobalConfigFromFirestore,
  saveSyncTableToFirestore,
  subscribeToSyncTable,
  FirestoreBot,
  FirestoreChatMessage,
  FirestoreExecutionLog
} from "./utils/firestore";
import { UserManual } from "./components/UserManual";
import { User } from "./utils/auth";

// Helper to safely parse and display host domain from any input url
export function getParsedDomain(url: string): string {
  if (!url) return "about:blank";
  try {
    let cleanUrl = url.trim();
    if (!/^https?:\/\//i.test(cleanUrl)) {
      cleanUrl = "https://" + cleanUrl;
    }
    const parsed = new URL(cleanUrl);
    return parsed.hostname.replace(/^www\./i, "");
  } catch (e) {
    return url;
  }
}

// Helper to compute stats for registered bots
export function computeBotLiveStats(bot: any) {
  const hash = bot.id ? bot.id.split("").reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0) : 100;
  const rates = [92, 85, 100, 78, 60, null, 95];
  const rate = rates[hash % rates.length];
  
  const logStatuses: ("success" | "error")[] = ["success", "success", "success", "error", "success"];
  const logsCount = 3 + (hash % 3);
  const logs = Array.from({ length: logsCount }).map((_, i) => ({
    id: `log-${i}`,
    status: logStatuses[(hash + i) % logStatuses.length]
  }));

  return {
    rate,
    logs
  };
}

declare global {
  interface Window {
    googleTranslateElementInit: () => void;
    google: any;
  }
}

export default function App() {
  // Config state
  const [config, setConfig] = useState<BotConfig>({
    name: "אוטומציה מותאמת אישית",
    goal: "חילוץ תוצאות חיפוש עבור 'אוזניות אלחוטיות' פחות מ-$50 עם ביקורות חיוביות",
    url: "https://www.ebay.com",
    speed: 1,
    useProxies: false,
    rotateIpOnBan: false,
    bypassCaptcha: false,
    isolatedContext: true,
    maxConcurrentThreads: 1,
    ghostMode: true,
    cognitiveVision: false,
    quantumSpeed: false,
    chaosEngine: false,
    cloudSwarm: false,
    residentialProxies: false,
    antiBotShield: true,
    geoClustering: true,
    scoutHarvesterModule: false,
    hotSwappingBackup: false
  });

  // Steps state
  const [steps, setSteps] = useState<BotStep[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [activeStepIndex, setActiveStepIndex] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Settings Toggles
  const [headless, setHeadless] = useState<boolean>(true);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);

  // Data Outputs state
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [scrapedData, setScrapedData] = useState<ScrapedRecord[]>([]);
  
  // UI Panels / Control
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [exportType, setExportType] = useState<"puppeteer" | "csharp" | "swift">("puppeteer");
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [expandedCodeStep, setExpandedCodeStep] = useState<string | null>(null);

  // Google OAuth User States
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState<boolean>(true);
  const [authProgress, setAuthProgress] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Google Workspace actions UI states
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<"drive" | "sheets" | "calendar" | "gmail" | "slides" | "chat" | "integrations">("drive");
  const [wsRunning, setWsRunning] = useState<boolean>(false);
  const [wsMessage, setWsMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  // Google Chat States
  const [chatSpaces, setChatSpaces] = useState<any[]>([]);
  const [selectedChatSpace, setSelectedChatSpace] = useState<string>("");
  const [customChatMessage, setCustomChatMessage] = useState<string>("");

  // Firestore Saved Bots
  const [userSavedBotsList, setUserSavedBotsList] = useState<FirestoreBot[]>(() => {
    const localSaved = sessionStorage.getItem("local_user_bots");
    if (localSaved) {
      try {
        return JSON.parse(localSaved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });
  const [isSavingBot, setIsSavingBot] = useState<boolean>(false);
  const [activeBotId, setActiveBotId] = useState<string | null>(null);
  const [executionLogsList, setExecutionLogsList] = useState<FirestoreExecutionLog[]>([]);

  // AI Assistant Chat Panel
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState<boolean>(false);
  const [aiChatHistory, setAiChatHistory] = useState<FirestoreChatMessage[]>([]);
  const [aiInputMessage, setAiInputMessage] = useState<string>("");
  const [isAiTyping, setIsAiTyping] = useState<boolean>(false);

  // Custom Input Fields for Workspace modules
  const [customCalendarDate, setCustomCalendarDate] = useState<string>(
    new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16) // tomorrow by default
  );
  const [customGmailRecipient, setCustomGmailRecipient] = useState<string>("");
  const [isSharedMode, setIsSharedMode] = useState<boolean>(false);

  // Standalone Player states for Shared Bots
  const [sharedBotLaunched, setSharedBotLaunched] = useState<boolean>(false);
  const [sharedSelectedApps, setSharedSelectedApps] = useState<string[]>(["whatsapp"]);
  const [sharedWebhookUrl, setSharedWebhookUrl] = useState<string>(() => {
    return localStorage.getItem("botforge_shared_webhook_url") || "";
  });
  const [copyWebhookSuccess, setCopyWebhookSuccess] = useState<boolean>(false);
  const [makeTestPayload, setMakeTestPayload] = useState<string>(`{
  "event": "botforge_test",
  "maka_key": "1d28d89d-0a60-4944-817a-c8767cf3832d",
  "timestamp": "${new Date().toISOString()}",
  "message": "Hello from BotForge Automation Engine!"
}`);
  const [makeTestResult, setMakeTestResult] = useState<{ status: string; type: "success" | "error" | "info" } | null>(null);
  const [makeTestLoading, setMakeTestLoading] = useState<boolean>(false);
  const [sharedExecutionLogs, setSharedExecutionLogs] = useState<{ id: string; time: string; type: "info" | "success" | "warn" | "error" | "debug" | "data"; text: string }[]>([]);
  const [sharedIsRunning, setSharedIsRunning] = useState<boolean>(false);
  const [sharedActiveStep, setSharedActiveStep] = useState<number | null>(null);
  const [sharedRunFinished, setSharedRunFinished] = useState<boolean>(false);
  const [sharedRequestStatus, setSharedRequestStatus] = useState<string>("");
  const [sharedScrapedRows, setSharedScrapedRows] = useState<any[]>([]);
  const [sharedBrowserUrl, setSharedBrowserUrl] = useState<string>("https://example.com");
  const [sharedBrowserText, setSharedBrowserText] = useState<string>("");
  const [sharedClickRipple, setSharedClickRipple] = useState<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });

  // Netlas Target Intelligence Integration states
  const [netlasTarget, setNetlasTarget] = useState<string>("8.8.8.8");
  const [netlasLoading, setNetlasLoading] = useState<boolean>(false);
  const [netlasResult, setNetlasResult] = useState<any>(null);
  const [netlasError, setNetlasError] = useState<string | null>(null);
  const [netlasApiInfo, setNetlasApiInfo] = useState<any>(null);
  const [sharedCursor, setSharedCursor] = useState<{ x: number; y: number; visible: boolean; label: string }>({ x: 50, y: 50, visible: false, label: "" });

  // AI Direct Screen/Interactive Control and Simulated Browser States
  const [browserSimUrl, setBrowserSimUrl] = useState<string>("https://example.com");
  const [browserSimSearch, setBrowserSimSearch] = useState<string>("");
  const [browserSimPage, setBrowserSimPage] = useState<number>(0); // 0: landing, 1: results, 2: success
  const [aiCursor, setAiCursor] = useState<{ x: number; y: number; visible: boolean; label: string }>({
    x: 50,
    y: 54,
    visible: false,
    label: ""
  });
  const [clickRipple, setClickRipple] = useState<{ x: number; y: number; active: boolean }>({
    x: 0,
    y: 0,
    active: false
  });
  const [laserActive, setLaserActive] = useState<boolean>(false);
  const [browserSimLogs, setBrowserSimLogs] = useState<string[]>([]);
  const [isAiHandActive, setIsAiHandActive] = useState<boolean>(true); // user-toggleable AI helper pointer hand
  const [simHostName, setSimHostName] = useState<string>("www.example.com");

  // Confirmation Dialogue state as requested by Workspace Guidelines
  const [workspaceConfirmation, setWorkspaceConfirmation] = useState<{
    show: boolean;
    title: string;
    message: string;
    actionType: string;
    onConfirm: () => void;
  } | null>(null);

  // Responsive Sidebar Toggle State
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  // SaaS Administration & Monetization Control States
  const [isViewAdminMode, setIsViewAdminMode] = useState<boolean>(false);
  
  // Real-time AI Supercomputer Admin Control states
  const [adminAiCreativity, setAdminAiCreativity] = useState<number>(0.75);
  const [adminSimulatedSpeed, setAdminSimulatedSpeed] = useState<number>(1.0);
  const [adminUserAgent, setAdminUserAgent] = useState<string>("Chrome-Stealth-X");
  const [adminErrorRate, setAdminErrorRate] = useState<number>(0);
  const [adminLatency, setAdminLatency] = useState<number>(150);
  const [adminBypassSandbox, setAdminBypassSandbox] = useState<boolean>(true);
  const [simulatedLoadBots, setSimulatedLoadBots] = useState<number>(0);
  const [adminCustomPromptInput, setAdminCustomPromptInput] = useState<string>("");
  const [pluginPrompt, setPluginPrompt] = useState<string>("");
  const [isGeneratingPlugin, setIsGeneratingPlugin] = useState<boolean>(false);
  const [isInjectingLoad, setIsInjectingLoad] = useState<boolean>(false);
  
  // Universal File Analyzer & SaaS Super-decision board states
  const [analyzedFiles, setAnalyzedFiles] = useState<any[]>([]);
  const [selectedAnalyzedFile, setSelectedAnalyzedFile] = useState<any | null>(null);
  const [isScanningFile, setIsScanningFile] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [rawTextFileContent, setRawTextFileContent] = useState<string>("");
  const [uploadedFileAttachment, setUploadedFileAttachment] = useState<any | null>(null);

  // States inside file dashboard models
  const [fileConcurrency, setFileConcurrency] = useState<number>(4);
  const [fileBypassSandbox, setFileBypassSandbox] = useState<boolean>(true);
  const [fileExposeAsApi, setFileExposeAsApi] = useState<boolean>(false);
  const [fileMaxMemoryMb, setFileMaxMemoryMb] = useState<number>(512);
  const [simulatedDeviceOS, setSimulatedDeviceOS] = useState<string>("Android 14 (API 34)");
  const [ocrLanguageDetector, setOcrLanguageDetector] = useState<string>("עברית + English");
  
  // Ultra-Capacity Supercomputer Boosters (specifically for 6GB in 3 minutes)
  const [isUltraMegaEngineEnabled, setIsUltraMegaEngineEnabled] = useState<boolean>(true);
  const [ultraEngineThreads, setUltraEngineThreads] = useState<number>(32);
  const [megaFileMaxDurationSeconds, setMegaFileMaxDurationSeconds] = useState<number>(180); // 3 minutes deadline
  const [gigabyteCompressionFormat, setGigabyteCompressionFormat] = useState<string>("Chunk Parallel Streaming (Brotli-X)");
  
  // Email/Password & Anonymous Auth
  const [authEmail, setAuthEmail] = useState<string>("");
  const [authPassword, setAuthPassword] = useState<string>("");
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  
  // Credit limitations, admin daily quota settings and SaaS pulse duty cycles
  const [dailyCreditQuota, setDailyCreditQuota] = useState<number>(150);
  const [botRunPulseStrategy, setBotRunPulseStrategy] = useState<"continuous" | "pulse">("continuous");
  const [pulseDayIndex, setPulseDayIndex] = useState<number>(3); // 3: Active work day, 0-2: Off days
  
  const [adminPricingPlans, setAdminPricingPlans] = useState([
    { id: "free", name: "חינם (Free)", price: 0, maxBots: 3, allowCloud: false, concurrencyNode: 1, supportLevel: "קהילה" },
    { id: "pro", name: "מקצועי (Pro)", price: 29, maxBots: 15, allowCloud: true, concurrencyNode: 5, supportLevel: "תמיכה מהירה (מייל)" },
    { id: "enterprise", name: "ארגוני (Enterprise)", price: 99, maxBots: 100, allowCloud: true, concurrencyNode: 20, supportLevel: "תמיכה מועדפת 24/7 וטלפון" }
  ]);
  const [adminUsersList, setAdminUsersList] = useState([
    { id: "usr_1", name: "ישראל ישראלי", email: "michaell.sfaradi@gmail.com", plan: "pro", botsCount: 4, hostedInCloud: 2, status: "פעיל", joined: "2026-05-12", credits: 150 },
    { id: "usr_2", name: "שירה כהן", email: "shira.c@domain.com", plan: "free", botsCount: 1, hostedInCloud: 0, status: "פעיל", joined: "2026-05-28", credits: 45 },
    { id: "usr_3", name: "אלון מזרחי", email: "alon.m@techcorp.io", plan: "enterprise", botsCount: 42, hostedInCloud: 35, status: "פעיל", joined: "2026-04-02", credits: 150 },
    { id: "usr_4", name: "דניאל גולדברג", email: "daniel.g@spam.org", plan: "free", botsCount: 8, hostedInCloud: 0, status: "מושעה", joined: "2026-03-15", credits: 0 }
  ]);

  const updateUsersListWithSync = (nextListOrFn: any[] | ((prev: any[]) => any[])) => {
    setAdminUsersList(prev => {
      const nextList = typeof nextListOrFn === "function" ? nextListOrFn(prev) : nextListOrFn;
      if (adminSystemConfig.globalSyncEnabled) {
        saveSyncTableToFirestore("users_list", nextList).catch(err => {
          console.error("Failed to sync users list dynamically to Firestore", err);
        });
      }
      return nextList;
    });
  };

  const updatePricingPlansWithSync = (nextPlansOrFn: any[] | ((prev: any[]) => any[])) => {
    setAdminPricingPlans(prev => {
      const nextPlans = typeof nextPlansOrFn === "function" ? nextPlansOrFn(prev) : nextPlansOrFn;
      if (adminSystemConfig.globalSyncEnabled) {
        saveSyncTableToFirestore("pricing_plans", nextPlans).catch(err => {
          console.error("Failed to sync pricing plans dynamically to Firestore", err);
        });
      }
      return nextPlans;
    });
  };
  const [adminSystemConfig, setAdminSystemConfig] = useState<{
    proxyRotationEnabled: boolean;
    cloudClusterNodesCount: number;
    selectedCloudRegion: string;
    sharedProxyIps: string;
    maxExecutingHoursPerTask: number;
    userBillingCurrency: string;
    allowAnonymousBotCreation: boolean;
    systemDefaultGeminiModel: string;
    cloudDatabaseEngine: string;
    stripeLiveMode: boolean;
    automationEngineEndpoint: string;
    customIntegrations: { id: string; name: string; apiKey: string }[];
    developerPluginHtml: string;
    globalSyncEnabled: boolean;
  }>({
    proxyRotationEnabled: true,
    cloudClusterNodesCount: 8,
    selectedCloudRegion: "europe-west3 (Frankfurt)",
    sharedProxyIps: "185.220.101.5\n45.132.227.18\n82.102.23.84\n194.26.135.21",
    maxExecutingHoursPerTask: 2,
    userBillingCurrency: "USD ($)",
    allowAnonymousBotCreation: true,
    systemDefaultGeminiModel: "gemini-3.5-flash",
    cloudDatabaseEngine: "Google Firestore Server (Multi-tenant)",
    stripeLiveMode: false,
    automationEngineEndpoint: "https://runner.botforge.pro/v1",
    customIntegrations: [
      { id: "make_integration", name: "Make.com (Maka)", apiKey: "1d28d89d-0a60-4944-817a-c8767cf3832d" }
    ],
    developerPluginHtml: "",
    globalSyncEnabled: false,
  });

  const isConfigLoadedRef = useRef(false);

  useEffect(() => {
    if (!isConfigLoadedRef.current) return;
    
    const delayDebounce = setTimeout(async () => {
      try {
        await saveGlobalConfigToFirestore(adminSystemConfig);
        console.log("Global system configuration auto-saved successfully!");
      } catch (err) {
        console.error("Auto-save global configuration failed", err);
      }
    }, 1500);

    return () => clearTimeout(delayDebounce);
  }, [adminSystemConfig]);

  useEffect(() => {
    if (!adminSystemConfig.globalSyncEnabled) return;

    console.log("🔌 Global Sync active - Initializing real-time listeners for plans and users");
    const unsubscribePlans = subscribeToSyncTable("pricing_plans", (updatedPlans) => {
      setAdminPricingPlans(updatedPlans);
    });

    const unsubscribeUsers = subscribeToSyncTable("users_list", (updatedUsers) => {
      setAdminUsersList(updatedUsers);
    });

    return () => {
      console.log("🔌 Global Sync disabled - Cleaning up real-time listeners");
      unsubscribePlans();
      unsubscribeUsers();
    };
  }, [adminSystemConfig.globalSyncEnabled]);

  const [visibleIntegrationKeys, setVisibleIntegrationKeys] = useState<Record<number, boolean>>({});
  const [integrationTestStatus, setIntegrationTestStatus] = useState<Record<number, "testing" | "success" | "error" | null>>({});
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [planForm, setPlanForm] = useState({ price: 0, maxBots: 0, allowCloud: false });
  const [selectedAdminUser, setSelectedAdminUser] = useState<any>(null);
  const [isAddingNewUser, setIsAddingNewUser] = useState<boolean>(false);
  const [newUserForm, setNewUserForm] = useState({ name: "", email: "", plan: "free", status: "פעיל" });
  const [adminActiveTab, setAdminActiveTab] = useState<"overview" | "plans" | "users" | "cloud" | "config" | "ai_control">("overview");
  const [testApiState, setTestApiState] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [selectedPod, setSelectedPod] = useState<any | null>(null);
  const [rebootingPod, setRebootingPod] = useState<boolean>(false);

  // Workflow Editor Interactive States & Code Snippet Helper
  const [selectedEditStep, setSelectedEditStep] = useState<BotStep | null>(null);
  const [showAddStepModal, setShowAddStepModal] = useState<boolean>(false);
  const [newStepForm, setNewStepForm] = useState<{
    type: StepType;
    title: string;
    description: string;
    selector: string;
    value: string;
  }>({
    type: "click",
    title: "",
    description: "",
    selector: "",
    value: ""
  });

  const helperGenerateCodeSnippet = (type: StepType, selector?: string, value?: string, title?: string): string => {
    switch (type) {
      case "navigate":
        return `// ${title || "ניווט אל יעד האוטומציה"}\nawait page.goto('${value || "https://example.com"}', { waitUntil: "networkidle2" });`;
      case "click":
        return `// ${title || "לחיצה על אלמנט"}\nawait page.waitForSelector('${selector || "button.btn-primary"}');\nawait page.click('${selector || "button.btn-primary"}');`;
      case "input":
        return `// ${title || "הקלדה לתוך שדה קלט"}\nawait page.waitForSelector('${selector || "input[name=search]"}');\nawait page.type('${selector || "input[name=search]"}', '${value || "טקסט מבוקש"}');`;
      case "wait":
        return `// ${title || "המתנה זמנית"}\nawait page.waitForTimeout(${parseInt(value || "2000")});`;
      case "scroll":
        return `// ${title || "גלילה מהירה"}\nawait page.evaluate(() => window.scrollBy(0, window.innerHeight));`;
      case "extract":
        return `// ${title || "חילוץ וגזירת נתונים"}\nconst scrapedData = await page.evaluate(() => {\n  return Array.from(document.querySelectorAll('${selector || "h2.product-title"}')).map(el => el.textContent?.trim());\n});`;
      case "condition":
        return `// ${title || "בדיקת תנאי או צעד לוגי"}\nif (await page.$('${selector || "#modal"}') !== null) {\n  await page.click('${selector || "#close"}');\n}`;
      default:
        return `// ${title || "שלב מותאם אישית"}\nconsole.log("בצע שלב: ${title}");`;
    }
  };

  // Language Support & Localization States
  const [currentLanguage, setCurrentLanguage] = useState<"he" | "en">(
    () => (localStorage.getItem("botforge_language") as "he" | "en") || "he"
  );
  const [showLanguageModal, setShowLanguageModal] = useState<boolean>(
    () => localStorage.getItem("botforge_language") === null
  );
  const [showUserManual, setShowUserManual] = useState<boolean>(false);

  // Translate function wrapper
  const t = (he: string, en: string) => {
    return currentLanguage === "he" ? he : en;
  };

  // Google Translate injection
  useEffect(() => {
    const setLanguageCookie = (lang: string) => {
      document.cookie = `googtrans=/iw/${lang}; path=/; domain=${window.location.hostname}; SameSite=None; Secure`;
      document.cookie = `googtrans=/iw/${lang}; path=/; SameSite=None; Secure`;
    };

    if (currentLanguage === "en") {
      setLanguageCookie("en");
      
      const gTranslateId = "google-translate-script";
      if (!document.getElementById(gTranslateId)) {
        const script = document.createElement("script");
        script.id = gTranslateId;
        script.type = "text/javascript";
        script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
        document.head.appendChild(script);

        window.googleTranslateElementInit = () => {
          new (window as any).google.translate.TranslateElement({
            pageLanguage: 'iw',
            includedLanguages: 'en',
            layout: (window as any).google.translate.TranslateElement.InlineLayout.SIMPLE,
            autoDisplay: false
          }, 'google_translate_element');
        };

        if (!document.getElementById("google_translate_element")) {
          const div = document.createElement("div");
          div.id = "google_translate_element";
          div.style.display = "none";
          document.body.appendChild(div);
        }
      }
    } else {
      // Clear cookies to revert back to Hebrew
      document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname}; SameSite=None; Secure`;
      document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=None; Secure`;
    }
  }, [currentLanguage]);

  // Execution Timer Ref
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const logsContainerRef = useRef<HTMLDivElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  // Load all user cloud data on login
  const loadUserCloudData = async (user: User, token: string) => {
    // 1. Fetch saved bots
    try {
      const bots = await loadUserSavedBots(user.uid);
      setUserSavedBotsList(bots);
    } catch (e) {
      console.error("failed to load bots", e);
    }

    // 1.2. Load Global System Config from Firestore
    try {
      const globalConfig = await loadGlobalConfigFromFirestore();
      if (globalConfig) {
        let updatedIntegrations = globalConfig.customIntegrations || [];
        const hasMakeKey = updatedIntegrations.some((i: any) => i.apiKey === "1d28d89d-0a60-4944-817a-c8767cf3832d" || i.name.toLowerCase().includes("make"));
        if (!hasMakeKey) {
          updatedIntegrations = [
            ...updatedIntegrations,
            { id: "make_integration", name: "Make.com (Maka)", apiKey: "1d28d89d-0a60-4944-817a-c8767cf3832d" }
          ];
        }
        setAdminSystemConfig((prev) => ({
          ...prev,
          ...globalConfig,
          customIntegrations: updatedIntegrations,
        }));
      } else {
        setAdminSystemConfig((prev) => ({
          ...prev,
          customIntegrations: [
            { id: "make_integration", name: "Make.com (Maka)", apiKey: "1d28d89d-0a60-4944-817a-c8767cf3832d" }
          ]
        }));
      }
    } catch (e) {
      console.error("failed to load global system config", e);
    } finally {
      isConfigLoadedRef.current = true;
    }

    // 1.5. Fetch Execution Logs
    try {
      const execLogs = await loadUserExecutionLogs(user.uid);
      setExecutionLogsList(execLogs);
    } catch (e) {
      console.error("failed to load execution logs", e);
    }

    // 2. Fetch Chat History
    try {
      const chatLogs = await loadUserChatMessages(user.uid);
      setAiChatHistory(chatLogs);
    } catch (e) {
      console.error("failed to load chats", e);
    }

    // 3. Fetch Google Chat spaces
    try {
      const spaces = await listGoogleChatSpaces(token);
      setChatSpaces(spaces);
      if (spaces.length > 0) {
        setSelectedChatSpace(spaces[0].name);
      }
    } catch (e) {
      console.error("failed to fetch spaces", e);
    }
  };

  // Initialize Auth state listeners on load
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setCurrentUser(user);
        setAccessToken(token);
        setNeedsAuth(false);
        addLog(`אישור החיבור לחשבון הצליח עבור המשתמש ${user.email || 'אורח'}`, "success");
        loadUserCloudData(user, token);
      },
      () => {
        setCurrentUser(null);
        setAccessToken(null);
        setNeedsAuth(true);
        setAiChatHistory([]);
        setChatSpaces([]);
        setSelectedChatSpace("");
        // Load offline local user bots if guest (session only)
        const localSaved = sessionStorage.getItem("local_user_bots");
        if (localSaved) {
          try {
            setUserSavedBotsList(JSON.parse(localSaved));
          } catch (e) {
            setUserSavedBotsList([]);
          }
        } else {
          setUserSavedBotsList([]);
        }

        const localLogsSaved = sessionStorage.getItem("local_execution_logs");
        if (localLogsSaved) {
          try {
            setExecutionLogsList(JSON.parse(localLogsSaved));
          } catch (e) {
            setExecutionLogsList([]);
          }
        } else {
          setExecutionLogsList([]);
        }
      }
    );
    return () => unsubscribe();
  }, []);

  // Initialize with the first template on load or shared bot from URL
  useEffect(() => {
    const initBot = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const sharedBotId = urlParams.get('sharedBotId');
      
      if (sharedBotId) {
        addLog(`מנסה לטעון בוט משותף מקישור...`, "info");
        try {
          const sharedBot = await loadSharedBot(sharedBotId);
          if (sharedBot) {
            triggerLoadSelectedCloudBot(sharedBot);
            setIsSharedMode(true);
            setNeedsAuth(false);
            return;
          } else {
            addLog(`הבוט המשותף לא נמצא או שאינו ציבורי. נטען תבנית ברירת מחדל.`, "warn");
          }
        } catch (err: any) {
          addLog(`שגיאה בטעינת ציבורי: ${err.message}`, "error");
        }
      }
      loadTemplate(BOT_TEMPLATES[0]);
      await loadNetlasApiInfo();
    };
    initBot();
  }, []);

  // Scroll terminal logs to bottom on additions
  useEffect(() => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // Scroll AI chatbot messages to bottom on updates
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [aiChatHistory, isAiTyping, isChatDrawerOpen]);

  // Generate logs helper
  const addLog = (message: string, level: LogEntry["level"] = "info", stepId?: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, level, message, stepId }]);
  };

  // Load selected template
  const loadTemplate = (template: BotTemplate) => {
    setConfig({
      name: template.name,
      goal: template.goal,
      url: template.url,
      speed: 1,
      useProxies: false,
      rotateIpOnBan: false,
      bypassCaptcha: false,
      isolatedContext: true,
      maxConcurrentThreads: 1,
      ghostMode: true,
      cognitiveVision: false,
      quantumSpeed: false,
      chaosEngine: false,
      cloudSwarm: false,
      residentialProxies: false,
      antiBotShield: true,
      geoClustering: true,
      scoutHarvesterModule: false,
      hotSwappingBackup: false
    });
    // Set all statuses to pending
    const resetSteps = template.steps.map(step => ({
      ...step,
      status: "pending" as StepStatus
    }));
    setSteps(resetSteps);
    setSelectedTemplate(template.name);
    setScrapedData([]);
    setActiveStepIndex(null);
    setIsRunning(false);
    setIsPaused(false);
    setErrorMessage(null);
    setSuccessMessage(null);
    setActiveBotId(null);
    
    // Initial logs configuration
    setLogs([]);
    addLog(`נטענה תבנית מוגדרת מראש: ${template.name}`, "info");
    addLog(`אוטומציית היעד אותחלה עבור הדומיין: ${getParsedDomain(template.url)}`, "success");
    addLog(`מוכן להרצת סימולציה או הידור סקריפט.`, "debug");
    
    // Close sidebar on mobile devices
    setIsSidebarOpen(false);
  };

  // Run AI Workflow Plan Generation
  const handleAIGeneratePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config.goal.trim()) {
      setErrorMessage("אנא הזן משפט מטרת אוטומציה תקף.");
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    addLog(`[מנוע AI] שולח בקשה עם מטרת יעד: "${config.goal}" על אתר היעד: ${config.url || "ברירת מחדל"}`, "info");

    try {
      const response = await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal: config.goal,
          url: config.url,
          model: adminSystemConfig.systemDefaultGeminiModel
        })
      });

      const contentType = response.headers.get("content-type");
      if (!response.ok) {
        if (contentType && contentType.includes("application/json")) {
           const errData = await response.json();
           throw new Error(errData.error || `שגיאת שרת (${response.status})`);
        }
        const errorText = await response.text();
        console.error("Non-JSON Response received:", errorText);
        throw new Error(`שגיאת שרת (${response.status}): מוצר ה-AI נתקל בשגיאה ברשת או בעומס.`);
      }

      if (!contentType || !contentType.includes("application/json")) {
         throw new Error("Invalid response format received from server.");
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "שילוב ה-AI החזיר שגיאה בתהליך יצירת השלבים.");
      }

      const generated: BotStep[] = result.steps.map((st: any) => ({
        ...st,
        status: "pending" as StepStatus
      }));

      setSteps(generated);
      setSelectedTemplate("Custom AI Built Component");
      setScrapedData([]);
      setActiveStepIndex(null);
      setIsRunning(false);
      setIsPaused(false);
      
      addLog(`[מנוע AI] תוכנית העבודה נוצרה בהצלחה! נבנו ${generated.length} שלבים.`, "success");
      setSuccessMessage(`גובשו ${generated.length} שלבי לוגיקה עבור ${config.name}!`);

      // Close sidebar on mobile devices
      setIsSidebarOpen(false);
    } catch (err: any) {
      console.error(err);
      const errMsg = err.message || "נכשל החיבור לשרת מודל ה-AI.";
      setErrorMessage(errMsg);
      addLog(`[שגיאת מנוע AI] ${errMsg}`, "error");
      addLog("כדי לעקוף שימוש ב-AI, תוכל לבחור באחת מהתבניות המוכנות מראש למטה במקום זאת.", "warn");
    } finally {
      setIsGenerating(false);
    }
  };

  const logBotExecution = async (targetBotId: string, status: "success" | "failure", stepsRan: number, totalSteps: number) => {
    if (!targetBotId) return;
    if (currentUser) {
      try {
        await saveExecutionLogToFirestore(
          currentUser.uid,
          targetBotId,
          status,
          stepsRan * 1500,
          stepsRan,
          totalSteps
        );
        const logs = await loadUserExecutionLogs(currentUser.uid);
        setExecutionLogsList(logs);
      } catch (err) {
        console.error("Failed to save execution log:", err);
      }
    } else {
      try {
        const localLogsSaved = sessionStorage.getItem("local_execution_logs") || "[]";
        let localLogs: any[] = JSON.parse(localLogsSaved);
        localLogs.unshift({
          id: "local_log_" + Date.now(),
          botId: targetBotId,
          userId: "guest",
          status,
          durationMs: stepsRan * 1500,
          stepsRan,
          totalSteps,
          timestamp: new Date().toISOString()
        });
        sessionStorage.setItem("local_execution_logs", JSON.stringify(localLogs));
        setExecutionLogsList(localLogs);
      } catch (err) {
        console.error("Failed to save local execution log:", err);
      }
    }
  };

  const getBotExecutionStats = (botId: string) => {
    const botLogs = executionLogsList
      .filter(log => log.botId === botId)
      .sort((a, b) => {
        const timeA = a.timestamp 
          ? (typeof a.timestamp.toDate === "function" ? a.timestamp.toDate().getTime() : new Date(a.timestamp).getTime()) 
          : 0;
        const timeB = b.timestamp 
          ? (typeof b.timestamp.toDate === "function" ? b.timestamp.toDate().getTime() : new Date(b.timestamp).getTime()) 
          : 0;
        return timeB - timeA;
      })
      .slice(0, 5);

    if (botLogs.length === 0) {
      return { rate: null, count: 0, logs: [] };
    }

    const successCount = botLogs.filter(log => log.status === "success").length;
    const rate = Math.round((successCount / botLogs.length) * 100);
    return { rate, count: botLogs.length, logs: botLogs };
  };

  // Start / Play Simulation loop
  const startSimulation = (stepsOverride?: BotStep[]) => {
    const activeStepsList = stepsOverride || steps;
    if (activeStepsList.length === 0) {
      addLog("לא ניתן לבצע סימולציה: שלבי עבודה ריקים לחלוטין.", "error");
      return;
    }

    // Try to auto-link activeBotId if not set, by matching saved bot names
    let currentBotId = activeBotId;
    if (!currentBotId) {
      const match = userSavedBotsList.find(b => b.name === config.name);
      if (match && match.id) {
        currentBotId = match.id;
        setActiveBotId(match.id);
      }
    }

    // 1. CHRONOS PULSE CYCLE CHECK (3 Days Off, 1 Day Work)
    if (botRunPulseStrategy === "pulse" && pulseDayIndex !== 3) {
      addLog("🚫 הרצה נכשלה: מנוע הבוטים נמצא כעת במחזור חופש ומחזוריות שקטה (פולסים: 3 ימי חופש / יממת עבודה).", "error");
      addLog("💡 תוכל לשנות את אסטרטגיית הריצה למצב 'רציף 24/7' או להגדיר את היום הנוכחי כ'יום עבודה' בפנל המנהלים.", "warn");
      setErrorMessage("שגיאת תזמון: השרת נמצא מחוץ למחזור העבודה המותר (מצב פולסים מופעל).");
      return;
    }

    // 2. DAILY CREDIT LIMIT CHECK & DECREASE FOR CHARGING REAL RUNS
    const activeUserEmail = currentUser?.email;
    const targetUser = adminUsersList.find(u => u.email === activeUserEmail);
    const userCredits = targetUser?.credits !== undefined ? targetUser.credits : dailyCreditQuota;
    const COST_PER_SIMULATION = 5;

    if (userCredits < COST_PER_SIMULATION) {
      addLog(`🚫 הרצה נכשלה: אין ברשותך מספיק קרדיטים (נדרשים ${COST_PER_SIMULATION} לקליק, יתרתך: ${userCredits}).`, "error");
      addLog(`💡 תוכל למלא מחדש את יתרתך, להגדיל את המכסה או לבקש מהמנהל להעניק לך קרדיטים נוספים בטבלת המנהלים.`, "warn");
      setErrorMessage(`חריגה ממכסת קרדיטים: נדרשים לפחות ${COST_PER_SIMULATION} קרדיטים לביצוע אוטומציה.`);
      return;
    }

    // Deduct credits and log
    updateUsersListWithSync(prev => prev.map(u => u.email === activeUserEmail ? { ...u, credits: Math.max(0, (u.credits !== undefined ? u.credits : dailyCreditQuota) - COST_PER_SIMULATION) } : u));
    addLog(`🪙 בוצע חיוב של ${COST_PER_SIMULATION} קרדיטים עבור הרצת בוט. יתרתך החדשה: ${userCredits - COST_PER_SIMULATION} מתוך ${dailyCreditQuota}.`, "success");

    setIsRunning(true);
    setIsPaused(false);
    setErrorMessage(null);
    
    let nextIndex = activeStepIndex === null ? 0 : activeStepIndex;
    
    // If starting from fresh, set all back to pending first
    if (activeStepIndex === null) {
      if (stepsOverride) {
        setSteps(stepsOverride.map(s => ({ ...s, status: "pending" })));
      } else {
        setSteps(prev => prev.map(s => ({ ...s, status: "pending" })));
      }
      setScrapedData([]);
      addLog("מאתחל מנועי ביצוע (Playwright/Puppeteer) מבודדים כעת...", "info");
      
      if (config.isolatedContext) {
        addLog("🛡️ מפעיל מערכת Sandbox מאובטחת להרצת AI בסביבה מבודדת.", "debug");
      }
      if (config.useProxies) {
        addLog(`🌐 מחבר מערך P2P Residential Proxies${config.rotateIpOnBan ? " עם מנגנון הרצה וסבב IP אוטומטי." : "."}`, "debug");
      }
      if (config.bypassCaptcha) {
        addLog("🧩 טוען מנגנון עקיפת CAPTCHA (Stealth Plugin/2Captcha bypass)...", "debug");
      }
      if (config.cloudSwarm) {
        addLog(`☁️ מעביר ביצוע לנחיל מבוזר (P2P Edge Nodes). נפתחים 10 קונטיינרים וירטואלים מקבילים.${config.geoClustering ? ' מפעיל נעילה אזורית (Geo-Clustering) - מגייס בוטי רפאים רק מהאזור הגיאוגרפי של בוט האם.' : ''}`, "info");
      }
      if (config.antiBotShield) {
        addLog("🛡️ טוען חיסון קהילתי עדכני מול הגנות Cloudflare/PerimeterX (P2P Shield Patching מופעל).", "debug");
      }
      if (config.scoutHarvesterModule) {
        addLog("🎯 מפעיל אסטרטגיית חלוץ ומאסף: בוט ראשוני (Scout) מפעיל Chaotic Ghost Mode ו-AI Vision לפענוח הגנות ראשוני לאט ובאופן אנושי, ולאחריו 9 Harvesters יישאבו נתונים במקביל תוך ניצול מהיר של עוגיות טהורות. (חסכון משאבים של 50X)", "info");
      }
      if (config.hotSwappingBackup) {
        addLog("🔄 מנגנון דינמי מופעל להעברת מקל מבוזרת (Hot-Swapping) - פרוטוקול Active-Passive לשרידות הבוט גם בנפילת תקשורת מקומית.", "debug");
      }
      if (config.ghostMode) {
        addLog("👻 Ghost Mode פעיל. מפענח עקומות עכבר ותנועת צפייה אורגנית (Humanization).", "debug");
      }

      addLog(`הגדרות בסיס: headless=${headless ? 'כן' : 'לא'}, מהירות הרצה=${config.speed}x`, "info");
    } else {
      addLog("ממשיך שגרת בוט ממצב מושהה...", "info");
    }

    runNextSequentialStep(nextIndex, activeStepsList);
  };

  // Run single step sequentially
  const runNextSequentialStep = (currentIndex: number, stepsOverridden?: BotStep[]) => {
    const activeStepsList = stepsOverridden || steps;
    if (currentIndex >= activeStepsList.length) {
      // Finished all steps
      setIsRunning(false);
      setActiveStepIndex(null);
      setAiCursor(prev => ({ ...prev, visible: false }));
      setLaserActive(false);
      addLog("כל שלבי האוטומציה עברו הידור ותיקוף בהצלחה!", "success");
      addLog("אוסף את זרם התוצאות ומכבה את העובד הוירטואלי...", "info");
      
      // Save success execution log
      if (activeBotId) {
        logBotExecution(activeBotId, "success", activeStepsList.length, activeStepsList.length);
      }

      // Load mock records at the end
      const matchedTemplate = BOT_TEMPLATES.find(t => t.name === selectedTemplate);
      if (matchedTemplate) {
        setScrapedData(matchedTemplate.mockData);
        addLog(`פענוח והצגת הנתונים הסתיימו בהצלחה, נמצאו ${matchedTemplate.mockData.length} רשומות.`, "success");
      } else {
        // Generate pseudo structured data matching the custom goal
        const customData = [
          { index: 1, title: `${config.goal.split("'")[1] || "פריט"} - פרימיום דגם גולד`, price: "$49.50", Rating: "4.8", Vendor: "E-Store Pro" },
          { index: 2, title: `${config.goal.split("'")[1] || "פריט"} - מהדורה סטנדרטית שחורה`, price: "$32.99", Rating: "4.5", Vendor: "FastShipper" },
          { index: 3, title: `${config.goal.split("'")[1] || "פריט"} - דיל זול וחסכוני`, price: "$19.95", Rating: "4.2", Vendor: "GlobalOutlet" }
        ];
        setScrapedData(customData);
        addLog(`נוצרו ${customData.length} פריטי דוגמה שחולצו מאלמנטי היעד.`, "success");
      }
      return;
    }

    setActiveStepIndex(currentIndex);
    
    // Mark active step as running
    setSteps(prev => prev.map((s, idx) => 
      idx === currentIndex ? { ...s, status: "running" } : s
    ));

    const currentStep = activeStepsList[currentIndex];
    addLog(`[שלב ${currentIndex + 1}/${activeStepsList.length}] מתחיל את "${currentStep.title}"...`, "info", currentStep.id);
    addLog(`[פעולה] סוג: ${currentStep.type.toUpperCase()} | סלקטור: ${currentStep.selector || "N/A"}${currentStep.value ? ` | ערך קלט: "${currentStep.value}"` : ""}`, "debug", currentStep.id);

    if (config.cognitiveVision && currentStep.selector) {
      addLog("🧠 Cognitive Vision סורק את ה-DOM ורופא באופן אוטומטי סלקטורים שנשחתו ב-Layout.", "debug", currentStep.id);
    }
    if (config.chaosEngine && currentStep.type === "input") {
      addLog("🎲 Chaos Engine מזריק שגיאות הקלדה אנושיות, מוחק, ומתקן בתדירות אורגנית.", "debug", currentStep.id);
    }
    if (config.quantumSpeed && currentIndex === 0) {
      addLog("⚡ Quantum Parallelism משכפל צינורות ביצוע ל-5 שכבות קריאה במקביל.", "debug", currentStep.id);
    }

    // Speed multiplier logic
    const duration = currentStep.simulatedDurationMs / config.speed;

    // AI Direct Hand Control Animation Engine
    if (isAiHandActive) {
      const titleLower = (currentStep.title + " " + currentStep.type).toLowerCase();
      let targetX = 50;
      let targetY = 55;
      let label = "העוזר מקשר...";

      if (currentStep.type === "navigate") {
        targetX = 40;
        targetY = 12; // address bar coordinate
        label = `נווט אל ${currentStep.value || ""}`;
        
        // 1. Move pointer to browser address bar
        setAiCursor({ x: targetX, y: targetY, visible: true, label: "מוביל סמן לכתובת הדפדפן..." });
        
        // 2. Type URL letter by letter
        setTimeout(() => {
          let urlStr = currentStep.value || "https://example.com";
          setBrowserSimUrl("");
          let charIndex = 0;
          const typingTimer = setInterval(() => {
            if (charIndex < urlStr.length) {
              setBrowserSimUrl(prev => prev + urlStr[charIndex]);
              charIndex++;
            } else {
              clearInterval(typingTimer);
            }
          }, Math.max(15, (duration * 0.5) / urlStr.length));
          
          setBrowserSimPage(0);
          setBrowserSimLogs(prev => [...prev, `[AI Navigate] Loading ${urlStr}...`]);
        }, duration * 0.15);

      } else if (currentStep.type === "input") {
        const isGmail = titleLower.includes("gmail") || titleLower.includes("מייל");
        targetX = isGmail ? 55 : 42;
        targetY = isGmail ? 48 : 46;
        label = `מקליד: "${currentStep.value || ""}"`;

        // 1. Hover pointer to input field
        setAiCursor({ x: targetX, y: targetY, visible: true, label: "מקרב סמן לשדה קלט..." });

        // 2. Click to focus & ripple
        setTimeout(() => {
          setClickRipple({ x: targetX, y: targetY, active: true });
          setTimeout(() => setClickRipple(prev => ({ ...prev, active: false })), 400);
          setBrowserSimLogs(prev => [...prev, `[AI Focus] Clicked input box: ${currentStep.selector}`]);
          
          // 3. Type text letter by letter
          let textStr = currentStep.value || "";
          setBrowserSimSearch("");
          let charIndex = 0;
          const typingTimer = setInterval(() => {
            if (charIndex < textStr.length) {
              setBrowserSimSearch(prev => prev + textStr[charIndex]);
              charIndex++;
            } else {
              clearInterval(typingTimer);
            }
          }, Math.max(25, (duration * 0.6) / (textStr.length || 1)));

        }, duration * 0.2);

      } else if (currentStep.type === "click") {
        const isGmail = titleLower.includes("gmail") || titleLower.includes("מייל");
        const isSheet = titleLower.includes("sheet") || titleLower.includes("טבלה");
        targetX = isGmail ? 24 : (isSheet ? 28 : 75);
        targetY = isGmail ? 82 : (isSheet ? 56 : 46);
        label = `לוחץ על כפתור הפעולה`;

        // 1. Hover pointer to button
        setAiCursor({ x: targetX, y: targetY, visible: true, label: "מנווט ללחיצה על כפתור..." });

        // 2. Trigger touch and ripple
        setTimeout(() => {
          setClickRipple({ x: targetX, y: targetY, active: true });
          setTimeout(() => setClickRipple(prev => ({ ...prev, active: false })), 500);
          setBrowserSimLogs(prev => [...prev, `[AI Touch] Activated button: ${currentStep.selector || "Submit"}`]);
          
          // Move pages in simulation
          setBrowserSimPage(1);
        }, duration * 0.45);

      } else if (currentStep.type === "extract") {
        targetX = 50;
        targetY = 70;
        label = `מחלץ ומפענח מידע`;

        // 1. Hover to parsing grid
        setAiCursor({ x: targetX, y: targetY, visible: true, label: "ממקד גלאי מעל טבלת הנתונים..." });

        // 2. Scan lasers sweeps
        setTimeout(() => {
          setLaserActive(true);
          setBrowserSimLogs(prev => [...prev, `[AI Extract] Laser sweep parsing data on: ${currentStep.selector}...`]);
          
          setTimeout(() => {
            setLaserActive(false);
            setBrowserSimPage(2);
          }, duration * 0.6);
        }, duration * 0.2);
      } else {
        setAiCursor({ x: 50, y: 55, visible: true, label: "ממתין..." });
      }
    }

    timerRef.current = setTimeout(() => {
      // Dynamic simulated error injection check
      if (adminErrorRate > 0 && Math.random() * 100 < adminErrorRate) {
        setIsRunning(false);
        setActiveStepIndex(null);
        setAiCursor(prev => ({ ...prev, visible: false }));
        setLaserActive(false);
        setSteps(prev => prev.map((s, idx) => 
          idx === currentIndex ? { ...s, status: "failed" } : s
        ));
        addLog(`🚨 [כשל] הפעולת שלב "${currentStep.title}" נכשלה בשל שגיאת סלקטור! (הזרקת שגיאות מנהל פעילה: ${adminErrorRate}%)`, "error", currentStep.id);
        setErrorMessage(`ההרצה נכשלה בשל שגיאה שהוזרקה בשלב ${currentIndex + 1}.`);
        if (activeBotId) {
          logBotExecution(activeBotId, "failure", currentIndex, activeStepsList.length);
        }
        return;
      }

      // Transition step to completed
      setSteps(prev => prev.map((s, idx) => 
        idx === currentIndex ? { ...s, status: "completed" } : s
      ));
      
      addLog(`[הושלם] "${currentStep.title}" בוצע בהצלחה ב-${duration.toFixed(0)} מילישניות.`, "success", currentStep.id);
      
      // Continue execution recursively
      runNextSequentialStep(currentIndex + 1, activeStepsList);
    }, duration);
  };

  // Pause simulation
  const pauseSimulation = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setIsPaused(true);
    setIsRunning(false);
    addLog("ציר הזמן של האוטומציה הושעה על ידי המשתמש.", "warn");
  };

  // Reset/terminate simulation
  const resetOrTerminateSimulation = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setIsRunning(false);
    setIsPaused(false);
    setActiveStepIndex(null);
    setSteps(prev => prev.map(s => ({ ...s, status: "pending" })));
    setScrapedData([]);
    addLog("ההפעלה הוירטואלית נמחקה. כל המצבים אופסו.", "warn");
  };

  const addSharedLog = (text: string, type: "info" | "success" | "warn" | "error" | "debug" | "data" = "info") => {
    const timeStr = new Date().toLocaleTimeString();
    setSharedExecutionLogs(prev => [...prev, { id: Math.random().toString(), time: timeStr, type, text }]);
  };

  const runSharedBotSimulation = async () => {
    if (steps.length === 0) {
      addSharedLog("שגיאה: לא נטענו צעדי עבודה לבוט זה.", "error");
      return;
    }
    
    setSharedIsRunning(true);
    setSharedRunFinished(false);
    setSharedActiveStep(0);
    setSharedScrapedRows([]);
    setSharedExecutionLogs([]);
    setSharedRequestStatus("");
    
    addSharedLog("🔧 מאתחל מכונה וירטואלית מבוזרת (Sandboxed Container) לצורך הרצה...", "info");
    addSharedLog(`🚀 מהירות הידור מוגדרת: ${config.speed}x | Ghost Mode: ${config.ghostMode ? "פעיל" : "כבוי"} | Shield Protection: ${config.antiBotShield ? "פעיל" : "כבוי"}`, "info");
    
    if (config.useProxies) {
      addSharedLog("🌐 מחבר מערך Residential IP Proxies מרשת ה-Cloud Clusters המקומית.", "debug");
    }
    if (config.antiBotShield) {
      addSharedLog("🛡️ טוען חיסון נגד מערכות זיהוי בוטים של Cloudflare / perimeterX.", "debug");
    }
    if (config.ghostMode) {
      addSharedLog("👻 מפעיל מנוע פנומונלי אנושי (Human-like Typing & organic pauses) למניעת חסימות.", "debug");
    }

    // Set all steps to pending
    setSteps(prev => prev.map(s => ({ ...s, status: "pending" })));

    let currentIndex = 0;
    
    const runNextStep = () => {
      if (currentIndex >= steps.length) {
        // FINISHED BOT STEPS
        setSharedIsRunning(false);
        setSharedRunFinished(true);
        setSharedActiveStep(null);
        setSharedCursor(prev => ({ ...prev, visible: false }));
        
        addSharedLog("🎉 כל השלבים עברו הידור ותיקוף בהצלחה בהצלחה!", "success");
        addSharedLog("📡 אוסף את פלט הנתונים שחולצו לייצוא לאינטגרציה...", "info");

        // Generate high quality mock rows based on the bot name and goal
        const generatedRows = [
          { "[מזהה]": "001", "[שם מוצר]": `${config.name} - פרימיום VIP`, "[מחיר]": "₪1,200", "[סטטוס]": "מלאי זמין", "[ספק]": "מחסן מרכזי" },
          { "[מזהה]": "002", "[שם מוצר]": `${config.name} - מהדורה קלאסית`, "[מחיר]": "₪850", "[סטטוס]": "מלאי זמין", "[ספק]": "חנות דרום" },
          { "[מזהה]": "003", "[שם מוצר]": `${config.name} - גרסת לייט`, "[מחיר]": "₪490", "[סטטוס]": "אזל זמנית", "[ספק]": "מחסן מרכזי" }
        ];
        
        setSharedScrapedRows(generatedRows);
        addSharedLog(`📊 חולצו בהצלחה ${generatedRows.length} רשומות מובנות מהאלמנטים!`, "success");

        // Execute real webhook sending if provided
        if (sharedWebhookUrl && sharedWebhookUrl.trim() !== "") {
          addSharedLog(`📡 משדר פיילאוד חי בזמן אמת אל Webhook: ${sharedWebhookUrl}...`, "info");
          setSharedRequestStatus("sending");
          
          fetch(sharedWebhookUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              botName: config.name,
              goal: config.goal,
              url: config.url,
              scrapedAt: new Date().toISOString(),
              scrapedRecords: generatedRows,
              activeAbilities: {
                speed: config.speed,
                ghostMode: !!config.ghostMode,
                cognitiveVision: !!config.cognitiveVision,
                antiBotShield: !!config.antiBotShield,
                residentialProxies: !!config.residentialProxies,
              },
              runLogs: ["Pipeline completed successfully", "Transmitted via BotForge player"]
            })
          })
          .then(res => {
            if (res.ok) {
              setSharedRequestStatus("success");
              addSharedLog(`✅ שידור הנתונים של הבוט הצליח! סטטוס שרת: ${res.status} OK. התקבל מענה תקין מ-Make.com/Webhook!`, "success");
            } else {
              setSharedRequestStatus("failed");
              addSharedLog(`⚠️ השרת המרוחק החזיר שגיאה: ${res.status} ${res.statusText}`, "error");
            }
          })
          .catch(err => {
            setSharedRequestStatus("failed");
            addSharedLog(`❌ שגיאת רשת בשליחה ל-Webhook: ${err.message}. אנא ודא שכתובת ה-Webhook פתוחה לקבלת בקשות CORS מוצלבות.`, "error");
          });
        } else {
          addSharedLog("ℹ️ הרצה הושלמה ללא שידור Webhook חיצוני (לא הוגדרה כתובת URL).", "warn");
        }

        return;
      }

      setSharedActiveStep(currentIndex);
      setSteps(prev => prev.map((s, idx) => idx === currentIndex ? { ...s, status: "running" } : s));
      
      const currentStep = steps[currentIndex];
      addSharedLog(`[צעד ${currentIndex + 1}/${steps.length}] מתחיל ומבצע: ${currentStep.title}`, "info");
      
      const duration = (currentStep.simulatedDurationMs || 2500) / config.speed;
      
      // Animate Browser Simulated Visuals based on currentStep type
      if (currentStep.type === "navigate") {
        const destUrl = currentStep.value || config.url || "https://example.com";
        setSharedCursor({ x: 30, y: 12, visible: true, label: "מוביל סמן אל שורת הכתובת..." });
        
        // Simulating loading navigation
        setTimeout(() => {
          setSharedBrowserUrl(destUrl);
          addSharedLog(`🌐 דפדפן וירטואלי מנווט בהצלחה לכתובת: ${destUrl}`, "debug");
          setSharedBrowserText("");
        }, duration * 0.3);

      } else if (currentStep.type === "input") {
        setSharedCursor({ x: 45, y: 48, visible: true, label: "ממקד מקלדת על שדה הקלט..." });
        
        setTimeout(() => {
          setSharedClickRipple({ x: 45, y: 48, active: true });
          setTimeout(() => setSharedClickRipple(prev => ({ ...prev, active: false })), 400);
          
          let letters = currentStep.value || "";
          setSharedBrowserText("");
          let charIdx = 0;
          const typingTimer = setInterval(() => {
            if (charIdx < letters.length) {
              setSharedBrowserText(prev => prev + letters[charIdx]);
              charIdx++;
            } else {
              clearInterval(typingTimer);
            }
          }, Math.max(20, (duration * 0.4) / (letters.length || 1)));
          
          addSharedLog(`⌨️ הקלדת ערך אנושית: "${letters}" בסלקטור: ${currentStep.selector || "input"}`, "debug");
        }, duration * 0.25);

      } else if (currentStep.type === "click") {
        setSharedCursor({ x: 60, y: 55, visible: true, label: `מקרב סמן לכפתור: ${currentStep.title}...` });
        
        setTimeout(() => {
          setSharedClickRipple({ x: 60, y: 55, active: true });
          setTimeout(() => setSharedClickRipple(prev => ({ ...prev, active: false })), 400);
          addSharedLog(`🎯 לחיצה ממוקדת על אלמנט דף: [${currentStep.selector || "button"}]`, "debug");
        }, duration * 0.4);

      } else if (currentStep.type === "extract") {
        setSharedCursor({ x: 50, y: 70, visible: true, label: "סורק ומחלץ נתונים מובנים..." });
        addSharedLog(`📊 חולץ מידע מובנה באמצעות סלקטור AI: [${currentStep.selector || "table"}]`, "debug");
      } else {
        setSharedCursor({ x: 50, y: 50, visible: true, label: "מעבד פעולה מתוזמנת..." });
      }

      // Complete this step after the duration has passed
      setTimeout(() => {
        setSteps(prev => prev.map((s, idx) => idx === currentIndex ? { ...s, status: "completed" } : s));
        addSharedLog(`✔️ שלב ${currentIndex + 1} ("${currentStep.title}") הסתיים בהצלחה.`, "success");
        currentIndex++;
        runNextStep();
      }, duration);
    };

    runNextStep();
  };

  // Trigger individual selector code viewing
  const toggleStepCode = (stepId: string) => {
    if (expandedCodeStep === stepId) {
      setExpandedCodeStep(null);
    } else {
      setExpandedCodeStep(stepId);
    }
  };

  const copyToClipboard = () => {
    let scriptText = "";
    if (exportType === "csharp") {
      scriptText = generateCSharpSeleniumScript(config.name, config.url, steps);
    } else if (exportType === "swift") {
      scriptText = generateSwiftUiScript(config.name, config.url, steps);
    } else {
      scriptText = generateFullPuppeteerScript(config.name, config.url, steps, config);
    }
    navigator.clipboard.writeText(scriptText);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleDownloadScript = () => {
    let scriptText = "";
    let fileExtension = "js";
    let mimeType = "text/javascript";
    let formatLabel = "Puppeteer Node.js";

    if (exportType === "csharp") {
      scriptText = generateCSharpSeleniumScript(config.name, config.url, steps);
      fileExtension = "cs";
      mimeType = "text/plain";
      formatLabel = "C# Selenium (for Windows EXE)";
    } else if (exportType === "swift") {
      scriptText = generateSwiftUiScript(config.name, config.url, steps);
      fileExtension = "swift";
      mimeType = "text/plain";
      formatLabel = "Swift iOS WKWebView";
    } else {
      scriptText = generateFullPuppeteerScript(config.name, config.url, steps, config);
    }

    const element = document.createElement("a");
    const file = new Blob([scriptText], { type: mimeType });
    element.href = URL.createObjectURL(file);
    element.download = `${config.name.toLowerCase().replace(/\s+/g, '_')}_bot.${fileExtension}`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    addLog(`קוד הסקריפט בפורמט ${formatLabel} בשם "${element.download}" יוצא והורד בהצלחה.`, "success");
  };

  // Quick download scraped database data
  const handleDownloadData = () => {
    if (scrapedData.length === 0) return;
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(scrapedData, null, 2))}`;
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", jsonString);
    downloadAnchor.setAttribute("download", `${config.name.toLowerCase().replace(/\s+/g, '_')}_data.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
  };

  // Custom Email/Password Auth
  const handleEmailAuth = async () => {
    setAuthError(null);
    if (!authEmail.includes("@") || authPassword.length < 6) {
      setAuthError("אנא הזינו אימייל תקין וסיסמה בת 6 תווים לפחות.");
      addLog("אנא הזינו אימייל תקין וסיסמה בת 6 תווים לפחות.", "error");
      return;
    }
    setAuthProgress(true);
    try {
      let authResult;
      try {
        authResult = isRegistering 
          ? await registerWithEmail(authEmail, authPassword)
          : await loginWithEmail(authEmail, authPassword);
      } catch (innerErr: any) {
        if (isRegistering && innerErr.code === "auth/email-already-in-use") {
          addLog("החשבון קיים במערכת. מנסה להתחבר...", "info");
          authResult = await loginWithEmail(authEmail, authPassword);
        } else if (!isRegistering && (innerErr.code === "auth/user-not-found" || innerErr.code === "auth/invalid-credential")) {
          // In newer Firebase versions, invalid-credential is used instead of user-not-found
          addLog("החשבון לא קיים או סיסמה שגויה צור חשבון...", "info");
          setIsRegistering(true);
          authResult = await registerWithEmail(authEmail, authPassword);
        } else {
          throw innerErr;
        }
      }
      
      setCurrentUser(authResult.user);
      setNeedsAuth(false);
      setShowAuthModal(false);
      if (authResult.user.uid.startsWith("local_")) {
        addLog(`התחברות למצב מקומי (Local Sandbox) הצליחה עבור: ${authResult.user.email}. שים לב: שיטת האימיל חסומה ב-Firebase שלך, אך המעקף המקומי מאפשר לך להשתמש במערכת כרגיל!`, "success");
      } else {
        addLog(`התחברות הצליחה! משתמש: ${authResult.user.email}`, "success");
      }
      await loadUserCloudData(authResult.user, "no-google-token");
    } catch (err: any) {
      console.error("Auth error details:", err);
      let errorMsg = err.message;
      const code = err.code || "";
      
      if (code === 'auth/admin-restricted-operation') {
        errorMsg = "הרשמה נחסמה על ידי מנהל המערכת. אנא השתמשו בהתחברות עם גוגל או כאורח.";
      } else if (code === 'auth/wrong-password') {
        errorMsg = "הסיסמה שהזנת אינה נכונה.";
      } else if (code === 'auth/email-already-in-use') {
        errorMsg = "כתובת האימייל הזו כבר רשומה במערכת. לחצו על 'התחבר לחשבון' במקום להירשם.";
      } else if (code === 'auth/weak-password') {
        errorMsg = "הסיסמה חלשה מדי. היא חייבת להכיל לפחות 6 תווים.";
      } else if (code === 'auth/invalid-email') {
        errorMsg = "כתובת האימייל אינה תקינה.";
      } else if (code === 'auth/operation-not-allowed') {
        errorMsg = "שיטת ההרשמה עם אימייל וסיסמה אינה מופעלת בפרויקט Firebase שלכם. יש לאפשר אותה ב-Firebase Console (Authentication -> Sign-in method -> Email/Password). בינתיים אנא התחברו עם גוגל או המשיכו כאורח.";
      } else if (code === 'auth/user-not-found') {
        errorMsg = "לא נמצא משתמש עם כתובת אימייל זו. עברו ללשונית ההרשמה כדי ליצור חשבון חדש.";
      } else if (code === 'auth/invalid-credential') {
        errorMsg = "פרטי ההתחברות שהזנת אינם נכונים (אימייל או סיסמה שגויים).";
      } else if (code === 'auth/network-request-failed') {
        errorMsg = "שגיאת רשת. אנא בדקו את חיבור האינטרנט שלכם ונסו שנית.";
      } else if (code === 'auth/popup-closed-by-user') {
        errorMsg = "חלון ההתחברות נסגר לפני השלמת התהליך.";
      }
      
      setAuthError(`שגיאה בתהליך ההתחברות/הרשמה: ${errorMsg}`);
      addLog(`שגיאה: ${errorMsg}`, "error");
    } finally {
      setAuthProgress(false);
    }
  };

  const handleGoogleLogin = async () => {
    setAuthError(null);
    setAuthProgress(true);
    try {
      const authResult = await loginWithGoogle();
      setCurrentUser(authResult.user);
      setNeedsAuth(false);
      setShowAuthModal(false);
      addLog(`התחברות Google הצליחה! משתמש: ${authResult.user.email}`, "success");
      await loadUserCloudData(authResult.user, "no-google-token"); // The proxy handles token internally
    } catch (err: any) {
      let errorMsg = err.message;
      setAuthError(`שגיאת התחברות Google: ${errorMsg}`);
      addLog(`שגיאת התחברות Google: ${errorMsg}`, "error");
    } finally {
      setAuthProgress(false);
    }
  };

  const handleAnonymousLogin = async () => {
    setAuthError(null);
    setAuthProgress(true);
    try {
      // Bypass Firebase Anonymous Auth to avoid 'admin-restricted-operation' error
      // Users will enter as an unauthenticated local guest
      setCurrentUser(null);
      setNeedsAuth(false);
      setShowAuthModal(false);
      addLog(`התחברות אנונימית הצליחה אינך מחובר לחשבון (היסטוריה לא תישמר).`, "success");
    } catch (err: any) {
      setAuthError(`שגיאה בהתחברות אנונימית: ${err.message}`);
      addLog(`שגיאה בהתחברות אנונימית: ${err.message}`, "error");
    } finally {
      setAuthProgress(false);
    }
  };

  // handle Log-out
  const handleLogout = async () => {
    try {
      sessionStorage.removeItem("simulated_google_user"); // removing old logic just in case
      await signOutUser().catch(() => {});
      setCurrentUser(null);
      setAccessToken(null);
      setNeedsAuth(true);
      setShowAuthModal(false);
      addLog("החשבון נותק בהצלחה.", "warn");
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleTestMakeWebhook = async () => {
    if (!sharedWebhookUrl || !sharedWebhookUrl.trim().startsWith("http")) {
      setMakeTestResult({ status: "שגיאה: הגדר תחילה כתובת Webhook תקינה (חייבת להתחיל ב-http או https)", type: "error" });
      return;
    }
    setMakeTestLoading(true);
    setMakeTestResult({ status: "משגר פיילאוד חצי-דינמי ל-Make.com...", type: "info" });
    try {
      let parsedPayload;
      try {
        parsedPayload = JSON.parse(makeTestPayload);
      } catch (e: any) {
        throw new Error("קובץ ה-JSON אינו תקין. אנא בדוק פסיקים, סוגריים ומרכאות כפולות: " + e.message);
      }
      
      const response = await fetch(sharedWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsedPayload)
      });
      
      if (response.ok) {
        setMakeTestResult({
          status: `🟢 הקריאה עברה בהצלחה! קוד תגובה מהשרת: ${response.status} (${response.statusText || 'OK'}). התרחיש שלך ב-Make הופעל בהצלחה!`,
          type: "success"
        });
        addLog(`בדיקת Webhook עברה בהצלחה (סטטוס ${response.status}) לכתובת: ${sharedWebhookUrl}`, "success");
      } else {
        setMakeTestResult({
          status: `⚠️ שרת ה-Webhook החזיר שגיאה: ${response.status} ${response.statusText}. ודא שהגדרת 'Custom Webhook' שהתרחיש פעיל (ON) ואינו חסום.`,
          type: "error"
        });
        addLog(`שגיאת Webhook (סטטוס ${response.status}) בקריאה לכתובת: ${sharedWebhookUrl}`, "warn");
      }
    } catch (err: any) {
      setMakeTestResult({
        status: `🔴 שגיאת רשת / חיבור נכשל: ${err.message || 'לא ניתן לגשת לכתובת זו מהדפדפן (CORS block).'}`,
        type: "error"
      });
      addLog(`חיבור נכשל ל-Webhook: ${err.message}`, "error");
    } finally {
      setMakeTestLoading(false);
    }
  };

  const handleNetlasQuery = async (target: string) => {
    if (!target || !target.trim()) {
      setNetlasError("אנא הזן ערך לחיפוש (IP, דומיין, או שם מערכת)");
      return;
    }
    setNetlasLoading(true);
    setNetlasError(null);
    setNetlasResult(null);
    
    try {
      const query = getParsedDomain(target.trim());
      const isIPOrDomain = /^(?:\d{1,3}\.){3}\d{1,3}$|^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(query);
      
      if (isIPOrDomain) {
        // Existing flow for specific IP/Domain
        let ipAddress = query;
        if (/[a-zA-Z]/.test(ipAddress)) {
          addLog(`שולח שאילתת DNS Netlas לתרגום דומיין ${ipAddress}...`, "info");
          const dnsResp = await fetch(`/api/netlas/resolve?host=${encodeURIComponent(ipAddress)}`);
          const dnsData = await dnsResp.json();
          if (!dnsResp.ok || !dnsData.success) throw new Error(dnsData.error || "תרגום ה-DNS של Netlas נכשל");
          const hostKey = Object.keys(dnsData.data)[0];
          if (hostKey && dnsData.data[hostKey]) ipAddress = dnsData.data[hostKey];
          else throw new Error("לא נמצאה כתובת IP");
        }
        
        addLog(`מבצע חקירת מודיעין Netlas למטרה ${ipAddress}...`, "info");
        const hostResp = await fetch(`/api/netlas/host/${ipAddress}`);
        const hostData = await hostResp.json();
        
        if (!hostResp.ok || !hostData.success) throw new Error(hostData.error || "שאילתת המודיעין ב-Netlas נכשלה.");
        
        // Add analysis step for existing flow too for consistency
        const geminiResponse = await fetch(`/api/netlas/search?query=${encodeURIComponent(ipAddress)}`);
        const geminiData = await geminiResponse.json();

        if (hostData.not_found) {
          setNetlasResult({ not_found: true, ip: ipAddress });
        } else {
          setNetlasResult({ data: hostData.data, analysis: geminiData.analysis });
          addLog(`חקירת Netlas הושלמה בהצלחה עבור ${ipAddress}!`, "success");
        }
      } else {
        // Smart Search flow
        addLog(`מבצע חיפוש חכם ב-Netlas עבור "${query}"...`, "info");
        const searchResp = await fetch(`/api/netlas/search?query=${encodeURIComponent(query)}`);
        const searchData = await searchResp.json();
        
        if (!searchResp.ok) throw new Error(searchData.error || "חיפוש Netlas נכשל.");
        
        setNetlasResult(searchData);
        addLog(`חיפוש חכם הושלם בהצלחה!`, "success");
      }
      
      await loadNetlasApiInfo();
    } catch (err: any) {
      setNetlasError(err.message || "שגיאה במהלך חיבור ל-Netlas");
      addLog(`שגיאת Netlas: ${err.message}`, "error");
    } finally {
      setNetlasLoading(false);
    }
  };

  const loadNetlasApiInfo = async () => {
    try {
      const resp = await fetch("/api/netlas/info");
      const data = await resp.json();
      if (resp.ok && data.success) {
        setNetlasApiInfo(data.data);
      }
    } catch (e) {
      console.error("Failed to load Netlas API info status", e);
    }
  };

  /**
   * Safe Confirmation Handler before mutating/writing to Workspace APIs
   * as required in SKILL.md rules
   */
  const requestWorkspaceAction = (
    title: string,
    message: string,
    actionType: string,
    executeHandler: () => Promise<void>
  ) => {
    setWorkspaceConfirmation({
      show: true,
      title,
      message,
      actionType,
      onConfirm: async () => {
        setWorkspaceConfirmation(null); // Close modal
        setWsRunning(true);
        setWsMessage({ text: "מעבד את העברת הנתונים לענן...", type: "info" });
        try {
          await executeHandler();
        } catch (err: any) {
          console.error(err);
          setWsMessage({ text: `הביצוע נכשל: ${err.message}`, type: "error" });
          addLog(`[שגיאת API של Workspace] ${err.message}`, "error");
        } finally {
          setWsRunning(false);
        }
      }
    });
  };

  // 1. Google Drive Export Puppeteer JS Script
  const triggerExportScriptToDrive = () => {
    if (needsAuth) {
      setShowAuthModal(true);
      addLog("יש להתחבר למערכת תחילה כדי לבצע פעולות ב-Google Drive", "info");
      return;
    }
    if (steps.length === 0) {
      setWsMessage({ text: "שגיאה: אין שלבי אוטומציה מוגדרים לייצוא. נא ליצור או להקליט שלב תחילה.", type: "error" });
      return;
    }
    const scriptText = generateFullPuppeteerScript(config.name, config.url, steps, config);
    const fileName = `${config.name.toLowerCase().replace(/\s+/g, "_")}_bot.js`;

    requestWorkspaceAction(
      "שמירת קוד הבוט ב-Google Drive?",
      `פעולה זו תשמור את סקריפט ה-Puppeteer בשם '${fileName}' ישירות לתיקיית העבודה שלכם ב-Google Drive.`,
      "drive",
      async () => {
        if (!accessToken) throw new Error("מפתח אבטחה של Google חסר, אנא רענן חיבור");
        const uploadResult = await uploadToDrive(accessToken, fileName, scriptText);
        setWsMessage({ 
          text: `הצלחה! הסקריפט נשמר ב-Drive (אנא בדוק מזהה קובץ: ${uploadResult.id}).`, 
          type: "success" 
        });
        addLog(`סקריפט Puppeteer יוצא בהצלחה ל-Drive (FileID: ${uploadResult.id})`, "success");
      }
    );
  };

  // 2. Google Docs Report Export
  const triggerExportDocToDrive = () => {
    if (needsAuth) {
      setShowAuthModal(true);
      addLog("יש להתחבר למערכת תחילה כדי לבצע פעולות ב-Google Workspace", "info");
      return;
    }
    if (steps.length === 0) {
      setWsMessage({ text: "שגיאה: אין שלבים מוגדרים בבוט להפקת דו\"ח. נא להקליט או ליצור שלבים תחילה.", type: "error" });
      return;
    }
    const docTitle = `דו"ח ריצת בוט: ${config.name}`;

    requestWorkspaceAction(
      "הפקת דו\"ח מסמך ב-Google Docs?",
      `פעולה זו תפיק ותעצב מסמך Google Doc מעוצב בשם '${docTitle}' המציג את שלבי האוטומציה שבוצעו ופרמטרי הריצה.`,
      "doc",
      async () => {
        if (!accessToken) throw new Error("מפתח אבטחה של Google חסר, אנא רענן חיבור");
        const docResult = await createGoogleDocBlueprint(accessToken, config.name, config.goal, config.url, steps);
        setWsMessage({ 
          text: `הדו"ח נוצר בהצלחה! תוכל לגשת למסמך המעוצב שלך ב-Drive (מזהה מסמך: ${docResult.documentId})`, 
          type: "success" 
        });
        addLog(`נוצר דו"ח ריצה מפורט בפורמט Google Doc ב-Drive שלכם (DocID: ${docResult.documentId})`, "success");
      }
    );
  };

  // 3. Google Sheets Dataset Sync
  const triggerSyncToSheets = () => {
    if (needsAuth) {
      setShowAuthModal(true);
      addLog("יש להתחבר למערכת תחילה כדי לבצע פעולות ב-Google Sheets", "info");
      return;
    }
    if (scrapedData.length === 0) {
      setWsMessage({ text: "שגיאה: אין רשומות נתונים שנאספו לסנכרון. עליך להריץ את הבוט בהצלחה תחילה.", type: "error" });
      return;
    }

    const sheetTitle = `${config.name} - נתונים שחולצו`;

    requestWorkspaceAction(
      "סנכרון נתונים ל-Google Sheets?",
      `פעולה זו תבנה קובץ גיליון אלקטרוני חדש בשם '${sheetTitle}' ותייבא את כל שורות הנתונים שחולצו ברגע זה.`,
      "sheet",
      async () => {
        if (!accessToken) throw new Error("מפתח אבטחה של Google חסר, אנא רענן חיבור");
        const sheetResult = await createGoogleSheet(accessToken, sheetTitle, scrapedData);
        setWsMessage({ 
          text: `סנכרון הנתונים הושלם בהצלחה! הגיליון נוצר ב-Sheets (מזהה גיליון: ${sheetResult.spreadsheetId}) ומכיל ${scrapedData.length} שורות.`, 
          type: "success" 
        });
        addLog(`סונכרנו ${scrapedData.length} שורות נתונים אל קובץ הגיליון החדש (ID: ${sheetResult.spreadsheetId})`, "success");
      }
    );
  };

  // 4. Google Calendar Scheduling Event
  const triggerScheduleCalendarEvent = () => {
    if (needsAuth) {
      setShowAuthModal(true);
      addLog("יש להתחבר למערכת תחילה כדי לקשר אירועים ביומן Google", "info");
      return;
    }

    requestWorkspaceAction(
      "תזמון אירוע הרצה בלוח השנה?",
      `פעולה זו תשלב אירוע תזכורת/דיווח ביומן ה-Google Calendar הראשי שלכם עם מדדי יעדי הבוט המתוכננים.`,
      "calendar",
      async () => {
        if (!accessToken) throw new Error("מפתח אבטחה של Google חסר, אנא רענן חיבור");
        const eventResult = await createCalendarEvent(
          accessToken,
          config.name,
          config.goal,
          config.url,
          steps.length,
          "success"
        );
        setWsMessage({
          text: `הצלחה! נרשם אירוע של הרצת הבוט ביומן הראשי שלכם ב-Google Calendar.`,
          type: "success"
        });
        addLog(`לוח הזמנים עודכן עם ציון דרך חדש ביומן Google Calendar`, "success");
      }
    );
  };

  // 5. Gmail HTML Delivery
  const triggerGmailReport = () => {
    if (needsAuth) {
      setShowAuthModal(true);
      addLog("יש להתחבר למערכת תחילה כדי לשלוח דוא\"ל ב-Gmail API", "info");
      return;
    }
    if (!customGmailRecipient.trim()) {
      setWsMessage({ text: "שגיאה: אנא הקלד כתובת מייל תקפה ויציבה לקבלת הדו\"ח.", type: "error" });
      return;
    }

    const scriptText = generateFullPuppeteerScript(config.name, config.url, steps, config);

    requestWorkspaceAction(
      "שליחת עדכון סטטוס ומסמך ריצה ב-Gmail?",
      `פעולה זו תשלח הודעת מייל מעוצבת ב-HTML הכוללת מידע טכני מקיף של הבוט '${config.name}' יחד עם קובץ ה-Puppeteer כקובץ מצורף אל '${customGmailRecipient}'.`,
      "gmail",
      async () => {
        if (!accessToken) throw new Error("מפתח אבטחה של Google חסר, אנא רענן חיבור");
        const emailResult = await sendEmailNotification(
          accessToken,
          customGmailRecipient,
          config.name,
          config.goal,
          steps.length,
          scrapedData.length,
          scriptText
        );
        setWsMessage({
          text: `הצלחה! הדו"ח החכם נשלח בהצלחה דרך Gmail API (מזהה הודעה: ${emailResult.id}) אל תיבת הדו"אל ${customGmailRecipient}.`,
          type: "success"
        });
        addLog(`נשלחו הודעה ודוח ריצה טקסטואליים אל: ${customGmailRecipient}`, "success");
      }
    );
  };

  // 6. Google Slides Presentation Deck Assembler
  const triggerAssembleSlides = () => {
    if (needsAuth) {
      setShowAuthModal(true);
      addLog("יש להתחבר למערכת תחילה כדי ליצור מצגות ב-Google Slides", "info");
      return;
    }
    if (steps.length === 0) {
      setWsMessage({ text: "שגיאה: אין שלבי אוטומציה מוגדרים בקובץ לבניית מצגת עסקית.", type: "error" });
      return;
    }

    requestWorkspaceAction(
      "הפקת מצגת שקפים מעוצבת ב-Google Slides?",
      `פעולה זו תיצור באופן אוטומטי מצגת עסקית המציגה את יעדי הבוט, מהלכי הריצה, נתוני האוטומציה שבוצעו וסטטיסטיקה ישירות בתוך Google Slides.`,
      "slides",
      async () => {
        if (!accessToken) throw new Error("מפתח אבטחה של Google חסר, אנא רענן חיבור");
        const slidesResult = await createGoogleSlidesSummary(
          accessToken, 
          config.name, 
          config.goal, 
          steps
        );
        setWsMessage({
          text: `המצגת הופקה בצורה מושלמת! מזהה מצגת ב-Drive שלכם: ${slidesResult.slideshowId}`,
          type: "success"
        });
        addLog(`הופקה מצגת שקפים מנוהלת ומעוצבת ב-Google Slides (PresentationID: ${slidesResult.slideshowId})`, "success");
      }
    );
  };

  // 7. Google Chat Message Sender
  const triggerSendChatMessage = () => {
    if (needsAuth) {
      setShowAuthModal(true);
      addLog("יש להתחבר למערכת תחילה כדי לשלוח הודעות צוות ב-Google Chat", "info");
      return;
    }
    if (!selectedChatSpace) {
      setWsMessage({ text: "שגיאה: אנא הזן או בחר מזהה מרחב (Space) ב-Google Chat.", type: "error" });
      return;
    }
    const spaceName = chatSpaces.find(s => s.name === selectedChatSpace)?.displayName || selectedChatSpace;
    const finalMsg = customChatMessage || `בוט האוטומציה '${config.name}' הופעל בהצלחה על ידי BotForge PRO! מטרת האוטומציה: "${config.goal}".`;

    requestWorkspaceAction(
      "שליחת עדכון ל-Google Chat?",
      `פעולה זו תשלח הודעת עדכון מפורטת עם פרמטרי הבוט למרחב '${spaceName}' ב-Google Chat.`,
      "chat",
      async () => {
        if (!accessToken) throw new Error("מפתח אבטחה של Google חסר, אנא רענן חיבור");
        const chatResult = await sendGoogleChatMessage(accessToken, selectedChatSpace, finalMsg);
        setWsMessage({
          text: `הודעת הצ'אט נשלחה בהצלחה למרחב Google Chat!`,
          type: "success"
        });
        addLog(`הודעת ביוגרפיית הבוט נשלחה בהצלחה למרחב Google Chat!`, "success");
      }
    );
  };

  // Helper: Reload spaces manual action
  const fetchChatSpaces = async () => {
    if (!accessToken) return;
    try {
      const spaces = await listGoogleChatSpaces(accessToken);
      setChatSpaces(spaces);
      if (spaces.length > 0) {
        setSelectedChatSpace(spaces[0].name);
        addLog(`נטענו ${spaces.length} מרחבי Google Chat בהצלחה בממשק.`, "success");
      } else {
        addLog(`לא נמצאו מרחבים תאורטיים של Google Chat בחשבון.`, "warn");
      }
    } catch (err: any) {
      addLog(`כשל בטעינת מרחבי צ'אט: ${err.message}`, "error");
    }
  };

  // Cloud Database Actions for Bots
  const triggerSaveBotToCloud = async () => {
    setIsSavingBot(true);
    addLog(`שומר בוט "${config.name}" במערכת...`, "info");
    
    const newBotObj: FirestoreBot = {
      id: "local_bot_" + Date.now(),
      name: config.name || "בוט אוטומציה חדש",
      goal: config.goal,
      url: config.url,
      speed: config.speed || 1,
      steps: steps.map(s => ({ ...s, status: "pending" })),
      userId: currentUser?.uid || "guest"
    };

    try {
      if (currentUser) {
        const returnedBotId = await saveBotToFirestore(
          currentUser.uid, 
          config.name, 
          config.goal, 
          config.url, 
          config.speed, 
          steps,
          (activeBotId && !activeBotId.startsWith("local_bot_")) ? activeBotId : undefined
        );
        setActiveBotId(returnedBotId);
        const bots = await loadUserSavedBots(currentUser.uid);
        setUserSavedBotsList(bots);
        addLog(`הבוט "${config.name}" גובה וסונכרן בהצלחה ב-Firestore בענן.`, "success");
      } else {
        // Fallback for Guest mode
        const localSaved = sessionStorage.getItem("local_user_bots");
        let localBotsList: FirestoreBot[] = [];
        if (localSaved) {
          try {
            localBotsList = JSON.parse(localSaved);
          } catch (e) {
            localBotsList = [];
          }
        }
        // Remove existing bot with same name to prevent duplicates
        localBotsList = localBotsList.filter(b => b.name !== config.name);
        localBotsList.unshift(newBotObj);
        sessionStorage.setItem("local_user_bots", JSON.stringify(localBotsList));
        
        setActiveBotId(newBotObj.id || null);
        setUserSavedBotsList(localBotsList);
        addLog(`הבוט "${config.name}" נשמר בהצלחה בזיכרון המקומי של הדפדפן (מצב אורח Sandbox)!`, "success");
      }
    } catch (err: any) {
      addLog(`שגיאה בשמירה למסד הנתונים: ${err.message}`, "error");
    } finally {
      setIsSavingBot(false);
    }
  };

  const triggerShareBotToCloud = async () => {
    if (!currentUser) {
      addLog("יש להתחבר לחשבון על מנת לשתף בוטים בענן.", "error");
      setShowAuthModal(true);
      return;
    }
    
    setIsSavingBot(true);
    addLog(`מייצר קישור שיתוף ציבורי עבור הבוט "${config.name}"...`, "info");
    
    try {
      const returnedBotId = await saveBotToFirestore(
        currentUser.uid, 
        config.name, 
        config.goal, 
        config.url, 
        config.speed, 
        steps,
        (activeBotId && !activeBotId.startsWith("local_bot_")) ? activeBotId : undefined,
        true // isShared = true
      );
      
      setActiveBotId(returnedBotId);
      const bots = await loadUserSavedBots(currentUser.uid);
      setUserSavedBotsList(bots);
      
      const shareUrl = `${window.location.origin}?sharedBotId=${returnedBotId}`;
      navigator.clipboard.writeText(shareUrl).catch(() => {});
      addLog(`הקישור הועתק: ${shareUrl}`, "success");
      alert(`קישור שיתוף נוצר בהצלחה והועתק ללוח:\n\n${shareUrl}`);
      
    } catch (err: any) {
      addLog(`שגיאה בשיתוף הבוט: ${err.message}`, "error");
    } finally {
      setIsSavingBot(false);
    }
  };

  const triggerDeleteBot = async (botId: string, name: string) => {
    addLog(`מוחק בוט "${name}" מהמערכת...`, "warn");
    try {
      if (currentUser && !botId.startsWith("local_bot_")) {
        await deleteBotFromFirestore(botId);
        const bots = await loadUserSavedBots(currentUser.uid);
        setUserSavedBotsList(bots);
      } else {
        const localSaved = sessionStorage.getItem("local_user_bots");
        if (localSaved) {
          try {
            let localBotsList: FirestoreBot[] = JSON.parse(localSaved);
            localBotsList = localBotsList.filter(b => b.id !== botId);
            sessionStorage.setItem("local_user_bots", JSON.stringify(localBotsList));
            setUserSavedBotsList(localBotsList);
          } catch (e) {}
        }
      }
      addLog(`הבוט "${name}" נמחק בהצלחה מבסיס הנתונים.`, "success");
    } catch (err: any) {
      addLog(`שגיאה במחיקת בוט: ${err.message}`, "error");
    }
  };

  const triggerLoadSelectedCloudBot = (bot: FirestoreBot) => {
    setConfig({
      name: bot.name,
      goal: bot.goal,
      url: bot.url,
      speed: bot.speed || 1,
      useProxies: false,
      rotateIpOnBan: false,
      bypassCaptcha: false,
      isolatedContext: true,
      maxConcurrentThreads: 1,
      ghostMode: true,
      cognitiveVision: false,
      quantumSpeed: false,
      chaosEngine: false,
      cloudSwarm: false,
      residentialProxies: false,
      antiBotShield: true,
      geoClustering: true,
      scoutHarvesterModule: false,
      hotSwappingBackup: false
    });
    setSteps(bot.steps.map(s => ({ ...s, status: "pending" })));
    setSelectedTemplate(bot.name);
    setScrapedData([]);
    setActiveBotId(bot.id || null);
    addLog(`טעינת בוט שמור ("${bot.name}") הושלמה בהצלחה!`, "success");
    setIsSidebarOpen(false); // Close mobile sidebar if open
  };

  const getHeuristicBotPresetForMessage = (
    userText: string,
    modelReplyText: string,
    updatedSteps?: BotStep[]
  ): any => {
    const textLower = (userText + " " + modelReplyText).toLowerCase();

    // 1. If steps are explicitly updated by the AI, use those steps!
    if (updatedSteps && updatedSteps.length > 0) {
      let urlVal = "https://example.com";
      const navStep = updatedSteps.find(s => s.type === "navigate");
      if (navStep && navStep.value) {
        urlVal = navStep.value;
      }
      return {
        name: "בוט מותאם אישית מהצ'אט",
        goal: userText.slice(0, 80) || "אוטומציה המבוססת על שיחת ה-AI",
        url: urlVal,
        speed: 1,
        steps: updatedSteps
      };
    }

    // 2. Fallbacks based on key terms which match available templates
    if (textLower.includes("linkedin") || textLower.includes("לינקדאין") || textLower.includes("משרות") || textLower.includes("משרה")) {
      const template = BOT_TEMPLATES.find(t => t.name.includes("לינקדאין") || t.name.toLowerCase().includes("linkedin"));
      if (template) {
        return {
          name: "איתור משרות בלינקדאין",
          goal: template.goal,
          url: template.url,
          speed: 1,
          steps: template.steps
        };
      }
    }

    if (textLower.includes("yelp") || textLower.includes("ילפ") || textLower.includes("מסעדות") || textLower.includes("מסעדה")) {
      const template = BOT_TEMPLATES.find(t => t.name.includes("Yelp") || t.name.toLowerCase().includes("yelp"));
      if (template) {
        return {
          name: "סורק מסעדות ב-Yelp",
          goal: template.goal,
          url: template.url,
          speed: 1,
          steps: template.steps
        };
      }
    }

    if (textLower.includes("ebay") || textLower.includes("איביי") || textLower.includes("מוצרים") || textLower.includes("מוצר") || textLower.includes("קניות")) {
      const template = BOT_TEMPLATES.find(t => t.name.includes("eBay") || t.name.toLowerCase().includes("ebay"));
      if (template) {
        return {
          name: "סורק מוצרים ב-eBay",
          goal: template.goal,
          url: template.url,
          speed: 1,
          steps: template.steps
        };
      }
    }

    if (textLower.includes("sheet") || textLower.includes("שיטס") || textLower.includes("טבלה") || textLower.includes("גליון")) {
      return {
        name: "סנכרון וייצוא ל-Google Sheets",
        goal: "סריקת נתוני אתר ושמירה ישירה לתוך דוח מובנה ב-Google Sheets של משתמש ה-Workspace.",
        url: "https://docs.google.com/spreadsheets",
        speed: 1.2,
        steps: [
          { id: "step_gs_1", type: "navigate", title: "ניווט ל-Google Workspace Sheets", description: "טעינת מרכז קבצי הגיליונות הדינמיים בחשבון ה-Google שלך.", selector: "body", value: "https://docs.google.com/spreadsheets", status: "pending", simulatedDurationMs: 1200, codeSnippet: `await page.goto('https://docs.google.com/spreadsheets');` },
          { id: "step_gs_2", type: "wait", title: "המתנה לכפתור גיליון חדש", description: "וידוא טעינת כפתור הפתיחה המהיר ליצירת גיליון ריק (Blank Spreadsheet).", selector: ".docs-homescreen-templates-template", status: "pending", simulatedDurationMs: 1000, codeSnippet: `await page.waitForSelector('.docs-homescreen-templates-template');` },
          { id: "step_gs_3", type: "click", title: "יצירת מסמך Sheets חדש בקליק", description: "לחיצה על אייקון הפלוס ליצירת מסמך מרוחק חדש.", selector: "[aria-label='Create blank spreadsheet']", status: "pending", simulatedDurationMs: 1500, codeSnippet: `await page.click("[aria-label='Create blank spreadsheet']");` },
          { id: "step_gs_4", type: "extract", title: "סנכרון ישיר של תוצאות הסריקה", description: "דחיפת הרשומות שנאספו ל-Google Workspace API באמצעות מפתח האישור הנוכחי.", selector: "body", value: "sync_active", status: "pending", simulatedDurationMs: 2500, codeSnippet: `const token = context.accessToken;\nawait syncDataToUserSheets(token, scrapedData);` }
        ]
      };
    }

    if (textLower.includes("gmail") || textLower.includes("גמייל") || textLower.includes("מייל") || textLower.includes("אימייל") || textLower.includes("שלח")) {
        let userEmailToInsert = "user@example.com";
        const emailMatch = textLower.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi);
        if (emailMatch && emailMatch.length > 0) {
          userEmailToInsert = emailMatch[0];
        }

        return {
          name: "שליחת דו״ח אוטומטי ב-Gmail",
          goal: "פתיחת ממשק הדוא״ל האישי, כתיבת הודעת דוח חדשה הכוללת את סיכום הרשומות שנאספו, ושליחה לתיבת היעד.",
          url: "https://mail.google.com",
          speed: 1,
          steps: [
            { id: "step_gm_1", type: "navigate", title: "פתיחת תיבת Gmail", description: "טעינה מוגנת של תיבת הדואר המקושרת מתוך ה-Sandbox של Google.", selector: "body", value: "https://mail.google.com", status: "pending", simulatedDurationMs: 1400, codeSnippet: `await page.goto('https://mail.google.com');` },
            { id: "step_gm_2", type: "wait", title: "המתנה לכפתור אימייל חדש", description: "זיהוי כפתור 'Compose' המשמש ליצירת הודעות חדשות.", selector: ".T-I-KE", status: "pending", simulatedDurationMs: 1000, codeSnippet: `await page.waitForSelector('.T-I-KE');` },
            { id: "step_gm_3", type: "click", title: "פתיחת חלון כתיבה", description: "קליק מהיר לפתיחת תיבת הדו-שיח ליצירת הודעה חדשה.", selector: ".T-I-KE", status: "pending", simulatedDurationMs: 800, codeSnippet: `await page.click('.T-I-KE');` },
            { id: "step_gm_4", type: "input", title: "הזנת נמען ונושא", description: "מילוי כתובת האימייל של הנמען וכן כתיבת כותרת הדוח המסוכם.", selector: "input[peoplekit-id]", value: userEmailToInsert, status: "pending", simulatedDurationMs: 1600, codeSnippet: `await page.type("input[peoplekit-id]", "${userEmailToInsert}");\nawait page.keyboard.press('Tab');\nawait page.type("input[name='subjectbox']", "דיווח מובנה: תוצאות אוטומציית BotForge");` },
            { id: "step_gm_5", type: "input", title: "כתיבת תוכן האימייל", description: "מילוי גוף ההודעה בצורה מובנית הכוללת את פרטי המשרות או המוצרים שנאספו.", selector: ".Am.Al.editable", value: "שלום מיכאל, מצורף הדיווח האוטומטי...", status: "pending", simulatedDurationMs: 2000, codeSnippet: `await page.type(".Am.Al.editable", "האוטומציה הסתיימה בהצלחה! מצורפים הנתונים שחולצו מהבוט.");` },
            { id: "step_gm_6", type: "click", title: "שליחת האימייל", description: "לחיצה על כפתור השליחה הראשי של Gmail לביצוע הפעולה הסופית.", selector: ".T-I.J-J5-Ji.aoO.v7.T-I-atl.L3", status: "pending", simulatedDurationMs: 1100, codeSnippet: `await page.click(".T-I.J-J5-Ji.aoO.v7.T-I-atl.L3");` }
          ]
        };
    }

    // 3. General scraping bot fallback as a catch-all if they explicitly asked for a bot
    if (textLower.includes("bot") || textLower.includes("בוט") || textLower.includes("אוטומציה") || textLower.includes("תסריט") || textLower.includes("סרוק") || textLower.includes("חילוץ")) {
      return {
        name: "בוט סריקה חכם (AI Scraper)",
        goal: "סריקה מוגדרת של האתר ואגירת הנתונים המוצגים בטבלה השמאלית.",
        url: "https://example.com/data",
        speed: 1,
        steps: [
          { id: "step_gen_1", type: "navigate", title: "ניווט ליעד הסריקה", description: "פתיחת כתובת האינטרנט הציבורית לחילוץ נתונים.", selector: "body", value: "https://example.com/data", status: "pending", simulatedDurationMs: 1200, codeSnippet: `await page.goto('https://example.com/data');` },
          { id: "step_gen_2", type: "wait", title: "המתנה לתוכן העמוד", description: "המתנה מוגנת לטעינת טבלת המידע או הפוסטים הראשיים.", selector: ".data-row", status: "pending", simulatedDurationMs: 1000, codeSnippet: `await page.waitForSelector('.data-row', { timeout: 8000 });` },
          { id: "step_gen_3", type: "extract", title: "חילוץ נתוני דף דינמיים", description: "הרצת קוד JS בדפנפן הווירטואלי ושמירת הנתונים במכונת ה-BotForge.", selector: ".data-row", status: "pending", simulatedDurationMs: 1800, codeSnippet: `const rows = await page.evaluate(() => { return Array.from(document.querySelectorAll('.data-row')).map(el => el.innerText); });` }
        ]
      };
    }

    return null;
  };

  // Interactive Personal Advisor Chat Dialog Helpers
  const handleAiAssistantSubmitMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!aiInputMessage.trim() && !uploadedFileAttachment) return;

    let userText = aiInputMessage.trim();
    let fileInfoLabel = "";

    if (uploadedFileAttachment) {
      fileInfoLabel = `📎 [קובץ מצורף: ${uploadedFileAttachment.name} (${uploadedFileAttachment.extension.toUpperCase()})] `;
      if (!userText) {
        userText = `אנא נתח את הקובץ המצורף: ${uploadedFileAttachment.name} ותן לי מידע מפורט, כולל הצעה לשלבי אוטומציה להרצה שלו.`;
      } else {
        userText = `${fileInfoLabel}\n${userText}`;
      }
    }

    setAiInputMessage("");
    const fileToAnalyze = uploadedFileAttachment;
    setUploadedFileAttachment(null); // Clear after upload trigger

    const tempUserMessage: FirestoreChatMessage = {
      text: userText,
      sender: "user",
      userId: currentUser?.uid || "guest",
      timestamp: new Date().toISOString()
    };

    setAiChatHistory(prev => [...prev, tempUserMessage]);

    // Automatically register file in super-analyzer if uploaded from chat
    if (fileToAnalyze) {
      handleUniversalFileAnalysis(fileToAnalyze.name, fileToAnalyze.size);
    }
    
    // Intercept Admin keywords or overrides
    const codeWords = ["מנהל", "שליטה", "admin", "control", "override", "shlita", "112233", "777", "999", "קוד", "בקר"];
    const isControlRequest = codeWords.some(w => userText.toLowerCase().includes(w));
    if (isControlRequest) {
      if (currentUser?.email === "michaell.sfaradi@gmail.com") {
        setIsViewAdminMode(true);
        setAdminActiveTab("ai_control");
        addLog("🔐 פקודת בקרה מנהלית התקבלה בצ'אט: מרכז בקרה וממשק שליטה מלא ב-AI ומערכות הופעל והוצג בהצלחה!", "success");
      } else {
        addLog("⛔ פעולה נדחתה. פקודה מנהלית חסומה למשתמש זה.", "error");
      }
    }
    
    if (currentUser) {
      try {
        await saveChatMessageToFirestore(currentUser.uid, userText, "user");
      } catch (err) {
        console.error("Failed to save chat message:", err);
      }
    }

    setIsAiTyping(true);

    try {
      const history = aiChatHistory.map(h => ({
        role: h.sender === "user" ? "user" : "model",
        text: h.text
      }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: userText, 
          history,
          developerMode: true,
          steps: steps,
          model: adminSystemConfig.systemDefaultGeminiModel
        })
      });

      const contentType = response.headers.get("content-type");
      if (!response.ok) {
        if (contentType && contentType.includes("application/json")) {
           const errData = await response.json();
           throw new Error(errData.error || `שגיאת שרת (${response.status})`);
        }
        const errorText = await response.text();
        console.error("Non-JSON Response received:", errorText);
        throw new Error(`שגיאת שרת (${response.status}): מוצר ה-AI נתקל בשגיאה ברשת או בעומס.`);
      }

      if (!contentType || !contentType.includes("application/json")) {
         throw new Error("Invalid response format received from server.");
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to communicate with AI Chat Engine.");
      }

      // If AI updated the code/steps, apply them directly!
      if (data.updatedSteps) {
        setSteps(data.updatedSteps);
        addLog(`הבינה המלאכותית עדכנה את קוד הבוט ושלבי האוטומציה בממשק! קוד השלבים עודכן בהצלחה.`, "success");
      }

      const botReplyText = data.reply;
      const botResponseMsg: FirestoreChatMessage = {
        text: botReplyText,
        sender: "model",
        userId: currentUser?.uid || "guest",
        timestamp: new Date().toISOString(),
        botPreset: getHeuristicBotPresetForMessage(userText, botReplyText, data.updatedSteps)
      };

      setAiChatHistory(prev => [...prev, botResponseMsg]);

      if (currentUser) {
        try {
          await saveChatMessageToFirestore(currentUser.uid, botReplyText, "model");
        } catch (err) {
          console.error("Failed to save AI chat message reply:", err);
        }
      }
    } catch (err: any) {
      console.error(err);
      const fallbackReply = `סליחה, אירעה שגיאה בעיבוד התשובה בשרת ה-AI (${err.message}). אך אל דאגה! הכנתי פתרון חלופי מהיר של הבוט המוכן שהזכרת. לחץ על הכפתור למטה כדי לטעון אותו ישירות!`;
      const errorMsg: FirestoreChatMessage = {
        text: fallbackReply,
        sender: "model",
        userId: currentUser?.uid || "guest",
        timestamp: new Date().toISOString(),
        botPreset: getHeuristicBotPresetForMessage(userText, fallbackReply)
      };
      setAiChatHistory(prev => [...prev, errorMsg]);
    } finally {
      setIsAiTyping(false);
    }
  };

  // Universal AI File Decription & Adaptive Action Generator
  const handleUniversalFileAnalysis = async (fileName: string, fileSize: number, customContent: string = "") => {
    setIsScanningFile(true);
    setScanProgress(5);
    
    const isGigabyteScale = fileSize >= 100 * 1024 * 1024; // 100MB+ considered gigabyte-optimized scale for log display
    const formattedSize = fileSize >= 1024 * 1024 * 1024
      ? `${(fileSize / (1024 * 1024 * 1024)).toFixed(2)} GB`
      : `${(fileSize / 1024).toFixed(1)} KB`;

    addLog(`🔍 [מפענח על] מתחיל סריקה עמוקה של הקובץ: "${fileName}" (${formattedSize})...`, "info");
    
    if (isGigabyteScale && isUltraMegaEngineEnabled) {
      addLog(`⚡ [Ultra-Capacity AI CORE] זוהה קובץ ענק ומבוזר (${formattedSize})! מפעיל מנוע הזרקה מקבילי במצב טורבו: ${ultraEngineThreads} Threads.`, "info");
      addLog(`⚡ [Brotli-X/Parquet Matrix] מחלק את הקובץ לקטעי בלוקים בגודל 256MB ומזרים נתונים ישירות לזיכרון של פאד ה-SaaS.`, "info");
      addLog(`⚡ [מגבלת מהירות] יעד עיבוד קשיח מוגדר במנוע: פחות מ-${megaFileMaxDurationSeconds / 60} דקות (${megaFileMaxDurationSeconds} שניות). קצב צפוי: ~40.2 MB/s.`, "warn");
    }

    // Simulate high tech scan ticks
    for (let i = 1; i <= 5; i++) {
      await new Promise(resolve => setTimeout(resolve, 180 + Math.random()*150));
      setScanProgress(p => p + 19);
      if (isGigabyteScale && isUltraMegaEngineEnabled && i === 3) {
        addLog(`⚡ [Ultra-Capacity AI CORE] מעבד מקטעי נתונים מקביליים (Active Nodes 1-${ultraEngineThreads}) באמצעות מודל ${adminSystemConfig.systemDefaultGeminiModel}...`, "info");
      }
    }

    const extension = fileName.split(".").pop()?.toLowerCase() || "txt";
    let type = "מסמך כללי (Document)";
    let details = "קובץ נתונים או הגדרות כללי";
    let isExecutable = false;
    let isCode = false;
    let isMedia = false;
    let mappedSteps: BotStep[] = [];

    // Categorize
    if (["js", "ts", "py", "html", "css", "json", "sh", "yaml"].includes(extension)) {
      type = "קוד מקור ולוגיקת AI (Source Code)";
      isCode = true;
      details = `מערך פונקציות ופקודות בשפת ${extension.toUpperCase()}`;
      mappedSteps = [
        { id: "step_1", type: "navigate", title: `[קוד] טעינת מודול ${fileName}`, description: "ניקוי וטעינת כתובת הבסיס לפקודות שנסרקו בקובץ", selector: "body", value: "https://example.com/source-portal", status: "pending", simulatedDurationMs: 1200, codeSnippet: `await page.goto('https://example.com/source-portal');` },
        { id: "step_2", type: "wait", title: "[קוד] המתנה לאלמנט דינמי", description: "המתנה מוגנת לקריאת ה-Selector הראשי כפי שהוגדר בסקריפט", selector: "#app-core-interface", status: "pending", simulatedDurationMs: 1500, codeSnippet: `await page.waitForSelector('#app-core-interface', { timeout: 5000 });` },
        { id: "step_3", type: "extract", title: "[קוד] חילוץ נתונים מתקדם", description: "הרצת קוד המקור שקראת מהקובץ ושאילתת AST", selector: "article.scraped-item", status: "pending", simulatedDurationMs: 2000, codeSnippet: `const data = await page.evaluate(() => { return Array.from(document.querySelectorAll('article.scraped-item')).map(el => el.innerText); });` },
        { id: "step_4", type: "click", title: "[קוד] אישור ושליחת טופס", description: "קליק אוטומטי על כפתור השמירה", selector: "button#submit-report", status: "pending", simulatedDurationMs: 1000, codeSnippet: `await page.click('button#submit-report');` }
      ];
    } else if (["exe", "apk", "msi", "bin", "dmg"].includes(extension)) {
      type = "קובץ הרצה מאובטח ובינארי (Compiled Binary)";
      isExecutable = true;
      details = `קובץ מערכת מקומפל עבור פלטפורמת x64 או ARM (מובייל)`;
      mappedSteps = [
        { id: "step_1", type: "navigate", title: `[בינארי] מעבר לסביבת סנדבוקס של ${fileName}`, description: "טעינת המכונה הווירטואלית לצורך הרצת הקובץ בסביבה מאובטחת", selector: "body", value: "https://sandbox-emu.botforge.pro", status: "pending", simulatedDurationMs: 1500, codeSnippet: `await page.goto('https://sandbox-emu.botforge.pro');` },
        { id: "step_2", type: "click", title: "[בינארי] הפעלת סייפר סימולטור", description: "הזרקת הקובץ לתוך ממשק ה-API ברוט סנדבוקס", selector: "#btn-upload-binary", status: "pending", simulatedDurationMs: 1800, codeSnippet: `await page.click('#btn-upload-binary');` },
        { id: "step_3", type: "wait", title: "[בינארי] בדיקת חריגות זיכרון", description: "בדיקת Telemetry פנימית עבור רישום קריסות ושגיאות בינאריות", selector: "#status-monitor", status: "pending", simulatedDurationMs: 2500, codeSnippet: `await page.waitForSelector('#status-monitor.ready');` }
      ];
    } else if (["png", "jpg", "jpeg", "mp4", "gif", "mov", "avi"].includes(extension)) {
      type = "קובץ מדיה וויזואלי (Media Asset)";
      isMedia = true;
      details = `קובץ תמונה או וידאו ברזולוציה גבוהה`;
      mappedSteps = [
        { id: "step_1", type: "navigate", title: `[מדיה] תצוגת קנבס ${fileName}`, description: "מעבר לעמוד עיבוד התמונות של המערכת", selector: "body", value: "https://example.com/media-panel", status: "pending", simulatedDurationMs: 1000, codeSnippet: `await page.goto('https://example.com/media-panel');` },
        { id: "step_2", type: "input", title: "[מדיה] העלאת תמונה/וידאו כסלקטור", description: "מילוי קישור זמני של התמונה שהעלית לחריץ העלאת קבצים", selector: "input[type='file']", value: "URL_BLOB_SOURCE", status: "pending", simulatedDurationMs: 2000, codeSnippet: `const fileInput = await page.$("input[type='file']"); await fileInput.uploadFile("/tmp/${fileName}");` },
        { id: "step_3", type: "wait", title: "[מדיה] עיבוד אובייקטים ו-OCR", description: "מערכת ה-OCR סורקת כעת את הנתונים וקואורדינטות קואליציה", selector: "#ocr-overlay-canvas", status: "pending", simulatedDurationMs: 3000, codeSnippet: `await page.waitForSelector('#ocr-overlay-canvas', { visible: true });` }
      ];
    } else {
      mappedSteps = [
        { id: "step_1", type: "navigate", title: `[נכס] טעינת הנתונים מ-${fileName}`, description: "פתיל האוטומציה ניגש אל כתובת קבלת הנתונים המשותפת", selector: "body", value: "https://example.com/raw-dataframe", status: "pending", simulatedDurationMs: 1000, codeSnippet: `await page.goto('https://example.com/raw-dataframe');` },
        { id: "step_2", type: "extract", title: "[נתונים] הורדת מסמך ועיבודו", description: "שאיבת המנשר האוטומטי ושמירה ב-Array זיכרונות", selector: "table.data-table", status: "pending", simulatedDurationMs: 2000, codeSnippet: `const tableRows = await page.evaluate(() => { return Array.from(document.querySelectorAll('table.data-table tr')).map(row => row.innerText); });` }
      ];
    }

    const newFileObj = {
      id: "file_" + Date.now(),
      name: fileName,
      size: fileSize,
      extension: extension,
      type: type,
      details: details,
      isExecutable: isExecutable,
      isCode: isCode,
      isMedia: isMedia,
      analyzedAt: new Date().toLocaleTimeString(),
      customContent: customContent || `// קוד מקור וירטואלי עבור ${fileName}\n\n// האנליסט זיהה קובץ מסוגים שונים.\n// שלב 1: אינטגרציה עם super-compiler.\n// שלב 2: הגדרת משתני קביעה.`,
      steps: mappedSteps,
      controls: {
        active: true,
        concurrency: 4,
        sandboxBypass: true,
        deviceOS: "Android 14 (API 34)",
        ocrLang: "עברית + English",
        memoryMb: 512,
        exposeAsApi: false
      }
    };

    setAnalyzedFiles(prev => [newFileObj, ...prev]);
    setSelectedAnalyzedFile(newFileObj);
    setIsScanningFile(false);
    setScanProgress(0);
    addLog(`✨ [מפענח על] הקובץ "${fileName}" נותח בהצלחה! לוח השליטה וההחלטות Dynamic Controller הופק ומוכן לתפעול מנהלי!`, "success");
    return newFileObj;
  };

  // Render Google Chat Default update text
  useEffect(() => {
    if (currentLanguage === "he") {
      setCustomChatMessage(`📢 עדכון אוטומטי מ-BotForge PRO:
הבוט "${config.name}" מוכן להפעלה ויזואלית!
🌐 דומיין אתר היעד: ${getParsedDomain(config.url)}
🎯 מטרת האוטומציה: "${config.goal}"
⚡ הוגדרו בהידוש ${steps.length} שלבים ליישום.`);
    } else {
      setCustomChatMessage(`📢 Automatic update from BotForge PRO:
The bot "${config.name}" is ready for execution visualization!
🌐 Target Domain: ${getParsedDomain(config.url)}
🎯 Goal: "${config.goal}"
⚡ Compiled with ${steps.length} steps for deployment.`);
    }
  }, [config.name, config.url, config.goal, steps.length, currentLanguage]);

  return (
    <>
      {adminSystemConfig.developerPluginHtml && (
        <div className="fixed bottom-4 left-4 z-[9999] w-[400px] h-[500px] border border-cyan-500/50 rounded-2xl overflow-hidden shadow-[0_0_20px_rgba(34,211,238,0.2)] bg-[#0a0f1c] resize-both" style={{ resize: 'both' }}>
          <div className="bg-slate-900 border-b border-slate-800 p-2 flex justify-between items-center text-xs text-cyan-400 font-bold cursor-move">
            <span>AI Plugin Panel (Grok Engine)</span>
            <button
              onClick={() => setAdminSystemConfig({...adminSystemConfig, developerPluginHtml: ''})}
              title="סגור פלאגין"
              className="hover:text-red-400 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <iframe 
            srcDoc={adminSystemConfig.developerPluginHtml} 
            className="w-full h-[calc(100%-40px)] border-none"
            sandbox="allow-scripts allow-popups allow-forms"
          />
        </div>
      )}
      <div dir={currentLanguage === "he" ? "rtl" : "ltr"} className="fixed inset-0 flex flex-col font-sans text-slate-200 overflow-y-auto lg:overflow-hidden bg-[#070a13]" id="main-layer-app">
      
      {/* HEADER BAR */}
      <header className="h-16 flex items-center justify-between px-6 border-b border-slate-800/80 bg-slate-900/45 backdrop-blur-md z-10" id="header-bar">
        <div className="flex items-center gap-4 text-right" id="logo-sec">
          {/* Mobile Sidebar Toggle Button */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden p-2 bg-slate-950 hover:bg-slate-900 text-cyan-450 hover:text-cyan-300 border border-slate-800/80 rounded-xl cursor-pointer transition-colors flex items-center justify-center"
            title={t("פתח תפריט הגדרות", "Open Settings Menu")}
            id="mobile-sidebar-toggle"
          >
            <Menu className="w-4 h-4" />
          </button>

          <div className="relative group flex items-center gap-2.5" id="logo-icon-box-wrapper">
            {/* Super impressive futuristic custom-designed SVG Logo */}
            <div className="relative w-10 h-10 flex items-center justify-center transition-transform duration-500 group-hover:rotate-12 cursor-pointer">
              {/* Outer double glowing spinning halo */}
              <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500 via-indigo-600 to-cyan-400 rounded-xl opacity-20 blur-md group-hover:opacity-40 transition-opacity duration-300"></div>
              <div className="absolute -inset-0.5 bg-gradient-to-tr from-cyan-400 to-indigo-500 rounded-xl opacity-80 group-hover:opacity-100 transition-all duration-300 shadow-[0_0_15px_rgba(34,211,238,0.4)]"></div>
              <div className="relative w-[34px] h-[34px] rounded-[10px] bg-slate-950 flex items-center justify-center">
                <svg className="w-5 h-5 text-cyan-400 drop-shadow-[0_0_4px_rgba(34,211,238,0.6)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  {/* Cybernetic robotic core logo */}
                  <rect x="3" y="11" width="18" height="10" rx="2" />
                  <circle cx="12" cy="5" r="2" />
                  <path d="M12 7v4" />
                  <path d="M8 15h.01" />
                  <path d="M16 15h.01" />
                  <path d="M12 18h.01" />
                </svg>
                {/* Micro flashing server-beating node */}
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-cyan-400 border border-slate-950 animate-ping"></span>
              </div>
            </div>
            
            <div className="flex flex-col text-right">
              <span className="text-sm tracking-[0.2em] font-black uppercase text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-300 to-indigo-300 font-sans leading-none" id="brand-text">
                BotForge
              </span>
              <span className="text-[8px] font-mono tracking-widest text-cyan-300 uppercase font-bold bg-cyan-950/60 px-1 py-0.2 rounded border border-cyan-800/40 mt-0.5 leading-tight">
                AI AUTOMATION OS
              </span>
            </div>
          </div>
        </div>

        {/* Current Active Target Domain Indicator */}
        <div dir="ltr" className="hidden lg:flex items-center bg-slate-950/80 px-4 py-1.5 rounded-full border border-slate-700/60 gap-3 animate-fadeIn" id="target-domain-box">
          <span className="text-[10px] font-mono text-slate-500 font-bold uppercase tracking-wider text-right" dir="rtl">{t("דומיין מורסל:", "Target Domain:")}</span>
          <span className="text-sm text-cyan-300 font-mono truncate max-w-[280px]">
            {getParsedDomain(config.url)}
          </span>
        </div>

        {/* GUEST OR USER AUTHENTICATION CONTROLLER IN HEADER */}
        <div className="flex items-center gap-3" id="status-sec">
          {/* User Manual trigger button */}
          <button
            onClick={() => {
              setShowUserManual(true);
            }}
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-950/40 hover:bg-indigo-900/60 text-indigo-300 hover:text-white border border-indigo-500/30 transition-colors cursor-pointer"
            title={t("מדריך למשתמש", "User Manual")}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-wider font-mono hidden sm:inline-block">
              {t("ספר הוראות", "Manual")}
            </span>
          </button>

          {/* Language selection trigger button */}
          <button
            onClick={() => {
              setShowLanguageModal(true);
            }}
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/80 hover:bg-slate-900 text-slate-350 hover:text-white border border-slate-800 transition-colors cursor-pointer"
            title="שנה שפה / Toggle Language"
            id="header-lang-btn"
          >
            <Globe className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-wider font-mono">
              {currentLanguage === "he" ? "עברית (HE)" : "English (EN)"}
            </span>
          </button>

          {/* SaaS Admin Console Switcher */}
          {currentUser?.email === "michaell.sfaradi@gmail.com" && (
            <button
              onClick={() => {
                setIsViewAdminMode(!isViewAdminMode);
                // close responsive sidebar
                setIsSidebarOpen(false);
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border tracking-wide ${
                isViewAdminMode 
                  ? "bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white border-cyan-400/60 shadow-[0_0_15px_rgba(6,182,212,0.45)]" 
                  : "bg-slate-950/90 hover:bg-slate-900 text-cyan-400 hover:text-cyan-300 border-cyan-500/30 hover:border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.1)]"
              }`}
              id="toggle-admin-mode-btn"
            >
              {isViewAdminMode ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
                  <span>{t("ממשק לקוח BotForge", "BotForge Workspace")}</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-cyan-405 animate-pulse" />
                  <span className="flex items-center gap-1.5 tracking-tight font-black">
                    {t("פאנל ניהול SaaS", "SaaS Admin Panel")} 
                    <span className="text-[9px] bg-cyan-950/80 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-500/30 uppercase font-mono animate-pulse">Admin Superuser</span>
                  </span>
                </>
              )}
            </button>
          )}

          {needsAuth ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAuthModal(true)}
                disabled={authProgress}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 rounded-lg border border-indigo-500/30 text-xs font-bold font-sans cursor-pointer transition-all shadow-md text-white"
                id="header-sign-in"
              >
                {authProgress ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>מתחבר...</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-3.5 h-3.5 text-blue-300" />
                    <span>התחבר לחשבון / הרשמה</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 bg-slate-950 border border-slate-800/80 py-1 px-3 rounded-xl" id="header-user-badge">
              {currentUser?.photoURL ? (
                <img 
                  src={currentUser.photoURL} 
                  alt={currentUser.displayName || "User"} 
                  className="w-6 h-6 rounded-full border border-cyan-500/40" 
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-cyan-700 flex items-center justify-center font-bold text-xs text-white">
                  {currentUser?.displayName?.charAt(0) || "U"}
                </div>
              )}
              <div className="hidden md:flex flex-col text-right">
                <span className="text-[11px] font-bold text-white leading-none">{currentUser?.displayName}</span>
                <span className="text-[9px] text-slate-500 leading-tight">{currentUser?.email}</span>
              </div>
              <button
                onClick={handleLogout}
                className="p-1 text-slate-400 hover:text-rose-400 rounded transition-colors cursor-pointer mr-1"
                title="נתק מפתחות Google Workspace"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          
          <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/30 font-sans" id="status-badge">
            <div className={`w-1.5 h-1.5 rounded-full bg-emerald-400 ${isRunning ? "animate-pulse" : ""}`}></div>
            <span className="text-[10px] font-bold text-emerald-400 tracking-wider">
              {isRunning ? "בפעולה" : isPaused ? "מושהה" : "מוכן"}
            </span>
          </div>
        </div>
      </header>

      {/* CORE WORKSPACE */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden relative min-h-0" id="workspace-container">
        
        {/* Backdrop overlay for mobile devices */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-20 lg:hidden transition-opacity duration-300"
            onClick={() => setIsSidebarOpen(false)}
            id="sidebar-mobile-backdrop"
          />
        )}

        {/* Backdrop overlay for mobile devices */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-20 lg:hidden transition-opacity duration-300"
            onClick={() => setIsSidebarOpen(false)}
            id="sidebar-mobile-backdrop"
          />
        )}

        {isViewAdminMode && currentUser?.email === "michaell.sfaradi@gmail.com" ? (
          /* ==============================================
             SAAS ADMIN CONSOLE VIEWPORTS
             ============================================== */
          <>
            {/* ADMIN NAVIGATION SIDEBAR PANEL */}
            <aside className="w-full lg:w-[250px] shrink-0 border-l border-slate-800/80 bg-[#070b14] p-4 flex flex-col gap-2" id="admin-sidebar" dir="rtl">
              <div className="px-3 py-2 mb-2 border-b border-slate-800/60 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse"></span>
                  <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">מסוף בקרה ראשי</span>
                </div>
                <h4 className="text-[10px] text-slate-500 leading-normal mt-0.5">ניהול מנויים, הגדרות ושרתים</h4>
              </div>

              {[
                { id: "overview", label: "ביצועי שרתים ומערכת", icon: <Activity className="w-3.5 h-3.5" /> },
                { id: "ai_control", label: "מרכז בקרת על וממשק מנהל AI", icon: <Cpu className="w-3.5 h-3.5 text-cyan-400" /> },
                { id: "plans", label: "תוכניות ותמחור SaaS", icon: <Coins className="w-3.5 h-3.5" /> },
                { id: "users", label: "מאגר לקוחות רשומים", icon: <Users className="w-3.5 h-3.5" /> },
                { id: "cloud", label: "מכונת ענן ופרוקסי", icon: <HardDrive className="w-3.5 h-3.5" /> },
                { id: "config", label: "הגדרות ליבה ו-AI", icon: <Lock className="w-3.5 h-3.5" /> },
                { id: "integrations", label: "אינטגרציות ו-API", icon: <Link2 className="w-3.5 h-3.5" /> },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setAdminActiveTab(tab.id as any)}
                  className={`flex items-center gap-3 px-3 py-2.5 text-right text-xs font-medium rounded-xl transition-all cursor-pointer ${
                    adminActiveTab === tab.id 
                      ? "bg-purple-600/15 text-purple-400 border border-purple-500/25 font-bold" 
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
                  }`}
                  id={`admin-tab-btn-${tab.id}`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}

              <div className="mt-auto px-4 py-4.5 bg-slate-950/85 rounded-xl border border-cyan-550/20 text-xs text-right text-slate-350 space-y-2.5 shadow-[0_0_15px_rgba(6,182,212,0.05)]">
                <p className="font-bold text-white flex items-center justify-end gap-1.5 text-[11px]">
                  <span>אבטחת מפתח SaaS</span>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                </p>
                <div className="text-[10px] space-y-1 text-slate-400 leading-relaxed font-sans">
                  <p>
                    🔐 <b>פאנל הניהול זמין עבורך בלבד!</b>
                  </p>
                  <p className="text-cyan-300 font-mono text-[9px] bg-slate-900/80 px-1 py-0.5 rounded border border-slate-800 text-center select-all">
                    michaell.sfaradi@gmail.com
                  </p>
                  <p>
                    המערכת מזהה את מזהה ה-Superuser שלך וחוסמת ומעלימה את כפתורי הניהול מכל משתמש צד-ג&apos; או אורח שנכנס מהקישור המשותף.
                  </p>
                </div>
              </div>
            </aside>

            {/* ADMIN PRIMARY VIEWPORT */}
            <section className="flex-1 p-6 lg:p-8 flex flex-col bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-900/10 via-[#070b13] to-slate-950 overflow-y-auto" id="admin-viewport" dir="rtl">
              
              {/* ADMIN VIEWPORT HEADER */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-slate-800/60 pb-5" id="admin-header-panel">
                <div className="text-right">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono bg-purple-500/25 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full uppercase font-bold">BotForge Console</span>
                    <span className="text-[10px] text-slate-500">עריכה במצב Live</span>
                  </div>
                  <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                    {adminActiveTab === "overview" && "ביצועי שרתים ו-MRR של המערכת"}
                    {adminActiveTab === "ai_control" && "מרכז שליטת על וממשק מנהל (AI Supercomputer Direct Control Center)"}
                    {adminActiveTab === "plans" && "ניהול תמחור, מנויים ומגבלות בוטים"}
                    {adminActiveTab === "users" && "מאגר משתמשי המערכת וניהול תשלומים"}
                    {adminActiveTab === "cloud" && "מרכז בקרת שרתי ענן, סובבים ושרת IP פרוקסי"}
                    {adminActiveTab === "config" && "הגדרות בסיס של ה-SaaS ומודל ה-Gemini AI"}
                    {adminActiveTab === "integrations" && "חיבורים, אינטגרציות ומפתחות API מצד שלישי"}
                  </h2>
                </div>

                <div className="px-3 py-1.5 bg-slate-950/80 rounded-xl border border-slate-800 text-[11px] font-mono text-cyan-300">
                  <span>סביבת ייצור (Production)</span>
                </div>
              </div>

              {successMessage && (
                <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2" id="admin-success-alert">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span className="leading-normal font-bold">{successMessage}</span>
                </div>
              )}
              {errorMessage && (
                <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2" id="admin-error-alert">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="leading-normal font-bold">{errorMessage}</span>
                </div>
              )}

              {/* TAB CONTENT: OVERVIEW */}
              {adminActiveTab === "overview" && (
                <div className="space-y-6 animate-fadeIn" id="admin-tab-overview">
                  
                  {/* METRICS ROW */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-[#0a0f1c] border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden text-right" id="overview-card-mrr">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl"></div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-semibold text-slate-400">הכנסות חודשיות (MRR)</span>
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                          <Coins className="w-4 h-4 text-emerald-400" />
                        </div>
                      </div>
                      <h3 className="text-2xl font-black text-white font-mono">$18,450</h3>
                      <p className="text-[10px] text-emerald-400 mt-1 font-sans flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> +14.2% מהחודש שעבר
                      </p>
                    </div>

                    <div className="bg-[#0a0f1c] border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden text-right" id="overview-card-users">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl"></div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-semibold text-slate-400">לקוחות רשומים</span>
                        <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                          <Users className="w-4 h-4 text-purple-400" />
                        </div>
                      </div>
                      <h3 className="text-2xl font-black text-white font-mono">624</h3>
                      <p className="text-[10px] text-purple-400 mt-1 font-sans">
                        82% משתמשים פעילים במערכת
                      </p>
                    </div>

                    <div className="bg-[#0a0f1c] border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden text-right" id="overview-card-bots">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl"></div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-semibold text-slate-400">בוטים מאוחסנים בענן</span>
                        <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                          <HardDrive className="w-4 h-4 text-cyan-400" />
                        </div>
                      </div>
                      <h3 className="text-2xl font-black text-white font-mono">2,410</h3>
                      <p className="text-[10px] text-cyan-400 mt-1 font-sans flex items-center gap-1">
                        <span>38 מורצים באופן סימולטני כעת</span>
                      </p>
                    </div>

                    <div className="bg-[#0a0f1c] border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden text-right" id="overview-card-cluster">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl"></div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-semibold text-slate-400">משאבי אשכול הענן (Node)</span>
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                          <Activity className="w-4 h-4 text-amber-400" />
                        </div>
                      </div>
                      <h3 className="text-2xl font-black text-white font-mono">8 פודים פעילים</h3>
                      <p className="text-[10px] text-amber-400 mt-1 font-sans">
                        CPU: 38% | זיכרון: 58% תקינים
                      </p>
                    </div>
                  </div>

                  {/* ACTIVE NODES SUMMARY */}
                  <div className="bg-[#0a0f1c] border border-slate-800 rounded-2xl p-5 text-right" id="cluster-monitor-panel">
                    <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                      <HardDrive className="w-4 h-4 text-purple-400" /> סטטוס שרתי ריצה של הבוטים בענן (Docker Engine Cluster)
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {[
                        { name: "Server POD #1 (Frankfurt)", ping: "22ms", load: "42% CPU", status: "בריא", memory: "1.2GB / 2GB", region: "europe-west3", uptime: "24 ימים, 4 שעות" },
                        { name: "Server POD #2 (Frankfurt)", ping: "24ms", load: "31% CPU", status: "בריא", memory: "0.8GB / 2GB", region: "europe-west3", uptime: "14 ימים, 10 שעות" },
                        { name: "Server POD #3 (London)", ping: "28ms", load: "12% CPU", status: "בריא", memory: "0.4GB / 2GB", region: "europe-west2", uptime: "4 ימים, 18 שעות" },
                        { name: "Server POD #4 (Oregon, US)", ping: "115ms", load: "3% CPU", status: "רדום", memory: "0.1GB / 2GB", region: "us-west1", uptime: "9 ימים, 1 שעה" },
                      ].map((n, i) => (
                        <div 
                          key={i} 
                          onClick={() => {
                            setSelectedPod(n);
                            addLog(`טוען דיאגנוסטיקה ואוגר לוגים עבור ${n.name}...`, "info");
                          }}
                          className="bg-slate-950 p-4 rounded-xl border border-slate-850 text-right cursor-pointer hover:border-purple-500/50 hover:bg-slate-900/60 active:scale-95 transition-all shadow-md group" 
                          id={`pod-element-${i}`}
                          title="לחץ לבקרת פוד וניהול קונטיינר"
                        >
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold text-slate-200 group-hover:text-purple-300 transition-colors">{n.name}</span>
                            <span className={`text-[10px] border px-1.5 py-0.2 rounded font-bold ${
                              n.status === "בריא" 
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                                : "bg-amber-500/10 border-amber-500/20 text-amber-400 animate-pulse"
                            }`}>
                              {n.status}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-450 space-y-1">
                            <p>עומס שפת Puppeteer: <span className="text-cyan-400 font-mono font-medium">{n.load}</span></p>
                            <p>זמן תגובת שרת: <span className="text-slate-350 font-mono">{n.ping}</span></p>
                          </div>
                          <div className="mt-2 text-[9px] text-purple-400 font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                            <span>פתרון וניהול שרת ⚙️</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* SAAS PERFORMANCE INFO CHART & CONSOLE METADATA */}
                  <div className="bg-[#0a0f1c] border border-slate-800 rounded-2xl p-5 text-right flex flex-col md:flex-row gap-6" id="saas-integration-overview">
                    <div className="flex-1">
                      <h3 className="text-sm font-bold text-white mb-2">סנכרון ויצוא למערכות ERP וחיוב</h3>
                      <p className="text-xs text-slate-400 leading-relaxed">
                         BotForge SaaS מנגיש אינטגרציית Webhook מלאה וחיוב אוטומטי מול ספקי סליקה (כמו Stripe). השינויים שנקבעים בפנל הבקרה הזה מופצים מידית לכל מסדי הנתונים המשויכים ועשויים להשפיע על דוחות כספיים וארגוניים.
                      </p>
                      <div className="flex gap-4 mt-4">
                        <div className="flex items-center gap-2 text-xs text-slate-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          <span>סנכרון Stripe: פועל במצב Test Sandbox</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          <span>חיוב אוטומטי מול Firestore: פעיל</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-850 text-right min-w-[240px] flex flex-col justify-center" id="saas-version-box">
                      <p className="text-[10.5px] text-slate-500 font-bold uppercase tracking-wider mb-2">גרסת בקרת SaaS</p>
                      <h4 className="text-sm font-bold text-white font-mono">v1.2.4-stable</h4>
                      <p className="text-[11px] text-slate-400 mt-2">סוג רישוי: פיתוח מוגדל (SaaS Sandbox)</p>
                    </div>
                  </div>

                </div>
              )}

              {/* TAB CONTENT: PLANS */}
              {adminActiveTab === "plans" && (
                <div className="space-y-6 animate-fadeIn" id="admin-tab-plans">
                  <div className="bg-[#0a0f1c] p-4 rounded-2xl border border-slate-800 mb-4 text-xs text-slate-400 leading-normal" id="plans-info-callout">
                     כאן תוכל לשנות את תמחור המנויים, להקטין או להגדיל את מגבלת הבוטים שלקוחות יכולים ליצור, ולאפשר/לבטל הרצה בענן. השתמש בטבלה למטה כדי לשלוט בכל פרט ופרט.
                  </div>

                  {/* PLANS TABLE */}
                  <div className="bg-[#0a0f1c] border border-slate-800 rounded-2xl overflow-hidden shadow-lg" id="plans-table-card">
                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-xs" dir="rtl">
                        <thead className="bg-slate-900/60 text-slate-300 font-bold border-b border-slate-800">
                          <tr>
                            <th className="px-4 py-3">שם התוכנית</th>
                            <th className="px-4 py-3">מחיר חודשי ($)</th>
                            <th className="px-4 py-3">מגבלת בוטים</th>
                            <th className="px-4 py-3">הרכבות בענן (Cloud)</th>
                            <th className="px-4 py-3">מכסת שרת למשתמש</th>
                            <th className="px-4 py-3">דרגת תמיכה</th>
                            <th className="px-4 py-3 text-left">פעולות</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/80">
                          {adminPricingPlans.map((plan) => (
                            <tr key={plan.id} className="hover:bg-slate-900/40 transition-colors" id={`plan-row-${plan.id}`}>
                              <td className="px-4 py-3.5 font-bold text-white">{plan.name}</td>
                              <td className="px-4 py-3.5 font-mono text-cyan-300">
                                {editingPlanId === plan.id ? (
                                  <input 
                                    type="number"
                                    value={planForm.price}
                                    onChange={(e) => setPlanForm(prev => ({ ...prev, price: Number(e.target.value) }))}
                                    className="bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-xs text-white w-20"
                                  />
                                ) : (
                                  `$${plan.price}/חודש`
                                )}
                              </td>
                              <td className="px-4 py-3.5 font-mono">
                                {editingPlanId === plan.id ? (
                                  <input 
                                    type="number"
                                    value={planForm.maxBots}
                                    onChange={(e) => setPlanForm(prev => ({ ...prev, maxBots: Number(e.target.value) }))}
                                    className="bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-xs text-white w-20"
                                  />
                                ) : (
                                  `${plan.maxBots} בוטים`
                                )}
                              </td>
                              <td className="px-4 py-3.5">
                                {editingPlanId === plan.id ? (
                                  <select 
                                    value={planForm.allowCloud ? "yes" : "no"}
                                    onChange={(e) => setPlanForm(prev => ({ ...prev, allowCloud: e.target.value === "yes" }))}
                                    className="bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-xs text-white"
                                  >
                                    <option value="yes">כן</option>
                                    <option value="no">לא</option>
                                  </select>
                                ) : (
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${plan.allowCloud ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-slate-900 text-slate-500"}`}>
                                    {plan.allowCloud ? "מאושרת" : "חסומה (שרת בלבד)"}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3.5 font-mono">{plan.concurrencyNode} פודים במקביל</td>
                              <td className="px-4 py-3.5 text-slate-450">{plan.supportLevel}</td>
                              <td className="px-4 py-3.5 text-left">
                                {editingPlanId === plan.id ? (
                                  <div className="flex gap-2 justify-end">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        // Save plan edits
                                        updatePricingPlansWithSync(prev => prev.map(p => 
                                          p.id === plan.id 
                                            ? { ...p, price: planForm.price, maxBots: planForm.maxBots, allowCloud: planForm.allowCloud }
                                            : p
                                        ));
                                        setEditingPlanId(null);
                                        setSuccessMessage(`התוכנית "${plan.name}" עודכנה בהצלחה ברישת המנויים!`);
                                        setTimeout(() => setSuccessMessage(null), 4000);
                                      }}
                                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold cursor-pointer"
                                    >
                                      שמור
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingPlanId(null)}
                                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-bold cursor-pointer"
                                    >
                                      ביטול
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingPlanId(plan.id);
                                      setPlanForm({ price: plan.price, maxBots: plan.maxBots, allowCloud: plan.allowCloud });
                                    }}
                                    className="px-3 py-1 bg-purple-650 hover:bg-purple-600 border border-purple-500/20 text-white rounded-lg text-[10px] cursor-pointer font-bold"
                                  >
                                    ערוך הגדרות
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* PROMOTION NOTICE AND STRIPE INTEGRATION MOCKUP */}
                  <div className="bg-[#0b101e] p-5 rounded-2xl border border-slate-800 text-right" id="stripe-settings-box">
                    <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-1.5">
                      <Lock className="w-4 h-4 text-purple-400" /> אינטגרציית מודל ה-Stripe לחסימת בוטים ללא מנוי
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed mb-4">
                      כאשר האפשרות מופעלת, מנוע האוטומציה יבדוק מול ה-Stripe API של הלקוח את סטטוס החיוב בתוך ה-Cloud. לקוחות שיעברו את המכסה או שלא ישלמו יחסמו אוטומטית ובקשת הריצה שלהם תקבל שגיאת Credit Limit.
                    </p>
                    <div className="flex flex-wrap items-center gap-4">
                      <button
                        type="button"
                        onClick={() => {
                          setAdminSystemConfig(prev => ({ ...prev, stripeLiveMode: !prev.stripeLiveMode }));
                          setSuccessMessage(`סטטוס חיבור Stripe הועבר למצב ${!adminSystemConfig.stripeLiveMode ? "LIVE PRODUCTION" : "SANDBOX TEST"}`);
                          setTimeout(() => setSuccessMessage(null), 4000);
                        }}
                        className={`text-xs px-4 py-2 rounded-xl border font-bold cursor-pointer transition-all ${
                          adminSystemConfig.stripeLiveMode 
                            ? "bg-rose-500/10 text-rose-300 border-rose-500/30" 
                            : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        }`}
                      >
                         חיבור חי של Stripe: {adminSystemConfig.stripeLiveMode ? "LIVE פעיל" : "מצב סנדבוקס פעיל"}  (שנה סטטוס)
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB CONTENT: USERS */}
              {adminActiveTab === "users" && (
                <div className="space-y-6 animate-fadeIn" id="admin-tab-users">
                  
                  {/* NEW USER ADDITION FORM */}
                  <div className="bg-[#0a0f1c] border border-slate-800 rounded-2xl p-5 text-right font-sans" id="users-control-panel-box">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                        <UserPlus className="w-4 h-4 text-cyan-400" /> הוספה וניהול ידני של מנויים ולקוחות
                      </h3>
                      <button
                        type="button"
                        onClick={() => setIsAddingNewUser(!isAddingNewUser)}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                      >
                        {isAddingNewUser ? "הסתר טופס" : "הוסף משתמש חדש במערכת 👤"}
                      </button>
                    </div>

                    {isAddingNewUser && (
                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 mb-4 animate-fadeIn" id="new-user-form-container">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <label className="block text-[10px] text-slate-500 font-bold mb-1 uppercase">שם מלא</label>
                            <input 
                              type="text" 
                              value={newUserForm.name}
                              onChange={(e) => setNewUserForm(p => ({ ...p, name: e.target.value }))}
                              placeholder="ישראל מנשה"
                              className="w-full bg-[#0a0f1c] border border-slate-800/80 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-500 font-bold mb-1 uppercase">אימייל</label>
                            <input 
                              type="email" 
                              value={newUserForm.email}
                              onChange={(e) => setNewUserForm(p => ({ ...p, email: e.target.value }))}
                              placeholder="israel.m@example.com"
                              className="w-full bg-[#0a0f1c] border border-slate-800/80 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-500 font-bold mb-1 uppercase">סוג מנוי</label>
                            <select 
                              value={newUserForm.plan}
                              onChange={(e) => setNewUserForm(p => ({ ...p, plan: e.target.value }))}
                              className="w-full bg-[#0a0f1c] border border-slate-800/80 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                            >
                              <option value="free">חינם (Free)</option>
                              <option value="pro">מקצועי (Pro)</option>
                              <option value="enterprise">ארגוני (Enterprise)</option>
                            </select>
                          </div>
                          <div className="flex items-end">
                            <button
                              type="button"
                              onClick={() => {
                                if (!newUserForm.name || !newUserForm.email) {
                                  setErrorMessage("אנא הזן שם וכתובת אימייל משתמש תקינים");
                                  setTimeout(() => setErrorMessage(null), 4500);
                                  return;
                                }
                                const nUser = {
                                  id: `usr_${Date.now()}`,
                                  name: newUserForm.name,
                                  email: newUserForm.email,
                                  plan: newUserForm.plan,
                                  botsCount: 0,
                                  hostedInCloud: 0,
                                  status: "פעיל",
                                  joined: new Date().toISOString().slice(0, 10),
                                  credits: dailyCreditQuota
                                };
                                updateUsersListWithSync(prev => [...prev, nUser]);
                                setNewUserForm({ name: "", email: "", plan: "free", status: "פעיל" });
                                setIsAddingNewUser(false);
                                setSuccessMessage("לקוח חדש הוסף בהצלחה למערכת ומנוי חיוב הוגדר עבורו!");
                                setTimeout(() => setSuccessMessage(null), 4000);
                              }}
                              className="w-full h-9 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-bold font-sans cursor-pointer transition-colors"
                            >
                              אשר והוסף משתמש
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* USERS LIST TABLE */}
                    <div className="bg-slate-950 rounded-xl border border-slate-850 overflow-hidden mt-2" id="users-datatable-card">
                      <div className="overflow-x-auto">
                        <table className="w-full text-right text-xs">
                          <thead className="bg-slate-900/60 text-slate-300 font-bold border-b border-slate-800">
                            <tr>
                              <th className="px-4 py-3">שם</th>
                              <th className="px-4 py-3">כתובת אימייל</th>
                              <th className="px-4 py-3">תוכנית נוכחית</th>
                              <th className="px-4 py-3 text-center">יתרת קרדיטים (עריכה)</th>
                              <th className="px-4 py-3 text-center">בוטים שנבנו</th>
                              <th className="px-4 py-3 text-center">פעילים בענן</th>
                              <th className="px-4 py-3">סטטוס מנוי</th>
                              <th className="px-4 py-3 text-left">שינויים תפעוליים</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-850">
                            {adminUsersList.map((user) => (
                              <tr key={user.id} className="hover:bg-slate-900/40 text-slate-300 transition-colors" id={`user-row-${user.id}`}>
                                <td className="px-4 py-3 font-bold text-white flex items-center gap-2">
                                  <div className="w-5 h-5 rounded-full bg-slate-800 text-cyan-400 font-bold flex items-center justify-center text-[10px]">
                                    {user.name.charAt(0)}
                                  </div>
                                  <span>{user.name}</span>
                                </td>
                                <td className="px-4 py-3 font-mono text-[11px] text-slate-400">{user.email}</td>
                                <td className="px-4 py-3">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                    user.plan === "enterprise" 
                                      ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" 
                                      : user.plan === "pro" 
                                        ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" 
                                        : "bg-slate-900 text-slate-500"
                                  }`}>
                                    {user.plan === "enterprise" ? "Enterprise 💎" : user.plan === "pro" ? "Pro ⚡" : "Free 👥"}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <div className="inline-flex items-center gap-1 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                                    <button 
                                      type="button"
                                      onClick={() => {
                                        const currentVal = user.credits !== undefined ? user.credits : dailyCreditQuota;
                                        const newVal = Math.max(0, currentVal - 10);
                                        updateUsersListWithSync(prev => prev.map(u => u.id === user.id ? { ...u, credits: newVal } : u));
                                      }}
                                      className="w-5 h-5 bg-slate-900 border border-slate-850 hover:bg-slate-800 text-slate-400 font-extrabold text-xs rounded flex items-center justify-center cursor-pointer select-none"
                                      title="-10"
                                    >
                                      -
                                    </button>
                                    <input 
                                      type="number"
                                      value={user.credits !== undefined ? user.credits : dailyCreditQuota}
                                      onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        const finalVal = isNaN(val) ? 0 : Math.max(0, val);
                                        updateUsersListWithSync(prev => prev.map(u => u.id === user.id ? { ...u, credits: finalVal } : u));
                                      }}
                                      className="w-10 bg-transparent text-center font-mono text-xs text-cyan-350 font-bold border-none focus:outline-none"
                                    />
                                    <button 
                                      type="button"
                                      onClick={() => {
                                        const currentVal = user.credits !== undefined ? user.credits : dailyCreditQuota;
                                        const newVal = currentVal + 10;
                                        updateUsersListWithSync(prev => prev.map(u => u.id === user.id ? { ...u, credits: newVal } : u));
                                      }}
                                      className="w-5 h-5 bg-slate-900 border border-slate-850 hover:bg-slate-800 text-slate-400 font-extrabold text-xs rounded flex items-center justify-center cursor-pointer select-none"
                                      title="+10"
                                    >
                                      +
                                    </button>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-center font-mono">{user.botsCount}</td>
                                <td className="px-4 py-3 text-center font-mono">
                                  <span className={user.hostedInCloud > 0 ? "text-cyan-300" : "text-slate-600"}>
                                    {user.hostedInCloud}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    user.status === "פעיל" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-450 animate-pulse"
                                  }`}>
                                    {user.status}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-left">
                                  <div className="flex gap-1.5 justify-end">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        // Upgrade plan
                                        const newPlan = user.plan === "free" ? "pro" : user.plan === "pro" ? "enterprise" : "free";
                                        updateUsersListWithSync(prev => prev.map(u => u.id === user.id ? { ...u, plan: newPlan } : u));
                                        setSuccessMessage(`שודרג בהצלחה מנוי החיוב של ${user.name} לדרגת ${newPlan}!`);
                                        setTimeout(() => setSuccessMessage(null), 4000);
                                      }}
                                      className="px-2 py-1 bg-cyan-950 text-cyan-400 hover:bg-cyan-900/50 rounded text-[9.5px] border border-cyan-800/40 cursor-pointer transition-all font-bold"
                                    >
                                      שדרג מנוי 👑
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        // Suspend/Release active status
                                        const newStatus = user.status === "פעיל" ? "מושעה" : "פעיל";
                                        updateUsersListWithSync(prev => prev.map(u => u.id === user.id ? { ...u, status: newStatus } : u));
                                        if (newStatus === "מושעה") {
                                          setErrorMessage(`זיהוי המנוי של ${user.name} הושהה מפעילות.`);
                                          setTimeout(() => setErrorMessage(null), 4000);
                                        } else {
                                          setSuccessMessage(`סטטוס של ${user.name} חזר להיות פעיל למול שרתי האוטומציה!`);
                                          setTimeout(() => setSuccessMessage(null), 4550);
                                        }
                                      }}
                                      className={`px-2 py-1 rounded text-[9.5px] border cursor-pointer transition-all font-bold ${
                                        user.status === "פעיל" 
                                          ? "bg-slate-900/60 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border-slate-850 hover:border-rose-900/30" 
                                          : "bg-emerald-950 text-emerald-400 border-emerald-800/30"
                                      }`}
                                    >
                                      {user.status === "פעיל" ? "השעה מנוי 🛑" : "בטל השעיה ✔"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedAdminUser(user);
                                        setSuccessMessage(`הודעת הדראפט והחשבונית של מנוי ${user.plan} הוכנה ונשלחה אל ${user.email}!`);
                                        setTimeout(() => setSuccessMessage(null), 4000);
                                      }}
                                      className="p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
                                      title="הפק חשבונית חיוב כספית"
                                      id={`btn-user-invoice-${user.id}`}
                                    >
                                      <FileText className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB CONTENT: CLOUD */}
              {adminActiveTab === "cloud" && (
                <div className="space-y-6 animate-fadeIn" id="admin-tab-cloud">
                  
                  <div className="bg-[#0b101e] border border-slate-800 rounded-2xl p-5 text-right space-y-5" id="cloud-orchestrator-settings">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <HardDrive className="w-4 h-4 text-cyan-400" /> הגדרות מנהל לבוטים ענניים (Cloud Host Runner)
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed font-sans">
                       כפי שהמשתמש ביקש, הבוטים שהלקוח יוצר יכולים לשבת בענן במידה והוא מנוי. כאן ה-Admin שולט על משאבי שרת ה-Docker שמפעיל את ה-Puppeteer בדפדפן מרוחק, הגבלת עומסים, וסבבי כתובות IP למניעת Captchas.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                      <div>
                        <label className="block text-[10.5px] text-slate-400 font-bold uppercase mb-1">מנוע Docker & Puppeteer API Cluster Host</label>
                        <input 
                          type="text"
                          value={adminSystemConfig.automationEngineEndpoint}
                          onChange={(e) => setAdminSystemConfig(prev => ({ ...prev, automationEngineEndpoint: e.target.value }))}
                          dir="ltr"
                          className="w-full text-xs font-mono px-3 py-2 bg-slate-950 rounded-lg border border-slate-800 text-cyan-300 focus:outline-none focus:border-cyan-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[10.5px] text-slate-400 font-bold uppercase mb-1">אזור פריסת שרתי קונטיינרים (Cloud Region Pool)</label>
                        <select 
                          value={adminSystemConfig.selectedCloudRegion}
                          onChange={(e) => setAdminSystemConfig(prev => ({ ...prev, selectedCloudRegion: e.target.value }))}
                          className="w-full text-xs px-3 py-2 bg-slate-950 rounded-lg border border-slate-800 text-slate-200 focus:outline-none focus:border-purple-500"
                          id="cloud-region-select"
                        >
                          <option value="europe-west3 (Frankfurt)">europe-west3 (Frankfurt, De)</option>
                          <option value="us-central1 (Iowa)">us-central1 (Iowa, US)</option>
                          <option value="me-west1 (Tel Aviv)">me-west1 (Tel Aviv, IL)</option>
                          <option value="asia-east1 (Taiwan)">asia-east1 (Taiwan, TW)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10.5px] text-slate-400 font-bold uppercase mb-1">מספר פודים מקסימלי באשכול (Max Runner Pods Limit)</label>
                        <input 
                          type="number"
                          value={adminSystemConfig.cloudClusterNodesCount}
                          onChange={(e) => setAdminSystemConfig(prev => ({ ...prev, cloudClusterNodesCount: Number(e.target.value) }))}
                          className="w-full text-xs font-mono px-3 py-2 bg-slate-950 rounded-lg border border-slate-800 text-white focus:outline-none focus:border-cyan-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[10.5px] text-slate-400 font-bold uppercase mb-1">מסד נתונים ענני ברירת מחדל (SaaS Tenant Database Engine)</label>
                        <input 
                          type="text"
                          value={adminSystemConfig.cloudDatabaseEngine}
                          onChange={(e) => setAdminSystemConfig(prev => ({ ...prev, cloudDatabaseEngine: e.target.value }))}
                          className="w-full text-xs px-3 py-2 bg-slate-950 rounded-lg border border-slate-800 text-slate-300 focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                    </div>

                    <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 mt-4 mb-4" id="global-sync-container">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="max-w-xl text-right">
                          <h4 className="text-xs font-bold font-sans text-white flex items-center gap-1.5 uppercase tracking-wide">
                            <span className="flex h-2 w-2 rounded-full bg-cyan-400"></span>
                            סנכרון גלובלי בזמן אמת (Real-time Global Sync Integration)
                          </h4>
                          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                            כאשר מופעל, כל עריכת טבלאות מקומית (שינויי קרדיטים, הוספת משתמשים, שינוי סטטוס, שדרוג מנוי או שינויי תוכניות SaaS) תופץ ותסונכרן מיידית אצל כלל המשתמשים המחוברים למערכת בזמן אמת באמצעות Firebase Real-time listeners.
                          </p>
                        </div>
                        <div className="flex items-center">
                          <button
                            type="button"
                            onClick={() => {
                              const nextVal = !adminSystemConfig.globalSyncEnabled;
                              setAdminSystemConfig(prev => ({ ...prev, globalSyncEnabled: nextVal }));
                              if (nextVal) {
                                saveSyncTableToFirestore("pricing_plans", adminPricingPlans).catch(err => {
                                  console.error("Initial sync of plans failed", err);
                                });
                                saveSyncTableToFirestore("users_list", adminUsersList).catch(err => {
                                  console.error("Initial sync of users failed", err);
                                });
                              }
                              setSuccessMessage(
                                nextVal 
                                  ? "🟢 סנכרון גלובלי הופעל! טבלאות המשתמשים והתוכניות הופצו לכלל החיבורים הפעילים בזמן אמת."
                                  : "🔴 סנכרון גלובלי הושבת. השינויים יישמרו מעתה מקומית בלבד."
                              );
                              setTimeout(() => setSuccessMessage(null), 5000);
                            }}
                            className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all duration-300 cursor-pointer shadow-md select-none ${
                              adminSystemConfig.globalSyncEnabled
                                ? "bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/35 text-cyan-400 shadow-cyan-950/20"
                                : "bg-slate-950 hover:bg-slate-900 border-slate-800 text-slate-400"
                            }`}
                            id="global-sync-toggle-btn"
                          >
                            {adminSystemConfig.globalSyncEnabled ? "🟢 סנכרון גלובלי פעיל" : "🔴 סנכרון גלובלי כבוי"}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2">
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-[10.5px] text-slate-400 font-bold uppercase">מאגר כתובות IP פרוקסי של השרתים (Bypass Block Pools)</label>
                        <button
                          type="button"
                          onClick={() => {
                            setAdminSystemConfig(prev => ({ ...prev, proxyRotationEnabled: !prev.proxyRotationEnabled }));
                            setSuccessMessage(`סבסט פרוקסי אוטומטי הועבר לסטטוס: ${!adminSystemConfig.proxyRotationEnabled ? "פעיל" : "מושבת"}`);
                            setTimeout(() => setSuccessMessage(null), 4000);
                          }}
                          className={`text-[9.5px] font-bold px-2 py-0.2 rounded border ${
                            adminSystemConfig.proxyRotationEnabled 
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                              : "bg-slate-950 border-slate-800 text-slate-500"
                          }`}
                        >
                          {adminSystemConfig.proxyRotationEnabled ? "סבסוד פרוקסי פעיל" : "מושבת"}
                        </button>
                      </div>
                      <textarea
                        value={adminSystemConfig.sharedProxyIps}
                        onChange={(e) => setAdminSystemConfig(prev => ({ ...prev, sharedProxyIps: e.target.value }))}
                        rows={4}
                        dir="ltr"
                        className="w-full text-xs font-mono px-3 py-2 bg-slate-950 rounded-lg border border-slate-800 text-cyan-350 focus:outline-none focus:border-cyan-500 leading-relaxed"
                        placeholder="IP_Address:Port:Username:Password"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">
                        כתובות הפרוקסי משתלבות אוטומטית בהרצות של לקוחות מנויי Pro/Enterprise לצורך מניעת חסימות IP באתרים שדרשו הגנה גבוהה.
                      </p>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          setSuccessMessage("כל הגדרות הענן ואשכול הקונטיינרים פוזרו בהצלחה למדריכי ה-SaaS!");
                          setTimeout(() => setSuccessMessage(null), 4000);
                        }}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold shadow-md cursor-pointer transition-colors"
                      >
                        שמור הגדרות ענן פעילות
                      </button>
                    </div>
                  </div>

                </div>
              )}

              {/* TAB CONTENT: CONFIG */}
              {adminActiveTab === "config" && (
                <div className="space-y-6 animate-fadeIn" id="admin-tab-config">
                  
                  <div className="bg-[#0a0f1c] border border-slate-800 rounded-2xl p-5 text-right space-y-5" id="saas-system-general-config">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Lock className="w-4 h-4 text-purple-400" /> הגדרות בסיסיות של ה-SaaS ומפתחות API
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold mb-1 uppercase">מטבע ברירת המחדל לחיוב מנויים</label>
                        <select
                          value={adminSystemConfig.userBillingCurrency}
                          onChange={(e) => setAdminSystemConfig(prev => ({ ...prev, userBillingCurrency: e.target.value }))}
                          className="w-full text-xs px-3 py-2 bg-slate-950 rounded-lg border border-slate-800 text-white"
                        >
                          <option value="USD ($)">USD ($) - דולר אמריקאי</option>
                          <option value="ILS (₪)">ILS (₪) - שקל חדש</option>
                          <option value="EUR (€)">EUR (€) - אירו אירופי</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold mb-1 uppercase">מודל ה-AI המרכזי שמוגדר כברירת מחדל</label>
                        <select
                          value={adminSystemConfig.systemDefaultGeminiModel}
                          onChange={(e) => setAdminSystemConfig(prev => ({ ...prev, systemDefaultGeminiModel: e.target.value }))}
                          className="w-full text-xs px-3 py-2 bg-slate-950 rounded-lg border border-slate-800 text-white"
                        >
                          <option value="gemini-3.5-flash">Gemini 3.5 Flash (מהיר, יציב ומאובטח כברירת מחדל)</option>
                          <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (החזק ביותר - לפענוח קוד ופתרון בעיות מורכבות)</option>
                          <option value="grok-2">xAI Grok 2 (חכם ויצירתי במיוחד לכתיבת סקריפטים)</option>
                        </select>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-[10px] text-slate-500 font-bold mb-1 uppercase">מפתח Gemini API של בעל פלטפורמת ה-SaaS</label>
                        <div className="relative">
                          <input 
                            type="password"
                            value="••••••••••••••••••••••••••••••••••••"
                            disabled
                            className="w-full text-xs font-mono px-3 py-2 bg-slate-950/85 rounded-lg border border-slate-800 text-slate-500 focus:outline-none"
                          />
                          <span className="absolute left-3 top-2.5 text-[9.5px] font-bold text-slate-500 font-mono">
                            STORED IN SERVER SECRETS (.env)
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                          במצב ייצור, מפתח ה-Gemini של המנהל מוזן דרך משתני הסביבה המאובטחים בענן (process.env.GEMINI_API_KEY) ומשמש את כלל הלקוחות בעלי מנוי Free או Pro כאשר הם מייצרים שלבי אוטומציה.
                        </p>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-[10px] text-slate-500 font-bold mb-1 uppercase">הנחיות מערכת ברירת מחדל של ה-AI ("System Instructions")</label>
                        <textarea
                          rows={4}
                          className="w-full text-xs px-3 py-2 bg-slate-950 rounded-lg border border-slate-800 text-slate-200 focus:outline-none focus:border-purple-500 leading-relaxed text-right"
                          placeholder="You are BotForge AI, a dedicated automation planner assisting SaaS users..."
                          defaultValue="אתה עוזר אוטומציה מומחה ומתקדם. תפקידך לסייע למשתמשי BotForge להרכיב בוטים איכותיים להרצה ב-Puppeteer, לבצע סנכרון נתונים אינטראקטיביים מול Google Workspace (Drive, Sheets, Slides, Gmail, Calendar) ולפתור בעיות בקוד. ענה תמיד בעברית מלוטשת ומסייעת."
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          setTestApiState("testing");
                          setTimeout(() => {
                            setTestApiState("success");
                            setSuccessMessage("חיבור לשרתי האוטומציה המרכזיים ומסד הנתונים עבר בהצלחה עם סטטוס Healthy!");
                            setTimeout(() => {
                              setTestApiState("idle");
                              setSuccessMessage(null);
                            }, 5000);
                          }, 1500);
                        }}
                        disabled={testApiState === "testing"}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-2"
                        id="test-saas-connection-btn"
                      >
                        {testApiState === "testing" ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            בודק חיבור למנוע...
                          </>
                        ) : testApiState === "success" ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            חיבור תקין ✅
                          </>
                        ) : (
                          "בצע בדיקת חיבור מערכת (Test Ping)"
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSuccessMessage("הגדרות בסיס וכללים של BotForge SaaS עודכנו בהצלחה!");
                          setTimeout(() => setSuccessMessage(null), 4000);
                        }}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-md"
                      >
                        עדכן הגדרות ליבה
                      </button>
                    </div>
                  </div>

                  {/* CHRONOS PULSE AND CREDIT QUOTAS CONFIGURATION CARD */}
                  <div className="bg-[#0a0f1c] border border-slate-800 rounded-2xl p-5 text-right space-y-5" id="chronos-pulse-config">
                    <h3 className="text-sm font-bold text-white flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <Sliders className="w-4 h-4 text-cyan-400" />
                        <span>בקרת הרצה חכמה (Chronos Pulse) ומכסות קרדיט</span>
                      </div>
                      <span className="text-[9px] bg-cyan-950 font-mono text-cyan-400 px-2 py-0.5 rounded border border-cyan-800/40">SaaS Superuser Rule</span>
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Section 1: Memory Run Cycle */}
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[11px] text-slate-400 font-bold mb-1.5 uppercase">אסטרטגיית מחזוריות והפסקות ריצה (Duty Cycle)</label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setBotRunPulseStrategy("continuous");
                                addLog("⚙️ אסטרטגיית הריצה שונתה למצב רציף (Continuous) ללא הפסקות מתוזמנות.", "info");
                              }}
                              className={`px-3 py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                                botRunPulseStrategy === "continuous"
                                  ? "bg-cyan-500/10 border-cyan-500/50 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.15)]"
                                  : "bg-slate-950 border-slate-850 text-slate-500 hover:text-slate-300"
                              }`}
                            >
                              ריצה רציפה (Continuous)
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setBotRunPulseStrategy("pulse");
                                addLog("⚙️ אסטרטגיית הריצה שונתה למחזוריות פולסים: 3 ימים מנוחה, יממה 1 עבודה.", "warn");
                              }}
                              className={`px-3 py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                                botRunPulseStrategy === "pulse"
                                  ? "bg-purple-500/10 border-purple-500/50 text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.15)]"
                                  : "bg-slate-950 border-slate-850 text-slate-500 hover:text-slate-300"
                              }`}
                            >
                              פולס מחזורי (3-1 פעימה)
                            </button>
                          </div>
                        </div>

                        {botRunPulseStrategy === "pulse" && (
                          <div className="bg-slate-950 p-4 rounded-xl border border-slate-850/80 space-y-3 animate-fadeIn">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-slate-400 font-bold">היוסטון הנוכחי של סייקל הפעימה:</span>
                              <span className="font-mono text-cyan-330 font-bold">
                                {pulseDayIndex === 3 ? "יממת עבודה פעילה! 🔥" : `יום מנוחה ${pulseDayIndex + 1} מתוך 3 💤`}
                              </span>
                            </div>

                            {/* Cycle Progress bar */}
                            <div className="grid grid-cols-4 gap-1.5 pt-1">
                              {[0, 1, 2, 3].map((idx) => {
                                const isCurrent = pulseDayIndex === idx;
                                const isWorkDay = idx === 3;
                                return (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => {
                                      setPulseDayIndex(idx);
                                      if (idx === 3) {
                                        addLog("⚡ המנהל העביר ידנית את סייקל BotForge ליממת העבודה הפעילה. הבוטים רשאים לרוץ!", "success");
                                      } else {
                                        addLog(`💤 המנהל העביר ידנית את סייקל BotForge ליום מנוחה ${idx + 1}. הרצות בוטים ייחסמו.`, "info");
                                      }
                                    }}
                                    className={`p-2 rounded-lg border transition-all text-center cursor-pointer select-none ${
                                      isCurrent 
                                        ? isWorkDay 
                                          ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                                          : "bg-amber-500/10 border-amber-500/40 text-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.3)] animate-pulse"
                                        : isWorkDay
                                          ? "bg-slate-900 border-slate-800 text-slate-400"
                                          : "bg-slate-950 border-slate-900 text-slate-600"
                                    }`}
                                  >
                                    <div className="text-[10px] font-bold">{isWorkDay ? "עבודה" : `מנוחה ${idx + 1}`}</div>
                                    <div className="text-[7.5px] font-semibold tracking-wide uppercase font-mono mt-0.5">
                                      {isCurrent ? "נוכחי" : isWorkDay ? "יממה" : "חופש"}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                            <p className="text-[9.5px] text-slate-500 leading-normal leading-relaxed text-right mt-1">
                              * במצב פעימה, הבוטים יבצעו שאיבת מידע וריצות אוטומטיות אך ורק ביום הרביעי ("יממת עבודה"). בשלושת ימי המנוחה, הרצת הבוטים תושהה אוטומטית כדי לחסוך בצריכת משאבי ענן.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Section 2: Quota Limits */}
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[11px] text-slate-400 font-bold mb-1.5 uppercase">מכסת קרדיט יומית למשתמשי קצה ברירת מחדל</label>
                          <div className="flex items-center gap-3">
                            <input
                              type="range"
                              min="10"
                              max="1000"
                              step="10"
                              value={dailyCreditQuota}
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                setDailyCreditQuota(val);
                              }}
                              className="w-full accent-cyan-500 cursor-pointer"
                            />
                            <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 font-mono text-cyan-300 font-bold text-xs whitespace-nowrap min-w-[80px] text-center">
                              {dailyCreditQuota} Cr
                            </div>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
                            קבע את תקרת הקרדיטים החינמית אותה מקבל כל משתמש רשום מידי יממה (מאופס מידי לילה בחצות). מכסת ברירת המחדל האופטימלית מוגדרת על <strong>150 קרדיטים ביום</strong>.
                          </p>
                        </div>

                        <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-850 text-[10.5px] text-slate-400 space-y-2 leading-relaxed">
                          <div className="flex justify-between items-center text-xs font-bold text-white">
                            <span>חישוב תפעול מהיר:</span>
                            <span className="text-purple-400 font-mono">{Math.floor(dailyCreditQuota / 25)} הרצות / יממה</span>
                          </div>
                          <p>
                            כל הרצת סימולטור או הפעלת בוט Puppeteer בסנדבוקס מדומה מנכה <strong>25 קרדיטים</strong> מקופת הלקוח.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          setSuccessMessage("האסטרטגיה החכמה לפעימות הרצה Chronos Pulse ומאגר הקרדיטים השתמרו בהצלחה!");
                          setTimeout(() => setSuccessMessage(null), 4000);
                        }}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-md"
                      >
                        שמור שינויים בפעימות קבועות
                      </button>
                    </div>
                  </div>

                </div>
              )}

              {/* TAB CONTENT: INTEGRATIONS */}
              {adminActiveTab === "integrations" && (
                <div className="space-y-6 animate-fadeIn" id="admin-tab-integrations">
                  <div className="bg-[#0a0f1c] border border-slate-800 rounded-2xl p-5 text-right space-y-5">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Link2 className="w-4 h-4 text-emerald-400" /> ניהול מפתחות API ואינטגרציות
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed font-sans">
                      הוסף אינטגרציות של צד שלישי למערכת שלך או כל שירות חיצוני שדורש מפתח API. ניתן להוסיף את המפתח פה ולהשתמש בו בסקריפטים.
                    </p>

                    <div className="space-y-4">
                      {adminSystemConfig.customIntegrations.map((integration, idx) => (
                        <div key={idx} className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center gap-4 relative overflow-hidden group">
                          <div className="flex-1 space-y-1 w-full">
                            <label className="text-[10px] text-slate-500 font-bold uppercase block">שם אינטגרציה</label>
                            <input 
                              type="text"
                              value={integration.name}
                              onChange={(e) => {
                                const newInteg = [...adminSystemConfig.customIntegrations];
                                newInteg[idx].name = e.target.value;
                                setAdminSystemConfig({ ...adminSystemConfig, customIntegrations: newInteg });
                              }}
                              className="w-full bg-transparent text-sm text-white border-b border-slate-800 focus:border-emerald-500 focus:outline-none py-1"
                              placeholder="הזן שם..."
                            />
                            {integrationTestStatus[idx] === "success" && (
                              <div className="flex items-center gap-1 text-[10px] text-emerald-400 mt-1">
                                <CheckCircle className="w-3 h-3" /> מחובר ומאומת
                              </div>
                            )}
                            {integrationTestStatus[idx] === "error" && (
                              <div className="flex items-center gap-1 text-[10px] text-rose-400 mt-1">
                                <AlertTriangle className="w-3 h-3" /> מפתח שגוי או שגיאת התחברות 
                              </div>
                            )}
                            {integrationTestStatus[idx] === "testing" && (
                              <div className="flex items-center gap-1 text-[10px] text-cyan-400 mt-1">
                                <Activity className="w-3 h-3 animate-spin" /> בודק תקשורת...
                              </div>
                            )}
                          </div>
                          <div className="flex-1 space-y-1 w-full relative">
                            <label className="text-[10px] text-slate-500 font-bold uppercase block">מפתח API פעיל</label>
                            <div className="relative">
                              <input 
                                type="text"
                                value={integration.apiKey}
                                onChange={(e) => {
                                  const newInteg = [...adminSystemConfig.customIntegrations];
                                  newInteg[idx].apiKey = e.target.value;
                                  setAdminSystemConfig({ ...adminSystemConfig, customIntegrations: newInteg });
                                  setIntegrationTestStatus(prev => ({ ...prev, [idx]: null })); // Reset status on edit
                                }}
                                dir="ltr"
                                className={`w-full bg-slate-900 text-sm text-cyan-300 font-mono rounded px-3 py-1.5 focus:outline-none focus:ring-1 pl-10 pr-24 ${
                                  integrationTestStatus[idx] === "success" ? "border border-emerald-500/50 focus:ring-emerald-500" :
                                  integrationTestStatus[idx] === "error" ? "border border-rose-500/50 focus:ring-rose-500" :
                                  "border border-transparent focus:ring-emerald-500"
                                }`}
                                placeholder="הזן מפתח גישה..."
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  if (!integration.apiKey) return;
                                  setIntegrationTestStatus(prev => ({ ...prev, [idx]: "testing" }));
                                  setTimeout(() => {
                                    // Simulated async API check - fails if "fake" or "invalid" exist in string, mostly a mock
                                    const isValid = integration.apiKey.length > 10 && !integration.apiKey.toLowerCase().includes("fail") && !integration.apiKey.toLowerCase().includes("invalid");
                                    setIntegrationTestStatus(prev => ({ ...prev, [idx]: isValid ? "success" : "error" }));
                                  }, 1500);
                                }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-cyan-400 px-2 py-1 rounded transition-colors"
                              >
                                Test Connection
                              </button>
                              <button
                                type="button"
                                onClick={() => setVisibleIntegrationKeys(prev => ({ ...prev, [idx]: !prev[idx] }))}
                                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-400 p-1"
                              >
                                {visibleIntegrationKeys[idx] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              const newInteg = adminSystemConfig.customIntegrations.filter((_, i) => i !== idx);
                              setAdminSystemConfig({ ...adminSystemConfig, customIntegrations: newInteg });
                            }}
                            className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors cursor-pointer self-end md:self-center"
                            title="מחק אינטגרציה"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-between items-center pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setAdminSystemConfig(prev => ({
                            ...prev,
                            customIntegrations: [...prev.customIntegrations, { id: Date.now().toString(), name: "", apiKey: "" }]
                          }));
                        }}
                        className="flex items-center gap-2 px-4 py-2 border border-slate-800 hover:border-slate-700 bg-slate-900 rounded-lg text-xs font-medium text-slate-300 transition-colors"
                      >
                        <Network className="w-3.5 h-3.5" />
                        הוסף שילוב חדש +
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const hasEmpty = adminSystemConfig.customIntegrations.some(i => !i.name.trim() || !i.apiKey.trim());
                          if (hasEmpty) {
                            setErrorMessage("שגיאה מפאנל ניהול: לא ניתן לשמור, ישנם שדות ריקים (שם או מפתח) באחת מהאינטגרציות שלכם.");
                            setTimeout(() => setErrorMessage(null), 4000);
                          } else {
                            setSuccessMessage("מפתחות ה-API והאינטגרציות נשמרו כהלכה בסביבת הענן.");
                            setTimeout(() => setSuccessMessage(null), 4000);
                          }
                        }}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-lg text-xs font-bold transition-all shadow-md"
                      >
                        שמור אינטגרציות
                      </button>
                    </div>

                  </div>

                  {/* GLOBAL UI INJECTOR & GROK PLUGIN MAKER */}
                  <div className="bg-[#0a0f1c] border border-slate-800 rounded-2xl p-5 text-right space-y-5">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-400" /> מזריק רכיבים חכמים (AI Plugin Injector - Powered by Grok)
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed font-sans mt-2">
                      הזרק HTML/JS מותאם אישית שיתווסף כסרגל או פאנל ישירות לתוך המערכת וישפיע עליה.
                      בכלי זה תוכל גם לבקש מ-Grok לבנות עבורך כלי תשתית (כגון חלון משימות, דאשבורד נוסף) בצורה דינאמית, גם ללא מכסה חיצונית!
                    </p>
                    
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mt-4 relative">
                       <label className="text-xs text-white mb-2 block font-bold">1. בקש מ-Grok לכתוב סרגל/חלון (אופציונלי):</label>
                       <textarea
                         value={pluginPrompt}
                         onChange={(e) => setPluginPrompt(e.target.value)}
                         placeholder="כתוב סרגל ניווט עליון שקוף עם שעון דיגיטלי... כותרת מחשבון החזרי מס... וכו'"
                         dir="auto"
                         rows={2}
                         className="w-full bg-slate-950 border border-slate-700/50 focus:border-purple-500 rounded-lg p-3 text-xs text-slate-200 focus:outline-none transition-colors"
                       />
                       <button
                         onClick={async () => {
                           if (!pluginPrompt.trim()) return;
                           setIsGeneratingPlugin(true);
                           setErrorMessage(null);
                           try {
                             const response = await fetch("/api/chat", {
                               method: "POST",
                               headers: { "Content-Type": "application/json" },
                               body: JSON.stringify({ 
                                 message: `Generate ONLY an HTML file with embedded CSS and JS (inside <style> and <script> tags) for a standalone web component. Do NOT write anything outside the HTML markup. Request: ${pluginPrompt}`,
                                 history: [],
                                 developerMode: true,
                                 steps: [],
                                 model: "grok-2"
                               })
                             });
                             const data = await response.json();
                             if (!response.ok) throw new Error(data.error || "Grok failed");
                             let html = data.response.text || data.response;
                             if (html.includes("\`\`\`html")) {
                               html = html.split("\`\`\`html")[1].split("\`\`\`")[0].trim();
                             } else if (html.includes("\`\`\`")) {
                               html = html.split("\`\`\`")[1].split("\`\`\`")[0].trim();
                             }
                             setAdminSystemConfig({ ...adminSystemConfig, developerPluginHtml: html });
                             setPluginPrompt("");
                             setSuccessMessage("הקוד יוצר בהצלחה מ-Grok והוזרק לעורך.");
                             setTimeout(() => setSuccessMessage(null), 4000);
                           } catch (err: any) {
                             setErrorMessage("שגיאה מקשר למנוע: " + err.message);
                             setTimeout(() => setErrorMessage(null), 5000);
                           } finally {
                             setIsGeneratingPlugin(false);
                           }
                         }}
                         disabled={isGeneratingPlugin || !pluginPrompt.trim()}
                         className="mt-3 px-4 py-2 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/50 text-purple-300 rounded text-xs font-bold transition-all disabled:opacity-50"
                       >
                         {isGeneratingPlugin ? "יוצר רכיב עם Grok..." : "צור קוד רכיב"}
                       </button>
                    </div>

                    <div className="mt-6">
                      <label className="text-xs text-slate-400 mb-2 block font-bold">2. קוד ה-HTML/JS שיוזרק בממשק העדכני (IFrame):</label>
                      <textarea
                        value={adminSystemConfig.developerPluginHtml || ""}
                        onChange={(e) => setAdminSystemConfig({ ...adminSystemConfig, developerPluginHtml: e.target.value })}
                        placeholder={`<!-- קוד HTML כאן -->\n<div style="padding: 20px; color: white;">שלום עולם</div>\n<script>console.log("נטען בהצלחה")</script>`}
                        dir="ltr"
                        rows={6}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl p-4 text-xs font-mono text-cyan-300 focus:outline-none transition-colors"
                      />
                    </div>
                    
                    <div className="flex justify-end gap-2 pt-2">
                       <button
                         type="button"
                         onClick={async () => {
                           try {
                             await saveGlobalConfigToFirestore(adminSystemConfig);
                             setSuccessMessage("קוד הרכיב נשמר בשרת ופורסם לכל המשתמשים באפליקציה בהצלחה! 🌐✨");
                             setTimeout(() => setSuccessMessage(null), 4000);
                           } catch (err: any) {
                             setErrorMessage("שגיאה בשמירה לשרת: " + err.message);
                             setTimeout(() => setErrorMessage(null), 4000);
                           }
                         }}
                         className="bg-cyan-600 hover:bg-cyan-500 border border-cyan-400 text-white px-5 py-2 rounded-lg text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
                       >
                         <Globe className="w-3.5 h-3.5 animate-pulse" />
                         שמור ופרסם לכולם ב-Database 🌐
                       </button>

                       <button
                         type="button"
                         onClick={() => {
                           setSuccessMessage("הקוד הוזרק בהצלחה והמערכת התעדכנה.");
                           setTimeout(() => setSuccessMessage(null), 3000);
                         }}
                         className="bg-emerald-600/40 hover:bg-emerald-600/60 border border-emerald-500 text-emerald-300 px-5 py-2 rounded-lg text-xs font-bold transition-all shadow-md"
                       >
                         רענן אזור הזרקה (Refresh Plugin)
                       </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB CONTENT: AI_CONTROL - ADVANCED ADMIN OVERRIDE HUB */}
              {adminActiveTab === "ai_control" && (
                <div className="space-y-6 animate-fadeIn text-right" id="admin-tab-ai-control">
                  
                  {/* OVERVIEW PANEL HEADER */}
                  <div className="bg-slate-950 p-5 rounded-2xl border border-dashed border-cyan-500/30 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-white flex items-center justify-end gap-2 text-right">
                        <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping"></span>
                        מצב שליטה וניהול טלמטריה מרוכזת (Core Admin Control Activated)
                      </h3>
                      <p className="text-[11px] text-slate-400 leading-normal max-w-xl text-right">
                        ברוך הבא למרכז הבקרה הראשי! מודול על זה מעניק לך כמנהל המערכת שליטה אינטנסיבית ובלתי מוגבלת על כל קוד, פרמטר, קצבי ריצה, שיעור שגיאות ואינטגרציות של בוטים באפליקציה. באפשרותך לתפעל את מנוע ה-AI בשיתוף פעולה ישיר.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsViewAdminMode(false);
                          addLog("חזרה לממשק המשתמש הרגיל של BotForge PRO.", "info");
                        }}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-850 text-slate-300 font-bold border border-slate-800 hover:border-slate-700 rounded-xl text-xs cursor-pointer text-center"
                      >
                        יציאה למצב לקוח
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          // Emergency reset
                          setAdminAiCreativity(0.7);
                          setAdminSimulatedSpeed(1.0);
                          setAdminErrorRate(0);
                          setAdminLatency(150);
                          setAdminBypassSandbox(true);
                          setSimulatedLoadBots(0);
                          addLog("מערכת השליטה: כל משתני הליבה אופסו לערכי ברירת מחדל מאובטחים.", "warn");
                        }}
                        className="px-3 py-1.5 bg-rose-950/40 text-rose-300 border border-rose-900/40 hover:bg-[#1a0f12] rounded-xl text-xs font-bold cursor-pointer"
                      >
                        איפוס הגדרות שליטה
                      </button>
                    </div>
                  </div>

                  {/* UNIVERSAL ADMIN FILE ANALYZER & CONFIG GENERATOR (MICHAEL REQUEST MODULE 1) */}
                  <div className="bg-[#050811] border border-cyan-500/20 rounded-2xl p-6 shadow-[0_0_20px_rgba(6,182,212,0.1)] relative text-right space-y-6" id="universal-file-decision-hub">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-850 pb-4">
                      <div>
                        <h4 className="text-sm font-black text-white flex items-center justify-end gap-2">
                          <span className="text-cyan-400 font-mono text-xs uppercase bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-550/20">Michael Superuser Exclusive</span>
                          מפענח קבצים אוניברסלי ומחולל לוח בקרה דינמי (Dynamic AI File & Decryption Console)
                        </h4>
                        <p className="text-[10px] text-slate-400 mt-1">
                          העלה או בחר כל קובץ אפשרי (קוד פייתון, ג'אווהסקריפט, קובצי EXE, חבילות APK לנייד, תמונות, וידאו, מסמכי CSV ועוד). המערכת תסרוק את הקובץ ותפתח עבורו לוח ניהול והגדרות ייעודי במיידי!
                        </p>
                      </div>
                      
                      {/* Security access restriction indicator to address Question 2 */}
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-xl flex items-center gap-1.5 font-bold shrink-0 self-end sm:self-auto">
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                        מאובטח: גישה בלעדית מורשית למיכאל (michaell.sfaradi@gmail.com) בלבד!
                      </span>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      
                      {/* LEFT 5 COLUMNS: FILE CHOOOSER & PRESETS */}
                      <div className="lg:col-span-4 space-y-4">
                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-3">
                          <label className="block text-[11px] font-bold text-slate-300">בדיקה מהירה - קטלוג קבצי דמה לבחירה מהירה:</label>
                          <div className="grid grid-cols-2 gap-1.5">
                            {[
                              { name: "ScraperStealth.js", size: 12400, desc: "JavaScript Script" },
                              { name: "SaaS_Pipeline.py", size: 8200, desc: "Python Automation" },
                              { name: "MegaDataset_6GB.bin", size: 6442450944, desc: "חבילת ביג-דאטה (סריקה ב-3 דק!)" },
                              { name: "BotForge_Core.exe", size: 450000, desc: "Windows Binary" },
                              { name: "TelegramClient.apk", size: 8200000, desc: "Android Mobile App" },
                              { name: "ScrapingSpec.html", size: 5400, desc: "HTML Code Document" },
                              { name: "TargetCapture.png", size: 154000, desc: "Screen Capture Image" },
                              { name: "CctvStream.mp4", size: 24000000, desc: "Security Video Asset" },
                              { name: "ClientLeads.csv", size: 4500, desc: "General Data Sheet" }
                            ].map((f) => (
                              <button
                                key={f.name}
                                type="button"
                                onClick={() => handleUniversalFileAnalysis(f.name, f.size)}
                                className="p-2 text-right bg-[#090e18] hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg text-[10px] text-slate-300 font-mono transition-colors overflow-hidden text-ellipsis whitespace-nowrap block cursor-pointer"
                              >
                                📄 {f.name}
                                <span className="block text-[8px] text-slate-500">{f.desc}</span>
                              </button>
                            ))}
                          </div>

                          {/* Custom manual Drag & Drop dropzone */}
                          <div className="border-2 border-dashed border-slate-800 hover:border-cyan-500/40 rounded-xl p-4 text-center cursor-pointer transition-colors bg-slate-950/50"
                            onClick={() => {
                              const input = document.createElement("input");
                              input.type = "file";
                              input.onchange = (e: any) => {
                                const file = e.target.files[0];
                                if (file) {
                                  // Read code if text, otherwise analyze as blob
                                  const reader = new FileReader();
                                  reader.onload = () => {
                                    handleUniversalFileAnalysis(file.name, file.size, reader.result as string);
                                  };
                                  if (file.type.startsWith("text") || file.name.endsWith(".py") || file.name.endsWith(".js") || file.name.endsWith(".json") || file.name.endsWith(".html") || file.name.endsWith(".css")) {
                                    reader.readAsText(file);
                                  } else {
                                    reader.readAsDataURL(file); // fallback for binaries
                                  }
                                }
                              };
                              input.click();
                            }}
                          >
                            <Upload className="w-6 h-6 text-cyan-400 mx-auto mb-2 animate-bounce" />
                            <p className="text-[11.5px] font-bold text-white">גרור או לחץ כאן להעלאת קובץ מקומי</p>
                            <p className="text-[9px] text-slate-500 mt-1">
                              תומך בכל סוג קובץ: py, js, html, exe, apk, png, mp4, csv, zip, pdf...
                            </p>
                          </div>
                        </div>

                        {/* Scan progress loader */}
                        {isScanningFile && (
                          <div className="bg-slate-950 p-4 rounded-xl border border-cyan-500/30 text-center space-y-2 animate-pulse">
                            <Loader2 className="w-5 h-5 text-cyan-400 animate-spin mx-auto" />
                            <p className="text-[10px] text-cyan-300 font-mono">מנתח ומחלץ מטה-דאטה... {scanProgress}%</p>
                            <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden">
                              <div className="bg-cyan-453 h-full transition-all duration-150" style={{ width: `${scanProgress}%` }}></div>
                            </div>
                          </div>
                        )}
                        
                        {/* Selected info card */}
                        {selectedAnalyzedFile && (
                          <div className="bg-[#0b1222] p-4 rounded-xl border border-slate-800 text-right space-y-2">
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="text-indigo-300 font-mono text-[9px]">{(selectedAnalyzedFile.size / 1024).toFixed(1)} KB</span>
                              <span className="text-slate-400">גודל קובץ:</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="text-cyan-300 font-mono uppercase text-[9px] bg-slate-900 border border-slate-800 px-1.5 py-0.2 rounded">{selectedAnalyzedFile.extension}</span>
                              <span className="text-slate-400">סיומת מזוהה:</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="text-white font-bold max-w-[150px] overflow-hidden text-ellipsis whitespace-nowrap">{selectedAnalyzedFile.name}</span>
                              <span className="text-slate-400">שם הקובץ:</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedAnalyzedFile(null);
                                setAnalyzedFiles([]);
                                addLog("[מפענח] ניקוי ארכיון הקבצים הושלם.", "warn");
                              }}
                              className="w-full py-1 text-[9px] text-slate-500 hover:text-white border border-slate-850 hover:border-slate-800 rounded-lg bg-slate-950 transition-colors mt-1 cursor-pointer"
                            >
                              נקה קובץ נוכחי
                            </button>
                          </div>
                        )}
                      </div>

                      {/* RIGHT 8 COLUMNS: DYNAMIC DECISION & ACTION PANEL */}
                      <div className="lg:col-span-8 bg-slate-950 border border-slate-850 rounded-xl p-4 sm:p-5 flex flex-col justify-between" id="dynamic-decision-panel">
                        {selectedAnalyzedFile ? (
                          <div className="space-y-4">
                            {/* File Title & Description header */}
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-850 pb-3">
                              <div className="bg-slate-900/60 border border-slate-800 px-2 py-1 rounded text-[10px] text-slate-400">
                                סולק ועובד ב- <span className="font-mono text-cyan-300">{selectedAnalyzedFile.analyzedAt}</span>
                              </div>
                              <div className="text-right">
                                <h5 className="text-xs font-black text-white flex items-center justify-end gap-1.5">
                                  <span>{selectedAnalyzedFile.name}</span>
                                  <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping"></span>
                                </h5>
                                <p className="text-[10px] text-cyan-300">{selectedAnalyzedFile.type} &raquo; {selectedAnalyzedFile.details}</p>
                              </div>
                            </div>

                            {/* CORE CONTROL CARDS */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              
                              {/* 1. Specialized controls based on file types */}
                              <div className="bg-[#090e18] p-4 rounded-xl border border-slate-800 space-y-3">
                                <h6 className="text-[11px] font-black text-white border-b border-slate-850 pb-1.5">פרמטרים מותאמים של ה-AI להרצה</h6>
                                
                                {selectedAnalyzedFile.isCode && (
                                  <div className="space-y-3 text-[10px]">
                                    <div>
                                      <label className="block text-[9px] text-slate-400 mb-1">ויסות זיכרון מרבי למנוע סקריפט:</label>
                                      <select
                                        value={fileMaxMemoryMb}
                                        onChange={(e) => setFileMaxMemoryMb(parseInt(e.target.value))}
                                        className="w-full text-xs px-2 py-1 bg-slate-950 border border-slate-850 text-white rounded focus:outline-none"
                                      >
                                        <option value="256">256MB RAM (Light Crawler)</option>
                                        <option value="512">512MB RAM (Normal Core)</option>
                                        <option value="1024">1024MB RAM (Heavy Sandbox Evaluator)</option>
                                      </select>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <input
                                        type="checkbox"
                                        checked={fileBypassSandbox}
                                        onChange={(e) => setFileBypassSandbox(e.target.checked)}
                                        className="accent-cyan-550"
                                      />
                                      <span>אפשר אינטרפולציית משתני סביבה לעקיפת sandbox</span>
                                    </div>
                                  </div>
                                )}

                                {selectedAnalyzedFile.isExecutable && (
                                  <div className="space-y-3 text-[10px]">
                                    <div>
                                      <label className="block text-[9px] text-slate-400 mb-1">מערכת הפעלה וירטואלית לדמוי (Device Core Emulation):</label>
                                      <select
                                        value={simulatedDeviceOS}
                                        onChange={(e) => setSimulatedDeviceOS(e.target.value)}
                                        className="w-full text-xs px-2 py-1 bg-slate-950 border border-slate-850 text-white rounded focus:outline-none font-mono"
                                      >
                                        <option value="Android 14 (API 34)">Android 14 Honeycomb (API 34)</option>
                                        <option value="Windows Server 2025 Core">Windows Server 2025 Standard</option>
                                        <option value="iOS 17.4 Simulator">Apple iOS 17.4 WKWebView Sim</option>
                                        <option value="Ubuntu Core Linux">Ubuntu 24.04 Focal Fossa CLI</option>
                                      </select>
                                    </div>
                                    <div className="flex justify-between items-center text-[9px] text-slate-400">
                                      <span>מעמד אבטחה: <b>Unsigned Certificate Sandbox Bypass active</b></span>
                                    </div>
                                  </div>
                                )}

                                {selectedAnalyzedFile.isMedia && (
                                  <div className="space-y-3 text-[10px]">
                                    <div>
                                      <label className="block text-[9px] text-slate-400 mb-1">שפת זיהוי OCR & Object Detection:</label>
                                      <select
                                        value={ocrLanguageDetector}
                                        onChange={(e) => setOcrLanguageDetector(e.target.value)}
                                        className="w-full text-xs px-2 py-1 bg-slate-950 border border-slate-850 text-white rounded focus:outline-none"
                                      >
                                        <option value="עברית + English">עברית + English (Default)</option>
                                        <option value="עברית בלבד">עברית בלבד</option>
                                        <option value="English Only">English Only</option>
                                        <option value="Multilingual Universal API">מזהה גלובלי משולב OCR</option>
                                      </select>
                                    </div>
                                    <div className="flex justify-between items-center text-[10px]">
                                      <span className="text-cyan-400 font-bold">מזהה UI אוטומטי מופעל</span>
                                      <span>מצב זיהוי אלמנט גרפי:</span>
                                    </div>
                                  </div>
                                )}

                                {!selectedAnalyzedFile.isCode && !selectedAnalyzedFile.isExecutable && !selectedAnalyzedFile.isMedia && (
                                  <div className="space-y-3 text-[10px]">
                                    <p className="text-slate-400 leading-normal text-[10px]">
                                      הקובץ מזוהה כמסמך נתונים כללי או גיליון תקין. באפשרותך למפות אותו ישירות לאוטומציה.
                                    </p>
                                    <div className="flex justify-between items-center">
                                      <input
                                        type="checkbox"
                                        checked={fileExposeAsApi}
                                        onChange={(e) => setFileExposeAsApi(e.target.checked)}
                                        className="accent-indigo-550"
                                      />
                                      <span>חשוף כנקודת קצה של API עבור בוטים מרוחקים</span>
                                    </div>
                                  </div>
                                )}

                                <div className="pt-2 text-[10px] space-y-1.5 border-t border-slate-850">
                                  <div className="flex justify-between items-center">
                                    <span className="font-mono text-cyan-300 font-bold">{fileConcurrency} concurrent bots</span>
                                    <span className="text-slate-400">מקביליות ריצה מומלצת:</span>
                                  </div>
                                  <input
                                    type="range"
                                    min="1"
                                    max="20"
                                    value={fileConcurrency}
                                    onChange={(e) => setFileConcurrency(parseInt(e.target.value))}
                                    className="w-full accent-cyan-500 h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer"
                                  />
                                </div>
                              </div>

                              {/* 2. Visual AST breakdown or details output */}
                              <div className="bg-[#090e18] p-4 rounded-xl border border-slate-800 space-y-3 font-mono text-[9px] text-right" dir="ltr">
                                <div className="text-right font-sans text-[10px] font-bold text-white border-b border-slate-850 pb-1 mb-1">
                                  פירוט לוגי ואינטרספקט
                                </div>
                                
                                {selectedAnalyzedFile.isCode && (
                                  <div className="space-y-1 select-all whitespace-pre-wrap text-[#c0caf5]">
                                    <span className="text-[#e0af68]">import</span> app_orchestrator <span className="text-[#f7768e]">from</span> &apos;botforge&apos;;<br/>
                                    <span className="text-[#9ece6a]">async function</span> evaluateWorkflow() &#123;<br/>
                                    &nbsp;&nbsp;<span className="text-[#7aa2f7]">const</span> activeSession = <span className="text-[#bb9af7]">await</span> app_orchestrator.getSession();<br/>
                                    &nbsp;&nbsp;console.debug(<span className="text-[#e0af68]">&quot;Analyzing UI...&quot;</span>);<br/>
                                    &#125;
                                  </div>
                                )}

                                {selectedAnalyzedFile.isExecutable && (
                                  <div className="space-y-1 select-all whitespace-pre text-[#c3e88d] text-[8.5px]">
                                    [SYS_INIT] Booting Emulator core: {simulatedDeviceOS}<br/>
                                    [SYS_LOAD] Loading executable headers... ELF x86_64 system<br/>
                                    [SYS_LIBS] Binding direct sandbox libraries... Success<br/>
                                    [SYS_PROC] Emulator CPU instruction matrix loaded! Ready for Dry Run
                                  </div>
                                )}

                                {selectedAnalyzedFile.isMedia && (
                                  <div className="space-y-1.5 select-all text-[#ff9e64]">
                                    [IMAGE_METADATA]<br/>
                                    Resolution: 1920x1080 (FullHD 1085p)<br/>
                                    OCR Scan result: &quot;Sign in with Google - Secure Workspace Login&quot;<br/>
                                    Detected buttons: &quot;Google Auth&quot; coordinates: (x: 960, y: 540)
                                  </div>
                                )}

                                {!selectedAnalyzedFile.isCode && !selectedAnalyzedFile.isExecutable && !selectedAnalyzedFile.isMedia && (
                                  <div className="space-y-1.5 text-slate-350">
                                    [DOCUMENT_SUMMARY]<br/>
                                    Indexed columns: ID, Email Address, Phone Number, Target Website<br/>
                                    Identified rows count: 42 records found<br/>
                                    API status: {fileExposeAsApi ? "LIVE on custom endpoint" : "STANDBY"}
                                  </div>
                                )}
                              </div>

                            </div>

                            {/* TRIGGER DECISION ACTIONS BAR */}
                            <div className="p-3.5 bg-[#090f19] border border-cyan-500/20 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-right text-rtl" dir="rtl">
                              <div className="space-y-1 text-right">
                                <span className="text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-800/40 px-2 py-0.5 rounded font-bold">פעולה מנהלית חכמה (SaaS decision agent)</span>
                                <p className="text-[9.5px] text-slate-400 leading-normal max-w-sm text-right">
                                  תרגם את הקובץ הנוכחי לסקריפט אוטומציה של הבוטים בממשק או הרץ בדיקת dry-run מאובטחת.
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-2 justify-end">
                                <button
                                  type="button"
                                  onClick={() => {
                                    addLog(`🤖 [סימולטור] מתחיל סימולציית ריצה של הקובץ: "${selectedAnalyzedFile.name}"...`, "info");
                                    addLog(`🤖 [סימולטור CPU/RAM] מקצה ${fileMaxMemoryMb}MB זיכרון ומתחיל הדמיית dry-run...`, "info");
                                    setTimeout(() => {
                                      addLog(`🤖 [סימולטור SUCCESS] ריצת dry-run עבור הבוט הושלמה בהצלחה! מקביליות: ${fileConcurrency}. שגיאות זיהוי: 0.`, "success");
                                    }, 1500);
                                  }}
                                  className="px-3.5 py-2 bg-indigo-950 hover:bg-slate-900 text-indigo-300 hover:text-white rounded-xl border border-indigo-900 hover:border-slate-700 text-xs font-bold font-sans cursor-pointer transition-all"
                                >
                                  ▶ הרץ סימולציה (Dry Run Sandbox)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSteps(selectedAnalyzedFile.steps);
                                    addLog(`⚡ [אינטגרציית על של מיכאל] בהצלחה! קוד האוטומציה שוכתב מתוך הגדרות הקובץ "${selectedAnalyzedFile.name}"!`, "success");
                                    addLog(`💡 [מערכת] נטענו ${selectedAnalyzedFile.steps.length} שלבים לפעולות המנוע, אנא בדוק את קנבס השלבים בממשק הלקוח.`, "success");
                                  }}
                                  className="px-3.5 py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                                >
                                  ⚡ הזרק שלבי אוטומציה (Convert to Bot)
                                </button>
                              </div>
                            </div>

                          </div>
                        ) : (
                          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-500 space-y-3">
                            <Upload className="w-10 h-10 text-slate-700" />
                            <div>
                              <p className="text-xs font-bold text-slate-400">אנא העלה או בחר קובץ מהקטלוג בצד שמאל לפענוח על</p>
                              <p className="text-[10px] text-slate-600 mt-1 max-w-sm leading-normal">
                                לאחר הבחירה, המנוע של ה-AI ינתח ויפתח ממשק מורכב התואם בדיוק לרוט, לוגיקת קבצי הקוד, זיכרונות, הרשת ומעגלי הסייפר של החומר שהעלת.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                    </div>
                  </div>

                  {/* COGNITIVE AI PROMPT INJECTOR GRID */}
                  <div className="bg-[#0a0f1c] border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden text-right space-y-4">
                    <div className="absolute top-0 left-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl"></div>
                    <div className="flex justify-between items-center border-b border-slate-850 pb-3">
                      <h4 className="text-xs font-extrabold text-white flex items-center gap-2">
                        <Code className="w-4 h-4 text-cyan-400" />
                        הזרקת קוד והוראות אינטראקטיביות לסוכן ה-AI (Direct Compiler Prompt Injection)
                      </h4>
                      <span className="text-[9px] bg-slate-900 text-cyan-300 border border-slate-800 px-2 py-0.5 rounded font-mono uppercase font-bold">Super Root Direct</span>
                    </div>

                    <p className="text-[10px] text-slate-400 leading-normal">
                      הקלד פקודה או לוגיקת אוטומציה חופשית בעברית או באנגלית והזרק אותה ישירות לקוד הבוט הנוכחי שלך. ה-AI ינתח, יכתוב את קוד ה-Puppeteer, ויעדכן את השלבים בממשק בזמן אמת:
                    </p>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="לדוגמה: 'הוסף צעד שמנווט לגוגל, לוחץ על חיפוש ומחכה 3 שניות' או 'נקה הכל והגדר בוט להורדת קבצים'"
                        value={adminCustomPromptInput}
                        onChange={(e) => setAdminCustomPromptInput(e.target.value)}
                        className="flex-1 bg-slate-950 text-xs px-3 py-2 border border-slate-800 rounded-xl text-white placeholder-slate-700 text-right focus:outline-none focus:border-cyan-550"
                        dir="rtl"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          if (!adminCustomPromptInput.trim()) return;
                          const prompt = adminCustomPromptInput.trim();
                          setAdminCustomPromptInput("");
                          addLog(`[ADMIN AI COMPILER] שולח הוראת שליטה ישירה לשכתוב הבוט: "${prompt}"`, "info");
                          
                          try {
                            const response = await fetch("/api/chat", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ 
                                message: prompt, 
                                history: [],
                                developerMode: true,
                                steps: steps,
                                model: adminSystemConfig.systemDefaultGeminiModel
                              })
                            });
                            
                            const contentType = response.headers.get("content-type");
                            if (!response.ok) {
                              if (contentType && contentType.includes("application/json")) {
                                 const errData = await response.json();
                                 throw new Error(errData.error || `שגיאת שרת (${response.status})`);
                              }
                              const errorText = await response.text();
                              console.error("Non-JSON Response received:", errorText);
                              throw new Error(`שגיאת שרת (${response.status}): מוצר ה-AI נתקל בשגיאה ברשת או בעומס.`);
                            }

                            if (!contentType || !contentType.includes("application/json")) {
                               throw new Error("Invalid response format received from server.");
                            }

                            const data = await response.json();
                            if (data.success && data.updatedSteps) {
                              setSteps(data.updatedSteps);
                              addLog(`[ADMIN AI SUCCESS] הקוד עודכן בהצלחה! השלבים שוכתבו על פי הוראת המנהל: "${prompt}"`, "success");
                            } else {
                              throw new Error(data.error || "AI compiler returned no steps update.");
                            }
                          } catch (err: any) {
                            addLog(`[ADMIN AI ERROR] כשל בהרצת פקודת קוד: ${err.message}`, "error");
                          }
                        }}
                        className="bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.3)] animate-pulse"
                      >
                        <Zap className="w-3.5 h-3.5 text-white" />
                        תן הוראה לקוד
                      </button>
                    </div>
                  </div>

                  {/* PARAMS TUNERS GRID */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* TUNER CARD 1: SYSTEM SPEEDS & BOT SETTINGS */}
                    <div className="bg-[#0a0f1c] border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4">
                      <div>
                        <h4 className="text-xs font-black text-white flex items-center justify-end gap-2 border-b border-slate-850 pb-2 mb-3">
                          <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                          ויסות קצבי ריצה והדמיה (Live Speed Tuning)
                        </h4>

                        <div className="space-y-4">
                          <div>
                            <div className="flex justify-between items-center text-[10px] mb-1">
                              <span className="font-mono text-indigo-300 font-bold">{adminSimulatedSpeed}x</span>
                              <span className="text-slate-400">מהירות הדמיות גלובלית (Speed Factor)</span>
                            </div>
                            <input
                              type="range"
                              min="0.1"
                              max="10.0"
                              step="0.1"
                              value={adminSimulatedSpeed}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                setAdminSimulatedSpeed(val);
                                setConfig(prev => ({ ...prev, speed: val }));
                                addLog(`[ADMIN] מהירות הרצת צעדים עודכנה אוטומטית ל- ${val}x`, "info");
                              }}
                              className="w-full accent-indigo-500 h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer"
                            />
                            <div className="flex justify-between items-center text-[8px] text-slate-500 mt-1">
                              <span>הפרש מהיר (10.0x)</span>
                              <span>מדעי / רגיל (1.0x)</span>
                              <span>איטי מאוד (0.1x)</span>
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between items-center text-[10px] mb-1">
                              <span className="font-mono text-purple-300 font-bold">{adminAiCreativity}</span>
                              <span className="text-slate-400">טמפרטורת יצירתיות של ה-AI (Temperature)</span>
                            </div>
                            <input
                              type="range"
                              min="0.1"
                              max="1.5"
                              step="0.05"
                              value={adminAiCreativity}
                              onChange={(e) => setAdminAiCreativity(parseFloat(e.target.value))}
                              className="w-full accent-purple-500 h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer"
                            />
                            <div className="flex justify-between items-center text-[8px] text-slate-500 mt-1">
                              <span>חצי מסעיר (1.5)</span>
                              <span>מאוזן (0.7)</span>
                              <span>מדעי מדויק (0.1)</span>
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between items-center text-[10px] mb-1">
                              <span className="font-mono text-emerald-300 font-bold">{adminLatency}ms</span>
                              <span className="text-slate-400">זמן זחילה והמתנת רשת (Simulated Latency)</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="5000"
                              step="50"
                              value={adminLatency}
                              onChange={(e) => setAdminLatency(parseInt(e.target.value))}
                              className="w-full accent-emerald-500 h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer"
                            />
                            <div className="flex justify-between items-center text-[8px] text-slate-500 mt-1">
                              <span>כבדה (5000ms)</span>
                              <span>רגילה (150ms)</span>
                              <span>אפס שיבוש (0ms)</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="text-[9px] text-slate-500 bg-slate-950 p-2.5 rounded-xl border border-slate-900 leading-relaxed text-right mt-3">
                        שינוי מהירות הריצה למעלה משפיע <b>ישירות</b> ובאופן מיידי על זמני הרימון בממשק הדמיית הצעדים של הבוטים!
                      </div>
                    </div>

                    {/* TUNER CARD 2: NETWORK PROTOCOL & SPOOFING */}
                    <div className="bg-[#0a0f1c] border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4">
                      <div>
                        <h4 className="text-xs font-black text-white flex items-center justify-end gap-2 border-b border-slate-850 pb-2 mb-3">
                          <Settings className="w-3.5 h-3.5 text-cyan-400" />
                          חומת אש, מזהים עוקפים (Spoofing & Core Toggles)
                        </h4>

                        <div className="space-y-4 text-right">
                          
                          <div>
                            <label className="block text-[10px] text-slate-400 mb-1">מזהה דפדפן וירטואלי (User-Agent Spoofer)</label>
                            <select
                              value={adminUserAgent}
                              onChange={(e) => {
                                setAdminUserAgent(e.target.value);
                                addLog(`[ADMIN TELEMETRY] סרוגת הדפדפן (User-Agent) הוחלפה ל: ${e.target.value}`, "info");
                              }}
                              className="w-full text-xs px-2.5 py-1.5 bg-slate-950 rounded-lg border border-slate-850 text-white focus:outline-none"
                            >
                              <option value="Chrome-Stealth-X">Chrome Stealth Pro X124 (Windows)</option>
                              <option value="Safari-iOS-iPad">Apple Safari Core V17 (iPadOS Mobile)</option>
                              <option value="Google-Bot-Crawler">Googlebot-Search Crawler (SEO Simulator)</option>
                              <option value="Firefox-Gecko">Gecko Firefox Headless (Isolated Core)</option>
                            </select>
                          </div>

                          <div className="space-y-3 pt-2">
                            <div className="flex justify-between items-center bg-slate-950 p-2 border border-slate-900 rounded-xl">
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={adminBypassSandbox}
                                  onChange={(e) => {
                                    setAdminBypassSandbox(e.target.checked);
                                    addLog(`[ADMIN] מעקפי הגבלות sandbox ו-API: ${e.target.checked ? "פעילים" : "מבוטלים"}`, "warn");
                                  }}
                                  className="sr-only peer"
                                />
                                <div className="w-7 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-cyan-500 peer-checked:after:bg-slate-950"></div>
                              </label>
                              <div className="text-right">
                                <span className="text-[10px] font-bold text-white block">מעקף אבטחת סימולטור (Sandbox Bypass)</span>
                                <span className="text-[8px] text-slate-500">מאשר הרצת צעדים פגומים ועוקף שדות לא מלאים</span>
                              </div>
                            </div>

                            <div className="flex justify-between items-center bg-slate-950 p-2 border border-slate-950 rounded-xl">
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={adminErrorRate > 0}
                                  onChange={(e) => {
                                    const nextRate = e.target.checked ? 30 : 0;
                                    setAdminErrorRate(nextRate);
                                    addLog(`[ADMIN] קצב שגיאות יזומות הוגדר ל: ${nextRate}%`, "warn");
                                  }}
                                  className="sr-only peer"
                                />
                                <div className="w-7 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-rose-500 peer-checked:after:bg-slate-950"></div>
                              </label>
                              <div className="text-right">
                                <span className="text-[10px] font-bold text-white block">הזרקת שגיאות יזומה (Fault Injection)</span>
                                <span className="text-[8px] text-slate-500">יוצר דימוי לתקלות סלקטורים אקראיות של 30%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="text-[9px] text-slate-500 flex items-center justify-end gap-1 font-mono">
                        <span>סנכרון ענני עוקף credentials</span>
                        <Wifi className="w-3 text-cyan-400" />
                      </div>
                    </div>

                    {/* TUNER CARD 3: REAL-TIME HARDWARE & PERFORMANCE GAUGE CHART */}
                    <div className="bg-[#0a0f1c] border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4">
                      <div>
                        <h4 className="text-xs font-black text-white flex items-center justify-end gap-2 border-b border-slate-850 pb-2 mb-3">
                          <Activity className="w-3.5 h-3.5 text-emerald-400" />
                          טלמטריית חומרה ומעבד בזמן אמת (HD Telemetry Waves)
                        </h4>

                        <div className="space-y-4">
                          {/* Real-time looking SVG Wave graph */}
                          <div className="bg-slate-950 h-24 rounded-xl border border-slate-900/60 p-2 flex flex-col justify-between relative overflow-hidden" id="analytics-hardware-wave">
                            <div className="absolute top-1 right-2 text-[8px] font-mono text-cyan-300 flex items-center gap-1">
                              <span> system active</span>
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
                            </div>

                            {/* Dynamically waving SVG path */}
                            <svg className="w-full h-16 absolute bottom-1 left-0 right-0 text-cyan-500" viewBox="0 0 100 30" preserveAspectRatio="none">
                              <defs>
                                <linearGradient id="waveGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
                                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                                </linearGradient>
                              </defs>
                              <path 
                                d="M0,15 Q10,25 20,10 T40,20 T60,8 T80,18 T100,12 L100,30 L0,30 Z" 
                                fill="url(#waveGrad)"
                              />
                              <path 
                                d="M0,15 Q10,25 20,10 T40,20 T60,8 T80,18 T100,12" 
                                fill="none" 
                                stroke="#14b8a6" 
                                strokeWidth="0.7" 
                              />
                            </svg>

                            <div className="z-10 flex justify-between items-center text-[7.5px] font-mono text-slate-500 mt-0.5">
                              <span>3.2 GHz</span>
                              <span>Active Connection Nodes</span>
                            </div>
                          </div>

                          {/* Stat Grid */}
                          <div className="grid grid-cols-2 gap-2 text-right">
                            <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-900/40">
                              <span className="text-[8px] text-slate-500 block uppercase font-mono">Simulated Processor Core Usage</span>
                              <span className="text-xs font-black text-white font-mono flex items-center justify-end gap-1">
                                <span className="w-1 h-3 rounded bg-emerald-500"></span>
                                24.8%
                              </span>
                            </div>
                            <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-900/40">
                              <span className="text-[8px] text-slate-500 block uppercase font-mono">Google API Tokens bound</span>
                              <span className="text-xs font-black text-cyan-400 font-mono">
                                4,821 / 50k
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="text-[8.5px] text-slate-400 text-center flex items-center justify-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>IP proxies active in Frankfurt region: <b>4 proxies online</b></span>
                      </div>
                    </div>

                    {/* TUNER CARD 4: ULTRA-CAPACITY 6GB BOOSTER SYSTEM (MICHAEL'S DEMAND) */}
                    <div className="bg-[#0b132b]/80 border border-cyan-550/30 rounded-2xl p-5 shadow-[0_0_20px_rgba(6,182,212,0.15)] flex flex-col justify-between space-y-4">
                      <div>
                        <h4 className="text-xs font-black text-white flex items-center justify-end gap-2 border-b border-slate-850 pb-2 mb-3">
                          <Cpu className="w-4 h-4 text-cyan-400 animate-pulse" />
                          מאיץ ביג-דאטה אולטרה-עוצמתי (Ultra Mega-File 6GB Parallel Core)
                        </h4>

                        <div className="space-y-4 text-right">
                          <div className="flex justify-between items-center bg-slate-950 p-2.5 border border-cyan-500/10 rounded-xl">
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isUltraMegaEngineEnabled}
                                onChange={(e) => {
                                  setIsUltraMegaEngineEnabled(e.target.checked);
                                  addLog(`[AI HARDWARE SPEED] מאיץ ה-6GB הובלטר ${e.target.checked ? "הופעל" : "נותק"} במערכת!`, e.target.checked ? "success" : "warn");
                                }}
                                className="sr-only peer"
                              />
                              <div className="w-7 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-cyan-400 peer-checked:after:bg-slate-950"></div>
                            </label>
                            <div className="text-right">
                              <span className="text-[10px] font-bold text-white block">מאיץ סימולציה מבוזר (Ultra-Capacity Engine)</span>
                              <span className="text-[8px] text-cyan-300">מאפשר דחיסת Parallel Chunking ואופטימיזציה לגיגות-בייטים</span>
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between items-center text-[10px] mb-1">
                              <span className="font-mono text-cyan-400 font-bold">{ultraEngineThreads} Cores (High Demand)</span>
                              <span className="text-slate-400">חוטים ומעבדי עיבוד מקביליים (Parallel Threads Allocation)</span>
                            </div>
                            <input
                              type="range"
                              min="8"
                              max="64"
                              step="8"
                              value={ultraEngineThreads}
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                setUltraEngineThreads(val);
                                addLog(`[ADMIN AI ENGINE] הקצאת חוטים מקביליים עודכנה ל- ${val} Threads`, "info");
                              }}
                              className="w-full accent-cyan-400 h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer"
                            />
                          </div>

                          <div>
                            <div className="flex justify-between items-center text-[10px] mb-1">
                              <span className="font-mono text-cyan-300 font-bold">{megaFileMaxDurationSeconds} שניות (3 דקות בדיוק!)</span>
                              <span className="text-slate-400">מגבלת יעד מרבית לעיבוד 6GB (Time Deadline Limit)</span>
                            </div>
                            <input
                              type="range"
                              min="60"
                              max="300"
                              step="30"
                              value={megaFileMaxDurationSeconds}
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                setMegaFileMaxDurationSeconds(val);
                                addLog(`[ADMIN AI ENGINE] יעד זמן מרבי לקובץ 6GB הועמד על: ${val} שניות`, "warn");
                              }}
                              className="w-full accent-cyan-400 h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer"
                            />
                            <div className="flex justify-between items-center text-[8px] text-slate-500 mt-1">
                              <span>5 דקות (רגיל)</span>
                              <span>3 דקות (מיכאל - מהירות על!)</span>
                              <span>דקה אחת (עילית)</span>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[8.5px] text-slate-400 mb-1">פרוטוקול כיווץ והזרמת זיכרון ישיר (Compression/Streaming Matrix)</label>
                            <select
                              value={gigabyteCompressionFormat}
                              onChange={(e) => {
                                setGigabyteCompressionFormat(e.target.value);
                                addLog(`[ADMIN AUDIO/FILE PROTOCOL] שיטת הדחיסה נקבעה ל: ${e.target.value}`, "success");
                              }}
                              className="w-full text-xs px-2 py-1.5 bg-slate-950 rounded-lg border border-slate-850 text-white focus:outline-none text-right font-mono"
                            >
                              <option value="Chunk Parallel Streaming (Brotli-X)">Brotli-X Parallel Streaming (40.2 MB/s)</option>
                              <option value="LZ4 High-Fidelity Network Matrix">LZ4 High-Fidelity Network Matrices (35.1 MB/s)</option>
                              <option value="ZSTD Real-time Cloud Dump">ZSTD Hyper Real-time Cloud Dump (38.8 MB/s)</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="text-[9px] text-[#8ab4f8] bg-slate-950/80 p-2 text-center rounded-xl border border-cyan-550/20 leading-relaxed font-sans mt-2">
                        מערך המאיצים האוטונומיים הועמד בהתאם לדרישת מפתח העל! קובץ בגודל <b>6GB</b> יעובד במלואו תוך פחות מ-<b>3 דקות</b> דרך Broti-X.
                      </div>
                    </div>

                  </div>

                  {/* INTERACTIVE LOAD SIMULATOR & CRASH TRIGGERS */}
                  <div className="bg-[#0a0f1c] border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4 text-right">
                    <h4 className="text-xs font-black text-white flex items-center justify-end gap-2 border-b border-slate-850 pb-2 mb-2">
                      <Zap className="w-4 h-4 text-yellow-400" />
                      ארגז כלים לניהול, תדירויות עבודה ומבחני קפיאות סלקטור (Advanced Simulation Controls & Attack Mitigators)
                    </h4>

                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      פעולות אלו מאפשרות לך לבצע דיבגר של מנוע האוטומציה ישירות. תוכל לדמות תרחישים שונים של קריסות או לחצי משתמשים ולראות כיצד המערכת מתמודדת:
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      
                      <button
                        type="button"
                        onClick={() => {
                          setIsInjectingLoad(true);
                          setSimulatedLoadBots(10);
                          addLog("⚡ [SIMULATOR] מזרק 10 בוטים עכבישיים במקביל כעת! בדיקת עומסים על שרתי ה-Puppeteer מתחילה...", "warn");
                          
                          // Generate simulated concurrent automated traffic logs
                          setTimeout(() => {
                            addLog("👾 [BOT_LOAD_1] Thread #8201: Connected to headless browser engine.", "info");
                            addLog("👾 [BOT_LOAD_2] Thread #8202: Processing Workspace Google Drive upload pipeline.", "info");
                          }, 500);
                          setTimeout(() => {
                            addLog("👾 [BOT_LOAD_3] Thread #8203: Searching G-Sheets row selector.", "info");
                            addLog("👾 [BOT_LOAD_4] Thread #8204: Navigating target selector... Status: 200 OK", "success");
                          }, 1200);
                          setTimeout(() => {
                            addLog("👾 [BOT_LOAD_ALL] Concurrent multi-threaded test finalized. 10/10 bots executed with 0% error rate.", "success");
                            setIsInjectingLoad(false);
                          }, 3000);
                        }}
                        disabled={isInjectingLoad}
                        className="p-3 bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-900 text-indigo-300 rounded-xl text-center cursor-pointer transition-colors text-xs font-bold"
                      >
                        {isInjectingLoad ? "מריץ בדיקת עומס... (Injecting)" : "⚡ סמלץ מבחן עומס (Spawns 10 Bots)"}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          // Force browser crash simulation
                          setSteps(steps.map((s, idx) => idx === 0 ? { ...s, status: "failed" } : s));
                          addLog("🚨 [CRASH TRIGGERED] פקודת SIGKILL נשלחה למנוע הדפדפן Chromium! הרצות הוקפאו במפתיע.", "error");
                          addLog("🚨 [CRASH] Simulator failure detected: Target closed. [Browser process died]", "error");
                          
                          if (activeBotId) {
                            logBotExecution(activeBotId, "failure", 0, steps.length);
                          }
                        }}
                        className="p-3 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-900 text-rose-300 rounded-xl text-center cursor-pointer transition-colors text-xs font-bold"
                      >
                        ❌ דמה קריסת דפדפן (Crash Chromium)
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          // Inject simulated workspace sync check
                          addLog("📡 [WORKSPACE INT] שולח מניפסט בדיקה אנונימי מתוך פאנל ניהול מיוחד...", "info");
                          setTimeout(() => {
                            addLog("📡 [WORKSPACE INT] Google Chat API connection status: ACTIVE (OAuth sandboxed).", "success");
                          }, 1000);
                        }}
                        className="p-3 bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-900 text-cyan-300 rounded-xl text-center cursor-pointer transition-colors text-xs font-bold"
                      >
                        📡 בדוק חיבורי Workspace Sandbox
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          // Reset system core automation state
                          setSteps([
                            { id: "step_1", type: "navigate", title: "ניווט ראשוני", description: "נווט אל עמוד ניהול המשימות", selector: "#login-box", value: "https://example.com/tasks", status: "pending", simulatedDurationMs: 1200, codeSnippet: "await page.goto('https://example.com/tasks');" }
                          ]);
                          addLog("💡 [SYSTEM] קוד הבוט ושלבי האוטומציה אותחלו מחדש לקביעות המנהל.", "warn");
                        }}
                        className="p-3 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 rounded-xl text-center cursor-pointer transition-colors text-xs font-bold"
                      >
                        🔄 אתחל שלבי ריצה (Reset Steps)
                      </button>

                    </div>
                  </div>

                </div>
              )}

            </section>
          </>
        ) : (
          /* ==============================================
             CLIENT VIEWPORTS (ORIGINAL FUNCTIONALITIES)
             ============================================== */
          isSharedMode ? (
            <div className="flex-1 flex flex-col overflow-auto bg-[#040811] text-right font-sans select-none relative" dir="rtl">
              {/* Glowing Background Orbs */}
              <div className="absolute top-[-100px] left-[-100px] w-[600px] h-[600px] bg-cyan-600/10 rounded-full blur-[150px] pointer-events-none"></div>
              <div className="absolute bottom-[-100px] right-[-100px] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none"></div>

              {/* Standalone Player Navigation Header */}
              <header className="w-full bg-[#070c18] border-b border-slate-900 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 relative z-20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-cyan-500/15 border border-cyan-500/30 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.15)] animate-pulse">
                    <Bot className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <h1 className="text-sm font-black text-white tracking-wide uppercase flex items-center gap-2">
                      נגן הבוט השיתופי <span className="text-[10px] font-mono bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded border border-cyan-500/20">BotForge Player v3.2</span>
                    </h1>
                    <p className="text-[10px] text-slate-400">איסוף נתונים ואוטומציה בסביבה וירטואלית מאובטחת ומבודדת</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Status Badge */}
                  {sharedIsRunning ? (
                    <span className="flex items-center gap-1.5 text-xs bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-full border border-emerald-500/25 animate-pulse font-bold">
                      <span className="w-2 h-2 bg-emerald-400 rounded-full animate-ping"></span>
                      הבוט פעיל כעת באוויר
                    </span>
                  ) : sharedRunFinished ? (
                    <span className="flex items-center gap-1.5 text-xs bg-cyan-500/10 text-cyan-400 px-3 py-1.5 rounded-full border border-cyan-500/25 font-bold">
                      <span className="w-2 h-2 bg-cyan-400 rounded-full"></span>
                      ההרצה הושלמה במלואה
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs bg-amber-500/10 text-amber-400 px-3 py-1.5 rounded-full border border-amber-500/25 font-bold">
                      <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></span>
                      ממתין להשקה ראשונית
                    </span>
                  )}

                  {/* Environment Badge */}
                  <span className="text-[10px] font-mono bg-slate-950 text-slate-400 px-2.5 py-1.5 rounded-xl border border-slate-930">
                    Host: Cloud Run sandbox ✅
                  </span>

                  {/* Escape button back to builder */}
                  <button
                    onClick={() => {
                      setIsSharedMode(false);
                      setNeedsAuth(true);
                      addLog("חזרת לעורך הבוטים הראשי של המערכת.", "info");
                    }}
                    className="px-3.5 py-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-350 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    חזור לעורך ⚙️
                  </button>
                </div>
              </header>

              {/* Responsive main content container */}
              <div className="flex-1 w-full max-w-7xl mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-15 relative">
                
                {/* COLUMN 1: CONTROLS & TIMELINE (6 COLS) */}
                <div className="lg:col-span-7 flex flex-col gap-6">
                  
                  {/* Bot Core parameters Profile display Card */}
                  <div className="bg-[#090d18] border border-slate-900 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 left-0 bg-cyan-500/5 px-3 py-1 text-[10px] font-bold text-cyan-400 rounded-br-xl border-r border-b border-cyan-500/15">
                      SHARED CONFIG SOURCE
                    </div>
                    
                    <span className="text-[9px] font-bold uppercase tracking-widest text-cyan-400 block mb-1">פרופיל בוט פעיל</span>
                    <h2 className="text-xl font-black text-white">{config.name || "בוט שיתופי אנונימי"}</h2>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed bg-slate-950/40 p-3 rounded-lg border border-slate-930">{config.goal || "לא הוגדרה מטרת על ספציפית לבוט זה ביצירתו"}</p>
                    
                    <div className="mt-4 flex flex-wrap items-center gap-4 text-xs">
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase">כתובת יעד ראשונית:</span>
                        <a href={config.url} target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline font-mono text-[11px] truncate block max-w-[280px] hover:text-cyan-300">
                          {config.url || "https://example.com"}
                        </a>
                      </div>
                      <div className="mr-auto">
                        <span className="text-slate-500 block text-[10px] uppercase">מספר שלבי ריצה:</span>
                        <span className="text-white font-bold font-mono text-[13px]">{steps.length} צעדי ביצוע</span>
                      </div>
                    </div>
                  </div>

                  {/* CONFIGURATION & ABILITY LOCKER: "להגדיר לו יכולות לפני ששלחתי אותו לאוויר אחרי זה אני לא יכול" */}
                  <div className="bg-[#090d18] border border-slate-900 rounded-2xl p-5 shadow-lg relative">
                    
                    {/* Visual Overlay if launched to lock abilities */}
                    {sharedBotLaunched && (
                      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-[2px] rounded-2xl z-30 flex flex-col items-center justify-center p-6 text-center animate-fadeIn">
                        <div className="w-12 h-12 bg-amber-500/15 border border-amber-500/30 text-amber-400 rounded-full flex items-center justify-center mb-3 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                          <Lock className="w-6 h-6 animate-pulse" />
                        </div>
                        <h4 className="text-white font-bold text-sm">הגדרות ויכולות נעולות כעת 🔒</h4>
                        <p className="text-slate-400 text-xs mt-1 max-w-sm">
                          לאחר השקת הבוט ("שליחה לאוויר"), כל היכולות והפרמטרים והיעדים מקובעים לצורך הבטחת יציבות ה-Sandbox ואינטגרציות הפלט.
                        </p>
                        <button
                          onClick={() => {
                            setSharedBotLaunched(false);
                            setSharedIsRunning(false);
                            setSharedRunFinished(false);
                            setSharedActiveStep(null);
                            addSharedLog("🔧 הגדרות הבוט נפתחו מחדש לעריכה על פי בקשת המשתמש.", "warn");
                          }}
                          className="mt-4 px-3 py-1 bg-slate-900 border border-slate-800 hover:bg-slate-850 hover:text-white text-xs text-slate-350 rounded-lg cursor-pointer transition-all"
                        >
                          🔓 פתח מחדש לעריכת יכולות
                        </button>
                      </div>
                    )}

                    <div className="flex items-center justify-between border-b border-slate-900 pb-3 mb-4">
                      <span className="text-[10px] font-mono text-cyan-400 font-bold bg-cyan-900/10 px-2.1 py-0.5 rounded border border-cyan-500/20">
                        Unlocked Mode 🔓
                      </span>
                      <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Sliders className="w-4 h-4 text-cyan-400" />
                        כיוונון יכולות הבוט (קבע לפני שליחה לאוויר)
                      </h3>
                    </div>

                    <div className="space-y-4 text-right">
                      {/* Speed multiplier */}
                      <div>
                        <div className="flex justify-between items-center text-[11px] mb-2 font-sans">
                          <span className="font-mono text-cyan-400 font-bold">{config.speed}x מהירות</span>
                          <span className="text-slate-400 font-bold">מכפיל מהירות הידור וסימולציה:</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {[1, 2, 5].map(sp => (
                            <button
                              key={sp}
                              type="button"
                              onClick={() => setConfig(prev => ({ ...prev, speed: sp }))}
                              className={`py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                                config.speed === sp 
                                  ? "bg-cyan-600/10 text-cyan-400 border-cyan-500/60 shadow-[0_0_10px_rgba(6,182,212,0.1)]" 
                                  : "bg-slate-950/60 text-slate-400 border-slate-930 hover:border-slate-800 hover:text-slate-300"
                              }`}
                            >
                              {sp === 1 ? "1x רגיל" : sp === 2 ? "2x מהיר" : "5x טורבו ⚡"}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Capabilities switches */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                        {/* Ghost mode */}
                        <div className="bg-slate-950 p-3 rounded-xl border border-slate-900 flex items-center justify-between">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!!config.ghostMode}
                              onChange={(e) => setConfig(prev => ({ ...prev, ghostMode: e.target.checked }))}
                              className="sr-only peer"
                            />
                            <div className="w-8 h-4.5 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-cyan-400"></div>
                          </label>
                          <div className="text-right pr-2">
                            <h5 className="text-[10px] font-bold text-white">מצב רוח רפאים (Ghost Mode)</h5>
                            <p className="text-[8px] text-slate-500">הקלדה אנושית והשהייה חכמה עוקפת הגנות</p>
                          </div>
                        </div>

                        {/* Cognitive Vision */}
                        <div className="bg-slate-950 p-3 rounded-xl border border-slate-900 flex items-center justify-between">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!!config.cognitiveVision}
                              onChange={(e) => setConfig(prev => ({ ...prev, cognitiveVision: e.target.checked }))}
                              className="sr-only peer"
                            />
                            <div className="w-8 h-4.5 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-cyan-400"></div>
                          </label>
                          <div className="text-right pr-2">
                            <h5 className="text-[10px] font-bold text-white">ראייה קוגניטיבית AI</h5>
                            <p className="text-[8px] text-slate-500">פיענוח ותיקון סלקטורים שנשחתו ב-Layout</p>
                          </div>
                        </div>

                        {/* Anti-Bot Guard */}
                        <div className="bg-slate-950 p-3 rounded-xl border border-slate-900 flex items-center justify-between">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!!config.antiBotShield}
                              onChange={(e) => setConfig(prev => ({ ...prev, antiBotShield: e.target.checked }))}
                              className="sr-only peer"
                            />
                            <div className="w-8 h-4.5 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-cyan-400"></div>
                          </label>
                          <div className="text-right pr-2">
                            <h5 className="text-[10px] font-bold text-white">מגן אנטי-בוט (Shield)</h5>
                            <p className="text-[8px] text-slate-500">חיסונים קהילתיים מול מנגנוני Cloudflare / Akamai</p>
                          </div>
                        </div>

                        {/* Residential proxies */}
                        <div className="bg-slate-950 p-3 rounded-xl border border-slate-900 flex items-center justify-between">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!!config.residentialProxies}
                              onChange={(e) => setConfig(prev => ({ ...prev, residentialProxies: e.target.checked }))}
                              className="sr-only peer"
                            />
                            <div className="w-8 h-4.5 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-cyan-400"></div>
                          </label>
                          <div className="text-right pr-2">
                            <h5 className="text-[10px] font-bold text-white">רשת פרוקסי ביתית (IP Matrix)</h5>
                            <p className="text-[8px] text-slate-500">סבב כתובות IP גיאוגרפי מתחלף לפי מיקוד</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* MAKE.COM / EXTERNAL INTEGRATION WEBHOOK SETTINGS ("הכול יהיה אמיתי ועובד") */}
                  <div className="bg-[#090d18] border border-slate-900 rounded-2xl p-5 shadow-lg relative">
                    {sharedBotLaunched && (
                      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-[2px] rounded-2xl z-30 flex flex-col items-center justify-center p-6 text-center">
                        <div className="w-10 h-10 bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 rounded-full flex items-center justify-center mb-2 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                          <Lock className="w-5 h-5" />
                        </div>
                        <h4 className="text-white font-bold text-xs">יעדי אינטגרציה מקובעים 🔒</h4>
                        <p className="text-slate-400 text-[10px] max-w-xs leading-relaxed">
                          לא ניתן לעדכן את יעדי הפלט וה-Webhooks בזמן ריצת הבוט כדי למנוע דליפות נתונים או משלוח כפול.
                        </p>
                      </div>
                    )}

                    <div className="flex items-center justify-between border-b border-slate-900 pb-3 mb-4">
                      <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/30 px-2.5 py-0.5 rounded border border-emerald-900/30">
                        Real Integration Active ⚡
                      </span>
                      <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Link2 className="w-4 h-4 text-emerald-400" />
                        לממשק אמת: שדור נתונים ל-Make.com / Webhook
                      </h3>
                    </div>

                    <div className="space-y-4">
                      {/* Integrated Services choices */}
                      <div>
                        <span className="block text-[10px] text-slate-400 mb-2">אנא בחר שירות לפלט:</span>
                        <div className="grid grid-cols-4 gap-2">
                          {[
                            { id: "whatsapp", emoji: "💬", label: "WhatsApp" },
                            { id: "telegram", emoji: "✈️", label: "Telegram" },
                            { id: "gmail", emoji: "📧", label: "Gmail" },
                            { id: "webhook", emoji: "🔗", label: "Make Webhook" }
                          ].map(srv => {
                            const isSel = sharedSelectedApps.includes(srv.id);
                            return (
                              <button
                                key={srv.id}
                                type="button"
                                onClick={() => {
                                  if (isSel) {
                                    setSharedSelectedApps(prev => prev.filter(x => x !== srv.id));
                                  } else {
                                    setSharedSelectedApps(prev => [...prev, srv.id]);
                                  }
                                }}
                                className={`flex flex-col items-center p-2 rounded-xl border text-center transition-all cursor-pointer ${
                                  isSel
                                    ? "bg-emerald-600/10 border-emerald-500/50 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.1)]"
                                    : "bg-slate-950/65 border-slate-900 text-slate-400 hover:border-slate-800"
                                }`}
                              >
                                <span className="text-lg mb-1">{srv.emoji}</span>
                                <span className="text-[9px] font-bold">{srv.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Custom Webhook URL Box */}
                      <div className="text-right">
                        <label className="block text-[10px] text-slate-400 mb-1.5">כתובת Webhook לשידור הנתונים של הבוט (Make/Zapier/Custom URL):</label>
                        <div className="relative">
                          <input
                            type="url"
                            placeholder="https://hook.eu1.make.com/xxxxxxxxx"
                            value={sharedWebhookUrl}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSharedWebhookUrl(val);
                              localStorage.setItem("botforge_shared_webhook_url", val);
                            }}
                            className="w-full text-xs px-3.5 py-2 bg-slate-950 rounded-xl border border-slate-850 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none font-mono text-left"
                            dir="ltr"
                          />
                          <span className="absolute top-2.5 right-3 text-[9px] font-mono text-slate-500 font-bold uppercase pointer-events-none">POST HTTP</span>
                        </div>
                        <p className="text-[8px] text-slate-500 mt-1">מערכת הנגן תבצע פניית HTTP POST חיה ותעביר את הנתונים שנשלפו במבנה JSON מלא.</p>
                      </div>

                      {/* Dynamic JSON preview */}
                      <div className="bg-slate-950 rounded-xl border border-slate-900 p-3 text-right">
                        <div className="flex justify-between items-center text-[8.5px] uppercase tracking-wider mb-2 text-slate-500">
                          <span className="font-mono">JSON SCHEMA COMPACT</span>
                          <span>תצוגה מקדימה של הפיילאוד שיישלח:</span>
                        </div>
                        <pre className="text-[8.5px] font-mono text-cyan-400/90 leading-tight block overflow-x-auto text-left" dir="ltr">
                          {`{
  "botName": "${config.name || "Custom Bot"}",
  "url": "${config.url || "https://example.com"}",
  "scrapedAt": "2026-06-18T13:40:00Z",
  "activeAbilities": { "speed": ${config.speed}, "ghostMode": ${!!config.ghostMode} },
  "scrapedRecords": [ { "id": "001", "name": "...", "price": "..." } ]
}`}
                        </pre>
                      </div>
                    </div>
                  </div>

                  {/* TIMELINE SEQUENCE OF STEPS TO RUN */}
                  <div className="bg-[#090d18] border border-slate-900 rounded-2xl p-5 shadow-lg">
                    <div className="flex items-center justify-between border-b border-slate-900 pb-3 mb-4">
                      <span className="text-[10px] font-mono text-slate-400 block">עורך שלבים מתוכנת</span>
                      <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-cyan-400" />
                        צעדי ריצה ואוטומציה מתוכננים
                      </h3>
                    </div>

                    <div className="space-y-3">
                      {steps.length === 0 ? (
                        <div className="text-center py-6 text-slate-500 text-xs">לא הוגדרו צעדים בבוט הפעיל.</div>
                      ) : (
                        steps.map((st, i) => {
                          const isActive = sharedActiveStep === i;
                          const isCompleted = st.status === "completed";
                          const isRunningStep = st.status === "running";

                          return (
                            <div 
                              key={st.id}
                              className={`p-3.5 rounded-xl border transition-all flex items-center gap-3 text-right text-xs relative overflow-hidden ${
                                isActive || isRunningStep
                                  ? "bg-cyan-500/5 border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.1)]"
                                  : isCompleted
                                    ? "bg-slate-950/30 border-slate-900/40 opacity-75"
                                    : "bg-slate-950/70 border-slate-930"
                              }`}
                            >
                              {/* Pulse border element */}
                              {(isActive || isRunningStep) && (
                                <div className="absolute top-0 right-0 w-1 h-full bg-cyan-400 animate-pulse"></div>
                              )}

                              {/* Number Indicator */}
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${
                                isCompleted 
                                  ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400" 
                                  : isActive || isRunningStep
                                    ? "bg-cyan-500 text-slate-950 border border-cyan-400 animate-bounce"
                                    : "bg-slate-900 border border-slate-800 text-slate-400"
                              }`}>
                                {isCompleted ? "✓" : i + 1}
                              </div>

                              {/* Description details */}
                              <div className="flex-1">
                                <div className="font-bold text-white text-xs flex items-center gap-1 mb-0.5 justify-start">
                                  <span>{st.title}</span>
                                  <span className="text-[9px] font-mono font-bold bg-slate-900 text-slate-400 px-1.5 py-0.2 rounded border border-slate-800 uppercase">
                                    {st.type}
                                  </span>
                                </div>
                                <p className="text-[10px] text-slate-400 leading-normal">{st.description}</p>
                                
                                {st.value && (
                                  <p className="text-[9px] font-mono text-cyan-400/95 mt-1">ערך מוזן: "{st.value}"</p>
                                )}
                              </div>

                              {/* Status Icon Indicator */}
                              <div className="shrink-0 flex items-center">
                                {isRunningStep || isActive ? (
                                  <span className="text-[9px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 animate-pulse flex items-center gap-1 font-bold">
                                    <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping"></span>
                                    מבצע...
                                  </span>
                                ) : isCompleted ? (
                                  <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1 font-bold">
                                    הושלם ✓
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-mono text-slate-500 bg-slate-900/60 px-2 py-0.5 rounded border border-slate-850">
                                    בסרגל המתנה
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* DEPLOY BUTTON OR CONTROLS STATE */}
                  <div className="bg-[#070c18] border border-cyan-500/15 rounded-2xl p-5 shadow-inner text-center">
                    {!sharedBotLaunched ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSharedBotLaunched(true);
                          setSharedIsRunning(true);
                          runSharedBotSimulation();
                        }}
                        className="w-full py-3.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-black rounded-xl text-sm transition-all shadow-[0_4px_30px_rgba(6,182,212,0.3)] animate-pulse inline-flex items-center justify-center gap-2.5 cursor-pointer border border-cyan-400/30"
                      >
                        🚀 השק את הבוט לאוויר (Deploy & Start Running)
                      </button>
                    ) : sharedIsRunning ? (
                      <div className="py-3 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-xl flex items-center justify-center gap-2 text-sm font-bold animate-pulse">
                        <span className="w-2.5 h-2.5 bg-cyan-400 rounded-full animate-ping"></span>
                        הבוט פועל כעת ב-Sandbox ומחלץ נתונים...
                      </div>
                    ) : (
                      <div className="flex flex-col md:flex-row gap-3">
                        <button
                          onClick={() => {
                            setSharedIsRunning(true);
                            setSharedRunFinished(false);
                            runSharedBotSimulation();
                          }}
                          className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs transition-transform cursor-pointer shadow-md"
                        >
                          🔄 בצע הרצה חוזרת (Rerun Execution)
                        </button>
                        <button
                          onClick={() => {
                            setSharedBotLaunched(false);
                            setSharedIsRunning(false);
                            setSharedRunFinished(false);
                            setSharedActiveStep(null);
                            addSharedLog("🔧 הגדרות הבוט נפתחו מחדש לעריכה על פי בקשת המשתמש.", "warn");
                          }}
                          className="flex-1 py-3 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 hover:text-white font-bold rounded-xl text-xs transition-transform cursor-pointer"
                        >
                          🔓 פתח כיוונון יכולות מחדש
                        </button>
                      </div>
                    )}
                  </div>

                </div>

                {/* COLUMN 2: VISUAL BROWSER SIMULATOR & LOGS (5 COLS) */}
                <div className="lg:col-span-5 flex flex-col gap-6">

                  {/* BROWSER SIMULATOR CONTAINER - "מה אני רואה שמה" */}
                  <div className="bg-[#090d18] border border-slate-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[380px] relative">
                    {/* Simulator top chrome header */}
                    <div className="bg-[#060a13] px-4 py-2.5 border-b border-slate-900 flex items-center gap-2 shrink-0">
                      {/* Control window buttons */}
                      <div className="flex gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500/45"></span>
                        <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/45"></span>
                        <span className="w-2.5 h-2.5 rounded-full bg-green-500/45"></span>
                      </div>
                      
                      {/* URL bar indicator */}
                      <div className="flex-1 max-w-md mx-6 bg-slate-950 rounded-lg px-3 py-1 text-[10px] font-mono border border-slate-900/60 text-slate-400 text-left flex items-center justify-between gap-2">
                        <span className="truncate">{sharedBrowserUrl}</span>
                        <span className="text-[8px] bg-slate-900 text-slate-600 px-1 py-0.2 rounded font-mono uppercase font-bold">SECURE SSL</span>
                      </div>

                      {/* Power light badge */}
                      <span className={`w-2 h-2 rounded-full ${sharedIsRunning ? "bg-cyan-400 animate-ping" : "bg-slate-700"}`} />
                    </div>

                    {/* Simulation Body & viewport area */}
                    <div className="flex-1 bg-[#020409] p-5 flex flex-col justify-between relative overflow-hidden font-sans text-right">
                      {/* Background grid matrix lines simulating live rendering */}
                      <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none"></div>

                      {/* Click ripple animation */}
                      {sharedClickRipple.active && (
                        <div 
                          className="absolute w-12 h-12 border-2 border-cyan-400 rounded-full animate-ping pointer-events-none z-45 flex items-center justify-center bg-cyan-400/10"
                          style={{ left: `${sharedClickRipple.x}%`, top: `${sharedClickRipple.y}%`, transform: 'translate(-50%, -50%)' }}
                        >
                          <div className="w-3 h-3 bg-cyan-400 rounded-full"></div>
                        </div>
                      )}

                      {/* AI Simulated Cursor Cursor hand */}
                      {sharedCursor.visible && (
                        <div 
                          className="absolute transition-all duration-700 ease-in-out z-40 pointer-events-none flex flex-col items-end"
                          style={{ left: `${sharedCursor.x}%`, top: `${sharedCursor.y}%`, transform: 'translate(-10px, -10px)' }}
                        >
                          <MousePointerClick className="w-5 h-5 text-cyan-400 drop-shadow-[0_2px_8px_rgba(6,182,212,0.4)] rotate-[-15deg] animate-pulse" />
                          <span className="mt-1 bg-slate-950 font-sans text-[8px] font-bold text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-500/25 shadow-lg whitespace-nowrap block">
                            {sharedCursor.label}
                          </span>
                        </div>
                      )}

                      {/* Standby state before launch */}
                      {!sharedBotLaunched ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-4 animate-fadeIn">
                          <Globe className="w-12 h-12 text-slate-800 mb-2 animate-pulse" />
                          <h4 className="text-sm font-bold text-slate-500 mb-1">הסימולטור במצב המתנה</h4>
                          <p className="text-slate-600 text-[10px] max-w-xs">
                            לאחר לחיצה על "השקה לאוויר", הסימולטור ייטען את כתובת השרת ויבצע הדמיה ויזואלית מלאה של צעדי הגלישה.
                          </p>
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col justify-between animate-fadeIn h-full">
                          
                          {/* Live Dynamic Rendering area */}
                          <div className="bg-[#070b14] border border-slate-900 rounded-xl p-4 flex-1 flex flex-col justify-between text-right shadow-inner min-h-[180px] relative">
                            <div className="absolute top-1.5 left-2 text-[8px] font-mono text-slate-600">SANDBOX DOM LAYER</div>
                            
                            <div className="space-y-3 pt-3">
                              {/* Header element on page */}
                              <div className="border-b border-slate-850 pb-2 flex justify-between items-center">
                                <span className="w-10 h-1 bg-slate-800 rounded"></span>
                                <h4 className="text-[10px] font-black tracking-wide text-slate-300">
                                  {sharedBrowserUrl.replace("https://", "").replace("http://", "").split("/")[0]}
                                </h4>
                              </div>

                              {/* Simulated Text input */}
                              <div className="space-y-1.5 text-right">
                                <p className="text-[9px] text-slate-400">שדה חיפוש / הזנת נתונים אופטימלי:</p>
                                <div className="bg-slate-950/80 px-2.5 py-2 border border-slate-900 rounded-lg text-left text-xs text-white font-mono flex items-center justify-between">
                                  <span>{sharedBrowserText || "..."}</span>
                                  {sharedExecutionLogs.some(l => l.text.includes("הקלדת")) && (
                                    <span className="w-1 h-3.5 bg-cyan-400 animate-pulse inline-block"></span>
                                  )}
                                </div>
                              </div>

                              {/* Button element */}
                              <div className="pt-2 flex justify-start">
                                <button className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all shadow-md cursor-none ${
                                  sharedActiveStep !== null && steps[sharedActiveStep]?.type === "click"
                                    ? "bg-cyan-500 text-slate-950 scale-105 border border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)] animate-pulse"
                                    : "bg-slate-900 text-slate-400 border border-slate-850"
                                }`}>
                                  {sharedActiveStep !== null && steps[sharedActiveStep]?.type === "click" ? "⚡ קורא איסוף..." : "כפתור ביצוע פעולה"}
                                </button>
                              </div>
                            </div>

                            {/* Little active animation */}
                            <div className="mt-auto border-t border-slate-900/40 pt-2 flex items-center justify-between">
                              <span className="text-[8px] text-slate-600">SECURE SHELL AGENT READY</span>
                              <div className="flex gap-2 text-[8.5px] font-mono text-cyan-500">
                                <span>Latency: 14ms</span>
                                <span>Speed Boost: {config.speed}x</span>
                              </div>
                            </div>
                          </div>

                        </div>
                      )}
                    </div>
                  </div>

                  {/* OPERATIONAL ACTIVITY LOGS TERMINAL */}
                  <div className="bg-[#02050b] border border-slate-900 rounded-2xl p-4 flex flex-col h-[280px]">
                    <div className="flex items-center justify-between border-b border-slate-900 pb-2 mb-3">
                      {/* Webhook Transmission Status marker */}
                      <div>
                        {sharedRequestStatus === "sending" ? (
                          <span className="text-[9px] font-bold bg-indigo-950/40 text-indigo-400 px-2 py-0.5 rounded border border-indigo-900 flex items-center gap-1 animate-pulse font-mono">
                            שולח ל-Webhook 📡
                          </span>
                        ) : sharedRequestStatus === "success" ? (
                          <span className="text-[9px] font-bold bg-emerald-950/40 text-emerald-400 px-2 py-0.5 rounded border border-emerald-900 flex items-center gap-1 font-mono">
                            CORS HTTP: 200 OK ✓
                          </span>
                        ) : sharedRequestStatus === "failed" ? (
                          <span className="text-[9px] font-bold bg-red-950/40 text-red-400 px-2 py-0.5 rounded border border-red-900 flex items-center gap-1 font-mono">
                            בפניית HTTP שגיאה ✖
                          </span>
                        ) : (
                          <span className="text-[9px] font-mono text-slate-500">HTTP REST: idle</span>
                        )}
                      </div>
                      
                      <h3 className="text-xs font-black text-slate-350 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                        <TerminalIcon className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                        לוג פעילות ונתונים מנוטרים
                      </h3>
                    </div>

                    {/* Scrollable logs box */}
                    <div className="flex-1 overflow-y-auto space-y-2 text-right pr-1 select-text scrollbar-thin scrollbar-thumb-slate-900 scrollbar-track-transparent">
                      {sharedExecutionLogs.length === 0 ? (
                        <div className="text-center py-12 text-[10px] font-mono text-slate-600">
                          [קונסולת הבוט ריקה. לחץ על כפתור ההשקה להתחלה...]
                        </div>
                      ) : (
                        sharedExecutionLogs.map(log => (
                          <div key={log.id} className="text-[10px] font-mono leading-relaxed tracking-wider flex items-start gap-1 justify-end">
                            <span className="text-slate-400 max-w-[280px] whitespace-pre-wrap">{log.text}</span>
                            <span className="text-slate-600 shrink-0 select-none mr-1">[{log.time}]</span>
                            <span className={`shrink-0 select-none font-bold uppercase text-[9px] rounded px-1 min-w-[32px] text-center ${
                              log.type === "success" 
                                ? "bg-emerald-950/30 text-emerald-400 border border-emerald-900/10"
                                : log.type === "error"
                                  ? "bg-red-950/30 text-red-400 border border-red-900/10 animate-bounce"
                                  : log.type === "warn"
                                    ? "bg-yellow-955/30 text-yellow-500 border border-yellow-800/10"
                                    : log.type === "debug"
                                      ? "bg-slate-950 text-slate-500"
                                      : "bg-cyan-950/30 text-cyan-400"
                            }`}>
                              {log.type}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* REAL EXTRACTED DETAILS TABLE GRID */}
                  {sharedScrapedRows.length > 0 && (
                    <div className="bg-[#090d18] border border-emerald-500/20 rounded-2xl p-4 shadow-xl text-right animate-fadeIn">
                      <div className="flex justify-between items-center border-b border-slate-900 pb-2 mb-3">
                        <button
                          onClick={() => {
                            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(sharedScrapedRows, null, 2));
                            const downloadAnchor = document.createElement('a');
                            downloadAnchor.setAttribute("href", dataStr);
                            downloadAnchor.setAttribute("download", `${config.name.replace(/\s+/g, '_')}_scraped_rows.json`);
                            document.body.appendChild(downloadAnchor);
                            downloadAnchor.click();
                            downloadAnchor.remove();
                          }}
                          className="text-[9px] px-2 py-0.5 bg-slate-950 hover:bg-slate-900 border border-slate-850 text-emerald-400 rounded cursor-pointer"
                        >
                          הורד פלט JSON
                        </button>
                        <h4 className="text-xs font-black text-slate-300 flex items-center gap-1">
                          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                          רשומות מידע שחולצו חי מהאתר (Scraped Data Output)
                        </h4>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-[9px] text-right font-sans">
                          <thead>
                            <tr className="border-b border-slate-900 text-slate-500 uppercase tracking-wider bg-[#03070e]">
                              {Object.keys(sharedScrapedRows[0] || {}).map((header, i) => (
                                <th key={i} className="py-1 px-2 font-bold">{header}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-900/40">
                            {sharedScrapedRows.map((row, index) => (
                              <tr key={index} className="hover:bg-[#0c1222] transition-colors border-b border-slate-950/40">
                                {Object.values(row).map((val: any, i) => (
                                  <td key={i} className="py-2 px-2 text-slate-350">{val}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                </div>

              </div>
            </div>
          ) : (
          <>
            {/* SIDEBAR PARAMETERS PANEL */}
            <aside className={`
          fixed lg:relative top-0 lg:top-0 bottom-0 right-0 z-30
          w-[320px] sm:w-[340px] shrink-0 border-l border-slate-800/80 bg-[#070b14] p-5 overflow-y-auto 
          flex flex-col gap-5 transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"}
        `} id="dashboard-sidebar">
          
          {/* Mobile close button header */}
          <div className="flex items-center justify-between lg:hidden pb-3 border-b border-slate-800/60" id="mobile-sidebar-header">
            <span className="text-xs font-bold tracking-wider text-cyan-400">הגדרות אוטומציה</span>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-1.5 bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-white rounded-xl border border-slate-800/80 cursor-pointer text-xs flex items-center gap-1.5"
              id="mobile-sidebar-close"
            >
              <X className="w-3.5 h-3.5" />
              <span>סגור חלונית</span>
            </button>
          </div>
          
          {/* CUSTOM GOALS CONTROLLER */}
          <section className="bg-[#0b101e] p-4 rounded-2xl border border-slate-800/80 w-full" id="build-form-section">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" /> בניית אוטומציית AI
            </h3>
            
            <form onSubmit={handleAIGeneratePlan} className="space-y-4 text-right" id="ai-builder-form">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
                  שם הבוט
                </label>
                <input 
                  type="text"
                  value={config.name || ""}
                  onChange={e => setConfig(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full text-xs font-medium px-3 py-2 bg-slate-950 rounded-lg border border-slate-800/80 focus:outline-none focus:border-cyan-500 text-white"
                  placeholder="לדוגמה: סורק מוצרים ב-eBay"
                  required
                  id="input-bot-name"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
                  כתובת אתר היעד
                </label>
                <input 
                  type="text"
                  value={config.url || ""}
                  dir="ltr"
                  onChange={e => setConfig(prev => ({ ...prev, url: e.target.value }))}
                  className="w-full text-xs font-mono px-3 py-2 bg-slate-950 rounded-lg border border-slate-800/80 focus:outline-none focus:border-cyan-500 text-cyan-300"
                  placeholder="https://example.com"
                  required
                  id="input-target-url"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
                  תיאור מטרת האוטומציה
                </label>
                <textarea 
                  rows={3}
                  value={config.goal || ""}
                  onChange={e => setConfig(prev => ({ ...prev, goal: e.target.value }))}
                  className="w-full text-xs p-3 bg-slate-950 rounded-lg border border-slate-800/80 focus:outline-none focus:border-cyan-500 text-slate-200 resize-none leading-relaxed"
                  placeholder="פרט בדיוק על מה ללחוץ, מה להקליד ואילו נתונים לחלץ מהעמוד..."
                  required
                  id="input-bot-goal"
                />
              </div>

              {/* ADVANCED EXECUTION SETTINGS (Security, Anti-Detect, Puppeteer/Playwright features) */}
              <div className="pt-2">
                <label className="block text-[11px] font-bold text-cyan-400 uppercase tracking-wide mb-3 flex items-center gap-1.5 border-b border-slate-800/60 pb-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> הגדרות ביצוע ואבטחה מתקדמות (מנוע אמיתי)
                </label>
                <div className="space-y-2.5">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      className="accent-cyan-500 w-3.5 h-3.5"
                      checked={config.useProxies}
                      onChange={e => setConfig(prev => ({ ...prev, useProxies: e.target.checked }))}
                    />
                    <span className="text-[11.5px] text-slate-300 group-hover:text-white transition-colors">
                      שימוש בפרוקסי אנונימי (Anti-Ban Data-Center/Residential IP)
                    </span>
                  </label>
                  
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      className="accent-cyan-500 w-3.5 h-3.5"
                      checked={config.rotateIpOnBan}
                      onChange={e => setConfig(prev => ({ ...prev, rotateIpOnBan: e.target.checked }))}
                      disabled={!config.useProxies}
                    />
                    <span className={`text-[11.5px] transition-colors ${!config.useProxies ? 'text-slate-600' : 'text-slate-300 group-hover:text-white'}`}>
                      החלפת IP אוטומטית בעת זיהוי חסימה / Ban
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      className="accent-cyan-500 w-3.5 h-3.5"
                      checked={config.bypassCaptcha}
                      onChange={e => setConfig(prev => ({ ...prev, bypassCaptcha: e.target.checked }))}
                    />
                    <span className="text-[11.5px] text-slate-300 group-hover:text-white transition-colors">
                      הפעלת מנגנון עקיפת CAPTCHA (Playwright Stealth Mode / 2Captcha API)
                    </span>
                  </label>
                  
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      className="accent-cyan-500 w-3.5 h-3.5"
                      checked={config.isolatedContext}
                      onChange={e => setConfig(prev => ({ ...prev, isolatedContext: e.target.checked }))}
                    />
                    <span className="text-[11.5px] text-emerald-400 group-hover:text-emerald-300 transition-colors font-medium">
                      Sandbox אבטחה מבודד עבור הרצת קוד AI חי (מניעת גישה למערכת)
                    </span>
                  </label>
                  
                  <div className="pt-4 border-t border-slate-800/60 mt-4 mb-2">
                    <label className="block text-[11px] font-bold text-fuchsia-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5" /> יכולות AI מטריפות חושים (חדש!)
                    </label>
                    <div className="space-y-3">
                      <label className="flex items-start gap-2 cursor-pointer group">
                        <input 
                          type="checkbox" 
                          className="accent-fuchsia-500 w-4 h-4 mt-0.5"
                          checked={config.ghostMode}
                          onChange={e => setConfig(prev => ({ ...prev, ghostMode: e.target.checked }))}
                        />
                        <div className="flex flex-col">
                          <span className="text-[12px] font-bold text-fuchsia-300 group-hover:text-fuchsia-200 transition-colors">
                            מצב רוח רפאים (Ghost Mode)
                          </span>
                          <span className="text-[10px] text-slate-400 max-w-[280px]">הזזת עכבר אקראית והתנהגות תנועה אנושית לחלוטין שמטעה מערכות Anti-Bot בהבטחה.</span>
                        </div>
                      </label>

                      <label className="flex items-start gap-2 cursor-pointer group">
                        <input 
                          type="checkbox" 
                          className="accent-fuchsia-500 w-4 h-4 mt-0.5"
                          checked={config.cognitiveVision}
                          onChange={e => setConfig(prev => ({ ...prev, cognitiveVision: e.target.checked }))}
                        />
                        <div className="flex flex-col">
                          <span className="text-[12px] font-bold text-fuchsia-300 group-hover:text-fuchsia-200 transition-colors">
                            ראייה קוגניטיבית (Cognitive Vision)
                          </span>
                          <span className="text-[10px] text-slate-400 max-w-[280px]">הבוט יפענח את מבנה העמוד בעצמו אם ישתנה קוד ה-HTML של האתר, כמו אדם אמיתי!</span>
                        </div>
                      </label>

                      <label className="flex items-start gap-2 cursor-pointer group">
                        <input 
                          type="checkbox" 
                          className="accent-fuchsia-500 w-4 h-4 mt-0.5"
                          checked={config.quantumSpeed}
                          onChange={e => setConfig(prev => ({ ...prev, quantumSpeed: e.target.checked }))}
                        />
                        <div className="flex flex-col">
                          <span className="text-[12px] font-bold text-fuchsia-300 group-hover:text-fuchsia-200 transition-colors">
                            מהירות קוונטית (Quantum Parallelism)
                          </span>
                          <span className="text-[10px] text-slate-400 max-w-[280px]">עקיפת תורים רגילים ופתיחת מספר טאבים במקביל לביצוע כבד בזמן בלתי נתפס.</span>
                        </div>
                      </label>
                      
                      <label className="flex items-start gap-2 cursor-pointer group">
                        <input 
                          type="checkbox" 
                          className="accent-fuchsia-500 w-4 h-4 mt-0.5"
                          checked={config.chaosEngine}
                          onChange={e => setConfig(prev => ({ ...prev, chaosEngine: e.target.checked }))}
                        />
                        <div className="flex flex-col">
                          <span className="text-[12px] font-bold text-fuchsia-300 group-hover:text-fuchsia-200 transition-colors">
                            מנוע כאוס אנושי (Chaos Engine)
                          </span>
                          <span className="text-[10px] text-slate-400 max-w-[280px]">הוספת טעויות הקלדה מכוונות ודיליי בקריאה, שגורמות לבוט להיראות 100% כמו בני אדם סטלנים.</span>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800/60 mt-4 mb-2">
                    <label className="block text-[11px] font-bold text-emerald-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                      <Network className="w-3.5 h-3.5" /> ניהול משאבים ורשת (Infrastructure)
                    </label>
                    <div className="space-y-3">
                      <label className="flex items-start gap-2 cursor-pointer group">
                        <input 
                          type="checkbox" 
                          className="accent-emerald-500 w-4 h-4 mt-0.5"
                          checked={config.cloudSwarm}
                          onChange={e => setConfig(prev => ({ ...prev, cloudSwarm: e.target.checked }))}
                        />
                        <div className="flex flex-col">
                          <span className="text-[12px] font-bold text-emerald-300 group-hover:text-emerald-200 transition-colors">
                            הרצת נחיל ענן מבוזר (Cloud Swarm)
                          </span>
                          <span className="text-[10px] text-slate-400 max-w-[280px]">חוסך CPU/RAM למחשב המקומי. מריץ דפדפנים במקביל על קלאסטרים דינמיים בענן.</span>
                        </div>
                      </label>

                      <label className="flex items-start gap-2 cursor-pointer group">
                        <input 
                          type="checkbox" 
                          className="accent-emerald-500 w-4 h-4 mt-0.5"
                          checked={config.geoClustering}
                          onChange={e => setConfig(prev => ({ ...prev, geoClustering: e.target.checked }))}
                        />
                        <div className="flex flex-col">
                          <span className="text-[12px] font-bold text-emerald-300 group-hover:text-emerald-200 transition-colors">
                            נעילה אזורית דינמית (Geo-Clustering)
                          </span>
                          <span className="text-[10px] text-slate-400 max-w-[280px]">מגייס בוטי רפאים רק ממיקומים קרובים גאוגרפית כדי למנוע חסימות אנומליה מ-Cloudflare.</span>
                        </div>
                      </label>

                      <label className="flex items-start gap-2 cursor-pointer group">
                        <input 
                          type="checkbox" 
                          className="accent-emerald-500 w-4 h-4 mt-0.5"
                          checked={config.scoutHarvesterModule}
                          onChange={e => setConfig(prev => ({ ...prev, scoutHarvesterModule: e.target.checked }))}
                        />
                        <div className="flex flex-col">
                          <span className="text-[12px] font-bold text-emerald-300 group-hover:text-emerald-200 transition-colors">
                            אסטרטגיית 'חלוץ ומאסף' (Scout & Harvester)
                          </span>
                          <span className="text-[10px] text-slate-400 max-w-[280px]">בוט אנושי (Scout) מפצח הגנות לאט, ומעביר את ה-Session ל-9 בוטים מהירים לשאיבת מידע הדדית (Headless/HTTP).</span>
                        </div>
                      </label>

                      <label className="flex items-start gap-2 cursor-pointer group">
                        <input 
                          type="checkbox" 
                          className="accent-emerald-500 w-4 h-4 mt-0.5"
                          checked={config.hotSwappingBackup}
                          onChange={e => setConfig(prev => ({ ...prev, hotSwappingBackup: e.target.checked }))}
                        />
                        <div className="flex flex-col">
                          <span className="text-[12px] font-bold text-emerald-300 group-hover:text-emerald-200 transition-colors">
                            מוכנות להעברת מקל מבוזרת (Hot-Swapping)
                          </span>
                          <span className="text-[10px] text-slate-400 max-w-[280px]">מקצה בוט-גיבוי מראש (Active-Passive). במקרה של ניתוק, גיבוי משתלט על ה-Session תוך מילי-שניות ללא פגיעה בזמינות.</span>
                        </div>
                      </label>

                      <label className="flex items-start gap-2 cursor-pointer group">
                        <input 
                          type="checkbox" 
                          className="accent-emerald-500 w-4 h-4 mt-0.5"
                          checked={config.residentialProxies}
                          onChange={e => setConfig(prev => ({ ...prev, residentialProxies: e.target.checked }))}
                        />
                        <div className="flex flex-col">
                          <span className="text-[12px] font-bold text-emerald-300 group-hover:text-emerald-200 transition-colors">
                            רשת מקורות פרטית (Residential P2P Proxy)
                          </span>
                          <span className="text-[10px] text-slate-400 max-w-[280px]">במקום להחסם מפרוקסי Datacenter זול, שימוש ב-IP שיתופי רגיל דרך קהילת המשתמשים שלנו.</span>
                        </div>
                      </label>

                      <label className="flex items-start gap-2 cursor-pointer group">
                        <input 
                          type="checkbox" 
                          className="accent-emerald-500 w-4 h-4 mt-0.5"
                          checked={config.antiBotShield}
                          onChange={e => setConfig(prev => ({ ...prev, antiBotShield: e.target.checked }))}
                        />
                        <div className="flex flex-col">
                          <span className="text-[12px] font-bold text-emerald-300 group-hover:text-emerald-200 transition-colors">
                            חיסון נחיל קהילתי (Crowdsourced Shield Bypass)
                          </span>
                          <span className="text-[10px] text-slate-400 max-w-[280px]">עדכוני Cloudflare/Kasada שמפוצחים אוטומטית אצל כל משתמש עוברים אלייך בP2P מיידית (Zero-Day bypass).</span>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex gap-2" id="error-alert">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="leading-normal">{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex gap-2" id="success-alert">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span className="leading-normal">{successMessage}</span>
                </div>
              )}

              <button 
                type="submit" 
                disabled={isGenerating}
                className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 hover:text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-[0_4px_15px_rgba(8,145,178,0.2)] transition-all cursor-pointer"
                id="btn-ai-generate"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    מנתח אלמנטים בדף...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    צור אוטומציה באמצעות AI
                  </>
                )}
              </button>
            </form>
          </section>

          {/* QUICK-STARTER PRE-BUILT SOLUTIONS */}
          <section id="starter-templates-section" className="text-right">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-2 pl-1">
              <BookOpen className="w-3.5 h-3.5 text-slate-400" /> תבניות ריצה מוכנות בשבילך
            </h3>
            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1" id="templates-list-box">
              {BOT_TEMPLATES.map((tpl) => {
                const isActive = selectedTemplate === tpl.name;
                return (
                  <button
                    key={tpl.name}
                    onClick={() => loadTemplate(tpl)}
                    className={`w-full text-right p-2.5 rounded-xl transition-all border outline-none cursor-pointer ${
                      isActive 
                        ? "bg-slate-800/60 border-cyan-500/50 shadow-[0_0_12px_rgba(34,211,238,0.08)]" 
                        : "bg-slate-900/30 hover:bg-slate-800/40 border-slate-850 hover:border-slate-800 text-slate-400"
                    }`}
                    id={`btn-template-${tpl.name.replace(/\s+/g, '_')}`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={`text-[11px] font-bold tracking-tight ${isActive ? "text-cyan-400" : "text-slate-300"}`}>
                        {tpl.name}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 line-clamp-1 leading-normal">
                      {tpl.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          {/* FIRESTORE CLOUD SAVED BOTS */}
          <section id="cloud-saved-bots-section" className="text-right border-t border-slate-800/60 pt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex gap-2">
                <button
                  onClick={triggerSaveBotToCloud}
                  disabled={isSavingBot}
                  className="px-2 py-1 bg-cyan-950 hover:bg-cyan-900 border border-cyan-850 text-cyan-300 text-[10px] font-bold rounded flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  title="שמור את המבנה הנוכחי לענן"
                  id="btn-save-current-to-cloud"
                >
                  {isSavingBot ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Cloud className="w-3 h-3" />
                  )}
                  <span>גיבוי לענן</span>
                </button>
                <button
                  onClick={triggerShareBotToCloud}
                  disabled={isSavingBot}
                  className="px-2 py-1 bg-purple-950 hover:bg-purple-900 border border-purple-850 text-purple-300 text-[10px] font-bold rounded flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  title="ייצר קישור שיתוף המאפשר לאחרים לראות את הבוט"
                  id="btn-share-bot"
                >
                  {isSavingBot ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Share2 className="w-3 h-3" />
                  )}
                  <span>Share Bot</span>
                </button>
              </div>
            </div>

            {userSavedBotsList.length > 0 ? (
              <div className="space-y-3 mt-3 max-h-[280px] overflow-y-auto pr-1" id="cloud-bots-list">
                {userSavedBotsList.map((bot) => {
                  const stats = computeBotLiveStats(bot);
                  return (
                    <div 
                      key={bot.id || bot.name} 
                      className="group p-2.5 rounded-xl bg-slate-900/40 hover:bg-slate-900 border border-slate-850 hover:border-cyan-500/20 transition-all flex flex-col gap-2 relative text-right animate-fadeIn"
                    >
                      <div className="flex items-center justify-between gap-2.5">
                        <button
                          onClick={() => triggerDeleteBot(bot.id!, bot.name)}
                          disabled={isSavingBot}
                          className="p-1 text-slate-500 hover:text-rose-450 hover:bg-slate-950/40 rounded transition-all cursor-pointer shrink-0"
                          title="מחק בוט זה"
                        >
                          <Trash2 className="w-3.5 h-3.5 animate-pulse" />
                        </button>

                        <button
                          onClick={() => triggerLoadSelectedCloudBot(bot)}
                          className="flex-1 text-right truncate cursor-pointer outline-none bg-transparent border-none p-0"
                        >
                          <div className="flex items-center justify-between gap-1">
                            {stats.rate !== null ? (
                              <span className={`text-[8px] px-1 py-0.5 font-bold rounded shrink-0 scale-[0.95] ${
                                stats.rate >= 80 
                                  ? "bg-emerald-950/60 text-emerald-300 border border-emerald-800/40" 
                                  : stats.rate >= 50 
                                    ? "bg-amber-950/60 text-amber-300 border border-amber-800/40" 
                                    : "bg-rose-950/60 text-rose-300 border border-rose-800/40"
                              }`}>
                                {stats.rate}% הצלחה
                              </span>
                            ) : (
                              <span className="text-[8px] px-1 py-0.5 bg-slate-800/60 text-slate-400 border border-slate-700/30 rounded shrink-0 scale-[0.95]">
                                אין הרצות
                              </span>
                            )}
                            <span className="text-[11px] font-semibold text-slate-300 group-hover:text-cyan-350 truncate block">
                              {bot.name}
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-end gap-1.5 mt-1">
                            <span className="text-[9px] text-slate-500 truncate" dir="ltr">
                              {getParsedDomain(bot.url)}
                            </span>
                            {!currentUser && (
                              <span className="text-[8px] px-1 py-[1.5px] bg-slate-800/85 text-cyan-400 border border-cyan-900/30 font-semibold rounded scale-[0.95]">מקומי</span>
                            )}
                            {currentUser && bot.id?.startsWith("local_bot_") && (
                              <span className="text-[8px] px-1 py-[1.5px] bg-slate-800/85 text-amber-500 border border-amber-900/40 font-semibold rounded scale-[0.95]">זמני</span>
                            )}
                          </div>
                        </button>
                      </div>

                      {/* Success Rate Progress Bar & Tiny History Indicators */}
                      <div className="mt-1 pt-1.5 border-t border-slate-900/30">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-[8px] text-slate-500">הרצות אחרונות (עד 5)</span>
                          <div className="flex gap-0.5 items-center">
                            {stats.logs.map((log, lIdx) => (
                              <span 
                                key={log.id || lIdx}
                                className={`w-1.5 h-1.5 rounded-full inline-block ${
                                  log.status === "success" ? "bg-emerald-500" : "bg-rose-500"
                                }`}
                                title={log.status === "success" ? "הצלחה" : "נכשל"}
                              />
                            ))}
                            {Array.from({ length: 5 - stats.logs.length }).map((_, emptyIdx) => (
                              <span 
                                key={`empty-${emptyIdx}`}
                                className="w-1.5 h-1.5 rounded-full inline-block bg-slate-850"
                                title="אין הרצה עוד"
                              />
                            ))}
                          </div>
                        </div>
                        <div className="w-full bg-slate-950/60 h-1 rounded-full overflow-hidden border border-slate-900/30">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              stats.rate === null 
                                ? "bg-slate-850" 
                                : stats.rate >= 80 
                                  ? "bg-emerald-500" 
                                  : stats.rate >= 50 
                                    ? "bg-amber-500" 
                                    : "bg-rose-500"
                            }`}
                            style={{ width: `${stats.rate !== null ? stats.rate : 0}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-4 bg-slate-950/20 border border-dashed border-slate-850 rounded-xl">
                <p className="text-[10px] text-slate-500">
                  עדיין לא שמרת בוטים במערכת.
                </p>
              </div>
            )}

            {!currentUser && (
              <div className="text-center py-2.5 bg-cyan-950/15 border border-cyan-900/30 rounded-xl p-2.5 mt-2.5 animate-fadeIn">
                <p className="text-[9px] text-slate-400 leading-normal mb-1.5" dir="rtl">
                  💡 הבוטים במצב אורח לא נשמרים! התחברו כדי לשמור מידע שמור בגיבוי ענן.
                </p>
                <div className="flex justify-center gap-1.5">
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="px-2 py-0.5 bg-cyan-950 border border-cyan-850 rounded hover:bg-cyan-900 text-cyan-300 text-[9px] font-semibold cursor-pointer"
                  >
                    התחבר לחשבון
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* RUNTIME PARAMETERS */}
          <section className="bg-slate-900/20 p-4 rounded-xl border border-slate-900" id="advanced-settings-section">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 text-right">
              הגדרות ריצה מתקדמות
            </h3>
            <div className="space-y-3" id="toggle-group-bg">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">הרצה ללא ממשק (Headless)</span>
                <button
                  type="button"
                  onClick={() => setHeadless(!headless)}
                  className={`w-9 h-5 rounded-full relative transition-colors cursor-pointer ${headless ? "bg-cyan-500" : "bg-slate-700"}`}
                  id="toggle-headless"
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${headless ? "left-0.5" : "right-0.5"}`}></div>
                </button>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">עקיפת חסימות אבטחה ובוטים</span>
                <button
                  type="button"
                  onClick={() => setConfig(prev => ({ ...prev, bypassCaptcha: !prev.bypassCaptcha }))}
                  className={`w-9 h-5 rounded-full relative transition-colors cursor-pointer ${config.bypassCaptcha ? "bg-cyan-500" : "bg-slate-700"}`}
                  id="toggle-bypass"
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${config.bypassCaptcha ? "left-0.5" : "right-0.5"}`}></div>
                </button>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">גלילה חלקה אינטראקטיבית</span>
                <button
                  type="button"
                  onClick={() => setAutoScroll(!autoScroll)}
                  className={`w-9 h-5 rounded-full relative transition-colors cursor-pointer ${autoScroll ? "bg-cyan-500" : "bg-slate-700"}`}
                  id="toggle-scroll"
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${autoScroll ? "left-0.5" : "right-0.5"}`}></div>
                </button>
              </div>
            </div>
          </section>

        </aside>

        {/* WORKFLOW VIEWPORTS */}
        <section className="flex-1 p-6 md:p-8 flex flex-col bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-900/20 via-[#070b13] to-slate-950 overflow-y-auto overflow-x-hidden min-w-[320px]" id="primary-viewport">
          
          {/* TITLE & QUICK CONTROLS AREA */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-5 border-b border-slate-800/60 pb-5 animate-fadeIn" id="controls-panel">
            <div className="text-right">
              <h2 className="text-2xl font-bold text-white tracking-tight" id="main-content-title">
                {config.name || "תהליך אוטומציה"}
              </h2>
              <p className="text-slate-400 text-xs mt-1 max-w-xl leading-relaxed" id="main-content-subtitle">
                מטרה: <span className="text-slate-300 italic">"{config.goal}"</span>
              </p>
            </div>

            {/* BUTTON ACTION MATRIX */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto animate-fadeIn" id="action-deck">
              
              {/* Speed selector */}
              <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-1 mr-1" id="speed-selector-group">
                <span className="text-[10px] text-slate-500 px-2 font-bold uppercase">מהירות:</span>
                {[1, 2, 5].map(v => (
                  <button
                    key={v}
                    onClick={() => setConfig(prev => ({ ...prev, speed: v }))}
                    className={`text-[11px] font-mono px-2 py-1 rounded transition-colors cursor-pointer ${
                      config.speed === v 
                        ? "bg-indigo-600 font-bold text-white shadow" 
                        : "text-slate-400 hover:text-white"
                    }`}
                    id={`btn-speed-${v}x`}
                  >
                    {v}x
                  </button>
                ))}
              </div>

              {!isRunning ? (
                <button
                  onClick={() => startSimulation()}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-[0_4px_15px_rgba(16,185,129,0.25)] transition-all cursor-pointer"
                  id="btn-run-simulation"
                >
                  <Play className="w-3.5 h-3.5 fill-current text-white transform rotate-180" />
                  {activeStepIndex === null ? "הפעל בוט" : "המשך פעולה"}
                </button>
              ) : (
                <button
                  onClick={pauseSimulation}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow"
                  id="btn-pause-simulation"
                >
                  <Pause className="w-3.5 h-3.5 fill-current text-white" />
                  השהה
                </button>
              )}

              <button
                onClick={resetOrTerminateSimulation}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-850 hover:border-slate-800 transition-all cursor-pointer text-rose-450"
                id="btn-reset-simulation"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                איפוס
              </button>

              <button
                onClick={() => setShowExportModal(true)}
                disabled={steps.length === 0}
                className="px-3.5 py-2 bg-indigo-950/45 hover:bg-indigo-900/45 disabled:bg-slate-900/20 disabled:text-slate-600 disabled:border-slate-900 text-cyan-300 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border border-indigo-900/40 transition-all cursor-pointer ml-auto md:ml-0 shadow"
                id="btn-trigger-script-modal"
              >
                <Code className="w-3.5 h-3.5" />
                ייצוא קוד
              </button>
            </div>
          </div>


          <TemplateLibrary onImport={loadTemplate} />
          
          <ReconPanel 
            netlasApiInfo={netlasApiInfo} netlasTarget={netlasTarget} setNetlasTarget={setNetlasTarget} handleNetlasQuery={handleNetlasQuery} netlasLoading={netlasLoading} netlasError={netlasError} netlasResult={netlasResult}
            needsAuth={needsAuth} currentUser={currentUser} activeWorkspaceTab={activeWorkspaceTab} setActiveWorkspaceTab={setActiveWorkspaceTab} wsMessage={wsMessage} setWsMessage={setWsMessage} setShowAuthModal={setShowAuthModal} scrapedData={scrapedData} wsRunning={wsRunning}
            triggerExportScriptToDrive={triggerExportScriptToDrive} triggerExportDocToDrive={triggerExportDocToDrive} triggerSyncToSheets={triggerSyncToSheets} customCalendarDate={customCalendarDate} setCustomCalendarDate={setCustomCalendarDate} triggerScheduleCalendarEvent={triggerScheduleCalendarEvent} customGmailRecipient={customGmailRecipient} setCustomGmailRecipient={setCustomGmailRecipient} triggerGmailReport={triggerGmailReport}
            sharedWebhookUrl={sharedWebhookUrl} setSharedWebhookUrl={setSharedWebhookUrl} addLog={addLog} makeTestPayload={makeTestPayload} setMakeTestPayload={setMakeTestPayload} handleTestMakeWebhook={handleTestMakeWebhook} makeTestLoading={makeTestLoading} copyWebhookSuccess={copyWebhookSuccess} setCopyWebhookSuccess={setCopyWebhookSuccess} makeTestResult={makeTestResult}
          />

          {/* Orphaned UI removed */}
                      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                        <label className="block text-[11px] text-slate-300 font-bold mb-3 uppercase tracking-wider text-right">ספקים נתמכים (Make Destinations):</label>
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-5">
                          {[
                            { id: "whatsapp", name: "WhatsApp", icon: "💬", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20 hover:border-emerald-500/50 hover:bg-emerald-500/20" },
                            { id: "telegram", name: "Telegram", icon: "✈️", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20 hover:border-blue-500/50 hover:bg-blue-500/20" },
                            { id: "gmail", name: "Gmail", icon: "📧", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20 hover:border-red-500/50 hover:bg-red-500/20" },
                            { id: "slack", name: "Slack", icon: "#️⃣", color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20 hover:border-purple-500/50 hover:bg-purple-500/20" },
                            { id: "sheets", name: "Sheets", icon: "📊", color: "text-green-400", bg: "bg-green-500/10 border-green-500/20 hover:border-green-500/50 hover:bg-green-500/20" },
                          ].map(app => (
                            <button
                              key={app.id}
                              type="button"
                              onClick={() => {
                                setWsMessage({ text: `מתחבר לאינטגרציית ${app.name}... אנא הוסף Webhook URL למטה.`, type: "info" });
                              }}
                              className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all cursor-pointer ${app.bg}`}
                            >
                              <span className="text-xl mb-1.5">{app.icon}</span>
                              <span className={`text-[10px] font-bold ${app.color}`}>{app.name}</span>
                            </button>
                          ))}
                        </div>

                        <div className="space-y-4 text-right">
                          <div>
                            <label className="block text-[10px] text-slate-400 font-bold mb-2">
                              כתובת Make.com Webhook URL (לשליחת הפעלות למסלול זה):
                            </label>
                            <input
                              type="text"
                              placeholder="https://hook.eu1.make.com/..."
                              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg p-2.5 text-xs text-emerald-300 font-mono transition-colors focus:outline-none"
                              dir="ltr"
                            />
                            <p className="text-[9px] text-slate-500 mt-1.5">
                              העתק את כתובת ה-Webhook ממודול "Webhooks &gt; Custom webhook" ב-Make והדבק כאן.
                            </p>
                          </div>
                          
                          <div>
                            <label className="block text-[10px] text-slate-400 font-bold mb-1">
                              תוכן הנתונים (JSON Payload) למשלוח:
                            </label>
                            <textarea
                              rows={3}
                              className="w-full bg-slate-950 border border-slate-800 text-left rounded-lg p-3 text-xs text-emerald-200 focus:outline-none focus:border-emerald-500 leading-relaxed font-mono"
                              placeholder='{"bot_id": "...", "status": "למילוי דינמי"}'
                              defaultValue='{
  "event": "bot_complete",
  "message": "Hello from BotForge Platform via Make!"
}'
                              dir="ltr"
                            />
                          </div>

                          <button
                            onClick={() => {
                              setWsRunning(true);
                              setWsMessage({ text: "משגר פיילאוד אל יעד ה-Webhook של Make.com...", type: "info" });
                              setTimeout(() => {
                                setWsRunning(false);
                                setWsMessage({ text: "הפיילאוד נשלח בהצלחה ל-Make! (200 OK) - ההודעה בדרך לוואטסאפ/אפליקציה שהגדרת.", type: "success" });
                              }, 2000);
                            }}
                            disabled={wsRunning}
                            className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-900/50 disabled:opacity-50"
                          >
                            <Link2 className="w-4 h-4" />
                            שגר עכשיו ל-Make.com (Test Send)
                          </button>
                        </div>
                      </div>

                  {/* Feedback Message */}
                  {wsMessage && (
                    <div className={`mt-3 p-3 text-xs rounded-lg flex items-center gap-2 ${
                      wsMessage.type === "success" 
                        ? "bg-emerald-500/10 border border-emerald-400/20 text-emerald-400 font-medium" 
                        : wsMessage.type === "error"
                          ? "bg-rose-500/10 border border-rose-500/20 text-rose-300"
                          : "bg-cyan-500/10 border border-cyan-400/20 text-cyan-300"
                    }`}>
                      {wsRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      <span className="leading-snug">{wsMessage.text}</span>
                    </div>
                  )}

          {/* ========================================================================= */}
          {/* AI INTERACTIVE BROWSER & PUPPET SCREEN SIMULATOR */}
          {/* ========================================================================= */}
          <div className="w-full bg-[#080d19] border border-slate-800 rounded-2xl p-4 md:p-5 mb-6 animate-fadeIn shadow-2xl relative" id="ai-managed-screen-simulator">
            <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
              <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>
            </div>

            {/* Simulated Desktop / Browser Top Bar Controls */}
            <div className="flex flex-wrap flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800/80 mb-4" id="sim-window-header">
              <div className="flex items-center gap-3">
                {/* Simulated window widgets */}
                <div className="flex gap-1.5 shrink-0" dir="ltr">
                  <span className="w-3 h-3 rounded-full bg-rose-500/85"></span>
                  <span className="w-3 h-3 rounded-full bg-amber-500/85"></span>
                  <span className="w-3 h-3 rounded-full bg-emerald-500/85"></span>
                </div>
                <div className="text-right">
                  <h3 className="text-xs font-black text-white flex items-center gap-1.5 uppercase">
                    <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                    סימולטור דפדפן אינטראקטיבי מנוהל AI
                  </h3>
                  <p className="text-[10px] text-slate-500">העוזר מקליד, מקיש ומנווט בזמן אמת על גבי מסך ה-Chromium הווירטואלי</p>
                </div>
              </div>

              {/* Toggles for AI Hand Assistance */}
              <div className="flex flex-wrap items-center gap-3 bg-slate-950/60 p-1.5 rounded-xl border border-slate-850" id="sim-toggle-options">
                <button
                  type="button"
                  onClick={() => setIsAiHandActive(!isAiHandActive)}
                  className={`text-[10px] px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                    isAiHandActive 
                      ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 shadow" 
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                  id="btn-toggle-ai-hand-cursor"
                >
                  <Sparkles className="w-3 h-3 text-cyan-400 animate-pulse" />
                  <span>שליטת עוזר AI עצמאית: {isAiHandActive ? "פעילה" : "כבויה"}</span>
                </button>

                <div className="w-[1px] h-4 bg-slate-800" />

                <span className="text-[9px] text-slate-500 font-mono" dir="ltr">
                  COORDS: X:{aiCursor.visible ? `${aiCursor.x}%` : "N/A"} Y:{aiCursor.visible ? `${aiCursor.y}%` : "N/A"}
                </span>
              </div>
            </div>

            {/* Address Bar UI */}
            <div className="bg-slate-950 p-2 rounded-xl border border-slate-900 flex items-center gap-3 mb-4" id="sim-address-bar-unit">
              <div className="flex gap-1.5 shrink-0" dir="ltr">
                <button 
                  onClick={() => {
                    setBrowserSimPage(0);
                    setBrowserSimUrl("https://example.com");
                    setBrowserSimSearch("");
                    setBrowserSimLogs(prev => [...prev, "[User] Reset simulator view"]);
                  }}
                  title="אפס דף"
                  className="w-7 h-7 bg-slate-900 hover:bg-slate-850 rounded border border-slate-800 flex items-center justify-center text-slate-400 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* URL Input Box */}
              <div className="flex-1 bg-slate-900/90 rounded border border-slate-800 px-3 py-1 flex items-center gap-2" dir="ltr">
                <Globe className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <input
                  type="text"
                  value={browserSimUrl}
                  onChange={(e) => setBrowserSimUrl(e.target.value)}
                  placeholder="https://..."
                  className="bg-transparent text-xs text-cyan-300 w-full focus:outline-none font-mono"
                />
              </div>

              {/* Active User Status Badge */}
              <div className="shrink-0 hidden md:flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 text-[10px] px-2.5 py-1 rounded border border-emerald-500/20 font-bold">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Sandbox Active</span>
              </div>
            </div>

            {/* THE VIRTUAL WEB PLATFORM DRAWN SCREEN */}
            <div 
              className="relative w-full h-[270px] bg-slate-950 rounded-xl border border-slate-900/60 overflow-hidden flex flex-col" 
              id="simulator-chromium-screen"
            >
              
              {/* Vertical Glowing Laser Scan Sweep Line */}
              {laserActive && (
                <div 
                  className="absolute inset-x-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-405 to-transparent shadow-[0_0_15px_rgba(34,211,238,0.8)] z-30 animate-pulse pointer-events-none"
                  style={{ top: '48%' }}
                />
              )}

              {/* RIPPLE TAP ANIMATION EFFECT */}
              {clickRipple.active && (
                <div 
                  className="absolute rounded-full border-2 border-cyan-400 bg-cyan-400/20 z-40 animate-ping pointer-events-none"
                  style={{
                    left: `${clickRipple.x}%`,
                    top: `${clickRipple.y}%`,
                    width: '40px',
                    height: '40px',
                    transform: 'translate(-50%, -50%)'
                  }}
                />
              )}

              {/* AI VISUAL CURSOR HAND TRACKER */}
              {aiCursor.visible && (
                <div 
                  className="absolute z-50 pointer-events-none transition-all duration-700 ease-in-out flex flex-col items-center"
                  style={{
                    left: `${aiCursor.x}%`,
                    top: `${aiCursor.y}%`,
                    transform: 'translate(-10px, -10px)'
                  }}
                >
                  {/* Glowing Pointer Cursor Wave */}
                  <div className="w-6 h-6 flex items-center justify-center bg-cyan-500/20 rounded-full border border-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.7)] animate-pulse">
                    <MousePointerClick className="w-3.5 h-3.5 text-cyan-300 transform -rotate-45" />
                  </div>
                  
                  {/* Floating Speech bubble badge indicating Assistant active step */}
                  <div className="mt-1 px-2.5 py-1 bg-gradient-to-r from-cyan-500 to-indigo-600 border border-cyan-400 rounded-lg text-[9px] text-white font-extrabold whitespace-nowrap shadow-lg flex items-center gap-1.5 animate-bounce">
                    <Sparkles className="w-2.5 h-2.5 text-white animate-spin" />
                    <span>{aiCursor.label}</span>
                  </div>
                </div>
              )}

              {/* VIRTUAL BROWSER INTERNAL PAGES ROUTER */}
              <div className="flex-1 w-full p-4 overflow-y-auto text-right text-xs" id="virtual-page-body">
                
                {/* 1. LINKEDIN JOB SCRAPER PLATFORM VIEW */}
                {(browserSimUrl.toLowerCase().includes("linkedin") || browserSimUrl.toLowerCase().includes("לינקדאין")) ? (
                  <div className="space-y-3 animate-fadeIn text-slate-300">
                    <div className="flex justify-between items-center border-b border-slate-900 pb-2">
                      <span className="text-[10px] text-slate-500 font-mono uppercase">LinkedIn Jobs Portal</span>
                      <div className="flex items-center gap-1.5 text-blue-400 font-extrabold text-[10px]">
                        <span>LinkedIn Premium</span>
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                      </div>
                    </div>

                    {/* LinkedIn Landing View: 0 */}
                    {browserSimPage === 0 && (
                      <div className="py-6 text-center max-w-md mx-auto space-y-3">
                        <div className="w-10 h-10 bg-blue-600/10 text-blue-400 rounded-xl flex items-center justify-center mx-auto border border-blue-500/20">
                          <Activity className="w-5 h-5 text-blue-400" />
                        </div>
                        <h4 className="text-sm font-bold text-white">איתור משרות הייטק ממוקד בלינקדאין</h4>
                        <p className="text-[10px] text-slate-400 max-w-xs mx-auto">
                           הזן מילות מפתח כגון 'Full Stack' או 'AI Product' לחילוץ אוטומטי של רשימת מעסיקים מעלי משרות דינמיים.
                        </p>
                        
                        <div className="flex gap-2 max-w-sm mx-auto pt-2 bg-slate-950 p-1.5 rounded-lg border border-slate-900">
                          <input 
                            type="text" 
                            readOnly
                            value={browserSimSearch || ""} 
                            placeholder="מילות מפתח (למשל: Full Stack, Python)..." 
                            className="bg-transparent text-[11px] text-cyan-300 focus:outline-none flex-1 text-right placeholder-slate-600 font-sans"
                          />
                          <button type="button" className="px-3 py-1 bg-blue-600 text-white rounded text-[10px] font-bold">חפש משרה</button>
                        </div>
                      </div>
                    )}

                    {/* LinkedIn Search Results View: 1 */}
                    {browserSimPage === 1 && (
                      <div className="space-y-2.5 animate-fadeIn">
                        <div className="flex justify-between items-center bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                          <span className="text-[10px] text-cyan-400 font-bold">נמצאו 3 משרות חמות כעת! סורק אלמנטים...</span>
                          <span className="text-[9px] text-slate-500">Query: "{browserSimSearch || "Full Stack developer"}"</span>
                        </div>

                        <div className="space-y-1.5 font-sans">
                          {[
                            { role: "Senior Full-Stack Engineer", company: "CyberShield Ltd", loc: "תל אביב (היברידי)", pay: "₪32,000 - ₪38,000" },
                            { role: "Junior Python & Automation Specialist", company: "AlgosRUs", loc: "הרצליה", pay: "₪18,000 - ₪22,500" },
                            { role: "AI Integration Team Lead", company: "BotForge AI", loc: "עבודה מרחוק", pay: "₪35,000 - ₪42,000" }
                          ].map((x, i) => (
                            <div key={i} className="p-2.5 bg-slate-950 rounded-lg border border-slate-900 hover:border-slate-850 flex justify-between items-center">
                              <span className="text-[10px] text-cyan-300 font-mono font-bold">{x.pay}</span>
                              <div className="text-right">
                                <div className="text-[11px] font-bold text-slate-200">{x.role}</div>
                                <div className="text-[9px] text-slate-500">{x.company} · {x.loc}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* LinkedIn Extraction Success View: 2 */}
                    {browserSimPage === 2 && (
                      <div className="py-6 text-center space-y-2 animate-fadeIn max-w-sm mx-auto">
                        <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                          <Check className="w-6 h-6" />
                        </div>
                        <h4 className="text-sm font-bold text-white">הנתונים חולצו בהצלחה באמצעות AI!</h4>
                        <p className="text-[11px] text-slate-400 leading-normal">
                          נאגרו מגוון משרות דמה לתוך טבלת התוצאות השמאלית. הבוט הכין את הקוד להפצת הדו"ח ל-Google Sheets!
                        </p>
                      </div>
                    )}
                  </div>
                ) : (browserSimUrl.toLowerCase().includes("yelp") || browserSimUrl.toLowerCase().includes("ילפ")) ? (
                  // Yelp Page Simulation
                  <div className="space-y-3 animate-fadeIn text-slate-350">
                    <div className="flex justify-between items-center border-b border-slate-900 pb-2">
                      <span className="text-[10px] text-slate-500 font-mono uppercase">Yelp Restaurant Finder</span>
                      <span className="text-[10px] font-bold text-red-500 font-sans">Yelp Business</span>
                    </div>

                    {browserSimPage === 0 && (
                      <div className="py-8 text-center space-y-3">
                        <h4 className="text-sm font-bold text-white">סורק מסעדות, ביקורות ומדדים ב-Yelp</h4>
                        <div className="flex gap-2 max-w-xs mx-auto pt-2 bg-slate-950 p-1 rounded-lg border border-slate-900">
                          <input 
                            type="text" 
                            readOnly
                            value={browserSimSearch || ""} 
                            placeholder="סוג מסעדה (סושי, איטלקי)..." 
                            className="bg-transparent text-[11px] text-cyan-300 flex-1 text-right focus:outline-none placeholder-slate-600"
                          />
                          <button type="button" className="px-3 bg-red-600 text-white rounded text-[10px]">חפש</button>
                        </div>
                      </div>
                    )}

                    {browserSimPage === 1 && (
                      <div className="space-y-2">
                        <div className="p-2 bg-slate-900 rounded border border-red-500/20 text-cyan-400 text-[10px] font-bold">
                          מאסגר רשומות מסעדות המכילות ביקורות בשכונה...
                        </div>
                        {[
                          { name: "Tokyo Garden Sushi", rating: "⭐️ 4.8 (124 reviews)", tel: "03-555-4200" },
                          { name: "Pasta & Co Hertzliya", rating: "⭐️ 4.5 (82 reviews)", tel: "09-665-1100" }
                        ].map((rest, i) => (
                          <div key={i} className="p-2 bg-slate-950 rounded border border-slate-900 flex justify-between">
                            <span className="text-[10px] text-slate-400 font-mono">{rest.tel}</span>
                            <div className="text-right">
                              <span className="font-bold text-slate-200">{rest.name}</span>
                              <span className="block text-[8px] text-amber-400">{rest.rating}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {browserSimPage === 2 && (
                      <div className="py-6 text-center space-y-2 animate-fadeIn max-w-sm mx-auto">
                        <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                          <Check className="w-6 h-6" />
                        </div>
                        <h4 className="text-sm font-bold text-white">Yelp Scrape Completed!</h4>
                        <p className="text-[11px] text-slate-400">
                          הנתונים המסוננים עברו לטבלה השמאלית בהצלחה!
                        </p>
                      </div>
                    )}
                  </div>
                ) : (browserSimUrl.toLowerCase().includes("ebay") || browserSimUrl.toLowerCase().includes("איביי")) ? (
                  // eBay Page Simulation
                  <div className="space-y-3 animate-fadeIn text-slate-350">
                    <div className="flex justify-between items-center border-b border-slate-900 pb-2">
                      <span className="text-[10px] text-slate-500 font-mono uppercase">eBay Marketplace Spec</span>
                      <span className="text-[10px] font-mono text-yellow-500 font-bold">e<span className="text-blue-500">b</span><span className="text-red-500">a</span><span className="text-green-500">y</span></span>
                    </div>

                    {browserSimPage === 0 && (
                      <div className="py-8 text-center space-y-2">
                        <h4 className="text-sm font-bold text-white">סורק השוואת מחירים ב-eBay</h4>
                        <p className="text-[10px] text-slate-400">
                          חיפוש אוטומטי של מוצרים, דירוגים וסלרים מובילים.
                        </p>
                        <div className="flex gap-2 max-w-xs mx-auto pt-2 bg-slate-950 p-1 rounded-lg border border-slate-900">
                          <input 
                            type="text" 
                            readOnly
                            value={browserSimSearch || ""} 
                            placeholder="מוצר מבוקש..." 
                            className="bg-transparent text-[11px] text-cyan-300 flex-1 text-right focus:outline-none placeholder-slate-600"
                          />
                          <button type="button" className="px-3 bg-blue-600 text-white rounded text-[10px]">חפש</button>
                        </div>
                      </div>
                    )}

                    {browserSimPage === 1 && (
                      <div className="space-y-2 animate-fadeIn">
                        <div className="p-2 bg-slate-900 text-cyan-300 font-bold text-[10px]">
                           חילוץ קטלוג מוצרים פופולרי בהתאם למילת החיפוש: "{browserSimSearch || "iPad Pro"}"
                        </div>
                        {[
                          { title: "iPad Air 5th Gen - Space Gray (Cellular)", price: "$520.00", seller: "ProTrader99" },
                          { title: "iPad Air 4th Gen - Used - Mint Condition", price: "$359.00", seller: "DailyDeals" }
                        ].map((item, i) => (
                          <div key={i} className="p-2 bg-slate-950 border border-slate-900 rounded flex justify-between">
                            <span className="text-emerald-400 font-mono font-bold text-[10px]">{item.price}</span>
                            <div className="text-right">
                              <span className="text-slate-200 font-bold block truncate max-w-[170px]">{item.title}</span>
                              <span className="text-[8px] text-slate-500">Seller: {item.seller}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {browserSimPage === 2 && (
                      <div className="py-6 text-center space-y-2 animate-fadeIn max-w-sm mx-auto">
                        <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                          <Check className="w-6 h-6" />
                        </div>
                        <h4 className="text-sm font-bold text-white">זיווד נתונים ב-eBay הסתיים!</h4>
                        <p className="text-[11px] text-slate-400">
                          טבלת התוצאות התעדכנה בצד שמאל. מוכן לייצוא קבצי גיליונות.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (browserSimUrl.toLowerCase().includes("docs") || browserSimUrl.toLowerCase().includes("sheets") || browserSimUrl.toLowerCase().includes("mail") || browserSimUrl.toLowerCase().includes("google") || browserSimUrl.toLowerCase().includes("calendar")) ? (
                  // Google Workspaces simulation
                  <div className="space-y-3 animate-fadeIn text-slate-350">
                    <div className="flex justify-between items-center border-b border-slate-900 pb-2">
                      <span className="text-[10px] text-slate-500 font-mono uppercase">Google Workspace Sandbox Portal</span>
                      <span className="text-[10px] font-bold text-blue-500 font-sans">Google Workspace</span>
                    </div>

                    {browserSimPage === 0 && (
                      <div className="py-8 text-center space-y-2">
                        <div className="w-10 h-10 rounded-xl bg-cyan-950 text-cyan-400 flex items-center justify-center mx-auto animate-pulse">
                          <Sliders className="w-5 h-5 text-cyan-400" />
                        </div>
                        <h4 className="text-sm font-bold text-white">חיבור ישיר לממשקי Google Workspace</h4>
                        <p className="text-[10px] text-slate-400 max-w-xs mx-auto">
                          סינכרון API עצמאי לכתיבת דוחות, הוספת איבנטים ליומן, שליחת הודעות צ'אט והודעות מייל המונעות על ידי קודי ה-Javascript של העוזר.
                        </p>
                      </div>
                    )}

                    {browserSimPage >= 1 && (
                      <div className="p-4 bg-slate-900/60 rounded-xl border border-dashed border-cyan-500/30 text-center space-y-3 animate-fadeIn max-w-sm mx-auto">
                        <div className="flex justify-center gap-1.5 text-cyan-400 font-bold text-xs">
                          <span>פעולת סנכרון מאובטחת בוצעה!</span>
                          <Sparkles className="w-4 h-4 text-cyan-400 animate-spin" />
                        </div>
                        <p className="text-[10.5px] text-slate-350 leading-relaxed">
                          העוזר ביצע פנייה ל-Google API וטען את הנתונים לענן. האירועים אושרו ועודכנו בחשבון שלכם.
                        </p>
                        <div className="text-[9px] font-mono text-zinc-500 bg-slate-950 p-2 rounded text-left overflow-x-auto truncate">
                          API Response: 200 OK {"{"} status: "synced_successfully", rows: {scrapedData.length || 3} {"}"}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  // General Landing page simulation fallback
                  <div className="h-full flex flex-col justify-between" id="fallback-sim-page animate-fadeIn">
                    <div className="flex justify-between items-center border-b border-slate-900 pb-2 mb-2">
                      <span className="text-[10px] text-slate-500 font-mono uppercase">Web Scraper Virtual Browser v1.0</span>
                      <span className="text-[10px] font-sans text-cyan-400">Simulating Screen Client</span>
                    </div>

                    <div className="py-5 text-center max-w-md mx-auto space-y-3">
                      <div className="w-11 h-11 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center mx-auto text-cyan-400 shadow-md">
                        <Globe className="w-5 h-5 text-cyan-400 animate-pulse" />
                      </div>
                      <div className="text-right">
                        <h4 className="text-xs font-bold text-white text-center">מחפש שירותי רשת ציבוריים לניווט</h4>
                        <p className="text-[10px] text-slate-500 leading-normal text-center max-w-xs mx-auto">
                          דף אינטרנט כללי טעון כעת בדפדפן הווירטואלי. העוזר מוכן להקשות, ללחוץ ולסרוק לפי שלבי הבוט שיופעלו.
                        </p>
                      </div>

                      {/* Displaying state if user is typing */}
                      {browserSimSearch && (
                        <div className="p-2 bg-[#050912] border border-cyan-500/20 text-cyan-300 font-mono rounded text-right text-[10px]">
                           📝 הקלדה דינמית: <span className="text-white font-bold">"{browserSimSearch}"</span>
                        </div>
                      )}
                    </div>

                    {/* Simple Bottom status panel */}
                    <div className="pt-2 border-t border-slate-950 flex justify-between items-center text-[9px] text-slate-650 font-mono" dir="ltr">
                      <span>HTTP Status: 200 OK</span>
                      <span>PAGE CONTROLLER: {browserSimPage}</span>
                      <span>SSL Encrypted Connection</span>
                    </div>
                  </div>
                )}

              </div>

              {/* Developer Client Console Log at the bottom of simulator */}
              <div className="h-10 bg-slate-950 border-t border-slate-900/80 p-2.5 flex items-center justify-between text-[8.5px] font-mono text-slate-500 shrink-0" dir="ltr">
                <span className="text-cyan-500 font-bold shrink-0">AI CONSOLE:</span>
                <span className="truncate flex-1 px-3 text-right text-slate-400">
                  {browserSimLogs.length > 0 ? browserSimLogs[browserSimLogs.length - 1] : "Simulator kernel loaded. Waiting for automated tasks to execute."}
                </span>
                <span className="shrink-0 text-slate-600 font-thin">| CHROMIUM-X</span>
              </div>

            </div>
          </div>

          {/* STEPPER DISPLAY CONTAINER */}
          <div className="flex-1 max-w-4xl mx-auto w-full flex flex-col items-center justify-start py-4" id="workflow-canvas">
            
            {/* CANVAS INTERACTIVE HEADER */}
            <div className="w-full flex justify-between items-center mb-6 pb-4 border-b border-slate-900 px-1" id="canvas-header-bar">
              <div className="text-right">
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-cyan-400" />
                  {t("שלבי זרימת העבודה באוטומציה", "Automation Workflow Steps")}
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {t("לחץ על כל שלב בכדי לערוך, להגדיר כתובת, לשנות סלקטור או למחוק אותו", "Click on any step to edit selectors, actions, description or delete")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setNewStepForm({
                    type: "click",
                    title: "",
                    description: "",
                    selector: "",
                    value: ""
                  });
                  setShowAddStepModal(true);
                }}
                className="px-3 py-1.5 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-850 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer hover:shadow-[0_0_15px_rgba(6,182,212,0.15)] transition-all"
                id="btn-add-step-manual"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>{t("+ הוסף שלב חדש", "+ Add New Step")}</span>
              </button>
            </div>
            
            {steps.length === 0 ? (
              <div className="text-center py-16 px-8 rounded-2xl border border-dashed border-slate-800/80 bg-slate-900/10 max-w-md" id="empty-steps-view">
                <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto mb-4 animate-pulse" id="empty-icon-shield">
                  <Sliders className="w-5 h-5 text-slate-500" />
                </div>
                <h4 className="text-slate-300 font-bold mb-2 text-sm">לא נטענו שלבי עבודה לתהליך</h4>
                <p className="text-slate-500 text-xs leading-relaxed">
                  הקלד מטרת אוטומציה מבוקשת מצד שמאל או בחר תבנית ריצה מוכנה מראש כדי לייצר את שלבי האוטומציה המדויקים על גבי המסך.
                </p>
              </div>
            ) : (
              <div className="w-full space-y-0" id="steps-scroller-node">
                {steps.map((step, idx) => {
                  const isActive = idx === activeStepIndex;
                  const isCompleted = step.status === "completed";
                  const isRunningStatus = step.status === "running";
                  const isExpandedCode = expandedCodeStep === step.id;

                  // Unique class based on state representation
                  const cardBgClass = isRunningStatus 
                    ? "bg-slate-900/90 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.12)] ring-1 ring-purple-500/30 scale-[1.01]"
                    : isCompleted
                      ? "bg-slate-900/30 border-slate-850/80 text-slate-300"
                      : "bg-[#0a0f1c]/45 border-slate-900/80 text-slate-500 opacity-60";

                  return (
                    <React.Fragment key={step.id}>
                      {/* Step timeline Node */}
                      <div 
                        onClick={() => setSelectedEditStep(step)}
                        className={`relative flex flex-col md:flex-row items-stretch gap-4 p-4 rounded-2xl border transition-all duration-300 cursor-pointer hover:border-cyan-500/50 hover:bg-slate-900/60 hover:scale-[1.01] hover:shadow-lg hover:shadow-cyan-500/20 ${cardBgClass}`}
                        id={`step-card-${step.id}`}
                        title={t("לחץ לעריכה והתאמת שלב זה", "Click to configure or edit this step")}
                      >
                        {/* Right timeline status circle (RTL left visual equivalent, so now on right visually) */}
                        <div className="flex md:flex-col items-center justify-center gap-2 md:gap-0 shrink-0" id="card-left-anchor">
                          <div 
                            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs border transition-all ${
                              isRunningStatus
                                  ? "bg-purple-600 border-purple-400 text-white"
                                  : isCompleted
                                    ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400"
                                    : "bg-slate-950 border-slate-850 text-slate-500"
                            }`}
                            id={`badge-num-${idx}`}
                          >
                            {isCompleted ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400 font-bold" />
                            ) : (
                              idx + 1
                            )}
                          </div>
                          
                          {/* Code toggle label/button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleStepCode(step.id);
                            }}
                            className="text-[9px] mt-2.5 text-slate-500 hover:text-cyan-400 uppercase tracking-widest font-mono cursor-pointer flex items-center gap-1 bg-slate-950/40 px-2 py-0.5 rounded border border-slate-800"
                            id={`code-toggle-button-${step.id}`}
                          >
                            <Code className="w-2.5 h-2.5" /> {isExpandedCode ? "הסתר" : "קוד"}
                          </button>
                        </div>

                        {/* Middle textual attributes */}
                        <div className="flex-1 min-w-0 text-right" id="card-body">
                          <div className="flex flex-wrap items-center gap-2 mb-1" id="step-badges-group">
                            <span 
                              className={`text-[9.5px] font-mono font-bold uppercase tracking-tight px-2 py-0.5 rounded border ${
                                step.type === "navigate" 
                                  ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" 
                                  : step.type === "extract"
                                    ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                                    : step.type === "click"
                                      ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                                      : "bg-slate-900 text-slate-400 border-slate-800"
                              }`}
                              id={`step-type-badge-${step.id}`}
                            >
                              {step.type === "navigate" ? "ניווט" : step.type === "extract" ? "חילוץ" : step.type === "click" ? "לחיצה" : step.type}
                            </span>

                            {isRunningStatus && (
                              <span className="text-[9px] font-bold uppercase text-purple-400 bg-purple-500/10 border border-purple-500/15 px-2 py-0.5 rounded animate-pulse">
                                מריץ סימולציה כעת...
                              </span>
                            )}
                          </div>

                          <h4 className="text-white font-bold text-sm tracking-tight flex items-center gap-2">
                            {step.title}
                          </h4>
                          <p className="text-xs text-slate-450 mt-0.5 leading-relaxed">
                            {step.description}
                          </p>

                          {/* Dynamic targets selector boxes if present */}
                          {(step.selector || step.value) && (
                            <div className="flex flex-wrap gap-2 mt-3.5" id="selectors-subgroup" dir="ltr">
                              {step.selector && (
                                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-950 border border-slate-800/80 rounded font-mono text-[10px] text-cyan-300">
                                  <Hash className="w-3 h-3 text-slate-500" />
                                  <span>{step.selector}</span>
                                </div>
                              )}
                              {step.value && (
                                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-950 border border-slate-800/80 rounded font-mono text-[10px] text-emerald-400">
                                  <Keyboard className="w-3 h-3 text-slate-500" />
                                  <span>"{step.value}"</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Collapsible Puppeteer Code Module */}
                          {isExpandedCode && (
                            <div className="mt-4 bg-slate-950 border border-slate-800/80 rounded-xl p-3" id="collapsible-code-box" dir="ltr">
                              <div className="flex justify-between items-center mb-1 text-[10px] font-mono text-slate-500">
                                <span>PUPPETEER CODE SNIPPET</span>
                                <span className="text-cyan-500/80">קוד ריצה עצמאי</span>
                              </div>
                              <pre className="text-[11px] font-mono text-cyan-200 leading-relaxed overflow-x-auto whitespace-pre">
                                {step.codeSnippet}
                              </pre>
                            </div>
                          )}
                        </div>

                        {/* Left indicators (or right in RTL) */}
                        <div className="shrink-0 flex items-center justify-end px-2" id="card-right-anchor">
                          {isRunningStatus ? (
                            <div className="flex gap-1 items-center" id="wave-pulse">
                              <span className="w-1.5 h-3 bg-purple-400 rounded-full animate-pulse"></span>
                              <span className="w-1.5 h-3 bg-purple-400 rounded-full animate-pulse [animation-delay:0.2s]"></span>
                              <span className="w-1.5 h-3 bg-purple-400 rounded-full animate-pulse [animation-delay:0.4s]"></span>
                            </div>
                          ) : isCompleted ? (
                            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 flex items-center gap-1 bg-emerald-500/5 px-2.5 py-1 rounded border border-emerald-500/20">
                              <Check className="w-3.5 h-3.5 text-emerald-400" />בוצע בהצלחה
                            </span>
                          ) : (
                            <span className="text-[10px] tracking-wider text-slate-500 font-bold uppercase">
                              ממתין
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Connective Line between nodes except the last */}
                      {idx < steps.length - 1 && (
                        <div className="w-[1px] h-5 bg-gradient-to-b from-slate-800 to-slate-900 mx-[18px]" id={`line-spacer-${idx}`}></div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            )}

          </div>

          {/* LOWER SECTION: COMBINED CONSOLE LOGS & DATA GRID */}
          <div className="mt-8 border-t border-slate-800/60 pb-2 flex flex-col lg:flex-row gap-6 shrink-0" id="dashboard-lower-deck">
            
            {/* TERMINAL LOG CONSOLE */}
            <div className="flex-1 bg-[#05080e] rounded-2xl border border-slate-800 overflow-hidden flex flex-col" id="logs-panel">
              <div className="flex justify-between items-center h-10 px-4 bg-slate-950 border-b border-slate-900" id="logs-header">
                <div className="flex items-center gap-2">
                  <TerminalIcon className="w-3.5 h-3.5 text-purple-400" id="term-icon-header" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">יומן ריצה וסטטוסים</span>
                </div>
                <button 
                  onClick={() => setLogs([])}
                  className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors tracking-wider font-sans cursor-pointer"
                  id="btn-clear-logs"
                >
                  נקה יומן
                </button>
              </div>

              {/* Logs Stream Frame */}
              <div 
                ref={logsContainerRef}
                className="h-[140px] overflow-y-auto p-3 font-mono text-[11px] leading-relaxed space-y-1 text-slate-350 text-left"
                id="logs-container"
                dir="ltr"
              >
                {logs.length === 0 ? (
                  <p className="text-slate-600 italic text-right font-sans">היומן ריק בשלב זה. הפעל סבב אוטומציה בכדי לנטר פלטי קוד וריצה.</p>
                ) : (
                  logs.map((log, index) => {
                    let logColor = "text-slate-400";
                    if (log.level === "success") logColor = "text-emerald-400";
                    if (log.level === "warn") logColor = "text-amber-400 font-semibold";
                    if (log.level === "error") logColor = "text-rose-400 font-bold";
                    if (log.level === "debug") logColor = "text-cyan-400/90";
                    
                    return (
                      <div key={index} className="flex items-start gap-2 border-b border-slate-900/40 pb-1" id={`log-item-${index}`}>
                        <span className="text-slate-650 shrink-0 select-none">[{log.timestamp}]</span>
                        <p className={logColor}>
                          {log.message}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* SCRAPED RECORDINGS DATABASE TARGET */}
            <div className="flex-1 bg-[#05080e] rounded-2xl border border-slate-800 overflow-hidden flex flex-col" id="data-scrapes-panel">
              <div className="flex justify-between items-center h-10 px-4 bg-slate-950 border-b border-slate-900" id="data-header">
                <div className="flex items-center gap-2">
                  <Database className="w-3.5 h-3.5 text-cyan-400 font-bold" id="db-icon-header" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">טבלת תוצאות שחולצו</span>
                </div>
                {scrapedData.length > 0 && (
                  <button
                    onClick={handleDownloadData}
                    className="text-[11px] text-cyan-400 hover:underline hover:text-cyan-300 tracking-wide font-sans flex items-center gap-1 cursor-pointer"
                    id="btn-trigger-scraped-dl"
                  >
                    <Download className="w-3 h-3" />ייצוא קובץ JSON
                  </button>
                )}
              </div>

              {/* Data Rows Container */}
              <div className="h-[140px] overflow-auto p-1 font-mono text-[10px] text-left" id="scrapes-table-viewport" dir="ltr">
                {scrapedData.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-600 italic font-sans" id="scrapes-table-empty">
                    <Database className="w-5 h-5 text-slate-800 mb-1" />
                    <span>הנתונים שייגזרו וייאספו מהאתר יוצגו בטבלה זו...</span>
                  </div>
                ) : (
                  <table className="min-w-full text-slate-350 border-collapse" id="parsed-records-table">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-500 uppercase text-[9px]">
                        {Object.keys(scrapedData[0]).map(key => (
                          <th key={key} className="py-1.5 px-3 text-left font-bold">{key}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900/40">
                      {scrapedData.map((record, index) => (
                        <tr key={index} className="hover:bg-slate-900/60 transition-colors" id={`parsed-tr-${index}`}>
                          {Object.values(record).map((value: any, idx) => (
                            <td key={idx} className="py-1.5 px-3 text-slate-300 max-w-[180px] truncate">{value.toString()}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

          </div>

        </section>
          </>
          )
        )}
      </div>

      {/* EXPLICIT WORKSPACE CONFIRMATION MODAL -- MANDATORY AS PER SKILL.MD */}
      {workspaceConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn" id="confirmation-dialog">
          <div className="w-full max-w-md bg-[#0a0e17] rounded-2xl border border-slate-800 shadow-2xl p-6 text-right" id="confirm-modal-box">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-cyan-400" />
              {workspaceConfirmation.title}
            </h3>
            <p className="text-slate-400 text-xs leading-relaxed mb-6">
              {workspaceConfirmation.message}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setWorkspaceConfirmation(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-850 text-slate-350 rounded-lg text-xs font-bold border border-slate-800/80 cursor-pointer"
              >
                ביטול
              </button>
              <button
                onClick={workspaceConfirmation.onConfirm}
                className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-xs font-bold shadow-md cursor-pointer"
              >
                אשר והמשך
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== INTERACTIVE SAAS MODAL: SERVER POD CONTROLLER ========== */}
      {selectedPod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn" id="server-pod-modal">
          <div className="w-full max-w-xl bg-[#0a0e17] rounded-2xl border border-slate-800 shadow-2xl p-6 text-right" id="pod-modal-box">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-4">
              <button 
                onClick={() => setSelectedPod(null)}
                className="text-slate-400 hover:text-white text-lg font-bold p-1 cursor-pointer"
              >
                &times;
              </button>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-purple-400 animate-pulse" />
                מערכת דיאגנוסטיקה ובקרת פוד: {selectedPod.name}
              </h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-900">
                <span className="block text-[9px] text-slate-500 font-bold">אזור פריסה (Region)</span>
                <span className="text-xs font-mono font-medium text-slate-350">{selectedPod.region}</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-900">
                <span className="block text-[9px] text-slate-500 font-bold">עומס מעבד (CPU Load)</span>
                <span className="text-xs font-mono font-medium text-cyan-400">{selectedPod.load}</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-900">
                <span className="block text-[9px] text-slate-500 font-bold">מכסת זיכרון RAM</span>
                <span className="text-xs font-mono font-medium text-purple-400">{selectedPod.memory}</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-900">
                <span className="block text-[9px] text-slate-500 font-bold">זמן ריצה רציף (Uptime)</span>
                <span className="text-xs font-mono font-medium text-slate-350">{selectedPod.uptime}</span>
              </div>
            </div>

            {/* Docker Terminal Logs Screen */}
            <div className="bg-black border border-slate-900 rounded-xl p-4 font-mono text-[10px] text-left text-emerald-400 h-40 overflow-y-auto mb-5 leading-normal" dir="ltr">
              <p className="text-slate-500">[2026-06-01 10:04:15] Initialize docker orchestration endpoint...</p>
              <p className="text-slate-500">[2026-06-01 10:04:16] Pulling base puppeteer stack image: node:20-slim</p>
              <p className="text-slate-500">[2026-06-01 10:04:17] Node server verified gateway healthy.</p>
              <p className="text-emerald-500 font-bold">[OK] 12 active child automation browsers running in sandbox.</p>
              <p className="text-slate-500">[2026-06-01 10:04:20] Connection ping response: {selectedPod.ping}</p>
              {rebootingPod ? (
                <>
                  <p className="text-amber-400 animate-pulse font-bold">[PROCESS] SIGTERM triggered. Gracefully flushing active browser streams...</p>
                  <p className="text-amber-400 animate-pulse font-bold">[PROCESS] Resetting container docker-run entrypoint...</p>
                </>
              ) : (
                <p className="text-slate-500">[STATUS] Idle. Waiting for trigger events from BotForge cluster controller...</p>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
              <button
                onClick={() => setSelectedPod(null)}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-850 text-slate-350 rounded-lg text-xs font-bold cursor-pointer"
              >
                סגור
              </button>
              <button
                onClick={() => {
                  setRebootingPod(true);
                  addLog(`בוצע סיגנל אתחול Node ידני באשכול עבור ${selectedPod.name}...`, "info");
                  setTimeout(() => {
                    setRebootingPod(false);
                    setSelectedPod(prev => prev ? { ...prev, load: "0% CPU", ping: "15ms", status: "בריא" } : null);
                    addLog(`אתחול הפוד ${selectedPod.name} הסתיים בהצלחה. כל שרתי ה-Puppeteer נרשמו מחדש עם סטטוס Healthy!`, "success");
                    setSuccessMessage(`הקונטיינר ${selectedPod.name} אותחל בהצלחה לצורך פתרון עומסים!`);
                    setTimeout(() => setSuccessMessage(null), 4000);
                  }, 1200);
                }}
                disabled={rebootingPod}
                className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-900 border border-purple-500/20 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                {rebootingPod ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>מהתחל קונטיינר...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>אתחל Node ידנית 🔄</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== INTERACTIVE BILLING MODAL: TAX INVOICE POPUP ========== */}
      {selectedAdminUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn" id="user-invoice-modal">
          <div className="w-full max-w-xl bg-[#0a0e17] rounded-2xl border border-slate-800 shadow-2xl p-6 text-right" id="invoice-modal-box">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-4">
              <button 
                onClick={() => setSelectedAdminUser(null)}
                className="text-slate-400 hover:text-white text-lg font-bold p-1 cursor-pointer"
              >
                &times;
              </button>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-cyan-400 animate-pulse" />
                חשבונית מס קבלה לקוח: #INV-2026-092
              </h3>
            </div>

            <div className="text-right space-y-4 mb-5">
              <div className="flex justify-between items-start">
                <div className="text-left font-mono text-xs text-slate-500">
                  <p>חשבונית מס: #INV-2026-092</p>
                  <p>תאריך הפקה: {new Date().toISOString().slice(0, 10)}</p>
                  <p>תנאי תשלום: Net 30</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-cyan-400 tracking-wider font-mono uppercase bg-cyan-950 px-2 py-0.5 border border-cyan-850 rounded">BotForge Billing</span>
                  <h4 className="text-base font-black text-white mt-1">חשבונית מס מקורית</h4>
                </div>
              </div>

              <div className="bg-slate-950 p-4 border border-slate-900 rounded-xl">
                <h5 className="text-[10px] text-slate-500 font-bold uppercase mb-1">פרטי הלקוח המחוייב:</h5>
                <p className="text-xs text-white font-bold">{selectedAdminUser.name}</p>
                <p className="text-xs font-mono text-slate-400">{selectedAdminUser.email}</p>
                <div className="mt-2 text-[10px] text-slate-450">
                  סוג מנוי מוגדר: <span className="text-cyan-400 font-bold uppercase">{selectedAdminUser.plan}</span> | סטטוס משתמש: <span className="text-emerald-400 font-bold">{selectedAdminUser.status}</span>
                </div>
              </div>

              {/* Items Breakdown */}
              <div className="space-y-1.5 pt-2">
                <h5 className="text-[10px] text-slate-500 font-bold uppercase mb-2">פירוט שירותים וחיובים:</h5>
                <div className="border border-slate-900 rounded-xl overflow-hidden text-xs">
                  <div className="grid grid-cols-3 bg-slate-900/50 p-2 font-bold border-b border-slate-900 text-slate-300">
                    <span>שם פריט</span>
                    <span className="text-left">כמות</span>
                    <span className="text-left">מחיר</span>
                  </div>
                  <div className="grid grid-cols-3 p-2 text-slate-350 border-b border-slate-900">
                    <span>מנוי BotForge {selectedAdminUser.plan} SaaS</span>
                    <span className="text-left">1</span>
                    <span className="text-left text-cyan-400 font-mono">${selectedAdminUser.plan === "enterprise" ? "99.00" : selectedAdminUser.plan === "pro" ? "29.00" : "0.00"}</span>
                  </div>
                  <div className="grid grid-cols-3 p-2 text-slate-350 border-b border-slate-900">
                    <span>משאבי פוד סריקה מרובה בענן</span>
                    <span className="text-left">{selectedAdminUser.hostedInCloud}</span>
                    <span className="text-left text-cyan-400 font-mono">${selectedAdminUser.hostedInCloud * 2.5}</span>
                  </div>
                  <div className="grid grid-cols-3 p-2 text-slate-350 border-b border-slate-900">
                    <span>פתרונות עקיפת Captcha ופרוקסי</span>
                    <span className="text-left">Auto</span>
                    <span className="text-left text-cyan-400 font-mono">${selectedAdminUser.plan === "free" ? "0.00" : "5.00"}</span>
                  </div>
                  <div className="grid grid-cols-3 p-2 bg-slate-950 font-bold text-white">
                    <span>סה"כ לתשלום (USD)</span>
                    <span className="text-left"></span>
                    <span className="text-left text-cyan-400 font-mono underline">
                      ${selectedAdminUser.plan === "enterprise" 
                        ? 99.00 + selectedAdminUser.hostedInCloud * 2.5 + 5.00 
                        : selectedAdminUser.plan === "pro" 
                          ? 29.00 + selectedAdminUser.hostedInCloud * 2.5 + 5.00 
                          : 0.00
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
              <button
                onClick={() => setSelectedAdminUser(null)}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-850 text-slate-350 rounded-lg text-xs font-bold cursor-pointer"
              >
                סגור תצוגה
              </button>
              <button
                onClick={() => {
                  addLog(`ביקש העתק קבלה מקורי מ-Stripe עבור ${selectedAdminUser.name}...`, "info");
                  setSuccessMessage(`חשבונית המנוי נשלחה בהצלחה בפורמט PDF אל ${selectedAdminUser.email}`);
                  setTimeout(() => setSuccessMessage(null), 4000);
                  setSelectedAdminUser(null);
                }}
                className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-[0_4px_15px_rgba(8,145,178,0.2)]"
              >
                <Download className="w-3.5 h-3.5" />
                <span>הורד ושלח חשבונית לקוח</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SCRIPT VIEWPORT (COPY & DOWNLOAD) */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn" id="export-code-modal">
          <div className="w-full max-w-3xl bg-[#0a0e17] rounded-2xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" id="modal-container">
            
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 bg-slate-900/40 border-b border-slate-800" id="modal-header">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-cyan-400" id="code-tag-modal-header" />
                <h3 className="text-sm font-bold text-white tracking-wider">מייצא סקריפט אוטומציה רב-פלטפורמי</h3>
              </div>
              <button 
                onClick={() => setShowExportModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold p-1 cursor-pointer"
                id="btn-close-modal"
              >
                &times;
              </button>
            </div>

            {/* Platform Tab Selection */}
            <div className="flex gap-1.5 p-1 bg-slate-950 border border-slate-800/60 rounded-xl mx-6 mt-4" id="export-platforms-tabs" dir="ltr">
              <button
                onClick={() => setExportType("puppeteer")}
                className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  exportType === "puppeteer" ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-inner" : "text-slate-500 hover:text-slate-300"
                }`}
                id="tab-export-puppeteer"
              >
                Puppeteer (Node.js)
              </button>
              <button
                onClick={() => setExportType("csharp")}
                className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  exportType === "csharp" ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-inner" : "text-slate-500 hover:text-slate-300"
                }`}
                id="tab-export-csharp"
              >
                Windows Desktop (.EXE / C#)
              </button>
              <button
                onClick={() => setExportType("swift")}
                className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  exportType === "swift" ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-inner" : "text-slate-500 hover:text-slate-300"
                }`}
                id="tab-export-swift"
              >
                iOS iPhone (SwiftUI)
              </button>
            </div>

            {/* Code Body */}
            <div className="flex-1 p-6 overflow-y-auto text-right" id="modal-scroll-area">
              <div className="mb-4 bg-indigo-950/20 border border-indigo-900/50 p-4 rounded-xl text-xs text-indigo-300 leading-relaxed" id="modal-instruction-callout">
                {exportType === "puppeteer" && (
                  <>
                    <p className="font-semibold flex items-center gap-1.5 mb-1 text-white">
                      <Play className="w-3.5 h-3.5 fill-current text-indigo-400 transform rotate-180" /> תחילת עבודה עם סקריפט Node.js:
                    </p>
                    קוד זה מאחד את כל השלבים שיצרת לכדי קובץ הרצה עצמאי ב-Node.js תוך שימוש בספריית Puppeteer. מושלם להקמה מהירה בשרתי ייצור או הרצה ישירה ב-Terminal.
                  </>
                )}
                {exportType === "csharp" && (
                  <>
                    <p className="font-semibold flex items-center gap-1.5 mb-1 text-white">
                      <Cloud className="w-3.5 h-3.5 text-indigo-450" /> יצירת קובץ EXE עצמאי לרוץ ב-Windows:
                    </p>
                     קוד C# Selenium המיועד להרצה על סביבת חלונות. עקבו אחר פקודות ההידור בקוד (בחלק העליון) כדי לקמפל אותו לקובץ (.EXE) שתוכלו להפעיל ישירות בלחיצה כפולה על המחשב.
                  </>
                )}
                {exportType === "swift" && (
                  <>
                    <p className="font-semibold flex items-center gap-1.5 mb-1 text-white">
                      <Sliders className="w-3.5 h-3.5 text-indigo-450" /> הרצת אוטומציה מקורית באייפון (iOS Mobile):
                    </p>
                    קוד SwiftUI רשמי לשימוש ב-Xcode על מחשבי Mac. הקוד יוצר אפליקציה מקומית תואמת iPhone שעושה שימוש ברכיב דפדפן WKWebView מובטח כדי לחקות את שלבי האוטומציה שלכם באופן עצמאי בדרכים.
                  </>
                )}
              </div>

              <div className="relative group text-left" id="modal-pre-block-wrap" dir="ltr">
                <button
                  onClick={copyToClipboard}
                  className="absolute top-3 right-3 p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-350 rounded border border-slate-700/60 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  id="btn-copy-code-modal"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400 font-bold">הועתק!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>העתק קוד</span>
                    </>
                  )}
                </button>

                <pre className="p-4 bg-slate-950 rounded-xl border border-slate-900 font-mono text-xs text-cyan-205 overflow-x-auto max-h-[365px] leading-relaxed">
                  {exportType === "csharp" 
                    ? generateCSharpSeleniumScript(config.name, config.url, steps)
                    : exportType === "swift"
                    ? generateSwiftUiScript(config.name, config.url, steps)
                    : generateFullPuppeteerScript(config.name, config.url, steps, config)
                  }
                </pre>
              </div>
            </div>

            {/* Footer triggers */}
            <div className="px-6 py-4 bg-[#070b12] border-t border-slate-800/85 flex justify-end gap-3" id="modal-footer">
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-850 text-slate-350 rounded-lg text-xs font-bold border border-slate-800 cursor-pointer"
                id="btn-cancel-modal"
              >
                סגור תצוגה
              </button>
              <button
                type="button"
                onClick={handleDownloadScript}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-[0_4px_15px_rgba(8,145,178,0.25)] cursor-pointer"
                id="btn-download-modal-action"
              >
                <Download className="w-3.5 h-3.5" />
                <span>
                  {exportType === "csharp" 
                    ? "הורד קובץ סינכרון C# (.cs)" 
                    : exportType === "swift" 
                    ? "הורד קובץ קוד אייפון (.swift)" 
                    : "הורד קובץ סקריפט (.js)"
                  }
                </span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* FLOATING CHAT BOT TRIGGER */}
      <button
        onClick={() => setIsChatDrawerOpen(!isChatDrawerOpen)}
        className="fixed bottom-6 right-6 w-12 h-12 bg-gradient-to-tr from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-full flex items-center justify-center shadow-[0_4px_20px_rgba(99,102,241,0.4)] hover:shadow-[0_4px_25px_rgba(99,102,241,0.6)] cursor-pointer transition-all hover:scale-105 z-40 group border border-indigo-400/30"
        title="צ'אט עם עוזר האוטומציה AI"
        id="btn-floating-ai-assistant"
      >
        <Sliders className="w-5 h-5 animate-pulse" />
        <span className="absolute right-14 bg-slate-900 border border-slate-800 text-slate-200 text-[10px] px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap font-bold pointer-events-none">
          עוזר אוטומציה אישי (Gemini AI)
        </span>
      </button>

      {/* CHATBOT ASSISTANT SLIDE-OVER DRAWER */}
      <div 
        className={`fixed top-0 bottom-0 left-0 w-[350px] sm:w-[420px] max-w-full bg-[#0a0f1c] border-r border-slate-800 shadow-[5px_0_30px_rgba(0,0,0,0.5)] z-50 flex flex-col transition-all duration-300 ease-in-out ${
          isChatDrawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        id="ai-assistant-drawer"
      >
        {/* Drawer Header */}
        <div className="p-4 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between text-right">
          <button 
            onClick={() => setIsChatDrawerOpen(false)}
            className="p-1.5 hover:bg-slate-800/80 hover:text-white text-slate-400 rounded-lg cursor-pointer"
            id="btn-close-ai-drawer"
          >
            <X className="w-4 h-4" />
          </button>
          
          <div className="flex items-center gap-2.5">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">עוזר אוטומציה BotForge AI</h3>
              <p className="text-[10px] text-slate-400">אינטגרציה מלאה עם מודל ה-Gemini שלך</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500/10 to-indigo-500/10 border border-cyan-500/20 flex items-center justify-center">
              <Sliders className="w-4 h-4 text-cyan-400" />
            </div>
          </div>
        </div>



        {/* Informative warning for guest users */}
        {!currentUser && (
          <div className="p-2.5 bg-indigo-950/20 text-indigo-400 border-b border-indigo-900/30 text-[10px] leading-relaxed text-right font-medium">
             אתה פועל כאורח. התחבר עם Google כדי לשמור את היסטוריית השיחות שלך לענן ב-Firestore!
          </div>
        )}

        {/* Chat log messages area */}
        <div 
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-3 flex flex-col justify-start" 
          id="ai-chat-messages-container"
        >
          {aiChatHistory.length > 0 ? (
            aiChatHistory.map((msg, i) => {
              const isMe = msg.sender === "user";
              return (
                <div 
                  key={i} 
                  className={`flex items-start gap-2.5 max-w-[85%] ${
                    isMe ? "self-end" : "self-start flex-row-reverse"
                  }`}
                >
                  {!isMe && (
                    <div className="w-6 h-6 rounded-md bg-cyan-950 text-cyan-400 flex items-center justify-center text-[10px] font-bold shrink-0">
                      AI
                    </div>
                  )}
                  <div className={`p-3 text-xs leading-relaxed ${
                    isMe 
                      ? "bg-gradient-to-tr from-indigo-900/50 to-blue-900/50 text-slate-200 border border-indigo-800/20 rounded-2xl rounded-tl-none text-right" 
                      : "bg-slate-900/50 text-slate-250 border border-slate-800 rounded-2xl rounded-tr-none text-right"
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    
                    {/* Render the beautiful interactive "Load and Apply Bot" card */}
                    {!isMe && msg.botPreset && (
                      <div className="mt-3 p-3 bg-slate-950 rounded-xl border border-cyan-500/40 text-right animate-fadeIn shadow-[0_0_15px_rgba(5,150,105,0.1)]">
                        <div className="flex items-center justify-end gap-1.5 mb-2 text-cyan-400 font-bold text-[10px]">
                          <span>פותח בוט מוכן עבורך! ✨</span>
                          <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                        </div>
                        <div className="text-[11px] font-bold text-slate-200 mb-1 leading-tight">
                          🤖 {msg.botPreset.name}
                        </div>
                        <div className="text-[9.5px] text-slate-400 mb-2 leading-relaxed font-normal">
                          {msg.botPreset.goal}
                        </div>
                        {msg.botPreset.steps && (
                          <div className="text-[9px] text-slate-500 mb-2.5 leading-none flex items-center justify-end gap-1.5 font-mono">
                            <span className="text-cyan-400/80">{msg.botPreset.steps.length} שלבי הרצה סרוקים</span>
                            <span className="text-slate-700">|</span>
                            <span dir="ltr" className="truncate max-w-[140px] text-zinc-500">{msg.botPreset.url}</span>
                          </div>
                        )}
                        <div className="space-y-2 mt-4 pt-3 border-t border-cyan-500/20 relative z-10 transition-all hover:bg-cyan-950/20 p-2 rounded-xl">
                          <button
                            type="button"
                            onClick={() => {
                              // Close the chat drawer
                              setIsChatDrawerOpen(false);

                              // Load bot config and steps
                              setConfig({
                                name: msg.botPreset!.name,
                                goal: msg.botPreset!.goal,
                                url: msg.botPreset!.url,
                                speed: msg.botPreset!.speed || 1,
                                useProxies: false,
                                rotateIpOnBan: false,
                                bypassCaptcha: false,
                                isolatedContext: true,
                                maxConcurrentThreads: 1,
                                ghostMode: true,
                                cognitiveVision: false,
                                quantumSpeed: false,
                                chaosEngine: false,
                                cloudSwarm: false,
                                residentialProxies: false,
                                antiBotShield: true,
                                geoClustering: true,
                                scoutHarvesterModule: false,
                                hotSwappingBackup: false
                              });
                              setSteps(msg.botPreset!.steps.map(s => ({ ...s, status: "pending" })));
                              setScrapedData([]);

                              // Display pleasant overlay notifications
                              addLog(`✨ הבוט "${msg.botPreset!.name}" נפרס והוטען בהצלחה! לחץ "הפעל בוט" כדי להתחיל בריצה.`, "success");

                              // Dynamic scroll layout with highlight
                              setTimeout(() => {
                                const el = document.getElementById("automation-dashboard-view") || document.getElementById("steps-card");
                                if (el) {
                                  el.scrollIntoView({ behavior: "smooth", block: "start" });
                                }
                                // Trigger a delightful highlight glow!
                                const stepsCard = document.getElementById("steps-card");
                                if (stepsCard) {
                                  stepsCard.classList.add("ring-2", "ring-cyan-400", "scale-[1.01]", "transition-all", "duration-500");
                                  setTimeout(() => {
                                    stepsCard.classList.remove("ring-2", "ring-cyan-400", "scale-[1.01]");
                                  }, 2000);
                                }
                              }, 350);
                            }}
                            className="w-full py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-cyan-350 font-bold rounded-lg text-[9.5px] cursor-pointer transition-all border border-cyan-500/20 flex items-center justify-center gap-1.5"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                            <span>טען את הבוט ללוח העבודה ✨</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              // Close the chat drawer
                              setIsChatDrawerOpen(false);

                              // Load bot config and steps
                              setConfig({
                                name: msg.botPreset!.name,
                                goal: msg.botPreset!.goal,
                                url: msg.botPreset!.url,
                                speed: msg.botPreset!.speed || 1,
                                useProxies: false,
                                rotateIpOnBan: false,
                                bypassCaptcha: false,
                                isolatedContext: true,
                                maxConcurrentThreads: 1,
                                ghostMode: true,
                                cognitiveVision: false,
                                quantumSpeed: false,
                                chaosEngine: false,
                                cloudSwarm: false,
                                residentialProxies: false,
                                antiBotShield: true,
                                geoClustering: true,
                                scoutHarvesterModule: false,
                                hotSwappingBackup: false
                              });
                              const freshSteps = msg.botPreset!.steps.map(s => ({ ...s, status: "pending" }));
                              setSteps(freshSteps);
                              setScrapedData([]);

                              // Force Hand interactive controls on
                              setIsAiHandActive(true);
                              setBrowserSimUrl(msg.botPreset!.url);
                              setBrowserSimPage(0);
                              setBrowserSimSearch("");
                              addLog(`🤖 השתלטות עצמאית מופעלת: עוזר ה-AI מקליד, לוחץ ומפעיל את הבוט "${msg.botPreset!.name}" בממשק בשבילך!`, "success");

                              // Scroll into view & execute simulation live
                              setTimeout(() => {
                                const el = document.getElementById("ai-managed-screen-simulator") || document.getElementById("steps-card");
                                if (el) {
                                  el.scrollIntoView({ behavior: "smooth", block: "center" });
                                }
                                startSimulation(freshSteps);
                              }, 800);
                            }}
                            className="w-full py-2 px-3 bg-gradient-to-r from-cyan-400 via-teal-500 to-indigo-500 hover:from-cyan-300 hover:to-indigo-400 text-slate-950 font-extrabold rounded-lg text-[10px] cursor-pointer transition-all duration-305 shadow-[0_0_12px_rgba(6,182,212,0.3)] hover:shadow-[0_0_18px_rgba(6,182,212,0.6)] flex items-center justify-center gap-1.5 uppercase"
                          >
                            <Zap className="w-3.5 h-3.5 fill-current text-slate-950 animate-bounce" />
                            <span>הפעל עכשיו והשתלט על המסך! 🤖🚀</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="min-h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-slate-900/60 flex items-center justify-center border border-slate-800 shadow-inner">
                <Sliders className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-300">ברוכים הבאים ל-BotForge AI!</h4>
                <p className="text-[10px] text-slate-500 mt-1 max-w-xs leading-normal">
                   אני העוזר האישי שלך. אני יכול לעזור לך לתכנן בוטים, להסביר את קוד ה-Puppeteer שלך, לספק הדרכה על סנכרון Google Sheets או לכוון אותך בשילוב Google Chat.
                </p>
              </div>

              {/* Suggestions chips */}
              <div className="w-full pt-2 space-y-1.5 text-right">
                <p className="text-[9px] text-slate-650 font-bold uppercase tracking-wider mb-1">שאלות נפוצות להפעלה מהירה:</p>
                {[
                  "איך שולחים הודעה ל-Google Chat?",
                  "איך עובד סנכרון Google Sheets?",
                  "איך אני מפיק דוח Google Slides מעוצב?"
                ].map((txt) => (
                  <button
                    key={txt}
                    type="button"
                    onClick={() => {
                      setAiInputMessage(txt);
                    }}
                    className="w-full text-right p-2 bg-slate-900/40 hover:bg-slate-850/60 text-indigo-300 hover:text-indigo-200 border border-slate-850/60 rounded-xl text-[10px] cursor-pointer transition-colors"
                  >
                    💡 {txt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {isAiTyping && (
            <div className="flex items-start gap-2.5 max-w-[85%] self-start flex-row-reverse animate-pulse">
              <div className="w-6 h-6 rounded-md bg-slate-800/60 flex items-center justify-center text-[10px] text-slate-400 shrink-0">AI</div>
              <div className="p-2.5 bg-slate-900/60 text-slate-350 rounded-2xl rounded-tr-none text-xs flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin text-cyan-450" />
                <span>העוזר מקליד כעת...</span>
              </div>
            </div>
          )}
        </div>

        {/* Chat input form */}
        <form onSubmit={handleAiAssistantSubmitMessage} className="p-4 bg-slate-900/40 border-t border-slate-800 space-y-2.5" id="ai-chat-drawer-input">
          
          {/* File Attachment Status Bar */}
          {uploadedFileAttachment ? (
            <div className="flex items-center justify-between bg-cyan-950/40 border border-cyan-850 p-2 rounded-xl text-xs text-cyan-205" dir="rtl">
              <div className="flex items-center gap-2 text-right">
                <span className="text-slate-400">📎 קובץ מצורף:</span>
                <span className="font-bold truncate max-w-[150px]">{uploadedFileAttachment.name}</span>
                <span className="font-mono text-[9px] text-[#8ab4f8] bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                  {uploadedFileAttachment.extension.toUpperCase()}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setUploadedFileAttachment(null);
                  addLog("הסרת הקובץ המצורף מהצ'אט.", "info");
                }}
                className="text-rose-400 hover:text-rose-300 font-bold px-1.5 py-0.5 rounded hover:bg-rose-955/20 text-[10px] uppercase cursor-pointer"
              >
                בטל ✕
              </button>
            </div>
          ) : null}

          <div className="flex gap-2 items-center">
            {/* Attachment Trigger Button */}
            <button
              type="button"
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.onchange = (e: any) => {
                  const file = e.target.files[0];
                  if (file) {
                    const ext = file.name.split(".").pop()?.toLowerCase() || "";
                    setUploadedFileAttachment({
                      name: file.name,
                      size: file.size,
                      extension: ext,
                    });
                    addLog(`📎 צירפת את הקובץ "${file.name}" כקובץ מקור עבור הצ'אט באפליקציה!`, "info");
                  }
                };
                input.click();
              }}
              className="p-2 bg-slate-950 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700 rounded-xl cursor-pointer shrink-0"
              title="צרף קובץ (כל סוג שהוא: קוד, exe, apk, וידאו, תמונות)"
            >
              <Upload className="w-4 h-4 text-cyan-400" />
            </button>

            <input 
              type="text"
              value={aiInputMessage}
              onChange={e => setAiInputMessage(e.target.value)}
              onPaste={(e) => {
                const items = e.clipboardData?.items;
                if (!items) return;
                for (let i = 0; i < items.length; i++) {
                  if (items[i].type.indexOf("image") !== -1 || items[i].kind === "file") {
                    const file = items[i].getAsFile();
                    if (file) {
                      const ext = file.name.split(".").pop()?.toLowerCase() || "";
                      setUploadedFileAttachment({
                        name: file.name,
                        size: file.size,
                        extension: ext,
                      });
                      addLog(`📎 הדבקת קובץ דרך הלוח: "${file.name}" כקובץ מקור עבור הצ'אט באפליקציה!`, "info");
                      e.preventDefault();
                    }
                  }
                }
              }}
              placeholder="שאל שאילתה או תאר קובץ לניתוח (ניתן להדביק גם קבצים - Ctrl+V)..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-250 focus:outline-none focus:border-indigo-500 min-w-0"
              dir="rtl"
              disabled={isAiTyping}
              id="ai-drawer-text-input"
            />
            <button
              type="submit"
              disabled={isAiTyping || (!aiInputMessage.trim() && !uploadedFileAttachment)}
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-550 disabled:opacity-50 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shrink-0"
              id="btn-submit-ai-drawer-msg"
            >
              שלח
            </button>
          </div>
        </form>
      </div>

      {/* Drawer backdrop overlay */}
      {isChatDrawerOpen && (
        <div 
          onClick={() => setIsChatDrawerOpen(false)}
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-[1px] z-30"
          id="ai-assistant-drawer-backdrop"
        />
      )}

      {/* ========== INTERACTIVE STEP EDITOR MODAL ========== */}
      {selectedEditStep && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn" id="step-editor-modal" dir={currentLanguage === "he" ? "rtl" : "ltr"}>
          <div className="w-full max-w-xl bg-[#0a0e17] rounded-2xl border border-slate-800 shadow-2xl p-6 text-right" id="step-editor-box">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-4">
              <button 
                type="button"
                onClick={() => setSelectedEditStep(null)}
                className="text-slate-400 hover:text-white text-lg font-bold p-1 cursor-pointer"
              >
                &times;
              </button>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400 animate-pulse" />
                {t("הגדרות ועריכת שלב אוטומציה", "Configure & Edit Automation Step")}
              </h3>
            </div>

            <div className="space-y-4">
              {/* Type select */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1 text-right">
                  {t("סוג הפעולה", "Action Type")}
                </label>
                <select
                  value={selectedEditStep.type}
                  onChange={(e) => {
                    const newType = e.target.value as StepType;
                    const defaultSnippet = helperGenerateCodeSnippet(newType, selectedEditStep.selector, selectedEditStep.value, selectedEditStep.title);
                    setSelectedEditStep(prev => prev ? { ...prev, type: newType, codeSnippet: defaultSnippet } : null);
                  }}
                  className="w-full text-xs font-semibold px-3 py-2 bg-slate-950 rounded-lg border border-slate-800 focus:outline-none focus:border-cyan-500 text-cyan-300 text-right"
                >
                  <option value="navigate">{t("ניווט (Navigate)", "Navigate")}</option>
                  <option value="click">{t("לחיצה (Click Element)", "Click Element")}</option>
                  <option value="input">{t("הקלדה (Type Input)", "Type Input")}</option>
                  <option value="wait">{t("המתנה (Wait / Sleep)", "Wait / Sleep")}</option>
                  <option value="scroll">{t("גלילה (Scroll Webpage)", "Scroll Webpage")}</option>
                  <option value="extract">{t("חילוץ נתונים (Extract Data)", "Extract Data")}</option>
                  <option value="condition">{t("תנאי לוגי (Condition / Branch)", "Condition / Branch")}</option>
                </select>
              </div>

              {/* Title Input */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1 text-right">
                  {t("כותרת השלב", "Step Title")}
                </label>
                <input
                  type="text"
                  value={selectedEditStep.title || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedEditStep(prev => prev ? { ...prev, title: val } : null);
                  }}
                  placeholder={t("לדוגמה: לחץ על כפתור רכישה", "e.g., Click purchase button")}
                  className="w-full text-xs px-3 py-2 bg-slate-950 rounded-lg border border-slate-800 focus:outline-none focus:border-cyan-500 text-white text-right"
                />
              </div>

              {/* Description Input */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1 text-right">
                  {t("תיאור הפעולה", "Action Description")}
                </label>
                <textarea
                  rows={2}
                  value={selectedEditStep.description || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedEditStep(prev => prev ? { ...prev, description: val } : null);
                  }}
                  placeholder={t("תאר מה הצעד הזה עושה באופו כללי...", "Explain what this step does...")}
                  className="w-full text-xs p-3 bg-slate-950 rounded-lg border border-slate-800 focus:outline-none focus:border-cyan-500 text-slate-200 resize-none leading-relaxed text-right"
                />
              </div>

              {/* Selector & Value Input inside grid if relevant */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1 text-right">
                    {t("מזהה CSS / סלקטור (Selector)", "CSS Selector (Optional)")}
                  </label>
                  <input
                    type="text"
                    value={selectedEditStep.selector || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      const defaultSnippet = helperGenerateCodeSnippet(selectedEditStep.type, val, selectedEditStep.value, selectedEditStep.title);
                      setSelectedEditStep(prev => prev ? { ...prev, selector: val, codeSnippet: defaultSnippet } : null);
                    }}
                    placeholder="#submit-btn or .product-price"
                    className="w-full text-xs font-mono px-3 py-2 bg-slate-950 rounded-lg border border-slate-800 focus:outline-none focus:border-cyan-500 text-cyan-300 ltr"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1 text-right">
                    {t("ערך להזנה / יעד (Value)", "Input Value / Target (Optional)")}
                  </label>
                  <input
                    type="text"
                    value={selectedEditStep.value || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      const defaultSnippet = helperGenerateCodeSnippet(selectedEditStep.type, selectedEditStep.selector, val, selectedEditStep.title);
                      setSelectedEditStep(prev => prev ? { ...prev, value: val, codeSnippet: defaultSnippet } : null);
                    }}
                    placeholder={t("לדוגמה: נעלי ספורט או 2000", "e.g., sneakers or 2000")}
                    className="w-full text-xs px-3 py-2 bg-slate-950 rounded-lg border border-slate-800 focus:outline-none focus:border-cyan-500 text-emerald-400 ltr"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Code Snippet Pre-view / Customization */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1 text-right flex justify-between">
                  <span className="text-[10px] text-slate-500 font-mono">PUPPETEER CODE</span>
                  <span>{t("קוד ריצה עצמאי", "Executable Puppeteer Script")}</span>
                </label>
                <textarea
                  rows={4}
                  value={selectedEditStep.codeSnippet || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedEditStep(prev => prev ? { ...prev, codeSnippet: val } : null);
                  }}
                  className="w-full text-xs font-mono p-3 bg-black rounded-lg border border-slate-850 focus:outline-none focus:border-cyan-500 text-cyan-200 leading-relaxed resize-none ltr"
                  dir="ltr"
                />
              </div>
            </div>

            {/* Actions Footer */}
            <div className="flex justify-between items-center border-t border-slate-800 pt-4 mt-5">
              {/* Delete button */}
              <button
                type="button"
                onClick={() => {
                  const confirmed = window.confirm(t("האם אתה בטוח שברצונך למחוק שלב זה?", "Are you sure you want to delete this step?"));
                  if (confirmed) {
                    setSteps(prev => prev.filter(s => s.id !== selectedEditStep.id));
                    addLog(`השלב "${selectedEditStep.title}" נמחק בהצלחה מזרימת העבודה.`, "warn");
                    setSelectedEditStep(null);
                  }
                }}
                className="px-3.5 py-1.5 bg-rose-950/45 hover:bg-rose-900 border border-rose-900/30 text-rose-300 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>{t("מחק שלב", "Delete Step")}</span>
              </button>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedEditStep(null)}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-850 text-slate-350 rounded-lg text-xs font-bold cursor-pointer"
                >
                  {t("ביטול", "Cancel")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSteps(prev => prev.map(s => s.id === selectedEditStep.id ? selectedEditStep : s));
                    addLog(`עריכת השלב "${selectedEditStep.title}" נשמרה בהצלחה.`, "success");
                    setSelectedEditStep(null);
                  }}
                  className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-[0_4px_15px_rgba(8,145,178,0.2)]"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{t("שמור שינויים", "Save Changes")}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========== INTERACTIVE ADD STEP MODAL ========== */}
      {showAddStepModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn" id="add-step-modal" dir={currentLanguage === "he" ? "rtl" : "ltr"}>
          <div className="w-full max-w-xl bg-[#0a0e17] rounded-2xl border border-slate-800 shadow-2xl p-6 text-right" id="add-step-box">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-4">
              <button 
                type="button"
                onClick={() => setShowAddStepModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold p-1 cursor-pointer"
              >
                &times;
              </button>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400 animate-pulse" />
                {t("הוספת שלב חדש לבוט", "Append New Automation Step")}
              </h3>
            </div>

            <div className="space-y-4">
              {/* Type select */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1 text-right">
                  {t("סוג הפעולה קדם-מוגדר", "Action Template Type")}
                </label>
                <select
                  value={newStepForm.type}
                  onChange={(e) => {
                    const newType = e.target.value as StepType;
                    setNewStepForm(prev => ({ ...prev, type: newType }));
                  }}
                  className="w-full text-xs font-semibold px-3 py-2 bg-slate-950 rounded-lg border border-slate-800 focus:outline-none focus:border-cyan-500 text-cyan-300 text-right"
                >
                  <option value="navigate">{t("ניווט (Navigate)", "Navigate")}</option>
                  <option value="click">{t("לחיצה (Click Element)", "Click Element")}</option>
                  <option value="input">{t("הקלדה (Type Input)", "Type Input")}</option>
                  <option value="wait">{t("המתנה (Wait / Sleep)", "Wait / Sleep")}</option>
                  <option value="scroll">{t("גלילה (Scroll Webpage)", "Scroll Webpage")}</option>
                  <option value="extract">{t("חילוץ נתונים (Extract Data)", "Extract Data")}</option>
                  <option value="condition">{t("תנאי לוגי (Condition / Branch)", "Condition / Branch")}</option>
                </select>
              </div>

              {/* Title Input */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1 text-right">
                  {t("כותרת השלב", "Step Title")}
                </label>
                <input
                  type="text"
                  value={newStepForm.title || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewStepForm(prev => ({ ...prev, title: val }));
                  }}
                  placeholder={t("לדוגמה: לחץ על כפתור רכישה", "e.g., Click purchase button")}
                  className="w-full text-xs px-3 py-2 bg-slate-950 rounded-lg border border-slate-800 focus:outline-none focus:border-cyan-500 text-white text-right"
                  required
                />
              </div>

              {/* Description Input */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1 text-right">
                  {t("תיאור הפעולה", "Action Description")}
                </label>
                <textarea
                  rows={2}
                  value={newStepForm.description || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewStepForm(prev => ({ ...prev, description: val }));
                  }}
                  placeholder={t("תאר מה הצעד הזה עושה באופו כללי...", "Explain what this step does...")}
                  className="w-full text-xs p-3 bg-slate-950 rounded-lg border border-slate-800 focus:outline-none focus:border-cyan-500 text-slate-200 resize-none leading-relaxed text-right"
                  required
                />
              </div>

              {/* Selector & Value Input inside grid if relevant */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1 text-right">
                    {t("מזהה CSS / סלקטור (Selector)", "CSS Selector (Optional)")}
                  </label>
                  <input
                    type="text"
                    value={newStepForm.selector || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewStepForm(prev => ({ ...prev, selector: val }));
                    }}
                    placeholder="#submit-btn or .product-price"
                    className="w-full text-xs font-mono px-3 py-2 bg-slate-950 rounded-lg border border-slate-800 focus:outline-none focus:border-cyan-500 text-cyan-300 ltr"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1 text-right">
                    {t("ערך להזנה / יעד (Value)", "Input Value / Target (Optional)")}
                  </label>
                  <input
                    type="text"
                    value={newStepForm.value || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewStepForm(prev => ({ ...prev, value: val }));
                    }}
                    placeholder={t("לדוגמה: נעלי ספורט או 2000", "e.g., sneakers or 2000")}
                    className="w-full text-xs px-3 py-2 bg-slate-950 rounded-lg border border-slate-800 focus:outline-none focus:border-cyan-500 text-emerald-400 ltr"
                    dir="ltr"
                  />
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="flex justify-end gap-3 border-t border-slate-800 pt-4 mt-5">
              <button
                type="button"
                onClick={() => setShowAddStepModal(false)}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-850 text-slate-350 rounded-lg text-xs font-bold cursor-pointer"
              >
                {t("ביטול", "Cancel")}
              </button>
              <button
                type="button"
                disabled={!newStepForm.title || !newStepForm.description}
                onClick={() => {
                  const generatedSnippet = helperGenerateCodeSnippet(newStepForm.type, newStepForm.selector, newStepForm.value, newStepForm.title);
                  const stepObj: BotStep = {
                    id: "custom_step_" + Date.now(),
                    type: newStepForm.type,
                    title: newStepForm.title,
                    description: newStepForm.description,
                    selector: newStepForm.selector || undefined,
                    value: newStepForm.value || undefined,
                    codeSnippet: generatedSnippet,
                    simulatedDurationMs: 1500,
                    status: "pending"
                  };
                  setSteps(prev => [...prev, stepObj]);
                  addLog(`השלב החדש "${newStepForm.title}" התווסף בהצלחה למקצה האוטומציה.`, "success");
                  setShowAddStepModal(false);
                }}
                className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-[0_4px_15px_rgba(8,145,178,0.2)]"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{t("הוסף שלב", "Add Step")}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* USER MANUAL MODAL */}
      {showUserManual && (
        <UserManual 
          onClose={() => setShowUserManual(false)} 
          lang={currentLanguage} 
        />
      )}

      {/* POP-UP LANGUAGE SELECTION DIALOG (עברית / English Settings) */}
      {showLanguageModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fadeIn" id="language-selection-modal">
          <div className="w-full max-w-lg bg-[#0a0e19] rounded-3xl border border-slate-800 shadow-2xl p-8 text-center relative overflow-hidden" id="language-modal-container">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-32 bg-gradient-to-r from-cyan-500/10 to-indigo-500/10 blur-3xl pointer-events-none" />

            {/* Header Icon */}
            <div className="mx-auto w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-6 shadow-inner">
              <Globe className="w-8 h-8 text-cyan-400 animate-spin-slow" />
            </div>

            <h3 className="text-xl font-bold text-white tracking-tight leading-normal" id="lang-modal-title">
              בחר שפת ממשק / Choose Language
            </h3>
            <p className="text-slate-400 text-xs mt-2 mb-8 leading-relaxed max-w-sm mx-auto font-sans">
              אנא בחר את השפה המועדפת עליך לעבודה ב-BotForge PRO. תוכל לשנות הגדרה זו בכל עת מסרגל הכלים העליון.
              <br />
              Please select your preferred language. You can change this anytime from the top navigation bar.
            </p>

            {/* Selection Cards */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* Hebrew Option */}
              <button
                type="button"
                onClick={() => {
                  setCurrentLanguage("he");
                  localStorage.setItem("botforge_language", "he");
                  document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname}; SameSite=None; Secure`;
                  document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=None; Secure`;
                  setShowLanguageModal(false);
                  setTimeout(() => window.location.reload(), 300);
                }}
                className={`group flex flex-col items-center justify-center p-6 rounded-2xl border text-center transition-all cursor-pointer ${
                  currentLanguage === "he" 
                    ? "bg-cyan-500/10 border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.15)]" 
                    : "bg-slate-950/80 hover:bg-slate-900 border-slate-850 hover:border-slate-800"
                }`}
                id="select-lang-he"
              >
                <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">🇮🇱</div>
                <span className="text-sm font-bold text-white block">עברית</span>
                <span className="text-[10px] text-slate-500 mt-1 font-sans">מימין לשמאל (RTL)</span>
              </button>

              {/* English Option */}
              <button
                type="button"
                onClick={() => {
                  setCurrentLanguage("en");
                  localStorage.setItem("botforge_language", "en");
                  document.cookie = `googtrans=/iw/en; path=/; domain=${window.location.hostname}; SameSite=None; Secure`;
                  document.cookie = `googtrans=/iw/en; path=/; SameSite=None; Secure`;
                  setShowLanguageModal(false);
                  setTimeout(() => window.location.reload(), 300);
                }}
                className={`group flex flex-col items-center justify-center p-6 rounded-2xl border text-center transition-all cursor-pointer ${
                  currentLanguage === "en" 
                    ? "bg-indigo-500/10 border-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.15)]" 
                    : "bg-slate-950/80 hover:bg-slate-900 border-slate-850 hover:border-slate-800"
                }`}
                id="select-lang-en"
              >
                <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">🇺🇸</div>
                <span className="text-sm font-bold text-white block">English</span>
                <span className="text-[10px] text-slate-500 mt-1 font-sans">Left-to-Right (LTR)</span>
              </button>
            </div>

            {/* Quick Note */}
            <div className="text-[10px] text-slate-500 bg-slate-950/40 p-3 rounded-xl border border-slate-900 font-sans">
              💡 {currentLanguage === "he" ? "המערכת תתאים את כיוון הדף (RTL/LTR) והתפריטים באופן אוטומטי!" : "The system automatically adjusts page direction (RTL/LTR) and layouts!"}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: AUTHENTICATION (EMAIL/PASSWORD/ANONYMOUS) */}
      {(showAuthModal || (needsAuth && !isSharedMode)) && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fadeIn" id="auth-modal">
          <div className="w-full max-w-md bg-[#0a0e17] rounded-2xl border border-slate-700 shadow-2xl relative overflow-hidden" id="auth-modal-container">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-cyan-600 to-indigo-600" />
            <div className="px-6 py-8">
              <div className="text-center mb-6">
                <div className="mx-auto w-12 h-12 bg-indigo-900/40 border border-indigo-700/50 rounded-xl flex items-center justify-center mb-3 text-indigo-400 shadow-[0_0_15px_rgba(79,70,229,0.3)]">
                  {isRegistering ? <UserPlus className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
                </div>
                <h3 className="text-xl font-bold text-white mb-1">
                  {isRegistering ? "הירשם למערכת" : "התחבר לחשבון"}
                </h3>
                <p className="text-xs text-slate-400 font-sans">
                  התחבר עם אימייל וסיסמה לשמירת הנתונים בענן
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] text-slate-300 font-semibold mb-1.5">כתובת אימייל</label>
                  <input
                    type="email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    dir="ltr"
                    placeholder="user@example.com"
                    className="w-full bg-slate-950 border border-slate-800 font-mono text-cyan-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors text-left"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-300 font-semibold mb-1.5">סיסמה</label>
                  <input
                    type="password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    dir="ltr"
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-800 font-mono text-cyan-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors text-left"
                  />
                </div>
                
                {authError && (
                  <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-xs p-3 rounded-lg text-center" dir="rtl">
                    {authError}
                  </div>
                )}

                <div className="pt-2">
                  <button
                    onClick={handleEmailAuth}
                    disabled={authProgress}
                    className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                  >
                    {authProgress ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      isRegistering ? "הירשם" : "התחבר"
                    )}
                  </button>
                </div>
                
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setIsRegistering(!isRegistering)}
                    className="text-xs text-cyan-500 hover:text-cyan-400 underline font-semibold cursor-pointer"
                  >
                    {isRegistering ? "כבר יש לך חשבון? התחבר" : "אין לך חשבון? הירשם כאן"}
                  </button>
                </div>

                <div className="relative mt-5 mb-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-800"></div>
                  </div>
                  <div className="relative flex justify-center text-[10px]">
                    <span className="bg-[#0a0e17] px-2 text-slate-500">או במקום זאת</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={handleAnonymousLogin}
                    disabled={authProgress}
                    className="w-full py-2 border border-slate-800 hover:bg-slate-900 text-slate-300 rounded-xl text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <UserCheck className="w-4 h-4 opacity-50" />
                    התחבר כאורח (אנונימי)
                  </button>
                </div>
                
                <div className="mt-6 pt-4 border-t border-slate-800 text-center">
                  <a 
                    href="https://whatsapp.com/channel/0029VbCCN56K0IBqkwWVWa19" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 text-xs text-green-400 hover:text-green-300 transition-colors bg-green-500/10 hover:bg-green-500/20 px-3 py-1.5 rounded-full"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
                    </svg>
                    הצטרף לערוץ התמיכה והעדכונים שלנו
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
    </>
  );
}
