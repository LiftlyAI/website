// One-off visual walk of the coaching loop. Drives system Edge via
// playwright-core, authenticates by setting the pl_session cookie directly,
// and screenshots each loop stage. Not committed-app code — a dev harness.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = process.env.BASE || 'http://localhost:3001';
const ATHLETE = process.env.ATHLETE || 'be6e03a5-ea10-4a6c-8fb8-7d24e53063e3';
const OUT = path.join(process.cwd(), '.walk-screens');
fs.mkdirSync(OUT, { recursive: true });

const shot = async (page, name) => {
  const p = path.join(OUT, name + '.png');
  await page.screenshot({ path: p, fullPage: true });
  console.log('shot:', name);
};

const run = async () => {
  const browser = await chromium.launch({ executablePath: EDGE, headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1400 } });
  await ctx.addCookies([{ name: 'pl_session', value: ATHLETE, url: BASE }]);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE.ERR:', m.text()); });

  // 1. Dashboard — the loop spine (expected: Resume step, 9 days off)
  const resp = await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
  console.log('dashboard status:', resp?.status());
  await page.waitForTimeout(800);
  await shot(page, '1-dashboard');

  // 2. Open the inline log modal
  const logBtn = page.getByRole('button', { name: /log .*(session|re-entry)/i }).first();
  if (await logBtn.count()) {
    await logBtn.click();
    await page.waitForTimeout(500);
    await shot(page, '2-log-modal');

    // 3. Save the session -> handoff "what changed" panel
    const saveBtn = page.getByRole('button', { name: /save session/i }).first();
    await saveBtn.click();
    await page.waitForTimeout(1500);
    await shot(page, '3-handoff-panel');
  } else {
    console.log('NO LOG BUTTON FOUND');
  }

  // 4. Form-check page (close-the-loop target)
  await page.goto(`${BASE}/formcheck`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await shot(page, '4-formcheck');

  // 5. Re-render dashboard now that a session is logged today -> Review step
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await shot(page, '5-dashboard-after-log');

  await browser.close();
  console.log('done');
};

run().catch((e) => { console.error('WALK FAILED:', e); process.exit(1); });
