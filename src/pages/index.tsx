import { useEffect, useState } from 'react';
import { Box, Container, Typography } from '@mui/material';

export default function Home() {
  const [isElectron, setIsElectron] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      // Check if we're running in Electron
      setIsElectron(typeof window !== 'undefined' && 'electron' in window);
    } catch (err) {
      setError('Failed to detect environment');
      console.error('Environment detection error:', err);
    }
  }, []);

  if (error) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ my: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="error">
            {error}
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4, textAlign: 'center' }}>
        <Typography variant="h2" component="h1" gutterBottom>
          Beatport Downloader
        </Typography>
        <Typography variant="h5" component="h2" gutterBottom color="text.secondary">
          {isElectron ? 'Running in Electron' : 'Running in browser'}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {typeof window !== 'undefined'
            ? `Platform: ${window?.electron?.platform || 'browser'}`
            : 'Loading...'}
        </Typography>
      </Box>
    </Container>
  );
}
