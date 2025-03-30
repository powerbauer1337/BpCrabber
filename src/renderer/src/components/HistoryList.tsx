import { DownloadHistory } from '@shared/types';
import { List, ListItem, Text, IconButton, HStack, VStack, useToast } from '@chakra-ui/react';
import { FaFolder } from 'react-icons/fa';
import { ipcRenderer } from 'electron';

interface HistoryListProps {
  history: DownloadHistory[];
}

export const HistoryList = ({ history }: HistoryListProps) => {
  const toast = useToast();

  const handleOpenFolder = async (path: string) => {
    try {
      await ipcRenderer.invoke('openFolder', path);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to open folder',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  return (
    <List spacing={4}>
      {history.map(item => (
        <ListItem key={item.id} p={4} borderWidth="1px" borderRadius="lg">
          <HStack justify="space-between">
            <VStack align="start" spacing={1}>
              <Text fontWeight="bold">{item.title}</Text>
              <Text color="gray.500">{item.artist}</Text>
              <Text fontSize="sm" color="gray.500">
                {new Date(item.downloadedAt).toLocaleString()}
              </Text>
            </VStack>
            <IconButton
              aria-label="Open folder"
              icon={<FaFolder />}
              onClick={() => handleOpenFolder(item.path)}
              variant="ghost"
            />
          </HStack>
        </ListItem>
      ))}
    </List>
  );
};
