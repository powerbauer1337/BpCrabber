import React from 'react';
import {
  Box,
  Image,
  Text,
  Button,
  VStack,
  HStack,
  Badge,
  useColorModeValue,
} from '@chakra-ui/react';
import { DownloadIcon, PlayIcon } from '@chakra-ui/icons';
import { Track } from '../../types/track';
import { useAppStore } from '../../stores/app.store';
import { useDownload } from '../../hooks/useDownload';

interface TrackCardProps {
  track: Track;
}

export const TrackCard: React.FC<TrackCardProps> = ({ track }) => {
  const bg = useColorModeValue('white', 'gray.800');
  const { addToQueue } = useDownload();
  const { setCurrentTrack } = useAppStore();

  const handleDownload = async () => {
    await addToQueue(track.id);
  };

  return (
    <Box
      borderWidth="1px"
      borderRadius="lg"
      overflow="hidden"
      bg={bg}
      transition="transform 0.2s"
      _hover={{ transform: 'translateY(-2px)' }}
    >
      <Image src={track.artwork.medium} alt={track.name} w="100%" h="200px" objectFit="cover" />

      <VStack p={4} align="stretch" spacing={2}>
        <Text fontWeight="bold" noOfLines={1}>
          {track.name}
        </Text>
        <Text fontSize="sm" color="gray.500" noOfLines={1}>
          {track.artists.map(a => a.name).join(', ')}
        </Text>

        <HStack>
          <Badge>{track.genre.name}</Badge>
          <Badge colorScheme="blue">{track.bpm} BPM</Badge>
          <Badge colorScheme="green">{track.key}</Badge>
        </HStack>

        <HStack justify="space-between" mt={2}>
          <Button
            leftIcon={<PlayIcon />}
            size="sm"
            variant="outline"
            onClick={() => setCurrentTrack(track)}
          >
            Preview
          </Button>
          <Button leftIcon={<DownloadIcon />} size="sm" colorScheme="blue" onClick={handleDownload}>
            Download
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
};
