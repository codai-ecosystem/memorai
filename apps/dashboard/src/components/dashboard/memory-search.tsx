'use client';

import { useState, useCallback } from 'react';
import { Search, Filter, SortAsc, SortDesc, X } from 'lucide-react';
import { useMemoryStore } from '../../stores/memory-store';
import { cn, debounce } from '../../lib/utils';

interface MemorySearchProps {
  className?: string;
}

export function MemorySearch({ className }: MemorySearchProps) {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({
    type: '',
    agentId: '',
    tags: [],
  });
  const [sortBy, setSortBy] = useState<
    'timestamp' | 'importance' | 'relevance'
  >('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);

  const { searchMemories, clearSearch, searchResults, isLoading } =
    useMemoryStore();

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((searchQuery: string) => {
      if (searchQuery.trim()) {
        searchMemories(searchQuery, {
          type: filters.type ?? undefined,
          agentId: filters.agentId ?? undefined,
          limit: 50,
        });
      } else {
        clearSearch();
      }
    }, 300),
    [searchMemories, clearSearch, filters]
  );

  const handleQueryChange = (value: string) => {
    setQuery(value);
    debouncedSearch(value);
  };

  const handleFilterChange = (key: string, value: unknown) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);

    // Re-search with new filters
    if (query.trim()) {
      searchMemories(query, {
        type: newFilters.type ?? undefined,
        agentId: newFilters.agentId ?? undefined,
        limit: 50,
      });
    }
  };

  const clearAllFilters = (): void => {
    setFilters({
      type: '',
      agentId: '',
      tags: [],
    });
    setQuery('');
    clearSearch();
  };

  const memoryTypes = [
    'conversation',
    'document',
    'note',
    'thread',
    'task',
    'personality',
    'emotion',
  ];

  return (
    <div className={cn('p-6 space-y-6', className)}>
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Memory Search
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Find specific memories using advanced search and filters
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />{' '}
        <input
          type="text"
          placeholder="Search memories by content, tags, or metadata..."
          data-testid="memory-search-input"
          value={query}
          onChange={e => handleQueryChange(e.target.value)}
          className={cn(
            'w-full pl-10 pr-12 py-3 border border-gray-300 dark:border-gray-600 rounded-lg',
            'focus:ring-2 focus:ring-blue-500 focus:border-transparent',
            'bg-white dark:bg-gray-800 text-gray-900 dark:text-white',
            'placeholder-gray-500 dark:placeholder-gray-400 text-lg'
          )}
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          </div>
        )}
      </div>

      {/* Filter Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600',
              'rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors',
              showFilters &&
                'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600'
            )}
          >
            <Filter className="h-4 w-4" />
            <span>Filters</span>
            {((filters.type ?? filters.agentId) || filters.tags.length > 0) && (
              <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {
                  [filters.type, filters.agentId, ...filters.tags].filter(
                    Boolean
                  ).length
                }
              </span>
            )}
          </button>

          {(query ||
            (filters.type ?? filters.agentId) ||
            filters.tags.length > 0) && (
            <button
              onClick={clearAllFilters}
              className={cn(
                'flex items-center space-x-2 px-4 py-2 text-gray-600 dark:text-gray-400',
                'hover:text-gray-800 dark:hover:text-gray-200 transition-colors'
              )}
            >
              <X className="h-4 w-4" />
              <span>Clear</span>
            </button>
          )}
        </div>

        {/* Sort Controls */}
        <div className="flex items-center space-x-2">
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className={cn(
              'px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg',
              'bg-white dark:bg-gray-800 text-gray-900 dark:text-white',
              'focus:ring-2 focus:ring-blue-500 focus:border-transparent'
            )}
          >
            <option value="timestamp">Sort by Date</option>
            <option value="importance">Sort by Importance</option>
            <option value="relevance">Sort by Relevance</option>
          </select>

          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className={cn(
              'p-2 border border-gray-300 dark:border-gray-600 rounded-lg',
              'hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors'
            )}
            title={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
          >
            {sortOrder === 'asc' ? (
              <SortAsc className="h-4 w-4" />
            ) : (
              <SortDesc className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Advanced Filters
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Memory Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Memory Type
              </label>
              <select
                value={filters.type}
                onChange={e => handleFilterChange('type', e.target.value)}
                className={cn(
                  'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg',
                  'bg-white dark:bg-gray-700 text-gray-900 dark:text-white',
                  'focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                )}
              >
                <option value="">All Types</option>
                {memoryTypes.map(type => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            {/* Agent ID Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Agent ID
              </label>
              <input
                type="text"
                placeholder="e.g., copilot-1"
                value={filters.agentId}
                onChange={e => handleFilterChange('agentId', e.target.value)}
                className={cn(
                  'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg',
                  'bg-white dark:bg-gray-700 text-gray-900 dark:text-white',
                  'focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                  'placeholder-gray-500 dark:placeholder-gray-400'
                )}
              />
            </div>
            {/* Date Range Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date Range
              </label>
              <select
                className={cn(
                  'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg',
                  'bg-white dark:bg-gray-700 text-gray-900 dark:text-white',
                  'focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                )}
              >
                <option value="">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
              </select>
            </div>{' '}
          </div>
        </div>
      )}

      {/* Search Results */}
      <div className="mt-6">
        {searchResults && searchResults.length > 0 ? (
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {searchResults.length} Memories
            </div>
            {/* Results would be displayed here */}
          </div>
        ) : query && !isLoading ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No memories yet
          </div>
        ) : null}
      </div>
    </div>
  );
}
