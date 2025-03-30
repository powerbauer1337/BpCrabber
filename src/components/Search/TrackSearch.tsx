import React, { useState } from 'react';
import { Input, InputGroup, InputRightElement, Button, VStack, SimpleGrid } from '@chakra-ui/react';
import { SearchIcon } from '@chakra-ui/icons';
import { TrackCard } from './TrackCard';
import { useTrackSearch } from '../../hooks/useTrackSearch';

export const TrackSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const { tracks, isLoading, search } = useTrackSearch();

  return (
    <VStack spacing={4} w="100%">
      <InputGroup>
        <Input
          placeholder="Search tracks..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && search(query)}
        />
        <InputRightElement>
          <Button size="sm" onClick={() => search(query)} isLoading={isLoading}>
            <SearchIcon />
          </Button>
        </InputRightElement>
      </InputGroup>

      <SimpleGrid columns={[1, 2, 3]} spacing={4} w="100%">
        {tracks.map(track => (
          <TrackCard key={track.id} track={track} />
        ))}
      </SimpleGrid>
    </VStack>
  );
};
