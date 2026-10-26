import { Suspense, lazy } from 'react';
import { Outlet, RouterProvider, createBrowserRouter } from 'react-router';
import InfoPage from './pages/InfoPage.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import Seo from './components/Seo.jsx';
import { BrandLoader } from './components/Brand.jsx';
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
const Bloggers = lazy(() => import('./admin/Bloggers.jsx'));
const OpenCode = lazy(() => import('./admin/OpenCode.jsx'));
const WriterRoot = lazy(() => import('./write/WriterRoot.jsx'));
const WriterLogin = lazy(() => import('./write/WriterLogin.jsx'));
const WriterLayout = lazy(() => import('./write/WriterLayout.jsx'));
const Login = lazy(() => import('./admin/Login.jsx'));
const RequireAdmin = lazy(() => import('./admin/RequireAdmin.jsx'));
const Evaluate = lazy(() => import('./pages/Evaluate.jsx'));
const EvaluateRoot = lazy(() => import('./evaluate/EvaluateRoot.jsx'));
const EvaluateLogin = lazy(() => import('./evaluate/EvaluateLogin.jsx'));
const ConsoleLayout = lazy(() => import('./evaluate/ConsoleLayout.jsx'));
const Clips = lazy(() => import('./evaluate/Clips.jsx'));
const ClipResults = lazy(() => import('./evaluate/ClipResults.jsx'));
const Evaluators = lazy(() => import('./evaluate/Evaluators.jsx'));

function Loading() {
  return <BrandLoader />;
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
      <Seo title="Administration" path="/admin" noIndex />
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
          { path: '/journey', element: <Blog key="journey" section="journey" /> },
          { path: '/research', element: <Blog key="research" section="research" /> },
          { path: '/blog/:slug', element: <Post /> },
          { path: '/about', element: <About /> },
          { path: '/evaluate', element: <Evaluate /> },
          ...['/privacy', '/terms', '/faq'].map((path) => ({ path, element: <InfoPage path={path} /> })),
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
              { path: 'bloggers', element: <Bloggers /> },
              { path: 'open-code', element: <OpenCode /> },
            ],
          },
        ],
      },
      {
        element: <WriterRoot />,
        children: [
          { path: '/write/login', element: <WriterLogin /> },
          {
            path: '/write',
            element: <WriterLayout />,
            children: [
              { index: true, element: <Dashboard /> },
              { path: 'posts/new', element: <PostEditor /> },
              { path: 'posts/:id', element: <PostEditor /> },
            ],
          },
        ],
      },
      {
        element: <EvaluateRoot />,
        children: [
          { path: '/evaluate/login', element: <EvaluateLogin /> },
          {
            path: '/evaluate/console',
            element: <ConsoleLayout />,
            children: [
              { index: true, element: <Clips /> },
              { path: 'clips/:id', element: <ClipResults /> },
              { path: 'evaluators', element: <Evaluators /> },
            ],
          },
        ],
      },
    ],
  },
]);

export default function App() {
  return (
    <>
      <RouterProvider router={router} />
    </>
  );
}
