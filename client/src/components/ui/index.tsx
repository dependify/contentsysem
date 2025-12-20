// Reusable UI Components for ContentSys
import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { X, Check, AlertCircle, AlertTriangle, Info, Loader2, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility function for combining classes
export function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

// ===== Button Component =====
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
    size?: 'sm' | 'md' | 'lg' | 'icon';
    loading?: boolean;
    children: React.ReactNode;
}

export function Button({
    variant = 'primary',
    size = 'md',
    loading = false,
    className,
    children,
    disabled,
    ...props
}: ButtonProps) {
    const variants = {
        primary: 'btn-primary',
        secondary: 'btn-secondary',
        ghost: 'btn-ghost',
        danger: 'btn-danger',
        success: 'btn-success',
    };

    const sizes = {
        sm: 'btn-sm',
        md: '',
        lg: 'btn-lg',
        icon: 'btn-icon',
    };

    return (
        <button
            className={cn('btn', variants[variant], sizes[size], className)}
            disabled={disabled || loading}
            {...props}
        >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {children}
        </button>
    );
}

// ===== Input Component =====
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    hint?: string;
    required?: boolean;
}

export function Input({ label, error, hint, required, className, ...props }: InputProps) {
    return (
        <div className="form-group">
            {label && (
                <label className={cn('label', required && 'label-required')}>
                    {label}
                </label>
            )}
            <input
                className={cn('input', error && 'input-error', className)}
                {...props}
            />
            {error && <p className="form-error">{error}</p>}
            {hint && !error && <p className="form-hint">{hint}</p>}
        </div>
    );
}

// ===== Textarea Component =====
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    error?: string;
    hint?: string;
    required?: boolean;
}

export function Textarea({ label, error, hint, required, className, ...props }: TextareaProps) {
    return (
        <div className="form-group">
            {label && (
                <label className={cn('label', required && 'label-required')}>
                    {label}
                </label>
            )}
            <textarea
                className={cn('input min-h-[100px] resize-y', error && 'input-error', className)}
                {...props}
            />
            {error && <p className="form-error">{error}</p>}
            {hint && !error && <p className="form-hint">{hint}</p>}
        </div>
    );
}

// ===== Select Component =====
interface SelectOption {
    value: string | number;
    label: string;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
    label?: string;
    options: SelectOption[];
    placeholder?: string;
    error?: string;
}

export function Select({ label, options, placeholder, error, className, ...props }: SelectProps) {
    return (
        <div className="form-group">
            {label && <label className="label">{label}</label>}
            <select className={cn('select', error && 'input-error', className)} {...props}>
                {placeholder && <option value="">{placeholder}</option>}
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
            {error && <p className="form-error">{error}</p>}
        </div>
    );
}

// ===== Card Component =====
interface CardProps {
    children: React.ReactNode;
    className?: string;
    hover?: boolean;
    onClick?: () => void;
}

export function Card({ children, className, hover = false, onClick }: CardProps) {
    return (
        <div
            className={cn(hover ? 'card-hover' : 'card', onClick && 'cursor-pointer', className)}
            onClick={onClick}
        >
            {children}
        </div>
    );
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
    return <div className={cn('p-4 border-b border-gray-700', className)}>{children}</div>;
}

export function CardContent({ children, className }: { children: React.ReactNode; className?: string }) {
    return <div className={cn('p-4', className)}>{children}</div>;
}

export function CardFooter({ children, className }: { children: React.ReactNode; className?: string }) {
    return <div className={cn('p-4 border-t border-gray-700', className)}>{children}</div>;
}

// ===== Badge Component =====
interface BadgeProps {
    variant?: 'primary' | 'success' | 'warning' | 'error' | 'gray';
    children: React.ReactNode;
    className?: string;
}

export function Badge({ variant = 'gray', children, className }: BadgeProps) {
    const variants = {
        primary: 'badge-primary',
        success: 'badge-success',
        warning: 'badge-warning',
        error: 'badge-error',
        gray: 'badge-gray',
    };
    return <span className={cn(variants[variant], className)}>{children}</span>;
}

// ===== Modal Component =====
interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({ isOpen, onClose, title, children, footer, size = 'md' }: ModalProps) {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const sizes = {
        sm: 'max-w-sm',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className={cn('modal-content', sizes[size])}
                onClick={e => e.stopPropagation()}
            >
                {title && (
                    <div className="modal-header">
                        <h3 className="text-lg font-semibold text-white">{title}</h3>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                )}
                <div className="modal-body">{children}</div>
                {footer && <div className="modal-footer">{footer}</div>}
            </div>
        </div>
    );
}

// ===== Toast System =====
type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
    id: string;
    type: ToastType;
    message: string;
    duration?: number;
}

interface ToastContextType {
    addToast: (type: ToastType, message: string, duration?: number) => void;
    removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((type: ToastType, message: string, duration = 5000) => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts(prev => [...prev, { id, type, message, duration }]);

        if (duration > 0) {
            setTimeout(() => removeToast(id), duration);
        }
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const icons = {
        success: <Check className="w-5 h-5" />,
        error: <AlertCircle className="w-5 h-5" />,
        warning: <AlertTriangle className="w-5 h-5" />,
        info: <Info className="w-5 h-5" />,
    };

    return (
        <ToastContext.Provider value={{ addToast, removeToast }}>
            {children}
            <div className="toast-container">
                {toasts.map(toast => (
                    <div key={toast.id} className={`toast-${toast.type}`}>
                        {icons[toast.type]}
                        <span className="flex-1">{toast.message}</span>
                        <button onClick={() => removeToast(toast.id)} className="opacity-70 hover:opacity-100">
                            <X size={16} />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}

// ===== Loading Spinner =====
interface SpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
    const sizes = {
        sm: 'w-4 h-4',
        md: 'w-6 h-6',
        lg: 'w-8 h-8',
    };
    return <Loader2 className={cn(sizes[size], 'animate-spin text-indigo-400', className)} />;
}

// ===== Skeleton Loader =====
interface SkeletonProps {
    className?: string;
    lines?: number;
}

export function Skeleton({ className, lines = 1 }: SkeletonProps) {
    return (
        <div className="space-y-2">
            {Array.from({ length: lines }).map((_, i) => (
                <div key={i} className={cn('skeleton h-4', className)} />
            ))}
        </div>
    );
}

export function SkeletonCard() {
    return (
        <div className="card p-4 space-y-3">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton lines={3} />
            <Skeleton className="h-8 w-24" />
        </div>
    );
}

// ===== Empty State =====
interface EmptyStateProps {
    icon?: React.ReactNode;
    title: string;
    description?: string;
    action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
    return (
        <div className="empty-state">
            {icon && <div className="empty-state-icon">{icon}</div>}
            <h3 className="empty-state-title">{title}</h3>
            {description && <p className="empty-state-description">{description}</p>}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}

// ===== Progress Bar =====
interface ProgressBarProps {
    value: number;
    max?: number;
    variant?: 'default' | 'success' | 'warning' | 'error';
    showLabel?: boolean;
    className?: string;
}

export function ProgressBar({ value, max = 100, variant = 'default', showLabel, className }: ProgressBarProps) {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));
    const variants = {
        default: 'progress-bar',
        success: 'progress-bar-success',
        warning: 'progress-bar-warning',
        error: 'progress-bar-error',
    };

    return (
        <div className={cn('space-y-1', className)}>
            {showLabel && (
                <div className="flex justify-between text-sm text-gray-400">
                    <span>{value} / {max}</span>
                    <span>{percentage.toFixed(0)}%</span>
                </div>
            )}
            <div className="progress">
                <div className={variants[variant]} style={{ width: `${percentage}%` }} />
            </div>
        </div>
    );
}

// ===== Tabs =====
interface Tab {
    id: string;
    label: string;
    icon?: React.ReactNode;
}

interface TabsProps {
    tabs: Tab[];
    activeTab: string;
    onChange: (tabId: string) => void;
    className?: string;
}

export function Tabs({ tabs, activeTab, onChange, className }: TabsProps) {
    return (
        <div className={cn('tabs', className)}>
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    className={activeTab === tab.id ? 'tab-active' : 'tab'}
                    onClick={() => onChange(tab.id)}
                >
                    {tab.icon && <span className="mr-2">{tab.icon}</span>}
                    {tab.label}
                </button>
            ))}
        </div>
    );
}

// ===== Dropdown Menu =====
interface DropdownItem {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
    danger?: boolean;
}

interface DropdownProps {
    trigger: React.ReactNode;
    items: DropdownItem[];
    align?: 'left' | 'right';
}

export function Dropdown({ trigger, items, align = 'left' }: DropdownProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative inline-block">
            <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className={cn('dropdown-menu', align === 'right' ? 'right-0' : 'left-0')}>
                        {items.map((item, i) => (
                            <button
                                key={i}
                                className={item.danger ? 'dropdown-item-danger' : 'dropdown-item'}
                                onClick={() => {
                                    item.onClick();
                                    setIsOpen(false);
                                }}
                            >
                                {item.icon && <span className="mr-2">{item.icon}</span>}
                                {item.label}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

// ===== Toggle Switch =====
interface ToggleProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label?: string;
    disabled?: boolean;
}

export function Toggle({ checked, onChange, label, disabled }: ToggleProps) {
    return (
        <label className="flex items-center gap-3 cursor-pointer">
            <button
                type="button"
                className={cn(checked ? 'toggle-active' : 'toggle', disabled && 'opacity-50 cursor-not-allowed')}
                onClick={() => !disabled && onChange(!checked)}
                disabled={disabled}
            >
                <span className={checked ? 'toggle-knob-active' : 'toggle-knob-inactive'} />
            </button>
            {label && <span className="text-sm text-gray-300">{label}</span>}
        </label>
    );
}

// ===== Search Input =====
interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
    onSearch?: (value: string) => void;
}

export function SearchInput({ onSearch, className, ...props }: SearchInputProps) {
    const [value, setValue] = useState('');

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && onSearch) {
            onSearch(value);
        }
    };

    return (
        <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
                type="text"
                className={cn('input pl-10', className)}
                value={value}
                onChange={e => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                {...props}
            />
        </div>
    );
}

// ===== Pagination =====
interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
    const pages = [];
    const showEllipsis = totalPages > 7;

    if (showEllipsis) {
        if (currentPage <= 3) {
            pages.push(1, 2, 3, 4, '...', totalPages);
        } else if (currentPage >= totalPages - 2) {
            pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
        } else {
            pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
        }
    } else {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
    }

    return (
        <div className="flex items-center gap-1">
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="btn btn-ghost btn-icon"
            >
                <ChevronLeft size={16} />
            </button>
            {pages.map((page, i) => (
                typeof page === 'number' ? (
                    <button
                        key={i}
                        onClick={() => onPageChange(page)}
                        className={cn(
                            'btn btn-icon',
                            page === currentPage ? 'bg-indigo-600 text-white' : 'btn-ghost'
                        )}
                    >
                        {page}
                    </button>
                ) : (
                    <span key={i} className="px-2 text-gray-500">{page}</span>
                )
            ))}
            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="btn btn-ghost btn-icon"
            >
                <ChevronRight size={16} />
            </button>
        </div>
    );
}

// ===== Stat Card =====
interface StatCardProps {
    label: string;
    value: string | number;
    change?: { value: number; label?: string };
    icon?: React.ReactNode;
}

export function StatCard({ label, value, change, icon }: StatCardProps) {
    return (
        <div className="stat-card flex items-start justify-between">
            <div>
                <p className="stat-label">{label}</p>
                <p className="stat-value">{value}</p>
                {change && (
                    <p className={change.value >= 0 ? 'stat-change-positive' : 'stat-change-negative'}>
                        {change.value >= 0 ? '+' : ''}{change.value}% {change.label}
                    </p>
                )}
            </div>
            {icon && <div className="text-gray-600">{icon}</div>}
        </div>
    );
}

// ===== Avatar =====
interface AvatarProps {
    name?: string;
    src?: string;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
    const sizes = {
        sm: 'avatar-sm',
        md: '',
        lg: 'avatar-lg',
    };

    const initials = name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    if (src) {
        return <img src={src} alt={name} className={cn('avatar', sizes[size], className)} />;
    }

    return (
        <div className={cn('avatar', sizes[size], className)}>
            {initials || '?'}
        </div>
    );
}

// ===== Confirm Dialog =====
interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'primary';
    loading?: boolean;
}

export function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'primary',
    loading = false,
}: ConfirmDialogProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
            <p className="text-gray-400">{message}</p>
            <div className="modal-footer mt-4 -mx-4 -mb-4 border-t border-gray-700">
                <Button variant="ghost" onClick={onClose} disabled={loading}>
                    {cancelText}
                </Button>
                <Button
                    variant={variant === 'danger' ? 'danger' : 'primary'}
                    onClick={onConfirm}
                    loading={loading}
                >
                    {confirmText}
                </Button>
            </div>
        </Modal>
    );
}
