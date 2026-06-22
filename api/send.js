// Vercel Serverless Function — sendet Beitrittserklärung als E-Mail mit PDF- und JSON-Anhang
// Erwartet POST mit { pdfBase64, name, str, plzort, gebdat, tel, mail, copyToApplicant,
//                     vorstandConfirmed, aufnahmeDatum, photoConsent }
// Die JSON-Datei kann der Vorstand in die Mitgliederverwaltung importieren.
import { Resend } from 'resend';

const VEREIN_MAIL = 'info@schuetzenverein-lau-brechte.de';
// Verifizierte Vereins-Domain bei Resend (DKIM/SPF gesetzt am 04.06.2026)
const FROM = 'SV Lau-Brechte Beitrittserklärung <antrag@schuetzenverein-lau-brechte.de>';

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

  const {
    pdfBase64, name, str, plzort, gebdat, tel, mail, copyToApplicant,
    vorstandConfirmed, aufnahmeDatum, photoConsent
  } = body;
  if (!pdfBase64 || !name) return res.status(400).json({ error: 'PDF und Name sind Pflicht' });

  // PDF-Größe begrenzen (Schutz vor riesigen Uploads)
  if (pdfBase64.length > 4_000_000) return res.status(413).json({ error: 'PDF zu groß' });

  try {
    const resend = new Resend(apiKey);
    const buffer = Buffer.from(pdfBase64, 'base64');
    const cleanName = String(name).replace(/[^a-zA-Z0-9äöüÄÖÜß _-]/g, '').replace(/\s+/g, '_');
    const filename = `Beitrittserklaerung_${cleanName || 'Antrag'}.pdf`;

    // JSON mit Rohdaten — für Import in die Mitgliederverwaltung.
    const antragData = {
      type: 'svlb-antrag',
      version: 1,
      submittedAt: new Date().toISOString(),
      name: name || '',
      str: str || '',
      plzort: plzort || '',
      gebdat: gebdat || '',
      tel: tel || '',
      mail: mail || '',
      photoConsent: photoConsent || null,
      vorstandConfirmed: !!vorstandConfirmed,
      aufnahmeDatum: aufnahmeDatum || ''
    };
    const jsonFilename = `antrag_${cleanName || 'Antrag'}.json`;
    const jsonBuffer = Buffer.from(JSON.stringify(antragData, null, 2), 'utf-8');

    const recipients = [VEREIN_MAIL];
    if (copyToApplicant && mail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
      recipients.push(mail);
    }

    const html = `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Neue Beitrittserklärung</title></head><body style="margin:0;padding:0;background:#eceae3;font-family:Arial,Helvetica,sans-serif;color:#222;line-height:1.5">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="max-width:600px;width:100%;margin:0 auto;background:#fff;border-collapse:collapse">
        <tr><td style="background:linear-gradient(135deg,#1e4d2b 0%,#143820 100%);background-color:#1e4d2b;padding:28px 20px 22px;text-align:center;color:#fff">
          <img src="https://sv-laubrechte-antrag.vercel.app/logo-white.png" alt="Schützenverein Lau-Brechte e.V." width="140" style="display:block;margin:0 auto 8px;max-width:140px;height:auto;border:0;outline:none">
          <div style="font-size:.8rem;letter-spacing:2px;opacity:.85;margin-top:2px;font-style:italic">seit 1645</div>
          <div style="margin-top:18px;padding-top:14px;border-top:1px solid rgba(255,255,255,.22);font-size:.98rem;font-weight:600">📋 Neue Beitrittserklärung</div>
        </td></tr>
        <tr><td style="background:#f7f7f4;padding:22px 24px">
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
        <p style="margin-top:20px;font-size:.9rem;background:#fff;padding:10px 12px;border-left:3px solid #5a8c3e;color:#444"><strong>Tipp:</strong> Die mitgeschickte Datei <code>${esc(jsonFilename)}</code> kann direkt in der Mitgliederverwaltung über &bdquo;Antrag importieren&ldquo; geladen werden — dann wird der Interessent als neuer Eintrag (Bezirk noch offen) angelegt.</p>
        <p style="margin-top:20px;font-size:.85rem;color:#888">— Automatisch generiert vom Online-Antrag unter <a href="https://sv-laubrechte-antrag.vercel.app/" style="color:#1e4d2b">sv-laubrechte-antrag.vercel.app</a></p>
        </td></tr>
      </table>
    </body></html>`;

    const result = await resend.emails.send({
      from: FROM,
      to: recipients,
      subject: `Neue Beitrittserklärung — ${name}`,
      html,
      attachments: [
        { filename, content: buffer },
        { filename: jsonFilename, content: jsonBuffer }
      ]
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
