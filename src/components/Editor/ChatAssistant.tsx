import { useState, useRef, useEffect } from "react";
import { Send, Mic, MicOff, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  command?: EditingCommand;
}

interface EditingCommand {
  action: string;
  parameters: Record<string, any>;
  status: 'processing' | 'completed' | 'failed';
}

interface ChatAssistantProps {
  onCommand: (command: EditingCommand) => void;
  projectData: any;
}

const ChatAssistant = ({ onCommand, projectData }: ChatAssistantProps) => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: "Hi! I'm your editing assistant. Try commands like:\n• \"Cut boring parts\"\n• \"Add captions in Drake style\"\n• \"Turn this into a meme\"\n• \"Remove silent sections\"\n• \"Add trending music\"",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const predefinedCommands = [
    "Cut boring parts",
    "Add captions in Drake style", 
    "Turn this into a meme",
    "Remove silent sections",
    "Add viral transitions",
    "Make it TikTok ready"
  ];

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isProcessing) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: content.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke('chat-editing-assistant', {
        body: {
          message: content.trim(),
          projectData,
          context: messages.slice(-5)
        }
      });

      if (error) throw error;

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: data.response,
        timestamp: new Date(),
        command: data.command
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (data.command) {
        onCommand(data.command);
        toast({
          title: "Command Executed",
          description: `${data.command.action} has been applied to your video.`,
        });
      }

    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: "Sorry, I couldn't process that command. Please try rephrasing or use one of the suggested commands.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: "Command Failed",
        description: "There was an error processing your request.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const startVoiceRecognition = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast({
        title: "Voice Not Supported",
        description: "Speech recognition is not supported in this browser.",
        variant: "destructive"
      });
      return;
    }

    const SpeechRecognitionClass = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognitionClass();
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      toast({
        title: "Voice Recognition Error",
        description: "Failed to recognize speech. Please try again.",
        variant: "destructive"
      });
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-neon-purple" />
          AI Editor Assistant
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col gap-4 p-4 pt-0">
        {/* Quick Commands */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">Quick Commands:</p>
          <div className="flex flex-wrap gap-1">
            {predefinedCommands.map((command) => (
              <Badge
                key={command}
                variant="secondary"
                className="cursor-pointer hover:bg-neon-purple/20 hover:border-neon-purple text-xs"
                onClick={() => sendMessage(command)}
              >
                {command}
              </Badge>
            ))}
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 pr-4" ref={scrollAreaRef}>
          <div className="space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.type === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-neon-purple/20 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-neon-purple" />
                  </div>
                )}
                
                <div className={`max-w-[80%] space-y-2`}>
                  <div
                    className={`p-3 rounded-lg text-sm ${
                      message.type === 'user'
                        ? 'bg-neon-purple text-white ml-auto'
                        : 'bg-muted text-foreground'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                  
                  {message.command && (
                    <div className="text-xs">
                      <Badge 
                        variant={message.command.status === 'completed' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {message.command.action} - {message.command.status}
                      </Badge>
                    </div>
                  )}
                </div>

                {message.type === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-neon-green/20 flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-neon-green" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your editing command..."
              disabled={isProcessing}
              className="pr-10"
            />
            <Button
              variant="ghost"
              size="icon"
              className={`absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 ${
                isListening ? 'text-red-500' : 'text-muted-foreground'
              }`}
              onClick={startVoiceRecognition}
              disabled={isProcessing}
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
          </div>
          
          <Button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isProcessing}
            size="icon"
            className="bg-neon-purple hover:bg-neon-purple/90"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {isProcessing && (
          <div className="text-center">
            <Badge variant="secondary" className="animate-pulse">
              Processing command...
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ChatAssistant;