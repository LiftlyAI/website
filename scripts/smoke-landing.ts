/**
 * Smoke test for the redesigned landing page.
 * Loads / in a real browser, scrolls through the full experience, and
 * reports console errors, WebGL status, and section visibility.
 *
 * Run: npx tsx scripts/smoke-landing.ts
 */
import { chromium } from 'playwright-core';

async function main() {
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--use-gl=angle'],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const errors: string[] = [];
  page.on('console', (msg) => {
    // Resource-load failures are reported with URLs by the response listener.
    if (msg.type() === 'error' && !msg.text().startsWith('Failed to load resource'))
      errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(`PAGEERROR: ${err.message}`));
  page.on('response', (res) => {
    // Vercel Analytics only resolves on Vercel-hosted deployments.
    if (res.status() >= 400 && !res.url().includes('/_vercel/insights'))
      errors.push(`${res.status()} ${res.url()}`);
  });

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

  // Hero rendered?
  const headline = await page.textContent('h1');
  console.log('headline:', JSON.stringify(headline?.trim().slice(0, 40)));

  // Three.js canvas mounted?
  await page.waitForSelector('canvas', { timeout: 10_000 }).catch(() => null);
  const canvasCount = await page.locator('canvas').count();
  console.log('canvas elements:', canvasCount);

  // Headline chars animated to visible (GSAP intro ran)?
  await page.waitForTimeout(2500);
  const charVisible = await page.evaluate(() => {
    const char = document.querySelector('.hero-char');
    if (!char) return 'missing';
    const { transform } = getComputedStyle(char);
    return transform === 'none' || transform === 'matrix(1, 0, 0, 1, 0, 0)'
      ? 'settled'
      : `mid-flight: ${transform}`;
  });
  console.log('hero chars:', charVisible);

  // Scroll through every section; ScrollTrigger reveals should fire.
  for (const sel of ['#features', '#how', '#coaches', 'footer']) {
    await page.evaluate(
      (s) => document.querySelector(s)?.scrollIntoView({ behavior: 'instant' as ScrollBehavior }),
      sel
    );
    await page.waitForTimeout(900);
  }
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1200);

  // After full scroll, reveal targets must have settled to visible.
  const hidden = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('[data-reveal], .timeline-step'));
    return els
      .filter((el) => Number(getComputedStyle(el).opacity) < 0.9)
      .map((el) => el.className.toString().slice(0, 60));
  });
  console.log('still-hidden reveal targets:', hidden.length ? hidden : 'none');

  // Stat counters finished?
  const stats = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.stat-value')).map((el) => el.textContent)
  );
  console.log('stat counters:', stats);

  await page.screenshot({ path: 'scripts/landing-cta.png', fullPage: false });

  // Mid-pin features panel
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(600);
  const featuresTop = await page.evaluate(
    () => (document.querySelector('#features') as HTMLElement).offsetTop
  );
  await page.evaluate(
    (y) => window.scrollTo(0, y + window.innerHeight * 1.4),
    featuresTop
  );
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'scripts/landing-features.png' });

  // Timeline + coach sections
  await page.evaluate(() => document.querySelector('#how')?.scrollIntoView());
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'scripts/landing-how.png' });
  await page.evaluate(() => document.querySelector('#coaches')?.scrollIntoView());
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'scripts/landing-coaches.png' });

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(900);
  await page.screenshot({ path: 'scripts/landing-hero.png' });

  // Mobile pass: no horizontal overflow, hero readable
  const mobile = await browser.newPage({ viewport: { width: 375, height: 812 } });
  mobile.on('pageerror', (err) => errors.push(`MOBILE PAGEERROR: ${err.message}`));
  await mobile.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await mobile.waitForTimeout(2200);
  const overflow = await mobile.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  console.log('mobile horizontal overflow px:', overflow);
  await mobile.screenshot({ path: 'scripts/landing-mobile.png' });
  await mobile.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.35));
  await mobile.waitForTimeout(900);
  await mobile.screenshot({ path: 'scripts/landing-mobile-mid.png' });

  console.log('console errors:', errors.length ? errors : 'none');

  await browser.close();
  if (errors.length || charVisible === 'missing' || overflow > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
