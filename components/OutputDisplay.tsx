import React, { useRef, useState, useCallback } from 'react';
import type { GeneratedContent, Question } from '../types';
import { CopyIcon, FileTextIcon, SparklesIcon, EditIcon, CheckIcon, OpeningIcon, CoreIcon, FollowUpIcon, ClosingIcon, DownloadIcon, SendIcon, LoadingIcon } from './icons';
import { jsPDF } from 'jspdf';
import { generateQualtricsTxt } from '../utils/qsfGenerator';

interface OutputDisplayProps {
  content: GeneratedContent | null;
  isLoading: boolean;
  isRefining: boolean;
  error: string | null;
  setContent: React.Dispatch<React.SetStateAction<GeneratedContent | null>>;
  onRegenerateWithTone: (tone: string) => Promise<void>;
  onRefine: (prompt: string) => Promise<void>;
}

const WelcomePlaceholder: React.FC = () => (
    <div className="text-center p-10 border-2 border-dashed border-slate-800 rounded-xl bg-slate-900/50 flex flex-col items-center justify-center h-full min-h-[500px]">
        <div className="relative mb-4">
            <div className="absolute -inset-1 bg-gradient-to-r from-sky-500 to-teal-400 rounded-full blur opacity-50"></div>
            <SparklesIcon className="relative h-16 w-16 text-sky-300 bg-slate-800 p-3 rounded-full" />
        </div>
        <h3 className="mt-2 text-xl font-bold text-slate-100">Welcome to PromptForm AI</h3>
        <p className="mt-2 text-slate-400 max-w-sm">Fill out the parameters on the left and click "Generate Script" to create your interview or questionnaire.</p>
    </div>
);

const LoadingSpinner: React.FC = () => (
    <div className="flex flex-col items-center justify-center p-10 border-2 border-dashed border-slate-800 rounded-xl bg-slate-900/50 h-full min-h-[500px]">
        <svg className="animate-spin h-12 w-12 text-sky-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="mt-6 text-lg font-medium text-slate-300">Generating your script...</p>
        <p className="mt-1 text-sm text-slate-400">This may take a moment.</p>
    </div>
);

const ErrorDisplay: React.FC<{ message: string }> = ({ message }) => (
    <div className="p-6 bg-red-900/30 border border-red-700/50 rounded-xl text-red-300 h-full min-h-[500px] flex flex-col justify-center">
        <h4 className="font-bold text-lg mb-2">An Error Occurred</h4>
        <p className="text-red-400">{message}</p>
    </div>
);


const QuestionPreview: React.FC<{ question: Question }> = ({ question }) => {
    if (!question.type) return null;

    switch (question.type) {
        case 'FreeText':
            return <textarea className="mt-2 w-full bg-slate-800 border border-slate-700 rounded-md p-2 text-sm text-slate-400 resize-none" rows={2} placeholder="Respondent's answer..." disabled />;
        case 'MultipleChoice':
            return (
                <div className="mt-3 space-y-2">
                    {question.options?.map((option, i) => (
                        <label key={i} className="flex items-center space-x-3 text-slate-400 cursor-not-allowed">
                            <input type="checkbox" className="bg-slate-700 border-slate-600 rounded text-sky-500 focus:ring-sky-500/50" disabled />
                            <span>{option}</span>
                        </label>
                    ))}
                </div>
            );
        case 'SingleChoice':
        case 'LikertScale':
             return (
                <div className="mt-3 space-y-2">
                    {question.options?.map((option, i) => (
                        <label key={i} className="flex items-center space-x-3 text-slate-400 cursor-not-allowed">
                            <input type="radio" name={question.id} className="bg-slate-700 border-slate-600 text-sky-500 focus:ring-sky-500/50" disabled />
                            <span>{option}</span>
                        </label>
                    ))}
                </div>
            );
        default:
            return null;
    }
}

const EditableQuestion: React.FC<{ question: Question; onUpdate: (id: string, newText: string) => void }> = ({ question, onUpdate }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [text, setText] = useState(question.text);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleSave = () => {
        onUpdate(question.id, text.trim());
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleSave();
        else if (e.key === 'Escape') {
            setText(question.text);
            setIsEditing(false);
        }
    };
    
    React.useEffect(() => {
        if (isEditing) {
            inputRef.current?.focus();
            inputRef.current?.select();
        }
    }, [isEditing]);

    return (
        <li className="group flex items-start space-x-4 py-2.5 transition-colors rounded-md hover:bg-slate-800/50 px-2 -mx-2">
            <span className="text-sky-400 mt-1.5">&#9670;</span>
            {isEditing ? (
                <div className="flex-1 flex items-center space-x-2">
                    <input 
                        ref={inputRef}
                        type="text"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onBlur={handleSave}
                        onKeyDown={handleKeyDown}
                        className="w-full bg-slate-700/80 border border-slate-600 rounded-md py-1 px-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                    <button onClick={handleSave} className="p-1 text-slate-300 hover:text-white" aria-label="Save">
                        <CheckIcon className="h-5 w-5" />
                    </button>
                </div>
            ) : (
                 <div className="flex-1">
                    <div className="flex items-start justify-between cursor-pointer" onClick={() => setIsEditing(true)}>
                        <span className="flex-1 text-slate-300 pr-4">{question.text}</span>
                        <button onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} className="p-1 text-slate-500 opacity-0 group-hover:opacity-100 hover:text-white transition-opacity shrink-0" aria-label="Edit">
                           <EditIcon className="h-4 w-4" />
                        </button>
                    </div>
                    <QuestionPreview question={question} />
                 </div>
            )}
        </li>
    );
};

const Section: React.FC<{ title: string; icon: React.ReactNode; questions: Question[]; onUpdate: (id: string, newText: string) => void }> = ({ title, icon, questions, onUpdate }) => (
    <div>
        <h3 className="font-bold text-lg text-slate-100 border-b border-slate-800 pb-3 mb-3 flex items-center space-x-3">
            {icon}
            <span>{title}</span>
        </h3>
        <ul className="list-none pl-2 space-y-1">
            {questions.map(q => <EditableQuestion key={q.id} question={q} onUpdate={onUpdate} />)}
        </ul>
    </div>
);

const IconButton: React.FC<{ onClick: () => void; icon: React.ReactNode; label: string }> = ({ onClick, icon, label }) => (
    <button onClick={onClick} className="flex items-center text-sm bg-slate-700/80 hover:bg-slate-700 px-3 py-1.5 rounded-md transition-colors" title={label}>
        {icon}
    </button>
);

export const OutputDisplay: React.FC<OutputDisplayProps> = ({ content, isLoading, isRefining, error, setContent, onRegenerateWithTone, onRefine }) => {
    const [isToneAdjusting, setIsToneAdjusting] = useState('');
    const [refinementInput, setRefinementInput] = useState('');

    const formatContentAsText = useCallback(() => {
        if (!content) return "";
        let text = "";
        text += "## Opening / Warm-up Questions\n";
        content.opening.forEach(q => {
             text += `- ${q.text}\n`;
             if (q.options) q.options.forEach(opt => text += `  - ${opt}\n`);
        });
        text += "\n";
        content.core.forEach(section => {
            text += `## Core Questions: ${section.topic}\n`;
            section.questions.forEach(q => {
                text += `- ${q.text}\n`;
                if (q.options) q.options.forEach(opt => text += `  - ${opt}\n`);
            });
            text += "\n";
        });
        text += "## Follow-ups / Probes\n";
        content.followUps.forEach(q => {
            text += `- ${q.text}\n`;
            if (q.options) q.options.forEach(opt => text += `  - ${opt}\n`);
        });
        text += "\n";
        text += "## Closing / Wrap-up\n";
        content.closing.forEach(q => {
            text += `- ${q.text}\n`;
            if (q.options) q.options.forEach(opt => text += `  - ${opt}\n`);
        });
        return text;
    }, [content]);

    const handleCopyToClipboard = () => navigator.clipboard.writeText(formatContentAsText()).catch(err => console.error('Failed to copy: ', err));
    
    const handleExportPDF = () => {
        if (!content) return;

        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 15;
        const maxLineWidth = pageWidth - margin * 2;
        let y = margin;

        const checkPageBreak = (neededHeight: number) => {
            if (y + neededHeight > pageHeight - margin) {
                pdf.addPage();
                y = margin;
            }
        };
        
        pdf.setFontSize(18);
        pdf.setFont(undefined, 'bold');
        const title = content.isQuestionnaire ? 'Generated Questionnaire' : 'Generated Script';
        const titleLines = pdf.splitTextToSize(title, maxLineWidth);
        checkPageBreak(titleLines.length * 8);
        pdf.text(titleLines, pageWidth / 2, y, { align: 'center' });
        y += titleLines.length * 8 + 10;
        
        const addSection = (title: string, questions: Question[]) => {
            if (questions.length === 0) return;
            pdf.setFontSize(14);
            pdf.setFont(undefined, 'bold');
            const sectionTitleLines = pdf.splitTextToSize(title, maxLineWidth);
            checkPageBreak(sectionTitleLines.length * 7 + 8);
            pdf.text(sectionTitleLines, margin, y);
            y += sectionTitleLines.length * 7 + 4;

            questions.forEach(q => {
                pdf.setFontSize(11);
                pdf.setFont(undefined, 'normal');
                const questionText = `- ${q.text}`;
                const questionLines = pdf.splitTextToSize(questionText, maxLineWidth - 5);
                checkPageBreak(questionLines.length * 5 + 2);
                pdf.text(questionLines, margin + 2, y);
                y += questionLines.length * 5 + 2;

                if (q.options && q.options.length > 0) {
                     pdf.setFontSize(10);
                     q.options.forEach(opt => {
                         const optionText = `    • ${opt}`;
                         const optionLines = pdf.splitTextToSize(optionText, maxLineWidth - 10);
                         checkPageBreak(optionLines.length * 4.5);
                         pdf.text(optionLines, margin + 5, y);
                         y += optionLines.length * 4.5;
                     });
                     y+=2;
                }
            });
            y+=5;
        };
        
        addSection("Opening / Warm-up Questions", content.opening);
        content.core.forEach(section => {
            addSection(`Core Questions: ${section.topic}`, section.questions);
        });
        addSection("Follow-ups / Probes", content.followUps);
        addSection("Closing / Wrap-up", content.closing);

        pdf.save("generated_script.pdf");
    };
    
    const handleExportTxt = () => {
        if (!content) return;
        const txtString = generateQualtricsTxt(content);
        const blob = new Blob([txtString], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'survey.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const updateQuestionText = (section: keyof GeneratedContent, id: string, newText: string, coreIndex?: number) => {
        setContent(prev => {
            if (!prev) return null;
            const newContent = JSON.parse(JSON.stringify(prev));
            if (section === 'core' && coreIndex !== undefined) {
                const qIndex = newContent.core[coreIndex].questions.findIndex((q: Question) => q.id === id);
                if (qIndex > -1) newContent.core[coreIndex].questions[qIndex].text = newText;
            } else {
                 const qIndex = (newContent[section] as Question[]).findIndex((q: Question) => q.id === id);
                 if(qIndex > -1) (newContent[section] as Question[])[qIndex].text = newText;
            }
            return newContent;
        });
    };

    const handleToneAdjust = async (tone: 'Formal' | 'Conversational' | 'Friendly') => {
        setIsToneAdjusting(tone);
        await onRegenerateWithTone(tone);
        setIsToneAdjusting('');
    };
    
    const handleSendRefinement = async () => {
        if (!refinementInput.trim() || isRefining || isToneAdjusting) return;
        await onRefine(refinementInput);
        setRefinementInput('');
    };
    
    if (isLoading) return <LoadingSpinner />;
    if (error) return <ErrorDisplay message={error} />;
    if (!content) return <WelcomePlaceholder />;

    return (
        <div className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-xl shadow-2xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h2 className="text-xl font-bold text-slate-100">{content.isQuestionnaire ? 'Generated Questionnaire' : 'Generated Script'}</h2>
                <div className="flex items-center space-x-2 flex-wrap gap-2">
                    <IconButton onClick={handleCopyToClipboard} icon={<CopyIcon className="h-4 w-4" />} label="Copy to Clipboard" />
                    <IconButton onClick={handleExportPDF} icon={<FileTextIcon className="h-4 w-4" />} label="Export as PDF" />
                    {content.isQuestionnaire && (
                       <IconButton onClick={handleExportTxt} icon={<DownloadIcon className="h-4 w-4" />} label="Export as TXT for Qualtrics" />
                    )}
                </div>
            </div>
            
            <div className="mb-8 bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
                <h3 className="text-sm font-semibold mb-3 text-slate-300 flex items-center gap-2">
                    <SparklesIcon className="h-5 w-5 text-sky-400" />
                    Adjust & Refine
                </h3>
                <div className="space-y-4">
                    <div>
                        <label className="text-xs text-slate-400">Quickly change tone</label>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            {['Formal', 'Conversational', 'Friendly'].map(tone => (
                                <button key={tone} onClick={() => handleToneAdjust(tone as 'Formal' | 'Conversational' | 'Friendly')} disabled={!!isToneAdjusting || isRefining} className="text-sm bg-slate-700 hover:bg-slate-600 disabled:opacity-50 px-4 py-1.5 rounded-md transition-colors">
                                    {isToneAdjusting === tone ? 'Adjusting...' : `Make ${tone}`}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label htmlFor="refine-input" className="text-xs text-slate-400">Or provide specific instructions</label>
                        <div className="flex items-center space-x-2 mt-1.5">
                            <input
                                id="refine-input"
                                type="text"
                                value={refinementInput}
                                onChange={(e) => setRefinementInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSendRefinement()}
                                placeholder="e.g., Add a section about pricing"
                                className="flex-1 bg-slate-700 border border-slate-600 rounded-lg py-2 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500 sm:text-sm"
                                disabled={isRefining || !!isToneAdjusting}
                            />
                            <button onClick={handleSendRefinement} disabled={isRefining || !!isToneAdjusting || !refinementInput.trim()} className="bg-sky-600 hover:bg-sky-700 text-white rounded-lg p-2.5 disabled:bg-sky-800 disabled:cursor-not-allowed transition-colors shrink-0">
                                {isRefining ? (
                                    <LoadingIcon className="h-5 w-5 animate-spin" />
                                ) : (
                                    <SendIcon className="h-5 w-5" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-8 text-slate-300">
                <Section title="Opening / Warm-up Questions" icon={<OpeningIcon className="h-6 w-6 text-sky-400" />} questions={content.opening} onUpdate={(id, text) => updateQuestionText('opening', id, text)} />
                {content.core.map((section, index) => (
                    <Section key={section.topic} title={`Core Questions: ${section.topic}`} icon={<CoreIcon className="h-6 w-6 text-sky-400" />} questions={section.questions} onUpdate={(id, text) => updateQuestionText('core', id, text, index)} />
                ))}
                <Section title="Follow-ups / Probes" icon={<FollowUpIcon className="h-6 w-6 text-sky-400" />} questions={content.followUps} onUpdate={(id, text) => updateQuestionText('followUps', id, text)} />
                <Section title="Closing / Wrap-up" icon={<ClosingIcon className="h-6 w-6 text-sky-400" />} questions={content.closing} onUpdate={(id, text) => updateQuestionText('closing', id, text)} />
            </div>
        </div>
    );
};