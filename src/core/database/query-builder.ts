/**
 * Query builder utilities for D1 database operations
 */

export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
  where?: Record<string, unknown>;
}

export class QueryBuilder {
  private table: string;
  private selectFields: string[] = ['*'];
  private whereConditions: string[] = [];
  private whereValues: unknown[] = [];
  private orderByField?: string;
  private orderDirection: 'ASC' | 'DESC' = 'ASC';
  private limitValue?: number;
  private offsetValue?: number;

  constructor(table: string) {
    this.table = table;
  }

  select(fields: string[]): this {
    this.selectFields = fields;
    return this;
  }

  where(field: string, value: unknown): this {
    this.whereConditions.push(`${field} = ?`);
    this.whereValues.push(value);
    return this;
  }

  whereIn(field: string, values: unknown[]): this {
    if (values.length === 0) {
      this.whereConditions.push('1 = 0'); // Always false
      return this;
    }
    const placeholders = values.map(() => '?').join(', ');
    this.whereConditions.push(`${field} IN (${placeholders})`);
    this.whereValues.push(...values);
    return this;
  }

  whereLike(field: string, pattern: string): this {
    this.whereConditions.push(`${field} LIKE ?`);
    this.whereValues.push(pattern);
    return this;
  }

  whereBetween(field: string, min: unknown, max: unknown): this {
    this.whereConditions.push(`${field} BETWEEN ? AND ?`);
    this.whereValues.push(min, max);
    return this;
  }

  whereNull(field: string): this {
    this.whereConditions.push(`${field} IS NULL`);
    return this;
  }

  whereNotNull(field: string): this {
    this.whereConditions.push(`${field} IS NOT NULL`);
    return this;
  }

  orderBy(field: string, direction: 'ASC' | 'DESC' = 'ASC'): this {
    this.orderByField = field;
    this.orderDirection = direction;
    return this;
  }

  limit(count: number): this {
    this.limitValue = count;
    return this;
  }

  offset(count: number): this {
    this.offsetValue = count;
    return this;
  }

  build(): { sql: string; values: unknown[] } {
    let sql = `SELECT ${this.selectFields.join(', ')} FROM ${this.table}`;

    if (this.whereConditions.length > 0) {
      sql += ` WHERE ${this.whereConditions.join(' AND ')}`;
    }

    if (this.orderByField) {
      sql += ` ORDER BY ${this.orderByField} ${this.orderDirection}`;
    }

    if (this.limitValue !== undefined) {
      sql += ` LIMIT ${this.limitValue}`;
    }

    if (this.offsetValue !== undefined) {
      sql += ` OFFSET ${this.offsetValue}`;
    }

    return {
      sql,
      values: this.whereValues,
    };
  }
}

export function createQueryBuilder(table: string): QueryBuilder {
  return new QueryBuilder(table);
}

/**
 * Build a paginated query
 */
export function buildPaginatedQuery(
  table: string,
  options: QueryOptions = {}
): { sql: string; countSql: string; values: unknown[] } {
  const builder = createQueryBuilder(table);

  // Apply where conditions
  if (options.where) {
    Object.entries(options.where).forEach(([field, value]) => {
      if (value !== undefined && value !== null) {
        builder.where(field, value);
      }
    });
  }

  // Apply ordering
  if (options.orderBy) {
    builder.orderBy(options.orderBy, options.orderDirection);
  }

  // Build main query
  if (options.limit) {
    builder.limit(options.limit);
  }
  if (options.offset) {
    builder.offset(options.offset);
  }

  const { sql, values } = builder.build();

  // Build count query
  const countBuilder = createQueryBuilder(table).select(['COUNT(*) as total']);
  if (options.where) {
    Object.entries(options.where).forEach(([field, value]) => {
      if (value !== undefined && value !== null) {
        countBuilder.where(field, value);
      }
    });
  }
  const { sql: countSql } = countBuilder.build();

  return {
    sql,
    countSql,
    values,
  };
}
