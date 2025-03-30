import React, { useState } from 'react';
import { Box, TextField, Stack, Alert } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { Track } from '../types/electron';

interface UrlInputProps {
  onTrackDetected: (track: Track) => void;
}

export const UrlInput: React.FC<UrlInputProps> = ({ onTrackDetected }) => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const track = await window.beatport.detectTracks(url);
      onTrackDetected(track);
      setUrl('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to detect track');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Stack spacing={2}>
        <TextField
          label="Beatport Track URL"
          placeholder="https://www.beatport.com/track/..."
          value={url}
          onChange={e => setUrl(e.target.value)}
          fullWidth
          required
          disabled={isLoading}
          size="small"
          error={Boolean(error)}
          helperText={error || 'Paste a Beatport track URL to add it to the download list'}
        />
        <Box>
          <LoadingButton
            type="submit"
            variant="contained"
            loading={isLoading}
            disabled={!url.trim()}
          >
            Add Track
          </LoadingButton>
        </Box>
      </Stack>
    </Box>
  );
};
