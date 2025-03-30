// Popup script for Beatport Downloader

// Load saved quality setting
chrome.storage.sync.get(['quality'], result => {
  const qualitySelect = document.getElementById('quality');
  if (result.quality) {
    qualitySelect.value = result.quality;
  }
});

// Save quality setting when changed
document.getElementById('quality').addEventListener('change', event => {
  chrome.storage.sync.set({
    quality: event.target.value,
  });
});
