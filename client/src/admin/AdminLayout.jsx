import { Suspense } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router';
import { AudioLines, ExternalLink, FileText, Inbox, LogOut, Plus, Users } from 'lucide-react';
import { Logo } from '../components/Navbar.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const nav = [
  { to: '/admin', label: 'Posts', icon: FileText, end: true },
  { to: '/admin/subscribers', label: 'Subscribers', icon: Users },
  { to: '/admin/messages', label: 'Messages', icon: Inbox },
  { to: '/evaluate/console', label: 'Evaluation', icon: AudioLines },
];

export function AddBlogButton({ className = '' }) {
  return (
    <Link to="/admin/posts/new" className={`btn-dark ${className}`}>
      <Plus className="size-4" />
      Add post
    </Link>
  );
}

export default function AdminLayout() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-[100dvh] bg-paper md:grid md:grid-cols-[15rem_1fr]">
      <aside className="border-b border-line bg-white md:sticky md:top-0 md:flex md:h-[100dvh] md:flex-col md:border-b-0 md:border-r">
        <div className="flex items-center justify-between gap-2 p-4 md:p-5">
          <Logo />
        </div>
        <div className="hidden px-4 md:block">
          <AddBlogButton className="w-full" />
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:mt-6 md:flex-col md:pb-0">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive ? 'bg-wash font-medium text-ink' : 'text-muted hover:bg-wash hover:text-ink'
                }`
              }
            >
              <Icon className="size-4" />
              {label}
            </NavLink>
          ))}
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-wash hover:text-ink"
          >
            <ExternalLink className="size-4" />
            View site
          </a>
        </nav>
        <div className="mt-auto hidden border-t border-line p-4 md:block">
          <p className="truncate text-sm font-medium">{admin?.name || 'Editor'}</p>
          <p className="truncate text-xs text-muted">{admin?.email}</p>
          <button
            onClick={async () => {
              await logout();
              navigate('/admin/login');
            }}
            className="mt-3 flex items-center gap-2 text-sm text-muted hover:text-ink"
          >
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
  );
}
