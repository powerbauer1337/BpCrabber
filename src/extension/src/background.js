// Background script for Beatport Downloader

// Native messaging host name for beatportdl
const NATIVE_HOST = 'com.beatportdl.app';

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'download') {
    handleDownload(message.trackUrl)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Will respond asynchronously
  }
});

// Handle download request
async function handleDownload(trackUrl) {
  return new Promise((resolve, reject) => {
    // Connect to native host (beatportdl)
    const port = chrome.runtime.connectNative(NATIVE_HOST);

    port.onMessage.addListener(response => {
      if (response.success) {
        resolve();
      } else {
        reject(new Error(response.error || 'Download failed'));
      }
      port.disconnect();
    });

    port.onDisconnect.addListener(() => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
      }
    });

    // Send download request to native host
    port.postMessage({
      action: 'download',
      url: trackUrl,
    });
  });
}
