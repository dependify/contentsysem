// Section-by-section content editor with AI regeneration
import { useState } from 'react';
import {
    GripVertical, Trash, Plus, Wand2, ChevronUp, ChevronDown,
    Type, Heading1, Heading2, List, Image
} from 'lucide-react';
import { Button, Modal, Textarea, Spinner } from './ui';
import api from '../lib/api';

interface ContentSection {
    id: string;
    type: 'heading' | 'paragraph' | 'list' | 'image';
    content: string;
    level?: number;
}

interface SectionEditorProps {
    sections: ContentSection[];
    onChange: (sections: ContentSection[]) => void;
    tenantId: number;
    contentId: number;
}

const SECTION_TYPES = [
    { type: 'heading', label: 'Heading', icon: Heading1 },
    { type: 'paragraph', label: 'Paragraph', icon: Type },
    { type: 'list', label: 'List', icon: List },
    { type: 'image', label: 'Image', icon: Image },
] as const;

export default function SectionEditor({ sections, onChange, tenantId, contentId }: SectionEditorProps) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [insertIndex, setInsertIndex] = useState<number | null>(null);

    const generateId = () => Math.random().toString(36).substr(2, 9);

    const updateSection = (id: string, content: string) => {
        onChange(sections.map(s => s.id === id ? { ...s, content } : s));
    };

    const deleteSection = (id: string) => {
        onChange(sections.filter(s => s.id !== id));
    };

    const moveSection = (id: string, direction: 'up' | 'down') => {
        const index = sections.findIndex(s => s.id === id);
        if (direction === 'up' && index > 0) {
            const newSections = [...sections];
            [newSections[index - 1], newSections[index]] = [newSections[index], newSections[index - 1]];
            onChange(newSections);
        } else if (direction === 'down' && index < sections.length - 1) {
            const newSections = [...sections];
            [newSections[index], newSections[index + 1]] = [newSections[index + 1], newSections[index]];
            onChange(newSections);
        }
    };

    const addSection = (type: ContentSection['type']) => {
        const newSection: ContentSection = {
            id: generateId(),
            type,
            content: '',
            level: type === 'heading' ? 2 : undefined,
        };

        if (insertIndex !== null) {
            const newSections = [...sections];
            newSections.splice(insertIndex, 0, newSection);
            onChange(newSections);
        } else {
            onChange([...sections, newSection]);
        }

        setShowAddModal(false);
        setInsertIndex(null);
        setEditingId(newSection.id);
    };

    const regenerateSection = async (id: string) => {
        const section = sections.find(s => s.id === id);
        if (!section) return;

        setRegeneratingId(id);
        try {
            const response = await api.post(`/content/${contentId}/regenerate-section`, {
                tenant_id: tenantId,
                section_id: id,
                section_type: section.type,
                current_content: section.content,
                context: sections.map(s => s.content).join('\n\n'),
            });

            if (response.data.success) {
                updateSection(id, response.data.content);
            }
        } catch (error) {
            console.error('Failed to regenerate section:', error);
        } finally {
            setRegeneratingId(null);
        }
    };

    const getSectionIcon = (type: string) => {
        const sectionType = SECTION_TYPES.find(t => t.type === type);
        return sectionType ? <sectionType.icon size={16} /> : <Type size={16} />;
    };

    return (
        <div className="space-y-2">
            {sections.map((section, index) => (
                <div
                    key={section.id}
                    className={`group border rounded-lg transition-colors ${editingId === section.id
                            ? 'border-indigo-500 bg-gray-800'
                            : 'border-gray-700 hover:border-gray-600'
                        }`}
                >
                    {/* Section Header */}
                    <div className="flex items-center gap-2 p-2 border-b border-gray-700">
                        <div className="cursor-grab text-gray-500 hover:text-gray-400">
                            <GripVertical size={16} />
                        </div>

                        <div className="flex items-center gap-1 text-gray-400">
                            {getSectionIcon(section.type)}
                            <span className="text-xs uppercase">{section.type}</span>
                        </div>

                        <div className="flex-1" />

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => moveSection(section.id, 'up')}
                                disabled={index === 0}
                                className="h-7 w-7"
                            >
                                <ChevronUp size={14} />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => moveSection(section.id, 'down')}
                                disabled={index === sections.length - 1}
                                className="h-7 w-7"
                            >
                                <ChevronDown size={14} />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => regenerateSection(section.id)}
                                disabled={regeneratingId === section.id}
                                className="h-7 w-7 text-indigo-400"
                                title="AI Regenerate"
                            >
                                {regeneratingId === section.id ? (
                                    <Spinner size="sm" />
                                ) : (
                                    <Wand2 size={14} />
                                )}
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteSection(section.id)}
                                className="h-7 w-7 text-red-400"
                            >
                                <Trash size={14} />
                            </Button>
                        </div>
                    </div>

                    {/* Section Content */}
                    <div className="p-3">
                        {editingId === section.id ? (
                            <Textarea
                                value={section.content}
                                onChange={(e) => updateSection(section.id, e.target.value)}
                                onBlur={() => setEditingId(null)}
                                autoFocus
                                className="min-h-[100px]"
                                placeholder={`Enter ${section.type} content...`}
                            />
                        ) : (
                            <div
                                onClick={() => setEditingId(section.id)}
                                className="cursor-text min-h-[40px] text-gray-300 whitespace-pre-wrap"
                            >
                                {section.content || (
                                    <span className="text-gray-500 italic">Click to edit...</span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Insert Button */}
                    <div className="relative h-0">
                        <button
                            onClick={() => { setInsertIndex(index + 1); setShowAddModal(true); }}
                            className="absolute left-1/2 -translate-x-1/2 -bottom-3 opacity-0 group-hover:opacity-100 transition-opacity bg-indigo-600 rounded-full p-1 hover:bg-indigo-500"
                        >
                            <Plus size={12} />
                        </button>
                    </div>
                </div>
            ))}

            {/* Add Section Button */}
            <Button
                variant="ghost"
                className="w-full border-2 border-dashed border-gray-700 hover:border-gray-600"
                onClick={() => { setInsertIndex(null); setShowAddModal(true); }}
            >
                <Plus size={16} /> Add Section
            </Button>

            {/* Add Section Modal */}
            <Modal
                isOpen={showAddModal}
                onClose={() => { setShowAddModal(false); setInsertIndex(null); }}
                title="Add Section"
                size="sm"
            >
                <div className="grid grid-cols-2 gap-3">
                    {SECTION_TYPES.map(({ type, label, icon: Icon }) => (
                        <button
                            key={type}
                            onClick={() => addSection(type)}
                            className="flex items-center gap-3 p-4 rounded-lg border border-gray-700 hover:border-indigo-500 hover:bg-gray-800 transition-colors"
                        >
                            <Icon className="text-indigo-400" size={24} />
                            <span className="text-white font-medium">{label}</span>
                        </button>
                    ))}
                </div>
            </Modal>
        </div>
    );
}
