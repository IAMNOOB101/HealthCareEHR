import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, FileText, Activity,
  Pill, Settings, CalendarDays, UserRound,
  ShieldCheck, LogOut, ChevronLeft, ChevronRight,
  Stethoscope,
} from 'lucide-react';
import { cn } from '../ui';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout } from '../../store/slices/authSlice';

const NAV_GROUPS = [
  {
    label: 'Clinical',
    items: [
      { name: 'Dashboard',      path: '/',              icon: LayoutDashboard, end: true },
      { name: 'Patients',       path: '/patients',      icon: Users },
      { name: 'Appointments',   path: '/appointments',  icon: CalendarDays },
      { name: 'Documentation',  path: '/documentation', icon: FileText },
      { name: 'Orders',         path: '/orders',        icon: Activity },
      { name: 'Medications',    path: '/medications',   icon: Pill },
    ],
  },
  {
    label: 'Administration',
    items: [
      { name: 'Doctors',     path: '/doctors',     icon: Stethoscope },
      { name: 'Audit Logs',  path: '/audit-logs',  icon: ShieldCheck },
      { name: 'Settings',    path: '/settings',    icon: Settings },
    ],
  },
];

const Sidebar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <div
      className={cn(
        'relative flex flex-col h-full bg-card border-r border-border shadow-sm transition-all duration-300',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-border flex-shrink-0 overflow-hidden">
        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
          <UserRound className="h-4 w-4 text-white" />
        </div>
        {!collapsed && (
          <span className="ml-3 text-base font-bold text-foreground truncate">
            Healthcare <span className="text-primary">EHR</span>
          </span>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="absolute -right-3 top-[4.5rem] z-20 h-6 w-6 rounded-full bg-card border border-border shadow-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
      </button>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-4 overflow-y-auto overflow-x-hidden">
        {NAV_GROUPS.map((group) => {
          const role = user?.roleName?.toLowerCase();
          
          if (role === 'patient' && group.label === 'Administration') {
            return null;
          }

          const filteredItems = group.items.filter(item => {
            const isAdmin = role === 'admin';
            const isPatient = role === 'patient';
            if (item.name === 'Audit Logs') return isAdmin;
            if (isPatient && item.name === 'Documentation') return false;
            return true;
          });

          if (filteredItems.length === 0) return null;

          return (
            <div key={group.label}>
              {!collapsed && (
                <p className="px-3 mb-1 text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest">
                  {group.label}
                </p>
              )}
               <div className="space-y-0.5">
                {filteredItems.map((item) => {
                  const Icon = item.icon;
                  let displayName = item.name;

                  if (role === 'patient') {
                    const patientRenames = {
                      'Patients': 'Your Profile',
                      'Appointments': 'Your Appointments',
                      'Orders': 'Your Orders',
                      'Medications': 'Your Medications'
                    };
                    displayName = patientRenames[item.name] || item.name;
                  }
                  // For patients, the "Patients" item links to /profile
                  const resolvedPath = (role === 'patient' && item.name === 'Patients') ? '/profile' : item.path;
                return (
                  <NavLink
                    key={item.name}
                    to={resolvedPath}
                    end={item.end}
                    title={collapsed ? displayName : undefined}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center rounded-md text-sm font-medium transition-colors group',
                        collapsed ? 'justify-center p-2.5' : 'px-3 py-2.5 gap-3',
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )
                    }
                  >
                    <Icon className="h-4.5 w-4.5 flex-shrink-0 h-5 w-5" />
                    {!collapsed && <span className="truncate">{displayName}</span>}
                  </NavLink>
                );
              })}
            </div>
          </div>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div className="flex-shrink-0 border-t border-border p-3">
        <div className={cn('flex items-center gap-2', collapsed && 'justify-center')}>
          <div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center text-primary font-semibold text-xs flex-shrink-0">
            {user?.username?.slice(0, 2).toUpperCase() || 'ST'}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {user?.username || 'Staff User'}
              </p>
              <p className="text-xs text-muted-foreground truncate capitalize">
                {user?.roleName || 'Staff'}
              </p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={handleLogout}
              title="Sign out"
              className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
        {collapsed && (
          <button
            onClick={handleLogout}
            title="Sign out"
            className="mt-2 w-full flex items-center justify-center p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
