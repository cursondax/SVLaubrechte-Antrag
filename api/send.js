// Vercel Serverless Function — sendet Beitrittserklärung als E-Mail mit PDF-Anhang
// Erwartet POST mit { pdfBase64, name, str, plzort, gebdat, tel, mail, copyToApplicant }
import { Resend } from 'resend';

const VEREIN_MAIL = 'info@schuetzenverein-lau-brechte.de';
// Resend-Default-Absender — funktioniert ohne Domain-Verifikation
const FROM = 'Beitrittserklärung <onboarding@resend.dev>';

export default async function handler(req, res) {
  // CORS für PWA-Aufrufe
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'RESEND_API_KEY ist nicht konfiguriert. Bitte in Vercel Environment Variables setzen.' });
  }

  let body = req.body;
  // Vercel parsed JSON nur wenn Content-Type passt — sonst manuell
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'Body ist kein gültiges JSON' }); }
  }
  if (!body || typeof body !== 'object') return res.status(400).json({ error: 'Body fehlt' });

  const { pdfBase64, name, str, plzort, gebdat, tel, mail, copyToApplicant } = body;
  if (!pdfBase64 || !name) return res.status(400).json({ error: 'PDF und Name sind Pflicht' });

  // PDF-Größe begrenzen (Schutz vor riesigen Uploads)
  if (pdfBase64.length > 4_000_000) return res.status(413).json({ error: 'PDF zu groß' });

  try {
    const resend = new Resend(apiKey);
    const buffer = Buffer.from(pdfBase64, 'base64');
    const cleanName = String(name).replace(/[^a-zA-Z0-9äöüÄÖÜß _-]/g, '').replace(/\s+/g, '_');
    const filename = `Beitrittserklaerung_${cleanName || 'Antrag'}.pdf`;

    const recipients = [VEREIN_MAIL];
    if (copyToApplicant && mail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
      recipients.push(mail);
    }

    const html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;color:#222;line-height:1.5;max-width:600px">
      <div style="background:#1e4d2b;color:#fff;padding:18px 20px;border-radius:8px 8px 0 0">
        <h2 style="margin:0;font-size:1.2rem">Neue Beitrittserklärung — Schützenverein Lau-Brechte e.V.</h2>
      </div>
      <div style="background:#f7f7f4;padding:20px;border-radius:0 0 8px 8px">
        <p>Eine neue Beitrittserklärung wurde online eingereicht. Das ausgefüllte und unterschriebene PDF findet ihr im Anhang.</p>
        <h3 style="color:#1e4d2b;margin-top:24px;margin-bottom:8px;font-size:1rem">Eckdaten</h3>
        <table style="width:100%;border-collapse:collapse;font-size:.95rem">
          <tr><td style="padding:6px 0;width:140px;color:#666">Name, Vorname</td><td style="padding:6px 0;font-weight:600">${esc(name)}</td></tr>
          <tr><td style="padding:6px 0;color:#666">Straße, Nr.</td><td style="padding:6px 0">${esc(str)}</td></tr>
          <tr><td style="padding:6px 0;color:#666">PLZ, Ort</td><td style="padding:6px 0">${esc(plzort)}</td></tr>
          <tr><td style="padding:6px 0;color:#666">Geburtsdatum</td><td style="padding:6px 0">${esc(gebdat)}</td></tr>
          ${tel ? `<tr><td style="padding:6px 0;color:#666">Telefon</td><td style="padding:6px 0">${esc(tel)}</td></tr>` : ''}
          ${mail ? `<tr><td style="padding:6px 0;color:#666">E-Mail</td><td style="padding:6px 0">${esc(mail)}</td></tr>` : ''}
        </table>
        <p style="margin-top:20px;font-size:.85rem;color:#888">— Automatisch generiert vom Online-Antrag unter <a href="https://sv-laubrechte-antrag.vercel.app/" style="color:#1e4d2b">sv-laubrechte-antrag.vercel.app</a></p>
      </div>
    </body></html>`;

    const result = await resend.emails.send({
      from: FROM,
      to: recipients,
      subject: `Neue Beitrittserklärung — ${name}`,
      html,
      attachments: [{ filename, content: buffer }]
    });

    if (result.error) {
      console.error('Resend-Fehler:', result.error);
      return res.status(500).json({ error: result.error.message || 'Mail-Versand fehlgeschlagen' });
    }

    return res.status(200).json({ ok: true, id: result.data?.id, recipientCount: recipients.length });
  } catch (e) {
    console.error('Send-Error:', e);
    return res.status(500).json({ error: e.message || 'Unbekannter Fehler' });
  }
}

function esc(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}
