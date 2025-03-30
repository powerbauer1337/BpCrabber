import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Container,
  Button,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Stack,
  IconButton,
  Tooltip,
  LinearProgress,
  ThemeProvider,
  CssBaseline,
  Snackbar,
  Alert,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import { LoginForm } from './components/LoginForm';
import { DownloadQueue } from './components/DownloadQueue';
import { UrlInput } from './components/UrlInput';
import { LogViewer } from './components/LogViewer';
import { UpdateNotification } from './components/UpdateNotification';
import { TrackList } from './components/TrackList';
import { theme } from './theme';

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

const App: React.FC = () => {
  const [downloadQueue, setDownloadQueue] = useState<DownloadItem[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const webviewRef = useRef<Electron.WebviewTag | null>(null);
  const [currentUrl, setCurrentUrl] = useState('https://www.beatport.com');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [notification, setNotification] = useState<{
    message: string;
    severity: 'success' | 'error';
  } | null>(null);

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
      setIsDownloading(false);
    });
  }, [downloadQueue]);

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
        setNotification({
          message: 'Track already in the list',
          severity: 'error',
        });
        return prev;
      }
      setNotification({
        message: `Added "${track.title}" by ${track.artist}`,
        severity: 'success',
      });
      return [...prev, track];
    });
  };

  const handleDownloadTracks = async (selectedTracks: Track[]) => {
    let successCount = 0;
    let failCount = 0;

    for (const track of selectedTracks) {
      try {
        await window.beatport.downloadTrack(track.url);
        successCount++;
      } catch (err) {
        console.error('Failed to download track:', err);
        failCount++;
      }
    }

    if (successCount > 0 || failCount > 0) {
      const message = [
        successCount > 0 ? `${successCount} tracks downloaded successfully` : '',
        failCount > 0 ? `${failCount} tracks failed to download` : '',
      ]
        .filter(Boolean)
        .join(', ');

      setNotification({
        message,
        severity: failCount === 0 ? 'success' : 'error',
      });
    }
  };

  const handleCloseNotification = () => {
    setNotification(null);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: 'background.default',
          py: 4,
        }}
      >
        <UpdateNotification />
        <Container maxWidth="lg">
          <Box display="flex" flexDirection="column" gap={3}>
            <Paper
              elevation={3}
              sx={{
                p: 3,
                bgcolor: 'background.paper',
                borderRadius: 2,
              }}
            >
              <LoginForm />
            </Paper>

            <Paper
              elevation={3}
              sx={{
                p: 3,
                bgcolor: 'background.paper',
                borderRadius: 2,
              }}
            >
              <UrlInput onTrackDetected={handleTrackDetected} />
            </Paper>

            <Paper
              elevation={3}
              sx={{
                p: 3,
                bgcolor: 'background.paper',
                borderRadius: 2,
              }}
            >
              <TrackList tracks={tracks} onDownload={handleDownloadTracks} />
            </Paper>

            <Paper
              elevation={3}
              sx={{
                p: 3,
                minHeight: '300px',
                bgcolor: 'background.paper',
                borderRadius: 2,
              }}
            >
              <DownloadQueue />
            </Paper>

            <Paper
              elevation={3}
              sx={{
                p: 3,
                minHeight: '200px',
                bgcolor: 'background.paper',
                borderRadius: 2,
              }}
            >
              <LogViewer />
            </Paper>
          </Box>
        </Container>
      </Box>

      <Snackbar
        open={notification !== null}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification?.severity || 'success'}
          sx={{ width: '100%' }}
        >
          {notification?.message || ''}
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
};

export default App;
