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

    const phone = process.env.WHATSAPP_NOTIFICATION_PHONE || '5492324500029';
    const apiKey = process.env.CALLMEBOT_API_KEY;

    let resultStatus = { sent: false, provider: 'none' };

    // Si está configurado CallMeBot
    if (apiKey) {
      try {
        const encoded = encodeURIComponent(message);
        const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encoded}&apikey=${apiKey}`;
        const response = await fetch(url, { method: 'GET' });
        resultStatus = { sent: response.ok, provider: 'callmebot' };
      } catch (callMeBotErr) {
        console.error('Error enviando WhatsApp con CallMeBot:', callMeBotErr);
      }
    }

    return NextResponse.json({ success: true, ...resultStatus });
  } catch (error) {
    console.error('Error procesando notificación de reserva:', error);
    return NextResponse.json({ success: false, error: 'Internal Error' }, { status: 500 });
  }
}
