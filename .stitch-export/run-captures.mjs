import { chromium } from 'playwright';

const [screen, captureId] = process.argv.slice(2);
if (!screen || !captureId) {
  console.error('Usage: node run-captures.mjs <screen-folder> <captureId>');
  process.exit(1);
}

const port = 8765;
const targetUrl = `http://127.0.0.1:${port}/${screen}/code.html`;
const endpoint = `https://mcp.figma.com/mcp/capture/${captureId}/submit?bindVariables=true`;

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});
console.log('BROWSER_LAUNCHED');

try {
  const page = await browser.newPage();
  console.log('PAGE_CREATED');

  await page.route('**/*', async (route) => {
    const url = route.request().url();
    if (url.startsWith(`http://127.0.0.1:${port}`) || url.includes('mcp.figma.com')) {
      const response = await route.fetch();
      const headers = { ...response.headers() };
      delete headers['content-security-policy'];
      delete headers['content-security-policy-report-only'];
      await route.fulfill({ response, headers });
      return;
    }
    await route.abort();
  });

  console.log('NAVIGATING', targetUrl);
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  console.log('PAGE_LOADED');
  await page.waitForTimeout(3000);

  const scriptRes = await fetch('https://mcp.figma.com/mcp/html-to-design/capture.js');
  const script = await scriptRes.text();
  console.log('SCRIPT_FETCHED', script.length);
  await page.evaluate((s) => {
    const el = document.createElement('script');
    el.textContent = s;
    document.head.appendChild(el);
  }, script);
  await page.waitForTimeout(1000);
  console.log('SCRIPT_INJECTED');

  const result = await page.evaluate(
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

  console.log('CAPTURE_RESULT', JSON.stringify(result));
} catch (error) {
  console.error('CAPTURE_ERROR', error?.stack || String(error));
  process.exitCode = 1;
} finally {
  await browser.close();
  console.log('BROWSER_CLOSED');
}
