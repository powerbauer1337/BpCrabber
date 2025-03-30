import { useState } from 'react';
import { Box, Input, Button, HStack, useToast } from '@chakra-ui/react';
import { ipcRenderer } from 'electron';

export const SearchBar = () => {
  const [url, setUrl] = useState('');
  const toast = useToast();

  const handleSearch = async () => {
    if (!url) return;

    try {
      await ipcRenderer.invoke('searchTrack', url);
      setUrl('');
      toast({
        title: 'Track added to queue',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to search track',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <Box mb={4}>
      <HStack>
        <Input
          placeholder="Enter Beatport track URL"
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyPress={handleKeyPress}
        />
        <Button colorScheme="blue" onClick={handleSearch}>
          Search
        </Button>
      </HStack>
    </Box>
  );
};
