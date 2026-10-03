const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const crypto = require('crypto');
const os = require('os');
const { spawn } = require('child_process');

let ffmpegPath = null;
try {
  ffmpegPath = require('ffmpeg-static');
} catch (e) {
  const localFfmpeg = path.join(__dirname, 'node_modules', 'ffmpeg-static', 'ffmpeg.exe');
  if (fs.existsSync(localFfmpeg)) ffmpegPath = localFfmpeg;
}

// ============================================================================
// CONFIGURACIÓN - COMPLEJO DEPORTIVO ÁREA 41
// ============================================================================
const PORT = 4141;
const WATCH_DIR = path.join('C:', 'Grabaciones_Area41');
const MAX_STORAGE_GB = 24; // Máximo 24 GB en disco para proteger espacio en C:

const DAHUA_HOST = process.env.DAHUA_HOST || '192.168.1.108';
const DAHUA_USER = process.env.DAHUA_USER || 'admin';
const DAHUA_PASS = process.env.DAHUA_PASS || 'delfina2029';

const SUPABASE_URL = 'https://nvnroianmerzznfzaqzo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_oYrYbWYLQPv1Bpr-pH_-iQ_jHXtBkZI';

// Mapeo Canales Dahua <-> Canchas y Cámaras
const CHANNEL_MAP = {
  1: { courtId: 'cancha-1', courtName: 'Cancha 1', cameraId: 'cam-1', cameraName: 'Cámara 1' },
  2: { courtId: 'cancha-1', courtName: 'Cancha 1', cameraId: 'cam-2', cameraName: 'Cámara 2' },
  3: { courtId: 'cancha-2', courtName: 'Cancha 2', cameraId: 'cam-1', cameraName: 'Cámara 1' },
  4: { courtId: 'cancha-2', courtName: 'Cancha 2', cameraId: 'cam-2', cameraName: 'Cámara 2' },
};

function getChannelNumber(courtId, cameraId) {
  for (const [ch, info] of Object.entries(CHANNEL_MAP)) {
    if (info.courtId === courtId && info.cameraId === cameraId) return parseInt(ch, 10);
  }
  return 1;
}

// Crear la carpeta de grabaciones si no existe
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
let activePublicTunnelUrl = '';
let activeOnDemandJob = null; // { key, progress, startTime }

function addLog(msg) {
  const timestamp = new Date().toLocaleTimeString('es-AR');
  const logEntry = `[${timestamp}] ${msg}`;
  console.log(logEntry);
  logHistory.unshift(logEntry);
  if (logHistory.length > 100) logHistory.pop();
}

// ============================================================================
// GESTIÓN DE TÚNEL CLOUDFLARE Y REGISTRO EN SUPABASE
// Permite que la gente vea los videos desde sus casas (4G/Wi-Fi externo)
// ============================================================================
async function updateSupabaseTunnelUrl(tunnelUrl) {
  activePublicTunnelUrl = tunnelUrl;
  addLog(`🌐 Túnel Cloudflare activo: ${tunnelUrl}`);

  return new Promise((resolve) => {
    const payload = JSON.stringify({
      image_url: tunnelUrl,
      is_active: true,
    });

    const req = https.request(
      `${SUPABASE_URL}/rest/v1/background_images?id=eq.recording_server_tunnel`,
      {
        method: 'PATCH',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            addLog(`✅ Supabase actualizado con la URL pública para la app.`);
            resolve(true);
          } else {
            addLog(`⚠️ Error al actualizar Supabase (${res.statusCode}): ${body}`);
            resolve(false);
          }
        });
      }
    );

    req.on('error', (err) => {
      addLog(`⚠️ Error de red al actualizar Supabase: ${err.message}`);
      resolve(false);
    });

    req.write(payload);
    req.end();
  });
}

function startCloudflareTunnel() {
  const cloudflaredExe = path.join(__dirname, 'cloudflared.exe');
  if (!fs.existsSync(cloudflaredExe)) {
    addLog('⚠️ No se encontró cloudflared.exe en ' + __dirname);
    return;
  }

  addLog('🚀 Iniciando túnel seguro Cloudflare...');
  const tunnelProcess = spawn(cloudflaredExe, ['tunnel', '--url', `http://localhost:${PORT}`]);

  const handleOutput = (data) => {
    const str = data.toString();
    const match = str.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
    if (match && match[0]) {
      const url = match[0];
      if (url !== activePublicTunnelUrl) {
        updateSupabaseTunnelUrl(url);
      }
    }
  };

  tunnelProcess.stdout.on('data', handleOutput);
  tunnelProcess.stderr.on('data', handleOutput);

  tunnelProcess.on('close', (code) => {
    addLog(`⚠️ Túnel Cloudflare finalizado (código ${code}). Reiniciando en 5s...`);
    setTimeout(startCloudflareTunnel, 5000);
  });
}

// ============================================================================
// CONTROL DE ESPACIO EN DISCO (PREVENIR QUE SE LLENE C:)
// ============================================================================
function enforceStorageLimit() {
  try {
    if (!fs.existsSync(WATCH_DIR)) return;
    const files = fs.readdirSync(WATCH_DIR);
    const mp4Files = [];
    let totalBytes = 0;

    for (const f of files) {
      if (f.toLowerCase().endsWith('.mp4')) {
        const full = path.join(WATCH_DIR, f);
        try {
          const st = fs.statSync(full);
          totalBytes += st.size;
          mp4Files.push({ name: f, path: full, size: st.size, mtime: st.mtimeMs });
        } catch (_) {}
      }
    }

    const maxBytes = MAX_STORAGE_GB * 1024 * 1024 * 1024;
    if (totalBytes > maxBytes) {
      // Ordenar los más antiguos primero
      mp4Files.sort((a, b) => a.mtime - b.mtime);
      while (totalBytes > maxBytes && mp4Files.length > 0) {
        const oldest = mp4Files.shift();
        try {
          fs.unlinkSync(oldest.path);
          readyMatches.delete(oldest.name);
          totalBytes -= oldest.size;
          addLog(`🧹 Espacio liberado: se eliminó grabación antigua ${oldest.name} (${(oldest.size / (1024 * 1024)).toFixed(1)} MB)`);
        } catch (e) {
          break;
        }
      }
    }
  } catch (err) {
    console.error('Error al verificar almacenamiento:', err.message);
  }
}

// ============================================================================
// ESCANEO DE ARCHIVOS LOCALES EN C:\Grabaciones_Area41
// ============================================================================
function scanLocalFiles() {
  try {
    if (!fs.existsSync(WATCH_DIR)) return;

    // 1. Limpiar entradas de readyMatches cuyos archivos ya no existen o son inválidos
    for (const [key, _] of readyMatches.entries()) {
      const p = path.join(WATCH_DIR, key);
      if (!fs.existsSync(p)) {
        readyMatches.delete(key);
      } else {
        try {
          const st = fs.statSync(p);
          if (st.size < 1000000 || key.startsWith('part_') || key.startsWith('temp_') || key.startsWith('download_') || key.startsWith('.')) {
            readyMatches.delete(key);
          }
        } catch (_) {
          readyMatches.delete(key);
        }
      }
    }

    // 2. Escanear directorio de grabaciones
    const files = fs.readdirSync(WATCH_DIR);
    for (const f of files) {
      // Ignorar y limpiar archivos temporales, ocultos o clips
      if (f.startsWith('part_') || f.startsWith('temp_') || f.startsWith('download_') || f.startsWith('.') || f.startsWith('clip_')) {
        if (f.startsWith('part_') || f.startsWith('temp_')) {
          try { fs.unlinkSync(path.join(WATCH_DIR, f)); } catch (_) {}
        }
        continue;
      }

      if (f.toLowerCase().endsWith('.mp4')) {
        const fullPath = path.join(WATCH_DIR, f);
        try {
          const stats = fs.statSync(fullPath);
          // Sólo registrar grabaciones completas de al menos 1 MB
          if (stats.size > 1000000) {
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
  const lower = fileName.toLowerCase();
  let courtId = 'cancha-1';
  let courtName = 'Cancha 1';
  let cameraId = 'cam-1';
  let cameraName = 'Cámara 1';

  if (lower.includes('cancha-2') || lower.includes('cancha2')) {
    courtId = 'cancha-2';
    courtName = 'Cancha 2';
  }
  if (lower.includes('cam-2') || lower.includes('cam2')) {
    cameraId = 'cam-2';
    cameraName = 'Cámara 2';
  }

  let dateStr = new Date().toISOString().split('T')[0];
  const dateMatch = fileName.match(/(\d{4})[-_](\d{2})[-_](\d{2})/);
  if (dateMatch) {
    dateStr = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
  }

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
    fullOnlineUrl: activePublicTunnelUrl ? `${activePublicTunnelUrl}/video/${encodeURIComponent(fileName)}` : '',
    detectedAt: new Date().toISOString(),
  };

  readyMatches.set(fileName, matchObj);
}

// ============================================================================
// DESCARGA DIRECTA POR PIPE DE DAHUA A MP4 OPTIMIZADO (FASTSTART)
// Sin crear archivo .dav temporal: ahorra 50% de disco y es 2x más rápido
// ============================================================================
function downloadAndRemuxMatch(channel, dateStr, hour, force = false) {
  return new Promise((resolve, reject) => {
    const camInfo = CHANNEL_MAP[channel];
    if (!camInfo) return reject(new Error('Canal no válido: ' + channel));
    if (!ffmpegPath) return reject(new Error('ffmpeg no encontrado'));

    const startHourStr = hour.toString().padStart(2, '0');
    const endHourStr = ((hour + 1) % 24).toString().padStart(2, '0');
    const targetFileName = `${camInfo.courtId}_${camInfo.cameraId}_${dateStr}_${startHourStr}-00.mp4`;
    const targetMp4Path = path.join(WATCH_DIR, targetFileName);

    // Carpeta temporal aislada para evitar que archivos a medio descargar aparezcan en la app
    const tempDir = path.join(WATCH_DIR, '.temp');
    if (!fs.existsSync(tempDir)) {
      try { fs.mkdirSync(tempDir, { recursive: true }); } catch (_) {}
    }
    const tempMp4Path = path.join(tempDir, `download_${targetFileName}`);

    // Si ya existe y es válido y no se pidió forzar
    if (!force && fs.existsSync(targetMp4Path)) {
      const st = fs.statSync(targetMp4Path);
      if (st.size > 1000000) {
        parseAndRegisterMatch(targetFileName, st.size);
        return resolve({ fileName: targetFileName, path: targetMp4Path, size: st.size });
      }
    }

    // Si es forzado, eliminar archivo previo corrupto
    if (force && fs.existsSync(targetMp4Path)) {
      try {
        fs.unlinkSync(targetMp4Path);
        readyMatches.delete(targetFileName);
      } catch (_) {}
    }

    enforceStorageLimit();

    const startParam = `${dateStr}%20${startHourStr}:00:00`;
    const endParam = `${dateStr}%20${endHourStr}:00:00`;
    const uri = `/cgi-bin/loadfile.cgi?action=startLoad&channel=${channel}&startTime=${startParam}&endTime=${endParam}`;

    http.get(`http://${DAHUA_HOST}${uri}`, (res1) => {
      if (res1.statusCode !== 401) {
        return reject(new Error(`Autenticación Dahua falló con código ${res1.statusCode}`));
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

      http.get(`http://${DAHUA_HOST}${uri}`, { headers: { Authorization: authVal } }, (res2) => {
        if (res2.statusCode !== 200) {
          return reject(new Error(`Dahua HTTP respondió con ${res2.statusCode}`));
        }

        addLog(`📥 Extrayendo y optimizando video: [${camInfo.courtName} - ${camInfo.cameraName}] ${dateStr} ${startHourStr}:00 hs`);

        // Limpiar temporal previo si quedó de una interrupción
        try { if (fs.existsSync(tempMp4Path)) fs.unlinkSync(tempMp4Path); } catch (_) {}

        // Lanzar ffmpeg directamente desde stdin (pipe) hacia la carpeta temporal
        const ff = spawn(ffmpegPath, [
          '-y',
          '-f', 'h264',
          '-i', 'pipe:0',
          '-c:v', 'copy',
          '-c:a', 'aac',
          '-movflags', '+faststart',
          tempMp4Path,
        ]);

        res2.pipe(ff.stdin);

        ff.on('close', (code) => {
          if (code === 0 && fs.existsSync(tempMp4Path)) {
            const st = fs.statSync(tempMp4Path);
            if (st.size > 1000000) {
              try {
                if (fs.existsSync(targetMp4Path)) fs.unlinkSync(targetMp4Path);
                fs.renameSync(tempMp4Path, targetMp4Path);
              } catch (_) {}
              // Eliminar posibles referencias viejas o part_
              readyMatches.delete(`part_${targetFileName}`);
              readyMatches.delete(targetFileName);
              parseAndRegisterMatch(targetFileName, st.size);
              enforceStorageLimit();
              addLog(`✅ ¡LISTO PARA VER ONLINE! [${camInfo.courtName} - ${camInfo.cameraName}] ${dateStr} ${startHourStr}:00 hs (${(st.size / (1024 * 1024)).toFixed(1)} MB)`);
              return resolve({ fileName: targetFileName, path: targetMp4Path, size: st.size });
            }
          }
          try { if (fs.existsSync(tempMp4Path)) fs.unlinkSync(tempMp4Path); } catch (_) {}
          resolve(null);
        });

        ff.on('error', (err) => {
          try { if (fs.existsSync(tempMp4Path)) fs.unlinkSync(tempMp4Path); } catch (_) {}
          reject(err);
        });
      }).on('error', reject);
    }).on('error', reject);
  });
}

// ============================================================================
// SINCRONIZACIÓN AUTOMÁTICA INTELIGENTE EN SEGUNDO PLANO
// Prioriza horas pico de HOY y de AYER en orden inverso (más recientes primero)
// ============================================================================
let isBackgroundSyncing = false;

async function syncRecentMatches() {
  if (isBackgroundSyncing || activeOnDemandJob) return;
  isBackgroundSyncing = true;

  try {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const currentHour = now.getHours();

    // 1. Horas de HOY en orden inverso (de turno anterior hacia atrás)
    const todayHours = [];
    for (let h = currentHour - 1; h >= 14; h--) todayHours.push(h);
    for (let h = 23; h > currentHour; h--) todayHours.push(h);
    for (let h = 13; h >= 8; h--) todayHours.push(h);

    // 2. Horas de AYER (las más jugadas: tarde y noche)
    const yesterdayHours = [23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12];

    const tasks = [];
    for (const h of todayHours) {
      for (let ch = 1; ch <= 4; ch++) {
        tasks.push({ channel: ch, date: todayStr, hour: h });
      }
    }
    for (const h of yesterdayHours) {
      for (let ch = 1; ch <= 4; ch++) {
        tasks.push({ channel: ch, date: yesterdayStr, hour: h });
      }
    }

    for (const t of tasks) {
      if (activeOnDemandJob) break; // Si alguien pide un partido en la web, pausar esto

      const camInfo = CHANNEL_MAP[t.channel];
      const startHourStr = t.hour.toString().padStart(2, '0');
      const targetFileName = `${camInfo.courtId}_${camInfo.cameraId}_${t.date}_${startHourStr}-00.mp4`;
      const targetPath = path.join(WATCH_DIR, targetFileName);

      if (fs.existsSync(targetPath)) continue;

      try {
        await downloadAndRemuxMatch(t.channel, t.date, t.hour);
      } catch (err) {
        // Horario sin grabación o DVR ocupado
      }
    }
  } catch (err) {
    addLog(`⚠️ Error en sincronización de fondo: ${err.message}`);
  } finally {
    isBackgroundSyncing = false;
  }
}

// Iniciar escaneo cada 5s y sincronización de fondo cada 2 minutos
scanLocalFiles();
setInterval(scanLocalFiles, 5000);

setTimeout(syncRecentMatches, 3000);
setInterval(syncRecentMatches, 120000);

// ============================================================================
// SERVIDOR HTTP CON SOPORTE DE STREAMING Y API
// ============================================================================
const server = http.createServer(async (req, res) => {
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
    res.end(
      JSON.stringify({
        ok: true,
        matches: list,
        serverIp: LOCAL_IP,
        port: PORT,
        tunnelUrl: activePublicTunnelUrl,
      })
    );
    return;
  }

  // 2. API: Preparación de partido a demanda (On-Demand)
  // Cuando un usuario toca un turno que aún no se terminó de convertir
  if (pathname === '/api/prepare-match') {
    const courtId = parsedUrl.searchParams.get('courtId') || 'cancha-1';
    const cameraId = parsedUrl.searchParams.get('cameraId') || 'cam-1';
    const date = parsedUrl.searchParams.get('date') || new Date().toISOString().split('T')[0];
    const hour = parseInt(parsedUrl.searchParams.get('hour') || '18', 10);
    const force = parsedUrl.searchParams.get('force') === 'true';

    const channel = getChannelNumber(courtId, cameraId);
    const startHourStr = hour.toString().padStart(2, '0');
    const targetFileName = `${courtId}_${cameraId}_${date}_${startHourStr}-00.mp4`;
    const targetPath = path.join(WATCH_DIR, targetFileName);

    // Si ya existe y no se forzó re-descarga
    if (!force && fs.existsSync(targetPath)) {
      const match = readyMatches.get(targetFileName);
      if (match) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, ready: true, match }));
        return;
      }
    }

    // Si se solicitó forzar, eliminar archivo previo corrupto
    if (force && fs.existsSync(targetPath)) {
      try {
        fs.unlinkSync(targetPath);
        readyMatches.delete(targetFileName);
      } catch (_) {}
    }

    // Si ya se está descargando ahora mismo
    const jobKey = `${channel}_${date}_${hour}`;
    if (activeOnDemandJob && activeOnDemandJob.key === jobKey) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          ok: true,
          ready: false,
          status: 'downloading',
          message: 'Extrayendo video de alta calidad del DVR... Por favor esperá unos segundos.',
        })
      );
      return;
    }

    // Iniciar preparación con máxima prioridad
    activeOnDemandJob = { key: jobKey, startTime: Date.now() };
    addLog(`⚡ Solicitud inmediata del usuario (force=${force}): preparando ${targetFileName}...`);

    downloadAndRemuxMatch(channel, date, hour, force)
      .then((resMatch) => {
        activeOnDemandJob = null;
        if (resMatch) {
          addLog(`🎉 Partido solicitado listo para reproducir: ${targetFileName}`);
        }
      })
      .catch((err) => {
        activeOnDemandJob = null;
        addLog(`❌ Error procesando solicitud inmediata: ${err.message}`);
      });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        ok: true,
        ready: false,
        status: 'started',
        message: 'Iniciando descarga y optimización del partido desde el DVR.',
      })
    );
    return;
  }

  // 3. Healthcheck / Estado
  if (pathname === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'online',
        dahuaHost: DAHUA_HOST,
        tunnelUrl: activePublicTunnelUrl,
        totalMatches: readyMatches.size,
        localIp: LOCAL_IP,
        port: PORT,
        activeJob: activeOnDemandJob ? activeOnDemandJob.key : null,
      })
    );
    return;
  }

  // 4. Streaming de Video con soporte de Range (Seeking en el navegador)
  if (pathname.startsWith('/video/')) {
    const fileName = path.basename(pathname.replace('/video/', ''));
    const filePath = path.join(WATCH_DIR, fileName);

    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Video no encontrado o en procesamiento');
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

  // 5. Descarga directa de archivo completo
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

  // 6. Recorte y Descarga de Clip de 30 Segundos (Goles / Jugadas livianas para WhatsApp y redes)
  if (pathname === '/api/clip' || pathname === '/download-clip') {
    const rawFileName = parsedUrl.searchParams.get('fileName') || '';
    const fileName = path.basename(rawFileName);
    const startSec = Math.max(0, parseInt(parsedUrl.searchParams.get('start') || '0', 10));
    const duration = Math.min(60, Math.max(10, parseInt(parsedUrl.searchParams.get('duration') || '30', 10))); // 30 seg por defecto

    const sourcePath = path.join(WATCH_DIR, fileName);
    if (!fs.existsSync(sourcePath)) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Video completo no encontrado en el servidor' }));
      return;
    }

    const minStr = Math.floor(startSec / 60).toString().padStart(2, '0');
    const secStr = (startSec % 60).toString().padStart(2, '0');
    const clipDownloadName = `Jugada_Area41_min_${minStr}m${secStr}s_30seg.mp4`;

    const clipsDir = path.join(WATCH_DIR, 'clips');
    if (!fs.existsSync(clipsDir)) {
      try { fs.mkdirSync(clipsDir, { recursive: true }); } catch (_) {}
    }

    const clipFileName = `clip_${path.parse(fileName).name}_s${startSec}_d${duration}.mp4`;
    const clipFilePath = path.join(clipsDir, clipFileName);

    // Servir clip si ya fue procesado antes
    if (fs.existsSync(clipFilePath) && fs.statSync(clipFilePath).size > 10000) {
      const stat = fs.statSync(clipFilePath);
      res.writeHead(200, {
        'Content-Type': 'video/mp4',
        'Content-Length': stat.size,
        'Content-Disposition': `attachment; filename="${clipDownloadName}"`,
      });
      fs.createReadStream(clipFilePath).pipe(res);
      return;
    }

    addLog(`✂️ Generando clip de ${duration}s para ${fileName} desde min ${minStr}:${secStr}...`);

    const { execFile } = require('child_process');
    execFile(
      ffmpegPath,
      [
        '-y',
        '-ss', startSec.toString(),
        '-i', sourcePath,
        '-t', duration.toString(),
        '-c', 'copy',
        '-movflags', '+faststart',
        clipFilePath,
      ],
      (err) => {
        if (err || !fs.existsSync(clipFilePath)) {
          addLog(`❌ Error generando clip: ${err ? err.message : 'no creado'}`);
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Error al recortar clip');
          return;
        }

        const stat = fs.statSync(clipFilePath);
        addLog(`✅ Clip de 30s generado con éxito (${(stat.size / (1024 * 1024)).toFixed(1)} MB)!`);
        res.writeHead(200, {
          'Content-Type': 'video/mp4',
          'Content-Length': stat.size,
          'Content-Disposition': `attachment; filename="${clipDownloadName}"`,
        });
        fs.createReadStream(clipFilePath).pipe(res);
      }
    );
    return;
  }

  // 6. Panel de Control HTML
  const matchesList = Array.from(readyMatches.values());
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Área 41 - Servidor Automático de Grabaciones</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0a0a0c; color: #f4f4f5; padding: 24px; }
    .container { max-width: 960px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, #18181b 0%, #09090b 100%); border: 1px solid #27272a; border-radius: 16px; padding: 28px; margin-bottom: 24px; }
    .badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(34, 197, 94, 0.15); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.3); padding: 6px 14px; border-radius: 999px; font-size: 13px; font-weight: 700; }
    .pulse { width: 8px; height: 8px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 10px #22c55e; }
    .meta-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-top: 20px; }
    .meta-box { background: #121215; border: 1px solid #27272a; border-radius: 12px; padding: 14px 18px; }
    .meta-label { font-size: 11px; text-transform: uppercase; color: #a1a1aa; margin-bottom: 4px; }
    .meta-val { font-size: 14px; font-weight: 600; color: #fff; word-break: break-all; }
    .card { background: #121215; border: 1px solid #27272a; border-radius: 16px; padding: 24px; margin-bottom: 24px; }
    .matches-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    .matches-table th { text-align: left; padding: 10px 14px; font-size: 12px; color: #a1a1aa; border-bottom: 1px solid #27272a; }
    .matches-table td { padding: 12px 14px; font-size: 13px; border-bottom: 1px solid #1c1c20; }
    .btn { display: inline-flex; align-items: center; padding: 6px 14px; border-radius: 8px; font-size: 12px; font-weight: 600; text-decoration: none; }
    .btn-play { background: #22c55e; color: #000; font-weight: 700; }
    .btn-download { background: #27272a; color: #fff; border: 1px solid #3f3f46; margin-left: 6px; }
    .log-box { background: #000; border: 1px solid #1f1f23; border-radius: 10px; padding: 16px; font-family: monospace; font-size: 12px; color: #4ade80; max-height: 220px; overflow-y: auto; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h1>⚽ Servidor de Grabaciones Área 41</h1>
        <div class="badge"><div class="pulse"></div> DVR ONLINE</div>
      </div>
      <div class="meta-grid">
        <div class="meta-box"><div class="meta-label">Acceso Online (Túnel Cloudflare)</div><div class="meta-val" style="color:#4ade80;">${activePublicTunnelUrl || 'Iniciando túnel...'}</div></div>
        <div class="meta-box"><div class="meta-label">DVR Dahua</div><div class="meta-val">http://${DAHUA_HOST}</div></div>
        <div class="meta-box"><div class="meta-label">Acceso Local</div><div class="meta-val">http://localhost:${PORT}</div></div>
        <div class="meta-box"><div class="meta-label">Partidos Listos</div><div class="meta-val" style="color:#4ade80; font-size:18px;">${matchesList.length}</div></div>
      </div>
    </div>
    <div class="card">
      <h2>🎥 Partidos Disponibles (${matchesList.length})</h2>
      <table class="matches-table">
        <thead><tr><th>Cancha</th><th>Cámara</th><th>Fecha</th><th>Horario</th><th>Tamaño</th><th>Acción</th></tr></thead>
        <tbody>
          ${matchesList
            .map(
              (m) => `<tr>
              <td><strong>${m.courtName}</strong></td>
              <td>${m.cameraName}</td>
              <td>${m.date}</td>
              <td><span style="color:#4ade80; font-weight:600;">${m.time}</span></td>
              <td>${m.sizeMb}</td>
              <td>
                <a href="${m.videoUrl}" target="_blank" class="btn btn-play">▶ Ver</a>
                <a href="${m.downloadUrl}" class="btn btn-download">⬇ Descargar</a>
              </td>
            </tr>`
            )
            .join('')}
        </tbody>
      </table>
    </div>
    <div class="card">
      <h2>📋 Registro en Tiempo Real</h2>
      <div class="log-box">${logHistory.map((l) => `<div>${l}</div>`).join('')}</div>
    </div>
  </div>
  <script>setTimeout(() => location.reload(), 10000);</script>
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

  // Iniciar túnel de Cloudflare automático
  startCloudflareTunnel();
});
