"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { Send, Paperclip, Clock, AlertTriangle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { analyzeTextForSafety } from "@/app/actions";
import type { AnalyzeCommunicationOutput } from "@/ai/flows/context-aware-safety-tool";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type MessageInputProps = {
  onSendMessage: (content: string) => void;
};

export default function MessageInput({ onSendMessage }: MessageInputProps) {
  const [text, setText] = useState("");
  const [debouncedText, setDebouncedText] = useState("");
  const [analysis, setAnalysis] = useState<AnalyzeCommunicationOutput | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedText(text);
    }, 500);

    return () => clearTimeout(handler);
  }, [text]);

  useEffect(() => {
    if (debouncedText.trim()) {
      startTransition(async () => {
        const result = await analyzeTextForSafety(debouncedText);
        if (result && (result.isFraudPhishingScamLikely || result.isSensitiveDataDetected)) {
            setAnalysis(result);
        } else {
            setAnalysis(null);
        }
      });
    } else {
      setAnalysis(null);
    }
  }, [debouncedText]);
  
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    if(textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSendMessage(text.trim());
      setText("");
      setAnalysis(null);
      if(textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  const handleSelfDestructClick = () => {
    toast({
      title: "Self-Destructing Messages",
      description: "This feature is for demonstration and is not yet implemented.",
    });
  };

  const handleAttachClick = () => {
    toast({
      title: "File attachments",
      description: "This feature is for demonstration and is not yet implemented.",
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {analysis && (
        <Alert variant="destructive" className="mb-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Potential Risk Detected</AlertTitle>
          <AlertDescription>{analysis.advice}</AlertDescription>
        </Alert>
      )}
      <div className="flex items-end gap-2">
        <Textarea
          ref={textareaRef}
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Type an encrypted message..."
          className="flex-1 resize-none bg-muted border-border max-h-40 overflow-y-auto"
          rows={1}
        />
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" type="button" onClick={handleAttachClick}>
                <Paperclip className="h-5 w-5" />
                <span className="sr-only">Attach file</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Attach file</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" type="button" onClick={handleSelfDestructClick}>
                        <Clock className="h-5 w-5" />
                        <span className="sr-only">Self-destructing message</span>
                    </Button>
                </TooltipTrigger>
                <TooltipContent><p>Self-destructing message</p></TooltipContent>
            </Tooltip>
        </TooltipProvider>

        <Button type="submit" size="icon" disabled={!text.trim() || isPending}>
          <Send className="h-5 w-5" />
          <span className="sr-only">Send message</span>
        </Button>
      </div>
    </form>
  );
}
