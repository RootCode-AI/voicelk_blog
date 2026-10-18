import { Navigate, useLocation } from 'react-router';
import { BrandLoader } from '../components/Brand.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function RequireAdmin({ children }) {
  const { admin, checking } = useAuth();
  const location = useLocation();

  if (checking) {
    return (
      <BrandLoader label="Checking your session" className="min-h-[100dvh]" />
    );
  }
  if (!admin) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  return children;
}
