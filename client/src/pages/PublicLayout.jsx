import { Suspense } from 'react';
import { Outlet } from 'react-router';
import Footer from '../components/Footer.jsx';
import Navbar from '../components/Navbar.jsx';
import SmoothScroll from '../components/motion/SmoothScroll.jsx';

export default function PublicLayout() {
  return (
    <>
      <Navbar />
      <SmoothScroll>
        <main className="min-h-[100dvh]">
          <Suspense fallback={<div className="min-h-[100dvh]" />}>
            <Outlet />
          </Suspense>
        </main>
        <Footer />
      </SmoothScroll>
    </>
  );
}
