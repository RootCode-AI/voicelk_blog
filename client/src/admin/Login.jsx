import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Loader2, LogIn } from 'lucide-react';
import { Logo } from '../components/Navbar.jsx';
import { fadeUp, stagger } from '../components/motion/Reveal.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { admin, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [state, setState] = useState({ busy: false, error: '' });

  if (admin) return <Navigate to={location.state?.from ?? '/admin'} replace />;

  async function submit(event) {
    event.preventDefault();
    setState({ busy: true, error: '' });
    try {
      await login(email, password);
      navigate(location.state?.from ?? '/admin', { replace: true });
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
          Editor sign-in
        </motion.h1>
        <motion.form variants={fadeUp} onSubmit={submit} className="card mt-8 space-y-4 p-6">
          <div>
            <label className="field-label" htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              autoComplete="username"
              className="field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="field-label" htmlFor="login-password">Password</label>
            <input
              id="login-password"
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
      </motion.div>
    </div>
  );
}
