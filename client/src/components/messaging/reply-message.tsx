import React from "react";
import { motion } from "framer-motion";
import { Reply, X } from "lucide-react";
import { useDarkMode } from "@/hooks/use-dark-mode";

interface ReplyMessageProps {
  originalMessage: {
    id: number;
    content: string;
    senderName: string;
    isCurrentUser: boolean;
  };
  onCancel?: () => void;
  className?: string;
}

export function ReplyMessage({
  originalMessage,
  onCancel,
  className = "",
}: ReplyMessageProps) {
  const { isDarkMode } = useDarkMode();

  // Truncate long messages and handle image content
  const truncateMessage = (text: string, maxLength: number = 50) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  // Check if the content is an image
  const isImageContent = (content: string) => {
    return content.startsWith("_!_IMAGE_!_");
  };

  // Check if the content is a video
  const isVideoContent = (content: string) => {
    return content.startsWith("_!_VIDEO_!_");
  };

  // Render content appropriately based on type
  const renderContent = (content: string) => {
    if (isImageContent(content)) {
      const imageUrl = content.replace("_!_IMAGE_!_", "");
      return (
        <div className="flex items-center space-x-2">
          <img 
            src={imageUrl}
            alt="Image"
            className="w-8 h-8 rounded object-cover"
          />
          <span className="text-sm">📷 Photo</span>
        </div>
      );
    }
    if (isVideoContent(content)) {
      return (
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
            <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
          <span className="text-sm">🎥 Video</span>
        </div>
      );
    }
    return truncateMessage(content);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`flex items-center space-x-2 p-2 rounded-lg border-l-4 border-purple-500 ${
        isDarkMode
          ? "bg-gray-800/50 border-gray-700"
          : "bg-gray-50/50 border-gray-200"
      } ${className}`}
    >
      <Reply className="w-4 h-4 text-purple-500 flex-shrink-0" />

      <div className="flex-1 min-w-0">
        <div
          className={`text-xs font-medium ${
            isDarkMode ? "text-purple-400" : "text-purple-600"
          }`}
        >
          Replying to{" "}
          {originalMessage.isCurrentUser ? "You" : originalMessage.senderName}
        </div>
        <div
          className={`text-sm ${
            isDarkMode ? "text-gray-300" : "text-gray-600"
          }`}
        >
          {renderContent(originalMessage.content)}
        </div>
      </div>

      {onCancel && (
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onCancel}
          className={`w-6 h-6 flex items-center justify-center rounded-full transition-colors ${
            isDarkMode
              ? "hover:bg-gray-700 text-gray-400 hover:text-gray-200"
              : "hover:bg-gray-200 text-gray-500 hover:text-gray-700"
          }`}
        >
          <X className="w-4 h-4" />
        </motion.button>
      )}
    </motion.div>
  );
}

// Component for displaying reply context within a message bubble
export function ReplyContext({
  originalMessage,
  className = "",
  onScrollToMessage,
}: {
  originalMessage: {
    id: number;
    content: string;
    senderName: string;
    isCurrentUser: boolean;
  };
  className?: string;
  onScrollToMessage?: (messageId: number) => void;
}) {
  const { isDarkMode } = useDarkMode();

  const truncateMessage = (text: string, maxLength: number = 40) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  // Check if the content is an image
  const isImageContent = (content: string) => {
    return content.startsWith("_!_IMAGE_!_");
  };

  // Check if the content is a video
  const isVideoContent = (content: string) => {
    return content.startsWith("_!_VIDEO_!_");
  };

  // Render content appropriately based on type for ReplyContext
  const renderReplyContent = (content: string) => {
    if (isImageContent(content)) {
      const imageUrl = content.replace("_!_IMAGE_!_", "");
      return (
        <div className="flex items-center space-x-2">
          <img 
            src={imageUrl}
            alt="Image"
            className="w-6 h-6 rounded object-cover"
          />
          <span className="text-xs">📷 Photo</span>
        </div>
      );
    }
    if (isVideoContent(content)) {
      return (
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
            <svg className="w-3 h-3 text-gray-600 dark:text-gray-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
          <span className="text-xs">🎥 Video</span>
        </div>
      );
    }
    return truncateMessage(content);
  };

  const handleClick = () => {
    if (onScrollToMessage) {
      onScrollToMessage(originalMessage.id);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`mb-2 p-2 rounded border-l-2 border-purple-400/50 transition-all duration-200 ${
        onScrollToMessage 
          ? "cursor-pointer hover:bg-purple-50/50 hover:border-purple-500/70 hover:shadow-sm dark:hover:bg-purple-900/20 dark:hover:border-purple-400/80" 
          : ""
      } ${
        isDarkMode
          ? "bg-gray-700/30 border-gray-600"
          : "bg-gray-100/50 border-gray-300"
      } ${className}`}
    >
      <div
        className={`text-xs font-medium mb-1 ${
          isDarkMode ? "text-purple-400" : "text-purple-600"
        }`}
      >
        {originalMessage.isCurrentUser ? "You" : originalMessage.senderName}
      </div>
      <div
        className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
      >
        {renderReplyContent(originalMessage.content)}
      </div>
    </div>
  );
}
