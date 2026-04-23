import React from 'react';
import { Bell, Search } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';

// Map routes to human-readable breadcrumb labels
const BREADCRUMB_MAP = {
  '/':              ['Dashboard'],
  '/patients':      ['Patients'],
  '/appointments':  ['Appointments'],
  '/documentation': ['Documentation'],
  '/orders':        ['Orders'],
  '/medications':   ['Medications'],
  '/doctors':       ['Doctors'],
  '/audit-logs':    ['Audit Logs'],
  '/settings':      ['Settings'],
};

const Header = () => {
  const location = useLocation();
  const { user } = useSelector((s) => s.auth);

  // Build breadcrumb: handle dynamic paths like /patients/123
  const pathParts = location.pathname.split('/').filter(Boolean);
  const basePath = '/' + (pathParts[0] || '');
  const breadcrumbs = BREADCRUMB_MAP[location.pathname]
    || BREADCRUMB_MAP[basePath]
    || [pathParts.join(' / ')];

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 shadow-sm z-10 flex-shrink-0">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">EHR</span>
        <span className="text-muted-foreground">/</span>
        {breadcrumbs.map((crumb, i) => (
          <span
            key={i}
            className={i === breadcrumbs.length - 1 ? 'font-semibold text-foreground' : 'text-muted-foreground'}
          >
            {crumb}
          </span>
        ))}
      </div>

      {/* Right section */}
      <div className="flex items-center gap-3">


        {/* Notification bell */}
        <button
          className="relative p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          title="Notifications"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive border-2 border-card" />
        </button>

        {/* User avatar */}
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center text-primary font-semibold text-xs cursor-pointer hover:bg-primary/25 transition-colors">
            {user?.username?.slice(0, 2).toUpperCase() || 'ST'}
          </div>
          <button 
            onClick={() => {
              // We'll dispatch logout from here as well.
              // Note: we can use window.dispatchEvent to avoid Prop drilling or direct dispatch here if we import dispatch
              window.dispatchEvent(new CustomEvent('auth:unauthorized'));
            }}
            className="text-sm font-medium text-destructive hover:bg-destructive/10 px-3 py-1.5 rounded-md transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
