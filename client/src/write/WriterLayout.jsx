import { Suspense } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router';
import { ExternalLink, FileText, LogOut } from 'lucide-react';
import { Logo } from '../components/Navbar.jsx';
import { AddBlogButton } from '../admin/AdminLayout.jsx';
import { PostScope, WRITER_SCOPE } from '../admin/editor/scope.js';
import { RequireWriter, useWriterAuth } from './WriterAuth.jsx';

const linkClass = ({ isActive }) =>
  `flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
    isActive ? 'bg-wash font-medium text-ink' : 'text-muted hover:bg-wash hover:text-ink'
  }`;

// The writing desk: the same post list and editor as the admin panel, limited to the
// blogger's own posts and without the admin-only options.
function Layout() {
  const { user, logout } = useWriterAuth();
  const navigate = useNavigate();

  async function signOut() {
    await logout();
    navigate('/write/login');
  }

  return (
    <PostScope.Provider value={WRITER_SCOPE}>
      <div className="min-h-[100dvh] bg-paper md:grid md:grid-cols-[15rem_1fr]">
        <aside className="border-b border-line bg-white md:sticky md:top-0 md:flex md:h-[100dvh] md:flex-col md:border-b-0 md:border-r">
          <div className="flex items-center justify-between gap-2 p-4 md:p-5">
            <Logo />
            <button onClick={signOut} className="btn-icon md:hidden" aria-label="Sign out">
              <LogOut className="size-4" />
            </button>
          </div>
          <p className="eyebrow hidden px-5 md:block">Writing desk</p>
          <div className="hidden px-4 md:mt-3 md:block">
            <AddBlogButton className="w-full" />
          </div>
          <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:mt-6 md:flex-col md:pb-0">
            <NavLink to="/write" end className={linkClass}>
              <FileText className="size-4" />
              My posts
            </NavLink>
            <a href="/" target="_blank" rel="noreferrer" className={linkClass({ isActive: false })}>
              <ExternalLink className="size-4" />
              View site
            </a>
          </nav>
          <div className="mt-auto hidden border-t border-line p-4 md:block">
            <p className="truncate text-sm font-medium">{user?.name || 'Writer'}</p>
            <p className="truncate text-xs text-muted">{user?.email} · blogger</p>
            <button onClick={signOut} className="mt-3 flex items-center gap-2 text-sm text-muted hover:text-ink">
              <LogOut className="size-4" /> Sign out
            </button>
          </div>
        </aside>
        <main className="min-w-0">
          <Suspense fallback={<div className="skeleton m-8 h-40" />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </PostScope.Provider>
  );
}

export default function WriterLayout() {
  return (
    <RequireWriter>
      <Layout />
    </RequireWriter>
  );
}
