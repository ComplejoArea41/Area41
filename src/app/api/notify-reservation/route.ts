import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { court, date, time, total, customerName, customerPhone, cancellations } = data;

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
    const apiToken = process.env.GREEN_API_TOKEN_INSTANCE;
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
