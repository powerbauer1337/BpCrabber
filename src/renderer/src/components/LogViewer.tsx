import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Stack,
  Tooltip,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

export const LogViewer: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const cleanup = window.beatport.onLogMessage((message: string) => {
      setLogs(prev => [...prev, message].slice(-100)); // Keep last 100 logs
    });

    return () => cleanup();
  }, []);

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" component="h2">
          Activity Log
        </Typography>
        {logs.length > 0 && (
          <Tooltip title="Clear logs">
            <IconButton onClick={clearLogs} size="small">
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        )}
      </Stack>
      {logs.length === 0 ? (
        <Typography color="text.secondary" align="center">
          No activity to show
        </Typography>
      ) : (
        <List
          dense
          sx={{
            maxHeight: 200,
            overflow: 'auto',
            bgcolor: 'background.paper',
            borderRadius: 1,
          }}
        >
          {logs.map((log, index) => (
            <ListItem key={index}>
              <ListItemText
                primary={log}
                primaryTypographyProps={{
                  sx: { fontFamily: 'monospace', fontSize: '0.875rem' },
                }}
              />
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
};
