/**
 * Safari and Edge compatibility fixes for CSS transforms and animations
 */

import { detectBrowser } from './browser-detection';

/**
 * Get safe transform values for Safari/Edge compatibility
 */
export function getSafeTransform(originalTransform: string): string {
  const browser = detectBrowser();
  
  if (browser.isSafari || browser.isEdge) {
    // Replace complex perspective transforms with simpler ones
    if (originalTransform.includes('perspective(')) {
      // Remove perspective transforms and use simpler scale/translate
      return originalTransform
        .replace(/perspective\([^)]*\)\s*/g, '')
        .replace(/rotateX\([^)]*\)\s*/g, '')
        .replace(/rotateY\([^)]*\)\s*/g, '')
        .replace(/rotateZ\([^)]*\)\s*/g, '');
    }
    
    // Replace translate3d with translate for Safari compatibility
    if (originalTransform.includes('translate3d(')) {
      return originalTransform.replace(/translate3d\(([^,]+),\s*([^,]+),\s*[^)]+\)/g, 'translate($1, $2)');
    }
  }
  
  return originalTransform;
}

/**
 * Apply Safari-compatible styles to element
 */
export function applySafeStyles(element: HTMLElement, styles: Record<string, string>): void {
  const browser = detectBrowser();
  
  Object.entries(styles).forEach(([property, value]) => {
    if (property === 'transform') {
      element.style.transform = getSafeTransform(value);
    } else if (property === 'transition' && (browser.isSafari || browser.isEdge)) {
      // Simplify complex cubic-bezier transitions for Safari/Edge
      const simplifiedTransition = value.replace(
        /cubic-bezier\([^)]+\)/g, 
        'ease'
      );
      element.style.transition = simplifiedTransition;
    } else {
      element.style.setProperty(property, value);
    }
  });
}

/**
 * Create a Safari-compatible button handler
 */
export function createSafeButtonHandler(
  element: HTMLElement,
  hoverStyles: Record<string, string>,
  normalStyles: Record<string, string>
): { onMouseOver: () => void; onMouseOut: () => void } {
  return {
    onMouseOver: () => applySafeStyles(element, hoverStyles),
    onMouseOut: () => applySafeStyles(element, normalStyles)
  };
}

/**
 * Check if browser supports specific CSS features
 */
export function getCompatibleAnimationClass(baseClass: string): string {
  const browser = detectBrowser();
  
  if (browser.isSafari || browser.isEdge) {
    const compatibilityMap: Record<string, string> = {
      'animate-pulse-slow': 'animate-pulse-slow-safari',
      'animate-shimmer': 'animate-shimmer-safari',
      'fast-appear': 'fast-appear-safari',
      'super-reliable-fade-in': 'reliable-fade-in-safari',
      'compatibility-score': 'compatibility-score-safari',
      'swipe-button': 'swipe-button-safari'
    };
    
    return compatibilityMap[baseClass] || baseClass;
  }
  
  return baseClass;
}

/**
 * Initialize Safari/Edge compatibility fixes
 */
export function initializeBrowserCompat(): void {
  const browser = detectBrowser();
  
  if (browser.isSafari || browser.isEdge) {
    console.log(`[BROWSER-COMPAT] Initializing ${browser.isSafari ? 'Safari' : 'Edge'} compatibility mode`);
    
    // Add CSS class to body for Safari/Edge specific styles
    document.body.classList.add('browser-compat-mode');
    
    if (browser.isSafari) {
      document.body.classList.add('safari-mode');
    }
    
    if (browser.isEdge) {
      document.body.classList.add('edge-mode');
    }
  }
}