// Empty States with helpful CTAs
import { ReactNode } from 'react';
import {
    FileText, Image, Users, Calendar, Folder, Inbox,
    Search, PlusCircle, Upload, Settings
} from 'lucide-react';
import { Button } from './ui';

interface EmptyStateConfig {
    icon: ReactNode;
    title: string;
    description: string;
    actionLabel?: string;
    actionIcon?: ReactNode;
}

const EMPTY_STATES: Record<string, EmptyStateConfig> = {
    content: {
        icon: <FileText size={48} />,
        title: 'No content in your queue',
        description: 'Start creating content by adding topics to your queue. Our AI will handle the rest.',
        actionLabel: 'Add Your First Topic',
        actionIcon: <PlusCircle size={16} />,
    },
    images: {
        icon: <Image size={48} />,
        title: 'Your image library is empty',
        description: 'Upload images or generate them with AI to use in your content.',
        actionLabel: 'Upload Images',
        actionIcon: <Upload size={16} />,
    },
    tenants: {
        icon: <Users size={48} />,
        title: 'No tenants yet',
        description: 'Create your first tenant to start managing content for a business.',
        actionLabel: 'Create Tenant',
        actionIcon: <PlusCircle size={16} />,
    },
    calendar: {
        icon: <Calendar size={48} />,
        title: 'Nothing scheduled',
        description: 'Your content calendar is empty. Schedule content to see it here.',
        actionLabel: 'Schedule Content',
        actionIcon: <Calendar size={16} />,
    },
    search: {
        icon: <Search size={48} />,
        title: 'No results found',
        description: 'Try adjusting your search terms or filters to find what you are looking for.',
    },
    folder: {
        icon: <Folder size={48} />,
        title: 'This folder is empty',
        description: 'Add files or subfolders to organize your content.',
        actionLabel: 'Add Files',
        actionIcon: <Upload size={16} />,
    },
    inbox: {
        icon: <Inbox size={48} />,
        title: 'All caught up!',
        description: 'No pending items require your attention right now.',
    },
    settings: {
        icon: <Settings size={48} />,
        title: 'No configuration needed',
        description: 'Everything is set up correctly. You can customize settings anytime.',
        actionLabel: 'View Settings',
        actionIcon: <Settings size={16} />,
    },
};

interface ContentEmptyStateProps {
    type: keyof typeof EMPTY_STATES;
    onAction?: () => void;
    customTitle?: string;
    customDescription?: string;
    customAction?: string;
}

export function ContentEmptyState({
    type,
    onAction,
    customTitle,
    customDescription,
    customAction
}: ContentEmptyStateProps) {
    const config = EMPTY_STATES[type] || EMPTY_STATES.inbox;

    return (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center text-gray-500 mb-6">
                {config.icon}
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
                {customTitle || config.title}
            </h3>
            <p className="text-gray-400 max-w-md mb-6">
                {customDescription || config.description}
            </p>
            {(config.actionLabel || customAction) && onAction && (
                <Button onClick={onAction}>
                    {config.actionIcon}
                    {customAction || config.actionLabel}
                </Button>
            )}
        </div>
    );
}

// Quick Tips component for empty states
interface QuickTipsProps {
    tips: string[];
}

export function QuickTips({ tips }: QuickTipsProps) {
    return (
        <div className="mt-8 p-4 bg-gray-800/50 rounded-lg max-w-lg mx-auto">
            <h4 className="text-sm font-medium text-gray-300 mb-3">💡 Quick Tips</h4>
            <ul className="space-y-2">
                {tips.map((tip, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-gray-400">
                        <span className="text-indigo-400">•</span>
                        {tip}
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default ContentEmptyState;
