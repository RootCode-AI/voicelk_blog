import { Suspense } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router';
import { AudioLines, ExternalLink, LayoutDashboard, LogOut, UserCog } from 'lucide-react';
import { Logo } from '../components/Navbar.jsx';
import { RequireEvaluator, useEvaluateAuth } from './EvaluateAuth.jsx';

const linkClass = ({ isActive }) =>
  `flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
    isActive ? 'bg-wash font-medium text-ink' : 'text-muted hover:bg-wash hover:text-ink'
  }`;

function Layout() {
  const { user, logout } = useEvaluateAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';

  async function signOut() {
    await logout();
    navigate('/evaluate/login');
  }

  return (
    <div className="min-h-[100dvh] bg-paper md:grid md:grid-cols-[15rem_1fr]">
      <aside className="border-b border-line bg-white md:sticky md:top-0 md:flex md:h-[100dvh] md:flex-col md:border-b-0 md:border-r">
        <div className="flex items-center justify-between gap-2 p-4 md:p-5">
          <Logo />
          <button onClick={signOut} className="btn-icon md:hidden" aria-label="Sign out">
            <LogOut className="size-4" />
          </button>
        </div>
        <p className="eyebrow hidden px-5 md:block">Evaluation console</p>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:mt-3 md:flex-col md:pb-0">
          <NavLink to="/evaluate/console" end className={linkClass}>
            <AudioLines className="size-4" />
            Clips & results
          </NavLink>
          {isAdmin && (
            <NavLink to="/evaluate/console/evaluators" className={linkClass}>
              <UserCog className="size-4" />
              Evaluators
            </NavLink>
          )}
          {isAdmin && (
            <NavLink to="/admin" className={linkClass}>
              <LayoutDashboard className="size-4" />
              Blog admin
            </NavLink>
          )}
          <a href="/evaluate" target="_blank" rel="noreferrer" className={linkClass({ isActive: false })}>
            <ExternalLink className="size-4" />
            Listening page
          </a>
        </nav>
        <div className="mt-auto hidden border-t border-line p-4 md:block">
          <p className="truncate text-sm font-medium">{user?.name || (isAdmin ? 'Administrator' : 'Evaluator')}</p>
          <p className="truncate text-xs text-muted">
            {user?.email} · {isAdmin ? 'admin' : 'evaluator'}
          </p>
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
  );
}

export default function ConsoleLayout() {
  return (
    <RequireEvaluator>
      <Layout />
    </RequireEvaluator>
  );
}
