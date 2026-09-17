/**
 * Auth error → parent-readable bilingual copy.
 * Adapted from the Kapoori Ka login flow (src/utils/authErrors.ts), extended
 * with the Supabase message shapes this app actually receives.
 */
export type AuthErrorLanguage = "en" | "ne";

const MAP: Array<{ match: RegExp; en: string; ne: string }> = [
  { match: /invalid login credentials|invalid_credentials|wrong-password/i, en: "Incorrect email or password. Please try again.", ne: "गलत इमेल वा पासवर्ड। कृपया पुनः प्रयास गर्नुहोस्।" },
  { match: /user not found|user-not-found/i, en: "No account found with this email address.", ne: "यो इमेल ठेगानासँग कुनै खाता भेटिएन।" },
  { match: /email not confirmed|not confirmed/i, en: "Your email is not confirmed yet. Open the confirmation link we emailed you, then sign in.", ne: "तपाईंको इमेल अझै पुष्टि भएको छैन। इमेलमा पठाइएको लिंक खोलेर पुष्टि गर्नुहोस्, त्यसपछि लग इन गर्नुहोस्।" },
  { match: /already registered|already been registered|email_exists|already exists/i, en: "This email already has an account — so no new account was created. Sign in with that email and password.", ne: "यो इमेलमा पहिले नै खाता छ — त्यसैले नयाँ खाता बनिएन। सोही इमेल र पासवर्डले लग इन गर्नुहोस्।" },
  { match: /valid email|invalid email|unable to validate email/i, en: "Please enter a valid email address.", ne: "कृपया वैध इमेल ठेगाना लेख्नुहोस्।" },
  { match: /password should be|weak.?password|password.*(short|least)/i, en: "Choose a longer password (at least 8 characters, with a letter and a number).", ne: "लामो पासवर्ड छान्नुहोस् (कम्तिमा ८ अक्षर, एउटा अक्षर र एउटा अंक सहित)।" },
  { match: /rate limit|too many|over_email_send_rate_limit/i, en: "Too many attempts just now. Please wait a minute and try again.", ne: "अहिले धेरै प्रयास भयो। कृपया एक मिनेट पर्खेर पुनः प्रयास गर्नुहोस्।" },
  { match: /network|failed to fetch|load failed|offline/i, en: "Please check your internet connection and try again.", ne: "कृपया इन्टरनेट जडान जाँच गर्नुहोस् र पुनः प्रयास गर्नुहोस्।" },
  { match: /invalid api key/i, en: "The app configuration is out of date. Please restart the app and try again.", ne: "एपको सेटअप पुरानो भयो। कृपया एप पुनः सुरु गरी प्रयास गर्नुहोस्।" },
  { match: /signups not allowed|signup.*disabled/i, en: "New account creation is currently closed. Please contact the clinic.", ne: "अहिले नयाँ खाता खोल्न बन्द छ। कृपया क्लिनिकलाई सम्पर्क गर्नुहोस्।" },
  { match: /user disabled|banned/i, en: "This account has been disabled. Please contact the clinic.", ne: "यो खाता निष्क्रिय गरिएको छ। कृपया क्लिनिकलाई सम्पर्क गर्नुहोस्।" },
];

export function getAuthErrorMessage(error: unknown, language: AuthErrorLanguage): string {
  const raw = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const code = (error as { code?: string } | null)?.code ?? "";
  const haystack = `${raw} ${code}`;
  for (const entry of MAP) {
    if (entry.match.test(haystack)) return language === "ne" ? entry.ne : entry.en;
  }
  return raw || (language === "ne" ? "प्रमाणीकरणमा समस्या भयो। कृपया पुनः प्रयास गर्नुहोस्।" : "Something went wrong while signing in. Please try again.");
}

/** Password rule copied from the Kapoori Ka flow: 8+ chars, a letter and a number. */
export function passwordProblem(password: string, language: AuthErrorLanguage): string | null {
  if (password.length < 8) return language === "ne" ? "पासवर्ड कम्तिमा ८ अक्षरको हुनुपर्छ।" : "Password must be at least 8 characters.";
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) return language === "ne" ? "पासवर्डमा कम्तिमा एक अक्षर र एक अंक हुनुपर्छ।" : "Password must contain at least one letter and one number.";
  return null;
}

export function isAlreadyRegisteredError(error: unknown): boolean {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  return /already|exists|registered/i.test(raw);
}
