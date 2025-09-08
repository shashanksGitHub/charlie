import React, { useEffect, useState } from 'react';

interface FireworkParticle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface FireworksProps {
  isActive: boolean;
  duration?: number; // Duration in milliseconds
  onComplete?: () => void;
}

export const Fireworks: React.FC<FireworksProps> = ({ 
  isActive, 
  duration = 5000, 
  onComplete 
}) => {
  const [particles, setParticles] = useState<FireworkParticle[]>([]);
  const [animationId, setAnimationId] = useState<number | null>(null);
  const [flashActive, setFlashActive] = useState(false);
  const [flashIntensity, setFlashIntensity] = useState(0.9);

  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
    '#FF4500', '#FF6347', '#FFD700', '#FFA500', '#FF1493',
    '#00CED1', '#7FFF00', '#FF69B4', '#32CD32', '#FF8C00'
  ];

  const fireColors = [
    '#FF4500', '#FF6347', '#FF0000', '#FFD700', '#FFA500',
    '#FF1493', '#DC143C', '#B22222', '#FF8C00', '#FF7F50'
  ];

  const starColors = [
    '#FFD700', '#FFFF00', '#FFFFFF', '#FFF8DC', '#F0E68C'
  ];

  const heartColors = [
    '#FF69B4', '#FF1493', '#DC143C', '#FF6347', '#FF4500'
  ];

  const confettiColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
  ];

  const createFirework = (x: number, y: number, timestamp: number) => {
    const newParticles: FireworkParticle[] = [];
    const particleCount = 15; // Increased for more spectacular effect
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const speed = Math.random() * 4 + 2;
      
      newParticles.push({
        id: `fw-${timestamp}-${i}`,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 60,
        maxLife: 60,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 5 + 3
      });
    }
    
    return newParticles;
  };

  const createFireExplosion = (x: number, y: number, timestamp: number) => {
    const newParticles: FireworkParticle[] = [];
    const particleCount = 20; // Increased for more dramatic effect
    
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 2;
      
      newParticles.push({
        id: `fire-${timestamp}-${i}`,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - Math.random() * 2,
        life: 50,
        maxLife: 50,
        color: fireColors[Math.floor(Math.random() * fireColors.length)],
        size: Math.random() * 6 + 4
      });
    }
    
    return newParticles;
  };

  const createSparkShower = (x: number, y: number, timestamp: number) => {
    const newParticles: FireworkParticle[] = [];
    const particleCount = 25; // Increased for more dazzling effect
    
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 1;
      
      newParticles.push({
        id: `spark-${timestamp}-${i}`,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 45,
        maxLife: 45,
        color: starColors[Math.floor(Math.random() * starColors.length)],
        size: Math.random() * 4 + 2
      });
    }
    
    return newParticles;
  };

  const createHeartExplosion = (x: number, y: number, timestamp: number) => {
    const newParticles: FireworkParticle[] = [];
    const particleCount = 12;
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const speed = Math.random() * 3 + 1;
      
      newParticles.push({
        id: `heart-${timestamp}-${i}`,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 70,
        maxLife: 70,
        color: heartColors[Math.floor(Math.random() * heartColors.length)],
        size: Math.random() * 8 + 6
      });
    }
    
    return newParticles;
  };

  const createConfettiRain = (x: number, y: number, timestamp: number) => {
    const newParticles: FireworkParticle[] = [];
    const particleCount = 30;
    
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 0.5 + Math.PI * 0.25; // Downward cone
      const speed = Math.random() * 3 + 1;
      
      newParticles.push({
        id: `confetti-${timestamp}-${i}`,
        x: x + (Math.random() - 0.5) * 100,
        y,
        vx: Math.cos(angle) * speed * (Math.random() > 0.5 ? 1 : -1),
        vy: Math.sin(angle) * speed,
        life: 90,
        maxLife: 90,
        color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
        size: Math.random() * 4 + 2
      });
    }
    
    return newParticles;
  };

  const createStarBurst = (x: number, y: number, timestamp: number) => {
    const newParticles: FireworkParticle[] = [];
    const particleCount = 8;
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const speed = Math.random() * 4 + 3;
      
      newParticles.push({
        id: `star-${timestamp}-${i}`,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 80,
        maxLife: 80,
        color: starColors[Math.floor(Math.random() * starColors.length)],
        size: Math.random() * 6 + 8
      });
    }
    
    return newParticles;
  };

  const updateParticles = (currentParticles: FireworkParticle[]) => {
    return currentParticles
      .map(particle => ({
        ...particle,
        x: particle.x + particle.vx,
        y: particle.y + particle.vy,
        vy: particle.vy + 0.1, // gravity
        life: particle.life - 1
      }))
      .filter(particle => particle.life > 0);
  };

  useEffect(() => {
    if (!isActive) {
      if (animationId) {
        cancelAnimationFrame(animationId);
        setAnimationId(null);
      }
      setParticles([]);
      return;
    }

    const startTime = Date.now();
    let lastFireworkTime = 0;

    const animate = () => {
      const currentTime = Date.now();
      const elapsed = currentTime - startTime;

      // Create new fireworks every 400ms for more spectacular show
      if (currentTime - lastFireworkTime > 400) {
        // Trigger paparazzi camera flash effect with random intensity
        const intensity = 0.7 + Math.random() * 0.3; // Random intensity between 0.7-1.0
        setFlashIntensity(intensity);
        setFlashActive(true);
        
        // Random flash duration between 80-150ms for realism
        const flashDuration = 80 + Math.random() * 70;
        setTimeout(() => setFlashActive(false), flashDuration);
        
        // Sometimes add a double flash (paparazzi effect)
        if (Math.random() < 0.3) {
          setTimeout(() => {
            setFlashActive(true);
            setTimeout(() => setFlashActive(false), 60);
          }, flashDuration + 50);
        }
        
        setParticles(prev => {
          const newParticles = [];
          const timestamp = currentTime;
          
          // Create only 1 explosion for best performance
          const x = Math.random() * window.innerWidth;
          const y = Math.random() * (window.innerHeight * 0.6) + window.innerHeight * 0.1;
          
          const explosionType = Math.random();
          if (explosionType < 0.2) {
            // 20% chance for regular fireworks
            newParticles.push(...createFirework(x, y, timestamp));
          } else if (explosionType < 0.35) {
            // 15% chance for fire explosions
            newParticles.push(...createFireExplosion(x, y, timestamp));
          } else if (explosionType < 0.5) {
            // 15% chance for spark showers
            newParticles.push(...createSparkShower(x, y, timestamp));
          } else if (explosionType < 0.65) {
            // 15% chance for heart explosions
            newParticles.push(...createHeartExplosion(x, y, timestamp));
          } else if (explosionType < 0.8) {
            // 15% chance for confetti rain
            newParticles.push(...createConfettiRain(x, y, timestamp));
          } else {
            // 20% chance for star bursts
            newParticles.push(...createStarBurst(x, y, timestamp));
          }
          
          return [...prev, ...newParticles];
        });
        lastFireworkTime = currentTime;
      }

      // Update existing particles
      setParticles(prev => updateParticles(prev));

      // Stop after duration
      if (elapsed < duration) {
        const id = requestAnimationFrame(animate);
        setAnimationId(id);
      } else {
        setParticles([]);
        onComplete?.();
      }
    };

    animate();

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [isActive, duration, onComplete]);

  if (!isActive && particles.length === 0) return null;

  return (
    <>
      {/* Paparazzi Camera Flash Effect */}
      {flashActive && (
        <div 
          className="fixed inset-0 pointer-events-none z-[9998] bg-white"
          style={{
            animation: 'camera-flash 120ms ease-out',
            opacity: flashIntensity
          }}
        />
      )}
      
      {/* Fireworks Container */}
      <div className="fixed inset-0 pointer-events-none z-[9999]">
        {particles.map(particle => {
        const isHeart = particle.id.startsWith('heart-');
        const isConfetti = particle.id.startsWith('confetti-');
        const isStar = particle.id.startsWith('star-');
        const isFire = particle.id.startsWith('fire-');
        const isSpark = particle.id.startsWith('spark-');
        const opacity = particle.life / particle.maxLife;
        
        // Enhanced effects for different particle types
        let boxShadow = `0 0 ${particle.size * 2}px ${particle.color}`;
        let borderRadius = '50%';
        let transform = 'translate(-50%, -50%)';
        
        if (isHeart) {
          // Heart-shaped particles with pulsing glow
          borderRadius = '50% 50% 50% 50% / 60% 60% 40% 40%';
          boxShadow = `0 0 ${particle.size * 3}px ${particle.color}, 0 0 ${particle.size * 1.5}px ${particle.color}`;
          transform = 'translate(-50%, -50%) rotate(45deg)';
        } else if (isConfetti) {
          // Rectangular confetti pieces
          borderRadius = '2px';
          transform = `translate(-50%, -50%) rotate(${Math.sin(particle.life * 0.1) * 180}deg)`;
        } else if (isStar) {
          // Star-shaped particles with bright glow
          borderRadius = '50%';
          boxShadow = `0 0 ${particle.size * 4}px ${particle.color}, 0 0 ${particle.size * 2}px #ffffff`;
          transform = `translate(-50%, -50%) rotate(${particle.life * 5}deg)`;
        } else if (isFire) {
          // Fire particles with intense glow
          boxShadow = `0 0 ${particle.size * 3}px ${particle.color}, 0 0 ${particle.size}px #ff4500`;
        } else if (isSpark) {
          // Sparkling particles with twinkling effect
          boxShadow = `0 0 ${particle.size * 4}px ${particle.color}, 0 0 ${particle.size * 2}px #ffffff`;
        }
        
        return (
          <div
            key={particle.id}
            className="absolute"
            style={{
              left: `${particle.x}px`,
              top: `${particle.y}px`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              backgroundColor: particle.color,
              opacity,
              boxShadow,
              borderRadius,
              transform
            }}
          />
        );
      })}
      </div>
    </>
  );
};

export default Fireworks;