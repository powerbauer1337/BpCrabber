import { TrackInfo } from '@shared/types';
import { Box, List, ListItem, Progress, Text, Button, HStack, VStack } from '@chakra-ui/react';
import { ipcRenderer } from 'electron';

interface DownloadListProps {
  downloads: TrackInfo[];
}

export const DownloadList = ({ downloads }: DownloadListProps) => {
  const handleCancel = (id: string) => {
    ipcRenderer.invoke('cancelDownload', id);
  };

  return (
    <List spacing={4}>
      {downloads.map(track => (
        <ListItem key={track.id} p={4} borderWidth="1px" borderRadius="lg">
          <VStack align="stretch" spacing={2}>
            <HStack justify="space-between">
              <Box>
                <Text fontWeight="bold">{track.title}</Text>
                <Text color="gray.500">{track.artist}</Text>
              </Box>
              <Button
                size="sm"
                colorScheme="red"
                onClick={() => handleCancel(track.id)}
                isDisabled={track.status === 'completed'}
              >
                Cancel
              </Button>
            </HStack>
            <Progress
              value={track.progress}
              colorScheme={
                track.status === 'error' ? 'red' : track.status === 'completed' ? 'green' : 'blue'
              }
            />
            <Text fontSize="sm" color={track.error ? 'red.500' : 'gray.500'}>
              {track.error || track.status}
            </Text>
          </VStack>
        </ListItem>
      ))}
    </List>
  );
};
