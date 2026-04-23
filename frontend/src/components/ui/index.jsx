import React, { useState, createContext, useContext } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// ─────────────────────────────────────────────────────────────────────────────
// Button
// ─────────────────────────────────────────────────────────────────────────────
export const Button = ({
  children, variant = 'primary', size = 'md',
  className = '', disabled, onClick, type = 'button', ...props
}) => {
  const base = 'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 select-none';
  const variants = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm active:scale-[0.98]',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    outline: 'border border-input bg-background hover:bg-muted hover:text-foreground',
    ghost: 'hover:bg-muted hover:text-foreground',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700',
  };
  const sizes = {
    xs: 'h-7 px-2.5 text-xs',
    sm: 'h-8 px-3 text-xs',
    md: 'h-10 px-4 text-sm',
    lg: 'h-11 px-6 text-base',
    icon: 'h-9 w-9',
  };
  return (
    <button
      type={type} disabled={disabled} onClick={onClick}
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Badge
// ─────────────────────────────────────────────────────────────────────────────
export const Badge = ({ children, variant = 'default', className = '', ...props }) => {
  const variants = {
    default: 'bg-primary/10 text-primary',
    success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    danger: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    muted: 'bg-muted text-muted-foreground',
    info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  };
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', variants[variant], className)} {...props}>
      {children}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Card
// ─────────────────────────────────────────────────────────────────────────────
export const Card = ({ children, className = '' }) => (
  <div className={cn('bg-card border border-border rounded-xl shadow-sm', className)}>
    {children}
  </div>
);
export const CardHeader = ({ children, className = '', action }) => (
  <div className={cn('flex items-center justify-between px-5 py-4 border-b border-border', className)}>
    <div className="flex-1">{children}</div>
    {action && <div className="ml-4 flex-shrink-0">{action}</div>}
  </div>
);
export const CardBody = ({ children, className = '' }) => (
  <div className={cn('p-5', className)}>{children}</div>
);
export const CardFooter = ({ children, className = '' }) => (
  <div className={cn('px-5 py-4 border-t border-border bg-muted/30 rounded-b-xl', className)}>{children}</div>
);

// ─────────────────────────────────────────────────────────────────────────────
// PageHeader
// ─────────────────────────────────────────────────────────────────────────────
export const PageHeader = ({ title, subtitle, action, className = '' }) => (
  <div className={cn('flex items-start justify-between mb-6', className)}>
    <div>
      <h1 className="text-2xl font-bold text-foreground tracking-tight">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
    </div>
    {action && <div className="ml-6 flex-shrink-0 flex items-center gap-2">{action}</div>}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Alert
// ─────────────────────────────────────────────────────────────────────────────
const alertStyles = {
  success: { icon: CheckCircle2, cls: 'bg-white border-emerald-500 text-emerald-600 shadow-sm' },
  error: { icon: AlertCircle, cls: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300' },
  warning: { icon: AlertTriangle, cls: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300' },
  info: { icon: Info, cls: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300' },
};
export const Alert = ({ variant = 'info', title, children, onClose, className = '' }) => {
  const { icon: Icon, cls } = alertStyles[variant] || alertStyles.info;
  return (
    <div className={cn('flex gap-3 rounded-lg border p-4', cls, className)}>
      <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1 text-sm">
        {title && <p className="font-semibold mb-0.5">{title}</p>}
        <div>{children}</div>
      </div>
      {onClose && (
        <button onClick={onClose} className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Spinner
// ─────────────────────────────────────────────────────────────────────────────
export const Spinner = ({ className = '', size = 'md' }) => {
  const sizes = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-10 w-10' };
  return (
    <div
      className={cn('rounded-full border-2 border-primary border-t-transparent animate-spin', sizes[size], className)}
      role="status" aria-label="Loading"
    />
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Empty State
// ─────────────────────────────────────────────────────────────────────────────
export const EmptyState = ({ icon: Icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center px-4">
    {Icon && (
      <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon className="h-7 w-7 text-muted-foreground/50" />
      </div>
    )}
    <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
    {description && <p className="text-sm text-muted-foreground mb-5 max-w-sm">{description}</p>}
    {action}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Input
// ─────────────────────────────────────────────────────────────────────────────
export const Input = ({ label, error, hint, className = '', labelClassName = '', id, required, rightElement, ...props }) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className={cn("text-sm font-medium text-slate-700 dark:text-slate-300", labelClassName)}>
          {label}{required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          id={inputId}
          className={cn(
            'flex h-10 w-full rounded-md border border-slate-300 dark:border-slate-600',
            'bg-white dark:bg-slate-800',
            'px-3 py-2 text-sm text-slate-900 dark:text-slate-100',
            'shadow-sm placeholder:text-slate-400 dark:placeholder:text-slate-500',
            'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-destructive focus-visible:ring-destructive/40',
            rightElement && 'pr-10',
            className
          )}
          {...props}
        />
        {rightElement && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
            {rightElement}
          </div>
        )}
      </div>
      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Select
// ─────────────────────────────────────────────────────────────────────────────
export const Select = ({ label, error, children, className = '', labelClassName = '', id, required, ...props }) => {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={selectId} className={cn("text-sm font-medium text-slate-700 dark:text-slate-300", labelClassName)}>
          {label}{required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <select
        id={selectId}
        className={cn(
          'flex h-10 w-full rounded-md border border-slate-300 dark:border-slate-600',
          'bg-white dark:bg-slate-800',
          'px-3 py-2 text-sm text-slate-900 dark:text-slate-100',
          'shadow-sm transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-destructive',
          className
        )}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Textarea
// ─────────────────────────────────────────────────────────────────────────────
export const Textarea = ({ label, error, className = '', id, required, ...props }) => {
  const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={textareaId} className="text-sm font-medium text-foreground">
          {label}{required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <textarea
        id={textareaId}
        rows={4}
        className={cn(
          'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none',
          error && 'border-destructive',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Modal
// ─────────────────────────────────────────────────────────────────────────────
export const Modal = ({ open, onClose, title, children, size = 'md' }) => {
  if (!open) return null;
  const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      {/* Solid dark scrim — no backdrop-blur so the content behind is fully hidden */}
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />

      {/* Modal panel — explicitly opaque white / dark backgrounds */}
      <div className={cn(
        'relative w-full max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl',
        'bg-white dark:bg-[hsla(0, 0%, 100%, 1.00)]',
        'border border-slate-200 dark:border-slate-700',
        sizes[size]
      )}>
        {/* Header — prominent solid blue bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10 bg-primary rounded-t-xl">
          <h2 className="text-base font-semibold text-white tracking-wide">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-white/20 text-white/80 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 bg-white dark:bg-[hsla(0, 0%, 100%, 1.00)]">
          {children}
        </div>
      </div>
    </div>
  );
};


// ─────────────────────────────────────────────────────────────────────────────
// Table
// ─────────────────────────────────────────────────────────────────────────────
export const Table = ({ children, className = '' }) => (
  <div className="w-full overflow-x-auto">
    <table className={cn('w-full caption-bottom text-sm', className)}>{children}</table>
  </div>
);
export const Thead = ({ children }) => (
  <thead className="border-b border-border">{children}</thead>
);
export const Tbody = ({ children }) => (
  <tbody className="divide-y divide-border">{children}</tbody>
);
export const Tr = ({ children, onClick, className = '' }) => (
  <tr
    onClick={onClick}
    className={cn(
      'transition-colors',
      onClick && 'cursor-pointer hover:bg-muted/50',
      className
    )}
  >
    {children}
  </tr>
);
export const Th = ({ children, className = '' }) => (
  <th className={cn('h-11 px-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide', className)}>
    {children}
  </th>
);
export const Td = ({ children, className = '' }) => (
  <td className={cn('px-4 py-3 text-sm text-foreground align-middle', className)}>
    {children}
  </td>
);

// ─────────────────────────────────────────────────────────────────────────────
// Tabs
// ─────────────────────────────────────────────────────────────────────────────
const TabsContext = createContext(null);

export const Tabs = ({ children, defaultTab, className = '' }) => {
  const [active, setActive] = useState(defaultTab);
  return (
    <TabsContext.Provider value={{ active, setActive }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
};

export const TabList = ({ children, className = '' }) => (
  <div className={cn('flex items-center border-b border-border gap-0', className)}>
    {children}
  </div>
);

export const Tab = ({ id, children }) => {
  const { active, setActive } = useContext(TabsContext);
  const isActive = active === id;
  return (
    <button
      onClick={() => setActive(id)}
      className={cn(
        'px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px',
        isActive
          ? 'border-primary text-primary'
          : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
      )}
    >
      {children}
    </button>
  );
};

export const TabPanel = ({ id, children }) => {
  const { active } = useContext(TabsContext);
  if (active !== id) return null;
  return <div className="pt-5 animate-fade-in">{children}</div>;
};

// ─────────────────────────────────────────────────────────────────────────────
// Status badge helper
// ─────────────────────────────────────────────────────────────────────────────
export const statusVariant = (status = '') => {
  const s = status.toLowerCase();
  if (['active'].includes(s)) return 'info'; // Blue
  if (['upcoming'].includes(s)) return 'danger'; // Red
  if (['completed', 'filled', 'resulted', 'administered', 'verified'].includes(s)) return 'success'; // Green
  if (['pending', 'ordered', 'scheduled', 'processing'].includes(s)) return 'info';
  if (['cancelled', 'discontinued', 'rejected', 'missed'].includes(s)) return 'danger';
  if (['on hold', 'in progress', 'partial'].includes(s)) return 'warning';
  return 'muted';
};
