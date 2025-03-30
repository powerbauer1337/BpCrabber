/**
 * Security utilities for Electron app
 */

import { BrowserWindow, session } from 'electron';

/**
 * Creates and applies security headers for the main window
 * @param window The main BrowserWindow instance
 */
export function createSecurityHeaders(window: BrowserWindow): void {
  // Set default CSP
  const cspPolicy =
    process.env.CSP_POLICY ||
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:;";

  // Apply CSP and other security headers
  window.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [cspPolicy],
        'X-Content-Type-Options': ['nosniff'],
        'X-Frame-Options': ['DENY'],
        'X-XSS-Protection': ['1; mode=block'],
        'Referrer-Policy': ['strict-origin-when-cross-origin'],
        'Permissions-Policy': ['camera=(), microphone=(), geolocation=()'],
      },
    });
  });

  // Additional security settings
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    // Block potentially dangerous protocols
    if (details.url.startsWith('file://') && !details.url.includes('index.html')) {
      callback({ cancel: true });
      return;
    }
    callback({ cancel: false });
  });

  // Disable navigation to unknown protocols
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) {
      return { action: 'deny' };
    }
    return { action: 'deny' };
  });
}

/**
 * Applies security best practices to the BrowserWindow configuration
 */
export const secureWindowConfig = {
  webPreferences: {
    nodeIntegration: false,
    contextIsolation: true,
    sandbox: true,
    webSecurity: true,
    allowRunningInsecureContent: false,
    experimentalFeatures: false,
  },
  autoHideMenuBar: true,
  // Disable fullscreen to prevent phishing attacks
  fullscreenable: false,
};
