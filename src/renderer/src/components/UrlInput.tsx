import React, { useState } from 'react';
import { TextField, Button, Box, CircularProgress } from '@mui/material';

export interface UrlInputProps {
  onSubmit: (url: string, name: string) => void;
}

export const UrlInput: React.FC<UrlInputProps> = ({ onSubmit }) => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setIsLoading(true);
    try {
      // Validate URL
      const trackId = window.api.getTrackId(url);
      if (!trackId) {
        throw new Error('Invalid track URL');
      }

      // Extract track name from URL (you might want to get this from the page)
      const name = url.split('/').pop() || 'Unknown Track';
      onSubmit(url, name);
      setUrl('');
    } catch (error) {
      console.error('Error submitting URL:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', gap: 2 }}>
      <TextField
        fullWidth
        label="Track URL"
        variant="outlined"
        value={url}
        onChange={e => setUrl(e.target.value)}
        placeholder="https://www.beatport.com/track/..."
        disabled={isLoading}
      />
      <Button type="submit" variant="contained" disabled={!url || isLoading} sx={{ minWidth: 120 }}>
        {isLoading ? <CircularProgress size={24} /> : 'Add to Queue'}
      </Button>
    </Box>
  );
};
