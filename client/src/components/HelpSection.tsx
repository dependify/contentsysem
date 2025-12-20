// Help & Documentation Section
import { useState } from 'react';
import {
    HelpCircle, Book, Video, MessageCircle, ExternalLink,
    ChevronRight, Search, FileText, Zap, Users, Settings,
    Calendar, Image, BarChart2
} from 'lucide-react';
import { Button, Card, Modal, Badge } from './ui';

interface HelpArticle {
    id: string;
    title: string;
    category: string;
    excerpt: string;
    content?: string;
}

interface HelpSectionProps {
    isOpen: boolean;
    onClose: () => void;
}

const HELP_CATEGORIES = [
    { id: 'getting-started', label: 'Getting Started', icon: Zap },
    { id: 'content', label: 'Content Management', icon: FileText },
    { id: 'scheduling', label: 'Scheduling', icon: Calendar },
    { id: 'images', label: 'Image Library', icon: Image },
    { id: 'analytics', label: 'Analytics', icon: BarChart2 },
    { id: 'team', label: 'Team & Permissions', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings },
];

const HELP_ARTICLES: HelpArticle[] = [
    {
        id: '1',
        title: 'Creating Your First Content',
        category: 'getting-started',
        excerpt: 'Learn how to create and publish your first AI-generated blog post.',
        content: `
# Creating Your First Content

## Step 1: Select a Tenant
Before creating content, make sure you have a tenant selected from the tenant switcher in the sidebar.

## Step 2: Add Content to Queue
1. Navigate to the Content Queue
2. Click "Add Content"
3. Enter a topic or title
4. Optionally add keywords and scheduling

## Step 3: Monitor Progress
Watch as our AI agents work through the 10-step workflow:
1. **Nexus** - Strategic planning
2. **Vantage** - Deep research
3. **Vertex** - SEO architecture
4. **Hemingway** - Content writing
5. **Prism** - Quality control
...and more!

## Step 4: Review and Publish
Once complete, review the content in the editor and publish to WordPress.
    `.trim()
    },
    {
        id: '2',
        title: 'Setting Up WordPress Integration',
        category: 'getting-started',
        excerpt: 'Connect your WordPress site for automatic content publishing.',
    },
    {
        id: '3',
        title: 'Bulk Content Import',
        category: 'content',
        excerpt: 'Import multiple content ideas from a CSV file.',
    },
    {
        id: '4',
        title: 'Understanding the Content Calendar',
        category: 'scheduling',
        excerpt: 'Schedule and manage your content publishing timeline.',
    },
    {
        id: '5',
        title: 'Using AI Image Generation',
        category: 'images',
        excerpt: 'Generate custom images for your content using AI.',
    },
    {
        id: '6',
        title: 'Reading Analytics Reports',
        category: 'analytics',
        excerpt: 'Understanding your content performance metrics.',
    },
    {
        id: '7',
        title: 'Adding Team Members',
        category: 'team',
        excerpt: 'Invite team members and manage permissions.',
    },
    {
        id: '8',
        title: 'API Configuration',
        category: 'settings',
        excerpt: 'Configure API keys for AI providers.',
    },
];

const FAQ_ITEMS = [
    {
        question: 'How long does content generation take?',
        answer: 'Most content is generated within 5-10 minutes, depending on the depth of research required and current queue load.',
    },
    {
        question: 'Can I edit AI-generated content?',
        answer: 'Yes! All generated content can be fully edited before publishing. Use the built-in rich text editor or markdown editor.',
    },
    {
        question: 'How do I connect multiple WordPress sites?',
        answer: 'Create separate tenants for each WordPress site. Each tenant can have its own WordPress credentials and brand voice.',
    },
    {
        question: 'What happens if content generation fails?',
        answer: 'Failed content can be retried from the queue. Check the error details and ensure your API keys are valid.',
    },
];

export default function HelpSection({ isOpen, onClose }: HelpSectionProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null);
    const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

    const filteredArticles = HELP_ARTICLES.filter(article => {
        if (searchQuery) {
            return article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                article.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
        }
        if (selectedCategory) {
            return article.category === selectedCategory;
        }
        return true;
    });

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Help & Documentation"
            size="xl"
        >
            <div className="flex h-[600px]">
                {/* Sidebar */}
                <div className="w-64 border-r border-gray-700 pr-4">
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search help..."
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setSelectedCategory(null); }}
                            className="input pl-10 w-full"
                        />
                    </div>

                    <div className="space-y-1">
                        <button
                            onClick={() => setSelectedCategory(null)}
                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${!selectedCategory && !searchQuery ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                                }`}
                        >
                            <Book size={16} />
                            All Topics
                        </button>
                        {HELP_CATEGORIES.map(({ id, label, icon: Icon }) => (
                            <button
                                key={id}
                                onClick={() => { setSelectedCategory(id); setSearchQuery(''); }}
                                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${selectedCategory === id ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                                    }`}
                            >
                                <Icon size={16} />
                                {label}
                            </button>
                        ))}
                    </div>

                    <div className="mt-6 pt-4 border-t border-gray-700">
                        <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Quick Links</h4>
                        <a
                            href="https://docs.contentsys.io"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white"
                        >
                            <ExternalLink size={14} />
                            Full Documentation
                        </a>
                        <a
                            href="https://contentsys.io/support"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white"
                        >
                            <MessageCircle size={14} />
                            Contact Support
                        </a>
                        <a
                            href="https://youtube.com/@contentsys"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white"
                        >
                            <Video size={14} />
                            Video Tutorials
                        </a>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 pl-6 overflow-y-auto">
                    {selectedArticle ? (
                        <div>
                            <button
                                onClick={() => setSelectedArticle(null)}
                                className="flex items-center gap-1 text-indigo-400 text-sm mb-4 hover:underline"
                            >
                                ← Back to articles
                            </button>
                            <h2 className="text-xl font-bold text-white mb-4">{selectedArticle.title}</h2>
                            <div className="prose prose-invert max-w-none">
                                <pre className="whitespace-pre-wrap text-gray-300 text-sm">
                                    {selectedArticle.content || selectedArticle.excerpt}
                                </pre>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Articles */}
                            <div className="mb-8">
                                <h3 className="text-sm font-medium text-gray-400 uppercase mb-3">
                                    {selectedCategory
                                        ? HELP_CATEGORIES.find(c => c.id === selectedCategory)?.label
                                        : searchQuery
                                            ? `Search Results for "${searchQuery}"`
                                            : 'Popular Articles'}
                                </h3>
                                {filteredArticles.length > 0 ? (
                                    <div className="space-y-2">
                                        {filteredArticles.map(article => (
                                            <button
                                                key={article.id}
                                                onClick={() => setSelectedArticle(article)}
                                                className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-700 hover:border-indigo-500 hover:bg-gray-800 transition-colors text-left"
                                            >
                                                <FileText className="text-gray-500 flex-shrink-0" size={20} />
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-white font-medium">{article.title}</h4>
                                                    <p className="text-sm text-gray-500 truncate">{article.excerpt}</p>
                                                </div>
                                                <ChevronRight className="text-gray-600 flex-shrink-0" size={16} />
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-gray-500">
                                        <HelpCircle size={32} className="mx-auto mb-2" />
                                        <p>No articles found</p>
                                    </div>
                                )}
                            </div>

                            {/* FAQ */}
                            {!searchQuery && !selectedCategory && (
                                <div>
                                    <h3 className="text-sm font-medium text-gray-400 uppercase mb-3">
                                        Frequently Asked Questions
                                    </h3>
                                    <div className="space-y-2">
                                        {FAQ_ITEMS.map((faq, index) => (
                                            <div
                                                key={index}
                                                className="border border-gray-700 rounded-lg overflow-hidden"
                                            >
                                                <button
                                                    onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                                                    className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-800 transition-colors"
                                                >
                                                    <span className="text-white">{faq.question}</span>
                                                    <ChevronRight
                                                        size={16}
                                                        className={`text-gray-500 transition-transform ${expandedFaq === index ? 'rotate-90' : ''}`}
                                                    />
                                                </button>
                                                {expandedFaq === index && (
                                                    <div className="px-3 pb-3 text-sm text-gray-400">
                                                        {faq.answer}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </Modal>
    );
}
