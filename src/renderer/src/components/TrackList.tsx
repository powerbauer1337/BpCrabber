import React, { useState } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Checkbox,
  Button,
  Stack,
  Divider,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import { Track } from '../types/electron';

interface TrackListProps {
  tracks: Track[];
  onDownload: (selectedTracks: Track[]) => Promise<void>;
}

export const TrackList: React.FC<TrackListProps> = ({ tracks, onDownload }) => {
  const [selectedTracks, setSelectedTracks] = useState<Set<string>>(new Set());
  const [isDownloading, setIsDownloading] = useState(false);

  const handleToggleTrack = (trackId: string) => {
    setSelectedTracks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(trackId)) {
        newSet.delete(trackId);
      } else {
        newSet.add(trackId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedTracks.size === tracks.length) {
      setSelectedTracks(new Set());
    } else {
      setSelectedTracks(new Set(tracks.map(track => track.id)));
    }
  };

  const handleDownload = async () => {
    const tracksToDownload = tracks.filter(track => selectedTracks.has(track.id));
    if (tracksToDownload.length === 0) return;

    setIsDownloading(true);
    try {
      await onDownload(tracksToDownload);
    } finally {
      setIsDownloading(false);
      setSelectedTracks(new Set());
    }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" component="h2">
          Detected Tracks ({tracks.length})
        </Typography>
        <Stack direction="row" spacing={2}>
          <Button variant="outlined" onClick={handleSelectAll} disabled={tracks.length === 0}>
            {selectedTracks.size === tracks.length ? 'Deselect All' : 'Select All'}
          </Button>
          <LoadingButton
            variant="contained"
            startIcon={<CloudDownloadIcon />}
            onClick={handleDownload}
            loading={isDownloading}
            disabled={selectedTracks.size === 0}
          >
            Download Selected ({selectedTracks.size})
          </LoadingButton>
        </Stack>
      </Stack>

      <Divider />

      {tracks.length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 4 }} align="center">
          No tracks detected. Enter a Beatport URL to get started.
        </Typography>
      ) : (
        <List
          sx={{
            maxHeight: 400,
            overflow: 'auto',
            bgcolor: 'background.paper',
            borderRadius: 1,
          }}
        >
          {tracks.map(track => (
            <ListItem key={track.id} dense button onClick={() => handleToggleTrack(track.id)}>
              <ListItemIcon>
                <Checkbox
                  edge="start"
                  checked={selectedTracks.has(track.id)}
                  tabIndex={-1}
                  disableRipple
                />
              </ListItemIcon>
              <ListItemText primary={track.title} secondary={track.artist} />
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
};
