import { TrackService, Track, SearchFilters, SearchResult } from '../types/track';
import { createHttpClient } from '../utils/http';
import { AppConfig } from '../config/app.config';

export class BeatportTrackService implements TrackService {
  private http = createHttpClient(AppConfig.api.baseUrl);

  async search(filters: SearchFilters): Promise<SearchResult> {
    const response = await this.http.get('/tracks/search', {
      params: {
        q: filters.query,
        artist_id: filters.artistId,
        label_id: filters.labelId,
        genre_id: filters.genreId,
        bpm_from: filters.bpmRange?.min,
        bpm_to: filters.bpmRange?.max,
        key: filters.key,
        date_from: filters.releaseDate?.from,
        date_to: filters.releaseDate?.to,
        page: filters.page,
        per_page: filters.perPage,
        sort_by: filters.sortBy,
        sort_order: filters.sortOrder,
      },
    });

    return {
      tracks: response.data.tracks,
      total: response.data.total,
      page: response.data.page,
      perPage: response.data.per_page,
      hasMore: response.data.has_more,
    };
  }

  async getTrackById(id: string): Promise<Track> {
    const response = await this.http.get(`/tracks/${id}`);
    return response.data;
  }

  // Implement other methods...
}
