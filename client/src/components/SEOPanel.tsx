// SEO Optimization Panel
import { useState, useMemo } from 'react';
import { Target, FileText, AlertTriangle, Check, Hash } from 'lucide-react';
import { Card, ProgressBar } from './ui';

interface SEOPanelProps {
    content: string;
    title: string;
    keyword: string;
    metaDescription?: string;
}

interface SEOCheck {
    id: string;
    label: string;
    status: 'good' | 'warning' | 'error';
    message: string;
}

export default function SEOPanel({ content, title, keyword, metaDescription }: SEOPanelProps) {
    const [expanded, setExpanded] = useState(true);

    const analysis = useMemo(() => {
        const wordCount = content.split(/\s+/).filter(Boolean).length;
        const charCount = content.length;
        const sentenceCount = content.split(/[.!?]+/).filter(Boolean).length;
        const avgWordsPerSentence = sentenceCount > 0 ? Math.round(wordCount / sentenceCount) : 0;

        // Keyword analysis
        const keywordLower = keyword.toLowerCase();
        const contentLower = content.toLowerCase();
        const titleLower = title.toLowerCase();

        const keywordCount = (contentLower.match(new RegExp(keywordLower, 'g')) || []).length;
        const keywordDensity = wordCount > 0 ? ((keywordCount / wordCount) * 100).toFixed(1) : '0';
        const keywordInTitle = titleLower.includes(keywordLower);
        const keywordInFirstParagraph = contentLower.substring(0, 500).includes(keywordLower);

        // Heading analysis
        const h2Count = (content.match(/^## /gm) || []).length;
        const h3Count = (content.match(/^### /gm) || []).length;

        // Link analysis
        const linkCount = (content.match(/\[.+?\]\(.+?\)/g) || []).length;
        const imageCount = (content.match(/!\[.+?\]\(.+?\)/g) || []).length;

        return {
            wordCount,
            charCount,
            avgWordsPerSentence,
            keywordCount,
            keywordDensity: parseFloat(keywordDensity),
            keywordInTitle,
            keywordInFirstParagraph,
            h2Count,
            h3Count,
            linkCount,
            imageCount,
            metaLength: metaDescription?.length || 0,
            titleLength: title.length,
        };
    }, [content, title, keyword, metaDescription]);

    const checks = useMemo((): SEOCheck[] => {
        const results: SEOCheck[] = [];

        // Word count check
        if (analysis.wordCount < 300) {
            results.push({ id: 'words', label: 'Word Count', status: 'error', message: `${analysis.wordCount} words. Aim for 1000+ for better ranking.` });
        } else if (analysis.wordCount < 1000) {
            results.push({ id: 'words', label: 'Word Count', status: 'warning', message: `${analysis.wordCount} words. Consider adding more content.` });
        } else {
            results.push({ id: 'words', label: 'Word Count', status: 'good', message: `${analysis.wordCount} words. Great length!` });
        }

        // Title length
        if (analysis.titleLength < 30) {
            results.push({ id: 'title-length', label: 'Title Length', status: 'warning', message: `${analysis.titleLength} characters. Title could be longer.` });
        } else if (analysis.titleLength > 60) {
            results.push({ id: 'title-length', label: 'Title Length', status: 'warning', message: `${analysis.titleLength} characters. Title may be truncated in search results.` });
        } else {
            results.push({ id: 'title-length', label: 'Title Length', status: 'good', message: `${analysis.titleLength} characters. Perfect!` });
        }

        // Keyword in title
        if (keyword) {
            if (analysis.keywordInTitle) {
                results.push({ id: 'keyword-title', label: 'Keyword in Title', status: 'good', message: 'Focus keyword found in title.' });
            } else {
                results.push({ id: 'keyword-title', label: 'Keyword in Title', status: 'error', message: 'Add focus keyword to your title.' });
            }

            // Keyword density
            if (analysis.keywordDensity < 0.5) {
                results.push({ id: 'keyword-density', label: 'Keyword Density', status: 'warning', message: `${analysis.keywordDensity}% - Consider using keyword more often.` });
            } else if (analysis.keywordDensity > 2.5) {
                results.push({ id: 'keyword-density', label: 'Keyword Density', status: 'warning', message: `${analysis.keywordDensity}% - May appear as keyword stuffing.` });
            } else {
                results.push({ id: 'keyword-density', label: 'Keyword Density', status: 'good', message: `${analysis.keywordDensity}% - Good keyword usage.` });
            }

            // Keyword in first paragraph
            if (analysis.keywordInFirstParagraph) {
                results.push({ id: 'keyword-first', label: 'Keyword in Intro', status: 'good', message: 'Keyword appears early in content.' });
            } else {
                results.push({ id: 'keyword-first', label: 'Keyword in Intro', status: 'warning', message: 'Add keyword to your first paragraph.' });
            }
        }

        // Headings check
        if (analysis.h2Count === 0) {
            results.push({ id: 'headings', label: 'Subheadings', status: 'error', message: 'Add H2 headings to structure your content.' });
        } else if (analysis.h2Count < 3) {
            results.push({ id: 'headings', label: 'Subheadings', status: 'warning', message: `${analysis.h2Count} H2 headings. Consider adding more.` });
        } else {
            results.push({ id: 'headings', label: 'Subheadings', status: 'good', message: `${analysis.h2Count} H2, ${analysis.h3Count} H3 headings.` });
        }

        // Images
        if (analysis.imageCount === 0) {
            results.push({ id: 'images', label: 'Images', status: 'warning', message: 'Add images to make content more engaging.' });
        } else {
            results.push({ id: 'images', label: 'Images', status: 'good', message: `${analysis.imageCount} image(s) included.` });
        }

        // Links
        if (analysis.linkCount === 0) {
            results.push({ id: 'links', label: 'Internal/External Links', status: 'warning', message: 'Add links to related content.' });
        } else {
            results.push({ id: 'links', label: 'Links', status: 'good', message: `${analysis.linkCount} link(s) included.` });
        }

        // Readability
        if (analysis.avgWordsPerSentence > 25) {
            results.push({ id: 'readability', label: 'Readability', status: 'warning', message: `Avg ${analysis.avgWordsPerSentence} words/sentence. Try shorter sentences.` });
        } else {
            results.push({ id: 'readability', label: 'Readability', status: 'good', message: `Avg ${analysis.avgWordsPerSentence} words/sentence. Easy to read!` });
        }

        return results;
    }, [analysis, keyword]);

    const score = useMemo(() => {
        const good = checks.filter(c => c.status === 'good').length;
        return Math.round((good / checks.length) * 100);
    }, [checks]);

    const getScoreColor = () => {
        if (score >= 80) return 'text-green-400';
        if (score >= 50) return 'text-yellow-400';
        return 'text-red-400';
    };

    return (
        <Card className="sticky top-4">
            <div
                className="p-4 border-b border-gray-700 cursor-pointer flex items-center justify-between"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-2">
                    <Target className="text-indigo-400" size={18} />
                    <span className="font-medium text-white">SEO Analysis</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`text-lg font-bold ${getScoreColor()}`}>{score}%</span>
                </div>
            </div>

            {expanded && (
                <div className="p-4 space-y-4">
                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-2 text-gray-400">
                            <FileText size={14} />
                            <span>{analysis.wordCount} words</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-400">
                            <Hash size={14} />
                            <span>{analysis.keywordCount}× keyword</span>
                        </div>
                    </div>

                    <ProgressBar value={score} />

                    {/* Checks */}
                    <div className="space-y-3">
                        {checks.map((check) => (
                            <div key={check.id} className="flex items-start gap-2">
                                {check.status === 'good' && (
                                    <Check size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                                )}
                                {check.status === 'warning' && (
                                    <AlertTriangle size={16} className="text-yellow-400 mt-0.5 flex-shrink-0" />
                                )}
                                {check.status === 'error' && (
                                    <AlertTriangle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
                                )}
                                <div>
                                    <p className="text-sm text-white">{check.label}</p>
                                    <p className="text-xs text-gray-500">{check.message}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </Card>
    );
}
