import { Link } from 'react-router';

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[80dvh] max-w-xl flex-col items-center justify-center px-4 text-center">
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
