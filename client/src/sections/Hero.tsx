import React, { useState, useRef, useEffect } from 'react';
import { Paperclip, ArrowUp, RefreshCcw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type ChatTopic = {
    title: string;
    prompt: string;
};

export const Hero = () => {
    const [messages, setMessages] = useState<{ text: string; type: 'user' | 'agent' }[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const messageContainerRef = useRef<HTMLDivElement>(null);

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

    useEffect(() => {
        if (messageContainerRef.current) {
            messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
        }
    }, [messages]);

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

                <Card className="bg-black border rounded-none">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                        <CardTitle className="text-white text-lg font-semibold">CarbonCare Agent</CardTitle>
                        <button
                            onClick={handleClearChat}
                            className="text-white hover:text-primary transition-colors duration-300 flex items-center gap-2"
                        >
                            <RefreshCcw className="w-5 h-5" />
                            Clear
                        </button>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="h-[500px] flex flex-col">
                            <div 
                                ref={messageContainerRef}
                                className="flex-grow text-white overflow-y-auto space-y-3 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent scroll-smooth"
                            >
                                {messages.length === 0 ? (
                                    <div className="text-center flex items-center justify-center h-full">
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
                                                style={{ wordWrap: 'break-word', display: 'inline-block', maxWidth: '70%' }}
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
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default Hero;