import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Paperclip, ArrowUp, RefreshCcw } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/lib/supabase';
import { Sidebar } from '@/sections/Sidebar';
import { Dashboard } from '@/sections/Dashboard'
import { useRouter } from 'next/navigation';
import { toast } from '@/components/ui/use-toast';

type ChatTopic = {
    title: string;
    prompt: string;
};

export const Hero: React.FC = () => {
    const [messages, setMessages] = useState<{ text: string; type: 'user' | 'agent' }[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [user, setUser] = useState<any>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
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

    const scrollToBottom = () => {
        if (scrollAreaRef.current) {
            const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (scrollElement) {
                scrollElement.scrollTop = scrollElement.scrollHeight;
            }
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

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
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendMessage = async () => {
        if (!inputMessage.trim() || isLoading) return;

        if (!currentSessionId) {
            try {
                await createNewSession();
                if (!currentSessionId) {
                    setError('Failed to create new session');
                    return;
                }
            } catch (err) {
                console.error('Error creating new session:', err);
                return;
            }
        }

        setIsLoading(true);

        try {
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
        } catch (err) {
            console.error('Error handling message:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            setSelectedFile(event.target.files[0]);
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Check if file is CSV
        if (!file.name.endsWith('.csv')) {
            toast({
                title: "Invalid file type",
                description: "Please upload a CSV file",
                variant: "destructive"
            });
            return;
        }

        setIsLoading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('http://localhost:5000/api/v1/sustainability/upload', {  // Update URL to match your Flask server
                method: 'POST',
                body: formData,
                // Don't set Content-Type header - let browser set it with boundary for FormData
            });

            // Check if response is JSON
            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                throw new Error(`Server returned unexpected content type: ${contentType}`);
            }

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Upload failed');
            }

            toast({
                title: "Success",
                description: "File uploaded and processed successfully",
            });

            // Add message to chat
            const newMessages = [
                {
                    text: `Uploaded file: ${file.name}`,
                    type: 'user' as const
                },
                {
                    text: `File processed successfully. ${result.message}`,
                    type: 'agent' as const
                }
            ];
            setMessages(prev => [...prev, ...newMessages]);
            await saveMessagesToDatabase(newMessages);

        } catch (error) {
            console.error('Error uploading file:', error);
            toast({
                title: "Error",
                description: error.message || "Failed to upload file",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

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
                    <Dashboard />
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
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle className="text-white text-lg font-semibold">
                                    CarbonCare Agent
                                </CardTitle>
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
                                    <ScrollArea ref={scrollAreaRef} className="flex-grow pr-4 -mr-4">
                                        <div className="space-y-4">
                                            {messages.length === 0 ? (
                                                <div className="text-center flex items-center justify-center h-full text-white">
                                                    Upload a document or Start a conversation...
                                                </div>
                                            ) : (
                                                messages.map((message, index) => (
                                                    <div
                                                        key={index}
                                                        className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
                                                    >
                                                        <div
                                                            className={`p-3 rounded-sm ${message.type === 'user'
                                                                ? 'bg-primary text-white text-right'
                                                                : 'bg-primary text-white text-left'
                                                                }`}
                                                            style={{
                                                                wordWrap: 'break-word',
                                                                display: 'inline-block',
                                                                maxWidth: '70%'
                                                            }}
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
                                    </ScrollArea>
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
                            accept=".csv"
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