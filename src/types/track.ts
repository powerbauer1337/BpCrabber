export interface Track {
  id: string;
  name: string;
  artists: Artist[];
  remixers: Artist[];
  label: Label;
  genre: Genre;
  releaseDate: string;
  bpm: number;
  key: string;
  length: string;
  price: number;
  artwork: {
    small: string;
    medium: string;
    large: string;
  };
  preview: {
    mp3: string;
    waveform: string;
  };
}

export interface Artist {
  id: string;
  name: string;
  slug: string;
}

export interface Label {
  id: string;
  name: string;
  slug: string;
}

export interface Genre {
  id: string;
  name: string;
  slug: string;
}

export interface SearchFilters {
  query?: string;
  artistId?: string;
  labelId?: string;
  genreId?: string;
  bpmRange?: {
    min: number;
    max: number;
  };
  key?: string;
  releaseDate?: {
    from: string;
    to: string;
  };
  page?: number;
  perPage?: number;
  sortBy?: 'relevance' | 'release_date' | 'price' | 'bpm';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchResult {
  tracks: Track[];
  total: number;
  page: number;
  perPage: number;
  hasMore: boolean;
}

export interface TrackService {
  search(filters: SearchFilters): Promise<SearchResult>;
  getTrackById(id: string): Promise<Track>;
  getRelatedTracks(id: string): Promise<Track[]>;
  getFeaturedTracks(): Promise<Track[]>;
  getNewReleases(): Promise<Track[]>;
  getTopTracks(): Promise<Track[]>;
  getTracksByArtist(artistId: string): Promise<Track[]>;
  getTracksByLabel(labelId: string): Promise<Track[]>;
  getTracksByGenre(genreId: string): Promise<Track[]>;
}
