import { NextResponse } from 'next/server';

// Cache en memoria para evitar duplicados si se presiona doble clic o reintenta la red
const recentNotifications = new Map<string, number>();

function isDuplicate(key: string): boolean {
  const now = Date.now();
  // Limpiar llaves viejas de más de 30 segundos
  for (const [k, timestamp] of recentNotifications.entries()) {
    if (now - timestamp > 30000) {
      recentNotifications.delete(k);
    }
  }

  if (recentNotifications.has(key)) {
    const lastTime = recentNotifications.get(key)!;
    if (now - lastTime < 15000) {
      return true;
    }
  }

  recentNotifications.set(key, now);
  return false;
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { court, date, time, total, customerName, customerPhone, cancellations } = data;

    const dedupeKey = `${court}-${date}-${time}-${customerPhone}`;
    if (isDuplicate(dedupeKey)) {
      console.log('Aviso duplicado ignorado para:', dedupeKey);
      return NextResponse.json({ success: true, duplicate: true });
    }

    const message = 
      `🚨 *NUEVA RESERVA EN AREA 41*\n\n` +
      `⚽ *Cancha:* ${court || 'No especificada'}\n` +
      `📅 *Fecha:* ${date || 'No especificada'}\n` +
      `⏰ *Horario:* ${time || 'No especificado'}\n` +
      `💰 *Total:* $${Number(total || 0).toLocaleString('es-AR')}\n\n` +
      `👤 *Cliente:* ${customerName || 'No especificado'}\n` +
      `📞 *Teléfono:* ${customerPhone || 'No especificado'}` +
      (cancellations > 0 ? `\n\n⚠️ *Cancelaciones previas:* ${cancellations}` : '');

    const apiUrl = process.env.GREEN_API_URL || 'https://7105.api.greenapi.com';
    const idInstance = process.env.GREEN_API_ID_INSTANCE || '710522730649';
    const apiToken = process.env.GREEN_API_TOKEN_INSTANCE || 'b0cb493a41c740d6b54ed2f4d2be882d190c0c82f4d74a548d';
    const recipientPhone = process.env.WHATSAPP_NOTIFICATION_PHONE || '5492324500029';

    if (idInstance && apiToken) {
      try {
        const url = `${apiUrl.replace(/\/$/, '')}/waInstance${idInstance}/sendMessage/${apiToken}`;
        const chatId = `${recipientPhone.replace(/[^0-9]/g, '')}@c.us`;

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chatId: chatId,
            message: message,
          }),
        });

        const resData = await response.json().catch(() => ({}));
        console.log('Respuesta Green-API:', resData);
      } catch (greenApiErr) {
        console.error('Error enviando WhatsApp con Green API:', greenApiErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error procesando notificación de reserva:', error);
    return NextResponse.json({ success: false, error: 'Internal Error' }, { status: 500 });
  }
}
