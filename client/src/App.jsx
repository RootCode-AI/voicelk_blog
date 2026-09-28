import { Suspense, lazy } from 'react';
import { Outlet, RouterProvider, createBrowserRouter } from 'react-router';
import { Loader2 } from 'lucide-react';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import About from './pages/About.jsx';
import Blog from './pages/Blog.jsx';
import Home from './pages/Home.jsx';
import NewsletterAction from './pages/NewsletterAction.jsx';
import NotFound from './pages/NotFound.jsx';
import PublicLayout from './pages/PublicLayout.jsx';

// Charts, maths and highlighting only load when someone opens a post or the admin.
const Post = lazy(() => import('./pages/Post.jsx'));
const AdminLayout = lazy(() => import('./admin/AdminLayout.jsx'));
const Dashboard = lazy(() => import('./admin/Dashboard.jsx'));
const PostEditor = lazy(() => import('./admin/editor/PostEditor.jsx'));
const Subscribers = lazy(() => import('./admin/Subscribers.jsx'));
const Messages = lazy(() => import('./admin/Messages.jsx'));
const Login = lazy(() => import('./admin/Login.jsx'));
const RequireAdmin = lazy(() => import('./admin/RequireAdmin.jsx'));

function Loading() {
  return (
    <div className="grid min-h-[60dvh] place-items-center">
      <Loader2 className="size-6 animate-spin text-muted" />
    </div>
  );
}

function Root() {
  return (
    <ToastProvider>
      <Suspense fallback={<Loading />}>
        <Outlet />
      </Suspense>
    </ToastProvider>
  );
}

// Only the admin area asks the server who is signed in; readers never need to.
function AdminRoot() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}

const router = createBrowserRouter([
  {
    element: <Root />,
    children: [
      {
        element: <PublicLayout />,
        children: [
          { path: '/', element: <Home /> },
          { path: '/blog', element: <Blog /> },
          { path: '/blog/:slug', element: <Post /> },
          { path: '/about', element: <About /> },
          { path: '/newsletter/confirm', element: <NewsletterAction action="confirm" /> },
          { path: '/newsletter/unsubscribe', element: <NewsletterAction action="unsubscribe" /> },
          { path: '*', element: <NotFound /> },
        ],
      },
      {
        element: <AdminRoot />,
        children: [
          { path: '/admin/login', element: <Login /> },
          {
            path: '/admin',
            element: (
              <RequireAdmin>
                <AdminLayout />
              </RequireAdmin>
            ),
            children: [
              { index: true, element: <Dashboard /> },
              { path: 'posts/new', element: <PostEditor /> },
              { path: 'posts/:id', element: <PostEditor /> },
              { path: 'subscribers', element: <Subscribers /> },
              { path: 'messages', element: <Messages /> },
            ],
          },
        ],
      },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
