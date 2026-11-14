/** Default admin code is «nissefar». Override with VITE_ADMIN_CODE_HASH (see README). */
const DEFAULT_ADMIN_CODE_HASH = 'c046bdc0f94ea07bb303354727d92999a7074e05c51500a80aa10b842c9a251f';

/** doors.json is encrypted with this password when no APP_PASSWORD is given (local testing). */
export const TEST_MODE_PASSWORD = 'testmodus';

export const config = {
  seasonYear: Number(import.meta.env.VITE_SEASON_YEAR ?? 2026),
  timeZone: 'Europe/Oslo',
  /** Background: granskog (default), laaverod or nordlys. */
  theme: import.meta.env.VITE_THEME,
  title: import.meta.env.VITE_TITLE || 'Karolines julekalender 2026',
  adminCodeHash: import.meta.env.VITE_ADMIN_CODE_HASH ?? DEFAULT_ADMIN_CODE_HASH,
  /** Optional YYYY-MM-DD the app pretends is today (for demo/test builds). */
  demoDate: import.meta.env.VITE_DEMO_DATE,
  doorsUrl: `${import.meta.env.BASE_URL}doors.json`,
  data: {
    encryptedToken: import.meta.env.VITE_ENC_TOKEN,
    dataRepo: import.meta.env.VITE_DATA_REPO,
    dataBranch: import.meta.env.VITE_DATA_BRANCH || 'main',
    testModePassword: TEST_MODE_PASSWORD,
  },
} as const;
