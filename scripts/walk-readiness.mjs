// Focused visual walk of Phase 3/4 UI: the optional readiness check-in, its
// assessment banner + soft RPE cap, and the weekly-review card. Drives system
// Edge via playwright-core, authenticates by setting the pl_session cookie.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = process.env.BASE || 'http://localhost:3001';
const ATHLETE = process.env.ATHLETE || 'be6e03a5-ea10-4a6c-8fb8-7d24e53063e3';
const OUT = path.join(process.cwd(), '.walk-screens');
fs.mkdirSync(OUT, { recursive: true });

const shot = async (page, name) => {
  await page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: true });
  console.log('shot:', name);
};

const run = async () => {
  const browser = await chromium.launch({ executablePath: EDGE, headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1600 } });
  await ctx.addCookies([{ name: 'pl_session', value: ATHLETE, url: BASE }]);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE.ERR:', m.text()); });

  // 1. Dashboard before any check-in: optional readiness strip + weekly review.
  const resp = await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
  console.log('dashboard status:', resp?.status());
  await page.waitForTimeout(700);
  await shot(page, 'r1-dashboard-optional');

  // 2. Open the readiness modal (the sliders).
  const checkIn = page.getByRole('button', { name: /check in/i }).first();
  if (await checkIn.count()) {
    await checkIn.click();
    await page.waitForTimeout(500);
    await shot(page, 'r2-readiness-modal');
    // Close it (we'll seed via the API to exercise the real assessment path).
    await page.keyboard.press('Escape').catch(() => {});
    const cancel = page.getByRole('button', { name: /cancel/i }).first();
    if (await cancel.count()) await cancel.click().catch(() => {});
  } else {
    console.log('NO CHECK-IN BUTTON (already logged?)');
  }

  // 3. Seed a rough readiness via the API (authenticated by the page cookie),
  //    then reload to see the red banner + soft RPE cap note in the Execute step.
  const today = new Date().toISOString().slice(0, 10);
  const r = await page.request.post(`${BASE}/api/readiness`, {
    data: { date: today, sleep: 2, energy: 2, soreness: 9, stress: 9, pain: 6, painNote: 'left knee, lateral' },
  });
  console.log('POST /api/readiness:', r.status(), await r.text());

  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  await shot(page, 'r3-dashboard-red-banner');

  // 4. Re-open to confirm the "update" path pre-fills.
  const update = page.getByRole('button', { name: /update today/i }).first();
  if (await update.count()) {
    await update.click();
    await page.waitForTimeout(400);
    await shot(page, 'r4-readiness-update');
  }

  await browser.close();
  console.log('done');
};

run().catch((e) => { console.error('WALK FAILED:', e); process.exit(1); });
