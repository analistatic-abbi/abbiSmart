import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { marked } from 'marked';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const mdPath = join(root, 'docs', 'MANUAL-USUARIO.md');
const htmlPath = join(root, 'docs', 'MANUAL-USUARIO.html');
const pdfPath = join(root, 'docs', 'MANUAL-USUARIO.pdf');

const markdown = readFileSync(mdPath, 'utf8');
const body = marked.parse(markdown);

const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Manual de Usuario — ABBI Bid Management</title>
  <style>
    @page {
      size: A4;
      margin: 22mm 18mm 24mm 18mm;
    }

    * { box-sizing: border-box; }

    body {
      font-family: "Segoe UI", Calibri, Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.55;
      color: #1a1a1a;
      max-width: 210mm;
      margin: 0 auto;
      padding: 24px 28px 48px;
      background: #fff;
    }

    h1 {
      font-size: 24pt;
      color: #0b3d91;
      border-bottom: 3px solid #0b3d91;
      padding-bottom: 8px;
      margin: 0 0 12px;
      page-break-after: avoid;
    }

    h2 {
      font-size: 16pt;
      color: #0b3d91;
      margin: 28px 0 10px;
      padding-top: 8px;
      border-top: 1px solid #d0d7de;
      page-break-after: avoid;
    }

    h3 {
      font-size: 13pt;
      color: #243b53;
      margin: 18px 0 8px;
      page-break-after: avoid;
    }

    h4 {
      font-size: 11.5pt;
      color: #334e68;
      margin: 14px 0 6px;
      page-break-after: avoid;
    }

    p, li { orphans: 3; widows: 3; }

    ul, ol { margin: 8px 0 12px; padding-left: 22px; }

    blockquote {
      margin: 12px 0;
      padding: 10px 14px;
      border-left: 4px solid #0b3d91;
      background: #f0f4f8;
      color: #334e68;
    }

    hr {
      border: 0;
      border-top: 1px solid #d0d7de;
      margin: 24px 0;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0 18px;
      font-size: 10pt;
      page-break-inside: avoid;
    }

    th, td {
      border: 1px solid #cbd2d9;
      padding: 8px 10px;
      text-align: left;
      vertical-align: top;
    }

    th {
      background: #e4e7eb;
      font-weight: 700;
      color: #243b53;
    }

    tr:nth-child(even) td { background: #f8fafc; }

    code {
      font-family: Consolas, "Courier New", monospace;
      font-size: 9.5pt;
      background: #f0f4f8;
      padding: 1px 4px;
      border-radius: 3px;
    }

    strong { color: #102a43; }

    a { color: #0b69a3; text-decoration: none; }

    .cover {
      text-align: center;
      padding: 48px 0 32px;
      margin-bottom: 24px;
      page-break-after: always;
    }

    .cover__brand {
      font-size: 14pt;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #627d98;
      margin-bottom: 24px;
    }

    .cover__title {
      font-size: 28pt;
      color: #0b3d91;
      margin: 0 0 12px;
      border: 0;
      padding: 0;
    }

    .cover__subtitle {
      font-size: 14pt;
      color: #486581;
      margin: 0 0 32px;
    }

    .cover__meta {
      font-size: 11pt;
      color: #627d98;
      line-height: 1.8;
    }

    @media print {
      body { padding: 0; }
      a { color: inherit; }
      h2 { page-break-before: auto; }
    }
  </style>
</head>
<body>
  <section class="cover">
    <div class="cover__brand">ABBI Bid Management</div>
    <h1 class="cover__title">Manual de Usuario</h1>
    <p class="cover__subtitle">Sistema de Gestión de Licitaciones</p>
    <p class="cover__meta">
      Versión 1.0<br />
      Colombia y Perú<br />
      <em>construyendo progreso</em>
    </p>
  </section>
  ${body}
</body>
</html>`;

writeFileSync(htmlPath, html, 'utf8');
console.log(`HTML: ${htmlPath}`);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'networkidle' });
await page.pdf({
  path: pdfPath,
  format: 'A4',
  printBackground: true,
  margin: { top: '18mm', right: '16mm', bottom: '20mm', left: '16mm' },
  displayHeaderFooter: true,
  headerTemplate: '<div></div>',
  footerTemplate:
    '<div style="width:100%;font-size:8px;color:#627d98;text-align:center;padding:0 16mm;">Manual de Usuario — ABBI Bid Management · Página <span class="pageNumber"></span> de <span class="totalPages"></span></div>',
});
await browser.close();

console.log(`PDF:  ${pdfPath}`);
