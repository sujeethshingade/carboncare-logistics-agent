import React, { useState, useRef } from 'react';
import { Paperclip, ArrowUp, RefreshCcw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

type ChatTopic = {
    title: string;
    prompt: string;
};

export const Hero = () => {
    const [messages, setMessages] = useState<{ text: string; type: 'user' | 'agent' }[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const sustainabilityTopics: ChatTopic[] = [
        {
            title: 'Transportation using Renewable Energy',
            prompt: 'Discuss the latest innovations in renewable energy for transportation.',
        },
        {
            title: 'Sustainable Packaging of Goods',
            prompt: 'Analyze the current trends and challenges in sustainable packaging solutions.',
        },
        {
            title: 'Carbon Footprint Comparison',
            prompt: 'Compare carbon footprints for different activities or organizations.',
        },
        {
            title: 'Environmental Impact Reports',
            prompt: 'What are the key components of a comprehensive environmental impact report?',
        },
    ];

    const handleTopicClick = (topic: ChatTopic) => {
        setMessages((prev) => [
            ...prev,
            { text: topic.prompt, type: 'user' },
            { text: 'Failed to generate response.', type: 'agent' },
        ]);
    };

    const handleSendMessage = () => {
        if (!inputMessage.trim()) return;

        setMessages((prev) => [
            ...prev,
            { text: inputMessage, type: 'user' },
            { text: 'Failed to generate response.', type: 'agent' },
        ]);
        setInputMessage('');
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
                        className="hidden"
                    />
                    {sustainabilityTopics.map((topic, index) => (
                        <button
                            key={index}
                            onClick={() => handleTopicClick(topic)}
                            className="border bg-black text-white hover:border-primary transition-colors duration-300 p-4"
                        >
                            {topic.title}
                        </button>
                    ))}
                </div>

                <div className="bg-black border p-6 min-h-[600px] flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-white text-lg font-semibold">CarbonCare Agent</h2>
                        <button
                            onClick={handleClearChat}
                            className="text-white hover:text-primary transition-colors duration-300 flex items-center gap-2"
                        >
                            <RefreshCcw className="w-5 h-5" />
                            Clear
                        </button>
                    </div>

                    <div className="flex-grow text-white overflow-y-auto space-y-3">
                        {messages.length === 0 ? (
                            <div className="text-center flex items-center justify-center h-full py-4">
                                Upload a document or Start a conversation...
                            </div>
                        ) : (
                            messages.map((message, index) => (
                                <div
                                    key={index}
                                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`p-3 rounded-sm ${message.type === 'user' ? 'bg-primary text-right' : 'bg-primary text-left'}`}
                                        style={{ wordWrap: 'break-word', display: 'inline-block', maxWidth: '60%' }}
                                    >
                                        {message.type === 'agent' ? (
                                            <ReactMarkdown>
                                                {message.text}
                                            </ReactMarkdown>
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
                            onKeyUp={(e) => e.key === 'Enter' && handleSendMessage()}
                            placeholder="Send a message..."
                            className="w-full bg-black text-white border pl-4 pr-20 py-3 focus:outline-none focus:border-primary"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-4">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="text-white hover:text-primary transition-colors duration-300"
                            >
                                <Paperclip className="w-5 h-5" />
                            </button>
                            <button
                                onClick={handleSendMessage}
                                className="text-white hover:text-primary transition-colors duration-300"
                            >
                                <ArrowUp className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
