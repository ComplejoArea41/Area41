const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const os = require('os');
const { execFile } = require('child_process');

let ffmpegPath = null;
try {
  ffmpegPath = require('ffmpeg-static');
} catch (e) {
  // Fallback to local node_modules path if needed
  const localFfmpeg = path.join(__dirname, 'node_modules', 'ffmpeg-static', 'ffmpeg.exe');
  if (fs.existsSync(localFfmpeg)) ffmpegPath = localFfmpeg;
}

// ============================================================================
// CONFIGURACIÓN - COMPLEJO DEPORTIVO ÁREA 41
// ============================================================================
const PORT = 4141;
const WATCH_DIR = path.join('C:', 'Grabaciones_Area41');

const DAHUA_HOST = process.env.DAHUA_HOST || '192.168.1.108';
const DAHUA_USER = process.env.DAHUA_USER || 'admin';
const DAHUA_PASS = process.env.DAHUA_PASS || 'delfina2029';

// Mapeo Canales Dahua <-> Canchas y Cámaras
const CHANNEL_MAP = {
  1: { courtId: 'cancha-1', courtName: 'Cancha 1', cameraId: 'cam-1', cameraName: 'Cámara 1' },
  2: { courtId: 'cancha-1', courtName: 'Cancha 1', cameraId: 'cam-2', cameraName: 'Cámara 2' },
  3: { courtId: 'cancha-2', courtName: 'Cancha 2', cameraId: 'cam-1', cameraName: 'Cámara 1' },
  4: { courtId: 'cancha-2', courtName: 'Cancha 2', cameraId: 'cam-2', cameraName: 'Cámara 2' },
};

// Crear la carpeta vigilada si no existe
if (!fs.existsSync(WATCH_DIR)) {
  try {
    fs.mkdirSync(WATCH_DIR, { recursive: true });
  } catch (e) {
    console.error(`[ERROR] No se pudo crear la carpeta ${WATCH_DIR}:`, e.message);
  }
}

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

// Lista de partidos disponibles en memoria
const readyMatches = new Map(); // id -> match object
let logHistory = [];

function addLog(msg) {
  const timestamp = new Date().toLocaleTimeString('es-AR');
  const logEntry = `[${timestamp}] ${msg}`;
  console.log(logEntry);
  logHistory.unshift(logEntry);
  if (logHistory.length > 80) logHistory.pop();
}

// ============================================================================
// CLIENTE HTTP CON DIGEST AUTH PARA DVR DAHUA
// ============================================================================
function dahuaRequest(uri) {
  return new Promise((resolve, reject) => {
    const timeout = 6000;
    const req1 = http.get(`http://${DAHUA_HOST}${uri}`, { timeout }, res1 => {
      if (res1.statusCode !== 401) {
        let b = '';
        res1.on('data', c => b += c);
        res1.on('end', () => resolve({ status: res1.statusCode, body: b }));
        return;
      }
      const authHeader = res1.headers['www-authenticate'] || '';
      const realmMatch = authHeader.match(/realm="([^"]+)"/);
      const nonceMatch = authHeader.match(/nonce="([^"]+)"/);
      if (!realmMatch || !nonceMatch) return reject(new Error('No digest header'));

      const realm = realmMatch[1];
      const nonce = nonceMatch[1];
      const qop = 'auth';
      const nc = '00000001';
      const cnonce = crypto.randomBytes(8).toString('hex');

      const ha1 = crypto.createHash('md5').update(`${DAHUA_USER}:${realm}:${DAHUA_PASS}`).digest('hex');
      const ha2 = crypto.createHash('md5').update(`GET:${uri}`).digest('hex');
      const response = crypto.createHash('md5').update(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`).digest('hex');

      const authVal = `Digest username="${DAHUA_USER}", realm="${realm}", nonce="${nonce}", uri="${uri}", qop=${qop}, nc=${nc}, cnonce="${cnonce}", response="${response}"`;

      const req2 = http.get(`http://${DAHUA_HOST}${uri}`, { headers: { Authorization: authVal }, timeout }, res2 => {
        let b = '';
        res2.on('data', c => b += c);
        res2.on('end', () => resolve({ status: res2.statusCode, body: b, headers: res2.headers }));
      });
      req2.on('error', reject);
      req2.on('timeout', () => { req2.destroy(); reject(new Error('Timeout Dahua')); });
    });
    req1.on('error', reject);
    req1.on('timeout', () => { req1.destroy(); reject(new Error('Timeout Dahua')); });
  });
}

// Descarga un archivo de video desde el DVR Dahua a un archivo temporal
function downloadFromDahua(uri, outDavPath) {
  return new Promise((resolve, reject) => {
    http.get(`http://${DAHUA_HOST}${uri}`, res1 => {
      if (res1.statusCode !== 401) return reject(new Error(`Expected 401, got ${res1.statusCode}`));

      const authHeader = res1.headers['www-authenticate'] || '';
      const realmMatch = authHeader.match(/realm="([^"]+)"/);
      const nonceMatch = authHeader.match(/nonce="([^"]+)"/);
      if (!realmMatch || !nonceMatch) return reject(new Error('No digest auth header'));

      const realm = realmMatch[1];
      const nonce = nonceMatch[1];
      const qop = 'auth';
      const nc = '00000001';
      const cnonce = crypto.randomBytes(8).toString('hex');

      const ha1 = crypto.createHash('md5').update(`${DAHUA_USER}:${realm}:${DAHUA_PASS}`).digest('hex');
      const ha2 = crypto.createHash('md5').update(`GET:${uri}`).digest('hex');
      const response = crypto.createHash('md5').update(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`).digest('hex');

      const authVal = `Digest username="${DAHUA_USER}", realm="${realm}", nonce="${nonce}", uri="${uri}", qop=${qop}, nc=${nc}, cnonce="${cnonce}", response="${response}"`;

      http.get(`http://${DAHUA_HOST}${uri}`, { headers: { Authorization: authVal } }, res2 => {
        if (res2.statusCode !== 200) return reject(new Error(`Dahua HTTP status ${res2.statusCode}`));
        const fileStream = fs.createWriteStream(outDavPath);
        res2.pipe(fileStream);
        fileStream.on('finish', () => resolve(true));
        fileStream.on('error', reject);
      }).on('error', reject);
    }).on('error', reject);
  });
}

// Convertir DAV a MP4 estándar ultra-rápido (copiando stream de video H.264)
function remuxDavToMp4(davPath, mp4Path) {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) return reject(new Error('ffmpeg-static no disponible'));
    execFile(
      ffmpegPath,
      ['-y', '-i', davPath, '-c:v', 'copy', '-c:a', 'aac', mp4Path],
      (err) => {
        if (err) return reject(err);
        resolve(true);
      }
    );
  });
}

// ============================================================================
// ESCANEO DE ARCHIVOS LOCALES EN C:\Grabaciones_Area41
// ============================================================================
function scanLocalFiles() {
  try {
    if (!fs.existsSync(WATCH_DIR)) return;
    const files = fs.readdirSync(WATCH_DIR);
    for (const f of files) {
      if (f.toLowerCase().endsWith('.mp4')) {
        const fullPath = path.join(WATCH_DIR, f);
        try {
          const stats = fs.statSync(fullPath);
          if (stats.size > 10000) {
            parseAndRegisterMatch(f, stats.size);
          }
        } catch (_) {}
      }
    }
  } catch (e) {
    console.error('Error scanning local files:', e.message);
  }
}

function parseAndRegisterMatch(fileName, sizeBytes) {
  // ej: cancha1_cam1_2026-10-02_18-00.mp4
  const lower = fileName.toLowerCase();
  let courtId = 'cancha-1';
  let courtName = 'Cancha 1';
  let cameraId = 'cam-1';
  let cameraName = 'Cámara 1';

  if (lower.includes('cancha2') || lower.includes('cancha-2') || lower.includes('ch03') || lower.includes('ch04')) {
    courtId = 'cancha-2';
    courtName = 'Cancha 2';
  }
  if (lower.includes('cam2') || lower.includes('cam-2') || lower.includes('ch02') || lower.includes('ch04')) {
    cameraId = 'cam-2';
    cameraName = 'Cámara 2';
  }

  // Detectar fecha
  let dateStr = new Date().toISOString().split('T')[0];
  const dateMatch = fileName.match(/(\d{4})[-_](\d{2})[-_](\d{2})/);
  if (dateMatch) {
    dateStr = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
  }

  // Detectar hora (ej: _18-00 o _180000 o 18h)
  let startHour = 18;
  const hourMatch = fileName.match(/_(\d{2})[-_]\d{2}/) || fileName.match(/_(\d{2})\d{4}/);
  if (hourMatch) {
    startHour = parseInt(hourMatch[1], 10);
  }

  const endHour = (startHour + 1) % 24;
  const startStr = startHour.toString().padStart(2, '0');
  const endStr = endHour.toString().padStart(2, '0');
  const timeStr = `${startStr}:00 a ${endStr}:00 hs`;

  const sizeMb = (sizeBytes / (1024 * 1024)).toFixed(1);

  const matchObj = {
    id: fileName,
    fileName,
    courtId,
    courtName,
    cameraId,
    cameraName,
    date: dateStr,
    time: timeStr,
    startHour,
    sizeMb: `${sizeMb} MB`,
    videoUrl: `/video/${encodeURIComponent(fileName)}`,
    downloadUrl: `/download/${encodeURIComponent(fileName)}`,
    fullLocalUrl: `http://${LOCAL_IP}:${PORT}/video/${encodeURIComponent(fileName)}`,
    detectedAt: new Date().toISOString(),
  };

  readyMatches.set(fileName, matchObj);
}

// ============================================================================
// SINCRONIZACIÓN AUTOMÁTICA CON EL DVR DAHUA
// Detecta las horas finalizadas hoy y las descarga a MP4
// ============================================================================
let isSyncing = false;

async function syncWithDahuaDvr() {
  if (isSyncing) return;
  isSyncing = true;

  try {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    const currentHour = today.getHours();

    // Revisar los canales de las cámaras
    for (let channel = 1; channel <= 4; channel++) {
      const camInfo = CHANNEL_MAP[channel];
      if (!camInfo) continue;

      // Buscar turnos terminados hoy (desde las 00:00 hasta la hora anterior)
      for (let h = 0; h < currentHour; h++) {
        const startHourStr = h.toString().padStart(2, '0');
        const endHourStr = ((h + 1) % 24).toString().padStart(2, '0');
        const targetFileName = `${camInfo.courtId}_${camInfo.cameraId}_${dateStr}_${startHourStr}-00.mp4`;
        const targetMp4Path = path.join(WATCH_DIR, targetFileName);

        // Si ya lo tenemos descargado y listo, registrarlo
        if (fs.existsSync(targetMp4Path)) {
          const stats = fs.statSync(targetMp4Path);
          if (stats.size > 10000) {
            parseAndRegisterMatch(targetFileName, stats.size);
            continue;
          }
        }

        // Si no está descargado todavía, pedirlo al DVR Dahua
        try {
          addLog(`📥 Descargando grabación de DVR: [${camInfo.courtName} - ${camInfo.cameraName}] Turno ${startHourStr}:00 a ${endHourStr}:00 hs...`);
          
          const startParam = `${dateStr}%20${startHourStr}:00:00`;
          const endParam = `${dateStr}%20${endHourStr}:00:00`;
          const loadUri = `/cgi-bin/loadfile.cgi?action=startLoad&channel=${channel}&startTime=${startParam}&endTime=${endParam}`;

          const tempDav = path.join(WATCH_DIR, `temp_${camInfo.courtId}_${camInfo.cameraId}_${h}.dav`);
          await downloadFromDahua(loadUri, tempDav);

          const davStats = fs.statSync(tempDav);
          if (davStats.size > 100000) {
            addLog(`🔄 Convirtiendo a MP4 optimizado para web (${(davStats.size / (1024 * 1024)).toFixed(1)} MB)...`);
            await remuxDavToMp4(tempDav, targetMp4Path);
            try { fs.unlinkSync(tempDav); } catch (_) {}

            const mp4Stats = fs.statSync(targetMp4Path);
            parseAndRegisterMatch(targetFileName, mp4Stats.size);
            addLog(`✅ ¡LISTO! Partido grabado y disponible en la app: [${camInfo.courtName} - ${camInfo.cameraName}] ${startHourStr}:00 hs (${(mp4Stats.size / (1024 * 1024)).toFixed(1)} MB)`);
          } else {
            // Archivo vacío o sin movimiento en ese horario
            try { fs.unlinkSync(tempDav); } catch (_) {}
          }
        } catch (downloadErr) {
          // Si el DVR no tiene video en esa franja horaria o timeout
        }
      }
    }
  } catch (err) {
    addLog(`⚠️ Error al sincronizar con DVR Dahua: ${err.message}`);
  } finally {
    isSyncing = false;
  }
}

// Escanear carpeta local cada 5 segundos
setInterval(scanLocalFiles, 5000);
scanLocalFiles();

// Sincronizar con DVR Dahua al inicio y cada 3 minutos
syncWithDahuaDvr();
setInterval(syncWithDahuaDvr, 180000);

// ============================================================================
// SERVIDOR WEB Y DE STREAMING DE VIDEO (HTTP RANGE / 206 PARTIAL CONTENT)
// ============================================================================
const server = http.createServer((req, res) => {
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

  // 1. API: Listado de partidos disponibles
  if (pathname === '/api/matches') {
    const list = Array.from(readyMatches.values());
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true, matches: list, serverIp: LOCAL_IP, port: PORT }));
    return;
  }

  // 2. Healthcheck / Estado
  if (pathname === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'online',
      dahuaHost: DAHUA_HOST,
      watchDir: WATCH_DIR,
      totalMatches: readyMatches.size,
      localIp: LOCAL_IP,
      port: PORT,
      uptimeMinutes: Math.floor(process.uptime() / 60)
    }));
    return;
  }

  // 3. Streaming de Video con soporte de Range (seeking fluido)
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
    const contentType = ext === '.mp4' ? 'video/mp4' : 'video/octet-stream';

    if (range) {
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
      'Content-Type': 'video/mp4',
      'Content-Length': stat.size,
      'Content-Disposition': `attachment; filename="${fileName}"`,
    });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  // 5. Panel de Control Web y Monitoreo Local
  const matchesList = Array.from(readyMatches.values());

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
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="title-row">
        <h1>⚽ Complejo Área 41 - Servidor Automático</h1>
        <div class="badge"><div class="pulse"></div> CONECTADO AL DVR (${DAHUA_HOST})</div>
      </div>
      <div class="meta-grid">
        <div class="meta-box">
          <div class="meta-label">DVR Dahua</div>
          <div class="meta-val">http://${DAHUA_HOST}</div>
        </div>
        <div class="meta-box">
          <div class="meta-label">Carpeta en esta PC</div>
          <div class="meta-val">${WATCH_DIR}</div>
        </div>
        <div class="meta-box">
          <div class="meta-label">Acceso Local</div>
          <div class="meta-val">http://localhost:${PORT}</div>
        </div>
        <div class="meta-box">
          <div class="meta-label">Partidos Listos</div>
          <div class="meta-val" style="color: #4ade80; font-size: 18px;">${matchesList.length}</div>
        </div>
      </div>
    </div>

    <div class="card">
      <h2>🎥 Partidos Grabados (${matchesList.length})</h2>
      ${
        matchesList.length === 0
          ? '<p style="color: #71717a; font-size: 13px; padding: 16px 0;">Descargando y sincronizando turnos finalizados desde el DVR Dahua...</p>'
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
      <h2>📋 Registro de Sincronización</h2>
      <div class="log-box">
        ${
          logHistory.length > 0
            ? logHistory.map((l) => `<div>${l}</div>`).join('')
            : '<div>Conectando con el DVR Dahua...</div>'
        }
      </div>
    </div>
  </div>

  <script>
    setTimeout(() => location.reload(), 10000);
  </script>
</body>
</html>
  `);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('====================================================');
  console.log('⚽ SERVIDOR DE GRABACIONES AUTOMÁTICAS - ÁREA 41');
  console.log('====================================================');
  console.log(`[OK] Servidor activo en puerto ${PORT}`);
  console.log(`📹 Conectado al DVR Dahua:   http://${DAHUA_HOST}`);
  console.log(`📍 Acceso local:             http://localhost:${PORT}`);
  console.log(`📱 Acceso red local:         http://${LOCAL_IP}:${PORT}`);
  console.log(`📁 Carpeta de grabaciones:   ${WATCH_DIR}`);
  console.log('====================================================');
  addLog(`Servidor iniciado. Conectado a DVR Dahua (${DAHUA_HOST}).`);
});
