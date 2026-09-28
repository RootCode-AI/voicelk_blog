import { Subscriber } from '../models/Subscriber.js';
import { newPostEmail } from './emails.js';
import { sendBatch } from './mailer.js';

// Emails a published post to every confirmed subscriber.
export async function notifySubscribers(post) {
  const subscribers = await Subscriber.find({ status: 'active' }).select('email unsubscribeToken').lean();
  const messages = subscribers.map((s) => ({ to: s.email, ...newPostEmail(post, s.unsubscribeToken) }));
  return sendBatch(messages);
}
