'use client';

import { useState, useEffect, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Send,
  Clock,
  AlertTriangle,
  Mic,
  Plus,
  FileText,
  ImageIcon,
  Video,
  Music,
  FileArchive,
  FileCode,
  Camera as CameraIcon,
  Smile,
  X,
  MessageSquareQuote,
  Pencil,
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { analyzeTextForSafety } from '@/app/actions';
import type { AnalyzeCommunicationOutput } from '@/ai/flows/context-aware-safety-tool';
import { useToast } from '@/hooks/use-toast';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { currentUser } from '@/lib/data';
import type { Message } from '@/lib/types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

type MessageInputProps = {
  onSendMessage: (content: string, quotedMessage?: Message['quotedMessage']) => void;
  quotedMessage?: Message['quotedMessage'];
  onClearQuote: () => void;
  isEditing: boolean;
  editingMessage: Message | null;
  onStopEditing: () => void;
};

export default function MessageInput({
  onSendMessage,
  quotedMessage,
  onClearQuote,
  isEditing,
  editingMessage,
  onStopEditing,
}: MessageInputProps) {
  const [text, setText] = useState('');
  const [debouncedText, setDebouncedText] = useState('');
  const [analysis, setAnalysis] =
    useState<AnalyzeCommunicationOutput | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isEmojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const { toast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (isEditing && editingMessage) {
      setText(editingMessage.content);
      textareaRef.current?.focus();
    } else {
      setText('');
    }
  }, [isEditing, editingMessage]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedText(text);
    }, 500);

    return () => clearTimeout(handler);
  }, [text]);

  useEffect(() => {
    if (debouncedText.trim() && !isEditing) {
      startTransition(async () => {
        const result = await analyzeTextForSafety(debouncedText);
        if (
          result &&
          (result.isFraudPhishingScamLikely || result.isSensitiveDataDetected)
        ) {
          setAnalysis(result);
        } else {
          setAnalysis(null);
        }
      });
    } else {
      setAnalysis(null);
    }
  }, [debouncedText, isEditing]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSendMessage(text.trim(), quotedMessage);
      setText('');
      setAnalysis(null);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
    if (e.key === 'Escape') {
      if (isEditing) {
        onStopEditing();
      } else if (quotedMessage) {
        onClearQuote();
      }
    }
  };
  

  const handleFeatureNotImplemented = (featureName: string) => {
    toast({
      title: `${featureName}`,
      description: 'This feature is for demonstration and is not yet implemented.',
    });
  };

  const handleEmojiSelect = (emoji: string) => {
    const cursorPosition = textareaRef.current?.selectionStart || 0;
    const newText = text.slice(0, cursorPosition) + emoji + text.slice(cursorPosition);
    setText(newText);
    
    setTimeout(() => {
        textareaRef.current?.focus();
        textareaRef.current?.setSelectionRange(cursorPosition + emoji.length, cursorPosition + emoji.length);
    }, 0);
  };

  const AttachmentButton = ({
    icon: Icon,
    label,
    formats,
    action,
  }: {
    icon: React.ElementType;
    label: string;
    formats?: string;
    action?: () => void;
  }) => (
    <Button
      variant="ghost"
      className="w-full justify-start h-auto py-3"
      onClick={action ? action : () => handleFeatureNotImplemented(label)}
    >
      <div className="flex items-center gap-4">
        <Icon className="h-6 w-6 text-primary" />
        <div className="text-left">
          <p className="font-semibold">{label}</p>
          {formats && (
            <p className="text-xs text-muted-foreground">{formats}</p>
          )}
        </div>
      </div>
    </Button>
  );
  
  const EmojiPicker = () => {
    const categories = {
        '😊': { name: 'Smileys', emojis: '😀 😃 😄 😁 😆 😅 😂 🤣 ☺️ 😊 😇 🙂 🙃 😉 😌 😍 😘 😗 😙 😚 😋 😜 😝 😛 🤑 🤗 🤓 😎 🤡 🤠 😏 😒 😞 😔 😟 😕 🙁 ☹️ 😣 😖 😫 😩 😤 😠 😡 😶 😐 😑 😯 😦 😧 😮 😲 😵 😳 😱 😨 😰 😢 😥 🤤 😭 😓 😪 😴 🙄 🤔 🤥 😬 🤐 🤢 🤮 🤧 😷 🤒 🤕 🤨 🤩 🤯 🧐 🤫 🤪 🥺 🤭 🥱 🥳 🥴 🥶 🥲 🥸 🫠 🫤 🫥 🫢 🫣 🫡 🥹 🥵 😈 👿 🤬 👹 👺 💩 👻 💀 ☠️ 👽 👾 🤖 🎃 😺 😸 😹 😻 😼 😽 😿 😾 🙀'.split(' ') },
        '👋': { name: 'People, Hands & Body Parts', emojis: '👐 🙌 👏 🙏 🤝 👍 👎 👊 ✊ 🤛 🤜 🤞 ✌️ 🤘 👌 👈 👉 👆 👇 ☝️ ✋ 🤚 🖐️ 🖖 👋 🤙 💪 🖕 🤟 🤲 ✍️ 🤳 💅 💋 👄 👅 👂 👃 👣 👁 🧠 🦷 🦴 👀 🗣 👤 👥 👶 👦 👧 👨 👩 👱‍♀️ 👱 👴 👵 🧔 👨‍🦰 🧕 👲 👳‍♀️ 👳 👮‍♀️ 👮 👷‍♀️ 👷 💂‍♀️ 💂 🕵️‍♀️ 🕵️ 👩‍⚕️ 👨‍⚕️ 👩‍🌾 👨‍🌾 👩‍🍳 👨‍🍳 👩‍🎓 👨‍🎓 👩‍🎤 👨‍🎤 👩‍🏫 👨‍🏫 👩‍🏭 👨‍🏭 👩‍💻 👨‍💻 👩‍💼 👨‍💼 👩‍🔧 👨‍🔧 👩‍🔬 👨‍🔬 👩‍🎨 👨‍🎨 👩‍🚒 👨‍🚒 👩‍✈️ 👨‍✈️ 👩‍🚀 👨‍🚀 🧟 🧛 🧛‍♀️ 🧚 🧚‍♂️ 🤶 🎅 👸 🤴 👰 🤵 👼 🤰 🧘 🧘‍♂️ 🙇‍♀️ 🙇 💁 💁‍♂️ 🙅 🙅‍♂️ 🙆 🙆‍♂️ 🙋 🙋‍♂️ 🤦‍♀️ 🤦‍♂️ 🤷‍♀️ 🤷‍♂️ 🙎 🙎‍♂️ 🙍 🙍‍♂️ 💇 💇‍♂️ 💆 💆‍♂️ 🕴 💃 🕺 👯 👯‍♂️ 🚶‍♀️ 🚶 🏃‍♀️ 🏃 👫 👭 👬 💑 👩‍❤️‍👩 👨‍❤️‍👨 💏 👩‍❤️‍💋‍👩 👨‍❤️‍💋‍👨 👪 👨‍👩‍👧 👨‍👩‍👧‍👦 👨‍👩‍👦‍👦 👨‍👩‍👧‍👧 👩‍👩‍👦 👩‍👩‍👧 👩‍👩‍👧‍👦 👩‍👩‍👦‍👦 👩‍👩‍👧‍👧 👨‍👨‍👦 👨‍👨‍👧 👨‍👨‍👧‍👦 👨‍👨‍👦‍👦 👨‍👨‍👧‍👧 👩‍👦 👩‍👧 👩‍👧‍👦 👩‍👦‍👦 👩‍👧‍👧 👨‍👦 👨‍👧 👨‍👧‍👦 👨‍👦‍👦 👨‍👧‍👧'.split(' ') },
        '🐻': { name: 'Nature, Plants & Animals', emojis: '🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐽 🐸 🐵 🙈 🙉 🙊 🐒 🐔 🦜 🐧 🐦 🐤 🐣 🐥 🦆 🦢 🦅 🦚 🦉 🦇 🐺 🐗 🐴 🦄 🐝 🐛 🦋 🐌 🐚 🐞 🐜 🦟 🕷️ 🕸️ 🐢 🐍 🪱 🦎 🦂 🦀 🦑 🐙 🦐 🦞 🐠 🐟 🐡 🐬 🦈 🐳 🐋 🐊 🐆 🐅 🦛 🐃 🐂 🐄 🦌 🐪 🐫 🦘 🐘 🦏 🦍 🐎 🦙 🐖 🐐 🐏 🐑 🐕 🐩 🐈 🐓 🦃 🕊️ 🪶 🐇 🐁 🐀 🐿️ 🐾 🐉 🐲 🦖 🦕 🦒 🦔 🦓 🦗 🦧 🦮 🦥 🦦 🦡 🦨 🦩 🌵 🎄 🌲 🌳 🌴 🌱 🌿 ☘️ 🍀 🎍 🎋 🍃 🍂 🍁 🍄 🌾 💐 🌷 🌹 🥀 🌻 🌼 🌸 🌺 🌎 🌍 🌏 🌕 🌖 🌗 🌘 🌑 🌒 🌓 🌔 🌚 🌝 🌞 🌛 🌜 🌙 💫 ⭐️ 🌟 ✨ ⚡️ 🔥 💥 ☄️ 🛸 ☀️ 🌤️ ⛅️ 🌥️ 🌦️ 🌈 ☁️ 🌧️ ⛈️ 🌩️ 🌨️ ☃️ ⛄️ ❄️ 🌬️ 💨 🌪️ 🌫️ 🌊 💧 💦 ☔️'.split(' ') },
        '🍔': { name: 'Food & Drink', emojis: '🍏 🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🍈 🍒 🍑 🍍 🥝 🥭 🥑 🍅 🍆 🥒 🥕 🥬 🌽 🌶️ 🥔 🍠 🌰 🥜 🍯 🥐 🍞 🥖 🥨 🥯 🧀 🥚 🍳 🥓 🧄 🧅 🥞 🧇 🍤 🍗 🍖 🍕 🌭 🍔 🍟 🥙 🌮 🌯 🥗 🥘 🍝 🍜 🦪 🍲 🍥 🍣 🍱 🍛 🍚 🧆 🍙 🍘 🍢 🍡 🍧 🍨 🍦 🍰 🎂 🍮 🍭 🍬 🍫 🍿 🍩 🍪 🥮 🧁 🥛 🧈 🍼 ☕️ 🍵 🍶 🍺 🍻 🥂 🍷 🥃 🍸 🍹 🍾 🧉 🧃 🧊 🧂 🥄 🍴 🍽️'.split(' ') },
        '⚽': { name: 'Activities, Sports & Music', emojis: '⚽️ 🏀 🏈 ⚾️ 🎾 🏐 🏉 🎱 🏓 🏸 🥏 🥅 🏒 🏑 🏏 ⛳️ 🏹 🎣 🥊 🥋 🛹 ⛸️ 🎿 ⛷️ 🏂 🏋️‍♀️ 🏋️ 🤺 🤼‍♀️ 🤼‍♂️ 🤸‍♀️ 🤸‍♂️ ⛹️‍♀️ ⛹️ 🤾‍♀️ 🤾‍♂️ 🏌️‍♀️ 🏌️ 🏄‍♀️ 🏄 🏊‍♀️ 🏊 🤽‍♀️ 🤽‍♂️ 🚣‍♀️ 🚣 🤿 🏇 🚴‍♀️ 🚴 🚵‍♀️ 🚵 🎽 🏅 🎖 🥇 🥈 🥉 🏆 🌺 🎗️ 🎫 🎟 🎪 🤹‍♀️ 🤹‍♂️ 🎭 🎨 🎬 🎤 🎧 🎼 🎹 🥁 🎷 🎺 🎸 🎻 🪕 🎲 🎯 🎳 🪀 🪁 🎮 🎰'.split(' ') },
        '🚗': { name: 'Travel, Transport & Places', emojis: '🚗 🚕 🚙 🚌 🚎 🏎️ 🚓 🚑 🚒 🚐 🚚 🚛 🚜 🛴 🚲 🛵 🏍️ 🛺 🚨 🚔 🚍 🚘 🚖 🚡 🚠 🚟 🚃 🚋 🚞 🚝 🚄 🚅 🚈 🚂 🚆 🚇 🚊 🚉 🚁 🛩️ ✈️ 🛫 🛬 🪂 🚀 🛰️ 🛸 💺 🛶 ⛵️ 🛥️ 🚤 🛳️ ⛴️ 🚢 ⚓️ 🚧 ⛽️ 🚏 🚦 🚥 🗺️ 🗿 🗽 ⛲️ 🗼 🏰 🏯 🏟️ 🎡 🎢 🎠 ⛱️ 🏖️ 🏝️ ⛰️ 🏔️ 🗻 🌋 🏜️ 🏕️ ⛺️ 🛤️ 🛣️ 🏗️ 🏭 🏠 🏡 🏘️ 🏚️ 🏢 🏬 🏣 🏤 🏥 🏦 🏨 🏪 🏫 🏩 💒 🏛️ ⛪️ 🕌 🕍 🛕 🕋 ⛩️ 🗾 🎑 🏞️ 🌅 🌄 🌠 🎇 🎆 🌇 🌆 🏙 🌃 🌌 🪐 🌉 🌁'.split(' ') },
        '💡': { name: 'Objects', emojis: '⌚️ 📱 📲 💻 ⌨️ 🖥️ 🖨️ 🖱️ 🖲️ 🕹️ 🗜️ 💽 💾 💿 📀 📼 📷 📸 📹 🎥 📽️ 🎞️ 📞 ☎️ ⚖️ ️📟 📠 📺 📻 🎙️ 🎚️ 🎛️ ⏱️ ⏲ ⏰ 🕰️ ⌛️ ⏳ 🧭 📡 🔋 🔌 💡 🔦 🕯️ 🗑️ 🛢️ 💸 💵 💴 💶 💷 💰 💳 💎 🧿 ⚖️ 🔧 🔨 ⚒️ 🛠️ ⛏️ 🪓 🧯 🧹 🧽 🧼 🧺 🔩 ⚙️ ⛓️ 🔫 🪁 💣 🧨 🪒 🔪 🗡️ ⚔️ 🛡️ 🎖️ 🚬 ⚰️ ⚱️ 🏺 🪦 🪔 🔮 📿 💈 ⚗️ 🔭 🔬 🕳️ 🦯 🩺 💊 💉 🩸 🩹 🦠 🧴 🧫 🧬 🌡️ 🚽 🧻 🚰 🚿 🛁 🛀 🛎️ 🔑 🗝️ 🚪 🛋️ 🛏️ 🛌 🪑 🖼️ 🛍️ 🛒 🎁 🎈 🎏 🎀 🎊 🎉 🎎 🏮 🎐 ✉️ 📩 📨 📧 💌 📥 📤 📦 🏷️ 📪 📫 📬 📭 📮 📯 📜 📃 📄 📑 📊 📈 📉 🗒️ 🗓 📆 📅 📇 🗃️ 🗳️ 🗄️ 📋 📁 📂 🗂️ 🗞️ 📰 📓 📔 📒 📕 📗 📘 📙 📚 📖 🧧 🔖 🔗 📎 🖇️ 🧲 📐 📏 📌 📍 🎌 🏳️ 🏴 🏁 🏳️‍🌈 ✂️ 🎨 ✏️ 🖊️ 🖋️ ✒️ 🖌️ 🖍️ 📝 🔍 🔎 🔏 🔐 🔒 🔓 💄 👚 👕 👖 👔 👗 👙 👘 👠 👡 👢 👞 👟 👒 🎩 🎓 👑 ⛑ 🎒 🧳 👝 👛 👜 💼 👓 🕶️ 🌂 ☂️ 🪶 🧷'.split(' ') },
        '❤️': { name: 'Symbols', emojis: '❤️ 💛 💚 💙 💜 🖤 🤎 🤍 🧡 💔 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟 ♾️  ♐️ ♑️ ♒️ ♓️ 🆔 ⚛️ 🈳 🉑 ☢️ ☣️🅾️ 🆘 🚼 ❌ ⭕️ 🛑 ⛔️ 📛 🚫 💯 💮 💢 ♨️ 🚷 🚯 🚳 🚱 🔞 📵 🚭 ❗️ ❕ ❓ ❔ ‼️ ⁉️ 🔅 🔆 〽️ ⚠️ 🚸 🔱 ⚜️ 🔰 ♻️ ✅ 🈯️ 💹 ❇️ ✳️ ❎ 🌐 💠 Ⓜ️ 🌀 💤 🏧 🚾 ♿️ 🅿️ 🈂️ 🛂 🛃 🛄 🛅 🚹 🚺 🚻 🚮 ➿ 🎦 📶 🈁 🔣 ℹ️ 🔤 🔡 🔠 🆖 🆗 🆙 🆒 🆕 🆓 0️⃣ 1️⃣ 2️⃣ 3️⃣ 4️⃣ 5️⃣ 6️⃣ 7️⃣ 8️⃣ 9️⃣ 🔟 🔢 #️⃣ *️⃣ ▶️ ⏸ ⏯ ⏹ ⏺ ⏭ ⏮ ⏩ ⏪ ⏫ ⏬ ◀️ 🔼 🔽 ➡️ ⬅️ ⬆️ ⬇️ ↗️ ↘️ ↙️ ↖️ ↪️ ↩️ ⤴️ ⤵️ 🔀 🔁 🔂 🔄 🔃 🔚 🕖 🕗 🕘 🕙 🕚 🕛 🕜 🕝 🕞 🕟 🕠 🕡 🕢 🕣 🕤 🕥 🕦 🕧'.split(' ') },
        '🏁': { name: 'Flags', emojis: '🏳️ 🏴 🏁 🚩 🎌 🇺🇳 🇪🇺 🇺🇸 🇩🇪 🇫🇷 🇬🇧 🇮🇹 🇪🇸 🇯🇵'.split(' ') },
    };
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState('😊');
    const [recentlyUsed, setRecentlyUsed] = useState(['😂', '❤️', '👍', '🤔', '🎉']);

    return (
        <div className="h-[45vh] bg-muted/80 backdrop-blur-sm border-t border-border rounded-t-lg flex flex-col">
             <div className="flex items-center justify-between p-2 border-b border-border">
                <div className="flex items-center gap-2 overflow-x-auto">
                    {Object.entries(categories).map(([icon, {name}]) => (
                         <TooltipProvider key={name}>
                             <Tooltip>
                                 <TooltipTrigger asChild>
                                     <Button variant={activeCategory === icon ? 'secondary': 'ghost'} size="icon" className="h-8 w-8" onClick={() => setActiveCategory(icon)}>
                                        {icon}
                                    </Button>
                                 </TooltipTrigger>
                                 <TooltipContent>
                                     <p>{name}</p>
                                 </TooltipContent>
                             </Tooltip>
                         </TooltipProvider>
                    ))}
                </div>
                 <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEmojiPickerOpen(false)}>
                    <X className="h-5 w-5" />
                </Button>
            </div>
            <div className="p-2">
                <input type="text" placeholder="Emoji suchen..." className="w-full bg-background/50 border border-border rounded-md px-3 py-1.5 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="flex-1 overflow-y-auto p-2 grid grid-cols-8 gap-2">
                {(categories[activeCategory as keyof typeof categories]?.emojis || []).filter(e => e.includes(search)).map((emoji, index) => (
                    <button key={`${emoji}-${index}`} onClick={() => {
                        handleEmojiSelect(emoji);
                        const newRecent = [emoji, ...recentlyUsed.filter(r => r !== emoji)];
                        setRecentlyUsed(Array.from(new Set(newRecent)).slice(0, 8));
                    }} className="text-2xl hover:bg-black/20 rounded-md transition-colors aspect-square flex items-center justify-center">
                        {emoji}
                    </button>
                ))}
            </div>
             <div className="p-2 border-t border-border">
                <p className="text-xs text-muted-foreground mb-1">Zuletzt verwendet</p>
                <div className="flex gap-2">
                     {recentlyUsed.map((emoji, index) => (
                        <button key={`recent-${emoji}-${index}`} onClick={() => handleEmojiSelect(emoji)} className="text-2xl hover:bg-black/20 rounded-md transition-colors p-1">
                            {emoji}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
  }

  return (
    <div className="relative">
      {isEditing && editingMessage && (
        <div className="p-2 bg-muted rounded-t-lg text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Pencil className="w-4 h-4 text-primary" />
            <div>
              <p className="font-semibold text-primary">Nachricht bearbeiten</p>
              <p className="text-muted-foreground truncate max-w-xs">{editingMessage.content}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onStopEditing} className="h-7 w-7">
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      {quotedMessage && (
        <div className="p-2 bg-muted rounded-t-lg text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquareQuote className="w-4 h-4 text-primary" />
            <div>
              <p className="font-semibold text-primary">Antwort an {quotedMessage.senderName}</p>
              <p className="text-muted-foreground truncate max-w-xs">{quotedMessage.content}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClearQuote} className="h-7 w-7">
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-2">
        {analysis && (
          <Alert variant="destructive" className="mb-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Potential Risk Detected</AlertTitle>
            <AlertDescription>{analysis.advice}</AlertDescription>
          </Alert>
        )}
        <div className={cn("flex items-end gap-2 p-2 bg-background", !quotedMessage && !isEditing ? "rounded-lg" : "rounded-b-lg")}>
           <Button
            variant="ghost"
            size="icon"
            type="button"
            onClick={() => router.push('/status/camera')}
            className="shrink-0"
          >
            <CameraIcon className="h-5 w-5" />
            <span className="sr-only">Open camera</span>
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                type="button"
                className="shrink-0"
              >
                <Plus className="h-5 w-5" />
                <span className="sr-only">Attach file</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-2 mb-2">
              <div className="grid grid-cols-1 gap-1">
                <AttachmentButton
                  icon={ImageIcon}
                  label="Image from Gallery"
                  action={() => handleFeatureNotImplemented('Image from Gallery')}
                />
                <AttachmentButton
                  icon={Video}
                  label="Video from Gallery"
                  action={() => handleFeatureNotImplemented('Video from Gallery')}
                />
                <hr className="my-2 border-border" />
                <AttachmentButton
                  icon={FileText}
                  label="Document"
                  formats=".pdf, .doc, .xls, .ppt, .txt..."
                />
                <AttachmentButton
                  icon={Music}
                  label="Audio"
                  formats=".mp3, .wav, .aac, .ogg..."
                />
                <AttachmentButton
                  icon={FileArchive}
                  label="Compressed"
                  formats=".zip, .rar, .7z"
                />
                <AttachmentButton
                  icon={FileCode}
                  label="Other"
                  formats=".html, .csv, .apk..."
                />
              </div>
            </PopoverContent>
          </Popover>
          
          <Button
            variant="ghost"
            size="icon"
            type="button"
            onClick={() => setEmojiPickerOpen(!isEmojiPickerOpen)}
            className="shrink-0"
          >
            <Smile className="h-5 w-5" />
            <span className="sr-only">Open emoji picker</span>
          </Button>

          <Textarea
            ref={textareaRef}
            value={text}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Type an encrypted message..."
            className="flex-1 resize-none bg-muted border-0 focus-visible:ring-0 max-h-40 overflow-y-auto"
            rows={1}
          />
          

          {text ? (
            <Button
              type="submit"
              size="icon"
              disabled={!text.trim() || isPending}
              className="shrink-0"
            >
              <Send className="h-5 w-5" />
              <span className="sr-only">{isEditing ? 'Save changes' : 'Send message'}</span>
            </Button>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    onClick={() => handleFeatureNotImplemented('Voice messages')}
                    className="shrink-0"
                  >
                    <Mic className="h-5 w-5 text-primary" />
                    <span className="sr-only">Record voice message</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Record voice message</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  onClick={() =>
                    handleFeatureNotImplemented('Self-destructing messages')
                  }
                  className="shrink-0"
                >
                  <Clock className="h-5 w-5" />
                  <span className="sr-only">Self-destructing message</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Self-destructing message</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </form>
      {isEmojiPickerOpen && 
          <div className="absolute bottom-full w-full">
            <EmojiPicker />
          </div>
      }
    </div>
  );
}
