import { Link } from 'react-router';
import Seo from '../components/Seo.jsx';

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[80dvh] max-w-xl flex-col items-center justify-center px-4 text-center">
      <Seo title="Page not found" noIndex />
      <p className="eyebrow">404</p>
      <h1 className="mt-4 font-serif text-6xl">
        Nothing to <em>hear</em> here.
      </h1>
      <p className="mt-4 text-muted">That page does not exist, or the note has been unpublished.</p>
      <Link to="/blog" className="btn-dark mt-8">
        Back to the journal
      </Link>
    </div>
  );
}
