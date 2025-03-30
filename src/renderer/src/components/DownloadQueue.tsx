import React from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Stack,
  LinearProgress,
  Button,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { green, red } from '@mui/material/colors';

export interface DownloadItem {
  id: string;
  url: string;
  name: string;
  status: 'queued' | 'downloading' | 'completed' | 'error';
  error?: string;
  progress?: number;
}

interface DownloadQueueProps {
  items: DownloadItem[];
  onRemove: (id: string) => void;
  onClearCompleted: () => void;
}

export const DownloadQueue: React.FC<DownloadQueueProps> = ({
  items,
  onRemove,
  onClearCompleted,
}) => {
  const hasCompletedItems = items.some(item => item.status === 'completed');

  return (
    <Paper elevation={2} sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Download Queue</Typography>
          {hasCompletedItems && (
            <Button size="small" onClick={onClearCompleted}>
              Clear Completed
            </Button>
          )}
        </Box>

        {items.length === 0 ? (
          <Typography color="text.secondary" align="center">
            No items in queue
          </Typography>
        ) : (
          <List>
            {items.map(item => (
              <ListItem
                key={item.id}
                sx={{
                  bgcolor: 'background.paper',
                  mb: 1,
                  borderRadius: 1,
                  border: 1,
                  borderColor: 'divider',
                }}
              >
                <ListItemText
                  primary={item.name}
                  secondary={
                    <Box sx={{ width: '100%' }}>
                      {item.status === 'downloading' && item.progress !== undefined && (
                        <LinearProgress
                          variant="determinate"
                          value={item.progress}
                          sx={{ mt: 1 }}
                        />
                      )}
                      <Typography variant="caption" color="text.secondary">
                        {item.status === 'downloading'
                          ? `Downloading... ${item.progress}%`
                          : item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                      </Typography>
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  {item.status === 'completed' && (
                    <CheckCircleIcon sx={{ color: green[500], mr: 1 }} />
                  )}
                  {item.status === 'error' && <ErrorIcon sx={{ color: red[500], mr: 1 }} />}
                  <IconButton
                    edge="end"
                    aria-label="delete"
                    onClick={() => onRemove(item.id)}
                    size="small"
                  >
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
      </Stack>
    </Paper>
  );
};
