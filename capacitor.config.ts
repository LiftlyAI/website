import type { CapacitorConfig } from '@capacitor/cli';

// Liftly is a full-stack Next.js app (Supabase auth, API routes, Postgres,
// Stripe, server actions), so it can't be exported to static files. The native
// shell loads the hosted site in a WebView instead; `webDir` only holds the
// offline fallback page that Capacitor requires.
//
// Override the URL for local device testing, e.g. point at your dev machine:
//   CAP_SERVER_URL=http://192.168.1.50:3000 npx cap sync
const serverUrl = process.env.CAP_SERVER_URL ?? 'https://liftly.tech';

const config: CapacitorConfig = {
  appId: 'com.liftly.liftly',
  appName: 'Liftly',
  webDir: 'capacitor/www',
  server: {
    url: serverUrl,
    cleartext: serverUrl.startsWith('http://'),
    androidScheme: 'https',
  },
};

export default config;
