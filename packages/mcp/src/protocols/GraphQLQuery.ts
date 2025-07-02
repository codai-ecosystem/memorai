/**
 * GRAPHQL QUERY LANGUAGE - Advanced Memory Query System
 * Provides GraphQL-style queries for complex memory operations
 */

export interface Memory {
  id: string;
  content: string;
  timestamp: number;
  agentId: string;
  tenantId: string;
  importance?: number;
  type?: string;
  metadata?: Record<string, unknown>;
  relationships?: Array<{
    type: string;
    target: string;
    strength?: number;
  }>;
}

export interface QueryField {
  name: string;
  arguments?: Record<string, unknown>;
  selectionSet?: QueryField[];
}

export interface QueryFilter {
  field: string;
  operator:
    | 'eq'
    | 'ne'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'in'
    | 'nin'
    | 'contains'
    | 'regex';
  value: unknown;
}

export interface QuerySort {
  field: string;
  order: 'ASC' | 'DESC';
}

export interface QueryPagination {
  offset?: number;
  limit?: number;
  cursor?: string;
}

export interface ParsedQuery {
  operation: 'query' | 'mutation' | 'subscription';
  name?: string;
  fields: QueryField[];
  variables?: Record<string, unknown>;
}

export interface MemoryQuery {
  select?: string[];
  filter?: QueryFilter[];
  sort?: QuerySort[];
  pagination?: QueryPagination;
  include?: {
    relationships?: boolean;
    metadata?: boolean;
    context?: boolean;
  };
  aggregation?: {
    count?: boolean;
    groupBy?: string[];
    having?: QueryFilter[];
  };
}

export class GraphQLQuery {
  private operators = new Map([
    ['eq', (a: unknown, b: unknown) => a === b],
    ['ne', (a: unknown, b: unknown) => a !== b],
    ['gt', (a: number, b: number) => a > b],
    ['gte', (a: number, b: number) => a >= b],
    ['lt', (a: number, b: number) => a < b],
    ['lte', (a: number, b: number) => a <= b],
    ['in', (a: unknown, b: unknown[]) => Array.isArray(b) && b.includes(a)],
    ['nin', (a: unknown, b: unknown[]) => Array.isArray(b) && !b.includes(a)],
    [
      'contains',
      (a: string, b: string) => typeof a === 'string' && a.includes(b),
    ],
    [
      'regex',
      (a: string, b: string) => typeof a === 'string' && new RegExp(b).test(a),
    ],
  ]);

  /**
   * Parse GraphQL-style query string
   */
  parse(queryString: string): ParsedQuery {
    // Remove comments and normalize whitespace
    const normalized = this.normalizeQuery(queryString);

    // Extract operation type
    const operationMatch = normalized.match(
      /^(query|mutation|subscription)\s*(\w+)?\s*\{/
    );
    if (!operationMatch) {
      throw new Error('Invalid query: Missing operation type');
    }

    const operation = operationMatch[1] as
      | 'query'
      | 'mutation'
      | 'subscription';
    const name = operationMatch[2];

    // Extract field selection
    const bodyMatch = normalized.match(/\{([\s\S]*)\}$/);
    if (!bodyMatch) {
      throw new Error('Invalid query: Missing query body');
    }

    const fields = this.parseFields(bodyMatch[1]);

    return {
      operation,
      name,
      fields,
    };
  }

  /**
   * Convert GraphQL query to MemoryQuery
   */
  toMemoryQuery(parsedQuery: ParsedQuery): MemoryQuery {
    const memoryQuery: MemoryQuery = {};

    for (const field of parsedQuery.fields) {
      switch (field.name) {
        case 'memories':
          this.parseMemoriesField(field, memoryQuery);
          break;

        case 'relationships':
          memoryQuery.include = { ...memoryQuery.include, relationships: true };
          break;

        case 'metadata':
          memoryQuery.include = { ...memoryQuery.include, metadata: true };
          break;

        case 'context':
          memoryQuery.include = { ...memoryQuery.include, context: true };
          break;
      }
    }

    return memoryQuery;
  }

  /**
   * Execute memory query
   */
  async executeQuery(
    memoryQuery: MemoryQuery,
    memories: Memory[]
  ): Promise<{
    data: Memory[];
    total: number;
    hasMore: boolean;
    cursor?: string;
  }> {
    let filteredMemories = [...memories];

    // Apply filters
    if (memoryQuery.filter) {
      filteredMemories = this.applyFilters(
        filteredMemories,
        memoryQuery.filter
      );
    }

    // Apply sorting
    if (memoryQuery.sort) {
      filteredMemories = this.applySorting(filteredMemories, memoryQuery.sort);
    }

    const total = filteredMemories.length;

    // Apply pagination
    if (memoryQuery.pagination) {
      filteredMemories = this.applyPagination(
        filteredMemories,
        memoryQuery.pagination
      );
    }

    // Apply field selection
    if (memoryQuery.select) {
      filteredMemories = this.selectFields(
        filteredMemories,
        memoryQuery.select
      );
    }

    const hasMore = memoryQuery.pagination
      ? (memoryQuery.pagination.offset || 0) + filteredMemories.length < total
      : false;

    const cursor =
      hasMore && filteredMemories.length > 0
        ? this.generateCursor(filteredMemories[filteredMemories.length - 1])
        : undefined;

    return {
      data: filteredMemories,
      total,
      hasMore,
      cursor,
    };
  }

  /**
   * Create temporal query for time-based operations
   */
  createTemporalQuery(timeRange: {
    start?: Date;
    end?: Date;
    duration?: string;
  }): MemoryQuery {
    const filters: QueryFilter[] = [];

    if (timeRange.start) {
      filters.push({
        field: 'timestamp',
        operator: 'gte',
        value: timeRange.start.getTime(),
      });
    }

    if (timeRange.end) {
      filters.push({
        field: 'timestamp',
        operator: 'lte',
        value: timeRange.end.getTime(),
      });
    }

    if (timeRange.duration && !timeRange.start && !timeRange.end) {
      const now = new Date();
      const duration = this.parseDuration(timeRange.duration);
      const start = new Date(now.getTime() - duration);

      filters.push({
        field: 'timestamp',
        operator: 'gte',
        value: start.getTime(),
      });
    }

    return {
      filter: filters,
      sort: [{ field: 'timestamp', order: 'DESC' }],
    };
  }

  /**
   * Create semantic similarity query
   */
  createSemanticQuery(text: string, threshold = 0.8, limit = 10): MemoryQuery {
    return {
      filter: [
        {
          field: 'semantic_similarity',
          operator: 'gte',
          value: threshold,
        },
      ],
      sort: [
        { field: 'semantic_similarity', order: 'DESC' },
        { field: 'importance', order: 'DESC' },
      ],
      pagination: { limit },
      include: {
        relationships: true,
        metadata: true,
      },
    };
  }

  /**
   * Create clustering query
   */
  createClusteringQuery(clusterBy: string[], threshold = 0.85): MemoryQuery {
    return {
      aggregation: {
        groupBy: clusterBy,
        count: true,
        having: [
          {
            field: 'cluster_similarity',
            operator: 'gte',
            value: threshold,
          },
        ],
      },
      sort: [
        { field: 'cluster_size', order: 'DESC' },
        { field: 'cluster_coherence', order: 'DESC' },
      ],
    };
  }

  /**
   * Create relationship traversal query
   */
  createRelationshipQuery(
    startMemoryId: string,
    relationshipType?: string,
    maxDepth = 3
  ): MemoryQuery {
    const filters: QueryFilter[] = [
      {
        field: 'relationship_source',
        operator: 'eq',
        value: startMemoryId,
      },
    ];

    if (relationshipType) {
      filters.push({
        field: 'relationship_type',
        operator: 'eq',
        value: relationshipType,
      });
    }

    filters.push({
      field: 'relationship_depth',
      operator: 'lte',
      value: maxDepth,
    });

    return {
      filter: filters,
      include: {
        relationships: true,
        metadata: true,
      },
      sort: [
        { field: 'relationship_strength', order: 'DESC' },
        { field: 'relationship_depth', order: 'ASC' },
      ],
    };
  }

  /**
   * Normalize query string
   */
  private normalizeQuery(query: string): string {
    return query
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
      .replace(/#.*$/gm, '') // Remove line comments
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Parse field selection
   */
  private parseFields(fieldsString: string): QueryField[] {
    const fields: QueryField[] = [];
    let depth = 0;
    let current = '';
    let inString = false;
    let stringChar = '';

    for (let i = 0; i < fieldsString.length; i++) {
      const char = fieldsString[i];

      if ((char === '"' || char === "'") && !inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar && inString) {
        inString = false;
        stringChar = '';
      }

      if (!inString) {
        if (char === '{') {
          depth++;
        } else if (char === '}') {
          depth--;
        } else if (char === ',' && depth === 0) {
          if (current.trim()) {
            fields.push(this.parseField(current.trim()));
          }
          current = '';
          continue;
        }
      }

      current += char;
    }

    if (current.trim()) {
      fields.push(this.parseField(current.trim()));
    }

    return fields;
  }

  /**
   * Parse individual field
   */
  private parseField(fieldString: string): QueryField {
    const argMatch = fieldString.match(
      /^(\w+)\s*(\([^)]*\))?\s*(\{[\s\S]*\})?$/
    );
    if (!argMatch) {
      throw new Error(`Invalid field syntax: ${fieldString}`);
    }

    const name = argMatch[1];
    const argsString = argMatch[2];
    const selectionString = argMatch[3];

    const field: QueryField = { name };

    // Parse arguments
    if (argsString) {
      field.arguments = this.parseArguments(argsString);
    }

    // Parse selection set
    if (selectionString) {
      const inner = selectionString.slice(1, -1); // Remove { }
      field.selectionSet = this.parseFields(inner);
    }

    return field;
  }

  /**
   * Parse field arguments
   */
  private parseArguments(argsString: string): Record<string, unknown> {
    const args: Record<string, unknown> = {};
    const inner = argsString.slice(1, -1); // Remove ( )

    // Simple argument parsing (can be enhanced for complex cases)
    const argPairs = inner.split(',');
    for (const pair of argPairs) {
      const [key, value] = pair.split(':').map(s => s.trim());
      if (key && value) {
        args[key] = this.parseValue(value);
      }
    }

    return args;
  }

  /**
   * Parse value from string
   */
  private parseValue(valueString: string): unknown {
    const trimmed = valueString.trim();

    // String
    if (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
      return trimmed.slice(1, -1);
    }

    // Number
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      return parseFloat(trimmed);
    }

    // Boolean
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;

    // Null
    if (trimmed === 'null') return null;

    // Array
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      const inner = trimmed.slice(1, -1);
      return inner.split(',').map(item => this.parseValue(item.trim()));
    }

    // Object
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      return JSON.parse(trimmed);
    }

    // Default: return as string
    return trimmed;
  }

  /**
   * Parse memories field arguments
   */
  private parseMemoriesField(
    field: QueryField,
    memoryQuery: MemoryQuery
  ): void {
    if (field.arguments) {
      // Parse filter
      if (field.arguments.filter) {
        memoryQuery.filter = this.parseFilterObject(field.arguments.filter);
      }

      // Parse sort
      if (field.arguments.sort) {
        memoryQuery.sort = this.parseSortObject(field.arguments.sort);
      }

      // Parse pagination
      if (
        field.arguments.limit ||
        field.arguments.offset ||
        field.arguments.cursor
      ) {
        memoryQuery.pagination = {
          limit: field.arguments.limit as number,
          offset: field.arguments.offset as number,
          cursor: field.arguments.cursor as string,
        };
      }
    }

    // Parse field selection
    if (field.selectionSet) {
      memoryQuery.select = field.selectionSet.map(f => f.name);
    }
  }

  /**
   * Parse filter object
   */
  private parseFilterObject(filterObj: unknown): QueryFilter[] {
    if (!filterObj || typeof filterObj !== 'object') {
      return [];
    }

    const filters: QueryFilter[] = [];
    const obj = filterObj as Record<string, unknown>;

    for (const [field, conditions] of Object.entries(obj)) {
      if (typeof conditions === 'object' && conditions !== null) {
        const condObj = conditions as Record<string, unknown>;
        for (const [operator, value] of Object.entries(condObj)) {
          filters.push({
            field,
            operator: operator as any,
            value,
          });
        }
      } else {
        filters.push({
          field,
          operator: 'eq',
          value: conditions,
        });
      }
    }

    return filters;
  }

  /**
   * Parse sort object
   */
  private parseSortObject(sortObj: unknown): QuerySort[] {
    if (!sortObj) return [];

    if (typeof sortObj === 'object' && !Array.isArray(sortObj)) {
      const obj = sortObj as Record<string, string>;
      return Object.entries(obj).map(([field, order]) => ({
        field,
        order: order.toUpperCase() as 'ASC' | 'DESC',
      }));
    }

    if (Array.isArray(sortObj)) {
      return sortObj.map(item => {
        if (typeof item === 'string') {
          return { field: item, order: 'ASC' as const };
        }
        if (typeof item === 'object' && item !== null) {
          const obj = item as Record<string, string>;
          const [field, order] = Object.entries(obj)[0];
          return { field, order: order.toUpperCase() as 'ASC' | 'DESC' };
        }
        throw new Error('Invalid sort item');
      });
    }

    return [];
  }

  /**
   * Apply filters to memories
   */
  private applyFilters(memories: Memory[], filters: QueryFilter[]): Memory[] {
    return memories.filter(memory => {
      return filters.every(filter => {
        const value = this.getFieldValue(memory, filter.field);
        const operator = this.operators.get(filter.operator);

        if (!operator) {
          throw new Error(`Unknown operator: ${filter.operator}`);
        }

        return operator(value, filter.value);
      });
    });
  }

  /**
   * Apply sorting to memories
   */
  private applySorting(memories: Memory[], sorts: QuerySort[]): Memory[] {
    return memories.sort((a, b) => {
      for (const sort of sorts) {
        const aVal = this.getFieldValue(a, sort.field);
        const bVal = this.getFieldValue(b, sort.field);

        let comparison = 0;
        if (aVal < bVal) comparison = -1;
        else if (aVal > bVal) comparison = 1;

        if (comparison !== 0) {
          return sort.order === 'DESC' ? -comparison : comparison;
        }
      }
      return 0;
    });
  }

  /**
   * Apply pagination to memories
   */
  private applyPagination(
    memories: Memory[],
    pagination: QueryPagination
  ): Memory[] {
    let start = pagination.offset || 0;

    if (pagination.cursor) {
      // Find position based on cursor
      const cursorIndex = memories.findIndex(
        m => this.generateCursor(m) === pagination.cursor
      );
      if (cursorIndex >= 0) {
        start = cursorIndex + 1;
      }
    }

    const end = pagination.limit ? start + pagination.limit : undefined;
    return memories.slice(start, end);
  }

  /**
   * Select specific fields from memories
   */
  private selectFields(memories: Memory[], fields: string[]): Memory[] {
    return memories.map(memory => {
      const selected: Partial<Memory> = {};
      for (const field of fields) {
        if (field in memory) {
          (selected as any)[field] = (memory as any)[field];
        }
      }
      return selected as Memory;
    });
  }

  /**
   * Get field value from memory object
   */
  private getFieldValue(memory: Memory, field: string): unknown {
    const parts = field.split('.');
    let value: unknown = memory;

    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = (value as any)[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Generate cursor for pagination
   */
  private generateCursor(memory: Memory): string {
    return Buffer.from(`${memory.id}_${memory.timestamp}`).toString('base64');
  }

  /**
   * Parse duration string (e.g., "1h", "30m", "7d")
   */
  private parseDuration(duration: string): number {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error(`Invalid duration format: ${duration}`);
    }

    const amount = parseInt(match[1], 10);
    const unit = match[2];

    const multipliers = {
      s: 1000,
      m: 1000 * 60,
      h: 1000 * 60 * 60,
      d: 1000 * 60 * 60 * 24,
    };

    return amount * multipliers[unit as keyof typeof multipliers];
  }
}

export default GraphQLQuery;
