import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Loader2, LogIn } from 'lucide-react';
import { Logo } from '../components/Navbar.jsx';
import { fadeUp, stagger } from '../components/motion/Reveal.jsx';
import { useWriterAuth } from './WriterAuth.jsx';

export default function WriterLogin() {
  const { user, login } = useWriterAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [state, setState] = useState({ busy: false, error: '' });
  const destination = location.state?.from ?? '/write';

  if (user) return <Navigate to={destination} replace />;

  async function submit(event) {
    event.preventDefault();
    setState({ busy: true, error: '' });
    try {
      await login(email, password);
      navigate(destination, { replace: true });
    } catch (err) {
      setState({ busy: false, error: err.message });
    }
  }

  return (
    <div className="grid min-h-[100dvh] place-items-center px-4">
      <motion.div initial="hidden" animate="show" variants={stagger()} className="w-full max-w-sm">
        <motion.div variants={fadeUp} className="flex justify-center">
          <Logo />
        </motion.div>
        <motion.h1 variants={fadeUp} className="mt-10 text-center font-serif text-4xl">
          Writer sign-in
        </motion.h1>
        <motion.p variants={fadeUp} className="mt-2 text-center text-sm text-muted">
          Write and publish posts for the VoiceLK journey and research.
        </motion.p>
        <motion.form variants={fadeUp} onSubmit={submit} className="card mt-8 space-y-4 p-6">
          <div>
            <label className="field-label" htmlFor="writer-email">Email</label>
            <input
              id="writer-email"
              type="email"
              autoComplete="username"
              className="field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="field-label" htmlFor="writer-password">Password</label>
            <input
              id="writer-password"
              type="password"
              autoComplete="current-password"
              className="field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {state.error && (
            <p className="text-sm text-danger" role="alert">
              {state.error}
            </p>
          )}
          <button type="submit" className="btn-dark w-full" disabled={state.busy}>
            {state.busy ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
            Sign in
          </button>
        </motion.form>
        <motion.p variants={fadeUp} className="mt-6 text-center text-sm text-muted">
          Administrators sign in to the{' '}
          <Link to="/admin/login" className="font-medium text-ink underline underline-offset-4">
            admin panel
          </Link>{' '}
          instead.
        </motion.p>
      </motion.div>
    </div>
  );
}
