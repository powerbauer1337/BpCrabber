import React, { useState, Suspense } from 'react';
import {
  Box,
  Container,
  Paper,
  ThemeProvider,
  CssBaseline,
  Snackbar,
  Alert,
  CircularProgress,
  Grid,
} from '@mui/material';
import { LoginForm } from './components/LoginForm';
import { DownloadQueue } from './components/DownloadQueue';
import { UrlInput } from './components/UrlInput';
import { TrackList } from './components/TrackList';
import { theme } from './theme';

// Lazy load less critical components
const LogViewer = React.lazy(() => import('./components/LogViewer'));
const UpdateNotification = React.lazy(() => import('./components/UpdateNotification'));

interface Track {
  id: string;
  title: string;
  artist: string;
  url: string;
  status?: 'queued' | 'downloading' | 'completed' | 'error';
  progress?: number;
}

const App: React.FC = () => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [notification, setNotification] = useState<{
    message: string;
    severity: 'success' | 'error';
  } | null>(null);

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
      <Suspense fallback={<CircularProgress />}>
        <UpdateNotification />
      </Suspense>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper sx={{ p: 3, mb: 2 }}>
              <LoginForm />
            </Paper>
          </Grid>

          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <UrlInput onTrackDetected={handleTrackDetected} />
              <Box sx={{ mt: 3 }}>
                <TrackList tracks={tracks} onDownload={handleDownloadTracks} />
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <DownloadQueue />
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Paper sx={{ p: 3, minHeight: '200px' }}>
              <Suspense fallback={<CircularProgress />}>
                <LogViewer />
              </Suspense>
            </Paper>
          </Grid>
        </Grid>
      </Container>

      <Snackbar
        open={notification !== null}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification?.severity || 'success'}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {notification?.message || ''}
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
};

export default App;
