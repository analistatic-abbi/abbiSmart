import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const manifestPath = path.join(__dirname, 'captures.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const port = 8765;
const fileKey = manifest.fileKey;

async function pollCapture(captureId) {
  for (let i = 0; i < 24; i += 1) {
    await new Promise((r) => setTimeout(r, 5000));
    const res = await fetch('https://mcp.figma.com/mcp/html-to-design/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ captureId, fileKey }),
    });
    if (!res.ok) continue;
    const data = await res.json();
    const status = data.status ?? data.state;
    console.log(`POLL ${captureId} => ${status}`);
    if (status === 'completed') return true;
    if (status === 'failed' || status === 'error') {
      throw new Error(`Capture failed: ${JSON.stringify(data)}`);
    }
  }
  return false;
}

async function capturePage(browser, screen, captureId) {
  const page = await browser.newPage();
  const targetUrl = `http://127.0.0.1:${port}/${screen}/code.html`;
  const endpoint = `https://mcp.figma.com/mcp/capture/${captureId}/submit?bindVariables=true`;

  await page.route('**/*', async (route) => {
    const url = route.request().url();
    if (url.startsWith(`http://127.0.0.1:${port}`) || url.includes('mcp.figma.com') || url.includes('cdn.tailwindcss.com') || url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com') || url.includes('lh3.googleusercontent.com')) {
      const response = await route.fetch();
      const headers = { ...response.headers() };
      delete headers['content-security-policy'];
      delete headers['content-security-policy-report-only'];
      await route.fulfill({ response, headers });
      return;
    }
    await route.abort();
  });

  await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(4000);

  const scriptRes = await fetch('https://mcp.figma.com/mcp/html-to-design/capture.js');
  const script = await scriptRes.text();
  await page.evaluate((s) => {
    const el = document.createElement('script');
    el.textContent = s;
    document.head.appendChild(el);
  }, script);
  await page.waitForTimeout(1000);

  await page.evaluate(
    async ({ captureId, endpoint }) => {
      if (!window.figma?.captureForDesign) {
        throw new Error('captureForDesign not available');
      }
      return window.figma.captureForDesign({
        captureId,
        endpoint,
        selector: 'body',
      });
    },
    { captureId, endpoint },
  );

  await page.close();
}

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const results = [];
try {
  for (const item of manifest.screens) {
    if (item.done) continue;
    console.log(`CAPTURING ${item.screen}`);
    try {
      await capturePage(browser, item.screen, item.captureId);
      const done = await pollCapture(item.captureId);
      if (!done) throw new Error('poll timeout');
      item.done = true;
      results.push({ screen: item.screen, ok: true });
      console.log(`DONE ${item.screen}`);
    } catch (error) {
      item.error = String(error?.message || error);
      results.push({ screen: item.screen, ok: false, error: item.error });
      console.error(`FAIL ${item.screen}`, item.error);
    }
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  }
} finally {
  await browser.close();
}

console.log('SUMMARY', JSON.stringify(results));
