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
const APP_VERSION = String(document.querySelector('meta[name="app-version"]')?.getAttribute("content") || "2026-02-13.4").trim();
const RELATIONAL_READY_CACHE_MS = 45000;
const ADMIN_DATA_REFRESH_MS = 15000;

const state = {
  route: "landing",
  sessionId: null,
  reviewSessionId: null,
  reviewIndex: 0,
  adminEditQuestionId: null,
  adminFilters: {
    course: "",
    topic: "",
  },
  adminPage: "dashboard",
  adminCurriculumYear: 1,
  adminCurriculumSemester: 1,
  adminEditorCourse: "",
  adminEditorTopic: "",
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
  skipNextRouteAnimation: false,
  adminDataRefreshing: false,
  adminDataLastSyncAt: 0,
  adminDataSyncError: "",
};

let appVersionCheckPromise = null;

const SUPABASE_CONFIG = {
  url: window.__SUPABASE_CONFIG?.url || "",
  anonKey: window.__SUPABASE_CONFIG?.anonKey || "",
  enabled: window.__SUPABASE_CONFIG?.enabled !== false,
};

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
};

let timerHandle = null;
let lastRenderedRoute = null;

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

const DEMO_ADMIN_EMAIL = "admin@o6umed.local";
const DEMO_STUDENT_EMAIL = "student@o6umed.local";
const FORCED_ADMIN_EMAILS = new Set(["code.youssefaayoub@gmail.com"]);

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
    localStorage.removeItem(STORAGE_KEYS.appVersionForced);
  }
}

async function fetchPublishedAppVersion() {
  try {
    const checkUrl = new URL(window.location.href);
    checkUrl.searchParams.set("__app_version_check", String(Date.now()));
    const response = await fetch(checkUrl.toString(), {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
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
        localStorage.removeItem(STORAGE_KEYS.appVersionForced);
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

async function init() {
  seedData();
  initVersionTracking();
  hydrateSessionUiPreferences();
  bindGlobalEvents();
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
  render();
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

    const syncResult = await hydrateSupabaseSyncKeys(GLOBAL_SYNC_KEYS);
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

async function initSupabaseAuth() {
  if (!SUPABASE_CONFIG.enabled || !SUPABASE_CONFIG.url || !SUPABASE_CONFIG.anonKey || !window.supabase?.createClient) {
    return;
  }

  try {
    supabaseAuth.client = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
    supabaseAuth.enabled = true;
    if (supabaseSync.enabled) {
      supabaseSync.client = supabaseAuth.client;
    }

    const { data, error } = await supabaseAuth.client.auth.getSession();
    if (error) {
      console.warn("Supabase auth session bootstrap failed.", error.message);
    } else if (data?.session?.user) {
      let localUser = upsertLocalUserFromAuth(data.session.user);
      localUser = await refreshLocalUserFromRelationalProfile(data.session.user, localUser);
      await ensureRelationalSyncReady().catch((syncError) => {
        console.warn("Relational sync initialization failed.", syncError?.message || syncError);
      });
      if (localUser && !isUserAccessApproved(localUser)) {
        localStorage.removeItem(STORAGE_KEYS.currentUserId);
        await supabaseAuth.client.auth.signOut().catch(() => {});
      } else if (localUser) {
        if (await enforceRefreshAfterSignIn()) {
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
    }

    supabaseAuth.client.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        let localUser = upsertLocalUserFromAuth(session.user);
        localUser = await refreshLocalUserFromRelationalProfile(session.user, localUser);
        await ensureRelationalSyncReady().catch((syncError) => {
          console.warn("Relational sync initialization failed.", syncError?.message || syncError);
        });
        if (localUser && !isUserAccessApproved(localUser)) {
          localStorage.removeItem(STORAGE_KEYS.currentUserId);
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
        if (event === "SIGNED_IN" && (await enforceRefreshAfterSignIn())) {
          return;
        }
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
            navigate(current.role === "admin" ? "admin" : "dashboard");
            return;
          }
        }
        hydrateUserScopedSupabaseState(localUser).catch((hydrateError) => {
          console.warn("Could not hydrate user scoped data.", hydrateError?.message || hydrateError);
        });
        render();
        return;
      }

      if (event === "SIGNED_OUT") {
        resetRelationalSyncState();
        state.adminDataRefreshing = false;
        state.adminDataLastSyncAt = 0;
        state.adminDataSyncError = "";
        localStorage.removeItem(STORAGE_KEYS.currentUserId);
        const privateRoutes = new Set([
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
  } catch (error) {
    console.warn("Supabase auth unavailable. Falling back to local auth only.", error);
    supabaseAuth.enabled = false;
    supabaseAuth.client = null;
  }
}

async function refreshLocalUserFromRelationalProfile(authUser, fallbackUser = null) {
  if (!authUser?.id) {
    return fallbackUser;
  }

  const localUser = fallbackUser || upsertLocalUserFromAuth(authUser);
  const ready = await ensureRelationalSyncReady().catch(() => false);
  if (!ready) {
    return localUser;
  }

  const client = getRelationalClient();
  if (!client) {
    return localUser;
  }

  const { data: profile, error } = await client
    .from("profiles")
    .select("id,full_name,email,phone,role,approved,academic_year,academic_semester,created_at")
    .eq("id", authUser.id)
    .maybeSingle();
  if (error || !profile) {
    return localUser;
  }

  const role = String(profile.role || "student") === "admin" ? "admin" : "student";
  const year = role === "student" ? sanitizeAcademicYear(profile.academic_year || localUser?.academicYear || 1) : null;
  const semester =
    role === "student" ? sanitizeAcademicSemester(profile.academic_semester || localUser?.academicSemester || 1) : null;
  const normalizedEmail = String(profile.email || authUser.email || localUser?.email || "").trim().toLowerCase();

  return upsertLocalUserFromAuth(authUser, {
    name: String(profile.full_name || "").trim() || localUser?.name || "Student",
    email: normalizedEmail,
    phone: String(profile.phone || "").trim(),
    role,
    academicYear: year,
    academicSemester: semester,
    isApproved: Boolean(profile.approved),
    approvedAt: profile.approved ? localUser?.approvedAt || profile.created_at || nowISO() : null,
    approvedBy: profile.approved ? localUser?.approvedBy || "admin" : null,
    verified: Boolean(authUser.email_confirmed_at || authUser.confirmed_at || localUser?.verified || false),
  });
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
  return user.isApproved !== false;
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
  const indexByEmail = users.findIndex((entry) => entry.email.toLowerCase() === email);
  const idx = indexByAuthId >= 0 ? indexByAuthId : indexByEmail;
  const previous = idx >= 0 ? users[idx] : null;

  const fallbackName = email.includes("@") ? email.split("@")[0] : "Student";
  const nextName = String(profileOverrides.name || authUser.user_metadata?.full_name || previous?.name || fallbackName).trim();
  const nextRole = isForcedAdminEmail(email)
    ? "admin"
    : (previous?.role || profileOverrides.role || "student") === "admin"
      ? "admin"
      : "student";
  const nextPhone = String(profileOverrides.phone || authUser.user_metadata?.phone_number || previous?.phone || "").trim();

  const nextYear =
    nextRole === "student"
      ? sanitizeAcademicYear(profileOverrides.academicYear || previous?.academicYear || authUser.user_metadata?.academic_year || 1)
      : null;
  const nextSemester =
    nextRole === "student"
      ? sanitizeAcademicSemester(
          profileOverrides.academicSemester || previous?.academicSemester || authUser.user_metadata?.academic_semester || 1,
        )
      : null;

  let nextCourses;
  if (nextRole === "student") {
    const overrideCourses = Array.isArray(profileOverrides.assignedCourses) ? profileOverrides.assignedCourses : [];
    const requestedCourses = overrideCourses.length
      ? overrideCourses
      : Array.isArray(previous?.assignedCourses)
        ? previous.assignedCourses
        : [];
    const allowedCourses = getCurriculumCourses(nextYear, nextSemester);
    nextCourses = sanitizeCourseAssignments(requestedCourses.filter((course) => allowedCourses.includes(course)));
    if (!nextCourses.length) {
      nextCourses = [...allowedCourses];
    }
  } else {
    const allCourses = Object.keys(QBANK_COURSE_TOPICS);
    nextCourses = sanitizeCourseAssignments(previous?.assignedCourses || allCourses);
    if (!nextCourses.length) {
      nextCourses = [...allCourses];
    }
  }

  const nextIsApproved =
    nextRole === "admin"
      ? true
      : typeof profileOverrides.isApproved === "boolean"
        ? profileOverrides.isApproved
        : typeof previous?.isApproved === "boolean"
          ? previous.isApproved
          : false;

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
    approvedBy: nextIsApproved ? profileOverrides.approvedBy || previous?.approvedBy || (nextRole === "admin" ? "system" : null) : null,
    assignedCourses: nextCourses,
    academicYear: nextRole === "student" ? nextYear : null,
    academicSemester: nextRole === "student" ? nextSemester : null,
    createdAt: previous?.createdAt || nowISO(),
    supabaseAuthId: authUser.id,
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

function saveLocalOnly(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
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
    return false;
  }

  const now = Date.now();
  if (!force && relationalSync.readyCheckedAt && (now - relationalSync.readyCheckedAt) < RELATIONAL_READY_CACHE_MS) {
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
        return false;
      }
    }

    relationalSync.enabled = true;
    relationalSync.readyCheckedAt = Date.now();
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
  const { data: existingRows, error: existingError } = await client.from("profiles").select("id").in("id", ids);
  if (existingError) {
    return { ok: false, message: existingError.message || "Could not read profile rows before update." };
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

  const { data: updatedRows, error } = await client
    .from("profiles")
    .update({ approved: targetApproved })
    .in("id", targetIds)
    .select("id,approved");
  if (error) {
    return { ok: false, message: error.message || "Could not update profile approval in database." };
  }

  const appliedById = new Map((updatedRows || []).map((row) => [row.id, Boolean(row.approved)]));
  const unresolvedIds = targetIds.filter((id) => appliedById.get(id) !== targetApproved);
  if (unresolvedIds.length) {
    const { data: verifyRows, error: verifyError } = await client
      .from("profiles")
      .select("id,approved")
      .in("id", unresolvedIds);
    if (verifyError) {
      return {
        ok: false,
        message: verifyError.message || "Could not verify profile approval status after update.",
      };
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

  const { data: courses, error: coursesError } = await client
    .from("courses")
    .select("id,course_name,course_code,academic_year,academic_semester,is_active")
    .order("academic_year", { ascending: true })
    .order("academic_semester", { ascending: true })
    .order("course_name", { ascending: true });
  if (coursesError) {
    return;
  }

  const { data: topics, error: topicsError } = await client
    .from("course_topics")
    .select("course_id,topic_name,sort_order,is_active")
    .order("sort_order", { ascending: true })
    .order("topic_name", { ascending: true });
  if (topicsError) {
    return;
  }

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

async function loadBackupUsersFromSyncStore() {
  const client = supabaseSync.client || getRelationalClient();
  if (!client) {
    return [];
  }

  let tableName = supabaseSync.tableName;
  let keyColumn = supabaseSync.storageKeyColumn;
  if (!tableName || !keyColumn) {
    const shape = await detectSupabaseStorageShape(client);
    if (!shape) {
      return [];
    }
    tableName = shape.tableName;
    keyColumn = shape.storageKeyColumn;
  }

  const candidates = getSyncQueryCandidates(STORAGE_KEYS.users, "");
  if (!candidates.length) {
    return [];
  }

  const { data, error } = await client
    .from(tableName)
    .select(`${keyColumn},payload,updated_at`)
    .in(keyColumn, candidates)
    .order("updated_at", { ascending: false })
    .limit(5);
  if (error || !Array.isArray(data)) {
    return [];
  }

  for (const row of data) {
    if (Array.isArray(row?.payload)) {
      return row.payload;
    }
  }
  return [];
}

async function hydrateRelationalProfiles(currentUser) {
  const client = getRelationalClient();
  if (!client || !relationalSync.enabled) {
    return;
  }

  const usersBefore = getUsers();
  const isAdmin = currentUser.role === "admin";
  let profileQuery = client
    .from("profiles")
    .select("id,full_name,email,phone,role,approved,academic_year,academic_semester,created_at");
  if (!isAdmin) {
    profileQuery = profileQuery.eq("id", currentUser.supabaseAuthId);
  }
  const { data: profiles, error } = await profileQuery;
  if (error) {
    return;
  }
  const profileRows = Array.isArray(profiles) ? profiles : [];
  if (!profileRows.length) {
    const hasLocalRelationalUsers = usersBefore.some((entry) => isUuidValue(entry?.supabaseAuthId));
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

  const allCourses = [...CURRICULUM_COURSE_LIST];
  const localByAuthId = new Map(usersBefore.filter((entry) => entry.supabaseAuthId).map((entry) => [entry.supabaseAuthId, entry]));
  const mapped = profileRows.map((profile) => {
    const existing = localByAuthId.get(profile.id);
    const role = String(profile.role || "student") === "admin" ? "admin" : "student";
    const year = role === "student" ? sanitizeAcademicYear(profile.academic_year || 1) : null;
    const semester = role === "student" ? sanitizeAcademicSemester(profile.academic_semester || 1) : null;
    return {
      id: profile.id,
      name: String(profile.full_name || "").trim() || existing?.name || "Student",
      email: String(profile.email || "").trim().toLowerCase(),
      password: existing?.password || "",
      phone: String(profile.phone || "").trim(),
      role,
      verified: true,
      isApproved: Boolean(profile.approved),
      approvedAt: profile.approved ? existing?.approvedAt || profile.created_at || nowISO() : null,
      approvedBy: existing?.approvedBy || null,
      assignedCourses: role === "student" ? getCurriculumCourses(year || 1, semester || 1) : [...allCourses],
      academicYear: year,
      academicSemester: semester,
      createdAt: existing?.createdAt || profile.created_at || nowISO(),
      supabaseAuthId: profile.id,
    };
  });

  const mappedAuthIds = new Set(mapped.map((entry) => String(entry.supabaseAuthId || "").trim()).filter(Boolean));
  const preserveUnmappedRelationalUsers = isAdmin && profileRows.length <= 1;
  const backupUsers = preserveUnmappedRelationalUsers ? await loadBackupUsersFromSyncStore() : [];
  const preservedRelationalMap = new Map();
  [...backupUsers, ...usersBefore].forEach((entry) => {
    const authId = String(entry?.supabaseAuthId || "").trim();
    if (!isUuidValue(authId) || mappedAuthIds.has(authId) || preservedRelationalMap.has(authId)) {
      return;
    }
    preservedRelationalMap.set(authId, entry);
  });
  const preservedRelational = preserveUnmappedRelationalUsers
    ? Array.from(preservedRelationalMap.values())
    : [];
  const preservedLocalOnly = usersBefore.filter((entry) => !entry.supabaseAuthId && !isLegacyDemoUser(entry));
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
  const courses = await client.from("courses").select("id,course_name");
  if (courses.error) {
    return;
  }
  const topics = await client.from("course_topics").select("id,course_id,topic_name");
  if (topics.error) {
    return;
  }
  let questionsResult = await client
    .from("questions")
    .select("id,external_id,course_id,topic_id,author_id,stem,explanation,objective,difficulty,status,created_at")
    .order("created_at", { ascending: true });
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
        const retryResult = await client
          .from("questions")
          .select("id,external_id,course_id,topic_id,author_id,stem,explanation,objective,difficulty,status,created_at")
          .order("created_at", { ascending: true });
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

  const questionIds = (questionsResult.data || []).map((question) => question.id);
  const choicesResult = questionIds.length
    ? await client
        .from("question_choices")
        .select("question_id,choice_label,choice_text,is_correct")
        .in("question_id", questionIds)
    : { data: [], error: null };
  if (choicesResult.error) {
    return;
  }

  const courseById = Object.fromEntries((courses.data || []).map((course) => [course.id, String(course.course_name || "").trim()]));
  const topicById = Object.fromEntries((topics.data || []).map((topic) => [topic.id, String(topic.topic_name || "").trim()]));
  const authorById = Object.fromEntries(users.filter((entry) => entry.supabaseAuthId).map((entry) => [entry.supabaseAuthId, entry.name]));
  const choicesByQuestionId = {};
  (choicesResult.data || []).forEach((choice) => {
    if (!choicesByQuestionId[choice.question_id]) {
      choicesByQuestionId[choice.question_id] = [];
    }
    choicesByQuestionId[choice.question_id].push(choice);
  });

  const mappedQuestions = (questionsResult.data || []).map((question) => {
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

    return {
      id: String(question.external_id || question.id),
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
      explanationImage: "",
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
  if (currentUser.role !== "admin") {
    blocksQuery = blocksQuery.eq("user_id", currentUser.supabaseAuthId);
  }
  const { data: blocks, error: blocksError } = await blocksQuery.order("updated_at", { ascending: false }).limit(5000);
  if (blocksError) {
    return;
  }

  const blockIds = (blocks || []).map((block) => block.id);
  const { data: items, error: itemsError } = blockIds.length
    ? await client.from("test_block_items").select("block_id,position,question_id").in("block_id", blockIds).order("position")
    : { data: [], error: null };
  if (itemsError) {
    return;
  }
  const { data: responses, error: responsesError } = blockIds.length
    ? await client
        .from("test_responses")
        .select("block_id,question_id,selected_choice_labels,flagged,notes,submitted,answered_at")
        .in("block_id", blockIds)
    : { data: [], error: null };
  if (responsesError) {
    return;
  }

  const localUserIdByAuth = Object.fromEntries(allUsers.filter((entry) => entry.supabaseAuthId).map((entry) => [entry.supabaseAuthId, entry.id]));
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

  saveLocalOnly(STORAGE_KEYS.sessions, mappedSessions);
}

function getSyncScopeForUser(user = null) {
  const current = user || getCurrentUser();
  const scope = String(current?.supabaseAuthId || "").trim();
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
      localStorage.setItem(storageKey, JSON.stringify(payload));
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

async function flushRelationalWrites() {
  if (!relationalSync.enabled || !relationalSync.pendingWrites.size || relationalSync.flushing) {
    clearRelationalFlushTimer();
    return;
  }

  clearRelationalFlushTimer();
  relationalSync.flushing = true;
  const entries = Array.from(relationalSync.pendingWrites.entries());
  relationalSync.pendingWrites.clear();

  for (const [storageKey, payload] of entries) {
    try {
      await syncRelationalKey(storageKey, payload);
    } catch (error) {
      console.warn(`Relational sync failed for ${storageKey}.`, error?.message || error);
      relationalSync.pendingWrites.set(storageKey, payload);
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

  const users = Array.isArray(usersPayload) ? usersPayload : [];
  const rows = users
    .filter((user) => isUuidValue(user?.supabaseAuthId))
    .map((user) => ({
      id: user.supabaseAuthId,
      full_name: String(user.name || "").trim() || "Student",
      email: String(user.email || "").trim().toLowerCase(),
      phone: String(user.phone || "").trim() || null,
      role: user.role === "admin" ? "admin" : "student",
      approved: Boolean(isUserAccessApproved(user)),
      academic_year: user.role === "student" ? sanitizeAcademicYear(user.academicYear || 1) : null,
      academic_semester: user.role === "student" ? sanitizeAcademicSemester(user.academicSemester || 1) : null,
    }));
  if (!rows.length) {
    return;
  }

  const { error } = await client.from("profiles").upsert(rows, { onConflict: "id" });
  if (error) {
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
    const { error: upsertCoursesError } = await client
      .from("courses")
      .upsert(desiredCourses, { onConflict: "course_name,academic_year,academic_semester" });
    if (upsertCoursesError) {
      throw upsertCoursesError;
    }
  }

  const { data: allCourses, error: allCoursesError } = await client
    .from("courses")
    .select("id,course_name,academic_year,academic_semester,is_active");
  if (allCoursesError) {
    throw allCoursesError;
  }

  const desiredCourseKeys = new Set(
    desiredCourses.map((course) => `${course.course_name}::${course.academic_year}::${course.academic_semester}`),
  );

  const deactivateCourseIds = (allCourses || [])
    .filter((course) => course.is_active)
    .filter((course) => !desiredCourseKeys.has(`${course.course_name}::${course.academic_year}::${course.academic_semester}`))
    .map((course) => course.id);
  if (deactivateCourseIds.length) {
    await client.from("courses").update({ is_active: false }).in("id", deactivateCourseIds);
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
    const { error: upsertTopicsError } = await client
      .from("course_topics")
      .upsert(desiredTopicRows, { onConflict: "course_id,topic_name" });
    if (upsertTopicsError) {
      throw upsertTopicsError;
    }
  }

  const { data: allTopics, error: allTopicsError } = await client
    .from("course_topics")
    .select("id,course_id,topic_name,is_active");
  if (allTopicsError) {
    throw allTopicsError;
  }
  const desiredTopicKeys = new Set(desiredTopicRows.map((topic) => `${topic.course_id}::${topic.topic_name}`));
  const deactivateTopicIds = (allTopics || [])
    .filter((topic) => topic.is_active)
    .filter((topic) => !desiredTopicKeys.has(`${topic.course_id}::${topic.topic_name}`))
    .map((topic) => topic.id);
  if (deactivateTopicIds.length) {
    await client.from("course_topics").update({ is_active: false }).in("id", deactivateTopicIds);
  }
}

async function syncQuestionsToRelational(questionsPayload) {
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
  if (payloadExternalIds.length) {
    const { data: existingRows, error: existingRowsError } = await client
      .from("questions")
      .select("id,external_id")
      .in("external_id", payloadExternalIds);
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

  const { data: courses, error: coursesError } = await client.from("courses").select("id,course_name").eq("is_active", true);
  if (coursesError) throw coursesError;
  const { data: topics, error: topicsError } = await client.from("course_topics").select("id,course_id,topic_name").eq("is_active", true);
  if (topicsError) throw topicsError;

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
    const { error: missingTopicsError } = await client
      .from("course_topics")
      .upsert(missingTopics, { onConflict: "course_id,topic_name" });
    if (missingTopicsError) {
      throw missingTopicsError;
    }
    const refreshedTopics = await client.from("course_topics").select("id,course_id,topic_name").eq("is_active", true);
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
      (isUuidValue(question.dbId) && question.dbId)
      || existingByExternalId[externalId]
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
      difficulty: toRelationalDifficulty(question.difficulty),
      status: toRelationalQuestionStatus(question.status),
    });
  });

  if (!upsertRows.length) {
    return;
  }

  const { error: questionsUpsertError } = await client.from("questions").upsert(upsertRows, { onConflict: "external_id" });
  if (questionsUpsertError) {
    throw questionsUpsertError;
  }

  if (currentUser.role === "admin") {
    const externalIdSet = new Set(upsertRows.map((row) => row.external_id));
    const { data: existingQuestions, error: existingQuestionsError } = await client
      .from("questions")
      .select("id,external_id")
      .not("external_id", "is", null);
    if (existingQuestionsError) {
      throw existingQuestionsError;
    }
    const deleteIds = (existingQuestions || [])
      .filter((row) => row.external_id && !externalIdSet.has(row.external_id))
      .map((row) => row.id);
    if (deleteIds.length) {
      await client.from("questions").delete().in("id", deleteIds);
    }
  }

  const externalIds = upsertRows.map((row) => row.external_id).filter(Boolean);
  const { data: persistedQuestions, error: persistedQuestionsError } = await client
    .from("questions")
    .select("id,external_id")
    .in("external_id", externalIds);
  if (persistedQuestionsError) {
    throw persistedQuestionsError;
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

  const questionDbIds = Object.values(dbIdByExternalId);
  if (questionDbIds.length) {
    await client.from("question_choices").delete().in("question_id", questionDbIds);
  }

  const choiceRows = [];
  updatedLocalQuestions.forEach((question) => {
    const dbId = dbIdByExternalId[question.id];
    if (!dbId) return;
    const correct = new Set(Array.isArray(question.correct) ? question.correct.map((entry) => String(entry).toUpperCase()) : []);
    (question.choices || []).forEach((choice) => {
      const label = String(choice.id || "").toUpperCase();
      const text = String(choice.text || "").trim();
      if (!label || !text) return;
      choiceRows.push({
        question_id: dbId,
        choice_label: label,
        choice_text: text,
        is_correct: correct.has(label),
      });
    });
  });
  if (choiceRows.length) {
    const { error: insertChoicesError } = await client.from("question_choices").insert(choiceRows);
    if (insertChoicesError) {
      throw insertChoicesError;
    }
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

  try {
    const curriculum = load(STORAGE_KEYS.curriculum, O6U_CURRICULUM);
    const topics = load(STORAGE_KEYS.courseTopics, COURSE_TOPIC_OVERRIDES);
    await syncCoursesTopicsToRelational(curriculum, topics);
    await syncQuestionsToRelational(questions);
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
  const authIdByLocalUserId = Object.fromEntries(users.filter((entry) => entry.supabaseAuthId).map((entry) => [entry.id, entry.supabaseAuthId]));

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

  const { error: blocksUpsertError } = await client.from("test_blocks").upsert(upsertBlocks, { onConflict: "external_id" });
  if (blocksUpsertError) {
    throw blocksUpsertError;
  }

  const externalIds = upsertBlocks.map((entry) => entry.external_id).filter(Boolean);
  const { data: persistedBlocks, error: persistedBlocksError } = await client
    .from("test_blocks")
    .select("id,external_id")
    .in("external_id", externalIds);
  if (persistedBlocksError) {
    throw persistedBlocksError;
  }
  const blockIdByExternalId = Object.fromEntries((persistedBlocks || []).map((entry) => [entry.external_id, entry.id]));
  const blockIds = Object.values(blockIdByExternalId);

  if (blockIds.length) {
    await client.from("test_responses").delete().in("block_id", blockIds);
    await client.from("test_block_items").delete().in("block_id", blockIds);
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
    const { error: itemsInsertError } = await client.from("test_block_items").insert(itemRows);
    if (itemsInsertError) {
      throw itemsInsertError;
    }
  }
  if (responseRows.length) {
    const { error: responsesInsertError } = await client.from("test_responses").insert(responseRows);
    if (responsesInsertError) {
      throw responsesInsertError;
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
      const shouldApprove = user.role === "admin" ? true : typeof user.isApproved === "boolean" ? user.isApproved : true;
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
        const normalizedYear = sanitizeAcademicYear(user.academicYear || 1);
        const normalizedSemester = sanitizeAcademicSemester(user.academicSemester || 1);
        const semesterCourses = getCurriculumCourses(normalizedYear, normalizedSemester);

        if (user.academicYear !== normalizedYear) {
          user.academicYear = normalizedYear;
          changed = true;
        }
        if (user.academicSemester !== normalizedSemester) {
          user.academicSemester = normalizedSemester;
          changed = true;
        }
        if ((user.assignedCourses || []).join("|") !== semesterCourses.join("|")) {
          user.assignedCourses = semesterCourses;
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
}

function navigate(route, extras = {}) {
  if (route !== "session") {
    state.sessionPanel = null;
    state.sessionMarkerEnabled = false;
    state.calcExpression = "";
  }
  state.route = route;
  Object.assign(state, extras);
  render();
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
  if (!force && !shouldRefreshAdminData(user)) {
    return true;
  }
  if (state.adminDataRefreshing) {
    return false;
  }

  state.adminDataRefreshing = true;
  state.adminDataSyncError = "";
  try {
    const ready = await ensureRelationalSyncReady({ force });
    if (!ready) {
      state.adminDataSyncError = "Relational sync is unavailable.";
      return false;
    }
    await hydrateRelationalCoursesAndTopics();
    await hydrateRelationalProfiles(user);
    await hydrateRelationalQuestions();
    state.adminDataLastSyncAt = Date.now();
    return true;
  } catch (error) {
    state.adminDataSyncError = String(error?.message || "Failed to refresh admin data.");
    return false;
  } finally {
    state.adminDataRefreshing = false;
    if (state.route === "admin") {
      state.skipNextRouteAnimation = true;
      render();
    }
  }
}

function renderAdminLoading() {
  return `
    <section class="panel">
      <h2 class="title">Admin Dashboard</h2>
      <p class="subtle">Syncing latest users and admin data...</p>
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
  }
  const skipTransition = state.skipNextRouteAnimation;
  const routeChanged = lastRenderedRoute !== state.route;
  if (skipTransition) {
    document.body.classList.add("no-panel-animations");
  }

  const privateRoutes = [
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

  if (privateRoutes.includes(state.route) && !user) {
    state.route = "login";
  }

  if (privateRoutes.includes(state.route) && user && !isUserAccessApproved(user)) {
    localStorage.removeItem(STORAGE_KEYS.currentUserId);
    state.route = "login";
    toast("Your account is pending admin approval.");
  }

  if (state.route === "admin" && user?.role !== "admin") {
    state.route = "dashboard";
    toast("Admin role required for this page.");
  }

  if (user?.role === "admin" && state.route !== "admin") {
    state.route = "admin";
  }

  if (state.route === "qbank" || state.route === "builder") {
    state.route = "create-test";
  }

  const isExamWideRoute = state.route === "session" || state.route === "review";
  const isAdminRoute = state.route === "admin";
  document.body.classList.toggle("is-session-route", isExamWideRoute);
  appEl.classList.toggle("is-session", isExamWideRoute);
  appEl.classList.toggle("is-admin", isAdminRoute);
  topbarEl?.classList.toggle("hidden", false);

  syncTopbar();

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
        refreshAdminDataSnapshot(user, { force: !state.adminDataLastSyncAt }).catch((error) => {
          console.warn("Admin data refresh failed.", error?.message || error);
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

  if (skipTransition) {
    lastRenderedRoute = state.route;
    state.skipNextRouteAnimation = false;
    window.requestAnimationFrame(() => {
      document.body.classList.remove("no-panel-animations");
    });
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
  document.body.classList.add("is-routing");
  applyStaggerIndices();

  appEl.classList.remove("route-enter", "route-enter-active");
  void appEl.offsetWidth;
  appEl.classList.add("route-enter");

  window.requestAnimationFrame(() => {
    appEl.classList.add("route-enter-active");
  });

  window.setTimeout(() => {
    appEl.classList.remove("route-enter", "route-enter-active");
    document.body.classList.remove("is-routing");
  }, 380);
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
        </form>
        <div class="auth-inline">
          <span class="text">Need an account?</span>
          <button data-nav="signup" class="btn ghost" type="button">Sign up</button>
        </div>
      </section>
    `;
  }

  if (mode === "signup") {
    const defaultYear = 1;
    const defaultSemester = 1;
    const defaultCourses = getCurriculumCourses(defaultYear, defaultSemester);
    return `
      <section class="panel" style="max-width: 680px; margin-inline: auto;">
        <h2 class="title">Create Account</h2>
        <p class="subtle">Student sign-up with year, semester, and course enrollment.</p>
        <form id="signup-form" class="auth-form" style="margin-top: 1rem;" method="post" autocomplete="on">
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
              <select name="academicYear" id="signup-academic-year">
                <option value="1">Year 1</option>
                <option value="2">Year 2</option>
                <option value="3">Year 3</option>
                <option value="4">Year 4</option>
                <option value="5">Year 5</option>
              </select>
            </label>
            <label>Semester
              <select name="academicSemester" id="signup-academic-semester">
                <option value="1">Semester 1</option>
                <option value="2">Semester 2</option>
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

  if (mode === "login") {
    const form = document.getElementById("login-form");
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
          const { data, error } = await authClient.auth.signInWithPassword({ email, password });
          if (!error && data?.user) {
            let user = upsertLocalUserFromAuth(data.user);
            user = await refreshLocalUserFromRelationalProfile(data.user, user);
            if (!user) {
              toast("Could not map account profile after login.");
              return;
            }
            if (!isUserAccessApproved(user)) {
              localStorage.removeItem(STORAGE_KEYS.currentUserId);
              await authClient.auth.signOut().catch(() => {});
              toast("Your account is pending admin approval.");
              return;
            }
            if (await enforceRefreshAfterSignIn()) {
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
            if (await enforceRefreshAfterSignIn()) {
              return;
            }
            save(STORAGE_KEYS.currentUserId, localDemoUser.id);
            navigate(localDemoUser.role === "admin" ? "admin" : "dashboard");
            toast(`Welcome back, ${localDemoUser.name}.`);
            return;
          }

          toast(error?.message || "Invalid credentials.");
          return;
        }

        const user = getUsers().find((candidate) => candidate.email.toLowerCase() === email && candidate.password === password);
        if (!user) {
          toast("Invalid credentials.");
          return;
        }
        if (!isUserAccessApproved(user)) {
          toast("Your account is pending admin approval.");
          return;
        }
        if (await enforceRefreshAfterSignIn()) {
          return;
        }
        save(STORAGE_KEYS.currentUserId, user.id);
        navigate(user.role === "admin" ? "admin" : "dashboard");
        toast(`Welcome back, ${user.name}.`);
      } finally {
        lockAuthForm(form, false);
      }
    });
    return;
  }

  if (mode === "signup") {
    const form = document.getElementById("signup-form");
    const yearSelect = document.getElementById("signup-academic-year");
    const semesterSelect = document.getElementById("signup-academic-semester");
    const courseOptionsEl = document.getElementById("signup-course-options");
    const courseHelpEl = document.getElementById("signup-course-help");
    const selectAllCoursesBtn = document.getElementById("signup-select-all-courses");
    const clearCoursesBtn = document.getElementById("signup-clear-courses");

    const getSelectedSignupCourses = () =>
      Array.from(form?.querySelectorAll("input[name='signupCourses']:checked") || []).map((input) => input.value);

    const renderSignupCourseOptions = (preferred = []) => {
      if (!courseOptionsEl) return;
      const year = sanitizeAcademicYear(yearSelect?.value || 1);
      const semester = sanitizeAcademicSemester(semesterSelect?.value || 1);
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

    renderSignupCourseOptions();

    form?.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (form.dataset.submitting === "1") {
        return;
      }
      const data = new FormData(form);
      const users = getUsers();
      const name = String(data.get("name") || "").trim();
      const email = String(data.get("email") || "").trim().toLowerCase();
      const password = String(data.get("password") || "");
      const confirmPassword = String(data.get("confirmPassword") || "");
      const phone = String(data.get("phone") || "").trim();
      const normalizedPhoneDigits = phone.replace(/\D/g, "");
      const inviteCode = String(data.get("inviteCode") || "").trim();
      const academicYear = sanitizeAcademicYear(data.get("academicYear") || 1);
      const academicSemester = sanitizeAcademicSemester(data.get("academicSemester") || 1);
      const availableCourses = getCurriculumCourses(academicYear, academicSemester);
      const selectedCourses = getSelectedSignupCourses().filter((course) => availableCourses.includes(course));
      const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

      if (!name || !email || !password || !phone) {
        toast("Name, email, password, and phone number are required.");
        return;
      }
      if (!emailIsValid) {
        toast("Please enter a valid email address.");
        return;
      }
      if (normalizedPhoneDigits.length < 8) {
        toast("Phone number is required and must be valid.");
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
        if (authClient) {
          const { data: authData, error } = await authClient.auth.signUp({
            email,
            password,
            options: {
              data: {
                full_name: name,
                academic_year: academicYear,
                academic_semester: academicSemester,
                phone_number: phone,
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
            phone,
            verified: Boolean(authData.session),
            isApproved: false,
            approvedAt: null,
            approvedBy: null,
          });
          if (!user) {
            toast("Account created but profile mapping failed.");
            return;
          }

          if (authData.session) {
            await authClient.auth.signOut().catch(() => {});
          }
          localStorage.removeItem(STORAGE_KEYS.currentUserId);
          toast("Account created. Await admin approval before first login.");
          navigate("login");
          return;
        }

        const user = {
          id: makeId("u"),
          name,
          email,
          password,
          phone,
          role: "student",
          verified: true,
          isApproved: false,
          approvedAt: null,
          approvedBy: null,
          assignedCourses: selectedCourses,
          academicYear,
          academicSemester,
          createdAt: nowISO(),
        };

        users.push(user);
        save(STORAGE_KEYS.users, users);
        localStorage.removeItem(STORAGE_KEYS.currentUserId);
        toast("Account created. Await admin approval before first login.");
        navigate("login");
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
        const redirectTo = `${window.location.origin}${window.location.pathname}`;
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

function renderDashboard() {
  const user = getCurrentUser();
  const questions = getPublishedQuestionsForUser(user);
  const sessions = getSessionsForUser(user.id);
  const completed = sessions.filter((session) => session.status === "completed");
  const stats = getUserStats(user.id);

  return `
    <section class="panel">
      <p class="kicker">Welcome back</p>
      <div class="flex-between">
        <h2 class="title">${escapeHtml(user.name)}'s Dashboard</h2>
        <div class="stack">
          <button class="btn" data-nav="create-test">Create a Test</button>
        </div>
      </div>
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
        ${renderWeakAreas(user.id)}
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

function renderWeakAreas(userId) {
  const weak = getWeakAreas(userId);
  if (!weak.length) {
    return `<p class="subtle">No weak areas yet. Complete a block first.</p>`;
  }

  const items = weak
    .slice(0, 4)
    .map((entry) => `<p><b>${escapeHtml(entry.topic)}</b> - ${entry.accuracy}% accuracy (${entry.total} q)</p>`)
    .join("");
  return items;
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
            <input name="count" type="number" min="1" max="500" step="1" value="20" />
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

    const requestedCount = Math.floor(Number(data.get("count") || 20));
    const count = Math.min(500, Math.max(1, Number.isFinite(requestedCount) ? requestedCount : 20));
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

  const questions = getQuestions();
  const total = session.questionIds.length;
  const currentQid = session.questionIds[session.currentIndex];
  const question = questions.find((entry) => entry.id === currentQid);
  const response = session.responses[currentQid];

  if (!question || !response) {
    return `
      <section class="panel">
        <h2 class="title">Session data error</h2>
        <p class="subtle">This session has missing question records. Create a new test.</p>
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

                ${isSubmitted ? "" : `<div class="stack exam-answer-actions"><button class="btn" data-action="submit-answer">Submit answer</button></div>`}
              </article>
              ${isSubmitted ? renderInlineExplanationPane(question, isCorrect) : ""}
            </section>

            <aside class="exam-nav-panel">
              <h3>Quiz navigation</h3>
              <div class="exam-nav-grid">${sideRows}</div>
              <button class="exam-nav-link" data-action="submit-session">Finish review</button>
              <button class="btn ghost exam-nav-new" data-nav="create-test">Start a new preview</button>
            </aside>
          </div>
        </section>
      </div>
    </section>
  `;
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
      const selected = Array.from(appEl.querySelectorAll("input[name='answer']:checked")).map((entry) => entry.value);
      response.selected = selected;
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
                <div class="exam-stem">
                  ${stemLines.map((line) => `<p class="exam-line">${escapeHtml(line)}</p>`).join("")}
                </div>

                <div class="exam-answers">
                  ${choicesHtml}
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
  const stats = getUserStats(user.id, selectedCourse);
  const topicStats = getTopicStats(user.id, selectedCourse);
  const weak = getWeakAreas(user.id, selectedCourse);

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
      <form id="analytics-course-form" style="margin-top: 0.8rem; max-width: 520px;">
        <label>Course
          <select id="analytics-course-select" name="analyticsCourse">
            ${availableCourses
              .map((course) => `<option value="${escapeHtml(course)}" ${course === selectedCourse ? "selected" : ""}>${escapeHtml(course)}</option>`)
              .join("")}
          </select>
        </label>
      </form>
      <small class="subtle">Showing analytics for <b>${escapeHtml(selectedCourse)}</b>.</small>
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
                .map((entry) => `<p><b>${escapeHtml(entry.topic)}</b> - ${entry.accuracy}% (${entry.total} q)</p>`)
                .join("")
            : `<p class="subtle">No weak areas until you complete a block.</p>`
        }
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
}

function renderProfile() {
  const user = getCurrentUser();
  const queue = load(STORAGE_KEYS.incorrectQueue, {})[user.id] || [];

  return `
    <section class="panel">
      <h2 class="title">Profile & Settings</h2>
      <p class="subtle">Manage account details and credentials.</p>
      <div class="grid-2" style="margin-top: 0.9rem;">
        <form id="profile-form" class="card">
          <h4>Account</h4>
          <label>Name <input name="name" value="${escapeHtml(user.name)}" required /></label>
          <label>Email <input name="email" type="email" value="${escapeHtml(user.email)}" required /></label>
          <label>New password <input name="password" type="password" minlength="6" /></label>
          <button class="btn" type="submit">Save changes</button>
        </form>
        <article class="card">
          <h4>Study Queue</h4>
          <p><b>Incorrect queue size:</b> ${queue.length}</p>
          <p class="subtle">Use source = Incorrect when creating blocks to target weak items.</p>
          <hr />
          <p><b>Role:</b> ${escapeHtml(user.role)}</p>
          ${user.role === "student" ? `<p><b>Year/Semester:</b> ${user.academicYear || 1} / ${user.academicSemester || 1}</p>` : ""}
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

    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim().toLowerCase();
    const password = String(data.get("password") || "");

    const emailConflict = users.some((entry) => entry.email.toLowerCase() === email && entry.id !== user.id);
    if (emailConflict) {
      toast("Email already used by another account.");
      return;
    }

    const authClient = getSupabaseAuthClient();
    if (authClient && user.supabaseAuthId) {
      const updates = { data: { full_name: name } };
      if (email && email !== user.email) {
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
  const activeAdminPage = ["dashboard", "users", "courses", "questions"].includes(state.adminPage) ? state.adminPage : "dashboard";
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
    const users = getUsers().sort((a, b) => a.name.localeCompare(b.name));
    const pendingCount = users.filter((entry) => entry.role === "student" && !isUserAccessApproved(entry)).length;
    const accountRows = users
      .map((account) => {
        const year = account.role === "student" ? sanitizeAcademicYear(account.academicYear || 1) : null;
        const semester = account.role === "student" ? sanitizeAcademicSemester(account.academicSemester || 1) : null;
        const isApproved = isUserAccessApproved(account);
        const visibleCourses =
          account.role === "student"
            ? getCurriculumCourses(year || 1, semester || 1)
            : sanitizeCourseAssignments(account.assignedCourses || allCourses);
        const compactCourses = visibleCourses.slice(0, 2).map((course) => (course.length > 42 ? `${course.slice(0, 39)}...` : course));
        const coursePreview =
          visibleCourses.length > 2 ? `${compactCourses.join(", ")} +${visibleCourses.length - 2} more` : compactCourses.join(", ");
        const isSelf = account.id === user.id;
        const isLockedAdmin = isForcedAdminEmail(account.email);
        return `
          <tr data-user-id="${escapeHtml(account.id)}">
            <td class="admin-user-account">
              <b>${escapeHtml(account.name)}</b><br />
              <small>${escapeHtml(account.email)}</small><br />
              <small>${escapeHtml(account.phone || "No phone")}</small><br />
              <small><span class="badge ${isApproved ? "good" : "bad"}">${isApproved ? "approved" : "pending"}</span></small>
            </td>
            <td><span class="badge ${account.role === "admin" ? "good" : "neutral"}">${escapeHtml(account.role)}</span></td>
            <td>
              ${
                account.role === "student"
                  ? `<select class="admin-mini-select" data-field="academicYear">
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
                <button class="btn ghost admin-btn-sm" data-action="toggle-user-approval" ${account.role === "admin" ? "disabled" : ""}>
                  ${isApproved ? "Suspend access" : "Approve access"}
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
            <p class="subtle" style="margin: 0;">Pending requests: <b>${pendingCount}</b></p>
            <button class="btn" type="button" data-action="approve-all-pending" ${pendingCount ? "" : "disabled"}>Accept all pending</button>
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
                  <button class="btn ghost admin-btn-sm" type="button" data-action="course-question-add">Add question</button>
                  <button class="btn ghost admin-btn-sm" type="button" data-action="course-question-remove" ${(questionCountByCourse[course] || 0) ? "" : "disabled"}>Remove question</button>
                  <button class="btn danger admin-btn-sm" type="button" data-action="course-question-clear" ${(questionCountByCourse[course] || 0) ? "" : "disabled"}>Clear all questions</button>
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
    const importErrorPreview = (importReport?.errors || []).slice(0, 15);

    pageContent = `
      <section class="card admin-section" id="admin-questions-section">
        <h3 style="margin: 0;">Bulk Import</h3>
        <p class="subtle">Upload or paste CSV/JSON and import questions by default course/topic.</p>
        <form id="admin-import-form" style="margin-top: 0.7rem;">
          <div class="form-row">
            <label>
              Default course
              <select name="defaultCourse" id="admin-import-course">
                ${allCourses
                  .map((course) => `<option value="${course}" ${importCourse === course ? "selected" : ""}>${course}</option>`)
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
            <textarea id="admin-import-text" name="importText" placeholder='CSV headers example: stem,choiceA,choiceB,choiceC,choiceD,choiceE,correct,explanation,course,topic,system,difficulty,status,tags'></textarea>
          </label>
          <div class="stack">
            <button class="btn" type="submit">Run bulk import</button>
            <button class="btn ghost" type="button" id="admin-download-template">Download Excel template (.csv)</button>
          </div>
        </form>
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
    `;
  }

  const syncNotice = state.adminDataSyncError
    ? `<div class="card admin-section"><p class="subtle" style="margin:0;">${escapeHtml(state.adminDataSyncError)}</p></div>`
    : "";

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
      if (!["dashboard", "users", "courses", "questions"].includes(page)) {
        return;
      }
      if (state.adminPage === page) {
        return;
      }
      state.adminPage = page;
      state.skipNextRouteAnimation = true;
      render();
    });
  });

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
  curriculumAddForm?.addEventListener("submit", (event) => {
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
    toast("Course added.");
    state.skipNextRouteAnimation = true;
    render();
  });

  appEl.querySelectorAll("[data-action='curriculum-rename']").forEach((button) => {
    button.addEventListener("click", () => {
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
      toast("Course name updated.");
      state.skipNextRouteAnimation = true;
      render();
    });
  });

  appEl.querySelectorAll("[data-action='curriculum-delete']").forEach((button) => {
    button.addEventListener("click", () => {
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
      toast("Course deleted.");
      state.skipNextRouteAnimation = true;
      render();
    });
  });

  const adminCoursesSection = document.getElementById("admin-courses-section");
  adminCoursesSection?.addEventListener("click", (event) => {
    const actionEl = event.target.closest("[data-action]");
    if (!actionEl) return;

    const action = actionEl.getAttribute("data-action");
    if (
      ![
        "course-topic-add",
        "course-topic-rename",
        "course-topic-remove",
        "course-question-add",
        "course-question-remove",
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

    const getCourseQuestions = () =>
      getQuestions().filter((question) => getQbankCourseTopicMeta(question).course === course);

    if (action === "course-question-add") {
      const amountRaw = window.prompt("How many questions do you want to add?", "1");
      if (amountRaw === null) {
        return;
      }
      const amount = Math.floor(Number(amountRaw));
      if (!Number.isFinite(amount) || amount < 1) {
        toast("Enter a valid number greater than 0.");
        return;
      }

      const topic = resolveDefaultTopic(course);
      const author = getCurrentUser()?.name || "Admin";
      const today = new Date().toISOString().slice(0, 10);
      const questions = getQuestions();
      const newEntries = Array.from({ length: Math.min(amount, 200) }, (_, idx) => ({
        id: makeId("q"),
        qbankCourse: course,
        qbankTopic: topic,
        course,
        topic,
        system: course,
        difficulty: "Medium",
        tags: [],
        author,
        dateAdded: today,
        stem: `New question ${idx + 1} for ${course}`,
        choices: [
          { id: "A", text: "Option A" },
          { id: "B", text: "Option B" },
          { id: "C", text: "Option C" },
          { id: "D", text: "Option D" },
          { id: "E", text: "Option E" },
        ],
        correct: ["A"],
        explanation: "Add explanation for this question.",
        objective: "",
        references: "",
        explanationImage: "",
        status: "draft",
      }));

      save(STORAGE_KEYS.questions, [...questions, ...newEntries]);
      toast(`${newEntries.length} draft question(s) added to ${course}.`);
      state.skipNextRouteAnimation = true;
      render();
      return;
    }

    if (action === "course-question-remove") {
      const questions = getQuestions();
      const courseQuestions = getCourseQuestions();
      if (!courseQuestions.length) {
        toast("This course has no questions to remove.");
        return;
      }

      const amountRaw = window.prompt(
        `This course has ${courseQuestions.length} questions. How many do you want to remove?`,
        "1",
      );
      if (amountRaw === null) {
        return;
      }
      const amount = Math.floor(Number(amountRaw));
      if (!Number.isFinite(amount) || amount < 1) {
        toast("Enter a valid number greater than 0.");
        return;
      }

      const toRemove = courseQuestions
        .slice(-Math.min(amount, courseQuestions.length))
        .map((question) => question.id);
      const removeSet = new Set(toRemove);
      const nextQuestions = questions.filter((question) => !removeSet.has(question.id));
      if (state.adminEditQuestionId && removeSet.has(state.adminEditQuestionId)) {
        state.adminEditQuestionId = null;
      }
      save(STORAGE_KEYS.questions, nextQuestions);
      toast(`${removeSet.size} question(s) removed from ${course}.`);
      state.skipNextRouteAnimation = true;
      render();
      return;
    }

    if (action === "course-question-clear") {
      const questions = getQuestions();
      const courseQuestions = getCourseQuestions();
      if (!courseQuestions.length) {
        toast("This course has no questions to clear.");
        return;
      }
      if (!window.confirm(`Clear all ${courseQuestions.length} question(s) from "${course}"?`)) {
        return;
      }

      const removeSet = new Set(courseQuestions.map((question) => question.id));
      const nextQuestions = questions.filter((question) => !removeSet.has(question.id));
      if (state.adminEditQuestionId && removeSet.has(state.adminEditQuestionId)) {
        state.adminEditQuestionId = null;
      }
      save(STORAGE_KEYS.questions, nextQuestions);
      toast(`Cleared ${courseQuestions.length} question(s) from ${course}.`);
      state.skipNextRouteAnimation = true;
      render();
      return;
    }

    const refreshRowTopics = () => {
      const topicsCell = row.querySelector("[data-role='course-topics-cell']");
      if (!topicsCell) return;
      topicsCell.innerHTML = renderAdminCourseTopicControls(course);
    };

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
      toast("Topic added.");
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
      toast("Topic renamed.");
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
    toast("Topic removed.");
  });

  const addUserForm = document.getElementById("admin-add-user-form");
  addUserForm?.addEventListener("submit", (event) => {
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
    toast("User added.");
    render();
  });

  appEl.querySelector("[data-action='approve-all-pending']")?.addEventListener("click", async () => {
    const current = getCurrentUser();
    const users = getUsers();
    const pendingUsers = users.filter((entry) => entry.role === "student" && !isUserAccessApproved(entry));
    const pendingProfileIds = pendingUsers.map((entry) => entry.supabaseAuthId).filter((id) => isUuidValue(id));

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
      const authId = String(entry.supabaseAuthId || "").trim();
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
    toast(
      skippedCount
        ? `${approvedCount} pending account(s) approved. ${skippedCount} skipped (missing database profile).`
        : `${approvedCount} pending account(s) approved.`,
    );
    render();
  });

  appEl.querySelectorAll("[data-action='save-user-enrollment']").forEach((button) => {
    button.addEventListener("click", () => {
      const row = button.closest("tr[data-user-id]");
      const userId = row?.getAttribute("data-user-id");
      if (!row || !userId) {
        return;
      }

      const users = getUsers();
      const idx = users.findIndex((entry) => entry.id === userId);
      if (idx === -1) {
        toast("Account not found.");
        return;
      }

      const role = users[idx].role;
      if (role === "student") {
        const yearSelect = row.querySelector("select[data-field='academicYear']");
        const semesterSelect = row.querySelector("select[data-field='academicSemester']");
        const year = sanitizeAcademicYear(yearSelect?.value || 1);
        const semester = sanitizeAcademicSemester(semesterSelect?.value || 1);

        users[idx].academicYear = year;
        users[idx].academicSemester = semester;
        users[idx].assignedCourses = getCurriculumCourses(year, semester);
      } else {
        users[idx].academicYear = null;
        users[idx].academicSemester = null;
        users[idx].assignedCourses = [...allCourses];
      }

      save(STORAGE_KEYS.users, users);
      toast("Enrollment saved.");
      render();
    });
  });

  appEl.querySelectorAll("[data-action='toggle-user-role']").forEach((button) => {
    button.addEventListener("click", () => {
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
      toast("User role updated.");
      render();
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
      const targetProfileId = users[idx].supabaseAuthId;
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
      toast(nextApproved ? "Account approved." : "Account suspended.");
      render();
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

      let supabaseDeleteWarning = "";
      if (target.supabaseAuthId) {
        const deleteResult = await deleteSupabaseAuthUserAsAdmin(target.supabaseAuthId);
        if (!deleteResult.ok) {
          supabaseDeleteWarning = deleteResult.message || "Could not delete user from Supabase Auth.";
          console.warn("Supabase auth user delete warning:", supabaseDeleteWarning);
        }
        const relationalDeleteResult = await deleteRelationalProfile(target.supabaseAuthId);
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

      if (supabaseDeleteWarning) {
        toast(`User removed locally. Supabase auth delete issue: ${supabaseDeleteWarning}`);
      } else {
        toast("User removed.");
      }
      render();
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

  appEl.querySelectorAll("[data-action='admin-edit']").forEach((button) => {
    button.addEventListener("click", () => {
      state.adminEditQuestionId = button.getAttribute("data-qid");
      const questions = getQuestions();
      const editing = questions.find((entry) => entry.id === state.adminEditQuestionId);
      const meta = editing ? getQbankCourseTopicMeta(editing) : null;
      state.adminEditorCourse = meta?.course || allCourses[0];
      state.adminEditorTopic = meta?.topic || (QBANK_COURSE_TOPICS[state.adminEditorCourse] || [])[0] || "";
      render();
    });
  });

  appEl.querySelectorAll("[data-action='admin-delete']").forEach((button) => {
    button.addEventListener("click", () => {
      const qid = button.getAttribute("data-qid");
      if (!qid) {
        return;
      }

      const confirmDelete = window.confirm(`Delete question ${qid}?`);
      if (!confirmDelete) {
        return;
      }

      const questions = getQuestions().filter((entry) => entry.id !== qid);
      save(STORAGE_KEYS.questions, questions);
      toast("Question deleted.");
      if (state.adminEditQuestionId === qid) {
        state.adminEditQuestionId = null;
      }
      render();
    });
  });

  appEl.querySelector("[data-action='admin-new']")?.addEventListener("click", () => {
    state.adminEditQuestionId = null;
    state.adminEditorCourse = allCourses[0];
    state.adminEditorTopic = (QBANK_COURSE_TOPICS[state.adminEditorCourse] || [])[0] || "";
    render();
  });

  appEl.querySelector("[data-action='admin-cancel']")?.addEventListener("click", () => {
    state.adminEditQuestionId = null;
    state.adminEditorCourse = "";
    state.adminEditorTopic = "";
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
  const importErrorDownloadButton = document.getElementById("admin-download-import-errors");
  const importReportClearButton = document.getElementById("admin-clear-import-report");

  const toCsvCell = (value) => {
    const text = String(value == null ? "" : value);
    if (/["\n\r,]/.test(text)) {
      return `"${text.replace(/"/g, "\"\"")}"`;
    }
    return text;
  };

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
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const questions = getQuestions();
    const existingId = String(data.get("id") || "");

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
      explanationImage: String(data.get("explanationImage") || "").trim(),
      status: String(data.get("status") || "draft"),
    };

    if (!QBANK_COURSE_TOPICS[payload.qbankCourse]?.includes(payload.qbankTopic)) {
      payload.qbankTopic = (QBANK_COURSE_TOPICS[payload.qbankCourse] || [])[0] || payload.qbankTopic;
      payload.topic = payload.qbankTopic;
    }

    const idx = questions.findIndex((entry) => entry.id === payload.id);
    if (idx >= 0) {
      questions[idx] = { ...questions[idx], ...payload };
      toast("Question updated.");
    } else {
      questions.push(payload);
      toast("Question created.");
    }

    save(STORAGE_KEYS.questions, questions);
    state.adminEditQuestionId = null;
    state.adminEditorCourse = "";
    state.adminEditorTopic = "";
    render();
  });

  const importForm = document.getElementById("admin-import-form");
  importForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(importForm);
    const raw = String(data.get("importText") || "").trim();
    if (!raw) {
      toast("Paste import content or upload a file first.");
      return;
    }

    const defaultCourse = String(data.get("defaultCourse") || allCourses[0]);
    const defaultTopic = String(data.get("defaultTopic") || (QBANK_COURSE_TOPICS[defaultCourse] || [])[0] || "");
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
      toast(`Imported ${result.added}/${result.total} rows locally, but DB sync failed: ${syncMessage}`);
    } else if (result.errors.length) {
      toast(`Imported ${result.added}/${result.total} rows with ${result.errors.length} error(s).`);
    } else {
      toast(`Imported ${result.added}/${result.total} rows successfully.`);
    }
    if (result.added) {
      state.adminEditQuestionId = null;
    }
    if (result.errors.length) {
      console.warn("Bulk import errors:", result.errors);
    }
    state.skipNextRouteAnimation = true;
    render();
  });
}
function getUsers() {
  return load(STORAGE_KEYS.users, []);
}

function getQuestions() {
  return load(STORAGE_KEYS.questions, []);
}

function getSessions() {
  return load(STORAGE_KEYS.sessions, []);
}

function getCurrentUser() {
  const userId = load(STORAGE_KEYS.currentUserId, null);
  if (!userId) {
    return null;
  }

  return getUsers().find((user) => user.id === userId) || null;
}

async function deleteSupabaseAuthUserAsAdmin(targetAuthId) {
  if (!targetAuthId) {
    return { ok: true };
  }

  const authClient = getSupabaseAuthClient();
  if (!authClient) {
    return { ok: false, message: "Supabase auth client is not available." };
  }

  const { data: sessionData, error: sessionError } = await authClient.auth.getSession();
  if (sessionError) {
    return { ok: false, message: sessionError.message || "Could not verify Supabase session." };
  }
  if (!sessionData?.session?.access_token) {
    return {
      ok: false,
      message: "No active Supabase session for admin delete. Log in with a Supabase admin account.",
    };
  }

  try {
    if (!SUPABASE_CONFIG.url || !SUPABASE_CONFIG.anonKey) {
      return {
        ok: false,
        message: "Supabase function endpoint is not configured in this app.",
      };
    }

    const response = await fetch(`${SUPABASE_CONFIG.url}/functions/v1/admin-delete-user`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`,
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

    if (!response.ok) {
      const details = String(payload?.error || payload?.message || "").trim();
      return {
        ok: false,
        message: details || `Admin delete request failed (${response.status}).`,
      };
    }

    if (!payload?.ok) {
      return { ok: false, message: payload?.error || "Supabase user delete failed." };
    }

    return { ok: true };
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
    const shouldApprove = user.role === "admin" ? true : typeof user.isApproved === "boolean" ? user.isApproved : true;
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
      const year = sanitizeAcademicYear(user.academicYear || 1);
      const semester = sanitizeAcademicSemester(user.academicSemester || 1);
      const semesterCourses = getCurriculumCourses(year, semester);
      const assigned = sanitizeCourseAssignments(user.assignedCourses || []);
      const scoped = assigned.filter((course) => semesterCourses.includes(course));
      const courses = scoped.length ? scoped : semesterCourses;
      if (user.academicYear !== year) {
        user.academicYear = year;
        changed = true;
      }
      if (user.academicSemester !== semester) {
        user.academicSemester = semester;
        changed = true;
      }
      if ((user.assignedCourses || []).join("|") !== courses.join("|")) {
        user.assignedCourses = courses;
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

function sanitizeAcademicYear(value) {
  const year = Number(value);
  return [1, 2, 3, 4, 5].includes(year) ? year : 1;
}

function sanitizeAcademicSemester(value) {
  const semester = Number(value);
  return semester === 2 ? 2 : 1;
}

function getCurriculumCourses(year, semester) {
  const normalizedYear = sanitizeAcademicYear(year);
  const normalizedSemester = sanitizeAcademicSemester(semester);
  const yearMap = O6U_CURRICULUM[normalizedYear] || {};
  const courses = yearMap[normalizedSemester] || [];
  return sanitizeCourseAssignments(courses);
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
  explanationImage: ["explanationimage", "explanation image", "image", "imageurl", "image url", "figure"],
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

  try {
    const trimmed = String(raw || "").trim();
    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      const parsed = JSON.parse(trimmed);
      records = Array.isArray(parsed) ? parsed : parsed.questions || parsed.data || [];
    } else {
      records = parseCsvRecords(trimmed);
    }
  } catch (error) {
    return { added: 0, total: 0, errors: [`Failed to parse import content: ${error.message}`] };
  }

  records = records.map((row) => normalizeImportRow(row)).filter((row) => Object.keys(row).length);
  const total = records.length;
  if (!total) {
    return {
      added: 0,
      total: 0,
      errors: ["No import rows found. Make sure your file has a header row and at least one data row."],
    };
  }

  let added = 0;
  records.forEach((row, index) => {
    const rowRef = `row ${index + 1}`;
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
    const stem = String(row.stem || "").trim();
    const explanation = String(row.explanation || "").trim();
    const choiceA = String(row.choiceA || "").trim();
    const choiceB = String(row.choiceB || "").trim();
    const choiceC = String(row.choiceC || "").trim();
    const choiceD = String(row.choiceD || "").trim();
    const choiceE = String(row.choiceE || "").trim();
    const correct = normalizeImportCorrect(row.correct);
    const availableChoices = [
      { id: "A", text: choiceA },
      { id: "B", text: choiceB },
      { id: "C", text: choiceC },
      { id: "D", text: choiceD },
      ...(choiceE ? [{ id: "E", text: choiceE }] : []),
    ];
    const availableChoiceIds = new Set(availableChoices.map((choice) => choice.id));

    const missingFields = [];
    if (!stem) missingFields.push("stem");
    if (!choiceA) missingFields.push("choiceA");
    if (!choiceB) missingFields.push("choiceB");
    if (!choiceC) missingFields.push("choiceC");
    if (!choiceD) missingFields.push("choiceD");
    if (missingFields.length) {
      errors.push(`${rowRef}: missing required field(s): ${missingFields.join(", ")}.`);
      return;
    }
    if (!correct.length) {
      errors.push(`${rowRef}: missing valid correct answer (A-D, or E if provided).`);
      return;
    }

    const invalidCorrect = correct.filter((choiceId) => !availableChoiceIds.has(choiceId));
    if (invalidCorrect.length) {
      errors.push(`${rowRef}: correct includes choice(s) not provided: ${invalidCorrect.join(", ")}.`);
      return;
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
      correct,
      explanation: explanation || "No explanation provided.",
      objective: String(row.objective || "").trim(),
      references: String(row.references || "").trim(),
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

function getUserStats(userId, courseFilter = "") {
  const sessions = getSessionsForUser(userId).filter((session) => session.status === "completed");
  let totalAnswered = 0;
  let totalCorrect = 0;
  let totalTime = 0;
  let streak = 0;

  sessions
    .sort((a, b) => new Date(a.completedAt || a.createdAt) - new Date(b.completedAt || b.createdAt))
    .forEach((session) => {
      let sessionAllCorrect = true;
      let sessionEligibleCount = 0;
      session.questionIds.forEach((qid) => {
        const response = session.responses[qid];
        const question = getQuestions().find((entry) => entry.id === qid);
        if (!question || !response) {
          return;
        }
        if (!matchesCourseFilterForAnalytics(question, courseFilter)) {
          return;
        }

        sessionEligibleCount += 1;

        const correct = isSubmittedResponseCorrect(question, response);
        totalAnswered += 1;
        if (correct) {
          totalCorrect += 1;
        } else {
          sessionAllCorrect = false;
        }

        totalTime += response.timeSpentSec || 0;
      });

      if (!sessionEligibleCount) {
        return;
      }

      if (sessionAllCorrect) {
        streak += 1;
      } else {
        streak = 0;
      }
    });

  const accuracy = totalAnswered ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
  const timePerQuestion = totalAnswered ? Math.round(totalTime / totalAnswered) : 0;

  return { accuracy, timePerQuestion, streak, totalAnswered };
}

function getTopicStats(userId, courseFilter = "") {
  const sessions = getSessionsForUser(userId).filter((session) => session.status === "completed");
  const byTopic = {};

  sessions.forEach((session) => {
    session.questionIds.forEach((qid) => {
      const question = getQuestions().find((entry) => entry.id === qid);
      const response = session.responses[qid];
      if (!question || !response) return;
      if (!matchesCourseFilterForAnalytics(question, courseFilter)) {
        return;
      }

      const topic = getQbankCourseTopicMeta(question).topic || question.topic;
      if (!byTopic[topic]) {
        byTopic[topic] = { topic, total: 0, correct: 0 };
      }

      byTopic[topic].total += 1;
      if (isSubmittedResponseCorrect(question, response)) {
        byTopic[topic].correct += 1;
      }
    });
  });

  return Object.values(byTopic)
    .map((entry) => ({ ...entry, accuracy: Math.round((entry.correct / entry.total) * 100) }))
    .sort((a, b) => a.accuracy - b.accuracy);
}

function getWeakAreas(userId, courseFilter = "") {
  return getTopicStats(userId, courseFilter)
    .filter((entry) => entry.total >= 1)
    .sort((a, b) => a.accuracy - b.accuracy);
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
  const raw = localStorage.getItem(key);
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
  if (scheduleRelationalWrite(key, value)) {
    return;
  }
  scheduleSupabaseWrite(key, value);
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
  if (await enforceRefreshAfterSignIn()) {
    return;
  }

  save(STORAGE_KEYS.currentUserId, user.id);
  navigate(user.role === "admin" ? "admin" : "dashboard");
}

function logout() {
  const authClient = getSupabaseAuthClient();
  if (authClient) {
    authClient.auth.signOut().catch((error) => {
      console.warn("Supabase sign-out failed.", error?.message || error);
    });
  }
  localStorage.removeItem(STORAGE_KEYS.currentUserId);
  state.sessionId = null;
  state.reviewSessionId = null;
  state.reviewIndex = 0;
  navigate("landing");
  toast("Logged out.");
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

init().catch((error) => {
  console.error("Application bootstrap failed:", error);
  toast("App failed to initialize. Check console for details.");
});
