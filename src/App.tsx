import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import AppShell from '@/components/layout/AppShell';

// Pages
import Index from './pages/Index';
import NotFound from './pages/NotFound';

// Lazy-loaded pages
const Landing     = lazy(() => import('./pages/Landing'));
const Auth        = lazy(() => import('./pages/Auth'));
const Dashboard   = lazy(() => import('./pages/Dashboard'));
const WorkspacePage = lazy(() => import('./pages/WorkspacePage'));
const BuildMonitor  = lazy(() => import('./pages/BuildMonitor'));
const Analytics   = lazy(() => import('./pages/Analytics'));
const Settings    = lazy(() => import('./pages/Settings'));
const Billing     = lazy(() => import('./pages/Billing'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
    },
  },
});

function PageFallback() {
  return (
    <div
      className="h-full flex items-center justify-center"
      style={{ background: '#0C0C12' }}
    >
      <div
        className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: '#00F5A0', borderTopColor: 'transparent' }}
      />
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner
        theme="dark"
        toastOptions={{
          style: {
            background: '#16161F',
            border: '1px solid rgba(255,255,255,0.07)',
            color: '#EEEEFF',
            fontFamily: 'var(--font-body)',
          },
        }}
      />
      <BrowserRouter>
        <Routes>
          {/* Public routes — no shell */}
          <Route path="/" element={
            <Suspense fallback={<PageFallback />}>
              <Landing />
            </Suspense>
          } />
          <Route path="/auth" element={
            <Suspense fallback={<PageFallback />}>
              <Auth />
            </Suspense>
          } />

          {/* App routes — inside AppShell */}
          <Route element={<AppShell />}>
            <Route index path="/home" element={<Index />} />
            <Route path="/dashboard" element={
              <Suspense fallback={<PageFallback />}>
                <Dashboard />
              </Suspense>
            } />
            <Route path="/workspace" element={
              <Suspense fallback={<PageFallback />}>
                <WorkspacePage />
              </Suspense>
            } />
            <Route path="/builds" element={
              <Suspense fallback={<PageFallback />}>
                <BuildMonitor />
              </Suspense>
            } />
            <Route path="/analytics" element={
              <Suspense fallback={<PageFallback />}>
                <Analytics />
              </Suspense>
            } />
            <Route path="/settings" element={
              <Suspense fallback={<PageFallback />}>
                <Settings />
              </Suspense>
            } />
            <Route path="/billing" element={
              <Suspense fallback={<PageFallback />}>
                <Billing />
              </Suspense>
            } />
          </Route>

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
