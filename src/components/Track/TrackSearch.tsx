import React, { useState } from 'react';
import {
  VStack,
  Input,
  InputGroup,
  InputRightElement,
  Button,
  SimpleGrid,
  useToast,
} from '@chakra-ui/react';
import { SearchIcon } from '@chakra-ui/icons';
import { TrackCard } from './TrackCard';
import { useAppStore } from '../../stores/app.store';
import { useTrackSearch } from '../../hooks/useTrackSearch';

export const TrackSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const { searchResults, isSearching, setSearchResults, setIsSearching } = useAppStore();
  const toast = useToast();
  const { searchTracks } = useTrackSearch();

  const handleSearch = async () => {
    if (!query.trim()) return;

    try {
      setIsSearching(true);
      const results = await searchTracks(query);
      setSearchResults(results.tracks);
    } catch (error) {
      toast({
        title: 'Search failed',
        description: 'Failed to search tracks. Please try again.',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <VStack spacing={6} w="100%">
      <InputGroup size="lg">
        <Input
          placeholder="Search tracks..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && handleSearch()}
        />
        <InputRightElement width="4.5rem">
          <Button h="1.75rem" size="sm" onClick={handleSearch} isLoading={isSearching}>
            <SearchIcon />
          </Button>
        </InputRightElement>
      </InputGroup>

      <SimpleGrid columns={[1, 2, 3]} spacing={6} w="100%">
        {searchResults.map(track => (
          <TrackCard key={track.id} track={track} />
        ))}
      </SimpleGrid>
    </VStack>
  );
};
