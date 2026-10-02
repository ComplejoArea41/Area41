const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const os = require('os');

// ============================================================================
// CONFIGURACIÓN - COMPLEJO DEPORTIVO ÁREA 41
// ============================================================================
const PORT = 4141;
const WATCH_DIR = path.join('C:', 'Grabaciones_Area41');

// Crear la carpeta vigilada si no existe
if (!fs.existsSync(WATCH_DIR)) {
  try {
    fs.mkdirSync(WATCH_DIR, { recursive: true });
  } catch (e) {
    console.error(`[ERROR] No se pudo crear la carpeta ${WATCH_DIR}:`, e.message);
  }
}

// Obtener la IP local de la computadora (ej: 192.168.1.50)
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const LOCAL_IP = getLocalIp();

// Historial de eventos y registro de archivos
const processedFiles = new Map(); // fileName -> matchInfo
let logHistory = [];

function addLog(msg) {
  const timestamp = new Date().toLocaleTimeString('es-AR');
  const logEntry = `[${timestamp}] ${msg}`;
  console.log(logEntry);
  logHistory.unshift(logEntry);
  if (logHistory.length > 100) logHistory.pop();
}

// ============================================================================
// PARSEAR NOMBRE DE ARCHIVO DEL DVR DAHUA
// Cancha 1 / Cancha 2 - Cámara 1 / Cámara 2 - Horarios
// ============================================================================
function parseFileInfo(fileName, filePath) {
  const lower = fileName.toLowerCase();
  let stats = null;
  try {
    stats = fs.statSync(filePath);
  } catch (e) {}

  const fileDate = stats ? new Date(stats.mtime) : new Date();
  const dateStr = fileDate.toISOString().split('T')[0];

  let courtId = 'cancha-1';
  let courtName = 'Cancha 1';
  let cameraId = 'cam-1';
  let cameraName = 'Cámara 1';
  let startHour = fileDate.getHours();

  // Detectar Cancha y Cámara por nombre del canal Dahua
  // CH01 = Cancha 1 Cam 1, CH02 = Cancha 1 Cam 2, CH03 = Cancha 2 Cam 1, CH04 = Cancha 2 Cam 2
  if (lower.includes('ch01') || lower.includes('ch1') || lower.includes('cancha1_cam1') || lower.includes('cancha-1_cam-1')) {
    courtId = 'cancha-1';
    courtName = 'Cancha 1';
    cameraId = 'cam-1';
    cameraName = 'Cámara 1';
  } else if (lower.includes('ch02') || lower.includes('ch2') || lower.includes('cancha1_cam2') || lower.includes('cancha-1_cam-2')) {
    courtId = 'cancha-1';
    courtName = 'Cancha 1';
    cameraId = 'cam-2';
    cameraName = 'Cámara 2';
  } else if (lower.includes('ch03') || lower.includes('ch3') || lower.includes('cancha2_cam1') || lower.includes('cancha-2_cam-1')) {
    courtId = 'cancha-2';
    courtName = 'Cancha 2';
    cameraId = 'cam-1';
    cameraName = 'Cámara 1';
  } else if (lower.includes('ch04') || lower.includes('ch4') || lower.includes('cancha2_cam2') || lower.includes('cancha-2_cam-2')) {
    courtId = 'cancha-2';
    courtName = 'Cancha 2';
    cameraId = 'cam-2';
    cameraName = 'Cámara 2';
  }

  // Detectar fecha en el nombre (ej: 20261001 o 2026-10-01)
  const dateMatch = fileName.match(/(\d{4})[-_]?(\d{2})[-_]?(\d{2})/);
  let finalDate = dateStr;
  if (dateMatch) {
    finalDate = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
  }

  // Detectar hora de inicio en el nombre del archivo (ej: _200000 o _20-00)
  const hourMatch = fileName.match(/_(\d{2})\d{4}/) || fileName.match(/_(\d{2})[-_]/) || fileName.match(/[-_](\d{2})h/);
  if (hourMatch && hourMatch[1]) {
    const parsed = parseInt(hourMatch[1], 10);
    if (parsed >= 0 && parsed <= 23) startHour = parsed;
  }

  const endHour = (startHour + 1) % 24;
  const timeStr = `${startHour.toString().padStart(2, '0')}:00 a ${endHour.toString().padStart(2, '0')}:00 hs`;
  const sizeMb = stats ? (stats.size / (1024 * 1024)).toFixed(1) : '0';

  return {
    id: fileName,
    fileName,
    courtId,
    courtName,
    cameraId,
    cameraName,
    date: finalDate,
    time: timeStr,
    startHour,
    sizeMb: `${sizeMb} MB`,
    videoUrl: `/video/${encodeURIComponent(fileName)}`,
    downloadUrl: `/download/${encodeURIComponent(fileName)}`,
    fullLocalUrl: `http://${LOCAL_IP}:${PORT}/video/${encodeURIComponent(fileName)}`,
    detectedAt: new Date().toISOString(),
  };
}

// ============================================================================
// ESCANEO CONTINUO DE LA CARPETA DE GRABACIONES
// ============================================================================
const fileSizeMap = new Map();

function scanWatchDirectory() {
  try {
    if (!fs.existsSync(WATCH_DIR)) return;
    const files = fs.readdirSync(WATCH_DIR);

    for (const f of files) {
      const lower = f.toLowerCase();
      if (lower.endsWith('.mp4') || lower.endsWith('.dav') || lower.endsWith('.avi') || lower.endsWith('.mkv')) {
        const fullPath = path.join(WATCH_DIR, f);

        try {
          const stats = fs.statSync(fullPath);

          // Si ya lo tenemos registrado con el mismo tamaño, no hacemos nada
          if (processedFiles.has(f)) continue;

          // Verificar si el archivo aún se está escribiendo (grabando)
          const lastSize = fileSizeMap.get(f) || 0;
          if (stats.size === 0 || stats.size !== lastSize) {
            fileSizeMap.set(f, stats.size);
            // El archivo sigue creciendo, esperar al siguiente ciclo
            continue;
          }

          // El tamaño se estabilizó: el DVR terminó de guardar el bloque
          const info = parseFileInfo(f, fullPath);
          processedFiles.set(f, info);
          addLog(`✅ Nuevo partido listo: [${info.courtName}] ${info.cameraName} | Horario: ${info.time} (${info.sizeMb})`);
        } catch (fileErr) {
          // Archivo bloqueado por escritura momentáneamente
        }
      }
    }
  } catch (err) {
    addLog(`⚠️ Error al escanear carpeta: ${err.message}`);
  }
}

// Escanear cada 4 segundos
setInterval(scanWatchDirectory, 4000);
// Primer escaneo inmediato
scanWatchDirectory();

// ============================================================================
// SERVIDOR WEB Y DE STREAMING DE VIDEO (HTTP RANGE / 206 PARTIAL CONTENT)
// ============================================================================
const server = http.createServer((req, res) => {
  // Habilitar CORS para que la app web pueda pedir datos y reproducir sin restricciones
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(parsedUrl.pathname);

  // 1. API: Listado de todos los partidos detectados en formato JSON
  if (pathname === '/api/matches') {
    const list = Array.from(processedFiles.values());
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true, matches: list, serverIp: LOCAL_IP, port: PORT }));
    return;
  }

  // 2. Healthcheck / Estado
  if (pathname === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'online',
      watchDir: WATCH_DIR,
      totalMatches: processedFiles.size,
      localIp: LOCAL_IP,
      port: PORT,
      uptimeMinutes: Math.floor(process.uptime() / 60)
    }));
    return;
  }

  // 3. Streaming de Video con soporte de Range (para saltar a cualquier minuto)
  if (pathname.startsWith('/video/')) {
    const fileName = path.basename(pathname.replace('/video/', ''));
    const filePath = path.join(WATCH_DIR, fileName);

    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Video no encontrado');
      return;
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    const ext = path.extname(fileName).toLowerCase();
    const contentType = ext === '.mp4' ? 'video/mp4' : ext === '.mkv' ? 'video/x-matroska' : 'video/octet-stream';

    if (range) {
      // Petición parcial (Seek / adelantar / retroceder)
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;
      const file = fs.createReadStream(filePath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType,
      });
      file.pipe(res);
    } else {
      // Petición completa
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
      });
      fs.createReadStream(filePath).pipe(res);
    }
    return;
  }

  // 4. Descarga directa de video
  if (pathname.startsWith('/download/')) {
    const fileName = path.basename(pathname.replace('/download/', ''));
    const filePath = path.join(WATCH_DIR, fileName);

    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Archivo no encontrado');
      return;
    }

    const stat = fs.statSync(filePath);
    res.writeHead(200, {
      'Content-Type': 'application/octet-stream',
      'Content-Length': stat.size,
      'Content-Disposition': `attachment; filename="${fileName}"`,
    });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  // 5. Panel de Control Web y Monitoreo Local
  const matchesList = Array.from(processedFiles.values());

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Área 41 - Servidor de Grabaciones</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0a0a0c; color: #f4f4f5; padding: 24px; }
    .container { max-width: 960px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, #18181b 0%, #09090b 100%); border: 1px solid #27272a; border-radius: 16px; padding: 28px; margin-bottom: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    .title-row { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
    h1 { font-size: 24px; font-weight: 800; color: #fff; display: flex; align-items: center; gap: 10px; }
    .badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(34, 197, 94, 0.15); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.3); padding: 6px 14px; border-radius: 999px; font-size: 13px; font-weight: 700; }
    .pulse { width: 8px; height: 8px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 10px #22c55e; }
    .meta-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-top: 20px; }
    .meta-box { background: #121215; border: 1px solid #27272a; border-radius: 12px; padding: 14px 18px; }
    .meta-label { font-size: 11px; text-transform: uppercase; color: #a1a1aa; letter-spacing: 0.5px; margin-bottom: 4px; }
    .meta-val { font-size: 14px; font-weight: 600; color: #fff; word-break: break-all; }
    .card { background: #121215; border: 1px solid #27272a; border-radius: 16px; padding: 24px; margin-bottom: 24px; }
    h2 { font-size: 17px; font-weight: 700; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; color: #fafafa; }
    .matches-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    .matches-table th { text-align: left; padding: 10px 14px; font-size: 12px; color: #a1a1aa; border-bottom: 1px solid #27272a; }
    .matches-table td { padding: 12px 14px; font-size: 13px; border-bottom: 1px solid #1c1c20; }
    .btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 8px; font-size: 12px; font-weight: 600; text-decoration: none; cursor: pointer; transition: all 0.2s; }
    .btn-play { background: #22c55e; color: #000; font-weight: 700; }
    .btn-play:hover { background: #16a34a; }
    .btn-download { background: #27272a; color: #fff; border: 1px solid #3f3f46; margin-left: 6px; }
    .btn-download:hover { background: #3f3f46; }
    .log-box { background: #000; border: 1px solid #1f1f23; border-radius: 10px; padding: 16px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; color: #4ade80; max-height: 220px; overflow-y: auto; line-height: 1.6; }
    .instructions { background: #18181b; border-left: 4px solid #3b82f6; padding: 16px 20px; border-radius: 0 12px 12px 0; margin-bottom: 20px; font-size: 13px; color: #d4d4d8; line-height: 1.6; }
    .instructions strong { color: #60a5fa; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="title-row">
        <h1>⚽ Complejo Área 41 - Servidor de Videos</h1>
        <div class="badge"><div class="pulse"></div> EN LÍNEA Y GRABANDO</div>
      </div>
      <div class="meta-grid">
        <div class="meta-box">
          <div class="meta-label">Carpeta vigilada en la PC</div>
          <div class="meta-val">${WATCH_DIR}</div>
        </div>
        <div class="meta-box">
          <div class="meta-label">Dirección en esta PC</div>
          <div class="meta-val">http://localhost:${PORT}</div>
        </div>
        <div class="meta-box">
          <div class="meta-label">Acceso Red Local / Wi-Fi</div>
          <div class="meta-val">http://${LOCAL_IP}:${PORT}</div>
        </div>
        <div class="meta-box">
          <div class="meta-label">Partidos Disponibles</div>
          <div class="meta-val" style="color: #4ade80; font-size: 18px;">${matchesList.length}</div>
        </div>
      </div>
    </div>

    <div class="instructions">
      <strong>📌 ¿Cómo llegan las grabaciones acá?</strong><br>
      Configurá en el DVR Dahua (o SmartPSS) para volcar las grabaciones continuas o por horario en la carpeta compartida <code>${WATCH_DIR}</code>.<br>
      El sistema detecta automáticamente la cancha (Cancha 1 / Cancha 2), la cámara y la franja horaria para que se vea en la web.
    </div>

    <div class="card">
      <h2>🎥 Partidos Detectados y Listos (${matchesList.length})</h2>
      ${
        matchesList.length === 0
          ? '<p style="color: #71717a; font-size: 13px; padding: 16px 0;">Esperando que el DVR guarde los primeros archivos de video en C:\\Grabaciones_Area41...</p>'
          : `<table class="matches-table">
              <thead>
                <tr>
                  <th>Cancha</th>
                  <th>Cámara</th>
                  <th>Fecha</th>
                  <th>Horario</th>
                  <th>Tamaño</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                ${matchesList
                  .map(
                    (m) => `<tr>
                    <td><strong>${m.courtName}</strong></td>
                    <td>${m.cameraName}</td>
                    <td>${m.date}</td>
                    <td><span style="color: #4ade80; font-weight: 600;">${m.time}</span></td>
                    <td>${m.sizeMb}</td>
                    <td>
                      <a href="${m.videoUrl}" target="_blank" class="btn btn-play">▶ Ver</a>
                      <a href="${m.downloadUrl}" class="btn btn-download">⬇ Descargar</a>
                    </td>
                  </tr>`
                  )
                  .join('')}
              </tbody>
            </table>`
      }
    </div>

    <div class="card">
      <h2>📋 Registro de Actividad en Vivo</h2>
      <div class="log-box">
        ${
          logHistory.length > 0
            ? logHistory.map((l) => `<div>${l}</div>`).join('')
            : '<div>Sistema iniciado correctamente. Esperando videos del DVR...</div>'
        }
      </div>
    </div>
  </div>

  <script>
    // Auto-actualizar panel cada 10 segundos
    setTimeout(() => location.reload(), 10000);
  </script>
</body>
</html>
  `);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('====================================================');
  console.log('⚽ SISTEMA DE GRABACIÓN AUTOMÁTICA - ÁREA 41');
  console.log('====================================================');
  console.log(`[OK] Servidor activo y escuchando en el puerto ${PORT}`);
  console.log(`📍 Acceso en esta PC:       http://localhost:${PORT}`);
  console.log(`📱 Acceso en la red local:  http://${LOCAL_IP}:${PORT}`);
  console.log(`📁 Carpeta de grabaciones:  ${WATCH_DIR}`);
  console.log('----------------------------------------------------');
  console.log('📡 Esperando grabaciones del DVR Dahua...');
  console.log('[!] Mantén esta ventana abierta para el funcionamiento.');
  console.log('====================================================');
  addLog('Servidor de videos iniciado correctamente.');
});
