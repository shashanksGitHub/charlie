import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Send, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserPicture } from "@/components/ui/user-picture";
import { useDarkMode } from "@/hooks/use-dark-mode";
import { useQuery } from "@tanstack/react-query";

interface ForwardDialogProps {
  isOpen: boolean;
  onClose: () => void;
  messageContent: string;
  onForward: (recipientIds: number[], message: string) => void;
}

interface Contact {
  id: number;
  fullName: string;
  photoUrl?: string;
  lastActive?: string;
  isOnline?: boolean;
  ghostMode?: boolean;
}

export function ForwardDialog({
  isOpen,
  onClose,
  messageContent,
  onForward,
}: ForwardDialogProps) {
  const { isDarkMode } = useDarkMode();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContacts, setSelectedContacts] = useState<number[]>([]);
  const [customMessage, setCustomMessage] = useState("");

  // Fetch user's contacts/matches
  const { data: contacts = [], isLoading } = useQuery<Contact[]>({
    queryKey: ["/api/matches/contacts"],
    queryFn: async (): Promise<Contact[]> => {
      const response = await fetch("/api/matches/contacts");
      if (!response.ok) throw new Error("Failed to fetch contacts");
      const data = await response.json();
      return data as Contact[];
    },
    enabled: isOpen,
  });

  // Filter contacts based on search query
  const filteredContacts = contacts.filter((contact) =>
    contact.fullName.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Handle contact selection
  const toggleContact = (contactId: number) => {
    setSelectedContacts((prev) =>
      prev.includes(contactId)
        ? prev.filter((id) => id !== contactId)
        : [...prev, contactId],
    );
  };

  // Handle forward action
  const handleForward = () => {
    if (selectedContacts.length === 0) return;

    const finalMessage = customMessage.trim() || messageContent;
    onForward(selectedContacts, finalMessage);

    // Reset state
    setSelectedContacts([]);
    setCustomMessage("");
    setSearchQuery("");
    onClose();
  };

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedContacts([]);
      setCustomMessage("");
      setSearchQuery("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className={`w-full max-w-md rounded-lg shadow-xl ${
            isDarkMode
              ? "bg-gray-800 border-gray-700"
              : "bg-white border-gray-200"
          } border`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className={`flex items-center justify-between p-4 border-b ${
              isDarkMode ? "border-gray-700" : "border-gray-200"
            }`}
          >
            <h3
              className={`text-lg font-semibold ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              Forward Message
            </h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Search */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Contacts List */}
          <div className="max-h-64 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
              </div>
            ) : filteredContacts.length === 0 ? (
              <div
                className={`text-center p-8 ${
                  isDarkMode ? "text-gray-400" : "text-gray-500"
                }`}
              >
                {searchQuery ? "No contacts found" : "No contacts available"}
              </div>
            ) : (
              <div className="p-2">
                {filteredContacts.map((contact) => (
                  <motion.div
                    key={contact.id}
                    whileHover={{
                      backgroundColor: isDarkMode
                        ? "rgba(55, 65, 81, 0.5)"
                        : "rgba(243, 244, 246, 0.5)",
                    }}
                    className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedContacts.includes(contact.id)
                        ? isDarkMode
                          ? "bg-purple-900/30 border border-purple-500/50"
                          : "bg-purple-50 border border-purple-200"
                        : ""
                    }`}
                    onClick={() => toggleContact(contact.id)}
                  >
                    <div className="relative">
                      <UserPicture
                        imageUrl={contact.photoUrl}
                        fallbackInitials={contact.fullName.charAt(0)}
                        className="h-10 w-10"
                      />
                      {contact.isOnline && !contact.ghostMode && (
                        <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div
                        className={`font-medium truncate ${
                          isDarkMode ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {contact.fullName}
                      </div>
                      {contact.lastActive && (
                        <div
                          className={`text-xs ${
                            isDarkMode ? "text-gray-400" : "text-gray-500"
                          }`}
                        >
                          {contact.isOnline && !contact.ghostMode
                            ? "Online"
                            : contact.lastActive ? `Last seen ${contact.lastActive}` : ""}
                        </div>
                      )}
                    </div>

                    {selectedContacts.includes(contact.id) && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center"
                      >
                        <Check className="h-4 w-4 text-white" />
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Selected Contacts Count */}
          {selectedContacts.length > 0 && (
            <div
              className={`px-4 py-2 border-t ${
                isDarkMode
                  ? "border-gray-700 bg-gray-800/50"
                  : "border-gray-200 bg-gray-50"
              }`}
            >
              <div
                className={`text-sm ${
                  isDarkMode ? "text-gray-300" : "text-gray-600"
                }`}
              >
                {selectedContacts.length} contact
                {selectedContacts.length !== 1 ? "s" : ""} selected
              </div>
            </div>
          )}

          {/* Message Preview */}
          <div
            className={`p-4 border-t ${
              isDarkMode ? "border-gray-700" : "border-gray-200"
            }`}
          >
            <div
              className={`text-sm font-medium mb-2 ${
                isDarkMode ? "text-gray-300" : "text-gray-700"
              }`}
            >
              Message to forward:
            </div>
            <div
              className={`p-3 rounded-lg text-sm ${
                isDarkMode
                  ? "bg-gray-700 text-gray-300"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              {messageContent}
            </div>

            {/* Optional custom message */}
            <div className="mt-3">
              <Input
                type="text"
                placeholder="Add a message (optional)"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                className="text-sm"
              />
            </div>
          </div>

          {/* Actions */}
          <div
            className={`flex items-center justify-end space-x-2 p-4 border-t ${
              isDarkMode ? "border-gray-700" : "border-gray-200"
            }`}
          >
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleForward}
              disabled={selectedContacts.length === 0}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Send className="h-4 w-4 mr-2" />
              Forward
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
