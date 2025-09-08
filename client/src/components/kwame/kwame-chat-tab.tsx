import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import {
  Send,
  Smile,
  ArrowLeft,
  FileImage,
  Camera,
  Loader2,
  Download,
  X,
} from "lucide-react";
import { Button } from "../ui/button";
import { GodmodelTest } from "./godmodel-test";
import PersonalityResultsDialog from "./personality-results-dialog";
// framer-motion already imported above
import { Input } from "../ui/input";
import {
  kwameAPI,
  type KwameResponse,
  type KwameRequest,
  type KwameConversationMessage,
} from "../../services/kwame-api-client";
import { useAuth } from "@/hooks/use-auth";
import { useAppMode } from "@/hooks/use-app-mode";
import { useDarkMode } from "@/hooks/use-dark-mode";
import { useLanguage } from "@/hooks/use-language";
import { toast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { UserProfilePreviewPopup } from "../ui/user-profile-preview-popup";

interface KwameMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  status?: "sending" | "sent" | "delivered" | "read";
  kind?: "text" | "styleChips" | "actionButtons";
  chips?: string[];
  actionButtons?: Array<{
    label: string;
    action: string;
    data?: any;
  }>;
  systemNote?: boolean;
}

// Emoji data organized by categories
const emojiCategories = {
  "😀": [
    "😀",
    "😃",
    "😄",
    "😁",
    "😆",
    "😅",
    "🤣",
    "😂",
    "🙂",
    "🙃",
    "😉",
    "😊",
    "😇",
    "🥰",
    "😍",
    "🤩",
    "😘",
    "😗",
    "☺️",
    "😚",
    "😙",
    "🥲",
    "😋",
    "😛",
    "😜",
    "🤪",
    "😝",
    "🤑",
    "🤗",
    "🤭",
    "🤫",
    "🤔",
    "🤐",
    "🤨",
    "😐",
    "😑",
    "😶",
    "😏",
    "😒",
    "🙄",
    "😬",
    "🤥",
    "😔",
    "😪",
    "🤤",
    "😴",
    "😷",
    "🤒",
    "🤕",
    "🤢",
    "🤮",
    "🤧",
    "🥵",
    "🥶",
    "🥴",
    "😵",
    "🤯",
    "🤠",
    "🥳",
    "🥸",
    "😎",
    "🤓",
    "🧐",
    "😕",
    "😟",
    "🙁",
    "☹️",
    "😮",
    "😯",
    "😲",
    "😳",
    "🥺",
    "😦",
    "😧",
    "😨",
    "😰",
    "😥",
    "😢",
    "😭",
    "😱",
    "😖",
    "😣",
    "😞",
    "😓",
    "😩",
    "😫",
    "🥱",
    "😤",
    "😡",
    "😠",
    "🤬",
    "😈",
    "👿",
    "💀",
    "☠️",
    "💩",
    "🤡",
    "👹",
    "👺",
    "👻",
    "👽",
    "👾",
    "🤖",
    "😺",
    "😸",
    "😹",
    "😻",
    "😼",
    "😽",
    "🙀",
    "😿",
    "😾",
  ],
  "❤️": [
    "❤️",
    "🧡",
    "💛",
    "💚",
    "💙",
    "💜",
    "🤎",
    "🖤",
    "🤍",
    "💔",
    "❣️",
    "💕",
    "💞",
    "💓",
    "💗",
    "💖",
    "💘",
    "💝",
    "💟",
    "♥️",
    "💋",
    "💌",
    "💐",
    "🌹",
    "🌺",
    "🌻",
    "🌷",
    "🌸",
    "💒",
    "💍",
    "💎",
  ],
  "👍": [
    "👍",
    "👎",
    "👌",
    "🤌",
    "🤏",
    "✌️",
    "🤞",
    "🤟",
    "🤘",
    "🤙",
    "👈",
    "👉",
    "👆",
    "🖕",
    "👇",
    "☝️",
    "👋",
    "🤚",
    "🖐️",
    "✋",
    "🖖",
    "👏",
    "🙌",
    "🤝",
    "🙏",
    "✍️",
    "💪",
    "🦾",
    "🦿",
    "🦵",
    "🦶",
    "👂",
    "🦻",
    "👃",
    "🧠",
    "🫀",
    "🫁",
    "🦷",
    "🦴",
    "👀",
    "👁️",
    "👅",
    "👄",
  ],
  "⚽": [
    "⚽",
    "🏀",
    "🏈",
    "⚾",
    "🥎",
    "🎾",
    "🏐",
    "🏉",
    "🎱",
    "🪀",
    "🏓",
    "🏸",
    "🏒",
    "🏑",
    "🥍",
    "🏏",
    "🪃",
    "🥅",
    "⛳",
    "🪁",
    "🏹",
    "🎣",
    "🤿",
    "🥊",
    "🥋",
    "🎽",
    "🛹",
    "🛼",
    "🛷",
    "⛸️",
    "🥌",
    "🎿",
    "⛷️",
    "🏂",
    "🪂",
    "🏋️",
    "🤼",
    "🤸",
    "⛹️",
    "🤺",
    "🤾",
    "🏌️",
    "🏇",
    "🧘",
    "🏃",
    "🚶",
    "🧍",
    "🧎",
    "🏃‍♀️",
    "🚶‍♀️",
    "🧍‍♀️",
    "🧎‍♀️",
    "👫",
    "👬",
    "👭",
    "💃",
    "🕺",
    "🕴️",
    "👯",
    "🧖",
    "🧙",
    "🧚",
    "🧛",
    "🧜",
    "🧝",
    "🧞",
    "🧟",
    "💆",
    "💇",
    "🚶‍♂️",
    "🏃‍♂️",
    "💃",
    "🕺",
    "🕴️",
    "👯‍♀️",
    "👯‍♂️",
    "🧖‍♀️",
    "🧖‍♂️",
    "🧙‍♀️",
    "🧙‍♂️",
    "🧚‍♀️",
    "🧚‍♂️",
    "🧛‍♀️",
    "🧛‍♂️",
    "🧜‍♀️",
    "🧜‍♂️",
    "🧝‍♀️",
    "🧝‍♂️",
    "🧞‍♀️",
    "🧞‍♂️",
    "🧟‍♀️",
    "🧟‍♂️",
    "💆‍♀️",
    "💆‍♂️",
    "💇‍♀️",
    "💇‍♂️",
  ],
  "🍎": [
    "🍎",
    "🍐",
    "🍊",
    "🍋",
    "🍌",
    "🍉",
    "🍇",
    "🍓",
    "🫐",
    "🍈",
    "🍒",
    "🍑",
    "🥭",
    "🍍",
    "🥥",
    "🥝",
    "🍅",
    "🍆",
    "🥑",
    "🥦",
    "🥬",
    "🥒",
    "🌶️",
    "🫑",
    "🌽",
    "🥕",
    "🫒",
    "🧄",
    "🧅",
    "🥔",
    "🍠",
    "🥐",
    "🥖",
    "🍞",
    "🥨",
    "🥯",
    "🧀",
    "🥚",
    "🍳",
    "🧈",
    "🥞",
    "🧇",
    "🥓",
    "🥩",
    "🍗",
    "🍖",
    "🦴",
    "🌭",
    "🍔",
    "🍟",
    "🍕",
    "🫓",
    "🥪",
    "🥙",
    "🧆",
    "🌮",
    "🌯",
    "🫔",
    "🥗",
    "🥘",
    "🫕",
    "🥫",
    "🍝",
    "🍜",
    "🍲",
    "🍛",
    "🍣",
    "🍱",
    "🥟",
    "🦪",
    "🍤",
    "🍙",
    "🍚",
    "🍘",
    "🍥",
    "🥠",
    "🥮",
    "🍢",
    "🍡",
    "🍧",
    "🍨",
    "🍦",
    "🥧",
    "🧁",
    "🍰",
    "🎂",
    "🍮",
    "🍭",
    "🍬",
    "🍫",
    "🍿",
    "🍩",
    "🍪",
    "🌰",
    "🥜",
    "🍯",
  ],
  "🚗": [
    "🚗",
    "🚕",
    "🚙",
    "🚌",
    "🚎",
    "🏎️",
    "🚓",
    "🚑",
    "🚒",
    "🚐",
    "🛻",
    "🚚",
    "🚛",
    "🚜",
    "🏍️",
    "🛵",
    "🚲",
    "🛴",
    "🛹",
    "🛼",
    "🚁",
    "🛸",
    "🚀",
    "✈️",
    "🛩️",
    "🛫",
    "🛬",
    "🪂",
    "💺",
    "🚂",
    "🚆",
    "🚄",
    "🚅",
    "🚈",
    "🚝",
    "🚞",
    "🚋",
    "🚃",
    "🚟",
    "🚠",
    "🚡",
    "⛴️",
    "🛥️",
    "🚤",
    "⛵",
    "🛶",
    "🚢",
    "🛳️",
    "⚓",
    "🪝",
    "⛽",
    "🚧",
    "🚨",
    "🚥",
    "🚦",
    "🛑",
    "🚏",
    "🗺️",
    "🗿",
    "🗽",
    "🗼",
    "🏰",
    "🏯",
    "🏟️",
    "🎡",
    "🎢",
    "🎠",
    "⛲",
    "⛱️",
    "🏖️",
    "🏝️",
    "🏜️",
    "🌋",
    "⛰️",
    "🏔️",
    "🗻",
    "🏕️",
    "⛺",
    "🛖",
    "🏠",
    "🏡",
    "🏘️",
    "🏚️",
    "🏗️",
    "🏭",
    "🏢",
    "🏬",
    "🏣",
    "🏤",
    "🏥",
    "🏦",
    "🏨",
    "🏪",
    "🏫",
    "🏩",
    "💒",
    "🏛️",
    "⛪",
    "🕌",
    "🛕",
    "🕍",
    "🕋",
    "⛩️",
    "🛤️",
    "🛣️",
    "🗾",
    "🎑",
    "🏞️",
    "🌅",
    "🌄",
    "🌠",
    "🎇",
    "🎆",
    "🌇",
    "🌆",
    "🏙️",
    "🌃",
    "🌌",
    "🌉",
    "🌁",
  ],
};

export default function KwameChatTab({
  openBig5OnLoad = false,
}: {
  openBig5OnLoad?: boolean;
}) {
  const { user } = useAuth();
  const { currentMode, setAppMode } = useAppMode();
  const { isDarkMode } = useDarkMode();
  const { translate, currentLanguage } = useLanguage();
  const [, setLocation] = useLocation();

  const [messages, setMessages] = useState<KwameMessage[] | null>(null);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [avatarError, setAvatarError] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeEmojiCategory, setActiveEmojiCategory] = useState("😀");
  const [isUploading, setIsUploading] = useState(false);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [showGodmodelPrompt, setShowGodmodelPrompt] = useState(false);
  const [showHeaderPill, setShowHeaderPill] = useState(false);
  const [godmodelDismissed, setGodmodelDismissed] = useState(false);
  const [hasGodmodelProgress, setHasGodmodelProgress] = useState(false);
  const [godmodelCompleted, setGodmodelCompleted] = useState(false);
  const [showPersonalityResults, setShowPersonalityResults] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chipClasses = (dark: boolean) =>
    [
      "w-full text-left px-3 py-1.5 rounded-full text-sm font-medium",
      "transition-all duration-150",
      dark
        ? "bg-gradient-to-r from-violet-700/30 via-fuchsia-600/20 to-pink-600/20 text-violet-100 border border-fuchsia-500/20 hover:from-violet-700/45 hover:to-pink-600/35 shadow-[0_4px_14px_-6px_rgba(168,85,247,0.35)]"
        : "bg-gradient-to-r from-violet-50 via-fuchsia-50 to-pink-50 text-violet-800 border border-fuchsia-200 hover:from-violet-100 hover:to-pink-100 shadow-[0_4px_12px_-6px_rgba(168,85,247,0.25)]",
      "hover:scale-[1.01] active:scale-[0.99] focus:outline-none",
      dark
        ? "focus:ring-2 focus:ring-fuchsia-400/40"
        : "focus:ring-2 focus:ring-fuchsia-300/70",
    ].join(" ");
  const downloadImage = async (src: string, filenamePrefix = "kwame-image") => {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const desiredName = `${filenamePrefix}-${timestamp}.png`;

      if (src.startsWith("data:")) {
        const a = document.createElement("a");
        a.href = src;
        a.download = desiredName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        return;
      }

      // http/https – fetch then save
      const response = await fetch(src, { mode: "cors" });
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = desiredName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
      toast({
        title: "Download failed",
        description: "Could not save the image.",
        variant: "destructive",
      });
    }
  };
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleEmojiSelect = (emoji: string) => {
    setInputMessage((prev) => prev + emoji);
    setShowEmojiPicker(false);
  };

  const toggleEmojiPicker = () => {
    setShowEmojiPicker((prev) => !prev);
  };

  // Navigate to the messages view of the last app used (HEAT/MEET/SUITE)
  const goToLastAppMessages = () => {
    try {
      const last = localStorage.getItem("last_app_page") || "";
      const origin = localStorage.getItem("origin_app_page") || "";
      const page = last || origin || "";
      let mode: "HEAT" | "MEET" | "SUITE" = "MEET";
      if (page.startsWith("/heat")) mode = "HEAT";
      else if (page.startsWith("/suite")) mode = "SUITE";
      else if (page.startsWith("/meet")) mode = "MEET";
      else mode = (currentMode as any) || "MEET";
      setAppMode(mode);
      setLocation("/messages");
    } catch {
      // Fallback to MEET messages if anything goes wrong
      setAppMode("MEET");
      setLocation("/messages");
    }
  };

  // Load conversation history on mount (no placeholder until confirmed empty)
  useEffect(() => {
    const loadConversationHistory = async () => {
      if (!user) return;

      try {
        setIsLoadingHistory(true);
        const history = await kwameAPI.getConversationHistory(500);

        if (history.conversations.length > 0) {
          // Convert database messages to UI format
          const convertedMessages: KwameMessage[] = history.conversations.map(
            (msg) => ({
              id: msg.id.toString(),
              content: msg.content,
              isUser: msg.role === "user",
              timestamp: new Date(msg.timestamp),
              status: "read",
            }),
          );

          setMessages(convertedMessages);
        } else {
          // Still empty after load; now show localized welcome once (no flicker)
          const welcomeByLang: Record<string, string> = {
            fr: "Bonjour ! 🌍 Je suis KWAME, là pour marcher avec toi — en amitié, en idées ou en croissance. Qu'as‑tu en tête aujourd'hui ?",
            es: "¡Hola! 🌍 Soy KWAME, aquí para caminar contigo — en amistades, ideas o crecimiento. ¿Qué tienes en mente hoy?",
            ak: "Akwaaba! 🌍 Me din de KWAME. Merekɔ nnipa, adwene ne nkɔsoɔ akɔnnɛ mu ka wo ho. Dɛn na ɛwɔ wo adwene mu ɛnnɛ?",
            tw: "Akwaaba! 🌍 Me din de KWAME. Merekɔ nipa, adwene ne nkɔso mu ka wo ho. Dɛn na ɛwɔ wo adwene mu ɛnnɛ?",
            ee: "Woezɔ! 🌍 Nye KPAME. Meƒe nye be mayina kple wò – le kpɔɖeŋuwo, nudzedze alo nuwɔwɔwo me. Nu ka wò dzi le egbe?",
            ga: "Ojjogbaa! 🌍 Miishɛ KWAME. Mihee gbemi shika ekome—ɛhe ni nɔyraa, mlibɛi kɛ gbeleŋ. Nɔ ni keji hewalɔ yɛ?",
            pt: "Olá! 🌍 Eu sou o KWAME, aqui para caminhar contigo — em amizades, ideias ou crescimento. O que está na tua mente hoje?",
            de: "Hallo! 🌍 Ich bin KWAME, hier um mit dir zu gehen — in Freundschaften, Ideen oder Wachstum. Was beschäftigt dich heute?",
            it: "Ciao! 🌍 Sono KWAME, qui per camminare con te — tra amicizie, idee o crescita. Cosa hai in mente oggi?",
          };
          const defaultWelcome =
            "Hello! 🌍 I’m KWAME, here to walk with you on your journey — in friendships, ideas, or growth. What’s on your mind today?";
          const langCode = currentLanguage?.code || "en";
          const welcomeText = welcomeByLang[langCode] || defaultWelcome;
          setMessages([
            {
              id: "welcome",
              content: welcomeText,
              isUser: false,
              timestamp: new Date(),
              status: "read",
            },
          ]);
        }
      } catch (error) {
        console.error("Failed to load conversation history:", error);
        // On error, do not flash a placeholder. Keep as loading state; user can still type.
        if (messages === null) setMessages([]);
        toast({
          title: "Notice",
          description: "Couldn't load conversation history.",
          variant: "default",
        });
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadConversationHistory();
  }, [user, currentLanguage?.code]);

  // Initialize personality test completion status from user data
  useEffect(() => {
    if (user?.personalityTestCompleted) {
      setGodmodelCompleted(true);
      setHasGodmodelProgress(true);
    }
  }, [user?.personalityTestCompleted]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Allow closing expanded image with ESC
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setExpandedImage(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraStream]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || !user || isLoading) return;

    const userMessage: KwameMessage = {
      id: Date.now().toString(),
      content: inputMessage.trim(),
      isUser: true,
      timestamp: new Date(),
      status: "sending",
    };

    setMessages((prev) =>
      Array.isArray(prev) ? [...prev, userMessage] : [userMessage],
    );
    setInputMessage("");
    setIsLoading(true);

    // Update user message status to sent
    setTimeout(() => {
      setMessages((prev) =>
        Array.isArray(prev)
          ? prev.map((msg) =>
              msg.id === userMessage.id ? { ...msg, status: "sent" } : msg,
            )
          : prev,
      );
    }, 500);

    try {
      const response = await kwameAPI.chat({
        message: userMessage.content,
        context: {
          currentScreen: "chat",
        },
        appMode: currentMode || "MEET",
      });

      // Update user message to delivered
      setMessages((prev) =>
        Array.isArray(prev)
          ? prev.map((msg) =>
              msg.id === userMessage.id ? { ...msg, status: "delivered" } : msg,
            )
          : prev,
      );

      // Add KWAME's response
      // Filter out unsupported actions like "continue_chat" just in case
      const filteredButtons = Array.isArray(response.actionButtons)
        ? response.actionButtons.filter((btn) => btn.action !== "continue_chat")
        : response.actionButtons;

      const kwameMessage: KwameMessage = {
        id: (Date.now() + 1).toString(),
        content: response.message,
        isUser: false,
        timestamp: new Date(),
        status: "read",
        ...(filteredButtons &&
          filteredButtons.length > 0 && {
            kind: "actionButtons" as const,
            actionButtons: filteredButtons,
          }),
      };

      setTimeout(() => {
        setMessages((prev) =>
          Array.isArray(prev) ? [...prev, kwameMessage] : [kwameMessage],
        );
        // Mark user message as read
        setMessages((prev) =>
          Array.isArray(prev)
            ? prev.map((msg) =>
                msg.id === userMessage.id ? { ...msg, status: "read" } : msg,
              )
            : prev,
        );
      }, 1000);
    } catch (error) {
      console.error("KWAME chat error:", error);
      // Update message status to failed
      setMessages((prev) =>
        Array.isArray(prev)
          ? prev.map((msg) =>
              msg.id === userMessage.id ? { ...msg, status: "sent" } : msg,
            )
          : prev,
      );

      toast({
        title: "Message failed",
        description: "Couldn't send message. Try again?",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleActionButtonClick = async (
    button: { label: string; action: string; data?: any },
    messageId: string,
  ) => {
    console.log("Action button clicked:", button);

    // Handle different action types
    switch (button.action) {
      case "start_personality_test":
        await handleStartPersonalityTest();
        break;
      case "continue_personality_test":
        await handleContinuePersonalityTest();
        break;
      case "view_personality_results":
        await handleViewPersonalityResults();
        break;
      case "take_personality_question":
        await handlePersonalityQuestion(button.data);
        break;
      default:
        console.warn("Unknown action:", button.action);
        toast({
          title: "Action not supported",
          description: "This action is not yet implemented.",
          variant: "destructive",
        });
    }
  };

  const handleStartPersonalityTest = async () => {
    setIsLoading(true);
    try {
      const response = await kwameAPI.startPersonalityAssessment();

      if (response.completed) {
        const completionMessage: KwameMessage = {
          id: Date.now().toString(),
          content:
            "🎉 You've already completed your personality assessment! You can view your results anytime.",
          isUser: false,
          timestamp: new Date(),
          status: "read",
          kind: "actionButtons",
          actionButtons: [
            {
              label: "View My Results",
              action: "view_personality_results",
            },
          ],
        };
        setMessages((prev) =>
          Array.isArray(prev)
            ? [...prev, completionMessage]
            : [completionMessage],
        );
      } else if (response.nextQuestion) {
        const questionMessage: KwameMessage = {
          id: Date.now().toString(),
          content: `Question ${response.nextQuestion.index + 1} of ${response.totalQuestions}:\n\n${response.nextQuestion.statement}`,
          isUser: false,
          timestamp: new Date(),
          status: "read",
          kind: "actionButtons",
          actionButtons: response.nextQuestion.options.map((option) => ({
            label: option,
            action: "take_personality_question",
            data: {
              questionIndex: response.nextQuestion!.index,
              answer: option,
            },
          })),
        };
        setMessages((prev) =>
          Array.isArray(prev) ? [...prev, questionMessage] : [questionMessage],
        );
      }
    } catch (error) {
      console.error("Error starting personality test:", error);
      toast({
        title: "Error",
        description:
          "Failed to start personality assessment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinuePersonalityTest = async () => {
    await handleStartPersonalityTest(); // Same logic as start
  };

  const handlePersonalityQuestion = async (data: {
    questionIndex: number;
    answer: string;
  }) => {
    setIsLoading(true);
    try {
      const response = await kwameAPI.submitPersonalityAnswer(
        data.questionIndex,
        data.answer,
      );

      // Add user's answer as a message
      const userMessage: KwameMessage = {
        id: Date.now().toString(),
        content: data.answer,
        isUser: true,
        timestamp: new Date(),
        status: "read",
      };
      setMessages((prev) =>
        Array.isArray(prev) ? [...prev, userMessage] : [userMessage],
      );

      if (response.completed) {
        // Complete the assessment
        await kwameAPI.completePersonalityAssessment();

        const completionMessage: KwameMessage = {
          id: (Date.now() + 1).toString(),
          content:
            "🎉 Congratulations! You've completed your personality assessment. Your Big 5 personality profile has been computed and is ready for analysis.",
          isUser: false,
          timestamp: new Date(),
          status: "read",
          systemNote: true,
          kind: "actionButtons",
          actionButtons: [
            {
              label: "View My Personality Profile",
              action: "view_personality_results",
            },
          ],
        };
        setMessages((prev) =>
          Array.isArray(prev)
            ? [...prev, completionMessage]
            : [completionMessage],
        );
      } else if (response.nextQuestion) {
        // Show next question
        setTimeout(() => {
          const questionMessage: KwameMessage = {
            id: (Date.now() + 2).toString(),
            content: `Question ${response.nextQuestion!.index + 1} of ${response.totalQuestions}:\n\n${response.nextQuestion!.statement}`,
            isUser: false,
            timestamp: new Date(),
            status: "read",
            kind: "actionButtons",
            actionButtons: response.nextQuestion!.options.map((option) => ({
              label: option,
              action: "take_personality_question",
              data: {
                questionIndex: response.nextQuestion!.index,
                answer: option,
              },
            })),
          };
          setMessages((prev) =>
            Array.isArray(prev)
              ? [...prev, questionMessage]
              : [questionMessage],
          );
        }, 500);
      }
    } catch (error) {
      console.error("Error submitting personality answer:", error);
      toast({
        title: "Error",
        description: "Failed to submit answer. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewPersonalityResults = async () => {
    setIsLoading(true);
    try {
      const response = await kwameAPI.getPersonalityResults();

      if (response.big5Profile) {
        const profile = response.big5Profile;
        const resultsMessage: KwameMessage = {
          id: Date.now().toString(),
          content:
            `🧠 Your Big 5 Personality Profile:\n\n` +
            `🌟 **Openness**: ${Math.round(profile.openness * 100)}%\n` +
            `🎯 **Conscientiousness**: ${Math.round(profile.conscientiousness * 100)}%\n` +
            `🤝 **Extraversion**: ${Math.round(profile.extraversion * 100)}%\n` +
            `💝 **Agreeableness**: ${Math.round(profile.agreeableness * 100)}%\n` +
            `😌 **Emotional Stability**: ${Math.round((1 - profile.neuroticism) * 100)}%\n\n` +
            `This profile helps KWAME give you more personalized advice about relationships and dating! ✨`,
          isUser: false,
          timestamp: new Date(),
          status: "read",
          systemNote: true,
        };
        setMessages((prev) =>
          Array.isArray(prev) ? [...prev, resultsMessage] : [resultsMessage],
        );
      } else {
        throw new Error("No personality profile found");
      }
    } catch (error) {
      console.error("Error getting personality results:", error);
      toast({
        title: "Error",
        description:
          "Failed to load personality results. Please complete the assessment first.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getMessageStatus = (status?: string) => {
    switch (status) {
      case "sending":
        return "⏳";
      case "sent":
        return "✓";
      case "delivered":
        return "✓✓";
      case "read":
        return "✓✓";
      default:
        return "";
    }
  };

  useEffect(() => {
    // Trigger personality test prompt immediately if requested via query
    if (
      openBig5OnLoad &&
      !showGodmodelPrompt &&
      !godmodelCompleted &&
      !godmodelDismissed
    ) {
      setShowGodmodelPrompt(true);
      return;
    }

    if (
      !isLoadingHistory &&
      Array.isArray(messages) &&
      messages.length > 0 &&
      !showGodmodelPrompt &&
      !godmodelDismissed &&
      !godmodelCompleted // Don't show prompt if test is already completed
    ) {
      // Only show the personality test prompt after user has sent at least one message
      // Don't trigger it automatically on the initial welcome message
      const hasUserMessages = messages.some((m) => m.isUser);
      const hasAssistantResponses = messages.some(
        (m) => !m.isUser && m.id !== "welcome",
      );

      if (hasUserMessages && hasAssistantResponses) {
        setShowGodmodelPrompt(true);
      }
    }
  }, [
    isLoadingHistory,
    messages,
    showGodmodelPrompt,
    godmodelDismissed,
    godmodelCompleted,
  ]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!user || isLoading || isUploading) return;

    try {
      setIsUploading(true);

      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
      });

      // Create a special message format for images; ensure payload stays within server limits (~10GB)
      const MAX_IMAGE_PAYLOAD = 10 * 1024 * 1024 * 1024; // 10GB
      const imagePayload =
        base64.length > MAX_IMAGE_PAYLOAD
          ? base64.slice(0, MAX_IMAGE_PAYLOAD)
          : base64;
      const imageMessage = `_!_IMAGE_!_${imagePayload}`;

      // Create user message with image (store data URL so UI can render it inline)
      const userMessage: KwameMessage = {
        id: Date.now().toString(),
        content: imageMessage,
        isUser: true,
        timestamp: new Date(),
        status: "sending",
      };

      setMessages((prev) =>
        Array.isArray(prev) ? [...prev, userMessage] : [userMessage],
      );

      // Update user message status to sent
      setTimeout(() => {
        setMessages((prev) =>
          Array.isArray(prev)
            ? prev.map((msg) =>
                msg.id === userMessage.id ? { ...msg, status: "sent" } : msg,
              )
            : prev,
        );
      }, 500);

      // Immediately show style suggestion chips from KWAME
      const chipsMessage: KwameMessage = {
        id: (Date.now() + 2).toString(),
        content: translate("kwame.imageTransform"),
        isUser: false,
        timestamp: new Date(),
        kind: "styleChips",
        chips: [
          translate("kwame.styles.disneyPixar"),
          translate("kwame.styles.anime"),
          translate("kwame.styles.hyperRealistic"),
        ],
      };
      setMessages((prev) =>
        Array.isArray(prev) ? [...prev, chipsMessage] : [chipsMessage],
      );

      // Send the image message to KWAME AI
      const response = await kwameAPI.chat({
        message: imageMessage,
        context: {
          currentScreen: "chat",
        },
        appMode: currentMode || "MEET",
      });

      // Update user message to delivered
      setMessages((prev) =>
        Array.isArray(prev)
          ? prev.map((msg) =>
              msg.id === userMessage.id ? { ...msg, status: "delivered" } : msg,
            )
          : prev,
      );

      // Only add KWAME's response if there's an actual message (not just image storage confirmation)
      if (
        response.message &&
        response.message !== "Image received" &&
        !response.imageStored
      ) {
        const kwameMessage: KwameMessage = {
          id: (Date.now() + 1).toString(),
          content: response.message,
          isUser: false,
          timestamp: new Date(),
          status: "read",
        };

        setTimeout(() => {
          setMessages((prev) =>
            Array.isArray(prev) ? [...prev, kwameMessage] : [kwameMessage],
          );
        }, 1000);
      }

      // Mark user message as read
      setTimeout(() => {
        setMessages((prev) =>
          Array.isArray(prev)
            ? prev.map((msg) =>
                msg.id === userMessage.id ? { ...msg, status: "read" } : msg,
              )
            : prev,
        );
      }, 1000);

      // Clear the file input
      if (e.target) {
        e.target.value = "";
      }

      toast({
        title: "Image sent",
        description: "Your image has been sent to KWAME AI",
      });
    } catch (error) {
      console.error("Failed to upload image:", error);
      toast({
        title: "Upload failed",
        description:
          error instanceof Error ? error.message : "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleStyleChipClick = async (chipText: string, chipsId: string) => {
    // Remove the chips bubble and post user's selection as a message
    setMessages((prev) => {
      if (!Array.isArray(prev)) return prev;
      const withoutChips = prev.filter((m) => m.id !== chipsId);
      const userMsg: KwameMessage = {
        id: Date.now().toString(),
        content: chipText,
        isUser: true,
        timestamp: new Date(),
        status: "sending",
      };
      return [...withoutChips, userMsg];
    });

    try {
      const response = await kwameAPI.chat({
        message: chipText,
        context: { currentScreen: "chat" },
        appMode: currentMode || "MEET",
      });

      // Mark user message as delivered/read
      setMessages((prev) =>
        Array.isArray(prev)
          ? prev.map((m) =>
              m.content === chipText && m.isUser && m.status === "sending"
                ? { ...m, status: "read" }
                : m,
            )
          : prev,
      );

      // Append KWAME's generated image or reply
      const kwameMsg: KwameMessage = {
        id: (Date.now() + 1).toString(),
        content: response.message,
        isUser: false,
        timestamp: new Date(),
        status: "read",
      };
      setMessages((prev) =>
        Array.isArray(prev) ? [...prev, kwameMsg] : [kwameMsg],
      );
    } catch (err) {
      console.error("Style transform failed:", err);
      toast({
        title: "Generation failed",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleStartCamera = async () => {
    try {
      // Check if camera is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast({
          title: "Camera not supported",
          description: "Your device doesn't support camera access.",
          variant: "destructive",
        });
        return;
      }

      // Request camera permissions
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });

      setCameraStream(stream);
      setIsCameraOpen(true);

      // Start video stream when component mounts
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (error) {
      console.error("Camera access failed:", error);
      toast({
        title: translate("kwame.camera.permissionDenied"),
        description: translate("kwame.camera.permissionDescription"),
        variant: "destructive",
      });
    }
  };

  const handleCloseCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setIsCameraOpen(false);
  };

  const handleCapturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to blob
    canvas.toBlob(
      async (blob) => {
        if (!blob) return;

        // Create a File object from the blob
        const file = new File([blob], "camera-photo.png", {
          type: "image/png",
        });

        // Close camera
        handleCloseCamera();

        // Process the captured photo like a file upload
        await handleImageUpload({ target: { files: [file] } } as any);
      },
      "image/png",
      0.9,
    );
  };

  return (
    <LayoutGroup>
      <div
        className={`flex flex-col h-full ${
          isDarkMode
            ? "bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800"
            : "bg-gradient-to-br from-purple-50/30 via-white to-pink-50/30"
        }`}
      >
        {/* Chat Header - Enhanced with beautiful gradients */}
        <div
          className={`flex items-center justify-between p-4 border-b backdrop-blur-xl ${
            isDarkMode
              ? "bg-gradient-to-r from-gray-800/95 via-slate-800/95 to-gray-700/95 border-gray-600/30 shadow-xl shadow-purple-500/5"
              : "bg-gradient-to-r from-white/95 via-purple-50/80 to-pink-50/80 border-purple-200/30 shadow-xl shadow-purple-500/10"
          }`}
        >
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={goToLastAppMessages}
              className="p-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>

            <div className="flex items-center space-x-3">
              <UserProfilePreviewPopup
                user={{
                  id: -1,
                  fullName: "KWAME AI",
                  photoUrl: !avatarError
                    ? "/kwame-ai-avatar.png"
                    : "/kwame-ai-avatar.svg",
                  isOnline: true,
                  city: "Your AI Wingman",
                  country: "🇬🇭 Ghana",
                }}
              >
                <div className="relative cursor-pointer hover:scale-105 transition-all duration-300 ease-in-out group">
                  <div
                    className={`absolute -inset-1 rounded-full opacity-75 group-hover:opacity-100 transition duration-300 ${
                      isDarkMode
                        ? "bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 blur-sm"
                        : "bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 blur-sm"
                    }`}
                  ></div>
                  {!avatarError ? (
                    <img
                      src="/kwame-ai-avatar.png"
                      alt="KWAME AI"
                      className="relative w-10 h-10 rounded-full object-cover ring-2 ring-white/20 shadow-lg"
                      onError={() => setAvatarError(true)}
                    />
                  ) : (
                    <img
                      src="/kwame-ai-avatar.svg"
                      alt="KWAME AI"
                      className="relative w-10 h-10 rounded-full object-cover ring-2 ring-white/20 shadow-lg"
                    />
                  )}
                  <span
                    className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 shadow-sm ${
                      isDarkMode
                        ? "bg-green-400 border-gray-800 shadow-green-400/20"
                        : "bg-green-500 border-white shadow-green-500/20"
                    }`}
                  ></span>
                </div>
              </UserProfilePreviewPopup>

              <div>
                <h2
                  className={`font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}
                >
                  KWAME AI
                </h2>
                <div className="flex items-center space-x-1">
                  <span className="text-sm text-gray-500 font-medium">
                    Online
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Minimized Godmodel pill */}
          {showHeaderPill && !godmodelCompleted && (
            <motion.button
              layoutId="godmodelPrompt"
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowHeaderPill(false);
                setShowGodmodelPrompt(true);
              }}
              className="ml-auto px-2.5 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-violet-500 to-pink-500 text-white shadow hover:brightness-110"
            >
              {hasGodmodelProgress
                ? "Continue with Personality test"
                : "Personality test"}
            </motion.button>
          )}

          {/* My Personality shortcut appears when completed */}
          {godmodelCompleted && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowPersonalityResults(true);
              }}
              className="ml-2 inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-500 shadow hover:brightness-110"
              aria-label="Open My Personality"
            >
              {translate("kwame.myPersonality")}
            </button>
          )}
        </div>

        {/* Messages Area */}
        <div
          className={`flex-1 overflow-y-auto p-4 space-y-4 ${
            isDarkMode
              ? "bg-gradient-to-b from-transparent to-gray-900/20"
              : "bg-gradient-to-b from-transparent to-purple-50/20"
          }`}
        >
          <div className="text-center">
            <div
              className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                isDarkMode
                  ? "bg-gray-700/50 text-gray-300 backdrop-blur-sm"
                  : "bg-purple-100/70 text-purple-600 backdrop-blur-sm"
              }`}
            >
              Today
            </div>
          </div>

          {/* Loading History State */}
          {isLoadingHistory && (
            <div className="flex justify-center items-center py-8">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
                <span
                  className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
                >
                  {translate("kwame.loadingHistory")}
                </span>
              </div>
            </div>
          )}

          {/* Messages */}
          {!isLoadingHistory &&
            Array.isArray(messages) &&
            messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={
                  message.systemNote
                    ? "flex justify-center my-6"
                    : `flex ${message.isUser ? "justify-end" : "justify-start"}`
                }
              >
                {message.systemNote ? (
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="relative max-w-[85%] mx-auto"
                  >
                    {/* Ambient light effects */}
                    <div className="pointer-events-none absolute -inset-4 rounded-[2rem] bg-[radial-gradient(600px_200px_at_50%_0%,rgba(168,85,247,0.15),transparent_50%),radial-gradient(400px_150px_at_0%_50%,rgba(236,72,153,0.12),transparent_50%),radial-gradient(400px_150px_at_100%_50%,rgba(14,165,233,0.12),transparent_50%)] blur-lg" />

                    <div
                      className={`relative rounded-3xl p-6 shadow-2xl backdrop-blur-xl border overflow-hidden ${
                        isDarkMode
                          ? "bg-gradient-to-br from-violet-500/10 via-fuchsia-500/10 to-emerald-500/10 border-white/10"
                          : "bg-gradient-to-br from-violet-100/80 via-fuchsia-100/80 to-emerald-100/80 border-violet-200/50"
                      }`}
                    >
                      {/* Decorative elements */}
                      <div className="pointer-events-none absolute top-0 left-0 w-full h-full">
                        <div className="absolute top-3 left-3 w-2 h-2 rounded-full bg-violet-400/60 animate-pulse" />
                        <div
                          className="absolute top-6 right-8 w-1.5 h-1.5 rounded-full bg-fuchsia-400/60 animate-pulse"
                          style={{ animationDelay: "0.5s" }}
                        />
                        <div
                          className="absolute bottom-4 left-8 w-1 h-1 rounded-full bg-emerald-400/60 animate-pulse"
                          style={{ animationDelay: "1s" }}
                        />
                        <div
                          className="absolute bottom-6 right-4 w-1.5 h-1.5 rounded-full bg-cyan-400/60 animate-pulse"
                          style={{ animationDelay: "1.5s" }}
                        />
                      </div>

                      <div className="relative">
                        <div className="flex items-center justify-center mb-4">
                          <div
                            className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${
                              isDarkMode
                                ? "bg-violet-500/20 text-violet-300"
                                : "bg-violet-500/15 text-violet-700"
                            }`}
                          >
                            ✨ Personality Assessment Complete
                          </div>
                        </div>

                        <div
                          className={`text-sm leading-relaxed whitespace-pre-line ${isDarkMode ? "text-gray-200" : "text-gray-800"}`}
                        >
                          {message.content.split("\n").map((line, idx) =>
                            line.trim() ? (
                              <p key={idx} className={idx > 0 ? "mt-3" : ""}>
                                {line}
                              </p>
                            ) : (
                              <div key={idx} className="h-2" />
                            ),
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div
                    className={`max-w-[80%] ${message.isUser ? "order-2" : "order-1"}`}
                  >
                    <div
                      className={`rounded-2xl px-4 py-3 shadow-lg ${
                        message.isUser
                          ? "bg-gradient-to-r from-purple-500 via-purple-600 to-pink-500 text-white shadow-purple-500/25"
                          : isDarkMode
                            ? "bg-gradient-to-r from-gray-700 via-slate-700 to-gray-600 text-gray-100 shadow-gray-900/30 border border-gray-600/30"
                            : "bg-gradient-to-r from-white via-purple-50/30 to-pink-50/30 text-gray-900 shadow-purple-200/20 border border-purple-200/40 backdrop-blur-sm"
                      }`}
                    >
                      {message.kind === "styleChips" &&
                      Array.isArray(message.chips) ? (
                        <div className="space-y-2">
                          <p className="text-sm mb-2">{message.content}</p>
                          <div className="flex flex-col gap-3">
                            {message.chips.map((chip) => (
                              <button
                                key={chip}
                                type="button"
                                onClick={() =>
                                  handleStyleChipClick(chip, message.id)
                                }
                                className={chipClasses(isDarkMode)}
                              >
                                {chip}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : message.kind === "actionButtons" &&
                        Array.isArray(message.actionButtons) ? (
                        <div className="space-y-3">
                          <p className="text-sm leading-relaxed whitespace-pre-line">
                            {message.content}
                          </p>
                          <div className="flex flex-col gap-2">
                            {message.actionButtons.map((button, idx) => (
                              <button
                                key={`${button.action}-${idx}`}
                                type="button"
                                onClick={() =>
                                  handleActionButtonClick(button, message.id)
                                }
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                  isDarkMode
                                    ? "bg-purple-600/20 text-purple-300 border border-purple-500/30 hover:bg-purple-600/30 hover:border-purple-400/50"
                                    : "bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 hover:border-purple-300"
                                }`}
                              >
                                {button.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : // Render images inline if the content is an encoded image message
                      typeof message.content === "string" &&
                        message.content.startsWith("_!_IMAGE_!_") ? (
                        (() => {
                          const dataUrl = message.content.substring(
                            "_!_IMAGE_!_".length,
                          );
                          return (
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setExpandedImage(dataUrl)}
                                className="focus:outline-none"
                              >
                                <img
                                  src={dataUrl}
                                  alt="Shared image"
                                  className="max-w-full rounded-xl shadow-md hover:opacity-95 transition"
                                />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  downloadImage(
                                    dataUrl,
                                    message.isUser ? "sent" : "received",
                                  )
                                }
                                title="Download"
                                className={`absolute bottom-2 right-2 p-1.5 rounded-full shadow-md backdrop-blur-sm border text-xs flex items-center justify-center ${
                                  isDarkMode
                                    ? "bg-gray-800/80 border-gray-600/50 text-gray-200 hover:bg-gray-700"
                                    : "bg-white/80 border-purple-200/60 text-gray-800 hover:bg-white"
                                }`}
                              >
                                <Download className="h-4 w-4" />
                              </button>
                            </div>
                          );
                        })()
                      ) : (
                        <p className="text-sm leading-relaxed whitespace-pre-line">
                          {message.content}
                        </p>
                      )}
                    </div>

                    <div
                      className={`flex items-center mt-1 space-x-1 ${
                        message.isUser ? "justify-end" : "justify-start"
                      }`}
                    >
                      <span
                        className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                      >
                        {formatTime(message.timestamp)}
                      </span>
                      {message.isUser && message.status && (
                        <span
                          className={`text-xs ${
                            message.status === "read"
                              ? "text-blue-500"
                              : "text-gray-400"
                          }`}
                        >
                          {getMessageStatus(message.status)}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}

          {/* Godmodel prompt (appears once) */}
          <AnimatePresence>
            {showGodmodelPrompt && (
              <motion.div
                className="my-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <GodmodelTest
                  onClose={(hasProgress) => {
                    setHasGodmodelProgress(Boolean(hasProgress));
                    setShowGodmodelPrompt(false);
                    setShowHeaderPill(true);
                    setGodmodelDismissed(true);
                  }}
                  onMinimize={(hasProgress) => {
                    setHasGodmodelProgress(Boolean(hasProgress));
                    // Animate to header using shared layoutId
                    setShowGodmodelPrompt(false);
                    setShowHeaderPill(true);
                    setGodmodelDismissed(true);
                  }}
                  onComplete={() => {
                    setGodmodelCompleted(true);
                    setHasGodmodelProgress(true);
                    // Show the chat-side result guidance as a beautiful system note
                    const msg: KwameMessage = {
                      id: `sys-${Date.now()}`,
                      isUser: false,
                      timestamp: new Date(),
                      kind: "text",
                      systemNote: true,
                      content:
                        "Congratulations 🎉 You've completed your personality test. You can now access a detailed analysis of your personality assessment by clicking on the 'My Personality' tab at the top.\n\nAbout the Big Five (OCEAN):\n- Openness: creativity, imagination, curiosity, appreciation for art and new ideas.\n- Conscientiousness: organization, responsibility, goal‑orientation, self‑discipline.\n- Extraversion: sociability, assertiveness, enthusiasm, energy from social interaction.\n- Agreeableness: compassion, trust, cooperation, empathy and kindness.\n- Neuroticism (Emotional Stability): sensitivity to stress, mood variability, worry and emotional reactivity.\n\nWe'll help you interpret your profile across these dimensions and what they mean for work, relationships and growth.",
                    };
                    setMessages((prev) => (prev ? [...prev, msg] : [msg]));
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Typing indicator */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div
                className={`rounded-2xl px-4 py-3 shadow-lg ${
                  isDarkMode
                    ? "bg-gradient-to-r from-gray-700 via-slate-700 to-gray-600 shadow-gray-900/30 border border-gray-600/30"
                    : "bg-gradient-to-r from-white via-purple-50/30 to-pink-50/30 shadow-purple-200/20 border border-purple-200/40 backdrop-blur-sm"
                }`}
              >
                <div className="flex space-x-1">
                  <div
                    className={`w-2 h-2 rounded-full animate-bounce ${
                      isDarkMode ? "bg-purple-400" : "bg-purple-500"
                    }`}
                  ></div>
                  <div
                    className={`w-2 h-2 rounded-full animate-bounce ${
                      isDarkMode ? "bg-purple-400" : "bg-purple-500"
                    }`}
                    style={{ animationDelay: "0.1s" }}
                  ></div>
                  <div
                    className={`w-2 h-2 rounded-full animate-bounce ${
                      isDarkMode ? "bg-purple-400" : "bg-purple-500"
                    }`}
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Fullscreen Image Viewer */}
        {expandedImage && (
          <div
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
            role="dialog"
            aria-modal="true"
          >
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => downloadImage(expandedImage, "kwame-expanded")}
                className="p-2 rounded-full bg-white/90 text-gray-800 hover:bg-white shadow"
                title="Download"
              >
                <Download className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => setExpandedImage(null)}
                className="p-2 rounded-full bg-white/90 text-gray-800 hover:bg-white shadow"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => setExpandedImage(null)}
                className="focus:outline-none"
              >
                <img
                  src={expandedImage}
                  alt="Expanded"
                  className="max-w-[95vw] max-h-[95vh] rounded-xl shadow-2xl"
                />
              </button>
            </div>
          </div>
        )}

        {/* Message Input */}
        <div
          className={`p-4 border-t backdrop-blur-xl relative ${
            isDarkMode
              ? "bg-gradient-to-r from-gray-800/95 via-slate-800/95 to-gray-700/95 border-gray-600/30 shadow-xl shadow-purple-500/5"
              : "bg-gradient-to-r from-white/95 via-purple-50/80 to-pink-50/80 border-purple-200/30 shadow-xl shadow-purple-500/10"
          }`}
        >
          {/* Emoji Picker */}
          <AnimatePresence>
            {showEmojiPicker && (
              <motion.div
                ref={emojiPickerRef}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className={`absolute bottom-full left-4 right-4 mb-2 rounded-xl shadow-2xl border backdrop-blur-xl z-50 ${
                  isDarkMode
                    ? "bg-gradient-to-br from-gray-800/95 via-slate-800/95 to-gray-700/95 border-gray-600/30"
                    : "bg-gradient-to-br from-white/95 via-purple-50/80 to-pink-50/80 border-purple-200/30"
                }`}
                style={{ maxHeight: "240px" }}
              >
                {/* Category Tabs */}
                <div
                  className={`flex justify-center space-x-1 p-2 border-b ${
                    isDarkMode ? "border-gray-600/30" : "border-purple-200/30"
                  }`}
                >
                  {Object.keys(emojiCategories).map((categoryEmoji) => (
                    <button
                      key={categoryEmoji}
                      onClick={() => setActiveEmojiCategory(categoryEmoji)}
                      className={`w-8 h-8 flex items-center justify-center text-lg rounded-lg transition-all duration-200 ${
                        activeEmojiCategory === categoryEmoji
                          ? isDarkMode
                            ? "bg-purple-500/30 scale-110"
                            : "bg-purple-200/60 scale-110"
                          : isDarkMode
                            ? "hover:bg-gray-700/50 hover:scale-105"
                            : "hover:bg-purple-100/40 hover:scale-105"
                      }`}
                    >
                      {categoryEmoji}
                    </button>
                  ))}
                </div>

                {/* Emoji Grid */}
                <div
                  className="p-2 overflow-y-auto"
                  style={{ maxHeight: "140px" }}
                >
                  <div className="grid grid-cols-8 gap-1">
                    {emojiCategories[
                      activeEmojiCategory as keyof typeof emojiCategories
                    ]?.map((emoji, index) => (
                      <button
                        key={`${emoji}-${index}`}
                        onClick={() => handleEmojiSelect(emoji)}
                        className={`w-7 h-7 flex items-center justify-center text-base rounded-md transition-all duration-200 hover:scale-110 ${
                          isDarkMode
                            ? "hover:bg-purple-500/20"
                            : "hover:bg-purple-100/60"
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick Access Row */}
                <div
                  className={`px-2 py-1 border-t ${
                    isDarkMode ? "border-gray-600/30" : "border-purple-200/30"
                  }`}
                >
                  <div className="flex justify-center space-x-1">
                    {["😀", "❤️", "👍", "⚽", "🍎", "🚗"].map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => handleEmojiSelect(emoji)}
                        className={`w-7 h-7 flex items-center justify-center text-base rounded-md transition-all duration-200 hover:scale-110 ${
                          isDarkMode
                            ? "hover:bg-purple-500/20"
                            : "hover:bg-purple-100/60"
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center space-x-3">
            {!inputMessage.trim() && (
              <>
                <input
                  type="file"
                  id="kwame-photo-upload"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isUploading || isLoading}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    document.getElementById("kwame-photo-upload")?.click()
                  }
                  disabled={isUploading || isLoading}
                  className={`p-2 rounded-full transition-all duration-200 hover:scale-105 ${
                    isDarkMode
                      ? "text-purple-400 hover:text-purple-300 hover:bg-purple-500/20"
                      : "text-purple-500 hover:text-purple-600 hover:bg-purple-100"
                  }`}
                >
                  {isUploading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <FileImage className="h-5 w-5" />
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleStartCamera}
                  disabled={isUploading || isLoading}
                  className={`p-2 rounded-full transition-all duration-200 hover:scale-105 ${
                    isDarkMode
                      ? "text-purple-400 hover:text-purple-300 hover:bg-purple-500/20"
                      : "text-purple-500 hover:text-purple-600 hover:bg-purple-100"
                  }`}
                >
                  <Camera className="h-5 w-5" />
                </Button>
              </>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={toggleEmojiPicker}
              className={`p-2 rounded-full transition-all duration-200 hover:scale-105 ${
                showEmojiPicker
                  ? isDarkMode
                    ? "bg-purple-500/20 text-purple-300"
                    : "bg-purple-100 text-purple-600"
                  : isDarkMode
                    ? "hover:bg-purple-500/20 text-purple-400 hover:text-purple-300"
                    : "hover:bg-purple-100 text-purple-500 hover:text-purple-600"
              }`}
            >
              <Smile className="h-5 w-5" />
            </Button>

            <div className="flex-1">
              {(() => {
                // Localized input placeholder for KWAME chat
                const lang = currentLanguage?.code || "en";
                const placeholderByLang: Record<string, string> = {
                  fr: "Demande à KWAME tout sur les relations, l'amour ou la vie…",
                  es: "Pregúntale a KWAME sobre relaciones, amor o la vida…",
                  ak: " Bisa KWAME biribiara fa ayarehyɛ, ɔdɔ anaa asetenam ho…",
                  tw: " Bisa KWAME biribiara fa ayarehyɛ, ɔdɔ anaa asetenam ho…",
                  pt: "Pergunte ao KWAME qualquer coisa sobre relacionamentos ou vida…",
                  de: "Frag KWAME alles über Beziehungen, Liebe oder das Leben…",
                  it: "Chiedi a KWAME qualsiasi cosa su relazioni o sulla vita…",
                };
                var _kwamePlaceholder =
                  placeholderByLang[lang] ||
                  "Ask KWAME anything about relationships, dating, or life…";
                return null;
              })()}
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={
                  (currentLanguage?.code &&
                    (
                      {
                        fr: "Demande à KWAME tout sur les relations, l'amour ou la vie…",
                        es: "Pregúntale a KWAME sobre relaciones, amor o la vida…",
                        ak: "Bisa KWAME biribiara fa ayarehyɛ, ɔdɔ anaa asetenam ho…",
                        tw: "Bisa KWAME biribiara fa ayarehyɛ, ɔdɔ anaa asetenam ho…",
                        pt: "Pergunte ao KWAME qualquer coisa sobre relacionamentos ou vida…",
                        de: "Frag KWAME alles über Beziehungen, Liebe oder das Leben…",
                        it: "Chiedi a KWAME qualsiasi cosa su relazioni o sulla vita…",
                      } as Record<string, string>
                    )[currentLanguage.code]) ||
                  "Ask KWAME anything about relationships, dating, or life…"
                }
                className={`border-0 rounded-full px-4 py-3 shadow-lg transition-all duration-200 focus:ring-2 focus:ring-offset-0 ${
                  isDarkMode
                    ? "bg-gradient-to-r from-gray-700/80 via-slate-700/80 to-gray-600/80 text-white placeholder-gray-400 focus:ring-purple-500/50 backdrop-blur-sm border border-gray-600/30"
                    : "bg-gradient-to-r from-white/80 via-purple-50/50 to-pink-50/50 text-gray-900 placeholder-gray-500 focus:ring-purple-400/50 backdrop-blur-sm border border-purple-200/40 shadow-purple-200/20"
                }`}
                disabled={isLoading}
              />
            </div>

            <Button
              onClick={sendMessage}
              disabled={!inputMessage.trim() || isLoading}
              size="sm"
              className="bg-gradient-to-r from-purple-500 via-purple-600 to-pink-500 hover:from-purple-600 hover:via-purple-700 hover:to-pink-600 text-white p-3 rounded-full shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Camera Modal */}
      <AnimatePresence>
        {isCameraOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={handleCloseCamera}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-900 rounded-xl overflow-hidden shadow-2xl max-w-lg w-full"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Camera Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {translate("kwame.camera.title")}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCloseCamera}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Camera Preview */}
              <div className="relative bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-80 object-cover"
                />

                {/* Hidden canvas for capturing photos */}
                <canvas ref={canvasRef} className="hidden" />

                {/* Camera overlay */}
                <div className="absolute inset-0 pointer-events-none">
                  {/* Corner guides */}
                  <div className="absolute top-4 left-4 w-6 h-6 border-l-2 border-t-2 border-white/70"></div>
                  <div className="absolute top-4 right-4 w-6 h-6 border-r-2 border-t-2 border-white/70"></div>
                  <div className="absolute bottom-4 left-4 w-6 h-6 border-l-2 border-b-2 border-white/70"></div>
                  <div className="absolute bottom-4 right-4 w-6 h-6 border-r-2 border-b-2 border-white/70"></div>
                </div>
              </div>

              {/* Camera Controls */}
              <div className="p-6 bg-white dark:bg-gray-900">
                <div className="flex items-center justify-center space-x-4">
                  <Button
                    variant="outline"
                    onClick={handleCloseCamera}
                    className="px-6 py-2 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    {translate("kwame.camera.cancel")}
                  </Button>
                  <Button
                    onClick={handleCapturePhoto}
                    className="px-8 py-2 bg-gradient-to-r from-purple-500 via-purple-600 to-pink-500 hover:from-purple-600 hover:via-purple-700 hover:to-pink-600 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all duration-200"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    {translate("kwame.camera.captureButton")}
                  </Button>
                </div>
                <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-3">
                  {translate("kwame.camera.instructions")}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Personality Results Dialog */}
      <PersonalityResultsDialog
        isOpen={showPersonalityResults}
        onClose={() => setShowPersonalityResults(false)}
      />
    </LayoutGroup>
  );
}
