import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { OfflineSyncProvider } from './context/OfflineSyncContext.js';
import { Login } from './pages/Login.js';
import { RegisterOrganizer } from './pages/RegisterOrganizer.js';
import { Dashboard } from './pages/Dashboard.js';
import { LiveMode } from './pages/LiveMode.js';
import { PostEventSummary } from './pages/PostEventSummary.js';
import { AuditLogView } from './pages/AuditLogView.js';
import { PublicRegister } from './pages/PublicRegister.js';

type ViewMode = 'auth_login' | 'auth_register' | 'dashboard' | 'live' | 'summary' | 'audit' | 'public_register';

const MainRouter: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [view, setView] = useState<ViewMode>('dashboard');
  const [activeEventId, setActiveEventId] = useState<string>('');

  // Handle URL query parameters (e.g. ?eventId=...&view=register)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const eventIdParam = params.get('eventId') || params.get('event');
    const viewParam = params.get('view');

    if (eventIdParam) {
      setActiveEventId(eventIdParam);
      if (viewParam === 'register' || !isAuthenticated) {
        setView('public_register');
      }
    }
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-400 font-medium tracking-wide">Initializing GateKeeper...</span>
        </div>
      </div>
    );
  }

  // Public attendee registration route can be accessed by anyone with an eventId
  if (view === 'public_register' && activeEventId) {
    return (
      <PublicRegister
        eventId={activeEventId}
        onBackToDashboard={isAuthenticated ? () => setView('dashboard') : undefined}
      />
    );
  }

  // If not logged in, show login/register
  if (!isAuthenticated) {
    if (view === 'auth_register') {
      return <RegisterOrganizer onNavigateToLogin={() => setView('auth_login')} />;
    }
    return <Login onNavigateToRegister={() => setView('auth_register')} />;
  }

  // Authenticated organizer views
  switch (view) {
    case 'live':
      return (
        <LiveMode
          eventId={activeEventId}
          onExit={() => setView('dashboard')}
          onEventEnded={() => setView('summary')}
        />
      );

    case 'summary':
      return (
        <PostEventSummary
          eventId={activeEventId}
          onBack={() => setView('dashboard')}
        />
      );

    case 'audit':
      return (
        <AuditLogView
          eventId={activeEventId}
          onBack={() => setView('dashboard')}
        />
      );

    case 'dashboard':
    default:
      return (
        <Dashboard
          onEnterLiveMode={(id) => {
            setActiveEventId(id);
            setView('live');
          }}
          onViewSummary={(id) => {
            setActiveEventId(id);
            setView('summary');
          }}
          onViewAuditLog={(id) => {
            setActiveEventId(id);
            setView('audit');
          }}
          onOpenPublicRegister={(id) => {
            setActiveEventId(id);
            setView('public_register');
          }}
        />
      );
  }
};

export function App() {
  return (
    <AuthProvider>
      <OfflineSyncProvider>
        <MainRouter />
      </OfflineSyncProvider>
    </AuthProvider>
  );
}

export default App;
