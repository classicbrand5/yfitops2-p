import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';

export default function NotFound() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error('404 Error: User attempted to access non-existent route:', location.pathname);
  }, [location.pathname]);

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: '#060609', fontFamily: 'var(--font-body)' }}
    >
      <div className="text-center animate-fade-up">
        <div
          className="text-8xl font-bold mb-4"
          style={{ fontFamily: 'var(--font-display)', color: '#00F5A0', textShadow: '0 0 40px rgba(0,245,160,0.3)' }}
        >
          404
        </div>
        <p className="text-xl font-semibold mb-2" style={{ color: '#EEEEFF' }}>
          Page not found
        </p>
        <p className="text-sm mb-8" style={{ color: '#5C5C7A' }}>
          <code
            className="px-2 py-0.5 rounded text-xs"
            style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.06)', fontFamily: 'var(--font-mono)', color: '#FF4D6D' }}
          >
            {location.pathname}
          </code>
          {' '}doesn't exist in this workspace.
        </p>
        <button
          onClick={() => navigate('/')}
          className="btn-primary"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </button>
      </div>
    </div>
  );
}
