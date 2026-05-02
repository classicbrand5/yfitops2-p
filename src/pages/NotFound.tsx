import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useEffect } from 'react';
import { ArrowLeft, Home } from 'lucide-react';

export default function NotFound() {
  const location = useLocation();
  const navigate  = useNavigate();

  useEffect(() => {
    console.error('404 Error: User attempted to access non-existent route:', location.pathname);
  }, [location.pathname]);

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: '#060609', fontFamily: 'var(--font-body)' }}
    >
      <div className="text-center animate-fade-up">
        {/* 404 heading */}
        <div
          className="text-8xl font-bold mb-4"
          style={{
            fontFamily: 'var(--font-display)',
            color: '#00F5A0',
            textShadow: '0 0 40px rgba(0,245,160,0.3)',
          }}
        >
          404
        </div>

        <p className="text-xl font-semibold mb-2" style={{ color: '#EEEEFF' }}>
          Page not found
        </p>

        <p className="text-sm mb-8" style={{ color: '#5C5C7A' }}>
          <code
            className="px-2 py-0.5 rounded text-xs"
            style={{
              background: '#111118',
              border: '1px solid rgba(255,255,255,0.06)',
              fontFamily: 'var(--font-mono)',
              color: '#FF4D6D',
            }}
          >
            {location.pathname}
          </code>
          {' '}doesn&apos;t exist in this workspace.
        </p>

        {/* Navigation links */}
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#9494B8',
            }}
          >
            <ArrowLeft className="w-4 h-4" />
            Go back
          </button>

          <Link
            to="/dashboard"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150"
            style={{
              background: 'rgba(0,245,160,0.1)',
              border: '1px solid rgba(0,245,160,0.25)',
              color: '#00F5A0',
              textDecoration: 'none',
            }}
          >
            <Home className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
