import { Resend } from 'resend';
import { config } from '../config.js';

const resend = config.mail.resendApiKey ? new Resend(config.mail.resendApiKey) : null;

export const mailEnabled = Boolean(resend);

if (!resend) {
  console.info('[mail] RESEND_API_KEY is not set — emails will be printed to the console instead of sent.');
}

function logInstead(message) {
  console.info(`\n[mail:dev] to=${[message.to].flat().join(', ')}  subject="${message.subject}"\n${message.text}\n`);
}

export async function sendMail({ to, subject, html, text, replyTo, headers }) {
  const message = { from: config.mail.from, to, subject, html, text, replyTo, headers };
  if (!resend) {
    logInstead(message);
    return { id: 'dev' };
  }
  const { data, error } = await resend.emails.send(message);
  if (error) throw new Error(`Resend: ${error.message}`);
  return data;
}

// Resend's batch endpoint takes up to 100 messages per call.
export async function sendBatch(messages) {
  let sent = 0;
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100).map((m) => ({ from: config.mail.from, ...m }));
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
