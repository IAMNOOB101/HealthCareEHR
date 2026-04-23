import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { ShieldCheck, Search, Filter, Lock } from 'lucide-react';
import { auditLogService } from '../api/auditLog.service';
import { PageHeader, Card, CardBody, Table, Thead, Tbody, Tr, Th, Td, Badge, Spinner, EmptyState, Alert } from '../components/ui';
import { format } from 'date-fns';

const ACTION_COLORS = {
  CREATE: 'success', UPDATE: 'info', DELETE: 'danger',
  LOGIN: 'purple', LOGOUT: 'muted', VIEW: 'muted',
};

const AuditLogs = () => {
  const user = useSelector((s) => s.auth?.user);
  const isAdmin = user?.roleName?.toLowerCase() === 'admin';

  const [logs,     setLogs]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [search,   setSearch]   = useState('');
  const [actionFlt, setActionFlt] = useState('');

  useEffect(() => {
    setLoading(true);
    auditLogService.getAll({ limit: 200 })
      .then((res) => { setLogs(res.items || res.data || []); })
      .catch((err) => { setError(err.response?.data?.message || 'Failed to load audit logs. Admin role required.'); })
      .finally(() => setLoading(false));
  }, []);

  const filtered = logs.filter((log) => {
    const searchMatch = !search ||
      (log.action || '').toLowerCase().includes(search.toLowerCase()) ||
      (log.resource || '').toLowerCase().includes(search.toLowerCase()) ||
      (log.userUsername || log.userId || '').toString().toLowerCase().includes(search.toLowerCase());
    const actionMatch = !actionFlt || log.action === actionFlt;
    return searchMatch && actionMatch;
  });

  const uniqueActions = [...new Set(logs.map((l) => l.action).filter(Boolean))];

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <EmptyState
          icon={Lock}
          title="Access Denied"
          description="You do not have the required administrative permissions to view system audit logs."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Audit Logs"
        subtitle="HIPAA-compliant record of all system access and data modifications"
      />

      {error && <Alert variant="warning">{error}</Alert>}

      {/* Filters */}
      <Card><CardBody className="py-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by action, resource, user…"
              className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
          </div>
          <select value={actionFlt} onChange={(e) => setActionFlt(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
            <option value="">All Actions</option>
            {uniqueActions.map((a) => <option key={a}>{a}</option>)}
          </select>
        </div>
      </CardBody></Card>

      {/* Log Table */}
      <Card>
        {loading ? (
          <CardBody><div className="flex justify-center py-16"><Spinner size="lg" /></div></CardBody>
        ) : filtered.length === 0 ? (
          <CardBody>
            <EmptyState icon={ShieldCheck} title="No audit logs"
              description={error ? 'Insufficient permissions to view logs.' : 'No log entries match your filter.'} />
          </CardBody>
        ) : (
          <>
            <div className="px-5 py-3 border-b border-border flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Showing {filtered.length} of {logs.length} entries</p>
            </div>
            <Table>
              <Thead>
                <Tr>
                  <Th>Timestamp</Th>
                  <Th>User</Th>
                  <Th>Action</Th>
                  <Th>Resource</Th>
                  <Th>Resource ID</Th>
                  <Th>IP Address</Th>
                </Tr>
              </Thead>
              <Tbody>
                {filtered.map((log, i) => (
                  <Tr key={log.id || i}>
                    <Td className="text-xs text-muted-foreground whitespace-nowrap">
                      {log.createdAt ? format(new Date(log.createdAt), 'MMM dd, yyyy HH:mm:ss') : '—'}
                    </Td>
                    <Td>
                      <span className="font-medium text-sm">{log.userUsername || log.userId || '—'}</span>
                    </Td>
                    <Td>
                      <Badge variant={ACTION_COLORS[log.action] || 'muted'}>{log.action || '—'}</Badge>
                    </Td>
                    <Td className="text-sm text-muted-foreground capitalize">{log.resource || log.resourceType || '—'}</Td>
                    <Td className="font-mono text-xs text-muted-foreground">{log.resourceId || '—'}</Td>
                    <Td className="text-xs text-muted-foreground font-mono">{log.ipAddress || '—'}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </>
        )}
      </Card>
    </div>
  );
};

export default AuditLogs;
