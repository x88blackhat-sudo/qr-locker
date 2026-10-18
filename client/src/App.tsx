import { Suspense, lazy, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { AppShell } from '@/components/layout/AppShell';
import { PageSkeleton } from '@/components/ui/Skeleton';

const Landing = lazy(() => import('@/pages/Landing'));
const Login = lazy(() => import('@/pages/Login'));
const Register = lazy(() => import('@/pages/Register'));
const Legal = lazy(() => import('@/pages/Legal'));
const NotFound = lazy(() => import('@/pages/NotFound'));

const Dashboard = lazy(() => import('@/pages/app/Dashboard'));
const Trial = lazy(() => import('@/pages/app/Trial'));
const Plans = lazy(() => import('@/pages/app/Plans'));
const Subjects = lazy(() => import('@/pages/app/Subjects'));
const SubjectDetail = lazy(() => import('@/pages/app/SubjectDetail'));
const Exams = lazy(() => import('@/pages/app/Exams'));
const Revision = lazy(() => import('@/pages/app/Revision'));
const Analytics = lazy(() => import('@/pages/app/Analytics'));
const Settings = lazy(() => import('@/pages/app/Settings'));

function RouteFallback() {
  return (
    <div className="mx-auto max-w-[1160px] px-4 py-10 sm:px-6 lg:px-8">
      <PageSkeleton />
    </div>
  );
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { me, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <PageSkeleton />
      </div>
    );
  }
  if (!me) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/privacy" element={<Legal kind="privacy" />} />
        <Route path="/terms" element={<Legal kind="terms" />} />

        <Route
          path="/app"
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/app/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="trial" element={<Trial />} />
          <Route path="plans" element={<Plans />} />
          <Route path="subjects" element={<Subjects />} />
          <Route path="subjects/:slug" element={<SubjectDetail />} />
          <Route path="exams" element={<Exams />} />
          <Route path="revision" element={<Revision />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

export { RouteFallback };
