import React, { useState, useRef, useEffect } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { Layout } from './components/Layout';
import { LoginForm } from './components/LoginForm';
import { DownloadQueue } from './components/DownloadQueue';
import { UrlInput } from './components/UrlInput';
import { LogViewer } from './components/LogViewer';
import { UpdateNotification } from './components/UpdateNotification';
import { TrackList } from './components/TrackList';
import { theme } from './theme';
import { NotificationProvider, useNotifications } from './components/Notifications';

// Update the window.api interface
declare global {
  interface Window {
    api: {
      downloadTrack: (url: string) => Promise<{ success: boolean }>;
      onDownloadProgress: (callback: (data: string) => void) => void;
      onDownloadError: (callback: (error: string) => void) => void;
      isTrackUrl: (url: string) => boolean;
      getTrackId: (url: string) => string | null;
    };
  }
}

interface DownloadItem {
  id: string;
  url: string;
  name: string;
  status: 'queued' | 'downloading' | 'completed' | 'error';
  error?: string;
  progress?: number;
}

interface Track {
  id: string;
  title: string;
  artist: string;
  url: string;
}

const AppContent: React.FC = () => {
  const [currentPage, setCurrentPage] = useState('download');
  const [downloadQueue, setDownloadQueue] = useState<DownloadItem[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const webviewRef = useRef<Electron.WebviewTag | null>(null);
  const [currentUrl, setCurrentUrl] = useState('https://www.beatport.com');
  const [tracks, setTracks] = useState<Track[]>([]);
  const { showError, showSuccess } = useNotifications();

  useEffect(() => {
    // Set up download progress listener
    window.api.onDownloadProgress(data => {
      setLogs(prev => [...prev, data]);
      // Try to extract progress percentage if available
      const progressMatch = data.match(/(\d+)%/);
      if (progressMatch && downloadQueue[0]) {
        const progress = parseInt(progressMatch[1], 10);
        setDownloadQueue(prev =>
          prev.map((item, index) => (index === 0 ? { ...item, progress } : item))
        );
      }
    });

    // Set up error listener
    window.api.onDownloadError(error => {
      setLogs(prev => [...prev, `Error: ${error}`]);
      showError(error);
      setIsDownloading(false);
    });
  }, [downloadQueue, showError]);

  useEffect(() => {
    if (!webviewRef.current) return;

    const webview = webviewRef.current;

    // Handle loading states
    webview.addEventListener('did-start-loading', () => setIsLoading(true));
    webview.addEventListener('did-stop-loading', () => setIsLoading(false));

    webview.addEventListener('dom-ready', () => {
      // Inject track detection
      webview.executeJavaScript(`
        document.addEventListener('click', (e) => {
          const trackLink = e.target.closest('a[href*="/track/"]');
          if (trackLink) {
            e.preventDefault();
            const trackName = trackLink.querySelector('.track-title')?.textContent ||
                            trackLink.querySelector('.track-name')?.textContent ||
                            trackLink.textContent;
            window.postMessage({
              type: 'TRACK_SELECTED',
              url: trackLink.href,
              name: trackName.trim()
            }, '*');
          }
        });

        // Highlight track links
        const style = document.createElement('style');
        style.textContent = \`
          a[href*="/track/"] {
            position: relative;
            cursor: pointer !important;
          }
          a[href*="/track/"]:hover::after {
            content: 'Click to Download';
            position: absolute;
            bottom: 100%;
            left: 50%;
            transform: translateX(-50%);
            background: #1976d2;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            z-index: 1000;
          }
        \`;
        document.head.appendChild(style);
      `);
    });

    // Handle track selection
    window.addEventListener('message', event => {
      if (event.data.type === 'TRACK_SELECTED' && event.data.url && event.data.name) {
        addToQueue(event.data.url, event.data.name);
      }
    });
  }, []);

  const addToQueue = (url: string, name: string) => {
    const trackId = window.api.getTrackId(url);
    if (!trackId) return;

    setDownloadQueue(prev => {
      // Don't add if already in queue
      if (prev.some(item => item.id === trackId)) return prev;

      return [
        ...prev,
        {
          id: trackId,
          url,
          name,
          status: 'queued',
          progress: 0,
        },
      ];
    });
  };

  const processQueue = async () => {
    if (isDownloading || downloadQueue.length === 0) return;

    setIsDownloading(true);
    const currentItem = downloadQueue[0];

    try {
      setDownloadQueue(prev =>
        prev.map(item =>
          item.id === currentItem.id ? { ...item, status: 'downloading', progress: 0 } : item
        )
      );

      await window.api.downloadTrack(currentItem.url);

      setDownloadQueue(prev =>
        prev.map(item =>
          item.id === currentItem.id ? { ...item, status: 'completed', progress: 100 } : item
        )
      );

      // Remove completed item and process next
      setTimeout(() => {
        setDownloadQueue(prev => prev.slice(1));
        setIsDownloading(false);
        processQueue();
      }, 1000); // Show completed state briefly
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setDownloadQueue(prev =>
        prev.map(item =>
          item.id === currentItem.id ? { ...item, status: 'error', error: errorMessage } : item
        )
      );
      setIsDownloading(false);
    }
  };

  useEffect(() => {
    if (!isDownloading && downloadQueue.length > 0) {
      processQueue();
    }
  }, [downloadQueue, isDownloading]);

  const handleNavigate = (direction: 'back' | 'forward' | 'reload') => {
    if (!webviewRef.current) return;

    switch (direction) {
      case 'back':
        if (webviewRef.current.canGoBack()) webviewRef.current.goBack();
        break;
      case 'forward':
        if (webviewRef.current.canGoForward()) webviewRef.current.goForward();
        break;
      case 'reload':
        webviewRef.current.reload();
        break;
    }
  };

  const removeFromQueue = (id: string) => {
    setDownloadQueue(prev => prev.filter(item => item.id !== id));
  };

  const clearCompletedDownloads = () => {
    setDownloadQueue(prev => prev.filter(item => item.status !== 'completed'));
  };

  const handleTrackDetected = (track: Track) => {
    setTracks(prev => {
      // Don't add if track already exists
      if (prev.some(t => t.id === track.id)) {
        showError('Track already in the list');
        return prev;
      }
      showSuccess(`Added "${track.title}" by ${track.artist}`);
      return [...prev, track];
    });
  };

  const handleDownloadTracks = async (selectedTracks: Track[]) => {
    try {
      for (const track of selectedTracks) {
        addToQueue(track.url, `${track.artist} - ${track.title}`);
      }
      showSuccess(`Added ${selectedTracks.length} tracks to download queue`);
      processQueue();
    } catch (error) {
      showError('Failed to add tracks to download queue');
      console.error('Error adding tracks to queue:', error);
    }
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'download':
        return (
          <>
            <UrlInput onSubmit={addToQueue} />
            <TrackList tracks={tracks} onDownload={handleDownloadTracks} />
            <DownloadQueue
              items={downloadQueue}
              onRemove={removeFromQueue}
              onClearCompleted={clearCompletedDownloads}
            />
            <LogViewer logs={logs} />
          </>
        );
      case 'history':
        return <div>Download History</div>; // TODO: Implement history view
      case 'settings':
        return <div>Settings</div>; // TODO: Implement settings view
      case 'about':
        return (
          <div>
            <h1>About Beatport Downloader</h1>
            <p>Version: 1.0.0</p>
            <p>A simple tool to download tracks from Beatport.</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
      <UpdateNotification />
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <NotificationProvider>
        <AppContent />
      </NotificationProvider>
    </ThemeProvider>
  );
};

export default App;
