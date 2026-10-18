import { Outlet } from 'react-router';
import Seo from '../components/Seo.jsx';
import { WriterAuthProvider } from './WriterAuth.jsx';

// Only the writing desk asks whether a blogger is signed in.
export default function WriterRoot() {
  return (
    <WriterAuthProvider>
      <Seo title="Writing desk" path="/write" noIndex />
      <Outlet />
    </WriterAuthProvider>
  );
}
