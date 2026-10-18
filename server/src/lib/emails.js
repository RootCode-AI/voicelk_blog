import { config } from '../config.js';

const escape = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Brand colours from the logo. Email clients ignore stylesheets and web fonts, so
// everything is inline and the type falls back to Arial and Georgia.
const NAVY = '#002251';
const BLUE = '#0059b3';
const GREEN = '#01956e';

// The logo is the PNG the build generates from assets/brand/voicelk-logo.png. Mail
// clients fetch it from the live site, so it needs an absolute URL; when images are
// blocked, the alt text still reads "VoiceLK" in brand navy.
const logo = () =>
  `<img src="${escape(config.publicUrl)}/brand/voicelk-logo.png" width="168" height="33" alt="VoiceLK" style="display:block;border:0;outline:none;height:auto;max-width:168px;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:${NAVY}">`;

function layout({ preheader, body, footer = '' }) {
  return `<!doctype html>
<html><body style="margin:0;background:#fcfcfc;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a">
<span style="display:none;max-height:0;overflow:hidden">${escape(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fcfcfc;padding:40px 16px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid rgba(0,0,0,0.08);border-radius:12px;overflow:hidden">
<tr><td style="padding:0;font-size:0;line-height:0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td width="50%" height="4" style="background:${BLUE};font-size:0;line-height:0">&nbsp;</td><td width="50%" height="4" style="background:${GREEN};font-size:0;line-height:0">&nbsp;</td></tr></table></td></tr>
<tr><td style="padding:32px 36px 8px"><a href="${escape(config.publicUrl)}" style="text-decoration:none">${logo()}</a></td></tr>
<tr><td style="padding:16px 36px 32px;font-size:15px;line-height:1.6;color:#373a46">${body}</td></tr>
</table>
<p style="font-size:12px;color:#6b6e7a;max-width:560px;line-height:1.6;margin:16px auto 0">${footer ? `${footer}<br>` : ''}<span style="color:${NAVY};font-weight:700">VoiceLK</span> &middot; Sinhala&ndash;English text to speech &middot; <a href="${escape(config.publicUrl)}" style="color:#6b6e7a">Visit the website</a></p>
</td></tr></table></body></html>`;
}

const button = (href, label) =>
  `<a href="${escape(href)}" style="display:inline-block;background:${NAVY};color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:600">${escape(label)}</a>`;

export function confirmSubscriptionEmail(token) {
  const link = `${config.publicUrl}/newsletter/confirm?token=${token}`;
  return {
    subject: 'Confirm your VoiceLK subscription',
    text: `Confirm your subscription to VoiceLK updates:\n${link}\n\nIf you did not ask for this, ignore this email.`,
    html: layout({
      preheader: 'One click to start receiving VoiceLK updates.',
      body: `<p>Thanks for your interest in VoiceLK, our Sinhala–English text-to-speech product.</p>
<p>Confirm your address and we will email you whenever a new note is published.</p>
<p style="margin:28px 0">${button(link, 'Confirm subscription')}</p>
<p style="font-size:13px;color:#6b6e7a">If you did not ask for this, ignore this email — you will not be added.</p>`,
    }),
  };
}

// Sent the moment someone subscribes. The same copy as templates/voicelk-welcome.html,
// which is kept for the Resend dashboard.
export function welcomeEmail(unsubscribeToken) {
  const unsubscribeUrl = `${config.publicUrl}/newsletter/unsubscribe?token=${unsubscribeToken}`;
  return {
    subject: 'Welcome to VoiceLK',
    headers: { 'List-Unsubscribe': `<${unsubscribeUrl}>` },
    text: `Welcome to VoiceLK

Thank you for subscribing. VoiceLK turns mixed Sinhala and English text into natural speech, and we are building it from research at Rajarata University of Sri Lanka.

We will email you when we publish something new: the Journey behind the product (problems, experiments and decisions) and the Research results, often with audio samples you can hear.

Explore VoiceLK: ${config.publicUrl}

Unsubscribe: ${unsubscribeUrl}`,
    html: layout({
      preheader: 'Thanks for subscribing to VoiceLK, Sinhala-English text to speech.',
      body: `<h1 style="font-family:Georgia,serif;font-weight:400;font-size:28px;line-height:1.2;color:${NAVY};margin:0 0 16px">Welcome to VoiceLK</h1>
<p>Thank you for subscribing. VoiceLK turns mixed Sinhala and English text into natural speech, and we are building it from research at Rajarata University of Sri Lanka.</p>
<p>We will email you when we publish something new: the <strong style="color:${NAVY}">Journey</strong> behind the product &mdash; problems, experiments and decisions &mdash; and the <strong style="color:${NAVY}">Research</strong> results, often with audio samples you can hear.</p>
<p style="margin:28px 0">${button(config.publicUrl, 'Explore VoiceLK')}</p>`,
      footer: `You receive this because you subscribed to VoiceLK updates. <a href="${escape(unsubscribeUrl)}" style="color:#6b6e7a">Unsubscribe</a>.`,
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
      body: `<p style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#6b6e7a;margin:0 0 8px">New VoiceLK update</p>
<h1 style="font-family:Georgia,serif;font-weight:400;font-size:28px;line-height:1.2;color:${NAVY};margin:0 0 16px">${escape(post.title)}</h1>
${post.excerpt ? `<p>${escape(post.excerpt)}</p>` : ''}
<p style="margin:28px 0">${button(postUrl, 'Read the note')}</p>`,
      footer: `You receive this because you subscribed to VoiceLK updates. <a href="${escape(unsubscribeUrl)}" style="color:#6b6e7a">Unsubscribe</a>.`,
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
