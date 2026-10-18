import { Subscriber } from '../models/Subscriber.js';
import { newPostEmail } from './emails.js';
import { sendBatch } from './mailer.js';
import { config } from '../config.js';

// Emails a published post to every confirmed subscriber.
export async function notifySubscribers(post) {
  const subscribers = await Subscriber.find({ status: 'active' }).select('email unsubscribeToken').lean();
  // Replies reach the team's inbox; the sending address need not have a mailbox.
  const replyTo = config.mail.contactTo || undefined;
  const messages = subscribers.map((s) => ({ to: s.email, replyTo, ...newPostEmail(post, s.unsubscribeToken) }));
  return sendBatch(messages);
}
