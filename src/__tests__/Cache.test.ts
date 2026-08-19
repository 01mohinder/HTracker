/**
 * Cache.test.ts
 * Vitest Unit Test Suite for LRU Cache strategy
 */

import { describe, it, expect } from 'vitest';
import { LRUCache } from '../utils/cache';

describe('LRUCache Unit Tests', () => {
  it('should store and retrieve values', () => {
    const cache = new LRUCache<string, number>(3);
    cache.set('a', 10);
    cache.set('b', 20);

    expect(cache.get('a')).toBe(10);
    expect(cache.get('b')).toBe(20);
  });

  it('should evict least recently used item when capacity exceeded', () => {
    const cache = new LRUCache<string, number>(2);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.get('a'); // 'a' is accessed, so 'b' becomes LRU
    cache.set('c', 3); // 'b' should be evicted

    expect(cache.get('a')).toBe(1);
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('c')).toBe(3);
  });
});
