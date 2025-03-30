import React, { useState } from 'react';
import { Box, TextField, Typography, Alert } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import type { LoadingButtonProps } from '@mui/lab';

interface Track {
  id: string;
  title: string;
  artist: string;
  url: string;
}

interface UrlInputProps {
  onTrackDetected: (track: Track) => void;
}

export const UrlInput: React.FC<UrlInputProps> = ({ onTrackDetected }) => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!url.includes('beatport.com')) {
      setError('Please enter a valid Beatport URL');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Extract track ID from URL
      const match = url.match(/\/track\/[^\/]+\/(\d+)/);
      if (!match) {
        setError('Invalid Beatport track URL');
        return;
      }

      const trackId = match[1];

      // Get track info from Beatport
      const trackInfo = await window.beatport.getTrackInfo(url);

      // Add track to the list
      onTrackDetected({
        id: trackId,
        title: trackInfo.title,
        artist: trackInfo.artist,
        url: url,
      });

      setUrl('');
    } catch (err) {
      setError('Failed to get track information. Please try again.');
      console.error('Track detection error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Add Track
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box
        component="form"
        onSubmit={e => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <TextField
          fullWidth
          label="Beatport Track URL"
          placeholder="https://www.beatport.com/track/..."
          value={url}
          onChange={e => setUrl(e.target.value)}
          margin="normal"
          required
        />

        <LoadingButton
          loading={loading}
          variant="contained"
          color="primary"
          onClick={handleSubmit}
          sx={{ mt: 2 }}
          fullWidth
          type="submit"
        >
          Add Track
        </LoadingButton>
      </Box>
    </Box>
  );
};
