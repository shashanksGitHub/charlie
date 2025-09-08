/**
 * Enhanced browser debugging and compatibility logging for Safari/Edge issues
 */

import { detectBrowser } from './browser-detection';

interface BrowserIssue {
  type: 'css' | 'js' | 'network' | 'animation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  browser: string;
  timestamp: Date;
  context?: any;
}

class BrowserDebugLogger {
  private issues: BrowserIssue[] = [];
  private browserInfo = detectBrowser();

  constructor() {
    this.initializeLogging();
  }

  private initializeLogging() {
    if (this.browserInfo.isSafari || this.browserInfo.isEdge) {
      console.group(`[BROWSER-DEBUG] ${this.browserInfo.isSafari ? 'Safari' : 'Edge'} Compatibility Mode Active`);
      console.log('Browser:', this.browserInfo);
      console.log('Version:', this.browserInfo.version);
      console.log('Mobile:', this.browserInfo.isMobile);
      console.log('Modern CSS Support:', this.browserInfo.supportsModernCSS);
      console.groupEnd();
    }
  }

  logIssue(type: BrowserIssue['type'], severity: BrowserIssue['severity'], description: string, context?: any) {
    const issue: BrowserIssue = {
      type,
      severity,
      description,
      browser: this.browserInfo.isSafari ? 'Safari' : this.browserInfo.isEdge ? 'Edge' : 'Other',
      timestamp: new Date(),
      context
    };

    this.issues.push(issue);

    const prefix = severity === 'critical' ? '🚨' : severity === 'high' ? '⚠️' : severity === 'medium' ? '🔶' : 'ℹ️';
    console.warn(`${prefix} [BROWSER-${type.toUpperCase()}] ${description}`, context || '');
  }

  logSwipeCardLoad() {
    if (this.browserInfo.isSafari || this.browserInfo.isEdge) {
      console.log(`[SWIPE-CARD-LOAD] Swipe cards loading with ${this.browserInfo.isSafari ? 'Safari' : 'Edge'} compatibility mode`);
    }
  }

  logAnimationFallback(originalClass: string, fallbackClass: string) {
    if (this.browserInfo.isSafari || this.browserInfo.isEdge) {
      console.log(`[ANIMATION-FALLBACK] ${originalClass} → ${fallbackClass}`);
    }
  }

  logTransformFix(originalTransform: string, safeTransform: string) {
    if (originalTransform !== safeTransform && (this.browserInfo.isSafari || this.browserInfo.isEdge)) {
      console.log(`[TRANSFORM-FIX] ${originalTransform} → ${safeTransform}`);
    }
  }

  logNetworkIssue(error: any) {
    if (this.browserInfo.isSafari || this.browserInfo.isEdge) {
      this.logIssue('network', 'high', 'Network request failed - potential CORS or fetch compatibility issue', error);
    }
  }

  getIssuesSummary() {
    return {
      total: this.issues.length,
      critical: this.issues.filter(i => i.severity === 'critical').length,
      high: this.issues.filter(i => i.severity === 'high').length,
      medium: this.issues.filter(i => i.severity === 'medium').length,
      low: this.issues.filter(i => i.severity === 'low').length,
      byType: {
        css: this.issues.filter(i => i.type === 'css').length,
        js: this.issues.filter(i => i.type === 'js').length,
        network: this.issues.filter(i => i.type === 'network').length,
        animation: this.issues.filter(i => i.type === 'animation').length,
      }
    };
  }

  logSummary() {
    if (this.browserInfo.isSafari || this.browserInfo.isEdge) {
      const summary = this.getIssuesSummary();
      console.group(`[BROWSER-DEBUG] Session Summary for ${this.browserInfo.isSafari ? 'Safari' : 'Edge'}`);
      console.log('Total Issues:', summary.total);
      console.log('By Severity:', `Critical: ${summary.critical}, High: ${summary.high}, Medium: ${summary.medium}, Low: ${summary.low}`);
      console.log('By Type:', summary.byType);
      console.groupEnd();
    }
  }
}

// Create global instance
export const browserDebugLogger = new BrowserDebugLogger();

// Auto-log summary on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    browserDebugLogger.logSummary();
  });
}