import { Slider } from "@/components/ui/slider";
import { WeightSlidersProps } from "./types";

export function WeightSliders({ title, weightCategories, values, onChange, theme }: WeightSlidersProps) {
  const themeClasses = {
    blue: {
      gradient: "from-blue-500 to-cyan-500",
      border: "border-blue-500/30",
      text: "text-blue-400"
    },
    violet: {
      gradient: "from-violet-500 to-purple-500",
      border: "border-violet-500/30",
      text: "text-violet-400"
    },
    emerald: {
      gradient: "from-emerald-500 to-teal-500",
      border: "border-emerald-500/30",
      text: "text-emerald-400"
    },
    pink: {
      gradient: "from-pink-500 to-rose-500",
      border: "border-pink-500/30",
      text: "text-pink-400"
    }
  };

  const currentTheme = themeClasses[theme as keyof typeof themeClasses] || themeClasses.blue;

  const getIntensityLabel = (value: number) => {
    if (value === 1) return "Low Priority";
    if (value === 2) return "Some Priority";
    if (value === 3) return "Important";
    if (value === 4) return "High Priority";
    if (value === 5) return "Critical";
    return "Not Set";
  };

  const handleSliderChange = (key: string, newValue: number[]) => {
    onChange({
      ...values,
      [key]: newValue[0]
    });
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-400 mb-4">
        Adjust priority levels from 1 (lowest) to 5 (highest importance)
      </div>
      
      <div className="space-y-6">
        {weightCategories.map(({ key, label }) => (
          <div key={key} className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-gray-200">
                {label}
              </label>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-medium ${currentTheme.text}`}>
                  {getIntensityLabel(values[key] || 3)}
                </span>
                <span className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded min-w-[24px] text-center">
                  {values[key] || 3}
                </span>
              </div>
            </div>
            
            <div className="px-2">
              <Slider
                value={[values[key] || 3]}
                onValueChange={(newValue) => handleSliderChange(key, newValue)}
                max={5}
                min={1}
                step={1}
                className="w-full"
                style={{
                  "--slider-track": `linear-gradient(to right, ${currentTheme.gradient})`,
                  "--slider-range": `linear-gradient(to right, ${currentTheme.gradient})`,
                  "--slider-thumb": currentTheme.border
                } as any}
              />
            </div>
            
            <div className="flex justify-between text-xs text-gray-500 px-2">
              <span>Low Priority</span>
              <span>Critical</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}