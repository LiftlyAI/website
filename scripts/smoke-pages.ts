/**
 * Visual smoke for the redesigned public pages: /login and /coach/login.
 * Run: npx tsx scripts/smoke-pages.ts (server must be on :3000)
 */
import { chromium } from 'playwright-core';

async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(`PAGEERROR: ${err.message}`));
  page.on('response', (res) => {
    if (res.status() >= 400 && !res.url().includes('/_vercel/insights'))
      errors.push(`${res.status()} ${res.url()}`);
  });

  for (const [path, name] of [
    ['/login', 'login'],
    ['/coach/login', 'coach-login'],
  ] as const) {
    await page.goto(`http://localhost:3000${path}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `scripts/landing-${name}.png` });
  }

  console.log('errors:', errors.length ? errors : 'none');
  await browser.close();
  if (errors.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
