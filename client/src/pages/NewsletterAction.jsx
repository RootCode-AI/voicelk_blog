import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Loader2 } from 'lucide-react';
import { api } from '../lib/api.js';
import Seo from '../components/Seo.jsx';

const COPY = {
  confirm: {
    path: '/subscribers/confirm',
    done: (email) => ({ title: 'You are subscribed', body: `New notes will arrive at ${email}.` }),
  },
  unsubscribe: {
    path: '/subscribers/unsubscribe',
    done: (email) => ({ title: 'You are unsubscribed', body: `${email} will not receive any more emails from us.` }),
  },
};

// Landing page for the links in confirmation and newsletter emails.
export default function NewsletterAction({ action }) {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [state, setState] = useState({ status: 'loading' });
  // Tokens are single-use, so the request must go out exactly once.
  const sentFor = useRef(undefined);

  useEffect(() => {
    if (sentFor.current === token) return;
    sentFor.current = token;
    if (!token) {
      setState({ status: 'error', message: 'This link is missing its token.' });
      return;
    }
    api
      .post(COPY[action].path, { token })
      .then((res) => setState({ status: 'done', ...COPY[action].done(res.email) }))
      .catch((err) => setState({ status: 'error', message: err.message }));
  }, [action, token]);

  return (
    <div className="mx-auto flex min-h-[80dvh] max-w-xl flex-col items-center justify-center px-4 text-center">
      <Seo title="Newsletter preference" path={`/newsletter/${action}`} noIndex />
      {state.status === 'loading' && <Loader2 className="size-6 animate-spin text-muted" />}
      {state.status === 'done' && (
        <>
          <h1 className="font-serif text-5xl">{state.title}</h1>
          <p className="mt-4 text-muted">{state.body}</p>
        </>
      )}
      {state.status === 'error' && (
        <>
          <h1 className="font-serif text-5xl">That did not work</h1>
          <p className="mt-4 text-muted">{state.message}</p>
        </>
      )}
      <Link to="/blog" className="btn-ghost mt-8">
        Go to the journal
      </Link>
    </div>
  );
}
