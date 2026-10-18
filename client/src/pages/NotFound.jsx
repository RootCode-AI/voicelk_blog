import { Link, useLocation } from 'react-router';
import Seo from '../components/Seo.jsx';
import { BrandMark } from '../components/Brand.jsx';

export default function NotFound() {
  const { pathname } = useLocation();
  return (
    <div className="mx-auto flex min-h-[80dvh] max-w-xl flex-col items-center justify-center px-4 text-center">
      <Seo title="Page not found" description="This VoiceLK page is unavailable. Explore the product journey, visit the homepage or find answers in the FAQ." path={pathname} noIndex />
      {/* Nothing to hear: the bars fall silent. Hovering lets them try again. */}
      <div className="group mb-6">
        <BrandMark voice="silent" className="h-16 w-auto" />
      </div>
      <p className="eyebrow">404</p>
      <h1 className="mt-4 font-serif text-6xl">
        Nothing to <em>hear</em> here.
      </h1>
      <p className="mt-4 text-muted">That page does not exist, or the note has been unpublished.</p>
      <Link to="/journey" className="btn-dark mt-8">
        Explore the journey
      </Link>
      <div className="mt-4 flex gap-4"><Link to="/" className="btn-ghost">Go to homepage</Link><Link to="/faq" className="btn-ghost">Visit the FAQ</Link></div>
    </div>
  );
}
