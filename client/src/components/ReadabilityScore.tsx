// Word count and readability score component
import { useMemo } from 'react';
import { FileText, Clock, BarChart2, BookOpen } from 'lucide-react';
import { Card, ProgressBar } from './ui';

interface ReadabilityScoreProps {
    content: string;
    targetWordCount?: number;
}

interface ReadabilityMetrics {
    wordCount: number;
    sentenceCount: number;
    paragraphCount: number;
    avgWordsPerSentence: number;
    avgSentencesPerParagraph: number;
    readingTime: number;
    fleschScore: number;
    gradeLevel: string;
}

export default function ReadabilityScore({ content, targetWordCount = 1500 }: ReadabilityScoreProps) {
    const metrics = useMemo((): ReadabilityMetrics => {
        const text = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

        const words = text.split(/\s+/).filter(w => w.length > 0);
        const wordCount = words.length;

        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const sentenceCount = Math.max(1, sentences.length);

        const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
        const paragraphCount = Math.max(1, paragraphs.length);

        const avgWordsPerSentence = wordCount / sentenceCount;
        const avgSentencesPerParagraph = sentenceCount / paragraphCount;

        // Reading time (average 200 words per minute)
        const readingTime = Math.ceil(wordCount / 200);

        // Flesch Reading Ease (simplified)
        const syllableCount = words.reduce((acc, word) => {
            return acc + countSyllables(word);
        }, 0);
        const avgSyllablesPerWord = syllableCount / Math.max(1, wordCount);
        const fleschScore = Math.round(
            206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord)
        );

        // Grade level
        const gradeLevel = getGradeLevel(Math.max(0, Math.min(100, fleschScore)));

        return {
            wordCount,
            sentenceCount,
            paragraphCount,
            avgWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10,
            avgSentencesPerParagraph: Math.round(avgSentencesPerParagraph * 10) / 10,
            readingTime,
            fleschScore: Math.max(0, Math.min(100, fleschScore)),
            gradeLevel,
        };
    }, [content]);

    const wordCountProgress = Math.min(100, (metrics.wordCount / targetWordCount) * 100);
    const wordCountStatus =
        metrics.wordCount < targetWordCount * 0.5 ? 'error' :
            metrics.wordCount < targetWordCount * 0.8 ? 'warning' : 'success';

    return (
        <Card>
            <div className="p-4 space-y-4">
                <h3 className="text-sm font-medium text-white flex items-center gap-2">
                    <BarChart2 size={16} className="text-indigo-400" />
                    Content Metrics
                </h3>

                {/* Word Count */}
                <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-400">Word Count</span>
                        <span className={`font-medium ${wordCountStatus === 'success' ? 'text-green-400' :
                                wordCountStatus === 'warning' ? 'text-yellow-400' : 'text-red-400'
                            }`}>
                            {metrics.wordCount.toLocaleString()} / {targetWordCount.toLocaleString()}
                        </span>
                    </div>
                    <ProgressBar
                        value={wordCountProgress}
                        variant={wordCountStatus as 'success' | 'warning' | 'error'}
                    />
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-gray-800 rounded-lg">
                        <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                            <Clock size={12} />
                            Reading Time
                        </div>
                        <div className="text-lg font-bold text-white">
                            {metrics.readingTime} min
                        </div>
                    </div>

                    <div className="p-3 bg-gray-800 rounded-lg">
                        <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                            <BookOpen size={12} />
                            Grade Level
                        </div>
                        <div className="text-lg font-bold text-white">
                            {metrics.gradeLevel}
                        </div>
                    </div>
                </div>

                {/* Readability Score */}
                <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-400">Readability Score</span>
                        <span className="font-medium text-white">{metrics.fleschScore}/100</span>
                    </div>
                    <ProgressBar
                        value={metrics.fleschScore}
                        variant={
                            metrics.fleschScore >= 60 ? 'success' :
                                metrics.fleschScore >= 40 ? 'warning' : 'error'
                        }
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        {getFleschDescription(metrics.fleschScore)}
                    </p>
                </div>

                {/* Detailed Stats */}
                <div className="border-t border-gray-700 pt-3">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex justify-between">
                            <span className="text-gray-500">Sentences</span>
                            <span className="text-gray-300">{metrics.sentenceCount}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Paragraphs</span>
                            <span className="text-gray-300">{metrics.paragraphCount}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Avg words/sentence</span>
                            <span className="text-gray-300">{metrics.avgWordsPerSentence}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Sentences/paragraph</span>
                            <span className="text-gray-300">{metrics.avgSentencesPerParagraph}</span>
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    );
}

function countSyllables(word: string): number {
    word = word.toLowerCase().replace(/[^a-z]/g, '');
    if (word.length <= 3) return 1;

    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');

    const matches = word.match(/[aeiouy]{1,2}/g);
    return matches ? matches.length : 1;
}

function getGradeLevel(fleschScore: number): string {
    if (fleschScore >= 90) return '5th grade';
    if (fleschScore >= 80) return '6th grade';
    if (fleschScore >= 70) return '7th grade';
    if (fleschScore >= 60) return '8-9th grade';
    if (fleschScore >= 50) return '10-12th grade';
    if (fleschScore >= 30) return 'College';
    return 'Graduate';
}

function getFleschDescription(score: number): string {
    if (score >= 90) return 'Very easy to read. Easily understood by 11-year-olds.';
    if (score >= 80) return 'Easy to read. Conversational English for consumers.';
    if (score >= 70) return 'Fairly easy to read.';
    if (score >= 60) return 'Plain English. Easily understood by 13-15 year-olds.';
    if (score >= 50) return 'Fairly difficult to read.';
    if (score >= 30) return 'Difficult to read.';
    return 'Very difficult to read. Best understood by university graduates.';
}
