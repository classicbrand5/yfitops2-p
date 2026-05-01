import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export default function Index() {
  const navigate = useNavigate();
  const { isAuthenticated, isAuthLoading } = useAuth();

  useEffect(() => {
    if (!isAuthLoading) {
      navigate(isAuthenticated ? '/dashboard' : '/', { replace: true });
    }
  }, [isAuthenticated, isAuthLoading, navigate]);

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: '#060609' }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: '#00F5A0', borderTopColor: 'transparent' }}
        />
        <span className="text-sm" style={{ color: '#5C5C7A', fontFamily: 'var(--font-body)' }}>
          Loading YFitOps…
        </span>
      </div>
    </div>
  );
}
