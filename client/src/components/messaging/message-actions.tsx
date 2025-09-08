import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  MoreVertical,
  Reply,
  Copy,
  Trash2,
  Smile,
  MoreHorizontal,
  X,
  Heart,
  ThumbsUp,
  Laugh,
  Angry,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

import EmojiPicker from "@/components/ui/emoji-picker";
import { Button } from "@/components/ui/button";
import { useDarkMode } from "@/hooks/use-dark-mode";

interface MessageActionsProps {
  messageId: number;
  messageContent: string;
  isCurrentUser: boolean;
  onReply: (messageId: number, content: string) => void;
  onCopy: (content: string) => void;
  onUnsend: (messageId: number) => void;
  onDelete?: (messageId: number) => void;
  onEmojiReact: (messageId: number, emoji: string) => void;
  className?: string;
}

const quickEmojis = ["❤️", "👍", "😂", "😮"];

export function MessageActions({
  messageId,
  messageContent,
  isCurrentUser,
  onReply,
  onCopy,
  onUnsend,
  onDelete,
  onEmojiReact,
  className = "",
}: MessageActionsProps) {
  const { isDarkMode } = useDarkMode();
  const [showQuickEmojis, setShowQuickEmojis] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [emojiPosition, setEmojiPosition] = useState<'left' | 'right' | 'center'>('left');
  const quickEmojiTimeoutRef = useRef<NodeJS.Timeout>();
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle quick emoji selection
  const handleQuickEmoji = (emoji: string) => {
    onEmojiReact(messageId, emoji);
    setShowQuickEmojis(false);
  };

  // Handle emoji picker selection
  const handleEmojiSelect = (emoji: string) => {
    onEmojiReact(messageId, emoji);
    setShowEmojiPicker(false);
  };

  // Handle copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(messageContent);
      onCopy(messageContent);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  // Show quick emojis on hover/touch
  const handleMouseEnter = () => {
    if (quickEmojiTimeoutRef.current) {
      clearTimeout(quickEmojiTimeoutRef.current);
    }
    
    // Position based on message sender: left for current user, right for others
    const position = isCurrentUser ? 'left' : 'right';
    setEmojiPosition(position);
    setShowQuickEmojis(true);
    console.log(`✨ [EMOJI-RENDER] Showing ${quickEmojis.length} emojis + 1 more button = ${quickEmojis.length + 1} total elements for ${isCurrentUser ? 'current user (left)' : 'other user (right)'}`);
  };

  const handleMouseLeave = () => {
    quickEmojiTimeoutRef.current = setTimeout(() => {
      setShowQuickEmojis(false);
    }, 300);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (quickEmojiTimeoutRef.current) {
        clearTimeout(quickEmojiTimeoutRef.current);
      }
    };
  }, []);

  // Position emoji reactions based on message sender
  const getPositionClasses = () => {
    switch (emojiPosition) {
      case 'left':
        return 'left-0';
      case 'right':
        return 'right-0';
      default:
        // Fallback based on user type
        return isCurrentUser ? 'left-0' : 'right-0';
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Quick Emoji Reactions with intelligent boundary detection */}
      <AnimatePresence>
        {showQuickEmojis && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            transition={{ duration: 0.2 }}
            className={`absolute ${getPositionClasses()} -top-12 z-50 flex items-center space-x-1 px-2 py-1 rounded-full backdrop-blur-md border shadow-lg w-auto ${
              isDarkMode
                ? "bg-gray-800/90 border-gray-700/50"
                : "bg-white/90 border-gray-200/50"
            }`}
            style={{ whiteSpace: 'nowrap', minWidth: 'max-content' }}
            onMouseEnter={() => {
              if (quickEmojiTimeoutRef.current) {
                clearTimeout(quickEmojiTimeoutRef.current);
              }
            }}
            onMouseLeave={() => {
              quickEmojiTimeoutRef.current = setTimeout(() => {
                setShowQuickEmojis(false);
              }, 300);
            }}
          >
            {quickEmojis.map((emoji, index) => (
              <motion.button
                key={emoji}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleQuickEmoji(emoji)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <span className="text-lg">{emoji}</span>
              </motion.button>
            ))}

            {/* More emojis button */}
            <motion.button
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: quickEmojis.length * 0.05 }}
              onClick={(e) => {
                e.stopPropagation();
                console.log('🔘 [EMOJI-PICKER] "..." button clicked, current state:', showEmojiPicker);
                setShowEmojiPicker(!showEmojiPicker);
                console.log('🔘 [EMOJI-PICKER] Setting emoji picker state to:', !showEmojiPicker);
              }}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <MoreHorizontal className="w-4 h-4" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Emoji picker modal rendered via portal */}
      {showEmojiPicker && createPortal(
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            padding: '16px'
          }}
          onClick={() => {
            console.log('🔘 [EMOJI-PICKER] Backdrop clicked, closing modal');
            setShowEmojiPicker(false);
          }}
        >
          <div 
            style={{
              backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
              border: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
              borderRadius: '12px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              maxWidth: '320px',
              width: '100%',
              maxHeight: '80vh',
              overflow: 'hidden'
            }}
            onClick={(e) => {
              e.stopPropagation();
              console.log('🔘 [EMOJI-PICKER] Modal content clicked, keeping open');
            }}
          >
            <EmojiPicker onSelect={handleEmojiSelect} />
          </div>
        </div>,
        document.body
      )}

      {/* Main Actions Container */}
      <div className="flex items-center space-x-0.5">
        {/* Render icons in different order based on isCurrentUser */}
        {isCurrentUser ? (
          // For current user messages: Emoji → More Actions
          <>
            {/* Emoji Button */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors ${
                isDarkMode
                  ? "hover:bg-gray-700/50 text-gray-400 hover:text-gray-200"
                  : "hover:bg-gray-100/50 text-gray-500 hover:text-gray-700"
              }`}
              title="React with emoji"
            >
              <Smile className="w-3.5 h-3.5" />
            </motion.button>

            {/* More Actions Dropdown */}
            <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <DropdownMenuTrigger asChild>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors ${
                    isDarkMode
                      ? "hover:bg-gray-700/50 text-gray-400 hover:text-gray-200"
                      : "hover:bg-gray-100/50 text-gray-500 hover:text-gray-700"
                  }`}
                  title="More actions"
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </motion.button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="left"
                className={`w-36 ${
                  isDarkMode
                    ? "bg-gray-800/95 border-gray-700/50 backdrop-blur-md"
                    : "bg-white/95 border-gray-200/50 backdrop-blur-md"
                }`}
              >
                <DropdownMenuItem
                  onClick={() => onReply(messageId, messageContent)}
                  className="flex items-center space-x-2 cursor-pointer text-xs py-1.5"
                >
                  <Reply className="w-3.5 h-3.5" />
                  <span>Reply</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={handleCopy}
                  className="flex items-center space-x-2 cursor-pointer text-xs py-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onUnsend(messageId)}
                  className="flex items-center space-x-2 cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 text-xs py-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Unsend</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          // For received messages: More Actions → Emoji
          <>
            {/* More Actions Dropdown */}
            <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <DropdownMenuTrigger asChild>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors ${
                    isDarkMode
                      ? "hover:bg-gray-700/50 text-gray-400 hover:text-gray-200"
                      : "hover:bg-gray-100/50 text-gray-500 hover:text-gray-700"
                  }`}
                  title="More actions"
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </motion.button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="right"
                className={`w-36 ${
                  isDarkMode
                    ? "bg-gray-800/95 border-gray-700/50 backdrop-blur-md"
                    : "bg-white/95 border-gray-200/50 backdrop-blur-md"
                }`}
              >
                <DropdownMenuItem
                  onClick={() => onReply(messageId, messageContent)}
                  className="flex items-center space-x-2 cursor-pointer text-xs py-1.5"
                >
                  <Reply className="w-3.5 h-3.5" />
                  <span>Reply</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={handleCopy}
                  className="flex items-center space-x-2 cursor-pointer text-xs py-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </DropdownMenuItem>

                {onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDelete(messageId)}
                      className="flex items-center space-x-2 cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 text-xs py-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Emoji Button */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors ${
                isDarkMode
                  ? "hover:bg-gray-700/50 text-gray-400 hover:text-gray-200"
                  : "hover:bg-gray-100/50 text-gray-500 hover:text-gray-700"
              }`}
              title="React with emoji"
            >
              <Smile className="w-3.5 h-3.5" />
            </motion.button>
          </>
        )}
      </div>
    </div>
  );
}
