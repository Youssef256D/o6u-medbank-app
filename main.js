const STORAGE_KEYS = {
  users: "mcq_users",
  currentUserId: "mcq_current_user_id",
  questions: "mcq_questions",
  sessions: "mcq_sessions",
  notifications: "mcq_notifications",
  notificationOutbox: "mcq_notification_outbox",
  notificationReadSyncQueue: "mcq_notification_read_sync_queue",
  filterPresets: "mcq_filter_presets",
  incorrectQueue: "mcq_incorrect_queue",
  invites: "mcq_invites",
  sessionUi: "mcq_session_ui_settings",
  feedback: "mcq_feedback",
  flashcards: "mcq_flashcards",
  systemLogs: "mcq_system_logs",
  curriculum: "mcq_curriculum",
  courseTopics: "mcq_course_topics",
  courseTopicGroups: "mcq_course_topic_groups",
  topicNewCatalog: "mcq_topic_new_catalog",
  topicNewSeen: "mcq_topic_new_seen",
  courseNotebookLinks: "mcq_course_notebook_links",
  autoApproveStudentAccess: "mcq_auto_approve_student_access",
  siteMaintenance: "mcq_site_maintenance",
  appVersionSeen: "mcq_app_version_seen",
  appVersionForced: "mcq_app_version_forced",
  studentRefreshTrigger: "mcq_student_refresh_trigger",
  studentRefreshTriggerSeen: "mcq_student_refresh_trigger_seen",
  pendingAdminActions: "mcq_pending_admin_actions",
};

const appEl = document.getElementById("app");
const topbarEl = document.querySelector(".topbar");
const brandWrapEl = document.querySelector(".brand-wrap");
const publicNavEl = document.getElementById("public-nav");
const privateNavEl = document.getElementById("private-nav");
const authActionsEl = document.getElementById("auth-actions");
const adminLinkEl = document.getElementById("admin-link");
const googleAuthLoadingEl = document.getElementById("google-auth-loading");
const APP_VERSION = String(document.querySelector('meta[name="app-version"]')?.getAttribute("content") || "2026-03-05.12").trim();
const ROUTE_STATE_ROUTE_KEY = "mcq_last_route";
const ROUTE_STATE_ADMIN_PAGE_KEY = "mcq_last_admin_page";
const ROUTE_STATE_ROUTE_LOCAL_KEY = "mcq_last_route_local";
const ROUTE_STATE_ADMIN_PAGE_LOCAL_KEY = "mcq_last_admin_page_local";
const GOOGLE_OAUTH_PENDING_KEY = "mcq_google_oauth_pending";
const PASSWORD_RECOVERY_PENDING_KEY = "mcq_password_recovery_pending";
const KNOWN_ROUTES = new Set([
  "landing",
  "features",
  "pricing",
  "about",
  "contact",
  "login",
  "signup",
  "forgot",
  "reset-password",
  "complete-profile",
  "dashboard",
  "notifications",
  "create-test",
  "qbank",
  "builder",
  "session",
  "review",
  "analytics",
  "profile",
  "admin",
]);
const PRIVATE_ROUTE_SET = new Set([
  "complete-profile",
  "dashboard",
  "notifications",
  "create-test",
  "qbank",
  "builder",
  "session",
  "review",
  "analytics",
  "profile",
  "admin",
]);
const AUTH_ENTRY_ROUTE_SET = new Set(["landing", "features", "pricing", "about", "contact", "login", "signup", "forgot"]);
const KNOWN_ADMIN_PAGES = new Set(["dashboard", "users", "courses", "questions", "bulk-import", "notifications", "site-access", "activity", "logs"]);
const ADMIN_AUTO_REFRESH_PAGES = new Set(["dashboard", "users"]);
const INITIAL_ROUTE = resolveInitialRoute();
const INITIAL_ADMIN_PAGE = resolveInitialAdminPage();
const RELATIONAL_READY_CACHE_MS = 45000;
const RELATIONAL_READY_FAILURE_CACHE_MS = 6000;
const RELATIONAL_FLUSH_DEBOUNCE_MS = 300;
const RELATIONAL_RETRY_FLUSH_MS = 2200;
const SUPABASE_FLUSH_DEBOUNCE_MS = 260;
const SUPABASE_RETRY_FLUSH_MS = 3000;
const SESSION_SYNC_FLUSH_MS = 2000;
const ADMIN_DATA_REFRESH_MS = 15000;
const ADMIN_QUESTION_BACKGROUND_REFRESH_MS = 180000;
const STUDENT_DATA_REFRESH_MS = 8000;
const STUDENT_FULL_DATA_REFRESH_MS = 60000;
const STUDENT_SESSION_LIVE_REFRESH_MS = 6000;
const STUDENT_FORCE_REFRESH_POLL_MS = 5000;
const STUDENT_BACKGROUND_SYNC_POLL_MS = 2500;
const STUDENT_ACCESS_POLL_MS = 6000;
const AUTO_STUDENT_REFRESH_SIGNAL_COOLDOWN_MS = 1200;
const SITE_MAINTENANCE_GATE_REFRESH_MS = 6000;
const NOTIFICATION_REALTIME_DEBOUNCE_MS = 220;
const SESSION_REALTIME_DEBOUNCE_MS = 900;
const PROFILE_ACCESS_REALTIME_DEBOUNCE_MS = 180;
const NOTIFICATION_FALLBACK_POLL_MS = 5000;
const NOTIFICATION_YEAR_EXTERNAL_ID_PREFIX = "year";
const NOTIFICATION_YEAR_EXTERNAL_ID_SEPARATOR = "::";
const ANALYTICS_RECENT_SESSION_WINDOW = 3;
const PRESENCE_HEARTBEAT_MS = 25000;
const PRESENCE_ONLINE_STALE_MS = 120000;
const SITE_ACTIVITY_HEARTBEAT_MS = 30000;
const ACTIVITY_REPORT_LOOKBACK_MS = 48 * 60 * 60 * 1000;
const SUPABASE_BOOTSTRAP_RETRY_MS = 1200;
const SUPABASE_BOOTSTRAP_RETRY_LIMIT = 10;
const SUPABASE_QUERY_TIMEOUT_MS = 15000;
const SUPABASE_SESSION_TIMEOUT_MS = 12000;
const SUPABASE_SIGNED_OUT_RECOVERY_TIMEOUT_MS = 5000;
const SUPABASE_SIGNED_OUT_RECOVERY_ATTEMPTS = 5;
const SUPABASE_SIGNED_OUT_RECOVERY_DELAY_MS = 600;
const SUPABASE_SESSION_RECOVERY_RETRY_MS = 6000;
const SUPABASE_SESSION_RECOVERY_RETRY_LIMIT = 20;
const ADMIN_REQUEST_TIMEOUT_MS = 15000;
const AUTH_SIGNIN_TIMEOUT_MS = 12000;
const APP_VERSION_FETCH_TIMEOUT_MS = 2500;
const PROFILE_LOOKUP_TIMEOUT_MS = 5000;
const ROUTE_TRANSITION_MS = 420;
const RELATIONAL_IN_BATCH_SIZE = 200;
const RELATIONAL_UPSERT_BATCH_SIZE = 200;
const RELATIONAL_INSERT_BATCH_SIZE = 250;
const RELATIONAL_DELETE_BATCH_SIZE = 250;
const DEFAULT_AUTO_APPROVE_STUDENT_ACCESS = true;
const DEFAULT_SITE_MAINTENANCE_TITLE = "O6U MedBank is temporarily unavailable";
const DEFAULT_SITE_MAINTENANCE_MESSAGE = "We are applying updates right now. Please check back again shortly.";
const AUTO_APPROVAL_ACTOR = "system:auto";
const BOOT_RECOVERY_FLAG = "mcq_boot_recovery_attempted";
const ACCOUNT_DEACTIVATED_SUPPORT_MESSAGE = "Your account has been deactivated. Please contact support.";
const THEME_PREFERENCE_KEY = "mcq_theme_preference";
const THEME_LIGHT = "light";
const THEME_DARK = "dark";
const THEME_COMFORT = "comfort";
const THEME_META_COLOR_LIGHT = "#177e89";
const THEME_META_COLOR_DARK = "#0f172a";
const THEME_META_COLOR_COMFORT = "#2b2826";
const SESSION_FONT_SCALE_MIN = 80;
const SESSION_FONT_SCALE_MAX = 140;
const SESSION_FONT_SCALE_STEP = 2;
const SESSION_FONT_SCALE_DEFAULT = 100;
const SESSION_HIGHLIGHTER_DEFAULT = "yellow";
const SESSION_HIGHLIGHTER_COLORS = new Set(["yellow", "red", "green"]);
const OAUTH_CALLBACK_QUERY_KEYS = new Set([
  "code",
  "state",
  "type",
  "error",
  "error_code",
  "error_description",
  "access_token",
  "refresh_token",
  "provider_token",
  "provider_refresh_token",
  "token_type",
  "expires_in",
  "expires_at",
]);
const PHONE_COUNTRY_RULES = [
  { country: "Egypt", code: "20", pattern: /^(10|11|12|15)\d{8}$/ },
  { country: "United States/Canada", code: "1", pattern: /^[2-9]\d{9}$/ },
  { country: "United Kingdom", code: "44", pattern: /^\d{9,10}$/ },
  { country: "Saudi Arabia", code: "966", pattern: /^\d{9}$/ },
  { country: "United Arab Emirates", code: "971", pattern: /^\d{8,9}$/ },
  { country: "India", code: "91", pattern: /^[6-9]\d{9}$/ },
  { country: "France", code: "33", pattern: /^\d{9}$/ },
  { country: "Germany", code: "49", pattern: /^\d{7,13}$/ },
];
const PHONE_COUNTRY_CODES_DESC = PHONE_COUNTRY_RULES
  .map((rule) => rule.code)
  .sort((a, b) => b.length - a.length);
const inMemoryStorage = new Map();
let storageFallbackWarned = false;
let activeTheme = THEME_LIGHT;

const state = {
  route: INITIAL_ROUTE,
  sessionId: null,
  reviewSessionId: null,
  reviewIndex: 0,
  adminEditQuestionId: null,
  adminFilters: {
    course: "",
    topic: "",
  },
  adminPage: INITIAL_ADMIN_PAGE,
  adminUserSearch: "",
  adminUserFilterYear: "",
  adminUserFilterSemester: "",
  adminAddUserPanelOpen: false,
  adminSelectedUserIds: [],
  adminUserBulkActionRunning: false,
  adminCurriculumYear: 1,
  adminCurriculumSemester: 1,
  adminCourseSearch: "",
  adminCourseFocus: "",
  adminCourseTopicModalCourse: "",
  adminCourseTopicGroupCreateModalOpen: false,
  adminCourseTopicInlineCreateOpen: false,
  adminEditorCourse: "",
  adminEditorTopic: "",
  adminQuestionModalOpen: false,
  qbankFilters: {
    course: "",
    topics: [],
    topicSource: "",
  },
  createTestSource: "all",
  createTestNameDraft: "",
  analyticsCourse: "",
  sessionPanel: null,
  sessionNavSettingsOpen: false,
  sessionHighlightUndo: {},
  sessionPendingHighlightSelection: null,
  sessionMarkerEnabled: false,
  sessionHighlighterColor: SESSION_HIGHLIGHTER_DEFAULT,
  sessionFontScalePercent: SESSION_FONT_SCALE_DEFAULT,
  sessionFontScale: "normal",
  sessionHighContrast: false,
  calcExpression: "",
  adminImportReport: null,
  adminImportDraft: "",
  adminImportCourse: "",
  adminImportTopic: "",
  skipNextRouteAnimation: false,
  adminDataRefreshing: false,
  adminDataLastSyncAt: 0,
  adminDataSyncError: "",
  adminForceRefreshRunning: false,
  adminCourseQuestionCountCache: null,
  adminCourseQuestionCountCacheRevision: 0,
  questionsRevision: 0,
  adminPresenceRows: [],
  adminPresenceLoading: false,
  adminPresenceError: "",
  adminPresenceLastSyncAt: 0,
  adminActivityReportRunning: false,
  adminImportRunning: false,
  adminImportStatus: "",
  adminImportStatusTone: "neutral",
  adminImportAsDraft: false,
  adminQuestionSaveRunning: false,
  adminQuestionDeleteQid: "",
  adminSelectedQuestionIds: [],
  adminBulkActionRunning: false,
  adminBulkActionType: "",
  adminNotificationTargetType: "all",
  adminNotificationTargetUserId: "",
  adminNotificationTargetQuery: "",
  adminNotificationTargetYear: 1,
  adminNotificationTitle: "",
  adminNotificationBody: "",
  adminNotificationSending: false,
  studentDataRefreshing: false,
  studentDataLastSyncAt: 0,
  studentDataLastFullSyncAt: 0,
  userMenuOpen: false,
  notificationMenuOpen: false,
};

let appVersionCheckPromise = null;
let askAiWindowRef = null;

let wasAdminCourseTopicModalOpen = false;
let wasAdminCourseTopicGroupCreateModalOpen = false;
let wasAdminCourseTopicInlineCreateOpen = false;
let adminCourseSearchDebounce = null;
let adminUserSearchDebounce = null;

const SUPABASE_CONFIG = {
  url: window.__SUPABASE_CONFIG?.url || "",
  anonKey: window.__SUPABASE_CONFIG?.anonKey || "",
  enabled: window.__SUPABASE_CONFIG?.enabled !== false,
  serverApiBaseUrl: window.__SUPABASE_CONFIG?.serverApiBaseUrl || "",
  authRedirectUrl: window.__SUPABASE_CONFIG?.authRedirectUrl || "",
  questionImageBucket: window.__SUPABASE_CONFIG?.questionImageBucket || "question-images",
};

const QUESTION_IMAGE_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;
const QUESTION_IMAGE_DATA_URL_FALLBACK_MAX_BYTES = 900 * 1024;
const QUESTION_IMAGE_SIGNED_URL_EXPIRY_OPTIONS = [
  60 * 60 * 24 * 365 * 5,
  60 * 60 * 24 * 365,
];
const QUESTION_IMAGE_ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
]);
const QUESTION_CHOICE_LABELS = ["A", "B", "C", "D", "E"];
const ASK_AI_WINDOW_NAME = "o6u-medbank-ask-ai";

const SYNCABLE_STORAGE_KEYS = [
  STORAGE_KEYS.users,
  STORAGE_KEYS.questions,
  STORAGE_KEYS.sessions,
  STORAGE_KEYS.filterPresets,
  STORAGE_KEYS.incorrectQueue,
  STORAGE_KEYS.invites,
  STORAGE_KEYS.feedback,
  STORAGE_KEYS.flashcards,
  STORAGE_KEYS.systemLogs,
  STORAGE_KEYS.curriculum,
  STORAGE_KEYS.courseTopics,
  STORAGE_KEYS.courseTopicGroups,
  STORAGE_KEYS.topicNewCatalog,
  STORAGE_KEYS.courseNotebookLinks,
  STORAGE_KEYS.autoApproveStudentAccess,
  STORAGE_KEYS.siteMaintenance,
  STORAGE_KEYS.studentRefreshTrigger,
];

const USER_SCOPED_SYNC_KEYS = [
  STORAGE_KEYS.sessions,
  STORAGE_KEYS.incorrectQueue,
  STORAGE_KEYS.flashcards,
  STORAGE_KEYS.topicNewSeen,
];
const USER_SCOPED_SYNC_KEY_SET = new Set(USER_SCOPED_SYNC_KEYS);
const GLOBAL_SYNC_KEYS = SYNCABLE_STORAGE_KEYS.filter((key) => !USER_SCOPED_SYNC_KEY_SET.has(key));
const RELATIONAL_SYNC_KEYS = [
  STORAGE_KEYS.users,
  STORAGE_KEYS.questions,
  STORAGE_KEYS.sessions,
  STORAGE_KEYS.curriculum,
  STORAGE_KEYS.courseTopics,
];
const RELATIONAL_SYNC_KEY_SET = new Set(RELATIONAL_SYNC_KEYS);
const GLOBAL_SYNC_BOOTSTRAP_KEYS = GLOBAL_SYNC_KEYS.filter((key) => !RELATIONAL_SYNC_KEY_SET.has(key));
const ADMIN_ONLY_RELATIONAL_KEYS = new Set([STORAGE_KEYS.questions, STORAGE_KEYS.curriculum, STORAGE_KEYS.courseTopics]);
const LEGACY_SUPABASE_STATE_SYNC_KEYS = SYNCABLE_STORAGE_KEYS.filter((key) => !RELATIONAL_SYNC_KEY_SET.has(key));
const LEGACY_SUPABASE_STATE_SYNC_KEY_SET = new Set(LEGACY_SUPABASE_STATE_SYNC_KEYS);
const LEGACY_SUPABASE_STATE_GLOBAL_KEYS = LEGACY_SUPABASE_STATE_SYNC_KEYS.filter((key) => !USER_SCOPED_SYNC_KEY_SET.has(key));
const LEGACY_SUPABASE_STATE_USER_SCOPED_KEYS = LEGACY_SUPABASE_STATE_SYNC_KEYS.filter((key) => USER_SCOPED_SYNC_KEY_SET.has(key));
const RELATIONAL_COMBINED_COURSE_SYNC_MARKER = "__relational_combined_course_topic_sync__";
const AUTO_STUDENT_REFRESH_SYNC_KEYS = new Set([
  STORAGE_KEYS.questions,
  STORAGE_KEYS.curriculum,
  STORAGE_KEYS.courseTopics,
  STORAGE_KEYS.users,
]);

const supabaseSync = {
  enabled: false,
  client: null,
  tableName: "",
  storageKeyColumn: "",
  pendingWrites: new Map(),
  flushTimer: null,
  flushing: false,
  lastSuccessAt: 0,
  lastFailureAt: 0,
  lastFailureMessage: "",
  retryAt: 0,
};

const supabaseAuth = {
  enabled: false,
  client: null,
  activeUserId: "",
  initializing: false,
  initialized: false,
};

const relationalSync = {
  enabled: false,
  pendingWrites: new Map(),
  flushTimer: null,
  flushing: false,
  lastQueuedAt: 0,
  lastSuccessAt: 0,
  lastFailureAt: 0,
  lastFailureMessage: "",
  retryAt: 0,
  profilesBackfillAttempted: false,
  questionsBackfillAttempted: false,
  readyCheckedAt: 0,
  readyPromise: null,
  lastReadyError: "",
};

const relationalQuestionColumnSupport = {
  checked: false,
  questionImageUrl: false,
  explanationImageUrl: false,
  sortOrder: false,
};

let timerHandle = null;
let lastRenderedRoute = null;
let routeTransitionHandle = null;
let sessionQuestionTransitionHandle = null;
let lastRenderedSessionPointer = null;
let wasAdminQuestionModalOpen = false;
let adminPresencePollHandle = null;
let adminDashboardPollHandle = null;
let supabaseBootstrapRetryHandle = null;
let supabaseBootstrapRetries = 0;
let supabaseBootstrapInFlight = false;
let supabaseAuthStateUnsubscribe = null;
let notificationRealtimeChannel = null;
let notificationRealtimeSubscriptionKey = "";
let notificationRealtimeSubscribed = false;
let notificationRealtimeHydrateTimer = null;
let notificationRealtimeHydrateInFlight = false;
let notificationRealtimeHydrateQueued = false;
let sessionRealtimeChannel = null;
let sessionRealtimeSubscriptionKey = "";
let sessionRealtimeSubscribed = false;
let sessionRealtimeHydrateTimer = null;
let sessionRealtimeHydrateInFlight = false;
let sessionRealtimeHydrateQueued = false;
let profileAccessRealtimeChannel = null;
let profileAccessRealtimeSubscriptionKey = "";
let profileAccessRealtimeHydrateTimer = null;
let profileAccessRealtimeHydrateInFlight = false;
let profileAccessRealtimeHydrateQueued = false;
let studentNotificationPollHandle = null;
let studentDataAutoRefreshPollHandle = null;
let studentDataAutoRefreshInFlight = false;
let studentForceRefreshPollHandle = null;
let studentForceRefreshInFlight = false;
let studentBackgroundRefreshPollHandle = null;
let studentBackgroundRefreshInFlight = false;
let studentAccessPollHandle = null;
let studentAccessPollInFlight = false;
let siteMaintenanceGateRefreshHandle = null;
let siteMaintenanceGateRefreshInFlight = false;
let supabaseSessionRecoveryHandle = null;
let supabaseSessionRecoveryRetries = 0;
let supabaseSessionRecoveryInFlight = false;
let suppressSupabaseSignedOutRecovery = false;
let globalEventsBound = false;
let questionSyncInFlightPromise = null;
let queuedQuestionSyncPayload = null;
let syncStatusUiRefreshHandle = null;
let lifecycleResumeHandle = null;
let adminQuestionsLastHydratedAt = 0;
const presenceRuntime = {
  timer: null,
  solvingStartedAt: null,
  isSolving: false,
  lastSentAt: 0,
  lastPayloadKey: "",
  lastRoute: "",
  lastSolving: false,
  pushInFlight: false,
  nextRetryAt: 0,
};
const siteActivityRuntime = {
  timer: null,
  sessionKey: "",
  startedAt: "",
  entryRoute: "",
  lastRoute: "",
  pageViews: 0,
  lastSentAt: 0,
  lastPayloadKey: "",
  pushInFlight: false,
  nextRetryAt: 0,
  endingInFlight: false,
};
const sessionSyncRuntime = {
  timer: null,
  dirty: false,
  flushing: false,
};
const adminActionRuntime = {
  flushTimer: null,
  flushing: false,
  lastSuccessAt: 0,
  lastFailureAt: 0,
  lastFailureMessage: "",
  retryAt: 0,
};
const postAuthWarmupRuntime = {
  key: "",
  promise: null,
};

const analyticsRuntime = {
  cache: new Map(),
  questionMetaById: new Map(),
};

const SYSTEM_LOG_MAX_ENTRIES = 2500;
const SYSTEM_LOG_RECENT_DEDUP_MS = 1200;
const systemLogRuntime = {
  suspend: false,
  lastSignature: "",
  lastAt: 0,
};
const SYSTEM_LOG_AUDITED_STORAGE_KEYS = new Set([
  STORAGE_KEYS.users,
  STORAGE_KEYS.questions,
  STORAGE_KEYS.curriculum,
  STORAGE_KEYS.courseTopics,
  STORAGE_KEYS.courseTopicGroups,
  STORAGE_KEYS.courseNotebookLinks,
  STORAGE_KEYS.autoApproveStudentAccess,
  STORAGE_KEYS.siteMaintenance,
  STORAGE_KEYS.invites,
  STORAGE_KEYS.feedback,
  STORAGE_KEYS.notifications,
  STORAGE_KEYS.studentRefreshTrigger,
  STORAGE_KEYS.filterPresets,
  STORAGE_KEYS.incorrectQueue,
  STORAGE_KEYS.flashcards,
]);

const DEFAULT_O6U_CURRICULUM = {
  1: {
    1: [
      "Introduction for All Students (Intro 100)",
      "Introduction to Body Structure (BOS 101)",
      "Gross & Microscopic Aspects of Diseases (GMD 102)",
      "Introduction to Microbial and Parasitic Agents (MIP 103)",
      "Introduction to Drug Therapy (DRG 104)",
      "Medical Terminology (MET 105)",
    ],
    2: [
      "Molecular Biology (MBI 106)",
      "Musculoskeletal (MUS 107)",
      "Hemopoetic System, Immunity & Defense Mechanism (HID 108)",
      "Clinical Toxicology (CTX 109)",
      "Computer Science (CSC 110)",
    ],
  },
  2: {
    1: [
      "Respiratory System (RES 201)",
      "Cardiovascular System (CVS 202)",
      "GIT & Liver (GIL 203)",
      "Social & Behavioral Science (SOB 204)",
    ],
    2: [
      "Metabolism & Nutrition (MEN 205)",
      "Nervous System (NER 206)",
      "Urinary System (URS 207)",
      "Endocrinology & Reproduction (ERP 208)",
      "Human Rights (HRT 209)",
    ],
  },
  3: {
    1: [
      "Ophthalmology (OPH 301)",
      "Medico-legal Aspects (MLG 302)",
      "Medical Research Methodology (MRS 303)",
      "Medical Statistics (MST 304)",
      "Introduction to General Medicine (MED 305)",
    ],
    2: [
      "ENT (ENT 306)",
      "National Health Care System (NHC 307)",
      "Embryological Development (EMD 308)",
      "Patient Safety (PTS 309)",
      "Introduction to General Surgery (SUR 310)",
    ],
  },
  4: {
    1: [
      "Pediatric 401 (Ped 401)",
      "Surgery Medical 402 (SM 402)",
      "Surgery Medical 403 (SM 403)",
      "Surgery Medical 404 (SM 404)",
    ],
    2: [
      "Pediatric 405 (Ped 405)",
      "Surgery Medical 406 (SM 406)",
      "Surgery Medical 407 (SM 407)",
    ],
  },
  5: {
    1: [
      "Obstetric (Obs 501)",
      "Surgery Medical 502 (SM 502)",
      "Surgery Medical 503 (SM 503)",
    ],
    2: [
      "Gynecology (Gyn 504)",
      "Surgery Medical 505 (SM 505)",
      "Surgery Medical 506 (SM 506)",
      "Surgery Medical 507 (SM 507)",
    ],
  },
};

const REMOVED_CURRICULUM_COURSES = ["Skills (selected topic)", "Elective (selected topic)"];
const REMOVED_CURRICULUM_COURSE_KEYS = new Set(REMOVED_CURRICULUM_COURSES.map((course) => course.toLowerCase()));
const REMOVED_TOPIC_NAMES = ["Module Overview", "Model Overview"];
const REMOVED_TOPIC_KEYS = new Set(REMOVED_TOPIC_NAMES.map((topic) => topic.toLowerCase()));
const COURSE_TOPIC_RECOVERY_SEEDS = {
  erp208: [
    "Introduction and Pituitary Gland",
    "Thyroid Gland",
    "Calcium Metabolism and Metabolic Bone Diseases",
    "Suprarenal Gland",
    "Endocrine Diseases of the Pancreas",
    "Breast Surgery",
  ],
  ner206: [
    "Neuroanatomy",
    "Stroke",
    "Seizure Disorders",
    "Neuromuscular Disorders",
  ],
};
const COURSE_TOPIC_RECOVERY_RULES = {
  erp208: [
    {
      topic: "Breast Surgery",
      needles: [
        "breast",
        "mammograph",
        "mastect",
        "mastitis",
        "fibroadenoma",
        "nipple",
        "axilla",
        "lump",
        "gynecomastia",
        "cooper",
        "peau d'orange",
        "peau d orange",
        "indian file",
        "ductal",
        "lobular",
      ],
    },
    {
      topic: "Endocrine Diseases of the Pancreas",
      needles: [
        "diabetes",
        "diabetic",
        "dka",
        "hhs",
        "insulin",
        "glucagon",
        "pancrea",
        "hypoglycemia",
        "hyperglycemia",
        "polyuria",
        "polydipsia",
        "postprandial",
        "hba1c",
        "fbs",
        "whipple",
        "ketoacidosis",
        "ketotic",
        "ketonuria",
        "insulinoma",
        "thiazolidinedione",
        "sulfonylurea",
        "metformin",
        "c-peptide",
      ],
    },
    {
      topic: "Thyroid Gland",
      needles: [
        "thyroid",
        "thyro",
        "graves",
        "hashimoto",
        "myxedema",
        "goiter",
        "t3",
        "t4",
        "tsh",
        "calcitonin",
        "thyrotox",
        "hyperthyroid",
        "hypothyroid",
      ],
    },
    {
      topic: "Calcium Metabolism and Metabolic Bone Diseases",
      needles: [
        "calcium",
        "parathyroid",
        "parathormone",
        "pth",
        "vitamin d",
        "osteoporosis",
        "osteomalacia",
        "rickets",
        "bone",
        "tetany",
        "osteopenia",
      ],
    },
    {
      topic: "Suprarenal Gland",
      needles: [
        "adrenal",
        "suprarenal",
        "cushing",
        "addison",
        "pheochromocytoma",
        "aldosterone",
        "cortisol",
        "cah",
        "conn",
        "hyperaldosteronism",
        "aldosteronism",
        "adrenal insufficiency",
        "adrenocortical",
        "glucocorticoid",
        "mineralocorticoid",
        "dhea",
        "hyperpigmentation",
        "hypokal",
        "hyperkal",
        "hirsutism",
      ],
    },
    {
      topic: "Introduction and Pituitary Gland",
      needles: [
        "pituitary",
        "prolactin",
        "acromegaly",
        "gigantism",
        "hypopit",
        "gh ",
        "acth",
        "sella",
        "galactorrhea",
        "vasopressin",
        "antidiuretic hormone",
        "adh",
        "diabetes insipidus",
        "anterior hypophysis",
        "posterior pituitary",
        "inferior petrosal",
        "somatotroph",
        "proopiomelanocortin",
        "cabergoline",
        "growth hormone",
        "hypophysis",
      ],
    },
  ],
  ner206: [
    {
      topic: "Stroke",
      needles: ["stroke", "cva", "hemipleg", "aphasia", "thrombolysis", "thrombectomy", "ischemic", "intracerebral hemorrhage", "subarachnoid"],
    },
    {
      topic: "Seizure Disorders",
      needles: ["seizure", "epilep", "convulsion", "status epilepticus", "tonic-clonic", "absence seizure", "postictal"],
    },
    {
      topic: "Neuromuscular Disorders",
      needles: ["myasthenia", "guillain", "neuromuscular", "muscular dystrophy", "peripheral neuropathy", "als", "motor neuron", "nmj"],
    },
    {
      topic: "Neuroanatomy",
      needles: ["neuroanatom", "cranial nerve", "brainstem", "spinal cord", "tract", "cerebell", "basal ganglia", "cortex"],
    },
  ],
};
const COURSE_TOPIC_RECOVERY_PROFILE_ALIASES = {
  sm406: "erp208",
  sm407: "ner206",
};

let O6U_CURRICULUM = deepClone(DEFAULT_O6U_CURRICULUM);
let CURRICULUM_COURSE_LIST = [];
let COURSE_TOPIC_OVERRIDES = {};
let COURSE_TOPIC_GROUPS = {};
let COURSE_NOTEBOOK_LINKS = {};
let QBANK_COURSE_TOPICS = {};
rebuildCurriculumCatalog();

function warnStorageFallback(error) {
  if (storageFallbackWarned) {
    return;
  }
  storageFallbackWarned = true;
  console.warn("Persistent browser storage is unavailable. Using temporary in-memory storage for this tab.", error);
}

const DEMO_ADMIN_EMAIL = "admin@o6umed.local";
const DEMO_STUDENT_EMAIL = "student@o6umed.local";
const FORCED_ADMIN_EMAILS = new Set([
  "code.youssefaayoub@gmail.com",
  "code.youssefayoub@gmail.com",
]);

const SAMPLE_QUESTIONS = [
  {
    id: "q1",
    course: "O6U MBBS",
    system: "Cardiovascular",
    topic: "Hemodynamics",
    difficulty: "Easy",
    tags: ["preload", "afterload", "shock"],
    author: "Admin",
    dateAdded: "2026-01-02",
    stem: "A patient with acute hemorrhage has low preload. Which hemodynamic parameter decreases first?",
    choices: [
      { id: "A", text: "Right atrial pressure" },
      { id: "B", text: "Systemic vascular resistance" },
      { id: "C", text: "Left ventricular wall thickness" },
      { id: "D", text: "Coronary perfusion pressure" },
      { id: "E", text: "Ejection fraction" },
    ],
    correct: ["A"],
    explanation:
      "Reduced venous return immediately lowers right atrial pressure and end-diastolic filling. SVR may increase later through sympathetic compensation.",
    objective: "Recognize preload-sensitive variables in early hypovolemia.",
    references: "Guyton & Hall Physiology",
    status: "published",
  },
  {
    id: "q2",
    course: "O6U MBBS",
    system: "Cardiovascular",
    topic: "Pharmacology",
    difficulty: "Medium",
    tags: ["beta-blocker", "arrhythmia"],
    author: "Admin",
    dateAdded: "2026-01-03",
    stem: "A medication slows AV nodal conduction and lowers renin release. Which receptor is most likely blocked?",
    choices: [
      { id: "A", text: "Alpha-1" },
      { id: "B", text: "Beta-1" },
      { id: "C", text: "Beta-2" },
      { id: "D", text: "M2" },
      { id: "E", text: "D1" },
    ],
    correct: ["B"],
    explanation:
      "Beta-1 blockade decreases AV nodal conduction, heart rate, and juxtaglomerular renin release.",
    objective: "Map beta-1 receptor physiology to therapeutic effects.",
    references: "First Aid Pharmacology",
    status: "published",
  },
  {
    id: "q3",
    course: "O6U MBBS",
    system: "Respiratory",
    topic: "Acid-Base",
    difficulty: "Medium",
    tags: ["ABG", "metabolic acidosis"],
    author: "Admin",
    dateAdded: "2026-01-05",
    stem: "ABG: pH 7.28, pCO2 30 mmHg, HCO3- 14 mEq/L. What is the primary disorder?",
    choices: [
      { id: "A", text: "Respiratory acidosis" },
      { id: "B", text: "Respiratory alkalosis" },
      { id: "C", text: "Metabolic acidosis" },
      { id: "D", text: "Metabolic alkalosis" },
      { id: "E", text: "Mixed alkalosis" },
    ],
    correct: ["C"],
    explanation:
      "Low pH and low bicarbonate indicate metabolic acidosis with respiratory compensation.",
    objective: "Identify primary acid-base disorders from ABG values.",
    references: "O6U Internal QBank",
    status: "published",
  },
  {
    id: "q4",
    course: "O6U MBBS",
    system: "Endocrine",
    topic: "Diabetes",
    difficulty: "Easy",
    tags: ["DKA", "management"],
    author: "Admin",
    dateAdded: "2026-01-07",
    stem: "Initial treatment priority in diabetic ketoacidosis is:",
    choices: [
      { id: "A", text: "Insulin bolus before fluids" },
      { id: "B", text: "Immediate bicarbonate in all cases" },
      { id: "C", text: "Isotonic fluid resuscitation" },
      { id: "D", text: "Restrict potassium intake" },
      { id: "E", text: "Oral hypoglycemics" },
    ],
    correct: ["C"],
    explanation:
      "Volume depletion is profound in DKA; isotonic fluids are first-line, followed by insulin and potassium-guided replacement.",
    objective: "Prioritize early DKA treatment steps.",
    references: "ADA Guidelines",
    status: "published",
  },
  {
    id: "q5",
    course: "O6U MBBS",
    system: "Neurology",
    topic: "Stroke",
    difficulty: "Hard",
    tags: ["tPA", "contraindications"],
    author: "Admin",
    dateAdded: "2026-01-09",
    stem: "Which finding is an absolute contraindication to IV thrombolysis for acute ischemic stroke?",
    choices: [
      { id: "A", text: "BP 170/95 mmHg" },
      { id: "B", text: "Platelets 95,000/uL" },
      { id: "C", text: "Glucose 60 mg/dL" },
      { id: "D", text: "Age 82 years" },
      { id: "E", text: "Mild headache" },
    ],
    correct: ["B"],
    explanation:
      "Platelet count below 100,000/uL is a contraindication due to bleeding risk.",
    objective: "Recognize major tPA exclusions.",
    references: "AHA/ASA Stroke Guideline",
    status: "published",
  },
  {
    id: "q6",
    course: "O6U MBBS",
    system: "Renal",
    topic: "Electrolytes",
    difficulty: "Medium",
    tags: ["hyponatremia", "SIADH"],
    author: "Admin",
    dateAdded: "2026-01-11",
    stem: "A euvolemic patient with low serum sodium and concentrated urine most likely has:",
    choices: [
      { id: "A", text: "Diabetes insipidus" },
      { id: "B", text: "Primary polydipsia" },
      { id: "C", text: "SIADH" },
      { id: "D", text: "Adrenal crisis only" },
      { id: "E", text: "Hyperaldosteronism" },
    ],
    correct: ["C"],
    explanation:
      "In SIADH, ADH excess causes water retention, hyponatremia, and inappropriately concentrated urine.",
    objective: "Diagnose SIADH using volume status and urine findings.",
    references: "Renal Physiology Review",
    status: "published",
  },
  {
    id: "q7",
    course: "O6U MBBS",
    system: "Immunology",
    topic: "Hypersensitivity",
    difficulty: "Easy",
    tags: ["type II", "autoimmune"],
    author: "Editor",
    dateAdded: "2026-01-12",
    stem: "Myasthenia gravis is best classified as which hypersensitivity type?",
    choices: [
      { id: "A", text: "Type I" },
      { id: "B", text: "Type II" },
      { id: "C", text: "Type III" },
      { id: "D", text: "Type IV" },
      { id: "E", text: "None" },
    ],
    correct: ["B"],
    explanation:
      "Autoantibodies target postsynaptic ACh receptors, a classic type II mechanism.",
    objective: "Classify autoimmune disease by hypersensitivity type.",
    references: "Immunology Core",
    status: "published",
  },
  {
    id: "q8",
    course: "O6U MBBS",
    system: "GI",
    topic: "Liver",
    difficulty: "Medium",
    tags: ["cirrhosis", "ascites"],
    author: "Editor",
    dateAdded: "2026-01-14",
    stem: "First-line treatment for tense ascites due to cirrhosis includes sodium restriction and:",
    choices: [
      { id: "A", text: "Furosemide alone" },
      { id: "B", text: "Spironolactone-based diuresis" },
      { id: "C", text: "Immediate transplant" },
      { id: "D", text: "High-protein diet only" },
      { id: "E", text: "Beta-blocker up-titration" },
    ],
    correct: ["B"],
    explanation:
      "Aldosterone antagonism with spironolactone is central to ascites management.",
    objective: "Choose first-line diuretic strategy in cirrhotic ascites.",
    references: "AASLD Practice Guidance",
    status: "published",
  },
  {
    id: "q9",
    course: "O6U MBBS",
    system: "Biostatistics",
    topic: "Diagnostics",
    difficulty: "Hard",
    tags: ["sensitivity", "specificity"],
    author: "Admin",
    dateAdded: "2026-01-15",
    stem: "A screening test with high sensitivity is most useful for:",
    choices: [
      { id: "A", text: "Confirming diagnosis" },
      { id: "B", text: "Ruling out disease when negative" },
      { id: "C", text: "Increasing prevalence" },
      { id: "D", text: "Improving PPV in low prevalence" },
      { id: "E", text: "Estimating hazard ratio" },
    ],
    correct: ["B"],
    explanation: "Highly sensitive tests reduce false negatives; a negative result helps rule out disease.",
    objective: "Apply SnNout in diagnostic reasoning.",
    references: "Biostatistics Essentials",
    status: "published",
  },
  {
    id: "q10",
    course: "O6U MBBS",
    system: "Microbiology",
    topic: "Antibiotics",
    difficulty: "Medium",
    tags: ["cell wall", "resistance"],
    author: "Editor",
    dateAdded: "2026-01-17",
    stem: "Which mechanism best explains methicillin resistance in Staphylococcus aureus?",
    choices: [
      { id: "A", text: "Efflux pump upregulation" },
      { id: "B", text: "Altered penicillin-binding protein" },
      { id: "C", text: "Reduced ribosomal affinity" },
      { id: "D", text: "DNA gyrase mutation" },
      { id: "E", text: "Folate pathway bypass" },
    ],
    correct: ["B"],
    explanation: "MRSA expresses PBP2a, lowering affinity for beta-lactam antibiotics.",
    objective: "Recognize molecular basis of MRSA resistance.",
    references: "Microbiology Review",
    status: "published",
  },
  {
    id: "q11",
    course: "O6U MBBS",
    system: "OB/GYN",
    topic: "Prenatal Care",
    difficulty: "Easy",
    tags: ["screening", "pregnancy"],
    author: "Admin",
    dateAdded: "2026-01-19",
    stem: "The recommended folic acid supplementation before conception primarily reduces risk of:",
    choices: [
      { id: "A", text: "Gestational diabetes" },
      { id: "B", text: "Neural tube defects" },
      { id: "C", text: "Placental abruption" },
      { id: "D", text: "Preeclampsia" },
      { id: "E", text: "Preterm labor" },
    ],
    correct: ["B"],
    explanation:
      "Folic acid supplementation decreases neural tube defects when started preconception and continued early in pregnancy.",
    objective: "Recall key preventive prenatal intervention.",
    references: "ACOG Guidance",
    status: "published",
  },
  {
    id: "q12",
    course: "O6U MBBS",
    system: "Psychiatry",
    topic: "Mood Disorders",
    difficulty: "Medium",
    tags: ["MDD", "diagnosis"],
    author: "Editor",
    dateAdded: "2026-01-20",
    stem: "Major depressive disorder diagnosis requires symptoms for at least:",
    choices: [
      { id: "A", text: "4 days" },
      { id: "B", text: "1 week" },
      { id: "C", text: "2 weeks" },
      { id: "D", text: "1 month" },
      { id: "E", text: "6 months" },
    ],
    correct: ["C"],
    explanation: "DSM criteria for major depressive episodes require a minimum 2-week duration.",
    objective: "Apply diagnostic timeframe criteria for MDD.",
    references: "DSM-5-TR",
    status: "published",
  },
];

function initVersionTracking() {
  const seen = String(load(STORAGE_KEYS.appVersionSeen, "") || "").trim();
  if (!seen) {
    saveLocalOnly(STORAGE_KEYS.appVersionSeen, APP_VERSION);
  }

  const forced = String(load(STORAGE_KEYS.appVersionForced, "") || "").trim();
  if (forced && forced === APP_VERSION) {
    saveLocalOnly(STORAGE_KEYS.appVersionSeen, APP_VERSION);
    removeStorageKey(STORAGE_KEYS.appVersionForced);
  }
}

async function fetchPublishedAppVersion() {
  try {
    const checkUrl = new URL(window.location.href);
    checkUrl.searchParams.set("__app_version_check", String(Date.now()));
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timeoutHandle = controller
      ? window.setTimeout(() => {
        controller.abort();
      }, APP_VERSION_FETCH_TIMEOUT_MS)
      : null;
    const response = await fetch(checkUrl.toString(), {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
      ...(controller ? { signal: controller.signal } : {}),
    }).finally(() => {
      if (timeoutHandle) {
        window.clearTimeout(timeoutHandle);
      }
    });
    if (!response.ok) {
      return null;
    }
    const html = await response.text();
    const match = html.match(/<meta\s+name=["']app-version["']\s+content=["']([^"']+)["']/i);
    return String(match?.[1] || "").trim() || null;
  } catch {
    return null;
  }
}

async function enforceRefreshAfterSignIn() {
  if (appVersionCheckPromise) {
    return appVersionCheckPromise;
  }

  appVersionCheckPromise = (async () => {
    const seenVersion = String(load(STORAGE_KEYS.appVersionSeen, "") || "").trim();
    const publishedVersion = (await fetchPublishedAppVersion()) || APP_VERSION;
    if (!publishedVersion) {
      return false;
    }

    if (!seenVersion) {
      saveLocalOnly(STORAGE_KEYS.appVersionSeen, publishedVersion);
      return false;
    }

    if (seenVersion === publishedVersion) {
      if (publishedVersion === APP_VERSION) {
        removeStorageKey(STORAGE_KEYS.appVersionForced);
      }
      return false;
    }

    const forcedVersion = String(load(STORAGE_KEYS.appVersionForced, "") || "").trim();
    if (forcedVersion === publishedVersion) {
      return false;
    }

    saveLocalOnly(STORAGE_KEYS.appVersionSeen, publishedVersion);
    saveLocalOnly(STORAGE_KEYS.appVersionForced, publishedVersion);
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set("appv", publishedVersion);
    window.location.replace(nextUrl.toString());
    return true;
  })();

  try {
    return await appVersionCheckPromise;
  } finally {
    appVersionCheckPromise = null;
  }
}

async function shouldForceRefreshAfterSignIn() {
  const timeoutMs = APP_VERSION_FETCH_TIMEOUT_MS + 1800;
  const outcome = await runWithTimeoutResult(
    Promise.resolve(enforceRefreshAfterSignIn())
      .then((shouldRefresh) => ({ shouldRefresh: Boolean(shouldRefresh) }))
      .catch((error) => {
        console.warn("Post sign-in version check failed.", error?.message || error);
        return { shouldRefresh: false };
      }),
    timeoutMs,
    "Version check timed out.",
  );

  if (outcome?.error) {
    return false;
  }
  return Boolean(outcome?.shouldRefresh);
}

function getStudentRefreshTriggerToken() {
  const payload = load(STORAGE_KEYS.studentRefreshTrigger, null);
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return "";
  }
  return String(payload.token || "").trim();
}

function createStudentRefreshTriggerPayload(user = null, options = {}) {
  const current = user || getCurrentUser();
  const currentProfileId = String(getUserProfileId(current) || "").trim();
  const actorName = String(current?.name || current?.email || "Admin").trim() || "Admin";
  const normalizedKeys = [...new Set(
    (Array.isArray(options?.changedKeys) ? options.changedKeys : [])
      .map((entry) => String(entry || "").trim())
      .filter(Boolean),
  )];
  const reason = String(options?.reason || "").trim();
  return {
    token: makeId("student_refresh"),
    requestedAt: nowISO(),
    requestedById: isUuidValue(currentProfileId) ? currentProfileId : null,
    requestedBy: actorName,
    ...(reason ? { reason } : {}),
    ...(normalizedKeys.length ? { changedKeys: normalizedKeys } : {}),
  };
}

function queueStudentRefreshSignal(options = {}) {
  const current = options?.user || getCurrentUser();
  if (!current || current.role !== "admin") {
    return false;
  }
  if (!supabaseSync.enabled) {
    return false;
  }
  const existing = load(STORAGE_KEYS.studentRefreshTrigger, null);
  const lastRequestedAtMs = parseSyncTimestampMs(existing?.requestedAt);
  if (
    !options?.force
    && lastRequestedAtMs
    && (Date.now() - lastRequestedAtMs) < AUTO_STUDENT_REFRESH_SIGNAL_COOLDOWN_MS
  ) {
    return false;
  }
  const payload = createStudentRefreshTriggerPayload(current, options);
  saveLocalOnly(STORAGE_KEYS.studentRefreshTrigger, payload);
  scheduleSupabaseWrite(STORAGE_KEYS.studentRefreshTrigger, payload);
  if (options?.flushNow !== false) {
    flushSupabaseWrites().catch((error) => {
      console.warn("Auto student refresh signal flush failed.", error?.message || error);
    });
  }
  scheduleSyncStatusUiRefresh();
  return true;
}

function shouldForceStudentRefreshFromAdminTrigger(user = null, options = {}) {
  const current = user || getCurrentUser();
  if (!current || current.role !== "student") {
    return false;
  }
  const token = getStudentRefreshTriggerToken();
  if (!token) {
    return false;
  }
  const seenToken = String(load(STORAGE_KEYS.studentRefreshTriggerSeen, "") || "").trim();
  if (seenToken === token) {
    return false;
  }
  saveLocalOnly(STORAGE_KEYS.studentRefreshTriggerSeen, token);
  if (options?.reload === false) {
    return true;
  }
  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set("student_refresh", token);
  window.location.replace(nextUrl.toString());
  return true;
}

async function shouldForceRefreshForUpdates(user = null) {
  if (await shouldForceRefreshAfterSignIn()) {
    return true;
  }
  return shouldForceStudentRefreshFromAdminTrigger(user);
}

function readRouteFromHash(hashValue = window.location.hash) {
  const rawHash = String(hashValue || "").replace(/^#/, "").trim().toLowerCase();
  if (!rawHash || rawHash.includes("=")) {
    return "";
  }
  return KNOWN_ROUTES.has(rawHash) ? rawHash : "";
}

function syncRouteHash(route) {
  let currentUrl;
  try {
    currentUrl = new URL(window.location.href);
  } catch {
    return;
  }

  const safeRoute = String(route || "").trim().toLowerCase();
  if (!KNOWN_ROUTES.has(safeRoute)) {
    return;
  }
  const currentHashPayload = String(currentUrl.hash || "").replace(/^#/, "").trim();
  if (currentHashPayload && currentHashPayload.includes("=")) {
    return;
  }
  const nextHash = safeRoute === "landing" ? "" : `#${safeRoute}`;
  if ((currentUrl.hash || "") === nextHash) {
    return;
  }
  const query = currentUrl.searchParams.toString();
  const nextUrl = `${currentUrl.pathname}${query ? `?${query}` : ""}${nextHash}`;
  window.history.replaceState(window.history.state, document.title, nextUrl);
}

function resolveInitialRoute() {
  const hashRoute = readRouteFromHash();
  if (KNOWN_ROUTES.has(hashRoute)) {
    return hashRoute;
  }
  const persisted = String(readSessionStorageKey(ROUTE_STATE_ROUTE_KEY) || "").trim().toLowerCase();
  if (KNOWN_ROUTES.has(persisted)) {
    return persisted;
  }
  const persistedLocal = String(load(ROUTE_STATE_ROUTE_LOCAL_KEY, "") || "").trim().toLowerCase();
  if (KNOWN_ROUTES.has(persistedLocal)) {
    return persistedLocal;
  }
  const hinted = String(window.__APP_INITIAL_ROUTE__ || "").trim().toLowerCase();
  if (KNOWN_ROUTES.has(hinted)) {
    return hinted;
  }
  return "landing";
}

function resolveInitialAdminPage() {
  const persisted = String(readSessionStorageKey(ROUTE_STATE_ADMIN_PAGE_KEY) || "").trim().toLowerCase();
  if (KNOWN_ADMIN_PAGES.has(persisted)) {
    return persisted;
  }
  const persistedLocal = String(load(ROUTE_STATE_ADMIN_PAGE_LOCAL_KEY, "") || "").trim().toLowerCase();
  if (KNOWN_ADMIN_PAGES.has(persistedLocal)) {
    return persistedLocal;
  }
  return "dashboard";
}

function persistRouteState() {
  const route = String(state.route || "").trim().toLowerCase();
  if (KNOWN_ROUTES.has(route)) {
    writeSessionStorageKey(ROUTE_STATE_ROUTE_KEY, route);
    saveLocalOnly(ROUTE_STATE_ROUTE_LOCAL_KEY, route);
  } else {
    removeSessionStorageKey(ROUTE_STATE_ROUTE_KEY);
    removeStorageKey(ROUTE_STATE_ROUTE_LOCAL_KEY);
  }

  const adminPage = String(state.adminPage || "").trim().toLowerCase();
  if (KNOWN_ADMIN_PAGES.has(adminPage)) {
    writeSessionStorageKey(ROUTE_STATE_ADMIN_PAGE_KEY, adminPage);
    saveLocalOnly(ROUTE_STATE_ADMIN_PAGE_LOCAL_KEY, adminPage);
  } else {
    removeSessionStorageKey(ROUTE_STATE_ADMIN_PAGE_KEY);
    removeStorageKey(ROUTE_STATE_ADMIN_PAGE_LOCAL_KEY);
  }

  syncRouteHash(route);
}

async function init() {
  seedData();
  syncUsersWithCurriculum();
  sanitizeSystemLogsToAdminOnly();
  initVersionTracking();
  hydrateThemePreference();
  if (await shouldForceRefreshAfterSignIn()) {
    return;
  }
  hydrateSessionUiPreferences();
  bindGlobalEvents();
  appendSystemLog("system.boot", "Application initialized.", { appVersion: APP_VERSION }, { force: true });
  syncGoogleOAuthLoadingUi();
  document.body.classList.add("is-routing");
  render();

  const syncBootstrapPromise = initSupabaseSync().catch((error) => {
    console.warn("Supabase sync bootstrap failed.", error?.message || error);
    return { enabled: false, hadRemoteData: false };
  });
  if (shouldForceStudentRefreshFromAdminTrigger()) {
    return;
  }

  try {
    await initSupabaseAuth();
  } catch (error) {
    console.warn("Supabase auth bootstrap failed.", error?.message || error);
  }

  const syncBootstrap = await syncBootstrapPromise;

  if (syncBootstrap.enabled && !syncBootstrap.hadRemoteData) {
    scheduleFullSupabaseSync();
  }
  const topicRepairResult = repairCourseTopicCatalogFromQuestions({
    persist: getCurrentUser()?.role === "admin",
  });
  if (topicRepairResult.questionsChanged || topicRepairResult.topicsChanged) {
    render();
  }
  if (supabaseAuth.enabled || supabaseSync.enabled) {
    clearSupabaseBootstrapRetry();
  } else if (SUPABASE_CONFIG.enabled && !window.supabase?.createClient) {
    scheduleSupabaseBootstrapRetry();
  }
  flushPendingAdminActionQueue().catch(() => { });
  removeSessionStorageKey(BOOT_RECOVERY_FLAG);
  render();
  flushPendingNotificationReadSync().catch(() => { });
  flushPendingNotificationOutbox().catch(() => { });
}

function clearSupabaseBootstrapRetry() {
  if (supabaseBootstrapRetryHandle) {
    window.clearInterval(supabaseBootstrapRetryHandle);
    supabaseBootstrapRetryHandle = null;
  }
}

async function tryBootstrapSupabaseInBackground() {
  if (supabaseBootstrapInFlight || !window.supabase?.createClient) {
    return false;
  }

  supabaseBootstrapInFlight = true;
  try {
    const syncBootstrapPromise = initSupabaseSync().catch((error) => {
      console.warn("Deferred Supabase sync bootstrap failed.", error?.message || error);
      return { enabled: false, hadRemoteData: false };
    });

    try {
      await initSupabaseAuth();
    } catch (error) {
      console.warn("Deferred Supabase auth bootstrap failed.", error?.message || error);
    }

    const syncBootstrap = await syncBootstrapPromise;

    if (!syncBootstrap.enabled && !supabaseAuth.enabled) {
      return false;
    }

    if (syncBootstrap.enabled && !syncBootstrap.hadRemoteData) {
      scheduleFullSupabaseSync();
    }
    clearSupabaseBootstrapRetry();
    flushPendingAdminActionQueue().catch(() => { });
    render();
    return true;
  } finally {
    supabaseBootstrapInFlight = false;
  }
}

function scheduleSupabaseBootstrapRetry() {
  if (supabaseBootstrapRetryHandle || !SUPABASE_CONFIG.enabled || supabaseAuth.enabled) {
    return;
  }

  supabaseBootstrapRetries = 0;
  tryBootstrapSupabaseInBackground().catch(() => { });
  supabaseBootstrapRetryHandle = window.setInterval(() => {
    if (supabaseBootstrapRetries >= SUPABASE_BOOTSTRAP_RETRY_LIMIT) {
      clearSupabaseBootstrapRetry();
      return;
    }
    supabaseBootstrapRetries += 1;
    tryBootstrapSupabaseInBackground().catch(() => { });
  }, SUPABASE_BOOTSTRAP_RETRY_MS);
}

window.__MCQ_ON_SUPABASE_SDK_READY__ = function handleSupabaseSdkReady() {
  if (!SUPABASE_CONFIG.enabled || !window.supabase?.createClient) {
    return;
  }
  if (supabaseAuth.initializing) {
    window.setTimeout(() => {
      window.__MCQ_ON_SUPABASE_SDK_READY__?.();
    }, 160);
    return;
  }
  if ((supabaseAuth.enabled || supabaseSync.enabled) && supabaseAuth.initialized) {
    clearSupabaseBootstrapRetry();
    return;
  }
  tryBootstrapSupabaseInBackground().catch((error) => {
    console.warn("Supabase SDK bootstrap after load failed.", error?.message || error);
    scheduleSupabaseBootstrapRetry();
  });
};

function clearSupabaseSessionRecoveryRetry() {
  if (supabaseSessionRecoveryHandle) {
    window.clearInterval(supabaseSessionRecoveryHandle);
    supabaseSessionRecoveryHandle = null;
  }
  supabaseSessionRecoveryRetries = 0;
  supabaseSessionRecoveryInFlight = false;
}

async function tryRecoverSupabaseSessionInBackground() {
  if (supabaseSessionRecoveryInFlight) {
    return false;
  }
  if (supabaseAuth.initializing) {
    return false;
  }
  if (!SUPABASE_CONFIG.enabled || !getSupabaseAuthClient()) {
    return false;
  }
  if (!getCurrentUser() || hasActiveSupabaseSessionForUser()) {
    clearSupabaseSessionRecoveryRetry();
    return false;
  }

  supabaseSessionRecoveryInFlight = true;
  try {
    await initSupabaseAuth();
    const recovered = hasActiveSupabaseSessionForUser();
    if (recovered) {
      clearSupabaseSessionRecoveryRetry();
      state.skipNextRouteAnimation = true;
      render();
      return true;
    }
    return false;
  } catch (error) {
    console.warn("Background Supabase session recovery failed.", error?.message || error);
    return false;
  } finally {
    supabaseSessionRecoveryInFlight = false;
  }
}

function scheduleSupabaseSessionRecoveryRetry() {
  if (
    supabaseSessionRecoveryHandle
    || !SUPABASE_CONFIG.enabled
    || !getSupabaseAuthClient()
    || !getCurrentUser()
    || hasActiveSupabaseSessionForUser()
  ) {
    return;
  }
  supabaseSessionRecoveryRetries = 0;
  tryRecoverSupabaseSessionInBackground().catch(() => { });
  supabaseSessionRecoveryHandle = window.setInterval(() => {
    if (
      !getCurrentUser()
      || hasActiveSupabaseSessionForUser()
      || supabaseSessionRecoveryRetries >= SUPABASE_SESSION_RECOVERY_RETRY_LIMIT
    ) {
      clearSupabaseSessionRecoveryRetry();
      return;
    }
    supabaseSessionRecoveryRetries += 1;
    tryRecoverSupabaseSessionInBackground().catch(() => { });
  }, SUPABASE_SESSION_RECOVERY_RETRY_MS);
}

function getOrCreateSupabaseBrowserClient() {
  if (!SUPABASE_CONFIG.enabled || !SUPABASE_CONFIG.url || !SUPABASE_CONFIG.anonKey || !window.supabase?.createClient) {
    return null;
  }
  if (supabaseAuth.client) {
    return supabaseAuth.client;
  }
  if (supabaseSync.client) {
    return supabaseSync.client;
  }
  const client = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
  supabaseSync.client = client;
  return client;
}

function isSupabaseAuthRestorePending(user = null, route = state.route) {
  const currentUser = user || getCurrentUser();
  if (currentUser) {
    return false;
  }
  const normalizedRoute = String(route || "").trim().toLowerCase();
  if (!PRIVATE_ROUTE_SET.has(normalizedRoute)) {
    return false;
  }
  if (!SUPABASE_CONFIG.enabled || !SUPABASE_CONFIG.url || !SUPABASE_CONFIG.anonKey || !window.supabase?.createClient) {
    return false;
  }
  return supabaseAuth.initializing || !supabaseAuth.initialized;
}

async function initSupabaseSync() {
  if (!SUPABASE_CONFIG.enabled || !SUPABASE_CONFIG.url || !SUPABASE_CONFIG.anonKey || !window.supabase?.createClient) {
    return { enabled: false, hadRemoteData: false };
  }

  try {
    const client = getOrCreateSupabaseBrowserClient();
    if (!client) {
      return { enabled: false, hadRemoteData: false };
    }
    supabaseSync.client = client;

    const syncShape = await detectSupabaseStorageShape(client);
    if (!syncShape) {
      console.warn("Supabase sync table was not found. Expected app_state/storage_key or appstate/storagekey.");
      return { enabled: false, hadRemoteData: false };
    }
    supabaseSync.tableName = syncShape.tableName;
    supabaseSync.storageKeyColumn = syncShape.storageKeyColumn;
    supabaseSync.enabled = true;

    const syncResult = await hydrateSupabaseSyncKeys(GLOBAL_SYNC_BOOTSTRAP_KEYS);
    if (syncResult?.error) {
      const error = syncResult.error;
      console.warn("Supabase sync unavailable. Falling back to local storage only.", error.message);
      supabaseSync.enabled = false;
      return { enabled: false, hadRemoteData: false };
    }

    return { enabled: true, hadRemoteData: Boolean(syncResult?.hadRemoteData) };
  } catch (error) {
    console.warn("Supabase client bootstrap failed. Using local storage only.", error);
    return { enabled: false, hadRemoteData: false };
  }
}

function decodeOAuthErrorMessage(rawMessage) {
  let message = String(rawMessage || "").trim();
  if (!message) {
    return "";
  }
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const decoded = decodeURIComponent(message.replace(/\+/g, " "));
      if (decoded === message) {
        break;
      }
      message = decoded;
    } catch {
      break;
    }
  }
  return message;
}

function getFriendlyOAuthCallbackErrorMessage(rawMessage) {
  const decoded = decodeOAuthErrorMessage(rawMessage);
  const normalized = decoded.toLowerCase();
  if (!decoded) {
    return "";
  }
  if (normalized.includes("access_denied")) {
    return "Google sign-in was canceled or denied. Please try again.";
  }
  if (
    normalized.includes("code verifier")
    || normalized.includes("invalid_grant")
    || normalized.includes("invalid request")
  ) {
    return "Google sign-in session expired. Please start again using Continue with Google.";
  }
  if (
    normalized.includes("unable to exchange external code")
    || normalized.includes("invalid_client")
    || normalized.includes("unauthorized")
  ) {
    return "Google sign-in is not configured correctly in Supabase (invalid Google OAuth client credentials).";
  }
  return decoded;
}

function isGoogleOAuthPendingState() {
  return readSessionStorageKey(GOOGLE_OAUTH_PENDING_KEY) === "1";
}

function syncGoogleOAuthLoadingUi() {
  if (!googleAuthLoadingEl) {
    return;
  }
  const pending = isGoogleOAuthPendingState();
  googleAuthLoadingEl.classList.toggle("hidden", !pending);
  googleAuthLoadingEl.setAttribute("aria-hidden", pending ? "false" : "true");
  document.body.classList.toggle("is-google-auth-loading", pending);
}

function setGoogleOAuthPendingState(isPending) {
  if (isPending) {
    writeSessionStorageKey(GOOGLE_OAUTH_PENDING_KEY, "1");
  } else {
    removeSessionStorageKey(GOOGLE_OAUTH_PENDING_KEY);
  }
  syncGoogleOAuthLoadingUi();
}

function isPasswordRecoveryPendingState() {
  return readSessionStorageKey(PASSWORD_RECOVERY_PENDING_KEY) === "1";
}

function setPasswordRecoveryPendingState(isPending) {
  if (isPending) {
    writeSessionStorageKey(PASSWORD_RECOVERY_PENDING_KEY, "1");
  } else {
    removeSessionStorageKey(PASSWORD_RECOVERY_PENDING_KEY);
  }
}

function resolveGoogleOAuthPendingState(user, privateRoutes = []) {
  const pending = isGoogleOAuthPendingState();
  if (!pending) {
    syncGoogleOAuthLoadingUi();
    return;
  }

  const route = String(state.route || "").trim().toLowerCase();
  const isPrivateRoute = Array.isArray(privateRoutes)
    ? privateRoutes.includes(route)
    : (privateRoutes instanceof Set ? privateRoutes.has(route) : false);
  const shouldClearForOnboarding = Boolean(user) && route === "signup" && isGoogleSignupCompletionFlow(user);
  const shouldClearForSignedInRoute = Boolean(user) && isPrivateRoute;

  if (shouldClearForOnboarding || shouldClearForSignedInRoute) {
    setGoogleOAuthPendingState(false);
    return;
  }
  syncGoogleOAuthLoadingUi();
}

function parseOAuthHashParams(hashValue) {
  const rawHash = String(hashValue || "").replace(/^#/, "").trim();
  if (!rawHash || !rawHash.includes("=")) {
    return new URLSearchParams();
  }
  return new URLSearchParams(rawHash);
}

function getOAuthCallbackParams(url) {
  const params = new URLSearchParams(url.search || "");
  const hashParams = parseOAuthHashParams(url.hash);
  hashParams.forEach((value, key) => {
    if (!params.has(key)) {
      params.set(key, value);
    }
  });
  return params;
}

function clearAuthCallbackParams() {
  let currentUrl;
  try {
    currentUrl = new URL(window.location.href);
  } catch {
    return;
  }

  let searchChanged = false;
  OAUTH_CALLBACK_QUERY_KEYS.forEach((key) => {
    if (currentUrl.searchParams.has(key)) {
      currentUrl.searchParams.delete(key);
      searchChanged = true;
    }
  });

  const hashParams = parseOAuthHashParams(currentUrl.hash);
  let hashChanged = false;
  OAUTH_CALLBACK_QUERY_KEYS.forEach((key) => {
    if (hashParams.has(key)) {
      hashParams.delete(key);
      hashChanged = true;
    }
  });
  if (hashChanged) {
    const nextHash = hashParams.toString();
    currentUrl.hash = nextHash ? `#${nextHash}` : "";
  }

  if (!searchChanged && !hashChanged) {
    return;
  }

  const query = currentUrl.searchParams.toString();
  const nextUrl = `${currentUrl.pathname}${query ? `?${query}` : ""}${currentUrl.hash || ""}`;
  window.history.replaceState(window.history.state, document.title, nextUrl);
}

async function resolveSupabaseAuthCallback(authClient) {
  if (!authClient?.auth) {
    return "none";
  }

  let callbackUrl;
  try {
    callbackUrl = new URL(window.location.href);
  } catch {
    return "none";
  }

  const callbackParams = getOAuthCallbackParams(callbackUrl);
  const hasCallbackParams = [...OAUTH_CALLBACK_QUERY_KEYS].some((key) => callbackParams.has(key));
  if (!hasCallbackParams) {
    return "none";
  }
  const callbackType = String(callbackParams.get("type") || "").trim().toLowerCase();
  const isPasswordRecoveryCallback = callbackType === "recovery";

  const rawCallbackError = callbackParams.get("error_description") || callbackParams.get("error");
  const callbackError = isPasswordRecoveryCallback
    ? decodeOAuthErrorMessage(rawCallbackError)
    : getFriendlyOAuthCallbackErrorMessage(rawCallbackError);
  if (callbackError) {
    setGoogleOAuthPendingState(false);
    if (isPasswordRecoveryCallback) {
      setPasswordRecoveryPendingState(false);
    }
    clearAuthCallbackParams();
    toast(callbackError);
    return "error";
  }

  const code = String(callbackParams.get("code") || "").trim();
  const accessToken = String(callbackParams.get("access_token") || "").trim();
  const refreshToken = String(callbackParams.get("refresh_token") || "").trim();

  let callbackFailed = false;
  if (code) {
    if (typeof authClient.auth.exchangeCodeForSession === "function") {
      const { error } = await authClient.auth.exchangeCodeForSession(code);
      if (error) {
        console.warn("Supabase OAuth callback exchange failed.", error?.message || error);
        setGoogleOAuthPendingState(false);
        if (isPasswordRecoveryCallback) {
          setPasswordRecoveryPendingState(false);
        }
        toast(
          error.message
          || (isPasswordRecoveryCallback
            ? "Password reset callback failed. Request a new reset email and try again."
            : "Google sign-in callback failed. Please try again."),
        );
        callbackFailed = true;
      }
    }
  } else if (accessToken && refreshToken) {
    if (typeof authClient.auth.setSession === "function") {
      const { error } = await authClient.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) {
        console.warn("Supabase OAuth token callback failed.", error?.message || error);
        setGoogleOAuthPendingState(false);
        if (isPasswordRecoveryCallback) {
          setPasswordRecoveryPendingState(false);
        }
        toast(
          error.message
          || (isPasswordRecoveryCallback
            ? "Password reset callback failed. Request a new reset email and try again."
            : "Google sign-in callback failed. Please try again."),
        );
        callbackFailed = true;
      }
    }
  } else {
    setGoogleOAuthPendingState(false);
    if (isPasswordRecoveryCallback) {
      setPasswordRecoveryPendingState(false);
    }
    callbackFailed = true;
  }

  if (!callbackFailed && isPasswordRecoveryCallback) {
    setGoogleOAuthPendingState(false);
    setPasswordRecoveryPendingState(true);
    state.route = "reset-password";
  } else if (!callbackFailed) {
    setPasswordRecoveryPendingState(false);
  }

  clearAuthCallbackParams();
  return callbackFailed ? "error" : "processed";
}

function getKnownAuthProviderByEmail(email) {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized) {
    return "";
  }
  const knownUser = getUsers().find((entry) => String(entry?.email || "").trim().toLowerCase() === normalized);
  return getAuthProviderFromUser(knownUser);
}

async function initSupabaseAuth() {
  supabaseAuth.initializing = true;
  if (!SUPABASE_CONFIG.enabled || !SUPABASE_CONFIG.url || !SUPABASE_CONFIG.anonKey || !window.supabase?.createClient) {
    if (isGoogleOAuthPendingState()) {
      setGoogleOAuthPendingState(false);
    }
    setPasswordRecoveryPendingState(false);
    supabaseAuth.initialized = true;
    supabaseAuth.initializing = false;
    return;
  }

  try {
    const client = getOrCreateSupabaseBrowserClient();
    if (!client) {
      setGoogleOAuthPendingState(false);
      setPasswordRecoveryPendingState(false);
      return;
    }
    supabaseAuth.client = client;
    supabaseAuth.enabled = true;
    if (supabaseSync.enabled) {
      supabaseSync.client = client;
    }

    const callbackStatus = await resolveSupabaseAuthCallback(client).catch((callbackError) => {
      console.warn("Supabase auth callback handling failed.", callbackError?.message || callbackError);
      setGoogleOAuthPendingState(false);
      setPasswordRecoveryPendingState(false);
      return "error";
    });

    let sessionResult = await runWithTimeoutResult(
      supabaseAuth.client.auth.getSession(),
      SUPABASE_SESSION_TIMEOUT_MS,
      "Supabase session bootstrap timed out.",
    );
    if (!sessionResult?.error && callbackStatus === "processed" && !sessionResult?.data?.session?.user) {
      for (let attempt = 0; attempt < 4; attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 250));
        sessionResult = await runWithTimeoutResult(
          supabaseAuth.client.auth.getSession(),
          SUPABASE_SESSION_TIMEOUT_MS,
          "Supabase session bootstrap timed out.",
        );
        if (sessionResult?.data?.session?.user || sessionResult?.error) {
          break;
        }
      }
    }
    if (!sessionResult?.error && !sessionResult?.data?.session?.user) {
      const refreshedSessionResult = await runWithTimeoutResult(
        supabaseAuth.client.auth.refreshSession().catch(() => null),
        SUPABASE_SESSION_TIMEOUT_MS,
        "Supabase session refresh timed out.",
      );
      if (refreshedSessionResult?.data?.session?.user && !refreshedSessionResult?.error) {
        sessionResult = refreshedSessionResult;
      }
    }
    const { data, error } = sessionResult;
    const bootSessionUserId = String(data?.session?.user?.id || "").trim();
    supabaseAuth.activeUserId = isUuidValue(bootSessionUserId) ? bootSessionUserId : "";
    if (error) {
      console.warn("Supabase auth session bootstrap failed.", error.message);
      setGoogleOAuthPendingState(false);
    } else if (data?.session?.user) {
      clearSupabaseSessionRecoveryRetry();
      let localUser = upsertLocalUserFromAuth(data.session.user);
      const profileSync = await refreshLocalUserFromRelationalProfile(data.session.user, localUser);
      localUser = profileSync.user;
      if (localUser?.id) {
        saveLocalOnly(STORAGE_KEYS.currentUserId, localUser.id);
      }
      const hasRecoveryFlag = isPasswordRecoveryPendingState();
      const shouldHonorRecoveryRoute = hasRecoveryFlag && (callbackStatus === "processed" || state.route === "reset-password");
      if (hasRecoveryFlag && !shouldHonorRecoveryRoute) {
        setPasswordRecoveryPendingState(false);
      }
      if (shouldHonorRecoveryRoute) {
        setGoogleOAuthPendingState(false);
        if (state.route !== "reset-password") {
          navigate("reset-password");
        } else {
          state.skipNextRouteAnimation = true;
          render();
        }
        return;
      }
      const completionRoute = getStudentProfileCompletionRoute(localUser);
      if (localUser && completionRoute) {
        setGoogleOAuthPendingState(false);
        if (state.route !== completionRoute) {
          navigate(completionRoute);
        } else {
          state.skipNextRouteAnimation = true;
          render();
        }
        return;
      }
      if (profileSync.approvalChecked && localUser && !isUserAccessApproved(localUser)) {
        setGoogleOAuthPendingState(false);
        removeStorageKey(STORAGE_KEYS.currentUserId);
        await supabaseAuth.client.auth.signOut().catch(() => { });
        toast("Your account is pending admin approval.");
        if (state.route !== "login") {
          navigate("login");
        } else {
          state.skipNextRouteAnimation = true;
          render();
        }
        return;
      } else if (localUser) {
        if (await shouldForceRefreshForUpdates(localUser)) {
          return;
        }
        schedulePostAuthDataWarmup(localUser).catch((warmupError) => {
          console.warn("Deferred post-auth warmup failed.", warmupError?.message || warmupError);
        });
      }
    } else if (isGoogleOAuthPendingState()) {
      setGoogleOAuthPendingState(false);
      if (callbackStatus === "processed") {
        toast("Google sign-in did not complete. Please tap Continue with Google again.");
      }
    }

    if (supabaseAuthStateUnsubscribe) {
      try {
        supabaseAuthStateUnsubscribe();
      } catch {
        // Ignore stale subscription cleanup errors.
      }
      supabaseAuthStateUnsubscribe = null;
    }

    const { data: authStateData } = supabaseAuth.client.auth.onAuthStateChange(async (event, session) => {
      const sessionUserId = String(session?.user?.id || "").trim();
      supabaseAuth.activeUserId = isUuidValue(sessionUserId) ? sessionUserId : "";
      if (session?.user) {
        clearSupabaseSessionRecoveryRetry();
        if (event === "TOKEN_REFRESHED") {
          return;
        }
        if (event === "PASSWORD_RECOVERY") {
          setGoogleOAuthPendingState(false);
          setPasswordRecoveryPendingState(true);
        }
        let localUser = upsertLocalUserFromAuth(session.user);
        const profileSync = await refreshLocalUserFromRelationalProfile(session.user, localUser);
        localUser = profileSync.user;
        if (localUser?.id) {
          saveLocalOnly(STORAGE_KEYS.currentUserId, localUser.id);
        }
        const hasRecoveryFlag = isPasswordRecoveryPendingState();
        const shouldHonorRecoveryRoute = event === "PASSWORD_RECOVERY" || (hasRecoveryFlag && state.route === "reset-password");
        if (hasRecoveryFlag && !shouldHonorRecoveryRoute) {
          setPasswordRecoveryPendingState(false);
        }
        if (shouldHonorRecoveryRoute) {
          if (state.route !== "reset-password") {
            navigate("reset-password");
          } else {
            state.skipNextRouteAnimation = true;
            render();
          }
          return;
        }
        const completionRoute = getStudentProfileCompletionRoute(localUser);
        if (localUser && completionRoute) {
          setGoogleOAuthPendingState(false);
          if (state.route !== completionRoute) {
            navigate(completionRoute);
          } else {
            state.skipNextRouteAnimation = true;
            render();
          }
          return;
        }
        if (profileSync.approvalChecked && localUser && !isUserAccessApproved(localUser)) {
          setGoogleOAuthPendingState(false);
          removeStorageKey(STORAGE_KEYS.currentUserId);
          if (event !== "SIGNED_OUT") {
            supabaseAuth.client.auth.signOut().catch((signOutError) => {
              console.warn("Supabase sign-out failed for pending account.", signOutError?.message || signOutError);
            });
          }
          toast("Your account is pending admin approval.");
          if (state.route !== "login") {
            navigate("login");
            return;
          }
          render();
          return;
        }
        if (event === "SIGNED_IN" && (await shouldForceRefreshForUpdates(localUser))) {
          return;
        }
        schedulePostAuthDataWarmup(localUser).catch((warmupError) => {
          console.warn("Deferred post-auth warmup failed.", warmupError?.message || warmupError);
        });
        if (["login", "signup", "forgot", "landing"].includes(state.route) && localUser) {
          const postAuthRoute = getStudentProfileCompletionRoute(localUser) || (localUser.role === "admin" ? "admin" : "dashboard");
          navigate(postAuthRoute);
          return;
        }
        state.skipNextRouteAnimation = true;
        render();
        return;
      }

      if (event === "SIGNED_OUT") {
        const preservedLocalUser = getCurrentUser();
        const skipRecovery = suppressSupabaseSignedOutRecovery;
        suppressSupabaseSignedOutRecovery = false;
        resetPostAuthWarmupRuntimeState();
        supabaseAuth.activeUserId = "";
        setGoogleOAuthPendingState(false);
        setPasswordRecoveryPendingState(false);
        const recoveredSessionUser = skipRecovery ? null : await tryRecoverSessionAfterSignedOutEvent(supabaseAuth.client);
        if (recoveredSessionUser) {
          clearSupabaseSessionRecoveryRetry();
          const recoveredSessionUserId = String(recoveredSessionUser.id || "").trim();
          supabaseAuth.activeUserId = isUuidValue(recoveredSessionUserId) ? recoveredSessionUserId : "";
          let recoveredLocalUser = upsertLocalUserFromAuth(recoveredSessionUser);
          const recoveredProfileSync = await refreshLocalUserFromRelationalProfile(recoveredSessionUser, recoveredLocalUser);
          recoveredLocalUser = recoveredProfileSync.user;
          if (recoveredLocalUser?.id) {
            saveLocalOnly(STORAGE_KEYS.currentUserId, recoveredLocalUser.id);
          }
          state.skipNextRouteAnimation = true;
          render();
          return;
        }
        const shouldPreserveLocalSession = Boolean(preservedLocalUser?.id) && hasSupabaseManagedIdentity(preservedLocalUser);
        if (shouldPreserveLocalSession) {
          clearNotificationRealtimeSubscription();
          clearSessionRealtimeSubscription();
          clearProfileAccessRealtimeSubscription();
          clearStudentAccessPolling();
          clearAdminPresencePolling();
          clearAdminDashboardPolling();
          syncPresenceRuntime(null);
          resetSiteActivityRuntime();
          relationalSync.enabled = false;
          relationalSync.readyCheckedAt = 0;
          relationalSync.readyPromise = null;
          relationalSync.lastReadyError = "Cloud session was interrupted. Retrying automatically while your local session stays active.";
          relationalSync.lastFailureAt = Date.now();
          relationalSync.lastFailureMessage = relationalSync.lastReadyError;
          relationalSync.retryAt = Date.now() + RELATIONAL_RETRY_FLUSH_MS;
          supabaseSync.lastFailureAt = Date.now();
          supabaseSync.lastFailureMessage = "Cloud session was interrupted. Changes stay local until reconnection succeeds.";
          supabaseSync.retryAt = Date.now() + SUPABASE_RETRY_FLUSH_MS;
          scheduleSyncStatusUiRefresh();
          scheduleSupabaseSessionRecoveryRetry();
          state.skipNextRouteAnimation = true;
          render();
          return;
        }
        clearNotificationRealtimeSubscription();
        clearSessionRealtimeSubscription();
        clearProfileAccessRealtimeSubscription();
        clearStudentAccessPolling();
        clearSupabaseSessionRecoveryRetry();
        resetRelationalSyncState();
        resetSupabaseSyncRuntimeState();
        clearAdminPresencePolling();
        clearAdminDashboardPolling();
        syncPresenceRuntime(null);
        resetSiteActivityRuntime();
        state.adminDataRefreshing = false;
        state.adminDataLastSyncAt = 0;
        state.adminDataSyncError = "";
        state.adminForceRefreshRunning = false;
        state.adminPresenceLoading = false;
        state.adminPresenceError = "";
        state.adminPresenceRows = [];
        state.adminPresenceLastSyncAt = 0;
        removeStorageKey(STORAGE_KEYS.currentUserId);
        const privateRoutes = new Set([
          "complete-profile",
          "dashboard",
          "notifications",
          "create-test",
          "qbank",
          "builder",
          "session",
          "review",
          "analytics",
          "profile",
          "admin",
        ]);
        if (privateRoutes.has(state.route)) {
          navigate("login");
          return;
        }
        render();
      }
    });
    const subscription = authStateData?.subscription;
    if (subscription && typeof subscription.unsubscribe === "function") {
      supabaseAuthStateUnsubscribe = () => subscription.unsubscribe();
    }
  } catch (error) {
    console.warn("Supabase auth unavailable. Falling back to local auth only.", error);
    setGoogleOAuthPendingState(false);
    setPasswordRecoveryPendingState(false);
    clearNotificationRealtimeSubscription();
    clearSessionRealtimeSubscription();
    clearProfileAccessRealtimeSubscription();
    clearStudentAccessPolling();
    supabaseAuth.enabled = false;
    supabaseAuth.client = null;
    supabaseAuth.activeUserId = "";
  } finally {
    supabaseAuth.initialized = true;
    supabaseAuth.initializing = false;
  }
}

async function tryRecoverSessionAfterSignedOutEvent(authClient) {
  if (!authClient?.auth) {
    return null;
  }
  for (let attempt = 0; attempt < SUPABASE_SIGNED_OUT_RECOVERY_ATTEMPTS; attempt += 1) {
    const sessionResult = await runWithTimeoutResult(
      authClient.auth.getSession().catch(() => ({ data: { session: null } })),
      SUPABASE_SIGNED_OUT_RECOVERY_TIMEOUT_MS,
      "Supabase session recovery timed out.",
    );
    const sessionUser = sessionResult?.data?.session?.user || null;
    if (sessionUser) {
      return sessionUser;
    }

    const refreshToken = String(sessionResult?.data?.session?.refresh_token || "").trim();
    await runWithTimeoutResult(
      refreshToken
        ? authClient.auth.refreshSession({ refresh_token: refreshToken }).catch(() => null)
        : authClient.auth.refreshSession().catch(() => null),
      SUPABASE_SIGNED_OUT_RECOVERY_TIMEOUT_MS,
      "Supabase session refresh timed out.",
    );

    if (attempt < SUPABASE_SIGNED_OUT_RECOVERY_ATTEMPTS - 1) {
      await new Promise((resolve) => window.setTimeout(resolve, SUPABASE_SIGNED_OUT_RECOVERY_DELAY_MS));
    }
  }
  return null;
}

function runWithTimeoutResult(promise, timeoutMs, timeoutMessage) {
  let timeoutId = null;
  const fallback = {
    data: null,
    error: {
      code: "TIMEOUT",
      message: timeoutMessage,
    },
  };
  return Promise.race([
    Promise.resolve(promise),
    new Promise((resolve) => {
      timeoutId = window.setTimeout(() => {
        resolve(fallback);
      }, Math.max(1, Number(timeoutMs) || 1));
    }),
  ]).finally(() => {
    if (timeoutId) {
      window.clearTimeout(timeoutId);
    }
  });
}

function isTimeoutResultError(error) {
  return String(error?.code || "").trim().toUpperCase() === "TIMEOUT";
}

async function fetchWithTimeout(resource, options = {}, timeoutMs = ADMIN_REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => {
    controller.abort();
  }, Math.max(1, Number(timeoutMs) || 1));
  try {
    return await fetch(resource, {
      ...options,
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw {
        code: "TIMEOUT",
        message: "Request timed out.",
      };
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function buildBootstrapProfileRowFromAuth(authUser, fallbackUser = null) {
  const profileId = String(authUser?.id || "").trim();
  if (!isUuidValue(profileId)) {
    return null;
  }
  const email = String(authUser?.email || fallbackUser?.email || "").trim().toLowerCase();
  if (!email) {
    return null;
  }
  const fallbackName = email.includes("@") ? email.split("@")[0] : "Student";
  const metadataYear = normalizeAcademicYearOrNull(
    authUser?.user_metadata?.academic_year
    ?? authUser?.user_metadata?.academicYear
    ?? fallbackUser?.academicYear
    ?? null,
  );
  const metadataSemester = normalizeAcademicSemesterOrNull(
    authUser?.user_metadata?.academic_semester
    ?? authUser?.user_metadata?.academicSemester
    ?? fallbackUser?.academicSemester
    ?? null,
  );
  const rawPhone = String(
    authUser?.user_metadata?.phone_number
    ?? authUser?.user_metadata?.phone
    ?? fallbackUser?.phone
    ?? "",
  ).trim();
  const phoneValidation = validateAndNormalizePhoneNumber(rawPhone);
  const normalizedPhone = phoneValidation.ok ? phoneValidation.number : "";
  const role = isForcedAdminEmail(email) ? "admin" : "student";
  const approved = role === "admin"
    ? true
    : shouldAutoApproveStudentAccess({
      role: "student",
      phone: normalizedPhone,
      academicYear: metadataYear,
      academicSemester: metadataSemester,
    });

  return {
    id: profileId,
    full_name: String(authUser?.user_metadata?.full_name || fallbackUser?.name || fallbackName).trim() || fallbackName,
    email,
    phone: normalizedPhone || null,
    role,
    approved,
    academic_year: role === "student" ? metadataYear : null,
    academic_semester: role === "student" ? metadataSemester : null,
    auth_provider: normalizeAuthProvider(
      getAuthProviderFromAuthUser(authUser)
      || fallbackUser?.authProvider
      || authUser?.app_metadata?.provider
      || "",
    ) || null,
  };
}

async function bootstrapRelationalProfileFromAuth(authUser, fallbackUser = null) {
  const client = getRelationalClient();
  if (!client) {
    return null;
  }
  const profileRow = buildBootstrapProfileRowFromAuth(authUser, fallbackUser);
  if (!profileRow) {
    return null;
  }

  const { error: upsertError } = await client.from("profiles").upsert([profileRow], { onConflict: "id" });
  if (upsertError) {
    return null;
  }

  const profileResult = await runWithTimeoutResult(
    client
      .from("profiles")
      .select("id,full_name,email,phone,role,approved,academic_year,academic_semester,auth_provider,created_at")
      .eq("id", profileRow.id)
      .maybeSingle(),
    PROFILE_LOOKUP_TIMEOUT_MS,
    "Profile lookup timed out.",
  );
  if (profileResult?.error || !profileResult?.data) {
    return null;
  }
  return profileResult.data;
}

async function refreshLocalUserFromRelationalProfile(authUser, fallbackUser = null) {
  if (!authUser?.id) {
    return { user: fallbackUser, approvalChecked: false };
  }

  const localUser = fallbackUser || upsertLocalUserFromAuth(authUser);
  const client = getRelationalClient();
  if (!client) {
    return { user: localUser, approvalChecked: false };
  }

  const profileResult = await runWithTimeoutResult(
    client
      .from("profiles")
      .select("id,full_name,email,phone,role,approved,academic_year,academic_semester,auth_provider,created_at")
      .eq("id", authUser.id)
      .maybeSingle(),
    PROFILE_LOOKUP_TIMEOUT_MS,
    "Profile lookup timed out.",
  );
  let profile = profileResult?.data || null;
  const error = profileResult?.error || null;
  if (!error && !profile) {
    profile = await bootstrapRelationalProfileFromAuth(authUser, localUser).catch(() => null);
  }
  if (error || !profile) {
    return { user: localUser, approvalChecked: false };
  }

  const role = String(profile.role || "student") === "admin" ? "admin" : "student";
  const profileYear = normalizeAcademicYearOrNull(profile.academic_year);
  const profileSemester = normalizeAcademicSemesterOrNull(profile.academic_semester);
  const fallbackYear = normalizeAcademicYearOrNull(
    localUser?.academicYear
    ?? authUser?.user_metadata?.academic_year
    ?? authUser?.user_metadata?.academicYear
    ?? null,
  );
  const fallbackSemester = normalizeAcademicSemesterOrNull(
    localUser?.academicSemester
    ?? authUser?.user_metadata?.academic_semester
    ?? authUser?.user_metadata?.academicSemester
    ?? null,
  );
  const profileAuthProvider = normalizeAuthProvider(profile.auth_provider);
  const year = role === "student" ? (profileYear ?? fallbackYear) : null;
  const semester = role === "student" ? (profileSemester ?? fallbackSemester) : null;
  const normalizedEmail = String(profile.email || authUser.email || localUser?.email || "").trim().toLowerCase();
  const metadataPhone = String(
    authUser?.user_metadata?.phone
    || authUser?.user_metadata?.phone_number
    || "",
  ).trim();
  const profilePhone = String(profile.phone || "").trim();
  const fallbackPhone = String(localUser?.phone || "").trim();
  const resolvedPhone = profilePhone || metadataPhone || fallbackPhone;
  const profileApproved = typeof profile.approved === "boolean" ? profile.approved : null;
  const localApproval = typeof localUser?.isApproved === "boolean" ? localUser.isApproved : null;
  const autoApprovalFallback = shouldAutoApproveStudentAccess({
    role,
    phone: String(profile.phone || localUser?.phone || "").trim(),
    academicYear: normalizeAcademicYearOrNull(profile.academic_year ?? localUser?.academicYear),
    academicSemester: normalizeAcademicSemesterOrNull(profile.academic_semester ?? localUser?.academicSemester),
  });
  const resolvedApproval = role === "admin"
    ? true
    : (
      profileApproved !== null
        ? profileApproved
        : localApproval !== null
          ? localApproval
          : autoApprovalFallback
    );
  const profileHasStudentCompletion = role !== "student"
    ? true
    : validateAndNormalizePhoneNumber(resolvedPhone).ok && Number(year) >= 1 && Number(semester) >= 1;
  const authProvider = normalizeAuthProvider(profileAuthProvider || localUser?.authProvider || getAuthProviderFromAuthUser(authUser));
  let nextProfileCompleted = role !== "student";
  if (role === "student") {
    if (profileHasStudentCompletion) {
      nextProfileCompleted = true;
    } else if (typeof localUser?.profileCompleted === "boolean") {
      nextProfileCompleted = localUser.profileCompleted;
    } else {
      nextProfileCompleted = false;
    }
  }

  const updatedUser = upsertLocalUserFromAuth(authUser, {
    name: String(profile.full_name || "").trim() || localUser?.name || "Student",
    email: normalizedEmail,
    phone: resolvedPhone,
    role,
    academicYear: year,
    academicSemester: semester,
    isApproved: resolvedApproval,
    approvedAt: resolvedApproval ? localUser?.approvedAt || profile.created_at || nowISO() : null,
    approvedBy: resolvedApproval ? localUser?.approvedBy || "admin" : null,
    authProvider,
    verified: Boolean(authUser.email_confirmed_at || authUser.confirmed_at || localUser?.verified || false),
    profileCompleted: nextProfileCompleted,
  });

  const shouldBackfillProfilePhone = role === "student"
    && profilePhone !== resolvedPhone
    && Boolean(resolvedPhone);
  if (shouldBackfillProfilePhone) {
    client
      .from("profiles")
      .update({ phone: resolvedPhone })
      .eq("id", authUser.id)
      .then(({ error: patchError }) => {
        if (patchError) {
          console.warn("Could not backfill profile phone.", patchError.message || patchError);
          return;
        }
        const currentLocal = getCurrentUser();
        if (!currentLocal || getUserProfileId(currentLocal) !== authUser.id) {
          return;
        }
        syncUserCourseEnrollmentsToRelational([updatedUser], {
          assignedByAuthId: isUuidValue(currentLocal?.supabaseAuthId) ? currentLocal.supabaseAuthId : null,
        }).catch((syncError) => {
          if (!isMissingRelationError(syncError)) {
            console.warn("Could not sync enrollment rows after profile phone backfill.", syncError?.message || syncError);
          }
        });
      })
      .catch((patchError) => {
        console.warn("Could not backfill profile phone.", patchError?.message || patchError);
      });
  }
  return { user: updatedUser, approvalChecked: true };
}

function getSupabaseAuthClient() {
  if (!supabaseAuth.enabled || !supabaseAuth.client) {
    return null;
  }
  return supabaseAuth.client;
}

function isUserAccessApproved(user) {
  if (!user) {
    return false;
  }
  if (user.role === "admin") {
    return true;
  }
  if (user.role === "student" && !hasCompleteStudentProfile(user)) {
    return false;
  }
  return user.isApproved !== false;
}

function getAuthProviderFromAuthUser(authUser) {
  const appProviders = Array.isArray(authUser?.app_metadata?.providers)
    ? authUser.app_metadata.providers.map((provider) => String(provider || "").trim().toLowerCase()).filter(Boolean)
    : [];
  if (appProviders.includes("google")) {
    return "google";
  }

  const identityProviders = Array.isArray(authUser?.identities)
    ? authUser.identities.map((identity) => String(identity?.provider || "").trim().toLowerCase()).filter(Boolean)
    : [];
  if (identityProviders.includes("google")) {
    return "google";
  }

  const appProvider = String(authUser?.app_metadata?.provider || "").trim().toLowerCase();
  if (appProvider) {
    return appProvider;
  }
  if (identityProviders.length) {
    return identityProviders[0];
  }
  return "";
}

function normalizeAuthProvider(value) {
  return String(value || "").trim().toLowerCase();
}

function getAuthProviderFromUser(user) {
  return normalizeAuthProvider(user?.authProvider);
}

function normalizePhoneInput(rawPhone) {
  const trimmed = String(rawPhone || "").trim();
  if (!trimmed) {
    return "";
  }
  const compact = trimmed.replace(/[^\d+]/g, "");
  if (!compact) {
    return "";
  }
  if (compact.startsWith("+")) {
    return `+${compact.slice(1).replace(/\D/g, "")}`;
  }
  return compact.replace(/\D/g, "");
}

function getPhoneCountryRuleByDigits(digitsWithCountryCode) {
  const digits = String(digitsWithCountryCode || "");
  const matchedCode = PHONE_COUNTRY_CODES_DESC.find((code) => digits.startsWith(code));
  if (!matchedCode) {
    return null;
  }
  const rule = PHONE_COUNTRY_RULES.find((entry) => entry.code === matchedCode);
  if (!rule) {
    return null;
  }
  return {
    ...rule,
    nationalNumber: digits.slice(matchedCode.length),
  };
}

function validateAndNormalizePhoneNumber(rawPhone) {
  const normalized = normalizePhoneInput(rawPhone);
  if (!normalized) {
    return { ok: false, message: "Phone number is required.", number: "" };
  }

  if (normalized.startsWith("01")) {
    if (!/^01(0|1|2|5)\d{8}$/.test(normalized)) {
      return {
        ok: false,
        message: "Egypt phone format is invalid. Use 01XXXXXXXXX, +20XXXXXXXXXX, or 0020XXXXXXXXXX.",
        number: "",
      };
    }
    return {
      ok: true,
      message: "",
      number: `+20${normalized.slice(1)}`,
      country: "Egypt",
    };
  }

  let international = normalized;
  if (international.startsWith("00")) {
    international = `+${international.slice(2)}`;
  }
  if (!international.startsWith("+")) {
    return {
      ok: false,
      message: "Use an international format (+countrycode...) or Egypt mobile format starting with 01.",
      number: "",
    };
  }

  const digits = international.slice(1);
  if (!/^\d{8,15}$/.test(digits)) {
    return {
      ok: false,
      message: "Phone number must be in a valid international format with 8 to 15 digits.",
      number: "",
    };
  }

  const countryRule = getPhoneCountryRuleByDigits(digits);
  if (countryRule && !countryRule.pattern.test(countryRule.nationalNumber)) {
    return {
      ok: false,
      message: `Phone number format is invalid for ${countryRule.country}.`,
      number: "",
    };
  }

  return {
    ok: true,
    message: "",
    number: `+${digits}`,
    country: countryRule?.country || "International",
  };
}

function hasCompleteStudentProfile(user) {
  if (!user) {
    return false;
  }
  if (user.role !== "student") {
    return true;
  }
  const phoneValidation = validateAndNormalizePhoneNumber(String(user.phone || ""));
  const year = Number(user.academicYear);
  const semester = Number(user.academicSemester);
  return phoneValidation.ok && year >= 1 && year <= 5 && (semester === 1 || semester === 2);
}

function normalizeAdminUserIdList(ids, allowedSet = null) {
  const allowed = allowedSet instanceof Set ? allowedSet : null;
  return [...new Set(
    (Array.isArray(ids) ? ids : [])
      .map((id) => String(id || "").trim())
      .filter((id) => id && (!allowed || allowed.has(id))),
  )];
}

function canBulkSelectAdminUser(account, actorUser = null) {
  if (!account) {
    return false;
  }
  const accountId = String(account.id || "").trim();
  const actorId = String(actorUser?.id || "").trim();
  if (!accountId) {
    return false;
  }
  if (String(account.role || "").trim().toLowerCase() === "admin") {
    return false;
  }
  if (actorId && accountId === actorId) {
    return false;
  }
  return true;
}

function matchesAdminUserFilters(account, filters = {}) {
  if (!account) {
    return false;
  }
  const normalizedSearch = String(filters?.search || "").trim().toLowerCase();
  const targetYear = normalizeAcademicYearOrNull(filters?.year);
  const targetSemester = normalizeAcademicSemesterOrNull(filters?.semester);
  const role = String(account.role || "").trim().toLowerCase();
  const year = role === "student" ? normalizeAcademicYearOrNull(account.academicYear) : null;
  const semester = role === "student" ? normalizeAcademicSemesterOrNull(account.academicSemester) : null;

  if (targetYear !== null && year !== targetYear) {
    return false;
  }
  if (targetSemester !== null && semester !== targetSemester) {
    return false;
  }
  if (!normalizedSearch) {
    return true;
  }

  const searchableParts = [
    account.name,
    account.email,
    account.phone,
    role,
    year !== null ? String(year) : "",
    year !== null ? `year ${year}` : "",
    semester !== null ? String(semester) : "",
    semester !== null ? `semester ${semester}` : "",
  ];
  return searchableParts.some((part) => String(part || "").trim().toLowerCase().includes(normalizedSearch));
}

function isAutoApproveStudentAccessEnabled() {
  const savedSetting = load(STORAGE_KEYS.autoApproveStudentAccess, null);
  if (typeof savedSetting === "boolean") {
    return savedSetting;
  }
  return DEFAULT_AUTO_APPROVE_STUDENT_ACCESS;
}

function normalizeSiteMaintenanceConfig(rawValue) {
  const value = rawValue && typeof rawValue === "object" && !Array.isArray(rawValue) ? rawValue : {};
  const allowedUserIds = [...new Set(
    (Array.isArray(value.allowedUserIds) ? value.allowedUserIds : [])
      .map((entry) => String(entry || "").trim())
      .filter(Boolean),
  )];
  return {
    enabled: Boolean(value.enabled),
    title: String(value.title || "").trim() || DEFAULT_SITE_MAINTENANCE_TITLE,
    message: String(value.message || "").trim() || DEFAULT_SITE_MAINTENANCE_MESSAGE,
    allowedUserIds,
    updatedAt: String(value.updatedAt || "").trim(),
    updatedById: String(value.updatedById || "").trim(),
    updatedByName: String(value.updatedByName || "").trim(),
  };
}

function getSiteMaintenanceConfig() {
  return normalizeSiteMaintenanceConfig(load(STORAGE_KEYS.siteMaintenance, null));
}

function isSiteMaintenanceEnabled() {
  return getSiteMaintenanceConfig().enabled;
}

function isUserAllowedDuringSiteMaintenance(user = null, config = null) {
  const currentUser = user || getCurrentUser();
  if (!currentUser || currentUser.role === "admin") {
    return currentUser?.role === "admin";
  }
  const settings = config || getSiteMaintenanceConfig();
  const allowedIds = new Set(
    (Array.isArray(settings?.allowedUserIds) ? settings.allowedUserIds : [])
      .map((entry) => String(entry || "").trim())
      .filter(Boolean),
  );
  if (!allowedIds.size) {
    return false;
  }
  const candidateIds = [
    String(getUserProfileId(currentUser) || "").trim(),
    String(currentUser.id || "").trim(),
  ].filter(Boolean);
  return candidateIds.some((entry) => allowedIds.has(entry));
}

function isSiteMaintenanceEnabledForUser(user = null) {
  const currentUser = user || getCurrentUser();
  return isSiteMaintenanceEnabled() && currentUser?.role !== "admin" && !isUserAllowedDuringSiteMaintenance(currentUser);
}

function canBypassSiteMaintenanceForRoute(route, user = null) {
  const currentUser = user || getCurrentUser();
  if (currentUser?.role === "admin") {
    return true;
  }
  const normalizedRoute = String(route || "").trim().toLowerCase();
  return normalizedRoute === "login" || normalizedRoute === "forgot" || normalizedRoute === "reset-password";
}

function shouldShowSiteMaintenanceGate(user = null, route = state.route) {
  return isSiteMaintenanceEnabledForUser(user) && !canBypassSiteMaintenanceForRoute(route, user);
}

function resolveHydratedSiteMaintenanceConfig(remotePayload, options = {}) {
  const localConfig = getSiteMaintenanceConfig();
  const remoteConfig = normalizeSiteMaintenanceConfig(remotePayload);
  const localUpdatedAtMs = parseTimestampMs(localConfig.updatedAt);
  const remoteUpdatedAtMs = parseTimestampMs(remoteConfig.updatedAt);
  const hasPendingWrite = Boolean(options?.hasPendingWrite);
  const localSignature = JSON.stringify(localConfig);
  const remoteSignature = JSON.stringify(remoteConfig);
  if (localSignature === remoteSignature) {
    return { config: remoteConfig, shouldResync: false };
  }
  if (hasPendingWrite) {
    return { config: localConfig, shouldResync: false };
  }
  if (remoteUpdatedAtMs > localUpdatedAtMs) {
    return { config: remoteConfig, shouldResync: false };
  }
  if (localUpdatedAtMs > remoteUpdatedAtMs) {
    return { config: localConfig, shouldResync: true };
  }
  if (!localUpdatedAtMs && !remoteUpdatedAtMs) {
    const defaultSignature = JSON.stringify(normalizeSiteMaintenanceConfig(null));
    return {
      config: localSignature === defaultSignature ? remoteConfig : localConfig,
      shouldResync: localSignature !== defaultSignature,
    };
  }
  return { config: localConfig, shouldResync: false };
}

function shouldAutoApproveStudentAccess(user) {
  if (!isAutoApproveStudentAccessEnabled() || !user || user.role !== "student") {
    return false;
  }
  return hasCompleteStudentProfile(user);
}

function parseTimestampMs(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return 0;
  }
  const directParsed = Date.parse(raw);
  if (Number.isFinite(directParsed)) {
    return directParsed;
  }

  const match = raw.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})(\.\d+)?([+-]\d{2}(?::?\d{2})?|Z)?$/i);
  if (!match) {
    return 0;
  }

  const datePart = match[1];
  const timePart = match[2];
  const fractionPart = match[3] || "";
  const timezonePart = String(match[4] || "Z").toUpperCase();
  const milliseconds = fractionPart ? `.${fractionPart.slice(1, 4).padEnd(3, "0")}` : "";

  let normalizedTimezone = timezonePart;
  if (normalizedTimezone !== "Z") {
    if (/^[+-]\d{2}$/.test(normalizedTimezone)) {
      normalizedTimezone = `${normalizedTimezone}:00`;
    } else if (/^[+-]\d{4}$/.test(normalizedTimezone)) {
      normalizedTimezone = `${normalizedTimezone.slice(0, 3)}:${normalizedTimezone.slice(3)}`;
    }
  }

  const normalized = `${datePart}T${timePart}${milliseconds}${normalizedTimezone}`;
  const normalizedParsed = Date.parse(normalized);
  return Number.isFinite(normalizedParsed) ? normalizedParsed : 0;
}

function getUserCreatedAtMs(user) {
  return parseTimestampMs(user?.createdAt || user?.created_at || "");
}

function getRegistrationYearFromUser(user) {
  const createdAtMs = getUserCreatedAtMs(user);
  if (!Number.isFinite(createdAtMs) || createdAtMs <= 0) {
    return null;
  }
  const year = new Date(createdAtMs).getUTCFullYear();
  if (!Number.isFinite(year) || year < 1970 || year > 3000) {
    return null;
  }
  return year;
}

function classifyAuthProviderForStats(user) {
  const provider = normalizeAuthProvider(getAuthProviderFromUser(user));
  if (!provider) {
    return String(user?.email || "").trim() ? "email" : "unknown";
  }
  if (provider === "google" || provider.includes("google")) {
    return "google";
  }
  if (
    provider === "email"
    || provider === "password"
    || provider.includes("email")
    || provider.includes("password")
  ) {
    return "email";
  }
  return provider;
}

function formatAuthProviderLabel(provider) {
  const normalized = normalizeAuthProvider(provider);
  if (!normalized || normalized === "unknown") {
    return "Unknown";
  }
  if (normalized === "google") {
    return "Google";
  }
  if (normalized === "email") {
    return "Email";
  }
  return normalized
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildAdminUserStatistics(users = []) {
  const accounts = Array.isArray(users) ? users : [];
  const currentYear = new Date().getUTCFullYear();
  const registrationByYearMap = new Map();
  const providerCounts = new Map([
    ["google", 0],
    ["email", 0],
    ["unknown", 0],
  ]);
  let thisYearRegistrations = 0;
  let lastYearRegistrations = 0;

  accounts.forEach((user) => {
    const registrationYear = getRegistrationYearFromUser(user);
    if (registrationYear !== null) {
      registrationByYearMap.set(
        registrationYear,
        (registrationByYearMap.get(registrationYear) || 0) + 1,
      );
      if (registrationYear === currentYear) {
        thisYearRegistrations += 1;
      } else if (registrationYear === currentYear - 1) {
        lastYearRegistrations += 1;
      }
    }

    const providerKey = classifyAuthProviderForStats(user);
    providerCounts.set(providerKey, (providerCounts.get(providerKey) || 0) + 1);
  });

  const registrationByYear = [...registrationByYearMap.entries()]
    .map(([year, count]) => ({
      year: Number(year),
      count: Number(count) || 0,
    }))
    .sort((a, b) => b.year - a.year);
  const maxRegistrationYearCount = registrationByYear.reduce(
    (max, entry) => Math.max(max, Number(entry?.count) || 0),
    0,
  );

  const providerBreakdown = [...providerCounts.entries()]
    .map(([provider, count]) => ({
      provider,
      count: Number(count) || 0,
      label: formatAuthProviderLabel(provider),
    }))
    .filter(
      (entry) => entry.count > 0 || entry.provider === "google" || entry.provider === "email",
    )
    .sort((a, b) => b.count - a.count || String(a.label).localeCompare(String(b.label)));
  const maxProviderCount = providerBreakdown.reduce(
    (max, entry) => Math.max(max, Number(entry?.count) || 0),
    0,
  );

  const googleCount = providerCounts.get("google") || 0;
  const emailCount = providerCounts.get("email") || 0;
  const unknownProviderCount = providerCounts.get("unknown") || 0;
  const otherProviderCount = providerBreakdown
    .filter((entry) => !["google", "email", "unknown"].includes(entry.provider))
    .reduce((sum, entry) => sum + entry.count, 0);

  return {
    currentYear,
    thisYearRegistrations,
    lastYearRegistrations,
    googleCount,
    emailCount,
    otherProviderCount,
    unknownProviderCount,
    registrationByYear,
    providerBreakdown,
    maxRegistrationYearCount,
    maxProviderCount,
  };
}

function isStudentProfileCompletionRequired(user) {
  if (!user || user.role !== "student") {
    return false;
  }
  if (isUserAccessApproved(user)) {
    return false;
  }
  return !hasCompleteStudentProfile(user);
}

function getStudentProfileCompletionRoute(user) {
  if (!isStudentProfileCompletionRequired(user)) {
    return "";
  }
  return getAuthProviderFromUser(user) === "google" ? "signup" : "complete-profile";
}

function isGoogleOnboardingRequired(user) {
  return getStudentProfileCompletionRoute(user) === "signup";
}

function isGoogleSignupCompletionFlow(user) {
  if (!user) {
    return false;
  }
  if (getAuthProviderFromUser(user) !== "google") {
    return false;
  }
  if (!hasSupabaseManagedIdentity(user)) {
    return false;
  }
  return getStudentProfileCompletionRoute(user) === "signup";
}

function getUserProfileId(user) {
  const authId = String(user?.supabaseAuthId || "").trim();
  if (isUuidValue(authId)) {
    return authId;
  }
  const legacyId = String(user?.id || "").trim();
  if (isUuidValue(legacyId)) {
    return legacyId;
  }
  return "";
}

function getActiveSupabaseAuthUserId() {
  const authId = String(supabaseAuth.activeUserId || "").trim();
  return isUuidValue(authId) ? authId : "";
}

function hasActiveSupabaseSessionForUser(user = null) {
  const currentUser = user || getCurrentUser();
  const activeAuthId = getActiveSupabaseAuthUserId();
  const profileId = String(getUserProfileId(currentUser) || "").trim();
  if (!isUuidValue(activeAuthId) || !isUuidValue(profileId)) {
    return false;
  }
  return activeAuthId === profileId;
}

function getCurrentSessionProfileId(user = null) {
  const activeAuthId = getActiveSupabaseAuthUserId();
  if (activeAuthId) {
    return activeAuthId;
  }
  const fallbackProfileId = String(getUserProfileId(user || getCurrentUser()) || "").trim();
  return isUuidValue(fallbackProfileId) ? fallbackProfileId : "";
}

function hasSupabaseManagedIdentity(user) {
  return Boolean(getUserProfileId(user));
}

function canUseLocalPasswordFallback(user) {
  return Boolean(user) && !hasSupabaseManagedIdentity(user);
}

function shouldAllowSupabaseManagedLocalFallback(error) {
  if (!error) {
    return false;
  }
  if (isLikelyNetworkFetchError(error) || isTimeoutResultError(error)) {
    return true;
  }
  const message = getErrorMessage(error, "").toLowerCase();
  return message.includes("timed out")
    || message.includes("unavailable")
    || message.includes("failed to fetch")
    || message.includes("network")
    || message.includes("load failed")
    || message.includes("could not verify supabase session")
    || message.includes("supabase auth client is not available")
    || message.includes("supabase relational client is not available")
    || message.includes("relational database sync is unavailable")
    || message.includes("admin delete api is unavailable")
    || message.includes("admin password api is unavailable")
    || message.includes("no active supabase session")
    || message.includes("session expired");
}

function isForcedAdminEmail(email) {
  return FORCED_ADMIN_EMAILS.has(String(email || "").trim().toLowerCase());
}

function isLegacyDemoUser(user) {
  const id = String(user?.id || "").trim();
  const email = String(user?.email || "").trim().toLowerCase();
  return id === "u_admin" || id === "u_student" || email === DEMO_ADMIN_EMAIL || email === DEMO_STUDENT_EMAIL;
}

function upsertLocalUserFromAuth(authUser, profileOverrides = {}) {
  if (!authUser?.id) {
    return null;
  }

  const users = getUsers();
  const email = String(authUser.email || profileOverrides.email || "").trim().toLowerCase();
  if (!email) {
    return null;
  }

  const indexByAuthId = users.findIndex((entry) => entry.supabaseAuthId === authUser.id);
  const indexByLegacyId = users.findIndex((entry) => !entry.supabaseAuthId && entry.id === authUser.id);
  const indexByEmail = users.findIndex((entry) => entry.email.toLowerCase() === email);
  const idx = indexByAuthId >= 0 ? indexByAuthId : (indexByLegacyId >= 0 ? indexByLegacyId : indexByEmail);
  const previous = idx >= 0 ? users[idx] : null;

  const fallbackName = email.includes("@") ? email.split("@")[0] : "Student";
  const nextName = String(profileOverrides.name || authUser.user_metadata?.full_name || previous?.name || fallbackName).trim();
  const nextRole = isForcedAdminEmail(email)
    ? "admin"
    : (previous?.role || profileOverrides.role || "student") === "admin"
      ? "admin"
      : "student";
  const nextPhone = String(profileOverrides.phone || authUser.user_metadata?.phone_number || previous?.phone || "").trim();
  const nextAuthProvider = normalizeAuthProvider(
    profileOverrides.authProvider || getAuthProviderFromAuthUser(authUser) || previous?.authProvider || "",
  );

  const nextYearInput = profileOverrides.academicYear
    ?? previous?.academicYear
    ?? authUser.user_metadata?.academic_year
    ?? null;
  const nextSemesterInput = profileOverrides.academicSemester
    ?? previous?.academicSemester
    ?? authUser.user_metadata?.academic_semester
    ?? null;
  const nextYear = nextRole === "student" ? normalizeAcademicYearOrNull(nextYearInput) : null;
  const nextSemester = nextRole === "student" ? normalizeAcademicSemesterOrNull(nextSemesterInput) : null;

  let nextCourses;
  if (nextRole === "student") {
    const overrideCourses = Array.isArray(profileOverrides.assignedCourses) ? profileOverrides.assignedCourses : [];
    const metadataCourses = Array.isArray(authUser?.user_metadata?.assigned_courses)
      ? authUser.user_metadata.assigned_courses
      : (Array.isArray(authUser?.user_metadata?.assignedCourses) ? authUser.user_metadata.assignedCourses : []);
    const previousCourses = Array.isArray(previous?.assignedCourses) ? previous.assignedCourses : [];
    const requestedCourses = overrideCourses.length
      ? overrideCourses
      : previousCourses.length
        ? previousCourses
        : metadataCourses;
    if (nextYear !== null && nextSemester !== null) {
      const allowedCourses = getCurriculumCourses(nextYear, nextSemester);
      nextCourses = sanitizeCourseAssignments(requestedCourses.filter((course) => allowedCourses.includes(course)));
      if (!nextCourses.length) {
        nextCourses = [...allowedCourses];
      }
    } else {
      nextCourses = sanitizeCourseAssignments(requestedCourses);
    }
  } else {
    const allCourses = Object.keys(QBANK_COURSE_TOPICS);
    nextCourses = sanitizeCourseAssignments(previous?.assignedCourses || allCourses);
    if (!nextCourses.length) {
      nextCourses = [...allCourses];
    }
  }

  const shouldAutoApproveNextStudent = shouldAutoApproveStudentAccess({
    role: nextRole,
    phone: nextPhone,
    academicYear: nextYear,
    academicSemester: nextSemester,
  });
  const hasExplicitIsApprovedOverride = typeof profileOverrides.isApproved === "boolean";
  const nextIsApproved =
    nextRole === "admin"
      ? true
      : hasExplicitIsApprovedOverride
        ? profileOverrides.isApproved
        : (typeof previous?.isApproved === "boolean" && previous.isApproved === false && shouldAutoApproveNextStudent)
          ? true
          : typeof previous?.isApproved === "boolean"
            ? previous.isApproved
            : shouldAutoApproveNextStudent;
  const inferredStudentProfileCompletion = nextRole !== "student"
    ? true
    : hasCompleteStudentProfile({
      role: "student",
      phone: nextPhone,
      academicYear: nextYear,
      academicSemester: nextSemester,
    });

  const hasExplicitProfileCompletionFlag = typeof profileOverrides.profileCompleted === "boolean";
  const hasLegacyProfileCompletionFlag = typeof previous?.profileCompleted === "boolean";
  let nextProfileCompleted = nextRole === "admin";
  if (nextRole === "student") {
    if (inferredStudentProfileCompletion) {
      nextProfileCompleted = true;
    } else if (hasExplicitProfileCompletionFlag) {
      nextProfileCompleted = Boolean(profileOverrides.profileCompleted);
    } else if (hasLegacyProfileCompletionFlag) {
      nextProfileCompleted = Boolean(previous.profileCompleted);
    } else {
      nextProfileCompleted = false;
    }
  }

  const nextUser = {
    id: authUser.id,
    name: nextName || fallbackName,
    email,
    password: previous?.password || "",
    phone: nextPhone,
    role: nextRole,
    verified: Boolean(authUser.email_confirmed_at || authUser.confirmed_at || profileOverrides.verified || false),
    isApproved: nextIsApproved,
    approvedAt: nextIsApproved ? profileOverrides.approvedAt || previous?.approvedAt || nowISO() : null,
    approvedBy: nextIsApproved
      ? profileOverrides.approvedBy || previous?.approvedBy || (nextRole === "admin" ? "system" : AUTO_APPROVAL_ACTOR)
      : null,
    assignedCourses: nextCourses,
    academicYear: nextRole === "student" ? nextYear : null,
    academicSemester: nextRole === "student" ? nextSemester : null,
    createdAt: previous?.createdAt || nowISO(),
    supabaseAuthId: authUser.id,
    authProvider: nextAuthProvider,
    profileCompleted: nextProfileCompleted,
  };

  if (idx >= 0) {
    users[idx] = nextUser;
  } else {
    users.push(nextUser);
  }

  if (previous?.id && previous.id !== nextUser.id) {
    const sessions = getSessions();
    let sessionsChanged = false;
    sessions.forEach((session) => {
      if (session.userId === previous.id) {
        session.userId = nextUser.id;
        sessionsChanged = true;
      }
    });
    if (sessionsChanged) {
      saveLocalOnly(STORAGE_KEYS.sessions, sessions);
    }

    const incorrectQueue = load(STORAGE_KEYS.incorrectQueue, {});
    if (incorrectQueue[previous.id] && !incorrectQueue[nextUser.id]) {
      incorrectQueue[nextUser.id] = incorrectQueue[previous.id];
      delete incorrectQueue[previous.id];
      saveLocalOnly(STORAGE_KEYS.incorrectQueue, incorrectQueue);
    }

    const flashcards = load(STORAGE_KEYS.flashcards, {});
    if (flashcards[previous.id] && !flashcards[nextUser.id]) {
      flashcards[nextUser.id] = flashcards[previous.id];
      delete flashcards[previous.id];
      saveLocalOnly(STORAGE_KEYS.flashcards, flashcards);
    }
  }

  save(STORAGE_KEYS.users, users);
  save(STORAGE_KEYS.currentUserId, nextUser.id);
  return nextUser;
}

async function detectSupabaseStorageShape(client) {
  const candidates = [
    { tableName: "app_state", storageKeyColumn: "storage_key" },
    { tableName: "appstate", storageKeyColumn: "storagekey" },
  ];

  for (const candidate of candidates) {
    const { error } = await runWithTimeoutResult(
      client
        .from(candidate.tableName)
        .select(candidate.storageKeyColumn)
        .limit(1),
      SUPABASE_QUERY_TIMEOUT_MS,
      "Supabase storage check timed out.",
    );
    if (!error) {
      return candidate;
    }
  }

  return null;
}

function getRelationalClient() {
  const authClient = getSupabaseAuthClient();
  if (!authClient) {
    return null;
  }
  return authClient;
}

function isUuidValue(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || "").trim());
}

function invalidateAnalyticsCache(options = {}) {
  analyticsRuntime.cache.clear();
  if (options?.resetQuestionMeta) {
    analyticsRuntime.questionMetaById.clear();
  }
}

function invalidateAnalyticsCacheForStorageKey(storageKey) {
  if (
    storageKey !== STORAGE_KEYS.sessions
    && storageKey !== STORAGE_KEYS.questions
    && storageKey !== STORAGE_KEYS.curriculum
    && storageKey !== STORAGE_KEYS.courseTopics
    && storageKey !== STORAGE_KEYS.users
  ) {
    return;
  }
  const shouldResetQuestionMeta = (
    storageKey === STORAGE_KEYS.questions
    || storageKey === STORAGE_KEYS.curriculum
    || storageKey === STORAGE_KEYS.courseTopics
  );
  invalidateAnalyticsCache({
    resetQuestionMeta: shouldResetQuestionMeta,
  });
}

function saveLocalOnly(key, value) {
  writeStorageKey(key, value);
  invalidateAnalyticsCacheForStorageKey(key);
  appendStorageMutationLog("save_local", key, value);
}

function clearSessionSyncTimer() {
  if (sessionSyncRuntime.timer) {
    window.clearTimeout(sessionSyncRuntime.timer);
    sessionSyncRuntime.timer = null;
  }
}

function resetSessionSyncRuntime() {
  clearSessionSyncTimer();
  sessionSyncRuntime.dirty = false;
  sessionSyncRuntime.flushing = false;
}

function queueSessionStateForCloud() {
  if (!sessionSyncRuntime.dirty) {
    return false;
  }

  const sessions = getSessions();
  const queuedRelational = scheduleRelationalWrite(STORAGE_KEYS.sessions, sessions);
  if (!queuedRelational) {
    return false;
  }
  sessionSyncRuntime.dirty = false;
  return true;
}

async function flushSessionStateSync() {
  clearSessionSyncTimer();
  if (sessionSyncRuntime.flushing || !queueSessionStateForCloud()) {
    return;
  }

  sessionSyncRuntime.flushing = true;
  try {
    await flushRelationalWrites({ throwOnFailure: false }).catch(() => { });
    if (supabaseSync.pendingWrites.size) {
      await flushSupabaseWrites().catch(() => { });
    }
  } finally {
    sessionSyncRuntime.flushing = false;
    scheduleSyncStatusUiRefresh();
    if (sessionSyncRuntime.dirty && !sessionSyncRuntime.timer) {
      sessionSyncRuntime.timer = window.setTimeout(() => {
        sessionSyncRuntime.timer = null;
        flushSessionStateSync().catch((error) => {
          console.warn("Deferred session sync failed.", error?.message || error);
        });
      }, SESSION_SYNC_FLUSH_MS);
    }
  }
}

function scheduleSessionStateSync(options = {}) {
  sessionSyncRuntime.dirty = true;
  scheduleSyncStatusUiRefresh();
  if (options?.immediate) {
    flushSessionStateSync().catch((error) => {
      console.warn("Session sync failed.", error?.message || error);
    });
    return;
  }
  if (sessionSyncRuntime.timer || sessionSyncRuntime.flushing) {
    return;
  }
  sessionSyncRuntime.timer = window.setTimeout(() => {
    sessionSyncRuntime.timer = null;
    flushSessionStateSync().catch((error) => {
      console.warn("Deferred session sync failed.", error?.message || error);
    });
  }, SESSION_SYNC_FLUSH_MS);
}

function clearPendingAdminActionFlushTimer() {
  if (adminActionRuntime.flushTimer) {
    window.clearTimeout(adminActionRuntime.flushTimer);
    adminActionRuntime.flushTimer = null;
  }
}

function resetPendingAdminActionRuntimeState() {
  adminActionRuntime.flushing = false;
  adminActionRuntime.lastSuccessAt = 0;
  adminActionRuntime.lastFailureAt = 0;
  adminActionRuntime.lastFailureMessage = "";
  adminActionRuntime.retryAt = 0;
  clearPendingAdminActionFlushTimer();
  scheduleSyncStatusUiRefresh();
}

function schedulePendingAdminActionFlush(delayMs = SUPABASE_RETRY_FLUSH_MS) {
  if (adminActionRuntime.flushing || adminActionRuntime.flushTimer || !getPendingAdminActionQueue().length) {
    return;
  }
  const safeDelayMs = Math.max(1, Number(delayMs) || 1);
  adminActionRuntime.retryAt = Date.now() + safeDelayMs;
  adminActionRuntime.flushTimer = window.setTimeout(() => {
    adminActionRuntime.flushTimer = null;
    flushPendingAdminActionQueue().catch((error) => {
      console.warn("Pending admin action flush failed.", error?.message || error);
    });
  }, safeDelayMs);
  scheduleSyncStatusUiRefresh();
}

function resetPostAuthWarmupRuntimeState() {
  postAuthWarmupRuntime.key = "";
  postAuthWarmupRuntime.promise = null;
}

function isPostAuthDataWarmupActive(user = null) {
  const currentUser = user || getCurrentUser();
  const profileId = String(getUserProfileId(currentUser) || "").trim();
  if (!currentUser || !isUuidValue(profileId) || !postAuthWarmupRuntime.promise) {
    return false;
  }
  return postAuthWarmupRuntime.key === `${profileId}:${currentUser.role}`;
}

function schedulePostAuthDataWarmup(user) {
  const currentUser = user || getCurrentUser();
  const profileId = String(getUserProfileId(currentUser) || "").trim();
  if (!currentUser || !isUuidValue(profileId)) {
    return Promise.resolve(false);
  }

  const key = `${profileId}:${currentUser.role}`;
  if (postAuthWarmupRuntime.promise && postAuthWarmupRuntime.key === key) {
    return postAuthWarmupRuntime.promise;
  }

  const routeBefore = String(state.route || "").trim();
  const adminPageBefore = String(state.adminPage || "").trim();
  const hasCachedAdminData = getUsers().length > 0 || getQuestions().length > 0;
  if (currentUser.role === "admin" && hasCachedAdminData) {
    state.adminDataLastSyncAt = Date.now();
    state.adminDataSyncError = "";
  }

  postAuthWarmupRuntime.key = key;
  postAuthWarmupRuntime.promise = Promise.resolve().then(async () => {
    if (currentUser.role === "admin") {
      flushPendingAdminActionQueue({ user: currentUser }).catch(() => { });
    }
    await hydrateRelationalState(currentUser).catch((hydrateError) => {
      console.warn("Could not hydrate relational state.", hydrateError?.message || hydrateError);
    });
    await hydrateUserScopedSupabaseState(currentUser).catch((hydrateError) => {
      console.warn("Could not hydrate user scoped data.", hydrateError?.message || hydrateError);
    });

    if (currentUser.role === "admin") {
      state.adminDataLastSyncAt = Date.now();
      state.adminDataSyncError = "";
    } else if (currentUser.role === "student") {
      state.studentDataLastSyncAt = Date.now();
    }

    const latestUser = getCurrentUser();
    if (!latestUser || String(getUserProfileId(latestUser) || "").trim() !== profileId) {
      return false;
    }
    if (state.route !== routeBefore) {
      return true;
    }
    if (currentUser.role === "admin" && String(state.adminPage || "").trim() !== adminPageBefore) {
      return true;
    }
    state.skipNextRouteAnimation = true;
    render();
    return true;
  }).finally(() => {
    if (postAuthWarmupRuntime.key === key) {
      postAuthWarmupRuntime.promise = null;
    }
  });

  return postAuthWarmupRuntime.promise;
}

function getPendingCloudWriteCount() {
  return Number(relationalSync.pendingWrites.size || 0)
    + Number(supabaseSync.pendingWrites.size || 0)
    + Number(sessionSyncRuntime.dirty ? 1 : 0)
    + Number(getPendingAdminActionQueue().length || 0);
}

function getPendingCloudWriteBuckets() {
  const relationalPendingCount = Number(relationalSync.pendingWrites.size || 0)
    + Number(sessionSyncRuntime.dirty ? 1 : 0);
  const backupPendingCount = Number(supabaseSync.pendingWrites.size || 0);
  const adminPendingCount = Number(getPendingAdminActionQueue().length || 0);
  return {
    relationalPendingCount,
    backupPendingCount,
    adminPendingCount,
    pendingCount: relationalPendingCount + backupPendingCount + adminPendingCount,
  };
}

function isLikelyCloudSyncAuthMessage(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  return /no active supabase session|supabase session expired|session does not match|unauthorized|signed-in supabase admin account|log out and log in again|log in again/.test(normalized);
}

function isLikelyRecoverableCloudSyncMessage(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) {
    return typeof navigator !== "undefined" && navigator?.onLine === false;
  }
  if (normalized.includes("offline")) {
    return true;
  }
  if (normalized.includes("cloud session was interrupted")) {
    return true;
  }
  if (normalized.includes("waiting for supabase")) {
    return true;
  }
  if (normalized.includes("retry automatically") || normalized.includes("retrying automatically")) {
    return true;
  }
  if (normalized.includes("timed out")) {
    return true;
  }
  return isLikelyNetworkFetchError({ message: normalized });
}

function shouldStopPendingAdminQueueOnFailure(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) {
    return typeof navigator !== "undefined" && navigator?.onLine === false;
  }
  if (isLikelyCloudSyncAuthMessage(normalized) || isLikelyRecoverableCloudSyncMessage(normalized)) {
    return true;
  }
  return normalized.includes("api is unavailable")
    || normalized.includes("endpoint is configured")
    || normalized.includes("server configuration is missing")
    || normalized.includes("method not allowed")
    || normalized.includes("missing bearer token");
}

function normalizeCloudSyncFailureMessage(errorOrMessage, fallback = "Cloud sync failed.") {
  const rawMessage = typeof errorOrMessage === "string"
    ? String(errorOrMessage || "").trim()
    : getErrorMessage(errorOrMessage, fallback);
  const normalized = String(rawMessage || "").trim();
  if (!normalized) {
    return fallback;
  }
  if (typeof navigator !== "undefined" && navigator?.onLine === false) {
    return "You are offline. Changes are saved locally and will retry automatically.";
  }
  if (isLikelyCloudSyncAuthMessage(normalized)) {
    return "Supabase admin session needs attention. Log out and sign in again.";
  }
  if (isLikelyRecoverableCloudSyncMessage(normalized)) {
    return "Temporary network issue contacting Supabase. Changes are saved locally and will retry automatically.";
  }
  return normalized;
}

function getCloudSyncFailureState(rawFailureMessage) {
  const message = String(rawFailureMessage || "").trim()
    ? normalizeCloudSyncFailureMessage(rawFailureMessage, "")
    : "";
  return {
    message,
    recoverable: Boolean(message) && isLikelyRecoverableCloudSyncMessage(message),
  };
}

function getRelevantCloudSyncFailureMessage(pendingBuckets) {
  const candidates = [];
  if ((pendingBuckets?.relationalPendingCount || 0) > 0) {
    candidates.push(relationalSync.lastFailureMessage, relationalSync.lastReadyError);
  }
  if ((pendingBuckets?.backupPendingCount || 0) > 0) {
    candidates.push(supabaseSync.lastFailureMessage);
  }
  if ((pendingBuckets?.adminPendingCount || 0) > 0) {
    candidates.push(adminActionRuntime.lastFailureMessage);
  }
  candidates.push(
    relationalSync.lastFailureMessage,
    supabaseSync.lastFailureMessage,
    adminActionRuntime.lastFailureMessage,
  );
  return candidates.find((entry) => String(entry || "").trim()) || "";
}

function formatRelativeSyncTime(timestamp) {
  const ts = Number(timestamp || 0);
  if (!ts) {
    return "never";
  }
  const deltaMs = Date.now() - ts;
  if (deltaMs < 4000) {
    return "just now";
  }
  const seconds = Math.max(1, Math.round(deltaMs / 1000));
  if (seconds < 60) {
    return `${seconds}s ago`;
  }
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function getCloudSyncStatusModel(user = null) {
  const currentUser = user || getCurrentUser();
  if (!currentUser) {
    return null;
  }

  const hasAuthClient = Boolean(getSupabaseAuthClient());
  const hasActiveSupabaseSession = Boolean(getActiveSupabaseAuthUserId());
  const pendingBuckets = getPendingCloudWriteBuckets();
  const pendingCount = pendingBuckets.pendingCount;
  const syncingNow = Boolean(relationalSync.flushing || supabaseSync.flushing || adminActionRuntime.flushing);
  const lastSuccessAt = Math.max(
    Number(relationalSync.lastSuccessAt || 0),
    Number(supabaseSync.lastSuccessAt || 0),
    Number(adminActionRuntime.lastSuccessAt || 0),
    Number(state.adminDataLastSyncAt || 0),
    Number(state.studentDataLastSyncAt || 0),
  );
  const lastFailureAt = Math.max(
    Number(relationalSync.lastFailureAt || 0),
    Number(supabaseSync.lastFailureAt || 0),
    Number(adminActionRuntime.lastFailureAt || 0),
  );
  const failureState = getCloudSyncFailureState(getRelevantCloudSyncFailureMessage(pendingBuckets));
  const failureMessage = failureState.message;
  const retryAt = Math.max(
    Number(relationalSync.retryAt || 0),
    Number(supabaseSync.retryAt || 0),
    Number(adminActionRuntime.retryAt || 0),
  );

  if (!hasAuthClient || !hasActiveSupabaseSession) {
    return {
      tone: "offline",
      label: "Local only",
      detail: "Supabase session is not active. Changes stay local until you sign in.",
      pendingCount,
    };
  }
  if (syncingNow) {
    const countLabel = Math.max(1, pendingCount);
    return {
      tone: "syncing",
      label: `Syncing ${countLabel} change${countLabel === 1 ? "" : "s"}...`,
      detail: "Saving your latest edits to Supabase in the background.",
      pendingCount,
    };
  }
  if (pendingCount > 0) {
    const retryWaitMs = retryAt > Date.now() ? (retryAt - Date.now()) : 0;
    const retryLabel = retryWaitMs > 0 ? `Retrying in ${Math.ceil(retryWaitMs / 1000)}s.` : "Retrying automatically.";
    const canAppendRetryLabel = Boolean(failureMessage) && !/retry/i.test(failureMessage.toLowerCase());
    return {
      tone: failureMessage && !failureState.recoverable ? "warning" : "pending",
      label: `Pending ${pendingCount} change${pendingCount === 1 ? "" : "s"}`,
      detail: failureMessage
        ? `${failureMessage}${canAppendRetryLabel ? ` ${retryLabel}` : ""}`.trim()
        : "Your edits are safe locally and will sync to Supabase shortly.",
      pendingCount,
    };
  }
  if (failureMessage && (Date.now() - lastFailureAt) <= 120000) {
    return {
      tone: failureState.recoverable ? "pending" : "warning",
      label: failureState.recoverable ? "Cloud retrying" : "Cloud had a sync issue",
      detail: failureMessage,
      pendingCount: 0,
    };
  }
  if (lastSuccessAt) {
    return {
      tone: "synced",
      label: `Synced ${formatRelativeSyncTime(lastSuccessAt)}`,
      detail: `Last successful sync: ${new Date(lastSuccessAt).toLocaleTimeString()}.`,
      pendingCount: 0,
    };
  }
  return {
    tone: "ready",
    label: "Cloud ready",
    detail: "Supabase is connected and ready to sync.",
    pendingCount: 0,
  };
}

function renderCloudSyncPill(model, options = {}) {
  if (!model) {
    return "";
  }
  const compact = options?.compact !== false;
  const classes = [
    "cloud-sync-pill",
    compact ? "is-compact" : "is-full",
    `is-${String(model.tone || "ready").trim() || "ready"}`,
  ].join(" ");
  const detail = String(model.detail || model.label || "Cloud sync status").trim();
  const showLoader = model.tone === "syncing";
  return `
    <div class="${classes}" role="status" aria-live="polite" title="${escapeHtml(detail)}">
      ${showLoader
      ? `<span class="inline-loader cloud-sync-loader" aria-hidden="true"></span>`
      : `<span class="cloud-sync-dot" aria-hidden="true"></span>`}
      <span class="cloud-sync-label">${escapeHtml(String(model.label || "Cloud sync").trim() || "Cloud sync")}</span>
    </div>
  `;
}

function refreshCloudSyncIndicators() {
  const user = getCurrentUser();
  const model = getCloudSyncStatusModel(user);
  const isAdmin = user?.role === "admin";
  const topbarSlot = document.getElementById("topbar-cloud-sync-slot");
  if (topbarSlot) {
    topbarSlot.innerHTML = isAdmin ? renderCloudSyncPill(model, { compact: true }) : "";
  }
  const adminSlot = document.getElementById("admin-cloud-sync-slot");
  if (adminSlot) {
    adminSlot.innerHTML = renderCloudSyncPill(model, { compact: false });
  }
}

function scheduleSyncStatusUiRefresh() {
  if (syncStatusUiRefreshHandle) {
    return;
  }
  syncStatusUiRefreshHandle = window.setTimeout(() => {
    syncStatusUiRefreshHandle = null;
    refreshCloudSyncIndicators();
  }, 120);
}

function clearRelationalFlushTimer() {
  if (relationalSync.flushTimer) {
    window.clearTimeout(relationalSync.flushTimer);
    relationalSync.flushTimer = null;
  }
}

function resetRelationalSyncState() {
  relationalSync.enabled = false;
  relationalSync.pendingWrites.clear();
  relationalSync.flushing = false;
  relationalSync.lastQueuedAt = 0;
  relationalSync.lastSuccessAt = 0;
  relationalSync.lastFailureAt = 0;
  relationalSync.lastFailureMessage = "";
  relationalSync.retryAt = 0;
  relationalSync.profilesBackfillAttempted = false;
  relationalSync.questionsBackfillAttempted = false;
  relationalSync.readyCheckedAt = 0;
  relationalSync.readyPromise = null;
  relationalSync.lastReadyError = "";
  relationalQuestionColumnSupport.checked = false;
  relationalQuestionColumnSupport.questionImageUrl = false;
  relationalQuestionColumnSupport.explanationImageUrl = false;
  relationalQuestionColumnSupport.sortOrder = false;
  clearRelationalFlushTimer();
  resetSessionSyncRuntime();
  scheduleSyncStatusUiRefresh();
}

function scheduleRelationalWrite(storageKey, value) {
  if (!RELATIONAL_SYNC_KEY_SET.has(storageKey)) {
    return false;
  }
  const currentUser = getCurrentUser();
  const profileId = String(getUserProfileId(currentUser) || "").trim();
  if (!isUuidValue(profileId)) {
    return false;
  }
  if (ADMIN_ONLY_RELATIONAL_KEYS.has(storageKey) && currentUser.role !== "admin") {
    return false;
  }

  const snapshot =
    value && typeof value === "object"
      ? deepClone(value)
      : value;
  relationalSync.pendingWrites.set(storageKey, snapshot);
  relationalSync.lastQueuedAt = Date.now();
  scheduleSyncStatusUiRefresh();
  if (relationalSync.flushTimer || relationalSync.flushing) {
    return true;
  }

  if (!relationalSync.enabled) {
    relationalSync.retryAt = Date.now() + RELATIONAL_RETRY_FLUSH_MS;
    relationalSync.flushTimer = window.setTimeout(() => {
      flushRelationalWrites().catch((error) => {
        console.warn("Relational sync flush failed.", error);
      });
    }, RELATIONAL_RETRY_FLUSH_MS);
    ensureRelationalSyncReady().then((ready) => {
      if (!ready) {
        return;
      }
      flushRelationalWrites().catch((error) => {
        console.warn("Relational sync flush failed.", error);
      });
    }).catch(() => { });
    scheduleSyncStatusUiRefresh();
    return true;
  }

  relationalSync.flushTimer = window.setTimeout(() => {
    flushRelationalWrites().catch((error) => {
      console.warn("Relational sync flush failed.", error);
    });
  }, RELATIONAL_FLUSH_DEBOUNCE_MS);

  return true;
}

async function ensureRelationalSyncReady(options = {}) {
  const force = Boolean(options?.force);
  const client = getRelationalClient();
  if (!client) {
    relationalSync.enabled = false;
    relationalSync.readyCheckedAt = Date.now();
    relationalSync.readyPromise = null;
    clearRelationalFlushTimer();
    relationalSync.lastReadyError = "No active Supabase session. Log in with your Supabase admin account and try again.";
    relationalSync.lastFailureAt = Date.now();
    relationalSync.lastFailureMessage = relationalSync.lastReadyError;
    relationalSync.retryAt = Date.now() + RELATIONAL_RETRY_FLUSH_MS;
    scheduleSyncStatusUiRefresh();
    return false;
  }

  const now = Date.now();
  const readinessCacheMs = relationalSync.enabled ? RELATIONAL_READY_CACHE_MS : RELATIONAL_READY_FAILURE_CACHE_MS;
  if (!force && relationalSync.readyCheckedAt && (now - relationalSync.readyCheckedAt) < readinessCacheMs) {
    return relationalSync.enabled;
  }
  if (!force && relationalSync.readyPromise) {
    return relationalSync.readyPromise;
  }

  const readCurrentSession = async () => {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const { data, error } = await runWithTimeoutResult(
          client.auth.getSession(),
          SUPABASE_SESSION_TIMEOUT_MS,
          "Supabase session check timed out.",
        );
        if (error) {
          if (attempt === 0 && isLikelyNetworkFetchError(error)) {
            await new Promise((resolve) => window.setTimeout(resolve, 220));
            continue;
          }
          return {
            ok: false,
            error,
            userId: "",
            issue: isLikelyNetworkFetchError(error) ? "network" : "session",
          };
        }
        const userId = String(data?.session?.user?.id || "").trim();
        if (isUuidValue(userId)) {
          return { ok: true, error: null, userId, issue: "" };
        }
        return { ok: false, error: null, userId: "", issue: "session" };
      } catch (error) {
        if (attempt === 0 && isLikelyNetworkFetchError(error)) {
          await new Promise((resolve) => window.setTimeout(resolve, 220));
          continue;
        }
        return {
          ok: false,
          error,
          userId: "",
          issue: isLikelyNetworkFetchError(error) ? "network" : "session",
        };
      }
    }
    return { ok: false, error: null, userId: "", issue: "network" };
  };
  const refreshCurrentSession = async () => {
    try {
      const { data } = await runWithTimeoutResult(
        client.auth.getSession().catch(() => ({ data: { session: null } })),
        SUPABASE_SESSION_TIMEOUT_MS,
        "Supabase session refresh timed out.",
      );
      const refreshToken = String(data?.session?.refresh_token || "").trim();
      if (refreshToken) {
        await runWithTimeoutResult(
          client.auth.refreshSession({ refresh_token: refreshToken }).catch(() => { }),
          SUPABASE_SESSION_TIMEOUT_MS,
          "Supabase session refresh timed out.",
        );
      } else {
        await runWithTimeoutResult(
          client.auth.refreshSession().catch(() => { }),
          SUPABASE_SESSION_TIMEOUT_MS,
          "Supabase session refresh timed out.",
        );
      }
      const sessionCheck = await readCurrentSession();
      return sessionCheck.ok;
    } catch {
      return false;
    }
  };

  relationalSync.readyPromise = (async () => {
    const sessionCheck = await readCurrentSession();
    if (!sessionCheck.ok) {
      const sessionErrorMessage = getErrorMessage(sessionCheck.error, "");
      const refreshed = (
        isInvalidJwtMessage(sessionErrorMessage)
        || !sessionErrorMessage
        || sessionCheck.issue === "network"
      )
        ? await refreshCurrentSession()
        : false;
      if (!refreshed) {
        relationalSync.enabled = false;
        relationalSync.readyCheckedAt = Date.now();
        relationalSync.lastReadyError = sessionCheck.issue === "network"
          ? "Network issue contacting Supabase. Check your connection and retry cloud refresh."
          : "No active Supabase session. Log in again and retry cloud refresh.";
        relationalSync.lastFailureAt = Date.now();
        relationalSync.lastFailureMessage = relationalSync.lastReadyError;
        relationalSync.retryAt = Date.now() + RELATIONAL_RETRY_FLUSH_MS;
        return false;
      }
    }

    const checks = [
      // Lightweight readiness gate: keep startup quick and let per-key sync handlers report table-level errors.
      { table: "profiles", select: "id" },
    ];

    for (const check of checks) {
      let checkError = null;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const { error } = await runWithTimeoutResult(
          client.from(check.table).select(check.select).limit(1),
          SUPABASE_QUERY_TIMEOUT_MS,
          `Supabase access check for ${check.table} timed out.`,
        );
        if (!error) {
          checkError = null;
          break;
        }
        checkError = error;
        const errorMessage = getErrorMessage(error, "");
        if (attempt === 0 && isInvalidJwtMessage(errorMessage)) {
          const refreshed = await refreshCurrentSession();
          if (refreshed) {
            continue;
          }
        }
        if (attempt === 0 && isLikelyNetworkFetchError(error)) {
          await new Promise((resolve) => window.setTimeout(resolve, 220));
          continue;
        }
      }
      if (checkError) {
        relationalSync.enabled = false;
        relationalSync.readyCheckedAt = Date.now();
        const details = getErrorMessage(checkError, "");
        relationalSync.lastReadyError = isLikelyNetworkFetchError(checkError)
          ? normalizeCloudSyncFailureMessage(checkError, `Cannot access ${check.table}.`)
          : (details
            ? `Cannot access ${check.table}: ${details}`
            : `Cannot access ${check.table}.`);
        relationalSync.lastFailureAt = Date.now();
        relationalSync.lastFailureMessage = relationalSync.lastReadyError;
        relationalSync.retryAt = Date.now() + RELATIONAL_RETRY_FLUSH_MS;
        return false;
      }
    }

    relationalSync.enabled = true;
    relationalSync.readyCheckedAt = Date.now();
    relationalSync.lastReadyError = "";
    relationalSync.lastFailureAt = 0;
    relationalSync.lastFailureMessage = "";
    relationalSync.retryAt = 0;
    return true;
  })();

  try {
    const ready = await relationalSync.readyPromise;
    if (ready && relationalSync.pendingWrites.size && !relationalSync.flushing) {
      flushRelationalWrites().catch((error) => {
        console.warn("Deferred relational sync flush failed.", error?.message || error);
      });
    }
    scheduleSyncStatusUiRefresh();
    return ready;
  } finally {
    relationalSync.readyPromise = null;
  }
}

async function updateRelationalProfileApproval(profileIds, approved) {
  const ids = [...new Set((Array.isArray(profileIds) ? profileIds : []).filter((id) => isUuidValue(id)))];
  if (!ids.length) {
    return { ok: true, updatedIds: [], skippedIds: [], missingIds: [] };
  }

  const ready = await ensureRelationalSyncReady();
  if (!ready) {
    return { ok: false, message: "Relational database sync is unavailable." };
  }
  const client = getRelationalClient();
  if (!client) {
    return { ok: false, message: "Supabase relational client is not available." };
  }

  const targetApproved = Boolean(approved);
  const existingRows = [];
  for (const idBatch of splitIntoBatches(ids, RELATIONAL_IN_BATCH_SIZE)) {
    const { data, error: existingError } = await runWithTimeoutResult(
      client
        .from("profiles")
        .select("id,role,phone,academic_year,academic_semester")
        .in("id", idBatch),
      SUPABASE_QUERY_TIMEOUT_MS,
      "Profile approval check timed out.",
    );
    if (existingError) {
      return { ok: false, message: existingError.message || "Could not read profile rows before update." };
    }
    if (Array.isArray(data) && data.length) {
      existingRows.push(...data);
    }
  }
  const existingRowsById = new Map(
    (existingRows || [])
      .map((row) => [String(row?.id || "").trim(), row])
      .filter(([id]) => isUuidValue(id)),
  );
  const existingIds = new Set(existingRowsById.keys());
  const missingIds = ids.filter((id) => !existingIds.has(id));
  let targetIds = ids.filter((id) => existingIds.has(id));
  const ineligibleIds = [];
  if (targetApproved) {
    targetIds = targetIds.filter((id) => {
      const row = existingRowsById.get(id);
      const role = String(row?.role || "student").trim().toLowerCase() === "admin" ? "admin" : "student";
      if (role !== "student") {
        return true;
      }
      const canApproveStudent = hasCompleteStudentProfile({
        role: "student",
        phone: String(row?.phone || "").trim(),
        academicYear: normalizeAcademicYearOrNull(row?.academic_year),
        academicSemester: normalizeAcademicSemesterOrNull(row?.academic_semester),
      });
      if (!canApproveStudent) {
        ineligibleIds.push(id);
      }
      return canApproveStudent;
    });
  }
  if (!targetIds.length) {
    return {
      ok: false,
      message: targetApproved
        ? "No selected users have complete phone, year, and semester details for approval."
        : "No matching database profiles found for selected users.",
      updatedIds: [],
      skippedIds: [...new Set([...missingIds, ...ineligibleIds])],
      missingIds,
    };
  }

  const updatedRows = [];
  for (const targetBatch of splitIntoBatches(targetIds, RELATIONAL_UPSERT_BATCH_SIZE)) {
    const { data, error } = await runWithTimeoutResult(
      client
        .from("profiles")
        .update({ approved: targetApproved })
        .in("id", targetBatch)
        .select("id,approved"),
      SUPABASE_QUERY_TIMEOUT_MS,
      "Profile approval update timed out.",
    );
    if (error) {
      return { ok: false, message: error.message || "Could not update profile approval in database." };
    }
    if (Array.isArray(data) && data.length) {
      updatedRows.push(...data);
    }
  }

  const appliedById = new Map((updatedRows || []).map((row) => [row.id, Boolean(row.approved)]));
  const unresolvedIds = targetIds.filter((id) => appliedById.get(id) !== targetApproved);
  if (unresolvedIds.length) {
    const verifyRows = [];
    for (const unresolvedBatch of splitIntoBatches(unresolvedIds, RELATIONAL_IN_BATCH_SIZE)) {
      const { data, error: verifyError } = await runWithTimeoutResult(
        client
          .from("profiles")
          .select("id,approved")
          .in("id", unresolvedBatch),
        SUPABASE_QUERY_TIMEOUT_MS,
        "Profile approval verification timed out.",
      );
      if (verifyError) {
        return {
          ok: false,
          message: verifyError.message || "Could not verify profile approval status after update.",
        };
      }
      if (Array.isArray(data) && data.length) {
        verifyRows.push(...data);
      }
    }
    const verifiedById = new Map((verifyRows || []).map((row) => [row.id, Boolean(row.approved)]));
    unresolvedIds.splice(0, unresolvedIds.length, ...unresolvedIds.filter((id) => verifiedById.get(id) !== targetApproved));
  }

  const unresolvedSet = new Set(unresolvedIds);
  const updatedIds = targetIds.filter((id) => !unresolvedSet.has(id));
  const skippedIds = [...new Set([...missingIds, ...ineligibleIds, ...unresolvedIds])];
  if (!updatedIds.length) {
    return {
      ok: false,
      message: "Some selected users were not updated in database. Check admin permissions and try again.",
      updatedIds,
      skippedIds,
      missingIds,
    };
  }

  return { ok: true, updatedIds, skippedIds, missingIds };
}

async function syncUsersBackupState(usersPayload) {
  if (!supabaseSync.enabled || !isLegacySupabaseStateSyncKey(STORAGE_KEYS.users)) {
    return;
  }

  const users = Array.isArray(usersPayload) ? usersPayload : getUsers();
  try {
    const queued = scheduleSupabaseWrite(STORAGE_KEYS.users, users);
    if (!queued) {
      return;
    }
    await flushSupabaseWrites();
  } catch (error) {
    console.warn("Users backup sync failed.", error?.message || error);
  }
}

async function flushPendingAdminActionQueue(options = {}) {
  const queuedActions = getPendingAdminActionQueue();
  if (!queuedActions.length) {
    adminActionRuntime.lastFailureAt = 0;
    adminActionRuntime.lastFailureMessage = "";
    adminActionRuntime.retryAt = 0;
    clearPendingAdminActionFlushTimer();
    scheduleSyncStatusUiRefresh();
    return { ok: true, deferred: false, syncedCount: 0, message: "" };
  }
  if (adminActionRuntime.flushing) {
    return { ok: false, deferred: true, syncedCount: 0, message: "Admin action sync is already in progress." };
  }

  const currentUser = options?.user || getCurrentUser();
  if (!currentUser || currentUser.role !== "admin") {
    adminActionRuntime.lastFailureAt = Date.now();
    adminActionRuntime.lastFailureMessage = "Queued admin actions are waiting for an admin session.";
    adminActionRuntime.retryAt = 0;
    scheduleSyncStatusUiRefresh();
    return { ok: false, deferred: true, syncedCount: 0, message: adminActionRuntime.lastFailureMessage };
  }
  if (typeof navigator !== "undefined" && navigator?.onLine === false) {
    adminActionRuntime.lastFailureAt = Date.now();
    adminActionRuntime.lastFailureMessage = "You are offline. Queued admin actions will retry automatically.";
    schedulePendingAdminActionFlush();
    return { ok: false, deferred: true, syncedCount: 0, message: adminActionRuntime.lastFailureMessage };
  }

  adminActionRuntime.flushing = true;
  clearPendingAdminActionFlushTimer();
  scheduleSyncStatusUiRefresh();
  let syncedCount = 0;
  let failureMessage = "";
  let remainingActions = [...queuedActions];
  let queueBlockedByGlobalFailure = false;

  try {
    for (const action of queuedActions) {
      if (action.type === "set-access") {
        const result = await setSupabaseAuthUserAccessAsAdmin([action.targetAuthId], action.approved);
        const message = String(result?.message || "").trim();
        const targetHandled = result?.ok
          || (Array.isArray(result?.notFoundIds) && result.notFoundIds.includes(action.targetAuthId));
        if (targetHandled) {
          syncedCount += 1;
          remainingActions = remainingActions.filter((entry) => entry.id !== action.id);
          continue;
        }
        failureMessage = failureMessage || message || "Could not sync queued account access update.";
        if (shouldStopPendingAdminQueueOnFailure(message)) {
          queueBlockedByGlobalFailure = true;
          break;
        }
        continue;
      }

      if (action.type === "set-password") {
        const result = await setSupabaseAuthUserPasswordAsAdmin(action.targetAuthId, action.password);
        const message = String(result?.message || "").trim();
        if (result?.ok || /not found|user not found/i.test(message)) {
          syncedCount += 1;
          remainingActions = remainingActions.filter((entry) => entry.id !== action.id);
          continue;
        }
        failureMessage = failureMessage || message || "Could not sync queued password update.";
        if (shouldStopPendingAdminQueueOnFailure(message)) {
          queueBlockedByGlobalFailure = true;
          break;
        }
        continue;
      }

      if (action.type === "delete-user") {
        if (isUuidValue(action.targetAuthId)) {
          const authDeleteResult = await deleteSupabaseAuthUserAsAdmin(action.targetAuthId);
          const authDeleteMessage = String(authDeleteResult?.message || "").trim();
          if (!authDeleteResult?.ok && !/not found|user not found/i.test(authDeleteMessage)) {
            failureMessage = failureMessage || authDeleteMessage || "Could not sync queued user deletion.";
            if (shouldStopPendingAdminQueueOnFailure(authDeleteMessage)) {
              queueBlockedByGlobalFailure = true;
              break;
            }
            continue;
          }
        }
        if (isUuidValue(action.targetProfileId)) {
          const profileDeleteResult = await deleteRelationalProfile(action.targetProfileId);
          const profileDeleteMessage = String(profileDeleteResult?.message || "").trim();
          if (!profileDeleteResult?.ok && !/not found|missing/i.test(profileDeleteMessage)) {
            failureMessage = failureMessage || profileDeleteMessage || "Could not remove queued user profile from database.";
            if (shouldStopPendingAdminQueueOnFailure(profileDeleteMessage)) {
              queueBlockedByGlobalFailure = true;
              break;
            }
            continue;
          }
        }
        syncedCount += 1;
        remainingActions = remainingActions.filter((entry) => entry.id !== action.id);
      }
    }

    savePendingAdminActionQueue(remainingActions);
    if (remainingActions.length) {
      adminActionRuntime.lastFailureAt = Date.now();
      adminActionRuntime.lastFailureMessage = normalizeCloudSyncFailureMessage(
        failureMessage || "Queued admin actions are waiting for Supabase.",
        "Queued admin actions are waiting for Supabase.",
      );
      return {
        ok: false,
        deferred: true,
        syncedCount,
        message: adminActionRuntime.lastFailureMessage,
      };
    }

    adminActionRuntime.lastSuccessAt = Date.now();
    adminActionRuntime.lastFailureAt = 0;
    adminActionRuntime.lastFailureMessage = "";
    adminActionRuntime.retryAt = 0;
    return { ok: true, deferred: false, syncedCount, message: "" };
  } finally {
    adminActionRuntime.flushing = false;
    scheduleSyncStatusUiRefresh();
    // Schedule retry after flushing = false, so schedulePendingAdminActionFlush actually works.
    // Previously this was called inside the try block while flushing was still true, causing the
    // guard check to bail out immediately and leaving the queue stuck with no retry timer.
    if (getPendingAdminActionQueue().length && !adminActionRuntime.flushTimer) {
      schedulePendingAdminActionFlush();
    }
  }
}

async function clearUserAnalyticsHistory(userId, profileId = "") {
  const targetUserId = String(userId || "").trim();
  if (!targetUserId) {
    return { localCleared: false, remoteCleared: false };
  }

  let localCleared = false;

  const sessions = getSessions();
  const nextSessions = sessions.filter((entry) => String(entry?.userId || "").trim() !== targetUserId);
  if (nextSessions.length !== sessions.length) {
    save(STORAGE_KEYS.sessions, nextSessions);
    localCleared = true;
  }

  const incorrectQueue = load(STORAGE_KEYS.incorrectQueue, {});
  if (Object.prototype.hasOwnProperty.call(incorrectQueue, targetUserId)) {
    delete incorrectQueue[targetUserId];
    save(STORAGE_KEYS.incorrectQueue, incorrectQueue);
    localCleared = true;
  }

  const flashcards = load(STORAGE_KEYS.flashcards, {});
  if (Object.prototype.hasOwnProperty.call(flashcards, targetUserId)) {
    delete flashcards[targetUserId];
    save(STORAGE_KEYS.flashcards, flashcards);
    localCleared = true;
  }

  const targetProfileId = String(profileId || "").trim();
  if (!isUuidValue(targetProfileId)) {
    return { localCleared, remoteCleared: false };
  }

  const ready = await ensureRelationalSyncReady();
  if (!ready) {
    throw new Error("Relational database sync is unavailable.");
  }
  const client = getRelationalClient();
  if (!client) {
    throw new Error("Supabase relational client is not available.");
  }

  const { error } = await client
    .from("test_blocks")
    .delete()
    .eq("user_id", targetProfileId);
  if (error) {
    throw error;
  }

  return { localCleared, remoteCleared: true };
}

async function deleteRelationalProfile(profileId) {
  if (!isUuidValue(profileId)) {
    return { ok: true };
  }

  const ready = await ensureRelationalSyncReady();
  if (!ready) {
    return { ok: false, message: "Relational database sync is unavailable." };
  }
  const client = getRelationalClient();
  if (!client) {
    return { ok: false, message: "Supabase relational client is not available." };
  }

  const { error } = await runWithTimeoutResult(
    client.from("profiles").delete().eq("id", profileId),
    SUPABASE_QUERY_TIMEOUT_MS,
    "Profile delete timed out.",
  );
  if (error) {
    return { ok: false, message: error.message || "Could not remove profile from database." };
  }
  return { ok: true };
}

function toRelationalDifficulty(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "easy") return 1;
  if (normalized === "hard") return 3;
  return 2;
}

function fromRelationalDifficulty(value) {
  if (Number(value) <= 1) return "Easy";
  if (Number(value) >= 3) return "Hard";
  return "Medium";
}

function toRelationalQuestionStatus(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "published" || normalized === "archived") {
    return normalized;
  }
  return "draft";
}

function extractCourseCode(courseName) {
  const match = String(courseName || "").match(/\(([^)]+)\)\s*$/);
  return match ? match[1].trim() : null;
}

async function hydrateRelationalState(user) {
  const ready = await ensureRelationalSyncReady();
  if (!ready) {
    return;
  }
  const current = user || getCurrentUser();
  const currentProfileId = String(getUserProfileId(current) || "").trim();
  if (!isUuidValue(currentProfileId)) {
    return;
  }
  if (relationalSync.pendingWrites.size || relationalSync.flushing) {
    await flushPendingSyncNow({ throwOnRelationalFailure: false }).catch(() => { });
  }

  const hasPendingCourseWrites = relationalSync.pendingWrites.has(STORAGE_KEYS.curriculum)
    || relationalSync.pendingWrites.has(STORAGE_KEYS.courseTopics)
    || relationalSync.flushing;
  const hasPendingUserWrites = relationalSync.pendingWrites.has(STORAGE_KEYS.users) || relationalSync.flushing;
  const hasPendingQuestionWrites = relationalSync.pendingWrites.has(STORAGE_KEYS.questions) || relationalSync.flushing;
  const hasPendingNotificationWrites = relationalSync.pendingWrites.has(STORAGE_KEYS.notifications) || relationalSync.flushing;
  const hasPendingSessionWrites = relationalSync.pendingWrites.has(STORAGE_KEYS.sessions) || relationalSync.flushing;

  // Avoid overwriting unsynced local edits per storage key while still allowing safe keys to hydrate.
  if (!hasPendingCourseWrites) {
    await hydrateRelationalCoursesAndTopics();
  }
  if (!hasPendingUserWrites) {
    await hydrateRelationalProfiles(current);
  }
  if (!hasPendingQuestionWrites) {
    await hydrateRelationalQuestions();
  }
  if (!hasPendingNotificationWrites) {
    await hydrateRelationalNotifications(current);
  }
  if (!hasPendingSessionWrites) {
    await hydrateRelationalSessions(current);
  }
}

async function hydrateRelationalCoursesAndTopics() {
  const client = getRelationalClient();
  if (!client || !relationalSync.enabled) {
    return;
  }

  const coursesResult = await fetchRowsPaged((from, to) => (
    client
      .from("courses")
      .select("id,course_name,course_code,academic_year,academic_semester,is_active")
      .order("academic_year", { ascending: true })
      .order("academic_semester", { ascending: true })
      .order("course_name", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to)
  ));
  if (coursesResult.error) {
    return;
  }
  const courses = Array.isArray(coursesResult.data) ? coursesResult.data : [];

  const topicsResult = await fetchRowsPaged((from, to) => (
    client
      .from("course_topics")
      .select("course_id,topic_name,sort_order,is_active,id")
      .order("sort_order", { ascending: true })
      .order("topic_name", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to)
  ));
  if (topicsResult.error) {
    return;
  }
  const topics = Array.isArray(topicsResult.data) ? topicsResult.data : [];

  const curriculum = {};
  for (let year = 1; year <= 5; year += 1) {
    curriculum[year] = { 1: [], 2: [] };
  }

  const topicMapByCourseId = {};
  (topics || []).forEach((topic) => {
    if (!topic?.is_active) return;
    if (!topicMapByCourseId[topic.course_id]) {
      topicMapByCourseId[topic.course_id] = [];
    }
    topicMapByCourseId[topic.course_id].push(String(topic.topic_name || "").trim());
  });

  const courseTopicOverrides = {};
  (courses || []).forEach((course) => {
    if (!course?.is_active) {
      return;
    }
    const year = sanitizeAcademicYear(course.academic_year || 1);
    const semester = sanitizeAcademicSemester(course.academic_semester || 1);
    const courseName = String(course.course_name || "").trim();
    if (!courseName) {
      return;
    }
    if (!curriculum[year][semester].includes(courseName)) {
      curriculum[year][semester].push(courseName);
    }
    const topicsForCourse = (topicMapByCourseId[course.id] || []).filter(Boolean);
    courseTopicOverrides[courseName] = topicsForCourse.length ? topicsForCourse : ["Clinical Applications"];
  });

  O6U_CURRICULUM = normalizeCurriculum(curriculum);
  COURSE_TOPIC_OVERRIDES = normalizeCourseTopicMap(courseTopicOverrides);
  rebuildCurriculumCatalog();
  saveLocalOnly(STORAGE_KEYS.curriculum, O6U_CURRICULUM);
  saveLocalOnly(STORAGE_KEYS.courseTopics, COURSE_TOPIC_OVERRIDES);
  saveLocalOnly(STORAGE_KEYS.courseNotebookLinks, COURSE_NOTEBOOK_LINKS);
}

async function fetchEnrollmentCourseMapForUsers(userIds) {
  const client = getRelationalClient();
  const ids = [...new Set((Array.isArray(userIds) ? userIds : []).map((id) => String(id || "").trim()).filter(isUuidValue))];
  if (!client || !ids.length) {
    return { coursesByUser: {}, termByUser: {} };
  }

  try {
    const enrollmentMap = Object.fromEntries(ids.map((id) => [id, []]));
    const termStateByUser = Object.fromEntries(
      ids.map((id) => [
        id,
        {
          year: null,
          semester: null,
          hasTerm: false,
          mixedTerms: false,
        },
      ]),
    );
    const enrollmentRows = [];
    for (const idBatch of splitIntoBatches(ids, RELATIONAL_IN_BATCH_SIZE)) {
      const { data, error } = await client
        .from("user_course_enrollments")
        .select("user_id,course_id")
        .in("user_id", idBatch);
      if (error) {
        throw error;
      }
      if (Array.isArray(data) && data.length) {
        enrollmentRows.push(...data);
      }
    }

    const courseIds = [...new Set(enrollmentRows.map((row) => String(row?.course_id || "").trim()).filter(isUuidValue))];
    if (!courseIds.length) {
      return { coursesByUser: enrollmentMap, termByUser: {} };
    }

    const courseRows = [];
    for (const courseBatch of splitIntoBatches(courseIds, RELATIONAL_IN_BATCH_SIZE)) {
      const { data, error } = await client
        .from("courses")
        .select("id,course_name,is_active,academic_year,academic_semester")
        .in("id", courseBatch);
      if (error) {
        throw error;
      }
      if (Array.isArray(data) && data.length) {
        courseRows.push(...data);
      }
    }

    const courseMetaById = Object.fromEntries(
      courseRows
        .filter((course) => course?.is_active !== false)
        .map((course) => [
          String(course?.id || "").trim(),
          {
            courseName: String(course?.course_name || "").trim(),
            year: normalizeAcademicYearOrNull(course?.academic_year),
            semester: normalizeAcademicSemesterOrNull(course?.academic_semester),
          },
        ])
        .filter(([courseId, meta]) => isUuidValue(courseId) && Boolean(meta?.courseName)),
    );

    enrollmentRows.forEach((row) => {
      const userId = String(row?.user_id || "").trim();
      const courseId = String(row?.course_id || "").trim();
      const courseMeta = courseMetaById[courseId];
      if (!isUuidValue(userId) || !courseMeta?.courseName) {
        return;
      }
      if (!enrollmentMap[userId].includes(courseMeta.courseName)) {
        enrollmentMap[userId].push(courseMeta.courseName);
      }
      if (courseMeta.year !== null && courseMeta.semester !== null) {
        const termState = termStateByUser[userId];
        if (!termState) {
          return;
        }
        if (!termState.hasTerm) {
          termState.year = courseMeta.year;
          termState.semester = courseMeta.semester;
          termState.hasTerm = true;
          return;
        }
        if (termState.year !== courseMeta.year || termState.semester !== courseMeta.semester) {
          termState.mixedTerms = true;
        }
      }
    });

    const termByUser = {};
    Object.entries(termStateByUser).forEach(([userId, termState]) => {
      if (!termState?.hasTerm || termState.mixedTerms) {
        return;
      }
      termByUser[userId] = {
        year: termState.year,
        semester: termState.semester,
      };
    });

    return {
      coursesByUser: enrollmentMap,
      termByUser,
    };
  } catch (error) {
    if (isMissingRelationError(error)) {
      return { coursesByUser: {}, termByUser: {} };
    }
    throw error;
  }
}

async function hydrateRelationalProfiles(currentUser) {
  const client = getRelationalClient();
  if (!client || !relationalSync.enabled) {
    return;
  }

  const usersBefore = getUsers();
  const isAdmin = currentUser.role === "admin";
  let profileRows = [];
  if (isAdmin) {
    const profilesResult = await fetchRowsPaged((from, to) => (
      client
        .from("profiles")
        .select("id,full_name,email,phone,role,approved,academic_year,academic_semester,auth_provider,created_at")
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to)
    ));
    if (profilesResult.error) {
      return;
    }
    profileRows = Array.isArray(profilesResult.data) ? profilesResult.data : [];
  } else {
    const { data: profile, error } = await client
      .from("profiles")
      .select("id,full_name,email,phone,role,approved,academic_year,academic_semester,auth_provider,created_at")
      .eq("id", currentUser.supabaseAuthId)
      .maybeSingle();
    if (error) {
      return;
    }
    profileRows = profile ? [profile] : [];
  }

  if (!profileRows.length) {
    const hasLocalRelationalUsers = usersBefore.some((entry) => Boolean(getUserProfileId(entry)));
    if (isAdmin && hasLocalRelationalUsers && !relationalSync.profilesBackfillAttempted) {
      relationalSync.profilesBackfillAttempted = true;
      try {
        await syncProfilesToRelational(usersBefore);
      } catch (syncError) {
        console.warn("Profiles backfill failed.", syncError?.message || syncError);
      }
    }
    saveLocalOnly(STORAGE_KEYS.currentUserId, currentUser.supabaseAuthId);
    return;
  }

  let enrollmentCourseMap = {};
  let enrollmentTermMap = {};
  try {
    const enrollmentSnapshot = await fetchEnrollmentCourseMapForUsers(profileRows.map((profile) => profile.id));
    enrollmentCourseMap = enrollmentSnapshot?.coursesByUser || {};
    enrollmentTermMap = enrollmentSnapshot?.termByUser || {};
  } catch (enrollmentError) {
    console.warn("Could not hydrate enrollment course mappings.", enrollmentError?.message || enrollmentError);
  }

  const allCourses = [...CURRICULUM_COURSE_LIST];
  const localByAuthId = new Map(
    usersBefore
      .map((entry) => [getUserProfileId(entry), entry])
      .filter(([profileId]) => Boolean(profileId)),
  );
  const mapped = profileRows.map((profile) => {
    const existing = localByAuthId.get(profile.id);
    const role = String(profile.role || "student") === "admin" ? "admin" : "student";
    const existingYear = normalizeAcademicYearOrNull(existing?.academicYear);
    const existingSemester = normalizeAcademicSemesterOrNull(existing?.academicSemester);
    const profileYear = normalizeAcademicYearOrNull(profile.academic_year);
    const profileSemester = normalizeAcademicSemesterOrNull(profile.academic_semester);
    const profilePhone = String(profile.phone || "").trim();
    const existingPhone = String(existing?.phone || "").trim();
    const resolvedPhone = profilePhone || existingPhone;
    const existingAssignedCourses = role === "student"
      ? sanitizeCourseAssignments(existing?.assignedCourses || [])
      : [];
    const enrolledCourses = role === "student"
      ? sanitizeCourseAssignments(enrollmentCourseMap[profile.id] || [])
      : [];
    const inferredEnrollmentYear = normalizeAcademicYearOrNull(enrollmentTermMap[profile.id]?.year);
    const inferredEnrollmentSemester = normalizeAcademicSemesterOrNull(enrollmentTermMap[profile.id]?.semester);
    const inferredFromCourses = role === "student"
      ? inferAcademicTermFromCourses(enrolledCourses.length ? enrolledCourses : existingAssignedCourses)
      : { year: null, semester: null };
    const inferredCourseYear = normalizeAcademicYearOrNull(inferredFromCourses.year);
    const inferredCourseSemester = normalizeAcademicSemesterOrNull(inferredFromCourses.semester);
    let year = role === "student"
      ? (profileYear ?? existingYear ?? inferredEnrollmentYear ?? inferredCourseYear)
      : null;
    let semester = role === "student"
      ? (profileSemester ?? existingSemester ?? inferredEnrollmentSemester ?? inferredCourseSemester)
      : null;
    let assignedCourses = role !== "student"
      ? [...allCourses]
      : enrolledCourses.length
        ? enrolledCourses
        : existingAssignedCourses.length
          ? existingAssignedCourses
          : [];
    if (role === "student") {
      const repairedEnrollment = normalizeStudentEnrollmentProfile({
        academicYear: year,
        academicSemester: semester,
        assignedCourses,
      });
      year = repairedEnrollment.academicYear;
      semester = repairedEnrollment.academicSemester;
      assignedCourses = repairedEnrollment.assignedCourses;
    }
    return {
      id: profile.id,
      name: String(profile.full_name || "").trim() || existing?.name || "Student",
      email: String(profile.email || "").trim().toLowerCase(),
      password: existing?.password || "",
      phone: resolvedPhone,
      role,
      verified: true,
      isApproved: Boolean(profile.approved),
      approvedAt: profile.approved ? existing?.approvedAt || profile.created_at || nowISO() : null,
      approvedBy: existing?.approvedBy || null,
      assignedCourses,
      academicYear: year,
      academicSemester: semester,
      authProvider: normalizeAuthProvider(profile.auth_provider || existing?.authProvider),
      profileCompleted: typeof existing?.profileCompleted === "boolean" ? existing.profileCompleted : role !== "student",
      createdAt: existing?.createdAt || profile.created_at || nowISO(),
      supabaseAuthId: profile.id,
    };
  });
  const mappedByAuthId = new Map(
    mapped
      .map((entry) => [String(entry?.supabaseAuthId || "").trim(), entry])
      .filter(([profileId]) => isUuidValue(profileId)),
  );

  if (isAdmin) {
    const backfillCandidates = profileRows
      .map((profile) => {
        const role = String(profile?.role || "student") === "admin" ? "admin" : "student";
        if (role !== "student") {
          return null;
        }
        const profileYear = normalizeAcademicYearOrNull(profile?.academic_year);
        const profileSemester = normalizeAcademicSemesterOrNull(profile?.academic_semester);
        const profilePhone = String(profile?.phone || "").trim();
        const missingPhone = !validateAndNormalizePhoneNumber(profilePhone).ok;
        if (!missingPhone) {
          return null;
        }
        const mappedEntry = mappedByAuthId.get(String(profile.id || "").trim());
        if (!mappedEntry) {
          return null;
        }
        const mappedPhone = String(mappedEntry.phone || "").trim();
        const mappedPhoneValid = validateAndNormalizePhoneNumber(mappedPhone).ok;
        const canBackfillPhone = mappedPhoneValid;
        if (!canBackfillPhone) {
          return null;
        }
        return {
          ...mappedEntry,
          academicYear: profileYear,
          academicSemester: profileSemester,
          phone: canBackfillPhone ? mappedPhone : profilePhone,
        };
      })
      .filter(Boolean);
    if (backfillCandidates.length) {
      await syncProfilesToRelational(backfillCandidates).catch((error) => {
        console.warn("Could not backfill missing student profile fields.", error?.message || error);
      });
    }
    if (mapped.length) {
      await syncUserCourseEnrollmentsToRelational(mapped, {
        assignedByAuthId: isUuidValue(currentUser?.supabaseAuthId) ? currentUser.supabaseAuthId : null,
      }).catch((error) => {
        if (!isMissingRelationError(error)) {
          console.warn("Could not backfill missing student enrollment rows.", error?.message || error);
        }
      });
    }
  }

  const mappedAuthIds = new Set(mapped.map((entry) => String(entry.supabaseAuthId || "").trim()).filter(Boolean));
  const preserveUnmappedRelationalUsers = isAdmin && profileRows.length <= 1;
  const preservedRelationalMap = new Map();
  usersBefore.forEach((entry) => {
    const authId = getUserProfileId(entry);
    if (!isUuidValue(authId) || mappedAuthIds.has(authId) || preservedRelationalMap.has(authId)) {
      return;
    }
    preservedRelationalMap.set(authId, entry);
  });
  const preservedRelational = preserveUnmappedRelationalUsers
    ? Array.from(preservedRelationalMap.values())
    : [];
  const preservedLocalOnly = usersBefore.filter((entry) => !getUserProfileId(entry) && !isLegacyDemoUser(entry));
  const nextUsers = [...preservedLocalOnly, ...preservedRelational, ...mapped];
  saveLocalOnly(STORAGE_KEYS.users, nextUsers);
  saveLocalOnly(STORAGE_KEYS.currentUserId, currentUser.supabaseAuthId);
  syncUsersWithCurriculum();
}

async function hydrateRelationalQuestions() {
  const client = getRelationalClient();
  if (!client || !relationalSync.enabled) {
    return;
  }

  const users = getUsers();
  const localQuestionsBefore = getQuestions();
  const localQuestionOrderByExternalId = new Map(
    localQuestionsBefore
      .map((question, index) => [String(question?.id || "").trim(), index])
      .filter(([externalId]) => Boolean(externalId)),
  );
  const currentUser = getCurrentUser();
  const coursesResult = await fetchRowsPaged((from, to) => (
    client.from("courses").select("id,course_name").range(from, to)
  ));
  if (coursesResult.error) {
    return;
  }
  const courseRows = Array.isArray(coursesResult.data) ? coursesResult.data : [];

  const topicsResult = await fetchRowsPaged((from, to) => (
    client.from("course_topics").select("id,course_id,topic_name").range(from, to)
  ));
  if (topicsResult.error) {
    return;
  }
  const topicRows = Array.isArray(topicsResult.data) ? topicsResult.data : [];
  let questionColumnSupport = relationalQuestionColumnSupport;
  try {
    questionColumnSupport = await getRelationalQuestionColumnSupport(client);
  } catch (error) {
    console.warn("Could not detect optional question media columns.", error?.message || error);
  }
  const questionSelectColumns = [
    "id",
    "external_id",
    "course_id",
    "topic_id",
    "author_id",
    "stem",
    "explanation",
    "objective",
    "difficulty",
    "status",
    "created_at",
    ...(questionColumnSupport.sortOrder ? ["sort_order"] : []),
    ...(questionColumnSupport.questionImageUrl ? ["question_image_url"] : []),
    ...(questionColumnSupport.explanationImageUrl ? ["explanation_image_url"] : []),
  ].join(",");

  const buildQuestionsQuery = (from, to) => {
    let query = client.from("questions").select(questionSelectColumns);
    if (questionColumnSupport.sortOrder) {
      query = query.order("sort_order", { ascending: true, nullsFirst: false });
    }
    return query
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to);
  };

  let questionsResult = await fetchRowsPaged((from, to) => buildQuestionsQuery(from, to));
  if (questionsResult.error) {
    return;
  }
  const remoteQuestionRows = Array.isArray(questionsResult.data) ? questionsResult.data : [];
  if (!remoteQuestionRows.length) {
    const hasLocalQuestions = localQuestionsBefore.some((question) => String(question?.stem || "").trim());
    if (
      currentUser?.role === "admin" &&
      hasLocalQuestions &&
      !relationalSync.questionsBackfillAttempted
    ) {
      relationalSync.questionsBackfillAttempted = true;
      try {
        await syncQuestionsToRelational(localQuestionsBefore);
        const retryResult = await fetchRowsPaged((from, to) => buildQuestionsQuery(from, to));
        if (!retryResult.error && Array.isArray(retryResult.data) && retryResult.data.length) {
          questionsResult = retryResult;
        } else {
          return;
        }
      } catch (syncError) {
        console.warn("Questions backfill failed.", syncError?.message || syncError);
        return;
      }
    } else if (currentUser?.role === "student") {
      if (hasLocalQuestions) {
        return;
      }
      const recoveredFromBackup = await hydrateQuestionsFromSupabaseBackup().catch(() => false);
      if (recoveredFromBackup) {
        return;
      }
      return;
    } else if (hasLocalQuestions) {
      return;
    }
  }

  const questionRows = Array.isArray(questionsResult.data) ? questionsResult.data : [];
  const questionIds = questionRows.map((question) => question.id).filter(isUuidValue);
  const choiceRows = [];
  for (const questionIdBatch of splitIntoBatches(questionIds, RELATIONAL_IN_BATCH_SIZE)) {
    const { data, error } = await client
      .from("question_choices")
      .select("question_id,choice_label,choice_text,is_correct")
      .in("question_id", questionIdBatch);
    if (error) {
      return;
    }
    if (Array.isArray(data) && data.length) {
      choiceRows.push(...data);
    }
  }

  const courseById = Object.fromEntries((courseRows || []).map((course) => [course.id, String(course.course_name || "").trim()]));
  const topicById = Object.fromEntries((topicRows || []).map((topic) => [topic.id, String(topic.topic_name || "").trim()]));
  const authorById = Object.fromEntries(
    users
      .map((entry) => [getUserProfileId(entry), entry.name])
      .filter(([profileId]) => Boolean(profileId)),
  );
  const localQuestionByExternalId = Object.fromEntries(
    localQuestionsBefore
      .map((question) => [String(question?.id || "").trim(), question])
      .filter(([questionId]) => Boolean(questionId)),
  );
  const localQuestionByDbId = Object.fromEntries(
    localQuestionsBefore
      .map((question) => [String(question?.dbId || "").trim(), question])
      .filter(([dbId]) => isUuidValue(dbId)),
  );
  const choicesByQuestionId = {};
  (choiceRows || []).forEach((choice) => {
    if (!choicesByQuestionId[choice.question_id]) {
      choicesByQuestionId[choice.question_id] = [];
    }
    choicesByQuestionId[choice.question_id].push(choice);
  });

  let needsChoiceRepairSync = false;
  const skippedMalformedQuestionIds = [];
  const mappedQuestions = (questionRows || []).map((question) => {
    const externalId = String(question.external_id || question.id || "").trim();
    const existingQuestion = localQuestionByExternalId[externalId] || localQuestionByDbId[String(question.id || "").trim()] || null;
    const courseName = courseById[question.course_id] || CURRICULUM_COURSE_LIST[0] || "Course";
    const topicName = topicById[question.topic_id] || resolveDefaultTopic(courseName);
    const rawChoices = (choicesByQuestionId[question.id] || [])
      .sort((a, b) => String(a.choice_label).localeCompare(String(b.choice_label)));
    const remoteChoices = normalizeQuestionChoiceEntries(
      rawChoices.map((choice) => ({
        id: String(choice.choice_label || "").toUpperCase(),
        text: String(choice.choice_text || "").trim(),
      })),
    );
    const existingChoices = normalizeQuestionChoiceEntries(existingQuestion?.choices);
    const useExistingChoices = shouldPreferExistingQuestionChoices(remoteChoices, existingChoices);
    const resolvedChoices = useExistingChoices && existingChoices.length
      ? existingChoices
      : remoteChoices;
    if (useExistingChoices && existingChoices.length) {
      const remoteSignature = remoteChoices.map((choice) => `${choice.id}:${choice.text}`).join("|");
      const existingSignature = existingChoices.map((choice) => `${choice.id}:${choice.text}`).join("|");
      if (remoteSignature !== existingSignature) {
        needsChoiceRepairSync = true;
      }
    }
    const remoteCorrect = rawChoices
      .filter((choice) => Boolean(choice.is_correct))
      .map((choice) => String(choice.choice_label || "").toUpperCase());
    const choices = resolvedChoices;
    if (choices.length < 2) {
      skippedMalformedQuestionIds.push(externalId || String(question.id || ""));
      return null;
    }
    const correct = resolveQuestionCorrectAnswers(
      remoteCorrect,
      existingQuestion?.correct,
      choices,
    );
    const questionImageFromDb = questionColumnSupport.questionImageUrl
      ? String(question.question_image_url || "").trim()
      : "";
    const explanationImageFromDb = questionColumnSupport.explanationImageUrl
      ? String(question.explanation_image_url || "").trim()
      : "";
    const sortOrderFromDb = questionColumnSupport.sortOrder
      ? normalizeQuestionSortOrder(question.sort_order)
      : null;

    return {
      id: externalId || String(question.id || ""),
      dbId: question.id,
      qbankCourse: courseName,
      qbankTopic: topicName,
      course: courseName,
      system: courseName,
      topic: topicName,
      difficulty: fromRelationalDifficulty(question.difficulty),
      tags: [],
      author: authorById[question.author_id] || "Admin",
      dateAdded: String(question.created_at || nowISO()).slice(0, 10),
      stem: String(question.stem || "").trim(),
      choices,
      correct,
      explanation: String(question.explanation || "").trim(),
      objective: String(question.objective || "").trim(),
      references: "",
      sortOrder: sortOrderFromDb ?? normalizeQuestionSortOrder(existingQuestion?.sortOrder) ?? null,
      questionImage: questionImageFromDb || String(existingQuestion?.questionImage || "").trim(),
      explanationImage: explanationImageFromDb || String(existingQuestion?.explanationImage || "").trim(),
      status: toRelationalQuestionStatus(question.status),
    };
  }).filter(Boolean);

  if (skippedMalformedQuestionIds.length) {
    console.warn(
      `Skipped ${skippedMalformedQuestionIds.length} malformed question(s) with missing choices during hydration.`,
    );
  }

  mappedQuestions.sort((a, b) => {
    if (questionColumnSupport.sortOrder) {
      const aSort = normalizeQuestionSortOrder(a?.sortOrder);
      const bSort = normalizeQuestionSortOrder(b?.sortOrder);
      if (aSort !== null && bSort !== null && aSort !== bSort) {
        return aSort - bSort;
      }
      if (aSort !== null && bSort === null) {
        return -1;
      }
      if (aSort === null && bSort !== null) {
        return 1;
      }
    }

    const aLocalOrder = localQuestionOrderByExternalId.get(String(a?.id || "").trim());
    const bLocalOrder = localQuestionOrderByExternalId.get(String(b?.id || "").trim());
    if (aLocalOrder != null && bLocalOrder != null && aLocalOrder !== bLocalOrder) {
      return aLocalOrder - bLocalOrder;
    }
    if (aLocalOrder != null && bLocalOrder == null) {
      return -1;
    }
    if (aLocalOrder == null && bLocalOrder != null) {
      return 1;
    }
    return String(a?.id || "").localeCompare(String(b?.id || ""));
  });

  const remoteExternalIdSet = new Set(
    mappedQuestions
      .map((question) => String(question?.id || "").trim())
      .filter(Boolean),
  );
  const remoteDbIdSet = new Set(
    questionRows
      .map((question) => String(question?.id || "").trim())
      .filter((id) => isUuidValue(id)),
  );
  const preservedLocalDraftQuestions = currentUser?.role === "admin"
    ? localQuestionsBefore.filter((question) => {
      const externalId = String(question?.id || "").trim();
      const dbId = String(question?.dbId || "").trim();
      if (!String(question?.stem || "").trim()) {
        return false;
      }
      if (toRelationalQuestionStatus(question?.status) !== "draft") {
        return false;
      }
      if (externalId && remoteExternalIdSet.has(externalId)) {
        return false;
      }
      if (isUuidValue(dbId) && remoteDbIdSet.has(dbId)) {
        return false;
      }
      return true;
    })
    : [];
  const mergedMappedQuestions = preservedLocalDraftQuestions.length
    ? [...mappedQuestions, ...preservedLocalDraftQuestions]
    : mappedQuestions;
  mergedMappedQuestions.sort((a, b) => {
    if (questionColumnSupport.sortOrder) {
      const aSort = normalizeQuestionSortOrder(a?.sortOrder);
      const bSort = normalizeQuestionSortOrder(b?.sortOrder);
      if (aSort !== null && bSort !== null && aSort !== bSort) {
        return aSort - bSort;
      }
      if (aSort !== null && bSort === null) {
        return -1;
      }
      if (aSort === null && bSort !== null) {
        return 1;
      }
    }

    const aLocalOrder = localQuestionOrderByExternalId.get(String(a?.id || "").trim());
    const bLocalOrder = localQuestionOrderByExternalId.get(String(b?.id || "").trim());
    if (aLocalOrder != null && bLocalOrder != null && aLocalOrder !== bLocalOrder) {
      return aLocalOrder - bLocalOrder;
    }
    if (aLocalOrder != null && bLocalOrder == null) {
      return -1;
    }
    if (aLocalOrder == null && bLocalOrder != null) {
      return 1;
    }
    return String(a?.id || "").localeCompare(String(b?.id || ""));
  });

  const normalizedMappedQuestions = mergedMappedQuestions.map((question, index) => ({
    ...question,
    sortOrder: index + 1,
  }));

  saveLocalOnly(STORAGE_KEYS.questions, normalizedMappedQuestions);
  const topicRepairResult = repairCourseTopicCatalogFromQuestions({ persist: false });
  const repairedQuestionsSnapshot = topicRepairResult.questionsChanged
    ? getQuestions()
    : normalizedMappedQuestions;
  if (currentUser?.role === "admin") {
    if (topicRepairResult.questionsChanged) {
      scheduleRelationalWrite(STORAGE_KEYS.questions, repairedQuestionsSnapshot);
    }
    if (topicRepairResult.topicsChanged) {
      scheduleRelationalWrite(
        STORAGE_KEYS.courseTopics,
        load(STORAGE_KEYS.courseTopics, COURSE_TOPIC_OVERRIDES),
      );
    }
  }
  if (needsChoiceRepairSync && currentUser?.role === "admin") {
    // If DB rows contain placeholder/partial choices while local has real data, push a background repair sync.
    if (scheduleRelationalWrite(STORAGE_KEYS.questions, repairedQuestionsSnapshot)) {
      flushPendingSyncNow({ throwOnRelationalFailure: false }).catch((syncError) => {
        console.warn("Could not repair remote question choices from local cache.", syncError?.message || syncError);
      });
    }
  }
}

async function hydrateRelationalNotifications(currentUser) {
  const user = currentUser || getCurrentUser();
  const client = getRelationalClient();
  const sessionProfileId = getCurrentSessionProfileId(user);
  if (!client || !isUuidValue(sessionProfileId)) {
    return false;
  }
  const userNotificationIdentityIds = [...new Set(
    getNotificationIdentityListForUser(user)
      .map((id) => String(id || "").trim())
      .filter((id) => isUuidValue(id)),
  )];
  if (!userNotificationIdentityIds.length) {
    return false;
  }

  const selectColumns = "id,external_id,recipient_user_id,title,message,created_by,created_by_name,created_at,is_active";
  let notificationRows = [];
  if (user.role === "admin") {
    const notificationsResult = await fetchRowsPaged((from, to) => (
      client
        .from("notifications")
        .select(selectColumns)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(from, to)
    ));
    if (notificationsResult.error) {
      if (!isMissingRelationError(notificationsResult.error)) {
        console.warn("Could not hydrate notifications.", notificationsResult.error?.message || notificationsResult.error);
      }
      return false;
    }
    notificationRows = Array.isArray(notificationsResult.data) ? notificationsResult.data : [];
  } else {
    let globalQueryError = null;
    let directQueryError = null;
    const globalNotificationsResult = await fetchRowsPaged((from, to) => (
      client
        .from("notifications")
        .select(selectColumns)
        .eq("is_active", true)
        .is("recipient_user_id", null)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(from, to)
    ));
    if (globalNotificationsResult.error) {
      globalQueryError = globalNotificationsResult.error;
      if (!isMissingRelationError(globalNotificationsResult.error)) {
        console.warn(
          "Could not hydrate global notifications.",
          globalNotificationsResult.error?.message || globalNotificationsResult.error,
        );
      }
    }

    const directNotificationsResult = await fetchRowsPaged((from, to) => {
      let query = client
        .from("notifications")
        .select(selectColumns)
        .eq("is_active", true);
      if (userNotificationIdentityIds.length === 1) {
        query = query.eq("recipient_user_id", userNotificationIdentityIds[0]);
      } else {
        query = query.in("recipient_user_id", userNotificationIdentityIds);
      }
      return query
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(from, to);
    });
    if (directNotificationsResult.error) {
      directQueryError = directNotificationsResult.error;
      if (!isMissingRelationError(directNotificationsResult.error)) {
        console.warn(
          "Could not hydrate direct notifications.",
          directNotificationsResult.error?.message || directNotificationsResult.error,
        );
      }
    }
    if (globalQueryError && directQueryError) {
      return false;
    }

    const globalRows = globalQueryError ? [] : (Array.isArray(globalNotificationsResult.data) ? globalNotificationsResult.data : []);
    const directRows = directQueryError ? [] : (Array.isArray(directNotificationsResult.data) ? directNotificationsResult.data : []);
    notificationRows = [...globalRows, ...directRows];
  }

  if (!notificationRows.length) {
    const localUnsynced = getNotifications().filter((entry) => !isUuidValue(entry.dbId));
    saveNotificationsLocal(localUnsynced);
    return true;
  }

  const notificationDbIds = [...new Set(
    notificationRows
      .map((row) => String(row?.id || "").trim())
      .filter((id) => isUuidValue(id)),
  )];
  const readByNotificationId = {};
  let readStateUnavailable = false;
  if (user.role !== "admin" && notificationDbIds.length) {
    for (const idBatch of splitIntoBatches(notificationDbIds, RELATIONAL_IN_BATCH_SIZE)) {
      const { data: readRows, error: readError } = await client
        .from("notification_reads")
        .select("notification_id,user_id")
        .eq("user_id", sessionProfileId)
        .in("notification_id", idBatch);
      if (readError) {
        if (!isMissingRelationError(readError)) {
          console.warn("Could not hydrate notification read state.", readError?.message || readError);
        }
        readStateUnavailable = true;
        break;
      }
      (readRows || []).forEach((readRow) => {
        const notificationId = String(readRow?.notification_id || "").trim();
        const userId = String(readRow?.user_id || "").trim();
        if (!isUuidValue(notificationId) || !userId) {
          return;
        }
        if (!readByNotificationId[notificationId]) {
          readByNotificationId[notificationId] = [];
        }
        readByNotificationId[notificationId].push(userId);
      });
    }
  }
  if (readStateUnavailable) {
    console.warn("Notification read-state table unavailable. Showing notifications as unread.");
  }

  const localNotifications = getNotifications();
  const localByDbId = new Map(
    localNotifications
      .map((entry) => [String(entry?.dbId || "").trim(), entry])
      .filter(([dbId]) => isUuidValue(dbId)),
  );
  const localUnsynced = localNotifications.filter((entry) => !isUuidValue(entry.dbId));
  const mappedRemoteNotifications = notificationRows
    .map((row) => {
      const dbId = String(row?.id || "").trim();
      const localMatch = localByDbId.get(dbId);
      const remoteReadBy = readByNotificationId[dbId] || [];
      const localReadBy = Array.isArray(localMatch?.readByUserIds) ? localMatch.readByUserIds : [];
      return mapRelationalNotificationRowToLocal(row, {
        readByUserIds: [...new Set([...remoteReadBy, ...localReadBy])],
      });
    })
    .filter(Boolean);

  saveNotificationsLocal([...localUnsynced, ...mappedRemoteNotifications]);
  return true;
}

async function createRelationalNotification(notificationPayload, actorUser, users = null) {
  const user = actorUser || getCurrentUser();
  if (!user) {
    return { ok: false, message: "You must be signed in to send notifications." };
  }
  const client = getRelationalClient();
  if (!client) {
    return { ok: false, message: "Supabase relational client is not available." };
  }

  const payload = normalizeNotificationRecord(notificationPayload);
  if (!payload) {
    return { ok: false, message: "Notification payload is invalid." };
  }
  const recipientProfileId = getNotificationTargetProfileId(payload, users);
  if (payload.targetType === "user" && !recipientProfileId) {
    return {
      ok: false,
      message: "Target user does not have a Supabase account yet. Notification was saved locally only.",
    };
  }
  if (payload.targetType === "year" && normalizeAcademicYearOrNull(payload.targetYear) === null) {
    return {
      ok: false,
      message: "Target year is invalid. Notification was saved locally only.",
    };
  }

  const creatorProfileId = String(getUserProfileId(user) || "").trim();
  const externalId = buildNotificationExternalId({
    targetType: payload.targetType,
    targetYear: payload.targetYear,
    baseId: payload.id,
  });
  const { data, error } = await client
    .from("notifications")
    .upsert([{
      external_id: externalId,
      recipient_user_id: recipientProfileId || null,
      title: payload.title,
      message: payload.body,
      created_by: isUuidValue(creatorProfileId) ? creatorProfileId : null,
      created_by_name: String(user.name || "Admin").trim() || "Admin",
      is_active: true,
    }], { onConflict: "external_id" })
    .select("id,external_id,recipient_user_id,title,message,created_by,created_by_name,created_at,is_active")
    .single();
  if (error) {
    if (isMissingRelationError(error)) {
      return { ok: false, message: "Notifications table is missing in Supabase. Run the new migration first." };
    }
    return { ok: false, message: error.message || "Could not save notification to Supabase." };
  }

  const mapped = mapRelationalNotificationRowToLocal(data, {
    readByUserIds: payload.readByUserIds,
  });
  return { ok: true, notification: mapped };
}

async function syncNotificationReadsToRelational(user, notificationDbIds) {
  const currentUser = user || getCurrentUser();
  const userProfileId = getCurrentSessionProfileId(currentUser);
  if (!isUuidValue(userProfileId)) {
    return { ok: false, message: "No active Supabase profile for this student." };
  }
  const ids = [...new Set(
    (Array.isArray(notificationDbIds) ? notificationDbIds : [])
      .map((id) => String(id || "").trim())
      .filter((id) => isUuidValue(id)),
  )];
  if (!ids.length) {
    return { ok: true };
  }

  const client = getRelationalClient();
  if (!client) {
    return { ok: false, message: "Supabase relational client is not available." };
  }

  for (const idBatch of splitIntoBatches(ids, RELATIONAL_UPSERT_BATCH_SIZE)) {
    const rows = idBatch.map((notificationId) => ({
      notification_id: notificationId,
      user_id: userProfileId,
      read_at: nowISO(),
    }));
    const { error } = await client
      .from("notification_reads")
      .upsert(rows, { onConflict: "notification_id,user_id" });
    if (error) {
      if (isMissingRelationError(error)) {
        return { ok: false, message: "Notifications read table is missing in Supabase. Run the new migration first." };
      }
      return { ok: false, message: error.message || "Could not sync notification read state." };
    }
  }

  return { ok: true };
}

async function hydrateRelationalSessions(currentUser) {
  const client = getRelationalClient();
  const userProfileId = String(getUserProfileId(currentUser) || "").trim();
  if (!client || !relationalSync.enabled || !isUuidValue(userProfileId)) {
    return;
  }

  const allUsers = getUsers();
  const localQuestionByDbId = Object.fromEntries(
    getQuestions()
      .filter((question) => question.dbId)
      .map((question) => [question.dbId, question.id]),
  );

  let blocksQuery = client
    .from("test_blocks")
    .select("id,external_id,user_id,mode,source,status,question_count,duration_minutes,time_remaining_sec,current_index,elapsed_seconds,created_at,updated_at,completed_at");
  const blocksResult = await fetchRowsPaged((from, to) => {
    let query = blocksQuery
      .order("updated_at", { ascending: false })
      .order("id", { ascending: true });
    if (currentUser.role !== "admin") {
      query = query.eq("user_id", userProfileId);
    }
    return query.range(from, to);
  });
  if (blocksResult.error) {
    return;
  }
  const blocks = Array.isArray(blocksResult.data) ? blocksResult.data : [];

  const blockIds = (blocks || []).map((block) => block.id);
  const items = [];
  for (const blockBatch of splitIntoBatches(blockIds, RELATIONAL_IN_BATCH_SIZE)) {
    const { data, error: itemsError } = await client
      .from("test_block_items")
      .select("block_id,position,question_id")
      .in("block_id", blockBatch)
      .order("position");
    if (itemsError) {
      return;
    }
    if (Array.isArray(data) && data.length) {
      items.push(...data);
    }
  }
  const responses = [];
  for (const blockBatch of splitIntoBatches(blockIds, RELATIONAL_IN_BATCH_SIZE)) {
    const { data, error: responsesError } = await client
      .from("test_responses")
      .select("block_id,question_id,selected_choice_labels,flagged,notes,submitted,answered_at")
      .in("block_id", blockBatch);
    if (responsesError) {
      return;
    }
    if (Array.isArray(data) && data.length) {
      responses.push(...data);
    }
  }

  const localUserIdByAuth = Object.fromEntries(
    allUsers
      .map((entry) => [getUserProfileId(entry), entry.id])
      .filter(([profileId]) => Boolean(profileId)),
  );
  const itemsByBlock = {};
  (items || []).forEach((item) => {
    if (!itemsByBlock[item.block_id]) {
      itemsByBlock[item.block_id] = [];
    }
    itemsByBlock[item.block_id].push(item);
  });
  const responsesByBlockQuestion = {};
  (responses || []).forEach((response) => {
    responsesByBlockQuestion[`${response.block_id}::${response.question_id}`] = response;
  });

  const mappedSessions = (blocks || []).map((block) => {
    const orderedItems = (itemsByBlock[block.id] || []).sort((a, b) => a.position - b.position);
    const questionIds = orderedItems.map((item) => localQuestionByDbId[item.question_id] || item.question_id);
    const responseMap = {};
    orderedItems.forEach((item) => {
      const localQuestionId = localQuestionByDbId[item.question_id] || item.question_id;
      const response = responsesByBlockQuestion[`${block.id}::${item.question_id}`];
      responseMap[localQuestionId] = {
        selected: Array.isArray(response?.selected_choice_labels) ? response.selected_choice_labels : [],
        flagged: Boolean(response?.flagged),
        struck: [],
        notes: String(response?.notes || ""),
        timeSpentSec: 0,
        highlightedLines: [],
        highlightedLineColors: {},
        highlightedChoices: {},
        textHighlights: buildEmptyTextHighlightStore(),
        submitted: Boolean(response?.submitted),
      };
    });

    const sessionId = String(block.external_id || block.id);
    return {
      id: sessionId,
      dbId: block.id,
      userId: localUserIdByAuth[block.user_id] || block.user_id,
      mode: String(block.mode || "tutor"),
      source: String(block.source || "all"),
      durationMin: Number(block.duration_minutes || 20),
      timeRemainingSec: block.time_remaining_sec == null ? null : Number(block.time_remaining_sec),
      paused: false,
      questionIds,
      responses: responseMap,
      currentIndex: Math.min(Math.max(Number(block.current_index || 0), 0), Math.max(0, questionIds.length - 1)),
      status: String(block.status || "in_progress"),
      lastQuestionAt: Date.now(),
      elapsedSec: Number(block.elapsed_seconds || 0),
      createdAt: block.created_at || nowISO(),
      updatedAt: block.updated_at || nowISO(),
      completedAt: block.completed_at || null,
      originSessionId: null,
    };
  });
  const localSessions = getSessions();
  const localSessionById = new Map(localSessions.map((session) => [String(session?.id || ""), session]));
  const mergedSessionById = new Map();

  mappedSessions.forEach((remoteSession) => {
    const sessionId = String(remoteSession?.id || "");
    if (!sessionId) {
      return;
    }

    const localSession = localSessionById.get(sessionId);
    if (!localSession) {
      mergedSessionById.set(sessionId, remoteSession);
      return;
    }
    mergedSessionById.set(sessionId, mergeSessionSnapshots(localSession, remoteSession));
  });

  localSessions.forEach((localSession) => {
    const sessionId = String(localSession?.id || "");
    if (!sessionId || mergedSessionById.has(sessionId)) {
      return;
    }
    mergedSessionById.set(sessionId, localSession);
  });

  saveLocalOnly(STORAGE_KEYS.sessions, [...mergedSessionById.values()]);
}

function getSyncScopeForUser(user = null) {
  const current = user || getCurrentUser();
  const scope = getUserProfileId(current);
  return scope || "";
}

function isUserScopedSyncKey(storageKey) {
  return USER_SCOPED_SYNC_KEY_SET.has(storageKey);
}

function isLegacySupabaseStateSyncKey(storageKey) {
  return LEGACY_SUPABASE_STATE_SYNC_KEY_SET.has(storageKey);
}

function buildRemoteSyncKey(storageKey, scope = "") {
  if (!SYNCABLE_STORAGE_KEYS.includes(storageKey)) {
    return "";
  }
  if (isUserScopedSyncKey(storageKey)) {
    return scope ? `u:${scope}:${storageKey}` : "";
  }
  return `g:${storageKey}`;
}

function getSyncQueryCandidates(storageKey, scope = "") {
  const candidates = [];
  const primary = buildRemoteSyncKey(storageKey, scope);
  if (primary) {
    candidates.push(primary);
  }
  // Backward compatibility for old deployments that used raw storage keys.
  if (!isUserScopedSyncKey(storageKey)) {
    candidates.push(storageKey);
  }
  return [...new Set(candidates)];
}

function sanitizeUserScopedPayload(storageKey, payload, user = null) {
  if (!isUserScopedSyncKey(storageKey)) {
    return payload;
  }
  const current = user || getCurrentUser();
  const currentUserId = String(current?.id || "").trim();
  if (!currentUserId) {
    return payload;
  }

  if (storageKey === STORAGE_KEYS.sessions) {
    const list = Array.isArray(payload) ? payload : [];
    return list
      .filter((session) => {
        const owner = String(session?.userId || "").trim();
        return !owner || owner === currentUserId;
      })
      .map((session) => ({
        ...session,
        userId: currentUserId,
      }));
  }

  if (storageKey === STORAGE_KEYS.topicNewSeen) {
    const source = isRecordObject(payload) ? payload : {};
    const currentValue = source[currentUserId];
    if (currentValue !== undefined) {
      return { [currentUserId]: normalizeTopicNewSeenState(currentValue) };
    }
    return { [currentUserId]: normalizeTopicNewSeenState(source) };
  }

  if (storageKey === STORAGE_KEYS.incorrectQueue || storageKey === STORAGE_KEYS.flashcards) {
    const source = payload && typeof payload === "object" ? payload : {};
    if (Array.isArray(source)) {
      return { [currentUserId]: source };
    }
    const currentValue = source[currentUserId];
    if (currentValue !== undefined) {
      return { [currentUserId]: currentValue };
    }
    return { [currentUserId]: [] };
  }

  return payload;
}

function isRecordObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getUserMergeMatchKeys(user) {
  if (!isRecordObject(user)) {
    return [];
  }
  const keys = [];
  const authId = String(user.supabaseAuthId || "").trim().toLowerCase();
  const id = String(user.id || "").trim().toLowerCase();
  const email = String(user.email || "").trim().toLowerCase();
  if (authId) {
    keys.push(`auth:${authId}`);
  }
  if (id) {
    keys.push(`id:${id}`);
  }
  if (email) {
    keys.push(`email:${email}`);
  }
  return [...new Set(keys)];
}

function mergeUserRecord(remoteUser, localUser) {
  const remoteCourses = Array.isArray(remoteUser?.assignedCourses) ? remoteUser.assignedCourses : [];
  const localCourses = Array.isArray(localUser?.assignedCourses) ? localUser.assignedCourses : [];
  const remoteEmail = String(remoteUser?.email || "").trim().toLowerCase();
  const localEmail = String(localUser?.email || "").trim().toLowerCase();
  const remotePhone = String(remoteUser?.phone || "").trim();
  const localPhone = String(localUser?.phone || "").trim();
  const remotePassword = String(remoteUser?.password || "").trim();
  const localPassword = String(localUser?.password || "").trim();
  return {
    ...(isRecordObject(localUser) ? localUser : {}),
    ...(isRecordObject(remoteUser) ? remoteUser : {}),
    id: String(remoteUser?.id || localUser?.id || "").trim(),
    supabaseAuthId: String(remoteUser?.supabaseAuthId || localUser?.supabaseAuthId || "").trim(),
    email: remoteEmail || localEmail,
    phone: remotePhone || localPhone,
    password: remotePassword || localPassword,
    assignedCourses: remoteCourses.length ? remoteCourses : localCourses,
    createdAt: String(remoteUser?.createdAt || localUser?.createdAt || nowISO()).trim(),
    approvedAt: remoteUser?.approvedAt || localUser?.approvedAt || null,
    approvedBy: remoteUser?.approvedBy || localUser?.approvedBy || null,
    profileCompleted: typeof remoteUser?.profileCompleted === "boolean"
      ? remoteUser.profileCompleted
      : Boolean(localUser?.profileCompleted),
  };
}

function shouldPreserveLocalUserRecord(user, activeUserId = "") {
  if (!isRecordObject(user)) {
    return false;
  }
  const normalizedActiveUserId = String(activeUserId || "").trim().toLowerCase();
  const localId = String(user.id || "").trim().toLowerCase();
  const authId = String(user.supabaseAuthId || "").trim().toLowerCase();
  return isLegacyDemoUser(user)
    || !hasSupabaseManagedIdentity(user)
    || (normalizedActiveUserId && (normalizedActiveUserId === localId || normalizedActiveUserId === authId));
}

function mergeHydratedUsersWithLocal(remotePayload) {
  const remoteUsers = Array.isArray(remotePayload) ? remotePayload.filter(isRecordObject) : [];
  const localUsers = load(STORAGE_KEYS.users, []);
  const normalizedLocalUsers = Array.isArray(localUsers) ? localUsers.filter(isRecordObject) : [];
  const activeUserId = String(load(STORAGE_KEYS.currentUserId, "") || "").trim();
  const localIndexByKey = new Map();
  normalizedLocalUsers.forEach((user, index) => {
    getUserMergeMatchKeys(user).forEach((key) => {
      if (!localIndexByKey.has(key)) {
        localIndexByKey.set(key, index);
      }
    });
  });

  const consumedLocalIndexes = new Set();
  const mergedUsers = remoteUsers.map((remoteUser) => {
    const matchingIndex = getUserMergeMatchKeys(remoteUser)
      .map((key) => localIndexByKey.get(key))
      .find((index) => Number.isInteger(index));
    if (!Number.isInteger(matchingIndex)) {
      return remoteUser;
    }
    consumedLocalIndexes.add(matchingIndex);
    return mergeUserRecord(remoteUser, normalizedLocalUsers[matchingIndex]);
  });

  normalizedLocalUsers.forEach((localUser, index) => {
    if (consumedLocalIndexes.has(index) || !shouldPreserveLocalUserRecord(localUser, activeUserId)) {
      return;
    }
    mergedUsers.push(localUser);
  });

  const dedupedUsers = [];
  const seenKeys = new Set();
  mergedUsers.forEach((user) => {
    const matchKeys = getUserMergeMatchKeys(user);
    const canonicalKey = matchKeys[0];
    if (!canonicalKey || seenKeys.has(canonicalKey)) {
      return;
    }
    seenKeys.add(canonicalKey);
    matchKeys.forEach((key) => seenKeys.add(key));
    dedupedUsers.push(user);
  });
  return dedupedUsers;
}

function parseSyncTimestampMs(value) {
  const ms = new Date(value || 0).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function cloneTextHighlightStore(value) {
  if (!isRecordObject(value)) {
    return buildEmptyTextHighlightStore();
  }
  try {
    return deepClone(value);
  } catch {
    return {
      lines: isRecordObject(value.lines) ? { ...value.lines } : {},
      choices: isRecordObject(value.choices) ? { ...value.choices } : {},
    };
  }
}

function hasPendingSessionSyncForId(sessionId = "") {
  const targetId = String(sessionId || "").trim();
  const activeSessionId = String(state.sessionId || "").trim();
  if (
    targetId
    && activeSessionId === targetId
    && state.route === "session"
    && (sessionSyncRuntime.dirty || sessionSyncRuntime.flushing || relationalSync.flushing)
  ) {
    return true;
  }

  const pendingSessions = relationalSync.pendingWrites.get(STORAGE_KEYS.sessions);
  if (!Array.isArray(pendingSessions) || !pendingSessions.length) {
    return false;
  }
  if (!targetId) {
    return true;
  }
  return pendingSessions.some((session) => String(session?.id || "").trim() === targetId);
}

function mergeSessionResponseSnapshots(localResponse, remoteResponse, preferLocal) {
  const local = isRecordObject(localResponse) ? localResponse : {};
  const remote = isRecordObject(remoteResponse) ? remoteResponse : {};
  const merged = preferLocal ? { ...remote, ...local } : { ...local, ...remote };

  merged.selected = preferLocal
    ? (Array.isArray(local.selected) ? [...local.selected] : (Array.isArray(remote.selected) ? [...remote.selected] : []))
    : (Array.isArray(remote.selected) ? [...remote.selected] : (Array.isArray(local.selected) ? [...local.selected] : []));
  merged.flagged = preferLocal ? Boolean(local.flagged ?? remote.flagged) : Boolean(remote.flagged ?? local.flagged);
  merged.notes = preferLocal
    ? String(local.notes ?? remote.notes ?? "")
    : String(remote.notes ?? local.notes ?? "");
  merged.submitted = preferLocal ? Boolean(local.submitted ?? remote.submitted) : Boolean(remote.submitted ?? local.submitted);
  merged.struck = Array.isArray(local.struck)
    ? [...local.struck]
    : (Array.isArray(remote.struck) ? [...remote.struck] : []);
  merged.timeSpentSec = Number.isFinite(Number(local.timeSpentSec))
    ? Number(local.timeSpentSec)
    : (Number.isFinite(Number(remote.timeSpentSec)) ? Number(remote.timeSpentSec) : 0);
  merged.highlightedLines = Array.isArray(local.highlightedLines)
    ? [...local.highlightedLines]
    : (Array.isArray(remote.highlightedLines) ? [...remote.highlightedLines] : []);
  merged.highlightedLineColors = isRecordObject(local.highlightedLineColors)
    ? { ...local.highlightedLineColors }
    : (isRecordObject(remote.highlightedLineColors) ? { ...remote.highlightedLineColors } : {});
  merged.highlightedChoices = isRecordObject(local.highlightedChoices)
    ? { ...local.highlightedChoices }
    : (isRecordObject(remote.highlightedChoices) ? { ...remote.highlightedChoices } : {});
  merged.textHighlights = isRecordObject(local.textHighlights)
    ? cloneTextHighlightStore(local.textHighlights)
    : (isRecordObject(remote.textHighlights) ? cloneTextHighlightStore(remote.textHighlights) : buildEmptyTextHighlightStore());

  return merged;
}

function shouldPreferLocalSessionSnapshot(sessionId, localSession, remoteSession) {
  const localUpdatedAtMs = parseSyncTimestampMs(localSession?.updatedAt);
  const remoteUpdatedAtMs = parseSyncTimestampMs(remoteSession?.updatedAt);
  if (localUpdatedAtMs > remoteUpdatedAtMs) {
    return true;
  }
  if (localUpdatedAtMs < remoteUpdatedAtMs) {
    return false;
  }
  if (hasPendingSessionSyncForId(sessionId)) {
    return true;
  }
  return String(localSession?.status || "") === "in_progress"
    && String(remoteSession?.status || "") === "in_progress";
}

function mergeSessionSnapshots(localSession, remoteSession) {
  const sessionId = String(remoteSession?.id || localSession?.id || "").trim();
  const preferLocal = shouldPreferLocalSessionSnapshot(sessionId, localSession, remoteSession);
  const merged = preferLocal ? { ...remoteSession, ...localSession } : { ...localSession, ...remoteSession };
  const localResponses = isRecordObject(localSession?.responses) ? localSession.responses : {};
  const remoteResponses = isRecordObject(remoteSession?.responses) ? remoteSession.responses : {};
  const responseQuestionIds = new Set([
    ...Object.keys(localResponses),
    ...Object.keys(remoteResponses),
  ]);
  const mergedResponses = {};
  responseQuestionIds.forEach((questionId) => {
    mergedResponses[questionId] = mergeSessionResponseSnapshots(
      localResponses[questionId],
      remoteResponses[questionId],
      preferLocal,
    );
  });
  merged.responses = mergedResponses;
  merged.questionIds = preferLocal
    ? [...(Array.isArray(localSession?.questionIds) ? localSession.questionIds : (Array.isArray(remoteSession?.questionIds) ? remoteSession.questionIds : []))]
    : [...(Array.isArray(remoteSession?.questionIds) ? remoteSession.questionIds : (Array.isArray(localSession?.questionIds) ? localSession.questionIds : []))];
  return merged;
}

function mergeHydratedSessionsWithLocal(remotePayload) {
  const remoteSessions = Array.isArray(remotePayload) ? remotePayload : [];
  const localSessions = getSessions();
  const localSessionById = new Map(localSessions.map((session) => [String(session?.id || ""), session]));
  const mergedSessionById = new Map();

  remoteSessions.forEach((remoteSession) => {
    const sessionId = String(remoteSession?.id || "");
    if (!sessionId) {
      return;
    }

    const localSession = localSessionById.get(sessionId);
    if (!localSession) {
      mergedSessionById.set(sessionId, remoteSession);
      return;
    }
    mergedSessionById.set(sessionId, mergeSessionSnapshots(localSession, remoteSession));
  });

  localSessions.forEach((localSession) => {
    const sessionId = String(localSession?.id || "");
    if (!sessionId || mergedSessionById.has(sessionId)) {
      return;
    }
    mergedSessionById.set(sessionId, localSession);
  });

  return [...mergedSessionById.values()];
}

function mergeHydratedCourseTopicGroupsWithLocal(remotePayload) {
  const remoteGroups = normalizeCourseTopicGroupMap(remotePayload);
  const localGroups = normalizeCourseTopicGroupMap(load(STORAGE_KEYS.courseTopicGroups, {}));
  const merged = {};
  CURRICULUM_COURSE_LIST.forEach((course) => {
    merged[course] = mergeCourseTopicGroupEntries(remoteGroups[course], localGroups[course], course);
  });
  return normalizeCourseTopicGroupMap(merged);
}

async function hydrateSupabaseSyncKeys(storageKeys, scope = "") {
  if (
    !supabaseSync.enabled ||
    !supabaseSync.client ||
    !supabaseSync.tableName ||
    !supabaseSync.storageKeyColumn ||
    !Array.isArray(storageKeys) ||
    !storageKeys.length
  ) {
    return { hadRemoteData: false };
  }

  const keySpecs = storageKeys.map((storageKey) => ({
    storageKey,
    candidates: getSyncQueryCandidates(storageKey, scope),
  }));
  const remoteKeys = [...new Set(keySpecs.flatMap((entry) => entry.candidates))];
  if (!remoteKeys.length) {
    return { hadRemoteData: false };
  }

  const { data, error } = await runWithTimeoutResult(
    supabaseSync.client
      .from(supabaseSync.tableName)
      .select(`${supabaseSync.storageKeyColumn},payload,updated_at`)
      .in(supabaseSync.storageKeyColumn, remoteKeys),
    SUPABASE_QUERY_TIMEOUT_MS,
    "Supabase sync fetch timed out.",
  );

  if (error) {
    return { hadRemoteData: false, error };
  }

  const rows = Array.isArray(data) ? data : [];
  let hadRemoteData = false;
  let shouldRehydrateCourseCatalog = false;
  keySpecs.forEach(({ storageKey, candidates }) => {
    const primaryKey = buildRemoteSyncKey(storageKey, scope);
    const primaryRows = primaryKey
      ? rows
        .filter((row) => String(row?.[supabaseSync.storageKeyColumn] || "") === primaryKey)
        .sort((a, b) => new Date(b?.updated_at || 0) - new Date(a?.updated_at || 0))
      : [];
    const fallbackRows = rows
      .filter((row) => candidates.includes(String(row?.[supabaseSync.storageKeyColumn] || "")))
      .sort((a, b) => new Date(b?.updated_at || 0) - new Date(a?.updated_at || 0));
    const selectedRow = primaryRows[0] || fallbackRows[0];
    if (!selectedRow) {
      return;
    }
    hadRemoteData = true;
    if (storageKey === STORAGE_KEYS.sessions && (state.route === "session" || state.route === "review")) {
      return;
    }
    try {
      let payload = sanitizeUserScopedPayload(storageKey, selectedRow.payload);
      const hasPendingWrite = candidates.some((candidate) => supabaseSync.pendingWrites.has(candidate));
      if (storageKey === STORAGE_KEYS.sessions) {
        payload = mergeHydratedSessionsWithLocal(payload);
      } else if (storageKey === STORAGE_KEYS.users) {
        payload = mergeHydratedUsersWithLocal(payload);
      } else if (storageKey === STORAGE_KEYS.courseTopicGroups) {
        payload = mergeHydratedCourseTopicGroupsWithLocal(payload);
      } else if (storageKey === STORAGE_KEYS.topicNewCatalog) {
        payload = mergeHydratedTopicNewCatalogWithLocal(payload);
      } else if (storageKey === STORAGE_KEYS.topicNewSeen) {
        payload = mergeHydratedTopicNewSeenWithLocal(payload);
      } else if (storageKey === STORAGE_KEYS.siteMaintenance) {
        const resolvedMaintenance = resolveHydratedSiteMaintenanceConfig(payload, { hasPendingWrite });
        payload = resolvedMaintenance.config;
        if (resolvedMaintenance.shouldResync) {
          scheduleSupabaseWrite(storageKey, payload);
        }
      }
      writeStorageKey(storageKey, payload);
      if (
        storageKey === STORAGE_KEYS.curriculum
        || storageKey === STORAGE_KEYS.courseTopics
        || storageKey === STORAGE_KEYS.courseTopicGroups
        || storageKey === STORAGE_KEYS.courseNotebookLinks
      ) {
        shouldRehydrateCourseCatalog = true;
      }
    } catch {
      // Ignore malformed remote payloads and keep local fallback.
    }
  });

  if (shouldRehydrateCourseCatalog) {
    rehydrateCourseCatalogConfigFromStorage();
  }

  return { hadRemoteData };
}

async function hydrateUserScopedSupabaseState(user) {
  const scope = getSyncScopeForUser(user);
  if (!scope) {
    return { hadRemoteData: false };
  }
  const result = await hydrateSupabaseSyncKeys(USER_SCOPED_SYNC_KEYS, scope);
  if (!result?.hadRemoteData) {
    scheduleFullSupabaseSync({ includeUserScoped: true, scope, user });
  }
  return result;
}

async function hydrateUsersFromSupabaseBackup() {
  if (!supabaseSync.enabled || !supabaseSync.client || !supabaseSync.tableName || !supabaseSync.storageKeyColumn) {
    const bootstrap = await initSupabaseSync().catch(() => ({ enabled: false }));
    if (!bootstrap?.enabled) {
      return false;
    }
  }
  const result = await hydrateSupabaseSyncKeys([STORAGE_KEYS.users]).catch((error) => ({ error }));
  if (result?.error || !result?.hadRemoteData) {
    return false;
  }
  syncUsersWithCurriculum();
  return true;
}

async function hydrateQuestionsFromSupabaseBackup() {
  if (!supabaseSync.enabled || !supabaseSync.client || !supabaseSync.tableName || !supabaseSync.storageKeyColumn) {
    const bootstrap = await initSupabaseSync().catch(() => ({ enabled: false }));
    if (!bootstrap?.enabled) {
      return false;
    }
  }
  const result = await hydrateSupabaseSyncKeys([STORAGE_KEYS.questions]).catch((error) => ({ error }));
  if (result?.error) {
    return false;
  }
  const questions = getQuestions();
  return Array.isArray(questions) && questions.some((question) => String(question?.stem || "").trim());
}

function scheduleSupabaseWrite(storageKey, value) {
  if (!supabaseSync.enabled || !isLegacySupabaseStateSyncKey(storageKey)) {
    return false;
  }

  const currentUser = getCurrentUser();
  const scope = getSyncScopeForUser(currentUser);
  const remoteKey = buildRemoteSyncKey(storageKey, scope);
  if (!remoteKey) {
    return false;
  }

  const payload = sanitizeUserScopedPayload(storageKey, value, currentUser);
  supabaseSync.pendingWrites.set(remoteKey, { storageKey, payload });
  scheduleSyncStatusUiRefresh();
  if (supabaseSync.flushTimer) {
    return true;
  }

  supabaseSync.flushTimer = window.setTimeout(() => {
    flushSupabaseWrites().catch((error) => {
      console.warn("Supabase write flush failed.", error);
    });
  }, SUPABASE_FLUSH_DEBOUNCE_MS);
  return true;
}

function scheduleFullSupabaseSync(options = {}) {
  const includeUserScoped = Boolean(options?.includeUserScoped);
  const currentUser = options?.user || getCurrentUser();
  const scope = options?.scope || getSyncScopeForUser(currentUser);
  const keys = includeUserScoped
    ? [...LEGACY_SUPABASE_STATE_GLOBAL_KEYS, ...LEGACY_SUPABASE_STATE_USER_SCOPED_KEYS]
    : LEGACY_SUPABASE_STATE_GLOBAL_KEYS;

  keys.forEach((storageKey) => {
    if (isUserScopedSyncKey(storageKey) && !scope) {
      return;
    }
    const localValue = load(storageKey, null);
    if (localValue != null) {
      scheduleSupabaseWrite(storageKey, localValue);
    }
  });
}

async function flushSupabaseWrites() {
  if (
    !supabaseSync.enabled ||
    !supabaseSync.client ||
    !supabaseSync.tableName ||
    !supabaseSync.storageKeyColumn ||
    !supabaseSync.pendingWrites.size ||
    supabaseSync.flushing
  ) {
    clearSupabaseFlushTimer();
    return;
  }

  if (typeof navigator !== "undefined" && navigator?.onLine === false) {
    clearSupabaseFlushTimer();
    supabaseSync.lastFailureAt = Date.now();
    supabaseSync.lastFailureMessage = "You are offline. Cloud backup sync is queued.";
    supabaseSync.retryAt = Date.now() + SUPABASE_RETRY_FLUSH_MS;
    supabaseSync.flushTimer = window.setTimeout(() => {
      flushSupabaseWrites().catch((flushError) => {
        console.warn("Supabase retry failed.", flushError);
      });
    }, SUPABASE_RETRY_FLUSH_MS);
    scheduleSyncStatusUiRefresh();
    return;
  }

  supabaseSync.flushing = true;
  scheduleSyncStatusUiRefresh();
  const rows = Array.from(supabaseSync.pendingWrites.entries()).map(([remoteStorageKey, pending]) => ({
    [supabaseSync.storageKeyColumn]: remoteStorageKey,
    payload: pending.payload,
    updated_at: nowISO(),
  }));
  supabaseSync.pendingWrites.clear();
  clearSupabaseFlushTimer();

  const restoreRowsToPending = () => {
    rows.forEach((row) => {
      const remoteStorageKey = row[supabaseSync.storageKeyColumn];
      if (remoteStorageKey) {
        const storageKey = String(remoteStorageKey).split(":").slice(-1)[0] || "";
        supabaseSync.pendingWrites.set(remoteStorageKey, {
          storageKey,
          payload: row.payload,
        });
      }
    });
  };
  try {
    const { error } = await runWithTimeoutResult(
      supabaseSync.client
        .from(supabaseSync.tableName)
        .upsert(rows, { onConflict: supabaseSync.storageKeyColumn }),
      SUPABASE_QUERY_TIMEOUT_MS,
      "Supabase backup sync timed out.",
    );
    if (error) {
      console.warn("Supabase sync error:", error.message);
      supabaseSync.lastFailureAt = Date.now();
      supabaseSync.lastFailureMessage = normalizeCloudSyncFailureMessage(error, "Cloud backup sync failed.");
      supabaseSync.retryAt = Date.now() + SUPABASE_RETRY_FLUSH_MS;
      restoreRowsToPending();
      if (!supabaseSync.flushTimer) {
        supabaseSync.flushTimer = window.setTimeout(() => {
          flushSupabaseWrites().catch((flushError) => {
            console.warn("Supabase retry failed.", flushError);
          });
        }, SUPABASE_RETRY_FLUSH_MS);
      }
      return;
    }
    supabaseSync.lastSuccessAt = Date.now();
    supabaseSync.lastFailureAt = 0;
    supabaseSync.lastFailureMessage = "";
    supabaseSync.retryAt = 0;
  } catch (error) {
    console.warn("Supabase sync error:", getErrorMessage(error, "Supabase sync failed."));
    supabaseSync.lastFailureAt = Date.now();
    supabaseSync.lastFailureMessage = normalizeCloudSyncFailureMessage(error, "Cloud backup sync failed.");
    supabaseSync.retryAt = Date.now() + SUPABASE_RETRY_FLUSH_MS;
    restoreRowsToPending();
    if (!supabaseSync.flushTimer) {
      supabaseSync.flushTimer = window.setTimeout(() => {
        flushSupabaseWrites().catch((flushError) => {
          console.warn("Supabase retry failed.", flushError);
        });
      }, SUPABASE_RETRY_FLUSH_MS);
    }
  } finally {
    supabaseSync.flushing = false;
    scheduleSyncStatusUiRefresh();
  }
}

function clearSupabaseFlushTimer() {
  if (supabaseSync.flushTimer) {
    window.clearTimeout(supabaseSync.flushTimer);
    supabaseSync.flushTimer = null;
  }
}

function resetSupabaseSyncRuntimeState() {
  supabaseSync.pendingWrites.clear();
  supabaseSync.flushing = false;
  supabaseSync.lastSuccessAt = 0;
  supabaseSync.lastFailureAt = 0;
  supabaseSync.lastFailureMessage = "";
  supabaseSync.retryAt = 0;
  clearSupabaseFlushTimer();
  scheduleSyncStatusUiRefresh();
}

async function flushRelationalWrites(options = {}) {
  const throwOnFailure = Boolean(options?.throwOnFailure);
  if (!relationalSync.pendingWrites.size || relationalSync.flushing) {
    clearRelationalFlushTimer();
    return;
  }
  if (!relationalSync.enabled) {
    clearRelationalFlushTimer();
    if (!relationalSync.lastFailureMessage && relationalSync.lastReadyError) {
      relationalSync.lastFailureMessage = relationalSync.lastReadyError;
      relationalSync.lastFailureAt = Date.now();
    }
    relationalSync.retryAt = Date.now() + RELATIONAL_RETRY_FLUSH_MS;
    relationalSync.flushTimer = window.setTimeout(() => {
      flushRelationalWrites().catch((error) => {
        console.warn("Relational retry flush failed.", error);
      });
    }, RELATIONAL_RETRY_FLUSH_MS);
    ensureRelationalSyncReady().then((ready) => {
      if (!ready) {
        return;
      }
      flushRelationalWrites().catch((error) => {
        console.warn("Relational sync flush failed.", error);
      });
    }).catch(() => { });
    scheduleSyncStatusUiRefresh();
    return;
  }

  if (typeof navigator !== "undefined" && navigator?.onLine === false) {
    clearRelationalFlushTimer();
    relationalSync.lastFailureAt = Date.now();
    relationalSync.lastFailureMessage = "You are offline. Cloud sync is queued.";
    relationalSync.retryAt = Date.now() + RELATIONAL_RETRY_FLUSH_MS;
    relationalSync.flushTimer = window.setTimeout(() => {
      flushRelationalWrites().catch((error) => {
        console.warn("Relational retry flush failed.", error);
      });
    }, RELATIONAL_RETRY_FLUSH_MS);
    scheduleSyncStatusUiRefresh();
    return;
  }

  clearRelationalFlushTimer();
  relationalSync.flushing = true;
  scheduleSyncStatusUiRefresh();
  const entryMap = new Map(relationalSync.pendingWrites.entries());
  relationalSync.pendingWrites.clear();
  if (entryMap.has(STORAGE_KEYS.curriculum) && entryMap.has(STORAGE_KEYS.courseTopics)) {
    entryMap.set(STORAGE_KEYS.curriculum, {
      [RELATIONAL_COMBINED_COURSE_SYNC_MARKER]: true,
      curriculum: entryMap.get(STORAGE_KEYS.curriculum),
      courseTopics: entryMap.get(STORAGE_KEYS.courseTopics),
    });
    entryMap.delete(STORAGE_KEYS.courseTopics);
  }
  const entries = Array.from(entryMap.entries());
  let firstError = null;
  let succeededCount = 0;
  const syncedStorageKeys = new Set();

  try {
    for (const [storageKey, payload] of entries) {
      try {
        await syncRelationalKey(storageKey, payload);
        succeededCount += 1;
        if (
          storageKey === STORAGE_KEYS.curriculum
          && payload
          && typeof payload === "object"
          && payload[RELATIONAL_COMBINED_COURSE_SYNC_MARKER] === true
        ) {
          syncedStorageKeys.add(STORAGE_KEYS.curriculum);
          syncedStorageKeys.add(STORAGE_KEYS.courseTopics);
        } else {
          syncedStorageKeys.add(storageKey);
        }
      } catch (error) {
        console.warn(`Relational sync failed for ${storageKey}.`, error?.message || error);
        relationalSync.pendingWrites.set(storageKey, payload);
        relationalSync.lastFailureAt = Date.now();
        relationalSync.lastFailureMessage = normalizeCloudSyncFailureMessage(error, "Cloud sync failed.");
        if (!firstError) {
          firstError = error instanceof Error ? error : new Error(getErrorMessage(error, "Relational sync failed."));
        }
      }
    }

    if (succeededCount > 0) {
      relationalSync.lastSuccessAt = Date.now();
      const shouldBroadcastStudentRefresh = (
        getCurrentUser()?.role === "admin"
        && [...syncedStorageKeys].some((storageKey) => AUTO_STUDENT_REFRESH_SYNC_KEYS.has(storageKey))
      );
      if (shouldBroadcastStudentRefresh) {
        queueStudentRefreshSignal({
          changedKeys: [...syncedStorageKeys],
          reason: "admin_sync",
          flushNow: false,
        });
      }
    }
    if (!relationalSync.pendingWrites.size) {
      relationalSync.retryAt = 0;
      relationalSync.lastFailureAt = 0;
      relationalSync.lastFailureMessage = "";
    }
  } finally {
    relationalSync.flushing = false;
    if (relationalSync.pendingWrites.size && !relationalSync.flushTimer) {
      relationalSync.retryAt = Date.now() + RELATIONAL_RETRY_FLUSH_MS;
      relationalSync.flushTimer = window.setTimeout(() => {
        flushRelationalWrites().catch((error) => {
          console.warn("Relational retry flush failed.", error);
        });
      }, RELATIONAL_RETRY_FLUSH_MS);
    }
    scheduleSyncStatusUiRefresh();
  }

  if (firstError && throwOnFailure) {
    throw firstError;
  }
}

async function flushPendingSyncNow(options = {}) {
  const throwOnRelationalFailure = options?.throwOnRelationalFailure !== false;
  clearSessionSyncTimer();
  queueSessionStateForCloud();
  if (relationalSync.flushing) {
    for (let attempt = 0; attempt < 30 && relationalSync.flushing; attempt += 1) {
      // Wait briefly for an in-flight flush to finish before forcing another write-through.
      await new Promise((resolve) => window.setTimeout(resolve, 100));
    }
  }
  let relationalError = null;
  if (relationalSync.pendingWrites.size) {
    try {
      await flushRelationalWrites({ throwOnFailure: throwOnRelationalFailure });
    } catch (error) {
      relationalError = error instanceof Error ? error : new Error(getErrorMessage(error, "Relational sync failed."));
    }
  }
  if (supabaseSync.pendingWrites.size) {
    await flushSupabaseWrites();
  }
  if (getPendingAdminActionQueue().length) {
    await flushPendingAdminActionQueue().catch(() => { });
  }
  await flushPendingNotificationReadSync().catch(() => { });
  await flushPendingNotificationOutbox().catch(() => { });
  scheduleSyncStatusUiRefresh();
  if (relationalError && throwOnRelationalFailure) {
    throw relationalError;
  }
}

function splitIntoBatches(items, batchSize) {
  const source = Array.isArray(items) ? items : [];
  const size = Math.max(1, Number(batchSize) || 1);
  const batches = [];
  for (let index = 0; index < source.length; index += size) {
    batches.push(source.slice(index, index + size));
  }
  return batches;
}

function getErrorMessage(error, fallback = "Unexpected error.") {
  if (!error) {
    return fallback;
  }
  if (typeof error === "string") {
    const normalized = error.trim();
    return normalized || fallback;
  }
  if (error instanceof Error) {
    const normalized = String(error.message || "").trim();
    return normalized || fallback;
  }

  const message = String(error?.message || "").trim();
  const details = String(error?.details || "").trim();
  const hint = String(error?.hint || "").trim();
  if (message && details) {
    return `${message} (${details})`;
  }
  if (message && hint) {
    return `${message} (${hint})`;
  }
  if (message) {
    return message;
  }
  if (details) {
    return details;
  }
  if (hint) {
    return hint;
  }

  try {
    const serialized = JSON.stringify(error);
    return serialized && serialized !== "{}" ? serialized : fallback;
  } catch {
    return fallback;
  }
}

async function fetchRowsPaged(fetchPage, options = {}) {
  const pageSize = Math.max(1, Number(options?.pageSize) || 1000);
  const rows = [];
  let from = 0;

  while (true) {
    const { data, error } = await runWithTimeoutResult(
      fetchPage(from, from + pageSize - 1),
      SUPABASE_QUERY_TIMEOUT_MS,
      "Supabase query timed out.",
    );
    if (error) {
      return { data: null, error };
    }
    const batch = Array.isArray(data) ? data : [];
    if (!batch.length) {
      break;
    }
    rows.push(...batch);
    if (batch.length < pageSize) {
      break;
    }
    from += pageSize;
  }

  return { data: rows, error: null };
}

async function runRelationalQueryWithTimeout(queryPromise, timeoutMessage = "Supabase query timed out.") {
  const { data, error } = await runWithTimeoutResult(
    queryPromise,
    SUPABASE_QUERY_TIMEOUT_MS,
    timeoutMessage,
  );
  if (error) {
    throw error;
  }
  return data;
}

function isMissingRelationError(error) {
  const code = String(error?.code || "").trim();
  if (code === "42P01" || code === "PGRST205") {
    return true;
  }
  const message = String(error?.message || "");
  if (/does not exist/i.test(message)) {
    return true;
  }
  if (/could not find the table/i.test(message) && /schema cache/i.test(message)) {
    return true;
  }
  return false;
}

function isMissingColumnError(error) {
  const code = String(error?.code || "").trim();
  if (code === "42703" || code === "PGRST204") {
    return true;
  }
  const message = String(error?.message || "");
  if (/column .* does not exist/i.test(message)) {
    return true;
  }
  if (/could not find the .* column of .* in the schema cache/i.test(message)) {
    return true;
  }
  return false;
}

function isStorageBucketMissingError(error) {
  const message = getErrorMessage(error, "").toLowerCase();
  const statusCode = String(error?.statusCode || error?.status || "").trim();
  return /bucket not found/i.test(message) || (statusCode === "404" && /bucket/i.test(message));
}

function isLikelyNetworkFetchError(error) {
  if (typeof navigator !== "undefined" && navigator?.onLine === false) {
    return true;
  }
  if (isTimeoutResultError(error)) {
    return true;
  }
  const message = getErrorMessage(error, "").toLowerCase();
  const statusCode = String(error?.statusCode || error?.status || "").trim();
  if (statusCode === "0") {
    return true;
  }
  return /failed to fetch|networkerror|network request failed|load failed|connection/i.test(message);
}

function sanitizeStoragePathSegment(value, fallback = "item") {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || fallback;
}

function resolveImageFileExtension(fileName, mimeType) {
  const normalizedMime = String(mimeType || "").trim().toLowerCase();
  const mimeMap = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  if (mimeMap[normalizedMime]) {
    return mimeMap[normalizedMime];
  }
  const match = String(fileName || "").trim().toLowerCase().match(/\.([a-z0-9]+)$/);
  const ext = String(match?.[1] || "").trim();
  if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) {
    return ext === "jpeg" ? "jpg" : ext;
  }
  return "png";
}

function convertFileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read selected image file."));
    reader.readAsDataURL(file);
  });
}

async function createInlineQuestionImageFallback(
  file,
  message,
  maxBytes = QUESTION_IMAGE_DATA_URL_FALLBACK_MAX_BYTES,
) {
  const limit = Number(maxBytes || 0);
  if (!(file instanceof File) || Number(file.size || 0) <= 0 || limit <= 0 || file.size > limit) {
    return null;
  }
  try {
    const fallbackDataUrl = await convertFileToDataUrl(file);
    if (!fallbackDataUrl) {
      return null;
    }
    return {
      ok: true,
      url: fallbackDataUrl,
      usedFallback: true,
      message: String(message || "Storage upload failed, so the image was saved inline."),
    };
  } catch {
    return null;
  }
}

function isInlineImageDataUrl(value) {
  return /^data:image\/(?:png|jpeg|jpg|webp|gif);base64,/i.test(String(value || "").trim());
}

async function uploadQuestionImageDataUrlToStorage(dataUrl, options = {}) {
  const normalizedDataUrl = String(dataUrl || "").trim();
  if (!isInlineImageDataUrl(normalizedDataUrl)) {
    return { ok: false, message: "Image is not a supported inline image payload." };
  }

  const client = options?.client || getRelationalClient() || getSupabaseAuthClient();
  if (!client) {
    return { ok: false, message: "Supabase session is unavailable. Log in again and retry." };
  }

  const bucket = String(options?.bucket || SUPABASE_CONFIG.questionImageBucket || "").trim();
  if (!bucket) {
    return { ok: false, message: "Question image bucket is not configured." };
  }

  let blob;
  try {
    const response = await fetch(normalizedDataUrl);
    blob = await response.blob();
  } catch (error) {
    return { ok: false, message: getErrorMessage(error, "Could not read inline image data.") };
  }

  if (!blob || !Number(blob.size || 0)) {
    return { ok: false, message: "Inline image payload is empty." };
  }
  if (blob.size > QUESTION_IMAGE_UPLOAD_MAX_BYTES) {
    return { ok: false, message: "Inline image is too large to upload. Max size is 5 MB." };
  }

  const normalizedType = String(blob.type || "").trim().toLowerCase();
  if (normalizedType && !QUESTION_IMAGE_ALLOWED_MIME_TYPES.has(normalizedType)) {
    return { ok: false, message: "Inline image type is unsupported." };
  }

  const currentUser = getCurrentUser();
  const userScope = sanitizeStoragePathSegment(currentUser?.supabaseAuthId || currentUser?.id || "admin", "admin");
  const extension = resolveImageFileExtension(`inline.${normalizedType.split("/")[1] || "png"}`, normalizedType);
  const fileId = sanitizeStoragePathSegment(makeId("qimg"), "qimg");
  const filePath = `questions/${userScope}/${Date.now()}-${fileId}.${extension}`;

  const { error: uploadError } = await client.storage
    .from(bucket)
    .upload(filePath, blob, {
      cacheControl: "3600",
      upsert: false,
      contentType: normalizedType || undefined,
    });
  if (uploadError) {
    return { ok: false, message: getErrorMessage(uploadError, "Could not upload question image.") };
  }

  let lastSignedError = null;
  for (const expiresIn of QUESTION_IMAGE_SIGNED_URL_EXPIRY_OPTIONS) {
    const { data: signedData, error: signedError } = await client.storage
      .from(bucket)
      .createSignedUrl(filePath, expiresIn);
    if (!signedError && signedData?.signedUrl) {
      return { ok: true, url: signedData.signedUrl };
    }
    if (signedError) {
      lastSignedError = signedError;
    }
  }

  return {
    ok: false,
    message: getErrorMessage(lastSignedError, "Image uploaded, but the app could not generate a usable URL."),
  };
}

async function promoteInlineQuestionImagesToStorage(questionsPayload, options = {}) {
  const questions = Array.isArray(questionsPayload) ? questionsPayload : [];
  if (!questions.length) {
    return { questions, changed: false };
  }
  if (typeof navigator !== "undefined" && navigator?.onLine === false) {
    return { questions, changed: false };
  }

  let changed = false;
  const uploadCache = new Map();
  const nextQuestions = questions.map((question) => {
    if (!question || typeof question !== "object") {
      return question;
    }
    return question;
  });

  for (let index = 0; index < nextQuestions.length; index += 1) {
    const question = nextQuestions[index];
    if (!question || typeof question !== "object") {
      continue;
    }

    let nextQuestion = question;
    for (const fieldName of ["questionImage", "explanationImage"]) {
      const fieldValue = String(question?.[fieldName] || "").trim();
      if (!isInlineImageDataUrl(fieldValue)) {
        continue;
      }

      let uploadResult = uploadCache.get(fieldValue) || null;
      if (!uploadResult) {
        uploadResult = await uploadQuestionImageDataUrlToStorage(fieldValue, options);
        uploadCache.set(fieldValue, uploadResult);
      }
      if (!uploadResult?.ok || !uploadResult?.url) {
        continue;
      }

      if (nextQuestion === question) {
        nextQuestion = { ...question };
      }
      nextQuestion[fieldName] = String(uploadResult.url || "").trim();
      changed = true;
    }

    nextQuestions[index] = nextQuestion;
  }

  return { questions: changed ? nextQuestions : questions, changed };
}

function normalizeQuestionChoiceLabel(value) {
  const label = String(value || "").trim().toUpperCase();
  return QUESTION_CHOICE_LABELS.includes(label) ? label : "";
}

function normalizeQuestionSortOrder(value) {
  const parsed = Number.parseInt(String(value ?? "").trim(), 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return null;
  }
  return parsed;
}

function normalizeQuestionChoiceEntries(choices) {
  const source = Array.isArray(choices) ? choices : [];
  const byLabel = new Map();
  source.forEach((choice) => {
    const label = normalizeQuestionChoiceLabel(choice?.id || choice?.choice_label || choice?.label);
    const text = String(choice?.text ?? choice?.choice_text ?? "").trim();
    if (!label || !text || byLabel.has(label)) {
      return;
    }
    byLabel.set(label, { id: label, text });
  });
  return QUESTION_CHOICE_LABELS
    .map((label) => byLabel.get(label))
    .filter(Boolean);
}

function isQuestionChoicePlaceholder(choice) {
  const label = normalizeQuestionChoiceLabel(choice?.id);
  const text = String(choice?.text || "").trim().toLowerCase();
  return Boolean(label) && text === `option ${label.toLowerCase()}`;
}

function shouldPreferExistingQuestionChoices(remoteChoices, existingChoices) {
  if (!remoteChoices.length && existingChoices.length >= 2) {
    return true;
  }
  if (remoteChoices.length < 2 && existingChoices.length >= 2) {
    return true;
  }
  const remoteAllPlaceholder = remoteChoices.length > 0 && remoteChoices.every((choice) => isQuestionChoicePlaceholder(choice));
  const existingHasMeaningful = existingChoices.length >= 2 && existingChoices.some((choice) => !isQuestionChoicePlaceholder(choice));
  return remoteAllPlaceholder && existingHasMeaningful;
}

function resolveQuestionCorrectAnswers(remoteCorrect, existingCorrect, choices) {
  const availableChoiceIds = new Set(
    normalizeQuestionChoiceEntries(choices).map((choice) => choice.id),
  );
  const normalizedRemote = [...new Set(
    (Array.isArray(remoteCorrect) ? remoteCorrect : [])
      .map((entry) => normalizeQuestionChoiceLabel(entry))
      .filter((entry) => availableChoiceIds.has(entry)),
  )];
  if (normalizedRemote.length) {
    return normalizedRemote;
  }
  const normalizedExisting = [...new Set(
    (Array.isArray(existingCorrect) ? existingCorrect : [])
      .map((entry) => normalizeQuestionChoiceLabel(entry))
      .filter((entry) => availableChoiceIds.has(entry)),
  )];
  if (normalizedExisting.length) {
    return normalizedExisting;
  }
  return [choices[0]?.id || "A"];
}

function isQuestionUsableForTesting(question) {
  const stem = String(question?.stem || "").trim();
  if (!stem) {
    return false;
  }

  const choices = normalizeQuestionChoiceEntries(question?.choices);
  if (choices.length < 2) {
    return false;
  }
  if (choices.every((choice) => isQuestionChoicePlaceholder(choice))) {
    return false;
  }

  const choiceIds = new Set(choices.map((choice) => choice.id));
  const correctIds = [...new Set(
    (Array.isArray(question?.correct) ? question.correct : [])
      .map((entry) => normalizeQuestionChoiceLabel(entry))
      .filter((entry) => choiceIds.has(entry)),
  )];
  return correctIds.length > 0;
}

function buildChoiceSyncSignature(rows) {
  const sorted = [...(Array.isArray(rows) ? rows : [])]
    .filter((entry) => normalizeQuestionChoiceLabel(entry?.choice_label))
    .sort((a, b) => {
      const labelA = normalizeQuestionChoiceLabel(a?.choice_label);
      const labelB = normalizeQuestionChoiceLabel(b?.choice_label);
      return labelA.localeCompare(labelB);
    });
  return sorted
    .map((entry) => {
      const label = normalizeQuestionChoiceLabel(entry?.choice_label);
      const text = String(entry?.choice_text || "").trim();
      const isCorrect = Boolean(entry?.is_correct);
      return `${label}:${text}:${isCorrect ? 1 : 0}`;
    })
    .join("|");
}

function buildQuestionChoiceSyncPlan(sourceQuestions, idMap = {}) {
  const questions = Array.isArray(sourceQuestions) ? sourceQuestions : [];
  const mapping = idMap && typeof idMap === "object" ? idMap : {};
  const rows = [];
  const questionIds = [];
  const signatureByQuestionId = new Map();
  const skippedQuestionIds = [];
  const seenQuestionIds = new Set();

  questions.forEach((question) => {
    const externalId = String(question?.id || "").trim();
    const mappedDbId = String(mapping[externalId] || question?.dbId || "").trim();
    if (!isUuidValue(mappedDbId) || seenQuestionIds.has(mappedDbId)) {
      return;
    }
    seenQuestionIds.add(mappedDbId);

    const normalizedChoices = normalizeQuestionChoiceEntries(question?.choices);
    if (normalizedChoices.length < 2) {
      skippedQuestionIds.push(externalId || mappedDbId);
      return;
    }
    const normalizedCorrect = resolveQuestionCorrectAnswers(question?.correct, [], normalizedChoices);
    const correctSet = new Set(normalizedCorrect);
    const questionRows = normalizedChoices.map((choice) => ({
      question_id: mappedDbId,
      choice_label: choice.id,
      choice_text: choice.text,
      is_correct: correctSet.has(choice.id),
    }));

    questionIds.push(mappedDbId);
    signatureByQuestionId.set(mappedDbId, buildChoiceSyncSignature(questionRows));
    rows.push(...questionRows);
  });

  return {
    rows,
    questionIds,
    signatureByQuestionId,
    skippedQuestionIds,
  };
}

async function verifyQuestionChoiceSync(client, questionIds, expectedSignatureByQuestionId) {
  const targetIds = [...new Set((Array.isArray(questionIds) ? questionIds : []).filter((id) => isUuidValue(id)))];
  if (!targetIds.length) {
    return;
  }

  const remoteRows = [];
  for (const questionIdBatch of splitIntoBatches(targetIds, RELATIONAL_IN_BATCH_SIZE)) {
    const data = await runRelationalQueryWithTimeout(
      client
        .from("question_choices")
        .select("question_id,choice_label,choice_text,is_correct")
        .in("question_id", questionIdBatch),
      "Question choice verification timed out.",
    );
    if (Array.isArray(data) && data.length) {
      remoteRows.push(...data);
    }
  }

  const remoteRowsByQuestionId = new Map();
  remoteRows.forEach((row) => {
    const questionId = String(row?.question_id || "").trim();
    if (!isUuidValue(questionId)) {
      return;
    }
    if (!remoteRowsByQuestionId.has(questionId)) {
      remoteRowsByQuestionId.set(questionId, []);
    }
    remoteRowsByQuestionId.get(questionId).push(row);
  });

  const mismatchedQuestionIds = [];
  targetIds.forEach((questionId) => {
    const expectedSignature = String(expectedSignatureByQuestionId?.get(questionId) || "");
    const actualSignature = buildChoiceSyncSignature(remoteRowsByQuestionId.get(questionId) || []);
    if (expectedSignature !== actualSignature) {
      mismatchedQuestionIds.push(questionId);
    }
  });

  if (mismatchedQuestionIds.length) {
    throw new Error(`Question choice sync verification failed for ${mismatchedQuestionIds.length} question(s).`);
  }
}

async function getRelationalQuestionColumnSupport(client) {
  if (relationalQuestionColumnSupport.checked) {
    return relationalQuestionColumnSupport;
  }
  if (!client) {
    return relationalQuestionColumnSupport;
  }

  const checkColumn = async (columnName) => {
    const { error } = await runWithTimeoutResult(
      client.from("questions").select(columnName).limit(1),
      SUPABASE_QUERY_TIMEOUT_MS,
      `Question column check for ${columnName} timed out.`,
    );
    if (!error) {
      return true;
    }
    if (isMissingRelationError(error) || isMissingColumnError(error)) {
      return false;
    }
    throw error;
  };

  relationalQuestionColumnSupport.questionImageUrl = await checkColumn("question_image_url");
  relationalQuestionColumnSupport.explanationImageUrl = await checkColumn("explanation_image_url");
  relationalQuestionColumnSupport.sortOrder = await checkColumn("sort_order");
  relationalQuestionColumnSupport.checked = true;
  return relationalQuestionColumnSupport;
}

async function uploadQuestionImageFile(file) {
  if (!(file instanceof File) || !Number(file.size || 0)) {
    return { ok: false, message: "No image file selected." };
  }

  if (file.size > QUESTION_IMAGE_UPLOAD_MAX_BYTES) {
    return { ok: false, message: "Image is too large. Max size is 5 MB." };
  }

  const normalizedType = String(file.type || "").trim().toLowerCase();
  if (normalizedType && !QUESTION_IMAGE_ALLOWED_MIME_TYPES.has(normalizedType)) {
    return { ok: false, message: "Unsupported file type. Use PNG, JPG, WEBP, or GIF." };
  }

  if (typeof navigator !== "undefined" && navigator?.onLine === false) {
    const offlineFallback = await createInlineQuestionImageFallback(
      file,
      "You are offline. The image was saved locally and will sync to cloud when you are online again.",
      QUESTION_IMAGE_UPLOAD_MAX_BYTES,
    );
    if (offlineFallback) {
      return offlineFallback;
    }
  }

  const client = getRelationalClient() || getSupabaseAuthClient();
  if (!client) {
    const noSessionFallback = await createInlineQuestionImageFallback(
      file,
      "No active cloud session was found. The image was saved locally and will sync when cloud access is restored.",
      QUESTION_IMAGE_UPLOAD_MAX_BYTES,
    );
    if (noSessionFallback) {
      return noSessionFallback;
    }
    return { ok: false, message: "Supabase session is unavailable. Log in again and retry." };
  }

  const bucket = String(SUPABASE_CONFIG.questionImageBucket || "").trim();
  if (!bucket) {
    return { ok: false, message: "Question image bucket is not configured." };
  }

  const currentUser = getCurrentUser();
  const userScope = sanitizeStoragePathSegment(currentUser?.supabaseAuthId || currentUser?.id || "admin", "admin");
  const extension = resolveImageFileExtension(file.name, file.type);
  const fileId = sanitizeStoragePathSegment(makeId("qimg"), "qimg");
  const filePath = `questions/${userScope}/${Date.now()}-${fileId}.${extension}`;

  const { error: uploadError } = await client.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: normalizedType || undefined,
    });

  if (uploadError) {
    const bucketMissing = isStorageBucketMissingError(uploadError);
    const networkIssue = isLikelyNetworkFetchError(uploadError);
    const uploadFallback = await createInlineQuestionImageFallback(
      file,
      bucketMissing
        ? `Storage bucket "${bucket}" was not found, so the image was saved inline.`
        : networkIssue
          ? "Network is unavailable. The image was saved locally and will sync when you are online again."
          : "Storage upload failed, so the image was saved inline.",
      QUESTION_IMAGE_UPLOAD_MAX_BYTES,
    );
    if (uploadFallback) {
      return uploadFallback;
    }
    return {
      ok: false,
      message: uploadError.message || "Could not upload question image.",
    };
  }

  let lastSignedError = null;
  for (const expiresIn of QUESTION_IMAGE_SIGNED_URL_EXPIRY_OPTIONS) {
    const { data: signedData, error: signedError } = await client.storage
      .from(bucket)
      .createSignedUrl(filePath, expiresIn);
    if (!signedError && signedData?.signedUrl) {
      return { ok: true, url: signedData.signedUrl };
    }
    if (signedError) {
      lastSignedError = signedError;
    }
  }

  const signedNetworkIssue = isLikelyNetworkFetchError(lastSignedError);
  const signedUrlFallback = await createInlineQuestionImageFallback(
    file,
    signedNetworkIssue
      ? "Cloud link generation failed due to a network issue. The image was saved locally and will sync when online."
      : "Image uploaded, but the app could not generate a secure link. The image was saved inline instead.",
    QUESTION_IMAGE_UPLOAD_MAX_BYTES,
  );
  if (signedUrlFallback) {
    return signedUrlFallback;
  }

  return {
    ok: false,
    message: getErrorMessage(lastSignedError, "Image uploaded, but the app could not generate a usable URL."),
  };
}

function isQuestionChoiceForeignKeyError(error) {
  const code = String(error?.code || "").trim();
  const message = String(error?.message || "");
  if (code === "23503" && /question_id/i.test(message)) {
    return true;
  }
  return /question_choices_question_id_fkey/i.test(message);
}

function cloneQuestionsPayloadForSync(payload) {
  const questions = Array.isArray(payload) ? payload : [];
  try {
    return deepClone(questions);
  } catch {
    return questions.map((question) => ({ ...question }));
  }
}

async function syncRelationalKey(storageKey, payload) {
  if (!relationalSync.enabled) {
    return;
  }

  if (storageKey === STORAGE_KEYS.users) {
    await syncProfilesToRelational(payload);
    return;
  }
  if (storageKey === STORAGE_KEYS.curriculum || storageKey === STORAGE_KEYS.courseTopics) {
    const bundledCourseSyncPayload = (
      storageKey === STORAGE_KEYS.curriculum
      && payload
      && typeof payload === "object"
      && payload[RELATIONAL_COMBINED_COURSE_SYNC_MARKER] === true
    )
      ? payload
      : null;
    const curriculum = storageKey === STORAGE_KEYS.curriculum
      ? (bundledCourseSyncPayload ? bundledCourseSyncPayload.curriculum : payload)
      : load(STORAGE_KEYS.curriculum, O6U_CURRICULUM);
    const topics = storageKey === STORAGE_KEYS.courseTopics
      ? payload
      : (bundledCourseSyncPayload ? bundledCourseSyncPayload.courseTopics : load(STORAGE_KEYS.courseTopics, COURSE_TOPIC_OVERRIDES));
    await syncCoursesTopicsToRelational(curriculum, topics);
    return;
  }
  if (storageKey === STORAGE_KEYS.questions) {
    await syncQuestionsToRelational(payload);
    return;
  }
  if (storageKey === STORAGE_KEYS.sessions) {
    await syncSessionsToRelational(payload);
  }
}

async function syncProfilesToRelational(usersPayload) {
  const client = getRelationalClient();
  if (!client) {
    return;
  }

  const currentUser = getCurrentUser();
  const isAdminSync = currentUser?.role === "admin";
  let users = Array.isArray(usersPayload) ? usersPayload : [];
  if (!isAdminSync) {
    const currentProfileId = getUserProfileId(currentUser);
    if (!currentProfileId) {
      return;
    }
    users = users.filter((user) => getUserProfileId(user) === currentProfileId);
  }

  const rows = users
    .map((user) => {
      const profileId = getUserProfileId(user);
      if (!profileId) {
        return null;
      }
      const normalizedYear = normalizeAcademicYearOrNull(user.academicYear);
      const normalizedSemester = normalizeAcademicSemesterOrNull(user.academicSemester);
      const normalizedAuthProvider = normalizeAuthProvider(user.authProvider);
      const baseRow = {
        id: profileId,
        full_name: String(user.name || "").trim() || "Student",
        email: String(user.email || "").trim().toLowerCase(),
        phone: String(user.phone || "").trim() || null,
        role: isAdminSync ? (user.role === "admin" ? "admin" : "student") : "student",
        academic_year: user.role === "student" ? normalizedYear : null,
        academic_semester: user.role === "student" ? normalizedSemester : null,
        auth_provider: normalizedAuthProvider || null,
      };
      const hasExplicitApproval = typeof user.isApproved === "boolean";
      const shouldPersistApproval = isAdminSync || hasExplicitApproval || shouldAutoApproveStudentAccess(user);
      if (shouldPersistApproval) {
        baseRow.approved = Boolean(isAdminSync ? isUserAccessApproved(user) : user.isApproved);
      }
      return baseRow;
    })
    .filter(Boolean);
  if (!rows.length) {
    return;
  }

  for (const rowBatch of splitIntoBatches(rows, RELATIONAL_UPSERT_BATCH_SIZE)) {
    await runRelationalQueryWithTimeout(
      client.from("profiles").upsert(rowBatch, { onConflict: "id" }),
      "Profile sync timed out.",
    );
  }

  const enrollmentSyncOptions = {
    assignedByAuthId: isAdminSync && isUuidValue(getCurrentUser()?.supabaseAuthId) ? getCurrentUser().supabaseAuthId : null,
  };
  try {
    await syncUserCourseEnrollmentsToRelational(users, enrollmentSyncOptions);
  } catch (enrollmentError) {
    if (isAdminSync) {
      throw enrollmentError;
    }
    console.warn("Could not sync student enrollment rows during profile sync.", enrollmentError?.message || enrollmentError);
  }
}

async function syncUserCourseEnrollmentsToRelational(usersPayload, options = {}) {
  const client = getRelationalClient();
  if (!client) {
    return;
  }

  const users = Array.isArray(usersPayload) ? usersPayload : [];
  const students = users.filter((user) => user?.role === "student" && Boolean(getUserProfileId(user)));
  if (!students.length) {
    return;
  }

  try {
    const courses = await runRelationalQueryWithTimeout(
      client
        .from("courses")
        .select("id,course_name")
        .eq("is_active", true),
      "Course lookup timed out during enrollment sync.",
    );

    const courseIdByName = Object.fromEntries(
      (courses || [])
        .map((course) => [String(course?.course_name || "").trim(), String(course?.id || "").trim()])
        .filter(([courseName, courseId]) => courseName && isUuidValue(courseId)),
    );

    const enrollmentRows = [];
    const desiredCourseIdsByUserId = new Map();
    students.forEach((student) => {
      const userId = getUserProfileId(student);
      const enrollmentYear = normalizeAcademicYearOrNull(student.academicYear);
      const enrollmentSemester = normalizeAcademicSemesterOrNull(student.academicSemester);
      const curriculumCourses = enrollmentYear !== null && enrollmentSemester !== null
        ? getCurriculumCourses(enrollmentYear, enrollmentSemester)
        : [];
      const selectedCourses = sanitizeCourseAssignments(
        curriculumCourses.length
          ? curriculumCourses
          : (student.assignedCourses || []),
      );
      const desiredCourseIds = new Set(
        selectedCourses
          .map((courseName) => courseIdByName[String(courseName || "").trim()])
          .filter((courseId) => isUuidValue(courseId)),
      );
      desiredCourseIdsByUserId.set(userId, desiredCourseIds);
      desiredCourseIds.forEach((courseId) => {
        enrollmentRows.push({
          user_id: userId,
          course_id: courseId,
          assigned_by: isUuidValue(options.assignedByAuthId) ? options.assignedByAuthId : null,
        });
      });
    });

    for (const batch of splitIntoBatches(enrollmentRows, RELATIONAL_UPSERT_BATCH_SIZE)) {
      await runRelationalQueryWithTimeout(
        client
          .from("user_course_enrollments")
          .upsert(batch, { onConflict: "user_id,course_id" }),
        "Enrollment sync timed out.",
      );
    }

    const userIds = [...new Set(students.map((student) => getUserProfileId(student)).filter(isUuidValue))];
    const existingEnrollmentRows = [];
    for (const userBatch of splitIntoBatches(userIds, RELATIONAL_IN_BATCH_SIZE)) {
      const data = await runRelationalQueryWithTimeout(
        client
          .from("user_course_enrollments")
          .select("user_id,course_id")
          .in("user_id", userBatch),
        "Enrollment verification timed out.",
      );
      if (Array.isArray(data) && data.length) {
        existingEnrollmentRows.push(...data);
      }
    }

    const existingCourseIdsByUserId = new Map();
    existingEnrollmentRows.forEach((row) => {
      const userId = String(row?.user_id || "").trim();
      const courseId = String(row?.course_id || "").trim();
      if (!isUuidValue(userId) || !isUuidValue(courseId)) {
        return;
      }
      if (!existingCourseIdsByUserId.has(userId)) {
        existingCourseIdsByUserId.set(userId, new Set());
      }
      existingCourseIdsByUserId.get(userId).add(courseId);
    });

    for (const userId of userIds) {
      const desired = desiredCourseIdsByUserId.get(userId) || new Set();
      const existing = existingCourseIdsByUserId.get(userId) || new Set();
      const removeCourseIds = [...existing].filter((courseId) => !desired.has(courseId));
      for (const courseBatch of splitIntoBatches(removeCourseIds, RELATIONAL_DELETE_BATCH_SIZE)) {
        await runRelationalQueryWithTimeout(
          client
            .from("user_course_enrollments")
            .delete()
            .eq("user_id", userId)
            .in("course_id", courseBatch),
          "Enrollment cleanup timed out.",
        );
      }
    }
  } catch (error) {
    if (isMissingRelationError(error)) {
      return;
    }
    throw error;
  }
}

async function syncCoursesTopicsToRelational(curriculumPayload, topicPayload) {
  const client = getRelationalClient();
  if (!client) {
    return;
  }

  const curriculum = normalizeCurriculum(curriculumPayload || O6U_CURRICULUM);
  const topicsByCourseName = normalizeCourseTopicMap(topicPayload || COURSE_TOPIC_OVERRIDES);

  const desiredCourses = [];
  for (let year = 1; year <= 5; year += 1) {
    for (let semester = 1; semester <= 2; semester += 1) {
      const entries = sanitizeCurriculumCourseList(curriculum?.[year]?.[semester] || []);
      entries.forEach((courseName) => {
        desiredCourses.push({
          course_name: courseName,
          course_code: extractCourseCode(courseName),
          academic_year: year,
          academic_semester: semester,
          is_active: true,
        });
      });
    }
  }

  if (desiredCourses.length) {
    for (const courseBatch of splitIntoBatches(desiredCourses, RELATIONAL_UPSERT_BATCH_SIZE)) {
      await runRelationalQueryWithTimeout(
        client
          .from("courses")
          .upsert(courseBatch, { onConflict: "course_name,academic_year,academic_semester" }),
        "Course sync timed out.",
      );
    }
  }

  const allCoursesResult = await fetchRowsPaged((from, to) => (
    client
      .from("courses")
      .select("id,course_name,academic_year,academic_semester,is_active")
      .order("academic_year", { ascending: true })
      .order("academic_semester", { ascending: true })
      .order("course_name", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to)
  ));
  if (allCoursesResult.error) {
    throw allCoursesResult.error;
  }
  const allCourses = Array.isArray(allCoursesResult.data) ? allCoursesResult.data : [];

  const desiredCourseKeys = new Set(
    desiredCourses.map((course) => `${course.course_name}::${course.academic_year}::${course.academic_semester}`),
  );

  const deactivateCourseIds = (allCourses || [])
    .filter((course) => course.is_active)
    .filter((course) => !desiredCourseKeys.has(`${course.course_name}::${course.academic_year}::${course.academic_semester}`))
    .map((course) => course.id);
  for (const deactivateBatch of splitIntoBatches(deactivateCourseIds, RELATIONAL_DELETE_BATCH_SIZE)) {
    await runRelationalQueryWithTimeout(
      client
        .from("courses")
        .update({ is_active: false })
        .in("id", deactivateBatch),
      "Course deactivation sync timed out.",
    );
  }

  const courseRowsByName = {};
  (allCourses || []).forEach((course) => {
    if (!courseRowsByName[course.course_name] || course.is_active) {
      courseRowsByName[course.course_name] = course;
    }
  });

  const desiredTopicRows = [];
  Object.entries(topicsByCourseName || {}).forEach(([courseName, topics]) => {
    const course = courseRowsByName[courseName];
    if (!course) {
      return;
    }
    const normalized = normalizeCourseTopicList(topics, courseName);
    normalized.forEach((topicName, index) => {
      desiredTopicRows.push({
        course_id: course.id,
        topic_name: topicName,
        sort_order: index + 1,
        is_active: true,
      });
    });
  });

  if (desiredTopicRows.length) {
    for (const topicBatch of splitIntoBatches(desiredTopicRows, RELATIONAL_UPSERT_BATCH_SIZE)) {
      await runRelationalQueryWithTimeout(
        client
          .from("course_topics")
          .upsert(topicBatch, { onConflict: "course_id,topic_name" }),
        "Course topic sync timed out.",
      );
    }
  }

  const allTopicsResult = await fetchRowsPaged((from, to) => (
    client
      .from("course_topics")
      .select("id,course_id,topic_name,is_active")
      .order("course_id", { ascending: true })
      .order("topic_name", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to)
  ));
  if (allTopicsResult.error) {
    throw allTopicsResult.error;
  }
  const allTopics = Array.isArray(allTopicsResult.data) ? allTopicsResult.data : [];
  const desiredTopicKeys = new Set(desiredTopicRows.map((topic) => `${topic.course_id}::${topic.topic_name}`));
  const deactivateTopicIds = (allTopics || [])
    .filter((topic) => topic.is_active)
    .filter((topic) => !desiredTopicKeys.has(`${topic.course_id}::${topic.topic_name}`))
    .map((topic) => topic.id);
  for (const deactivateBatch of splitIntoBatches(deactivateTopicIds, RELATIONAL_DELETE_BATCH_SIZE)) {
    await runRelationalQueryWithTimeout(
      client
        .from("course_topics")
        .update({ is_active: false })
        .in("id", deactivateBatch),
      "Course topic cleanup timed out.",
    );
  }
}

async function deleteRelationalQuestionsAndDependents(client, questionIds) {
  const ids = [...new Set((Array.isArray(questionIds) ? questionIds : []).map((id) => String(id || "").trim()).filter(isUuidValue))];
  if (!ids.length) {
    return;
  }

  for (const idBatch of splitIntoBatches(ids, RELATIONAL_DELETE_BATCH_SIZE)) {
    await runRelationalQueryWithTimeout(
      client
        .from("question_choices")
        .delete()
        .in("question_id", idBatch),
      "Question choice cleanup timed out.",
    );
  }

  for (const idBatch of splitIntoBatches(ids, RELATIONAL_DELETE_BATCH_SIZE)) {
    await runRelationalQueryWithTimeout(
      client
        .from("test_responses")
        .delete()
        .in("question_id", idBatch),
      "Question response cleanup timed out.",
    );
  }

  for (const idBatch of splitIntoBatches(ids, RELATIONAL_DELETE_BATCH_SIZE)) {
    await runRelationalQueryWithTimeout(
      client
        .from("test_block_items")
        .delete()
        .in("question_id", idBatch),
      "Question block-item cleanup timed out.",
    );
  }

  for (const idBatch of splitIntoBatches(ids, RELATIONAL_DELETE_BATCH_SIZE)) {
    await runRelationalQueryWithTimeout(
      client
        .from("questions")
        .delete()
        .in("id", idBatch),
      "Question cleanup timed out.",
    );
  }
}

async function syncQuestionsToRelational(questionsPayload) {
  queuedQuestionSyncPayload = cloneQuestionsPayloadForSync(questionsPayload);
  if (questionSyncInFlightPromise) {
    return questionSyncInFlightPromise;
  }

  questionSyncInFlightPromise = (async () => {
    let lastError = null;
    while (queuedQuestionSyncPayload) {
      const nextPayload = queuedQuestionSyncPayload;
      queuedQuestionSyncPayload = null;
      try {
        await syncQuestionsToRelationalUnsafe(nextPayload);
        lastError = null;
      } catch (error) {
        lastError = error;
      }
    }
    if (lastError) {
      throw lastError;
    }
  })();

  try {
    await questionSyncInFlightPromise;
  } finally {
    questionSyncInFlightPromise = null;
  }
}

async function syncQuestionsToRelationalUnsafe(questionsPayload) {
  const client = getRelationalClient();
  const currentUser = getCurrentUser();
  if (!client || !currentUser) {
    return;
  }

  let questions = Array.isArray(questionsPayload) ? questionsPayload : [];
  const promotedInlineImages = await promoteInlineQuestionImagesToStorage(questions, {
    client,
    bucket: SUPABASE_CONFIG.questionImageBucket,
  });
  if (promotedInlineImages.changed) {
    questions = promotedInlineImages.questions;
    saveLocalOnly(STORAGE_KEYS.questions, questions);
  }
  const payloadExternalIds = [...new Set(
    questions
      .map((question) => String(question?.id || "").trim())
      .filter(Boolean),
  )];
  const existingByExternalId = {};
  for (const externalIdBatch of splitIntoBatches(payloadExternalIds, RELATIONAL_IN_BATCH_SIZE)) {
    const existingRows = await runRelationalQueryWithTimeout(
      client
        .from("questions")
        .select("id,external_id")
        .in("external_id", externalIdBatch),
      "Question lookup timed out.",
    );
    (existingRows || []).forEach((row) => {
      const externalId = String(row?.external_id || "").trim();
      if (!externalId || !isUuidValue(row?.id)) {
        return;
      }
      existingByExternalId[externalId] = row.id;
    });
  }

  let courses = [];
  let topics = [];
  const loadActiveCourseTopicRows = async () => {
    const coursesResult = await fetchRowsPaged((from, to) => (
      client
        .from("courses")
        .select("id,course_name,is_active")
        .eq("is_active", true)
        .order("course_name", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to)
    ));
    if (coursesResult.error) {
      throw coursesResult.error;
    }
    const topicsResult = await fetchRowsPaged((from, to) => (
      client
        .from("course_topics")
        .select("id,course_id,topic_name,is_active")
        .eq("is_active", true)
        .order("course_id", { ascending: true })
        .order("topic_name", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to)
    ));
    if (topicsResult.error) {
      throw topicsResult.error;
    }
    courses = Array.isArray(coursesResult.data) ? coursesResult.data : [];
    topics = Array.isArray(topicsResult.data) ? topicsResult.data : [];
  };
  await loadActiveCourseTopicRows();
  let questionColumnSupport = relationalQuestionColumnSupport;
  try {
    questionColumnSupport = await getRelationalQuestionColumnSupport(client);
  } catch (error) {
    console.warn("Could not detect optional question media columns for sync.", error?.message || error);
  }

  let courseIdByName = {};
  let topicIdByCourseTopic = {};
  const rebuildCourseTopicIndexes = () => {
    courseIdByName = Object.fromEntries((courses || []).map((course) => [course.course_name, course.id]));
    topicIdByCourseTopic = {};
    (topics || []).forEach((topic) => {
      topicIdByCourseTopic[`${topic.course_id}::${topic.topic_name}`] = topic.id;
    });
  };
  rebuildCourseTopicIndexes();

  const unresolvedCourseNames = [...new Set(
    questions
      .map((question) => String(getQbankCourseTopicMeta(question).course || "").trim())
      .filter(Boolean)
      .filter((courseName) => !courseIdByName[courseName]),
  )];
  if (unresolvedCourseNames.length) {
    // Keep course/topic dictionaries aligned with the latest local curriculum before syncing questions.
    await syncCoursesTopicsToRelational(
      load(STORAGE_KEYS.curriculum, O6U_CURRICULUM),
      load(STORAGE_KEYS.courseTopics, COURSE_TOPIC_OVERRIDES),
    );
    await loadActiveCourseTopicRows();
    rebuildCourseTopicIndexes();
  }

  const missingTopics = [];
  const missingTopicKeys = new Set();
  questions.forEach((question) => {
    const meta = getQbankCourseTopicMeta(question);
    const courseId = courseIdByName[meta.course];
    if (!courseId) return;
    const key = `${courseId}::${meta.topic}`;
    if (!topicIdByCourseTopic[key]) {
      if (missingTopicKeys.has(key)) {
        return;
      }
      missingTopicKeys.add(key);
      missingTopics.push({
        course_id: courseId,
        topic_name: meta.topic,
        sort_order: 999,
        is_active: true,
      });
      topicIdByCourseTopic[key] = "__pending__";
    }
  });
  if (missingTopics.length) {
    for (const topicBatch of splitIntoBatches(missingTopics, RELATIONAL_UPSERT_BATCH_SIZE)) {
      await runRelationalQueryWithTimeout(
        client
          .from("course_topics")
          .upsert(topicBatch, { onConflict: "course_id,topic_name" }),
        "Missing topic sync timed out.",
      );
    }
    const refreshedTopics = await fetchRowsPaged((from, to) => (
      client
        .from("course_topics")
        .select("id,course_id,topic_name,is_active")
        .eq("is_active", true)
        .order("course_id", { ascending: true })
        .order("topic_name", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to)
    ));
    if (refreshedTopics.error) {
      throw refreshedTopics.error;
    }
    topics = Array.isArray(refreshedTopics.data) ? refreshedTopics.data : [];
    rebuildCourseTopicIndexes();
  }

  const questionSortOrderByExternalId = new Map(
    questions
      .map((question, index) => [String(question?.id || "").trim(), index + 1])
      .filter(([externalId]) => Boolean(externalId)),
  );
  const upsertRows = [];
  const unresolvedQuestionMappings = [];
  questions.forEach((question) => {
    const meta = getQbankCourseTopicMeta(question);
    const externalId = String(question.id || "").trim();
    if (!externalId) {
      return;
    }
    const courseId = courseIdByName[meta.course];
    if (!courseId) {
      unresolvedQuestionMappings.push({
        id: externalId,
        course: meta.course,
        topic: meta.topic,
      });
      return;
    }
    const topicId = topicIdByCourseTopic[`${courseId}::${meta.topic}`];
    if (!topicId) {
      unresolvedQuestionMappings.push({
        id: externalId,
        course: meta.course,
        topic: meta.topic,
      });
      return;
    }
    const stableDbId =
      existingByExternalId[externalId]
      || crypto.randomUUID();
    const questionImageValue = String(question.questionImage || "").trim();
    const explanationImageValue = String(question.explanationImage || "").trim();
    upsertRows.push({
      id: stableDbId,
      external_id: externalId,
      course_id: courseId,
      topic_id: topicId,
      author_id: isUuidValue(currentUser.supabaseAuthId) ? currentUser.supabaseAuthId : null,
      stem: String(question.stem || "").trim(),
      explanation: String(question.explanation || "").trim() || "No explanation provided.",
      objective: String(question.objective || "").trim() || null,
      ...(questionColumnSupport.questionImageUrl && !isInlineImageDataUrl(questionImageValue)
        ? { question_image_url: questionImageValue || null }
        : {}),
      ...(questionColumnSupport.explanationImageUrl && !isInlineImageDataUrl(explanationImageValue)
        ? { explanation_image_url: explanationImageValue || null }
        : {}),
      ...(questionColumnSupport.sortOrder
        ? { sort_order: questionSortOrderByExternalId.get(externalId) || null }
        : {}),
      difficulty: toRelationalDifficulty(question.difficulty),
      status: toRelationalQuestionStatus(question.status),
    });
  });

  if (!payloadExternalIds.length) {
    if (currentUser.role !== "admin") {
      return;
    }
    const existingResult = await fetchRowsPaged((from, to) => (
      client
        .from("questions")
        .select("id")
        .order("id", { ascending: true })
        .range(from, to)
    ));
    if (existingResult.error) {
      throw existingResult.error;
    }
    const existingQuestionIds = (existingResult.data || [])
      .map((row) => String(row?.id || "").trim())
      .filter(isUuidValue);
    await deleteRelationalQuestionsAndDependents(client, existingQuestionIds);
    saveLocalOnly(STORAGE_KEYS.questions, []);
    return;
  }

  if (unresolvedQuestionMappings.length) {
    const samples = unresolvedQuestionMappings
      .slice(0, 3)
      .map((entry) => `${entry.id} [${entry.course} / ${entry.topic}]`)
      .join(", ");
    throw new Error(
      `Could not sync ${unresolvedQuestionMappings.length} question(s) because their course/topic mapping is missing in Supabase. `
      + `Examples: ${samples}`,
    );
  }

  if (!upsertRows.length) {
    throw new Error(
      "Could not map imported questions to database courses/topics. Questions were kept locally; database sync was skipped to prevent data loss.",
    );
  }

  for (const upsertBatch of splitIntoBatches(upsertRows, RELATIONAL_UPSERT_BATCH_SIZE)) {
    await runRelationalQueryWithTimeout(
      client.from("questions").upsert(upsertBatch, { onConflict: "external_id" }),
      "Question sync timed out.",
    );
  }

  const externalIds = upsertRows.map((row) => row.external_id).filter(Boolean);
  const persistedQuestions = [];
  for (const externalIdBatch of splitIntoBatches(externalIds, RELATIONAL_IN_BATCH_SIZE)) {
    const persistedBatch = await runRelationalQueryWithTimeout(
      client
        .from("questions")
        .select("id,external_id")
        .in("external_id", externalIdBatch),
      "Question verification timed out.",
    );
    if (Array.isArray(persistedBatch) && persistedBatch.length) {
      persistedQuestions.push(...persistedBatch);
    }
  }
  if (currentUser.role === "admin") {
    const externalIdSet = new Set(payloadExternalIds);
    const persistedQuestionIdSet = new Set(
      (persistedQuestions || [])
        .map((entry) => String(entry?.id || "").trim())
        .filter(isUuidValue),
    );
    const existingQuestionsResult = await fetchRowsPaged((from, to) => (
      client
        .from("questions")
        .select("id,external_id")
        .order("id", { ascending: true })
        .range(from, to)
    ));
    if (existingQuestionsResult.error) {
      throw existingQuestionsResult.error;
    }
    const existingQuestions = Array.isArray(existingQuestionsResult.data) ? existingQuestionsResult.data : [];
    const deleteIds = existingQuestions
      .filter((row) => {
        const rowId = String(row?.id || "").trim();
        const rowExternalId = String(row?.external_id || "").trim();
        if (!isUuidValue(rowId)) {
          return false;
        }
        if (persistedQuestionIdSet.has(rowId)) {
          return false;
        }
        if (rowExternalId && externalIdSet.has(rowExternalId)) {
          return false;
        }
        return true;
      })
      .map((row) => row.id);
    await deleteRelationalQuestionsAndDependents(client, deleteIds);
  }
  const dbIdByExternalId = Object.fromEntries((persistedQuestions || []).map((entry) => [entry.external_id, entry.id]));

  const updatedLocalQuestions = questions.map((question) => {
    const nextDbId = dbIdByExternalId[question.id];
    if (!nextDbId || question.dbId === nextDbId) {
      return question;
    }
    return { ...question, dbId: nextDbId };
  });
  saveLocalOnly(STORAGE_KEYS.questions, updatedLocalQuestions);

  const insertChoiceRows = async (rows) => {
    for (const choiceBatch of splitIntoBatches(rows, RELATIONAL_INSERT_BATCH_SIZE)) {
      await runRelationalQueryWithTimeout(
        client.from("question_choices").insert(choiceBatch),
        "Question choice sync timed out.",
      );
    }
  };

  const applyQuestionChoiceSyncPlan = async (plan) => {
    const targetIds = [...new Set((plan?.questionIds || []).filter((id) => isUuidValue(id)))];
    if (!targetIds.length) {
      return;
    }
    for (const questionIdBatch of splitIntoBatches(targetIds, RELATIONAL_DELETE_BATCH_SIZE)) {
      await runRelationalQueryWithTimeout(
        client
          .from("question_choices")
          .delete()
          .in("question_id", questionIdBatch),
        "Question choice replacement timed out.",
      );
    }

    await insertChoiceRows(plan.rows || []);
    await verifyQuestionChoiceSync(client, targetIds, plan.signatureByQuestionId);
  };

  let choiceSyncPlan = buildQuestionChoiceSyncPlan(updatedLocalQuestions, dbIdByExternalId);
  if (choiceSyncPlan.skippedQuestionIds.length) {
    console.warn(
      `Skipped choice sync for ${choiceSyncPlan.skippedQuestionIds.length} question(s) with fewer than 2 valid choices.`,
    );
  }
  try {
    await applyQuestionChoiceSyncPlan(choiceSyncPlan);
  } catch (error) {
    if (!isQuestionChoiceForeignKeyError(error)) {
      throw error;
    }

    const refreshedPersistedQuestions = [];
    for (const externalIdBatch of splitIntoBatches(externalIds, RELATIONAL_IN_BATCH_SIZE)) {
      const persistedBatch = await runRelationalQueryWithTimeout(
        client
          .from("questions")
          .select("id,external_id")
          .in("external_id", externalIdBatch),
        "Question refresh lookup timed out.",
      );
      if (Array.isArray(persistedBatch) && persistedBatch.length) {
        refreshedPersistedQuestions.push(...persistedBatch);
      }
    }
    const refreshedDbIdByExternalId = Object.fromEntries(
      (refreshedPersistedQuestions || []).map((entry) => [entry.external_id, entry.id]),
    );
    const refreshedLocalQuestions = questions.map((question) => {
      const nextDbId = refreshedDbIdByExternalId[question.id];
      if (!nextDbId || question.dbId === nextDbId) {
        return question;
      }
      return { ...question, dbId: nextDbId };
    });
    saveLocalOnly(STORAGE_KEYS.questions, refreshedLocalQuestions);

    choiceSyncPlan = buildQuestionChoiceSyncPlan(refreshedLocalQuestions, refreshedDbIdByExternalId);
    if (choiceSyncPlan.skippedQuestionIds.length) {
      console.warn(
        `Skipped choice sync for ${choiceSyncPlan.skippedQuestionIds.length} question(s) with fewer than 2 valid choices.`,
      );
    }
    await applyQuestionChoiceSyncPlan(choiceSyncPlan);
  }
}

async function persistImportedQuestionsNow(questionsPayload) {
  const currentUser = getCurrentUser();
  if (currentUser?.role !== "admin") {
    return { ok: false, message: "Only admin users can import and sync questions." };
  }
  if (!isUuidValue(currentUser?.supabaseAuthId)) {
    return {
      ok: false,
      message: "Database sync requires a signed-in Supabase admin account. Please log out and sign in again.",
    };
  }

  const questions = Array.isArray(questionsPayload) ? questionsPayload : getQuestions();
  if (!questions.length) {
    return { ok: true };
  }

  const ready = await ensureRelationalSyncReady().catch(() => false);
  if (!ready) {
    return { ok: false, message: "Relational database sync is unavailable." };
  }

  await flushPendingSyncNow({ throwOnRelationalFailure: false }).catch(() => { });

  try {
    const curriculum = load(STORAGE_KEYS.curriculum, O6U_CURRICULUM);
    const topics = load(STORAGE_KEYS.courseTopics, COURSE_TOPIC_OVERRIDES);
    await syncCoursesTopicsToRelational(curriculum, topics);
    await syncUserCourseEnrollmentsToRelational(getUsers(), {
      assignedByAuthId: currentUser.supabaseAuthId,
    });
    try {
      await syncQuestionsToRelational(questions);
    } catch (error) {
      if (!isQuestionChoiceForeignKeyError(error)) {
        throw error;
      }
      // Retry once against the latest local snapshot if choices were inserted before questions settled.
      await syncQuestionsToRelational(getQuestions());
    }
  } catch (error) {
    return { ok: false, message: error?.message || "Could not persist imported questions to database." };
  }

  queueStudentRefreshSignal({
    changedKeys: [STORAGE_KEYS.questions, STORAGE_KEYS.curriculum, STORAGE_KEYS.courseTopics],
    reason: "import_sync",
    flushNow: true,
  });
  return { ok: true };
}

async function syncSessionsToRelational(sessionsPayload) {
  const client = getRelationalClient();
  const currentUser = getCurrentUser();
  if (!client || !currentUser) {
    return;
  }

  const sessions = Array.isArray(sessionsPayload) ? sessionsPayload : [];
  const users = getUsers();
  const questions = getQuestions();
  const questionDbIdByLocalId = Object.fromEntries(questions.filter((entry) => entry.dbId).map((entry) => [entry.id, entry.dbId]));
  const authIdByLocalUserId = Object.fromEntries(
    users
      .map((entry) => [entry.id, getUserProfileId(entry)])
      .filter(([, profileId]) => Boolean(profileId)),
  );

  const ownedSessions = sessions.filter((session) => isUuidValue(authIdByLocalUserId[session.userId]));
  if (!ownedSessions.length) {
    return;
  }

  const courseRowsResult = await fetchRowsPaged((from, to) => (
    client
      .from("courses")
      .select("id,course_name,is_active")
      .eq("is_active", true)
      .order("course_name", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to)
  ));
  if (courseRowsResult.error) {
    throw courseRowsResult.error;
  }
  const courseIdByName = Object.fromEntries(
    (Array.isArray(courseRowsResult.data) ? courseRowsResult.data : [])
      .map((row) => [String(row?.course_name || "").trim(), String(row?.id || "").trim()])
      .filter(([courseName, courseId]) => courseName && isUuidValue(courseId)),
  );

  const upsertBlocks = ownedSessions.map((session) => ({
    ...(isUuidValue(session.dbId) ? { id: session.dbId } : {}),
    external_id: String(session.id || "").trim(),
    user_id: authIdByLocalUserId[session.userId],
    course_id: courseIdByName[String(getSessionCourseList(session)[0] || "").trim()] || null,
    mode: session.mode === "timed" ? "timed" : "tutor",
    source: ["all", "unused", "incorrect", "flagged"].includes(String(session.source || "")) ? session.source : "all",
    status: ["in_progress", "completed", "suspended"].includes(String(session.status || "")) ? session.status : "in_progress",
    question_count: Math.max(1, Number(session.questionIds?.length || 1)),
    duration_minutes: Number(session.durationMin || 20),
    time_remaining_sec: session.timeRemainingSec == null ? null : Number(session.timeRemainingSec),
    current_index: Math.max(0, Number(session.currentIndex || 0)),
    elapsed_seconds: Math.max(0, Number(session.elapsedSec || 0)),
    completed_at: session.completedAt || null,
  }));

  for (const blockBatch of splitIntoBatches(upsertBlocks, RELATIONAL_UPSERT_BATCH_SIZE)) {
    await runRelationalQueryWithTimeout(
      client.from("test_blocks").upsert(blockBatch, { onConflict: "external_id" }),
      "Session block sync timed out.",
    );
  }

  const externalIds = upsertBlocks.map((entry) => entry.external_id).filter(Boolean);
  const persistedBlocks = [];
  for (const externalIdBatch of splitIntoBatches(externalIds, RELATIONAL_IN_BATCH_SIZE)) {
    const data = await runRelationalQueryWithTimeout(
      client
        .from("test_blocks")
        .select("id,external_id")
        .in("external_id", externalIdBatch),
      "Session block verification timed out.",
    );
    if (Array.isArray(data) && data.length) {
      persistedBlocks.push(...data);
    }
  }
  const blockIdByExternalId = Object.fromEntries((persistedBlocks || []).map((entry) => [entry.external_id, entry.id]));
  const blockIds = Object.values(blockIdByExternalId);

  for (const blockIdBatch of splitIntoBatches(blockIds, RELATIONAL_DELETE_BATCH_SIZE)) {
    await runRelationalQueryWithTimeout(
      client.from("test_responses").delete().in("block_id", blockIdBatch),
      "Session response cleanup timed out.",
    );
    await runRelationalQueryWithTimeout(
      client.from("test_block_items").delete().in("block_id", blockIdBatch),
      "Session item cleanup timed out.",
    );
  }

  const itemRows = [];
  const responseRows = [];

  ownedSessions.forEach((session) => {
    const blockDbId = blockIdByExternalId[session.id];
    if (!blockDbId) return;
    const questionIds = Array.isArray(session.questionIds) ? session.questionIds : [];
    questionIds.forEach((localQuestionId, index) => {
      const questionDbId = questionDbIdByLocalId[localQuestionId];
      if (!questionDbId) return;
      itemRows.push({
        block_id: blockDbId,
        position: index + 1,
        question_id: questionDbId,
      });

      const response = session.responses?.[localQuestionId] || {};
      responseRows.push({
        block_id: blockDbId,
        question_id: questionDbId,
        selected_choice_labels: Array.isArray(response.selected) ? response.selected : [],
        flagged: Boolean(response.flagged),
        notes: String(response.notes || "") || null,
        submitted: Boolean(response.submitted),
        answered_at: response.submitted ? session.updatedAt || nowISO() : null,
      });
    });
  });

  if (itemRows.length) {
    for (const itemBatch of splitIntoBatches(itemRows, RELATIONAL_INSERT_BATCH_SIZE)) {
      await runRelationalQueryWithTimeout(
        client.from("test_block_items").insert(itemBatch),
        "Session item sync timed out.",
      );
    }
  }
  if (responseRows.length) {
    for (const responseBatch of splitIntoBatches(responseRows, RELATIONAL_INSERT_BATCH_SIZE)) {
      await runRelationalQueryWithTimeout(
        client.from("test_responses").insert(responseBatch),
        "Session response sync timed out.",
      );
    }
  }

  const syncedSessions = sessions.map((session) => {
    const dbId = blockIdByExternalId[session.id];
    if (!dbId || session.dbId === dbId) {
      return session;
    }
    return { ...session, dbId };
  });
  saveLocalOnly(STORAGE_KEYS.sessions, syncedSessions);
}

function seedData() {
  const savedCurriculum = load(STORAGE_KEYS.curriculum, null);
  const baseCurriculum = savedCurriculum || DEFAULT_O6U_CURRICULUM;
  O6U_CURRICULUM = normalizeCurriculum(baseCurriculum);
  if (!savedCurriculum || JSON.stringify(savedCurriculum) !== JSON.stringify(O6U_CURRICULUM)) {
    save(STORAGE_KEYS.curriculum, O6U_CURRICULUM);
  }
  const savedCourseTopics = load(STORAGE_KEYS.courseTopics, null);
  COURSE_TOPIC_OVERRIDES = savedCourseTopics && typeof savedCourseTopics === "object" ? savedCourseTopics : {};
  const savedCourseTopicGroups = load(STORAGE_KEYS.courseTopicGroups, null);
  COURSE_TOPIC_GROUPS = savedCourseTopicGroups && typeof savedCourseTopicGroups === "object" ? savedCourseTopicGroups : {};
  const savedCourseNotebookLinks = load(STORAGE_KEYS.courseNotebookLinks, null);
  COURSE_NOTEBOOK_LINKS = savedCourseNotebookLinks && typeof savedCourseNotebookLinks === "object"
    ? savedCourseNotebookLinks
    : {};
  rebuildCurriculumCatalog();
  save(STORAGE_KEYS.courseTopics, COURSE_TOPIC_OVERRIDES);
  save(STORAGE_KEYS.courseTopicGroups, COURSE_TOPIC_GROUPS);
  save(STORAGE_KEYS.courseNotebookLinks, COURSE_NOTEBOOK_LINKS);
  if (typeof load(STORAGE_KEYS.autoApproveStudentAccess, null) !== "boolean") {
    save(STORAGE_KEYS.autoApproveStudentAccess, DEFAULT_AUTO_APPROVE_STUDENT_ACCESS);
  }
  const savedSiteMaintenance = load(STORAGE_KEYS.siteMaintenance, null);
  const normalizedSiteMaintenance = normalizeSiteMaintenanceConfig(savedSiteMaintenance);
  if (!savedSiteMaintenance || JSON.stringify(savedSiteMaintenance) !== JSON.stringify(normalizedSiteMaintenance)) {
    save(STORAGE_KEYS.siteMaintenance, normalizedSiteMaintenance);
  }

  const allCourses = CURRICULUM_COURSE_LIST;

  if (!load(STORAGE_KEYS.users, null)) {
    const users = [
      {
        id: "u_admin",
        name: "O6U Admin",
        email: DEMO_ADMIN_EMAIL,
        password: "admin123",
        phone: "",
        role: "admin",
        verified: true,
        isApproved: true,
        approvedAt: nowISO(),
        approvedBy: "system",
        assignedCourses: [...allCourses],
        academicYear: null,
        academicSemester: null,
        createdAt: nowISO(),
      },
      {
        id: "u_student",
        name: "O6U Demo Student",
        email: DEMO_STUDENT_EMAIL,
        password: "student123",
        phone: "+201000000000",
        role: "student",
        verified: true,
        isApproved: true,
        approvedAt: nowISO(),
        approvedBy: "system",
        assignedCourses: getCurriculumCourses(1, 1),
        academicYear: 1,
        academicSemester: 1,
        createdAt: nowISO(),
      },
    ];
    save(STORAGE_KEYS.users, users);
  } else {
    const users = getUsers();
    let changed = false;
    users.forEach((user) => {
      if (user.id === "u_admin") {
        if (user.email !== DEMO_ADMIN_EMAIL || user.name !== "O6U Admin") {
          user.email = DEMO_ADMIN_EMAIL;
          user.name = "O6U Admin";
          changed = true;
        }
      }
      if (user.id === "u_student") {
        if (user.email !== DEMO_STUDENT_EMAIL || user.name !== "O6U Demo Student") {
          user.email = DEMO_STUDENT_EMAIL;
          user.name = "O6U Demo Student";
          changed = true;
        }
        if (!validateAndNormalizePhoneNumber(String(user.phone || "")).ok) {
          user.phone = "+201000000000";
          changed = true;
        }
      }

      const normalizedPhone = String(user.phone || "").trim();
      if (user.phone !== normalizedPhone) {
        user.phone = normalizedPhone;
        changed = true;
      }
      if (isForcedAdminEmail(user.email) && user.role !== "admin") {
        user.role = "admin";
        user.academicYear = null;
        user.academicSemester = null;
        user.assignedCourses = [...allCourses];
        changed = true;
      }
      const shouldApprove = user.role === "admin"
        ? true
        : typeof user.isApproved === "boolean"
          ? user.isApproved
          : true;
      if (user.isApproved !== shouldApprove) {
        user.isApproved = shouldApprove;
        changed = true;
      }
      if (user.isApproved) {
        const approvedAt = String(user.approvedAt || "").trim();
        if (!approvedAt) {
          user.approvedAt = nowISO();
          changed = true;
        }
      } else if (user.approvedAt || user.approvedBy) {
        user.approvedAt = null;
        user.approvedBy = null;
        changed = true;
      }

      if (user.role === "student") {
        const repairedEnrollment = normalizeStudentEnrollmentProfile(user);
        if (user.academicYear !== repairedEnrollment.academicYear) {
          user.academicYear = repairedEnrollment.academicYear;
          changed = true;
        }
        if (user.academicSemester !== repairedEnrollment.academicSemester) {
          user.academicSemester = repairedEnrollment.academicSemester;
          changed = true;
        }
        if ((user.assignedCourses || []).join("|") !== repairedEnrollment.assignedCourses.join("|")) {
          user.assignedCourses = repairedEnrollment.assignedCourses;
          changed = true;
        }
      } else {
        if (user.academicYear !== null || user.academicSemester !== null) {
          user.academicYear = null;
          user.academicSemester = null;
          changed = true;
        }
        const normalized = sanitizeCourseAssignments(user.assignedCourses || allCourses);
        if (normalized.join("|") !== (user.assignedCourses || []).join("|")) {
          user.assignedCourses = normalized.length ? normalized : [...allCourses];
          changed = true;
        }
      }
    });
    if (changed) {
      save(STORAGE_KEYS.users, users);
    }
  }

  if (!load(STORAGE_KEYS.questions, null)) {
    save(STORAGE_KEYS.questions, SAMPLE_QUESTIONS);
  }

  if (!load(STORAGE_KEYS.sessions, null)) {
    save(STORAGE_KEYS.sessions, []);
  }

  if (!load(STORAGE_KEYS.notifications, null)) {
    save(STORAGE_KEYS.notifications, []);
  }

  if (!load(STORAGE_KEYS.notificationOutbox, null)) {
    saveLocalOnly(STORAGE_KEYS.notificationOutbox, []);
  }

  if (!load(STORAGE_KEYS.notificationReadSyncQueue, null)) {
    saveLocalOnly(STORAGE_KEYS.notificationReadSyncQueue, {});
  }

  if (!load(STORAGE_KEYS.filterPresets, null)) {
    save(STORAGE_KEYS.filterPresets, []);
  }

  if (!load(STORAGE_KEYS.incorrectQueue, null)) {
    save(STORAGE_KEYS.incorrectQueue, {});
  }

  if (!load(STORAGE_KEYS.invites, null)) {
    save(STORAGE_KEYS.invites, ["O6U-FACMED-2026", "O6U-DEMO-BETA"]);
  }

  if (!load(STORAGE_KEYS.feedback, null)) {
    save(STORAGE_KEYS.feedback, []);
  }

  if (!load(STORAGE_KEYS.flashcards, null)) {
    save(STORAGE_KEYS.flashcards, {});
  }

  if (!load(STORAGE_KEYS.systemLogs, null)) {
    save(STORAGE_KEYS.systemLogs, []);
  }

  repairCourseTopicCatalogFromQuestions({ persist: false });
}

function getStoredThemePreference() {
  const normalizeTheme = (value) => {
    const normalized = String(value || "").trim().toLowerCase();
    if (normalized === THEME_DARK || normalized === THEME_LIGHT || normalized === THEME_COMFORT) {
      return normalized;
    }
    return "";
  };

  const fromLoad = normalizeTheme(load(THEME_PREFERENCE_KEY, ""));
  if (fromLoad) {
    return fromLoad;
  }

  // Backward compatibility for older/plain localStorage values.
  const raw = readStorageKey(THEME_PREFERENCE_KEY);
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      const fromParsed = normalizeTheme(parsed);
      if (fromParsed) {
        return fromParsed;
      }
    } catch {
      const fromRaw = normalizeTheme(raw);
      if (fromRaw) {
        return fromRaw;
      }
    }
  }
  return THEME_LIGHT;
}

function renderThemeToggleIcon() {
  if (activeTheme === THEME_DARK) {
    return `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="5"></circle>
        <line x1="12" y1="1" x2="12" y2="3"></line>
        <line x1="12" y1="21" x2="12" y2="23"></line>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
        <line x1="1" y1="12" x2="3" y2="12"></line>
        <line x1="21" y1="12" x2="23" y2="12"></line>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
      </svg>
    `;
  } else if (activeTheme === THEME_COMFORT) {
    return `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
        <circle cx="12" cy="12" r="3"></circle>
      </svg>
    `;
  } else {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M15.2 3.4a8.9 8.9 0 1 0 5.4 12.3 8.3 8.3 0 0 1-3.4.7A8.9 8.9 0 0 1 11 4.6c0-.4 0-.8.1-1.2.5-.1 1-.1 1.5-.1.9 0 1.8.1 2.6.1z" />
      </svg>
    `;
  }
}

function renderThemeToggleButton() {
  let actionLabel = "Switch to dark mode";
  if (activeTheme === THEME_DARK) actionLabel = "Switch to comfort mode";
  else if (activeTheme === THEME_COMFORT) actionLabel = "Switch to light mode";

  const isActive = activeTheme === THEME_DARK || activeTheme === THEME_COMFORT;
  const activeClass = activeTheme === THEME_DARK ? "is-active" : (activeTheme === THEME_COMFORT ? "is-comfort" : "");

  return `
    <button
      class="theme-toggle-btn ${activeClass}"
      type="button"
      data-action="toggle-theme"
      aria-pressed="${isActive ? "true" : "false"}"
      aria-label="${actionLabel}"
      title="${actionLabel}"
    >
      ${renderThemeToggleIcon()}
    </button>
  `;
}

function syncThemeToggleButtons() {
  let actionLabel = "Switch to dark mode";
  if (activeTheme === THEME_DARK) actionLabel = "Switch to comfort mode";
  else if (activeTheme === THEME_COMFORT) actionLabel = "Switch to light mode";

  const isActive = activeTheme === THEME_DARK || activeTheme === THEME_COMFORT;

  document.querySelectorAll("[data-action='toggle-theme']").forEach((node) => {
    if (!(node instanceof HTMLButtonElement)) {
      return;
    }
    node.classList.toggle("is-active", activeTheme === THEME_DARK);
    node.classList.toggle("is-comfort", activeTheme === THEME_COMFORT);
    node.setAttribute("aria-pressed", isActive ? "true" : "false");
    node.setAttribute("aria-label", actionLabel);
    node.setAttribute("title", actionLabel);
    node.innerHTML = renderThemeToggleIcon();
  });
}

function updateThemeMetaColor() {
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (!metaThemeColor) {
    return;
  }
  let color = THEME_META_COLOR_LIGHT;
  if (activeTheme === THEME_DARK) color = THEME_META_COLOR_DARK;
  else if (activeTheme === THEME_COMFORT) color = THEME_META_COLOR_COMFORT;
  metaThemeColor.setAttribute("content", color);
}

function applyTheme(theme, options = {}) {
  let nextTheme = String(theme || "").trim().toLowerCase();
  if (nextTheme !== THEME_DARK && nextTheme !== THEME_COMFORT) {
    nextTheme = THEME_LIGHT;
  }
  activeTheme = nextTheme;
  document.documentElement.classList.toggle("theme-dark", nextTheme === THEME_DARK);
  document.documentElement.classList.toggle("theme-comfort", nextTheme === THEME_COMFORT);
  document.body.classList.toggle("theme-dark", nextTheme === THEME_DARK);
  document.body.classList.toggle("theme-comfort", nextTheme === THEME_COMFORT);
  updateThemeMetaColor();
  if (options.persist) {
    saveLocalOnly(THEME_PREFERENCE_KEY, nextTheme);
  }
  syncThemeToggleButtons();
}

function hydrateThemePreference() {
  applyTheme(getStoredThemePreference());
}

function clearLifecycleResumeHandle() {
  if (lifecycleResumeHandle) {
    window.clearTimeout(lifecycleResumeHandle);
    lifecycleResumeHandle = null;
  }
}

async function resumeDeferredAppWork(options = {}) {
  clearLifecycleResumeHandle();
  if (!options?.allowWhenHidden && document.visibilityState === "hidden") {
    return false;
  }

  let activeUser = getCurrentUser();
  if (activeUser && !hasActiveSupabaseSessionForUser(activeUser)) {
    await tryRecoverSupabaseSessionInBackground().catch(() => false);
    activeUser = getCurrentUser();
  }

  syncTopbar();
  syncPresenceRuntime(activeUser);
  syncSiteActivityRuntime(activeUser);

  if (activeUser?.role === "admin" && state.route === "admin") {
    if (ADMIN_AUTO_REFRESH_PAGES.has(String(state.adminPage || "").trim())) {
      ensureAdminDashboardPolling();
    }
    if (state.adminPage === "activity") {
      ensureAdminPresencePolling();
    }
  }

  scheduleNotificationRealtimeHydration(0);
  scheduleSessionRealtimeHydration(0);
  await flushPendingSyncNow({ throwOnRelationalFailure: false }).catch(() => { });

  if (
    activeUser
    && SUPABASE_CONFIG.enabled
    && !hasActiveSupabaseSessionForUser(activeUser)
    && !lifecycleResumeHandle
  ) {
    lifecycleResumeHandle = window.setTimeout(() => {
      lifecycleResumeHandle = null;
      resumeDeferredAppWork().catch((error) => {
        console.warn("Deferred app resume failed.", error?.message || error);
      });
    }, 1200);
  }

  return true;
}

function scheduleDeferredAppResume(delayMs = 0) {
  clearLifecycleResumeHandle();
  lifecycleResumeHandle = window.setTimeout(() => {
    lifecycleResumeHandle = null;
    resumeDeferredAppWork().catch((error) => {
      console.warn("Deferred app resume failed.", error?.message || error);
    });
  }, Math.max(0, Number(delayMs) || 0));
}

function bindGlobalEvents() {
  if (globalEventsBound) {
    return;
  }
  globalEventsBound = true;

  document.body.addEventListener("click", async (event) => {
    const clickedInsideUserMenu = Boolean(event.target.closest(".user-menu"));
    const clickedInsideNotificationMenu = Boolean(event.target.closest(".notification-menu"));
    const actionTarget = event.target.closest("[data-action]");
    const action = actionTarget?.getAttribute("data-action") || "";
    if (action && !["toggle-user-menu", "toggle-notification-menu"].includes(action)) {
      appendSystemLog("ui.action", `Action: ${action}`, {
        route: String(state.route || "").trim(),
      });
    }

    if (action === "toggle-user-menu") {
      state.userMenuOpen = !state.userMenuOpen;
      if (state.userMenuOpen) {
        state.notificationMenuOpen = false;
      }
      syncTopbar();
      return;
    }

    if (action === "toggle-notification-menu") {
      state.notificationMenuOpen = !state.notificationMenuOpen;
      if (state.notificationMenuOpen) {
        state.userMenuOpen = false;
      }
      syncTopbar();
      if (state.notificationMenuOpen) {
        const user = getCurrentUser();
        if (user?.role === "student") {
          const unreadNotificationIds = getVisibleNotificationsForUser(user)
            .filter((notification) => !isNotificationReadByUser(notification, user))
            .map((notification) => notification.id);
          if (unreadNotificationIds.length) {
            const result = await markNotificationsReadForUser(user, unreadNotificationIds);
            if (result.changed) {
              syncTopbar();
            }
          }
        }
      }
      return;
    }

    if (action === "toggle-theme") {
      state.userMenuOpen = false;
      state.notificationMenuOpen = false;
      let nextTheme = THEME_DARK;
      if (activeTheme === THEME_DARK) nextTheme = THEME_COMFORT;
      else if (activeTheme === THEME_COMFORT) nextTheme = THEME_LIGHT;
      applyTheme(nextTheme, { persist: true });
      syncTopbar();
      return;
    }

    if (action === "notification-mark-read-topbar") {
      const user = getCurrentUser();
      const notificationId = String(actionTarget?.getAttribute("data-notification-id") || "").trim();
      if (!user || user.role !== "student" || !notificationId) {
        return;
      }
      const result = await markNotificationsReadForUser(user, [notificationId]);
      if (result.syncDeferred) {
        toast("Marked as read locally. Cloud sync is queued and will retry automatically.");
      } else if (result.syncWarning) {
        toast(`Marked as read locally, but cloud sync failed: ${result.syncWarning}`);
      }
      if (result.changed) {
        if (state.route === "notifications") {
          state.skipNextRouteAnimation = true;
          render();
          return;
        }
        syncTopbar();
      }
      return;
    }

    if (action === "notifications-mark-all-read-topbar") {
      const user = getCurrentUser();
      if (!user || user.role !== "student") {
        return;
      }
      const unreadNotificationIds = getVisibleNotificationsForUser(user)
        .filter((notification) => !isNotificationReadByUser(notification, user))
        .map((notification) => notification.id);
      if (!unreadNotificationIds.length) {
        return;
      }
      const result = await markNotificationsReadForUser(user, unreadNotificationIds);
      if (result.syncDeferred) {
        toast("Marked as read locally. Cloud sync is queued and will retry automatically.");
      } else if (result.syncWarning) {
        toast(`Marked as read locally, but cloud sync failed: ${result.syncWarning}`);
      }
      if (result.changed) {
        if (state.route === "notifications") {
          state.skipNextRouteAnimation = true;
          render();
          return;
        }
        syncTopbar();
      }
      return;
    }

    const navTarget = event.target.closest("[data-nav]");
    if (navTarget) {
      state.userMenuOpen = false;
      state.notificationMenuOpen = false;
      const route = navTarget.getAttribute("data-nav");
      navigate(route);
      return;
    }

    if (action === "logout") {
      state.userMenuOpen = false;
      state.notificationMenuOpen = false;
      logout();
      return;
    }

    if (action === "quick-login-admin") {
      loginAsDemo(DEMO_ADMIN_EMAIL, "admin123");
      return;
    }

    if (action === "quick-login-student") {
      loginAsDemo(DEMO_STUDENT_EMAIL, "student123");
      return;
    }

    let shouldSyncTopbar = false;
    if (state.userMenuOpen && !clickedInsideUserMenu) {
      state.userMenuOpen = false;
      shouldSyncTopbar = true;
    }
    if (state.notificationMenuOpen && !clickedInsideNotificationMenu) {
      state.notificationMenuOpen = false;
      shouldSyncTopbar = true;
    }
    if (shouldSyncTopbar) {
      syncTopbar();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && (state.userMenuOpen || state.notificationMenuOpen)) {
      state.userMenuOpen = false;
      state.notificationMenuOpen = false;
      syncTopbar();
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      clearLifecycleResumeHandle();
      flushPendingSyncNow({ throwOnRelationalFailure: false }).catch(() => { });
      endCurrentUserActivitySession().catch(() => { });
      return;
    }
    scheduleDeferredAppResume(0);
  });

  window.addEventListener("pagehide", () => {
    clearLifecycleResumeHandle();
    flushPendingSyncNow({ throwOnRelationalFailure: false }).catch(() => { });
    clearNotificationRealtimeSubscription();
    clearSessionRealtimeSubscription();
    endCurrentUserActivitySession().catch(() => { });
    markCurrentUserOffline().catch(() => { });
    syncPresenceRuntime(null);
    resetSiteActivityRuntime();
    clearAdminPresencePolling();
    clearAdminDashboardPolling();
  });

  window.addEventListener("pageshow", () => {
    scheduleDeferredAppResume(0);
  });

  window.addEventListener("online", () => {
    scheduleDeferredAppResume(0);
  });

  window.addEventListener("hashchange", () => {
    const hashRoute = readRouteFromHash();
    if (!hashRoute || hashRoute === state.route) {
      return;
    }
    state.userMenuOpen = false;
    state.notificationMenuOpen = false;
    navigate(hashRoute);
  });
}

function navigate(route, extras = {}) {
  const nextRoute = String(route || "").trim().toLowerCase();
  const targetRoute = nextRoute || "landing";
  const fromRoute = String(state.route || "").trim().toLowerCase();
  if (fromRoute !== targetRoute) {
    appendSystemLog("route.change", `Route changed: ${fromRoute || "unknown"} -> ${targetRoute}`, {
      from: fromRoute || "",
      to: targetRoute,
    });
  }
  const canUseViewTransition = typeof document.startViewTransition === "function";
  const shouldUseViewTransition = canUseViewTransition && targetRoute !== state.route;

  const applyNavigation = () => {
    if (targetRoute !== "session") {
      state.sessionPanel = null;
      state.calcExpression = "";
      state.sessionHighlightUndo = {};
      state.sessionPendingHighlightSelection = null;
    }
    state.route = targetRoute;
    Object.assign(state, extras);
    render();
  };

  if (shouldUseViewTransition) {
    state.skipNextRouteAnimation = true;
    document.startViewTransition(() => {
      applyNavigation();
    });
    return;
  }

  if (targetRoute !== "session") {
    state.sessionPanel = null;
    state.calcExpression = "";
    state.sessionHighlightUndo = {};
    state.sessionPendingHighlightSelection = null;
  }
  state.route = targetRoute;
  Object.assign(state, extras);
  render();
}

function clearAdminPresencePolling() {
  if (adminPresencePollHandle) {
    window.clearInterval(adminPresencePollHandle);
    adminPresencePollHandle = null;
  }
}

function clearAdminDashboardPolling() {
  if (adminDashboardPollHandle) {
    window.clearInterval(adminDashboardPollHandle);
    adminDashboardPollHandle = null;
  }
}

function ensureAdminDashboardPolling() {
  if (adminDashboardPollHandle) {
    return;
  }
  adminDashboardPollHandle = window.setInterval(() => {
    const currentUser = getCurrentUser();
    if (
      !currentUser
      || currentUser.role !== "admin"
      || state.route !== "admin"
      || !ADMIN_AUTO_REFRESH_PAGES.has(String(state.adminPage || "").trim())
    ) {
      clearAdminDashboardPolling();
      return;
    }
    if (state.adminDataRefreshing) {
      return;
    }
    refreshAdminDataSnapshot(currentUser, { force: true, surfaceErrors: false, includeHeavyData: false })
      .then((ok) => {
        if (!ok) {
          return;
        }
        if (
          state.route !== "admin"
          || !ADMIN_AUTO_REFRESH_PAGES.has(String(state.adminPage || "").trim())
        ) {
          return;
        }
        state.skipNextRouteAnimation = true;
        render();
      })
      .catch((error) => {
        console.warn("Admin dashboard auto-refresh failed.", error?.message || error);
      });
  }, ADMIN_DATA_REFRESH_MS);
}

function clearSiteMaintenanceGateRefreshPolling() {
  if (siteMaintenanceGateRefreshHandle) {
    window.clearInterval(siteMaintenanceGateRefreshHandle);
    siteMaintenanceGateRefreshHandle = null;
  }
  siteMaintenanceGateRefreshInFlight = false;
}

async function refreshSiteMaintenanceGateState(user = null) {
  if (siteMaintenanceGateRefreshInFlight) {
    return;
  }
  const currentUser = user || getCurrentUser();
  if (!shouldShowSiteMaintenanceGate(currentUser, state.route)) {
    clearSiteMaintenanceGateRefreshPolling();
    return;
  }

  siteMaintenanceGateRefreshInFlight = true;
  const previousConfig = getSiteMaintenanceConfig();
  try {
    if (!supabaseSync.enabled || !supabaseSync.client || !supabaseSync.tableName || !supabaseSync.storageKeyColumn) {
      const bootstrap = await initSupabaseSync().catch(() => ({ enabled: false }));
      if (!bootstrap?.enabled) {
        return;
      }
    }
    await hydrateSupabaseSyncKeys([STORAGE_KEYS.siteMaintenance]).catch(() => ({ hadRemoteData: false }));
    const nextConfig = getSiteMaintenanceConfig();
    if (
      JSON.stringify(previousConfig) !== JSON.stringify(nextConfig)
      || !shouldShowSiteMaintenanceGate(currentUser, state.route)
    ) {
      state.skipNextRouteAnimation = true;
      render();
    }
  } finally {
    siteMaintenanceGateRefreshInFlight = false;
  }
}

function ensureSiteMaintenanceGateRefreshPolling(user = null) {
  const currentUser = user || getCurrentUser();
  if (!shouldShowSiteMaintenanceGate(currentUser, state.route)) {
    clearSiteMaintenanceGateRefreshPolling();
    return;
  }
  if (siteMaintenanceGateRefreshHandle) {
    return;
  }
  siteMaintenanceGateRefreshHandle = window.setInterval(() => {
    refreshSiteMaintenanceGateState(currentUser).catch((error) => {
      console.warn("Site maintenance refresh failed.", error?.message || error);
    });
  }, SITE_MAINTENANCE_GATE_REFRESH_MS);
}

function clearNotificationRealtimeHydrateTimer() {
  if (notificationRealtimeHydrateTimer) {
    window.clearTimeout(notificationRealtimeHydrateTimer);
    notificationRealtimeHydrateTimer = null;
  }
}

function clearSessionRealtimeHydrateTimer() {
  if (sessionRealtimeHydrateTimer) {
    window.clearTimeout(sessionRealtimeHydrateTimer);
    sessionRealtimeHydrateTimer = null;
  }
}

function clearStudentNotificationPolling() {
  if (studentNotificationPollHandle) {
    window.clearInterval(studentNotificationPollHandle);
    studentNotificationPollHandle = null;
  }
}

function clearStudentSessionPolling() {
  if (studentDataAutoRefreshPollHandle) {
    window.clearInterval(studentDataAutoRefreshPollHandle);
    studentDataAutoRefreshPollHandle = null;
  }
  studentDataAutoRefreshInFlight = false;
}

function clearStudentBackgroundRefreshPolling() {
  if (studentBackgroundRefreshPollHandle) {
    window.clearInterval(studentBackgroundRefreshPollHandle);
    studentBackgroundRefreshPollHandle = null;
  }
  studentBackgroundRefreshInFlight = false;
}

function ensureStudentBackgroundRefreshPolling(user = null) {
  const currentUser = user || getCurrentUser();
  const profileId = getCurrentSessionProfileId(currentUser);
  if (!currentUser || currentUser.role !== "student" || !isUuidValue(profileId)) {
    clearStudentBackgroundRefreshPolling();
    return;
  }
  if (studentBackgroundRefreshPollHandle) {
    return;
  }

  studentBackgroundRefreshPollHandle = window.setInterval(() => {
    const activeUser = getCurrentUser();
    const activeProfileId = getCurrentSessionProfileId(activeUser);
    if (!activeUser || activeUser.role !== "student" || !isUuidValue(activeProfileId)) {
      clearStudentBackgroundRefreshPolling();
      return;
    }
    if (
      studentBackgroundRefreshInFlight
      || state.studentDataRefreshing
      || isPostAuthDataWarmupActive(activeUser)
      || state.route === "session"
      || state.route === "review"
    ) {
      return;
    }

    const shouldForce = !Number(state.studentDataLastSyncAt || 0);
    if (!shouldForce && !shouldRefreshStudentData(activeUser)) {
      return;
    }

    studentBackgroundRefreshInFlight = true;
    refreshStudentDataSnapshot(activeUser, {
      force: shouldForce,
      rerender: true,
    })
      .catch((error) => {
        console.warn("Student background refresh failed.", error?.message || error);
      })
      .finally(() => {
        studentBackgroundRefreshInFlight = false;
      });
  }, STUDENT_BACKGROUND_SYNC_POLL_MS);
}

async function enforceCurrentStudentAccessStatus(user = null) {
  const currentUser = user || getCurrentUser();
  const profileId = getCurrentSessionProfileId(currentUser);
  const client = getRelationalClient();
  if (
    !currentUser
    || currentUser.role !== "student"
    || !isUuidValue(profileId)
    || !client
    || !hasActiveSupabaseSessionForUser(currentUser)
  ) {
    return { checked: false, active: true };
  }

  const { data, error } = await runWithTimeoutResult(
    client
      .from("profiles")
      .select("approved")
      .eq("id", profileId)
      .maybeSingle(),
    PROFILE_LOOKUP_TIMEOUT_MS,
    "Profile access check timed out.",
  );
  if (error || !data) {
    return { checked: false, active: true, error: error || null };
  }
  if (data.approved === false) {
    await logoutDueToAccessRevocation();
    return { checked: true, active: false, revoked: true };
  }
  return { checked: true, active: true };
}

function clearProfileAccessRealtimeHydrateTimer() {
  if (profileAccessRealtimeHydrateTimer) {
    window.clearTimeout(profileAccessRealtimeHydrateTimer);
    profileAccessRealtimeHydrateTimer = null;
  }
}

function clearStudentAccessPolling() {
  if (studentAccessPollHandle) {
    window.clearInterval(studentAccessPollHandle);
    studentAccessPollHandle = null;
  }
  studentAccessPollInFlight = false;
}

async function runProfileAccessRealtimeCheck() {
  if (profileAccessRealtimeHydrateInFlight) {
    profileAccessRealtimeHydrateQueued = true;
    return;
  }
  const user = getCurrentUser();
  const profileId = getCurrentSessionProfileId(user);
  if (!user || user.role !== "student" || !isUuidValue(profileId)) {
    return;
  }

  profileAccessRealtimeHydrateInFlight = true;
  try {
    await enforceCurrentStudentAccessStatus(user);
  } catch (error) {
    console.warn("Profile access realtime check failed.", error?.message || error);
  } finally {
    profileAccessRealtimeHydrateInFlight = false;
    if (profileAccessRealtimeHydrateQueued) {
      profileAccessRealtimeHydrateQueued = false;
      scheduleProfileAccessRealtimeCheck(80);
    }
  }
}

function scheduleProfileAccessRealtimeCheck(delayMs = PROFILE_ACCESS_REALTIME_DEBOUNCE_MS) {
  const user = getCurrentUser();
  const profileId = getCurrentSessionProfileId(user);
  if (!user || user.role !== "student" || !isUuidValue(profileId)) {
    return;
  }
  clearProfileAccessRealtimeHydrateTimer();
  profileAccessRealtimeHydrateTimer = window.setTimeout(() => {
    profileAccessRealtimeHydrateTimer = null;
    runProfileAccessRealtimeCheck().catch((error) => {
      console.warn("Profile access refresh failed.", error?.message || error);
    });
  }, Math.max(0, Number(delayMs) || 0));
}

function clearProfileAccessRealtimeSubscription() {
  clearProfileAccessRealtimeHydrateTimer();
  profileAccessRealtimeHydrateQueued = false;
  profileAccessRealtimeHydrateInFlight = false;
  profileAccessRealtimeSubscriptionKey = "";
  const activeChannel = profileAccessRealtimeChannel;
  profileAccessRealtimeChannel = null;
  if (!activeChannel) {
    return;
  }
  const client = getSupabaseAuthClient();
  if (client && typeof client.removeChannel === "function") {
    Promise.resolve(client.removeChannel(activeChannel)).catch(() => {
      if (typeof activeChannel.unsubscribe === "function") {
        try {
          activeChannel.unsubscribe();
        } catch {
          // Ignore realtime unsubscribe errors.
        }
      }
    });
    return;
  }
  if (typeof activeChannel.unsubscribe === "function") {
    try {
      activeChannel.unsubscribe();
    } catch {
      // Ignore realtime unsubscribe errors.
    }
  }
}

function ensureProfileAccessRealtimeSubscription(user = null) {
  const currentUser = user || getCurrentUser();
  const client = getSupabaseAuthClient();
  const profileId = getCurrentSessionProfileId(currentUser);
  if (!client || currentUser?.role !== "student" || !isUuidValue(profileId)) {
    clearProfileAccessRealtimeSubscription();
    return;
  }

  const nextKey = `student:${profileId}`;
  if (profileAccessRealtimeChannel && profileAccessRealtimeSubscriptionKey === nextKey) {
    return;
  }

  clearProfileAccessRealtimeSubscription();
  const channel = client.channel(`profile-access-live:${nextKey}`);
  channel.on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "profiles",
      filter: `id=eq.${profileId}`,
    },
    () => {
      scheduleProfileAccessRealtimeCheck();
    },
  );

  channel.subscribe((status) => {
    if (status === "SUBSCRIBED") {
      scheduleProfileAccessRealtimeCheck(0);
    }
  });

  profileAccessRealtimeChannel = channel;
  profileAccessRealtimeSubscriptionKey = nextKey;
}

function ensureStudentAccessPolling(user = null) {
  const currentUser = user || getCurrentUser();
  const profileId = getCurrentSessionProfileId(currentUser);
  if (!currentUser || currentUser.role !== "student" || !isUuidValue(profileId)) {
    clearStudentAccessPolling();
    return;
  }
  const needsImmediateCheck = !studentAccessPollHandle;
  if (!studentAccessPollHandle) {
    studentAccessPollHandle = window.setInterval(() => {
      const activeUser = getCurrentUser();
      const activeProfileId = getCurrentSessionProfileId(activeUser);
      if (!activeUser || activeUser.role !== "student" || !isUuidValue(activeProfileId)) {
        clearStudentAccessPolling();
        return;
      }
      if (studentAccessPollInFlight) {
        return;
      }
      studentAccessPollInFlight = true;
      enforceCurrentStudentAccessStatus(activeUser)
        .catch((error) => {
          console.warn("Student access polling failed.", error?.message || error);
        })
        .finally(() => {
          studentAccessPollInFlight = false;
        });
    }, STUDENT_ACCESS_POLL_MS);
  }
  if (needsImmediateCheck && !studentAccessPollInFlight) {
    studentAccessPollInFlight = true;
    enforceCurrentStudentAccessStatus(currentUser)
      .catch((error) => {
        console.warn("Initial student access check failed.", error?.message || error);
      })
      .finally(() => {
        studentAccessPollInFlight = false;
      });
  }
}

function clearStudentForceRefreshPolling() {
  if (studentForceRefreshPollHandle) {
    window.clearInterval(studentForceRefreshPollHandle);
    studentForceRefreshPollHandle = null;
  }
  studentForceRefreshInFlight = false;
}

function ensureStudentForceRefreshPolling(user = null) {
  const currentUser = user || getCurrentUser();
  const profileId = getCurrentSessionProfileId(currentUser);
  if (
    !currentUser
    || currentUser.role !== "student"
    || !isUuidValue(profileId)
    || !supabaseSync.enabled
    || !supabaseSync.client
    || !supabaseSync.tableName
    || !supabaseSync.storageKeyColumn
  ) {
    clearStudentForceRefreshPolling();
    return;
  }
  if (studentForceRefreshPollHandle) {
    return;
  }

  studentForceRefreshPollHandle = window.setInterval(() => {
    const activeUser = getCurrentUser();
    const activeProfileId = getCurrentSessionProfileId(activeUser);
    if (
      !activeUser
      || activeUser.role !== "student"
      || !isUuidValue(activeProfileId)
      || !supabaseSync.enabled
      || !supabaseSync.client
      || !supabaseSync.tableName
      || !supabaseSync.storageKeyColumn
    ) {
      clearStudentForceRefreshPolling();
      return;
    }
    if (studentForceRefreshInFlight || state.studentDataRefreshing) {
      return;
    }
    studentForceRefreshInFlight = true;
    hydrateSupabaseSyncKeys([STORAGE_KEYS.studentRefreshTrigger])
      .then((result) => {
        if (result?.error) {
          return;
        }
        const hasNewTrigger = shouldForceStudentRefreshFromAdminTrigger(activeUser, { reload: false });
        if (!hasNewTrigger) {
          return;
        }
        if (state.route === "session" || state.route === "review") {
          toast("New admin updates are ready. Finish this block to load them.");
          return;
        }
        return refreshStudentDataSnapshot(activeUser, { force: true, rerender: true });
      })
      .catch((error) => {
        console.warn("Student force-refresh polling failed.", error?.message || error);
      })
      .finally(() => {
        studentForceRefreshInFlight = false;
      });
  }, STUDENT_FORCE_REFRESH_POLL_MS);
}

function ensureStudentNotificationPolling(user = null) {
  const currentUser = user || getCurrentUser();
  const profileId = getCurrentSessionProfileId(currentUser);
  const realtimeHealthy = currentUser?.role === "student"
    && notificationRealtimeSubscribed
    && notificationRealtimeSubscriptionKey === `student:${profileId}`;
  if (
    !currentUser
    || currentUser.role !== "student"
    || !isUuidValue(profileId)
    || !getRelationalClient()
  ) {
    clearStudentNotificationPolling();
    return;
  }
  if (realtimeHealthy) {
    clearStudentNotificationPolling();
    return;
  }
  if (studentNotificationPollHandle) {
    return;
  }

  studentNotificationPollHandle = window.setInterval(() => {
    const activeUser = getCurrentUser();
    const activeProfileId = getCurrentSessionProfileId(activeUser);
    if (!activeUser || activeUser.role !== "student" || !isUuidValue(activeProfileId)) {
      clearStudentNotificationPolling();
      return;
    }
    if (
      notificationRealtimeSubscribed
      && notificationRealtimeSubscriptionKey === `student:${activeProfileId}`
    ) {
      clearStudentNotificationPolling();
      return;
    }
    scheduleNotificationRealtimeHydration(0);
  }, NOTIFICATION_FALLBACK_POLL_MS);
}

function clearNotificationRealtimeSubscription() {
  clearNotificationRealtimeHydrateTimer();
  clearStudentNotificationPolling();
  notificationRealtimeHydrateQueued = false;
  notificationRealtimeHydrateInFlight = false;
  notificationRealtimeSubscriptionKey = "";
  notificationRealtimeSubscribed = false;
  const activeChannel = notificationRealtimeChannel;
  notificationRealtimeChannel = null;
  if (!activeChannel) {
    return;
  }
  const client = getSupabaseAuthClient();
  if (client && typeof client.removeChannel === "function") {
    Promise.resolve(client.removeChannel(activeChannel)).catch(() => {
      if (typeof activeChannel.unsubscribe === "function") {
        try {
          activeChannel.unsubscribe();
        } catch {
          // Ignore realtime unsubscribe errors.
        }
      }
    });
    return;
  }
  if (typeof activeChannel.unsubscribe === "function") {
    try {
      activeChannel.unsubscribe();
    } catch {
      // Ignore realtime unsubscribe errors.
    }
  }
}

function clearSessionRealtimeSubscription() {
  clearSessionRealtimeHydrateTimer();
  clearStudentSessionPolling();
  sessionRealtimeHydrateQueued = false;
  sessionRealtimeHydrateInFlight = false;
  sessionRealtimeSubscriptionKey = "";
  sessionRealtimeSubscribed = false;
  const activeChannel = sessionRealtimeChannel;
  sessionRealtimeChannel = null;
  if (!activeChannel) {
    return;
  }
  const client = getSupabaseAuthClient();
  if (client && typeof client.removeChannel === "function") {
    Promise.resolve(client.removeChannel(activeChannel)).catch(() => {
      if (typeof activeChannel.unsubscribe === "function") {
        try {
          activeChannel.unsubscribe();
        } catch {
          // Ignore realtime unsubscribe errors.
        }
      }
    });
    return;
  }
  if (typeof activeChannel.unsubscribe === "function") {
    try {
      activeChannel.unsubscribe();
    } catch {
      // Ignore realtime unsubscribe errors.
    }
  }
}

function shouldRenderAfterNotificationHydration(user) {
  if (!user) {
    return false;
  }
  if (user.role === "admin") {
    return state.route === "admin" && state.adminPage === "notifications";
  }
  return state.route === "dashboard" || state.route === "analytics" || state.route === "notifications";
}

function shouldRenderAfterSessionHydration(user) {
  if (!user || user.role !== "student") {
    return false;
  }
  return [
    "dashboard",
    "create-test",
    "session",
    "review",
    "analytics",
    "profile",
  ].includes(String(state.route || "").trim());
}

async function hydrateStudentSessionsFromCloud(user = null) {
  const currentUser = user || getCurrentUser();
  if (!currentUser || currentUser.role !== "student") {
    return false;
  }
  const profileId = getCurrentSessionProfileId(currentUser);
  if (!isUuidValue(profileId) || hasPendingSessionSyncForId()) {
    return false;
  }

  const ready = await ensureRelationalSyncReady().catch(() => false);
  if (ready) {
    await hydrateRelationalSessions(currentUser);
    state.studentDataLastSyncAt = Date.now();
    return true;
  }

  const scope = getSyncScopeForUser(currentUser);
  if (!scope) {
    return false;
  }
  const result = await hydrateSupabaseSyncKeys([STORAGE_KEYS.sessions], scope).catch(() => ({ hadRemoteData: false }));
  if (result?.hadRemoteData) {
    state.studentDataLastSyncAt = Date.now();
    return true;
  }
  return false;
}

async function runNotificationRealtimeHydration() {
  if (notificationRealtimeHydrateInFlight) {
    notificationRealtimeHydrateQueued = true;
    return;
  }
  const user = getCurrentUser();
  const profileId = getCurrentSessionProfileId(user);
  if (!user || !isUuidValue(profileId)) {
    return;
  }

  notificationRealtimeHydrateInFlight = true;
  try {
    const refreshed = await hydrateRelationalNotifications(user);
    if (!refreshed) {
      return;
    }
    if (user.role === "student") {
      state.studentDataLastSyncAt = Date.now();
    } else if (user.role === "admin") {
      state.adminDataLastSyncAt = Date.now();
    }
    if (shouldRenderAfterNotificationHydration(user)) {
      state.skipNextRouteAnimation = true;
      render();
      return;
    }
    syncTopbar();
  } catch (error) {
    console.warn("Realtime notification hydration failed.", error?.message || error);
  } finally {
    notificationRealtimeHydrateInFlight = false;
    if (notificationRealtimeHydrateQueued) {
      notificationRealtimeHydrateQueued = false;
      scheduleNotificationRealtimeHydration(80);
    }
  }
}

async function runSessionRealtimeHydration() {
  if (sessionRealtimeHydrateInFlight) {
    sessionRealtimeHydrateQueued = true;
    return;
  }
  const user = getCurrentUser();
  const profileId = getCurrentSessionProfileId(user);
  if (!user || user.role !== "student" || !isUuidValue(profileId)) {
    return;
  }

  sessionRealtimeHydrateInFlight = true;
  try {
    const refreshed = await hydrateStudentSessionsFromCloud(user);
    if (!refreshed) {
      return;
    }
    if (shouldRenderAfterSessionHydration(user)) {
      state.skipNextRouteAnimation = true;
      render();
    }
  } catch (error) {
    console.warn("Realtime session hydration failed.", error?.message || error);
  } finally {
    sessionRealtimeHydrateInFlight = false;
    if (sessionRealtimeHydrateQueued) {
      sessionRealtimeHydrateQueued = false;
      scheduleSessionRealtimeHydration(120);
    }
  }
}

function scheduleNotificationRealtimeHydration(delayMs = NOTIFICATION_REALTIME_DEBOUNCE_MS) {
  const user = getCurrentUser();
  const profileId = getCurrentSessionProfileId(user);
  if (!isUuidValue(profileId)) {
    return;
  }
  clearNotificationRealtimeHydrateTimer();
  notificationRealtimeHydrateTimer = window.setTimeout(() => {
    notificationRealtimeHydrateTimer = null;
    runNotificationRealtimeHydration().catch((error) => {
      console.warn("Realtime notification refresh failed.", error?.message || error);
    });
  }, Math.max(0, Number(delayMs) || 0));
}

function scheduleSessionRealtimeHydration(delayMs = SESSION_REALTIME_DEBOUNCE_MS) {
  const user = getCurrentUser();
  const profileId = getCurrentSessionProfileId(user);
  if (!user || user.role !== "student" || !isUuidValue(profileId)) {
    return;
  }
  clearSessionRealtimeHydrateTimer();
  sessionRealtimeHydrateTimer = window.setTimeout(() => {
    sessionRealtimeHydrateTimer = null;
    runSessionRealtimeHydration().catch((error) => {
      console.warn("Realtime session refresh failed.", error?.message || error);
    });
  }, Math.max(0, Number(delayMs) || 0));
}

function ensureNotificationsRealtimeSubscription(user = null) {
  const currentUser = user || getCurrentUser();
  const client = getSupabaseAuthClient();
  const profileId = getCurrentSessionProfileId(currentUser);
  const role = currentUser?.role === "admin" ? "admin" : (currentUser?.role === "student" ? "student" : "");
  if (!client || !isUuidValue(profileId) || !role) {
    clearNotificationRealtimeSubscription();
    return;
  }

  const nextKey = `${role}:${profileId}`;
  if (notificationRealtimeChannel && notificationRealtimeSubscriptionKey === nextKey) {
    if (role === "student") {
      ensureStudentNotificationPolling(currentUser);
    }
    return;
  }

  clearNotificationRealtimeSubscription();
  const channel = client.channel(`notifications-live:${nextKey}`);
  channel.on(
    "postgres_changes",
    { event: "*", schema: "public", table: "notifications" },
    () => {
      scheduleNotificationRealtimeHydration();
    },
  );
  if (role === "student") {
    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "notification_reads",
        filter: `user_id=eq.${profileId}`,
      },
      () => {
        scheduleNotificationRealtimeHydration();
      },
    );
  }

  channel.subscribe((status) => {
    notificationRealtimeSubscribed = status === "SUBSCRIBED";
    if (status === "SUBSCRIBED") {
      clearStudentNotificationPolling();
      scheduleNotificationRealtimeHydration(0);
      return;
    }
    if (role === "student") {
      ensureStudentNotificationPolling(currentUser);
    }
  });
  notificationRealtimeChannel = channel;
  notificationRealtimeSubscriptionKey = nextKey;
}

function ensureStudentSessionPolling(user = null) {
  const currentUser = user || getCurrentUser();
  const profileId = getCurrentSessionProfileId(currentUser);
  const realtimeHealthy = currentUser?.role === "student"
    && sessionRealtimeSubscribed
    && sessionRealtimeSubscriptionKey === `student:${profileId}`;
  if (!currentUser || currentUser.role !== "student" || !isUuidValue(profileId)) {
    clearStudentSessionPolling();
    return;
  }
  if (realtimeHealthy) {
    clearStudentSessionPolling();
    return;
  }
  if (studentDataAutoRefreshPollHandle) {
    return;
  }

  studentDataAutoRefreshPollHandle = window.setInterval(() => {
    const activeUser = getCurrentUser();
    const activeProfileId = getCurrentSessionProfileId(activeUser);
    if (!activeUser || activeUser.role !== "student" || !isUuidValue(activeProfileId)) {
      clearStudentSessionPolling();
      return;
    }
    if (
      sessionRealtimeSubscribed
      && sessionRealtimeSubscriptionKey === `student:${activeProfileId}`
    ) {
      clearStudentSessionPolling();
      return;
    }
    if (!shouldRenderAfterSessionHydration(activeUser) || studentDataAutoRefreshInFlight) {
      return;
    }
    studentDataAutoRefreshInFlight = true;
    hydrateStudentSessionsFromCloud(activeUser)
      .then((refreshed) => {
        if (!refreshed || !shouldRenderAfterSessionHydration(activeUser)) {
          return;
        }
        state.skipNextRouteAnimation = true;
        render();
      })
      .catch((error) => {
        console.warn("Student session refresh failed.", error?.message || error);
      })
      .finally(() => {
        studentDataAutoRefreshInFlight = false;
      });
  }, STUDENT_SESSION_LIVE_REFRESH_MS);
}

function ensureSessionRealtimeSubscription(user = null) {
  const currentUser = user || getCurrentUser();
  const client = getSupabaseAuthClient();
  const profileId = getCurrentSessionProfileId(currentUser);
  if (!client || currentUser?.role !== "student" || !isUuidValue(profileId)) {
    clearSessionRealtimeSubscription();
    clearStudentSessionPolling();
    return;
  }

  const nextKey = `student:${profileId}`;
  if (sessionRealtimeChannel && sessionRealtimeSubscriptionKey === nextKey) {
    ensureStudentSessionPolling(currentUser);
    return;
  }

  clearSessionRealtimeSubscription();
  const channel = client.channel(`sessions-live:${nextKey}`);
  channel.on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "test_blocks",
      filter: `user_id=eq.${profileId}`,
    },
    () => {
      scheduleSessionRealtimeHydration();
    },
  );

  channel.subscribe((status) => {
    sessionRealtimeSubscribed = status === "SUBSCRIBED";
    if (status === "SUBSCRIBED") {
      clearStudentSessionPolling();
      scheduleSessionRealtimeHydration(SESSION_REALTIME_DEBOUNCE_MS);
      return;
    }
    ensureStudentSessionPolling(currentUser);
  });

  sessionRealtimeChannel = channel;
  sessionRealtimeSubscriptionKey = nextKey;
}

function shouldTreatPresenceAsOnline(row) {
  const lastSeenMs = new Date(row?.last_seen_at || 0).getTime();
  return Boolean(row?.is_online) && Number.isFinite(lastSeenMs) && (Date.now() - lastSeenMs) <= PRESENCE_ONLINE_STALE_MS;
}

function setPresenceRouteState() {
  const solvingNow = state.route === "session";
  if (solvingNow && !presenceRuntime.isSolving) {
    presenceRuntime.solvingStartedAt = nowISO();
  }
  if (!solvingNow && presenceRuntime.isSolving) {
    presenceRuntime.solvingStartedAt = null;
  }
  presenceRuntime.isSolving = solvingNow;
}

async function pushCurrentUserPresence(options = {}) {
  const currentUser = getCurrentUser();
  if (!currentUser?.supabaseAuthId || !isUuidValue(currentUser.supabaseAuthId) || !hasActiveSupabaseSessionForUser(currentUser)) {
    return false;
  }

  const force = Boolean(options?.force);
  const ready = await ensureRelationalSyncReady();
  if (!ready) {
    return false;
  }
  const client = getRelationalClient();
  if (!client) {
    return false;
  }

  setPresenceRouteState();
  const now = Date.now();
  const payload = {
    user_id: currentUser.supabaseAuthId,
    full_name: String(currentUser.name || "").trim() || "Student",
    email: String(currentUser.email || "").trim().toLowerCase(),
    role: currentUser.role === "admin" ? "admin" : "student",
    current_route: String(state.route || "").trim() || "dashboard",
    is_online: true,
    is_solving: presenceRuntime.isSolving,
    solving_started_at: presenceRuntime.solvingStartedAt,
    last_seen_at: nowISO(),
  };
  const payloadKey = JSON.stringify([
    payload.user_id,
    payload.current_route,
    payload.is_solving,
    payload.solving_started_at || "",
  ]);
  const tooSoon = now - presenceRuntime.lastSentAt < 7000;
  if (!force && tooSoon && payloadKey === presenceRuntime.lastPayloadKey) {
    return true;
  }

  const { error } = await client.from("user_presence").upsert([payload], { onConflict: "user_id" });
  if (error) {
    return false;
  }

  presenceRuntime.lastPayloadKey = payloadKey;
  presenceRuntime.lastSentAt = now;
  return true;
}

async function markCurrentUserOffline() {
  const currentUser = getCurrentUser();
  if (!currentUser?.supabaseAuthId || !isUuidValue(currentUser.supabaseAuthId) || !hasActiveSupabaseSessionForUser(currentUser)) {
    return;
  }
  const client = getRelationalClient();
  if (!client) {
    return;
  }
  await client
    .from("user_presence")
    .update({
      is_online: false,
      is_solving: false,
      current_route: null,
      solving_started_at: null,
      last_seen_at: nowISO(),
    })
    .eq("user_id", currentUser.supabaseAuthId);
}

function resetSiteActivityRuntime(options = {}) {
  if (!options?.preserveTimer && siteActivityRuntime.timer) {
    window.clearInterval(siteActivityRuntime.timer);
    siteActivityRuntime.timer = null;
  }
  siteActivityRuntime.sessionKey = "";
  siteActivityRuntime.startedAt = "";
  siteActivityRuntime.entryRoute = "";
  siteActivityRuntime.lastRoute = "";
  siteActivityRuntime.pageViews = 0;
  siteActivityRuntime.lastSentAt = 0;
  siteActivityRuntime.lastPayloadKey = "";
  siteActivityRuntime.pushInFlight = false;
  siteActivityRuntime.nextRetryAt = 0;
  siteActivityRuntime.endingInFlight = false;
}

function ensureSiteActivitySessionSeed() {
  const route = String(state.route || "").trim() || "dashboard";
  if (!siteActivityRuntime.sessionKey || !siteActivityRuntime.startedAt) {
    siteActivityRuntime.sessionKey = makeId("activity_session");
    siteActivityRuntime.startedAt = nowISO();
    siteActivityRuntime.entryRoute = route;
    siteActivityRuntime.lastRoute = route;
    siteActivityRuntime.pageViews = 1;
    siteActivityRuntime.lastPayloadKey = "";
    siteActivityRuntime.lastSentAt = 0;
    return route;
  }
  if (!siteActivityRuntime.entryRoute) {
    siteActivityRuntime.entryRoute = route;
  }
  if (!siteActivityRuntime.lastRoute) {
    siteActivityRuntime.lastRoute = route;
  } else if (siteActivityRuntime.lastRoute !== route) {
    siteActivityRuntime.lastRoute = route;
    siteActivityRuntime.pageViews = Math.max(1, Number(siteActivityRuntime.pageViews || 0) + 1);
  }
  if (!Number.isFinite(Number(siteActivityRuntime.pageViews)) || Number(siteActivityRuntime.pageViews) <= 0) {
    siteActivityRuntime.pageViews = 1;
  }
  return route;
}

async function pushCurrentUserActivitySession(options = {}) {
  const currentUser = getCurrentUser();
  if (!currentUser?.supabaseAuthId || !isUuidValue(currentUser.supabaseAuthId) || !hasActiveSupabaseSessionForUser(currentUser)) {
    return false;
  }

  const route = ensureSiteActivitySessionSeed();
  if (document.visibilityState === "hidden" && !options?.allowWhenHidden) {
    return false;
  }

  const ready = await ensureRelationalSyncReady();
  if (!ready) {
    return false;
  }
  const client = getRelationalClient();
  if (!client) {
    return false;
  }

  const force = Boolean(options?.force);
  const now = Date.now();
  const payload = {
    session_key: siteActivityRuntime.sessionKey,
    user_id: currentUser.supabaseAuthId,
    full_name: String(currentUser.name || "").trim() || "Student",
    email: String(currentUser.email || "").trim().toLowerCase(),
    role: currentUser.role === "admin" ? "admin" : "student",
    entry_route: siteActivityRuntime.entryRoute || route,
    current_route: route,
    exit_route: null,
    page_views: Math.max(1, Number(siteActivityRuntime.pageViews || 1)),
    started_at: siteActivityRuntime.startedAt || nowISO(),
    last_seen_at: nowISO(),
    ended_at: null,
  };
  const payloadKey = JSON.stringify([
    payload.session_key,
    payload.current_route,
    payload.page_views,
    payload.entry_route,
  ]);
  const tooSoon = now - siteActivityRuntime.lastSentAt < 8000;
  if (!force && tooSoon && payloadKey === siteActivityRuntime.lastPayloadKey) {
    return true;
  }

  const { error } = await client.from("user_activity_sessions").upsert([payload], { onConflict: "session_key" });
  if (error) {
    return false;
  }

  siteActivityRuntime.lastPayloadKey = payloadKey;
  siteActivityRuntime.lastSentAt = now;
  return true;
}

async function endCurrentUserActivitySession() {
  const currentUser = getCurrentUser();
  const sessionKey = String(siteActivityRuntime.sessionKey || "").trim();
  if (!currentUser?.supabaseAuthId || !isUuidValue(currentUser.supabaseAuthId) || !sessionKey || !hasActiveSupabaseSessionForUser(currentUser)) {
    resetSiteActivityRuntime();
    return false;
  }
  if (siteActivityRuntime.endingInFlight) {
    return false;
  }

  const client = getRelationalClient();
  if (!client) {
    resetSiteActivityRuntime();
    return false;
  }

  siteActivityRuntime.endingInFlight = true;
  try {
    const finalRoute = String(siteActivityRuntime.lastRoute || state.route || "").trim() || null;
    const { error } = await client
      .from("user_activity_sessions")
      .update({
        current_route: null,
        exit_route: finalRoute,
        page_views: Math.max(1, Number(siteActivityRuntime.pageViews || 1)),
        last_seen_at: nowISO(),
        ended_at: nowISO(),
      })
      .eq("session_key", sessionKey)
      .eq("user_id", currentUser.supabaseAuthId);
    if (error) {
      return false;
    }
    return true;
  } finally {
    resetSiteActivityRuntime();
  }
}

function syncSiteActivityRuntime(user) {
  if (!user?.supabaseAuthId || !isUuidValue(user.supabaseAuthId) || !hasActiveSupabaseSessionForUser(user)) {
    resetSiteActivityRuntime();
    return;
  }

  if (document.visibilityState === "hidden") {
    if (siteActivityRuntime.timer) {
      window.clearInterval(siteActivityRuntime.timer);
      siteActivityRuntime.timer = null;
    }
    return;
  }

  if (!siteActivityRuntime.timer) {
    siteActivityRuntime.timer = window.setInterval(() => {
      pushCurrentUserActivitySession().catch((error) => {
        console.warn("Site activity heartbeat failed.", error?.message || error);
      });
    }, SITE_ACTIVITY_HEARTBEAT_MS);
  }

  const currentRoute = String(state.route || "").trim() || "dashboard";
  const needsStart = !siteActivityRuntime.sessionKey || !siteActivityRuntime.startedAt;
  const routeChanged = Boolean(siteActivityRuntime.sessionKey) && siteActivityRuntime.lastRoute !== currentRoute;
  const now = Date.now();
  const heartbeatDue = (now - siteActivityRuntime.lastSentAt) >= SITE_ACTIVITY_HEARTBEAT_MS;
  if (!needsStart && !routeChanged && !heartbeatDue) {
    return;
  }
  if (now < siteActivityRuntime.nextRetryAt || siteActivityRuntime.pushInFlight) {
    return;
  }

  siteActivityRuntime.pushInFlight = true;
  pushCurrentUserActivitySession({ force: needsStart || routeChanged })
    .then((ok) => {
      siteActivityRuntime.nextRetryAt = ok ? 0 : (Date.now() + 15000);
    })
    .catch((error) => {
      console.warn("Site activity update failed.", error?.message || error);
      siteActivityRuntime.nextRetryAt = Date.now() + 15000;
    })
    .finally(() => {
      siteActivityRuntime.pushInFlight = false;
    });
}

function syncPresenceRuntime(user) {
  if (!user?.supabaseAuthId || !isUuidValue(user.supabaseAuthId) || !hasActiveSupabaseSessionForUser(user)) {
    if (presenceRuntime.timer) {
      window.clearInterval(presenceRuntime.timer);
      presenceRuntime.timer = null;
    }
    presenceRuntime.isSolving = false;
    presenceRuntime.solvingStartedAt = null;
    presenceRuntime.lastPayloadKey = "";
    presenceRuntime.lastSentAt = 0;
    presenceRuntime.lastRoute = "";
    presenceRuntime.lastSolving = false;
    presenceRuntime.pushInFlight = false;
    presenceRuntime.nextRetryAt = 0;
    return;
  }

  setPresenceRouteState();
  if (!presenceRuntime.timer) {
    presenceRuntime.timer = window.setInterval(() => {
      pushCurrentUserPresence().catch((error) => {
        console.warn("Presence heartbeat failed.", error?.message || error);
      });
    }, PRESENCE_HEARTBEAT_MS);
  }
  const routeChanged = presenceRuntime.lastRoute !== state.route;
  const solvingChanged = presenceRuntime.lastSolving !== presenceRuntime.isSolving;
  const now = Date.now();
  const heartbeatDue = (now - presenceRuntime.lastSentAt) >= PRESENCE_HEARTBEAT_MS;
  if (now < presenceRuntime.nextRetryAt) {
    return;
  }
  if (!routeChanged && !solvingChanged && !heartbeatDue) {
    return;
  }
  if (presenceRuntime.pushInFlight) {
    return;
  }
  presenceRuntime.pushInFlight = true;
  pushCurrentUserPresence({ force: routeChanged || solvingChanged })
    .then((ok) => {
      if (ok) {
        presenceRuntime.lastRoute = state.route;
        presenceRuntime.lastSolving = presenceRuntime.isSolving;
        presenceRuntime.nextRetryAt = 0;
      } else {
        presenceRuntime.nextRetryAt = Date.now() + 15000;
      }
    })
    .catch((error) => {
      console.warn("Presence update failed.", error?.message || error);
      presenceRuntime.nextRetryAt = Date.now() + 15000;
    })
    .finally(() => {
      presenceRuntime.pushInFlight = false;
    });
}

async function refreshAdminPresenceSnapshot(options = {}) {
  const currentUser = getCurrentUser();
  if (!currentUser || currentUser.role !== "admin") {
    return false;
  }
  if (state.adminPresenceLoading) {
    return false;
  }
  const force = Boolean(options?.force);
  const silent = Boolean(options?.silent);
  if (!force && state.adminPresenceLastSyncAt && (Date.now() - state.adminPresenceLastSyncAt) < (ADMIN_DATA_REFRESH_MS - 2000)) {
    return true;
  }

  const ready = await ensureRelationalSyncReady();
  if (!ready) {
    state.adminPresenceError = "Presence data is unavailable.";
    return false;
  }
  const client = getRelationalClient();
  if (!client) {
    state.adminPresenceError = "Supabase relational client is unavailable.";
    return false;
  }

  state.adminPresenceLoading = true;
  try {
    const { data, error } = await client
      .from("user_presence")
      .select("user_id,full_name,email,role,current_route,is_online,is_solving,solving_started_at,last_seen_at,updated_at")
      .order("last_seen_at", { ascending: false });
    if (error) {
      state.adminPresenceError = error.message || "Could not load presence data.";
      return false;
    }
    state.adminPresenceRows = Array.isArray(data) ? data : [];
    state.adminPresenceError = "";
    state.adminPresenceLastSyncAt = Date.now();
    return true;
  } finally {
    state.adminPresenceLoading = false;
  }
}

function getLocalDayRange(baseDate = new Date()) {
  const start = new Date(baseDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const yyyy = start.getFullYear();
  const mm = String(start.getMonth() + 1).padStart(2, "0");
  const dd = String(start.getDate()).padStart(2, "0");
  return {
    label: `${yyyy}-${mm}-${dd}`,
    startMs: start.getTime(),
    endMs: end.getTime(),
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

function getActivitySessionDurationMsForRange(sessionRow, rangeStartMs, rangeEndMs) {
  const startedAtMs = parseSyncTimestampMs(sessionRow?.started_at);
  if (!startedAtMs) {
    return 0;
  }
  const lastSeenAtMs = parseSyncTimestampMs(sessionRow?.last_seen_at);
  const endedAtMs = parseSyncTimestampMs(sessionRow?.ended_at);
  const sessionEndMs = Math.max(endedAtMs, lastSeenAtMs, startedAtMs);
  if (startedAtMs >= rangeEndMs || sessionEndMs <= rangeStartMs) {
    return 0;
  }
  const clampedStartMs = Math.max(startedAtMs, rangeStartMs);
  const clampedEndMs = Math.min(sessionEndMs, rangeEndMs);
  return Math.max(0, clampedEndMs - clampedStartMs);
}

function formatReportDurationMs(durationMs) {
  const totalSeconds = Math.max(0, Math.round(Number(durationMs || 0) / 1000));
  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }
  const totalMinutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (totalMinutes < 60) {
    return seconds ? `${totalMinutes}m ${seconds}s` : `${totalMinutes}m`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}

function formatReportDateTime(value) {
  if (!value) {
    return "-";
  }
  const ms = parseSyncTimestampMs(value);
  if (!ms) {
    return "-";
  }
  return new Date(ms).toLocaleString();
}

function downloadBlobFile(blob, fileName) {
  if (window.navigator && typeof window.navigator.msSaveOrOpenBlob === "function") {
    window.navigator.msSaveOrOpenBlob(blob, fileName);
    return;
  }
  const exportUrl = URL.createObjectURL(blob);
  const downloadLink = document.createElement("a");
  downloadLink.href = exportUrl;
  downloadLink.download = fileName;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  downloadLink.remove();
  window.setTimeout(() => URL.revokeObjectURL(exportUrl), 1200);
}

async function buildAdminActivityReportSnapshot() {
  const currentUser = getCurrentUser();
  if (!currentUser || currentUser.role !== "admin") {
    throw new Error("Admin role required.");
  }

  const ready = await ensureRelationalSyncReady({ force: true });
  if (!ready) {
    throw new Error("Reporting database is unavailable.");
  }
  const client = getRelationalClient();
  if (!client) {
    throw new Error("Supabase relational client is unavailable.");
  }

  const dayRange = getLocalDayRange();
  const lookbackStartIso = new Date(dayRange.startMs - ACTIVITY_REPORT_LOOKBACK_MS).toISOString();

  const [
    profilesResult,
    presenceResult,
    sessionsResult,
    blocksResult,
    coursesResult,
  ] = await Promise.all([
    runWithTimeoutResult(
      client.from("profiles").select("id,full_name,email,role,approved,created_at"),
      ADMIN_REQUEST_TIMEOUT_MS,
      "Profiles query timed out.",
    ),
    runWithTimeoutResult(
      client.from("user_presence").select("user_id,full_name,email,role,current_route,is_online,is_solving,last_seen_at"),
      ADMIN_REQUEST_TIMEOUT_MS,
      "Presence query timed out.",
    ),
    runWithTimeoutResult(
      client
        .from("user_activity_sessions")
        .select("session_key,user_id,full_name,email,role,entry_route,current_route,exit_route,page_views,started_at,last_seen_at,ended_at")
        .gte("last_seen_at", lookbackStartIso)
        .order("last_seen_at", { ascending: false }),
      ADMIN_REQUEST_TIMEOUT_MS,
      "Activity sessions query timed out.",
    ),
    runWithTimeoutResult(
      client
        .from("test_blocks")
        .select("id,user_id,course_id,status,question_count,elapsed_seconds,created_at,completed_at,updated_at")
        .gte("updated_at", lookbackStartIso)
        .order("updated_at", { ascending: false }),
      ADMIN_REQUEST_TIMEOUT_MS,
      "Test blocks query timed out.",
    ),
    runWithTimeoutResult(
      client.from("courses").select("id,course_name,course_code"),
      ADMIN_REQUEST_TIMEOUT_MS,
      "Courses query timed out.",
    ),
  ]);

  const queryResults = [profilesResult, presenceResult, sessionsResult, blocksResult, coursesResult];
  const failedResult = queryResults.find((result) => result?.error);
  if (failedResult?.error) {
    throw new Error(failedResult.error.message || "Could not build activity report.");
  }

  const profiles = Array.isArray(profilesResult?.data) ? profilesResult.data : [];
  const presenceRows = Array.isArray(presenceResult?.data) ? presenceResult.data : [];
  const sessionRows = Array.isArray(sessionsResult?.data) ? sessionsResult.data : [];
  const blockRows = Array.isArray(blocksResult?.data) ? blocksResult.data : [];
  const courseRows = Array.isArray(coursesResult?.data) ? coursesResult.data : [];

  const profileById = new Map(profiles.map((row) => [String(row?.id || ""), row]));
  const courseNameById = new Map(
    courseRows.map((row) => [
      String(row?.id || ""),
      String(row?.course_name || "").trim() || String(row?.course_code || "").trim() || "Unknown course",
    ]),
  );

  const todayPresenceRows = presenceRows.filter((row) => shouldTreatPresenceAsOnline(row) || parseSyncTimestampMs(row?.last_seen_at) >= dayRange.startMs);
  const onlineRows = presenceRows.filter((row) => shouldTreatPresenceAsOnline(row));
  const solvingRows = onlineRows.filter((row) => Boolean(row?.is_solving));
  const todaySessionRows = sessionRows.filter((row) => getActivitySessionDurationMsForRange(row, dayRange.startMs, dayRange.endMs) > 0);

  const userStatsById = new Map();
  const ensureUserStats = (userId) => {
    const normalizedUserId = String(userId || "").trim();
    if (!normalizedUserId) {
      return null;
    }
    if (!userStatsById.has(normalizedUserId)) {
      const profile = profileById.get(normalizedUserId) || null;
      userStatsById.set(normalizedUserId, {
        userId: normalizedUserId,
        name: String(profile?.full_name || "").trim(),
        email: String(profile?.email || "").trim().toLowerCase(),
        role: String(profile?.role || "student").trim() || "student",
        sessionsToday: 0,
        totalDurationMs: 0,
        pageViews: 0,
        testsStartedToday: 0,
        testsCompletedToday: 0,
        completedTestDurationSec: 0,
        lastSeenAt: "",
        status: "offline",
      });
    }
    return userStatsById.get(normalizedUserId);
  };

  let totalSiteDurationMs = 0;
  let totalPageViews = 0;
  todaySessionRows.forEach((row) => {
    const userStats = ensureUserStats(row?.user_id);
    if (!userStats) {
      return;
    }
    const durationMs = getActivitySessionDurationMsForRange(row, dayRange.startMs, dayRange.endMs);
    userStats.sessionsToday += 1;
    userStats.totalDurationMs += durationMs;
    userStats.pageViews += Math.max(1, Number(row?.page_views || 1));
    userStats.lastSeenAt = parseSyncTimestampMs(row?.last_seen_at) > parseSyncTimestampMs(userStats.lastSeenAt) ? row?.last_seen_at || userStats.lastSeenAt : userStats.lastSeenAt;
    if (!userStats.name) {
      userStats.name = String(row?.full_name || "").trim();
    }
    if (!userStats.email) {
      userStats.email = String(row?.email || "").trim().toLowerCase();
    }
    if (!userStats.role) {
      userStats.role = String(row?.role || "student").trim() || "student";
    }
    totalSiteDurationMs += durationMs;
    totalPageViews += Math.max(1, Number(row?.page_views || 1));
  });

  todayPresenceRows.forEach((row) => {
    const userStats = ensureUserStats(row?.user_id);
    if (!userStats) {
      return;
    }
    userStats.lastSeenAt = parseSyncTimestampMs(row?.last_seen_at) > parseSyncTimestampMs(userStats.lastSeenAt) ? row?.last_seen_at || userStats.lastSeenAt : userStats.lastSeenAt;
    if (!userStats.name) {
      userStats.name = String(row?.full_name || "").trim();
    }
    if (!userStats.email) {
      userStats.email = String(row?.email || "").trim().toLowerCase();
    }
    userStats.role = String(row?.role || userStats.role || "student").trim() || "student";
    userStats.status = shouldTreatPresenceAsOnline(row)
      ? (row?.is_solving ? "solving" : "online")
      : userStats.status;
  });

  const startedTodayBlocks = [];
  const completedTodayBlocks = [];
  blockRows.forEach((row) => {
    const createdAtMs = parseSyncTimestampMs(row?.created_at);
    const completedAtMs = parseSyncTimestampMs(row?.completed_at);
    const startedToday = createdAtMs >= dayRange.startMs && createdAtMs < dayRange.endMs;
    const completedToday = completedAtMs >= dayRange.startMs && completedAtMs < dayRange.endMs;
    if (startedToday) {
      startedTodayBlocks.push(row);
    }
    if (completedToday) {
      completedTodayBlocks.push(row);
    }
    if (!startedToday && !completedToday) {
      return;
    }
    const userStats = ensureUserStats(row?.user_id);
    if (!userStats) {
      return;
    }
    if (startedToday) {
      userStats.testsStartedToday += 1;
    }
    if (completedToday) {
      userStats.testsCompletedToday += 1;
      userStats.completedTestDurationSec += Math.max(0, Number(row?.elapsed_seconds || 0));
    }
  });

  const courseStatsById = new Map();
  const ensureCourseStats = (courseId) => {
    const normalizedCourseId = String(courseId || "").trim() || "__unknown__";
    if (!courseStatsById.has(normalizedCourseId)) {
      courseStatsById.set(normalizedCourseId, {
        courseName: courseNameById.get(normalizedCourseId) || "Unknown course",
        testsStartedToday: 0,
        testsCompletedToday: 0,
        totalQuestions: 0,
        activeUserIds: new Set(),
      });
    }
    return courseStatsById.get(normalizedCourseId);
  };

  startedTodayBlocks.forEach((row) => {
    const courseStats = ensureCourseStats(row?.course_id);
    courseStats.testsStartedToday += 1;
    courseStats.totalQuestions += Math.max(0, Number(row?.question_count || 0));
    if (row?.user_id) {
      courseStats.activeUserIds.add(String(row.user_id));
    }
  });

  completedTodayBlocks.forEach((row) => {
    const courseStats = ensureCourseStats(row?.course_id);
    courseStats.testsCompletedToday += 1;
    courseStats.totalQuestions += Math.max(0, Number(row?.question_count || 0));
    if (row?.user_id) {
      courseStats.activeUserIds.add(String(row.user_id));
    }
  });

  const activeUsersToday = [...userStatsById.values()].filter((entry) => entry.sessionsToday > 0);
  const totalUsers = profiles.length;
  const totalStudents = profiles.filter((row) => String(row?.role || "") === "student").length;
  const approvedStudents = profiles.filter((row) => String(row?.role || "") === "student" && Boolean(row?.approved)).length;
  const pendingStudents = profiles.filter((row) => String(row?.role || "") === "student" && !Boolean(row?.approved)).length;
  const newUsersToday = profiles.filter((row) => {
    const createdAtMs = parseSyncTimestampMs(row?.created_at);
    return createdAtMs >= dayRange.startMs && createdAtMs < dayRange.endMs;
  }).length;
  const averageSessionDurationMs = todaySessionRows.length ? Math.round(totalSiteDurationMs / todaySessionRows.length) : 0;
  const averageActiveUserDurationMs = activeUsersToday.length ? Math.round(totalSiteDurationMs / activeUsersToday.length) : 0;
  const averagePageViewsPerSession = todaySessionRows.length ? Number((totalPageViews / todaySessionRows.length).toFixed(1)) : 0;
  const averageCompletedTestDurationSec = completedTodayBlocks.length
    ? Math.round(completedTodayBlocks.reduce((sum, row) => sum + Math.max(0, Number(row?.elapsed_seconds || 0)), 0) / completedTodayBlocks.length)
    : 0;
  const averageQuestionsPerCompletedTest = completedTodayBlocks.length
    ? Number((completedTodayBlocks.reduce((sum, row) => sum + Math.max(0, Number(row?.question_count || 0)), 0) / completedTodayBlocks.length).toFixed(1))
    : 0;

  const userBreakdown = [...userStatsById.values()]
    .filter((entry) => entry.sessionsToday > 0 || entry.testsStartedToday > 0 || entry.testsCompletedToday > 0 || entry.status !== "offline")
    .sort((a, b) => b.totalDurationMs - a.totalDurationMs || b.testsCompletedToday - a.testsCompletedToday || a.name.localeCompare(b.name));

  const courseBreakdown = [...courseStatsById.values()]
    .sort((a, b) => b.testsStartedToday - a.testsStartedToday || b.testsCompletedToday - a.testsCompletedToday || a.courseName.localeCompare(b.courseName));

  return {
    dayRange,
    generatedAt: nowISO(),
    summary: {
      totalUsers,
      totalStudents,
      approvedStudents,
      pendingStudents,
      newUsersToday,
      activeUsersToday: activeUsersToday.length,
      onlineNow: onlineRows.length,
      solvingNow: solvingRows.length,
      totalSiteDurationMs,
      averageSessionDurationMs,
      averageActiveUserDurationMs,
      totalSessionsToday: todaySessionRows.length,
      totalPageViews,
      averagePageViewsPerSession,
      testsStartedToday: startedTodayBlocks.length,
      testsCompletedToday: completedTodayBlocks.length,
      averageCompletedTestDurationSec,
      averageQuestionsPerCompletedTest,
    },
    userBreakdown,
    courseBreakdown,
  };
}

function renderAdminActivityReportWorkbook(snapshot) {
  const summaryRows = [
    ["Report date", snapshot.dayRange.label],
    ["Generated at", formatReportDateTime(snapshot.generatedAt)],
    ["Registered users", snapshot.summary.totalUsers.toLocaleString()],
    ["Students", snapshot.summary.totalStudents.toLocaleString()],
    ["Approved students", snapshot.summary.approvedStudents.toLocaleString()],
    ["Pending students", snapshot.summary.pendingStudents.toLocaleString()],
    ["New users today", snapshot.summary.newUsersToday.toLocaleString()],
    ["Active users today", snapshot.summary.activeUsersToday.toLocaleString()],
    ["Online now", snapshot.summary.onlineNow.toLocaleString()],
    ["Solving now", snapshot.summary.solvingNow.toLocaleString()],
    ["Total site time today", formatReportDurationMs(snapshot.summary.totalSiteDurationMs)],
    ["Average time per active user", formatReportDurationMs(snapshot.summary.averageActiveUserDurationMs)],
    ["Average session duration", formatReportDurationMs(snapshot.summary.averageSessionDurationMs)],
    ["Sessions started today", snapshot.summary.totalSessionsToday.toLocaleString()],
    ["Page views today", snapshot.summary.totalPageViews.toLocaleString()],
    ["Average page views per session", String(snapshot.summary.averagePageViewsPerSession)],
    ["Tests started today", snapshot.summary.testsStartedToday.toLocaleString()],
    ["Tests completed today", snapshot.summary.testsCompletedToday.toLocaleString()],
    ["Average completed test time", formatReportDurationMs(snapshot.summary.averageCompletedTestDurationSec * 1000)],
    ["Average questions per completed test", String(snapshot.summary.averageQuestionsPerCompletedTest)],
  ];

  const renderTable = (headers, rows, emptyMessage) => `
    <table>
      <thead>
        <tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>
      </thead>
      <tbody>
        ${rows.length
        ? rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")
        : `<tr><td colspan="${headers.length}">${escapeHtml(emptyMessage)}</td></tr>`
      }
      </tbody>
    </table>
  `;

  const userRows = snapshot.userBreakdown.map((entry) => ([
    entry.name || "Unknown user",
    entry.email || "-",
    entry.role || "student",
    entry.status,
    String(entry.sessionsToday),
    formatReportDurationMs(entry.totalDurationMs),
    entry.sessionsToday ? formatReportDurationMs(Math.round(entry.totalDurationMs / entry.sessionsToday)) : "-",
    String(entry.pageViews),
    String(entry.testsStartedToday),
    String(entry.testsCompletedToday),
    entry.testsCompletedToday ? formatReportDurationMs(Math.round((entry.completedTestDurationSec / entry.testsCompletedToday) * 1000)) : "-",
    formatReportDateTime(entry.lastSeenAt),
  ]));

  const courseRows = snapshot.courseBreakdown.map((entry) => ([
    entry.courseName,
    String(entry.testsStartedToday),
    String(entry.testsCompletedToday),
    String(entry.activeUserIds.size),
    String(entry.totalQuestions),
  ]));

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8" />
  <meta name="ProgId" content="Excel.Sheet" />
  <meta name="Generator" content="O6U MedBank" />
  <style>
    body { font-family: Arial, sans-serif; color: #0f172a; }
    h1, h2 { margin: 0 0 12px; }
    p { margin: 0 0 8px; }
    table { border-collapse: collapse; width: 100%; margin: 10px 0 24px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 10px; vertical-align: top; }
    th { background: #e2e8f0; text-align: left; font-weight: 700; }
    .section { margin-top: 28px; }
    .subtle { color: #475569; }
  </style>
</head>
<body>
  <h1>O6U MedBank Daily Activity Report</h1>
  <p class="subtle">Daily operational report for ${escapeHtml(snapshot.dayRange.label)}.</p>

  <div class="section">
    <h2>Summary</h2>
    ${renderTable(["Metric", "Value"], summaryRows, "No summary metrics available.")}
  </div>

  <div class="section">
    <h2>User Breakdown</h2>
    ${renderTable(
    ["User", "Email", "Role", "Status", "Sessions", "Time On Site", "Avg Session", "Page Views", "Tests Started", "Tests Completed", "Avg Completed Test", "Last Seen"],
    userRows,
    "No user activity recorded for this day.",
  )}
  </div>

  <div class="section">
    <h2>Course Breakdown</h2>
    ${renderTable(
    ["Course", "Tests Started", "Tests Completed", "Active Users", "Questions In Tests"],
    courseRows,
    "No course activity recorded for this day.",
  )}
  </div>
</body>
</html>`;
}

async function downloadAdminActivityReport() {
  const snapshot = await buildAdminActivityReportSnapshot();
  const workbookHtml = renderAdminActivityReportWorkbook(snapshot);
  const blob = new Blob(["\ufeff", workbookHtml], { type: "application/vnd.ms-excel;charset=utf-8" });
  const fileName = `o6u-medbank-daily-activity-${snapshot.dayRange.label}.xls`;
  downloadBlobFile(blob, fileName);
  appendSystemLog("admin.activity.report", "Admin daily activity report downloaded.", {
    reportDate: snapshot.dayRange.label,
    activeUsers: snapshot.summary.activeUsersToday,
    testsStarted: snapshot.summary.testsStartedToday,
    testsCompleted: snapshot.summary.testsCompletedToday,
  });
  return fileName;
}

function shouldRefreshStudentData(user) {
  if (!user || user.role !== "student") {
    return false;
  }
  if (isPostAuthDataWarmupActive(user)) {
    return false;
  }
  if (state.studentDataRefreshing) {
    return false;
  }
  const last = Number(state.studentDataLastSyncAt || 0);
  return !last || (Date.now() - last) > STUDENT_DATA_REFRESH_MS;
}

async function refreshStudentDataFromSupabaseState(user) {
  if (!user || user.role !== "student") {
    return false;
  }
  const scope = getSyncScopeForUser(user);
  if (!scope) {
    return false;
  }

  if (!supabaseSync.enabled || !supabaseSync.client || !supabaseSync.tableName || !supabaseSync.storageKeyColumn) {
    const bootstrap = await initSupabaseSync().catch(() => ({ enabled: false }));
    if (!bootstrap?.enabled) {
      return false;
    }
  }
  if (!supabaseSync.enabled || !supabaseSync.client || !supabaseSync.tableName || !supabaseSync.storageKeyColumn) {
    return false;
  }

  if (supabaseSync.pendingWrites.size || supabaseSync.flushing) {
    await flushSupabaseWrites().catch(() => { });
  }

  const globalRefreshResult = await hydrateSupabaseSyncKeys([
    STORAGE_KEYS.users,
    STORAGE_KEYS.questions,
    STORAGE_KEYS.curriculum,
    STORAGE_KEYS.courseTopics,
    STORAGE_KEYS.courseTopicGroups,
    STORAGE_KEYS.topicNewCatalog,
    STORAGE_KEYS.courseNotebookLinks,
    STORAGE_KEYS.siteMaintenance,
    STORAGE_KEYS.studentRefreshTrigger,
  ]).catch((error) => ({ error }));
  if (globalRefreshResult?.error) {
    return false;
  }
  if (shouldForceStudentRefreshFromAdminTrigger(user)) {
    return true;
  }

  const userScopedKeys = (state.route === "session" || state.route === "review")
    ? USER_SCOPED_SYNC_KEYS.filter((key) => key !== STORAGE_KEYS.sessions)
    : USER_SCOPED_SYNC_KEYS;
  const userRefreshResult = await hydrateSupabaseSyncKeys(userScopedKeys, scope).catch((error) => ({ error }));
  if (userRefreshResult?.error) {
    return false;
  }
  if (!userRefreshResult?.hadRemoteData) {
    scheduleFullSupabaseSync({ includeUserScoped: true, scope, user });
  }
  return true;
}

async function refreshStudentDataSnapshot(user, options = {}) {
  if (!user || user.role !== "student") {
    return false;
  }
  const force = Boolean(options?.force);
  const rerender = options?.rerender !== false;
  if (!force && !shouldRefreshStudentData(user)) {
    return true;
  }
  if (state.studentDataRefreshing) {
    return false;
  }

  let shouldRerenderRoute = "";
  const routeBefore = state.route;
  state.studentDataRefreshing = true;
  try {
    const ready = await ensureRelationalSyncReady({ force });
    if (!ready) {
      const fallbackRefreshed = await refreshStudentDataFromSupabaseState(user);
      state.studentDataLastSyncAt = Date.now();
      if (!fallbackRefreshed) {
        return false;
      }
      if (
        rerender
        && routeBefore !== "session"
        && routeBefore !== "review"
        && state.route === routeBefore
      ) {
        shouldRerenderRoute = routeBefore;
      }
      return true;
    }
    if (relationalSync.pendingWrites.size || relationalSync.flushing) {
      await flushPendingSyncNow({ throwOnRelationalFailure: false }).catch(() => { });
    }
    const now = Date.now();
    const needsFullSync = force
      || !state.studentDataLastFullSyncAt
      || (now - state.studentDataLastFullSyncAt) > STUDENT_FULL_DATA_REFRESH_MS;
    const hasPendingUserWrites = relationalSync.pendingWrites.has(STORAGE_KEYS.users) || relationalSync.flushing;
    const hasPendingQuestionWrites = relationalSync.pendingWrites.has(STORAGE_KEYS.questions) || relationalSync.flushing;
    const hasPendingSessionWrites = relationalSync.pendingWrites.has(STORAGE_KEYS.sessions) || relationalSync.flushing;
    let completedFullSync = false;
    if (needsFullSync) {
      await hydrateRelationalCoursesAndTopics();
      if (!hasPendingUserWrites) {
        await hydrateRelationalProfiles(user);
      }
      if (!hasPendingQuestionWrites) {
        await hydrateRelationalQuestions();
      }
      completedFullSync = !hasPendingUserWrites && !hasPendingQuestionWrites;
    }
    if (completedFullSync) {
      state.studentDataLastFullSyncAt = now;
    }
    await hydrateRelationalNotifications(user);
    await hydrateSupabaseSyncKeys([
      STORAGE_KEYS.siteMaintenance,
      STORAGE_KEYS.courseTopicGroups,
      STORAGE_KEYS.courseNotebookLinks,
      STORAGE_KEYS.topicNewCatalog,
      STORAGE_KEYS.autoApproveStudentAccess,
      STORAGE_KEYS.studentRefreshTrigger,
    ]).catch(() => ({ hadRemoteData: false }));
    if (shouldForceStudentRefreshFromAdminTrigger(user)) {
      return true;
    }
    if (!hasPendingSessionWrites) {
      await hydrateRelationalSessions(user);
    }
    state.studentDataLastSyncAt = Date.now();
    if (
      rerender
      && routeBefore !== "session"
      && routeBefore !== "review"
      && state.route === routeBefore
    ) {
      shouldRerenderRoute = routeBefore;
    }
    return true;
  } catch (error) {
    const fallbackRefreshed = await refreshStudentDataFromSupabaseState(user).catch(() => false);
    state.studentDataLastSyncAt = Date.now();
    if (fallbackRefreshed) {
      if (
        rerender
        && (
          routeBefore === "dashboard"
          || routeBefore === "analytics"
          || routeBefore === "notifications"
          || routeBefore === "create-test"
        )
        && state.route === routeBefore
      ) {
        shouldRerenderRoute = routeBefore;
      }
      return true;
    }
    console.warn("Student data refresh failed.", error?.message || error);
    return false;
  } finally {
    state.studentDataRefreshing = false;
    scheduleSyncStatusUiRefresh();
    if (shouldRerenderRoute && state.route === shouldRerenderRoute) {
      state.skipNextRouteAnimation = true;
      render();
    }
  }
}

function ensureAdminPresencePolling() {
  if (adminPresencePollHandle) {
    return;
  }
  adminPresencePollHandle = window.setInterval(() => {
    if (state.route !== "admin" || state.adminPage !== "activity") {
      clearAdminPresencePolling();
      return;
    }
    refreshAdminPresenceSnapshot()
      .then((ok) => {
        if (ok && state.route === "admin" && state.adminPage === "activity") {
          state.skipNextRouteAnimation = true;
          render();
        }
      })
      .catch((error) => {
        console.warn("Admin presence refresh failed.", error?.message || error);
      });
  }, ADMIN_DATA_REFRESH_MS);
}

function shouldRefreshAdminData(user) {
  if (!user || user.role !== "admin") {
    return false;
  }
  if (isPostAuthDataWarmupActive(user)) {
    return false;
  }
  if (state.adminDataRefreshing) {
    return false;
  }
  const last = Number(state.adminDataLastSyncAt || 0);
  return !last || (Date.now() - last) > ADMIN_DATA_REFRESH_MS;
}

function isQuestionSyncBusy() {
  return Boolean(questionSyncInFlightPromise || queuedQuestionSyncPayload);
}

async function refreshAdminDataSnapshot(user, options = {}) {
  if (!user || user.role !== "admin") {
    return false;
  }
  const force = Boolean(options?.force);
  const surfaceErrors = options?.surfaceErrors !== false;
  const includeHeavyData = options?.includeHeavyData !== false;
  if (!force && !shouldRefreshAdminData(user)) {
    return true;
  }
  if (state.adminDataRefreshing) {
    if (surfaceErrors && !state.adminDataSyncError) {
      state.adminDataSyncError = "Sync already in progress. Please wait a few seconds.";
    }
    return false;
  }

  state.adminDataRefreshing = true;
  if (surfaceErrors) {
    state.adminDataSyncError = "";
  }
  try {
    const ready = await ensureRelationalSyncReady({ force });
    if (!ready) {
      const usersRecovered = await hydrateUsersFromSupabaseBackup().catch(() => false);
      if (surfaceErrors || !state.adminDataLastSyncAt) {
        const baseMessage = String(relationalSync.lastReadyError || "Relational sync is unavailable.");
        state.adminDataSyncError = usersRecovered
          ? `${baseMessage} Loaded users from cloud backup.`
          : baseMessage;
      }
      state.adminDataLastSyncAt = Date.now();
      return usersRecovered;
    }
    if (relationalSync.pendingWrites.size || relationalSync.flushing || isQuestionSyncBusy()) {
      await flushPendingSyncNow({ throwOnRelationalFailure: false }).catch(() => { });
    }

    const hasPendingUserWrites = relationalSync.pendingWrites.has(STORAGE_KEYS.users) || relationalSync.flushing;
    const hasPendingCourseWrites = relationalSync.pendingWrites.has(STORAGE_KEYS.curriculum)
      || relationalSync.pendingWrites.has(STORAGE_KEYS.courseTopics)
      || relationalSync.flushing;
    const hasPendingQuestionWrites = relationalSync.pendingWrites.has(STORAGE_KEYS.questions)
      || relationalSync.flushing
      || isQuestionSyncBusy();
    const shouldHydrateQuestions = !hasPendingQuestionWrites && (
      includeHeavyData
      || state.adminPage === "questions"
      || state.adminPage === "bulk-import"
      || !adminQuestionsLastHydratedAt
      || (Date.now() - adminQuestionsLastHydratedAt) > ADMIN_QUESTION_BACKGROUND_REFRESH_MS
    );

    if (!hasPendingCourseWrites) {
      await hydrateRelationalCoursesAndTopics();
    }
    if (!hasPendingUserWrites) {
      await hydrateRelationalProfiles(user);
    }
    if (shouldHydrateQuestions) {
      await hydrateRelationalQuestions();
      adminQuestionsLastHydratedAt = Date.now();
    }
    await hydrateRelationalNotifications(user);
    await hydrateSupabaseSyncKeys([STORAGE_KEYS.siteMaintenance]).catch(() => ({ hadRemoteData: false }));
    if (state.adminPage === "activity" || !state.adminPresenceLastSyncAt) {
      await refreshAdminPresenceSnapshot({ force: true, silent: true });
    }
    state.adminDataSyncError = "";
    state.adminDataLastSyncAt = Date.now();
    return true;
  } catch (error) {
    if (surfaceErrors || !state.adminDataLastSyncAt) {
      state.adminDataSyncError = String(error?.message || "Failed to refresh admin data.");
    }
    state.adminDataLastSyncAt = Date.now();
    return false;
  } finally {
    state.adminDataRefreshing = false;
    scheduleSyncStatusUiRefresh();
  }
}

function renderAdminLoading() {
  return `
    <section class="panel">
      <h2 class="title">Admin Dashboard</h2>
      <p class="subtle loading-inline"><span class="inline-loader" aria-hidden="true"></span><span>Syncing latest users and admin data...</span></p>
    </section>
  `;
}

function renderAuthRestoreLoading() {
  return `
    <section class="panel">
      <h2 class="title">Restoring Your Session</h2>
      <p class="subtle loading-inline"><span class="inline-loader" aria-hidden="true"></span><span>Checking your saved sign-in...</span></p>
    </section>
  `;
}

function renderSiteMaintenancePage(user = null) {
  const currentUser = user || getCurrentUser();
  const config = getSiteMaintenanceConfig();
  const updatedLabel = config.updatedAt ? new Date(config.updatedAt).toLocaleString() : "";
  const updatedByLabel = String(config.updatedByName || "").trim();
  const footerNote = currentUser?.role === "student"
    ? "Your student access is paused until the admin reopens the website."
    : "Admins can still sign in to manage the update and reopen the website.";

  return `
    <section class="panel maintenance-shell">
      <article class="card maintenance-card">
        <span class="maintenance-badge">Temporary closure</span>
        <h1 class="maintenance-title">${escapeHtml(config.title)}</h1>
        <p class="maintenance-message">${escapeHtml(config.message)}</p>
        <div class="maintenance-actions">
          ${currentUser
      ? '<button class="btn ghost" type="button" data-action="logout">Log out</button>'
      : '<button class="btn" type="button" data-nav="login">Admin login</button>'
    }
        </div>
        <p class="maintenance-footnote">${escapeHtml(footerNote)}</p>
        ${updatedLabel
      ? `<p class="maintenance-updated">Last updated ${escapeHtml(updatedLabel)}${updatedByLabel ? ` by ${escapeHtml(updatedByLabel)}` : ""}.</p>`
      : ""
    }
      </article>
    </section>
  `;
}

function render() {
  document.body.classList.remove("no-panel-animations");
  clearTimer();
  appEl.removeEventListener("click", handleSessionClick);
  appEl.removeEventListener("click", handleReviewClick);
  document.removeEventListener("keydown", handleSessionKeydown);
  document.removeEventListener("mouseup", handleSessionHighlighterMouseup);
  document.removeEventListener("keydown", handleReviewKeydown);

  const user = getCurrentUser();
  const authRestorePending = isSupabaseAuthRestorePending(user, state.route);
  if (!user || user.role !== "admin") {
    state.adminDataRefreshing = false;
    state.adminDataLastSyncAt = 0;
    state.adminDataSyncError = "";
    state.adminForceRefreshRunning = false;
    state.adminPresenceLoading = false;
    state.adminPresenceError = "";
    state.adminPresenceRows = [];
    state.adminPresenceLastSyncAt = 0;
    state.adminActivityReportRunning = false;
    adminQuestionsLastHydratedAt = 0;
    clearAdminPresencePolling();
    clearAdminDashboardPolling();
  }
  if (!user) {
    clearSupabaseSessionRecoveryRetry();
  }
  if (!user || user.role !== "student") {
    state.studentDataRefreshing = false;
    state.studentDataLastSyncAt = 0;
    state.studentDataLastFullSyncAt = 0;
  }
  syncPresenceRuntime(user);
  syncSiteActivityRuntime(user);
  const skipTransition = state.skipNextRouteAnimation;
  const routeChanged = lastRenderedRoute !== state.route;
  if (skipTransition) {
    if (routeTransitionHandle) {
      window.clearTimeout(routeTransitionHandle);
      routeTransitionHandle = null;
    }
    appEl.classList.remove("route-enter", "route-enter-active");
    document.body.classList.remove("is-routing");
  }

  const studentProfileCompletionRoute = getStudentProfileCompletionRoute(user);
  const googleSignupOnboarding = studentProfileCompletionRoute === "signup";
  const passwordRecoveryPending = isPasswordRecoveryPendingState();

  if (!authRestorePending && PRIVATE_ROUTE_SET.has(state.route) && !user) {
    state.route = "login";
  }

  if (state.route === "reset-password" && !passwordRecoveryPending) {
    state.route = user ? (user.role === "admin" ? "admin" : "dashboard") : "forgot";
  } else if (state.route !== "reset-password" && passwordRecoveryPending) {
    setPasswordRecoveryPendingState(false);
  }

  if (!passwordRecoveryPending && studentProfileCompletionRoute && state.route !== studentProfileCompletionRoute) {
    state.route = studentProfileCompletionRoute;
  }

  if (!passwordRecoveryPending && user && state.route === "complete-profile" && studentProfileCompletionRoute !== "complete-profile") {
    state.route = user.role === "admin" ? "admin" : "dashboard";
  }

  if (
    PRIVATE_ROUTE_SET.has(state.route)
    && user
    && !isUserAccessApproved(user)
    && !studentProfileCompletionRoute
    && !hasSupabaseManagedIdentity(user)
  ) {
    removeStorageKey(STORAGE_KEYS.currentUserId);
    state.route = "login";
    toast("Your account is pending admin approval.");
  }

  if (user && AUTH_ENTRY_ROUTE_SET.has(state.route) && !(state.route === "signup" && googleSignupOnboarding)) {
    state.route = user.role === "admin" ? "admin" : "dashboard";
  }

  if (!authRestorePending && state.route === "admin" && user?.role !== "admin") {
    state.route = "dashboard";
    toast("Admin role required for this page.");
  }

  if (
    user?.role === "student"
    && state.route !== "complete-profile"
    && state.route !== "signup"
    && !["session", "review"].includes(state.route)
    && shouldRefreshStudentData(user)
  ) {
    refreshStudentDataSnapshot(user, { force: !state.studentDataLastSyncAt })
      .catch((error) => {
        console.warn("Student data refresh failed.", error?.message || error);
      });
  }

  if (user?.role === "admin" && state.route !== "admin" && !passwordRecoveryPending) {
    state.route = "admin";
  }

  if (state.route === "qbank" || state.route === "builder") {
    state.route = "create-test";
  }

  resolveGoogleOAuthPendingState(user, PRIVATE_ROUTE_SET);

  const isExamWideRoute = state.route === "session" || state.route === "review";
  const isAdminRoute = state.route === "admin";
  document.body.classList.toggle("is-session-route", isExamWideRoute);
  appEl.classList.toggle("is-session", isExamWideRoute);
  appEl.classList.toggle("is-admin", isAdminRoute);
  topbarEl?.classList.toggle("hidden", false);

  syncTopbar();
  if (
    state.route === "admin"
    && user?.role === "admin"
    && ADMIN_AUTO_REFRESH_PAGES.has(String(state.adminPage || "").trim())
  ) {
    ensureAdminDashboardPolling();
  } else {
    clearAdminDashboardPolling();
  }
  if (!(state.route === "admin" && state.adminPage === "activity")) {
    clearAdminPresencePolling();
  }
  if (state.route !== "session") {
    state.sessionNavSettingsOpen = false;
  }

  if (authRestorePending) {
    clearSiteMaintenanceGateRefreshPolling();
    appEl.innerHTML = renderAuthRestoreLoading();
  } else if (shouldShowSiteMaintenanceGate(user, state.route)) {
    ensureSiteMaintenanceGateRefreshPolling(user);
    appEl.innerHTML = renderSiteMaintenancePage(user);
  } else {
    clearSiteMaintenanceGateRefreshPolling();
    switch (state.route) {
      case "landing":
        appEl.innerHTML = renderLanding();
        break;
      case "features":
        appEl.innerHTML = renderFeatures();
        break;
      case "pricing":
        appEl.innerHTML = renderPricing();
        break;
      case "about":
        appEl.innerHTML = renderAbout();
        break;
      case "contact":
        appEl.innerHTML = renderContact();
        wireContact();
        break;
      case "login":
        appEl.innerHTML = renderAuth("login");
        wireAuth("login");
        break;
      case "signup":
        appEl.innerHTML = renderAuth("signup");
        wireAuth("signup");
        break;
      case "forgot":
        appEl.innerHTML = renderAuth("forgot");
        wireAuth("forgot");
        break;
      case "reset-password":
        appEl.innerHTML = renderPasswordReset();
        wirePasswordReset();
        break;
      case "complete-profile":
        appEl.innerHTML = renderCompleteProfile();
        wireCompleteProfile();
        break;
      case "dashboard":
        appEl.innerHTML = renderDashboard();
        wireDashboard();
        break;
      case "notifications":
        appEl.innerHTML = renderNotifications();
        wireNotifications();
        break;
      case "create-test":
        appEl.innerHTML = renderCreateTest();
        wireCreateTest();
        break;
      case "session":
        appEl.innerHTML = renderSession();
        wireSession();
        break;
      case "review":
        appEl.innerHTML = renderReview();
        wireReview();
        break;
      case "analytics":
        appEl.innerHTML = renderAnalytics();
        wireAnalytics();
        break;
      case "profile":
        appEl.innerHTML = renderProfile();
        wireProfile();
        break;
      case "admin":
        if (user?.role === "admin" && shouldRefreshAdminData(user)) {
          const initialAdminHydration = !state.adminDataLastSyncAt;
          const adminPageBeforeRefresh = String(state.adminPage || "").trim();
          refreshAdminDataSnapshot(user, {
            force: !state.adminDataLastSyncAt,
            surfaceErrors: !state.adminDataLastSyncAt,
          }).then((ok) => {
            if (!ok || state.route !== "admin" || String(state.adminPage || "").trim() !== adminPageBeforeRefresh) {
              return;
            }
            if (initialAdminHydration || ADMIN_AUTO_REFRESH_PAGES.has(adminPageBeforeRefresh)) {
              state.skipNextRouteAnimation = true;
              render();
            }
          }).catch((error) => {
            console.warn("Admin data refresh failed.", error?.message || error);
          });
        }
        const hasCachedAdminData = getUsers().length > 0 || getQuestions().length > 0;
        if ((state.adminDataRefreshing || isPostAuthDataWarmupActive(user)) && !state.adminDataLastSyncAt && !hasCachedAdminData) {
          appEl.innerHTML = renderAdminLoading();
          break;
        }
        appEl.innerHTML = renderAdmin();
        wireAdmin();
        break;
      default:
        appEl.innerHTML = renderLanding();
    }
  }

  const isAdminQuestionModalOpen = state.route === "admin" && state.adminPage === "questions" && state.adminQuestionModalOpen;
  const isAdminCourseTopicModalOpen = state.route === "admin" && state.adminPage === "courses" && Boolean(state.adminCourseTopicModalCourse);
  document.body.classList.toggle("is-admin-question-modal-open", isAdminQuestionModalOpen);
  document.body.classList.toggle("is-admin-course-topic-modal-open", isAdminCourseTopicModalOpen);
  if (isAdminQuestionModalOpen && !wasAdminQuestionModalOpen) {
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
      const modal = appEl.querySelector(".admin-question-modal");
      const modalCard = modal?.querySelector(".admin-question-modal-card");
      if (modal) {
        modal.scrollTop = 0;
      }
      if (modalCard) {
        modalCard.scrollTop = 0;
      }
      const focusTarget = appEl.querySelector("#admin-question-form textarea[name='stem']");
      focusTarget?.focus({ preventScroll: true });
    });
  }
  if (isAdminCourseTopicModalOpen && !wasAdminCourseTopicModalOpen) {
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
      const modal = appEl.querySelector(".admin-course-topic-modal");
      const modalCard = modal?.querySelector(".admin-course-topic-modal-card");
      if (modal) {
        modal.scrollTop = 0;
      }
      if (modalCard) {
        modalCard.scrollTop = 0;
      }
      const focusTarget = appEl.querySelector(".admin-course-topic-modal input[data-field='newCourseTopicInline']");
      focusTarget?.focus({ preventScroll: true });
    });
  }
  if (isAdminCourseTopicModalOpen && state.adminCourseTopicInlineCreateOpen && !wasAdminCourseTopicInlineCreateOpen) {
    window.requestAnimationFrame(() => {
      const focusTarget = appEl.querySelector(".admin-course-topic-modal input[data-field='newCourseTopicInline']");
      focusTarget?.focus({ preventScroll: true });
    });
  }
  wasAdminQuestionModalOpen = isAdminQuestionModalOpen;
  wasAdminCourseTopicModalOpen = isAdminCourseTopicModalOpen;
  wasAdminCourseTopicGroupCreateModalOpen = Boolean(state.adminCourseTopicGroupCreateModalOpen);
  wasAdminCourseTopicInlineCreateOpen = Boolean(state.adminCourseTopicInlineCreateOpen);

  persistRouteState();
  const currentSessionPointer = getSessionRenderPointer(user);
  const stayedOnSameRoute = lastRenderedRoute === state.route;
  const shouldAnimateSessionQuestionChange = !skipTransition
    && stayedOnSameRoute
    && state.route === "session"
    && lastRenderedSessionPointer
    && currentSessionPointer
    && lastRenderedSessionPointer.sessionId === currentSessionPointer.sessionId
    && lastRenderedSessionPointer.index !== currentSessionPointer.index;

  if (shouldAnimateSessionQuestionChange) {
    const direction = currentSessionPointer.index > lastRenderedSessionPointer.index ? "forward" : "backward";
    animateSessionQuestionTransition(direction);
  }
  lastRenderedSessionPointer = currentSessionPointer;

  if (skipTransition) {
    lastRenderedRoute = state.route;
    state.skipNextRouteAnimation = false;
    return;
  }
  if (routeChanged) {
    animateRouteTransition();
  }
  lastRenderedRoute = state.route;
}

function renderTopbarNotificationMenu(user, unreadNotificationCount, unreadNotificationLabel) {
  if (!user || user.role !== "student") {
    return "";
  }
  const menuOpen = Boolean(state.notificationMenuOpen);
  const menuExpanded = menuOpen ? "true" : "false";
  const notifications = getVisibleNotificationsForUser(user).slice(0, 8);
  const hasUnread = unreadNotificationCount > 0;
  const listMarkup = notifications.map((notification) => {
    const isRead = isNotificationReadByUser(notification, user);
    const title = String(notification.title || "Notification").trim() || "Notification";
    const bodyText = String(notification.body || "").trim();
    const bodyPreview = bodyText.length > 110 ? `${bodyText.slice(0, 107)}...` : bodyText;
    const safeNotificationId = escapeHtml(notification.id);
    return `
      <article class="notification-menu-item ${isRead ? "is-read" : "is-unread"}">
        <div class="notification-menu-item-top">
          <div class="notification-menu-item-copy">
            <p class="notification-menu-item-title">${escapeHtml(title)}</p>
          </div>
          ${isRead
        ? `<span class="notification-menu-item-done">Read</span>`
        : `<button
                  class="notification-menu-read-btn"
                  type="button"
                  data-action="notification-mark-read-topbar"
                  data-notification-id="${safeNotificationId}"
                  aria-label="Mark as read"
                  title="Mark as read"
                >
                  <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                    <path d="M3 8.5L6.2 11.7 13 4.9" />
                  </svg>
                </button>`
      }
        </div>
        ${bodyPreview ? `<p class="notification-menu-item-body">${escapeHtml(bodyPreview)}</p>` : ""}
      </article>
    `;
  }).join("");

  return `
    <div class="notification-menu ${menuOpen ? "is-open" : ""}">
      <button
        class="notification-bell-btn ${menuOpen ? "is-open" : ""}"
        type="button"
        data-action="toggle-notification-menu"
        aria-haspopup="menu"
        aria-expanded="${menuExpanded}"
        aria-label="Open notifications"
        title="Notifications"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M12 3.25a4.25 4.25 0 0 0-4.25 4.25v1.68c0 .95-.3 1.87-.85 2.65L5.21 14.2c-.6.87.02 2.05 1.08 2.05h11.42c1.06 0 1.69-1.18 1.08-2.05l-1.69-2.37a4.75 4.75 0 0 1-.85-2.65V7.5A4.25 4.25 0 0 0 12 3.25z" />
          <path d="M9.25 17.25a2.75 2.75 0 0 0 5.5 0" />
        </svg>
        ${hasUnread ? `<span class="notification-bell-badge">${escapeHtml(unreadNotificationLabel)}</span>` : ""}
      </button>
      <section class="notification-menu-panel" role="menu" aria-label="Notifications">
        <header class="notification-menu-header">
          <p class="notification-menu-title">Notifications</p>
          <button
            class="notification-menu-mark-all"
            type="button"
            data-action="notifications-mark-all-read-topbar"
            ${hasUnread ? "" : "disabled"}
          >
            Mark all
          </button>
        </header>
        <div class="notification-menu-list">
          ${listMarkup || `<p class="notification-menu-empty">No notifications yet.</p>`}
        </div>
      </section>
    </div>
  `;
}

function syncTopbar() {
  const user = getCurrentUser();
  const authRestorePending = isSupabaseAuthRestorePending(user);
  ensureProfileAccessRealtimeSubscription(user);
  ensureStudentAccessPolling(user);
  ensureNotificationsRealtimeSubscription(user);
  ensureStudentNotificationPolling(user);
  ensureSessionRealtimeSubscription(user);
  ensureStudentSessionPolling(user);
  ensureStudentForceRefreshPolling(user);
  ensureStudentBackgroundRefreshPolling(user);
  const isAdmin = user?.role === "admin";
  const isAdminHeader = Boolean(user && isAdmin);
  const maintenanceRestricted = isSiteMaintenanceEnabledForUser(user);
  const unreadNotificationCount = user?.role === "student"
    ? getUnreadNotificationCountForUser(user)
    : 0;
  const unreadNotificationLabel = unreadNotificationCount > 99 ? "99+" : String(unreadNotificationCount);

  topbarEl?.classList.toggle("admin-only-header", isAdminHeader);
  brandWrapEl?.classList.toggle("hidden", false);
  authActionsEl.classList.toggle("hidden", false);

  publicNavEl.classList.toggle("hidden", Boolean(user) || maintenanceRestricted);
  privateNavEl.classList.toggle("hidden", !user || maintenanceRestricted);
  adminLinkEl.classList.toggle("hidden", user?.role !== "admin");
  privateNavEl.querySelectorAll("[data-nav]").forEach((button) => {
    const route = button.getAttribute("data-nav");
    if (isAdmin) {
      button.classList.toggle("hidden", route !== "admin");
    } else {
      button.classList.toggle("hidden", route === "admin");
    }
  });

  if (!user && authRestorePending) {
    state.userMenuOpen = false;
    state.notificationMenuOpen = false;
    publicNavEl.classList.add("hidden");
    privateNavEl.classList.add("hidden");
    adminLinkEl.classList.add("hidden");
    authActionsEl.classList.remove("hidden");
    authActionsEl.innerHTML = `
      ${renderThemeToggleButton()}
      <span class="subtle">Restoring session...</span>
    `;
    markActiveNav();
    return;
  }

  if (!user) {
    state.userMenuOpen = false;
    state.notificationMenuOpen = false;
    authActionsEl.classList.remove("hidden");
    authActionsEl.innerHTML = `
      ${renderThemeToggleButton()}
      <button data-nav="login">Login</button>
      ${isSiteMaintenanceEnabled() ? "" : '<button class="btn" data-nav="signup">Sign up</button>'}
    `;
  } else {
    const safeName = String(user.name || "Student").trim() || "Student";
    const firstName = safeName.split(/\s+/).filter(Boolean)[0] || safeName;
    const firstLetter = firstName.charAt(0).toLocaleUpperCase();
    const menuOpen = Boolean(state.userMenuOpen);
    const menuExpanded = menuOpen ? "true" : "false";
    const isStudent = user.role === "student";
    const cloudSyncModel = isAdmin ? getCloudSyncStatusModel(user) : null;
    if (!isStudent) {
      state.notificationMenuOpen = false;
    }
    authActionsEl.classList.remove("hidden");
    authActionsEl.innerHTML = `
      ${isAdmin ? `<div id="topbar-cloud-sync-slot">${renderCloudSyncPill(cloudSyncModel, { compact: true })}</div>` : ""}
      ${renderThemeToggleButton()}
      ${isStudent ? renderTopbarNotificationMenu(user, unreadNotificationCount, unreadNotificationLabel) : ""}
      <div class="user-menu ${menuOpen ? "is-open" : ""}">
        <button
          class="user-menu-trigger"
          type="button"
          data-action="toggle-user-menu"
          aria-haspopup="menu"
          aria-expanded="${menuExpanded}"
          aria-label="Open account menu"
        >
          <span class="user-menu-avatar">${escapeHtml(firstLetter)}</span>
        </button>
        <div class="user-menu-panel" role="menu" aria-label="Account menu">
          <p class="user-menu-name">${escapeHtml(safeName)}</p>
          <button class="user-menu-item" type="button" data-nav="profile" role="menuitem">Profile</button>
          <button class="user-menu-item user-menu-item-danger" type="button" data-action="logout" role="menuitem">Log out</button>
        </div>
      </div>
    `;
  }

  markActiveNav();
}

function markActiveNav() {
  document.querySelectorAll(".top-nav [data-nav]").forEach((button) => {
    const isActive = button.getAttribute("data-nav") === state.route;
    button.classList.toggle("is-active", isActive);
  });
}

function animateRouteTransition() {
  if (routeTransitionHandle) {
    window.clearTimeout(routeTransitionHandle);
    routeTransitionHandle = null;
  }
  document.body.classList.add("is-routing");
  applyStaggerIndices();

  appEl.classList.remove("route-enter", "route-enter-active");
  void appEl.offsetWidth;
  appEl.classList.add("route-enter");

  window.requestAnimationFrame(() => {
    appEl.classList.add("route-enter-active");
  });

  routeTransitionHandle = window.setTimeout(() => {
    appEl.classList.remove("route-enter", "route-enter-active");
    document.body.classList.remove("is-routing");
    routeTransitionHandle = null;
  }, ROUTE_TRANSITION_MS);
}

function getSessionRenderPointer(user) {
  if (state.route !== "session" || !user) {
    return null;
  }

  const session = getActiveSession(user.id, state.sessionId);
  if (!session || session.status !== "in_progress") {
    return null;
  }

  const questionIds = Array.isArray(session.questionIds) ? session.questionIds : [];
  if (!questionIds.length) {
    return null;
  }

  const maxIndex = Math.max(0, questionIds.length - 1);
  const index = Math.max(0, Math.min(maxIndex, Math.floor(Number(session.currentIndex) || 0)));

  return {
    sessionId: session.id,
    index,
  };
}

function animateSessionQuestionTransition(direction = "forward") {
  if (!appEl || state.route !== "session") {
    return;
  }

  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  if (reduceMotion) {
    return;
  }

  if (sessionQuestionTransitionHandle) {
    window.clearTimeout(sessionQuestionTransitionHandle);
    sessionQuestionTransitionHandle = null;
  }

  const stage = appEl.querySelector(".exam-question-stage");
  if (!stage) {
    return;
  }

  stage.classList.remove("question-transition-enter", "question-transition-forward", "question-transition-backward");
  void stage.offsetWidth;
  stage.classList.add("question-transition-enter");
  stage.classList.add(direction === "backward" ? "question-transition-backward" : "question-transition-forward");

  sessionQuestionTransitionHandle = window.setTimeout(() => {
    stage.classList.remove("question-transition-enter", "question-transition-forward", "question-transition-backward");
    sessionQuestionTransitionHandle = null;
  }, 260);
}

function applyStaggerIndices() {
  const animatedNodes = appEl.querySelectorAll(".panel, .panel .card");
  animatedNodes.forEach((node, index) => {
    node.style.setProperty("--stagger", String(Math.min(index, 10)));
  });
}

function renderLanding() {
  return `
    <section class="panel simple-home-wrap">
      <div class="simple-home-inner">
        <p class="kicker simple-home-kicker">O6U MedBank</p>
        <h1 class="simple-home-title">October 6 University Faculty of Medicine practice platform.</h1>
        <div class="simple-home-logo-wrap" aria-hidden="true">
          <img class="simple-home-logo" src="Assets/web%20Logo.png" alt="" />
        </div>
        <p class="simple-home-sub">Create focused tests by course and topic, solve with exam-style tools, and review clear explanations after every question.</p>
        <div class="simple-home-chips">
          <span>O6U course tracks</span>
          <span>Exam-style testing</span>
          <span>Progress tracking</span>
        </div>
        <div class="stack simple-home-actions">
          <button class="btn" data-nav="login">Log in</button>
          <button class="btn ghost" data-nav="signup">Sign up</button>
        </div>
      </div>
    </section>
  `;
}

function renderFeatures() {
  return `
    <section class="panel">
      <h2 class="title">Features</h2>
      <p class="subtle">Built for October 6 University medical students and faculty editors.</p>
      <div class="grid-3" style="margin-top: 0.8rem;">
        <article class="card"><h4>O6U course routing</h4><p>Students only see courses assigned by admin year/semester enrollment.</p></article>
        <article class="card"><h4>Create a test</h4><p>Build tutor/timed blocks by course/topic with question source controls.</p></article>
        <article class="card"><h4>Exam tools</h4><p>Flagging, marker, notes, labs, calculator, shortcuts, and autosave.</p></article>
        <article class="card"><h4>Guided review</h4><p>Immediate correctness feedback with explanation panel and references.</p></article>
        <article class="card"><h4>Student analytics</h4><p>Track accuracy, timing, weak topics, and trend improvements.</p></article>
        <article class="card"><h4>Faculty admin</h4><p>Assign courses, edit question banks, and bulk import content.</p></article>
      </div>
    </section>
  `;
}

function renderPricing() {
  return `
    <section class="panel">
      <h2 class="title">Pricing</h2>
      <p class="subtle">Optional structure if O6U departments need subscription tiers later.</p>
      <div class="grid-3" style="margin-top: 0.8rem;">
        <article class="card"><h4>Student</h4><p><b>$0</b> starter</p><p>Core O6U course practice and explanation review.</p></article>
        <article class="card"><h4>Faculty</h4><p><b>Custom</b></p><p>Question management, import pipelines, and course assignment control.</p></article>
        <article class="card"><h4>Department</h4><p><b>Custom</b></p><p>Cohort analytics, moderation workflow, and shared governance tools.</p></article>
      </div>
    </section>
  `;
}

function renderAbout() {
  return `
    <section class="panel">
      <h2 class="title">About</h2>
      <p class="subtle">O6U MedBank is tailored for October 6 University Faculty of Medicine study workflows.</p>
      <div class="card" style="margin-top: 0.8rem;">
        <p>
          The product direction is simple: course-aligned content, reliable session saving, clear analytics, and a clean editor workflow so faculty teams can update banks quickly.
        </p>
      </div>
    </section>
  `;
}

function renderContact() {
  return `
    <section class="panel">
      <h2 class="title">O6U Support</h2>
      <p class="subtle">FAQ and support form for O6U medical students and editors (stored locally in this prototype).</p>
      <div class="grid-2" style="margin-top: 0.8rem;">
        <article class="card">
          <h4>FAQ</h4>
          <p><b>Can I resume blocks later?</b><br />Yes, in-progress sessions are saved automatically.</p>
          <p><b>Does timed mode auto-submit?</b><br />Yes, when the timer hits zero.</p>
          <p><b>Can I practice only assigned courses?</b><br />Yes, admin assignment controls course visibility per student.</p>
        </article>
        <form id="support-form" class="card">
          <h4>Support Form</h4>
          <label>Name <input name="name" required /></label>
          <label>Email <input type="email" name="email" required /></label>
          <label>Message <textarea name="message" required></textarea></label>
          <button class="btn" type="submit">Send</button>
        </form>
      </div>
    </section>
  `;
}

function wireContact() {
  const form = document.getElementById("support-form");
  if (!form) {
    return;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    toast("O6U support request captured (prototype mode).");
    form.reset();
  });
}

function getAuthRedirectToUrl() {
  const configured = String(SUPABASE_CONFIG.authRedirectUrl || "").trim();
  if (configured) {
    try {
      const configuredUrl = new URL(configured, window.location.origin);
      configuredUrl.search = "";
      configuredUrl.hash = "";
      configuredUrl.pathname = configuredUrl.pathname.replace(/\/index\.html$/i, "/");
      return configuredUrl.toString();
    } catch (error) {
      console.warn("Invalid Supabase auth redirect URL override.", error?.message || error);
    }
  }

  if (!/^https?:$/i.test(window.location.protocol)) {
    return "";
  }

  const currentUrl = new URL(window.location.href);
  currentUrl.search = "";
  currentUrl.hash = "";
  currentUrl.pathname = currentUrl.pathname.replace(/\/index\.html$/i, "/");
  return currentUrl.toString();
}

async function startGoogleOAuthSignIn(authClient) {
  if (!authClient) {
    return { ok: false, message: "Supabase auth is not configured. Google sign-in is unavailable." };
  }

  const redirectTo = getAuthRedirectToUrl();
  if (!redirectTo) {
    return {
      ok: false,
      message: "Google sign-in requires an http(s) app URL. Open the deployed site URL and try again.",
    };
  }

  const { error } = await authClient.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      queryParams: {
        prompt: "select_account",
      },
    },
  });

  if (error) {
    return { ok: false, message: error.message || "Could not start Google sign-in." };
  }

  return { ok: true };
}

function renderAuth(mode) {
  if (mode === "login") {
    return `
      <section class="panel" style="max-width: 560px; margin-inline: auto;">
        <h2 class="title">Log In</h2>
        <p class="subtle">Access your O6U course question bank and saved blocks.</p>
        <form id="login-form" class="auth-form" style="margin-top: 1rem;" method="post" autocomplete="on">
          <label>Email <input type="email" id="login-email" name="email" autocomplete="username email" inputmode="email" autocapitalize="none" spellcheck="false" required /></label>
          <label>Password <input type="password" id="login-password" name="password" autocomplete="current-password" autocapitalize="none" spellcheck="false" required /></label>
          <div class="stack">
            <button class="btn" type="submit">Log in</button>
            <button class="btn ghost" type="button" data-nav="forgot">Forgot password</button>
          </div>
          <div class="auth-divider"><span>or</span></div>
          <button class="btn ghost auth-google-btn" id="login-google-btn" type="button">Continue with Google</button>
        </form>
        <div class="auth-inline">
          <span class="text">Need an account?</span>
          <button data-nav="signup" class="btn ghost" type="button">Sign up</button>
        </div>
      </section>
    `;
  }

  if (mode === "signup") {
    const currentUser = getCurrentUser();
    const isGoogleOnboardingFlow = isGoogleSignupCompletionFlow(currentUser);
    const defaultYear = isGoogleOnboardingFlow ? null : normalizeAcademicYearOrNull(currentUser?.academicYear);
    const defaultSemester = isGoogleOnboardingFlow ? null : normalizeAcademicSemesterOrNull(currentUser?.academicSemester);
    const hasEnrollmentDefaults = defaultYear !== null && defaultSemester !== null;
    const defaultCourses = hasEnrollmentDefaults ? getCurriculumCourses(defaultYear, defaultSemester) : [];
    const preferredCourses = Array.isArray(currentUser?.assignedCourses)
      ? currentUser.assignedCourses.filter((course) => defaultCourses.includes(course))
      : [];
    const initiallyCheckedCourses = preferredCourses.length ? preferredCourses : defaultCourses;

    if (isGoogleOnboardingFlow) {
      return `
        <section class="panel" style="max-width: 680px; margin-inline: auto;">
          <h2 class="title">Create Account</h2>
          <p class="subtle">Complete your Google sign-up details. Name and email are locked to your Google account. Phone format examples: 01XXXXXXXXX, +20XXXXXXXXXX, 0020XXXXXXXXXX, or +countrycode.</p>
          <form id="signup-form" class="auth-form" style="margin-top: 1rem;" method="post" autocomplete="on">
            <div class="form-row">
              <label>Full name <input name="name" value="${escapeHtml(currentUser?.name || "")}" readonly required /></label>
              <label>Email <input type="email" name="email" value="${escapeHtml(currentUser?.email || "")}" readonly required /></label>
            </div>
            <div class="form-row">
              <label>Phone number <input type="tel" name="phone" value="${escapeHtml(currentUser?.phone || "")}" autocomplete="tel" inputmode="tel" placeholder="+20 10 0000 0000" required aria-required="true" minlength="8" maxlength="20" pattern="[0-9+()\\-\\s]{8,20}" /></label>
            </div>
            <div class="form-row">
              <label>Year
                <select name="academicYear" id="signup-academic-year" required aria-required="true">
                  <option value="" ${defaultYear === null ? "selected" : ""}>Select year</option>
                  <option value="1" ${defaultYear === 1 ? "selected" : ""}>Year 1</option>
                  <option value="2" ${defaultYear === 2 ? "selected" : ""}>Year 2</option>
                  <option value="3" ${defaultYear === 3 ? "selected" : ""}>Year 3</option>
                  <option value="4" ${defaultYear === 4 ? "selected" : ""}>Year 4</option>
                  <option value="5" ${defaultYear === 5 ? "selected" : ""}>Year 5</option>
                </select>
              </label>
              <label>Semester
                <select name="academicSemester" id="signup-academic-semester" required aria-required="true">
                  <option value="" ${defaultSemester === null ? "selected" : ""}>Select semester</option>
                  <option value="1" ${defaultSemester === 1 ? "selected" : ""}>Semester 1</option>
                  <option value="2" ${defaultSemester === 2 ? "selected" : ""}>Semester 2</option>
                </select>
              </label>
            </div>
            <div class="signup-course-field">
              <p class="signup-course-label">Courses (from selected year and semester)</p>
              <div id="signup-course-options" class="signup-course-grid">
                ${defaultCourses
          .map(
            (course) => `
                      <label class="admin-course-check">
                        <input type="checkbox" name="signupCourses" value="${escapeHtml(course)}" ${initiallyCheckedCourses.includes(course) ? "checked" : ""} />
                        <span>${escapeHtml(course)}</span>
                      </label>
                    `,
          )
          .join("")}
              </div>
              <small id="signup-course-help" class="subtle">Choose one or more courses.</small>
            </div>
            <div class="stack">
              <button class="btn ghost" type="button" id="signup-select-all-courses">Select all</button>
              <button class="btn ghost" type="button" id="signup-clear-courses">Clear</button>
            </div>
            <div class="stack">
              <button class="btn" type="submit">Create account</button>
              <button class="btn ghost" type="button" data-action="logout">Cancel</button>
            </div>
          </form>
        </section>
      `;
    }

    return `
      <section class="panel" style="max-width: 680px; margin-inline: auto;">
        <h2 class="title">Create Account</h2>
        <p class="subtle">Student sign-up with year, semester, and course enrollment. Phone format examples: 01XXXXXXXXX, +20XXXXXXXXXX, 0020XXXXXXXXXX, or +countrycode.</p>
        <form id="signup-form" class="auth-form" style="margin-top: 1rem;" method="post" autocomplete="on">
          <button class="btn ghost auth-google-btn" id="signup-google-btn" type="button">Continue with Google</button>
          <div class="auth-divider"><span>or sign up with email</span></div>
          <div class="form-row">
            <label>Full name <input name="name" autocomplete="name" required /></label>
            <label>Email <input type="email" name="email" autocomplete="username email" inputmode="email" autocapitalize="none" spellcheck="false" required aria-required="true" /></label>
          </div>
          <div class="form-row">
            <label>Password <input type="password" name="password" minlength="6" autocomplete="new-password" required /></label>
            <label>Confirm password <input type="password" name="confirmPassword" minlength="6" autocomplete="new-password" required /></label>
          </div>
          <div class="form-row">
            <label>Phone number <input type="tel" name="phone" autocomplete="tel" inputmode="tel" placeholder="+20 10 0000 0000" required aria-required="true" minlength="8" maxlength="20" pattern="[0-9+()\\-\\s]{8,20}" /></label>
          </div>
          <div class="form-row">
            <label>Invite code (optional) <input name="inviteCode" /></label>
          </div>
          <div class="form-row">
            <label>Year
              <select name="academicYear" id="signup-academic-year" required aria-required="true">
                <option value="" ${defaultYear === null ? "selected" : ""}>Select year</option>
                <option value="1" ${defaultYear === 1 ? "selected" : ""}>Year 1</option>
                <option value="2" ${defaultYear === 2 ? "selected" : ""}>Year 2</option>
                <option value="3" ${defaultYear === 3 ? "selected" : ""}>Year 3</option>
                <option value="4" ${defaultYear === 4 ? "selected" : ""}>Year 4</option>
                <option value="5" ${defaultYear === 5 ? "selected" : ""}>Year 5</option>
              </select>
            </label>
            <label>Semester
              <select name="academicSemester" id="signup-academic-semester" required aria-required="true">
                <option value="" ${defaultSemester === null ? "selected" : ""}>Select semester</option>
                <option value="1" ${defaultSemester === 1 ? "selected" : ""}>Semester 1</option>
                <option value="2" ${defaultSemester === 2 ? "selected" : ""}>Semester 2</option>
              </select>
            </label>
          </div>
          <div class="signup-course-field">
            <p class="signup-course-label">Courses (from selected year and semester)</p>
            <div id="signup-course-options" class="signup-course-grid">
              ${defaultCourses
        .map(
          (course) => `
                    <label class="admin-course-check">
                      <input type="checkbox" name="signupCourses" value="${escapeHtml(course)}" checked />
                      <span>${escapeHtml(course)}</span>
                    </label>
                  `,
        )
        .join("")}
            </div>
            <small id="signup-course-help" class="subtle">Choose one or more courses.</small>
          </div>
          <div class="stack">
            <button class="btn ghost" type="button" id="signup-select-all-courses">Select all</button>
            <button class="btn ghost" type="button" id="signup-clear-courses">Clear</button>
          </div>
          <button class="btn" type="submit">Create account</button>
        </form>
      </section>
    `;
  }

  return `
    <section class="panel" style="max-width: 560px; margin-inline: auto;">
      <h2 class="title">Forgot Password</h2>
      <p class="subtle">Send a password reset email using Supabase Auth.</p>
      <form id="forgot-form" class="auth-form" style="margin-top: 1rem;" method="post" autocomplete="on">
        <label>Email <input type="email" name="email" autocomplete="username email" inputmode="email" autocapitalize="none" spellcheck="false" required /></label>
        <button class="btn" type="submit">Send reset link</button>
      </form>
      <div class="auth-inline">
        <button class="btn ghost" data-nav="login" type="button">Back to login</button>
      </div>
    </section>
  `;
}

function wireAuth(mode) {
  const lockAuthForm = (form, submitting, busyLabel = "Please wait...") => {
    if (!form) return;
    form.dataset.submitting = submitting ? "1" : "0";
    const submitButton = form.querySelector('button[type="submit"]');
    if (!submitButton) return;
    if (!submitButton.dataset.baseLabel) {
      submitButton.dataset.baseLabel = submitButton.textContent || "";
    }
    submitButton.disabled = submitting;
    submitButton.textContent = submitting ? busyLabel : submitButton.dataset.baseLabel;
  };
  const lockAuthActionButton = (button, busy, busyLabel = "Please wait...") => {
    if (!button) return;
    if (!button.dataset.baseLabel) {
      button.dataset.baseLabel = button.textContent || "";
    }
    button.disabled = busy;
    button.textContent = busy ? busyLabel : button.dataset.baseLabel;
  };

  if (mode === "login") {
    const form = document.getElementById("login-form");
    const googleButton = document.getElementById("login-google-btn");
    googleButton?.addEventListener("click", async () => {
      if (form?.dataset.submitting === "1" || googleButton.dataset.submitting === "1") {
        return;
      }
      const authClient = getSupabaseAuthClient();
      if (!authClient) {
        toast("Supabase auth is not configured. Google login is unavailable.");
        return;
      }
      googleButton.dataset.submitting = "1";
      lockAuthActionButton(googleButton, true, "Redirecting...");
      setGoogleOAuthPendingState(true);
      try {
        const outcome = await startGoogleOAuthSignIn(authClient);
        if (!outcome.ok) {
          setGoogleOAuthPendingState(false);
          googleButton.dataset.submitting = "0";
          lockAuthActionButton(googleButton, false);
          toast(outcome.message || "Google login failed. Please try again.");
        }
      } catch (error) {
        setGoogleOAuthPendingState(false);
        googleButton.dataset.submitting = "0";
        lockAuthActionButton(googleButton, false);
        toast(error?.message || "Google login failed. Please try again.");
      }
    });

    form?.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (form.dataset.submitting === "1") {
        return;
      }
      lockAuthForm(form, true, "Logging in...");
      const formData = new FormData(form);
      const email = String(formData.get("email") || "").trim().toLowerCase();
      const password = String(formData.get("password") || "");
      const authClient = getSupabaseAuthClient();
      const routeUserToProfileCompletion = (candidateUser) => {
        const completionRoute = getStudentProfileCompletionRoute(candidateUser);
        if (!completionRoute) {
          return false;
        }
        if (candidateUser?.id) {
          save(STORAGE_KEYS.currentUserId, candidateUser.id);
        }
        toast("Complete your profile to activate your account.");
        navigate(completionRoute);
        return true;
      };
      try {
        if (authClient) {
          const { data, error } = await runWithTimeoutResult(
            authClient.auth.signInWithPassword({ email, password }),
            AUTH_SIGNIN_TIMEOUT_MS,
            "Login request timed out. Check your internet and try again.",
          );
          if (!error && data?.user) {
            let user = upsertLocalUserFromAuth(data.user);
            const profileSync = await refreshLocalUserFromRelationalProfile(data.user, user);
            user = profileSync.user;
            if (!user) {
              const fallbackUser = getUsers().find((candidate) => candidate.email.toLowerCase() === email);
              if (fallbackUser) {
                user = fallbackUser;
              } else {
                toast("Could not map account profile after login.");
                return;
              }
            }
            if (routeUserToProfileCompletion(user)) {
              return;
            }
            if (profileSync.approvalChecked && !isUserAccessApproved(user)) {
              removeStorageKey(STORAGE_KEYS.currentUserId);
              await authClient.auth.signOut().catch(() => { });
              toast("Your account is pending admin approval.");
              return;
            }
            if (await shouldForceRefreshForUpdates(user)) {
              return;
            }
            navigate(user.role === "admin" ? "admin" : "dashboard");
            toast(`Welcome back, ${user.name}.`);
            return;
          }

          const localDemoUser = getUsers().find(
            (candidate) => candidate.email.toLowerCase() === email && candidate.password === password,
          );
          if (localDemoUser) {
            const canUseCachedFallback = canUseLocalPasswordFallback(localDemoUser)
              || shouldAllowSupabaseManagedLocalFallback(error);
            if (!canUseCachedFallback) {
              toast(
                isSupabaseAccessRevokedMessage(error)
                  ? ACCOUNT_DEACTIVATED_SUPPORT_MESSAGE
                  : (error?.message || "Supabase sign-in is required for this account. Check your credentials and try again."),
              );
              return;
            }
            if (routeUserToProfileCompletion(localDemoUser)) {
              return;
            }
            if (!isUserAccessApproved(localDemoUser)) {
              toast("Your account is pending admin approval.");
              return;
            }
            save(STORAGE_KEYS.currentUserId, localDemoUser.id);
            if (await shouldForceRefreshForUpdates(localDemoUser)) {
              return;
            }
            navigate(localDemoUser.role === "admin" ? "admin" : "dashboard");
            toast(
              shouldAllowSupabaseManagedLocalFallback(error)
                ? `Supabase is unavailable. Signed in with local access for ${localDemoUser.name}.`
                : `Welcome back, ${localDemoUser.name}.`,
            );
            return;
          }

          const knownProvider = getKnownAuthProviderByEmail(email);
          if (knownProvider === "google") {
            toast("This account uses Google sign-in. Use Continue with Google.");
            return;
          }
          toast(isSupabaseAccessRevokedMessage(error) ? ACCOUNT_DEACTIVATED_SUPPORT_MESSAGE : (error?.message || "Invalid credentials."));
          return;
        }

        const user = getUsers().find((candidate) => candidate.email.toLowerCase() === email && candidate.password === password);
        if (!user) {
          const knownProvider = getKnownAuthProviderByEmail(email);
          if (knownProvider === "google") {
            toast("This account uses Google sign-in. Use Continue with Google.");
            return;
          }
          toast("Invalid credentials.");
          return;
        }
        if (routeUserToProfileCompletion(user)) {
          return;
        }
        if (!isUserAccessApproved(user)) {
          toast("Your account is pending admin approval.");
          return;
        }
        save(STORAGE_KEYS.currentUserId, user.id);
        if (await shouldForceRefreshForUpdates(user)) {
          return;
        }
        navigate(user.role === "admin" ? "admin" : "dashboard");
        toast(`Welcome back, ${user.name}.`);
      } catch (error) {
        toast(isSupabaseAccessRevokedMessage(error) ? ACCOUNT_DEACTIVATED_SUPPORT_MESSAGE : (error?.message || "Login failed. Please try again."));
      } finally {
        lockAuthForm(form, false);
      }
    });
    return;
  }

  if (mode === "signup") {
    const form = document.getElementById("signup-form");
    if (!form) {
      return;
    }
    const onboardingUser = getCurrentUser();
    const isGoogleOnboardingFlow = isGoogleSignupCompletionFlow(onboardingUser);
    const googleButton = document.getElementById("signup-google-btn");
    const yearSelect = document.getElementById("signup-academic-year");
    const semesterSelect = document.getElementById("signup-academic-semester");
    const courseOptionsEl = document.getElementById("signup-course-options");
    const courseHelpEl = document.getElementById("signup-course-help");
    const selectAllCoursesBtn = document.getElementById("signup-select-all-courses");
    const clearCoursesBtn = document.getElementById("signup-clear-courses");
    if (!isGoogleOnboardingFlow) {
      googleButton?.addEventListener("click", async () => {
        if (form?.dataset.submitting === "1" || googleButton.dataset.submitting === "1") {
          return;
        }
        const authClient = getSupabaseAuthClient();
        if (!authClient) {
          toast("Supabase auth is not configured. Google signup is unavailable.");
          return;
        }
        googleButton.dataset.submitting = "1";
        lockAuthActionButton(googleButton, true, "Redirecting...");
        setGoogleOAuthPendingState(true);
        try {
          const outcome = await startGoogleOAuthSignIn(authClient);
          if (!outcome.ok) {
            setGoogleOAuthPendingState(false);
            googleButton.dataset.submitting = "0";
            lockAuthActionButton(googleButton, false);
            toast(outcome.message || "Google signup failed. Please try again.");
          }
        } catch (error) {
          setGoogleOAuthPendingState(false);
          googleButton.dataset.submitting = "0";
          lockAuthActionButton(googleButton, false);
          toast(error?.message || "Google signup failed. Please try again.");
        }
      });
    }

    const getSelectedSignupCourses = () =>
      Array.from(form?.querySelectorAll("input[name='signupCourses']:checked") || []).map((input) => input.value);

    const renderSignupCourseOptions = (preferred = []) => {
      if (!courseOptionsEl) return;
      const year = normalizeAcademicYearOrNull(yearSelect?.value);
      const semester = normalizeAcademicSemesterOrNull(semesterSelect?.value);
      if (year === null || semester === null) {
        courseOptionsEl.innerHTML = "";
        if (courseHelpEl) {
          courseHelpEl.textContent = "Choose year and semester first.";
        }
        return;
      }
      const courses = getCurriculumCourses(year, semester);
      const selectedSet = new Set(preferred.filter((course) => courses.includes(course)));
      const selectAllByDefault = selectedSet.size === 0;

      courseOptionsEl.innerHTML = courses
        .map(
          (course) => `
            <label class="admin-course-check">
              <input type="checkbox" name="signupCourses" value="${escapeHtml(course)}" ${selectAllByDefault || selectedSet.has(course) ? "checked" : ""} />
              <span>${escapeHtml(course)}</span>
            </label>
          `,
        )
        .join("");

      if (courseHelpEl) {
        courseHelpEl.textContent = courses.length
          ? `${courses.length} course(s) available for this year/semester. Choose one or more.`
          : "No courses available for this year/semester.";
      }
    };

    yearSelect?.addEventListener("change", () => {
      renderSignupCourseOptions(getSelectedSignupCourses());
    });
    semesterSelect?.addEventListener("change", () => {
      renderSignupCourseOptions(getSelectedSignupCourses());
    });

    selectAllCoursesBtn?.addEventListener("click", () => {
      courseOptionsEl?.querySelectorAll("input[name='signupCourses']").forEach((input) => {
        input.checked = true;
      });
    });

    clearCoursesBtn?.addEventListener("click", () => {
      courseOptionsEl?.querySelectorAll("input[name='signupCourses']").forEach((input) => {
        input.checked = false;
      });
    });

    const preferredCourses = isGoogleOnboardingFlow && Array.isArray(onboardingUser?.assignedCourses)
      ? onboardingUser.assignedCourses
      : [];
    renderSignupCourseOptions(preferredCourses);

    form?.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (form.dataset.submitting === "1") {
        return;
      }
      if (typeof form.reportValidity === "function" && !form.reportValidity()) {
        return;
      }
      const data = new FormData(form);
      const users = getUsers();
      const name = String(data.get("name") || "").trim();
      const email = String(data.get("email") || "").trim().toLowerCase();
      const phone = String(data.get("phone") || "").trim();
      const phoneValidation = validateAndNormalizePhoneNumber(phone);
      const normalizedPhone = phoneValidation.number;
      const academicYear = normalizeAcademicYearOrNull(data.get("academicYear"));
      const academicSemester = normalizeAcademicSemesterOrNull(data.get("academicSemester"));
      if (academicYear === null || academicSemester === null) {
        toast("You need to choose the year and semester.");
        return;
      }
      const availableCourses = getCurriculumCourses(academicYear, academicSemester);
      if (!availableCourses.length) {
        toast("No courses are available for the selected year and semester.");
        return;
      }
      const selectedCourses = getSelectedSignupCourses().filter((course) => availableCourses.includes(course));
      const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if (!selectedCourses.length) {
        toast("Select at least one course for your enrollment.");
        return;
      }

      if (isGoogleOnboardingFlow) {
        if (!name || !email || !phone) {
          toast("Name, email, and phone number are required.");
          return;
        }
        if (!emailIsValid) {
          toast("Please enter a valid email address.");
          return;
        }
        if (!phoneValidation.ok) {
          toast(phoneValidation.message || "Phone number is invalid.");
          return;
        }
        const idx = users.findIndex(
          (entry) =>
            entry.id === onboardingUser?.id
            || (onboardingUser?.supabaseAuthId && entry.supabaseAuthId === onboardingUser.supabaseAuthId)
            || entry.email.toLowerCase() === email,
        );
        if (idx === -1) {
          toast("Google account profile was not found. Please sign in again.");
          navigate("login");
          return;
        }

        lockAuthForm(form, true, "Creating account...");
        try {
          const autoApproved = shouldAutoApproveStudentAccess({
            role: "student",
            phone: normalizedPhone,
            academicYear,
            academicSemester,
          });
          users[idx].name = onboardingUser?.name || name;
          users[idx].email = onboardingUser?.email || email;
          users[idx].phone = normalizedPhone;
          users[idx].role = "student";
          users[idx].academicYear = academicYear;
          users[idx].academicSemester = academicSemester;
          users[idx].assignedCourses = selectedCourses;
          users[idx].isApproved = autoApproved;
          users[idx].approvedAt = autoApproved ? users[idx].approvedAt || nowISO() : null;
          users[idx].approvedBy = autoApproved ? users[idx].approvedBy || AUTO_APPROVAL_ACTOR : null;
          users[idx].profileCompleted = true;
          users[idx].authProvider = "google";

          save(STORAGE_KEYS.users, users);
          save(STORAGE_KEYS.currentUserId, users[idx].id);
          await syncUsersBackupState(users).catch(() => { });
          await ensureRelationalSyncReady().catch(() => { });
          if (autoApproved) {
            const profileId = getUserProfileId(users[idx]);
            if (isUuidValue(profileId)) {
              await updateRelationalProfileApproval([profileId], true).catch(() => { });
            }
          }
          await flushPendingSyncNow();

          if (autoApproved) {
            save(STORAGE_KEYS.currentUserId, users[idx].id);
            toast("Account created and approved. You can start now.");
            navigate("dashboard");
          } else {
            const authClient = getSupabaseAuthClient();
            if (authClient) {
              await authClient.auth.signOut().catch(() => { });
            }
            removeStorageKey(STORAGE_KEYS.currentUserId);
            toast("Account created. Await admin approval before first login.");
            navigate("login");
          }
        } catch (error) {
          console.warn("Google signup profile sync failed.", error?.message || error);
          toast("Could not sync your profile to the admin dashboard. Please try again.");
        } finally {
          lockAuthForm(form, false);
        }
        return;
      }

      const password = String(data.get("password") || "");
      const confirmPassword = String(data.get("confirmPassword") || "");
      const inviteCode = String(data.get("inviteCode") || "").trim();

      if (!name || !email || !password || !phone) {
        toast("Name, email, password, and phone number are required.");
        return;
      }
      if (!emailIsValid) {
        toast("Please enter a valid email address.");
        return;
      }
      if (!phoneValidation.ok) {
        toast(phoneValidation.message || "Phone number is invalid.");
        return;
      }
      if (password !== confirmPassword) {
        toast("Password and confirm password must match.");
        return;
      }

      if (users.some((user) => user.email.toLowerCase() === email)) {
        toast("Email already exists.");
        return;
      }

      if (inviteCode) {
        const validCodes = load(STORAGE_KEYS.invites, []);
        if (!validCodes.includes(inviteCode)) {
          toast("Invalid invite code.");
          return;
        }
      }

      lockAuthForm(form, true, "Creating account...");
      const authClient = getSupabaseAuthClient();
      try {
        const autoApproved = shouldAutoApproveStudentAccess({
          role: "student",
          phone: normalizedPhone,
          academicYear,
          academicSemester,
        });
        if (authClient) {
          const { data: authData, error } = await authClient.auth.signUp({
            email,
            password,
            options: {
              data: {
                full_name: name,
                academic_year: academicYear,
                academic_semester: academicSemester,
                academicYear,
                academicSemester,
                phone: normalizedPhone,
                phone_number: normalizedPhone,
                assigned_courses: selectedCourses,
                assignedCourses: selectedCourses,
              },
            },
          });
          if (error) {
            toast(error.message || "Could not create Supabase account.");
            return;
          }

          if (!authData?.user) {
            toast("Signup failed. Please try again.");
            return;
          }

          const user = upsertLocalUserFromAuth(authData.user, {
            name,
            role: "student",
            academicYear,
            academicSemester,
            assignedCourses: selectedCourses,
            phone: normalizedPhone,
            verified: Boolean(authData.session),
            isApproved: autoApproved,
            approvedAt: autoApproved ? nowISO() : null,
            approvedBy: autoApproved ? AUTO_APPROVAL_ACTOR : null,
          });
          if (!user) {
            toast("Account created but profile mapping failed.");
            return;
          }

          save(STORAGE_KEYS.currentUserId, user.id);
          await syncUsersBackupState(getUsers()).catch(() => { });
          await ensureRelationalSyncReady().catch(() => { });
          if (autoApproved) {
            const profileId = getUserProfileId(user);
            if (isUuidValue(profileId)) {
              await updateRelationalProfileApproval([profileId], true).catch(() => { });
            }
          }
          await flushPendingSyncNow();

          if (authData.session && !autoApproved) {
            await authClient.auth.signOut().catch(() => { });
          }
          if (autoApproved && authData.session) {
            save(STORAGE_KEYS.currentUserId, user.id);
            navigate(user.role === "admin" ? "admin" : "dashboard");
            toast("Account created and approved. Welcome.");
            return;
          }
          removeStorageKey(STORAGE_KEYS.currentUserId);
          toast(autoApproved ? "Account created and approved. Please log in." : "Account created. Await admin approval before first login.");
          navigate("login");
          return;
        }

        const user = {
          id: makeId("u"),
          name,
          email,
          password,
          phone: normalizedPhone,
          role: "student",
          verified: true,
          isApproved: autoApproved,
          approvedAt: autoApproved ? nowISO() : null,
          approvedBy: autoApproved ? AUTO_APPROVAL_ACTOR : null,
          assignedCourses: selectedCourses,
          academicYear,
          academicSemester,
          createdAt: nowISO(),
        };

        users.push(user);
        save(STORAGE_KEYS.users, users);
        if (autoApproved) {
          save(STORAGE_KEYS.currentUserId, user.id);
          navigate("dashboard");
          toast("Account created and approved. Welcome.");
        } else {
          removeStorageKey(STORAGE_KEYS.currentUserId);
          toast("Account created. Await admin approval before first login.");
          navigate("login");
        }
      } catch (error) {
        console.warn("Signup profile sync failed.", error?.message || error);
        toast("Could not sync your profile to the admin dashboard. Please try again.");
      } finally {
        lockAuthForm(form, false);
      }
    });
    return;
  }

  const form = document.getElementById("forgot-form");
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (form.dataset.submitting === "1") {
      return;
    }
    lockAuthForm(form, true, "Sending...");
    const data = new FormData(form);
    const email = String(data.get("email") || "").trim().toLowerCase();
    const authClient = getSupabaseAuthClient();
    try {
      if (authClient) {
        const redirectTo = getAuthRedirectToUrl();
        const { error } = await authClient.auth.resetPasswordForEmail(email, { redirectTo });
        if (error) {
          toast(error.message || "Could not send reset email.");
          return;
        }
        toast("Password reset email sent.");
        navigate("login");
        return;
      }

      toast("Supabase auth is not configured. Password reset email is unavailable.");
    } finally {
      lockAuthForm(form, false);
    }
  });
}

function renderPasswordReset() {
  const hasRecoverySession = isPasswordRecoveryPendingState();
  if (!hasRecoverySession) {
    return `
      <section class="panel" style="max-width: 560px; margin-inline: auto;">
        <h2 class="title">Reset Password</h2>
        <p class="subtle">Your password reset session is not active. Request a new reset link and try again.</p>
        <div class="auth-inline">
          <button class="btn" data-nav="forgot" type="button">Request reset link</button>
          <button class="btn ghost" data-nav="login" type="button">Back to login</button>
        </div>
      </section>
    `;
  }

  return `
    <section class="panel" style="max-width: 560px; margin-inline: auto;">
      <h2 class="title">Set New Password</h2>
      <p class="subtle">Enter your new password to complete account recovery.</p>
      <form id="reset-password-form" class="auth-form" style="margin-top: 1rem;" method="post" autocomplete="on">
        <label>New password <input type="password" name="password" minlength="6" autocomplete="new-password" required /></label>
        <label>Confirm new password <input type="password" name="confirmPassword" minlength="6" autocomplete="new-password" required /></label>
        <button class="btn" type="submit">Update password</button>
      </form>
      <div class="auth-inline">
        <button class="btn ghost" data-nav="login" type="button">Cancel</button>
      </div>
    </section>
  `;
}

function wirePasswordReset() {
  const form = document.getElementById("reset-password-form");
  if (!form) {
    return;
  }

  const lockForm = (isSubmitting) => {
    form.dataset.submitting = isSubmitting ? "1" : "0";
    const submit = form.querySelector('button[type="submit"]');
    if (!submit) {
      return;
    }
    if (!submit.dataset.baseLabel) {
      submit.dataset.baseLabel = submit.textContent || "Update password";
    }
    submit.disabled = isSubmitting;
    submit.textContent = isSubmitting ? "Updating..." : submit.dataset.baseLabel;
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (form.dataset.submitting === "1") {
      return;
    }
    if (!isPasswordRecoveryPendingState()) {
      toast("Reset session expired. Request a new reset link.");
      navigate("forgot");
      return;
    }

    const data = new FormData(form);
    const password = String(data.get("password") || "");
    const confirmPassword = String(data.get("confirmPassword") || "");
    if (!password || password.length < 6) {
      toast("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      toast("Password and confirm password must match.");
      return;
    }

    const authClient = getSupabaseAuthClient();
    if (!authClient) {
      toast("Supabase auth is not configured. Password reset is unavailable.");
      return;
    }

    lockForm(true);
    try {
      const { data: sessionData } = await authClient.auth.getSession().catch(() => ({ data: { session: null } }));
      if (!sessionData?.session?.user) {
        setPasswordRecoveryPendingState(false);
        toast("Reset session expired. Request a new reset link.");
        navigate("forgot");
        return;
      }
      const { error } = await authClient.auth.updateUser({ password });
      if (error) {
        toast(error.message || "Could not update password.");
        return;
      }
      setPasswordRecoveryPendingState(false);
      removeStorageKey(STORAGE_KEYS.currentUserId);
      await authClient.auth.signOut().catch(() => { });
      toast("Password updated. Log in with your new password.");
      navigate("login");
    } finally {
      lockForm(false);
    }
  });
}

function renderCompleteProfile() {
  const user = getCurrentUser();
  const shouldForceEmptyEnrollment = isGoogleOnboardingRequired(user);
  const year = shouldForceEmptyEnrollment ? null : normalizeAcademicYearOrNull(user?.academicYear);
  const semester = shouldForceEmptyEnrollment ? null : normalizeAcademicSemesterOrNull(user?.academicSemester);
  const courses = year !== null && semester !== null ? getCurriculumCourses(year, semester) : [];

  return `
    <section class="panel" style="max-width: 680px; margin-inline: auto;">
      <h2 class="title">Complete Your Account</h2>
      <p class="subtle">Add your phone number and enrollment details to activate access immediately. Use 01XXXXXXXXX, +20XXXXXXXXXX, 0020XXXXXXXXXX, or +countrycode.</p>
      <form id="complete-profile-form" class="auth-form" style="margin-top: 1rem;" method="post" autocomplete="on">
        <label>Phone number <input type="tel" name="phone" value="${escapeHtml(user?.phone || "")}" autocomplete="tel" inputmode="tel" placeholder="+20 10 0000 0000" required minlength="8" maxlength="20" pattern="[0-9+()\\-\\s]{8,20}" /></label>
        <div class="form-row">
          <label>Year
            <select name="academicYear" id="complete-profile-year" required aria-required="true">
              <option value="" ${year === null ? "selected" : ""}>Select year</option>
              ${[1, 2, 3, 4, 5]
      .map((entry) => `<option value="${entry}" ${year === entry ? "selected" : ""}>Year ${entry}</option>`)
      .join("")}
            </select>
          </label>
          <label>Semester
            <select name="academicSemester" id="complete-profile-semester" required aria-required="true">
              <option value="" ${semester === null ? "selected" : ""}>Select semester</option>
              <option value="1" ${semester === 1 ? "selected" : ""}>Semester 1</option>
              <option value="2" ${semester === 2 ? "selected" : ""}>Semester 2</option>
            </select>
          </label>
        </div>
        <div class="signup-course-field">
          <p class="signup-course-label">Courses for selected year/semester</p>
          <small id="complete-profile-courses" class="subtle">${escapeHtml(courses.length ? courses.join(", ") : "Choose year and semester first.")}</small>
        </div>
        <div class="stack">
          <button class="btn" type="submit">Save And Activate</button>
          <button class="btn ghost" type="button" data-action="logout">Cancel</button>
        </div>
      </form>
    </section>
  `;
}

function wireCompleteProfile() {
  const form = document.getElementById("complete-profile-form");
  if (!form) {
    return;
  }

  const yearSelect = document.getElementById("complete-profile-year");
  const semesterSelect = document.getElementById("complete-profile-semester");
  const coursesEl = document.getElementById("complete-profile-courses");
  const submitButton = form.querySelector('button[type="submit"]');
  const setSubmitting = (submitting) => {
    form.dataset.submitting = submitting ? "1" : "0";
    if (!submitButton) {
      return;
    }
    if (!submitButton.dataset.baseLabel) {
      submitButton.dataset.baseLabel = submitButton.textContent || "";
    }
    submitButton.disabled = submitting;
    submitButton.textContent = submitting ? "Submitting..." : submitButton.dataset.baseLabel;
  };

  const updateCoursesPreview = () => {
    const year = normalizeAcademicYearOrNull(yearSelect?.value);
    const semester = normalizeAcademicSemesterOrNull(semesterSelect?.value);
    const courses = year !== null && semester !== null ? getCurriculumCourses(year, semester) : [];
    if (coursesEl) {
      coursesEl.textContent = year !== null && semester !== null
        ? (courses.length ? courses.join(", ") : "No courses available for this selection.")
        : "Choose year and semester first.";
    }
  };

  yearSelect?.addEventListener("change", updateCoursesPreview);
  semesterSelect?.addEventListener("change", updateCoursesPreview);
  updateCoursesPreview();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (form.dataset.submitting === "1") {
      return;
    }

    const current = getCurrentUser();
    if (!current) {
      navigate("login");
      return;
    }

    const data = new FormData(form);
    const phone = String(data.get("phone") || "").trim();
    const phoneValidation = validateAndNormalizePhoneNumber(phone);
    const normalizedPhone = phoneValidation.number;
    const academicYear = normalizeAcademicYearOrNull(data.get("academicYear"));
    const academicSemester = normalizeAcademicSemesterOrNull(data.get("academicSemester"));
    if (academicYear === null || academicSemester === null) {
      toast("You need to choose the year and semester.");
      return;
    }
    const assignedCourses = getCurriculumCourses(academicYear, academicSemester);

    if (!phoneValidation.ok) {
      toast(phoneValidation.message || "Please enter a valid phone number.");
      return;
    }
    if (!assignedCourses.length) {
      toast("No courses are available for this year and semester.");
      return;
    }

    const users = getUsers();
    const idx = users.findIndex((entry) => entry.id === current.id);
    if (idx === -1) {
      toast("Account not found. Please log in again.");
      navigate("login");
      return;
    }

    setSubmitting(true);
    try {
      const autoApproved = shouldAutoApproveStudentAccess({
        role: "student",
        phone: normalizedPhone,
        academicYear,
        academicSemester,
      });
      users[idx].phone = normalizedPhone;
      users[idx].role = "student";
      users[idx].academicYear = academicYear;
      users[idx].academicSemester = academicSemester;
      users[idx].assignedCourses = assignedCourses;
      users[idx].isApproved = autoApproved;
      users[idx].approvedAt = autoApproved ? users[idx].approvedAt || nowISO() : null;
      users[idx].approvedBy = autoApproved ? users[idx].approvedBy || AUTO_APPROVAL_ACTOR : null;
      users[idx].profileCompleted = true;
      users[idx].authProvider = normalizeAuthProvider(users[idx].authProvider || getAuthProviderFromUser(current));

      save(STORAGE_KEYS.users, users);
      save(STORAGE_KEYS.currentUserId, users[idx].id);
      await syncUsersBackupState(users).catch(() => { });
      await ensureRelationalSyncReady().catch(() => { });
      if (autoApproved) {
        const profileId = getUserProfileId(users[idx]);
        if (isUuidValue(profileId)) {
          await updateRelationalProfileApproval([profileId], true).catch(() => { });
        }
      }
      await flushPendingSyncNow();

      if (autoApproved) {
        save(STORAGE_KEYS.currentUserId, users[idx].id);
        toast("Profile submitted and approved. Welcome.");
        navigate("dashboard");
      } else {
        const authClient = getSupabaseAuthClient();
        if (authClient) {
          await authClient.auth.signOut().catch(() => { });
        }
        removeStorageKey(STORAGE_KEYS.currentUserId);
        toast("Profile submitted. Your account is waiting admin approval.");
        navigate("login");
      }
    } catch (error) {
      console.warn("Profile completion sync failed.", error?.message || error);
      toast("Could not sync your profile to the admin dashboard. Please try again.");
    } finally {
      setSubmitting(false);
    }
  });
}

function renderNotifications() {
  const user = getCurrentUser();
  if (!user || user.role !== "student") {
    return `
      <section class="panel">
        <h2 class="title">Notifications unavailable</h2>
        <p class="subtle">Student role required for this page.</p>
      </section>
    `;
  }

  const notifications = getVisibleNotificationsForUser(user);
  const unreadCount = notifications.filter((notification) => !isNotificationReadByUser(notification, user)).length;
  const listMarkup = notifications
    .map((notification) => {
      const isRead = isNotificationReadByUser(notification, user);
      const bodyHtml = escapeHtml(notification.body || "").replaceAll("\n", "<br />");
      return `
        <article class="card notification-card ${isRead ? "is-read" : "is-unread"}" data-notification-id="${escapeHtml(notification.id)}">
          <div class="flex-between">
            <h3 style="margin: 0;">${escapeHtml(notification.title || "Notification")}</h3>
            <span class="badge ${isRead ? "neutral" : "good"}">${isRead ? "Read" : "New"}</span>
          </div>
          <p class="notification-card-body">${bodyHtml || "-"}</p>
          ${isRead
          ? ""
          : `<div class="stack" style="margin-top: 0.55rem;">
                  <button class="btn ghost admin-btn-sm" type="button" data-action="notification-mark-read" data-notification-id="${escapeHtml(notification.id)}">Mark as read</button>
                </div>`
        }
        </article>
      `;
    })
    .join("");

  return `
    <section class="panel" id="student-notifications-section">
      <div class="flex-between">
        <div>
          <p class="kicker">Updates</p>
          <h2 class="title">Notifications</h2>
          <p class="subtle">Messages from admin will appear here.</p>
        </div>
        <div class="stack" style="align-items: flex-end;">
          <p class="subtle" style="margin: 0;">Unread: <b>${unreadCount}</b></p>
          <button class="btn ghost" type="button" data-action="notifications-mark-all-read" ${unreadCount ? "" : "disabled"}>
            Mark all read
          </button>
        </div>
      </div>
      <p class="subtle">Live updates are enabled. ${escapeHtml(getStudentDataSyncStatusText())}</p>
      <div class="notifications-list" style="margin-top: 0.85rem;">
        ${listMarkup || `<article class="card"><p class="subtle" style="margin:0;">No notifications yet.</p></article>`}
      </div>
    </section>
  `;
}

async function markNotificationsReadForUser(user, notificationIds) {
  const currentUser = user || getCurrentUser();
  if (!currentUser || currentUser.role !== "student") {
    return { changed: false, syncWarning: "", syncDeferred: false };
  }
  const result = markNotificationsReadLocallyForUser(currentUser, notificationIds);
  if (!result.changed) {
    return { changed: false, syncWarning: "", syncDeferred: false };
  }
  if (!result.syncedDbIds.length) {
    return { changed: true, syncWarning: "", syncDeferred: false };
  }
  queueNotificationReadSync(currentUser, result.syncedDbIds);
  const flushResult = await flushPendingNotificationReadSync({ user: currentUser });
  if (!flushResult.ok) {
    return {
      changed: true,
      syncWarning: flushResult.message || "Notification read sync is queued.",
      syncDeferred: true,
    };
  }
  return { changed: true, syncWarning: "", syncDeferred: false };
}

function wireNotifications() {
  const user = getCurrentUser();
  if (!user || user.role !== "student") {
    return;
  }

  const markAsRead = async (notificationIds) => {
    const result = await markNotificationsReadForUser(user, notificationIds);
    if (result.syncDeferred) {
      toast("Marked as read locally. Cloud sync is queued and will retry automatically.");
    } else if (result.syncWarning) {
      toast(`Marked as read locally, but cloud sync failed: ${result.syncWarning}`);
    }
    if (!result.changed) {
      return false;
    }
    return true;
  };

  appEl.querySelectorAll("[data-action='notification-mark-read']").forEach((button) => {
    button.addEventListener("click", async () => {
      const notificationId = String(button.getAttribute("data-notification-id") || "").trim();
      if (!notificationId) {
        return;
      }
      const changed = await markAsRead([notificationId]);
      if (changed) {
        state.skipNextRouteAnimation = true;
        render();
      }
    });
  });

  appEl.querySelector("[data-action='notifications-mark-all-read']")?.addEventListener("click", async () => {
    const unreadNotifications = getVisibleNotificationsForUser(user)
      .filter((notification) => !isNotificationReadByUser(notification, user))
      .map((notification) => notification.id);
    if (!unreadNotifications.length) {
      return;
    }
    const changed = await markAsRead(unreadNotifications);
    if (changed) {
      toast("All notifications marked as read.");
      state.skipNextRouteAnimation = true;
      render();
    }
  });

}

function renderDashboard() {
  const user = getCurrentUser();
  const questions = getPublishedQuestionsForUser(user);
  const analytics = getStudentAnalyticsSnapshot(user.id);
  const stats = analytics.stats;
  const solvedQuestionsCount = Number.isFinite(stats?.totalAnswered) ? stats.totalAnswered : 0;
  const syncStatusText = getStudentDataSyncStatusText();

  return `
    <section class="panel">
      <p class="kicker">Welcome back</p>
      <div class="flex-between">
        <h2 class="title">Dr. ${escapeHtml(user.name)}'s Dashboard</h2>
        <div class="stack">
          <button class="btn" data-nav="create-test">Create a Test</button>
          <button class="btn ghost" type="button" data-action="refresh-student-analytics" ${state.studentDataRefreshing ? "disabled" : ""}>
            ${state.studentDataRefreshing ? "Refreshing..." : "Refresh analytics"}
          </button>
        </div>
      </div>
      <p class="subtle">${escapeHtml(syncStatusText)}</p>
      <div class="stats-grid" style="margin-top: 0.9rem;">
        <article class="card"><p class="metric">${stats.accuracy}%<small>Overall accuracy</small></p></article>
        <article class="card"><p class="metric">${stats.timePerQuestion}s<small>Avg time / question</small></p></article>
        <article class="card"><p class="metric">${solvedQuestionsCount}<small>Solved questions</small></p></article>
        <article class="card"><p class="metric">${questions.length}<small>Total questions in bank</small></p></article>
      </div>
    </section>

    <section class="panel grid-2">
      <article class="card">
        <h3>Resume Practice</h3>
        ${renderResumeCard(user.id)}
      </article>
      <article class="card">
        <h3>Weak Areas</h3>
        ${renderWeakAreas(analytics)}
        <hr />
        ${renderDashboardCoach(analytics)}
      </article>
    </section>

    ${renderPreviousTestsSection(user)}
  `;
}

function renderResumeCard(userId) {
  const inProgress = getNormalizedActiveSessionForDisplay(userId, state.sessionId);
  if (!inProgress) {
    return `<p class="subtle">No active block.</p>`;
  }

  const totalQuestions = Array.isArray(inProgress.questionIds) ? inProgress.questionIds.length : 0;
  if (!totalQuestions) {
    return `<p class="subtle">No active block.</p>`;
  }

  const currentQuestion = Math.max(1, Math.min(totalQuestions, Number(inProgress.currentIndex || 0) + 1));
  const progress = `${currentQuestion}/${totalQuestions}`;
  return `
    <p style="margin-bottom: 0.35rem;"><b>${escapeHtml(getSessionDisplayName(inProgress))}</b></p>
    <p class="subtle" style="margin-top: 0;">${escapeHtml(getSessionDisplayId(inProgress))} • ${escapeHtml(formatSessionModeLabel(inProgress.mode))} • Progress: <b>${progress}</b></p>
    <button class="btn" data-nav="session">Resume session</button>
  `;
}

function getStudentDataSyncStatusText() {
  const cloudModel = getCloudSyncStatusModel(getCurrentUser());
  if (cloudModel && ["offline", "pending", "syncing", "warning"].includes(String(cloudModel.tone || ""))) {
    return `Cloud status: ${cloudModel.label}.`;
  }
  if (state.studentDataRefreshing) {
    return "Syncing latest results...";
  }
  if (!state.studentDataLastSyncAt) {
    return "Cloud sync is idle. Local analytics are shown.";
  }
  const syncedAt = new Date(state.studentDataLastSyncAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `Last synced at ${syncedAt}.`;
}

function renderWeakAreas(snapshotOrUserId, courseFilter = "") {
  const snapshot = typeof snapshotOrUserId === "string"
    ? getStudentAnalyticsSnapshot(snapshotOrUserId, courseFilter)
    : snapshotOrUserId;
  const weak = Array.isArray(snapshot?.weakAreas) ? snapshot.weakAreas : [];
  if (!weak.length) {
    return `<p class="subtle">No weak areas yet. Complete a block first.</p>`;
  }

  const items = weak
    .slice(0, 4)
    .map((entry) => `<p><b>${escapeHtml(entry.topic)}</b> - ${entry.accuracy}% accuracy (${entry.total} q)</p>`)
    .join("");
  return items;
}

function renderDashboardCoach(snapshot) {
  const insights = snapshot?.insights;
  if (!insights) {
    return `<p class="subtle">Complete more blocks to get personalized recommendations.</p>`;
  }

  return `
    <p><b>${escapeHtml(insights.summary)}</b></p>
    <p class="subtle">${escapeHtml(insights.trendMessage)}</p>
    <p class="subtle">${escapeHtml(insights.paceMessage)}</p>
    <p class="subtle"><b>Next step:</b> ${escapeHtml(insights.nextBlockRecommendation)}</p>
  `;
}

function renderPreviousTestsSection(userOrId) {
  const user = userOrId && typeof userOrId === "object" ? userOrId : null;
  const userId = String((user?.id) || userOrId || "").trim();
  const questionMetaById = getAnalyticsQuestionMetaById();
  const completed = getCompletedSessionsForUser(userId).filter((session) => (
    isSessionWithinUserAcademicTerm(session, user, questionMetaById)
  ));
  if (!completed.length) {
    return `
      <section class="panel">
        <h3 style="margin-top: 0;">Previous Tests</h3>
        <p class="subtle">No completed tests yet for this year/semester.</p>
      </section>
    `;
  }

  const questionsById = Object.fromEntries(getQuestions().map((question) => [question.id, question]));
  completed.forEach((session) => normalizeSession(session));
  const rows = completed
    .slice(0, 10)
    .map((session) => {
      const summary = getSessionPerformanceSummary(session, questionsById);
      const completedAt = new Date(session.completedAt || session.createdAt).toLocaleString();
      return `
        <tr>
          <td>
            <div><b>${escapeHtml(getSessionDisplayName(session))}</b></div>
            <small class="subtle">${escapeHtml(getSessionDisplayId(session))}</small>
          </td>
          <td>${escapeHtml(completedAt)}</td>
          <td>${escapeHtml(formatSessionModeLabel(session.mode))}</td>
          <td>${summary.correct}/${summary.total} (${summary.accuracy}%)</td>
          <td>${summary.wrongCount}</td>
          <td>
            <div class="stack">
              <button class="btn ghost admin-btn-sm" data-action="open-previous-review" data-session-id="${session.id}">Review</button>
              <button class="btn admin-btn-sm" data-action="retry-wrong-session" data-session-id="${session.id}" ${summary.wrongCount ? "" : "disabled"}>
                Retry wrong
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  return `
    <section class="panel">
      <h3 style="margin-top: 0;">Previous Tests</h3>
      <p class="subtle">Review completed blocks or generate a new test from questions you got wrong.</p>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Test</th>
              <th>Date</th>
              <th>Mode</th>
              <th>Score</th>
              <th>Wrong</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </section>
  `;
}

function wireDashboard() {
  appEl.querySelector("[data-action='refresh-student-analytics']")?.addEventListener("click", async () => {
    await refreshStudentAnalyticsNow();
  });

  appEl.querySelectorAll("[data-action='open-previous-review']").forEach((button) => {
    button.addEventListener("click", () => {
      const sessionId = button.getAttribute("data-session-id");
      if (!sessionId) return;
      state.reviewSessionId = sessionId;
      state.reviewIndex = 0;
      navigate("review");
    });
  });

  appEl.querySelectorAll("[data-action='retry-wrong-session']").forEach((button) => {
    button.addEventListener("click", () => {
      const sessionId = button.getAttribute("data-session-id");
      const user = getCurrentUser();
      if (!sessionId || !user) return;
      const session = getCompletedSessionsForUser(user.id).find((entry) => entry.id === sessionId);
      if (!session) {
        toast("Previous test not found.");
        return;
      }

      const publishedMap = new Map(getPublishedQuestionsForUser(user).map((question) => [question.id, question]));
      const retryMeta = getRetryQuestionMetaForSession(session);
      const pool = retryMeta.questionIds.map((id) => publishedMap.get(id)).filter(Boolean);
      if (!pool.length) {
        toast("No available wrong/unsolved questions to retry for this test.");
        return;
      }

      const autoFinalizedIds = finalizeActiveSessionsForUser(user.id);
      const created = createSessionFromQuestions(pool, {
        mode: "tutor",
        source: "previous-incorrect",
        duration: 20,
        originSessionId: session.id,
      });
      if (!created) {
        toast("No questions match this test setup.");
        return;
      }

      state.sessionId = created.id;
      navigate("session");
      toast(
        autoFinalizedIds.length
          ? `Retry test created: ${retryMeta.wrongSubmitted} wrong + ${retryMeta.unsolved} unsolved. ${autoFinalizedIds.length} previous active block(s) were ended automatically.`
          : `Retry test created: ${retryMeta.wrongSubmitted} wrong + ${retryMeta.unsolved} unsolved.`,
      );
    });
  });
}

async function refreshStudentAnalyticsNow(options = {}) {
  const user = getCurrentUser();
  if (!user || user.role !== "student") {
    return false;
  }
  if (state.studentDataRefreshing) {
    if (!options?.silent) {
      toast("Analytics sync already in progress.");
    }
    return false;
  }

  const ok = await refreshStudentDataSnapshot(user, { force: true, rerender: true });
  if (!options?.silent) {
    if (ok) {
      toast("Analytics refreshed.");
    } else {
      const readyError = String(relationalSync.lastReadyError || "").trim().toLowerCase();
      const noSession = readyError.includes("no active supabase session");
      toast(
        noSession
          ? "Supabase session expired. Log out and log in again, then refresh analytics."
          : "Could not refresh cloud data. Showing local analytics.",
      );
    }
  }
  return ok;
}

function getCreateTestSourceLabel(source) {
  const labels = {
    all: "All matching",
    unused: "Unused only",
    incorrect: "Wrong only",
    flagged: "Flagged only",
    "previous-incorrect": "Retry wrong",
  };
  return labels[source] || labels.all;
}

function formatSessionModeLabel(mode) {
  return mode === "timed" ? "Timed" : "Tutor";
}

function normalizeSessionName(value, fallback = "") {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();
  if (normalized) {
    return normalized.slice(0, 80);
  }
  return String(fallback || "").replace(/\s+/g, " ").trim().slice(0, 80);
}

function buildSessionDisplayId(sessionId) {
  const normalized = String(sessionId || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!normalized) {
    return "TEST-UNKNOWN";
  }

  let parts = normalized.split("-").filter(Boolean);
  if (parts[0] === "S" && parts.length > 1) {
    parts = parts.slice(1);
  }
  if (parts.length > 3) {
    parts = [parts[0], ...parts.slice(-2)];
  }
  return `TEST-${parts.join("-")}`;
}

function normalizeSessionTestId(value, sessionId) {
  const normalized = String(value || "").replace(/\s+/g, " ").trim().toUpperCase();
  return normalized || buildSessionDisplayId(sessionId);
}

function buildAutoSessionName(options = {}) {
  const normalizedCourses = [...new Set(
    (Array.isArray(options.courses) ? options.courses : [])
      .map((course) => String(course || "").trim())
      .filter(Boolean),
  )];
  const courseLabel = normalizedCourses.length > 1
    ? "Mixed courses"
    : (normalizedCourses[0] || String(options.courseLabel || "").trim() || "General test");
  const sourceLabel = getCreateTestSourceLabel(options.source || "all");
  const questionCount = Math.max(0, Math.floor(Number(options.questionCount || 0)));
  const countLabel = questionCount
    ? `${questionCount} question${questionCount === 1 ? "" : "s"}`
    : "";
  return [courseLabel, formatSessionModeLabel(options.mode), sourceLabel, countLabel]
    .filter(Boolean)
    .join(" • ");
}

function buildAutoSessionNameFromSession(session) {
  return buildAutoSessionName({
    courses: getSessionCourseList(session),
    mode: session?.mode,
    source: session?.source,
    questionCount: Array.isArray(session?.questionIds) ? session.questionIds.length : 0,
  });
}

function getSessionDisplayName(session) {
  return normalizeSessionName(session?.name, buildAutoSessionNameFromSession(session));
}

function getSessionDisplayId(session) {
  return normalizeSessionTestId(session?.testId, session?.id);
}

function renderCreateTest() {
  const user = getCurrentUser();
  const availableCourses = getAvailableCoursesForUser(user);
  if (!availableCourses.length) {
    return `
      <section class="panel">
        <h2 class="title">Create a Test</h2>
        <p class="subtle">No O6U course is assigned to this account yet. Contact an admin.</p>
      </section>
    `;
  }

  const questions = getPublishedQuestionsForUser(user);
  if (!Array.isArray(state.qbankFilters.topics)) {
    state.qbankFilters.topics = state.qbankFilters.topic ? [state.qbankFilters.topic] : [];
  }
  if (!availableCourses.includes(state.qbankFilters.course)) {
    state.qbankFilters.course = availableCourses[0];
    state.qbankFilters.topics = [];
    state.qbankFilters.topicSource = "";
  }
  const selectedCourse = state.qbankFilters.course;
  const topicSourceOptions = getAvailableTopicSourceOptionsForCourse(selectedCourse, questions);
  const hasTopicSources = topicSourceOptions.length > 0;
  let selectedTopicSource = String(state.qbankFilters.topicSource || "").trim();
  if (hasTopicSources) {
    if (!topicSourceOptions.some((option) => option.value === selectedTopicSource)) {
      const selectedTopicKeys = new Set((state.qbankFilters.topics || []).map((topic) => String(topic || "").trim().toLowerCase()).filter(Boolean));
      const inferredSource = selectedTopicKeys.size
        ? topicSourceOptions.find((option) => option.topics.some((topic) => selectedTopicKeys.has(String(topic || "").trim().toLowerCase())))
        : null;
      selectedTopicSource = inferredSource?.value || "";
      state.qbankFilters.topicSource = selectedTopicSource;
    }
  } else {
    selectedTopicSource = "";
    state.qbankFilters.topicSource = "";
  }
  const topicSections = getAvailableTopicSectionsForCourse(selectedCourse, questions, { topicSource: selectedTopicSource });
  const topicOptions = topicSections.flatMap((section) => section.topics || []);
  const selectedTopics = (state.qbankFilters.topics || []).filter((topic) => topicOptions.includes(topic));
  if (selectedTopics.length !== (state.qbankFilters.topics || []).length) {
    state.qbankFilters.topics = selectedTopics;
  }
  const filtered = applyQbankFilters(questions, {
    course: selectedCourse,
    topics: selectedTopics,
  }, {
    strictEmptyTopics: true,
  });
  const inProgress = getNormalizedActiveSessionForDisplay(user.id, state.sessionId);
  const inProgressCount = Array.isArray(inProgress?.questionIds) ? inProgress.questionIds.length : 0;
  const allTopicsSelected = topicOptions.length > 0 && selectedTopics.length === topicOptions.length;
  const singleFlatTopicSection = (
    topicSections.length === 1
    && (!topicSections[0]?.name || String(topicSections[0]?.kind || "") === "flat")
  );
  const selectedTopicLabel = hasTopicSources && !selectedTopicSource
    ? "Choose a source first"
    : selectedTopics.length === 0
      ? "0 topics selected"
      : allTopicsSelected
        ? "All topics"
        : formatTopicFilterSummary(selectedTopics);
  const selectedSourceLabel = hasTopicSources
    ? (selectedTopicSource || "No source selected")
    : "Direct topics";
  const allowedSources = ["all", "unused", "incorrect", "flagged"];
  if (!allowedSources.includes(state.createTestSource)) {
    state.createTestSource = "all";
  }
  const sourceLabelMap = {
    all: "All matching",
    unused: "Unused only",
    incorrect: "Wrong only",
    flagged: "Flagged only",
  };
  const sourceFiltered = applySourceFilter(filtered, state.createTestSource, user.id);
  const defaultQuestionCount = Math.max(0, Math.min(500, sourceFiltered.length || 0));
  const canStartTest = Boolean(selectedTopics.length) && sourceFiltered.length > 0 && (!hasTopicSources || Boolean(selectedTopicSource));
  const inProgressName = inProgress ? getSessionDisplayName(inProgress) : "";
  const inProgressTestId = inProgress ? getSessionDisplayId(inProgress) : "";

  return `
    <section class="panel">
      <h2 class="title">Create a Test</h2>
      <p class="subtle">Choose course and topics, then generate a test block.</p>
      ${inProgress
      ? `
        <div class="card" style="margin-top: 0.7rem; display: flex; align-items: center; justify-content: space-between; gap: 0.7rem; flex-wrap: wrap;">
          <div>
            <span><b>Active block detected</b></span>
            <small class="subtle" style="display: block; margin-top: 0.18rem;">${escapeHtml(inProgressName)} • ${escapeHtml(inProgressTestId)} • ${inProgressCount} questions</small>
          </div>
          <div style="display: flex; gap: 0.55rem; flex-wrap: wrap;">
            <button class="btn" data-nav="session">Resume</button>
            <button class="btn ghost" type="button" data-action="end-active-block" data-session-id="${escapeHtml(inProgress.id)}">End block</button>
          </div>
        </div>
      `
      : ""
    }

      <div class="create-test-filter-layout">
        <div class="create-test-filter-card">
          <div class="create-test-primary-filters">
            <label>
              Course
              <select name="course" id="create-test-course-select">
                ${availableCourses
      .map((course) => `<option value="${course}" ${selectedCourse === course ? "selected" : ""}>${course}</option>`)
      .join("")}
              </select>
            </label>
            ${hasTopicSources
      ? `
              <label>
                Source
                <select name="topicSource" id="create-test-topic-source-select">
                  <option value="" ${selectedTopicSource ? "" : "selected"}>Choose a source</option>
                  ${topicSourceOptions
        .map((option) => `<option value="${escapeHtml(option.value)}" ${selectedTopicSource === option.value ? "selected" : ""}>${escapeHtml(option.label)}</option>`)
        .join("")}
                </select>
              </label>
            `
      : ""}
          </div>
        </div>
        <div class="create-test-filter-card create-test-topics-group">
          ${hasTopicSources && !selectedTopicSource
      ? '<p class="subtle create-test-topic-empty">Choose a source to see the topics inside it.</p>'
      : topicSections.length
      ? `
              <div class="create-test-topic-actions">
                <button
                  type="button"
                  class="btn ghost admin-btn-sm"
                  data-action="create-test-select-all-topics"
                  ${allTopicsSelected ? "disabled" : ""}
                >
                  Select all topics
                </button>
                <button
                  type="button"
                  class="btn ghost admin-btn-sm"
                  data-action="create-test-clear-topic-selection"
                  ${selectedTopics.length ? "" : "disabled"}
                >
                  Clear
                </button>
              </div>
              ${singleFlatTopicSection
      ? `
                  <div class="create-test-topic-list">
                    ${(topicSections[0]?.topics || [])
        .map((topic) => {
          const isNewTopic = isTopicNewForUser(selectedCourse, topic, user);
          return `
                            <label class="admin-course-check create-test-topic-chip is-list-item">
                              <input type="checkbox" data-role="create-test-topic" value="${escapeHtml(topic)}" ${(allTopicsSelected || selectedTopics.includes(topic)) ? "checked" : ""} />
                              <span class="create-test-topic-chip-copy">${escapeHtml(topic)}</span>
                              ${isNewTopic ? '<span class="badge create-test-topic-badge">New</span>' : ""}
                            </label>
                          `;
        })
        .join("")}
                  </div>
                `
      : `
                  <div class="create-test-topic-sections">
                    ${topicSections
        .map((section) => `
                          <section class="create-test-topic-section">
                            ${section.name ? `<p class="create-test-topic-section-title">${escapeHtml(section.name)}</p>` : ""}
                            <div class="create-test-topic-grid">
                              ${section.topics
            .map((topic) => {
              const isNewTopic = isTopicNewForUser(selectedCourse, topic, user);
              return `
                                    <label class="admin-course-check create-test-topic-chip">
                                      <input type="checkbox" data-role="create-test-topic" value="${escapeHtml(topic)}" ${(allTopicsSelected || selectedTopics.includes(topic)) ? "checked" : ""} />
                                      <span class="create-test-topic-chip-copy">${escapeHtml(topic)}</span>
                                      ${isNewTopic ? '<span class="badge create-test-topic-badge">New</span>' : ""}
                                    </label>
                                  `;
            })
            .join("")}
                            </div>
                          </section>
                        `)
        .join("")}
                  </div>
                `}
            `
      : '<p class="subtle create-test-topic-empty">No published topics are available for this course yet.</p>'}
        </div>
      </div>
    </section>

    <section class="panel">
      <h3 style="margin-top: 0;">Test Setup</h3>
      <form id="create-test-block-form" class="create-test-setup-form">
        <div class="create-test-setup-grid">
          <label class="create-test-setup-field">Number of questions
            <input name="count" type="number" min="0" max="500" step="1" value="${defaultQuestionCount}" />
          </label>
          <label class="create-test-setup-field">Test name (optional)
            <input
              name="testName"
              type="text"
              maxlength="80"
              placeholder="Leave blank for an automatic name"
              value="${escapeHtml(state.createTestNameDraft)}"
            />
          </label>
          <label class="create-test-setup-field">Mode
            <select name="mode" id="create-test-mode-select">
              <option value="tutor">Tutor</option>
              <option value="timed">Timed</option>
            </select>
          </label>
          <label class="create-test-setup-field">Question source
            <select name="source" id="create-test-source-select">
              <option value="all" ${state.createTestSource === "all" ? "selected" : ""}>All matching</option>
              <option value="unused" ${state.createTestSource === "unused" ? "selected" : ""}>Unused only</option>
              <option value="incorrect" ${state.createTestSource === "incorrect" ? "selected" : ""}>Wrong only</option>
              <option value="flagged" ${state.createTestSource === "flagged" ? "selected" : ""}>Flagged only</option>
            </select>
          </label>
          <label class="create-test-setup-field">Timer (minutes, timed mode)
            <input name="duration" id="create-test-duration-input" type="number" min="5" max="180" value="20" disabled />
          </label>
        </div>

        <label class="create-test-randomize">
          <input type="checkbox" name="randomize" checked />
          <span class="create-test-randomize-switch" aria-hidden="true"></span>
          <span class="create-test-randomize-copy">
            <b>Randomize questions</b>
            <small>Shuffle question order before starting the test.</small>
          </span>
        </label>

        <small id="create-test-filter-summary">Current filter: <b>${escapeHtml(selectedCourse)}</b> • Source: <b>${escapeHtml(selectedSourceLabel)}</b> • ${escapeHtml(selectedTopicLabel)} • Question source: <b>${escapeHtml(sourceLabelMap[state.createTestSource])}</b> (${sourceFiltered.length} questions)</small>
        <div class="stack">
          <button type="submit" class="btn" ${canStartTest ? "" : "disabled"}>Start test</button>
        </div>
      </form>
    </section>
  `;
}

function wireCreateTest() {
  const courseSelect = document.getElementById("create-test-course-select");
  const topicSourceSelect = document.getElementById("create-test-topic-source-select");
  const sourceSelect = document.getElementById("create-test-source-select");
  const endActiveBlockBtn = appEl.querySelector("[data-action='end-active-block']");
  const topicInputs = Array.from(document.querySelectorAll("input[data-role='create-test-topic']"));
  const selectAllTopicsBtn = appEl.querySelector("[data-action='create-test-select-all-topics']");
  const clearTopicsBtn = appEl.querySelector("[data-action='create-test-clear-topic-selection']");
  const summaryEl = document.getElementById("create-test-filter-summary");
  const blockForm = document.getElementById("create-test-block-form");
  const countInput = blockForm?.querySelector("input[name='count']");
  const nameInput = blockForm?.querySelector("input[name='testName']");
  const submitButton = blockForm?.querySelector("button[type='submit']");
  const modeSelect = document.getElementById("create-test-mode-select");
  const durationInput = document.getElementById("create-test-duration-input");

  const syncDurationInputState = () => {
    if (!(modeSelect instanceof HTMLSelectElement) || !(durationInput instanceof HTMLInputElement)) {
      return;
    }
    const isTimed = String(modeSelect.value || "tutor") === "timed";
    durationInput.disabled = !isTimed;
  };
  syncDurationInputState();

  const syncTopicSelectionUi = () => {
    const selectedSet = new Set((state.qbankFilters.topics || []).map((topic) => String(topic || "").trim()));
    const totalTopics = topicInputs.length;
    const allTopicsMode = totalTopics > 0 && selectedSet.size === totalTopics;
    topicInputs.forEach((entry) => {
      entry.checked = allTopicsMode || selectedSet.has(String(entry.value || "").trim());
    });
    if (selectAllTopicsBtn) {
      selectAllTopicsBtn.disabled = totalTopics === 0 || allTopicsMode;
    }
    if (clearTopicsBtn) {
      clearTopicsBtn.disabled = selectedSet.size === 0;
    }
  };
  syncTopicSelectionUi();

  const updateCreateTestSummary = () => {
    const user = getCurrentUser();
    const availableCourses = getAvailableCoursesForUser(user);
    const fallbackCourse = availableCourses[0] || Object.keys(QBANK_COURSE_TOPICS)[0] || "";
    const selectedCourse = state.qbankFilters.course || fallbackCourse;
    const questions = getPublishedQuestionsForUser(user);
    const topicSourceOptions = getAvailableTopicSourceOptionsForCourse(selectedCourse, questions);
    const hasTopicSources = topicSourceOptions.length > 0;
    let selectedTopicSource = String(state.qbankFilters.topicSource || "").trim();
    if (hasTopicSources) {
      if (!topicSourceOptions.some((option) => option.value === selectedTopicSource)) {
        selectedTopicSource = "";
        state.qbankFilters.topicSource = "";
        state.qbankFilters.topics = [];
      }
    } else {
      selectedTopicSource = "";
      state.qbankFilters.topicSource = "";
    }
    const topicSections = getAvailableTopicSectionsForCourse(selectedCourse, questions, { topicSource: selectedTopicSource });
    const topicOptions = topicSections.flatMap((section) => section.topics || []);
    const selectedTopics = (state.qbankFilters.topics || []).filter((topic) => topicOptions.includes(topic));
    if (selectedTopics.length !== (state.qbankFilters.topics || []).length) {
      state.qbankFilters.topics = selectedTopics;
    }
    const allTopicsSelected = topicOptions.length > 0 && selectedTopics.length === topicOptions.length;
    const selectedTopicLabel = hasTopicSources && !selectedTopicSource
      ? "Choose a source first"
      : selectedTopics.length === 0
        ? "0 topics selected"
        : allTopicsSelected
          ? "All topics"
          : formatTopicFilterSummary(selectedTopics);
    const selectedSourceLabel = hasTopicSources
      ? (selectedTopicSource || "No source selected")
      : "Direct topics";
    const filteredByCourseTopic = applyQbankFilters(questions, {
      course: selectedCourse,
      topics: selectedTopics,
    }, {
      strictEmptyTopics: true,
    });
    const allowedSources = ["all", "unused", "incorrect", "flagged"];
    if (!allowedSources.includes(state.createTestSource)) {
      state.createTestSource = "all";
    }
    const sourceLabelMap = {
      all: "All matching",
      unused: "Unused only",
      incorrect: "Wrong only",
      flagged: "Flagged only",
    };
    const filtered = applySourceFilter(filteredByCourseTopic, state.createTestSource, user.id);
    syncTopicSelectionUi();
    if (summaryEl) {
      summaryEl.innerHTML = `Current filter: <b>${escapeHtml(selectedCourse)}</b> • Source: <b>${escapeHtml(selectedSourceLabel)}</b> • ${escapeHtml(selectedTopicLabel)} • Question source: <b>${escapeHtml(sourceLabelMap[state.createTestSource])}</b> (${filtered.length} questions)`;
    }
    if (countInput) {
      const suggestedCount = Math.max(0, Math.min(500, filtered.length || 0));
      countInput.value = String(suggestedCount);
    }
    if (submitButton) {
      submitButton.disabled = !(selectedTopics.length && filtered.length > 0 && (!hasTopicSources || selectedTopicSource));
    }
  };

  courseSelect?.addEventListener("change", () => {
    const fallbackCourse = getAvailableCoursesForUser(getCurrentUser())[0] || Object.keys(QBANK_COURSE_TOPICS)[0] || "";
    state.qbankFilters.course = courseSelect.value || fallbackCourse;
    state.qbankFilters.topics = [];
    state.qbankFilters.topicSource = "";
    state.skipNextRouteAnimation = true;
    render();
  });

  topicSourceSelect?.addEventListener("change", () => {
    const selectedCourse = String(state.qbankFilters.course || courseSelect?.value || "").trim();
    const questions = getPublishedQuestionsForUser(getCurrentUser());
    const topicSourceOptions = getAvailableTopicSourceOptionsForCourse(selectedCourse, questions);
    const nextSource = String(topicSourceSelect.value || "").trim();
    const selectedOption = topicSourceOptions.find((option) => option.value === nextSource);
    state.qbankFilters.topicSource = selectedOption?.value || "";
    state.qbankFilters.topics = [];
    state.skipNextRouteAnimation = true;
    render();
  });

  topicInputs.forEach((input) => {
    input.addEventListener("change", () => {
      const selected = topicInputs.filter((entry) => entry.checked).map((entry) => entry.value);
      state.qbankFilters.topics = selected;
      updateCreateTestSummary();
    });
  });

  selectAllTopicsBtn?.addEventListener("click", () => {
    state.qbankFilters.topics = topicInputs.map((entry) => String(entry.value || "").trim()).filter(Boolean);
    updateCreateTestSummary();
  });

  clearTopicsBtn?.addEventListener("click", () => {
    state.qbankFilters.topics = [];
    updateCreateTestSummary();
  });

  sourceSelect?.addEventListener("change", () => {
    state.createTestSource = String(sourceSelect.value || "all");
    updateCreateTestSummary();
  });

  modeSelect?.addEventListener("change", () => {
    syncDurationInputState();
  });

  nameInput?.addEventListener("input", () => {
    state.createTestNameDraft = String(nameInput.value || "");
  });

  endActiveBlockBtn?.addEventListener("click", () => {
    const user = getCurrentUser();
    const sessionId = String(endActiveBlockBtn.getAttribute("data-session-id") || "").trim();
    if (!user || !sessionId) {
      return;
    }

    const session = getSessionById(sessionId);
    if (!session || session.userId !== user.id || session.status !== "in_progress") {
      toast("Active block not found.");
      state.skipNextRouteAnimation = true;
      render();
      return;
    }

    finalizeSession(session.id);
    if (state.sessionId === session.id) {
      state.sessionId = null;
    }
    toast("Block ended and moved to previous tests.");
    state.skipNextRouteAnimation = true;
    render();
  });

  blockForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const user = getCurrentUser();
    const data = new FormData(blockForm);

    const mode = String(data.get("mode") || "tutor");
    const source = String(data.get("source") || state.createTestSource || "all");
    state.createTestSource = source;
    const requestedTestNameRaw = String(data.get("testName") || state.createTestNameDraft || "");
    const requestedTestName = normalizeSessionName(requestedTestNameRaw);
    state.createTestNameDraft = requestedTestNameRaw;
    const duration = Math.max(5, Number(data.get("duration") || 20));
    const randomize = data.get("randomize") === "on";

    const availableCourses = getAvailableCoursesForUser(user);
    if (!availableCourses.includes(state.qbankFilters.course)) {
      state.qbankFilters.course = availableCourses[0] || "";
      state.qbankFilters.topics = [];
      state.qbankFilters.topicSource = "";
    }
    const topicSourceOptions = getAvailableTopicSourceOptionsForCourse(state.qbankFilters.course, getPublishedQuestionsForUser(user));
    const hasTopicSources = topicSourceOptions.length > 0;
    if (hasTopicSources && !String(state.qbankFilters.topicSource || "").trim()) {
      toast("Choose a source first.");
      return;
    }
    if (!(state.qbankFilters.topics || []).length) {
      toast("Choose at least one topic.");
      return;
    }
    let pool = applyQbankFilters(getPublishedQuestionsForUser(user), state.qbankFilters, {
      strictEmptyTopics: true,
    });
    pool = applySourceFilter(pool, source, user.id);
    const fallbackCount = Math.max(0, Math.min(500, pool.length || 0));
    const requestedCount = Math.floor(Number(data.get("count")));
    const count = Math.min(
      500,
      Math.max(0, Number.isFinite(requestedCount) ? requestedCount : fallbackCount),
    );
    if (count <= 0) {
      toast("Choose at least one topic first.");
      return;
    }

    if (randomize) {
      pool = shuffle(pool);
    }

    const autoFinalizedIds = finalizeActiveSessionsForUser(user.id);
    const session = createSessionFromQuestions(pool, {
      count,
      mode,
      source,
      name: requestedTestName,
      courseLabel: state.qbankFilters.course,
      duration,
      originSessionId: null,
    });
    if (!session) {
      toast("No questions match this test setup.");
      return;
    }

    state.createTestNameDraft = "";
    state.sessionId = session.id;
    navigate("session");
    toast(
      autoFinalizedIds.length
        ? `Test created. ${autoFinalizedIds.length} previous active block(s) were ended automatically and moved to previous tests.`
        : "Test created.",
    );
  });

  const currentUser = getCurrentUser();
  const visibleCourse = String(state.qbankFilters.course || courseSelect?.value || "").trim();
  const visibleTopics = topicInputs.map((input) => String(input.value || "").trim()).filter(Boolean);
  if (currentUser?.role === "student" && visibleCourse && visibleTopics.length) {
    markTopicListAsSeen(visibleCourse, visibleTopics, currentUser);
  }
}

function getSessionFontScaleCssValue() {
  const normalized = normalizeSessionFontScalePercent(state.sessionFontScalePercent, SESSION_FONT_SCALE_DEFAULT);
  return (normalized / 100).toFixed(2);
}

function setSessionFontScalePercent(nextPercent, options = {}) {
  const normalized = normalizeSessionFontScalePercent(nextPercent, state.sessionFontScalePercent);
  if (state.sessionFontScalePercent === normalized && !options.force) {
    return false;
  }
  state.sessionFontScalePercent = normalized;
  state.sessionFontScale = getSessionFontScaleBucket(normalized);
  persistSessionUiPreferences();
  return true;
}

function renderSessionNavSettings() {
  const markerToneClass = state.sessionMarkerEnabled ? "is-active" : "";
  const markerLabel = state.sessionMarkerEnabled ? "Highlighter on" : "Highlighter off";
  const markerButtonText = state.sessionMarkerEnabled ? "Disable highlighter" : "Enable highlighter";
  const fontPercent = normalizeSessionFontScalePercent(state.sessionFontScalePercent, SESSION_FONT_SCALE_DEFAULT);

  return `
    <div class="exam-nav-settings">
      <div class="exam-nav-setting-row">
        <span class="exam-nav-setting-label">Font size</span>
        <div class="exam-nav-font-controls">
          <button
            type="button"
            class="btn ghost exam-nav-step-btn"
            data-action="decrease-session-font"
            aria-label="Decrease font size"
            title="Decrease font size"
          >−</button>
          <input
            id="session-font-scale-slider"
            class="exam-nav-font-slider"
            type="range"
            min="${SESSION_FONT_SCALE_MIN}"
            max="${SESSION_FONT_SCALE_MAX}"
            step="${SESSION_FONT_SCALE_STEP}"
            value="${fontPercent}"
            aria-label="Session font size"
          />
          <button
            type="button"
            class="btn ghost exam-nav-step-btn"
            data-action="increase-session-font"
            aria-label="Increase font size"
            title="Increase font size"
          >+</button>
          <span class="exam-nav-font-value" data-role="session-font-scale-value">${fontPercent}%</span>
        </div>
      </div>
      <div class="exam-nav-setting-row">
        <span class="exam-nav-setting-label">Highlighter</span>
        <button
          type="button"
          class="btn ghost exam-nav-marker-toggle ${markerToneClass}"
          data-action="toggle-marker-mode"
          aria-pressed="${state.sessionMarkerEnabled ? "true" : "false"}"
        >${markerButtonText}</button>
      </div>
      <div class="exam-nav-setting-row">
        <span class="exam-nav-setting-label">${markerLabel}</span>
        <div class="exam-nav-highlight-palette" role="group" aria-label="Highlighter colors">
          ${["yellow", "red", "green"]
      .map((color) => `
              <button
                type="button"
                class="exam-nav-color-btn ${state.sessionHighlighterColor === color ? "is-selected" : ""}"
                data-action="set-highlighter-color"
                data-color="${color}"
                aria-label="${color[0].toUpperCase()}${color.slice(1)} highlighter"
                aria-pressed="${state.sessionHighlighterColor === color ? "true" : "false"}"
              ><span class="swatch is-${color}" aria-hidden="true"></span></button>
            `)
      .join("")}
        </div>
      </div>
      <button type="button" class="btn ghost exam-nav-reset-btn" data-action="reset-session-ui-settings">Reset settings</button>
    </div>
  `;
}

function syncSessionUiControlsInDom() {
  const shell = appEl.querySelector(".exam-shell");
  if (shell) {
    shell.style.setProperty("--exam-font-scale", getSessionFontScaleCssValue());
    shell.classList.toggle("marker-on", Boolean(state.sessionMarkerEnabled));
    const normalizedColor = normalizeSessionHighlightColor(state.sessionHighlighterColor);
    shell.classList.remove("marker-yellow", "marker-red", "marker-green");
    shell.classList.add(`marker-${normalizedColor}`);
  }

  const slider = document.getElementById("session-font-scale-slider");
  const fontPercent = normalizeSessionFontScalePercent(state.sessionFontScalePercent, SESSION_FONT_SCALE_DEFAULT);
  if (slider && String(slider.value) !== String(fontPercent)) {
    slider.value = String(fontPercent);
  }
  const valueEl = appEl.querySelector("[data-role='session-font-scale-value']");
  if (valueEl) {
    valueEl.textContent = `${fontPercent}%`;
  }
}

function buildEmptyTextHighlightStore() {
  return {
    lines: {},
    choices: {},
  };
}

function ensureResponseTextHighlightStore(response) {
  if (!response || typeof response !== "object") {
    return buildEmptyTextHighlightStore();
  }
  if (!response.textHighlights || typeof response.textHighlights !== "object" || Array.isArray(response.textHighlights)) {
    response.textHighlights = buildEmptyTextHighlightStore();
    return response.textHighlights;
  }
  if (!response.textHighlights.lines || typeof response.textHighlights.lines !== "object" || Array.isArray(response.textHighlights.lines)) {
    response.textHighlights.lines = {};
  }
  if (!response.textHighlights.choices || typeof response.textHighlights.choices !== "object" || Array.isArray(response.textHighlights.choices)) {
    response.textHighlights.choices = {};
  }
  return response.textHighlights;
}

function normalizeTextHighlightRanges(ranges, maxLength = null) {
  if (!Array.isArray(ranges)) {
    return [];
  }
  const hasBound = Number.isFinite(maxLength);
  const lengthBound = hasBound ? Math.max(0, Math.floor(Number(maxLength))) : null;
  const normalized = [];
  ranges.forEach((entry) => {
    const color = normalizeSessionHighlightColor(entry?.color, "");
    if (!color) {
      return;
    }
    let start = Math.floor(Number(entry?.start));
    let end = Math.floor(Number(entry?.end));
    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      return;
    }
    if (hasBound) {
      start = Math.min(lengthBound, Math.max(0, start));
      end = Math.min(lengthBound, Math.max(0, end));
    } else {
      start = Math.max(0, start);
      end = Math.max(0, end);
    }
    if (end <= start) {
      return;
    }
    normalized.push({ start, end, color });
  });
  normalized.sort((a, b) => a.start - b.start || a.end - b.end);
  const merged = [];
  normalized.forEach((range) => {
    const previous = merged[merged.length - 1];
    if (previous && previous.color === range.color && range.start <= previous.end) {
      previous.end = Math.max(previous.end, range.end);
      return;
    }
    merged.push({ ...range });
  });
  return merged;
}

function resolveTextHighlightRanges(ranges, textLength) {
  const safeLength = Math.max(0, Math.floor(Number(textLength) || 0));
  if (!safeLength) {
    return [];
  }
  const resolvedRanges = normalizeTextHighlightRanges(ranges, safeLength);
  if (!resolvedRanges.length) {
    return [];
  }
  const charColors = new Array(safeLength).fill("");
  resolvedRanges.forEach((range) => {
    for (let index = range.start; index < range.end; index += 1) {
      charColors[index] = range.color;
    }
  });
  const compressed = [];
  let activeColor = "";
  let activeStart = -1;
  for (let index = 0; index <= safeLength; index += 1) {
    const current = index < safeLength ? charColors[index] : "";
    if (current === activeColor) {
      continue;
    }
    if (activeColor) {
      compressed.push({ start: activeStart, end: index, color: activeColor });
    }
    activeColor = current;
    activeStart = current ? index : -1;
  }
  return compressed;
}

function getPrimaryHighlightColorFromRanges(ranges) {
  if (!Array.isArray(ranges) || !ranges.length) {
    return "";
  }
  const firstColor = normalizeSessionHighlightColor(ranges[0]?.color, "");
  return firstColor || "";
}

function renderTextWithInlineHighlights(text, ranges) {
  const content = String(text || "");
  if (!content) {
    return "";
  }
  const resolvedRanges = resolveTextHighlightRanges(ranges, content.length);
  if (!resolvedRanges.length) {
    return escapeHtml(content);
  }
  const parts = [];
  let cursor = 0;
  resolvedRanges.forEach((range) => {
    if (range.start > cursor) {
      parts.push(escapeHtml(content.slice(cursor, range.start)));
    }
    const highlightedChunk = escapeHtml(content.slice(range.start, range.end));
    parts.push(`<span class="exam-inline-highlight is-text-highlighted is-highlight-${range.color}">${highlightedChunk}</span>`);
    cursor = range.end;
  });
  if (cursor < content.length) {
    parts.push(escapeHtml(content.slice(cursor)));
  }
  return parts.join("");
}

function updateHighlightRangesWithSelection(ranges, selectionStart, selectionEnd, color, textLength) {
  const safeLength = Math.max(0, Math.floor(Number(textLength) || 0));
  if (!safeLength) {
    return [];
  }
  const normalizedColor = normalizeSessionHighlightColor(color);
  const start = Math.max(0, Math.min(safeLength, Math.floor(Number(selectionStart) || 0)));
  const end = Math.max(0, Math.min(safeLength, Math.floor(Number(selectionEnd) || 0)));
  if (end <= start) {
    return resolveTextHighlightRanges(ranges, safeLength);
  }
  const charColors = new Array(safeLength).fill("");
  resolveTextHighlightRanges(ranges, safeLength).forEach((range) => {
    for (let index = range.start; index < range.end; index += 1) {
      charColors[index] = range.color;
    }
  });
  let alreadyHighlighted = true;
  for (let index = start; index < end; index += 1) {
    if (charColors[index] !== normalizedColor) {
      alreadyHighlighted = false;
      break;
    }
  }
  const nextColor = alreadyHighlighted ? "" : normalizedColor;
  for (let index = start; index < end; index += 1) {
    charColors[index] = nextColor;
  }
  const compressed = [];
  let activeColor = "";
  let activeStart = -1;
  for (let index = 0; index <= safeLength; index += 1) {
    const current = index < safeLength ? charColors[index] : "";
    if (current === activeColor) {
      continue;
    }
    if (activeColor) {
      compressed.push({ start: activeStart, end: index, color: activeColor });
    }
    activeColor = current;
    activeStart = current ? index : -1;
  }
  return compressed;
}

function getHighlightTargetFromNode(node) {
  const sourceElement = node && node.nodeType === 1 ? node : node?.parentElement;
  const target = sourceElement?.closest?.("[data-highlight-kind]");
  if (!target) {
    return null;
  }
  const kind = String(target.getAttribute("data-highlight-kind") || "").trim().toLowerCase();
  if (kind === "line") {
    const lineIndex = Math.floor(Number(target.getAttribute("data-line-index")));
    if (!Number.isFinite(lineIndex) || lineIndex < 0) {
      return null;
    }
    return { kind: "line", key: String(lineIndex), element: target };
  }
  if (kind === "choice") {
    const choiceId = normalizeQuestionChoiceLabel(target.getAttribute("data-choice-id"));
    if (!choiceId) {
      return null;
    }
    return { kind: "choice", key: choiceId, element: target };
  }
  return null;
}

function getSelectionOffsetsWithinElement(range, element) {
  if (!range || !element) {
    return null;
  }
  try {
    const beforeRange = range.cloneRange();
    beforeRange.selectNodeContents(element);
    beforeRange.setEnd(range.startContainer, range.startOffset);
    const start = beforeRange.toString().length;
    const length = range.toString().length;
    const end = start + length;
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      return null;
    }
    return { start, end };
  } catch {
    return null;
  }
}

function getSessionHighlightUndoKey(sessionId, questionId) {
  return `${String(sessionId || "").trim()}::${String(questionId || "").trim()}`;
}

function shouldSuppressStrikeClick(sessionId, questionId, choiceId) {
  const pending = state.sessionPendingHighlightSelection;
  if (!pending) {
    return false;
  }
  const expired = Number(pending.expiresAt || 0) < Date.now();
  const matches = pending.kind === "choice"
    && pending.sessionId === sessionId
    && pending.questionId === questionId
    && pending.choiceId === choiceId;
  if (!matches || expired) {
    if (expired) {
      state.sessionPendingHighlightSelection = null;
    }
    return false;
  }
  state.sessionPendingHighlightSelection = null;
  return true;
}

function normalizeResponseHighlightSnapshot(snapshot) {
  const safeSnapshot = snapshot && typeof snapshot === "object" ? snapshot : {};
  const normalizedLineColors = {};
  if (safeSnapshot.highlightedLineColors && typeof safeSnapshot.highlightedLineColors === "object") {
    Object.entries(safeSnapshot.highlightedLineColors).forEach(([lineKey, color]) => {
      const lineIndex = Math.floor(Number(lineKey));
      const normalizedColor = normalizeSessionHighlightColor(color, "");
      if (!Number.isFinite(lineIndex) || lineIndex < 0 || !normalizedColor) {
        return;
      }
      normalizedLineColors[lineIndex] = normalizedColor;
    });
  }
  const normalizedChoiceColors = {};
  if (safeSnapshot.highlightedChoices && typeof safeSnapshot.highlightedChoices === "object") {
    Object.entries(safeSnapshot.highlightedChoices).forEach(([choiceKey, color]) => {
      const choiceId = normalizeQuestionChoiceLabel(choiceKey);
      const normalizedColor = normalizeSessionHighlightColor(color, "");
      if (!choiceId || !normalizedColor) {
        return;
      }
      normalizedChoiceColors[choiceId] = normalizedColor;
    });
  }
  const textHighlights = buildEmptyTextHighlightStore();
  if (safeSnapshot.textHighlights && typeof safeSnapshot.textHighlights === "object") {
    if (safeSnapshot.textHighlights.lines && typeof safeSnapshot.textHighlights.lines === "object") {
      Object.entries(safeSnapshot.textHighlights.lines).forEach(([lineKey, ranges]) => {
        const lineIndex = Math.floor(Number(lineKey));
        if (!Number.isFinite(lineIndex) || lineIndex < 0) {
          return;
        }
        const normalizedRanges = normalizeTextHighlightRanges(ranges);
        if (normalizedRanges.length) {
          textHighlights.lines[lineIndex] = normalizedRanges;
        }
      });
    }
    if (safeSnapshot.textHighlights.choices && typeof safeSnapshot.textHighlights.choices === "object") {
      Object.entries(safeSnapshot.textHighlights.choices).forEach(([choiceKey, ranges]) => {
        const choiceId = normalizeQuestionChoiceLabel(choiceKey);
        if (!choiceId) {
          return;
        }
        const normalizedRanges = normalizeTextHighlightRanges(ranges);
        if (normalizedRanges.length) {
          textHighlights.choices[choiceId] = normalizedRanges;
        }
      });
    }
  }
  const normalizedLines = Array.isArray(safeSnapshot.highlightedLines)
    ? [...new Set(safeSnapshot.highlightedLines
      .map((entry) => Math.floor(Number(entry)))
      .filter((entry) => Number.isFinite(entry) && entry >= 0))]
      .sort((a, b) => a - b)
    : [];
  Object.keys(normalizedLineColors).forEach((lineKey) => {
    const lineIndex = Math.floor(Number(lineKey));
    if (Number.isFinite(lineIndex) && lineIndex >= 0 && !normalizedLines.includes(lineIndex)) {
      normalizedLines.push(lineIndex);
    }
  });
  normalizedLines.sort((a, b) => a - b);
  return {
    highlightedLines: normalizedLines,
    highlightedLineColors: normalizedLineColors,
    highlightedChoices: normalizedChoiceColors,
    textHighlights,
  };
}

function captureResponseHighlightSnapshot(response) {
  ensureResponseTextHighlightStore(response);
  return normalizeResponseHighlightSnapshot({
    highlightedLines: response.highlightedLines,
    highlightedLineColors: response.highlightedLineColors,
    highlightedChoices: response.highlightedChoices,
    textHighlights: response.textHighlights,
  });
}

function applyResponseHighlightSnapshot(response, snapshot) {
  const normalized = normalizeResponseHighlightSnapshot(snapshot);
  response.highlightedLines = [...normalized.highlightedLines];
  response.highlightedLineColors = { ...normalized.highlightedLineColors };
  response.highlightedChoices = { ...normalized.highlightedChoices };
  response.textHighlights = {
    lines: { ...normalized.textHighlights.lines },
    choices: { ...normalized.textHighlights.choices },
  };
}

function pushSessionHighlightUndoSnapshot(sessionId, questionId, response) {
  const key = getSessionHighlightUndoKey(sessionId, questionId);
  if (!key || key === "::") {
    return;
  }
  const snapshot = captureResponseHighlightSnapshot(response);
  if (!state.sessionHighlightUndo[key]) {
    state.sessionHighlightUndo[key] = [];
  }
  const stack = state.sessionHighlightUndo[key];
  const lastSnapshot = stack[stack.length - 1];
  if (lastSnapshot && JSON.stringify(lastSnapshot) === JSON.stringify(snapshot)) {
    return;
  }
  stack.push(snapshot);
  const MAX_HIGHLIGHT_UNDO_STEPS = 60;
  if (stack.length > MAX_HIGHLIGHT_UNDO_STEPS) {
    stack.splice(0, stack.length - MAX_HIGHLIGHT_UNDO_STEPS);
  }
}

function undoSessionHighlightChange(session, questionId) {
  const key = getSessionHighlightUndoKey(session?.id, questionId);
  const stack = state.sessionHighlightUndo[key];
  if (!stack || !stack.length) {
    return false;
  }
  const response = session.responses?.[questionId];
  if (!response) {
    return false;
  }
  const snapshot = stack.pop();
  if (!stack.length) {
    delete state.sessionHighlightUndo[key];
  }
  applyResponseHighlightSnapshot(response, snapshot);
  session.updatedAt = nowISO();
  upsertSession(session);
  return true;
}

function renderSession() {
  const user = getCurrentUser();
  const session = getActiveSession(user.id, state.sessionId);

  if (!session) {
    return `
      <section class="panel">
        <h2 class="title">No active session</h2>
        <p class="subtle">Create a new test or review completed blocks.</p>
        <div class="stack">
          <button class="btn" data-nav="create-test">Create a test</button>
          <button class="btn ghost" data-nav="review">Review blocks</button>
        </div>
      </section>
    `;
  }

  state.sessionId = session.id;
  normalizeSession(session);

  const questionsById = new Map(getQuestions().map((entry) => [entry.id, entry]));
  const total = session.questionIds.length;
  if (!total) {
    return `
      <section class="panel">
        <h2 class="title">Session unavailable</h2>
        <p class="subtle">This session no longer has available questions. Create a new test.</p>
        <button class="btn" data-nav="create-test">Create a test</button>
      </section>
    `;
  }
  const currentQid = session.questionIds[session.currentIndex];
  const question = questionsById.get(currentQid);
  const response = session.responses[currentQid];
  if (!question || !response) {
    return `
      <section class="panel">
        <h2 class="title">Session unavailable</h2>
        <p class="subtle">This session could not be recovered. Create a new test.</p>
        <button class="btn" data-nav="create-test">Create a test</button>
      </section>
    `;
  }

  const stemLines = splitStemLines(question.stem);
  const correctChoiceIds = getNormalizedQuestionCorrectChoiceIds(question);
  const choiceType = correctChoiceIds.length > 1 ? "checkbox" : "radio";
  const isSubmitted = response.submitted;
  const isCorrect = isSubmittedResponseCorrect(question, response);
  const markText = isSubmitted && isCorrect ? "1.00" : "0.00";
  const statusText = isSubmitted ? (isCorrect ? "Correct" : "Incorrect") : "Not graded";
  const isTimedMode = session.mode === "timed";
  const normalizedHighlighterColor = normalizeSessionHighlightColor(state.sessionHighlighterColor);
  const shellClassNames = [
    "exam-shell",
    "exam-shell-moodle",
    `font-${state.sessionFontScale}`,
    state.sessionHighContrast ? "high-contrast" : "",
    state.sessionMarkerEnabled ? "marker-on" : "",
    `marker-${normalizedHighlighterColor}`,
  ].filter(Boolean).join(" ");
  const shellStyleAttr = `--exam-font-scale:${getSessionFontScaleCssValue()};`;
  const mappedCourse = getQbankCourseTopicMeta(question).course;
  const questionCourse = String(question.qbankCourse || question.course || "").trim();
  const currentCourse = mappedCourse || questionCourse;
  const askAiUrl = resolveAskAiNotebookUrlForQuestion(question);
  const hasAskAiLink = Boolean(askAiUrl);
  const initialTimedSeconds = Math.max(0, Number(session.durationMin || 0) * 60);
  const countdownSeconds = Math.max(
    0,
    Number(session.timeRemainingSec != null ? session.timeRemainingSec : initialTimedSeconds),
  );
  const sessionName = getSessionDisplayName(session);
  const sessionTestId = getSessionDisplayId(session);

  const sideRows = session.questionIds
    .map((qid, index) => {
      const entry = session.responses[qid];
      const navQuestion = questionsById.get(qid) || null;
      const isSubmittedEntry = Boolean(entry?.submitted);
      const isCorrectEntry = isSubmittedEntry && isSubmittedResponseCorrect(navQuestion, entry);
      const isWrongEntry = isSubmittedEntry && !isCorrectEntry;
      const currentClass = index === session.currentIndex ? "is-current" : "";
      const flaggedClass = entry.flagged ? "is-flagged" : "";
      const answeredClass = entry.selected.length > 0 ? "is-answered" : "";
      const unansweredClass = entry.selected.length === 0 ? "is-unanswered" : "";
      const correctnessClass = isCorrectEntry ? "is-correct" : (isWrongEntry ? "is-wrong" : "");
      const statusLabel = entry.flagged
        ? "flagged"
        : isCorrectEntry
          ? "correct"
          : isWrongEntry
            ? "incorrect"
            : entry.selected.length > 0
              ? "answered"
              : "unanswered";
      return `
        <button
          type="button"
          class="exam-nav-item ${currentClass} ${flaggedClass} ${answeredClass} ${unansweredClass} ${correctnessClass}"
          data-action="jump-question"
          data-index="${index}"
          aria-label="Go to question ${index + 1}, ${statusLabel}"
        >
          <span class="num">${index + 1}</span>
        </button>
      `;
    })
    .join("");

  const choicesHtml = question.choices
    .map((choice) => {
      const selected = response.selected.includes(choice.id);
      const struck = response.struck.includes(choice.id);
      const choiceText = String(choice.text || "");
      const choiceLegacyHighlightColor = normalizeSessionHighlightColor(response.highlightedChoices?.[choice.id], "");
      let choiceHighlightRanges = resolveTextHighlightRanges(response.textHighlights?.choices?.[choice.id], choiceText.length);
      if (!choiceHighlightRanges.length && choiceLegacyHighlightColor && choiceText.length) {
        choiceHighlightRanges = [{ start: 0, end: choiceText.length, color: choiceLegacyHighlightColor }];
      }
      const renderedChoiceText = renderTextWithInlineHighlights(choiceText, choiceHighlightRanges);
      const correctChoice = correctChoiceIds.includes(choice.id);
      const wrongSelected = isSubmitted && selected && !correctChoice;
      const showCorrect = isSubmitted && correctChoice;
      const statusClass = `${showCorrect ? "is-correct" : ""} ${wrongSelected ? "is-user-wrong" : ""}`;
      const statusIndicator = showCorrect
        ? `<span class="exam-choice-indicator good">✓</span>`
        : wrongSelected
          ? `<span class="exam-choice-indicator bad">✕</span>`
          : `<span class="exam-choice-indicator neutral"></span>`;
      const inlineFeedback = isSubmitted && isCorrect && selected && correctChoice
        ? `<span class="exam-choice-inline-note">Excellent! This is the correct answer.</span>`
        : "";
      const choiceInputId = `session-answer-${currentQid}-${choice.id}`;
      return `
        <div class="exam-choice ${selected ? "is-selected" : ""} ${struck ? "is-struck" : ""} ${statusClass}">
          <div class="exam-choice-hit">
            ${statusIndicator}
            <label class="exam-choice-radio-hit" for="${escapeHtml(choiceInputId)}" aria-label="Select answer ${choice.id}">
              <input id="${escapeHtml(choiceInputId)}" type="${choiceType}" name="answer" value="${choice.id}" ${selected ? "checked" : ""} ${isSubmitted ? "disabled" : ""} />
              <span class="exam-choice-radio"></span>
            </label>
            <button
              type="button"
              class="exam-choice-text exam-choice-text-hit"
              data-action="toggle-strike"
              data-choice-id="${choice.id}"
              ${isSubmitted ? "disabled" : ""}
              aria-label="Strike or unstrike choice ${choice.id}"
            ><b>${choice.id}.</b> <span class="exam-choice-text-body" data-highlight-kind="choice" data-choice-id="${choice.id}">${renderedChoiceText}</span> ${inlineFeedback}</button>
          </div>
        </div>
      `;
    })
    .join("");

  return `
    <section class="exam-shell-wrap">
      <div class="${shellClassNames}" style="${shellStyleAttr}">
        <section class="exam-main exam-main-simple">
          <div class="exam-content exam-content-moodle">
            <aside class="exam-question-meta">
              <h3>Question <b>${session.currentIndex + 1}</b></h3>
              <p class="exam-mark-line"><b>${escapeHtml(sessionName)}</b></p>
              <p class="exam-mark-line subtle">${escapeHtml(sessionTestId)}</p>
              <p class="exam-question-status ${isSubmitted ? (isCorrect ? "good" : "bad") : "neutral"}">${statusText}</p>
              <p class="exam-mark-line">Mark ${markText} out of 1.00</p>
              ${isTimedMode
      ? `<p class="countdown exam-countdown" title="Timed mode (${session.durationMin} minutes)">Time left: <span id="countdown">${formatDuration(countdownSeconds)}</span></p>`
      : `<p class="exam-mark-line subtle">Mode: Tutor</p>`
    }
              <button class="exam-meta-link" data-action="toggle-flag">⚑ ${response.flagged ? "Unflag question" : "Flag question"}</button>
              <span class="exam-meta-badge">v1 (latest)</span>
            </aside>

            <section class="exam-question-stage">
              <article class="exam-question-block exam-question-card">
                <div class="exam-question-topbar">
                  <button
                    type="button"
                    class="exam-ask-ai-btn"
                    data-action="open-course-ai"
                    title="${hasAskAiLink
      ? (currentCourse ? `Open Ask AI for ${escapeHtml(currentCourse)}` : "Open Ask AI")
      : "Ask AI is unavailable until an admin assigns a link."}"
                    ${hasAskAiLink ? "" : "disabled"}
                  >
                    <span class="exam-ask-ai-spark" aria-hidden="true">✦</span>
                    <span>Ask AI</span>
                  </button>
                  <button
                    type="button"
                    class="exam-copy-question-btn"
                    data-action="copy-course-ai-question"
                    title="Copy this question for Ask AI"
                  >
                    Copy question
                  </button>
                </div>
                ${renderQuestionStemVisual(question)}
                <div class="exam-stem">
                  ${stemLines
      .map((line, index) => {
        const lineText = String(line || "");
        const lineHighlightColor = normalizeSessionHighlightColor(response.highlightedLineColors?.[index], "");
        let lineHighlightRanges = resolveTextHighlightRanges(response.textHighlights?.lines?.[index], lineText.length);
        if (!lineHighlightRanges.length && lineHighlightColor && lineText.length) {
          lineHighlightRanges = [{ start: 0, end: lineText.length, color: lineHighlightColor }];
        }
        return `<p class="exam-line" data-highlight-kind="line" data-line-index="${index}" title="Select text to highlight">${renderTextWithInlineHighlights(lineText, lineHighlightRanges)}</p>`;
      })
      .join("")}
                </div>

                <div class="exam-answers">
                  ${choicesHtml}
                </div>

                <div class="exam-answer-actions">
                  <button
                    class="btn exam-submit-btn"
                    data-action="${isSubmitted ? "next-question" : "submit-answer"}"
                  >${isSubmitted ? "Next" : "Check"}</button>
                </div>
              </article>
              ${isSubmitted ? renderInlineExplanationPane(question, isCorrect) : ""}
            </section>

            <aside class="exam-nav-panel">
              <div class="exam-nav-panel-head">
                <h3>Quiz navigation</h3>
                <button
                  type="button"
                  class="exam-nav-settings-toggle ${state.sessionNavSettingsOpen ? "is-open" : ""}"
                  data-action="toggle-nav-settings"
                  aria-label="Open block settings"
                  aria-expanded="${state.sessionNavSettingsOpen ? "true" : "false"}"
                  aria-controls="session-settings-drawer"
                  title="Block settings"
                >
                  <span class="bar" aria-hidden="true"></span>
                  <span class="bar" aria-hidden="true"></span>
                  <span class="bar" aria-hidden="true"></span>
                </button>
              </div>
              <div class="exam-nav-grid">${sideRows}</div>
              <button class="exam-nav-link" data-action="submit-session">Submit all and finish</button>
              <button class="btn ghost exam-nav-new" data-nav="create-test">Start a new preview</button>
            </aside>
            <button
              type="button"
              class="exam-nav-settings-backdrop ${state.sessionNavSettingsOpen ? "is-open" : ""}"
              data-action="toggle-nav-settings"
              aria-label="Close block settings"
              aria-hidden="${state.sessionNavSettingsOpen ? "false" : "true"}"
            ></button>
            <aside
              id="session-settings-drawer"
              class="exam-nav-settings-drawer ${state.sessionNavSettingsOpen ? "is-open" : ""}"
              aria-hidden="${state.sessionNavSettingsOpen ? "false" : "true"}"
            >
              <div class="exam-nav-settings-drawer-head">
                <h4>Block settings</h4>
                <button
                  type="button"
                  class="btn ghost exam-nav-settings-close"
                  data-action="toggle-nav-settings"
                  aria-label="Close block settings"
                >Close</button>
              </div>
              ${renderSessionNavSettings()}
            </aside>
          </div>
        </section>
      </div>
    </section>
  `;
}

function syncActiveResponseSelectionFromDom(activeSession) {
  const currentQid = activeSession.questionIds[activeSession.currentIndex];
  const response = activeSession.responses[currentQid];
  if (!response) {
    return [];
  }
  const selected = [...new Set(
    Array.from(appEl.querySelectorAll("input[name='answer']:checked"))
      .map((entry) => String(entry.value || "").trim().toUpperCase())
      .filter(Boolean),
  )];
  response.selected = selected;
  return selected;
}

function wireSession() {
  const user = getCurrentUser();
  const session = getActiveSession(user.id, state.sessionId);
  if (!session) {
    return;
  }

  normalizeSession(session);

  if (!session.lastQuestionAt) {
    session.lastQuestionAt = Date.now();
    upsertSession(session);
  }

  startSessionTicker(session.id);
  syncSessionUiControlsInDom();

  const fontScaleSlider = document.getElementById("session-font-scale-slider");
  fontScaleSlider?.addEventListener("input", () => {
    const nextPercent = normalizeSessionFontScalePercent(fontScaleSlider.value, state.sessionFontScalePercent);
    setSessionFontScalePercent(nextPercent);
    syncSessionUiControlsInDom();
  });

  const answerInputs = appEl.querySelectorAll("input[name='answer']");
  answerInputs.forEach((input) => {
    input.addEventListener("change", () => {
      const latest = getSessionById(session.id);
      if (!latest || latest.status !== "in_progress") {
        return;
      }

      const currentQid = latest.questionIds[latest.currentIndex];
      const response = latest.responses[currentQid];
      syncActiveResponseSelectionFromDom(latest);
      response.submitted = false;
      latest.updatedAt = nowISO();
      upsertSession(latest);
      state.skipNextRouteAnimation = true;
      render();
    });
  });

  appEl.removeEventListener("click", handleSessionClick);
  appEl.addEventListener("click", handleSessionClick);
  document.removeEventListener("keydown", handleSessionKeydown);
  document.addEventListener("keydown", handleSessionKeydown);
  document.removeEventListener("mouseup", handleSessionHighlighterMouseup);
  document.addEventListener("mouseup", handleSessionHighlighterMouseup);

  const noteInput = document.getElementById("session-note-panel");
  noteInput?.addEventListener("input", () => {
    const latest = getSessionById(session.id);
    if (!latest || latest.status !== "in_progress") {
      return;
    }

    const currentQid = latest.questionIds[latest.currentIndex];
    latest.responses[currentQid].notes = noteInput.value;
    latest.updatedAt = nowISO();
    upsertSession(latest);
  });

  const feedbackForm = document.getElementById("feedback-form");
  feedbackForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const latest = getSessionById(session.id);
    if (!latest || latest.status !== "in_progress") {
      return;
    }

    const input = document.getElementById("feedback-input");
    const message = String(input?.value || "").trim();
    if (!message) {
      toast("Write feedback first.");
      return;
    }

    const feedback = load(STORAGE_KEYS.feedback, []);
    feedback.push({
      id: makeId("fb"),
      userId: latest.userId,
      sessionId: latest.id,
      questionId: latest.questionIds[latest.currentIndex],
      message,
      createdAt: nowISO(),
    });
    save(STORAGE_KEYS.feedback, feedback);
    state.sessionPanel = null;
    toast("Feedback submitted.");
    render();
  });
}

async function handleSessionClick(event) {
  const target = event.target.closest("[data-action]");
  if (!target) {
    return;
  }

  const action = target.getAttribute("data-action");
  const user = getCurrentUser();
  const session = getActiveSession(user.id, state.sessionId);
  if (!session) {
    return;
  }

  normalizeSession(session);
  syncActiveResponseSelectionFromDom(session);

  const maxIndex = session.questionIds.length - 1;
  const trackedActions = new Set(["prev-question", "next-question", "jump-question", "jump-unanswered", "save-exit", "submit-session"]);
  const shouldTrackElapsed = trackedActions.has(action);
  if (shouldTrackElapsed) {
    captureElapsedForCurrentQuestion(session);
  }

  if (action === "toggle-fullscreen") {
    toggleSessionFullscreen();
    return;
  }

  if (action === "open-shortcuts") {
    toggleSessionPanel("shortcuts");
    return;
  }

  if (action === "open-labs") {
    toggleSessionPanel("labs");
    return;
  }

  if (action === "open-notes") {
    toggleSessionPanel("notes");
    return;
  }

  if (action === "open-calculator") {
    toggleSessionPanel("calculator");
    return;
  }

  if (action === "open-settings") {
    toggleSessionPanel("settings");
    return;
  }

  if (action === "toggle-nav-settings") {
    state.sessionNavSettingsOpen = !state.sessionNavSettingsOpen;
    render();
    return;
  }

  if (action === "decrease-session-font" || action === "increase-session-font") {
    const delta = action === "increase-session-font" ? SESSION_FONT_SCALE_STEP : -SESSION_FONT_SCALE_STEP;
    setSessionFontScalePercent(state.sessionFontScalePercent + delta);
    syncSessionUiControlsInDom();
    return;
  }

  if (action === "set-highlighter-color") {
    const requested = normalizeSessionHighlightColor(target.getAttribute("data-color"), state.sessionHighlighterColor);
    if (state.sessionHighlighterColor !== requested) {
      state.sessionHighlighterColor = requested;
      persistSessionUiPreferences();
      render();
      return;
    }
    return;
  }

  if (action === "reset-session-ui-settings") {
    state.sessionMarkerEnabled = false;
    state.sessionHighlighterColor = SESSION_HIGHLIGHTER_DEFAULT;
    state.sessionHighContrast = false;
    setSessionFontScalePercent(SESSION_FONT_SCALE_DEFAULT, { force: true });
    toast("Block settings reset.");
    render();
    return;
  }

  if (action === "open-library") {
    toggleSessionPanel("library");
    return;
  }

  if (action === "open-notebook") {
    toggleSessionPanel("notebook");
    return;
  }

  if (action === "open-feedback") {
    toggleSessionPanel("feedback");
    return;
  }

  if (action === "open-ai-tutor") {
    toggleSessionPanel("aiTutor");
    return;
  }

  if (action === "open-course-ai") {
    const qid = session.questionIds[session.currentIndex];
    const question = getQuestions().find((entry) => entry.id === qid);
    if (!question) {
      toast("Current question could not be loaded.");
      return;
    }
    const notebookUrl = resolveAskAiNotebookUrlForQuestion(question);
    if (!notebookUrl) {
      toast("Ask AI is unavailable until an admin assigns a link.");
      return;
    }
    const opened = openAskAiNotebook(notebookUrl);
    if (!opened) {
      toast("Popup blocked, so Ask AI tab did not open. Allow popups and try again.");
    }
    return;
  }

  if (action === "copy-course-ai-question") {
    const qid = session.questionIds[session.currentIndex];
    const question = getQuestions().find((entry) => entry.id === qid);
    if (!question) {
      toast("Current question could not be loaded.");
      return;
    }
    const promptText = buildAskAiPromptText(question);
    const copied = await copyTextToClipboard(promptText);
    toast(copied
      ? "Question copied. Paste in Ask AI with Ctrl/Cmd+V."
      : "Could not auto-copy. Please copy and paste manually.");
    return;
  }

  if (action === "close-session-panel") {
    state.sessionPanel = null;
    render();
    return;
  }

  if (action === "toggle-marker-mode") {
    state.sessionMarkerEnabled = !state.sessionMarkerEnabled;
    persistSessionUiPreferences();
    toast(state.sessionMarkerEnabled ? "Highlighter enabled." : "Highlighter disabled.");
    render();
    return;
  }

  if (action === "set-font-scale") {
    const scale = target.getAttribute("data-scale");
    if (["compact", "normal", "large"].includes(scale)) {
      const mappedPercent = scale === "compact" ? 90 : scale === "large" ? 112 : SESSION_FONT_SCALE_DEFAULT;
      setSessionFontScalePercent(mappedPercent);
      syncSessionUiControlsInDom();
    }
    return;
  }

  if (action === "toggle-contrast") {
    state.sessionHighContrast = !state.sessionHighContrast;
    persistSessionUiPreferences();
    render();
    return;
  }

  if (action === "calc-input") {
    const value = target.getAttribute("data-value") || "";
    applyCalculatorInput(value);
    render();
    return;
  }

  if (action === "calc-clear") {
    state.calcExpression = "";
    render();
    return;
  }

  if (action === "calc-delete") {
    state.calcExpression = state.calcExpression.slice(0, -1);
    render();
    return;
  }

  if (action === "calc-eval") {
    evaluateCalculator();
    render();
    return;
  }

  if (action === "add-flashcard") {
    addCurrentQuestionToFlashcards(session.userId, session.questionIds[session.currentIndex]);
    toast("Added to flashcards.");
    return;
  }

  if (action === "toggle-line-highlight") {
    return;
  }

  if (action === "prev-question") {
    session.currentIndex = Math.max(0, session.currentIndex - 1);
  }

  if (action === "next-question") {
    session.currentIndex = Math.min(maxIndex, session.currentIndex + 1);
  }

  if (action === "jump-question") {
    const index = Number(target.getAttribute("data-index") || 0);
    session.currentIndex = Math.min(maxIndex, Math.max(0, index));
  }

  if (action === "jump-unanswered") {
    const unansweredIndex = session.questionIds.findIndex((qid) => session.responses[qid].selected.length === 0);
    if (unansweredIndex === -1) {
      toast("All questions are answered.");
      return;
    }
    session.currentIndex = unansweredIndex;
  }

  if (action === "toggle-flag") {
    const qid = session.questionIds[session.currentIndex];
    const response = session.responses[qid];
    response.flagged = !response.flagged;
  }

  if (action === "toggle-strike") {
    const choiceId = normalizeQuestionChoiceLabel(target.getAttribute("data-choice-id"));
    if (!choiceId) {
      return;
    }
    const qid = session.questionIds[session.currentIndex];
    const response = session.responses[qid];
    if (shouldSuppressStrikeClick(session.id, qid, choiceId)) {
      return;
    }
    if (response.struck.includes(choiceId)) {
      response.struck = response.struck.filter((entry) => entry !== choiceId);
    } else {
      response.struck.push(choiceId);
    }
  }

  if (action === "toggle-pause") {
    session.paused = !session.paused;
    toast(session.paused ? "Timer paused." : "Timer resumed.");
  }

  if (action === "submit-answer") {
    const qid = session.questionIds[session.currentIndex];
    const response = session.responses[qid];
    if (response.submitted) {
      captureElapsedForCurrentQuestion(session);
      session.currentIndex = Math.min(maxIndex, session.currentIndex + 1);
      session.updatedAt = nowISO();
      upsertSession(session);
      render();
      return;
    }
    if (!response.selected.length) {
      toast("Select an answer before submitting.");
      return;
    }
    response.submitted = true;
    const question = getQuestions().find((entry) => entry.id === qid);
    const correct = isSubmittedResponseCorrect(question, response);
    if (!correct) {
      addQuestionToIncorrectQueue(session.userId, qid);
    }
    toast(correct ? "Correct." : "Incorrect.");
  }

  if (action === "reset-answer") {
    const qid = session.questionIds[session.currentIndex];
    const response = session.responses[qid];
    response.submitted = false;
    state.sessionPanel = null;
  }

  if (action === "save-exit") {
    session.updatedAt = nowISO();
    upsertSession(session, { immediate: true });
    await flushPendingSyncNow({ throwOnRelationalFailure: false }).catch(() => { });
    appEl.removeEventListener("click", handleSessionClick);
    document.removeEventListener("keydown", handleSessionKeydown);
    document.removeEventListener("mouseup", handleSessionHighlighterMouseup);
    state.sessionPanel = null;
    navigate("create-test");
    toast("Session suspended.");
    return;
  }

  if (action === "submit-session") {
    const unansweredQuestionNumbers = session.questionIds
      .map((qid, index) => ({ index, response: session.responses[qid] }))
      .filter(({ response }) => !Array.isArray(response?.selected) || response.selected.length === 0)
      .map(({ index }) => index + 1);
    if (unansweredQuestionNumbers.length) {
      const preview = unansweredQuestionNumbers.slice(0, 15).join(", ");
      const moreCount = unansweredQuestionNumbers.length - Math.min(unansweredQuestionNumbers.length, 15);
      const suffix = moreCount > 0 ? ` (+${moreCount} more)` : "";
      const confirmed = window.confirm(
        `Questions ${preview}${suffix} are not submitted (no answer selected). Submit all and finish anyway?`,
      );
      if (!confirmed) {
        return;
      }
    }

    session.questionIds.forEach((qid) => {
      const response = session.responses[qid];
      if (response?.selected?.length) {
        response.submitted = true;
      }
    });
    finalizeSession(session.id);
    await flushPendingSyncNow({ throwOnRelationalFailure: false }).catch(() => { });
    appEl.removeEventListener("click", handleSessionClick);
    document.removeEventListener("keydown", handleSessionKeydown);
    document.removeEventListener("mouseup", handleSessionHighlighterMouseup);
    state.sessionPanel = null;
    state.reviewSessionId = session.id;
    state.reviewIndex = 0;
    navigate("review");
    toast("Block submitted.");
    return;
  }

  session.updatedAt = nowISO();
  upsertSession(session);
  render();
}

function handleSessionKeydown(event) {
  if (state.route !== "session") {
    return;
  }

  const activeTag = document.activeElement?.tagName;
  const isUndoShortcut = (event.key === "z" || event.key === "Z") && (event.metaKey || event.ctrlKey) && !event.altKey;
  if (isUndoShortcut) {
    if (["INPUT", "TEXTAREA", "SELECT"].includes(activeTag)) {
      return;
    }
    event.preventDefault();
    const user = getCurrentUser();
    if (!user) {
      return;
    }
    const session = getActiveSession(user.id, state.sessionId);
    if (!session || session.status !== "in_progress") {
      return;
    }
    normalizeSession(session);
    const questionId = session.questionIds[session.currentIndex];
    if (!questionId) {
      return;
    }
    const undone = undoSessionHighlightChange(session, questionId);
    if (!undone) {
      toast("No highlight step to undo.");
      return;
    }
    toast("Highlight undone.");
    render();
    return;
  }
  if (["INPUT", "TEXTAREA", "SELECT"].includes(activeTag) && event.key !== "Escape") {
    return;
  }
  if (event.metaKey || event.ctrlKey || event.altKey) {
    return;
  }

  if (/^[1-5]$/.test(event.key)) {
    const index = Number(event.key) - 1;
    const choiceInput = appEl.querySelectorAll("input[name='answer']")[index];
    if (choiceInput) {
      choiceInput.checked = true;
      choiceInput.dispatchEvent(new Event("change"));
      event.preventDefault();
    }
    return;
  }

  const mapped = {
    ArrowLeft: "prev-question",
    ArrowRight: "next-question",
    f: "toggle-flag",
    n: "open-notes",
    l: "open-labs",
    c: "open-calculator",
    k: "open-shortcuts",
    m: "toggle-marker-mode",
    s: "submit-answer",
  };

  if (event.key === "Escape") {
    if (state.sessionPanel) {
      state.sessionPanel = null;
      render();
      event.preventDefault();
    }
    return;
  }

  const action = mapped[event.key] || mapped[event.key.toLowerCase()];
  if (!action) {
    return;
  }

  event.preventDefault();
  appEl.querySelector(`[data-action="${action}"]`)?.click();
}

function handleSessionHighlighterMouseup() {
  if (state.route !== "session" || !state.sessionMarkerEnabled) {
    return;
  }
  const selection = window.getSelection?.();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return;
  }
  const selectedText = String(selection.toString() || "");
  if (!selectedText.trim()) {
    selection.removeAllRanges();
    return;
  }
  const range = selection.getRangeAt(0);
  const startTarget = getHighlightTargetFromNode(range.startContainer);
  const endTarget = getHighlightTargetFromNode(range.endContainer);
  if (
    !startTarget
    || !endTarget
    || startTarget.kind !== endTarget.kind
    || startTarget.key !== endTarget.key
  ) {
    selection.removeAllRanges();
    return;
  }
  const offsets = getSelectionOffsetsWithinElement(range, startTarget.element);
  selection.removeAllRanges();
  if (!offsets) {
    return;
  }
  const user = getCurrentUser();
  if (!user) {
    return;
  }
  const session = getActiveSession(user.id, state.sessionId);
  if (!session || session.status !== "in_progress") {
    return;
  }
  normalizeSession(session);
  const qid = session.questionIds[session.currentIndex];
  const response = session.responses[qid];
  if (!response) {
    return;
  }
  const textLength = Math.max(0, String(startTarget.element.textContent || "").length);
  if (!textLength) {
    return;
  }
  const highlightStore = ensureResponseTextHighlightStore(response);
  const activeColor = normalizeSessionHighlightColor(state.sessionHighlighterColor);
  pushSessionHighlightUndoSnapshot(session.id, qid, response);
  state.sessionPendingHighlightSelection = null;
  if (startTarget.kind === "line") {
    const lineKey = startTarget.key;
    const lineRanges = updateHighlightRangesWithSelection(
      highlightStore.lines[lineKey],
      offsets.start,
      offsets.end,
      activeColor,
      textLength,
    );
    const lineIndex = Math.floor(Number(lineKey));
    if (!Array.isArray(response.highlightedLines)) {
      response.highlightedLines = [];
    }
    if (!response.highlightedLineColors || typeof response.highlightedLineColors !== "object" || Array.isArray(response.highlightedLineColors)) {
      response.highlightedLineColors = {};
    }
    if (lineRanges.length) {
      highlightStore.lines[lineKey] = lineRanges;
      if (!response.highlightedLines.includes(lineIndex)) {
        response.highlightedLines.push(lineIndex);
      }
      const primaryColor = getPrimaryHighlightColorFromRanges(lineRanges) || activeColor;
      response.highlightedLineColors[lineIndex] = primaryColor;
    } else {
      delete highlightStore.lines[lineKey];
      response.highlightedLines = response.highlightedLines.filter((entry) => entry !== lineIndex);
      delete response.highlightedLineColors[lineIndex];
    }
  } else if (startTarget.kind === "choice") {
    const choiceKey = startTarget.key;
    state.sessionPendingHighlightSelection = {
      kind: "choice",
      sessionId: session.id,
      questionId: qid,
      choiceId: choiceKey,
      expiresAt: Date.now() + 400,
    };
    const choiceRanges = updateHighlightRangesWithSelection(
      highlightStore.choices[choiceKey],
      offsets.start,
      offsets.end,
      activeColor,
      textLength,
    );
    if (!response.highlightedChoices || typeof response.highlightedChoices !== "object" || Array.isArray(response.highlightedChoices)) {
      response.highlightedChoices = {};
    }
    if (choiceRanges.length) {
      highlightStore.choices[choiceKey] = choiceRanges;
      const primaryColor = getPrimaryHighlightColorFromRanges(choiceRanges) || activeColor;
      response.highlightedChoices[choiceKey] = primaryColor;
    } else {
      delete highlightStore.choices[choiceKey];
      delete response.highlightedChoices[choiceKey];
    }
  }
  session.updatedAt = nowISO();
  upsertSession(session);
  render();
}

function startSessionTicker(sessionId) {
  clearTimer();
  const countdown = document.getElementById("countdown");
  const elapsed = document.getElementById("elapsed-time");

  timerHandle = window.setInterval(() => {
    const session = getSessionById(sessionId);
    if (!session || session.status !== "in_progress") {
      clearTimer();
      return;
    }
    normalizeSession(session);

    if (session.paused) {
      return;
    }

    session.elapsedSec = (session.elapsedSec || 0) + 1;
    if (elapsed) {
      elapsed.textContent = formatElapsed(session.elapsedSec);
    }

    if (session.mode === "timed") {
      session.timeRemainingSec = Math.max(0, (session.timeRemainingSec || 0) - 1);
      const activeQid = session.questionIds[session.currentIndex];
      if (session.responses[activeQid]) {
        session.responses[activeQid].timeSpentSec += 1;
      }
      if (countdown) {
        countdown.textContent = formatDuration(session.timeRemainingSec);
      }
    }

    const freshSession = getSessionById(sessionId);
    if (freshSession) {
      freshSession.elapsedSec = session.elapsedSec;
      freshSession.updatedAt = nowISO();
      if (session.mode === "timed") {
        freshSession.timeRemainingSec = session.timeRemainingSec;
        const freshActiveQid = freshSession.questionIds[freshSession.currentIndex];
        if (freshActiveQid && freshSession.responses[freshActiveQid]) {
          freshSession.responses[freshActiveQid].timeSpentSec =
            (freshSession.responses[freshActiveQid].timeSpentSec || 0) + 1;
        }
      }
      upsertSession(freshSession);
    } else {
      session.updatedAt = nowISO();
      upsertSession(session);
    }

    if (session.mode === "timed" && session.timeRemainingSec <= 0) {
      finalizeSession(session.id);
      clearTimer();
      toast("Time is up. Session submitted automatically.");
      state.reviewSessionId = session.id;
      state.reviewIndex = 0;
      state.sessionPanel = null;
      navigate("review");
    }
  }, 1000);
}

function clearTimer() {
  if (timerHandle) {
    window.clearInterval(timerHandle);
    timerHandle = null;
  }
}

function finalizeSession(sessionId) {
  const session = getSessionById(sessionId);
  if (!session) {
    return;
  }
  captureElapsedForCurrentQuestion(session);

  session.status = "completed";
  session.completedAt = nowISO();
  session.paused = false;
  session.updatedAt = nowISO();
  upsertSession(session, { immediate: true });

  const incorrectMap = load(STORAGE_KEYS.incorrectQueue, {});
  const userQueue = new Set(incorrectMap[session.userId] || []);

  for (const qid of session.questionIds) {
    const question = getQuestions().find((entry) => entry.id === qid);
    const response = session.responses[qid];
    const correct = isSubmittedResponseCorrect(question, response);
    if (!correct) {
      userQueue.add(qid);
    }
  }

  incorrectMap[session.userId] = [...userQueue];
  save(STORAGE_KEYS.incorrectQueue, incorrectMap);
}

function finalizeActiveSessionsForUser(userId) {
  const targetUserId = String(userId || "").trim();
  if (!targetUserId) {
    return [];
  }
  const activeSessions = getSessionsForUser(targetUserId)
    .filter((session) => String(session?.status || "").trim() === "in_progress")
    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
  if (!activeSessions.length) {
    return [];
  }

  const finalizedIds = [];
  activeSessions.forEach((session) => {
    const sessionId = String(session?.id || "").trim();
    if (!sessionId) {
      return;
    }
    finalizeSession(sessionId);
    finalizedIds.push(sessionId);
  });

  if (finalizedIds.includes(String(state.sessionId || "").trim())) {
    state.sessionId = null;
  }
  return finalizedIds;
}

function addQuestionToIncorrectQueue(userId, questionId) {
  if (!userId || !questionId) {
    return;
  }
  const incorrectMap = load(STORAGE_KEYS.incorrectQueue, {});
  const userQueue = new Set(incorrectMap[userId] || []);
  userQueue.add(questionId);
  incorrectMap[userId] = [...userQueue];
  save(STORAGE_KEYS.incorrectQueue, incorrectMap);
}

function renderReview() {
  const user = getCurrentUser();
  const completedSessions = getCompletedSessionsForUser(user.id);

  if (!completedSessions.length) {
    return `
      <section class="panel">
        <h2 class="title">Review</h2>
        <p class="subtle">No completed blocks yet.</p>
        <button class="btn" data-nav="create-test">Create your first test</button>
      </section>
    `;
  }

  const selected =
    completedSessions.find((session) => session.id === state.reviewSessionId) || completedSessions[0];
  state.reviewSessionId = selected.id;
  normalizeSession(selected);

  const questions = getQuestions();
  const questionsById = new Map(questions.map((entry) => [entry.id, entry]));
  const reviewedEntries = selected.questionIds.map((qid) => {
    const question = questionsById.get(qid) || null;
    const response = selected.responses[qid] || {
      selected: [],
      flagged: false,
      struck: [],
      notes: "",
      timeSpentSec: 0,
      highlightedLines: [],
      highlightedLineColors: {},
      highlightedChoices: {},
      textHighlights: buildEmptyTextHighlightStore(),
      submitted: true,
    };
    const hasAnswer = response.selected.length > 0;
    const isCorrect = isSubmittedResponseCorrect(question, response);
    const isWrong = Boolean(question && !isCorrect);
    return { qid, question, response, hasAnswer, isCorrect, isWrong };
  });

  const total = reviewedEntries.length;
  const correctCount = reviewedEntries.filter((entry) => entry.isCorrect).length;
  const accuracy = total ? Math.round((correctCount / total) * 100) : 0;

  if (!Number.isFinite(state.reviewIndex)) {
    state.reviewIndex = 0;
  }
  state.reviewIndex = Math.max(0, Math.min(total - 1, Math.floor(state.reviewIndex)));
  const current = reviewedEntries[state.reviewIndex];
  if (!current) {
    return `
      <section class="panel">
        <h2 class="title">Review</h2>
        <p class="subtle">This block has no questions to review.</p>
        <button class="btn" data-nav="create-test">Create a new test</button>
      </section>
    `;
  }

  const question = current.question;
  const response = current.response;
  const isCorrect = current.isCorrect;
  const markText = isCorrect ? "1.00" : "0.00";
  const statusText = isCorrect ? "Correct" : "Incorrect";
  const stemLines = splitStemLines(question?.stem || "Question content is not available.");
  const correctChoiceIds = Array.isArray(question?.correct) ? question.correct : [];
  const questionChoices = Array.isArray(question?.choices) ? question.choices : [];
  const choiceType = question && correctChoiceIds.length > 1 ? "checkbox" : "radio";
  const reviewShellClassNames = [
    "exam-shell",
    "exam-shell-moodle",
    `font-${state.sessionFontScale}`,
    state.sessionHighContrast ? "high-contrast" : "",
    `marker-${normalizeSessionHighlightColor(state.sessionHighlighterColor)}`,
  ].filter(Boolean).join(" ");
  const reviewShellStyleAttr = `--exam-font-scale:${getSessionFontScaleCssValue()};`;
  const sessionName = getSessionDisplayName(selected);
  const sessionTestId = getSessionDisplayId(selected);

  const sideRows = reviewedEntries
    .map((entry, index) => {
      const currentClass = index === state.reviewIndex ? "is-current" : "";
      const flaggedClass = entry.response.flagged ? "is-flagged" : "";
      const answeredClass = entry.hasAnswer ? "is-answered" : "is-unanswered";
      const correctnessClass = entry.isCorrect ? "is-correct" : entry.isWrong ? "is-wrong" : "";
      const statusLabel = entry.response.flagged
        ? "flagged"
        : entry.isCorrect
          ? "correct"
          : entry.isWrong
            ? "incorrect"
            : entry.hasAnswer
              ? "answered"
              : "unanswered";
      return `
        <button
          type="button"
          class="exam-nav-item ${currentClass} ${flaggedClass} ${answeredClass} ${correctnessClass}"
          data-action="review-jump-question"
          data-index="${index}"
          aria-label="Go to review question ${index + 1}, ${statusLabel}"
        >
          <span class="num">${index + 1}</span>
        </button>
      `;
    })
    .join("");

  const choicesHtml = question
    ? questionChoices
      .map((choice) => {
        const selectedChoice = response.selected.includes(choice.id);
        const choiceText = String(choice.text || "");
        const choiceLegacyHighlightColor = normalizeSessionHighlightColor(response.highlightedChoices?.[choice.id], "");
        let choiceHighlightRanges = resolveTextHighlightRanges(response.textHighlights?.choices?.[choice.id], choiceText.length);
        if (!choiceHighlightRanges.length && choiceLegacyHighlightColor && choiceText.length) {
          choiceHighlightRanges = [{ start: 0, end: choiceText.length, color: choiceLegacyHighlightColor }];
        }
        const renderedChoiceText = renderTextWithInlineHighlights(choiceText, choiceHighlightRanges);
        const correctChoice = correctChoiceIds.includes(choice.id);
        const wrongSelected = selectedChoice && !correctChoice;
        const showCorrect = correctChoice;
        const statusClass = `${showCorrect ? "is-correct" : ""} ${wrongSelected ? "is-user-wrong" : ""}`;
        const statusIndicator = showCorrect
          ? `<span class="exam-choice-indicator good">✓</span>`
          : wrongSelected
            ? `<span class="exam-choice-indicator bad">✕</span>`
            : `<span class="exam-choice-indicator neutral"></span>`;
        const inlineFeedback = isCorrect && selectedChoice && correctChoice
          ? `<span class="exam-choice-inline-note">Excellent! This is the correct answer.</span>`
          : "";
        return `
            <div class="exam-choice ${selectedChoice ? "is-selected" : ""} ${statusClass}">
              <label class="exam-choice-hit">
                ${statusIndicator}
                <input type="${choiceType}" name="review-answer" value="${choice.id}" ${selectedChoice ? "checked" : ""} disabled />
                <span class="exam-choice-radio"></span>
                <span class="exam-choice-text"><b>${choice.id}.</b> <span class="exam-choice-text-body">${renderedChoiceText}</span> ${inlineFeedback}</span>
              </label>
            </div>
          `;
      })
      .join("")
    : `<p class="subtle">This question was removed from the bank and cannot be rendered.</p>`;
  const isFirstReviewQuestion = state.reviewIndex <= 0;
  const isLastReviewQuestion = state.reviewIndex >= total - 1;

  return `
    <section class="exam-shell-wrap">
      <div class="${reviewShellClassNames}" style="${reviewShellStyleAttr}">
        <section class="exam-main exam-main-simple">
          <div class="exam-content exam-content-moodle">
            <aside class="exam-question-meta">
              <h3>Question <b>${state.reviewIndex + 1}</b></h3>
              <p class="exam-mark-line"><b>${escapeHtml(sessionName)}</b></p>
              <p class="exam-mark-line subtle">${escapeHtml(sessionTestId)}</p>
              <p class="exam-question-status ${isCorrect ? "good" : "bad"}">${statusText}</p>
              <p class="exam-mark-line">Mark ${markText} out of 1.00</p>
              <p class="exam-mark-line subtle">Mode: ${escapeHtml(selected.mode === "timed" ? "Timed" : "Tutor")}</p>
              <p class="exam-mark-line subtle">Block score: ${correctCount}/${total} (${accuracy}%)</p>
              <span class="exam-meta-link muted">${response.flagged ? "⚑ Flagged question" : "⚑ Not flagged"}</span>
              <span class="exam-meta-badge">v1 (latest)</span>
            </aside>

            <section class="exam-question-stage">
              <article class="exam-question-block exam-question-card">
                ${renderQuestionStemVisual(question)}
                <div class="exam-stem">
                  ${stemLines
      .map((line, index) => {
        const lineText = String(line || "");
        const lineHighlightColor = normalizeSessionHighlightColor(response.highlightedLineColors?.[index], "");
        let lineHighlightRanges = resolveTextHighlightRanges(response.textHighlights?.lines?.[index], lineText.length);
        if (!lineHighlightRanges.length && lineHighlightColor && lineText.length) {
          lineHighlightRanges = [{ start: 0, end: lineText.length, color: lineHighlightColor }];
        }
        return `<p class="exam-line">${renderTextWithInlineHighlights(lineText, lineHighlightRanges)}</p>`;
      })
      .join("")}
                </div>

                <div class="exam-answers">
                  ${choicesHtml}
                </div>

                <div class="exam-answer-actions">
                  <div class="exam-nav-icons">
                    <button
                      class="btn ghost exam-icon-btn"
                      data-action="review-prev-question"
                      ${isFirstReviewQuestion ? "disabled" : ""}
                      aria-label="Previous question"
                      title="Previous question"
                    ><span aria-hidden="true">←</span></button>
                    <button
                      class="btn ghost exam-icon-btn"
                      data-action="review-next-question"
                      ${isLastReviewQuestion ? "disabled" : ""}
                      aria-label="Next question"
                      title="Next question"
                    ><span aria-hidden="true">→</span></button>
                  </div>
                </div>
              </article>
              ${renderReviewFeedbackPane(question, response, isCorrect)}
            </section>

            <aside class="exam-nav-panel">
              <h3>Quiz navigation</h3>
              <div class="exam-nav-grid">${sideRows}</div>
              <button class="exam-nav-link" data-action="review-finish">Finish review</button>
              <button class="btn ghost exam-nav-new" data-nav="create-test">Start a new preview</button>
            </aside>
          </div>
        </section>
      </div>
    </section>
  `;
}

function wireReview() {
  appEl.removeEventListener("click", handleReviewClick);
  appEl.addEventListener("click", handleReviewClick);
  document.removeEventListener("keydown", handleReviewKeydown);
  document.addEventListener("keydown", handleReviewKeydown);
}

function handleReviewClick(event) {
  if (state.route !== "review") {
    return;
  }

  const target = event.target.closest("[data-action]");
  if (!target) {
    return;
  }

  const user = getCurrentUser();
  const completedSessions = getCompletedSessionsForUser(user.id);
  const selected =
    completedSessions.find((session) => session.id === state.reviewSessionId) || completedSessions[0];
  if (!selected) {
    return;
  }

  const maxIndex = Math.max(0, selected.questionIds.length - 1);
  const action = target.getAttribute("data-action");

  if (action === "review-jump-question") {
    const index = Number(target.getAttribute("data-index") || 0);
    state.reviewIndex = Math.min(maxIndex, Math.max(0, index));
    render();
    return;
  }

  if (action === "review-prev-question") {
    state.reviewIndex = Math.max(0, state.reviewIndex - 1);
    render();
    return;
  }

  if (action === "review-next-question") {
    state.reviewIndex = Math.min(maxIndex, state.reviewIndex + 1);
    render();
    return;
  }

  if (action === "review-finish") {
    state.reviewIndex = 0;
    navigate("dashboard");
  }
}

function handleReviewKeydown(event) {
  if (state.route !== "review") {
    return;
  }

  const activeTag = document.activeElement?.tagName;
  if (["INPUT", "TEXTAREA", "SELECT"].includes(activeTag) && event.key !== "Escape") {
    return;
  }
  if (event.metaKey || event.ctrlKey || event.altKey) {
    return;
  }

  if (event.key === "ArrowLeft") {
    event.preventDefault();
    state.reviewIndex = Math.max(0, state.reviewIndex - 1);
    render();
    return;
  }

  if (event.key === "ArrowRight") {
    event.preventDefault();
    const user = getCurrentUser();
    const selected = getCompletedSessionsForUser(user.id)
      .find((session) => session.id === state.reviewSessionId);
    if (!selected) {
      return;
    }
    const maxIndex = Math.max(0, selected.questionIds.length - 1);
    state.reviewIndex = Math.min(maxIndex, state.reviewIndex + 1);
    render();
    return;
  }

  if (/^[1-9]$/.test(event.key)) {
    const index = Number(event.key) - 1;
    const directTarget = appEl.querySelector(`[data-action="review-jump-question"][data-index="${index}"]`);
    if (directTarget) {
      event.preventDefault();
      directTarget.click();
    }
  }
}

function renderReviewFeedbackPane(question, response, isCorrect) {
  if (!question) {
    return `
      <section class="exam-feedback-block bad">
        <header class="exam-feedback-head">
          <h4>Question unavailable.</h4>
        </header>
        <p class="exam-review-rationale">This question no longer exists in the bank and cannot be reviewed.</p>
      </section>
    `;
  }

  if (response.selected.length) {
    return renderInlineExplanationPane(question, isCorrect);
  }

  const choices = Array.isArray(question.choices) ? question.choices : [];
  const correctIds = Array.isArray(question.correct) ? question.correct : [];
  const correctAnswerText = choices
    .filter((choice) => correctIds.includes(choice.id))
    .map((choice) => `${choice.id}. ${choice.text}`)
    .join(" | ");

  return `
    <section class="exam-feedback-block bad">
      <header class="exam-feedback-head">
        <h4>Your answer is incorrect (not submitted).</h4>
      </header>
      <p class="exam-review-rationale">${escapeHtml(question.explanation)}</p>
      <p class="exam-feedback-answer">The correct answer is: ${escapeHtml(correctAnswerText || correctIds.join(", "))}</p>
    </section>
  `;
}

function renderAnalytics() {
  const user = getCurrentUser();
  const availableCourses = getAvailableCoursesForUser(user);
  if (!availableCourses.length) {
    return `
      <section class="panel">
        <h2 class="title">Performance Analytics</h2>
        <p class="subtle">No courses are assigned to this account yet.</p>
      </section>
    `;
  }
  if (!availableCourses.includes(state.analyticsCourse)) {
    state.analyticsCourse = availableCourses[0];
  }

  const selectedCourse = state.analyticsCourse;
  const analytics = getStudentAnalyticsSnapshot(user.id, selectedCourse);
  const stats = analytics.stats;
  const topicStats = analytics.topicStats;
  const weak = analytics.weakAreas;
  const insights = analytics.insights;
  const syncStatusText = getStudentDataSyncStatusText();

  const rows = topicStats
    .map(
      (entry) => `
      <tr>
        <td>${escapeHtml(entry.topic)}</td>
        <td>${entry.correct}/${entry.total}</td>
        <td>${entry.accuracy}%</td>
      </tr>
    `,
    )
    .join("");

  return `
    <section class="panel">
      <h2 class="title">Performance Analytics</h2>
      <p class="subtle">Course trends and weak-area detection.</p>
      <div class="flex-between" style="gap: 0.8rem; align-items: flex-end; flex-wrap: wrap;">
        <form id="analytics-course-form" style="margin-top: 0.8rem; max-width: 520px;">
          <label>Course
            <select id="analytics-course-select" name="analyticsCourse">
              ${availableCourses
      .map((course) => `<option value="${escapeHtml(course)}" ${course === selectedCourse ? "selected" : ""}>${escapeHtml(course)}</option>`)
      .join("")}
            </select>
          </label>
        </form>
        <button class="btn ghost" type="button" data-action="refresh-student-analytics" ${state.studentDataRefreshing ? "disabled" : ""}>
          ${state.studentDataRefreshing ? "Refreshing..." : "Refresh analytics"}
        </button>
      </div>
      <small class="subtle">Showing analytics for <b>${escapeHtml(selectedCourse)}</b>. ${escapeHtml(syncStatusText)}</small>
      <div class="stats-grid" style="margin-top: 0.85rem;">
        <article class="card"><p class="metric">${stats.accuracy}%<small>Accuracy</small></p></article>
        <article class="card"><p class="metric">${stats.timePerQuestion}s<small>Time / question</small></p></article>
        <article class="card"><p class="metric">${stats.streak}<small>Current streak</small></p></article>
        <article class="card"><p class="metric">${stats.totalAnswered}<small>Total answered</small></p></article>
      </div>
    </section>

    <section class="panel grid-2">
      <article class="card">
        <h4>By Topic</h4>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Topic</th><th>Correct</th><th>Accuracy</th></tr></thead>
            <tbody>${rows || `<tr><td colspan="3">No data yet.</td></tr>`}</tbody>
          </table>
        </div>
      </article>
      <article class="card">
        <h4>Weak Areas</h4>
        ${weak.length
      ? weak
        .slice(0, 6)
        .map((entry) => `<p><b>${escapeHtml(entry.topic)}</b> - ${entry.accuracy}% (${entry.total} q) • ${entry.timePerQuestion || 0}s/q</p>`)
        .join("")
      : `<p class="subtle">No weak areas until you complete a block.</p>`
    }
      </article>
    </section>

    <section class="panel grid-2">
      <article class="card">
        <h4>Smart Study Coach</h4>
        <p><b>${escapeHtml(insights.summary)}</b></p>
        <p class="subtle">${escapeHtml(insights.focusMessage)}</p>
        <p class="subtle">${escapeHtml(insights.trendMessage)}</p>
        <p class="subtle">${escapeHtml(insights.paceMessage)}</p>
      </article>
      <article class="card">
        <h4>Recommended Next Block</h4>
        <p><b>Source:</b> ${escapeHtml(getCreateTestSourceLabel(insights.nextSource))}</p>
        <p><b>Target:</b> ${escapeHtml(insights.nextTargetText)}</p>
        <p><b>Suggested size:</b> ${insights.suggestedCount} questions</p>
        <p class="subtle">${escapeHtml(insights.nextReason)}</p>
        <button
          class="btn ghost admin-btn-sm"
          type="button"
          data-action="apply-analytics-plan"
          data-source="${escapeHtml(insights.nextSource)}"
          data-course="${escapeHtml(selectedCourse)}"
          data-topic="${escapeHtml(insights.focusTopic || "")}"
        >
          Apply Plan In Create Test
        </button>
      </article>
    </section>
  `;
}

function wireAnalytics() {
  const form = document.getElementById("analytics-course-form");
  form?.addEventListener("change", () => {
    const data = new FormData(form);
    state.analyticsCourse = String(data.get("analyticsCourse") || "").trim();
    render();
  });

  appEl.querySelector("[data-action='refresh-student-analytics']")?.addEventListener("click", async () => {
    await refreshStudentAnalyticsNow();
  });

  appEl.querySelector("[data-action='apply-analytics-plan']")?.addEventListener("click", () => {
    const user = getCurrentUser();
    const availableCourses = getAvailableCoursesForUser(user);
    const button = appEl.querySelector("[data-action='apply-analytics-plan']");
    const source = String(button?.getAttribute("data-source") || "").trim();
    const course = String(button?.getAttribute("data-course") || "").trim();
    const topic = String(button?.getAttribute("data-topic") || "").trim();
    if (["all", "unused", "incorrect", "flagged"].includes(source)) {
      state.createTestSource = source;
    }
    if (course && availableCourses.includes(course)) {
      state.qbankFilters.course = course;
    }
    state.qbankFilters.topicSource = "";
    state.qbankFilters.topics = topic ? [topic] : [];
    state.skipNextRouteAnimation = true;
    navigate("create-test");
  });
}

function renderProfile() {
  const user = getCurrentUser();
  const queue = load(STORAGE_KEYS.incorrectQueue, {})[user.id] || [];
  const isGoogleAuthUser = getAuthProviderFromUser(user) === "google";

  return `
    <section class="panel">
      <h2 class="title">Profile & Settings</h2>
      <p class="subtle">Manage account details and credentials.</p>
      <div class="grid-2" style="margin-top: 0.9rem;">
        <form id="profile-form" class="card">
          <h4>Account</h4>
          <label>Name <input name="name" value="${escapeHtml(user.name)}" required /></label>
          <label>
            Email
            <input
              name="email"
              type="email"
              value="${escapeHtml(user.email)}"
              ${isGoogleAuthUser ? "readonly aria-readonly=\"true\"" : ""}
              required
            />
          </label>
          ${isGoogleAuthUser
      ? `<p class="subtle" style="margin: -0.35rem 0 0;">Email is locked for Google sign-in accounts.</p>`
      : ""
    }
          <label>New password <input name="password" type="password" minlength="6" /></label>
          <button class="btn" type="submit">Save changes</button>
        </form>
        <article class="card">
          <h4>Study Queue</h4>
          <p><b>Incorrect queue size:</b> ${queue.length}</p>
          <p class="subtle">Use source = Incorrect when creating blocks to target weak items.</p>
          <hr />
          <p><b>Role:</b> ${escapeHtml(user.role)}</p>
          ${user.role === "student" ? `<p><b>Year/Semester:</b> ${normalizeAcademicYearOrNull(user.academicYear) ?? "-"} / ${normalizeAcademicSemesterOrNull(user.academicSemester) ?? "-"}</p>` : ""}
          <p><b>Phone:</b> ${escapeHtml(user.phone || "-")}</p>
          <p><b>Access approved:</b> ${isUserAccessApproved(user) ? "Yes" : "Pending admin approval"}</p>
          <p><b>Assigned courses:</b> ${escapeHtml((user.assignedCourses || []).join(", "))}</p>
          <p><b>Email verified:</b> ${user.verified ? "Yes" : "No"}</p>
        </article>
      </div>
    </section>
  `;
}

function wireProfile() {
  const form = document.getElementById("profile-form");
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const user = getCurrentUser();
    const users = getUsers();
    const data = new FormData(form);
    const isGoogleAuthUser = getAuthProviderFromUser(user) === "google";

    const name = String(data.get("name") || "").trim();
    const requestedEmail = String(data.get("email") || "").trim().toLowerCase();
    const email = isGoogleAuthUser ? String(user.email || "").trim().toLowerCase() : requestedEmail;
    const password = String(data.get("password") || "");

    if (!isGoogleAuthUser) {
      const emailConflict = users.some((entry) => entry.email.toLowerCase() === email && entry.id !== user.id);
      if (emailConflict) {
        toast("Email already used by another account.");
        return;
      }
    }

    const authClient = getSupabaseAuthClient();
    if (authClient && user.supabaseAuthId) {
      const updates = { data: { full_name: name } };
      if (!isGoogleAuthUser && email && email !== user.email) {
        updates.email = email;
      }
      if (password) {
        updates.password = password;
      }
      const { error } = await authClient.auth.updateUser(updates);
      if (error) {
        toast(error.message || "Could not update Supabase profile.");
        return;
      }
    }

    const index = users.findIndex((entry) => entry.id === user.id);
    users[index].name = name;
    users[index].email = email;
    if (password) {
      users[index].password = password;
    }

    save(STORAGE_KEYS.users, users);
    toast("Profile updated.");
    render();
  });
}

function normalizeAdminQuestionFilterToken(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function resolveAdminQuestionListView(questions, allCourses, preferredCourse = "", preferredTopic = "") {
  const questionList = Array.isArray(questions) ? questions : [];
  const configuredCourses = Array.isArray(allCourses) ? allCourses.filter(Boolean) : [];
  const questionCountByCourseKey = new Map();
  const topicsByCourseKeyFromQuestions = new Map();
  const courseDisplayByKey = new Map();

  questionList.forEach((question) => {
    const meta = getQbankCourseTopicMeta(question);
    const course = String(meta.course || "").trim();
    const topic = String(meta.topic || "").trim();
    const courseKey = normalizeAdminQuestionFilterToken(course);
    if (!courseKey) {
      return;
    }
    if (!courseDisplayByKey.has(courseKey)) {
      courseDisplayByKey.set(courseKey, course);
    }
    questionCountByCourseKey.set(courseKey, (questionCountByCourseKey.get(courseKey) || 0) + 1);

    if (!topic) {
      return;
    }
    const topicKey = normalizeAdminQuestionFilterToken(topic);
    if (!topicKey) {
      return;
    }
    if (!topicsByCourseKeyFromQuestions.has(courseKey)) {
      topicsByCourseKeyFromQuestions.set(courseKey, []);
    }
    const topicList = topicsByCourseKeyFromQuestions.get(courseKey);
    if (!topicList.some((entry) => normalizeAdminQuestionFilterToken(entry) === topicKey)) {
      topicList.push(topic);
    }
  });

  const questionCourses = [...courseDisplayByKey.values()];
  const availableCourses = [];
  const seenCourseKeys = new Set();
  [...configuredCourses, ...questionCourses].forEach((course) => {
    const courseName = String(course || "").trim();
    const courseKey = normalizeAdminQuestionFilterToken(courseName);
    if (!courseKey || seenCourseKeys.has(courseKey)) {
      return;
    }
    seenCourseKeys.add(courseKey);
    availableCourses.push(courseName);
  });

  const preferredCourseKey = normalizeAdminQuestionFilterToken(preferredCourse);
  let selectedCourse = availableCourses.find((course) => normalizeAdminQuestionFilterToken(course) === preferredCourseKey) || "";
  if (!selectedCourse) {
    selectedCourse = availableCourses.find(
      (course) => (questionCountByCourseKey.get(normalizeAdminQuestionFilterToken(course)) || 0) > 0,
    ) || availableCourses[0] || "";
  } else if ((questionCountByCourseKey.get(normalizeAdminQuestionFilterToken(selectedCourse)) || 0) === 0) {
    const fallbackCourse = availableCourses.find(
      (course) => (questionCountByCourseKey.get(normalizeAdminQuestionFilterToken(course)) || 0) > 0,
    );
    if (fallbackCourse) {
      selectedCourse = fallbackCourse;
    }
  }

  const selectedCourseKey = normalizeAdminQuestionFilterToken(selectedCourse);
  const configuredTopics = selectedCourse ? (QBANK_COURSE_TOPICS[selectedCourse] || []) : [];
  const questionTopics = selectedCourseKey ? (topicsByCourseKeyFromQuestions.get(selectedCourseKey) || []) : [];
  const selectedCourseTopics = mergeUniqueCourseTopics(selectedCourse, configuredTopics, questionTopics);
  const preferredTopicKey = normalizeAdminQuestionFilterToken(preferredTopic);
  const selectedTopic = selectedCourseTopics.find((topic) => normalizeAdminQuestionFilterToken(topic) === preferredTopicKey) || "";
  const selectedTopicKey = normalizeAdminQuestionFilterToken(selectedTopic);

  const filteredQuestions = questionList
    .filter((question) => {
      const meta = getQbankCourseTopicMeta(question);
      return normalizeAdminQuestionFilterToken(meta.course) === selectedCourseKey;
    })
    .filter((question) => {
      if (!selectedTopicKey) {
        return true;
      }
      const meta = getQbankCourseTopicMeta(question);
      return normalizeAdminQuestionFilterToken(meta.topic) === selectedTopicKey;
    });

  return {
    selectedCourse,
    selectedCourseTopics,
    selectedTopic,
    filteredQuestions,
  };
}

function resolveAdminImportView(allCourses, preferredCourse = "") {
  const configuredCourses = Array.isArray(allCourses) ? allCourses.filter(Boolean) : [];
  const fallbackCourse = configuredCourses.includes(preferredCourse) ? preferredCourse : (configuredCourses[0] || "");
  const importCourse = configuredCourses.includes(state.adminImportCourse)
    ? state.adminImportCourse
    : fallbackCourse;
  const importTopics = QBANK_COURSE_TOPICS[importCourse] || [];
  const importTopic = importTopics.includes(state.adminImportTopic)
    ? state.adminImportTopic
    : (importTopics[0] || "");
  return {
    importCourse,
    importTopics,
    importTopic,
    importReport: state.adminImportReport,
    importDraft: String(state.adminImportDraft || ""),
    importRunning: Boolean(state.adminImportRunning),
    importAsDraft: Boolean(state.adminImportAsDraft),
    importStatus: String(state.adminImportStatus || "").trim(),
    importStatusTone: ["success", "error", "warning"].includes(state.adminImportStatusTone)
      ? state.adminImportStatusTone
      : "neutral",
  };
}

function renderAdminBulkImportSection(allCourses, options = {}) {
  const preferredCourse = String(options.preferredCourse || "").trim();
  const {
    importCourse,
    importTopics,
    importTopic,
    importReport,
    importDraft,
    importRunning,
    importAsDraft,
    importStatus,
    importStatusTone,
  } = resolveAdminImportView(allCourses, preferredCourse);
  const importErrorPreview = (importReport?.errors || []).slice(0, 15);

  return `
    <section class="card admin-section" id="admin-bulk-import-section">
      <h3 style="margin: 0;">Bulk Import</h3>
      <p class="subtle">Upload or paste CSV/JSON and import questions by default course/topic.</p>
      <form id="admin-import-form" style="margin-top: 0.7rem;">
        <div class="form-row">
          <label>
            Default course
            <select name="defaultCourse" id="admin-import-course">
              ${allCourses
      .map((course) => `<option value="${escapeHtml(course)}" ${importCourse === course ? "selected" : ""}>${escapeHtml(course)}</option>`)
      .join("")}
            </select>
          </label>
          <label>
            Default topic
            <select name="defaultTopic" id="admin-import-topic">
              ${importTopics
      .map((topic) => `<option value="${escapeHtml(topic)}" ${importTopic === topic ? "selected" : ""}>${escapeHtml(topic)}</option>`)
      .join("")}
            </select>
          </label>
        </div>
        <label class="admin-course-check" style="width: fit-content;">
          <input type="checkbox" name="importAsDraft" ${importAsDraft ? "checked" : ""} />
          <span>Save all imported questions as draft (hide from students)</span>
        </label>
        <label>Upload file(s)
          <input type="file" id="admin-import-file" accept=".csv,.json,text/csv,application/json" multiple />
        </label>
        <label>Paste CSV rows or JSON array
          <textarea id="admin-import-text" name="importText" placeholder='CSV headers example: stem,choiceA,choiceB,choiceC,choiceD,choiceE,correct,explanation,course,topic,system,difficulty,status,tags,questionImage,explanationImage'>${escapeHtml(importDraft)}</textarea>
        </label>
        <div class="stack">
          <button class="btn ${importRunning ? "is-loading" : ""}" type="submit" ${importRunning ? "disabled" : ""}>
            ${importRunning ? `<span class="inline-loader" aria-hidden="true"></span><span>Importing questions...</span>` : "Run bulk import"}
          </button>
          <button class="btn ghost ${importRunning ? "is-loading" : ""}" type="button" id="admin-sync-questions-now" ${importRunning ? "disabled" : ""}>
            ${importRunning ? `<span class="inline-loader" aria-hidden="true"></span><span>Syncing cloud data...</span>` : "Sync existing questions to cloud"}
          </button>
          <button class="btn ghost" type="button" id="admin-download-template">Download Excel template (.csv)</button>
        </div>
      </form>
      ${importStatus
      ? `<p class="subtle import-status is-${importStatusTone}" aria-live="polite">${escapeHtml(importStatus)}</p>`
      : ""
    }
      ${importReport
      ? `
            <div class="admin-import-report card" style="margin-top: 0.7rem;">
              <p style="margin: 0;"><b>Last import:</b> ${new Date(importReport.createdAt).toLocaleString()}</p>
              <p class="subtle">Imported ${importReport.added}/${importReport.total} rows. ${importReport.errors.length} error(s).</p>
              ${importErrorPreview.length
        ? `
                    <ol class="admin-import-error-list">
                      ${importErrorPreview.map((error) => `<li>${escapeHtml(error)}</li>`).join("")}
                    </ol>
                    <small class="subtle">Showing first ${importErrorPreview.length} errors.</small>
                  `
        : `<p class="subtle">No errors in last import.</p>`
      }
              <div class="stack">
                <button class="btn ghost admin-btn-sm" type="button" id="admin-download-import-errors" ${importReport.errors.length ? "" : "disabled"}>Download full error report</button>
                <button class="btn ghost admin-btn-sm" type="button" id="admin-clear-import-report">Clear report</button>
              </div>
            </div>
          `
      : ""
    }
    </section>
  `;
}

function renderAdmin() {
  const user = getCurrentUser();
  if (!user || user.role !== "admin") {
    return `<section class="panel"><p>Access denied.</p></section>`;
  }
  const activeAdminPage = ["dashboard", "users", "courses", "questions", "bulk-import", "notifications", "site-access", "activity", "logs"].includes(state.adminPage)
    ? state.adminPage
    : "dashboard";
  if (activeAdminPage === "users" || activeAdminPage === "courses" || activeAdminPage === "notifications") {
    syncUsersWithCurriculum();
  }

  const allCourses = Object.keys(QBANK_COURSE_TOPICS);
  let pageContent = "";
  let adminGlobalOverlay = "";

  if (activeAdminPage === "dashboard") {
    const users = getUsers();
    let students = 0;
    let admins = 0;
    const academicYearCounts = new Map([
      [1, 0],
      [2, 0],
      [3, 0],
      [4, 0],
      [5, 0],
    ]);
    users.forEach((account) => {
      if (account.role === "admin") {
        admins += 1;
      } else if (account.role === "student") {
        students += 1;
        const academicYear = normalizeAcademicYearOrNull(account.academicYear);
        if (academicYear !== null) {
          academicYearCounts.set(academicYear, (academicYearCounts.get(academicYear) || 0) + 1);
        }
      }
    });
    const userStats = buildAdminUserStatistics(users);
    const registrationYearRows = userStats.registrationByYear
      .map((entry) => {
        const count = Number(entry?.count) || 0;
        const share = users.length ? Math.round((count / users.length) * 100) : 0;
        const width = userStats.maxRegistrationYearCount
          ? Math.max((count / userStats.maxRegistrationYearCount) * 100, count ? 8 : 0)
          : 0;
        return `
          <div class="admin-dashboard-breakdown-row" role="listitem">
            <div class="admin-dashboard-breakdown-head">
              <span class="admin-dashboard-breakdown-label">${entry.year}</span>
              <span class="admin-dashboard-breakdown-value">${count} user${count === 1 ? "" : "s"} · ${share}%</span>
            </div>
            <span class="admin-dashboard-breakdown-track" aria-hidden="true">
              <span class="admin-dashboard-breakdown-fill" style="width: ${width.toFixed(1)}%;"></span>
            </span>
          </div>
        `;
      })
      .join("");
    const providerRows = userStats.providerBreakdown
      .map((entry) => {
        const count = Number(entry?.count) || 0;
        const share = users.length ? Math.round((count / users.length) * 100) : 0;
        const width = userStats.maxProviderCount
          ? Math.max((count / userStats.maxProviderCount) * 100, count ? 8 : 0)
          : 0;
        return `
          <div class="admin-dashboard-breakdown-row" role="listitem">
            <div class="admin-dashboard-breakdown-head">
              <span class="admin-dashboard-breakdown-label">${escapeHtml(entry.label)}</span>
              <span class="admin-dashboard-breakdown-value">${count} user${count === 1 ? "" : "s"} · ${share}%</span>
            </div>
            <span class="admin-dashboard-breakdown-track" aria-hidden="true">
              <span class="admin-dashboard-breakdown-fill" style="width: ${width.toFixed(1)}%;"></span>
            </span>
          </div>
        `;
      })
      .join("");
    const dashboardUserCards = [
      {
        value: users.length,
        label: "Total users",
        detail: `${students} students • ${admins} admins`,
      },
      {
        value: admins,
        label: "Admins",
        detail: `${users.length - admins} non-admin users`,
      },
      ...[5, 4, 3, 2, 1].map((year) => ({
        value: academicYearCounts.get(year) || 0,
        label: `Year ${year}`,
        detail: `Students assigned to Year ${year}`,
      })),
    ]
      .map((card) => `
        <article class="card">
          <p class="metric">
            ${card.value}
            <small>${card.label}</small>
            <small>${card.detail}</small>
          </p>
        </article>
      `)
      .join("");

    pageContent = `
      <section class="card admin-section" id="admin-stats-section">
        <h2 class="title">O6U Admin Dashboard</h2>
        <p class="subtle">User totals first, with admin counts and academic year distribution summarized underneath.</p>
        <div class="stats-grid" style="margin-top: 0.85rem;">
          ${dashboardUserCards}
        </div>
        <div class="admin-dashboard-breakdowns">
          <article class="card admin-dashboard-breakdown-card">
            <h3>Users by Registration Year</h3>
            <p class="subtle">Calendar year from each account's registration date.</p>
            ${registrationYearRows
        ? `<div class="admin-dashboard-breakdown-list" role="list">${registrationYearRows}</div>`
        : `<p class="subtle">No registration timestamps found yet.</p>`
      }
          </article>
          <article class="card admin-dashboard-breakdown-card">
            <h3>Auth Provider Mix</h3>
            <p class="subtle">Google vs email plus any other connected providers.</p>
            ${providerRows
        ? `<div class="admin-dashboard-breakdown-list" role="list">${providerRows}</div>`
        : `<p class="subtle">No auth provider data available yet.</p>`
      }
          </article>
        </div>
      </section>
    `;
  }

  if (activeAdminPage === "users") {
    const users = getUsers().sort((a, b) => {
      const createdDiff = getUserCreatedAtMs(b) - getUserCreatedAtMs(a);
      if (createdDiff !== 0) {
        return createdDiff;
      }
      return String(a.name || "").localeCompare(String(b.name || ""));
    });
    const userSearchQuery = String(state.adminUserSearch || "");
    const userFilterYear = normalizeAcademicYearOrNull(state.adminUserFilterYear);
    const userFilterSemester = normalizeAcademicSemesterOrNull(state.adminUserFilterSemester);
    const filteredUsers = users.filter((account) => matchesAdminUserFilters(account, {
      search: userSearchQuery,
      year: userFilterYear,
      semester: userFilterSemester,
    }));
    const visibleSelectableUserIds = filteredUsers
      .filter((account) => canBulkSelectAdminUser(account, user))
      .map((account) => String(account.id || "").trim())
      .filter(Boolean);
    const visibleSelectableUserIdSet = new Set(visibleSelectableUserIds);
    const normalizedSelectedUserIds = normalizeAdminUserIdList(state.adminSelectedUserIds, visibleSelectableUserIdSet);
    const selectionChanged =
      normalizedSelectedUserIds.length !== (Array.isArray(state.adminSelectedUserIds) ? state.adminSelectedUserIds.length : 0)
      || normalizedSelectedUserIds.some((id, idx) => id !== state.adminSelectedUserIds[idx]);
    if (selectionChanged) {
      state.adminSelectedUserIds = normalizedSelectedUserIds;
    }
    const selectedUserSet = new Set(normalizedSelectedUserIds);
    const selectedUserCount = normalizedSelectedUserIds.length;
    const allVisibleSelected = Boolean(visibleSelectableUserIds.length) && selectedUserCount === visibleSelectableUserIds.length;
    const partiallyVisibleSelected = selectedUserCount > 0 && !allVisibleSelected;
    const bulkDeactivateRunning = Boolean(state.adminUserBulkActionRunning);
    const resetUserFiltersDisabled = !String(userSearchQuery || "").trim() && userFilterYear === null && userFilterSemester === null;
    const autoApprovalEnabled = isAutoApproveStudentAccessEnabled();
    const pendingCount = users.filter((entry) => entry.role === "student" && !isUserAccessApproved(entry)).length;
    const accountRows = filteredUsers
      .map((account) => {
        const accountId = String(account.id || "").trim();
        const year = account.role === "student" ? normalizeAcademicYearOrNull(account.academicYear) : null;
        const semester = account.role === "student" ? normalizeAcademicSemesterOrNull(account.academicSemester) : null;
        const isApproved = isUserAccessApproved(account);
        const isGoogleAuthUser = getAuthProviderFromUser(account) === "google";
        const resetPasswordAction = isGoogleAuthUser
          ? ""
          : '<button class="btn ghost admin-btn-sm" data-action="reset-user-password">Set password</button>';
        const visibleCourses =
          account.role === "student"
            ? year && semester
              ? getCurriculumCourses(year, semester)
              : sanitizeCourseAssignments(account.assignedCourses || [])
            : sanitizeCourseAssignments(account.assignedCourses || allCourses);
        const compactCourses = visibleCourses.slice(0, 2).map((course) => (course.length > 42 ? `${course.slice(0, 39)}...` : course));
        const coursePreview =
          visibleCourses.length > 2 ? `${compactCourses.join(", ")} +${visibleCourses.length - 2} more` : compactCourses.join(", ");
        const isSelf = account.id === user.id;
        const isLockedAdmin = isForcedAdminEmail(account.email);
        const canBulkSelect = canBulkSelectAdminUser(account, user);
        const isSelected = accountId ? selectedUserSet.has(accountId) : false;
        const rowClassNames = [];
        if (isSelected) {
          rowClassNames.push("is-selected");
        }
        const selectionDisabledReason = !canBulkSelect
          ? (isSelf ? "You cannot suspend your own account." : "Admin accounts cannot be suspended.")
          : "";
        const authProviderIcon = isGoogleAuthUser
          ? '<span class="admin-auth-provider-icon" data-provider="google" title="Google account" aria-label="Google account" role="img"><svg viewBox="0 0 18 18" aria-hidden="true" focusable="false"><path fill="#4285F4" d="M17.64 9.2045c0-.638-.0573-1.2518-.1636-1.8409H9v3.4818h4.8436c-.2086 1.125-.8427 2.0782-1.7963 2.7155v2.2573h2.9082c1.7018-1.5664 2.6845-3.8741 2.6845-6.6137z"></path><path fill="#34A853" d="M9 18c2.43 0 4.4673-.8064 5.9564-2.1818l-2.9082-2.2573c-.8063.54-1.8377.8591-3.0482.8591-2.3441 0-4.3282-1.5832-5.0355-3.71H.9573v2.3305C2.4382 15.9832 5.4818 18 9 18z"></path><path fill="#FBBC05" d="M3.9645 10.71c-.18-.54-.2823-1.1168-.2823-1.71s.1023-1.17.2823-1.71V4.9595H.9573C.3477 6.1732 0 7.5477 0 9s.3477 2.8268.9573 4.0405L3.9645 10.71z"></path><path fill="#EA4335" d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.3459l2.5814-2.5814C13.4636.8918 11.43 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9595L3.9645 7.29C4.6718 5.1632 6.6559 3.5795 9 3.5795z"></path></svg></span>'
          : "";
        return `
          <tr data-user-id="${escapeHtml(account.id)}" class="${rowClassNames.join(" ")}">
            <td class="admin-user-select-cell">
              <input
                type="checkbox"
                data-action="admin-select-user"
                data-user-id="${escapeHtml(accountId)}"
                aria-label="Select ${escapeHtml(String(account.name || account.email || "user"))}"
                ${isSelected ? "checked" : ""}
                ${bulkDeactivateRunning || !canBulkSelect ? "disabled" : ""}
                ${selectionDisabledReason ? `title="${escapeHtml(selectionDisabledReason)}"` : ""}
              />
            </td>
            <td class="admin-user-account">
              <b>${escapeHtml(account.name)}</b><br />
              <small class="admin-account-email">
                <span>${escapeHtml(account.email)}</span>
                ${authProviderIcon}
              </small><br />
              <small>${escapeHtml(account.phone || "No phone")}</small><br />
              <small><span class="badge ${isApproved ? "good" : "bad"}">${isApproved ? "approved" : "pending"}</span></small>
            </td>
            <td><span class="badge ${account.role === "admin" ? "good" : "neutral"}">${escapeHtml(account.role)}</span></td>
            <td>
              ${account.role === "student"
            ? `<select class="admin-mini-select" data-field="academicYear">
                       <option value="" ${year === null ? "selected" : ""}>Select year</option>
                       ${[1, 2, 3, 4, 5]
              .map((entry) => `<option value="${entry}" ${year === entry ? "selected" : ""}>Year ${entry}</option>`)
              .join("")}
                     </select>`
            : `<span class="admin-na">-</span>`
          }
            </td>
            <td>
              ${account.role === "student"
            ? `<select class="admin-mini-select" data-field="academicSemester">
                       <option value="" ${semester === null ? "selected" : ""}>Select semester</option>
                       <option value="1" ${semester === 1 ? "selected" : ""}>Semester 1</option>
                       <option value="2" ${semester === 2 ? "selected" : ""}>Semester 2</option>
                     </select>`
            : `<span class="admin-na">-</span>`
          }
            </td>
            <td class="admin-user-courses">
              <small class="admin-course-preview" title="${escapeHtml(visibleCourses.join(", "))}">${escapeHtml(coursePreview || "No courses assigned")}</small>
            </td>
            <td class="admin-user-actions-cell">
              <div class="admin-user-actions">
                <button class="btn ghost admin-btn-sm" data-action="save-user-enrollment">Save enrollment</button>
                ${resetPasswordAction}
                <button class="btn ghost admin-btn-sm" data-action="toggle-user-approval" ${account.role === "admin" ? "disabled" : ""}>
                  ${isApproved ? "Suspend" : "Approve"}
                </button>
                <button class="btn ghost admin-btn-sm" data-action="toggle-user-role" ${isSelf || isLockedAdmin ? "disabled" : ""}>
                  ${account.role === "admin" ? "Make student" : "Make admin"}
                </button>
                <button class="btn danger admin-btn-sm" data-action="remove-user" ${isSelf ? "disabled" : ""}>Remove</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");

    pageContent = `
      <section class="card admin-section" id="admin-users-section">
        <div class="flex-between" style="gap: 1rem;">
          <div>
            <h3 style="margin: 0;">Users</h3>
            <p class="subtle">Add users, assign year/semester, change roles, and manage account access.</p>
          </div>
          <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 0.6rem;">
            <div style="display: flex; align-items: center; gap: 0.7rem; flex-wrap: wrap; justify-content: flex-end;">
              <span class="badge ${pendingCount ? 'bad' : 'good'}" style="font-size: 0.8rem; padding: 0.3rem 0.7rem;">Pending: <b>${pendingCount}</b></span>
              <button class="btn" type="button" data-action="approve-all-pending" ${pendingCount ? "" : "disabled"}>Approve all pending</button>
            </div>
            <label class="toggle-switch-label" style="margin: 0;">
              <input id="admin-auto-approval-toggle" type="checkbox" class="toggle-switch-input" ${autoApprovalEnabled ? "checked" : ""} />
              <span class="toggle-switch-track" aria-hidden="true">
                <span class="toggle-switch-thumb"></span>
              </span>
              <span class="toggle-switch-text subtle">Auto-approve new complete student accounts</span>
            </label>
          </div>
        </div>
        <details id="admin-add-user-disclosure" class="admin-user-create-panel" style="margin-top: 0.85rem;" ${state.adminAddUserPanelOpen ? "open" : ""}>
          <summary class="admin-user-create-toggle">
            <span class="admin-user-create-toggle-main">
              <span class="admin-user-create-chevron" aria-hidden="true"></span>
              <span class="admin-user-create-toggle-copy">
                <b>Add new user</b>
                <small>Create a student or admin account only when needed.</small>
              </span>
            </span>
          </summary>
          <div class="admin-user-create-panel-body">
            <form id="admin-add-user-form">
              <div class="form-row">
                <label>Full name <input name="name" required /></label>
                <label>Email <input type="email" name="email" required /></label>
              </div>
              <div class="form-row">
                <label>Password <input type="password" name="password" minlength="6" required /></label>
                <label>Role
                  <select name="role">
                    <option value="student">Student</option>
                    <option value="admin">Admin</option>
                  </select>
                </label>
              </div>
              <div class="form-row">
                <label>Year
                  <select name="academicYear">
                    <option value="1">Year 1</option>
                    <option value="2">Year 2</option>
                    <option value="3">Year 3</option>
                    <option value="4">Year 4</option>
                    <option value="5">Year 5</option>
                  </select>
                </label>
                <label>Semester
                  <select name="academicSemester">
                    <option value="1">Semester 1</option>
                    <option value="2">Semester 2</option>
                  </select>
                </label>
              </div>
              <div class="stack">
                <button class="btn" type="submit">Add user</button>
              </div>
            </form>
          </div>
        </details>

        <form id="admin-user-filter-form" class="admin-users-filter-form" style="margin-top: 0.95rem;">
          <div class="form-row">
            <label class="admin-user-search-field">Search user
              <input
                id="admin-user-search"
                type="search"
                value="${escapeHtml(userSearchQuery)}"
                placeholder="Name, email, phone, year, or semester"
              />
            </label>
            <label>Year
              <select id="admin-user-filter-year" name="academicYear">
                <option value="" ${userFilterYear === null ? "selected" : ""}>All years</option>
                ${[1, 2, 3, 4, 5]
        .map((entry) => `<option value="${entry}" ${userFilterYear === entry ? "selected" : ""}>Year ${entry}</option>`)
        .join("")}
              </select>
            </label>
            <label>Semester
              <select id="admin-user-filter-semester" name="academicSemester">
                <option value="" ${userFilterSemester === null ? "selected" : ""}>All semesters</option>
                <option value="1" ${userFilterSemester === 1 ? "selected" : ""}>Semester 1</option>
                <option value="2" ${userFilterSemester === 2 ? "selected" : ""}>Semester 2</option>
              </select>
            </label>
          </div>
          <div class="stack">
            <button class="btn ghost admin-btn-sm" type="button" data-action="admin-users-clear-filters" ${resetUserFiltersDisabled ? "disabled" : ""}>Reset filters</button>
          </div>
        </form>

        <div class="admin-question-bulk-bar admin-users-bulk-bar" style="margin-top: 0.74rem;">
          <label class="admin-question-select-all">
            <input
              type="checkbox"
              data-action="admin-select-all-users"
              aria-label="Select all users in this filtered list"
              data-indeterminate="${partiallyVisibleSelected ? "true" : "false"}"
              ${allVisibleSelected ? "checked" : ""}
              ${bulkDeactivateRunning || !visibleSelectableUserIds.length ? "disabled" : ""}
            />
            <span>Select all in this view</span>
          </label>
          <p class="admin-question-selection-count">Selected: <b>${selectedUserCount}</b> • Showing <b>${filteredUsers.length}</b> of ${users.length}</p>
          <div class="stack">
            <button class="btn danger admin-btn-sm ${bulkDeactivateRunning ? "is-loading" : ""}" type="button" data-action="admin-bulk-deactivate-users" ${bulkDeactivateRunning || !selectedUserCount ? "disabled" : ""}>
              ${bulkDeactivateRunning ? `<span class="inline-loader" aria-hidden="true"></span><span>Suspending...</span>` : "Suspend selected"}
            </button>
            <button class="btn ghost admin-btn-sm" type="button" data-action="admin-clear-user-selection" ${bulkDeactivateRunning || !selectedUserCount ? "disabled" : ""}>Clear selection</button>
          </div>
        </div>

        <div class="table-wrap admin-users-table-wrap" style="margin-top: 0.9rem;">
          <table class="admin-users-table">
            <colgroup>
              <col class="col-select" />
              <col class="col-account" />
              <col class="col-role" />
              <col class="col-year" />
              <col class="col-semester" />
              <col class="col-courses" />
              <col class="col-actions" />
            </colgroup>
            <thead>
              <tr>
                <th class="admin-user-select-cell">Select</th>
                <th>Account</th>
                <th>Role</th>
                <th>Year</th>
                <th>Semester</th>
                <th>Courses</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>${accountRows || `<tr><td colspan="7" class="subtle">No users match the current search, year, and semester filters.</td></tr>`}</tbody>
          </table>
        </div>
      </section>
    `;
  }

  if (activeAdminPage === "courses") {
    const questions = getQuestions();
    const curriculumYear = sanitizeAcademicYear(state.adminCurriculumYear || 1);
    const curriculumSemester = sanitizeAcademicSemester(state.adminCurriculumSemester || 1);
    const selectedSemesterCourses = O6U_CURRICULUM[curriculumYear]?.[curriculumSemester] || [];
    if (state.adminCourseTopicModalCourse && !selectedSemesterCourses.includes(state.adminCourseTopicModalCourse)) {
      state.adminCourseTopicModalCourse = "";
      state.adminCourseTopicGroupCreateModalOpen = false;
      state.adminCourseTopicInlineCreateOpen = false;
    }
    const notebookLinksByCourse = COURSE_NOTEBOOK_LINKS;
    const courseSearchQuery = String(state.adminCourseSearch || "").trim();
    const normalizedCourseSearch = courseSearchQuery.toLowerCase();
    const questionsRevision = Number(state.questionsRevision || 0);
    let questionCountByCourse = state.adminCourseQuestionCountCache;
    if (!questionCountByCourse || state.adminCourseQuestionCountCacheRevision !== questionsRevision) {
      questionCountByCourse = questions.reduce((acc, question) => {
        const mappedCourse = getQbankCourseTopicMeta(question).course;
        if (!mappedCourse) {
          return acc;
        }
        acc[mappedCourse] = (acc[mappedCourse] || 0) + 1;
        return acc;
      }, {});
      state.adminCourseQuestionCountCache = questionCountByCourse;
      state.adminCourseQuestionCountCacheRevision = questionsRevision;
    }
    const topicCountByCourse = Object.fromEntries(
      selectedSemesterCourses.map((course) => [course, (QBANK_COURSE_TOPICS[course] || []).length]),
    );
    const filteredCourseEntries = selectedSemesterCourses
      .map((course, idx) => ({ course, idx }))
      .filter(({ course }) => !normalizedCourseSearch || String(course || "").trim().toLowerCase().includes(normalizedCourseSearch));
    const preferredFocusedCourse = filteredCourseEntries.some(({ course }) => course === state.adminCourseFocus)
      ? state.adminCourseFocus
      : (filteredCourseEntries[0]?.course || "");
    if (state.adminCourseFocus !== preferredFocusedCourse) {
      state.adminCourseFocus = preferredFocusedCourse;
    }
    const focusedCourseEntry = selectedSemesterCourses
      .map((course, idx) => ({ course, idx }))
      .find(({ course }) => course === state.adminCourseTopicModalCourse)
      || filteredCourseEntries.find(({ course }) => course === preferredFocusedCourse)
      || null;
    const focusedCourse = focusedCourseEntry?.course || "";
    const focusedCourseIndex = Number.isFinite(focusedCourseEntry?.idx) ? focusedCourseEntry.idx : -1;
    const focusedQuestionCount = focusedCourse ? (questionCountByCourse[focusedCourse] || 0) : 0;
    const focusedTopicCount = focusedCourse ? (topicCountByCourse[focusedCourse] || 0) : 0;
    const courseCards = filteredCourseEntries
      .map(({ course, idx }) => {
        const topicCount = topicCountByCourse[course] || 0;
        const questionCount = questionCountByCourse[course] || 0;
        const isActive = state.adminCourseTopicModalCourse === course;
        return `
          <button
            class="admin-course-picker-card${isActive ? " is-active" : ""}"
            type="button"
            data-action="admin-focus-course"
            data-course-index="${idx}"
            aria-pressed="${isActive ? "true" : "false"}"
          >
            <div class="admin-course-picker-card-head">
              <b class="admin-course-picker-card-title">${escapeHtml(course)}</b>
              <span class="admin-course-picker-card-status">${isActive ? "Opened" : "Open"}</span>
            </div>
            <p class="admin-course-picker-card-copy">
              <span>${topicCount} topics</span>
              <span>${questionCount} questions</span>
            </p>
          </button>
        `;
      })
      .join("");
    const focusedCourseWorkspace = focusedCourse
      ? `
          <section class="admin-course-workspace" data-course-index="${focusedCourseIndex}">
            <div class="admin-course-workspace-hero">
              <div class="admin-course-workspace-hero-main">
                <label class="admin-course-card-name-field admin-course-card-name-field-head">
                  <span>Course name</span>
                  <div class="admin-course-card-name-inline">
                    <input data-field="curriculumCourseName" value="${escapeHtml(focusedCourse)}" />
                    <button class="btn admin-btn-sm" type="button" data-action="curriculum-rename">Save name</button>
                  </div>
                </label>
                <div class="admin-course-workspace-hero-actions">
                  <div class="admin-course-workspace-meta">
                    <span class="admin-course-meta-pill"><b>${focusedTopicCount}</b><small>Topics</small></span>
                    <span class="admin-course-meta-pill"><b>${focusedQuestionCount}</b><small>Questions</small></span>
                  </div>
                </div>
              </div>
            </div>

            <div class="admin-course-workspace-layout">
              <section class="admin-course-workspace-panel admin-course-workspace-panel-main">
                ${renderAdminCourseTopicControls(focusedCourse)}
              </section>

              <div class="admin-course-workspace-sidebar">
                <section class="admin-course-workspace-panel">
                  <div class="admin-course-workspace-panel-head">
                    <div>
                      <h4 style="margin: 0;">Course tools</h4>
                      <p class="subtle" style="margin: 0.22rem 0 0;">Notebook link and course-wide actions.</p>
                    </div>
                  </div>

                  <label class="admin-course-tool-field">Ask AI / Notebook link
                    <div class="admin-course-notebook-link admin-course-notebook-link-inline">
                      <input
                        data-field="courseNotebookLink"
                        value="${escapeHtml(notebookLinksByCourse[focusedCourse] || "")}"
                        placeholder="https://notebooklm.google.com/..."
                      />
                      <button class="btn ghost admin-btn-sm" type="button" data-action="course-notebook-link-save">Save</button>
                    </div>
                  </label>
                </section>

                <section class="admin-course-workspace-panel admin-course-workspace-panel-danger">
                  <div class="admin-course-workspace-panel-head">
                    <div>
                      <h4 style="margin: 0;">Danger zone</h4>
                      <p class="subtle" style="margin: 0.22rem 0 0;">These actions are destructive and cannot be undone.</p>
                    </div>
                  </div>

                  <div class="admin-course-tool-group admin-course-tool-group-danger">
                    <p class="admin-course-qbank-count">
                      <b>${focusedQuestionCount}</b> question${focusedQuestionCount === 1 ? "" : "s"} in this course
                    </p>
                    <div class="admin-course-qbank-actions">
                      <button class="btn danger admin-btn-sm" type="button" data-action="course-question-clear" ${focusedQuestionCount ? "" : "disabled"}>Delete all questions</button>
                      <button class="btn danger admin-btn-sm" type="button" data-action="course-topic-clear">Delete all topics</button>
                    </div>
                  </div>

                  <div class="admin-course-danger-footer">
                    <button class="btn danger admin-course-danger-primary" type="button" data-action="curriculum-delete">Delete course permanently</button>
                  </div>
                </section>
              </div>
            </div>

          </section>
        `
      : "";

    pageContent = `
      <section class="card admin-section" id="admin-courses-section">
        <div class="admin-courses-minimal-head">
          <div>
            <h3 style="margin: 0;">Courses</h3>
            <p class="subtle" style="margin: 0.22rem 0 0;">Year ${curriculumYear} • Semester ${curriculumSemester}</p>
          </div>
          <form id="admin-curriculum-add-form" class="admin-courses-head-add-form">
            <label class="admin-courses-head-add-label">Add new course
              <input name="newCourseName" placeholder="e.g., New Clinical Module (NCM 999)" required />
            </label>
            <button class="btn" type="submit">Add new course</button>
          </form>
        </div>

        <div class="admin-courses-minimal-controls" style="margin-top: 0.8rem;">
              <form id="admin-curriculum-filter-form" class="admin-course-toolbar-card">
                <div class="form-row">
                  <label>Year
                    <select name="curriculumYear">
                      <option value="1" ${curriculumYear === 1 ? "selected" : ""}>Year 1</option>
                      <option value="2" ${curriculumYear === 2 ? "selected" : ""}>Year 2</option>
                      <option value="3" ${curriculumYear === 3 ? "selected" : ""}>Year 3</option>
                      <option value="4" ${curriculumYear === 4 ? "selected" : ""}>Year 4</option>
                      <option value="5" ${curriculumYear === 5 ? "selected" : ""}>Year 5</option>
                    </select>
                  </label>
                  <label>Semester
                    <select name="curriculumSemester">
                      <option value="1" ${curriculumSemester === 1 ? "selected" : ""}>Semester 1</option>
                      <option value="2" ${curriculumSemester === 2 ? "selected" : ""}>Semester 2</option>
                    </select>
                  </label>
                  <label class="admin-course-search-field">Search course
                    <input id="admin-curriculum-search" type="search" value="${escapeHtml(courseSearchQuery)}" placeholder="Filter by course name..." />
                  </label>
                </div>
              </form>
            </div>

            <div class="admin-course-grid" style="margin-top: 0.95rem;">
              ${courseCards || `
                <div class="admin-course-empty-state">
                  <h4 style="margin: 0;">No matching courses</h4>
                  <p class="subtle" style="margin: 0;">Try a different search term or switch the year/semester filter.</p>
                </div>
              `}
            </div>
      </section>
    `;

    adminGlobalOverlay = focusedCourseWorkspace && state.adminCourseTopicModalCourse
      ? `
          <div class="admin-course-topic-modal admin-course-details-modal">
            <button class="admin-course-topic-modal-backdrop" type="button" data-action="course-topic-manager-close" aria-label="Close course details"></button>
            <section class="admin-course-topic-modal-card admin-course-details-modal-card" role="dialog" aria-modal="true" aria-label="Course details">
              <div class="flex-between admin-course-topic-modal-head">
                <div>
                  <h3 style="margin: 0;">Course details</h3>
                  <p class="subtle" style="margin: 0.22rem 0 0;">Manage topics, links, and question actions.</p>
                </div>
                <div class="admin-course-topic-modal-head-actions">
                  <button class="btn ghost admin-btn-sm" type="button" data-action="course-question-edit" data-course-index="${focusedCourseIndex}">Open question bank</button>
                  <button class="btn ghost admin-btn-sm" type="button" data-action="course-topic-manager-close">Close</button>
                </div>
              </div>
              <div class="admin-course-topic-modal-body">
                ${focusedCourseWorkspace}
              </div>
            </section>
          </div>
        `
      : "";
  }

  if (activeAdminPage === "questions") {
    const questions = getQuestions();
    const questionSaveRunning = Boolean(state.adminQuestionSaveRunning);
    let questionDeleteQid = String(state.adminQuestionDeleteQid || "").trim();
    if (questionDeleteQid && !questions.some((entry) => String(entry?.id || "").trim() === questionDeleteQid)) {
      questionDeleteQid = "";
      state.adminQuestionDeleteQid = "";
    }
    const bulkActionType = String(state.adminBulkActionType || "").trim();
    const bulkActionRunning = Boolean(state.adminBulkActionRunning && ["draft", "publish", "delete"].includes(bulkActionType));
    if (!bulkActionRunning && state.adminBulkActionRunning) {
      state.adminBulkActionRunning = false;
    }
    const questionView = resolveAdminQuestionListView(
      questions,
      allCourses,
      String(state.adminFilters.course || ""),
      String(state.adminFilters.topic || ""),
    );
    const selectedCourse = questionView.selectedCourse;
    const selectedCourseTopics = questionView.selectedCourseTopics;
    const selectedTopic = questionView.selectedTopic;
    if (state.adminFilters.course !== selectedCourse || state.adminFilters.topic !== selectedTopic) {
      state.adminFilters.course = selectedCourse;
      state.adminFilters.topic = selectedTopic;
    }
    const questionOpsLocked = questionSaveRunning || Boolean(questionDeleteQid) || bulkActionRunning;
    const courseQuestions = questionView.filteredQuestions;
    const visibleQuestionIds = courseQuestions
      .map((question) => String(question.id || "").trim())
      .filter(Boolean);
    const visibleQuestionIdSet = new Set(visibleQuestionIds);
    const normalizedSelectedQuestionIds = [...new Set(
      (Array.isArray(state.adminSelectedQuestionIds) ? state.adminSelectedQuestionIds : [])
        .map((id) => String(id || "").trim())
        .filter((id) => visibleQuestionIdSet.has(id)),
    )];
    const selectionChanged =
      normalizedSelectedQuestionIds.length !== (Array.isArray(state.adminSelectedQuestionIds) ? state.adminSelectedQuestionIds.length : 0)
      || normalizedSelectedQuestionIds.some((id, idx) => id !== state.adminSelectedQuestionIds[idx]);
    if (selectionChanged) {
      state.adminSelectedQuestionIds = normalizedSelectedQuestionIds;
    }
    const selectedQuestionSet = new Set(normalizedSelectedQuestionIds);
    const selectedQuestionCount = normalizedSelectedQuestionIds.length;
    const allVisibleSelected = Boolean(visibleQuestionIds.length) && selectedQuestionCount === visibleQuestionIds.length;
    const partiallyVisibleSelected = selectedQuestionCount > 0 && !allVisibleSelected;
    const isBulkDrafting = bulkActionRunning && bulkActionType === "draft";
    const isBulkPublishing = bulkActionRunning && bulkActionType === "publish";
    const isBulkDeleting = bulkActionRunning && bulkActionType === "delete";
    const questionRows = courseQuestions
      .map((question, idx) => {
        const questionId = String(question.id || "").trim();
        const isDeleting = questionDeleteQid === questionId;
        const isSelected = questionId ? selectedQuestionSet.has(questionId) : false;
        const rowClassNames = ["admin-question-row"];
        if (isSelected) {
          rowClassNames.push("is-selected");
        }
        const meta = getQbankCourseTopicMeta(question);
        const stem = String(question.stem || "").trim();
        const stemPreview = stem.length > 160 ? `${stem.slice(0, 157)}...` : stem;
        return `
          <tr
            class="${rowClassNames.join(" ")}"
            data-qid="${escapeHtml(questionId)}"
            draggable="${questionOpsLocked || !questionId ? "false" : "true"}"
          >
            <td class="admin-question-select-cell">
              <input
                type="checkbox"
                data-action="admin-select-question"
                data-qid="${escapeHtml(questionId)}"
                aria-label="Select question ${idx + 1}"
                ${isSelected ? "checked" : ""}
                ${questionOpsLocked || !questionId ? "disabled" : ""}
              />
            </td>
            <td class="admin-question-order-cell">
              <span class="admin-question-drag-handle" data-role="admin-question-drag-handle" data-qid="${escapeHtml(questionId)}" aria-hidden="true" title="${questionOpsLocked || !questionId ? "Reordering temporarily unavailable." : "Drag to reorder"}">
                <span class="admin-question-drag-bars" aria-hidden="true">
                  <span></span>
                  <span></span>
                  <span></span>
                </span>
              </span>
            </td>
            <td>${idx + 1}</td>
            <td>${escapeHtml(meta.topic)}</td>
            <td>${escapeHtml(stemPreview || "(No stem)")}</td>
            <td>${escapeHtml(String(question.correct?.[0] || "A").toUpperCase())}</td>
            <td>${escapeHtml(String(question.status || "draft"))}</td>
            <td>
              <div class="stack">
                <button class="btn ghost admin-btn-sm" type="button" data-action="admin-edit" data-qid="${escapeHtml(questionId)}" ${questionOpsLocked || !questionId ? "disabled" : ""}>Edit</button>
                <button class="btn danger admin-btn-sm ${isDeleting ? "is-loading" : ""}" type="button" data-action="admin-delete" data-qid="${escapeHtml(questionId)}" ${questionOpsLocked || !questionId ? "disabled" : ""}>
                  ${isDeleting ? `<span class="inline-loader" aria-hidden="true"></span><span>Deleting...</span>` : "Delete"}
                </button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");

    const editing = state.adminEditQuestionId
      ? questions.find((entry) => entry.id === state.adminEditQuestionId)
      : null;
    const editingMeta = editing ? getQbankCourseTopicMeta(editing) : null;
    const editorCourse = allCourses.includes(state.adminEditorCourse)
      ? state.adminEditorCourse
      : (editingMeta?.course || selectedCourse || allCourses[0] || "");
    const editorTopics = QBANK_COURSE_TOPICS[editorCourse] || [];
    const editorTopic = editorTopics.includes(state.adminEditorTopic)
      ? state.adminEditorTopic
      : (editingMeta?.topic || editorTopics[0] || "");
    const choicesById = {};
    (editing?.choices || []).forEach((choice) => {
      choicesById[String(choice?.id || "").toUpperCase()] = String(choice?.text || "");
    });
    const answerKey = String(editing?.correct?.[0] || "A").toUpperCase();
    const saveQuestionLabel = editing ? "Save changes" : "Save question";

    pageContent = `
      <section class="card admin-section" id="admin-questions-section">
        <div class="flex-between">
          <div>
            <h3 style="margin: 0;">Course Question Editor</h3>
            <p class="subtle">Open each course, see all uploaded questions, and edit stem, answers, and explanation.</p>
          </div>
          <div class="stack" style="align-items: flex-end; gap: 0.35rem;">
            <button class="btn ghost admin-btn-sm" type="button" data-action="admin-open-editor-new" ${questionOpsLocked ? "disabled" : ""}>New question</button>
            <button class="btn ghost admin-btn-sm" type="button" data-action="admin-open-courses">Back to courses</button>
          </div>
        </div>
        <form id="admin-question-filter-form" style="margin-top: 0.7rem;">
          <div class="form-row">
            <label>Course
              <select id="admin-filter-course" name="course">
                ${allCourses
        .map((course) => `<option value="${escapeHtml(course)}" ${selectedCourse === course ? "selected" : ""}>${escapeHtml(course)}</option>`)
        .join("")}
              </select>
            </label>
            <label>Topic
              <select id="admin-filter-topic" name="topic">
                <option value="" ${selectedTopic ? "" : "selected"}>All topics</option>
                ${selectedCourseTopics
        .map((topic) => `<option value="${escapeHtml(topic)}" ${selectedTopic === topic ? "selected" : ""}>${escapeHtml(topic)}</option>`)
        .join("")}
              </select>
            </label>
          </div>
          <div class="stack">
            <button class="btn ghost admin-btn-sm" type="submit">Apply filter</button>
            <button class="btn ghost admin-btn-sm" type="button" id="admin-clear-filters">Reset</button>
          </div>
        </form>
        <div class="admin-question-bulk-bar" style="margin-top: 0.74rem;">
          <label class="admin-question-select-all">
            <input
              type="checkbox"
              data-action="admin-select-all-questions"
              aria-label="Select all questions in this list"
              data-indeterminate="${partiallyVisibleSelected ? "true" : "false"}"
              ${allVisibleSelected ? "checked" : ""}
              ${questionOpsLocked || !visibleQuestionIds.length ? "disabled" : ""}
            />
            <span>Select all in this view</span>
          </label>
          <p class="admin-question-selection-count">Selected: <b>${selectedQuestionCount}</b></p>
          <div class="stack">
            <button class="btn ghost admin-btn-sm ${isBulkDrafting ? "is-loading" : ""}" type="button" data-action="admin-bulk-draft" ${questionOpsLocked || !selectedQuestionCount ? "disabled" : ""}>
              ${isBulkDrafting ? `<span class="inline-loader" aria-hidden="true"></span><span>Drafting...</span>` : "Draft selected"}
            </button>
            <button class="btn ghost admin-btn-sm ${isBulkPublishing ? "is-loading" : ""}" type="button" data-action="admin-bulk-publish" ${questionOpsLocked || !selectedQuestionCount ? "disabled" : ""}>
              ${isBulkPublishing ? `<span class="inline-loader" aria-hidden="true"></span><span>Publishing...</span>` : "Publish selected"}
            </button>
            <button class="btn danger admin-btn-sm ${isBulkDeleting ? "is-loading" : ""}" type="button" data-action="admin-bulk-delete" ${questionOpsLocked || !selectedQuestionCount ? "disabled" : ""}>
              ${isBulkDeleting ? `<span class="inline-loader" aria-hidden="true"></span><span>Deleting...</span>` : "Delete selected"}
            </button>
            <button class="btn ghost admin-btn-sm" type="button" data-action="admin-clear-selection" ${questionOpsLocked || !selectedQuestionCount ? "disabled" : ""}>Clear selection</button>
          </div>
        </div>
        <p class="subtle admin-question-reorder-hint">Drag and drop rows to reorder. On touch devices, swipe up/down on a row to move it.</p>
        <div class="table-wrap" style="margin-top: 0.9rem;">
          <table>
            <thead>
              <tr>
                <th class="admin-question-select-cell">Select</th>
                <th class="admin-question-order-cell">Move</th>
                <th>#</th>
                <th>Topic</th>
                <th>Question</th>
                <th>Correct</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${questionRows || `<tr><td colspan="8" class="subtle">No questions found for this course/topic.</td></tr>`}
            </tbody>
          </table>
        </div>
      </section>

      ${state.adminQuestionModalOpen
        ? `
            <div class="admin-question-modal">
              <button class="admin-question-modal-backdrop" type="button" data-action="admin-close-editor" aria-label="Close question editor"></button>
              <section class="admin-question-modal-card" role="dialog" aria-modal="true" aria-label="Question editor">
                <div class="flex-between admin-question-modal-head">
                  <h3 style="margin: 0;">${editing ? "Edit Question" : "New Question"}</h3>
                  <div class="stack">
                    <button class="btn admin-btn-sm ${questionSaveRunning ? "is-loading" : ""}" type="submit" form="admin-question-form" ${questionSaveRunning ? "disabled" : ""}>
                      ${questionSaveRunning ? `<span class="inline-loader" aria-hidden="true"></span><span>Saving...</span>` : saveQuestionLabel}
                    </button>
                    <button class="btn ghost admin-btn-sm" type="button" data-action="admin-new" ${questionSaveRunning ? "disabled" : ""}>New</button>
                    <button class="btn ghost admin-btn-sm" type="button" data-action="admin-cancel" ${questionSaveRunning ? "disabled" : ""}>Close</button>
                  </div>
                </div>
                <form id="admin-question-form" style="margin-top: 0.75rem;">
                  <input type="hidden" name="id" value="${escapeHtml(editing?.id || "")}" />
                  <div class="form-row">
                    <label>Course
                      <select id="admin-question-course" name="questionCourse">
                        ${allCourses
          .map((course) => `<option value="${escapeHtml(course)}" ${editorCourse === course ? "selected" : ""}>${escapeHtml(course)}</option>`)
          .join("")}
                      </select>
                    </label>
                    <label>Topic
                      <select id="admin-question-topic" name="questionTopic">
                        ${editorTopics
          .map((topic) => `<option value="${escapeHtml(topic)}" ${editorTopic === topic ? "selected" : ""}>${escapeHtml(topic)}</option>`)
          .join("")}
                      </select>
                    </label>
                  </div>
                  <div class="form-row">
                    <label>System
                      <input name="system" value="${escapeHtml(editing?.system || editorCourse)}" />
                    </label>
                    <label>Difficulty
                      <select name="difficulty">
                        <option value="Easy" ${String(editing?.difficulty || "Medium") === "Easy" ? "selected" : ""}>Easy</option>
                        <option value="Medium" ${String(editing?.difficulty || "Medium") === "Medium" ? "selected" : ""}>Medium</option>
                        <option value="Hard" ${String(editing?.difficulty || "Medium") === "Hard" ? "selected" : ""}>Hard</option>
                      </select>
                    </label>
                    <label>Status
                      <select name="status">
                        <option value="draft" ${String(editing?.status || "published") === "draft" ? "selected" : ""}>Draft</option>
                        <option value="published" ${String(editing?.status || "published") === "published" ? "selected" : ""}>Published</option>
                      </select>
                    </label>
                  </div>
                  <label>Question stem
                    <textarea name="stem" required>${escapeHtml(editing?.stem || "")}</textarea>
                  </label>
                  <div class="form-row">
                    <label>Question image URL
                      <input name="questionImage" value="${escapeHtml(editing?.questionImage || "")}" placeholder="https://example.com/figure.png" />
                    </label>
                    <label>Upload question image
                      <input name="questionImageFile" type="file" accept="image/png,image/jpeg,image/jpg,image/webp,image/gif" />
                    </label>
                  </div>
                  <p class="subtle" style="margin: 0;">If you choose a file, upload is automatic and replaces the URL above.</p>
                  ${editing?.questionImage
          ? `
                        <figure class="admin-question-image-preview">
                          <img src="${escapeHtml(editing.questionImage)}" alt="Question visual preview" loading="lazy" />
                        </figure>
                      `
          : ""
        }
                  <div class="form-row">
                    <label>Choice A <input name="choiceA" value="${escapeHtml(choicesById.A || "")}" required /></label>
                    <label>Choice B <input name="choiceB" value="${escapeHtml(choicesById.B || "")}" required /></label>
                  </div>
                  <div class="form-row">
                    <label>Choice C <input name="choiceC" value="${escapeHtml(choicesById.C || "")}" /></label>
                    <label>Choice D <input name="choiceD" value="${escapeHtml(choicesById.D || "")}" /></label>
                  </div>
                  <div class="form-row">
                    <label>Choice E <input name="choiceE" value="${escapeHtml(choicesById.E || "")}" /></label>
                    <label>Correct answer
                      <select name="correct">
                        ${["A", "B", "C", "D", "E"]
          .map((letter) => `<option value="${letter}" ${answerKey === letter ? "selected" : ""}>${letter}</option>`)
          .join("")}
                      </select>
                    </label>
                  </div>
                  <label>Explanation
                    <textarea name="explanation" required>${escapeHtml(editing?.explanation || "")}</textarea>
                  </label>
                  <div class="form-row">
                    <label>References <input name="references" value="${escapeHtml(editing?.references || "")}" /></label>
                    <label>Explanation image URL <input name="explanationImage" value="${escapeHtml(editing?.explanationImage || "")}" /></label>
                  </div>
                  <label>Tags (comma-separated)
                    <input name="tags" value="${escapeHtml(Array.isArray(editing?.tags) ? editing.tags.join(", ") : "")}" />
                  </label>
                </form>
              </section>
            </div>
          `
        : ""
      }
    `;
  }

  if (activeAdminPage === "bulk-import") {
    pageContent = renderAdminBulkImportSection(allCourses, {
      preferredCourse: String(state.adminFilters.course || ""),
    });
  }

  if (activeAdminPage === "notifications") {
    const users = getCloudNotificationTargetUsers(getUsers())
      .slice()
      .sort((a, b) => String(a?.name || "").localeCompare(String(b?.name || "")));
    const targetType = normalizeNotificationAudienceType(state.adminNotificationTargetType);
    let targetYear = normalizeAcademicYearOrNull(state.adminNotificationTargetYear);
    if (targetYear === null) {
      targetYear = 1;
      state.adminNotificationTargetYear = targetYear;
    }
    let targetUserId = String(state.adminNotificationTargetUserId || "").trim();
    if (targetUserId && !findUserByNotificationTargetId(targetUserId, users)) {
      targetUserId = "";
      state.adminNotificationTargetUserId = "";
    }
    let targetUserQuery = String(state.adminNotificationTargetQuery || "").trim();
    const selectedTargetUser = targetUserId ? findUserByNotificationTargetId(targetUserId, users) : null;
    if (selectedTargetUser && !targetUserQuery) {
      targetUserQuery = getNotificationTargetSearchDisplayLabel(selectedTargetUser);
    }
    const targetUserSuggestions = targetType === "user"
      ? searchUsersForNotificationTarget(targetUserQuery, users, 8)
      : [];
    const titleDraft = String(state.adminNotificationTitle || "");
    const bodyDraft = String(state.adminNotificationBody || "");
    const notificationSending = Boolean(state.adminNotificationSending);
    const notificationRows = getNotifications()
      .slice(0, 200)
      .map((notification) => {
        const targetLabel = getNotificationTargetLabel(notification, users);
        const senderLabel = String(notification.createdByName || "Admin").trim() || "Admin";
        const body = String(notification.body || "").trim();
        const bodyPreview = body.length > 180 ? `${body.slice(0, 177)}...` : body;
        const createdLabel = new Date(notification.createdAt || nowISO()).toLocaleString();
        return `
          <tr>
            <td><small>${escapeHtml(createdLabel)}</small></td>
            <td>${escapeHtml(targetLabel)}</td>
            <td><b>${escapeHtml(notification.title || "Notification")}</b></td>
            <td>${escapeHtml(bodyPreview || "-")}</td>
            <td><small>${escapeHtml(senderLabel)}</small></td>
          </tr>
        `;
      })
      .join("");

    pageContent = `
      <section class="card admin-section" id="admin-notifications-section">
        <div class="flex-between">
          <div>
            <h3 style="margin: 0;">Notifications</h3>
            <p class="subtle">Send in-app notifications to all users, one user, or students by academic year.</p>
          </div>
          <div class="stack" style="align-items: flex-end;">
            <p class="subtle" style="margin: 0;">Last sync: <b>${state.adminDataLastSyncAt ? new Date(state.adminDataLastSyncAt).toLocaleTimeString() : "Not yet"}</b></p>
            <button class="btn ghost admin-btn-sm" type="button" data-action="admin-refresh-notifications" ${notificationSending ? "disabled" : ""}>Refresh list</button>
          </div>
        </div>

        <form id="admin-notification-form">
          <div class="form-row admin-notification-target-row">
            <label class="admin-notification-target-type-field ${targetType === "year" ? "" : "is-full-width"}" id="admin-notification-target-type-field-wrap">Audience
              <select name="targetType" id="admin-notification-target-type" ${notificationSending ? "disabled" : ""}>
                <option value="all" ${targetType === "all" ? "selected" : ""}>All users</option>
                <option value="year" ${targetType === "year" ? "selected" : ""}>Year group</option>
                <option value="user" ${targetType === "user" ? "selected" : ""}>Specific user</option>
              </select>
            </label>
            <label class="admin-notification-target-year-field" id="admin-notification-target-year-field" ${targetType === "year" ? "" : "hidden"}>Target year
              <select name="targetYear" id="admin-notification-target-year" ${targetType === "year" ? "" : "disabled"} ${notificationSending ? "disabled" : ""}>
                ${[1, 2, 3, 4, 5]
        .map((yearValue) => `<option value="${yearValue}" ${targetYear === yearValue ? "selected" : ""}>${escapeHtml(formatAcademicYearAudienceLabel(yearValue))}</option>`)
        .join("")}
              </select>
              <small class="subtle">Year groups include approved student accounts only.</small>
            </label>
            <label class="admin-notification-target-user-field" id="admin-notification-target-user-field" ${targetType === "user" ? "" : "hidden"}>Target user
              <input type="hidden" name="targetUserId" id="admin-notification-target-user-id" value="${escapeHtml(targetUserId)}" />
              <div class="admin-target-user-combobox">
                <input
                  type="search"
                  id="admin-notification-target-user-search"
                  name="targetUserQuery"
                  value="${escapeHtml(targetUserQuery)}"
                  placeholder="Type name or email..."
                  autocomplete="off"
                  spellcheck="false"
                  ${targetType === "user" ? "" : "disabled"}
                  ${notificationSending ? "disabled" : ""}
                />
                <div
                  class="admin-user-suggestions"
                  id="admin-notification-target-suggestions"
                  ${targetType === "user" && targetUserSuggestions.length ? "" : "hidden"}
                  role="listbox"
                  aria-label="User suggestions"
                >
                  ${targetUserSuggestions
        .map((entry) => {
          const userId = String(getUserProfileId(entry) || entry?.id || "").trim();
          if (!userId) {
            return "";
          }
          const roleLabel = entry.role === "admin" ? "admin" : "student";
          const selected = targetUserId === userId;
          return `
                        <button
                          type="button"
                          class="admin-user-suggestion${selected ? " is-active" : ""}"
                          data-action="admin-notification-pick-user"
                          data-user-id="${escapeHtml(userId)}"
                          role="option"
                          aria-selected="${selected ? "true" : "false"}"
                        >
                          <span class="admin-user-suggestion-name">${escapeHtml(String(entry?.name || "").trim() || "User")}</span>
                          <span class="admin-user-suggestion-meta">${escapeHtml(String(entry?.email || "").trim() || "No email")} • ${escapeHtml(roleLabel)}</span>
                        </button>
                      `;
        })
        .join("")}
                </div>
              </div>
              <small class="subtle">Type a name or email, then choose a suggestion.</small>
            </label>
          </div>
          <label>Title
            <input name="title" maxlength="120" required value="${escapeHtml(titleDraft)}" ${notificationSending ? "disabled" : ""} />
          </label>
          <label>Message
            <textarea name="body" maxlength="2000" required ${notificationSending ? "disabled" : ""}>${escapeHtml(bodyDraft)}</textarea>
          </label>
          <div class="stack">
            <button class="btn ${notificationSending ? "is-loading" : ""}" type="submit" ${notificationSending ? "disabled" : ""}>
              ${notificationSending ? `<span class="inline-loader" aria-hidden="true"></span><span>Sending...</span>` : "Send notification"}
            </button>
          </div>
        </form>

        <div class="table-wrap" style="margin-top: 0.9rem;">
          <table>
            <thead>
              <tr>
                <th>Sent</th>
                <th>Target</th>
                <th>Title</th>
                <th>Message</th>
                <th>Sender</th>
              </tr>
            </thead>
            <tbody>
              ${notificationRows || `<tr><td colspan="5" class="subtle">No notifications sent yet.</td></tr>`}
            </tbody>
          </table>
        </div>
      </section>
    `;
  }

  if (activeAdminPage === "site-access") {
    const config = getSiteMaintenanceConfig();
    const maintenanceExceptionUsers = getCloudNotificationTargetUsers(getUsers())
      .filter((entry) => String(entry?.role || "").trim().toLowerCase() !== "admin");
    const maintenanceExceptions = config.allowedUserIds.map((userId) => {
      const matchedUser = findUserByNotificationTargetId(userId, maintenanceExceptionUsers);
      if (matchedUser) {
        return {
          id: userId,
          label: getNotificationTargetSearchDisplayLabel(matchedUser),
          email: String(matchedUser.email || "").trim(),
          isUnknown: false,
        };
      }
      return {
        id: userId,
        label: "Unknown user",
        email: userId,
        isUnknown: true,
      };
    });
    const updatedLabel = config.updatedAt ? new Date(config.updatedAt).toLocaleString() : "Not yet";
    const updatedByLabel = String(config.updatedByName || "").trim() || "System";
    pageContent = `
      <section class="card admin-section" id="admin-site-access-section">
        <div class="flex-between" style="gap: 1rem;">
          <div>
            <h3 style="margin: 0;">Temporary Website Closure</h3>
            <p class="subtle">Close the website for non-admin users and leave a public message about updates or maintenance.</p>
          </div>
          <span class="badge ${config.enabled ? "bad" : "good"}">${config.enabled ? "Closed for users" : "Open to users"}</span>
        </div>

        <form id="admin-site-maintenance-form" class="admin-site-maintenance-form">
          <label class="toggle-switch-label admin-site-maintenance-toggle">
            <input name="enabled" type="checkbox" class="toggle-switch-input" ${config.enabled ? "checked" : ""} />
            <span class="toggle-switch-track" aria-hidden="true">
              <span class="toggle-switch-thumb"></span>
            </span>
            <span class="toggle-switch-text">
              <b>${config.enabled ? "Website is currently closed for users" : "Leave website open"}</b><br />
              <span class="subtle">Admins keep access to the dashboard even while closure mode is active.</span>
            </span>
          </label>

          <div class="form-row">
            <label>Public title
              <input name="title" maxlength="120" value="${escapeHtml(config.title)}" required />
            </label>
          </div>

          <label>Public message
            <textarea name="message" rows="6" maxlength="1200" required>${escapeHtml(config.message)}</textarea>
          </label>

          <div class="admin-site-maintenance-exceptions">
            <div>
              <h4 style="margin: 0;">Allowed users during closure</h4>
              <p class="subtle" style="margin: 0.3rem 0 0;">Add specific non-admin accounts that should still be able to enter while the website is closed.</p>
            </div>

            <div id="admin-site-maintenance-exception-form" class="admin-site-maintenance-exception-form">
              <input type="hidden" name="exceptionUserId" id="admin-site-maintenance-exception-user-id" value="" />
              <label>Search user
                <div class="admin-target-user-combobox">
                  <input
                    type="search"
                    id="admin-site-maintenance-exception-search"
                    name="exceptionUserQuery"
                    placeholder="Type name, email, or phone..."
                    autocomplete="off"
                    spellcheck="false"
                  />
                  <div
                    class="admin-user-suggestions"
                    id="admin-site-maintenance-exception-suggestions"
                    hidden
                    role="listbox"
                    aria-label="Site maintenance exception suggestions"
                  ></div>
                </div>
              </label>
              <button class="btn ghost" type="button" data-action="admin-site-maintenance-add-exception">Add exception</button>
            </div>

            <div class="admin-site-maintenance-exception-list">
              ${maintenanceExceptions.length
          ? maintenanceExceptions
            .map((entry) => `
                      <span class="admin-site-maintenance-exception-chip${entry.isUnknown ? " is-unknown" : ""}">
                        <span>
                          <b>${escapeHtml(entry.label)}</b>
                          <small>${escapeHtml(entry.email || entry.id)}</small>
                        </span>
                        <button type="button" data-action="admin-site-maintenance-remove-exception" data-user-id="${escapeHtml(entry.id)}" aria-label="Remove exception">
                          x
                        </button>
                      </span>
                    `)
            .join("")
          : '<p class="subtle" style="margin: 0;">No user exceptions added.</p>'
        }
            </div>
          </div>

          <div class="admin-site-maintenance-actions">
            <button class="btn" type="submit">Save site status</button>
            <button class="btn ghost" type="button" data-action="admin-site-maintenance-reset">Reset default message</button>
          </div>
        </form>

        <div class="admin-site-maintenance-preview">
          <div class="maintenance-card is-inline-preview">
            <span class="maintenance-badge">${config.enabled ? "Public preview" : "Preview"}</span>
            <h4 class="maintenance-title">${escapeHtml(config.title)}</h4>
            <p class="maintenance-message">${escapeHtml(config.message)}</p>
            <p class="maintenance-updated">Last saved ${escapeHtml(updatedLabel)} by ${escapeHtml(updatedByLabel)}.</p>
          </div>
          <p class="subtle" style="margin: 0;">If you want signed-in students to reload and pick up the closure faster, use <b>Force student refresh</b> from the sidebar after saving.</p>
        </div>
      </section>
    `;
  }

  if (activeAdminPage === "logs") {
    const logs = getSystemLogs().slice(0, 800);
    const logRows = logs
      .map((entry) => {
        const actorLabel = entry.actorName || entry.actorId || "System";
        const actorRole = entry.actorRole ? ` (${entry.actorRole})` : "";
        const routeLabel = entry.route || "-";
        const detailsText = (() => {
          const keys = Object.keys(entry.details || {});
          if (!keys.length) {
            return "-";
          }
          const serialized = JSON.stringify(entry.details);
          return serialized.length > 280 ? `${serialized.slice(0, 277)}...` : serialized;
        })();
        return `
          <tr>
            <td><small>${escapeHtml(new Date(entry.createdAt).toLocaleString())}</small></td>
            <td><small>${escapeHtml(actorLabel + actorRole)}</small></td>
            <td><small>${escapeHtml(routeLabel)}</small></td>
            <td><small>${escapeHtml(entry.kind)}</small></td>
            <td>${escapeHtml(entry.message)}</td>
            <td><small>${escapeHtml(detailsText)}</small></td>
          </tr>
        `;
      })
      .join("");

    pageContent = `
      <section class="card admin-section" id="admin-logs-section">
        <div class="flex-between" style="gap: 1rem;">
          <div>
            <h3 style="margin: 0;">System Logs</h3>
            <p class="subtle">Readable audit trail of admin-only interactions and system changes.</p>
          </div>
          <div class="stack" style="align-items: flex-end;">
            <p class="subtle" style="margin: 0;">Showing latest <b>${logs.length}</b> record(s)</p>
            <div class="stack">
              <button class="btn ghost admin-btn-sm" type="button" data-action="admin-export-logs">Export JSON</button>
              <button class="btn ghost admin-btn-sm" type="button" data-action="admin-logs-refresh">Refresh</button>
              <button class="btn danger admin-btn-sm" type="button" data-action="admin-clear-logs">Clear logs</button>
            </div>
          </div>
        </div>
        <div class="table-wrap" style="margin-top: 0.9rem;">
          <table class="admin-users-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Actor</th>
                <th>Route</th>
                <th>Type</th>
                <th>Message</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              ${logRows || `<tr><td colspan="6" class="subtle">No admin interaction logs yet.</td></tr>`}
            </tbody>
          </table>
        </div>
      </section>
    `;
  }

  if (activeAdminPage === "activity") {
    const rows = Array.isArray(state.adminPresenceRows) ? state.adminPresenceRows : [];
    const nowMs = Date.now();
    const onlineRows = rows.filter((row) => shouldTreatPresenceAsOnline(row));
    const offlineRows = rows.filter((row) => !shouldTreatPresenceAsOnline(row));
    const solvingRows = onlineRows.filter((row) => Boolean(row?.is_solving));
    const studentOnline = onlineRows.filter((row) => String(row?.role || "student") === "student").length;

    const formatTimeAgo = (isoStr) => {
      if (!isoStr) return "-";
      const diffMs = nowMs - new Date(isoStr).getTime();
      if (!Number.isFinite(diffMs) || diffMs < 0) return "just now";
      const secs = Math.floor(diffMs / 1000);
      if (secs < 10) return "just now";
      if (secs < 60) return secs + "s ago";
      const mins = Math.floor(secs / 60);
      if (mins < 60) return mins + "m ago";
      const hours = Math.floor(mins / 60);
      if (hours < 24) return hours + "h " + (mins % 60) + "m ago";
      const days = Math.floor(hours / 24);
      return days + "d ago";
    };

    const formatDuration = (isoStr) => {
      if (!isoStr) return "-";
      const diffMs = nowMs - new Date(isoStr).getTime();
      if (!Number.isFinite(diffMs) || diffMs < 0) return "0s";
      const secs = Math.floor(diffMs / 1000);
      if (secs < 60) return secs + "s";
      const mins = Math.floor(secs / 60);
      if (mins < 60) return mins + "m " + (secs % 60) + "s";
      const hours = Math.floor(mins / 60);
      return hours + "h " + (mins % 60) + "m";
    };

    const sortedRows = [...onlineRows].sort((a, b) => {
      const aSolving = Boolean(a?.is_solving);
      const bSolving = Boolean(b?.is_solving);
      if (aSolving !== bSolving) return bSolving ? 1 : -1;
      return new Date(b?.last_seen_at || 0) - new Date(a?.last_seen_at || 0);
    }).concat([...offlineRows].sort((a, b) => {
      return new Date(b?.last_seen_at || 0) - new Date(a?.last_seen_at || 0);
    }));

    const activityRows = sortedRows
      .map((row) => {
        const online = shouldTreatPresenceAsOnline(row);
        const solvingNow = online && Boolean(row?.is_solving);
        const name = String(row?.full_name || "").trim() || String(row?.email || "").trim() || "User";
        const email = String(row?.email || "").trim() || "-";
        const role = String(row?.role || "student");
        const route = String(row?.current_route || "").trim() || "-";
        const lastSeenAgo = formatTimeAgo(row?.last_seen_at);
        const lastSeenFull = row?.last_seen_at ? new Date(row.last_seen_at).toLocaleString() : "";
        const solvingDuration = solvingNow && row?.solving_started_at ? formatDuration(row.solving_started_at) : "-";
        const statusClass = online ? "good" : "neutral";
        const statusLabel = online ? "online" : "offline";
        const sessionBadge = solvingNow
          ? `<span class="badge good">solving</span>`
          : online
            ? `<span class="badge neutral">idle</span>`
            : `<span class="badge neutral">-</span>`;
        return `
          <tr style="${online ? "" : "opacity: 0.55;"}">
            <td>
              <b>${escapeHtml(name)}</b><br />
              <small>${escapeHtml(email)}</small>
            </td>
            <td><span class="badge ${role === "admin" ? "good" : "neutral"}">${escapeHtml(role)}</span></td>
            <td><span class="badge ${statusClass}">${statusLabel}</span></td>
            <td>${online ? escapeHtml(route) : '<span class="admin-na">-</span>'}</td>
            <td>${sessionBadge}</td>
            <td><small>${escapeHtml(solvingDuration)}</small></td>
            <td><small title="${escapeHtml(lastSeenFull)}">${escapeHtml(lastSeenAgo)}</small></td>
          </tr>
        `;
      })
      .join("");

    const lastSyncLabel = state.adminPresenceLastSyncAt
      ? new Date(state.adminPresenceLastSyncAt).toLocaleTimeString()
      : "Not yet";

    pageContent = `
      <section class="card admin-section" id="admin-activity-section">
        <div class="flex-between" style="gap: 1rem;">
          <div>
            <h3 style="margin: 0;">Live User Activity</h3>
            <p class="subtle">Real-time tracking of all users. Auto-refreshes every 15 seconds.</p>
          </div>
          <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 0.45rem;">
            <div style="display: flex; align-items: center; gap: 0.6rem;">
              <span class="subtle" style="font-size: 0.8rem;">Last sync: <b>${lastSyncLabel}</b></span>
              <button class="btn ghost admin-btn-sm ${state.adminActivityReportRunning ? "is-loading" : ""}" type="button" data-action="download-admin-activity-report" ${state.adminActivityReportRunning ? "disabled" : ""}>
                ${state.adminActivityReportRunning ? `<span class="inline-loader" aria-hidden="true"></span><span>Preparing report...</span>` : "Download daily report"}
              </button>
              <button class="btn ghost admin-btn-sm ${state.adminPresenceLoading ? "is-loading" : ""}" type="button" data-action="refresh-admin-activity" ${state.adminPresenceLoading ? "disabled" : ""}>
                ${state.adminPresenceLoading ? `<span class="inline-loader" aria-hidden="true"></span><span>Refreshing...</span>` : "Refresh now"}
              </button>
            </div>
            <small class="subtle" style="font-size: 0.72rem;">\u25CF Auto-refresh active</small>
          </div>
        </div>
        <div class="stats-grid" style="margin-top: 0.85rem;">
          <article class="card"><p class="metric">${rows.length}<small>Total tracked</small></p></article>
          <article class="card"><p class="metric">${onlineRows.length}<small>Online now</small></p></article>
          <article class="card"><p class="metric">${solvingRows.length}<small>Solving now</small></p></article>
          <article class="card"><p class="metric">${studentOnline}<small>Students online</small></p></article>
          <article class="card"><p class="metric">${offlineRows.length}<small>Offline</small></p></article>
        </div>
        ${state.adminPresenceError
        ? `<p class="subtle" style="margin-top:0.9rem;">${escapeHtml(state.adminPresenceError)}</p>`
        : ""
      }
        <div class="table-wrap" style="margin-top: 0.9rem;">
          <table class="admin-users-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Page</th>
                <th>Session</th>
                <th>Solving For</th>
                <th>Last Seen</th>
              </tr>
            </thead>
            <tbody>
              ${activityRows || `<tr><td colspan="7" class="subtle">No activity records yet. Users will appear here once they open the app.</td></tr>`}
            </tbody>
          </table>
        </div>
      </section>
    `;
  }

  const syncNotice = state.adminDataSyncError
    ? `<div class="card admin-section"><p class="subtle" style="margin:0;">${escapeHtml(state.adminDataSyncError)}</p></div>`
    : "";
  const adminLastSyncLabel = state.adminDataLastSyncAt
    ? new Date(state.adminDataLastSyncAt).toLocaleTimeString()
    : "Not yet";
  const adminSyncBusy = Boolean(state.adminDataRefreshing);
  const adminForceRefreshBusy = Boolean(state.adminForceRefreshRunning);
  const canManualSupabaseSync = Boolean(getSupabaseAuthClient()) && isUuidValue(getUserProfileId(user));
  const canForceStudentRefresh = canManualSupabaseSync && supabaseSync.enabled;
  const studentRefreshTrigger = load(STORAGE_KEYS.studentRefreshTrigger, null);
  const lastStudentRefreshAt = String(studentRefreshTrigger?.requestedAt || "").trim();
  const lastStudentRefreshLabel = lastStudentRefreshAt ? new Date(lastStudentRefreshAt).toLocaleString() : "Not yet";
  const cloudSyncModel = getCloudSyncStatusModel(user);

  return `
    <section class="panel admin-shell">
      <aside class="admin-sidebar card">
        <h3 style="margin-top: 0;">Admin Panel</h3>
        <p class="subtle">Manage the full O6U MedBank platform from one place.</p>
        <div class="admin-sidebar-nav">
          <button class="btn ghost ${activeAdminPage === "dashboard" ? "is-active" : ""}" type="button" data-action="admin-page" data-page="dashboard">Dashboard</button>
          <button class="btn ghost ${activeAdminPage === "users" ? "is-active" : ""}" type="button" data-action="admin-page" data-page="users">Users</button>
          <button class="btn ghost ${activeAdminPage === "courses" ? "is-active" : ""}" type="button" data-action="admin-page" data-page="courses">Courses</button>
          <button class="btn ghost ${activeAdminPage === "questions" ? "is-active" : ""}" type="button" data-action="admin-page" data-page="questions">Questions</button>
          <button class="btn ghost ${activeAdminPage === "bulk-import" ? "is-active" : ""}" type="button" data-action="admin-page" data-page="bulk-import">Bulk Import</button>
          <button class="btn ghost ${activeAdminPage === "notifications" ? "is-active" : ""}" type="button" data-action="admin-page" data-page="notifications">Notifications</button>
          <button class="btn ghost ${activeAdminPage === "site-access" ? "is-active" : ""}" type="button" data-action="admin-page" data-page="site-access">Site Access</button>
          <button class="btn ghost ${activeAdminPage === "activity" ? "is-active" : ""}" type="button" data-action="admin-page" data-page="activity">Activity</button>
          <button class="btn ghost ${activeAdminPage === "logs" ? "is-active" : ""}" type="button" data-action="admin-page" data-page="logs">Logs</button>
        </div>
        <div class="stack" style="margin-top: 0.85rem; align-items: flex-start;">
          <p class="subtle" style="margin: 0;">Last data sync: <b>${escapeHtml(adminLastSyncLabel)}</b></p>
          <div id="admin-cloud-sync-slot">${renderCloudSyncPill(cloudSyncModel, { compact: false })}</div>
          <button class="btn ghost admin-btn-sm ${adminSyncBusy ? "is-loading" : ""}" type="button" data-action="refresh-admin-data" ${adminSyncBusy || !canManualSupabaseSync ? "disabled" : ""} ${!canManualSupabaseSync ? 'title="Sign in with your Supabase admin account to enable sync."' : ""}>
            ${adminSyncBusy ? `<span class="inline-loader" aria-hidden="true"></span><span>Refreshing...</span>` : "Refresh from cloud"}
          </button>
          <button class="btn ghost admin-btn-sm ${adminForceRefreshBusy ? "is-loading" : ""}" type="button" data-action="admin-force-student-refresh" ${adminForceRefreshBusy || !canForceStudentRefresh ? "disabled" : ""} ${!canForceStudentRefresh ? 'title="Supabase app-state sync must be active to broadcast this action."' : ""}>
            ${adminForceRefreshBusy ? `<span class="inline-loader" aria-hidden="true"></span><span>Sending refresh signal...</span>` : "Force student refresh"}
          </button>
          <small class="subtle">Students auto-refresh every few seconds and pick up admin updates quickly.</small>
          <small class="subtle">Last forced student refresh: <b>${escapeHtml(lastStudentRefreshLabel)}</b></small>
          <small class="subtle">Edits save locally first, then sync automatically in the background.</small>
          ${!canManualSupabaseSync ? '<small class="subtle">Supabase sync requires an active Supabase admin session.</small>' : ""}
        </div>
      </aside>

      <div class="admin-main">${syncNotice}${pageContent}</div>
    </section>
    ${adminGlobalOverlay}
  `;
}

function renderAdminCourseTopicControls(course) {
  const topics = QBANK_COURSE_TOPICS[course] || [];
  const groups = getCourseTopicGroups(course);
  const groupNames = Object.keys(groups);
  const groupOptionListId = `course-topic-groups-${String(course || "course").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "course"}`;
  return `
    <div class="admin-course-topics admin-course-topic-manager">
      <div class="admin-course-topic-manager-topbar">
        <div>
          <h4 style="margin: 0;">Topics</h4>
          <p class="subtle" style="margin: 0.22rem 0 0;">Add, edit, and group topics directly in the table.</p>
        </div>
      </div>

      <datalist id="${groupOptionListId}">
        ${groupNames.map((groupName) => `<option value="${escapeHtml(groupName)}"></option>`).join("")}
      </datalist>

      <div class="table-wrap admin-topic-table-wrap">
        <table class="admin-topic-table">
          <thead>
            <tr>
              <th>Topic</th>
              <th>Subgroup</th>
              <th class="admin-topic-table-actions-head">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${state.adminCourseTopicInlineCreateOpen
      ? `
            <tr class="admin-topic-table-create-row is-open" data-role="course-topic-create-row">
              <td>
                <input data-field="newCourseTopicInline" placeholder="Add topic (e.g., Diabetes Mellitus)" />
              </td>
              <td>
                <input
                  data-field="newCourseTopicGroupInline"
                  list="${groupOptionListId}"
                  placeholder="Type or create subgroup"
                />
              </td>
              <td>
                <div class="admin-topic-table-actions">
                  <button
                    class="btn admin-btn-sm admin-topic-inline-add-btn"
                    type="button"
                    data-action="course-topic-inline-add"
                    aria-label="Add topic"
                    title="Add topic"
                  >
                    +
                  </button>
                </div>
              </td>
            </tr>
            `
      : `
            <tr class="admin-topic-table-create-row is-collapsed" data-role="course-topic-create-row">
              <td colspan="2"></td>
              <td>
                <div class="admin-topic-table-actions">
                  <button
                    class="btn admin-btn-sm admin-topic-inline-add-btn"
                    type="button"
                    data-action="course-topic-inline-open"
                    aria-label="Show add topic fields"
                    title="Add topic"
                  >
                    +
                  </button>
                </div>
              </td>
            </tr>
            `}
            ${topics.length
      ? topics
        .map((topic, topicIdx) => `
                  <tr data-role="course-topic-row" data-topic-index="${topicIdx}">
                    <td>
                      <input data-field="courseTopicName" value="${escapeHtml(topic)}" />
                    </td>
                    <td>
                      <input
                        data-field="courseTopicGroupName"
                        list="${groupOptionListId}"
                        value="${escapeHtml(getTopicGroupNameForCourseTopic(course, topic))}"
                        placeholder="Type or create subgroup"
                      />
                    </td>
                    <td>
                      <div class="admin-topic-table-actions">
                        <button
                          class="btn ghost admin-btn-sm"
                          type="button"
                          data-action="course-topic-save"
                          data-topic-index="${topicIdx}"
                        >
                          Save
                        </button>
                        <button
                          class="btn danger admin-btn-sm"
                          type="button"
                          data-action="course-topic-remove"
                          data-topic-index="${topicIdx}"
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                `)
        .join("")
      : `<tr><td colspan="3" class="subtle">No topics yet. Press + to add the first one.</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function wireAdmin() {
  const allCourses = Object.keys(QBANK_COURSE_TOPICS);

  appEl.querySelectorAll("[data-action='admin-page']").forEach((button) => {
    button.addEventListener("click", () => {
      const page = button.getAttribute("data-page");
      if (!["dashboard", "users", "courses", "questions", "bulk-import", "notifications", "site-access", "activity", "logs"].includes(page)) {
        return;
      }
      if (state.adminPage === page) {
        return;
      }
      const previousPage = String(state.adminPage || "").trim() || "dashboard";
      state.adminPage = page;
      appendSystemLog("admin.page", `Admin page changed: ${previousPage} -> ${page}`, {
        from: previousPage,
        to: page,
      });
      if (page !== "questions") {
        state.adminQuestionModalOpen = false;
        state.adminSelectedQuestionIds = [];
        state.adminBulkActionRunning = false;
        state.adminBulkActionType = "";
      }
      if (page !== "users") {
        state.adminSelectedUserIds = [];
        state.adminUserBulkActionRunning = false;
        if (adminUserSearchDebounce) {
          window.clearTimeout(adminUserSearchDebounce);
          adminUserSearchDebounce = null;
        }
      }
      if (page !== "courses") {
        state.adminCourseTopicModalCourse = "";
        state.adminCourseTopicGroupCreateModalOpen = false;
        state.adminCourseTopicInlineCreateOpen = false;
      }
      if (page === "activity") {
        refreshAdminPresenceSnapshot({ force: true })
          .then((ok) => {
            if (ok && state.route === "admin" && state.adminPage === "activity") {
              state.skipNextRouteAnimation = true;
              render();
            }
          })
          .catch((error) => {
            console.warn("Could not refresh admin activity.", error?.message || error);
          });
      } else {
        clearAdminPresencePolling();
      }
      state.skipNextRouteAnimation = true;
      render();
    });
  });

  appEl.querySelectorAll("[data-action='admin-open-courses']").forEach((button) => {
    button.addEventListener("click", () => {
      state.adminPage = "courses";
      state.adminCourseTopicModalCourse = "";
      state.adminCourseTopicGroupCreateModalOpen = false;
      state.adminCourseTopicInlineCreateOpen = false;
      state.adminEditQuestionId = null;
      state.adminQuestionModalOpen = false;
      state.adminSelectedQuestionIds = [];
      state.adminBulkActionRunning = false;
      state.adminBulkActionType = "";
      state.skipNextRouteAnimation = true;
      render();
    });
  });

  appEl.querySelector("[data-action='admin-logs-refresh']")?.addEventListener("click", () => {
    state.skipNextRouteAnimation = true;
    render();
  });

  appEl.querySelector("[data-action='admin-export-logs']")?.addEventListener("click", () => {
    const logs = getSystemLogs();
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: "application/json;charset=utf-8" });
    const exportUrl = URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    downloadLink.href = exportUrl;
    downloadLink.download = `system-logs-${stamp}.json`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();
    window.setTimeout(() => URL.revokeObjectURL(exportUrl), 1200);
    appendSystemLog("system.logs", "System logs exported from admin panel.", {
      count: logs.length,
    });
    toast("Logs exported.");
  });

  appEl.querySelector("[data-action='admin-clear-logs']")?.addEventListener("click", async () => {
    if (!window.confirm("Clear all system logs?")) {
      return;
    }
    systemLogRuntime.suspend = true;
    save(STORAGE_KEYS.systemLogs, []);
    systemLogRuntime.suspend = false;
    appendSystemLog("system.logs", "System logs cleared from admin panel.", {}, { force: true });
    await flushPendingSyncNow({ throwOnRelationalFailure: false }).catch(() => { });
    toast("System logs cleared.");
    state.skipNextRouteAnimation = true;
    render();
  });

  appEl.querySelector("[data-action='refresh-admin-data']")?.addEventListener("click", async () => {
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== "admin") {
      return;
    }
    if (typeof navigator !== "undefined" && navigator?.onLine === false) {
      const message = "You are offline. Showing locally cached admin data.";
      state.adminDataSyncError = message;
      toast(message);
      state.skipNextRouteAnimation = true;
      render();
      return;
    }
    const authClient = getSupabaseAuthClient();
    const currentProfileId = String(getUserProfileId(currentUser) || "").trim();
    if (!authClient || !isUuidValue(currentProfileId)) {
      const message = "No active Supabase admin session. Log out and sign in with your Supabase admin account.";
      state.adminDataSyncError = message;
      toast(message);
      state.skipNextRouteAnimation = true;
      render();
      return;
    }
    const { data: sessionData } = await authClient.auth.getSession().catch(() => ({ data: { session: null } }));
    if (!sessionData?.session?.user?.id || sessionData.session.user.id !== currentProfileId) {
      const message = "Supabase session expired. Please log out and sign in again.";
      state.adminDataSyncError = message;
      toast(message);
      state.skipNextRouteAnimation = true;
      render();
      return;
    }
    const synced = await refreshAdminDataSnapshot(currentUser, { force: true });
    if (state.adminPage === "activity") {
      await refreshAdminPresenceSnapshot({ force: true, silent: true }).catch(() => { });
    }
    if (synced) {
      toast("Admin data refreshed from cloud.");
    } else {
      toast(state.adminDataSyncError || relationalSync.lastReadyError || "Could not refresh admin data from Supabase.");
    }
    state.skipNextRouteAnimation = true;
    render();
  });

  appEl.querySelector("[data-action='admin-force-student-refresh']")?.addEventListener("click", async () => {
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== "admin" || state.adminForceRefreshRunning) {
      return;
    }
    if (typeof navigator !== "undefined" && navigator?.onLine === false) {
      toast("You are offline. Connect to the internet to send a refresh signal.");
      return;
    }
    const authClient = getSupabaseAuthClient();
    const currentProfileId = String(getUserProfileId(currentUser) || "").trim();
    if (!authClient || !isUuidValue(currentProfileId)) {
      toast("No active Supabase admin session. Log out and sign in with your Supabase admin account.");
      return;
    }
    if (!supabaseSync.enabled) {
      toast("Cloud app-state sync is unavailable right now. Try Refresh from cloud first.");
      return;
    }
    const { data: sessionData } = await authClient.auth.getSession().catch(() => ({ data: { session: null } }));
    if (!sessionData?.session?.user?.id || sessionData.session.user.id !== currentProfileId) {
      toast("Supabase session expired. Please log out and sign in again.");
      return;
    }

    state.adminForceRefreshRunning = true;
    state.skipNextRouteAnimation = true;
    render();

    try {
      queueStudentRefreshSignal({
        user: currentUser,
        force: true,
        reason: "manual_admin_refresh",
        flushNow: false,
      });
      await flushPendingSyncNow({ throwOnRelationalFailure: false });
      const remoteKey = buildRemoteSyncKey(STORAGE_KEYS.studentRefreshTrigger, getSyncScopeForUser(currentUser));
      const deferred = supabaseSync.pendingWrites.has(remoteKey);
      state.adminDataLastSyncAt = Date.now();
      state.adminDataSyncError = "";
      if (deferred) {
        toast("Refresh signal queued locally and will sync to cloud automatically.");
      } else {
        toast("Refresh signal sent. Students will auto-refresh shortly.");
      }
    } catch (error) {
      const message = getErrorMessage(error, "Could not send refresh signal.");
      state.adminDataSyncError = message;
      toast(message);
    } finally {
      state.adminForceRefreshRunning = false;
      state.skipNextRouteAnimation = true;
      render();
    }
  });

  const persistSiteMaintenanceConfig = async (nextConfig, options = {}) => {
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== "admin") {
      return false;
    }
    save(STORAGE_KEYS.siteMaintenance, nextConfig);
    await flushPendingSyncNow({ throwOnRelationalFailure: false }).catch(() => { });
    if (options.logMessage) {
      appendSystemLog("admin.site_maintenance", options.logMessage, options.logDetails || {});
    }
    if (options.toastMessage) {
      toast(options.toastMessage);
    }
    state.adminDataLastSyncAt = Date.now();
    state.adminDataSyncError = "";
    state.skipNextRouteAnimation = true;
    render();
    return true;
  };

  const maintenanceExceptionUsers = getCloudNotificationTargetUsers(getUsers())
    .filter((entry) => String(entry?.role || "").trim().toLowerCase() !== "admin");
  const maintenanceExceptionSearchInput = appEl.querySelector("#admin-site-maintenance-exception-search");
  const maintenanceExceptionHiddenInput = appEl.querySelector("#admin-site-maintenance-exception-user-id");
  const maintenanceExceptionSuggestions = appEl.querySelector("#admin-site-maintenance-exception-suggestions");
  const maintenanceExceptionAddButton = appEl.querySelector("[data-action='admin-site-maintenance-add-exception']");

  const renderMaintenanceExceptionSuggestions = (query = "") => {
    if (!(maintenanceExceptionSearchInput instanceof HTMLInputElement) || !(maintenanceExceptionSuggestions instanceof HTMLElement)) {
      return;
    }
    const normalizedQuery = String(query || "").trim();
    const matches = searchUsersForNotificationTarget(normalizedQuery, maintenanceExceptionUsers, 8);
    if (!matches.length) {
      maintenanceExceptionSuggestions.innerHTML = "";
      maintenanceExceptionSuggestions.hidden = true;
      return;
    }
    const activeId = maintenanceExceptionHiddenInput instanceof HTMLInputElement
      ? String(maintenanceExceptionHiddenInput.value || "").trim()
      : "";
    maintenanceExceptionSuggestions.innerHTML = matches
      .map((entry) => {
        const userId = String(getUserProfileId(entry) || entry?.id || "").trim();
        if (!userId) {
          return "";
        }
        const isActive = activeId === userId;
        return `
          <button
            type="button"
            class="admin-user-suggestion${isActive ? " is-active" : ""}"
            data-action="admin-site-maintenance-pick-user"
            data-user-id="${escapeHtml(userId)}"
            role="option"
            aria-selected="${isActive ? "true" : "false"}"
          >
            <span class="admin-user-suggestion-name">${escapeHtml(String(entry?.name || entry?.full_name || "").trim() || "User")}</span>
            <span class="admin-user-suggestion-meta">${escapeHtml([
          String(entry?.email || "").trim() || "No email",
          String(entry?.phone || "").trim() || "No phone",
          String(entry?.role || "student").trim() || "student",
        ].join(" • "))}</span>
          </button>
        `;
      })
      .join("");
    maintenanceExceptionSuggestions.hidden = false;
  };

  maintenanceExceptionSearchInput?.addEventListener("input", () => {
    if (maintenanceExceptionHiddenInput instanceof HTMLInputElement) {
      maintenanceExceptionHiddenInput.value = "";
    }
    renderMaintenanceExceptionSuggestions(maintenanceExceptionSearchInput.value);
  });

  maintenanceExceptionSearchInput?.addEventListener("focus", () => {
    renderMaintenanceExceptionSuggestions(maintenanceExceptionSearchInput.value);
  });

  maintenanceExceptionSuggestions?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    const button = target.closest("[data-action='admin-site-maintenance-pick-user']");
    if (!(button instanceof HTMLButtonElement)) {
      return;
    }
    const userId = String(button.getAttribute("data-user-id") || "").trim();
    const selectedUser = userId ? findUserByNotificationTargetId(userId, maintenanceExceptionUsers) : null;
    if (!(maintenanceExceptionSearchInput instanceof HTMLInputElement) || !(maintenanceExceptionHiddenInput instanceof HTMLInputElement)) {
      return;
    }
    maintenanceExceptionHiddenInput.value = userId;
    maintenanceExceptionSearchInput.value = selectedUser ? getNotificationTargetSearchDisplayLabel(selectedUser) : "";
    if (maintenanceExceptionSuggestions instanceof HTMLElement) {
      maintenanceExceptionSuggestions.hidden = true;
    }
  });

  maintenanceExceptionSearchInput?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") {
      return;
    }
    event.preventDefault();
    const firstSuggestion = appEl.querySelector("[data-action='admin-site-maintenance-pick-user']");
    if (firstSuggestion instanceof HTMLButtonElement) {
      firstSuggestion.click();
      return;
    }
    if (maintenanceExceptionAddButton instanceof HTMLButtonElement) {
      maintenanceExceptionAddButton.click();
    }
  });

  maintenanceExceptionAddButton?.addEventListener("click", async () => {
    if (!(maintenanceExceptionSearchInput instanceof HTMLInputElement) || !(maintenanceExceptionHiddenInput instanceof HTMLInputElement)) {
      return;
    }
    const config = getSiteMaintenanceConfig();
    let selectedId = String(maintenanceExceptionHiddenInput.value || "").trim();
    if (!selectedId) {
      const selectedUser = findUserByNotificationTargetQuery(maintenanceExceptionSearchInput.value, maintenanceExceptionUsers);
      selectedId = String(getUserProfileId(selectedUser) || selectedUser?.id || "").trim();
    }
    if (!selectedId) {
      toast("Choose a valid user to add as an exception.");
      return;
    }
    if (config.allowedUserIds.includes(selectedId)) {
      toast("This user is already in the exception list.");
      return;
    }
    const selectedUser = findUserByNotificationTargetId(selectedId, maintenanceExceptionUsers);
    const nextConfig = normalizeSiteMaintenanceConfig({
      ...config,
      allowedUserIds: [...config.allowedUserIds, selectedId],
      updatedAt: nowISO(),
      updatedById: String(getCurrentUser()?.id || "").trim(),
      updatedByName: String(getCurrentUser()?.name || getCurrentUser()?.email || "Admin").trim() || "Admin",
    });
    await persistSiteMaintenanceConfig(nextConfig, {
      logMessage: "Site maintenance exception added.",
      logDetails: {
        exceptionUserId: selectedId,
        exceptionUser: selectedUser ? getNotificationTargetSearchDisplayLabel(selectedUser) : "",
      },
      toastMessage: "User exception added.",
    });
  });

  appEl.querySelectorAll("[data-action='admin-site-maintenance-remove-exception']").forEach((button) => {
    button.addEventListener("click", async () => {
      const userId = String(button.getAttribute("data-user-id") || "").trim();
      if (!userId) {
        return;
      }
      const config = getSiteMaintenanceConfig();
      if (!config.allowedUserIds.includes(userId)) {
        return;
      }
      const selectedUser = findUserByNotificationTargetId(userId, maintenanceExceptionUsers);
      const nextConfig = normalizeSiteMaintenanceConfig({
        ...config,
        allowedUserIds: config.allowedUserIds.filter((entry) => entry !== userId),
        updatedAt: nowISO(),
        updatedById: String(getCurrentUser()?.id || "").trim(),
        updatedByName: String(getCurrentUser()?.name || getCurrentUser()?.email || "Admin").trim() || "Admin",
      });
      await persistSiteMaintenanceConfig(nextConfig, {
        logMessage: "Site maintenance exception removed.",
        logDetails: {
          exceptionUserId: userId,
          exceptionUser: selectedUser ? getNotificationTargetSearchDisplayLabel(selectedUser) : "",
        },
        toastMessage: "User exception removed.",
      });
    });
  });

  appEl.querySelector("[data-action='admin-site-maintenance-reset']")?.addEventListener("click", () => {
    const form = appEl.querySelector("#admin-site-maintenance-form");
    if (!(form instanceof HTMLFormElement)) {
      return;
    }
    const titleField = form.elements.namedItem("title");
    const messageField = form.elements.namedItem("message");
    if (titleField instanceof HTMLInputElement) {
      titleField.value = DEFAULT_SITE_MAINTENANCE_TITLE;
    }
    if (messageField instanceof HTMLTextAreaElement) {
      messageField.value = DEFAULT_SITE_MAINTENANCE_MESSAGE;
    }
  });

  appEl.querySelector("#admin-site-maintenance-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== "admin") {
      return;
    }
    const form = event.currentTarget;
    if (!(form instanceof HTMLFormElement)) {
      return;
    }
    const formData = new FormData(form);
    const nextConfig = normalizeSiteMaintenanceConfig({
      enabled: formData.get("enabled") === "on",
      title: formData.get("title"),
      message: formData.get("message"),
      allowedUserIds: getSiteMaintenanceConfig().allowedUserIds,
      updatedAt: nowISO(),
      updatedById: String(currentUser.id || "").trim(),
      updatedByName: String(currentUser.name || currentUser.email || "Admin").trim() || "Admin",
    });
    const previousConfig = getSiteMaintenanceConfig();
    await persistSiteMaintenanceConfig(nextConfig, {
      logMessage: nextConfig.enabled ? "Site maintenance mode enabled." : "Site maintenance mode disabled.",
      logDetails: {
        enabled: nextConfig.enabled,
        previousEnabled: previousConfig.enabled,
        title: nextConfig.title,
        exceptionCount: nextConfig.allowedUserIds.length,
      },
      toastMessage: nextConfig.enabled ? "Website closed for users. Admin access remains available." : "Website reopened for users.",
    });
  });

  if (state.adminPage === "activity") {
    ensureAdminPresencePolling();
    if (!state.adminPresenceLoading && (!state.adminPresenceLastSyncAt || (Date.now() - state.adminPresenceLastSyncAt) > ADMIN_DATA_REFRESH_MS)) {
      refreshAdminPresenceSnapshot()
        .then((ok) => {
          if (ok) {
            state.skipNextRouteAnimation = true;
            render();
          }
        })
        .catch((error) => {
          console.warn("Could not refresh admin activity.", error?.message || error);
        });
    }
    appEl.querySelector("[data-action='refresh-admin-activity']")?.addEventListener("click", async () => {
      await refreshAdminPresenceSnapshot({ force: true });
      state.skipNextRouteAnimation = true;
      render();
    });
    appEl.querySelector("[data-action='download-admin-activity-report']")?.addEventListener("click", async () => {
      if (state.adminActivityReportRunning) {
        return;
      }
      state.adminActivityReportRunning = true;
      state.skipNextRouteAnimation = true;
      render();
      try {
        const fileName = await downloadAdminActivityReport();
        toast(`Downloaded ${fileName}.`);
      } catch (error) {
        toast(getErrorMessage(error, "Could not build the daily activity report."));
      } finally {
        state.adminActivityReportRunning = false;
        if (state.route === "admin" && state.adminPage === "activity") {
          state.skipNextRouteAnimation = true;
          render();
        }
      }
    });
  } else {
    clearAdminPresencePolling();
  }

  if (state.adminPage === "notifications") {
    const notificationForm = document.getElementById("admin-notification-form");
    const targetTypeSelect = document.getElementById("admin-notification-target-type");
    const targetTypeField = document.getElementById("admin-notification-target-type-field-wrap");
    const targetYearSelect = document.getElementById("admin-notification-target-year");
    const targetYearField = document.getElementById("admin-notification-target-year-field");
    const targetUserIdInput = document.getElementById("admin-notification-target-user-id");
    const targetUserSearchInput = document.getElementById("admin-notification-target-user-search");
    const targetUserSuggestions = document.getElementById("admin-notification-target-suggestions");
    const targetUserField = document.getElementById("admin-notification-target-user-field");
    const notificationUsers = getCloudNotificationTargetUsers(getUsers())
      .slice()
      .sort((a, b) => String(a?.name || "").localeCompare(String(b?.name || "")));

    const updateSelectedTargetUser = (userId, options = {}) => {
      const normalizedId = String(userId || "").trim();
      const selectedUser = normalizedId ? findUserByNotificationTargetId(normalizedId, notificationUsers) : null;
      const nextId = selectedUser ? String(getUserProfileId(selectedUser) || selectedUser.id || "").trim() : "";
      if (targetUserIdInput) {
        targetUserIdInput.value = nextId;
      }
      state.adminNotificationTargetUserId = nextId;
      if (!targetUserSearchInput) {
        return;
      }
      if (options.updateSearch !== false) {
        targetUserSearchInput.value = selectedUser ? getNotificationTargetSearchDisplayLabel(selectedUser) : "";
      }
      state.adminNotificationTargetQuery = String(targetUserSearchInput.value || "").trim();
    };

    const renderNotificationTargetSuggestions = () => {
      if (!targetUserSuggestions || !targetUserSearchInput) {
        return;
      }
      const targetType = normalizeNotificationAudienceType(targetTypeSelect?.value || "all");
      if (targetType !== "user") {
        targetUserSuggestions.hidden = true;
        targetUserSuggestions.innerHTML = "";
        return;
      }
      const selectedId = String(targetUserIdInput?.value || state.adminNotificationTargetUserId || "").trim();
      const query = String(targetUserSearchInput.value || "").trim();
      const matches = searchUsersForNotificationTarget(query, notificationUsers, 8);
      if (!matches.length) {
        targetUserSuggestions.hidden = true;
        targetUserSuggestions.innerHTML = "";
        return;
      }
      targetUserSuggestions.hidden = false;
      targetUserSuggestions.innerHTML = matches
        .map((entry) => {
          const userId = String(getUserProfileId(entry) || entry?.id || "").trim();
          if (!userId) {
            return "";
          }
          const roleLabel = entry.role === "admin" ? "admin" : "student";
          const canReceive = isUserAccessApproved(entry);
          const availabilityLabel = canReceive ? "" : " • pending approval";
          const isActive = selectedId === userId;
          return `
            <button
              type="button"
              class="admin-user-suggestion${isActive ? " is-active" : ""}"
              data-action="admin-notification-pick-user"
              data-user-id="${escapeHtml(userId)}"
              role="option"
              aria-selected="${isActive ? "true" : "false"}"
              ${canReceive ? "" : "disabled"}
            >
              <span class="admin-user-suggestion-name">${escapeHtml(String(entry?.name || "").trim() || "User")}</span>
              <span class="admin-user-suggestion-meta">${escapeHtml(String(entry?.email || "").trim() || "No email")} • ${escapeHtml(roleLabel)}${escapeHtml(availabilityLabel)}</span>
            </button>
          `;
        })
        .join("");
    };

    const syncNotificationAudienceUi = () => {
      const targetType = normalizeNotificationAudienceType(targetTypeSelect?.value || "all");
      if (state.adminNotificationTargetType !== targetType) {
        state.adminNotificationTargetType = targetType;
      }
      if (targetTypeField) {
        targetTypeField.classList.toggle("is-full-width", targetType !== "year");
      }
      if (targetYearField) {
        const showTargetYear = targetType === "year";
        targetYearField.hidden = !showTargetYear;
        targetYearField.classList.toggle("is-hidden", !showTargetYear);
      }
      if (targetUserField) {
        const showTargetUser = targetType === "user";
        targetUserField.hidden = !showTargetUser;
        targetUserField.classList.toggle("is-hidden", !showTargetUser);
      }
      const targetYear = normalizeAcademicYearOrNull(targetYearSelect?.value) ?? 1;
      state.adminNotificationTargetYear = targetYear;
      if (targetYearSelect) {
        targetYearSelect.value = String(targetYear);
        targetYearSelect.disabled = targetType !== "year" || state.adminNotificationSending;
      }
      if (targetUserSearchInput) {
        targetUserSearchInput.disabled = targetType !== "user" || state.adminNotificationSending;
      }
      if (targetUserIdInput && state.adminNotificationSending) {
        targetUserIdInput.disabled = true;
      }
      if (targetUserIdInput && !state.adminNotificationSending) {
        targetUserIdInput.disabled = false;
      }
      if (targetType !== "user") {
        updateSelectedTargetUser("", { updateSearch: true });
      } else if (targetUserIdInput && !targetUserIdInput.value) {
        state.adminNotificationTargetQuery = String(targetUserSearchInput?.value || "").trim();
      }
      renderNotificationTargetSuggestions();
    };

    targetTypeSelect?.addEventListener("change", syncNotificationAudienceUi);
    targetYearSelect?.addEventListener("change", () => {
      state.adminNotificationTargetYear = normalizeAcademicYearOrNull(targetYearSelect.value) ?? 1;
    });
    targetUserSearchInput?.addEventListener("input", () => {
      const typed = String(targetUserSearchInput.value || "").trim();
      const currentId = String(targetUserIdInput?.value || "").trim();
      if (currentId) {
        const currentUser = findUserByNotificationTargetId(currentId, notificationUsers);
        const currentLabel = currentUser ? getNotificationTargetSearchDisplayLabel(currentUser) : "";
        if (normalizeNotificationTargetSearchText(typed) !== normalizeNotificationTargetSearchText(currentLabel)) {
          updateSelectedTargetUser("", { updateSearch: false });
        }
      } else {
        state.adminNotificationTargetQuery = typed;
      }
      renderNotificationTargetSuggestions();
    });
    targetUserSearchInput?.addEventListener("focus", () => {
      renderNotificationTargetSuggestions();
    });
    targetUserSearchInput?.addEventListener("blur", () => {
      window.setTimeout(() => {
        if (!targetUserSuggestions) {
          return;
        }
        targetUserSuggestions.hidden = true;
      }, 120);
    });
    targetUserSuggestions?.addEventListener("mousedown", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      const pickButton = target.closest("[data-action='admin-notification-pick-user']");
      if (!(pickButton instanceof HTMLElement)) {
        return;
      }
      event.preventDefault();
      const pickedUserId = String(pickButton.getAttribute("data-user-id") || "").trim();
      if (!pickedUserId) {
        return;
      }
      updateSelectedTargetUser(pickedUserId, { updateSearch: true });
      renderNotificationTargetSuggestions();
      targetUserSuggestions.hidden = true;
    });
    syncNotificationAudienceUi();

    appEl.querySelector("[data-action='admin-refresh-notifications']")?.addEventListener("click", async () => {
      const currentUser = getCurrentUser();
      if (!currentUser || currentUser.role !== "admin") {
        return;
      }
      if (typeof navigator !== "undefined" && navigator?.onLine === false) {
        toast("You are offline. Showing locally cached notifications.");
        return;
      }
      if (!isUuidValue(String(getUserProfileId(currentUser) || "").trim()) || !getRelationalClient()) {
        toast("No active Supabase admin session. Log out and sign in again.");
        return;
      }
      const refreshed = await hydrateRelationalNotifications(currentUser);
      if (refreshed) {
        state.adminDataLastSyncAt = Date.now();
      }
      toast(refreshed ? "Notifications refreshed." : "Could not refresh notifications from Supabase.");
      state.skipNextRouteAnimation = true;
      render();
    });

    notificationForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (state.adminNotificationSending) {
        return;
      }
      const currentUser = getCurrentUser();
      if (!currentUser || currentUser.role !== "admin") {
        return;
      }
      const data = new FormData(notificationForm);
      const targetType = normalizeNotificationAudienceType(data.get("targetType") || "all");
      const targetYear = normalizeAcademicYearOrNull(data.get("targetYear"));
      const targetUserQuery = String(data.get("targetUserQuery") || "").trim();
      let targetUserId = String(data.get("targetUserId") || "").trim();
      if (targetType === "user" && !targetUserId && targetUserQuery) {
        const matchedUser = findUserByNotificationTargetQuery(targetUserQuery, notificationUsers);
        const matchedUserId = String(getUserProfileId(matchedUser) || matchedUser?.id || "").trim();
        if (matchedUserId) {
          targetUserId = matchedUserId;
        }
      }
      const title = String(data.get("title") || "").trim();
      const body = String(data.get("body") || "").trim();
      if (!title || !body) {
        toast("Notification title and message are required.");
        return;
      }
      if (targetType === "user" && !targetUserId) {
        toast("Choose a target user or switch audience to all users.");
        return;
      }
      if (targetType === "year" && targetYear === null) {
        toast("Choose a valid target year group.");
        return;
      }
      const selectedTargetUser = targetType === "user"
        ? findUserByNotificationTargetId(targetUserId, notificationUsers)
        : null;
      if (targetType === "user" && !selectedTargetUser) {
        toast("Please choose a valid user from suggestions.");
        return;
      }
      if (selectedTargetUser && !isUserAccessApproved(selectedTargetUser)) {
        toast("Target user is pending approval and cannot receive notifications yet.");
        return;
      }
      const selectedTargetProfileId = selectedTargetUser
        ? String(getUserProfileId(selectedTargetUser) || "").trim()
        : "";
      const selectedYearAudienceUsers = targetType === "year"
        ? getNotificationYearAudienceUsers(targetYear, notificationUsers)
        : [];
      if (targetType === "year" && !selectedYearAudienceUsers.length) {
        toast(`No approved students found for ${formatAcademicYearAudienceLabel(targetYear)}.`);
        return;
      }
      const resolvedTargetUserId = targetType === "user"
        ? (selectedTargetProfileId || targetUserId)
        : "";
      const resolvedTargetYear = targetType === "year" ? targetYear : null;
      state.adminNotificationTargetType = targetType;
      state.adminNotificationTargetUserId = resolvedTargetUserId;
      state.adminNotificationTargetQuery = targetType === "user" ? targetUserQuery : "";
      state.adminNotificationTargetYear = resolvedTargetYear ?? (normalizeAcademicYearOrNull(state.adminNotificationTargetYear) ?? 1);
      state.adminNotificationTitle = title;
      state.adminNotificationBody = body;
      state.adminNotificationSending = true;

      let localNotification = null;
      try {
        const externalId = buildNotificationExternalId({
          targetType,
          targetYear: resolvedTargetYear,
          baseId: crypto.randomUUID(),
        });
        localNotification = normalizeNotificationRecord({
          id: externalId,
          targetType,
          targetUserId: resolvedTargetUserId,
          targetYear: resolvedTargetYear,
          title,
          body,
          createdAt: nowISO(),
          createdById: String(currentUser.id || "").trim(),
          createdByName: String(currentUser.name || "Admin").trim() || "Admin",
          readByUserIds: [],
        });
        if (!localNotification) {
          throw new Error("Could not create notification payload.");
        }

        const currentNotifications = getNotifications();
        saveNotificationsLocal([localNotification, ...currentNotifications]);
        queueNotificationForCloudDelivery(localNotification);
      } catch (error) {
        state.adminNotificationSending = false;
        toast(`Could not send notification: ${getErrorMessage(error, "Unknown error.")}`);
        state.skipNextRouteAnimation = true;
        render();
        return;
      }

      state.adminNotificationSending = false;
      state.adminNotificationTargetType = "all";
      state.adminNotificationTargetUserId = "";
      state.adminNotificationTargetQuery = "";
      state.adminNotificationTargetYear = normalizeAcademicYearOrNull(targetYear) ?? 1;
      state.adminNotificationTitle = "";
      state.adminNotificationBody = "";
      state.adminDataLastSyncAt = Date.now();
      state.skipNextRouteAnimation = true;
      render();

      const deliveryResult = await flushPendingNotificationOutbox({
        user: currentUser,
        users: notificationUsers,
        targetNotificationIds: [localNotification.id],
      });
      const deliveredNow = deliveryResult.deliveredIds.includes(String(localNotification.id || "").trim());
      if (deliveredNow) {
        if (targetType === "user") {
          const deliveredLabel = selectedTargetUser
            ? getNotificationTargetSearchDisplayLabel(selectedTargetUser)
            : "selected user";
          toast(`Notification delivered to ${deliveredLabel}.`);
        } else if (targetType === "year") {
          const deliveredLabel = formatAcademicYearAudienceLabel(targetYear);
          toast(`Notification delivered to ${deliveredLabel}.`);
        } else {
          toast("Notification delivered.");
        }
      } else if (deliveryResult.message) {
        toast(`Notification saved locally. Cloud delivery queued: ${deliveryResult.message}`);
      } else {
        toast("Notification saved locally. Cloud delivery is queued and will retry automatically.");
      }
      if (state.route === "admin" && state.adminPage === "notifications") {
        state.skipNextRouteAnimation = true;
        render();
      }
    });
  }

  const curriculumFilterForm = document.getElementById("admin-curriculum-filter-form");
  const curriculumYearSelect = curriculumFilterForm?.querySelector("select[name='curriculumYear']");
  const curriculumSemesterSelect = curriculumFilterForm?.querySelector("select[name='curriculumSemester']");
  const curriculumSearchInput = document.getElementById("admin-curriculum-search");
  const syncCurriculumSelection = () => {
    state.adminCurriculumYear = sanitizeAcademicYear(curriculumYearSelect?.value || 1);
    state.adminCurriculumSemester = sanitizeAcademicSemester(curriculumSemesterSelect?.value || 1);
    state.skipNextRouteAnimation = true;
    render();
  };
  curriculumYearSelect?.addEventListener("change", syncCurriculumSelection);
  curriculumSemesterSelect?.addEventListener("change", syncCurriculumSelection);
  curriculumSearchInput?.addEventListener("input", () => {
    const nextValue = String(curriculumSearchInput.value || "");
    state.adminCourseSearch = nextValue;
    if (adminCourseSearchDebounce) {
      window.clearTimeout(adminCourseSearchDebounce);
    }
    adminCourseSearchDebounce = window.setTimeout(() => {
      adminCourseSearchDebounce = null;
      state.skipNextRouteAnimation = true;
      render();
      const nextSearchInput = document.getElementById("admin-curriculum-search");
      if (nextSearchInput instanceof HTMLInputElement) {
        nextSearchInput.focus();
        const cursorPos = nextValue.length;
        nextSearchInput.setSelectionRange(cursorPos, cursorPos);
      }
    }, 140);
  });

  const curriculumAddForm = document.getElementById("admin-curriculum-add-form");
  curriculumAddForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(curriculumAddForm);
    const newCourseName = String(data.get("newCourseName") || "").trim();
    if (!newCourseName) {
      toast("Course name is required.");
      return;
    }
    if (isRemovedCurriculumCourse(newCourseName)) {
      toast("This course is removed and cannot be added.");
      return;
    }

    const year = sanitizeAcademicYear(state.adminCurriculumYear || 1);
    const semester = sanitizeAcademicSemester(state.adminCurriculumSemester || 1);
    const existing = O6U_CURRICULUM[year]?.[semester] || [];
    if (existing.some((course) => course.toLowerCase() === newCourseName.toLowerCase())) {
      toast("This course already exists in the selected semester.");
      return;
    }

    const nextCurriculum = deepClone(O6U_CURRICULUM);
    nextCurriculum[year][semester].push(newCourseName);
    applyCurriculumUpdate(nextCurriculum);
    state.adminCourseSearch = "";
    state.adminCourseFocus = newCourseName;
    try {
      await flushPendingSyncNow();
      toast("Course added.");
      state.skipNextRouteAnimation = true;
      render();
    } catch (syncError) {
      toast(`Course added locally, but DB sync failed: ${getErrorMessage(syncError, "Sync failed.")}`);
    }
  });

  appEl.querySelectorAll("[data-action='course-topic-manager-close']").forEach((button) => {
    button.addEventListener("click", () => {
      state.adminCourseTopicModalCourse = "";
      state.adminCourseTopicGroupCreateModalOpen = false;
      state.adminCourseTopicInlineCreateOpen = false;
      state.skipNextRouteAnimation = true;
      render();
    });
  });
  appEl.querySelectorAll(".admin-course-topic-modal").forEach((modal) => {
    modal.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") {
        return;
      }
      if (state.adminCourseTopicGroupCreateModalOpen) {
        state.adminCourseTopicGroupCreateModalOpen = false;
        state.skipNextRouteAnimation = true;
        render();
        return;
      }
      if (state.adminCourseTopicInlineCreateOpen) {
        state.adminCourseTopicInlineCreateOpen = false;
        state.skipNextRouteAnimation = true;
        render();
        return;
      }
      state.adminCourseTopicModalCourse = "";
      state.adminCourseTopicGroupCreateModalOpen = false;
      state.adminCourseTopicInlineCreateOpen = false;
      state.skipNextRouteAnimation = true;
      render();
    });
  });

  appEl.querySelectorAll("[data-action='curriculum-rename']").forEach((button) => {
    button.addEventListener("click", async () => {
      const row = button.closest("[data-course-index]");
      if (!row) return;

      const index = Number(row.getAttribute("data-course-index"));
      const input = row.querySelector("[data-field='curriculumCourseName']");
      const newName = String(input?.value || "").trim();
      const year = sanitizeAcademicYear(state.adminCurriculumYear || 1);
      const semester = sanitizeAcademicSemester(state.adminCurriculumSemester || 1);
      const currentCourses = O6U_CURRICULUM[year]?.[semester] || [];
      const oldName = currentCourses[index];

      if (!oldName) return;
      if (!newName) {
        toast("Course name cannot be empty.");
        return;
      }
      if (isRemovedCurriculumCourse(newName)) {
        toast("This course is removed and cannot be used.");
        return;
      }
      if (newName === oldName) {
        toast("No changes to save.");
        return;
      }
      if (currentCourses.some((course, idx) => idx !== index && course.toLowerCase() === newName.toLowerCase())) {
        toast("Another course with this name already exists.");
        return;
      }

      const nextCurriculum = deepClone(O6U_CURRICULUM);
      nextCurriculum[year][semester][index] = newName;
      applyCurriculumUpdate(nextCurriculum, { renamedFrom: oldName, renamedTo: newName });
      if (state.adminCourseFocus === oldName) {
        state.adminCourseFocus = newName;
      }
      if (state.adminCourseTopicModalCourse === oldName) {
        state.adminCourseTopicModalCourse = newName;
      }
      try {
        await flushPendingSyncNow();
        toast("Course name updated.");
        state.skipNextRouteAnimation = true;
        render();
      } catch (syncError) {
        toast(`Course updated locally, but DB sync failed: ${getErrorMessage(syncError, "Sync failed.")}`);
      }
    });
  });

  appEl.querySelectorAll("[data-action='curriculum-delete']").forEach((button) => {
    button.addEventListener("click", async () => {
      const row = button.closest("[data-course-index]");
      if (!row) return;

      const index = Number(row.getAttribute("data-course-index"));
      const year = sanitizeAcademicYear(state.adminCurriculumYear || 1);
      const semester = sanitizeAcademicSemester(state.adminCurriculumSemester || 1);
      const currentCourses = O6U_CURRICULUM[year]?.[semester] || [];
      const removedCourse = currentCourses[index];
      if (!removedCourse) return;

      if (currentCourses.length <= 1) {
        toast("Each semester must keep at least one course.");
        return;
      }
      if (!window.confirm(`Delete course "${removedCourse}"?`)) {
        return;
      }

      const nextCurriculum = deepClone(O6U_CURRICULUM);
      nextCurriculum[year][semester].splice(index, 1);
      const replacementCourse = nextCurriculum[year][semester][0] || CURRICULUM_COURSE_LIST[0] || removedCourse;
      applyCurriculumUpdate(nextCurriculum, { removedCourse, replacementCourse });
      if (state.adminCourseFocus === removedCourse) {
        state.adminCourseFocus = replacementCourse;
      }
      if (state.adminCourseTopicModalCourse === removedCourse) {
        state.adminCourseTopicModalCourse = "";
        state.adminCourseTopicGroupCreateModalOpen = false;
        state.adminCourseTopicInlineCreateOpen = false;
      }
      try {
        await flushPendingSyncNow();
        toast("Course deleted.");
        state.skipNextRouteAnimation = true;
        render();
      } catch (syncError) {
        toast(`Course deleted locally, but DB sync failed: ${getErrorMessage(syncError, "Sync failed.")}`);
      }
    });
  });

  const adminCoursesSection = document.getElementById("admin-courses-section");
  const adminCourseDetailsModal = appEl.querySelector(".admin-course-topic-modal");
  const adminCourseInteractionRoots = [adminCoursesSection, adminCourseDetailsModal].filter(Boolean);
  const handleAdminCourseAction = async (event) => {
    const actionEl = event.target.closest("[data-action]");
    if (!actionEl) return;

    const action = actionEl.getAttribute("data-action");
    if (
      ![
        "admin-focus-course",
        "course-topic-manager-open",
        "course-topic-manager-close",
        "course-topic-inline-open",
        "course-topic-inline-add",
        "course-topic-save",
        "course-topic-remove",
        "course-topic-clear",
        "course-notebook-link-save",
        "course-question-edit",
        "course-question-clear",
      ].includes(action)
    ) {
      return;
    }

    if (action === "course-topic-manager-close") {
      state.adminCourseTopicModalCourse = "";
      state.adminCourseTopicGroupCreateModalOpen = false;
      state.adminCourseTopicInlineCreateOpen = false;
      state.skipNextRouteAnimation = true;
      render();
      return;
    }

    const row = actionEl.closest("[data-course-index]");
    if (!row) return;
    const index = Number(row.getAttribute("data-course-index"));
    const year = sanitizeAcademicYear(state.adminCurriculumYear || 1);
    const semester = sanitizeAcademicSemester(state.adminCurriculumSemester || 1);
    const currentCourses = O6U_CURRICULUM[year]?.[semester] || [];
    const course = currentCourses[index];
    if (!course) return;

    if (action === "admin-focus-course" || action === "course-topic-manager-open") {
      state.adminCourseFocus = course;
      state.adminCourseTopicModalCourse = course;
      state.adminCourseTopicInlineCreateOpen = false;
      state.skipNextRouteAnimation = true;
      render();
      return;
    }

    if (action === "course-question-edit") {
      state.adminPage = "questions";
      state.adminCourseTopicModalCourse = "";
      state.adminCourseTopicGroupCreateModalOpen = false;
      state.adminCourseTopicInlineCreateOpen = false;
      state.adminFilters.course = course;
      state.adminFilters.topic = "";
      state.adminEditorCourse = course;
      state.adminEditorTopic = resolveDefaultTopic(course);
      state.adminEditQuestionId = null;
      state.adminQuestionModalOpen = false;
      state.skipNextRouteAnimation = true;
      render();
      return;
    }

    if (action === "course-notebook-link-save") {
      const input = row.querySelector("input[data-field='courseNotebookLink']");
      const entered = String(input?.value || "").trim();
      const normalizedLink = normalizeCourseNotebookLink(entered);
      if (entered && !normalizedLink) {
        toast("Enter a valid URL starting with http:// or https://.");
        return;
      }
      const nextLinks = { ...COURSE_NOTEBOOK_LINKS };
      if (normalizedLink) {
        nextLinks[course] = normalizedLink;
      } else {
        delete nextLinks[course];
      }
      COURSE_NOTEBOOK_LINKS = normalizeCourseNotebookLinkMap(nextLinks);
      save(STORAGE_KEYS.courseNotebookLinks, COURSE_NOTEBOOK_LINKS);
      if (input) {
        input.value = COURSE_NOTEBOOK_LINKS[course] || "";
      }
      try {
        await flushPendingSyncNow({ throwOnRelationalFailure: false });
        toast(normalizedLink ? "Ask AI link saved." : "Ask AI link removed.");
      } catch (syncError) {
        toast(`Link saved locally, but cloud sync failed: ${getErrorMessage(syncError, "Sync failed.")}`);
      }
      return;
    }

    const rerenderCoursesPage = () => {
      state.skipNextRouteAnimation = true;
      render();
    };

    if (action === "course-topic-inline-open") {
      state.adminCourseTopicInlineCreateOpen = true;
      rerenderCoursesPage();
      return;
    }

    if (action === "course-question-clear") {
      const questions = getQuestions();
      const courseQuestions = questions.filter((question) => getQbankCourseTopicMeta(question).course === course);
      if (!courseQuestions.length) {
        toast("This course has no questions to clear.");
        return;
      }
      if (!window.confirm(`Delete all ${courseQuestions.length} question(s) from "${course}"?`)) {
        return;
      }
      const removeSet = new Set(courseQuestions.map((question) => question.id));
      const nextQuestions = questions.filter((question) => !removeSet.has(question.id));
      if (state.adminEditQuestionId && removeSet.has(state.adminEditQuestionId)) {
        state.adminEditQuestionId = null;
      }
      save(STORAGE_KEYS.questions, nextQuestions);
      try {
        await flushPendingSyncNow();
        toast(`Deleted ${removeSet.size} question(s) from ${course}.`);
        state.skipNextRouteAnimation = true;
        render();
      } catch (syncError) {
        toast(`Questions deleted locally, but DB sync failed: ${getErrorMessage(syncError, "Sync failed.")}`);
      }
      return;
    }

    if (action === "course-topic-clear") {
      const existingTopics = QBANK_COURSE_TOPICS[course] || [];
      if (!existingTopics.length) {
        toast("This course has no topics to clear.");
        return;
      }
      if (!window.confirm(`Delete all topics from "${course}"? Questions will be reassigned to the default topic.`)) {
        return;
      }
      applyCourseTopicsUpdate(course, [], { allowQuestionTopicCollapse: true });
      rerenderCoursesPage();
      try {
        await flushPendingSyncNow();
        toast(`Deleted ${existingTopics.length} topic(s) from ${course}.`);
      } catch (syncError) {
        toast(`Topics deleted locally, but DB sync failed: ${getErrorMessage(syncError, "Sync failed.")}`);
      }
      return;
    }

    if (action === "course-topic-inline-add") {
      const createRow = actionEl.closest("[data-role='course-topic-create-row']");
      const topicInput = createRow?.querySelector("input[data-field='newCourseTopicInline']");
      const groupInput = createRow?.querySelector("input[data-field='newCourseTopicGroupInline']");
      const topicName = String(topicInput?.value || "").trim();
      const requestedGroupName = String(groupInput?.value || "").trim();
      if (!topicName) {
        toast("Topic name is required.");
        return;
      }
      if (isRemovedTopicName(topicName)) {
        toast("This topic has been removed and cannot be added.");
        return;
      }

      const existingTopics = QBANK_COURSE_TOPICS[course] || [];
      if (existingTopics.some((topic) => topic.toLowerCase() === topicName.toLowerCase())) {
        toast("This topic already exists for the selected course.");
        return;
      }

      applyCourseTopicsUpdate(course, [...existingTopics, topicName]);
      if (requestedGroupName) {
        const canonicalGroupName = findMatchingCourseTopicGroupName(getCourseTopicGroups(course), requestedGroupName) || requestedGroupName;
        setCourseTopicParentGroup(course, topicName, canonicalGroupName);
      }
      state.adminCourseTopicInlineCreateOpen = false;
      rerenderCoursesPage();
      try {
        await flushPendingSyncNow({ throwOnRelationalFailure: false });
        toast(requestedGroupName ? "Topic and subgroup saved." : "Topic added.");
      } catch (syncError) {
        toast(`Topic added locally, but DB sync failed: ${getErrorMessage(syncError, "Sync failed.")}`);
      }
      return;
    }

    const topicIndex = Number(actionEl.getAttribute("data-topic-index"));
    const topics = QBANK_COURSE_TOPICS[course] || [];
    const currentTopic = topics[topicIndex];
    if (!currentTopic) return;

    if (action === "course-topic-save") {
      const topicRow = actionEl.closest("[data-role='course-topic-row']");
      const topicInput = topicRow?.querySelector("input[data-field='courseTopicName']");
      const groupInput = topicRow?.querySelector("input[data-field='courseTopicGroupName']");
      const nextTopic = String(topicInput?.value || "").trim();
      const requestedGroupName = String(groupInput?.value || "").trim();
      const currentGroupName = getTopicGroupNameForCourseTopic(course, currentTopic);
      if (!nextTopic) {
        toast("Topic name is required.");
        return;
      }
      if (isRemovedTopicName(nextTopic)) {
        toast("This topic has been removed and cannot be used.");
        return;
      }
      if (topics.some((topic, idx) => idx !== topicIndex && topic.toLowerCase() === nextTopic.toLowerCase())) {
        toast("This topic name already exists.");
        return;
      }

      let changed = false;
      if (nextTopic !== currentTopic) {
        const nextTopics = [...topics];
        nextTopics[topicIndex] = nextTopic;
        applyCourseTopicsUpdate(course, nextTopics, { renamedFrom: currentTopic, renamedTo: nextTopic });
        changed = true;
      }

      const canonicalTopicName = nextTopic || currentTopic;
      const canonicalGroupName = requestedGroupName
        ? (findMatchingCourseTopicGroupName(getCourseTopicGroups(course), requestedGroupName) || requestedGroupName)
        : "";
      const resolvedCurrentGroupName = getTopicGroupNameForCourseTopic(course, canonicalTopicName);
      if (canonicalGroupName !== resolvedCurrentGroupName) {
        changed = setCourseTopicParentGroup(course, canonicalTopicName, canonicalGroupName) || changed;
      }

      if (!changed) {
        toast("No changes to save.");
        return;
      }
      rerenderCoursesPage();
      try {
        await flushPendingSyncNow({ throwOnRelationalFailure: false });
        toast("Topic updated.");
      } catch (syncError) {
        toast(`Topic updated locally, but DB sync failed: ${getErrorMessage(syncError, "Sync failed.")}`);
      }
      return;
    }

    if (topics.length <= 1) {
      toast("Each course must keep at least one topic.");
      return;
    }
    applyCourseTopicsUpdate(
      course,
      topics.filter((_, idx) => idx !== topicIndex),
      { allowQuestionTopicCollapse: true },
    );
    rerenderCoursesPage();
    try {
      await flushPendingSyncNow();
      toast("Topic removed.");
    } catch (syncError) {
      toast(`Topic removed locally, but DB sync failed: ${getErrorMessage(syncError, "Sync failed.")}`);
    }
  };
  const handleAdminCourseKeydown = (event) => {
    if (event.key === "Escape" && state.adminCourseTopicModalCourse) {
      if (state.adminCourseTopicGroupCreateModalOpen) {
        state.adminCourseTopicGroupCreateModalOpen = false;
        state.skipNextRouteAnimation = true;
        render();
        return;
      }
      if (state.adminCourseTopicInlineCreateOpen) {
        state.adminCourseTopicInlineCreateOpen = false;
        state.skipNextRouteAnimation = true;
        render();
        return;
      }
      state.adminCourseTopicModalCourse = "";
      state.adminCourseTopicGroupCreateModalOpen = false;
      state.adminCourseTopicInlineCreateOpen = false;
      state.skipNextRouteAnimation = true;
      render();
      return;
    }
    if (event.key !== "Enter") {
      return;
    }
    const target = event.target;
    if (!(target instanceof HTMLInputElement) && !(target instanceof HTMLTextAreaElement)) {
      return;
    }

    if (target.matches("input[data-field='newCourseTopicInline'], input[data-field='newCourseTopicGroupInline']")) {
      const createRow = target.closest("[data-role='course-topic-create-row']");
      const saveButton = createRow?.querySelector("[data-action='course-topic-inline-add']");
      if (!saveButton) {
        return;
      }
      event.preventDefault();
      saveButton.click();
      return;
    }

    if (target.matches("input[data-field='courseTopicName'], input[data-field='courseTopicGroupName']")) {
      const topicRow = target.closest("[data-role='course-topic-row']");
      const saveButton = topicRow?.querySelector("[data-action='course-topic-save']");
      if (!saveButton) {
        return;
      }
      event.preventDefault();
      saveButton.click();
      return;
    }

    if (target.matches("[data-field='curriculumCourseName']")) {
      const courseCard = target.closest("[data-course-index]");
      const saveButton = courseCard?.querySelector("[data-action='curriculum-rename']");
      if (!saveButton) {
        return;
      }
      event.preventDefault();
      saveButton.click();
      return;
    }

    if (target.matches("input[data-field='courseNotebookLink']")) {
      const courseCard = target.closest("[data-course-index]");
      const saveButton = courseCard?.querySelector("[data-action='course-notebook-link-save']");
      if (!saveButton) {
        return;
      }
      event.preventDefault();
      saveButton.click();
    }
  };
  adminCourseInteractionRoots.forEach((root) => {
    root.addEventListener("click", handleAdminCourseAction);
    root.addEventListener("keydown", handleAdminCourseKeydown);
  });

  const addUserDisclosure = document.getElementById("admin-add-user-disclosure");
  addUserDisclosure?.addEventListener("toggle", () => {
    if (!(addUserDisclosure instanceof HTMLDetailsElement)) {
      return;
    }
    state.adminAddUserPanelOpen = addUserDisclosure.open;
  });

  const addUserForm = document.getElementById("admin-add-user-form");
  addUserForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(addUserForm);
    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "")
      .trim()
      .toLowerCase();
    const password = String(data.get("password") || "").trim();
    const role = String(data.get("role") || "student");
    const academicYear = sanitizeAcademicYear(data.get("academicYear") || 1);
    const academicSemester = sanitizeAcademicSemester(data.get("academicSemester") || 1);

    if (!name || !email || !password) {
      toast("Name, email, and password are required.");
      return;
    }

    const users = getUsers();
    if (users.some((entry) => entry.email.toLowerCase() === email)) {
      toast("Email already exists.");
      return;
    }

    const normalizedRole = role === "admin" ? "admin" : "student";
    const assignedCourses =
      normalizedRole === "admin"
        ? [...allCourses]
        : getCurriculumCourses(academicYear, academicSemester);
    const newStudentAutoApproval = normalizedRole === "student"
      ? shouldAutoApproveStudentAccess({
        role: "student",
        phone: "",
        academicYear,
        academicSemester,
      })
      : false;
    const newUserApproved = normalizedRole === "admin" ? true : newStudentAutoApproval;

    users.push({
      id: makeId("u"),
      name,
      email,
      password,
      phone: "",
      role: normalizedRole,
      verified: true,
      isApproved: newUserApproved,
      approvedAt: newUserApproved ? nowISO() : null,
      approvedBy: newUserApproved ? (normalizedRole === "admin" ? "admin" : AUTO_APPROVAL_ACTOR) : null,
      assignedCourses,
      academicYear: normalizedRole === "student" ? academicYear : null,
      academicSemester: normalizedRole === "student" ? academicSemester : null,
      createdAt: nowISO(),
    });
    save(STORAGE_KEYS.users, users);
    state.adminAddUserPanelOpen = false;
    try {
      await flushPendingSyncNow();
      toast("User added.");
      render();
    } catch (syncError) {
      toast(`User added locally, but DB sync failed: ${getErrorMessage(syncError, "Sync failed.")}`);
      render();
    }
  });

  const autoApprovalToggle = document.getElementById("admin-auto-approval-toggle");
  autoApprovalToggle?.addEventListener("change", async (e) => {
    e.stopPropagation();
    const enabled = Boolean(autoApprovalToggle.checked);
    save(STORAGE_KEYS.autoApproveStudentAccess, enabled);
    try {
      await flushPendingSyncNow({ throwOnRelationalFailure: false });
    } catch {
      // Keep local state even if sync fails.
    }
    toast(enabled ? "Auto-approval enabled for new complete student accounts." : "Auto-approval disabled.");
    state.skipNextRouteAnimation = true;
    render();
  });

  appEl.querySelector("[data-action='approve-all-pending']")?.addEventListener("click", async () => {
    const current = getCurrentUser();
    const users = getUsers();
    const pendingUsers = users.filter((entry) => entry.role === "student" && !isUserAccessApproved(entry));
    const eligiblePendingUsers = pendingUsers.filter((entry) => hasCompleteStudentProfile(entry));
    const eligiblePendingUserIdSet = new Set(eligiblePendingUsers.map((entry) => String(entry.id || "").trim()).filter(Boolean));
    const pendingProfileIds = eligiblePendingUsers.map((entry) => getUserProfileId(entry)).filter((id) => isUuidValue(id));

    if (!pendingUsers.length) {
      toast("No pending requests found.");
      return;
    }
    if (!eligiblePendingUsers.length) {
      toast("Pending users must complete phone number, year, and semester before approval.");
      return;
    }

    const dbResult = await updateRelationalProfileApproval(pendingProfileIds, true);
    if (pendingProfileIds.length && !dbResult.ok) {
      toast(`Database update failed. ${dbResult.message}`);
      return;
    }

    const approvedProfileIds = new Set(dbResult.updatedIds || []);
    const skippedProfileIds = new Set(dbResult.skippedIds || []);
    let approvedCount = 0;
    let skippedCount = 0;
    users.forEach((entry) => {
      const entryId = String(entry.id || "").trim();
      if (
        entry.role !== "student"
        || isUserAccessApproved(entry)
        || !eligiblePendingUserIdSet.has(entryId)
      ) {
        return;
      }
      const authId = getUserProfileId(entry);
      if (isUuidValue(authId)) {
        if (!approvedProfileIds.has(authId)) {
          if (skippedProfileIds.has(authId)) {
            skippedCount += 1;
          }
          return;
        }
      }
      entry.isApproved = true;
      entry.approvedAt = nowISO();
      entry.approvedBy = current?.email || "admin";
      approvedCount += 1;
    });
    if (!approvedCount) {
      toast("Database update failed. No pending users were updated.");
      return;
    }

    save(STORAGE_KEYS.users, users);
    await syncUsersBackupState(users);
    const authAccessResult = await syncSupabaseAuthAccessForTargets([...approvedProfileIds], true, { users });
    try {
      await flushPendingSyncNow();
      toast(
        skippedCount
          ? `${approvedCount} pending account(s) approved. ${skippedCount} skipped (missing database profile).${describeAuthAccessSyncOutcome(authAccessResult)}`
          : `${approvedCount} pending account(s) approved.${describeAuthAccessSyncOutcome(authAccessResult)}`,
      );
      render();
    } catch (syncError) {
      toast(`Approval updated locally, but DB sync failed: ${getErrorMessage(syncError, "Sync failed.")}`);
    }
  });

  const adminUsersSection = document.getElementById("admin-users-section");
  const adminUserFilterForm = document.getElementById("admin-user-filter-form");
  const adminUserSearchInput = document.getElementById("admin-user-search");
  const adminUserFilterYear = document.getElementById("admin-user-filter-year");
  const adminUserFilterSemester = document.getElementById("admin-user-filter-semester");
  const selectAllUsersInput = appEl.querySelector("[data-action='admin-select-all-users']");
  if (selectAllUsersInput instanceof HTMLInputElement) {
    selectAllUsersInput.indeterminate = selectAllUsersInput.dataset.indeterminate === "true";
  }

  const getVisibleSelectableUserIds = () => (
    adminUsersSection
      ? Array.from(adminUsersSection.querySelectorAll("input[type='checkbox'][data-action='admin-select-user'][data-user-id]:not(:disabled)"))
        .map((input) => String(input.getAttribute("data-user-id") || "").trim())
        .filter(Boolean)
      : []
  );
  const getVisibleSelectableUserIdSet = () => new Set(getVisibleSelectableUserIds());
  const getSelectedVisibleUserIds = () => normalizeAdminUserIdList(state.adminSelectedUserIds, getVisibleSelectableUserIdSet());
  const finishAdminUserBulkAction = () => {
    state.adminUserBulkActionRunning = false;
    state.skipNextRouteAnimation = true;
    render();
  };

  adminUserFilterForm?.addEventListener("submit", (event) => {
    event.preventDefault();
  });

  const syncAdminUserFilters = () => {
    state.adminUserFilterYear = String(adminUserFilterYear?.value || "");
    state.adminUserFilterSemester = String(adminUserFilterSemester?.value || "");
    state.skipNextRouteAnimation = true;
    render();
  };
  adminUserFilterYear?.addEventListener("change", syncAdminUserFilters);
  adminUserFilterSemester?.addEventListener("change", syncAdminUserFilters);

  adminUserSearchInput?.addEventListener("input", () => {
    const nextValue = String(adminUserSearchInput.value || "");
    state.adminUserSearch = nextValue;
    if (adminUserSearchDebounce) {
      window.clearTimeout(adminUserSearchDebounce);
    }
    adminUserSearchDebounce = window.setTimeout(() => {
      adminUserSearchDebounce = null;
      state.skipNextRouteAnimation = true;
      render();
      const nextSearchInput = document.getElementById("admin-user-search");
      if (nextSearchInput instanceof HTMLInputElement) {
        nextSearchInput.focus();
        const cursorPos = nextValue.length;
        nextSearchInput.setSelectionRange(cursorPos, cursorPos);
      }
    }, 140);
  });

  appEl.querySelector("[data-action='admin-users-clear-filters']")?.addEventListener("click", () => {
    state.adminUserSearch = "";
    state.adminUserFilterYear = "";
    state.adminUserFilterSemester = "";
    state.adminSelectedUserIds = [];
    if (adminUserSearchDebounce) {
      window.clearTimeout(adminUserSearchDebounce);
      adminUserSearchDebounce = null;
    }
    state.skipNextRouteAnimation = true;
    render();
  });

  adminUsersSection?.addEventListener("change", (event) => {
    const targetEl = event.target;
    if (!(targetEl instanceof Element)) {
      return;
    }
    const checkbox = targetEl.closest("input[type='checkbox'][data-action]");
    if (!(checkbox instanceof HTMLInputElement)) {
      return;
    }
    const action = String(checkbox.getAttribute("data-action") || "").trim();
    if (!["admin-select-user", "admin-select-all-users"].includes(action) || state.adminUserBulkActionRunning) {
      return;
    }
    if (action === "admin-select-all-users") {
      state.adminSelectedUserIds = checkbox.checked ? getVisibleSelectableUserIds() : [];
      state.skipNextRouteAnimation = true;
      render();
      return;
    }
    const userId = String(checkbox.getAttribute("data-user-id") || "").trim();
    if (!userId) {
      return;
    }
    const visibleUserIdSet = getVisibleSelectableUserIdSet();
    if (!visibleUserIdSet.has(userId)) {
      return;
    }
    const selectedSet = new Set(getSelectedVisibleUserIds());
    if (checkbox.checked) {
      selectedSet.add(userId);
    } else {
      selectedSet.delete(userId);
    }
    state.adminSelectedUserIds = normalizeAdminUserIdList([...selectedSet], visibleUserIdSet);
    state.skipNextRouteAnimation = true;
    render();
  });

  adminUsersSection?.addEventListener("click", async (event) => {
    const targetEl = event.target;
    if (!(targetEl instanceof Element)) {
      return;
    }
    const actionEl = targetEl.closest("[data-action]");
    if (!actionEl) {
      return;
    }
    const action = String(actionEl.getAttribute("data-action") || "").trim();
    if (!["admin-clear-user-selection", "admin-bulk-deactivate-users"].includes(action)) {
      return;
    }

    if (action === "admin-clear-user-selection") {
      if (state.adminUserBulkActionRunning || !state.adminSelectedUserIds.length) {
        return;
      }
      state.adminSelectedUserIds = [];
      state.skipNextRouteAnimation = true;
      render();
      return;
    }

    if (state.adminUserBulkActionRunning) {
      return;
    }
    const selectedIds = getSelectedVisibleUserIds();
    if (!selectedIds.length) {
      toast("Select at least one user.");
      return;
    }

    const selectedIdSet = new Set(selectedIds);
    const current = getCurrentUser();
    const users = getUsers();
    const selectedUsers = users.filter((entry) => selectedIdSet.has(String(entry.id || "").trim()));
    const deactivatableUsers = selectedUsers.filter((entry) => canBulkSelectAdminUser(entry, current));
    if (!deactivatableUsers.length) {
      toast("Selected accounts cannot be suspended.");
      return;
    }

    const activeUsers = deactivatableUsers.filter((entry) => isUserAccessApproved(entry));
    if (!activeUsers.length) {
      toast("Selected accounts are already suspended.");
      return;
    }
    if (!window.confirm(`Suspend ${activeUsers.length} selected account(s)?`)) {
      return;
    }

    state.adminUserBulkActionRunning = true;
    state.skipNextRouteAnimation = true;
    render();

    try {
      const profileIds = activeUsers.map((entry) => getUserProfileId(entry)).filter((id) => isUuidValue(id));
      const dbResult = await updateRelationalProfileApproval(profileIds, false);
      const deactivationQueuedForSync = profileIds.length && !dbResult.ok && shouldAllowSupabaseManagedLocalFallback(dbResult.message);
      const updatedProfileIds = new Set(dbResult.updatedIds || []);
      const skippedProfileIds = new Set(dbResult.skippedIds || []);
      const fallbackProfileIds = new Set(
        profileIds.filter((profileId) => !updatedProfileIds.has(profileId) && (
          deactivationQueuedForSync
          || skippedProfileIds.has(profileId)
        )),
      );
      const hasQueuedFallback = deactivationQueuedForSync || fallbackProfileIds.size > 0;
      if (profileIds.length && !dbResult.ok && !updatedProfileIds.size && !fallbackProfileIds.size) {
        finishAdminUserBulkAction();
        toast(`Database update failed. ${dbResult.message}`);
        return;
      }
      let deactivatedCount = 0;
      let skippedCount = 0;
      let queuedCount = 0;
      users.forEach((entry) => {
        const entryId = String(entry.id || "").trim();
        if (!selectedIdSet.has(entryId) || !canBulkSelectAdminUser(entry, current) || !isUserAccessApproved(entry)) {
          return;
        }
        const profileId = String(getUserProfileId(entry) || "").trim();
        if (isUuidValue(profileId) && !updatedProfileIds.has(profileId) && !fallbackProfileIds.has(profileId)) {
          if (skippedProfileIds.has(profileId)) {
            skippedCount += 1;
          }
          return;
        }
        entry.isApproved = false;
        entry.approvedAt = null;
        entry.approvedBy = null;
        if (isUuidValue(profileId) && fallbackProfileIds.has(profileId)) {
          queuedCount += 1;
        }
        deactivatedCount += 1;
      });

      if (!deactivatedCount) {
        finishAdminUserBulkAction();
        toast("Selected users could not be suspended.");
        return;
      }

      save(STORAGE_KEYS.users, users);
      await syncUsersBackupState(users);
      const authAccessTargetIds = [...new Set([
        ...updatedProfileIds,
        ...fallbackProfileIds,
      ])];
      const authAccessResult = await syncSupabaseAuthAccessForTargets(authAccessTargetIds, false, {
        users,
        queueAll: deactivationQueuedForSync,
      });
      state.adminSelectedUserIds = [];
      try {
        await flushPendingSyncNow({ throwOnRelationalFailure: !hasQueuedFallback });
        finishAdminUserBulkAction();
        if (hasQueuedFallback) {
          toast(
            [
              `${deactivatedCount} account(s) suspended locally and queued for cloud sync.`,
              queuedCount ? `${queuedCount} queued.` : "",
              skippedCount ? `${skippedCount} skipped.` : "",
            ].filter(Boolean).join(" ")
              + describeAuthAccessSyncOutcome(authAccessResult),
          );
        } else {
          toast(
            skippedCount
              ? `${deactivatedCount} account(s) suspended. ${skippedCount} skipped.${describeAuthAccessSyncOutcome(authAccessResult)}`
              : `${deactivatedCount} account(s) suspended.${describeAuthAccessSyncOutcome(authAccessResult)}`,
          );
        }
      } catch (syncError) {
        finishAdminUserBulkAction();
        toast(`Accounts updated locally, but DB sync failed: ${getErrorMessage(syncError, "Sync failed.")}`);
      }
    } catch (bulkError) {
      finishAdminUserBulkAction();
      toast(`Could not suspend selected accounts: ${getErrorMessage(bulkError, "Action failed.")}`);
    }
  });

  const setEnrollmentSaveButtonBusy = (button, busy, busyLabel = "Saving...") => {
    if (!button) {
      return;
    }
    if (!button.dataset.baseLabel) {
      button.dataset.baseLabel = button.textContent || "Save enrollment";
    }
    button.disabled = busy;
    button.classList.toggle("is-loading", busy);
    button.innerHTML = busy
      ? `<span class="inline-loader" aria-hidden="true"></span><span>${escapeHtml(busyLabel)}</span>`
      : button.dataset.baseLabel;
  };

  const saveUserEnrollmentFromRow = async (row, options = {}) => {
    const mode = options?.mode === "auto" ? "auto" : "manual";
    const userId = row?.getAttribute("data-user-id");
    if (!row || !userId) {
      return false;
    }
    if (row.dataset.enrollmentSaving === "1") {
      return false;
    }

    const saveButton = row.querySelector("[data-action='save-user-enrollment']");
    row.dataset.enrollmentSaving = "1";
    setEnrollmentSaveButtonBusy(saveButton, true, mode === "auto" ? "Auto-saving..." : "Saving...");

    try {
      const users = getUsers();
      const idx = users.findIndex((entry) => entry.id === userId);
      if (idx === -1) {
        toast("Account not found.");
        return false;
      }

      const role = users[idx].role;
      const previousYear = role === "student" ? normalizeAcademicYearOrNull(users[idx].academicYear) : null;
      const previousSemester = role === "student" ? normalizeAcademicSemesterOrNull(users[idx].academicSemester) : null;
      let didEnrollmentTermChange = false;
      if (role === "student") {
        const yearSelect = row.querySelector("select[data-field='academicYear']");
        const semesterSelect = row.querySelector("select[data-field='academicSemester']");
        const year = normalizeAcademicYearOrNull(yearSelect?.value);
        const semester = normalizeAcademicSemesterOrNull(semesterSelect?.value);
        if (year === null || semester === null) {
          if (mode === "manual") {
            toast("Select both year and semester before saving.");
          }
          return false;
        }

        users[idx].academicYear = year;
        users[idx].academicSemester = semester;
        users[idx].assignedCourses = getCurriculumCourses(year, semester);
        didEnrollmentTermChange = previousYear !== year || previousSemester !== semester;
        if (!hasCompleteStudentProfile(users[idx])) {
          users[idx].isApproved = false;
          users[idx].approvedAt = null;
          users[idx].approvedBy = null;
        } else if (isAutoApproveStudentAccessEnabled()) {
          users[idx].isApproved = true;
          users[idx].approvedAt = users[idx].approvedAt || nowISO();
          users[idx].approvedBy = users[idx].approvedBy || AUTO_APPROVAL_ACTOR;
        }
      } else {
        users[idx].academicYear = null;
        users[idx].academicSemester = null;
        users[idx].assignedCourses = [...allCourses];
        users[idx].isApproved = true;
        users[idx].approvedAt = users[idx].approvedAt || nowISO();
        users[idx].approvedBy = users[idx].approvedBy || "admin";
      }

      save(STORAGE_KEYS.users, users);
      await flushPendingSyncNow();
      if (mode === "manual") {
        toast(didEnrollmentTermChange
          ? "Enrollment saved. Previous term data was archived for this account and will return if the year/semester is restored."
          : "Enrollment saved.");
      }
      state.skipNextRouteAnimation = true;
      render();
      return true;
    } catch (syncError) {
      toast(`Enrollment saved locally, but DB sync failed: ${getErrorMessage(syncError, "Sync failed.")}`);
      return false;
    } finally {
      row.dataset.enrollmentSaving = "0";
      setEnrollmentSaveButtonBusy(saveButton, false);
    }
  };

  appEl.querySelectorAll("tr[data-user-id]").forEach((row) => {
    const yearSelect = row.querySelector("select[data-field='academicYear']");
    const semesterSelect = row.querySelector("select[data-field='academicSemester']");
    if (!yearSelect && !semesterSelect) {
      return;
    }
    const autoSaveEnrollment = () => {
      saveUserEnrollmentFromRow(row, { mode: "auto" }).catch((error) => {
        console.warn("Auto enrollment save failed.", error?.message || error);
      });
    };
    yearSelect?.addEventListener("change", autoSaveEnrollment);
    semesterSelect?.addEventListener("change", autoSaveEnrollment);
  });

  appEl.querySelectorAll("[data-action='save-user-enrollment']").forEach((button) => {
    button.addEventListener("click", async () => {
      const row = button.closest("tr[data-user-id]");
      await saveUserEnrollmentFromRow(row, { mode: "manual" });
    });
  });

  appEl.querySelectorAll("[data-action='reset-user-password']").forEach((button) => {
    button.addEventListener("click", async () => {
      if (button.dataset.busy === "1") {
        return;
      }
      const row = button.closest("tr[data-user-id]");
      const userId = row?.getAttribute("data-user-id");
      if (!userId) {
        return;
      }
      const users = getUsers();
      const idx = users.findIndex((entry) => entry.id === userId);
      if (idx === -1) {
        toast("Account not found.");
        return;
      }
      const target = users[idx];
      const hasSupabaseIdentity = hasSupabaseManagedIdentity(target);
      const targetAuthId = hasSupabaseIdentity ? String(getUserProfileId(target) || "").trim() : "";
      if (hasSupabaseIdentity && !isUuidValue(targetAuthId)) {
        toast("Target account is not linked to a valid Supabase Auth profile.");
        return;
      }

      const nextPassword = String(
        window.prompt(
          `Set a new password for ${target.email}\n(Minimum 6 characters)`,
          "",
        ) || "",
      );
      if (!nextPassword) {
        return;
      }
      if (nextPassword.length < 6) {
        toast("Password must be at least 6 characters.");
        return;
      }
      if (nextPassword.length > 128) {
        toast("Password is too long (maximum 128 characters).");
        return;
      }

      button.dataset.busy = "1";
      if (!button.dataset.baseLabel) {
        button.dataset.baseLabel = String(button.textContent || "Set password").trim();
      }
      button.disabled = true;
      button.textContent = "Saving...";

      try {
        if (hasSupabaseIdentity) {
          const updateResult = await setSupabaseAuthUserPasswordAsAdmin(targetAuthId, nextPassword);
          if (!updateResult.ok) {
            if (shouldAllowSupabaseManagedLocalFallback(updateResult.message) && users[idx]) {
              queuePendingAdminAction({
                type: "set-password",
                targetAuthId,
                targetProfileId: String(getUserProfileId(target) || "").trim(),
                targetLocalUserId: String(target.id || "").trim(),
                email: String(target.email || "").trim().toLowerCase(),
                password: nextPassword,
              });
              users[idx].password = nextPassword;
              save(STORAGE_KEYS.users, users);
              await syncUsersBackupState(users).catch(() => { });
              toast(`Supabase is unavailable. Saved a local fallback password and queued the cloud update for ${target.email}.`);
              return;
            }
            toast(`Could not update user password. ${updateResult.message || "Unknown error."}`);
            return;
          }
          if (users[idx]) {
            clearPendingAdminActionsForTarget({
              type: "set-password",
              targetAuthId,
              targetProfileId: String(getUserProfileId(target) || "").trim(),
              targetLocalUserId: String(target.id || "").trim(),
              password: nextPassword,
            });
            users[idx].password = nextPassword;
            save(STORAGE_KEYS.users, users);
            await syncUsersBackupState(users).catch(() => { });
          }
          toast(`Password updated for ${target.email}.`);
          return;
        }

        users[idx].password = nextPassword;
        save(STORAGE_KEYS.users, users);
        await flushPendingSyncNow();
        toast(`Password updated for ${target.email}.`);
      } catch (error) {
        toast(getErrorMessage(error, "Could not update password for this user."));
      } finally {
        button.dataset.busy = "0";
        button.disabled = false;
        button.textContent = button.dataset.baseLabel || "Set password";
      }
    });
  });

  appEl.querySelectorAll("[data-action='toggle-user-role']").forEach((button) => {
    button.addEventListener("click", async () => {
      const row = button.closest("tr[data-user-id]");
      const userId = row?.getAttribute("data-user-id");
      const current = getCurrentUser();
      if (!userId) {
        return;
      }
      if (current?.id === userId) {
        toast("You cannot change your own role.");
        return;
      }

      const users = getUsers();
      const idx = users.findIndex((entry) => entry.id === userId);
      if (idx === -1) {
        toast("Account not found.");
        return;
      }
      if (isForcedAdminEmail(users[idx].email)) {
        toast("This account is locked as admin.");
        return;
      }

      users[idx].role = users[idx].role === "admin" ? "student" : "admin";
      if (users[idx].role === "student") {
        users[idx].academicYear = sanitizeAcademicYear(users[idx].academicYear || 1);
        users[idx].academicSemester = sanitizeAcademicSemester(users[idx].academicSemester || 1);
        users[idx].assignedCourses = getCurriculumCourses(users[idx].academicYear, users[idx].academicSemester);
        const studentAutoApproved = shouldAutoApproveStudentAccess({
          role: "student",
          phone: String(users[idx].phone || "").trim(),
          academicYear: users[idx].academicYear,
          academicSemester: users[idx].academicSemester,
        });
        users[idx].isApproved = studentAutoApproved;
        users[idx].approvedAt = studentAutoApproved ? users[idx].approvedAt || nowISO() : null;
        users[idx].approvedBy = studentAutoApproved ? users[idx].approvedBy || AUTO_APPROVAL_ACTOR : null;
      } else {
        users[idx].academicYear = null;
        users[idx].academicSemester = null;
        users[idx].assignedCourses = [...allCourses];
        users[idx].isApproved = true;
        users[idx].approvedAt = nowISO();
        users[idx].approvedBy = current?.email || "admin";
      }
      save(STORAGE_KEYS.users, users);
      try {
        await flushPendingSyncNow();
        toast("User role updated.");
        render();
      } catch (syncError) {
        toast(`Role updated locally, but DB sync failed: ${getErrorMessage(syncError, "Sync failed.")}`);
      }
    });
  });

  appEl.querySelectorAll("[data-action='toggle-user-approval']").forEach((button) => {
    button.addEventListener("click", async () => {
      const row = button.closest("tr[data-user-id]");
      const userId = row?.getAttribute("data-user-id");
      if (!userId) {
        return;
      }

      const current = getCurrentUser();
      const users = getUsers();
      const idx = users.findIndex((entry) => entry.id === userId);
      if (idx === -1) {
        toast("Account not found.");
        return;
      }
      if (users[idx].role === "admin") {
        toast("Admin accounts are always approved.");
        return;
      }

      const nextApproved = !isUserAccessApproved(users[idx]);
      if (nextApproved && !hasCompleteStudentProfile(users[idx])) {
        toast("Student must have phone number, year, and semester before approval.");
        return;
      }
      const targetProfileId = getUserProfileId(users[idx]);
      const dbResult = await updateRelationalProfileApproval([targetProfileId], nextApproved);
      const approvalQueuedForSync = isUuidValue(targetProfileId) && !dbResult.ok && shouldAllowSupabaseManagedLocalFallback(dbResult.message);
      if (isUuidValue(targetProfileId) && !dbResult.ok && !approvalQueuedForSync) {
        toast(`Database update failed. ${dbResult.message}`);
        return;
      }
      if (isUuidValue(targetProfileId) && !approvalQueuedForSync && !(dbResult.updatedIds || []).includes(targetProfileId)) {
        toast("Database update failed. This user profile is missing or inaccessible.");
        return;
      }
      users[idx].isApproved = nextApproved;
      users[idx].approvedAt = nextApproved ? nowISO() : null;
      users[idx].approvedBy = nextApproved ? current?.email || "admin" : null;
      save(STORAGE_KEYS.users, users);
      await syncUsersBackupState(users);
      const authAccessResult = await syncSupabaseAuthAccessForTargets(
        isUuidValue(targetProfileId) ? [targetProfileId] : [],
        nextApproved,
        {
          users,
          queueAll: approvalQueuedForSync,
        },
      );
      try {
        await flushPendingSyncNow({ throwOnRelationalFailure: !approvalQueuedForSync });
        toast(
          approvalQueuedForSync
            ? `${nextApproved ? "Account approved locally and queued for cloud sync." : "Account suspended locally and queued for cloud sync."}${describeAuthAccessSyncOutcome(authAccessResult)}`
            : `${nextApproved ? "Account approved." : "Account suspended."}${describeAuthAccessSyncOutcome(authAccessResult)}`,
        );
        render();
      } catch (syncError) {
        toast(`Account updated locally, but DB sync failed: ${getErrorMessage(syncError, "Sync failed.")}`);
      }
    });
  });

  appEl.querySelectorAll("[data-action='remove-user']").forEach((button) => {
    button.addEventListener("click", async () => {
      const row = button.closest("tr[data-user-id]");
      const userId = row?.getAttribute("data-user-id");
      const current = getCurrentUser();
      if (!userId) {
        return;
      }
      if (current?.id === userId) {
        toast("You cannot remove your own account.");
        return;
      }

      const users = getUsers();
      const target = users.find((entry) => entry.id === userId);
      if (!target) {
        toast("Account not found.");
        return;
      }

      if (!window.confirm(`Remove user ${target.name}?`)) {
        return;
      }

      const targetProfileId = getUserProfileId(target);
      let queuedDelete = false;
      if (target.supabaseAuthId) {
        const deleteResult = await deleteSupabaseAuthUserAsAdmin(target.supabaseAuthId);
        if (!deleteResult.ok) {
          if (shouldAllowSupabaseManagedLocalFallback(deleteResult.message)) {
            queuedDelete = true;
          } else {
            toast(`Could not delete user from Supabase Auth. ${deleteResult.message || "Unauthorized."}`);
            return;
          }
        }
      }
      if (targetProfileId && !queuedDelete) {
        const relationalDeleteResult = await deleteRelationalProfile(targetProfileId);
        if (!relationalDeleteResult.ok) {
          if (shouldAllowSupabaseManagedLocalFallback(relationalDeleteResult.message)) {
            queuedDelete = true;
          } else {
            toast(`Database delete failed. ${relationalDeleteResult.message}`);
            return;
          }
        }
      }

      if (queuedDelete) {
        queuePendingAdminAction({
          type: "delete-user",
          targetAuthId: String(target.supabaseAuthId || "").trim(),
          targetProfileId: String(targetProfileId || "").trim(),
          targetLocalUserId: userId,
          email: String(target.email || "").trim().toLowerCase(),
        });
      } else {
        clearPendingAdminActionsForTarget({
          type: "delete-user",
          targetAuthId: String(target.supabaseAuthId || "").trim(),
          targetProfileId: String(targetProfileId || "").trim(),
          targetLocalUserId: userId,
        });
      }

      save(
        STORAGE_KEYS.users,
        users.filter((entry) => entry.id !== userId),
      );
      save(
        STORAGE_KEYS.sessions,
        getSessions().filter((entry) => entry.userId !== userId),
      );

      const incorrectQueue = load(STORAGE_KEYS.incorrectQueue, {});
      delete incorrectQueue[userId];
      save(STORAGE_KEYS.incorrectQueue, incorrectQueue);

      const flashcards = load(STORAGE_KEYS.flashcards, {});
      delete flashcards[userId];
      save(STORAGE_KEYS.flashcards, flashcards);

      try {
        await flushPendingSyncNow({ throwOnRelationalFailure: !queuedDelete });
        toast(queuedDelete ? "User removed locally and queued for cloud deletion." : "User removed.");
        render();
      } catch (syncError) {
        toast(
          queuedDelete
            ? `User removed locally and queued for cloud deletion. ${getErrorMessage(syncError, "Sync failed.")}`
            : `User removed locally, but DB sync failed: ${getErrorMessage(syncError, "Sync failed.")}`,
        );
      }
    });
  });

  const adminFilterForm = document.getElementById("admin-question-filter-form");
  const adminFilterCourse = document.getElementById("admin-filter-course");
  const adminFilterTopic = document.getElementById("admin-filter-topic");
  const adminClearFilters = document.getElementById("admin-clear-filters");
  const adminQuestionsSection = document.getElementById("admin-questions-section");
  const normalizeQuestionIdList = (ids, allowedSet = null) => {
    const seen = new Set();
    const normalized = [];
    (Array.isArray(ids) ? ids : []).forEach((rawId) => {
      const id = String(rawId || "").trim();
      if (!id || seen.has(id)) {
        return;
      }
      if (allowedSet && !allowedSet.has(id)) {
        return;
      }
      seen.add(id);
      normalized.push(id);
    });
    return normalized;
  };
  const getVisibleAdminQuestions = () => {
    const questions = getQuestions();
    const resolvedView = resolveAdminQuestionListView(
      questions,
      allCourses,
      String(state.adminFilters.course || ""),
      String(state.adminFilters.topic || ""),
    );
    if (
      state.adminFilters.course !== resolvedView.selectedCourse
      || state.adminFilters.topic !== resolvedView.selectedTopic
    ) {
      state.adminFilters.course = resolvedView.selectedCourse;
      state.adminFilters.topic = resolvedView.selectedTopic;
    }
    return resolvedView.filteredQuestions;
  };
  const getVisibleQuestionIds = () =>
    getVisibleAdminQuestions()
      .map((question) => String(question.id || "").trim())
      .filter(Boolean);
  const getVisibleQuestionIdSet = () => new Set(getVisibleQuestionIds());
  const getSelectedVisibleQuestionIds = () => {
    const selectedIds = normalizeQuestionIdList(state.adminSelectedQuestionIds, getVisibleQuestionIdSet());
    state.adminSelectedQuestionIds = selectedIds;
    return selectedIds;
  };
  const isQuestionOperationLocked = () =>
    Boolean(state.adminQuestionSaveRunning || state.adminQuestionDeleteQid || state.adminBulkActionRunning);
  let questionReorderSyncTimer = null;
  const scheduleQuestionOrderSync = () => {
    if (questionReorderSyncTimer) {
      window.clearTimeout(questionReorderSyncTimer);
    }
    questionReorderSyncTimer = window.setTimeout(() => {
      questionReorderSyncTimer = null;
      flushPendingSyncNow({ throwOnRelationalFailure: false }).catch((syncError) => {
        toast(`Question order saved locally, but DB sync failed: ${getErrorMessage(syncError, "Sync failed.")}`);
      });
    }, 900);
  };
  const reorderVisibleQuestions = (sourceId, targetId, options = {}) => {
    if (isQuestionOperationLocked()) {
      return false;
    }
    const source = String(sourceId || "").trim();
    const target = String(targetId || "").trim();
    if (!source || !target || source === target) {
      return false;
    }

    const visibleQuestions = getVisibleAdminQuestions();
    const visibleIds = visibleQuestions
      .map((question) => String(question.id || "").trim())
      .filter(Boolean);
    const fromIndex = visibleIds.indexOf(source);
    const toIndex = visibleIds.indexOf(target);
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
      return false;
    }

    const buildReorderedVisibleIds = (placeAfter) => {
      const reordered = [...visibleIds];
      const [movedId] = reordered.splice(fromIndex, 1);
      let insertionIndex = placeAfter
        ? toIndex + (fromIndex < toIndex ? 0 : 1)
        : toIndex + (fromIndex < toIndex ? -1 : 0);
      insertionIndex = Math.max(0, Math.min(reordered.length, insertionIndex));
      reordered.splice(insertionIndex, 0, movedId);
      return reordered;
    };
    const isSameOrder = (candidate) => candidate.every((id, index) => id === visibleIds[index]);

    const requestedPlaceAfter = Boolean(options.placeAfter);
    let nextVisibleIds = buildReorderedVisibleIds(requestedPlaceAfter);
    if (isSameOrder(nextVisibleIds)) {
      // Fallback: some drop positions resolve to no-op (e.g., adjacent rows).
      nextVisibleIds = buildReorderedVisibleIds(!requestedPlaceAfter);
    }
    if (isSameOrder(nextVisibleIds)) {
      return false;
    }

    const visibleQuestionById = new Map(
      visibleQuestions.map((question) => [String(question.id || "").trim(), question]),
    );
    const visibleIdSet = new Set(visibleIds);
    const reorderedVisibleQuestions = nextVisibleIds
      .map((id) => visibleQuestionById.get(id))
      .filter(Boolean);

    let visiblePointer = 0;
    const currentQuestions = getQuestions();
    const nextQuestions = currentQuestions.map((question) => {
      const questionId = String(question.id || "").trim();
      if (!visibleIdSet.has(questionId)) {
        return question;
      }
      const replacement = reorderedVisibleQuestions[visiblePointer];
      visiblePointer += 1;
      return replacement || question;
    });

    const nextQuestionsWithOrder = nextQuestions.map((question, index) => ({
      ...question,
      sortOrder: index + 1,
    }));
    save(STORAGE_KEYS.questions, nextQuestionsWithOrder);
    // Prevent immediate admin auto-refresh from rehydrating stale cloud order before this reorder flushes.
    state.adminDataLastSyncAt = Date.now();
    state.skipNextRouteAnimation = true;
    render();
    scheduleQuestionOrderSync();
    if (options.toast) {
      toast("Question order updated.");
    }
    return true;
  };
  const moveVisibleQuestionByStep = (questionId, step, options = {}) => {
    const direction = Number(step);
    if (!direction) {
      return false;
    }
    const visibleIds = getVisibleQuestionIds();
    const currentIndex = visibleIds.indexOf(String(questionId || "").trim());
    if (currentIndex === -1) {
      return false;
    }
    const targetIndex = currentIndex + (direction > 0 ? 1 : -1);
    if (targetIndex < 0 || targetIndex >= visibleIds.length) {
      return false;
    }
    return reorderVisibleQuestions(questionId, visibleIds[targetIndex], {
      placeAfter: direction > 0,
      toast: options.toast === true,
    });
  };
  const clearQuestionDropIndicators = () => {
    adminQuestionsSection?.querySelectorAll("tr.admin-question-row").forEach((row) => {
      row.classList.remove("is-dragging", "is-drop-before", "is-drop-after");
      delete row.dataset.dropPosition;
    });
  };
  const bindQuestionReorderInteractions = () => {
    if (!adminQuestionsSection) {
      return;
    }
    let draggingQuestionId = "";
    let touchStart = null;
    const rows = Array.from(adminQuestionsSection.querySelectorAll("tr.admin-question-row[data-qid]"));
    rows.forEach((row) => {
      const qid = String(row.getAttribute("data-qid") || "").trim();
      if (!qid) {
        return;
      }

      row.addEventListener("dragstart", (event) => {
        if (isQuestionOperationLocked() || row.getAttribute("draggable") === "false") {
          event.preventDefault();
          return;
        }
        draggingQuestionId = qid;
        row.classList.add("is-dragging");
        if (event.dataTransfer) {
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", qid);
        }
      });
      row.addEventListener("dragover", (event) => {
        if (!draggingQuestionId || draggingQuestionId === qid || isQuestionOperationLocked()) {
          return;
        }
        event.preventDefault();
        rows.forEach((candidate) => {
          if (candidate === row) {
            return;
          }
          candidate.classList.remove("is-drop-before", "is-drop-after");
          delete candidate.dataset.dropPosition;
        });
        const rowRect = row.getBoundingClientRect();
        const placeAfter = (event.clientY - rowRect.top) > (rowRect.height / 2);
        row.dataset.dropPosition = placeAfter ? "after" : "before";
        row.classList.toggle("is-drop-after", placeAfter);
        row.classList.toggle("is-drop-before", !placeAfter);
      });
      row.addEventListener("drop", (event) => {
        if (!draggingQuestionId || draggingQuestionId === qid || isQuestionOperationLocked()) {
          return;
        }
        event.preventDefault();
        const placeAfter = row.dataset.dropPosition === "after";
        reorderVisibleQuestions(draggingQuestionId, qid, { placeAfter });
        draggingQuestionId = "";
        clearQuestionDropIndicators();
      });
      row.addEventListener("dragend", () => {
        draggingQuestionId = "";
        clearQuestionDropIndicators();
      });

      row.addEventListener("touchstart", (event) => {
        if (isQuestionOperationLocked()) {
          return;
        }
        const touch = event.changedTouches?.[0];
        if (!touch) {
          return;
        }
        touchStart = {
          qid,
          x: touch.clientX,
          y: touch.clientY,
          time: Date.now(),
        };
      }, { passive: true });
      row.addEventListener("touchend", (event) => {
        if (!touchStart || touchStart.qid !== qid || isQuestionOperationLocked()) {
          return;
        }
        const touch = event.changedTouches?.[0];
        if (!touch) {
          touchStart = null;
          return;
        }
        const deltaX = touch.clientX - touchStart.x;
        const deltaY = touch.clientY - touchStart.y;
        const elapsedMs = Date.now() - touchStart.time;
        touchStart = null;
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);
        if (elapsedMs > 900 || absY < 42 || absY > 220 || absY <= absX) {
          return;
        }
        if (deltaY < 0) {
          moveVisibleQuestionByStep(qid, -1, { toast: true });
          return;
        }
        moveVisibleQuestionByStep(qid, 1, { toast: true });
      }, { passive: true });
      row.addEventListener("touchcancel", () => {
        touchStart = null;
      }, { passive: true });
    });
  };
  bindQuestionReorderInteractions();
  const selectAllQuestionsInput = appEl.querySelector("[data-action='admin-select-all-questions']");
  if (selectAllQuestionsInput instanceof HTMLInputElement) {
    selectAllQuestionsInput.indeterminate = selectAllQuestionsInput.dataset.indeterminate === "true";
  }

  adminFilterForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(adminFilterForm);
    state.adminFilters.course = String(data.get("course") || "");
    state.adminFilters.topic = String(data.get("topic") || "");
    state.adminSelectedQuestionIds = [];
    render();
  });

  adminFilterCourse?.addEventListener("change", () => {
    const selected = adminFilterCourse.value || "";
    const topics = selected ? QBANK_COURSE_TOPICS[selected] || [] : [];
    setSelectOptions(adminFilterTopic, topics, true);
  });

  adminClearFilters?.addEventListener("click", () => {
    state.adminFilters = { course: "", topic: "" };
    state.adminSelectedQuestionIds = [];
    render();
  });

  appEl.querySelector("[data-action='admin-open-editor-new']")?.addEventListener("click", () => {
    if (isQuestionOperationLocked()) {
      return;
    }
    state.adminEditQuestionId = null;
    state.adminEditorCourse = state.adminFilters.course || allCourses[0] || "";
    state.adminEditorTopic = resolveDefaultTopic(state.adminEditorCourse);
    state.adminQuestionModalOpen = true;
    render();
  });

  appEl.querySelectorAll("[data-action='admin-close-editor'], [data-action='admin-cancel']").forEach((button) => {
    button.addEventListener("click", () => {
      if (state.adminQuestionSaveRunning) {
        return;
      }
      state.adminEditQuestionId = null;
      state.adminEditorCourse = "";
      state.adminEditorTopic = "";
      state.adminQuestionModalOpen = false;
      render();
    });
  });

  adminQuestionsSection?.addEventListener("change", (event) => {
    const targetEl = event.target;
    if (!(targetEl instanceof Element)) {
      return;
    }
    const checkbox = targetEl.closest("input[type='checkbox'][data-action]");
    if (!(checkbox instanceof HTMLInputElement)) {
      return;
    }
    const action = String(checkbox.getAttribute("data-action") || "").trim();
    if (!["admin-select-question", "admin-select-all-questions"].includes(action)) {
      return;
    }
    if (isQuestionOperationLocked()) {
      return;
    }
    if (action === "admin-select-all-questions") {
      state.adminSelectedQuestionIds = checkbox.checked ? getVisibleQuestionIds() : [];
      state.skipNextRouteAnimation = true;
      render();
      return;
    }
    const qid = String(checkbox.getAttribute("data-qid") || "").trim();
    if (!qid) {
      return;
    }
    const visibleQuestionIdSet = getVisibleQuestionIdSet();
    if (!visibleQuestionIdSet.has(qid)) {
      return;
    }
    const selectedSet = new Set(getSelectedVisibleQuestionIds());
    if (checkbox.checked) {
      selectedSet.add(qid);
    } else {
      selectedSet.delete(qid);
    }
    state.adminSelectedQuestionIds = normalizeQuestionIdList([...selectedSet], visibleQuestionIdSet);
    state.skipNextRouteAnimation = true;
    render();
  });

  adminQuestionsSection?.addEventListener("click", async (event) => {
    const targetEl = event.target;
    if (!(targetEl instanceof Element)) {
      return;
    }
    const actionEl = targetEl.closest("[data-action]");
    if (!actionEl) {
      return;
    }
    const action = String(actionEl.getAttribute("data-action") || "").trim();
    if (
      ![
        "admin-edit",
        "admin-delete",
        "admin-bulk-draft",
        "admin-bulk-publish",
        "admin-bulk-delete",
        "admin-clear-selection",
      ].includes(action)
    ) {
      return;
    }

    if (action === "admin-clear-selection") {
      if (isQuestionOperationLocked() || !state.adminSelectedQuestionIds.length) {
        return;
      }
      state.adminSelectedQuestionIds = [];
      state.skipNextRouteAnimation = true;
      render();
      return;
    }

    if (["admin-bulk-draft", "admin-bulk-publish", "admin-bulk-delete"].includes(action)) {
      if (isQuestionOperationLocked()) {
        return;
      }
      const selectedIds = getSelectedVisibleQuestionIds();
      if (!selectedIds.length) {
        toast("Select at least one question.");
        return;
      }
      const selectedSet = new Set(selectedIds);
      const actionType = action === "admin-bulk-delete" ? "delete" : action === "admin-bulk-draft" ? "draft" : "publish";
      if (actionType === "delete" && !window.confirm(`Delete ${selectedIds.length} selected question(s)?`)) {
        return;
      }

      state.adminBulkActionRunning = true;
      state.adminBulkActionType = actionType;
      state.skipNextRouteAnimation = true;
      render();

      try {
        const questions = getQuestions();
        let localMessage = "";

        if (actionType === "delete") {
          const nextQuestions = questions.filter((entry) => !selectedSet.has(String(entry.id || "").trim()));
          save(STORAGE_KEYS.questions, nextQuestions);
          if (state.adminEditQuestionId && selectedSet.has(String(state.adminEditQuestionId || "").trim())) {
            state.adminEditQuestionId = null;
            state.adminQuestionModalOpen = false;
          }
          state.adminSelectedQuestionIds = [];
          localMessage = `Deleted ${selectedIds.length} question(s).`;
        } else {
          const targetStatus = actionType === "draft" ? "draft" : "published";
          let changedCount = 0;
          const nextQuestions = questions.map((entry) => {
            const questionId = String(entry.id || "").trim();
            if (!selectedSet.has(questionId)) {
              return entry;
            }
            const currentStatus = String(entry.status || "draft").trim().toLowerCase();
            if (currentStatus === targetStatus) {
              return entry;
            }
            changedCount += 1;
            return { ...entry, status: targetStatus };
          });
          if (!changedCount) {
            state.adminBulkActionRunning = false;
            state.adminBulkActionType = "";
            state.skipNextRouteAnimation = true;
            render();
            toast(targetStatus === "draft" ? "Selected questions are already drafts." : "Selected questions are already published.");
            return;
          }
          save(STORAGE_KEYS.questions, nextQuestions);
          localMessage = targetStatus === "draft"
            ? `Moved ${changedCount} question(s) to draft.`
            : `Published ${changedCount} question(s).`;
        }

        state.adminBulkActionRunning = false;
        state.adminBulkActionType = "";
        state.adminDataLastSyncAt = Date.now();
        state.skipNextRouteAnimation = true;
        render();
        toast(localMessage);

        try {
          await flushPendingSyncNow();
        } catch (syncError) {
          toast(`${localMessage} Saved locally, but DB sync failed: ${getErrorMessage(syncError, "Sync failed.")}`);
        }
      } catch (bulkError) {
        state.adminBulkActionRunning = false;
        state.adminBulkActionType = "";
        state.skipNextRouteAnimation = true;
        render();
        toast(`Could not apply bulk action: ${getErrorMessage(bulkError, "Action failed.")}`);
      }
      return;
    }

    if (state.adminQuestionSaveRunning || state.adminBulkActionRunning) {
      return;
    }
    const qid = String(actionEl.getAttribute("data-qid") || "").trim();
    if (!qid) {
      return;
    }

    if (action === "admin-edit") {
      if (state.adminQuestionDeleteQid) {
        return;
      }
      state.adminEditQuestionId = qid;
      const questions = getQuestions();
      const editing = questions.find((entry) => String(entry.id || "").trim() === qid);
      const meta = editing ? getQbankCourseTopicMeta(editing) : null;
      state.adminEditorCourse = meta?.course || allCourses[0] || "";
      state.adminEditorTopic = meta?.topic || (QBANK_COURSE_TOPICS[state.adminEditorCourse] || [])[0] || "";
      state.adminQuestionModalOpen = true;
      state.skipNextRouteAnimation = true;
      render();
      return;
    }

    if (!window.confirm(`Delete question ${qid}?`)) {
      return;
    }
    if (state.adminQuestionDeleteQid) {
      return;
    }

    state.adminQuestionDeleteQid = qid;
    state.skipNextRouteAnimation = true;
    render();

    try {
      const questions = getQuestions().filter((entry) => String(entry.id || "").trim() !== qid);
      save(STORAGE_KEYS.questions, questions);
      state.adminSelectedQuestionIds = normalizeQuestionIdList(
        state.adminSelectedQuestionIds,
        new Set(questions.map((entry) => String(entry.id || "").trim()).filter(Boolean)),
      );
      if (state.adminEditQuestionId === qid) {
        state.adminEditQuestionId = null;
        state.adminQuestionModalOpen = false;
      }
      state.adminQuestionDeleteQid = "";
      state.adminDataLastSyncAt = Date.now();
      state.skipNextRouteAnimation = true;
      render();
      toast("Question deleted.");
      await flushPendingSyncNow();
    } catch (syncError) {
      state.adminQuestionDeleteQid = "";
      state.skipNextRouteAnimation = true;
      render();
      toast(`Question deleted locally, but DB sync failed: ${getErrorMessage(syncError, "Sync failed.")}`);
    }
  });

  appEl.querySelector("[data-action='admin-new']")?.addEventListener("click", () => {
    if (isQuestionOperationLocked()) {
      return;
    }
    state.adminEditQuestionId = null;
    state.adminEditorCourse = state.adminFilters.course || allCourses[0] || "";
    state.adminEditorTopic = (QBANK_COURSE_TOPICS[state.adminEditorCourse] || [])[0] || "";
    state.adminQuestionModalOpen = true;
    render();
  });

  const questionCourseSelect = document.getElementById("admin-question-course");
  const questionTopicSelect = document.getElementById("admin-question-topic");
  questionCourseSelect?.addEventListener("change", () => {
    const course = questionCourseSelect.value || allCourses[0];
    setSelectOptions(questionTopicSelect, QBANK_COURSE_TOPICS[course] || [], false);
  });

  const importCourseSelect = document.getElementById("admin-import-course");
  const importTopicSelect = document.getElementById("admin-import-topic");
  const syncImportSelectionsFromInputs = () => {
    const currentCourse = allCourses.includes(state.adminImportCourse)
      ? state.adminImportCourse
      : (allCourses[0] || "");
    const course = importCourseSelect?.value || currentCourse;
    const topics = QBANK_COURSE_TOPICS[course] || [];
    const topic = topics.includes(importTopicSelect?.value || "")
      ? String(importTopicSelect?.value || "")
      : (
        topics.includes(state.adminImportTopic)
          ? String(state.adminImportTopic)
          : (topics[0] || "")
      );
    state.adminImportCourse = course;
    state.adminImportTopic = topic;
  };
  syncImportSelectionsFromInputs();
  importCourseSelect?.addEventListener("change", () => {
    const course = importCourseSelect.value || allCourses[0];
    setSelectOptions(importTopicSelect, QBANK_COURSE_TOPICS[course] || [], false);
    syncImportSelectionsFromInputs();
  });
  importTopicSelect?.addEventListener("change", () => {
    syncImportSelectionsFromInputs();
  });

  const importFileInput = document.getElementById("admin-import-file");
  const importTextInput = document.getElementById("admin-import-text");
  const importTemplateButton = document.getElementById("admin-download-template");
  const importSyncNowButton = document.getElementById("admin-sync-questions-now");
  const importErrorDownloadButton = document.getElementById("admin-download-import-errors");
  const importReportClearButton = document.getElementById("admin-clear-import-report");

  if (importTextInput) {
    if (importTextInput.value !== String(state.adminImportDraft || "")) {
      importTextInput.value = String(state.adminImportDraft || "");
    }
    importTextInput.addEventListener("input", () => {
      state.adminImportDraft = importTextInput.value;
    });
  }

  const isSupportedBulkImportFile = (file) => {
    const fileName = String(file?.name || "").toLowerCase();
    return fileName.endsWith(".csv") || fileName.endsWith(".json");
  };

  const toCsvCell = (value) => {
    const text = String(value == null ? "" : value);
    if (/["\n\r,]/.test(text)) {
      return `"${text.replace(/"/g, "\"\"")}"`;
    }
    return text;
  };

  importSyncNowButton?.addEventListener("click", async () => {
    if (state.adminImportRunning) {
      return;
    }

    state.adminImportRunning = true;
    state.adminImportStatus = "Syncing existing questions to cloud...";
    state.adminImportStatusTone = "neutral";
    state.skipNextRouteAnimation = true;
    render();

    try {
      const syncResult = await persistImportedQuestionsNow(getQuestions());
      if (!syncResult.ok) {
        throw new Error(syncResult.message || "Cloud sync failed.");
      }
      state.adminImportStatus = "Cloud sync complete. Questions are now available to all users.";
      state.adminImportStatusTone = "success";
      toast("Cloud sync complete.");
    } catch (error) {
      const message = getErrorMessage(error, "Cloud sync failed.");
      state.adminImportStatus = `Cloud sync failed: ${message}`;
      state.adminImportStatusTone = "error";
      toast(`Cloud sync failed: ${message}`);
    } finally {
      state.adminImportRunning = false;
      state.skipNextRouteAnimation = true;
      render();
    }
  });

  importTemplateButton?.addEventListener("click", () => {
    const selectedCourse = importCourseSelect?.value || allCourses[0] || "";
    const selectedTopic =
      importTopicSelect?.value || (QBANK_COURSE_TOPICS[selectedCourse] || [])[0] || "";
    const headers = [
      "stem",
      "choiceA",
      "choiceB",
      "choiceC",
      "choiceD",
      "choiceE",
      "correct",
      "explanation",
      "course",
      "topic",
      "system",
      "difficulty",
      "status",
      "tags",
      "objective",
      "references",
      "questionImage",
      "explanationImage",
    ];
    const sampleRow = {
      stem: "Sample question stem",
      choiceA: "Option A",
      choiceB: "Option B",
      choiceC: "Option C",
      choiceD: "Option D",
      choiceE: "Option E",
      correct: "A",
      explanation: "Write why the correct choice is right and why others are wrong.",
      course: selectedCourse,
      topic: selectedTopic,
      system: selectedCourse,
      difficulty: "Medium",
      status: "published",
      tags: "sample|template",
      objective: "Learning objective text",
      references: "Reference source",
      questionImage: "https://example.com/question-image.png",
      explanationImage: "https://example.com/image.png",
    };
    const csvRows = [headers, headers.map((header) => sampleRow[header] || "")]
      .map((row) => row.map(toCsvCell).join(","))
      .join("\r\n");
    const csvContent = `\uFEFF${csvRows}`;
    const fileName = "bulk_import_template.csv";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    if (window.navigator && typeof window.navigator.msSaveOrOpenBlob === "function") {
      window.navigator.msSaveOrOpenBlob(blob, fileName);
      toast("Template downloaded. Fill it, then upload it for bulk import.");
      return;
    }
    const blobUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = blobUrl;
    anchor.download = fileName;
    anchor.style.display = "none";
    document.body.append(anchor);
    anchor.click();
    window.setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
      anchor.remove();
    }, 1500);
    toast("Template downloaded. Fill it, then upload it for bulk import.");
  });

  importFileInput?.addEventListener("change", async () => {
    const files = [...(importFileInput.files || [])];
    if (!files.length) return;
    const invalidFile = files.find((file) => !isSupportedBulkImportFile(file));
    if (invalidFile) {
      toast("Only CSV or JSON files are supported for bulk import.");
      importFileInput.value = "";
      return;
    }
    if (files.length > 1) {
      toast(`${files.length} files selected. Click Run bulk import to import them together.`);
      return;
    }
    const [file] = files;
    const text = await file.text();
    state.adminImportDraft = text;
    if (importTextInput) {
      importTextInput.value = text;
    }
  });

  importErrorDownloadButton?.addEventListener("click", () => {
    const report = state.adminImportReport;
    if (!report?.errors?.length) {
      toast("No import errors to download.");
      return;
    }
    const content = [
      "O6U MedBank Bulk Import Error Report",
      `Generated: ${new Date(report.createdAt).toLocaleString()}`,
      `Rows in file: ${report.total}`,
      `Imported rows: ${report.added}`,
      `Error rows: ${report.errors.length}`,
      "",
      ...report.errors,
    ].join("\r\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8;" });
    const blobUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = blobUrl;
    anchor.download = `bulk_import_errors_${Date.now()}.txt`;
    anchor.style.display = "none";
    document.body.append(anchor);
    anchor.click();
    window.setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
      anchor.remove();
    }, 1200);
    toast("Import error report downloaded.");
  });

  importReportClearButton?.addEventListener("click", () => {
    state.adminImportReport = null;
    state.skipNextRouteAnimation = true;
    render();
  });

  const form = document.getElementById("admin-question-form");
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (state.adminQuestionSaveRunning) {
      return;
    }

    const data = new FormData(form);
    const questions = getQuestions();
    const existingId = String(data.get("id") || "");
    state.adminQuestionSaveRunning = true;
    state.skipNextRouteAnimation = true;
    render();

    let successMessage = "Question saved.";

    try {
      let questionImage = String(data.get("questionImage") || "").trim();
      const questionImageFile = data.get("questionImageFile");
      if (questionImageFile instanceof File && Number(questionImageFile.size || 0) > 0) {
        const uploadResult = await uploadQuestionImageFile(questionImageFile);
        if (!uploadResult.ok) {
          if (questionImage) {
            toast(`Question image upload failed. The provided URL was kept. (${uploadResult.message})`);
          } else {
            toast(`Question image upload failed: ${uploadResult.message}`);
            state.adminQuestionSaveRunning = false;
            state.skipNextRouteAnimation = true;
            render();
            return;
          }
        }
        if (uploadResult.ok) {
          questionImage = String(uploadResult.url || "").trim();
        }
        if (uploadResult.ok && uploadResult.usedFallback) {
          toast(String(uploadResult.message || "Question image saved inline because storage upload failed."));
        }
      }

      const choices = normalizeQuestionChoiceEntries(
        QUESTION_CHOICE_LABELS.map((label) => ({
          id: label,
          text: String(data.get(`choice${label}`) || "").trim(),
        })),
      );
      if (choices.length < 2) {
        toast("Enter at least 2 answer choices.");
        state.adminQuestionSaveRunning = false;
        state.skipNextRouteAnimation = true;
        render();
        return;
      }
      const selectedCorrect = normalizeQuestionChoiceLabel(String(data.get("correct") || "A"));
      const correct = choices.some((choice) => choice.id === selectedCorrect)
        ? [selectedCorrect]
        : [choices[0].id];

      const payload = {
        id: existingId || makeId("q"),
        qbankCourse: String(data.get("questionCourse") || allCourses[0]).trim(),
        qbankTopic: String(data.get("questionTopic") || "").trim(),
        course: String(data.get("questionCourse") || allCourses[0]).trim(),
        system: String(data.get("system") || "").trim(),
        topic: String(data.get("questionTopic") || "").trim(),
        difficulty: String(data.get("difficulty") || "Easy"),
        tags: String(data.get("tags") || "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        author: getCurrentUser().name,
        dateAdded: new Date().toISOString().slice(0, 10),
        stem: String(data.get("stem") || "").trim(),
        choices,
        correct,
        explanation: String(data.get("explanation") || "").trim(),
        objective: "",
        references: String(data.get("references") || "").trim(),
        questionImage,
        explanationImage: String(data.get("explanationImage") || "").trim(),
        status: String(data.get("status") || "published"),
      };

      if (!QBANK_COURSE_TOPICS[payload.qbankCourse]?.includes(payload.qbankTopic)) {
        payload.qbankTopic = (QBANK_COURSE_TOPICS[payload.qbankCourse] || [])[0] || payload.qbankTopic;
        payload.topic = payload.qbankTopic;
      }

      const idx = questions.findIndex((entry) => entry.id === payload.id);
      successMessage = idx >= 0 ? "Question updated." : "Question created.";
      if (idx >= 0) {
        questions[idx] = { ...questions[idx], ...payload };
      } else {
        questions.push(payload);
      }

      save(STORAGE_KEYS.questions, questions);
      state.adminFilters.course = payload.qbankCourse;
      state.adminFilters.topic = payload.qbankTopic || "";
      state.adminEditQuestionId = null;
      state.adminEditorCourse = "";
      state.adminEditorTopic = "";
      state.adminQuestionModalOpen = false;
      state.adminQuestionSaveRunning = false;
      state.adminDataLastSyncAt = Date.now();
      state.skipNextRouteAnimation = true;
      render();
      toast(successMessage);

      try {
        await flushPendingSyncNow();
      } catch (syncError) {
        toast(`${successMessage} locally, but DB sync failed: ${getErrorMessage(syncError, "Sync failed.")}`);
      }
    } catch (saveError) {
      state.adminQuestionSaveRunning = false;
      state.skipNextRouteAnimation = true;
      render();
      toast(`Could not save question: ${getErrorMessage(saveError, "Save failed.")}`);
    }
  });

  const importForm = document.getElementById("admin-import-form");
  importForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (state.adminImportRunning) {
      return;
    }
    const data = new FormData(importForm);
    const selectedImportFiles = [...(importFileInput?.files || [])];
    const rawInput = String(data.get("importText") || state.adminImportDraft || "");
    state.adminImportDraft = rawInput;
    let importSources = [];

    if (selectedImportFiles.length > 1) {
      const invalidFile = selectedImportFiles.find((file) => !isSupportedBulkImportFile(file));
      if (invalidFile) {
        const invalidFileName = String(invalidFile.name || "file");
        state.adminImportStatus = `Only CSV or JSON files are supported. Unsupported file: ${invalidFileName}`;
        state.adminImportStatusTone = "error";
        state.skipNextRouteAnimation = true;
        render();
        toast(`Unsupported file type: ${invalidFileName}`);
        return;
      }
      importSources = await Promise.all(
        selectedImportFiles.map(async (file) => ({
          label: String(file.name || "Uploaded file"),
          raw: String(await file.text()),
        })),
      );
    } else {
      const raw = rawInput.trim();
      if (raw) {
        importSources = [{ label: "Pasted import text", raw }];
      } else if (selectedImportFiles.length === 1) {
        const [singleFile] = selectedImportFiles;
        if (!isSupportedBulkImportFile(singleFile)) {
          const invalidFileName = String(singleFile.name || "file");
          state.adminImportStatus = `Only CSV or JSON files are supported. Unsupported file: ${invalidFileName}`;
          state.adminImportStatusTone = "error";
          state.skipNextRouteAnimation = true;
          render();
          toast(`Unsupported file type: ${invalidFileName}`);
          return;
        }
        importSources = [{
          label: String(singleFile.name || "Uploaded file"),
          raw: String(await singleFile.text()),
        }];
      } else {
        state.adminImportStatus = "Paste import content or upload a file first.";
        state.adminImportStatusTone = "error";
        state.skipNextRouteAnimation = true;
        render();
        toast("Paste import content or upload a file first.");
        return;
      }
    }

    const defaultCourse = String(data.get("defaultCourse") || allCourses[0]);
    const defaultTopic = String(data.get("defaultTopic") || (QBANK_COURSE_TOPICS[defaultCourse] || [])[0] || "");
    const importAsDraft = data.get("importAsDraft") != null;
    state.adminImportCourse = defaultCourse;
    state.adminImportTopic = defaultTopic;
    state.adminImportAsDraft = importAsDraft;
    state.adminImportRunning = true;
    state.adminImportStatus = "Importing questions...";
    state.adminImportStatusTone = "neutral";
    state.skipNextRouteAnimation = true;
    render();
    await new Promise((resolve) => window.requestAnimationFrame(resolve));

    try {
      const shouldPrefixErrors = importSources.length > 1;
      const result = importSources.reduce((aggregate, source) => {
        const sourceLabel = String(source?.label || "Import source").trim() || "Import source";
        const sourceRaw = String(source?.raw || "").trim();
        if (!sourceRaw) {
          const emptyError = "No import rows found. File is empty.";
          aggregate.errors.push(shouldPrefixErrors ? `${sourceLabel}: ${emptyError}` : emptyError);
          return aggregate;
        }
        const sourceResult = importQuestionsFromRaw(sourceRaw, {
          defaultCourse,
          defaultTopic,
          author: getCurrentUser().name,
          importAsDraft,
        });
        aggregate.total += sourceResult.total;
        aggregate.added += sourceResult.added;
        if (Array.isArray(sourceResult.errors) && sourceResult.errors.length) {
          sourceResult.errors.forEach((errorText) => {
            const normalizedError = String(errorText || "").trim() || "Unknown import error.";
            aggregate.errors.push(shouldPrefixErrors ? `${sourceLabel}: ${normalizedError}` : normalizedError);
          });
        }
        return aggregate;
      }, { total: 0, added: 0, errors: [] });
      state.adminImportReport = {
        createdAt: nowISO(),
        total: result.total,
        added: result.added,
        errors: [...result.errors],
      };

      let syncMessage = "";
      const visibilityNote = importAsDraft ? " as draft" : "";
      const sourceSummary = importSources.length > 1 ? ` across ${importSources.length} files` : "";
      if (result.added) {
        const syncResult = await persistImportedQuestionsNow(getQuestions());
        if (!syncResult.ok) {
          syncMessage = syncResult.message || "Database sync failed.";
        }
      }

      if (syncMessage) {
        state.adminImportStatus = `Done importing ${result.added}/${result.total} rows${visibilityNote}${sourceSummary}. Saved locally with sync warning: ${syncMessage}`;
        state.adminImportStatusTone = "warning";
        toast(`Imported ${result.added}/${result.total} rows${visibilityNote}${sourceSummary} locally, but DB sync failed: ${syncMessage}`);
      } else if (result.errors.length) {
        state.adminImportStatus = `Done importing ${result.added}/${result.total} rows${visibilityNote}${sourceSummary} with ${result.errors.length} error(s).`;
        state.adminImportStatusTone = result.added ? "warning" : "error";
        toast(`Imported ${result.added}/${result.total} rows${visibilityNote}${sourceSummary} with ${result.errors.length} error(s).`);
      } else {
        state.adminImportStatus = `Done importing ${result.added}/${result.total} rows${visibilityNote}${sourceSummary}.`;
        state.adminImportStatusTone = "success";
        toast(`Imported ${result.added}/${result.total} rows${visibilityNote}${sourceSummary} successfully.`);
      }

      if (result.added) {
        state.adminEditQuestionId = null;
      }
      if (result.errors.length) {
        console.warn("Bulk import errors:", result.errors);
      }
    } catch (error) {
      const errorMessage = getErrorMessage(error, "Bulk import failed.");
      state.adminImportStatus = `Import failed: ${errorMessage}`;
      state.adminImportStatusTone = "error";
      toast(`Import failed: ${errorMessage}`);
    } finally {
      state.adminImportRunning = false;
      state.skipNextRouteAnimation = true;
      render();
    }
  });
}
function normalizePendingAdminActionEntry(entry) {
  if (!entry || typeof entry !== "object") {
    return null;
  }
  const type = String(entry.type || "").trim().toLowerCase();
  const targetAuthId = String(entry.targetAuthId || "").trim();
  const targetProfileId = String(entry.targetProfileId || "").trim();
  const targetLocalUserId = String(entry.targetLocalUserId || "").trim();
  const queuedAt = String(entry.queuedAt || entry.createdAt || "").trim();
  const normalizedQueuedAt = Number.isFinite(new Date(queuedAt).getTime()) ? new Date(queuedAt).toISOString() : nowISO();
  if (type === "set-password") {
    const password = String(entry.password || "").trim();
    if (!isUuidValue(targetAuthId) || password.length < 6) {
      return null;
    }
    return {
      id: String(entry.id || makeId("admin_action")).trim() || makeId("admin_action"),
      type,
      targetAuthId,
      targetProfileId: isUuidValue(targetProfileId) ? targetProfileId : targetAuthId,
      targetLocalUserId,
      email: String(entry.email || "").trim().toLowerCase(),
      password,
      queuedAt: normalizedQueuedAt,
    };
  }
  if (type === "set-access") {
    if (!isUuidValue(targetAuthId) || typeof entry.approved !== "boolean") {
      return null;
    }
    return {
      id: String(entry.id || makeId("admin_action")).trim() || makeId("admin_action"),
      type,
      targetAuthId,
      targetProfileId: isUuidValue(targetProfileId) ? targetProfileId : targetAuthId,
      targetLocalUserId,
      email: String(entry.email || "").trim().toLowerCase(),
      password: "",
      approved: Boolean(entry.approved),
      queuedAt: normalizedQueuedAt,
    };
  }
  if (type === "delete-user") {
    if (!targetLocalUserId && !isUuidValue(targetAuthId) && !isUuidValue(targetProfileId)) {
      return null;
    }
    return {
      id: String(entry.id || makeId("admin_action")).trim() || makeId("admin_action"),
      type,
      targetAuthId: isUuidValue(targetAuthId) ? targetAuthId : "",
      targetProfileId: isUuidValue(targetProfileId) ? targetProfileId : (isUuidValue(targetAuthId) ? targetAuthId : ""),
      targetLocalUserId,
      email: String(entry.email || "").trim().toLowerCase(),
      password: "",
      queuedAt: normalizedQueuedAt,
    };
  }
  return null;
}

function normalizePendingAdminActionQueue(entries) {
  const normalized = (Array.isArray(entries) ? entries : [])
    .map((entry) => normalizePendingAdminActionEntry(entry))
    .filter(Boolean)
    .sort((a, b) => new Date(a.queuedAt || 0) - new Date(b.queuedAt || 0));
  const targetKeyFor = (entry) => String(
    entry?.targetAuthId
    || entry?.targetProfileId
    || entry?.targetLocalUserId
    || entry?.email
    || "",
  ).trim().toLowerCase();
  const latestByActionKey = new Map();
  normalized.forEach((entry) => {
    const targetKey = targetKeyFor(entry);
    if (!targetKey) {
      return;
    }
    latestByActionKey.set(`${String(entry.type || "").trim().toLowerCase()}::${targetKey}`, entry);
  });
  const collapsed = [...latestByActionKey.values()]
    .sort((a, b) => new Date(a.queuedAt || 0) - new Date(b.queuedAt || 0));
  const deleteTargetKeys = new Set(
    collapsed
      .filter((entry) => entry.type === "delete-user")
      .map((entry) => targetKeyFor(entry))
      .filter(Boolean),
  );
  return collapsed.filter((entry) => {
    if (entry.type === "delete-user") {
      return true;
    }
    return !deleteTargetKeys.has(targetKeyFor(entry));
  });
}

function getPendingAdminActionQueue() {
  return normalizePendingAdminActionQueue(load(STORAGE_KEYS.pendingAdminActions, []));
}

function savePendingAdminActionQueue(entries) {
  saveLocalOnly(
    STORAGE_KEYS.pendingAdminActions,
    normalizePendingAdminActionQueue(entries),
  );
  scheduleSyncStatusUiRefresh();
}

function isSamePendingAdminActionTarget(first, second) {
  if (!first || !second) {
    return false;
  }
  return Boolean(
    (first.targetAuthId && second.targetAuthId && first.targetAuthId === second.targetAuthId)
    || (first.targetProfileId && second.targetProfileId && first.targetProfileId === second.targetProfileId)
    || (first.targetLocalUserId && second.targetLocalUserId && first.targetLocalUserId === second.targetLocalUserId)
  );
}

function queuePendingAdminAction(action) {
  const normalized = normalizePendingAdminActionEntry(action);
  if (!normalized) {
    return false;
  }
  const existingQueue = getPendingAdminActionQueue();
  if (
    ["set-password", "set-access"].includes(normalized.type)
    && existingQueue.some((entry) => entry.type === "delete-user" && isSamePendingAdminActionTarget(entry, normalized))
  ) {
    return true;
  }
  const nextQueue = existingQueue.filter((entry) => {
    if (!isSamePendingAdminActionTarget(entry, normalized)) {
      return true;
    }
    if (normalized.type === "delete-user") {
      return false;
    }
    return entry.type !== normalized.type;
  });
  nextQueue.push(normalized);
  savePendingAdminActionQueue(nextQueue);
  schedulePendingAdminActionFlush(1200);
  return true;
}

function clearPendingAdminActionsForTarget(action) {
  const normalized = normalizePendingAdminActionEntry(action);
  if (!normalized) {
    return false;
  }
  const existingQueue = getPendingAdminActionQueue();
  const nextQueue = existingQueue.filter((entry) => !isSamePendingAdminActionTarget(entry, normalized));
  if (nextQueue.length === existingQueue.length) {
    return false;
  }
  savePendingAdminActionQueue(nextQueue);
  return true;
}

function queuePendingAccessSyncActions(targetAuthIds, approved, usersByProfileId = new Map()) {
  const ids = [...new Set(
    (Array.isArray(targetAuthIds) ? targetAuthIds : [targetAuthIds])
      .map((entry) => String(entry || "").trim())
      .filter((entry) => isUuidValue(entry)),
  )];
  ids.forEach((targetAuthId) => {
    const matchingUser = usersByProfileId instanceof Map ? usersByProfileId.get(targetAuthId) : null;
    queuePendingAdminAction({
      type: "set-access",
      targetAuthId,
      targetProfileId: targetAuthId,
      targetLocalUserId: String(matchingUser?.id || "").trim(),
      email: String(matchingUser?.email || "").trim().toLowerCase(),
      approved,
    });
  });
  return ids;
}

async function syncSupabaseAuthAccessForTargets(targetAuthIds, approved, options = {}) {
  const ids = [...new Set(
    (Array.isArray(targetAuthIds) ? targetAuthIds : [targetAuthIds])
      .map((entry) => String(entry || "").trim())
      .filter((entry) => isUuidValue(entry)),
  )];
  if (!ids.length) {
    return { ok: true, updatedIds: [], notFoundIds: [], failedIds: [], queuedIds: [], message: "" };
  }

  const usersList = Array.isArray(options?.users) ? options.users : getUsers();
  const usersByProfileId = new Map(
    usersList
      .map((entry) => [String(getUserProfileId(entry) || "").trim(), entry])
      .filter(([profileId]) => isUuidValue(profileId)),
  );
  const queueFailures = options?.queueFailures !== false;
  const queueAll = Boolean(options?.queueAll);
  if (queueAll) {
    const queuedIds = queuePendingAccessSyncActions(ids, approved, usersByProfileId);
    return { ok: false, updatedIds: [], notFoundIds: [], failedIds: ids, queuedIds, message: "Account access changes were queued for Supabase sync." };
  }

  const result = await setSupabaseAuthUserAccessAsAdmin(ids, approved);
  const updatedIds = [...new Set((Array.isArray(result?.updatedIds) ? result.updatedIds : []).filter((entry) => ids.includes(entry)))];
  const notFoundIds = [...new Set((Array.isArray(result?.notFoundIds) ? result.notFoundIds : []).filter((entry) => ids.includes(entry)))];
  const failedIds = [...new Set(
    (Array.isArray(result?.failedIds) ? result.failedIds : ids.filter((entry) => !updatedIds.includes(entry) && !notFoundIds.includes(entry)))
      .filter((entry) => ids.includes(entry)),
  )];
  const queuedIds = queueFailures && failedIds.length
    ? queuePendingAccessSyncActions(failedIds, approved, usersByProfileId)
    : [];
  return {
    ok: Boolean(result?.ok) && !failedIds.length,
    updatedIds,
    notFoundIds,
    failedIds,
    queuedIds,
    message: String(result?.message || "").trim(),
  };
}

function describeAuthAccessSyncOutcome(result) {
  const queuedCount = Array.isArray(result?.queuedIds) ? result.queuedIds.length : 0;
  const failedCount = Array.isArray(result?.failedIds) ? result.failedIds.length : 0;
  const unsyncedCount = Math.max(0, failedCount - queuedCount);
  if (unsyncedCount) {
    return ` Auth access sync failed for ${unsyncedCount} account(s).`;
  }
  if (queuedCount) {
    return ` Auth access sync queued for ${queuedCount} account(s).`;
  }
  return "";
}

function getPendingDeletedAdminTargets() {
  const targets = {
    localUserIds: new Set(),
    profileIds: new Set(),
    authIds: new Set(),
  };
  getPendingAdminActionQueue().forEach((entry) => {
    if (entry.type !== "delete-user") {
      return;
    }
    if (entry.targetLocalUserId) {
      targets.localUserIds.add(entry.targetLocalUserId);
    }
    if (isUuidValue(entry.targetProfileId)) {
      targets.profileIds.add(entry.targetProfileId);
    }
    if (isUuidValue(entry.targetAuthId)) {
      targets.authIds.add(entry.targetAuthId);
    }
  });
  return targets;
}

function getUsers() {
  const users = load(STORAGE_KEYS.users, []);
  const list = Array.isArray(users) ? users : [];
  const deletedTargets = getPendingDeletedAdminTargets();
  return list.filter((user) => {
    const localId = String(user?.id || "").trim();
    const profileId = String(getUserProfileId(user) || "").trim();
    return !deletedTargets.localUserIds.has(localId)
      && !deletedTargets.profileIds.has(profileId)
      && !deletedTargets.authIds.has(profileId);
  });
}

function getCloudNotificationTargetUsers(users = null) {
  const list = Array.isArray(users) ? users : getUsers();
  const byProfileId = new Map();
  list.forEach((entry) => {
    const profileId = String(getUserProfileId(entry) || "").trim();
    if (!isUuidValue(profileId) || byProfileId.has(profileId)) {
      return;
    }
    byProfileId.set(profileId, entry);
  });
  return [...byProfileId.values()];
}

function normalizeNotificationAudienceType(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "user") {
    return "user";
  }
  if (raw === "year") {
    return "year";
  }
  return "all";
}

function parseNotificationExternalIdMetadata(externalId) {
  const raw = String(externalId || "").trim();
  if (!raw) {
    return { raw: "", baseId: "", targetType: "all", targetYear: null };
  }
  const escapedSeparator = NOTIFICATION_YEAR_EXTERNAL_ID_SEPARATOR.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`^${NOTIFICATION_YEAR_EXTERNAL_ID_PREFIX}([1-5])${escapedSeparator}(.+)$`, "i");
  const match = raw.match(pattern);
  if (!match) {
    return { raw, baseId: raw, targetType: "all", targetYear: null };
  }
  const targetYear = normalizeAcademicYearOrNull(match[1]);
  const baseId = String(match[2] || "").trim();
  return {
    raw,
    baseId: baseId || raw,
    targetType: targetYear === null ? "all" : "year",
    targetYear,
  };
}

function buildNotificationExternalId(options = {}) {
  const targetType = normalizeNotificationAudienceType(options?.targetType);
  const baseInput = String(options?.baseId || options?.id || "").trim();
  const baseId = baseInput || (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : makeId("notification"));
  if (targetType !== "year") {
    return baseId;
  }
  const targetYear = normalizeAcademicYearOrNull(options?.targetYear);
  if (targetYear === null) {
    return baseId;
  }
  const parsed = parseNotificationExternalIdMetadata(baseId);
  if (parsed.targetType === "year" && parsed.targetYear === targetYear) {
    return baseId;
  }
  return `${NOTIFICATION_YEAR_EXTERNAL_ID_PREFIX}${targetYear}${NOTIFICATION_YEAR_EXTERNAL_ID_SEPARATOR}${baseId}`;
}

function formatAcademicYearAudienceLabel(year) {
  const normalizedYear = normalizeAcademicYearOrNull(year);
  if (normalizedYear === null) {
    return "Year group";
  }
  const mod100 = normalizedYear % 100;
  const mod10 = normalizedYear % 10;
  let suffix = "th";
  if (mod100 < 11 || mod100 > 13) {
    if (mod10 === 1) {
      suffix = "st";
    } else if (mod10 === 2) {
      suffix = "nd";
    } else if (mod10 === 3) {
      suffix = "rd";
    }
  }
  return `${normalizedYear}${suffix} year students`;
}

function getNotificationYearAudienceUsers(year, users = null) {
  const targetYear = normalizeAcademicYearOrNull(year);
  if (targetYear === null) {
    return [];
  }
  const list = Array.isArray(users) ? users : getCloudNotificationTargetUsers(getUsers());
  return list.filter((entry) => (
    String(entry?.role || "").trim().toLowerCase() === "student"
    && isUserAccessApproved(entry)
    && normalizeAcademicYearOrNull(entry?.academicYear) === targetYear
  ));
}

function normalizeNotificationRecord(entry, fallbackId = "") {
  if (!entry || typeof entry !== "object") {
    return null;
  }
  const dbIdCandidate = String(entry.dbId || entry.idOnServer || "").trim();
  const dbId = isUuidValue(dbIdCandidate) ? dbIdCandidate : "";
  const rawIdCandidate = String(entry.id || entry.externalId || dbId || fallbackId || "").trim();
  const externalIdMetadata = parseNotificationExternalIdMetadata(rawIdCandidate);
  const idCandidate = externalIdMetadata.raw;
  if (!idCandidate) {
    return null;
  }
  const targetUserId = String(entry.targetUserId || entry.targetProfileId || entry.recipientUserId || "").trim();
  const explicitTargetType = normalizeNotificationAudienceType(entry.targetType || "");
  const explicitTargetYear = normalizeAcademicYearOrNull(
    entry.targetYear
    ?? entry.target_year
    ?? entry.academicYear
    ?? entry.academic_year
    ?? null,
  );
  let targetType = "all";
  let targetYear = null;
  if (explicitTargetType === "user" || targetUserId) {
    targetType = "user";
  } else if (explicitTargetType === "year" || explicitTargetYear !== null || externalIdMetadata.targetType === "year") {
    targetType = "year";
    targetYear = explicitTargetYear ?? externalIdMetadata.targetYear;
    if (targetYear === null) {
      targetType = "all";
    }
  }
  const createdAtSource = String(entry.createdAt || entry.created_at || "").trim();
  const createdAtMs = new Date(createdAtSource || 0).getTime();
  const createdAt = Number.isFinite(createdAtMs) && createdAtMs > 0
    ? new Date(createdAtMs).toISOString()
    : nowISO();
  const readByUserIds = [...new Set(
    (Array.isArray(entry.readByUserIds) ? entry.readByUserIds : [])
      .map((value) => String(value || "").trim())
      .filter(Boolean),
  )];

  return {
    id: idCandidate,
    dbId,
    targetType,
    targetUserId: targetType === "user" ? targetUserId : "",
    targetYear: targetType === "year" ? targetYear : null,
    title: String(entry.title || "Notification").trim() || "Notification",
    body: String(entry.body || entry.message || "").trim(),
    createdAt,
    createdById: String(entry.createdById || entry.created_by || "").trim(),
    createdByName: String(entry.createdByName || entry.created_by_name || "Admin").trim() || "Admin",
    readByUserIds,
  };
}

function normalizeNotificationCollection(entries) {
  const list = Array.isArray(entries) ? entries : [];
  const byKey = new Map();

  list.forEach((entry, index) => {
    const normalized = normalizeNotificationRecord(entry, `notification_${index + 1}`);
    if (!normalized) {
      return;
    }
    const key = normalized.dbId ? `db:${normalized.dbId}` : `id:${normalized.id}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, normalized);
      return;
    }
    const mergedReadBy = [...new Set([...(existing.readByUserIds || []), ...(normalized.readByUserIds || [])])];
    const existingMs = new Date(existing.createdAt || 0).getTime();
    const normalizedMs = new Date(normalized.createdAt || 0).getTime();
    const preferred = normalizedMs >= existingMs ? normalized : existing;
    byKey.set(key, {
      ...preferred,
      readByUserIds: mergedReadBy,
    });
  });

  return [...byKey.values()]
    .sort((a, b) => {
      const aMs = new Date(a.createdAt || 0).getTime();
      const bMs = new Date(b.createdAt || 0).getTime();
      if (aMs !== bMs) {
        return bMs - aMs;
      }
      return String(b.id || "").localeCompare(String(a.id || ""));
    })
    .slice(0, 800);
}

function getNotifications() {
  return normalizeNotificationCollection(load(STORAGE_KEYS.notifications, []));
}

function saveNotificationsLocal(notifications) {
  saveLocalOnly(STORAGE_KEYS.notifications, normalizeNotificationCollection(notifications));
}

function getPendingNotificationOutbox() {
  return normalizeNotificationCollection(load(STORAGE_KEYS.notificationOutbox, []));
}

function savePendingNotificationOutbox(entries) {
  saveLocalOnly(STORAGE_KEYS.notificationOutbox, normalizeNotificationCollection(entries));
}

function queueNotificationForCloudDelivery(notification) {
  const normalized = normalizeNotificationRecord(notification);
  if (!normalized) {
    return false;
  }
  const currentQueue = getPendingNotificationOutbox();
  const nextQueue = [normalized, ...currentQueue.filter((entry) => String(entry?.id || "").trim() !== normalized.id)];
  savePendingNotificationOutbox(nextQueue);
  return true;
}

function normalizeNotificationReadSyncQueue(queuePayload) {
  const source = queuePayload && typeof queuePayload === "object" && !Array.isArray(queuePayload)
    ? queuePayload
    : {};
  const normalized = {};
  Object.entries(source).forEach(([profileId, ids]) => {
    const profileKey = String(profileId || "").trim();
    if (!isUuidValue(profileKey)) {
      return;
    }
    const idList = [...new Set(
      (Array.isArray(ids) ? ids : [])
        .map((id) => String(id || "").trim())
        .filter((id) => isUuidValue(id)),
    )];
    if (idList.length) {
      normalized[profileKey] = idList;
    }
  });
  return normalized;
}

function getPendingNotificationReadSyncQueue() {
  return normalizeNotificationReadSyncQueue(load(STORAGE_KEYS.notificationReadSyncQueue, {}));
}

function savePendingNotificationReadSyncQueue(queuePayload) {
  saveLocalOnly(
    STORAGE_KEYS.notificationReadSyncQueue,
    normalizeNotificationReadSyncQueue(queuePayload),
  );
}

function queueNotificationReadSync(user, notificationDbIds) {
  const currentUser = user || getCurrentUser();
  const profileId = getCurrentSessionProfileId(currentUser);
  if (!isUuidValue(profileId)) {
    return 0;
  }
  const ids = [...new Set(
    (Array.isArray(notificationDbIds) ? notificationDbIds : [])
      .map((id) => String(id || "").trim())
      .filter((id) => isUuidValue(id)),
  )];
  if (!ids.length) {
    return 0;
  }

  const queue = getPendingNotificationReadSyncQueue();
  const existing = new Set(Array.isArray(queue[profileId]) ? queue[profileId] : []);
  const beforeSize = existing.size;
  ids.forEach((id) => existing.add(id));
  queue[profileId] = [...existing];
  savePendingNotificationReadSyncQueue(queue);
  return Math.max(0, existing.size - beforeSize);
}

async function flushPendingNotificationReadSync(options = {}) {
  const currentUser = options?.user || getCurrentUser();
  if (!currentUser || currentUser.role !== "student") {
    return { ok: false, deferred: true, syncedCount: 0, message: "No active student session for notification read sync." };
  }
  const profileId = getCurrentSessionProfileId(currentUser);
  if (!isUuidValue(profileId)) {
    return { ok: false, deferred: true, syncedCount: 0, message: "No active Supabase profile for notification read sync." };
  }

  const queue = getPendingNotificationReadSyncQueue();
  const pendingIds = [...new Set(
    (Array.isArray(queue[profileId]) ? queue[profileId] : [])
      .map((id) => String(id || "").trim())
      .filter((id) => isUuidValue(id)),
  )];
  if (!pendingIds.length) {
    return { ok: true, deferred: false, syncedCount: 0, message: "" };
  }
  if (typeof navigator !== "undefined" && navigator?.onLine === false) {
    return { ok: false, deferred: true, syncedCount: 0, message: "You are offline. Notification read sync is queued." };
  }

  const syncResult = await syncNotificationReadsToRelational(currentUser, pendingIds);
  if (!syncResult.ok) {
    return {
      ok: false,
      deferred: true,
      syncedCount: 0,
      message: syncResult.message || "Could not sync notification read state.",
    };
  }

  delete queue[profileId];
  savePendingNotificationReadSyncQueue(queue);
  return { ok: true, deferred: false, syncedCount: pendingIds.length, message: "" };
}

function upsertLocalNotificationFromCloud(notification) {
  const mapped = normalizeNotificationRecord(notification);
  if (!mapped) {
    return;
  }
  const existingNotifications = getNotifications();
  const existingById = existingNotifications.find((entry) => String(entry?.id || "").trim() === mapped.id);
  const existingByDbId = isUuidValue(mapped.dbId)
    ? existingNotifications.find((entry) => String(entry?.dbId || "").trim() === mapped.dbId)
    : null;
  const existing = existingById || existingByDbId || null;
  const mergedReadBy = [...new Set([
    ...(Array.isArray(existing?.readByUserIds) ? existing.readByUserIds : []),
    ...(Array.isArray(mapped.readByUserIds) ? mapped.readByUserIds : []),
  ])];
  const nextNotification = {
    ...mapped,
    readByUserIds: mergedReadBy,
  };
  const nextNotifications = [
    nextNotification,
    ...existingNotifications.filter((entry) => {
      const sameExternalId = String(entry?.id || "").trim() === mapped.id;
      const sameDbId = isUuidValue(mapped.dbId) && String(entry?.dbId || "").trim() === mapped.dbId;
      return !sameExternalId && !sameDbId;
    }),
  ];
  saveNotificationsLocal(nextNotifications);
}

async function flushPendingNotificationOutbox(options = {}) {
  const allQueued = getPendingNotificationOutbox();
  if (!allQueued.length) {
    return { ok: true, deferred: false, syncedCount: 0, deliveredIds: [], message: "" };
  }

  const targetIdSet = new Set(
    (Array.isArray(options?.targetNotificationIds) ? options.targetNotificationIds : [])
      .map((id) => String(id || "").trim())
      .filter(Boolean),
  );
  const shouldFilterTargets = targetIdSet.size > 0;
  const queueToAttempt = shouldFilterTargets
    ? allQueued.filter((entry) => targetIdSet.has(String(entry?.id || "").trim()))
    : allQueued;
  if (!queueToAttempt.length) {
    return { ok: true, deferred: false, syncedCount: 0, deliveredIds: [], message: "" };
  }

  const currentUser = options?.user || getCurrentUser();
  if (!currentUser || currentUser.role !== "admin") {
    return { ok: false, deferred: true, syncedCount: 0, deliveredIds: [], message: "No active admin session for notification delivery." };
  }
  if (typeof navigator !== "undefined" && navigator?.onLine === false) {
    return { ok: false, deferred: true, syncedCount: 0, deliveredIds: [], message: "You are offline. Notification delivery is queued." };
  }

  const notificationUsers = Array.isArray(options?.users)
    ? options.users
    : getCloudNotificationTargetUsers(getUsers());
  const deliveredIds = [];
  let firstFailureMessage = "";
  const shouldKeepEntry = new Set();

  for (const queuedNotification of queueToAttempt) {
    const queuedId = String(queuedNotification?.id || "").trim();
    if (!queuedId) {
      continue;
    }

    const result = await createRelationalNotification(queuedNotification, currentUser, notificationUsers);
    if (result.ok && result.notification) {
      upsertLocalNotificationFromCloud(result.notification);
      deliveredIds.push(queuedId);
      continue;
    }
    shouldKeepEntry.add(queuedId);
    if (!firstFailureMessage) {
      firstFailureMessage = String(result?.message || "Cloud delivery failed.").trim();
    }
  }

  const nextOutbox = allQueued.filter((entry) => {
    const queuedId = String(entry?.id || "").trim();
    if (!queuedId) {
      return false;
    }
    if (deliveredIds.includes(queuedId)) {
      return false;
    }
    if (!shouldFilterTargets) {
      return true;
    }
    if (!targetIdSet.has(queuedId)) {
      return true;
    }
    return shouldKeepEntry.has(queuedId);
  });
  savePendingNotificationOutbox(nextOutbox);

  if (deliveredIds.length) {
    scheduleNotificationRealtimeHydration(0);
  }

  const failedCount = queueToAttempt.length - deliveredIds.length;
  return {
    ok: failedCount === 0,
    deferred: failedCount > 0,
    syncedCount: deliveredIds.length,
    deliveredIds,
    message: failedCount > 0 ? (firstFailureMessage || "Cloud delivery is queued and will retry automatically.") : "",
  };
}

function getNotificationIdentityListForUser(user) {
  const ids = [];
  const sessionProfileId = getCurrentSessionProfileId(user);
  if (sessionProfileId) {
    ids.push(sessionProfileId);
  }
  const profileId = String(getUserProfileId(user) || "").trim();
  if (profileId && !ids.includes(profileId)) {
    ids.push(profileId);
  }
  const localId = String(user?.id || "").trim();
  if (localId && !ids.includes(localId)) {
    ids.push(localId);
  }
  return ids;
}

function isNotificationVisibleToUser(notification, user) {
  if (!notification || !user) {
    return false;
  }
  if (user.role === "admin") {
    return true;
  }
  if (notification.targetType === "year") {
    const targetYear = normalizeAcademicYearOrNull(notification.targetYear);
    const userYear = normalizeAcademicYearOrNull(user?.academicYear);
    return targetYear !== null && user.role === "student" && targetYear === userYear;
  }
  if (notification.targetType !== "user") {
    return true;
  }
  const target = String(notification.targetUserId || "").trim();
  if (!target) {
    return false;
  }
  const identities = getNotificationIdentityListForUser(user);
  return identities.includes(target);
}

function isNotificationReadByUser(notification, user) {
  if (!notification || !user) {
    return true;
  }
  const identities = getNotificationIdentityListForUser(user);
  const readSet = new Set(
    (Array.isArray(notification.readByUserIds) ? notification.readByUserIds : [])
      .map((id) => String(id || "").trim())
      .filter(Boolean),
  );
  return identities.some((id) => readSet.has(id));
}

function getVisibleNotificationsForUser(user) {
  return getNotifications().filter((notification) => isNotificationVisibleToUser(notification, user));
}

function getUnreadNotificationCountForUser(user) {
  if (!user || user.role !== "student") {
    return 0;
  }
  return getVisibleNotificationsForUser(user).filter((notification) => !isNotificationReadByUser(notification, user)).length;
}

function findUserByNotificationTargetId(targetUserId, users = null) {
  const raw = String(targetUserId || "").trim();
  if (!raw) {
    return null;
  }
  const list = Array.isArray(users) ? users : getUsers();
  const byProfileId = list.find((entry) => {
    const profileId = String(getUserProfileId(entry) || "").trim();
    return raw === profileId;
  });
  if (byProfileId) {
    return byProfileId;
  }
  return list.find((entry) => {
    const localId = String(entry?.id || "").trim();
    return raw === localId;
  }) || null;
}

function getNotificationTargetSearchDisplayLabel(user) {
  if (!user || typeof user !== "object") {
    return "";
  }
  const name = String(user.name || user.full_name || "").trim() || "User";
  const email = String(user.email || "").trim();
  if (email) {
    return `${name} <${email}>`;
  }
  return name;
}

function normalizeNotificationTargetSearchText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizeNotificationTargetPhoneSearchText(value) {
  return String(value || "").replace(/\D+/g, "");
}

function scoreUserNotificationTargetMatch(user, query) {
  const q = normalizeNotificationTargetSearchText(query);
  const phoneQuery = normalizeNotificationTargetPhoneSearchText(query);
  if (!q) {
    return 1;
  }
  const name = normalizeNotificationTargetSearchText(user?.name || user?.full_name);
  const email = normalizeNotificationTargetSearchText(user?.email);
  const phone = normalizeNotificationTargetPhoneSearchText(user?.phone);
  const localId = normalizeNotificationTargetSearchText(user?.id);
  const profileId = normalizeNotificationTargetSearchText(getUserProfileId(user));
  const label = normalizeNotificationTargetSearchText(getNotificationTargetSearchDisplayLabel(user));
  if (email === q || localId === q || profileId === q) {
    return 100;
  }
  if (phoneQuery && phone === phoneQuery) {
    return 95;
  }
  if (name === q || label === q) {
    return 90;
  }
  if (email.startsWith(q) || name.startsWith(q)) {
    return 70;
  }
  if (phoneQuery && phone.startsWith(phoneQuery)) {
    return 68;
  }
  if (email.includes(q)) {
    return 60;
  }
  if (phoneQuery && phone.includes(phoneQuery)) {
    return 58;
  }
  if (name.includes(q) || label.includes(q)) {
    return 50;
  }
  return 0;
}

function searchUsersForNotificationTarget(query, users = null, limit = 8) {
  const list = Array.isArray(users) ? users : getUsers();
  const normalizedQuery = normalizeNotificationTargetSearchText(query);
  const sortedList = [...list].sort((a, b) => {
    const byName = String(a?.name || a?.full_name || "").localeCompare(String(b?.name || b?.full_name || ""));
    if (byName !== 0) {
      return byName;
    }
    return String(a?.email || "").localeCompare(String(b?.email || ""));
  });
  const scored = list
    .map((entry) => ({ user: entry, score: scoreUserNotificationTargetMatch(entry, normalizedQuery) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      const byName = String(a.user?.name || "").localeCompare(String(b.user?.name || ""));
      if (byName !== 0) {
        return byName;
      }
      return String(a.user?.email || "").localeCompare(String(b.user?.email || ""));
    })
    .map((entry) => entry.user);
  if (normalizedQuery) {
    return scored.slice(0, Math.max(1, Number(limit) || 8));
  }
  return sortedList.slice(0, Math.max(1, Number(limit) || 8));
}

function findUserByNotificationTargetQuery(query, users = null) {
  const list = Array.isArray(users) ? users : getUsers();
  const normalized = normalizeNotificationTargetSearchText(query);
  if (!normalized) {
    return null;
  }
  const exact = list.find((entry) => scoreUserNotificationTargetMatch(entry, normalized) >= 90);
  if (exact) {
    return exact;
  }
  const ranked = searchUsersForNotificationTarget(normalized, list, 2);
  if (ranked.length === 1) {
    return ranked[0];
  }
  return null;
}

function getNotificationTargetProfileId(notification, users = null) {
  if (!notification || notification.targetType !== "user") {
    return "";
  }
  const targetUser = findUserByNotificationTargetId(notification.targetUserId, users);
  const profileId = String(getUserProfileId(targetUser) || "").trim();
  if (isUuidValue(profileId)) {
    return profileId;
  }
  const rawTarget = String(notification.targetUserId || "").trim();
  if (!isUuidValue(rawTarget)) {
    return "";
  }
  const list = Array.isArray(users) ? users : getUsers();
  const hasMatchingProfile = list.some((entry) => String(getUserProfileId(entry) || "").trim() === rawTarget);
  return hasMatchingProfile ? rawTarget : "";
}

function mapRelationalNotificationRowToLocal(row, options = {}) {
  const readByUserIds = Array.isArray(options.readByUserIds) ? options.readByUserIds : [];
  const externalId = String(row?.external_id || row?.id || "").trim();
  const externalIdMetadata = parseNotificationExternalIdMetadata(externalId);
  const recipientUserId = String(row?.recipient_user_id || "").trim();
  const targetType = recipientUserId
    ? "user"
    : externalIdMetadata.targetType === "year"
      ? "year"
      : "all";
  return normalizeNotificationRecord({
    id: externalId,
    dbId: String(row?.id || "").trim(),
    targetType,
    targetUserId: recipientUserId,
    targetYear: targetType === "year" ? externalIdMetadata.targetYear : null,
    title: String(row?.title || "").trim(),
    body: String(row?.message || "").trim(),
    createdAt: row?.created_at || nowISO(),
    createdById: String(row?.created_by || "").trim(),
    createdByName: String(row?.created_by_name || "Admin").trim() || "Admin",
    readByUserIds,
  });
}

function getNotificationTargetLabel(notification, users = null) {
  if (!notification) {
    return "All users";
  }
  if (notification.targetType === "year") {
    return formatAcademicYearAudienceLabel(notification.targetYear);
  }
  if (notification.targetType !== "user") {
    return "All users";
  }
  const targetUser = findUserByNotificationTargetId(notification.targetUserId, users);
  if (targetUser) {
    const roleLabel = targetUser.role === "admin" ? "admin" : "student";
    return `${targetUser.name} (${roleLabel})`;
  }
  const target = String(notification.targetUserId || "").trim();
  return target ? `User ${target}` : "Specific user";
}

function markNotificationsReadLocallyForUser(user, notificationIds) {
  const currentUser = user || getCurrentUser();
  if (!currentUser) {
    return { changed: false, syncedDbIds: [] };
  }
  const targetIds = new Set(
    (Array.isArray(notificationIds) ? notificationIds : [])
      .map((id) => String(id || "").trim())
      .filter(Boolean),
  );
  if (!targetIds.size) {
    return { changed: false, syncedDbIds: [] };
  }
  const identityIds = getNotificationIdentityListForUser(currentUser);
  if (!identityIds.length) {
    return { changed: false, syncedDbIds: [] };
  }

  let changed = false;
  const dbIdsToSync = new Set();
  const nextNotifications = getNotifications().map((notification) => {
    const id = String(notification.id || "").trim();
    const dbId = String(notification.dbId || "").trim();
    if (!targetIds.has(id) && !targetIds.has(dbId)) {
      return notification;
    }
    if (!isNotificationVisibleToUser(notification, currentUser)) {
      return notification;
    }
    const readSet = new Set(
      (Array.isArray(notification.readByUserIds) ? notification.readByUserIds : [])
        .map((entry) => String(entry || "").trim())
        .filter(Boolean),
    );
    const before = readSet.size;
    identityIds.forEach((entry) => readSet.add(entry));
    if (readSet.size === before) {
      return notification;
    }
    changed = true;
    if (isUuidValue(dbId)) {
      dbIdsToSync.add(dbId);
    }
    return {
      ...notification,
      readByUserIds: [...readSet],
    };
  });

  if (changed) {
    saveNotificationsLocal(nextNotifications);
  }
  return {
    changed,
    syncedDbIds: [...dbIdsToSync],
  };
}

function normalizeQuestionDedupText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function buildQuestionDedupFingerprint(question) {
  if (!question || typeof question !== "object") {
    return "";
  }

  const stem = normalizeQuestionDedupText(question.stem);
  if (!stem) {
    return "";
  }

  const choiceSignature = Array.isArray(question.choices)
    ? question.choices
      .map((choice) => {
        const label = String(choice?.id || "").trim().toUpperCase();
        const text = normalizeQuestionDedupText(choice?.text);
        if (!label && !text) {
          return "";
        }
        return `${label}:${text}`;
      })
      .filter(Boolean)
      .sort()
      .join("|")
    : "";

  const correctSignature = Array.isArray(question.correct)
    ? question.correct
      .map((entry) => String(entry || "").trim().toUpperCase())
      .filter(Boolean)
      .sort()
      .join("|")
    : "";
  const questionImageSignature = normalizeQuestionDedupText(question.questionImage);
  const explanationImageSignature = normalizeQuestionDedupText(question.explanationImage);

  return `${stem}||${choiceSignature}||${correctSignature}||${questionImageSignature}||${explanationImageSignature}`;
}

function dedupeQuestions(questions) {
  if (!Array.isArray(questions) || !questions.length) {
    return [];
  }

  const dedupedReversed = [];
  const seenIdKeys = new Set();
  const seenFingerprints = new Set();
  for (let index = questions.length - 1; index >= 0; index -= 1) {
    const question = questions[index];
    if (!question || typeof question !== "object") {
      continue;
    }
    const dbId = String(question.dbId || "").trim();
    const questionId = String(question.id || "").trim();
    const identityKeys = [];
    if (dbId) {
      identityKeys.push(`db:${dbId}`);
    }
    if (questionId) {
      identityKeys.push(`id:${questionId}`);
    }
    const fingerprint = buildQuestionDedupFingerprint(question);

    const hasSeenId = identityKeys.some((key) => seenIdKeys.has(key));
    const shouldUseFingerprint = !identityKeys.length;
    const hasSeenFingerprint = shouldUseFingerprint && Boolean(fingerprint) && seenFingerprints.has(fingerprint);
    if (hasSeenId || hasSeenFingerprint) {
      continue;
    }

    identityKeys.forEach((key) => seenIdKeys.add(key));
    if (shouldUseFingerprint && fingerprint) {
      seenFingerprints.add(fingerprint);
    }
    dedupedReversed.push(question);
  }

  return dedupedReversed.reverse();
}

function getQuestions() {
  const questions = load(STORAGE_KEYS.questions, []);
  return dedupeQuestions(questions);
}

function getSessions() {
  const sessions = load(STORAGE_KEYS.sessions, []);
  const list = Array.isArray(sessions) ? sessions : [];
  const deletedTargets = getPendingDeletedAdminTargets();
  return list.filter((session) => {
    const localUserId = String(session?.userId || "").trim();
    return !deletedTargets.localUserIds.has(localUserId);
  });
}

function normalizeSystemLogEntry(entry) {
  if (!entry || typeof entry !== "object") {
    return null;
  }
  const createdAt = String(entry.createdAt || "").trim() || nowISO();
  const kind = String(entry.kind || "event").trim() || "event";
  const message = String(entry.message || kind).trim() || kind;
  const details = entry.details && typeof entry.details === "object" && !Array.isArray(entry.details)
    ? entry.details
    : {};
  return {
    id: String(entry.id || makeId("log")).trim(),
    createdAt,
    kind,
    message,
    route: String(entry.route || "").trim(),
    actorId: String(entry.actorId || "").trim(),
    actorName: String(entry.actorName || "").trim(),
    actorRole: String(entry.actorRole || "").trim(),
    details,
  };
}

function buildAdminLogActorIdSet() {
  const users = getUsers();
  const ids = new Set();
  users.forEach((entry) => {
    if (String(entry?.role || "").trim().toLowerCase() !== "admin") {
      return;
    }
    const localId = String(entry?.id || "").trim();
    const authId = String(entry?.supabaseAuthId || "").trim();
    if (localId) {
      ids.add(localId);
    }
    if (authId) {
      ids.add(authId);
    }
  });
  return ids;
}

function isAdminSystemLogEntry(entry, adminActorIds = null) {
  if (!entry) {
    return false;
  }
  const actorRole = String(entry.actorRole || "").trim().toLowerCase();
  if (actorRole) {
    return actorRole === "admin";
  }
  const actorId = String(entry.actorId || "").trim();
  if (!actorId) {
    return false;
  }
  const adminIds = adminActorIds || buildAdminLogActorIdSet();
  return adminIds.has(actorId);
}

function sanitizeSystemLogsToAdminOnly() {
  const raw = load(STORAGE_KEYS.systemLogs, []);
  const list = Array.isArray(raw) ? raw : [];
  if (!list.length) {
    return;
  }
  const adminActorIds = buildAdminLogActorIdSet();
  const normalizedAdminLogs = list
    .map((entry) => normalizeSystemLogEntry(entry))
    .filter((entry) => isAdminSystemLogEntry(entry, adminActorIds));

  if (normalizedAdminLogs.length === list.length) {
    return;
  }

  systemLogRuntime.suspend = true;
  try {
    save(STORAGE_KEYS.systemLogs, normalizedAdminLogs);
  } finally {
    systemLogRuntime.suspend = false;
  }
}

function getSystemLogs() {
  const raw = load(STORAGE_KEYS.systemLogs, []);
  const list = Array.isArray(raw) ? raw : [];
  const adminActorIds = buildAdminLogActorIdSet();
  return list
    .map((entry) => normalizeSystemLogEntry(entry))
    .filter((entry) => isAdminSystemLogEntry(entry, adminActorIds))
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
}

function appendSystemLog(kind, message, details = {}, options = {}) {
  if (systemLogRuntime.suspend) {
    return null;
  }
  const actor = getCurrentUser();
  const actorRole = String(actor?.role || "").trim().toLowerCase();
  if (actorRole !== "admin") {
    return null;
  }
  const safeKind = String(kind || "event").trim() || "event";
  const safeMessage = String(message || safeKind).trim() || safeKind;
  const safeDetails = details && typeof details === "object" && !Array.isArray(details)
    ? details
    : {};
  const signature = `${safeKind}|${safeMessage}|${JSON.stringify(safeDetails)}`;
  const nowMs = Date.now();
  if (
    !options.force
    && signature === systemLogRuntime.lastSignature
    && (nowMs - systemLogRuntime.lastAt) < SYSTEM_LOG_RECENT_DEDUP_MS
  ) {
    return null;
  }
  systemLogRuntime.lastSignature = signature;
  systemLogRuntime.lastAt = nowMs;

  const entry = normalizeSystemLogEntry({
    id: makeId("log"),
    createdAt: nowISO(),
    kind: safeKind,
    message: safeMessage,
    route: String(state.route || "").trim(),
    actorId: String(actor?.id || "").trim(),
    actorName: String(actor?.name || actor?.email || "").trim(),
    actorRole: String(actor?.role || "").trim(),
    details: safeDetails,
  });
  if (!entry) {
    return null;
  }

  const existing = load(STORAGE_KEYS.systemLogs, []);
  const nextLogs = Array.isArray(existing) ? existing : [];
  nextLogs.push(entry);
  if (nextLogs.length > SYSTEM_LOG_MAX_ENTRIES) {
    nextLogs.splice(0, nextLogs.length - SYSTEM_LOG_MAX_ENTRIES);
  }

  systemLogRuntime.suspend = true;
  try {
    save(STORAGE_KEYS.systemLogs, nextLogs);
  } finally {
    systemLogRuntime.suspend = false;
  }
  return entry;
}

function summarizeStorageValueForLog(value) {
  if (Array.isArray(value)) {
    return { type: "array", length: value.length };
  }
  if (value && typeof value === "object") {
    return { type: "object", keys: Object.keys(value).length };
  }
  if (typeof value === "string") {
    return { type: "string", length: value.length };
  }
  if (value == null) {
    return { type: "null" };
  }
  if (typeof value === "boolean" || typeof value === "number") {
    return { type: typeof value, value };
  }
  return { type: typeof value };
}

function appendStorageMutationLog(operation, key, value) {
  const storageKey = String(key || "").trim();
  if (!storageKey || !SYSTEM_LOG_AUDITED_STORAGE_KEYS.has(storageKey)) {
    return;
  }
  const operationType = String(operation || "save").trim() || "save";
  const verb = operationType === "remove" ? "deleted" : "updated";
  appendSystemLog("storage.mutation", `Storage ${verb}: ${storageKey}`, {
    operation: operationType,
    key: storageKey,
    summary: summarizeStorageValueForLog(value),
  });
}

function getCurrentUser() {
  const users = getUsers();
  const activeAuthId = getActiveSupabaseAuthUserId();
  if (activeAuthId) {
    const byActiveAuthId = users.find((user) => (
      String(user?.supabaseAuthId || "").trim() === activeAuthId
      || String(user?.id || "").trim() === activeAuthId
    ));
    if (byActiveAuthId) {
      return byActiveAuthId;
    }
  }
  const userId = String(load(STORAGE_KEYS.currentUserId, null) || "").trim();
  if (!userId) {
    return null;
  }
  const byLocalId = users.find((user) => String(user?.id || "").trim() === userId);
  if (byLocalId) {
    return byLocalId;
  }
  return users.find((user) => String(user?.supabaseAuthId || "").trim() === userId) || null;
}

function isLikelyJwtToken(token) {
  return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(String(token || "").trim());
}

function parseJwtPayload(token) {
  const raw = String(token || "").trim();
  if (!isLikelyJwtToken(raw)) {
    return null;
  }
  const parts = raw.split(".");
  if (parts.length !== 3) {
    return null;
  }
  try {
    const base64 = parts[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(parts[1].length / 4) * 4, "=");
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

function isJwtTokenExpired(token, skewSeconds = 45) {
  const payload = parseJwtPayload(token);
  const exp = Number(payload?.exp || 0);
  if (!Number.isFinite(exp) || exp <= 0) {
    return false;
  }
  return (Date.now() / 1000) >= (exp - Math.max(0, Number(skewSeconds) || 0));
}

function isInvalidJwtMessage(message) {
  const text = String(message || "").trim().toLowerCase();
  if (!text) {
    return false;
  }
  return text.includes("invalid jwt")
    || (text.includes("jwt") && text.includes("expired"))
    || (text.includes("token") && text.includes("expired"))
    || (text.includes("jwt") && text.includes("malformed"));
}

function isSupabaseAccessRevokedMessage(errorOrMessage) {
  const code = String(errorOrMessage?.code || "").trim().toLowerCase();
  if (code === "user_banned") {
    return true;
  }
  const text = String(
    typeof errorOrMessage === "string"
      ? errorOrMessage
      : (errorOrMessage?.message || errorOrMessage?.error_description || errorOrMessage?.error || ""),
  ).trim().toLowerCase();
  if (!text) {
    return false;
  }
  return text.includes("user_banned")
    || text.includes("user is banned")
    || text.includes("banned user")
    || text.includes("account has been disabled")
    || text.includes("account is disabled");
}

function normalizeApiBaseUrl(baseUrl) {
  const raw = String(baseUrl || "").trim();
  if (!raw) {
    return "";
  }
  return raw.replace(/\/+$/, "");
}

function buildServerApiUrl(pathname) {
  const normalizedBase = normalizeApiBaseUrl(SUPABASE_CONFIG.serverApiBaseUrl || "");
  if (!normalizedBase) {
    return "";
  }
  const normalizedPath = `/${String(pathname || "").replace(/^\/+/, "")}`;
  if (/^https?:\/\//i.test(normalizedBase)) {
    try {
      return new URL(normalizedPath, `${normalizedBase}/`).toString();
    } catch {
      return `${normalizedBase}${normalizedPath}`;
    }
  }
  return normalizedBase.startsWith("/") ? `${normalizedBase}${normalizedPath}` : `/${normalizedBase}${normalizedPath}`;
}

async function readJsonResponseSafe(response) {
  try {
    return await response.clone().json();
  } catch {
    return null;
  }
}

async function getResponseDetails(response, payload) {
  const structured = String(payload?.error || payload?.message || "").trim();
  if (structured) {
    return structured;
  }
  try {
    return String(await response.text()).trim();
  } catch {
    return "";
  }
}

async function getValidSupabaseAccessToken(authClient) {
  if (!authClient?.auth) {
    return { ok: false, token: "", message: "Supabase auth client is not available." };
  }

  const readToken = async () => {
    const { data: sessionData, error: sessionError } = await runWithTimeoutResult(
      authClient.auth.getSession(),
      SUPABASE_SESSION_TIMEOUT_MS,
      "Supabase session check timed out.",
    );
    if (sessionError) {
      return {
        ok: false,
        token: "",
        refreshToken: "",
        sessionUserId: "",
        message: sessionError.message || "Could not verify Supabase session.",
      };
    }
    const session = sessionData?.session || null;
    const accessToken = String(sessionData?.session?.access_token || "").trim();
    const refreshToken = String(session?.refresh_token || "").trim();
    const sessionUserId = String(session?.user?.id || "").trim();
    if (!accessToken) {
      return {
        ok: false,
        token: "",
        refreshToken: refreshToken || "",
        sessionUserId,
        message: "No active Supabase session for this admin action. Log in with your Supabase admin account.",
      };
    }
    return {
      ok: true,
      token: accessToken,
      refreshToken: refreshToken || "",
      sessionUserId,
      message: "",
    };
  };

  let tokenResult = await readToken();
  if (!tokenResult.ok) {
    return tokenResult;
  }

  if (!isLikelyJwtToken(tokenResult.token) || isJwtTokenExpired(tokenResult.token, 60)) {
    await runWithTimeoutResult(
      authClient.auth.refreshSession({ refresh_token: tokenResult.refreshToken || undefined }).catch(() => { }),
      SUPABASE_SESSION_TIMEOUT_MS,
      "Supabase session refresh timed out.",
    );
    tokenResult = await readToken();
    if (!tokenResult.ok) {
      return tokenResult;
    }
  }

  const validateToken = async (token) => {
    try {
      const { data, error } = await runWithTimeoutResult(
        authClient.auth.getUser(token),
        SUPABASE_SESSION_TIMEOUT_MS,
        "Supabase user validation timed out.",
      );
      if (!error) {
        return {
          ok: Boolean(data?.user?.id),
          uncertain: false,
          message: "",
        };
      }
      return {
        ok: false,
        uncertain: isLikelyNetworkFetchError(error),
        message: getErrorMessage(error, ""),
      };
    } catch {
      return {
        ok: false,
        uncertain: true,
        message: "",
      };
    }
  };

  const hasFreshToken = (token) => isLikelyJwtToken(token) && !isJwtTokenExpired(token, 60);

  let validation = await validateToken(tokenResult.token);
  if (validation.ok) {
    return tokenResult;
  }
  if (validation.uncertain && hasFreshToken(tokenResult.token)) {
    return tokenResult;
  }

  await runWithTimeoutResult(
    authClient.auth.refreshSession({ refresh_token: tokenResult.refreshToken || undefined }).catch(() => { }),
    SUPABASE_SESSION_TIMEOUT_MS,
    "Supabase session refresh timed out.",
  );
  tokenResult = await readToken();
  if (!tokenResult.ok) {
    return tokenResult;
  }
  validation = await validateToken(tokenResult.token);
  if (validation.ok) {
    return tokenResult;
  }
  if (validation.uncertain && hasFreshToken(tokenResult.token)) {
    return tokenResult;
  }

  return {
    ok: false,
    token: "",
    message: "Supabase session expired. Log out and log in again, then retry.",
  };
}

async function deleteSupabaseAuthUserAsAdmin(targetAuthId) {
  if (!targetAuthId) {
    return { ok: true };
  }

  const authClient = getSupabaseAuthClient();
  if (!authClient) {
    return { ok: false, message: "Supabase auth client is not available." };
  }

  try {
    const serverDeleteUrl = buildServerApiUrl("/admin-delete-user");
    const hasLegacySupabaseFunction = Boolean(SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey);
    if (!serverDeleteUrl && !hasLegacySupabaseFunction) {
      return {
        ok: false,
        message: "No admin delete endpoint is configured in this app.",
      };
    }
    const actingUser = getCurrentUser();
    const currentUserProfileId = String(getUserProfileId(actingUser) || "").trim();
    if (!actingUser || actingUser.role !== "admin") {
      return {
        ok: false,
        message: "Delete requires a signed-in Supabase admin account. Log out and sign in again.",
      };
    }

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const tokenResult = await getValidSupabaseAccessToken(authClient);
      if (!tokenResult.ok) {
        return { ok: false, message: tokenResult.message || "Could not verify Supabase session." };
      }
      const actingProfileId = String(tokenResult.sessionUserId || "").trim();
      if (!isUuidValue(actingProfileId)) {
        return {
          ok: false,
          message: "Delete requires a signed-in Supabase admin account. Log out and sign in again.",
        };
      }
      supabaseAuth.activeUserId = actingProfileId;
      if (tokenResult.sessionUserId && tokenResult.sessionUserId !== actingProfileId) {
        return {
          ok: false,
          message: "Supabase session does not match the active admin account. Log out and sign in again.",
        };
      }
      if (isUuidValue(currentUserProfileId) && currentUserProfileId !== actingProfileId) {
        return {
          ok: false,
          message: "Supabase session does not match the active admin account. Log out and sign in again.",
        };
      }

      let response = null;
      let payload = null;
      let details = "";
      let serverErrorMessage = "";

      if (serverDeleteUrl) {
        try {
          response = await fetchWithTimeout(serverDeleteUrl, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${tokenResult.token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ targetAuthId }),
          });
          payload = await readJsonResponseSafe(response);
          details = await getResponseDetails(response, payload);
        } catch (serverError) {
          response = null;
          payload = null;
          details = "";
          serverErrorMessage = getErrorMessage(serverError, "Server API request failed.");
        }

        const canFallbackToLegacy = Boolean(response)
          && hasLegacySupabaseFunction
          && (
            response.status === 404
            || response.status === 405
            || response.status === 501
            || response.status >= 500
            || /missing required environment variable/i.test(details)
          );
        if (canFallbackToLegacy || (!response && hasLegacySupabaseFunction)) {
          response = null;
          payload = null;
          details = "";
        }
      }

      if (!response) {
        if (!hasLegacySupabaseFunction) {
          return {
            ok: false,
            message: serverErrorMessage || "Admin delete API is unavailable. Configure serverApiBaseUrl and retry.",
          };
        }
        response = await fetchWithTimeout(`${SUPABASE_CONFIG.url}/functions/v1/admin-delete-user`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${tokenResult.token}`,
            apikey: SUPABASE_CONFIG.anonKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ targetAuthId }),
        });
        payload = await readJsonResponseSafe(response);
        details = await getResponseDetails(response, payload);
      }

      if (response.ok && (payload?.ok !== false)) {
        return { ok: true };
      }

      if (response.status === 401 || response.status === 403) {
        if (attempt === 0 && isInvalidJwtMessage(details)) {
          await runWithTimeoutResult(
            authClient.auth.refreshSession({ refresh_token: tokenResult.refreshToken || undefined }).catch(() => { }),
            SUPABASE_SESSION_TIMEOUT_MS,
            "Supabase session refresh timed out.",
          );
          continue;
        }
        if (attempt === 0 && !details) {
          await runWithTimeoutResult(
            authClient.auth.refreshSession({ refresh_token: tokenResult.refreshToken || undefined }).catch(() => { }),
            SUPABASE_SESSION_TIMEOUT_MS,
            "Supabase session refresh timed out.",
          );
          continue;
        }
        const authMessage = isInvalidJwtMessage(details)
          ? "Supabase session expired. Log out and log in again with your Supabase admin account."
          : (details || "Unauthorized. Log out and log in again with your Supabase admin account.");
        return {
          ok: false,
          message: authMessage,
        };
      }
      if (/user not found/i.test(details)) {
        return { ok: true };
      }
      return {
        ok: false,
        message: details || `Admin delete request failed (${response.status}).`,
      };
    }

    return { ok: false, message: "Could not delete Supabase user." };
  } catch (error) {
    return { ok: false, message: error?.message || "Unexpected error during Supabase auth delete." };
  }
}

async function setSupabaseAuthUserPasswordAsAdmin(targetAuthId, password) {
  const safeTargetAuthId = String(targetAuthId || "").trim();
  if (!isUuidValue(safeTargetAuthId)) {
    return { ok: false, message: "Target auth user ID is invalid." };
  }
  if (!password || String(password).length < 6) {
    return { ok: false, message: "Password must be at least 6 characters." };
  }

  const authClient = getSupabaseAuthClient();
  if (!authClient) {
    return { ok: false, message: "Supabase auth client is not available." };
  }

  try {
    const serverSetPasswordUrl = buildServerApiUrl("/admin-set-user-password");
    const hasLegacySupabaseFunction = Boolean(SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey);
    if (!serverSetPasswordUrl && !hasLegacySupabaseFunction) {
      return {
        ok: false,
        message: "No admin password endpoint is configured in this app.",
      };
    }
    const actingUser = getCurrentUser();
    const currentUserProfileId = String(getUserProfileId(actingUser) || "").trim();
    if (!actingUser || actingUser.role !== "admin") {
      return {
        ok: false,
        message: "Password update requires a signed-in Supabase admin account. Log out and sign in again.",
      };
    }

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const tokenResult = await getValidSupabaseAccessToken(authClient);
      if (!tokenResult.ok) {
        return { ok: false, message: tokenResult.message || "Could not verify Supabase session." };
      }
      const actingProfileId = String(tokenResult.sessionUserId || "").trim();
      if (!isUuidValue(actingProfileId)) {
        return {
          ok: false,
          message: "Password update requires a signed-in Supabase admin account. Log out and sign in again.",
        };
      }
      supabaseAuth.activeUserId = actingProfileId;
      if (tokenResult.sessionUserId && tokenResult.sessionUserId !== actingProfileId) {
        return {
          ok: false,
          message: "Supabase session does not match the active admin account. Log out and sign in again.",
        };
      }
      if (isUuidValue(currentUserProfileId) && currentUserProfileId !== actingProfileId) {
        return {
          ok: false,
          message: "Supabase session does not match the active admin account. Log out and sign in again.",
        };
      }

      let response = null;
      let payload = null;
      let details = "";
      let serverErrorMessage = "";

      if (serverSetPasswordUrl) {
        try {
          response = await fetchWithTimeout(serverSetPasswordUrl, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${tokenResult.token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ targetAuthId: safeTargetAuthId, password }),
          });
          payload = await readJsonResponseSafe(response);
          details = await getResponseDetails(response, payload);
        } catch (serverError) {
          response = null;
          payload = null;
          details = "";
          serverErrorMessage = getErrorMessage(serverError, "Server API request failed.");
        }

        const canFallbackToLegacy = Boolean(response)
          && hasLegacySupabaseFunction
          && (
            response.status === 404
            || response.status === 405
            || response.status === 501
            || response.status >= 500
            || /missing required environment variable/i.test(details)
          );
        if (canFallbackToLegacy || (!response && hasLegacySupabaseFunction)) {
          response = null;
          payload = null;
          details = "";
        }
      }

      if (!response) {
        if (!hasLegacySupabaseFunction) {
          return {
            ok: false,
            message: serverErrorMessage || "Admin password API is unavailable. Configure serverApiBaseUrl and retry.",
          };
        }
        response = await fetchWithTimeout(`${SUPABASE_CONFIG.url}/functions/v1/admin-set-user-password`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${tokenResult.token}`,
            apikey: SUPABASE_CONFIG.anonKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ targetAuthId: safeTargetAuthId, password }),
        });
        payload = await readJsonResponseSafe(response);
        details = await getResponseDetails(response, payload);
      }

      if (response.ok && (payload?.ok !== false)) {
        return { ok: true };
      }

      if (response.status === 401 || response.status === 403) {
        if (attempt === 0 && isInvalidJwtMessage(details)) {
          await runWithTimeoutResult(
            authClient.auth.refreshSession({ refresh_token: tokenResult.refreshToken || undefined }).catch(() => { }),
            SUPABASE_SESSION_TIMEOUT_MS,
            "Supabase session refresh timed out.",
          );
          continue;
        }
        if (attempt === 0 && !details) {
          await runWithTimeoutResult(
            authClient.auth.refreshSession({ refresh_token: tokenResult.refreshToken || undefined }).catch(() => { }),
            SUPABASE_SESSION_TIMEOUT_MS,
            "Supabase session refresh timed out.",
          );
          continue;
        }
        const authMessage = isInvalidJwtMessage(details)
          ? "Supabase session expired. Log out and log in again with your Supabase admin account."
          : (details || "Unauthorized. Log out and log in again with your Supabase admin account.");
        return {
          ok: false,
          message: authMessage,
        };
      }
      if (/not found|user not found/i.test(details)) {
        return {
          ok: false,
          message: "Target auth user was not found.",
        };
      }
      return {
        ok: false,
        message: details || `Admin password request failed (${response.status}).`,
      };
    }

    return { ok: false, message: "Could not update Supabase user password." };
  } catch (error) {
    return { ok: false, message: error?.message || "Unexpected error during Supabase password update." };
  }
}

async function setSupabaseAuthUserAccessAsAdmin(targetAuthIds, approved) {
  const ids = [...new Set(
    (Array.isArray(targetAuthIds) ? targetAuthIds : [targetAuthIds])
      .map((entry) => String(entry || "").trim())
      .filter((entry) => isUuidValue(entry)),
  )];
  if (!ids.length) {
    return { ok: true, updatedIds: [], notFoundIds: [], failedIds: [], message: "" };
  }
  if (typeof approved !== "boolean") {
    return { ok: false, updatedIds: [], notFoundIds: [], failedIds: ids, message: "approved must be a boolean value." };
  }

  const normalizeAccessResult = (payload, fallbackMessage = "") => {
    const updatedIds = [...new Set(
      (Array.isArray(payload?.updatedIds) ? payload.updatedIds : [])
        .map((entry) => String(entry || "").trim())
        .filter((entry) => isUuidValue(entry) && ids.includes(entry)),
    )];
    const notFoundIds = [...new Set(
      (Array.isArray(payload?.notFoundIds) ? payload.notFoundIds : [])
        .map((entry) => String(entry || "").trim())
        .filter((entry) => isUuidValue(entry) && ids.includes(entry)),
    )];
    const explicitFailedIds = [...new Set(
      (Array.isArray(payload?.failedIds) ? payload.failedIds : [])
        .map((entry) => String(entry || "").trim())
        .filter((entry) => isUuidValue(entry) && ids.includes(entry)),
    )];
    const failedIds = explicitFailedIds.length
      ? explicitFailedIds
      : ids.filter((entry) => !updatedIds.includes(entry) && !notFoundIds.includes(entry));
    const message = String(payload?.error || payload?.message || fallbackMessage || "").trim();
    return {
      ok: !failedIds.length,
      updatedIds,
      notFoundIds,
      failedIds,
      message,
    };
  };

  const authClient = getSupabaseAuthClient();
  if (!authClient) {
    return { ok: false, updatedIds: [], notFoundIds: [], failedIds: ids, message: "Supabase auth client is not available." };
  }

  try {
    const serverSetAccessUrl = buildServerApiUrl("/admin-set-user-access");
    const hasLegacySupabaseFunction = Boolean(SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey);
    if (!serverSetAccessUrl && !hasLegacySupabaseFunction) {
      return {
        ok: false,
        updatedIds: [],
        notFoundIds: [],
        failedIds: ids,
        message: "No admin access endpoint is configured in this app.",
      };
    }
    const actingUser = getCurrentUser();
    const currentUserProfileId = String(getUserProfileId(actingUser) || "").trim();
    if (!actingUser || actingUser.role !== "admin") {
      return {
        ok: false,
        updatedIds: [],
        notFoundIds: [],
        failedIds: ids,
        message: "Account access updates require a signed-in Supabase admin account. Log out and sign in again.",
      };
    }

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const tokenResult = await getValidSupabaseAccessToken(authClient);
      if (!tokenResult.ok) {
        return {
          ok: false,
          updatedIds: [],
          notFoundIds: [],
          failedIds: ids,
          message: tokenResult.message || "Could not verify Supabase session.",
        };
      }
      const actingProfileId = String(tokenResult.sessionUserId || "").trim();
      if (!isUuidValue(actingProfileId)) {
        return {
          ok: false,
          updatedIds: [],
          notFoundIds: [],
          failedIds: ids,
          message: "Account access updates require a signed-in Supabase admin account. Log out and sign in again.",
        };
      }
      supabaseAuth.activeUserId = actingProfileId;
      if (tokenResult.sessionUserId && tokenResult.sessionUserId !== actingProfileId) {
        return {
          ok: false,
          updatedIds: [],
          notFoundIds: [],
          failedIds: ids,
          message: "Supabase session does not match the active admin account. Log out and sign in again.",
        };
      }
      if (isUuidValue(currentUserProfileId) && currentUserProfileId !== actingProfileId) {
        return {
          ok: false,
          updatedIds: [],
          notFoundIds: [],
          failedIds: ids,
          message: "Supabase session does not match the active admin account. Log out and sign in again.",
        };
      }

      let response = null;
      let payload = null;
      let details = "";
      let serverErrorMessage = "";

      if (serverSetAccessUrl) {
        try {
          response = await fetchWithTimeout(serverSetAccessUrl, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${tokenResult.token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ targetAuthIds: ids, approved }),
          });
          payload = await readJsonResponseSafe(response);
          details = await getResponseDetails(response, payload);
        } catch (serverError) {
          response = null;
          payload = null;
          details = "";
          serverErrorMessage = getErrorMessage(serverError, "Server API request failed.");
        }

        const canFallbackToLegacy = Boolean(response)
          && hasLegacySupabaseFunction
          && (
            response.status === 404
            || response.status === 405
            || response.status === 501
            || response.status >= 500
            || /missing required environment variable/i.test(details)
          );
        if (canFallbackToLegacy || (!response && hasLegacySupabaseFunction)) {
          response = null;
          payload = null;
          details = "";
        }
      }

      if (!response) {
        if (!hasLegacySupabaseFunction) {
          return {
            ok: false,
            updatedIds: [],
            notFoundIds: [],
            failedIds: ids,
            message: serverErrorMessage || "Admin access API is unavailable. Configure serverApiBaseUrl and retry.",
          };
        }
        response = await fetchWithTimeout(`${SUPABASE_CONFIG.url}/functions/v1/admin-set-user-access`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${tokenResult.token}`,
            apikey: SUPABASE_CONFIG.anonKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ targetAuthIds: ids, approved }),
        });
        payload = await readJsonResponseSafe(response);
        details = await getResponseDetails(response, payload);
      }

      const normalizedResult = normalizeAccessResult(payload, details || `Admin access request failed (${response.status}).`);
      if (response.ok) {
        return normalizedResult;
      }

      if (response.status === 401 || response.status === 403) {
        if (attempt === 0 && isInvalidJwtMessage(details)) {
          await runWithTimeoutResult(
            authClient.auth.refreshSession({ refresh_token: tokenResult.refreshToken || undefined }).catch(() => { }),
            SUPABASE_SESSION_TIMEOUT_MS,
            "Supabase session refresh timed out.",
          );
          continue;
        }
        if (attempt === 0 && !details) {
          await runWithTimeoutResult(
            authClient.auth.refreshSession({ refresh_token: tokenResult.refreshToken || undefined }).catch(() => { }),
            SUPABASE_SESSION_TIMEOUT_MS,
            "Supabase session refresh timed out.",
          );
          continue;
        }
        const authMessage = isInvalidJwtMessage(details)
          ? "Supabase session expired. Log out and log in again with your Supabase admin account."
          : (details || "Unauthorized. Log out and log in again with your Supabase admin account.");
        return {
          ok: false,
          updatedIds: normalizedResult.updatedIds,
          notFoundIds: normalizedResult.notFoundIds,
          failedIds: normalizedResult.failedIds,
          message: authMessage,
        };
      }

      return {
        ok: false,
        updatedIds: normalizedResult.updatedIds,
        notFoundIds: normalizedResult.notFoundIds,
        failedIds: normalizedResult.failedIds,
        message: normalizedResult.message,
      };
    }

    return { ok: false, updatedIds: [], notFoundIds: [], failedIds: ids, message: "Could not update Supabase user access." };
  } catch (error) {
    return { ok: false, updatedIds: [], notFoundIds: [], failedIds: ids, message: error?.message || "Unexpected error during Supabase auth access update." };
  }
}

function getSessionsForUser(userId) {
  return getSessions().filter((session) => session.userId === userId);
}

function getAcademicTermScopedSessionsForUser(userId, userOverride = null, questionMetaById = null) {
  const sessions = getSessionsForUser(userId);
  const targetUser = userOverride || findUserForAnalytics(userId);
  if (!targetUser || targetUser.role !== "student") {
    return sessions;
  }
  const map = questionMetaById instanceof Map ? questionMetaById : getAnalyticsQuestionMetaById();
  return sessions.filter((session) => isSessionWithinUserAcademicTerm(session, targetUser, map));
}

function getCompletedSessionsForUser(userId) {
  return getAcademicTermScopedSessionsForUser(userId)
    .filter((session) => session.status === "completed")
    .sort((a, b) => new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt));
}

function getIncorrectQuestionIdsForSession(session, questionsById = null) {
  if (!session || !Array.isArray(session.questionIds)) {
    return [];
  }
  const map = questionsById || Object.fromEntries(getQuestions().map((question) => [question.id, question]));
  const wrongIds = [];
  session.questionIds.forEach((qid) => {
    const question = map[qid];
    const response = session.responses?.[qid];
    if (!question || !response) return;
    const isCorrect = isSubmittedResponseCorrect(question, response);
    if (!isCorrect) {
      wrongIds.push(qid);
    }
  });
  return wrongIds;
}

function getRetryQuestionMetaForSession(session, questionsById = null) {
  if (!session || !Array.isArray(session.questionIds)) {
    return { questionIds: [], wrongSubmitted: 0, unsolved: 0 };
  }

  const map = questionsById || Object.fromEntries(getQuestions().map((question) => [question.id, question]));
  const questionIds = [];
  let wrongSubmitted = 0;
  let unsolved = 0;

  session.questionIds.forEach((qid) => {
    const question = map[qid];
    if (!question) {
      return;
    }
    const response = session.responses?.[qid];
    if (!response || !response.submitted) {
      questionIds.push(qid);
      unsolved += 1;
      return;
    }
    if (!isSubmittedResponseCorrect(question, response)) {
      questionIds.push(qid);
      wrongSubmitted += 1;
    }
  });

  return { questionIds, wrongSubmitted, unsolved };
}

function getSessionPerformanceSummary(session, questionsById = null) {
  if (!session || !Array.isArray(session.questionIds) || !session.questionIds.length) {
    return { total: 0, correct: 0, wrongCount: 0, accuracy: 0 };
  }
  const map = questionsById || Object.fromEntries(getQuestions().map((question) => [question.id, question]));
  let correct = 0;
  let total = 0;
  session.questionIds.forEach((qid) => {
    const question = map[qid];
    const response = session.responses?.[qid];
    if (!question || !response) return;
    total += 1;
    const isCorrect = isSubmittedResponseCorrect(question, response);
    if (isCorrect) {
      correct += 1;
    }
  });
  const wrongCount = Math.max(0, total - correct);
  const accuracy = total ? Math.round((correct / total) * 100) : 0;
  return { total, correct, wrongCount, accuracy };
}

function createSessionFromQuestions(questions, config = {}) {
  const user = getCurrentUser();
  const sourcePool = Array.isArray(questions) ? questions.filter(Boolean) : [];
  if (!user || !sourcePool.length) {
    return null;
  }

  const countValue = Math.floor(Number(config.count ?? sourcePool.length));
  const count = Math.max(1, Math.min(sourcePool.length, Number.isFinite(countValue) ? countValue : sourcePool.length));
  const selected = sourcePool.slice(0, count);
  if (!selected.length) {
    return null;
  }

  const mode = config.mode === "timed" ? "timed" : "tutor";
  const durationValue = Number(config.duration ?? 20);
  const duration = Math.max(5, Number.isFinite(durationValue) ? durationValue : 20);
  const source = String(config.source || "all");
  const sessionAcademicYear = user.role === "student" ? normalizeAcademicYearOrNull(user.academicYear) : null;
  const sessionAcademicSemester = user.role === "student" ? normalizeAcademicSemesterOrNull(user.academicSemester) : null;
  const sessionId = makeId("s");
  const sessionCourses = [];
  const seenSessionCourses = new Set();

  const responses = {};
  selected.forEach((question) => {
    responses[question.id] = {
      selected: [],
      flagged: false,
      struck: [],
      notes: "",
      timeSpentSec: 0,
      highlightedLines: [],
      highlightedLineColors: {},
      highlightedChoices: {},
      textHighlights: buildEmptyTextHighlightStore(),
      submitted: false,
    };
    const mappedCourse = String(getQbankCourseTopicMeta(question).course || "").trim();
    if (mappedCourse && !seenSessionCourses.has(mappedCourse)) {
      seenSessionCourses.add(mappedCourse);
      sessionCourses.push(mappedCourse);
    }
  });
  const sessionName = normalizeSessionName(config.name, buildAutoSessionName({
    courseLabel: config.courseLabel,
    courses: sessionCourses,
    mode,
    source,
    questionCount: selected.length,
  }));
  const sessionTestId = normalizeSessionTestId(config.testId, sessionId);

  const session = {
    id: sessionId,
    userId: user.id,
    name: sessionName,
    testId: sessionTestId,
    mode,
    source,
    durationMin: duration,
    timeRemainingSec: mode === "timed" ? duration * 60 : null,
    paused: false,
    courses: sessionCourses,
    academicYear: sessionAcademicYear,
    academicSemester: sessionAcademicSemester,
    questionIds: selected.map((question) => question.id),
    responses,
    currentIndex: 0,
    status: "in_progress",
    lastQuestionAt: Date.now(),
    elapsedSec: 0,
    createdAt: nowISO(),
    updatedAt: nowISO(),
    completedAt: null,
    originSessionId: config.originSessionId || null,
  };

  const sessions = getSessions();
  sessions.push(session);
  save(STORAGE_KEYS.sessions, sessions);
  return session;
}

function getActiveSession(userId, preferredId = null) {
  const sessions = getAcademicTermScopedSessionsForUser(userId).filter((session) => session.status === "in_progress");
  if (!sessions.length) {
    return null;
  }

  return sessions.find((session) => session.id === preferredId) || sessions.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0];
}

function getNormalizedActiveSessionForDisplay(userId, preferredId = null) {
  if (!userId) {
    return null;
  }

  const active = getActiveSession(userId, preferredId);
  if (!active) {
    return null;
  }
  normalizeSession(active);
  if (active.status === "in_progress" && Array.isArray(active.questionIds) && active.questionIds.length) {
    return active;
  }

  const fallback = getActiveSession(userId, preferredId);
  if (!fallback) {
    return null;
  }
  normalizeSession(fallback);
  if (fallback.status === "in_progress" && Array.isArray(fallback.questionIds) && fallback.questionIds.length) {
    return fallback;
  }
  return null;
}

function getSessionById(sessionId) {
  return getSessions().find((session) => session.id === sessionId) || null;
}

function upsertSession(updated, options = {}) {
  const sessions = getSessions();
  const idx = sessions.findIndex((session) => session.id === updated.id);
  if (idx >= 0) {
    sessions[idx] = updated;
  } else {
    sessions.push(updated);
  }
  save(STORAGE_KEYS.sessions, sessions, options);
}

function getFilterOptions(questions) {
  return {
    course: uniqueValues(questions.map((question) => question.course)),
    system: uniqueValues(questions.map((question) => question.system)),
    topic: uniqueValues(questions.map((question) => question.topic)),
    difficulty: uniqueValues(questions.map((question) => question.difficulty)),
    tag: uniqueValues(questions.flatMap((question) => question.tags || [])),
  };
}

function applyQuestionFilters(questions, filters, sort) {
  const missRateByQuestion = getMissRateByQuestion(getCurrentUser()?.id);

  let result = questions.filter((question) => {
    if (filters.course && question.course !== filters.course) return false;
    if (filters.system && question.system !== filters.system) return false;
    if (filters.topic && question.topic !== filters.topic) return false;
    if (filters.difficulty && question.difficulty !== filters.difficulty) return false;
    if (filters.tag && !(question.tags || []).includes(filters.tag)) return false;

    if (filters.search) {
      const haystack = `${question.stem} ${question.explanation} ${(question.tags || []).join(" ")}`.toLowerCase();
      if (!haystack.includes(filters.search.toLowerCase())) return false;
    }

    return true;
  });

  if (sort === "newest") {
    result = result.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
  }

  if (sort === "oldest") {
    result = result.sort((a, b) => new Date(a.dateAdded) - new Date(b.dateAdded));
  }

  if (sort === "mostMissed") {
    result = result.sort((a, b) => (missRateByQuestion[b.id] || 0) - (missRateByQuestion[a.id] || 0));
  }

  if (sort === "difficulty") {
    const order = { Easy: 0, Medium: 1, Hard: 2 };
    result = result.sort((a, b) => (order[a.difficulty] || 0) - (order[b.difficulty] || 0));
  }

  return result;
}

function applyQbankFilters(questions, filters, options = {}) {
  const selectedCourse = String(filters?.course || "").trim();
  const selectedTopics = Array.isArray(filters?.topics) ? filters.topics.filter(Boolean) : [];
  const singleTopic = String(filters?.topic || "").trim();
  const strictEmptyTopics = Boolean(options?.strictEmptyTopics);

  return questions
    .map((question) => {
      const meta = getQbankCourseTopicMeta(question);
      return {
        ...question,
        qbankCourse: meta.course,
        qbankTopic: meta.topic,
      };
    })
    .filter((question) => {
      if (selectedCourse && question.qbankCourse !== selectedCourse) {
        return false;
      }
      if (selectedTopics.length && !selectedTopics.includes(question.qbankTopic)) {
        return false;
      }
      if (!selectedTopics.length) {
        if (singleTopic && question.qbankTopic !== singleTopic) {
          return false;
        }
        if (strictEmptyTopics) {
          return false;
        }
      }
      return true;
    })
    .sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
}

function getAvailableTopicsForCourse(course, questions = [], options = {}) {
  const configuredTopics = (QBANK_COURSE_TOPICS[course] || []).filter((topic) => !isRemovedTopicName(topic));
  const questionTopics = [];
  const seen = new Set();
  const includeConfigured = Boolean(options?.includeConfigured);

  (questions || []).forEach((question) => {
    const meta = getQbankCourseTopicMeta(question);
    if (meta.course !== course || !meta.topic || isRemovedTopicName(meta.topic)) {
      return;
    }
    const key = meta.topic.toLowerCase();
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    questionTopics.push(meta.topic);
  });

  // Student topic filters default to published topics, but allow configured topics when needed.
  const questionTopicKeys = new Set(questionTopics.map((topic) => String(topic || "").trim().toLowerCase()));
  const configuredTopicKeys = new Set(configuredTopics.map((topic) => String(topic || "").trim().toLowerCase()));
  const orderedConfigured = includeConfigured
    ? configuredTopics
    : configuredTopics.filter((topic) => questionTopicKeys.has(String(topic || "").trim().toLowerCase()));
  const extraTopics = questionTopics.filter((topic) => !configuredTopicKeys.has(String(topic || "").trim().toLowerCase()));
  return [...orderedConfigured, ...extraTopics];
}

function buildTopicNewKey(course, topic) {
  const normalizedCourse = String(course || "").trim().toLowerCase();
  const normalizedTopic = String(topic || "").trim().toLowerCase();
  if (!normalizedCourse || !normalizedTopic) {
    return "";
  }
  return `${normalizedCourse}::${normalizedTopic}`;
}

function normalizeTopicNewCatalog(raw) {
  const source = isRecordObject(raw) ? raw : {};
  const normalized = {};
  Object.entries(source).forEach(([rawKey, value]) => {
    const course = String(value?.course || "").trim();
    const topic = String(value?.topic || "").trim();
    const badgeId = String(value?.badgeId || "").trim();
    const createdAt = String(value?.createdAt || "").trim();
    const key = String(rawKey || "").trim();
    if (!key || !course || !topic || !badgeId) {
      return;
    }
    normalized[key] = {
      course,
      topic,
      badgeId,
      createdAt,
    };
  });
  return normalized;
}

function normalizeTopicNewSeenState(raw) {
  const source = isRecordObject(raw) ? raw : {};
  const normalized = {};
  Object.entries(source).forEach(([rawKey, value]) => {
    const key = String(rawKey || "").trim();
    const badgeId = String(value || "").trim();
    if (!key || !badgeId) {
      return;
    }
    normalized[key] = badgeId;
  });
  return normalized;
}

function normalizeTopicNewSeenUserMap(raw) {
  const source = isRecordObject(raw) ? raw : {};
  const normalized = {};
  Object.entries(source).forEach(([rawUserId, value]) => {
    const userId = String(rawUserId || "").trim();
    if (!userId) {
      return;
    }
    normalized[userId] = normalizeTopicNewSeenState(value);
  });
  return normalized;
}

function getTopicNewCatalog() {
  return normalizeTopicNewCatalog(load(STORAGE_KEYS.topicNewCatalog, {}));
}

function getTopicNewSeenState(user = null) {
  const current = user || getCurrentUser();
  const userId = String(current?.id || "").trim();
  if (!userId) {
    return {};
  }
  const stateByUser = normalizeTopicNewSeenUserMap(load(STORAGE_KEYS.topicNewSeen, {}));
  return normalizeTopicNewSeenState(stateByUser[userId]);
}

function saveTopicNewSeenState(nextState, user = null) {
  const current = user || getCurrentUser();
  const userId = String(current?.id || "").trim();
  if (!userId) {
    return false;
  }
  const stateByUser = normalizeTopicNewSeenUserMap(load(STORAGE_KEYS.topicNewSeen, {}));
  stateByUser[userId] = normalizeTopicNewSeenState(nextState);
  save(STORAGE_KEYS.topicNewSeen, stateByUser);
  return true;
}

function isTopicNewForUser(course, topic, user = null) {
  const current = user || getCurrentUser();
  if (!current || current.role !== "student") {
    return false;
  }
  const key = buildTopicNewKey(course, topic);
  if (!key) {
    return false;
  }
  const entry = getTopicNewCatalog()[key];
  if (!entry) {
    return false;
  }
  const seenState = getTopicNewSeenState(current);
  return seenState[key] !== entry.badgeId;
}

function markTopicListAsSeen(course, topics, user = null) {
  const current = user || getCurrentUser();
  if (!current || current.role !== "student") {
    return false;
  }
  const catalog = getTopicNewCatalog();
  const seenState = getTopicNewSeenState(current);
  let changed = false;
  (Array.isArray(topics) ? topics : []).forEach((topic) => {
    const key = buildTopicNewKey(course, topic);
    const entry = catalog[key];
    if (!entry || seenState[key] === entry.badgeId) {
      return;
    }
    seenState[key] = entry.badgeId;
    changed = true;
  });
  if (changed) {
    saveTopicNewSeenState(seenState, current);
  }
  return changed;
}

function mergeHydratedTopicNewCatalogWithLocal(remotePayload) {
  const remote = normalizeTopicNewCatalog(remotePayload);
  const local = getTopicNewCatalog();
  const merged = { ...remote };
  Object.entries(local).forEach(([key, localEntry]) => {
    const remoteEntry = merged[key];
    if (!remoteEntry) {
      merged[key] = localEntry;
      return;
    }
    const localMs = parseSyncTimestampMs(localEntry?.createdAt);
    const remoteMs = parseSyncTimestampMs(remoteEntry?.createdAt);
    merged[key] = localMs >= remoteMs ? localEntry : remoteEntry;
  });
  return merged;
}

function mergeHydratedTopicNewSeenWithLocal(remotePayload) {
  const remote = normalizeTopicNewSeenUserMap(remotePayload);
  const local = normalizeTopicNewSeenUserMap(load(STORAGE_KEYS.topicNewSeen, {}));
  const merged = { ...local };
  Object.entries(remote).forEach(([userId, remoteState]) => {
    const localState = normalizeTopicNewSeenState(local[userId]);
    merged[userId] = {
      ...normalizeTopicNewSeenState(remoteState),
      ...localState,
    };
  });
  return merged;
}

function syncTopicNewCatalogForCourse(course, previousTopics, nextTopics, options = {}) {
  const normalizedCourse = String(course || "").trim();
  if (!normalizedCourse) {
    return false;
  }
  const previousList = normalizeCourseTopicList(previousTopics, normalizedCourse);
  const nextList = normalizeCourseTopicList(nextTopics, normalizedCourse);
  const previousKeySet = new Set(previousList.map((topic) => buildTopicNewKey(normalizedCourse, topic)).filter(Boolean));
  const nextKeySet = new Set(nextList.map((topic) => buildTopicNewKey(normalizedCourse, topic)).filter(Boolean));
  const catalog = getTopicNewCatalog();
  const renamedFrom = String(options?.renamedFrom || "").trim();
  const renamedTo = String(options?.renamedTo || "").trim();
  let changed = false;

  if (renamedFrom && renamedTo) {
    const oldKey = buildTopicNewKey(normalizedCourse, renamedFrom);
    const newKey = buildTopicNewKey(normalizedCourse, renamedTo);
    if (oldKey && newKey && catalog[oldKey]) {
      if (oldKey === newKey) {
        if (catalog[oldKey].topic !== renamedTo || catalog[oldKey].course !== normalizedCourse) {
          catalog[oldKey] = {
            ...catalog[oldKey],
            course: normalizedCourse,
            topic: renamedTo,
          };
          changed = true;
        }
      } else {
        catalog[newKey] = {
          ...catalog[oldKey],
          course: normalizedCourse,
          topic: renamedTo,
        };
        delete catalog[oldKey];
        changed = true;
      }
    }
  }

  previousList.forEach((topic) => {
    const key = buildTopicNewKey(normalizedCourse, topic);
    if (!key || nextKeySet.has(key) || !catalog[key]) {
      return;
    }
    delete catalog[key];
    changed = true;
  });

  nextList.forEach((topic) => {
    const key = buildTopicNewKey(normalizedCourse, topic);
    if (!key) {
      return;
    }
    if (catalog[key]) {
      if (catalog[key].topic !== topic || catalog[key].course !== normalizedCourse) {
        catalog[key] = {
          ...catalog[key],
          course: normalizedCourse,
          topic,
        };
        changed = true;
      }
      return;
    }
    if (previousKeySet.has(key)) {
      return;
    }
    catalog[key] = {
      course: normalizedCourse,
      topic,
      badgeId: makeId("topicnew"),
      createdAt: nowISO(),
    };
    changed = true;
  });

  if (changed) {
    save(STORAGE_KEYS.topicNewCatalog, normalizeTopicNewCatalog(catalog));
  }
  return changed;
}

function getRecoveryNeedlesForProfile(profileKey, extraNeedles = []) {
  const merged = new Set(
    (Array.isArray(extraNeedles) ? extraNeedles : [])
      .map((entry) => String(entry || "").trim().toLowerCase())
      .filter(Boolean),
  );
  (Array.isArray(COURSE_TOPIC_RECOVERY_RULES[profileKey]) ? COURSE_TOPIC_RECOVERY_RULES[profileKey] : []).forEach((rule) => {
    (Array.isArray(rule?.needles) ? rule.needles : []).forEach((needle) => {
      const normalizedNeedle = String(needle || "").toLowerCase();
      if (normalizedNeedle.trim()) {
        merged.add(normalizedNeedle);
      }
    });
  });
  return [...merged];
}

function getQbankCourseTopicMeta(question) {
  const explicitCourse = String(question.qbankCourse || question.course || "").trim();
  const explicitTopic = String(question.qbankTopic || question.topic || "").trim();
  const sanitizedExplicitTopic = isRemovedTopicName(explicitTopic) ? "" : explicitTopic;
  const matchedExplicitCourse = resolveMatchingCourseKeyInMap(explicitCourse, QBANK_COURSE_TOPICS);
  if (matchedExplicitCourse && QBANK_COURSE_TOPICS[matchedExplicitCourse]) {
    const canonicalTopic = (() => {
      if (!sanitizedExplicitTopic) {
        return "";
      }
      const matchingTopic = (QBANK_COURSE_TOPICS[matchedExplicitCourse] || []).find(
        (topic) => String(topic || "").trim().toLowerCase() === sanitizedExplicitTopic.toLowerCase(),
      );
      return matchingTopic || sanitizedExplicitTopic;
    })();
    return {
      course: matchedExplicitCourse,
      topic: canonicalTopic || resolveDefaultTopic(matchedExplicitCourse, canonicalTopic),
    };
  }

  const system = String(question.system || "").toLowerCase();
  const topic = String(question.topic || "").toLowerCase();
  const stem = String(question.stem || "").toLowerCase();
  const courseText = explicitCourse.toLowerCase();
  const text = `${courseText} ${system} ${topic} ${stem}`;

  const rules = [
    {
      course: "Endocrinology & Reproduction (ERP 208)",
      recoveryProfileKey: "erp208",
      needles: getRecoveryNeedlesForProfile("erp208", ["endocrine", "reproduc"]),
    },
    {
      course: "Nervous System (NER 206)",
      recoveryProfileKey: "ner206",
      needles: getRecoveryNeedlesForProfile("ner206", ["neuro", "nerology", "brain", "spinal", "dementia", "parkinson"]),
    },
    {
      course: "Cardiovascular System (CVS 202)",
      needles: ["cardio", "arrhythmia", "heart", "hypertension", "ecg", "av nodal", "coronary"],
    },
    {
      course: "Respiratory System (RES 201)",
      needles: ["respirat", "asthma", "copd", "abg", "pco2", "oxygen", "hypoxia"],
    },
    {
      course: "Urinary System (URS 207)",
      needles: ["renal", "kidney", "nephro", "urinary", "electrolyte", "siadh", "hyponatremia"],
    },
    {
      course: "GIT & Liver (GIL 203)",
      needles: ["liver", "hepat", "cirrhosis", "ascites", "git", "gastro", "bowel"],
    },
    {
      course: "Pediatric 401 (Ped 401)",
      needles: ["pediatr", "neonat", "newborn"],
    },
    {
      course: "Obstetric (Obs 501)",
      needles: ["pregnan", "obstetric", "antenatal", "labor", "fetus"],
    },
    {
      course: "Gynecology (Gyn 504)",
      needles: ["gyne", "menstrual", "ovary", "uterus", "endometriosis"],
    },
  ];

  for (const rule of rules) {
    if (hasAny(text, rule.needles)) {
      const mappedCourse = rule.recoveryProfileKey
        ? getPreferredConfiguredCourseForRecoveryProfile(rule.recoveryProfileKey, rule.course)
        : (QBANK_COURSE_TOPICS[rule.course] ? rule.course : CURRICULUM_COURSE_LIST[0] || rule.course);
      return {
        course: mappedCourse,
        topic: resolveDefaultTopic(mappedCourse, sanitizedExplicitTopic),
      };
    }
  }

  const fallbackCourse = QBANK_COURSE_TOPICS["Introduction for All Students (Intro 100)"]
    ? "Introduction for All Students (Intro 100)"
    : CURRICULUM_COURSE_LIST[0] || "Introduction for All Students (Intro 100)";
  return {
    course: fallbackCourse,
    topic: resolveDefaultTopic(fallbackCourse, sanitizedExplicitTopic),
  };
}

function resolveDefaultTopic(course, preferredTopic = "") {
  const topics = (QBANK_COURSE_TOPICS[course] || getDefaultTopicsForCourse(course)).filter(
    (topic) => !isRemovedTopicName(topic),
  );
  const canonicalTopic = findMatchingTopicNameInList(topics, preferredTopic);
  if (canonicalTopic && !isRemovedTopicName(canonicalTopic)) {
    return canonicalTopic;
  }
  return topics[0] || "Clinical Applications";
}

function hasAny(text, needles) {
  return needles.some((needle) => text.includes(needle));
}

function buildQuestionTopicCatalogForCourse(course, questions = []) {
  const orderedTopics = [];
  const seen = new Set();
  (Array.isArray(questions) ? questions : []).forEach((question) => {
    const meta = getQbankCourseTopicMeta(question);
    if (meta.course !== course) {
      return;
    }
    const topic = String(meta.topic || question?.qbankTopic || question?.topic || "").trim();
    const topicKey = normalizeTopicKey(topic);
    if (!topic || !topicKey || isRemovedTopicName(topic) || seen.has(topicKey)) {
      return;
    }
    seen.add(topicKey);
    orderedTopics.push(topic);
  });
  return orderedTopics;
}

function buildGroupedTopicCatalogForCourse(course) {
  const orderedTopics = [];
  const seen = new Set();
  Object.values(getCourseTopicGroups(course) || {}).forEach((topics) => {
    (Array.isArray(topics) ? topics : []).forEach((topicEntry) => {
      const topic = String(topicEntry || "").trim();
      const topicKey = normalizeTopicKey(topic);
      if (!topic || !topicKey || isRemovedTopicName(topic) || seen.has(topicKey)) {
        return;
      }
      seen.add(topicKey);
      orderedTopics.push(topic);
    });
  });
  return orderedTopics;
}

function buildQuestionTopicInferenceText(question) {
  const choiceTexts = normalizeQuestionChoiceEntries(question?.choices).map((choice) => choice?.text);
  return [
    question?.qbankCourse,
    question?.course,
    question?.stem,
    question?.system,
    question?.topic,
    question?.qbankTopic,
    question?.objective,
    question?.explanation,
    question?.references,
    ...choiceTexts,
    ...(Array.isArray(question?.tags) ? question.tags : []),
  ]
    .map((entry) => String(entry || "").trim().toLowerCase())
    .filter(Boolean)
    .join(" ");
}

function inferRecoveredTopicForQuestion(course, question) {
  const recoveryRules = COURSE_TOPIC_RECOVERY_RULES[getCourseTopicRecoveryProfileKey(course)] || [];
  if (!recoveryRules.length) {
    return "";
  }
  const text = buildQuestionTopicInferenceText(question);
  if (!text) {
    return "";
  }
  const matchedRule = recoveryRules.find((rule) => hasAny(text, rule.needles || []));
  return String(matchedRule?.topic || "").trim();
}

function repairQuestionTopicAssignmentsForCourse(course, questions) {
  const defaultTopicKeys = new Set(getDefaultTopicsForCourse(course).map((topic) => normalizeTopicKey(topic)));
  const recoverySeed = getCourseTopicRecoverySeed(course);
  if (!recoverySeed.length) {
    return false;
  }
  let changed = false;
  (Array.isArray(questions) ? questions : []).forEach((question) => {
    const meta = getQbankCourseTopicMeta(question);
    if (meta.course !== course) {
      return;
    }
    const currentTopic = String(question?.qbankTopic || question?.topic || "").trim();
    const currentTopicKey = normalizeTopicKey(currentTopic);
    const canonicalSeedTopic = findMatchingTopicNameInList(recoverySeed, currentTopic);
    if (canonicalSeedTopic) {
      if (question.qbankTopic !== canonicalSeedTopic || question.topic !== canonicalSeedTopic) {
        question.qbankTopic = canonicalSeedTopic;
        question.topic = canonicalSeedTopic;
        changed = true;
      }
      return;
    }
    if (currentTopicKey && !defaultTopicKeys.has(currentTopicKey)) {
      return;
    }
    const inferredTopic = inferRecoveredTopicForQuestion(course, question);
    if (!inferredTopic) {
      return;
    }
    if (question.qbankTopic !== inferredTopic || question.topic !== inferredTopic) {
      question.qbankTopic = inferredTopic;
      question.topic = inferredTopic;
      changed = true;
    }
  });
  return changed;
}

function repairCourseTopicCatalogFromQuestions(options = {}) {
  const questions = getQuestions();
  if (!questions.length) {
    return { questionsChanged: false, topicsChanged: false, repairedCourses: [] };
  }

  const persist = Boolean(options?.persist);
  const repairedCourses = new Set();
  let questionsChanged = false;
  let topicsChanged = false;

  CURRICULUM_COURSE_LIST.forEach((course) => {
    if (repairQuestionTopicAssignmentsForCourse(course, questions)) {
      questionsChanged = true;
      repairedCourses.add(course);
    }
  });

  if (questionsChanged) {
    if (persist) {
      save(STORAGE_KEYS.questions, questions);
    } else {
      saveLocalOnly(STORAGE_KEYS.questions, questions);
    }
  }

  CURRICULUM_COURSE_LIST.forEach((course) => {
    const defaultTopics = getDefaultTopicsForCourse(course);
    const defaultTopicKeys = new Set(defaultTopics.map((topic) => normalizeTopicKey(topic)));
    const currentTopics = normalizeCourseTopicList(COURSE_TOPIC_OVERRIDES[course] || [], course);
    const currentHasOnlyDefault = currentTopics.length === defaultTopics.length && currentTopics.every(
      (topic, index) => normalizeTopicKey(topic) === normalizeTopicKey(defaultTopics[index]),
    );
    const questionTopics = buildQuestionTopicCatalogForCourse(course, questions);
    const groupedTopics = buildGroupedTopicCatalogForCourse(course);
    const recoveredTopics = mergeUniqueCourseTopics(course, questionTopics, groupedTopics);
    const specificRecoveredTopics = recoveredTopics.filter((topic) => !defaultTopicKeys.has(normalizeTopicKey(topic)));
    const recoverySeed = getCourseTopicRecoverySeed(course);
    const shouldApplyRecoverySeed = recoverySeed.length && recoveredTopics.length && (
      !specificRecoveredTopics.length
      || currentHasOnlyDefault
    );
    const nextTopics = orderCourseTopicsWithRecoverySeed(
      course,
      mergeUniqueCourseTopics(
        course,
        currentHasOnlyDefault && (specificRecoveredTopics.length || shouldApplyRecoverySeed) ? [] : currentTopics,
        shouldApplyRecoverySeed ? specificRecoveredTopics : recoveredTopics,
        shouldApplyRecoverySeed ? recoverySeed : [],
      ),
    );
    if (JSON.stringify(nextTopics) === JSON.stringify(currentTopics)) {
      return;
    }
    COURSE_TOPIC_OVERRIDES[course] = nextTopics;
    topicsChanged = true;
    repairedCourses.add(course);
  });

  if (topicsChanged) {
    rebuildCurriculumCatalog();
    if (persist) {
      save(STORAGE_KEYS.courseTopics, COURSE_TOPIC_OVERRIDES);
    } else {
      saveLocalOnly(STORAGE_KEYS.courseTopics, COURSE_TOPIC_OVERRIDES);
    }
  }

  return {
    questionsChanged,
    topicsChanged,
    repairedCourses: [...repairedCourses],
  };
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeCurriculum(raw) {
  const normalized = {};
  for (let year = 1; year <= 5; year += 1) {
    normalized[year] = {};
    for (let semester = 1; semester <= 2; semester += 1) {
      const fallback = sanitizeCurriculumCourseList(DEFAULT_O6U_CURRICULUM[year]?.[semester] || []);
      const incoming = Array.isArray(raw?.[year]?.[semester]) ? raw[year][semester] : fallback;
      const deduped = sanitizeCurriculumCourseList(incoming);
      normalized[year][semester] = deduped.length ? deduped : [...fallback];
    }
  }
  return normalized;
}

function sanitizeCurriculumCourseList(courses) {
  return [
    ...new Set(
      (courses || [])
        .map((entry) => String(entry || "").trim())
        .filter((entry) => entry && !isRemovedCurriculumCourse(entry)),
    ),
  ];
}

function isRemovedCurriculumCourse(courseName) {
  return REMOVED_CURRICULUM_COURSE_KEYS.has(String(courseName || "").trim().toLowerCase());
}

function getDefaultTopicsForCourse(course) {
  if (String(course || "").includes("Skills") || String(course || "").includes("Elective")) {
    return ["Selected topic"];
  }
  return ["Clinical Applications"];
}

function normalizeCourseTopicList(topics, course) {
  const source = Array.isArray(topics) ? topics : [];
  const seen = new Set();
  const normalized = [];
  source.forEach((entry) => {
    const topic = String(entry || "").trim();
    if (!topic) return;
    if (isRemovedTopicName(topic)) return;
    const key = topic.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    normalized.push(topic);
  });
  return normalized.length ? normalized : getDefaultTopicsForCourse(course);
}

function isRemovedTopicName(topicName) {
  return REMOVED_TOPIC_KEYS.has(String(topicName || "").trim().toLowerCase());
}

function normalizeCourseTopicMap(rawMap) {
  const source = rawMap && typeof rawMap === "object" ? rawMap : {};
  const normalized = {};
  CURRICULUM_COURSE_LIST.forEach((course) => {
    normalized[course] = normalizeCourseTopicList(source[course], course);
  });
  return normalized;
}

function normalizeCourseTopicGroupEntries(rawGroups, course, topicsOverride = null) {
  const source = (() => {
    if (rawGroups && typeof rawGroups === "object" && !Array.isArray(rawGroups)) {
      return rawGroups;
    }
    if (Array.isArray(rawGroups)) {
      const legacyMap = {};
      rawGroups.forEach((entry) => {
        if (typeof entry === "string") {
          const groupName = String(entry || "").trim();
          if (groupName) {
            legacyMap[groupName] = [];
          }
          return;
        }
        if (entry && typeof entry === "object") {
          const groupName = String(entry.name || entry.group || "").trim();
          if (!groupName) {
            return;
          }
          const topics = Array.isArray(entry.topics)
            ? entry.topics
            : Array.isArray(entry.items)
              ? entry.items
              : [];
          legacyMap[groupName] = topics;
        }
      });
      return legacyMap;
    }
    return {};
  })();
  const availableTopics = normalizeCourseTopicList(
    topicsOverride || COURSE_TOPIC_OVERRIDES[course] || QBANK_COURSE_TOPICS[course] || [],
    course,
  );
  const availableByKey = new Map(
    availableTopics.map((topic) => [String(topic || "").trim().toLowerCase(), topic]),
  );
  const normalized = {};
  const seenGroupKeys = new Set();

  Object.entries(source).forEach(([rawGroupName, rawTopics]) => {
    const groupName = String(rawGroupName || "").trim();
    const groupKey = groupName.toLowerCase();
    if (!groupName || seenGroupKeys.has(groupKey)) {
      return;
    }
    const topics = Array.isArray(rawTopics) ? rawTopics : [];
    const seenTopicKeys = new Set();
    const normalizedTopics = [];
    topics.forEach((entry) => {
      const rawTopic = String(entry || "").trim();
      const topicKey = rawTopic.toLowerCase();
      if (!rawTopic || seenTopicKeys.has(topicKey)) {
        return;
      }
      const canonicalTopic = availableByKey.get(topicKey) || rawTopic;
      seenTopicKeys.add(topicKey);
      normalizedTopics.push(canonicalTopic);
    });
    normalized[groupName] = normalizedTopics;
    seenGroupKeys.add(groupKey);
  });

  return normalized;
}

function resolveMatchingCourseKeyInMap(course, sourceMap) {
  const requestedCourse = String(course || "").trim();
  if (!requestedCourse || !sourceMap || typeof sourceMap !== "object") {
    return "";
  }
  if (Object.prototype.hasOwnProperty.call(sourceMap, requestedCourse)) {
    return requestedCourse;
  }
  const requestedLower = requestedCourse.toLowerCase();
  const requestedLookupKey = normalizeCourseLookupKey(requestedCourse);
  const requestedCourseCode = extractCourseCodeKey(requestedCourse);
  return Object.keys(sourceMap || {}).find((configuredCourse) => {
    const configuredName = String(configuredCourse || "").trim();
    if (!configuredName) {
      return false;
    }
    if (configuredName.toLowerCase() === requestedLower) {
      return true;
    }
    if (requestedLookupKey && normalizeCourseLookupKey(configuredName) === requestedLookupKey) {
      return true;
    }
    if (requestedCourseCode && extractCourseCodeKey(configuredName) === requestedCourseCode) {
      return true;
    }
    return false;
  }) || "";
}

function normalizeCourseTopicGroupMap(rawMap) {
  const source = rawMap && typeof rawMap === "object" ? rawMap : {};
  const normalized = {};
  CURRICULUM_COURSE_LIST.forEach((course) => {
    const matchedCourseKey = resolveMatchingCourseKeyInMap(course, source);
    normalized[course] = normalizeCourseTopicGroupEntries(
      source[matchedCourseKey || course],
      course,
      COURSE_TOPIC_OVERRIDES[course] || [],
    );
  });
  return normalized;
}

function getCourseTopicGroups(course) {
  const normalizedCourse = String(course || "").trim();
  if (!normalizedCourse) {
    return {};
  }
  const matchedCourseKey = resolveMatchingCourseKeyInMap(normalizedCourse, COURSE_TOPIC_GROUPS);
  return normalizeCourseTopicGroupEntries(
    COURSE_TOPIC_GROUPS[matchedCourseKey || normalizedCourse],
    normalizedCourse,
    COURSE_TOPIC_OVERRIDES[normalizedCourse] || [],
  );
}

function createCourseTopicGroup(course, groupName) {
  if (!course || !CURRICULUM_COURSE_LIST.includes(course)) {
    return false;
  }
  const nextGroupName = String(groupName || "").trim();
  if (!nextGroupName) {
    return false;
  }
  const groups = getCourseTopicGroups(course);
  if (findMatchingCourseTopicGroupName(groups, nextGroupName)) {
    return false;
  }
  groups[nextGroupName] = [];
  return applyCourseTopicGroupsUpdate(course, groups);
}

function findMatchingCourseTopicGroupName(groups, requestedName) {
  const requested = String(requestedName || "").trim().toLowerCase();
  if (!requested) {
    return "";
  }
  return Object.keys(groups || {}).find((name) => String(name || "").trim().toLowerCase() === requested) || "";
}

function getTopicGroupNameForCourseTopic(course, topic) {
  const topicKey = String(topic || "").trim().toLowerCase();
  if (!topicKey) {
    return "";
  }
  const groups = getCourseTopicGroups(course);
  return Object.entries(groups).find(([, topics]) => (
    Array.isArray(topics) && topics.some((entry) => String(entry || "").trim().toLowerCase() === topicKey)
  ))?.[0] || "";
}

function applyCourseTopicGroupsUpdate(course, nextGroups) {
  if (!course || !CURRICULUM_COURSE_LIST.includes(course)) {
    return false;
  }
  const normalizedGroups = normalizeCourseTopicGroupEntries(nextGroups, course);
  const currentGroups = getCourseTopicGroups(course);
  if (JSON.stringify(normalizedGroups) === JSON.stringify(currentGroups)) {
    return false;
  }
  COURSE_TOPIC_GROUPS[course] = normalizedGroups;
  save(STORAGE_KEYS.courseTopicGroups, COURSE_TOPIC_GROUPS);
  return true;
}

function setCourseTopicParentGroup(course, topic, groupName) {
  const canonicalTopic = (QBANK_COURSE_TOPICS[course] || []).find(
    (entry) => String(entry || "").trim().toLowerCase() === String(topic || "").trim().toLowerCase(),
  );
  if (!course || !canonicalTopic) {
    return false;
  }
  const groups = getCourseTopicGroups(course);
  Object.keys(groups).forEach((name) => {
    groups[name] = (groups[name] || []).filter(
      (entry) => String(entry || "").trim().toLowerCase() !== String(canonicalTopic || "").trim().toLowerCase(),
    );
    if (!groups[name].length) {
      delete groups[name];
    }
  });

  const nextGroupNameRaw = String(groupName || "").trim();
  if (nextGroupNameRaw) {
    const existingGroupName = findMatchingCourseTopicGroupName(groups, nextGroupNameRaw) || nextGroupNameRaw;
    const existingTopics = Array.isArray(groups[existingGroupName]) ? groups[existingGroupName] : [];
    groups[existingGroupName] = [...existingTopics, canonicalTopic];
  }

  return applyCourseTopicGroupsUpdate(course, groups);
}

function renameCourseTopicGroup(course, currentName, nextName) {
  const groups = getCourseTopicGroups(course);
  const currentGroupName = findMatchingCourseTopicGroupName(groups, currentName);
  const nextGroupNameRaw = String(nextName || "").trim();
  if (!currentGroupName || !nextGroupNameRaw) {
    return false;
  }
  const matchingTargetName = findMatchingCourseTopicGroupName(groups, nextGroupNameRaw);
  const mergedTopics = [
    ...(matchingTargetName && matchingTargetName !== currentGroupName ? (groups[matchingTargetName] || []) : []),
    ...(groups[currentGroupName] || []),
  ];
  if (matchingTargetName && matchingTargetName !== currentGroupName) {
    delete groups[matchingTargetName];
  }
  delete groups[currentGroupName];
  groups[nextGroupNameRaw] = mergedTopics;
  return applyCourseTopicGroupsUpdate(course, groups);
}

function removeCourseTopicGroup(course, groupName) {
  const groups = getCourseTopicGroups(course);
  const currentGroupName = findMatchingCourseTopicGroupName(groups, groupName);
  if (!currentGroupName) {
    return false;
  }
  delete groups[currentGroupName];
  return applyCourseTopicGroupsUpdate(course, groups);
}

function syncCourseTopicGroupsForCourse(course, options = {}) {
  if (!course || !CURRICULUM_COURSE_LIST.includes(course)) {
    return false;
  }
  const groups = getCourseTopicGroups(course);
  const renamedFrom = String(options?.renamedFrom || "").trim();
  const renamedTo = String(options?.renamedTo || "").trim();
  if (renamedFrom && renamedTo) {
    Object.keys(groups).forEach((groupName) => {
      groups[groupName] = (groups[groupName] || []).map((topic) => (
        String(topic || "").trim().toLowerCase() === renamedFrom.toLowerCase() ? renamedTo : topic
      ));
    });
  }
  return applyCourseTopicGroupsUpdate(course, groups);
}

function mergeCourseTopicGroupEntries(baseGroups, incomingGroups, course) {
  const merged = normalizeCourseTopicGroupEntries(baseGroups, course);
  Object.entries(normalizeCourseTopicGroupEntries(incomingGroups, course)).forEach(([groupName, topics]) => {
    const targetName = findMatchingCourseTopicGroupName(merged, groupName) || groupName;
    merged[targetName] = [...(merged[targetName] || []), ...(Array.isArray(topics) ? topics : [])];
  });
  return normalizeCourseTopicGroupEntries(merged, course);
}

function getAvailableTopicSourceOptionsForCourse(course, questions = []) {
  const availableTopics = getAvailableTopicsForCourse(course, questions, { includeConfigured: true });
  if (!course || !availableTopics.length) {
    return [];
  }
  const topicMap = new Map(
    availableTopics.map((topic) => [String(topic || "").trim().toLowerCase(), topic]),
  );
  const groups = getCourseTopicGroups(course);
  return Object.entries(groups)
    .map(([groupName, rawTopics]) => {
      const groupedTopics = [];
      const seen = new Set();
      (Array.isArray(rawTopics) ? rawTopics : []).forEach((entry) => {
        const rawTopic = String(entry || "").trim();
        if (!rawTopic || isRemovedTopicName(rawTopic)) {
          return;
        }
        const canonicalTopic = topicMap.get(rawTopic.toLowerCase()) || rawTopic;
        if (!canonicalTopic) {
          return;
        }
        const canonicalKey = String(canonicalTopic || "").trim().toLowerCase();
        if (seen.has(canonicalKey)) {
          return;
        }
        seen.add(canonicalKey);
        groupedTopics.push(canonicalTopic);
      });
      if (!groupedTopics.length) {
        return null;
      }
      return {
        value: groupName,
        label: groupName,
        topics: groupedTopics,
      };
    })
    .filter(Boolean);
}

function getAvailableTopicSectionsForCourse(course, questions = [], options = {}) {
  const sourceOptions = getAvailableTopicSourceOptionsForCourse(course, questions);
  if (sourceOptions.length) {
    const requestedSource = String(options?.topicSource || "").trim().toLowerCase();
    const selectedSource = sourceOptions.find((option) => String(option?.value || "").trim().toLowerCase() === requestedSource);
    if (!selectedSource) {
      return [];
    }
    return [{
      kind: "group",
      name: selectedSource.label,
      topics: selectedSource.topics,
    }];
  }

  const topics = getAvailableTopicsForCourse(course, questions);
  if (!topics.length) {
    return [];
  }
  return [{
    kind: "flat",
    name: "",
    topics,
  }];
}

function formatTopicFilterSummary(topics) {
  const selectedTopics = Array.isArray(topics) ? topics.filter(Boolean) : [];
  if (!selectedTopics.length) {
    return "0 topics selected";
  }
  if (selectedTopics.length <= 2) {
    return selectedTopics.join(" + ");
  }
  return `${selectedTopics.length} topics selected`;
}

function rehydrateCourseCatalogConfigFromStorage() {
  const savedCurriculum = load(STORAGE_KEYS.curriculum, O6U_CURRICULUM);
  O6U_CURRICULUM = normalizeCurriculum(savedCurriculum || DEFAULT_O6U_CURRICULUM);
  const savedCourseTopics = load(STORAGE_KEYS.courseTopics, COURSE_TOPIC_OVERRIDES);
  COURSE_TOPIC_OVERRIDES = savedCourseTopics && typeof savedCourseTopics === "object" ? savedCourseTopics : {};
  const savedCourseTopicGroups = load(STORAGE_KEYS.courseTopicGroups, COURSE_TOPIC_GROUPS);
  COURSE_TOPIC_GROUPS = savedCourseTopicGroups && typeof savedCourseTopicGroups === "object" ? savedCourseTopicGroups : {};
  const savedCourseNotebookLinks = load(STORAGE_KEYS.courseNotebookLinks, COURSE_NOTEBOOK_LINKS);
  COURSE_NOTEBOOK_LINKS = savedCourseNotebookLinks && typeof savedCourseNotebookLinks === "object"
    ? savedCourseNotebookLinks
    : {};
  rebuildCurriculumCatalog();
}

function normalizeCourseNotebookLink(link) {
  const raw = String(link || "").trim();
  if (!raw) {
    return "";
  }
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "";
    }
    return parsed.toString();
  } catch {
    return "";
  }
}

function normalizeCourseNotebookLinkMap(rawMap) {
  const source = rawMap && typeof rawMap === "object" ? rawMap : {};
  const normalized = {};
  CURRICULUM_COURSE_LIST.forEach((course) => {
    const link = normalizeCourseNotebookLink(source[course]);
    if (link) {
      normalized[course] = link;
    }
  });
  return normalized;
}

function normalizeCourseLookupKey(courseName) {
  return String(courseName || "")
    .trim()
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function extractCourseCodeKey(courseName) {
  const match = String(courseName || "").match(/\(([A-Za-z]{2,10}\s*\d{2,4})\)/);
  if (!match || !match[1]) {
    return "";
  }
  return match[1].toLowerCase().replace(/\s+/g, "");
}

function getCourseTopicRecoveryProfileKey(courseName) {
  const courseCodeKey = extractCourseCodeKey(courseName);
  if (courseCodeKey && COURSE_TOPIC_RECOVERY_PROFILE_ALIASES[courseCodeKey]) {
    return COURSE_TOPIC_RECOVERY_PROFILE_ALIASES[courseCodeKey];
  }
  if (courseCodeKey && (COURSE_TOPIC_RECOVERY_SEEDS[courseCodeKey] || COURSE_TOPIC_RECOVERY_RULES[courseCodeKey])) {
    return courseCodeKey;
  }
  const lookupKey = normalizeCourseLookupKey(courseName);
  if (!lookupKey) {
    return "";
  }
  if (lookupKey.includes("endocrinology") || lookupKey.includes("endocrine")) {
    return "erp208";
  }
  if (
    lookupKey.includes("neurology")
    || lookupKey.includes("neurolog")
    || lookupKey.includes("nerology")
    || lookupKey.includes("nervous system")
  ) {
    return "ner206";
  }
  return "";
}

function getPreferredConfiguredCourseForRecoveryProfile(profileKey, fallbackCourse = "") {
  const normalizedProfileKey = String(profileKey || "").trim().toLowerCase();
  const normalizedFallbackCourse = String(fallbackCourse || "").trim();
  if (!normalizedProfileKey) {
    return normalizedFallbackCourse || CURRICULUM_COURSE_LIST[0] || "";
  }
  const matchingCourses = CURRICULUM_COURSE_LIST.filter(
    (course) => getCourseTopicRecoveryProfileKey(course) === normalizedProfileKey,
  );
  if (!matchingCourses.length) {
    return QBANK_COURSE_TOPICS[normalizedFallbackCourse]
      ? normalizedFallbackCourse
      : (normalizedFallbackCourse || CURRICULUM_COURSE_LIST[0] || "");
  }
  const aliasedCourses = matchingCourses.filter((course) => {
    const courseCodeKey = extractCourseCodeKey(course);
    return courseCodeKey && courseCodeKey !== normalizedProfileKey;
  });
  if (aliasedCourses.length) {
    return aliasedCourses[aliasedCourses.length - 1];
  }
  if (normalizedFallbackCourse && matchingCourses.includes(normalizedFallbackCourse)) {
    return normalizedFallbackCourse;
  }
  return matchingCourses[matchingCourses.length - 1] || normalizedFallbackCourse;
}

function normalizeTopicKey(topicName) {
  return String(topicName || "").trim().toLowerCase();
}

function findMatchingTopicNameInList(topicList, requestedTopic) {
  const requestedKey = normalizeTopicKey(requestedTopic);
  if (!requestedKey) {
    return "";
  }
  return (Array.isArray(topicList) ? topicList : []).find((topic) => normalizeTopicKey(topic) === requestedKey) || "";
}

function getCourseTopicRecoverySeed(courseName) {
  const recoveryProfileKey = getCourseTopicRecoveryProfileKey(courseName);
  const seededTopics = COURSE_TOPIC_RECOVERY_SEEDS[recoveryProfileKey];
  return Array.isArray(seededTopics) ? [...seededTopics] : [];
}

function mergeUniqueCourseTopics(course, ...lists) {
  const merged = [];
  const seen = new Set();
  lists.flat().forEach((entry) => {
    const topic = String(entry || "").trim();
    const topicKey = normalizeTopicKey(topic);
    if (!topic || !topicKey || isRemovedTopicName(topic) || seen.has(topicKey)) {
      return;
    }
    seen.add(topicKey);
    merged.push(topic);
  });
  return normalizeCourseTopicList(merged, course);
}

function orderCourseTopicsWithRecoverySeed(course, topics) {
  const normalizedTopics = normalizeCourseTopicList(topics, course);
  const seededTopics = getCourseTopicRecoverySeed(course);
  if (!seededTopics.length) {
    return normalizedTopics;
  }
  const remainingByKey = new Map(normalizedTopics.map((topic) => [normalizeTopicKey(topic), topic]));
  const ordered = [];
  seededTopics.forEach((topic) => {
    const topicKey = normalizeTopicKey(topic);
    if (!remainingByKey.has(topicKey)) {
      return;
    }
    ordered.push(remainingByKey.get(topicKey));
    remainingByKey.delete(topicKey);
  });
  normalizedTopics.forEach((topic) => {
    const topicKey = normalizeTopicKey(topic);
    if (!remainingByKey.has(topicKey)) {
      return;
    }
    ordered.push(remainingByKey.get(topicKey));
    remainingByKey.delete(topicKey);
  });
  return ordered.length ? ordered : getDefaultTopicsForCourse(course);
}

function getCourseNotebookLinkForCourse(courseName) {
  const course = String(courseName || "").trim();
  if (!course) {
    return "";
  }
  const direct = String(COURSE_NOTEBOOK_LINKS[course] || "").trim();
  if (direct) {
    return direct;
  }

  const requestedLower = course.toLowerCase();
  const requestedLookupKey = normalizeCourseLookupKey(course);
  const requestedCourseCode = extractCourseCodeKey(course);

  for (const [configuredCourse, configuredLinkRaw] of Object.entries(COURSE_NOTEBOOK_LINKS)) {
    const configuredLink = String(configuredLinkRaw || "").trim();
    if (!configuredLink) {
      continue;
    }
    const configuredName = String(configuredCourse || "").trim();
    if (!configuredName) {
      continue;
    }
    if (configuredName.toLowerCase() === requestedLower) {
      return configuredLink;
    }
    if (requestedLookupKey && normalizeCourseLookupKey(configuredName) === requestedLookupKey) {
      return configuredLink;
    }
    if (requestedCourseCode && extractCourseCodeKey(configuredName) === requestedCourseCode) {
      return configuredLink;
    }
  }

  return "";
}

function resolveAskAiNotebookUrlForQuestion(question) {
  const mappedCourse = getQbankCourseTopicMeta(question).course;
  const questionCourse = String(question?.qbankCourse || question?.course || "").trim();
  const preferredCourse = String(mappedCourse || questionCourse || "").trim();
  return normalizeCourseNotebookLink(
    getCourseNotebookLinkForCourse(preferredCourse)
    || getCourseNotebookLinkForCourse(questionCourse),
  );
}

function rebuildCurriculumCatalog() {
  CURRICULUM_COURSE_LIST = [
    ...new Set(
      Object.values(O6U_CURRICULUM)
        .flatMap((yearMap) => Object.values(yearMap))
        .flat(),
    ),
  ];
  COURSE_TOPIC_OVERRIDES = normalizeCourseTopicMap(COURSE_TOPIC_OVERRIDES);
  COURSE_TOPIC_GROUPS = normalizeCourseTopicGroupMap(COURSE_TOPIC_GROUPS);
  COURSE_NOTEBOOK_LINKS = normalizeCourseNotebookLinkMap(COURSE_NOTEBOOK_LINKS);
  QBANK_COURSE_TOPICS = Object.fromEntries(
    Object.entries(COURSE_TOPIC_OVERRIDES).map(([course, topics]) => [course, [...topics]]),
  );
}

function syncUsersWithCurriculum() {
  const users = getUsers();
  const allCourses = [...CURRICULUM_COURSE_LIST];
  let changed = false;

  users.forEach((user) => {
    const normalizedPhone = String(user.phone || "").trim();
    if (user.phone !== normalizedPhone) {
      user.phone = normalizedPhone;
      changed = true;
    }
    if (isForcedAdminEmail(user.email) && user.role !== "admin") {
      user.role = "admin";
      user.academicYear = null;
      user.academicSemester = null;
      user.assignedCourses = [...allCourses];
      changed = true;
    }
    const shouldApprove = user.role === "admin"
      ? true
      : typeof user.isApproved === "boolean"
        ? user.isApproved
        : true;
    if (user.isApproved !== shouldApprove) {
      user.isApproved = shouldApprove;
      changed = true;
    }
    if (user.isApproved) {
      const approvedAt = String(user.approvedAt || "").trim();
      if (!approvedAt) {
        user.approvedAt = nowISO();
        changed = true;
      }
    } else if (user.approvedAt || user.approvedBy) {
      user.approvedAt = null;
      user.approvedBy = null;
      changed = true;
    }

    if (user.role === "student") {
      const repairedEnrollment = normalizeStudentEnrollmentProfile(user);
      if (user.academicYear !== repairedEnrollment.academicYear) {
        user.academicYear = repairedEnrollment.academicYear;
        changed = true;
      }
      if (user.academicSemester !== repairedEnrollment.academicSemester) {
        user.academicSemester = repairedEnrollment.academicSemester;
        changed = true;
      }
      if ((user.assignedCourses || []).join("|") !== repairedEnrollment.assignedCourses.join("|")) {
        user.assignedCourses = repairedEnrollment.assignedCourses;
        changed = true;
      }
    } else {
      const normalized = sanitizeCourseAssignments(user.assignedCourses || allCourses);
      if ((user.assignedCourses || []).join("|") !== normalized.join("|")) {
        user.assignedCourses = normalized.length ? normalized : [...allCourses];
        changed = true;
      }
      if (user.academicYear !== null || user.academicSemester !== null) {
        user.academicYear = null;
        user.academicSemester = null;
        changed = true;
      }
    }

    const shouldMarkProfileCompleted = user.role === "student"
      ? hasCompleteStudentProfile(user)
      : true;
    if (user.profileCompleted !== shouldMarkProfileCompleted) {
      user.profileCompleted = shouldMarkProfileCompleted;
      changed = true;
    }
  });

  if (changed) {
    save(STORAGE_KEYS.users, users);
    const current = getCurrentUser();
    if (current?.role === "admin") {
      const syncedUsers = getUsers();
      syncUsersBackupState(syncedUsers).catch(() => { });
      ensureRelationalSyncReady()
        .then((ready) => {
          if (!ready) {
            return;
          }
          if (scheduleRelationalWrite(STORAGE_KEYS.users, syncedUsers)) {
            return flushPendingSyncNow({ throwOnRelationalFailure: false });
          }
          return undefined;
        })
        .catch((syncError) => {
          console.warn("Could not sync repaired student enrollment data.", syncError?.message || syncError);
        });
    }
  }
}

function applyCurriculumUpdate(nextCurriculum, options = {}) {
  const { renamedFrom = "", renamedTo = "", removedCourse = "", replacementCourse = "" } = options;

  if (renamedFrom && renamedTo && COURSE_TOPIC_OVERRIDES[renamedFrom]) {
    COURSE_TOPIC_OVERRIDES[renamedTo] = normalizeCourseTopicList(
      [...(COURSE_TOPIC_OVERRIDES[renamedTo] || []), ...COURSE_TOPIC_OVERRIDES[renamedFrom]],
      renamedTo,
    );
  }
  if (renamedFrom && renamedTo && COURSE_TOPIC_GROUPS[renamedFrom]) {
    COURSE_TOPIC_GROUPS[renamedTo] = mergeCourseTopicGroupEntries(
      COURSE_TOPIC_GROUPS[renamedTo],
      COURSE_TOPIC_GROUPS[renamedFrom],
      renamedTo,
    );
    delete COURSE_TOPIC_GROUPS[renamedFrom];
  }
  if (renamedFrom && renamedTo && COURSE_NOTEBOOK_LINKS[renamedFrom] && !COURSE_NOTEBOOK_LINKS[renamedTo]) {
    COURSE_NOTEBOOK_LINKS[renamedTo] = COURSE_NOTEBOOK_LINKS[renamedFrom];
  }
  if (removedCourse) {
    delete COURSE_TOPIC_GROUPS[removedCourse];
    delete COURSE_NOTEBOOK_LINKS[removedCourse];
  }

  O6U_CURRICULUM = normalizeCurriculum(nextCurriculum);
  rebuildCurriculumCatalog();
  save(STORAGE_KEYS.curriculum, O6U_CURRICULUM);
  save(STORAGE_KEYS.courseTopics, COURSE_TOPIC_OVERRIDES);
  save(STORAGE_KEYS.courseTopicGroups, COURSE_TOPIC_GROUPS);
  save(STORAGE_KEYS.courseNotebookLinks, COURSE_NOTEBOOK_LINKS);

  const questions = getQuestions();
  let questionsChanged = false;

  questions.forEach((question) => {
    let nextCourse = question.qbankCourse;
    if (renamedFrom && renamedTo && nextCourse === renamedFrom) {
      nextCourse = renamedTo;
    }
    if (removedCourse && replacementCourse && nextCourse === removedCourse) {
      nextCourse = replacementCourse;
    }
    if (nextCourse && !QBANK_COURSE_TOPICS[nextCourse]) {
      nextCourse = CURRICULUM_COURSE_LIST[0] || nextCourse;
    }

    if (nextCourse && question.qbankCourse !== nextCourse) {
      question.qbankCourse = nextCourse;
      question.course = nextCourse;
      questionsChanged = true;
    }

    if (question.qbankCourse) {
      const normalizedTopic = resolveDefaultTopic(question.qbankCourse, question.qbankTopic);
      if (question.qbankTopic !== normalizedTopic) {
        question.qbankTopic = normalizedTopic;
        question.topic = normalizedTopic;
        questionsChanged = true;
      }
    }
  });

  if (questionsChanged) {
    save(STORAGE_KEYS.questions, questions);
  }

  syncUsersWithCurriculum();
}

function applyCourseTopicsUpdate(course, nextTopics, options = {}) {
  if (!course || !CURRICULUM_COURSE_LIST.includes(course)) {
    return;
  }
  const renamedFrom = String(options?.renamedFrom || "").trim();
  const renamedTo = String(options?.renamedTo || "").trim();
  const allowQuestionTopicCollapse = Boolean(options?.allowQuestionTopicCollapse);
  const questions = getQuestions();
  const requestedTopics = normalizeCourseTopicList(nextTopics, course);
  const preservedQuestionTopics = allowQuestionTopicCollapse
    ? []
    : buildQuestionTopicCatalogForCourse(course, questions).map((topic) => {
      if (renamedFrom && renamedTo && normalizeTopicKey(topic) === normalizeTopicKey(renamedFrom)) {
        return renamedTo;
      }
      return topic;
    });
  const previousTopics = [...(QBANK_COURSE_TOPICS[course] || [])];
  COURSE_TOPIC_OVERRIDES[course] = allowQuestionTopicCollapse
    ? requestedTopics
    : mergeUniqueCourseTopics(course, requestedTopics, preservedQuestionTopics);
  rebuildCurriculumCatalog();
  save(STORAGE_KEYS.courseTopics, COURSE_TOPIC_OVERRIDES);
  syncTopicNewCatalogForCourse(course, previousTopics, COURSE_TOPIC_OVERRIDES[course], options);
  syncCourseTopicGroupsForCourse(course, options);

  let questionsChanged = false;
  questions.forEach((question) => {
    const mappedCourse = String(question.qbankCourse || question.course || "").trim();
    if (mappedCourse !== course) {
      return;
    }
    if (question.qbankCourse !== course || question.course !== course) {
      question.qbankCourse = course;
      question.course = course;
      questionsChanged = true;
    }
    let nextTopic = String(question.qbankTopic || question.topic || "").trim();
    if (renamedFrom && renamedTo && normalizeTopicKey(nextTopic) === normalizeTopicKey(renamedFrom)) {
      nextTopic = renamedTo;
    }
    const canonicalTopic = findMatchingTopicNameInList(COURSE_TOPIC_OVERRIDES[course] || [], nextTopic);
    const normalizedTopic = canonicalTopic
      || (
        allowQuestionTopicCollapse
          ? resolveDefaultTopic(course, nextTopic)
          : (nextTopic && !isRemovedTopicName(nextTopic) ? nextTopic : resolveDefaultTopic(course, nextTopic))
      );
    if (question.qbankTopic !== normalizedTopic || question.topic !== normalizedTopic) {
      question.qbankTopic = normalizedTopic;
      question.topic = normalizedTopic;
      questionsChanged = true;
    }
  });

  if (questionsChanged) {
    save(STORAGE_KEYS.questions, questions);
  }
}

function normalizeAcademicYearOrNull(value) {
  const year = Number(value);
  return [1, 2, 3, 4, 5].includes(year) ? year : null;
}

function normalizeAcademicSemesterOrNull(value) {
  const semester = Number(value);
  return semester === 1 || semester === 2 ? semester : null;
}

function sanitizeAcademicYear(value) {
  return normalizeAcademicYearOrNull(value) ?? 1;
}

function sanitizeAcademicSemester(value) {
  return normalizeAcademicSemesterOrNull(value) ?? 1;
}

function getCurriculumCourses(year, semester) {
  const normalizedYear = sanitizeAcademicYear(year);
  const normalizedSemester = sanitizeAcademicSemester(semester);
  const yearMap = O6U_CURRICULUM[normalizedYear] || {};
  const courses = yearMap[normalizedSemester] || [];
  return sanitizeCourseAssignments(courses);
}

function inferAcademicTermFromCourses(courses) {
  const scopedCourses = sanitizeCourseAssignments(courses || []);
  if (!scopedCourses.length) {
    return { year: null, semester: null };
  }
  const matches = [];
  for (let year = 1; year <= 5; year += 1) {
    for (let semester = 1; semester <= 2; semester += 1) {
      const termCourses = getCurriculumCourses(year, semester);
      if (!termCourses.length) {
        continue;
      }
      const overlap = scopedCourses.filter((course) => termCourses.includes(course)).length;
      if (overlap > 0) {
        matches.push({
          year,
          semester,
          overlap,
          termSize: termCourses.length,
        });
      }
    }
  }
  if (!matches.length) {
    return { year: null, semester: null };
  }
  matches.sort((a, b) => {
    if (b.overlap !== a.overlap) {
      return b.overlap - a.overlap;
    }
    if (a.termSize !== b.termSize) {
      return a.termSize - b.termSize;
    }
    if (a.year !== b.year) {
      return a.year - b.year;
    }
    return a.semester - b.semester;
  });
  const best = matches[0];
  const next = matches[1];
  if (next && next.overlap === best.overlap) {
    return { year: null, semester: null };
  }
  return { year: best.year, semester: best.semester };
}

function getFallbackEnrollmentTerm() {
  for (let year = 1; year <= 5; year += 1) {
    for (let semester = 1; semester <= 2; semester += 1) {
      if (getCurriculumCourses(year, semester).length) {
        return { year, semester };
      }
    }
  }
  return { year: 1, semester: 1 };
}

function normalizeStudentEnrollmentProfile(user) {
  const source = user && typeof user === "object" ? user : {};
  const normalizedAssigned = sanitizeCourseAssignments(source.assignedCourses || []);
  let year = normalizeAcademicYearOrNull(source.academicYear);
  let semester = normalizeAcademicSemesterOrNull(source.academicSemester);

  // Only infer missing enrollment pieces. Once a year/semester is explicitly set, keep it authoritative.
  if (year === null || semester === null) {
    const inferred = inferAcademicTermFromCourses(normalizedAssigned);
    if (year === null && semester === null) {
      year = inferred.year;
      semester = inferred.semester;
    } else if (year === null && semester !== null && inferred.semester === semester) {
      year = inferred.year;
    } else if (semester === null && year !== null && inferred.year === year) {
      semester = inferred.semester;
    }
  }

  if (year === null || semester === null) {
    return {
      academicYear: year,
      academicSemester: semester,
      assignedCourses: normalizedAssigned,
    };
  }

  const semesterCourses = getCurriculumCourses(year, semester);
  if (semesterCourses.length) {
    return {
      academicYear: year,
      academicSemester: semester,
      // Keep the full registered term as canonical so partial assigned-course arrays cannot hide courses.
      assignedCourses: [...semesterCourses],
    };
  }

  return {
    academicYear: year,
    academicSemester: semester,
    assignedCourses: normalizedAssigned.length ? normalizedAssigned : sanitizeCourseAssignments(CURRICULUM_COURSE_LIST),
  };
}

function sanitizeCourseAssignments(courses) {
  const allowed = Object.keys(QBANK_COURSE_TOPICS);
  return [...new Set((courses || []).map(String).filter((course) => allowed.includes(course)))];
}

function getAvailableCoursesForUser(user) {
  if (!user) {
    return [];
  }
  const all = Object.keys(QBANK_COURSE_TOPICS);
  if (user.role === "admin") {
    return all;
  }
  if (user.role === "student") {
    const year = normalizeAcademicYearOrNull(user.academicYear);
    const semester = normalizeAcademicSemesterOrNull(user.academicSemester);
    const byEnrollment = year !== null && semester !== null
      ? getCurriculumCourses(year, semester)
      : [];
    const assigned = sanitizeCourseAssignments(user.assignedCourses || []);
    if (byEnrollment.length) {
      if (!assigned.length) return byEnrollment;
      return [...new Set([...byEnrollment, ...assigned])];
    }
    if (assigned.length) return assigned;
    if (byEnrollment.length) return byEnrollment;
    return [];
  }
  const assigned = sanitizeCourseAssignments(user.assignedCourses || []);
  return assigned.length ? assigned : all;
}

function getPublishedQuestionsForUser(user) {
  const availableCourses = new Set(getAvailableCoursesForUser(user));
  const publishedQuestions = applyQbankFilters(
    getQuestions().filter((question) => (
      question.status === "published"
      && isQuestionUsableForTesting(question)
    )),
    { course: "", topics: [] },
  );
  // Fail safe: if enrollment metadata is temporarily missing, keep published questions visible.
  if (!availableCourses.size) {
    return publishedQuestions;
  }
  return publishedQuestions.filter((question) => availableCourses.has(question.qbankCourse));
}

function setSelectOptions(selectEl, options, includeAll = false) {
  if (!selectEl) {
    return;
  }
  const currentValue = selectEl.value;
  const optionHtml = [];
  if (includeAll) {
    optionHtml.push(`<option value="">All topics</option>`);
  }
  options.forEach((topic) => {
    optionHtml.push(`<option value="${escapeHtml(topic)}">${escapeHtml(topic)}</option>`);
  });
  selectEl.innerHTML = optionHtml.join("");
  if (options.includes(currentValue)) {
    selectEl.value = currentValue;
  } else if (includeAll) {
    selectEl.value = "";
  } else {
    selectEl.value = options[0] || "";
  }
}

const IMPORT_FIELD_ALIASES = {
  stem: ["stem", "question", "question stem", "question text", "prompt"],
  choiceA: ["choicea", "choice a", "optiona", "option a", "answera", "answer a", "a"],
  choiceB: ["choiceb", "choice b", "optionb", "option b", "answerb", "answer b", "b"],
  choiceC: ["choicec", "choice c", "optionc", "option c", "answerc", "answer c", "c"],
  choiceD: ["choiced", "choice d", "optiond", "option d", "answerd", "answer d", "d"],
  choiceE: ["choicee", "choice e", "optione", "option e", "answere", "answer e", "e"],
  correct: ["correct", "correctanswer", "correct answer", "answer", "key"],
  explanation: ["explanation", "rationale", "reason"],
  course: ["course", "subject", "module"],
  topic: ["topic", "chapter", "unit"],
  system: ["system"],
  difficulty: ["difficulty", "level"],
  tags: ["tags", "tag", "keywords", "keyword"],
  status: ["status", "visibility"],
  objective: ["objective", "learningobjective", "learning objective", "educationalobjective"],
  references: ["references", "reference", "source", "citation"],
  questionImage: ["questionimage", "question image", "questionimageurl", "question image url", "image", "imageurl", "image url", "figure"],
  explanationImage: ["explanationimage", "explanation image", "explanationimageurl", "explanation image url", "explanationfigure", "explanation figure"],
};

const IMPORT_FIELD_LOOKUP = Object.entries(IMPORT_FIELD_ALIASES).reduce((acc, [field, aliases]) => {
  aliases.forEach((alias) => {
    acc[normalizeImportFieldKey(alias)] = field;
  });
  return acc;
}, {});

function normalizeImportFieldKey(key) {
  return String(key || "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function normalizeImportRow(rawRow) {
  const normalized = {};
  if (!rawRow || typeof rawRow !== "object") {
    return normalized;
  }

  Object.entries(rawRow).forEach(([key, value]) => {
    const mappedField = IMPORT_FIELD_LOOKUP[normalizeImportFieldKey(key)];
    if (!mappedField || normalized[mappedField] != null) {
      return;
    }
    normalized[mappedField] = typeof value === "string" ? value.trim() : value;
  });

  if (Array.isArray(rawRow.choices)) {
    rawRow.choices.forEach((choice, index) => {
      const optionId = typeof choice === "object" ? String(choice?.id || "").toUpperCase() : "";
      const fallbackId = ["A", "B", "C", "D", "E"][index] || "";
      const targetId = ["A", "B", "C", "D", "E"].includes(optionId) ? optionId : fallbackId;
      const targetField = targetId ? `choice${targetId}` : "";
      if (!targetField || normalized[targetField]) {
        return;
      }
      const text = typeof choice === "string" ? choice : String(choice?.text || "");
      normalized[targetField] = text.trim();
    });
  }

  if (normalized.correct == null && Array.isArray(rawRow.correct)) {
    normalized.correct = rawRow.correct;
  }

  return normalized;
}

function normalizeImportCorrect(rawCorrect) {
  const value = rawCorrect == null || rawCorrect === "" ? "A" : rawCorrect;
  const tokens = Array.isArray(value) ? value : String(value).split(/[\s,|;/]+/);
  const toLetter = { 1: "A", 2: "B", 3: "C", 4: "D", 5: "E" };
  const normalized = new Set();

  tokens.forEach((token) => {
    const cleaned = String(token || "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
    if (!cleaned) {
      return;
    }
    if (/^[A-E]$/.test(cleaned)) {
      normalized.add(cleaned);
      return;
    }
    if (/^[1-5]$/.test(cleaned)) {
      normalized.add(toLetter[cleaned]);
    }
  });

  return [...normalized];
}

function normalizeImportDifficulty(rawDifficulty) {
  const difficulty = String(rawDifficulty || "Medium").trim().toLowerCase();
  if (difficulty === "easy") return "Easy";
  if (difficulty === "hard") return "Hard";
  return "Medium";
}

function importQuestionsFromRaw(raw, config) {
  const questions = getQuestions();
  const errors = [];
  let records = [];
  let topicCatalogChanged = false;
  const topicCatalogPreviousByCourse = new Map();
  let usedCsvImport = false;
  const forceDraft = Boolean(config?.importAsDraft);

  try {
    const trimmed = String(raw || "").trim();
    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      const parsed = JSON.parse(trimmed);
      records = Array.isArray(parsed) ? parsed : parsed.questions || parsed.data || [];
    } else {
      usedCsvImport = true;
      records = parseCsvRecords(trimmed);
    }
  } catch (error) {
    return { added: 0, total: 0, errors: [`Failed to parse import content: ${error.message}`] };
  }

  records = records.map((row) => normalizeImportRow(row)).filter((row) => Object.keys(row).length);
  if (!records.length && usedCsvImport) {
    records = parseTopicBlockImportRecords(raw)
      .map((row) => normalizeImportRow(row))
      .filter((row) => Object.keys(row).length);
  }
  const total = records.length;
  if (!total) {
    return {
      added: 0,
      total: 0,
      errors: ["No import rows found. Make sure your file has a header row, or use topic/question block format."],
    };
  }

  let added = 0;
  records.forEach((row, index) => {
    const course = sanitizeCourseAssignments([row.course || config.defaultCourse])[0] || config.defaultCourse;
    const importedTopic = String(row.topic || "").trim();
    const topicExists = (QBANK_COURSE_TOPICS[course] || []).some(
      (topic) => String(topic || "").trim().toLowerCase() === importedTopic.toLowerCase(),
    );
    if (course && importedTopic && !topicExists) {
      if (!topicCatalogPreviousByCourse.has(course)) {
        topicCatalogPreviousByCourse.set(course, [...(QBANK_COURSE_TOPICS[course] || [])]);
      }
      COURSE_TOPIC_OVERRIDES[course] = normalizeCourseTopicList(
        [...(QBANK_COURSE_TOPICS[course] || []), importedTopic],
        course,
      );
      QBANK_COURSE_TOPICS[course] = [...COURSE_TOPIC_OVERRIDES[course]];
      topicCatalogChanged = true;
    }
    const topic = resolveDefaultTopic(course, importedTopic || config.defaultTopic);
    const stem = String(row.stem || "").trim() || `Imported question ${index + 1}`;
    const explanation = String(row.explanation || "").trim();
    const importedChoices = normalizeQuestionChoiceEntries([
      { id: "A", text: String(row.choiceA || "").trim() },
      { id: "B", text: String(row.choiceB || "").trim() },
      { id: "C", text: String(row.choiceC || "").trim() },
      { id: "D", text: String(row.choiceD || "").trim() },
      { id: "E", text: String(row.choiceE || "").trim() },
    ]);
    if (importedChoices.length < 2) {
      errors.push(`Row ${index + 1}: at least 2 non-empty choices are required (A-E).`);
      return;
    }
    let correct = normalizeImportCorrect(row.correct);
    if (!correct.length) {
      correct = [importedChoices[0].id];
    }
    const availableChoiceIds = new Set(importedChoices.map((choice) => choice.id));
    const validCorrect = correct.filter((choiceId) => availableChoiceIds.has(choiceId));
    if (!validCorrect.length) {
      validCorrect.push(importedChoices[0].id);
    }

    questions.push({
      id: makeId("q"),
      qbankCourse: course,
      qbankTopic: topic,
      course,
      topic,
      system: String(row.system || course).trim(),
      difficulty: normalizeImportDifficulty(row.difficulty),
      tags: (Array.isArray(row.tags) ? row.tags : String(row.tags || "").split(/[|,]/))
        .map((item) => String(item || "").trim())
        .filter(Boolean),
      author: config.author,
      dateAdded: new Date().toISOString().slice(0, 10),
      stem,
      choices: importedChoices,
      correct: validCorrect,
      explanation: explanation || "No explanation provided.",
      objective: String(row.objective || "").trim(),
      references: String(row.references || "").trim(),
      questionImage: String(row.questionImage || "").trim(),
      explanationImage: String(row.explanationImage || "").trim(),
      status: forceDraft
        ? "draft"
        : (["draft", "published"].includes(String(row.status || "published").toLowerCase())
          ? String(row.status || "published").toLowerCase()
          : "published"),
    });
    added += 1;
  });

  if (added) {
    save(STORAGE_KEYS.questions, questions);
  }
  if (topicCatalogChanged) {
    save(STORAGE_KEYS.courseTopics, COURSE_TOPIC_OVERRIDES);
    topicCatalogPreviousByCourse.forEach((previousTopics, course) => {
      syncTopicNewCatalogForCourse(course, previousTopics, COURSE_TOPIC_OVERRIDES[course] || []);
    });
  }
  return { added, total, errors };
}

function parseCsvRecords(csvText) {
  const rows = parseCsvRows(csvText);
  const nonEmptyRows = rows.filter((entry) => entry.some((cell) => String(cell || "").trim()));
  if (nonEmptyRows.length < 2) {
    return [];
  }

  const headers = nonEmptyRows[0].map((header) => String(header || "").replace(/^\uFEFF/, "").trim());
  const records = [];
  for (let index = 1; index < nonEmptyRows.length; index += 1) {
    const values = nonEmptyRows[index];
    const rowData = {};
    headers.forEach((header, idx) => {
      if (!header) {
        return;
      }
      rowData[header] = values[idx] != null ? String(values[idx]).trim() : "";
    });
    records.push(rowData);
  }
  return records;
}

function parseCsvRows(csvText) {
  const text = String(csvText || "").replace(/^\uFEFF/, "");
  if (!text.trim()) {
    return [];
  }

  const rows = [];
  let row = [];
  let currentCell = "";
  let inQuotes = false;

  for (let idx = 0; idx < text.length; idx += 1) {
    const char = text[idx];
    const next = text[idx + 1];

    if (char === '"' && inQuotes && next === '"') {
      currentCell += '"';
      idx += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(currentCell);
      currentCell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      row.push(currentCell);
      currentCell = "";
      rows.push(row);
      row = [];

      if (char === "\r" && next === "\n") {
        idx += 1;
      }
      continue;
    }

    currentCell += char;
  }

  row.push(currentCell);
  rows.push(row);

  return rows;
}

function stripQuestionPrefix(line) {
  return String(line || "")
    .replace(/^["'\s]*/, "")
    .replace(/^\d+\s*[\.\)-:]\s*/, "")
    .trim();
}

function parseChoiceLine(line) {
  const match = String(line || "").match(/^["'\s]*([A-Ea-e])\s*[\)\.\-:]\s*(.+)?$/);
  if (!match) {
    return null;
  }
  return {
    id: match[1].toUpperCase(),
    text: String(match[2] || "").trim(),
  };
}

function isQuestionLine(line) {
  return /^["'\s]*\d+\s*[\.\)-:]\s+/.test(String(line || ""));
}

function isSourceLine(line) {
  return /^source\s*:/i.test(String(line || ""));
}

function extractSourceText(line) {
  return String(line || "").replace(/^source\s*:/i, "").trim();
}

function normalizeLineForBlockImport(line) {
  return String(line || "")
    .replace(/^\uFEFF/, "")
    .replace(/^["']|["']$/g, "")
    .trim();
}

function isLikelyTopicHeading(line) {
  const text = normalizeLineForBlockImport(line);
  if (!text) return false;
  if (isQuestionLine(text) || parseChoiceLine(text) || isSourceLine(text)) return false;
  if (/^welcome to your senior year$/i.test(text)) return false;
  if (text.length > 90) return false;
  if (/\?/.test(text)) return false;
  if (/\d/.test(text)) return false;
  return text.split(/\s+/).length <= 8;
}

function parseTopicBlockImportRecords(csvText) {
  const rows = parseCsvRows(csvText);
  const lines = rows
    .map((row) => normalizeLineForBlockImport(Array.isArray(row) ? row[0] : row))
    .filter(Boolean);
  if (!lines.length) {
    return [];
  }

  const records = [];
  let currentTopic = "";
  let currentQuestion = null;
  let currentChoiceId = "";

  const flushCurrentQuestion = () => {
    if (!currentQuestion) {
      return;
    }
    const choicesById = currentQuestion.choicesById || {};
    records.push({
      stem: currentQuestion.stem || "",
      choiceA: choicesById.A || "",
      choiceB: choicesById.B || "",
      choiceC: choicesById.C || "",
      choiceD: choicesById.D || "",
      choiceE: choicesById.E || "",
      topic: currentQuestion.topic || "",
      references: currentQuestion.references || "",
      system: currentQuestion.source || "",
    });
    currentQuestion = null;
    currentChoiceId = "";
  };

  lines.forEach((rawLine) => {
    const line = normalizeLineForBlockImport(rawLine);
    if (!line || /^welcome to your senior year$/i.test(line)) {
      return;
    }

    if (isQuestionLine(line)) {
      flushCurrentQuestion();
      currentQuestion = {
        stem: stripQuestionPrefix(line),
        topic: currentTopic || "",
        source: "",
        references: "",
        choicesById: {},
      };
      currentChoiceId = "";
      return;
    }

    if (isSourceLine(line)) {
      if (currentQuestion) {
        const sourceText = extractSourceText(line);
        currentQuestion.source = sourceText;
        currentQuestion.references = sourceText;
      }
      return;
    }

    const parsedChoice = parseChoiceLine(line);
    if (parsedChoice && currentQuestion) {
      currentQuestion.choicesById[parsedChoice.id] = parsedChoice.text;
      currentChoiceId = parsedChoice.id;
      return;
    }

    if (!currentQuestion && isLikelyTopicHeading(line)) {
      currentTopic = line;
      return;
    }

    if (!currentQuestion) {
      return;
    }

    if (currentChoiceId) {
      const previous = String(currentQuestion.choicesById[currentChoiceId] || "").trim();
      currentQuestion.choicesById[currentChoiceId] = `${previous} ${line}`.trim();
    } else {
      currentQuestion.stem = `${String(currentQuestion.stem || "").trim()} ${line}`.trim();
    }
  });

  flushCurrentQuestion();
  return records.filter((record) => String(record.stem || "").trim());
}

function applySourceFilter(questions, source, userId) {
  if (source === "all") {
    return questions;
  }

  const sessions = getAcademicTermScopedSessionsForUser(userId).filter((session) => session.status === "completed");
  const attempted = new Set();
  const incorrect = new Set();
  const flagged = new Set();

  sessions.forEach((session) => {
    session.questionIds.forEach((qid) => {
      attempted.add(qid);
      const response = session.responses[qid];
      const question = getQuestions().find((entry) => entry.id === qid);
      if (!question || !response) return;

      const isCorrect = isSubmittedResponseCorrect(question, response);
      if (!isCorrect) {
        incorrect.add(qid);
      }

      if (response.flagged) {
        flagged.add(qid);
      }
    });
  });

  if (source === "unused") {
    return questions.filter((question) => !attempted.has(question.id));
  }

  if (source === "incorrect") {
    return questions.filter((question) => incorrect.has(question.id));
  }

  if (source === "flagged") {
    return questions.filter((question) => flagged.has(question.id));
  }

  return questions;
}

function getPresetsForUser(userId) {
  return load(STORAGE_KEYS.filterPresets, []).filter((preset) => preset.userId === userId);
}

function getMissRateByQuestion(userId) {
  if (!userId) {
    return {};
  }

  const sessions = getAcademicTermScopedSessionsForUser(userId).filter((session) => session.status === "completed");
  const map = {};

  sessions.forEach((session) => {
    session.questionIds.forEach((qid) => {
      const response = session.responses[qid];
      const question = getQuestions().find((entry) => entry.id === qid);
      if (!question || !response) return;

      const correct = isSubmittedResponseCorrect(question, response);
      if (!map[qid]) {
        map[qid] = { miss: 0, total: 0 };
      }
      map[qid].total += 1;
      if (!correct) {
        map[qid].miss += 1;
      }
    });
  });

  const rates = {};
  Object.keys(map).forEach((qid) => {
    rates[qid] = map[qid].total ? map[qid].miss / map[qid].total : 0;
  });
  return rates;
}

function getQuestionOptionStats(questionId) {
  const question = getQuestions().find((entry) => entry.id === questionId);
  if (!question) {
    return {};
  }

  const counts = {};
  question.choices.forEach((choice) => {
    counts[choice.id] = 0;
  });

  let totalSubmissions = 0;
  const sessions = getSessions().filter((session) => session.status === "completed" || session.status === "in_progress");
  sessions.forEach((session) => {
    const response = session.responses?.[questionId];
    if (!response || !Array.isArray(response.selected) || response.selected.length === 0) {
      return;
    }
    if (!response.submitted) {
      return;
    }
    totalSubmissions += 1;
    response.selected.forEach((choiceId) => {
      if (counts[choiceId] != null) {
        counts[choiceId] += 1;
      }
    });
  });

  const percentages = {};
  question.choices.forEach((choice) => {
    percentages[choice.id] = totalSubmissions ? Math.round((counts[choice.id] / totalSubmissions) * 100) : 0;
  });

  return percentages;
}

function matchesCourseFilterForAnalytics(question, courseFilter = "") {
  if (!courseFilter) {
    return true;
  }
  const meta = getQbankCourseTopicMeta(question);
  return meta.course === courseFilter;
}

function getAnalyticsQuestionMetaById() {
  if (analyticsRuntime.questionMetaById.size) {
    return analyticsRuntime.questionMetaById;
  }

  const map = new Map();
  getQuestions().forEach((question) => {
    const meta = getQbankCourseTopicMeta(question);
    const topic = String(meta.topic || question.topic || "Uncategorized").trim() || "Uncategorized";
    map.set(question.id, {
      question,
      course: String(meta.course || "").trim(),
      topic,
    });
  });
  analyticsRuntime.questionMetaById = map;
  return analyticsRuntime.questionMetaById;
}

function findUserForAnalytics(userId) {
  const normalizedUserId = String(userId || "").trim();
  if (!normalizedUserId) {
    return null;
  }
  return getUsers().find((entry) => (
    String(entry?.id || "").trim() === normalizedUserId
    || String(entry?.supabaseAuthId || "").trim() === normalizedUserId
  )) || null;
}

function getSessionCourseList(session, questionMetaById = null) {
  if (!session || typeof session !== "object") {
    return [];
  }

  const courses = [];
  const seenCourses = new Set();
  const storedCourses = Array.isArray(session.courses) ? session.courses : [];
  storedCourses.forEach((course) => {
    const normalizedCourse = String(course || "").trim();
    if (!normalizedCourse || seenCourses.has(normalizedCourse)) {
      return;
    }
    seenCourses.add(normalizedCourse);
    courses.push(normalizedCourse);
  });
  if (courses.length) {
    return courses;
  }

  const map = questionMetaById instanceof Map ? questionMetaById : getAnalyticsQuestionMetaById();
  (Array.isArray(session.questionIds) ? session.questionIds : []).forEach((qid) => {
    if (qid == null || qid === "") {
      return;
    }
    const questionMeta = map.get(qid) || map.get(String(qid || "").trim());
    const mappedCourse = String(questionMeta?.course || "").trim();
    if (!mappedCourse || seenCourses.has(mappedCourse)) {
      return;
    }
    seenCourses.add(mappedCourse);
    courses.push(mappedCourse);
  });
  return courses;
}

function getSessionAcademicTerm(session, questionMetaById = null) {
  const explicitYear = normalizeAcademicYearOrNull(session?.academicYear);
  const explicitSemester = normalizeAcademicSemesterOrNull(session?.academicSemester);
  if (explicitYear !== null && explicitSemester !== null) {
    return { year: explicitYear, semester: explicitSemester };
  }

  const inferred = inferAcademicTermFromCourses(getSessionCourseList(session, questionMetaById));
  return {
    year: explicitYear ?? inferred.year,
    semester: explicitSemester ?? inferred.semester,
  };
}

function isSessionWithinUserAcademicTerm(session, user, questionMetaById = null) {
  if (!session || !user || user.role !== "student") {
    return true;
  }

  const targetYear = normalizeAcademicYearOrNull(user.academicYear);
  const targetSemester = normalizeAcademicSemesterOrNull(user.academicSemester);
  if (targetYear === null || targetSemester === null) {
    return true;
  }

  const sessionTerm = getSessionAcademicTerm(session, questionMetaById);
  if (sessionTerm.year === null || sessionTerm.semester === null) {
    return false;
  }
  return sessionTerm.year === targetYear && sessionTerm.semester === targetSemester;
}

function getAnalyticsEnrollmentCacheToken(user) {
  if (!user || user.role !== "student") {
    return "__all_terms__";
  }
  const year = normalizeAcademicYearOrNull(user.academicYear);
  const semester = normalizeAcademicSemesterOrNull(user.academicSemester);
  return `${year ?? "na"}-${semester ?? "na"}`;
}

function summarizeSessionRollups(rollups = []) {
  const summary = (Array.isArray(rollups) ? rollups : []).reduce((acc, entry) => {
    acc.total += Number(entry?.total || 0);
    acc.correct += Number(entry?.correct || 0);
    acc.totalTime += Number(entry?.totalTime || 0);
    return acc;
  }, { total: 0, correct: 0, totalTime: 0 });

  return {
    answered: summary.total,
    correct: summary.correct,
    accuracy: summary.total ? Math.round((summary.correct / summary.total) * 100) : 0,
    timePerQuestion: summary.total ? Math.round(summary.totalTime / summary.total) : 0,
  };
}

function buildStudentAnalyticsInsights(snapshot, courseFilter = "") {
  const stats = snapshot?.stats || { accuracy: 0, timePerQuestion: 0, totalAnswered: 0 };
  const topicStats = Array.isArray(snapshot?.topicStats) ? snapshot.topicStats : [];
  const weakAreas = Array.isArray(snapshot?.weakAreas) ? snapshot.weakAreas : [];
  const sessionRollups = Array.isArray(snapshot?.sessionRollups) ? snapshot.sessionRollups : [];
  const flaggedCount = Number(snapshot?.flaggedCount || 0);

  if (!stats.totalAnswered) {
    const label = courseFilter ? ` for ${courseFilter}` : "";
    return {
      summary: `No completed-question data${label} yet.`,
      focusMessage: "Complete one full block to unlock weak-topic detection.",
      trendMessage: "Trend appears after at least one completed block.",
      paceMessage: "Pace guidance appears after your first completed block.",
      nextSource: "unused",
      nextReason: "Start with unused questions to establish a baseline.",
      nextTargetText: courseFilter ? `Mixed topics in ${courseFilter}` : "Mixed topics",
      suggestedCount: 15,
      focusTopic: "",
      nextBlockRecommendation: "Create an unused-only block (15 questions).",
    };
  }

  const recent = sessionRollups.slice(-ANALYTICS_RECENT_SESSION_WINDOW);
  const previous = sessionRollups.slice(-ANALYTICS_RECENT_SESSION_WINDOW * 2, -ANALYTICS_RECENT_SESSION_WINDOW);
  const recentSummary = summarizeSessionRollups(recent);
  const previousSummary = summarizeSessionRollups(previous);

  let trendMessage = `Recent accuracy: ${recentSummary.accuracy}% across ${recentSummary.answered} questions.`;
  if (recentSummary.answered && previousSummary.answered) {
    const delta = recentSummary.accuracy - previousSummary.accuracy;
    if (delta >= 3) {
      trendMessage = `Improving trend: +${delta}% versus your previous ${ANALYTICS_RECENT_SESSION_WINDOW} blocks.`;
    } else if (delta <= -3) {
      trendMessage = `Downward trend: ${delta}% versus your previous ${ANALYTICS_RECENT_SESSION_WINDOW} blocks.`;
    } else {
      trendMessage = `Stable trend: ${recentSummary.accuracy}% (about the same as recent history).`;
    }
  }

  let paceMessage = `Average pace is ${stats.timePerQuestion}s per question.`;
  if (recentSummary.answered && previousSummary.answered) {
    const paceDelta = recentSummary.timePerQuestion - previousSummary.timePerQuestion;
    if (paceDelta >= 8) {
      paceMessage = `Pace slowed by ${paceDelta}s/question recently. Try a shorter, focused block to rebuild speed.`;
    } else if (paceDelta <= -8) {
      paceMessage = `Pace improved by ${Math.abs(paceDelta)}s/question recently. Keep this rhythm.`;
    }
  } else if (stats.timePerQuestion >= 90) {
    paceMessage = "You are spending over 90s/question; consider shorter timed blocks to improve speed.";
  } else if (stats.timePerQuestion > 0 && stats.timePerQuestion <= 45) {
    paceMessage = "Good pacing speed. Focus now on reducing repeat mistakes.";
  }

  const focusEntry = weakAreas.find((entry) => entry.total >= 3) || weakAreas[0] || null;
  const strongestEntry = [...topicStats]
    .filter((entry) => entry.total >= 3)
    .sort((a, b) => b.accuracy - a.accuracy || b.total - a.total)[0] || null;

  let nextSource = "all";
  let nextReason = "Build a mixed block to maintain broad coverage.";
  if (focusEntry && focusEntry.accuracy <= 65 && focusEntry.total >= 4) {
    nextSource = "incorrect";
    nextReason = `Your weakest area is ${focusEntry.topic}. Retrying wrong questions will fix that fastest.`;
  } else if (flaggedCount >= 5) {
    nextSource = "flagged";
    nextReason = "You have many flagged questions; revisit them to clear uncertainty.";
  } else if (stats.totalAnswered < 40) {
    nextSource = "unused";
    nextReason = "You still need more baseline exposure. Prioritize fresh questions.";
  } else if (stats.accuracy >= 85) {
    nextSource = "unused";
    nextReason = "Strong accuracy detected. Add new questions to avoid overfitting repeated items.";
  }

  const suggestedCount = Math.max(10, Math.min(35, focusEntry ? Math.round(focusEntry.total * 1.2) : 20));
  const summary = focusEntry
    ? `Focus on ${focusEntry.topic}: ${focusEntry.accuracy}% accuracy with ${focusEntry.timePerQuestion || 0}s/question.`
    : `Current accuracy is ${stats.accuracy}% with average pace ${stats.timePerQuestion}s/question.`;
  const focusMessage = focusEntry
    ? `Primary weak topic: ${focusEntry.topic} (${focusEntry.accuracy}% across ${focusEntry.total} questions).`
    : "No dominant weak topic yet. Keep practicing mixed blocks.";
  const nextTargetText = focusEntry
    ? strongestEntry
      ? `${focusEntry.topic} first, then reinforce ${strongestEntry.topic}.`
      : focusEntry.topic
    : (courseFilter ? `Mixed topics in ${courseFilter}` : "Mixed topics");

  return {
    summary,
    focusMessage,
    trendMessage,
    paceMessage,
    nextSource,
    nextReason,
    nextTargetText,
    suggestedCount,
    focusTopic: focusEntry?.topic || "",
    nextBlockRecommendation: `Create a ${getCreateTestSourceLabel(nextSource).toLowerCase()} block (${suggestedCount} questions).`,
  };
}

function buildStudentAnalyticsSnapshot(userId, courseFilter = "", userOverride = null) {
  const normalizedFilter = String(courseFilter || "").trim();
  const targetUser = userOverride || findUserForAnalytics(userId);
  const questionMetaById = getAnalyticsQuestionMetaById();
  const sessions = getSessionsForUser(userId)
    .filter((session) => session.status === "completed")
    .filter((session) => isSessionWithinUserAcademicTerm(session, targetUser, questionMetaById))
    .slice()
    .sort((a, b) => new Date(a.completedAt || a.createdAt) - new Date(b.completedAt || b.createdAt));
  const byTopic = new Map();

  let totalAnswered = 0;
  let totalCorrect = 0;
  let totalTime = 0;
  let streak = 0;
  let flaggedCount = 0;
  const sessionRollups = [];

  sessions.forEach((session) => {
    let sessionEligibleCount = 0;
    let sessionCorrectCount = 0;
    let sessionTotalTime = 0;

    (Array.isArray(session.questionIds) ? session.questionIds : []).forEach((qid) => {
      const response = session.responses?.[qid];
      const questionMeta = questionMetaById.get(qid);
      if (!questionMeta || !response) {
        return;
      }
      if (normalizedFilter && questionMeta.course !== normalizedFilter) {
        return;
      }

      const isCorrect = isSubmittedResponseCorrect(questionMeta.question, response);
      const timeSpent = Math.max(0, Number(response.timeSpentSec || 0));
      const topic = questionMeta.topic;

      sessionEligibleCount += 1;
      totalAnswered += 1;
      totalTime += timeSpent;
      sessionTotalTime += timeSpent;
      if (response.flagged) {
        flaggedCount += 1;
      }

      if (!byTopic.has(topic)) {
        byTopic.set(topic, {
          topic,
          total: 0,
          correct: 0,
          totalTime: 0,
        });
      }
      const bucket = byTopic.get(topic);
      bucket.total += 1;
      bucket.totalTime += timeSpent;

      if (isCorrect) {
        sessionCorrectCount += 1;
        totalCorrect += 1;
        bucket.correct += 1;
      }
    });

    if (!sessionEligibleCount) {
      return;
    }
    if (sessionCorrectCount === sessionEligibleCount) {
      streak += 1;
    } else {
      streak = 0;
    }

    sessionRollups.push({
      id: session.id,
      total: sessionEligibleCount,
      correct: sessionCorrectCount,
      totalTime: sessionTotalTime,
      accuracy: Math.round((sessionCorrectCount / sessionEligibleCount) * 100),
      completedAt: session.completedAt || session.createdAt || nowISO(),
    });
  });

  const stats = {
    accuracy: totalAnswered ? Math.round((totalCorrect / totalAnswered) * 100) : 0,
    timePerQuestion: totalAnswered ? Math.round(totalTime / totalAnswered) : 0,
    streak,
    totalAnswered,
  };
  const topicStats = [...byTopic.values()]
    .map((entry) => ({
      topic: entry.topic,
      total: entry.total,
      correct: entry.correct,
      accuracy: entry.total ? Math.round((entry.correct / entry.total) * 100) : 0,
      timePerQuestion: entry.total ? Math.round(entry.totalTime / entry.total) : 0,
    }))
    .sort((a, b) => a.accuracy - b.accuracy || b.total - a.total || a.topic.localeCompare(b.topic));
  const weakAreas = topicStats.filter((entry) => entry.total >= 1);

  const snapshot = {
    stats,
    topicStats,
    weakAreas,
    sessionRollups,
    flaggedCount,
    insights: null,
  };
  snapshot.insights = buildStudentAnalyticsInsights(snapshot, normalizedFilter);
  return snapshot;
}

function getStudentAnalyticsSnapshot(userId, courseFilter = "") {
  if (!userId) {
    return buildStudentAnalyticsSnapshot("", courseFilter);
  }
  const normalizedFilter = String(courseFilter || "").trim();
  const targetUser = findUserForAnalytics(userId);
  const enrollmentToken = getAnalyticsEnrollmentCacheToken(targetUser);
  const key = `${userId}::${normalizedFilter || "__all__"}::${enrollmentToken}`;
  if (analyticsRuntime.cache.has(key)) {
    return analyticsRuntime.cache.get(key);
  }
  const snapshot = buildStudentAnalyticsSnapshot(userId, normalizedFilter, targetUser);
  analyticsRuntime.cache.set(key, snapshot);
  return snapshot;
}

function getUserStats(userId, courseFilter = "") {
  return getStudentAnalyticsSnapshot(userId, courseFilter).stats;
}

function getTopicStats(userId, courseFilter = "") {
  return getStudentAnalyticsSnapshot(userId, courseFilter).topicStats;
}

function getWeakAreas(userId, courseFilter = "") {
  return getStudentAnalyticsSnapshot(userId, courseFilter).weakAreas;
}

function normalizeSessionFontScalePercent(value, fallback = SESSION_FONT_SCALE_DEFAULT) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  const roundedToStep = Math.round(numeric / SESSION_FONT_SCALE_STEP) * SESSION_FONT_SCALE_STEP;
  return Math.min(SESSION_FONT_SCALE_MAX, Math.max(SESSION_FONT_SCALE_MIN, roundedToStep));
}

function getSessionFontScalePercentFromLegacyScale(scale) {
  if (scale === "compact") {
    return 90;
  }
  if (scale === "large") {
    return 112;
  }
  return SESSION_FONT_SCALE_DEFAULT;
}

function getSessionFontScaleBucket(percent) {
  if (percent <= 92) {
    return "compact";
  }
  if (percent >= 108) {
    return "large";
  }
  return "normal";
}

function normalizeSessionHighlightColor(value, fallback = SESSION_HIGHLIGHTER_DEFAULT) {
  const normalized = String(value || "").trim().toLowerCase();
  if (SESSION_HIGHLIGHTER_COLORS.has(normalized)) {
    return normalized;
  }
  return fallback;
}

function hydrateSessionUiPreferences() {
  const ui = load(STORAGE_KEYS.sessionUi, {});
  const legacyScale = ["compact", "normal", "large"].includes(ui.sessionFontScale)
    ? ui.sessionFontScale
    : "normal";
  const fallbackPercent = getSessionFontScalePercentFromLegacyScale(legacyScale);
  state.sessionFontScalePercent = normalizeSessionFontScalePercent(ui.sessionFontScalePercent, fallbackPercent);
  state.sessionFontScale = getSessionFontScaleBucket(state.sessionFontScalePercent);
  state.sessionHighContrast = Boolean(ui.sessionHighContrast);
  state.sessionMarkerEnabled = Boolean(ui.sessionMarkerEnabled);
  state.sessionHighlighterColor = normalizeSessionHighlightColor(ui.sessionHighlighterColor);
  state.sessionNavSettingsOpen = false;
}

function persistSessionUiPreferences() {
  save(STORAGE_KEYS.sessionUi, {
    sessionFontScalePercent: state.sessionFontScalePercent,
    sessionFontScale: state.sessionFontScale,
    sessionHighContrast: state.sessionHighContrast,
    sessionMarkerEnabled: state.sessionMarkerEnabled,
    sessionHighlighterColor: state.sessionHighlighterColor,
  });
}

function normalizeSession(session) {
  let changed = false;

  if (!Array.isArray(session.questionIds)) {
    session.questionIds = [];
    changed = true;
  }

  if (!session.responses || typeof session.responses !== "object" || Array.isArray(session.responses)) {
    session.responses = {};
    changed = true;
  }

  const currentSessionCourses = Array.isArray(session.courses)
    ? session.courses.map((course) => String(course || "").trim()).filter(Boolean)
    : [];
  const normalizedSessionCourses = [...new Set(currentSessionCourses)];
  if (!Array.isArray(session.courses) || currentSessionCourses.join("|") !== normalizedSessionCourses.join("|")) {
    session.courses = normalizedSessionCourses;
    changed = true;
  }

  const normalizedSessionYear = normalizeAcademicYearOrNull(session.academicYear);
  const normalizedSessionSemester = normalizeAcademicSemesterOrNull(session.academicSemester);
  if (session.academicYear !== normalizedSessionYear) {
    session.academicYear = normalizedSessionYear;
    changed = true;
  }
  if (session.academicSemester !== normalizedSessionSemester) {
    session.academicSemester = normalizedSessionSemester;
    changed = true;
  }

  const normalizedTestId = normalizeSessionTestId(session.testId, session.id);
  if (session.testId !== normalizedTestId) {
    session.testId = normalizedTestId;
    changed = true;
  }

  const normalizedName = normalizeSessionName(session.name, buildAutoSessionNameFromSession(session));
  if (session.name !== normalizedName) {
    session.name = normalizedName;
    changed = true;
  }

  if (session.status === "in_progress") {
    const availableQuestionIds = new Set(getQuestions().map((question) => question.id));
    const sanitizedQuestionIds = session.questionIds.filter((qid) => availableQuestionIds.has(qid));
    if (sanitizedQuestionIds.length !== session.questionIds.length) {
      session.questionIds = sanitizedQuestionIds;
      changed = true;
    }

    const allowedQuestionIds = new Set(session.questionIds);
    Object.keys(session.responses).forEach((qid) => {
      if (!allowedQuestionIds.has(qid)) {
        delete session.responses[qid];
        changed = true;
      }
    });
  }

  if (!session.courses.length || session.academicYear === null || session.academicSemester === null) {
    const questionsById = new Map(getQuestions().map((question) => [question.id, question]));
    const inferredCourses = [];
    const seenCourses = new Set(session.courses);

    session.questionIds.forEach((qid) => {
      const question = questionsById.get(qid);
      if (!question) {
        return;
      }
      const mappedCourse = String(getQbankCourseTopicMeta(question).course || "").trim();
      if (!mappedCourse || seenCourses.has(mappedCourse)) {
        return;
      }
      seenCourses.add(mappedCourse);
      inferredCourses.push(mappedCourse);
    });

    if (inferredCourses.length) {
      session.courses = [...session.courses, ...inferredCourses];
      changed = true;
    }

    if (session.academicYear === null || session.academicSemester === null) {
      const inferredTerm = inferAcademicTermFromCourses(session.courses);
      if (session.academicYear === null && inferredTerm.year !== null) {
        session.academicYear = inferredTerm.year;
        changed = true;
      }
      if (session.academicSemester === null && inferredTerm.semester !== null) {
        session.academicSemester = inferredTerm.semester;
        changed = true;
      }
    }
  }

  if (!session.questionIds.length && session.status === "in_progress") {
    session.status = "completed";
    session.completedAt = session.completedAt || nowISO();
    session.currentIndex = 0;
    changed = true;
  }

  const maxIndex = Math.max(0, session.questionIds.length - 1);
  const normalizedIndex = Math.max(0, Math.min(maxIndex, Math.floor(Number(session.currentIndex) || 0)));
  if (session.currentIndex !== normalizedIndex) {
    session.currentIndex = normalizedIndex;
    changed = true;
  }

  if (session.elapsedSec == null) {
    session.elapsedSec = 0;
    changed = true;
  }

  session.questionIds.forEach((qid) => {
    if (!session.responses[qid]) {
      session.responses[qid] = {
        selected: [],
        flagged: false,
        struck: [],
        notes: "",
        timeSpentSec: 0,
        highlightedLines: [],
        highlightedLineColors: {},
        highlightedChoices: {},
        textHighlights: buildEmptyTextHighlightStore(),
        submitted: false,
      };
      changed = true;
      return;
    }

    const response = session.responses[qid];
    if (!Array.isArray(response.selected)) {
      response.selected = [];
      changed = true;
    } else {
      const normalizedSelected = [...new Set(
        response.selected
          .map((entry) => normalizeQuestionChoiceLabel(entry))
          .filter(Boolean),
      )];
      if (response.selected.join("|") !== normalizedSelected.join("|")) {
        response.selected = normalizedSelected;
        changed = true;
      }
    }
    if (!Array.isArray(response.struck)) {
      response.struck = [];
      changed = true;
    } else {
      const normalizedStruck = [...new Set(
        response.struck
          .map((entry) => normalizeQuestionChoiceLabel(entry))
          .filter(Boolean),
      )];
      if (response.struck.join("|") !== normalizedStruck.join("|")) {
        response.struck = normalizedStruck;
        changed = true;
      }
    }
    if (!Array.isArray(response.highlightedLines)) {
      response.highlightedLines = [];
      changed = true;
    } else {
      const normalizedHighlightedLines = [...new Set(
        response.highlightedLines
          .map((entry) => Math.floor(Number(entry)))
          .filter((entry) => Number.isFinite(entry) && entry >= 0),
      )];
      if (response.highlightedLines.join("|") !== normalizedHighlightedLines.join("|")) {
        response.highlightedLines = normalizedHighlightedLines;
        changed = true;
      }
    }
    if (!response.highlightedLineColors || typeof response.highlightedLineColors !== "object" || Array.isArray(response.highlightedLineColors)) {
      response.highlightedLineColors = {};
      changed = true;
    } else {
      const normalizedLineColors = {};
      Object.entries(response.highlightedLineColors).forEach(([lineKey, color]) => {
        const lineIndex = Math.floor(Number(lineKey));
        const normalizedColor = normalizeSessionHighlightColor(color, "");
        if (!Number.isFinite(lineIndex) || lineIndex < 0 || !normalizedColor) {
          return;
        }
        normalizedLineColors[lineIndex] = normalizedColor;
      });
      if (JSON.stringify(response.highlightedLineColors) !== JSON.stringify(normalizedLineColors)) {
        response.highlightedLineColors = normalizedLineColors;
        changed = true;
      }
    }
    if (!response.highlightedChoices || typeof response.highlightedChoices !== "object" || Array.isArray(response.highlightedChoices)) {
      response.highlightedChoices = {};
      changed = true;
    } else {
      const normalizedChoiceColors = {};
      Object.entries(response.highlightedChoices).forEach(([choiceKey, color]) => {
        const choiceId = normalizeQuestionChoiceLabel(choiceKey);
        const normalizedColor = normalizeSessionHighlightColor(color, "");
        if (!choiceId || !normalizedColor) {
          return;
        }
        normalizedChoiceColors[choiceId] = normalizedColor;
      });
      if (JSON.stringify(response.highlightedChoices) !== JSON.stringify(normalizedChoiceColors)) {
        response.highlightedChoices = normalizedChoiceColors;
        changed = true;
      }
    }
    if (!response.textHighlights || typeof response.textHighlights !== "object" || Array.isArray(response.textHighlights)) {
      response.textHighlights = buildEmptyTextHighlightStore();
      changed = true;
    }
    if (!response.textHighlights.lines || typeof response.textHighlights.lines !== "object" || Array.isArray(response.textHighlights.lines)) {
      response.textHighlights.lines = {};
      changed = true;
    } else {
      const normalizedLineRanges = {};
      Object.entries(response.textHighlights.lines).forEach(([lineKey, ranges]) => {
        const lineIndex = Math.floor(Number(lineKey));
        if (!Number.isFinite(lineIndex) || lineIndex < 0) {
          return;
        }
        const normalizedRanges = normalizeTextHighlightRanges(ranges);
        if (!normalizedRanges.length) {
          return;
        }
        normalizedLineRanges[lineIndex] = normalizedRanges;
      });
      if (JSON.stringify(response.textHighlights.lines) !== JSON.stringify(normalizedLineRanges)) {
        response.textHighlights.lines = normalizedLineRanges;
        changed = true;
      }
    }
    if (!response.textHighlights.choices || typeof response.textHighlights.choices !== "object" || Array.isArray(response.textHighlights.choices)) {
      response.textHighlights.choices = {};
      changed = true;
    } else {
      const normalizedChoiceRanges = {};
      Object.entries(response.textHighlights.choices).forEach(([choiceKey, ranges]) => {
        const choiceId = normalizeQuestionChoiceLabel(choiceKey);
        if (!choiceId) {
          return;
        }
        const normalizedRanges = normalizeTextHighlightRanges(ranges);
        if (!normalizedRanges.length) {
          return;
        }
        normalizedChoiceRanges[choiceId] = normalizedRanges;
      });
      if (JSON.stringify(response.textHighlights.choices) !== JSON.stringify(normalizedChoiceRanges)) {
        response.textHighlights.choices = normalizedChoiceRanges;
        changed = true;
      }
    }
    response.highlightedLines.forEach((lineIndex) => {
      if (!response.highlightedLineColors[lineIndex]) {
        response.highlightedLineColors[lineIndex] = SESSION_HIGHLIGHTER_DEFAULT;
        changed = true;
      }
    });
    Object.keys(response.highlightedLineColors).forEach((lineKey) => {
      const lineIndex = Math.floor(Number(lineKey));
      if (!Number.isFinite(lineIndex) || lineIndex < 0) {
        return;
      }
      if (!response.highlightedLines.includes(lineIndex)) {
        response.highlightedLines.push(lineIndex);
        changed = true;
      }
    });
    const dedupedLineIndexes = [...new Set(response.highlightedLines)].sort((a, b) => a - b);
    if (response.highlightedLines.join("|") !== dedupedLineIndexes.join("|")) {
      response.highlightedLines = dedupedLineIndexes;
      changed = true;
    }
    if (typeof response.flagged !== "boolean") {
      response.flagged = false;
      changed = true;
    }
    if (typeof response.notes !== "string") {
      response.notes = "";
      changed = true;
    }
    if (typeof response.timeSpentSec !== "number") {
      response.timeSpentSec = 0;
      changed = true;
    }
    if (typeof response.submitted !== "boolean") {
      response.submitted = false;
      changed = true;
    }
  });

  if (changed) {
    upsertSession(session);
  }
}

function splitStemLines(stem) {
  return String(stem || "")
    .split(/(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function buildAskAiPromptText(question) {
  const meta = getQbankCourseTopicMeta(question || {});
  const stem = String(question?.stem || "").trim();
  const choices = Array.isArray(question?.choices) ? question.choices : [];
  const choiceLines = choices
    .map((choice) => {
      const id = String(choice?.id || "").trim();
      const text = String(choice?.text || "").trim();
      if (!id || !text) {
        return "";
      }
      return `${id}. ${text}`;
    })
    .filter(Boolean);
  const lines = [
    "Please explain this MCQ and the reasoning behind the best answer.",
    "",
    meta.course ? `Course: ${meta.course}` : "",
    meta.topic ? `Topic: ${meta.topic}` : "",
    "",
    "Question:",
    stem || "N/A",
    "",
    "Options:",
    choiceLines.join("\n"),
  ].filter((line, index, source) => {
    if (!line) {
      return source[index - 1] && source[index - 1] !== "";
    }
    return true;
  });
  return lines.join("\n").trim();
}

function openAskAiNotebook(url) {
  const normalizedUrl = normalizeCourseNotebookLink(url);
  if (!normalizedUrl) {
    return false;
  }

  const focusAskAiWindow = (targetWindow) => {
    try {
      targetWindow?.focus?.();
    } catch {
      // Some browsers block programmatic focus even when the tab opened successfully.
    }
  };

  try {
    if (askAiWindowRef && !askAiWindowRef.closed) {
      try {
        askAiWindowRef.location.href = normalizedUrl;
        focusAskAiWindow(askAiWindowRef);
        return true;
      } catch {
        askAiWindowRef = null;
      }
    }
  } catch {
    askAiWindowRef = null;
  }

  try {
    const opened = window.open(normalizedUrl, ASK_AI_WINDOW_NAME);
    if (opened) {
      askAiWindowRef = opened;
      try {
        askAiWindowRef.opener = null;
      } catch {
        // Ignore browsers that do not allow overriding opener.
      }
      focusAskAiWindow(askAiWindowRef);
      return true;
    }
  } catch {
    // Fall through to anchor click fallback.
  }

  let clickAttempted = false;
  const link = document.createElement("a");
  try {
    link.href = normalizedUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.style.position = "fixed";
    link.style.top = "-9999px";
    link.style.left = "-9999px";
    document.body.appendChild(link);
    link.click();
    clickAttempted = true;
  } catch {
    clickAttempted = false;
  } finally {
    try {
      link.remove();
    } catch {
      // Ignore cleanup errors.
    }
  }
  return clickAttempted;
}

async function copyTextToClipboard(text) {
  const value = String(text || "");
  if (!value) {
    return false;
  }
  if (navigator?.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      // Fall back to legacy copy.
    }
  }
  try {
    const textArea = document.createElement("textarea");
    textArea.value = value;
    textArea.setAttribute("readonly", "readonly");
    textArea.style.position = "fixed";
    textArea.style.top = "-9999px";
    textArea.style.left = "-9999px";
    document.body.appendChild(textArea);
    textArea.select();
    const copied = document.execCommand("copy");
    textArea.remove();
    return Boolean(copied);
  } catch {
    return false;
  }
}

function renderQuestionStemVisual(question) {
  const questionImage = String(question?.questionImage || "").trim();
  if (!questionImage) {
    return "";
  }
  return `
    <figure class="exam-question-media">
      <img src="${escapeHtml(questionImage)}" alt="Question visual" loading="lazy" />
    </figure>
  `;
}

function renderInlineExplanationPane(question, isCorrect) {
  const choices = Array.isArray(question?.choices) ? question.choices : [];
  const correctIds = Array.isArray(question?.correct) ? question.correct : [];
  const correctAnswerText = choices
    .filter((choice) => correctIds.includes(choice.id))
    .map((choice) => `${choice.id}. ${choice.text}`)
    .join(" | ");

  return `
    <section class="exam-feedback-block ${isCorrect ? "good" : "bad"}">
      <header class="exam-feedback-head">
        <h4>${isCorrect ? "Your answer is correct." : "Your answer is incorrect."}</h4>
      </header>
      <p class="exam-review-rationale">${escapeHtml(question.explanation)}</p>
      <p class="exam-feedback-answer">The correct answer is: ${escapeHtml(correctAnswerText || correctIds.join(", "))}</p>
    </section>
  `;
}

function renderExplanationVisual(question) {
  if (question.explanationImage) {
    return `<img src="${escapeHtml(question.explanationImage)}" alt="Explanation visual" loading="lazy" />`;
  }

  return `
    <div class="exam-visual-fallback">
      <div class="badge-line">${escapeHtml(question.system)} • ${escapeHtml(question.topic)}</div>
      <div class="shape s1"></div>
      <div class="shape s2"></div>
      <div class="shape s3"></div>
      <p>Add <code>explanationImage</code> in the question editor to show a real figure here.</p>
    </div>
  `;
}

function toggleSessionPanel(panel) {
  state.sessionPanel = state.sessionPanel === panel ? null : panel;
  render();
}

function renderSessionPanel(session, question, response) {
  if (!state.sessionPanel) {
    return "";
  }

  const notebookEntries = getNotebookEntries(session.userId);
  const flashcards = load(STORAGE_KEYS.flashcards, {})[session.userId] || [];
  const panelHeaderMap = {
    shortcuts: "Shortcuts",
    labs: "Lab Values",
    notes: "Notes",
    calculator: "Calculator",
    settings: "Settings",
    library: "Medical Library",
    notebook: "My Notebook",
    feedback: "Feedback",
    aiTutor: "AI Tutor",
  };

  let content = "";

  if (state.sessionPanel === "shortcuts") {
    content = `
      <ul class="exam-panel-list">
        <li><b>Left / Right Arrow</b><span>Previous / Next question</span></li>
        <li><b>1 - 5</b><span>Select answer option</span></li>
        <li><b>F</b><span>Mark or unmark current question</span></li>
        <li><b>N</b><span>Open Notes</span></li>
        <li><b>L</b><span>Open Lab Values</span></li>
        <li><b>C</b><span>Open Calculator</span></li>
        <li><b>M</b><span>Toggle Marker mode</span></li>
        <li><b>S</b><span>Check answer / Next</span></li>
        <li><b>Esc</b><span>Close open tool panel</span></li>
      </ul>
    `;
  }

  if (state.sessionPanel === "labs") {
    content = `
      <table class="exam-mini-table">
        <thead><tr><th>Lab</th><th>Normal Range</th></tr></thead>
        <tbody>
          <tr><td>Na+</td><td>135-145 mEq/L</td></tr>
          <tr><td>K+</td><td>3.5-5.0 mEq/L</td></tr>
          <tr><td>HCO3-</td><td>22-28 mEq/L</td></tr>
          <tr><td>Creatinine</td><td>0.6-1.3 mg/dL</td></tr>
          <tr><td>pH</td><td>7.35-7.45</td></tr>
          <tr><td>pCO2</td><td>35-45 mmHg</td></tr>
        </tbody>
      </table>
    `;
  }

  if (state.sessionPanel === "notes") {
    content = `
      <label class="exam-panel-label">Private note for Q${session.currentIndex + 1}
        <textarea id="session-note-panel" placeholder="Add reasoning, memory hooks, mnemonics...">${escapeHtml(response.notes)}</textarea>
      </label>
    `;
  }

  if (state.sessionPanel === "calculator") {
    content = `
      <div class="exam-calc">
        <div class="exam-calc-display">${escapeHtml(state.calcExpression || "0")}</div>
        <div class="exam-calc-grid">
          ${["7", "8", "9", "/", "4", "5", "6", "*", "1", "2", "3", "-", "0", ".", "%", "+"]
        .map((token) => `<button class="exam-calc-key" data-action="calc-input" data-value="${token}">${token}</button>`)
        .join("")}
          <button class="exam-calc-key wide" data-action="calc-clear">C</button>
          <button class="exam-calc-key" data-action="calc-delete">⌫</button>
          <button class="exam-calc-key" data-action="calc-eval">=</button>
        </div>
      </div>
    `;
  }

  if (state.sessionPanel === "settings") {
    content = `
      <div class="exam-panel-stack">
        <p class="subtle">Text size</p>
        <div class="stack">
          <button class="btn ghost" data-action="set-font-scale" data-scale="compact">Compact</button>
          <button class="btn ghost" data-action="set-font-scale" data-scale="normal">Normal</button>
          <button class="btn ghost" data-action="set-font-scale" data-scale="large">Large</button>
        </div>
        <hr />
        <p class="subtle">Visual mode</p>
        <button class="btn ghost" data-action="toggle-contrast">${state.sessionHighContrast ? "Disable" : "Enable"} high contrast</button>
      </div>
    `;
  }

  if (state.sessionPanel === "library") {
    content = `
      <ul class="exam-panel-list">
        <li><b>Question Objective</b><span>${escapeHtml(question.objective || "Not provided")}</span></li>
        <li><b>Primary Reference</b><span>${escapeHtml(question.references || "N/A")}</span></li>
        <li><b>Topic</b><span>${escapeHtml(question.topic)} • ${escapeHtml(question.system)}</span></li>
      </ul>
    `;
  }

  if (state.sessionPanel === "notebook") {
    content = `
      <p class="subtle">Saved notes: ${notebookEntries.length} entries • Flashcards: ${flashcards.length}</p>
      <div class="exam-note-list">
        ${notebookEntries.length
        ? notebookEntries
          .slice(0, 12)
          .map((entry) => `<article><b>${escapeHtml(entry.questionId)}</b><p>${escapeHtml(entry.note)}</p></article>`)
          .join("")
        : `<p class="subtle">No notes captured yet.</p>`
      }
      </div>
    `;
  }

  if (state.sessionPanel === "feedback") {
    content = `
      <form id="feedback-form">
        <label class="exam-panel-label">Send feedback on this question
          <textarea id="feedback-input" placeholder="Tell us what can be improved..."></textarea>
        </label>
        <button class="btn" type="submit">Submit feedback</button>
      </form>
    `;
  }

  if (state.sessionPanel === "aiTutor") {
    const userAnswer = response.selected.length ? response.selected.join(", ") : "No answer submitted";
    const correctAnswer = question.correct.join(", ");
    const wasCorrect = isSubmittedResponseCorrect(question, response);
    content = `
      <div class="exam-panel-stack">
        <p><b>Question:</b> ${escapeHtml(question.topic)} • ${escapeHtml(question.system)}</p>
        <p><b>Your answer:</b> ${escapeHtml(userAnswer)}</p>
        <p><b>Correct answer:</b> ${escapeHtml(correctAnswer)}</p>
        <p><b>Status:</b> ${wasCorrect ? "Correct" : "Incorrect"}</p>
        <hr />
        <p><b>Tutor explanation:</b></p>
        <p class="subtle">${escapeHtml(question.explanation)}</p>
        <p><b>Study tip:</b></p>
        <p class="subtle">Before selecting an option, summarize the key finding in one sentence, then eliminate choices that do not directly explain that finding.</p>
      </div>
    `;
  }

  return `
    <div class="exam-panel-backdrop" data-action="close-session-panel"></div>
    <aside class="exam-panel">
      <div class="exam-panel-head">
        <h4>${panelHeaderMap[state.sessionPanel] || "Panel"}</h4>
        <button class="exam-tool-btn" data-action="close-session-panel">Close</button>
      </div>
      <div class="exam-panel-body">${content}</div>
    </aside>
  `;
}

function toggleSessionFullscreen() {
  const shell = document.querySelector(".exam-shell-wrap");
  if (!shell) {
    return;
  }

  if (!document.fullscreenElement) {
    shell.requestFullscreen?.();
  } else {
    document.exitFullscreen?.();
  }
}

function applyCalculatorInput(value) {
  if (!value) {
    return;
  }
  if (state.calcExpression === "0" && value !== ".") {
    state.calcExpression = value;
    return;
  }
  state.calcExpression += value;
}

function evaluateCalculator() {
  const expression = String(state.calcExpression || "").trim();
  if (!expression) {
    return;
  }
  if (!/^[0-9+\-*/().% ]+$/.test(expression)) {
    toast("Invalid calculator expression.");
    return;
  }

  try {
    const result = Function(`"use strict"; return (${expression})`)();
    if (Number.isFinite(result)) {
      state.calcExpression = String(result);
    } else {
      toast("Invalid result.");
    }
  } catch {
    toast("Calculation error.");
  }
}

function addCurrentQuestionToFlashcards(userId, questionId) {
  const map = load(STORAGE_KEYS.flashcards, {});
  const deck = new Set(map[userId] || []);
  deck.add(questionId);
  map[userId] = [...deck];
  save(STORAGE_KEYS.flashcards, map);
}

function getNotebookEntries(userId) {
  const sessions = getAcademicTermScopedSessionsForUser(userId);
  const entries = [];
  sessions.forEach((session) => {
    session.questionIds.forEach((qid) => {
      const note = session.responses[qid]?.notes;
      if (note && note.trim()) {
        entries.push({ questionId: qid, note: note.trim() });
      }
    });
  });
  return entries;
}

function captureElapsedForCurrentQuestion(session) {
  if (!session) {
    return;
  }

  if (session.mode === "timed") {
    session.lastQuestionAt = Date.now();
    return;
  }

  const now = Date.now();
  const previous = session.lastQuestionAt || now;
  const elapsed = Math.max(0, Math.round((now - previous) / 1000));
  const qid = session.questionIds[session.currentIndex];
  if (session.responses[qid]) {
    session.responses[qid].timeSpentSec += elapsed;
  }
  session.lastQuestionAt = now;
}

function load(key, fallback) {
  const raw = readStorageKey(key);
  if (!raw) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(fallback)) {
      return Array.isArray(parsed) ? parsed : fallback;
    }
    if (fallback && typeof fallback === "object" && !Array.isArray(fallback)) {
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : fallback;
    }
    return parsed;
  } catch {
    return fallback;
  }
}

function save(key, value, options = {}) {
  writeStorageKey(key, value);
  invalidateAnalyticsCacheForStorageKey(key);
  if (key === STORAGE_KEYS.sessions) {
    scheduleSessionStateSync(options);
  } else {
    scheduleRelationalWrite(key, value);
    if (!RELATIONAL_SYNC_KEY_SET.has(key)) {
      scheduleSupabaseWrite(key, value);
    }
  }
  appendStorageMutationLog("save", key, value);
}

function readStorageKey(key) {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    warnStorageFallback(error);
    return inMemoryStorage.get(key) ?? null;
  }
}

function writeStorageKey(key, value) {
  let serialized = null;
  try {
    serialized = JSON.stringify(value);
  } catch (error) {
    console.warn(`Could not serialize storage key "${key}".`, error);
    return;
  }

  try {
    localStorage.setItem(key, serialized);
    inMemoryStorage.delete(key);
  } catch (error) {
    warnStorageFallback(error);
    inMemoryStorage.set(key, serialized);
  }
  if (key === STORAGE_KEYS.questions) {
    state.questionsRevision = (state.questionsRevision || 0) + 1;
  }
}

function removeStorageKey(key) {
  inMemoryStorage.delete(key);
  try {
    localStorage.removeItem(key);
  } catch (error) {
    warnStorageFallback(error);
  }
  appendStorageMutationLog("remove", key, null);
}

function readSessionStorageKey(key) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSessionStorageKey(key, value) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // Ignore when sessionStorage is blocked.
  }
}

function removeSessionStorageKey(key) {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // Ignore when sessionStorage is blocked.
  }
}

async function loginAsDemo(email, password) {
  if (SUPABASE_CONFIG.enabled) {
    toast("Demo accounts are disabled when Supabase is active. Please log in with your account.");
    return;
  }
  const user = getUsers().find((entry) => entry.email === email && entry.password === password);
  if (!user) {
    toast("Demo account unavailable.");
    return;
  }
  if (!isUserAccessApproved(user)) {
    toast("This account is pending admin approval.");
    return;
  }
  save(STORAGE_KEYS.currentUserId, user.id);
  if (await shouldForceRefreshForUpdates(user)) {
    return;
  }
  appendSystemLog("auth.login", `Logged in as ${user.email}`, {
    userId: user.id,
    role: user.role,
    auth: "demo",
  }, { force: true });
  navigate(user.role === "admin" ? "admin" : "dashboard");
}

async function logout(options = {}) {
  const actor = options?.actor || getCurrentUser();
  const route = options?.route === "login" ? "login" : "landing";
  const notice = typeof options?.message === "string" ? String(options.message || "").trim() : "Logged out.";
  const isAccessRevoked = options?.reason === "access-revoked";
  appendSystemLog(
    isAccessRevoked ? "auth.access_revoked" : "auth.logout",
    `${isAccessRevoked ? "User access revoked" : "User logged out"}: ${String(actor?.email || actor?.id || "unknown")}`,
    {
      userId: String(actor?.id || ""),
      role: String(actor?.role || ""),
    },
    { force: true },
  );
  const offlinePromise = markCurrentUserOffline().catch(() => { });
  const activityEndPromise = endCurrentUserActivitySession().catch(() => { });
  const authClient = getSupabaseAuthClient();
  if (authClient) {
    suppressSupabaseSignedOutRecovery = true;
  }
  const signOutPromise = authClient
    ? authClient.auth.signOut().catch((error) => {
      console.warn("Supabase sign-out failed.", error?.message || error);
    })
    : Promise.resolve();

  syncPresenceRuntime(null);
  resetSiteActivityRuntime();
  clearSupabaseSessionRecoveryRetry();
  clearNotificationRealtimeSubscription();
  clearSessionRealtimeSubscription();
  clearProfileAccessRealtimeSubscription();
  clearStudentAccessPolling();
  clearStudentForceRefreshPolling();
  clearStudentBackgroundRefreshPolling();
  clearAdminPresencePolling();
  clearAdminDashboardPolling();
  resetRelationalSyncState();
  resetSupabaseSyncRuntimeState();
  resetPendingAdminActionRuntimeState();
  resetPostAuthWarmupRuntimeState();
  supabaseAuth.activeUserId = "";
  removeStorageKey(STORAGE_KEYS.currentUserId);
  setGoogleOAuthPendingState(false);
  setPasswordRecoveryPendingState(false);
  state.userMenuOpen = false;
  state.notificationMenuOpen = false;
  state.sessionId = null;
  state.reviewSessionId = null;
  state.reviewIndex = 0;
  navigate(route);
  if (notice) {
    toast(notice);
  }
  Promise.allSettled([offlinePromise, activityEndPromise, signOutPromise]).catch(() => { });
}

async function logoutDueToAccessRevocation(message = ACCOUNT_DEACTIVATED_SUPPORT_MESSAGE) {
  await logout({
    route: "login",
    message,
    reason: "access-revoked",
  });
}

function selectHtml(name, options, selected) {
  return `
    <select name="${name}">
      <option value="">All</option>
      ${options
      .map((option) => `<option value="${escapeHtml(option)}" ${selected === option ? "selected" : ""}>${escapeHtml(option)}</option>`)
      .join("")}
    </select>
  `;
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b)));
}

function makeId(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}_${Date.now().toString(36).slice(-4)}`;
}

function nowISO() {
  return new Date().toISOString();
}

function arraysEqual(a, b) {
  return a.length === b.length && a.every((entry, idx) => entry === b[idx]);
}

function getNormalizedQuestionCorrectChoiceIds(question) {
  const choices = normalizeQuestionChoiceEntries(question?.choices);
  if (!choices.length) {
    return [];
  }
  const choiceIds = new Set(choices.map((choice) => choice.id));
  return [...new Set(
    (Array.isArray(question?.correct) ? question.correct : [])
      .map((entry) => normalizeQuestionChoiceLabel(entry))
      .filter((entry) => choiceIds.has(entry)),
  )].sort();
}

function getNormalizedResponseSelectedChoiceIds(response, allowedChoiceIds = null) {
  const allowed = allowedChoiceIds instanceof Set ? allowedChoiceIds : null;
  return [...new Set(
    (Array.isArray(response?.selected) ? response.selected : [])
      .map((entry) => normalizeQuestionChoiceLabel(entry))
      .filter((entry) => Boolean(entry) && (!allowed || allowed.has(entry))),
  )].sort();
}

function isResponseSelectionCorrect(question, response) {
  if (!question || !response) {
    return false;
  }
  const choiceIds = new Set(normalizeQuestionChoiceEntries(question?.choices).map((choice) => choice.id));
  const correct = getNormalizedQuestionCorrectChoiceIds(question);
  if (!correct.length) {
    return false;
  }
  const selected = getNormalizedResponseSelectedChoiceIds(response, choiceIds);
  if (!selected.length) {
    return false;
  }
  return arraysEqual(selected, correct);
}

function isSubmittedResponseCorrect(question, response) {
  if (!question || !response || !response.submitted) {
    return false;
  }
  return isResponseSelectionCorrect(question, response);
}

function shuffle(list) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function formatDuration(seconds) {
  const safe = Math.max(0, seconds || 0);
  const mm = String(Math.floor(safe / 60)).padStart(2, "0");
  const ss = String(safe % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function formatElapsed(seconds) {
  const safe = Math.max(0, seconds || 0);
  const hh = String(Math.floor(safe / 3600)).padStart(2, "0");
  const mm = String(Math.floor((safe % 3600) / 60)).padStart(2, "0");
  const ss = String(safe % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function toast(message) {
  const template = document.getElementById("toast-template");
  const node = template.content.firstElementChild.cloneNode(true);
  node.textContent = message;
  document.body.appendChild(node);
  window.setTimeout(() => {
    node.remove();
  }, 2400);
}

function renderBootstrapFallback() {
  try {
    clearNotificationRealtimeSubscription();
    clearSessionRealtimeSubscription();
    clearProfileAccessRealtimeSubscription();
    clearStudentAccessPolling();
    setGoogleOAuthPendingState(false);
    clearAdminDashboardPolling();
    document.body.classList.remove("is-routing");
    appEl.classList.remove("route-enter", "route-enter-active", "is-session", "is-admin");
    topbarEl?.classList.remove("hidden", "admin-only-header");
    publicNavEl?.classList.remove("hidden");
    privateNavEl?.classList.add("hidden");
    adminLinkEl?.classList.add("hidden");
    authActionsEl?.classList.remove("hidden");
    if (authActionsEl) {
      authActionsEl.innerHTML = `
        ${renderThemeToggleButton()}
        <button data-nav="login">Login</button>
        <button class="btn" data-nav="signup">Sign up</button>
      `;
    }
    appEl.innerHTML = renderLanding();
  } catch (fallbackError) {
    console.error("Fallback render failed:", fallbackError);
  }
}

init().catch((error) => {
  console.error("Application bootstrap failed:", error);
  const alreadyAttemptedRecovery = readSessionStorageKey(BOOT_RECOVERY_FLAG) === "1";
  if (!alreadyAttemptedRecovery) {
    writeSessionStorageKey(BOOT_RECOVERY_FLAG, "1");
    init()
      .then(() => {
        removeSessionStorageKey(BOOT_RECOVERY_FLAG);
      })
      .catch((retryError) => {
        console.error("Recovery bootstrap failed:", retryError);
        removeSessionStorageKey(BOOT_RECOVERY_FLAG);
        renderBootstrapFallback();
        toast("App failed to initialize. A safe fallback view was loaded.");
      });
    return;
  }
  removeSessionStorageKey(BOOT_RECOVERY_FLAG);
  renderBootstrapFallback();
  toast("App failed to initialize. A safe fallback view was loaded.");
});
