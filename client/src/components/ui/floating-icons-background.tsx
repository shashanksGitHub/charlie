import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Heart, 
  MessageCircle, 
  Users, 
  Smile, 
  Star, 
  Crown, 
  Coffee, 
  Gift, 
  Music,
  Book
} from 'lucide-react';

// Types for the component props
interface FloatingIconsProps {
  count?: number;
  color?: string;
  opacityRange?: [number, number];
  sizeRange?: [number, number];
  speedRange?: [number, number];
  className?: string;
}

// Define available icons with their components
const availableIcons = [
  { id: 'heart', component: Heart },
  { id: 'message', component: MessageCircle },
  { id: 'users', component: Users },
  { id: 'smile', component: Smile },
  { id: 'star', component: Star },
  { id: 'crown', component: Crown },
  { id: 'coffee', component: Coffee },
  { id: 'gift', component: Gift },
  { id: 'music', component: Music },
  { id: 'book', component: Book }
];

export function FloatingIconsBackground({
  count = 8,
  color = 'rgba(99, 102, 241, 1)',  // Indigo by default
  opacityRange = [0.1, 0.3],
  sizeRange = [20, 36],
  speedRange = [20, 40],
  className = '',
}: FloatingIconsProps) {
  const [icons, setIcons] = useState<any[]>([]);

  useEffect(() => {
    // Generate floating icons with random positions and animations
    const generatedIcons = Array.from({ length: count }).map((_, index) => {
      // Random positions
      const x = Math.random() * 100;
      const y = Math.random() * 100;

      // Random icon from available ones
      const randomIconIndex = Math.floor(Math.random() * availableIcons.length);
      const Icon = availableIcons[randomIconIndex].component;

      // Random opacity from the range
      const opacity = opacityRange[0] + Math.random() * (opacityRange[1] - opacityRange[0]);
      
      // Random size from the range
      const size = sizeRange[0] + Math.random() * (sizeRange[1] - sizeRange[0]);
      
      // Random animation duration from the speed range
      const duration = speedRange[0] + Math.random() * (speedRange[1] - speedRange[0]);
      
      // Random initial rotation and rotation direction
      const rotate = Math.random() * 360;
      const rotateDirection = Math.random() > 0.5 ? 1 : -1;
      
      return {
        id: index,
        x,
        y,
        Icon,
        opacity,
        size,
        duration,
        rotate,
        rotateDirection
      };
    });
    
    setIcons(generatedIcons);
  }, [count, opacityRange, sizeRange, speedRange]);

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {icons.map((icon) => (
        <motion.div
          key={icon.id}
          className="absolute"
          style={{
            left: `${icon.x}%`,
            top: `${icon.y}%`,
            opacity: icon.opacity,
          }}
          animate={{
            x: [
              '0%', 
              `${(Math.random() * 20 - 10)}%`, 
              `${(Math.random() * 15 - 7.5)}%`, 
              '0%'
            ],
            y: [
              '0%', 
              `${(Math.random() * 20 - 10)}%`, 
              `${(Math.random() * 15 - 7.5)}%`, 
              '0%'
            ],
            rotate: [0, icon.rotate * icon.rotateDirection, 0],
            opacity: [icon.opacity, icon.opacity * 1.5, icon.opacity],
          }}
          transition={{
            duration: icon.duration,
            repeat: Infinity,
            ease: "easeInOut",
            repeatType: "reverse",
          }}
        >
          <icon.Icon 
            size={icon.size} 
            color={color}
            strokeWidth={1.5}
          />
        </motion.div>
      ))}
    </div>
  );
}