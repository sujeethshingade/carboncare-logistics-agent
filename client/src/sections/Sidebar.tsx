import React from 'react';
import { useState, useEffect } from 'react';
import { Trash2, PanelRight, FileText, MessageCircle, Clock, Download } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

type Session = {
    id: string;
    title: string;
    created_at: string;
    message_count?: number;
    files?: {
        id: string;
        file_name: string;
        file_type: string;
        file_path: string;
        created_at: string;
    }[];
};

interface SidebarProps {
    onSessionSelect: (sessionId: string) => void;
    currentSessionId?: string | null;
    onDeleteSession?: (sessionId: string) => void;
}

export const Sidebar = ({
    onSessionSelect,
    currentSessionId,
    onDeleteSession
}: SidebarProps) => {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchSessions();
        }
    }, [isOpen, currentSessionId]);

    const fetchSessions = async () => {
        setIsLoading(true);
        try {
            const { data: sessionsData, error: sessionsError } = await supabase
                .from('chat_sessions')
                .select(`
                    id,
                    title,
                    created_at,
                    messages:messages(count),
                    files:session_files (
                        id,
                        file_name,
                        file_type,
                        file_path,
                        created_at
                    )
                `)
                .order('created_at', { ascending: false });

            if (sessionsError) throw sessionsError;

            const processedSessions = sessionsData?.map(session => ({
                ...session,
                message_count: session.messages?.[0]?.count || 0,
            })) || [];

            setSessions(processedSessions);
        } catch (error) {
            console.error('Error fetching sessions:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this chat session?')) return;

        setIsLoading(true);
        try {
            const { data: files } = await supabase
                .from('session_files')
                .select('file_path')
                .eq('session_id', sessionId);

            if (files) {
                for (const file of files) {
                    await supabase.storage
                        .from('chat-files')
                        .remove([file.file_path]);
                }
            }

            const { error } = await supabase
                .from('chat_sessions')
                .delete()
                .eq('id', sessionId);

            if (error) throw error;

            setSessions(prev => prev.filter(session => session.id !== sessionId));
            onDeleteSession?.(sessionId);
        } catch (error) {
            console.error('Error deleting session:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownloadFile = async (filePath: string, fileName: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const { data, error } = await supabase.storage
                .from('chat-files')
                .download(filePath);

            if (error) throw error;

            const url = window.URL.createObjectURL(data);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Error downloading file:', error);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) {
            return 'Today';
        } else if (days === 1) {
            return 'Yesterday';
        } else if (days < 7) {
            return `${days} days ago`;
        } else {
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        }
    };

    const filteredSessions = sessions.filter(session =>
        session.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                <Button 
                    size="icon" 
                    className="bg-black text-white hover:bg-black hover:text-primary rounded-none fixed left-3 top-3 z-50 transition-colors duration-300"
                    aria-label="Open chat history"
                >
                    <PanelRight className="h-5 w-5" />
                </Button>
            </SheetTrigger>
            <SheetContent 
                side="left" 
                className="w-[350px] p-0 bg-black border-r border-gray-800"
            >
                <SheetHeader className="p-4 border-b border-gray-800">
                    <SheetTitle className="text-lg font-semibold text-white">Chat History</SheetTitle>
                    <input
                        type="text"
                        placeholder="Search conversations..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white text-sm focus:outline-none focus:border-primary"
                    />
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-120px)] p-4">
                    <div className="space-y-2">
                        {isLoading ? (
                            <div className="text-center text-gray-400">Loading...</div>
                        ) : filteredSessions.length === 0 ? (
                            <div className="text-center text-gray-400">No conversations found</div>
                        ) : (
                            filteredSessions.map((session) => (
                                <div
                                    key={session.id}
                                    onClick={() => onSessionSelect(session.id)}
                                    className={cn(
                                        "p-3 rounded-lg border border-gray-800 cursor-pointer transition-all duration-200",
                                        "hover:bg-gray-900 hover:border-gray-700",
                                        currentSessionId === session.id && "bg-gray-900 border-primary"
                                    )}
                                >
                                    <div className="flex justify-between items-start gap-2">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-medium text-white truncate">
                                                {session.title}
                                            </h3>
                                            <div className="flex items-center gap-2 mt-1 text-sm text-gray-400">
                                                <Clock className="h-3 w-3" />
                                                <span>{formatDate(session.created_at)}</span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Badge variant="secondary" className="bg-gray-800">
                                                    <MessageCircle className="h-3 w-3 mr-1" />
                                                    {session.message_count} messages
                                                </Badge>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-gray-400 hover:text-red-400"
                                            onClick={(e) => handleDeleteSession(session.id, e)}
                                            disabled={isLoading}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    {session.files && session.files.length > 0 && (
                                        <>
                                            <Separator className="my-2 bg-gray-800" />
                                            <div className="space-y-1">
                                                {session.files.map((file) => (
                                                    <div
                                                        key={file.id}
                                                        className="flex items-center justify-between text-sm text-gray-400 p-1 rounded hover:bg-gray-800"
                                                    >
                                                        <div className="flex items-center gap-2 truncate">
                                                            <FileText className="h-3 w-3 flex-shrink-0" />
                                                            <span className="truncate">{file.file_name}</span>
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6 text-gray-400 hover:text-primary"
                                                            onClick={(e) => handleDownloadFile(file.file_path, file.file_name, e)}
                                                        >
                                                            <Download className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
};

export default Sidebar;