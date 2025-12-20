// Notification Center with Real-time Updates
import { useState, useEffect, useRef } from 'react';
import { Bell, X, Check, AlertCircle, Info, CheckCircle, Clock, Trash2 } from 'lucide-react';
import api from '../lib/api';

interface Notification {
    id: number;
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
    read: boolean;
    created_at: string;
    action_url?: string;
}

export default function NotificationCenter() {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchNotifications();
        // Poll for new notifications every 30 seconds
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchNotifications = async () => {
        try {
            const res = await api.get('/notifications');
            if (res.data.success) {
                setNotifications(res.data.notifications);
            }
        } catch (error) {
            // Use mock data for demo
            setNotifications([
                {
                    id: 1, type: 'success', title: 'Content Published',
                    message: 'Your article "10 Best Practices" was published successfully.',
                    read: false, created_at: new Date().toISOString()
                },
                {
                    id: 2, type: 'info', title: 'New User Registered',
                    message: 'John Doe has registered and is pending approval.',
                    read: false, created_at: new Date(Date.now() - 3600000).toISOString()
                },
                {
                    id: 3, type: 'warning', title: 'Low API Credits',
                    message: 'Your API credits are running low. Please top up.',
                    read: true, created_at: new Date(Date.now() - 86400000).toISOString()
                },
            ]);
        }
    };

    const markAsRead = async (id: number) => {
        setNotifications(notifications.map(n =>
            n.id === id ? { ...n, read: true } : n
        ));
        try {
            await api.post(`/notifications/${id}/read`);
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
    };

    const markAllAsRead = async () => {
        setNotifications(notifications.map(n => ({ ...n, read: true })));
        try {
            await api.post('/notifications/read-all');
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    };

    const deleteNotification = async (id: number) => {
        setNotifications(notifications.filter(n => n.id !== id));
        try {
            await api.delete(`/notifications/${id}`);
        } catch (error) {
            console.error('Failed to delete notification:', error);
        }
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    const getIcon = (type: string) => {
        switch (type) {
            case 'success': return CheckCircle;
            case 'warning': return AlertCircle;
            case 'error': return AlertCircle;
            default: return Info;
        }
    };

    const getIconColor = (type: string) => {
        switch (type) {
            case 'success': return 'text-green-400';
            case 'warning': return 'text-yellow-400';
            case 'error': return 'text-red-400';
            default: return 'text-blue-400';
        }
    };

    const formatTime = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (days > 0) return `${days}d ago`;
        if (hours > 0) return `${hours}h ago`;
        if (minutes > 0) return `${minutes}m ago`;
        return 'Just now';
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-96 bg-gray-800 border border-gray-700 rounded-xl shadow-xl z-50">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-700">
                        <h3 className="font-semibold text-white">Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="text-sm text-indigo-400 hover:text-indigo-300"
                            >
                                Mark all as read
                            </button>
                        )}
                    </div>

                    {/* Notification List */}
                    <div className="max-h-[400px] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                <Bell size={32} className="mx-auto mb-2 opacity-50" />
                                No notifications
                            </div>
                        ) : (
                            notifications.map((notification) => {
                                const Icon = getIcon(notification.type);
                                return (
                                    <div
                                        key={notification.id}
                                        className={`p-4 border-b border-gray-700 hover:bg-gray-700/50 transition-colors ${!notification.read ? 'bg-indigo-600/10' : ''
                                            }`}
                                    >
                                        <div className="flex gap-3">
                                            <Icon size={20} className={getIconColor(notification.type)} />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <h4 className={`font-medium truncate ${notification.read ? 'text-gray-300' : 'text-white'
                                                        }`}>
                                                        {notification.title}
                                                    </h4>
                                                    <div className="flex items-center gap-1 flex-shrink-0">
                                                        {!notification.read && (
                                                            <button
                                                                onClick={() => markAsRead(notification.id)}
                                                                className="p-1 text-gray-500 hover:text-white"
                                                                title="Mark as read"
                                                            >
                                                                <Check size={14} />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => deleteNotification(notification.id)}
                                                            className="p-1 text-gray-500 hover:text-red-400"
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                                <p className="text-sm text-gray-400 mt-1">{notification.message}</p>
                                                <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                                                    <Clock size={12} />
                                                    {formatTime(notification.created_at)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-3 border-t border-gray-700">
                        <a
                            href="/notifications"
                            className="block text-center text-sm text-indigo-400 hover:text-indigo-300"
                        >
                            View all notifications
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
}
