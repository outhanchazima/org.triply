import { Injectable, Logger } from '@nestjs/common';
import { QueryPerformance } from '../interfaces/database.interface';
import { PERFORMANCE_THRESHOLDS } from '../database.constants';

export interface QueryStatistics {
  totalQueries: number;
  averageExecutionTime: number;
  slowQueries: number;
  verySlowQueries: number;
  cachedQueries: number;
  failedQueries: number;
  queryPatterns: Map<string, QueryPatternStats>;
}

interface QueryPatternStats {
  pattern: string;
  count: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  lastExecuted: Date;
}

interface OptimizationSuggestion {
  query: string;
  issue: string;
  suggestion: string;
  impact: 'low' | 'medium' | 'high';
}

@Injectable()
export class QueryOptimizationService {
  private readonly logger = new Logger(QueryOptimizationService.name);
  private readonly queryHistory: QueryPerformance[] = [];
  private readonly statistics: Map<string, QueryStatistics> = new Map();
  private readonly optimizationSuggestions: Map<
    string,
    OptimizationSuggestion[]
  > = new Map();
  private monitoringEnabled = false;
  private readonly maxHistorySize = 10000;

  /**
   * Enable performance monitoring
   */
  enableMonitoring(): void {
    this.monitoringEnabled = true;
    this.logger.log('Query performance monitoring enabled');

    // Start periodic analysis
    setInterval(() => {
      this.analyzePerformance();
    }, 60000); // Analyze every minute
  }

  /**
   * Disable performance monitoring
   */
  disableMonitoring(): void {
    this.monitoringEnabled = false;
    this.logger.log('Query performance monitoring disabled');
  }

  /**
   * Record a query execution
   */
  recordQuery(performance: QueryPerformance): void {
    if (!this.monitoringEnabled) {
      return;
    }

    // Add to history
    this.queryHistory.push(performance);

    // Maintain history size
    if (this.queryHistory.length > this.maxHistorySize) {
      this.queryHistory.shift();
    }

    // Update statistics
    this.updateStatistics(performance);

    // Check for slow queries
    if (performance.slow) {
      this.handleSlowQuery(performance);
    }

    // Analyze query pattern
    this.analyzeQueryPattern(performance);
  }

  /**
   * Update statistics for a connection
   */
  private updateStatistics(performance: QueryPerformance): void {
    const stats =
      this.statistics.get(performance.connection) ||
      this.createEmptyStatistics();

    stats.totalQueries++;

    if (performance.cached) {
      stats.cachedQueries++;
    }

    if (performance.executionTime > PERFORMANCE_THRESHOLDS.SLOW_QUERY_MS) {
      stats.slowQueries++;
    }

    if (performance.executionTime > PERFORMANCE_THRESHOLDS.VERY_SLOW_QUERY_MS) {
      stats.verySlowQueries++;
    }

    // Update average execution time
    stats.averageExecutionTime =
      (stats.averageExecutionTime * (stats.totalQueries - 1) +
        performance.executionTime) /
      stats.totalQueries;

    this.statistics.set(performance.connection, stats);
  }

  /**
   * Create empty statistics object
   */
  private createEmptyStatistics(): QueryStatistics {
    return {
      totalQueries: 0,
      averageExecutionTime: 0,
      slowQueries: 0,
      verySlowQueries: 0,
      cachedQueries: 0,
      failedQueries: 0,
      queryPatterns: new Map(),
    };
  }

  /**
   * Handle slow query
   */
  private handleSlowQuery(performance: QueryPerformance): void {
    this.logger.warn(
      `Slow query detected on ${performance.connection}: ${performance.executionTime}ms`,
      {
        query: performance.query.substring(0, 200),
        executionTime: performance.executionTime,
        rowsAffected: performance.rowsAffected,
      }
    );

    // Generate optimization suggestions
    const suggestions = this.generateOptimizationSuggestions(performance);

    if (suggestions.length > 0) {
      const existing =
        this.optimizationSuggestions.get(performance.connection) || [];
      this.optimizationSuggestions.set(
        performance.connection,
        [...existing, ...suggestions].slice(-100) // Keep last 100 suggestions
      );
    }
  }

  /**
   * Analyze query pattern
   */
  private analyzeQueryPattern(
    performance: QueryPerformance
  ): Record<string, unknown> {
    const stats = this.statistics.get(performance.connection);
    if (!stats) {
      return {};
    }

    // Extract query pattern (simplified)
    const pattern = this.extractQueryPattern(performance.query);

    const patternStats = stats.queryPatterns.get(pattern) || {
      pattern,
      count: 0,
      averageTime: 0,
      minTime: Infinity,
      maxTime: 0,
      lastExecuted: new Date(),
    };

    patternStats.count++;
    patternStats.averageTime =
      (patternStats.averageTime * (patternStats.count - 1) +
        performance.executionTime) /
      patternStats.count;
    patternStats.minTime = Math.min(
      patternStats.minTime,
      performance.executionTime
    );
    patternStats.maxTime = Math.max(
      patternStats.maxTime,
      performance.executionTime
    );
    patternStats.lastExecuted = performance.timestamp;

    stats.queryPatterns.set(pattern, patternStats);

    return {};
  }

  /**
   * Extract query pattern from query
   */
  private extractQueryPattern(query: string): string {
    // Remove specific values to get the pattern
    let pattern = query;

    // For SQL queries
    if (
      query.includes('SELECT') ||
      query.includes('INSERT') ||
      query.includes('UPDATE') ||
      query.includes('DELETE')
    ) {
      // Remove string literals
      pattern = pattern.replace(/'[^']*'/g, '?');
      // Remove numeric literals
      pattern = pattern.replace(/\b\d+\b/g, '?');
      // Remove parameter placeholders
      pattern = pattern.replace(/\$\d+/g, '?');
      pattern = pattern.replace(/:\w+/g, '?');
    }
    // For MongoDB queries (JSON)
    else if (query.startsWith('{') || query.startsWith('[')) {
      try {
        const parsed = JSON.parse(query);
        pattern = this.extractMongoPattern(parsed);
      } catch {
        pattern = query.substring(0, 100);
      }
    }

    // Normalize whitespace
    pattern = pattern.replace(/\s+/g, ' ').trim();

    // Limit length
    return pattern.substring(0, 200);
  }

  /**
   * Extract MongoDB query pattern
   */
  private extractMongoPattern(obj: unknown): string {
    if (typeof obj !== 'object' || obj === null) {
      return typeof obj;
    }

    if (Array.isArray(obj)) {
      return '[array]';
    }

    const analysis: Record<string, unknown> = {};
    const objRecord = obj as Record<string, unknown>;
    for (const key in objRecord) {
      if (typeof objRecord[key] === 'object' && objRecord[key] !== null) {
        analysis[key] = this.extractMongoPattern(objRecord[key]);
      } else {
        analysis[key] = typeof objRecord[key];
      }
    }

    return JSON.stringify(analysis);
  }

  /**
   * Generate optimization suggestions
   */
  private generateOptimizationSuggestions(
    performance: QueryPerformance
  ): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    const query = performance.query;

    // SQL-specific suggestions
    if (
      query.includes('SELECT') ||
      query.includes('UPDATE') ||
      query.includes('DELETE')
    ) {
      // Check for missing WHERE clause
      if (
        query.includes('SELECT') &&
        !query.includes('WHERE') &&
        !query.includes('LIMIT')
      ) {
        suggestions.push({
          query: query.substring(0, 100),
          issue: 'Query without WHERE or LIMIT clause',
          suggestion: 'Add WHERE clause or LIMIT to reduce result set',
          impact: 'high',
        });
      }

      // Check for SELECT *
      if (query.includes('SELECT *')) {
        suggestions.push({
          query: query.substring(0, 100),
          issue: 'Using SELECT * in query',
          suggestion: 'Specify only required columns to reduce data transfer',
          impact: 'medium',
        });
      }

      // Check for missing indexes (simplified check)
      if (query.includes('WHERE') && performance.executionTime > 1000) {
        suggestions.push({
          query: query.substring(0, 100),
          issue: 'Slow query with WHERE clause',
          suggestion: 'Consider adding indexes on columns used in WHERE clause',
          impact: 'high',
        });
      }

      // Check for JOIN performance
      if (query.includes('JOIN') && performance.executionTime > 2000) {
        suggestions.push({
          query: query.substring(0, 100),
          issue: 'Slow JOIN operation',
          suggestion: 'Review JOIN conditions and ensure proper indexes exist',
          impact: 'high',
        });
      }

      // Check for subqueries
      if (query.includes('SELECT') && query.includes('(SELECT')) {
        suggestions.push({
          query: query.substring(0, 100),
          issue: 'Query contains subqueries',
          suggestion:
            'Consider using JOINs instead of subqueries for better performance',
          impact: 'medium',
        });
      }

      // Check for LIKE with leading wildcard
      if (query.match(/LIKE\s+['"]%/)) {
        suggestions.push({
          query: query.substring(0, 100),
          issue: 'LIKE query with leading wildcard',
          suggestion:
            'Leading wildcards prevent index usage. Consider full-text search',
          impact: 'high',
        });
      }
    }

    // MongoDB-specific suggestions
    if (query.startsWith('{') || query.startsWith('[')) {
      try {
        const parsed = JSON.parse(query);

        // Check for missing indexes
        if (performance.executionTime > 1000) {
          suggestions.push({
            query: query.substring(0, 100),
            issue: 'Slow MongoDB query',
            suggestion: 'Consider adding indexes on frequently queried fields',
            impact: 'high',
          });
        }

        // Check for $regex usage
        if (JSON.stringify(parsed).includes('$regex')) {
          suggestions.push({
            query: query.substring(0, 100),
            issue: 'Using $regex in query',
            suggestion:
              'Consider using text indexes for better text search performance',
            impact: 'medium',
          });
        }

        // Check for large $in arrays
        if (
          JSON.stringify(parsed).includes('$in') &&
          performance.executionTime > 500
        ) {
          suggestions.push({
            query: query.substring(0, 100),
            issue: 'Large $in array in query',
            suggestion:
              'Consider breaking large $in queries into smaller batches',
            impact: 'medium',
          });
        }
      } catch {
        // Not a valid JSON query
      }
    }

    // General suggestions
    if (performance.executionTime > PERFORMANCE_THRESHOLDS.VERY_SLOW_QUERY_MS) {
      suggestions.push({
        query: query.substring(0, 100),
        issue: 'Very slow query execution',
        suggestion: 'Consider query optimization, caching, or database scaling',
        impact: 'high',
      });
    }

    if (!performance.cached && performance.executionTime > 500) {
      suggestions.push({
        query: query.substring(0, 100),
        issue: 'Frequently executed slow query',
        suggestion: 'Consider implementing query result caching',
        impact: 'medium',
      });
    }

    return suggestions;
  }

  /**
   * Analyze overall performance
   */
  private analyzePerformance(): void {
    for (const [connection, stats] of this.statistics) {
      if (stats.totalQueries === 0) {
        continue;
      }

      const slowQueryRatio = stats.slowQueries / stats.totalQueries;
      const cacheHitRatio = stats.cachedQueries / stats.totalQueries;

      // Log performance summary
      this.logger.log(`Performance summary for ${connection}:`, {
        totalQueries: stats.totalQueries,
        averageExecutionTime: Math.round(stats.averageExecutionTime),
        slowQueries: stats.slowQueries,
        slowQueryRatio: (slowQueryRatio * 100).toFixed(2) + '%',
        cacheHitRatio: (cacheHitRatio * 100).toFixed(2) + '%',
      });

      // Alert on high slow query ratio
      if (slowQueryRatio > 0.1) {
        this.logger.warn(
          `High slow query ratio detected for ${connection}: ${(
            slowQueryRatio * 100
          ).toFixed(2)}%`
        );
      }

      // Identify problematic query patterns
      const problematicPatterns = Array.from(stats.queryPatterns.values())
        .filter((p) => p.averageTime > PERFORMANCE_THRESHOLDS.SLOW_QUERY_MS)
        .sort((a, b) => b.averageTime - a.averageTime)
        .slice(0, 5);

      if (problematicPatterns.length > 0) {
        this.logger.warn(
          `Top slow query patterns for ${connection}:`,
          problematicPatterns.map((p) => ({
            pattern: p.pattern.substring(0, 100),
            count: p.count,
            averageTime: Math.round(p.averageTime),
          }))
        );
      }
    }
  }

  /**
   * Get statistics for a connection
   */
  getStatistics(
    connectionName?: string
  ): QueryStatistics | Map<string, QueryStatistics> {
    if (connectionName) {
      return (
        this.statistics.get(connectionName) || this.createEmptyStatistics()
      );
    }
    return new Map(this.statistics);
  }

  /**
   * Get optimization suggestions
   */
  getOptimizationSuggestions(
    connectionName?: string
  ): OptimizationSuggestion[] {
    if (connectionName) {
      return this.optimizationSuggestions.get(connectionName) || [];
    }

    const allSuggestions: OptimizationSuggestion[] = [];
    for (const suggestions of this.optimizationSuggestions.values()) {
      allSuggestions.push(...suggestions);
    }
    return allSuggestions;
  }

  /**
   * Get query history
   */
  getQueryHistory(limit = 100, connectionName?: string): QueryPerformance[] {
    let history = this.queryHistory;

    if (connectionName) {
      history = history.filter((q) => q.connection === connectionName);
    }

    return history.slice(-limit);
  }

  /**
   * Clear statistics and history
   */
  clearStatistics(): void {
    this.statistics.clear();
    this.queryHistory.length = 0;
    this.optimizationSuggestions.clear();
    this.logger.log('Query statistics cleared');
  }

  /**
   * Export performance report
   */
  exportPerformanceReport(): {
    timestamp: Date;
    connections: Array<{
      name: string;
      statistics: QueryStatistics;
      suggestions: OptimizationSuggestion[];
      topSlowQueries: QueryPerformance[];
    }>;
  } {
    const report = {
      timestamp: new Date(),
      connections: [] as any[],
    };

    for (const [connection, stats] of this.statistics) {
      const suggestions = this.optimizationSuggestions.get(connection) || [];
      const slowQueries = this.queryHistory
        .filter((q) => q.connection === connection && q.slow)
        .sort((a, b) => b.executionTime - a.executionTime)
        .slice(0, 10);

      report.connections.push({
        name: connection,
        statistics: {
          ...stats,
          queryPatterns: Array.from(stats.queryPatterns.values()),
        } as any,
        suggestions,
        topSlowQueries: slowQueries,
      });
    }

    return report;
  }
}
