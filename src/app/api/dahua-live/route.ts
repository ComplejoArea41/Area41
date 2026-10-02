import { NextRequest, NextResponse } from 'next/server';
import http from 'http';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const DAHUA_HOST = process.env.DAHUA_HOST || '192.168.1.108';
const DAHUA_USER = process.env.DAHUA_USER || 'admin';
const DAHUA_PASS = process.env.DAHUA_PASS || 'delfina2029';

// Obtener un snapshot JPEG del DVR Dahua con Digest Auth
function fetchDahuaSnapshot(channel: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const uri = `/cgi-bin/snapshot.cgi?channel=${channel}`;
    const timeout = 3500;

    const req1 = http.get(`http://${DAHUA_HOST}${uri}`, { timeout }, (res1) => {
      if (res1.statusCode !== 401) {
        const chunks: Buffer[] = [];
        res1.on('data', (c) => chunks.push(c));
        res1.on('end', () => resolve(Buffer.concat(chunks)));
        return;
      }

      const authHeader = res1.headers['www-authenticate'] || '';
      const realmMatch = authHeader.match(/realm="([^"]+)"/);
      const nonceMatch = authHeader.match(/nonce="([^"]+)"/);

      if (!realmMatch || !nonceMatch) {
        return reject(new Error('No se pudo autenticar con el DVR Dahua (Digest no soportado)'));
      }

      const realm = realmMatch[1];
      const nonce = nonceMatch[1];
      const qop = 'auth';
      const nc = '00000001';
      const cnonce = crypto.randomBytes(8).toString('hex');

      const ha1 = crypto.createHash('md5').update(`${DAHUA_USER}:${realm}:${DAHUA_PASS}`).digest('hex');
      const ha2 = crypto.createHash('md5').update(`GET:${uri}`).digest('hex');
      const response = crypto.createHash('md5').update(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`).digest('hex');

      const authVal = `Digest username="${DAHUA_USER}", realm="${realm}", nonce="${nonce}", uri="${uri}", qop=${qop}, nc=${nc}, cnonce="${cnonce}", response="${response}"`;

      const req2 = http.get(
        `http://${DAHUA_HOST}${uri}`,
        { headers: { Authorization: authVal }, timeout },
        (res2) => {
          if (res2.statusCode !== 200) {
            return reject(new Error(`DVR respondió con status ${res2.statusCode}`));
          }
          const chunks: Buffer[] = [];
          res2.on('data', (c) => chunks.push(c));
          res2.on('end', () => resolve(Buffer.concat(chunks)));
        }
      );

      req2.on('error', reject);
      req2.on('timeout', () => {
        req2.destroy();
        reject(new Error('Timeout conectando al DVR'));
      });
    });

    req1.on('error', reject);
    req1.on('timeout', () => {
      req1.destroy();
      reject(new Error('Timeout conectando al DVR'));
    });
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const channel = parseInt(searchParams.get('channel') || '1', 10);

  try {
    const imageBuffer = await fetchDahuaSnapshot(channel);

    return new Response(new Uint8Array(imageBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error: any) {
    // Si no responde el DVR (por ejemplo en despliegue fuera de la red local), usar fallback si existe
    try {
      const fallbackPath = path.join(process.cwd(), 'public', `cam${channel}.jpg`);
      if (fs.existsSync(fallbackPath)) {
        const fallbackBuf = fs.readFileSync(fallbackPath);
        return new Response(new Uint8Array(fallbackBuf), {
          status: 200,
          headers: {
            'Content-Type': 'image/jpeg',
            'Cache-Control': 'no-cache',
          },
        });
      }
    } catch (e) {}

    return NextResponse.json(
      { error: 'DVR Dahua no responde', details: error.message },
      { status: 502 }
    );
  }
}
