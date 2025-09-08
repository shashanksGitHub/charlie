import React, { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

const emojis = [
  "😀", "😁", "😂", "🤣", "😃", "😄", "😅", "😆", "😉", "😊", 
  "😋", "😎", "😍", "😘", "🥰", "😗", "😙", "😚", "🙂", "🤗",
  "🤩", "🤔", "🤨", "😐", "😑", "😶", "🙄", "😏", "😣", "😥",
  "😮", "🤐", "😯", "😪", "😫", "😴", "😌", "😛", "😜", "😝",
  "🤤", "😒", "😓", "😔", "😕", "🙃", "🤑", "😲", "☹️", "🙁",
  "😖", "😞", "😟", "😤", "😢", "😭", "😦", "😧", "😨", "😩",
  "🤯", "😬", "😰", "😱", "🥵", "🥶", "😳", "🤪", "😵", "😡",
  "😠", "🤬", "😷", "🤒", "🤕", "🤢", "🤮", "🤧", "😇", "🥳",
  "🥴", "🥺", "🤫", "🤭", "🧐", "🤠", "🥸", "🤓", "😈", "👿",
  "👹", "👺", "💀", "👻", "👽", "🤖", "💩", "😺", "😸", "😹",
  "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "❣️",
  "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "👍", "👎",
  "👊", "✊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🤝", "🙏",
  "✌️", "🤞", "🤟", "🤘", "👌", "🤌", "🤏", "👈", "👉", "👆"
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
}

const EmojiPicker: React.FC<EmojiPickerProps> = ({ onSelect }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [recentEmojis, setRecentEmojis] = useState<string[]>([]);
  
  // Filter emojis based on search term
  const filteredEmojis = searchTerm
    ? emojis.filter(emoji => emoji.includes(searchTerm))
    : emojis;
  
  const handleSelect = (emoji: string) => {
    onSelect(emoji);
    
    // Update recent emojis
    setRecentEmojis(prev => {
      const newRecent = prev.filter(e => e !== emoji);
      return [emoji, ...newRecent].slice(0, 10);
    });
  };
  
  return (
    <div className="w-full max-w-[320px] p-2">
      <div className="mb-2">
        <input
          type="text"
          placeholder="Search emojis"
          className="w-full px-2 py-1 text-sm border rounded bg-background border-border"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      {recentEmojis.length > 0 && (
        <div className="mb-2">
          <h3 className="text-xs font-medium mb-1 text-muted-foreground">Recently Used</h3>
          <div className="grid grid-cols-8 gap-1">
            {recentEmojis.map((emoji, i) => (
              <button
                key={i}
                className="text-base h-8 w-8 rounded hover:bg-accent flex items-center justify-center"
                onClick={() => handleSelect(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
      
      <ScrollArea className="h-64 overflow-y-auto pr-2">
        <div className="grid grid-cols-8 gap-1">
          {filteredEmojis.map((emoji, i) => (
            <button
              key={i}
              className="text-base h-8 w-8 rounded hover:bg-accent flex items-center justify-center"
              onClick={() => handleSelect(emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default EmojiPicker;