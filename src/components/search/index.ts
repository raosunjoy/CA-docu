// Search Components - Unified search system
export { UnifiedSearch } from './UnifiedSearch'
export { SearchFilters } from './SearchFilters'
export { SearchResults } from './SearchResults'
export { SearchSuggestions } from './SearchSuggestions'

// Re-export types
export type { 
  SearchableContent,
  SearchFilters as SearchFiltersType,
  SearchOptions,
  SearchResult,
  ElasticSearchResponse,
  IndexStats
} from '@/lib/elasticsearch-service'