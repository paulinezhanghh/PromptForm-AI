import type { GeneratedContent, Question } from '../types';

/**
 * Generates a Qualtrics-compatible TXT file string from the application's content.
 * @param content The generated content object.
 * @returns A string formatted for Qualtrics TXT import.
 */
export function generateQualtricsTxt(content: GeneratedContent): string {
    let mcCounter = 1;
    let teCounter = 1;
    const lines: string[] = [];

    const processQuestions = (questions: Question[]) => {
        if (!questions || questions.length === 0) return;

        questions.forEach(question => {
            // Skip questions that aren't suitable for a text-based survey format
            if (!question.type) return;

            switch (question.type) {
                case 'SingleChoice':
                case 'LikertScale':
                    lines.push(`MC${mcCounter++}. ${question.text}`);
                    lines.push(''); // Blank line between question and choices
                    question.options?.forEach(opt => lines.push(opt));
                    break;
                
                case 'MultipleChoice':
                    lines.push(`MC${mcCounter++}. ${question.text}`);
                    lines.push('[[MultipleAnswer]]');
                    lines.push(''); // Blank line between question and choices
                    question.options?.forEach(opt => lines.push(opt));
                    break;
                    
                case 'FreeText':
                    lines.push(`TE${teCounter++}. ${question.text}`);
                    break;
            }
            // Add a blank line after each complete question for separation
            lines.push('');
        });
    };

    // Use [[Block]] tags to structure the survey sections
    if (content.opening.length > 0) {
        lines.push('[[Block:Opening / Warm-up Questions]]');
        lines.push('');
        processQuestions(content.opening);
    }
    
    content.core.forEach(section => {
        if (section.questions.length > 0) {
            lines.push(`[[Block:Core Questions: ${section.topic}]]`);
            lines.push('');
            processQuestions(section.questions);
        }
    });

    if (content.followUps.length > 0) {
        lines.push('[[Block:Follow-ups / Probes]]');
        lines.push('');
        processQuestions(content.followUps);
    }

    if (content.closing.length > 0) {
        lines.push('[[Block:Closing / Wrap-up]]');
        lines.push('');
        processQuestions(content.closing);
    }

    return lines.join('\n');
}
