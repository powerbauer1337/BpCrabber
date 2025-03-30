import React, { useState } from 'react';
import {
  List,
  ListItem,
  ListItemText,
  IconButton,
  LinearProgress,
  Typography,
  Box,
  Chip,
  Tooltip,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Pause as PauseIcon,
  PlayArrow as PlayArrowIcon,
} from '@mui/icons-material';

interface Track {
  id: string;
  title: string;
  artist: string;
  url: string;
  status?: 'queued' | 'downloading' | 'completed' | 'error';
  progress?: number;
}

interface TrackListProps {
  tracks: Track[];
  onDownload: (tracks: Track[]) => void;
  onDelete?: (track: Track) => void;
  onPause?: (track: Track) => void;
  onResume?: (track: Track) => void;
}

export const TrackList: React.FC<TrackListProps> = ({
  tracks,
  onDownload,
  onDelete,
  onPause,
  onResume,
}) => {
  const [selected, setSelected] = useState<string[]>([]);

  const handleDownloadSelected = () => {
    const selectedTracks = tracks.filter(track => selected.includes(track.id));
    onDownload(selectedTracks);
    setSelected([]);
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'error':
        return 'error';
      case 'downloading':
        return 'info';
      case 'queued':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Tracks ({tracks.length})</Typography>
        {selected.length > 0 && (
          <Tooltip title="Download selected">
            <IconButton onClick={handleDownloadSelected} color="primary">
              <DownloadIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      <List>
        {tracks.map(track => (
          <ListItem
            key={track.id}
            divider
            secondaryAction={
              <Box display="flex" alignItems="center" gap={1}>
                {track.status && (
                  <Chip
                    size="small"
                    label={track.status}
                    color={getStatusColor(track.status) as any}
                  />
                )}
                {track.status === 'downloading' && (
                  <IconButton edge="end" onClick={() => onPause?.(track)} size="small">
                    <PauseIcon />
                  </IconButton>
                )}
                {track.status === 'queued' && (
                  <IconButton edge="end" onClick={() => onResume?.(track)} size="small">
                    <PlayArrowIcon />
                  </IconButton>
                )}
                {!track.status && (
                  <IconButton edge="end" onClick={() => onDownload([track])} size="small">
                    <DownloadIcon />
                  </IconButton>
                )}
                {onDelete && (
                  <IconButton edge="end" onClick={() => onDelete(track)} size="small">
                    <DeleteIcon />
                  </IconButton>
                )}
              </Box>
            }
          >
            <ListItemText
              primary={track.title}
              secondary={track.artist}
              sx={{
                opacity: track.status === 'completed' ? 0.7 : 1,
              }}
            />
            {track.progress !== undefined && track.status === 'downloading' && (
              <Box sx={{ width: '100%', mr: 2 }}>
                <LinearProgress
                  variant="determinate"
                  value={track.progress}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
            )}
          </ListItem>
        ))}
      </List>

      {tracks.length === 0 && (
        <Typography color="textSecondary" align="center" py={4}>
          No tracks added yet. Add tracks using the URL input above.
        </Typography>
      )}
    </Box>
  );
};
