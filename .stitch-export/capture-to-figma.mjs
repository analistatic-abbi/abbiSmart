import { createServer } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, 'stitch_sistema_de_gesti_n_abbi');
const port = 8765;

const screens = [
  'login_abbi_1',
  'login_abbi_2',
  'selecci_n_de_pa_s_abbi',
  'restablecer_contrase_a_abbi',
  'dashboard_de_m_tricas_abbi',
  'lista_de_procesos_abbi',
  'crear_proceso_paso_1_abbi',
  'crear_proceso_paso_2_abbi',
  'crear_proceso_paso_3_abbi',
  'detalle_de_proceso_info_general_abbi',
  'detalle_de_proceso_info_general_corregido_abbi',
  'detalle_de_proceso_fechas_abbi',
  'detalle_de_proceso_tareas_abbi',
  'modal_cambio_de_estado_abbi',
  'modal_asignar_validadores_abbi',
  'modal_eliminar_proceso_abbi',
  'modal_solicitar_eliminaci_n_abbi',
  'modal_solicitar_eliminaci_n_corregido_abbi',
  'bandeja_de_validaci_n_abbi',
  'revisi_n_de_validaci_n_abbi',
  'lista_de_proyecciones_abbi',
  'crear_proyecci_n_manual_abbi',
];

const server = createServer(async (req, res) => {
  try {
    const urlPath = decodeURIComponent(req.url.split('?')[0]);
    const relative = urlPath === '/' ? '/login_abbi_1/code.html' : urlPath;
    const filePath = path.join(root, relative.replace(/^\//, ''));
    const data = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(data);
  } catch {
    const dirs = await readdir(root, { withFileTypes: true });
    const links = dirs
      .filter((d) => d.isDirectory())
      .map((d) => `<li><a href="/${d.name}/code.html">${d.name}</a></li>`)
      .join('');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<html><body><h1>Stitch export</h1><ul>${links}</ul></body></html>`);
  }
});

server.listen(port, () => {
  console.log(`SERVER_READY http://localhost:${port}`);
  console.log('SCREENS', screens.join(','));
});
