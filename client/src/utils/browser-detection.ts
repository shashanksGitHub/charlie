/**
 * Browser Detection Utilities for Safari/Edge Compatibility
 */

export interface BrowserInfo {
  isSafari: boolean;
  isEdge: boolean;
  isChrome: boolean;
  isFirefox: boolean;
  isMobile: boolean;
  supportsModernCSS: boolean;
  version: string;
}

/**
 * Detect browser type and capabilities
 */
export function detectBrowser(): BrowserInfo {
  const userAgent = navigator.userAgent.toLowerCase();
  
  // Safari detection (including mobile Safari)
  const isSafari = /safari/.test(userAgent) && !/chrome/.test(userAgent) && !/chromium/.test(userAgent);
  
  // Edge detection (both legacy and Chromium-based)
  const isEdge = /edg/.test(userAgent) || /edge/.test(userAgent);
  
  // Chrome detection
  const isChrome = /chrome/.test(userAgent) && !/edg/.test(userAgent) && !/opr/.test(userAgent);
  
  // Firefox detection
  const isFirefox = /firefox/.test(userAgent);
  
  // Mobile detection
  const isMobile = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(userAgent);
  
  // Check for modern CSS support
  const supportsModernCSS = !isSafari && !isEdge;
  
  // Extract version info
  let version = 'unknown';
  if (isSafari) {
    const match = userAgent.match(/version\/([0-9.]+)/);
    version = match ? match[1] : 'unknown';
  } else if (isEdge) {
    const match = userAgent.match(/edg\/([0-9.]+)/);
    version = match ? match[1] : 'unknown';
  } else if (isChrome) {
    const match = userAgent.match(/chrome\/([0-9.]+)/);
    version = match ? match[1] : 'unknown';
  } else if (isFirefox) {
    const match = userAgent.match(/firefox\/([0-9.]+)/);
    version = match ? match[1] : 'unknown';
  }
  
  return {
    isSafari,
    isEdge,
    isChrome,
    isFirefox,
    isMobile,
    supportsModernCSS,
    version
  };
}

/**
 * Check if browser needs compatibility mode
 */
export function needsCompatibilityMode(): boolean {
  const browser = detectBrowser();
  return browser.isSafari || browser.isEdge;
}

/**
 * Get CSS class suffix for browser compatibility
 */
export function getBrowserCSSClass(): string {
  const browser = detectBrowser();
  
  if (browser.isSafari || browser.isEdge) {
    return '-safari'; // Use Safari-compatible CSS classes
  }
  
  return ''; // Use default modern CSS classes
}

/**
 * Check if browser supports specific CSS features
 */
export function checkCSSSupport() {
  const features = {
    transform3d: false,
    willChange: false,
    backfaceVisibility: false,
    perspective: false,
    cubicBezier: false
  };
  
  try {
    const testElement = document.createElement('div');
    
    // Test transform3d support
    testElement.style.transform = 'translate3d(0,0,0)';
    features.transform3d = testElement.style.transform === 'translate3d(0px, 0px, 0px)' || 
                           testElement.style.transform === 'translate3d(0, 0, 0)';
    
    // Test will-change support
    testElement.style.willChange = 'transform';
    features.willChange = testElement.style.willChange === 'transform';
    
    // Test backface-visibility support
    testElement.style.backfaceVisibility = 'hidden';
    features.backfaceVisibility = testElement.style.backfaceVisibility === 'hidden';
    
    // Test perspective support
    testElement.style.perspective = '1000px';
    features.perspective = testElement.style.perspective === '1000px';
    
    // Test cubic-bezier support
    testElement.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
    features.cubicBezier = testElement.style.transition.includes('cubic-bezier');
    
  } catch (error) {
    console.warn('[BROWSER-COMPAT] CSS feature detection failed:', error);
  }
  
  return features;
}

/**
 * Log browser compatibility info for debugging
 */
export function logBrowserInfo(): void {
  const browser = detectBrowser();
  const cssSupport = checkCSSSupport();
  
  console.log('[BROWSER-COMPAT] Browser Detection:', {
    browser: browser,
    cssSupport: cssSupport,
    userAgent: navigator.userAgent
  });
  
  if (browser.isSafari) {
    console.warn('[BROWSER-COMPAT] Safari detected - using compatibility mode');
  }
  
  if (browser.isEdge) {
    console.warn('[BROWSER-COMPAT] Edge detected - using compatibility mode');
  }
}