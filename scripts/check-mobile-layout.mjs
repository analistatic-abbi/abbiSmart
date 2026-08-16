import { chromium } from 'playwright';

const baseUrl = process.env.MOBILE_TEST_URL ?? 'http://localhost:4200';
const viewports = [
  { name: '320x568', width: 320, height: 568 },
  { name: '360x800', width: 360, height: 800 },
  { name: '390x844', width: 390, height: 844 },
  { name: '412x915', width: 412, height: 915 },
  { name: '768x1024', width: 768, height: 1024 },
];
const routes = [
  '/dashboard',
  '/procesos',
  '/calendario',
  '/bandeja-personal',
  '/crm/clientes',
  '/crm/contactos',
  '/crm/relacionamientos',
  '/kam',
  '/kam/calendario',
  '/admin/formatos-encuesta',
  '/proyecciones',
  '/parametros',
  '/usuarios',
  '/notificaciones',
];

const browser = await chromium.launch({ headless: true });
let failures = 0;

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
    });
    const page = await context.newPage();

    await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });
    const quickAdmin = page.getByRole('button', { name: 'Admin', exact: true });
    if (await quickAdmin.isVisible().catch(() => false)) {
      await quickAdmin.click();
      await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15_000 });
    } else {
      await page.locator('#correo').fill(process.env.MOBILE_TEST_EMAIL ?? 'admin@abbi.com');
      await page.locator('#password').fill(process.env.MOBILE_TEST_PASSWORD ?? 'Admin1234');
      await page.getByRole('button', { name: /Iniciar sesión/i }).click();
      await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15_000 });
    }

    if (new URL(page.url()).pathname.includes('/select-country')) {
      await page.locator('.country-option').first().click();
      await page.waitForURL((url) => !url.pathname.includes('/select-country'), { timeout: 15_000 });
    }

    if (viewport.width <= 768) {
      await page.getByRole('button', { name: 'Abrir menú de navegación' }).click();
      await page.waitForTimeout(300);
      const drawerState = await page.evaluate(() => {
        const sidebar = document.querySelector('.app-sidebar');
        return {
          bodyLocked: document.body.classList.contains('mobile-menu-open'),
          sidebarVisible: sidebar ? sidebar.getBoundingClientRect().left >= -1 : false,
        };
      });
      if (!drawerState.bodyLocked || !drawerState.sidebarVisible) {
        throw new Error(`[${viewport.name}] Mobile navigation drawer did not open correctly.`);
      }
      await page.locator('.app-header__menu').click();
      await page.waitForTimeout(300);

      await page.getByRole('button', { name: 'Notificaciones' }).click();
      await page.waitForTimeout(200);
      const panelBounds = await page.evaluate(() => {
        const panel = document.querySelector('.notif-panel');
        if (!panel) return null;
        const rect = panel.getBoundingClientRect();
        return {
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          viewportWidth: document.documentElement.clientWidth,
        };
      });
      if (
        !panelBounds ||
        panelBounds.left < -1 ||
        panelBounds.right > panelBounds.viewportWidth + 1
      ) {
        failures += 1;
        console.error(`[${viewport.name}] notification panel out of viewport`, panelBounds);
      } else {
        console.log(`[${viewport.name}] notification panel OK`);
      }
      await page.getByRole('button', { name: 'Notificaciones' }).click();
    }

    for (const route of routes) {
      await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle' });
      const overflow = await page.evaluate(() => {
        const viewportWidth = document.documentElement.clientWidth;
        const offenders = [...document.querySelectorAll('body *')]
          .filter((element) => {
            const rect = element.getBoundingClientRect();
            return rect.right > viewportWidth + 1 || rect.left < -1;
          })
          .slice(0, 8)
          .map((element) => ({
            tag: element.tagName.toLowerCase(),
            className: typeof element.className === 'string' ? element.className : '',
            right: Math.round(element.getBoundingClientRect().right),
          }));
        return {
          scrollWidth: document.documentElement.scrollWidth,
          viewportWidth,
          offenders,
        };
      });

      if (overflow.scrollWidth > overflow.viewportWidth + 1) {
        failures += 1;
        console.error(`[${viewport.name}] ${route} overflow`, overflow);
      } else {
        console.log(`[${viewport.name}] ${route} OK`);
      }
    }

    await context.close();
  }
} finally {
  await browser.close();
}

if (failures > 0) {
  process.exitCode = 1;
  console.error(`Responsive check failed in ${failures} route(s).`);
} else {
  console.log('Responsive check passed.');
}
