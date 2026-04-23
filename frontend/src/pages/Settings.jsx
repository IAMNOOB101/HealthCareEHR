import React from 'react';
import { useSelector } from 'react-redux';
import { Settings as SettingsIcon, User, Shield, Bell, Globe } from 'lucide-react';
import { PageHeader, Card, CardHeader, CardBody } from '../components/ui';

const SettingRow = ({ label, description, children }) => (
  <div className="flex items-start justify-between gap-4 py-4 border-b border-border last:border-0">
    <div>
      <p className="text-sm font-medium text-foreground">{label}</p>
      {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
    </div>
    <div className="flex-shrink-0">{children}</div>
  </div>
);

const Settings = () => {
  const { user } = useSelector((s) => s.auth);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Settings" subtitle="Manage your profile and application preferences" />

      {/* Profile */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            <p className="font-semibold text-sm">Profile</p>
          </div>
        </CardHeader>
        <CardBody>
          <div className="flex items-center gap-4 mb-6">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold">
              {user?.username?.slice(0, 2).toUpperCase() || 'ST'}
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">{user?.username || 'Staff User'}</p>
              <p className="text-sm text-muted-foreground capitalize">{user?.roleName || 'Staff'}</p>
              {user?.email && <p className="text-sm text-muted-foreground">{user.email}</p>}
            </div>
          </div>

          <SettingRow label="User ID" description="Your system identifier">
            <span className="font-mono text-xs text-muted-foreground">{user?.id || '—'}</span>
          </SettingRow>
          <SettingRow label="Role" description="Access level in the system">
            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-primary/10 text-primary">
              {user?.roleName || 'Staff'}
            </span>
          </SettingRow>
        </CardBody>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <p className="font-semibold text-sm">Security</p>
          </div>
        </CardHeader>
        <CardBody>
          <SettingRow label="Session Timeout" description="Auto-logout after inactivity">
            <select className="h-8 rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
              <option>30 minutes</option>
              <option>1 hour</option>
              <option>2 hours</option>
              <option>4 hours</option>
            </select>
          </SettingRow>
          <SettingRow label="Two-Factor Authentication" description="Additional login security">
            <span className="text-xs text-muted-foreground">Coming soon</span>
          </SettingRow>
        </CardBody>
      </Card>

      {/* System */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            <p className="font-semibold text-sm">System</p>
          </div>
        </CardHeader>
        <CardBody>
          <SettingRow label="EHR System Version" description="Backend API version">
            <span className="font-mono text-xs text-muted-foreground">v2.0.0 — Sequelize + PostgreSQL</span>
          </SettingRow>
          <SettingRow label="API Base URL" description="Connected backend">
            <span className="font-mono text-xs text-muted-foreground">
              {import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}
            </span>
          </SettingRow>
        </CardBody>
      </Card>
    </div>
  );
};

export default Settings;
