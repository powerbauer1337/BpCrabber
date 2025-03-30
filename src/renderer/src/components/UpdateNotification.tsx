import React, { useState, useEffect } from 'react';
import { Alert, Snackbar, Button } from '@mui/material';

export const UpdateNotification: React.FC = () => {
  const [updateVersion, setUpdateVersion] = useState<string | null>(null);

  useEffect(() => {
    const cleanup = window.beatport.onUpdateAvailable((version: string) => {
      setUpdateVersion(version);
    });

    return () => cleanup();
  }, []);

  const handleClose = () => {
    setUpdateVersion(null);
  };

  if (!updateVersion) return null;

  return (
    <Snackbar
      open={Boolean(updateVersion)}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
    >
      <Alert
        severity="info"
        onClose={handleClose}
        action={
          <Button color="inherit" size="small" onClick={handleClose}>
            Later
          </Button>
        }
      >
        Version {updateVersion} is available. The app will update automatically when you restart.
      </Alert>
    </Snackbar>
  );
};
