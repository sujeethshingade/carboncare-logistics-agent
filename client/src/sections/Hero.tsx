import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Paperclip, ArrowUp, RefreshCcw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Sidebar } from '@/sections/Sidebar';
import { useRouter } from 'next/navigation';

type ChatTopic = {
    title: string;
    prompt: string;
};

export const Hero = () => {
    const [messages, setMessages] = useState<{ text: string; type: 'user' | 'agent' }[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [user, setUser] = useState<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const messageContainerRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

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

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    router.push('/login');
                    return;
                }
                setUser(user);
                await createNewSession();
            } catch (err) {
                console.error('Auth error:', err);
                setError('Authentication failed. Please login again.');
                router.push('/login');
            }
        };

        checkAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_OUT') {
                router.push('/login');
            } else if (event === 'SIGNED_IN' && session?.user) {
                setUser(session.user);
                await createNewSession();
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const createNewSession = async () => {
        if (!user) return;

        try {
            setIsLoading(true);
            const { data: session, error: sessionError } = await supabase
                .from('chat_sessions')
                .insert({
                    title: 'New Chat',
                    user_id: user.id
                })
                .select()
                .single();

            if (sessionError) throw sessionError;

            setCurrentSessionId(session.id);
            setMessages([]);
            setError(null);
        } catch (err) {
            console.error('Error creating session:', err);
            setError('Failed to create new chat session. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSessionSelect = async (sessionId: string) => {
        if (!user) return;

        try {
            setIsLoading(true);
            const { data: messages, error: messagesError } = await supabase
                .from('messages')
                .select('*')
                .eq('session_id', sessionId)
                .order('created_at', { ascending: true });

            if (messagesError) throw messagesError;

            setCurrentSessionId(sessionId);
            setMessages(
                messages.map(msg => ({
                    text: msg.content,
                    type: msg.type as 'user' | 'agent'
                }))
            );
        } catch (err) {
            console.error('Error fetching messages:', err);
            setError('Failed to load chat messages. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const saveMessagesToDatabase = async (newMessages: { text: string; type: 'user' | 'agent' }[]) => {
        if (!currentSessionId) {
            throw new Error('No active session');
        }

        const { error: messagesError } = await supabase
            .from('messages')
            .insert(
                newMessages.map(msg => ({
                    session_id: currentSessionId,
                    content: msg.text,
                    type: msg.type
                }))
            );

        if (messagesError) {
            throw new Error(messagesError.message);
        }
    };

    const updateSessionTitle = async (title: string) => {
        if (!currentSessionId) return;

        const { error } = await supabase
            .from('chat_sessions')
            .update({ title: title.slice(0, 50) })
            .eq('id', currentSessionId);

        if (error) {
            console.error('Error updating session title:', error);
        }
    };

    const handleTopicClick = async (topic: ChatTopic) => {
        try {
            setIsLoading(true);

            if (!currentSessionId) {
                await createNewSession();
            }

            const newMessages = [
                { text: topic.prompt, type: 'user' as const },
                { text: 'Processing your request...', type: 'agent' as const }
            ];

            setMessages(prev => [...prev, ...newMessages]);
            await saveMessagesToDatabase(newMessages);

            if (messages.length === 0) {
                await updateSessionTitle(topic.title);
            }

            setError(null);
        } catch (err) {
            console.error('Error processing topic:', err);
            setError('Failed to process topic. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendMessage = async () => {
        if (!inputMessage.trim() || !currentSessionId || isLoading) return;

        setIsLoading(true);

        const newMessages = [
            { text: inputMessage, type: 'user' as const },
            { text: 'Error generating response.', type: 'agent' as const }
        ];

        setMessages(prev => [...prev, ...newMessages]);
        setInputMessage('');

        await saveMessagesToDatabase(newMessages);

        if (messages.length === 0) {
            await updateSessionTitle(inputMessage.slice(0, 50));
        }

        setIsLoading(false);
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !currentSessionId || !user) return;

        try {
            setIsLoading(true);
            const filePath = `${user.id}/${currentSessionId}/${file.name}`;
            const { error: uploadError } = await supabase.storage
                .from('chat-files')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { error: fileError } = await supabase
                .from('session_files')
                .insert({
                    session_id: currentSessionId,
                    file_name: file.name,
                    file_path: filePath,
                    file_type: file.type
                });

        } catch (err) {
            console.error('Error uploading file:', err);
            setError('Failed to upload file. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (messageContainerRef.current) {
            messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
        }
    }, [messages]);

    const handleClearChat = async (event: React.MouseEvent<HTMLButtonElement>) => {
        try {
            setIsLoading(true);
            setMessages([]);

            if (currentSessionId) {
                const { error: deleteError } = await supabase
                    .from('messages')
                    .delete()
                    .eq('session_id', currentSessionId);

                if (deleteError) throw deleteError;
                await createNewSession();
            }

            setError(null);
        } catch (err) {
            console.error('Error clearing chat:', err);
            setError('Failed to clear chat. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container py-16">
            {user ? (
                <>
                    <Sidebar
                        onSessionSelect={handleSessionSelect}
                        currentSessionId={currentSessionId}
                        onDeleteSession={() => {
                            setCurrentSessionId(null);
                            setMessages([]);
                        }}
                    />
                    <div className="max-w-6xl mx-auto space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-6">
                            {sustainabilityTopics.map((topic, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleTopicClick(topic)}
                                    className="border bg-black text-white hover:border-primary transition-colors duration-300 p-4"
                                    disabled={isLoading}
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
                                    disabled={isLoading}
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
                                            disabled={isLoading}
                                        />
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-4">
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                className="text-white hover:text-primary transition-colors duration-300"
                                                disabled={isLoading}
                                            >
                                                <Paperclip className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={handleSendMessage}
                                                className="text-white hover:text-primary transition-colors duration-300"
                                                disabled={isLoading}
                                            >
                                                <ArrowUp className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            onChange={handleFileUpload}
                        />
                    </div>
                </>
            ) : (
                <div className="text-center">
                    Please login to continue...
                </div>
            )}
        </div>
    );
};

export default Hero;