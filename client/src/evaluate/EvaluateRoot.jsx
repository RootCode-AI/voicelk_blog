import { Outlet } from 'react-router';
import Seo from '../components/Seo.jsx';
import { EvaluateAuthProvider } from './EvaluateAuth.jsx';

// Only the evaluation console asks who is signed in; listeners never need to.
export default function EvaluateRoot() {
  return (
    <EvaluateAuthProvider>
      <Seo title="Evaluation console" path="/evaluate/console" noIndex />
      <Outlet />
    </EvaluateAuthProvider>
  );
}
