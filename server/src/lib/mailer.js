import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { config } from '../config.js';

// Three ways to send, in order of preference:
//  - SMTP (e.g. Gmail with an app password): mail comes from that real mailbox, so
//    no domain has to be verified anywhere;
//  - Resend: needs a domain verified at resend.com/domains for the From address;
//  - neither configured: emails are printed to the console (development and tests).
const { smtp } = config.mail;
const transport = smtp.user && smtp.pass
  ? nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    auth: { user: smtp.user, pass: smtp.pass },
  })
  : null;
const resend = !transport && config.mail.resendApiKey ? new Resend(config.mail.resendApiKey) : null;

// Gmail always sends as the signed-in account, so keep MAIL_FROM's display name
// ("VoiceLK") and use the account's own address.
const displayName = /^\s*"?([^"<]*?)"?\s*</.exec(config.mail.from)?.[1] || 'VoiceLK';
export const fromAddress = transport ? `${displayName} <${smtp.user}>` : config.mail.from;

// Resend's shared test sender (…@resend.dev) only delivers to the Resend account's own
// address; every other recipient is refused. Say so loudly instead of failing quietly.
const testSender = Boolean(resend) && /@resend\.dev>?\s*$/i.test(config.mail.from);
export const mailMode = transport ? 'smtp' : resend ? (testSender ? 'resend-test-sender' : 'resend') : 'console';
export const mailEnabled = mailMode !== 'console';

// Tests run without server/.env on purpose, so they can never email anyone.
if (!process.env.NODE_TEST_CONTEXT) {
  if (transport) {
    console.info(`[mail] sending through ${smtp.host} as ${fromAddress}`);
    // Checks the login once at start-up, so a wrong app password shows in the log
    // straight away instead of on the first subscriber.
    transport.verify().catch((err) => {
      console.error(`[mail] ${smtp.host} refused the login for ${smtp.user}: ${err.message}. For Gmail, SMTP_PASS must be a 16-character app password (Google Account > Security > App passwords), not the normal password.`);
    });
  } else if (testSender) {
    console.warn(`[mail] MAIL_FROM is Resend's test sender (${config.mail.from}): only your own Resend address receives email; subscribers get nothing. Set SMTP_USER and SMTP_PASS to send through Gmail, or verify a domain at resend.com/domains.`);
  } else if (!resend) {
    console.info('[mail] No SMTP login or RESEND_API_KEY in server/.env — emails will be printed to the console instead of sent.');
  }
}

function logInstead(message) {
  console.info(`\n[mail:dev] to=${[message.to].flat().join(', ')}  subject="${message.subject}"\n${message.text}\n`);
}

export async function sendMail({ to, subject, html, text, replyTo, headers }) {
  const message = { from: fromAddress, to, subject, html, text, replyTo, headers };
  if (transport) {
    try {
      return await transport.sendMail(message);
    } catch (err) {
      throw new Error(`SMTP: ${err.message}`);
    }
  }
  if (!resend) {
    logInstead(message);
    return { id: 'dev' };
  }
  const { data, error } = await resend.emails.send(message);
  if (error) throw new Error(`Resend: ${error.message}`);
  return data;
}

// Resend's batch endpoint takes up to 100 messages per call; SMTP sends one by one
// (a personal Gmail account allows about 500 recipients a day).
export async function sendBatch(messages) {
  let sent = 0;
  if (transport) {
    for (const m of messages) {
      try {
        await transport.sendMail({ from: fromAddress, ...m });
      } catch (err) {
        throw new Error(`SMTP: ${err.message} (after ${sent} sent)`);
      }
      sent += 1;
    }
    return sent;
  }
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100).map((m) => ({ from: fromAddress, ...m }));
    if (!resend) {
      chunk.forEach(logInstead);
    } else {
      const { error } = await resend.batch.send(chunk);
      if (error) throw new Error(`Resend: ${error.message} (after ${sent} sent)`);
    }
    sent += chunk.length;
  }
  return sent;
}
