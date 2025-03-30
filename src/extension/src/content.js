// Content script for Beatport Downloader

// Function to create download button
function createDownloadButton(trackId) {
  const button = document.createElement('button');
  button.className = 'beatportdl-download-btn';
  button.innerHTML = '⬇️';
  button.title = 'Download with beatportdl';
  button.onclick = () => downloadTrack(trackId);
  return button;
}

// Function to handle track download
async function downloadTrack(trackId) {
  try {
    // Send message to background script
    await chrome.runtime.sendMessage({
      action: 'download',
      trackUrl: `https://www.beatport.com/track/x/${trackId}`,
    });

    // Show success indicator
    const btn = document.querySelector(`[data-track-id="${trackId}"] .beatportdl-download-btn`);
    btn.innerHTML = '✅';
    setTimeout(() => (btn.innerHTML = '⬇️'), 2000);
  } catch (err) {
    console.error('Download failed:', err);
    // Show error indicator
    const btn = document.querySelector(`[data-track-id="${trackId}"] .beatportdl-download-btn`);
    btn.innerHTML = '❌';
    setTimeout(() => (btn.innerHTML = '⬇️'), 2000);
  }
}

// Function to inject download buttons
function injectDownloadButtons() {
  // Track list view
  const trackRows = document.querySelectorAll('.track-grid-content');
  trackRows.forEach(row => {
    if (!row.querySelector('.beatportdl-download-btn')) {
      const trackId = row.getAttribute('data-track-id');
      if (trackId) {
        const actionsCell = row.querySelector('.track-grid-item-actions');
        if (actionsCell) {
          actionsCell.appendChild(createDownloadButton(trackId));
        }
      }
    }
  });

  // Track detail view
  const trackDetail = document.querySelector('.track-detail');
  if (trackDetail && !trackDetail.querySelector('.beatportdl-download-btn')) {
    const trackId = new URL(window.location.href).pathname.split('/').pop();
    if (trackId && !isNaN(trackId)) {
      const actionBar = trackDetail.querySelector('.track-actions');
      if (actionBar) {
        actionBar.appendChild(createDownloadButton(trackId));
      }
    }
  }
}

// Initial injection
injectDownloadButtons();

// Watch for dynamic content changes
const observer = new MutationObserver(() => {
  injectDownloadButtons();
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
});
