import { useState, useEffect } from 'react';
import {
  Box,
  FormControl,
  FormLabel,
  Input,
  Button,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  VStack,
  useToast,
} from '@chakra-ui/react';
import { ipcRenderer } from 'electron';

interface Settings {
  downloadPath: string;
  maxConcurrentDownloads: number;
}

export const Settings = () => {
  const [settings, setSettings] = useState<Settings>({
    downloadPath: '',
    maxConcurrentDownloads: 3,
  });
  const toast = useToast();

  useEffect(() => {
    ipcRenderer.invoke('getSettings').then((savedSettings: Settings) => {
      setSettings(savedSettings);
    });
  }, []);

  const handleSave = async () => {
    try {
      await ipcRenderer.invoke('saveSettings', settings);
      toast({
        title: 'Settings saved',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleSelectPath = async () => {
    try {
      const path = await ipcRenderer.invoke('selectDownloadPath');
      if (path) {
        setSettings(prev => ({ ...prev, downloadPath: path }));
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to select download path',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  return (
    <VStack spacing={6} align="stretch">
      <FormControl>
        <FormLabel>Download Path</FormLabel>
        <Box display="flex" gap={2}>
          <Input value={settings.downloadPath} readOnly placeholder="Select a download path" />
          <Button onClick={handleSelectPath}>Browse</Button>
        </Box>
      </FormControl>

      <FormControl>
        <FormLabel>Max Concurrent Downloads</FormLabel>
        <NumberInput
          value={settings.maxConcurrentDownloads}
          min={1}
          max={10}
          onChange={(_, value) => setSettings(prev => ({ ...prev, maxConcurrentDownloads: value }))}
        >
          <NumberInputField />
          <NumberInputStepper>
            <NumberIncrementStepper />
            <NumberDecrementStepper />
          </NumberInputStepper>
        </NumberInput>
      </FormControl>

      <Button colorScheme="blue" onClick={handleSave}>
        Save Settings
      </Button>
    </VStack>
  );
};
