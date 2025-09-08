import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Check, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";

interface SectionAccordionProps {
  title: string;
  isCompleted: boolean;
  themeColor: string;
  children: React.ReactNode;
  value: string;
  defaultExpanded?: boolean;
}

export const SectionAccordion = ({
  title,
  isCompleted,
  themeColor,
  children,
  value,
  defaultExpanded = false
}: SectionAccordionProps) => {
  const getThemeClasses = () => {
    switch (themeColor) {
      case 'blue': return {
        gradient: 'from-blue-500/20 to-cyan-500/20',
        border: 'border-blue-500/30',
        text: 'text-blue-300',
        accent: 'text-blue-400'
      };
      case 'violet': return {
        gradient: 'from-violet-500/20 to-purple-500/20',
        border: 'border-violet-500/30',
        text: 'text-violet-300',
        accent: 'text-violet-400'
      };
      case 'emerald': return {
        gradient: 'from-emerald-500/20 to-teal-500/20',
        border: 'border-emerald-500/30',
        text: 'text-emerald-300',
        accent: 'text-emerald-400'
      };
      case 'pink': return {
        gradient: 'from-pink-500/20 to-rose-500/20',
        border: 'border-pink-500/30',
        text: 'text-pink-300',
        accent: 'text-pink-400'
      };
      default: return {
        gradient: 'from-gray-500/20 to-gray-600/20',
        border: 'border-gray-500/30',
        text: 'text-gray-300',
        accent: 'text-gray-400'
      };
    }
  };

  const theme = getThemeClasses();

  return (
    <AccordionItem 
      value={value}
      className={`border rounded-xl bg-gradient-to-br ${theme.gradient} ${theme.border} backdrop-blur-sm overflow-hidden`}
    >
      <AccordionTrigger className={`px-4 py-3 hover:no-underline group transition-all duration-200 ${theme.text}`}>
        <div className="flex items-center gap-3 w-full">
          <div className="flex items-center gap-2 flex-1">
            <span className={`font-medium text-sm tracking-wide ${theme.accent}`}>
              {title}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {isCompleted && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center"
              >
                <Check className="w-3 h-3 text-white" />
              </motion.div>
            )}
            <ChevronDown className="w-4 h-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </div>
        </div>
      </AccordionTrigger>
      
      <AccordionContent className="px-4 pb-4">
        <div className="pt-2">
          {children}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
};