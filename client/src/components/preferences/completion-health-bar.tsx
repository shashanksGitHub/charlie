import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

interface CompletionHealthBarProps {
  title: string;
  percentage: number;
  missingFields: string[];
  themeColor: string;
  onBadgeClick: (field: string) => void;
}

export const CompletionHealthBar = ({
  title,
  percentage,
  missingFields,
  themeColor,
  onBadgeClick
}: CompletionHealthBarProps) => {
  const getThemeClasses = () => {
    switch (themeColor) {
      case 'blue': return {
        gradient: 'from-blue-500 to-cyan-500',
        text: 'text-blue-400',
        bg: 'bg-blue-500/20',
        border: 'border-blue-500/30'
      };
      case 'violet': return {
        gradient: 'from-violet-500 to-purple-500',
        text: 'text-violet-400',
        bg: 'bg-violet-500/20',
        border: 'border-violet-500/30'
      };
      case 'emerald': return {
        gradient: 'from-emerald-500 to-teal-500',
        text: 'text-emerald-400',
        bg: 'bg-emerald-500/20',
        border: 'border-emerald-500/30'
      };
      case 'pink': return {
        gradient: 'from-pink-500 to-rose-500',
        text: 'text-pink-400',
        bg: 'bg-pink-500/20',
        border: 'border-pink-500/30'
      };
      default: return {
        gradient: 'from-gray-500 to-gray-600',
        text: 'text-gray-400',
        bg: 'bg-gray-500/20',
        border: 'border-gray-500/30'
      };
    }
  };

  const theme = getThemeClasses();

  return (
    <div className={`p-4 rounded-xl border ${theme.bg} ${theme.border} backdrop-blur-sm`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className={`font-semibold ${theme.text}`}>{title} Profile Health</h3>
        <div className="flex items-center gap-2">
          {percentage === 100 && (
            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
              <Check className="w-3 h-3 text-white" />
            </div>
          )}
          <span className={`text-sm font-medium ${theme.text}`}>
            {percentage}%
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-800 rounded-full h-2 mb-3">
        <motion.div
          className={`h-2 rounded-full bg-gradient-to-r ${theme.gradient}`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>

      {/* Missing Fields Badges */}
      {missingFields.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-400">Missing fields:</p>
          <div className="flex flex-wrap gap-1">
            {missingFields.map((field, index) => (
              <Badge
                key={index}
                variant="outline"
                className={`text-xs cursor-pointer transition-all duration-200 hover:scale-105 ${theme.border} ${theme.text} bg-black/40 hover:bg-black/60`}
                onClick={() => onBadgeClick(field)}
              >
                {field}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};