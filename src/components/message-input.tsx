"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { Send, Clock, AlertTriangle, Mic, Plus, FileText, ImageIcon, Video, Music, FileArchive, FileCode, Camera as CameraIcon, Video as VideoIcon } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { analyzeTextForSafety } from "@/app/actions";
import type { AnalyzeCommunicationOutput } from "@/ai/flows/context-aware-safety-tool";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";


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
  const router = useRouter();


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

  const handleFeatureNotImplemented = (featureName: string) => {
    toast({
      title: `${featureName}`,
      description: "This feature is for demonstration and is not yet implemented.",
    });
  };
  
  const AttachmentButton = ({ icon: Icon, label, formats, action }: { icon: React.ElementType, label: string, formats?: string, action?: () => void }) => (
    <Button variant="ghost" className="w-full justify-start h-auto py-3" onClick={action ? action : () => handleFeatureNotImplemented(label)}>
      <div className="flex items-center gap-4">
        <Icon className="h-6 w-6 text-primary" />
        <div className="text-left">
          <p className="font-semibold">{label}</p>
          {formats && <p className="text-xs text-muted-foreground">{formats}</p>}
        </div>
      </div>
    </Button>
  );

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
         <Popover>
          <PopoverTrigger asChild>
             <Button variant="ghost" size="icon" type="button" className="shrink-0">
                <Plus className="h-5 w-5" />
                <span className="sr-only">Attach file</span>
              </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-2">
            <div className="grid grid-cols-1 gap-1">
                <AttachmentButton icon={CameraIcon} label="Camera" action={() => router.push('/status/camera')} />
                <AttachmentButton icon={VideoIcon} label="Video" action={() => router.push('/status/camera')} />
                <hr className="my-2 border-border"/>
               <AttachmentButton icon={FileText} label="Document" formats=".pdf, .doc, .xls, .ppt, .txt..." />
               <AttachmentButton icon={ImageIcon} label="Image" formats=".jpg, .png, .gif, .webp" />
               <AttachmentButton icon={Video} label="Video" formats=".mp4, .mkv, .avi, .mov..." />
               <AttachmentButton icon={Music} label="Audio" formats=".mp3, .wav, .aac, .ogg..." />
               <AttachmentButton icon={FileArchive} label="Compressed" formats=".zip, .rar, .7z" />
               <AttachmentButton icon={FileCode} label="Other" formats=".html, .csv, .apk..." />
            </div>
          </PopoverContent>
        </Popover>
        <Textarea
          ref={textareaRef}
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Type an encrypted message..."
          className="flex-1 resize-none bg-muted border-border max-h-40 overflow-y-auto"
          rows={1}
        />
        
        {text ? (
            <Button type="submit" size="icon" disabled={!text.trim() || isPending} className="shrink-0">
                <Send className="h-5 w-5" />
                <span className="sr-only">Send message</span>
            </Button>
        ) : (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" type="button" onClick={() => handleFeatureNotImplemented('Voice messages')} className="shrink-0">
                            <Mic className="h-5 w-5 text-primary" />
                            <span className="sr-only">Record voice message</span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Record voice message</p></TooltipContent>
                </Tooltip>
            </TooltipProvider>
        )}

        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" type="button" onClick={() => handleFeatureNotImplemented('Self-destructing messages')} className="shrink-0">
                        <Clock className="h-5 w-5" />
                        <span className="sr-only">Self-destructing message</span>
                    </Button>
                </TooltipTrigger>
                <TooltipContent><p>Self-destructing message</p></TooltipContent>
            </Tooltip>
        </TooltipProvider>
      </div>
    </form>
  );
}
