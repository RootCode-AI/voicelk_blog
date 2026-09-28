import { config } from '../config.js';

const escape = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Email clients ignore stylesheets and web fonts, so the brand is carried by
// inline styles and a serif fallback stack.
function layout({ preheader, body, footer = '' }) {
  return `<!doctype html>
<html><body style="margin:0;background:#fcfcfc;font-family:Georgia,'Times New Roman',serif;color:#1a1a1a">
<span style="display:none;max-height:0;overflow:hidden">${escape(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fcfcfc;padding:40px 16px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid rgba(0,0,0,0.08);border-radius:12px">
<tr><td style="padding:36px 36px 8px;font-size:22px;font-style:italic">VoiceLK Journal</td></tr>
<tr><td style="padding:8px 36px 32px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#373a46">${body}</td></tr>
</table>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#6b6e7a;max-width:560px;line-height:1.5">${footer}</p>
</td></tr></table></body></html>`;
}

const button = (href, label) =>
  `<a href="${escape(href)}" style="display:inline-block;background:#1a1a1a;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:600">${escape(label)}</a>`;

export function confirmSubscriptionEmail(token) {
  const link = `${config.publicUrl}/newsletter/confirm?token=${token}`;
  return {
    subject: 'Confirm your VoiceLK Journal subscription',
    text: `Confirm your subscription to the VoiceLK Journal:\n${link}\n\nIf you did not ask for this, ignore this email.`,
    html: layout({
      preheader: 'One click to start receiving new research notes.',
      body: `<p>Thanks for your interest in our work on Sinhala–English speech synthesis.</p>
<p>Confirm your address and we will email you whenever a new note is published.</p>
<p style="margin:28px 0">${button(link, 'Confirm subscription')}</p>
<p style="font-size:13px;color:#6b6e7a">If you did not ask for this, ignore this email — you will not be added.</p>`,
    }),
  };
}

export function newPostEmail(post, unsubscribeToken) {
  const postUrl = `${config.publicUrl}/blog/${post.slug}`;
  const unsubscribeUrl = `${config.publicUrl}/newsletter/unsubscribe?token=${unsubscribeToken}`;
  return {
    subject: post.title,
    headers: { 'List-Unsubscribe': `<${unsubscribeUrl}>` },
    text: `${post.title}\n\n${post.excerpt ?? ''}\n\nRead it: ${postUrl}\n\nUnsubscribe: ${unsubscribeUrl}`,
    html: layout({
      preheader: post.excerpt || post.title,
      body: `<p style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#6b6e7a;margin:0 0 8px">New research note</p>
<h1 style="font-family:Georgia,serif;font-weight:400;font-size:28px;line-height:1.2;color:#1a1a1a;margin:0 0 16px">${escape(post.title)}</h1>
${post.excerpt ? `<p>${escape(post.excerpt)}</p>` : ''}
<p style="margin:28px 0">${button(postUrl, 'Read the note')}</p>`,
      footer: `You receive this because you subscribed to the VoiceLK Journal. <a href="${escape(unsubscribeUrl)}" style="color:#6b6e7a">Unsubscribe</a>.`,
    }),
  };
}

export function contactEmail({ name, email, message }) {
  return {
    subject: `Contact form: ${name}`,
    text: `From: ${name} <${email}>\n\n${message}`,
    html: layout({
      preheader: `Message from ${name}`,
      body: `<p><strong>${escape(name)}</strong> &lt;${escape(email)}&gt; wrote:</p>
<p style="white-space:pre-wrap;border-left:3px solid rgba(0,0,0,0.12);padding-left:14px">${escape(message)}</p>
<p style="font-size:13px;color:#6b6e7a">Reply to this email to answer them directly.</p>`,
    }),
  };
}
