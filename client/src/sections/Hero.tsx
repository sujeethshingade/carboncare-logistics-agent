import React, { useState, useRef } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import config from '../../config';

type ChatTopic = {
    title: string;
    prompt: string;
};

export const Hero = () => {
    const [messages, setMessages] = useState<{ text: string; type: 'user' | 'assistant' }[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const sustainabilityTopics: ChatTopic[] = [
        {
            title: 'Carbon Footprint Comparison',
            prompt: 'Explain how to calculate and compare carbon footprints for different activities or organizations.',
        },
        {
            title: 'Transportation using Renewable Energy',
            prompt: 'Discuss the latest innovations in renewable energy for transportation and their environmental benefits.',
        },
        {
            title: 'Sustainable Packaging of Goods',
            prompt: 'Analyze the current trends and challenges in sustainable packaging solutions.',
        },
        {
            title: 'Environmental Impact Reports',
            prompt: 'What are the key components of a comprehensive environmental impact report?',
        },
    ];

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            setIsLoading(true);
            const response = await axios.post(`${config.apiUrl}/api/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            setMessages((prev) => [
                ...prev,
                {
                    text: `📄 Document uploaded successfully: ${file.name}, Processed ${response.data.chunks} text chunks`,
                    type: 'assistant',
                },
            ]);
        } catch (error) {
            setMessages((prev) => [...prev, { text: '❌ File upload failed', type: 'assistant' }]);
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendMessage = async (message?: string) => {
        const messageToSend = message || inputMessage;
        if (!messageToSend.trim()) return;

        setMessages((prev) => [
            ...prev,
            { text: messageToSend, type: 'user' },
        ]);

        try {
            setIsLoading(true);
            const response = await axios.post(`${config.apiUrl}/api/query`, { query: messageToSend });

            setMessages((prev) => [
                ...prev,
                { text: response.data.response, type: 'assistant' },
            ]);
        } catch (error) {
            setMessages((prev) => [...prev, { text: '❌ Failed to get response', type: 'assistant' }]);
            console.error(error);
        } finally {
            setInputMessage('');
            setIsLoading(false);
        }
    };

    const handleTopicClick = (topic: ChatTopic) => {
        handleSendMessage(topic.prompt);
    };

    const handleClearChat = () => {
        setMessages([]);
    };

    return (
        <div className="container py-16">
            <div className="max-w-6xl mx-auto space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-6">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept=".pdf"
                        className="hidden"
                    />
                    {sustainabilityTopics.map((topic, index) => (
                        <button
                            key={index}
                            onClick={() => handleTopicClick(topic)}
                            className="bg-green-700 hover:bg-green-900 text-white p-3 tracking-tight rounded-lg transition-colors duration-200"
                        >
                            {topic.title}
                        </button>
                    ))}
                </div>

                <div className="bg-green-700 rounded-lg p-6 min-h-[600px] flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-white text-lg font-semibold tracking-tight">EcoFlow Assistant</h2>
                        <button
                            onClick={handleClearChat}
                            className="text-white hover:text-gray-400 transition-colors duration-200 flex items-center gap-2"
                        >
                            <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                />
                            </svg>
                            Clear
                        </button>
                    </div>

                    <div className="flex-grow text-white overflow-y-auto space-y-3">
                        {messages.length === 0 ? (
                            <div className="text-center flex items-center justify-center h-full">
                                Upload a document or select a topic to start a conversation...
                            </div>
                        ) : (
                            messages.map((message, index) => (
                                <div
                                    key={index}
                                    className={`flex ${
                                        message.type === 'user' ? 'justify-end' : 'justify-start'
                                    }`}
                                >
                                    <div
                                        className={`p-3 rounded-lg ${
                                            message.type === 'user' ? 'bg-black text-right' : 'bg-black text-left'
                                        }`}
                                    >
                                        {message.type === 'assistant' ? (
                                            <ReactMarkdown>{message.text}</ReactMarkdown>
                                        ) : (
                                            message.text
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="mt-4 relative">
                        <input
                            type="text"
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                            placeholder="Send a message..."
                            disabled={isLoading}
                            className="w-full bg-green-900 text-white rounded-lg pl-4 pr-12 py-3 focus:outline-none focus:ring-1 focus:ring-white disabled:opacity-50"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-4">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="text-gray-400 hover:text-white transition-colors duration-200"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="w-5 h-5"
                                >
                                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                                    <path d="M12 9v6" />
                                    <path d="m15 12-3-3-3 3" />
                                </svg>
                            </button>
                            <button
                                onClick={() => handleSendMessage()}
                                disabled={isLoading}
                                className="text-gray-400 hover:text-white transition-colors duration-200 disabled:opacity-50"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M5 10l7-7m0 0l7 7m-7-7v18"
                                    />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};