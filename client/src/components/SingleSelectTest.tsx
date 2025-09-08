import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Check, Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Single Select Field Component for Geographic Location
export function SingleSelectField({ 
  title, 
  description, 
  icon: Icon, 
  options = [], 
  value, 
  onChange, 
  colorClass = "bg-blue-500 hover:bg-blue-600",
  allowCustomInput = false 
}: {
  title: string;
  description: string;
  icon: any;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  colorClass?: string;
  allowCustomInput?: boolean;
}) {
  console.log('🔧 GEOGRAPHIC DEBUG - SingleSelectField rendering:', {
    title,
    description,
    options: options.length,
    value,
    colorClass
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [customInputValue, setCustomInputValue] = useState('');

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOptionSelect = (optionValue: string) => {
    console.log('🔧 GEOGRAPHIC DEBUG - handleOptionSelect called:', {
      optionValue,
      currentValue: value,
      isToggleOff: value === optionValue
    });
    
    if (value === optionValue) {
      // If already selected, deselect it
      console.log('🔧 GEOGRAPHIC DEBUG - Deselecting option');
      onChange('');
    } else {
      // Select the new option
      console.log('🔧 GEOGRAPHIC DEBUG - Selecting new option:', optionValue);
      onChange(optionValue);
    }
    setSearchTerm('');
  };

  const handleCustomInput = () => {
    if (customInputValue.trim()) {
      onChange(customInputValue.trim());
      setCustomInputValue('');
      setSearchTerm('');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          type="text"
          placeholder={`Search ${title.toLowerCase()}...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-white/5 border-white/20 text-white placeholder-gray-400 h-10"
        />
      </div>

      {/* Options grid */}
      <div className="grid grid-cols-2 gap-2">
        {filteredOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => {
              console.log('🔧 GEOGRAPHIC DEBUG - Button clicked for option:', option.value);
              handleOptionSelect(option.value);
            }}
            className={`
              relative w-full p-3 rounded-xl text-left transition-all duration-200 border
              ${value === option.value
                ? `${colorClass} border-white/30 text-white shadow-lg`
                : 'bg-white/5 border-white/20 text-gray-300 hover:bg-white/10 hover:border-white/30'
              }
            `}
          >
            {/* Glow effect for selected item */}
            {value === option.value && (
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 blur-md" />
            )}
            
            <span className="relative z-10 text-xs truncate">{option.label}</span>
            {value === option.value && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-2 right-2 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center"
              >
                <Check className="w-3 h-3 text-white" />
              </motion.div>
            )}
          </button>
        ))}
      </div>

      {/* No results message */}
      {searchTerm && filteredOptions.length === 0 && (
        <div className="text-center py-4 text-gray-400 text-sm">
          No options found matching "{searchTerm}"
        </div>
      )}

      {/* Custom input section */}
      {allowCustomInput && (
        <div className="border-t border-white/10 pt-4">
          <div className="flex items-center gap-2">
            <Input
              type="text"
              placeholder="Add custom option..."
              value={customInputValue}
              onChange={(e) => setCustomInputValue(e.target.value)}
              className="flex-1 bg-white/5 border-white/20 text-white placeholder-gray-400 h-8 text-xs"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleCustomInput();
                }
              }}
            />
            <Button
              size="sm"
              onClick={handleCustomInput}
              disabled={!customInputValue.trim()}
              className="h-8 px-3 text-xs bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add
            </Button>
          </div>
        </div>
      )}
      
      {/* Display selected item */}
      {value && (
        <div className="mt-4 pt-3 border-t border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-300">Selected</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onChange('')}
              className="h-5 text-[10px] text-gray-400 hover:text-white hover:bg-white/10 px-2"
            >
              <X className="h-2 w-2 mr-1" />
              Clear
            </Button>
          </div>
          <div className="flex flex-wrap gap-1">
            <Badge 
              variant="secondary" 
              className={`${colorClass} text-white text-[10px] px-2 py-1 flex items-center gap-1`}
            >
              {options.find(opt => opt.value === value)?.label || value}
            </Badge>
          </div>
        </div>
      )}
    </motion.div>
  );
}