import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Chat } from '@google/genai';
import type { ChatMessage } from '../types';
import { ChatIcon, CloseIcon, SendIcon, LoadingIcon, SparklesIcon } from './icons';

export const Chatbot: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const chatRef = useRef<Chat | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [messages]);
    
    useEffect(() => {
        if (isOpen) {
            inputRef.current?.focus();
        }
    }, [isOpen]);

    const initializeChat = useCallback(() => {
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            chatRef.current = ai.chats.create({
                model: 'gemini-2.5-flash',
                config: {
                    systemInstruction: 'You are a friendly and expert assistant for a user research application. Your goal is to help users with their research-related questions. Keep your answers concise and professional.'
                }
            });
            setMessages([{ role: 'model', text: 'Hello! How can I help you with your user research today?' }]);
        } catch (error) {
            console.error("Failed to initialize chat:", error);
            setMessages([{ role: 'model', text: 'Sorry, I am unable to connect right now. Please check your API key.' }]);
        }
    }, []);

    useEffect(() => {
        if (isOpen && !chatRef.current) {
            initializeChat();
        }
    }, [isOpen, initializeChat]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: ChatMessage = { role: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            if (!chatRef.current) throw new Error("Chat not initialized.");
            
            const result = await chatRef.current.sendMessage({ message: userMessage.text });
            const modelMessage: ChatMessage = { role: 'model', text: result.text };
            setMessages(prev => [...prev, modelMessage]);

        } catch (error) {
            console.error('Gemini API error:', error);
            const errorMessage: ChatMessage = { role: 'model', text: 'Sorry, something went wrong. Please try again.' };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
            inputRef.current?.focus();
        }
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-6 right-6 bg-gradient-to-br from-sky-500 to-teal-500 text-white rounded-full p-4 shadow-2xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 focus:ring-sky-400 z-50 transition-transform duration-200 ease-in-out transform hover:scale-110"
                aria-label={isOpen ? 'Close chat' : 'Open chat'}
            >
                {isOpen ? <CloseIcon className="h-6 w-6" /> : <ChatIcon className="h-6 w-6" />}
            </button>

            {isOpen && (
                <div className="fixed bottom-24 right-6 w-[90vw] max-w-md h-[70vh] max-h-[600px] bg-slate-800/80 backdrop-blur-xl rounded-xl shadow-2xl flex flex-col z-40 border border-slate-700 animate-slide-up">
                    <style>{`.animate-slide-up { animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1); } @keyframes slide-up { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }`}</style>
                    <header className="bg-slate-900/50 p-4 rounded-t-xl flex items-center space-x-3 border-b border-slate-700">
                        <SparklesIcon className="h-6 w-6 text-sky-400" />
                        <h3 className="font-bold text-white">AI Assistant</h3>
                    </header>

                    <div className="flex-1 p-4 overflow-y-auto">
                        <div className="space-y-4">
                            {messages.map((msg, index) => (
                                <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] p-3 rounded-xl ${msg.role === 'user' ? 'bg-gradient-to-br from-sky-500 to-sky-600 text-white rounded-br-none' : 'bg-slate-700 text-slate-200 rounded-bl-none'}`}>
                                        <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="max-w-[80%] p-3 rounded-lg bg-slate-700 text-slate-200 inline-flex">
                                        <div className="h-2 w-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                        <div className="h-2 w-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s] mx-1"></div>
                                        <div className="h-2 w-2 bg-slate-400 rounded-full animate-bounce"></div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    </div>

                    <footer className="p-4 border-t border-slate-700 bg-slate-900/50 rounded-b-xl">
                        <div className="flex items-center space-x-2">
                            <input
                                ref={inputRef}
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Ask a question..."
                                className="flex-1 bg-slate-700 border border-slate-600 rounded-lg py-2 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500 sm:text-sm"
                                disabled={isLoading}
                            />
                            <button onClick={handleSend} disabled={isLoading || !input.trim()} className="bg-sky-600 hover:bg-sky-700 text-white rounded-lg p-2 disabled:bg-sky-800 disabled:cursor-not-allowed transition-colors">
                                <SendIcon className="h-5 w-5" />
                            </button>
                        </div>
                    </footer>
                </div>
            )}
        </>
    );
};