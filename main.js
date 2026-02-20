const STORAGE_KEYS = {
  users: "mcq_users",
  currentUserId: "mcq_current_user_id",
  questions: "mcq_questions",
  sessions: "mcq_sessions",
  filterPresets: "mcq_filter_presets",
  incorrectQueue: "mcq_incorrect_queue",
  invites: "mcq_invites",
  sessionUi: "mcq_session_ui_settings",
  feedback: "mcq_feedback",
  flashcards: "mcq_flashcards",
  curriculum: "mcq_curriculum",
  courseTopics: "mcq_course_topics",
  appVersionSeen: "mcq_app_version_seen",
  appVersionForced: "mcq_app_version_forced",
};

const appEl = document.getElementById("app");
const topbarEl = document.querySelector(".topbar");
const brandWrapEl = document.querySelector(".brand-wrap");
const publicNavEl = document.getElementById("public-nav");
const privateNavEl = document.getElementById("private-nav");
const authActionsEl = document.getElementById("auth-actions");
const adminLinkEl = document.getElementById("admin-link");
const googleAuthLoadingEl = document.getElementById("google-auth-loading");
const APP_VERSION = String(document.querySelector('meta[name="app-version"]')?.getAttribute("content") || "2026-02-18.11").trim();
const ROUTE_STATE_ROUTE_KEY = "mcq_last_route";
const ROUTE_STATE_ADMIN_PAGE_KEY = "mcq_last_admin_page";
const ROUTE_STATE_ROUTE_LOCAL_KEY = "mcq_last_route_local";
const ROUTE_STATE_ADMIN_PAGE_LOCAL_KEY = "mcq_last_admin_page_local";
const GOOGLE_OAUTH_PENDING_KEY = "mcq_google_oauth_pending";
const KNOWN_ROUTES = new Set([
  "landing",
  "features",
  "pricing",
  "about",
  "contact",
  "login",
  "signup",
  "forgot",
  "complete-profile",
  "dashboard",
  "create-test",
  "qbank",
  "builder",
  "session",
  "review",
  "analytics",
  "profile",
  "admin",
]);
const KNOWN_ADMIN_PAGES = new Set(["dashboard", "users", "courses", "questions", "activity"]);
const INITIAL_ROUTE = resolveInitialRoute();
const INITIAL_ADMIN_PAGE = resolveInitialAdminPage();
const RELATIONAL_READY_CACHE_MS = 45000;
const RELATIONAL_READY_FAILURE_CACHE_MS = 6000;
const ADMIN_DATA_REFRESH_MS = 15000;
const STUDENT_DATA_REFRESH_MS = 20000;
const STUDENT_FULL_DATA_REFRESH_MS = 180000;
const ANALYTICS_RECENT_SESSION_WINDOW = 3;
const PRESENCE_HEARTBEAT_MS = 25000;
const PRESENCE_ONLINE_STALE_MS = 120000;
const SUPABASE_BOOTSTRAP_RETRY_MS = 1200;
const SUPABASE_BOOTSTRAP_RETRY_LIMIT = 10;
const AUTH_SIGNIN_TIMEOUT_MS = 8000;
const APP_VERSION_FETCH_TIMEOUT_MS = 2500;
const PROFILE_LOOKUP_TIMEOUT_MS = 3500;
const ROUTE_TRANSITION_MS = 420;
const RELATIONAL_IN_BATCH_SIZE = 200;
const RELATIONAL_UPSERT_BATCH_SIZE = 200;
const RELATIONAL_INSERT_BATCH_SIZE = 250;
const RELATIONAL_DELETE_BATCH_SIZE = 250;
// Temporary demand switch: set to false to restore manual admin approval.
const AUTO_APPROVE_STUDENT_ACCESS = true;
const AUTO_APPROVAL_ACTOR = "system:auto";
const BOOT_RECOVERY_FLAG = "mcq_boot_recovery_attempted";
const OAUTH_CALLBACK_QUERY_KEYS = new Set([
  "code",
  "state",
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
  adminCurriculumYear: 1,
  adminCurriculumSemester: 1,
  adminEditorCourse: "",
  adminEditorTopic: "",
  adminQuestionModalOpen: false,
  qbankFilters: {
    course: "",
    topics: [],
  },
  createTestSource: "all",
  analyticsCourse: "",
  sessionPanel: null,
  sessionMarkerEnabled: false,
  sessionFontScale: "normal",
  sessionHighContrast: false,
  calcExpression: "",
  adminImportReport: null,
  adminImportDraft: "",
  skipNextRouteAnimation: false,
  adminDataRefreshing: false,
  adminDataLastSyncAt: 0,
  adminDataSyncError: "",
  adminPresenceRows: [],
  adminPresenceLoading: false,
  adminPresenceError: "",
  adminPresenceLastSyncAt: 0,
  adminImportRunning: false,
  adminImportStatus: "",
  adminImportStatusTone: "neutral",
  studentDataRefreshing: false,
  studentDataLastSyncAt: 0,
  studentDataLastFullSyncAt: 0,
};

let appVersionCheckPromise = null;

const SUPABASE_CONFIG = {
  url: window.__SUPABASE_CONFIG?.url || "",
  anonKey: window.__SUPABASE_CONFIG?.anonKey || "",
  enabled: window.__SUPABASE_CONFIG?.enabled !== false,
  authRedirectUrl: window.__SUPABASE_CONFIG?.authRedirectUrl || "",
  questionImageBucket: window.__SUPABASE_CONFIG?.questionImageBucket || "question-images",
};

const QUESTION_IMAGE_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;
const QUESTION_IMAGE_DATA_URL_FALLBACK_MAX_BYTES = 900 * 1024;
const QUESTION_IMAGE_ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
]);

const SYNCABLE_STORAGE_KEYS = [
  STORAGE_KEYS.users,
  STORAGE_KEYS.questions,
  STORAGE_KEYS.sessions,
  STORAGE_KEYS.filterPresets,
  STORAGE_KEYS.incorrectQueue,
  STORAGE_KEYS.invites,
  STORAGE_KEYS.feedback,
  STORAGE_KEYS.flashcards,
  STORAGE_KEYS.curriculum,
  STORAGE_KEYS.courseTopics,
];

const USER_SCOPED_SYNC_KEYS = [STORAGE_KEYS.sessions, STORAGE_KEYS.incorrectQueue, STORAGE_KEYS.flashcards];
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

const supabaseSync = {
  enabled: false,
  client: null,
  tableName: "",
  storageKeyColumn: "",
  pendingWrites: new Map(),
  flushTimer: null,
};

const supabaseAuth = {
  enabled: false,
  client: null,
};

const relationalSync = {
  enabled: false,
  pendingWrites: new Map(),
  flushTimer: null,
  flushing: false,
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
let globalEventsBound = false;
let questionSyncInFlightPromise = null;
let queuedQuestionSyncPayload = null;
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

const analyticsRuntime = {
  cache: new Map(),
  questionMetaById: new Map(),
};

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

let O6U_CURRICULUM = deepClone(DEFAULT_O6U_CURRICULUM);
let CURRICULUM_COURSE_LIST = [];
let COURSE_TOPIC_OVERRIDES = {};
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

function resolveInitialRoute() {
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
}

async function init() {
  seedData();
  initVersionTracking();
  hydrateSessionUiPreferences();
  bindGlobalEvents();
  syncGoogleOAuthLoadingUi();
  document.body.classList.add("is-routing");
  render();

  let syncBootstrap = { enabled: false, hadRemoteData: false };
  try {
    syncBootstrap = await initSupabaseSync();
  } catch (error) {
    console.warn("Supabase sync bootstrap failed.", error?.message || error);
  }

  try {
    await initSupabaseAuth();
  } catch (error) {
    console.warn("Supabase auth bootstrap failed.", error?.message || error);
  }

  if (syncBootstrap.enabled && !syncBootstrap.hadRemoteData) {
    scheduleFullSupabaseSync();
  }
  if (supabaseAuth.enabled || supabaseSync.enabled) {
    clearSupabaseBootstrapRetry();
  } else if (SUPABASE_CONFIG.enabled && !window.supabase?.createClient) {
    scheduleSupabaseBootstrapRetry();
  }
  removeSessionStorageKey(BOOT_RECOVERY_FLAG);
  render();
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
    let syncBootstrap = { enabled: false, hadRemoteData: false };
    try {
      syncBootstrap = await initSupabaseSync();
    } catch (error) {
      console.warn("Deferred Supabase sync bootstrap failed.", error?.message || error);
    }

    try {
      await initSupabaseAuth();
    } catch (error) {
      console.warn("Deferred Supabase auth bootstrap failed.", error?.message || error);
    }

    if (!syncBootstrap.enabled && !supabaseAuth.enabled) {
      return false;
    }

    if (syncBootstrap.enabled && !syncBootstrap.hadRemoteData) {
      scheduleFullSupabaseSync();
    }
    clearSupabaseBootstrapRetry();
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
  tryBootstrapSupabaseInBackground().catch(() => {});
  supabaseBootstrapRetryHandle = window.setInterval(() => {
    if (supabaseBootstrapRetries >= SUPABASE_BOOTSTRAP_RETRY_LIMIT) {
      clearSupabaseBootstrapRetry();
      return;
    }
    supabaseBootstrapRetries += 1;
    tryBootstrapSupabaseInBackground().catch(() => {});
  }, SUPABASE_BOOTSTRAP_RETRY_MS);
}

async function initSupabaseSync() {
  if (!SUPABASE_CONFIG.enabled || !SUPABASE_CONFIG.url || !SUPABASE_CONFIG.anonKey || !window.supabase?.createClient) {
    return { enabled: false, hadRemoteData: false };
  }

  try {
    supabaseSync.client = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });

    const syncShape = await detectSupabaseStorageShape(supabaseSync.client);
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

function resolveGoogleOAuthPendingState(user, privateRoutes = []) {
  const pending = isGoogleOAuthPendingState();
  if (!pending) {
    syncGoogleOAuthLoadingUi();
    return;
  }

  const route = String(state.route || "").trim().toLowerCase();
  const isPrivateRoute = Array.isArray(privateRoutes) && privateRoutes.includes(route);
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

  const callbackError = getFriendlyOAuthCallbackErrorMessage(
    callbackParams.get("error_description") || callbackParams.get("error"),
  );
  if (callbackError) {
    setGoogleOAuthPendingState(false);
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
        toast(error.message || "Google sign-in callback failed. Please try again.");
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
        toast(error.message || "Google sign-in callback failed. Please try again.");
        callbackFailed = true;
      }
    }
  } else {
    setGoogleOAuthPendingState(false);
    callbackFailed = true;
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
  if (!SUPABASE_CONFIG.enabled || !SUPABASE_CONFIG.url || !SUPABASE_CONFIG.anonKey || !window.supabase?.createClient) {
    if (isGoogleOAuthPendingState()) {
      setGoogleOAuthPendingState(false);
    }
    return;
  }

  try {
    supabaseAuth.client = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
    supabaseAuth.enabled = true;
    if (supabaseSync.enabled) {
      supabaseSync.client = supabaseAuth.client;
    }

    const callbackStatus = await resolveSupabaseAuthCallback(supabaseAuth.client).catch((callbackError) => {
      console.warn("Supabase auth callback handling failed.", callbackError?.message || callbackError);
      setGoogleOAuthPendingState(false);
      return "error";
    });

    let sessionResult = await supabaseAuth.client.auth.getSession();
    if (!sessionResult?.error && callbackStatus === "processed" && !sessionResult?.data?.session?.user) {
      for (let attempt = 0; attempt < 4; attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 250));
        sessionResult = await supabaseAuth.client.auth.getSession();
        if (sessionResult?.data?.session?.user || sessionResult?.error) {
          break;
        }
      }
    }
    const { data, error } = sessionResult;
    if (error) {
      console.warn("Supabase auth session bootstrap failed.", error.message);
      setGoogleOAuthPendingState(false);
    } else if (data?.session?.user) {
      let localUser = upsertLocalUserFromAuth(data.session.user);
      const profileSync = await refreshLocalUserFromRelationalProfile(data.session.user, localUser);
      localUser = profileSync.user;
      await ensureRelationalSyncReady().catch((syncError) => {
        console.warn("Relational sync initialization failed.", syncError?.message || syncError);
      });
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
        await supabaseAuth.client.auth.signOut().catch(() => {});
        toast("Your account is pending admin approval.");
        if (state.route !== "login") {
          navigate("login");
        } else {
          state.skipNextRouteAnimation = true;
          render();
        }
        return;
      } else if (localUser) {
        if (await shouldForceRefreshAfterSignIn()) {
          return;
        }
        await hydrateRelationalState(localUser).catch((hydrateError) => {
          console.warn("Could not hydrate relational state.", hydrateError?.message || hydrateError);
        });
        if (localUser?.role === "admin") {
          state.adminDataLastSyncAt = Date.now();
          state.adminDataSyncError = "";
        }
        await hydrateUserScopedSupabaseState(localUser).catch((hydrateError) => {
          console.warn("Could not hydrate user scoped data.", hydrateError?.message || hydrateError);
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
      if (session?.user) {
        if (event === "TOKEN_REFRESHED") {
          return;
        }
        let localUser = upsertLocalUserFromAuth(session.user);
        const profileSync = await refreshLocalUserFromRelationalProfile(session.user, localUser);
        localUser = profileSync.user;
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
        if (event === "SIGNED_IN" && (await shouldForceRefreshAfterSignIn())) {
          return;
        }
        if (["login", "signup", "forgot", "landing"].includes(state.route) && localUser) {
          const postAuthRoute = getStudentProfileCompletionRoute(localUser) || (localUser.role === "admin" ? "admin" : "dashboard");
          navigate(postAuthRoute);
        }
        await ensureRelationalSyncReady().catch((syncError) => {
          console.warn("Relational sync initialization failed.", syncError?.message || syncError);
        });
        await hydrateRelationalState(localUser).catch((hydrateError) => {
          console.warn("Could not hydrate relational state.", hydrateError?.message || hydrateError);
        });
        if (localUser?.role === "admin") {
          state.adminDataLastSyncAt = Date.now();
          state.adminDataSyncError = "";
        }
        if (["login", "signup", "forgot", "landing"].includes(state.route)) {
          const current = getCurrentUser();
          if (current) {
            const postAuthRoute = getStudentProfileCompletionRoute(current) || (current.role === "admin" ? "admin" : "dashboard");
            navigate(postAuthRoute);
            return;
          }
        }
        hydrateUserScopedSupabaseState(localUser).catch((hydrateError) => {
          console.warn("Could not hydrate user scoped data.", hydrateError?.message || hydrateError);
        });
        state.skipNextRouteAnimation = true;
        render();
        return;
      }

      if (event === "SIGNED_OUT") {
        setGoogleOAuthPendingState(false);
        const sessionCheck = await supabaseAuth.client.auth.getSession().catch(() => ({ data: { session: null } }));
        if (sessionCheck?.data?.session?.user) {
          return;
        }
        resetRelationalSyncState();
        clearAdminPresencePolling();
        clearAdminDashboardPolling();
        syncPresenceRuntime(null);
        state.adminDataRefreshing = false;
        state.adminDataLastSyncAt = 0;
        state.adminDataSyncError = "";
        state.adminPresenceLoading = false;
        state.adminPresenceError = "";
        state.adminPresenceRows = [];
        state.adminPresenceLastSyncAt = 0;
        removeStorageKey(STORAGE_KEYS.currentUserId);
        const privateRoutes = new Set([
          "complete-profile",
          "dashboard",
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
    supabaseAuth.enabled = false;
    supabaseAuth.client = null;
  }
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
  const profile = profileResult?.data || null;
  const error = profileResult?.error || null;
  if (error || !profile) {
    return { user: localUser, approvalChecked: false };
  }

  const role = String(profile.role || "student") === "admin" ? "admin" : "student";
  const profileYear = normalizeAcademicYearOrNull(profile.academic_year);
  const profileSemester = normalizeAcademicSemesterOrNull(profile.academic_semester);
  const localHasCompleteProfile = hasCompleteStudentProfile(localUser);
  const fallbackYear = localHasCompleteProfile ? normalizeAcademicYearOrNull(localUser?.academicYear) : null;
  const fallbackSemester = localHasCompleteProfile ? normalizeAcademicSemesterOrNull(localUser?.academicSemester) : null;
  const profileAuthProvider = normalizeAuthProvider(profile.auth_provider);
  const year = role === "student" ? (profileYear ?? fallbackYear) : null;
  const semester = role === "student" ? (profileSemester ?? fallbackSemester) : null;
  const normalizedEmail = String(profile.email || authUser.email || localUser?.email || "").trim().toLowerCase();
  const profilePhone = String(profile.phone || "").trim();
  const autoApprovedFromProfile = shouldAutoApproveStudentAccess({
    role,
    phone: profilePhone,
    academicYear: year,
    academicSemester: semester,
  });
  const profileHasStudentCompletion = role !== "student"
    ? true
    : profilePhone.replace(/\D/g, "").length >= 8 && Number(profile.academic_year) >= 1 && Number(profile.academic_semester) >= 1;
  const authProvider = normalizeAuthProvider(profileAuthProvider || localUser?.authProvider || getAuthProviderFromAuthUser(authUser));
  let nextProfileCompleted = role !== "student";
  if (role === "student") {
    if (typeof localUser?.profileCompleted === "boolean") {
      nextProfileCompleted = localUser.profileCompleted;
    } else if (authProvider !== "google") {
      nextProfileCompleted = profileHasStudentCompletion;
    } else {
      nextProfileCompleted = false;
    }
  }

  const updatedUser = upsertLocalUserFromAuth(authUser, {
    name: String(profile.full_name || "").trim() || localUser?.name || "Student",
    email: normalizedEmail,
    phone: profilePhone,
    role,
    academicYear: year,
    academicSemester: semester,
    isApproved: autoApprovedFromProfile ? true : Boolean(profile.approved),
    approvedAt: (autoApprovedFromProfile || profile.approved) ? localUser?.approvedAt || profile.created_at || nowISO() : null,
    approvedBy: autoApprovedFromProfile
      ? localUser?.approvedBy || AUTO_APPROVAL_ACTOR
      : profile.approved
        ? localUser?.approvedBy || "admin"
        : null,
    authProvider,
    verified: Boolean(authUser.email_confirmed_at || authUser.confirmed_at || localUser?.verified || false),
    profileCompleted: nextProfileCompleted,
  });
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
  if (shouldAutoApproveStudentAccess(user)) {
    return true;
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

function shouldAutoApproveStudentAccess(user) {
  if (!AUTO_APPROVE_STUDENT_ACCESS || !user || user.role !== "student") {
    return false;
  }
  return hasCompleteStudentProfile(user);
}

function getUserCreatedAtMs(user) {
  const rawCreatedAt = String(user?.createdAt || "").trim();
  if (!rawCreatedAt) {
    return 0;
  }
  const parsed = Date.parse(rawCreatedAt);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isStudentProfileCompletionRequired(user) {
  if (!user || user.role !== "student") {
    return false;
  }
  if (!hasSupabaseManagedIdentity(user)) {
    return false;
  }
  if (user.profileCompleted === true && hasCompleteStudentProfile(user)) {
    return false;
  }
  if (user.profileCompleted === false) {
    return true;
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

function hasSupabaseManagedIdentity(user) {
  return Boolean(getUserProfileId(user));
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
    const requestedCourses = overrideCourses.length
      ? overrideCourses
      : Array.isArray(previous?.assignedCourses)
        ? previous.assignedCourses
        : [];
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
  const nextIsApproved =
    nextRole === "admin" || shouldAutoApproveNextStudent
      ? true
      : typeof profileOverrides.isApproved === "boolean"
        ? profileOverrides.isApproved
        : typeof previous?.isApproved === "boolean"
          ? previous.isApproved
          : false;

  const hasExplicitProfileCompletionFlag = typeof profileOverrides.profileCompleted === "boolean";
  const hasLegacyProfileCompletionFlag = typeof previous?.profileCompleted === "boolean";
  let nextProfileCompleted = nextRole === "admin";
  if (nextRole === "student") {
    if (hasExplicitProfileCompletionFlag) {
      nextProfileCompleted = Boolean(profileOverrides.profileCompleted);
    } else if (hasLegacyProfileCompletionFlag) {
      nextProfileCompleted = Boolean(previous.profileCompleted);
    } else if (nextAuthProvider !== "google") {
      nextProfileCompleted = true;
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
    const { error } = await client
      .from(candidate.tableName)
      .select(candidate.storageKeyColumn)
      .limit(1);
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
  ) {
    return;
  }
  invalidateAnalyticsCache({
    resetQuestionMeta: storageKey !== STORAGE_KEYS.sessions,
  });
}

function saveLocalOnly(key, value) {
  writeStorageKey(key, value);
  invalidateAnalyticsCacheForStorageKey(key);
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
  relationalSync.profilesBackfillAttempted = false;
  relationalSync.questionsBackfillAttempted = false;
  relationalSync.readyCheckedAt = 0;
  relationalSync.readyPromise = null;
  relationalSync.lastReadyError = "";
  relationalQuestionColumnSupport.checked = false;
  relationalQuestionColumnSupport.questionImageUrl = false;
  relationalQuestionColumnSupport.explanationImageUrl = false;
  clearRelationalFlushTimer();
}

function scheduleRelationalWrite(storageKey, value) {
  if (!relationalSync.enabled || !RELATIONAL_SYNC_KEY_SET.has(storageKey)) {
    return false;
  }
  const currentUser = getCurrentUser();
  if (!currentUser?.supabaseAuthId) {
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
  if (relationalSync.flushTimer || relationalSync.flushing) {
    return true;
  }

  relationalSync.flushTimer = window.setTimeout(() => {
    flushRelationalWrites().catch((error) => {
      console.warn("Relational sync flush failed.", error);
    });
  }, 1400);

  return true;
}

async function ensureRelationalSyncReady(options = {}) {
  const force = Boolean(options?.force);
  const client = getRelationalClient();
  if (!client) {
    resetRelationalSyncState();
    relationalSync.lastReadyError = "No active Supabase session. Log in with your Supabase admin account and try again.";
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

  relationalSync.readyPromise = (async () => {
    const checks = [
      { table: "profiles", select: "id" },
      { table: "courses", select: "id" },
      { table: "course_topics", select: "id" },
      { table: "questions", select: "id" },
      { table: "question_choices", select: "id" },
      { table: "test_blocks", select: "id" },
      { table: "test_block_items", select: "block_id" },
      { table: "test_responses", select: "block_id" },
    ];

    for (const check of checks) {
      const { error } = await client.from(check.table).select(check.select).limit(1);
      if (error) {
        relationalSync.enabled = false;
        relationalSync.readyCheckedAt = Date.now();
        relationalSync.lastReadyError = error.message
          ? `Cannot access ${check.table}: ${error.message}`
          : `Cannot access ${check.table}.`;
        return false;
      }
    }

    relationalSync.enabled = true;
    relationalSync.readyCheckedAt = Date.now();
    relationalSync.lastReadyError = "";
    return true;
  })();

  try {
    return await relationalSync.readyPromise;
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
    const { data, error: existingError } = await client.from("profiles").select("id").in("id", idBatch);
    if (existingError) {
      return { ok: false, message: existingError.message || "Could not read profile rows before update." };
    }
    if (Array.isArray(data) && data.length) {
      existingRows.push(...data);
    }
  }
  const existingIds = new Set((existingRows || []).map((row) => row.id).filter((id) => isUuidValue(id)));
  const missingIds = ids.filter((id) => !existingIds.has(id));
  const targetIds = ids.filter((id) => existingIds.has(id));
  if (!targetIds.length) {
    return {
      ok: false,
      message: "No matching database profiles found for selected users.",
      updatedIds: [],
      skippedIds: [...missingIds],
      missingIds,
    };
  }

  const updatedRows = [];
  for (const targetBatch of splitIntoBatches(targetIds, RELATIONAL_UPSERT_BATCH_SIZE)) {
    const { data, error } = await client
      .from("profiles")
      .update({ approved: targetApproved })
      .in("id", targetBatch)
      .select("id,approved");
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
      const { data, error: verifyError } = await client
        .from("profiles")
        .select("id,approved")
        .in("id", unresolvedBatch);
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
  const skippedIds = [...new Set([...missingIds, ...unresolvedIds])];
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
  if (!supabaseSync.enabled) {
    return;
  }

  const users = Array.isArray(usersPayload) ? usersPayload : getUsers();
  try {
    scheduleSupabaseWrite(STORAGE_KEYS.users, users);
    await flushSupabaseWrites();
  } catch (error) {
    console.warn("Users backup sync failed.", error?.message || error);
  }
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

  const { error } = await client.from("profiles").delete().eq("id", profileId);
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
  if (!current?.supabaseAuthId) {
    return;
  }

  await hydrateRelationalCoursesAndTopics();
  await hydrateRelationalProfiles(current);
  await hydrateRelationalQuestions();
  await hydrateRelationalSessions(current);
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
      return enrollmentMap;
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
  let enrollmentLookupFailed = false;
  try {
    const enrollmentSnapshot = await fetchEnrollmentCourseMapForUsers(profileRows.map((profile) => profile.id));
    enrollmentCourseMap = enrollmentSnapshot?.coursesByUser || {};
    enrollmentTermMap = enrollmentSnapshot?.termByUser || {};
  } catch (enrollmentError) {
    enrollmentLookupFailed = true;
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
    const existingHasCompleteProfile = hasCompleteStudentProfile(existing);
    const existingYear = existingHasCompleteProfile ? normalizeAcademicYearOrNull(existing?.academicYear) : null;
    const existingSemester = existingHasCompleteProfile ? normalizeAcademicSemesterOrNull(existing?.academicSemester) : null;
    const profileYear = normalizeAcademicYearOrNull(profile.academic_year);
    const profileSemester = normalizeAcademicSemesterOrNull(profile.academic_semester);
    const profilePhone = String(profile.phone || "").trim();
    const existingPhone = String(existing?.phone || "").trim();
    const resolvedPhone = profilePhone || existingPhone;
    const existingAssignedCourses = role === "student"
      ? sanitizeCourseAssignments(existing?.assignedCourses || [])
      : [];
    const hasEnrollmentEntry = Object.prototype.hasOwnProperty.call(enrollmentCourseMap, profile.id);
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
    const year = role === "student"
      ? (profileYear ?? inferredEnrollmentYear ?? inferredCourseYear ?? existingYear)
      : null;
    const semester = role === "student"
      ? (profileSemester ?? inferredEnrollmentSemester ?? inferredCourseSemester ?? existingSemester)
      : null;
    const defaultCourses = role === "student" && year !== null && semester !== null
      ? getCurriculumCourses(year, semester)
      : [];
    const assignedCourses = role !== "student"
      ? [...allCourses]
      : enrolledCourses.length
        ? enrolledCourses
        : (existingAssignedCourses.length && (enrollmentLookupFailed || !hasEnrollmentEntry))
          ? existingAssignedCourses
          : defaultCourses;
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
        const missingYearSemester = profileYear === null || profileSemester === null;
        const missingPhone = !validateAndNormalizePhoneNumber(profilePhone).ok;
        if (!missingYearSemester && !missingPhone) {
          return null;
        }
        const mappedEntry = mappedByAuthId.get(String(profile.id || "").trim());
        if (!mappedEntry) {
          return null;
        }
        const mappedYear = normalizeAcademicYearOrNull(mappedEntry.academicYear);
        const mappedSemester = normalizeAcademicSemesterOrNull(mappedEntry.academicSemester);
        const mappedPhone = String(mappedEntry.phone || "").trim();
        const mappedPhoneValid = validateAndNormalizePhoneNumber(mappedPhone).ok;
        const canBackfillYearSemester = mappedYear !== null && mappedSemester !== null;
        const canBackfillPhone = mappedPhoneValid;
        if (!((missingYearSemester && canBackfillYearSemester) || (missingPhone && canBackfillPhone))) {
          return null;
        }
        return {
          ...mappedEntry,
          academicYear: canBackfillYearSemester ? mappedYear : profileYear,
          academicSemester: canBackfillYearSemester ? mappedSemester : profileSemester,
          phone: canBackfillPhone ? mappedPhone : profilePhone,
        };
      })
      .filter(Boolean);
    if (backfillCandidates.length) {
      await syncProfilesToRelational(backfillCandidates).catch((error) => {
        console.warn("Could not backfill missing student profile fields.", error?.message || error);
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
}

async function hydrateRelationalQuestions() {
  const client = getRelationalClient();
  if (!client || !relationalSync.enabled) {
    return;
  }

  const users = getUsers();
  const localQuestionsBefore = getQuestions();
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
    ...(questionColumnSupport.questionImageUrl ? ["question_image_url"] : []),
    ...(questionColumnSupport.explanationImageUrl ? ["explanation_image_url"] : []),
  ].join(",");

  let questionsResult = await fetchRowsPaged((from, to) => (
    client
      .from("questions")
      .select(questionSelectColumns)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to)
  ));
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
        const retryResult = await fetchRowsPaged((from, to) => (
          client
            .from("questions")
            .select(questionSelectColumns)
            .order("created_at", { ascending: true })
            .order("id", { ascending: true })
            .range(from, to)
        ));
        if (!retryResult.error && Array.isArray(retryResult.data) && retryResult.data.length) {
          questionsResult = retryResult;
        } else {
          return;
        }
      } catch (syncError) {
        console.warn("Questions backfill failed.", syncError?.message || syncError);
        return;
      }
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

  const mappedQuestions = (questionRows || []).map((question) => {
    const externalId = String(question.external_id || question.id || "").trim();
    const existingQuestion = localQuestionByExternalId[externalId] || localQuestionByDbId[String(question.id || "").trim()] || null;
    const courseName = courseById[question.course_id] || CURRICULUM_COURSE_LIST[0] || "Course";
    const topicName = topicById[question.topic_id] || resolveDefaultTopic(courseName);
    const rawChoices = (choicesByQuestionId[question.id] || [])
      .sort((a, b) => String(a.choice_label).localeCompare(String(b.choice_label)));
    const choices = rawChoices
      .map((choice) => ({
        id: String(choice.choice_label || "").toUpperCase(),
        text: String(choice.choice_text || "").trim(),
      }))
      .filter((choice) => choice.id && choice.text);
    const correct = rawChoices
      .filter((choice) => Boolean(choice.is_correct))
      .map((choice) => String(choice.choice_label || "").toUpperCase());
    const questionImageFromDb = questionColumnSupport.questionImageUrl
      ? String(question.question_image_url || "").trim()
      : "";
    const explanationImageFromDb = questionColumnSupport.explanationImageUrl
      ? String(question.explanation_image_url || "").trim()
      : "";

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
      choices: choices.length ? choices : [{ id: "A", text: "Option A" }, { id: "B", text: "Option B" }],
      correct: correct.length ? correct : ["A"],
      explanation: String(question.explanation || "").trim(),
      objective: String(question.objective || "").trim(),
      references: "",
      questionImage: questionImageFromDb || String(existingQuestion?.questionImage || "").trim(),
      explanationImage: explanationImageFromDb || String(existingQuestion?.explanationImage || "").trim(),
      status: toRelationalQuestionStatus(question.status),
    };
  });

  saveLocalOnly(STORAGE_KEYS.questions, mappedQuestions);
}

async function hydrateRelationalSessions(currentUser) {
  const client = getRelationalClient();
  if (!client || !relationalSync.enabled || !currentUser?.supabaseAuthId) {
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
      query = query.eq("user_id", currentUser.supabaseAuthId);
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
  const parseUpdatedAtMs = (value) => {
    const ms = new Date(value || 0).getTime();
    return Number.isFinite(ms) ? ms : 0;
  };

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

    const localUpdatedAtMs = parseUpdatedAtMs(localSession.updatedAt);
    const remoteUpdatedAtMs = parseUpdatedAtMs(remoteSession.updatedAt);
    const localIsActiveSession = (
      state.route === "session"
      && String(state.sessionId || "") === sessionId
      && String(localSession.status || "") === "in_progress"
    );
    const preferLocal = localIsActiveSession
      || localUpdatedAtMs > remoteUpdatedAtMs
      || (
        localUpdatedAtMs === remoteUpdatedAtMs
        && String(localSession.status || "") === "in_progress"
        && String(remoteSession.status || "") === "in_progress"
      );

    mergedSessionById.set(
      sessionId,
      preferLocal ? { ...remoteSession, ...localSession } : { ...localSession, ...remoteSession },
    );
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

  const { data, error } = await supabaseSync.client
    .from(supabaseSync.tableName)
    .select(`${supabaseSync.storageKeyColumn},payload,updated_at`)
    .in(supabaseSync.storageKeyColumn, remoteKeys);

  if (error) {
    return { hadRemoteData: false, error };
  }

  const rows = Array.isArray(data) ? data : [];
  let hadRemoteData = false;
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
    try {
      const payload = sanitizeUserScopedPayload(storageKey, selectedRow.payload);
      writeStorageKey(storageKey, payload);
    } catch {
      // Ignore malformed remote payloads and keep local fallback.
    }
  });

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

function scheduleSupabaseWrite(storageKey, value) {
  if (!supabaseSync.enabled || !SYNCABLE_STORAGE_KEYS.includes(storageKey)) {
    return;
  }

  const currentUser = getCurrentUser();
  const scope = getSyncScopeForUser(currentUser);
  const remoteKey = buildRemoteSyncKey(storageKey, scope);
  if (!remoteKey) {
    return;
  }

  const payload = sanitizeUserScopedPayload(storageKey, value, currentUser);
  supabaseSync.pendingWrites.set(remoteKey, { storageKey, payload });
  if (supabaseSync.flushTimer) {
    return;
  }

  supabaseSync.flushTimer = window.setTimeout(() => {
    flushSupabaseWrites().catch((error) => {
      console.warn("Supabase write flush failed.", error);
    });
  }, 1200);
}

function scheduleFullSupabaseSync(options = {}) {
  const includeUserScoped = Boolean(options?.includeUserScoped);
  const currentUser = options?.user || getCurrentUser();
  const scope = options?.scope || getSyncScopeForUser(currentUser);
  const keys = includeUserScoped ? [...GLOBAL_SYNC_KEYS, ...USER_SCOPED_SYNC_KEYS] : GLOBAL_SYNC_KEYS;

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
    !supabaseSync.pendingWrites.size
  ) {
    clearSupabaseFlushTimer();
    return;
  }

  const rows = Array.from(supabaseSync.pendingWrites.entries()).map(([remoteStorageKey, pending]) => ({
    [supabaseSync.storageKeyColumn]: remoteStorageKey,
    payload: pending.payload,
    updated_at: nowISO(),
  }));
  supabaseSync.pendingWrites.clear();
  clearSupabaseFlushTimer();

  const { error } = await supabaseSync.client
    .from(supabaseSync.tableName)
    .upsert(rows, { onConflict: supabaseSync.storageKeyColumn });
  if (error) {
    console.warn("Supabase sync error:", error.message);
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
    if (!supabaseSync.flushTimer) {
      supabaseSync.flushTimer = window.setTimeout(() => {
        flushSupabaseWrites().catch((flushError) => {
          console.warn("Supabase retry failed.", flushError);
        });
      }, 3000);
    }
  }
}

function clearSupabaseFlushTimer() {
  if (supabaseSync.flushTimer) {
    window.clearTimeout(supabaseSync.flushTimer);
    supabaseSync.flushTimer = null;
  }
}

async function flushRelationalWrites(options = {}) {
  const throwOnFailure = Boolean(options?.throwOnFailure);
  if (!relationalSync.enabled || !relationalSync.pendingWrites.size || relationalSync.flushing) {
    clearRelationalFlushTimer();
    return;
  }

  clearRelationalFlushTimer();
  relationalSync.flushing = true;
  const entries = Array.from(relationalSync.pendingWrites.entries());
  relationalSync.pendingWrites.clear();
  let firstError = null;

  for (const [storageKey, payload] of entries) {
    try {
      await syncRelationalKey(storageKey, payload);
    } catch (error) {
      console.warn(`Relational sync failed for ${storageKey}.`, error?.message || error);
      relationalSync.pendingWrites.set(storageKey, payload);
      if (!firstError) {
        firstError = error instanceof Error ? error : new Error(getErrorMessage(error, "Relational sync failed."));
      }
    }
  }

  relationalSync.flushing = false;
  if (relationalSync.pendingWrites.size && !relationalSync.flushTimer) {
    relationalSync.flushTimer = window.setTimeout(() => {
      flushRelationalWrites().catch((error) => {
        console.warn("Relational retry flush failed.", error);
      });
    }, 2800);
  }

  if (firstError && throwOnFailure) {
    throw firstError;
  }
}

async function flushPendingSyncNow(options = {}) {
  const throwOnRelationalFailure = options?.throwOnRelationalFailure !== false;
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
    const { data, error } = await fetchPage(from, from + pageSize - 1);
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

async function getRelationalQuestionColumnSupport(client) {
  if (relationalQuestionColumnSupport.checked) {
    return relationalQuestionColumnSupport;
  }
  if (!client) {
    return relationalQuestionColumnSupport;
  }

  const checkColumn = async (columnName) => {
    const { error } = await client.from("questions").select(columnName).limit(1);
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

  const client = getRelationalClient() || getSupabaseAuthClient();
  if (!client) {
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
    if (file.size <= QUESTION_IMAGE_DATA_URL_FALLBACK_MAX_BYTES) {
      try {
        const fallbackDataUrl = await convertFileToDataUrl(file);
        if (fallbackDataUrl) {
          return {
            ok: true,
            url: fallbackDataUrl,
            usedFallback: true,
            message: "Storage upload failed, so the image was saved inline.",
          };
        }
      } catch {
        // Continue with storage error below.
      }
    }
    return {
      ok: false,
      message: uploadError.message || "Could not upload question image.",
    };
  }

  const { data: signedData, error: signedError } = await client.storage
    .from(bucket)
    .createSignedUrl(filePath, 60 * 60 * 24 * 365 * 5);
  if (!signedError && signedData?.signedUrl) {
    return { ok: true, url: signedData.signedUrl };
  }

  const { data: publicData } = client.storage.from(bucket).getPublicUrl(filePath);
  const publicUrl = String(publicData?.publicUrl || "").trim();
  if (publicUrl) {
    return { ok: true, url: publicUrl };
  }

  return {
    ok: false,
    message: "Image uploaded, but the app could not generate a usable URL.",
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
    const curriculum = storageKey === STORAGE_KEYS.curriculum ? payload : load(STORAGE_KEYS.curriculum, O6U_CURRICULUM);
    const topics = storageKey === STORAGE_KEYS.courseTopics ? payload : load(STORAGE_KEYS.courseTopics, COURSE_TOPIC_OVERRIDES);
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
      if (isAdminSync) {
        baseRow.approved = Boolean(isUserAccessApproved(user));
      }
      return baseRow;
    })
    .filter(Boolean);
  if (!rows.length) {
    return;
  }

  for (const rowBatch of splitIntoBatches(rows, RELATIONAL_UPSERT_BATCH_SIZE)) {
    const { error } = await client.from("profiles").upsert(rowBatch, { onConflict: "id" });
    if (error) {
      throw error;
    }
  }

  if (isAdminSync) {
    await syncUserCourseEnrollmentsToRelational(users, {
      assignedByAuthId: isUuidValue(getCurrentUser()?.supabaseAuthId) ? getCurrentUser().supabaseAuthId : null,
    });
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
    const { data: courses, error: coursesError } = await client
      .from("courses")
      .select("id,course_name")
      .eq("is_active", true);
    if (coursesError) {
      throw coursesError;
    }

    const courseIdByName = Object.fromEntries(
      (courses || [])
        .map((course) => [String(course?.course_name || "").trim(), String(course?.id || "").trim()])
        .filter(([courseName, courseId]) => courseName && isUuidValue(courseId)),
    );

    const enrollmentRows = [];
    const desiredCourseIdsByUserId = new Map();
    students.forEach((student) => {
      const userId = getUserProfileId(student);
      const selectedCourses = sanitizeCourseAssignments(
        (student.assignedCourses || []).length
          ? student.assignedCourses
          : getCurriculumCourses(student.academicYear || 1, student.academicSemester || 1),
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
      const { error: upsertEnrollmentError } = await client
        .from("user_course_enrollments")
        .upsert(batch, { onConflict: "user_id,course_id" });
      if (upsertEnrollmentError) {
        throw upsertEnrollmentError;
      }
    }

    const userIds = [...new Set(students.map((student) => getUserProfileId(student)).filter(isUuidValue))];
    const existingEnrollmentRows = [];
    for (const userBatch of splitIntoBatches(userIds, RELATIONAL_IN_BATCH_SIZE)) {
      const { data, error } = await client
        .from("user_course_enrollments")
        .select("user_id,course_id")
        .in("user_id", userBatch);
      if (error) {
        throw error;
      }
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
        const { error: deleteError } = await client
          .from("user_course_enrollments")
          .delete()
          .eq("user_id", userId)
          .in("course_id", courseBatch);
        if (deleteError) {
          throw deleteError;
        }
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
      const { error: upsertCoursesError } = await client
        .from("courses")
        .upsert(courseBatch, { onConflict: "course_name,academic_year,academic_semester" });
      if (upsertCoursesError) {
        throw upsertCoursesError;
      }
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
    const { error: deactivateCoursesError } = await client
      .from("courses")
      .update({ is_active: false })
      .in("id", deactivateBatch);
    if (deactivateCoursesError) {
      throw deactivateCoursesError;
    }
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
      const { error: upsertTopicsError } = await client
        .from("course_topics")
        .upsert(topicBatch, { onConflict: "course_id,topic_name" });
      if (upsertTopicsError) {
        throw upsertTopicsError;
      }
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
    const { error: deactivateTopicsError } = await client
      .from("course_topics")
      .update({ is_active: false })
      .in("id", deactivateBatch);
    if (deactivateTopicsError) {
      throw deactivateTopicsError;
    }
  }
}

async function deleteRelationalQuestionsAndDependents(client, questionIds) {
  const ids = [...new Set((Array.isArray(questionIds) ? questionIds : []).map((id) => String(id || "").trim()).filter(isUuidValue))];
  if (!ids.length) {
    return;
  }

  for (const idBatch of splitIntoBatches(ids, RELATIONAL_DELETE_BATCH_SIZE)) {
    const { error: deleteChoicesError } = await client
      .from("question_choices")
      .delete()
      .in("question_id", idBatch);
    if (deleteChoicesError) {
      throw deleteChoicesError;
    }
  }

  for (const idBatch of splitIntoBatches(ids, RELATIONAL_DELETE_BATCH_SIZE)) {
    const { error: deleteResponsesError } = await client
      .from("test_responses")
      .delete()
      .in("question_id", idBatch);
    if (deleteResponsesError) {
      throw deleteResponsesError;
    }
  }

  for (const idBatch of splitIntoBatches(ids, RELATIONAL_DELETE_BATCH_SIZE)) {
    const { error: deleteItemsError } = await client
      .from("test_block_items")
      .delete()
      .in("question_id", idBatch);
    if (deleteItemsError) {
      throw deleteItemsError;
    }
  }

  for (const idBatch of splitIntoBatches(ids, RELATIONAL_DELETE_BATCH_SIZE)) {
    const { error: deleteQuestionsError } = await client
      .from("questions")
      .delete()
      .in("id", idBatch);
    if (deleteQuestionsError) {
      throw deleteQuestionsError;
    }
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

  const questions = Array.isArray(questionsPayload) ? questionsPayload : [];
  const payloadExternalIds = [...new Set(
    questions
      .map((question) => String(question?.id || "").trim())
      .filter(Boolean),
  )];
  const existingByExternalId = {};
  for (const externalIdBatch of splitIntoBatches(payloadExternalIds, RELATIONAL_IN_BATCH_SIZE)) {
    const { data: existingRows, error: existingRowsError } = await client
      .from("questions")
      .select("id,external_id")
      .in("external_id", externalIdBatch);
    if (existingRowsError) {
      throw existingRowsError;
    }
    (existingRows || []).forEach((row) => {
      const externalId = String(row?.external_id || "").trim();
      if (!externalId || !isUuidValue(row?.id)) {
        return;
      }
      existingByExternalId[externalId] = row.id;
    });
  }

  const coursesResult = await fetchRowsPaged((from, to) => (
    client
      .from("courses")
      .select("id,course_name,is_active")
      .eq("is_active", true)
      .order("course_name", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to)
  ));
  if (coursesResult.error) throw coursesResult.error;
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
  if (topicsResult.error) throw topicsResult.error;
  const courses = Array.isArray(coursesResult.data) ? coursesResult.data : [];
  const topics = Array.isArray(topicsResult.data) ? topicsResult.data : [];
  let questionColumnSupport = relationalQuestionColumnSupport;
  try {
    questionColumnSupport = await getRelationalQuestionColumnSupport(client);
  } catch (error) {
    console.warn("Could not detect optional question media columns for sync.", error?.message || error);
  }

  const courseIdByName = Object.fromEntries((courses || []).map((course) => [course.course_name, course.id]));
  const topicIdByCourseTopic = {};
  (topics || []).forEach((topic) => {
    topicIdByCourseTopic[`${topic.course_id}::${topic.topic_name}`] = topic.id;
  });

  const missingTopics = [];
  questions.forEach((question) => {
    const meta = getQbankCourseTopicMeta(question);
    const courseId = courseIdByName[meta.course];
    if (!courseId) return;
    const key = `${courseId}::${meta.topic}`;
    if (!topicIdByCourseTopic[key]) {
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
      const { error: missingTopicsError } = await client
        .from("course_topics")
        .upsert(topicBatch, { onConflict: "course_id,topic_name" });
      if (missingTopicsError) {
        throw missingTopicsError;
      }
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
    Object.keys(topicIdByCourseTopic).forEach((key) => {
      delete topicIdByCourseTopic[key];
    });
    (refreshedTopics.data || []).forEach((topic) => {
      topicIdByCourseTopic[`${topic.course_id}::${topic.topic_name}`] = topic.id;
    });
  }

  const upsertRows = [];
  questions.forEach((question) => {
    const meta = getQbankCourseTopicMeta(question);
    const externalId = String(question.id || "").trim();
    if (!externalId) return;
    const courseId = courseIdByName[meta.course];
    if (!courseId) return;
    let topicId = topicIdByCourseTopic[`${courseId}::${meta.topic}`];
    if (!topicId) return;
    const stableDbId =
      existingByExternalId[externalId]
      || crypto.randomUUID();
    upsertRows.push({
      id: stableDbId,
      external_id: externalId,
      course_id: courseId,
      topic_id: topicId,
      author_id: isUuidValue(currentUser.supabaseAuthId) ? currentUser.supabaseAuthId : null,
      stem: String(question.stem || "").trim(),
      explanation: String(question.explanation || "").trim() || "No explanation provided.",
      objective: String(question.objective || "").trim() || null,
      ...(questionColumnSupport.questionImageUrl
        ? { question_image_url: String(question.questionImage || "").trim() || null }
        : {}),
      ...(questionColumnSupport.explanationImageUrl
        ? { explanation_image_url: String(question.explanationImage || "").trim() || null }
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

  if (!upsertRows.length) {
    throw new Error(
      "Could not map imported questions to database courses/topics. Questions were kept locally; database sync was skipped to prevent data loss.",
    );
  }

  for (const upsertBatch of splitIntoBatches(upsertRows, RELATIONAL_UPSERT_BATCH_SIZE)) {
    const { error: questionsUpsertError } = await client.from("questions").upsert(upsertBatch, { onConflict: "external_id" });
    if (questionsUpsertError) {
      throw questionsUpsertError;
    }
  }

  const externalIds = upsertRows.map((row) => row.external_id).filter(Boolean);
  const persistedQuestions = [];
  for (const externalIdBatch of splitIntoBatches(externalIds, RELATIONAL_IN_BATCH_SIZE)) {
    const { data: persistedBatch, error: persistedQuestionsError } = await client
      .from("questions")
      .select("id,external_id")
      .in("external_id", externalIdBatch);
    if (persistedQuestionsError) {
      throw persistedQuestionsError;
    }
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

  const questionDbIds = Object.values(dbIdByExternalId)
    .map((entry) => String(entry || "").trim())
    .filter(isUuidValue);
  for (const questionIdBatch of splitIntoBatches(questionDbIds, RELATIONAL_DELETE_BATCH_SIZE)) {
    const { error: deleteChoicesError } = await client
      .from("question_choices")
      .delete()
      .in("question_id", questionIdBatch);
    if (deleteChoicesError) {
      throw deleteChoicesError;
    }
  }

  const buildChoiceRows = (sourceQuestions, idMap) => {
    const rows = [];
    sourceQuestions.forEach((question) => {
      const dbId = String(idMap[question.id] || "").trim();
      if (!isUuidValue(dbId)) {
        return;
      }
      const correct = new Set(Array.isArray(question.correct) ? question.correct.map((entry) => String(entry).toUpperCase()) : []);
      (question.choices || []).forEach((choice) => {
        const label = String(choice.id || "").toUpperCase();
        const text = String(choice.text || "").trim();
        if (!label || !text) {
          return;
        }
        rows.push({
          question_id: dbId,
          choice_label: label,
          choice_text: text,
          is_correct: correct.has(label),
        });
      });
    });
    return rows;
  };

  const insertChoiceRows = async (rows) => {
    for (const choiceBatch of splitIntoBatches(rows, RELATIONAL_INSERT_BATCH_SIZE)) {
      const { error: insertChoicesError } = await client.from("question_choices").insert(choiceBatch);
      if (insertChoicesError) {
        throw insertChoicesError;
      }
    }
  };

  let choiceRows = buildChoiceRows(updatedLocalQuestions, dbIdByExternalId);
  try {
    await insertChoiceRows(choiceRows);
  } catch (error) {
    if (!isQuestionChoiceForeignKeyError(error)) {
      throw error;
    }

    const refreshedPersistedQuestions = [];
    for (const externalIdBatch of splitIntoBatches(externalIds, RELATIONAL_IN_BATCH_SIZE)) {
      const { data: persistedBatch, error: persistedQuestionsError } = await client
        .from("questions")
        .select("id,external_id")
        .in("external_id", externalIdBatch);
      if (persistedQuestionsError) {
        throw persistedQuestionsError;
      }
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

    const refreshedQuestionDbIds = Object.values(refreshedDbIdByExternalId)
      .map((entry) => String(entry || "").trim())
      .filter(isUuidValue);
    for (const questionIdBatch of splitIntoBatches(refreshedQuestionDbIds, RELATIONAL_DELETE_BATCH_SIZE)) {
      const { error: deleteChoicesError } = await client
        .from("question_choices")
        .delete()
        .in("question_id", questionIdBatch);
      if (deleteChoicesError) {
        throw deleteChoicesError;
      }
    }

    choiceRows = buildChoiceRows(refreshedLocalQuestions, refreshedDbIdByExternalId);
    await insertChoiceRows(choiceRows);
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

  await flushPendingSyncNow({ throwOnRelationalFailure: false }).catch(() => {});

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

  scheduleSupabaseWrite(STORAGE_KEYS.questions, questions);
  try {
    await flushSupabaseWrites();
  } catch (syncError) {
    console.warn("Legacy sync backup failed for imported questions.", syncError?.message || syncError);
  }

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

  const upsertBlocks = ownedSessions.map((session) => ({
    ...(isUuidValue(session.dbId) ? { id: session.dbId } : {}),
    external_id: String(session.id || "").trim(),
    user_id: authIdByLocalUserId[session.userId],
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
    const { error: blocksUpsertError } = await client.from("test_blocks").upsert(blockBatch, { onConflict: "external_id" });
    if (blocksUpsertError) {
      throw blocksUpsertError;
    }
  }

  const externalIds = upsertBlocks.map((entry) => entry.external_id).filter(Boolean);
  const persistedBlocks = [];
  for (const externalIdBatch of splitIntoBatches(externalIds, RELATIONAL_IN_BATCH_SIZE)) {
    const { data, error: persistedBlocksError } = await client
      .from("test_blocks")
      .select("id,external_id")
      .in("external_id", externalIdBatch);
    if (persistedBlocksError) {
      throw persistedBlocksError;
    }
    if (Array.isArray(data) && data.length) {
      persistedBlocks.push(...data);
    }
  }
  const blockIdByExternalId = Object.fromEntries((persistedBlocks || []).map((entry) => [entry.external_id, entry.id]));
  const blockIds = Object.values(blockIdByExternalId);

  for (const blockIdBatch of splitIntoBatches(blockIds, RELATIONAL_DELETE_BATCH_SIZE)) {
    const { error: responsesDeleteError } = await client.from("test_responses").delete().in("block_id", blockIdBatch);
    if (responsesDeleteError) {
      throw responsesDeleteError;
    }
    const { error: itemsDeleteError } = await client.from("test_block_items").delete().in("block_id", blockIdBatch);
    if (itemsDeleteError) {
      throw itemsDeleteError;
    }
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
      const { error: itemsInsertError } = await client.from("test_block_items").insert(itemBatch);
      if (itemsInsertError) {
        throw itemsInsertError;
      }
    }
  }
  if (responseRows.length) {
    for (const responseBatch of splitIntoBatches(responseRows, RELATIONAL_INSERT_BATCH_SIZE)) {
      const { error: responsesInsertError } = await client.from("test_responses").insert(responseBatch);
      if (responsesInsertError) {
        throw responsesInsertError;
      }
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
  rebuildCurriculumCatalog();
  save(STORAGE_KEYS.courseTopics, COURSE_TOPIC_OVERRIDES);

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
        phone: "",
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
        : shouldAutoApproveStudentAccess(user)
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
        const normalizedYear = normalizeAcademicYearOrNull(user.academicYear);
        const normalizedSemester = normalizeAcademicSemesterOrNull(user.academicSemester);

        if (user.academicYear !== normalizedYear) {
          user.academicYear = normalizedYear;
          changed = true;
        }
        if (user.academicSemester !== normalizedSemester) {
          user.academicSemester = normalizedSemester;
          changed = true;
        }
        if (normalizedYear !== null && normalizedSemester !== null) {
          const semesterCourses = getCurriculumCourses(normalizedYear, normalizedSemester);
          if ((user.assignedCourses || []).join("|") !== semesterCourses.join("|")) {
            user.assignedCourses = semesterCourses;
            changed = true;
          }
        } else {
          const normalizedCourses = sanitizeCourseAssignments(user.assignedCourses || []);
          if ((user.assignedCourses || []).join("|") !== normalizedCourses.join("|")) {
            user.assignedCourses = normalizedCourses;
            changed = true;
          }
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
}

function bindGlobalEvents() {
  if (globalEventsBound) {
    return;
  }
  globalEventsBound = true;

  document.body.addEventListener("click", (event) => {
    const navTarget = event.target.closest("[data-nav]");
    if (navTarget) {
      const route = navTarget.getAttribute("data-nav");
      navigate(route);
      return;
    }

    const actionTarget = event.target.closest("[data-action]");
    if (!actionTarget) {
      return;
    }

    const action = actionTarget.getAttribute("data-action");
    if (action === "logout") {
      logout();
    }

    if (action === "quick-login-admin") {
      loginAsDemo(DEMO_ADMIN_EMAIL, "admin123");
    }

    if (action === "quick-login-student") {
      loginAsDemo(DEMO_STUDENT_EMAIL, "student123");
    }
  });

  window.addEventListener("pagehide", () => {
    markCurrentUserOffline().catch(() => {});
    syncPresenceRuntime(null);
    clearAdminPresencePolling();
    clearAdminDashboardPolling();
  });
}

function navigate(route, extras = {}) {
  const nextRoute = String(route || "").trim().toLowerCase();
  const targetRoute = nextRoute || "landing";
  const canUseViewTransition = typeof document.startViewTransition === "function";
  const shouldUseViewTransition = canUseViewTransition && targetRoute !== state.route;

  const applyNavigation = () => {
    if (targetRoute !== "session") {
      state.sessionPanel = null;
      state.sessionMarkerEnabled = false;
      state.calcExpression = "";
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
    state.sessionMarkerEnabled = false;
    state.calcExpression = "";
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
    if (!currentUser || currentUser.role !== "admin" || state.route !== "admin" || state.adminPage !== "dashboard") {
      clearAdminDashboardPolling();
      return;
    }
    if (state.adminDataRefreshing) {
      return;
    }
    refreshAdminDataSnapshot(currentUser, { force: true, surfaceErrors: false })
      .then((ok) => {
        if (!ok) {
          return;
        }
        if (state.route !== "admin" || state.adminPage !== "dashboard") {
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
  if (!currentUser?.supabaseAuthId || !isUuidValue(currentUser.supabaseAuthId)) {
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
  if (!currentUser?.supabaseAuthId || !isUuidValue(currentUser.supabaseAuthId)) {
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

function syncPresenceRuntime(user) {
  if (!user?.supabaseAuthId || !isUuidValue(user.supabaseAuthId)) {
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
  if (!force && state.adminPresenceLastSyncAt && (Date.now() - state.adminPresenceLastSyncAt) < ADMIN_DATA_REFRESH_MS) {
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
      .order("last_seen_at", { ascending: false })
      .limit(200);
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

function shouldRefreshStudentData(user) {
  if (!user || user.role !== "student") {
    return false;
  }
  if (state.studentDataRefreshing) {
    return false;
  }
  const last = Number(state.studentDataLastSyncAt || 0);
  return !last || (Date.now() - last) > STUDENT_DATA_REFRESH_MS;
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
      state.studentDataLastSyncAt = Date.now();
      return false;
    }
    const now = Date.now();
    const needsFullSync = force
      || !state.studentDataLastFullSyncAt
      || (now - state.studentDataLastFullSyncAt) > STUDENT_FULL_DATA_REFRESH_MS;
    if (needsFullSync) {
      await hydrateRelationalCoursesAndTopics();
      await hydrateRelationalProfiles(user);
      await hydrateRelationalQuestions();
      state.studentDataLastFullSyncAt = now;
    }
    await hydrateRelationalSessions(user);
    state.studentDataLastSyncAt = Date.now();
    if (
      rerender
      && (routeBefore === "dashboard" || routeBefore === "analytics")
      && state.route === routeBefore
    ) {
      shouldRerenderRoute = routeBefore;
    }
    return true;
  } catch (error) {
    state.studentDataLastSyncAt = Date.now();
    console.warn("Student data refresh failed.", error?.message || error);
    return false;
  } finally {
    state.studentDataRefreshing = false;
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
      .then(() => {})
      .catch((error) => {
        console.warn("Admin presence refresh failed.", error?.message || error);
      });
  }, ADMIN_DATA_REFRESH_MS);
}

function shouldRefreshAdminData(user) {
  if (!user || user.role !== "admin") {
    return false;
  }
  if (state.adminDataRefreshing) {
    return false;
  }
  const last = Number(state.adminDataLastSyncAt || 0);
  return !last || (Date.now() - last) > ADMIN_DATA_REFRESH_MS;
}

async function refreshAdminDataSnapshot(user, options = {}) {
  if (!user || user.role !== "admin") {
    return false;
  }
  const force = Boolean(options?.force);
  const surfaceErrors = options?.surfaceErrors !== false;
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
      if (surfaceErrors || !state.adminDataLastSyncAt) {
        state.adminDataSyncError = String(relationalSync.lastReadyError || "Relational sync is unavailable.");
      }
      state.adminDataLastSyncAt = Date.now();
      return false;
    }
    await hydrateRelationalCoursesAndTopics();
    await hydrateRelationalProfiles(user);
    await hydrateRelationalQuestions();
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

function render() {
  document.body.classList.remove("no-panel-animations");
  clearTimer();
  appEl.removeEventListener("click", handleSessionClick);
  appEl.removeEventListener("click", handleReviewClick);
  document.removeEventListener("keydown", handleSessionKeydown);
  document.removeEventListener("keydown", handleReviewKeydown);

  const user = getCurrentUser();
  if (!user || user.role !== "admin") {
    state.adminDataRefreshing = false;
    state.adminDataLastSyncAt = 0;
    state.adminDataSyncError = "";
    state.adminPresenceLoading = false;
    state.adminPresenceError = "";
    state.adminPresenceRows = [];
    state.adminPresenceLastSyncAt = 0;
    clearAdminPresencePolling();
    clearAdminDashboardPolling();
  }
  if (!user || user.role !== "student") {
    state.studentDataRefreshing = false;
    state.studentDataLastSyncAt = 0;
    state.studentDataLastFullSyncAt = 0;
  }
  syncPresenceRuntime(user);
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

  const privateRoutes = [
    "complete-profile",
    "dashboard",
    "create-test",
    "qbank",
    "builder",
    "session",
    "review",
    "analytics",
    "profile",
    "admin",
  ];
  const authEntryRoutes = new Set(["landing", "features", "pricing", "about", "contact", "login", "signup", "forgot"]);
  const studentProfileCompletionRoute = getStudentProfileCompletionRoute(user);
  const googleSignupOnboarding = studentProfileCompletionRoute === "signup";

  if (privateRoutes.includes(state.route) && !user) {
    state.route = "login";
  }

  if (studentProfileCompletionRoute && state.route !== studentProfileCompletionRoute) {
    state.route = studentProfileCompletionRoute;
  }

  if (user && state.route === "complete-profile" && studentProfileCompletionRoute !== "complete-profile") {
    state.route = user.role === "admin" ? "admin" : "dashboard";
  }

  if (
    privateRoutes.includes(state.route)
    && user
    && !isUserAccessApproved(user)
    && !hasSupabaseManagedIdentity(user)
  ) {
    removeStorageKey(STORAGE_KEYS.currentUserId);
    state.route = "login";
    toast("Your account is pending admin approval.");
  }

  if (user && authEntryRoutes.has(state.route) && !(state.route === "signup" && googleSignupOnboarding)) {
    state.route = user.role === "admin" ? "admin" : "dashboard";
  }

  if (state.route === "admin" && user?.role !== "admin") {
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

  if (user?.role === "admin" && state.route !== "admin") {
    state.route = "admin";
  }

  if (state.route === "qbank" || state.route === "builder") {
    state.route = "create-test";
  }

  resolveGoogleOAuthPendingState(user, privateRoutes);

  const isExamWideRoute = state.route === "session" || state.route === "review";
  const isAdminRoute = state.route === "admin";
  document.body.classList.toggle("is-session-route", isExamWideRoute);
  appEl.classList.toggle("is-session", isExamWideRoute);
  appEl.classList.toggle("is-admin", isAdminRoute);
  topbarEl?.classList.toggle("hidden", false);

  syncTopbar();
  if (state.route === "admin" && user?.role === "admin" && state.adminPage === "dashboard") {
    ensureAdminDashboardPolling();
  } else {
    clearAdminDashboardPolling();
  }
  if (!(state.route === "admin" && state.adminPage === "activity")) {
    clearAdminPresencePolling();
  }

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
    case "complete-profile":
      appEl.innerHTML = renderCompleteProfile();
      wireCompleteProfile();
      break;
    case "dashboard":
      appEl.innerHTML = renderDashboard();
      wireDashboard();
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
        refreshAdminDataSnapshot(user, {
          force: !state.adminDataLastSyncAt,
          surfaceErrors: !state.adminDataLastSyncAt,
        }).catch((error) => {
          console.warn("Admin data refresh failed.", error?.message || error);
        }).finally(() => {
          if (initialAdminHydration && state.route === "admin") {
            state.skipNextRouteAnimation = true;
            render();
          }
        });
      }
      if (state.adminDataRefreshing && !state.adminDataLastSyncAt) {
        appEl.innerHTML = renderAdminLoading();
        break;
      }
      appEl.innerHTML = renderAdmin();
      wireAdmin();
      break;
    default:
      appEl.innerHTML = renderLanding();
  }

  const isAdminQuestionModalOpen = state.route === "admin" && state.adminPage === "questions" && state.adminQuestionModalOpen;
  document.body.classList.toggle("is-admin-question-modal-open", isAdminQuestionModalOpen);
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
  wasAdminQuestionModalOpen = isAdminQuestionModalOpen;

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

function syncTopbar() {
  const user = getCurrentUser();
  const isAdmin = user?.role === "admin";
  const isAdminHeader = Boolean(user && isAdmin);

  topbarEl?.classList.toggle("admin-only-header", isAdminHeader);
  brandWrapEl?.classList.toggle("hidden", false);
  authActionsEl.classList.toggle("hidden", false);

  publicNavEl.classList.toggle("hidden", Boolean(user));
  privateNavEl.classList.toggle("hidden", !user);
  adminLinkEl.classList.toggle("hidden", user?.role !== "admin");
  privateNavEl.querySelectorAll("[data-nav]").forEach((button) => {
    const route = button.getAttribute("data-nav");
    if (isAdmin) {
      button.classList.toggle("hidden", route !== "admin");
    } else {
      button.classList.toggle("hidden", route === "admin");
    }
  });

  if (!user) {
    authActionsEl.classList.remove("hidden");
    authActionsEl.innerHTML = `
      <button data-nav="login">Login</button>
      <button class="btn" data-nav="signup">Sign up</button>
    `;
  } else {
    authActionsEl.classList.remove("hidden");
    authActionsEl.innerHTML = `
      <span class="help">${escapeHtml(user.name)} (${escapeHtml(user.role)})</span>
      <button class="btn ghost" data-action="logout">Log out</button>
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
            if (profileSync.approvalChecked && !isUserAccessApproved(user)) {
              removeStorageKey(STORAGE_KEYS.currentUserId);
              await authClient.auth.signOut().catch(() => {});
              toast("Your account is pending admin approval.");
              return;
            }
            if (await shouldForceRefreshAfterSignIn()) {
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
            if (!isUserAccessApproved(localDemoUser)) {
              toast("Your account is pending admin approval.");
              return;
            }
            if (await shouldForceRefreshAfterSignIn()) {
              return;
            }
            save(STORAGE_KEYS.currentUserId, localDemoUser.id);
            navigate(localDemoUser.role === "admin" ? "admin" : "dashboard");
            toast(`Welcome back, ${localDemoUser.name}.`);
            return;
          }

          const knownProvider = getKnownAuthProviderByEmail(email);
          if (knownProvider === "google") {
            toast("This account uses Google sign-in. Use Continue with Google.");
            return;
          }
          toast(error?.message || "Invalid credentials.");
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
        if (!isUserAccessApproved(user)) {
          toast("Your account is pending admin approval.");
          return;
        }
        if (await shouldForceRefreshAfterSignIn()) {
          return;
        }
        save(STORAGE_KEYS.currentUserId, user.id);
        navigate(user.role === "admin" ? "admin" : "dashboard");
        toast(`Welcome back, ${user.name}.`);
      } catch (error) {
        toast(error?.message || "Login failed. Please try again.");
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
      const selectedCourses = getSelectedSignupCourses().filter((course) => availableCourses.includes(course));
      const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

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
        if (!selectedCourses.length) {
          toast("Select at least one course for your enrollment.");
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
          await syncUsersBackupState(users).catch(() => {});
          await ensureRelationalSyncReady().catch(() => {});
          await flushPendingSyncNow();

          if (autoApproved) {
            save(STORAGE_KEYS.currentUserId, users[idx].id);
            toast("Account created and approved. You can start now.");
            navigate("dashboard");
          } else {
            const authClient = getSupabaseAuthClient();
            if (authClient) {
              await authClient.auth.signOut().catch(() => {});
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
      if (!selectedCourses.length) {
        toast("Select at least one course for your enrollment.");
        return;
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
                phone_number: normalizedPhone,
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

          await ensureRelationalSyncReady().catch(() => {});
          await flushPendingSyncNow();

          if (authData.session && !autoApproved) {
            await authClient.auth.signOut().catch(() => {});
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

function renderCompleteProfile() {
  const user = getCurrentUser();
  const shouldForceEmptyEnrollment = isGoogleOnboardingRequired(user);
  const year = shouldForceEmptyEnrollment ? null : normalizeAcademicYearOrNull(user?.academicYear);
  const semester = shouldForceEmptyEnrollment ? null : normalizeAcademicSemesterOrNull(user?.academicSemester);
  const courses = year !== null && semester !== null ? getCurriculumCourses(year, semester) : [];

  return `
    <section class="panel" style="max-width: 680px; margin-inline: auto;">
      <h2 class="title">Complete Your Account</h2>
      <p class="subtle">Before admin review, add your phone number and enrollment details. Use 01XXXXXXXXX, +20XXXXXXXXXX, 0020XXXXXXXXXX, or +countrycode.</p>
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
          <button class="btn" type="submit">Submit For Approval</button>
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
      await syncUsersBackupState(users).catch(() => {});
      await ensureRelationalSyncReady().catch(() => {});
      await flushPendingSyncNow();

      if (autoApproved) {
        save(STORAGE_KEYS.currentUserId, users[idx].id);
        toast("Profile submitted and approved. Welcome.");
        navigate("dashboard");
      } else {
        const authClient = getSupabaseAuthClient();
        if (authClient) {
          await authClient.auth.signOut().catch(() => {});
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

function renderDashboard() {
  const user = getCurrentUser();
  const questions = getPublishedQuestionsForUser(user);
  const sessions = getSessionsForUser(user.id);
  const completed = sessions.filter((session) => session.status === "completed");
  const analytics = getStudentAnalyticsSnapshot(user.id);
  const stats = analytics.stats;
  const syncStatusText = getStudentDataSyncStatusText();

  return `
    <section class="panel">
      <p class="kicker">Welcome back</p>
      <div class="flex-between">
        <h2 class="title">${escapeHtml(user.name)}'s Dashboard</h2>
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
        <article class="card"><p class="metric">${completed.length}<small>Completed blocks</small></p></article>
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

    ${renderPreviousTestsSection(user.id)}
  `;
}

function renderResumeCard(userId) {
  const sessions = getSessionsForUser(userId);
  const inProgress = sessions.find((session) => session.status === "in_progress");
  if (!inProgress) {
    return `<p class="subtle">No active block.</p>`;
  }

  const progress = `${inProgress.currentIndex + 1}/${inProgress.questionIds.length}`;
  return `
    <p>Mode: <b>${escapeHtml(inProgress.mode)}</b> | Progress: <b>${progress}</b></p>
    <button class="btn" data-nav="session">Resume session</button>
  `;
}

function getStudentDataSyncStatusText() {
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

function renderPreviousTestsSection(userId) {
  const completed = getCompletedSessionsForUser(userId);
  if (!completed.length) {
    return `
      <section class="panel">
        <h3 style="margin-top: 0;">Previous Tests</h3>
        <p class="subtle">No completed tests yet.</p>
      </section>
    `;
  }

  const questionsById = Object.fromEntries(getQuestions().map((question) => [question.id, question]));
  const rows = completed
    .slice(0, 10)
    .map((session) => {
      const summary = getSessionPerformanceSummary(session, questionsById);
      const completedAt = new Date(session.completedAt || session.createdAt).toLocaleString();
      return `
        <tr>
          <td>${escapeHtml(session.id)}</td>
          <td>${escapeHtml(completedAt)}</td>
          <td>${escapeHtml(String(session.mode || "tutor").toUpperCase())}</td>
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
              <th>Session</th>
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
      toast(`Retry test created: ${retryMeta.wrongSubmitted} wrong + ${retryMeta.unsolved} unsolved.`);
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
    toast(ok ? "Analytics refreshed." : "Could not refresh cloud data. Showing local analytics.");
  }
  return ok;
}

function getCreateTestSourceLabel(source) {
  const labels = {
    all: "All matching",
    unused: "Unused only",
    incorrect: "Wrong only",
    flagged: "Flagged only",
  };
  return labels[source] || labels.all;
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
  }
  const selectedCourse = state.qbankFilters.course;
  const topicOptions = getAvailableTopicsForCourse(selectedCourse, questions);
  const selectedTopics = (state.qbankFilters.topics || []).filter((topic) => topicOptions.includes(topic));
  if (selectedTopics.length !== (state.qbankFilters.topics || []).length) {
    state.qbankFilters.topics = selectedTopics;
  }
  const filtered = applyQbankFilters(questions, { course: selectedCourse, topics: selectedTopics });
  const inProgress = getSessionsForUser(user.id).find((session) => session.status === "in_progress");
  const allTopicsSelected = selectedTopics.length === 0;
  const selectedTopicLabel = allTopicsSelected ? "All topics" : selectedTopics.join(" + ");
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
  const defaultQuestionCount = Math.max(1, Math.min(500, sourceFiltered.length || 0));

  return `
    <section class="panel">
      <h2 class="title">Create a Test</h2>
      <p class="subtle">Choose course and topics, then generate a test block.</p>
      ${
        inProgress
          ? `<div class="card" style="margin-top: 0.7rem;"><b>Active block detected</b> (${inProgress.questionIds.length} questions) <button class="btn" data-nav="session">Resume</button></div>`
          : ""
      }

      <div class="create-test-filter-layout">
        <div class="create-test-filter-card">
          <label>
            Course
            <select name="course" id="create-test-course-select">
              ${availableCourses
                .map((course) => `<option value="${course}" ${selectedCourse === course ? "selected" : ""}>${course}</option>`)
                .join("")}
            </select>
          </label>
        </div>
        <div class="create-test-filter-card create-test-topics-group">
          <p class="create-test-topics-label">Topics (choose one or more)</p>
          <div class="create-test-topic-grid">
            ${topicOptions
              .map(
                (topic) => `
                  <label class="admin-course-check create-test-topic-chip">
                    <input type="checkbox" data-role="create-test-topic" value="${escapeHtml(topic)}" ${selectedTopics.includes(topic) ? "checked" : ""} />
                    <span>${escapeHtml(topic)}</span>
                  </label>
                `,
              )
              .join("")}
            <label class="admin-course-check create-test-topic-chip is-all">
              <input type="checkbox" data-role="create-test-all-topics" ${allTopicsSelected ? "checked" : ""} />
              <span>All topics</span>
            </label>
          </div>
        </div>
      </div>
    </section>

    <section class="panel">
      <h3 style="margin-top: 0;">Test Setup</h3>
      <form id="create-test-block-form" class="create-test-setup-form">
        <div class="create-test-setup-grid">
          <label class="create-test-setup-field">Number of questions
            <input name="count" type="number" min="1" max="500" step="1" value="${defaultQuestionCount}" />
          </label>
          <label class="create-test-setup-field">Mode
            <select name="mode">
              <option value="tutor">Tutor</option>
              <option value="timed">Timed</option>
            </select>
          </label>
          <label class="create-test-setup-field">Source
            <select name="source" id="create-test-source-select">
              <option value="all" ${state.createTestSource === "all" ? "selected" : ""}>All matching</option>
              <option value="unused" ${state.createTestSource === "unused" ? "selected" : ""}>Unused only</option>
              <option value="incorrect" ${state.createTestSource === "incorrect" ? "selected" : ""}>Wrong only</option>
              <option value="flagged" ${state.createTestSource === "flagged" ? "selected" : ""}>Flagged only</option>
            </select>
          </label>
          <label class="create-test-setup-field">Timer (minutes, timed mode)
            <input name="duration" type="number" min="5" max="180" value="20" />
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

        <small id="create-test-filter-summary">Current filter: <b>${escapeHtml(selectedCourse)}</b> • ${escapeHtml(selectedTopicLabel)} • Source: <b>${escapeHtml(sourceLabelMap[state.createTestSource])}</b> (${sourceFiltered.length} questions)</small>
        <div class="stack">
          <button type="submit" class="btn">Start test</button>
        </div>
      </form>
    </section>
  `;
}

function wireCreateTest() {
  const courseSelect = document.getElementById("create-test-course-select");
  const sourceSelect = document.getElementById("create-test-source-select");
  const topicInputs = Array.from(document.querySelectorAll("input[data-role='create-test-topic']"));
  const allTopicsInput = document.querySelector("input[data-role='create-test-all-topics']");
  const summaryEl = document.getElementById("create-test-filter-summary");
  const blockForm = document.getElementById("create-test-block-form");
  const countInput = blockForm?.querySelector("input[name='count']");

  const updateCreateTestSummary = () => {
    const user = getCurrentUser();
    const availableCourses = getAvailableCoursesForUser(user);
    const fallbackCourse = availableCourses[0] || Object.keys(QBANK_COURSE_TOPICS)[0] || "";
    const selectedCourse = state.qbankFilters.course || fallbackCourse;
    const topicOptions = getAvailableTopicsForCourse(selectedCourse, getPublishedQuestionsForUser(user));
    const selectedTopics = (state.qbankFilters.topics || []).filter((topic) => topicOptions.includes(topic));
    const selectedTopicLabel = selectedTopics.length ? selectedTopics.join(" + ") : "All topics";
    const filteredByCourseTopic = applyQbankFilters(getPublishedQuestionsForUser(user), {
      course: selectedCourse,
      topics: selectedTopics,
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
    if (summaryEl) {
      summaryEl.innerHTML = `Current filter: <b>${escapeHtml(selectedCourse)}</b> • ${escapeHtml(selectedTopicLabel)} • Source: <b>${escapeHtml(sourceLabelMap[state.createTestSource])}</b> (${filtered.length} questions)`;
    }
    if (countInput) {
      const suggestedCount = Math.max(1, Math.min(500, filtered.length || 0));
      countInput.value = String(suggestedCount);
    }
  };

  courseSelect?.addEventListener("change", () => {
    const fallbackCourse = getAvailableCoursesForUser(getCurrentUser())[0] || Object.keys(QBANK_COURSE_TOPICS)[0] || "";
    state.qbankFilters.course = courseSelect.value || fallbackCourse;
    state.qbankFilters.topics = [];
    state.skipNextRouteAnimation = true;
    render();
  });

  topicInputs.forEach((input) => {
    input.addEventListener("change", () => {
      const selected = topicInputs.filter((entry) => entry.checked).map((entry) => entry.value);
      state.qbankFilters.topics = selected;
      if (allTopicsInput) {
        allTopicsInput.checked = selected.length === 0;
      }
      updateCreateTestSummary();
    });
  });

  allTopicsInput?.addEventListener("change", () => {
    if (allTopicsInput.checked) {
      state.qbankFilters.topics = [];
      topicInputs.forEach((entry) => {
        entry.checked = false;
      });
      updateCreateTestSummary();
    } else if (!topicInputs.some((entry) => entry.checked)) {
      allTopicsInput.checked = true;
    }
  });

  sourceSelect?.addEventListener("change", () => {
    state.createTestSource = String(sourceSelect.value || "all");
    updateCreateTestSummary();
  });

  blockForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const user = getCurrentUser();
    const data = new FormData(blockForm);

    const mode = String(data.get("mode") || "tutor");
    const source = String(data.get("source") || state.createTestSource || "all");
    state.createTestSource = source;
    const duration = Math.max(5, Number(data.get("duration") || 20));
    const randomize = data.get("randomize") === "on";

    const availableCourses = getAvailableCoursesForUser(user);
    if (!availableCourses.includes(state.qbankFilters.course)) {
      state.qbankFilters.course = availableCourses[0] || "";
      state.qbankFilters.topics = [];
    }
    let pool = applyQbankFilters(getPublishedQuestionsForUser(user), state.qbankFilters);
    pool = applySourceFilter(pool, source, user.id);
    const fallbackCount = Math.max(1, Math.min(500, pool.length || 0));
    const requestedCount = Math.floor(Number(data.get("count")));
    const count = Math.min(
      500,
      Math.max(1, Number.isFinite(requestedCount) ? requestedCount : fallbackCount),
    );

    if (randomize) {
      pool = shuffle(pool);
    }

    const session = createSessionFromQuestions(pool, {
      count,
      mode,
      source,
      duration,
      originSessionId: null,
    });
    if (!session) {
      toast("No questions match this test setup.");
      return;
    }

    state.sessionId = session.id;
    navigate("session");
    toast("Test created.");
  });
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
  const choiceType = question.correct.length > 1 ? "checkbox" : "radio";
  const isSubmitted = response.submitted;
  const isCorrect = arraysEqual([...response.selected].sort(), [...question.correct].sort());
  const markText = isSubmitted && isCorrect ? "1.00" : "0.00";
  const statusText = isSubmitted ? (isCorrect ? "Correct" : "Incorrect") : "Not graded";
  const isTimedMode = session.mode === "timed";
  const initialTimedSeconds = Math.max(0, Number(session.durationMin || 0) * 60);
  const countdownSeconds = Math.max(
    0,
    Number(session.timeRemainingSec != null ? session.timeRemainingSec : initialTimedSeconds),
  );

  const sideRows = session.questionIds
    .map((qid, index) => {
      const entry = session.responses[qid];
      const currentClass = index === session.currentIndex ? "is-current" : "";
      const flaggedClass = entry.flagged ? "is-flagged" : "";
      const answeredClass = entry.selected.length > 0 ? "is-answered" : "";
      const unansweredClass = entry.selected.length === 0 ? "is-unanswered" : "";
      const statusLabel = entry.flagged ? "flagged" : entry.selected.length > 0 ? "answered" : "unanswered";
      return `
        <button
          type="button"
          class="exam-nav-item ${currentClass} ${flaggedClass} ${answeredClass} ${unansweredClass}"
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
      const correctChoice = question.correct.includes(choice.id);
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
      return `
        <div class="exam-choice ${selected ? "is-selected" : ""} ${struck ? "is-struck" : ""} ${statusClass}">
          <label class="exam-choice-hit">
            ${statusIndicator}
            <input type="${choiceType}" name="answer" value="${choice.id}" ${selected ? "checked" : ""} ${isSubmitted ? "disabled" : ""} />
            <span class="exam-choice-radio"></span>
            <span class="exam-choice-text"><b>${choice.id}.</b> ${escapeHtml(choice.text)} ${inlineFeedback}</span>
          </label>
        </div>
      `;
    })
    .join("");

  return `
    <section class="exam-shell-wrap">
      <div class="exam-shell exam-shell-moodle font-${escapeHtml(state.sessionFontScale)} ${state.sessionHighContrast ? "high-contrast" : ""}">
        <section class="exam-main exam-main-simple">
          <div class="exam-content exam-content-moodle">
            <aside class="exam-question-meta">
              <h3>Question <b>${session.currentIndex + 1}</b></h3>
              <p class="exam-question-status ${isSubmitted ? (isCorrect ? "good" : "bad") : "neutral"}">${statusText}</p>
              <p class="exam-mark-line">Mark ${markText} out of 1.00</p>
              ${
                isTimedMode
                  ? `<p class="countdown exam-countdown" title="Timed mode (${session.durationMin} minutes)">Time left: <span id="countdown">${formatDuration(countdownSeconds)}</span></p>`
                  : `<p class="exam-mark-line subtle">Mode: Tutor</p>`
              }
              <button class="exam-meta-link" data-action="toggle-flag">⚑ ${response.flagged ? "Unflag question" : "Flag question"}</button>
              <span class="exam-meta-badge">v1 (latest)</span>
            </aside>

            <section class="exam-question-stage">
              <article class="exam-question-block exam-question-card">
                ${renderQuestionStemVisual(question)}
                <div class="exam-stem">
                  ${stemLines
                    .map((line, index) => {
                      const highlighted = response.highlightedLines.includes(index) ? "is-highlighted" : "";
                      return `<p class="exam-line ${highlighted}">${escapeHtml(line)}</p>`;
                    })
                    .join("")}
                </div>

                <div class="exam-answers">
                  ${choicesHtml}
                </div>

                <div class="exam-answer-actions">
                  ${isSubmitted ? "" : `<button class="btn exam-submit-btn" data-action="submit-answer">Check</button>`}
                </div>
              </article>
              ${isSubmitted ? renderInlineExplanationPane(question, isCorrect) : ""}
            </section>

            <aside class="exam-nav-panel">
              <h3>Quiz navigation</h3>
              <div class="exam-nav-grid">${sideRows}</div>
              <button class="exam-nav-link" data-action="submit-session">Submit all and finish</button>
              <button class="btn ghost exam-nav-new" data-nav="create-test">Start a new preview</button>
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
      render();
    });
  });

  appEl.removeEventListener("click", handleSessionClick);
  appEl.addEventListener("click", handleSessionClick);
  document.removeEventListener("keydown", handleSessionKeydown);
  document.addEventListener("keydown", handleSessionKeydown);

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

function handleSessionClick(event) {
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

  if (action === "close-session-panel") {
    state.sessionPanel = null;
    render();
    return;
  }

  if (action === "toggle-marker-mode") {
    state.sessionMarkerEnabled = !state.sessionMarkerEnabled;
    toast(state.sessionMarkerEnabled ? "Marker mode enabled." : "Marker mode disabled.");
    render();
    return;
  }

  if (action === "set-font-scale") {
    const scale = target.getAttribute("data-scale");
    if (["compact", "normal", "large"].includes(scale)) {
      state.sessionFontScale = scale;
      persistSessionUiPreferences();
      render();
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
    if (!state.sessionMarkerEnabled) {
      toast("Enable marker first.");
      return;
    }
    const lineIndex = Number(target.getAttribute("data-line-index"));
    const qid = session.questionIds[session.currentIndex];
    const response = session.responses[qid];
    if (response.highlightedLines.includes(lineIndex)) {
      response.highlightedLines = response.highlightedLines.filter((entry) => entry !== lineIndex);
    } else {
      response.highlightedLines.push(lineIndex);
    }
    session.updatedAt = nowISO();
    upsertSession(session);
    render();
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
    const choiceId = target.getAttribute("data-choice-id");
    const qid = session.questionIds[session.currentIndex];
    const response = session.responses[qid];
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
    if (!response.selected.length) {
      toast("Select an answer before submitting.");
      return;
    }
    response.submitted = true;
    const question = getQuestions().find((entry) => entry.id === qid);
    const correct = question ? arraysEqual([...response.selected].sort(), [...question.correct].sort()) : false;
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
    upsertSession(session);
    appEl.removeEventListener("click", handleSessionClick);
    document.removeEventListener("keydown", handleSessionKeydown);
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
    appEl.removeEventListener("click", handleSessionClick);
    document.removeEventListener("keydown", handleSessionKeydown);
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

function startSessionTicker(sessionId) {
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

    session.updatedAt = nowISO();
    upsertSession(session);

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
  upsertSession(session);

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
  const completedSessions = getSessionsForUser(user.id)
    .filter((session) => session.status === "completed")
    .sort((a, b) => new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt));

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
                <span class="exam-choice-text"><b>${choice.id}.</b> ${escapeHtml(choice.text)} ${inlineFeedback}</span>
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
      <div class="exam-shell exam-shell-moodle font-${escapeHtml(state.sessionFontScale)} ${state.sessionHighContrast ? "high-contrast" : ""}">
        <section class="exam-main exam-main-simple">
          <div class="exam-content exam-content-moodle">
            <aside class="exam-question-meta">
              <h3>Question <b>${state.reviewIndex + 1}</b></h3>
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
                  ${stemLines.map((line) => `<p class="exam-line">${escapeHtml(line)}</p>`).join("")}
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
  const completedSessions = getSessionsForUser(user.id)
    .filter((session) => session.status === "completed")
    .sort((a, b) => new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt));
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
    const selected = getSessionsForUser(user.id)
      .filter((session) => session.status === "completed")
      .sort((a, b) => new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt))
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
        ${
          weak.length
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
          ${
            isGoogleAuthUser
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

function renderAdmin() {
  const user = getCurrentUser();
  if (!user || user.role !== "admin") {
    return `<section class="panel"><p>Access denied.</p></section>`;
  }
  const activeAdminPage = ["dashboard", "users", "courses", "questions", "activity"].includes(state.adminPage)
    ? state.adminPage
    : "dashboard";
  if (activeAdminPage === "users" || activeAdminPage === "courses") {
    syncUsersWithCurriculum();
  }

  const allCourses = Object.keys(QBANK_COURSE_TOPICS);
  let pageContent = "";

  if (activeAdminPage === "dashboard") {
    const users = getUsers();
    const questions = getQuestions();
    const sessions = getSessions();
    let students = 0;
    let admins = 0;
    users.forEach((account) => {
      if (account.role === "admin") {
        admins += 1;
      } else if (account.role === "student") {
        students += 1;
      }
    });
    const publishedQuestions = questions.filter((entry) => entry.status === "published").length;
    let completedSessions = 0;
    let inProgressSessions = 0;
    sessions.forEach((session) => {
      if (session.status === "completed") {
        completedSessions += 1;
      } else if (session.status === "in_progress") {
        inProgressSessions += 1;
      }
    });

    pageContent = `
      <section class="card admin-section" id="admin-stats-section">
        <h2 class="title">O6U Admin Dashboard</h2>
        <p class="subtle">Live statistics for users, questions, and activity across the website.</p>
        <div class="stats-grid" style="margin-top: 0.85rem;">
          <article class="card"><p class="metric">${users.length}<small>Total accounts</small></p></article>
          <article class="card"><p class="metric">${students}<small>Student accounts</small></p></article>
          <article class="card"><p class="metric">${admins}<small>Admin accounts</small></p></article>
          <article class="card"><p class="metric">${questions.length}<small>Total questions</small></p></article>
          <article class="card"><p class="metric">${publishedQuestions}<small>Published questions</small></p></article>
          <article class="card"><p class="metric">${completedSessions}<small>Completed tests</small></p></article>
          <article class="card"><p class="metric">${inProgressSessions}<small>Active tests</small></p></article>
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
    const autoApprovalEnabled = AUTO_APPROVE_STUDENT_ACCESS;
    const pendingCount = autoApprovalEnabled
      ? 0
      : users.filter((entry) => entry.role === "student" && !isUserAccessApproved(entry)).length;
    const accountRows = users
      .map((account) => {
        const year = account.role === "student" ? normalizeAcademicYearOrNull(account.academicYear) : null;
        const semester = account.role === "student" ? normalizeAcademicSemesterOrNull(account.academicSemester) : null;
        const isApproved = account.role === "student" && autoApprovalEnabled ? true : isUserAccessApproved(account);
        const isGoogleAuthUser = getAuthProviderFromUser(account) === "google";
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
        const authProviderIcon = isGoogleAuthUser
          ? '<span class="admin-auth-provider-icon" data-provider="google" title="Google account" aria-label="Google account" role="img"><svg viewBox="0 0 18 18" aria-hidden="true" focusable="false"><path fill="#4285F4" d="M17.64 9.2045c0-.638-.0573-1.2518-.1636-1.8409H9v3.4818h4.8436c-.2086 1.125-.8427 2.0782-1.7963 2.7155v2.2573h2.9082c1.7018-1.5664 2.6845-3.8741 2.6845-6.6137z"></path><path fill="#34A853" d="M9 18c2.43 0 4.4673-.8064 5.9564-2.1818l-2.9082-2.2573c-.8063.54-1.8377.8591-3.0482.8591-2.3441 0-4.3282-1.5832-5.0355-3.71H.9573v2.3305C2.4382 15.9832 5.4818 18 9 18z"></path><path fill="#FBBC05" d="M3.9645 10.71c-.18-.54-.2823-1.1168-.2823-1.71s.1023-1.17.2823-1.71V4.9595H.9573C.3477 6.1732 0 7.5477 0 9s.3477 2.8268.9573 4.0405L3.9645 10.71z"></path><path fill="#EA4335" d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.3459l2.5814-2.5814C13.4636.8918 11.43 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9595L3.9645 7.29C4.6718 5.1632 6.6559 3.5795 9 3.5795z"></path></svg></span>'
          : "";
        return `
          <tr data-user-id="${escapeHtml(account.id)}">
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
              ${
                account.role === "student"
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
              ${
                account.role === "student"
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
                <button class="btn ghost admin-btn-sm" data-action="toggle-user-approval" ${account.role === "admin" || autoApprovalEnabled ? "disabled" : ""}>
                  ${autoApprovalEnabled ? "Auto-approval on" : (isApproved ? "Suspend access" : "Approve access")}
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
        <div class="flex-between">
          <div>
            <h3 style="margin: 0;">Users</h3>
            <p class="subtle">Add users, assign year/semester, change roles, and manage account access.</p>
          </div>
          <div class="stack" style="align-items: flex-end;">
            <p class="subtle" style="margin: 0;">Pending requests: <b>${pendingCount}</b>${autoApprovalEnabled ? " (auto-approval enabled)" : ""}</p>
            <button class="btn" type="button" data-action="approve-all-pending" ${pendingCount && !autoApprovalEnabled ? "" : "disabled"}>Accept all pending</button>
          </div>
        </div>
        <form id="admin-add-user-form" style="margin-top: 0.85rem;">
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

        <div class="table-wrap admin-users-table-wrap" style="margin-top: 0.9rem;">
          <table class="admin-users-table">
            <colgroup>
              <col class="col-account" />
              <col class="col-role" />
              <col class="col-year" />
              <col class="col-semester" />
              <col class="col-courses" />
              <col class="col-actions" />
            </colgroup>
            <thead>
              <tr>
                <th>Account</th>
                <th>Role</th>
                <th>Year</th>
                <th>Semester</th>
                <th>Courses</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>${accountRows}</tbody>
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
    const questionCountByCourse = questions.reduce((acc, question) => {
      const mappedCourse = getQbankCourseTopicMeta(question).course;
      if (!mappedCourse) {
        return acc;
      }
      acc[mappedCourse] = (acc[mappedCourse] || 0) + 1;
      return acc;
    }, {});
    const curriculumRows = selectedSemesterCourses
      .map(
        (course, idx) => `
          <tr data-course-index="${idx}">
            <td>${idx + 1}</td>
            <td><input data-field="curriculumCourseName" value="${escapeHtml(course)}" /></td>
            <td data-role="course-topics-cell">${renderAdminCourseTopicControls(course)}</td>
            <td>
              <div class="admin-course-qbank">
                <p class="admin-course-qbank-count">
                  <b>${questionCountByCourse[course] || 0}</b> questions
                </p>
                <div class="admin-course-qbank-actions">
                  <button class="btn ghost admin-btn-sm" type="button" data-action="course-question-edit">Edit questions</button>
                  <button class="btn danger admin-btn-sm" type="button" data-action="course-question-clear" ${(questionCountByCourse[course] || 0) ? "" : "disabled"}>Delete all questions</button>
                  <button class="btn danger admin-btn-sm" type="button" data-action="course-topic-clear">Delete all topics</button>
                </div>
              </div>
            </td>
            <td>
              <div class="stack">
                <button class="btn ghost admin-btn-sm" type="button" data-action="curriculum-rename">Save name</button>
                <button class="btn danger admin-btn-sm" type="button" data-action="curriculum-delete">Delete</button>
              </div>
            </td>
          </tr>
        `,
      )
      .join("");

    pageContent = `
      <section class="card admin-section" id="admin-courses-section">
        <div class="flex-between">
          <div>
            <h3 style="margin: 0;">Courses by Year & Semester</h3>
            <p class="subtle">Add, rename, or remove courses for each academic year and semester.</p>
          </div>
        </div>
        <form id="admin-curriculum-filter-form" style="margin-top: 0.8rem;">
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
          </div>
        </form>

        <form id="admin-curriculum-add-form" style="margin-top: 0.8rem;">
          <label>New course name
            <input name="newCourseName" placeholder="e.g., New Clinical Module (NCM 999)" required />
          </label>
          <div class="stack">
            <button class="btn" type="submit">Add course</button>
          </div>
        </form>

        <div class="table-wrap" style="margin-top: 0.9rem;">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Course Name</th>
                <th>Topics</th>
                <th>Question Bank</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${curriculumRows || `<tr><td colspan="5" class="subtle">No courses in this semester yet.</td></tr>`}
            </tbody>
          </table>
        </div>
      </section>
    `;
  }

  if (activeAdminPage === "questions") {
    const importCourse = allCourses.includes(state.adminFilters.course) ? state.adminFilters.course : allCourses[0] || "";
    const importTopics = QBANK_COURSE_TOPICS[importCourse] || [];
    const importReport = state.adminImportReport;
    const importDraft = String(state.adminImportDraft || "");
    const importRunning = Boolean(state.adminImportRunning);
    const importStatus = String(state.adminImportStatus || "").trim();
    const importStatusTone = ["success", "error", "warning"].includes(state.adminImportStatusTone)
      ? state.adminImportStatusTone
      : "neutral";
    const importErrorPreview = (importReport?.errors || []).slice(0, 15);
    const questions = getQuestions();
    const selectedCourse = importCourse;
    const selectedTopic = importTopics.includes(state.adminFilters.topic) ? state.adminFilters.topic : "";
    const courseQuestions = questions
      .filter((question) => getQbankCourseTopicMeta(question).course === selectedCourse)
      .filter((question) => {
        if (!selectedTopic) {
          return true;
        }
        return getQbankCourseTopicMeta(question).topic === selectedTopic;
      });
    const questionRows = courseQuestions
      .map((question, idx) => {
        const meta = getQbankCourseTopicMeta(question);
        const stem = String(question.stem || "").trim();
        const stemPreview = stem.length > 160 ? `${stem.slice(0, 157)}...` : stem;
        return `
          <tr>
            <td>${idx + 1}</td>
            <td>${escapeHtml(meta.topic)}</td>
            <td>${escapeHtml(stemPreview || "(No stem)")}</td>
            <td>${escapeHtml(String(question.correct?.[0] || "A").toUpperCase())}</td>
            <td>${escapeHtml(String(question.status || "draft"))}</td>
            <td>
              <div class="stack">
                <button class="btn ghost admin-btn-sm" type="button" data-action="admin-edit" data-qid="${escapeHtml(question.id)}">Edit</button>
                <button class="btn danger admin-btn-sm" type="button" data-action="admin-delete" data-qid="${escapeHtml(question.id)}">Delete</button>
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

    pageContent = `
      <section class="card admin-section" id="admin-questions-section">
        <div class="flex-between">
          <div>
            <h3 style="margin: 0;">Course Question Editor</h3>
            <p class="subtle">Open each course, see all uploaded questions, and edit stem, answers, and explanation.</p>
          </div>
          <div class="stack" style="align-items: flex-end; gap: 0.35rem;">
            <button class="btn ghost admin-btn-sm" type="button" data-action="admin-open-editor-new">New question</button>
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
                ${importTopics
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
        <div class="table-wrap" style="margin-top: 0.9rem;">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Topic</th>
                <th>Question</th>
                <th>Correct</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${questionRows || `<tr><td colspan="6" class="subtle">No questions found for this course/topic.</td></tr>`}
            </tbody>
          </table>
        </div>
      </section>

      <section class="card admin-section" style="margin-top: 0.7rem;">
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
                ${importTopics.map((topic) => `<option value="${escapeHtml(topic)}">${escapeHtml(topic)}</option>`).join("")}
              </select>
            </label>
          </div>
          <label>Upload file
            <input type="file" id="admin-import-file" accept=".csv,.json,text/csv,application/json" />
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
        ${
          importStatus
            ? `<p class="subtle import-status is-${importStatusTone}" aria-live="polite">${escapeHtml(importStatus)}</p>`
            : ""
        }
        ${
          importReport
            ? `
              <div class="admin-import-report card" style="margin-top: 0.7rem;">
                <p style="margin: 0;"><b>Last import:</b> ${new Date(importReport.createdAt).toLocaleString()}</p>
                <p class="subtle">Imported ${importReport.added}/${importReport.total} rows. ${importReport.errors.length} error(s).</p>
                ${
                  importErrorPreview.length
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
      ${
        state.adminQuestionModalOpen
          ? `
            <div class="admin-question-modal">
              <button class="admin-question-modal-backdrop" type="button" data-action="admin-close-editor" aria-label="Close question editor"></button>
              <section class="admin-question-modal-card" role="dialog" aria-modal="true" aria-label="Question editor">
                <div class="flex-between">
                  <h3 style="margin: 0;">${editing ? "Edit Question" : "New Question"}</h3>
                  <div class="stack">
                    <button class="btn ghost admin-btn-sm" type="button" data-action="admin-new">New</button>
                    <button class="btn ghost admin-btn-sm" type="button" data-action="admin-cancel">Close</button>
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
                        <option value="draft" ${String(editing?.status || "draft") === "draft" ? "selected" : ""}>Draft</option>
                        <option value="published" ${String(editing?.status || "draft") === "published" ? "selected" : ""}>Published</option>
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
                  ${
                    editing?.questionImage
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
                    <label>Choice C <input name="choiceC" value="${escapeHtml(choicesById.C || "")}" required /></label>
                    <label>Choice D <input name="choiceD" value="${escapeHtml(choicesById.D || "")}" required /></label>
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
                  <div class="stack">
                    <button class="btn" type="submit">${editing ? "Save question changes" : "Save question"}</button>
                  </div>
                </form>
              </section>
            </div>
          `
          : ""
      }
    `;
  }

  if (activeAdminPage === "activity") {
    const rows = Array.isArray(state.adminPresenceRows) ? state.adminPresenceRows : [];
    const onlineRows = rows.filter((row) => shouldTreatPresenceAsOnline(row));
    const solvingRows = onlineRows.filter((row) => Boolean(row?.is_solving));
    const activityRows = rows
      .map((row) => {
        const online = shouldTreatPresenceAsOnline(row);
        const solvingNow = online && Boolean(row?.is_solving);
        const name = String(row?.full_name || "").trim() || String(row?.email || "").trim() || "User";
        const route = String(row?.current_route || "").trim() || "-";
        const lastSeen = row?.last_seen_at ? new Date(row.last_seen_at).toLocaleString() : "-";
        const solvingSince = solvingNow && row?.solving_started_at ? new Date(row.solving_started_at).toLocaleString() : "-";
        return `
          <tr>
            <td><b>${escapeHtml(name)}</b><br /><small>${escapeHtml(String(row?.email || "").trim() || "-")}</small></td>
            <td>${escapeHtml(String(row?.role || "student"))}</td>
            <td><span class="badge ${online ? "good" : "neutral"}">${online ? "online" : "offline"}</span></td>
            <td>${escapeHtml(route)}</td>
            <td>${solvingNow ? `<span class="badge good">solving</span>` : `<span class="badge neutral">idle</span>`}</td>
            <td><small>${escapeHtml(solvingSince)}</small></td>
            <td><small>${escapeHtml(lastSeen)}</small></td>
          </tr>
        `;
      })
      .join("");

    pageContent = `
      <section class="card admin-section" id="admin-activity-section">
        <div class="flex-between">
          <div>
            <h3 style="margin: 0;">Live User Activity</h3>
            <p class="subtle">Track who is online and who started solving in real time.</p>
          </div>
          <div class="stack" style="align-items: flex-end;">
            <p class="subtle" style="margin: 0;">Last sync: <b>${state.adminPresenceLastSyncAt ? new Date(state.adminPresenceLastSyncAt).toLocaleTimeString() : "Not yet"}</b></p>
            <button class="btn ghost admin-btn-sm" type="button" data-action="refresh-admin-activity">Refresh now</button>
          </div>
        </div>
        <div class="stats-grid" style="margin-top: 0.85rem;">
          <article class="card"><p class="metric">${rows.length}<small>Tracked users</small></p></article>
          <article class="card"><p class="metric">${onlineRows.length}<small>Currently online</small></p></article>
          <article class="card"><p class="metric">${solvingRows.length}<small>Currently solving</small></p></article>
        </div>
        ${
          state.adminPresenceLoading
            ? `<p class="subtle loading-inline" style="margin-top:0.9rem;"><span class="inline-loader" aria-hidden="true"></span><span>Refreshing activity data...</span></p>`
            : ""
        }
        ${
          state.adminPresenceError
            ? `<p class="subtle" style="margin-top:0.9rem;">${escapeHtml(state.adminPresenceError)}</p>`
            : ""
        }
        <div class="table-wrap" style="margin-top: 0.9rem;">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Route</th>
                <th>Session</th>
                <th>Solving Since</th>
                <th>Last Seen</th>
              </tr>
            </thead>
            <tbody>
              ${activityRows || `<tr><td colspan="7" class="subtle">No activity records yet.</td></tr>`}
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
  const canManualSupabaseSync = Boolean(getSupabaseAuthClient()) && isUuidValue(user?.supabaseAuthId);

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
          <button class="btn ghost ${activeAdminPage === "activity" ? "is-active" : ""}" type="button" data-action="admin-page" data-page="activity">Activity</button>
        </div>
        <div class="stack" style="margin-top: 0.85rem; align-items: flex-start;">
          <p class="subtle" style="margin: 0;">Last data sync: <b>${escapeHtml(adminLastSyncLabel)}</b></p>
          <button class="btn ghost admin-btn-sm ${adminSyncBusy ? "is-loading" : ""}" type="button" data-action="refresh-admin-data" ${adminSyncBusy || !canManualSupabaseSync ? "disabled" : ""} ${!canManualSupabaseSync ? 'title="Sign in with your Supabase admin account to enable sync."' : ""}>
            ${adminSyncBusy ? `<span class="inline-loader" aria-hidden="true"></span><span>Syncing...</span>` : "Sync from Supabase"}
          </button>
          ${!canManualSupabaseSync ? '<small class="subtle">Supabase sync requires an active Supabase admin session.</small>' : ""}
        </div>
      </aside>

      <div class="admin-main">${syncNotice}${pageContent}</div>
    </section>
  `;
}

function renderAdminCourseTopicControls(course) {
  const topics = QBANK_COURSE_TOPICS[course] || [];
  return `
    <div class="admin-course-topics">
      <div class="admin-topic-list">
        ${topics
          .map(
            (topic, topicIdx) => `
              <span class="admin-topic-chip">
                <span>${escapeHtml(topic)}</span>
                <button
                  type="button"
                  data-action="course-topic-rename"
                  data-topic-index="${topicIdx}"
                  aria-label="Rename ${escapeHtml(topic)}"
                  title="Rename topic"
                >
                  edit
                </button>
                <button
                  type="button"
                  data-action="course-topic-remove"
                  data-topic-index="${topicIdx}"
                  aria-label="Remove ${escapeHtml(topic)}"
                  title="Remove topic"
                >
                  x
                </button>
              </span>
            `,
          )
          .join("")}
      </div>
      <div class="admin-topic-add">
        <input data-field="newCourseTopic" placeholder="Add topic (e.g., Diabetes Mellitus)" />
        <button class="btn ghost admin-btn-sm" type="button" data-action="course-topic-add">Add topic</button>
      </div>
    </div>
  `;
}

function wireAdmin() {
  const allCourses = Object.keys(QBANK_COURSE_TOPICS);

  appEl.querySelectorAll("[data-action='admin-page']").forEach((button) => {
    button.addEventListener("click", () => {
      const page = button.getAttribute("data-page");
      if (!["dashboard", "users", "courses", "questions", "activity"].includes(page)) {
        return;
      }
      if (state.adminPage === page) {
        return;
      }
      state.adminPage = page;
      if (page !== "questions") {
        state.adminQuestionModalOpen = false;
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
      state.adminEditQuestionId = null;
      state.adminQuestionModalOpen = false;
      state.skipNextRouteAnimation = true;
      render();
    });
  });

  appEl.querySelector("[data-action='refresh-admin-data']")?.addEventListener("click", async () => {
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== "admin") {
      return;
    }
    const authClient = getSupabaseAuthClient();
    if (!authClient || !isUuidValue(currentUser.supabaseAuthId)) {
      const message = "No active Supabase admin session. Log out and sign in with your Supabase admin account.";
      state.adminDataSyncError = message;
      toast(message);
      state.skipNextRouteAnimation = true;
      render();
      return;
    }
    const { data: sessionData } = await authClient.auth.getSession().catch(() => ({ data: { session: null } }));
    if (!sessionData?.session?.user?.id || sessionData.session.user.id !== currentUser.supabaseAuthId) {
      const message = "Supabase session expired. Please log out and sign in again.";
      state.adminDataSyncError = message;
      toast(message);
      state.skipNextRouteAnimation = true;
      render();
      return;
    }
    const synced = await refreshAdminDataSnapshot(currentUser, { force: true });
    if (state.adminPage === "activity") {
      await refreshAdminPresenceSnapshot({ force: true, silent: true }).catch(() => {});
    }
    if (synced) {
      toast("Admin data synced from Supabase.");
    } else {
      toast(state.adminDataSyncError || relationalSync.lastReadyError || "Could not sync admin data from Supabase.");
    }
    state.skipNextRouteAnimation = true;
    render();
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
  } else {
    clearAdminPresencePolling();
  }

  const curriculumFilterForm = document.getElementById("admin-curriculum-filter-form");
  const curriculumYearSelect = curriculumFilterForm?.querySelector("select[name='curriculumYear']");
  const curriculumSemesterSelect = curriculumFilterForm?.querySelector("select[name='curriculumSemester']");
  const syncCurriculumSelection = () => {
    state.adminCurriculumYear = sanitizeAcademicYear(curriculumYearSelect?.value || 1);
    state.adminCurriculumSemester = sanitizeAcademicSemester(curriculumSemesterSelect?.value || 1);
    state.skipNextRouteAnimation = true;
    render();
  };
  curriculumYearSelect?.addEventListener("change", syncCurriculumSelection);
  curriculumSemesterSelect?.addEventListener("change", syncCurriculumSelection);

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
    try {
      await flushPendingSyncNow();
      toast("Course added.");
      state.skipNextRouteAnimation = true;
      render();
    } catch (syncError) {
      toast(`Course added locally, but DB sync failed: ${getErrorMessage(syncError, "Sync failed.")}`);
    }
  });

  appEl.querySelectorAll("[data-action='curriculum-rename']").forEach((button) => {
    button.addEventListener("click", async () => {
      const row = button.closest("tr[data-course-index]");
      if (!row) return;

      const index = Number(row.getAttribute("data-course-index"));
      const input = row.querySelector("input[data-field='curriculumCourseName']");
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
      const row = button.closest("tr[data-course-index]");
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
  adminCoursesSection?.addEventListener("click", async (event) => {
    const actionEl = event.target.closest("[data-action]");
    if (!actionEl) return;

    const action = actionEl.getAttribute("data-action");
    if (
      ![
        "course-topic-add",
        "course-topic-rename",
        "course-topic-remove",
        "course-topic-clear",
        "course-question-edit",
        "course-question-clear",
      ].includes(action)
    ) {
      return;
    }

    const row = actionEl.closest("tr[data-course-index]");
    if (!row) return;
    const index = Number(row.getAttribute("data-course-index"));
    const year = sanitizeAcademicYear(state.adminCurriculumYear || 1);
    const semester = sanitizeAcademicSemester(state.adminCurriculumSemester || 1);
    const currentCourses = O6U_CURRICULUM[year]?.[semester] || [];
    const course = currentCourses[index];
    if (!course) return;

    if (action === "course-question-edit") {
      state.adminPage = "questions";
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

    const refreshRowTopics = () => {
      const topicsCell = row.querySelector("[data-role='course-topics-cell']");
      if (!topicsCell) return;
      topicsCell.innerHTML = renderAdminCourseTopicControls(course);
    };

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
      applyCourseTopicsUpdate(course, []);
      refreshRowTopics();
      try {
        await flushPendingSyncNow();
        toast(`Deleted ${existingTopics.length} topic(s) from ${course}.`);
      } catch (syncError) {
        toast(`Topics deleted locally, but DB sync failed: ${getErrorMessage(syncError, "Sync failed.")}`);
      }
      return;
    }

    if (action === "course-topic-add") {
      const input = row.querySelector("input[data-field='newCourseTopic']");
      const topicName = String(input?.value || "").trim();
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
      refreshRowTopics();
      try {
        await flushPendingSyncNow();
        toast("Topic added.");
      } catch (syncError) {
        toast(`Topic added locally, but DB sync failed: ${getErrorMessage(syncError, "Sync failed.")}`);
      }
      return;
    }

    const topicIndex = Number(actionEl.getAttribute("data-topic-index"));
    const topics = QBANK_COURSE_TOPICS[course] || [];
    const currentTopic = topics[topicIndex];
    if (!currentTopic) return;

    if (action === "course-topic-rename") {
      const nextTopic = String(window.prompt("Rename topic", currentTopic) || "").trim();
      if (!nextTopic || nextTopic === currentTopic) {
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
      const nextTopics = [...topics];
      nextTopics[topicIndex] = nextTopic;
      applyCourseTopicsUpdate(course, nextTopics);
      refreshRowTopics();
      try {
        await flushPendingSyncNow();
        toast("Topic renamed.");
      } catch (syncError) {
        toast(`Topic renamed locally, but DB sync failed: ${getErrorMessage(syncError, "Sync failed.")}`);
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
    );
    refreshRowTopics();
    try {
      await flushPendingSyncNow();
      toast("Topic removed.");
    } catch (syncError) {
      toast(`Topic removed locally, but DB sync failed: ${getErrorMessage(syncError, "Sync failed.")}`);
    }
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

    users.push({
      id: makeId("u"),
      name,
      email,
      password,
      phone: "",
      role: normalizedRole,
      verified: true,
      isApproved: true,
      approvedAt: nowISO(),
      approvedBy: "admin",
      assignedCourses,
      academicYear: normalizedRole === "student" ? academicYear : null,
      academicSemester: normalizedRole === "student" ? academicSemester : null,
      createdAt: nowISO(),
    });
    save(STORAGE_KEYS.users, users);
    try {
      await flushPendingSyncNow();
      toast("User added.");
      render();
    } catch (syncError) {
      toast(`User added locally, but DB sync failed: ${getErrorMessage(syncError, "Sync failed.")}`);
    }
  });

  appEl.querySelector("[data-action='approve-all-pending']")?.addEventListener("click", async () => {
    if (AUTO_APPROVE_STUDENT_ACCESS) {
      toast("Auto-approval mode is enabled. Student access is already treated as approved.");
      return;
    }
    const current = getCurrentUser();
    const users = getUsers();
    const pendingUsers = users.filter((entry) => entry.role === "student" && !isUserAccessApproved(entry));
    const pendingProfileIds = pendingUsers.map((entry) => getUserProfileId(entry)).filter((id) => isUuidValue(id));

    if (!pendingUsers.length) {
      toast("No pending requests found.");
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
      if (entry.role !== "student" || isUserAccessApproved(entry)) {
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
    try {
      await flushPendingSyncNow();
      toast(
        skippedCount
          ? `${approvedCount} pending account(s) approved. ${skippedCount} skipped (missing database profile).`
          : `${approvedCount} pending account(s) approved.`,
      );
      render();
    } catch (syncError) {
      toast(`Approval updated locally, but DB sync failed: ${getErrorMessage(syncError, "Sync failed.")}`);
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
      } else {
        users[idx].academicYear = null;
        users[idx].academicSemester = null;
        users[idx].assignedCourses = [...allCourses];
      }

      save(STORAGE_KEYS.users, users);
      await flushPendingSyncNow();
      if (mode === "manual") {
        toast("Enrollment saved.");
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
        users[idx].isApproved = true;
        users[idx].approvedAt = users[idx].approvedAt || nowISO();
        users[idx].approvedBy = users[idx].approvedBy || current?.email || "admin";
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
      if (AUTO_APPROVE_STUDENT_ACCESS) {
        toast("Auto-approval mode is enabled. Disable it first to manage manual approvals.");
        return;
      }
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
      const targetProfileId = getUserProfileId(users[idx]);
      const dbResult = await updateRelationalProfileApproval([targetProfileId], nextApproved);
      if (isUuidValue(targetProfileId) && !dbResult.ok) {
        toast(`Database update failed. ${dbResult.message}`);
        return;
      }
      if (isUuidValue(targetProfileId) && !(dbResult.updatedIds || []).includes(targetProfileId)) {
        toast("Database update failed. This user profile is missing or inaccessible.");
        return;
      }
      users[idx].isApproved = nextApproved;
      users[idx].approvedAt = nextApproved ? nowISO() : null;
      users[idx].approvedBy = nextApproved ? current?.email || "admin" : null;
      save(STORAGE_KEYS.users, users);
      await syncUsersBackupState(users);
      try {
        await flushPendingSyncNow();
        toast(nextApproved ? "Account approved." : "Account suspended.");
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
      if (target.supabaseAuthId) {
        const deleteResult = await deleteSupabaseAuthUserAsAdmin(target.supabaseAuthId);
        if (!deleteResult.ok) {
          toast(`Could not delete user from Supabase Auth. ${deleteResult.message || "Unauthorized."}`);
          return;
        }
      }
      if (targetProfileId) {
        const relationalDeleteResult = await deleteRelationalProfile(targetProfileId);
        if (!relationalDeleteResult.ok) {
          toast(`Database delete failed. ${relationalDeleteResult.message}`);
          return;
        }
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
        await flushPendingSyncNow();
        toast("User removed.");
        render();
      } catch (syncError) {
        toast(`User removed locally, but DB sync failed: ${getErrorMessage(syncError, "Sync failed.")}`);
      }
    });
  });

  const adminFilterForm = document.getElementById("admin-question-filter-form");
  const adminFilterCourse = document.getElementById("admin-filter-course");
  const adminFilterTopic = document.getElementById("admin-filter-topic");
  const adminClearFilters = document.getElementById("admin-clear-filters");

  adminFilterForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(adminFilterForm);
    state.adminFilters.course = String(data.get("course") || "");
    state.adminFilters.topic = String(data.get("topic") || "");
    render();
  });

  adminFilterCourse?.addEventListener("change", () => {
    const selected = adminFilterCourse.value || "";
    const topics = selected ? QBANK_COURSE_TOPICS[selected] || [] : [];
    setSelectOptions(adminFilterTopic, topics, true);
  });

  adminClearFilters?.addEventListener("click", () => {
    state.adminFilters = { course: "", topic: "" };
    render();
  });

  appEl.querySelector("[data-action='admin-open-editor-new']")?.addEventListener("click", () => {
    state.adminEditQuestionId = null;
    state.adminEditorCourse = state.adminFilters.course || allCourses[0] || "";
    state.adminEditorTopic = resolveDefaultTopic(state.adminEditorCourse);
    state.adminQuestionModalOpen = true;
    render();
  });

  appEl.querySelectorAll("[data-action='admin-close-editor'], [data-action='admin-cancel']").forEach((button) => {
    button.addEventListener("click", () => {
      state.adminEditQuestionId = null;
      state.adminEditorCourse = "";
      state.adminEditorTopic = "";
      state.adminQuestionModalOpen = false;
      render();
    });
  });

  const adminQuestionsSection = document.getElementById("admin-questions-section");
  adminQuestionsSection?.addEventListener("click", async (event) => {
    const actionEl = event.target.closest("[data-action]");
    if (!actionEl) {
      return;
    }
    const action = String(actionEl.getAttribute("data-action") || "").trim();
    if (!["admin-edit", "admin-delete"].includes(action)) {
      return;
    }

    const qid = String(actionEl.getAttribute("data-qid") || "").trim();
    if (!qid) {
      return;
    }

    if (action === "admin-edit") {
      state.adminEditQuestionId = qid;
      const questions = getQuestions();
      const editing = questions.find((entry) => String(entry.id || "").trim() === qid);
      const meta = editing ? getQbankCourseTopicMeta(editing) : null;
      state.adminEditorCourse = meta?.course || allCourses[0] || "";
      state.adminEditorTopic = meta?.topic || (QBANK_COURSE_TOPICS[state.adminEditorCourse] || [])[0] || "";
      state.adminQuestionModalOpen = true;
      render();
      return;
    }

    if (!window.confirm(`Delete question ${qid}?`)) {
      return;
    }

    const questions = getQuestions().filter((entry) => String(entry.id || "").trim() !== qid);
    save(STORAGE_KEYS.questions, questions);
    try {
      await flushPendingSyncNow();
      toast("Question deleted.");
      if (state.adminEditQuestionId === qid) {
        state.adminEditQuestionId = null;
        state.adminQuestionModalOpen = false;
      }
      render();
    } catch (syncError) {
      toast(`Question deleted locally, but DB sync failed: ${getErrorMessage(syncError, "Sync failed.")}`);
    }
  });

  appEl.querySelector("[data-action='admin-new']")?.addEventListener("click", () => {
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
  importCourseSelect?.addEventListener("change", () => {
    const course = importCourseSelect.value || allCourses[0];
    setSelectOptions(importTopicSelect, QBANK_COURSE_TOPICS[course] || [], false);
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
    const file = importFileInput.files?.[0];
    if (!file) return;
    const fileName = String(file.name || "").toLowerCase();
    if (!(fileName.endsWith(".csv") || fileName.endsWith(".json"))) {
      toast("Only CSV or JSON files are supported for bulk import.");
      importFileInput.value = "";
      return;
    }
    const text = await file.text();
    state.adminImportDraft = text;
    importTextInput.value = text;
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
    const data = new FormData(form);
    const questions = getQuestions();
    const existingId = String(data.get("id") || "");
    let questionImage = String(data.get("questionImage") || "").trim();
    const questionImageFile = data.get("questionImageFile");
    if (questionImageFile instanceof File && Number(questionImageFile.size || 0) > 0) {
      const uploadResult = await uploadQuestionImageFile(questionImageFile);
      if (!uploadResult.ok) {
        if (questionImage) {
          toast(`Question image upload failed. The provided URL was kept. (${uploadResult.message})`);
        } else {
          toast(`Question image upload failed: ${uploadResult.message}`);
          return;
        }
      }
      if (uploadResult.ok) {
        questionImage = String(uploadResult.url || "").trim();
      }
      if (uploadResult.ok && uploadResult.usedFallback) {
        toast("Question image saved inline because storage upload failed.");
      }
    }

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
      choices: [
        { id: "A", text: String(data.get("choiceA") || "").trim() },
        { id: "B", text: String(data.get("choiceB") || "").trim() },
        { id: "C", text: String(data.get("choiceC") || "").trim() },
        { id: "D", text: String(data.get("choiceD") || "").trim() },
        { id: "E", text: String(data.get("choiceE") || "").trim() },
      ],
      correct: [String(data.get("correct") || "A")],
      explanation: String(data.get("explanation") || "").trim(),
      objective: "",
      references: String(data.get("references") || "").trim(),
      questionImage,
      explanationImage: String(data.get("explanationImage") || "").trim(),
      status: String(data.get("status") || "draft"),
    };

    if (!QBANK_COURSE_TOPICS[payload.qbankCourse]?.includes(payload.qbankTopic)) {
      payload.qbankTopic = (QBANK_COURSE_TOPICS[payload.qbankCourse] || [])[0] || payload.qbankTopic;
      payload.topic = payload.qbankTopic;
    }

    const idx = questions.findIndex((entry) => entry.id === payload.id);
    const successMessage = idx >= 0 ? "Question updated." : "Question created.";
    if (idx >= 0) {
      questions[idx] = { ...questions[idx], ...payload };
    } else {
      questions.push(payload);
    }

    save(STORAGE_KEYS.questions, questions);
    try {
      await flushPendingSyncNow();
      toast(successMessage);
      state.adminFilters.course = payload.qbankCourse;
      state.adminFilters.topic = payload.qbankTopic || "";
      state.adminEditQuestionId = null;
      state.adminEditorCourse = "";
      state.adminEditorTopic = "";
      state.adminQuestionModalOpen = false;
      render();
    } catch (syncError) {
      toast(`${successMessage} locally, but DB sync failed: ${getErrorMessage(syncError, "Sync failed.")}`);
    }
  });

  const importForm = document.getElementById("admin-import-form");
  importForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (state.adminImportRunning) {
      return;
    }
    const data = new FormData(importForm);
    const rawInput = String(data.get("importText") || state.adminImportDraft || "");
    state.adminImportDraft = rawInput;
    const raw = rawInput.trim();
    if (!raw) {
      state.adminImportStatus = "Paste import content or upload a file first.";
      state.adminImportStatusTone = "error";
      state.skipNextRouteAnimation = true;
      render();
      toast("Paste import content or upload a file first.");
      return;
    }

    const defaultCourse = String(data.get("defaultCourse") || allCourses[0]);
    const defaultTopic = String(data.get("defaultTopic") || (QBANK_COURSE_TOPICS[defaultCourse] || [])[0] || "");
    state.adminImportRunning = true;
    state.adminImportStatus = "Importing questions...";
    state.adminImportStatusTone = "neutral";
    state.skipNextRouteAnimation = true;
    render();
    await new Promise((resolve) => window.requestAnimationFrame(resolve));

    try {
      const result = importQuestionsFromRaw(raw, {
        defaultCourse,
        defaultTopic,
        author: getCurrentUser().name,
      });
      state.adminImportReport = {
        createdAt: nowISO(),
        total: result.total,
        added: result.added,
        errors: [...result.errors],
      };

      let syncMessage = "";
      if (result.added) {
        const syncResult = await persistImportedQuestionsNow(getQuestions());
        if (!syncResult.ok) {
          syncMessage = syncResult.message || "Database sync failed.";
        }
      }

      if (syncMessage) {
        state.adminImportStatus = `Done importing ${result.added}/${result.total} rows. Saved locally with sync warning: ${syncMessage}`;
        state.adminImportStatusTone = "warning";
        toast(`Imported ${result.added}/${result.total} rows locally, but DB sync failed: ${syncMessage}`);
      } else if (result.errors.length) {
        state.adminImportStatus = `Done importing ${result.added}/${result.total} rows with ${result.errors.length} error(s).`;
        state.adminImportStatusTone = result.added ? "warning" : "error";
        toast(`Imported ${result.added}/${result.total} rows with ${result.errors.length} error(s).`);
      } else {
        state.adminImportStatus = `Done importing ${result.added}/${result.total} rows.`;
        state.adminImportStatusTone = "success";
        toast(`Imported ${result.added}/${result.total} rows successfully.`);
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
function getUsers() {
  const users = load(STORAGE_KEYS.users, []);
  return Array.isArray(users) ? users : [];
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
    const hasSeenFingerprint = Boolean(fingerprint) && seenFingerprints.has(fingerprint);
    if (hasSeenId || hasSeenFingerprint) {
      continue;
    }

    identityKeys.forEach((key) => seenIdKeys.add(key));
    if (fingerprint) {
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
  return Array.isArray(sessions) ? sessions : [];
}

function getCurrentUser() {
  const userId = load(STORAGE_KEYS.currentUserId, null);
  if (!userId) {
    return null;
  }

  return getUsers().find((user) => user.id === userId) || null;
}

async function getValidSupabaseAccessToken(authClient) {
  if (!authClient?.auth) {
    return { ok: false, token: "", message: "Supabase auth client is not available." };
  }

  const readToken = async () => {
    const { data: sessionData, error: sessionError } = await authClient.auth.getSession();
    if (sessionError) {
      return { ok: false, token: "", message: sessionError.message || "Could not verify Supabase session." };
    }
    const accessToken = String(sessionData?.session?.access_token || "").trim();
    if (!accessToken) {
      return {
        ok: false,
        token: "",
        message: "No active Supabase session for admin delete. Log in with your Supabase admin account.",
      };
    }
    return { ok: true, token: accessToken, message: "" };
  };

  let tokenResult = await readToken();
  if (!tokenResult.ok) {
    return tokenResult;
  }

  const validateToken = async (token) => {
    try {
      const { data, error } = await authClient.auth.getUser(token);
      return !error && Boolean(data?.user?.id);
    } catch {
      return false;
    }
  };

  if (await validateToken(tokenResult.token)) {
    return tokenResult;
  }

  await authClient.auth.refreshSession().catch(() => {});
  tokenResult = await readToken();
  if (!tokenResult.ok) {
    return tokenResult;
  }
  if (await validateToken(tokenResult.token)) {
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
    if (!SUPABASE_CONFIG.url || !SUPABASE_CONFIG.anonKey) {
      return {
        ok: false,
        message: "Supabase function endpoint is not configured in this app.",
      };
    }

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const tokenResult = await getValidSupabaseAccessToken(authClient);
      if (!tokenResult.ok) {
        return { ok: false, message: tokenResult.message || "Could not verify Supabase session." };
      }

      const response = await fetch(`${SUPABASE_CONFIG.url}/functions/v1/admin-delete-user`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenResult.token}`,
          apikey: SUPABASE_CONFIG.anonKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ targetAuthId }),
      });

      let payload = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }

      if (response.ok && payload?.ok) {
        return { ok: true };
      }

      const details = String(payload?.error || payload?.message || "").trim();
      if (response.status === 401 || response.status === 403) {
        if (attempt === 0) {
          await authClient.auth.refreshSession().catch(() => {});
          continue;
        }
        return {
          ok: false,
          message: details || "Unauthorized. Log out and log in again with your Supabase admin account.",
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

function getSessionsForUser(userId) {
  return getSessions().filter((session) => session.userId === userId);
}

function getCompletedSessionsForUser(userId) {
  return getSessionsForUser(userId)
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

  const responses = {};
  selected.forEach((question) => {
    responses[question.id] = {
      selected: [],
      flagged: false,
      struck: [],
      notes: "",
      timeSpentSec: 0,
      highlightedLines: [],
      submitted: false,
    };
  });

  const session = {
    id: makeId("s"),
    userId: user.id,
    mode,
    source,
    durationMin: duration,
    timeRemainingSec: mode === "timed" ? duration * 60 : null,
    paused: false,
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
  const sessions = getSessionsForUser(userId).filter((session) => session.status === "in_progress");
  if (!sessions.length) {
    return null;
  }

  return sessions.find((session) => session.id === preferredId) || sessions.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0];
}

function getSessionById(sessionId) {
  return getSessions().find((session) => session.id === sessionId) || null;
}

function upsertSession(updated) {
  const sessions = getSessions();
  const idx = sessions.findIndex((session) => session.id === updated.id);
  if (idx >= 0) {
    sessions[idx] = updated;
  } else {
    sessions.push(updated);
  }
  save(STORAGE_KEYS.sessions, sessions);
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

function applyQbankFilters(questions, filters) {
  const selectedTopics = Array.isArray(filters?.topics) ? filters.topics.filter(Boolean) : [];
  const singleTopic = String(filters?.topic || "").trim();

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
      if (filters.course && question.qbankCourse !== filters.course) {
        return false;
      }
      if (selectedTopics.length && !selectedTopics.includes(question.qbankTopic)) {
        return false;
      }
      if (!selectedTopics.length && singleTopic && question.qbankTopic !== singleTopic) {
        return false;
      }
      return true;
    })
    .sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
}

function getAvailableTopicsForCourse(course, questions = []) {
  const configuredTopics = (QBANK_COURSE_TOPICS[course] || []).filter((topic) => !isRemovedTopicName(topic));
  const questionTopics = [];
  const seen = new Set();

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

  return [...new Set([...questionTopics, ...configuredTopics])];
}

function getQbankCourseTopicMeta(question) {
  const explicitCourse = String(question.qbankCourse || "").trim();
  const explicitTopic = String(question.qbankTopic || question.topic || "").trim();
  const sanitizedExplicitTopic = isRemovedTopicName(explicitTopic) ? "" : explicitTopic;
  if (QBANK_COURSE_TOPICS[explicitCourse]) {
    return {
      course: explicitCourse,
      topic: sanitizedExplicitTopic || resolveDefaultTopic(explicitCourse, sanitizedExplicitTopic),
    };
  }

  const system = String(question.system || "").toLowerCase();
  const topic = String(question.topic || "").toLowerCase();
  const stem = String(question.stem || "").toLowerCase();
  const text = `${system} ${topic} ${stem}`;

  const rules = [
    {
      course: "Endocrinology & Reproduction (ERP 208)",
      needles: ["endocrine", "pituitary", "thyroid", "parathyroid", "adrenal", "suprarenal", "diabetes", "pancrea", "reproduc", "dka"],
    },
    {
      course: "Nervous System (NER 206)",
      needles: ["neuro", "stroke", "seizure", "epilep", "brain", "spinal", "dementia", "parkinson", "myasthenia", "guillain"],
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
      const mappedCourse = QBANK_COURSE_TOPICS[rule.course] ? rule.course : CURRICULUM_COURSE_LIST[0] || rule.course;
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
  if (preferredTopic && !isRemovedTopicName(preferredTopic) && topics.includes(preferredTopic)) {
    return preferredTopic;
  }
  return topics[0] || "Clinical Applications";
}

function hasAny(text, needles) {
  return needles.some((needle) => text.includes(needle));
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

function rebuildCurriculumCatalog() {
  CURRICULUM_COURSE_LIST = [
    ...new Set(
      Object.values(O6U_CURRICULUM)
        .flatMap((yearMap) => Object.values(yearMap))
        .flat(),
    ),
  ];
  COURSE_TOPIC_OVERRIDES = normalizeCourseTopicMap(COURSE_TOPIC_OVERRIDES);
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
      : shouldAutoApproveStudentAccess(user)
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
      const year = normalizeAcademicYearOrNull(user.academicYear);
      const semester = normalizeAcademicSemesterOrNull(user.academicSemester);
      if (user.academicYear !== year) {
        user.academicYear = year;
        changed = true;
      }
      if (user.academicSemester !== semester) {
        user.academicSemester = semester;
        changed = true;
      }
      if (year !== null && semester !== null) {
        const semesterCourses = getCurriculumCourses(year, semester);
        const assigned = sanitizeCourseAssignments(user.assignedCourses || []);
        const scoped = assigned.filter((course) => semesterCourses.includes(course));
        const courses = scoped.length ? scoped : semesterCourses;
        if ((user.assignedCourses || []).join("|") !== courses.join("|")) {
          user.assignedCourses = courses;
          changed = true;
        }
      } else {
        const normalizedAssigned = sanitizeCourseAssignments(user.assignedCourses || []);
        if ((user.assignedCourses || []).join("|") !== normalizedAssigned.join("|")) {
          user.assignedCourses = normalizedAssigned;
          changed = true;
        }
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
  });

  if (changed) {
    save(STORAGE_KEYS.users, users);
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

  O6U_CURRICULUM = normalizeCurriculum(nextCurriculum);
  rebuildCurriculumCatalog();
  save(STORAGE_KEYS.curriculum, O6U_CURRICULUM);
  save(STORAGE_KEYS.courseTopics, COURSE_TOPIC_OVERRIDES);

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

function applyCourseTopicsUpdate(course, nextTopics) {
  if (!course || !CURRICULUM_COURSE_LIST.includes(course)) {
    return;
  }
  COURSE_TOPIC_OVERRIDES[course] = normalizeCourseTopicList(nextTopics, course);
  rebuildCurriculumCatalog();
  save(STORAGE_KEYS.courseTopics, COURSE_TOPIC_OVERRIDES);

  const questions = getQuestions();
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
    const normalizedTopic = resolveDefaultTopic(course, question.qbankTopic);
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
    const byEnrollment = getCurriculumCourses(user.academicYear || 1, user.academicSemester || 1);
    const assigned = sanitizeCourseAssignments(user.assignedCourses || []);
    const scoped = assigned.filter((course) => byEnrollment.includes(course));
    if (scoped.length) {
      return scoped;
    }
    if (byEnrollment.length) {
      return byEnrollment;
    }
  }
  const assigned = sanitizeCourseAssignments(user.assignedCourses || []);
  return assigned.length ? assigned : all;
}

function getPublishedQuestionsForUser(user) {
  const availableCourses = new Set(getAvailableCoursesForUser(user));
  return applyQbankFilters(
    getQuestions().filter((question) => question.status === "published"),
    { course: "", topics: [] },
  ).filter((question) => availableCourses.has(question.qbankCourse));
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
  let usedCsvImport = false;

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
    if (course && importedTopic && !QBANK_COURSE_TOPICS[course]?.includes(importedTopic)) {
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
    const choiceA = String(row.choiceA || "").trim() || "Option A";
    const choiceB = String(row.choiceB || "").trim() || "Option B";
    const choiceC = String(row.choiceC || "").trim() || "Option C";
    const choiceD = String(row.choiceD || "").trim() || "Option D";
    let choiceE = String(row.choiceE || "").trim();
    let correct = normalizeImportCorrect(row.correct);
    if (!correct.length) {
      correct = ["A"];
    }
    if (correct.includes("E") && !choiceE) {
      choiceE = "Option E";
    }
    const availableChoices = [
      { id: "A", text: choiceA },
      { id: "B", text: choiceB },
      { id: "C", text: choiceC },
      { id: "D", text: choiceD },
      ...(choiceE ? [{ id: "E", text: choiceE }] : []),
    ];
    const availableChoiceIds = new Set(availableChoices.map((choice) => choice.id));
    const validCorrect = correct.filter((choiceId) => availableChoiceIds.has(choiceId));
    if (!validCorrect.length) {
      validCorrect.push("A");
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
      choices: availableChoices,
      correct: validCorrect,
      explanation: explanation || "No explanation provided.",
      objective: String(row.objective || "").trim(),
      references: String(row.references || "").trim(),
      questionImage: String(row.questionImage || "").trim(),
      explanationImage: String(row.explanationImage || "").trim(),
      status: ["draft", "published"].includes(String(row.status || "published").toLowerCase())
        ? String(row.status || "published").toLowerCase()
        : "published",
    });
    added += 1;
  });

  if (added) {
    save(STORAGE_KEYS.questions, questions);
  }
  if (topicCatalogChanged) {
    save(STORAGE_KEYS.courseTopics, COURSE_TOPIC_OVERRIDES);
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

  const sessions = getSessionsForUser(userId).filter((session) => session.status === "completed");
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

  const sessions = getSessionsForUser(userId).filter((session) => session.status === "completed");
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

function buildStudentAnalyticsSnapshot(userId, courseFilter = "") {
  const normalizedFilter = String(courseFilter || "").trim();
  const sessions = getSessionsForUser(userId)
    .filter((session) => session.status === "completed")
    .slice()
    .sort((a, b) => new Date(a.completedAt || a.createdAt) - new Date(b.completedAt || b.createdAt));
  const questionMetaById = getAnalyticsQuestionMetaById();
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
  const key = `${userId}::${normalizedFilter || "__all__"}`;
  if (analyticsRuntime.cache.has(key)) {
    return analyticsRuntime.cache.get(key);
  }
  const snapshot = buildStudentAnalyticsSnapshot(userId, normalizedFilter);
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

function hydrateSessionUiPreferences() {
  const ui = load(STORAGE_KEYS.sessionUi, {});
  state.sessionFontScale = ["compact", "normal", "large"].includes(ui.sessionFontScale)
    ? ui.sessionFontScale
    : "normal";
  state.sessionHighContrast = Boolean(ui.sessionHighContrast);
}

function persistSessionUiPreferences() {
  save(STORAGE_KEYS.sessionUi, {
    sessionFontScale: state.sessionFontScale,
    sessionHighContrast: state.sessionHighContrast,
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
        submitted: false,
      };
      changed = true;
      return;
    }

    const response = session.responses[qid];
    if (!Array.isArray(response.selected)) {
      response.selected = [];
      changed = true;
    }
    if (!Array.isArray(response.struck)) {
      response.struck = [];
      changed = true;
    }
    if (!Array.isArray(response.highlightedLines)) {
      response.highlightedLines = [];
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
        <li><b>S</b><span>Submit current answer</span></li>
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
        ${
          notebookEntries.length
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
  const sessions = getSessionsForUser(userId);
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

function save(key, value) {
  writeStorageKey(key, value);
  invalidateAnalyticsCacheForStorageKey(key);
  scheduleRelationalWrite(key, value);
  scheduleSupabaseWrite(key, value);
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
}

function removeStorageKey(key) {
  inMemoryStorage.delete(key);
  try {
    localStorage.removeItem(key);
  } catch (error) {
    warnStorageFallback(error);
  }
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
  const user = getUsers().find((entry) => entry.email === email && entry.password === password);
  if (!user) {
    toast("Demo account unavailable.");
    return;
  }
  if (!isUserAccessApproved(user)) {
    toast("This account is pending admin approval.");
    return;
  }
  if (await shouldForceRefreshAfterSignIn()) {
    return;
  }

  save(STORAGE_KEYS.currentUserId, user.id);
  navigate(user.role === "admin" ? "admin" : "dashboard");
}

async function logout() {
  const offlinePromise = markCurrentUserOffline().catch(() => {});
  const authClient = getSupabaseAuthClient();
  const signOutPromise = authClient
    ? authClient.auth.signOut().catch((error) => {
        console.warn("Supabase sign-out failed.", error?.message || error);
      })
    : Promise.resolve();

  syncPresenceRuntime(null);
  clearAdminPresencePolling();
  clearAdminDashboardPolling();
  removeStorageKey(STORAGE_KEYS.currentUserId);
  setGoogleOAuthPendingState(false);
  state.sessionId = null;
  state.reviewSessionId = null;
  state.reviewIndex = 0;
  navigate("landing");
  toast("Logged out.");
  Promise.allSettled([offlinePromise, signOutPromise]).catch(() => {});
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

function isSubmittedResponseCorrect(question, response) {
  if (!question || !response || !response.submitted) {
    return false;
  }
  const selected = Array.isArray(response.selected) ? [...response.selected].sort() : [];
  const correct = Array.isArray(question.correct) ? [...question.correct].sort() : [];
  if (!selected.length || !correct.length) {
    return false;
  }
  return arraysEqual(selected, correct);
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
    Object.values(STORAGE_KEYS).forEach((key) => removeStorageKey(key));
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
